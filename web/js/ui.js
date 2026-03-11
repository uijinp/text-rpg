/* ui.js - UI 관리 */

const UI = {
  _choiceResolve: null,
  _tapResolve: null,
  _previousScreen: 'screen-game',

  pick(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return '';
    return lines[Math.floor(Math.random() * lines.length)];
  },

  showScreen(screenId) {
    const prev = document.querySelector('.screen.active');
    if (prev) this._previousScreen = prev.id;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(screenId);
    if (el) el.classList.add('active');
  },

  goBack() {
    this.showScreen(this._previousScreen || 'screen-game');
  },

  addLog(text, cssClass = '') {
    const log = document.getElementById('game-log');
    if (!log) return;
    const p = document.createElement('p');
    p.className = `text-appear ${cssClass}`.trim();
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  },

  clearLog() {
    const log = document.getElementById('game-log');
    if (log) log.innerHTML = '';
  },

  addDivider(title = '') {
    const log = document.getElementById('game-log');
    if (!log) return;
    if (title) {
      const h = document.createElement('p');
      h.className = 'text-appear text-important';
      h.textContent = `── ${title} ──`;
      log.appendChild(h);
    }
    const hr = document.createElement('hr');
    hr.className = 'divider';
    log.appendChild(hr);
    log.scrollTop = log.scrollHeight;
  },

  addSystemMsg(text) {
    this.addLog(text, 'system-msg');
  },

  showChoices(options) {
    return new Promise(resolve => {
      this._choiceResolve = resolve;
      const container = document.getElementById('game-choices');
      if (!container) { resolve(0); return; }
      container.innerHTML = '';

      options.forEach((label, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = `${idx + 1}. ${label}`;
        btn.addEventListener('click', () => {
          this.hideChoices();
          resolve(idx);
        });
        container.appendChild(btn);
      });

      const log = document.getElementById('game-log');
      if (log) log.scrollTop = log.scrollHeight;
    });
  },

  hideChoices() {
    const container = document.getElementById('game-choices');
    if (container) container.innerHTML = '';
    this._choiceResolve = null;
  },

  async waitForTap() {
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen && activeScreen.id === 'screen-battle') {
      this.showBattleLog('[ 터치하여 계속... ]', 'tap-prompt');
    } else {
      this.addLog('[ 터치하여 계속... ]', 'tap-prompt');
    }
    return new Promise(resolve => {
      this._tapResolve = resolve;
      const handler = (e) => {
        document.removeEventListener('click', handler);
        document.removeEventListener('keydown', handler);
        const prompts = document.querySelectorAll('.tap-prompt');
        prompts.forEach(p => p.remove());
        this._tapResolve = null;
        resolve();
      };
      // 전투 화면/게임 화면 어디서든 탭으로 진행되도록 문서 전체를 감시한다.
      document.addEventListener('click', handler, { once: true });
      document.addEventListener('keydown', handler, { once: true });
    });
  },

  updateHeader() {
    const p = GameState.player;
    if (!p) return;

    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    set('header-name', p.name);
    set('header-level', `Lv.${p.level}`);
    set('header-job', p.job);
    set('header-gold', `💰 ${p.gold}G`);
    set('header-hp-text', `${p.hp}/${p.maxHp}`);

    const loc = AREAS[p.currentLocation];
    set('header-location', `📍 ${loc ? loc.name : '???'}`);

    const hpBar = document.getElementById('header-hp-bar');
    if (hpBar) {
      hpBar.style.width = `${p.maxHp > 0 ? (p.hp / p.maxHp) * 100 : 0}%`;
    }

    this.setAreaBackground(p.currentLocation);
  },

  resolveAreaBackgroundPath(areaKey) {
    const file = AREA_BG_IMAGE[areaKey];
    if (!file) return null;
    return `bg_image/${file}`;
  },

  setAreaBackground(areaKey) {
    const path = this.resolveAreaBackgroundPath(areaKey);
    const root = document.documentElement;
    if (!root) return;
    if (!path) {
      root.style.removeProperty('--game-bg-overlay');
      return;
    }
    const overlay = `linear-gradient(180deg, rgba(4, 4, 8, 0.64), rgba(4, 4, 8, 0.78)), url("${path}")`;
    root.style.setProperty('--game-bg-overlay', overlay);
  },

  /* ───── 지도 UI ───── */

  async showMap(player) {
    this.showScreen('screen-map');
    const container = document.getElementById('map-container');
    if (!container) return;

    container.innerHTML = '';

    const mapId = player.mapId || 'mainland';
    const mapInfo = MAP_REGISTRY[mapId];
    const rawMap = mapInfo.raw;
    const locations = mapInfo.locations;

    // 지도 화면 제목 업데이트
    const heading = document.querySelector('#screen-map .screen-heading');
    if (heading) heading.textContent = `${mapInfo.name} 지도`;

    // 타일별 스타일 클래스 맵 (맵별 동적 구성)
    const tileClasses = {
      '#': 'map-tile-mt', '^': 'map-tile-mt',
      'w': 'map-tile-water', '~': 'map-tile-water',
      'f': 'map-tile-forest', 's': 'map-tile-forest',
      'e': 'map-tile-forest', 'n': 'map-tile-forest',
      '=': 'map-tile-road', '_': 'map-tile-road',
      '.': 'map-tile-land',
    };
    if (mapId === 'underworld') {
      Object.assign(tileClasses, {
        '1': 'map-tile-bone', '2': 'map-tile-crystal',
        '3': 'map-tile-lava', '4': 'map-tile-fortress',
        '5': 'map-tile-abyss', '6': 'map-tile-market',
        '7': 'map-tile-temple',
      });
    } else if (mapId === 'celestial') {
      Object.assign(tileClasses, {
        '*': 'map-tile-cloud-wall',
        '1': 'map-tile-cel-garden', '2': 'map-tile-cel-hall',
        '3': 'map-tile-cel-arsenal', '4': 'map-tile-cel-spire',
        '5': 'map-tile-cel-throne', '6': 'map-tile-cel-market',
        '7': 'map-tile-cel-sanctuary',
      });
    }

    // 각 거점 마커의 위치를 미리 수집
    const markerPositions = {};
    rawMap.forEach((rowStr, r) => {
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        if (ch >= 'A' && ch <= 'Z' && locations[ch]) {
          markerPositions[`${r},${c}`] = locations[ch].name;
        }
      }
    });

    rawMap.forEach((rowStr, r) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'map-row';

      for (let c = 0; c < rowStr.length; c++) {
        const char = rowStr[c];
        const span = document.createElement('span');

        if (r === player.mapRow && c === player.mapCol) {
          span.className = 'map-player';
          span.textContent = '@';
          span.id = 'map-player-marker';
        } else {
          span.className = 'map-tile';
          if (char >= 'A' && char <= 'Z') {
            span.classList.add('map-tile-town');
          } else {
            const cls = tileClasses[char];
            if (cls) span.classList.add(cls);
          }
          span.textContent = char;
        }

        rowDiv.appendChild(span);
      }
      container.appendChild(rowDiv);
    });

    // 거점 라벨을 컨테이너 위에 절대 좌표로 배치
    const tileSize = 14;
    const pad = 20; // container padding
    for (const [key, name] of Object.entries(markerPositions)) {
      const [r, c] = key.split(',').map(Number);
      const label = document.createElement('div');
      label.className = 'map-label';
      label.textContent = name;
      label.style.top = `${pad + r * tileSize - 14}px`;
      label.style.left = `${pad + c * tileSize}px`;
      container.appendChild(label);
    }

    // 현재 위치를 중앙으로 스크롤
    setTimeout(() => {
      const marker = document.getElementById('map-player-marker');
      if (marker) {
        marker.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
      }
    }, 50);

    // 돌아가기 버튼을 누를 때까지 대기
    await new Promise(resolve => {
      const backBtn = document.getElementById('btn-map-back');
      if (!backBtn) { resolve(); return; }
      const handler = () => {
        backBtn.removeEventListener('click', handler);
        resolve();
      };
      backBtn.addEventListener('click', handler);
    });
  },

  /* ───── 상점 UI ───── */

  async showShop(player, stock, shopName = '상점') {
    this.showScreen('screen-game');
    while (true) {
      this.clearLog();
      this.addDivider(shopName);
      const greet = shopName.includes('암흑')
        ? this.pick([
            '  상인: "비밀 거래라면, 값은 묻지 않는 게 좋지..."',
            '  암시장 상인: "금화가 많을수록 입은 가벼워진다네."',
          ])
        : shopName.includes('천상')
          ? this.pick([
              '  천사 상인: "빛의 가호가 당신과 함께하길."',
              '  상인: "정결한 장비가 어둠을 가릅니다."',
            ])
          : this.pick([
              '  상인: "좋은 물건은 주인을 알아보지."',
              '  상인: "모험 전 준비는 생존의 절반이야."',
            ]);
      this.addLog(greet);
      this.addLog(`  보유 골드: ${player.gold}G`);
      this.addLog('');

      const labels = stock.map(name => {
        const info = ITEMS[name];
        return info ? `${name} (${info.price}G) - ${info.desc}` : name;
      });
      labels.push('나가기');

      const choice = await this.showChoices(labels);
      if (choice >= stock.length) break;

      const itemName = stock[choice];
      const info = ITEMS[itemName];
      if (!info) continue;

      if (player.gold >= info.price) {
        player.gold -= info.price;
        player.inventory.push(itemName);
        this.addSystemMsg(this.pick([
          `  ${itemName}을(를) 구매했습니다! (잔여: ${player.gold}G)`,
          `  ${itemName} 확보 완료. 지갑이 조금 가벼워졌습니다. (${player.gold}G)`,
          `  거래 성립! ${itemName}이(가) 가방에 들어갔습니다. (${player.gold}G)`,
        ]));
      } else {
        this.addSystemMsg(this.pick([
          '  골드가 부족합니다!',
          '  상인: "돈이 모자라네. 다음에 다시 오게."',
          '  주머니를 뒤졌지만 금화가 모자랍니다.',
        ]));
      }
      this.updateHeader();
      await this.waitForTap();
    }
  },

  /* ───── 인벤토리 UI ───── */

  async showInventory(player) {
    this.showScreen('screen-game');
    this.clearLog();
    this.addDivider('인벤토리');

    const weapon = player.equippedWeapon ? player.equippedWeapon.name : '없음';
    const armor = player.equippedArmor ? player.equippedArmor.name : '없음';
    this.addLog(`  장착 무기: ${weapon}`);
    this.addLog(`  장착 방어구: ${armor}`);
    this.addLog('');

    if (player.inventory.length === 0) {
      this.addLog(this.pick([
        '  인벤토리가 비어있습니다.',
        '  배낭이 텅 비었습니다. 보급이 필요해 보입니다.',
        '  챙겨둔 물건이 없습니다.',
      ]));
      await this.waitForTap();
      return;
    }

    const counts = {};
    player.inventory.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    const items = Object.entries(counts);

    const labels = items.map(([name, cnt]) => {
      const info = ITEMS[name];
      return `${name} x${cnt}${info ? ' (' + info.desc + ')' : ''}`;
    });
    labels.push('닫기');

    const choice = await this.showChoices(labels);
    if (choice >= items.length) return;

    const [itemName] = items[choice];
    const info = ITEMS[itemName];
    if (!info) return;

    if (info.type === 'consumable') {
      await this._useConsumable(player, itemName, info);
    } else if (info.type === 'weapon' || info.type === 'armor') {
      await this._equipFromInventory(player, itemName, info);
    } else {
      this.addLog(`  ${itemName}: ${info.desc}`);
      await this.waitForTap();
    }
  },

  async _useConsumable(player, itemName, info) {
    const idx = player.inventory.indexOf(itemName);
    if (idx === -1) return;

    this.addLog(`  ${itemName}을(를) 사용하시겠습니까?`);
    const c = await this.showChoices(['사용', '취소']);
    if (c !== 0) return;

    player.inventory.splice(idx, 1);
    if (info.effect === 'heal') {
      const healed = player.heal(info.value);
      this.addSystemMsg(this.pick([
        `  HP가 ${healed} 회복되었습니다! (${player.hp}/${player.maxHp})`,
        `  상처가 가라앉습니다. HP +${healed} (${player.hp}/${player.maxHp})`,
        `  따뜻한 기운이 퍼집니다. HP ${healed} 회복!`,
      ]));
    } else if (info.effect === 'cure') {
      player.poisoned = false;
      this.addSystemMsg(this.pick([
        '  독 상태가 해제되었습니다!',
        '  몸속 독기가 사라졌습니다.',
        '  해독 효과로 상태가 안정되었습니다.',
      ]));
    }
    this.updateHeader();
  },

  async _equipFromInventory(player, itemName, info) {
    this.addLog(`  ${itemName}을(를) 장착하시겠습니까?`);
    const c = await this.showChoices(['장착', '취소']);
    if (c !== 0) return;

    const idx = player.inventory.indexOf(itemName);
    if (idx === -1) return;
    player.inventory.splice(idx, 1);

    if (info.type === 'weapon') {
      if (player.equippedWeapon) player.inventory.push(player.equippedWeapon.name);
      player.equippedWeapon = { name: itemName, attack_bonus: info.attack_bonus };
      this.addSystemMsg(this.pick([
        `  ${itemName} 장착! (공격력 +${info.attack_bonus})`,
        `  무기를 바꿔 쥐었습니다. 공격력이 상승합니다.`,
        `  손에 익은 감각이 듭니다. ${itemName} 장착 완료.`,
      ]));
    } else {
      if (player.equippedArmor) player.inventory.push(player.equippedArmor.name);
      player.equippedArmor = { name: itemName, defense_bonus: info.defense_bonus };
      this.addSystemMsg(this.pick([
        `  ${itemName} 장착! (방어력 +${info.defense_bonus})`,
        '  갑옷 끈을 단단히 조였습니다. 방어가 안정됩니다.',
        `  장비를 정돈했습니다. 몸이 한결 든든합니다.`,
      ]));
    }
    this.updateHeader();
  },

  async showEquip(player) {
    this.clearLog();
    this.addDivider('장비 장착');

    const equippable = player.inventory.filter(name => {
      const info = ITEMS[name];
      return info && (info.type === 'weapon' || info.type === 'armor');
    });

    if (equippable.length === 0) {
      this.addLog('  장착할 수 있는 장비가 없습니다.');
      await this.waitForTap();
      return;
    }

    const unique = [...new Set(equippable)];
    const labels = unique.map(name => {
      const info = ITEMS[name];
      return `${name} (${info.desc})`;
    });
    labels.push('취소');

    const choice = await this.showChoices(labels);
    if (choice >= unique.length) return;

    const itemName = unique[choice];
    const info = ITEMS[itemName];
    await this._equipFromInventory(player, itemName, info);
  },

  showStatus(player) {
    this.clearLog();
    this.addDivider('캐릭터 상태');
    this.addLog(`  이름: ${player.name}`);
    this.addLog(`  직업: ${player.job}`);
    this.addLog(`  레벨: Lv.${player.level} (EXP: ${player.exp}/${player.expToNext})`);
    this.addLog(`  HP: ${player.hp}/${player.maxHp}`);
    const atkBonus = player.equippedWeapon ? ` (+${player.equippedWeapon.attack_bonus})` : '';
    const defBonus = player.equippedArmor ? ` (+${player.equippedArmor.defense_bonus})` : '';
    this.addLog(`  공격력: ${player.attack}${atkBonus}`);
    this.addLog(`  방어력: ${player.defense}${defBonus}`);
    this.addLog(`  골드: ${player.gold}G`);
    this.addLog(`  어둠 점수: ${player.darkPoints}`);
    if (player.equippedWeapon) this.addLog(`  무기: ${player.equippedWeapon.name}`);
    if (player.equippedArmor) this.addLog(`  방어구: ${player.equippedArmor.name}`);
    if (player.poisoned) this.addLog('  상태: 중독 ☠');
  },

  showQuestLog(questData) {
    this.clearLog();
    this.addDivider('퀘스트 로그');

    const main = questData.main || [];
    const side = questData.side || [];
    const hints = questData.hints || [];

    if (main.length === 0 && side.length === 0 && hints.length === 0) {
      this.addLog('  진행 중인 퀘스트가 없습니다.');
      return;
    }

    if (main.length > 0) {
      this.addLog('  [메인 목표]');
      main.forEach((q) => this.addLog(`  • ${q}`));
      this.addLog('');
    }

    if (side.length > 0) {
      this.addLog('  [서브 목표]');
      side.forEach((q) => this.addLog(`  • ${q}`));
      this.addLog('');
    }

    if (hints.length > 0) {
      this.addLog('  [진행 힌트]');
      hints.forEach((h) => this.addLog(`  • ${h}`));
    }
  },

  /* ───── 전투 UI ───── */

  showBattleScreen() {
    this.showScreen('screen-battle');
  },

  updateBattleUI(player, enemies, turn, targetIdx = 0) {
    const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    const setW = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${pct}%`; };

    /* 적 목록 렌더링 */
    const container = document.getElementById('battle-enemies-container');
    if (container) {
      container.innerHTML = '';
      const arr = Array.isArray(enemies) ? enemies : [enemies];
      arr.forEach((e, i) => {
        const entry = document.createElement('div');
        entry.className = 'battle-enemy-entry';
        if (e.hp <= 0) entry.classList.add('dead');
        if (i === targetIdx && e.hp > 0) entry.classList.add('targeted');

        const nameRow = document.createElement('div');
        nameRow.className = 'battle-enemy-name';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = e.label || e.name;
        const hpSpan = document.createElement('span');
        hpSpan.className = 'hp-text';
        hpSpan.textContent = e.hp > 0 ? `${e.hp}/${e.maxHp}` : '처치';
        nameRow.appendChild(nameSpan);
        nameRow.appendChild(hpSpan);

        const hpCont = document.createElement('div');
        hpCont.className = 'hp-bar-container';
        const hpBar = document.createElement('div');
        hpBar.className = 'hp-bar hp-bar-enemy';
        hpBar.style.width = `${e.maxHp > 0 ? (Math.max(0, e.hp) / e.maxHp) * 100 : 0}%`;
        hpCont.appendChild(hpBar);

        entry.appendChild(nameRow);
        entry.appendChild(hpCont);
        container.appendChild(entry);
      });
    }

    set('battle-player-name', player.name);
    set('battle-player-level', `Lv.${player.level}`);
    set('battle-player-hp-text', `${player.hp}/${player.maxHp}`);
    setW('battle-player-hp-bar', player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0);
    set('battle-turn', `턴 ${turn}`);
  },

  async showTargetSelect(enemies) {
    return new Promise(resolve => {
      const container = document.getElementById('battle-actions');
      if (!container) { resolve(0); return; }
      container.innerHTML = '';

      const label = document.createElement('p');
      label.className = 'target-label';
      label.textContent = '🎯 공격 대상 선택';
      container.appendChild(label);

      enemies.forEach((e, i) => {
        if (e.hp <= 0) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-battle';
        btn.textContent = `${e.label} (HP ${e.hp}/${e.maxHp})`;
        btn.addEventListener('click', () => { container.innerHTML = ''; resolve(i); });
        container.appendChild(btn);
      });
    });
  },

  showBattleLog(text, cssClass = '') {
    const log = document.getElementById('battle-log');
    if (!log) return;
    const p = document.createElement('p');
    p.className = `text-appear ${cssClass}`.trim();
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  },

  clearBattleLog() {
    const log = document.getElementById('battle-log');
    if (log) log.innerHTML = '';
  },

  async showBattleChoices(skills = []) {
    return new Promise(resolve => {
      const container = document.getElementById('battle-actions');
      if (!container) { resolve(0); return; }
      container.innerHTML = '';

      const actions = [{ label: '⚔ 공격', idx: 0 }];
      skills.forEach((sk, i) => actions.push({ label: `✦ ${sk.name}`, idx: i + 1 }));
      actions.push({ label: '🧪 아이템', idx: skills.length + 1 });
      actions.push({ label: '💨 도망', idx: skills.length + 2 });

      actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-battle';
        btn.textContent = act.label;
        btn.addEventListener('click', () => {
          container.innerHTML = '';
          resolve(act.idx);
        });
        container.appendChild(btn);
      });
    });
  },

  async showBattleItemMenu(player) {
    const consumables = player.inventory.filter(name => {
      const info = ITEMS[name];
      return info && info.type === 'consumable';
    });

    if (consumables.length === 0) {
      this.showBattleLog('  사용할 아이템이 없습니다!');
      return null;
    }

    const counts = {};
    consumables.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    const items = Object.entries(counts);

    return new Promise(resolve => {
      const container = document.getElementById('battle-actions');
      if (!container) { resolve(null); return; }
      container.innerHTML = '';

      items.forEach(([name, cnt], idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-battle';
        btn.textContent = `${name} x${cnt}`;
        btn.addEventListener('click', () => {
          container.innerHTML = '';
          resolve(name);
        });
        container.appendChild(btn);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-battle';
      cancelBtn.textContent = '취소';
      cancelBtn.addEventListener('click', () => {
        container.innerHTML = '';
        resolve(null);
      });
      container.appendChild(cancelBtn);
    });
  },
};
