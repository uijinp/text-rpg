"""내비게이션 / 필드 렌더링 / 조우 / 플레이어 초기화"""

import os
import random

from area_registry import INIT_FLAGS
from story_utils import _set_location, _input_choice, _divider, _pause, game_over
from combat import battle, spawn_enemy
from map import (
    WORLD_CONNECTIONS, TERRAIN, LOCATIONS,
    get_tile_zone, get_location_at, is_zone_locked, get_lock_hint,
    ZONE_DESC, scan_direction, get_current_area_name,
    DIRECTION_NAMES, DIRECTION_DELTAS, DIRECTIONS_ORDER,
)


# ─── 텍스트 기반 이동 UI ─────────────────────────────────
def _get_quest_text(player):
    """현재 퀘스트 목표 텍스트 반환"""
    flags = getattr(player, 'story_flags', {})
    if not flags.get('forest_cleared'):
        return '어두운 숲을 돌파해 길을 확보하라.'
    if not (flags.get('cave_cleared') or flags.get('river_cleared') or flags.get('ruins_cleared')):
        return '동굴/강가/폐허 중 한 곳을 해결하라.'
    if not flags.get('bandit_camp_cleared'):
        return '산적 야영지를 정리하고 성으로 가는 길을 열어라.'
    if not flags.get('castle_gate_cleared'):
        return '마왕의 성 정문을 돌파하라.'
    if not flags.get('castle_inside_cleared'):
        return '성 내부를 탐색하고 최종 전투 준비를 마쳐라.'
    if not flags.get('lazarus_defeated', False):
        return '어둠의 탑에서 라자러스를 추적하거나, 마왕과 대면하라.'
    return '마왕 젤드리온과 대면하라. (봉인 반지 보유 중)'


def _get_adjacent_label(tile_map, row, col, direction, player):
    """한 칸 옆 타일의 이름/상태를 반환 (한 칸 이동용)"""
    dr, dc = DIRECTION_DELTAS[direction]
    nr, nc = row + dr, col + dc
    map_h = len(tile_map)
    map_w = len(tile_map[0]) if tile_map else 0

    if nr < 0 or nr >= map_h or nc < 0 or nc >= map_w:
        return "갈 수 없음", False, None

    ch = tile_map[nr][nc]

    # 벽/통행불가
    if ch == '#':
        return "벽", False, None
    if ch in TERRAIN and not TERRAIN[ch].get('passable', False):
        tile_name = {'w': '바다', '^': '산'}.get(ch, '벽')
        return tile_name, False, None
    if ch not in TERRAIN and ch not in LOCATIONS:
        return "벽", False, None

    # 로케이션 마커
    if ch in LOCATIONS:
        loc = LOCATIONS[ch]
        z = loc['zone']
        if is_zone_locked(player, z):
            return f"{loc['name']} 🔒", False, get_lock_hint(z)
        enc = WORLD_CONNECTIONS.get(z, {}).get('encounter_chance', 0)
        tag = " ⚔" if enc > 0 else ""
        return f"{loc['name']}{tag}", True, None

    # 일반 타일
    tile_zone = get_tile_zone(tile_map, nr, nc)
    if tile_zone:
        if is_zone_locked(player, tile_zone):
            zname = WORLD_CONNECTIONS.get(tile_zone, {}).get('name', tile_zone)
            return f"{zname} 🔒", False, get_lock_hint(tile_zone)
        zname = WORLD_CONNECTIONS.get(tile_zone, {}).get('name', tile_zone)
        enc = WORLD_CONNECTIONS.get(tile_zone, {}).get('encounter_chance', 0)
        tag = " ⚔" if enc > 0 else ""
        return f"{zname}{tag}", True, None

    # 도로/들판 - 그 방향의 가장 가까운 지역 이름도 함께 표시
    ahead = scan_direction(tile_map, row, col, direction, player)
    if ahead["reachable"] and ahead["name"] and ahead["name"] != "들판":
        tag = " ⚔" if ahead["danger"] else ""
        return f"길 → {ahead['name']}{tag}", True, None
    return "길", True, None


