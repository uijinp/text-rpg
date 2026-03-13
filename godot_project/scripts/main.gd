## main.gd — 메인 씬 루트 스크립트
## 화면 전환, UI 연결, 입력 처리
extends Control

# ── 화면 노드 참조 ──
@onready var title_screen: Control = $TitleScreen
@onready var create_screen: Control = $CreateScreen
@onready var game_screen: Control = $GameScreen
@onready var battle_screen: Control = $BattleScreen
@onready var toast_container: VBoxContainer = $ToastContainer

# ── 타이틀 버튼 ──
@onready var new_game_btn: Button = $TitleScreen/VBox/NewGameBtn
@onready var continue_btn: Button = $TitleScreen/VBox/ContinueBtn

# ── 캐릭터 생성 ──
@onready var name_input: LineEdit = $CreateScreen/VBox/NameInput
@onready var warrior_btn: Button = $CreateScreen/VBox/WarriorBtn
@onready var mage_btn: Button = $CreateScreen/VBox/MageBtn
@onready var rogue_btn: Button = $CreateScreen/VBox/RogueBtn

# ── 게임 화면 서브노드 (동적 생성) ──
var field_manager: Node2D = null
var hud: Control = null
var dpad: Control = null
var dialog_box: Control = null

func _ready() -> void:
	# 시그널 연결
	GameState.screen_changed.connect(_on_screen_changed)
	GameState.toast_requested.connect(_show_toast)

	# 타이틀 버튼
	new_game_btn.pressed.connect(_on_new_game)
	continue_btn.pressed.connect(_on_continue)

	# 캐릭터 생성 버튼
	warrior_btn.pressed.connect(func(): _create_character("전사"))
	mage_btn.pressed.connect(func(): _create_character("마법사"))
	rogue_btn.pressed.connect(func(): _create_character("도적"))

	# 이어하기 버튼 활성화 체크
	continue_btn.disabled = not GameState.has_any_save()

	# 전투 시스템 시그널
	CombatSystem.battle_started.connect(_on_battle_started)
	CombatSystem.battle_ended.connect(_on_battle_ended)
	CombatSystem.battle_log.connect(_on_battle_log)
	CombatSystem.battle_choices_requested.connect(_on_battle_choices)
	CombatSystem.battle_ui_update.connect(_on_battle_ui_update)
	CombatSystem.wait_for_tap_requested.connect(_on_wait_for_tap)

	# 초기 화면
	_show_screen("title")

func _on_screen_changed(screen_name: String) -> void:
	_show_screen(screen_name)

func _show_screen(name: String) -> void:
	title_screen.visible = (name == "title")
	create_screen.visible = (name == "create")
	game_screen.visible = (name == "game")
	battle_screen.visible = (name == "battle")

	if name == "game":
		_setup_game_screen()

# ── 타이틀 ──
func _on_new_game() -> void:
	_show_screen("create")
	name_input.text = ""
	name_input.grab_focus()

func _on_continue() -> void:
	# 첫 번째 사용 가능한 슬롯 로드
	for i in range(GameState.MAX_SLOTS):
		if GameState.load_game(i):
			return
	GameState.show_toast("저장된 게임이 없습니다.", "toast-warning")

# ── 캐릭터 생성 ──
func _create_character(job: String) -> void:
	var pname: String = name_input.text.strip_edges()
	if pname == "":
		pname = "모험가"
	GameState.new_game(pname, job)

