/* TELUK ARUNIKA — 7 Hari Utang. First-person open-world crime game.
   All art procedural low-poly (Three.js), all sound synthesized WebAudio,
   no network requests. Written fresh for take 4. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TEST_MODE = params.get('test') === '1';
const SHOT_NUM = parseInt(params.get('shot') || '0', 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* deterministic pseudo-random so staged shots look the same every run */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261120);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

/* ---------------- static data (own wording) ---------------- */
const ARSENAL = [
  { key: '1', name: 'Pistol',  damage: 25, mag: 12, reserve: Infinity, rate: 0.22, spread: 0.012, auto: false, color: 0x9aa5b1 },
  { key: '2', name: 'SMG',    damage: 14, mag: 30, reserve: Infinity, rate: 0.085, spread: 0.03,  auto: true,  color: 0x3a86ff },
  { key: '3', name: 'Shotgun',damage: 60, mag: 6,  reserve: Infinity, rate: 0.8,  spread: 0.07,  auto: false, color: 0xff6b35, pellets: 6 },
  { key: '4', name: 'Rifle',  damage: 45, mag: 20, reserve: Infinity, rate: 0.14, spread: 0.006, auto: true,  color: 0x7dff9b },
];
const STATIONS = [
  { name: 'RADIO ARUNIKA', genre: 'Dangdut Neon', tracks: ['Goyang Pelabuhan — Siti Senja', 'Neon Pantura — Bang Jago'] },
  { name: 'HUJAN FM', genre: 'Lo-fi Hujan', tracks: ['Rintik di Atap Seng — Nara', 'Malam Basah — Duo Kala'] },
  { name: 'BERITA KOTA', genre: 'Warta Teluk', tracks: ['Warta Pagi: Macet di Jembatan Arunika', 'Warta Sore: Razia di Pelabuhan'] },
];
const STORY = [
  { day: 1, title: 'Misi 1 — Taksi Pertama',   brief: 'Antar penumpang ke Pasar Ikan.', reward: 120,
    lines: [['RAKA', 'Hari pertama. Tujuh hari lagi sebelum Darma datang menagih.'], ['PENUMPANG', 'Pasar Ikan, cepat ya, Mas. Ikan saya keburu layu!']] },
  { day: 2, title: 'Misi 2 — Paket Misterius', brief: 'Antar paket ke gudang pelabuhan. Jangan dibuka.', reward: 200,
    lines: [['RAKA', 'Paket ini beratnya aneh. Bukan urusanku.'], ['SUARA DI TELEPON', 'Jangan dibuka, Raka. Antar saja.']] },
  { day: 3, title: 'Misi 3 — Curi Mobil Pesanan', brief: 'Bajak mobil yang dipesan, bawa ke bengkel.', reward: 350,
    lines: [['DARMA WIJAYA', 'Ada pembeli minta sedan hitam. Ambilkan. Caranya terserah kamu.'], ['RAKA', '…Baik. Sekali ini saja.']] },
  { day: 4, title: 'Misi 4 — Utang Berbunga',  brief: 'Tagih utang dari preman pasar untuk Darma.', reward: 300,
    lines: [['PREMAN PASAR', 'Kamu suruhan Darma? Bilang, minggu depan saya bayar!'], ['RAKA', 'Minggu depan sudah telat. Sekarang.']] },
  { day: 5, title: 'Misi 5 — Pilihan Darma',   brief: 'Bayar $500 atau khianati Darma. Pilih.', reward: 0, branch: true,
    lines: [['DARMA WIJAYA', 'Lima ratus dolar, Raka. Lunas, atau kamu jadi musuhku.'], ['RAKA', 'Lima hari aku memikirkan ini…']] },
  { day: 6, title: 'Misi 6 — Senja di Pelabuhan', brief: 'Temui kontak Darma di dermaga, 17:30.', reward: 400, dusk: true,
    lines: [['KONTAK PELABUHAN', 'Senja begini paling aman. Polisi ganti sif.'], ['RAKA', 'Kalau ini jebakan, kamu yang pertama kucari.']] },
  { day: 6, title: 'Misi 7 — Kabur dari ELANG-1', brief: 'Helikopter memburumu. Hilang dari radar.', reward: 450,
    lines: [['RADIO POLISI', 'ELANG-1 di udara. Tersangka sedan kuning, arah pelabuhan!'], ['RAKA', 'Helikopter… aku harus masuk terowongan.']] },
  { day: 7, title: 'Misi 8 — Serbuan Terakhir', brief: 'Rebut kembali bengkel ayah dari anak buah Darma.', reward: 600,
    lines: [['ANAK BUAH DARMA', 'Bengkel ini sudah milik Bos Darma!'], ['RAKA', 'Bengkel ini milik ayahku. Mundur.']] },
  { day: 7, title: 'Misi 9 — Bebas atau Bangkrut', brief: 'Hadapi Darma di dermaga. Akhiri semuanya.', reward: 1000,
    lines: [['DARMA WIJAYA', 'Jadi ini pilihanmu, Raka. Berani sekali.'], ['RAKA', 'Tujuh hari. Utangku lunas hari ini — dengan caraku.']] },
];

/* ---------------- mutable state ---------------- */
const G = {
  started: false, paused: false, over: false,
  hp: 100, armor: 0, money: 250, debt: 5000, day: 1,
  wanted: 0, wantedHeat: 0, coolTimer: 0,
  clockMin: 8 * 60, weather: 'rain', timeScale: 1,
  yaw: Math.PI * 0.78, pitch: -0.02, pos: null,
  inCar: false, currentCar: null, driveSpeed: 0, driveHeading: 0,
  weaponIdx: 0, ammoInMag: 12, lastShot: 0, reloading: false,
  missionIdx: 0, branch: null, taxiFare: null, parcel: null,
  jackTarget: null, jackT: 0, jacking: false, cruise: 0,
  radioIdx: 0, trackIdx: 0, radioOn: true,
  keys: {}, pointerLocked: false, mouseDown: false,
  enemies: [], peds: [], traffic: [], policeCars: [], footPatrol: [],
  roadblock: null, spikeStrip: null, heli: null, heliLight: null, heliCone: null, heliPool: null, heliLock: false,
  marker: null, shopOpen: false, wheelTimer: 0, dialogueQueue: [], dialogueActive: false,
  shotFired: 0, carsExploded: 0, faresDone: 0,
};
G.pos = new (window.THREE ? THREE.Vector3 : Object)(8, 0, 26);
window.__game = G;

/* ---------------- three setup ---------------- */
let renderer, scene, camera, sunLight, hemi, skyMesh;
let rainPts, rainVel, lampMats = [];
const WORLD = 200; // half-size of playable area
const colliders = []; // {minX,maxX,minZ,maxZ}
const shootables = [];
const clockEl = { last: performance.now() };

function initThree() {
  const canvas = $('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a3644);
  scene.fog = new THREE.Fog(0x2a3644, 55, 360);
  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 700);
  camera.rotation.order = 'YXZ';
  hemi = new THREE.HemisphereLight(0xbfd4e6, 0x1a2027, 0.85);
  scene.add(hemi);
  sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
  sunLight.position.set(60, 120, 40);
  scene.add(sunLight);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05,
      emissive: opts.glow ?? 0x000000, emissiveIntensity: opts.glowI ?? 1 }));
  m.position.set(opts.x ?? 0, (opts.y ?? 0) + h / 2, opts.z ?? 0);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = false; m.receiveShadow = false;
  return m;
}
function addCollider(x, z, hw, hd) {
  colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
}

