# 새 지역 추가 가이드

## 개요

새 지역을 추가할 때 수정하는 파일은 **최소 2개, 최대 3개**입니다.
**Python 코드를 작성할 필요 없이 YAML 파일만으로 스토리 이벤트를 만들 수 있습니다.**

| 단계 | 파일 | 필수 여부 |
|------|------|-----------|
| 1 | `area_registry.py` | **필수** - 지역 메타데이터 등록 |
| 2 | `map.py` (RAW_MAP) | **필수** - 타일맵에 배치 |
| 3 | `data/areas/{zone}.yaml` | **필수** - 이벤트 데이터 작성 (YAML) |
| 4 | `combat.py` (ENEMY_TABLE) | 새 적이 필요한 경우만 |

나머지 모듈(`story.py`, `event_engine.py`, `story_nav.py` 등)은 **자동으로 반영**되므로 수정할 필요가 없습니다.

---

## 1단계: area_registry.py에 지역 등록

`area_registry.py`의 `AREAS` 딕셔너리에 항목을 추가합니다.

### 예시: "드워프 광산" 지역 추가

```python
"dwarf_mine": {
    "name": "드워프 광산",
    "tile_char": "q",           # RAW_MAP에서 영역을 채울 소문자 (미사용 문자 선택)
    "tile_display": "⛏ ",       # 타일 렌더링 문자 (정확히 2글자)
    "tile_passable": True,      # 타일 위를 걸어다닐 수 있는지
    "loc_char": "Q",            # RAW_MAP에서 중심점 대문자 (미사용 문자 선택)
    "loc_display": "광",        # 지도에 표시될 한글 1글자
    "encounter_chance": 0.30,   # 이동 시 전투 확률 (0.0 ~ 1.0)
    "encounter_enemies": ["goblin", "skeleton"],  # combat.py ENEMY_TABLE의 키
    "desc": "곡괭이 소리가 울려퍼지는 거대한 지하 광산.",
    "unlock_condition": {"flag": "cave_cleared"},  # 잠금 해제 조건 (아래 참조)
    "lock_hint": "동굴을 정리해야 드워프 광산으로 갈 수 있습니다.",
    "init_flags": {"dwarf_mine_cleared": False},   # 게임 시작 시 초기화할 플래그
},
```

### 필드 상세 설명

#### tile_char / loc_char
- `tile_char`: 소문자 1글자. RAW_MAP에서 **영역(지형)**을 채울 때 사용
- `loc_char`: 대문자 1글자. RAW_MAP에서 **중심점(마커)**을 표시할 때 사용
- 이미 사용 중인 문자 확인: `a~j, m, n, r, t, u, v, w, x, y` (소문자) / `A~M, O~W, Y` (대문자)
- `tile_char`가 `None`이면 전용 지형 타일 없이 로케이션 마커만 존재 (예: throne)

#### tile_display
- 화면에 렌더링될 문자. **정확히 2글자**(한글1 + 공백 또는 특수문자2)
- 예: `"♣ "`, `"▓ "`, `"⛏ "`, `"~ "`

#### encounter_chance / encounter_enemies
- `encounter_chance`: 해당 지형 위를 이동할 때 랜덤 전투가 발생할 확률
  - `0.0` = 전투 없음 (마을 등 안전지대)
  - `0.5` = 50% 확률로 전투
- `encounter_enemies`: `combat.py`의 `ENEMY_TABLE`에 정의된 적 키 리스트
- 새로운 적이 필요하면 `combat.py`의 `ENEMY_TABLE`에 추가

#### unlock_condition
잠금 해제 조건. 3가지 형태:

```python
# 항상 열림
"unlock_condition": None,

# 특정 플래그 1개가 True일 때 해제
"unlock_condition": {"flag": "forest_cleared"},

# 여러 플래그 중 하나라도 True이면 해제
"unlock_condition": {"any_flag": ["cave_cleared", "river_cleared", "ruins_cleared"]},
```

#### init_flags
게임 시작 시 `player.story_flags`에 자동으로 초기화될 플래그들.
이벤트 함수 안에서 `player.story_flags["dwarf_mine_cleared"] = True` 처럼 사용합니다.

```python
"init_flags": {"dwarf_mine_cleared": False, "dwarf_king_met": False},
```

---

## 2단계: RAW_MAP에 타일 배치

