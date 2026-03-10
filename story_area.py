"""기본 지역 이벤트 (마을, 숲, 동굴, 강가, 폐허, 산적, 성문, 성 내부, 왕좌)"""

import random

from area_registry import register_event
from story_utils import _set_location, _input_choice, _divider, _pause, game_over
from combat import battle, spawn_enemy
from inventory import open_shop, show_inventory, equip_item
from map import show_castle_map


# ═══════════════════════════════════════════════════════
#  마을
# ═══════════════════════════════════════════════════════

def _event_town(player):
    if not player.story_flags.get("town_event_done"):
        _divider("여정의 시작")
        print("""
  빛나는 왕도 '아르카디아'. 석 달 전부터 불길한 일들이 이어지고 있다.
  장로 갈리아르가 당신에게 재앙의 근원을 끊어달라고 부탁했다.
""")
        player.story_flags["town_event_done"] = True

    while True:
        _divider("아르카디아 마을")
        print("  1. 상점 '황금 방패'")
        print("  2. 대장장이 브론")
        print("  3. 선술집 '술꾼의 안식처'")
        print("  4. 성당")
        print("  5. 골목 어린아이")
        print("  6. 마을 탐색 종료")
        choice = _input_choice({1, 2, 3, 4, 5, 6})
        if choice == 1:
            open_shop(player)
        elif choice == 2:
            _npc_blacksmith(player)
        elif choice == 3:
            _npc_tavern(player)
        elif choice == 4:
            _npc_priest(player)
        elif choice == 5:
            _npc_child(player)
        else:
            return None


def _npc_blacksmith(player):
    if player.story_flags.get("blacksmith_done"):
        print("\n  브론: '카이를 부탁드리오. 꼭 돌아오게 해주시오.'")
        return
    _divider("대장장이 브론")
    print("""
  근육질의 대장장이가 모루를 두드리다 멈추며 말했다.
  "오, 용사라는 분이군요. 실은 부탁이 있소.
   숲 속 광산에서 아들 '카이'가 이틀째 연락이 없소.
   찾아주신다면 꼭 보답하겠소."
""")
    print("  1. 부탁을 수락한다")
    print("  2. 거절한다")
    choice = _input_choice({1, 2})
    if choice == 1:
        player.story_flags["blacksmith_quest"] = True
        print("  브론: '고맙소! 꼭 부탁드리오.'")
    else:
        print("  브론: '...그렇군요. 조심해서 가시오.'")
    player.story_flags["blacksmith_done"] = True


def _npc_tavern(player):
    if player.story_flags.get("tavern_done"):
        print("\n  술꾼들이 시끄럽게 떠들고 있다.")
        return
    _divider("선술집 '술꾼의 안식처'")
    print("""
  한쪽 구석에서 낡은 망토의 남자가 속삭인다.
  "마왕 젤드리온... 사실 그는 왕국의 궁정 마법사였소.
   어떤 음모로 억울하게 추방당한 뒤 어둠에 빠졌다는 소문이 있소."
""")
    print("  1. 더 자세히 듣는다")
    print("  2. 관심 없다")
    choice = _input_choice({1, 2})
    if choice == 1:
        player.story_flags["heard_maou_truth"] = True
        print("""
  남자: '성 안 지하 도서관에 진실이 담긴 책이 있다 들었소.
         찾을 수 있다면... 다른 길이 열릴지도 모르오.'

  ▶ [단서] 마왕의 비밀에 대한 실마리를 얻었다!
""")
    else:
        print("  술꾼: '에이, 어차피 짐승 같은 놈이잖아.'")
    player.story_flags["tavern_done"] = True


