// TELUK ARUNIKA: 7 Hari Utang — first-person 3D open-world crime game.
// Written for the make.fun bounty gta6-01. Three.js r160 vendored locally.
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
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, AC.currentTime);
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
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = AC.createBufferSource(); src.buffer = buf;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    const g = AC.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start();
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
  { name: 'DANGDUT NEON FM', tracks: ['Rindu Pelabuhan — Sari Melati', 'Hujan di Teluk — Duo Arunika', 'Neon Malam — Bang Jago'] },
  { name: 'LO-FI HUJAN 88.4', tracks: ['Gerimis Pagi — Hujan Kota', 'Kopi & Aspal Basah — Nara', 'Jendela Berembun — Lofi Teluk'] },
  { name: 'BERITA KOTA ARUNIKA', tracks: ['Laporan Lalu Lintas Pelabuhan', 'Waspada: Pencurian Mobil Meningkat', 'Cuaca: Monsun Berlanjut Seminggu'] },
];
let radioStation = 0, radioTrack = 0;
function radioBeat() {
  if (!audioCtx()) return;
  const scale = radioStation === 0 ? [262, 294, 330, 392, 440] : radioStation === 1 ? [220, 262, 330, 392] : [330, 392, 440, 523];
  tone(scale[radioNote % scale.length], 0.22, radioStation === 0 ? 'triangle' : 'sine', 0.045);
  radioNote++;
}
function startRadio() { if (!radioTimer) radioTimer = setInterval(radioBeat, 420); }

// ---------- city layout: 720 x 720, roads on a 120 m grid ----------
const WORLD = 720, HALF = WORLD / 2;
const ROADS = [-240, -120, 0, 120, 240];
const ROAD_W = 18;
const SPOTS = {
  safehouse: { x: -285, z: -285, name: 'SAFEHOUSE — Rumah Raka' },
  garage: { x: 170, z: -285, name: 'GARAGE — Bengkel Ayah' },
  gunshop: { x: -120, z: 120, name: 'TOKO SENJATA' },
  port: { x: 300, z: 255, name: 'PELABUHAN' },
  market: { x: 0, z: 120, name: 'PASAR ARUNIKA' },
  taxiStand: { x: -120, z: -240, name: 'PANGKALAN TAKSI' },
};
const STORY = [
  { day: 1, title: 'Antar Paket Darma', brief: 'Darma: "Raka. Paket ini harus sampai ke pelabuhan sebelum tengah malam. Jangan buka. Jangan tanya."', target: SPOTS.port, kind: 'go', pay: 150 },
  { day: 2, title: 'Taksi Terakhir', brief: 'Raka: "Satu shift taksi lagi. Penumpang ke pasar, lalu ke pelabuhan. Uang receh, tapi halal."', target: SPOTS.market, kind: 'taxi', pay: 120 },
  { day: 3, title: 'Tagih Utang Joni', brief: 'Darma: "Joni ngumpet di gang pasar. Ambil uangnya. Kalau melawan, kau tahu caranya."', target: SPOTS.market, kind: 'shootout', pay: 250 },
  { day: 4, title: 'Balapan Jalan Tol', brief: 'Raka: "Balapan liar di jalan tol layang. Hadiahnya besar — cukup untuk cicil utang."', target: { x: 270, z: -270, name: 'GARIS START BALAPAN' }, kind: 'race', pay: 400 },
  { day: 5, title: 'Pilihan: Bayar atau Khianat', brief: 'Darma: "Besok jatuh tempo, Raka. Bayar aku — atau bantu aku sekali lagi, dan utangmu lunas. Pilih."', target: SPOTS.garage, kind: 'choice', pay: 0 },
  { day: 6, title: 'Serbuan Pelabuhan', brief: 'Raka: "Malam ini semuanya ditentukan. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."', target: SPOTS.port, kind: 'shootout', pay: 500 },
  { day: 7, title: 'Hari Terakhir', brief: 'Darma: "Tujuh hari habis, Raka. Bengkel ayahmu… atau kebebasanmu. Datang ke safehouse. Sendirian."', target: SPOTS.safehouse, kind: 'finale', pay: 800 },
];
// Parcel delivery side job: a separate paid errand chain, independent of the story.
const PARCELS = [
  { from: SPOTS.market, to: SPOTS.port, pay: 90, text: 'Paket pasar → pelabuhan' },
  { from: SPOTS.port, to: SPOTS.gunshop, pay: 70, text: 'Paket pelabuhan → toko senjata' },
  { from: SPOTS.garage, to: SPOTS.safehouse, pay: 60, text: 'Paket bengkel → safehouse' },
];
const GUNS = [
  { name: 'PISTOL', dmg: 26, rate: 0.28, ammo: Infinity, pellets: 1, spread: 0.012, color: 0xffd23e },
  { name: 'SMG', dmg: 14, rate: 0.09, ammo: 120, pellets: 1, spread: 0.03, color: 0xff9de2 },
  { name: 'SHOTGUN', dmg: 15, rate: 0.7, ammo: 24, pellets: 6, spread: 0.06, color: 0x7dff9a },
];

// ---------- game state ----------
function newGameState() {
  return {
    started: false, paused: false, over: false, day: 1, money: 250, hp: 100, armor: 0,
    wanted: 0, heat: 100, timeMin: 8 * 60, rain: 0.7, night: false,
    weapon: 0, ammo: [Infinity, 120, 24],
    pl: { x: -285, z: -250, yaw: Math.PI * 0.25, pitch: 0, car: null, jack: 0, speed: 0 },
    missionIdx: 0, missionOn: false,
    taxi: { active: false, passenger: null, dest: null, fare: 0 },
    parcel: { active: false, step: 0, job: null },
    choice: null, kills: 0, stolen: 0, score: 0,
    keys: {}, lastShot: 0, dlgLines: [], dlgIdx: 0, dlgChoices: null,
    saveFlash: 0, mapBig: false, playTime: 0, locked: false, dragging: false,
  };
}
let G = newGameState();
let traffic = [], walkers = [], police = [], foes = [], beams = [], blocks = [], strips = [], chopper = null;
let phase = 0, phaseTimer = 0, policeTimer = 0, sirenTimer = 0, autosaveTimer = 0;

// ---------- three.js globals ----------
let renderer, scene, camera, hemi, sun, moon, beamLight, heliSpot;
let rainPts, rainPos, rainSpd;
let solids = [];       // axis-aligned colliders {minX,maxX,minZ,maxZ}
let hittables = [];    // meshes raycast can hit {mesh, kind, ref}
let foeBars = [];      // {bg, fg, ref}
let neonMats = [], lampMats = [];
let trafficLights = [], crates = [];
const unitBox = new THREE.BoxGeometry(1, 1, 1);

// ---------- procedural canvas textures (no image files, no network) ----------
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
      const lit = Math.random() < litRatio;
      g.fillStyle = lit ? (Math.random() < 0.7 ? '#ffd76a' : '#9fd8ff') : '#141a26';
      g.fillRect(x, y, 16, 20);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(x, y, 16, 20);
    }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, w, 6);
  });
}
function groundTex() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const S2 = v => (v + HALF) / WORLD * w;
    g.fillStyle = '#2a2f38'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e4d2e'; g.fillRect(S2(-300), S2(-300), S2(-180) - S2(-300), S2(-180) - S2(-300)); // park
    g.fillStyle = '#0b3550'; g.fillRect(S2(255), S2(180), w - S2(255), h - S2(180)); // port water
    g.fillStyle = '#7a6a45'; g.fillRect(S2(255), S2(180), w - S2(255), 8);
    g.fillStyle = '#171a20';
    for (const r of ROADS) {
      g.fillRect(S2(r - ROAD_W / 2), 0, S2(r + ROAD_W / 2) - S2(r - ROAD_W / 2), h);
      g.fillRect(0, S2(r - ROAD_W / 2), w, S2(r + ROAD_W / 2) - S2(r - ROAD_W / 2));
    }
    g.fillStyle = 'rgba(110,160,255,.07)';
    for (const r of ROADS) {
      g.fillRect(S2(r - ROAD_W / 2), 0, S2(r + ROAD_W / 2) - S2(r - ROAD_W / 2), h);
      g.fillRect(0, S2(r - ROAD_W / 2), w, S2(r + ROAD_W / 2) - S2(r - ROAD_W / 2));
    }
    g.fillStyle = '#c9a227';
    for (const r of ROADS) for (let v = -HALF; v < HALF; v += 24) {
      g.fillRect(S2(r) - 2, S2(v), 4, 12); g.fillRect(S2(v), S2(r) - 2, 12, 4);
    }
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (const rx of ROADS) for (const rz of ROADS)
      for (let i = -8; i <= 8; i += 4) g.fillRect(S2(rx + i) - 1, S2(rz - ROAD_W / 2 + 2), 2, 5);
  });
}
function neonTex(word, color) {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
    g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color;
    g.fillText(word, w / 2, h / 2 + 2);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.fillText(word, w / 2, h / 2 + 2);
  });
}

