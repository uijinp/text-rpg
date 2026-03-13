## save_load_panel.gd — 세이브/로드 패널 (5슬롯)
extends PanelContainer

signal panel_closed()

@onready var title_label: Label = $MarginContainer/VBox/TitleLabel
@onready var slot_list: VBoxContainer = $MarginContainer/VBox/Scroll/SlotList
@onready var close_btn: Button = $MarginContainer/VBox/CloseBtn

var _mode: String = "save"  # "save" or "load"

func _ready() -> void:
	visible = false
	close_btn.pressed.connect(_close)

func open_panel(mode: String) -> void:
	_mode = mode
	visible = true
	title_label.text = "저장" if mode == "save" else "불러오기"
	_refresh_slots()

func _close() -> void:
	visible = false
	panel_closed.emit()

func _refresh_slots() -> void:
	for child in slot_list.get_children():
		child.queue_free()

	for i in range(GameState.MAX_SLOTS):
		var info: Dictionary = GameState.get_save_info(i)
		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var info_label := Label.new()
		info_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if info.is_empty():
			info_label.text = "슬롯 %d: (비어있음)" % (i + 1)
		else:
			info_label.text = "슬롯 %d: %s (%s) Lv.%d" % [
				i + 1,
				info.get("name", "???"),
				info.get("job", "???"),
				info.get("level", 1)
			]
		row.add_child(info_label)

		var btn := Button.new()
		btn.custom_minimum_size = Vector2(80, 0)
		var slot_idx := i

		if _mode == "save":
			btn.text = "저장"
			btn.pressed.connect(func(): _do_save(slot_idx))
		else:
			btn.text = "불러오기"
			btn.disabled = info.is_empty()
			btn.pressed.connect(func(): _do_load(slot_idx))

		row.add_child(btn)
		slot_list.add_child(row)

func _do_save(slot: int) -> void:
	if GameState.save_game(slot):
		_refresh_slots()

func _do_load(slot: int) -> void:
	if GameState.load_game(slot):
		_close()