def _npc_priest(player):
    import save_manager as _sm
    _divider("아르카디아 성당")

    if not player.story_flags.get("priest_done"):
        print("""
  제사장 알테르가 기도를 마치고 당신을 맞이한다.
  "용사여, 빛의 가호를 드리겠소."
""")
        player.heal(player.max_hp)
        print(f"  ▶ HP 완전 회복! ({player.hp}/{player.max_hp})")
        print("""
  알테르: "성 안에는 죄 없이 갇힌 이들이 있을 것이오.
           그들을 외면하지 마시오. 진정한 영웅은
           힘이 아닌 마음으로 판가름 나는 법이오."
""")
        player.story_flags["priest_blessing"] = True
        player.story_flags["priest_done"] = True
    else:
        print("\n  알테르: '다시 오셨군요. 빛이 함께하기를.'")

    print("\n  알테르: '여정을 빛이 기억하게 하시겠습니까?'")
    print("  1. 게임 저장")
    print("  2. 성당을 나간다")
    choice = _input_choice({1, 2})
    if choice == 1:
        if _sm.prompt_save(player, "아르카디아 성당"):
            print("  알테르: '빛이 여정을 기억할 것입니다. 평안하십시오.'")


def _npc_child(player):
    if player.story_flags.get("child_done"):
        print("\n  아이: '뭉치를 구해줘서 고마워요!'")
        return
    _divider("골목 어린아이")
    print("""
  골목에서 어린 소녀가 울고 있다.
  "고양이 '뭉치'가 우물에 빠졌어요... 꺼내주세요!"
""")
    print("  1. 우물로 내려가 고양이를 구한다")
    print("  2. 바빠서 그냥 지나친다")
    choice = _input_choice({1, 2})
    if choice == 1:
        if random.random() < 0.3:
            player.hp = max(1, player.hp - 10)
            print("  내려가다 미끄러졌다! 10 데미지.")
        player.inventory.append("행운의 부적")
        player.story_flags["helped_child"] = True
        print("""
  가까스로 뭉치를 구출했다!
  소녀가 눈물을 닦으며 부적을 건네준다.
  "엄마가 소중히 여기던 거예요. 용사님께 드릴게요!"

  ▶ [행운의 부적 획득] 전투 중 도망 성공률 +20%
""")
    else:
        player.dark_points += 1
        print("  아이의 울음소리를 뒤로하고 발걸음을 옮겼다...")
    player.story_flags["child_done"] = True


# ═══════════════════════════════════════════════════════
#  숲
# ═══════════════════════════════════════════════════════

def _event_forest(player):
    if player.story_flags.get("forest_cleared"):
        print("  숲은 이미 정리되었습니다.")
        return None

    _divider("어두운 숲")
    print("""
  수풀이 흔들리더니 고블린이 튀어나왔다!
""")
    enemy, key = spawn_enemy("goblin")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    result = _forest_random_event(player)
    if result == "gameover":
        return "gameover"

    player.story_flags["forest_cleared"] = True
    print("  ▶ 숲 길을 확보했다. 세 갈래 지역으로 이동할 수 있다.")
    return None


def _forest_random_event(player):
    r = random.random()
    _divider()

    if r < 0.25:
        print("""
  숲 속에서 수레를 끌고 온 수상한 상인이 나타났다.
  "쉿! 나도 이 숲에서 길을 잃었소. 싸게 팔테니..."
""")
        print("  1. 상인과 거래한다")
        print("  2. 무시하고 지나간다")
        if _input_choice({1, 2}) == 1:
            open_shop(player)

    elif r < 0.45:
        print("\n  갑자기 굶주린 늑대 한 마리가 달려든다!")
        enemy, key = spawn_enemy("wolf")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)

    elif r < 0.65:
        print("\n  신음 소리가 들려 덤불을 헤치자, 부상당한 여행자가 쓰러져 있다.")
        print('  "살려... 주세요..."')
        _handle_injured_traveler(player)

    else:
        gold = random.randint(10, 30)
        player.gold += gold
        print(f"\n  길가에 버려진 여행 가방에서 {gold}G을 발견했다!")

    return None


