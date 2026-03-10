/* main.js - 메인 진입점 */

document.addEventListener('DOMContentLoaded', () => {
  UI.showScreen('screen-title');

  document.getElementById('btn-new-game').addEventListener('click', startNewGame);
  document.getElementById('btn-load-game').addEventListener('click', loadGame);

  setupQuickMenu();
  setupBackButtons();
});


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

      if (action === 'status') {
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


/* ───── 돌아가기 버튼 ───── */

function setupBackButtons() {
  ['btn-shop-back', 'btn-inv-back', 'btn-status-back'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => UI.showScreen('screen-game'));
  });
}

const TILE_MAP = RAW_MAP.map(row => row.split(''));

function findMarkerPosition(markerChar) {
  for (let r = 0; r < TILE_MAP.length; r++) {
    for (let c = 0; c < TILE_MAP[r].length; c++) {
      if (TILE_MAP[r][c] === markerChar) return { row: r, col: c };
    }
  }
  return null;
}

function getTileChar(row, col) {
  if (row < 0 || row >= TILE_MAP.length) return '#';
  if (col < 0 || col >= TILE_MAP[0].length) return '#';
  return TILE_MAP[row][col];
}

function canMoveTo(row, col) {
  const ch = getTileChar(row, col);
  if (ch in LOCATIONS) return true;
  return !!TERRAIN[ch]?.passable;
}

function getZoneAt(row, col) {
  const ch = getTileChar(row, col);
  if (LOCATIONS[ch]) return LOCATIONS[ch].zone;
  return TERRAIN[ch]?.zone ?? null;
}

function getAreaNameByPos(row, col) {
  const ch = getTileChar(row, col);
  if (LOCATIONS[ch]) return LOCATIONS[ch].name;
  const zone = getZoneAt(row, col);
  return AREAS[zone]?.name || '이동 중';
}

function getMovementFlavorText(row, col, prevZone, nextZone) {
  const ch = getTileChar(row, col);

  if (LOCATIONS[ch]) {
    const location = LOCATIONS[ch];
    const area = AREAS[location.zone];
    return area?.desc || `${location.name}에 도착했다.`;
  }

  if (ch === '=') {
    return '정비된 대로를 따라 차분히 걸음을 옮겼다.';
  }

  if (ch === '.') {
    if (prevZone && AREAS[prevZone]) {
      return `${AREAS[prevZone].name}에서 이어지는 길을 천천히 걸어갔다.`;
    }
    return '한적한 길 위로 발걸음을 옮겼다.';
  }

  if (nextZone && AREAS[nextZone]) {
    return AREAS[nextZone].desc;
  }

  return '조심스럽게 한 걸음 앞으로 나아갔다.';
}

async function tryStepMove(player, dr, dc, label) {
  const nr = player.mapRow + dr;
  const nc = player.mapCol + dc;
  if (!canMoveTo(nr, nc)) {
    UI.addSystemMsg(`  ${label}: 더 이상 갈 수 없습니다.`);
    return { ok: false };
  }

  const curZone = getZoneAt(player.mapRow, player.mapCol);
  const nextZone = getZoneAt(nr, nc);
  if (nextZone && nextZone !== curZone && EventEngine.isZoneLocked(player, nextZone)) {
    UI.addSystemMsg(`  [잠김] ${EventEngine.getLockHint(nextZone)}`);
    return { ok: false };
  }

  player.mapRow = nr;
  player.mapCol = nc;

  const ch = getTileChar(nr, nc);
  if (LOCATIONS[ch]) {
    player.currentLocation = LOCATIONS[ch].zone;
    player.visitedLocations.add(player.currentLocation);
    UI.addSystemMsg(`  ★ ${LOCATIONS[ch].name}에 도착했습니다.`);
  } else if (nextZone) {
    player.currentLocation = nextZone;
    player.visitedLocations.add(nextZone);
  }

  UI.updateHeader();
  UI.addLog(`  ${getMovementFlavorText(nr, nc, curZone, nextZone)}`);
  const zoneMeta = AREAS[nextZone];
  if (!zoneMeta || zoneMeta.encounter_chance <= 0) return { ok: true };
  if (Math.random() >= zoneMeta.encounter_chance) return { ok: true };

  const enemies = zoneMeta.encounter_enemies || [];
  if (enemies.length === 0) return { ok: true };
  const enemyKey = enemies[Math.floor(Math.random() * enemies.length)];
  UI.addLog(`  이동 중 ${ENEMY_TABLE[enemyKey]?.name || '적'}과 조우!`);
  await UI.waitForTap();
  const result = await CombatSystem.startBattle(player, enemyKey);
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
      const startPos = findMarkerPosition('T');
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
  };
  for (const [key, val] of Object.entries(defaults)) {
    if (!(key in player.storyFlags)) player.storyFlags[key] = val;
  }

  player.inventory.push('소형 포션', '소형 포션');
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('모험의 시작');
  UI.addLog('');
  UI.addLog(`  ${player.name}(${player.job})의 모험이 시작됩니다!`);
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
    UI.addSystemMsg('  게임을 불러왔습니다!');
    await UI.waitForTap();
    await startGameLoop();
  } else {
    UI.addLog('  불러오기에 실패했습니다.');
    await UI.showChoices(['돌아가기']);
    UI.showScreen('screen-title');
  }
}