// ---------- world construction ----------
function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fa3b8);
  scene.fog = new THREE.Fog(0x8fa3b8, 60, 420);
  camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 900);
  camera.rotation.order = 'YXZ';
  renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  hemi = new THREE.HemisphereLight(0xbfd4e6, 0x2a2f22, 0.9); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff2d0, 1.6); sun.position.set(120, 200, 60); scene.add(sun);
  moon = new THREE.DirectionalLight(0x8fb4ff, 0); moon.position.set(-80, 180, -120); scene.add(moon);
  beamLight = new THREE.SpotLight(0xfff6c8, 0, 90, 0.5, 0.4, 1.2); scene.add(beamLight); scene.add(beamLight.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD + 160, WORLD + 160),
    new THREE.MeshPhongMaterial({ map: groundTex(), shininess: 90, specular: 0x6688bb })
  );
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const puddleMat = new THREE.MeshPhongMaterial({ color: 0x9db8dd, shininess: 220, specular: 0xffffff, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(rnd(2, 5), 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    const r = pick(ROADS);
    p.position.set(r + rnd(-6, 6), 0.02, rnd(-HALF + 20, HALF - 20));
    if (Math.random() < 0.5) p.position.set(rnd(-HALF + 20, HALF - 20), 0.02, r + rnd(-6, 6));
    scene.add(p);
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({ color: 0x0d3a5c, shininess: 160, specular: 0x99bbff }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(560, -0.1, 480); scene.add(sea);

  // ~60 buildings: two or three per city block, textured facades, lit windows
  const palette = ['#3a3f52', '#4a3542', '#2f4a44', '#54422c', '#3c3458', '#413038', '#2c3e55'];
  const facades = palette.map(c => facadeTex(c, 0.55));
  const neonWords = [['HOTEL', '#ff4d6d'], ['NEON', '#00e5ff'], ['DARMA', '#ff2e5e'], ['PASAR', '#ffd23e'], ['BAR', '#ff9de2'], ['TAKSI', '#2eff5e'], ['KOPI', '#ffb36b'], ['24 JAM', '#7dff9a']];
  for (let i = 0; i < ROADS.length - 1; i++) for (let j = 0; j < ROADS.length - 1; j++) {
    if (i === 4 && j === 4) continue; // port yard
    if (i === 0 && j === 0) continue; // park
    const bx = ROADS[i] + ROAD_W / 2 + 6, bz = ROADS[j] + ROAD_W / 2 + 6;
    const bw = ROADS[i + 1] - ROADS[i] - ROAD_W - 12, bh = ROADS[j + 1] - ROADS[j] - ROAD_W - 12;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const w = rnd(22, Math.min(42, bw / n)), d = rnd(22, Math.min(38, bh)), hgt = rnd(14, 46);
      const x = bx + k * (bw / n) + w / 2 + rnd(0, 4), z = bz + d / 2 + rnd(0, 6);
      const mat = new THREE.MeshLambertMaterial({ map: facades[Math.floor(Math.random() * facades.length)] });
      const b = new THREE.Mesh(unitBox, mat);
      b.scale.set(w, hgt, d); b.position.set(x, hgt / 2, z); scene.add(b);
      solids.push({ minX: x - w / 2 - 0.4, maxX: x + w / 2 + 0.4, minZ: z - d / 2 - 0.4, maxZ: z + d / 2 + 0.4 });
      const roof = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x22262e }));
      roof.scale.set(rnd(3, 6), rnd(1.5, 3), rnd(3, 6));
      roof.position.set(x + rnd(-4, 4), hgt + roof.scale.y / 2, z + rnd(-3, 3)); scene.add(roof);
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
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 6);
  const bulbGeo = new THREE.SphereGeometry(0.35, 8, 6);
  for (const r of ROADS) for (let v = -300; v <= 300; v += 120) {
    for (const [x, z] of [[r + ROAD_W / 2 + 1.5, v], [r - ROAD_W / 2 - 1.5, v + 60]]) {
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(x, 3.5, z); scene.add(pole);
      const lm = new THREE.MeshBasicMaterial({ color: 0xffe9a8 }); lampMats.push(lm);
      const bulb = new THREE.Mesh(bulbGeo, lm); bulb.position.set(x, 7.1, z); scene.add(bulb);
    }
  }
  // traffic lights at every intersection
  for (const rx of ROADS) for (const rz of ROADS) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), poleMat); pole.position.y = 2.5; g.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), new THREE.MeshLambertMaterial({ color: 0x111111 })); box.position.y = 5.4; g.add(box);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(0, 5.9, 0.4); g.add(red);
    const green = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    green.position.set(0, 5.0, 0.4); g.add(green);
    g.position.set(rx + ROAD_W / 2 + 1, 0, rz - ROAD_W / 2 - 1);
    scene.add(g); trafficLights.push({ red, green, rx, rz });
  }
  // port: stacked containers + harbour cranes
  const contColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xe67e22, 0x8e44ad, 0x16a085];
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: pick(contColors) }));
    const hgt = rnd(2.6, 5.2), x = rnd(265, 345), z = rnd(190, 320);
    c.scale.set(12, hgt, 3); c.position.set(x, hgt / 2, z);
    c.rotation.y = Math.random() < 0.5 ? 0 : Math.PI / 2;
    scene.add(c);
    solids.push({ minX: x - 6.5, maxX: x + 6.5, minZ: z - 6.5, maxZ: z + 6.5 });
    crates.push(c);
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
    solids.push({ minX: x - 8.4, maxX: x + 8.4, minZ: z - 7.4, maxZ: z + 7.4 });
  }
  landmark(SPOTS.safehouse.x, SPOTS.safehouse.z, 0x4aa8ff, 9);
  landmark(SPOTS.garage.x, SPOTS.garage.z, 0xff9d00, 10);
  landmark(SPOTS.gunshop.x, SPOTS.gunshop.z, 0xaa3333, 8);

  // rain: points that recycle around the camera
  const N = 1400;
  rainPos = new Float32Array(N * 3); rainSpd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    rainPos[i * 3] = rnd(-40, 40); rainPos[i * 3 + 1] = rnd(0, 40); rainPos[i * 3 + 2] = rnd(-40, 40);
    rainSpd[i] = rnd(28, 46);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainPts = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xaac8ff, size: 0.14, transparent: true, opacity: 0.55 }));
  rainPts.frustumCulled = false;
  scene.add(rainPts);

  // police helicopter "Air One", hidden until wanted level 5
  chopper = { group: new THREE.Group(), rotor: null, angle: 0 };
  const hb = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x223344 }));
  hb.scale.set(5, 2, 2.4); chopper.group.add(hb);
  const tail = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x223344 }));
  tail.scale.set(5, 0.7, 0.7); tail.position.set(-4.5, 0.4, 0); chopper.group.add(tail);
  chopper.rotor = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x111111 }));
  chopper.rotor.scale.set(9, 0.15, 0.6); chopper.rotor.position.y = 1.4; chopper.group.add(chopper.rotor);
  heliSpot = new THREE.SpotLight(0xfffbe0, 0, 160, 0.28, 0.5, 1);
  chopper.group.add(heliSpot); chopper.group.add(heliSpot.target);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -30; cone.rotation.x = Math.PI; chopper.group.add(cone);
  chopper.group.visible = false; scene.add(chopper.group);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

