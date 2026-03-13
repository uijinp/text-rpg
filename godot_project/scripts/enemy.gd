## enemy.gd — 적 데이터 유틸리티
## CombatSystem에서 사용하는 적 관련 헬퍼
class_name EnemyData
extends RefCounted

var key: String = ""
var enemy_name: String = ""
var label: String = ""
var hp: int = 0
var max_hp: int = 0
var atk: int = 0
var def: int = 0
var exp_reward: int = 0
var gold_reward: int = 0
var poisoned: bool = false
var poison_turns: int = 0
var burn_turns: int = 0
var guard_turns: int = 0
var stunned: bool = false

static func from_template(enemy_key: String) -> EnemyData:
	var template: Dictionary = GameData.get_enemy(enemy_key)
	if template.is_empty():
		return null
	var e := EnemyData.new()
	e.key = enemy_key
	e.enemy_name = template.get("name", enemy_key)
	e.label = e.enemy_name
	e.hp = template.get("hp", 50)
	e.max_hp = e.hp
	e.atk = template.get("atk", 10)
	e.def = template.get("def", 0)
	e.exp_reward = template.get("exp", 10)
	e.gold_reward = template.get("gold", 5)
	return e