/* ───── 메인 게임 루프 ───── */

async function startGameLoop() {
  const player = GameState.player;
  UI.showScreen('screen-game');
  UI.updateHeader();

  if (!player.currentLocation) {
    player.currentLocation = 'town';
    player.visitedLocations.add('town');
  }
  if (!Number.isInteger(player.mapRow) || !Number.isInteger(player.mapCol)) {
    const currentMarker = Object.entries(LOCATIONS).find(([, v]) => v.zone === player.currentLocation)?.[0] || 'T';
    const pos = findMarkerPosition(currentMarker);
    if (pos) {
      player.mapRow = pos.row;
      player.mapCol = pos.col;
    } else {
      const townPos = findMarkerPosition('T');
      player.mapRow = townPos ? townPos.row : 28;
      player.mapCol = townPos ? townPos.col : 36;
    }
  }

  while (player.isAlive()) {
    UI.showScreen('screen-game');
    UI.clearLog();
    UI.updateHeader();

    const currentArea = AREAS[player.currentLocation];
    const areaName = currentArea ? currentArea.name : player.currentLocation;

    UI.addDivider(`현재 위치: ${areaName}`);
    if (currentArea) UI.addLog(`  ${currentArea.desc}`);
    UI.addLog('');

    const menuLabels = ['지역 탐색', '이동', '인벤토리', '장비 장착', '상태 확인', '저장', '게임 종료'];
    const choice = await UI.showChoices(menuLabels);

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
      await showTravelMenu(player);

    } else if (choice === 2) {
      await UI.showInventory(player);

    } else if (choice === 3) {
      await UI.showEquip(player);

    } else if (choice === 4) {
      UI.showStatus(player);
      await UI.waitForTap();

    } else if (choice === 5) {
      UI.clearLog();
      UI.addDivider('게임 저장');
      const slotLabels = [];
      for (let i = 0; i < 5; i++) slotLabels.push(`슬롯 ${i + 1}`);
      slotLabels.push('취소');
      const slot = await UI.showChoices(slotLabels);
      if (slot < 5) {
        GameState.saveToLocal(slot);
        UI.addSystemMsg(`  슬롯 ${slot + 1}에 저장되었습니다!`);
        await UI.waitForTap();
      }

    } else if (choice === 6) {
      UI.clearLog();
      UI.addLog('  정말 게임을 종료하시겠습니까?');
      const confirmChoice = await UI.showChoices(['계속하기', '종료']);
      if (confirmChoice === 1) {
        UI.showScreen('screen-title');
        return;
      }
    }
  }

  if (!player.isAlive()) {
    await showGameOver(player);
  }
}


/* ───── 이동 메뉴 ───── */

async function showTravelMenu(player) {
  let moving = true;
  while (moving) {
    UI.clearLog();
    UI.addDivider(`이동 모드 - ${getAreaNameByPos(player.mapRow, player.mapCol)}`);
    UI.addLog('');
    UI.addLog('  북/남/동/서로 한 칸씩 이동합니다.');
    UI.addLog('  (지도는 표시하지 않습니다)');

    const choice = await UI.showChoices([
      '↑ 북쪽으로 한 칸',
      '↓ 남쪽으로 한 칸',
      '← 서쪽으로 한 칸',
      '→ 동쪽으로 한 칸',
      '이동 종료',
    ]);

    if (choice === 4) {
      moving = false;
      break;
    }

    const dirMap = [
      { dr: -1, dc: 0, name: '북' },
      { dr: 1, dc: 0, name: '남' },
      { dr: 0, dc: -1, name: '서' },
      { dr: 0, dc: 1, name: '동' },
    ];
    const d = dirMap[choice];
    const stepResult = await tryStepMove(player, d.dr, d.dc, d.name);
    if (stepResult.gameover) {
      await showGameOver(player);
      return;
    }
  }
}


/* ───── 게임 오버 ───── */

async function showGameOver(player) {
  UI.showScreen('screen-game');
  UI.clearLog();
  UI.addDivider('GAME OVER');
  UI.addLog('');
  UI.addLog('  당신은 쓰러졌습니다...');
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
  UI.addLog('  축하합니다! 게임을 클리어했습니다!');
  UI.addLog('');

  await UI.showChoices(['타이틀로 돌아가기']);
  UI.showScreen('screen-title');
}
