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
    /* F25: 맵 툴팁이 다른 화면에서 남지 않도록 항상 숨김 */
    const tip = document.getElementById('map-tooltip');
    if (tip) tip.classList.add('hidden');
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

  /* ── 타자기 효과 ── */
  _typewriterTimer: null,
  _typewriterResolve: null,
  _typewriterP: null,
  _typewriterSegments: null,
  _typewriterIdx: 0,

  _KEYWORD_RULES: [
    { pattern: /(\d+)\s*데미지/g, cls: 'kw-damage' },
    { pattern: /(\d+)\s*회복/g, cls: 'kw-heal' },
    { pattern: /\d+G/g, cls: 'kw-gold' },
    { pattern: /Lv\.\d+/g, cls: 'kw-level' },
    { pattern: /HP\s*\+?\d+/g, cls: 'kw-heal' },
    { pattern: /공격력\s*\+\d+/g, cls: 'kw-damage' },
    { pattern: /방어력\s*\+\d+/g, cls: 'kw-level' },
  ],

  _buildSegments(text) {
    /* 텍스트를 [{text, cls}] 세그먼트 배열로 분해 */
    const marks = []; // {start, end, cls}
    for (const rule of this._KEYWORD_RULES) {
      rule.pattern.lastIndex = 0;
      let m;
      while ((m = rule.pattern.exec(text)) !== null) {
        marks.push({ start: m.index, end: m.index + m[0].length, cls: rule.cls });
      }
    }
    marks.sort((a, b) => a.start - b.start);
    /* 겹치는 구간 제거 */
    const filtered = [];
    let lastEnd = 0;
    for (const mk of marks) {
      if (mk.start >= lastEnd) { filtered.push(mk); lastEnd = mk.end; }
    }
    const segs = [];
    let pos = 0;
    for (const mk of filtered) {
      if (mk.start > pos) segs.push({ text: text.slice(pos, mk.start), cls: '' });
      segs.push({ text: text.slice(mk.start, mk.end), cls: mk.cls });
      pos = mk.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), cls: '' });
    return segs;
  },

  addLogTypewriter(text, speed = 25) {
    return new Promise(resolve => {
      const log = document.getElementById('game-log');
      if (!log || !text || text.trim() === '') { resolve(); return; }

      /* 이전 타자기 강제 완료 */
      this.skipTypewriter();

      const p = document.createElement('p');
      p.className = 'text-appear';
      log.appendChild(p);

      const segments = this._buildSegments(text);
      /* 글자 단위 큐 생성 */
      const charQueue = [];
      for (const seg of segments) {
        for (const ch of seg.text) {
          charQueue.push({ ch, cls: seg.cls });
        }
      }

      this._typewriterP = p;
      this._typewriterSegments = charQueue;
      this._typewriterIdx = 0;
      this._typewriterResolve = resolve;

      let currentSpan = null;
      let currentCls = '';

      const tick = () => {
        if (this._typewriterIdx >= charQueue.length) {
          clearInterval(this._typewriterTimer);
          this._typewriterTimer = null;
          this._typewriterResolve = null;
          log.scrollTop = log.scrollHeight;
          resolve();
          return;
        }
        const item = charQueue[this._typewriterIdx++];
        if (item.cls !== currentCls || !currentSpan) {
          if (item.cls) {
            currentSpan = document.createElement('span');
            currentSpan.className = item.cls;
            p.appendChild(currentSpan);
          } else {
            currentSpan = null;
          }
          currentCls = item.cls;
        }
        if (currentSpan) {
          currentSpan.textContent += item.ch;
        } else {
          p.appendChild(document.createTextNode(item.ch));
        }
        log.scrollTop = log.scrollHeight;
      };

      this._typewriterTimer = setInterval(tick, speed);
    });
  },

  skipTypewriter() {
    if (!this._typewriterTimer) return;
    clearInterval(this._typewriterTimer);
    this._typewriterTimer = null;
    /* 남은 글자 즉시 렌더링 */
    if (this._typewriterP && this._typewriterSegments) {
      this._typewriterP.textContent = '';
      const segments = this._buildSegments(
        this._typewriterSegments.map(c => c.ch).join('')
      );
      for (const seg of segments) {
        if (seg.cls) {
          const span = document.createElement('span');
          span.className = seg.cls;
          span.textContent = seg.text;
          this._typewriterP.appendChild(span);
        } else {
          this._typewriterP.appendChild(document.createTextNode(seg.text));
        }
      }
      const log = document.getElementById('game-log');
      if (log) log.scrollTop = log.scrollHeight;
    }
    if (this._typewriterResolve) {
      this._typewriterResolve();
      this._typewriterResolve = null;
    }
    this._typewriterP = null;
    this._typewriterSegments = null;
    this._typewriterIdx = 0;
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

    const posName = (typeof getAreaNameByPos === 'function')
      ? getAreaNameByPos(p.mapRow, p.mapCol)
      : (AREAS[p.currentLocation]?.name || '???');
    const posZone = (typeof getZoneAt === 'function')
      ? getZoneAt(p.mapRow, p.mapCol) : null;
    const zoneData = posZone ? AREAS[posZone] : null;
    const recLvl = zoneData?.recommendedLevel;
    const lvlTag = (recLvl > 0) ? ` [Lv.${recLvl}]` : '';
    set('header-location', `📍 ${posName}${lvlTag}`);

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
      'p': 'map-tile-colosseum', 'o': 'map-tile-temple-old',
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

    // 거점 라벨을 컨테이너 위에 절대 좌표로 배치 (F25: 인터랙티브)
    const tileSize = 14;
    const pad = 20; // container padding
    const tooltip = document.getElementById('map-tooltip');

    const hideTooltip = () => { if (tooltip) tooltip.classList.add('hidden'); };

    /* 맵 영역 클릭 시 툴팁 닫기 */
    container.addEventListener('click', (e) => {
      if (!e.target.classList.contains('map-label')) hideTooltip();
    });

    for (const [key, name] of Object.entries(markerPositions)) {
      const [r, c] = key.split(',').map(Number);
      /* 해당 마커의 zone 찾기 */
      const markerChar = Object.entries(locations).find(([ch, v]) => v.name === name)?.[0];
      const zoneId = markerChar ? locations[markerChar]?.zone : null;
      const areaData = zoneId ? AREAS[zoneId] : null;
      const isVisited = player.visitedLocations.has(zoneId);
      const isLocked = zoneId && (typeof EventEngine !== 'undefined') && EventEngine.isZoneLocked(player, zoneId);
      const isCurrent = (r === player.mapRow && c === player.mapCol);

      const label = document.createElement('div');
      label.className = 'map-label';
      if (isCurrent) label.classList.add('label-current');
      else if (isLocked) label.classList.add('label-locked');
      else if (isVisited) label.classList.add('label-visited');
      else label.classList.add('label-unvisited');

      label.textContent = (isLocked ? '🔒 ' : '') + name;
      label.style.top = `${pad + r * tileSize - 14}px`;
      label.style.left = `${pad + c * tileSize}px`;

      /* F25: 클릭 시 툴팁 표시 */
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!tooltip) return;
        tooltip.innerHTML = '';
        tooltip.classList.remove('hidden');

        const title = document.createElement('div');
        title.className = 'tooltip-title';
        title.textContent = name;
        tooltip.appendChild(title);

        /* 위험도 표시 */
        const recLvl = areaData?.recommendedLevel || 0;
        if (recLvl > 0) {
          const danger = document.createElement('div');
          danger.className = 'tooltip-danger';
          let skulls = 0;
          if (recLvl <= 2) skulls = 1;
          else if (recLvl <= 5) skulls = 2;
          else if (recLvl <= 8) skulls = 3;
          else if (recLvl <= 11) skulls = 4;
          else skulls = 5;
          danger.textContent = '💀'.repeat(skulls);
          tooltip.appendChild(danger);

          const lvl = document.createElement('div');
          lvl.className = 'tooltip-level';
          lvl.textContent = `권장 레벨: Lv.${recLvl}`;
          tooltip.appendChild(lvl);
        } else {
          const safe = document.createElement('div');
          safe.className = 'tooltip-level';
          safe.textContent = '안전 지대';
          tooltip.appendChild(safe);
        }

        /* 상태 */
        const status = document.createElement('div');
        status.className = 'tooltip-status';
        if (isLocked) {
          status.classList.add('locked');
          status.textContent = '🔒 잠김';
        } else if (isVisited) {
          status.classList.add('visited');
          status.textContent = '✓ 탐험 완료';
        } else {
          status.classList.add('unexplored');
          status.textContent = '? 미탐험';
        }
        tooltip.appendChild(status);

        /* 빠른 이동 버튼 (방문한 비잠금 지역만) */
        if (isVisited && !isLocked && !isCurrent && markerChar) {
          const btn = document.createElement('button');
          btn.className = 'btn-quick-travel';
          btn.textContent = '⚡ 빠른 이동';
          btn.addEventListener('click', () => {
            hideTooltip();
            player.mapRow = r;
            player.mapCol = c;
            player.currentLocation = zoneId;
            player.visitedLocations.add(zoneId);
            if (typeof UI !== 'undefined') {
              UI.updateHeader();
              UI.showScreen('screen-game');
              UI.addSystemMsg(`  ★ ${name}(으)로 빠르게 이동했습니다!`);
            }
            /* 맵 닫기: back 버튼의 핸들러를 트리거 */
            const backBtn = document.getElementById('btn-map-back');
            if (backBtn) backBtn.click();
          });
          tooltip.appendChild(btn);
        }

        /* 툴팁 위치 계산 */
        const rect = label.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 6}px`;
        tooltip.style.left = `${Math.max(8, Math.min(window.innerWidth - 270, rect.left - 60))}px`;
      });

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
        hideTooltip(); /* F25: 맵 닫을 때 툴팁 숨김 */
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
      /* 적 수에 따라 크기 클래스 부여 */
      container.className = 'battle-enemies-container';
      if (arr.length >= 4) container.classList.add('enemies-4');
      else if (arr.length === 3) container.classList.add('enemies-3');
      else if (arr.length === 2) container.classList.add('enemies-2');
      arr.forEach((e, i) => {
        const entry = document.createElement('div');
        entry.className = 'battle-enemy-entry';
        if (e.hp <= 0) entry.classList.add('dead');
        if (i === targetIdx && e.hp > 0) entry.classList.add('targeted');

        /* 몬스터 이미지 */
        const img = document.createElement('img');
        img.className = 'battle-enemy-img';
        img.src = `monster_image/${e.key}.webp`;
        img.alt = e.label || e.name;
        img.loading = 'lazy';
        img.onerror = function() { this.style.display = 'none'; };

        /* 이름 + HP 정보 영역 */
        const info = document.createElement('div');
        info.className = 'battle-enemy-info';

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

        info.appendChild(nameRow);
        info.appendChild(hpCont);

        entry.appendChild(img);
        entry.appendChild(info);
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

  /* F24: 전투 애니메이션 */
  flashEnemyEntry(idx, type = 'hit') {
    const entries = document.querySelectorAll('.battle-enemy-entry');
    const entry = entries[idx];
    if (!entry) return;
    entry.classList.remove('enemy-hit', 'enemy-miss', 'enemy-critical');
    void entry.offsetWidth; /* reflow trick */
    entry.classList.add(`enemy-${type}`);
    setTimeout(() => entry.classList.remove(`enemy-${type}`), 400);
  },

  shakeScreen() {
    const area = document.querySelector('.battle-area');
    if (!area) return;
    area.classList.remove('screen-shake');
    void area.offsetWidth;
    area.classList.add('screen-shake');
    setTimeout(() => area.classList.remove('screen-shake'), 400);
  },

  flashPlayerHpBar() {
    const bar = document.getElementById('battle-player-hp-bar');
    if (!bar) return;
    bar.classList.remove('hp-dmg-flash');
    void bar.offsetWidth;
    bar.classList.add('hp-dmg-flash');
    setTimeout(() => bar.classList.remove('hp-dmg-flash'), 400);
  },

  /* ── 토스트 알림 ── */
  showToast(text, cssClass = '', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${cssClass}`.trim();
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration + 500);
  },

  /* ── F8: 업적 패널 ── */
  showAchievementPanel(player) {
    this.clearLog();
    this.addDivider('업적');
    const log = document.getElementById('game-log');
    if (!log) return;

    const panel = document.createElement('div');
    panel.className = 'achievement-panel';

    const categories = {};
    for (const ach of ACHIEVEMENTS) {
      if (!categories[ach.category]) categories[ach.category] = [];
      categories[ach.category].push(ach);
    }

    for (const [catName, achs] of Object.entries(categories)) {
      const catDiv = document.createElement('div');
      catDiv.className = 'achievement-category';
      const catTitle = document.createElement('div');
      catTitle.className = 'achievement-category-title';
      catTitle.textContent = catName;
      catDiv.appendChild(catTitle);

      for (const ach of achs) {
        const unlocked = player.unlockedAchievements.includes(ach.id);
        const item = document.createElement('div');
        item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;

        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = ach.icon;

        const info = document.createElement('div');
        info.className = 'achievement-info';
        const name = document.createElement('div');
        name.className = 'achievement-name';
        name.textContent = ach.name;
        const desc = document.createElement('div');
        desc.className = 'achievement-desc';
        desc.textContent = ach.desc;
        info.appendChild(name);
        info.appendChild(desc);

        if (ach.reward) {
          const reward = document.createElement('div');
          reward.className = 'achievement-reward';
          const parts = [];
          if (ach.reward.gold) parts.push(`${ach.reward.gold}G`);
          if (ach.reward.stat) {
            if (ach.reward.stat.attack) parts.push(`공격+${ach.reward.stat.attack}`);
            if (ach.reward.stat.defense) parts.push(`방어+${ach.reward.stat.defense}`);
            if (ach.reward.stat.max_hp) parts.push(`HP+${ach.reward.stat.max_hp}`);
          }
          reward.textContent = `보상: ${parts.join(', ')}`;
          info.appendChild(reward);
        }

        item.appendChild(icon);
        item.appendChild(info);
        if (unlocked) {
          const check = document.createElement('div');
          check.className = 'achievement-check';
          check.textContent = '✓';
          item.appendChild(check);
        }
        catDiv.appendChild(item);
      }
      panel.appendChild(catDiv);
    }

    const progress = AchievementManager.getProgress(player);
    const progDiv = document.createElement('div');
    progDiv.className = 'achievement-progress';
    progDiv.textContent = `달성: ${progress.unlocked} / ${progress.total}`;
    panel.appendChild(progDiv);

    log.appendChild(panel);
    log.scrollTop = 0;
  },

  /* ── F9: 스킬 트리 패널 ── */
  showSkillTree(player) {
    this.clearLog();
    this.addDivider('스킬 트리');
    const log = document.getElementById('game-log');
    if (!log) return;

    const tree = SKILL_TREES[player.job];
    if (!tree) { this.addLog('  스킬 트리 데이터가 없습니다.'); return; }

    const panel = document.createElement('div');
    panel.className = 'skill-tree-panel';

    const header = document.createElement('div');
    header.className = 'skill-tree-header';
    const spDisplay = document.createElement('div');
    spDisplay.className = 'skill-points-display';
    spDisplay.textContent = `스킬 포인트: ${player.skillPoints || 0}`;
    header.appendChild(spDisplay);
    panel.appendChild(header);

    const renderTree = () => {
      /* 브랜치 영역만 다시 렌더링 */
      panel.querySelectorAll('.skill-branch').forEach(el => el.remove());
      spDisplay.textContent = `스킬 포인트: ${player.skillPoints || 0}`;

      for (const branch of tree.branches) {
        const brDiv = document.createElement('div');
        brDiv.className = 'skill-branch';
        const brTitle = document.createElement('div');
        brTitle.className = 'skill-branch-title';
        brTitle.textContent = branch.name;
        brDiv.appendChild(brTitle);

        const nodesDiv = document.createElement('div');
        nodesDiv.className = 'skill-nodes';

        for (const node of branch.nodes) {
          const unlocked = SkillTreeManager.isUnlocked(player, node.id);
          const canUnlock = SkillTreeManager.canUnlock(player, node);
          const nDiv = document.createElement('div');
          nDiv.className = 'skill-node';
          if (unlocked) nDiv.classList.add('node-unlocked');
          else if (canUnlock) nDiv.classList.add('node-available');
          else nDiv.classList.add('node-locked');

          const nName = document.createElement('div');
          nName.className = 'skill-node-name';
          nName.textContent = node.name;
          const nCost = document.createElement('div');
          nCost.className = 'skill-node-cost';
          nCost.textContent = unlocked ? '습득 완료' : `${node.cost}pt`;
          const nType = document.createElement('div');
          nType.className = 'skill-node-type';
          nType.textContent = `${node.type === 'passive' ? '패시브' : '액티브'} · ${node.desc}`;

          nDiv.appendChild(nName);
          nDiv.appendChild(nCost);
          nDiv.appendChild(nType);

          if (canUnlock) {
            nDiv.addEventListener('click', () => {
              if (SkillTreeManager.unlock(player, node.id)) {
                this.showToast(`✦ ${node.name} 습득!`, 'toast-achievement');
                renderTree();
              }
            });
          }

          nodesDiv.appendChild(nDiv);
        }
        brDiv.appendChild(nodesDiv);
        panel.appendChild(brDiv);
      }
    };

    renderTree();
    log.appendChild(panel);
    log.scrollTop = 0;
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