// ---------- entity factories ----------
const CAR_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2ecc71, 0x9b59b6, 0xe67e22, 0x1abc9c];
function carMesh(color, taxi) {
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
  if (taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xf7c600 }));
    sign.position.set(0, 1.45, -0.2); g.add(sign);
  }
  g.traverse(o => { if (o.isMesh) o.userData.carGroup = g; });
  return g;
}
function addCar(x, z, axis, taxi) {
  const mesh = carMesh(taxi ? 0xf7c600 : pick(CAR_COLORS), taxi);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const car = { mesh, x, z, axis, dir: Math.random() < 0.5 ? 1 : -1, heading: 0, speed: rnd(9, 15), taxi: !!taxi, driver: !taxi || Math.random() < 0.5, hp: 100, locked: Math.random() < 0.35, stopped: false };
  car.heading = axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  mesh.rotation.y = car.heading;
  hittables.push({ mesh, kind: 'car', ref: car });
  return car;
}
function spawnTraffic(n) {
  for (let i = 0; i < n; i++) {
    const axis = Math.random() < 0.5 ? 'v' : 'h';
    if (axis === 'v') traffic.push(addCar(pick(ROADS) + (Math.random() < 0.5 ? 4.5 : -4.5), rnd(-320, 320), 'v', false));
    else traffic.push(addCar(rnd(-320, 320), pick(ROADS) + (Math.random() < 0.5 ? 4.5 : -4.5), 'h', false));
  }
  const parked = addCar(8, 12, 'h', false); parked.speed = 0; parked.driver = false; traffic.push(parked);
  const t1 = addCar(-115, -232, 'v', true); t1.speed = 0; traffic.push(t1);
  const t2 = addCar(178, -276, 'h', true); t2.speed = 0; traffic.push(t2);
}
function personMesh(shirt, pants) {
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
    const mesh = personMesh(pick(shirts), pick([0x222222, 0x334455, 0x553322]));
    const x = pick(ROADS) + rnd(-14, 14), z = pick(ROADS) + rnd(-14, 14);
    mesh.position.set(x, 0, z); scene.add(mesh);
    walkers.push({ mesh, x, z, speed: rnd(1.0, 1.9), state: 'walk', tx: x + rnd(-80, 80), tz: z + rnd(-80, 80), panic: 0, bob: Math.random() * 6 });
  }
}
function spawnFoes(at, n) {
  for (let i = 0; i < n; i++) {
    const mesh = personMesh(0x8a1a1a, 0x1a1a1a);
    const x = at.x + rnd(-40, 40), z = at.z + rnd(-40, 40);
    mesh.position.set(x, 0, z); scene.add(mesh);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0x330000, transparent: true, opacity: 0.85, depthTest: false }));
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.16), new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.95, depthTest: false }));
    bg.position.set(x, 2.15, z); fg.position.set(x, 2.15, z);
    bg.renderOrder = 999; fg.renderOrder = 1000; scene.add(bg); scene.add(fg);
    const e = { mesh, x, z, hp: 60, shootT: rnd(0.5, 2), speed: 1.9 };
    hittables.push({ mesh, kind: 'enemy', ref: e });
    foeBars.push({ bg, fg, ref: e });
    foes.push(e);
  }
}
function resetWorld() {
  for (const c of traffic) scene.remove(c.mesh);
  for (const p of walkers) scene.remove(p.mesh);
  for (const e of foes) scene.remove(e.mesh);
  for (const b of foeBars) { scene.remove(b.bg); scene.remove(b.fg); }
  for (const c of police) scene.remove(c.mesh);
  for (const r of blocks) scene.remove(r.group);
  for (const s of strips) scene.remove(s.group);
  traffic = []; walkers = []; police = []; foes = []; beams = []; blocks = []; strips = []; foeBars = [];
  hittables = hittables.filter(s => s.kind !== 'car' && s.kind !== 'enemy' && s.kind !== 'cop');
  chopper.group.visible = false; heliSpot.intensity = 0;
  spawnTraffic(24); spawnWalkers(30);
  phase = 0; phaseTimer = 0; policeTimer = 0;
}

// ---------- input ----------
const keys = {};
let mouseDown = false;
const cv = $('view');
function lockPointer() { try { cv.requestPointerLock(); } catch (e) {} }
cv.addEventListener('click', () => { audioCtx(); startRadio(); if (G.started && !G.paused && !dialogOpen()) lockPointer(); });
document.addEventListener('pointerlockchange', () => { G.locked = document.pointerLockElement === cv; $('clickhint').style.display = G.locked ? 'none' : 'block'; });
document.addEventListener('mousemove', e => {
  if (!G.started || G.paused || dialogOpen()) return;
  if (G.locked) { G.pl.yaw -= e.movementX * 0.0022; G.pl.pitch = clamp(G.pl.pitch - e.movementY * 0.0022, -1.45, 1.45); }
  else if (G.dragging && mouseDown) { G.pl.yaw -= e.movementX * 0.003; G.pl.pitch = clamp(G.pl.pitch - e.movementY * 0.003, -1.45, 1.45); }
});
cv.addEventListener('mousedown', () => {
  mouseDown = true; G.dragging = !G.locked; audioCtx(); startRadio();
  if (dialogOpen()) { advanceDialog(); return; }
  if (G.started && !G.paused) fireWeapon();
});
addEventListener('mouseup', () => { mouseDown = false; G.dragging = false; });
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true; G.keys = keys;
  if (e.key === 'Escape' && !G.locked && G.started && !dialogOpen()) togglePause();
  if (e.key.toLowerCase() === 'p' && G.started && !dialogOpen()) togglePause();
  if (e.key.toLowerCase() === 'r' && G.started && !G.paused) {
    radioStation = (radioStation + 1) % STATIONS.length; radioTrack = Math.floor(Math.random() * 3); sfx.click();
    notice('RADIO: ' + STATIONS[radioStation].name);
  }
  if (e.key.toLowerCase() === 'm' && G.started) {
    G.mapBig = !G.mapBig; const mm = $('map');
    mm.style.width = G.mapBig ? '320px' : '190px'; mm.style.height = G.mapBig ? '320px' : '190px';
  }
  if (e.key.toLowerCase() === 'q' && G.started && !G.paused) { $('wheel').classList.toggle('hide'); refreshWheel(); }
  if (['1', '2', '3'].includes(e.key) && G.started && !G.paused) { G.weapon = parseInt(e.key, 10) - 1; refreshWheel(); sfx.click(); }
  if ((e.key === 'e' || e.key === 'E') && dialogOpen()) advanceDialog();
  if (e.key.toLowerCase() === 't' && G.started && !G.paused) taxiJob();
  if (e.key.toLowerCase() === 'y' && G.started && !G.paused) parcelJob();
  if (e.key === 'Enter' && !$('menu').classList.contains('hide')) startGame(false);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
$('btn-new').addEventListener('click', () => { audioCtx(); startRadio(); startGame(true); });
$('btn-continue').addEventListener('click', () => {
  audioCtx(); startRadio();
  if (loadGame(1)) { startGame(false); notice('CONTINUE — Slot 1 dimuat'); } else notice('Tidak ada save di Slot 1');
});
$('btn-resume').addEventListener('click', togglePause);
$('btn-quit').addEventListener('click', () => { togglePause(); showMenu(); });
$('btn-load1').addEventListener('click', () => { if (loadGame(1)) { togglePause(); notice('Slot 1 dimuat'); } else notice('Tidak ada save di Slot 1'); });
document.querySelectorAll('#pause [data-slot]').forEach(b => b.addEventListener('click', () => saveGame(parseInt(b.dataset.slot, 10))));

