## combat_system.gd — 전투 시스템 (순수 로직)
## UI와 분리된 전투 로직. 시그널로 UI에 알림
extends Node

signal battle_started(player: PlayerData, enemies: Array)
signal battle_log(text: String, style: String)
signal battle_ui_update(player: PlayerData, enemies: Array, turn: int, target_idx: int)
signal battle_choices_requested(skills: Array)
signal battle_choice_made(choice_index: int)
signal target_select_requested(enemies: Array)
signal target_selected(index: int)
signal battle_item_menu_requested(player: PlayerData)
signal battle_item_selected(item_name: String)
signal battle_ended(result: String)
signal wait_for_tap_requested()
signal tap_received()
signal enemy_flash(index: int, flash_type: String)
signal player_hp_flash()
signal screen_shake()

var _choice_result: int = -1
var _target_result: int = -1
var _item_result: String = ""

func get_skills(player: PlayerData) -> Array:
	var base: Array = []
	match player.job:
		"전사":
			base = [
				{"name": "강타", "multiplier": 1.5, "desc": "강력한 일격 (1.5배 데미지)"},
				{"name": "방어", "multiplier": 0, "defensive": true, "desc": "이번 턴 받는 데미지 50% 감소"},
			]
		"마법사":
			base = [
				{"name": "파이어볼", "multiplier": 2.0, "desc": "화염 마법 (2배 데미지)"},
				{"name": "마력 방벽", "multiplier": 0, "defensive": true, "desc": "이번 턴 받는 데미지 70% 감소"},
			]
		"도적":
			base = [
				{"name": "독 바르기", "multiplier": 1.2, "poison": true, "desc": "독 공격 (1.2배 + 독 부여)"},
				{"name": "그림자 숨기", "multiplier": 0, "evasion": true, "desc": "이번 턴 회피 (데미지 무효)"},
			]

	# 스킬 트리 액티브 스킬 추가
	var tree_skills := SkillTreeMgr.get_active_skills(player)
	base.append_array(tree_skills)
	return base

func spawn_enemy(enemy_key: String) -> Dictionary:
	var template: Dictionary = GameData.get_enemy(enemy_key)
	if template.is_empty():
		return {}
	return {
		"key": enemy_key,
		"name": template.get("name", enemy_key),
		"label": template.get("name", enemy_key),
		"hp": template.get("hp", 50),
		"max_hp": template.get("hp", 50),
		"atk": template.get("atk", 10),
		"def": template.get("def", 0),
		"exp": template.get("exp", 10),
		"gold": template.get("gold", 5),
		"poisoned": false,
		"poison_turns": 0,
		"burn_turns": 0,
		"guard_turns": 0,
		"stunned": false,
	}

func _assign_labels(enemies: Array) -> void:
	if enemies.size() <= 1:
		return
	var count: Dictionary = {}
	for e in enemies:
		var n: String = e["name"]
		count[n] = count.get(n, 0) + 1
	var idx: Dictionary = {}
	for e in enemies:
		var n: String = e["name"]
		if count[n] > 1:
			idx[n] = idx.get(n, 0) + 1
			e["label"] = "%s %s" % [n, char(64 + idx[n])]

func _calc_player_damage(enemy: Dictionary, base_damage: int) -> int:
	var raw := max(0, base_damage - enemy.get("def", 0))
	# 적 방어 태세
	if enemy.get("guard_turns", 0) > 0:
		raw = max(0, int(raw * 0.6))
	return raw

func _calc_enemy_damage(player: PlayerData, atk: int, pierce: bool = false) -> int:
	if pierce:
		return max(0, int(atk - player.get_defense() * 0.5))
	return max(0, atk - player.get_defense())

func _enemy_evaded(enemy: Dictionary) -> bool:
	var beh: Dictionary = GameData.get_behavior(enemy.get("key", ""))
	var chance: float = beh.get("evadeChance", 0.0)
	return randf() < chance

