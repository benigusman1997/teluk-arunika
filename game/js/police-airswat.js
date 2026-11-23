// ELANG-1 helicopter with its searchlight, the BADAK-2 SWAT van and the SWAT ARUNIKA tactical team.

function flyHelicopterWithSearchlight(dt) {
  const p = playerPosition();
  if (!W.heli) {
    W.heliDelay = (W.heliDelay || 0) - dt;
    if (G.wanted >= 4 && W.heliDelay <= 0) { spawnHelicopter(p.x - 160, p.z - 120, 60); showBanner('AIR UNIT DEPLOYED', 'ELANG-1 has a spotlight on you', 2.4); }
    return;
  }
  const h = W.heli;
  // Hover behind and to the side of the suspect, a little higher when he is fast.
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  const tx = p.x - fx * 15 - fz * 9, tz = p.z - fz * 15 + fx * 9, ty = p.y + 24 + Math.min(8, Math.abs(p.speed) * 0.12);
  const k = 1 - Math.exp(-dt * 1.4);
  h.vx = lerp(h.vx, clamp(tx - h.x, -60, 60) * 1.5, k); h.vz = lerp(h.vz, clamp(tz - h.z, -60, 60) * 1.5, k);
  h.x += h.vx * dt; h.z += h.vz * dt; h.y = lerp(h.y, ty, k * 0.6);
  h.heading += clamp(angleDiff(Math.atan2(p.x - h.x, p.z - h.z), h.heading), -1.6 * dt, 1.6 * dt);
  h.unit.x = h.x; h.unit.z = h.z;
  aimSearchlight(h, p.x, p.y, p.z, dt);
  h.cool -= dt;
  if (G.wanted >= 5 && h.cool <= 0 && dist2d(h.x, h.z, p.x, p.z) < 60) {
    h.cool = 2.4;
    spawnTracer(h.x, h.y - 1, h.z, p.x + randRange(-1.5, 1.5), p.y + 1, p.z + randRange(-1.5, 1.5), 0xfff3a0);
    playGunSound('sniper', 0.5);
    if (rand() < 0.4) hurtPlayer(G.player.car ? 6 : 14, 'sniper');
  }
  if (h.hp <= 0) {
    spawnExplosion(h.x, h.y, h.z, 2);
    removeHelicopter();
    W.heliDelay = 40;
    G.stats.wrecks++;
    reportCrime(5, 'AIR UNIT DOWN');
    awardRankPoints(40, 'ELANG-1 shot down');
  }
}

function deploySwatVanAndOfficers(dt) {
  const p = playerPosition();
  if (!W.swat) {
    W.swatDelay = (W.swatDelay || 0) - dt;
    if (G.wanted >= 4 && W.swatDelay <= 0) {
      const picks = W.nodes.filter((n) => { const d = dist2d(n.x, n.z, p.x, p.z); return d > 100 && d < 230 && !n.ramp; });
      if (picks.length) { const n = randPick(picks); spawnSwatVan(n.x, n.z, Math.atan2(p.x - n.x, p.z - n.z)); }
    }
    return;
  }
  const s = W.swat, van = s.car;
  if (van.wrecked || van.removed) { W.swat = null; W.swatDelay = 30; s.unit.gone = true; return; }
  const dist = dist2d(van.x, van.z, p.x, p.z);
  van.siren = true;
  if (!s.deployed) {
    const slowTarget = !G.player.car || Math.abs(p.speed) < 6;
    if (dist < (slowTarget ? 24 : 9)) {
      driveVehicleWithArcadePhysics(van, van.speed > 1 ? -1 : 0, 0, false, dt);
      if (Math.abs(van.speed) < 2 && slowTarget) deploySwatOfficers(s);
    } else {
      van.boost = dist > 60 ? 1.35 : 1.1;
      driveVehicleWithArcadePhysics(van, 1, steerTowards(van, p.x, p.z), false, dt);
    }
    resolveCarAgainstWorld(van);
    resolveCarAgainstCars(van);
    if (Math.abs(van.speed) < 1 && dist > 30) { van.stuck += dt; if (van.stuck > 3) { removeCar(van); } } else van.stuck = 0;
  } else {
    van.speed = 0;
    s.officers = s.officers.filter((o) => o.state !== 'dead' && !o.removed);
    // The suspect drove off: pick the team up again and resume the chase.
    if (dist > 75 || s.officers.length === 0) {
      for (const o of s.officers) removePerson(o);
      s.officers = []; s.deployed = false;
      setSwatDoorsOpen(van.mesh, false);
      s.unit.role = 'BREACH';
    }
  }
}

