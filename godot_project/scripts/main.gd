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

# ── UI 컴포넌트 (씬 인스턴스) ──
var dialog_box = null      # scripts/ui/dialog_box.gd
var shop_panel = null      # scripts/ui/shop_panel.gd
var save_load_panel = null # scripts/ui/save_load_panel.gd

# ── 상태 ──
var _event_running: bool = false

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

	# 이벤트 엔진 시그널
	EventEngine.dialog_text.connect(_on_event_text)
	EventEngine.dialog_divider.connect(_on_event_divider)
	EventEngine.dialog_menu.connect(_on_event_menu)
	EventEngine.dialog_show.connect(_on_event_dialog_show)
	EventEngine.dialog_hide.connect(_on_event_dialog_hide)
	EventEngine.shop_requested.connect(_on_shop_requested)
	EventEngine.save_requested.connect(_on_save_requested)
	EventEngine.game_over_requested.connect(_on_game_over)

	# 전투 시스템 시그널
	CombatSystem.battle_started.connect(_on_battle_started)
	CombatSystem.battle_ended.connect(_on_battle_ended)
	CombatSystem.battle_log.connect(_on_battle_log)
	CombatSystem.battle_choices_requested.connect(_on_battle_choices)
	CombatSystem.battle_ui_update.connect(_on_battle_ui_update)
	CombatSystem.wait_for_tap_requested.connect(_on_battle_wait_for_tap)
	CombatSystem.enemy_flash.connect(_on_enemy_flash)
	CombatSystem.player_hp_flash.connect(_on_player_hp_flash)
	CombatSystem.screen_shake.connect(_on_screen_shake)
	CombatSystem.target_select_requested.connect(_on_target_select)
	CombatSystem.battle_item_menu_requested.connect(_on_battle_item_menu)

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

# ══════════════════════════════════════════════════
#  타이틀 & 캐릭터 생성
# ══════════════════════════════════════════════════

func _on_new_game() -> void:
	_show_screen("create")
	name_input.text = ""
	name_input.grab_focus()

func _on_continue() -> void:
	# 슬롯 선택 UI를 타이틀 화면에 표시
	_show_load_slots()

func _create_character(job: String) -> void:
	var pname: String = name_input.text.strip_edges()
	if pname == "":
		pname = "모험가"
	GameState.new_game(pname, job)

