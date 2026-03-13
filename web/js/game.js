/* game.js - Player 클래스 + GameState 싱글톤 */

class Player {
  constructor(name, job, hp, attack, defense) {
    this.name = name;
    this.job = job;
    this.maxHp = hp;
    this.hp = hp;
    this.attack = attack;
    this.defense = defense;
    this.gold = 50;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 100;
    this.inventory = [];
    this.equippedWeapon = null;
    this.equippedArmor = null;
    this.storyFlags = {};
    this.darkPoints = 0;
    this.visitedLocations = new Set();
    this.currentLocation = null;
    this.poisoned = false;
    this.mapId = 'mainland';
    this.mapRow = null;
    this.mapCol = null;

    /* F8: 업적 추적 통계 */
    this.stats = {
      monstersKilled: 0, totalGoldEarned: 0, bossesDefeated: 0,
      battlesWon: 0, stepsWalked: 0, criticalHits: 0,
      totalDamageDealt: 0, potionsUsed: 0, itemsCollected: 0,
    };
    this.unlockedAchievements = [];

    /* F10: 스토리릿 */
    this.seenStorylets = [];

    /* F9: 스킬 트리 */
    this.skillPoints = 0;
    this.unlockedSkills = [];
    this.passiveBuffs = {};
    this.tempBuffs = [];  /* 전투 중 임시 버프 [{stat, percent, turnsLeft}] */
    this.lastStandUsed = false;
  }

  /* Python player 호환 프로퍼티: YAML {player.xxx} 치환에서 사용 */
  get max_hp() { return this.maxHp; }
  set max_hp(v) { this.maxHp = v; }
  get story_flags() { return this.storyFlags; }
  get dark_points() { return this.darkPoints; }
  set dark_points(v) { this.darkPoints = v; }
  get equipped_weapon() { return this.equippedWeapon; }
  set equipped_weapon(v) { this.equippedWeapon = v; }
  get equipped_armor() { return this.equippedArmor; }
  set equipped_armor(v) { this.equippedArmor = v; }
  get exp_to_next() { return this.expToNext; }

  isAlive() { return this.hp > 0; }

  getAttack() {
    let base = this.attack;
    if (this.equippedWeapon) base += this.equippedWeapon.attack_bonus || 0;
    /* F9: 패시브 공격 보너스 */
    const pb = this.passiveBuffs || {};
    base += pb.attackBonus || 0;
    /* F9: 임시 버프 (전쟁 함성 등) */
    for (const b of (this.tempBuffs || [])) {
      if (b.stat === 'attack' && b.turnsLeft > 0) {
        base = Math.floor(base * (1 + b.percent / 100));
      }
    }
    /* F9: 보너스 데미지 % */
    if (pb.bonusDamagePercent) base = Math.floor(base * (1 + pb.bonusDamagePercent / 100));
    /* 치명타 판정 */
    let critChance = this.job === "도적" ? 0.25 : 0;
    critChance += (pb.critChanceBonus || 0) / 100;
    if (Math.random() < critChance) {
      return { damage: base * 2, critical: true };
    }
    return { damage: base, critical: false };
  }

  getDefense() {
    let base = this.defense;
    if (this.equippedArmor) base += this.equippedArmor.defense_bonus || 0;
    /* F9: 패시브 방어 보너스 */
    base += (this.passiveBuffs?.defenseBonus || 0);
    return base;
  }

  takeDamage(rawDmg) {
    const actual = Math.max(0, rawDmg - this.getDefense());
    this.hp = Math.max(0, this.hp - actual);
    return actual;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  gainExp(amount) {
    this.exp += amount;
    let leveled = false;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this._levelUp();
      leveled = true;
    }
    return leveled;
  }

  _levelUp() {
    this.level++;
    this.expToNext = Math.floor(this.expToNext * 1.4);
    const hpBonus = 15 + ((this.passiveBuffs?.maxHpBonus) ? 0 : 0); /* 기본 성장 */
    this.maxHp += hpBonus;
    this.hp = this.maxHp;
    this.attack += 3;
    this.defense += 1;
    /* F9: 레벨업 시 스킬 포인트 획득 */
    this.skillPoints = (this.skillPoints || 0) + 1;
  }