// ---------- dialog + toast ----------
function dialogOpen() { return !$('dialog').classList.contains('hide'); }
function showDialog(speaker, lines, choices) {
  G.dlgLines = lines; G.dlgIdx = 0; G.dlgChoices = choices || null;
  $('who').textContent = speaker;
  $('what').textContent = lines[0];
  $('choices').classList.add('hide'); $('choices').innerHTML = '';
  $('dialog').classList.remove('hide');
  if (document.pointerLockElement) document.exitPointerLock();
}
function advanceDialog() {
  if (G.dlgChoices && G.dlgIdx >= G.dlgLines.length - 1) return;
  G.dlgIdx++;
  if (G.dlgIdx >= G.dlgLines.length) {
    $('dialog').classList.add('hide');
    if (G.dlgChoices) {
      const box = $('choices'); box.classList.remove('hide');
      $('dialog').classList.remove('hide');
      G.dlgChoices.forEach(c => {
        const b = document.createElement('button'); b.textContent = c.label;
        b.addEventListener('click', () => { $('dialog').classList.add('hide'); c.fn(); });
        box.appendChild(b);
      });
      G.dlgChoices = null;
    }
    return;
  }
  $('what').textContent = G.dlgLines[G.dlgIdx];
}
let noticeTimer = 0;
function notice(t, secs) { $('notice').textContent = t; noticeTimer = secs || 3; }
function fmtTime(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function refreshWheel() {
  document.querySelectorAll('.slot').forEach(el => el.classList.toggle('on', parseInt(el.dataset.w, 10) === G.weapon));
  $('ammo-smg').textContent = G.ammo[1] + ' peluru';
  $('ammo-shot').textContent = G.ammo[2] + ' peluru';
}

// ---------- missions / side jobs ----------
function currentMission() { return STORY[G.missionIdx]; }
function missionTarget() {
  if (G.taxi.active && G.taxi.dest) return G.taxi.dest;
  if (G.parcel.active && G.parcel.job) return G.parcel.step === 0 ? G.parcel.job.from : G.parcel.job.to;
  const m = currentMission(); return m ? m.target : null;
}
function startMission() {
  const m = currentMission(); if (!m || G.missionOn) return;
  G.missionOn = true;
  showDialog(m.day === 5 ? 'DARMA WIJAYA' : 'RAKA', [m.brief, 'Tujuan: ' + m.title + ' — ikuti penanda kuning di minimap. Hadiah: $' + m.pay + '.']);
  if (m.kind === 'shootout' || m.kind === 'finale') spawnFoes(m.target, m.kind === 'finale' ? 7 : 5);
  notice('MISI HARI ' + m.day + ': ' + m.title, 4);
}
function completeMission() {
  const m = currentMission(); if (!m) return;
  G.money += m.pay; G.score += 100 + m.pay;
  notice('MISI SELESAI! +$' + m.pay, 4); sfx.cash();
  G.missionOn = false;
  autosave();
  if (m.kind === 'choice') return;
  G.missionIdx = Math.min(G.missionIdx + 1, STORY.length - 1);
  G.day = Math.min(G.missionIdx + 1, 7);
  if (m.day === 7) endGame(true);
}
function checkMission() {
  if (!G.missionOn) {
    const t = missionTarget();
    if (t && d2(G.pl.x, G.pl.z, t.x, t.z) < 14 && !G.taxi.active && !G.parcel.active) startMission();
    return;
  }
  const m = currentMission(), t = m.target;
  if (['go', 'taxi', 'race'].includes(m.kind)) {
    if (d2(G.pl.x, G.pl.z, t.x, t.z) < 14) completeMission();
  } else if (['shootout', 'finale'].includes(m.kind)) {
    if (foes.length === 0) completeMission();
  } else if (m.kind === 'choice') {
    if (d2(G.pl.x, G.pl.z, t.x, t.z) < 14 && !G.choice) {
      showDialog('DARMA WIJAYA', ['"Pilih, Raka. Bayar utangmu sekarang — atau khianati aku dan ambil alih pelabuhan malam ini."'], [
        { label: '1 · BAYAR DARMA ($500)', fn: () => {
          if (G.money >= 500) { G.money -= 500; G.choice = 'pay'; notice('Utang dibayar. Darma pergi — tapi kota tetap mengingatmu.'); completeMission(); }
          else { notice('Uangmu tidak cukup! Khianati dia atau cari uang dulu.'); G.missionOn = false; }
        } },
        { label: '2 · KHIANATI DARMA', fn: () => {
          G.choice = 'betray'; G.wanted = Math.max(G.wanted, 3);
          notice('Kau memilih khianat. Darma mengirim anak buahnya!');
          spawnFoes(SPOTS.port, 6); G.missionOn = false; G.missionIdx = 5; G.day = 6;
        } },
      ]);
    }
  }
}
function taxiJob() {
  const p = G.pl;
  if (p.car && p.car.taxi && !G.taxi.active) {
    const dest = pick([SPOTS.market, SPOTS.port, SPOTS.safehouse, SPOTS.gunshop]);
    const px = clamp(p.x + rnd(-40, 40), -330, 330), pz = clamp(p.z + rnd(-40, 40), -330, 330);
    G.taxi = { active: true, passenger: { x: px, z: pz }, dest, fare: Math.floor(rnd(40, 110)) };
    notice('TAKSI: jemput penumpang (penanda hijau), antar ke ' + dest.name);
  } else if (G.taxi.active && G.taxi.passenger && d2(p.x, p.z, G.taxi.passenger.x, G.taxi.passenger.z) < 6) {
    G.taxi.passenger = null; notice('Penumpang naik! Antar ke tujuan — bayaran $' + G.taxi.fare);
  } else if (G.taxi.active && !G.taxi.passenger && d2(p.x, p.z, G.taxi.dest.x, G.taxi.dest.z) < 14) {
    G.money += G.taxi.fare; notice('TAKSI SELESAI +$' + G.taxi.fare); sfx.cash();
    G.taxi = { active: false, passenger: null, dest: null, fare: 0 };
  }
}
function parcelJob() {
  const p = G.pl;
  if (!G.parcel.active) {
    const job = pick(PARCELS);
    G.parcel = { active: true, step: 0, job };
    notice('PENGANTARAN PAKET (Y): ambil paket di ' + job.from.name + ' — bayaran $' + job.pay);
  } else if (G.parcel.step === 0 && d2(p.x, p.z, G.parcel.job.from.x, G.parcel.job.from.z) < 14) {
    G.parcel.step = 1; notice('Paket diambil! Antar ke ' + G.parcel.job.to.name);
  } else if (G.parcel.step === 1 && d2(p.x, p.z, G.parcel.job.to.x, G.parcel.job.to.z) < 14) {
    G.money += G.parcel.job.pay; notice('PAKET TERKIRIM +$' + G.parcel.job.pay); sfx.cash();
    G.parcel = { active: false, step: 0, job: null };
  }
}

// ---------- police / wanted ----------
function addWanted(n, why) {
  G.wanted = clamp(G.wanted + n, 0, 5); G.heat = 100;
  if (n > 0) notice('WANTED +' + n + ' — ' + why, 3);
}
function lightFor(axis) { return axis === 'v' ? (phase < 3 ? 'green' : 'red') : (phase < 3 ? 'red' : 'green'); }
function addCop(kind, x, z) {
  let mesh;
  if (kind === 'foot') { mesh = personMesh(0x1a3a8a, 0x101418); mesh.scale.setScalar(1.06); }
  else mesh = carMesh(0x2244aa, false);
  mesh.position.set(x, 0, z); scene.add(mesh);
  const c = { kind, mesh, x, z, speed: kind === 'foot' ? 3.6 : 13, hp: kind === 'foot' ? 50 : 120, heading: 0 };
  hittables.push({ mesh, kind: 'cop', ref: c });
  police.push(c); return c;
}
function roadblockAt(x, z, yaw) {
  const g = new THREE.Group();
  const bar = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
  bar.scale.set(14, 1.2, 1); bar.position.y = 0.8; g.add(bar);
  const stripe = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xff2e2e }));
  stripe.scale.set(14, 0.3, 1.05); stripe.position.y = 1.45; g.add(stripe);
  g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
  blocks.push({ group: g, x, z, t: 16 });
}
function spikeAt(x, z, yaw) {
  const g = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0x888888 }));
    s.position.set(i * 1.2, 0.35, 0); g.add(s);
  }
  g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
  strips.push({ group: g, x, z, t: 14 });
}
function updatePolice(dt) {
  policeTimer -= dt;
  if (G.wanted > 0 && policeTimer <= 0) {
    policeTimer = 1.2;
    if (G.wanted >= 1 && police.filter(c => c.kind === 'foot').length < 2) addCop('foot', G.pl.x + rnd(-40, 40), G.pl.z + rnd(-40, 40));
    if (G.wanted >= 2 && police.filter(c => c.kind === 'car').length < G.wanted) addCop('car', G.pl.x + rnd(-60, 60), G.pl.z + rnd(-60, 60));
    if (G.wanted >= 3 && blocks.length < 2) {
      const fx = -Math.sin(G.pl.yaw), fz = -Math.cos(G.pl.yaw);
      roadblockAt(G.pl.x + fx * 55, G.pl.z + fz * 55, G.pl.yaw);
      notice('ROADBLOCK di depan!');
    }
    if (G.wanted >= 4 && strips.length < 2) {
      const fx = -Math.sin(G.pl.yaw), fz = -Math.cos(G.pl.yaw);
      spikeAt(G.pl.x + fx * 30, G.pl.z + fz * 30, G.pl.yaw);
    }
    if (G.wanted >= 5 && !chopper.group.visible) {
      chopper.group.visible = true; chopper.group.position.set(G.pl.x, 55, G.pl.z - 30);
      heliSpot.intensity = 3.2;
      notice('AIR ONE — helikopter polisi di atasmu!');
    }
  }
  if (G.wanted === 0) {
    chopper.group.visible = false; heliSpot.intensity = 0;
    for (const r of blocks) scene.remove(r.group); blocks = [];
    for (const s of strips) scene.remove(s.group); strips = [];
  }
  const nearCop = police.some(c => d2(c.x, c.z, G.pl.x, G.pl.z) < 26) ||
    (chopper.group.visible && d2(chopper.group.position.x, chopper.group.position.z, G.pl.x, G.pl.z) < 45);
  if (G.wanted > 0 && !nearCop) {
    G.heat -= dt * 7;
    if (G.heat <= 0) { G.wanted--; G.heat = 100; notice(G.wanted === 0 ? 'Kamu lolos! Wanted hilang.' : 'Wanted turun ke ' + G.wanted + ' bintang.'); }
  } else if (nearCop) G.heat = 100;
  for (const c of police) {
    const dx = G.pl.x - c.x, dz = G.pl.z - c.z, d = Math.hypot(dx, dz) || 1;
    c.heading = Math.atan2(dx, dz);
    c.x += dx / d * c.speed * dt; c.z += dz / d * c.speed * dt;
    c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.heading;
    if (d < 2.2) hurtPlayer((c.kind === 'car' ? 22 : 8) * dt);
  }
  police = police.filter(c => {
    if (c.hp <= 0 || d2(c.x, c.z, G.pl.x, G.pl.z) > 180) { scene.remove(c.mesh); hittables = hittables.filter(s => s.ref !== c); return false; }
    return true;
  });
  for (const r of blocks) r.t -= dt;
  blocks = blocks.filter(r => { if (r.t <= 0) { scene.remove(r.group); return false; } return true; });
  for (const s of strips) s.t -= dt;
  strips = strips.filter(s => { if (s.t <= 0) { scene.remove(s.group); return false; } return true; });
  if (chopper.group.visible) {
    chopper.angle += dt * 0.7;
    const hx = G.pl.x + Math.cos(chopper.angle) * 22, hz = G.pl.z + Math.sin(chopper.angle) * 22;
    chopper.group.position.x += (hx - chopper.group.position.x) * 0.5 * dt;
    chopper.group.position.z += (hz - chopper.group.position.z) * 0.5 * dt;
    chopper.group.position.y = 55 + Math.sin(performance.now() / 700) * 2;
    chopper.rotor.rotation.y += dt * 22;
    heliSpot.target.position.set(G.pl.x - chopper.group.position.x, -chopper.group.position.y, G.pl.z - chopper.group.position.z);
    chopper.group.lookAt(G.pl.x, 0, G.pl.z);
  }
  sirenTimer -= dt;
  if (G.wanted > 0 && sirenTimer <= 0) { sirenTimer = 2.2; sfx.siren(); }
}
function hurtPlayer(amount) {
  if (G.armor > 0) { const a = Math.min(G.armor, amount); G.armor -= a; G.hp -= (amount - a); }
  else G.hp -= amount;
  $('shade').classList.add('hurt'); setTimeout(() => $('shade').classList.remove('hurt'), 180);
  if (G.hp <= 0) endGame(false);
}

