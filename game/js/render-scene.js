// Renderer, sky dome, sun, clouds, lights, shadows, fog, and the chase / on-foot / title camera rigs.
TA.SKY = { zenith: 0x2a78d2, mid: 0x86c5f0, horizon: 0xffdcb4, fog: 0xf6dcc0, sun: 0xffe3b3, ground: 0xe9c79b };

TA.initRenderer = function () {
  var canvas = document.getElementById('game-canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  TA.renderer = renderer;
  TA.canvas = canvas;
  TA.gl = renderer.getContext();

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(TA.SKY.fog, 380, 1900);
  TA.scene = scene;
  TA.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.4, 4200);
  TA.camera.position.set(0, 60, 200);
  TA.cam = { mode: 'title', yaw: 0, pitch: 0.2, offset: 0, offsetIdle: 0, fov: 62, shake: 0, x: 0, y: 60, z: 200, lx: 0, ly: 0, lz: 0, snap: true };

  TA.buildLights();
  TA.buildSkyDome();
  TA.buildSun();
  TA.buildClouds();
  window.addEventListener('resize', TA.resize);
  TA.resize();
};

TA.resize = function () {
  var w = window.innerWidth || 1280, h = window.innerHeight || 720;
  TA.renderer.setSize(w, h, false);
  TA.camera.aspect = w / h;
  TA.camera.updateProjectionMatrix();
  if (TA.layoutHud) TA.layoutHud(w, h);
};

