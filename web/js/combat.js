/* combat.js - 전투 시스템 */

const CombatSystem = {

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
    };
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
    UI.showBattleLog(`  ${enemy.name}이(가) 나타났다!`);

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
        const dmg = Math.max(0, atkResult.damage - enemy.def);
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
          const dmg = Math.max(0, Math.floor(base * skill.multiplier) - enemy.def);
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

      UI.updateBattleUI(player, enemy, turn);

      if (enemy.hp <= 0) break;

      /* 적 턴 */
      if (playerActed) {
        await this._battleDelay(400);
        let enemyDmg = Math.max(0, enemy.atk - player.getDefense());

        if (evading) {
          UI.showBattleLog(`  ${enemy.name}의 공격을 회피했다!`);
          enemyDmg = 0;
        } else if (defending) {
          const reduction = player.job === '마법사' ? 0.3 : 0.5;
          enemyDmg = Math.floor(enemyDmg * reduction);
          player.hp = Math.max(0, player.hp - enemyDmg);
          UI.showBattleLog(`  ${enemy.name}의 공격! 방어로 ${enemyDmg} 데미지!`);
        } else {
          player.hp = Math.max(0, player.hp - enemyDmg);
          UI.showBattleLog(`  ${enemy.name}의 공격! ${enemyDmg} 데미지!`);
        }

        /* 독 데미지 (플레이어) */
        if (player.poisoned) {
          const pDmg = Math.floor(player.maxHp * 0.03);
          player.hp = Math.max(0, player.hp - pDmg);
          UI.showBattleLog(`  독으로 ${pDmg} 데미지!`);
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
