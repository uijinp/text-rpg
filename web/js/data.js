/* data.js - 게임 데이터 (전역 상수) */

const CLASSES = {
  "전사": { hp: 120, attack: 15, defense: 8, desc: "높은 HP와 방어력을 가진 근접 전투 특화" },
  "마법사": { hp: 70, attack: 25, defense: 3, desc: "낮은 HP지만 강력한 마법 공격" },
  "도적": { hp: 90, attack: 18, defense: 5, desc: "균형 잡힌 스탯과 높은 치명타 확률" },
};

const ENEMY_TABLE = {
  goblin: { name: "고블린", hp: 30, atk: 8, def: 1, exp: 20, gold: 10 },
  wolf: { name: "늑대", hp: 45, atk: 12, def: 2, exp: 30, gold: 5 },
  orc: { name: "오크", hp: 70, atk: 16, def: 4, exp: 50, gold: 20 },
  troll: { name: "트롤", hp: 100, atk: 20, def: 6, exp: 80, gold: 35 },
  dragon_whelp: { name: "새끼 드래곤", hp: 110, atk: 26, def: 8, exp: 90, gold: 40 },
  dragon: { name: "드래곤", hp: 200, atk: 35, def: 10, exp: 200, gold: 150 },
  skeleton: { name: "해골전사", hp: 55, atk: 13, def: 3, exp: 40, gold: 12 },
  dark_mage: { name: "암흑마법사", hp: 50, atk: 22, def: 1, exp: 55, gold: 25 },
  vampire: { name: "뱀파이어", hp: 80, atk: 18, def: 5, exp: 70, gold: 40 },
  bandit: { name: "산적두목", hp: 55, atk: 14, def: 3, exp: 35, gold: 20 },
  undead_knight: { name: "언데드기사", hp: 90, atk: 20, def: 8, exp: 75, gold: 30 },
  dark_general: { name: "암흑장군", hp: 150, atk: 28, def: 8, exp: 120, gold: 80 },
  dwarf_golem: { name: "드워프 골렘", hp: 130, atk: 25, def: 12, exp: 95, gold: 50 },
  sand_scorpion: { name: "사막전갈", hp: 60, atk: 16, def: 5, exp: 45, gold: 15 },

  mummy: { name: "미라", hp: 85, atk: 19, def: 6, exp: 65, gold: 30 },
  pharaoh: { name: "파라오수호자", hp: 160, atk: 30, def: 9, exp: 130, gold: 90 },
  ice_golem: { name: "얼음골렘", hp: 110, atk: 22, def: 10, exp: 85, gold: 35 },
  frost_wyrm: { name: "서리비룡", hp: 180, atk: 32, def: 8, exp: 150, gold: 100 },
  swamp_snake: { name: "독사", hp: 40, atk: 14, def: 2, exp: 30, gold: 8 },
  swamp_witch: { name: "늪지마녀", hp: 70, atk: 24, def: 3, exp: 60, gold: 35 },
  sea_raider: { name: "해적", hp: 65, atk: 15, def: 4, exp: 40, gold: 25 },
  elf_guardian: { name: "엘프수호자", hp: 50, atk: 14, def: 4, exp: 38, gold: 15 },
  lake_spirit: { name: "호수정령", hp: 35, atk: 10, def: 2, exp: 25, gold: 20 },
  corrupted_spirit: { name: "타락한 정령", hp: 80, atk: 22, def: 4, exp: 65, gold: 20 },
  spirit_king: { name: "타락한 정령왕", hp: 170, atk: 32, def: 12, exp: 160, gold: 100 },
  labyrinth_guardian: { name: "미궁수호자", hp: 85, atk: 20, def: 7, exp: 70, gold: 30 },
  labyrinth_golem: { name: "미궁골렘", hp: 130, atk: 26, def: 11, exp: 100, gold: 50 },
  mercenary_duelist: { name: "용병결투사", hp: 75, atk: 18, def: 5, exp: 55, gold: 25 },
  fire_elemental: { name: "화염정령", hp: 95, atk: 24, def: 5, exp: 75, gold: 35 },
  lava_drake: { name: "용암드레이크", hp: 140, atk: 28, def: 7, exp: 110, gold: 60 },
  shadow_knight: { name: "그림자기사", hp: 100, atk: 22, def: 9, exp: 85, gold: 40 },
  dark_sentinel: { name: "어둠의파수꾼", hp: 120, atk: 25, def: 9, exp: 90, gold: 45 },
  shadow_lazarus: { name: "그림자라자러스", hp: 190, atk: 34, def: 10, exp: 180, gold: 120 },

  // ── 지하 세계 ──
  bone_warrior: { name: "해골전투병", hp: 120, atk: 24, def: 8, exp: 100, gold: 45 },
  death_knight: { name: "죽음의 기사", hp: 160, atk: 30, def: 12, exp: 140, gold: 70 },
  crystal_golem: { name: "수정 골렘", hp: 180, atk: 22, def: 15, exp: 130, gold: 60 },
  lava_worm: { name: "용암 지렁이", hp: 140, atk: 28, def: 6, exp: 110, gold: 50 },
  inferno_demon: { name: "지옥 악마", hp: 200, atk: 35, def: 10, exp: 170, gold: 90 },
  soul_wraith: { name: "원혼", hp: 100, atk: 32, def: 4, exp: 120, gold: 55 },
  abyss_lord: { name: "심연의 군주", hp: 300, atk: 40, def: 14, exp: 300, gold: 200 },

  // ── 천상 세계 ──
  cloud_sentinel: { name: "구름 파수꾼", hp: 130, atk: 26, def: 9, exp: 110, gold: 50 },
  light_spirit: { name: "빛의 정령", hp: 110, atk: 30, def: 5, exp: 100, gold: 45 },
  holy_knight: { name: "성기사", hp: 170, atk: 30, def: 13, exp: 150, gold: 75 },
  judgment_angel: { name: "심판의 천사", hp: 190, atk: 34, def: 10, exp: 160, gold: 85 },
  seraph_guardian: { name: "세라핌 수호자", hp: 220, atk: 36, def: 12, exp: 190, gold: 100 },
  divine_golem: { name: "신성 골렘", hp: 250, atk: 28, def: 18, exp: 180, gold: 90 },
  fallen_archangel: { name: "타락한 대천사", hp: 350, atk: 44, def: 16, exp: 350, gold: 250 },
};

