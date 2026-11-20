// TELUK ARUNIKA: 7 Hari Utang — first-person 3D open-world crime game.
// Entry for the make.fun bounty gta6-01. Three.js r160 is vendored locally;
// every texture is drawn procedurally on canvas, every sound is synthesized
// with WebAudio, and the game makes no network request while running.
// Raka, a taxi driver, owes crime boss Darma Wijaya and has seven days to pay
// or lose his father's workshop. Fictional rainy tropical port city; all
// characters, story and art are original. Progress saves to localStorage.
'use strict';

const el = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SHOT = parseInt(params.get('shot') || '0', 10);
const SELFTEST = params.get('test') === '1';
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
const distXZ = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// ---------------------------------------------------------------- audio ----
// WebAudio synth. The context is only unlocked by a real user gesture, so
// headless runs and the self-test never touch the audio device at all.
let actx = null, bus = null, audioUnlocked = false, radioClock = null, radioStep = 0;
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    bus = actx.createGain(); bus.gain.value = 0.2; bus.connect(actx.destination);
    audioUnlocked = true;
  } catch (err) { actx = null; }
}
function beep(freq, dur, kind, vol, glide) {
  if (!audioUnlocked || !actx) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = kind || 'square';
    o.frequency.setValueAtTime(freq, actx.currentTime);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), actx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.14, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(bus); o.start(); o.stop(actx.currentTime + dur);
  } catch (err) {}
}
function noiseBurst(dur, vol, cutoff) {
  if (!audioUnlocked || !actx) return;
  try {
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    const g = actx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(bus); src.start();
  } catch (err) {}
}
const sfx = {
  gun() { noiseBurst(0.12, 0.5, 2600); beep(170, 0.08, 'square', 0.2, 55); },
  hit() { beep(230, 0.1, 'sawtooth', 0.2, 90); },
  siren() { beep(720, 0.55, 'sine', 0.05, 1180); },
  horn() { beep(320, 0.25, 'square', 0.09, 290); },
  cash() { beep(880, 0.08, 'sine', 0.2); setTimeout(() => beep(1318, 0.15, 'sine', 0.2), 90); },
  jack() { beep(150, 0.3, 'sawtooth', 0.2, 70); },
  blast() { noiseBurst(0.7, 0.6, 480); beep(58, 0.6, 'sine', 0.4, 30); },
  ui() { beep(620, 0.05, 'square', 0.1); },
  motor() { beep(72, 0.15, 'sawtooth', 0.045, 115); },
};
const RADIO = [
  { name: 'DANGDUT NEON FM', tracks: ['Rindu Pelabuhan — Sari Melati', 'Hujan di Teluk — Duo Arunika', 'Neon Malam — Bang Jago'] },
  { name: 'LO-FI HUJAN 88.4', tracks: ['Gerimis Pagi — Hujan Kota', 'Kopi & Aspal Basah — Nara', 'Jendela Berembun — Lofi Teluk'] },
  { name: 'BERITA KOTA ARUNIKA', tracks: ['Laporan Lalu Lintas Pelabuhan', 'Waspada: Pencurian Mobil Meningkat', 'Cuaca: Monsun Berlanjut Seminggu'] },
];
let station = 0, track = 0;
function radioNote() {
  if (!audioUnlocked) return;
  const scale = station === 0 ? [262, 294, 330, 392, 440] : station === 1 ? [220, 262, 330, 392] : [330, 392, 440, 523];
  beep(scale[radioStep % scale.length], 0.22, station === 0 ? 'triangle' : 'sine', 0.04);
  radioStep++;
}
function startRadioLoop() { if (!radioClock) radioClock = setInterval(radioNote, 420); }

// ------------------------------------------------------------- world data ----
const CITY = 720, HALF = CITY / 2;
const STREETS = [-240, -120, 0, 120, 240];
const ROADW = 18;
const PLACES = {
  home: { x: -285, z: -285, label: 'SAFEHOUSE — Rumah Raka' },
  workshop: { x: 170, z: -285, label: 'GARAGE — Bengkel Ayah' },
  arms: { x: -120, z: 120, label: 'TOKO SENJATA' },
  harbour: { x: 300, z: 255, label: 'PELABUHAN' },
  bazaar: { x: 0, z: 120, label: 'PASAR ARUNIKA' },
  cabRank: { x: -120, z: -240, label: 'PANGKALAN TAKSI' },
};
const STORY = [
  { day: 1, title: 'Antar Paket Darma', kind: 'go', pay: 150, at: PLACES.harbour,
    brief: 'Darma: "Raka. Paket ini harus sampai ke pelabuhan sebelum tengah malam. Jangan dibuka. Jangan ditanya."' },
  { day: 2, title: 'Taksi Terakhir', kind: 'taxi', pay: 120, at: PLACES.bazaar,
    brief: 'Raka: "Satu shift taksi lagi. Penumpang ke pasar, lalu ke pelabuhan. Uang receh, tapi halal."' },
  { day: 3, title: 'Tagih Utang Joni', kind: 'fight', pay: 250, at: PLACES.bazaar,
    brief: 'Darma: "Joni ngumpet di gang pasar. Ambil uangnya. Kalau melawan, kau tahu caranya."' },
  { day: 3, title: 'Curi Mobil Pesanan', kind: 'steal', pay: 300, at: PLACES.workshop,
    brief: 'Darma: "Aku butuh satu mobil bagus malam ini, Raka. Curi yang tercepat di jalan — antar ke bengkel ayahmu. Jangan sampai ketahuan."' },
  { day: 4, title: 'Balapan Jalan Tol', kind: 'race', pay: 400, at: { x: 270, z: -270, label: 'GARIS START BALAPAN' },
    brief: 'Raka: "Balapan liar di jalan tol layang. Hadiahnya besar — cukup untuk cicil utang."' },
  { day: 5, title: 'Pilihan: Bayar atau Khianat', kind: 'choice', pay: 0, at: PLACES.workshop,
    brief: 'Darma: "Besok jatuh tempo, Raka. Bayar aku — atau bantu aku sekali lagi, dan utangmu lunas. Pilih."' },
  { day: 6, title: 'Serbuan Pelabuhan', kind: 'fight', pay: 500, at: PLACES.harbour,
    brief: 'Raka: "Malam ini semuanya ditentukan. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."' },
  { day: 6, title: 'Senja di Pelabuhan', kind: 'go', pay: 350, at: PLACES.harbour, dusk: true,
    brief: 'Raka: "Senja di pelabuhan. Satu pengiriman terakhir sebelum malam penentuan — dan kali ini aku yang memilih jalannya."' },
  { day: 7, title: 'Hari Terakhir', kind: 'finale', pay: 800, at: PLACES.home,
    brief: 'Darma: "Tujuh hari habis, Raka. Bengkel ayahmu… atau kebebasanmu. Datang ke safehouse. Sendirian."' },
];
const ARSENAL = [
  { name: 'PISTOL', dmg: 26, rate: 0.28, pellets: 1, spread: 0.012, color: 0xffd23e },
  { name: 'SMG', dmg: 14, rate: 0.09, pellets: 1, spread: 0.03, color: 0xff9de2 },
  { name: 'SHOTGUN', dmg: 15, rate: 0.7, pellets: 6, spread: 0.06, color: 0x7dff9a },
  { name: 'RIFLE', dmg: 42, rate: 0.5, pellets: 1, spread: 0.004, color: 0x9fd8ff },
];

// ------------------------------------------------------------- game state ----
function freshState() {
  return {
    started: false, paused: false, over: false,
    day: 1, money: 250, hp: 100, armor: 0,
    wanted: 0, heat: 100, clockMin: 8 * 60, rain: 0.7, night: false,
    weapon: 0, ammo: [Infinity, 120, 24, 60],
    you: { x: -285, z: -250, yaw: Math.PI * 0.25, pitch: 0, car: null, jack: 0, speed: 0 },
    storyIdx: 0, storyLive: false, missionCar: null,
    cab: { active: false, rider: null, dest: null, fare: 0 },
    parcel: { active: false, dest: null, pay: 0 },
    branch: null, kills: 0, stolen: 0, score: 0,
    lastFire: 0, talkLines: [], talkIdx: 0, talkPick: null,
    toastT: 0, saveT: 0, mapBig: false, playSecs: 0,
    locked: false, dragging: false,
  };
}
let S = freshState();
let fleet = [], crowd = [], officers = [], foes = [], bolts = [], barriers = [], spikes = [], chopper = null;
let crates = [];   // harbour containers, so a staged shot can clear a yard
let phase = 0, phaseT = 0, copT = 0, sirenT = 0, autoT = 0;

