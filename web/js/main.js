/* main.js - 메인 진입점 */

document.addEventListener('DOMContentLoaded', () => {
  UI.showScreen('screen-title');

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-load-game').addEventListener('click', loadGame);

  setupQuickMenu();
  setupBackButtons();
  setupDPad();
  setupDPadMap();
  setupMiniMapToggle();
});

function pick(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return '';
  return lines[Math.floor(Math.random() * lines.length)];
}

let miniMapEnabled = localStorage.getItem('mini_map_enabled') !== '0';

function setupMiniMapToggle() {
  const btn = document.getElementById('btn-minimap-toggle');
  if (!btn) return;

  const applyVisual = () => {
    btn.style.borderColor = miniMapEnabled ? 'rgba(212, 160, 23, 0.55)' : '';
    btn.style.color = miniMapEnabled ? '#f0c040' : '';
  };
  applyVisual();

  btn.addEventListener('click', () => {
    miniMapEnabled = !miniMapEnabled;
    localStorage.setItem('mini_map_enabled', miniMapEnabled ? '1' : '0');
    applyVisual();
    updateMiniMap(GameState.player);
  });
}

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
      // 메뉴 대기 중 등 조작 불가능한 상태면 무시
      if (!GameState.player || !GameState.player.isAlive()) return;
      // UI.showChoices 상태이거나 다른 팝업창이 떠있을 때는 방어 처리(선택적)
      if (document.getElementById('quick-menu') && !document.getElementById('quick-menu').classList.contains('hidden')) return;

      const stepResult = await tryStepMove(GameState.player, d.dr, d.dc, d.name);

      // 전투 조우 등 게임 루프 중단/재개가 필요한 상황이므로 
      // 화면 갱신 리로드를 유도해야 함. (단, 현재 startGameLoop 무한 루프 대기 상태와 중첩될 수 있으므로 분기 필요)
      if (stepResult.gameover) {
        await showGameOver(GameState.player);
      } else {
        // 이동 성공 시 현재 선택지를 닫고 새 루프를 트리거하거나 UI를 다시 그립니다.
        // 현재 showChoices 대기 상태를 강제로 취소(resolve 0 등)할 필요가 있습니다.
        if (UI._choiceResolve) {
          // hack: 강제로 '이동을 통해 화면 갱신' 용도의 특수 반환값 전달
          // hideChoices()가 _choiceResolve를 null로 만들기 때문에
          // resolver를 먼저 보관한 뒤 호출해야 루프가 정상 재개된다.
          const resolveChoice = UI._choiceResolve;
          UI.hideChoices();
          resolveChoice('dpad_move');
        }
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
    await UI.showMap(GameState.player);
  });
}

/* ───── 퀵 메뉴 설정 ───── */

function setupQuickMenu() {
  const menuBtn = document.getElementById('btn-menu');
  const overlay = document.getElementById('quick-menu');
  if (!menuBtn || !overlay) return;

  menuBtn.addEventListener('click', () => overlay.classList.remove('hidden'));

  overlay.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      overlay.classList.add('hidden');

      if (action === 'close') return;
      if (!GameState.player) return;

      if (action === 'map') {
        await UI.showMap(GameState.player);
      } else if (action === 'quest') {
        UI.showQuestLog(buildQuestData(GameState.player));
        await UI.waitForTap();
      } else if (action === 'status') {
        UI.showStatus(GameState.player);
        await UI.waitForTap();
      } else if (action === 'inventory') {
        await UI.showInventory(GameState.player);
      } else if (action === 'save') {
        UI.clearLog();
        UI.addDivider('게임 저장');
        const labels = [];
        for (let i = 0; i < 5; i++) labels.push(`슬롯 ${i + 1}`);
        labels.push('취소');
        const slot = await UI.showChoices(labels);
        if (slot < 5) {
          GameState.saveToLocal(slot);
          UI.addSystemMsg(`  슬롯 ${slot + 1}에 저장되었습니다!`);
          await UI.waitForTap();
        }
      } else if (action === 'title') {
        UI.showScreen('screen-title');
      }
    });
  });
}

