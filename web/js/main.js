/* main.js - 메인 진입점 (영웅전설 스타일) */

document.addEventListener('DOMContentLoaded', () => {
  UI.showScreen('screen-title');

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-load-game').addEventListener('click', loadGame);

  setupBackButtons();
  setupDPad();
  setupDPadMap();

  /* 대화창 터치 → 타자기 스킵 */
  document.getElementById('dialog-text')?.addEventListener('click', () => {
    UI.skipTypewriter();
  });
});

function pick(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}

/* 게임 상태 */
let _gameState = 'field'; // 'field' | 'dialog' | 'battle'
let _dpadLocked = false;

/* ───── 방향키 (D-pad) 설정 ───── */
function setupDPad() {
  const dirMap = {
    'dpad-up': { dr: -1, dc: 0, name: '북' },
    'dpad-down': { dr: 1, dc: 0, name: '남' },
    'dpad-left': { dr: 0, dc: -1, name: '서' },
    'dpad-right': { dr: 0, dc: 1, name: '동' },
  };

  for (const [id, d] of Object.entries(dirMap)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.addEventListener('click', async () => {
      if (_dpadLocked) return;
      if (!GameState.player || !GameState.player.isAlive()) return;

      // 대화창 열려있으면 이동 차단
      if (_gameState !== 'field') {
        // 대화 중 D-pad → 대화 닫고 필드로 복귀 (showChoices 대기 중이면 해소)
        if (UI._choiceResolve) {
          const resolve = UI._choiceResolve;
          UI.hideChoices();
          resolve('dpad_move');
        }
        return;
      }

      _dpadLocked = true;
      const stepResult = await tryStepMove(GameState.player, d.dr, d.dc, d.name);
      _dpadLocked = false;

      if (stepResult.gameover) {
        await showGameOver(GameState.player);
      }
    });
  }
}

/* ───── D-pad 중앙 지도 버튼 ───── */
function setupDPadMap() {
  const btn = document.getElementById('dpad-map');
  if (!btn) return;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!GameState.player) return;
    const mapResult = await UI.showMap(GameState.player);
    if (mapResult && mapResult.quickTravel) {
      UI.showScreen('screen-game');
      UI.updateHeader();
      renderTileMap(GameState.player);
      UI.showToast(`★ ${mapResult.name}(으)로 빠르게 이동했습니다!`);
      // 대화창 대기 중이면 해소
      if (UI._choiceResolve) {
        const resolve = UI._choiceResolve;
        UI.hideChoices();
        resolve('dpad_move');
      }
    }
  });
}

function buildQuestData(player) {
  const flags = player.storyFlags || {};
  const main = [];
  const side = [];
  const hints = [];

  if (!flags.forest_cleared) {
    main.push('어두운 숲을 정리해 다음 지역으로 향하는 길을 확보한다.');
  } else if (!(flags.cave_cleared || flags.river_cleared || flags.ruins_cleared)) {
    main.push('몬스터 동굴 / 안개 강가 / 저주받은 폐허 중 한 곳을 해결한다.');
  } else if (!flags.bandit_camp_cleared) {
    main.push('산적 야영지를 정리해 마왕의 성으로 가는 길을 연다.');
  } else if (!flags.castle_gate_cleared) {
    main.push('마왕의 성 정문을 돌파한다.');
  } else if (!flags.castle_inside_cleared) {
    main.push('성 내부를 탐색해 마왕과의 결전을 준비한다.');
  } else if (!flags.lazarus_defeated) {
    main.push('어둠의 탑을 추적하거나 마왕의 방으로 진입한다.');
  } else {
    main.push('최종 결전을 준비한다.');
  }

  if (flags.blacksmith_quest && !flags.rescued_kai) {
    side.push("대장장이 브론의 아들 '카이'를 찾아 구출한다.");
  }
  if (!flags.child_done) {
    side.push('아르카디아 골목의 어린아이 부탁을 확인한다.');
  }
  if (!flags.desert_explored && flags.forest_cleared) {
    side.push('사하르 마을을 탐색해 사막 라인을 개척한다.');
  }

  const lockedHints = [];
  for (const [zone, info] of Object.entries(AREAS)) {
    if (!info || !info.unlock_condition) continue;
    if (EventEngine.isZoneLocked(player, zone)) {
      lockedHints.push(`${info.name}: ${EventEngine.getLockHint(zone)}`);
    }
  }
  hints.push(...lockedHints.slice(0, 5));

  return { main, side, hints };
}

