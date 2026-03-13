## tile_map_builder.gd — 런타임 TileMap 빌드
## JSON 맵 데이터에서 TileMap을 구성
class_name TileMapBuilder
extends RefCounted

# 타일 이미지 키 → 이미지 경로
const TILE_IMAGE_MAP: Dictionary = {
	"tile_grass": "res://assets/tiles/tile_grass.webp",
	"tile_forest": "res://assets/tiles/tile_forest.webp",
	"tile_water": "res://assets/tiles/tile_water.webp",
	"tile_road": "res://assets/tiles/tile_road.webp",
	"tile_mountain": "res://assets/tiles/tile_mountain.webp",
	"tile_cave": "res://assets/tiles/tile_cave.webp",
	"tile_desert": "res://assets/tiles/tile_desert.webp",
	"tile_swamp": "res://assets/tiles/tile_swamp.webp",
	"tile_ice": "res://assets/tiles/tile_ice.webp",
	"tile_castle": "res://assets/tiles/tile_castle.webp",
	"tile_ruins": "res://assets/tiles/tile_ruins.webp",
	"tile_town": "res://assets/tiles/tile_town.webp",
	"tile_lava": "res://assets/tiles/tile_lava.webp",
	"tile_dark": "res://assets/tiles/tile_dark.webp",
	"tile_bone": "res://assets/tiles/tile_bone.webp",
	"tile_crystal": "res://assets/tiles/tile_crystal.webp",
	"tile_celestial": "res://assets/tiles/tile_celestial.webp",
	"tile_cloud": "res://assets/tiles/tile_cloud.webp",
}

# 타일 문자 → 비주얼 매핑 (visual_map.js TILE_VISUALS 포팅)
const TILE_VISUALS: Dictionary = {
	"#": {"img": "tile_mountain", "passable": false},
	"^": {"img": "tile_mountain", "passable": false},
	"w": {"img": "tile_water", "passable": false},
	"~": {"img": "tile_water", "passable": false},
	"*": {"img": "tile_cloud", "passable": false},
	".": {"img": "tile_grass", "passable": true},
	"=": {"img": "tile_road", "passable": true},
	"_": {"img": "tile_road", "passable": true},
	"f": {"img": "tile_forest", "passable": true},
	"e": {"img": "tile_forest", "passable": true},
	"s": {"img": "tile_forest", "passable": true},
	"n": {"img": "tile_swamp", "passable": true},
	"r": {"img": "tile_water", "passable": true},
	"u": {"img": "tile_ruins", "passable": true},
	"b": {"img": "tile_grass", "passable": true},
	"g": {"img": "tile_castle", "passable": true},
	"i": {"img": "tile_castle", "passable": true},
	"c": {"img": "tile_cave", "passable": true},
	"q": {"img": "tile_cave", "passable": true},
	"d": {"img": "tile_desert", "passable": true},
	"x": {"img": "tile_ice", "passable": true},
	"a": {"img": "tile_water", "passable": true},
	"m": {"img": "tile_water", "passable": true},
	"y": {"img": "tile_cave", "passable": true},
	"j": {"img": "tile_grass", "passable": true},
	"t": {"img": "tile_dark", "passable": true},
	"v": {"img": "tile_lava", "passable": true},
	"z": {"img": "tile_lava", "passable": true},
	"p": {"img": "tile_ruins", "passable": true},
	"o": {"img": "tile_ruins", "passable": true},
	"1": {"img": "tile_bone", "passable": true},
	"2": {"img": "tile_crystal", "passable": true},
	"3": {"img": "tile_lava", "passable": true},
	"4": {"img": "tile_castle", "passable": true},
	"5": {"img": "tile_dark", "passable": true},
	"6": {"img": "tile_bone", "passable": true},
	"7": {"img": "tile_celestial", "passable": true},
}

const CELESTIAL_OVERRIDES: Dictionary = {
	"1": {"img": "tile_celestial"},
	"2": {"img": "tile_celestial"},
	"3": {"img": "tile_celestial"},
	"4": {"img": "tile_celestial"},
	"5": {"img": "tile_celestial"},
	"6": {"img": "tile_celestial"},
	"7": {"img": "tile_celestial"},
}

# TileSet 캐시
static var _tile_set_cache: Dictionary = {}
static var _texture_cache: Dictionary = {}

static func get_tile_visual(ch: String, map_id: String = "mainland") -> Dictionary:
	# 거점 마커 (A-Z)
	if ch >= "A" and ch <= "Z":
		return {"img": "tile_town", "passable": true, "is_location": true}
	if map_id == "celestial" and CELESTIAL_OVERRIDES.has(ch):
		var base: Dictionary = TILE_VISUALS.get(ch, {"img": "tile_grass", "passable": true}).duplicate()
		base["img"] = CELESTIAL_OVERRIDES[ch]["img"]
		return base
	return TILE_VISUALS.get(ch, {"img": "tile_grass", "passable": false})

