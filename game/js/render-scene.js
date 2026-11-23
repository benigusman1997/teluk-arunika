// Renderer, sky dome, sun disc, clouds, lights, the sun shadow map, tone mapping and fog.

function createRendererAndSky(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  W.renderer = renderer;
  W.scene = new THREE.Scene();
  W.scene.fog = new THREE.Fog(0xffd2b0, 260, 1700);
  W.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 5000);

  W.hemi = new THREE.HemisphereLight(0xbfd9ff, 0xd9b48a, 2.0);
  W.scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight(0xffe2b8, 3.0);
  W.sun.castShadow = true;
  W.sun.shadow.mapSize.set(2048, 2048);
  W.sun.shadow.bias = -0.0006;
  W.sun.shadow.normalBias = 0.05;
  W.sun.shadow.radius = 2.5;
  W.scene.add(W.sun);
  W.scene.add(W.sun.target);
  W.fill = new THREE.DirectionalLight(0xa9c8ff, 0.7);
  W.scene.add(W.fill);
  W.scene.add(W.fill.target);

  W.tex.sky = new THREE.CanvasTexture(document.createElement('canvas'));
  W.tex.sky.image.width = 4;
  W.tex.sky.image.height = 512;
  W.tex.sky.colorSpace = THREE.SRGBColorSpace;
  W.sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 24, 16), new THREE.MeshBasicMaterial({ map: W.tex.sky, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false }));
  W.sky.renderOrder = -10;
  W.scene.add(W.sky);

  const glow = document.createElement('canvas');
  glow.width = glow.height = 128;
  const gc = glow.getContext('2d');
  const grad = gc.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,250,225,1)');
  grad.addColorStop(0.16, 'rgba(255,238,190,0.95)');
  grad.addColorStop(0.3, 'rgba(255,205,140,0.42)');
  grad.addColorStop(1, 'rgba(255,170,110,0)');
  gc.fillStyle = grad;
  gc.fillRect(0, 0, 128, 128);
  W.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glow), fog: false, toneMapped: false, depthWrite: false, transparent: true }));
  W.sunDisc.scale.set(620, 620, 1);
  W.sunDisc.renderOrder = -9;
  W.scene.add(W.sunDisc);

  buildCloudField();
  applyTimeOfDay(G.clock);
  resizeRenderer();
  return renderer;
}

function updateSunShadows(focusX, focusZ) {
  const range = G.settings.quality === 'low' ? 45 : 75;
  const cam = W.sun.shadow.camera;
  if (cam.right !== range) {
    cam.left = -range; cam.right = range; cam.top = range; cam.bottom = -range;
    cam.near = 20; cam.far = 520;
    cam.updateProjectionMatrix();
  }
  // Snap the focus to whole metres so the shadow edges do not swim while driving.
  const fx = Math.round(focusX), fz = Math.round(focusZ);
  W.sun.target.position.set(fx, 0, fz);
  W.sun.position.set(fx + W.sunDir.x * 260, W.sunDir.y * 260, fz + W.sunDir.z * 260);
  W.fill.target.position.set(fx, 0, fz);
  W.fill.position.set(fx - W.sunDir.x * 100, 60, fz - W.sunDir.z * 100);
}

function applyTimeOfDay(clockMinutes) {
  const hour = (clockMinutes / 60) % 24;
  let a = SKY_KEYS[SKY_KEYS.length - 1], b = SKY_KEYS[0];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (hour >= SKY_KEYS[i].h && hour < SKY_KEYS[i + 1].h) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; }
  }
  const t = b.h > a.h ? clamp((hour - a.h) / (b.h - a.h), 0, 1) : 0;
  const mix = (ca, cb) => new THREE.Color(ca).lerp(new THREE.Color(cb), t);
  const top = mix(a.top, b.top), mid = mix(a.mid, b.mid), hor = mix(a.hor, b.hor);
  const rain = G.weather === 'rain' ? 0.55 : 0;
  const grey = new THREE.Color(0x8f9aa6);
  top.lerp(grey, rain); mid.lerp(grey, rain); hor.lerp(grey, rain);
  drawSkyGradientTexture(top, mid, hor);
  W.scene.fog.color.copy(hor);
  W.scene.fog.near = rain ? 90 : 260;
  W.scene.fog.far = rain ? 700 : 1700;
  W.sun.color.copy(mix(a.sun, b.sun));
  W.sun.intensity = lerp(a.sunI, b.sunI, t) * (1 - rain * 0.7);
  W.hemi.intensity = lerp(a.hemiI, b.hemiI, t);
  W.hemi.color.copy(top).lerp(new THREE.Color(0xffffff), 0.55);
  W.hemi.groundColor.copy(hor).lerp(new THREE.Color(0xc9a27a), 0.5);
  W.fill.intensity = W.sun.intensity * 0.22;
  // Sun path: rises in the east (+x), crosses the southern sky, sets in the west (-x).
  const dayT = clamp((hour - 6) / 12.5, 0, 1);
  const phi = dayT * Math.PI;
  const night = hour < 6 || hour > 18.5;
  const elev = night ? 0.7 : Math.max(0.09, Math.sin(phi) * 1.3);
  const ce = Math.cos(Math.min(elev, 1.45));
  W.sunDir.set(Math.cos(phi) * ce, Math.sin(Math.min(elev, 1.45)), (0.36 + 0.2 * Math.sin(phi)) * ce).normalize();
  const discElev = Math.max(0.055, W.sunDir.y * 0.62);
  W.sunDisc.userData.dir = new THREE.Vector3(W.sunDir.x, discElev, W.sunDir.z).normalize();
  W.sunDisc.visible = !night && !rain;
  if (W.clouds) W.clouds.material.color.copy(new THREE.Color(0xffffff).lerp(hor, 0.25).lerp(grey, rain));
}