def _handle_injured_traveler(player):
    name_reveal = player.story_flags.get("blacksmith_quest")
    if name_reveal:
        print('  "저는... 대장장이 브론의 아들 카이입니다..."')

    print("  1. 소형 포션을 써서 치료한다")
    print("  2. 그냥 지나친다")
    choice = _input_choice({1, 2})

    if choice == 1 and "소형 포션" in player.inventory:
        player.inventory.remove("소형 포션")
        if name_reveal:
            player.story_flags["rescued_kai"] = True
            print("""
  카이: "감사합니다... 마을로 돌아가 아버지께 꼭 전하겠습니다."

  ▶ [카이 구출] 나중에 보상이 있을 것이다!
""")
        else:
            player.inventory.append("지도 조각")
            print("""
  여행자: '감사합니다. 이 낡은 지도 조각이라도...'
  ▶ [지도 조각 획득]
""")
    elif choice == 1:
        print("  포션이 없어 도울 수가 없었다...")
    else:
        player.dark_points += 1
        print("  외면하고 발걸음을 옮겼다. 신음이 뒤에서 들려온다...")


# ═══════════════════════════════════════════════════════
#  동굴
# ═══════════════════════════════════════════════════════

def _event_cave(player):
    if player.story_flags.get("cave_cleared"):
        print("  동굴은 이미 정리되었습니다.")
        return None
    player.story_flags["route"] = "cave"
    result = _cave_entrance(player)
    if result == "gameover":
        return result
    result = _cave_lake(player)
    if result == "gameover":
        return result
    result = _cave_boss(player)
    if result == "gameover":
        return result
    player.story_flags["cave_cleared"] = True
    print("  ▶ 동굴 공략 완료.")
    return None


def _cave_entrance(player):
    _divider("동굴 입구")
    print("""
  벽에 낡은 글씨가 새겨져 있다. "나를 지나치는 자여, 어둠을 두려워하라."
  해골 전사가 비틀거리며 걸어나온다!
""")
    enemy, key = spawn_enemy("skeleton")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    print("""
  해골을 부수자 갈림길이 보인다.
  좁은 통로와 넓은 길이 있다.
""")
    print("  1. 좁은 통로 (지름길, 위험할 수 있다)")
    print("  2. 넓은 길 (돌아가지만 안전하다)")
    choice = _input_choice({1, 2})

    if choice == 1:
        r = random.random()
        if r < 0.35:
            dmg = random.randint(15, 25)
            player.hp = max(1, player.hp - dmg)
            print(f"  바닥이 무너지며 함정! {dmg} 데미지. (HP {player.hp}/{player.max_hp})")
        elif r < 0.7:
            gold = random.randint(20, 50)
            player.gold += gold
            print(f"  숨겨진 통로에서 {gold}G을 발견!")
        else:
            print("  무사히 통과했다.")
    else:
        print("  안전하게 넓은 길을 따라갔다.")
    return None


