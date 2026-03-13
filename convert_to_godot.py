#!/usr/bin/env python3
"""
Web → Godot 데이터 변환 스크립트
JS 상수 + YAML 이벤트 → JSON 변환
"""
import json, re, os, shutil, glob
from pathlib import Path

ROOT = Path(__file__).parent
WEB  = ROOT / "web"
OUT  = ROOT / "godot_project"

# ── 1. data.js 파싱 ─────────────────────────────────────
def parse_js_object(text, var_name):
    """JS const VAR = {...}; 를 파싱해서 Python dict로 변환"""
    # 해당 변수 찾기
    pattern = rf'(?:const|let|var)\s+{var_name}\s*=\s*'
    m = re.search(pattern, text)
    if not m:
        return None
    start = m.end()

    # 배열인지 오브젝트인지 확인
    if text[start] == '[':
        return parse_js_array_literal(text, start)
    elif text[start] == '{':
        return parse_js_object_literal(text, start)
    elif text[start] == '"' or text[start] == "'":
        # 문자열 배열일 수도
        return None
    return None

def parse_js_array_literal(text, start):
    """JS 배열 리터럴 파싱"""
    depth = 0
    i = start
    while i < len(text):
        c = text[i]
        if c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                raw = text[start:i+1]
                return json_from_js(raw)
        elif c == '/' and i+1 < len(text) and text[i+1] == '/':
            # 한줄 주석 스킵
            while i < len(text) and text[i] != '\n':
                i += 1
        elif c in ('"', "'", '`'):
            i = skip_string(text, i, c)
        i += 1
    return None

def parse_js_object_literal(text, start):
    """JS 오브젝트 리터럴 파싱"""
    depth = 0
    i = start
    while i < len(text):
        c = text[i]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                raw = text[start:i+1]
                return json_from_js(raw)
        elif c == '/' and i+1 < len(text) and text[i+1] == '/':
            while i < len(text) and text[i] != '\n':
                i += 1
        elif c in ('"', "'", '`'):
            i = skip_string(text, i, c)
        i += 1
    return None

def skip_string(text, pos, quote):
    i = pos + 1
    while i < len(text):
        if text[i] == '\\':
            i += 2
            continue
        if text[i] == quote:
            return i
        i += 1
    return i

def json_from_js(raw):
    """JS 리터럴 → JSON 파싱 가능 문자열로 변환"""
    # 한줄 주석 제거
    raw = re.sub(r'//[^\n]*', '', raw)
    # 블록 주석 제거
    raw = re.sub(r'/\*.*?\*/', '', raw, flags=re.DOTALL)
    # 키에 따옴표 추가: word: → "word":
    raw = re.sub(r'(?<=[{,\n])\s*(\w+)\s*:', r' "\1":', raw)
    # 작은 따옴표 → 큰 따옴표
    raw = re.sub(r"'([^']*)'", r'"\1"', raw)
    # trailing comma 제거
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    # true/false/null 이미 JSON 호환
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  ⚠ JSON 파싱 실패: {e}")
        # 디버그용: 파싱 실패 부분 출력
        line = raw[:e.pos].count('\n')
        print(f"    위치: line {line}, pos {e.pos}")
        print(f"    근처: ...{raw[max(0,e.pos-30):e.pos+30]}...")
        return None

def parse_js_string_array(text, var_name):
    """const VAR = ["a", "b", ...]; 파싱"""
    pattern = rf'(?:const|let|var)\s+{var_name}\s*=\s*\[(.*?)\];'
    m = re.search(pattern, text, re.DOTALL)
    if not m:
        return None
    items = re.findall(r'"([^"]*)"', m.group(1))
    return items

def parse_raw_map(text, var_name):
    """const VAR = ["...", "...", ...]; 형태의 맵 배열 파싱"""
    pattern = rf'(?:const|let|var)\s+{var_name}\s*=\s*\['
    m = re.search(pattern, text)
    if not m:
        return None
    start = m.end() - 1
    arr = parse_js_array_literal(text, start)
    return arr

