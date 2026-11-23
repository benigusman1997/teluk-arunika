// TELUK ARUNIKA: Seven Days of Debt — constants and data tables.
// Everything in the game hangs off one shared namespace object, TA.
var TA = window.TA = { VERSION: '4.0' };

TA.CFG = {
  STEP: 1 / 60,          // fixed simulation step in seconds
  CITY: 450,             // mainland half size in metres
  COAST_Z: 270,          // where the land meets the sea in the south
  BEACH_Z: 222,          // sand starts south of Pantai Boulevard
  ROAD_HW: 8,            // road half width
  WALK_W: 4,             // sidewalk width
  TOL_Z: -330,           // centre line of the elevated highway
  TOL_H: 8,              // deck height
  TOL_X0: -340, TOL_X1: 600,
  ISLAND: { x: 700, z: -330, r: 115 },
  DEBT: 50000,
  MINUTES_PER_SECOND: 1  // one real second is one game minute
};

// Road grid: north-south avenues and east-west streets (left-hand traffic, as in Indonesia).
TA.ROADS_NS = [
  { x: -360, name: 'Jl. Dermaga' }, { x: -240, name: 'Jl. Rempah' }, { x: -120, name: 'Jl. Lentera' },
  { x: 0, name: 'Jl. Merdeka' }, { x: 120, name: 'Jl. Kenanga' }, { x: 240, name: 'Jl. Samudra' }, { x: 360, name: 'Jl. Fajar' }
];
TA.ROADS_EW = [
  { z: -240, name: 'Jl. Layang Bawah' }, { z: -120, name: 'Jl. Neon' }, { z: 0, name: 'Jl. Arunika' },
  { z: 120, name: 'Jl. Senja' }, { z: 210, name: 'Pantai Boulevard' }
];

TA.DISTRICTS = [
  { id: 'pelabuhan', name: 'PELABUHAN', tint: '#5fa8d3', blurb: 'Container port' },
  { id: 'pasar', name: 'PASAR SENJA', tint: '#f2a65a', blurb: 'Dusk market' },
  { id: 'neon', name: 'GANG NEON', tint: '#c77dff', blurb: 'Downtown towers' },
  { id: 'pantai', name: 'PANTAI', tint: '#ffd166', blurb: 'Beach boulevard' },
  { id: 'tol', name: 'TOL LAYANG', tint: '#9aa5b1', blurb: 'Elevated highway' },
  { id: 'abu', name: 'PULAU ABU', tint: '#7d6b63', blurb: 'Ash island' }
];
TA.STANDING_WORDS = ['HUNTED', 'UNKNOWN', 'KNOWN', 'RESPECTED', 'UNTOUCHABLE'];