/* ───── 돌아가기 버튼 ───── */

function setupBackButtons() {
  ['btn-shop-back', 'btn-inv-back', 'btn-status-back', 'btn-map-back'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      UI.showScreen('screen-game');
      renderTileMap(GameState.player);
    });
  });
}

/* ───── 멀티맵 시스템 ───── */

const TILE_MAPS = {};
for (const [mapId, info] of Object.entries(MAP_REGISTRY)) {
  TILE_MAPS[mapId] = info.raw.map(row => row.split(''));
}

function getCurrentMapId() {
  return GameState.player?.mapId || 'mainland';
}

function getCurrentTileMap() {
  return TILE_MAPS[getCurrentMapId()];
}

function getCurrentLocations() {
  return MAP_REGISTRY[getCurrentMapId()].locations;
}

function getCurrentTerrain() {
  return MAP_REGISTRY[getCurrentMapId()].terrain;
}

function findMarkerPosition(markerChar, mapId) {
  const tileMap = TILE_MAPS[mapId || getCurrentMapId()];
  for (let r = 0; r < tileMap.length; r++) {
    for (let c = 0; c < tileMap[r].length; c++) {
      if (tileMap[r][c] === markerChar) return { row: r, col: c };
    }
  }
  return null;
}

function getTileChar(row, col) {
  const tileMap = getCurrentTileMap();
  if (row < 0 || row >= tileMap.length) return '#';
  if (col < 0 || col >= tileMap[0].length) return '#';
  return tileMap[row][col];
}

function canMoveTo(row, col) {
  const ch = getTileChar(row, col);
  const locs = getCurrentLocations();
  if (ch in locs) return true;
  const terrain = getCurrentTerrain();
  return !!terrain[ch]?.passable;
}

function getZoneAt(row, col) {
  const ch = getTileChar(row, col);
  const locs = getCurrentLocations();
  if (locs[ch]) return locs[ch].zone;
  const terrain = getCurrentTerrain();
  return terrain[ch]?.zone ?? null;
}

function getAreaNameByPos(row, col) {
  const ch = getTileChar(row, col);
  const locs = getCurrentLocations();
  if (locs[ch]) return locs[ch].name;
  const zone = getZoneAt(row, col);
  return AREAS[zone]?.name || '이동 중';
}

function getMovementFlavorText(row, col, prevZone, nextZone) {
  const ch = getTileChar(row, col);
  const locs = getCurrentLocations();

  if (locs[ch]) {
    const location = locs[ch];
    const area = AREAS[location.zone];
    return area?.desc || `${location.name}에 도착했다.`;
  }

  if (ch === '=' || ch === '_') {
    const mid = getCurrentMapId();
    if (mid === 'underworld') return pick([
      '어두운 지하 통로를 따라 나아갔다.',
      '축축한 통로에서 물방울이 떨어진다.',
    ]);
    if (mid === 'celestial') return pick([
      '황금빛 구름 위의 길을 걸어갔다.',
      '천상의 바람이 옷자락을 흔들었다.',
    ]);
    return pick([
      '정비된 대로를 따라 걸음을 옮겼다.',
      '잘 닦인 도로 위를 걸어갔다.',
    ]);
  }

  if (ch === '.') {
    const mid = getCurrentMapId();
    if (mid === 'underworld') return pick(['어둠 속으로 나아갔다.', '돌바닥이 차갑다.']);
    if (mid === 'celestial') return pick(['구름 위를 걸어갔다.', '따스한 빛이 길을 밝혀 준다.']);
    return pick([
      '한적한 길을 걸어갔다.',
      '바람이 풀숲을 스치며 살랑거렸다.',
      '새소리가 들려오는 평화로운 길이다.',
    ]);
  }

  if (nextZone && AREAS[nextZone]) {
    return AREAS[nextZone].desc;
  }

  return pick([
    '조심스럽게 한 걸음 나아갔다.',
    '낯선 지형을 살피며 이동했다.',
  ]);
}


