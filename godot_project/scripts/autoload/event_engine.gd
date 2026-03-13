## event_engine.gd — 이벤트 엔진 싱글톤
## YAML→JSON 이벤트의 25+ 액션 타입을 실행
## JS의 Promise/await → GDScript signal/await 패턴
extends Node

# ── UI 연결 시그널 ──
signal dialog_text(text: String)                     # 텍스트 표시 요청
signal dialog_divider(title: String)                 # 구분선 표시 요청
signal dialog_menu(options: Array)                   # 선택지 표시 요청
signal menu_selected(index: int)                     # 선택지 결과
signal dialog_closed()                               # 탭 대기 완료
signal dialog_show()                                 # 대화 상자 열기
signal dialog_hide()                                 # 대화 상자 닫기
signal event_finished()                              # 이벤트 종료
signal shop_requested(player: PlayerData, shop_type: String)  # 상점 열기
signal shop_closed_signal()                          # 상점 닫기 완료
signal save_requested()                              # 저장 요청
signal game_over_requested()                         # 게임오버
signal show_map_requested()                          # 월드맵 표시

var _menu_result: int = -1
var _waiting_for_menu: bool = false
var _waiting_for_tap: bool = false
var _shop_done: bool = false

# 현재 이벤트의 scenes 딕셔너리 (goto scene: "xxx" 용)
var _current_scenes: Dictionary = {}

# ── 이벤트 실행 진입점 ──
func run_area_event(zone: String) -> Variant:
	var event_data: Variant = GameData.get_area_event(zone)
	if event_data == null:
		return null

	# event_data 구조: {"actions": [...], "scenes": {...}}
	if event_data is Dictionary:
		_current_scenes = event_data.get("scenes", {})
		if event_data.has("actions"):
			var result: Variant = await run_actions(event_data["actions"], GameState.player, {})
			_current_scenes = {}
			return result
	elif event_data is Array:
		_current_scenes = {}
		return await run_actions(event_data, GameState.player, {})

	_current_scenes = {}
	return null

func run_actions(actions: Array, player: PlayerData, context: Dictionary) -> Variant:
	var result: Variant = null
	for action_data in actions:
		if action_data is not Dictionary:
			continue
		result = await _execute_action(action_data, player, context)
		if result == "break" or result == "return":
			break
	return result

