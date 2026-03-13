## world_map_panel.gd — 월드맵 패널
## 맵별 거점 목록, 빠른 이동, 현재 위치 표시
extends PanelContainer

signal panel_closed()
signal fast_travel_requested(map_id: String, zone: String, position: Vector2i)

@onready var title_label: Label = $MarginContainer/VBox/TitleLabel
@onready var map_tabs: HBoxContainer = $MarginContainer/VBox/MapTabs
@onready var scroll: ScrollContainer = $MarginContainer/VBox/Scroll
@onready var location_list: VBoxContainer = $MarginContainer/VBox/Scroll/LocationList
@onready var close_btn: Button = $MarginContainer/VBox/CloseBtn

var _player: PlayerData = null
var _current_map: String = "mainland"

# 맵 이름 한글화
const MAP_NAMES: Dictionary = {
	"mainland": "대륙",
	"underworld": "지하세계",
	"celestial": "천상세계",
}

func _ready() -> void:
	visible = false
	close_btn.pressed.connect(func(): visible = false; panel_closed.emit())

func open_panel(player: PlayerData) -> void:
	_player = player
	visible = true
	_current_map = player.current_map
	_build_map_tabs()
	_refresh()

func _build_map_tabs() -> void:
	for child in map_tabs.get_children():
		child.queue_free()

	for map_id in ["mainland", "underworld", "celestial"]:
		# 맵이 데이터에 존재하는지 확인
		var map_data: Dictionary = GameData.get_map_data(map_id)
		if map_data.is_empty():
			continue

		var btn := Button.new()
		var display_name: String = MAP_NAMES.get(map_id, map_id)
		if map_id == _player.current_map:
			btn.text = "★ %s" % display_name
		else:
			btn.text = display_name
		btn.custom_minimum_size = Vector2(80, 0)
		var _mid: String = String(map_id)
		btn.pressed.connect(func():
			_current_map = _mid
			_refresh()
		)
		map_tabs.add_child(btn)

func _refresh() -> void:
	if _player == null:
		return

	var display_name: String = MAP_NAMES.get(_current_map, _current_map)
	title_label.text = "월드맵 — %s" % display_name

	# 목록 클리어
	for child in location_list.get_children():
		child.queue_free()

	var map_data: Dictionary = GameData.get_map_data(_current_map)
	if map_data.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(맵 데이터 없음)"
		location_list.add_child(empty_label)
		return

	var locations: Dictionary = map_data.get("locations", {})
	var raw: Array = map_data.get("raw", [])

	if locations.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(거점 없음)"
		location_list.add_child(empty_label)
		return

	# 거점 정렬 (이름순)
	var sorted_keys: Array = locations.keys()
	sorted_keys.sort_custom(func(a, b):
		return locations[a].get("name", "") < locations[b].get("name", "")
	)

	for loc_key in sorted_keys:
		var loc: Dictionary = locations[loc_key]
		var loc_name: String = loc.get("name", "???")
		var zone: String = loc.get("zone", "")
		var is_visited: bool = zone in _player.visited_locations
		var is_current: bool = zone == _player.current_location and _current_map == _player.current_map

		# 거점 위치 찾기 (raw 맵에서)
		var loc_pos: Vector2i = _find_location_position(raw, loc_key)

		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		# 현재 위치 / 방문 / 미방문 아이콘
		var icon := Label.new()
		if is_current:
			icon.text = "📍"
		elif is_visited:
			icon.text = "✅"
		else:
			icon.text = "❓"
		icon.custom_minimum_size = Vector2(28, 0)
		row.add_child(icon)

		# 거점 이름
		var name_label := Label.new()
		name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if is_current:
			name_label.text = "%s (현재)" % loc_name
			name_label.add_theme_color_override("font_color", Color(0.83, 0.63, 0.09, 1))
		elif is_visited:
			name_label.text = loc_name
			name_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85, 1))
		else:
			name_label.text = "???"
			name_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.4, 1))
		row.add_child(name_label)

		# 빠른 이동 버튼 (방문한 거점만, 현재 위치 제외)
		if is_visited and not is_current and loc_pos != Vector2i(-1, -1):
			var travel_btn := Button.new()
			travel_btn.text = "이동"
			travel_btn.custom_minimum_size = Vector2(60, 0)
			var _map := _current_map
			var _zone := zone
			var _pos := loc_pos
			travel_btn.pressed.connect(func():
				visible = false
				fast_travel_requested.emit(_map, _zone, _pos)
				panel_closed.emit()
			)
			row.add_child(travel_btn)

		location_list.add_child(row)

	# 현재 맵 통계
	var sep := HSeparator.new()
	location_list.add_child(sep)

	var stat_label := Label.new()
	var visited_count := 0
	for loc_key in locations:
		if locations[loc_key].get("zone", "") in _player.visited_locations:
			visited_count += 1
	stat_label.text = "발견: %d / %d 거점" % [visited_count, locations.size()]
	stat_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stat_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6, 1))
	location_list.add_child(stat_label)

func _find_location_position(raw: Array, loc_key: String) -> Vector2i:
	# raw 맵에서 대문자 거점 위치 찾기
	for y in range(raw.size()):
		var row_str: String = raw[y] if raw[y] is String else ""
		var x := row_str.find(loc_key)
		if x >= 0:
			return Vector2i(x, y)
	return Vector2i(-1, -1)