/* ═══════════════════════════════════════════════
   ★ 전체 화면 타일맵 렌더러 ★
   ═══════════════════════════════════════════════ */

const TILE_SIZE = 32;

function renderTileMap(player) {
  const viewport = document.getElementById('tilemap-viewport');
  const grid = document.getElementById('tilemap-grid');
  if (!viewport || !grid || !player) return;
  if (!Number.isInteger(player.mapRow) || !Number.isInteger(player.mapCol)) return;

  const mapId = player.mapId || 'mainland';
  const tileMap = TILE_MAPS[mapId];
  const locs = MAP_REGISTRY[mapId].locations;

  // 뷰포트 크기 기반 타일 수 계산
  const vpW = viewport.clientWidth || 480;
  const vpH = viewport.clientHeight || 640;
  const cols = Math.ceil(vpW / TILE_SIZE) + 1; // 여유 1열 추가
  const rows = Math.ceil(vpH / TILE_SIZE) + 1;

  // 카메라: 플레이어 중앙
  const halfC = Math.floor(cols / 2);
  const halfR = Math.floor(rows / 2);
  const startCol = player.mapCol - halfC;
  const startRow = player.mapRow - halfR;

  grid.style.gridTemplateColumns = `repeat(${cols}, ${TILE_SIZE}px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, ${TILE_SIZE}px)`;
  // 그리드를 뷰포트 중앙에 배치
  grid.style.width = `${cols * TILE_SIZE}px`;
  grid.style.height = `${rows * TILE_SIZE}px`;

  grid.innerHTML = '';

  for (let dr = 0; dr < rows; dr++) {
    for (let dc = 0; dc < cols; dc++) {
      const r = startRow + dr;
      const c = startCol + dc;
      const span = document.createElement('span');
      span.className = 'vtile';

      if (r === player.mapRow && c === player.mapCol) {
        /* 플레이어 타일 */
        const ch = tileMap[r]?.[c] || '.';
        const v = VisualMap.getTileVisual(ch, mapId);
        span.classList.add('vtile-player', 'vtile-passable');
        span.style.backgroundColor = v.css;
        if (v.img) span.style.backgroundImage = `url(tile_image/${v.img}.webp)`;

        /* 캐릭터 스프라이트 */
        const sprite = VisualMap.getSprite(player.job, false);
        const charImg = document.createElement('img');
        charImg.className = 'char-sprite';
        charImg.src = sprite.path;
        charImg.alt = '';
        charImg.onerror = () => {
          charImg.remove();
          const em = document.createElement('span');
          em.className = 'char-emoji';
          em.textContent = sprite.emoji;
          span.appendChild(em);
        };
        span.appendChild(charImg);
      } else if (r < 0 || r >= tileMap.length || c < 0 || c >= tileMap[0].length) {
        /* 맵 밖 */
        span.classList.add('vtile-void');
      } else {
        /* 일반 타일: 통행 가능/불가 시각 구분 */
        const ch = tileMap[r][c];
        const passable = canMoveTo(r, c);
        span.classList.add(passable ? 'vtile-passable' : 'vtile-impassable');
        const v = VisualMap.getTileVisual(ch, mapId);
        span.style.backgroundColor = v.css;
        if (v.img) span.style.backgroundImage = `url(tile_image/${v.img}.webp)`;
        if (v.emoji) span.textContent = v.emoji;
        /* 거점 마커 */
        if (ch >= 'A' && ch <= 'Z' && locs[ch]) {
          span.classList.add('vtile-marker');
          span.title = locs[ch].name;
        }
      }
      grid.appendChild(span);
    }
  }
}

/* 하위 호환 */
function updateMiniMap(player) { renderTileMap(player); }


/* ═══════════════════════════════════════════════
   이동 시스템
   ═══════════════════════════════════════════════ */

