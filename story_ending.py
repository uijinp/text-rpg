"""최종 전투 + 5가지 엔딩 + 게임 오버"""

from story_utils import _set_location, _input_choice, _divider, game_over
from combat import battle, spawn_enemy
from inventory import show_inventory, equip_item
from map import show_world_map


# ═══════════════════════════════════════════════════════
#  챕터 7: 마왕과의 대면 + 엔딩 분기
# ═══════════════════════════════════════════════════════

def chapter_7_final(player):
    _set_location(player, "throne")
    _divider("챕터 7: 마왕 젤드리온과의 대면")
    print("""
  거대한 문이 열리며 왕좌의 방이 나타난다.
  창밖으로 번개가 치는 가운데, 검은 로브를 걸친 마왕이
  왕좌에서 천천히 일어선다.

  마왕: "...감히 여기까지 오다니. 그 용기는 인정하지.
         하지만 이 자리는 네가 죽는 자리다."
""")

    knows_truth = (
        player.story_flags.get("heard_maou_truth") or
        player.story_flags.get("found_truth_book") or
        player.story_flags.get("found_diary")
    )

    has_seal_ring = ("봉인 반지" in player.inventory and
                     player.story_flags.get("lazarus_defeated"))

    if knows_truth:
        print("  당신은 마왕에 대한 진실을 알고 있다.")
        print("  1. '레이저스에게 억울한 누명을 쓴 것을 알고 있다'고 말한다")
        print("  2. 그냥 싸운다")
        if has_seal_ring:
            print("  3. 봉인 반지를 건네며 '라자러스를 처단하고 반지를 되찾았습니다'")
        valid = {1, 2, 3} if has_seal_ring else {1, 2}
        choice = _input_choice(valid)
    else:
        print("  1. 싸운다")
        _input_choice({1})
        choice = 2

    if knows_truth and choice == 3 and has_seal_ring:
        return ending_justice(player)
    elif knows_truth and choice == 1:
        return _dialogue_path(player)
    else:
        return _final_battle(player)


def _dialogue_path(player):
    _divider("진실의 대화")
    print("""
  마왕의 눈이 흔들린다.

  마왕: "...무슨 말을 하는 거냐. 그것을 어떻게..."

  당신은 발견한 진실들을 차분히 이야기했다.
  일기장, 도서관의 기록, 은자 노인의 증언...

  마왕: "...기억하고 싶지 않았다. 그 배신을.
         하지만... 너는 진실을 찾기 위해 여기까지 온 것인가?"
""")
    print("  1. '당신을 구하러 왔습니다. 함께 진실을 밝힙시다.'")
    print("  2. '그래도 당신이 한 일은 용서받을 수 없다. 싸우자.'")
    print("  3. '진실은 알지만, 이 싸움은 피할 수 없다.'")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        if player.dark_points <= 2:
            return ending_redemption(player)
        else:
            print("""
  마왕이 당신의 손에서 흘러나오는 어둠의 기운을 보며 말한다.

  마왕: "...너도 어둠에 물들었군. 하지만 아직 선택할 수 있다.
         그 힘을 내려놓을 수 있는가?"
""")
            print("  1. 어둠의 힘을 내려놓는다  (공격력 -10, 구원 엔딩)")
            print("  2. 어둠의 힘을 유지한다    (어둠 엔딩)")
            c2 = _input_choice({1, 2})
            if c2 == 1:
                player.attack -= 10
                player.dark_points = 0
                print("  어둠에서 얻은 힘을 포기했다. 손이 맑아진다.")
                return ending_redemption(player)
            else:
                player.dark_points += 5
                return ending_dark(player)
    elif choice == 2:
        print("\n  마왕: '...그렇군. 그것이 네 대답이라면.'")
        return _final_battle(player)
    else:
        print("\n  마왕: '정직한 대답이군. 그럼 싸우자.'")
        return _final_battle(player)