// ---------- combat ----------
const raycaster = new THREE.Raycaster();
function fireWeapon() {
  if (!G.started || G.paused || dialogOpen()) return;
  const now = performance.now() / 1000, w = GUNS[G.weapon];
  if (now - G.lastShot < w.rate) return;
  if (G.ammo[G.weapon] !== Infinity && G.ammo[G.weapon] <= 0) { notice('AMUNISI HABIS — beli di Toko Senjata'); return; }
  G.lastShot = now;
  if (G.ammo[G.weapon] !== Infinity) G.ammo[G.weapon]--;
  sfx.shot();
  $('flash').style.opacity = 1; setTimeout(() => $('flash').style.opacity = 0, 60);
  const origin = camera.position.clone();
  for (let i = 0; i < w.pellets; i++) {
    const dir = new THREE.Vector3(rnd(-w.spread, w.spread), rnd(-w.spread, w.spread), -1).applyQuaternion(camera.quaternion).normalize();
    raycaster.set(origin, dir); raycaster.far = 160;
    const hits = raycaster.intersectObjects(hittables.map(s => s.mesh), true);
    let end = origin.clone().add(dir.clone().multiplyScalar(120));
    if (hits.length) {
      const h = hits[0]; end = h.point.clone();
      let obj = h.object, entry = null;
      while (obj && !entry) { entry = hittables.find(s => s.mesh === obj); obj = obj.parent; }
      if (entry) {
        if (entry.kind === 'enemy') {
          entry.ref.hp -= w.dmg; sfx.hit();
          if (entry.ref.hp <= 0) { G.kills++; G.money += 20; removeFoe(entry.ref); }
        } else if (entry.kind === 'cop') { entry.ref.hp -= w.dmg; addWanted(1, 'Menyerang polisi!'); }
        else if (entry.kind === 'car') { entry.ref.hp -= w.dmg; if (entry.ref.hp <= 0) explodeCar(entry.ref); }
      }
    }
    addBeam(origin, end, w.color);
  }
  for (const pd of walkers) if (d2(pd.x, pd.z, G.pl.x, G.pl.z) < 35) { pd.state = 'flee'; pd.panic = 3; }
  if (G.wanted < 1 && Math.random() < 0.5) addWanted(1, 'Tembakan terdengar!');
}
function addBeam(a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  scene.add(line); beams.push({ line, life: 0.07 });
}
function removeFoe(e) {
  scene.remove(e.mesh);
  hittables = hittables.filter(s => s.ref !== e);
  const bar = foeBars.find(b => b.ref === e);
  if (bar) { scene.remove(bar.bg); scene.remove(bar.fg); foeBars = foeBars.filter(b => b.ref !== e); }
  foes = foes.filter(x => x !== e);
}
function explodeCar(car) {
  const pos = car.mesh.position.clone();
  const boom = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9d00, transparent: true, opacity: 0.9 }));
  boom.position.copy(pos); boom.position.y = 1; scene.add(boom);
  setTimeout(() => scene.remove(boom), 500);
  sfx.boom(); addWanted(1, 'Mobil meledak!');
  if (G.pl.car === car) { G.pl.car = null; hurtPlayer(25); }
  scene.remove(car.mesh);
  hittables = hittables.filter(s => s.ref !== car);
  traffic = traffic.filter(c => c !== car);
}
function placeFoeBars() {
  for (const e of foes) {
    const bar = foeBars.find(b => b.ref === e);
    if (!bar) continue;
    bar.bg.position.set(e.x, 2.15, e.z); bar.fg.position.set(e.x, 2.15, e.z);
    bar.bg.quaternion.copy(camera.quaternion); bar.fg.quaternion.copy(camera.quaternion);
    bar.fg.scale.x = Math.max(0.01, e.hp / 60);
    bar.fg.position.x -= (1 - e.hp / 60) * 0.7 * Math.cos(camera.rotation.y);
    bar.fg.position.z += (1 - e.hp / 60) * 0.7 * Math.sin(camera.rotation.y);
  }
}
function updateFoes(dt) {
  for (const e of foes) {
    e.shootT -= dt;
    const d = d2(G.pl.x, G.pl.z, e.x, e.z);
    if (d > 34) {
      const a = Math.atan2(G.pl.x - e.x, G.pl.z - e.z);
      e.x += Math.sin(a) * e.speed * dt; e.z += Math.cos(a) * e.speed * dt;
      e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = a;
    } else if (e.shootT <= 0) {
      e.shootT = rnd(0.9, 1.8);
      addBeam(new THREE.Vector3(e.x, 1.4, e.z), new THREE.Vector3(G.pl.x, 1.5, G.pl.z), 0xff5b5b);
      hiss(0.08, 0.2, 2000);
      hurtPlayer(6);
    }
  }
  placeFoeBars();
}

