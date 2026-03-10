"""전투 시스템"""

import random
import time
from character import create_enemy


# ─── 적 데이터 ─────────────────────────────────────────
ENEMY_TABLE = {
    "goblin":        {"name": "고블린",      "hp": 30,  "attack": 8,  "defense": 1,  "exp": 20,  "gold": 10},
    "wolf":          {"name": "늑대",        "hp": 45,  "attack": 12, "defense": 2,  "exp": 30,  "gold": 5},
    "orc":           {"name": "오크",        "hp": 70,  "attack": 16, "defense": 4,  "exp": 50,  "gold": 20},
    "troll":         {"name": "트롤",        "hp": 100, "attack": 20, "defense": 6,  "exp": 80,  "gold": 35},
    "dragon":        {"name": "드래곤",      "hp": 200, "attack": 35, "defense": 10, "exp": 200, "gold": 150},
    # 추가 적
    "skeleton":      {"name": "해골 전사",   "hp": 55,  "attack": 13, "defense": 3,  "exp": 40,  "gold": 12},
    "dark_mage":     {"name": "암흑 마법사", "hp": 50,  "attack": 22, "defense": 1,  "exp": 55,  "gold": 25},
    "vampire":       {"name": "뱀파이어",    "hp": 80,  "attack": 18, "defense": 5,  "exp": 70,  "gold": 40},
    "bandit":        {"name": "산적 두목",   "hp": 55,  "attack": 14, "defense": 3,  "exp": 35,  "gold": 20},
    "undead_knight": {"name": "언데드 기사", "hp": 90,  "attack": 20, "defense": 8,  "exp": 75,  "gold": 30},
    "dark_general":  {"name": "암흑 장군",   "hp": 150, "attack": 28, "defense": 8,  "exp": 120, "gold": 80},
    # 사막 지역
    "sand_scorpion": {"name": "사막 전갈",   "hp": 60,  "attack": 16, "defense": 5,  "exp": 45,  "gold": 15},
    "mummy":         {"name": "미라",        "hp": 85,  "attack": 19, "defense": 6,  "exp": 65,  "gold": 30},
    "pharaoh":       {"name": "파라오 수호자","hp": 160, "attack": 30, "defense": 9,  "exp": 130, "gold": 90},
    # 빙하 지역
    "ice_golem":     {"name": "얼음 골렘",   "hp": 110, "attack": 22, "defense": 10, "exp": 85,  "gold": 35},
    "frost_wyrm":    {"name": "서리 비룡",   "hp": 180, "attack": 32, "defense": 8,  "exp": 150, "gold": 100},
    # 늪지대
    "swamp_snake":   {"name": "독사",        "hp": 40,  "attack": 14, "defense": 2,  "exp": 30,  "gold": 8},
    "swamp_witch":   {"name": "늪지 마녀",   "hp": 70,  "attack": 24, "defense": 3,  "exp": 60,  "gold": 35},
    # 바다/항구
    "sea_raider":    {"name": "해적",        "hp": 65,  "attack": 15, "defense": 4,  "exp": 40,  "gold": 25},
    # 엘프 마을
    "elf_guardian":  {"name": "엘프 수호자", "hp": 50,  "attack": 14, "defense": 4,  "exp": 38,  "gold": 15},
    # 달빛 호수
    "lake_spirit":   {"name": "호수 정령",   "hp": 35,  "attack": 10, "defense": 2,  "exp": 25,  "gold": 20},
    # 지하 미궁
    "labyrinth_guardian": {"name": "미궁 수호자", "hp": 85,  "attack": 20, "defense": 7, "exp": 70, "gold": 30},
    "labyrinth_golem":    {"name": "미궁 골렘",   "hp": 130, "attack": 26, "defense": 11, "exp": 100, "gold": 50},
    # 용병단
    "mercenary_duelist":  {"name": "용병 결투사", "hp": 75,  "attack": 18, "defense": 5,  "exp": 55,  "gold": 25},
    # 화산
    "fire_elemental":{"name": "화염 정령",   "hp": 95,  "attack": 24, "defense": 5,  "exp": 75,  "gold": 35},
    "lava_drake":    {"name": "용암 드레이크","hp": 140, "attack": 28, "defense": 7,  "exp": 110, "gold": 60},
    # 어둠의 탑
    "shadow_knight": {"name": "그림자 기사", "hp": 100, "attack": 22, "defense": 9,  "exp": 85,  "gold": 40},
    "dark_sentinel": {"name": "어둠의 파수꾼","hp": 120, "attack": 25, "defense": 9,  "exp": 90,  "gold": 45},
    "shadow_lazarus":{"name": "그림자 라자러스","hp": 190,"attack": 34, "defense": 10, "exp": 180, "gold": 120},
}