# ── 게임 화면 설정 ──
func _setup_game_screen() -> void:
	if field_manager != null:
		# 이미 설정됨 — 위치만 업데이트
		field_manager.load_map(GameState.player.current_map)
		_update_hud()
		return

	# 필드 매니저 (TileMap + 플레이어 + 카메라)
	field_manager = Node2D.new()
	field_manager.name = "FieldManager"
	field_manager.set_script(load("res://scripts/field/field_manager.gd"))

	# TileMapLayer
	var tile_map_layer := TileMapLayer.new()
	tile_map_layer.name = "TileMapLayer"
	field_manager.add_child(tile_map_layer)

	# 플레이어 스프라이트
	var player_sprite := Sprite2D.new()
	player_sprite.name = "PlayerSprite"
	field_manager.add_child(player_sprite)

	# 카메라
	var camera := Camera2D.new()
	camera.name = "Camera2D"
	camera.zoom = Vector2(2, 2)
	field_manager.add_child(camera)

	# SubViewportContainer로 필드 표시
	var viewport_container := SubViewportContainer.new()
	viewport_container.name = "FieldViewport"
	viewport_container.layout_mode = 1
	viewport_container.anchors_preset = 15  # Full rect
	viewport_container.anchor_right = 1.0
	viewport_container.anchor_bottom = 0.6  # 상단 60%
	viewport_container.stretch = true

	var sub_viewport := SubViewport.new()
	sub_viewport.name = "SubViewport"
	sub_viewport.size = Vector2i(480, 512)
	sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	sub_viewport.add_child(field_manager)
	viewport_container.add_child(sub_viewport)

	game_screen.add_child(viewport_container)

	# HUD (화면 상단)
	hud = _create_hud()
	game_screen.add_child(hud)

	# D-Pad + 버튼 (화면 하단)
	dpad = _create_dpad()
	game_screen.add_child(dpad)

	# 대화 상자 (하단 오버레이)
	dialog_box = _create_dialog_box()
	dialog_box.visible = false
	game_screen.add_child(dialog_box)

	# 필드 매니저 시그널
	field_manager.encounter_triggered.connect(_on_encounter)
	field_manager.location_entered.connect(_on_location_entered)
	field_manager.player_moved.connect(_on_player_zone_changed)

	# 맵 로드
	field_manager.load_map(GameState.player.current_map)
	_update_hud()

func _create_hud() -> Control:
	var panel := PanelContainer.new()
	panel.name = "HUD"
	panel.layout_mode = 1
	panel.anchor_right = 1.0
	panel.offset_bottom = 36.0

	var hbox := HBoxContainer.new()
	hbox.name = "HBox"

	var name_label := Label.new()
	name_label.name = "NameLabel"
	name_label.text = "이름"
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(name_label)

	var lv_label := Label.new()
	lv_label.name = "LvLabel"
	lv_label.text = "Lv.1"
	hbox.add_child(lv_label)

	var hp_label := Label.new()
	hp_label.name = "HpLabel"
	hp_label.text = "HP: 100/100"
	hbox.add_child(hp_label)

	var gold_label := Label.new()
	gold_label.name = "GoldLabel"
	gold_label.text = "💰 30G"
	hbox.add_child(gold_label)

	panel.add_child(hbox)
	return panel

func _create_dpad() -> Control:
	var container := Control.new()
	container.name = "DPad"
	container.layout_mode = 1
	container.anchor_top = 0.65
	container.anchor_right = 1.0
	container.anchor_bottom = 1.0

	var center := Vector2(240, 100)
	var btn_size := Vector2(64, 64)
	var offset := 70.0

	# 위
	var up_btn := Button.new()
	up_btn.name = "UpBtn"
	up_btn.text = "▲"
	up_btn.position = center + Vector2(-btn_size.x/2, -offset - btn_size.y/2)
	up_btn.size = btn_size
	up_btn.pressed.connect(func(): _move_player(Vector2i(0, -1)))
	container.add_child(up_btn)

	# 아래
	var down_btn := Button.new()
	down_btn.name = "DownBtn"
	down_btn.text = "▼"
	down_btn.position = center + Vector2(-btn_size.x/2, offset - btn_size.y/2)
	down_btn.size = btn_size
	down_btn.pressed.connect(func(): _move_player(Vector2i(0, 1)))
	container.add_child(down_btn)

	# 왼쪽
	var left_btn := Button.new()
	left_btn.name = "LeftBtn"
	left_btn.text = "◀"
	left_btn.position = center + Vector2(-offset - btn_size.x/2, -btn_size.y/2)
	left_btn.size = btn_size
	left_btn.pressed.connect(func(): _move_player(Vector2i(-1, 0)))
	container.add_child(left_btn)

	# 오른쪽
	var right_btn := Button.new()
	right_btn.name = "RightBtn"
	right_btn.text = "▶"
	right_btn.position = center + Vector2(offset - btn_size.x/2, -btn_size.y/2)
	right_btn.size = btn_size
	right_btn.pressed.connect(func(): _move_player(Vector2i(1, 0)))
	container.add_child(right_btn)

	# 중앙 메뉴 버튼
	var menu_btn := Button.new()
	menu_btn.name = "MenuBtn"
	menu_btn.text = "지역\n탐색"
	menu_btn.position = center + Vector2(-btn_size.x/2, -btn_size.y/2)
	menu_btn.size = btn_size
	menu_btn.pressed.connect(_on_area_explore)
	container.add_child(menu_btn)

	# 하단 버튼들
	var btn_y := center.y + offset + 40

	var inv_btn := Button.new()
	inv_btn.name = "InventoryBtn"
	inv_btn.text = "인벤토리"
	inv_btn.position = Vector2(20, btn_y)
	inv_btn.size = Vector2(100, 40)
	inv_btn.pressed.connect(_on_inventory)
	container.add_child(inv_btn)

	var status_btn := Button.new()
	status_btn.name = "StatusBtn"
	status_btn.text = "상태"
	status_btn.position = Vector2(130, btn_y)
	status_btn.size = Vector2(80, 40)
	status_btn.pressed.connect(_on_status)
	container.add_child(status_btn)

	var save_btn := Button.new()
	save_btn.name = "SaveBtn"
	save_btn.text = "저장"
	save_btn.position = Vector2(220, btn_y)
	save_btn.size = Vector2(80, 40)
	save_btn.pressed.connect(func(): GameState.save_game(0))
	container.add_child(save_btn)

	var map_btn := Button.new()
	map_btn.name = "MapBtn"
	map_btn.text = "지도"
	map_btn.position = Vector2(310, btn_y)
	map_btn.size = Vector2(80, 40)
	map_btn.pressed.connect(_on_world_map)
	container.add_child(map_btn)

	return container

