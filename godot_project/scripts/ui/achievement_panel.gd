## achievement_panel.gd — 업적 패널
## 카테고리별 업적 목록, 달성 상태, 보상 표시
extends PanelContainer

signal panel_closed()

@onready var title_label: Label = $MarginContainer/VBox/TitleLabel
@onready var progress_label: Label = $MarginContainer/VBox/ProgressLabel
@onready var category_tabs: HBoxContainer = $MarginContainer/VBox/CategoryTabs
@onready var scroll: ScrollContainer = $MarginContainer/VBox/Scroll
@onready var list_container: VBoxContainer = $MarginContainer/VBox/Scroll/ListContainer
@onready var close_btn: Button = $MarginContainer/VBox/CloseBtn

var _player: PlayerData = null
var _current_category: String = ""  # "" = 전체 보기

func _ready() -> void:
	visible = false
	close_btn.pressed.connect(func(): visible = false; panel_closed.emit())

func open_panel(player: PlayerData) -> void:
	_player = player
	visible = true
	_current_category = ""
	_build_category_tabs()
	_refresh()

func _build_category_tabs() -> void:
	for child in category_tabs.get_children():
		child.queue_free()

	# 전체 탭
	var all_btn := Button.new()
	all_btn.text = "전체"
	all_btn.custom_minimum_size = Vector2(60, 0)
	all_btn.pressed.connect(func():
		_current_category = ""
		_refresh()
	)
	category_tabs.add_child(all_btn)

	# 카테고리 수집
	var categories: Array[String] = []
	for ach in GameData.achievements:
		var cat: String = ach.get("category", "기타")
		if cat not in categories:
			categories.append(cat)

	for cat in categories:
		var btn := Button.new()
		btn.text = cat
		btn.custom_minimum_size = Vector2(60, 0)
		var _cat := cat
		btn.pressed.connect(func():
			_current_category = _cat
			_refresh()
		)
		category_tabs.add_child(btn)

func _refresh() -> void:
	if _player == null:
		return

	# 진행률
	var progress: Dictionary = AchievementMgr.get_progress(_player)
	title_label.text = "업적"
	progress_label.text = "%d / %d 달성" % [progress["unlocked"], progress["total"]]

	# 목록 클리어
	for child in list_container.get_children():
		child.queue_free()

	# 카테고리 필터링
	var achievements: Array = GameData.achievements
	if _current_category != "":
		achievements = achievements.filter(func(a): return a.get("category", "기타") == _current_category)

	if achievements.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(업적 없음)"
		list_container.add_child(empty_label)
		return

	for ach in achievements:
		var ach_id: String = ach.get("id", "")
		var is_unlocked: bool = ach_id in _player.unlocked_achievements

		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		# 아이콘 + 달성 상태
		var icon := Label.new()
		if is_unlocked:
			icon.text = ach.get("icon", "🏆")
		else:
			icon.text = "🔒"
		icon.custom_minimum_size = Vector2(28, 0)
		row.add_child(icon)

		# 이름 + 설명
		var info_vbox := VBoxContainer.new()
		info_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_label := Label.new()
		name_label.text = ach.get("name", "???")
		if is_unlocked:
			name_label.add_theme_color_override("font_color", Color(0.83, 0.63, 0.09, 1))
		else:
			name_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6, 1))
		info_vbox.add_child(name_label)

		var desc_label := Label.new()
		desc_label.text = ach.get("desc", "")
		desc_label.add_theme_font_size_override("font_size", 12)
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5, 1))
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		info_vbox.add_child(desc_label)

		# 보상 표시
		var reward: Dictionary = ach.get("reward", {})
		if not reward.is_empty():
			var reward_text := "보상: "
			var parts: Array[String] = []
			if reward.has("gold"):
				parts.append("%dG" % reward["gold"])
			if reward.has("item"):
				parts.append(reward["item"])
			if reward.has("stat"):
				var stat: Dictionary = reward["stat"]
				for key in stat:
					parts.append("%s +%d" % [key, stat[key]])
			reward_text += ", ".join(parts)
			var reward_label := Label.new()
			reward_label.text = reward_text
			reward_label.add_theme_font_size_override("font_size", 11)
			if is_unlocked:
				reward_label.add_theme_color_override("font_color", Color(0.4, 0.7, 0.4, 1))
			else:
				reward_label.add_theme_color_override("font_color", Color(0.45, 0.45, 0.45, 1))
			info_vbox.add_child(reward_label)

		row.add_child(info_vbox)
		list_container.add_child(row)

		# 구분선
		var sep := HSeparator.new()
		sep.add_theme_constant_override("separation", 2)
		list_container.add_child(sep)