function buildQuestData(player) {
  const flags = player.storyFlags || {};
  const main = [];
  const side = [];
  const hints = [];

  // 메인 진행 퀘스트
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

  // 서브/생활 퀘스트
  if (flags.blacksmith_quest && !flags.rescued_kai) {
    side.push("대장장이 브론의 아들 '카이'를 찾아 구출한다.");
  }
  if (!flags.child_done) {
    side.push('아르카디아 골목의 어린아이 부탁을 확인한다.');
  }
  if (!flags.desert_explored && flags.forest_cleared) {
    side.push('사하르 마을을 탐색해 사막 라인을 개척한다.');
  }

  // 잠긴 지역 힌트 (최대 5개)
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
    if (btn) btn.addEventListener('click', () => UI.showScreen('screen-game'));
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
    if (mid === 'underworld') return '어두운 지하 통로를 따라 조심스럽게 나아갔다.';
    if (mid === 'celestial') return '황금빛 구름 위의 길을 따라 걸어갔다.';
    return '정비된 대로를 따라 차분히 걸음을 옮겼다.';
  }

  if (ch === '.') {
    if (prevZone && AREAS[prevZone]) {
      return `${AREAS[prevZone].name}에서 이어지는 길을 천천히 걸어갔다.`;
    }
    const mid = getCurrentMapId();
    if (mid === 'underworld') return '어둠 속에서 한 발짝 앞으로 나아갔다.';
    if (mid === 'celestial') return '눈부신 구름 위에서 한 걸음 앞으로 나아갔다.';
    return '한적한 길 위로 발걸음을 옮겼다.';
  }

  if (nextZone && AREAS[nextZone]) {
    return AREAS[nextZone].desc;
  }

  return '조심스럽게 한 걸음 앞으로 나아갔다.';
}

function buildMiniMapLines(player, radius = 5) {
  const tileMap = getCurrentTileMap();
  const locs = getCurrentLocations();
  const lines = [];
  const startR = Math.max(0, player.mapRow - radius);
  const endR = Math.min(tileMap.length - 1, player.mapRow + radius);
  const startC = Math.max(0, player.mapCol - radius);
  const endC = Math.min(tileMap[0].length - 1, player.mapCol + radius);

  for (let r = startR; r <= endR; r++) {
    let line = '';
    for (let c = startC; c <= endC; c++) {
      if (r === player.mapRow && c === player.mapCol) {
        line += '@';
        continue;
      }
      const ch = tileMap[r][c];
      if (locs[ch]) line += '★';
      else if (ch === '#' || ch === '^' || ch === '~' || ch === '*') line += '■';
      else if (ch === 'w') line += '≈';
      else if (ch === '=' || ch === '_' || ch === '.') line += '·';
      else line += '□';
    }
    lines.push(line);
  }
  return lines;
}

function updateMiniMap(player) {
  const widget = document.getElementById('minimap-widget');
  const grid = document.getElementById('minimap-grid');
  const caption = document.getElementById('minimap-caption');
  if (!widget || !grid || !caption) return;

  if (!miniMapEnabled || !player || !Number.isInteger(player.mapRow) || !Number.isInteger(player.mapCol)) {
    widget.classList.add('hidden');
    return;
  }

  widget.classList.remove('hidden');
  grid.textContent = buildMiniMapLines(player, 5).join('\n');
  caption.textContent = `${getAreaNameByPos(player.mapRow, player.mapCol)} (${player.mapRow}, ${player.mapCol})`;
}

