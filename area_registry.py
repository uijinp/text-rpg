"""지역 등록소 - 새 지역 추가 시 이 파일만 수정하면 됨

새 지역 추가 체크리스트:
  1. AREAS 딕셔너리에 지역 정보 추가
  2. RAW_MAP 에 타일 배치
  3. story_area.py 또는 story_area_ext.py 에 이벤트 함수 작성
  4. register_event() 로 이벤트 함수 등록
  - 끝! 다른 파일 수정 불필요
"""


# ═══════════════════════════════════════════════════════
#  지역 정의 (한 곳에서 모든 정보를 관리)
# ═══════════════════════════════════════════════════════
#
# 각 키는 zone 이름 (예: "town", "forest")
# 필드 설명:
#   name            : 표시 이름
#   tile_char       : 지형 타일 문자 (소문자, RAW_MAP에서 영역 채움)
#   tile_display    : 타일 렌더링 문자 (2글자)
#   tile_passable   : 타일 통행 가능 여부
#   loc_char        : 로케이션 마커 문자 (대문자, RAW_MAP에서 중심점) / None이면 로케이션 없음
#   loc_display     : 로케이션 표시 문자 (1글자 한글)
#   encounter_chance: 이동 시 전투 확률 (0.0 ~ 1.0)
#   encounter_enemies: 출현 가능 적 키 리스트
#   desc            : 필드 화면에 보이는 분위기 설명
#   unlock_condition: 잠금 해제 조건 (None이면 항상 열림)
#                     - {"flag": "forest_cleared"}  ← 단일 플래그 확인
#                     - {"any_flag": ["cave_cleared", "river_cleared", "ruins_cleared"]}  ← 하나라도 True면 해제
#                     - {"flag": "desert_explored"} 등
#   lock_hint       : 잠겨있을 때 표시할 힌트 메시지
#   init_flags      : 게임 시작 시 초기화할 story_flags (dict)
#