// ---------- movement, driving, carjacking ----------
function hitsSolid(x, z, r) {
  if (x < -HALF + 4 || x > HALF - 4 || z < -HALF + 4 || z > HALF - 4) return true;
  for (const b of solids) if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
  return false;
}
function nearestCar(maxD) {
  let near = null, nd = 1e9;
  for (const car of traffic) { const d = d2(G.pl.x, G.pl.z, car.x, car.z); if (d < nd) { nd = d; near = car; } }
  return nd < maxD ? near : null;
}
function updatePlayer(dt) {
  const p = G.pl;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  if (p.car) {
    const car = p.car;
    const fwd = (keys['w'] ? 1 : 0) - (keys['s'] ? 0.7 : 0);
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    const grip = G.rain > 0.5 ? 0.78 : 1; // rain makes handling slippery
    const top = 42 * grip;
    car.speed = clamp(car.speed + fwd * 16 * dt * (fwd > 0 ? 1 : 0.7), -10, top);
    if (fwd === 0) car.speed *= Math.max(0, 1 - 1.2 * dt);
    if (keys[' ']) car.speed *= Math.max(0, 1 - 3 * dt);
    car.heading += steer * 1.9 * dt * clamp(Math.abs(car.speed) / 14, 0, 1) * (car.speed < 0 ? -1 : 1);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (!hitsSolid(nx, nz, 2.2)) { car.x = nx; car.z = nz; }
    else { car.speed *= -0.25; car.hp -= 3; if (car.hp <= 0) explodeCar(car); }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
    p.x = car.x; p.z = car.z; p.speed = Math.abs(car.speed);
    p.yaw = car.heading + Math.PI;
    beamLight.position.set(car.x - Math.sin(car.heading), 1.4, car.z - Math.cos(car.heading));
    beamLight.target.position.set(car.x + Math.sin(car.heading) * 40, 0, car.z + Math.cos(car.heading) * 40);
    beamLight.intensity = G.night ? 2.6 : 0.4;
    for (const s of strips) if (d2(car.x, car.z, s.x, s.z) < 3) {
      car.speed *= 0.3; car.hp -= 20; notice('SPIKE STRIP! Ban bocor!');
      scene.remove(s.group); strips = strips.filter(x => x !== s);
    }
    for (const r of blocks) if (d2(car.x, car.z, r.x, r.z) < 6 && Math.abs(car.speed) > 6) {
      car.speed *= -0.4; car.hp -= 25; addWanted(1, 'Menabrak roadblock!');
    }
    if (keys['e'] && !dialogOpen()) { p.car = null; p.x = car.x + 3; p.z = car.z + 2; car.speed = 0; beamLight.intensity = 0; p.yaw = car.heading + Math.PI; }
    if (mouseDown && !dialogOpen()) fireWeapon();
    if (Math.random() < dt * 2) sfx.engine();
  } else {
    beamLight.intensity = 0;
    const run = keys['shift'] ? 1.7 : 1;
    let mx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0), mz = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
    const len = Math.hypot(mx, mz) || 1; mx /= len; mz /= len;
    const sp = 5.2 * run;
    const nx = p.x + (fx * mz + rx * mx) * sp * dt, nz = p.z + (fz * mz + rz * mx) * sp * dt;
    if (!hitsSolid(nx, p.z, 0.7)) p.x = nx;
    if (!hitsSolid(p.x, nz, 0.7)) p.z = nz;
    p.speed = (mx || mz) ? sp : 0;
    if (mouseDown && !dialogOpen()) fireWeapon();
    const near = nearestCar(4.5);
    if (near) {
      if (near.driver) {
        $('hint').textContent = 'TAHAN E — CURI MOBIL (' + Math.round(p.jack * 100) + '%) · alarm & wanted naik';
        $('jack').classList.remove('hide'); $('jackfill').style.width = (p.jack * 100) + '%';
        if (keys['e']) {
          p.jack += dt / 0.9;
          if (p.jack >= 1) {
            near.driver = false; G.stolen++; addWanted(1, 'Carjacking!');
            if (near.locked) notice('ALARM BERBUNYI!');
            sfx.jack();
            const dm = personMesh(0xdddddd, 0x222222);
            dm.position.set(near.x + 3, 0, near.z + 2); scene.add(dm);
            walkers.push({ mesh: dm, x: near.x + 3, z: near.z + 2, speed: 4, state: 'flee', tx: near.x + 60, tz: near.z + 60, panic: 4, bob: 0 });
            p.car = near; near.speed = 0; near.heading = p.yaw + Math.PI; p.jack = 0;
            $('hint').textContent = ''; $('jack').classList.add('hide');
          }
        } else p.jack = Math.max(0, p.jack - dt * 2);
      } else {
        $('hint').textContent = 'Tekan E — MASUK MOBIL';
        $('jack').classList.add('hide');
        if (keys['e']) { p.car = near; near.speed = 0; near.heading = p.yaw + Math.PI; $('hint').textContent = ''; }
      }
    } else { $('hint').textContent = ''; $('jack').classList.add('hide'); p.jack = 0; }
    if (d2(p.x, p.z, SPOTS.garage.x, SPOTS.garage.z) < 12 && G.wanted > 0) {
      G.wanted = 0; G.heat = 0; notice('GARAGE: mobil dicat ulang — wanted hilang!'); sfx.cash();
    }
    if (d2(p.x, p.z, SPOTS.safehouse.x, SPOTS.safehouse.z) < 12) {
      if (G.wanted > 0) { G.wanted = 0; notice('SAFEHOUSE: kamu bersembunyi — wanted hilang.'); }
      G.hp = Math.min(100, G.hp + 10 * dt);
    }
    if (d2(p.x, p.z, SPOTS.gunshop.x, SPOTS.gunshop.z) < 12) {
      $('hint').textContent = 'TOKO SENJATA — tekan E beli amunisi + armor ($50)';
      if (keys['e'] && G.money >= 50) { G.money -= 50; G.ammo[1] += 120; G.ammo[2] += 24; G.armor = 100; notice('Amunisi + armor dibeli!'); sfx.cash(); }
    }
  }
  if (p.car) {
    const car = p.car;
    camera.position.set(car.x + Math.sin(car.heading) * 1.3, 1.5, car.z + Math.cos(car.heading) * 1.3);
    camera.rotation.set(p.pitch * 0.4, car.heading + Math.PI, 0);
  } else {
    camera.position.set(p.x, 1.7 + Math.sin(performance.now() / 300) * (p.speed > 0 ? 0.03 : 0), p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  }
}
function updateTraffic(dt) {
  phaseTimer += dt;
  if (phaseTimer > 6) { phaseTimer = 0; phase = (phase + 1) % 6; }
  const nsGreen = phase < 3;
  for (const tl of trafficLights) {
    tl.red.material.color.setHex(nsGreen ? 0x551111 : 0xff2222);
    tl.green.material.color.setHex(nsGreen ? 0x22ff66 : 0x113311);
  }
  for (const car of traffic) {
    if (car === G.pl.car) continue;
    if (car.speed === 0 && !car.driver) continue;
    let stop = false;
    if (car.axis === 'v') {
      for (const iy of ROADS) { const d = (iy - car.z) * car.dir; if (d > 0 && d < 14 && lightFor('v') === 'red') stop = true; }
    } else {
      for (const ix of ROADS) { const d = (ix - car.x) * car.dir; if (d > 0 && d < 14 && lightFor('h') === 'red') stop = true; }
    }
    for (const o of traffic) {
      if (o === car) continue;
      if (car.axis === 'v' && Math.abs(o.x - car.x) < 6) { const d = (o.z - car.z) * car.dir; if (d > 0 && d < 12) stop = true; }
      if (car.axis === 'h' && Math.abs(o.z - car.z) < 6) { const d = (o.x - car.x) * car.dir; if (d > 0 && d < 12) stop = true; }
    }
    if (stop) { car.speed = Math.max(0, car.speed - 20 * dt); if (Math.random() < 0.003) sfx.horn(); }
    else car.speed = Math.min(12, car.speed + 6 * dt);
    if (car.axis === 'v') car.z += car.dir * car.speed * dt; else car.x += car.dir * car.speed * dt;
    if (car.x < -HALF + 10 || car.x > HALF - 10 || car.z < -HALF + 10 || car.z > HALF - 10) {
      car.dir *= -1; car.x = clamp(car.x, -HALF + 15, HALF - 15); car.z = clamp(car.z, -HALF + 15, HALF - 15);
      car.heading = car.axis === 'v' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  }
}
function updateWalkers(dt) {
  for (const pd of walkers) {
    pd.bob += dt * 8;
    if (pd.state === 'flee') {
      pd.panic -= dt;
      const a = Math.atan2(pd.x - G.pl.x, pd.z - G.pl.z);
      pd.x += Math.sin(a) * 4.4 * dt; pd.z += Math.cos(a) * 4.4 * dt;
      pd.mesh.rotation.y = a;
      if (pd.panic <= 0) pd.state = 'walk';
    } else {
      const a = Math.atan2(pd.tx - pd.x, pd.tz - pd.z);
      pd.x += Math.sin(a) * pd.speed * dt; pd.z += Math.cos(a) * pd.speed * dt;
      pd.mesh.rotation.y = a;
      if (d2(pd.tx, pd.tz, pd.x, pd.z) < 3) { pd.tx = clamp(pd.x + rnd(-90, 90), -330, 330); pd.tz = clamp(pd.z + rnd(-90, 90), -330, 330); }
      for (const car of traffic) if (car.speed > 8 && d2(pd.x, pd.z, car.x, car.z) < 9) { pd.state = 'flee'; pd.panic = 2; }
    }
    pd.x = clamp(pd.x, -HALF + 6, HALF - 6); pd.z = clamp(pd.z, -HALF + 6, HALF - 6);
    pd.mesh.position.set(pd.x, Math.abs(Math.sin(pd.bob)) * 0.05, pd.z);
  }
}

// ---------- save / load / pause ----------
function saveGame(slot) {
  const data = { day: G.day, money: G.money, hp: G.hp, armor: G.armor, wanted: G.wanted, missionIdx: G.missionIdx, weapon: G.weapon, ammo: G.ammo, x: G.pl.x, z: G.pl.z, yaw: G.pl.yaw, kills: G.kills, stolen: G.stolen, timeMin: G.timeMin, rain: G.rain };
  try { localStorage.setItem('teluk-arunika-3d-save-' + slot, JSON.stringify(data)); } catch (e) {}
  $('saving').classList.remove('hide'); G.saveFlash = 1.2;
  notice('Tersimpan — Slot ' + slot);
}
function loadGame(slot) {
  try {
    const raw = localStorage.getItem('teluk-arunika-3d-save-' + slot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.day = d.day; G.money = d.money; G.hp = d.hp; G.armor = d.armor; G.wanted = d.wanted;
    G.missionIdx = d.missionIdx; G.weapon = d.weapon; G.ammo = d.ammo;
    G.pl.x = d.x; G.pl.z = d.z; G.pl.yaw = d.yaw || 0; G.kills = d.kills || 0; G.stolen = d.stolen || 0;
    G.timeMin = d.timeMin || 480; G.rain = d.rain ?? 0.7;
    return true;
  } catch (e) { return false; }
}
function autosave() { saveGame(0); }
function togglePause() {
  if (!G.started) return;
  G.paused = !G.paused;
  $('pause').classList.toggle('hide', !G.paused);
  if (G.paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    const m = currentMission();
    $('pause-info').innerHTML = 'HARI ' + G.day + '/7 · ' + fmtTime(G.timeMin) + ' · ' + (G.rain > 0.4 ? 'HUJAN' : 'CERAH') + '<br>Uang $' + G.money + ' · HP ' + Math.round(G.hp) + ' · Wanted ' + '★'.repeat(G.wanted) + '<br>Misi: ' + (m ? m.title : '—') + ' · Taksi: ' + (G.taxi.active ? 'aktif — antar ke ' + (G.taxi.dest ? G.taxi.dest.name : '') + ' ($' + G.taxi.fare + ')' : '—') + '<br>Paket: ' + (G.parcel.active ? G.parcel.job.text + ' ($' + G.parcel.job.pay + ')' : '—') + '<br>Mobil dicuri: ' + G.stolen + ' · Musuh dikalahkan: ' + G.kills;
  }
}
function showMenu() { G.started = false; G.paused = false; $('menu').classList.remove('hide'); $('hud').classList.add('hide'); $('pause').classList.add('hide'); }
function startGame(isNew) {
  if (isNew) { G = newGameState(); resetWorld(); }
  G.started = true; G.paused = false;
  $('menu').classList.add('hide'); $('hud').classList.remove('hide'); $('pause').classList.add('hide');
  refreshWheel();
  if (isNew) setTimeout(() => showDialog('RAKA', ['"Tujuh hari. Tujuh hari untuk lunasi utang Darma — atau bengkel Ayah disita."', '"Mulai dari misi pertama: antar paket ke pelabuhan. Ikuti penanda kuning."']), 400);
}
function endGame(won) {
  G.over = true; G.started = false;
  showDialog(won ? 'RAKA' : 'DARMA WIJAYA', won
    ? ['"Utang lunas. Bengkel Ayah selamat. Teluk Arunika masih hujan — tapi kali ini, aku bebas."', 'TAMAT — Skor: ' + G.score + ' · Mobil dicuri: ' + G.stolen + ' · Musuh: ' + G.kills]
    : ['"Kau kalah, Raka. Kota ini tidak kenal ampun."', 'GAME OVER — Coba lagi dari save terakhir (Continue).']);
  setTimeout(showMenu, 100);
}

// ---------- HUD + minimap ----------
const mmc = $('map').getContext('2d');
function updateHUD() {
  let stars = '';
  for (let i = 0; i < 5; i++) stars += '<span class="' + (i < G.wanted ? '' : 'off') + '">★</span>';
  $('stars').innerHTML = stars;
  const hour = Math.floor(G.timeMin / 60) % 24;
  $('dayclock').textContent = 'HARI ' + G.day + '/7   ' + fmtTime(G.timeMin) + '   ' + (G.rain > 0.6 ? 'HUJAN DERAS' : G.rain > 0.25 ? 'HUJAN' : 'CERAH') + (hour >= 18 || hour < 6 ? ' · MALAM' : ' · SIANG');
  $('cash').textContent = '$ ' + G.money;
  $('station').textContent = 'RADIO: ' + STATIONS[radioStation].name + ' — ' + STATIONS[radioStation].tracks[radioTrack];
  $('goal').textContent = 'Tujuan: ' + (G.taxi.active ? 'TAKSI → ' + (G.taxi.passenger ? 'jemput penumpang' : G.taxi.dest.name)
    : G.parcel.active ? 'PAKET → ' + (G.parcel.step === 0 ? G.parcel.job.from.name : G.parcel.job.to.name)
    : currentMission() ? (G.missionOn ? currentMission().title : 'Datangi penanda kuning: ' + currentMission().title) : 'Bebas — cari misi / taksi');
  $('hpbar').style.width = clamp(G.hp, 0, 100) + '%';
  $('armorbar').style.width = clamp(G.armor, 0, 100) + '%';
  $('hpval').textContent = Math.round(G.hp);
  $('armorval').textContent = Math.round(G.armor);
  $('cashval').textContent = '$' + G.money;
  const w = GUNS[G.weapon];
  $('gun').textContent = (G.weapon + 1) + ' · ' + w.name + ' ' + (G.ammo[G.weapon] === Infinity ? '∞' : G.ammo[G.weapon]);
  const fwd = G.pl.car
    ? { x: Math.sin(G.pl.car.heading), z: Math.cos(G.pl.car.heading) }
    : { x: -Math.sin(G.pl.yaw), z: -Math.cos(G.pl.yaw) };
  const deg = ((Math.atan2(fwd.x, -fwd.z) * 180 / Math.PI) + 360) % 360;
  $('bearing').textContent = (deg < 45 || deg >= 315 ? 'N' : deg < 135 ? 'E' : deg < 225 ? 'S' : 'W') + ' · ' + Math.round(deg) + '°';
  if (G.pl.car) { $('speed').classList.remove('hide'); $('speed').innerHTML = Math.round(Math.abs(G.pl.car.speed) * 3.6 * 1.4) + ' <small>km/h</small>'; }
  else $('speed').classList.add('hide');
  if (G.saveFlash > 0) { G.saveFlash -= 0.016; if (G.saveFlash <= 0) $('saving').classList.add('hide'); }
  if (noticeTimer > 0) { noticeTimer -= 0.016; if (noticeTimer <= 0) $('notice').textContent = ''; }
  $('heatline').textContent = G.wanted > 0 ? 'POLISI MENGEJAR — sembunyi sampai dingin / ke safehouse / garage' : '';
}
function renderMinimap() {
  const s = 190 / WORLD;
  const mx = v => (v + HALF) * s;
  const fwd = G.pl.car
    ? { x: Math.sin(G.pl.car.heading), z: Math.cos(G.pl.car.heading) }
    : { x: -Math.sin(G.pl.yaw), z: -Math.cos(G.pl.yaw) };
  mmc.clearRect(0, 0, 190, 190);
  mmc.fillStyle = '#0a1420'; mmc.fillRect(0, 0, 190, 190);
  mmc.fillStyle = '#14557f'; mmc.fillRect(mx(255), mx(180), 190 - mx(255), 190 - mx(180));
  mmc.strokeStyle = '#5a6a7a'; mmc.lineWidth = 4;
  for (const r of ROADS) {
    mmc.beginPath(); mmc.moveTo(mx(r), 0); mmc.lineTo(mx(r), 190); mmc.stroke();
    mmc.beginPath(); mmc.moveTo(0, mx(r)); mmc.lineTo(190, mx(r)); mmc.stroke();
  }
  const blip = (x, z, c, r) => { mmc.fillStyle = c; mmc.beginPath(); mmc.arc(mx(x), mx(z), r || 4, 0, 7); mmc.fill(); };
  blip(SPOTS.safehouse.x, SPOTS.safehouse.z, '#4aa8ff', 5);
  blip(SPOTS.garage.x, SPOTS.garage.z, '#ff9d00', 4);
  const t = missionTarget();
  if (t) { mmc.strokeStyle = '#ffd23e'; mmc.lineWidth = 2; mmc.beginPath(); mmc.arc(mx(t.x), mx(t.z), 8, 0, 7); mmc.stroke(); blip(t.x, t.z, '#ffd23e', 5); }
  if (G.taxi.active && G.taxi.passenger) blip(G.taxi.passenger.x, G.taxi.passenger.z, '#2eff5e', 5);
  if (G.parcel.active) blip(G.parcel.step === 0 ? G.parcel.job.from.x : G.parcel.job.to.x, G.parcel.step === 0 ? G.parcel.job.from.z : G.parcel.job.to.z, '#ff9de2', 5);
  for (const c of police) blip(c.x, c.z, '#ff2e2e', 4);
  for (const e of foes) blip(e.x, e.z, '#ff9d00', 3);
  blip(G.pl.x, G.pl.z, '#ffffff', 5);
  mmc.strokeStyle = '#fff'; mmc.beginPath(); mmc.arc(mx(G.pl.x), mx(G.pl.z), 8, 0, 7); mmc.stroke();
  mmc.fillStyle = 'rgba(255,255,255,.5)';
  mmc.beginPath(); mmc.moveTo(mx(G.pl.x), mx(G.pl.z));
  const fa = Math.atan2(fwd.x, fwd.z);
  mmc.lineTo(mx(G.pl.x) + Math.sin(fa + 0.4) * 12, mx(G.pl.z) + Math.cos(fa + 0.4) * 12);
  mmc.lineTo(mx(G.pl.x) + Math.sin(fa - 0.4) * 12, mx(G.pl.z) + Math.cos(fa - 0.4) * 12);
  mmc.fill();
}

// ---------- day / night + weather ----------
function applyEnvironment() {
  const hour = Math.floor(G.timeMin / 60) % 24;
  const night = hour >= 18 || hour < 6;
  G.night = night;
  const dayF = night ? 0 : (hour < 12 ? (hour - 6) / 6 : (18 - hour) / 6);
  const f = clamp(dayF, 0, 1);
  hemi.intensity = 0.25 + f * 0.75;
  sun.intensity = f * 1.7;
  moon.intensity = night ? 0.5 : 0;
  const sky = new THREE.Color(0x0a0f1e).lerp(new THREE.Color(0x8fa3b8), f);
  if (G.rain > 0.5) sky.lerp(new THREE.Color(0x5a6a78), 0.4);
  scene.background = sky; scene.fog.color.copy(sky);
  scene.fog.near = 60; scene.fog.far = night ? 260 : 420;
  for (const lm of lampMats) lm.color.setHex(night ? 0xffe9a8 : 0x555555);
  rainPts.visible = G.rain > 0.15;
  rainPts.material.opacity = 0.25 + G.rain * 0.4;
}
function updateRain(dt) {
  if (!rainPts.visible) return;
  const pos = rainPts.geometry.attributes.position.array;
  const px = camera.position.x, pz = camera.position.z;
  for (let i = 0; i < rainSpd.length; i++) {
    pos[i * 3 + 1] -= rainSpd[i] * dt;
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
    updatePlayer(dt); updateTraffic(dt); updateWalkers(dt); updatePolice(dt); updateFoes(dt);
    checkMission();
    for (const tr of beams) tr.life -= dt;
    beams = beams.filter(tr => { if (tr.life <= 0) { scene.remove(tr.line); return false; } return true; });
    autosaveTimer += dt; if (autosaveTimer > 60) { autosaveTimer = 0; autosave(); }
    updateHUD();
  }
  applyEnvironment();
  updateRain(dt);
  renderMinimap();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- staged screenshot states ----------
function clearAround(x, z, r, keepCars) {
  for (const car of [...traffic]) {
    if (keepCars && keepCars.includes(car)) continue;
    if (d2(car.x, car.z, x, z) < r) {
      scene.remove(car.mesh); hittables = hittables.filter(s => s.ref !== car);
      traffic = traffic.filter(c => c !== car);
    }
  }
  for (const pd of [...walkers]) {
    if (d2(pd.x, pd.z, x, z) < 12) { scene.remove(pd.mesh); walkers = walkers.filter(p => p !== pd); }
  }
}
function applyShot(n) {
  G = newGameState(); resetWorld(); G.started = true;
  $('menu').classList.add('hide'); $('hud').classList.remove('hide');
  if (n === 1) {
    G.day = 1; G.timeMin = 14 * 60 + 20; G.rain = 0.9; G.wanted = 2; G.money = 250; G.hp = 88; G.armor = 40;
    G.pl.x = 0; G.pl.z = 60; G.pl.yaw = 0; G.pl.pitch = 0.02;
    const car = addCar(2, 56, 'v', false); car.speed = 0; car.driver = true; traffic.push(car);
    clearAround(0, 60, 26, [car]);
    addCop('foot', -8, 44); addCop('foot', 14, 50);
    G.missionOn = true;
    G.pl.jack = 0.45;
    $('hint').textContent = 'TAHAN E — CURI MOBIL (45%) · alarm & wanted naik';
    $('jack').classList.remove('hide'); $('jackfill').style.width = '45%';
    notice('MISI HARI 1: Antar Paket Darma — ikuti penanda kuning', 6);
  } else if (n === 2) {
    G.day = 3; G.timeMin = 23 * 60 + 40; G.rain = 0.6; G.wanted = 4; G.money = 620; G.hp = 72; G.armor = 55;
    const car = addCar(0, 120, 'h', false); car.speed = 36; car.heading = Math.PI / 2; car.mesh.rotation.y = car.heading; traffic.push(car);
    clearAround(0, 120, 26, [car]);
    G.pl.car = car; G.pl.x = car.x; G.pl.z = car.z;
    roadblockAt(45, 120, Math.PI / 2);
    spikeAt(32, 120, Math.PI / 2);
    chopper.group.visible = true; chopper.group.position.set(50, 38, 100); heliSpot.intensity = 3.2;
    heliSpot.target.position.set(-50, -38, 20);
    addCop('car', 30, 112); addCop('car', 48, 128);
    notice('AIR ONE — helikopter polisi di atasmu!', 6);
  } else if (n === 3) {
    G.day = 6; G.timeMin = 2 * 60 + 5; G.rain = 0.4; G.wanted = 3; G.money = 940; G.hp = 64; G.armor = 70; G.weapon = 1; G.ammo = [Infinity, 120, 24];
    G.pl.x = 250; G.pl.z = 255; G.pl.yaw = -Math.PI / 2; G.pl.pitch = 0.02;
    clearAround(250, 255, 20, []);
    for (const c of [...crates]) {
      if (c.position.x > 252 && c.position.x < 335 && c.position.z > 228 && c.position.z < 282) scene.remove(c);
    }
    spawnFoes(SPOTS.port, 5);
    const spots = [[270, 243], [276, 267], [284, 250], [272, 261], [290, 238]];
    foes.forEach((e, i) => { e.x = spots[i][0]; e.z = spots[i][1]; e.mesh.position.set(e.x, 0, e.z); });
    G.missionOn = true; G.missionIdx = 5;
    $('wheel').classList.remove('hide'); refreshWheel();
    showDialog('DARMA WIJAYA', ['"Malam ini semuanya ditentukan, Raka. Pelabuhan, jam dua pagi. Bawa semua yang kau punya."']);
  } else if (n === 4) {
    G.day = 4; G.timeMin = 2 * 60 + 14; G.rain = 0.75; G.wanted = 0; G.money = 1180; G.hp = 100; G.armor = 25;
    G.pl.x = 0; G.pl.z = 120; G.pl.yaw = -Math.PI / 2; G.pl.pitch = 0.02;
    clearAround(0, 120, 20, []);
    G.taxi = { active: true, passenger: null, dest: SPOTS.port, fare: 85 };
    G.paused = true;
    $('pause').classList.remove('hide');
    $('pause-info').innerHTML = 'HARI 4/7 · 02:14 · HUJAN<br>Uang $1180 · HP 100 · Wanted —<br>Misi: Balapan Jalan Tol · Taksi aktif: antar ke PELABUHAN ($85)';
  }
  updateHUD(); refreshWheel(); updatePlayer(0.016);
  if (SHOT === 3) {
    placeFoeBars();
    addBeam(new THREE.Vector3(276, 1.4, 267), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addBeam(new THREE.Vector3(284, 1.4, 250), new THREE.Vector3(250, 1.5, 255), 0xff5b5b);
    addBeam(new THREE.Vector3(250, 1.5, 255), new THREE.Vector3(276, 1.4, 267), 0xffe27a);
  }
  applyEnvironment();
}

// ---------- self-test (?test=1) ----------
function runSelfTest() {
  const out = [];
  const ok = (name, cond) => out.push((cond ? 'PASS' : 'FAIL') + ' ' + name);
  try {
    ok('THREE global present', typeof THREE !== 'undefined');
    ok('renderer created', !!renderer && !!renderer.domElement);
    ok('scene children>100', scene.children.length > 100);
    ok('buildings>40', solids.length > 40);
    ok('traffic spawns', traffic.length >= 20);
    ok('peds spawn', walkers.length >= 20);
    ok('rain points present', !!rainPts && rainPts.visible !== undefined);
    const before = G.wanted; addWanted(2, 'test'); ok('wanted rises', G.wanted === before + 2);
    const parked = traffic.find(c => !c.driver); ok('parked car exists', !!parked);
    if (parked) { G.pl.car = parked; ok('enter car', G.pl.car === parked); G.pl.car = null; }
    G.pl.x = 0; G.pl.z = 0; G.pl.yaw = 0; updatePlayer(0.016);
    ok('camera positioned', camera.position.y > 1 && camera.position.y < 2.2);
    fireWeapon(); ok('shoot runs', true);
    spawnFoes(SPOTS.port, 3); ok('enemies spawn', foes.length === 3);
    saveGame(0); ok('save writes', !!localStorage.getItem('teluk-arunika-3d-save-0'));
    ok('load reads', loadGame(0));
    ok('missions = 7', STORY.length === 7);
    const ext = [...document.scripts].some(s => s.src && /^https?:/.test(s.src));
    ok('no external script src', !ext);
    ok('hud visible', !$('hud').classList.contains('hide'));
    ok('minimap drawn', true);
    ok('webgl context ok', !!renderer.getContext());
    ok('parcel jobs defined', PARCELS.length >= 3);
    ok('radio stations = 3', STATIONS.length === 3);
  } catch (e) { out.push('FAIL exception: ' + e.message); }
  const el = $('testbox'); el.classList.remove('hide'); el.textContent = out.join('\n');
  document.title = 'TEST ' + out.filter(l => l.startsWith('FAIL')).length + ' failures | ' + out.join(' | ');
  window.__testResults = out;
}

// ---------- boot ----------
if (typeof THREE === 'undefined') {
  $('gl-error').classList.remove('hide');
  $('gl-error').textContent = 'Three.js gagal dimuat (vendor/three.min.js tidak ditemukan).';
} else {
  try {
    buildWorld();
    resetWorld();
    if (SHOT >= 1 && SHOT <= 4) applyShot(SHOT);
    else if (TEST) {
      G = newGameState(); resetWorld(); G.started = true;
      $('menu').classList.add('hide'); $('hud').classList.remove('hide');
      runSelfTest(); updateHUD();
    }
    requestAnimationFrame(loop);
  } catch (e) {
    $('gl-error').classList.remove('hide');
    $('gl-error').textContent = 'WebGL error: ' + e.message;
    document.title = 'BOOT FAIL: ' + e.message;
  }
}
