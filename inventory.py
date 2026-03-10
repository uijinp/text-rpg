"""인벤토리 및 아이템 시스템"""

import random


# ─── 아이템 정의 ───────────────────────────────────────
ITEMS = {
    # 소비 아이템
    "소형 포션":     {"type": "consumable", "effect": "heal",   "value": 30,  "price": 20,  "desc": "HP 30 회복"},
    "대형 포션":     {"type": "consumable", "effect": "heal",   "value": 80,  "price": 50,  "desc": "HP 80 회복"},
    "해독제":        {"type": "consumable", "effect": "cure",   "value": 0,   "price": 30,  "desc": "독 상태 해제"},
    # 무기
    "낡은 검":       {"type": "weapon", "attack_bonus": 5,   "price": 40,  "desc": "공격력 +5"},
    "강철 검":       {"type": "weapon", "attack_bonus": 12,  "price": 100, "desc": "공격력 +12"},
    "마법 지팡이":   {"type": "weapon", "attack_bonus": 18,  "price": 150, "desc": "공격력 +18"},
    "도적의 단검":   {"type": "weapon", "attack_bonus": 8,   "price": 80,  "desc": "공격력 +8, 치명타 확률 상승"},
    # 방어구
    "가죽 갑옷":     {"type": "armor",  "defense_bonus": 4,  "price": 60,  "desc": "방어력 +4"},
    "사슬 갑옷":     {"type": "armor",  "defense_bonus": 9,  "price": 120, "desc": "방어력 +9"},
    "마법 로브":     {"type": "armor",  "defense_bonus": 3,  "price": 90,  "desc": "방어력 +3, 마법 저항"},
    # 신규 무기
    "파라오의 검":   {"type": "weapon", "attack_bonus": 25,  "price": 300, "desc": "공격력 +25, 고대 왕의 무기"},
    "서리의 검":     {"type": "weapon", "attack_bonus": 22,  "price": 250, "desc": "공격력 +22, 빙룡의 힘이 깃든 검"},
    # 특수 아이템
    "행운의 부적":   {"type": "special", "price": 0, "desc": "전투 중 도망 성공률 +20%"},
    "지도 조각":     {"type": "special", "price": 0, "desc": "어딘가의 지도 조각"},
    "고대 부적":     {"type": "special", "price": 0, "desc": "피라미드에서 발견한 고대의 부적"},
    # ─── 확장 아이템 ──────────────────────────────────────
    # 소비 아이템
    "고급 포션":     {"type": "consumable", "effect": "heal",   "value": 120, "price": 100, "desc": "HP 120 회복"},
    # 무기
    "봉인의 검":     {"type": "weapon", "attack_bonus": 20,  "price": 0,   "desc": "공격력 +20, 라자러스에게 특효"},
    "용병의 도끼":   {"type": "weapon", "attack_bonus": 15,  "price": 180, "desc": "공격력 +15, 용병 대장장이 제작"},
    "염화의 검":     {"type": "weapon", "attack_bonus": 30,  "price": 0,   "desc": "공격력 +30, 화산의 불꽃으로 단련된 전설의 검"},
    # 방어구
    "엘프의 로브":   {"type": "armor",  "defense_bonus": 6,  "price": 0,   "desc": "방어력 +6, 엘프 장로가 하사한 마법 저항 로브"},
    "강화 갑옷":     {"type": "armor",  "defense_bonus": 7,  "price": 140, "desc": "방어력 +7, 용병 대장장이가 만든 강화 갑옷"},
    "용암 갑옷":     {"type": "armor",  "defense_bonus": 12, "price": 0,   "desc": "방어력 +12, 화산의 열기로 단련된 최강 갑옷"},
    # 특수 아이템
    "달빛 장신구":   {"type": "special", "price": 0, "desc": "달빛의 가호가 담긴 장신구"},
    "봉인 반지":     {"type": "special", "price": 0, "desc": "라자러스가 훔친 왕의 봉인 반지"},
}


def item_info(name):
    """아이템 딕셔너리 반환 (name 키 포함)"""
    data = ITEMS.get(name)
    if data:
        return {"name": name, **data}
    return None


# ─── 인벤토리 조회 / 사용 ─────────────────────────────
def show_inventory(player):
    print("\n" + "─" * 40)
    print("  인벤토리")
    print("─" * 40)

    if not player.inventory:
        print("  (비어 있음)")
    else:
        from collections import Counter
        counts = Counter(player.inventory)
        for i, (name, cnt) in enumerate(counts.items(), 1):
            info = ITEMS.get(name, {})
            suffix = f"x{cnt}" if cnt > 1 else ""
            print(f"  {i:2}. {name} {suffix:4}  - {info.get('desc', '')}")

    print(f"\n  장착 무기: {player.equipped_weapon['name'] if player.equipped_weapon else '없음'}")
    print(f"  장착 방어구: {player.equipped_armor['name'] if player.equipped_armor else '없음'}")
    print(f"  소지 골드: {player.gold}G")
    print("─" * 40)