async function tryStepMove(player, dr, dc, label) {
  const prevRow = player.mapRow;
  const prevCol = player.mapCol;
  const nr = player.mapRow + dr;
  const nc = player.mapCol + dc;

  if (!canMoveTo(nr, nc)) {
    UI.showToast(`${label}쪽은 갈 수 없습니다`);
    return { ok: false };
  }

  const curZone = getZoneAt(player.mapRow, player.mapCol);
  const nextZone = getZoneAt(nr, nc);
  if (nextZone && nextZone !== curZone && EventEngine.isZoneLocked(player, nextZone)) {
    UI.showToast(`[잠김] ${EventEngine.getLockHint(nextZone)}`);
    return { ok: false };
  }

  // 대화창 숨기기 (필드 이동 시)
  UI.hideDialog();
  _gameState = 'field';

  player.mapRow = nr;
  player.mapCol = nc;

  /* 걸음 수 추적 */
  if (player.stats) player.stats.stepsWalked++;

  const ch = getTileChar(nr, nc);
  const locs = getCurrentLocations();
  if (locs[ch]) {
    player.currentLocation = locs[ch].zone;
    player.visitedLocations.add(player.currentLocation);
  } else if (nextZone) {
    player.currentLocation = nextZone;
    player.visitedLocations.add(nextZone);
  }

  UI.updateHeader();
  renderTileMap(player);

  /* 이동 애니메이션 */
  const _pt = document.querySelector('.vtile-player');
  if (_pt) {
    _pt.classList.add('vtile-player-moving');
    setTimeout(() => _pt.classList.remove('vtile-player-moving'), 220);
  }

  /* 거점 도착 → 자동 대화창 표시 */
  if (locs[ch]) {
    const arrArea = AREAS[locs[ch].zone];
    const arrLvl = arrArea?.recommendedLevel;
    const arrTag = (arrLvl > 0) ? ` [Lv.${arrLvl}]` : '';
    UI.showToast(`★ ${locs[ch].name}${arrTag}`);
    // 맵 렌더 직후 대화창이 가려지지 않도록 한 프레임 뒤에 장소 메뉴 열기
    await new Promise(r => requestAnimationFrame(r));
    UI.showDialog();
    await showLocationMenu(player);
    return { ok: true };
  }

  /* 업적 체크 */
  if (typeof AchievementManager !== 'undefined') AchievementManager.check(player);

  /* 스토리릿 체크 */
  if (typeof StoryletManager !== 'undefined') {
    const storylet = StoryletManager.checkAndTrigger(player);
    if (storylet) {
      _gameState = 'dialog';
      const slResult = await StoryletManager.trigger(storylet, player);
      _gameState = 'field';
      if (slResult === 'gameover') return { ok: false, gameover: true };
    }
  }

  /* 인카운터 체크 */
  const zoneMeta = AREAS[nextZone];
  if (!zoneMeta || zoneMeta.encounter_chance <= 0) return { ok: true };
  if (Math.random() >= zoneMeta.encounter_chance) return { ok: true };

  const enemies = zoneMeta.encounter_enemies || [];
  if (enemies.length === 0) return { ok: true };

  /* 적 수 결정 */
  const minE = zoneMeta.minEnemies ?? 1;
  const maxE = zoneMeta.maxEnemies ?? 4;
  let count;
  if (minE === maxE) {
    count = minE;
  } else {
    const range = maxE - minE;
    const weights = [];
    for (let i = 0; i <= range; i++) weights.push(range + 1 - i);
    const total = weights.reduce((a, b) => a + b, 0);
    const roll = Math.random();
    let cum = 0;
    count = minE;
    for (let i = 0; i <= range; i++) {
      cum += weights[i] / total;
      if (roll < cum) { count = minE + i; break; }
    }
  }
  const enemyKeys = [];
  for (let i = 0; i < count; i++) {
    enemyKeys.push(enemies[Math.floor(Math.random() * enemies.length)]);
  }

  /* 전투 돌입 */
  _gameState = 'battle';
  if (count === 1) {
    const name = ENEMY_TABLE[enemyKeys[0]]?.name || '적';
    UI.showDialog();
    UI.addLog(pick([
      `  ${name}이(가) 나타났다!`,
      `  어둠 속에서 ${name}이(가) 모습을 드러냈다!`,
    ]));
  } else {
    UI.showDialog();
    UI.addLog(`  ${count}마리의 적이 나타났다!`);
  }
  await UI.waitForTap();
  UI.hideDialog();
  const result = await CombatSystem.startBattle(player, enemyKeys);
  _gameState = 'field';
  // 전투 후 타일맵 복원
  UI.showScreen('screen-game');
  UI.updateHeader();
  renderTileMap(player);
  if (result === 'lose') return { ok: false, gameover: true };
  return { ok: true };
}


