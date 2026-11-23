// game-state.js — the live state object, new-game defaults and the seeded random source.
var TA = window.TA || (window.TA = {});
function createNewGameState() {
  return {
    mode: 'title', time: 0, clock: 17.2, day: 1, dayT: 0, money: 250, debtPaid: 0,
    hp: 100, armor: 0, wanted: 0, heat: 0, seenT: 0, searching: false,
    weapon: 1, ammo: [Infinity, 60, 0, 0, 0, 0], owned: [true, true, false, false, false, false], fireT: 0,
    contract: 0, stage: -1, done: [], kills: 0, ending: null,
    rankPts: 0, standing: { pelabuhan: 0, pasar: 0, neon: 0, pantai: 0, tol: 0, pulau: 0 },
    crew: [], cooldown: { sari: 0, bima: 0, tono: 0 },
    stats: { stolen: 0, busted: 0, wasted: 0, km: 0, coins: 0, races: 0, fares: 0, wrecks: 0 },
    camMode: 0, station: 1, activity: null, hints: {}, prompt: '', subtitle: '', subT: 0,
    settings: { volume: 0.6, sens: 1, shadows: true, invertY: false }
  };
}
function seededRandom(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function resetRandomSeed(seed) { TA.rnd = seededRandom(seed || 20261123); }
TA.createNewGameState = createNewGameState;
TA.resetRandomSeed = resetRandomSeed;
TA.pick = function (a) { return a[Math.floor(TA.rnd() * a.length) % a.length]; };
TA.dist = function (a, b) { return Math.hypot(a.x - b.x, a.z - b.z); };
TA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
TA.angDiff = function (a, b) { var d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
