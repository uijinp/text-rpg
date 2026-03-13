## player.gd — 플레이어 데이터 클래스
## web/js/game.js Player 클래스 포팅
class_name PlayerData
extends RefCounted

# ── 기본 정보 ──
var player_name: String = ""
var job: String = ""
var level: int = 1
var exp: int = 0
var exp_to_level: int = 50

# ── 스탯 ──
var hp: int = 100
var max_hp: int = 100
var attack: int = 10
var defense: int = 5
var gold: int = 30

# ── 인벤토리 & 장비 ──
var inventory: Array[String] = []
var equipped_weapon: String = ""
var equipped_armor: String = ""

# ── 게임 진행 ──
var story_flags: Dictionary = {}
var dark_points: int = 0
var current_location: String = "town"
var current_map: String = "mainland"
var map_position: Vector2i = Vector2i(40, 28)  # 아르카디아 T 위치

# ── 방문 기록 ──
var visited_locations: Array[String] = []

# ── 상태 효과 ──
var poisoned: bool = false
var burn_turns: int = 0

# ── 통계 ──
var stats: Dictionary = {
	"battlesWon": 0,
	"monstersKilled": 0,
	"criticalHits": 0,
	"totalDamageDealt": 0,
	"stepsWalked": 0,
	"totalGoldEarned": 0,
	"itemsCollected": 0,
	"potionsUsed": 0,
}

# ── 업적 & 스킬 ──
var unlocked_achievements: Array[String] = []
var unlocked_skills: Array[String] = []
var skill_points: int = 0
var passive_buffs: Dictionary = {}
var temp_buffs: Array = []
var seen_storylets: Array[String] = []
var last_stand_used: bool = false

# ── 초기화 ──
func init_class(job_name: String) -> void:
	job = job_name
	var cls: Dictionary = GameData.classes.get(job, {})
	max_hp = cls.get("hp", 100)
	hp = max_hp
	attack = cls.get("attack", 10)
	defense = cls.get("defense", 5)
	gold = 30
	level = 1
	exp = 0
	exp_to_level = 50
	inventory = ["소형 포션", "소형 포션", "소형 포션"]
	equipped_weapon = ""
	equipped_armor = ""
	story_flags = {}
	dark_points = 0
	current_location = "town"
	current_map = "mainland"
	map_position = Vector2i(40, 28)
	visited_locations = ["town"]
	stats = {
		"battlesWon": 0,
		"monstersKilled": 0,
		"criticalHits": 0,
		"totalDamageDealt": 0,
		"stepsWalked": 0,
		"totalGoldEarned": 0,
		"itemsCollected": 0,
		"potionsUsed": 0,
	}
	unlocked_achievements = []
	unlocked_skills = []
	skill_points = 0
	passive_buffs = {}
	seen_storylets = []
	poisoned = false
	burn_turns = 0

# ── 전투 관련 ──
func get_attack() -> Dictionary:
	var base_atk := attack
	var weapon_bonus := 0
	if equipped_weapon != "":
		var item_data: Dictionary = GameData.get_item(equipped_weapon)
		weapon_bonus = item_data.get("attack_bonus", 0)
	var buf_bonus: int = int(passive_buffs.get("attackBonus", 0))

	# 임시 버프
	var temp_mult := 1.0
	for b in temp_buffs:
		if b.get("stat", "") == "attack":
			temp_mult += b.get("percent", 0) / 100.0

	var total := int((base_atk + weapon_bonus + buf_bonus) * temp_mult)
	var variance := randi_range(-2, 2)
	total = max(1, total + variance)

	# 치명타
	var crit_chance := 0.08
	if job == "도적":
		crit_chance = 0.15
	crit_chance += passive_buffs.get("critChanceBonus", 0) / 100.0
	var is_crit := randf() < crit_chance
	if is_crit:
		total = int(total * 1.8)

	return {"damage": total, "critical": is_crit}

func get_defense() -> int:
	var armor_bonus := 0
	if equipped_armor != "":
		var item_data: Dictionary = GameData.get_item(equipped_armor)
		armor_bonus = item_data.get("defense_bonus", 0)
	var buf_bonus: int = int(passive_buffs.get("defenseBonus", 0))
	return defense + armor_bonus + buf_bonus

func take_damage(amount: int) -> int:
	var actual: int = int(max(0, amount))
	hp = max(0, hp - actual)
	return actual

func heal(amount: int) -> int:
	var healed: int = int(min(amount, max_hp - hp))
	hp += healed
	return healed

func is_alive() -> bool:
	return hp > 0

# ── 경험치 & 레벨업 ──
func gain_exp(amount: int) -> bool:
	exp += amount
	if exp >= exp_to_level:
		_level_up()
		return true
	return false

func _level_up() -> void:
	while exp >= exp_to_level:
		exp -= exp_to_level
		level += 1
		exp_to_level = int(50 * pow(1.2, level - 1))
		max_hp += 8
		attack += 2
		defense += 1
		hp = max_hp  # 레벨업 시 HP 완전 회복
		skill_points += 1

# ── 직렬화 (세이브/로드) ──
func to_dict() -> Dictionary:
	return {
		"name": player_name,
		"job": job,
		"level": level,
		"exp": exp,
		"exp_to_level": exp_to_level,
		"hp": hp,
		"max_hp": max_hp,
		"attack": attack,
		"defense": defense,
		"gold": gold,
		"inventory": inventory,
		"equipped_weapon": equipped_weapon,
		"equipped_armor": equipped_armor,
		"story_flags": story_flags,
		"dark_points": dark_points,
		"current_location": current_location,
		"current_map": current_map,
		"map_position": {"x": map_position.x, "y": map_position.y},
		"visited_locations": visited_locations,
		"stats": stats,
		"unlocked_achievements": unlocked_achievements,
		"unlocked_skills": unlocked_skills,
		"skill_points": skill_points,
		"seen_storylets": seen_storylets,
	}

func from_dict(data: Dictionary) -> void:
	player_name = data.get("name", "")
	job = data.get("job", "전사")
	level = data.get("level", 1)
	exp = data.get("exp", 0)
	exp_to_level = data.get("exp_to_level", 50)
	hp = data.get("hp", 100)
	max_hp = data.get("max_hp", 100)
	attack = data.get("attack", 10)
	defense = data.get("defense", 5)
	gold = data.get("gold", 30)
	inventory.assign(data.get("inventory", []))
	equipped_weapon = data.get("equipped_weapon", "")
	equipped_armor = data.get("equipped_armor", "")
	story_flags = data.get("story_flags", {})
	dark_points = data.get("dark_points", 0)
	current_location = data.get("current_location", "town")
	current_map = data.get("current_map", "mainland")
	var pos: Dictionary = data.get("map_position", {"x": 40, "y": 28})
	map_position = Vector2i(pos.get("x", 40), pos.get("y", 28))
	visited_locations.assign(data.get("visited_locations", []))
	stats = data.get("stats", stats)
	unlocked_achievements.assign(data.get("unlocked_achievements", []))
	unlocked_skills.assign(data.get("unlocked_skills", []))
	skill_points = data.get("skill_points", 0)
	seen_storylets.assign(data.get("seen_storylets", []))
	poisoned = false
	burn_turns = 0
	passive_buffs = {}
	temp_buffs = []
	last_stand_used = false