const DROP_TABLE = {
  goblin: [{ item: "소형 포션", chance: 0.3 }],
  wolf: [{ item: "소형 포션", chance: 0.2 }],
  orc: [{ item: "대형 포션", chance: 0.25 }, { item: "낡은 검", chance: 0.15 }],
  troll: [{ item: "대형 포션", chance: 0.4 }, { item: "가죽 갑옷", chance: 0.2 }],
  dragon_whelp: [{ item: "대형 포션", chance: 0.5 }, { item: "사슬 갑옷", chance: 0.15 }],
  dragon: [{ item: "용의 심장", chance: 1.0 }, { item: "대형 포션", chance: 0.8 }],
  skeleton: [{ item: "소형 포션", chance: 0.3 }],
  dark_mage: [{ item: "대형 포션", chance: 0.35 }, { item: "마법 지팡이", chance: 0.1 }],
  vampire: [{ item: "대형 포션", chance: 0.4 }, { item: "해독제", chance: 0.3 }],
  bandit: [{ item: "소형 포션", chance: 0.4 }, { item: "낡은 검", chance: 0.2 }],
  undead_knight: [{ item: "사슬 갑옷", chance: 0.2 }, { item: "대형 포션", chance: 0.3 }],
  dark_general: [{ item: "강철 검", chance: 0.5 }, { item: "대형 포션", chance: 0.7 }],
  dwarf_golem: [{ item: "대지의 룬소드", chance: 0.3 }, { item: "대형 포션", chance: 0.6 }],
  sand_scorpion: [{ item: "해독제", chance: 0.4 }, { item: "소형 포션", chance: 0.3 }],
  mummy: [{ item: "대형 포션", chance: 0.3 }, { item: "고대 부적", chance: 0.15 }],
  pharaoh: [{ item: "파라오의 검", chance: 0.5 }, { item: "대형 포션", chance: 0.7 }],
  ice_golem: [{ item: "대형 포션", chance: 0.35 }, { item: "사슬 갑옷", chance: 0.15 }],
  frost_wyrm: [{ item: "서리의 검", chance: 0.5 }, { item: "대형 포션", chance: 0.8 }],
  swamp_snake: [{ item: "해독제", chance: 0.5 }, { item: "소형 포션", chance: 0.2 }],
  swamp_witch: [{ item: "대형 포션", chance: 0.4 }, { item: "마법 지팡이", chance: 0.2 }],
  sea_raider: [{ item: "소형 포션", chance: 0.3 }, { item: "낡은 검", chance: 0.25 }],
  elf_guardian: [{ item: "소형 포션", chance: 0.3 }, { item: "엘프의 로브", chance: 0.1 }],
  lake_spirit: [{ item: "소형 포션", chance: 0.5 }],
  corrupted_spirit: [{ item: "대형 포션", chance: 0.5 }, { item: "마법 로브", chance: 0.2 }],
  spirit_king: [{ item: "세계수의 이슬", chance: 1.0 }, { item: "고급 포션", chance: 0.9 }],
  labyrinth_guardian: [{ item: "대형 포션", chance: 0.35 }, { item: "해독제", chance: 0.2 }],
  labyrinth_golem: [{ item: "대형 포션", chance: 0.6 }, { item: "사슬 갑옷", chance: 0.3 }],
  mercenary_duelist: [{ item: "소형 포션", chance: 0.4 }, { item: "해독제", chance: 0.2 }],
  fire_elemental: [{ item: "대형 포션", chance: 0.4 }, { item: "고급 포션", chance: 0.15 }],
  lava_drake: [{ item: "고급 포션", chance: 0.5 }, { item: "강철 검", chance: 0.3 }],
  shadow_knight: [{ item: "대형 포션", chance: 0.4 }, { item: "사슬 갑옷", chance: 0.2 }],
  dark_sentinel: [{ item: "대형 포션", chance: 0.5 }, { item: "강철 검", chance: 0.25 }],
  shadow_lazarus: [{ item: "고급 포션", chance: 0.8 }, { item: "강화 갑옷", chance: 0.5 }],

  // ── 지하 세계 ──
  bone_warrior: [{ item: "심연의 포션", chance: 0.3 }, { item: "뼈 갑옷", chance: 0.1 }],
  death_knight: [{ item: "심연의 포션", chance: 0.5 }, { item: "뼈 갑옷", chance: 0.2 }],
  crystal_golem: [{ item: "수정 대검", chance: 0.15 }, { item: "심연의 포션", chance: 0.4 }],
  lava_worm: [{ item: "심연의 포션", chance: 0.4 }, { item: "고급 포션", chance: 0.3 }],
  inferno_demon: [{ item: "지옥불 검", chance: 0.3 }, { item: "심연의 포션", chance: 0.6 }],
  soul_wraith: [{ item: "심연의 로브", chance: 0.15 }, { item: "심연의 포션", chance: 0.35 }],
  abyss_lord: [{ item: "심연의 왕관", chance: 1.0 }, { item: "심연의 포션", chance: 0.9 }],

  // ── 천상 세계 ──
  cloud_sentinel: [{ item: "천상의 영약", chance: 0.3 }, { item: "천상의 로브", chance: 0.1 }],
  light_spirit: [{ item: "천상의 영약", chance: 0.25 }, { item: "고급 포션", chance: 0.3 }],
  holy_knight: [{ item: "천상의 영약", chance: 0.5 }, { item: "세라핌의 갑옷", chance: 0.15 }],
  judgment_angel: [{ item: "성광의 검", chance: 0.2 }, { item: "천상의 영약", chance: 0.5 }],
  seraph_guardian: [{ item: "성광의 검", chance: 0.3 }, { item: "천상의 영약", chance: 0.6 }],
  divine_golem: [{ item: "세라핌의 갑옷", chance: 0.25 }, { item: "천상의 영약", chance: 0.5 }],
  fallen_archangel: [{ item: "여명의 왕관", chance: 1.0 }, { item: "천상의 영약", chance: 0.9 }],
};

