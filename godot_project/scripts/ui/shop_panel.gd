## shop_panel.gd — 상점 UI 패널
## 구매/판매 인터페이스
extends PanelContainer

signal shop_closed()
signal item_bought(item_name: String)
signal item_sold(item_name: String)

@onready var title_label: Label = $MarginContainer/VBox/TitleLabel
@onready var gold_label: Label = $MarginContainer/VBox/GoldLabel
@onready var tab_container: HBoxContainer = $MarginContainer/VBox/Tabs
@onready var buy_btn: Button = $MarginContainer/VBox/Tabs/BuyTab
@onready var sell_btn: Button = $MarginContainer/VBox/Tabs/SellTab
@onready var item_list: VBoxContainer = $MarginContainer/VBox/Scroll/ItemList
@onready var close_btn: Button = $MarginContainer/VBox/CloseBtn

var _player: PlayerData = null
var _shop_stock: Array = []
var _mode: String = "buy"

func _ready() -> void:
	visible = false
	buy_btn.pressed.connect(func(): _set_mode("buy"))
	sell_btn.pressed.connect(func(): _set_mode("sell"))
	close_btn.pressed.connect(_close)

func open_shop(player: PlayerData, shop_type: String = "default") -> void:
	_player = player
	_shop_stock = GameData.get_shop_stock(shop_type)
	_mode = "buy"
	visible = true
	_refresh()

func _close() -> void:
	visible = false
	shop_closed.emit()

func _set_mode(mode: String) -> void:
	_mode = mode
	_refresh()

func _refresh() -> void:
	if _player == null:
		return

	gold_label.text = "소지금: %dG" % _player.gold

	# 탭 시각
	buy_btn.disabled = (_mode == "buy")
	sell_btn.disabled = (_mode == "sell")

	# 아이템 리스트 클리어
	for child in item_list.get_children():
		child.queue_free()

	if _mode == "buy":
		title_label.text = "구매"
		_build_buy_list()
	else:
		title_label.text = "판매"
		_build_sell_list()

func _build_buy_list() -> void:
	if _shop_stock.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(재고 없음)"
		item_list.add_child(empty_label)
		return

	for stock_item in _shop_stock:
		var item_name: String = stock_item if stock_item is String else stock_item.get("item", "")
		var item_data: Dictionary = GameData.get_item(item_name)
		if item_data.is_empty():
			continue

		var price: int = item_data.get("price", 0)
		if price <= 0:
			continue

		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_label := Label.new()
		name_label.text = "%s — %s" % [item_name, item_data.get("desc", "")]
		name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		row.add_child(name_label)

		var price_label := Label.new()
		price_label.text = "%dG" % price
		row.add_child(price_label)

		var btn := Button.new()
		btn.text = "구매"
		btn.custom_minimum_size = Vector2(60, 0)
		var _item := item_name
		var _price := price
		btn.pressed.connect(func(): _do_buy(_item, _price))
		row.add_child(btn)

		item_list.add_child(row)

func _build_sell_list() -> void:
	if _player.inventory.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(판매할 아이템 없음)"
		item_list.add_child(empty_label)
		return

	# 중복 집계
	var count_map: Dictionary = {}
	for item in _player.inventory:
		count_map[item] = count_map.get(item, 0) + 1

	for item_name in count_map:
		var item_data: Dictionary = GameData.get_item(item_name)
		var sell_price: int = max(1, int(item_data.get("price", 10) * 0.5))

		var row := HBoxContainer.new()
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL

		var name_label := Label.new()
		var cnt: int = count_map[item_name]
		name_label.text = "%s%s" % [item_name, (" x%d" % cnt if cnt > 1 else "")]
		name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(name_label)

		var price_label := Label.new()
		price_label.text = "%dG" % sell_price
		row.add_child(price_label)

		var btn := Button.new()
		btn.text = "판매"
		btn.custom_minimum_size = Vector2(60, 0)
		var _item: String = String(item_name)
		var _sell: int = sell_price
		btn.pressed.connect(func(): _do_sell(_item, _sell))
		row.add_child(btn)

		item_list.add_child(row)

func _do_buy(item_name: String, price: int) -> void:
	if _player.gold < price:
		GameState.show_toast("골드가 부족합니다!", "toast-warning")
		return
	_player.gold -= price
	_player.inventory.append(item_name)
	_player.stats["itemsCollected"] += 1
	GameState.show_toast("%s 구매!" % item_name, "toast-info")
	item_bought.emit(item_name)
	_refresh()

func _do_sell(item_name: String, sell_price: int) -> void:
	var idx := _player.inventory.find(item_name)
	if idx < 0:
		return
	_player.inventory.remove_at(idx)
	_player.gold += sell_price
	GameState.show_toast("%s 판매! +%dG" % [item_name, sell_price], "toast-info")
	item_sold.emit(item_name)
	_refresh()