def _final_battle(player):
    _divider("최종 전투")
    print("""
  마왕 젤드리온이 검은 번개를 두 손에 모은다.
  마왕: "후회하지 않는다. 이것이 내 운명이라면!"
""")
    print("  [전투 전 마지막 준비]")
    while True:
        print("  1. 전투 시작  2. 인벤토리  3. 장착  4. 캐릭터 정보  9. 지도 보기")
        cmd = _input_choice({1, 2, 3, 4, 9})
        if cmd == 1:
            break
        elif cmd == 2:
            show_inventory(player)
        elif cmd == 3:
            equip_item(player)
        elif cmd == 4:
            player.full_status()
        elif cmd == 9:
            show_world_map(player)

    if player.story_flags.get("rescued_prisoners"):
        print("\n  구출한 기사들이 문 밖에서 응원한다!")
        print("  '용사님, 힘내세요!' 사기가 오른다! (공격력 +3)")
        player.attack += 3

    enemy, key = spawn_enemy("dragon")
    enemy.name = "마왕 젤드리온"

    if player.story_flags.get("mercenary_hired"):
        print("  ▶ 고용한 용병이 적의 주의를 분산시킨다!")
        enemy.hp = int(enemy.hp * 0.75)
        player.story_flags["mercenary_hired"] = False

    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    if player.dark_points >= 5:
        return ending_dark(player)
    elif player.dark_points >= 3:
        return ending_shadow_hero(player)
    else:
        return ending_hero(player)


# ═══════════════════════════════════════════════════════
#  5가지 엔딩
# ═══════════════════════════════════════════════════════

def ending_hero(player):
    print("\n" + "★" * 52)
    print(f"""
  마왕이 쓰러졌다. 검은 번개가 멎고, 성 전체에서 어둠이 걷혔다.
  수십 년 만에 창밖으로 햇살이 쏟아져 들어온다.

  바닥에 쓰러진 젤드리온이 눈을 뜬다.
  분노로 가득했던 눈동자가 조금씩 맑아지고 있었다.

  젤드리온: "......네가... 이겼군."
             "......이 오랜 싸움이... 이렇게 끝나는군."
             잠시 침묵이 흘렀다.
             "......왕국이 다시 빛을 찾길... 바란다."
             "......그것만으로... 충분하다."

  손에서 힘이 빠지며 어둠의 마법이 완전히 소멸했다.

  왕국에 평화가 돌아왔다.
  {player.name}은(는) 아르카디아 왕국 최고의 영웅으로 기록되었다.
  레이저스 고문은 진실이 밝혀지며 처형되었고,
  젤드리온의 명예는 사후에야 회복되었다.

  ─ ★ 영웅 엔딩 ★ ─
  도달 레벨: {player.level}  /  최종 골드: {player.gold}G
  어둠 점수: {player.dark_points}
""")
    print("★" * 52)
    return "clear_hero"


def ending_redemption(player):
    print("\n" + "◆" * 52)
    print(f"""
  마왕 젤드리온이 천천히 두 손을 내렸다.
  어둠의 마법이 연기처럼 흩어진다.

  젤드리온: "......10년이다."
             "10년 동안 분노만을 품고 살았다."
             "그런데 너는... 싸우러 온 것이 아니었군."

  그가 긴 한숨을 내쉬었다.

  젤드리온: "...알겠다. 함께 진실을 밝혀보자."
             "이 늙은 마법사에게... 아직 할 일이 남아있는 것 같군."

  두 사람은 왕국으로 돌아갔다.
  봉인 반지의 실제 행방이 밝혀지고,
  레이저스의 음모가 만천하에 드러났다.

  젤드리온은 어둠의 마법을 스스로 봉인하고
  왕국 수석 마법사의 자리로 돌아왔다.

  왕국에는 전쟁 없이 평화가 찾아왔다.
  {player.name}은(는) 검이 아닌 진실과 대화로 세상을 구했다.

  ─ ◆ 구원 엔딩 [비밀 엔딩] ◆ ─
  도달 레벨: {player.level}  /  최종 골드: {player.gold}G
  진실 단서 수집 + 선한 선택으로 달성 가능한 엔딩
""")
    print("◆" * 52)
    return "clear_redemption"