def _render_field_screen(player, tile_map, row, col, message=""):
    """텍스트 기반 필드 화면 렌더링 (한 칸 이동 방식).

    Returns: (dir_options, action_start)
        dir_options: {1: "north", 2: "south", ...} 이동 가능한 방향만
        action_start: 행동 메뉴 시작 번호
    """
    os.system('clear')

    area_name = get_current_area_name(tile_map, row, col)
    zone = get_tile_zone(tile_map, row, col)

    # 헤더
    print(f"═══════ [ {area_name} ] ═══════")
    print(f"  ▶ 목표: {_get_quest_text(player)}")
    bar_len = 15
    filled = int(bar_len * player.hp / player.max_hp)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"  HP [{bar}] {player.hp}/{player.max_hp}  Lv.{player.level}  {player.gold}G")
    print()

    # 분위기 설명
    desc = ZONE_DESC.get(zone, ZONE_DESC[None])
    print(f"  {desc}")
    print()

    # 동서남북 한 칸 옆 표시
    print("  ─── 이동 ───")
    dir_options = {}
    num = 1
    for d in DIRECTIONS_ORDER:
        label = DIRECTION_NAMES[d]
        adj_name, passable, hint = _get_adjacent_label(tile_map, row, col, d, player)
        if passable:
            print(f"  {num}. [{label}] {adj_name}")
            dir_options[num] = d
        else:
            if hint:
                print(f"  -  [{label}] {adj_name}")
            else:
                print(f"  -  [{label}] {adj_name}")
        num += 1

    print()
    print("  ─── 행동 ───")
    action_start = num
    loc_zone = get_location_at(tile_map, row, col)
    if loc_zone:
        print(f"  {num}. 탐색 ({area_name})")
        num += 1
    print(f"  {num}. 인벤토리")
    num += 1
    print(f"  {num}. 상태 확인")
    num += 1
    print(f"  {num}. 세계 지도")
    num += 1
    print(f"  {num}. 메뉴")

    if message:
        print(f"\n  ※ {message}")
    print()

    return dir_options, action_start


def _init_player(player):
    """오픈월드 시작 시 필수 상태를 1회 초기화 (area_registry.INIT_FLAGS 기반)"""
    if not hasattr(player, "story_flags"):
        player.story_flags = {}
    if not hasattr(player, "dark_points"):
        player.dark_points = 0
    if not hasattr(player, "visited_locations"):
        player.visited_locations = set()

    if not player.story_flags.get("open_world_initialized"):
        for flag_key, flag_val in INIT_FLAGS.items():
            player.story_flags.setdefault(flag_key, flag_val)
        player.inventory += ["소형 포션", "소형 포션"]
        print("  ▶ 장로에게 소형 포션 x2를 받았습니다.")

    if not getattr(player, "current_location", None):
        _set_location(player, "town")
    else:
        player.visited_locations.add(player.current_location)


def _is_locked(player, neighbor: dict) -> bool:
    key = neighbor.get("key")
    flag = neighbor.get("unlock_flag")
    if not flag:
        return False
    if key == "bandit_camp" or flag == "route_any_cleared":
        return not (
            player.story_flags.get("cave_cleared")
            or player.story_flags.get("river_cleared")
            or player.story_flags.get("ruins_cleared")
        )
    return not player.story_flags.get(flag, False)


def _show_unlock_hint(player, neighbor: dict):
    key = neighbor.get("key")
    hints = {
        "cave": "숲을 먼저 정리해야 동굴로 진입할 수 있습니다.",
        "river": "숲을 먼저 정리해야 강가로 진입할 수 있습니다.",
        "ruins": "숲을 먼저 정리해야 폐허로 진입할 수 있습니다.",
        "bandit_camp": "동굴/강가/폐허 중 한 곳을 먼저 해결하세요.",
        "castle_gate": "산적 야영지 문제를 해결해야 성문이 열립니다.",
        "castle_inside": "성문 방어를 돌파해야 성 내부로 들어갈 수 있습니다.",
        "throne": "성 내부 주요 구역을 정리해야 마왕의 방으로 갈 수 있습니다.",
    }
    print(f"  [잠김] {hints.get(key, '아직 이 경로는 이동할 수 없습니다.')}")


def _get_reachable_neighbors(player, loc_key: str) -> list:
    return WORLD_CONNECTIONS.get(loc_key, {}).get("neighbors", [])


