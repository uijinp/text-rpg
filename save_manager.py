"""세이브/로드 시스템"""

import json
import os
import datetime

SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saves")
MAX_SLOTS = 3


def _ensure_dir():
    os.makedirs(SAVE_DIR, exist_ok=True)


def _slot_path(slot: int) -> str:
    return os.path.join(SAVE_DIR, f"slot_{slot}.json")


# ─── 직렬화 ────────────────────────────────────────────

def player_to_dict(player) -> dict:
    return {
        "name": player.name,
        "job": player.job,
        "level": player.level,
        "exp": player.exp,
        "exp_to_next": player.exp_to_next,
        "max_hp": player.max_hp,
        "hp": player.hp,
        "attack": player.attack,
        "defense": player.defense,
        "gold": player.gold,
        "inventory": list(player.inventory),
        "equipped_weapon": player.equipped_weapon,
        "equipped_armor": player.equipped_armor,
        "story_flags": dict(getattr(player, "story_flags", {})),
        "dark_points": getattr(player, "dark_points", 0),
        "current_location": getattr(player, "current_location", "town"),
        "visited_locations": list(getattr(player, "visited_locations", set())),
        "_shop_visited": getattr(player, "_shop_visited", False),
        "poisoned": getattr(player, "poisoned", False),
    }


def dict_to_player(data: dict):
    from character import Player
    player = Player(
        name=data["name"],
        job=data["job"],
        hp=data["max_hp"],
        attack=data["attack"],
        defense=data["defense"],
    )
    player.level = data["level"]
    player.exp = data["exp"]
    player.exp_to_next = data["exp_to_next"]
    player.max_hp = data["max_hp"]
    player.hp = data["hp"]
    player.gold = data["gold"]
    player.inventory = list(data["inventory"])
    player.equipped_weapon = data.get("equipped_weapon")
    player.equipped_armor = data.get("equipped_armor")
    player.story_flags = data.get("story_flags", {})
    player.dark_points = data.get("dark_points", 0)
    player.current_location = data.get("current_location", "town")
    player.visited_locations = set(data.get("visited_locations", []))
    player._shop_visited = data.get("_shop_visited", False)
    player.poisoned = data.get("poisoned", False)
    return player


# ─── 저장/불러오기 ─────────────────────────────────────

def save_game(player, slot: int, location_name: str = "아르카디아 성당") -> bool:
    try:
        _ensure_dir()
        data = player_to_dict(player)
        data["saved_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        data["location_name"] = location_name
        with open(_slot_path(slot), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"  [오류] 저장 실패: {e}")
        return False


def load_game(slot: int):
    path = _slot_path(slot)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return dict_to_player(data)
    except Exception as e:
        print(f"  [오류] 불러오기 실패: {e}")
        return None


def get_save_info(slot: int):
    """슬롯 정보만 반환 (Player 생성 없이)"""
    path = _slot_path(slot)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "name": data.get("name", "???"),
            "job": data.get("job", "???"),
            "level": data.get("level", 1),
            "location_name": data.get("location_name", "아르카디아 성당"),
            "saved_at": data.get("saved_at", ""),
        }
    except Exception:
        return None


def list_saves():
    """(slot, info_or_None) 리스트 반환 (슬롯 1~MAX_SLOTS)"""
    return [(s, get_save_info(s)) for s in range(1, MAX_SLOTS + 1)]


def has_any_save() -> bool:
    return any(get_save_info(s) is not None for s in range(1, MAX_SLOTS + 1))


# ─── UI 헬퍼 ──────────────────────────────────────────

def show_save_list(title: str = "세이브 파일"):
    saves = list_saves()
    print(f"\n  ── {title} ──")
    for slot, info in saves:
        if info:
            print(
                f"  {slot}. {info['name']} ({info['job']})  Lv.{info['level']}"
                f"  [{info['location_name']}]  {info['saved_at']}"
            )
        else:
            print(f"  {slot}. (비어 있음)")
    print("  0. 취소")
    return saves


def select_slot(prompt: str = "슬롯 선택") -> int:
    """슬롯 번호 입력, 0=취소"""
    while True:
        try:
            c = int(input(f"  {prompt} (0~{MAX_SLOTS}): ").strip())
            if 0 <= c <= MAX_SLOTS:
                return c
        except ValueError:
            pass
        print(f"  0~{MAX_SLOTS} 사이의 숫자를 입력하세요.")


def prompt_save(player, location_name: str = "아르카디아 성당"):
    """저장 슬롯 선택 → 저장 실행 UI"""
    show_save_list("저장 슬롯")
    slot = select_slot("저장할 슬롯")
    if slot == 0:
        return False
    info = get_save_info(slot)
    if info:
        print(f"\n  슬롯 {slot}: {info['name']} ({info['job']}) Lv.{info['level']} - 덮어쓰시겠습니까?")
        confirm = input("  (y/n): ").strip().lower()
        if confirm != "y":
            return False
    ok = save_game(player, slot, location_name)
    if ok:
        print(f"  ✦ 슬롯 {slot}에 저장했습니다.")
    return ok


def prompt_load() -> "Player | None":
    """로드 슬롯 선택 → Player 반환 UI, 취소 시 None"""
    show_save_list("불러올 세이브")
    slot = select_slot("불러올 슬롯")
    if slot == 0:
        return None
    info = get_save_info(slot)
    if not info:
        print("  해당 슬롯에 저장 데이터가 없습니다.")
        return None
    player = load_game(slot)
    if player:
        # 이어서 하면 항상 아르카디아 성당 앞(town)에서 시작
        player.current_location = "town"
        print(f"\n  ✦ [{info['name']} / {info['job']} / Lv.{info['level']}] 불러오기 완료!")
        print("  아르카디아 성당 앞에서 모험을 이어갑니다.\n")
    return player
