// TELUK ARUNIKA: 7 Hari Utang — first-person 3D open-world crime game.
// Built for the make.fun bounty gta6-01. Three.js r160 vendored locally.
// Raka, a taxi driver, has 7 days to settle a debt with crime boss Darma Wijaya
// or lose his father's workshop. Fictional rainy tropical port city; all
// characters, story and art are original. No network requests at runtime:
// procedural canvas textures only, synthesized WebAudio only. Saves in localStorage.
'use strict';
const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const SHOT = parseInt(qs.get('shot') || '0', 10);
const TEST = qs.get('test') === '1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// ---------- synthesized audio (WebAudio, created on first user gesture) ----------
let AC = null, master = null, radioTimer = null, radioNote = 0;
function audioCtx() {
  if (AC) return AC;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.22; master.connect(AC.destination);
  } catch (e) { AC = null; }
  return AC;
}
function tone(freq, dur, type, vol, slideTo) {
  if (!audioCtx()) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, AC.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), AC.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.15, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(AC.currentTime + dur);
  } catch (e) {}
}
function hiss(dur, vol, cutoff) {
  if (!audioCtx()) return;
  try {
    const len = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = AC.createBufferSource(); s.buffer = buf;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    const g = AC.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start();
  } catch (e) {}
}
const sfx = {
  shot() { hiss(0.12, 0.5, 2500); tone(180, 0.08, 'square', 0.2, 60); },
  hit() { tone(220, 0.1, 'sawtooth', 0.2, 90); },
  siren() { tone(750, 0.5, 'sine', 0.06, 1150); },
  horn() { tone(330, 0.25, 'square', 0.1, 300); },
  cash() { tone(880, 0.08, 'sine', 0.2); setTimeout(() => tone(1320, 0.14, 'sine', 0.2), 90); },
  jack() { tone(140, 0.3, 'sawtooth', 0.2, 70); },
  boom() { hiss(0.7, 0.6, 500); tone(60, 0.6, 'sine', 0.4, 30); },
  click() { tone(600, 0.05, 'square', 0.1); },
  engine() { tone(70, 0.15, 'sawtooth', 0.05, 110); },
};
const STATIONS = [
  { name: 'DANGDUT NEON FM', songs: ['Rindu Pelabuhan — Sari Melati', 'Hujan di Teluk — Duo Arunika', 'Neon Malam — Bang Jago'] },
  { name: 'LO-FI HUJAN 88.4', songs: ['Gerimis Pagi — Hujan Kota', 'Kopi & Aspal Basah — Nara', 'Jendela Berembun — Lofi Teluk'] },
  { name: 'BERITA KOTA ARUNIKA', songs: ['Laporan Lalu Lintas Pelabuhan', 'Waspada: Pencurian Mobil Meningkat', 'Cuaca: Monsun Berlanjut Seminggu'] },
];
let radioOn = true, stationIdx = 0, songIdx = 0;
function radioTick() {
  if (!radioOn || !audioCtx()) return;
  const scale = stationIdx === 0 ? [262, 294, 330, 392, 440] : stationIdx === 1 ? [220, 262, 330, 392] : [330, 392, 440, 523];
  tone(scale[radioNote % scale.length], 0.22, stationIdx === 0 ? 'triangle' : 'sine', 0.045);
  radioNote++;
}
function startRadio() { if (radioTimer) return; radioTimer = setInterval(radioTick, 420); }

// ---------- city layout + story data ----------
const CITY = 720, HALF = CITY / 2;
const AVENUES = [-240, -120, 0, 120, 240];
const LANE = 18;
const SPOTS = {
  safehouse: { x: -285, z: -285, name: 'SAFEHOUSE — Rumah Raka' },
  garage: { x: 170, z: -285, name: 'GARAGE — Bengkel Ayah' },
  gunshop: { x: -120, z: 120, name: 'TOKO SENJATA' },
  port: { x: 300, z: 255, name: 'PELABUHAN' },
  market: { x: 0, z: 120, name: 'PASAR ARUNIKA' },
  taxiStand: { x: -120, z: -240, name: 'PANGKALAN TAKSI' },
};
const MISSIONS = [
  { day: 1, title: 'Antar Paket Darma', brief: 'Darma: "Raka. Paket ini harus sampai ke pelabuhan sebelum tengah malam. Jangan buka. Jangan tanya."', goal: SPOTS.port, kind: 'go', pay: 150 },
  { day: 2, title: 'Taksi Terakhir', brief: 'Raka: "Satu shift taksi lagi. Penumpang ke pasar, lalu ke pelabuhan. Uang receh, tapi halal."', goal: SPOTS.market, kind: 'taxi', pay: 120 },
  { day: 3, title: 'Tagih Utang Joni', brief: 'Darma: "Joni ngumpet di gang pasar. Ambil uangnya. Kalau melawan, kau tahu caranya."', goal: SPOTS.market, kind: 'shootout', pay: 250 },
  { day: 4, title: 'Balapan Jalan Tol', brief: 'Raka: "Balapan liar di jalan tol layang. Hadiahnya besar — cukup untuk cicil utang."', goal: { x: 270, z: -270, name: 'GARIS START BALAPAN' }, kind: 'race', pay: 400 },
  { day: 5, title: 'Pilihan: Bayar atau Khianat', brief: 'Darma: "Besok jatuh tempo, Raka. Bayar aku — atau bantu aku sekali lagi, dan utangmu lunas. Pilih."', goal: SPOTS.garage, kind: 'choice', pay: 0 },
  { day: 6, title: 'Serbuan Pelabuhan', brief: 'Raka: "Malam ini semuanya ditentukan. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."', goal: SPOTS.port, kind: 'shootout', pay: 500 },
  { day: 7, title: 'Hari Terakhir', brief: 'Darma: "Tujuh hari habis, Raka. Bengkel ayahmu… atau kebebasanmu. Datang ke safehouse. Sendirian."', goal: SPOTS.safehouse, kind: 'finale', pay: 800 },
];
const WEAPONS = [
  { name: 'PISTOL', dmg: 26, rate: 0.28, ammo: Infinity, pellets: 1, spread: 0.012, color: 0xffd23e },
  { name: 'SMG', dmg: 14, rate: 0.09, ammo: 120, pellets: 1, spread: 0.03, color: 0xff9de2 },
  { name: 'SHOTGUN', dmg: 15, rate: 0.7, ammo: 24, pellets: 6, spread: 0.06, color: 0x7dff9a },
];

// ---------- game state ----------
function newRun() {
  return {
    started: false, paused: false, over: false, day: 1, money: 250, hp: 100, armor: 0,
    wanted: 0, heat: 100, timeMin: 8 * 60, rain: 0.7, night: false,
    weapon: 0, ammo: [Infinity, 120, 24],
    player: { x: -285, z: -250, yaw: Math.PI * 0.25, pitch: 0, inCar: null, jack: 0, jackTarget: null, speed: 0 },
    missionIdx: 0, missionLive: false, taxi: { active: false, passenger: null, dest: null, fare: 0 },
    choice: null, kills: 0, stolen: 0, score: 0,
    keys: {}, lastShot: 0, dialogLines: [], dialogIdx: 0, dialogChoice: null,
    saveMsg: 0, mapZoom: false, playTime: 0, locked: false, dragging: false,
  };
}
let G = newRun();
let cars = [], walkers = [], cops = [], hostiles = [], tracers = [], blocks = [], spikeStrips = [], heli = null;
let lightPhase = 0, lightClock = 0, copClock = 0, sirenClock = 0, autosaveClock = 0;

// ---------- three.js setup ----------
let renderer, scene, camera, hemi, sun, moon, headlight, heliSpot;
let rainPts, rainPos, rainFall;
let colliders = [];
let shootables = [];
let hpBars = [];
let neonMats = [], lampMats = [];
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function facadeTex(base, litRatio) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    for (let y = 22; y < h - 20; y += 30) for (let x = 12; x < w - 16; x += 26) {
      const on = Math.random() < litRatio;
      g.fillStyle = on ? (Math.random() < 0.7 ? '#ffd76a' : '#9fd8ff') : '#141a26';
      g.fillRect(x, y, 16, 20);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(x, y, 16, 20);
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, w, 6);
  });
}
function groundTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const S2 = v => (v + HALF) / CITY * w;
    g.fillStyle = '#2a2f38'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e4d2e'; g.fillRect(S2(-300), S2(-300), S2(-180) - S2(-300), S2(-180) - S2(-300));
    g.fillStyle = '#0b3550'; g.fillRect(S2(255), S2(180), w - S2(255), h - S2(180));
    g.fillStyle = '#7a6a45'; g.fillRect(S2(255), S2(180), w - S2(255), 8);
    g.fillStyle = '#171a20';
    for (const r of AVENUES) { g.fillRect(S2(r - LANE / 2), 0, S2(r + LANE / 2) - S2(r - LANE / 2), h); g.fillRect(0, S2(r - LANE / 2), w, S2(r + LANE / 2) - S2(r - LANE / 2)); }
    g.fillStyle = 'rgba(110,160,255,.07)';
    for (const r of AVENUES) { g.fillRect(S2(r - LANE / 2), 0, S2(r + LANE / 2) - S2(r - LANE / 2), h); g.fillRect(0, S2(r - LANE / 2), w, S2(r + LANE / 2) - S2(r - LANE / 2)); }
    g.fillStyle = '#c9a227';
    for (const r of AVENUES) { for (let v = -HALF; v < HALF; v += 24) { g.fillRect(S2(r) - 2, S2(v), 4, 12); g.fillRect(S2(v), S2(r) - 2, 12, 4); } }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (const rx of AVENUES) for (const rz of AVENUES) {
      for (let i = -8; i <= 8; i += 4) g.fillRect(S2(rx + i) - 1, S2(rz - LANE / 2 + 2), 2, 5);
    }
  });
}
function neonTex(text, color) {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
    g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2 + 2);
  });
}