DROP_TABLE = {
    "goblin":        [("소형 포션", 0.3)],
    "wolf":          [("소형 포션", 0.2)],
    "orc":           [("대형 포션", 0.25), ("낡은 검", 0.15)],
    "troll":         [("대형 포션", 0.4),  ("가죽 갑옷", 0.2)],
    "dragon":        [("강철 검", 0.6),    ("사슬 갑옷", 0.5), ("대형 포션", 0.8)],
    "skeleton":      [("소형 포션", 0.3)],
    "dark_mage":     [("대형 포션", 0.35), ("마법 지팡이", 0.1)],
    "vampire":       [("대형 포션", 0.4),  ("해독제", 0.3)],
    "bandit":        [("소형 포션", 0.4),  ("낡은 검", 0.2)],
    "undead_knight": [("사슬 갑옷", 0.2),  ("대형 포션", 0.3)],
    "dark_general":  [("강철 검", 0.5),    ("대형 포션", 0.7)],
    "sand_scorpion": [("해독제", 0.4),     ("소형 포션", 0.3)],
    "mummy":         [("대형 포션", 0.3),   ("고대 부적", 0.15)],
    "pharaoh":       [("파라오의 검", 0.5), ("대형 포션", 0.7)],
    "ice_golem":     [("대형 포션", 0.35),  ("사슬 갑옷", 0.15)],
    "frost_wyrm":    [("서리의 검", 0.5),   ("대형 포션", 0.8)],
    "swamp_snake":   [("해독제", 0.5),      ("소형 포션", 0.2)],
    "swamp_witch":   [("대형 포션", 0.4),   ("마법 지팡이", 0.2)],
    "sea_raider":    [("소형 포션", 0.3),   ("낡은 검", 0.25)],
    # 확장 지역
    "elf_guardian":       [("소형 포션", 0.3),   ("엘프의 로브", 0.1)],
    "lake_spirit":        [("소형 포션", 0.5)],
    "labyrinth_guardian": [("대형 포션", 0.35),  ("해독제", 0.2)],
    "labyrinth_golem":    [("대형 포션", 0.6),   ("사슬 갑옷", 0.3)],
    "mercenary_duelist":  [("소형 포션", 0.4),   ("해독제", 0.2)],
    "fire_elemental":     [("대형 포션", 0.4),   ("고급 포션", 0.15)],
    "lava_drake":         [("고급 포션", 0.5),   ("강철 검", 0.3)],
    "shadow_knight":      [("대형 포션", 0.4),   ("사슬 갑옷", 0.2)],
    "dark_sentinel":      [("대형 포션", 0.5),   ("강철 검", 0.25)],
    "shadow_lazarus":     [("고급 포션", 0.8),   ("강화 갑옷", 0.5)],
}


def spawn_enemy(enemy_key):
    data = ENEMY_TABLE[enemy_key]
    enemy = create_enemy(
        data["name"], data["hp"], data["attack"],
        data["defense"], data["exp"], data["gold"],
    )
    return enemy, enemy_key


def _roll_drops(enemy_key):
    drops = []
    for item_name, chance in DROP_TABLE.get(enemy_key, []):
        if random.random() < chance:
            drops.append(item_name)
    return drops


