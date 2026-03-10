"""캐릭터 시스템: 플레이어 및 적 캐릭터 정의"""

import random


class Character:
    def __init__(self, name, hp, attack, defense, gold=0):
        self.name = name
        self.max_hp = hp
        self.hp = hp
        self.attack = attack
        self.defense = defense
        self.gold = gold

    def is_alive(self):
        return self.hp > 0

    def take_damage(self, damage):
        actual = max(0, damage - self.defense)
        self.hp = max(0, self.hp - actual)
        return actual

    def heal(self, amount):
        before = self.hp
        self.hp = min(self.max_hp, self.hp + amount)
        return self.hp - before

    def status(self):
        bar_len = 20
        filled = int(bar_len * self.hp / self.max_hp)
        bar = "█" * filled + "░" * (bar_len - filled)
        return f"{self.name}  HP [{bar}] {self.hp}/{self.max_hp}"


CLASSES = {
    "전사": {"hp": 120, "attack": 15, "defense": 8, "desc": "높은 HP와 방어력을 가진 근접 전투 특화"},
    "마법사": {"hp": 70,  "attack": 25, "defense": 3, "desc": "낮은 HP지만 강력한 마법 공격"},
    "도적": {"hp": 90,  "attack": 18, "defense": 5, "desc": "균형 잡힌 스탯과 높은 치명타 확률"},
}


def create_player():
    print("\n" + "=" * 50)
    print("       캐릭터 생성")
    print("=" * 50)

    name = input("\n캐릭터 이름을 입력하세요: ").strip()
    if not name:
        name = "용사"

    print("\n직업을 선택하세요:")
    class_names = list(CLASSES.keys())
    for i, cls in enumerate(class_names, 1):
        info = CLASSES[cls]
        print(f"  {i}. {cls:6} - {info['desc']}")

    while True:
        try:
            choice = int(input("\n선택 (1-3): "))
            if 1 <= choice <= 3:
                break
        except ValueError:
            pass
        print("올바른 번호를 입력하세요.")

    chosen = class_names[choice - 1]
    stats = CLASSES[chosen]

    player = Player(
        name=name,
        job=chosen,
        hp=stats["hp"],
        attack=stats["attack"],
        defense=stats["defense"],
    )

    print(f"\n✦ {name} ({chosen}) 이(가) 탄생했습니다!")
    print(f"  HP {player.hp}  공격력 {player.attack}  방어력 {player.defense}")
    return player


class Player(Character):
    def __init__(self, name, job, hp, attack, defense):
        super().__init__(name, hp, attack, defense, gold=50)
        self.job = job
        self.level = 1
        self.exp = 0
        self.exp_to_next = 100
        self.inventory = []
        self.equipped_weapon = None
        self.equipped_armor = None

    def gain_exp(self, amount):
        self.exp += amount
        leveled = False
        while self.exp >= self.exp_to_next:
            self.exp -= self.exp_to_next
            self._level_up()
            leveled = True
        return leveled

    def _level_up(self):
        self.level += 1
        self.exp_to_next = int(self.exp_to_next * 1.4)
        self.max_hp += 15
        self.hp = self.max_hp
        self.attack += 3
        self.defense += 1
        print(f"\n  ★ 레벨 업! Lv.{self.level} ★")
        print(f"  HP+15 / 공격력+3 / 방어력+1")

    def get_attack(self):
        base = self.attack
        if self.equipped_weapon:
            base += self.equipped_weapon.get("attack_bonus", 0)
        if self.job == "도적" and random.random() < 0.25:
            print("  [치명타!]")
            return base * 2
        return base

    def get_defense(self):
        base = self.defense
        if self.equipped_armor:
            base += self.equipped_armor.get("defense_bonus", 0)
        return base

    def take_damage(self, damage):
        actual = max(0, damage - self.get_defense())
        self.hp = max(0, self.hp - actual)
        return actual

    def full_status(self):
        weapon = self.equipped_weapon["name"] if self.equipped_weapon else "없음"
        armor = self.equipped_armor["name"] if self.equipped_armor else "없음"
        print(f"""
┌─────────────────────────────┐
│  {self.name} ({self.job})  Lv.{self.level}
│  HP    : {self.hp}/{self.max_hp}
│  공격력: {self.attack} (+{self.equipped_weapon['attack_bonus'] if self.equipped_weapon else 0})
│  방어력: {self.defense} (+{self.equipped_armor['defense_bonus'] if self.equipped_armor else 0})
│  경험치: {self.exp}/{self.exp_to_next}
│  골드  : {self.gold}G
│  무기  : {weapon}
│  방어구: {armor}
└─────────────────────────────┘""")


def create_enemy(name, hp, attack, defense, exp_reward, gold_reward):
    enemy = Character(name, hp, attack, defense)
    enemy.exp_reward = exp_reward
    enemy.gold_reward = gold_reward
    return enemy
