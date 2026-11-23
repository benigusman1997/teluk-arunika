// The live game state object, new-game defaults, the world runtime and shared helpers.

function createNewGameState() {
  const standing = {};
  for (const d of DISTRICTS) standing[d.id] = 20;
  return {
    mode: 'title', time: 0, frame: 0, playTime: 0, timeScale: 1,
    day: 1, clock: 9 * 60, weather: 'clear',
    money: 250, debt: 50000, health: 100, armour: 0,
    wanted: 0, heat: 0, inSight: false, crimeTimer: 0, incident: '',
    rp: 0, standing: standing,
    stats: { kills: 0, carsStolen: 0, distance: 0, wrecks: 0, escapes: 0, racesWon: 0, fares: 0, exports: 0, busted: 0, wasted: 0, earned: 0, topSpeed: 0, stunts: 0 },
    weaponIndex: 0,
    weapons: WEAPONS.map((w, i) => ({ owned: i < 2, mag: w.mag, reserve: i < 2 ? w.reserve : 0 })),
    wheelOpen: false, fireCooldown: 0, reloading: 0,
    crew: { sari: { recruited: false, cooldown: 0, active: 0 }, budi: { recruited: false, cooldown: 0, active: 0 }, agus: { recruited: false, cooldown: 0, active: 0 } },
    contractsDone: 0, contract: null, branch: null, ending: null,
    player: { x: PLACES.amir.x, z: PLACES.amir.z + 2, y: 0, vy: 0, heading: 0, onFoot: true, car: null, aiming: false, crouch: false, sprinting: false, moving: false, carjack: null, phase: 0, hurt: 0 },
    cameraMode: 'chase', camYaw: 0, camPitch: 0.18,
    hintsDone: {}, coins: COIN_SPOTS.map(() => false), rampsDone: STUNT_RAMPS.map(() => false), bestTimes: {},
    upgrades: { engine: 0, armour: 0, tyres: 0 }, wrecksDone: WRECK_TARGETS.map(() => false),
    activity: null, radioStation: 0, radioOn: true, lastSafehouse: 'amir',
    chatter: null, banner: null, prompt: null, dialogue: null,
    settings: Object.assign({}, DEFAULT_SETTINGS)
  };
}

function createWorldRuntime() {
  return {
    scene: null, camera: null, renderer: null, sun: null, hemi: null, fill: null, sky: null, sunDisc: null, clouds: null,
    sunDir: new THREE.Vector3(-0.8, 0.4, 0.3),
    colliders: [], colliderGrid: new Map(), nodes: [], walkNodes: [], blocks: [],
    cars: [], people: [], units: [], effects: [], markers: [], pickups: [], roadblocks: [], labels: [],
    heli: null, swat: null, trafficLights: { phase: 0, ns: null, ew: null },
    keys: {}, keysHit: {}, mouse: { dx: 0, dy: 0, left: false, right: false, leftHit: false }, locked: false,
    cam: { pos: new THREE.Vector3(0, 30, 80), look: new THREE.Vector3(), shake: 0, snap: true, orbit: 0, pull: 0 },
    playerMesh: null, showcase: 0, ready: false, hudTimer: 0, nextId: 1, rngState: 12345,
    audio: null, mat: {}, tex: {}, rainMesh: null
  };
}

function seedRandom(seed) {
  W.rngState = (seed >>> 0) || 1;
}

function rand() {
  W.rngState = (W.rngState + 0x6D2B79F5) >>> 0;
  let t = W.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randRange(a, b) { return a + (b - a) * rand(); }
function randInt(a, b) { return Math.floor(randRange(a, b + 1)); }
function randPick(list) { return list[Math.floor(rand() * list.length) % list.length]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist2d(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
function angleDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
function formatMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
function formatClock(minutes) { const h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
function formatDuration(seconds) { const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

// Where the player is right now, whether on foot or in a car.
function playerPosition() {
  const p = G.player;
  return p.car ? { x: p.car.x, z: p.car.z, y: p.car.y, heading: p.car.heading, speed: p.car.speed } : { x: p.x, z: p.z, y: p.y, heading: p.heading, speed: p.moving ? (p.sprinting ? 6.5 : 3.2) : 0 };
}

function districtAt(x, z) {
  if (x > 560) return DISTRICTS[5];
  if (z < -252) return DISTRICTS[4];
  if (z > 124) return DISTRICTS[3];
  if (x > 200) return DISTRICTS[0];
  if (x < -100) return DISTRICTS[1];
  return DISTRICTS[2];
}

function streetNameAt(x, z) {
  let best = 'Open ground', bestD = 30;
  ROAD_XS.forEach((rx, i) => { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; best = ROAD_X_NAMES[i]; } });
  ROAD_ZS.forEach((rz, i) => { const d = Math.abs(z - rz); if (d < bestD) { bestD = d; best = ROAD_Z_NAMES[i]; } });
  if (Math.abs(z - FLYOVER.z) < 12 && x > FLYOVER.x0) best = x > LAND.x1 ? 'Jembatan Merah' : 'Tol Layang';
  if (x > 580) best = 'Pulau Abu';
  return best;
}

var G = null;
var W = null;