AREAS = {
    # ═══════════════════════════════════════════════════
    #  기본 지역
    # ═══════════════════════════════════════════════════
    "town": {
        "name": "아르카디아",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "T",
        "loc_display": "마",
        "encounter_chance": 0.0,
        "encounter_enemies": [],
        "desc": "아르카디아 마을의 따뜻한 거리. 사람들이 분주히 오간다.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {"town_event_done": False},
    },
    "forest": {
        "name": "어두운 숲",
        "tile_char": "f",
        "tile_display": "♣ ",
        "tile_passable": True,
        "loc_char": "F",
        "loc_display": "숲",
        "encounter_chance": 0.35,
        "encounter_enemies": ["goblin", "wolf"],
        "desc": "어둠이 짙은 숲. 나뭇잎 사이로 기묘한 울음소리가 들린다.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {"forest_cleared": False},
    },
    "cave": {
        "name": "몬스터 동굴",
        "tile_char": "c",
        "tile_display": "▓ ",
        "tile_passable": True,
        "loc_char": "C",
        "loc_display": "굴",
        "encounter_chance": 0.40,
        "encounter_enemies": ["skeleton", "dark_mage"],
        "desc": "음침한 동굴 입구. 찬바람이 불어온다.",
        "unlock_condition": {"flag": "forest_cleared"},
        "lock_hint": "숲을 먼저 정리해야 동굴로 진입할 수 있습니다.",
        "init_flags": {"cave_cleared": False},
    },
    "river": {
        "name": "안개 강가",
        "tile_char": "r",
        "tile_display": "≈ ",
        "tile_passable": True,
        "loc_char": "R",
        "loc_display": "강",
        "encounter_chance": 0.20,
        "encounter_enemies": ["wolf", "bandit"],
        "desc": "안개가 자욱한 강가. 물소리만 고요히 흐른다.",
        "unlock_condition": {"flag": "forest_cleared"},
        "lock_hint": "숲을 먼저 정리해야 강가로 진입할 수 있습니다.",
        "init_flags": {"river_cleared": False},
    },
    "ruins": {
        "name": "저주받은 폐허",
        "tile_char": "u",
        "tile_display": "† ",
        "tile_passable": True,
        "loc_char": "U",
        "loc_display": "허",
        "encounter_chance": 0.45,
        "encounter_enemies": ["skeleton", "vampire"],
        "desc": "무너진 폐허. 뼈대만 남은 건물 사이로 바람이 분다.",
        "unlock_condition": {"flag": "forest_cleared"},
        "lock_hint": "숲을 먼저 정리해야 폐허로 진입할 수 있습니다.",
        "init_flags": {"ruins_cleared": False},
    },
    "bandit_camp": {
        "name": "산적 야영지",
        "tile_char": "b",
        "tile_display": "░ ",
        "tile_passable": True,
        "loc_char": "B",
        "loc_display": "적",
        "encounter_chance": 0.25,
        "encounter_enemies": ["bandit", "orc"],
        "desc": "산적들의 야영지 흔적이 곳곳에 남아있다.",
        "unlock_condition": {"any_flag": ["cave_cleared", "river_cleared", "ruins_cleared"]},
        "lock_hint": "동굴/강가/폐허 중 한 곳을 먼저 해결하세요.",
        "init_flags": {"bandit_camp_cleared": False},
    },
    "castle_gate": {
        "name": "마왕의 성 정문",
        "tile_char": "g",
        "tile_display": "▒ ",
        "tile_passable": True,
        "loc_char": "G",
        "loc_display": "문",
        "encounter_chance": 0.50,
        "encounter_enemies": ["undead_knight"],
        "desc": "거대한 검은 성벽이 앞을 가로막고 있다.",
        "unlock_condition": {"flag": "bandit_camp_cleared"},
        "lock_hint": "산적 야영지 문제를 해결해야 성문이 열립니다.",
        "init_flags": {"castle_gate_cleared": False},
    },
    "castle_inside": {
        "name": "성 내부",
        "tile_char": "i",
        "tile_display": "▓ ",
        "tile_passable": True,
        "loc_char": "I",
        "loc_display": "내",
        "encounter_chance": 0.30,
        "encounter_enemies": ["undead_knight", "dark_mage"],
        "desc": "차가운 성 복도. 갑옷 소리가 멀리서 울린다.",
        "unlock_condition": {"flag": "castle_gate_cleared"},
        "lock_hint": "성문 방어를 돌파해야 성 내부로 들어갈 수 있습니다.",
        "init_flags": {"castle_inside_cleared": False},
    },
    "throne": {
        "name": "마왕의 방",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "K",
        "loc_display": "왕",
        "encounter_chance": 0.0,
        "encounter_enemies": [],
        "desc": "거대한 왕좌의 방. 어둠의 기운이 소용돌이친다.",
        "unlock_condition": {"flag": "castle_inside_cleared"},
        "lock_hint": "성 내부 주요 구역을 정리해야 마왕의 방으로 갈 수 있습니다.",
        "init_flags": {},
    },

    # ═══════════════════════════════════════════════════
    #  신규 지역
    # ═══════════════════════════════════════════════════
    "harbor": {
        "name": "포구 마을",
        "tile_char": "a",
        "tile_display": "~ ",
        "tile_passable": True,
        "loc_char": "H",
        "loc_display": "항",
        "encounter_chance": 0.0,
        "encounter_enemies": [],
        "desc": "파도 소리와 갈매기 울음. 소금기 머금은 바닷바람.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {},
    },
    "desert": {
        "name": "사하르 사막",
        "tile_char": "d",
        "tile_display": "⁘ ",
        "tile_passable": True,
        "loc_char": None,
        "loc_display": None,
        "encounter_chance": 0.30,
        "encounter_enemies": ["sand_scorpion", "bandit"],
        "desc": "뜨거운 모래바람이 시야를 가린다.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {},
    },
    "desert_town": {
        "name": "사하르 마을",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "D",
        "loc_display": "사",
        "encounter_chance": 0.0,
        "encounter_enemies": [],
        "desc": "사하르 마을. 이국적인 향신료 냄새가 풍긴다.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {},
    },
    "pyramid": {
        "name": "파라오의 피라미드",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "P",
        "loc_display": "피",
        "encounter_chance": 0.50,
        "encounter_enemies": ["mummy", "skeleton"],
        "desc": "모래 속에서 솟아오른 거대한 피라미드.",
        "unlock_condition": {"flag": "desert_explored"},
        "lock_hint": "사하르 마을을 먼저 탐색해야 피라미드에 진입할 수 있습니다.",
        "init_flags": {"pyramid_cleared": False},
    },
    "oasis": {
        "name": "오아시스",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "O",
        "loc_display": "오",
        "encounter_chance": 0.0,
        "encounter_enemies": [],
        "desc": "사막의 오아시스. 시원한 물과 야자수가 반긴다.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {},
    },
    "swamp": {
        "name": "독안개 늪",
        "tile_char": "n",
        "tile_display": "¤ ",
        "tile_passable": True,
        "loc_char": "W",
        "loc_display": "늪",
        "encounter_chance": 0.40,
        "encounter_enemies": ["swamp_snake", "swamp_witch"],
        "desc": "독안개가 피어오르는 끈적한 늪지대.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {},
    },
    "ice": {
        "name": "빙하 지대",
        "tile_char": "x",
        "tile_display": "* ",
        "tile_passable": True,
        "loc_char": None,
        "loc_display": None,
        "encounter_chance": 0.35,
        "encounter_enemies": ["ice_golem", "undead_knight"],
        "desc": "얼어붙은 빙하 지대. 발밑이 미끄럽다.",
        "unlock_condition": {"flag": "castle_gate_cleared"},
        "lock_hint": "마왕의 성 정문을 돌파해야 빙하 지대에 진입할 수 있습니다.",
        "init_flags": {},
    },
    "ice_cave": {
        "name": "빙하 동굴",
        "tile_char": None,
        "tile_display": None,
        "tile_passable": True,
        "loc_char": "L",
        "loc_display": "빙",
        "encounter_chance": 0.45,
        "encounter_enemies": ["ice_golem", "frost_wyrm"],
        "desc": "빙하 동굴. 얼음 기둥 사이로 차가운 빛이 감돈다.",
        "unlock_condition": {"flag": "castle_gate_cleared"},
        "lock_hint": "마왕의 성 정문을 돌파해야 빙하 동굴에 진입할 수 있습니다.",
        "init_flags": {},
    },

    # ═══════════════════════════════════════════════════
    #  확장 지역
    # ═══════════════════════════════════════════════════
    "elf_village": {
        "name": "엘프 마을",
        "tile_char": "e",
        "tile_display": "♠ ",
        "tile_passable": True,
        "loc_char": "E",
        "loc_display": "엘",
        "encounter_chance": 0.15,
        "encounter_enemies": ["elf_guardian"],
        "desc": "고요한 엘프 숲. 은빛 나뭇잎이 빛난다.",
        "unlock_condition": {"flag": "forest_cleared"},
        "lock_hint": "숲을 먼저 정리해야 엘프 마을로 갈 수 있습니다.",
        "init_flags": {
            "elf_village_visited": False,
            "lazarus_elf_clue": False,
            "seal_magic_understood": False,
            "blessed_by_elves": False,
        },
    },
    "moonlight_lake": {
        "name": "달빛 호수",
        "tile_char": "m",
        "tile_display": "◊ ",
        "tile_passable": True,
        "loc_char": "M",
        "loc_display": "달",
        "encounter_chance": 0.10,
        "encounter_enemies": ["lake_spirit"],
        "desc": "달빛이 수면 위에 춤추는 신비로운 호수.",
        "unlock_condition": None,
        "lock_hint": None,
        "init_flags": {
            "saw_zeldion_past": False,
            "witnessed_betrayal": False,
        },
    },
    "labyrinth": {
        "name": "지하 미궁",
        "tile_char": "y",
        "tile_display": "▪ ",
        "tile_passable": True,
        "loc_char": "Y",
        "loc_display": "미",
        "encounter_chance": 0.45,
        "encounter_enemies": ["labyrinth_guardian", "skeleton"],
        "desc": "어둠 속 미궁 통로. 벽에서 기묘한 문양이 빛난다.",
        "unlock_condition": {"flag": "ruins_cleared"},
        "lock_hint": "폐허를 정리해야 지하 미궁 입구가 열립니다.",
        "init_flags": {"labyrinth_cleared": False},
    },
    "mercenary_camp": {
        "name": "용병단 야영지",
        "tile_char": "j",
        "tile_display": "⌂ ",
        "tile_passable": True,
        "loc_char": "J",
        "loc_display": "용",
        "encounter_chance": 0.10,
        "encounter_enemies": ["mercenary_duelist"],
        "desc": "용병들의 활기찬 야영지. 훈련 소리가 울린다.",
        "unlock_condition": {"flag": "bandit_camp_cleared"},
        "lock_hint": "산적 야영지를 정리해야 용병단에 접근할 수 있습니다.",
        "init_flags": {
            "mercenary_hired": False,
            "dark_tower_hint": False,
            "training_done": False,
        },
    },
    "dark_tower": {
        "name": "어둠의 탑",
        "tile_char": "t",
        "tile_display": "▌ ",
        "tile_passable": True,
        "loc_char": "A",
        "loc_display": "탑",
        "encounter_chance": 0.50,
        "encounter_enemies": ["shadow_knight", "dark_sentinel"],
        "desc": "검은 탑. 그림자가 살아 움직이는 듯하다.",
        "unlock_condition": {"flag": "castle_inside_cleared"},
        "lock_hint": "성 내부를 탐색해야 어둠의 탑으로 갈 수 있습니다.",
        "init_flags": {
            "lazarus_truth_complete": False,
            "lazarus_defeated": False,
        },
    },
    "volcano": {
        "name": "화산 지대",
        "tile_char": "v",
        "tile_display": "▼ ",
        "tile_passable": True,
        "loc_char": "V",
        "loc_display": "화",
        "encounter_chance": 0.40,
        "encounter_enemies": ["fire_elemental", "lava_drake"],
        "desc": "화산 열기가 대기를 달군다. 용암 빛이 붉게 일렁인다.",
        "unlock_condition": {"flag": "pyramid_cleared"},
        "lock_hint": "피라미드를 공략해야 화산 지대로 갈 수 있습니다.",
        "init_flags": {"volcano_cleared": False},
    },
}