# ─── 전투 루프 ────────────────────────────────────────
def battle(player, enemy, enemy_key="goblin"):
    print("\n" + "=" * 50)
    print(f"  ⚔  {enemy.name} 와(과) 전투 시작!")
    print("=" * 50)

    turn = 1
    while player.is_alive() and enemy.is_alive():
        print(f"\n  [턴 {turn}]")
        print(f"  {player.status()}")
        print(f"  {enemy.status()}")
        print()

        # ── 플레이어 행동 선택
        action = _player_menu(player)

        if action == "attack":
            dmg = player.get_attack()
            dealt = enemy.take_damage(dmg)
            print(f"  → {player.name}의 공격! {enemy.name}에게 {dealt} 데미지")

        elif action == "skill":
            _use_skill(player, enemy)

        elif action == "item":
            from inventory import use_item
            use_item(player)

        elif action == "run":
            flee_chance = 0.5
            if "행운의 부적" in getattr(player, "inventory", []):
                flee_chance += 0.2
            if random.random() < flee_chance:
                print("  → 도망쳤습니다!")
                return "fled"
            else:
                print("  → 도망에 실패했습니다!")

        # ── 적 행동
        if enemy.is_alive():
            _enemy_action(enemy, player)

        # ── 독 데미지
        if getattr(player, "poisoned", False):
            poison_dmg = max(1, player.max_hp // 10)
            player.hp = max(0, player.hp - poison_dmg)
            print(f"  [독] {poison_dmg} 데미지! (HP {player.hp}/{player.max_hp})")

        turn += 1
        time.sleep(0.3)

    # ── 전투 종료
    if player.is_alive():
        return _victory(player, enemy, enemy_key)
    else:
        return _defeat(player)


def _player_menu(player):
    print("  행동 선택: [1] 공격  [2] 스킬  [3] 아이템  [4] 도망")
    while True:
        cmd = input("  > ").strip()
        if cmd == "1":
            return "attack"
        elif cmd == "2":
            return "skill"
        elif cmd == "3":
            return "item"
        elif cmd == "4":
            return "run"
        print("  1~4 중에서 선택하세요.")


def _use_skill(player, enemy):
    skills = _get_skills(player.job)
    if not skills:
        print("  사용할 스킬이 없습니다.")
        return

    print("  스킬 선택:")
    for i, (skill_name, skill) in enumerate(skills.items(), 1):
        print(f"    {i}. {skill_name} - {skill['desc']}")
    print("    0. 취소")

    try:
        choice = int(input("  > "))
    except ValueError:
        return

    if choice == 0:
        return
    skill_list = list(skills.items())
    if not (1 <= choice <= len(skill_list)):
        return

    skill_name, skill = skill_list[choice - 1]
    skill["func"](player, enemy)


def _get_skills(job):
    if job == "전사":
        return {
            "강타": {
                "desc": "공격력의 150% 데미지",
                "func": lambda p, e: _skill_heavy(p, e),
            },
            "방어 태세": {
                "desc": "1턴간 방어력 2배 (현재 턴 적용)",
                "func": lambda p, e: _skill_guard(p),
            },
        }
    elif job == "마법사":
        return {
            "화염구": {
                "desc": "방어력 무시 마법 데미지 30",
                "func": lambda p, e: _skill_fireball(p, e),
            },
            "마력 흡수": {
                "desc": "적에게 15 데미지, HP 10 회복",
                "func": lambda p, e: _skill_drain(p, e),
            },
        }
    elif job == "도적":
        return {
            "급소 찌르기": {
                "desc": "50% 확률로 공격력의 300% 데미지",
                "func": lambda p, e: _skill_stab(p, e),
            },
            "연속 공격": {
                "desc": "2회 연속 공격",
                "func": lambda p, e: _skill_double(p, e),
            },
        }
    return {}


def _skill_heavy(player, enemy):
    dmg = int(player.get_attack() * 1.5)
    dealt = enemy.take_damage(dmg)
    print(f"  [강타] {enemy.name}에게 {dealt} 데미지!")


def _skill_guard(player):
    player.defense = int(player.defense * 2)
    print(f"  [방어 태세] 방어력이 일시적으로 2배가 됩니다! ({player.defense})")


def _skill_fireball(player, enemy):
    dmg = 30 + player.level * 5
    enemy.hp = max(0, enemy.hp - dmg)
    print(f"  [화염구] 방어 무시! {enemy.name}에게 {dmg} 데미지!")


def _skill_drain(player, enemy):
    enemy.hp = max(0, enemy.hp - 15)
    healed = player.heal(10)
    print(f"  [마력 흡수] {enemy.name}에게 15 데미지, HP +{healed} 회복!")


def _skill_stab(player, enemy):
    if random.random() < 0.5:
        dmg = int(player.get_attack() * 3)
        dealt = enemy.take_damage(dmg)
        print(f"  [급소 찌르기] 치명타! {enemy.name}에게 {dealt} 데미지!")
    else:
        print("  [급소 찌르기] 빗나갔습니다!")


def _skill_double(player, enemy):
    total = 0
    for i in range(1, 3):
        dmg = player.get_attack()
        dealt = enemy.take_damage(dmg)
        total += dealt
        print(f"  [연속 공격 {i}타] {dealt} 데미지")
    print(f"  총 {total} 데미지!")


def _enemy_action(enemy, player):
    # 특수 패턴: 독 공격 (30% 확률)
    if random.random() < 0.15:
        player.poisoned = True
        base = enemy.attack // 2
        dealt = player.take_damage(base)
        print(f"  ← {enemy.name}의 독 공격! {dealt} 데미지 + 독 상태 이상!")
    else:
        dealt = player.take_damage(enemy.attack)
        print(f"  ← {enemy.name}의 공격! {dealt} 데미지")


def _victory(player, enemy, enemy_key):
    print(f"\n  ★ 승리! {enemy.name}을(를) 물리쳤습니다!")

    # 경험치 / 골드
    exp = enemy.exp_reward
    gold = enemy.gold_reward + random.randint(0, enemy.gold_reward // 2)
    player.gold += gold

    leveled = player.gain_exp(exp)
    print(f"  경험치 +{exp}  골드 +{gold}G")

    # 드롭 아이템
    drops = _roll_drops(enemy_key)
    for item in drops:
        player.inventory.append(item)
        print(f"  아이템 획득: {item}")

    return "win"


def _defeat(player):
    print("\n  ✕ 패배했습니다...")
    print(f"  {player.name}은(는) 쓰러졌습니다.")
    return "lose"
