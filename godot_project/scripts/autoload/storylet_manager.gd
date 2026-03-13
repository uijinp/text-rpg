## storylet_manager.gd — 스토리릿(조건부 미니 이벤트) 싱글톤
extends Node

func check_and_trigger(player: PlayerData) -> Variant:
	var eligible: Array = []
	for sl in GameData.storylets:
		var sl_id: String = sl.get("id", "")
		if not sl.get("repeatable", false) and sl_id in player.seen_storylets:
			continue
		var locs: Variant = sl.get("locations", null)
		if locs is Array and locs.size() > 0:
			if player.current_location not in locs:
				continue
		var conditions: Array = sl.get("conditions", [])
		if not conditions.is_empty():
			if not EventEngine.check_condition(conditions, player):
				continue
		var chance: float = sl.get("chance", 0.1)
		if randf() >= chance:
			continue
		eligible.append(sl)

	if eligible.is_empty():
		return null
	return eligible[randi() % eligible.size()]

func trigger(storylet: Dictionary, player: PlayerData) -> Variant:
	player.seen_storylets.append(storylet.get("id", ""))
	GameState.show_toast("📖 %s" % storylet.get("name", ""), "toast-storylet")
	await get_tree().create_timer(0.6).timeout
	return await EventEngine.run_actions(storylet.get("actions", []), player, {})
