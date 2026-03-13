## skill_tree_panel.gd — 스킬 트리 패널
## 3직업 × 3브랜치 × 4노드 스킬 트리 UI
extends PanelContainer

signal panel_closed()

@onready var title_label: Label = $MarginContainer/VBox/TitleLabel
@onready var sp_label: Label = $MarginContainer/VBox/SPLabel
@onready var scroll: ScrollContainer = $MarginContainer/VBox/Scroll
@onready var tree_container: VBoxContainer = $MarginContainer/VBox/Scroll/TreeContainer
@onready var close_btn: Button = $MarginContainer/VBox/CloseBtn

var _player: PlayerData = null

func _ready() -> void:
	visible = false
	close_btn.pressed.connect(func(): visible = false; panel_closed.emit())

func open_panel(player: PlayerData) -> void:
	_player = player
	visible = true
	_refresh()

func _refresh() -> void:
	if _player == null:
		return

	title_label.text = "%s 스킬 트리" % _player.job
	sp_label.text = "스킬 포인트: %d" % _player.skill_points

	# 기존 내용 클리어
	for child in tree_container.get_children():
		child.queue_free()

	var tree_data: Dictionary = GameData.skill_trees.get(_player.job, {})
	if tree_data.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(스킬 트리 데이터 없음)"
		tree_container.add_child(empty_label)
		return

	var branches: Array = tree_data.get("branches", [])
	for branch in branches:
		var branch_name: String = branch.get("name", "분기")
		var branch_label := Label.new()
		branch_label.text = "[%s]" % branch_name
		branch_label.add_theme_color_override("font_color", Color(0.83, 0.63, 0.09, 1))
		tree_container.add_child(branch_label)

		var nodes: Array = branch.get("nodes", [])
		for node in nodes:
			var node_id: String = node.get("id", "")
			var node_name: String = node.get("name", "???")
			var node_desc: String = node.get("desc", "")
			var node_cost: int = node.get("cost", 1)
			var node_type: String = node.get("type", "passive")
			var is_unlocked: bool = SkillTreeMgr.is_unlocked(_player, node_id)
			var can_unlock: bool = SkillTreeMgr.can_unlock(_player, node)

			var row := HBoxContainer.new()
			row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

			# 상태 아이콘
			var icon := Label.new()
			if is_unlocked:
				icon.text = "✅"
			elif can_unlock:
				icon.text = "🔓"
			else:
				icon.text = "🔒"
			icon.custom_minimum_size = Vector2(24, 0)
			row.add_child(icon)

			# 이름 + 설명
			var info := Label.new()
			var type_tag := "패시브" if node_type == "passive" else "액티브"
			info.text = "%s [%s] — %s (코스트: %d)" % [node_name, type_tag, node_desc, node_cost]
			info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			row.add_child(info)

			# 습득 버튼
			if not is_unlocked and can_unlock:
				var btn := Button.new()
				btn.text = "습득"
				btn.custom_minimum_size = Vector2(60, 0)
				var _nid := node_id
				btn.pressed.connect(func():
					if SkillTreeMgr.unlock(_player, _nid):
						GameState.show_toast("스킬 습득: %s" % node_name, "toast-info")
						_refresh()
				)
				row.add_child(btn)

			tree_container.add_child(row)

		# 브랜치 구분선
		var sep := HSeparator.new()
		tree_container.add_child(sep)