const ITEMS = {
  "소형 포션": { type: "consumable", effect: "heal", value: 30, price: 20, desc: "HP를 30 회복한다" },
  "대형 포션": { type: "consumable", effect: "heal", value: 80, price: 50, desc: "HP를 80 회복한다" },
  "고급 포션": { type: "consumable", effect: "heal", value: 120, price: 100, desc: "HP를 120 회복한다" },
  "해독제": { type: "consumable", effect: "cure", value: 0, price: 30, desc: "독 상태를 해제한다" },
  "낡은 검": { type: "weapon", attack_bonus: 5, price: 40, desc: "공격력 +5" },
  "강철 검": { type: "weapon", attack_bonus: 12, price: 100, desc: "공격력 +12" },
  "마법 지팡이": { type: "weapon", attack_bonus: 18, price: 150, desc: "공격력 +18" },
  "도적의 단검": { type: "weapon", attack_bonus: 8, price: 80, desc: "공격력 +8" },
  "파라오의 검": { type: "weapon", attack_bonus: 25, price: 300, desc: "공격력 +25" },
  "서리의 검": { type: "weapon", attack_bonus: 22, price: 250, desc: "공격력 +22" },
  "봉인의 검": { type: "weapon", attack_bonus: 20, price: 0, desc: "공격력 +20, 라자러스에게 특효" },
  "용병의 도끼": { type: "weapon", attack_bonus: 15, price: 180, desc: "공격력 +15" },
  "엘프의 장궁": { type: "weapon", attack_bonus: 18, price: 220, desc: "공격력 +18, 숲의 기운이 깃든 정교한 활" },
  "대지의 룬소드": { type: "weapon", attack_bonus: 24, price: 200, desc: "공격력 +24, 드워프 장인의 걸작" },
  "염화의 검": { type: "weapon", attack_bonus: 30, price: 0, desc: "공격력 +30, 화산의 불꽃으로 단련된 전설의 검" },
  "드래곤 슬레이어": { type: "weapon", attack_bonus: 35, price: 0, desc: "공격력 +35, 용을 베어버리는 궁극의 대검" },
  "정령왕의 가지": { type: "weapon", attack_bonus: 28, price: 0, desc: "공격력 +28, 압도적인 마력을 품은 지팡이" },
  "가죽 갑옷": { type: "armor", defense_bonus: 4, price: 60, desc: "방어력 +4" },
  "사슬 갑옷": { type: "armor", defense_bonus: 9, price: 120, desc: "방어력 +9" },
  "마법 로브": { type: "armor", defense_bonus: 3, price: 90, desc: "방어력 +3" },
  "엘프의 로브": { type: "armor", defense_bonus: 6, price: 0, desc: "방어력 +6" },
  "강화 갑옷": { type: "armor", defense_bonus: 7, price: 140, desc: "방어력 +7" },
  "용암 갑옷": { type: "armor", defense_bonus: 12, price: 0, desc: "방어력 +12" },
  "행운의 부적": { type: "special", price: 0, desc: "도망 성공률 +20%" },
  "지도 조각": { type: "special", price: 0, desc: "어딘가의 지도 조각" },
  "고대 부적": { type: "special", price: 0, desc: "고대의 부적" },
  "달빛 장신구": { type: "special", price: 0, desc: "달빛이 깃든 장신구" },
  "봉인 반지": { type: "special", price: 0, desc: "왕의 봉인 반지. 모든 것의 시작이자 끝" },
  "용의 심장": { type: "special", price: 0, desc: "뜨겁게 고동치는 전설적인 드래곤의 심장" },
  "세계수의 잎사귀": { type: "consumable", effect: "heal", value: 150, price: 80, desc: "HP를 150 회복한다. 숲의 축복" },
  "세계수의 이슬": { type: "consumable", effect: "heal", value: 300, price: 500, desc: "HP를 300 회복한다. 정령의 축복" },

  // ── 지하 세계 ──
  "심연의 포션": { type: "consumable", effect: "heal", value: 200, price: 150, desc: "HP를 200 회복한다. 지하 세계의 약초" },
  "수정 대검": { type: "weapon", attack_bonus: 32, price: 400, desc: "공격력 +32, 빛나는 수정으로 벼린 대검" },
  "뼈 갑옷": { type: "armor", defense_bonus: 14, price: 350, desc: "방어력 +14, 거대한 뼈로 만든 갑옷" },
  "심연의 로브": { type: "armor", defense_bonus: 10, price: 280, desc: "방어력 +10, 어둠의 기운을 두른 로브" },
  "지옥불 검": { type: "weapon", attack_bonus: 38, price: 0, desc: "공격력 +38, 지옥의 불꽃이 타오르는 마검" },
  "심연의 왕관": { type: "special", price: 0, desc: "심연의 군주가 쓰던 왕관. 어둠의 권능이 깃들어 있다" },

  // ── 천상 세계 ──
  "천상의 영약": { type: "consumable", effect: "heal", value: 250, price: 200, desc: "HP를 250 회복한다. 천상의 축복이 깃든 약" },
  "성광의 검": { type: "weapon", attack_bonus: 36, price: 500, desc: "공격력 +36, 신성한 빛으로 벼린 검" },
  "대천사의 대검": { type: "weapon", attack_bonus: 42, price: 0, desc: "공격력 +42, 대천사의 신성한 힘이 깃든 궁극의 검" },
  "천상의 로브": { type: "armor", defense_bonus: 12, price: 350, desc: "방어력 +12, 성스러운 기운을 두른 로브" },
  "세라핌의 갑옷": { type: "armor", defense_bonus: 16, price: 450, desc: "방어력 +16, 천사의 깃털로 만든 갑옷" },
  "여명의 왕관": { type: "special", price: 0, desc: "타락한 대천사가 쓰던 왕관. 여명의 권능이 깃들어 있다" },
};