func _create_dialog_box() -> Control:
	var panel := PanelContainer.new()
	panel.name = "DialogBox"
	panel.layout_mode = 1
	panel.anchor_top = 0.4
	panel.anchor_right = 1.0
	panel.anchor_bottom = 0.95
	panel.offset_left = 10.0
	panel.offset_right = -10.0

	var vbox := VBoxContainer.new()
	vbox.name = "VBox"

	var text_label := RichTextLabel.new()
	text_label.name = "DialogText"
	text_label.bbcode_enabled = true
	text_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	text_label.scroll_active = true
	vbox.add_child(text_label)

	var btn_container := VBoxContainer.new()
	btn_container.name = "ButtonContainer"
	vbox.add_child(btn_container)

	panel.add_child(vbox)
	return panel

# ── 입력 처리 ──
func _input(event: InputEvent) -> void:
	if GameState.current_screen != "game":
		return
	if event.is_action_pressed("move_up"):
		_move_player(Vector2i(0, -1))
	elif event.is_action_pressed("move_down"):
		_move_player(Vector2i(0, 1))
	elif event.is_action_pressed("move_left"):
		_move_player(Vector2i(-1, 0))
	elif event.is_action_pressed("move_right"):
		_move_player(Vector2i(1, 0))

func _move_player(direction: Vector2i) -> void:
	if field_manager == null or GameState.player == null:
		return
	if dialog_box.visible:
		return
	field_manager.try_move(direction)
	_update_hud()

func _update_hud() -> void:
	if hud == null or GameState.player == null:
		return
	var p := GameState.player
	var hbox: HBoxContainer = hud.get_node("HBox")
	hbox.get_node("NameLabel").text = "%s (%s)" % [p.player_name, p.job]
	hbox.get_node("LvLabel").text = "Lv.%d" % p.level
	hbox.get_node("HpLabel").text = "HP: %d/%d" % [p.hp, p.max_hp]
	hbox.get_node("GoldLabel").text = "💰 %dG" % p.gold

# ── 필드 이벤트 ──
func _on_encounter(enemies: Array) -> void:
	await CombatSystem.start_battle(GameState.player, enemies)

func _on_location_entered(zone: String, location_name: String) -> void:
	GameState.show_toast("📍 %s" % location_name, "toast-location")
	_update_hud()

func _on_player_zone_changed(_old_zone: String, new_zone: String) -> void:
	var area_data: Dictionary = GameData.get_area(new_zone)
	if not area_data.is_empty():
		var zone_name: String = area_data.get("name", new_zone)
		GameState.show_toast("🗺️ %s" % zone_name, "toast-zone")
	_update_hud()

func _on_area_explore() -> void:
	if GameState.player == null:
		return
	var zone: String = GameState.player.current_location
	var event_data: Variant = GameData.get_area_event(zone)
	if event_data != null:
		_show_dialog()
		await EventEngine.run_area_event(zone)
		_hide_dialog()
	else:
		GameState.show_toast("이 지역에는 특별한 것이 없다.", "toast-info")