func _show_load_slots() -> void:
	# 타이틀 화면에 슬롯 목록 표시
	var existing: Node = title_screen.get_node_or_null("LoadSlots")
	if existing:
		existing.queue_free()
		await get_tree().process_frame

	var panel := PanelContainer.new()
	panel.name = "LoadSlots"
	panel.layout_mode = 1
	panel.anchor_left = 0.1
	panel.anchor_top = 0.3
	panel.anchor_right = 0.9
	panel.anchor_bottom = 0.85

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)

	var label := Label.new()
	label.text = "불러오기"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(label)

	for i in range(GameState.MAX_SLOTS):
		var info: Dictionary = GameState.get_save_info(i)
		var btn := Button.new()
		if info.is_empty():
			btn.text = "슬롯 %d: (비어있음)" % (i + 1)
			btn.disabled = true
		else:
			btn.text = "슬롯 %d: %s (%s) Lv.%d" % [i + 1, info.get("name", "???"), info.get("job", "???"), info.get("level", 1)]
			var slot := i
			btn.pressed.connect(func():
				panel.queue_free()
				GameState.load_game(slot)
			)
		vbox.add_child(btn)

	var cancel := Button.new()
	cancel.text = "취소"
	cancel.pressed.connect(func(): panel.queue_free())
	vbox.add_child(cancel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	margin.add_child(vbox)
	panel.add_child(margin)
	title_screen.add_child(panel)

# ══════════════════════════════════════════════════
#  게임 화면 설정
# ══════════════════════════════════════════════════

func _setup_game_screen() -> void:
	if field_manager != null:
		# 이미 설정됨 — 위치만 업데이트
		field_manager.load_map(GameState.player.current_map)
		_update_hud()
		return

	# ── 필드 매니저 (TileMap + 플레이어 + 카메라) ──
	field_manager = Node2D.new()
	field_manager.name = "FieldManager"
	field_manager.set_script(load("res://scripts/field/field_manager.gd"))

	var tile_map_layer := TileMapLayer.new()
	tile_map_layer.name = "TileMapLayer"
	field_manager.add_child(tile_map_layer)

	var player_sprite := Sprite2D.new()
	player_sprite.name = "PlayerSprite"
	field_manager.add_child(player_sprite)

	var camera := Camera2D.new()
	camera.name = "Camera2D"
	camera.zoom = Vector2(2, 2)
	field_manager.add_child(camera)

	# ── SubViewportContainer ──
	var viewport_container := SubViewportContainer.new()
	viewport_container.name = "FieldViewport"
	viewport_container.layout_mode = 1
	viewport_container.anchors_preset = 15
	viewport_container.anchor_right = 1.0
	viewport_container.anchor_bottom = 0.6
	viewport_container.stretch = true

	var sub_viewport := SubViewport.new()
	sub_viewport.name = "SubViewport"
	sub_viewport.size = Vector2i(480, 512)
	sub_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	sub_viewport.add_child(field_manager)
	viewport_container.add_child(sub_viewport)

	game_screen.add_child(viewport_container)

	# ── HUD (화면 상단) ──
	hud = _create_hud()
	game_screen.add_child(hud)

	# ── D-Pad + 버튼 (화면 하단) ──
	dpad = _create_dpad()
	game_screen.add_child(dpad)

	# ── 대화 상자 (하단 오버레이) ── PackedScene 인스턴스
	var dialog_scene := load("res://scenes/ui/dialog_box.tscn")
	dialog_box = dialog_scene.instantiate()
	dialog_box.name = "DialogBox"
	dialog_box.layout_mode = 1
	dialog_box.anchor_top = 0.35
	dialog_box.anchor_right = 1.0
	dialog_box.anchor_bottom = 0.95
	dialog_box.offset_left = 8.0
	dialog_box.offset_right = -8.0
	dialog_box.offset_top = 4.0
	dialog_box.offset_bottom = -4.0
	dialog_box.visible = false
	game_screen.add_child(dialog_box)

	# ── 상점 패널 (오버레이) ──
	var shop_scene := load("res://scenes/ui/shop_panel.tscn")
	shop_panel = shop_scene.instantiate()
	shop_panel.name = "ShopPanel"
	shop_panel.layout_mode = 1
	shop_panel.anchor_top = 0.1
	shop_panel.anchor_right = 1.0
	shop_panel.anchor_bottom = 0.95
	shop_panel.offset_left = 8.0
	shop_panel.offset_right = -8.0
	shop_panel.visible = false
	shop_panel.shop_closed.connect(func():
		shop_panel.visible = false
		EventEngine.on_shop_closed()
		_update_hud()
	)
	game_screen.add_child(shop_panel)

	# ── 세이브/로드 패널 (오버레이) ──
	var save_scene := load("res://scenes/ui/save_load_panel.tscn")
	save_load_panel = save_scene.instantiate()
	save_load_panel.name = "SaveLoadPanel"
	save_load_panel.layout_mode = 1
	save_load_panel.anchor_top = 0.15
	save_load_panel.anchor_right = 1.0
	save_load_panel.anchor_bottom = 0.9
	save_load_panel.offset_left = 20.0
	save_load_panel.offset_right = -20.0
	save_load_panel.visible = false
	save_load_panel.panel_closed.connect(func():
		save_load_panel.visible = false
		_update_hud()
	)
	game_screen.add_child(save_load_panel)

	# 필드 매니저 시그널
	field_manager.encounter_triggered.connect(_on_encounter)
	field_manager.location_entered.connect(_on_location_entered)
	field_manager.player_moved.connect(_on_player_zone_changed)

	# 맵 로드
	field_manager.load_map(GameState.player.current_map)
	_update_hud()

# ══════════════════════════════════════════════════
#  HUD
# ══════════════════════════════════════════════════

func _create_hud() -> Control:
	var panel := PanelContainer.new()
	panel.name = "HUD"
	panel.layout_mode = 1
	panel.anchor_right = 1.0
	panel.offset_bottom = 40.0

	var hbox := HBoxContainer.new()
	hbox.name = "HBox"
	hbox.add_theme_constant_override("separation", 12)

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
	gold_label.text = "30G"
	hbox.add_child(gold_label)

	panel.add_child(hbox)
	return panel

func _update_hud() -> void:
	if hud == null or GameState.player == null:
		return
	var p := GameState.player
	var hbox: HBoxContainer = hud.get_node("HBox")
	hbox.get_node("NameLabel").text = "%s (%s)" % [p.player_name, p.job]
	hbox.get_node("LvLabel").text = "Lv.%d" % p.level
	hbox.get_node("HpLabel").text = "HP: %d/%d" % [p.hp, p.max_hp]
	hbox.get_node("GoldLabel").text = "%dG" % p.gold

# ══════════════════════════════════════════════════
#  D-Pad + 하단 버튼
# ══════════════════════════════════════════════════

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
	save_btn.pressed.connect(_on_save)
	container.add_child(save_btn)

	var map_btn := Button.new()
	map_btn.name = "MapBtn"
	map_btn.text = "지도"
	map_btn.position = Vector2(310, btn_y)
	map_btn.size = Vector2(80, 40)
	map_btn.pressed.connect(_on_world_map)
	container.add_child(map_btn)

	return container

# ══════════════════════════════════════════════════
#  입력 처리
# ══════════════════════════════════════════════════

func _input(event: InputEvent) -> void:
	if GameState.current_screen != "game":
		return
	if _event_running:
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
	if _event_running or (dialog_box != null and dialog_box.visible):
		return
	if shop_panel != null and shop_panel.visible:
		return
	if save_load_panel != null and save_load_panel.visible:
		return
	field_manager.try_move(direction)
	_update_hud()

# ══════════════════════════════════════════════════
#  필드 이벤트
# ══════════════════════════════════════════════════

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
	if GameState.player == null or _event_running:
		return
	var zone: String = GameState.player.current_location
	var event_data: Variant = GameData.get_area_event(zone)
	if event_data != null:
		_event_running = true
		dpad.visible = false
		await EventEngine.run_area_event(zone)
		if dialog_box != null:
			dialog_box.hide_dialog()
		dpad.visible = true
		_event_running = false
		_update_hud()
	else:
		GameState.show_toast("이 지역에는 특별한 것이 없다.", "toast-info")

# ══════════════════════════════════════════════════
#  이벤트 엔진 UI 핸들러
# ══════════════════════════════════════════════════

func _on_event_text(text: String) -> void:
	if dialog_box == null:
		return
	if not dialog_box.visible:
		dialog_box.show_dialog()
	await dialog_box.show_text(text)
	# 타자기 완료 후 탭 대기
	await dialog_box.wait_for_tap()
	EventEngine.on_dialog_tap()

func _on_event_divider(title: String) -> void:
	if dialog_box == null:
		return
	if not dialog_box.visible:
		dialog_box.show_dialog()
	dialog_box.show_divider(title)

func _on_event_menu(options: Array) -> void:
	if dialog_box == null:
		return
	if not dialog_box.visible:
		dialog_box.show_dialog()
	var selected: int = await dialog_box.show_choices(options)
	EventEngine.on_menu_selected(selected)

func _on_event_dialog_show() -> void:
	if dialog_box == null:
		return
	if not dialog_box.visible:
		dialog_box.show_dialog()

func _on_event_dialog_hide() -> void:
	if dialog_box != null:
		dialog_box.hide_dialog()

func _on_shop_requested(player: PlayerData, shop_type: String) -> void:
	if shop_panel == null:
		return
	shop_panel.open_shop(player, shop_type)

func _on_save_requested() -> void:
	if save_load_panel != null:
		save_load_panel.open_panel("save")
		await save_load_panel.panel_closed
	else:
		GameState.save_game(0)

func _on_game_over() -> void:
	GameState.show_toast("전투에서 패배했다...", "toast-warning")
	if dialog_box != null:
		dialog_box.hide_dialog()
	_event_running = false
	await get_tree().create_timer(2.0).timeout
	_show_screen("title")

# ══════════════════════════════════════════════════
#  인벤토리 / 상태 / 지도
# ══════════════════════════════════════════════════

func _on_inventory() -> void:
	if GameState.player == null or _event_running:
		return
	_event_running = true
	if dialog_box != null:
		dialog_box.show_dialog()
		var p := GameState.player

		var inv_text := "[color=#d4a017][b]인벤토리[/b][/color]\n"
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

		await dialog_box.show_text(inv_text, false)

		# 장비/사용/닫기 메뉴
		var menu_options: Array[String] = []
		var usable_items: Array = []

		# 장비 가능한 아이템 확인
		for item_name in p.inventory:
			var info: Dictionary = GameData.get_item(item_name)
			if info.get("type", "") in ["weapon", "armor"]:
				if item_name not in usable_items:
					usable_items.append({"name": item_name, "action": "equip"})
			elif info.get("effect", "") == "heal" or info.get("effect", "") == "cure":
				if item_name not in [u["name"] for u in usable_items]:
					usable_items.append({"name": item_name, "action": "use"})

		for u in usable_items:
			var info: Dictionary = GameData.get_item(u["name"])
			if u["action"] == "equip":
				menu_options.append("장착: %s" % u["name"])
			else:
				menu_options.append("사용: %s" % u["name"])
		menu_options.append("닫기")

		var selected: int = await dialog_box.show_choices(menu_options)

		if selected < usable_items.size():
			var chosen = usable_items[selected]
			if chosen["action"] == "equip":
				_equip_item(p, chosen["name"])
			elif chosen["action"] == "use":
				_use_item(p, chosen["name"])
			_update_hud()

		dialog_box.hide_dialog()
	_event_running = false

func _equip_item(p: PlayerData, item_name: String) -> void:
	var info: Dictionary = GameData.get_item(item_name)
	if info.get("type", "") == "weapon":
		if p.equipped_weapon != "":
			p.inventory.append(p.equipped_weapon)
		p.equipped_weapon = item_name
		var idx := p.inventory.find(item_name)
		if idx >= 0:
			p.inventory.remove_at(idx)
		GameState.show_toast("⚔️ %s 장착!" % item_name, "toast-info")
	elif info.get("type", "") == "armor":
		if p.equipped_armor != "":
			p.inventory.append(p.equipped_armor)
		p.equipped_armor = item_name
		var idx := p.inventory.find(item_name)
		if idx >= 0:
			p.inventory.remove_at(idx)
		GameState.show_toast("🛡️ %s 장착!" % item_name, "toast-info")

func _use_item(p: PlayerData, item_name: String) -> void:
	var idx := p.inventory.find(item_name)
	if idx < 0:
		return
	var info: Dictionary = GameData.get_item(item_name)
	p.inventory.remove_at(idx)
	if info.get("effect", "") == "heal":
		var healed: int = p.heal(info.get("value", 30))
		GameState.show_toast("HP %d 회복! (%d/%d)" % [healed, p.hp, p.max_hp], "toast-info")
		p.stats["potionsUsed"] = p.stats.get("potionsUsed", 0) + 1
	elif info.get("effect", "") == "cure":
		p.poisoned = false
		GameState.show_toast("독 상태 해제!", "toast-info")
		p.stats["potionsUsed"] = p.stats.get("potionsUsed", 0) + 1

func _on_status() -> void:
	if GameState.player == null or _event_running:
		return
	_event_running = true
	if dialog_box != null:
		dialog_box.show_dialog()
		var p := GameState.player
		var status_text := "[color=#d4a017][b]%s[/b][/color] (%s)\n" % [p.player_name, p.job]
		status_text += "Lv.%d  EXP: %d/%d\n" % [p.level, p.exp, p.exp_to_level]
		status_text += "HP: %d/%d\n" % [p.hp, p.max_hp]
		status_text += "ATK: %d  DEF: %d\n" % [p.get_attack()["damage"], p.get_defense()]
		status_text += "💰 %dG\n" % p.gold
		status_text += "어둠 점수: %d\n" % p.dark_points
		status_text += "스킬 포인트: %d\n" % p.skill_points
		status_text += "\n[color=#d4a017][b]전투 기록[/b][/color]\n"
		status_text += "승리: %d  처치: %d\n" % [p.stats.get("battlesWon", 0), p.stats.get("monstersKilled", 0)]
		status_text += "걸음: %d  업적: %d/%d\n" % [
			p.stats.get("stepsWalked", 0),
			p.unlocked_achievements.size(),
			GameData.achievements.size()
		]

		await dialog_box.show_text(status_text, false)
		await dialog_box.show_choices(["닫기"])
		dialog_box.hide_dialog()
	_event_running = false

func _on_save() -> void:
	if GameState.player == null or _event_running:
		return
	if save_load_panel != null:
		save_load_panel.open_panel("save")

func _on_world_map() -> void:
	GameState.show_toast("월드맵은 Phase 6에서 구현 예정", "toast-info")

# ══════════════════════════════════════════════════
#  전투 시스템 UI 핸들러
# ══════════════════════════════════════════════════

func _on_battle_started(_player: PlayerData, enemies: Array) -> void:
	_show_screen("battle")
	_setup_battle_screen(enemies)

func _on_battle_ended(result: String) -> void:
	if result == "win" or result == "fled":
		_show_screen("game")
		_update_hud()
	elif result == "lose":
		if not _event_running:
			GameState.show_toast("전투에서 패배했다...", "toast-warning")
			await get_tree().create_timer(2.0).timeout
			_show_screen("title")

func _setup_battle_screen(enemies: Array) -> void:
	# 기존 전투 UI 클리어
	for child in battle_screen.get_children():
		if child.name != "BG":
			child.queue_free()

	# 배경
	var bg: ColorRect = battle_screen.get_node_or_null("BG")
	if bg == null:
		bg = ColorRect.new()
		bg.name = "BG"
		bg.layout_mode = 1
		bg.anchors_preset = 15
		bg.anchor_right = 1.0
		bg.anchor_bottom = 1.0
		bg.color = Color(0.04, 0.04, 0.06, 1)
		battle_screen.add_child(bg)

	# 배경 이미지 (지역에 따른 전투 배경)
	var bg_img_node: TextureRect = battle_screen.get_node_or_null("BGImage")
	if bg_img_node:
		bg_img_node.queue_free()
	if GameState.player:
		var zone: String = GameState.player.current_location
		var bg_name: String = GameData.area_bg_image.get(zone, "")
		if bg_name != "":
			var bg_path := "res://assets/backgrounds/%s" % bg_name
			if ResourceLoader.exists(bg_path):
				bg_img_node = TextureRect.new()
				bg_img_node.name = "BGImage"
				bg_img_node.layout_mode = 1
				bg_img_node.anchors_preset = 15
				bg_img_node.anchor_right = 1.0
				bg_img_node.anchor_bottom = 0.35
				bg_img_node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
				bg_img_node.texture = load(bg_path)
				bg_img_node.modulate = Color(0.6, 0.6, 0.7, 0.5)  # 반투명 어둡게
				battle_screen.add_child(bg_img_node)

	# 적 표시 영역 (상단 30%)
	var enemy_panel := HBoxContainer.new()
	enemy_panel.name = "EnemyPanel"
	enemy_panel.layout_mode = 1
	enemy_panel.anchor_right = 1.0
	enemy_panel.anchor_bottom = 0.3
	enemy_panel.offset_left = 10.0
	enemy_panel.offset_top = 10.0
	enemy_panel.offset_right = -10.0
	enemy_panel.alignment = BoxContainer.ALIGNMENT_CENTER
	enemy_panel.add_theme_constant_override("separation", 16)
	battle_screen.add_child(enemy_panel)

	for i in range(enemies.size()):
		var e: Dictionary = enemies[i]
		var vbox := VBoxContainer.new()
		vbox.name = "Enemy_%d" % i
		vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		vbox.alignment = BoxContainer.ALIGNMENT_CENTER

		# 적 이미지
		var sprite := TextureRect.new()
		sprite.name = "Sprite"
		sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		sprite.custom_minimum_size = Vector2(80, 80)
		var img_path := "res://assets/monsters/%s.webp" % e.get("key", "")
		if ResourceLoader.exists(img_path):
			sprite.texture = load(img_path)
		vbox.add_child(sprite)

		# 이름
		var name_label := Label.new()
		name_label.name = "NameLabel"
		name_label.text = e.get("label", e.get("name", "???"))
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(name_label)

		# HP 바
		var hp_bar := ProgressBar.new()
		hp_bar.name = "HPBar"
		hp_bar.max_value = e.get("max_hp", 50)
		hp_bar.value = e.get("hp", 50)
		hp_bar.custom_minimum_size = Vector2(80, 12)
		hp_bar.show_percentage = false
		vbox.add_child(hp_bar)

		# HP 텍스트
		var hp_label := Label.new()
		hp_label.name = "HPLabel"
		hp_label.text = "%d/%d" % [e.get("hp", 50), e.get("max_hp", 50)]
		hp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(hp_label)

		enemy_panel.add_child(vbox)

	# 전투 로그 (중간)
	var log_label := RichTextLabel.new()
	log_label.name = "BattleLog"
	log_label.bbcode_enabled = true
	log_label.layout_mode = 1
	log_label.anchor_top = 0.3
	log_label.anchor_right = 1.0
	log_label.anchor_bottom = 0.6
	log_label.offset_left = 10.0
	log_label.offset_top = 5.0
	log_label.offset_right = -10.0
	log_label.scroll_following = true
	battle_screen.add_child(log_label)

	# 플레이어 HP 바 (로그 아래)
	var player_info := HBoxContainer.new()
	player_info.name = "PlayerInfo"
	player_info.layout_mode = 1
	player_info.anchor_top = 0.6
	player_info.anchor_right = 1.0
	player_info.offset_left = 10.0
	player_info.offset_right = -10.0
	player_info.offset_bottom = 30.0

	var player_name_label := Label.new()
	player_name_label.name = "PlayerName"
	player_name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if GameState.player:
		player_name_label.text = "%s Lv.%d" % [GameState.player.player_name, GameState.player.level]
	player_info.add_child(player_name_label)

	var player_hp_bar := ProgressBar.new()
	player_hp_bar.name = "PlayerHPBar"
	player_hp_bar.custom_minimum_size = Vector2(120, 16)
	player_hp_bar.show_percentage = false
	if GameState.player:
		player_hp_bar.max_value = GameState.player.max_hp
		player_hp_bar.value = GameState.player.hp
	player_info.add_child(player_hp_bar)

	var player_hp_label := Label.new()
	player_hp_label.name = "PlayerHPLabel"
	if GameState.player:
		player_hp_label.text = "%d/%d" % [GameState.player.hp, GameState.player.max_hp]
	player_info.add_child(player_hp_label)

	battle_screen.add_child(player_info)

	# 전투 버튼 (하단)
	var btn_container := VBoxContainer.new()
	btn_container.name = "BattleButtons"
	btn_container.layout_mode = 1
	btn_container.anchor_top = 0.67
	btn_container.anchor_right = 1.0
	btn_container.anchor_bottom = 1.0
	btn_container.offset_left = 20.0
	btn_container.offset_right = -20.0
	btn_container.offset_top = 5.0
	battle_screen.add_child(btn_container)

func _on_battle_log(text: String, style: String) -> void:
	var log_label: RichTextLabel = battle_screen.get_node_or_null("BattleLog")
	if log_label == null or text == "":
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
	var btn_container: VBoxContainer = battle_screen.get_node_or_null("BattleButtons")
	if btn_container == null:
		return
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
		skill_btn.text = "%s — %s" % [skill.get("name", "스킬"), skill.get("desc", "")]
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

func _on_battle_ui_update(player: PlayerData, enemies: Array, _turn: int, _target_idx: int) -> void:
	# 적 HP 업데이트
	var enemy_panel: HBoxContainer = battle_screen.get_node_or_null("EnemyPanel")
	if enemy_panel:
		for i in range(enemies.size()):
			var vbox: VBoxContainer = enemy_panel.get_node_or_null("Enemy_%d" % i)
			if vbox == null:
				continue
			var e: Dictionary = enemies[i]
			var hp_bar: ProgressBar = vbox.get_node_or_null("HPBar")
			if hp_bar:
				hp_bar.value = e.get("hp", 0)
			var hp_label: Label = vbox.get_node_or_null("HPLabel")
			if hp_label:
				hp_label.text = "%d/%d" % [max(0, e.get("hp", 0)), e.get("max_hp", 50)]
			# 죽은 적 반투명
			var sprite: TextureRect = vbox.get_node_or_null("Sprite")
			if sprite and e.get("hp", 0) <= 0:
				sprite.modulate = Color(0.3, 0.3, 0.3, 0.5)

	# 플레이어 HP 업데이트
	var player_hp_bar: ProgressBar = battle_screen.get_node_or_null("PlayerInfo/PlayerHPBar")
	if player_hp_bar:
		player_hp_bar.max_value = player.max_hp
		player_hp_bar.value = player.hp
	var player_hp_label: Label = battle_screen.get_node_or_null("PlayerInfo/PlayerHPLabel")
	if player_hp_label:
		player_hp_label.text = "%d/%d" % [player.hp, player.max_hp]

func _on_battle_wait_for_tap() -> void:
	var btn_container: VBoxContainer = battle_screen.get_node_or_null("BattleButtons")
	if btn_container == null:
		return
	_clear_buttons(btn_container)
	var tap_btn := Button.new()
	tap_btn.text = "▶ 탭하여 계속"
	tap_btn.pressed.connect(func():
		tap_btn.queue_free()
		CombatSystem.on_tap()
	)
	btn_container.add_child(tap_btn)

func _on_target_select(enemies: Array) -> void:
	var btn_container: VBoxContainer = battle_screen.get_node_or_null("BattleButtons")
	if btn_container == null:
		return
	_clear_buttons(btn_container)

	var label := Label.new()
	label.text = "대상 선택:"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	btn_container.add_child(label)

	for i in range(enemies.size()):
		var e: Dictionary = enemies[i]
		if e.get("hp", 0) <= 0:
			continue
		var btn := Button.new()
		btn.text = "%s (HP: %d/%d)" % [e.get("label", "???"), e.get("hp", 0), e.get("max_hp", 50)]
		var idx := i
		btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_target_selected(idx))
		btn_container.add_child(btn)