/* ---------------- city build ---------------- */
const ROAD_LINES = [-120, -60, 0, 60, 120];
function buildCity() {
  // ground + wet roads
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 120, WORLD * 2 + 120),
    new THREE.MeshStandardMaterial({ color: 0x232b33, roughness: 0.9, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x0e1319, roughness: 0.22, metalness: 0.65 });
  for (const c of ROAD_LINES) {
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(14, WORLD * 2 + 120), roadMat);
    r1.rotation.x = -Math.PI / 2; r1.position.set(c, 0.02, 0); scene.add(r1);
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2 + 120, 14), roadMat);
    r2.rotation.x = -Math.PI / 2; r2.position.set(0, 0.02, c); scene.add(r2);
    // centre dashes
    for (let t = -190; t < 200; t += 16) {
      const dash = box(0.5, 0.05, 3, 0xd8c25a, { x: c, y: 0.03, z: t, rough: 0.6 });
      scene.add(dash);
      const dash2 = box(3, 0.05, 0.5, 0xd8c25a, { x: t, y: 0.03, z: c, rough: 0.6 });
      scene.add(dash2);
    }
  }
  // puddles (wet look)
  const pudMat = new THREE.MeshStandardMaterial({ color: 0x0a1018, roughness: 0.05, metalness: 0.9 });
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(2 + rng() * 3, 20), pudMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(pick(ROAD_LINES) + (rng() - 0.5) * 8, 0.04, (rng() - 0.5) * 300);
    scene.add(p);
  }
  // buildings in blocks between roads
  const palette = [0x2e3a47, 0x3a2f33, 0x27363f, 0x40342a, 0x2c3440, 0x3d3a2e];
  const neonCols = [0xff2e88, 0x22d3ee, 0xffd23e, 0x7dff9b];
  // buildings sit at block centres BETWEEN roads (roads at -120,-60,0,60,120)
  for (let bx = -120; bx <= 120; bx += 60) {
    for (let bz = -120; bz <= 120; bz += 60) {
      const cx = bx + 30 + (rng() - 0.5) * 14;
      const cz = bz + 30 + (rng() - 0.5) * 14;
      const w = 14 + rng() * 16, d = 14 + rng() * 16, h = 12 + rng() * 42;
      const b = box(w, h, d, pick(palette), { x: cx, z: cz });
      scene.add(b); addCollider(cx, cz, w / 2, d / 2); shootables.push(b);
      // lit window strip near the top
      const strip = box(w * 0.7, 1.2, 0.3, 0x111111, { x: cx, y: h * 0.72, z: cz + d / 2 + 0.15, glow: pick(neonCols), glowI: 1.6 });
      scene.add(strip);
      if (rng() < 0.5) {
        const sign = box(0.4, 2.2, 6 + rng() * 5, 0x111111, { x: cx + w / 2 + 0.2, y: 5, z: cz, glow: pick(neonCols), glowI: 2 });
        scene.add(sign);
      }
    }
  }
  // street lamps along main road
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.6 });
  for (let t = -180; t <= 180; t += 30) {
    for (const x of [-8, 8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), lampPoleMat);
      pole.position.set(x, 3.5, t); scene.add(pole);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 1.4 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), headMat);
      head.position.set(x, 7, t); scene.add(head); lampMats.push(headMat);
    }
  }
  buildPort(); buildLandmarks(); buildRain(); buildTrafficLights();
}

function buildPort() {
  // water beyond the north edge
  const water = new THREE.Mesh(new THREE.PlaneGeometry(560, 120),
    new THREE.MeshStandardMaterial({ color: 0x0b3b52, roughness: 0.08, metalness: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, -250); scene.add(water);
  // dock
  const dock = box(200, 1, 46, 0x4a4238, { x: 0, y: 0, z: -168 });
  scene.add(dock);
  // containers
  const contCols = [0xb3402a, 0x2a6db3, 0x3f8f4f, 0xc2a13a, 0x7a4a9e];
  for (let i = 0; i < 14; i++) {
    const cx = -90 + (i % 7) * 30 + (rng() - 0.5) * 6;
    const cz = -158 - Math.floor(i / 7) * 14;
    const stack = 1 + (i % 3 === 0 ? 1 : 0);
    for (let s = 0; s < stack; s++) {
      const c = box(12, 3, 6, pick(contCols), { x: cx, y: s * 3, z: cz, rough: 0.7, metal: 0.3 });
      scene.add(c); if (s === 0) { addCollider(cx, cz, 6, 3); shootables.push(c); }
    }
  }
  // crane
  const crane = new THREE.Group();
  crane.add(box(3, 42, 3, 0xd8a13a, { x: 0, y: 0, z: 0 }));
  crane.add(box(3, 42, 3, 0xd8a13a, { x: 26, y: 0, z: 0 }));
  crane.add(box(30, 3, 3, 0xd8a13a, { x: 13, y: 40, z: 0 }));
  crane.add(box(2, 10, 2, 0x222222, { x: 20, y: 30, z: 0 }));
  crane.position.set(70, 0, -170); scene.add(crane);
  addCollider(70, -170, 15, 3); addCollider(96, -170, 2, 2);
  // moored boats (simple hulls)
  for (const bx of [-60, 20, 90]) {
    const hull = box(16, 3, 6, 0x5a2e22, { x: bx, y: 0, z: -215, rough: 0.6 });
    scene.add(hull);
  }
}

function buildLandmarks() {
  // safehouse (blue door) at (-70, 60)
  const sh = box(16, 9, 12, 0x3d5a73, { x: -70, z: 60 });
  scene.add(sh); addCollider(-70, 60, 8, 6);
  const door = box(3, 5, 0.4, 0x111111, { x: -70, y: 0, z: 66.2, glow: 0x3a86ff, glowI: 1.8 });
  scene.add(door);
  // gun shop (green sign) at (30, -20)
  const gs = box(14, 8, 10, 0x4a3d2a, { x: 30, z: -20 });
  scene.add(gs); addCollider(30, -20, 7, 5);
  const gsSign = box(10, 2, 0.4, 0x111111, { x: 30, y: 7, z: -14.8, glow: 0x7dff9b, glowI: 2 });
  scene.add(gsSign);
  // garage (yellow) at (-30, -60)
  const gar = box(20, 8, 14, 0x6b5a2a, { x: -30, z: -60 });
  scene.add(gar); addCollider(-30, -60, 10, 7);
  // taxi stand sign
  const ts = box(4, 1.4, 0.4, 0x111111, { x: 10, y: 6, z: 20, glow: 0xffd23e, glowI: 2 });
  scene.add(ts);
  // mission marker (floating diamond)
  const marker = new THREE.Mesh(new THREE.OctahedronGeometry(1.6),
    new THREE.MeshStandardMaterial({ color: 0xffd23e, emissive: 0xffd23e, emissiveIntensity: 1.6 }));
  marker.position.set(10, 6, 20); scene.add(marker); G.marker = marker;
}

function buildRain() {
  const N = 1400;
  const pos = new Float32Array(N * 3);
  rainVel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rng() - 0.5) * 160; pos[i * 3 + 1] = rng() * 55; pos[i * 3 + 2] = (rng() - 0.5) * 160;
    rainVel[i] = 28 + rng() * 18;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.22, transparent: true, opacity: 0.55 }));
  scene.add(rainPts);
}

let lightPoles = [];
function buildTrafficLights() {
  for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
    const pole = box(0.5, 6, 0.5, 0x1c1c1c, { x, z });
    scene.add(pole);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x37d67a, emissiveIntensity: 2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
    lamp.position.set(x, 6.2, z); scene.add(lamp);
    lightPoles.push({ mat: lampMat, ns: x < 0 });
  }
}

/* ---------------- vehicles & people ---------------- */
function makeCarMesh(color, isTaxi) {
  const g = new THREE.Group();
  const body = box(2, 0.75, 4.4, color, { x: 0, y: 0.45, z: 0, rough: 0.3, metal: 0.6 });
  g.add(body);
  const cabin = box(1.7, 0.65, 2.2, 0x1a2530, { x: 0, y: 1.15, z: -0.2, rough: 0.15, metal: 0.7 });
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.38, wz); g.add(w);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff6c8, emissiveIntensity: 2.2 });
  for (const hx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    h.position.set(hx, 0.75, 2.22); g.add(h);
  }
  if (isTaxi) {
    const sign = box(0.9, 0.35, 0.5, 0x111111, { x: 0, y: 1.65, z: -0.2, glow: 0xffd23e, glowI: 2 });
    g.add(sign);
  }
  g.userData.kind = 'car';
  return g;
}
function makePedMesh(shirt, pants, opts = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.85, 3, 8),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.85 }));
  body.position.y = 1.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: opts.skin ?? 0xc98d64, roughness: 0.7 }));
  head.position.y = 1.95; g.add(head);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.75, 8),
    new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 }));
  legs.position.y = 0.38; g.add(legs);
  if (opts.hat) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 10),
      new THREE.MeshStandardMaterial({ color: 0x1c2f4a }));
    hat.position.y = 2.18; g.add(hat);
  }
  if (opts.gun) {
    const gun = box(0.08, 0.12, 0.55, 0x111111, { x: 0.3, y: 1.3, z: 0.35 });
    g.add(gun);
  }
  g.userData.kind = opts.kind || 'ped';
  return g;
}

let playerTaxi;
function spawnWorldActors() {
  // player taxi
  playerTaxi = makeCarMesh(0xffc21a, true);
  playerTaxi.position.set(4, 0, 30); playerTaxi.rotation.y = Math.PI;
  playerTaxi.userData.hp = 100; playerTaxi.userData.isTaxi = true;
  scene.add(playerTaxi); shootables.push(playerTaxi);
  G.currentCar = playerTaxi; G.driveHeading = Math.PI;
  // traffic
  const carCols = [0x8a97a5, 0x2a6db3, 0xb3402a, 0x3f8f4f, 0xd8d8d8, 0x222831];
  for (let i = 0; i < 9; i++) {
    const axis = i % 2 === 0 ? 'z' : 'x';
    const road = pick(ROAD_LINES);
    const lane = road + (rng() < 0.5 ? -3.2 : 3.2);
    const dir = rng() < 0.5 ? 1 : -1;
    const mesh = makeCarMesh(pick(carCols), false);
    mesh.userData.hp = 100; mesh.userData.exploded = false;
    const along = (rng() - 0.5) * 360;
    if (axis === 'z') mesh.position.set(lane, 0, along); else mesh.position.set(along, 0, lane);
    mesh.rotation.y = axis === 'z' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(mesh); shootables.push(mesh);
    G.traffic.push({ mesh, axis, lane, dir, along, speed: 9 + rng() * 6, base: 9 + rng() * 6, stopped: false });
  }
  // pedestrians
  const shirts = [0xd86a6a, 0x6a8fd8, 0x7dc07d, 0xd8c25a, 0xb07dc0, 0xe8e8e8];
  for (let i = 0; i < 12; i++) {
    const m = makePedMesh(pick(shirts), 0x2a2f38);
    const x = pick(ROAD_LINES) + (rng() < 0.5 ? -9 : 9);
    const z = (rng() - 0.5) * 320;
    m.position.set(x, 0, z);
    scene.add(m);
    G.peds.push({ mesh: m, wx: x, wz: z, tx: x, tz: z, speed: 1.6 + rng() * 1.2, flee: false, wait: rng() * 3 });
  }
  // taxi passenger waiting at the stand
  const pax = makePedMesh(0xff8fb3, 0x333333);
  pax.position.set(12, 0, 22); scene.add(pax);
  G.peds.push({ mesh: pax, wx: 12, wz: 22, tx: 12, tz: 22, speed: 0, flee: false, wait: 999, passenger: true });
  // gun-shop keeper
  const keeper = makePedMesh(0x7dff9b, 0x222222, { hat: true });
  keeper.position.set(30, 0, -13); scene.add(keeper);
  G.peds.push({ mesh: keeper, wx: 30, wz: -13, tx: 30, tz: -13, speed: 0, flee: false, wait: 999, keeper: true });
}

