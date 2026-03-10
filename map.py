"""지도 시스템 - 월드맵 / 타일맵 / 성 내부 지도"""

import os
import sys

try:
    import tty
    import termios
    _HAS_TERMIOS = True
except ImportError:
    _HAS_TERMIOS = False

if sys.platform == "win32":
    try:
        import msvcrt
    except ImportError:
        msvcrt = None  # type: ignore
else:
    msvcrt = None  # type: ignore


# ─── 키 입력 ──────────────────────────────────────────
def read_key():
    """단일 키 입력 읽기 (Enter 없이). 방향키/문자 반환."""
    if _HAS_TERMIOS:
        fd = sys.stdin.fileno()
        old = termios.tcgetattr(fd)
        try:
            tty.setraw(fd)
            ch = sys.stdin.read(1)
            if ch == '\x1b':
                seq = sys.stdin.read(2)
                arrows = {'[A': 'UP', '[B': 'DOWN', '[C': 'RIGHT', '[D': 'LEFT'}
                return arrows.get(seq, '')
            if ch in ('\r', '\n'):
                return 'ENTER'
            if ch == '\x03':
                raise KeyboardInterrupt
            return ch.upper()
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old)

    if msvcrt:
        ch = msvcrt.getwch()
        if ch in ('\x00', '\xe0'):
            ext = msvcrt.getwch()
            arrows = {'H': 'UP', 'P': 'DOWN', 'M': 'RIGHT', 'K': 'LEFT'}
            return arrows.get(ext, '')
        if ch in ('\r', '\n'):
            return 'ENTER'
        if ch == '\x03':
            raise KeyboardInterrupt
        return ch.upper()

    return input().strip().upper() or 'ENTER'


# ─── 타일/로케이션 정의 (area_registry에서 자동 생성) ───
from area_registry import (
    TERRAIN, LOCATIONS, WORLD_CONNECTIONS, ZONE_DESC,
    is_zone_locked, get_lock_hint,
)

# 75x48 타일맵
RAW_MAP = [
    "###########################################################################",
    "#.^^^^^^^.........................................................^^^^^^^^#",
    "#.^^^^^^^...................xxxxxxxxxxxxxxxxxxxx..................^^^^^^^^#",
    "#.^^^^^^^...................xxxxxxxxxLxxxxxxxxxx..................^^^^^^^^#",
    "#...........................xxxxxxxxx=xxxxxxxxxx..........................#",
    "#....................................=....................................#",
    "#....................................K.................ttttttttt..........#",
    "#....................................=.................ttttttttt..........#",
    "#.............................iiiiiii=iiiiiii..........ttttAtttt..........#",
    "#.............................iiiiiiiIiiiiii============tttttttt..........#",
    "#...eeeeeeeeeeeee.............iiiiiii=iiiiiii..........ttttttttt..........#",
    "#...eeeeeeeeeeeee....................=.................ttttttttt..........#",
    "#...eeeeeeeeeeeee.............ggggggg=ggggggg.............................#",
    "#...eeeeeeEeeeee===============ggggggGggggggg.............................#",
    "#...eeeeeeeeeeeee.............ggggggg=ggggggg.............................#",
    "#...eeeeeeeeeeeee...............jjjjj=jjjjj...............................#",
    "#...eeeeeeeeeeeee...............jjjjjJjjjjj...............................#",
    "#...............................jjjjj=jjjjj...............................#",
    "#.............................bbbbbbb=bbbbbbb.............................#",
    "#.............................bbbbbbbBbbbbbbb.............................#",
    "#.............................bbbbbbb=bbbbbbb.............................#",
    "#.............ccccccccccccc...rrrrrrr=rrrrrrr...uuuuuuuuuuuuu.............#",
    "#.............ccccccCcccccc...rrrrrrrRrrrrrrr...uuuuuuUuuuuuu.............#",
    "#.............cccccc=cccccc...rrrrrrr=rrrrrrr...uuuuuu=uuuuuu.............#",
    "#...................===========......=......===========...................#",
    "#.............................fffffff=fffffff.....yyyy=yyyy...............#",
    "#.............................fffffffFfffffff.....yyyyYyyyy...............#",
    "#..............mmmmmmmmm......fffffff=fffffff.....yyyyyyyyy...............#",
    "#......aaaHaa========================T========================D...........#",
    "#wwwwwwaaaaaaa.mmmmMmmm===============........................=...........#",
    "#wwwwwwaaaaaa=.mmmmmmmmm............................dddddddddd=dddddddd...#",
    "#wwwwww......=.mmmmmmmmm............................dddddddddd=dddddddd...#",
    "#wwwwww......=......................................dddddddddd=dddddddd...#",
    "#wwwwww.nnnnn=nnnnn.................................dddddddddd=dddddddd...#",
    "#wwwwww.nnnnnnnnnnn.................................dddddddddd=dddddddd...#",
    "#wwwwww.nnnnnWnnnnn.................................dddddddddd=dddddddd...#",
    "#wwwwww.nnnnnnnnnnn.................................ddddddddddPdddddddd...#",
    "#wwwwww.nnnnnnnnnnn.................................dddddddddd=dddddddd...#",
    "#wwwwww.............................................dddddddddd=dddddddd...#",
    "#wwwwww.............................................ddddddddddOdddddddd...#",
    "#wwwwww.............................................dddddddddd=dddddddd...#",
    "#wwwwww.............................................dddvvvvvvv=vvvvvvdd...#",
    "#...................................................dddvvvvvvv=vvvvvvdd...#",
    "#.^^^^^.............................................dddvvvvvvvVvvvvvvdd...#",
    "#.^^^^^.............................................dddvvvvvvv=vvvvvvdd...#",
    "#.^^^^^................................................vvvvvvvvvvvvvv.....#",
    "#.^^^^^...................................................................#",
    "###########################################################################",
]


