/* event_engine.js - YAML 이벤트 엔진 (Python event_engine.py의 JS 포팅) */

const EventEngine = {

  /* ───── 텍스트 포매팅 ───── */

  formatText(text, player) {
    if (!text || typeof text !== 'string') return text || '';
    return text.replace(/\{player\.(\w+)\}/g, (_, prop) => {
      if (prop === 'hp') return player.hp;
      if (prop === 'max_hp' || prop === 'maxHp') return player.maxHp;
      if (prop === 'name') return player.name;
      if (prop === 'job') return player.job;
      if (prop === 'level') return player.level;
      if (prop === 'gold') return player.gold;
      if (prop === 'attack') return player.attack;
      if (prop === 'defense') return player.defense;
      if (prop === 'exp') return player.exp;
      if (prop === 'dark_points' || prop === 'darkPoints') return player.darkPoints;
      return `{player.${prop}}`;
    });
  },

  /* ───── 조건 평가 ───── */

  checkCondition(cond, player) {
    if (cond === null || cond === undefined) return true;

    if (Array.isArray(cond)) {
      return cond.every(c => this.checkCondition(c, player));
    }

    const flags = player.storyFlags;

    if ('flag' in cond)
      return !!flags[cond.flag];
    if ('not_flag' in cond)
      return !flags[cond.not_flag];
    if ('any_flag' in cond)
      return cond.any_flag.some(f => !!flags[f]);
    if ('all_flags' in cond)
      return cond.all_flags.every(f => !!flags[f]);
    if ('has_item' in cond)
      return player.inventory.includes(cond.has_item);
    if ('not_has_item' in cond)
      return !player.inventory.includes(cond.not_has_item);
    if ('equipped_weapon' in cond) {
      const w = player.equippedWeapon;
      return w && w.name === cond.equipped_weapon;
    }
    if ('gold_gte' in cond)
      return player.gold >= cond.gold_gte;
    if ('gold_lt' in cond)
      return player.gold < cond.gold_lt;
    if ('dark_gte' in cond)
      return player.darkPoints >= cond.dark_gte;
    if ('dark_lt' in cond)
      return player.darkPoints < cond.dark_lt;
    if ('dark_lte' in cond)
      return player.darkPoints <= cond.dark_lte;
    if ('hp_lte' in cond)
      return player.hp <= cond.hp_lte;
    if ('level_gte' in cond)
      return player.level >= cond.level_gte;
    if ('random_lt' in cond)
      return Math.random() < cond.random_lt;

    return true;
  },

  /* ───── 액션 리스트 실행 ───── */

  async runActions(actions, player, scenes) {
    if (!actions || !Array.isArray(actions)) return null;
    for (const action of actions) {
      const result = await this.runAction(action, player, scenes);
      if (result !== null && result !== undefined) return result;
    }
    return null;
  },

  /* ───── 단일 액션 실행 ───── */

  async runAction(action, player, scenes) {
    const act = action.action || action.type || '';

    /* ── 텍스트 ── */
    if (act === 'print') {
      const text = this.formatText(action.text, player);
      text.split('\n').forEach(line => UI.addLog(line));
      return null;
    }

    if (act === 'divider') {
      UI.addDivider(action.title || '');
      return null;
    }

    if (act === 'pause') {
      await UI.waitForTap();
      return null;
    }

    /* ── 플래그 ── */
    if (act === 'set_flag') {
      const val = action.value !== undefined ? action.value : true;
      player.storyFlags[action.key] = val;
      return null;
    }

    /* ── 아이템 ── */
    if (act === 'add_item') {
      const count = action.count || 1;
      for (let i = 0; i < count; i++) {
        player.inventory.push(action.item);
      }
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ ${action.item} x${count}을(를) 획득했습니다!`);
      }
      return null;
    }

    if (act === 'remove_item') {
      const idx = player.inventory.indexOf(action.item);
      if (idx !== -1) player.inventory.splice(idx, 1);
      return null;
    }

    /* ── 골드 ── */
    if (act === 'add_gold') {
      const amt = action.amount;
      player.gold += amt;
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ ${amt}G 획득!`);
      }
      UI.updateHeader();
      return null;
    }

    if (act === 'sub_gold') {
      const amt = action.amount;
      player.gold = Math.max(0, player.gold - amt);
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ ${amt}G 소비!`);
      }
      UI.updateHeader();
      return null;
    }

    /* ── 스탯 ── */
    if (act === 'heal') {
      const amt = action.amount;
      if (amt === 'full' || amt === undefined || amt === null) {
        player.hp = player.maxHp;
      } else {
        player.heal(amt);
      }
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ HP가 회복되었습니다! (${player.hp}/${player.maxHp})`);
      }
      UI.updateHeader();
      return null;
    }

    if (act === 'damage') {
      const amt = action.amount;
      player.hp = Math.max(1, player.hp - amt);
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ ${amt}의 피해를 입었습니다! (HP: ${player.hp})`);
      }
      UI.updateHeader();
      return null;
    }

    if (act === 'add_stat') {
      for (const stat of ['attack', 'defense', 'max_hp']) {
        if (stat in action) {
          if (stat === 'max_hp') {
            player.maxHp += action[stat];
          } else {
            player[stat] += action[stat];
          }
          if (action.message !== false) {
            UI.addSystemMsg(`  ▶ ${stat} +${action[stat]}!`);
          }
        }
      }
      UI.updateHeader();
      return null;
    }

    if (act === 'set_stat') {
      for (const stat of ['attack', 'defense', 'max_hp', 'hp']) {
        if (stat in action) {
          if (stat === 'max_hp') {
            player.maxHp = action[stat];
          } else {
            player[stat] = action[stat];
          }
        }
      }
      UI.updateHeader();
      return null;
    }

    /* ── 어둠 점수 ── */
    if (act === 'add_dark') {
      const amt = action.amount || 1;
      player.darkPoints += amt;
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ 어둠 점수 +${amt}`);
      }
      return null;
    }

    if (act === 'sub_dark') {
      const amt = action.amount || 1;
      player.darkPoints = Math.max(0, player.darkPoints - amt);
      if (action.message !== false) {
        UI.addSystemMsg(`  ▶ 어둠 점수 -${amt}`);
      }
      return null;
    }

    if (act === 'set_dark') {
      player.darkPoints = action.amount;
      return null;
    }

    /* ── 전투 ── */
    if (act === 'battle') {
      const opts = {};
      if (action.name) opts.name = action.name;
      if (action.hp_multiply) opts.hp_multiply = action.hp_multiply;
      if (action.hp_add) opts.hp_add = action.hp_add;

      const result = await CombatSystem.startBattle(player, action.enemy, opts);

      if (result === 'lose') {
        const onLose = action.on_lose || [{ action: 'game_over' }];
        return await this.runActions(onLose, player, scenes);
      }
      if (result === 'fled') {
        return null;
      }
      const onWin = action.on_win || [];
      return await this.runActions(onWin, player, scenes);
    }

    /* ── 상점 ── */
    if (act === 'open_shop') {
      await UI.showShop(player, SHOP_STOCK, '상점');
      UI.showScreen('screen-game');
      return null;
    }

    if (act === 'open_merc_shop') {
      await UI.showShop(player, MERC_SHOP_STOCK, '용병 상점');
      UI.showScreen('screen-game');
      return null;
    }

    if (act === 'open_uw_shop') {
      await UI.showShop(player, UW_SHOP_STOCK, '암흑 시장');
      UI.showScreen('screen-game');
      return null;
    }

    if (act === 'open_cel_shop') {
      await UI.showShop(player, CEL_SHOP_STOCK, '천상 상점');
      UI.showScreen('screen-game');
      return null;
    }

    if (act === 'warp_map') {
      const targetMap = action.map;
      const targetZone = action.zone;
      const mapInfo = MAP_REGISTRY[targetMap];
      if (!mapInfo) return null;
      const locs = mapInfo.locations;
      const marker = Object.entries(locs).find(([, v]) => v.zone === targetZone);
      if (!marker) return null;
      // 마커 위치 찾기
      const raw = mapInfo.raw;
      let pos = null;
      for (let r = 0; r < raw.length && !pos; r++) {
        const idx = raw[r].indexOf(marker[0]);
        if (idx !== -1) pos = { row: r, col: idx };
      }
      if (!pos) return null;
      player.mapId = targetMap;
      player.mapRow = pos.row;
      player.mapCol = pos.col;
      player.currentLocation = targetZone;
      player.visitedLocations.add(targetZone);
      UI.updateHeader();
      UI.addSystemMsg(`  ★ ${mapInfo.name} - ${locs[marker[0]].name}(으)로 이동했습니다!`);
      return null;
    }

    /* ── 인벤토리/상태 ── */
    if (act === 'show_inventory') {
      await UI.showInventory(player);
      return null;
    }

    if (act === 'equip_item') {
      await UI.showEquip(player);
      return null;
    }

    if (act === 'show_status') {
      UI.showStatus(player);
      await UI.waitForTap();
      return null;
    }

    /* ── 위치 ── */
    if (act === 'set_location') {
      player.currentLocation = action.zone;
      player.visitedLocations.add(action.zone);
      return null;
    }

    /* ── 지도 ── */
    if (act === 'show_map') {
      UI.addLog('  [지도 표시 - 웹 버전에서는 위치 메뉴를 사용하세요]');
      return null;
    }

    /* ── 저장 ── */
    if (act === 'save') {
      UI.addDivider('게임 저장');
      const labels = [];
      for (let i = 0; i < 5; i++) labels.push(`슬롯 ${i + 1}`);
      labels.push('취소');
      const choice = await UI.showChoices(labels);
      if (choice < 5) {
        GameState.saveToLocal(choice);
        UI.addSystemMsg(`  슬롯 ${choice + 1}에 저장되었습니다!`);
        await UI.waitForTap();
      }
      return null;
    }

    /* ── 게임 오버 ── */
    if (act === 'game_over') {
      return 'gameover';
    }

    /* ── 반환 ── */
    if (act === 'return') {
      return action.value;
    }

    /* ── 선택지 메뉴 ── */
    if (act === 'menu') {
      return await this.runMenu(action, player, scenes);
    }

    /* ── 조건 분기 ── */
    if (act === 'if') {
      if (this.checkCondition(action.cond, player)) {
        return await this.runActions(action.then || [], player, scenes);
      } else {
        return await this.runActions(action.else || action['else'] || [], player, scenes);
      }
    }

    /* ── 랜덤 분기 ── */
    if (act === 'random') {
      return await this.runRandom(action, player, scenes);
    }

    /* ── 씬 이동 ── */
    if (act === 'goto') {
      const scene = scenes[action.scene];
      if (scene) {
        return await this.runScene(scene, player, scenes);
      }
      return null;
    }

    /* ── 반복 ── */
    if (act === 'loop') {
      while (true) {
        const result = await this.runActions(action.body || [], player, scenes);
        if (result !== null && result !== undefined) {
          if (result === '__break__') return null;
          return result;
        }
      }
    }

    if (act === 'break') {
      return '__break__';
    }

    return null;
  },

  /* ───── 메뉴 (선택지) ───── */

  async runMenu(action, player, scenes) {
    const optionsDef = action.options || [];

    const visible = optionsDef.filter(opt => {
      if (opt.when === undefined || opt.when === null) return true;
      return this.checkCondition(opt.when, player);
    });

    if (visible.length === 0) return null;

    const labels = visible.map(opt => this.formatText(opt.label, player));
    const choice = await UI.showChoices(labels);
    const chosen = visible[choice];

    if (chosen.goto) {
      const scene = scenes[chosen.goto];
      if (scene) return await this.runScene(scene, player, scenes);
      return null;
    }

    return await this.runActions(chosen.actions || [], player, scenes);
  },

  /* ───── 랜덤 분기 ───── */

  async runRandom(action, player, scenes) {
    const branches = action.branches || action.options || [];
    if (branches.length === 0) return null;

    const weights = branches.map(b => b.weight || 1.0);
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let cumulative = 0;

    for (const branch of branches) {
      cumulative += branch.weight || 1.0;
      if (r < cumulative) {
        return await this.runActions(branch.actions || [], player, scenes);
      }
    }
    return await this.runActions(branches[branches.length - 1].actions || [], player, scenes);
  },

  /* ───── 씬 실행 ───── */

  async runScene(scene, player, scenes) {
    if (Array.isArray(scene)) {
      return await this.runActions(scene, player, scenes);
    }
    const actions = scene.actions || [];
    return await this.runActions(actions, player, scenes);
  },

  /* ───── YAML 파일 로드 + 실행 ───── */

  async runYamlEvent(player, zone) {
    const data = await GameState.loadYaml(zone);
    if (!data) return null;

    const event = data[zone] || data;
    const scenes = event.scenes || {};
    const mainActions = event.actions || [];

    return await this.runActions(mainActions, player, scenes);
  },

  /* ───── 지역 잠금 확인 ───── */

  isZoneLocked(player, zone) {
    const area = AREAS[zone];
    if (!area) return false;
    const cond = area.unlock_condition;
    if (!cond) return false;

    const flags = player.storyFlags;

    if (cond.flag) return !flags[cond.flag];
    if (cond.any_flag) return !cond.any_flag.some(f => !!flags[f]);

    return false;
  },

  getLockHint(zone) {
    const area = AREAS[zone];
    return area ? (area.lock_hint || '아직 이동할 수 없습니다.') : '알 수 없는 지역입니다.';
  },
};