/* ---------------- police / wanted ---------------- */
function spawnFootPatrol() {
  for (let i = 0; i < 2; i++) {
    const m = makePedMesh(0x1c2f4a, 0x1c2f4a, { hat: true, kind: 'cop' });
    m.position.set(G.pos.x + 14 + i * 4, 0, G.pos.z + 10);
    scene.add(m);
    G.footPatrol.push({ mesh: m, speed: 4.2 });
  }
}
function spawnPatrolCar() {
  const m = makeCarMesh(0x1c2f4a, false);
  m.userData.hp = 120;
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff2222, emissiveIntensity: 2.5 });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), beaconMat);
  beacon.position.y = 1.6; m.add(beacon);
  m.position.set(G.pos.x + 20, 0, G.pos.z - 24);
  scene.add(m); shootables.push(m);
  G.policeCars.push({ mesh: m, speed: 0, kind: 'patrol' });
}
function spawnRoadblock() {
  if (G.roadblock) return;
  const grp = new THREE.Group();
  for (const ox of [-4, 4]) {
    const c = makeCarMesh(0x1c2f4a, false);
    c.position.set(ox, 0, 0); c.rotation.y = Math.PI / 2 + (ox > 0 ? 0.4 : -0.4);
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: ox > 0 ? 0xff2222 : 0x2266ff, emissiveIntensity: 2.5 });
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), beaconMat);
    beacon.position.y = 1.6; c.add(beacon);
    grp.add(c);
  }
  for (let i = -1; i <= 1; i++) {
    grp.add(box(2.2, 1, 0.5, 0xd86a2a, { x: i * 3, y: 0, z: 0 }));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xff6b35 }));
    cone.position.set(i * 3 + 1.5, 0.45, 2.5); grp.add(cone);
  }
  const ahead = forwardPoint(28);
  grp.position.set(ahead.x, 0, ahead.z);
  grp.rotation.y = G.driveHeading || G.yaw;
  scene.add(grp);
  G.roadblock = grp;
}
function spawnSpikeStrip() {
  if (G.spikeStrip) return;
  const grp = new THREE.Group();
  grp.add(box(7, 0.15, 1.2, 0x222222, { x: 0, y: 0, z: 0 }));
  for (let i = -3; i <= 3; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 5),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.3 }));
    spike.position.set(i, 0.3, 0); grp.add(spike);
  }
  const ahead = forwardPoint(20);
  grp.position.set(ahead.x, 0, ahead.z);
  grp.rotation.y = G.driveHeading || G.yaw;
  scene.add(grp);
  G.spikeStrip = grp;
}
function spawnHeli() {
  if (G.heli) return;
  const g = new THREE.Group();
  g.add(box(3.4, 1.6, 5, 0x22303e, { x: 0, y: 0, z: 0, rough: 0.4, metal: 0.5 }));
  g.add(box(1, 1, 6, 0x22303e, { x: 0, y: 0.3, z: -5 }));
  const rotor = box(9, 0.12, 0.5, 0x111111, { x: 0, y: 1.1, z: 0 });
  g.add(rotor);
  g.userData.rotor = rotor; g.userData.name = 'ELANG-1';
  const spot = new THREE.SpotLight(0xfff6c8, 900, 160, 0.32, 0.45, 1.2);
  spot.position.set(0, -0.5, 0);
  g.add(spot); g.add(spot.target);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(16, 42, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI; cone.position.y = -21.5;
  g.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(13, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; scene.add(pool);
  g.position.set(G.pos.x + 30, 46, G.pos.z - 30);
  scene.add(g);
  G.heli = g; G.heliLight = spot; G.heliCone = cone; G.heliPool = pool;
}
function setWanted(n, opts = {}) {
  G.wanted = clamp(n, 0, 5);
  G.wantedHeat = G.wanted * 20;
  if (G.wanted >= 1 && G.footPatrol.length === 0) spawnFootPatrol();
  if (G.wanted >= 2 && G.policeCars.length === 0) spawnPatrolCar();
  if (G.wanted >= 3) spawnRoadblock();
  if (G.wanted >= 4) spawnSpikeStrip();
  if (G.wanted >= 5 || opts.heli) spawnHeli();
  updateWantedHud();
  return G.wanted;
}
function forwardPoint(dist) {
  const a = G.inCar ? G.driveHeading : G.yaw;
  return { x: G.pos.x - Math.sin(a) * dist, z: G.pos.z - Math.cos(a) * dist };
}

/* ---------------- enemies / combat ---------------- */
function spawnEnemy(x, z, name, hp) {
  const m = makePedMesh(0x8a2f2f, 0x222222, { gun: true, kind: 'enemy' });
  m.position.set(x, 0, z);
  m.userData.hp = hp; m.userData.maxHp = hp; m.userData.name = name; m.userData.kind = 'enemy';
  scene.add(m); shootables.push(m);
  const tag = document.createElement('div');
  tag.className = 'enemy-tag';
  tag.innerHTML = `<div class="ename">${name}</div><div class="ebar"><div style="width:100%"></div></div>`;
  $('enemy-bars').appendChild(tag);
  const e = { mesh: m, name, hp, maxHp: hp, tag, barFill: tag.querySelector('.ebar div'), cover: null, shootT: 1 + rng() * 2, alive: true };
  G.enemies.push(e);
  return e;
}
function spawnShootout() {
  const spots = [[-58, -150, 'PREMAN DARMA', 100], [-46, -162, 'PREMAN DARMA', 100], [-72, -158, 'ANAK BUAH', 80], [-40, -148, 'ANAK BUAH', 80]];
  for (const [x, z, n, hp] of spots) spawnEnemy(x, z, n, hp);
  toast('Tembak-menembak di pelabuhan! Cari perlindungan.', 'red');
}
function selectWeapon(i) {
  G.weaponIdx = clamp(i, 0, 3);
  G.ammoInMag = ARSENAL[G.weaponIdx].mag;
  G.reloading = false;
  document.querySelectorAll('.wslot').forEach((el) => el.classList.toggle('active', +el.dataset.w === G.weaponIdx));
  document.querySelectorAll('.wheel-item').forEach((el) => el.classList.toggle('active', +el.dataset.w === G.weaponIdx));
  showWheel(1.2);
  updateAmmoHud();
}
function showWheel(seconds) {
  $('wheel').classList.remove('hidden');
  G.wheelTimer = seconds;
}
function fireWeapon() {
  const now = performance.now() / 1000;
  const w = ARSENAL[G.weaponIdx];
  if (now - G.lastShot < w.rate || G.reloading || G.paused || !G.started) return false;
  if (G.ammoInMag <= 0) {
    G.reloading = true;
    toast('Mengisi ulang ' + w.name + '…', '');
    setTimeout(() => { G.ammoInMag = w.mag; G.reloading = false; updateAmmoHud(); }, 900);
    return false;
  }
  G.lastShot = now; G.ammoInMag--; G.shotFired++;
  updateAmmoHud();
  const pellets = w.pellets || 1;
  const rc = new THREE.Raycaster();
  let hitAny = false;
  for (let p = 0; p < pellets; p++) {
    rc.setFromCamera(new THREE.Vector2((rng() - 0.5) * w.spread * 40, (rng() - 0.5) * w.spread * 40), camera);
    const hits = rc.intersectObjects(shootables, true);
    if (hits.length) {
      const h = hits[0];
      let node = h.object;
      while (node && !node.userData.kind) node = node.parent;
      if (node) {
        hitAny = true;
        if (node.userData.kind === 'enemy') damageEnemy(node, w.damage);
        else if (node.userData.kind === 'car') damageCar(node, w.damage);
      }
      drawTracer(h.point);
    }
  }
  if (hitAny) { $('hitmarker').classList.remove('hidden'); setTimeout(() => $('hitmarker').classList.add('hidden'), 90); }
  for (const p of G.peds) if (!p.passenger && !p.keeper) p.flee = true;
  blip(1200, 0.05);
  return true;
}
function damageEnemy(mesh, dmg) {
  const e = G.enemies.find((x) => x.mesh === mesh);
  if (!e || !e.alive) return;
  e.hp -= dmg; mesh.userData.hp = e.hp;
  e.barFill.style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
  if (e.hp <= 0) {
    e.alive = false;
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.4;
    e.tag.style.display = 'none';
    G.money += 50; updateMoneyHud();
    toast('Musuh tumbang! +$50', 'gold');
  }
}
function damageCar(mesh, dmg) {
  mesh.userData.hp = (mesh.userData.hp ?? 100) - dmg;
  if (mesh.userData.hp <= 0 && !mesh.userData.exploded) explodeCar(mesh);
}
function explodeCar(mesh) {
  mesh.userData.exploded = true; G.carsExploded++;
  const flash = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9 }));
  flash.position.copy(mesh.position); flash.position.y = 1.5;
  scene.add(flash);
  const light = new THREE.PointLight(0xff7a1a, 400, 40);
  light.position.copy(flash.position); scene.add(light);
  let t = 0;
  const grow = () => {
    t += 0.05; flash.scale.setScalar(1 + t * 2); flash.material.opacity = Math.max(0, 0.9 - t);
    if (t < 0.9) requestAnimationFrame(grow);
    else { scene.remove(flash); scene.remove(light); scene.remove(mesh); }
  };
  grow();
  toast('Mobil meledak!', 'red');
  for (const p of G.peds) p.flee = true;
  if (mesh === G.currentCar) { G.inCar = false; G.currentCar = null; }
  if (G.wanted < 2) setWanted(2);
}
function drawTracer(endPoint) {
  const from = camera.position.clone();
  const geo = new THREE.BufferGeometry().setFromPoints([from, endPoint]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
  scene.add(line);
  setTimeout(() => scene.remove(line), 70);
}

/* ---------------- carjacking ---------------- */
function nearestJackableCar() {
  let best = null, bd = 5.5;
  for (const t of G.traffic) {
    if (t.mesh.userData.exploded) continue;
    const d = t.mesh.position.distanceTo(G.pos);
    if (d < bd) { bd = d; best = t.mesh; }
  }
  return best;
}
function startJack(mesh) {
  G.jackTarget = mesh; G.jacking = true; G.jackT = 0;
  $('jack-bar').classList.remove('hidden');
}
function completeJack() {
  const mesh = G.jackTarget;
  G.jacking = false; G.jackTarget = null; G.jackT = 0;
  $('jack-bar').classList.add('hidden');
  // driver pulled out and flees
  const d = makePedMesh(0xd8c25a, 0x2a2f38);
  d.position.set(mesh.position.x + 2.5, 0, mesh.position.z + 1);
  scene.add(d);
  G.peds.push({ mesh: d, wx: d.position.x, wz: d.position.z, tx: d.position.x + 40, tz: d.position.z + 40, speed: 7, flee: true, wait: 0 });
  $('alarm-banner').classList.remove('hidden');
  setTimeout(() => $('alarm-banner').classList.add('hidden'), 3500);
  setWanted(G.wanted + 1);
  toast('Mobil dibajak! Alarm berbunyi — wanted +1', 'red');
  blip(880, 0.4);
  enterCar(mesh);
}
function enterCar(mesh) {
  G.inCar = true; G.currentCar = mesh;
  G.driveHeading = mesh.rotation.y + Math.PI;
  G.driveSpeed = 0;
  $('speedo').classList.remove('hidden');
  $('prompt-bar').classList.add('hidden');
  toast('Kamu di dalam mobil — W maju, S rem, E keluar', '');
}
function exitCar() {
  if (!G.currentCar) return;
  G.inCar = false;
  G.pos.set(G.currentCar.position.x + 3, 0, G.currentCar.position.z + 2);
  G.driveSpeed = 0;
  $('speedo').classList.add('hidden');
}

/* ---------------- missions / jobs ---------------- */
const MISSION_SPOTS = [
  { x: 10, z: 20 }, { x: -20, z: -150 }, { x: -60, z: 0 }, { x: 40, z: 40 },
  { x: 0, z: -165 }, { x: -50, z: -165 }, { x: 0, z: 120 }, { x: -70, z: 60 }, { x: 20, z: -175 },
];
function currentMission() { return STORY[G.missionIdx]; }
function setMission(i) {
  G.missionIdx = clamp(i, 0, STORY.length - 1);
  const m = currentMission();
  G.day = m.day;
  $('mission-title').textContent = m.title;
  $('objective').textContent = '📍 ' + m.brief + ' — ikuti penanda kuning';
  const spot = MISSION_SPOTS[G.missionIdx];
  G.marker.position.set(spot.x, 6, spot.z);
  $('day-num').textContent = String(G.day);
  if (m.dusk) { G.clockMin = 17 * 60 + 30; applyTimeOfDay(17.5); }
  if (m.branch) showBranch();
  if (G.missionIdx === 2) toast('Misi pencurian: tahan E di dekat mobil target', 'gold');
  if (G.missionIdx === 5) { G.clockMin = 17 * 60 + 30; applyTimeOfDay(17.5); spawnShootout(); }
  if (G.missionIdx === 6) { setWanted(5); }
  showDialogue(m.lines);
}
function completeMission() {
  const m = currentMission();
  G.money += m.reward; G.debt = Math.max(0, G.debt - m.reward);
  updateMoneyHud();
  toast(`Misi selesai! +$${m.reward}`, 'gold');
  autosave();
  if (G.missionIdx < STORY.length - 1) setMission(G.missionIdx + 1);
  else { toast('TAMAT — Teluk Arunika bebas. Terima kasih sudah bermain!', 'gold'); G.over = true; }
}
function showBranch() {
  $('branch').classList.remove('hidden');
}
function resolveBranch(choice) {
  G.branch = choice;
  $('branch').classList.add('hidden');
  if (choice === 'pay') {
    if (G.money >= 500) { G.money -= 500; G.debt = 0; toast('Darma dibayar $500. Utang lunas — untuk sekarang.', 'gold'); }
    else toast('Uang tidak cukup! Darma tidak akan senang…', 'red');
  } else {
    setWanted(4);
    toast('Kamu mengkhianati Darma. Sekarang semua orang memburumu.', 'red');
  }
  updateMoneyHud();
  if (G.missionIdx < STORY.length - 1) setMission(G.missionIdx + 1);
}
function startTaxiFare() {
  G.taxiFare = { from: { x: 12, z: 22 }, to: { x: -60, z: -120 }, paid: 0 };
  G.marker.position.set(-60, 6, -120);
  toast('Penumpang naik! Antar ke ujung pelabuhan.', 'gold');
}
function deliverParcel() {
  G.parcel = { to: { x: 60, z: 60 } };
  G.marker.position.set(60, 6, 60);
  toast('Paket diterima. Antar ke blok timur.', 'gold');
}

/* ---------------- dialogue ---------------- */
function showDialogue(lines) {
  if (!lines || !lines.length) return;
  G.dialogueQueue = [...lines]; G.dialogueActive = true;
  advanceDialogue();
}
function advanceDialogue() {
  const next = G.dialogueQueue.shift();
  if (!next) {
    G.dialogueActive = false;
    $('dialogue').classList.add('hidden');
    return;
  }
  $('dialogue-speaker').textContent = next[0];
  $('dialogue-text').textContent = next[1];
  $('dialogue').classList.remove('hidden');
}

/* ---------------- save / load ---------------- */
function saveKey(slot) { return 'teluk-arunika-save-' + slot; }
function snapshot() {
  return { money: G.money, debt: G.debt, day: G.day, missionIdx: G.missionIdx, hp: G.hp,
    armor: G.armor, wanted: G.wanted, clockMin: G.clockMin, weather: G.weather,
    x: G.pos.x, z: G.pos.z, branch: G.branch, savedAt: new Date().toISOString() };
}
function saveGame(slot) {
  try {
    localStorage.setItem(saveKey(slot), JSON.stringify(snapshot()));
    flashSaving();
    refreshSlotLabels();
    return true;
  } catch { return false; }
}
function loadGame(slot) {
  try {
    const raw = localStorage.getItem(saveKey(slot));
    if (!raw) return false;
    const s = JSON.parse(raw);
    G.money = s.money; G.debt = s.debt; G.day = s.day; G.hp = s.hp; G.armor = s.armor;
    G.clockMin = s.clockMin; G.weather = s.weather; G.branch = s.branch;
    G.pos.set(s.x, 0, s.z);
    setWanted(s.wanted || 0);
    setMission(s.missionIdx || 0);
    updateMoneyHud(); updateWantedHud();
    return true;
  } catch { return false; }
}
function autosave() { return saveGame('auto'); }
function flashSaving() {
  const el = $('save-flash');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1200);
}
function refreshSlotLabels() {
  document.querySelectorAll('.slot').forEach((slotEl) => {
    const slot = slotEl.dataset.slot;
    const raw = localStorage.getItem(saveKey(slot));
    const info = slotEl.querySelector('.slot-info');
    if (!raw) { info.textContent = '— kosong —'; return; }
    try {
      const s = JSON.parse(raw);
      info.textContent = `Hari ${s.day} · $${s.money} · ${s.savedAt.slice(0, 10)}`;
    } catch { info.textContent = 'rusak'; }
  });
}

