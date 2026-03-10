"""확장 지역 이벤트 (항구, 늪, 사막, 피라미드, 오아시스, 빙하, 엘프, 호수, 미궁, 용병, 어둠의 탑, 화산)"""

import random

from area_registry import register_event
from story_utils import _set_location, _input_choice, _divider, _pause, game_over
from combat import battle, spawn_enemy
from inventory import open_shop, open_merc_shop


# ═══════════════════════════════════════════════════════
#  항구
# ═══════════════════════════════════════════════════════

def _event_harbor(player):
    if not player.story_flags.get("harbor_visited"):
        _divider("포구 마을")
        print("""
  소금 냄새가 코를 찌르는 작은 항구 마을.
  선원들이 술집에서 떠들고, 부두에는 낡은 배들이 정박해 있다.
  벽에 낡은 현상 수배서가 붙어 있다: '해적단 두목 현상금 100G'
""")
        player.story_flags["harbor_visited"] = True

    while True:
        _divider("포구 마을")
        print("  1. 항구 상점 '파도의 보물'")
        print("  2. 선원 술집 (정보)")
        print("  3. 부두 낚시꾼")
        print("  4. 마을 탐색 종료")
        choice = _input_choice({1, 2, 3, 4})

        if choice == 1:
            open_shop(player)
        elif choice == 2:
            _npc_harbor_tavern(player)
        elif choice == 3:
            _npc_fisherman(player)
        else:
            return None


def _npc_harbor_tavern(player):
    if player.story_flags.get("harbor_tavern_done"):
        print("\n  선원: '해적들 조심하라고! 사막 쪽에서도 미라가 나온다더라.'")
        return
    _divider("선원 술집")
    print("""
  거친 선원이 럼주를 마시며 말한다.
  "최근 남쪽 바다에서 해적들이 날뛰고 있어.
   그리고 동쪽 사막... 피라미드에서 이상한 소리가 들린다더군.
   고대 파라오의 저주라나 뭐라나."
""")
    print("  1. 해적에 대해 더 묻는다")
    print("  2. 피라미드에 대해 더 묻는다")
    choice = _input_choice({1, 2})
    if choice == 1:
        player.story_flags["pirate_info"] = True
        print("""
  선원: "해적단 두목 '검은 수염'은 마왕의 부하라는 소문이 있어.
         늪지대 깊은 곳에 그놈들의 보물이 숨겨져 있다 카더라."

  ▶ [단서] 해적단과 늪지대 보물 정보 획득!
""")
    else:
        player.story_flags["pyramid_info"] = True
        print("""
  선원: "피라미드 안에 고대 파라오의 무기가 잠들어 있다더군.
         사하르 마을 원로에게 물어보면 입구를 알 수 있을 거야."

  ▶ [단서] 피라미드 정보 획득!
""")
    player.story_flags["harbor_tavern_done"] = True


def _npc_fisherman(player):
    if player.story_flags.get("fisherman_done"):
        print("\n  낚시꾼: '오늘은 잡히는 게 없네...'")
        return
    _divider("부두 낚시꾼")
    print("""
  백발의 노인이 조용히 낚싯대를 드리우고 있다.
  "어이, 여행자. 여기 앉아서 좀 쉬어가게."
""")
    print("  1. 함께 낚시를 한다")
    print("  2. 바쁘다고 거절한다")
    choice = _input_choice({1, 2})
    if choice == 1:
        player.heal(40)
        r = random.random()
        if r < 0.3:
            player.inventory.append("대형 포션")
            print("  큰 물고기를 잡았다! HP 40 회복, 대형 포션 획득!")
        elif r < 0.7:
            player.gold += 15
            print(f"  작은 물고기를 잡았다. HP 40 회복, 15G 획득!")
        else:
            player.inventory.append("해독제")
            print("  이상한 해조류를 건져 올렸다. HP 40 회복, 해독제 획득!")
    else:
        print("  노인: '바쁜 건 좋지만, 가끔은 쉬어가는 것도 중요하지.'")
    player.story_flags["fisherman_done"] = True


# ═══════════════════════════════════════════════════════
#  늪지대
# ═══════════════════════════════════════════════════════