`map.py`의 `RAW_MAP`에서 새 지역을 배치합니다.

### 규칙

- **소문자**(tile_char): 지역의 영역을 채움 (걸어다닐 수 있는 바닥)
- **대문자**(loc_char): 영역 중심에 1개만 배치 (탐색 가능한 핵심 위치)
- `=`: 도로(다른 지역과 연결)
- `#`: 벽(통행 불가)
- `.`: 빈 평지

### 예시

기존 맵에 드워프 광산을 추가한다면:

```
변경 전:  #.............#
변경 후:  #..qqqqQqqqq..#
```

중심의 `Q`가 로케이션 마커이고, 주변 `q`가 광산 지형입니다.
다른 지역과 `=`(도로)로 연결해야 이동이 가능합니다.

---

## 3단계: 이벤트 YAML 작성

`data/areas/{zone}.yaml` 파일을 만듭니다. Python 코드 작성이 필요 없습니다.

### 기본 구조

```yaml
dwarf_mine:
  actions:
    # 첫 방문 연출
    - action: if
      cond: {not_flag: dwarf_mine_visited}
      then:
        - action: divider
          title: "드워프 광산"
        - action: print
          text: |
            거대한 지하 광산. 드워프들이 곡괭이를 휘두르고 있다.
            광산 깊은 곳에서 기묘한 빛이 새어나온다.
        - action: set_flag
          key: dwarf_mine_visited

    # 메인 메뉴 루프
    - action: loop
      body:
        - action: divider
          title: "드워프 광산"
        - action: menu
          options:
            - label: "드워프 대장장이"
              actions:
                - action: print
                  text: "\n  드워프: '좋은 광석을 가져오면 무기를 만들어주지!'"
                - action: pause

            - label: "광산 깊은 곳 탐험"
              actions:
                - action: goto
                  scene: deep_mine

            - label: "탐색 종료"
              actions:
                - action: break

  scenes:
    deep_mine:
      actions:
        - action: print
          text: "\n  광산 깊은 곳에서 무언가를 발견했다..."
        - action: set_flag
          key: dwarf_mine_cleared
        - action: pause
```

### 사용 가능한 액션 타입

| 액션 | 설명 | 주요 파라미터 |
|------|------|---------------|
| `print` | 텍스트 출력 | `text` (`{player.name}` 등 변수 사용 가능) |
| `divider` | 구분선 + 제목 | `title` |
| `pause` | Enter 대기 | - |
| `set_flag` | 플래그 설정 | `key`, `value` (기본 true) |
| `add_item` | 아이템 추가 | `item`, `count`, `message` |
| `remove_item` | 아이템 제거 | `item` |
| `add_gold` | 골드 추가 | `amount`, `message` |
| `sub_gold` | 골드 차감 | `amount`, `message` |
| `heal` | HP 회복 | `amount` (숫자 또는 `full`) |
| `damage` | HP 감소 | `amount` |
| `add_stat` | 스탯 증가 | `attack`, `defense`, `max_hp` |
| `add_dark` | 어둠 점수 증가 | `amount` |
| `sub_dark` | 어둠 점수 감소 | `amount` |
| `battle` | 전투 | `enemy`, `name`, `hp_multiply`, `on_win`, `on_lose` |
| `open_shop` | 상점 | - |
| `menu` | 선택지 | `options` (각 항목: `label`, `when`, `actions`/`goto`) |
| `if` | 조건 분기 | `cond`, `then`, `else` |
| `random` | 랜덤 분기 | `branches` (각 항목: `weight`, `actions`) |
| `goto` | 씬 이동 | `scene` |
| `loop` / `break` | 반복 | `body` |
| `game_over` | 게임 오버 | - |
| `return` | 엔딩 반환 | `value` (`"clear_hero"` 등) |
| `save` | 게임 저장 | - |
| `show_inventory` | 인벤토리 | - |
| `equip_item` | 장비 장착 | - |
| `show_status` | 캐릭터 상태 | - |
| `show_map` | 지도 표시 | `kind` (`world` 또는 `castle`) |

### 사용 가능한 조건 타입