def _cave_lake(player):
    _divider("지하 호수")
    print("""
  어둠 속에 지하 호수가 펼쳐진다. 맑은 물이 희미하게 빛나고,
  호수 가운데 작은 섬에 무언가가 반짝인다.
""")
    print("  1. 헤엄쳐서 섬으로 간다")
    print("  2. 주변에서 다른 길을 찾는다")
    print("  3. 호수를 우회한다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        if random.random() < 0.55:
            reward = random.choice(["대형 포션", "마법 지팡이", "도적의 단검"])
            player.inventory.append(reward)
            print(f"  헤엄쳐 가보니 {reward}이(가) 있었다! 획득!")
        else:
            print("  물 속에서 암흑 마법사가 튀어나왔다!")
            enemy, key = spawn_enemy("dark_mage")
            result = battle(player, enemy, key)
            if result == "lose":
                return game_over(player)
            player.inventory.append("대형 포션")
            print("  물속 보물: 대형 포션 획득!")
    elif choice == 2:
        player.inventory.append("소형 포션")
        print("  호수 옆 바위 뒤에 숨겨진 계단을 발견했다! 소형 포션 획득!")
    else:
        print("  안전하게 우회했다.")
    return None


def _cave_boss(player):
    _divider("동굴 심부")
    print("""
  동굴 가장 깊은 곳. 거대한 트롤이 보물 더미 위에 앉아 있다.
  횃불 빛에 비친 트롤의 그림자가 천장까지 닿는다.

  트롤이 혼자 중얼거린다.
  "...내 보물... 내 예쁜 보물들... 아무도 못 가져가...
   다 내 거야... 다 내 거..."

  발소리에 트롤이 고개를 돌렸다.
  작은 눈이 당신을 발견하고 순식간에 분노로 가득 찼다.

  트롤: "으르르... 침입자!! 보물 훔치러 왔지?!
         죽여버린다!!! 이 동굴은 내 거야!!!"
""")
    print("  1. '싸우겠다!'")
    print("  2. '보물에는 관심 없다. 지나가게 해달라'")
    print("  3. 보물 더미에서 반짝이는 걸 집어 반대편으로 던진다 (기습)")
    choice = _input_choice({1, 2, 3})

    enemy, key = spawn_enemy("troll")

    if choice == 2:
        print("""
  트롤이 잠시 고민하듯 머리를 긁더니 으르렁댄다.
  트롤: "...거짓말! 다들 그렇게 말하고 보물 가져가!
         믿을 수 없어! 죽여버린다!!!"
""")
        enemy.hp = int(enemy.hp * 0.85)
        print("  (트롤이 방심한 틈에 선공 기회! 트롤 HP 소폭 감소)")

    elif choice == 3:
        print("""
  보물 더미에서 금화 한 움큼을 집어 트롤 반대편으로 힘껏 던졌다.

  트롤: "?! 내 보물!! 내 보물 어디 가—"

  트롤이 보물을 향해 달려드는 순간, 등 뒤에서 기습!
""")
        enemy.hp //= 2
        print(f"  트롤이 완전히 방심했다! (HP 절반으로 시작)")

    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    player.story_flags["secret_passage"] = True
    print("""
  트롤이 크게 흔들리다 무릎을 꿇었다.
  마지막으로 보물 더미를 향해 손을 뻗으며 중얼거린다.

  트롤: "...내 보물... 지켜야... 했는데..."

  동굴이 진동하며 먼지가 쏟아진다.
  보물 더미를 헤치자 낡은 양피지가 나왔다.
  '마왕의 성 - 비밀 통로 위치 (상세 약도)'

  ▶ [비밀 통로 지도 획득]
""")
    return None


# ═══════════════════════════════════════════════════════
#  강가
# ═══════════════════════════════════════════════════════

def _event_river(player):
    if player.story_flags.get("river_cleared"):
        print("  강가는 이미 정리되었습니다.")
        return None
    player.story_flags["route"] = "river"
    result = _river_hermit(player)
    if result == "gameover":
        return result
    result = _river_mill(player)
    if result == "gameover":
        return result
    player.story_flags["river_cleared"] = True
    print("  ▶ 강가 공략 완료.")
    return None


def _river_hermit(player):
    _divider("은자의 오두막")
    print("""
  오두막 앞에 백발의 노인이 낚시를 하고 있다.
  노인: "오랜만에 방문객이군. 어디를 향해 가는가?"
""")
    print("  1. '마왕의 성으로 갑니다'")
    print("  2. '당신은 누구입니까?'")
    print("  3. 말없이 지나친다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        player.story_flags["trap_hint"] = True
        print("""
  노인: "그곳에 가려거든 조심하게나.
         성 안에 함정 방들이 있는데, 항상 오른쪽 통로를 선택하게."

  ▶ [단서] 성 내부 함정 정보 획득!
""")
        print("  노인: '배가 고프지 않은가?'")
        print("  1. 함께 식사를 한다")
        print("  2. 바쁘다고 거절한다")
        if _input_choice({1, 2}) == 1:
            player.heal(30)
            player.inventory.append("대형 포션")
            print("  소박하지만 따뜻한 식사. HP 30 회복, 대형 포션 획득!")

    elif choice == 2:
        player.story_flags["heard_maou_truth"] = True
        player.story_flags["hermit_met"] = True
        print("""
  노인: "나는 한때 왕국의 마법사였지. 젤드리온과도 아는 사이였다네.
         그는 악인이 아니었어. 누군가에게 이용당한 것이지.
         고문 레이저스가 증거를 조작했다는 것을 나는 알고 있다네."

  ▶ [중요 단서] 마왕의 진실에 한 걸음 더 가까워졌다!
""")

    else:
        print("\n  강가를 지나치는데 늑대 무리가 나타났다!")
        enemy, key = spawn_enemy("wolf")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)

    return None


def _river_mill(player):
    _divider("버려진 방앗간")
    print("""
  강가를 따라 걷다 무너져가는 방앗간을 발견했다.
  안에서 금속 부딪히는 소리가 난다...
""")
    print("  1. 방앗간 안으로 들어간다")
    print("  2. 무시하고 지나간다")
    choice = _input_choice({1, 2})

    if choice == 2:
        print("  그냥 지나쳤다.")
        return None

    r = random.random()
    if r < 0.4:
        print("  안에서 산적이 튀어나왔다!")
        enemy, key = spawn_enemy("bandit")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
        player.inventory.append("소형 포션")
        player.gold += 25
        print("  산적의 짐에서 소형 포션과 25G를 발견!")

    elif r < 0.75:
        print("""
  방앗간 안에 우리에 갇힌 사람이 있다!
  "살려주세요! 저는 왕국군 정찰병입니다. 마왕의 부하들에게 붙잡혔어요."
""")
        print("  1. 우리 문을 부수고 구출한다")
        print("  2. 위험할 것 같아 그냥 나온다")
        if _input_choice({1, 2}) == 1:
            player.story_flags["rescued_scout"] = True
            player.inventory.append("대형 포션")
            print("""
  정찰병: '감사합니다! 성 서쪽 담에 허물어진 구멍이 있습니다!'

  ▶ [성 서쪽 비밀 입구 정보 획득], 대형 포션을 받았다!
""")
        else:
            player.dark_points += 1
            print("  발걸음을 돌렸다. 등 뒤에서 정찰병의 애원이 들려온다...")

    else:
        gold = random.randint(15, 40)
        player.gold += gold
        print(f"  방앗간 바닥 지하실에서 {gold}G을 발견!")

    return None


# ═══════════════════════════════════════════════════════
#  폐허
# ═══════════════════════════════════════════════════════

def _event_ruins(player):
    if player.story_flags.get("ruins_cleared"):
        print("  폐허는 이미 정리되었습니다.")
        return None
    player.story_flags["route"] = "ruins"
    result = _ruins_church(player)
    if result == "gameover":
        return result
    result = _ruins_artifact(player)
    if result == "gameover":
        return result
    player.story_flags["ruins_cleared"] = True
    print("  ▶ 폐허 공략 완료.")
    return None


def _ruins_church(player):
    _divider("폐허 성당")
    print("""
  도시 중심에 반쯤 무너진 성당이 서 있다.
  제단 위에 낡은 일기장이 놓여 있다.
""")
    print("  1. 일기장을 읽는다")
    print("  2. 그냥 지나친다")
    choice = _input_choice({1, 2})

    if choice == 1:
        player.story_flags["found_diary"] = True
        player.story_flags["heard_maou_truth"] = True
        print("""
  일기장의 마지막 페이지:
  ───────────────────────────────────────
  "...왕의 고문 레이저스가 젤드리온을 모함했다.
   왕의 봉인 반지를 훔치고는 마법사에게 죄를 뒤집어씌웠다.
   억울하게 추방된 젤드리온은 어둠에 빠져들었고,
   진실을 알면서도 침묵한 나는... 죄인이다."

  일기장 말미에: "진실은 성의 지하 도서관에 봉인되어 있다."
  ───────────────────────────────────────

  ▶ [일기장 발견] 마왕 사건의 진실에 한 걸음 더!
""")

    print("\n  성당을 떠나려는 순간... 제단 옆 석관이 천천히 열린다.")
    print("  차가운 공기가 흘러나오며 창백한 손가락이 관 밖으로 뻗어나온다.")
    print("\n  [엔터를 눌러 계속...]")
    input()

    if player.story_flags.get("found_diary"):
        print(f"""
  창백한 귀족풍의 남자가 관에서 나와 당신을 바라본다.

  뱀파이어: "......일기장을 읽었군."
             "그 내용이 사실이든 아니든 나는 상관없다."
             "이 폐허에 발을 들인 자는 누구든 살아서 나갈 수 없지."

  그가 손가락을 튕기자 성당 전체가 어둠으로 물든다.

  뱀파이어: "피 냄새가 좋군. 오늘 저녁은 풍성하겠어."
""")
    else:
        print(f"""
  창백한 귀족풍의 남자가 관에서 천천히 일어선다.
  수백 년은 된 듯한 심홍색 로브가 먼지를 털며 펼쳐진다.

  뱀파이어: "......이 폐허에 살아있는 자가 오다니."
             "몇 년 만인가. 아, 그 따뜻한 심장 소리..."

  그가 눈을 감고 코를 들이킨다.

  뱀파이어: "마지막으로 부탁이 있나? 들어줄 수도 있어."
             "어차피 곧 죽을 테니까."
""")
        print("  1. '죽기 싫다. 싸우겠다!'")
        print("  2. '...나는 마왕을 무찌르러 가는 길이다'")
        sub = _input_choice({1, 2})
        if sub == 2:
            print(f"""
  뱀파이어가 잠시 멈추더니 낮게 웃는다.

  뱀파이어: "마왕을... 하. 재미있는 인간이군."
             "그렇다면 더욱 막을 수 없지. 강한 자의 피가 더 맛있거든."

  그가 망토를 펼치며 날아오른다.
""")
        else:
            print(f"""
  뱀파이어: "용기는 가상하군. 하지만 용기만으론 부족하지."
""")

    print("  뱀파이어가 공중으로 떠오르며 날카로운 이빨을 드러낸다!")
    enemy, key = spawn_enemy("vampire")
    result = battle(player, enemy, key)
    if result == "lose":
        return game_over(player)

    print("""
  뱀파이어가 재로 흩어지며 속삭인다.
  "......오래간만에... 재미있었다..."
""")
    return None


def _ruins_artifact(player):
    _divider("폐허 광장")
    print("""
  광장 중앙에 검은 수정 구슬이 받침대 위에 놓여 있다.
  구슬에서 어두운 기운이 뿜어져 나오며 속삭인다.
  "나를 가져라... 힘을 주겠다..."
""")
    print("  1. 어둠의 구슬을 집어든다  (공격력 +10 / 어둠 +3)")
    print("  2. 구슬을 부순다")
    print("  3. 그냥 지나간다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        player.attack += 10
        player.dark_points += 3
        player.story_flags["dark_artifact"] = True
        print("""
  구슬을 쥐는 순간 어두운 힘이 온몸에 퍼진다.
  공격력이 폭발적으로 증가했다! 하지만 손에서 검은 기운이 흐른다...

  ▶ 공격력 +10  /  어둠 점수 +3
""")
    elif choice == 2:
        if random.random() < 0.5:
            print("  구슬이 폭발하며 암흑 마법사가 소환됐다!")
            enemy, key = spawn_enemy("dark_mage")
            result = battle(player, enemy, key)
            if result == "lose":
                return game_over(player)
        player.inventory.append("대형 포션")
        player.story_flags["destroyed_artifact"] = True
        print("  구슬이 산산조각 났다. 대형 포션이 나타났다. ▶ 획득!")
    else:
        print("  구슬을 그냥 지나쳤다. 속삭임이 멀어진다.")

    return None


# ═══════════════════════════════════════════════════════
#  산적 야영지
# ═══════════════════════════════════════════════════════

def _event_bandit_camp(player):
    if player.story_flags.get("bandit_camp_cleared"):
        print("  야영지는 이미 정리되었습니다.")
        return None

    _divider("산적 야영지")
    print("""
  마왕의 성으로 향하는 길목에 산적들이 진을 치고 있다.
  두목: "통행세 50G를 내면 지나가게 해주지."
""")
    print("  1. 싸운다")
    print("  2. 50G를 낸다")
    print("  3. 협상한다")
    choice = _input_choice({1, 2, 3})

    if choice == 1:
        enemy, key = spawn_enemy("bandit")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
    elif choice == 2:
        if player.gold >= 50:
            player.gold -= 50
            print("  통행세를 지불하고 통과했다.")
        else:
            print(f"  골드가 부족하다! (보유: {player.gold}G) 싸울 수밖에 없다.")
            enemy, key = spawn_enemy("bandit")
            result = battle(player, enemy, key)
            if result == "lose":
                return game_over(player)
    else:
        if player.job == "도적" or player.dark_points >= 3:
            print("  분위기로 산적들을 제압해 길을 열었다.")
        else:
            enemy, key = spawn_enemy("bandit")
            result = battle(player, enemy, key)
            if result == "lose":
                return game_over(player)

    if player.story_flags.get("rescued_kai"):
        print("  브론이 감사의 보상으로 강철 검과 30G를 건넸다.")
        player.inventory.append("강철 검")
        player.gold += 30

    player.story_flags["bandit_camp_cleared"] = True
    return None


# ═══════════════════════════════════════════════════════
#  성문
# ═══════════════════════════════════════════════════════

def _event_castle_gate(player):
    if player.story_flags.get("castle_gate_cleared"):
        print("  성문은 이미 돌파했습니다.")
        return None

    _divider("마왕의 성 정문")
    has_secret_passage = player.story_flags.get("secret_passage")
    has_scout_info = player.story_flags.get("rescued_scout")

    opts = {1}
    print("  1. 정문으로 들어간다 (언데드 기사 전투)")
    if has_secret_passage:
        opts.add(2)
        print("  2. 비밀 통로로 잠입한다 (전투 없음)")
    if has_scout_info:
        n = 3 if has_secret_passage else 2
        opts.add(n)
        print(f"  {n}. 서쪽 구멍으로 들어간다 (소규모 전투)")

    choice = _input_choice(opts)
    if choice == 1:
        enemy, key = spawn_enemy("undead_knight")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)
    elif choice == 2 and has_secret_passage:
        print("  비밀 통로를 통해 성 안으로 잠입했다.")
        player.story_flags["stealth_entry"] = True
    else:
        enemy, key = spawn_enemy("goblin")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)

    player.story_flags["castle_gate_cleared"] = True
    return None