func _resolve_enemy_attack(player: PlayerData, e: Dictionary) -> Dictionary:
	var beh: Dictionary = GameData.get_behavior(e.get("key", ""))
	var style: String = beh.get("style", "normal")
	var dmg: int = 0
	var text: String = "%s의 공격!" % e["label"]

	if style == "beast" and randf() < beh.get("multiHitChance", 0.2):
		dmg = _calc_enemy_damage(player, int(e["atk"] * 0.7)) + _calc_enemy_damage(player, int(e["atk"] * 0.7))
		text = "%s의 연속 물어뜯기!" % e["label"]
	elif (style == "poisoner" or style == "trickster") and randf() < beh.get("poisonChance", 0.22):
		dmg = _calc_enemy_damage(player, int(e["atk"] * 0.85))
		if not player.poisoned:
			player.poisoned = true
			text = "%s의 독습!" % e["label"]
		else:
			text = "%s의 교란 공격!" % e["label"]
	elif (style in ["breath", "boss_breath", "boss_mix"]) and randf() < beh.get("breathChance", 0.25):
		dmg = _calc_enemy_damage(player, int(e["atk"] * 1.35), true)
		if player.burn_turns == 0 and randf() < beh.get("burnChance", 0.2):
			player.burn_turns = 3
			text = "%s의 브레스! 불길이 몸을 감싼다!" % e["label"]
		else:
			text = "%s의 브레스!" % e["label"]
	elif (style == "tank" or style == "boss_mix") and randf() < beh.get("guardChance", 0.25):
		e["guard_turns"] = 1
		text = "%s이(가) 방어 태세를 취했다!" % e["label"]
		return {"dmg": 0, "text": text, "guard": true}
	elif style == "drain" and randf() < 0.3:
		dmg = _calc_enemy_damage(player, int(e["atk"] * 0.95), true)
		var heal_amt := max(5, int(dmg * 0.5))
		e["hp"] = min(e["max_hp"], e["hp"] + heal_amt)
		text = "%s의 흡혈 일격!" % e["label"]
		return {"dmg": dmg, "text": text, "drain_heal": heal_amt}
	else:
		dmg = _calc_enemy_damage(player, e["atk"])

	return {"dmg": dmg, "text": text}

