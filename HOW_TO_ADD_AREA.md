# 새 지역 추가 가이드 (Web 버전)

## 개요

새 지역을 추가할 때 수정하는 파일은 **최소 2개, 최대 3개**입니다.
**JavaScript 로직 코딩을 직접 만질 필요 없이, 데이터 설정 추가와 YAML 파일만으로 지역과 스토리 이벤트를 만들 수 있습니다.**

| 단계 | 파일 | 필수 여부 |
|------|------|-----------|
| 1 | `web/js/data.js` | **필수** - 지역/지형/마커/맵 메타데이터 등록 |
| 2 | `web/js/data.js` (`RAW_MAP`) | **필수** - 타일맵에 배치 |
| 3 | `web/data/areas/{zone}.yaml` | **필수** - 이벤트 데이터 작성 (YAML) |
| 4 | `web/js/data.js` (`ENEMY_TABLE`, `ITEMS`) | 새 몬스터나 신규 아이템이 필요한 경우 |

기본적인 게임 엔진 로직(`main.js`, `event_engine.js`, `combat.js`, `ui.js`)은 **자동으로 연동**되므로 수정할 필요가 없습니다.

---

## 1단계: data.js에 지역 등록

`web/js/data.js` 파일을 열어 다음 3군데의 데이터 객체에 새 지역 정보를 추가합니다.

### 1-1. `AREAS` 객체에 지역 특성 추가

지역의 이름, 잠금 해제 조건(스토리 플래그), 이동 중 적 출현 확률 등을 등록합니다.

```javascript
AREAS.dwarf_mine = {
  name: "드워프 광산",
  unlock_condition: { flag: "cave_cleared" }, // 잠금 해제 조건 플래그
  lock_hint: "동굴을 먼저 돌파해야 드워프 광산으로 갈 수 있습니다.",
  encounter_chance: 0.30, // 이동 시 적 조우 확률 (0.0=안전 지대 ~ 1.0)
  encounter_enemies: ["goblin", "dwarf_golem"], // 출현할 적 (ENEMY_TABLE 키)
  desc: "곡괭이 소리가 울려퍼지는 거대한 지하 광산." // 해당 지역 이동시 렌더링될 안내문
};
```

### 1-2. `TERRAIN` 객체에 지형(소문자) 등록

게임 `RAW_MAP`에서 해당 지역의 통로와 일반 타일을 구성할 **소문자 알파벳**을 지정합니다. (기존에 정의되지 않은 문자 사용. 예: `q`)

```javascript
  "q": { passable: true, zone: "dwarf_mine" },
```

### 1-3. `LOCATIONS` 객체에 마커(대문자) 등록

게임 `RAW_MAP`에서 지역의 실질적인 랜드마크 위치(이벤트 활성화 지점)가 될 **대문자 알파벳**을 지정합니다. 이곳에 캐릭터가 진입하면 "★ 드워프 광산에 도착했습니다" 메시지와 함께 이벤트가 개방됩니다.

```javascript
  "Q": { name: "드워프 광산", zone: "dwarf_mine" },
```

---

## 2단계: RAW_MAP에 타일 배치

`web/js/data.js` 파일 하단의 `RAW_MAP` 배열 문자열을 수정하여 세계 지도에 새 지역을 그려 넣습니다.

### 맵 심볼 규칙

- **소문자** (`TERRAIN`): 지역의 일반적인 영역(지형)을 채웁니다 (걸어다닐 수 있는 바닥)
- **대문자** (`LOCATIONS`): 지역 중심에 1개만 배치 (목적지가 되는 마을, 던전 입구 등의 핵심 랜드마크)
- `=`: 도로 (다른 지역들을 안전하게, 혹은 자연스럽게 이어줌)
- `#`: 벽 (통행 불가한 맵의 끝자락)
- `.`: 빈 평지 (통행 가능. 지역과 지역 사이의 기본 공터)
- `^`: 산맥 / `w`: 바다 지역 등 통행 불가

### 맵 작성 예시 (광산 깎아내기)

```text
변경 전:  #.............#
변경 후:  #..qqqqQqqqq..#
```

가운데 `Q`가 로케이션 중심 마커이고, 주변 `q`가 광산 지형 길목이 됩니다. 다른 안전 지대나 도로(`=`)와 연결해두어야 걸어들어갈 수 있습니다.

---

## 3단계: 이벤트 YAML 작성

