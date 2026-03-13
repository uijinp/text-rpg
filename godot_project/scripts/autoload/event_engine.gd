## event_engine.gd — 이벤트 엔진 싱글톤
## YAML→JSON 이벤트의 25+ 액션 타입을 실행
## JS의 Promise/await → GDScript signal/await 패턴
extends Node

signal dialog_text(text: String)
signal dialog_menu(options: Array)
signal menu_selected(index: int)
signal dialog_closed()
signal event_finished()

var _menu_result: int = -1
var _waiting_for_menu: bool = false
var _waiting_for_tap: bool = false

# ── 이벤트 실행 진입점 ──
func run_area_event(zone: String) -> Variant:
	var event_data: Variant = GameData.get_area_event(zone)
	if event_data == null:
		return null
	if event_data is Dictionary and event_data.has("actions"):
		return await run_actions(event_data["actions"], GameState.player, {})
	elif event_data is Array:
		return await run_actions(event_data, GameState.player, {})
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
			return _action_goto(act, player, ctx)
		"set_flag":
			player.story_flags[act.get("key", "")] = act.get("value", true)
		"add_gold":
			var amount: int = act.get("amount", 0)
			player.gold += amount
			if player.stats.has("totalGoldEarned"):
				player.stats["totalGoldEarned"] += amount
		"sub_gold":
			player.gold = max(0, player.gold - act.get("amount", 0))
		"add_item":
			var item_name: String = act.get("item", "")
			if item_name != "":
				player.inventory.append(item_name)
				if player.stats.has("itemsCollected"):
					player.stats["itemsCollected"] += 1
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
		"heal":
			_action_heal(act, player)
		"damage":
			var dmg: int = act.get("amount", 0)
			player.take_damage(dmg)
		"battle":
			return await _action_battle(act, player, ctx)
		"shop":
			return await _action_shop(act, player)
		"random":
			return await _action_random(act, player, ctx)
		"loop":
			return await _action_loop(act, player, ctx)
		"equip":
			_action_equip(act, player)
		"teleport":
			_action_teleport(act, player)
		"unlock_area":
			_action_unlock_area(act, player)
		"boss_battle":
			return await _action_boss_battle(act, player, ctx)
		_:
			push_warning("알 수 없는 액션: %s" % action_type)

	return null

# ── 개별 액션 구현 ──
func _action_print(act: Dictionary, _player: PlayerData) -> Variant:
	var text: String = act.get("text", "")
	dialog_text.emit(text)
	# 타자기 효과 대기
	await _wait_for_tap()
	return null

func _action_menu(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var options: Array = act.get("options", [])
	if options.is_empty():
		return null

	var labels: Array[String] = []
	for opt in options:
		labels.append(opt.get("label", "???"))

	dialog_menu.emit(labels)
	var selected: int = await _wait_for_menu_selection()

	if selected >= 0 and selected < options.size():
		var chosen: Dictionary = options[selected]
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

func _action_goto(_act: Dictionary, _player: PlayerData, _ctx: Dictionary) -> Variant:
	# goto는 context 변경 등에 사용
	return null

func _action_add_stat(act: Dictionary, player: PlayerData) -> void:
	if act.has("attack"):
		player.attack += act["attack"]
	if act.has("defense"):
		player.defense += act["defense"]
	if act.has("max_hp"):
		player.max_hp += act["max_hp"]
		player.hp += act["max_hp"]

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

	var result: String = await CombatSystem.start_battle(player, enemies)

	if result == "win":
		var on_win: Array = act.get("on_win", [])
		if not on_win.is_empty():
			return await run_actions(on_win, player, ctx)
	elif result == "lose":
		var on_lose: Array = act.get("on_lose", [])
		if not on_lose.is_empty():
			return await run_actions(on_lose, player, ctx)

	return result

func _action_shop(act: Dictionary, player: PlayerData) -> Variant:
	var shop_type: String = act.get("shop_type", "default")
	# shop UI 시그널 발행 → 메인 씬에서 처리
	# TODO: Phase 4에서 구현
	return null

func _action_random(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var branches: Array = act.get("branches", [])
	if branches.is_empty():
		return null

	var total_weight: float = 0
	for b in branches:
		total_weight += b.get("weight", 1)

	var roll: float = randf() * total_weight
	var cumulative: float = 0
	for b in branches:
		cumulative += b.get("weight", 1)
		if roll <= cumulative:
			return await run_actions(b.get("actions", []), player, ctx)

	return null

func _action_loop(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var max_loops: int = act.get("max", 100)
	var loop_actions: Array = act.get("actions", [])

	for i in range(max_loops):
		var res := await run_actions(loop_actions, player, ctx)
		if res == "break":
			break
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
	var pos_data: Dictionary = act.get("position", {})
	player.current_map = map_id
	if pos_data.has("x") and pos_data.has("y"):
		player.map_position = Vector2i(pos_data["x"], pos_data["y"])

func _action_unlock_area(act: Dictionary, player: PlayerData) -> void:
	var flag_key: String = act.get("flag", "")
	if flag_key != "":
		player.story_flags[flag_key] = true

func _action_boss_battle(act: Dictionary, player: PlayerData, ctx: Dictionary) -> Variant:
	var enemy_key: String = act.get("enemy", "")
	var options: Dictionary = {}
	if act.has("name"):
		options["name"] = act["name"]
	if act.has("hp_multiply"):
		options["hp_multiply"] = act["hp_multiply"]
	if act.has("hp_add"):
		options["hp_add"] = act["hp_add"]

	var result: String = await CombatSystem.start_battle(player, [enemy_key], options)

	if result == "win":
		var on_win: Array = act.get("on_win", [])
		if not on_win.is_empty():
			return await run_actions(on_win, player, ctx)
	elif result == "lose":
		var on_lose: Array = act.get("on_lose", [])
		if not on_lose.is_empty():
			return await run_actions(on_lose, player, ctx)

	return result

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
	if cond.has("level_gte"):
		return player.level >= cond["level_gte"]
	if cond.has("gold_gte"):
		return player.gold >= cond["gold_gte"]
	if cond.has("dark_gte"):
		return player.dark_points >= cond["dark_gte"]
	if cond.has("has_item"):
		return cond["has_item"] in player.inventory
	if cond.has("any_flag"):
		for f in cond["any_flag"]:
			if player.story_flags.get(f, false):
				return true
		return false
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

func on_menu_selected(index: int) -> void:
	_menu_result = index
	menu_selected.emit(index)

func on_dialog_tap() -> void:
	if _waiting_for_tap:
		dialog_closed.emit()
