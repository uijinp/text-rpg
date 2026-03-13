## game_state.gd — 게임 상태 관리 싱글톤
## 현재 플레이어, 세이브/로드, 화면 전환 관리
extends Node

signal screen_changed(screen_name: String)
signal player_moved(old_pos: Vector2i, new_pos: Vector2i)
signal location_entered(zone: String)
signal toast_requested(text: String, style: String)

const SAVE_DIR := "user://saves/"
const MAX_SLOTS := 5

var player: PlayerData = null
var current_screen: String = "title"

func _ready() -> void:
	# 세이브 디렉토리 생성
	if not DirAccess.dir_exists_absolute(SAVE_DIR):
		DirAccess.make_dir_recursive_absolute(SAVE_DIR)

# ── 새 게임 ──
func new_game(player_name: String, job: String) -> void:
	player = PlayerData.new()
	player.player_name = player_name
	player.init_class(job)
	show_screen("game")

# ── 화면 전환 ──
func show_screen(name: String) -> void:
	current_screen = name
	screen_changed.emit(name)

# ── 세이브/로드 ──
func save_game(slot: int) -> bool:
	if player == null:
		return false
	var path := SAVE_DIR + "save_%d.json" % slot
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("세이브 실패: %s" % path)
		return false
	var data := player.to_dict()
	data["save_time"] = Time.get_datetime_string_from_system()
	file.store_string(JSON.stringify(data, "\t"))
	file.close()
	toast_requested.emit("저장 완료! (슬롯 %d)" % slot, "toast-save")
	return true

func load_game(slot: int) -> bool:
	var path := SAVE_DIR + "save_%d.json" % slot
	if not FileAccess.file_exists(path):
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return false
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	if json.parse(text) != OK:
		push_error("세이브 파싱 실패: %s" % json.get_error_message())
		return false
	player = PlayerData.new()
	player.from_dict(json.data)
	# 패시브 재계산
	SkillTreeMgr.recalc_passives(player)
	show_screen("game")
	return true

func get_save_info(slot: int) -> Dictionary:
	var path := SAVE_DIR + "save_%d.json" % slot
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	if json.parse(text) != OK:
		return {}
	var data: Dictionary = json.data
	return {
		"name": data.get("name", "???"),
		"job": data.get("job", "???"),
		"level": data.get("level", 1),
		"location": data.get("current_location", ""),
		"save_time": data.get("save_time", ""),
	}

func has_any_save() -> bool:
	for i in range(MAX_SLOTS):
		if FileAccess.file_exists(SAVE_DIR + "save_%d.json" % i):
			return true
	return false

# ── 토스트 ──
func show_toast(text: String, style: String = "") -> void:
	toast_requested.emit(text, style)
