// Teluk Arunika core: shared state, launch modes, fixed-step loop.
// Only this file runs anything at load time: its last line calls bootGame.

// Seeded random generator (mulberry32) driving all placement.
let taSeedState = 20261123;
function seededRandom(seed) {
  let s = (seed >>> 0) || 1;
  return function nextSeeded() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Small shared helpers every system file may use.
function taNextRandom() {
  taSeedState = (taSeedState + 0x6D2B79F5) >>> 0;
  let t = taSeedState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function clampNumber(v, lo, hi) {
  if (v < lo) {
    return lo;
  }
  if (v > hi) {
    return hi;
  }
  return v;
}
function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}
function distanceBetween(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) {
    d -= Math.PI * 2;
  }
  while (d < -Math.PI) {
    d += Math.PI * 2;
  }
  return d;
}
function pickFromList(list) {
  return list[Math.floor(taNextRandom() * list.length)];
}

// The two shared objects: GAME is plain serialisable state, WORLD holds
// Three.js handles and live entity lists.
let GAME = null;
let WORLD = null;

// Systems run in this order every fixed step; a missing name is skipped,
// which lets the probe run before every file exists.
const SYSTEM_UPDATE_ORDER = [
  'readKeyboardAndMouse',
  'advanceTimeOfDay',
  'updatePlayerOnFoot',
  'driveVehicleWithArcadePhysics',
  'driveTrafficAlongLanes',
  'updateTrafficLights',
  'walkPedestriansOnSidewalks',
  'updateCarTheftProgress',
  'updatePoliceLineOfSight',
  'runCruiserPursuitTactics',
  'flyHelicopterWithSearchlight',
  'updateSwatBreachAndSniper',
  'updateEnemyCoverAI',
  'updateMissionObjectives',
  'updateBankHeist',
  'updateRaceCheckpoints',
  'updateSideActivities',
  'updateCrewCooldowns',
  'updatePhoneMessages',
  'updateRadioPlayback',
  'updateEffects',
  'updateActiveCamera',
  'drawAllHudPanels',
  'drawMinimap',
];

// Build a fresh game state with every field the HUD reads, so the HUD
// never meets an undefined value.
function createNewGameState() {
  return {
    mode: 'title',
    seed: 20261123,
    time: { day: 1, hour: 6, minute: 0, weather: 'CERAH' },
    money: 250,
    debt: 50000,
    player: {
      x: -270, y: 0, z: 30, heading: 0, health: 100, armour: 0,
      vehicle: -1, weaponSlot: 2, ammo: [
        { mag: 0, reserve: 0 }, { mag: 12, reserve: 96 },
        { mag: 30, reserve: 240 }, { mag: 8, reserve: 48 },
        { mag: 30, reserve: 180 }, { mag: 5, reserve: 30 },
      ],
      aiming: false, sprinting: false, action: 'idle',
    },
    vehicles: [],
    peds: [],
    police: {
      stars: 0, heat: 0, seen: false, incident: 'NONE',
      units: [], roadblocks: [], heli: false, swat: false,
    },
    mission: {
      id: 0, stage: 0, objective: '', next: '', timer: 0,
      counter: 0, counterMax: 0, done: [], branch: 'none',
    },
    crew: {
      recruited: [], cooldowns: { Z: 0, X: 0, C: 0 },
      active: { Z: 0, X: 0, C: 0 },
      chatter: { who: '', text: '', ttl: 0 },
    },
    career: {
      rp: 0, rank: 1, standing: {
        PELABUHAN: 35, 'PASAR SENJA': 55, 'GANG NEON': 40,
        PANTAI: 60, 'TOL LAYANG': 30, 'PULAU ABU': 10,
      },
      stats: {
        distance: 0, carsStolen: 0, contractsDone: 0, racesWon: 0,
        bestPursuit: 0, cashEarned: 0, coinsFound: 0, stunts: 0,
      },
    },
    radio: { station: 0, track: 0, on: true },
    phone: { open: false, tab: 'MESSAGES', messages: [], unread: 0 },
    garage: { cars: [], upgrades: { engine: 0, tyres: false, armour: false, nitro: false, bulletproof: false } },
    shop: { open: false, id: '' },
    ui: {
      prompt: '', promptProgress: 0, banner: '', hint: '',
      dialogue: { who: '', role: '', text: '' },
      wheelOpen: false, cameraMode: 0, waypoint: null, lookYaw: 0,
    },
    settings: {
      master: 0.8, music: 0.7, effects: 0.8, mouse: 1,
      invertY: false, shake: true, quality: 'high',
    },
    tutorial: { seen: [] },
  };
}

// Start a new game: fresh state, player at the workshop, title skipped.
function startNewGame() {
  GAME = createNewGameState();
  GAME.mode = 'playing';
  GAME.player.x = -270;
  GAME.player.z = 30;
  GAME.player.heading = Math.PI / 2;
  if (typeof spawnVehicle === 'function') {
    spawnVehicle('TAKSI KUNING', -262, 30, Math.PI / 2, 'none');
  }
}