function drawSkyGradientTexture(top, mid, horizon) {
  const c = W.tex.sky.image, g = c.getContext('2d');
  const css = (col) => '#' + col.getHexString(THREE.SRGBColorSpace);
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, css(top));
  grad.addColorStop(0.3, css(top.clone().lerp(mid, 0.6)));
  grad.addColorStop(0.42, css(mid));
  grad.addColorStop(0.485, css(mid.clone().lerp(horizon, 0.8)));
  grad.addColorStop(0.5, css(horizon));
  grad.addColorStop(1, css(horizon));
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  W.tex.sky.needsUpdate = true;
}

function buildCloudField() {
  const batch = createGeometryBatch();
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let state = 77;
  const next = () => { state = (state * 16807) % 2147483647; return state / 2147483647; };
  for (let i = 0; i < 22; i++) {
    const ang = next() * Math.PI * 2, rad = 500 + next() * 1300;
    const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad, cy = 190 + next() * 190;
    const size = 38 + next() * 46, puffs = 5 + Math.floor(next() * 4);
    for (let k = 0; k < puffs; k++) {
      const r = size * (0.55 + next() * 0.6);
      p.set(cx + (k - puffs / 2) * size * 0.62 + next() * 20, cy + next() * size * 0.25, cz + (next() - 0.5) * size * 0.8);
      s.set(r, r * 0.46, r * 0.8);
      m.compose(p, q, s);
      batchAddGeometry(batch, puff, m, 0xffffff);
    }
  }
  W.clouds = new THREE.Mesh(batchToGeometry(batch), new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false, flatShading: true }));
  W.scene.add(W.clouds);
}

function resizeRenderer() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h;
  W.camera.updateProjectionMatrix();
  const root = document.getElementById('hud-root');
  const scale = Math.min(w / 1280, h / 720);
  root.style.transform = 'translate(' + ((w - 1280 * scale) / 2) + 'px,' + ((h - 720 * scale) / 2) + 'px) scale(' + scale + ')';
}

function setGraphicsQuality(level) {
  G.settings.quality = level;
  const size = level === 'high' ? 2048 : 1024;
  W.renderer.shadowMap.enabled = level !== 'low';
  if (W.sun.shadow.mapSize.x !== size) {
    W.sun.shadow.mapSize.set(size, size);
    if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; }
  }
  W.sun.castShadow = level !== 'low';
}

function renderFrame() {
  const cam = W.camera.position;
  W.sky.position.copy(cam);
  W.sunDisc.position.copy(cam).addScaledVector(W.sunDisc.userData.dir, 2300);
  W.clouds.position.set(cam.x * 0.9, 0, cam.z * 0.9);
  W.renderer.render(W.scene, W.camera);
}

const SKY_KEYS = [
  { h: 0, top: 0x0b1530, mid: 0x1a2a52, hor: 0x33406b, sun: 0x8fa8ff, sunI: 0.9, hemiI: 0.9 },
  { h: 5.5, top: 0x1b2f5e, mid: 0x4a5f96, hor: 0xd98f7a, sun: 0xffb38a, sunI: 1.2, hemiI: 1.1 },
  { h: 7.5, top: 0x2f7fd6, mid: 0x7fb9ee, hor: 0xffd9b0, sun: 0xffe6c4, sunI: 2.9, hemiI: 1.9 },
  { h: 12, top: 0x1f78d8, mid: 0x6db6f2, hor: 0xcfe8fa, sun: 0xfff6e6, sunI: 3.3, hemiI: 2.1 },
  { h: 15.5, top: 0x2476d2, mid: 0x74b4ec, hor: 0xfde0bd, sun: 0xffeccd, sunI: 3.2, hemiI: 2.0 },
  { h: 17.4, top: 0x2b6cc4, mid: 0x86b3e4, hor: 0xffc49a, sun: 0xffd9a6, sunI: 3.0, hemiI: 1.9 },
  { h: 18.6, top: 0x30468c, mid: 0x8a6fa8, hor: 0xff9a6b, sun: 0xff9f70, sunI: 1.6, hemiI: 1.3 },
  { h: 19.6, top: 0x0f1c3f, mid: 0x22335f, hor: 0x4a4a7a, sun: 0x8fa8ff, sunI: 0.9, hemiI: 0.95 },
  { h: 24, top: 0x0b1530, mid: 0x1a2a52, hor: 0x33406b, sun: 0x8fa8ff, sunI: 0.9, hemiI: 0.9 }
];