# 통행 불가 지형 (이벤트가 없는 순수 타일)
BARRIER_TILES = {
    "#": {"passable": False, "display": "██", "zone": None},
    "w": {"passable": False, "display": "~:", "zone": None},
    "^": {"passable": False, "display": "▲ ", "zone": None},
}

# 길/도로 타일
PATH_TILES = {
    ".": {"passable": True, "display": "· ", "zone": None},
    "=": {"passable": True, "display": "══", "zone": None},
}

# 기본 지역 분위기 (zone이 없는 타일용)
DEFAULT_DESC = "평온한 들판. 특별한 것은 보이지 않는다."


# ═══════════════════════════════════════════════════════
#  자동 생성 딕셔너리 (map.py 등에서 사용)
# ═══════════════════════════════════════════════════════

def _build_terrain():
    """AREAS + BARRIER_TILES + PATH_TILES → TERRAIN 딕셔너리"""
    t = {}
    t.update(BARRIER_TILES)
    t.update(PATH_TILES)
    for zone, a in AREAS.items():
        ch = a.get("tile_char")
        if ch:
            t[ch] = {
                "passable": a.get("tile_passable", True),
                "display": a["tile_display"],
                "zone": zone,
            }
    return t


def _build_locations():
    """AREAS → LOCATIONS 딕셔너리"""
    locs = {}
    for zone, a in AREAS.items():
        ch = a.get("loc_char")
        if ch:
            locs[ch] = {
                "name": a["name"],
                "zone": zone,
                "display": a["loc_display"],
            }
    return locs


