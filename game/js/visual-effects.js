// Explosions, smoke, sparks, tracers, muzzle flashes, beacons and markers, seagulls, rain mode.

function spawnExplosion(x, y, z, scale) {
  const s = scale || 1;
  addParticle(x, y + 0.4 * s, z, 0xfff3bf, 1.5 * s, 0.7, { grow: 2.2, opacity: 0.95, vy: 2 });
  for (let i = 0; i < 4; i++) addParticle(x + randRange(-1.3, 1.3) * s, y + randRange(0.2, 1.8) * s, z + randRange(-1.3, 1.3) * s, i % 2 ? 0xffa02e : 0xffc94a, randRange(1.2, 1.9) * s, randRange(0.7, 1.0), { grow: 1.8, opacity: 0.92, vy: randRange(2, 4) });
  for (let i = 0; i < 4; i++) addParticle(x + randRange(-2, 2) * s, y + randRange(0.4, 2.4) * s, z + randRange(-2, 2) * s, 0xe8541c, randRange(1.0, 1.6) * s, randRange(0.9, 1.3), { grow: 1.5, opacity: 0.85, vy: randRange(2.5, 5) });
  for (let i = 0; i < 7; i++) addParticle(x + randRange(-2.2, 2.2) * s, y + randRange(1.5, 4.5) * s, z + randRange(-2.2, 2.2) * s, i % 2 ? 0x2e2b29 : 0x47423e, randRange(1.0, 1.7) * s, randRange(2.2, 3.6), { grow: 0.7, opacity: 0.62, vy: randRange(2.5, 5.5), vx: randRange(-1, 1), vz: randRange(-1, 1), lit: true });
  for (let i = 0; i < 9; i++) addParticle(x, y + 0.5, z, 0x26221f, randRange(0.18, 0.4) * s, randRange(0.9, 1.5), { box: true, vx: randRange(-9, 9), vy: randRange(5, 13), vz: randRange(-9, 9), gravity: 22, lit: true, spin: 9 });
  spawnSparks(x, y + 0.6, z, 14);
  const scorch = makeContactShadow(7 * s, 7 * s);
  scorch.position.set(x, groundHeightAt(x, z) + 0.04, z);
  W.scene.add(scorch);
  W.effects.push({ mesh: scorch, life: 25, max: 25, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, opacity: 0.9, spin: 0, keepOpacity: true });
  addCameraShake(clamp(18 / (1 + dist2d(x, z, W.camera.position.x, W.camera.position.z)), 0, 0.9));
  playExplosionSound();
  alarmPedestriansNear(x, z, 45);
  alarmTrafficNear(x, z, 60);
}

function spawnTyreSmoke(car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), back = car.spec.len * 0.34, half = car.spec.wid * 0.42;
  for (const side of [-1, 1]) {
    addParticle(car.x - fx * back + fz * side * half + randRange(-0.2, 0.2), car.y + 0.25, car.z - fz * back - fx * side * half + randRange(-0.2, 0.2), 0xe6e2da, randRange(0.5, 0.8), randRange(0.9, 1.4),
      { grow: 1.6, opacity: 0.5, vy: 0.9, vx: -fx * 1.5, vz: -fz * 1.5, lit: true });
  }
}

function spawnTracer(ax, ay, az, bx, by, bz, color) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
  const mesh = new THREE.Mesh(unitGeometry('box'), new THREE.MeshBasicMaterial({ color: color || 0xffe680, transparent: true, opacity: 0.95, toneMapped: false }));
  mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(0.06, len, 0.06);
  W.scene.add(mesh);
  W.effects.push({ mesh: mesh, life: 0.28, max: 0.28, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, opacity: 0.95, spin: 0 });
}

function spawnMuzzleFlash(x, y, z, heading) {
  addParticle(x, y, z, 0xfff6c8, 0.34, 0.07, { opacity: 1 });
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: sharedTexture('glow'), color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  flare.position.set(x + Math.sin(heading) * 0.25, y, z + Math.cos(heading) * 0.25);
  flare.scale.set(1.5, 1.5, 1);
  W.scene.add(flare);
  W.effects.push({ mesh: flare, life: 0.07, max: 0.07, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, opacity: 1, spin: 0 });
  for (const a of [0, 1.05, 2.1]) {
    const spike = new THREE.Mesh(unitGeometry('box'), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, toneMapped: false }));
    spike.position.copy(flare.position);
    spike.rotation.set(a, heading, 0, 'YXZ');
    spike.scale.set(0.05, 0.75, 0.05);
    W.scene.add(spike);
    W.effects.push({ mesh: spike, life: 0.06, max: 0.06, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, opacity: 1, spin: 0 });
  }
}

function spawnSparks(x, y, z, count) {
  for (let i = 0; i < count; i++) addParticle(x, y, z, i % 2 ? 0xffe066 : 0xffa94d, 0.09, randRange(0.25, 0.5), { box: true, vx: randRange(-6, 6), vy: randRange(2, 7), vz: randRange(-6, 6), gravity: 18, opacity: 1 });
}