def get_tile_map():
    """RAW_MAP을 2D 리스트로 반환"""
    return [list(row) for row in RAW_MAP]


def find_location_pos(tile_map, loc_char):
    """로케이션 마커의 (row, col) 반환"""
    for r, row in enumerate(tile_map):
        for c, ch in enumerate(row):
            if ch == loc_char:
                return (r, c)
    return None


def get_tile_info(tile_map, row, col):
    """타일의 정보 반환 (zone, passable, display 등)"""
    ch = tile_map[row][col]
    if ch in LOCATIONS:
        return LOCATIONS[ch]
    if ch in TERRAIN:
        return TERRAIN[ch]
    return TERRAIN.get('.', {})


def get_tile_zone(tile_map, row, col):
    """해당 타일의 zone 반환 (None이면 안전 지대)"""
    info = get_tile_info(tile_map, row, col)
    return info.get('zone')


def get_location_at(tile_map, row, col):
    """로케이션 마커 위에 있으면 해당 키 반환, 아니면 None"""
    ch = tile_map[row][col]
    if ch in LOCATIONS:
        return LOCATIONS[ch]['zone']
    return None


def get_location_char_at(tile_map, row, col):
    """로케이션 마커 문자 반환, 아니면 None"""
    ch = tile_map[row][col]
    if ch in LOCATIONS:
        return ch
    return None


def can_move(tile_map, row, col, player=None):
    """해당 좌표로 이동 가능한지 확인"""
    if row < 0 or row >= len(tile_map) or col < 0 or col >= len(tile_map[0]):
        return False
    ch = tile_map[row][col]
    if ch == '#':
        return False
    if ch in LOCATIONS:
        return True
    info = TERRAIN.get(ch, {})
    return info.get('passable', False)


# is_zone_locked, get_lock_hint → area_registry에서 import됨 (위쪽 참조)


def calculate_new_pos(row, col, direction):
    """방향에 따라 새 좌표 반환"""
    deltas = {'UP': (-1, 0), 'DOWN': (1, 0), 'LEFT': (0, -1), 'RIGHT': (0, 1)}
    dr, dc = deltas.get(direction, (0, 0))
    return row + dr, col + dc