# ═══════════════════════════════════════════════════════
#  성 내부
# ═══════════════════════════════════════════════════════

def _event_castle_inside(player):
    if player.story_flags.get("castle_inside_cleared"):
        print("  성 내부 탐색은 이미 완료되었습니다.")
        return None

    explored = set()
    locations = {
        "library": "지하 도서관",
        "prison": "지하 감옥",
        "armory": "무기고",
    }
    while len(explored) < 2:
        show_castle_map(player, explored)
        available = [(k, v) for k, v in locations.items() if k not in explored]
        for i, (_, name) in enumerate(available, 1):
            print(f"  {i}. {name}")
        n = len(available)
        print(f"  {n + 1}. 탐색 종료")

        choice = _input_choice(set(range(1, n + 2)))
        if choice == n + 1:
            if len(explored) >= 2:
                break
            print("  최소 2곳을 탐색해야 합니다.")
            continue

        loc_key, _ = available[choice - 1]
        explored.add(loc_key)
        if loc_key == "library":
            _castle_library(player)
        elif loc_key == "prison":
            result = _castle_prison(player)
            if result == "gameover":
                return result
        else:
            _castle_armory(player)

    _divider("암흑 장군")
    print("  1. 싸운다")
    print("  2. 진실을 아는 자임을 밝힌다")
    choice = _input_choice({1, 2})
    knows_truth = player.story_flags.get("heard_maou_truth") or player.story_flags.get("found_truth_book")
    if choice == 2 and knows_truth:
        print("  장군이 길을 열어주었다.")
    else:
        enemy, key = spawn_enemy("dark_general")
        result = battle(player, enemy, key)
        if result == "lose":
            return game_over(player)

    player.story_flags["castle_inside_cleared"] = True
    return None