# ── 액션 디스패처 ──
func _execute_action(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var action_type: String = act.get("action", "")

	match action_type:
		"print":
			return await _action_print(act, player)
		"menu":
			return await _action_menu(act, player, ctx)
		"if":
			return await _action_if(act, player, ctx)
		"goto":
			return await _action_goto(act, player, ctx)
		"set_flag":
			player.story_flags[act.get("key", "")] = act.get("value", true)
		"add_gold":
			var amount: int = act.get("amount", 0)
			player.gold += amount
			player.stats["totalGoldEarned"] = player.stats.get("totalGoldEarned", 0) + amount
			if act.get("message", true):
				dialog_text.emit("  ▶ %dG 획득!" % amount)
				await _wait_for_tap()
		"sub_gold":
			player.gold = max(0, player.gold - act.get("amount", 0))
		"add_item":
			var item_name: String = act.get("item", "")
			if item_name != "":
				player.inventory.append(item_name)
				player.stats["itemsCollected"] = player.stats.get("itemsCollected", 0) + 1
				if act.get("message", true):
					dialog_text.emit("  ▶ %s 획득!" % item_name)
					await _wait_for_tap()
		"remove_item":
			var item_name: String = act.get("item", "")
			var idx := player.inventory.find(item_name)
			if idx >= 0:
				player.inventory.remove_at(idx)
		"add_stat":
			_action_add_stat(act, player)
		"add_dark":
			player.dark_points += act.get("amount", 0)
		"sub_dark":
			player.dark_points = max(0, player.dark_points - act.get("amount", 0))
		"set_dark":
			player.dark_points = act.get("amount", 0)
		"heal":
			_action_heal(act, player)
		"damage":
			var dmg: int = act.get("amount", 0)
			player.take_damage(dmg)
		"battle":
			return await _action_battle(act, player, ctx)
		"boss_battle":
			return await _action_boss_battle(act, player, ctx)
		"shop", "open_shop", "open_uw_shop", "open_merc_shop", "open_cel_shop":
			return await _action_shop(act, player)
		"random":
			return await _action_random(act, player, ctx)
		"loop":
			return await _action_loop(act, player, ctx)
		"equip", "equip_item":
			_action_equip(act, player)
		"teleport":
			_action_teleport(act, player)
		"warp_map":
			_action_warp_map(act, player)
		"set_location":
			player.current_location = act.get("zone", act.get("location", player.current_location))
		"unlock_area":
			_action_unlock_area(act, player)
		"divider":
			_action_divider(act)
		"pause":
			await _action_pause(act)
		"break":
			return "break"
		"return":
			return "return"
		"save":
			save_requested.emit()
		"game_over":
			game_over_requested.emit()
			return "return"
		"show_map":
			show_map_requested.emit()
		"show_status":
			pass  # main.gd에서 직접 처리
		"show_inventory":
			pass  # main.gd에서 직접 처리
		_:
			push_warning("알 수 없는 액션: %s" % action_type)

	return null

# ── 개별 액션 구현 ──

func _action_print(act: Dictionary, player: PlayerData) -> Variant:
	var text: String = act.get("text", "")
	# 플레이어 변수 치환
	text = _substitute_variables(text, player)
	dialog_text.emit(text)
	await _wait_for_tap()
	return null

func _action_divider(act: Dictionary) -> void:
	var title: String = act.get("title", "")
	dialog_divider.emit(title)

func _action_menu(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var options: Array = act.get("options", [])
	if options.is_empty():
		return null

	# 조건 필터링: 각 옵션에 cond 또는 when이 있으면 체크
	var filtered_options: Array = []
	for opt in options:
		if opt.has("cond"):
			if not check_condition(opt["cond"], player):
				continue
		if opt.has("when"):
			if not check_condition(opt["when"], player):
				continue
		filtered_options.append(opt)

	if filtered_options.is_empty():
		return null

	var labels: Array[String] = []
	for opt in filtered_options:
		labels.append(opt.get("label", "???"))

	dialog_menu.emit(labels)
	var selected: int = await _wait_for_menu_selection()

	if selected >= 0 and selected < filtered_options.size():
		var chosen: Dictionary = filtered_options[selected]
		var sub_actions: Array = chosen.get("actions", [])
		return await run_actions(sub_actions, player, ctx)

	return null

func _action_if(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var cond: Variant = act.get("cond", {})
	var pass_check := check_condition(cond, player)

	if pass_check:
		var then_actions: Array = act.get("then", [])
		return await run_actions(then_actions, player, ctx)
	else:
		var else_actions: Array = act.get("else", [])
		if not else_actions.is_empty():
			return await run_actions(else_actions, player, ctx)

	return null

func _action_goto(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var scene_name: String = act.get("scene", "")
	if scene_name == "":
		return null

	# _current_scenes에서 씬 찾기
	if _current_scenes.has(scene_name):
		var scene_data: Dictionary = _current_scenes[scene_name]
		var scene_actions: Array = scene_data.get("actions", [])
		return await run_actions(scene_actions, player, ctx)
	else:
		push_warning("씬을 찾을 수 없음: %s" % scene_name)

	return null

func _action_add_stat(act: Dictionary, player: PlayerData) -> void:
	if act.has("attack"):
		player.attack += act["attack"]
	if act.has("defense"):
		player.defense += act["defense"]
	if act.has("max_hp"):
		player.max_hp += act["max_hp"]
		player.hp = min(player.hp + act["max_hp"], player.max_hp)

func _action_heal(act: Dictionary, player: PlayerData) -> void:
	var amount: Variant = act.get("amount", 0)
	if amount is String and amount == "full":
		player.hp = player.max_hp
	elif amount is int or amount is float:
		player.heal(int(amount))

func _action_battle(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var enemy_key: Variant = act.get("enemy", "")
	var enemies: Array = []
	if enemy_key is String:
		enemies = [enemy_key]
	elif enemy_key is Array:
		enemies = enemy_key

	# 전투 전 대화 닫기
	dialog_hide.emit()

	var result: String = await CombatSystem.start_battle(player, enemies)

	# 전투 후 대화 다시 열기
	dialog_show.emit()

	if result == "win":
		var on_win: Array = act.get("on_win", [])
		if not on_win.is_empty():
			return await run_actions(on_win, player, ctx)
	elif result == "lose":
		var on_lose: Array = act.get("on_lose", [])
		if not on_lose.is_empty():
			return await run_actions(on_lose, player, ctx)

	return result

func _action_boss_battle(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var enemy_key: String = act.get("enemy", "")
	var options: Dictionary = {}
	if act.has("name"):
		options["name"] = act["name"]
	if act.has("hp_multiply"):
		options["hp_multiply"] = act["hp_multiply"]
	if act.has("hp_add"):
		options["hp_add"] = act["hp_add"]

	dialog_hide.emit()
	var result: String = await CombatSystem.start_battle(player, [enemy_key], options)
	dialog_show.emit()

	if result == "win":
		var on_win: Array = act.get("on_win", [])
		if not on_win.is_empty():
			return await run_actions(on_win, player, ctx)
	elif result == "lose":
		var on_lose: Array = act.get("on_lose", [])
		if not on_lose.is_empty():
			return await run_actions(on_lose, player, ctx)

	return result

func _action_shop(_act: Dictionary, player: PlayerData) -> Variant:
	var shop_type: String = _act.get("shop_type", "default")
	dialog_hide.emit()
	shop_requested.emit(player, shop_type)
	# 상점이 닫힐 때까지 대기
	_shop_done = false
	await shop_closed_signal
	dialog_show.emit()
	return null

func _action_random(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var branches: Array = act.get("branches", [])
	if branches.is_empty():
		return null

	var total_weight: float = 0
	for b in branches:
		total_weight += b.get("weight", 1.0)

	var roll: float = randf() * total_weight
	var cumulative: float = 0
	for b in branches:
		cumulative += b.get("weight", 1.0)
		if roll <= cumulative:
			return await run_actions(b.get("actions", []), player, ctx)

	return null

func _action_loop(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var max_loops: int = act.get("max", 100)
	var loop_actions: Array = act.get("body", act.get("actions", []))

	for i in range(max_loops):
		var res: Variant = await run_actions(loop_actions, player, ctx)
		if res == "break":
			break
		if res == "return":
			return "return"
	return null

func _action_equip(act: Dictionary, player: PlayerData) -> void:
	var item_name: String = act.get("item", "")
	var item_data: Dictionary = GameData.get_item(item_name)
	if item_data.get("type", "") == "weapon":
		if player.equipped_weapon != "":
			player.inventory.append(player.equipped_weapon)
		player.equipped_weapon = item_name
		var idx := player.inventory.find(item_name)
		if idx >= 0:
			player.inventory.remove_at(idx)
	elif item_data.get("type", "") == "armor":
		if player.equipped_armor != "":
			player.inventory.append(player.equipped_armor)
		player.equipped_armor = item_name
		var idx := player.inventory.find(item_name)
		if idx >= 0:
			player.inventory.remove_at(idx)

func _action_teleport(act: Dictionary, player: PlayerData) -> void:
	var map_id: String = act.get("map", player.current_map)
	var pos_data: Variant = act.get("position", null)
	player.current_map = map_id
	if pos_data is Dictionary and pos_data.has("x") and pos_data.has("y"):
		player.map_position = Vector2i(pos_data["x"], pos_data["y"])

func _action_warp_map(act: Dictionary, player: PlayerData) -> void:
	var map_id: String = act.get("map", "")
	if map_id == "":
		return
	player.current_map = map_id
	var pos_data: Variant = act.get("position", null)
	if pos_data is Dictionary and pos_data.has("x") and pos_data.has("y"):
		player.map_position = Vector2i(pos_data["x"], pos_data["y"])
	GameState.show_toast("🌀 %s(으)로 이동!" % map_id, "toast-warp")

func _action_unlock_area(act: Dictionary, player: PlayerData) -> void:
	var flag_key: String = act.get("flag", "")
	if flag_key != "":
		player.story_flags[flag_key] = true

func _action_pause(act: Dictionary) -> void:
	var duration: float = act.get("duration", 0.5)
	await get_tree().create_timer(duration).timeout

# ── 변수 치환 ──
func _substitute_variables(text: String, player: PlayerData) -> String:
	text = text.replace("{player.name}", player.player_name)
	text = text.replace("{player.hp}", str(player.hp))
	text = text.replace("{player.max_hp}", str(player.max_hp))
	text = text.replace("{player.gold}", str(player.gold))
	text = text.replace("{player.level}", str(player.level))
	text = text.replace("{player.job}", player.job)
	text = text.replace("{player.attack}", str(player.attack))
	text = text.replace("{player.defense}", str(player.defense))
	text = text.replace("{player.dark}", str(player.dark_points))
	return text

# ── 조건 체크 ──
func check_condition(cond: Variant, player: PlayerData) -> bool:
	if cond is Array:
		# 배열이면 모든 조건이 참이어야
		for c in cond:
			if not _check_single_condition(c, player):
				return false
		return true
	elif cond is Dictionary:
		return _check_single_condition(cond, player)
	return true

func _check_single_condition(cond: Dictionary, player: PlayerData) -> bool:
	if cond.has("flag"):
		return player.story_flags.get(cond["flag"], false) == true
	if cond.has("no_flag"):
		return not player.story_flags.get(cond["no_flag"], false)
	if cond.has("not_flag"):
		return not player.story_flags.get(cond["not_flag"], false)
	if cond.has("level_gte"):
		return player.level >= int(cond["level_gte"])
	if cond.has("gold_gte"):
		return player.gold >= int(cond["gold_gte"])
	if cond.has("dark_gte"):
		return player.dark_points >= int(cond["dark_gte"])
	if cond.has("dark_lte"):
		return player.dark_points <= int(cond["dark_lte"])
	if cond.has("has_item"):
		return cond["has_item"] in player.inventory
	if cond.has("no_item"):
		return cond["no_item"] not in player.inventory
	if cond.has("any_flag"):
		for f in cond["any_flag"]:
			if player.story_flags.get(f, false):
				return true
		return false
	if cond.has("random_lt"):
		return randf() < float(cond["random_lt"])
	if cond.has("job"):
		return player.job == cond["job"]
	if cond.has("hp_lte_percent"):
		return float(player.hp) / float(player.max_hp) <= float(cond["hp_lte_percent"])
	if cond.has("equipped_weapon"):
		return player.equipped_weapon == cond["equipped_weapon"]
	if cond.has("equipped_armor"):
		return player.equipped_armor == cond["equipped_armor"]
	if cond.has("count"):
		# 아이템 개수 체크: {"count": {"item": "xxx", "gte": N}}
		var count_cond: Dictionary = cond["count"]
		var item_name: String = count_cond.get("item", "")
		var count := player.inventory.count(item_name)
		if count_cond.has("gte"):
			return count >= int(count_cond["gte"])
		if count_cond.has("lte"):
			return count <= int(count_cond["lte"])
		return count > 0
	if cond.has("when"):
		# "when" 은 조건부 메뉴 옵션 등에서 사용 (flag와 동일)
		return player.story_flags.get(cond["when"], false) == true
	if cond.has("visited"):
		return cond["visited"] in player.visited_locations
	if cond.has("stat_gte"):
		var stat_cond: Dictionary = cond["stat_gte"]
		for stat_key in stat_cond:
			if player.stats.get(stat_key, 0) < int(stat_cond[stat_key]):
				return false
		return true
	return true

# ── 대기 헬퍼 ──
func _wait_for_tap() -> void:
	_waiting_for_tap = true
	await dialog_closed
	_waiting_for_tap = false

func _wait_for_menu_selection() -> int:
	_waiting_for_menu = true
	_menu_result = -1
	await menu_selected
	_waiting_for_menu = false
	return _menu_result

# UI에서 호출하는 콜백
func on_menu_selected(index: int) -> void:
	_menu_result = index
	menu_selected.emit(index)

func on_dialog_tap() -> void:
	if _waiting_for_tap:
		dialog_closed.emit()

func on_shop_closed() -> void:
	_shop_done = true
	shop_closed_signal.emit()