# ─── 뷰포트 렌더링 ────────────────────────────────────
def render_map(tile_map, player_row, player_col, player, message="", viewport_h=17, viewport_w=25):
    """플레이어 중심 뷰포트를 터미널에 렌더링"""
    os.system('clear')

    # 현재 위치명 확인
    zone = get_tile_zone(tile_map, player_row, player_col)
    loc_char = get_location_char_at(tile_map, player_row, player_col)
    if loc_char and loc_char in LOCATIONS:
        loc_name = LOCATIONS[loc_char]['name']
    elif zone and zone in WORLD_CONNECTIONS:
        loc_name = WORLD_CONNECTIONS[zone]['name']
    else:
        loc_name = "이동 중"

    # 퀘스트 목표
    flags = getattr(player, 'story_flags', {})
    if not flags.get('forest_cleared'):
        quest = '어두운 숲을 돌파해 길을 확보하라.'
    elif not (flags.get('cave_cleared') or flags.get('river_cleared') or flags.get('ruins_cleared')):
        quest = '동굴/강가/폐허 중 한 곳을 해결하라.'
    elif not flags.get('bandit_camp_cleared'):
        quest = '산적 야영지를 정리하고 성으로 가는 길을 열어라.'
    elif not flags.get('castle_gate_cleared'):
        quest = '마왕의 성 정문을 돌파하라.'
    elif not flags.get('castle_inside_cleared'):
        quest = '성 내부를 탐색하고 최종 전투 준비를 마쳐라.'
    elif not flags.get('lazarus_defeated', False):
        quest = '어둠의 탑에서 라자러스를 추적하거나, 마왕과 대면하라.'
    else:
        quest = '마왕 젤드리온과 대면하라. (봉인 반지 보유 중)'

    # 헤더
    header = f"═══════ [ {loc_name} ] ═══════"
    print(header)
    print(f"  ▶ 목표: {quest}")
    bar_len = 15
    filled = int(bar_len * player.hp / player.max_hp)
    bar = "█" * filled + "░" * (bar_len - filled)
    print(f"  HP [{bar}] {player.hp}/{player.max_hp}  Lv.{player.level}  {player.gold}G")
    print()

    # 뷰포트 범위
    map_h = len(tile_map)
    map_w = len(tile_map[0]) if tile_map else 0
    half_h = viewport_h // 2
    half_w = viewport_w // 2

    top = max(0, player_row - half_h)
    if top + viewport_h > map_h:
        top = max(0, map_h - viewport_h)
    left = max(0, player_col - half_w)
    if left + viewport_w > map_w:
        left = max(0, map_w - viewport_w)

    for r in range(top, min(top + viewport_h, map_h)):
        line = "  "
        for c in range(left, min(left + viewport_w, map_w)):
            if r == player_row and c == player_col:
                line += "@ "
            else:
                ch = tile_map[r][c]
                if ch in LOCATIONS:
                    line += LOCATIONS[ch]['display'] + " " if len(LOCATIONS[ch]['display']) == 1 else LOCATIONS[ch]['display']
                elif ch in TERRAIN:
                    line += TERRAIN[ch]['display']
                else:
                    line += '· '
        print(line)

    print()
    if message:
        print(f"  {message}")
    print("  ↑↓←→ 이동 | E 탐색 | I 인벤토리 | S 상태 | M 지도 | Q 메뉴")


# WORLD_CONNECTIONS, ZONE_DESC → area_registry에서 import됨 (위쪽 참조)


# ─── 방향 상수 ────────────────────────────────────────
DIRECTION_NAMES = {"north": "북", "south": "남", "east": "동", "west": "서"}
DIRECTION_DELTAS = {"north": (-1, 0), "south": (1, 0), "east": (0, 1), "west": (0, -1)}
DIRECTIONS_ORDER = ["north", "south", "east", "west"]


