// Sky, sun, sea, clouds, weather and the render call.

// Weather types with their sky tint, fog distance and driving grip.
const WEATHER_TYPES = {
  CERAH: { sky: 0x2f7fd6, horizon: 0xffd9a8, fog: 900, grip: 1.0, rain: false },
  BERAWAN: { sky: 0x6f9ecf, horizon: 0xe8d9c0, fog: 620, grip: 1.0, rain: false },
  'HUJAN TROPIS': { sky: 0x4a6a8a, horizon: 0xb8c4cc, fog: 420, grip: 0.85, rain: true },
  'KABUT PAGI': { sky: 0x9ab8c8, horizon: 0xf2e2c4, fog: 260, grip: 0.95, rain: false },
};

// Build the renderer, sky dome, sun, hemisphere light and sea.
function createRendererAndSky() {
  const canvas = WORLD.canvas;
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true, preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  WORLD.renderer = renderer;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2f7fd6);
  scene.fog = new THREE.Fog(0xffd9a8, 350, 900);
  WORLD.scene = scene;
  const camera = new THREE.PerspectiveCamera(
    62, window.innerWidth / window.innerHeight, 0.5, 2600,
  );
  camera.position.set(-270, 6, 60);
  camera.lookAt(-200, 2, 30);
  WORLD.camera = camera;
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0xe9c79a, 2.0);
  scene.add(hemi);
  WORLD.hemi = hemi;
  const sun = new THREE.DirectionalLight(0xffe0b0, 3.2);
  sun.position.set(-260, 190, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  scene.add(sun);
  scene.add(sun.target);
  WORLD.sun = sun;
  buildSkyDomeAndSunDisc();
  buildCloudsAndSea();
  window.addEventListener('resize', function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

// Gradient sky dome and a glowing sun disc low in the south-west.
function buildSkyDomeAndSunDisc() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2f7fd6');
  grad.addColorStop(0.55, '#7ec3ee');
  grad.addColorStop(0.8, '#ffd9a8');
  grad.addColorStop(1, '#ffcf8a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }),
  );
  dome.position.y = 0;
  WORLD.scene.add(dome);
  WORLD.skyDome = dome;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }),
  );
  disc.position.set(-620, 150, 1080);
  disc.lookAt(0, 60, 0);
  WORLD.scene.add(disc);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(110, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffdf9e, transparent: true, opacity: 0.35, fog: false,
    }),
  );
  glow.position.set(-620, 150, 1078);
  glow.lookAt(0, 60, 0);
  WORLD.scene.add(glow);
  WORLD.sunDisc = disc;
  WORLD.sunGlow = glow;
}

// Twenty drifting clouds and the turquoise sea with a pale shore band.
function buildCloudsAndSea() {
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, opacity: 0.92,
  });
  for (let i = 0; i < 20; i++) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(taNextRandom() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(9 + taNextRandom() * 10, 10, 8),
        cloudMat,
      );
      s.position.set(p * 12 - 14, taNextRandom() * 3, taNextRandom() * 8 - 4);
      s.scale.y = 0.45;
      group.add(s);
    }
    group.position.set(
      -700 + taNextRandom() * 1500, 150 + taNextRandom() * 70,
      -600 + taNextRandom() * 1400,
    );
    WORLD.scene.add(group);
    WORLD.clouds.push(group);
  }
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 620),
    new THREE.MeshLambertMaterial({ color: 0x19b5c4 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(100, 0.4, 720);
  WORLD.scene.add(sea);
  WORLD.sea = sea;
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 26),
    new THREE.MeshLambertMaterial({ color: 0x6fe0d6 }),
  );
  band.rotation.x = -Math.PI / 2;
  band.position.set(100, 0.5, 422);
  WORLD.scene.add(band);
  const west = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 1200),
    new THREE.MeshLambertMaterial({ color: 0x19b5c4 }),
  );
  west.rotation.x = -Math.PI / 2;
  west.position.set(-660, 0.4, 0);
  WORLD.scene.add(west);
  buildRainStreaks();
}

// Rain streaks, hidden until a tropical shower starts.
function buildRainStreaks() {
  const count = 420;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = -450 + taNextRandom() * 900;
    const y = 20 + taNextRandom() * 40;
    const z = -450 + taNextRandom() * 900;
    positions.set([x, y, z, x, y - 6, z], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xbfe3ff, transparent: true, opacity: 0.5,
  }));
  rain.visible = false;
  WORLD.scene.add(rain);
  WORLD.rain = rain;
}