function buildCity() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fa3b8);
  scene.fog = new THREE.Fog(0x8fa3b8, 60, 420);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 900);
  camera.rotation.order = 'YXZ';
  renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  hemi = new THREE.HemisphereLight(0xbfd4e6, 0x2a2f22, 0.9); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(120, 200, 60); scene.add(sun);
  moon = new THREE.DirectionalLight(0x8fb4ff, 0.0); moon.position.set(-80, 180, -120); scene.add(moon);
  headlight = new THREE.SpotLight(0xfff6c8, 0, 90, 0.5, 0.4, 1.2); scene.add(headlight); scene.add(headlight.target);
  heliSpot = new THREE.SpotLight(0xfffbe0, 0, 170, 0.26, 0.5, 1); scene.add(heliSpot); scene.add(heliSpot.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY + 160, CITY + 160),
    new THREE.MeshPhongMaterial({ map: groundTex(), shininess: 90, specular: 0x6688bb })
  );
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const puddleMat = new THREE.MeshPhongMaterial({ color: 0x9db8dd, shininess: 220, specular: 0xffffff, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(rnd(2, 5), 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    const r = pick(AVENUES); p.position.set(r + rnd(-6, 6), 0.02, rnd(-HALF + 20, HALF - 20));
    if (Math.random() < 0.5) p.position.set(rnd(-HALF + 20, HALF - 20), 0.02, r + rnd(-6, 6));
    scene.add(p);
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({ color: 0x0d3a5c, shininess: 160, specular: 0x99bbff }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(560, -0.1, 480); scene.add(sea);

  // buildings, one block at a time
  const palette = ['#3a3f52', '#4a3542', '#2f4a44', '#54422c', '#3c3458', '#413038', '#2c3e55'];
  const facades = palette.map(c => facadeTex(c, 0.55));
  const neonWords = [['HOTEL', '#ff4d6d'], ['NEON', '#00e5ff'], ['DARMA', '#ff2e5e'], ['PASAR', '#ffd23e'], ['BAR', '#ff9de2'], ['TAKSI', '#2eff5e'], ['KOPI', '#ffb36b'], ['24 JAM', '#7dff9a']];
  for (let i = 0; i < AVENUES.length - 1; i++) for (let j = 0; j < AVENUES.length - 1; j++) {
    const bx = AVENUES[i] + LANE / 2 + 6, bz = AVENUES[j] + LANE / 2 + 6;
    const bw = AVENUES[i + 1] - AVENUES[i] - LANE - 12, bh = AVENUES[j + 1] - AVENUES[j] - LANE - 12;
    if (i === 0 && j === 0) continue; // park
    if (bx > 250 && bz > 180) continue; // port yard
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const w = rnd(22, Math.min(42, bw / n)), d = rnd(22, Math.min(38, bh));
      const hgt = rnd(14, 46);
      const x = bx + k * (bw / n) + w / 2 + rnd(0, 4), z = bz + d / 2 + rnd(0, 6);
      const fi = Math.floor(Math.random() * facades.length);
      const b = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ map: facades[fi] }));
      b.scale.set(w, hgt, d); b.position.set(x, hgt / 2, z); scene.add(b);
      colliders.push({ minX: x - w / 2 - 0.4, maxX: x + w / 2 + 0.4, minZ: z - d / 2 - 0.4, maxZ: z + d / 2 + 0.4 });
      const roof = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x22262e }));
      roof.scale.set(rnd(3, 6), rnd(1.5, 3), rnd(3, 6)); roof.position.set(x + rnd(-4, 4), hgt + roof.scale.y / 2, z + rnd(-3, 3)); scene.add(roof);
      if (Math.random() < 0.5) {
        const [word, col] = pick(neonWords);
        const nm = new THREE.MeshBasicMaterial({ map: neonTex(word, col) });
        neonMats.push(nm);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(16, w * 0.8), 4), nm);
        sign.position.set(x, Math.min(hgt - 3, 12), z + d / 2 + 0.15);
        if (Math.random() < 0.5) { sign.position.z = z - d / 2 - 0.15; sign.rotation.y = Math.PI; }
        scene.add(sign);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(col), transparent: true, opacity: 0.14 }));
        glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.03, z + d / 2 + 4); scene.add(glow);
      }
    }
  }
  // street lamps
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x1c1f26 });
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (const r of AVENUES) for (let v = -300; v <= 300; v += 120) {
    for (const [x, z] of [[r + LANE / 2 + 1.5, v], [r - LANE / 2 - 1.5, v + 60]]) {
      const pole = new THREE.Mesh(lampGeo, poleMat); pole.position.set(x, 3.5, z); scene.add(pole);
      const lm = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
      lampMats.push(lm);
      const bulb = new THREE.Mesh(bulbGeo, lm); bulb.position.set(x, 7.1, z); scene.add(bulb);
    }
  }
  // traffic lights at every intersection
  window.__lights = [];
  for (const rx of AVENUES) for (const rz of AVENUES) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), poleMat); pole.position.y = 2.5; g.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 })); box.position.y = 5.4; g.add(box);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(0, 5.9, 0.4); g.add(red);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    green.position.set(0, 5.0, 0.4); g.add(green);
    g.position.set(rx + LANE / 2 + 1, 0, rz - LANE / 2 - 1);
    scene.add(g); window.__lights.push({ red, green, rx, rz });
  }
  // port: shipping containers + cranes
  const contColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xe67e22, 0x8e44ad, 0x16a085];
  window.__crates = [];
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: pick(contColors) }));
    const w = 12, hgt = rnd(2.6, 5.2), d = 3;
    const x = rnd(265, 345), z = rnd(190, 320);
    c.scale.set(w, hgt, d); c.position.set(x, hgt / 2, z); c.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
    scene.add(c);
    colliders.push({ minX: x - 6.5, maxX: x + 6.5, minZ: z - 6.5, maxZ: z + 6.5 });
    window.__crates.push(c);
  }
  for (const [x, z] of [[330, 330], [360, 260]]) {
    const crane = new THREE.Group();
    const leg = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0xd8a020 }));
    leg.scale.set(2, 34, 2); leg.position.y = 17; crane.add(leg);
    const arm = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0xd8a020 }));
    arm.scale.set(30, 1.6, 1.6); arm.position.set(-10, 33, 0); crane.add(arm);
    crane.position.set(x, 0, z); scene.add(crane);
  }
  // landmark buildings: safehouse, garage, gun shop
  function landmark(x, z, color, hgt) {
    const m = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color }));
    m.scale.set(16, hgt, 14); m.position.set(x, hgt / 2, z); scene.add(m);
    colliders.push({ minX: x - 8.4, maxX: x + 8.4, minZ: z - 7.4, maxZ: z + 7.4 });
  }
  landmark(SPOTS.safehouse.x, SPOTS.safehouse.z, 0x4aa8ff, 9);
  landmark(SPOTS.garage.x, SPOTS.garage.z, 0xff9d00, 10);
  landmark(SPOTS.gunshop.x, SPOTS.gunshop.z, 0xaa3333, 8);

  // rain: a cloud of points that follows the camera
  const N = 1400;
  rainPos = new Float32Array(N * 3); rainFall = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    rainPos[i * 3] = rnd(-40, 40); rainPos[i * 3 + 1] = rnd(0, 40); rainPos[i * 3 + 2] = rnd(-40, 40);
    rainFall[i] = rnd(28, 46);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainPts = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xaac8ff, size: 0.14, transparent: true, opacity: 0.55 }));
  rainPts.frustumCulled = false;
  scene.add(rainPts);

  // police helicopter, hidden until 5 stars
  heli = { group: new THREE.Group(), rotor: null, angle: 0 };
  const hb = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x3a5a7a }));
  hb.scale.set(5, 2, 2.4); heli.group.add(hb);
  const tail = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x3a5a7a }));
  tail.scale.set(5, 0.7, 0.7); tail.position.set(-4.5, 0.4, 0); heli.group.add(tail);
  // navigation lights so the helicopter reads against the night sky
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beacon.position.set(0, 1.4, 0); heli.group.add(beacon);
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(-7, 0.4, 0); heli.group.add(tailLight);
  heli.rotor = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x111111 }));
  heli.rotor.scale.set(9, 0.15, 0.6); heli.rotor.position.y = 1.4; heli.group.add(heli.rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -30; cone.rotation.x = Math.PI; heli.group.add(cone);
  heli.group.visible = false; scene.add(heli.group);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ---------- entities ----------
const CAR_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
function buildCarMesh(color, isTaxi) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(unitBox, new THREE.MeshPhongMaterial({ color, shininess: 120, specular: 0x99bbdd }));
  body.scale.set(2.0, 0.62, 4.4); body.position.y = 0.55; g.add(body);
  const cabin = new THREE.Mesh(unitBox, new THREE.MeshPhongMaterial({ color: 0x18222e, shininess: 160, specular: 0xffffff }));
  cabin.scale.set(1.7, 0.55, 2.2); cabin.position.set(0, 1.05, -0.2); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w);
  }
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.6, 0.6]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), hl); h.position.set(x, 0.62, 2.22); g.add(h); }
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.6, 0.6]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), tl); t.position.set(x, 0.62, -2.22); g.add(t); }
  if (isTaxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xf7c600 }));
    sign.position.set(0, 1.45, -0.2); g.add(sign);
  }
  g.traverse(o => { if (o.isMesh) o.userData.carGroup = g; });
  return g;
}
function addCar(x, z, axis, isTaxi) {
  const mesh = buildCarMesh(isTaxi ? 0xf7c600 : pick(CAR_COLORS), isTaxi);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = { mesh, x, z, axis, dir: Math.random() < 0.5 ? 1 : -1, heading: 0, speed: rnd(9, 15), color: isTaxi ? 0xf7c600 : 0x888888, taxi: !!isTaxi, driver: !isTaxi || Math.random() < 0.5, hp: 100, locked: Math.random() < 0.35, stopped: false };
  car.heading = axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  mesh.rotation.y = car.heading;
  shootables.push({ mesh, kind: 'car', ref: car });
  return car;
}
function spawnCars(n) {
  for (let i = 0; i < n; i++) {
    const axis = Math.random() < 0.5 ? 'v' : 'h';
    if (axis === 'v') cars.push(addCar(pick(AVENUES) + (Math.random() < 0.5 ? 4.5 : -4.5), rnd(-320, 320), 'v', false));
    else cars.push(addCar(rnd(-320, 320), pick(AVENUES) + (Math.random() < 0.5 ? 4.5 : -4.5), 'h', false));
  }
  const p1 = addCar(8, 12, 'h', false); p1.speed = 0; p1.driver = false; cars.push(p1);
  const p2 = addCar(-115, -232, 'v', true); p2.speed = 0; cars.push(p2);
  const p3 = addCar(178, -276, 'h', true); p3.speed = 0; cars.push(p3);
}
function buildPersonMesh(shirt, pants) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.75, 4, 8), new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 0.95; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
  head.position.y = 1.62; g.add(head);
  const legs = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: pants }));
  legs.scale.set(0.5, 0.6, 0.3); legs.position.y = 0.3; g.add(legs);
  g.traverse(o => { if (o.isMesh) o.userData.personGroup = g; });
  return g;
}
function spawnWalkers(n) {
  const shirts = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71, 0xff9de2, 0xff8c42];
  for (let i = 0; i < n; i++) {
    const mesh = buildPersonMesh(pick(shirts), pick([0x222222, 0x334455, 0x553322]));
    const x = pick(AVENUES) + rnd(-14, 14), z = pick(AVENUES) + rnd(-14, 14);
    mesh.position.set(x, 0, z); scene.add(mesh);
    walkers.push({ mesh, x, z, speed: rnd(1.0, 1.9), state: 'walk', tx: x + rnd(-80, 80), tz: z + rnd(-80, 80), panic: 0, bob: Math.random() * 6 });
  }
}
function spawnHostiles(at, n) {
  for (let i = 0; i < n; i++) {
    const mesh = buildPersonMesh(0x8a1a1a, 0x1a1a1a);
    const x = at.x + rnd(-40, 40), z = at.z + rnd(-40, 40);
    mesh.position.set(x, 0, z); scene.add(mesh);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.85, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.95, depthTest: false }));
    bg.position.set(x, 2.15, z); fg.position.set(x, 2.15, z);
    bg.renderOrder = 999; fg.renderOrder = 1000; scene.add(bg); scene.add(fg);
    const e = { mesh, x, z, hp: 60, shootT: rnd(0.5, 2), speed: 1.9 };
    shootables.push({ mesh, kind: 'enemy', ref: e });
    hpBars.push({ bg, fg, ref: e });
    hostiles.push(e);
  }
}
function resetCity() {
  for (const c of cars) scene.remove(c.mesh);
  for (const p of walkers) scene.remove(p.mesh);
  for (const e of hostiles) scene.remove(e.mesh);
  for (const b of hpBars) { scene.remove(b.bg); scene.remove(b.fg); }
  for (const c of cops) scene.remove(c.mesh);
  cars = []; walkers = []; cops = []; hostiles = []; tracers = []; blocks = []; spikeStrips = []; hpBars = [];
  shootables = shootables.filter(s => s.kind !== 'car' && s.kind !== 'enemy' && s.kind !== 'cop');
  heli.group.visible = false;
  spawnCars(24); spawnWalkers(30);
  lightPhase = 0; lightClock = 0; copClock = 0;
}

