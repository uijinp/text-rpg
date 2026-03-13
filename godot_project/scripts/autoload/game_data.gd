## game_data.gd — 게임 데이터 싱글톤 (오토로드)
## JSON 파일에서 모든 게임 데이터를 로딩하여 전역 접근 제공
extends Node

# ── 데이터 딕셔너리 ──
var classes: Dictionary = {}
var enemies: Dictionary = {}
var drops: Dictionary = {}
var items: Dictionary = {}
var shops: Dictionary = {}
var areas: Dictionary = {}
var area_bg_image: Dictionary = {}
var enemy_behavior: Dictionary = {}
var achievements: Array = []
var skill_trees: Dictionary = {}
var storylets: Array = []

# ── 맵 데이터 ──
var maps: Dictionary = {}  # { "mainland": { "raw": [...], "terrain": {...}, "locations": {...} }, ... }

# ── 이벤트 데이터 (area JSON) ──
var area_events: Dictionary = {}  # { "town": {...}, "forest": {...}, ... }

func _ready() -> void:
	_load_game_data()
	_load_maps()
	_load_extra_data()
	_load_area_events()
	print("[GameData] 데이터 로딩 완료")

func _load_game_data() -> void:
	var data := _load_json("res://data/game_data.json")
	if data == null:
		push_error("game_data.json 로딩 실패!")
		return
	classes = data.get("classes", {})
	enemies = data.get("enemies", {})
	drops = data.get("drops", {})
	items = data.get("items", {})
	shops = data.get("shops", {})
	areas = data.get("areas", {})
	area_bg_image = data.get("area_bg_image", {})

func _load_maps() -> void:
	for map_name in ["mainland", "underworld", "celestial"]:
		var path := "res://data/maps/%s.json" % map_name
		var data := _load_json(path)
		if data:
			maps[map_name] = data

func _load_extra_data() -> void:
	var ach := _load_json("res://data/achievements.json")
	if ach is Array:
		achievements = ach

	var st := _load_json("res://data/skill_trees.json")
	if st is Dictionary:
		skill_trees = st

	var sl := _load_json("res://data/storylets.json")
	if sl is Array:
		storylets = sl

	var eb := _load_json("res://data/enemy_behavior.json")
	if eb is Dictionary:
		enemy_behavior = eb

func _load_area_events() -> void:
	var dir := DirAccess.open("res://data/areas")
	if dir == null:
		push_warning("data/areas/ 디렉토리 열기 실패")
		return
	dir.list_dir_begin()
	var file_name := dir.get_next()
	while file_name != "":
		if file_name.ends_with(".json"):
			var zone := file_name.get_basename()
			var data := _load_json("res://data/areas/%s" % file_name)
			if data:
				area_events[zone] = data
		file_name = dir.get_next()

func _load_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_warning("파일 없음: %s" % path)
		return null
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_warning("파일 열기 실패: %s" % path)
		return null
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	var err := json.parse(text)
	if err != OK:
		push_error("JSON 파싱 실패 [%s]: %s" % [path, json.get_error_message()])
		return null
	return json.data

# ── 편의 함수 ──
func get_enemy(key: String) -> Dictionary:
	return enemies.get(key, {})

func get_item(item_name: String) -> Dictionary:
	return items.get(item_name, {})

func get_area(zone: String) -> Dictionary:
	return areas.get(zone, {})

func get_area_event(zone: String) -> Variant:
	return area_events.get(zone, null)

func get_drop_table(enemy_key: String) -> Array:
	return drops.get(enemy_key, [])

func get_shop_stock(shop_type: String) -> Array:
	return shops.get(shop_type, shops.get("default", []))

func get_map_data(map_id: String) -> Dictionary:
	return maps.get(map_id, {})

func get_behavior(enemy_key: String) -> Dictionary:
	return enemy_behavior.get(enemy_key, {})