# ─── 필드 랜덤 조우 이벤트 ────────────────────────────
FIELD_ENCOUNTERS = {
    # ── 공통 (어디서든) ──
    "common": [
        {
            "text": "  길가에 지친 여행자가 앉아 있다.\n  \"안녕하시오, 용사. 이 길 끝에 뭐가 있는지 아시오?\"",
            "action": None,
        },
        {
            "text": "  떠돌이 상인이 짐을 잔뜩 진 당나귀를 끌고 지나간다.\n  \"좋은 물건 있소! ... 아, 지금은 바쁘구려. 다음에!\"",
            "action": None,
        },
        {
            "text": "  길 위에 반짝이는 동전 주머니가 떨어져 있다!",
            "action": "gold_small",
        },
        {
            "text": "  풀숲에서 토끼 한 마리가 튀어나와 도망친다.\n  평화로운 순간이다.",
            "action": None,
        },
        {
            "text": "  바람에 낡은 편지가 날아왔다.\n  '...왕국의 서쪽에 숨겨진 호수가 있다는데...'",
            "action": None,
        },
        {
            "text": "  떠돌이 음유시인이 류트를 연주하며 걸어간다.\n  \"영웅의 노래를 불러드릴까? 하하, 농담이오.\"",
            "action": None,
        },
        {
            "text": "  길가의 돌무덤 옆에 시든 꽃이 놓여 있다.\n  누군가를 추모하는 듯하다.",
            "action": None,
        },
    ],
    # ── 안전 지역 전용 ──
    "safe": [
        {
            "text": "  왕국 순찰 기사 두 명이 말을 타고 지나간다.\n  \"용사시군! 무운을 빕니다!\"",
            "action": None,
        },
        {
            "text": "  농부가 수레에 밀을 싣고 마을로 향하고 있다.\n  \"올해는 풍년이라오. 덕분에 살만하지.\"",
            "action": None,
        },
        {
            "text": "  나무 아래서 쉬고 있는 수녀가 미소 짓는다.\n  \"빛이 함께하기를.\"  HP가 약간 회복되었다.",
            "action": "heal_small",
        },
        {
            "text": "  아이들이 나무 검으로 결투 놀이를 하고 있다.\n  \"나는 용사! 너는 마왕!\" \"에이, 맨날 내가 마왕이야!\"",
            "action": None,
        },
        {
            "text": "  길가의 약초 채집꾼이 손을 흔든다.\n  \"이거 가져가시오. 쓸모 있을 거요.\"",
            "action": "herb",
        },
    ],
    # ── 위험 지역 전용 ──
    "danger": [
        {
            "text": "  갈림길에 부서진 마차가 버려져 있다.\n  산적의 소행인 듯... 주위를 경계하게 된다.",
            "action": None,
        },
        {
            "text": "  멀리서 늑대 울음소리가 들린다.\n  갈수록 위험해지는 느낌이다.",
            "action": None,
        },
        {
            "text": "  쓰러진 병사가 신음하고 있다.\n  \"조심... 하시오... 앞에... 놈들이...\"",
            "action": "wounded_soldier",
        },
        {
            "text": "  해골이 나뭇가지에 매달려 있다.\n  경고의 의미인 듯하다. 등줄기가 서늘해진다.",
            "action": None,
        },
        {
            "text": "  길 위에 피 묻은 검이 떨어져 있다.\n  누군가 여기서 싸운 흔적이다.",
            "action": "bloody_sword",
        },
        {
            "text": "  덤불 속에서 기묘한 빛이 반짝인다.\n  다가가자 반딧불이가 흩어진다. 잠시 긴장했다.",
            "action": None,
        },
    ],
    # ── 지역별 고유 ──
    "forest": [
        {
            "text": "  숲 요정이 나뭇잎 사이에서 깔깔 웃으며 장난친다.\n  반짝이는 가루가 내려앉는다.",
            "action": "fairy_dust",
        },
        {
            "text": "  거대한 사슴이 당신을 물끄러미 바라보다 숲 속으로 사라진다.\n  신비로운 존재인 듯하다.",
            "action": None,
        },
    ],
    "desert": [
        {
            "text": "  사막 대상(캐러밴)이 낙타를 이끌고 지나간다.\n  \"물 한 모금 드리겠소. 이 열기에 쓰러지면 안 되잖소.\"",
            "action": "heal_small",
        },
        {
            "text": "  신기루가 앞에 펼쳐진다. 오아시스인 줄 알았는데\n  아지랑이일 뿐이다.",
            "action": None,
        },
    ],
    "ice": [
        {
            "text": "  얼어붙은 호수 위로 오로라가 펼쳐진다.\n  추위도 잊게 만드는 장관이다.",
            "action": None,
        },
    ],
    "swamp": [
        {
            "text": "  늪지의 개구리들이 일제히 울기 시작한다.\n  기분 나쁜 전조인가, 그냥 밤이 온 건가.",
            "action": None,
        },
    ],
    "castle_gate": [
        {
            "text": "  성벽 틈새에서 갇혀있던 까마귀가 날아오른다.\n  불길한 예감이 스친다.",
            "action": None,
        },
    ],
    "harbor": [
        {
            "text": "  술 취한 선원이 비틀거리며 노래를 부른다.\n  \"바~다 위의 사나이~ 파도를 벗 삼아~\"",
            "action": None,
        },
    ],
    "elf_village": [
        {
            "text": "  엘프 아이가 나무 위에서 호기심 어린 눈으로 내려다본다.\n  \"사람이다! 진짜 사람!\"",
            "action": None,
        },
    ],
    "volcano": [
        {
            "text": "  땅이 잠깐 흔들린다. 화산이 심술을 부리는 건가.\n  발밑에서 열기가 올라온다.",
            "action": None,
        },
    ],
}