def _castle_library(player):
    _divider("지하 도서관")
    print("""
  먼지 쌓인 서가 사이로 오래된 책들이 늘어서 있다.
  한쪽 구석에 잠긴 유리 케이스 안에 붉은 책이 놓여 있다.
""")
    print("  1. 유리 케이스를 부수고 책을 꺼낸다")
    print("  2. 다른 책들을 살펴본다")
    choice = _input_choice({1, 2})

    if choice == 1:
        player.story_flags["found_truth_book"] = True
        player.story_flags["heard_maou_truth"] = True
        print("""
  『진실의 기록』 - 봉인 해제.
  ───────────────────────────────────────
  왕국력 352년, 궁정 마법사 젤드리온은
  왕의 봉인 반지 도난 사건의 누명을 썼다.

  실범은 왕의 고문 레이저스였으나 그는 증거를 조작했다.
  10년간의 고독과 분노 속에 젤드리온은 어둠을 받아들였다.

  단 하나의 조건이면 모든 것이 끝날 수 있다:
  '봉인 반지를 돌려받고 진실이 밝혀지는 것.'
  ───────────────────────────────────────

  ▶ [진실의 기록 발견] 마왕과의 대화에서 새로운 선택지가 열린다!
""")
    else:
        player.max_hp += 20
        player.hp = min(player.hp + 20, player.max_hp)
        player.inventory.append("대형 포션")
        print("  주문서를 읽어 최대 HP +20! 대형 포션도 발견!")