// r160 lights are physically scaled, so the hemisphere and sun are deliberately strong.
TA.buildLights = function () {
  TA.hemi = new THREE.HemisphereLight(0xcfe6ff, TA.SKY.ground, 2.3);
  TA.scene.add(TA.hemi);
  var sun = new THREE.DirectionalLight(TA.SKY.sun, 3.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120; sc.near = 10; sc.far = 700;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.6;
  TA.scene.add(sun);
  TA.scene.add(sun.target);
  TA.sun = sun;
  TA.sunDir = new THREE.Vector3(-0.62, 0.44, 0.65).normalize();   // low in the south-west, over the sea
};

// Large gradient dome: deep blue zenith down to a warm peach horizon.
TA.buildSkyDome = function () {
  var geo = new THREE.SphereGeometry(3600, 32, 18);
  var pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  var cz = new THREE.Color(TA.SKY.zenith), cm = new THREE.Color(TA.SKY.mid), ch = new THREE.Color(TA.SKY.horizon), c = new THREE.Color();
  for (var i = 0; i < pos.count; i++) {
    var t = TA.clamp(pos.getY(i) / 3600, -0.1, 1);
    if (t < 0.22) c.copy(ch).lerp(cm, TA.clamp(t / 0.22, 0, 1)); else c.copy(cm).lerp(cz, Math.min(1, (t - 0.22) / 0.6));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  var mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  TA.skyDome = new THREE.Mesh(geo, mat);
  TA.skyDome.renderOrder = -10;
  TA.scene.add(TA.skyDome);
};

TA.buildSun = function () {
  var group = new THREE.Group();
  var disc = new THREE.Mesh(new THREE.CircleGeometry(95, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false, depthWrite: false }));
  var glowMat = new THREE.MeshBasicMaterial({ color: 0xffd28a, fog: false, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  var glow = new THREE.Mesh(new THREE.CircleGeometry(260, 32), glowMat);
  var halo = new THREE.Mesh(new THREE.CircleGeometry(520, 32), glowMat.clone());
  halo.material.opacity = 0.14;
  glow.position.z = -2; halo.position.z = -4;
  group.add(halo, glow, disc);
  group.renderOrder = -9;
  TA.sunDisc = group;
  TA.scene.add(group);
};

// 15-25 soft cumulus clouds, each a cluster of flattened spheres, merged into one mesh.
TA.buildClouds = function () {
  var rng = TA.makeRng(404), batch = TA.Batch();
  var count = 22;
  for (var i = 0; i < count; i++) {
    var ang = rng() * Math.PI * 2, rad = 700 + rng() * 1500;
    var cx = Math.sin(ang) * rad, cz = Math.cos(ang) * rad, cy = 260 + rng() * 240;
    var puffs = 4 + Math.floor(rng() * 4), size = 60 + rng() * 70;
    for (var p = 0; p < puffs; p++) {
      var s = size * (0.6 + rng() * 0.7);
      batch.sphere(cx + (p - puffs / 2) * size * 0.75 + rng() * 20, cy + rng() * 18, cz + (rng() - 0.5) * size, s, s * 0.42, s * 0.8, p % 2 ? 0xffffff : 0xfff3e6);
    }
  }
  var mat = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, emissive: 0x9aa0ac, emissiveIntensity: 0.55 });
  TA.clouds = batch.build(mat);
  TA.clouds.castShadow = false; TA.clouds.receiveShadow = false;
  TA.scene.add(TA.clouds);
};

// Time of day: the sun climbs and sinks, lights dim at night, but dusk stays warm and bright.
TA.updateSky = function () {
  var hours = TA.state.clock / 60;
  var day = Math.sin(TA.clamp((hours - 5.5) / 13, 0, 1) * Math.PI);          // 0 at night, 1 at noon
  var bright = TA.clamp(day * 2.6, 0.22, 1);
  var rain = TA.state.weather === 'rain' ? 0.72 : 1;
  TA.sunDir.set(-0.62, 0.2 + day * 0.42, 0.65).normalize();
  TA.sun.intensity = 3.6 * bright * rain;
  TA.hemi.intensity = (0.5 + 1.8 * bright) * rain;
  TA.scene.fog.near = rain < 1 ? 120 : 380;
  TA.scene.fog.far = rain < 1 ? 900 : 1900;
  TA.skyDome.material.color.setScalar(TA.clamp(bright * rain + 0.08, 0.15, 1));
  TA.sunDisc.visible = day > 0.02 && rain === 1;
};

// ---- camera rigs -----------------------------------------------------------
TA.cameraFocus = function () {
  var p = TA.player;
  if (!p) return { x: 60, y: 0, z: 120, h: 0, speed: 0 };
  if (p.car) return { x: p.car.x, y: p.car.y, z: p.car.z, h: p.car.h, speed: Math.abs(p.car.speed) };
  return { x: p.x, y: p.y, z: p.z, h: p.h, speed: 0 };
};

TA.updateCamera = function (dt) {
  var cam = TA.cam, p = TA.player, f = TA.cameraFocus();
  var tx, ty, tz, lx, ly, lz, fov = 62, k = cam.snap ? 1 : 1 - Math.exp(-dt * 7);
  var mouse = TA.run.mode === 'playing' ? TA.takeMouse() : { x: 0, y: 0 };
  if (TA.run.mode === 'title' || !p) {
    var a = TA.run.time * 0.05 + 0.6;
    tx = 80 + Math.sin(a) * 250; tz = 190 + Math.cos(a) * 190; ty = 58;
    lx = 30; ly = 12; lz = 40;
  } else if (p.car) {
    // chase camera: 6-7 m behind and 2.6 m above the car, looking slightly ahead, with speed pull-back
    if (mouse.x) { cam.offset = TA.clamp(cam.offset - mouse.x * 0.004, -2.6, 2.6); cam.offsetIdle = 0; }
    cam.offsetIdle += dt;
    if (cam.offsetIdle > 1.6 && !cam.hold) cam.offset *= Math.exp(-dt * 3);
    var yaw = f.h + cam.offset, dist = 6.2 + f.speed * 0.02 + (p.car.model.len - 4.4) * 0.9;
    var sy = Math.sin(yaw), cy = Math.cos(yaw), fh = Math.sin(f.h), fc = Math.cos(f.h);
    tx = f.x - sy * dist; tz = f.z - cy * dist; ty = f.y + 2.6 + p.car.model.hgt * 0.25;
    lx = f.x + fh * 5; lz = f.z + fc * 5; ly = f.y + 1.25;
    fov = 62 + Math.min(8, f.speed * 0.16);
    cam.yaw = yaw;
  } else {
    // on foot: over-the-shoulder third person, the mouse turns the camera
    var aim = TA.aiming();
    cam.yaw -= mouse.x * 0.0032;
    cam.pitch = TA.clamp(cam.pitch + mouse.y * 0.0025 * (TA.state.settings.invertY ? -1 : 1), -0.25, 0.75);
    var d2 = aim ? 2.6 : 4.2, s2 = Math.sin(cam.yaw), c2 = Math.cos(cam.yaw);
    var side = aim ? 0.75 : 0.55;
    tx = f.x - s2 * d2 * Math.cos(cam.pitch) - c2 * side; tz = f.z - c2 * d2 * Math.cos(cam.pitch) + s2 * side;
    ty = f.y + 1.75 + Math.sin(cam.pitch) * d2;
    // keep the camera out of walls by sliding it toward the player
    for (var i = 0; i < 6 && TA.pointSolid && TA.pointSolid(tx, tz, ty); i++) { tx = TA.lerp(tx, f.x, 0.3); tz = TA.lerp(tz, f.z, 0.3); }
    lx = f.x + s2 * 6; lz = f.z + c2 * 6; ly = f.y + 1.5 - Math.sin(cam.pitch) * 2.2;
    fov = aim ? 50 : 62;
  }
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
  var kl = cam.snap ? 1 : 1 - Math.exp(-dt * 12);
  cam.lx += (lx - cam.lx) * kl; cam.ly += (ly - cam.ly) * kl; cam.lz += (lz - cam.lz) * kl;
  cam.fov += (fov - cam.fov) * (cam.snap ? 1 : Math.min(1, dt * 4));
  cam.snap = false;
  cam.shake = Math.max(0, cam.shake - dt * 2.2);
  var sh = cam.shake * 0.35, t = TA.run.time * 47;
  TA.camera.position.set(cam.x + Math.sin(t) * sh, Math.max(0.6, cam.y + Math.cos(t * 1.3) * sh), cam.z + Math.sin(t * 0.7) * sh);
  TA.camera.lookAt(cam.lx, cam.ly, cam.lz);
  if (Math.abs(TA.camera.fov - cam.fov) > 0.05) { TA.camera.fov = cam.fov; TA.camera.updateProjectionMatrix(); }
};

TA.snapCamera = function () { TA.cam.snap = true; TA.updateCamera(0.016); };
TA.addShake = function (amount) { TA.cam.shake = Math.min(1.5, TA.cam.shake + amount); };

// Sky, sun disc and the shadow frustum all follow the camera.
TA.render = function () {
  var c = TA.camera.position, f = TA.cameraFocus();
  TA.skyDome.position.set(c.x, 0, c.z);
  TA.clouds.position.set(c.x * 0.6, 0, c.z * 0.6);
  TA.sunDisc.position.set(c.x + TA.sunDir.x * 3300, TA.sunDir.y * 3300, c.z + TA.sunDir.z * 3300);
  TA.sunDisc.lookAt(c.x, c.y, c.z);
  var fx = TA.player ? f.x : TA.cam.lx, fz = TA.player ? f.z : TA.cam.lz;
  TA.sun.target.position.set(fx, 0, fz);
  TA.sun.position.set(fx + TA.sunDir.x * 300, TA.sunDir.y * 300, fz + TA.sunDir.z * 300);
  TA.sun.castShadow = !!TA.state.settings.shadows;
  TA.renderer.render(TA.scene, TA.camera);
  TA.run.rendered = (TA.run.rendered || 0) + 1;
};