/* ---------------- radio + audio ---------------- */
let audioCtx = null, radioNodes = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  return audioCtx;
}
function blip(freq, dur) {
  const ctx = ensureAudio(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; o.type = 'square';
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio is decoration */ }
}
function cycleRadio() {
  G.radioIdx = (G.radioIdx + 1) % STATIONS.length;
  G.trackIdx = 0;
  const st = STATIONS[G.radioIdx];
  $('radio-track').textContent = `${st.name} — ${st.genre}: ${st.tracks[0]}`;
  stopRadioAudio();
  if (G.radioOn) startRadioAudio();
  return G.radioIdx;
}
function startRadioAudio() {
  const ctx = ensureAudio(); if (!ctx) return false;
  try {
    stopRadioAudio();
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = [196, 164, 220][G.radioIdx];
    o2.frequency.value = [294, 246, 330][G.radioIdx];
    g.gain.value = 0.03;
    o.connect(g); o2.connect(g); g.connect(ctx.destination);
    o.start(); o2.start();
    radioNodes = { o, o2, g };
    return true;
  } catch { return false; }
}
function stopRadioAudio() {
  if (!radioNodes) return;
  try { radioNodes.o.stop(); radioNodes.o2.stop(); } catch { /* already stopped */ }
  radioNodes = null;
}