# ── 2. 메인 변환 ─────────────────────────────────────
def convert_data_js():
    """data.js → game_data.json + maps/*.json"""
    js_text = (WEB / "js" / "data.js").read_text(encoding="utf-8")

    # 기본 데이터
    classes = parse_js_object(js_text, "CLASSES")
    enemy_table = parse_js_object(js_text, "ENEMY_TABLE")
    drop_table = parse_js_object(js_text, "DROP_TABLE")
    items = parse_js_object(js_text, "ITEMS")

    shop_stock = parse_js_string_array(js_text, "SHOP_STOCK")
    merc_shop = parse_js_string_array(js_text, "MERC_SHOP_STOCK")
    uw_shop = parse_js_string_array(js_text, "UW_SHOP_STOCK")
    cel_shop = parse_js_string_array(js_text, "CEL_SHOP_STOCK")

    # AREAS (복합 — 기본 + 추가)
    areas = parse_js_object(js_text, "AREAS")
    # 추가 AREAS (AREAS.xxx = {...})
    area_additions = re.findall(
        r'AREAS\.(\w+)\s*=\s*(\{.*?\});',
        js_text, re.DOTALL
    )
    for key, obj_str in area_additions:
        parsed = json_from_js(obj_str)
        if parsed and areas:
            areas[key] = parsed

    area_bg = parse_js_object(js_text, "AREA_BG_IMAGE")

    # TERRAIN, LOCATIONS
    terrain = parse_js_object(js_text, "TERRAIN")
    locations = parse_js_object(js_text, "LOCATIONS")
    terrain_uw = parse_js_object(js_text, "TERRAIN_UNDERWORLD")
    locations_uw = parse_js_object(js_text, "LOCATIONS_UNDERWORLD")
    terrain_cel = parse_js_object(js_text, "TERRAIN_CELESTIAL")
    locations_cel = parse_js_object(js_text, "LOCATIONS_CELESTIAL")

    # 맵 데이터
    raw_map = parse_raw_map(js_text, "RAW_MAP")
    raw_map_uw = parse_raw_map(js_text, "RAW_MAP_UNDERWORLD")
    raw_map_cel = parse_raw_map(js_text, "RAW_MAP_CELESTIAL")

    # game_data.json 저장
    game_data = {
        "classes": classes,
        "enemies": enemy_table,
        "drops": drop_table,
        "items": items,
        "shops": {
            "default": shop_stock,
            "mercenary": merc_shop,
            "underworld": uw_shop,
            "celestial": cel_shop,
        },
        "areas": areas,
        "area_bg_image": area_bg,
    }

    data_dir = OUT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    maps_dir = data_dir / "maps"
    maps_dir.mkdir(exist_ok=True)

    with open(data_dir / "game_data.json", "w", encoding="utf-8") as f:
        json.dump(game_data, f, ensure_ascii=False, indent=2)
    print(f"✅ game_data.json ({len(json.dumps(game_data)):,} bytes)")

    # 맵 JSON
    for name, raw, ter, loc in [
        ("mainland", raw_map, terrain, locations),
        ("underworld", raw_map_uw, terrain_uw, locations_uw),
        ("celestial", raw_map_cel, terrain_cel, locations_cel),
    ]:
        map_data = {"raw": raw, "terrain": ter, "locations": loc}
        with open(maps_dir / f"{name}.json", "w", encoding="utf-8") as f:
            json.dump(map_data, f, ensure_ascii=False, indent=2)
        if raw:
            print(f"✅ maps/{name}.json ({len(raw)} rows, {len(raw[0])} cols)")
        else:
            print(f"⚠ maps/{name}.json — raw map이 None")

    return game_data

def convert_achievements():
    """achievements.js → achievements.json (check 람다 → 선언적 조건)"""
    js_text = (WEB / "js" / "achievements.js").read_text(encoding="utf-8")

    # 수동 변환: 람다를 선언적 조건으로
    achievements = [
        # 전투
        {"id": "first_blood", "name": "첫 번째 승리", "icon": "⚔️", "desc": "첫 전투에서 승리하다", "category": "전투",
         "condition": {"stat": "battlesWon", "gte": 1}, "reward": {"gold": 20}},
        {"id": "hunter_10", "name": "사냥꾼", "icon": "🗡️", "desc": "몬스터 10마리 처치", "category": "전투",
         "condition": {"stat": "monstersKilled", "gte": 10}, "reward": {"gold": 50}},
        {"id": "hunter_50", "name": "전투의 달인", "icon": "⚔️", "desc": "몬스터 50마리 처치", "category": "전투",
         "condition": {"stat": "monstersKilled", "gte": 50}, "reward": {"gold": 150, "stat": {"attack": 2}}},
        {"id": "hunter_100", "name": "전설의 사냥꾼", "icon": "🏆", "desc": "몬스터 100마리 처치", "category": "전투",
         "condition": {"stat": "monstersKilled", "gte": 100}, "reward": {"gold": 300, "stat": {"attack": 3, "defense": 2}}},
        {"id": "critical_50", "name": "급소 달인", "icon": "💥", "desc": "치명타 50회 달성", "category": "전투",
         "condition": {"stat": "criticalHits", "gte": 50}, "reward": {"gold": 100}},
        {"id": "battles_won_30", "name": "백전노장", "icon": "🛡️", "desc": "30번 전투 승리", "category": "전투",
         "condition": {"stat": "battlesWon", "gte": 30}, "reward": {"gold": 100, "stat": {"defense": 1}}},
        {"id": "dmg_1000", "name": "파괴자", "icon": "💪", "desc": "누적 데미지 1000 달성", "category": "전투",
         "condition": {"stat": "totalDamageDealt", "gte": 1000}, "reward": {"gold": 80}},
        {"id": "dmg_5000", "name": "재앙의 화신", "icon": "🔥", "desc": "누적 데미지 5000 달성", "category": "전투",
         "condition": {"stat": "totalDamageDealt", "gte": 5000}, "reward": {"stat": {"attack": 3}}},
        # 보스
        {"id": "boss_forest", "name": "숲의 해방자", "icon": "🌲", "desc": "어두운 숲 보스 처치", "category": "전투",
         "condition": {"flag": "forest_cleared"}, "reward": {"gold": 50}},
        {"id": "boss_bandit", "name": "산적 소탕", "icon": "⚔️", "desc": "산적 야영지 보스 처치", "category": "전투",
         "condition": {"flag": "bandit_camp_cleared"}, "reward": {"gold": 80}},
        {"id": "boss_lazarus", "name": "어둠의 정복자", "icon": "👑", "desc": "라자러스 처치", "category": "전투",
         "condition": {"flag": "lazarus_defeated"}, "reward": {"gold": 500, "stat": {"attack": 5, "defense": 3, "max_hp": 30}}},
        # 탐험
        {"id": "explorer_5", "name": "초보 탐험가", "icon": "🗺️", "desc": "5개 지역 방문", "category": "탐험",
         "condition": {"visited_count_gte": 5}, "reward": {"gold": 30}},
        {"id": "explorer_10", "name": "숙련 탐험가", "icon": "🧭", "desc": "10개 지역 방문", "category": "탐험",
         "condition": {"visited_count_gte": 10}, "reward": {"gold": 80}},
        {"id": "explorer_20", "name": "세계의 방랑자", "icon": "🌍", "desc": "20개 지역 방문", "category": "탐험",
         "condition": {"visited_count_gte": 20}, "reward": {"gold": 200, "stat": {"max_hp": 20}}},
        {"id": "walker_1000", "name": "끈기의 발걸음", "icon": "👣", "desc": "1000걸음 이동", "category": "탐험",
         "condition": {"stat": "stepsWalked", "gte": 1000}, "reward": {"gold": 50}},
        {"id": "walker_5000", "name": "대지의 정복자", "icon": "🏔️", "desc": "5000걸음 이동", "category": "탐험",
         "condition": {"stat": "stepsWalked", "gte": 5000}, "reward": {"gold": 200, "stat": {"max_hp": 15}}},
        # 수집
        {"id": "rich_500", "name": "소시민", "icon": "💰", "desc": "총 500G 획득", "category": "수집",
         "condition": {"stat": "totalGoldEarned", "gte": 500}, "reward": {"gold": 30}},
        {"id": "rich_2000", "name": "부호", "icon": "💎", "desc": "총 2000G 획득", "category": "수집",
         "condition": {"stat": "totalGoldEarned", "gte": 2000}, "reward": {"gold": 100}},
        {"id": "rich_10000", "name": "황금왕", "icon": "👑", "desc": "총 10000G 획득", "category": "수집",
         "condition": {"stat": "totalGoldEarned", "gte": 10000}, "reward": {"gold": 500, "stat": {"defense": 2}}},
        {"id": "collector_10", "name": "수집가", "icon": "🎒", "desc": "아이템 10개 수집", "category": "수집",
         "condition": {"stat": "itemsCollected", "gte": 10}, "reward": {"gold": 40}},
        {"id": "collector_30", "name": "보물 사냥꾼", "icon": "💎", "desc": "아이템 30개 수집", "category": "수집",
         "condition": {"stat": "itemsCollected", "gte": 30}, "reward": {"gold": 100}},
        {"id": "potion_10", "name": "약사", "icon": "🧪", "desc": "포션 10개 사용", "category": "수집",
         "condition": {"stat": "potionsUsed", "gte": 10}, "reward": {"gold": 30}},
        # 성장
        {"id": "level_5", "name": "성장의 시작", "icon": "⭐", "desc": "Lv.5 달성", "category": "성장",
         "condition": {"level_gte": 5}, "reward": {"gold": 50}},
        {"id": "level_10", "name": "숙련자", "icon": "🌟", "desc": "Lv.10 달성", "category": "성장",
         "condition": {"level_gte": 10}, "reward": {"gold": 150, "stat": {"attack": 2, "defense": 1}}},
        {"id": "level_15", "name": "영웅의 자질", "icon": "✨", "desc": "Lv.15 달성", "category": "성장",
         "condition": {"level_gte": 15}, "reward": {"gold": 300, "stat": {"attack": 3, "defense": 2, "max_hp": 20}}},
        {"id": "level_20", "name": "전설의 영웅", "icon": "🏆", "desc": "Lv.20 달성", "category": "성장",
         "condition": {"level_gte": 20}, "reward": {"gold": 500, "stat": {"attack": 5, "defense": 3, "max_hp": 50}}},
    ]

    out = OUT / "data" / "achievements.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(achievements, f, ensure_ascii=False, indent=2)
    print(f"✅ achievements.json ({len(achievements)} achievements)")