func _on_battle_item_menu(player: PlayerData) -> void:
	var btn_container: VBoxContainer = battle_screen.get_node_or_null("BattleButtons")
	if btn_container == null:
		return
	_clear_buttons(btn_container)

	var label := Label.new()
	label.text = "아이템 선택:"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	btn_container.add_child(label)

	# 사용 가능한 아이템만 표시
	var usable: Array[String] = []
	for item_name in player.inventory:
		var info: Dictionary = GameData.get_item(item_name)
		if info.get("effect", "") in ["heal", "cure"]:
			if item_name not in usable:
				usable.append(item_name)

	if usable.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(사용 가능한 아이템 없음)"
		btn_container.add_child(empty_label)
	else:
		for item_name in usable:
			var info: Dictionary = GameData.get_item(item_name)
			var count := player.inventory.count(item_name)
			var btn := Button.new()
			btn.text = "%s x%d — %s" % [item_name, count, info.get("desc", "")]
			var _item := item_name
			btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_item_selected(_item))
			btn_container.add_child(btn)

	# 취소 버튼
	var cancel_btn := Button.new()
	cancel_btn.text = "취소"
	cancel_btn.pressed.connect(func(): _clear_buttons(btn_container); CombatSystem.on_item_selected(""))
	btn_container.add_child(cancel_btn)