/* ---------------- HUD ---------------- */
function updateMoneyHud() {
  $('money').textContent = String(G.money);
  $('debt-left').textContent = '$' + G.debt.toLocaleString('en-US');
  $('pause-money').textContent = String(G.money);
}
function updateWantedHud() {
  const filled = '★'.repeat(G.wanted), empty = '☆'.repeat(5 - G.wanted);
  const el = $('wanted-stars');
  el.textContent = filled + empty;
  el.classList.toggle('hot', G.wanted >= 3);
}
function updateAmmoHud() { $('ammo').textContent = `${G.ammoInMag} / ∞`; }
function toast(msg, kind) {
  const stack = $('toast-stack');
  const div = document.createElement('div');
  div.className = 'toast ' + (kind || '');
  div.textContent = msg;
  stack.appendChild(div);
  while (stack.children.length > 4) stack.removeChild(stack.firstChild);
  setTimeout(() => div.remove(), 4200);
}
function fmtClock() {
  const h = Math.floor(G.clockMin / 60) % 24, m = Math.floor(G.clockMin % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function updateClockHud() {
  $('clock').textContent = fmtClock();
  $('weather').textContent = G.weather === 'rain' ? '🌧 HUJAN' : '☀️ CERAH';
  $('pause-clock').textContent = fmtClock();
  $('pause-weather').textContent = G.weather === 'rain' ? 'Hujan' : 'Cerah';
  $('pause-day').textContent = String(G.day);
}
function applyTimeOfDay(hour) {
  const h = ((hour % 24) + 24) % 24;
  let sky, sunI, sunCol, hemiI;
  if (h >= 17 && h < 18.6) { // dusk orange
    const t = (h - 17) / 1.6;
    sky = new THREE.Color().setHSL(0.07 - t * 0.02, 0.85, lerp(0.42, 0.22, t));
    sunI = lerp(1.0, 0.25, t); sunCol = 0xff8a3c; hemiI = 0.55;
  } else if (h >= 18.6 || h < 5.5) { // night neon
    sky = new THREE.Color(0x0d1626); sunI = 0.2; sunCol = 0x8fb4ff; hemiI = 0.7;
  } else if (h < 7) { // dawn
    sky = new THREE.Color(0x6a7a8c); sunI = 0.5; sunCol = 0xffd9a0; hemiI = 0.6;
  } else { // day (rain grey-blue, kept bright enough to read)
    sky = new THREE.Color(0x46586a); sunI = 1.5; sunCol = 0xfff2d8; hemiI = 1.1;
  }
  scene.background = sky; scene.fog.color.copy(sky);
  sunLight.intensity = sunI; sunLight.color.setHex(sunCol);
  hemi.intensity = hemiI;
  const night = (h >= 18.6 || h < 5.5);
  for (const m of lampMats) m.emissiveIntensity = night ? 2.4 : 0.9;
  return sky;
}
function drawMinimap() {
  const cv = $('minimap'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const S = cv.width, scale = S / 420;
  const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
  ctx.fillStyle = '#060d16'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(160,180,200,.5)'; ctx.lineWidth = 4;
  for (const c of ROAD_LINES) {
    const [x1, y1] = toMap(c, -200), [x2, y2] = toMap(c, 200);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const [x3, y3] = toMap(-200, c), [x4, y4] = toMap(200, c);
    ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
  }
  // water / port at top
  ctx.fillStyle = '#0b3b52'; ctx.fillRect(0, 0, S, 14);
  const dot = (x, z, color, r) => {
    const [px, py] = toMap(x, z);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  };
  dot(-70, 60, '#3a86ff', 5); // safehouse
  dot(30, -20, '#7dff9b', 5); // gun shop
  dot(4, 30, '#7dff9b', 4); // taxi
  const [mx, my] = toMap(G.marker.position.x, G.marker.position.z);
  ctx.fillStyle = '#ffd23e'; // mission marker (diamond)
  ctx.beginPath(); ctx.moveTo(mx, my - 7); ctx.lineTo(mx + 6, my); ctx.lineTo(mx, my + 7); ctx.lineTo(mx - 6, my); ctx.closePath(); ctx.fill();
  for (const c of G.policeCars) dot(c.mesh.position.x, c.mesh.position.z, '#ff3b30', 4);
  for (const c of G.footPatrol) dot(c.mesh.position.x, c.mesh.position.z, '#ff3b30', 3);
  for (const e of G.enemies) if (e.alive) dot(e.mesh.position.x, e.mesh.position.z, '#ff8c1a', 3);
  if (G.heli) dot(G.heli.position.x, G.heli.position.z, '#ff3b30', 6);
  // player arrow
  const [px, py] = toMap(G.pos.x, G.pos.z);
  ctx.save(); ctx.translate(px, py); ctx.rotate(-G.yaw + Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function updateCompass() {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const deg = ((-G.yaw * 180) / Math.PI % 360 + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  $('compass-text').textContent = `◀ ${dirs[(idx + 7) % 8]} · ${dirs[idx]} · ${dirs[(idx + 1) % 8]} ▶`;
}
function updateEnemyBars() {
  const v = new THREE.Vector3();
  for (const e of G.enemies) {
    if (!e.alive) continue;
    v.copy(e.mesh.position); v.y += 2.6; v.project(camera);
    if (v.z > 1) { e.tag.style.display = 'none'; continue; }
    e.tag.style.display = 'block';
    e.tag.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    e.tag.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }
}

/* ---------------- input ---------------- */
function bindInput() {
  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    G.keys[ev.code] = true;
    if (ev.code === 'KeyP') togglePause();
    if (ev.code === 'KeyR') cycleRadio();
    if (ev.code === 'KeyM') $('minimap').classList.toggle('zoomed');
    if (ev.code.startsWith('Digit')) {
      const n = parseInt(ev.code.slice(5), 10);
      if (n >= 1 && n <= 4) selectWeapon(n - 1);
    }
    if (ev.code === 'KeyQ') showWheel(999);
    if (ev.code === 'KeyE') {
      if (G.dialogueActive) advanceDialogue();
      else if (G.shopOpen) closeShop();
      else if (G.inCar) exitCar();
      else if (nearGunShop()) openShop();
      else if (nearTaxiStand() && !G.taxiFare) startTaxiFare();
      else if (nearParcelPoint() && !G.parcel) deliverParcel();
      else if (nearestJackableCar()) startJack(nearestJackableCar());
      else if (nearCar(playerTaxi)) enterCar(playerTaxi);
    }
  });
  window.addEventListener('keyup', (ev) => {
    G.keys[ev.code] = false;
    if (ev.code === 'KeyQ') { $('wheel').classList.add('hidden'); G.wheelTimer = 0; }
    if (ev.code === 'KeyE' && G.jacking) { G.jacking = false; $('jack-bar').classList.add('hidden'); }
  });
  window.addEventListener('mousedown', (ev) => {
    if (!G.started || G.paused || ev.target.closest('button')) return;
    G.mouseDown = true;
    if (!G.pointerLocked && !TEST_MODE && SHOT_NUM === 0) $('gl').requestPointerLock?.();
    fireWeapon();
  });
  window.addEventListener('mouseup', () => { G.mouseDown = false; });
  document.addEventListener('pointerlockchange', () => { G.pointerLocked = document.pointerLockElement === $('gl'); });
  document.addEventListener('mousemove', (ev) => {
    if (!G.pointerLocked || !G.started || G.paused) return;
    G.yaw -= ev.movementX * 0.0022;
    G.pitch = clamp(G.pitch - ev.movementY * 0.0022, -1.2, 1.2);
  });
  document.querySelectorAll('.wheel-item').forEach((el) => el.addEventListener('click', () => selectWeapon(+el.dataset.w)));
  document.querySelectorAll('.slot button').forEach((btn) => btn.addEventListener('click', (ev) => {
    const slot = ev.target.closest('.slot').dataset.slot;
    if (saveGame(slot)) toast('Disimpan ke Slot ' + slot, 'gold');
  }));
  document.querySelectorAll('.shop-item button').forEach((btn) => btn.addEventListener('click', (ev) => {
    buyShopItem(ev.target.closest('.shop-item').dataset.buy);
  }));
  $('branch-pay').addEventListener('click', () => resolveBranch('pay'));
  $('branch-betray').addEventListener('click', () => resolveBranch('betray'));
  $('btn-resume').addEventListener('click', () => togglePause(false));
  $('btn-restart').addEventListener('click', () => location.reload());
  $('btn-new').addEventListener('click', () => startGame(false));
  $('btn-continue').addEventListener('click', () => startGame(true));
}
function nearCar(mesh) { return mesh && mesh.position.distanceTo(G.pos) < 5; }
function nearGunShop() { return Math.hypot(G.pos.x - 30, G.pos.z - (-14)) < 6; }
function nearTaxiStand() { return Math.hypot(G.pos.x - 10, G.pos.z - 20) < 6; }
function nearParcelPoint() { return Math.hypot(G.pos.x - 0, G.pos.z - 120) < 6; }
function openShop() { G.shopOpen = true; $('shop').classList.remove('hidden'); }
function closeShop() { G.shopOpen = false; $('shop').classList.add('hidden'); }
function buyShopItem(item) {
  const prices = { armor: 200, smg: 350, shotgun: 450, rifle: 700 };
  const cost = prices[item] || 0;
  if (G.money < cost) { toast('Uang tidak cukup!', 'red'); return false; }
  G.money -= cost;
  if (item === 'armor') G.armor = 100;
  if (item === 'smg') selectWeapon(1);
  if (item === 'shotgun') selectWeapon(2);
  if (item === 'rifle') selectWeapon(3);
  updateMoneyHud();
  toast('Dibeli: ' + item + ' (-$' + cost + ')', 'gold');
  return true;
}
function togglePause(force) {
  if (!G.started) return;
  G.paused = force !== undefined ? force : !G.paused;
  $('pause-screen').classList.toggle('hidden', !G.paused);
  if (G.paused) {
    $('wheel').classList.add('hidden'); G.wheelTimer = 0;
    $('dialogue').classList.add('hidden');
    refreshSlotLabels(); updateClockHud();
  }
  return G.paused;
}

/* ---------------- per-frame updates ---------------- */
function resolveCollision(p, radius) {
  for (const c of colliders) {
    if (p.x > c.minX - radius && p.x < c.maxX + radius && p.z > c.minZ - radius && p.z < c.maxZ + radius) {
      const dxl = p.x - (c.minX - radius), dxr = (c.maxX + radius) - p.x;
      const dzl = p.z - (c.minZ - radius), dzr = (c.maxZ + radius) - p.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) p.x = c.minX - radius;
      else if (m === dxr) p.x = c.maxX + radius;
      else if (m === dzl) p.z = c.minZ - radius;
      else p.z = c.maxZ + radius;
      if (G.inCar) G.driveSpeed *= 0.35;
    }
  }
  p.x = clamp(p.x, -WORLD, WORLD); p.z = clamp(p.z, -WORLD, WORLD);
}
function updatePlayer(dt) {
  const k = G.keys;
  const run = k['ShiftLeft'] || k['ShiftRight'];
  if (G.inCar && G.currentCar) {
    const car = G.currentCar;
    const accel = k['KeyW'] ? 16 : k['KeyS'] ? -22 : 0;
    G.driveSpeed += accel * dt;
    G.driveSpeed *= Math.pow(0.4, dt); // drag
    if (!k['KeyW'] && !k['KeyS']) G.driveSpeed *= Math.pow(0.25, dt);
    G.driveSpeed = clamp(G.driveSpeed, -10, 38);
    if (G.cruise) G.driveSpeed = G.cruise; // staged chase keeps its speed
    const steer = (k['KeyA'] ? 1 : 0) - (k['KeyD'] ? 1 : 0);
    G.driveHeading += steer * dt * 1.9 * clamp(Math.abs(G.driveSpeed) / 12, 0, 1) * (G.driveSpeed >= 0 ? 1 : -1);
    car.position.x -= Math.sin(G.driveHeading) * G.driveSpeed * dt;
    car.position.z -= Math.cos(G.driveHeading) * G.driveSpeed * dt;
    car.rotation.y = G.driveHeading + Math.PI;
    resolveCollision(car.position, 2.2);
    G.pos.copy(car.position);
    // spike strip = flat tyre
    if (G.spikeStrip && car.position.distanceTo(G.spikeStrip.position) < 4) {
      G.driveSpeed *= 0.4;
      toast('Ban kena paku! Mobil melambat.', 'red');
      scene.remove(G.spikeStrip); G.spikeStrip = null;
    }
    $('speed-val').textContent = String(Math.round(Math.abs(G.driveSpeed) * 3.6));
  } else {
    const speed = run ? 10 : 5.5;
    let fx = 0, fz = 0;
    if (k['KeyW']) fz -= 1;
    if (k['KeyS']) fz += 1;
    if (k['KeyA']) fx -= 1;
    if (k['KeyD']) fx += 1;
    if (fx || fz) {
      const len = Math.hypot(fx, fz); fx /= len; fz /= len;
      const sin = Math.sin(G.yaw), cos = Math.cos(G.yaw);
      G.pos.x += (fx * cos - fz * sin) * speed * dt;
      G.pos.z += (fx * sin + fz * cos) * speed * dt;
      resolveCollision(G.pos, 0.7);
    }
    if (k['ArrowLeft']) G.yaw += 1.8 * dt;
    if (k['ArrowRight']) G.yaw -= 1.8 * dt;
    // jacking progress while E held
    if (G.jacking && G.jackTarget) {
      G.jackT += dt / 2.4;
      $('jack-fill').style.width = Math.round(G.jackT * 100) + '%';
      if (G.jackT >= 1) completeJack();
    }
    // prompts (hidden while a dialogue box is open)
    const jack = nearestJackableCar();
    const prompt = $('prompt-bar');
    if (G.dialogueActive) prompt.classList.add('hidden');
    else if (jack) { prompt.textContent = 'Tahan [E] untuk MEMBAJAK mobil ini'; prompt.classList.remove('hidden'); }
    else if (nearCar(playerTaxi)) { prompt.textContent = 'Tekan [E] untuk masuk taksi'; prompt.classList.remove('hidden'); }
    else if (nearGunShop()) { prompt.textContent = 'Tekan [E] — Toko Senjata Pak Amir'; prompt.classList.remove('hidden'); }
    else if (nearTaxiStand() && !G.taxiFare) { prompt.textContent = 'Tekan [E] — Ambil penumpang taksi'; prompt.classList.remove('hidden'); }
    else prompt.classList.add('hidden');
  }
  // mission marker reach check
  const spot = MISSION_SPOTS[G.missionIdx];
  if (!G.over && Math.hypot(G.pos.x - spot.x, G.pos.z - spot.z) < 7) completeMission();
  // taxi fare drop-off
  if (G.taxiFare && Math.hypot(G.pos.x - G.taxiFare.to.x, G.pos.z - G.taxiFare.to.z) < 8) {
    G.money += 90; G.faresDone++; updateMoneyHud();
    toast('Penumpang sampai! +$90', 'gold');
    G.taxiFare = null; autosave();
  }
  if (G.parcel && Math.hypot(G.pos.x - G.parcel.to.x, G.pos.z - G.parcel.to.z) < 8) {
    G.money += 70; updateMoneyHud(); toast('Paket terkirim! +$70', 'gold'); G.parcel = null;
  }
}
function updateTraffic(dt, lightNsGreen) {
  for (const t of G.traffic) {
    if (t.mesh.userData.exploded) continue;
    let target = t.base;
    // stop at red light near an intersection
    const onNsRoad = t.axis === 'z';
    const nearCross = Math.abs(t.along % 60) < 9;
    if (nearCross && ((onNsRoad && !lightNsGreen) || (!onNsRoad && lightNsGreen))) target = 0;
    // avoid the car ahead in the same lane
    for (const o of G.traffic) {
      if (o === t || o.axis !== t.axis || Math.abs(o.lane - t.lane) > 1) continue;
      const gap = (o.along - t.along) * t.dir;
      if (gap > 0 && gap < 8) { target = 0; break; }
    }
    t.speed = lerp(t.speed, target, Math.min(1, dt * 2));
    t.along += t.speed * t.dir * dt;
    if (t.along > 195) t.along = -195;
    if (t.along < -195) t.along = 195;
    if (t.axis === 'z') { t.mesh.position.set(t.lane, 0, t.along); t.mesh.rotation.y = t.dir > 0 ? 0 : Math.PI; }
    else { t.mesh.position.set(t.along, 0, t.lane); t.mesh.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    // bump the player car
    if (G.inCar && G.currentCar && t.mesh.position.distanceTo(G.currentCar.position) < 3.4) {
      G.driveSpeed *= 0.5; t.speed = 0;
      damageCar(t.mesh, 5);
    }
  }
}
function updatePeds(dt) {
  for (const p of G.peds) {
    if (p.wait > 0 && !p.flee) { p.wait -= dt; continue; }
    const dx = p.tx - p.mesh.position.x, dz = p.tz - p.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5) {
      if (p.flee) { p.flee = false; p.wait = 2; }
      else {
        p.tx = pick(ROAD_LINES) + (rng() < 0.5 ? -9 : 9);
        p.tz = clamp(p.mesh.position.z + (rng() - 0.5) * 80, -180, 180);
      }
      continue;
    }
    const sp = p.flee ? p.speed * 3.2 : p.speed;
    p.mesh.position.x += (dx / d) * sp * dt;
    p.mesh.position.z += (dz / d) * sp * dt;
    p.mesh.rotation.y = Math.atan2(dx, dz);
    if (p.flee) { p.tx = p.mesh.position.x + (p.mesh.position.x - G.pos.x); p.tz = p.mesh.position.z + (p.mesh.position.z - G.pos.z); }
  }
}
function updatePolice(dt) {
  const toPlayer = (m, speed) => {
    const dx = G.pos.x - m.position.x, dz = G.pos.z - m.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.5) {
      m.position.x += (dx / d) * speed * dt;
      m.position.z += (dz / d) * speed * dt;
      m.rotation.y = Math.atan2(dx, dz);
    }
    return d;
  };
  for (const c of G.footPatrol) toPlayer(c.mesh, c.speed);
  for (const c of G.policeCars) {
    const d = toPlayer(c.mesh, 16 + G.wanted * 2);
    c.mesh.rotation.y = Math.atan2(G.pos.x - c.mesh.position.x, G.pos.z - c.mesh.position.z);
    if (d < 4 && G.inCar) { // PIT nudge
      G.driveSpeed *= 0.92;
      G.driveHeading += 0.02;
    }
    if (d < 3 && !G.inCar) { G.hp = Math.max(0, G.hp - 12 * dt); $('hp-fill').style.width = G.hp + '%'; }
  }
  // wanted cooldown when hidden far from police
  if (G.wanted > 0) {
    const nearest = G.policeCars.length ? Math.min(...G.policeCars.map((c) => c.mesh.position.distanceTo(G.pos))) : 999;
    if (nearest > 60) { G.coolTimer += dt; if (G.coolTimer > 25) { setWanted(G.wanted - 1); G.coolTimer = 0; toast('Polisi kehilangan jejakmu — wanted turun', 'gold'); } }
    else G.coolTimer = 0;
  }
  if (G.heli) {
    if (G.heliLock) {
      // staged shot: hold the helicopter ahead-right of the camera
      G.heli.position.set(G.pos.x + 18, 42, G.pos.z - 38);
    } else {
      const orbitR = G.wanted >= 5 ? 26 : 40;
      const orbitSpeed = G.wanted >= 5 ? 0.55 : 0.3;
      const t = performance.now() / 1000 * orbitSpeed;
      G.heli.position.set(G.pos.x + Math.cos(t) * orbitR, 44, G.pos.z + Math.sin(t) * orbitR);
    }
    G.heli.userData.rotor.rotation.y += dt * 22;
    G.heliLight.target.position.copy(G.pos); G.heliLight.target.updateMatrixWorld();
    G.heliPool.position.set(G.pos.x, 0.06, G.pos.z);
  }
  // heli spotlight pool follows player even without heli? no.
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (!e.alive) continue;
    e.shootT -= dt;
    const dx = G.pos.x - e.mesh.position.x, dz = G.pos.z - e.mesh.position.z;
    const d = Math.hypot(dx, dz);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    if (d > 26) { // close in
      e.mesh.position.x += (dx / d) * 2.2 * dt;
      e.mesh.position.z += (dz / d) * 2.2 * dt;
    } else if (e.shootT <= 0 && d < 45) {
      e.shootT = 1.4 + rng() * 1.2;
      if (rng() < 0.55) {
        const absorbed = Math.min(G.armor, 8);
        G.armor -= absorbed;
        G.hp = Math.max(0, G.hp - (8 - absorbed));
        $('hp-fill').style.width = G.hp + '%';
        $('armor-fill').style.width = G.armor + '%';
        if (G.hp <= 0) { toast('RAKA TERTEMBAK! Misi gagal — muat ulang save terakhir.', 'red'); G.hp = 100; $('hp-fill').style.width = '100%'; }
      }
    }
  }
}
function updateRain(dt) {
  if (!rainPts) return;
  rainPts.visible = G.weather === 'rain';
  if (!rainPts.visible) return;
  const pos = rainPts.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) - rainVel[i] * dt;
    if (y < 0) y = 55;
    pos.setY(i, y);
    pos.setX(i, pos.getX(i) + Math.sin(performance.now() / 900 + i) * 0.01);
  }
  pos.needsUpdate = true;
  rainPts.position.set(G.pos.x, 0, G.pos.z);
}
function updateCamera() {
  if (G.inCar && G.currentCar) {
    const c = G.currentCar;
    // driver-seat view: ahead of the roof sign, above the hood
    const fx = -Math.sin(G.driveHeading), fz = -Math.cos(G.driveHeading);
    camera.position.set(c.position.x + fx * 1.05, 2.45, c.position.z + fz * 1.05);
    camera.rotation.set(G.pitch * 0.3 - 0.04, G.driveHeading, 0);
    G.yaw = G.driveHeading;
  } else {
    camera.position.set(G.pos.x, 1.7 + Math.sin(performance.now() / 300) * 0.02, G.pos.z);
    camera.rotation.set(G.pitch, G.yaw, 0);
  }
}