static func load_tile_texture(img_key: String) -> Texture2D:
	if _texture_cache.has(img_key):
		return _texture_cache[img_key]
	var path: String = TILE_IMAGE_MAP.get(img_key, "")
	if path == "" or not ResourceLoader.exists(path):
		return null
	var tex: Texture2D = load(path)
	_texture_cache[img_key] = tex
	return tex

static func build_tileset(map_id: String) -> TileSet:
	if _tile_set_cache.has(map_id):
		return _tile_set_cache[map_id]

	var tile_set := TileSet.new()
	tile_set.tile_size = Vector2i(32, 32)

	# 고유 이미지 키 수집
	var used_images: Dictionary = {}
	var map_data: Dictionary = GameData.get_map_data(map_id)
	var raw: Array = map_data.get("raw", [])
	for row_str in raw:
		for ch in row_str:
			var visual: Dictionary = get_tile_visual(ch, map_id)
			var img_key: String = visual.get("img", "tile_grass")
			if not used_images.has(img_key):
				used_images[img_key] = true

	# 각 이미지를 TileSetAtlasSource로 추가
	var source_id: int = 0
	var img_to_source: Dictionary = {}  # img_key → {source_id, atlas_coords}

	for img_key in used_images:
		var tex := load_tile_texture(img_key)
		if tex == null:
			continue
		var atlas := TileSetAtlasSource.new()
		atlas.texture = tex
		atlas.texture_region_size = Vector2i(32, 32) if tex.get_size().x >= 32 else Vector2i(int(tex.get_size().x), int(tex.get_size().y))
		# 단일 타일 (전체 텍스처를 하나의 타일로)
		atlas.texture_region_size = Vector2i(int(tex.get_size().x), int(tex.get_size().y))
		atlas.create_tile(Vector2i(0, 0))
		tile_set.add_source(atlas, source_id)
		img_to_source[img_key] = {"source_id": source_id, "atlas_coords": Vector2i(0, 0)}
		source_id += 1

	# 메타데이터로 매핑 정보 저장
	tile_set.set_meta("img_to_source", img_to_source)
	_tile_set_cache[map_id] = tile_set
	return tile_set

static func populate_tilemap(tile_map: TileMapLayer, map_id: String) -> void:
	var map_data: Dictionary = GameData.get_map_data(map_id)
	var raw: Array = map_data.get("raw", [])
	var tile_set: TileSet = tile_map.tile_set
	if tile_set == null:
		return
	var img_to_source: Dictionary = tile_set.get_meta("img_to_source", {})

	for y in range(raw.size()):
		var row_str: String = raw[y]
		for x in range(row_str.length()):
			var ch: String = row_str[x]
			var visual: Dictionary = get_tile_visual(ch, map_id)
			var img_key: String = visual.get("img", "tile_grass")
			var source_info: Dictionary = img_to_source.get(img_key, {})
			if source_info.is_empty():
				continue
			tile_map.set_cell(
				Vector2i(x, y),
				source_info["source_id"],
				source_info["atlas_coords"]
			)

static func is_passable(map_id: String, pos: Vector2i) -> bool:
	var map_data: Dictionary = GameData.get_map_data(map_id)
	var raw: Array = map_data.get("raw", [])
	var terrain: Dictionary = map_data.get("terrain", {})
	var locations: Dictionary = map_data.get("locations", {})

	if pos.y < 0 or pos.y >= raw.size():
		return false
	var row: String = raw[pos.y]
	if pos.x < 0 or pos.x >= row.length():
		return false

	var ch: String = row[pos.x]

	# 거점 마커는 통과 가능
	if ch >= "A" and ch <= "Z":
		return true

	# terrain 데이터에서 확인
	if terrain.has(ch):
		return terrain[ch].get("passable", false)

	# TILE_VISUALS 폴백
	var visual: Dictionary = get_tile_visual(ch, map_id)
	return visual.get("passable", false)

static func get_zone_at(map_id: String, pos: Vector2i) -> String:
	var map_data: Dictionary = GameData.get_map_data(map_id)
	var raw: Array = map_data.get("raw", [])
	var terrain: Dictionary = map_data.get("terrain", {})
	var locations: Dictionary = map_data.get("locations", {})

	if pos.y < 0 or pos.y >= raw.size():
		return ""
	var row: String = raw[pos.y]
	if pos.x < 0 or pos.x >= row.length():
		return ""

	var ch: String = row[pos.x]

	# 거점 마커 (대문자)
	if ch >= "A" and ch <= "Z":
		if locations.has(ch):
			return locations[ch].get("zone", "")

	# terrain에서 zone 확인
	if terrain.has(ch):
		return terrain[ch].get("zone", "")

	return ""