function spawnSmokePuff(x, y, z, size, color) {
  addParticle(x + randRange(-0.3, 0.3), y, z + randRange(-0.3, 0.3), color, size, randRange(1.4, 2.4), { grow: 1.1, opacity: 0.55, vy: randRange(1.6, 2.6), lit: true });
}

function spawnFireAndSmoke(x, y, z, strength) {
  addParticle(x + randRange(-0.7, 0.7), y, z + randRange(-0.7, 0.7), rand() < 0.5 ? 0xffa02e : 0xffd24a, randRange(0.6, 1.0) * strength, 0.5, { grow: 0.8, opacity: 0.9, vy: 3 });
  spawnSmokePuff(x, y + 1.2, z, 1.0 * strength + 0.4, 0x38332f);
}

function spawnSplash(x, z) {
  for (let i = 0; i < 10; i++) addParticle(x + randRange(-1.5, 1.5), -0.3, z + randRange(-1.5, 1.5), 0xdff6f8, randRange(0.5, 1), randRange(0.6, 1), { vy: randRange(4, 9), gravity: 16, opacity: 0.8, grow: 0.5 });
}

function spawnHitMarker(x, y, z, color) {
  const sprite = makeMarkerSprite('hit');
  sprite.material = sprite.material.clone();
  sprite.material.color.setHex(color);
  sprite.position.set(x, y, z);
  W.scene.add(sprite);
  W.effects.push({ mesh: sprite, life: 0.3, max: 0.3, vx: 0, vy: 0, vz: 0, grow: 0, gravity: 0, opacity: 1, spin: 0 });
}

function spawnFloatingText(x, y, z, text, color) {
  const tex = makeSignTexture(text, { bg: 'rgba(0,0,0,0)', fg: color, size: 54, pxW: 256, pxH: 64 });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
  sprite.position.set(x, y, z);
  sprite.scale.set(2.6, 0.65, 1);
  sprite.renderOrder = 20;
  W.scene.add(sprite);
  W.effects.push({ mesh: sprite, life: 1.1, max: 1.1, vx: 0, vy: 1.3, vz: 0, grow: 0, gravity: 0, opacity: 1, spin: 0, disposeMap: true });
}

function addParticle(x, y, z, color, size, life, o) {
  const material = o.lit ? new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: o.opacity || 1 }) : new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: o.opacity || 1, toneMapped: false });
  const mesh = new THREE.Mesh(unitGeometry(o.box ? 'box' : 'sphere'), material);
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(size * (o.box ? 1 : 2));
  W.scene.add(mesh);
  W.effects.push({ mesh: mesh, life: life, max: life, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, grow: o.grow || 0, gravity: o.gravity || 0, opacity: o.opacity || 1, spin: o.spin || 0 });
}

function updateVisualEffects(dt) {
  for (let i = W.effects.length - 1; i >= 0; i--) {
    const e = W.effects[i];
    e.life -= dt;
    if (e.life <= 0) {
      W.scene.remove(e.mesh);
      if (e.disposeMap) e.mesh.material.map.dispose();
      if (e.mesh.material !== W.mat.shadow) e.mesh.material.dispose();
      W.effects.splice(i, 1);
      continue;
    }
    e.vy -= e.gravity * dt;
    e.mesh.position.x += e.vx * dt; e.mesh.position.y += e.vy * dt; e.mesh.position.z += e.vz * dt;
    if (e.gravity && e.mesh.position.y < 0.1) { e.mesh.position.y = 0.1; e.vy = 0; e.vx *= 0.5; e.vz *= 0.5; }
    if (e.grow) e.mesh.scale.multiplyScalar(1 + e.grow * dt);
    if (e.spin) { e.mesh.rotation.x += e.spin * dt; e.mesh.rotation.z += e.spin * 0.7 * dt; }
    if (!e.keepOpacity) e.mesh.material.opacity = e.opacity * Math.min(1, (e.life / e.max) * 1.6);
  }
  for (const m of W.markers) {
    if (m.mesh) { m.mesh.userData.gem.rotation.y += dt * 2; m.mesh.userData.gem.position.y = 5.2 + Math.sin(G.time * 3) * 0.3; }
  }
  if (W.gulls) W.gulls.children.forEach((g, i) => {
    const a = G.time * (0.25 + i * 0.03) + i * 1.7, r = 40 + i * 9;
    g.position.set(W.gulls.userData.x + Math.cos(a) * r, 24 + i * 2.2 + Math.sin(a * 2) * 3, 330 + Math.sin(a) * r * 0.6);
    g.rotation.y = -a;
    g.children[0].rotation.z = Math.sin(G.time * 9 + i) * 0.5;
    g.children[1].rotation.z = -Math.sin(G.time * 9 + i) * 0.5;
  });
  if (W.volcanoTimer === undefined) W.volcanoTimer = 0;
  W.volcanoTimer -= dt;
  if (W.volcanoTimer <= 0 && dist2d(G.player.x, G.player.z, ISLAND.coneX, ISLAND.coneZ) < 500) { W.volcanoTimer = 0.8; spawnSmokePuff(ISLAND.coneX, 62, ISLAND.coneZ, 7, 0x6a6460); }
  updateRain(dt);
}