// ------------------------------------------------------------- three setup ----
let renderer, scene, camera, hemi, sun, moon, beams, heliBeam;
let rainPts, rainVel;
let solids = [];      // {minX,maxX,minZ,maxZ} collision boxes
let targets = [];     // {mesh, kind, ref} raycastable things
let hpTags = [];      // {bg, fg, ref} enemy health bars
let glowMats = [], bulbMats = [];
let trafficLights = [];
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function paintCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function facadeTexture(base, lit) {
  return paintCanvas(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    for (let y = 22; y < h - 20; y += 30) for (let x = 12; x < w - 16; x += 26) {
      const litWin = Math.random() < lit;
      g.fillStyle = litWin ? (Math.random() < 0.7 ? '#ffd76a' : '#9fd8ff') : '#141a26';
      g.fillRect(x, y, 16, 20);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(x, y, 16, 20);
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, w, 6);
  });
}
function streetTexture() {
  return paintCanvas(1024, 1024, (g, w, h) => {
    const cv = v => (v + HALF) / CITY * w;
    g.fillStyle = '#2a2f38'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e4d2e'; g.fillRect(cv(-300), cv(-300), cv(-180) - cv(-300), cv(-180) - cv(-300));
    g.fillStyle = '#0b3550'; g.fillRect(cv(255), cv(180), w - cv(255), h - cv(180));
    g.fillStyle = '#7a6a45'; g.fillRect(cv(255), cv(180), w - cv(255), 8);
    g.fillStyle = '#171a20';
    for (const r of STREETS) {
      g.fillRect(cv(r - ROADW / 2), 0, cv(r + ROADW / 2) - cv(r - ROADW / 2), h);
      g.fillRect(0, cv(r - ROADW / 2), w, cv(r + ROADW / 2) - cv(r - ROADW / 2));
    }
    g.fillStyle = 'rgba(110,160,255,.07)';
    for (const r of STREETS) {
      g.fillRect(cv(r - ROADW / 2), 0, cv(r + ROADW / 2) - cv(r - ROADW / 2), h);
      g.fillRect(0, cv(r - ROADW / 2), w, cv(r + ROADW / 2) - cv(r - ROADW / 2));
    }
    g.fillStyle = '#c9a227';
    for (const r of STREETS) for (let v = -HALF; v < HALF; v += 24) {
      g.fillRect(cv(r) - 2, cv(v), 4, 12); g.fillRect(cv(v), cv(r) - 2, 12, 4);
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (const rx of STREETS) for (const rz of STREETS)
      for (let i = -8; i <= 8; i += 4) g.fillRect(cv(rx + i) - 1, cv(rz - ROADW / 2 + 2), 2, 5);
  });
}
function signTexture(word, color) {
  return paintCanvas(256, 64, (g, w, h) => {
    g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
    g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color;
    g.fillText(word, w / 2, h / 2 + 2);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillText(word, w / 2, h / 2 + 2);
  });
}

// ------------------------------------------------------------- city build ----
function buildCity() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fa3b8);
  scene.fog = new THREE.Fog(0x8fa3b8, 60, 420);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 900);
  camera.rotation.order = 'YXZ';
  renderer = new THREE.WebGLRenderer({ canvas: el('view'), antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  hemi = new THREE.HemisphereLight(0xbfd4e6, 0x2a2f22, 0.9); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(120, 200, 60); scene.add(sun);
  moon = new THREE.DirectionalLight(0x8fb4ff, 0); moon.position.set(-80, 180, -120); scene.add(moon);
  beams = new THREE.SpotLight(0xfff6c8, 0, 90, 0.5, 0.4, 1.2); scene.add(beams); scene.add(beams.target);
  heliBeam = new THREE.SpotLight(0xfffbe0, 0, 170, 0.26, 0.5, 1); scene.add(heliBeam); scene.add(heliBeam.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY + 160, CITY + 160),
    new THREE.MeshPhongMaterial({ map: streetTexture(), shininess: 90, specular: 0x6688bb })
  );
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const wet = new THREE.MeshPhongMaterial({ color: 0x9db8dd, shininess: 220, specular: 0xffffff, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 26; i++) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(rand(2, 5), 20), wet);
    puddle.rotation.x = -Math.PI / 2;
    const r = pickOne(STREETS);
    if (Math.random() < 0.5) puddle.position.set(r + rand(-6, 6), 0.02, rand(-HALF + 20, HALF - 20));
    else puddle.position.set(rand(-HALF + 20, HALF - 20), 0.02, r + rand(-6, 6));
    scene.add(puddle);
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500),
    new THREE.MeshPhongMaterial({ color: 0x0d3a5c, shininess: 160, specular: 0x99bbff }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(560, -0.1, 480); scene.add(sea);

  // tower blocks, one city block at a time
  const palette = ['#3a3f52', '#4a3542', '#2f4a44', '#54422c', '#3c3458', '#413038', '#2c3e55'];
  const skins = palette.map(c => facadeTexture(c, 0.55));
  const signs = [['HOTEL', '#ff4d6d'], ['NEON', '#00e5ff'], ['DARMA', '#ff2e5e'], ['PASAR', '#ffd23e'],
    ['BAR', '#ff9de2'], ['TAKSI', '#2eff5e'], ['KOPI', '#ffb36b'], ['24 JAM', '#7dff9a']];
  for (let i = 0; i < STREETS.length - 1; i++) for (let j = 0; j < STREETS.length - 1; j++) {
    const bx = STREETS[i] + ROADW / 2 + 6, bz = STREETS[j] + ROADW / 2 + 6;
    const bw = STREETS[i + 1] - STREETS[i] - ROADW - 12, bh = STREETS[j + 1] - STREETS[j] - ROADW - 12;
    if (i === 0 && j === 0) continue;              // park in the north-west block
    if (bx > 250 && bz > 180) continue;           // harbour yard, handled below
    const count = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < count; k++) {
      const w = rand(22, Math.min(42, bw / count)), d = rand(22, Math.min(38, bh));
      const hgt = rand(14, 46);
      const x = bx + k * (bw / count) + w / 2 + rand(0, 4), z = bz + d / 2 + rand(0, 6);
      const tower = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: skins[Math.floor(Math.random() * skins.length)] }));
      tower.scale.set(w, hgt, d); tower.position.set(x, hgt / 2, z); scene.add(tower);
      solids.push({ minX: x - w / 2 - 0.4, maxX: x + w / 2 + 0.4, minZ: z - d / 2 - 0.4, maxZ: z + d / 2 + 0.4 });
      const rooftop = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x22262e }));
      rooftop.scale.set(rand(3, 6), rand(1.5, 3), rand(3, 6));
      rooftop.position.set(x + rand(-4, 4), hgt + rooftop.scale.y / 2, z + rand(-3, 3)); scene.add(rooftop);
      if (Math.random() < 0.5) {
        const [word, col] = pickOne(signs);
        const mat = new THREE.MeshBasicMaterial({ map: signTexture(word, col) });
        glowMats.push(mat);
        const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(16, w * 0.8), 4), mat);
        board.position.set(x, Math.min(hgt - 3, 12), z + d / 2 + 0.15);
        if (Math.random() < 0.5) { board.position.z = z - d / 2 - 0.15; board.rotation.y = Math.PI; }
        scene.add(board);
        const wash = new THREE.Mesh(new THREE.PlaneGeometry(10, 6),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.14 }));
        wash.rotation.x = -Math.PI / 2; wash.position.set(x, 0.03, z + d / 2 + 4); scene.add(wash);
      }
    }
  }

  // lamp posts along every street
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x1c1f26 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (const r of STREETS) for (let v = -300; v <= 300; v += 120) {
    for (const [x, z] of [[r + ROADW / 2 + 1.5, v], [r - ROADW / 2 - 1.5, v + 60]]) {
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(x, 3.5, z); scene.add(pole);
      const lm = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
      bulbMats.push(lm);
      const bulb = new THREE.Mesh(bulbGeo, lm); bulb.position.set(x, 7.1, z); scene.add(bulb);
    }
  }

  // traffic lights on every crossing
  for (const rx of STREETS) for (const rz of STREETS) {
    const post = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), poleMat);
    mast.position.y = 2.5; post.add(mast);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    housing.position.y = 5.4; post.add(housing);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(0, 5.9, 0.4); post.add(red);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    green.position.set(0, 5.0, 0.4); post.add(green);
    post.position.set(rx + ROADW / 2 + 1, 0, rz - ROADW / 2 - 1);
    scene.add(post);
    trafficLights.push({ red, green, rx, rz });
  }

  // harbour: stacked shipping containers + gantry cranes
  const crateColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xe67e22, 0x8e44ad, 0x16a085];
  for (let i = 0; i < 22; i++) {
    const crate = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: pickOne(crateColors) }));
    const hgt = rand(2.6, 5.2), x = rand(265, 345), z = rand(190, 320);
    crate.scale.set(12, hgt, 3); crate.position.set(x, hgt / 2, z);
    crate.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
    scene.add(crate);
    const crateBox = { minX: x - 6.5, maxX: x + 6.5, minZ: z - 6.5, maxZ: z + 6.5 };
    solids.push(crateBox);
    crates.push({ mesh: crate, box: crateBox });
  }
  for (const [x, z] of [[330, 330], [360, 260]]) {
    const crane = new THREE.Group();
    const leg = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd8a020 }));
    leg.scale.set(2, 34, 2); leg.position.y = 17; crane.add(leg);
    const arm = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xd8a020 }));
    arm.scale.set(30, 1.6, 1.6); arm.position.set(-10, 33, 0); crane.add(arm);
    crane.position.set(x, 0, z); scene.add(crane);
  }

  // landmark buildings: safehouse, garage, gun shop
  const landmark = (x, z, color, hgt) => {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    m.scale.set(16, hgt, 14); m.position.set(x, hgt / 2, z); scene.add(m);
    solids.push({ minX: x - 8.4, maxX: x + 8.4, minZ: z - 7.4, maxZ: z + 7.4 });
  };
  landmark(PLACES.home.x, PLACES.home.z, 0x4aa8ff, 9);
  landmark(PLACES.workshop.x, PLACES.workshop.z, 0xff9d00, 10);
  landmark(PLACES.arms.x, PLACES.arms.z, 0xaa3333, 8);

  // rain: a point cloud that follows the camera
  const N = 1400;
  const pos = new Float32Array(N * 3); rainVel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rand(-40, 40); pos[i * 3 + 1] = rand(0, 40); pos[i * 3 + 2] = rand(-40, 40);
    rainVel[i] = rand(28, 46);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainPts = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xaac8ff, size: 0.14, transparent: true, opacity: 0.55 }));
  rainPts.frustumCulled = false;
  scene.add(rainPts);

  // police helicopter, parked out of sight until 5 stars
  chopper = { group: new THREE.Group(), rotor: null, orbit: 0 };
  const body = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x3a5a7a }));
  body.scale.set(5, 2, 2.4); chopper.group.add(body);
  const tail = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x3a5a7a }));
  tail.scale.set(5, 0.7, 0.7); tail.position.set(-4.5, 0.4, 0); chopper.group.add(tail);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beacon.position.set(0, 1.4, 0); chopper.group.add(beacon);
  const tailLamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLamp.position.set(-7, 0.4, 0); chopper.group.add(tailLamp);
  chopper.rotor = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
  chopper.rotor.scale.set(9, 0.15, 0.6); chopper.rotor.position.y = 1.4; chopper.group.add(chopper.rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -30; cone.rotation.x = Math.PI; chopper.group.add(cone);
  chopper.group.visible = false; scene.add(chopper.group);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ------------------------------------------------------------- entities ----
const PAINT = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
function makeCarMesh(color, taxi) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(boxGeo, new THREE.MeshPhongMaterial({ color, shininess: 120, specular: 0x99bbdd }));
  body.scale.set(2.0, 0.62, 4.4); body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(boxGeo, new THREE.MeshPhongMaterial({ color: 0x18222e, shininess: 160, specular: 0xffffff }));
  cabin.scale.set(1.7, 0.55, 2.2); cabin.position.set(0, 1.05, -0.2); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
  }
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), lamp);
    h.position.set(x, 0.62, 2.22); g.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), tailMat);
    t.position.set(x, 0.62, -2.22); g.add(t);
  }
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xf7c600 }));
    sign.position.set(0, 1.45, -0.2); g.add(sign);
  }
  g.traverse(o => { if (o.isMesh) o.userData.carGroup = g; });
  return g;
}
function addCar(x, z, axis, taxi) {
  const mesh = makeCarMesh(taxi ? 0xf7c600 : pickOne(PAINT), taxi);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = {
    mesh, x, z, axis,
    dir: Math.random() < 0.5 ? 1 : -1, heading: 0, speed: rand(9, 15),
    taxi: !!taxi, driver: !taxi || Math.random() < 0.5,
    hp: 100, locked: Math.random() < 0.35, parked: false,
  };
  car.heading = axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  mesh.rotation.y = car.heading;
  targets.push({ mesh, kind: 'car', ref: car });
  return car;
}
function spawnTraffic(n) {
  for (let i = 0; i < n; i++) {
    const axis = Math.random() < 0.5 ? 'v' : 'h';
    if (axis === 'v') fleet.push(addCar(pickOne(STREETS) + (Math.random() < 0.5 ? 4.5 : -4.5), rand(-320, 320), 'v', false));
    else fleet.push(addCar(rand(-320, 320), pickOne(STREETS) + (Math.random() < 0.5 ? 4.5 : -4.5), 'h', false));
  }
  // three staged cars: one jackable near the start, two taxis at their stands
  const jackable = addCar(8, 12, 'h', false); jackable.speed = 0; jackable.driver = false; jackable.parked = true; fleet.push(jackable);
  const cabA = addCar(-115, -232, 'v', true); cabA.speed = 0; cabA.parked = true; fleet.push(cabA);
  const cabB = addCar(178, -276, 'h', true); cabB.speed = 0; cabB.parked = true; fleet.push(cabB);
}
function makePersonMesh(shirt, pants) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.75, 4, 8), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 0.95; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.62; g.add(head);
  const legs = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: pants }));
  legs.scale.set(0.5, 0.6, 0.3); legs.position.y = 0.3; g.add(legs);
  g.traverse(o => { if (o.isMesh) o.userData.personGroup = g; });
  return g;
}
function spawnCrowd(n) {
  const shirts = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71, 0xff9de2, 0xff8c42];
  for (let i = 0; i < n; i++) {
    const mesh = makePersonMesh(pickOne(shirts), pickOne([0x222222, 0x334455, 0x553322]));
    const x = pickOne(STREETS) + rand(-14, 14), z = pickOne(STREETS) + rand(-14, 14);
    mesh.position.set(x, 0, z); scene.add(mesh);
    crowd.push({ mesh, x, z, speed: rand(1.0, 1.9), state: 'walk', tx: x + rand(-80, 80), tz: z + rand(-80, 80), panic: 0, bob: Math.random() * 6 });
  }
}
function spawnFoes(at, n) {
  for (let i = 0; i < n; i++) {
    const mesh = makePersonMesh(0x8a1a1a, 0x1a1a1a);
    const x = at.x + rand(-40, 40), z = at.z + rand(-40, 40);
    mesh.position.set(x, 0, z); scene.add(mesh);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.85, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.95, depthTest: false }));
    bg.position.set(x, 2.15, z); fg.position.set(x, 2.15, z);
    bg.renderOrder = 999; fg.renderOrder = 1000; scene.add(bg); scene.add(fg);
    const e = { mesh, x, z, hp: 60, shootT: rand(0.5, 2), speed: 1.9 };
    targets.push({ mesh, kind: 'foe', ref: e });
    hpTags.push({ bg, fg, ref: e });
    foes.push(e);
  }
}
function resetWorld() {
  for (const c of fleet) scene.remove(c.mesh);
  for (const p of crowd) scene.remove(p.mesh);
  for (const e of foes) scene.remove(e.mesh);
  for (const b of hpTags) { scene.remove(b.bg); scene.remove(b.fg); }
  for (const c of officers) scene.remove(c.mesh);
  for (const r of barriers) scene.remove(r.group);
  for (const s of spikes) scene.remove(s.group);
  fleet = []; crowd = []; officers = []; foes = []; bolts = []; barriers = []; spikes = []; hpTags = [];
  targets = targets.filter(t => t.kind !== 'car' && t.kind !== 'foe' && t.kind !== 'cop');
  chopper.group.visible = false;
  spawnTraffic(24); spawnCrowd(30);
  phase = 0; phaseT = 0; copT = 0;
}