def ending_shadow_hero(player):
    print("\n" + "▲" * 52)
    print(f"""
  마왕이 쓰러졌다.

  젤드리온이 쓰러지며 마지막으로 당신의 눈을 바라본다.
  그 눈빛에 두려움 같은 것이 섞여 있었다.

  젤드리온: "......너는..."
             "......나와 같은 눈을 하고 있군."
             "조심해라... 어둠은... 쉽게 놓아주지 않는다..."

  그의 말이 끊겼다.

  왕국 사람들은 {player.name}을(를) 영웅이라 불렀다.
  그러나 어떤 이들은 그 눈빛을 보며 두려움을 감추지 못했다.

  마음 한켠에는 어둠의 씨앗이 남아 있었다.
  그 씨앗이 언젠가 꽃을 피울지는... 아무도 모른다.

  ─ ▲ 그림자 영웅 엔딩 ▲ ─
  도달 레벨: {player.level}  /  어둠 점수: {player.dark_points}
  (어둠 점수 2 이하를 유지하면 순수 영웅 엔딩을 볼 수 있다)
""")
    print("▲" * 52)
    return "clear_shadow"


def ending_dark(player):
    print("\n" + "▓" * 52)
    print(f"""
  마왕이 쓰러졌다.

  바닥에 쓰러진 젤드리온이 힘겹게 고개를 들어 당신을 바라본다.
  그의 눈에 서서히 공포가 번졌다.

  젤드리온: "......너는..."
             "......설마... 처음부터..."

  {player.name}이(가) 천천히 왕좌로 걸어갔다.
  그리고 앉았다.

  젤드리온: "......이런 결말이..."
             "......나는... 경고가 되고 싶지 않았는데..."
             "......제발... 멈춰라..."

  마지막 숨을 거두며 젤드리온의 눈이 감겼다.

  {player.name}의 손가락 사이로 검은 기운이 흘러나오기 시작했다.
  왕국에는 새로운 어둠의 지배자가 탄생했다.

  ─ ▓ 어둠의 엔딩 ▓ ─
  도달 레벨: {player.level}  /  어둠 점수: {player.dark_points}
  (진실을 찾고 선한 선택을 해보세요...)
""")
    print("▓" * 52)
    return "clear_dark"


def ending_justice(player):
    print("\n" + "◇" * 52)
    print(f"""
  마왕의 눈이 크게 벌어진다.
  당신은 품에서 봉인 반지를 꺼내 그에게 건넸다.

  젤드리온: "......이것은... 봉인 반지..."
             "......정말로... 진실을 밝혔단 말인가..."
             "......라자러스를... 처단했다고..."

  반지가 그의 손에 닿는 순간, 어둠의 마법이 조용히 걷히기 시작한다.
  10년간의 분노가 천천히 눈물로 변해간다.

  젤드리온: "......미안하다. 이 땅의 사람들에게."
             "......어둠에 빠진 나를... 용서할 수 없겠지."

  {player.name}: "용서는 앞으로의 행동으로 보여주시면 됩니다."

  젤드리온이 처음으로 미소를 짓는다.

  젤드리온: "......고맙다. 정말로."

  봉인 반지의 빛이 성 전체를 밝힌다.
  어둠의 저주가 완전히 풀리고,
  마왕의 성이 본래 모습인 '별의 탑'으로 되돌아간다.

  젤드리온은 왕국 앞에 무릎을 꿇고 사죄했다.
  라자러스의 음모가 낱낱이 밝혀지고,
  왕은 젤드리온의 무죄를 공식 선언했다.

  {player.name}은(는) '정의의 수호자'라는 칭호를 받았다.
  젤드리온은 남은 생을 왕국 재건에 바쳤다.

  피 한 방울 흘리지 않고 악을 처단하고,
  무고한 자를 구하고, 세상에 정의를 바로 세운
  진정한 결말.

  ─ ◇ 정의 엔딩 [트루 엔딩] ◇ ─
  도달 레벨: {player.level}  /  최종 골드: {player.gold}G
  어둠 점수: {player.dark_points}
  라자러스 처단 + 봉인 반지 반환으로 달성한 가장 완전한 결말
""")
    print("◇" * 52)
    return "clear_justice"