const SHOP_STOCK = ["소형 포션", "대형 포션", "해독제", "낡은 검", "강철 검", "가죽 갑옷", "사슬 갑옷"];
const MERC_SHOP_STOCK = ["소형 포션", "대형 포션", "고급 포션", "해독제", "용병의 도끼", "강화 갑옷"];
const UW_SHOP_STOCK = ["심연의 포션", "고급 포션", "해독제", "수정 대검", "뼈 갑옷", "심연의 로브"];
const CEL_SHOP_STOCK = ["천상의 영약", "고급 포션", "해독제", "성광의 검", "세라핌의 갑옷", "천상의 로브"];

const AREAS = {
  town: { name: "아르카디아", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "아르카디아 마을의 따뜻한 거리." },
  forest: { name: "어두운 숲", unlock_condition: null, lock_hint: null, encounter_chance: 0.35, encounter_enemies: ["goblin", "wolf"], desc: "어둠이 짙은 숲." },
  cave: { name: "몬스터 동굴", unlock_condition: { flag: "forest_cleared" }, lock_hint: "숲을 먼저 정리해야 합니다.", encounter_chance: 0.40, encounter_enemies: ["skeleton", "dark_mage"], desc: "음침한 동굴 입구." },
  dwarf_mine: { name: "드워프 광산", unlock_condition: { flag: "cave_cleared" }, lock_hint: "동굴을 먼저 탐색해야 광산으로 가는 길이 열립니다.", encounter_chance: 0.30, encounter_enemies: ["goblin", "dwarf_golem"], desc: "거대한 지하 광산. 곡괭이 소리가 울려퍼진다." },
  river: { name: "안개 강가", unlock_condition: { flag: "forest_cleared" }, lock_hint: "숲을 먼저 정리해야 합니다.", encounter_chance: 0.20, encounter_enemies: ["wolf", "bandit"], desc: "안개가 자욱한 강가." },
  ruins: { name: "저주받은 폐허", unlock_condition: { flag: "forest_cleared" }, lock_hint: "숲을 먼저 정리해야 합니다.", encounter_chance: 0.45, encounter_enemies: ["skeleton", "vampire"], desc: "무너진 폐허." },
  bandit_camp: { name: "산적 야영지", unlock_condition: { any_flag: ["cave_cleared", "river_cleared", "ruins_cleared"] }, lock_hint: "동굴/강가/폐허 중 한 곳을 먼저 해결하세요.", encounter_chance: 0.25, encounter_enemies: ["bandit", "orc"], desc: "산적들의 야영지." },
  castle_gate: { name: "마왕의 성 정문", unlock_condition: { flag: "bandit_camp_cleared" }, lock_hint: "산적 야영지를 먼저 해결하세요.", encounter_chance: 0.50, encounter_enemies: ["undead_knight"], desc: "거대한 검은 성벽." },
  castle_inside: { name: "성 내부", unlock_condition: { flag: "castle_gate_cleared" }, lock_hint: "성문을 먼저 돌파하세요.", encounter_chance: 0.30, encounter_enemies: ["undead_knight", "dark_mage"], desc: "차가운 성 복도." },
  throne: { name: "마왕의 방", unlock_condition: { flag: "castle_inside_cleared" }, lock_hint: "성 내부를 먼저 탐색하세요.", encounter_chance: 0, encounter_enemies: [], desc: "거대한 왕좌의 방." },
  harbor: { name: "포구 마을", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "파도 소리와 갈매기 울음." },
  swamp: { name: "독안개 늪", unlock_condition: null, lock_hint: null, encounter_chance: 0.40, encounter_enemies: ["swamp_snake", "swamp_witch"], desc: "독안개가 피어오르는 늪지대." },
  desert_town: { name: "사하르 마을", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "이국적인 향신료 냄새." },
  pyramid: { name: "파라오의 피라미드", unlock_condition: { flag: "desert_explored" }, lock_hint: "사하르 마을을 먼저 탐색하세요.", encounter_chance: 0.50, encounter_enemies: ["mummy", "skeleton"], desc: "거대한 피라미드." },
  oasis: { name: "오아시스", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "사막의 오아시스." },
  ice_cave: { name: "빙하 동굴", unlock_condition: { flag: "castle_gate_cleared" }, lock_hint: "성 정문을 먼저 돌파하세요.", encounter_chance: 0.45, encounter_enemies: ["ice_golem", "frost_wyrm"], desc: "빙하 동굴." },
  elf_village: { name: "엘프 마을", unlock_condition: { flag: "forest_cleared" }, lock_hint: "숲을 먼저 정리해야 합니다.", encounter_chance: 0.15, encounter_enemies: ["elf_guardian"], desc: "고요한 엘프 숲." },
  spirit_forest: { name: "정령왕의 숲", unlock_condition: { flag: "elf_village_visited" }, lock_hint: "엘프 마을을 먼저 방문해야 비밀 통로가 열립니다.", encounter_chance: 0.35, encounter_enemies: ["corrupted_spirit", "wolf"], desc: "타락한 마력이 맴도는 울창한 숲." },
  moonlight_lake: { name: "달빛 호수", unlock_condition: null, lock_hint: null, encounter_chance: 0.10, encounter_enemies: ["lake_spirit"], desc: "달빛이 수면 위에 춤추는 호수." },
  labyrinth: { name: "지하 미궁", unlock_condition: { flag: "ruins_cleared" }, lock_hint: "폐허를 먼저 정리하세요.", encounter_chance: 0.45, encounter_enemies: ["labyrinth_guardian", "skeleton"], desc: "어둠 속 미궁 통로." },
  mercenary_camp: { name: "용병단 야영지", unlock_condition: { flag: "bandit_camp_cleared" }, lock_hint: "산적 야영지를 먼저 해결하세요.", encounter_chance: 0.10, encounter_enemies: ["mercenary_duelist"], desc: "용병들의 야영지." },
  dark_tower: { name: "어둠의 탑", unlock_condition: { flag: "castle_inside_cleared" }, lock_hint: "성 내부를 먼저 탐색하세요.", encounter_chance: 0.50, encounter_enemies: ["shadow_knight", "dark_sentinel"], desc: "검은 탑. 그림자가 일렁인다." },
  volcano: { name: "화산 지대", unlock_condition: { flag: "pyramid_cleared" }, lock_hint: "피라미드를 먼저 공략하세요.", encounter_chance: 0.40, encounter_enemies: ["fire_elemental", "lava_drake"], desc: "화산 열기가 대기를 달군다." },
  dragon_dungeon: { name: "드래곤의 던전", unlock_condition: { flag: "volcano_cleared" }, lock_hint: "화산 지대를 먼저 정복해야 합니다.", encounter_chance: 0.50, encounter_enemies: ["dragon_whelp", "lava_drake"], desc: "숨 쉬기조차 힘든 초고온의 거대한 둥지." },
};