# ─── 방향 스캔 ────────────────────────────────────────
def scan_direction(tile_map, row, col, direction, player):
    """한 방향으로 스캔하여 다음 도달 가능한 zone/로케이션 정보 반환.

    Returns dict:
        reachable: bool - 이동 가능 여부
        name: str       - 목적지 이름
        zone: str|None  - 목적지 zone 키
        distance: int   - 거리(칸)
        danger: bool    - 위험 지역 여부
        locked_hint: str|None - 잠김 힌트
    """
    dr, dc = DIRECTION_DELTAS[direction]
    cur_zone = get_tile_zone(tile_map, row, col)
    nr, nc = row + dr, col + dc
    map_h = len(tile_map)
    map_w = len(tile_map[0]) if tile_map else 0

    # 첫 칸부터 벽이면
    if nr < 0 or nr >= map_h or nc < 0 or nc >= map_w:
        return {"reachable": False, "name": "맵 끝", "zone": None,
                "distance": 0, "danger": False, "locked_hint": None}

    ch = tile_map[nr][nc]
    if ch == '#' or not TERRAIN.get(ch, {}).get('passable', False) and ch not in LOCATIONS:
        return {"reachable": False, "name": "벽", "zone": None,
                "distance": 0, "danger": False, "locked_hint": None}

    # 스캔 시작 - 최대 75칸
    dist = 0
    sr, sc = row, col
    for step in range(1, 76):
        sr, sc = sr + dr, sc + dc
        if sr < 0 or sr >= map_h or sc < 0 or sc >= map_w:
            break
        ch = tile_map[sr][sc]

        # 벽/통행불가
        if ch in TERRAIN and not TERRAIN[ch].get('passable', False):
            break
        if ch not in TERRAIN and ch not in LOCATIONS:
            break

        dist = step

        # 로케이션 마커 발견
        if ch in LOCATIONS:
            loc_info = LOCATIONS[ch]
            z = loc_info['zone']
            if is_zone_locked(player, z):
                return {"reachable": False, "name": loc_info['name'],
                        "zone": z, "distance": dist, "danger": False,
                        "locked_hint": get_lock_hint(z)}
            enc = WORLD_CONNECTIONS.get(z, {}).get('encounter_chance', 0)
            return {"reachable": True, "name": loc_info['name'],
                    "zone": z, "distance": dist,
                    "danger": enc > 0, "locked_hint": None}

        # zone이 현재와 다른 곳으로 변경
        tile_zone = get_tile_zone(tile_map, sr, sc)
        if tile_zone and tile_zone != cur_zone:
            if is_zone_locked(player, tile_zone):
                zname = WORLD_CONNECTIONS.get(tile_zone, {}).get('name', tile_zone)
                return {"reachable": False, "name": zname,
                        "zone": tile_zone, "distance": dist, "danger": False,
                        "locked_hint": get_lock_hint(tile_zone)}
            zname = WORLD_CONNECTIONS.get(tile_zone, {}).get('name', tile_zone)
            enc = WORLD_CONNECTIONS.get(tile_zone, {}).get('encounter_chance', 0)
            return {"reachable": True, "name": zname,
                    "zone": tile_zone, "distance": dist,
                    "danger": enc > 0, "locked_hint": None}

    # 끝까지 같은 zone이거나 막다른 길
    if dist == 0:
        return {"reachable": False, "name": "벽", "zone": None,
                "distance": 0, "danger": False, "locked_hint": None}
    # 같은 zone 내에서 계속 갈 수 있음
    zname = WORLD_CONNECTIONS.get(cur_zone, {}).get('name', '들판')
    enc = WORLD_CONNECTIONS.get(cur_zone, {}).get('encounter_chance', 0)
    return {"reachable": True, "name": f"{zname} (계속)",
            "zone": cur_zone, "distance": dist,
            "danger": enc > 0, "locked_hint": None}