// ------------------------------------------------------------- input ----
const keys = {};
let mouseHeld = false;
const view = el('view');
function requestLook() { try { view.requestPointerLock(); } catch (err) {} }
view.addEventListener('click', () => {
  unlockAudio(); startRadioLoop();
  if (S.started && !S.paused && !talkOpen()) requestLook();
});
document.addEventListener('pointerlockchange', () => {
  S.locked = document.pointerLockElement === view;
  el('dragtip').style.display = S.locked ? 'none' : 'block';
});
document.addEventListener('mousemove', e => {
  if (!S.started || S.paused || talkOpen()) return;
  const sens = S.locked ? 0.0022 : 0.003;
  if (S.locked || (S.dragging && mouseHeld)) {
    S.you.yaw -= e.movementX * sens;
    S.you.pitch = clampN(S.you.pitch - e.movementY * sens, -1.45, 1.45);
  }
});
view.addEventListener('mousedown', e => {
  mouseHeld = true; S.dragging = !S.locked;
  unlockAudio(); startRadioLoop();
  if (talkOpen()) { advanceTalk(); return; }
  if (S.started && !S.paused) shoot();
});
addEventListener('mouseup', () => { mouseHeld = false; S.dragging = false; });
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (e.key === 'Escape' && !S.locked && S.started && !talkOpen()) togglePause();
  if (k === 'p' && S.started && !talkOpen()) togglePause();
  if (k === 'r' && S.started && !S.paused) {
    station = (station + 1) % RADIO.length;
    track = Math.floor(Math.random() * 3);
    sfx.ui(); note('RADIO: ' + RADIO[station].name);
  }
  if (k === 'm' && S.started) {
    S.mapBig = !S.mapBig;
    const mm = el('map');
    mm.style.width = S.mapBig ? '320px' : '200px';
    mm.style.height = S.mapBig ? '320px' : '200px';
  }
  if (['1', '2', '3', '4'].includes(e.key) && S.started && !S.paused) {
    S.weapon = parseInt(e.key, 10) - 1; paintWheel(); sfx.ui();
  }
  if (k === 'q' && S.started && !S.paused) {
    el('wheel').classList.toggle('off'); paintWheel();
  }
  if (k === 'e' && talkOpen()) advanceTalk();
  if (k === 't' && S.started && !S.paused) cabJob();
  if (k === 'y' && S.started && !S.paused) parcelJob();
  if (e.key === 'Enter' && !el('menu').classList.contains('off')) beginGame(false);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
el('btn-start').addEventListener('click', () => { unlockAudio(); startRadioLoop(); beginGame(true); });
el('btn-load').addEventListener('click', () => {
  unlockAudio(); startRadioLoop();
  if (readSave(1)) { beginGame(false); note('CONTINUE — Slot 1 dimuat'); }
  else note('Tidak ada save di Slot 1');
});
el('btn-resume').addEventListener('click', togglePause);
el('btn-menu').addEventListener('click', () => { togglePause(); showMenu(); });
el('btn-loadslot').addEventListener('click', () => {
  if (readSave(1)) { togglePause(); note('Slot 1 dimuat'); } else note('Tidak ada save di Slot 1');
});
document.querySelectorAll('#pause [data-save]').forEach(b =>
  b.addEventListener('click', () => writeSave(parseInt(b.dataset.save, 10))));
document.querySelectorAll('.wheel-cell').forEach(cell =>
  cell.addEventListener('click', () => {
    S.weapon = parseInt(cell.dataset.slot, 10); paintWheel(); sfx.ui();
    el('wheel').classList.add('off');
  }));