async function tryStepMove(player, dr, dc, label) {
  const prevRow = player.mapRow;
  const prevCol = player.mapCol;
  const prevAreaName = getAreaNameByPos(prevRow, prevCol);
  const nr = player.mapRow + dr;
  const nc = player.mapCol + dc;
  if (!canMoveTo(nr, nc)) {
    UI.addSystemMsg(pick([
      `  ${label} 이동 실패: 더 이상 갈 수 없습니다. (현재: ${prevAreaName})`,
      `  ${label} 이동 실패: ${label}쪽 길은 막혀 있습니다. (현재: ${prevAreaName})`,
      `  ${label} 이동 실패: ${label} 방향으로는 진행할 수 없습니다. (현재: ${prevAreaName})`,
    ]));
    return { ok: false };
  }

  const curZone = getZoneAt(player.mapRow, player.mapCol);
  const nextZone = getZoneAt(nr, nc);
  if (nextZone && nextZone !== curZone && EventEngine.isZoneLocked(player, nextZone)) {
    UI.addSystemMsg(pick([
      `  ${label} 이동 실패: [잠김] ${EventEngine.getLockHint(nextZone)}`,
      `  ${label} 이동 실패: 길을 막는 기운이 느껴집니다. ${EventEngine.getLockHint(nextZone)}`,
    ]));
    return { ok: false };
  }

  player.mapRow = nr;
  player.mapCol = nc;

  const ch = getTileChar(nr, nc);
  const locs = getCurrentLocations();
  if (locs[ch]) {
    player.currentLocation = locs[ch].zone;
    player.visitedLocations.add(player.currentLocation);
    UI.addSystemMsg(pick([
      `  ★ ${locs[ch].name}에 도착했습니다.`,
      `  ★ ${locs[ch].name}의 경계에 발을 들였습니다.`,
      `  ★ 목적지 도착: ${locs[ch].name}`,
    ]));
  } else if (nextZone) {
    player.currentLocation = nextZone;
    player.visitedLocations.add(nextZone);
  }

  const nextAreaName = getAreaNameByPos(player.mapRow, player.mapCol);
  if (prevAreaName === nextAreaName) {
    UI.addSystemMsg(`  ${label}으로 한 칸 이동했습니다. (${nextAreaName} 내부)`);
  } else {
    UI.addSystemMsg(`  ${label}으로 한 칸 이동했습니다. (${prevAreaName} → ${nextAreaName})`);
  }
  UI.addLog(`  위치: [${prevRow}, ${prevCol}] → [${nr}, ${nc}]`);

  UI.updateHeader();
  updateMiniMap(player);
  UI.addLog(`  ${getMovementFlavorText(nr, nc, curZone, nextZone)}`);
  const zoneMeta = AREAS[nextZone];
  if (!zoneMeta || zoneMeta.encounter_chance <= 0) return { ok: true };
  if (Math.random() >= zoneMeta.encounter_chance) return { ok: true };

  const enemies = zoneMeta.encounter_enemies || [];
  if (enemies.length === 0) return { ok: true };

  /* 1~4마리 랜덤 생성 (가중치: 1마리 40%, 2마리 30%, 3마리 20%, 4마리 10%) */
  const roll = Math.random();
  const count = roll < 0.4 ? 1 : roll < 0.7 ? 2 : roll < 0.9 ? 3 : 4;
  const enemyKeys = [];
  for (let i = 0; i < count; i++) {
    enemyKeys.push(enemies[Math.floor(Math.random() * enemies.length)]);
  }

  if (count === 1) {
    const name = ENEMY_TABLE[enemyKeys[0]]?.name || '적';
    UI.addLog(pick([
      `  이동 중 ${name}과 조우!`,
      `  어둠 속에서 ${name}이(가) 모습을 드러냈다!`,
      `  길목을 막아선 것은 ${name}이었다!`,
    ]));
  } else {
    UI.addLog(`  ${count}마리의 적이 나타났다!`);
  }
  await UI.waitForTap();
  const result = await CombatSystem.startBattle(player, enemyKeys);
  if (result === 'lose') return { ok: false, gameover: true };
  return { ok: true };
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
    // 지하 세계
    uw_boneyard_cleared: false,
    uw_crystal_cleared: false,
    uw_lava_lake_cleared: false,
    uw_fortress_cleared: false,
    uw_abyss_cleared: false,
    // 천상 세계
    cel_garden_cleared: false,
    cel_hall_cleared: false,
    cel_arsenal_cleared: false,
    cel_spire_cleared: false,
    cel_throne_cleared: false,
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (!(key in player.storyFlags)) player.storyFlags[key] = val;
  }

  player.inventory.push('소형 포션', '소형 포션');
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('모험의 시작');
  UI.addLog('');
  UI.addLog(pick([
    `  ${player.name}(${player.job})의 모험이 시작됩니다!`,
    `  ${player.name}, 이제 운명의 여정이 시작됩니다.`,
    `  낯선 바람과 함께 ${player.name}의 발걸음이 움직입니다.`,
  ]));
  UI.addSystemMsg('  ▶ 장로에게 소형 포션 x2를 받았습니다.');
  UI.addLog('');
  await UI.waitForTap();
}


/* ───── 게임 불러오기 ───── */

async function loadGame() {
  const saves = GameState.getSaveList();
  if (saves.length === 0) {
    UI.showScreen('screen-game');
    UI.clearLog();
    UI.addLog('  저장된 게임이 없습니다.');
    await UI.showChoices(['돌아가기']);
    UI.showScreen('screen-title');
    return;
  }

  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('게임 불러오기');

  const labels = saves.map(s => {
    const date = new Date(s.timestamp).toLocaleString('ko-KR');
    return `${s.name} Lv.${s.level} (${date})`;
  });
  labels.push('취소');

  const choice = await UI.showChoices(labels);
  if (choice >= saves.length) {
    UI.showScreen('screen-title');
    return;
  }

  const slot = saves[choice].slot;
  if (GameState.loadFromLocal(slot)) {
    UI.addSystemMsg(pick([
      '  게임을 불러왔습니다!',
      '  저장된 여정을 이어갑니다.',
      '  기억이 되살아났습니다. 모험을 계속합니다.',
    ]));
    await UI.waitForTap();
    await startGameLoop();
  } else {
    UI.addLog('  불러오기에 실패했습니다.');
    await UI.showChoices(['돌아가기']);
    UI.showScreen('screen-title');
  }
}

