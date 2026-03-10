"""스토리 시스템 - 오픈 월드 메인 루프 + 이벤트 디스패치

모듈 구조:
  area_registry.py  ← 지역 정의 (새 지역 추가 시 여기만 수정)
  event_engine.py   ← YAML 이벤트 엔진 (data/areas/*.yaml 자동 로드)
  story.py          ← 이 파일: 메인 루프, 이벤트 디스패치
  story_utils.py    ← 공용 헬퍼
  story_nav.py      ← 내비게이션 / 필드 렌더링 / 조우 / 플레이어 초기화
  data/areas/*.yaml ← 모든 지역 이벤트 데이터

새 지역 추가:
  1. area_registry.py → AREAS 에 지역 정보 추가
  2. map.py RAW_MAP 에 타일 배치
  3. data/areas/{zone}.yaml 에 이벤트 작성
  - 끝! Python 코드 수정 불필요
"""

from area_registry import get_event
from event_engine import register_yaml_events
from story_utils import _set_location, _input_choice, _pause
from story_nav import (
    _render_field_screen, _init_player,
    _check_field_encounter, _check_random_encounter,
)
from inventory import show_inventory, equip_item
from map import (
    WORLD_CONNECTIONS, DIRECTION_DELTAS,
    show_world_map, show_town_map,
    get_tile_map, find_location_pos, get_tile_zone,
    get_location_at, get_current_area_name,
)

# YAML 이벤트 자동 등록 (data/areas/*.yaml)
register_yaml_events()


# ═══════════════════════════════════════════════════════
#  이벤트 디스패치 (area_registry에서 자동 조회)
# ═══════════════════════════════════════════════════════

def _trigger_location_event(player, location_key: str) -> str | None:
    fn = get_event(location_key)
    if not fn:
        print("  이 지역에서는 아직 이벤트가 없습니다.")
        return None
    return fn(player)


# ═══════════════════════════════════════════════════════
#  오픈 월드 메인 루프
# ═══════════════════════════════════════════════════════

_ENDINGS = (
    "gameover",
    "clear_hero", "clear_redemption", "clear_shadow",
    "clear_dark", "clear_justice",
)


def open_world_loop(player):
    _init_player(player)
    tile_map = get_tile_map()
    start_pos = find_location_pos(tile_map, 'T')
    p_row, p_col = start_pos
    msg = ""

    while True:
        zone = get_location_at(tile_map, p_row, p_col)
        if zone:
            _set_location(player, zone)

        dir_options, action_start = _render_field_screen(
            player, tile_map, p_row, p_col, message=msg
        )
        msg = ""

        loc_zone = get_location_at(tile_map, p_row, p_col)
        if loc_zone:
            explore_num = action_start
            inv_num = action_start + 1
            stat_num = action_start + 2
            map_num = action_start + 3
            menu_num = action_start + 4
        else:
            explore_num = None
            inv_num = action_start
            stat_num = action_start + 1
            map_num = action_start + 2
            menu_num = action_start + 3

        valid = set(dir_options.keys()) | set(range(action_start, menu_num + 1))
        choice = _input_choice(valid)

        # ─── 방향 이동 (한 칸) ───
        if choice in dir_options:
            direction = dir_options[choice]
            dr, dc = DIRECTION_DELTAS[direction]
            nr, nc = p_row + dr, p_col + dc

            p_row, p_col = nr, nc
            move_zone = get_tile_zone(tile_map, p_row, p_col)

            _check_field_encounter(player, move_zone)

            if move_zone and move_zone in WORLD_CONNECTIONS:
                result = _check_random_encounter(player, move_zone)
                if result == "gameover":
                    return result

            arrived_loc = get_location_at(tile_map, p_row, p_col)
            if arrived_loc:
                _set_location(player, arrived_loc)
                loc_name = get_current_area_name(tile_map, p_row, p_col)
                msg = f"★ {loc_name}에 도착했습니다!"

        # ─── 탐색 ───
        elif explore_num and choice == explore_num:
            if loc_zone:
                result = _trigger_location_event(player, loc_zone)
                if result in _ENDINGS:
                    return result
            else:
                msg = "탐색할 장소가 없습니다."

        # ─── 인벤토리 ───
        elif choice == inv_num:
            show_inventory(player)
            equip_item(player)
            _pause()

        # ─── 상태 확인 ───
        elif choice == stat_num:
            player.full_status()
            _pause()

        # ─── 세계 지도 ───
        elif choice == map_num:
            if loc_zone == 'town':
                show_town_map(player)
            show_world_map(player)
            _pause()

        # ─── 메뉴 ───
        elif choice == menu_num:
            print("\n  1. 게임 계속  2. 게임 종료")
            qc = _input_choice({1, 2})
            if qc == 2:
                return "gameover"