| 조건 | 설명 | 예시 |
|------|------|------|
| `flag` | 플래그 True 확인 | `{flag: forest_cleared}` |
| `not_flag` | 플래그 False 확인 | `{not_flag: visited}` |
| `any_flag` | 하나라도 True | `{any_flag: [a, b, c]}` |
| `all_flags` | 모두 True | `{all_flags: [a, b]}` |
| `has_item` | 아이템 보유 | `{has_item: "봉인 반지"}` |
| `not_has_item` | 아이템 미보유 | `{not_has_item: "열쇠"}` |
| `gold_gte` | 골드 이상 | `{gold_gte: 50}` |
| `dark_gte` | 어둠 점수 이상 | `{dark_gte: 3}` |
| `dark_lte` | 어둠 점수 이하 | `{dark_lte: 2}` |
| `random_lt` | 확률 조건 | `{random_lt: 0.3}` (30%) |
| `equipped_weapon` | 장착 무기 | `{equipped_weapon: "봉인의 검"}` |

조건을 여러 개 조합하려면 리스트로 작성 (AND):
```yaml
when:
  - {flag: forest_cleared}
  - {has_item: "열쇠"}
```

---

## 4단계 (선택): 새 적 추가

새로운 적이 필요하면 `combat.py`의 `ENEMY_TABLE`에 추가합니다.

```python
ENEMY_TABLE = {
    # ... 기존 적들 ...
    "dwarf_golem": {"name": "드워프 골렘", "hp": 120, "attack": 25, "defense": 10, "exp": 90, "gold": 50},
}
```

그리고 `area_registry.py`의 `encounter_enemies`에 이 키를 넣으면 해당 지역 이동 시 출현합니다.

---

## 전체 예시 요약: "드워프 광산" 추가

### 1. area_registry.py
```python
AREAS = {
    # ... 기존 지역들 ...
    "dwarf_mine": {
        "name": "드워프 광산",
        "tile_char": "q",
        "tile_display": "⛏ ",
        "tile_passable": True,
        "loc_char": "Q",
        "loc_display": "광",
        "encounter_chance": 0.30,
        "encounter_enemies": ["goblin", "dwarf_golem"],
        "desc": "곡괭이 소리가 울려퍼지는 거대한 지하 광산.",
        "unlock_condition": {"flag": "cave_cleared"},
        "lock_hint": "동굴을 정리해야 드워프 광산으로 갈 수 있습니다.",
        "init_flags": {"dwarf_mine_cleared": False},
    },
}
```

### 2. map.py (RAW_MAP)
적절한 위치에 `q`(지형)와 `Q`(마커), `=`(도로 연결) 배치.

### 3. data/areas/dwarf_mine.yaml
이벤트 YAML 파일 작성 (위의 3단계 참조).

### 4. combat.py (필요 시)
`ENEMY_TABLE`에 `"dwarf_golem": {...}` 추가.

**끝! Python 코드 수정 없이 YAML만으로 새 지역을 추가할 수 있습니다.**

---

## 사용 중인 문자 참조표

### 소문자 (tile_char) - 지형 타일

| 문자 | zone |
|------|------|
| `a` | harbor |
| `b` | bandit_camp |
| `c` | cave |
| `d` | desert |
| `e` | elf_village |
| `f` | forest |
| `g` | castle_gate |
| `i` | castle_inside |
| `j` | mercenary_camp |
| `m` | moonlight_lake |
| `n` | swamp |
| `r` | river |
| `t` | dark_tower |
| `u` | ruins |
| `v` | volcano |
| `w` | 바다 (통행불가, zone 없음) |
| `x` | ice |
| `y` | labyrinth |

사용 가능: `h, k, l, o, p, q, s, z`

### 대문자 (loc_char) - 로케이션 마커

| 문자 | zone |
|------|------|
| `A` | dark_tower |
| `B` | bandit_camp |
| `C` | cave |
| `D` | desert_town |
| `E` | elf_village |
| `F` | forest |
| `G` | castle_gate |
| `H` | harbor |
| `I` | castle_inside |
| `J` | mercenary_camp |
| `K` | throne |
| `L` | ice_cave |
| `M` | moonlight_lake |
| `O` | oasis |
| `P` | pyramid |
| `R` | river |
| `T` | town |
| `U` | ruins |
| `V` | volcano |
| `W` | swamp |
| `Y` | labyrinth |

사용 가능: `N, Q, S, X, Z`

### 특수 타일 (변경 불가)

| 문자 | 용도 |
|------|------|
| `#` | 벽 (통행불가) |
| `.` | 빈 평지 |
| `=` | 도로 (지역 연결) |
| `^` | 산 (통행불가) |
