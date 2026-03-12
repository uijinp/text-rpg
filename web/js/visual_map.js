/* visual_map.js — 비주얼 타일맵 & 캐릭터 스프라이트 매핑
 *  - data.js 이후, game.js 이전에 로드
 *  - 이미지 없으면 cssBg + emoji 폴백
 */

const VisualMap = {

  /* ── 타일 문자 → 비주얼 매핑 ── */
  TILE_VISUALS: {
    '#': { img: 'tile_mountain', css: '#3a3a4a', emoji: '🏔' },
    '^': { img: 'tile_mountain', css: '#3a3a4a', emoji: '⛰' },
    'w': { img: 'tile_water',    css: '#1a3a6a', emoji: '🌊' },
    '~': { img: 'tile_water',    css: '#1a3a6a', emoji: '🌊' },
    '*': { img: 'tile_cloud',    css: '#4a4a6a', emoji: '☁' },
    '.': { img: 'tile_grass',    css: '#2a2a20', emoji: '' },
    '=': { img: 'tile_road',     css: '#4a4020', emoji: '' },
    '_': { img: 'tile_road',     css: '#4a4020', emoji: '' },
    'f': { img: 'tile_forest',   css: '#1a4a2a', emoji: '🌲' },
    'e': { img: 'tile_forest',   css: '#1a4a2a', emoji: '🌿' },
    's': { img: 'tile_forest',   css: '#1a4a2a', emoji: '🍂' },
    'n': { img: 'tile_swamp',    css: '#2a3a2a', emoji: '🫧' },
    'r': { img: 'tile_water',    css: '#1a3a6a', emoji: '💧' },
    'u': { img: 'tile_ruins',    css: '#3a2a3a', emoji: '🏚' },
    'b': { img: 'tile_grass',    css: '#2a2a20', emoji: '⛺' },
    'g': { img: 'tile_castle',   css: '#3a2a3a', emoji: '🏰' },
    'i': { img: 'tile_castle',   css: '#2a2020', emoji: '🏰' },
    'c': { img: 'tile_cave',     css: '#2a2020', emoji: '🕳' },
    'q': { img: 'tile_cave',     css: '#2a2020', emoji: '⛏' },
    'd': { img: 'tile_desert',   css: '#5a4a20', emoji: '🏜' },
    'x': { img: 'tile_ice',      css: '#2a4a5a', emoji: '❄' },
    'a': { img: 'tile_water',    css: '#1a3a6a', emoji: '⚓' },
    'm': { img: 'tile_water',    css: '#1a3a6a', emoji: '🌙' },
    'y': { img: 'tile_cave',     css: '#2a2020', emoji: '🌀' },
    'j': { img: 'tile_grass',    css: '#2a2a20', emoji: '⚔' },
    't': { img: 'tile_dark',     css: '#1a1a2a', emoji: '🗼' },
    'v': { img: 'tile_lava',     css: '#5a2010', emoji: '🌋' },
    'z': { img: 'tile_lava',     css: '#5a2010', emoji: '🐉' },
    'p': { img: 'tile_ruins',    css: '#3a2a3a', emoji: '🏟' },
    'o': { img: 'tile_ruins',    css: '#3a2a3a', emoji: '🛕' },
    // 지하세계 숫자 타일
    '1': { img: 'tile_bone',     css: '#3a3020', emoji: '💀' },
    '2': { img: 'tile_crystal',  css: '#2a3a4a', emoji: '💎' },
    '3': { img: 'tile_lava',     css: '#5a2010', emoji: '🔥' },
    '4': { img: 'tile_castle',   css: '#2a2040', emoji: '🏯' },
    '5': { img: 'tile_dark',     css: '#1a0a2a', emoji: '👁' },
    '6': { img: 'tile_bone',     css: '#3a3020', emoji: '🏪' },
    '7': { img: 'tile_celestial',css: '#3a3a5a', emoji: '⛩' },
  },

  /* 천상세계 숫자 타일 오버라이드 */
  CELESTIAL_OVERRIDES: {
    '1': { img: 'tile_celestial', css: '#3a3a5a', emoji: '🌸' },
    '2': { img: 'tile_celestial', css: '#3a3a5a', emoji: '⚖' },
    '3': { img: 'tile_celestial', css: '#3a3a5a', emoji: '🗡' },
    '4': { img: 'tile_celestial', css: '#3a3a5a', emoji: '🔮' },
    '5': { img: 'tile_celestial', css: '#3a3a5a', emoji: '👑' },
    '6': { img: 'tile_celestial', css: '#3a3a5a', emoji: '🏪' },
    '7': { img: 'tile_celestial', css: '#3a3a5a', emoji: '✨' },
  },

  /* 거점 마커 (A-Z) 기본값 */
  _TOWN: { img: 'tile_town', css: '#3a3020', emoji: '🏠' },
  _VOID: { img: null, css: '#0a0a0f', emoji: '' },

  /* 이미지 존재 여부 캐시 */
  _imgCache: {},

  getTileVisual(ch, mapId) {
    if (ch >= 'A' && ch <= 'Z') return this._TOWN;
    if (mapId === 'celestial' && this.CELESTIAL_OVERRIDES[ch]) {
      return this.CELESTIAL_OVERRIDES[ch];
    }
    return this.TILE_VISUALS[ch] || this._VOID;
  },

  /* 이미지 존재 체크 (한 번만) */
  checkImage(src) {
    if (src in this._imgCache) return this._imgCache[src];
    const p = new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this._imgCache[src] = true; resolve(true); };
      img.onerror = () => { this._imgCache[src] = false; resolve(false); };
      img.src = src;
    });
    this._imgCache[src] = p;
    return p;
  },

  /* ── 캐릭터 스프라이트 ── */
  JOB_SPRITES: {
    '전사': { idle: 'char_image/warrior_idle.webp', walk: 'char_image/warrior_walk.webp', emoji: '🧑‍⚔️' },
    '마법사': { idle: 'char_image/mage_idle.webp',    walk: 'char_image/mage_walk.webp',    emoji: '🧙' },
    '도적':  { idle: 'char_image/rogue_idle.webp',   walk: 'char_image/rogue_walk.webp',   emoji: '🥷' },
  },

  getSprite(job, moving) {
    const s = this.JOB_SPRITES[job] || { idle: '', walk: '', emoji: '🧑' };
    return { path: moving ? s.walk : s.idle, emoji: s.emoji };
  },
};