// Car models. Speeds in metres per second, sizes in metres.
TA.CAR_MODELS = {
  sedan: { name: 'ARUNIKA SEDAN', len: 4.5, wid: 1.9, hgt: 1.45, top: 46, acc: 11, grip: 1.0, hp: 100,
    colors: [0xe9ecef, 0x4ea8de, 0xd62828, 0x2a9d8f, 0x6c757d, 0xf4a261] },
  gt: { name: 'PELABUHAN GT', len: 4.4, wid: 1.95, hgt: 1.2, top: 64, acc: 17, grip: 1.25, hp: 110,
    colors: [0xff6b5e, 0x00b4d8, 0xffd166, 0x9d4edd] },
  taxi: { name: 'TAKSI KUNING', len: 4.5, wid: 1.9, hgt: 1.5, top: 44, acc: 10, grip: 1.0, hp: 100, colors: [0xffc300] },
  hauler: { name: 'BANTENG HAULER', len: 8.2, wid: 2.6, hgt: 3.2, top: 31, acc: 5, grip: 0.8, hp: 260,
    colors: [0xc1121f, 0x386641, 0x1d3557] },
  angkot: { name: 'ANGKOT MINI', len: 4.2, wid: 1.8, hgt: 2.0, top: 34, acc: 7, grip: 0.9, hp: 110,
    colors: [0x06d6a0, 0x118ab2, 0xef476f] },
  komet: { name: 'KOMET', len: 1.9, wid: 0.7, hgt: 1.1, top: 30, acc: 9, grip: 1.1, hp: 45,
    colors: [0xe63946, 0x48cae4, 0xffffff] },
  cruiser: { name: 'TAPD CRUISER', len: 4.7, wid: 1.95, hgt: 1.5, top: 60, acc: 15, grip: 1.2, hp: 130, colors: [0xffffff] },
  swatvan: { name: 'BADAK-2', len: 6.4, wid: 2.4, hgt: 2.7, top: 42, acc: 9, grip: 0.9, hp: 320, colors: [0x14213d] },
  van: { name: 'GETAWAY VAN', len: 5.2, wid: 2.1, hgt: 2.2, top: 40, acc: 8, grip: 0.9, hp: 180, colors: [0x15171a] }
};
TA.TRAFFIC_MIX = ['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'angkot', 'angkot', 'komet', 'komet', 'gt', 'hauler'];

// Six weapon slots. rate = seconds between shots, spread in radians.
TA.WEAPONS = [
  { id: 'fists', name: 'Fists', label: 'FISTS', dmg: 14, rate: 0.42, mag: 0, range: 2.2, spread: 0, pellets: 1, auto: false, price: 0 },
  { id: 'pistol', name: 'P-9', label: 'PISTOL', dmg: 24, rate: 0.26, mag: 12, range: 70, spread: 0.02, pellets: 1, auto: false, price: 400 },
  { id: 'smg', name: 'Cicak', label: 'SMG', dmg: 13, rate: 0.085, mag: 30, range: 60, spread: 0.05, pellets: 1, auto: true, price: 1200 },
  { id: 'shotgun', name: 'Gajah 12', label: 'SHOTGUN', dmg: 15, rate: 0.85, mag: 6, range: 28, spread: 0.12, pellets: 6, auto: false, price: 1800 },
  { id: 'rifle', name: 'AR-Garuda', label: 'RIFLE', dmg: 27, rate: 0.12, mag: 30, range: 110, spread: 0.025, pellets: 1, auto: true, price: 3200 },
  { id: 'sniper', name: 'Pemburu', label: 'SNIPER', dmg: 130, rate: 1.3, mag: 5, range: 240, spread: 0.002, pellets: 1, auto: false, price: 5200 }
];

TA.CREW = [
  { id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'DRIVER', key: 'Z', ability: 'GASPOL', desc: 'Speed burst', cost: 1500, cooldown: 28, duration: 5, color: '#ff8fab' },
  { id: 'budi', name: 'Budi', nick: 'Montir', role: 'MECHANIC', key: 'X', ability: 'QUICK FIX', desc: 'Repair + armour', cost: 2500, cooldown: 45, duration: 0, color: '#ffd166' },
  { id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'HACKER', key: 'C', ability: 'GHOST', desc: 'Drop one star', cost: 4000, cooldown: 60, duration: 0, color: '#72efdd' }
];

TA.RANKS = [
  { n: 1, name: 'DOCK COURIER', rp: 0, perk: 'A way in' },
  { n: 2, name: 'RUNNER', rp: 150, perk: '+10% contract pay' },
  { n: 3, name: 'STREET BOSS', rp: 400, perk: 'Armour refills at safehouses' },
  { n: 4, name: 'HARBOUR KING', rp: 800, perk: 'Cheaper respray and ammo' },
  { n: 5, name: 'LEGEND OF ARUNIKA', rp: 1400, perk: 'Heat fades 25% faster' }
];

TA.RADIO = [
  { id: 'arunika', name: 'ARUNIKA 98.4', show: 'Dangdut Neon', bpm: 132 },
  { id: 'ombak', name: 'OMBAK 101.2', show: 'Island Lo-fi', bpm: 78 },
  { id: 'kota', name: 'KOTA 87.5', show: 'City News', bpm: 96 }
];
TA.NEWS_LINES = [
  'Harbour authority denies any link to Wijaya Logistics.',
  'Ash plume over Pulau Abu: ferries on reduced schedule.',
  'TAPD adds a second air unit after a week of coast chases.',
  'Pasar Senja traders vote to keep the night stalls open.',
  'Bank Arunika calls its new vault "the quietest in the bay".'
];

// Dispatch roles and their pill colours on the dispatch card.
TA.ROLES = {
  'FOOT CHASE': '#4cc9f0', PURSUIT: '#4895ef', RAMMING: '#f94144', PIT: '#f8961e', FLANKING: '#90be6d',
  'BOX-IN': '#f9c74f', BLOCKADE: '#b5179e', SPOTLIGHT: '#ffffff', BREACH: '#e63946', SNIPER: '#9d4edd'
};
TA.CRUISER_NAMES = ['CAMAR 12', 'CAMAR 21', 'CAMAR 33', 'CAMAR 40', 'CAMAR 57', 'CAMAR 68', 'CAMAR 74', 'CAMAR 86'];
TA.INCIDENTS = ['', 'DISTURBANCE', 'RECKLESS DRIVER', 'ARMED SUSPECT', 'ARMED ROBBERY', 'CITY-WIDE MANHUNT'];
TA.STATUS_LINES = ['', 'PATROL ALERTED', 'CRUISERS RESPONDING', 'ROADBLOCKS AHEAD', 'AIR UNIT DEPLOYED', 'ALL UNITS — SHOOT TO STOP'];
TA.POLICE_RADIO = [
  'Dispatch: suspect heading for the boulevard.', 'CAMAR units, box him in.', 'ELANG-1 has visual, lighting him up.',
  'BLOKIR 03 in position, spikes out.', 'BADAK-2 rolling, two minutes.', 'Suspect is the Wijaya courier, teal shirt.'
];

// Named places. Markers sit on a sidewalk or road edge so both a walker and a car can reach them.
TA.PLACES = {
  bank: { x: 60, z: -30, name: 'BANK ARUNIKA', rect: [28, -104, 92, -52] },
  workshop: { x: -180, z: -6, name: "Pak Amir's Workshop", rect: [-204, -36, -156, -14] },
  respray: { x: 157, z: 113, name: 'SEMPROT KILAT Respray', rect: [140, 76, 174, 106] },
  gunshop: { x: -112, z: -40, name: 'KELO ARMS', rect: [-106, -56, -82, -24] },
  safe2: { x: 300, z: 201, name: 'Kos Pantai Safehouse', rect: [284, 172, 316, 196] },
  safe3: { x: 130, z: -158, name: 'Loteng Neon Safehouse', rect: [134, -176, 160, -140] },
  dock: { x: -300, z: 263, name: 'Dermaga 4 Export Dock' },
  market: { x: -240, z: -60, name: 'Pasar Senja Gate' },
  islandDepot: { x: 660, z: -300, name: 'Ash Island Depot' },
  ledger: { x: -374, z: 62, name: 'Wijaya Logistics Office', rect: [-440, 40, -384, 84] }
};
TA.SAFEHOUSES = ['workshop', 'safe2', 'safe3'];

TA.RACES = [
  { name: 'Boulevard Sprint', start: [300, 210], cps: [[120, 210], [-120, 210], [-120, 120], [120, 120], [300, 120], [360, 210]] },
  { name: 'Neon Circuit', start: [0, -60], cps: [[0, -120], [120, -120], [240, -120], [240, 0], [120, 0], [0, 0]] },
  { name: 'Harbour Run', start: [-360, -180], cps: [[-360, 0], [-360, 120], [-240, 210], [-120, 120], [-240, 0], [-360, -120]] }
];
TA.COINS = [[60, -40], [-180, -60], [-300, 180], [200, 240], [-60, 60], [330, -60], [-300, -200], [60, 170], [180, -300], [-420, -100], [690, -280], [420, 60]];
TA.RAMPS = [[-60, 212, 1.5708], [300, 2, -1.5708], [-362, 60, 0], [180, 246, 1.5708], [2, -180, 3.1416]];
TA.WRECK_TARGETS = [
  { name: 'Bimo "Knalpot"', model: 'gt', pay: 1800 }, { name: 'Tante Rina', model: 'sedan', pay: 1400 }, { name: 'Si Kembar', model: 'angkot', pay: 2200 }
];

// ---- small shared helpers -------------------------------------------------
TA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
TA.lerp = function (a, b, t) { return a + (b - a) * t; };
TA.dist = function (ax, az, bx, bz) { var dx = bx - ax, dz = bz - az; return Math.sqrt(dx * dx + dz * dz); };
TA.wrapAngle = function (a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// Heading convention: forward = (sin h, cos h) in (x, z); a mesh with rotation.y = h faces that way.
TA.headingTo = function (dx, dz) { return Math.atan2(dx, dz); };
TA.turnToward = function (cur, target, maxStep) {
  var d = TA.wrapAngle(target - cur);
  return cur + TA.clamp(d, -maxStep, maxStep);
};
TA.fmtMoney = function (n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
TA.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

// Seeded pseudo-random generator (mulberry32) — drives all placement so every run is reproducible.
TA.makeRng = function (seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
TA.seedRandom = function (seed) { TA.rand = TA.makeRng(seed); };
TA.seedRandom(1977);
TA.rr = function (a, b) { return a + (b - a) * TA.rand(); };
TA.ri = function (a, b) { return Math.floor(TA.rr(a, b + 1)); };
TA.pick = function (arr) { return arr[Math.floor(TA.rand() * arr.length) % arr.length]; };