func _on_inventory() -> void:
	if GameState.player == null:
		return
	_show_dialog()
	var p := GameState.player
	var text_label: RichTextLabel = dialog_box.get_node("VBox/DialogText")
	text_label.text = ""

	var inv_text := "[b]인벤토리[/b]\n"
	if p.equipped_weapon != "":
		inv_text += "⚔️ 무기: %s\n" % p.equipped_weapon
	if p.equipped_armor != "":
		inv_text += "🛡️ 방어구: %s\n" % p.equipped_armor
	inv_text += "\n"

	if p.inventory.is_empty():
		inv_text += "(빈 가방)"
	else:
		var count_map: Dictionary = {}
		for item in p.inventory:
			count_map[item] = count_map.get(item, 0) + 1
		for item_name in count_map:
			var cnt: int = count_map[item_name]
			var info: Dictionary = GameData.get_item(item_name)
			var desc: String = info.get("desc", "")
			if cnt > 1:
				inv_text += "• %s x%d — %s\n" % [item_name, cnt, desc]
			else:
				inv_text += "• %s — %s\n" % [item_name, desc]

	text_label.text = inv_text

	# 닫기 버튼
	var btn_container: VBoxContainer = dialog_box.get_node("VBox/ButtonContainer")
	_clear_buttons(btn_container)
	var close_btn := Button.new()
	close_btn.text = "닫기"
	close_btn.pressed.connect(func(): _hide_dialog())
	btn_container.add_child(close_btn)

func _on_status() -> void:
	if GameState.player == null:
		return
	_show_dialog()
	var p := GameState.player
	var text_label: RichTextLabel = dialog_box.get_node("VBox/DialogText")
	var status_text := "[b]%s[/b] (%s)\n" % [p.player_name, p.job]
	status_text += "Lv.%d  EXP: %d/%d\n" % [p.level, p.exp, p.exp_to_level]
	status_text += "HP: %d/%d\n" % [p.hp, p.max_hp]
	status_text += "ATK: %d  DEF: %d\n" % [p.attack, p.defense]
	status_text += "💰 %dG\n" % p.gold
	status_text += "어둠 점수: %d\n" % p.dark_points
	status_text += "스킬 포인트: %d\n" % p.skill_points
	status_text += "\n[b]전투 기록[/b]\n"
	status_text += "승리: %d  처치: %d\n" % [p.stats.get("battlesWon", 0), p.stats.get("monstersKilled", 0)]
	status_text += "걸음: %d  업적: %d/%d\n" % [
		p.stats.get("stepsWalked", 0),
		p.unlocked_achievements.size(),
		GameData.achievements.size()
	]
	text_label.text = status_text

	var btn_container: VBoxContainer = dialog_box.get_node("VBox/ButtonContainer")
	_clear_buttons(btn_container)
	var close_btn := Button.new()
	close_btn.text = "닫기"
	close_btn.pressed.connect(func(): _hide_dialog())
	btn_container.add_child(close_btn)

func _on_world_map() -> void:
	GameState.show_toast("월드맵은 Phase 6에서 구현 예정", "toast-info")

# ── 대화 상자 ──
func _show_dialog() -> void:
	dialog_box.visible = true
	var text_label: RichTextLabel = dialog_box.get_node("VBox/DialogText")
	text_label.text = ""
	_clear_buttons(dialog_box.get_node("VBox/ButtonContainer"))

func _hide_dialog() -> void:
	dialog_box.visible = false
	_clear_buttons(dialog_box.get_node("VBox/ButtonContainer"))

func _clear_buttons(container: VBoxContainer) -> void:
	for child in container.get_children():
		child.queue_free()

# ── 이벤트 엔진 연결 ──
func _notification(what: int) -> void:
	if what == NOTIFICATION_READY:
		EventEngine.dialog_text.connect(_on_dialog_text)
		EventEngine.dialog_menu.connect(_on_dialog_menu)

func _on_dialog_text(text: String) -> void:
	if not dialog_box.visible:
		_show_dialog()
	var text_label: RichTextLabel = dialog_box.get_node("VBox/DialogText")
	text_label.text += text + "\n"

	# 탭/클릭으로 진행
	var btn_container: VBoxContainer = dialog_box.get_node("VBox/ButtonContainer")
	_clear_buttons(btn_container)
	var tap_btn := Button.new()
	tap_btn.text = "▶ 계속"
	tap_btn.pressed.connect(func():
		tap_btn.queue_free()
		EventEngine.on_dialog_tap()
	)
	btn_container.add_child(tap_btn)

