"""YAML 기반 이벤트 엔진

YAML 파일에 정의된 스토리 이벤트를 해석·실행한다.
data/areas/*.yaml 파일을 읽어 지역 이벤트를 자동 등록한다.
"""

import os
import random
import yaml

from story_utils import _set_location, _input_choice, _divider, _pause, game_over
from combat import battle, spawn_enemy
from inventory import open_shop, open_merc_shop, show_inventory, equip_item


DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "areas")


# ═══════════════════════════════════════════════════════
#  텍스트 포매팅
# ═══════════════════════════════════════════════════════

def _format_text(text: str, player) -> str:
    """텍스트 안의 {player.xxx} 변수를 치환한다."""
    return text.format(player=player)


# ═══════════════════════════════════════════════════════
#  조건 판정
# ═══════════════════════════════════════════════════════

def _check_condition(cond, player) -> bool:
    """단일 조건 또는 조건 리스트를 평가한다.

    지원 조건:
      flag: "key"                 → story_flags[key] == True
      not_flag: "key"             → story_flags[key] != True
      any_flag: ["a", "b"]        → 하나라도 True
      all_flags: ["a", "b"]       → 전부 True
      has_item: "아이템명"         → 인벤토리에 보유
      not_has_item: "아이템명"     → 인벤토리에 미보유
      equipped_weapon: "무기명"    → 장착 무기 확인
      gold_gte: N                 → gold >= N
      gold_lt: N                  → gold < N
      dark_gte: N                 → dark_points >= N
      dark_lt: N                  → dark_points < N
      dark_lte: N                 → dark_points <= N
      hp_lte: N                   → hp <= N
      level_gte: N                → level >= N
      random_lt: 0.3              → random() < 0.3  (30% 확률)
    """
    if cond is None:
        return True
    if isinstance(cond, list):
        return all(_check_condition(c, player) for c in cond)

    flags = getattr(player, "story_flags", {})

    if "flag" in cond:
        return bool(flags.get(cond["flag"], False))
    if "not_flag" in cond:
        return not flags.get(cond["not_flag"], False)
    if "any_flag" in cond:
        return any(flags.get(f, False) for f in cond["any_flag"])
    if "all_flags" in cond:
        return all(flags.get(f, False) for f in cond["all_flags"])
    if "has_item" in cond:
        return cond["has_item"] in player.inventory
    if "not_has_item" in cond:
        return cond["not_has_item"] not in player.inventory
    if "equipped_weapon" in cond:
        w = player.equipped_weapon
        return w and w.get("name") == cond["equipped_weapon"]
    if "gold_gte" in cond:
        return player.gold >= cond["gold_gte"]
    if "gold_lt" in cond:
        return player.gold < cond["gold_lt"]
    if "dark_gte" in cond:
        return player.dark_points >= cond["dark_gte"]
    if "dark_lt" in cond:
        return player.dark_points < cond["dark_lt"]
    if "dark_lte" in cond:
        return player.dark_points <= cond["dark_lte"]
    if "hp_lte" in cond:
        return player.hp <= cond["hp_lte"]
    if "level_gte" in cond:
        return player.level >= cond["level_gte"]
    if "random_lt" in cond:
        return random.random() < cond["random_lt"]

    return True


# ═══════════════════════════════════════════════════════
#  액션 실행기
# ═══════════════════════════════════════════════════════

def _run_actions(actions: list, player, scenes: dict) -> str | None:
    """액션 리스트를 순차 실행. 엔딩 문자열을 반환하면 즉시 전파."""
    if not actions:
        return None
    for action in actions:
        result = _run_action(action, player, scenes)
        if result is not None:
            return result
    return None