def _build_world_connections():
    """AREAS → WORLD_CONNECTIONS 딕셔너리"""
    wc = {}
    for zone, a in AREAS.items():
        wc[zone] = {
            "name": a["name"],
            "neighbors": [],
            "encounter_chance": a.get("encounter_chance", 0.0),
            "encounter_enemies": a.get("encounter_enemies", []),
        }
    return wc


def _build_zone_desc():
    """AREAS → ZONE_DESC 딕셔너리"""
    zd = {None: DEFAULT_DESC}
    for zone, a in AREAS.items():
        zd[zone] = a.get("desc", DEFAULT_DESC)
    return zd


def _build_lock_hints():
    """AREAS → {zone: hint} 딕셔너리"""
    return {
        zone: a["lock_hint"]
        for zone, a in AREAS.items()
        if a.get("lock_hint")
    }


def _build_init_flags():
    """AREAS → 게임 시작 시 초기화할 모든 story_flags"""
    flags = {"open_world_initialized": True}
    for a in AREAS.values():
        for k, v in a.get("init_flags", {}).items():
            flags.setdefault(k, v)
    return flags


# 미리 빌드
TERRAIN = _build_terrain()
LOCATIONS = _build_locations()
WORLD_CONNECTIONS = _build_world_connections()
ZONE_DESC = _build_zone_desc()
LOCK_HINTS = _build_lock_hints()
INIT_FLAGS = _build_init_flags()


# ═══════════════════════════════════════════════════════
#  잠금 조건 판정 (데이터 기반)
# ═══════════════════════════════════════════════════════

def is_zone_locked(player, zone):
    """AREAS의 unlock_condition을 기반으로 잠금 여부 판정"""
    area = AREAS.get(zone)
    if not area:
        return False
    cond = area.get("unlock_condition")
    if not cond:
        return False

    flags = getattr(player, "story_flags", {})

    if "flag" in cond:
        return not flags.get(cond["flag"], False)

    if "any_flag" in cond:
        return not any(flags.get(f, False) for f in cond["any_flag"])

    return False


def get_lock_hint(zone):
    """잠긴 지역의 힌트 메시지"""
    return LOCK_HINTS.get(zone, "아직 이 경로는 이동할 수 없습니다.")


# ═══════════════════════════════════════════════════════
#  이벤트 등록 (스토리 모듈에서 사용)
# ═══════════════════════════════════════════════════════

_EVENT_REGISTRY: dict[str, callable] = {}


def register_event(zone: str, handler):
    """지역 이벤트 함수를 등록한다.

    사용법 (story_area.py 등에서):
        from area_registry import register_event

        def _event_town(player): ...

        register_event("town", _event_town)
    """
    _EVENT_REGISTRY[zone] = handler


def get_event(zone: str):
    """등록된 이벤트 함수 반환 (없으면 None)"""
    return _EVENT_REGISTRY.get(zone)


def get_all_events() -> dict[str, callable]:
    """등록된 모든 이벤트 딕셔너리 복사본 반환"""
    return dict(_EVENT_REGISTRY)