// 타일 기반 이동용 추가 지역(이벤트는 없고 이동/조우용)
AREAS.desert = {
  name: "사하르 사막",
  unlock_condition: null,
  lock_hint: null,
  encounter_chance: 0.30,
  encounter_enemies: ["sand_scorpion", "bandit"],
  desc: "뜨거운 모래바람이 시야를 가린다.",
};
// ── 지하 세계 지역 ──
AREAS.uw_entrance = { name: "심연의 입구", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "지상에서 내려온 깊은 동굴 입구. 차갑고 축축한 바람이 분다." };
AREAS.uw_boneyard = { name: "뼈의 묘지", unlock_condition: null, lock_hint: null, encounter_chance: 0.40, encounter_enemies: ["bone_warrior", "soul_wraith"], desc: "수없이 많은 해골이 널려 있는 묘지." };
AREAS.uw_crystal = { name: "수정 동굴", unlock_condition: { flag: "uw_boneyard_cleared" }, lock_hint: "뼈의 묘지를 먼저 정리하세요.", encounter_chance: 0.35, encounter_enemies: ["crystal_golem", "bone_warrior"], desc: "거대한 수정이 빛을 내뿜는 동굴." };
AREAS.uw_lava_lake = { name: "용암 호수", unlock_condition: { flag: "uw_crystal_cleared" }, lock_hint: "수정 동굴을 먼저 탐색하세요.", encounter_chance: 0.45, encounter_enemies: ["lava_worm", "inferno_demon"], desc: "끓어오르는 용암 호수. 열기가 숨을 막는다." };
AREAS.uw_fortress = { name: "망자의 요새", unlock_condition: { flag: "uw_lava_lake_cleared" }, lock_hint: "용암 호수를 먼저 돌파하세요.", encounter_chance: 0.50, encounter_enemies: ["death_knight", "soul_wraith"], desc: "죽은 자들이 지키는 거대한 요새." };
AREAS.uw_abyss = { name: "심연의 심장", unlock_condition: { flag: "uw_fortress_cleared" }, lock_hint: "망자의 요새를 먼저 정복하세요.", encounter_chance: 0, encounter_enemies: [], desc: "세계의 끝. 심연의 군주가 기다리는 곳." };
AREAS.uw_market = { name: "암흑 시장", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "수상한 상인들이 모인 지하 시장." };
AREAS.uw_temple = { name: "영혼의 신전", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "고대 신전. 희미한 빛이 상처를 치유한다." };