// Build the sun and its shadow light, following the action.
function buildSunAndShadowLight() {
  if (!WORLD.sun) {
    return;
  }
  WORLD.sun.shadow.bias = -0.0004;
  WORLD.sun.shadow.normalBias = 0.6;
}

// Advance the clock: one game minute per real second; midnight rolls the day.
function advanceTimeOfDay(dt) {
  if (!GAME || GAME.mode === 'title') {
    return;
  }
  GAME.time._acc = (GAME.time._acc || 0) + dt;
  if (GAME.time._acc < 1) {
    return;
  }
  GAME.time._acc -= 1;
  GAME.time.minute += 1;
  if (GAME.time.minute >= 60) {
    GAME.time.minute = 0;
    GAME.time.hour += 1;
  }
  if (GAME.time.hour >= 24) {
    GAME.time.hour = 0;
    GAME.time.day += 1;
    if (typeof advanceDebtDay === 'function') {
      advanceDebtDay();
    }
  }
  applySunAndSkyForHour();
  updateStreetLights();
}

// Set sun angle, sky tint and fog from the hour of day.
function applySunAndSkyForHour() {
  const hour = GAME.time.hour + GAME.time.minute / 60;
  const weather = WEATHER_TYPES[GAME.time.weather] || WEATHER_TYPES.CERAH;
  const dayFrac = clampNumber((hour - 6) / 12, 0, 1);
  const elev = Math.sin(dayFrac * Math.PI) * 52 + 4;
  const azim = lerpNumber(-50, 230, dayFrac);
  const rad = azim * Math.PI / 180;
  const el = elev * Math.PI / 180;
  const px = Math.sin(rad) * Math.cos(el) * 600;
  const py = Math.sin(el) * 600;
  const pz = Math.cos(rad) * Math.cos(el) * 600;
  WORLD.sun.position.set(px, Math.max(py, 40), pz);
  WORLD.sun.intensity = 1.2 + 2.2 * Math.sin(dayFrac * Math.PI);
  WORLD.hemi.intensity = 0.9 + 1.3 * Math.sin(dayFrac * Math.PI);
  WORLD.scene.fog.near = weather.fog * 0.4;
  WORLD.scene.fog.far = weather.fog;
  if (WORLD.sunDisc) {
    WORLD.sunDisc.position.set(px * 1.8, Math.max(py * 1.8, 60), pz * 1.8);
    WORLD.sunDisc.lookAt(0, 60, 0);
  }
  if (WORLD.sunGlow) {
    WORLD.sunGlow.position.set(px * 1.8, Math.max(py * 1.8, 60), pz * 1.8);
    WORLD.sunGlow.lookAt(0, 60, 0);
  }
}

// Start a tropical rain shower: streaks on, grip down, sky greys.
function startTropicalRain() {
  GAME.time.weather = 'HUJAN TROPIS';
  if (WORLD.rain) {
    WORLD.rain.visible = true;
  }
  GAME.ui.banner = 'TROPICAL RAIN — WET ROADS';
}

// Clear the rain and return to a clear sky.
function sky_clearRain() {
  GAME.time.weather = 'CERAH';
  if (WORLD.rain) {
    WORLD.rain.visible = false;
  }
}

// Street lamps and lit windows glow from 18:00 to 05:30.
function updateStreetLights() {
  const night = GAME.time.hour >= 18 || GAME.time.hour < 6;
  for (const lamp of WORLD.lamps) {
    if (lamp && lamp.material) {
      lamp.material.emissiveIntensity = night ? 1.6 : 0;
    }
  }
  if (WORLD.sun) {
    WORLD.sun.target.position.set(GAME.player.x, 0, GAME.player.z);
  }
}

// Drift the clouds slowly across the sky.
function sky_driftClouds(dt) {
  for (const cloud of WORLD.clouds) {
    cloud.position.x += dt * 1.5;
    if (cloud.position.x > 800) {
      cloud.position.x = -800;
    }
  }
}

// Render one frame from the active camera.
function renderFrame() {
  if (!WORLD || !WORLD.renderer || !WORLD.scene || !WORLD.camera) {
    return;
  }
  sky_driftClouds(1 / 60);
  WORLD.renderer.render(WORLD.scene, WORLD.camera);
}