func _on_enemy_flash(index: int, flash_type: String) -> void:
	var enemy_panel: HBoxContainer = battle_screen.get_node_or_null("EnemyPanel")
	if enemy_panel == null:
		return
	var vbox: VBoxContainer = enemy_panel.get_node_or_null("Enemy_%d" % index)
	if vbox == null:
		return
	var sprite: TextureRect = vbox.get_node_or_null("Sprite")
	if sprite == null:
		return

	# 플래시 효과
	var flash_color := Color.WHITE
	match flash_type:
		"hit":
			flash_color = Color(1.5, 1.5, 1.5, 1)
		"critical":
			flash_color = Color(2, 1.5, 0, 1)
		"miss":
			flash_color = Color(0.5, 0.5, 1, 1)

	var orig_modulate := sprite.modulate
	var tween := create_tween()
	tween.tween_property(sprite, "modulate", flash_color, 0.08)
	tween.tween_property(sprite, "modulate", orig_modulate, 0.15)

func _on_player_hp_flash() -> void:
	var player_hp_bar: ProgressBar = battle_screen.get_node_or_null("PlayerInfo/PlayerHPBar")
	if player_hp_bar == null:
		return
	var tween := create_tween()
	tween.tween_property(player_hp_bar, "modulate", Color(1.5, 0.3, 0.3, 1), 0.1)
	tween.tween_property(player_hp_bar, "modulate", Color.WHITE, 0.2)

func _on_screen_shake() -> void:
	# 전투 화면 흔들림 효과
	var original_pos := battle_screen.position
	var tween := create_tween()
	for i in range(4):
		var offset := Vector2(randf_range(-6, 6), randf_range(-4, 4))
		tween.tween_property(battle_screen, "position", original_pos + offset, 0.04)
	tween.tween_property(battle_screen, "position", original_pos, 0.05)

# ══════════════════════════════════════════════════
#  유틸리티
# ══════════════════════════════════════════════════

func _clear_buttons(container: VBoxContainer) -> void:
	for child in container.get_children():
		child.queue_free()

func _show_toast(text: String, _style: String) -> void:
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.modulate = Color(1, 1, 1, 1)
	toast_container.add_child(label)

	var tween := create_tween()
	tween.tween_interval(2.0)
	tween.tween_property(label, "modulate:a", 0.0, 0.5)
	tween.tween_callback(label.queue_free)
