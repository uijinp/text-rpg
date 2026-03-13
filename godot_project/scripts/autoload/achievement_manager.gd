## achievement_manager.gd — 업적 시스템 싱글톤
extends Node

signal achievement_unlocked(achievement: Dictionary)

func check(player: PlayerData) -> Array:
	var newly_unlocked: Array = []
	for ach in GameData.achievements:
		var ach_id: String = ach.get("id", "")
		if ach_id in player.unlocked_achievements:
			continue
		if _check_condition(ach.get("condition", {}), player):
			player.unlocked_achievements.append(ach_id)
			_give_reward(player, ach)
			newly_unlocked.append(ach)
			achievement_unlocked.emit(ach)
			GameState.show_toast("🏆 업적 달성: %s" % ach.get("name", ""), "toast-achievement")
	return newly_unlocked

func _check_condition(cond: Dictionary, player: PlayerData) -> bool:
	if cond.has("stat") and cond.has("gte"):
		var stat_name: String = cond["stat"]
		var value: int = player.stats.get(stat_name, 0)
		return value >= cond["gte"]
	if cond.has("flag"):
		return player.story_flags.get(cond["flag"], false) == true
	if cond.has("visited_count_gte"):
		return player.visited_locations.size() >= cond["visited_count_gte"]
	if cond.has("level_gte"):
		return player.level >= cond["level_gte"]
	return false

func _give_reward(player: PlayerData, ach: Dictionary) -> void:
	var reward: Dictionary = ach.get("reward", {})
	if reward.is_empty():
		return
	if reward.has("gold"):
		player.gold += reward["gold"]
	if reward.has("item"):
		player.inventory.append(reward["item"])
	if reward.has("stat"):
		var stat: Dictionary = reward["stat"]
		if stat.has("attack"):
			player.attack += stat["attack"]
		if stat.has("defense"):
			player.defense += stat["defense"]
		if stat.has("max_hp"):
			player.max_hp += stat["max_hp"]
			player.hp += stat["max_hp"]

func get_progress(player: PlayerData) -> Dictionary:
	return {
		"total": GameData.achievements.size(),
		"unlocked": player.unlocked_achievements.size(),
	}