/* ───── 거점 도착 시 장소 메뉴 ───── */

async function showLocationMenu(player) {
  _gameState = 'dialog';
  const posZone = getZoneAt(player.mapRow, player.mapCol) || player.currentLocation;
  const posZoneData = AREAS[posZone] || null;
  const positionalName = (posZoneData && posZoneData.name) || getAreaNameByPos(player.mapRow, player.mapCol);

  UI.clearLog();
  UI.addDivider(positionalName);
  if (posZoneData && posZoneData.desc) UI.addLog(`  ${posZoneData.desc}`);
  UI.showDialog();
  await new Promise(r => requestAnimationFrame(r));
  UI.showDialog();

  const menuLabels = ['지역 탐색', '인벤토리', '메뉴 더보기'];
  const choice = await UI.showChoices(menuLabels);

  if (choice === 'dpad_move') {
    UI.hideDialog();
    _gameState = 'field';
    return;
  }

  if (choice === 0) {
    const result = await EventEngine.runYamlEvent(player, player.currentLocation);
    if (result === 'gameover') {
      await showGameOver(player);
      return;
    }
    if (result && typeof result === 'string' && result.startsWith('clear_')) {
      await showEnding(player, result);
      return;
    }
    UI.updateHeader();
    renderTileMap(player);
    if (result === null || result === undefined) {
      await UI.waitForTap();
    }
  } else if (choice === 1) {
    await UI.showInventory(player);
    UI.showScreen('screen-game');
    renderTileMap(player);
  } else if (choice === 2) {
    const menuResult = await showMoreMenu(player);
    if (menuResult === 'title') {
      return;
    }
    UI.showScreen('screen-game');
    renderTileMap(player);
  }

  UI.hideDialog();
  _gameState = 'field';
}


/* ───── 메뉴 더보기 ───── */

async function showMoreMenu(player) {
  while (true) {
    UI.clearLog();
    UI.addDivider('메뉴 더보기');
    UI.showDialog();
    const choice = await UI.showChoices(['정보 보기', '시스템', '돌아가기']);

    if (choice === 'dpad_move') return 'back';

    if (choice === 0) {
      while (true) {
        UI.clearLog();
        UI.addDivider('정보 보기');
        const infoChoice = await UI.showChoices(['퀘스트', '지도 보기', '상태 확인', '업적', '스킬 트리', '돌아가기']);

        if (infoChoice === 'dpad_move') break;

        if (infoChoice === 0) {
          UI.showQuestLog(buildQuestData(player));
          await UI.waitForTap();
          continue;
        }
        if (infoChoice === 1) {
          const mr = await UI.showMap(player);
          if (mr && mr.quickTravel) {
            UI.showScreen('screen-game');
            UI.updateHeader();
            renderTileMap(player);
            UI.showToast(`★ ${mr.name}(으)로 빠르게 이동했습니다!`);
            return;
          }
          continue;
        }
        if (infoChoice === 2) {
          UI.showStatus(player);
          await UI.waitForTap();
          continue;
        }
        if (infoChoice === 3) {
          UI.showAchievementPanel(player);
          await UI.waitForTap();
          continue;
        }
        if (infoChoice === 4) {
          UI.showSkillTree(player);
          await UI.waitForTap();
          continue;
        }
        break;
      }
      continue;
    }

    if (choice === 1) {
      while (true) {
        UI.clearLog();
        UI.addDivider('시스템');
        const sysChoice = await UI.showChoices(['저장', '타이틀로', '돌아가기']);

        if (sysChoice === 'dpad_move') break;

        if (sysChoice === 0) {
          UI.clearLog();
          UI.addDivider('게임 저장');
          const slotLabels = [];
          for (let i = 0; i < 5; i++) slotLabels.push(`슬롯 ${i + 1}`);
          slotLabels.push('취소');
          const slot = await UI.showChoices(slotLabels);
          if (slot !== 'dpad_move' && slot < 5) {
            GameState.saveToLocal(slot);
            UI.showToast(`슬롯 ${slot + 1}에 저장되었습니다!`);
          }
          continue;
        }

        if (sysChoice === 1) {
          UI.clearLog();
          UI.addLog('  정말 게임을 종료하시겠습니까?');
          const confirmChoice = await UI.showChoices(['계속하기', '종료']);
          if (confirmChoice === 1) {
            UI.showScreen('screen-title');
            return 'title';
          }
          continue;
        }

        break;
      }
      continue;
    }

    return 'back';
  }
}