// ---------- input ----------
const keys = {};
let mouseDown = false;
const cv = $('game');
function lockPointer() { try { cv.requestPointerLock(); } catch (e) {} }
cv.addEventListener('click', () => { audioCtx(); startRadio(); if (G.started && !G.paused && !dialogOpen()) lockPointer(); });
document.addEventListener('pointerlockchange', () => { G.locked = document.pointerLockElement === cv; $('lockhint').style.display = G.locked ? 'none' : 'block'; });
document.addEventListener('mousemove', e => {
  if (!G.started || G.paused || dialogOpen()) return;
  if (G.locked) { G.player.yaw -= e.movementX * 0.0022; G.player.pitch = clamp(G.player.pitch - e.movementY * 0.0022, -1.45, 1.45); }
  else if (G.dragging && mouseDown) { G.player.yaw -= e.movementX * 0.003; G.player.pitch = clamp(G.player.pitch - e.movementY * 0.003, -1.45, 1.45); }
});
cv.addEventListener('mousedown', e => { mouseDown = true; G.dragging = !G.locked; audioCtx(); startRadio(); if (dialogOpen()) { nextDialog(); return; } if (G.started && !G.paused) fire(); });
addEventListener('mouseup', () => { mouseDown = false; G.dragging = false; });
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true; G.keys = keys;
  if (e.key === 'Escape' && !G.locked && G.started && !dialogOpen()) togglePause();
  if (e.key.toLowerCase() === 'p' && G.started && !dialogOpen()) togglePause();
  if (e.key.toLowerCase() === 'r' && G.started && !G.paused) { stationIdx = (stationIdx + 1) % STATIONS.length; songIdx = Math.floor(Math.random() * 3); sfx.click(); toast('RADIO: ' + STATIONS[stationIdx].name); }
  if (e.key.toLowerCase() === 'm' && G.started) { G.mapZoom = !G.mapZoom; const mm = $('minimap'); mm.style.width = G.mapZoom ? '320px' : '190px'; mm.style.height = G.mapZoom ? '320px' : '190px'; }
  if (['1', '2', '3'].includes(e.key) && G.started && !G.paused) { G.weapon = parseInt(e.key, 10) - 1; refreshWheel(); sfx.click(); }
  if ((e.key === 'e' || e.key === 'E') && dialogOpen()) nextDialog();
  if (e.key.toLowerCase() === 't' && G.started && !G.paused) tryTaxi();
  if (e.key === 'Enter' && !$('start').classList.contains('hidden')) startGame(false);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
$('btn-new').addEventListener('click', () => { audioCtx(); startRadio(); startGame(true); });
$('btn-continue').addEventListener('click', () => { audioCtx(); startRadio(); if (loadSlot(1)) { startGame(false); toast('CONTINUE — Slot 1 dimuat'); } else toast('Tidak ada save di Slot 1'); });
$('btn-resume').addEventListener('click', togglePause);
$('btn-quit').addEventListener('click', () => { togglePause(); showStart(); });
$('btn-load1').addEventListener('click', () => { if (loadSlot(1)) { togglePause(); toast('Slot 1 dimuat'); } else toast('Tidak ada save di Slot 1'); });
document.querySelectorAll('#pause [data-slot]').forEach(b => b.addEventListener('click', () => saveSlot(parseInt(b.dataset.slot, 10))));

