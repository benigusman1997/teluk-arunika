// visual-effects.js — explosions, smoke, sparks, tracers, muzzle flash, beacons, speech bubbles, rain mode.
var TA = window.TA || (window.TA = {});
function spawnExplosion(x, y, z) {
  for (var i = 0; i < 7; i++) addParticle(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb020 : 0xff5a1f, transparent: true }), x + (TA.rnd() - 0.5) * 3, y + TA.rnd() * 2, z + (TA.rnd() - 0.5) * 3, 0.8 + TA.rnd() * 0.5, [0, 2, 0], 1.5, 6);
  for (i = 0; i < 6; i++) addParticle(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2c2a29, transparent: true }), x + (TA.rnd() - 0.5) * 4, y + 2 + TA.rnd() * 2, z + (TA.rnd() - 0.5) * 4, 2.2 + TA.rnd(), [0, 3.5, 0], 1.4, 3);
  for (i = 0; i < 10; i++) addParticle(new THREE.BoxGeometry(0.3, 0.3, 0.3), TA.mat(0x333333), x, y + 1, z, 1.2, [(TA.rnd() - 0.5) * 22, 6 + TA.rnd() * 10, (TA.rnd() - 0.5) * 22], 1, 0, true);
  TA.playBoom(); TA.shake = 0.6;
}
function spawnTyreSmoke(x, z) {
  if (TA.fx.length > 140) return;
  addParticle(TA.smokeGeo || (TA.smokeGeo = new THREE.SphereGeometry(1, 7, 5)), new THREE.MeshLambertMaterial({ color: 0xe8e4de, transparent: true, opacity: 0.6 }), x + (TA.rnd() - 0.5), 0.4, z + (TA.rnd() - 0.5), 0.9, [0, 1.2, 0], 0.5, 2.2);
}
function spawnTracer(x0, y0, z0, x1, y1, z1, life) {
  var a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
  var m = addParticle(new THREE.BoxGeometry(0.1, 0.1, 1), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true }), 0, 0, 0, life || 0.09, [0, 0, 0], 1, 0);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.z = len; m.lookAt(b); return m;
}
function spawnMuzzleFlash(x, y, z, life) {
  return addParticle(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true }), x, y, z, life || 0.07, [0, 0, 0], 1, 0);
}
function spawnSparks(x, y, z) {
  for (var i = 0; i < 6; i++) addParticle(new THREE.BoxGeometry(0.08, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd866, transparent: true }), x, y, z, 0.35, [(TA.rnd() - 0.5) * 12, TA.rnd() * 7, (TA.rnd() - 0.5) * 12], 1, 0, true);
}
function addParticle(geo, mat, x, y, z, life, vel, size, grow, gravity) {
  var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(size); TA.scene.add(m);
  TA.fx.push({ m: m, life: life, max: life, vel: vel, grow: grow, g: gravity, base: mat.opacity }); return m;
}
function updateEffects(dt) {
  for (var i = TA.fx.length - 1; i >= 0; i--) {
    var f = TA.fx[i]; f.life -= dt;
    if (f.life <= 0) { TA.scene.remove(f.m); TA.fx.splice(i, 1); continue; }
    f.m.position.x += f.vel[0] * dt; f.m.position.y += f.vel[1] * dt; f.m.position.z += f.vel[2] * dt;
    if (f.g) { f.vel[1] -= 20 * dt; if (f.m.position.y < 0.1) f.m.position.y = 0.1; }
    if (f.grow) f.m.scale.addScalar(f.grow * dt);
    if (f.m.material.transparent) f.m.material.opacity = f.base * Math.min(1, f.life / f.max * 1.6);
  }
  if (TA.beacon.visible) { TA.beacon.userData.gem.rotation.y += dt * 2; TA.beacon.userData.gem.position.y = 5 + Math.sin(TA.S.time * 3) * 0.4; }
  TA.shake = Math.max(0, (TA.shake || 0) - dt);
  if (TA.rain) { TA.rain.visible = !!TA.S.rainOn; if (TA.S.rainOn) { TA.rain.position.set(TA.camera.position.x, (TA.rain.position.y - 40 * dt + 30) % 30, TA.camera.position.z); } }
}
function createBeaconAndRain() {
  var b = TA.beacon = new THREE.Group();
  b.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, fog: false })));
  b.children[0].position.y = 30;
  var gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), new THREE.MeshBasicMaterial({ color: 0xffd400 })); gem.position.y = 5; b.add(gem); b.userData.gem = gem;
  b.visible = false; TA.scene.add(b);
  var pts = []; for (var i = 0; i < 900; i++) pts.push((TA.rnd() - 0.5) * 80, TA.rnd() * 30, (TA.rnd() - 0.5) * 80);
  var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  TA.rain = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.18, transparent: true, opacity: 0.7 })); TA.rain.visible = false; TA.scene.add(TA.rain);
}
function setBeacon(x, z) { TA.beacon.visible = x !== null; if (x !== null) TA.beacon.position.set(x, 0, z); }
function say(person, text) {
  var s = TA.textSprite(text, '#1a1a1a', '#fffbe8', 0.75); s.scale.set(4.6, 0.82, 1); s.position.y = 2.75; person.mesh.add(s);
  setTimeout(function () { person.mesh.remove(s); }, 3500); return s;
}
TA.spawnExplosion = spawnExplosion; TA.spawnTyreSmoke = spawnTyreSmoke; TA.spawnTracer = spawnTracer; TA.spawnMuzzleFlash = spawnMuzzleFlash; TA.spawnSparks = spawnSparks;
TA.updateEffects = updateEffects; TA.createBeaconAndRain = createBeaconAndRain; TA.setBeacon = setBeacon; TA.say = say;