// Switch the top-level mode and show or hide the matching screen.
function switchGameMode(nextMode) {
  GAME.mode = nextMode;
  if (nextMode === 'title' && typeof showTitleScreen === 'function') {
    showTitleScreen();
  }
  if (nextMode === 'paused' && typeof showPauseMenu === 'function') {
    showPauseMenu();
  }
  if (nextMode === 'map' && typeof showTabbedMapScreen === 'function') {
    showTabbedMapScreen();
  }
}

// Read the launch mode from the URL query: shot, probe or selftest.
function readLaunchMode() {
  const query = new URLSearchParams(window.location.search);
  if (query.get('selftest') === '1') {
    return { kind: 'selftest' };
  }
  if (query.get('probe') === '1') {
    return { kind: 'probe' };
  }
  const shot = parseInt(query.get('shot') || '0', 10);
  if (shot >= 1 && shot <= 4) {
    return { kind: 'shot', number: shot };
  }
  return { kind: 'normal' };
}

// Run every loaded system once for one fixed step of dt seconds.
// A failing system is logged and skipped so one bug never kills a frame.
function updateAllSystems(dt) {
  for (const name of SYSTEM_UPDATE_ORDER) {
    const fn = window[name];
    if (typeof fn === 'function') {
      try {
        fn(dt);
      } catch (err) {
        console.error('system ' + name + ' failed: ' + err.message);
      }
    }
  }
}

// The fixed-step loop: 60 Hz simulation, one render per animation frame.
let taAccumulator = 0;
let taLastTime = 0;
function runFixedStepLoop(now) {
  if (!taLastTime) {
    taLastTime = now;
  }
  let frameDt = (now - taLastTime) / 1000;
  taLastTime = now;
  if (frameDt > 0.25) {
    frameDt = 0.25;
  }
  taAccumulator += frameDt;
  const step = 1 / 60;
  let guard = 0;
  while (taAccumulator >= step && guard < 5) {
    updateAllSystems(step);
    taAccumulator -= step;
    guard += 1;
  }
  if (typeof renderFrame === 'function') {
    renderFrame();
  }
  requestAnimationFrame(runFixedStepLoop);
}

// Boot the game: renderer, city, input, HUD, then the launch mode.
function bootGame() {
  taSeedState = 20261123;
  GAME = createNewGameState();
  WORLD = {
    scene: null, camera: null, renderer: null, sun: null, hemi: null,
    skyDome: null, colliders: [], lanes: [], sidewalks: [],
    trafficLights: [], meshes: { player: null, vehicles: [], peds: [], units: [] },
    effects: [], hudRoot: null, canvas: null, clouds: [], sea: null,
    lamps: [], rain: null, facadeTextures: {}, letterCache: {},
  };
  WORLD.canvas = document.getElementById('game-canvas');
  WORLD.hudRoot = document.getElementById('hud-root');
  if (typeof createRendererAndSky === 'function') {
    createRendererAndSky();
  }
  if (typeof buildOpenWorldCity === 'function') {
    buildOpenWorldCity();
  }
  if (typeof bindGameKeys === 'function') {
    bindGameKeys();
  }
  if (typeof buildHudPanels === 'function') {
    buildHudPanels();
  }
  const launch = readLaunchMode();
  if (launch.kind === 'selftest') {
    startNewGame();
    if (typeof renderFrame === 'function') {
      renderFrame();
    }
    document.title = 'SHOT READY';
    window.__shotReady = true;
    requestAnimationFrame(runFixedStepLoop);
    return;
  }
  if (launch.kind === 'probe') {
    startNewGame();
    const gt = spawnVehicle('PELABUHAN GT', 0, 360, Math.PI / 2, 'player');
    GAME.player.vehicle = gt;
    if (GAME.vehicles[gt]) {
      GAME.vehicles[gt].speed = 120 / 3.6;
      GAME.vehicles[gt].x = 0;
      GAME.vehicles[gt].z = 360;
      GAME.vehicles[gt].heading = Math.PI / 2;
    }
    GAME.player.x = 0;
    GAME.player.z = 360;
    for (let i = 0; i < 120; i++) {
      updateAllSystems(1 / 60);
      if (GAME.vehicles[gt]) {
        GAME.vehicles[gt].speed = 120 / 3.6;
      }
    }
    for (let i = 0; i < 3; i++) {
      if (typeof renderFrame === 'function') {
        renderFrame();
      }
    }
    document.title = 'SHOT READY';
    window.__shotReady = true;
    return;
  }
  if (launch.kind === 'shot') {
    startNewGame();
    if (typeof stageShowcaseScene === 'function') {
      stageShowcaseScene(launch.number);
    }
    for (let i = 0; i < 3; i++) {
      if (typeof renderFrame === 'function') {
        renderFrame();
      }
    }
    document.title = 'SHOT READY';
    window.__shotReady = true;
    return;
  }
  switchGameMode('title');
  requestAnimationFrame(runFixedStepLoop);
}

bootGame();
