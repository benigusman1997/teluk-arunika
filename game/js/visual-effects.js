// Visual effects: explosions, smoke, fire, sparks, tracers and muzzle flashes, objective beacon,
// floating diamond markers with health bars, and the tropical rain mode.
TA.fx = { parts: [], free: [], tracers: [], markers: [], beacon: null };

TA.initEffects = function () {
  var geo = new THREE.SphereGeometry(1, 12, 9), i;
  for (i = 0; i < 240; i++) {
    var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    mesh.visible = false; TA.scene.add(mesh);
    TA.fx.free.push({ mesh: mesh, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1, grow: 0, gravity: 0, alpha: 1 });
  }
  var tg = new THREE.BoxGeometry(0.1, 0.1, 1);
  for (i = 0; i < 28; i++) {
    var t = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.9, depthWrite: false }));
    t.visible = false; TA.scene.add(t); TA.fx.tracers.push({ mesh: t, life: 0 });
  }
  // objective beacon: tall translucent yellow light column with a ring at its foot
  var col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 70, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  var ring = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  col.visible = ring.visible = false; col.renderOrder = 3;
  TA.scene.add(col, ring);
  TA.fx.beacon = { col: col, ring: ring, x: 0, z: 0, on: false };
  TA.fx.diamondGeo = new THREE.OctahedronGeometry(0.34);
  TA.fx.barGeo = new THREE.PlaneGeometry(1, 0.12);
  TA.buildRain();
};

TA.emit = function (x, y, z, color, size, life, vx, vy, vz, grow, gravity, alpha, additive) {
  var p = TA.fx.free.pop();
  if (!p) { p = TA.fx.parts.shift(); if (!p) return null; }
  p.mesh.position.set(x, y, z); p.mesh.material.color.setHex(color); p.mesh.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.life = p.max = life; p.vx = vx; p.vy = vy; p.vz = vz; p.size = size; p.grow = grow; p.gravity = gravity || 0; p.alpha = alpha === undefined ? 1 : alpha;
  p.mesh.scale.setScalar(size); p.mesh.material.opacity = p.alpha; p.mesh.visible = true;
  TA.fx.parts.push(p);
  return p;
};

TA.spawnSmoke = function (x, y, z, size, color, life, alpha) {
  TA.emit(x, y, z, color, size * 0.6, life || 1.5, TA.rr(-0.4, 0.4), 1.2 + TA.rand() * 0.8, TA.rr(-0.4, 0.4), size * 1.1, 0, alpha || 0.42);
};
TA.spawnFire = function (x, y, z, size) {
  TA.emit(x, y, z, TA.rand() < 0.5 ? 0xff7b00 : 0xffc300, size, 0.55, TA.rr(-0.5, 0.5), 2.2, TA.rr(-0.5, 0.5), -size * 0.8, 0, 0.95, true);
};
TA.spawnSparks = function (x, y, z, n, color) {
  for (var i = 0; i < n; i++) TA.emit(x, y, z, color || 0xffe08a, 0.07, 0.35 + TA.rand() * 0.25, TA.rr(-5, 5), 1 + TA.rand() * 4, TA.rr(-5, 5), 0, 14, 1, !color);
};
TA.spawnMuzzle = function (x, y, z) { TA.emit(x, y, z, 0xfff0a0, 0.42, 0.07, 0, 0, 0, 2, 0, 1, true); };