/* ───── 새 게임 ───── */

async function startNewGame() {
  UI.showScreen('screen-create');

  const nameInput = document.getElementById('input-name');
  if (nameInput) nameInput.value = '';

  let selectedJob = null;
  const jobCards = document.querySelectorAll('.job-card');
  const startBtn = document.getElementById('btn-start-game');

  jobCards.forEach(card => {
    card.classList.remove('selected');
    card.addEventListener('click', () => {
      jobCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedJob = card.dataset.job;
      if (startBtn) startBtn.disabled = false;
    });
  });

  if (startBtn) startBtn.disabled = true;

  await new Promise(resolve => {
    const handler = () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!selectedJob) return;

      startBtn.removeEventListener('click', handler);

      const playerName = name || '용사';
      const stats = CLASSES[selectedJob];
      GameState.player = new Player(playerName, selectedJob, stats.hp, stats.attack, stats.defense);
      GameState.player.currentLocation = 'town';
      GameState.player.visitedLocations.add('town');
      GameState.player.mapId = 'mainland';
      const startPos = findMarkerPosition('T', 'mainland');
      if (startPos) {
        GameState.player.mapRow = startPos.row;
        GameState.player.mapCol = startPos.col;
      }

      resolve();
    };
    if (startBtn) startBtn.addEventListener('click', handler);
  });

  await initStoryFlags();
  await startGameLoop();
}


/* ───── 초기 스토리 플래그 설정 ───── */

async function initStoryFlags() {
  const player = GameState.player;
  const defaults = {
    open_world_initialized: true,
    town_event_done: false,
    forest_cleared: false,
    cave_cleared: false,
    river_cleared: false,
    ruins_cleared: false,
    bandit_camp_cleared: false,
    castle_gate_cleared: false,
    castle_inside_cleared: false,
    harbor_visited: false,
    harbor_tavern_done: false,
    swamp_cleared: false,
    desert_explored: false,
    pyramid_cleared: false,
    oasis_visited: false,
    ice_cave_cleared: false,
    elf_village_visited: false,
    moonlight_lake_visited: false,
    labyrinth_cleared: false,
    mercenary_joined: false,
    dark_tower_cleared: false,
    volcano_cleared: false,
    uw_boneyard_cleared: false,
    uw_crystal_cleared: false,
    uw_lava_lake_cleared: false,
    uw_fortress_cleared: false,
    uw_abyss_cleared: false,
    cel_garden_cleared: false,
    cel_hall_cleared: false,
    cel_arsenal_cleared: false,
    cel_spire_cleared: false,
    cel_throne_cleared: false,
    colosseum_cleared: false,
    temple_cleared: false,
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (!(key in player.storyFlags)) player.storyFlags[key] = val;
  }

  player.inventory.push('소형 포션', '소형 포션');

  // 게임 화면 표시 + 타일맵 렌더링
  UI.showScreen('screen-game');
  UI.updateHeader();
  renderTileMap(player);

  // 시작 대화창
  UI.clearLog();
  UI.addDivider('모험의 시작');
  UI.addLog(`  ${player.name}(${player.job})의 모험이 시작됩니다!`);
  UI.addSystemMsg('  ▶ 장로에게 소형 포션 x2를 받았습니다.');
  UI.showDialog();
  await UI.waitForTap();
  UI.hideDialog();
}


/* ───── 게임 불러오기 ───── */