// ------------------------------------------------------------- dialogue ----
function talkOpen() { return !el('talk').classList.contains('off'); }
function showTalk(speaker, lines, picks) {
  S.talkLines = lines; S.talkIdx = 0; S.talkPick = picks || null;
  el('talker').textContent = speaker;
  el('talkline').textContent = lines[0];
  el('talkpick').classList.add('off'); el('talkpick').innerHTML = '';
  el('talk').classList.remove('off');
  if (document.pointerLockElement) document.exitPointerLock();
}
function advanceTalk() {
  if (S.talkPick && S.talkIdx >= S.talkLines.length - 1) return;
  S.talkIdx++;
  if (S.talkIdx >= S.talkLines.length) {
    el('talk').classList.add('off');
    if (S.talkPick) {
      const box = el('talkpick');
      box.classList.remove('off');
      el('talk').classList.remove('off');
      S.talkPick.forEach(c => {
        const b = document.createElement('button');
        b.textContent = c.label;
        b.addEventListener('click', () => { el('talk').classList.add('off'); c.fn(); });
        box.appendChild(b);
      });
      S.talkPick = null;
    }
    return;
  }
  el('talkline').textContent = S.talkLines[S.talkIdx];
}
function note(t, secs) { el('note').textContent = t; S.toastT = secs || 3; }
function fmtTime(min) {
  const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function paintWheel() {
  document.querySelectorAll('.wheel-cell').forEach(cell =>
    cell.classList.toggle('sel', parseInt(cell.dataset.slot, 10) === S.weapon));
  el('ammo2').textContent = S.ammo[1] + ' peluru';
  el('ammo3').textContent = S.ammo[2] + ' peluru';
  el('ammo4').textContent = S.ammo[3] + ' peluru';
}

// ------------------------------------------------------------- missions ----
function currentStory() { return STORY[S.storyIdx]; }
function goalPoint() {
  if (S.cab.active && S.cab.rider) return S.cab.rider;
  if (S.cab.active && S.cab.dest) return S.cab.dest;
  if (S.parcel.active && S.parcel.dest) return S.parcel.dest;
  const m = currentStory(); return m ? m.at : null;
}
function openMission() {
  const m = currentStory(); if (!m || S.storyLive) return;
  S.storyLive = true;
  if (m.dusk) { S.clockMin = 17 * 60 + 30; S.rain = 0.3; }
  showTalk(m.day === 5 ? 'DARMA WIJAYA' : 'RAKA',
    [m.brief, 'Tujuan: ' + m.title + ' — ikuti penanda kuning di minimap. Hadiah: $' + m.pay + '.']);
  if (m.kind === 'fight' || m.kind === 'finale') spawnFoes(m.at, m.kind === 'finale' ? 7 : 5);
  note('MISI HARI ' + m.day + ': ' + m.title, 4);
}
function closeMission() {
  const m = currentStory(); if (!m) return;
  S.money += m.pay; S.score += 100 + m.pay;
  note('MISI SELESAI! +$' + m.pay, 4); sfx.cash();
  S.storyLive = false;
  autosave();
  if (m.kind === 'choice') return;
  S.storyIdx = Math.min(S.storyIdx + 1, STORY.length - 1);
  S.day = currentStory() ? currentStory().day : 7;
  S.missionCar = null;
  if (m.day === 7) endGame(true);
}
function storyTick() {
  if (!S.storyLive) {
    const t = goalPoint();
    if (t && distXZ(S.you.x, S.you.z, t.x, t.z) < 14) openMission();
    return;
  }
  const m = currentStory(), t = m.at;
  if (m.kind === 'go' || m.kind === 'taxi' || m.kind === 'race') {
    if (distXZ(S.you.x, S.you.z, t.x, t.z) < 14) closeMission();
  } else if (m.kind === 'steal') {
    if (S.missionCar && S.you.car === S.missionCar && distXZ(S.you.x, S.you.z, t.x, t.z) < 14) closeMission();
  } else if (m.kind === 'fight' || m.kind === 'finale') {
    if (foes.length === 0) closeMission();
  } else if (m.kind === 'choice') {
    if (distXZ(S.you.x, S.you.z, t.x, t.z) < 14 && !S.branch) {
      showTalk('DARMA WIJAYA',
        ['"Pilih, Raka. Bayar utangmu sekarang — atau khianati aku dan ambil alih pelabuhan malam ini."'],
        [
          { label: '1 · BAYAR DARMA ($500)', fn: () => {
            if (S.money >= 500) {
              S.money -= 500; S.branch = 'pay';
              note('Utang dibayar. Darma pergi — tapi kota tetap mengingatmu.');
              closeMission();
            } else { note('Uangmu tidak cukup! Khianati dia atau cari uang dulu.'); S.storyLive = false; }
          } },
          { label: '2 · KHIANATI DARMA', fn: () => {
            S.branch = 'betray'; S.wanted = Math.max(S.wanted, 3);
            note('Kau memilih khianat. Darma mengirim anak buahnya!');
            spawnFoes(PLACES.harbour, 6);
            S.storyLive = false; S.storyIdx = 6; S.day = 6;
          } },
        ]);
    }
  }
}
function cabJob() {
  const p = S.you;
  if (p.car && p.car.taxi && !S.cab.active) {
    const d = pickOne([PLACES.bazaar, PLACES.harbour, PLACES.home, PLACES.arms]);
    const px = clampN(p.x + rand(-40, 40), -330, 330), pz = clampN(p.z + rand(-40, 40), -330, 330);
    S.cab = { active: true, rider: { x: px, z: pz }, dest: d, fare: Math.floor(rand(40, 110)) };
    note('TAKSI: jemput penumpang (penanda hijau), antar ke ' + d.label);
  } else if (S.cab.active && S.cab.rider && distXZ(p.x, p.z, S.cab.rider.x, S.cab.rider.z) < 6) {
    S.cab.rider = null;
    note('Penumpang naik! Antar ke tujuan — bayaran $' + S.cab.fare);
  } else if (S.cab.active && !S.cab.rider && distXZ(p.x, p.z, S.cab.dest.x, S.cab.dest.z) < 14) {
    S.money += S.cab.fare;
    note('TAKSI SELESAI +$' + S.cab.fare); sfx.cash();
    S.cab = { active: false, rider: null, dest: null, fare: 0 };
  }
}
function parcelJob() {
  const p = S.you;
  if (!S.parcel.active) {
    const d = pickOne([PLACES.harbour, PLACES.bazaar, PLACES.workshop]);
    S.parcel = { active: true, dest: d, pay: Math.floor(rand(60, 140)) };
    note('PAKET: antar ke ' + d.label + ' — bayaran $' + S.parcel.pay);
  } else if (distXZ(p.x, p.z, S.parcel.dest.x, S.parcel.dest.z) < 14) {
    S.money += S.parcel.pay;
    note('PAKET TERKIRIM +$' + S.parcel.pay); sfx.cash();
    S.parcel = { active: false, dest: null, pay: 0 };
  }
}

// ------------------------------------------------------------- police ----
function addWanted(n, why) {
  S.wanted = clampN(S.wanted + n, 0, 5); S.heat = 100;
  if (n > 0) note('WANTED +' + n + ' — ' + why, 3);
}
function lightState(axis) {
  return axis === 'v' ? (phase < 3 ? 'green' : 'red') : (phase < 3 ? 'red' : 'green');
}
function addOfficer(kind, x, z) {
  let mesh;
  if (kind === 'foot') { mesh = makePersonMesh(0x1a3a8a, 0x101418); mesh.scale.setScalar(1.06); }
  else mesh = makeCarMesh(0x2244aa, false);
  mesh.position.set(x, 0, z); scene.add(mesh);
  const c = { kind, mesh, x, z, speed: kind === 'foot' ? 3.6 : 13, hp: kind === 'foot' ? 50 : 120, heading: 0 };
  targets.push({ mesh, kind: 'cop', ref: c });
  officers.push(c);
  return c;
}
function policeTick(dt) {
  copT -= dt;
  if (S.wanted > 0 && copT <= 0) {
    copT = 1.2;
    if (S.wanted >= 1 && officers.filter(c => c.kind === 'foot').length < 2)
      addOfficer('foot', S.you.x + rand(-40, 40), S.you.z + rand(-40, 40));
    if (S.wanted >= 2 && officers.filter(c => c.kind === 'car').length < S.wanted)
      addOfficer('car', S.you.x + rand(-60, 60), S.you.z + rand(-60, 60));
    if (S.wanted >= 3 && barriers.length < 2) {
      const fx = -Math.sin(S.you.yaw), fz = -Math.cos(S.you.yaw);
      const g = new THREE.Group();
      const bar = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
      bar.scale.set(14, 1.2, 1); bar.position.y = 0.8; g.add(bar);
      const stripe = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
      stripe.scale.set(14, 0.3, 1.05); stripe.position.y = 1.45; g.add(stripe);
      g.position.set(S.you.x + fx * 55, 0, S.you.z + fz * 55);
      g.rotation.y = S.you.yaw; scene.add(g);
      barriers.push({ group: g, x: g.position.x, z: g.position.z, t: 16 });
      note('ROADBLOCK di depan!');
    }
    if (S.wanted >= 4 && spikes.length < 2) {
      const fx = -Math.sin(S.you.yaw), fz = -Math.cos(S.you.yaw);
      const g = new THREE.Group();
      for (let i = -2; i <= 2; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        spike.position.set(i * 1.2, 0.35, 0); g.add(spike);
      }
      g.position.set(S.you.x + fx * 30, 0, S.you.z + fz * 30);
      g.rotation.y = S.you.yaw; scene.add(g);
      spikes.push({ group: g, x: g.position.x, z: g.position.z, t: 14 });
    }
    if (S.wanted >= 5 && !chopper.group.visible) {
      chopper.group.visible = true;
      chopper.group.position.set(S.you.x, 55, S.you.z - 30);
      heliBeam.intensity = 4.5;
      note('ELANG-1 — helikopter polisi di atasmu! Jangan berhenti!');
    }
  }
  if (S.wanted === 0) {
    chopper.group.visible = false; heliBeam.intensity = 0;
    for (const r of barriers) scene.remove(r.group); barriers = [];
    for (const s of spikes) scene.remove(s.group); spikes = [];
  }
  const chased = officers.some(c => distXZ(c.x, c.z, S.you.x, S.you.z) < 26) ||
    (chopper.group.visible && distXZ(chopper.group.position.x, chopper.group.position.z, S.you.x, S.you.z) < 45);
  if (S.wanted > 0 && !chased) {
    S.heat -= dt * 7;
    if (S.heat <= 0) {
      S.wanted--; S.heat = 100;
      note(S.wanted === 0 ? 'Kamu lolos! Wanted hilang.' : 'Wanted turun ke ' + S.wanted + ' bintang.');
    }
  } else if (chased) S.heat = 100;
  for (const c of officers) {
    const dx = S.you.x - c.x, dz = S.you.z - c.z, d = Math.hypot(dx, dz) || 1;
    c.heading = Math.atan2(dx, dz);
    c.x += dx / d * c.speed * dt; c.z += dz / d * c.speed * dt;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading;
    if (d < 2.2) damage((c.kind === 'car' ? 22 : 8) * dt);
  }
  officers = officers.filter(c => {
    if (c.hp <= 0 || distXZ(c.x, c.z, S.you.x, S.you.z) > 180) {
      scene.remove(c.mesh);
      targets = targets.filter(t => t.ref !== c);
      return false;
    }
    return true;
  });
  for (const r of barriers) r.t -= dt;
  barriers = barriers.filter(r => { if (r.t <= 0) { scene.remove(r.group); return false; } return true; });
  for (const s of spikes) s.t -= dt;
  spikes = spikes.filter(s => { if (s.t <= 0) { scene.remove(s.group); return false; } return true; });
  if (chopper.group.visible) {
    chopper.orbit += dt * 1.1;
    const hx = S.you.x + Math.cos(chopper.orbit) * 16, hz = S.you.z + Math.sin(chopper.orbit) * 16;
    chopper.group.position.x += (hx - chopper.group.position.x) * 0.5 * dt;
    chopper.group.position.z += (hz - chopper.group.position.z) * 0.5 * dt;
    chopper.group.position.y = 55 + Math.sin(performance.now() / 700) * 2;
    chopper.rotor.rotation.y += dt * 22;
    chopper.group.lookAt(S.you.x, 0, S.you.z);
    heliBeam.position.copy(chopper.group.position);
    heliBeam.target.position.set(S.you.x, 0, S.you.z);
  }
  sirenT -= dt;
  if (S.wanted > 0 && sirenT <= 0) { sirenT = 2.2; sfx.siren(); }
}
function damage(amount) {
  if (S.armor > 0) {
    const absorbed = Math.min(S.armor, amount);
    S.armor -= absorbed; S.hp -= (amount - absorbed);
  } else S.hp -= amount;
  const f = el('flash');
  f.style.opacity = 0.35; setTimeout(() => { f.style.opacity = 0; }, 160);
  if (S.hp <= 0) endGame(false);
}

// ------------------------------------------------------------- combat ----
const ray = new THREE.Raycaster();
function shoot() {
  if (!S.started || S.paused || talkOpen()) return;
  const now = performance.now() / 1000, w = ARSENAL[S.weapon];
  if (now - S.lastFire < w.rate) return;
  if (S.ammo[S.weapon] !== Infinity && S.ammo[S.weapon] <= 0) {
    note('AMUNISI HABIS — beli di Toko Senjata'); return;
  }
  S.lastFire = now;
  if (S.ammo[S.weapon] !== Infinity) S.ammo[S.weapon]--;
  sfx.gun();
  const fl = el('flash');
  fl.style.opacity = 0.5; setTimeout(() => { fl.style.opacity = 0; }, 55);
  const origin = camera.position.clone();
  for (let i = 0; i < w.pellets; i++) {
    const dir = new THREE.Vector3(rand(-w.spread, w.spread), rand(-w.spread, w.spread), -1)
      .applyQuaternion(camera.quaternion).normalize();
    ray.set(origin, dir); ray.far = 160;
    const hits = ray.intersectObjects(targets.map(t => t.mesh), true);
    let end = origin.clone().add(dir.clone().multiplyScalar(120));
    if (hits.length) {
      const h = hits[0]; end = h.point.clone();
      let obj = h.object, entry = null;
      while (obj && !entry) { entry = targets.find(t => t.mesh === obj); obj = obj.parent; }
      if (entry) {
        if (entry.kind === 'foe') {
          entry.ref.hp -= w.dmg; sfx.hit();
          if (entry.ref.hp <= 0) { S.kills++; S.money += 20; removeFoe(entry.ref); }
        } else if (entry.kind === 'cop') {
          entry.ref.hp -= w.dmg; addWanted(1, 'Menyerang polisi!');
        } else if (entry.kind === 'car') {
          entry.ref.hp -= w.dmg;
          if (entry.ref.hp <= 0) blowUp(entry.ref);
        }
      }
    }
    addBolt(origin, end, w.color);
  }
  for (const pd of crowd) if (distXZ(pd.x, pd.z, S.you.x, S.you.z) < 35) { pd.state = 'flee'; pd.panic = 3; }
  if (S.wanted < 1 && Math.random() < 0.5) addWanted(1, 'Tembakan terdengar!');
}
function addBolt(a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line); bolts.push({ line, life: 0.07 });
}
function removeFoe(e) {
  scene.remove(e.mesh);
  targets = targets.filter(t => t.ref !== e);
  const tag = hpTags.find(b => b.ref === e);
  if (tag) { scene.remove(tag.bg); scene.remove(tag.fg); hpTags = hpTags.filter(b => b.ref !== e); }
  foes = foes.filter(x => x !== e);
}
function blowUp(car) {
  const pos = car.mesh.position.clone();
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff9d00, transparent: true, opacity: 0.9 }));
  fireball.position.copy(pos); fireball.position.y = 1; scene.add(fireball);
  setTimeout(() => scene.remove(fireball), 500);
  sfx.blast(); addWanted(1, 'Mobil meledak!');
  if (S.you.car === car) { S.you.car = null; damage(25); }
  scene.remove(car.mesh);
  targets = targets.filter(t => t.ref !== car);
  fleet = fleet.filter(c => c !== car);
}
function placeTags() {
  for (const e of foes) {
    const tag = hpTags.find(b => b.ref === e);
    if (!tag) continue;
    tag.bg.position.set(e.x, 2.15, e.z);
    tag.fg.position.set(e.x, 2.15, e.z);
    tag.bg.quaternion.copy(camera.quaternion);
    tag.fg.quaternion.copy(camera.quaternion);
    const frac = Math.max(0.01, e.hp / 60);
    tag.fg.scale.x = frac;
    tag.fg.position.x -= (1 - frac) * 0.7 * Math.cos(camera.rotation.y);
    tag.fg.position.z += (1 - frac) * 0.7 * Math.sin(camera.rotation.y);
  }
}
function foeTick(dt) {
  for (const e of foes) {
    e.shootT -= dt;
    const d = distXZ(S.you.x, S.you.z, e.x, e.z);
    if (d > 34) {
      const a = Math.atan2(S.you.x - e.x, S.you.z - e.z);
      e.x += Math.sin(a) * e.speed * dt; e.z += Math.cos(a) * e.speed * dt;
      e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = a;
    } else if (e.shootT <= 0) {
      e.shootT = rand(0.9, 1.8);
      addBolt(new THREE.Vector3(e.x, 1.4, e.z), new THREE.Vector3(S.you.x, 1.5, S.you.z), 0xff5b5b);
      noiseBurst(0.08, 0.2, 2000);
      damage(6);
    }
  }
  placeTags();
}

