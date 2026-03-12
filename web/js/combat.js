/* combat.js - 전투 시스템 (다중 적 지원) */

const CombatSystem = {
  ENEMY_BEHAVIOR: {
    goblin: { intros: ['수풀 사이에서 고블린이 비열하게 웃었다!', '고블린이 녹슨 칼을 휘두르며 달려든다!'], style: 'trickster', evadeChance: 0.08 },
    wolf: { intros: ['늑대가 낮게 으르렁거리며 원을 그린다.', '굶주린 늑대가 송곳니를 드러냈다!'], style: 'beast', multiHitChance: 0.22 },
    bandit: { intros: ['산적 두목이 칼끝을 겨누며 도발한다.', '산적이 비열한 미소와 함께 달려든다!'], style: 'trickster', evadeChance: 0.1 },
    dark_mage: { intros: ['암흑 마법사가 검은 마력을 모은다.', '암흑 마법사의 눈동자가 보랏빛으로 번뜩인다.'], style: 'caster', skillChance: 0.35 },
    vampire: { intros: ['뱀파이어가 붉은 눈으로 피를 갈망한다.', '차가운 웃음과 함께 뱀파이어가 날개를 펼친다.'], style: 'drain' },
    swamp_snake: { intros: ['독사가 혀를 날름거리며 노린다.', '축축한 늪 위에서 독사가 튀어나왔다!'], style: 'poisoner', poisonChance: 0.35 },
    swamp_witch: { intros: ['늪지 마녀가 저주를 중얼거린다.', '마녀의 지팡이 끝에서 독안개가 피어오른다.'], style: 'poisoner', poisonChance: 0.3 },
    sand_scorpion: { intros: ['사막 전갈이 집게를 부딪치며 다가온다.', '모래를 가르며 사막 전갈이 돌진한다!'], style: 'poisoner', poisonChance: 0.3 },
    ice_golem: { intros: ['얼음 골렘이 둔중한 몸을 일으킨다.', '서리 입자가 흩날리며 얼음 골렘이 다가온다.'], style: 'tank', guardChance: 0.25 },
    frost_wyrm: { intros: ['서리 비룡이 냉기를 토해낸다!', '비룡의 날갯짓에 혹한의 바람이 몰아친다.'], style: 'breath', breathChance: 0.3 },
    fire_elemental: { intros: ['화염 정령이 이글거리며 요동친다.', '불꽃 소용돌이 속에서 화염 정령이 떠오른다.'], style: 'burner', burnChance: 0.32 },
    lava_drake: { intros: ['용암 드레이크가 뜨거운 숨을 내뿜는다.', '대지를 녹이며 드레이크가 포효한다!'], style: 'breath', burnChance: 0.25, breathChance: 0.28 },
    dragon_whelp: { intros: ['새끼 드래곤이 날개를 퍼덕이며 불꽃을 튄다.', '작지만 사나운 드래곤이 송곳니를 드러냈다!'], style: 'breath', breathChance: 0.22 },
    dragon: { intros: ['드래곤이 하늘을 가르며 강림했다!', '거대한 용의 포효가 전장을 뒤흔든다!'], style: 'boss_breath', breathChance: 0.35 },
    shadow_knight: { intros: ['그림자 기사가 검은 검을 겨눈다.', '어둠 속에서 그림자 기사가 모습을 드러냈다.'], style: 'duelist', evadeChance: 0.12 },
    dark_sentinel: { intros: ['어둠의 파수꾼이 무거운 방패를 들었다.', '침묵의 파수꾼이 길을 막아선다.'], style: 'tank', guardChance: 0.3 },
    shadow_lazarus: { intros: ['그림자 라자러스가 냉소와 함께 검을 뽑는다.', '라자러스: "여기까지 왔군. 후회하게 해주지."'], style: 'boss_mix', breathChance: 0.2, guardChance: 0.2, evadeChance: 0.1 },
  },

  getSkills(player) {
    const job = typeof player === 'string' ? player : player.job;
    /* 기본 스킬 */
    let base = [];
    switch (job) {
      case '전사':
        base = [
          { name: '강타', mpCost: 0, multiplier: 1.5, desc: '강력한 일격 (1.5배 데미지)' },
          { name: '방어', mpCost: 0, multiplier: 0, desc: '이번 턴 받는 데미지 50% 감소', defensive: true },
        ]; break;
      case '마법사':
        base = [
          { name: '파이어볼', mpCost: 0, multiplier: 2.0, desc: '화염 마법 (2배 데미지)' },
          { name: '마력 방벽', mpCost: 0, multiplier: 0, desc: '이번 턴 받는 데미지 70% 감소', defensive: true },
        ]; break;
      case '도적':
        base = [
          { name: '독 바르기', mpCost: 0, multiplier: 1.2, desc: '독 공격 (1.2배 + 독 부여)', poison: true },
          { name: '그림자 숨기', mpCost: 0, multiplier: 0, desc: '이번 턴 회피 (데미지 무효)', evasion: true },
        ]; break;
    }
    /* F9: 스킬 트리 액티브 스킬 추가 */
    if (typeof player === 'object' && typeof SkillTreeManager !== 'undefined') {
      const treeSkills = SkillTreeManager.getActiveSkills(player);
      base.push(...treeSkills);
    }
    return base;
  },

  spawnEnemy(enemyKey) {
    const template = ENEMY_TABLE[enemyKey];
    if (!template) return null;
    return {
      key: enemyKey,
      name: template.name,
      label: template.name,
      hp: template.hp,
      maxHp: template.hp,
      atk: template.atk,
      def: template.def,
      exp: template.exp,
      gold: template.gold,
      poisoned: false,
      poisonTurns: 0,
      burnTurns: 0,
      guardTurns: 0,
    };
  },

  _assignLabels(enemies) {
    if (enemies.length <= 1) return;
    const count = {};
    enemies.forEach(e => { count[e.name] = (count[e.name] || 0) + 1; });
    const idx = {};
    enemies.forEach(e => {
      if (count[e.name] > 1) {
        idx[e.name] = (idx[e.name] || 0) + 1;
        e.label = `${e.name} ${String.fromCharCode(64 + idx[e.name])}`;
      }
    });
  },

  _pickEncounterLine(enemy) {
    const behavior = this.ENEMY_BEHAVIOR[enemy.key];
    const intros = behavior?.intros;
    if (intros && intros.length > 0) {
      return intros[Math.floor(Math.random() * intros.length)];
    }
    return `${enemy.name}이(가) 나타났다!`;
  },

  _enemyEvaded(enemy) {
    const behavior = this.ENEMY_BEHAVIOR[enemy.key];
    const chance = behavior?.evadeChance || 0;
    return Math.random() < chance;
  },

  _applyEnemyGuard(enemy, dmg) {
    if (enemy.guardTurns > 0) {
      return Math.max(0, Math.floor(dmg * 0.6));
    }
    return dmg;
  },

  _calcPlayerDamage(enemy, baseDamage) {
    const raw = Math.max(0, baseDamage - enemy.def);
    return this._applyEnemyGuard(enemy, raw);
  },

  _calcEnemyDamage(player, atk, { pierce = false } = {}) {
    if (pierce) {
      return Math.max(0, Math.floor(atk - (player.getDefense() * 0.5)));
    }
    return Math.max(0, atk - player.getDefense());
  },

  _applyPoisonToPlayer(player, chance) {
    if (!player.poisoned && Math.random() < chance) {
      player.poisoned = true;
      return true;
    }
    return false;
  },

  _applyBurnToPlayer(player, chance) {
    if ((player.burnTurns || 0) === 0 && Math.random() < chance) {
      player.burnTurns = 3;
      return true;
    }
    return false;
  },

  /* ── 단일 적의 공격 로직 ── */
  _resolveEnemyAttack(player, e) {
    let dmg = 0;
    let text = `${e.label}의 공격!`;
    const beh = this.ENEMY_BEHAVIOR[e.key] || {};
    const style = beh.style || 'normal';

    if (style === 'beast' && Math.random() < (beh.multiHitChance || 0.2)) {
      dmg = this._calcEnemyDamage(player, Math.floor(e.atk * 0.7))
          + this._calcEnemyDamage(player, Math.floor(e.atk * 0.7));
      text = `${e.label}의 연속 물어뜯기!`;
    } else if ((style === 'poisoner' || style === 'trickster') && Math.random() < (beh.poisonChance || 0.22)) {
      dmg = this._calcEnemyDamage(player, Math.floor(e.atk * 0.85));
      const p = this._applyPoisonToPlayer(player, 1.0);
      text = p ? `${e.label}의 독습!` : `${e.label}의 교란 공격!`;
    } else if ((style === 'breath' || style === 'boss_breath' || style === 'boss_mix') && Math.random() < (beh.breathChance || 0.25)) {
      dmg = this._calcEnemyDamage(player, Math.floor(e.atk * 1.35), { pierce: true });
      const b = this._applyBurnToPlayer(player, beh.burnChance || 0.2);
      text = b ? `${e.label}의 브레스! 불길이 몸을 감싼다!` : `${e.label}의 브레스!`;
    } else if ((style === 'tank' || style === 'boss_mix') && Math.random() < (beh.guardChance || 0.25)) {
      e.guardTurns = 1;
      text = `${e.label}이(가) 방어 태세를 취했다!`;
      return { dmg: 0, text, guard: true };
    } else if (style === 'drain' && Math.random() < 0.3) {
      dmg = this._calcEnemyDamage(player, Math.floor(e.atk * 0.95), { pierce: true });
      const heal = Math.max(5, Math.floor(dmg * 0.5));
      e.hp = Math.min(e.maxHp, e.hp + heal);
      text = `${e.label}의 흡혈 일격!`;
      return { dmg, text, drainHeal: heal };
    } else {
      dmg = this._calcEnemyDamage(player, e.atk);
    }
    return { dmg, text };
  },

  /**
   * 전투 진행 (다중 적 지원)
   * @param {object} player
   * @param {string|string[]} enemyKeyOrKeys - 단일 키 또는 키 배열
   * @param {object} options - { name, hp_multiply, hp_add } (보스전 옵션, 첫 적에만 적용)
   * @returns {Promise<"win"|"lose"|"fled">}
   */
  async startBattle(player, enemyKeyOrKeys, options = {}) {
    const keys = Array.isArray(enemyKeyOrKeys) ? enemyKeyOrKeys : [enemyKeyOrKeys];
    const enemies = [];
    for (const k of keys) {
      const e = this.spawnEnemy(k);
      if (e) enemies.push(e);
    }
    if (enemies.length === 0) {
      UI.addSystemMsg('  알 수 없는 적입니다.');
      return 'win';
    }

    this._assignLabels(enemies);

    /* 보스전 옵션 (첫 적에만) */
    if (options.name) { enemies[0].name = options.name; enemies[0].label = options.name; }
    if (options.hp_multiply) { enemies[0].hp = Math.floor(enemies[0].hp * options.hp_multiply); enemies[0].maxHp = enemies[0].hp; }
    if (options.hp_add) { enemies[0].hp += options.hp_add; enemies[0].maxHp = enemies[0].hp; }

    UI.showBattleScreen();
    UI.clearBattleLog();

    /* 등장 메시지 */
    if (enemies.length === 1) {
      UI.showBattleLog(`  ${this._pickEncounterLine(enemies[0])}`);
    } else {
      UI.showBattleLog(`  ${enemies.map(e => e.label).join(', ')}이(가) 나타났다!`);
    }

    const skills = this.getSkills(player);
    let turn = 1;
    let targetIdx = 0;
    /* F9: 전투 시작 시 임시 버프 초기화 */
    player.tempBuffs = [];
    let enemyStunned = false; /* 시간 정지 등 */

    const alive = () => enemies.filter(e => e.hp > 0);
    const allDead = () => enemies.every(e => e.hp <= 0);
    const fixTarget = () => {
      if (enemies[targetIdx]?.hp <= 0) {
        const idx = enemies.findIndex(e => e.hp > 0);
        targetIdx = idx >= 0 ? idx : 0;
      }
    };

    UI.updateBattleUI(player, enemies, turn, targetIdx);

    while (player.isAlive() && !allDead()) {
      fixTarget();
      UI.updateBattleUI(player, enemies, turn, targetIdx);
      const actionIdx = await UI.showBattleChoices(skills);

      let defending = false;
      let evading = false;
      let playerActed = false;

      /* 공격 계열 행동이면 대상 선택 */
      const isOffensiveSkill = actionIdx >= 1 && actionIdx <= skills.length
        && !skills[actionIdx - 1]?.defensive && !skills[actionIdx - 1]?.evasion;
      if ((actionIdx === 0 || isOffensiveSkill) && alive().length > 1) {
        targetIdx = await UI.showTargetSelect(enemies);
      }
      fixTarget();
      const target = enemies[targetIdx];

      if (actionIdx === 0) {
        /* ── 기본 공격 ── */
        const atkResult = player.getAttack();
        if (this._enemyEvaded(target)) {
          UI.showBattleLog(`  ${target.label}이(가) 재빨리 회피했다!`, 'battle-text-system');
          UI.flashEnemyEntry(targetIdx, 'miss');
        } else {
          const dmg = this._calcPlayerDamage(target, atkResult.damage);
          target.hp = Math.max(0, target.hp - dmg);
          if (player.stats) player.stats.totalDamageDealt += dmg;
          if (atkResult.critical) {
            if (player.stats) player.stats.criticalHits++;
            UI.showBattleLog(`  ★ 치명타! ${target.label}에게 ${dmg} 데미지!`, 'battle-text-critical');
            UI.flashEnemyEntry(targetIdx, 'critical');
            UI.shakeScreen();
          } else {
            UI.showBattleLog(`  ${player.name}의 공격! ${target.label}에게 ${dmg} 데미지!`, 'battle-text-player');
            UI.flashEnemyEntry(targetIdx, 'hit');
          }
          if (target.hp <= 0) UI.showBattleLog(`  ☠ ${target.label} 처치!`, 'battle-text-critical');
        }
        playerActed = true;

      } else if (actionIdx <= skills.length) {
        /* ── 스킬 ── */
        const skill = skills[actionIdx - 1];
        if (skill.defensive) {
          defending = true;
          /* F9: 강화된 방어 스킬 (defenseMultiplier) */
          if (skill.defenseMultiplier !== undefined) defending = skill.defenseMultiplier;
          UI.showBattleLog(`  ${player.name}이(가) ${skill.name}!`, 'battle-text-player');
        } else if (skill.evasion) {
          evading = true;
          UI.showBattleLog(`  ${player.name}이(가) ${skill.name}!`, 'battle-text-player');
        } else if (skill.buff) {
          /* F9: 버프 스킬 */
          player.tempBuffs.push({ stat: skill.buff.stat, percent: skill.buff.percent, turnsLeft: skill.buff.turns });
          UI.showBattleLog(`  ${player.name}의 ${skill.name}! ${skill.buff.turns}턴간 ${skill.buff.stat === 'attack' ? '공격력' : skill.buff.stat} +${skill.buff.percent}%!`, 'battle-text-player');
        } else if (skill.healPercent) {
          /* F9: 회복 마법 */
          const healed = player.heal(Math.floor(player.maxHp * skill.healPercent / 100));
          UI.showBattleLog(`  ${player.name}의 ${skill.name}! HP ${healed} 회복! (${player.hp}/${player.maxHp})`, 'battle-text-player');
        } else if (skill.stun && skill.multiplier === 0) {
          /* F9: 시간 정지 (데미지 없는 스턴) */
          enemyStunned = true;
          UI.showBattleLog(`  ${player.name}의 ${skill.name}! 적들이 움직일 수 없다!`, 'battle-text-player');
        } else {
          /* 공격 스킬 */
          const base = player.getAttack().damage;
          let mult = skill.multiplier;
          /* F9: HP 비례 스킬 */
          if (skill.hpScaling) {
            const hpRatio = 1 - (player.hp / player.maxHp);
            mult = skill.multiplier + hpRatio * 1.5;
          }
          /* F9: 스킬 데미지 보너스 */
          const pb = player.passiveBuffs || {};
          if (pb.skillDamagePercent) mult *= (1 + pb.skillDamagePercent / 100);

          /* AOE 스킬: 전체 적 대상 */
          const targets = skill.aoe ? alive() : [target];
          for (const t of targets) {
            const tIdx = enemies.indexOf(t);
            if (this._enemyEvaded(t)) {
              UI.showBattleLog(`  ${t.label}이(가) ${player.name}의 스킬을 피했다!`, 'battle-text-system');
              UI.flashEnemyEntry(tIdx, 'miss');
            } else {
              const dmg = this._calcPlayerDamage(t, Math.floor(base * mult));
              t.hp = Math.max(0, t.hp - dmg);
              if (player.stats) player.stats.totalDamageDealt += dmg;
              UI.showBattleLog(`  ${player.name}의 ${skill.name}! ${t.label}에게 ${dmg} 데미지!`, 'battle-text-player');
              UI.flashEnemyEntry(tIdx, 'hit');
              /* 독 부여 */
              if (skill.poison && t.hp > 0) {
                t.poisoned = true;
                t.poisonTurns = skill.poisonStrong ? 4 : 3;
                UI.showBattleLog(`  ${t.label}이(가) 독에 걸렸다!`, 'battle-text-system');
              }
              /* 스턴 */
              if (skill.stun && t.hp > 0) {
                t.stunned = true;
                UI.showBattleLog(`  ${t.label}이(가) 얼어붙었다!`, 'battle-text-system');
              }
              if (t.hp <= 0) UI.showBattleLog(`  ☠ ${t.label} 처치!`, 'battle-text-critical');
            }
          }
          /* 다중 타격 스킬 */
          if (skill.hits && skill.hits > 1) {
            for (let h = 1; h < skill.hits; h++) {
              const t = target.hp > 0 ? target : alive()[0];
              if (!t) break;
              const tIdx = enemies.indexOf(t);
              const dmg = this._calcPlayerDamage(t, Math.floor(base * mult));
              t.hp = Math.max(0, t.hp - dmg);
              if (player.stats) player.stats.totalDamageDealt += dmg;
              UI.showBattleLog(`  ${h + 1}연타! ${t.label}에게 ${dmg} 데미지!`, 'battle-text-player');
              UI.flashEnemyEntry(tIdx, 'hit');
              if (t.hp <= 0) UI.showBattleLog(`  ☠ ${t.label} 처치!`, 'battle-text-critical');
            }
          }
        }
        playerActed = true;

      } else if (actionIdx === skills.length + 1) {
        /* ── 아이템 ── */
        const itemName = await UI.showBattleItemMenu(player);
        if (!itemName) continue;
        const idx = player.inventory.indexOf(itemName);
        if (idx === -1) continue;
        player.inventory.splice(idx, 1);
        const info = ITEMS[itemName];
        if (info.effect === 'heal') {
          const healed = player.heal(info.value);
          if (player.stats) player.stats.potionsUsed++;
          UI.showBattleLog(`  ${itemName} 사용! HP ${healed} 회복! (${player.hp}/${player.maxHp})`, 'battle-text-player');
        } else if (info.effect === 'cure') {
          player.poisoned = false;
          if (player.stats) player.stats.potionsUsed++;
          UI.showBattleLog(`  ${itemName} 사용! 독 상태 해제!`, 'battle-text-player');
        }
        playerActed = true;

      } else {
        /* ── 도망 ── */
        let fleeChance = 0.35;
        if (enemies.length >= 3) fleeChance -= 0.1;
        if (player.inventory.includes('행운의 부적')) fleeChance += 0.2;
        if (Math.random() < fleeChance) {
          UI.showBattleLog('  도망에 성공했다!', 'battle-text-system');
          await this._battleDelay(600);
          UI.showScreen('screen-game');
          UI.updateHeader();
          return 'fled';
        } else {
          UI.showBattleLog('  도망에 실패했다!', 'battle-text-system');
          playerActed = true;
        }
      }

      /* ── 독/화상 (모든 적) ── */
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (e.poisoned) {
          const pd = Math.floor(e.maxHp * 0.05);
          e.hp = Math.max(0, e.hp - pd);
          e.poisonTurns--;
          UI.showBattleLog(`  ${e.label}이(가) 독으로 ${pd} 데미지!`, 'battle-text-system');
          if (e.poisonTurns <= 0) e.poisoned = false;
          if (e.hp <= 0) UI.showBattleLog(`  ☠ ${e.label} 처치!`, 'battle-text-critical');
        }
        if (e.burnTurns > 0 && e.hp > 0) {
          const bd = Math.max(3, Math.floor(e.maxHp * 0.04));
          e.hp = Math.max(0, e.hp - bd);
          e.burnTurns -= 1;
          UI.showBattleLog(`  ${e.label}이(가) 화상으로 ${bd} 데미지!`, 'battle-text-system');
          if (e.hp <= 0) UI.showBattleLog(`  ☠ ${e.label} 처치!`, 'battle-text-critical');
        }
      }

      UI.updateBattleUI(player, enemies, turn, targetIdx);
      if (allDead()) break;

      /* ── 적 턴: 살아있는 모든 적이 공격 ── */
      if (playerActed && !enemyStunned) {
        for (const e of alive()) {
          /* F9: 스턴된 적은 건너뜀 */
          if (e.stunned) { e.stunned = false; UI.showBattleLog(`  ${e.label}이(가) 얼어있어 움직이지 못한다!`, 'battle-text-system'); continue; }
          await this._battleDelay(350);
          const atk = this._resolveEnemyAttack(player, e);

          if (atk.guard) {
            UI.showBattleLog(`  ${atk.text}`, 'battle-text-enemy');
          } else if (evading) {
            UI.showBattleLog(`  ${e.label}의 공격을 회피했다!`, 'battle-text-player');
          } else if (defending) {
            const reduction = (typeof defending === 'number') ? defending : (player.job === '마법사' ? 0.3 : 0.5);
            const reduced = Math.floor(atk.dmg * reduction);
            player.hp = Math.max(0, player.hp - reduced);
            UI.showBattleLog(`  ${atk.text} 방어로 ${reduced} 데미지!`, 'battle-text-player');
            UI.flashPlayerHpBar();
          } else {
            player.hp = Math.max(0, player.hp - atk.dmg);
            UI.showBattleLog(`  ${atk.text} ${atk.dmg} 데미지!`, 'battle-text-enemy');
            if (atk.dmg > 0) UI.flashPlayerHpBar();
          }
          if (atk.drainHeal) {
            UI.showBattleLog(`  ${e.label}이(가) ${atk.drainHeal} HP를 흡수했다!`, 'battle-text-enemy');
          }

          /* F9: 반격 패시브 */
          const pb = player.passiveBuffs || {};
          if (!evading && !defending && pb.counterChance && Math.random() * 100 < pb.counterChance) {
            const cDmg = this._calcPlayerDamage(e, Math.floor(player.getAttack().damage * 0.6));
            e.hp = Math.max(0, e.hp - cDmg);
            UI.showBattleLog(`  반격! ${e.label}에게 ${cDmg} 데미지!`, 'battle-text-player');
            UI.flashEnemyEntry(enemies.indexOf(e), 'hit');
            if (e.hp <= 0) UI.showBattleLog(`  ☠ ${e.label} 처치!`, 'battle-text-critical');
          }

          /* F9: 불사의 의지 */
          if (!player.isAlive() && pb.lastStand && !player.lastStandUsed) {
            player.hp = 1;
            player.lastStandUsed = true;
            UI.showBattleLog(`  ★ 불사의 의지 발동! HP 1로 생존!`, 'battle-text-critical');
            UI.shakeScreen();
          }

          UI.updateBattleUI(player, enemies, turn, targetIdx);
          if (!player.isAlive()) break;
        }

        /* 플레이어 독/화상 */
        if (player.isAlive() && player.poisoned) {
          const pDmg = Math.floor(player.maxHp * 0.03);
          player.hp = Math.max(0, player.hp - pDmg);
          UI.showBattleLog(`  독으로 ${pDmg} 데미지!`, 'battle-text-enemy');
          UI.flashPlayerHpBar();
        }
        if (player.isAlive() && (player.burnTurns || 0) > 0) {
          const bDmg = Math.max(4, Math.floor(player.maxHp * 0.04));
          player.hp = Math.max(0, player.hp - bDmg);
          player.burnTurns -= 1;
          UI.showBattleLog(`  화상으로 ${bDmg} 데미지!`, 'battle-text-enemy');
          UI.flashPlayerHpBar();
        }

        /* 적 방어 해제 */
        for (const e of enemies) {
          if (e.guardTurns > 0) {
            e.guardTurns -= 1;
            if (e.guardTurns === 0) UI.showBattleLog(`  ${e.label}의 방어 태세가 풀렸다.`, 'battle-text-system');
          }
        }

        UI.updateBattleUI(player, enemies, turn, targetIdx);
      }
      /* F9: 적 스턴 해제 */
      if (enemyStunned) { enemyStunned = false; }
      /* F9: 임시 버프 턴 소모 */
      if (player.tempBuffs) {
        player.tempBuffs.forEach(b => b.turnsLeft--);
        player.tempBuffs = player.tempBuffs.filter(b => b.turnsLeft > 0);
      }

      turn++;
    }

    await this._battleDelay(500);

    if (allDead()) {
      return await this._handleVictory(player, enemies);
    } else {
      return 'lose';
    }
  },

  async _handleVictory(player, enemies) {
    UI.showBattleLog('');
    if (enemies.length === 1) {
      UI.showBattleLog(`  ★ ${enemies[0].name}을(를) 물리쳤다!`, 'battle-text-critical');
    } else {
      UI.showBattleLog(`  ★ 모든 적을 물리쳤다!`, 'battle-text-critical');
    }

    /* F8: 통계 업데이트 */
    if (player.stats) {
      player.stats.battlesWon++;
      player.stats.monstersKilled += enemies.length;
    }

    let totalGold = 0;
    let totalExp = 0;
    const allDrops = [];

    for (const e of enemies) {
      totalGold += e.gold + Math.floor(Math.random() * Math.max(1, Math.floor(e.gold * 0.3)));
      totalExp += e.exp;
      const drops = DROP_TABLE[e.key] || [];
      drops.forEach(d => {
        if (Math.random() < d.chance) allDrops.push(d.item);
      });
    }

    player.gold += totalGold;
    if (player.stats) player.stats.totalGoldEarned += totalGold;
    UI.showBattleLog(`  ${totalGold}G 획득!`, 'battle-text-critical');

    const leveled = player.gainExp(totalExp);
    UI.showBattleLog(`  경험치 +${totalExp}`, 'battle-text-system');
    if (leveled) {
      UI.showBattleLog(`  ★ 레벨 업! Lv.${player.level}! HP 완전 회복!`, 'battle-text-critical');
      /* F9: 패시브 재계산 (maxHpBonus 반영) */
      if (typeof SkillTreeManager !== 'undefined') SkillTreeManager.recalcPassives(player);
    }

    allDrops.forEach(item => {
      player.inventory.push(item);
      if (player.stats) player.stats.itemsCollected++;
      UI.showBattleLog(`  ▶ ${item} 드롭!`, 'battle-text-system');
    });

    UI.updateBattleUI(player, enemies, 0, 0);
    await UI.waitForTap();
    UI.showScreen('screen-game');
    UI.updateHeader();

    /* F8: 업적 체크 */
    if (typeof AchievementManager !== 'undefined') AchievementManager.check(player);

    return 'win';
  },

  _battleDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