# ── 메인 전투 루프 ──
func start_battle(player: PlayerData, enemy_keys: Array, options: Dictionary = {}) -> String:
	var enemies: Array = []
	for k in enemy_keys:
		var e := spawn_enemy(k)
		if not e.is_empty():
			enemies.append(e)

	if enemies.is_empty():
		return "win"

	_assign_labels(enemies)

	# 보스전 옵션
	if not options.is_empty() and enemies.size() > 0:
		if options.has("name"):
			enemies[0]["name"] = options["name"]
			enemies[0]["label"] = options["name"]
		if options.has("hp_multiply"):
			enemies[0]["hp"] = int(enemies[0]["hp"] * options["hp_multiply"])
			enemies[0]["max_hp"] = enemies[0]["hp"]
		if options.has("hp_add"):
			enemies[0]["hp"] += options["hp_add"]
			enemies[0]["max_hp"] = enemies[0]["hp"]

	# 전투 시작 시그널
	battle_started.emit(player, enemies)

	var skills := get_skills(player)
	var turn: int = 1
	var target_idx: int = 0
	player.temp_buffs = []
	var enemy_stunned: bool = false

	var alive_fn := func() -> Array:
		var result: Array = []
		for e in enemies:
			if e["hp"] > 0:
				result.append(e)
		return result

	var all_dead_fn := func() -> bool:
		for e in enemies:
			if e["hp"] > 0:
				return false
		return true

	var fix_target := func() -> void:
		if target_idx < enemies.size() and enemies[target_idx]["hp"] <= 0:
			for i in range(enemies.size()):
				if enemies[i]["hp"] > 0:
					target_idx = i
					return

	# 등장 메시지
	if enemies.size() == 1:
		var beh: Dictionary = GameData.get_behavior(enemies[0].get("key", ""))
		var intros: Array = beh.get("intros", [])
		if intros.size() > 0:
			battle_log.emit("  " + intros[randi() % intros.size()], "battle-text-system")
		else:
			battle_log.emit("  %s이(가) 나타났다!" % enemies[0]["label"], "battle-text-system")
	else:
		var names: String = ", ".join(enemies.map(func(e): return e["label"]))
		battle_log.emit("  %s이(가) 나타났다!" % names, "battle-text-system")

	battle_ui_update.emit(player, enemies, turn, target_idx)

	# 전투 루프
	while player.is_alive() and not all_dead_fn.call():
		fix_target.call()
		battle_ui_update.emit(player, enemies, turn, target_idx)

		# 플레이어 행동 선택
		battle_choices_requested.emit(skills)
		var action_idx: int = await _wait_for_choice()

		var defending: Variant = false
		var evading: bool = false
		var player_acted: bool = false

		# 공격 계열이면 대상 선택 (적 2마리 이상일 때)
		var is_offensive_skill: bool = action_idx >= 1 and action_idx <= skills.size() \
			and not skills[action_idx - 1].get("defensive", false) \
			and not skills[action_idx - 1].get("evasion", false)
		if (action_idx == 0 or is_offensive_skill) and alive_fn.call().size() > 1:
			target_select_requested.emit(enemies)
			target_idx = await _wait_for_target()
		fix_target.call()
		var target: Dictionary = enemies[target_idx]

		if action_idx == 0:
			# ── 기본 공격 ──
			var atk_result: Dictionary = player.get_attack()
			if _enemy_evaded(target):
				battle_log.emit("  %s이(가) 재빨리 회피했다!" % target["label"], "battle-text-system")
				enemy_flash.emit(target_idx, "miss")
			else:
				var dmg: int = _calc_player_damage(target, atk_result["damage"])
				target["hp"] = max(0, target["hp"] - dmg)
				player.stats["totalDamageDealt"] += dmg
				if atk_result["critical"]:
					player.stats["criticalHits"] += 1
					battle_log.emit("  ★ 치명타! %s에게 %d 데미지!" % [target["label"], dmg], "battle-text-critical")
					enemy_flash.emit(target_idx, "critical")
					screen_shake.emit()
				else:
					battle_log.emit("  %s의 공격! %s에게 %d 데미지!" % [player.player_name, target["label"], dmg], "battle-text-player")
					enemy_flash.emit(target_idx, "hit")
				if target["hp"] <= 0:
					battle_log.emit("  ☠ %s 처치!" % target["label"], "battle-text-critical")
			player_acted = true

		elif action_idx <= skills.size():
			# ── 스킬 ──
			var skill: Dictionary = skills[action_idx - 1]
			if skill.get("defensive", false):
				defending = skill.get("defenseMultiplier", true)
				if defending == true:
					defending = 0.3 if player.job == "마법사" else 0.5
				battle_log.emit("  %s이(가) %s!" % [player.player_name, skill["name"]], "battle-text-player")
			elif skill.get("evasion", false):
				evading = true
				battle_log.emit("  %s이(가) %s!" % [player.player_name, skill["name"]], "battle-text-player")
			elif skill.has("buff"):
				player.temp_buffs.append({
					"stat": skill["buff"]["stat"],
					"percent": skill["buff"]["percent"],
					"turnsLeft": skill["buff"]["turns"],
				})
				battle_log.emit("  %s의 %s! %d턴간 공격력 +%d%%!" % [player.player_name, skill["name"], skill["buff"]["turns"], skill["buff"]["percent"]], "battle-text-player")
			elif skill.has("healPercent"):
				var healed: int = player.heal(int(player.max_hp * skill["healPercent"] / 100.0))
				battle_log.emit("  %s의 %s! HP %d 회복! (%d/%d)" % [player.player_name, skill["name"], healed, player.hp, player.max_hp], "battle-text-player")
			elif skill.get("stun", false) and skill.get("multiplier", 0) == 0:
				enemy_stunned = true
				battle_log.emit("  %s의 %s! 적들이 움직일 수 없다!" % [player.player_name, skill["name"]], "battle-text-player")
			else:
				# 공격 스킬
				var base_dmg: int = player.get_attack()["damage"]
				var mult: float = skill.get("multiplier", 1.0)
				if skill.get("hpScaling", false):
					var hp_ratio: float = 1.0 - (float(player.hp) / float(player.max_hp))
					mult = skill["multiplier"] + hp_ratio * 1.5
				var pb: Dictionary = player.passive_buffs
				if pb.get("skillDamagePercent", 0) > 0:
					mult *= (1.0 + pb["skillDamagePercent"] / 100.0)

				var targets: Array = alive_fn.call() if skill.get("aoe", false) else [target]
				for t in targets:
					var t_idx: int = enemies.find(t)
					if _enemy_evaded(t):
						battle_log.emit("  %s이(가) 스킬을 피했다!" % t["label"], "battle-text-system")
						enemy_flash.emit(t_idx, "miss")
					else:
						var dmg: int = _calc_player_damage(t, int(base_dmg * mult))
						t["hp"] = max(0, t["hp"] - dmg)
						player.stats["totalDamageDealt"] += dmg
						battle_log.emit("  %s의 %s! %s에게 %d 데미지!" % [player.player_name, skill["name"], t["label"], dmg], "battle-text-player")
						enemy_flash.emit(t_idx, "hit")
						if skill.get("poison", false) and t["hp"] > 0:
							t["poisoned"] = true
							t["poison_turns"] = 4 if skill.get("poisonStrong", false) else 3
							battle_log.emit("  %s이(가) 독에 걸렸다!" % t["label"], "battle-text-system")
						if skill.get("stun", false) and t["hp"] > 0:
							t["stunned"] = true
							battle_log.emit("  %s이(가) 얼어붙었다!" % t["label"], "battle-text-system")
						if t["hp"] <= 0:
							battle_log.emit("  ☠ %s 처치!" % t["label"], "battle-text-critical")

				# 다중 타격
				if skill.get("hits", 0) > 1:
					for h in range(1, skill["hits"]):
						var t: Dictionary = target if target["hp"] > 0 else (alive_fn.call()[0] if alive_fn.call().size() > 0 else {})
						if t.is_empty():
							break
						var t_idx2: int = enemies.find(t)
						var dmg2: int = _calc_player_damage(t, int(base_dmg * mult))
						t["hp"] = max(0, t["hp"] - dmg2)
						player.stats["totalDamageDealt"] += dmg2
						battle_log.emit("  %d연타! %s에게 %d 데미지!" % [h + 1, t["label"], dmg2], "battle-text-player")
						enemy_flash.emit(t_idx2, "hit")
						if t["hp"] <= 0:
							battle_log.emit("  ☠ %s 처치!" % t["label"], "battle-text-critical")

			player_acted = true

		elif action_idx == skills.size() + 1:
			# ── 아이템 ──
			battle_item_menu_requested.emit(player)
			var item_name: String = await _wait_for_item()
			if item_name == "":
				continue
			var idx := player.inventory.find(item_name)
			if idx < 0:
				continue
			player.inventory.remove_at(idx)
			var info: Dictionary = GameData.get_item(item_name)
			if info.get("effect", "") == "heal":
				var healed: int = player.heal(info.get("value", 0))
				player.stats["potionsUsed"] += 1
				battle_log.emit("  %s 사용! HP %d 회복! (%d/%d)" % [item_name, healed, player.hp, player.max_hp], "battle-text-player")
			elif info.get("effect", "") == "cure":
				player.poisoned = false
				player.stats["potionsUsed"] += 1
				battle_log.emit("  %s 사용! 독 상태 해제!" % item_name, "battle-text-player")
			player_acted = true

		else:
			# ── 도망 ──
			var flee_chance: float = 0.35
			if enemies.size() >= 3:
				flee_chance -= 0.1
			if "행운의 부적" in player.inventory:
				flee_chance += 0.2
			if randf() < flee_chance:
				battle_log.emit("  도망에 성공했다!", "battle-text-system")
				await _battle_delay(0.6)
				battle_ended.emit("fled")
				return "fled"
			else:
				battle_log.emit("  도망에 실패했다!", "battle-text-system")
				player_acted = true

		# ── 적 독/화상 ──
		for e in enemies:
			if e["hp"] <= 0:
				continue
			if e.get("poisoned", false):
				var pd: int = int(e["max_hp"] * 0.05)
				e["hp"] = max(0, e["hp"] - pd)
				e["poison_turns"] -= 1
				battle_log.emit("  %s이(가) 독으로 %d 데미지!" % [e["label"], pd], "battle-text-system")
				if e["poison_turns"] <= 0:
					e["poisoned"] = false
				if e["hp"] <= 0:
					battle_log.emit("  ☠ %s 처치!" % e["label"], "battle-text-critical")
			if e.get("burn_turns", 0) > 0 and e["hp"] > 0:
				var bd: int = max(3, int(e["max_hp"] * 0.04))
				e["hp"] = max(0, e["hp"] - bd)
				e["burn_turns"] -= 1
				battle_log.emit("  %s이(가) 화상으로 %d 데미지!" % [e["label"], bd], "battle-text-system")
				if e["hp"] <= 0:
					battle_log.emit("  ☠ %s 처치!" % e["label"], "battle-text-critical")

		battle_ui_update.emit(player, enemies, turn, target_idx)
		if all_dead_fn.call():
			break

		# ── 적 턴 ──
		if player_acted and not enemy_stunned:
			for e in alive_fn.call():
				if e.get("stunned", false):
					e["stunned"] = false
					battle_log.emit("  %s이(가) 얼어있어 움직이지 못한다!" % e["label"], "battle-text-system")
					continue

				await _battle_delay(0.35)
				var atk_result: Dictionary = _resolve_enemy_attack(player, e)

				if atk_result.get("guard", false):
					battle_log.emit("  %s" % atk_result["text"], "battle-text-enemy")
				elif evading:
					battle_log.emit("  %s의 공격을 회피했다!" % e["label"], "battle-text-player")
				elif defending != false:
					var reduction: float = float(defending) if defending is float or defending is int else 0.5
					var reduced: int = int(atk_result["dmg"] * reduction)
					player.hp = max(0, player.hp - reduced)
					battle_log.emit("  %s 방어로 %d 데미지!" % [atk_result["text"], reduced], "battle-text-player")
					player_hp_flash.emit()
				else:
					player.hp = max(0, player.hp - atk_result["dmg"])
					battle_log.emit("  %s %d 데미지!" % [atk_result["text"], atk_result["dmg"]], "battle-text-enemy")
					if atk_result["dmg"] > 0:
						player_hp_flash.emit()

				if atk_result.has("drain_heal"):
					battle_log.emit("  %s이(가) %d HP를 흡수했다!" % [e["label"], atk_result["drain_heal"]], "battle-text-enemy")

				# 반격 패시브
				var pb: Dictionary = player.passive_buffs
				if not evading and defending == false and pb.get("counterChance", 0) > 0:
					if randf() * 100 < pb["counterChance"]:
						var c_dmg: int = _calc_player_damage(e, int(player.get_attack()["damage"] * 0.6))
						e["hp"] = max(0, e["hp"] - c_dmg)
						battle_log.emit("  반격! %s에게 %d 데미지!" % [e["label"], c_dmg], "battle-text-player")
						enemy_flash.emit(enemies.find(e), "hit")
						if e["hp"] <= 0:
							battle_log.emit("  ☠ %s 처치!" % e["label"], "battle-text-critical")

				# 불사의 의지
				if not player.is_alive() and pb.get("lastStand", false) and not player.last_stand_used:
					player.hp = 1
					player.last_stand_used = true
					battle_log.emit("  ★ 불사의 의지 발동! HP 1로 생존!", "battle-text-critical")
					screen_shake.emit()

				battle_ui_update.emit(player, enemies, turn, target_idx)
				if not player.is_alive():
					break

			# 플레이어 독/화상
			if player.is_alive() and player.poisoned:
				var p_dmg: int = int(player.max_hp * 0.03)
				player.hp = max(0, player.hp - p_dmg)
				battle_log.emit("  독으로 %d 데미지!" % p_dmg, "battle-text-enemy")
				player_hp_flash.emit()
			if player.is_alive() and player.burn_turns > 0:
				var b_dmg: int = max(4, int(player.max_hp * 0.04))
				player.hp = max(0, player.hp - b_dmg)
				player.burn_turns -= 1
				battle_log.emit("  화상으로 %d 데미지!" % b_dmg, "battle-text-enemy")
				player_hp_flash.emit()

			# 적 방어 해제
			for e in enemies:
				if e.get("guard_turns", 0) > 0:
					e["guard_turns"] -= 1

			battle_ui_update.emit(player, enemies, turn, target_idx)

		if enemy_stunned:
			enemy_stunned = false
		# 임시 버프 턴 소모
		for b in player.temp_buffs:
			b["turnsLeft"] -= 1
		player.temp_buffs = player.temp_buffs.filter(func(b): return b["turnsLeft"] > 0)

		turn += 1

	await _battle_delay(0.5)

	if all_dead_fn.call():
		return await _handle_victory(player, enemies)
	else:
		battle_ended.emit("lose")
		return "lose"