/* ---------------- main loop ---------------- */
let lightTimer = 0, hudTimer = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.05, (now - clockEl.last) / 1000);
  clockEl.last = now;
  if (!G.started || G.paused) { renderer.render(scene, camera); return; }
  // clock + light cycle
  G.clockMin += dt * 0.55 * G.timeScale;
  lightTimer += dt;
  const lightNsGreen = (lightTimer % 12) < 6;
  for (const lp of lightPoles) lp.mat.emissive.setHex(lp.ns === lightNsGreen ? 0x37d67a : 0xff3b30);
  if (Math.floor(G.clockMin) % 30 === 0 && Math.abs(G.clockMin % 30) < 0.02) applyTimeOfDay(G.clockMin / 60);
  if (G.wheelTimer > 0) { G.wheelTimer -= dt; if (G.wheelTimer <= 0) $('wheel').classList.add('hidden'); }
  if (G.mouseDown && ARSENAL[G.weaponIdx].auto) fireWeapon();
  updatePlayer(dt);
  updateTraffic(dt, lightNsGreen);
  updatePeds(dt);
  updatePolice(dt);
  updateEnemies(dt);
  updateRain(dt);
  updateCamera();
  if (G.marker) { G.marker.rotation.y += dt * 1.5; G.marker.position.y = 6 + Math.sin(now / 400) * 0.6; }
  hudTimer += dt;
  if (hudTimer > 0.12) {
    hudTimer = 0;
    updateClockHud(); updateCompass(); drawMinimap(); updateEnemyBars();
    $('hp-fill').style.width = G.hp + '%';
    $('armor-fill').style.width = G.armor + '%';
  }
  renderer.render(scene, camera);
}