async function showMoreMenu(player) {
  while (true) {
    UI.clearLog();
    UI.addDivider('메뉴 더보기');
    const choice = await UI.showChoices(['정보 보기', '시스템', '돌아가기']);

    if (choice === 0) {
      while (true) {
        UI.clearLog();
        UI.addDivider('정보 보기');
        const infoChoice = await UI.showChoices(['퀘스트', '지도 보기', '상태 확인', '돌아가기']);

        if (infoChoice === 0) {
          UI.showQuestLog(buildQuestData(player));
          await UI.waitForTap();
          continue;
        }
        if (infoChoice === 1) {
          await UI.showMap(player);
          continue;
        }
        if (infoChoice === 2) {
          UI.showStatus(player);
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

        if (sysChoice === 0) {
          UI.clearLog();
          UI.addDivider('게임 저장');
          const slotLabels = [];
          for (let i = 0; i < 5; i++) slotLabels.push(`슬롯 ${i + 1}`);
          slotLabels.push('취소');
          const slot = await UI.showChoices(slotLabels);
          if (slot < 5) {
            GameState.saveToLocal(slot);
            UI.addSystemMsg(pick([
              `  슬롯 ${slot + 1}에 저장되었습니다!`,
              `  여정의 기록이 슬롯 ${slot + 1}에 각인되었습니다.`,
              `  저장 완료. 언제든 이 순간으로 돌아올 수 있습니다. (슬롯 ${slot + 1})`,
            ]));
            await UI.waitForTap();
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


/* ───── 메인 게임 루프 ───── */

async function startGameLoop() {
  const player = GameState.player;
  UI.showScreen('screen-game');
  UI.updateHeader();
  updateMiniMap(player);

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

  while (player.isAlive()) {
    UI.showScreen('screen-game');
    UI.clearLog();
    UI.updateHeader();
    updateMiniMap(player);

    const currentArea = AREAS[player.currentLocation];
    const areaName = currentArea ? currentArea.name : player.currentLocation;

    UI.addDivider(`현재 위치: ${areaName}`);
    if (currentArea) UI.addLog(`  ${currentArea.desc}`);
    UI.addLog('');

    // D-pad 컨테이너 보이기
    const dpad = document.getElementById('dpad-container');
    if (dpad) dpad.classList.remove('hidden');

    const menuLabels = ['지역 탐색', '인벤토리', '메뉴 더보기'];
    const choice = await UI.showChoices(menuLabels);

    // D-pad로 강제 이동 시그널이 온 경우 (루프 재시작)
    if (choice === 'dpad_move') {
      if (dpad) dpad.classList.add('hidden');
      if (!player.isAlive()) return;
      continue;
    }

    // 메뉴가 선택되었으므로 D-pad 감추기
    if (dpad) dpad.classList.add('hidden');

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
      if (result === null || result === undefined) {
        await UI.waitForTap();
      }

    } else if (choice === 1) {
      await UI.showInventory(player);

    } else if (choice === 2) {
      const menuResult = await showMoreMenu(player);
      if (menuResult === 'title') {
        return;
      }
    }
  }

  if (!player.isAlive()) {
    await showGameOver(player);
  }
}


/* ───── 삭제된 목록형 이동 ───── */


/* ───── 게임 오버 ───── */

async function showGameOver(player) {
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('GAME OVER');
  UI.addLog('');
  UI.addLog(pick([
    '  당신은 쓰러졌습니다...',
    '  눈앞이 점점 어두워집니다...',
    '  마지막 일격이 몸을 꿰뚫었습니다...',
  ]));
  UI.addLog(`  최종 레벨: Lv.${player.level}`);
  UI.addLog(`  마지막 위치: ${AREAS[player.currentLocation]?.name || player.currentLocation}`);
  UI.addLog('');
  await UI.showChoices(['타이틀로 돌아가기']);
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
  UI.addLog(pick([
    '  축하합니다! 게임을 클리어했습니다!',
    '  긴 여정 끝에 마침내 결말에 도달했습니다!',
    '  전설은 이제 당신의 이름을 기억할 것입니다.',
  ]));
  UI.addLog('');

  await UI.showChoices(['타이틀로 돌아가기']);
  UI.showScreen('screen-title');
}