def _event_swamp(player):
    if player.story_flags.get("swamp_cleared"):
        print("  늪은 이미 정리되었습니다. 안개가 옅어져 있다.")
        return None

    _divider("독안개 늪")
    print("""
  짙은 안개가 발목까지 내려앉은 늪지대.
  부글거리는 진흙 사이로 이상한 빛이 반짝인다.
  어딘가에서 낮게 웃는 소리가 들려온다...
""")
    print("  발밑에서 독사가 튀어나왔다!")
    enemy, key = spawn_enemy("swamp_snake")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    _divider("늪지 마녀의 오두막")
    print("""
  안개 사이로 구부러진 오두막이 보인다.
  문 앞에 늙은 마녀가 가마솥을 젓고 있다.

  마녀: "크크크... 손님이 왔군. 마왕을 무찌르러 간다고?"
         "내가 도와줄 수도 있지... 대가를 치른다면."
""")
    print("  1. 마녀의 제안을 듣는다")
    print("  2. 싸운다")
    print("  3. 무시하고 지나간다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        print("""
  마녀: "50G를 내면 늪의 비약을 만들어 주마.
         최대 HP가 영구적으로 30 오를 거야. 크크크."
""")
        print("  1. 50G를 낸다")
        print("  2. 거절한다")
        sub = _input_choice({1, 2})
        if sub == 1 and player.gold >= 50:
            player.gold -= 50
            player.max_hp += 30
            player.hp = min(player.hp + 30, player.max_hp)
            print("  마녀가 건넨 보라색 액체를 마시자 온몸에 힘이 솟는다!")
            print(f"  ▶ 최대 HP +30! (현재 {player.hp}/{player.max_hp})")
            player.story_flags["swamp_potion"] = True
        elif sub == 1:
            print(f"  골드가 부족하다. (보유: {player.gold}G)")
        else:
            print("  마녀: '흥, 나중에 후회할 걸.'")
    elif choice == 2:
        print("  마녀: '감히! 내 늪에서 까불겠다고?!'")
        enemy, key = spawn_enemy("swamp_witch")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
        player.story_flags["swamp_treasure"] = True
        player.inventory.append("마법 지팡이")
        print("  마녀가 남긴 가마솥에서 마법 지팡이를 발견했다!")
    else:
        player.dark_points += 1
        print("  마녀의 웃음소리가 등 뒤에서 따라온다...")

    player.story_flags["swamp_cleared"] = True
    print("  ▶ 독안개 늪 탐색 완료.")
    return None


# ═══════════════════════════════════════════════════════
#  사막 마을
# ═══════════════════════════════════════════════════════

def _event_desert_town(player):
    if not player.story_flags.get("desert_town_visited"):
        _divider("사하르 마을")
        print("""
  뜨거운 모래바람이 불어오는 사막의 교역 도시.
  향신료 냄새와 낙타 울음소리가 뒤섞인다.
  광장에는 알록달록한 천막 아래 상인들이 물건을 펼쳐놓고 있다.
""")
        player.story_flags["desert_town_visited"] = True
        player.story_flags["desert_explored"] = True

    while True:
        _divider("사하르 마을")
        print("  1. 사막 상점 '모래바람 시장'")
        print("  2. 사막 원로 카림")
        print("  3. 전갈 투기장 (보상 전투)")
        print("  4. 마을 탐색 종료")
        choice = _input_choice({1, 2, 3, 4})

        if choice == 1:
            open_shop(player)
        elif choice == 2:
            _npc_desert_elder(player)
        elif choice == 3:
            _desert_arena(player)
        else:
            return None


def _npc_desert_elder(player):
    if player.story_flags.get("desert_elder_done"):
        print("\n  카림: '피라미드 안에서 조심하게. 미라들은 빛을 두려워한다네.'")
        return
    _divider("사막 원로 카림")
    print("""
  흰 수건을 두른 노인이 차를 마시며 맞이한다.
  카림: "오, 먼 곳에서 온 여행자여. 피라미드에 관심이 있는가?"
""")
    print("  1. 피라미드에 대해 묻는다")
    print("  2. 마왕에 대해 묻는다")
    choice = _input_choice({1, 2})
    if choice == 1:
        player.story_flags["pyramid_entrance_info"] = True
        print("""
  카림: "피라미드는 고대 왕 네페르의 무덤이라네.
         그 안에는 파라오의 검이 봉인되어 있다고 전해지지.
         하지만 수호자가 지키고 있어. 만만한 상대가 아닐 걸세."

  ▶ [단서] 피라미드 입구와 파라오의 검 정보 획득!
""")
    else:
        player.story_flags["heard_maou_truth"] = True
        print("""
  카림: "마왕 젤드리온... 사실 그는 원래 이 사막 출신이라네.
         어릴 때부터 천재적인 마법사였지. 왕국에서 불러가서
         궁정 마법사가 됐는데... 그 뒤로는 안 좋은 일만 있었다더군."

  ▶ [중요 단서] 마왕의 과거에 대한 새로운 정보!
""")
    player.story_flags["desert_elder_done"] = True


def _desert_arena(player):
    _divider("전갈 투기장")
    if player.story_flags.get("arena_won"):
        print("  이미 투기장에서 승리했습니다. 관중들이 환호한다!")
        return
    print("""
  모래로 둘러싸인 원형 투기장.
  관중석에서 사람들이 함성을 지른다.
  사회자: "오늘의 도전자! 살아남으면 상금 80G!"
""")
    print("  1. 도전한다")
    print("  2. 그만둔다")
    choice = _input_choice({1, 2})
    if choice == 1:
        print("  거대한 사막 전갈이 모래에서 튀어나왔다!")
        enemy, key = spawn_enemy("sand_scorpion")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
        player.gold += 80
        player.story_flags["arena_won"] = True
        print("  관중이 열광한다! 상금 80G 획득!")
    else:
        print("  사회자: '겁쟁이는 물러가라~'")


# ═══════════════════════════════════════════════════════
#  피라미드
# ═══════════════════════════════════════════════════════

def _event_pyramid(player):
    if player.story_flags.get("pyramid_cleared"):
        print("  피라미드는 이미 탐색 완료되었습니다.")
        return None

    _divider("파라오의 피라미드")
    print("""
  거대한 석조 구조물이 사막 위에 우뚝 서 있다.
  입구에서 차가운 바람이 불어나온다.
  벽에 고대 문자가 새겨져 있다: '침입자에게 영원한 저주를.'
""")

    _divider("1층 - 함정 통로")
    print("  좁은 통로에 함정이 가득하다.")
    print("  1. 왼쪽 통로")
    print("  2. 오른쪽 통로")
    print("  3. 천장의 구멍으로 올라간다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        if random.random() < 0.4:
            dmg = random.randint(20, 35)
            player.hp = max(1, player.hp - dmg)
            print(f"  화살 함정! {dmg} 데미지.")
        else:
            player.gold += 30
            print("  벽 틈에서 30G를 발견!")
    elif choice == 2:
        print("  미라가 튀어나왔다!")
        enemy, key = spawn_enemy("mummy")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
    else:
        player.inventory.append("대형 포션")
        print("  숨겨진 방에서 대형 포션을 발견!")

    _divider("최심부 - 파라오의 관")
    print("""
  거대한 석관이 중앙에 놓여 있다.
  금빛 가면이 씌워진 관 뚜껑이 천천히 열리며...
  붕대로 감싼 거대한 전사가 일어선다.

  파라오 수호자: "이 무덤에 침입한 대가를... 치러라."
""")
    enemy, key = spawn_enemy("pharaoh")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    player.story_flags["pyramid_cleared"] = True
    player.inventory.append("파라오의 검")
    print("""
  수호자가 쓰러지며 석관 안에서 황금빛 검이 빛난다.

  ▶ [파라오의 검 획득] 고대 왕의 무기! 공격력이 매우 높다.
  ▶ 피라미드 공략 완료.
""")
    return None


# ═══════════════════════════════════════════════════════
#  오아시스
# ═══════════════════════════════════════════════════════

def _event_oasis(player):
    _divider("오아시스")
    print("""
  사막 한가운데, 야자수 그늘 아래 맑은 샘물이 흐른다.
  피로와 갈증이 한순간에 사라지는 듯하다.
""")
    player.hp = player.max_hp
    print(f"  ▶ HP 완전 회복! ({player.hp}/{player.max_hp})")

    if player.story_flags.get("oasis_merchant"):
        print("  떠돌이 상인이 아직 자리를 지키고 있다.")
        print("  1. 상인과 거래한다  2. 쉬고 간다")
        if _input_choice({1, 2}) == 1:
            open_shop(player)
        return None

    if random.random() < 0.5:
        print("""
  야자수 그늘에 낙타를 탄 상인이 쉬고 있다.
  상인: "오아시스에서 만나다니, 인연이군. 물건 좀 보겠나?"
""")
        player.story_flags["oasis_merchant"] = True
        open_shop(player)
    else:
        gold = random.randint(10, 40)
        player.gold += gold
        print(f"  샘물 바닥에서 반짝이는 동전을 발견했다. {gold}G 획득!")
    return None


# ═══════════════════════════════════════════════════════
#  빙하 동굴
# ═══════════════════════════════════════════════════════

def _event_ice_cave(player):
    if player.story_flags.get("ice_cave_cleared"):
        print("  빙하 동굴은 이미 탐색 완료되었습니다.")
        return None

    _divider("빙하 동굴")
    print("""
  얼어붙은 동굴 입구에서 한기가 몰려온다.
  벽면에 거대한 발톱 자국이 있다. 이곳에 무언가가 살고 있다...
  얼음 사이로 보석 같은 것이 반짝인다.
""")

    print("  얼음 벽이 갈라지며 골렘이 나타났다!")
    enemy, key = spawn_enemy("ice_golem")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    _divider("동굴 최심부")
    print("""
  동굴 깊숙한 곳에 얼어붙은 용이 잠들어 있다.
  서리 비룡 '프로스트'. 고대의 빙룡.
  얼음 비늘 사이로 차가운 숨결이 새어나온다.
""")
    print("  1. 깨우지 않고 보물만 가져간다 (민첩 필요)")
    print("  2. 정면으로 싸운다")
    print("  3. 돌아간다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        if player.job == "도적" or random.random() < 0.35:
            player.inventory.append("서리의 검")
            player.story_flags["ice_cave_cleared"] = True
            print("""
  숨을 죽이고 조심스럽게 보물에 손을 뻗었다.
  얼음 틈에서 서리가 서린 검을 꺼내 조용히 물러났다.

  ▶ [서리의 검 획득] 빙룡의 힘이 깃든 검!
  ▶ 빙하 동굴 탐색 완료.
""")
        else:
            print("  발을 헛디뎌 얼음이 깨졌다! 비룡이 눈을 떴다!")
            enemy, key = spawn_enemy("frost_wyrm")
            result = battle(player, enemy, key)
            if result == "lose":
                return game_over(player)
            player.inventory.append("서리의 검")
            player.story_flags["ice_cave_cleared"] = True
            print("  ▶ [서리의 검 획득] ▶ 빙하 동굴 탐색 완료.")
    elif choice == 2:
        print("  프로스트가 포효하며 일어선다!")
        enemy, key = spawn_enemy("frost_wyrm")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
        player.inventory.append("서리의 검")
        player.story_flags["ice_cave_cleared"] = True
        print("""
  비룡이 쓰러지며 동굴이 진동한다.
  비룡의 둥지에서 서리가 서린 검을 발견했다.

  ▶ [서리의 검 획득] 빙룡의 힘이 깃든 검!
  ▶ 빙하 동굴 탐색 완료.
""")
    else:
        print("  현명한 선택이다. 준비가 되면 다시 오자.")

    return None


# ═══════════════════════════════════════════════════════
#  엘프 마을
# ═══════════════════════════════════════════════════════

def _event_elf_village(player):
    _set_location(player, "elf_village")
    _divider("엘프 마을")

    if not player.story_flags.get("elf_village_visited"):
        player.story_flags["elf_village_visited"] = True
        print("""
  오래된 거목들 사이로 은빛 빛줄기가 스며드는 숨겨진 마을.
  나무 위에 지어진 집들, 풀잎처럼 가벼운 발소리...
  엘프 경비병이 당신을 경계하지만, 장로의 명으로 통과가 허락된다.

  경비병: "외부인이 이 숲에 오는 건 오랜만이군요.
           장로님이 기다리고 계십니다."
""")
    else:
        print("\n  엘프 마을에 다시 왔다. 나무 위의 불빛이 은은하게 빛난다.\n")

    while True:
        print("  1. 장로 아엘린드라   2. 엘프 치유사   3. 지식의 나무")
        print("  4. 아픈 엘프 아이     0. 떠난다")
        c = _input_choice({0, 1, 2, 3, 4})

        if c == 0:
            print("  경비병: '조심히 가시게. 숲이 당신을 지켜줄 것이오.'")
            break
        elif c == 1:
            _npc_elf_elder(player)
        elif c == 2:
            _npc_elf_healer(player)
        elif c == 3:
            _npc_knowledge_tree(player)
        elif c == 4:
            _elf_sick_child(player)

    return None


def _npc_elf_elder(player):
    if player.story_flags.get("lazarus_elf_clue"):
        print("""
  아엘린드라: "라자러스를 조심하게. 그는 교활하고 잔인한 자야.
               엘프의 봉인술을 악용한 대가를 반드시 치르게 해야 해."
""")
        return

    _divider("장로 아엘린드라")
    print("""
  은빛 머리카락의 엘프 장로가 고요한 눈으로 당신을 바라본다.

  아엘린드라: "오래 기다렸네, 인간의 용사여.
               내가 너에게 말해야 할 것이 있다."

  아엘린드라: "15년 전, 라자러스라는 인간이 이 마을을 찾아왔네.
               자신을 학자라 소개했지. 봉인술을 연구하겠다고 했어.
               우리는 순수한 학구열인 줄 알았고, 지식을 나눠주었지."

  아엘린드라: "하지만 그가 떠난 뒤, 왕국에서 끔찍한 소식이 들려왔네.
               봉인 반지가 사라지고, 한 마법사가 누명을 쓰고 추방되었다고.
               ...그 마법사가 젤드리온이었네."

  아엘린드라: "라자러스는 우리에게서 배운 봉인술로
               봉인 반지의 마력을 조종할 방법을 알아낸 것이야.
               모든 것은 그의 계획이었네."
""")
    player.story_flags["lazarus_elf_clue"] = True
    print("  ▶ [라자러스의 엘프 단서] 획득! 라자러스의 과거가 밝혀졌다.")

    if player.story_flags.get("heard_maou_truth") or player.story_flags.get("found_diary"):
        print("""
  아엘린드라: "...너는 이미 진실의 일부를 알고 있군.
               모든 퍼즐이 맞아떨어지고 있어."
""")


def _npc_elf_healer(player):
    if player.story_flags.get("elf_healer_done"):
        print("\n  치유사: '빛의 가호가 당신과 함께하길.'")
        player.hp = player.max_hp
        print(f"  HP가 완전히 회복되었습니다. ({player.hp}/{player.max_hp})")
        return

    _divider("엘프 치유사")
    print("""
  빛나는 샘물 앞에 앉아있는 치유사가 미소 짓는다.

  치유사: "여행자여, 당신의 몸에 쌓인 피로가 느껴지는군요.
           이 샘의 빛으로 치유해 드리지요."
""")
    player.hp = player.max_hp
    player.max_hp += 15
    player.hp = player.max_hp
    player.story_flags["elf_healer_done"] = True
    print(f"  ▶ HP 완전 회복! 최대 HP +15 증가! ({player.hp}/{player.max_hp})")

    if player.job == "마법사":
        player.inventory.append("엘프의 로브")
        print("  치유사: '마법사시군요. 이 로브가 도움이 될 거예요.'")
        print("  ▶ [엘프의 로브] 획득! (방어력 +6)")


def _npc_knowledge_tree(player):
    _divider("지식의 나무")
    print("""
  거대한 고목의 내부에 마련된 서재.
  수천 년의 지식이 나뭇잎 문자로 기록되어 있다.
""")

    if player.story_flags.get("seal_magic_understood"):
        print("  이미 봉인술에 대한 이해를 완료했다.")
        return

    has_clue = (player.story_flags.get("found_truth_book") or
                player.story_flags.get("found_diary") or
                player.story_flags.get("lazarus_elf_clue"))

    if has_clue:
        print("""
  고대 엘프 문헌과 당신이 가진 단서를 교차 분석한다...

  "봉인술의 핵심은 정신적 연결이다.
   시전자가 봉인 대상과 마력으로 연결되어 있어야 한다.
   즉, 라자러스의 봉인 마법을 깨뜨리려면
   그 연결 자체를 끊어야 한다."

  ▶ [봉인술 이해] 획득! 라자러스의 방어막을 약화시킬 수 있다!
""")
        player.story_flags["seal_magic_understood"] = True
    else:
        print("  고대 문헌이 잔뜩 있지만, 관련 단서 없이는 이해하기 어렵다.")
        print("  (진실에 대한 단서를 먼저 찾아야 할 것 같다.)")


def _elf_sick_child(player):
    if player.story_flags.get("elf_child_done"):
        if player.story_flags.get("blessed_by_elves"):
            print("\n  엘프 아이가 밝게 웃으며 손을 흔든다. '고마워요, 영웅님!'")
        else:
            print("\n  아이는 여전히 아프다. 엘프들의 시선이 차갑다.")
        return

    _divider("아픈 엘프 아이")
    print("""
  작은 침대에 엘프 아이가 누워 있다.
  어둠의 저주에 걸려 얼굴이 창백하다.

  어머니: "부디... 이 아이를 도와주실 수 없나요?
           대형 포션의 치유력이면 저주를 풀 수 있다고 합니다."
""")
    print("  1. 대형 포션으로 치료한다 (대형 포션 소모)")
    print("  2. 안타깝지만 지나친다")
    c = _input_choice({1, 2})

    player.story_flags["elf_child_done"] = True
    if c == 1:
        if "대형 포션" in player.inventory:
            player.inventory.remove("대형 포션")
            player.dark_points = max(0, player.dark_points - 1)
            player.story_flags["blessed_by_elves"] = True
            print("""
  포션의 빛이 아이를 감싸고, 저주의 기운이 소멸한다.
  아이가 눈을 뜨며 미소 짓는다.

  어머니: "감사합니다... 정말 감사합니다!"
  장로: "인간의 선한 마음에 엘프의 축복을 내리겠네."

  ▶ 어둠 점수 -1
  ▶ [엘프의 축복] 획득!
""")
        else:
            print("  대형 포션이 없습니다. 나중에 다시 와보자.")
            player.story_flags["elf_child_done"] = False
    else:
        player.dark_points += 1
        print("""
  아이를 두고 돌아섰다.
  뒤에서 어머니의 흐느낌이 들린다.

  ▶ 어둠 점수 +1
""")


# ═══════════════════════════════════════════════════════
#  달빛 호수
# ═══════════════════════════════════════════════════════

def _event_moonlight_lake(player):
    _set_location(player, "moonlight_lake")
    _divider("달빛 호수")
    print("""
  은빛 물결이 일렁이는 신비로운 호수.
  수면 위로 달빛이 비치며 주변이 환하게 빛난다.
  물가에 하얀 꽃이 가득 피어 있다.
""")
    player.hp = player.max_hp
    print(f"  호수의 기운으로 HP가 완전히 회복되었다. ({player.hp}/{player.max_hp})\n")

    while True:
        print("  1. 호수에 다가간다   2. 물가를 탐색한다   0. 떠난다")
        c = _input_choice({0, 1, 2})

        if c == 0:
            break
        elif c == 1:
            _npc_undine(player)
        elif c == 2:
            _explore_lakeshore(player)
    return None


def _npc_undine(player):
    knows_truth = (player.story_flags.get("heard_maou_truth") or
                   player.story_flags.get("found_truth_book") or
                   player.story_flags.get("found_diary"))

    if player.story_flags.get("witnessed_betrayal"):
        print("""
  운디네: "기억을 잊지 마세요. 진실이 당신의 무기가 될 것입니다."
""")
        return

    if player.story_flags.get("saw_zeldion_past") and knows_truth:
        _divider("운디네의 두 번째 환영")
        print("""
  물의 정령이 다시 나타나 슬픈 눈으로 당신을 바라본다.

  운디네: "진실을 알게 되었군요. 그렇다면...
           그 시절의 마지막 기억을 보여드리겠습니다."

  수면에 새로운 환영이 펼쳐진다.

  ─── 15년 전, 왕궁 ───
  라자러스가 밀실에서 봉인 반지를 숨기는 모습.
  그리고 왕 앞에서 젤드리온을 고발하는 장면.
  쇠사슬에 묶인 젤드리온의 절규가 수면 위로 울려 퍼진다.

  젤드리온: "나는 아무것도 하지 않았다! 라자러스가...!"
  왕: "증거가 명확하다. 추방하라."

  ─── 환영 종료 ───

  운디네: "이것이 모든 것의 시작이었습니다."
""")
        player.story_flags["witnessed_betrayal"] = True
        print("  ▶ [배신의 증인] 젤드리온의 억울한 추방을 목격했다.")
        return

    if not player.story_flags.get("saw_zeldion_past"):
        _divider("운디네")
        print("""
  물속에서 푸른 빛의 여인이 솟아오른다.

  운디네: "환영하오, 여행자여. 나는 이 호수의 수호자 운디네.
           세상의 슬픈 기억을 간직하는 것이 내 역할이지."

  운디네: "당신에게 보여줄 것이 있소."

  수면 위로 환영이 펼쳐진다.

  ─── 20년 전, 아르카디아 ───
  젊은 마법사가 홍수에서 마을 사람들을 구하고 있다.
  모두가 그를 '젤드리온 님!'이라 부르며 감사해 한다.
  밝은 눈의 청년은 환하게 웃으며 대답한다.

  젤드리온: "다치신 분은 없나요? 모두 괜찮다면 다행입니다."

  ─── 환영 종료 ───

  운디네: "그것이... 마왕이 되기 전의 젤드리온이었소."
""")
        player.story_flags["saw_zeldion_past"] = True
        print("  ▶ [젤드리온의 과거] 마왕의 선한 과거를 목격했다.")

    print("""
  운디네: "젤드리온을 만나면 어찌할 것인가?"
""")
    print("  1. '구해보겠습니다'")
    print("  2. '그는 벌을 받아야 합니다'")
    print("  3. '그의 힘을 빼앗겠습니다'")
    c = _input_choice({1, 2, 3})

    if c == 1:
        player.dark_points = max(0, player.dark_points - 1)
        print("\n  운디네: '그 마음이라면 분명 길이 열릴 것이오.'")
        print("  ▶ 어둠 점수 -1")
    elif c == 2:
        print("\n  운디네: '...그렇소. 그것도 하나의 답이겠지.'")
    else:
        player.dark_points += 2
        print("\n  운디네: '...어둠의 유혹을 조심하시오.'")
        print("  ▶ 어둠 점수 +2")


def _explore_lakeshore(player):
    if not player.story_flags.get("moonlight_trinket_found"):
        if random.random() < 0.6:
            player.story_flags["moonlight_trinket_found"] = True
            player.inventory.append("달빛 장신구")
            player.dark_points = max(0, player.dark_points - 1)
            print("""
  물가를 거닐다 은빛으로 빛나는 장신구를 발견했다.
  손에 닿는 순간 마음이 맑아지는 느낌이 든다.

  ▶ [달빛 장신구] 획득!
  ▶ 어둠 점수 -1
""")
        else:
            print("  물가를 둘러보았지만 특별한 것은 없었다.")
    else:
        if random.random() < 0.3:
            gold = random.randint(10, 30)
            player.gold += gold
            print(f"  물가에서 반짝이는 금화를 발견했다! (+{gold}G)")
        else:
            print("  평온한 물가를 거닐었다. 마음이 편안해진다.")


# ═══════════════════════════════════════════════════════
#  지하 미궁
# ═══════════════════════════════════════════════════════

def _event_labyrinth(player):
    _set_location(player, "labyrinth")

    if player.story_flags.get("labyrinth_cleared"):
        print("\n  이미 탐색한 미궁이다. 골렘의 잔해만 남아있다.")
        return None

    _divider("지하 미궁")
    print("""
  폐허 지하에서 발견한 숨겨진 계단.
  끝이 보이지 않는 어둠 속으로 내려간다.
  벽에 라자러스의 문장이 희미하게 새겨져 있다...

  "이곳은 라자러스가 증거를 숨기기 위해 만든 미궁인가?"
""")
    _pause()

    # 1층
    _divider("미궁 1층 - 세 갈래 길")
    print("""
  세 갈래 길이 나타난다.
  1. 왼쪽 통로 (어둡고 좁다)
  2. 중앙 통로 (정면에 빛이 보인다)
  3. 오른쪽 통로 (바닥에 금화가 흩어져 있다)
""")
    c = _input_choice({1, 2, 3})

    if c == 1:
        if random.random() < 0.4:
            dmg = 25
            player.hp = max(1, player.hp - dmg)
            print(f"  함정 발동! 천장에서 돌이 떨어진다! (-{dmg} HP)")
        else:
            player.gold += 50
            print("  좁은 통로 끝에 숨겨진 보물함이 있다! (+50G)")
    elif c == 2:
        print("\n  중앙 통로에서 미궁 수호자가 나타난다!")
        enemy, key = spawn_enemy("labyrinth_guardian")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
    else:
        player.inventory.append("대형 포션")
        player.gold += 30
        print("  보물함에서 대형 포션과 금화를 발견했다! (+대형 포션, +30G)")

    _pause()

    # 2층
    _divider("미궁 2층 - 봉인의 방")
    has_clue = (player.story_flags.get("found_diary") or
                player.story_flags.get("lazarus_elf_clue"))
    print("""
  석판에 글자가 새겨져 있다.
  "봉인의 열쇠는 무엇인가?"
""")

    if has_clue:
        print("  (당신이 가진 단서를 바탕으로 답을 알 수 있다...)")
        print("  ▶ 자동 해결! 석판이 빛나며 문이 열린다.")
    else:
        print("  1. '진실'   2. '힘'   3. '용기'")
        c = _input_choice({1, 2, 3})
        if c == 1:
            print("  정답! 석판이 빛나며 문이 열린다.")
        else:
            dmg = 30
            player.hp = max(1, player.hp - dmg)
            print(f"  오답! 함정이 발동한다! (-{dmg} HP)")
            print("  ...그래도 문은 천천히 열렸다.")

    _pause()

    # 저주의 보물함
    _divider("저주의 보물함")
    print("""
  구석에 검은 기운이 감도는 보물함이 있다.
  강한 힘의 기운이 느껴진다... 하지만 불길하다.
""")
    print("  1. 연다 (강한 힘을 얻지만 대가가 있을 수 있다)")
    print("  2. 부순다 (안전한 선택)")
    print("  3. 무시한다")
    c = _input_choice({1, 2, 3})

    if c == 1:
        player.attack += 8
        player.dark_points += 2
        print("""
  검은 기운이 당신의 몸으로 스며든다.
  힘이 솟아오르지만, 마음 한 구석이 어두워진다.

  ▶ 공격력 +8!
  ▶ 어둠 점수 +2
""")
    elif c == 2:
        player.inventory.append("대형 포션")
        print("\n  보물함을 부수자 안에서 대형 포션이 나왔다.")
    else:
        print("\n  불길한 느낌을 무시하고 지나쳤다.")

    _pause()

    # 3층: 보스
    _divider("미궁 최하층 - 봉인의 수호자")
    print("""
  거대한 석조 골렘이 천장까지 닿는 크기로 일어선다!
  눈에서 붉은 빛이 번뜩인다.

  골렘: "[...침...입...자...처...단...]"
""")
    enemy, key = spawn_enemy("labyrinth_golem")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    player.inventory.append("봉인의 검")
    player.story_flags["labyrinth_cleared"] = True
    print("""
  골렘이 부서지며 뒤에 숨겨진 석실이 드러난다.
  대좌 위에 빛나는 검이 놓여 있다.

  "이 검은... 봉인의 힘이 서려 있다."

  ▶ [봉인의 검] 획득! (공격력 +20, 라자러스에게 특효)
  ▶ 지하 미궁 공략 완료!
""")
    return None


# ═══════════════════════════════════════════════════════
#  용병단 야영지
# ═══════════════════════════════════════════════════════

def _event_mercenary_camp(player):
    _set_location(player, "mercenary_camp")
    _divider("용병단 야영지")

    if not player.story_flags.get("merc_camp_visited"):
        player.story_flags["merc_camp_visited"] = True
        print("""
  울타리로 둘러싸인 야영지. 무장한 용병들이 훈련 중이다.
  모닥불 옆에서 덩치 큰 남자가 고기를 굽고 있다.

  경비병: "뭐야, 새로운 놈인가? 대장님에게 가봐."
""")
    else:
        print("\n  용병 야영지에 다시 왔다. 모닥불이 따뜻하다.\n")

    while True:
        print("  1. 대장 베론   2. 용병 대장장이   3. 훈련장")
        print("  4. 용병의 소문  0. 떠난다")
        c = _input_choice({0, 1, 2, 3, 4})

        if c == 0:
            print("  베론: '조심해서 가라, 친구.'")
            break
        elif c == 1:
            _npc_captain_veron(player)
        elif c == 2:
            open_merc_shop(player)
        elif c == 3:
            _merc_training(player)
        elif c == 4:
            _merc_rumor(player)

    return None


def _npc_captain_veron(player):
    _divider("대장 베론")

    if not player.story_flags.get("dark_tower_hint"):
        print("""
  덩치 큰 남자가 고기를 뜯으며 당신을 위아래로 훑어본다.

  베론: "오, 마왕을 치러 간다고? 대단하군. 나도 한때 왕국군이었지.
         지금은... 뭐, 자유로운 몸이야. 하하."

  베론: "한 가지 정보를 주지. 마왕의 성 동북쪽에 수상한 탑이 있더군.
         왕의 고문이라는 자가 드나드는 걸 봤어.
         라자러스라고 했나? 뭔가를 숨기고 있는 게 분명해."
""")
        player.story_flags["dark_tower_hint"] = True
        print("  ▶ [어둠의 탑 정보] 라자러스의 은신처에 대한 정보를 얻었다!")
    else:
        print("\n  베론: '아직 그 탑에 안 가봤나? 뭔가 있을 거야.'\n")

    if not player.story_flags.get("mercenary_hired"):
        print("""
  베론: "100G를 내면 부하를 하나 빌려주지.
         다음 큰 싸움에서 적의 사기를 꺾어줄 거야."
""")
        print("  1. 100G를 내고 용병을 고용한다")
        print("  2. 거절한다")
        c = _input_choice({1, 2})
        if c == 1:
            if player.gold >= 100:
                player.gold -= 100
                player.story_flags["mercenary_hired"] = True
                print("  베론: '좋아! 크레인을 보내줄게. 든든한 녀석이야.'")
                print(f"  ▶ [용병 고용] 다음 보스전에서 적 HP -25%! (잔여: {player.gold}G)")
            else:
                print(f"  골드가 부족합니다. (필요: 100G, 보유: {player.gold}G)")
        else:
            print("  베론: '필요하면 언제든 와.'")
    else:
        print("  베론: '크레인이 준비되어 있어. 든든하지?'")


def _merc_training(player):
    if player.story_flags.get("training_done"):
        print("\n  훈련 교관: '이미 한 번 훈련했잖아. 더는 가르칠 게 없어.'")
        return

    _divider("훈련장")
    print("""
  훈련 교관: "60G면 특훈시켜 주지. 뭘 강화할래?"
""")
    print("  1. 공격 훈련 (공격력 +3 영구)")
    print("  2. 방어 훈련 (방어력 +2 영구)")
    print("  0. 그만두다")
    c = _input_choice({0, 1, 2})

    if c == 0:
        return
    if player.gold < 60:
        print(f"  골드가 부족합니다. (필요: 60G, 보유: {player.gold}G)")
        return

    player.gold -= 60
    player.story_flags["training_done"] = True
    if c == 1:
        player.attack += 3
        print(f"  고된 훈련 끝에 공격력이 올랐다! (공격력 +3, 잔여: {player.gold}G)")
    else:
        player.defense += 2
        print(f"  방어 훈련으로 단단해졌다! (방어력 +2, 잔여: {player.gold}G)")


def _merc_rumor(player):
    _divider("용병의 소문")
    if player.story_flags.get("merc_rumor_done"):
        print("  이미 소문을 들었다. 새로운 이야기는 없다.")
        return

    player.story_flags["merc_rumor_done"] = True
    print("""
  용병 하나가 조심스럽게 속삭인다.

  용병: "...있잖아, 전쟁이 끝나면 우리 일부가 근처 마을을 약탈할 계획이야.
         대장은 모르는 일이지. 어차피 전쟁통에 누가 알겠어?"
""")
    print("  1. 마을에 경고한다 (용병 고용을 잃을 수 있다)")
    print("  2. 침묵한다")
    print("  3. '나도 동참하겠다'")
    c = _input_choice({1, 2, 3})

    if c == 1:
        player.dark_points = max(0, player.dark_points - 1)
        if player.story_flags.get("mercenary_hired"):
            player.story_flags["mercenary_hired"] = False
            print("""
  당신은 경비병을 통해 마을에 경고를 보냈다.
  소식을 들은 베론이 약탈 계획자들을 처벌했지만,
  고용한 용병도 그 일에 연루되어 있었다.

  ▶ 어둠 점수 -1
  ▶ 용병 고용이 취소되었다.
""")
        else:
            print("""
  당신은 경비병을 통해 마을에 경고를 보냈다.
  약탈 계획이 사전에 저지되었다.

  ▶ 어둠 점수 -1
""")
    elif c == 2:
        player.dark_points += 1
        print("\n  ...알면서도 침묵했다.\n  ▶ 어둠 점수 +1")
    else:
        player.dark_points += 3
        player.gold += 100
        print("""
  용병이 히죽 웃는다. "좋아, 네 몫은 보장할게."
  주머니에 선불금이 쑤셔 넣어진다.

  ▶ 어둠 점수 +3
  ▶ 100G 획득
""")


# ═══════════════════════════════════════════════════════
#  어둠의 탑
# ═══════════════════════════════════════════════════════

def _event_dark_tower(player):
    _set_location(player, "dark_tower")

    if player.story_flags.get("lazarus_defeated"):
        print("\n  어둠의 탑은 이미 비어 있다. 라자러스의 잔재만 남아있다.")
        return None

    _divider("어둠의 탑")
    print("""
  마왕의 성 뒤편, 검은 바위산 위에 솟은 뒤틀린 탑.
  입구에서 불길한 기운이 흘러나온다.
  이곳이 왕의 고문 라자러스의 은신처인가...
""")
    print("  1. 탑에 진입한다")
    print("  2. 돌아간다")
    c = _input_choice({1, 2})
    if c == 2:
        return None

    # 1층
    _divider("1층 - 그림자 기사")
    print("""
  계단을 오르자 검은 갑옷의 기사가 길을 막는다.
  갑옷 안에서 보랏빛 연기가 피어오른다.
""")
    enemy, key = spawn_enemy("shadow_knight")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    print("""
  기사의 갑옷이 부서지며 안에 아무것도 없다.
  라자러스의 그림자 마법으로 만들어진 인형이었다.
""")
    _pause()

    # 2층
    _divider("2층 - 라자러스의 서재")
    print("""
  책상 위에 일기장이 펼쳐져 있다.

  ───────────────────────────────────────
  ...계획대로다. 봉인 반지를 손에 넣었고,
  젤드리온에게 죄를 뒤집어씌웠다.
  왕은 나를 의심하지 않는다. 어리석은 늙은이.

  젤드리온이 어둠에 빠지면, 왕국은 혼란에 빠질 것이고,
  그 혼란 속에서 나는 진정한 권력을 잡을 것이다.

  엘프 마을에서 배운 봉인술이 핵심이었다.
  봉인 반지의 마력을 내 것으로 만드는 것...
  곧 완성될 것이다.
  ───────────────────────────────────────
""")
    player.story_flags["lazarus_truth_complete"] = True
    print("  ▶ [라자러스의 진실] 음모의 전모가 밝혀졌다!")

    print("""
  서재 구석의 감옥에 엘프가 갇혀 있다.
  "도... 도와주세요... 라자러스가 엘프 마을의 정보를 캐내려..."
""")
    print("  1. 해방한다")
    print("  2. 무시한다")
    c = _input_choice({1, 2})
    if c == 1:
        print("  엘프: '감사합니다! 장로님께 소식을 전하겠습니다!'")
    else:
        player.dark_points += 1
        print("  ...지나쳤다.\n  ▶ 어둠 점수 +1")

    _pause()

    # 3층
    _divider("3층 - 라자러스와의 대면")
    print("""
  최상층. 넓은 방 중앙에 흰 머리의 남자가 서 있다.
  미소를 띤 채 유유히 와인잔을 돌린다.

  라자러스: "오, 여기까지 왔나. 대단하군."
             "알겠나? 이 모든 것은 내 계획대로야.
              젤드리온은 내 꼭두각시에 불과하지.
              마왕이 왕국을 위협하는 한, 왕은 나에게 의존할 수밖에 없어."
""")
    print("  1. '증거는 모두 모았다. 자수해라.'")
    print("  2. '말은 됐다. 싸우자.'")
    print("  3. '함께 왕국을 지배하자.'")
    c = _input_choice({1, 2, 3})

    enemy, key = spawn_enemy("shadow_lazarus")

    if c == 1:
        has_full_info = (player.story_flags.get("lazarus_elf_clue") and
                         player.story_flags.get("seal_magic_understood"))
        if has_full_info:
            print("""
  당신은 엘프에게서 배운 봉인술의 약점을 간파했다.
  라자러스의 보호막이 금이 간다!

  라자러스: "뭐...?! 어떻게 봉인술의 구조를...?!"
""")
            enemy.hp = int(enemy.hp * 0.6)
            print(f"  ▶ 라자러스의 실드 약화! (HP {enemy.hp})")
        else:
            print("\n  라자러스: '증거? 하! 그래봤자 네가 죽으면 아무 소용없지.'")

    elif c == 3:
        player.dark_points += 5
        print("""
  라자러스가 크게 웃는다.

  라자러스: "재미있군. 하지만 왕좌에는 한 명이면 충분하다."

  ▶ 어둠 점수 +5
""")

    if player.story_flags.get("mercenary_hired"):
        print("  ▶ 고용한 용병 크레인이 뒤에서 기습한다!")
        enemy.hp = int(enemy.hp * 0.75)
        print(f"  ▶ 라자러스 HP 감소! ({enemy.hp})")
        player.story_flags["mercenary_hired"] = False

    equipped_weapon = getattr(player, 'equipped_weapon', None)
    if equipped_weapon and equipped_weapon.get('name') == '봉인의 검':
        print("  ▶ 봉인의 검이 라자러스에게 반응하며 빛난다! (추가 데미지)")
        player.attack += 10

    result = battle(player, enemy, key)

    if equipped_weapon and equipped_weapon.get('name') == '봉인의 검':
        player.attack -= 10

    if result == "lose":
        return game_over(player)

    player.story_flags["lazarus_defeated"] = True
    player.inventory.append("봉인 반지")
    print("""
  라자러스가 무릎을 꿇는다.
  품에서 반짝이는 반지가 굴러 떨어진다.

  라자러스: "...이런 결말이..."

  ▶ [봉인 반지] 획득! 왕의 봉인 반지. 모든 것의 시작이자 끝.
  ▶ 어둠의 탑 공략 완료!
""")
    return None


# ═══════════════════════════════════════════════════════
#  화산 지대
# ═══════════════════════════════════════════════════════

def _event_volcano(player):
    _set_location(player, "volcano")

    if player.story_flags.get("volcano_cleared"):
        print("\n  이미 탐색한 화산 지대이다. 대장간의 불꽃만 조용히 타고 있다.")
        return None

    _divider("화산 지대")
    print("""
  열기가 발밑에서부터 치솟는 화산 지대.
  검붉은 용암이 바위 틈으로 흘러내리고,
  멀리서 화산이 붉은 연기를 뿜고 있다.
""")
    _pause()

    print("  바위 뒤에서 화염 정령이 솟아올랐다!")
    enemy, key = spawn_enemy("fire_elemental")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)
    _pause()

    _divider("분기점")
    print("""
  앞에 두 갈래 길이 나타난다.
  1. 분화구 능선을 오른다 (위험하지만 보상이 크다)
  2. 동굴로 들어간다 (비교적 안전)
""")
    c = _input_choice({1, 2})

    if c == 1:
        print("\n  하늘에서 용암 드레이크가 급강하한다!")
        enemy, key = spawn_enemy("lava_drake")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
    else:
        print("\n  동굴 속에서 또 다른 화염 정령이 나타난다!")
        enemy, key = spawn_enemy("fire_elemental")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
        if random.random() < 0.3:
            dmg = 25
            player.hp = max(1, player.hp - dmg)
            print(f"  용암 함정! 발밑의 바위가 무너진다! (-{dmg} HP)")

    _pause()

    _divider("화산 대장간")
    print("""
  동굴 깊숙한 곳에 고대의 대장간이 타오르고 있다.
  거대한 화염이 인간 형상을 취하며 말한다.

  대장간 정령: "무엇을 원하느냐, 필멸자여.
                이 불꽃에는 만물을 다시 만드는 힘이 있다."
""")

    if "파라오의 검" in player.inventory:
        print("  ▶ 파라오의 검을 소지하고 있다!")
        print("  1. 파라오의 검을 강화한다 (→ 염화의 검, 공격력 +30)")
        print("  2. 그냥 둔다 (대신 용암 갑옷을 받는다)")
        c = _input_choice({1, 2})
        if c == 1:
            player.inventory.remove("파라오의 검")
            player.inventory.append("염화의 검")
            if player.equipped_weapon and player.equipped_weapon.get("name") == "파라오의 검":
                from inventory import item_info
                player.equipped_weapon = item_info("염화의 검")
            print("""
  파라오의 검이 용암 속에 담겨진다.
  불꽃이 검신을 감싸며 새로운 형태로 재탄생한다!

  ▶ [염화의 검] 획득! (공격력 +30) 화산의 불꽃으로 단련된 전설의 검!
""")
        else:
            player.inventory.append("용암 갑옷")
            print("\n  ▶ [용암 갑옷] 획득! (방어력 +12)")
    else:
        player.inventory.append("용암 갑옷")
        print("""
  대장간 정령: "강화할 무기가 없군. 대신 이것을 가져가라."

  ▶ [용암 갑옷] 획득! (방어력 +12)
""")

    _divider("갇힌 광부")
    print("""
  대장간 옆 통로에서 신음이 들린다.
  용암에 길이 막힌 광부가 갇혀 있다.

  광부: "제발... 여기서 나가게 해주세요..."
""")
    print("  1. 구출한다 (HP -20)")
    print("  2. 무시한다")
    c = _input_choice({1, 2})

    if c == 1:
        player.hp = max(1, player.hp - 20)
        player.dark_points = max(0, player.dark_points - 1)
        player.gold += 40
        print(f"""
  뜨거운 바위를 치우며 광부를 구했다. (-20 HP)

  광부: "감사합니다! 이건 제가 모은 금화입니다."
  ▶ +40G
  ▶ 어둠 점수 -1
""")
    else:
        player.dark_points += 1
        player.gold += 60
        print("""
  ...지나쳤다.
  통로 반대편에 광부가 버린 금화 주머니가 있다.
  ▶ +60G
  ▶ 어둠 점수 +1
""")

    player.story_flags["volcano_cleared"] = True
    print("  ▶ 화산 지대 탐색 완료!")
    return None


# ─── 이벤트 자동 등록 ────────────────────────────────
for _zone, _fn in [
    ("harbor", _event_harbor),
    ("swamp", _event_swamp),
    ("desert_town", _event_desert_town),
    ("pyramid", _event_pyramid),
    ("oasis", _event_oasis),
    ("ice_cave", _event_ice_cave),
    ("elf_village", _event_elf_village),
    ("moonlight_lake", _event_moonlight_lake),
    ("labyrinth", _event_labyrinth),
    ("mercenary_camp", _event_mercenary_camp),
    ("dark_tower", _event_dark_tower),
    ("volcano", _event_volcano),
]:
    register_event(_zone, _fn)