// ---------- dialog + toast ----------
function dialogOpen() { return !$('dialog').classList.contains('hidden'); }
function showDialog(speaker, lines, choices) {
  G.dialogLines = lines; G.dialogIdx = 0; G.dialogChoice = choices || null;
  $('dialog-speaker').textContent = speaker;
  $('dialog-text').textContent = lines[0];
  $('dialog-choices').classList.add('hidden'); $('dialog-choices').innerHTML = '';
  $('dialog').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
function nextDialog() {
  if (G.dialogChoice && G.dialogIdx >= G.dialogLines.length - 1) return;
  G.dialogIdx++;
  if (G.dialogIdx >= G.dialogLines.length) {
    $('dialog').classList.add('hidden');
    if (G.dialogChoice) {
      const box = $('dialog-choices'); box.classList.remove('hidden');
      $('dialog').classList.remove('hidden');
      G.dialogChoice.forEach(c => {
        const b = document.createElement('button'); b.textContent = c.label;
        b.addEventListener('click', () => { $('dialog').classList.add('hidden'); c.fn(); });
        box.appendChild(b);
      });
      G.dialogChoice = null;
    }
    return;
  }
  $('dialog-text').textContent = G.dialogLines[G.dialogIdx];
}
let toastClock = 0;
function toast(t, secs) { $('toast').textContent = t; toastClock = secs || 3; }
function fmtClock(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function refreshWheel() {
  document.querySelectorAll('.wheel-item').forEach(el => el.classList.toggle('active', parseInt(el.dataset.w, 10) === G.weapon));
  $('ammo-smg').textContent = G.ammo[1] + ' peluru';
  $('ammo-shot').textContent = G.ammo[2] + ' peluru';
}

// ---------- missions + taxi jobs ----------
function currentMission() { return MISSIONS[G.missionIdx]; }
function missionGoal() {
  if (G.taxi.active && G.taxi.dest) return G.taxi.dest;
  const m = currentMission(); return m ? m.goal : null;
}
function beginMission() {
  const m = currentMission(); if (!m || G.missionLive) return;
  G.missionLive = true;
  showDialog(m.day === 5 ? 'DARMA WIJAYA' : 'RAKA', [m.brief, 'Tujuan: ' + m.title + ' — ikuti penanda kuning di minimap. Hadiah: $' + m.pay + '.']);
  if (m.kind === 'shootout' || m.kind === 'finale') spawnHostiles(m.goal, m.kind === 'finale' ? 7 : 5);
  toast('MISI HARI ' + m.day + ': ' + m.title, 4);
}
function finishMission() {
  const m = currentMission(); if (!m) return;
  G.money += m.pay; G.score += 100 + m.pay;
  toast('MISI SELESAI! +$' + m.pay, 4); sfx.cash();
  G.missionLive = false;
  autosave();
  if (m.kind === 'choice') return;
  G.missionIdx = Math.min(G.missionIdx + 1, MISSIONS.length - 1);
  G.day = Math.min(G.missionIdx + 1, 7);
  if (m.day === 7) endGame(true);
}
function missionTick() {
  if (!G.missionLive) {
    const t = missionGoal();
    if (t && d2(G.player.x, G.player.z, t.x, t.z) < 14) beginMission();
    return;
  }
  const m = currentMission(), t = m.goal;
  if (['go', 'taxi', 'race'].includes(m.kind)) {
    if (d2(G.player.x, G.player.z, t.x, t.z) < 14) finishMission();
  } else if (['shootout', 'finale'].includes(m.kind)) {
    if (hostiles.length === 0) finishMission();
  } else if (m.kind === 'choice') {
    if (d2(G.player.x, G.player.z, t.x, t.z) < 14 && !G.choice) {
      showDialog('DARMA WIJAYA', ['"Pilih, Raka. Bayar utangmu sekarang — atau khianati aku dan ambil alih pelabuhan malam ini."'], [
        { label: '1 · BAYAR DARMA ($500)', fn: () => { if (G.money >= 500) { G.money -= 500; G.choice = 'pay'; toast('Utang dibayar. Darma pergi — tapi kota tetap mengingatmu.'); finishMission(); } else { toast('Uangmu tidak cukup! Khianati dia atau cari uang dulu.'); G.missionLive = false; } } },
        { label: '2 · KHIANATI DARMA', fn: () => { G.choice = 'betray'; G.wanted = Math.max(G.wanted, 3); toast('Kau memilih khianat. Darma mengirim anak buahnya!'); spawnHostiles(SPOTS.port, 6); G.missionLive = false; G.missionIdx = 5; G.day = 6; } },
      ]);
    }
  }
}
function tryTaxi() {
  const p = G.player;
  if (p.inCar && p.inCar.taxi && !G.taxi.active) {
    const d = pick([SPOTS.market, SPOTS.port, SPOTS.safehouse, SPOTS.gunshop]);
    const px = clamp(p.x + rnd(-40, 40), -330, 330), pz = clamp(p.z + rnd(-40, 40), -330, 330);
    G.taxi = { active: true, passenger: { x: px, z: pz }, dest: d, fare: Math.floor(rnd(40, 110)) };
    toast('TAKSI: jemput penumpang (penanda hijau), antar ke ' + d.name);
  } else if (G.taxi.active && G.taxi.passenger && d2(p.x, p.z, G.taxi.passenger.x, G.taxi.passenger.z) < 6) {
    G.taxi.passenger = null; toast('Penumpang naik! Antar ke tujuan — bayaran $' + G.taxi.fare);
  } else if (G.taxi.active && !G.taxi.passenger && d2(p.x, p.z, G.taxi.dest.x, G.taxi.dest.z) < 14) {
    G.money += G.taxi.fare; toast('TAKSI SELESAI +$' + G.taxi.fare); sfx.cash(); G.taxi = { active: false, passenger: null, dest: null, fare: 0 };
  }
}

// ---------- police / wanted ----------
function raiseWanted(n, why) {
  G.wanted = clamp(G.wanted + n, 0, 5); G.heat = 100;
  if (n > 0) toast('WANTED +' + n + ' — ' + why, 3);
}
function lightFor(axis) { return axis === 'v' ? (lightPhase < 3 ? 'green' : 'red') : (lightPhase < 3 ? 'red' : 'green'); }
function addCop(kind, x, z) {
  let mesh;
  if (kind === 'foot') { mesh = buildPersonMesh(0x1a3a8a, 0x101418); mesh.scale.setScalar(1.06); }
  else mesh = buildCarMesh(0x2244aa, false);
  mesh.position.set(x, 0, z); scene.add(mesh);
  const c = { kind, mesh, x, z, speed: kind === 'foot' ? 3.6 : 13, hp: kind === 'foot' ? 50 : 120, heading: 0 };
  shootables.push({ mesh, kind: 'cop', ref: c });
  cops.push(c); return c;
}
function tickPolice(dt) {
  copClock -= dt;
  if (G.wanted > 0 && copClock <= 0) {
    copClock = 1.2;
    if (G.wanted >= 1 && cops.filter(c => c.kind === 'foot').length < 2) addCop('foot', G.player.x + rnd(-40, 40), G.player.z + rnd(-40, 40));
    if (G.wanted >= 2 && cops.filter(c => c.kind === 'car').length < G.wanted) addCop('car', G.player.x + rnd(-60, 60), G.player.z + rnd(-60, 60));
    if (G.wanted >= 3 && blocks.length < 2) {
      const ahead = 55;
      const fx = -Math.sin(G.player.yaw), fz = -Math.cos(G.player.yaw);
      const g = new THREE.Group();
      const bar = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
      bar.scale.set(14, 1.2, 1); bar.position.y = 0.8; g.add(bar);
      const stripe = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
      stripe.scale.set(14, 0.3, 1.05); stripe.position.y = 1.45; g.add(stripe);
      g.position.set(G.player.x + fx * ahead, 0, G.player.z + fz * ahead);
      g.rotation.y = G.player.yaw; scene.add(g);
      blocks.push({ group: g, x: g.position.x, z: g.position.z, t: 16 });
      toast('ROADBLOCK di depan!');
    }
    if (G.wanted >= 4 && spikeStrips.length < 2) {
      const fx = -Math.sin(G.player.yaw), fz = -Math.cos(G.player.yaw);
      const g = new THREE.Group();
      for (let i = -2; i <= 2; i++) {
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        s.position.set(i * 1.2, 0.35, 0); g.add(s);
      }
      g.position.set(G.player.x + fx * 30, 0, G.player.z + fz * 30); g.rotation.y = G.player.yaw; scene.add(g);
      spikeStrips.push({ group: g, x: g.position.x, z: g.position.z, t: 14 });
    }
    if (G.wanted >= 5 && !heli.group.visible) {
      heli.group.visible = true; heli.group.position.set(G.player.x, 55, G.player.z - 30);
      heliSpot.intensity = 3.2;
      toast('AIR ONE — helikopter polisi di atasmu!');
    }
  }
  if (G.wanted === 0) {
    heli.group.visible = false; heliSpot.intensity = 0;
    for (const r of blocks) scene.remove(r.group); blocks = [];
    for (const s of spikeStrips) scene.remove(s.group); spikeStrips = [];
  }
  const nearCop = cops.some(c => d2(c.x, c.z, G.player.x, G.player.z) < 26) || (heli.group.visible && d2(heli.group.position.x, heli.group.position.z, G.player.x, G.player.z) < 45);
  if (G.wanted > 0 && !nearCop) { G.heat -= dt * 7; if (G.heat <= 0) { G.wanted--; G.heat = 100; toast(G.wanted === 0 ? 'Kamu lolos! Wanted hilang.' : 'Wanted turun ke ' + G.wanted + ' bintang.'); } }
  else if (nearCop) G.heat = 100;
  for (const c of cops) {
    const dx = G.player.x - c.x, dz = G.player.z - c.z, d = Math.hypot(dx, dz) || 1;
    c.heading = Math.atan2(dx, dz);
    c.x += dx / d * c.speed * dt; c.z += dz / d * c.speed * dt;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading;
    if (d < 2.2) { hurt((c.kind === 'car' ? 22 : 8) * dt); }
  }
  cops = cops.filter(c => {
    if (c.hp <= 0 || d2(c.x, c.z, G.player.x, G.player.z) > 180) { scene.remove(c.mesh); shootables = shootables.filter(s => s.ref !== c); return false; }
    return true;
  });
  for (const r of blocks) r.t -= dt;
  blocks = blocks.filter(r => { if (r.t <= 0) { scene.remove(r.group); return false; } return true; });
  for (const s of spikeStrips) s.t -= dt;
  spikeStrips = spikeStrips.filter(s => { if (s.t <= 0) { scene.remove(s.group); return false; } return true; });
  if (heli.group.visible) {
    heli.angle += dt * 0.7;
    const hx = G.player.x + Math.cos(heli.angle) * 22, hz = G.player.z + Math.sin(heli.angle) * 22;
    heli.group.position.x += (hx - heli.group.position.x) * 0.5 * dt;
    heli.group.position.z += (hz - heli.group.position.z) * 0.5 * dt;
    heli.group.position.y = 55 + Math.sin(performance.now() / 700) * 2;
    heli.rotor.rotation.y += dt * 22;
    heli.group.lookAt(G.player.x, 0, G.player.z);
    heliSpot.position.copy(heli.group.position);
    heliSpot.target.position.set(G.player.x, 0, G.player.z);
  }
  sirenClock -= dt;
  if (G.wanted > 0 && sirenClock <= 0) { sirenClock = 2.2; sfx.siren(); }
}
function hurt(amount) {
  if (G.armor > 0) { const a = Math.min(G.armor, amount); G.armor -= a; G.hp -= (amount - a); } else G.hp -= amount;
  $('vignette').classList.add('hurt'); setTimeout(() => $('vignette').classList.remove('hurt'), 180);
  if (G.hp <= 0) endGame(false);
}

// ---------- combat ----------
const raycaster = new THREE.Raycaster();
function fire() {
  if (!G.started || G.paused || dialogOpen()) return;
  const now = performance.now() / 1000, w = WEAPONS[G.weapon];
  if (now - G.lastShot < w.rate) return;
  if (G.ammo[G.weapon] !== Infinity && G.ammo[G.weapon] <= 0) { toast('AMUNISI HABIS — beli di Toko Senjata'); return; }
  G.lastShot = now;
  if (G.ammo[G.weapon] !== Infinity) G.ammo[G.weapon]--;
  sfx.shot();
  $('muzzle').style.opacity = 1; setTimeout(() => $('muzzle').style.opacity = 0, 60);
  const origin = camera.position.clone();
  for (let i = 0; i < w.pellets; i++) {
    const dir = new THREE.Vector3(rnd(-w.spread, w.spread), rnd(-w.spread, w.spread), -1).applyQuaternion(camera.quaternion).normalize();
    raycaster.set(origin, dir); raycaster.far = 160;
    const hits = raycaster.intersectObjects(shootables.map(s => s.mesh), true);
    let end = origin.clone().add(dir.clone().multiplyScalar(120));
    if (hits.length) {
      const h = hits[0]; end = h.point.clone();
      let obj = h.object, entry = null;
      while (obj && !entry) { entry = shootables.find(s => s.mesh === obj); obj = obj.parent; }
      if (entry) {
        if (entry.kind === 'enemy') { entry.ref.hp -= w.dmg; sfx.hit(); if (entry.ref.hp <= 0) { G.kills++; G.money += 20; removeHostile(entry.ref); } }
        else if (entry.kind === 'cop') { entry.ref.hp -= w.dmg; raiseWanted(1, 'Menyerang polisi!'); }
        else if (entry.kind === 'car') { entry.ref.hp -= w.dmg; if (entry.ref.hp <= 0) detonateCar(entry.ref); }
      }
    }
    addTracer(origin, end, w.color);
  }
  for (const pd of walkers) if (d2(pd.x, pd.z, G.player.x, G.player.z) < 35) { pd.state = 'flee'; pd.panic = 3; }
  if (G.wanted < 1 && Math.random() < 0.5) raiseWanted(1, 'Tembakan terdengar!');
}
function addTracer(a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line); tracers.push({ line, life: 0.07 });
}
function removeHostile(e) {
  scene.remove(e.mesh);
  shootables = shootables.filter(s => s.ref !== e);
  const bar = hpBars.find(b => b.ref === e);
  if (bar) { scene.remove(bar.bg); scene.remove(bar.fg); hpBars = hpBars.filter(b => b.ref !== e); }
  hostiles = hostiles.filter(x => x !== e);
}
function detonateCar(car) {
  const pos = car.mesh.position.clone();
  const boom = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9d00, transparent: true, opacity: 0.9 }));
  boom.position.copy(pos).y = 1; scene.add(boom);
  setTimeout(() => scene.remove(boom), 500);
  sfx.boom(); raiseWanted(1, 'Mobil meledak!');
  if (G.player.inCar === car) { G.player.inCar = null; hurt(25); }
  scene.remove(car.mesh);
  shootables = shootables.filter(s => s.ref !== car);
  cars = cars.filter(c => c !== car);
}
function placeHpBars() {
  for (const e of hostiles) {
    const bar = hpBars.find(b => b.ref === e);
    if (!bar) continue;
    bar.bg.position.set(e.x, 2.15, e.z); bar.fg.position.set(e.x, 2.15, e.z);
    bar.bg.quaternion.copy(camera.quaternion); bar.fg.quaternion.copy(camera.quaternion);
    bar.fg.scale.x = Math.max(0.01, e.hp / 60);
    bar.fg.position.x -= (1 - e.hp / 60) * 0.7 * Math.cos(camera.rotation.y);
    bar.fg.position.z += (1 - e.hp / 60) * 0.7 * Math.sin(camera.rotation.y);
  }
}
function tickHostiles(dt) {
  for (const e of hostiles) {
    e.shootT -= dt;
    const d = d2(G.player.x, G.player.z, e.x, e.z);
    if (d > 34) {
      const a = Math.atan2(G.player.x - e.x, G.player.z - e.z);
      e.x += Math.sin(a) * e.speed * dt; e.z += Math.cos(a) * e.speed * dt;
      e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = a;
    } else if (e.shootT <= 0) {
      e.shootT = rnd(0.9, 1.8);
      const from = new THREE.Vector3(e.x, 1.4, e.z);
      const to = new THREE.Vector3(G.player.x, 1.5, G.player.z);
      addTracer(from, to, 0xff5b5b);
      hiss(0.08, 0.2, 2000);
      hurt(6);
    }
  }
  placeHpBars();
}

