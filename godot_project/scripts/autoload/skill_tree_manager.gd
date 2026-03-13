## skill_tree_manager.gd — 스킬 트리 시스템 싱글톤
extends Node

func get_all_nodes(job: String) -> Array:
	var tree: Dictionary = GameData.skill_trees.get(job, {})
	if tree.is_empty():
		return []
	var nodes: Array = []
	for branch in tree.get("branches", []):
		nodes.append_array(branch.get("nodes", []))
	return nodes

func is_unlocked(player: PlayerData, node_id: String) -> bool:
	return node_id in player.unlocked_skills

func can_unlock(player: PlayerData, node: Dictionary) -> bool:
	if is_unlocked(player, node.get("id", "")):
		return false
	if player.skill_points < node.get("cost", 1):
		return false
	for req_id in node.get("requires", []):
		if req_id not in player.unlocked_skills:
			return false
	return true

func unlock(player: PlayerData, node_id: String) -> bool:
	var nodes := get_all_nodes(player.job)
	var node: Dictionary = {}
	for n in nodes:
		if n.get("id", "") == node_id:
			node = n
			break
	if node.is_empty() or not can_unlock(player, node):
		return false
	player.skill_points -= node.get("cost", 1)
	player.unlocked_skills.append(node_id)
	recalc_passives(player)
	return true

func recalc_passives(player: PlayerData) -> void:
	var buffs: Dictionary = {
		"attackBonus": 0, "defenseBonus": 0, "maxHpBonus": 0,
		"critChanceBonus": 0, "evadeChanceBonus": 0,
		"bonusDamagePercent": 0, "armorPiercePercent": 0,
		"skillDamagePercent": 0, "doubleStrikeChance": 0,
		"counterChance": 0, "burnChanceBonus": 0,
		"poisonDamageBonus": 0, "instantKillChance": 0,
		"lastStand": false,
	}
	var nodes := get_all_nodes(player.job)
	for node in nodes:
		if node.get("id", "") not in player.unlocked_skills:
			continue
		if node.get("type", "") != "passive" or not node.has("effect"):
			continue
		var effect: Dictionary = node["effect"]
		for key in effect:
			var val: Variant = effect[key]
			if val is bool:
				buffs[key] = val
			elif val is int or val is float:
				buffs[key] = buffs.get(key, 0) + val
	player.passive_buffs = buffs

func get_active_skills(player: PlayerData) -> Array:
	var nodes := get_all_nodes(player.job)
	var skills: Array = []
	for node in nodes:
		if node.get("id", "") not in player.unlocked_skills:
			continue
		if node.get("type", "") != "active" or not node.has("skill"):
			continue
		skills.append(node["skill"])
	return skills
