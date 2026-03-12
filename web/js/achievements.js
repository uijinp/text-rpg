/* achievements.js - 업적 시스템 */

const ACHIEVEMENTS = [
  /* ── 전투 ── */
  { id: 'first_blood', name: '첫 번째 승리', icon: '⚔️', desc: '첫 전투에서 승리하다', category: '전투',
    check: p => p.stats.battlesWon >= 1, reward: { gold: 20 } },
  { id: 'hunter_10', name: '사냥꾼', icon: '🗡️', desc: '몬스터 10마리 처치', category: '전투',
    check: p => p.stats.monstersKilled >= 10, reward: { gold: 50 } },
  { id: 'hunter_50', name: '전투의 달인', icon: '⚔️', desc: '몬스터 50마리 처치', category: '전투',
    check: p => p.stats.monstersKilled >= 50, reward: { gold: 150, stat: { attack: 2 } } },
  { id: 'hunter_100', name: '전설의 사냥꾼', icon: '🏆', desc: '몬스터 100마리 처치', category: '전투',
    check: p => p.stats.monstersKilled >= 100, reward: { gold: 300, stat: { attack: 3, defense: 2 } } },
  { id: 'critical_50', name: '급소 달인', icon: '💥', desc: '치명타 50회 달성', category: '전투',
    check: p => p.stats.criticalHits >= 50, reward: { gold: 100 } },
  { id: 'battles_won_30', name: '백전노장', icon: '🛡️', desc: '30번 전투 승리', category: '전투',
    check: p => p.stats.battlesWon >= 30, reward: { gold: 100, stat: { defense: 1 } } },
  { id: 'dmg_1000', name: '파괴자', icon: '💪', desc: '누적 데미지 1000 달성', category: '전투',
    check: p => p.stats.totalDamageDealt >= 1000, reward: { gold: 80 } },
  { id: 'dmg_5000', name: '재앙의 화신', icon: '🔥', desc: '누적 데미지 5000 달성', category: '전투',
    check: p => p.stats.totalDamageDealt >= 5000, reward: { stat: { attack: 3 } } },
  /* 보스 */
  { id: 'boss_forest', name: '숲의 해방자', icon: '🌲', desc: '어두운 숲 보스 처치', category: '전투',
    check: p => !!p.storyFlags.forest_cleared, reward: { gold: 50 } },
  { id: 'boss_bandit', name: '산적 소탕', icon: '⚔️', desc: '산적 야영지 보스 처치', category: '전투',
    check: p => !!p.storyFlags.bandit_camp_cleared, reward: { gold: 80 } },
  { id: 'boss_lazarus', name: '어둠의 정복자', icon: '👑', desc: '라자러스 처치', category: '전투',
    check: p => !!p.storyFlags.lazarus_defeated, reward: { gold: 500, stat: { attack: 5, defense: 3, max_hp: 30 } } },

  /* ── 탐험 ── */
  { id: 'explorer_5', name: '초보 탐험가', icon: '🗺️', desc: '5개 지역 방문', category: '탐험',
    check: p => p.visitedLocations.size >= 5, reward: { gold: 30 } },
  { id: 'explorer_10', name: '숙련 탐험가', icon: '🧭', desc: '10개 지역 방문', category: '탐험',
    check: p => p.visitedLocations.size >= 10, reward: { gold: 80 } },
  { id: 'explorer_20', name: '세계의 방랑자', icon: '🌍', desc: '20개 지역 방문', category: '탐험',
    check: p => p.visitedLocations.size >= 20, reward: { gold: 200, stat: { max_hp: 20 } } },
  { id: 'walker_1000', name: '끈기의 발걸음', icon: '👣', desc: '1000걸음 이동', category: '탐험',
    check: p => p.stats.stepsWalked >= 1000, reward: { gold: 50 } },
  { id: 'walker_5000', name: '대지의 정복자', icon: '🏔️', desc: '5000걸음 이동', category: '탐험',
    check: p => p.stats.stepsWalked >= 5000, reward: { gold: 200, stat: { max_hp: 15 } } },

  /* ── 수집 ── */
  { id: 'rich_500', name: '소시민', icon: '💰', desc: '총 500G 획득', category: '수집',
    check: p => p.stats.totalGoldEarned >= 500, reward: { gold: 30 } },
  { id: 'rich_2000', name: '부호', icon: '💎', desc: '총 2000G 획득', category: '수집',
    check: p => p.stats.totalGoldEarned >= 2000, reward: { gold: 100 } },
  { id: 'rich_10000', name: '황금왕', icon: '👑', desc: '총 10000G 획득', category: '수집',
    check: p => p.stats.totalGoldEarned >= 10000, reward: { gold: 500, stat: { defense: 2 } } },
  { id: 'collector_10', name: '수집가', icon: '🎒', desc: '아이템 10개 수집', category: '수집',
    check: p => p.stats.itemsCollected >= 10, reward: { gold: 40 } },
  { id: 'collector_30', name: '보물 사냥꾼', icon: '💎', desc: '아이템 30개 수집', category: '수집',
    check: p => p.stats.itemsCollected >= 30, reward: { gold: 100 } },
  { id: 'potion_10', name: '약사', icon: '🧪', desc: '포션 10개 사용', category: '수집',
    check: p => p.stats.potionsUsed >= 10, reward: { gold: 30 } },

  /* ── 성장 ── */
  { id: 'level_5', name: '성장의 시작', icon: '⭐', desc: 'Lv.5 달성', category: '성장',
    check: p => p.level >= 5, reward: { gold: 50 } },
  { id: 'level_10', name: '숙련자', icon: '🌟', desc: 'Lv.10 달성', category: '성장',
    check: p => p.level >= 10, reward: { gold: 150, stat: { attack: 2, defense: 1 } } },
  { id: 'level_15', name: '영웅의 자질', icon: '✨', desc: 'Lv.15 달성', category: '성장',
    check: p => p.level >= 15, reward: { gold: 300, stat: { attack: 3, defense: 2, max_hp: 20 } } },
  { id: 'level_20', name: '전설의 영웅', icon: '🏆', desc: 'Lv.20 달성', category: '성장',
    check: p => p.level >= 20, reward: { gold: 500, stat: { attack: 5, defense: 3, max_hp: 50 } } },
];

const AchievementManager = {
  check(player) {
    if (!player || !player.stats) return [];
    const newlyUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (player.unlockedAchievements.includes(ach.id)) continue;
      try {
        if (ach.check(player)) {
          player.unlockedAchievements.push(ach.id);
          this._giveReward(player, ach);
          newlyUnlocked.push(ach);
          UI.showToast(`🏆 업적 달성: ${ach.name}`, 'toast-achievement');
        }
      } catch (e) { /* skip */ }
    }
    return newlyUnlocked;
  },

  _giveReward(player, ach) {
    const r = ach.reward;
    if (!r) return;
    if (r.gold) player.gold += r.gold;
    if (r.item) player.inventory.push(r.item);
    if (r.stat) {
      if (r.stat.attack) player.attack += r.stat.attack;
      if (r.stat.defense) player.defense += r.stat.defense;
      if (r.stat.max_hp) { player.maxHp += r.stat.max_hp; player.hp += r.stat.max_hp; }
    }
  },

  getProgress(player) {
    return { total: ACHIEVEMENTS.length, unlocked: player.unlockedAchievements.length };
  },
};