def use_item(player):
    consumables = [n for n in player.inventory if ITEMS.get(n, {}).get("type") == "consumable"]
    if not consumables:
        print("  사용할 수 있는 아이템이 없습니다.")
        return

    from collections import Counter
    counts = Counter(consumables)
    names = list(counts.keys())

    print("\n사용할 아이템:")
    for i, name in enumerate(names, 1):
        info = ITEMS[name]
        print(f"  {i}. {name} x{counts[name]}  - {info['desc']}")
    print("  0. 취소")

    try:
        choice = int(input("선택: "))
    except ValueError:
        return

    if choice == 0:
        return
    if not (1 <= choice <= len(names)):
        print("잘못된 선택")
        return

    name = names[choice - 1]
    info = ITEMS[name]
    player.inventory.remove(name)

    if info["effect"] == "heal":
        gained = player.heal(info["value"])
        print(f"  {name} 사용 → HP +{gained} ({player.hp}/{player.max_hp})")
    elif info["effect"] == "cure":
        if hasattr(player, "poisoned") and player.poisoned:
            player.poisoned = False
            print("  해독제 사용 → 독이 해제되었습니다!")
        else:
            print("  독 상태가 아닙니다.")


def equip_item(player):
    equipable = [n for n in player.inventory if ITEMS.get(n, {}).get("type") in ("weapon", "armor")]
    if not equipable:
        print("  장착할 수 있는 아이템이 없습니다.")
        return

    names = list(dict.fromkeys(equipable))  # 순서 유지 중복 제거
    print("\n장착할 아이템:")
    for i, name in enumerate(names, 1):
        info = ITEMS[name]
        t = info["type"]
        bonus_key = "attack_bonus" if t == "weapon" else "defense_bonus"
        print(f"  {i}. {name}  ({t}) - {info['desc']}")
    print("  0. 취소")

    try:
        choice = int(input("선택: "))
    except ValueError:
        return

    if choice == 0:
        return
    if not (1 <= choice <= len(names)):
        print("잘못된 선택")
        return

    name = names[choice - 1]
    info = ITEMS[name]
    itype = info["type"]

    player.inventory.remove(name)

    if itype == "weapon":
        if player.equipped_weapon:
            player.inventory.append(player.equipped_weapon["name"])
        player.equipped_weapon = item_info(name)
        print(f"  {name} 장착 완료! (공격력 +{info['attack_bonus']})")
    else:
        if player.equipped_armor:
            player.inventory.append(player.equipped_armor["name"])
        player.equipped_armor = item_info(name)
        print(f"  {name} 장착 완료! (방어력 +{info['defense_bonus']})")


# ─── 상점 ─────────────────────────────────────────────
SHOP_STOCK = [
    "소형 포션", "대형 포션", "해독제",
    "낡은 검", "강철 검", "가죽 갑옷", "사슬 갑옷",
]

# 용병 대장장이 상점 재고
MERC_SHOP_STOCK = [
    "소형 포션", "대형 포션", "고급 포션", "해독제",
    "용병의 도끼", "강화 갑옷",
]


def open_merc_shop(player):
    """용병 대장장이 상점"""
    print("\n" + "=" * 40)
    print("    용병 대장장이 - 크루거의 대장간")
    print("=" * 40)
    print(f"""
  크루거: "뭘 원하는 거야? 난 쓸데없는 말은 안 해.
           필요한 거 사고 빨리 꺼져. ...농담이야, 하하."
""")
    print(f"  소지 골드: {player.gold}G\n")

    while True:
        print("  1. 구매   2. 판매   0. 나가기")
        cmd = input("  선택: ").strip()
        if cmd == "0":
            print("  크루거: '또 와. 다음엔 더 좋은 거 만들어 놓을 테니.'")
            break
        elif cmd == "1":
            _merc_buy(player)
        elif cmd == "2":
            _sell(player)
        else:
            print("  잘못된 입력")


def _merc_buy(player):
    print("\n[구매]")
    for i, name in enumerate(MERC_SHOP_STOCK, 1):
        info = ITEMS[name]
        print(f"  {i:2}. {name:12} {info['price']:4}G  - {info['desc']}")
    print("   0. 취소")

    try:
        choice = int(input("  선택: "))
    except ValueError:
        return

    if choice == 0:
        return
    if not (1 <= choice <= len(MERC_SHOP_STOCK)):
        print("  잘못된 선택")
        return

    name = MERC_SHOP_STOCK[choice - 1]
    price = ITEMS[name]["price"]

    if player.gold < price:
        print(f"  골드가 부족합니다. (필요: {price}G, 보유: {player.gold}G)")
        return

    player.gold -= price
    player.inventory.append(name)
    print(f"  {name} 구매! 잔여 골드: {player.gold}G")
    print("  크루거: '좋은 선택이야. 그걸로 한 놈 더 쓰러뜨려.'")