FIELD_ENCOUNTER_CHANCE = 0.25  # 이동 시 25% 확률


def _check_field_encounter(player, zone):
    """이동 중 비전투 필드 조우 이벤트 체크. 전투 인카운터와 별도."""
    if random.random() >= FIELD_ENCOUNTER_CHANCE:
        return

    # 이벤트 풀 구성: 공통 + (안전/위험) + 지역별
    pool = list(FIELD_ENCOUNTERS["common"])
    enc_chance = WORLD_CONNECTIONS.get(zone, {}).get("encounter_chance", 0)
    if enc_chance > 0:
        pool += FIELD_ENCOUNTERS["danger"]
    else:
        pool += FIELD_ENCOUNTERS["safe"]
    if zone in FIELD_ENCOUNTERS:
        pool += FIELD_ENCOUNTERS[zone]

    event = random.choice(pool)
    print()
    print(event["text"])

    action = event.get("action")
    if action == "gold_small":
        gold = random.randint(5, 20)
        player.gold += gold
        print(f"  ▶ {gold}G를 주웠다!")
    elif action == "heal_small":
        heal = random.randint(8, 20)
        player.heal(heal)
        print(f"  ▶ HP가 {heal} 회복되었다. ({player.hp}/{player.max_hp})")
    elif action == "herb":
        player.inventory.append("소형 포션")
        print("  ▶ 소형 포션을 받았다!")
    elif action == "fairy_dust":
        heal = random.randint(5, 15)
        player.heal(heal)
        print(f"  ▶ 요정의 가루로 HP가 {heal} 회복되었다.")
    elif action == "wounded_soldier":
        print("  1. 포션을 나눠준다  2. 격려만 한다")
        c = _input_choice({1, 2})
        if c == 1 and "소형 포션" in player.inventory:
            player.inventory.remove("소형 포션")
            player.dark_points = max(0, player.dark_points - 1)
            print("  병사: '고... 고맙소...'  ▶ 다크 포인트 -1")
        elif c == 1:
            print("  포션이 없다... 안타깝게도 해줄 수 있는 게 없다.")
        else:
            print("  병사에게 힘내라고 말하고 길을 재촉한다.")
    elif action == "bloody_sword":
        print("  1. 검을 주워본다  2. 무시한다")
        c = _input_choice({1, 2})
        if c == 1:
            if random.random() < 0.5:
                gold = random.randint(10, 30)
                player.gold += gold
                print(f"  칼자루 안에 금화가 숨겨져 있었다! ▶ {gold}G 획득")
            else:
                dmg = random.randint(3, 8)
                player.hp = max(1, player.hp - dmg)
                print(f"  저주가 걸린 검이었다! ▶ HP -{dmg}")
        else:
            print("  현명한 판단이다. 모르는 물건은 함부로 만지지 않는 게 좋다.")

    _pause()


def _check_random_encounter(player, location_key: str) -> str | None:
    location = WORLD_CONNECTIONS.get(location_key)
    if not location:
        return None
    chance = location.get("encounter_chance", 0.0)
    enemies = location.get("encounter_enemies", [])
    if not enemies or random.random() >= chance:
        return None

    enemy_key = random.choice(enemies)
    print(f"\n  이동 중 적이 나타났다! ({enemy_key})")
    enemy, key = spawn_enemy(enemy_key)
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)
    return None


def _travel_to(player, dest_key: str) -> str | None:
    result = _check_random_encounter(player, dest_key)
    if result == "gameover":
        return result
    _set_location(player, dest_key)
    return None


def _show_quest_status(player):
    flags = player.story_flags
    if not flags.get("forest_cleared"):
        msg = "목표: 어두운 숲을 돌파해 길을 확보하라."
    elif not (flags.get("cave_cleared") or flags.get("river_cleared") or flags.get("ruins_cleared")):
        msg = "목표: 동굴/강가/폐허 중 한 곳을 해결하라."
    elif not flags.get("bandit_camp_cleared"):
        msg = "목표: 산적 야영지를 정리하고 성으로 가는 길을 열어라."
    elif not flags.get("castle_gate_cleared"):
        msg = "목표: 마왕의 성 정문을 돌파하라."
    elif not flags.get("castle_inside_cleared"):
        msg = "목표: 성 내부를 탐색하고 최종 전투 준비를 마쳐라."
    else:
        msg = "목표: 마왕 젤드리온과 대면하라."
    print(f"  ▶ {msg}")