def convert_skill_trees():
    """skill_tree.js → skill_trees.json"""
    # 직접 데이터 구성 (JS의 구조를 그대로 JSON으로)
    skill_trees = {
        "전사": {
            "branches": [
                {"name": "힘", "icon": "💪", "nodes": [
                    {"id": "w_str_1", "name": "근력 강화", "type": "passive", "cost": 1, "requires": [],
                     "desc": "공격력 +3", "effect": {"attackBonus": 3}},
                    {"id": "w_str_2", "name": "파워 스트라이크", "type": "active", "cost": 1, "requires": ["w_str_1"],
                     "desc": "2배 데미지 스킬",
                     "skill": {"name": "파워 스트라이크", "multiplier": 2.0, "desc": "전력으로 내려치는 일격 (2배 데미지)"}},
                    {"id": "w_str_3", "name": "방어 관통", "type": "passive", "cost": 2, "requires": ["w_str_2"],
                     "desc": "적 방어력 30% 무시", "effect": {"armorPiercePercent": 30}},
                    {"id": "w_str_4", "name": "분노의 일격", "type": "active", "cost": 2, "requires": ["w_str_3"],
                     "desc": "HP 낮을수록 강력 (최대 3배)",
                     "skill": {"name": "분노의 일격", "multiplier": 1.5, "hpScaling": True, "desc": "HP가 낮을수록 강력해지는 일격 (최대 3배)"}},
                ]},
                {"name": "방어", "icon": "🛡", "nodes": [
                    {"id": "w_def_1", "name": "HP 강화", "type": "passive", "cost": 1, "requires": [],
                     "desc": "최대 HP +30", "effect": {"maxHpBonus": 30}},
                    {"id": "w_def_2", "name": "철벽 방어", "type": "active", "cost": 1, "requires": ["w_def_1"],
                     "desc": "받는 데미지 70% 감소",
                     "skill": {"name": "철벽 방어", "multiplier": 0, "defensive": True, "defenseMultiplier": 0.3, "desc": "이번 턴 받는 데미지 70% 감소"}},
                    {"id": "w_def_3", "name": "반격", "type": "passive", "cost": 2, "requires": ["w_def_2"],
                     "desc": "30% 확률로 반격", "effect": {"counterChance": 30}},
                    {"id": "w_def_4", "name": "불사의 의지", "type": "passive", "cost": 2, "requires": ["w_def_3"],
                     "desc": "HP가 0이 되면 1회 생존", "effect": {"lastStand": True}},
                ]},
                {"name": "전술", "icon": "📋", "nodes": [
                    {"id": "w_tac_1", "name": "급소 포착", "type": "passive", "cost": 1, "requires": [],
                     "desc": "치명타 확률 +10%", "effect": {"critChanceBonus": 10}},
                    {"id": "w_tac_2", "name": "전쟁 함성", "type": "active", "cost": 1, "requires": ["w_tac_1"],
                     "desc": "3턴간 공격력 +50%",
                     "skill": {"name": "전쟁 함성", "multiplier": 0, "buff": {"stat": "attack", "percent": 50, "turns": 3}, "desc": "3턴간 공격력 50% 증가"}},
                    {"id": "w_tac_3", "name": "약점 간파", "type": "passive", "cost": 2, "requires": ["w_tac_2"],
                     "desc": "추가 데미지 25%", "effect": {"bonusDamagePercent": 25}},
                    {"id": "w_tac_4", "name": "회전 베기", "type": "active", "cost": 2, "requires": ["w_tac_3"],
                     "desc": "전체 적 1.2배 데미지",
                     "skill": {"name": "회전 베기", "multiplier": 1.2, "aoe": True, "desc": "모든 적에게 1.2배 데미지"}},
                ]},
            ]
        },
        "마법사": {
            "branches": [
                {"name": "마력", "icon": "🔥", "nodes": [
                    {"id": "m_pow_1", "name": "마력 증폭", "type": "passive", "cost": 1, "requires": [],
                     "desc": "공격력 +4", "effect": {"attackBonus": 4}},
                    {"id": "m_pow_2", "name": "메테오", "type": "active", "cost": 1, "requires": ["m_pow_1"],
                     "desc": "2.5배 데미지 마법",
                     "skill": {"name": "메테오", "multiplier": 2.5, "desc": "하늘에서 운석을 떨어뜨린다 (2.5배 데미지)"}},
                    {"id": "m_pow_3", "name": "마력 폭주", "type": "passive", "cost": 2, "requires": ["m_pow_2"],
                     "desc": "30% 확률 추가타", "effect": {"doubleStrikeChance": 30}},
                    {"id": "m_pow_4", "name": "연쇄 번개", "type": "active", "cost": 2, "requires": ["m_pow_3"],
                     "desc": "전체 적 1.5배 데미지",
                     "skill": {"name": "연쇄 번개", "multiplier": 1.5, "aoe": True, "desc": "번개가 모든 적을 관통한다 (전체 1.5배)"}},
                ]},
                {"name": "결계", "icon": "🔮", "nodes": [
                    {"id": "m_bar_1", "name": "생명력 강화", "type": "passive", "cost": 1, "requires": [],
                     "desc": "최대 HP +25", "effect": {"maxHpBonus": 25}},
                    {"id": "m_bar_2", "name": "마력 방벽+", "type": "active", "cost": 1, "requires": ["m_bar_1"],
                     "desc": "받는 데미지 80% 감소",
                     "skill": {"name": "마력 방벽+", "multiplier": 0, "defensive": True, "defenseMultiplier": 0.2, "desc": "강화된 마력 방벽 (데미지 80% 감소)"}},
                    {"id": "m_bar_3", "name": "회복 마법", "type": "active", "cost": 2, "requires": ["m_bar_2"],
                     "desc": "HP 20% 회복",
                     "skill": {"name": "회복 마법", "multiplier": 0, "healPercent": 20, "desc": "최대 HP의 20%를 회복"}},
                    {"id": "m_bar_4", "name": "시간 정지", "type": "active", "cost": 2, "requires": ["m_bar_3"],
                     "desc": "적 1턴 행동 불가",
                     "skill": {"name": "시간 정지", "multiplier": 0, "stun": True, "desc": "모든 적이 1턴 동안 행동 불가"}},
                ]},
                {"name": "원소", "icon": "⚡", "nodes": [
                    {"id": "m_ele_1", "name": "화상 마법", "type": "passive", "cost": 1, "requires": [],
                     "desc": "화상 확률 +15%", "effect": {"burnChanceBonus": 15}},
                    {"id": "m_ele_2", "name": "빙결", "type": "active", "cost": 1, "requires": ["m_ele_1"],
                     "desc": "적 1턴 스턴 + 1.5배",
                     "skill": {"name": "빙결", "multiplier": 1.5, "stun": True, "desc": "적을 얼려 1턴 스턴시킨다 (1.5배 데미지)"}},
                    {"id": "m_ele_3", "name": "원소 친화", "type": "passive", "cost": 2, "requires": ["m_ele_2"],
                     "desc": "스킬 데미지 +30%", "effect": {"skillDamagePercent": 30}},
                    {"id": "m_ele_4", "name": "원소 폭발", "type": "active", "cost": 2, "requires": ["m_ele_3"],
                     "desc": "전체 적 2배 데미지",
                     "skill": {"name": "원소 폭발", "multiplier": 2.0, "aoe": True, "desc": "원소의 힘으로 모든 적을 강타 (전체 2배)"}},
                ]},
            ]
        },
        "도적": {
            "branches": [
                {"name": "암살", "icon": "🗡", "nodes": [
                    {"id": "r_ass_1", "name": "급소 숙련", "type": "passive", "cost": 1, "requires": [],
                     "desc": "치명타 확률 +15%", "effect": {"critChanceBonus": 15}},
                    {"id": "r_ass_2", "name": "급소 찌르기", "type": "active", "cost": 1, "requires": ["r_ass_1"],
                     "desc": "2.5배 데미지",
                     "skill": {"name": "급소 찌르기", "multiplier": 2.5, "desc": "급소를 정확히 찌른다 (2.5배 데미지)"}},
                    {"id": "r_ass_3", "name": "암살자의 눈", "type": "passive", "cost": 2, "requires": ["r_ass_2"],
                     "desc": "치명타 확률 +20%", "effect": {"critChanceBonus": 20}},
                    {"id": "r_ass_4", "name": "그림자 일격", "type": "active", "cost": 2, "requires": ["r_ass_3"],
                     "desc": "3배 데미지 + 높은 치명타",
                     "skill": {"name": "그림자 일격", "multiplier": 3.0, "critBoost": 30, "desc": "그림자 속에서 치명적 일격 (3배 + 치명타 확률 UP)"}},
                ]},
                {"name": "독", "icon": "🧪", "nodes": [
                    {"id": "r_poi_1", "name": "독 강화", "type": "passive", "cost": 1, "requires": [],
                     "desc": "독 데미지 +50%", "effect": {"poisonDamageBonus": 50}},
                    {"id": "r_poi_2", "name": "맹독 바르기", "type": "active", "cost": 1, "requires": ["r_poi_1"],
                     "desc": "강화된 독 공격",
                     "skill": {"name": "맹독 바르기", "multiplier": 1.3, "poison": True, "poisonStrong": True, "desc": "맹독을 바른 일격 (1.3배 + 강화 독)"}},
                    {"id": "r_poi_3", "name": "독안개", "type": "active", "cost": 2, "requires": ["r_poi_2"],
                     "desc": "전체 적에게 독",
                     "skill": {"name": "독안개", "multiplier": 0.8, "aoe": True, "poison": True, "desc": "독안개로 모든 적에게 독을 퍼뜨린다 (전체 0.8배 + 독)"}},
                    {"id": "r_poi_4", "name": "치명독", "type": "passive", "cost": 2, "requires": ["r_poi_3"],
                     "desc": "5% 확률 즉사", "effect": {"instantKillChance": 5}},
                ]},
                {"name": "민첩", "icon": "💨", "nodes": [
                    {"id": "r_agi_1", "name": "회피 훈련", "type": "passive", "cost": 1, "requires": [],
                     "desc": "회피 확률 +10%", "effect": {"evadeChanceBonus": 10}},
                    {"id": "r_agi_2", "name": "연속 공격", "type": "active", "cost": 1, "requires": ["r_agi_1"],
                     "desc": "2회 연속 공격",
                     "skill": {"name": "연속 공격", "multiplier": 0.8, "hits": 2, "desc": "빠른 속도로 2회 공격 (각 0.8배)"}},
                    {"id": "r_agi_3", "name": "분신", "type": "passive", "cost": 2, "requires": ["r_agi_2"],
                     "desc": "회피 확률 +25%", "effect": {"evadeChanceBonus": 25}},
                    {"id": "r_agi_4", "name": "질풍", "type": "active", "cost": 2, "requires": ["r_agi_3"],
                     "desc": "3회 연속 공격",
                     "skill": {"name": "질풍", "multiplier": 0.7, "hits": 3, "desc": "바람처럼 3회 연속 공격 (각 0.7배)"}},
                ]},
            ]
        },
    }

    out = OUT / "data" / "skill_trees.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(skill_trees, f, ensure_ascii=False, indent=2)
    print(f"✅ skill_trees.json (3 classes)")