# ─── 자동 이동 ────────────────────────────────────────
def auto_walk(tile_map, row, col, direction, player):
    """방향으로 자동 이동. 안전 zone은 목적지까지, 위험 zone은 1칸.

    Returns: (new_row, new_col, message, encounter_zone)
        encounter_zone: 인카운터 체크가 필요한 zone 키 (없으면 None)
    """
    dr, dc = DIRECTION_DELTAS[direction]
    map_h = len(tile_map)
    map_w = len(tile_map[0]) if tile_map else 0
    cur_zone = get_tile_zone(tile_map, row, col)

    nr, nc = row + dr, col + dc
    # 기본 이동 불가 체크
    if nr < 0 or nr >= map_h or nc < 0 or nc >= map_w:
        return row, col, "더 이상 갈 수 없습니다.", None
    if not can_move(tile_map, nr, nc):
        return row, col, "더 이상 갈 수 없습니다.", None

    # 잠금 체크
    next_zone = get_tile_zone(tile_map, nr, nc)
    if next_zone and next_zone != cur_zone and is_zone_locked(player, next_zone):
        return row, col, f"[잠김] {get_lock_hint(next_zone)}", None

    # 다음 칸의 위험도 확인
    target_zone = next_zone or cur_zone
    enc_chance = WORLD_CONNECTIONS.get(target_zone, {}).get('encounter_chance', 0)

    if enc_chance > 0:
        # 위험 지역 → 1칸만 이동
        loc = get_location_at(tile_map, nr, nc)
        if loc:
            loc_name = LOCATIONS.get(tile_map[nr][nc], {}).get('name', loc)
            return nr, nc, f"{loc_name}에 도착했습니다.", None
        return nr, nc, "", target_zone  # 인카운터 체크 필요

    # 안전 지역 → 로케이션/zone 경계까지 자동 이동
    cr, cc = nr, nc
    for _ in range(75):
        # 로케이션 도착 확인
        loc = get_location_at(tile_map, cr, cc)
        if loc:
            loc_name = LOCATIONS.get(tile_map[cr][cc], {}).get('name', loc)
            return cr, cc, f"... {loc_name}에 도착했습니다.", None

        # 다음 칸 체크
        nnr, nnc = cr + dr, cc + dc
        if nnr < 0 or nnr >= map_h or nnc < 0 or nnc >= map_w:
            break
        if not can_move(tile_map, nnr, nnc):
            break

        nz = get_tile_zone(tile_map, nnr, nnc)
        if nz and nz != target_zone:
            # 다른 zone 진입
            if is_zone_locked(player, nz):
                break
            nz_enc = WORLD_CONNECTIONS.get(nz, {}).get('encounter_chance', 0)
            if nz_enc > 0:
                # 위험 zone 경계 → 첫 타일로 진입하고 인카운터 반환
                nz_name = WORLD_CONNECTIONS.get(nz, {}).get('name', nz)
                # 로케이션 마커면 도착 처리
                loc_at = get_location_at(tile_map, nnr, nnc)
                if loc_at:
                    ln = LOCATIONS.get(tile_map[nnr][nnc], {}).get('name', loc_at)
                    return nnr, nnc, f"... {ln}에 도착했습니다.", None
                return nnr, nnc, f"... {nz_name} 지역에 진입했습니다.", nz

        cr, cc = nnr, nnc

    # 최종 위치에서 로케이션 확인
    loc = get_location_at(tile_map, cr, cc)
    if loc:
        loc_name = LOCATIONS.get(tile_map[cr][cc], {}).get('name', loc)
        return cr, cc, f"... {loc_name}에 도착했습니다.", None

    area = get_current_area_name(tile_map, cr, cc)
    if area == "들판":
        return cr, cc, f"... 이동했습니다.", None
    return cr, cc, f"... {area} 부근으로 이동했습니다.", None


# ─── 현재 위치명 ──────────────────────────────────────
def get_current_area_name(tile_map, row, col):
    """현재 위치 이름 반환"""
    ch = tile_map[row][col]
    if ch in LOCATIONS:
        return LOCATIONS[ch]['name']
    zone = get_tile_zone(tile_map, row, col)
    if zone and zone in WORLD_CONNECTIONS:
        return WORLD_CONNECTIONS[zone]['name']
    return "들판"