def open_shop(player):
    print("\n" + "=" * 40)
    print("    황금 방패 - 상인 막스의 상점")
    print("=" * 40)

    # 상황에 따른 첫 인사
    if player.gold >= 100:
        print(f"""
  막스: "어서오세요, 어서오세요! 오오, 주머니가 두둑하시군요.
         좋은 물건들이 잔뜩 있으니 마음껏 구경하십시오!"
""")
    elif player.gold == 0:
        print(f"""
  막스: "어서오세요... 어? 설마 무일푼이신 건 아니겠죠?
         ...혹시 팔 물건이라도 있으시면 가져오세요."
""")
    else:
        print(f"""
  막스: "어서오세요! 막스의 상점에 오신 걸 환영합니다.
         싸고 좋은 물건은 여기밖에 없죠, 하하!"
""")
    print(f"  소지 골드: {player.gold}G\n")

    first_visit = not getattr(player, "_shop_visited", False)
    if first_visit:
        player._shop_visited = True
        print("  막스: '아, 마왕의 성으로 향하신다고요? 위험한 길이죠...'")
        print("        '포션이라도 넉넉히 챙겨가세요. 목숨이 걸린 일이잖습니까.'\n")

    while True:
        print("  1. 구매   2. 판매   0. 나가기")
        cmd = input("  선택: ").strip()

        if cmd == "0":
            print("  막스: '또 오세요! 살아서 돌아오시길 바랍니다, 하하... 아, 진심으로요.'")
            break
        elif cmd == "1":
            _buy(player)
        elif cmd == "2":
            _sell(player)
        else:
            print("  잘못된 입력")


def _buy(player):
    print("\n[구매]")
    for i, name in enumerate(SHOP_STOCK, 1):
        info = ITEMS[name]
        print(f"  {i:2}. {name:12} {info['price']:4}G  - {info['desc']}")
    print("   0. 취소")

    try:
        choice = int(input("  선택: "))
    except ValueError:
        return

    if choice == 0:
        return
    if not (1 <= choice <= len(SHOP_STOCK)):
        print("  잘못된 선택")
        return

    name = SHOP_STOCK[choice - 1]
    price = ITEMS[name]["price"]

    if player.gold < price:
        print(f"  골드가 부족합니다. (필요: {price}G, 보유: {player.gold}G)")
        return

    player.gold -= price
    player.inventory.append(name)
    # 구매 반응 대사
    reactions = {
        "소형 포션": "막스: '포션은 역시 기본이죠! 아끼지 말고 드세요.'",
        "대형 포션": "막스: '대형 포션! 현명한 선택이십니다. 위기의 순간 구원이 될 거예요.'",
        "해독제":    "막스: '독은 조용히 죽이죠. 이거 하나면 안심이에요.'",
        "낡은 검":   "막스: '낡았어도 믿을 만하죠. 쓸 줄 안다면 말이에요, 하하!'",
        "강철 검":   "막스: '오호! 눈이 높으시군요. 이 녀석, 정말 잘 드는 검이에요.'",
        "가죽 갑옷": "막스: '가죽 갑옷은 가볍고 실용적이죠. 초보 모험가의 필수품!'",
        "사슬 갑옷": "막스: '사슬 갑옷이라니, 진지하시네요. 튼튼하게 잘 막아줄 거예요.'",
        "마법 지팡이":"막스: '마법 지팡이요? 마법사 손님이신가요? 잘 어울리실 것 같아요!'",
    }
    print(f"  {name} 구매! 잔여 골드: {player.gold}G")
    if name in reactions:
        print(f"  {reactions[name]}")


def _sell(player):
    if not player.inventory:
        print("  팔 아이템이 없습니다.")
        return

    from collections import Counter
    counts = Counter(player.inventory)
    names = list(counts.keys())

    print("\n[판매]")
    for i, name in enumerate(names, 1):
        sell_price = ITEMS.get(name, {}).get("price", 0) // 2
        print(f"  {i}. {name} x{counts[name]}  판매가: {sell_price}G")
    print("  0. 취소")

    try:
        choice = int(input("  선택: "))
    except ValueError:
        return

    if choice == 0:
        return
    if not (1 <= choice <= len(names)):
        print("  잘못된 선택")
        return

    name = names[choice - 1]
    sell_price = ITEMS.get(name, {}).get("price", 0) // 2
    player.inventory.remove(name)
    player.gold += sell_price
    print(f"  {name} 판매! 획득 골드: {sell_price}G (잔여: {player.gold}G)")
    # 판매 반응 대사
    sell_reactions = [
        "막스: '좋아요, 좋아. 제값은 못 드리지만 어쩔 수 없죠.'",
        "막스: '이거... 쓰던 거죠? 흠, 뭐 쓸 만하네요. 가져가죠.'",
        "막스: '고마워요. 다음에 필요하면 더 좋은 걸 사세요, 하하!'",
        "막스: '이런 걸 파시다니. 여정이 순탄치 않으신가요?'",
    ]
    print(f"  {random.choice(sell_reactions)}")