`web/data/areas/{zone}.yaml` 파일을 생성합니다. (예: `web/data/areas/dwarf_mine.yaml`)  
이 파일에서 `if`, `random`, `menu`, `battle` 등 액션 사전을 조합해 이벤트를 구성합니다.

### 기본 YAML 템플릿 예시

```yaml
dwarf_mine:
  actions:
    # 1. 첫 통과 시 이벤트
    - action: if
      cond: {not_flag: dwarf_mine_visited}
      then:
        - action: divider
          title: "드워프 광산"
        - action: print
          text: |
            거대한 지하 광산. 투박한 손길로 캐낸 광석들이 산을 이루고 있다.
            "누구냐, 인간 꼬맹이! 여기부터는 드워프의 영토다!"
        - action: set_flag
          key: dwarf_mine_visited
          value: true
        - action: pause

    # 2. 메인 방문 메뉴 루프
    - action: loop
      body:
        - action: divider
          title: "드워프 광산"
        - action: menu
          options:
            - label: "구석진 틈새 조사"
              actions:
                - action: print
                  text: "\n  좁은 틈새를 찾아냈다. 무언가 반짝인다."
                - action: random
                  branches:
                    - weight: 0.6
                      actions:
                        - action: add_gold
                          amount: 20
                    - weight: 0.4
                      actions:
                        - action: print
                          text: "  거대한 고블린이 튀어나왔다!"
                        - action: battle
                          enemy: goblin

            - label: "광산 최심부로 전진 (보스전)"
              actions:
                - action: goto
                  scene: boss_battle

            - label: "탐색 종료 (밖으로)"
              actions:
                - action: break

  # 3. 서브 씬(Scene)
  scenes:
    boss_battle:
      actions:
        - action: print
          text: "\n  동굴 깊은 곳에서 육중한 골렘이 움직이기 시작한다...!"
        - action: battle
          name: "드워프를 미치게 한 골렘"
          enemy: dwarf_golem
          hp_multiply: 1.5   # 일반 적 스탯의 1.5배 보스
          on_win:
            - action: print
              text: "  ★ 골렘이 산산조각 났다!"
            - action: set_flag
              key: dwarf_mine_cleared
              value: true
          on_lose:
            - action: print
              text: "  무참히 짓밟혔다..."
            - action: game_over
```

---

## 4단계 (선택): 새 몬스터 및 아이템 추가

새로운 적이나 획득 아이템이 필요하다면 `web/js/data.js`를 다시 엽니다.

### 4-1. ENEMY_TABLE 등록 (적 스탯)

```javascript
  dwarf_golem: { name: "드워프 골렘", hp: 120, atk: 25, def: 10, exp: 90, gold: 50 },
```

### 4-2. DROP_TABLE 등록 (적 처치 드롭 전리품)

```javascript
  dwarf_golem: [
    { item: "고급 포션", chance: 0.5 },
    { item: "강철 검", chance: 0.2 }
  ],
```

### 4-3. ITEMS 등록 (신규 무기/방어구/소비품 등)

특정 보상이나 전리품으로 새 아이템을 지급하고 싶다면, `ITEMS` 객체에도 반드시 추가해야 합니다.

```javascript
  "대지의 룬소드": { type: "weapon", attack_bonus: 24, price: 200, desc: "공격력 +24, 드워프들의 걸작품" },
```

이후 YAML에서 `- action: add_item, item: "대지의 룬소드"` 로 지급할 수 있습니다.

---

## 전체 요약: "드워프 광산"을 추가하려면?

1. `web/js/data.js`를 열어 `AREAS`에 `"dwarf_mine"` 구역 메타데이터를 등록하고, `TERRAIN`에 `"q"`, `LOCATIONS`에 `"Q"`를 등록합니다.
2. 같은 파일 하단 `RAW_MAP`에 `q`와 `Q`를 그려서 타일맵상 위치를 할당합니다.
3. 새로운 적인 `"dwarf_golem"` 등을 `ENEMY_TABLE`에 등록하고, 새 지역 설정의 `encounter_enemies` 배열에 집어넣습니다.
4. `web/data/areas/dwarf_mine.yaml` 파일을 텍스트 에디터로 만들어 이 지역 고유의 NPC 대화나 보스 전투 이벤트를 작성합니다.
5. `web/index.html` 파일을 웹 브라우저로 띄우거나 새로고침하여 바뀐 점을 플레이합니다.

**끝! 이렇게 하여 JavaScript 로직 코드 건드리지 않고, 설정과 YAML 추가만으로 새 지역을 무한정 넓혀나갈 수 있습니다.**