func _on_dialog_menu(options: Array) -> void:
	var btn_container: VBoxContainer = dialog_box.get_node("VBox/ButtonContainer")
	_clear_buttons(btn_container)
	for i in range(options.size()):
		var btn := Button.new()
		btn.text = options[i]
		var idx := i
		btn.pressed.connect(func():
			_clear_buttons(btn_container)
			EventEngine.on_menu_selected(idx)
		)
		btn_container.add_child(btn)

# ── 전투 시스템 연결 ──
func _on_battle_started(_player: PlayerData, _enemies: Array) -> void:
	_show_screen("battle")
	var battle_log_label := _get_or_create_battle_log()
	battle_log_label.text = ""

func _on_battle_ended(result: String) -> void:
	if result == "win" or result == "fled":
		_show_screen("game")
		_update_hud()
	elif result == "lose":
		# 게임 오버 → 타이틀로
		GameState.show_toast("전투에서 패배했다...", "toast-warning")
		await get_tree().create_timer(2.0).timeout
		_show_screen("title")

func _on_battle_log(text: String, style: String) -> void:
	var log_label := _get_or_create_battle_log()
	if text == "":
		return
	var color: String = "white"
	match style:
		"battle-text-critical":
			color = "#d4a017"
		"battle-text-player":
			color = "#88cc88"
		"battle-text-enemy":
			color = "#cc8888"
		"battle-text-system":
			color = "#aaaaaa"
	log_label.text += "[color=%s]%s[/color]\n" % [color, text]

func _on_battle_choices(skills: Array) -> void:
	# 전투 버튼 생성
	var btn_container := _get_or_create_battle_buttons()
	_clear_buttons(btn_container)

	# 기본 공격
	var atk_btn := Button.new()
	atk_btn.text = "⚔️ 공격"
	atk_btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_choice_made(0))
	btn_container.add_child(atk_btn)

	# 스킬
	for i in range(skills.size()):
		var skill: Dictionary = skills[i]
		var skill_btn := Button.new()
		skill_btn.text = skill.get("name", "스킬")
		var idx := i + 1
		skill_btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_choice_made(idx))
		btn_container.add_child(skill_btn)

	# 아이템
	var item_btn := Button.new()
	item_btn.text = "🎒 아이템"
	var item_idx := skills.size() + 1
	item_btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_choice_made(item_idx))
	btn_container.add_child(item_btn)

	# 도망
	var flee_btn := Button.new()
	flee_btn.text = "🏃 도망"
	var flee_idx := skills.size() + 2
	flee_btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_choice_made(flee_idx))
	btn_container.add_child(flee_btn)

func _on_battle_ui_update(_player: PlayerData, _enemies: Array, _turn: int, _target_idx: int) -> void:
	# 전투 UI 업데이트 (Phase 3에서 상세 구현)
	pass

func _on_wait_for_tap() -> void:
	var btn_container := _get_or_create_battle_buttons()
	_clear_buttons(btn_container)
	var tap_btn := Button.new()
	tap_btn.text = "▶ 탭하여 계속"
	tap_btn.pressed.connect(func():
		tap_btn.queue_free()
		CombatSystem.on_tap()
	)
	btn_container.add_child(tap_btn)

func _get_or_create_battle_log() -> RichTextLabel:
	var existing: RichTextLabel = battle_screen.get_node_or_null("BattleLog")
	if existing:
		return existing
	var log_label := RichTextLabel.new()
	log_label.name = "BattleLog"
	log_label.bbcode_enabled = true
	log_label.layout_mode = 1
	log_label.anchor_right = 1.0
	log_label.anchor_bottom = 0.6
	log_label.offset_left = 10.0
	log_label.offset_top = 10.0
	log_label.offset_right = -10.0
	log_label.scroll_following = true
	battle_screen.add_child(log_label)
	return log_label

func _get_or_create_battle_buttons() -> VBoxContainer:
	var existing: VBoxContainer = battle_screen.get_node_or_null("BattleButtons")
	if existing:
		return existing
	var container := VBoxContainer.new()
	container.name = "BattleButtons"
	container.layout_mode = 1
	container.anchor_top = 0.65
	container.anchor_right = 1.0
	container.anchor_bottom = 1.0
	container.offset_left = 20.0
	container.offset_right = -20.0
	battle_screen.add_child(container)
	return container

# ── 토스트 ──
func _show_toast(text: String, _style: String) -> void:
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.modulate = Color(1, 1, 1, 1)
	toast_container.add_child(label)

	# 페이드 아웃
	var tween := create_tween()
	tween.tween_interval(2.0)
	tween.tween_property(label, "modulate:a", 0.0, 0.5)
	tween.tween_callback(label.queue_free)
