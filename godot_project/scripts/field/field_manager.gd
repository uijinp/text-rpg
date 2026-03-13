## field_manager.gd — 필드 이동 관리
## 타일맵 위 플레이어 이동, 지역 감지, 랜덤 인카운터
extends Node2D

signal player_moved(old_zone: String, new_zone: String)
signal encounter_triggered(enemies: Array)
signal location_entered(zone: String, location_name: String)

@onready var tile_map_layer: TileMapLayer = $TileMapLayer
@onready var player_sprite: Sprite2D = $PlayerSprite
@onready var camera: Camera2D = $Camera2D

const TILE_SIZE: int = 32
var current_map_id: String = "mainland"
var is_moving: bool = false

func _ready() -> void:
	load_map(GameState.player.current_map if GameState.player else "mainland")

func load_map(map_id: String) -> void:
	current_map_id = map_id

	# TileSet 빌드
	var tile_set := TileMapBuilder.build_tileset(map_id)
	tile_map_layer.tile_set = tile_set

	# 타일맵 채우기
	TileMapBuilder.populate_tilemap(tile_map_layer, map_id)

	# 플레이어 위치
	if GameState.player:
		_update_player_visual()

func _update_player_visual() -> void:
	if GameState.player == null:
		return
	var pos := GameState.player.map_position
	player_sprite.position = Vector2(pos.x * TILE_SIZE + TILE_SIZE / 2, pos.y * TILE_SIZE + TILE_SIZE / 2)
	camera.position = player_sprite.position

	# 캐릭터 스프라이트 로드
	var sprite_map: Dictionary = {
		"전사": "res://assets/characters/warrior_idle.webp",
		"마법사": "res://assets/characters/mage_idle.webp",
		"도적": "res://assets/characters/rogue_idle.webp",
	}
	var sprite_path: String = sprite_map.get(GameState.player.job, "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		var tex: Texture2D = load(sprite_path)
		player_sprite.texture = tex
		# 스프라이트를 타일 크기에 맞게 스케일
		if tex:
			var scale_factor: float = float(TILE_SIZE) / float(max(tex.get_width(), tex.get_height()))
			player_sprite.scale = Vector2(scale_factor, scale_factor)

func try_move(direction: Vector2i) -> bool:
	if is_moving or GameState.player == null:
		return false

	var new_pos := GameState.player.map_position + direction

	# 통과 체크
	if not TileMapBuilder.is_passable(current_map_id, new_pos):
		return false

	# 지역 잠금 체크
	var new_zone := TileMapBuilder.get_zone_at(current_map_id, new_pos)
	if new_zone != "":
		var area_data: Dictionary = GameData.get_area(new_zone)
		if not area_data.is_empty():
			var unlock_cond: Variant = area_data.get("unlock_condition", null)
			if unlock_cond != null and unlock_cond is Dictionary:
				if not EventEngine.check_condition(unlock_cond, GameState.player):
					var hint: String = area_data.get("lock_hint", "아직 갈 수 없습니다.")
					GameState.show_toast(hint, "toast-warning")
					return false

	is_moving = true
	var old_zone: String = GameState.player.current_location

	# 이동 실행
	GameState.player.map_position = new_pos
	GameState.player.stats["stepsWalked"] += 1

	# 존 변경 감지
	if new_zone != "" and new_zone != old_zone:
		GameState.player.current_location = new_zone
		if new_zone not in GameState.player.visited_locations:
			GameState.player.visited_locations.append(new_zone)
		player_moved.emit(old_zone, new_zone)

		# 거점인지 체크
		var map_data: Dictionary = GameData.get_map_data(current_map_id)
		var raw: Array = map_data.get("raw", [])
		if new_pos.y >= 0 and new_pos.y < raw.size():
			var row: String = raw[new_pos.y]
			if new_pos.x >= 0 and new_pos.x < row.length():
				var ch: String = row[new_pos.x]
				if ch >= "A" and ch <= "Z":
					var locations: Dictionary = map_data.get("locations", {})
					if locations.has(ch):
						var loc_name: String = locations[ch].get("name", new_zone)
						location_entered.emit(new_zone, loc_name)
	elif new_zone != "":
		GameState.player.current_location = new_zone

	# 비주얼 업데이트
	_update_player_visual()

	# 랜덤 인카운터 체크
	_check_encounter()

	# 스토리릿 체크
	var storylet: Variant = StoryletMgr.check_and_trigger(GameState.player)
	if storylet != null and storylet is Dictionary:
		await StoryletMgr.trigger(storylet, GameState.player)

	# 업적 체크
	AchievementMgr.check(GameState.player)

	is_moving = false
	return true

func _check_encounter() -> void:
	if GameState.player == null:
		return
	var zone: String = GameState.player.current_location
	var area_data: Dictionary = GameData.get_area(zone)
	if area_data.is_empty():
		return

	var chance: float = area_data.get("encounter_chance", 0)
	if chance <= 0 or randf() >= chance:
		return

	var enemy_pool: Array = area_data.get("encounter_enemies", [])
	if enemy_pool.is_empty():
		return

	var min_enemies: int = area_data.get("minEnemies", 1)
	var max_enemies: int = area_data.get("maxEnemies", 1)
	var count: int = randi_range(min_enemies, max_enemies)

	var enemies: Array[String] = []
	for i in range(count):
		enemies.append(enemy_pool[randi() % enemy_pool.size()])

	encounter_triggered.emit(enemies)
