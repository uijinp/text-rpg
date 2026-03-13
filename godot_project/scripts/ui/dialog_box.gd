## dialog_box.gd — 대화 상자 컴포넌트
## 타자기 효과 + 선택지 버튼 + 탭 진행
extends PanelContainer

signal tap_pressed()
signal choice_selected(index: int)

@onready var scroll: ScrollContainer = $MarginContainer/VBox/Scroll
@onready var text_label: RichTextLabel = $MarginContainer/VBox/Scroll/DialogText
@onready var btn_container: VBoxContainer = $MarginContainer/VBox/ButtonContainer
@onready var tap_hint: Label = $MarginContainer/VBox/TapHint

## 타자기 효과 설정
@export var typewriter_speed: float = 0.025  # 글자당 초
@export var fast_speed: float = 0.005

var _typing: bool = false
var _skip_requested: bool = false
var _full_text: String = ""
var _current_visible: int = 0

func _ready() -> void:
	tap_hint.visible = false
	visible = false
	# 전체 패널 클릭 시 스킵/진행
	gui_input.connect(_on_panel_input)

## ── 텍스트 표시 (타자기 효과) ──
func show_text(text: String, append: bool = true) -> void:
	if not visible:
		show_dialog()

	if append:
		_full_text += text + "\n"
	else:
		_full_text = text + "\n"

	text_label.text = _full_text
	text_label.visible_characters = _current_visible  # 이전까지 보이는 상태 유지

	_typing = true
	_skip_requested = false
	tap_hint.visible = false
	_clear_buttons()

	# 타자기 효과
	var total_chars := text_label.get_total_character_count()
	while _current_visible < total_chars:
		if _skip_requested:
			# 스킵 → 전체 표시
			_current_visible = total_chars
			text_label.visible_characters = -1  # 전체 표시
			break
		_current_visible += 1
		text_label.visible_characters = _current_visible
		var speed := fast_speed if Input.is_action_pressed("ui_accept") else typewriter_speed
		await get_tree().create_timer(speed).timeout

	text_label.visible_characters = -1
	_current_visible = text_label.get_total_character_count()
	_typing = false

	# 자동 스크롤
	_scroll_to_bottom()

## ── 탭 대기 (계속 버튼) ──
func wait_for_tap() -> void:
	tap_hint.text = "▶ 탭하여 계속"
	tap_hint.visible = true
	_clear_buttons()

	# 탭 대기
	await tap_pressed
	tap_hint.visible = false

## ── 선택지 표시 + 대기 ──
func show_choices(options: Array) -> int:
	_clear_buttons()
	tap_hint.visible = false

	for i in range(options.size()):
		var btn := Button.new()
		btn.text = options[i]
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var idx := i
		btn.pressed.connect(func():
			_clear_buttons()
			choice_selected.emit(idx)
		)
		btn_container.add_child(btn)

	# 선택 대기
	var selected: int = -1
	var _on_choice := func(idx: int): selected = idx
	choice_selected.connect(_on_choice, CONNECT_ONE_SHOT)
	while selected < 0:
		await get_tree().process_frame
	return selected

## ── 구분선 표시 ──
func show_divider(title: String = "") -> void:
	if not visible:
		show_dialog()
	if title != "":
		_full_text += "\n[color=#d4a017]━━ %s ━━[/color]\n" % title
	else:
		_full_text += "\n[color=#555555]━━━━━━━━━━━━━━[/color]\n"
	text_label.text = _full_text
	text_label.visible_characters = -1
	_current_visible = text_label.get_total_character_count()
	_scroll_to_bottom()

## ── 대화 상자 열기/닫기 ──
func show_dialog() -> void:
	visible = true
	_full_text = ""
	_current_visible = 0
	text_label.text = ""
	text_label.visible_characters = 0
	tap_hint.visible = false
	_clear_buttons()

func hide_dialog() -> void:
	visible = false
	_full_text = ""
	_current_visible = 0
	text_label.text = ""
	_clear_buttons()
	tap_hint.visible = false

func clear_text() -> void:
	_full_text = ""
	_current_visible = 0
	text_label.text = ""
	text_label.visible_characters = 0

## ── 내부 헬퍼 ──
func _clear_buttons() -> void:
	for child in btn_container.get_children():
		child.queue_free()

func _scroll_to_bottom() -> void:
	# 다음 프레임에 스크롤 (레이아웃 업데이트 후)
	await get_tree().process_frame
	scroll.scroll_vertical = scroll.get_v_scroll_bar().max_value

func _on_panel_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed:
		if _typing:
			_skip_requested = true
		elif tap_hint.visible:
			tap_pressed.emit()

func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed("ui_accept"):
		if _typing:
			_skip_requested = true
		elif tap_hint.visible:
			tap_pressed.emit()
			get_viewport().set_input_as_handled()