def convert_storylets():
    """storylets.js → storylets.json"""
    # 직접 JSON 구성 (action 구조는 동일)
    storylets = [
        {"id": "sl_merchant", "name": "수상한 행상인", "conditions": [{"level_gte": 3}],
         "locations": ["forest", "ruins", "cave"], "chance": 0.12, "repeatable": False,
         "actions": [
             {"action": "print", "text": "길가에 보따리를 펼친 수상한 행상인이 눈에 띈다."},
             {"action": "print", "text": "\"여기서 만나다니, 운이 좋군! 특별한 물건이 있다네.\""},
             {"action": "menu", "options": [
                 {"label": "물건을 살펴본다", "actions": [
                     {"action": "print", "text": "행상인이 묘한 미소와 함께 작은 병을 내민다."},
                     {"action": "if", "cond": {"gold_gte": 80}, "then": [
                         {"action": "print", "text": "\"이 비약은 80G야. 마시면 힘이 솟을걸?\""},
                         {"action": "menu", "options": [
                             {"label": "구매한다 (80G)", "actions": [
                                 {"action": "sub_gold", "amount": 80},
                                 {"action": "add_stat", "attack": 2, "message": True},
                                 {"action": "print", "text": "공격력이 영구적으로 상승했다!"},
                             ]},
                             {"label": "거절한다", "actions": [
                                 {"action": "print", "text": "\"다음에 또 보자고.\""},
                             ]},
                         ]},
                     ], "else": [
                         {"action": "print", "text": "\"하지만 자네 주머니 사정이 좀...\" 행상인이 혀를 찼다."},
                     ]},
                 ]},
                 {"label": "무시하고 지나간다", "actions": [
                     {"action": "print", "text": "의심스러운 눈빛으로 그를 지나쳤다."},
                 ]},
             ]},
         ]},
        {"id": "sl_dark_whisper", "name": "어둠의 속삭임", "conditions": [{"dark_gte": 5}],
         "locations": None, "chance": 0.1, "repeatable": False,
         "actions": [
             {"action": "print", "text": "갑자기 머릿속에 차가운 목소리가 울려퍼진다."},
             {"action": "print", "text": "\"그래... 어둠에 물들어가는 것이 느껴지는군...\""},
             {"action": "menu", "options": [
                 {"label": "어둠에 귀를 기울인다", "actions": [
                     {"action": "add_dark", "amount": 3},
                     {"action": "add_stat", "attack": 3, "message": True},
                     {"action": "print", "text": "어둠의 힘이 몸에 스며들었다. 공격력이 올라갔지만..."},
                 ]},
                 {"label": "저항한다", "actions": [
                     {"action": "sub_dark", "amount": 2},
                     {"action": "print", "text": "이를 악물고 목소리를 밀어냈다. 어둠 점수가 줄어들었다."},
                 ]},
             ]},
         ]},
        {"id": "sl_lost_diary", "name": "잃어버린 일기", "conditions": [{"has_item": "지도 조각"}],
         "locations": ["cave", "ruins"], "chance": 0.15, "repeatable": False,
         "actions": [
             {"action": "print", "text": "바닥에 낡은 일기장이 놓여 있다. 지도 조각과 같은 문양이 새겨져 있다."},
             {"action": "print", "text": "일기를 펼치니 고대 유적의 비밀이 적혀 있다."},
             {"action": "print", "text": "\"...이 땅의 마왕은 본래 인간이었으니...\""},
             {"action": "set_flag", "key": "lore_diary_found", "value": True},
             {"action": "add_item", "item": "고대의 기록"},
         ]},
        {"id": "sl_spirit_blessing", "name": "정령의 축복", "conditions": [{"flag": "elf_village_visited"}],
         "locations": ["elf_village", "moonlight_lake"], "chance": 0.1, "repeatable": False,
         "actions": [
             {"action": "print", "text": "작은 빛의 정령이 나타나 주위를 맴돈다."},
             {"action": "print", "text": "\"당신의 선한 마음을 느꼈어요. 작은 선물을 드릴게요.\""},
             {"action": "heal", "amount": "full"},
             {"action": "add_stat", "max_hp": 10, "message": True},
             {"action": "print", "text": "HP가 완전히 회복되고, 최대 HP가 영구적으로 10 증가했다!"},
         ]},
        {"id": "sl_merc_challenge", "name": "용병의 도전", "conditions": [{"level_gte": 8}],
         "locations": None, "chance": 0.08, "repeatable": False,
         "actions": [
             {"action": "print", "text": "낯선 용병이 길을 막아섰다."},
             {"action": "print", "text": "\"네가 소문난 모험가인가? 한판 붙어보지!\""},
             {"action": "menu", "options": [
                 {"label": "도전을 받아들인다", "actions": [
                     {"action": "battle", "enemy": "bandit", "on_win": [
                         {"action": "print", "text": "\"대단하군! 이걸 받아라.\""},
                         {"action": "add_gold", "amount": 120},
                         {"action": "add_item", "item": "중형 포션"},
                     ], "on_lose": [
                         {"action": "print", "text": "\"약하군... 더 강해져서 다시 오게.\""},
                         {"action": "heal", "amount": 20, "message": False},
                     ]},
                 ]},
                 {"label": "거절한다", "actions": [
                     {"action": "print", "text": "\"겁쟁이로군.\" 용병이 비웃으며 떠났다."},
                 ]},
             ]},
         ]},
        {"id": "sl_moonlight_secret", "name": "달빛 호수의 비밀", "conditions": [{"flag": "moonlight_lake_visited"}],
         "locations": ["moonlight_lake"], "chance": 0.12, "repeatable": False,
         "actions": [
             {"action": "print", "text": "달빛이 호수 위에서 유독 밝게 빛나고 있다."},
             {"action": "print", "text": "수면 아래에서 무언가 은은하게 빛나는 것이 보인다."},
             {"action": "menu", "options": [
                 {"label": "물속을 살펴본다", "actions": [
                     {"action": "print", "text": "호수 바닥에서 빛나는 보석을 발견했다!"},
                     {"action": "add_item", "item": "달빛 보석"},
                     {"action": "add_gold", "amount": 200},
                 ]},
                 {"label": "그냥 지나간다", "actions": [
                     {"action": "print", "text": "호기심을 억누르고 발걸음을 돌렸다."},
                 ]},
             ]},
         ]},
        {"id": "sl_old_warrior", "name": "노병의 가르침", "conditions": [{"level_gte": 5}],
         "locations": ["town"], "chance": 0.1, "repeatable": False,
         "actions": [
             {"action": "print", "text": "주점 한구석에서 은퇴한 노병이 술잔을 기울이고 있다."},
             {"action": "print", "text": "\"젊은이, 전투의 요령을 좀 알려주지.\""},
             {"action": "add_stat", "defense": 2, "message": True},
             {"action": "print", "text": "노병의 조언 덕분에 방어력이 상승했다!"},
         ]},
        {"id": "sl_treasure_chest", "name": "숨겨진 보물상자", "conditions": [{"level_gte": 3}],
         "locations": ["forest", "cave", "ruins", "desert"], "chance": 0.08, "repeatable": False,
         "actions": [
             {"action": "print", "text": "길 옆 수풀 사이에서 먼지 쌓인 보물상자를 발견했다!"},
             {"action": "menu", "options": [
                 {"label": "열어본다", "actions": [
                     {"action": "random", "branches": [
                         {"weight": 3, "actions": [
                             {"action": "print", "text": "상자 안에서 금화를 발견했다!"},
                             {"action": "add_gold", "amount": 60},
                         ]},
                         {"weight": 2, "actions": [
                             {"action": "print", "text": "포션이 들어있었다!"},
                             {"action": "add_item", "item": "중형 포션"},
                         ]},
                         {"weight": 1, "actions": [
                             {"action": "print", "text": "함정이었다! 작은 폭발이 일어났다!"},
                             {"action": "damage", "amount": 15},
                         ]},
                     ]},
                 ]},
                 {"label": "무시한다", "actions": [
                     {"action": "print", "text": "함정일 수 있다고 생각하고 지나쳤다."},
                 ]},
             ]},
         ]},
        {"id": "sl_fairy_ring", "name": "요정의 고리", "conditions": [],
         "locations": ["forest", "elf_village"], "chance": 0.07, "repeatable": False,
         "actions": [
             {"action": "print", "text": "버섯으로 이루어진 신비로운 원형이 나타났다."},
             {"action": "print", "text": "따뜻한 빛이 원 안에서 피어오른다."},
             {"action": "menu", "options": [
                 {"label": "원 안으로 들어간다", "actions": [
                     {"action": "heal", "amount": "full"},
                     {"action": "print", "text": "몸이 따뜻해지며 모든 상처가 치유되었다!"},
                     {"action": "set_flag", "key": "fairy_blessing", "value": True},
                 ]},
                 {"label": "조심해서 돌아간다", "actions": [
                     {"action": "print", "text": "요정의 장난일지도 모른다고 생각하며 물러섰다."},
                 ]},
             ]},
         ]},
        {"id": "sl_wounded_soldier", "name": "부상당한 병사", "conditions": [{"has_item": "소형 포션"}],
         "locations": ["town", "forest", "castle_gate"], "chance": 0.1, "repeatable": False,
         "actions": [
             {"action": "print", "text": "길가에 부상당한 병사가 쓰러져 있다."},
             {"action": "print", "text": "\"제발... 물이라도...\""},
             {"action": "menu", "options": [
                 {"label": "소형 포션을 준다", "actions": [
                     {"action": "remove_item", "item": "소형 포션"},
                     {"action": "print", "text": "\"고맙습니다... 이것은 제가 가진 것인데 받아주세요.\""},
                     {"action": "add_gold", "amount": 40},
                     {"action": "sub_dark", "amount": 1},
                     {"action": "print", "text": "선한 행동에 어둠이 조금 물러났다."},
                 ]},
                 {"label": "무시하고 지나간다", "actions": [
                     {"action": "add_dark", "amount": 1},
                     {"action": "print", "text": "병사의 신음 소리가 등 뒤에서 들려왔다."},
                 ]},
             ]},
         ]},
        {"id": "sl_herb_spot", "name": "약초 군락지", "conditions": [{"level_gte": 2}],
         "locations": ["forest", "swamp"], "chance": 0.1, "repeatable": False,
         "actions": [
             {"action": "print", "text": "무성한 풀밭 사이에서 빛나는 약초를 발견했다!"},
             {"action": "add_item", "item": "소형 포션"},
             {"action": "add_item", "item": "소형 포션"},
             {"action": "print", "text": "약초로 포션 2개를 만들었다!"},
         ]},
        {"id": "sl_dark_altar", "name": "어둠의 제단", "conditions": [{"dark_gte": 3}],
         "locations": ["ruins", "dark_tower", "castle_inside"], "chance": 0.09, "repeatable": False,
         "actions": [
             {"action": "print", "text": "금이 간 어둠의 제단이 검은 빛을 내뿜고 있다."},
             {"action": "menu", "options": [
                 {"label": "어둠에 기도한다", "actions": [
                     {"action": "add_dark", "amount": 5},
                     {"action": "add_stat", "attack": 5, "message": True},
                     {"action": "print", "text": "어둠의 힘이 급격히 흘러들어온다! 공격력이 크게 올랐지만 어둠이 깊어졌다..."},
                 ]},
                 {"label": "제단을 파괴한다", "actions": [
                     {"action": "sub_dark", "amount": 3},
                     {"action": "add_stat", "defense": 2, "message": True},
                     {"action": "print", "text": "제단을 부수자 정화의 빛이 퍼졌다. 어둠이 물러나고 방어력이 올랐다."},
                 ]},
                 {"label": "무시한다", "actions": [
                     {"action": "print", "text": "위험한 물건이라 판단하고 조용히 지나갔다."},
                 ]},
             ]},
         ]},
    ]

    out = OUT / "data" / "storylets.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(storylets, f, ensure_ascii=False, indent=2)
    print(f"✅ storylets.json ({len(storylets)} storylets)")