// ---------- player: on foot, driving, carjacking ----------
function hitsCollider(x, z, r) {
  if (x < -HALF + 4 || x > HALF - 4 || z < -HALF + 4 || z > HALF - 4) return true;
  for (const b of colliders) if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
  return false;
}
function nearestCar(maxD) {
  let near = null, nd = 1e9;
  for (const car of cars) { const d = d2(G.player.x, G.player.z, car.x, car.z); if (d < nd) { nd = d; near = car; } }
  return nd < maxD ? near : null;
}
function tickPlayer(dt) {
  const p = G.player;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  if (p.inCar) {
    const car = p.inCar;
    const fwd = (keys['w'] ? 1 : 0) - (keys['s'] ? 0.7 : 0);
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    const slip = G.rain > 0.5 ? 0.78 : 1;
    const maxSp = 42 * slip;
    car.speed = clamp(car.speed + fwd * 16 * dt * (fwd > 0 ? 1 : 0.7), -10, maxSp);
    if (fwd === 0) car.speed *= Math.max(0, 1 - 1.2 * dt);
    if (keys[' ']) car.speed *= Math.max(0, 1 - 3 * dt);
    car.heading += steer * 1.9 * dt * clamp(Math.abs(car.speed) / 14, 0, 1) * (car.speed < 0 ? -1 : 1);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (!hitsCollider(nx, nz, 2.2)) { car.x = nx; car.z = nz; } else { car.speed *= -0.25; car.hp -= 3; if (car.hp <= 0) detonateCar(car); }
    if (!cars.includes(car)) {
      // the car just blew up under us: drop to on-foot camera and stop here
      p.inCar = null; headlight.intensity = 0;
      camera.position.set(p.x, 1.7, p.z); camera.rotation.set(p.pitch, p.yaw, 0);
      return;
    }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
    p.x = car.x; p.z = car.z; p.speed = Math.abs(car.speed);
    p.yaw = car.heading + Math.PI;
    headlight.position.set(car.x - Math.sin(car.heading) * 1, 1.4, car.z - Math.cos(car.heading) * 1);
    headlight.target.position.set(car.x + Math.sin(car.heading) * 40, 0, car.z + Math.cos(car.heading) * 40);
    headlight.intensity = G.night ? 2.6 : 0.4;
    for (const s of spikeStrips) if (d2(car.x, car.z, s.x, s.z) < 3) { car.speed *= 0.3; car.hp -= 20; toast('SPIKE STRIP! Ban bocor!'); scene.remove(s.group); spikeStrips = spikeStrips.filter(x => x !== s); }
    for (const r of blocks) if (d2(car.x, car.z, r.x, r.z) < 6 && Math.abs(car.speed) > 6) { car.speed *= -0.4; car.hp -= 25; raiseWanted(1, 'Menabrak roadblock!'); }
    if (keys['e'] && !dialogOpen()) { p.inCar = null; p.x = car.x + 3; p.z = car.z + 2; car.speed = 0; headlight.intensity = 0; p.yaw = car.heading + Math.PI; }
    if (mouseDown && !dialogOpen()) fire();
    if (Math.random() < dt * 2) sfx.engine();
  } else {
    headlight.intensity = 0;
    const run = keys['shift'] ? 1.7 : 1;
    let mx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0), mz = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
    const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
    const sp = 5.2 * run;
    const nx = p.x + (fx * mz + rx * mx) * sp * dt, nz = p.z + (fz * mz + rz * mx) * sp * dt;
    if (!hitsCollider(nx, p.z, 0.7)) p.x = nx;
    if (!hitsCollider(p.x, nz, 0.7)) p.z = nz;
    p.speed = (mx || mz) ? sp : 0;
    if (mouseDown && !dialogOpen()) fire();
    const near = nearestCar(4.5);
    if (near) {
      if (near.driver) {
        $('prompt').textContent = 'TAHAN E — CURI MOBIL (' + Math.round(p.jack * 100) + '%) · alarm & wanted naik';
        $('jackbar').classList.remove('hidden'); $('jackfill').style.width = (p.jack * 100) + '%';
        if (keys['e']) {
          p.jack += dt / 0.9; p.jackTarget = near;
          if (p.jack >= 1) {
            near.driver = false; G.stolen++; raiseWanted(1, 'Carjacking!');
            if (near.locked) toast('ALARM BERBUNYI!');
            sfx.jack();
            const dm = buildPersonMesh(0xdddddd, 0x222222); dm.position.set(near.x + 3, 0, near.z + 2); scene.add(dm);
            walkers.push({ mesh: dm, x: near.x + 3, z: near.z + 2, speed: 4, state: 'flee', tx: near.x + 60, tz: near.z + 60, panic: 4, bob: 0 });
            p.inCar = near; near.speed = 0; near.heading = p.yaw + Math.PI; p.jack = 0;
            $('prompt').textContent = ''; $('jackbar').classList.add('hidden');
          }
        } else p.jack = Math.max(0, p.jack - dt * 2);
      } else {
        $('prompt').textContent = 'Tekan E — MASUK MOBIL';
        $('jackbar').classList.add('hidden');
        if (keys['e']) { p.inCar = near; near.speed = 0; near.heading = p.yaw + Math.PI; $('prompt').textContent = ''; }
      }
    } else { $('prompt').textContent = ''; $('jackbar').classList.add('hidden'); p.jack = 0; }
    if (d2(p.x, p.z, SPOTS.garage.x, SPOTS.garage.z) < 12 && G.wanted > 0) { G.wanted = 0; G.heat = 0; toast('GARAGE: mobil dicat ulang — wanted hilang!'); sfx.cash(); }
    if (d2(p.x, p.z, SPOTS.safehouse.x, SPOTS.safehouse.z) < 12) { if (G.wanted > 0) { G.wanted = 0; toast('SAFEHOUSE: kamu bersembunyi — wanted hilang.'); } G.hp = Math.min(100, G.hp + 10 * dt); }
    if (d2(p.x, p.z, SPOTS.gunshop.x, SPOTS.gunshop.z) < 12) {
      $('prompt').textContent = 'TOKO SENJATA — tekan E beli amunisi + armor ($50)';
      if (keys['e'] && G.money >= 50) { G.money -= 50; G.ammo[1] += 120; G.ammo[2] += 24; G.armor = 100; toast('Amunisi + armor dibeli!'); sfx.cash(); }
    }
  }
  // camera
  if (p.inCar) {
    const car = p.inCar;
    camera.position.set(car.x + Math.sin(car.heading) * 1.3, 1.5, car.z + Math.cos(car.heading) * 1.3);
    camera.rotation.set(p.pitch * 0.4, car.heading + Math.PI, 0);
  } else {
    camera.position.set(p.x, 1.7 + Math.sin(performance.now() / 300) * (p.speed > 0 ? 0.03 : 0), p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }
}