function makeMarkerSprite(kind) {
  if (!W.tex['marker-' + kind]) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (kind === 'alert') {
      g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(32, 32, 28, 0, 6.3); g.fill();
      g.strokeStyle = '#1b1b1b'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#1b1b1b'; g.font = '900 46px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 35);
    } else if (kind === 'diamond') {
      g.fillStyle = '#ff3b30'; g.beginPath(); g.moveTo(32, 4); g.lineTo(58, 32); g.lineTo(32, 60); g.lineTo(6, 32); g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.stroke();
    } else {
      g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round';
      for (const p of [[8, 8, 24, 24], [56, 8, 40, 24], [8, 56, 24, 40], [56, 56, 40, 40]]) { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.stroke(); }
    }
    W.tex['marker-' + kind] = new THREE.CanvasTexture(c);
    W.tex['marker-' + kind].colorSpace = THREE.SRGBColorSpace;
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: W.tex['marker-' + kind], transparent: true, depthTest: kind !== 'hit', toneMapped: false }));
  const size = kind === 'alert' ? 0.62 : kind === 'diamond' ? 0.55 : 0.9;
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 15;
  return sprite;
}

function makeHealthBarSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 12;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
  sprite.scale.set(1.25, 0.24, 1);
  sprite.renderOrder = 15;
  sprite.userData.shown = -1;
  return sprite;
}

function redrawHealthBar(sprite, fraction) {
  const c = sprite.material.map.image, g = c.getContext('2d');
  g.fillStyle = '#14161a'; g.fillRect(0, 0, 64, 12);
  g.fillStyle = fraction > 0.5 ? '#ff5a4d' : '#ffb02e'; g.fillRect(2, 2, Math.max(0, 60 * fraction), 8);
  sprite.material.map.needsUpdate = true;
  sprite.userData.shown = fraction;
}

// A tall translucent light column with a spinning gem: mission objectives and activities.
function makeBeacon(x, z, colorHex, radius) {
  const group = new THREE.Group();
  const r = radius || 2.2;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, 46, 20, 1, true), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  column.position.y = 23;
  group.add(column);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r * 1.15, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
  ring.position.y = 0.08;
  group.add(ring);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshBasicMaterial({ color: colorHex, toneMapped: false }));
  gem.position.y = 5.2;
  group.add(gem);
  group.userData.gem = gem;
  group.position.set(x, groundHeightAt(x, z), z);
  W.scene.add(group);
  return group;
}

function buildSeagulls() {
  W.gulls = new THREE.Group();
  W.gulls.userData.x = 0;
  for (let i = 0; i < 10; i++) {
    const gull = new THREE.Group();
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(unitGeometry('box'), new THREE.MeshBasicMaterial({ color: 0xf8f9fa }));
      wing.scale.set(1.5, 0.08, 0.5);
      wing.position.x = s * 0.75;
      gull.add(wing);
    }
    W.gulls.add(gull);
  }
  W.scene.add(W.gulls);
}

function toggleRain() {
  G.weather = G.weather === 'rain' ? 'clear' : 'rain';
  applyTimeOfDay(G.clock);
  showBanner(G.weather === 'rain' ? 'TROPICAL RAIN' : 'SKIES CLEARING', 'Roads are ' + (G.weather === 'rain' ? 'slick - grip is down' : 'drying'), 2);
}

function updateRain(dt) {
  const raining = G.weather === 'rain';
  if (raining && !W.rainMesh) {
    const pts = [];
    for (let i = 0; i < 700; i++) { const x = (Math.random() - 0.5) * 70, y = Math.random() * 30, z = (Math.random() - 0.5) * 70; pts.push(x, y, z, x + 0.25, y - 1.3, z); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    W.rainMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.55 }));
    W.scene.add(W.rainMesh);
    // Wet sheen: a thin reflective-looking film over the streets.
    W.wetMesh = new THREE.Mesh(new THREE.PlaneGeometry(900, 760).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfd4e6, transparent: true, opacity: 0.16, depthWrite: false }));
    W.wetMesh.position.set(-10, 0.045, -56);
    W.scene.add(W.wetMesh);
  }
  if (W.rainMesh) {
    W.rainMesh.visible = raining; W.wetMesh.visible = raining;
    W.rainMesh.position.set(W.camera.position.x, W.camera.position.y - 12 - ((G.time * 26) % 6), W.camera.position.z);
  }
}