AREAS.uw_bone_terrain = { name: "뼈의 묘지", unlock_condition: null, lock_hint: null, encounter_chance: 0.35, encounter_enemies: ["bone_warrior", "soul_wraith"], desc: "해골이 널린 땅." };
AREAS.uw_crystal_terrain = { name: "수정 동굴", unlock_condition: { flag: "uw_boneyard_cleared" }, lock_hint: "뼈의 묘지를 먼저 정리하세요.", encounter_chance: 0.30, encounter_enemies: ["crystal_golem"], desc: "수정이 빛나는 통로." };
AREAS.uw_lava_terrain = { name: "용암 지대", unlock_condition: { flag: "uw_crystal_cleared" }, lock_hint: "수정 동굴을 먼저 탐색하세요.", encounter_chance: 0.40, encounter_enemies: ["lava_worm", "inferno_demon"], desc: "뜨거운 용암이 흐르는 지대." };
AREAS.uw_fortress_terrain = { name: "망자의 요새", unlock_condition: { flag: "uw_lava_lake_cleared" }, lock_hint: "용암 호수를 먼저 돌파하세요.", encounter_chance: 0.45, encounter_enemies: ["death_knight", "bone_warrior"], desc: "요새 주변의 황폐한 대지." };
AREAS.uw_abyss_terrain = { name: "심연 지대", unlock_condition: { flag: "uw_fortress_cleared" }, lock_hint: "망자의 요새를 먼저 정복하세요.", encounter_chance: 0.50, encounter_enemies: ["inferno_demon", "soul_wraith"], desc: "어둠이 깊어지는 심연." };

// ── 천상 세계 지역 ──
AREAS.cel_gate = { name: "구름의 문", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "구름을 뚫고 나타난 천상 왕국의 입구. 찬란한 빛이 눈을 멀게 한다." };
AREAS.cel_garden = { name: "천상의 정원", unlock_condition: null, lock_hint: null, encounter_chance: 0.35, encounter_enemies: ["cloud_sentinel", "light_spirit"], desc: "성스러운 불꽃이 타오르는 천상의 정원." };
AREAS.cel_hall = { name: "심판의 전당", unlock_condition: { flag: "cel_garden_cleared" }, lock_hint: "천상의 정원을 먼저 정리하세요.", encounter_chance: 0.40, encounter_enemies: ["holy_knight", "judgment_angel"], desc: "거대한 심판의 저울이 놓인 전당." };
AREAS.cel_arsenal = { name: "빛의 무기고", unlock_condition: { flag: "cel_hall_cleared" }, lock_hint: "심판의 전당을 먼저 돌파하세요.", encounter_chance: 0.45, encounter_enemies: ["judgment_angel", "divine_golem"], desc: "신성한 무기들이 스스로 움직이는 무기고." };
AREAS.cel_spire = { name: "수정 첨탑", unlock_condition: { flag: "cel_arsenal_cleared" }, lock_hint: "빛의 무기고를 먼저 정복하세요.", encounter_chance: 0.50, encounter_enemies: ["seraph_guardian", "divine_golem"], desc: "순수한 빛으로 이루어진 수정 첨탑." };
AREAS.cel_throne = { name: "여명의 왕좌", unlock_condition: { flag: "cel_spire_cleared" }, lock_hint: "수정 첨탑을 먼저 정복하세요.", encounter_chance: 0, encounter_enemies: [], desc: "천상 왕국의 최정점. 타락한 대천사가 기다리는 곳." };
AREAS.cel_market = { name: "반란 천사의 시장", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "대천사에 맞서는 반란 천사들이 모인 은밀한 시장." };
AREAS.cel_sanctuary = { name: "빛의 성소", unlock_condition: null, lock_hint: null, encounter_chance: 0, encounter_enemies: [], desc: "아직 순수한 빛이 남아있는 성소. 마음이 편안해진다." };

AREAS.cel_garden_terrain = { name: "천상의 정원", unlock_condition: null, lock_hint: null, encounter_chance: 0.30, encounter_enemies: ["cloud_sentinel", "light_spirit"], desc: "신성한 꽃이 피어있는 구름 위의 정원." };
AREAS.cel_hall_terrain = { name: "심판의 전당", unlock_condition: { flag: "cel_garden_cleared" }, lock_hint: "천상의 정원을 먼저 정리하세요.", encounter_chance: 0.35, encounter_enemies: ["holy_knight", "judgment_angel"], desc: "심판의 기운이 감도는 길." };
AREAS.cel_arsenal_terrain = { name: "빛의 무기고", unlock_condition: { flag: "cel_hall_cleared" }, lock_hint: "심판의 전당을 먼저 돌파하세요.", encounter_chance: 0.40, encounter_enemies: ["judgment_angel", "divine_golem"], desc: "신성한 무기의 기운이 서린 지대." };
AREAS.cel_spire_terrain = { name: "수정 첨탑", unlock_condition: { flag: "cel_arsenal_cleared" }, lock_hint: "빛의 무기고를 먼저 정복하세요.", encounter_chance: 0.45, encounter_enemies: ["seraph_guardian", "divine_golem"], desc: "빛나는 수정이 솟아있는 지대." };
AREAS.cel_throne_terrain = { name: "여명의 왕좌 지대", unlock_condition: { flag: "cel_spire_cleared" }, lock_hint: "수정 첨탑을 먼저 정복하세요.", encounter_chance: 0.50, encounter_enemies: ["seraph_guardian", "judgment_angel"], desc: "눈부신 빛이 쏟아지는 왕좌 주변." };

AREAS.ice = {
  name: "빙하 지대",
  unlock_condition: { flag: "castle_gate_cleared" },
  lock_hint: "마왕의 성 정문을 먼저 돌파하세요.",
  encounter_chance: 0.35,
  encounter_enemies: ["ice_golem", "undead_knight"],
  desc: "얼어붙은 빙하 지대. 발밑이 미끄럽다.",
};