// ---------- traffic + pedestrians ----------
function tickTraffic(dt) {
  lightClock += dt;
  if (lightClock > 6) { lightClock = 0; lightPhase = (lightPhase + 1) % 6; }
  for (const tl of window.__lights || []) {
    const nsGreen = lightPhase < 3;
    tl.red.material.color.setHex(nsGreen ? 0x551111 : 0xff2222);
    tl.green.material.color.setHex(nsGreen ? 0x22ff66 : 0x113311);
  }
  for (const car of cars) {
    if (car === G.player.inCar) continue;
    if (car.speed === 0 && !car.driver) continue;
    let stop = false;
    if (car.axis === 'v') {
      for (const iy of AVENUES) { const d = (iy - car.z) * car.dir; if (d > 0 && d < 14 && lightFor('v') === 'red') stop = true; }
    } else {
      for (const ix of AVENUES) { const d = (ix - car.x) * car.dir; if (d > 0 && d < 14 && lightFor('h') === 'red') stop = true; }
    }
    for (const o of cars) {
      if (o === car) continue;
      if (car.axis === 'v' && Math.abs(o.x - car.x) < 6) { const d = (o.z - car.z) * car.dir; if (d > 0 && d < 12) stop = true; }
      if (car.axis === 'h' && Math.abs(o.z - car.z) < 6) { const d = (o.x - car.x) * car.dir; if (d > 0 && d < 12) stop = true; }
    }
    const target = 12;
    if (stop) { car.speed = Math.max(0, car.speed - 20 * dt); if (Math.random() < 0.003) sfx.horn(); }
    else car.speed = Math.min(target, car.speed + 6 * dt);
    if (car.axis === 'v') car.z += car.dir * car.speed * dt; else car.x += car.dir * car.speed * dt;
    if (car.x < -HALF + 10 || car.x > HALF - 10 || car.z < -HALF + 10 || car.z > HALF - 10) { car.dir *= -1; car.x = clamp(car.x, -HALF + 15, HALF - 15); car.z = clamp(car.z, -HALF + 15, HALF - 15); car.heading = car.axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2); }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  }
}
function tickWalkers(dt) {
  for (const pd of walkers) {
    pd.bob += dt * 8;
    if (pd.state === 'flee') {
      pd.panic -= dt;
      const a = Math.atan2(pd.x - G.player.x, pd.z - G.player.z);
      pd.x += Math.sin(a) * 4.4 * dt; pd.z += Math.cos(a) * 4.4 * dt;
      pd.mesh.rotation.y = a;
      if (pd.panic <= 0) pd.state = 'walk';
    } else {
      const a = Math.atan2(pd.tx - pd.x, pd.tz - pd.z);
      pd.x += Math.sin(a) * pd.speed * dt; pd.z += Math.cos(a) * pd.speed * dt;
      pd.mesh.rotation.y = a;
      if (d2(pd.tx, pd.tz, pd.x, pd.z) < 3) { pd.tx = clamp(pd.x + rnd(-90, 90), -330, 330); pd.tz = clamp(pd.z + rnd(-90, 90), -330, 330); }
      for (const car of cars) if (car.speed > 8 && d2(pd.x, pd.z, car.x, car.z) < 9) { pd.state = 'flee'; pd.panic = 2; }
    }
    pd.x = clamp(pd.x, -HALF + 6, HALF - 6); pd.z = clamp(pd.z, -HALF + 6, HALF - 6);
    pd.mesh.position.set(pd.x, Math.abs(Math.sin(pd.bob)) * 0.05, pd.z);
  }
}