# ─── 내부 헬퍼 ────────────────────────────────────────
def _mark(key, current, visited):
    """★ 현재 위치 / ✓ 방문 완료 / · 미방문"""
    if key == current:
        return "★"
    if key in visited:
        return "✓"
    return "·"


def _box(key, name, current, visited):
    """고정 폭 12칸 박스 라벨 반환"""
    m   = _mark(key, current, visited)
    raw = f"{m}{name}{m}" if key == current else f" {name} {m}"
    return f"[{raw.center(12)}]"


# ─── 월드맵 ───────────────────────────────────────────
def show_world_map(player):
    cur = getattr(player, "current_location", "town")
    vis = getattr(player, "visited_locations", {"town"})

    def b(key, name):
        return _box(key, name, cur, vis)

    throne  = b("throne",        " 마왕의 방 ")
    cin     = b("castle_inside", " 성  내  부")
    cg      = b("castle_gate",   " 마왕의 성 ")
    bc      = b("bandit_camp",   "산적 야영지")
    cv      = b("cave",          "  동  굴  ")
    rv      = b("river",         "  강  가  ")
    ru      = b("ruins",         "  폐  허  ")
    fs      = b("forest",        "어두운 숲 ")
    tw      = b("town",          "아르카디아")
    ic      = b("ice_cave",      " 빙하 동굴")
    hb      = b("harbor",        " 포구 마을")
    dt      = b("desert_town",   "사하르 마을")
    sw      = b("swamp",         "독안개 늪 ")
    py      = b("pyramid",       " 피라미드 ")
    oa      = b("oasis",         " 오아시스 ")
    # 확장 로케이션
    ev      = b("elf_village",   " 엘프 마을")
    ml      = b("moonlight_lake"," 달빛 호수")
    lb      = b("labyrinth",     " 지하 미궁")
    mc      = b("mercenary_camp","용병단 야영")
    dk      = b("dark_tower",    "어둠의 탑 ")
    vc      = b("volcano",       " 화산 지대")

    W = 80
    sep = "═" * W

    print(f"\n{sep}")
    print("                       ◈  아르카디아 왕국 세계 지도  ◈")
    print(sep)
    print()
    print(f"                               {ic}")
    print( "                                    ↑")
    print(f"                               {throne}         {dk}")
    print( "                                    ↑                ↑")
    print(f"                               {cin}  →→→→  [연결]")
    print( "                                    ↑")
    print(f"  {ev}  ←←←  {cg}")
    print( "                                    ↑")
    print(f"                               {mc}")
    print( "                                    ↑")
    print(f"                               {bc}")
    print( "                 ↗                  ↑                  ↖")
    print(f"      {cv}     {rv}     {ru}")
    print( "                 ↘                  ↑                  ↙  ↓")
    print(f"                               {fs}          {lb}")
    print( "                                    ↑")
    print(f"  {hb}  {ml}  {tw}  →→  {dt}")
    print( "             ↓                                             ↓")
    print(f"          {sw}                                 {py}")
    print( "                                                           ↓")
    print(f"                                                      {oa}")
    print( "                                                           ↓")
    print(f"                                                      {vc}")
    print()
    print("  ★ 현재 위치    ✓ 방문 완료    · 미방문")
    print(sep)

    location_desc = {
        "town":          "아르카디아 마을  - 여정의 출발점",
        "forest":        "어두운 숲        - 세 갈래 갈림길",
        "cave":          "몬스터 동굴      - 트롤이 사는 위험한 동굴",
        "river":         "안개 강가        - 은자의 오두막이 있는 강변",
        "ruins":         "저주받은 폐허    - 언데드가 득실대는 옛 도시",
        "bandit_camp":   "산적 야영지      - 마왕의 성으로 가는 길목",
        "castle_gate":   "마왕의 성        - 검은 성의 정문",
        "castle_inside": "성 내부          - 도서관·감옥·무기고가 있는 복도",
        "throne":        "마왕의 방        - 젤드리온의 왕좌",
        "ice_cave":      "빙하 동굴        - 고대 빙룡의 둥지",
        "harbor":        "포구 마을        - 선원들이 모이는 항구",
        "desert_town":   "사하르 마을      - 사막의 교역 도시",
        "swamp":         "독안개 늪        - 마녀가 사는 위험한 늪",
        "pyramid":       "파라오의 피라미드 - 고대 왕의 무덤",
        "oasis":         "오아시스         - 사막의 안식처",
        "elf_village":   "엘프 마을        - 고대 엘프의 은밀한 정착지",
        "moonlight_lake":"달빛 호수        - 신비로운 빛이 감도는 호수",
        "labyrinth":     "지하 미궁        - 폐허 아래 숨겨진 고대 미궁",
        "mercenary_camp":"용병단 야영지    - 자유 용병들의 본거지",
        "dark_tower":    "어둠의 탑        - 라자러스의 비밀 은신처",
        "volcano":       "화산 지대        - 고대 대장간이 잠든 화산",
    }
    if cur in location_desc:
        print(f"\n  ▶ 현재 위치: {location_desc[cur]}")
    print()