const AREA_BG_IMAGE = {
  town: "arcadia.webp",
  forest: "forest.webp",
  cave: "cave.webp",
  dwarf_mine: "cave.webp",
  river: "river.webp",
  ruins: "ruins.webp",
  bandit_camp: "bandit_camp.webp",
  castle_gate: "castle_gate.webp",
  castle_inside: "castle_inside.webp",
  throne: "boss_chamber.webp",
  harbor: "river.webp",
  swamp: "river.webp",
  desert_town: "sahar.webp",
  pyramid: "desert.webp",
  oasis: "desert.webp",
  desert: "desert.webp",
  ice: "ice.webp",
  ice_cave: "ice.webp",
  elf_village: "forest.webp",
  spirit_forest: "forest.webp",
  moonlight_lake: "river.webp",
  labyrinth: "cave.webp",
  mercenary_camp: "bandit_camp.webp",
  dark_tower: "castle_inside.webp",
  volcano: "boss_chamber.webp",
  dragon_dungeon: "boss_chamber.webp",
  uw_entrance: "underworld.webp",
  uw_boneyard: "underworld.webp",
  uw_crystal: "underworld.webp",
  uw_lava_lake: "underworld.webp",
  uw_fortress: "underworld.webp",
  uw_abyss: "boss_chamber.webp",
  uw_market: "underworld.webp",
  uw_temple: "underworld.webp",
  uw_bone_terrain: "underworld.webp",
  uw_crystal_terrain: "underworld.webp",
  uw_lava_terrain: "underworld.webp",
  uw_fortress_terrain: "underworld.webp",
  uw_abyss_terrain: "underworld.webp",
  cel_gate: "celestial.webp",
  cel_garden: "celestial.webp",
  cel_hall: "celestial.webp",
  cel_arsenal: "celestial.webp",
  cel_spire: "celestial.webp",
  cel_throne: "celestial.webp",
  cel_market: "celestial.webp",
  cel_sanctuary: "celestial.webp",
  cel_garden_terrain: "celestial.webp",
  cel_hall_terrain: "celestial.webp",
  cel_arsenal_terrain: "celestial.webp",
  cel_spire_terrain: "celestial.webp",
  cel_throne_terrain: "celestial.webp",
};

const TERRAIN = {
  "#": { passable: false, zone: null },
  "w": { passable: false, zone: null },
  "^": { passable: false, zone: null },
  ".": { passable: true, zone: null },
  "=": { passable: true, zone: null },
  "f": { passable: true, zone: "forest" },
  "c": { passable: true, zone: "cave" },
  "q": { passable: true, zone: "dwarf_mine" },
  "r": { passable: true, zone: "river" },
  "u": { passable: true, zone: "ruins" },
  "b": { passable: true, zone: "bandit_camp" },
  "g": { passable: true, zone: "castle_gate" },
  "i": { passable: true, zone: "castle_inside" },
  "a": { passable: true, zone: "harbor" },
  "d": { passable: true, zone: "desert" },
  "n": { passable: true, zone: "swamp" },
  "x": { passable: true, zone: "ice" },
  "e": { passable: true, zone: "elf_village" },
  "s": { passable: true, zone: "spirit_forest" },
  "m": { passable: true, zone: "moonlight_lake" },
  "y": { passable: true, zone: "labyrinth" },
  "j": { passable: true, zone: "mercenary_camp" },
  "t": { passable: true, zone: "dark_tower" },
  "v": { passable: true, zone: "volcano" },
  "z": { passable: true, zone: "dragon_dungeon" },
};

const LOCATIONS = {
  T: { name: "아르카디아", zone: "town" },
  F: { name: "어두운 숲", zone: "forest" },
  C: { name: "몬스터 동굴", zone: "cave" },
  Q: { name: "드워프 광산", zone: "dwarf_mine" },
  R: { name: "안개 강가", zone: "river" },
  U: { name: "저주받은 폐허", zone: "ruins" },
  B: { name: "산적 야영지", zone: "bandit_camp" },
  G: { name: "마왕의 성 정문", zone: "castle_gate" },
  I: { name: "성 내부", zone: "castle_inside" },
  K: { name: "마왕의 방", zone: "throne" },
  H: { name: "포구 마을", zone: "harbor" },
  D: { name: "사하르 마을", zone: "desert_town" },
  P: { name: "파라오의 피라미드", zone: "pyramid" },
  O: { name: "오아시스", zone: "oasis" },
  W: { name: "독안개 늪", zone: "swamp" },
  L: { name: "빙하 동굴", zone: "ice_cave" },
  E: { name: "엘프 마을", zone: "elf_village" },
  S: { name: "정령왕의 숲", zone: "spirit_forest" },
  M: { name: "달빛 호수", zone: "moonlight_lake" },
  Y: { name: "지하 미궁", zone: "labyrinth" },
  J: { name: "용병단 야영지", zone: "mercenary_camp" },
  A: { name: "어둠의 탑", zone: "dark_tower" },
  V: { name: "화산 지대", zone: "volcano" },
  Z: { name: "드래곤의 던전", zone: "dragon_dungeon" },
};