// Expanding fireballs, dark smoke puffs, debris and sparks; shakes the camera and scares the street.
TA.spawnExplosion = function (x, y, z, scale) {
  var i;
  for (i = 0; i < 7; i++) TA.emit(x + TA.rr(-1, 1) * scale, y + TA.rr(0, 1.4) * scale, z + TA.rr(-1, 1) * scale, i % 2 ? 0xff8c00 : 0xffd60a, 1.1 * scale, 0.75 + TA.rand() * 0.4, TA.rr(-1.5, 1.5), 2.5 + TA.rand() * 2, TA.rr(-1.5, 1.5), 3.2 * scale, 0, 0.95, true);
  TA.emit(x, y + 0.6, z, 0xfff3b0, 1.6 * scale, 0.3, 0, 1, 0, 9 * scale, 0, 1, true);
  for (i = 0; i < 8; i++) TA.emit(x + TA.rr(-1.4, 1.4) * scale, y + 1 + TA.rand() * 2, z + TA.rr(-1.4, 1.4) * scale, i % 2 ? 0x1f1f1f : 0x3a3a3a, 1.2 * scale, 2.2 + TA.rand() * 1.4, TA.rr(-0.8, 0.8), 2.4 + TA.rand() * 1.5, TA.rr(-0.8, 0.8), 1.6 * scale, 0, 0.75);
  for (i = 0; i < 10; i++) TA.emit(x, y + 0.5, z, 0x2b2b2b, 0.16 + TA.rand() * 0.14, 1.3, TA.rr(-8, 8), 5 + TA.rand() * 7, TA.rr(-8, 8), 0, 16, 1);
  TA.spawnSparks(x, y + 0.5, z, 12);
  var p = TA.player, d = p ? TA.dist(x, z, p.x, p.z) : 999;
  if (d < 80) TA.addShake(1.2 * (1 - d / 80));
  if (TA.sfxAt) TA.sfxAt('explosion', x, z);
  TA.scarePedestrians(x, z, 55); TA.scareTraffic(x, z, 45);
};

TA.spawnTracer = function (ox, oy, oz, ex, ey, ez) {
  var list = TA.fx.tracers, t = list[0];
  for (var i = 0; i < list.length; i++) if (list[i].life <= 0) { t = list[i]; break; }
  var dx = ex - ox, dy = ey - oy, dz = ez - oz, len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  t.mesh.position.set((ox + ex) / 2, (oy + ey) / 2, (oz + ez) / 2);
  t.mesh.scale.set(1, 1, len); t.mesh.lookAt(ex, ey, ez);
  t.mesh.visible = true; t.life = 0.09;
};

// ---- beacon and markers ----------------------------------------------------
TA.setBeacon = function (x, z) {
  var b = TA.fx.beacon;
  if (x === null || x === undefined) { b.on = false; b.col.visible = b.ring.visible = false; return; }
  b.on = true; b.x = x; b.z = z;
  var y = TA.groundY(x, z);
  b.col.position.set(x, y + 35, z); b.ring.position.set(x, y + 0.3, z);
  b.col.visible = b.ring.visible = true;
};

// A floating diamond over a person or car, optionally with a small health bar under it.
TA.addMarker = function (ent, color, withBar) {
  var dia = new THREE.Mesh(TA.fx.diamondGeo, new THREE.MeshBasicMaterial({ color: color, depthTest: false }));
  dia.renderOrder = 6; TA.scene.add(dia);
  var m = { ent: ent, dia: dia, bar: null, back: null };
  if (withBar) {
    m.back = new THREE.Mesh(TA.fx.barGeo, new THREE.MeshBasicMaterial({ color: 0x1b1b1b, depthTest: false }));
    m.bar = new THREE.Mesh(TA.fx.barGeo, new THREE.MeshBasicMaterial({ color: 0xff3b30, depthTest: false }));
    m.back.renderOrder = 6; m.bar.renderOrder = 7; m.back.scale.set(1.08, 1.5, 1);
    TA.scene.add(m.back, m.bar);
  }
  TA.fx.markers.push(m);
  return m;
};

TA.removeMarkerFor = function (ent) {
  for (var i = TA.fx.markers.length - 1; i >= 0; i--) {
    var m = TA.fx.markers[i];
    if (m.ent !== ent) continue;
    TA.scene.remove(m.dia); if (m.bar) TA.scene.remove(m.bar, m.back);
    TA.fx.markers.splice(i, 1);
  }
};

TA.clearEffects = function () {
  TA.fx.markers.slice().forEach(function (m) { TA.removeMarkerFor(m.ent); });
  TA.fx.parts.forEach(function (p) { p.mesh.visible = false; TA.fx.free.push(p); });
  TA.fx.parts = [];
  TA.setBeacon(null);
};