def _run_action(action: dict, player, scenes: dict) -> str | None:
    """단일 액션을 실행한다."""
    act = action.get("action", action.get("type", ""))

    # ─── 텍스트 ───
    if act == "print":
        text = _format_text(action["text"], player)
        print(text)
        return None

    if act == "divider":
        _divider(action.get("title", ""))
        return None

    if act == "pause":
        _pause()
        return None

    # ─── 플래그 ───
    if act == "set_flag":
        val = action.get("value", True)
        player.story_flags[action["key"]] = val
        return None

    # ─── 아이템 ───
    if act == "add_item":
        item = action["item"]
        count = action.get("count", 1)
        for _ in range(count):
            player.inventory.append(item)
        if action.get("message", True):
            print(f"  ▶ {item} x{count}을(를) 획득했습니다!")
        return None

    if act == "remove_item":
        item = action["item"]
        if item in player.inventory:
            player.inventory.remove(item)
        return None

    # ─── 골드 ───
    if act == "add_gold":
        amt = action["amount"]
        player.gold += amt
        if action.get("message", True):
            print(f"  ▶ {amt}G 획득!")
        return None

    if act == "sub_gold":
        amt = action["amount"]
        player.gold = max(0, player.gold - amt)
        if action.get("message", True):
            print(f"  ▶ {amt}G 소비!")
        return None

    # ─── 스탯 ───
    if act == "heal":
        amt = action.get("amount")
        if amt == "full" or amt is None:
            player.hp = player.max_hp
        else:
            player.heal(amt)
        if action.get("message", True):
            print(f"  ▶ HP가 회복되었습니다! ({player.hp}/{player.max_hp})")
        return None

    if act == "damage":
        amt = action["amount"]
        player.hp = max(1, player.hp - amt)
        if action.get("message", True):
            print(f"  ▶ {amt}의 피해를 입었습니다! (HP: {player.hp})")
        return None

    if act == "add_stat":
        for stat_name in ("attack", "defense", "max_hp"):
            if stat_name in action:
                cur = getattr(player, stat_name)
                setattr(player, stat_name, cur + action[stat_name])
                if action.get("message", True):
                    print(f"  ▶ {stat_name} +{action[stat_name]}!")
        return None

    if act == "set_stat":
        for stat_name in ("attack", "defense", "max_hp", "hp"):
            if stat_name in action:
                setattr(player, stat_name, action[stat_name])
        return None

    # ─── 어둠 점수 ───
    if act == "add_dark":
        amt = action.get("amount", 1)
        player.dark_points += amt
        if action.get("message", True):
            print(f"  ▶ 어둠 점수 +{amt}")
        return None

    if act == "sub_dark":
        amt = action.get("amount", 1)
        player.dark_points = max(0, player.dark_points - amt)
        if action.get("message", True):
            print(f"  ▶ 어둠 점수 -{amt}")
        return None

    if act == "set_dark":
        player.dark_points = action["amount"]
        return None

    # ─── 전투 ───
    if act == "battle":
        enemy_key = action["enemy"]
        enemy, key = spawn_enemy(enemy_key)
        if "name" in action:
            enemy.name = action["name"]
        if "hp_multiply" in action:
            enemy.hp = int(enemy.hp * action["hp_multiply"])
            enemy.max_hp = enemy.hp
        if "hp_add" in action:
            enemy.hp += action["hp_add"]
            enemy.max_hp = enemy.hp
        result = battle(player, enemy, key)
        if result == "lose":
            on_lose = action.get("on_lose", [{"action": "game_over"}])
            return _run_actions(on_lose, player, scenes)
        on_win = action.get("on_win", [])
        return _run_actions(on_win, player, scenes)

    # ─── 상점 ───
    if act == "open_shop":
        open_shop(player)
        return None

    if act == "open_merc_shop":
        open_merc_shop(player)
        return None

    # ─── 인벤토리/상태 ───
    if act == "show_inventory":
        show_inventory(player)
        return None

    if act == "equip_item":
        equip_item(player)
        return None

    if act == "show_status":
        player.full_status()
        return None

    # ─── 위치 ───
    if act == "set_location":
        _set_location(player, action["zone"])
        return None

    # ─── 지도 ───
    if act == "show_map":
        from map import show_world_map, show_castle_map
        kind = action.get("kind", "world")
        if kind == "castle":
            explored = action.get("explored")
            show_castle_map(player, explored)
        else:
            show_world_map(player)
        return None

    # ─── 저장 ───
    if act == "save":
        from save_manager import prompt_save
        location = action.get("location", "아르카디아 성당")
        prompt_save(player, location)
        return None

    # ─── 게임 오버 ───
    if act == "game_over":
        return game_over(player)

    # ─── 반환 (엔딩 등) ───
    if act == "return":
        return action["value"]

    # ─── 선택지 메뉴 ───
    if act == "menu":
        return _run_menu(action, player, scenes)

    # ─── 조건 분기 ───
    if act == "if":
        if _check_condition(action["cond"], player):
            return _run_actions(action.get("then", []), player, scenes)
        else:
            return _run_actions(action.get("else", []), player, scenes)

    # ─── 랜덤 분기 ───
    if act == "random":
        return _run_random(action, player, scenes)

    # ─── 씬 이동 ───
    if act == "goto":
        scene_name = action["scene"]
        scene = scenes.get(scene_name)
        if scene:
            return _run_scene(scene, player, scenes)
        return None

    # ─── 반복 ───
    if act == "loop":
        while True:
            result = _run_actions(action.get("body", []), player, scenes)
            if result is not None:
                if result == "__break__":
                    return None
                return result

    if act == "break":
        return "__break__"

    return None