  toJSON() {
    return {
      name: this.name,
      job: this.job,
      maxHp: this.maxHp,
      hp: this.hp,
      attack: this.attack,
      defense: this.defense,
      gold: this.gold,
      level: this.level,
      exp: this.exp,
      expToNext: this.expToNext,
      inventory: [...this.inventory],
      equippedWeapon: this.equippedWeapon,
      equippedArmor: this.equippedArmor,
      storyFlags: { ...this.storyFlags },
      darkPoints: this.darkPoints,
      visitedLocations: [...this.visitedLocations],
      currentLocation: this.currentLocation,
      poisoned: this.poisoned,
      mapId: this.mapId,
      mapRow: this.mapRow,
      mapCol: this.mapCol,
      /* F8 */
      stats: { ...this.stats },
      unlockedAchievements: [...this.unlockedAchievements],
      /* F10 */
      seenStorylets: [...this.seenStorylets],
      /* F9 */
      skillPoints: this.skillPoints,
      unlockedSkills: [...this.unlockedSkills],
    };
  }

  static fromJSON(data) {
    const p = new Player(data.name, data.job, data.maxHp, data.attack, data.defense);
    p.hp = data.hp;
    p.gold = data.gold;
    p.level = data.level;
    p.exp = data.exp;
    p.expToNext = data.expToNext;
    p.inventory = data.inventory || [];
    p.equippedWeapon = data.equippedWeapon;
    p.equippedArmor = data.equippedArmor;
    p.storyFlags = data.storyFlags || {};
    p.darkPoints = data.darkPoints || 0;
    p.visitedLocations = new Set(data.visitedLocations || []);
    p.currentLocation = data.currentLocation;
    p.poisoned = data.poisoned || false;
    p.mapId = data.mapId || 'mainland';
    p.mapRow = Number.isInteger(data.mapRow) ? data.mapRow : null;
    p.mapCol = Number.isInteger(data.mapCol) ? data.mapCol : null;

    /* F8: 업적 */
    p.stats = data.stats || {
      monstersKilled: 0, totalGoldEarned: 0, bossesDefeated: 0,
      battlesWon: 0, stepsWalked: 0, criticalHits: 0,
      totalDamageDealt: 0, potionsUsed: 0, itemsCollected: 0,
    };
    p.unlockedAchievements = data.unlockedAchievements || [];

    /* F10: 스토리릿 */
    p.seenStorylets = data.seenStorylets || [];

    /* F9: 스킬 트리 (기존 세이브 호환) */
    p.skillPoints = data.skillPoints ?? Math.max(0, p.level - 1);
    p.unlockedSkills = data.unlockedSkills || [];
    p.passiveBuffs = {};
    p.tempBuffs = [];
    p.lastStandUsed = false;
    /* 패시브 재계산 */
    if (typeof SkillTreeManager !== 'undefined' && p.unlockedSkills.length > 0) {
      SkillTreeManager.recalcPassives(p);
    }

    return p;
  }
}


const GameState = {
  player: null,
  yamlCache: {},

  async loadYaml(zone) {
    if (this.yamlCache[zone]) return this.yamlCache[zone];
    try {
      const resp = await fetch(`data/areas/${zone}.yaml`);
      if (!resp.ok) return null;
      const text = await resp.text();
      const data = jsyaml.load(text);
      this.yamlCache[zone] = data;
      return data;
    } catch (e) {
      console.error(`YAML 로드 실패: ${zone}`, e);
      return null;
    }
  },

  saveToLocal(slot = 0) {
    if (!this.player) return false;
    const key = `rpg_save_${slot}`;
    const saveData = {
      player: this.player.toJSON(),
      timestamp: new Date().toISOString(),
      location: this.player.currentLocation,
    };
    localStorage.setItem(key, JSON.stringify(saveData));
    return true;
  },

  loadFromLocal(slot = 0) {
    const key = `rpg_save_${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const saveData = JSON.parse(raw);
      this.player = Player.fromJSON(saveData.player);
      return true;
    } catch (e) {
      console.error("세이브 로드 실패:", e);
      return false;
    }
  },

  getSaveList() {
    const saves = [];
    for (let i = 0; i < 5; i++) {
      const key = `rpg_save_${i}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          saves.push({
            slot: i,
            name: data.player.name,
            level: data.player.level,
            location: data.location,
            timestamp: data.timestamp,
          });
        } catch { /* skip corrupt */ }
      }
    }
    return saves;
  },

  deleteSave(slot) {
    localStorage.removeItem(`rpg_save_${slot}`);
  },
};