// ---- rain ----------------------------------------------------------------
TA.buildRain = function () {
  var n = 700, pos = new Float32Array(n * 6), rng = TA.makeRng(88);
  for (var i = 0; i < n; i++) {
    var x = (rng() - 0.5) * 70, y = rng() * 34, z = (rng() - 0.5) * 70;
    pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x + 0.25; pos[i * 6 + 4] = y - 1.3; pos[i * 6 + 5] = z;
  }
  var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  TA.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.5 }));
  TA.rain.visible = false; TA.rain.frustumCulled = false; TA.scene.add(TA.rain);
  // wet road sheen: one glossy translucent sheet just above the asphalt
  TA.sheen = new THREE.Mesh(new THREE.PlaneGeometry(760, 480), new THREE.MeshPhongMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.38, shininess: 140, specular: 0xffffff, depthWrite: false }));
  TA.sheen.rotation.x = -Math.PI / 2; TA.sheen.position.set(0, 0.045, -15); TA.sheen.visible = false; TA.scene.add(TA.sheen);
};

TA.setWeather = function (kind) {
  TA.state.weather = kind;
  TA.rain.visible = TA.sheen.visible = kind === 'rain';
  if (kind === 'rain') TA.showBanner('TROPICAL RAIN', 'ROADS ARE SLICK — GRIP IS DOWN', '#4cc9f0');
};

TA.updateEffects = function (dt) {
  var fx = TA.fx, i, cam = TA.camera;
  for (i = fx.parts.length - 1; i >= 0; i--) {
    var p = fx.parts[i];
    p.life -= dt;
    if (p.life <= 0) { p.mesh.visible = false; fx.parts.splice(i, 1); fx.free.push(p); continue; }
    p.vy -= p.gravity * dt;
    p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
    if (p.gravity && p.mesh.position.y < 0.05) { p.mesh.position.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    p.size = Math.max(0.02, p.size + p.grow * dt);
    p.mesh.scale.setScalar(p.size);
    p.mesh.material.opacity = p.alpha * Math.min(1, p.life / p.max * 1.6);
  }
  for (i = 0; i < fx.tracers.length; i++) { var t = fx.tracers[i]; if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.mesh.visible = false; } }
  if (fx.beacon.on) { fx.beacon.col.material.opacity = 0.26 + Math.sin(TA.run.time * 3) * 0.06; fx.beacon.ring.rotation.y += dt; fx.beacon.ring.scale.setScalar(1 + Math.sin(TA.run.time * 4) * 0.08); }
  for (i = fx.markers.length - 1; i >= 0; i--) {
    var m = fx.markers[i], e = m.ent;
    if (e.dead || e.removed) { TA.removeMarkerFor(e); continue; }
    var top = e.model ? e.model.hgt + 1.3 : 2.5, y = e.y + top + Math.sin(TA.run.time * 3 + i) * 0.08;
    m.dia.position.set(e.x, y, e.z); m.dia.rotation.y += dt * 2;
    if (m.bar) {
      var frac = TA.clamp(e.hp / e.maxHp, 0, 1);
      m.back.position.set(e.x, y - 0.5, e.z); m.back.quaternion.copy(cam.quaternion);
      m.bar.quaternion.copy(cam.quaternion); m.bar.scale.set(Math.max(0.02, frac), 1, 1);
      m.bar.position.copy(m.back.position); m.bar.translateX(-(1 - frac) * 0.5);
    }
  }
  if (TA.rain.visible) {
    TA.rain.position.set(cam.position.x, cam.position.y - 12 - (TA.run.time * 28 % 10), cam.position.z);
  }
  // the volcano on Pulau Abu breathes
  if (TA.run.frame % 24 === 0 && TA.player && TA.player.x > 300) TA.spawnSmoke(742 + TA.rr(-4, 4), 78, -372 + TA.rr(-4, 4), 7, 0x5a5350, 5);
};