func _handle_victory(player: PlayerData, enemies: Array) -> String:
	battle_log.emit("", "")
	if enemies.size() == 1:
		battle_log.emit("  ★ %s을(를) 물리쳤다!" % enemies[0]["name"], "battle-text-critical")
	else:
		battle_log.emit("  ★ 모든 적을 물리쳤다!", "battle-text-critical")

	player.stats["battlesWon"] += 1
	player.stats["monstersKilled"] += enemies.size()

	var total_gold: int = 0
	var total_exp: int = 0
	var all_drops: Array[String] = []

	for e in enemies:
		total_gold += e["gold"] + randi_range(0, max(1, int(e["gold"] * 0.3)))
		total_exp += e["exp"]
		var drops: Array = GameData.get_drop_table(e["key"])
		for d in drops:
			if randf() < d.get("chance", 0):
				all_drops.append(d.get("item", ""))

	player.gold += total_gold
	player.stats["totalGoldEarned"] += total_gold
	battle_log.emit("  %dG 획득!" % total_gold, "battle-text-critical")

	var leveled: bool = player.gain_exp(total_exp)
	battle_log.emit("  경험치 +%d" % total_exp, "battle-text-system")
	if leveled:
		battle_log.emit("  ★ 레벨 업! Lv.%d! HP 완전 회복!" % player.level, "battle-text-critical")
		SkillTreeMgr.recalc_passives(player)

	for item in all_drops:
		if item != "":
			player.inventory.append(item)
			player.stats["itemsCollected"] += 1
			battle_log.emit("  ▶ %s 드롭!" % item, "battle-text-system")

	battle_ui_update.emit(player, enemies, 0, 0)
	wait_for_tap_requested.emit()
	await tap_received

	# 업적 체크
	AchievementMgr.check(player)

	battle_ended.emit("win")
	return "win"

# ── 대기 헬퍼 ──
func _battle_delay(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout

func _wait_for_choice() -> int:
	_choice_result = -1
	await battle_choice_made
	return _choice_result

func _wait_for_target() -> int:
	_target_result = -1
	await target_selected
	return _target_result

func _wait_for_item() -> String:
	_item_result = ""
	await battle_item_selected
	return _item_result

# UI에서 호출하는 콜백
func on_choice_made(index: int) -> void:
	_choice_result = index
	battle_choice_made.emit(index)

func on_target_selected(index: int) -> void:
	_target_result = index
	target_selected.emit(index)

func on_item_selected(item_name: String) -> void:
	_item_result = item_name
	battle_item_selected.emit(item_name)

func on_tap() -> void:
	tap_received.emit()
