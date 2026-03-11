/* combat.js - 전투 시스템 */

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

  getSkills(job) {
    switch (job) {
      case '전사':
        return [
          { name: '강타', mpCost: 0, multiplier: 1.5, desc: '강력한 일격 (1.5배 데미지)' },
          { name: '방어', mpCost: 0, multiplier: 0,   desc: '이번 턴 받는 데미지 50% 감소', defensive: true },
        ];
      case '마법사':
        return [
          { name: '파이어볼', mpCost: 0, multiplier: 2.0, desc: '화염 마법 (2배 데미지)' },
          { name: '마력 방벽', mpCost: 0, multiplier: 0,  desc: '이번 턴 받는 데미지 70% 감소', defensive: true },
        ];
      case '도적':
        return [
          { name: '독 바르기', mpCost: 0, multiplier: 1.2, desc: '독 공격 (1.2배 + 독 부여)', poison: true },
          { name: '그림자 숨기', mpCost: 0, multiplier: 0, desc: '이번 턴 회피 (데미지 무효)', evasion: true },
        ];
      default:
        return [];
    }
  },

  spawnEnemy(enemyKey) {
    const template = ENEMY_TABLE[enemyKey];
    if (!template) return null;
    return {
      key: enemyKey,
      name: template.name,
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

  /**
   * 전투 진행 (async - 사용자 입력 대기)
   * @returns {Promise<"win"|"lose"|"fled">}
   */
  async startBattle(player, enemyKey, options = {}) {
    const enemy = this.spawnEnemy(enemyKey);
    if (!enemy) {
      UI.addSystemMsg('  알 수 없는 적입니다.');
      return 'win';
    }

    if (options.name) enemy.name = options.name;
    if (options.hp_multiply) {
      enemy.hp = Math.floor(enemy.hp * options.hp_multiply);
      enemy.maxHp = enemy.hp;
    }
    if (options.hp_add) {
      enemy.hp += options.hp_add;
      enemy.maxHp = enemy.hp;
    }

    UI.showBattleScreen();
    UI.clearBattleLog();
    UI.showBattleLog(`  ${this._pickEncounterLine(enemy)}`);

    const skills = this.getSkills(player.job);
    let turn = 1;
    UI.updateBattleUI(player, enemy, turn);

    while (player.isAlive() && enemy.hp > 0) {
      UI.updateBattleUI(player, enemy, turn);
      const actionIdx = await UI.showBattleChoices(skills);

      let defending = false;
      let evading = false;
      let playerActed = false;

      if (actionIdx === 0) {
        /* 기본 공격 */
        const atkResult = player.getAttack();
        if (this._enemyEvaded(enemy)) {
          UI.showBattleLog(`  ${enemy.name}이(가) 재빨리 회피했다!`);
          playerActed = true;
          continue;
        }
        const dmg = this._calcPlayerDamage(enemy, atkResult.damage);
        enemy.hp = Math.max(0, enemy.hp - dmg);
        if (atkResult.critical) {
          UI.showBattleLog(`  ★ 치명타! ${player.name}의 공격! ${dmg} 데미지!`);
        } else {
          UI.showBattleLog(`  ${player.name}의 공격! ${dmg} 데미지!`);
        }
        playerActed = true;

      } else if (actionIdx <= skills.length) {
        /* 스킬 사용 */
        const skill = skills[actionIdx - 1];
        if (skill.defensive) {
          defending = true;
          UI.showBattleLog(`  ${player.name}이(가) ${skill.name}!`);
        } else if (skill.evasion) {
          evading = true;
          UI.showBattleLog(`  ${player.name}이(가) ${skill.name}!`);
        } else {
          let base = player.getAttack().damage;
          if (this._enemyEvaded(enemy)) {
            UI.showBattleLog(`  ${enemy.name}이(가) ${player.name}의 스킬을 피했다!`);
            playerActed = true;
            continue;
          }
          const dmg = this._calcPlayerDamage(enemy, Math.floor(base * skill.multiplier));
          enemy.hp = Math.max(0, enemy.hp - dmg);
          UI.showBattleLog(`  ${player.name}의 ${skill.name}! ${dmg} 데미지!`);
          if (skill.poison && enemy.hp > 0) {
            enemy.poisoned = true;
            enemy.poisonTurns = 3;
            UI.showBattleLog(`  ${enemy.name}이(가) 독에 걸렸다!`);
          }
        }
        playerActed = true;

      } else if (actionIdx === skills.length + 1) {
        /* 아이템 사용 */
        const itemName = await UI.showBattleItemMenu(player);
        if (!itemName) continue;

        const idx = player.inventory.indexOf(itemName);
        if (idx === -1) continue;
        player.inventory.splice(idx, 1);

        const info = ITEMS[itemName];
        if (info.effect === 'heal') {
          const healed = player.heal(info.value);
          UI.showBattleLog(`  ${itemName} 사용! HP ${healed} 회복! (${player.hp}/${player.maxHp})`);
        } else if (info.effect === 'cure') {
          player.poisoned = false;
          UI.showBattleLog(`  ${itemName} 사용! 독 상태 해제!`);
        }
        playerActed = true;

      } else {
        /* 도망 */
        let fleeChance = 0.35;
        if (player.inventory.includes('행운의 부적')) fleeChance += 0.2;
        if (Math.random() < fleeChance) {
          UI.showBattleLog('  도망에 성공했다!');
          await this._battleDelay(600);
          UI.showScreen('screen-game');
          UI.updateHeader();
          return 'fled';
        } else {
          UI.showBattleLog('  도망에 실패했다!');
          playerActed = true;
        }
      }

      /* 독 데미지 (적) */
      if (enemy.poisoned && enemy.hp > 0) {
        const poisonDmg = Math.floor(enemy.maxHp * 0.05);
        enemy.hp = Math.max(0, enemy.hp - poisonDmg);
        enemy.poisonTurns--;
        UI.showBattleLog(`  ${enemy.name}이(가) 독으로 ${poisonDmg} 데미지!`);
        if (enemy.poisonTurns <= 0) enemy.poisoned = false;
      }

      if (enemy.burnTurns > 0 && enemy.hp > 0) {
        const burnDmg = Math.max(3, Math.floor(enemy.maxHp * 0.04));
        enemy.hp = Math.max(0, enemy.hp - burnDmg);
        enemy.burnTurns -= 1;
        UI.showBattleLog(`  ${enemy.name}이(가) 화상으로 ${burnDmg} 데미지!`);
      }

      UI.updateBattleUI(player, enemy, turn);

      if (enemy.hp <= 0) break;

      /* 적 턴 */
      if (playerActed) {
        await this._battleDelay(400);
        let enemyDmg = 0;
        let enemyActionText = `${enemy.name}의 공격!`;
        const behavior = this.ENEMY_BEHAVIOR[enemy.key] || {};
        const style = behavior.style || 'normal';

        if (style === 'beast' && Math.random() < (behavior.multiHitChance || 0.2)) {
          const hit1 = this._calcEnemyDamage(player, Math.floor(enemy.atk * 0.7));
          const hit2 = this._calcEnemyDamage(player, Math.floor(enemy.atk * 0.7));
          enemyDmg = hit1 + hit2;
          enemyActionText = `${enemy.name}의 연속 물어뜯기!`;
        } else if ((style === 'poisoner' || style === 'trickster') && Math.random() < (behavior.poisonChance || 0.22)) {
          enemyDmg = this._calcEnemyDamage(player, Math.floor(enemy.atk * 0.85));
          const poisoned = this._applyPoisonToPlayer(player, 1.0);
          enemyActionText = poisoned ? `${enemy.name}의 독습!` : `${enemy.name}의 교란 공격!`;
        } else if ((style === 'breath' || style === 'boss_breath' || style === 'boss_mix') && Math.random() < (behavior.breathChance || 0.25)) {
          enemyDmg = this._calcEnemyDamage(player, Math.floor(enemy.atk * 1.35), { pierce: true });
          const burned = this._applyBurnToPlayer(player, behavior.burnChance || 0.2);
          enemyActionText = burned ? `${enemy.name}의 브레스! 불길이 몸을 감싼다!` : `${enemy.name}의 브레스!`;
        } else if ((style === 'tank' || style === 'boss_mix') && Math.random() < (behavior.guardChance || 0.25)) {
          enemy.guardTurns = 1;
          enemyActionText = `${enemy.name}이(가) 방어 태세를 취했다!`;
        } else if (style === 'drain' && Math.random() < 0.3) {
          enemyDmg = this._calcEnemyDamage(player, Math.floor(enemy.atk * 0.95), { pierce: true });
          const heal = Math.max(5, Math.floor(enemyDmg * 0.5));
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
          enemyActionText = `${enemy.name}의 흡혈 일격!`;
          UI.showBattleLog(`  ${enemy.name}이(가) ${heal} HP를 흡수했다!`);
        } else {
          enemyDmg = this._calcEnemyDamage(player, enemy.atk);
        }

        if (evading) {
          UI.showBattleLog(`  ${enemy.name}의 공격을 회피했다!`);
          enemyDmg = 0;
        } else if (defending) {
          const reduction = player.job === '마법사' ? 0.3 : 0.5;
          enemyDmg = Math.floor(enemyDmg * reduction);
          player.hp = Math.max(0, player.hp - enemyDmg);
          UI.showBattleLog(`  ${enemyActionText} 방어로 ${enemyDmg} 데미지!`);
        } else {
          player.hp = Math.max(0, player.hp - enemyDmg);
          UI.showBattleLog(`  ${enemyActionText} ${enemyDmg} 데미지!`);
        }

        /* 독 데미지 (플레이어) */
        if (player.poisoned) {
          const pDmg = Math.floor(player.maxHp * 0.03);
          player.hp = Math.max(0, player.hp - pDmg);
          UI.showBattleLog(`  독으로 ${pDmg} 데미지!`);
        }

        if ((player.burnTurns || 0) > 0) {
          const bDmg = Math.max(4, Math.floor(player.maxHp * 0.04));
          player.hp = Math.max(0, player.hp - bDmg);
          player.burnTurns -= 1;
          UI.showBattleLog(`  화상으로 ${bDmg} 데미지!`);
        }

        if (enemy.guardTurns > 0) {
          enemy.guardTurns -= 1;
          if (enemy.guardTurns === 0) {
            UI.showBattleLog(`  ${enemy.name}의 방어 태세가 풀렸다.`);
          }
        }

        UI.updateBattleUI(player, enemy, turn);
      }

      turn++;
    }

    await this._battleDelay(500);

    if (enemy.hp <= 0) {
      return await this._handleVictory(player, enemy);
    } else {
      return 'lose';
    }
  },

  async _handleVictory(player, enemy) {
    UI.showBattleLog('');
    UI.showBattleLog(`  ★ ${enemy.name}을(를) 물리쳤다!`);

    const goldGain = enemy.gold + Math.floor(Math.random() * Math.max(1, Math.floor(enemy.gold * 0.3)));
    player.gold += goldGain;
    UI.showBattleLog(`  ${goldGain}G 획득!`);

    const leveled = player.gainExp(enemy.exp);
    UI.showBattleLog(`  경험치 +${enemy.exp}`);
    if (leveled) {
      UI.showBattleLog(`  ★ 레벨 업! Lv.${player.level}! HP 완전 회복!`);
    }

    const drops = DROP_TABLE[enemy.key] || [];
    drops.forEach(drop => {
      if (Math.random() < drop.chance) {
        player.inventory.push(drop.item);
        UI.showBattleLog(`  ▶ ${drop.item} 드롭!`);
      }
    });

    UI.updateBattleUI(player, enemy, 0);
    await UI.waitForTap();
    UI.showScreen('screen-game');
    UI.updateHeader();
    return 'win';
  },

  _battleDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
