## audio_manager.gd — 오디오 매니저 싱글톤
## BGM/SFX 재생 관리 (오디오 파일이 추가되면 활성화)
extends Node

var bgm_player: AudioStreamPlayer = null
var sfx_player: AudioStreamPlayer = null

var _current_bgm: String = ""
var _bgm_volume: float = 0.8
var _sfx_volume: float = 1.0
var _muted: bool = false

func _ready() -> void:
	# BGM 플레이어
	bgm_player = AudioStreamPlayer.new()
	bgm_player.name = "BGMPlayer"
	bgm_player.bus = "Master"
	add_child(bgm_player)

	# SFX 플레이어
	sfx_player = AudioStreamPlayer.new()
	sfx_player.name = "SFXPlayer"
	sfx_player.bus = "Master"
	add_child(sfx_player)

	_apply_volumes()

func _apply_volumes() -> void:
	if bgm_player:
		bgm_player.volume_db = linear_to_db(_bgm_volume if not _muted else 0.0)
	if sfx_player:
		sfx_player.volume_db = linear_to_db(_sfx_volume if not _muted else 0.0)

# ── BGM ──
func play_bgm(path: String, fade_in: float = 0.5) -> void:
	if path == _current_bgm and bgm_player.playing:
		return
	if not ResourceLoader.exists(path):
		push_warning("[AudioMgr] BGM 파일 없음: %s" % path)
		return

	_current_bgm = path
	var stream: AudioStream = load(path)
	if stream == null:
		return

	if bgm_player.playing and fade_in > 0:
		# 크로스페이드: 기존 곡 페이드아웃
		var tween := create_tween()
		tween.tween_property(bgm_player, "volume_db", -80.0, fade_in * 0.5)
		await tween.finished
		bgm_player.stop()

	bgm_player.stream = stream
	bgm_player.volume_db = -80.0 if fade_in > 0 else linear_to_db(_bgm_volume)
	bgm_player.play()

	if fade_in > 0:
		var tween := create_tween()
		tween.tween_property(bgm_player, "volume_db", linear_to_db(_bgm_volume), fade_in)

func stop_bgm(fade_out: float = 0.5) -> void:
	if not bgm_player.playing:
		return
	_current_bgm = ""
	if fade_out > 0:
		var tween := create_tween()
		tween.tween_property(bgm_player, "volume_db", -80.0, fade_out)
		await tween.finished
	bgm_player.stop()

# ── SFX ──
func play_sfx(path: String) -> void:
	if not ResourceLoader.exists(path):
		return
	var stream: AudioStream = load(path)
	if stream == null:
		return
	sfx_player.stream = stream
	sfx_player.play()

# ── 간편 SFX 훅 (이름으로 재생) ──
# assets/sfx/ 폴더에 파일 추가 시 사용
func sfx_attack() -> void:
	play_sfx("res://assets/sfx/attack.ogg")

func sfx_hit() -> void:
	play_sfx("res://assets/sfx/hit.ogg")

func sfx_heal() -> void:
	play_sfx("res://assets/sfx/heal.ogg")

func sfx_level_up() -> void:
	play_sfx("res://assets/sfx/level_up.ogg")

func sfx_menu_select() -> void:
	play_sfx("res://assets/sfx/menu_select.ogg")

func sfx_item() -> void:
	play_sfx("res://assets/sfx/item.ogg")

func sfx_door() -> void:
	play_sfx("res://assets/sfx/door.ogg")

func sfx_victory() -> void:
	play_sfx("res://assets/sfx/victory.ogg")

func sfx_defeat() -> void:
	play_sfx("res://assets/sfx/defeat.ogg")

# ── 볼륨 & 뮤트 ──
func set_bgm_volume(vol: float) -> void:
	_bgm_volume = clamp(vol, 0.0, 1.0)
	_apply_volumes()

func set_sfx_volume(vol: float) -> void:
	_sfx_volume = clamp(vol, 0.0, 1.0)
	_apply_volumes()

func toggle_mute() -> void:
	_muted = not _muted
	_apply_volumes()
	GameState.show_toast("음소거: %s" % ("ON" if _muted else "OFF"), "toast-info")

func is_muted() -> bool:
	return _muted

# ── 지역별 BGM 훅 ──
# 지역 진입 시 호출 (field_manager에서 연결)
func on_zone_changed(zone: String) -> void:
	var bgm_map: Dictionary = {
		"town": "res://assets/bgm/town.ogg",
		"forest": "res://assets/bgm/forest.ogg",
		"cave": "res://assets/bgm/cave.ogg",
		"castle_gate": "res://assets/bgm/castle.ogg",
		"castle_inside": "res://assets/bgm/castle.ogg",
		"throne": "res://assets/bgm/boss.ogg",
		"desert": "res://assets/bgm/desert.ogg",
		"volcano": "res://assets/bgm/volcano.ogg",
		"ice": "res://assets/bgm/ice.ogg",
		"elf_village": "res://assets/bgm/elf.ogg",
	}
	var bgm_path: String = bgm_map.get(zone, "")
	if bgm_path != "" and bgm_path != _current_bgm:
		play_bgm(bgm_path)

func on_battle_start() -> void:
	play_bgm("res://assets/bgm/battle.ogg", 0.3)

func on_battle_end() -> void:
	# 이전 지역 BGM으로 복귀
	if GameState.player:
		on_zone_changed(GameState.player.current_location)