const RAW_MAP = [
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
  "#...eeee=eeeeeeee...............jjjjj=jjjjj...............................#",
  "#...ssss=ssssssss...............jjjjjJjjjjj...............................#",
  "#...ssssSssssssss...............jjjjj=jjjjj...............................#",
  "#...sssssssssssss.............bbbbbbb=bbbbbbb.............................#",
  "#..........qqqqqqq............bbbbbbbBbbbbbbb.............................#",
  "#..........qqqqQqq=...........bbbbbbb=bbbbbbb.............................#",
  "#.............cccccc=cccccc...rrrrrrr=rrrrrrr...uuuuuuuuuuuuu.............#",
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
  "#.^^^^^...zzzzzzzz...zzzzzz............................vvvvvv=vvvvvvv.....#",
  "#.^^^^^...zzzzZzzz=..zzzzzz............................vvvvvv=vvvvvvv.....#",
  "#.^^^^^...zzzzzzzz=zzzzzzzz............................======.............#",
  "###########################################################################",
];

/* ═══════════════════════════════════════════════
   지하 세계 맵
   ═══════════════════════════════════════════════ */

const RAW_MAP_UNDERWORLD = [
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~.....................................................~",
  "~.....111111111.......................................~",
  "~.....111111111........22222222.......................~",
  "~.....1111B1111________222C2222.......................~",
  "~.....111111111........22222222.......................~",
  "~.....1111_1111........2222_222.......................~",
  "~........._..................._.......................~",
  "~........._..................._.......................~",
  "~...66666_66666...........333_333...444444444.........~",
  "~...66666M66666...........333_333...444444444.........~",
  "~...66666666666...........3333333...4444F4444.........~",
  "~..........._______________33L33_____444_4444.........~",
  "~..........._..............33333......____............~",
  "~.777777777_7................................555555...~",
  "~.777T77777_7................................555555...~",
  "~.777777777...................................55D55...~",
  "~..........___________________________________55555...~",
  "~..........N..........................................~",
  "~.....................................................~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
];

const TERRAIN_UNDERWORLD = {
  "~": { passable: false, zone: null },
  ".": { passable: true, zone: null },
  "_": { passable: true, zone: null },
  "1": { passable: true, zone: "uw_bone_terrain" },
  "2": { passable: true, zone: "uw_crystal_terrain" },
  "3": { passable: true, zone: "uw_lava_terrain" },
  "4": { passable: true, zone: "uw_fortress_terrain" },
  "5": { passable: true, zone: "uw_abyss_terrain" },
  "6": { passable: true, zone: "uw_market" },
  "7": { passable: true, zone: "uw_temple" },
};

const LOCATIONS_UNDERWORLD = {
  N: { name: "심연의 입구", zone: "uw_entrance" },
  B: { name: "뼈의 묘지", zone: "uw_boneyard" },
  C: { name: "수정 동굴", zone: "uw_crystal" },
  L: { name: "용암 호수", zone: "uw_lava_lake" },
  F: { name: "망자의 요새", zone: "uw_fortress" },
  D: { name: "심연의 심장", zone: "uw_abyss" },
  M: { name: "암흑 시장", zone: "uw_market" },
  T: { name: "영혼의 신전", zone: "uw_temple" },
};

/* ═══════════════════════════════════════════════
   천상 세계 맵
   ═══════════════════════════════════════════════ */

const RAW_MAP_CELESTIAL = [
  "*******************************************************",
  "*.....................................................*",
  "*...11111111..........................................*",
  "*...1111P111________222222222.........................*",
  "*...11111111........222H22222.........................*",
  "*...1111_111........222222222.........................*",
  "*......._..............._.............................*",
  "*......._..............._.............................*",
  "*...66666_66666....333_33333...44444S44444............*",
  "*...66666M66666....333_33333...44444444444............*",
  "*...66666666666....3333333.....4444A44444.............*",
  "*............____________33333____444_4444............*",
  "*.........._............33333......____...............*",
  "*.777777777_7..................................55555..*",
  "*.777R77777_7..................................55555..*",
  "*.777777777....................................5T555..*",
  "*..........____________________________________55555..*",
  "*..........G..........................................*",
  "*.....................................................*",
  "*******************************************************",
];

const TERRAIN_CELESTIAL = {
  "*": { passable: false, zone: null },
  ".": { passable: true, zone: null },
  "_": { passable: true, zone: null },
  "1": { passable: true, zone: "cel_garden_terrain" },
  "2": { passable: true, zone: "cel_hall_terrain" },
  "3": { passable: true, zone: "cel_arsenal_terrain" },
  "4": { passable: true, zone: "cel_spire_terrain" },
  "5": { passable: true, zone: "cel_throne_terrain" },
  "6": { passable: true, zone: "cel_market" },
  "7": { passable: true, zone: "cel_sanctuary" },
};

const LOCATIONS_CELESTIAL = {
  G: { name: "구름의 문", zone: "cel_gate" },
  P: { name: "천상의 정원", zone: "cel_garden" },
  H: { name: "심판의 전당", zone: "cel_hall" },
  A: { name: "빛의 무기고", zone: "cel_arsenal" },
  S: { name: "수정 첨탑", zone: "cel_spire" },
  T: { name: "여명의 왕좌", zone: "cel_throne" },
  M: { name: "반란 천사의 시장", zone: "cel_market" },
  R: { name: "빛의 성소", zone: "cel_sanctuary" },
};

const MAP_REGISTRY = {
  mainland: { name: "지상 세계", raw: RAW_MAP, locations: LOCATIONS, terrain: TERRAIN },
  underworld: { name: "지하 세계", raw: RAW_MAP_UNDERWORLD, locations: LOCATIONS_UNDERWORLD, terrain: TERRAIN_UNDERWORLD },
  celestial: { name: "천상 세계", raw: RAW_MAP_CELESTIAL, locations: LOCATIONS_CELESTIAL, terrain: TERRAIN_CELESTIAL },
};