# ═══════════════════════════════════════════════════════
#  메뉴 (선택지)
# ═══════════════════════════════════════════════════════

def _run_menu(action: dict, player, scenes: dict) -> str | None:
    """조건부 동적 메뉴를 실행한다."""
    options_def = action.get("options", [])

    visible = []
    for opt in options_def:
        cond = opt.get("when")
        if cond is not None and not _check_condition(cond, player):
            continue
        visible.append(opt)

    if not visible:
        return None

    for i, opt in enumerate(visible, 1):
        print(f"  {i}. {_format_text(opt['label'], player)}")

    choice = _input_choice(set(range(1, len(visible) + 1)))
    chosen = visible[choice - 1]

    if "goto" in chosen:
        scene = scenes.get(chosen["goto"])
        if scene:
            return _run_scene(scene, player, scenes)
        return None

    return _run_actions(chosen.get("actions", []), player, scenes)


# ═══════════════════════════════════════════════════════
#  랜덤 분기
# ═══════════════════════════════════════════════════════

def _run_random(action: dict, player, scenes: dict) -> str | None:
    branches = action.get("branches", [])
    if not branches:
        return None

    weights = [b.get("weight", 1.0) for b in branches]
    total = sum(weights)
    r = random.random() * total
    cumulative = 0.0
    for branch in branches:
        cumulative += branch.get("weight", 1.0)
        if r < cumulative:
            return _run_actions(branch.get("actions", []), player, scenes)
    return _run_actions(branches[-1].get("actions", []), player, scenes)


# ═══════════════════════════════════════════════════════
#  씬 실행
# ═══════════════════════════════════════════════════════

def _run_scene(scene: dict, player, scenes: dict) -> str | None:
    """씬(scene) 하나를 실행한다. 씬 = 액션 리스트 또는 딕셔너리."""
    if isinstance(scene, list):
        return _run_actions(scene, player, scenes)
    actions = scene.get("actions", [])
    return _run_actions(actions, player, scenes)


# ═══════════════════════════════════════════════════════
#  YAML 파일 로드 + 실행
# ═══════════════════════════════════════════════════════

def load_yaml_event(filepath: str) -> dict:
    """YAML 이벤트 파일을 로드한다."""
    with open(filepath, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def run_yaml_event(player, zone: str) -> str | None:
    """data/areas/{zone}.yaml를 로드하여 실행한다."""
    filepath = os.path.join(DATA_DIR, f"{zone}.yaml")
    if not os.path.exists(filepath):
        return None

    data = load_yaml_event(filepath)
    event = data.get(zone, data)

    scenes = event.get("scenes", {})
    main_actions = event.get("actions", [])

    return _run_actions(main_actions, player, scenes)


# ═══════════════════════════════════════════════════════
#  자동 등록 (area_registry 연동)
# ═══════════════════════════════════════════════════════

def register_yaml_events():
    """data/areas/ 내 모든 YAML 파일을 스캔하여 이벤트를 자동 등록한다."""
    from area_registry import register_event

    if not os.path.isdir(DATA_DIR):
        return

    for filename in os.listdir(DATA_DIR):
        if not filename.endswith((".yaml", ".yml")):
            continue
        zone = filename.rsplit(".", 1)[0]

        def make_handler(z):
            def handler(player):
                return run_yaml_event(player, z)
            return handler

        register_event(zone, make_handler(zone))