function spawnHelicopter(x, z, y) {
  const mesh = makeHelicopterMesh();
  W.scene.add(mesh);
  W.scene.add(mesh.userData.cone);
  W.scene.add(mesh.userData.spot);
  const unit = { kind: 'heli', name: 'ELANG-1', role: 'SPOTLIGHT', car: null, person: null, x: x, z: z, dist: 0 };
  W.units.push(unit);
  W.heli = { mesh: mesh, x: x, y: y, z: z, vx: 0, vz: 0, heading: 0, hp: 300, cool: 2, unit: unit };
  aimSearchlight(W.heli, G.player.x, G.player.y, G.player.z, 0);
  return W.heli;
}

function aimSearchlight(h, tx, ty, tz, dt) {
  const m = h.mesh, u = m.userData;
  m.position.set(h.x, h.y, h.z);
  m.rotation.set(0.12, h.heading, clamp(-h.vx * 0.004, -0.2, 0.2), 'YXZ');
  u.rotor.rotation.y += dt * 38;
  m.updateMatrixWorld(true);
  const from = u.lamp.getWorldPosition(new THREE.Vector3());
  const ground = ty + 0.06, dir = new THREE.Vector3(tx - from.x, ground - from.y, tz - from.z);
  const len = dir.length();
  u.cone.position.copy(from);
  u.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  u.cone.scale.set(1.7, len, 1.7);
  u.spot.position.set(tx, ground, tz);
  u.spot.scale.set(3.8, 3.8, 1);
}

function removeHelicopter() {
  const h = W.heli;
  if (!h) return;
  W.scene.remove(h.mesh);
  W.scene.remove(h.mesh.userData.cone);
  W.scene.remove(h.mesh.userData.spot);
  h.unit.gone = true;
  W.heli = null;
}

function spawnSwatVan(x, z, heading) {
  const car = spawnCar('badak', x, z, heading, 'swat');
  car.siren = true; car.name = 'BADAK-2';
  const unit = { kind: 'swat', name: 'BADAK-2', role: 'BREACH', car: car, person: null, dist: 0 };
  W.units.push(unit);
  W.swat = { car: car, unit: unit, deployed: false, officers: [] };
  return W.swat;
}

function deploySwatOfficers(s) {
  const van = s.car, bx = -Math.sin(van.heading), bz = -Math.cos(van.heading), rx = Math.cos(van.heading), rz = -Math.sin(van.heading);
  s.deployed = true;
  setSwatDoorsOpen(van.mesh, true);
  const count = G.wanted >= 5 ? 4 : 3;
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 2.3;
    const look = Object.assign({}, PERSON_LOOKS.swat, i === 0 ? { shield: true, weapon: 'pistol' } : {});
    const o = spawnPerson('swat', van.x + bx * (van.spec.len * 0.5 + 1.6 + (i % 2)) + rx * off, van.z + bz * (van.spec.len * 0.5 + 1.6 + (i % 2)) + rz * off, look);
    o.hp = o.maxHp = 130; o.hostile = true; o.state = 'advance'; o.name = i === count - 1 && G.wanted >= 5 ? 'SNIPER' : 'SWAT';
    o.heading = Math.atan2(G.player.x - o.x, G.player.z - o.z);
    attachEnemyMarkers(o);
    s.officers.push(o);
  }
  s.unit.role = G.wanted >= 5 ? 'SNIPER' : 'BREACH';
  showBanner('SWAT ARUNIKA DEPLOYED', 'BADAK-2 tactical team on the ground', 2.6);
  playUiSound('wanted');
}

function dismissAirAndSwat() {
  removeHelicopter();
  if (W.swat) {
    for (const o of W.swat.officers) if (!o.removed) removePerson(o);
    if (!W.swat.car.removed) { if (dist2d(W.swat.car.x, W.swat.car.z, G.player.x, G.player.z) > 50) removeCar(W.swat.car); else { W.swat.car.kind = 'parked'; W.swat.car.siren = false; } }
    W.swat.unit.gone = true;
    W.swat = null;
  }
  W.heliDelay = 0; W.swatDelay = 0;
}