# ─── 성 내부 지도 ────────────────────────────────────
def show_castle_map(player, explored=None):
    """explored: set of explored location keys ('library', 'prison', 'armory')"""
    if explored is None:
        explored = set()
    cur = getattr(player, "current_location", "castle_inside")

    def room(key, name):
        if key in explored:
            return f"[{name}✓]"
        return f"[{name} ]"

    lib = room("library", "도서관")
    pri = room("prison",  "지하감옥")
    arm = room("armory",  "무기고")

    W = 46
    sep = "─" * W

    print(f"\n{sep}")
    print("           ◈  마왕의 성 내부 지도  ◈")
    print(sep)
    print()
    print("              ┌──────────────┐")
    print("              │  [ 마왕의 방 ]│  ← 목표")
    print("              └──────┬───────┘")
    print("                     │ 암흑 장군 대기")
    print("    ┌────────────────┼────────────────┐")
    print(f"    {lib}        {pri}       {arm}")
    print("    └────────────────┼────────────────┘")
    print("                     │")
    print("              [ 성문 방향 ]")
    print()

    explored_count = len(explored & {"library", "prison", "armory"})
    print(f"  탐색 완료: {explored_count}/3 곳   ✓=탐색완료   =미탐색")
    print()
    if explored_count < 2:
        print(f"  ※ 최소 2곳을 탐색해야 앞으로 나갈 수 있습니다.")
    print(sep)
    print()


# ─── 마을 내부 지도 ──────────────────────────────────
def show_town_map(player):
    flags = getattr(player, "story_flags", {})

    def visited(key):
        return "✓" if flags.get(key) else " "

    W = 48
    sep = "─" * W

    print(f"\n{sep}")
    print("           ◈  아르카디아 마을 지도  ◈")
    print(sep)
    print()
    print("  ┌──────────────────────────────────────┐")
    print("  │              북쪽 성문                │")
    print("  │            [숲으로 이어짐]             │")
    print("  └──────────────────┬───────────────────┘")
    print("                     │")
    print("  ┌──────────┐  ┌────┴─────┐  ┌──────────┐")
    print(f"  │ 성  당  {visited('priest_done')}│  │마을 광장 │  │대장장이 {visited('blacksmith_done')}│")
    print("  │ [알테르] │  │[장로 갈리│  │  [브론]  │")
    print("  └──────────┘  │ 아르]    │  └──────────┘")
    print("                │          │")
    print("  ┌──────────┐  └────┬─────┘  ┌──────────┐")
    print(f"  │  선술집  {visited('tavern_done')}│  │    │     │  │  상  점  │")
    print("  │ [정보원] │  │  골목  │  │  [막스]  │")
    print(f"  └──────────┘  │[아이]{visited('child_done')} │  └──────────┘")
    print("                └─────────┘")
    print()
    print("  ✓ = 방문 완료   (공백) = 미방문")
    print(sep)
    print()