def convert_yaml_areas():
    """YAML area 파일 → JSON으로 변환"""
    try:
        import yaml
    except ImportError:
        print("⚠ pyyaml 없음. pip install pyyaml 후 재실행")
        return

    yaml_dir = WEB / "data" / "areas"
    json_dir = OUT / "data" / "areas"
    json_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for yf in sorted(yaml_dir.glob("*.yaml")):
        with open(yf, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        with open(json_dir / f"{yf.stem}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        count += 1

    print(f"✅ areas/ — {count}개 YAML → JSON 변환")

def convert_enemy_behavior():
    """combat.js의 ENEMY_BEHAVIOR → enemy_behavior.json"""
    behavior = {
        "goblin": {"intros": ["수풀 사이에서 고블린이 비열하게 웃었다!", "고블린이 녹슨 칼을 휘두르며 달려든다!"], "style": "trickster", "evadeChance": 0.08},
        "wolf": {"intros": ["늑대가 낮게 으르렁거리며 원을 그린다.", "굶주린 늑대가 송곳니를 드러냈다!"], "style": "beast", "multiHitChance": 0.22},
        "bandit": {"intros": ["산적 두목이 칼끝을 겨누며 도발한다.", "산적이 비열한 미소와 함께 달려든다!"], "style": "trickster", "evadeChance": 0.1},
        "dark_mage": {"intros": ["암흑 마법사가 검은 마력을 모은다.", "암흑 마법사의 눈동자가 보랏빛으로 번뜩인다."], "style": "caster", "skillChance": 0.35},
        "vampire": {"intros": ["뱀파이어가 붉은 눈으로 피를 갈망한다.", "차가운 웃음과 함께 뱀파이어가 날개를 펼친다."], "style": "drain"},
        "swamp_snake": {"intros": ["독사가 혀를 날름거리며 노린다.", "축축한 늪 위에서 독사가 튀어나왔다!"], "style": "poisoner", "poisonChance": 0.35},
        "swamp_witch": {"intros": ["늪지 마녀가 저주를 중얼거린다.", "마녀의 지팡이 끝에서 독안개가 피어오른다."], "style": "poisoner", "poisonChance": 0.3},
        "sand_scorpion": {"intros": ["사막 전갈이 집게를 부딪치며 다가온다.", "모래를 가르며 사막 전갈이 돌진한다!"], "style": "poisoner", "poisonChance": 0.3},
        "ice_golem": {"intros": ["얼음 골렘이 둔중한 몸을 일으킨다.", "서리 입자가 흩날리며 얼음 골렘이 다가온다."], "style": "tank", "guardChance": 0.25},
        "frost_wyrm": {"intros": ["서리 비룡이 냉기를 토해낸다!", "비룡의 날갯짓에 혹한의 바람이 몰아친다."], "style": "breath", "breathChance": 0.3},
        "fire_elemental": {"intros": ["화염 정령이 이글거리며 요동친다.", "불꽃 소용돌이 속에서 화염 정령이 떠오른다."], "style": "burner", "burnChance": 0.32},
        "lava_drake": {"intros": ["용암 드레이크가 뜨거운 숨을 내뿜는다.", "대지를 녹이며 드레이크가 포효한다!"], "style": "breath", "burnChance": 0.25, "breathChance": 0.28},
        "dragon_whelp": {"intros": ["새끼 드래곤이 날개를 퍼덕이며 불꽃을 튄다.", "작지만 사나운 드래곤이 송곳니를 드러냈다!"], "style": "breath", "breathChance": 0.22},
        "dragon": {"intros": ["드래곤이 하늘을 가르며 강림했다!", "거대한 용의 포효가 전장을 뒤흔든다!"], "style": "boss_breath", "breathChance": 0.35},
        "shadow_knight": {"intros": ["그림자 기사가 검은 검을 겨눈다.", "어둠 속에서 그림자 기사가 모습을 드러냈다."], "style": "duelist", "evadeChance": 0.12},
        "dark_sentinel": {"intros": ["어둠의 파수꾼이 무거운 방패를 들었다.", "침묵의 파수꾼이 길을 막아선다."], "style": "tank", "guardChance": 0.3},
        "shadow_lazarus": {"intros": ["그림자 라자러스가 냉소와 함께 검을 뽑는다.", "라자러스: \"여기까지 왔군. 후회하게 해주지.\""], "style": "boss_mix", "breathChance": 0.2, "guardChance": 0.2, "evadeChance": 0.1},
    }

    out = OUT / "data" / "enemy_behavior.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(behavior, f, ensure_ascii=False, indent=2)
    print(f"✅ enemy_behavior.json ({len(behavior)} enemies)")

def copy_assets():
    """이미지 에셋 복사"""
    asset_map = [
        (WEB / "tile_image", OUT / "assets" / "tiles"),
        (WEB / "monster_image", OUT / "assets" / "monsters"),
        (WEB / "char_image", OUT / "assets" / "characters"),
        (WEB / "bg_image", OUT / "assets" / "backgrounds"),
    ]

    total = 0
    for src, dst in asset_map:
        dst.mkdir(parents=True, exist_ok=True)
        if not src.exists():
            print(f"  ⚠ {src} 없음, 스킵")
            continue
        count = 0
        for f in src.glob("*.webp"):
            shutil.copy2(f, dst / f.name)
            count += 1
        for f in src.glob("*.png"):
            shutil.copy2(f, dst / f.name)
            count += 1
        total += count
        print(f"  📁 {src.name}/ → {dst.relative_to(OUT)} ({count}개)")

    print(f"✅ 에셋 복사 완료: {total}개")

# ── MAIN ─────────────────────────────────────
def main():
    print("=" * 50)
    print("  Web → Godot 데이터 변환")
    print("=" * 50)

    # 디렉토리 생성
    for d in ["data", "data/areas", "data/maps", "assets/tiles", "assets/monsters",
              "assets/characters", "assets/backgrounds", "assets/fonts",
              "scripts/autoload", "scripts/ui", "scripts/field",
              "scenes/screens", "scenes/ui", "themes"]:
        (OUT / d).mkdir(parents=True, exist_ok=True)

    print("\n── 데이터 변환 ──")
    convert_data_js()
    convert_achievements()
    convert_skill_trees()
    convert_storylets()
    convert_enemy_behavior()
    convert_yaml_areas()

    print("\n── 에셋 복사 ──")
    copy_assets()

    print("\n✅ 모든 변환 완료!")

if __name__ == "__main__":
    main()