// ---------- save / load / pause / start ----------
function saveSlot(slot) {
  const data = { day: G.day, money: G.money, hp: G.hp, armor: G.armor, wanted: G.wanted, missionIdx: G.missionIdx, weapon: G.weapon, ammo: G.ammo, x: G.player.x, z: G.player.z, yaw: G.player.yaw, kills: G.kills, stolen: G.stolen, timeMin: G.timeMin, rain: G.rain };
  try { localStorage.setItem('teluk-arunika-3d-save-' + slot, JSON.stringify(data)); } catch (e) {}
  $('saving').classList.remove('hidden'); G.saveMsg = 1.2;
  toast('Tersimpan — Slot ' + slot);
}
function loadSlot(slot) {
  try {
    const raw = localStorage.getItem('teluk-arunika-3d-save-' + slot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.day = d.day; G.money = d.money; G.hp = d.hp; G.armor = d.armor; G.wanted = d.wanted;
    G.missionIdx = d.missionIdx; G.weapon = d.weapon; G.ammo = d.ammo;
    G.player.x = d.x; G.player.z = d.z; G.player.yaw = d.yaw || 0; G.kills = d.kills || 0; G.stolen = d.stolen || 0;
    G.timeMin = d.timeMin || 480; G.rain = d.rain ?? 0.7;
    return true;
  } catch (e) { return false; }
}
function autosave() { saveSlot(0); }
function togglePause() {
  if (!G.started) return;
  G.paused = !G.paused;
  $('pause').classList.toggle('hidden', !G.paused);
  if (G.paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    const m = currentMission();
    $('pause-stats').innerHTML = 'HARI ' + G.day + '/7 · ' + fmtClock(G.timeMin) + ' · ' + (G.rain > 0.4 ? 'HUJAN' : 'CERAH') + '<br>Uang $' + G.money + ' · HP ' + Math.round(G.hp) + ' · Wanted ' + '★'.repeat(G.wanted) + '<br>Misi: ' + (m ? m.title : '—') + ' · Taksi: ' + (G.taxi.active ? 'aktif — antar ke ' + (G.taxi.dest ? G.taxi.dest.name : '') + ' ($' + G.taxi.fare + ')' : '—') + '<br>Mobil dicuri: ' + G.stolen + ' · Musuh dikalahkan: ' + G.kills;
  }
}
function showStart() { G.started = false; G.paused = false; $('start').classList.remove('hidden'); $('hud').classList.add('hidden'); $('pause').classList.add('hidden'); }
function startGame(isNew) {
  if (isNew) { G = newRun(); resetCity(); }
  G.started = true; G.paused = false;
  $('start').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pause').classList.add('hidden');
  refreshWheel();
  if (isNew) setTimeout(() => showDialog('RAKA', ['"Tujuh hari. Tujuh hari untuk lunasi utang Darma — atau bengkel Ayah disita."', '"Mulai dari misi pertama: antar paket ke pelabuhan. Ikuti penanda kuning."']), 400);
}
function endGame(won) {
  G.over = true; G.started = false;
  showDialog(won ? 'RAKA' : 'DARMA WIJAYA', won ? ['"Utang lunas. Bengkel Ayah selamat. Teluk Arunika masih hujan — tapi kali ini, aku bebas."', 'TAMAT — Skor: ' + G.score + ' · Mobil dicuri: ' + G.stolen + ' · Musuh: ' + G.kills] : ['"Kau kalah, Raka. Kota ini tidak kenal ampun."', 'GAME OVER — Coba lagi dari save terakhir (Continue).']);
  setTimeout(showStart, 100);
}

// ---------- HUD + minimap ----------
const mmc = $('minimap').getContext('2d');
function refreshHud() {
  let stars = '';
  for (let i = 0; i < 5; i++) stars += '<span class="' + (i < G.wanted ? '' : 'off') + '">★</span>';
  $('wanted').innerHTML = stars;
  const hour = Math.floor(G.timeMin / 60) % 24;
  $('clock').textContent = 'HARI ' + G.day + '/7   ' + fmtClock(G.timeMin) + '   ' + (G.rain > 0.6 ? 'HUJAN DERAS' : G.rain > 0.25 ? 'HUJAN' : 'CERAH') + (hour >= 18 || hour < 6 ? ' · MALAM' : ' · SIANG');
  $('money').textContent = '$ ' + G.money;
  $('radio').textContent = 'RADIO: ' + STATIONS[stationIdx].name + ' — ' + STATIONS[stationIdx].songs[songIdx];
  const t = missionGoal();
  $('objective').textContent = 'Tujuan: ' + (G.taxi.active ? 'TAKSI → ' + (G.taxi.passenger ? 'jemput penumpang' : G.taxi.dest.name) : currentMission() ? (G.missionLive ? currentMission().title : 'Datangi penanda kuning: ' + currentMission().title) : 'Bebas — cari misi / taksi');
  $('hp-fill').style.width = clamp(G.hp, 0, 100) + '%';
  $('armor-fill').style.width = clamp(G.armor, 0, 100) + '%';
  $('hp-num').textContent = Math.round(G.hp);
  $('armor-num').textContent = Math.round(G.armor);
  $('money-num').textContent = '$' + G.money;
  const w = WEAPONS[G.weapon];
  $('weapon').textContent = (G.weapon + 1) + ' · ' + w.name + ' ' + (G.ammo[G.weapon] === Infinity ? '∞' : G.ammo[G.weapon]);
  const fwd = G.player.inCar
    ? { x: Math.sin(G.player.inCar.heading), z: Math.cos(G.player.inCar.heading) }
    : { x: -Math.sin(G.player.yaw), z: -Math.cos(G.player.yaw) };
  const deg = ((Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI) + 360) % 360;
  $('compass').textContent = (deg < 45 || deg >= 315 ? 'N' : deg < 135 ? 'E' : deg < 225 ? 'S' : 'W') + ' · ' + Math.round(deg) + '°';
  if (G.player.inCar) { $('speedo').classList.remove('hidden'); $('speedo').innerHTML = Math.round(Math.abs(G.player.inCar.speed) * 3.6 * 1.4) + ' <small>km/h</small>'; }
  else $('speedo').classList.add('hidden');
  if (G.saveMsg > 0) { G.saveMsg -= 0.016; if (G.saveMsg <= 0) $('saving').classList.add('hidden'); }
  if (toastClock > 0) { toastClock -= 0.016; if (toastClock <= 0) $('toast').textContent = ''; }
  $('heat').textContent = G.wanted > 0 ? 'POLISI MENGEJAR — sembunyi sampai dingin / ke safehouse / garage' : '';
}
function drawMap() {
  const s = 190 / CITY;
  const mx = v => (v + HALF) * s;
  const fwd = G.player.inCar
    ? { x: Math.sin(G.player.inCar.heading), z: Math.cos(G.player.inCar.heading) }
    : { x: -Math.sin(G.player.yaw), z: -Math.cos(G.player.yaw) };
  mmc.clearRect(0, 0, 190, 190);
  mmc.fillStyle = '#0a1420'; mmc.fillRect(0, 0, 190, 190);
  mmc.fillStyle = '#14557f'; mmc.fillRect(mx(255), mx(180), 190 - mx(255), 190 - mx(180));
  mmc.strokeStyle = '#5a6a7a'; mmc.lineWidth = 4;
  for (const r of AVENUES) { mmc.beginPath(); mmc.moveTo(mx(r), 0); mmc.lineTo(mx(r), 190); mmc.stroke(); mmc.beginPath(); mmc.moveTo(0, mx(r)); mmc.lineTo(190, mx(r)); mmc.stroke(); }
  const blip = (x, z, c, r) => { mmc.fillStyle = c; mmc.beginPath(); mmc.arc(mx(x), mx(z), r || 4, 0, 7); mmc.fill(); };
  blip(SPOTS.safehouse.x, SPOTS.safehouse.z, '#4aa8ff', 5);
  blip(SPOTS.garage.x, SPOTS.garage.z, '#ff9d00', 4);
  const t = missionGoal(); if (t) { mmc.strokeStyle = '#ffd23e'; mmc.lineWidth = 2; mmc.beginPath(); mmc.arc(mx(t.x), mx(t.z), 8, 0, 7); mmc.stroke(); blip(t.x, t.z, '#ffd23e', 5); }
  if (G.taxi.active && G.taxi.passenger) blip(G.taxi.passenger.x, G.taxi.passenger.z, '#2eff5e', 5);
  for (const c of cops) blip(c.x, c.z, '#ff2e2e', 4);
  for (const e of hostiles) blip(e.x, e.z, '#ff9d00', 3);
  blip(G.player.x, G.player.z, '#ffffff', 5);
  mmc.strokeStyle = '#fff'; mmc.beginPath(); mmc.arc(mx(G.player.x), mx(G.player.z), 8, 0, 7); mmc.stroke();
  mmc.fillStyle = 'rgba(255,255,255,.5)';
  mmc.beginPath(); mmc.moveTo(mx(G.player.x), mx(G.player.z));
  const fa = Math.atan2(fwd.x, fwd.z);
  mmc.lineTo(mx(G.player.x) + Math.sin(fa + 0.4) * 12, mx(G.player.z) + Math.cos(fa + 0.4) * 12);
  mmc.lineTo(mx(G.player.x) + Math.sin(fa - 0.4) * 12, mx(G.player.z) + Math.cos(fa - 0.4) * 12);
  mmc.fill();
}

// ---------- day / night + weather ----------
function applySky() {
  const hour = Math.floor(G.timeMin / 60) % 24;
  const night = hour >= 18 || hour < 6;
  G.night = night;
  const dayF = night ? 0 : (hour < 12 ? (hour - 6) / 6 : (18 - hour) / 6);
  const f = clamp(dayF, 0, 1);
  hemi.intensity = 0.25 + f * 0.75;
  sun.intensity = f * 1.7;
  moon.intensity = night ? 0.5 : 0;
  const skyDay = new THREE.Color(0x8fa3b8), skyNight = new THREE.Color(0x0a0f1e), skyRain = new THREE.Color(0x5a6a78);
  const sky = skyNight.clone().lerp(skyDay, f);
  if (G.rain > 0.5) sky.lerp(skyRain, 0.4);
  scene.background = sky; scene.fog.color.copy(sky);
  scene.fog.near = 60; scene.fog.far = night ? 260 : 420;
  for (const lm of lampMats) lm.color.setHex(night ? 0xffe9a8 : 0x555555);
  rainPts.visible = G.rain > 0.15;
  rainPts.material.opacity = 0.25 + G.rain * 0.4;
}
function tickRain(dt) {
  if (!rainPts.visible) return;
  const pos = rainPts.geometry.attributes.position.array;
  const px = camera.position.x, pz = camera.position.z;
  for (let i = 0; i < rainFall.length; i++) {
    pos[i * 3 + 1] -= rainFall[i] * dt;
    if (pos[i * 3 + 1] < 0) {
      pos[i * 3 + 1] = rnd(25, 40);
      pos[i * 3] = px + rnd(-40, 40); pos[i * 3 + 2] = pz + rnd(-40, 40);
    }
  }
  rainPts.geometry.attributes.position.needsUpdate = true;
}

// ---------- main loop ----------
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (G.started && !G.paused && !dialogOpen() && !(SHOT >= 1 && SHOT <= 4)) {
    G.playTime += dt;
    G.timeMin += dt * 0.5;
    if (Math.random() < 0.0004) G.rain = clamp(G.rain + rnd(-0.3, 0.3), 0, 1);
    tickPlayer(dt); tickTraffic(dt); tickWalkers(dt); tickPolice(dt); tickHostiles(dt);
    missionTick();
    for (const tr of tracers) tr.life -= dt;
    tracers = tracers.filter(tr => { if (tr.life <= 0) { scene.remove(tr.line); return false; } return true; });
    autosaveClock += dt; if (autosaveClock > 60) { autosaveClock = 0; autosave(); }
    refreshHud();
  }
  applySky();
  tickRain(dt);
  drawMap();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- staged screenshot states ----------
function clearAround(x, z, r, keepCars) {
  for (const car of [...cars]) {
    if (keepCars && keepCars.includes(car)) continue;
    if (d2(car.x, car.z, x, z) < r) {
      scene.remove(car.mesh); shootables = shootables.filter(s => s.ref !== car);
      cars = cars.filter(c => c !== car);
    }
  }
  for (const pd of [...walkers]) {
    if (d2(pd.x, pd.z, x, z) < 12) { scene.remove(pd.mesh); walkers = walkers.filter(p => p !== pd); }
  }
}
function stageShot(n) {
  G = newRun(); resetCity(); G.started = true;
  $('start').classList.add('hidden'); $('hud').classList.remove('hidden');
  if (n === 1) {
    G.day = 1; G.timeMin = 14 * 60 + 20; G.rain = 0.9; G.wanted = 2; G.money = 250; G.hp = 88; G.armor = 40;
    G.player.x = 0; G.player.z = 60; G.player.yaw = 0; G.player.pitch = 0.02;
    const car = addCar(2, 56, 'v', false); car.speed = 0; car.driver = true; cars.push(car);
    clearAround(0, 60, 26, [car]);
    addCop('foot', -8, 44); addCop('foot', 14, 50);
    G.missionLive = true;
    toast('MISI HARI 1: Antar Paket Darma — ikuti penanda kuning', 6);
    refreshHud(); refreshWheel(); tickPlayer(0.016);
    G.player.jack = 0.45;
    $('prompt').textContent = 'TAHAN E — CURI MOBIL (45%) · alarm & wanted naik';
    $('jackbar').classList.remove('hidden'); $('jackfill').style.width = '45%';
  } else if (n === 2) {
    G.day = 3; G.timeMin = 23 * 60 + 40; G.rain = 0.6; G.wanted = 4; G.money = 620; G.hp = 72; G.armor = 55;
    const car = addCar(0, 120, 'h', false); car.speed = 36; car.heading = Math.PI / 2; car.mesh.rotation.y = car.heading; cars.push(car);
    clearAround(0, 120, 26, [car]);
    G.player.inCar = car; G.player.x = car.x; G.player.z = car.z;
    const rb = new THREE.Group();
    const bar = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
    bar.scale.set(16, 1.2, 1); bar.position.y = 0.8; rb.add(bar);
    const stripe = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
    stripe.scale.set(16, 0.3, 1.05); stripe.position.y = 1.45; rb.add(stripe);
    rb.position.set(30, 0, 120); rb.rotation.y = Math.PI / 2; scene.add(rb);
    blocks.push({ group: rb, x: 30, z: 120, t: 60 });
    const sp = new THREE.Group();
    for (let i = -2; i <= 2; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x888888 })); s.position.set(i * 1.2, 0.35, 0); sp.add(s); }
    sp.position.set(20, 0, 120); scene.add(sp); spikeStrips.push({ group: sp, x: 20, z: 120, t: 60 });
    heli.group.visible = true; heli.group.position.set(32, 14, 108);
    heliSpot.intensity = 3.2;
    heliSpot.position.set(32, 14, 108);
    heliSpot.target.position.set(0, 0, 120);
    addCop('car', 22, 114); addCop('car', 34, 126);
    toast('AIR ONE — helikopter polisi di atasmu!', 6);
    refreshHud(); refreshWheel(); tickPlayer(0.016);
  } else if (n === 3) {
    G.day = 6; G.timeMin = 17 * 60; G.rain = 0.3; G.wanted = 3; G.money = 940; G.hp = 64; G.armor = 70; G.weapon = 1; G.ammo = [Infinity, 120, 24];
    G.player.x = 250; G.player.z = 255; G.player.yaw = -Math.PI / 2; G.player.pitch = 0.02;
    clearAround(250, 255, 20, []);
    for (const c of [...(window.__crates || [])]) {
      if (c.position.x > 252 && c.position.x < 335 && c.position.z > 228 && c.position.z < 282) {
        scene.remove(c);
        // drop the matching collider too, so the cleared yard is truly open
        colliders = colliders.filter(b => !(c.position.x - 6.5 <= b.minX && b.maxX <= c.position.x + 6.5 && c.position.z - 6.5 <= b.minZ && b.maxZ <= c.position.z + 6.5));
      }
    }
    spawnHostiles(SPOTS.port, 5);
    const spots = [[270, 243], [276, 267], [284, 250], [272, 261], [290, 238]];
    hostiles.forEach((e, i) => { e.x = spots[i][0]; e.z = spots[i][1]; e.mesh.position.set(e.x, 0, e.z); });
    // port floodlights so the dusk shootout reads clearly
    for (const [lx, lz] of [[268, 240], [288, 268], [300, 245]]) {
      const fl = new THREE.PointLight(0xffe0a0, 900, 90, 1.6);
      fl.position.set(lx, 14, lz); scene.add(fl);
    }
    const fireGlow = new THREE.PointLight(0xff7a1a, 500, 60, 1.8);
    fireGlow.position.set(280, 3, 258); scene.add(fireGlow);
    G.missionLive = true; G.missionIdx = 5;
    $('wheel').classList.remove('hidden'); refreshWheel();
    showDialog('DARMA WIJAYA', ['"Malam ini semuanya ditentukan, Raka. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."']);
    refreshHud(); tickPlayer(0.016);
    placeHpBars();
    addTracer(new THREE.Vector3(276, 1.4, 267), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addTracer(new THREE.Vector3(284, 1.4, 250), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addTracer(new THREE.Vector3(250, 1.5, 255), new THREE.Vector3(276, 1.4, 267), 0xffe27a);
  } else if (n === 4) {
    G.day = 4; G.timeMin = 2 * 60 + 14; G.rain = 0.75; G.wanted = 0; G.money = 1180; G.hp = 100; G.armor = 25;
    G.player.x = 0; G.player.z = 120; G.player.yaw = -Math.PI / 2; G.player.pitch = 0.02;
    clearAround(0, 120, 20, []);
    G.taxi = { active: true, passenger: null, dest: SPOTS.port, fare: 85 };
    G.paused = true;
    $('pause').classList.remove('hidden');
    $('pause-stats').innerHTML = 'HARI 4/7 · 02:14 · HUJAN<br>Uang $1180 · HP 100 · Wanted —<br>Misi: Balapan Jalan Tol · Taksi aktif: antar ke PELABUHAN ($85)';
    refreshHud(); refreshWheel(); tickPlayer(0.016);
  }
  applySky();
}

// ---------- self-test (?test=1) ----------
function runChecks() {
  const out = [];
  const ok = (name, cond) => out.push((cond ? 'PASS' : 'FAIL') + ' ' + name);
  try {
    ok('THREE global present', typeof THREE !== 'undefined');
    ok('renderer created', !!renderer && !!renderer.domElement);
    ok('scene children>100', scene.children.length > 100);
    ok('buildings>40', colliders.length > 40);
    ok('traffic spawns', cars.length >= 20);
    ok('walkers spawn', walkers.length >= 20);
    ok('traffic lights exist', (window.__lights || []).length === 25);
    ok('rain points present', !!rainPts && rainPts.visible !== undefined);
    ok('helicopter exists hidden', !!heli && !heli.group.visible);
    const before = G.wanted; raiseWanted(2, 'test'); ok('wanted rises', G.wanted === before + 2);
    G.wanted = 0; G.heat = 100;
    const parked = cars.find(c => !c.driver); ok('parked car exists', !!parked);
    if (parked) { G.player.inCar = parked; ok('enter car', G.player.inCar === parked); G.player.inCar = null; }
    G.player.x = 0; G.player.z = 0; G.player.yaw = 0; tickPlayer(0.016);
    ok('camera positioned', camera.position.y > 1 && camera.position.y < 2.2);
    const near = nearestCar(200); ok('nearestCar finds a car', !!near);
    fire(); ok('fire runs', true);
    spawnHostiles(SPOTS.port, 3); ok('hostiles spawn', hostiles.length === 3);
    saveSlot(0); ok('save writes', !!localStorage.getItem('teluk-arunika-3d-save-0'));
    ok('load reads', loadSlot(0));
    ok('missions = 7', MISSIONS.length === 7);
    ok('radio stations = 3', STATIONS.length === 3);
    ok('weapons = 3', WEAPONS.length === 3);
    const ext = [...document.scripts].some(s => s.src && /^https?:/.test(s.src));
    ok('no external script src', !ext);
    ok('hud visible', !$('hud').classList.contains('hidden'));
    drawMap();
    const px = mmc.getImageData(0, 0, 190, 190).data;
    let lit = 0; for (let i = 0; i < px.length; i += 400) if (px[i] > 20 || px[i + 1] > 20 || px[i + 2] > 20) lit++;
    ok('minimap drawn', lit > 10);
    showDialog('TEST', ['baris dialog uji']); ok('dialog opens', !$('dialog').classList.contains('hidden'));
    $('dialog').classList.add('hidden');
    togglePause(); ok('pause opens', G.paused && !$('pause').classList.contains('hidden'));
    togglePause(); ok('pause closes', !G.paused && $('pause').classList.contains('hidden'));
    ok('webgl context ok', !!renderer.getContext());
  } catch (e) { out.push('FAIL exception: ' + e.message); }
  const el = $('test-results'); el.classList.remove('hidden'); el.textContent = out.join('\n');
  document.title = 'TEST ' + out.filter(l => l.startsWith('FAIL')).length + ' failures | ' + out.join(' | ');
  window.__testResults = out;
}

// ---------- boot ----------
if (typeof THREE === 'undefined') {
  $('webgl-error').classList.remove('hidden');
  $('webgl-error').textContent = 'Three.js gagal dimuat (vendor/three.min.js tidak ditemukan).';
} else {
  try {
    buildCity();
    resetCity();
    if (SHOT >= 1 && SHOT <= 4) { stageShot(SHOT); }
    else if (TEST) { G = newRun(); resetCity(); G.started = true; $('start').classList.add('hidden'); $('hud').classList.remove('hidden'); runChecks(); refreshHud(); }
    requestAnimationFrame(loop);
  } catch (e) {
    $('webgl-error').classList.remove('hidden');
    $('webgl-error').textContent = 'WebGL error: ' + e.message;
    document.title = 'BOOT FAIL: ' + e.message;
  }
}