def _castle_prison(player):
    _divider("지하 감옥")
    print("""
  서늘한 감옥 통로를 걷자 한 구석에서 신음 소리가 들린다.
  창살 뒤에 왕국군 병사 두 명이 갇혀 있다.
  병사: '제발... 살려주세요!'
""")
    print("  1. 창살을 부수고 구출한다")
    print("  2. 그냥 지나간다")
    choice = _input_choice({1, 2})

    if choice == 1:
        player.story_flags["rescued_prisoners"] = True
        player.attack += 5
        print("""
  창살을 힘껏 당기자 낡은 자물쇠가 부서진다.
  병사: '감사합니다! 마왕과 싸울 때 힘을 드리겠습니다!'

  ▶ [기사 구출] 공격력 임시 +5! (기사들의 응원 효과)
""")
    else:
        player.dark_points += 1
        print("  병사들의 목소리를 외면하고 지나쳤다...")
    return None


def _castle_armory(player):
    _divider("무기고")
    has_hint = player.story_flags.get("trap_hint")
    print("""
  각종 무기와 갑옷이 벽에 걸려 있다.
  하지만 방 중앙에 함정이 있을 것 같은 느낌이 든다.
""")
    if has_hint:
        print("  (노인의 말이 떠오른다. '항상 오른쪽 통로를...')")
        print("  1. 오른쪽 통로로 우회해 들어간다 (안전)")
        print("  2. 정면으로 들어간다 (함정 위험)")
    else:
        print("  1. 조심스럽게 들어간다")
        print("  2. 대담하게 정면으로 들어간다")
    choice = _input_choice({1, 2})

    trap = (choice == 2 and has_hint) or (choice == 2 and random.random() < 0.5)
    if trap:
        dmg = 30
        player.hp = max(1, player.hp - dmg)
        print(f"  바닥이 꺼지며 함정 발동! {dmg} 데미지! (HP {player.hp}/{player.max_hp})")

    print("\n  무기고에서 장비를 하나 가져갈 수 있다.")
    options = ["강철 검", "사슬 갑옷", "대형 포션"]
    for i, item in enumerate(options, 1):
        print(f"  {i}. {item}")
    c = _input_choice({1, 2, 3})
    player.inventory.append(options[c - 1])
    print(f"  ▶ {options[c-1]} 획득!")


# ═══════════════════════════════════════════════════════
#  왕좌의 방 (story_ending 으로 위임)
# ═══════════════════════════════════════════════════════

def _event_throne(player):
    from story_ending import chapter_7_final
    return chapter_7_final(player)


# ─── 이벤트 자동 등록 ────────────────────────────────
for _zone, _fn in [
    ("town", _event_town),
    ("forest", _event_forest),
    ("cave", _event_cave),
    ("river", _event_river),
    ("ruins", _event_ruins),
    ("bandit_camp", _event_bandit_camp),
    ("castle_gate", _event_castle_gate),
    ("castle_inside", _event_castle_inside),
    ("throne", _event_throne),
]:
    register_event(_zone, _fn)