async function loadGame() {
  const saves = GameState.getSaveList();
  if (saves.length === 0) {
    UI.showScreen('screen-game');
    UI.clearLog();
    UI.addLog('  저장된 게임이 없습니다.');
    UI.showDialog();
    await UI.showChoices(['돌아가기']);
    UI.hideDialog();
    UI.showScreen('screen-title');
    return;
  }

  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('게임 불러오기');
  UI.showDialog();

  const labels = saves.map(s => {
    const date = new Date(s.timestamp).toLocaleString('ko-KR');
    return `${s.name} Lv.${s.level} (${date})`;
  });
  labels.push('취소');

  const choice = await UI.showChoices(labels);
  if (choice >= saves.length) {
    UI.hideDialog();
    UI.showScreen('screen-title');
    return;
  }

  const slot = saves[choice].slot;
  if (GameState.loadFromLocal(slot)) {
    UI.addSystemMsg('  게임을 불러왔습니다!');
    await UI.waitForTap();
    UI.hideDialog();
    await startGameLoop();
  } else {
    UI.addLog('  불러오기에 실패했습니다.');
    await UI.showChoices(['돌아가기']);
    UI.hideDialog();
    UI.showScreen('screen-title');
  }
}


/* ───── 메인 게임 루프 (영웅전설 스타일) ───── */

async function startGameLoop() {
  const player = GameState.player;
  UI.showScreen('screen-game');
  UI.updateHeader();

  if (!player.currentLocation) {
    player.currentLocation = 'town';
    player.visitedLocations.add('town');
  }
  if (!player.mapId) player.mapId = 'mainland';
  if (!Number.isInteger(player.mapRow) || !Number.isInteger(player.mapCol)) {
    const locs = getCurrentLocations();
    const currentMarker = Object.entries(locs).find(([, v]) => v.zone === player.currentLocation)?.[0] || 'T';
    const pos = findMarkerPosition(currentMarker);
    if (pos) {
      player.mapRow = pos.row;
      player.mapCol = pos.col;
    } else {
      const townPos = findMarkerPosition('T', 'mainland');
      player.mapRow = townPos ? townPos.row : 28;
      player.mapCol = townPos ? townPos.col : 36;
    }
  }

  renderTileMap(player);
  _gameState = 'field';

  // 거점 위에 있으면 자동 메뉴 표시 (한 프레임 뒤에 열어 화면이 그려진 뒤 대화창 표시)
  const ch = getTileChar(player.mapRow, player.mapCol);
  const locs = getCurrentLocations();
  if (locs[ch]) {
    await new Promise(r => requestAnimationFrame(r));
    UI.showDialog();
    await showLocationMenu(player);
  }

  // 영웅전설 스타일: 이벤트 기반 (D-pad가 직접 이동 처리)
  // 메인 루프는 없고, D-pad 클릭 이벤트가 모든 것을 처리
  // 플레이어가 거점에 도착하면 showLocationMenu()가 호출됨
}


/* ───── 게임 오버 ───── */

async function showGameOver(player) {
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('GAME OVER');
  UI.addLog('');
  UI.addLog(pick([
    '  당신은 쓰러졌습니다...',
    '  눈앞이 점점 어두워집니다...',
  ]));
  UI.addLog(`  최종 레벨: Lv.${player.level}`);
  UI.addLog(`  마지막 위치: ${AREAS[player.currentLocation]?.name || player.currentLocation}`);
  UI.showDialog();
  await UI.showChoices(['타이틀로 돌아가기']);
  UI.hideDialog();
  UI.showScreen('screen-title');
}


/* ───── 엔딩 ───── */

async function showEnding(player, endingType) {
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('THE END');
  UI.addLog('');

  const endings = {
    clear_hero: '빛의 영웅 엔딩',
    clear_redemption: '구원의 엔딩',
    clear_shadow: '그림자 엔딩',
    clear_dark: '어둠의 왕 엔딩',
    clear_justice: '정의의 심판 엔딩',
  };

  const title = endings[endingType] || '클리어!';
  UI.addLog(`  ★ ${title} ★`);
  UI.addLog('');
  UI.addLog(`  ${player.name} (${player.job}) Lv.${player.level}`);
  UI.addLog(`  어둠 점수: ${player.darkPoints}`);
  UI.addLog('');
  UI.addLog('  축하합니다! 게임을 클리어했습니다!');
  UI.showDialog();
  await UI.showChoices(['타이틀로 돌아가기']);
  UI.hideDialog();
  UI.showScreen('screen-title');
}