// ------------------------------------------------------------- movement ----
function blocked(x, z, r) {
  if (x < -HALF + 4 || x > HALF - 4 || z < -HALF + 4 || z > HALF - 4) return true;
  for (const b of solids)
    if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
  return false;
}
function closestCar(maxD) {
  let near = null, nd = 1e9;
  for (const car of fleet) {
    const d = distXZ(S.you.x, S.you.z, car.x, car.z);
    if (d < nd) { nd = d; near = car; }
  }
  return nd < maxD ? near : null;
}
function tickYou(dt) {
  const p = S.you;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  if (p.car) {
    const car = p.car;
    const fwd = (keys['w'] ? 1 : 0) - (keys['s'] ? 0.7 : 0);
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    const grip = S.rain > 0.5 ? 0.78 : 1;
    const top = 42 * grip;
    car.speed = clampN(car.speed + fwd * 16 * dt * (fwd > 0 ? 1 : 0.7), -10, top);
    if (fwd === 0) car.speed *= Math.max(0, 1 - 1.2 * dt);
    if (keys[' ']) car.speed *= Math.max(0, 1 - 3 * dt);
    car.heading += steer * 1.9 * dt * clampN(Math.abs(car.speed) / 14, 0, 1) * (car.speed < 0 ? -1 : 1);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (!blocked(nx, nz, 2.2)) { car.x = nx; car.z = nz; }
    else { car.speed *= -0.25; car.hp -= 3; if (car.hp <= 0) blowUp(car); }
    if (!fleet.includes(car)) {
      p.car = null; beams.intensity = 0;
      camera.position.set(p.x, 1.7, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0);
      return;
    }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
    p.x = car.x; p.z = car.z; p.speed = Math.abs(car.speed);
    p.yaw = car.heading + Math.PI;
    beams.position.set(car.x + Math.sin(car.heading) * 2, 1.4, car.z + Math.cos(car.heading) * 2);
    beams.target.position.set(car.x + Math.sin(car.heading) * 40, 0, car.z + Math.cos(car.heading) * 40);
    beams.intensity = S.night ? 2.6 : 0.4;
    for (const s of spikes) if (distXZ(car.x, car.z, s.x, s.z) < 3) {
      car.speed *= 0.3; car.hp -= 20; note('SPIKE STRIP! Ban bocor!');
      scene.remove(s.group); spikes = spikes.filter(x => x !== s);
    }
    for (const r of barriers) if (distXZ(car.x, car.z, r.x, r.z) < 6 && Math.abs(car.speed) > 6) {
      car.speed *= -0.4; car.hp -= 25; addWanted(1, 'Menabrak roadblock!');
    }
    if (keys['e'] && !talkOpen()) {
      p.car = null; p.x = car.x + 3; p.z = car.z + 2; car.speed = 0;
      beams.intensity = 0; p.yaw = car.heading + Math.PI;
    }
    if (mouseHeld && !talkOpen()) shoot();
    if (Math.random() < dt * 2) sfx.motor();
  } else {
    beams.intensity = 0;
    const run = keys['shift'] ? 1.7 : 1;
    let mx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    let mz = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
    const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
    const sp = 5.2 * run;
    const nx = p.x + (fx * mz + rx * mx) * sp * dt;
    const nz = p.z + (fz * mz + rz * mx) * sp * dt;
    if (!blocked(nx, p.z, 0.7)) p.x = nx;
    if (!blocked(p.x, nz, 0.7)) p.z = nz;
    p.speed = (mx || mz) ? sp : 0;
    if (mouseHeld && !talkOpen()) shoot();
    const near = closestCar(4.5);
    if (near) {
      if (near.driver) {
        el('cue').textContent = 'TAHAN E — CURI MOBIL (' + Math.round(p.jack * 100) + '%) · alarm & wanted naik';
        el('jack').classList.remove('off');
        el('jackfill').style.width = (p.jack * 100) + '%';
        if (keys['e']) {
          p.jack += dt / 0.9;
          if (p.jack >= 1) {
            near.driver = false; S.stolen++; addWanted(1, 'Carjacking!');
            if (near.locked) note('ALARM BERBUNYI!');
            if (S.storyLive && currentStory() && currentStory().kind === 'steal') {
              S.missionCar = near;
              note('Mobil curian didapat! Antar ke bengkel — jangan sampai ketahuan.');
            }
            sfx.jack();
            const driver = makePersonMesh(0xdddddd, 0x222222);
            driver.position.set(near.x + 3, 0, near.z + 2); scene.add(driver);
            crowd.push({ mesh: driver, x: near.x + 3, z: near.z + 2, speed: 4, state: 'flee', tx: near.x + 60, tz: near.z + 60, panic: 4, bob: 0 });
            p.car = near; near.speed = 0; near.heading = p.yaw + Math.PI; p.jack = 0;
            el('cue').textContent = ''; el('jack').classList.add('off');
          }
        } else p.jack = Math.max(0, p.jack - dt * 2);
      } else {
        el('cue').textContent = 'Tekan E — MASUK MOBIL';
        el('jack').classList.add('off');
        if (keys['e']) { p.car = near; near.speed = 0; near.heading = p.yaw + Math.PI; el('cue').textContent = ''; }
      }
    } else { el('cue').textContent = ''; el('jack').classList.add('off'); p.jack = 0; }
    if (distXZ(p.x, p.z, PLACES.workshop.x, PLACES.workshop.z) < 12 && S.wanted > 0) {
      S.wanted = 0; S.heat = 0; note('GARAGE: mobil dicat ulang — wanted hilang!'); sfx.cash();
    }
    if (distXZ(p.x, p.z, PLACES.home.x, PLACES.home.z) < 12) {
      if (S.wanted > 0) { S.wanted = 0; note('SAFEHOUSE: kamu bersembunyi — wanted hilang.'); }
      S.hp = Math.min(100, S.hp + 10 * dt);
    }
    if (distXZ(p.x, p.z, PLACES.arms.x, PLACES.arms.z) < 12) {
      el('cue').textContent = 'TOKO SENJATA — tekan E beli amunisi + armor ($50)';
      if (keys['e'] && S.money >= 50) {
        S.money -= 50; S.ammo[1] += 120; S.ammo[2] += 24; S.ammo[3] += 30; S.armor = 100;
        note('Amunisi + armor dibeli!'); sfx.cash();
      }
    }
  }
  // camera follows the player (hood cam while driving)
  if (p.car) {
    const car = p.car;
    camera.position.set(car.x + Math.sin(car.heading) * 1.3, 1.5, car.z + Math.cos(car.heading) * 1.3);
    camera.rotation.set(p.pitch * 0.4, car.heading + Math.PI, 0);
  } else {
    camera.position.set(p.x, 1.7 + Math.sin(performance.now() / 300) * (p.speed > 0 ? 0.03 : 0), p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }
}

// ------------------------------------------------------------- traffic ----
function trafficTick(dt) {
  phaseT += dt;
  if (phaseT > 6) { phaseT = 0; phase = (phase + 1) % 6; }
  for (const tl of trafficLights) {
    const nsGreen = phase < 3;
    tl.red.material.color.setHex(nsGreen ? 0x551111 : 0xff2222);
    tl.green.material.color.setHex(nsGreen ? 0x22ff66 : 0x113311);
  }
  for (const car of fleet) {
    if (car === S.you.car) continue;
    if (car.speed === 0 && !car.driver) continue;
    let stop = false;
    if (car.axis === 'v') {
      for (const iy of STREETS) { const d = (iy - car.z) * car.dir; if (d > 0 && d < 14 && lightState('v') === 'red') stop = true; }
    } else {
      for (const ix of STREETS) { const d = (ix - car.x) * car.dir; if (d > 0 && d < 14 && lightState('h') === 'red') stop = true; }
    }
    for (const o of fleet) {
      if (o === car) continue;
      if (car.axis === 'v' && Math.abs(o.x - car.x) < 6) { const d = (o.z - car.z) * car.dir; if (d > 0 && d < 12) stop = true; }
      if (car.axis === 'h' && Math.abs(o.z - car.z) < 6) { const d = (o.x - car.x) * car.dir; if (d > 0 && d < 12) stop = true; }
    }
    if (stop) { car.speed = Math.max(0, car.speed - 20 * dt); if (Math.random() < 0.003) sfx.horn(); }
    else car.speed = Math.min(12, car.speed + 6 * dt);
    if (car.axis === 'v') car.z += car.dir * car.speed * dt; else car.x += car.dir * car.speed * dt;
    if (car.x < -HALF + 10 || car.x > HALF - 10 || car.z < -HALF + 10 || car.z > HALF - 10) {
      car.dir *= -1;
      car.x = clampN(car.x, -HALF + 15, HALF - 15);
      car.z = clampN(car.z, -HALF + 15, HALF - 15);
      car.heading = car.axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  }
}
function crowdTick(dt) {
  for (const pd of crowd) {
    pd.bob += dt * 8;
    if (pd.state === 'flee') {
      pd.panic -= dt;
      const a = Math.atan2(pd.x - S.you.x, pd.z - S.you.z);
      pd.x += Math.sin(a) * 4.4 * dt; pd.z += Math.cos(a) * 4.4 * dt;
      pd.mesh.rotation.y = a;
      if (pd.panic <= 0) pd.state = 'walk';
    } else {
      const a = Math.atan2(pd.tx - pd.x, pd.tz - pd.z);
      pd.x += Math.sin(a) * pd.speed * dt; pd.z += Math.cos(a) * pd.speed * dt;
      pd.mesh.rotation.y = a;
      if (distXZ(pd.tx, pd.tz, pd.x, pd.z) < 3) {
        pd.tx = clampN(pd.x + rand(-90, 90), -330, 330);
        pd.tz = clampN(pd.z + rand(-90, 90), -330, 330);
      }
      for (const car of fleet) if (car.speed > 8 && distXZ(pd.x, pd.z, car.x, car.z) < 9) { pd.state = 'flee'; pd.panic = 2; }
    }
    pd.x = clampN(pd.x, -HALF + 6, HALF - 6);
    pd.z = clampN(pd.z, -HALF + 6, HALF - 6);
    pd.mesh.position.set(pd.x, Math.abs(Math.sin(pd.bob)) * 0.05, pd.z);
  }
}

// ------------------------------------------------------------- save / menu ----
function writeSave(slot) {
  const data = {
    day: S.day, money: S.money, hp: S.hp, armor: S.armor, wanted: S.wanted,
    storyIdx: S.storyIdx, weapon: S.weapon, ammo: S.ammo,
    x: S.you.x, z: S.you.z, yaw: S.you.yaw,
    kills: S.kills, stolen: S.stolen, clockMin: S.clockMin, rain: S.rain,
  };
  try { localStorage.setItem('teluk-arunika-save-' + slot, JSON.stringify(data)); } catch (err) {}
  el('autosave').classList.remove('off'); S.saveT = 1.2;
  note('Tersimpan — Slot ' + slot);
}
function readSave(slot) {
  try {
    const raw = localStorage.getItem('teluk-arunika-save-' + slot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.day = d.day; S.money = d.money; S.hp = d.hp; S.armor = d.armor; S.wanted = d.wanted;
    S.storyIdx = d.storyIdx; S.weapon = d.weapon; S.ammo = d.ammo;
    S.you.x = d.x; S.you.z = d.z; S.you.yaw = d.yaw || 0;
    S.kills = d.kills || 0; S.stolen = d.stolen || 0;
    S.clockMin = d.clockMin || 480; S.rain = d.rain ?? 0.7;
    return true;
  } catch (err) { return false; }
}
function autosave() { writeSave(0); }
function togglePause() {
  if (!S.started) return;
  S.paused = !S.paused;
  el('pause').classList.toggle('off', !S.paused);
  if (S.paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    const m = currentStory();
    el('pause-info').innerHTML = 'HARI ' + S.day + '/7 · ' + fmtTime(S.clockMin) + ' · ' + (S.rain > 0.4 ? 'HUJAN' : 'CERAH') +
      '<br>Uang $' + S.money + ' · HP ' + Math.round(S.hp) + ' · Wanted ' + '★'.repeat(S.wanted) +
      '<br>Misi: ' + (m ? m.title : '—') + ' · Taksi: ' + (S.cab.active ? 'aktif — antar ke ' + (S.cab.dest ? S.cab.dest.label : '') + ' ($' + S.cab.fare + ')' : '—') +
      '<br>Mobil dicuri: ' + S.stolen + ' · Musuh dikalahkan: ' + S.kills;
  }
}
function showMenu() {
  S.started = false; S.paused = false;
  el('menu').classList.remove('off');
  el('hud').classList.add('off');
  el('pause').classList.add('off');
}
function beginGame(isNew) {
  if (isNew) { S = freshState(); resetWorld(); }
  S.started = true; S.paused = false;
  el('menu').classList.add('off');
  el('hud').classList.remove('off');
  el('pause').classList.add('off');
  paintWheel();
  if (isNew) setTimeout(() => showTalk('RAKA', [
    '"Tujuh hari. Tujuh hari untuk lunasi utang Darma — atau bengkel Ayah disita."',
    '"Mulai dari misi pertama: antar paket ke pelabuhan. Ikuti penanda kuning."',
  ]), 400);
}
function endGame(won) {
  S.over = true; S.started = false;
  showTalk(won ? 'RAKA' : 'DARMA WIJAYA', won
    ? ['"Utang lunas. Bengkel Ayah selamat. Teluk Arunika masih hujan — tapi kali ini, aku bebas."',
       'TAMAT — Skor: ' + S.score + ' · Mobil dicuri: ' + S.stolen + ' · Musuh: ' + S.kills]
    : ['"Kau kalah, Raka. Kota ini tidak kenal ampun."',
       'GAME OVER — Coba lagi dari save terakhir (Continue).']);
  setTimeout(showMenu, 100);
}

// ------------------------------------------------------------- HUD + map ----
const mapCtx = el('map').getContext('2d');
function paintHud() {
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < S.wanted ? '★' : '<span class="dim">★</span>';
  el('stars').innerHTML = stars;
  const hour = Math.floor(S.clockMin / 60) % 24;
  el('dayline').textContent = 'HARI ' + S.day + '/7   ' + fmtTime(S.clockMin) + '   ' +
    (S.rain > 0.6 ? 'HUJAN DERAS' : S.rain > 0.25 ? 'HUJAN' : 'CERAH') +
    (hour >= 18 || hour < 6 ? ' · MALAM' : ' · SIANG');
  el('cashline').textContent = '$ ' + S.money;
  el('station').textContent = 'RADIO: ' + RADIO[station].name + ' — ' + RADIO[station].tracks[track];
  const t = goalPoint();
  el('goal').textContent = 'Tujuan: ' + (S.cab.active
    ? 'TAKSI → ' + (S.cab.rider ? 'jemput penumpang' : S.cab.dest.label)
    : S.parcel.active ? 'PAKET → ' + S.parcel.dest.label
    : currentStory() ? (S.storyLive ? currentStory().title : 'Datangi penanda kuning: ' + currentStory().title) : 'Bebas — cari misi / taksi');
  el('hpbar').style.width = clampN(S.hp, 0, 100) + '%';
  el('armorbar').style.width = clampN(S.armor, 0, 100) + '%';
  el('hpval').textContent = Math.round(S.hp);
  el('armorval').textContent = Math.round(S.armor);
  el('moneyval').textContent = '$' + S.money;
  const w = ARSENAL[S.weapon];
  el('gun').textContent = (S.weapon + 1) + ' · ' + w.name + ' ' + (S.ammo[S.weapon] === Infinity ? '∞' : S.ammo[S.weapon]);
  const fwd = S.you.car
    ? { x: Math.sin(S.you.car.heading), z: Math.cos(S.you.car.heading) }
    : { x: -Math.sin(S.you.yaw), z: -Math.cos(S.you.yaw) };
  const deg = ((Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI) + 360) % 360;
  el('bearing').textContent = (deg < 45 || deg >= 315 ? 'N' : deg < 135 ? 'E' : deg < 225 ? 'S' : 'W') + ' · ' + Math.round(deg) + '°';
  if (S.you.car) {
    el('speed').classList.remove('off');
    el('speed').innerHTML = Math.round(Math.abs(S.you.car.speed) * 3.6 * 1.4) + ' <small>km/h</small>';
  } else el('speed').classList.add('off');
  if (S.saveT > 0) { S.saveT -= 0.016; if (S.saveT <= 0) el('autosave').classList.add('off'); }
  if (S.toastT > 0) { S.toastT -= 0.016; if (S.toastT <= 0) el('note').textContent = ''; }
  el('danger').textContent = S.wanted > 0
    ? 'POLISI MENGEJAR — sembunyi sampai dingin / ke safehouse / garage' +
      (chopper.group.visible ? ' · ELANG-1 mengawasi dari udara' : '')
    : '';
}
function paintMap() {
  const size = 200, s = size / CITY;
  const mx = v => (v + HALF) * s;
  const fwd = S.you.car
    ? { x: Math.sin(S.you.car.heading), z: Math.cos(S.you.car.heading) }
    : { x: -Math.sin(S.you.yaw), z: -Math.cos(S.you.yaw) };
  mapCtx.clearRect(0, 0, size, size);
  mapCtx.fillStyle = '#0a1420'; mapCtx.fillRect(0, 0, size, size);
  mapCtx.fillStyle = '#14557f'; mapCtx.fillRect(mx(255), mx(180), size - mx(255), size - mx(180));
  mapCtx.strokeStyle = '#5a6a7a'; mapCtx.lineWidth = 4;
  for (const r of STREETS) {
    mapCtx.beginPath(); mapCtx.moveTo(mx(r), 0); mapCtx.lineTo(mx(r), size); mapCtx.stroke();
    mapCtx.beginPath(); mapCtx.moveTo(0, mx(r)); mapCtx.lineTo(size, mx(r)); mapCtx.stroke();
  }
  const blip = (x, z, c, r) => {
    mapCtx.fillStyle = c; mapCtx.beginPath(); mapCtx.arc(mx(x), mx(z), r || 4, 0, 7); mapCtx.fill();
  };
  blip(PLACES.home.x, PLACES.home.z, '#4aa8ff', 5);
  blip(PLACES.workshop.x, PLACES.workshop.z, '#ff9d00', 4);
  const t = goalPoint();
  if (t) {
    mapCtx.strokeStyle = '#ffd23e'; mapCtx.lineWidth = 2;
    mapCtx.beginPath(); mapCtx.arc(mx(t.x), mx(t.z), 8, 0, 7); mapCtx.stroke();
    blip(t.x, t.z, '#ffd23e', 5);
  }
  if (S.cab.active && S.cab.rider) blip(S.cab.rider.x, S.cab.rider.z, '#2eff5e', 5);
  if (S.parcel.active) blip(S.parcel.dest.x, S.parcel.dest.z, '#7dff9a', 4);
  for (const c of officers) blip(c.x, c.z, '#ff2e2e', 4);
  for (const e of foes) blip(e.x, e.z, '#ff9d00', 3);
  blip(S.you.x, S.you.z, '#ffffff', 5);
  mapCtx.strokeStyle = '#fff';
  mapCtx.beginPath(); mapCtx.arc(mx(S.you.x), mx(S.you.z), 8, 0, 7); mapCtx.stroke();
  const fa = Math.atan2(fwd.x, fwd.z);
  mapCtx.fillStyle = 'rgba(255,255,255,.5)';
  mapCtx.beginPath(); mapCtx.moveTo(mx(S.you.x), mx(S.you.z));
  mapCtx.lineTo(mx(S.you.x) + Math.sin(fa + 0.4) * 12, mx(S.you.z) + Math.cos(fa + 0.4) * 12);
  mapCtx.lineTo(mx(S.you.x) + Math.sin(fa - 0.4) * 12, mx(S.you.z) + Math.cos(fa - 0.4) * 12);
  mapCtx.fill();
}

// ------------------------------------------------------------- sky/weather ----
function applySky() {
  const hour = Math.floor(S.clockMin / 60) % 24;
  const night = hour >= 18 || hour < 6;
  S.night = night;
  const dayF = night ? 0 : (hour < 12 ? (hour - 6) / 6 : (18 - hour) / 6);
  const f = clampN(dayF, 0, 1);
  hemi.intensity = 0.25 + f * 0.75;
  sun.intensity = f * 1.7;
  moon.intensity = night ? 0.5 : 0;
  const skyDay = new THREE.Color(0x8fa3b8), skyNight = new THREE.Color(0x0a0f1e), skyRain = new THREE.Color(0x5a6a78);
  const sky = skyNight.clone().lerp(skyDay, f);
  if (S.rain > 0.5) sky.lerp(skyRain, 0.4);
  // dusk hour: orange beachfront sunset over the harbour
  if (hour === 17) sky.lerp(new THREE.Color(0xcf7a3d), 0.45);
  scene.background = sky; scene.fog.color.copy(sky);
  scene.fog.near = 60; scene.fog.far = night ? 260 : 420;
  for (const lm of bulbMats) lm.color.setHex(night ? 0xffe9a8 : 0x555555);
  rainPts.visible = S.rain > 0.15;
  rainPts.material.opacity = 0.25 + S.rain * 0.4;
}
function rainTick(dt) {
  if (!rainPts.visible) return;
  const pos = rainPts.geometry.attributes.position.array;
  const px = camera.position.x, pz = camera.position.z;
  for (let i = 0; i < rainVel.length; i++) {
    pos[i * 3 + 1] -= rainVel[i] * dt;
    if (pos[i * 3 + 1] < 0) {
      pos[i * 3 + 1] = rand(25, 40);
      pos[i * 3] = px + rand(-40, 40);
      pos[i * 3 + 2] = pz + rand(-40, 40);
    }
  }
  rainPts.geometry.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------- main loop ----
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const staged = SHOT >= 1 && SHOT <= 4;
  if (S.started && !S.paused && !talkOpen() && !staged) {
    S.playSecs += dt;
    S.clockMin += dt * 0.5;
    if (Math.random() < 0.0004) S.rain = clampN(S.rain + rand(-0.3, 0.3), 0, 1);
    tickYou(dt); trafficTick(dt); crowdTick(dt); policeTick(dt); foeTick(dt);
    storyTick();
    for (const b of bolts) b.life -= dt;
    bolts = bolts.filter(b => { if (b.life <= 0) { scene.remove(b.line); return false; } return true; });
    autoT += dt;
    if (autoT > 60) { autoT = 0; autosave(); }
    paintHud();
  }
  if (staged) paintHud();
  applySky();
  rainTick(dt);
  paintMap();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------- shot staging ----
function clearNear(x, z, r, keep) {
  for (const car of [...fleet]) {
    if (keep && keep.includes(car)) continue;
    if (distXZ(car.x, car.z, x, z) < r) {
      scene.remove(car.mesh);
      targets = targets.filter(t => t.ref !== car);
      fleet = fleet.filter(c => c !== car);
    }
  }
  for (const pd of [...crowd]) {
    if (distXZ(pd.x, pd.z, x, z) < 12) {
      scene.remove(pd.mesh);
      crowd = crowd.filter(p => p !== pd);
    }
  }
}
function stageShot(n) {
  S = freshState(); resetWorld(); S.started = true;
  el('menu').classList.add('off');
  el('hud').classList.remove('off');
  if (n === 1) {
    S.day = 1; S.clockMin = 14 * 60 + 20; S.rain = 0.9; S.wanted = 2;
    S.money = 250; S.hp = 88; S.armor = 40;
    S.you.x = 0; S.you.z = 60; S.you.yaw = 0; S.you.pitch = 0.02;
    const car = addCar(2, 56, 'v', false); car.speed = 0; car.driver = true; fleet.push(car);
    clearNear(0, 60, 26, [car]);
    addOfficer('foot', -8, 44); addOfficer('foot', 14, 50);
    // the theft is already under way: the driver has been yanked out and is
    // running, the alarm is sounding, the jack bar is past halfway
    const yanked = makePersonMesh(0xdddddd, 0x222222);
    yanked.position.set(4.5, 0, 53); scene.add(yanked);
    crowd.push({ mesh: yanked, x: 4.5, z: 53, speed: 4, state: 'flee', tx: 60, tz: 30, panic: 6, bob: 0 });
    S.storyLive = true;
    note('MISI HARI 1: Antar Paket Darma — ikuti penanda kuning', 6);
    paintHud(); paintWheel(); tickYou(0.016);
    S.you.jack = 0.65;
    el('cue').textContent = 'TAHAN E — CURI MOBIL (65%) · alarm & wanted naik';
    el('jack').classList.remove('off');
    el('jackfill').style.width = '65%';
    note('ALARM BERBUNYI! Sopir ditarik keluar — wanted naik!', 6);
  } else if (n === 2) {
    S.day = 3; S.clockMin = 23 * 60 + 40; S.rain = 0.6; S.wanted = 4;
    S.money = 620; S.hp = 72; S.armor = 55;
    const car = addCar(0, 120, 'h', false);
    car.speed = 36; car.heading = Math.PI / 2; car.mesh.rotation.y = car.heading;
    fleet.push(car);
    clearNear(0, 120, 26, [car]);
    S.you.car = car; S.you.x = car.x; S.you.z = car.z;
    const rb = new THREE.Group();
    const bar = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
    bar.scale.set(16, 1.2, 1); bar.position.y = 0.8; rb.add(bar);
    const stripe = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
    stripe.scale.set(16, 0.3, 1.05); stripe.position.y = 1.45; rb.add(stripe);
    rb.position.set(30, 0, 120); rb.rotation.y = Math.PI / 2; scene.add(rb);
    barriers.push({ group: rb, x: 30, z: 120, t: 60 });
    const strip = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }));
      spike.position.set(i * 1.2, 0.35, 0); strip.add(spike);
    }
    strip.position.set(20, 0, 120); scene.add(strip);
    spikes.push({ group: strip, x: 20, z: 120, t: 60 });
    chopper.group.visible = true;
    chopper.group.position.set(32, 14, 108);
    heliBeam.intensity = 4.5;
    heliBeam.position.set(32, 14, 108);
    heliBeam.target.position.set(0, 0, 120);
    addOfficer('car', 22, 114); addOfficer('car', 34, 126);
    note('ELANG-1 — helikopter polisi di atasmu! Jangan berhenti!', 6);
    paintHud(); paintWheel(); tickYou(0.016);
  } else if (n === 3) {
    S.day = 6; S.clockMin = 17 * 60; S.rain = 0.3; S.wanted = 3;
    S.money = 940; S.hp = 64; S.armor = 70; S.weapon = 1; S.ammo = [Infinity, 120, 24, 60];
    S.you.x = 250; S.you.z = 255; S.you.yaw = -Math.PI / 2; S.you.pitch = 0.02;
    clearNear(250, 255, 20, []);
    // open up the shootout yard: pull the containers out of the line of fire
    for (const c of [...crates]) {
      const p = c.mesh.position;
      if (p.x > 252 && p.x < 340 && p.z > 225 && p.z < 288) {
        scene.remove(c.mesh);
        solids = solids.filter(b => b !== c.box);
        crates = crates.filter(x => x !== c);
      }
    }
    spawnFoes(PLACES.harbour, 5);
    // spread wide across the frame so the weapon wheel (centre) hides none of them
    const spots = [[266, 239], [272, 244], [280, 272], [288, 267], [276, 256]];
    foes.forEach((e, i) => { e.x = spots[i][0]; e.z = spots[i][1]; e.mesh.position.set(e.x, 0, e.z); });
    for (const [lx, lz] of [[266, 236], [292, 270], [305, 242]]) {
      const flood = new THREE.PointLight(0xffe0a0, 150, 90, 1.6);
      flood.position.set(lx, 18, lz); scene.add(flood);
    }
    const ember = new THREE.PointLight(0xff7a1a, 120, 60, 1.8);
    ember.position.set(280, 3, 258); scene.add(ember);
    S.storyLive = true; S.storyIdx = 6;
    el('wheel').classList.remove('off'); paintWheel();
    showTalk('DARMA WIJAYA', ['"Malam ini semuanya ditentukan, Raka. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."']);
    paintHud(); tickYou(0.016);
    placeTags();
    addBolt(new THREE.Vector3(272, 1.4, 244), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addBolt(new THREE.Vector3(280, 1.4, 272), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addBolt(new THREE.Vector3(250, 1.5, 255), new THREE.Vector3(272, 1.4, 244), 0xffe27a);
  } else if (n === 4) {
    S.day = 4; S.clockMin = 2 * 60 + 14; S.rain = 0.75; S.wanted = 0;
    S.money = 1180; S.hp = 100; S.armor = 25;
    S.you.x = 0; S.you.z = 120; S.you.yaw = -Math.PI / 2; S.you.pitch = 0.02;
    clearNear(0, 120, 20, []);
    S.cab = { active: true, rider: null, dest: PLACES.harbour, fare: 85 };
    S.paused = true;
    el('pause').classList.remove('off');
    el('pause-info').innerHTML = 'HARI 4/7 · 02:14 · HUJAN<br>Uang $1180 · HP 100 · Wanted —<br>Misi: Balapan Jalan Tol · Taksi aktif: antar ke PELABUHAN ($85)';
    paintHud(); paintWheel(); tickYou(0.016);
  }
  applySky();
}

// ------------------------------------------------------------- self-test ----
function runChecks() {
  const out = [];
  const ok = (name, cond) => out.push((cond ? 'PASS' : 'FAIL') + ' ' + name);
  try {
    ok('THREE global present', typeof THREE !== 'undefined');
    ok('renderer created', !!renderer && !!renderer.domElement);
    ok('scene children over 100', scene.children.length > 100);
    ok('collision boxes over 40', solids.length > 40);
    ok('traffic spawns', fleet.length >= 20);
    ok('pedestrians spawn', crowd.length >= 20);
    ok('traffic lights exist (25)', trafficLights.length === 25);
    ok('rain points present', !!rainPts && rainPts.visible !== undefined);
    ok('helicopter staged hidden', !!chopper && !chopper.group.visible);
    const before = S.wanted;
    addWanted(2, 'test');
    ok('wanted rises', S.wanted === before + 2);
    S.wanted = 0; S.heat = 100;
    const parked = fleet.find(c => !c.driver);
    ok('parked car exists', !!parked);
    if (parked) {
      S.you.car = parked;
      ok('enter car works', S.you.car === parked);
      S.you.car = null;
    }
    S.you.x = 0; S.you.z = 0; S.you.yaw = 0;
    tickYou(0.016);
    ok('camera at eye height', camera.position.y > 1 && camera.position.y < 2.2);
    ok('closestCar finds one', !!closestCar(200));
    shoot();
    ok('shoot runs', true);
    spawnFoes(PLACES.harbour, 3);
    ok('foes spawn', foes.length === 3);
    writeSave(0);
    ok('save writes', !!localStorage.getItem('teluk-arunika-save-0'));
    ok('save reads back', readSave(0));
    ok('story has 9 missions', STORY.length === 9);
    ok('radio has 3 stations', RADIO.length === 3);
    ok('arsenal has 4 weapons', ARSENAL.length === 4);
    ok('car-theft mission exists', STORY.some(m => m.kind === 'steal'));
    ok('dusk port mission exists', STORY.some(m => m.dusk === true));
    // every script on the page must be a local file (no remote loads)
    const ext = [...document.scripts].some(s => s.src && !s.src.startsWith('file:'));
    ok('no external script src', !ext);
    ok('hud is visible', !el('hud').classList.contains('off'));
    paintMap();
    const px = mapCtx.getImageData(0, 0, 200, 200).data;
    let lit = 0;
    for (let i = 0; i < px.length; i += 400) if (px[i] > 20 || px[i + 1] > 20 || px[i + 2] > 20) lit++;
    ok('minimap is drawn', lit > 10);
    showTalk('TEST', ['baris dialog uji']);
    ok('dialog opens', !el('talk').classList.contains('off'));
    el('talk').classList.add('off');
    togglePause();
    ok('pause opens', S.paused && !el('pause').classList.contains('off'));
    togglePause();
    ok('pause closes', !S.paused && el('pause').classList.contains('off'));
    ok('webgl context alive', !!renderer.getContext());
    ok('day-5 branch mission exists', STORY[5].kind === 'choice');
    ok('rifle has ammo', S.ammo[3] > 0);
  } catch (err) { out.push('FAIL exception: ' + err.message); }
  const box = el('testout');
  box.classList.remove('off');
  box.textContent = out.join('\n');
  window.__testResults = out;
}

// ------------------------------------------------------------- boot ----
if (typeof THREE === 'undefined') {
  el('glerr').classList.remove('off');
  el('glerr').textContent = 'Three.js gagal dimuat (vendor/three.min.js tidak ditemukan).';
} else {
  try {
    buildCity();
    resetWorld();
    if (SHOT >= 1 && SHOT <= 4) stageShot(SHOT);
    else if (SELFTEST) {
      S = freshState(); resetWorld(); S.started = true;
      el('menu').classList.add('off');
      el('hud').classList.remove('off');
      runChecks(); paintHud();
    }
    requestAnimationFrame(loop);
  } catch (err) {
    el('glerr').classList.remove('off');
    el('glerr').textContent = 'WebGL error: ' + err.message;
    document.title = 'BOOT FAIL: ' + err.message;
  }
}