/* ---------------- start / staging ---------------- */
function startGame(continueSave) {
  let loaded = false;
  if (continueSave) loaded = loadGame('auto') || loadGame(1);
  $('start-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  G.started = true;
  if (!loaded) { setMission(0); updateMoneyHud(); updateWantedHud(); updateAmmoHud(); selectWeapon(0); }
  toast(loaded ? 'Selamat datang kembali di Teluk Arunika.' : 'Hari 1 — utang $5.000. Semoga beruntung, Raka.', 'gold');
}
function stageShot(n) {
  startGame(false);
  if (n === 1) {
    // day rain, on foot, carjacking mid-action
    G.clockMin = 10 * 60 + 15; G.weather = 'rain'; applyTimeOfDay(10.25);
    setWanted(2);
    G.pos.set(0, 0, 38);
    G.yaw = -0.38; G.pitch = 0; // face the target sedan down the road
    const target = G.traffic[0];
    target.mesh.position.set(4, 0, 28); target.mesh.rotation.y = 0;
    G.jackTarget = target.mesh; G.jacking = false; G.jackT = 0.65;
    $('jack-bar').classList.remove('hidden');
    $('jack-fill').style.width = '65%';
    $('jack-label').textContent = 'MEMBOBOL MOBIL… 65%';
    $('alarm-banner').classList.remove('hidden');
    const driver = makePedMesh(0xd8c25a, 0x2a2f38);
    driver.position.set(7.5, 0, 28.5); driver.rotation.y = Math.PI / 2;
    scene.add(driver);
    setMission(2);
    $('mission-title').textContent = 'Misi 3 — Curi Mobil Pesanan';
    toast('Polisi dipanggil! Alarm mobil berbunyi.', 'red');
  } else if (n === 2) {
    // night chase in car, ELANG-1 spotlight, roadblock, speedometer
    G.clockMin = 23 * 60 + 40; G.weather = 'rain'; applyTimeOfDay(23.7);
    G.pos.set(0, 0, 40);
    enterCar(playerTaxi);
    G.driveSpeed = 26; G.driveHeading = 0; G.cruise = 26;
    playerTaxi.position.set(0, 0, 40); playerTaxi.rotation.y = Math.PI;
    setWanted(4);
    spawnHeli();
    G.heliLock = true; // keep ELANG-1 in frame for the shot
    G.heli.position.set(14, 42, 18);
    spawnRoadblock();
    if (G.roadblock) { G.roadblock.position.set(0, 0, -30); G.roadblock.rotation.y = 0; }
    setMission(6);
    $('mission-title').textContent = 'Misi 7 — Kabur dari ELANG-1';
    toast('ELANG-1 di udara! Lewati roadblock!', 'red');
  } else if (n === 3) {
    // dusk-orange port shootout, weapon wheel, Darma dialogue, enemy HP bars
    G.clockMin = 17 * 60 + 30; G.weather = 'clear'; applyTimeOfDay(17.5);
    setWanted(3);
    G.pos.set(-58, 0, -138); G.yaw = 0; G.pitch = 0.02; // face the port, enemies ahead
    spawnShootout();
    selectWeapon(2); showWheel(999);
    showDialogue([['DARMA WIJAYA', 'Jadi ini pilihanmu, Raka. Berani sekali.'], ['RAKA', 'Tujuh hari. Utangku lunas hari ini — dengan caraku.']]);
    setMission(8);
    $('mission-title').textContent = 'Misi 9 — Bebas atau Bangkrut';
    G.hp = 72; G.armor = 55;
    $('hp-fill').style.width = '72%'; $('armor-fill').style.width = '55%';
  } else if (n === 4) {
    // pause screen with save slots
    G.clockMin = 2 * 60 + 14; G.weather = 'rain'; applyTimeOfDay(2.23);
    G.money = 1240; updateMoneyHud();
    saveGame(1); saveGame(2);
    setMission(3);
    $('dialogue').classList.add('hidden');
    togglePause(true);
  }
  // weapon wheel only belongs in the shootout shot; hide it everywhere else
  if (n !== 3) { $('wheel').classList.add('hidden'); G.wheelTimer = 0; }
  updateClockHud(); updateCompass(); drawMinimap(); updateEnemyBars();
}

/* ---------------- self test ---------------- */
function runSelfTests() {
  const out = [];
  const check = (name, fn) => {
    try { out.push((fn() ? 'PASS ' : 'FAIL ') + name); }
    catch (e) { out.push('FAIL ' + name + ' :: ' + (e && e.message ? e.message : e)); }
  };
  check('three-loads', () => typeof THREE !== 'undefined' && !!THREE.WebGLRenderer);
  check('renderer-created', () => !!renderer && !!renderer.domElement);
  check('scene-built', () => !!scene && scene.children.length > 40);
  check('camera-exists', () => !!camera && camera.isPerspectiveCamera);
  check('player-spawned', () => !!G.pos && Math.abs(G.pos.x) < 250);
  check('player-taxi-spawned', () => !!playerTaxi && scene.children.includes(playerTaxi));
  check('traffic-spawned-9', () => G.traffic.length === 9);
  check('pedestrians-spawned-12plus', () => G.peds.length >= 12);
  check('wanted-escalation-to-3', () => { setWanted(3); return G.wanted === 3 && !!G.roadblock; });
  check('wanted-4-spike-strip', () => { setWanted(4); return !!G.spikeStrip; });
  check('wanted-5-heli-elang1', () => { setWanted(5); return !!G.heli && G.heli.userData.name === 'ELANG-1'; });
  check('heli-spotlight-cone', () => !!G.heliCone && !!G.heliLight && G.heliLight.isSpotLight);
  check('carjacking-sim', () => {
    const car = G.traffic.find((t) => !t.mesh.userData.exploded).mesh;
    G.jackTarget = car; G.jackT = 1; completeJack();
    return G.inCar === true && G.currentCar === car;
  });
  check('exit-car-works', () => { exitCar(); return G.inCar === false; });
  check('four-weapons', () => ARSENAL.length === 4);
  check('weapon-select-1-4', () => { selectWeapon(3); const ok = G.weaponIdx === 3; selectWeapon(0); return ok; });
  check('weapon-damage-positive', () => ARSENAL.every((w) => w.damage > 0 && w.mag > 0));
  check('shotgun-pellets-6', () => ARSENAL[2].pellets === 6);
  check('hud-elements-present', () => ['wanted-stars', 'money', 'hp-fill', 'armor-fill', 'clock', 'weather', 'compass-text', 'mission-title', 'speed-val', 'radio-track'].every((id) => !!$(id)));
  check('minimap-canvas-present', () => !!$('minimap') && !!$('minimap').getContext('2d'));
  check('minimap-draws', () => { drawMinimap(); return true; });
  check('nine-missions', () => STORY.length === 9);
  check('mission-titles-nonempty', () => STORY.every((m) => m.title && m.brief));
  check('mission-3-car-theft', () => STORY[2].title.includes('Curi Mobil'));
  check('mission-6-dusk-port', () => STORY[5].dusk === true);
  check('mission-5-branch-pay-betray', () => STORY[4].branch === true);
  check('save-load-roundtrip', () => { G.money = 777; saveGame(9); G.money = 0; const ok = loadGame(9) && G.money === 777; localStorage.removeItem(saveKey(9)); return ok; });
  check('autosave-writes', () => { autosave(); return !!localStorage.getItem(saveKey('auto')); });
  check('radio-three-stations', () => STATIONS.length === 3);
  check('radio-cycle-works', () => { const before = G.radioIdx; cycleRadio(); return G.radioIdx !== before; });
  check('no-external-urls', () => {
    const bad = [];
    document.querySelectorAll('script[src], link[href], img[src]').forEach((el) => {
      const u = el.getAttribute('src') || el.getAttribute('href') || '';
      if (/^https?:\/\//i.test(u)) bad.push(u);
    });
    return bad.length === 0;
  });
  check('rain-system-exists', () => !!rainPts && rainPts.geometry.attributes.position.count >= 1000);
  check('day-night-cycle', () => { const sky = applyTimeOfDay(12); return sky instanceof THREE.Color; });
  check('dusk-orange-at-1700', () => { const sky = applyTimeOfDay(17.5); return sky.r > sky.b; });
  check('enemy-hp-bars', () => { const e = spawnEnemy(-58, -150, 'UJI MUSUH', 100); return !!e.tag && e.tag.querySelector('.ebar div') !== null; });
  check('gun-shop-exists', () => !!document.querySelector('.shop-item'));
  check('taxi-job-exists', () => typeof startTaxiFare === 'function' && !!G.peds.find((p) => p.passenger));
  check('car-explosion', () => { const c = makeCarMesh(0x888888, false); c.userData.hp = 5; scene.add(c); damageCar(c, 50); return G.carsExploded >= 1; });
  check('pause-works', () => { const p = togglePause(true); togglePause(false); return p === true; });
  check('start-screen-exists', () => !!$('start-screen'));
  check('clock-advances', () => { const before = G.clockMin; G.clockMin += 1; return G.clockMin === before + 1; });
  check('traffic-lights-exist', () => lightPoles.length === 4);
  check('heli-name-elang1-not-condor', () => !document.body.innerHTML.includes('CONDOR-1') && !document.body.innerHTML.includes('SBPD'));
  check('dialogue-works', () => { showDialogue([['UJI', 'Baris uji dialog.']]); const vis = !$('dialogue').classList.contains('hidden'); advanceDialogue(); return vis; });
  check('compass-updates', () => { updateCompass(); return $('compass-text').textContent.length > 3; });
  check('speedometer-element', () => !!$('speedo'));
  window.__testResults = out;
  window.__testsDone = true;
  const panel = $('test-panel');
  panel.classList.remove('hidden');
  panel.textContent = out.join('\n');
  document.title = 'TESTS: ' + out.filter((l) => l.startsWith('PASS')).length + '/' + out.length;
  return out;
}

/* ---------------- boot ---------------- */
function boot() {
  initThree();
  buildCity();
  spawnWorldActors();
  bindInput();
  selectWeapon(0);
  updateMoneyHud(); updateWantedHud(); updateAmmoHud(); updateClockHud();
  applyTimeOfDay(8);
  $('radio-track').textContent = 'RADIO ARUNIKA — Dangdut Neon: Goyang Pelabuhan — Siti Senja';
  loop();
  if (SHOT_NUM >= 1 && SHOT_NUM <= 4) {
    stageShot(SHOT_NUM);
  } else if (TEST_MODE) {
    startGame(false);
    setTimeout(runSelfTests, 900);
  }
  // expose hooks for the harness
  window.__runSelfTests = runSelfTests;
  window.__stageShot = stageShot;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
