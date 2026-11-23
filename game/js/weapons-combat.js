// Six weapons, the weapon wheel, hit markers and damage numbers, and enemies that use cover.

function fireCurrentWeapon() {
  const w = WEAPONS[G.weaponIndex], slot = G.weapons[G.weaponIndex], p = G.player;
  if (G.fireCooldown > 0 || G.reloading > 0) return false;
  G.fireCooldown = w.rate;
  p.heading = G.camYaw;
  if (w.id === 'fists') { punchInFront(w); return true; }
  if (slot.mag <= 0) { reloadWeapon(); return false; }
  slot.mag--;
  const dir = W.camera.getWorldDirection(new THREE.Vector3()), cam = W.camera.position;
  const mx = p.x + Math.sin(p.heading) * 0.75 - Math.cos(p.heading) * 0.3, my = p.y + (p.crouch ? 1.0 : 1.38), mz = p.z + Math.cos(p.heading) * 0.75 + Math.sin(p.heading) * 0.3;
  spawnMuzzleFlash(mx, my, mz, p.heading);
  playGunSound(w.id, 1);
  addCameraShake(w.id === 'shotgun' || w.id === 'sniper' ? 0.22 : 0.07);
  for (let n = 0; n < w.pellets; n++) {
    const d = dir.clone();
    d.x += randRange(-w.spread, w.spread); d.y += randRange(-w.spread, w.spread) * 0.6; d.z += randRange(-w.spread, w.spread);
    d.normalize();
    const hit = castBullet(cam.x, cam.y, cam.z, d, w.range, dist2d(cam.x, cam.z, p.x, p.z) + 0.6);
    spawnTracer(mx, my, mz, hit.x, hit.y, hit.z, 0xffe680);
    if (hit.person) damagePerson(hit.person, w.dmg * (hit.head ? 2 : 1), true, hit);
    else if (hit.car) { hit.car.hp -= w.dmg * 0.45; spawnSparks(hit.x, hit.y, hit.z, 4); if (hit.car.ai) hit.car.ai.flee = 6; if (hit.car.kind === 'traffic' || hit.car.kind === 'parked') hit.car.alarm = 4; }
    else if (hit.heli) { W.heli.hp -= w.dmg; spawnSparks(hit.x, hit.y, hit.z, 5); spawnHitMarker(hit.x, hit.y, hit.z, 0xffffff); }
    else if (hit.wall) spawnSmokePuff(hit.x, hit.y, hit.z, 0.25, 0xcfc8bb);
  }
  alarmPedestriansNear(p.x, p.z, 38);
  alarmTrafficNear(p.x, p.z, 30);
  if (districtAt(p.x, p.z).id !== 'abu' || G.wanted > 0) reportCrime(2, 'SHOTS FIRED');
  if (slot.mag <= 0) reloadWeapon();
  return true;
}

function openWeaponWheel(open) {
  if (open === G.wheelOpen) return;
  G.wheelOpen = open;
  G.timeScale = open ? 0.2 : 1;
  if (open) { W.wheelHover = G.weaponIndex; W.wheelX = 0; W.wheelY = 0; playUiSound('talk'); return; }
  if (G.weapons[W.wheelHover].owned) selectWeapon(W.wheelHover);
  W.wheelHover = undefined;
}

function updateEnemyCoverAI(dt) {
  const p = playerPosition();
  for (const e of W.people) {
    if (e.state === 'fall') { e.t += dt; if (e.t > 0.55) { e.state = 'dead'; e.t = 0; } updatePersonMesh(e); continue; }
    if (!e.hostile || e.kind === 'cop' || e.state === 'dead' || e.state === 'down') { if (e.state === 'dead' && e.kind !== 'ped') { e.t += dt; updatePersonMesh(e); } continue; }
    e.t += dt; e.cool -= dt;
    const d = dist2d(e.x, e.z, p.x, p.z), sees = d < 75 && !segmentBlocked(e.x, e.z, p.x, p.z);
    const face = Math.atan2(p.x - e.x, p.z - e.z);
    if (e.state === 'idle') { if (sees && d < 55) { e.state = 'cover'; e.t = 0; alarmPedestriansNear(e.x, e.z, 30); } }
    else if (e.state === 'cover') {
      // Crouched behind cover; pop up after a pause, or push forward when the target is far.
      e.heading += clamp(angleDiff(face, e.heading), -6 * dt, 6 * dt);
      if (e.t > e.wait) {
        if (d > (e.kind === 'swat' ? 16 : 30) || !sees) { e.state = 'advance'; e.t = 0; pickAdvancePoint(e, p, d); }
        else { e.state = 'shoot'; e.t = 0; e.burst = e.weapon === 'pistol' ? 2 : 4; e.cool = 0.25; }
      }
    } else if (e.state === 'shoot') {
      e.heading = face;
      if (e.cool <= 0 && e.burst > 0) { e.cool = e.weapon === 'pistol' ? 0.5 : 0.16; e.burst--; if (sees) enemyShootAtPlayer(e, e.kind === 'swat' ? 0.34 : 0.26); }
      if (e.burst <= 0 && e.t > 1.0) { e.state = 'cover'; e.t = 0; e.wait = randRange(0.8, 2.0); }
    } else if (e.state === 'advance' || e.state === 'flank') {
      const tx = e.goX, tz = e.goZ, td = dist2d(e.x, e.z, tx, tz);
      const want = Math.atan2(tx - e.x, tz - e.z);
      e.heading += clamp(angleDiff(want, e.heading), -8 * dt, 8 * dt);
      const speed = e.look.shield ? 2.6 : 4.4;
      e.x += Math.sin(e.heading) * speed * dt; e.z += Math.cos(e.heading) * speed * dt;
      e.phase += dt * speed * 2.6;
      const out = pushOutOfColliders(e.x, e.z, 0.4);
      e.x = out.x; e.z = out.z;
      if (td < 1.2 || e.t > 3.5) { e.state = 'cover'; e.t = 0; e.wait = randRange(0.4, 1.2); }
    }
    e.y = groundHeightAt(e.x, e.z);
    updatePersonMesh(e);
  }
}

function pickAdvancePoint(e, p, d) {
  // Move a few metres closer, a little to one side, so the group spreads and flanks.
  const side = e.id % 2 ? 1 : -1, step = Math.min(9, Math.max(3, d - 12));
  const fx = (p.x - e.x) / (d || 1), fz = (p.z - e.z) / (d || 1);
  e.goX = e.x + fx * step + fz * side * 4;
  e.goZ = e.z + fz * step - fx * side * 4;
  if (e.id % 3 === 0) e.state = 'flank';
}

function enemyShootAtPlayer(e, accuracy) {
  const p = playerPosition(), my = e.y + 1.38;
  const mx = e.x + Math.sin(e.heading) * 0.7, mz = e.z + Math.cos(e.heading) * 0.7;
  const d = dist2d(e.x, e.z, p.x, p.z);
  const chance = accuracy * (G.player.crouch ? 0.6 : 1) * (G.player.sprinting ? 0.7 : 1) * clamp(1.3 - d / 60, 0.35, 1);
  const hits = rand() < chance, miss = hits ? 0.2 : 1.6;
  spawnMuzzleFlash(mx, my, mz, e.heading);
  spawnTracer(mx, my, mz, p.x + randRange(-miss, miss), p.y + 1.1 + randRange(-miss, miss) * 0.4, p.z + randRange(-miss, miss), e.kind === 'swat' ? 0xa5d8ff : 0xffb3a0);
  playGunSound(e.weapon === 'pistol' ? 'pistol' : 'smg', clamp(1.2 - d / 70, 0.15, 0.8));
  if (!hits) return;
  if (G.player.car) { G.player.car.hp -= 4; spawnSparks(p.x, p.y + 1, p.z, 3); }
  else hurtPlayer(e.weapon === 'rifle' ? 11 : e.weapon === 'smg' ? 7 : 8, 'gunfire');
}

function castBullet(ox, oy, oz, dir, range, skip) {
  let best = range, result = { x: ox + dir.x * range, y: oy + dir.y * range, z: oz + dir.z * range, person: null, car: null, heli: false, wall: false, head: false };
  // Walls and the ground: march along the ray.
  for (let t = skip; t < range; t += 0.8) {
    const x = ox + dir.x * t, y = oy + dir.y * t, z = oz + dir.z * t;
    if (y < groundHeightAt(x, z) || pointBlocked(x, z, y)) { best = t; result = { x: x, y: Math.max(y, 0.05), z: z, person: null, car: null, heli: false, wall: true, head: false }; break; }
  }
  for (const e of W.people) {
    if (e.state === 'dead' || e.inCar) continue;
    const low = e.state === 'cover' || e.state === 'down';
    const t = (e.x - ox) * dir.x + (e.y + (low ? 0.6 : 1.1) - oy) * dir.y + (e.z - oz) * dir.z;
    if (t < skip || t > best) continue;
    const x = ox + dir.x * t, y = oy + dir.y * t, z = oz + dir.z * t;
    const top = e.y + (low ? 1.3 : 1.95);
    if (dist2d(x, z, e.x, e.z) < 0.45 && y > e.y && y < top) {
      const shielded = e.look.shield && e.state !== 'shoot' && Math.abs(angleDiff(Math.atan2(ox - e.x, oz - e.z), e.heading)) < 0.9;
      best = t;
      result = { x: x, y: y, z: z, person: shielded ? null : e, car: null, heli: false, wall: shielded, head: y > top - 0.35 };
    }
  }
  for (const car of W.cars) {
    if (car === G.player.car) continue;
    const t = (car.x - ox) * dir.x + (car.y + 0.8 - oy) * dir.y + (car.z - oz) * dir.z;
    if (t < skip || t > best) continue;
    const x = ox + dir.x * t, y = oy + dir.y * t, z = oz + dir.z * t;
    if (dist2d(x, z, car.x, car.z) < car.spec.len * 0.42 && y > car.y && y < car.y + 1.7) { best = t; result = { x: x, y: y, z: z, person: null, car: car, heli: false, wall: false, head: false }; }
  }
  if (W.heli) {
    const h = W.heli, t = (h.x - ox) * dir.x + (h.y - oy) * dir.y + (h.z - oz) * dir.z;
    if (t > skip && t < best && Math.hypot(ox + dir.x * t - h.x, oy + dir.y * t - h.y, oz + dir.z * t - h.z) < 3.2) result = { x: ox + dir.x * t, y: oy + dir.y * t, z: oz + dir.z * t, person: null, car: null, heli: true, wall: false, head: false };
  }
  return result;
}

function damagePerson(e, dmg, byPlayer, hit) {
  if (e.state === 'dead' || e.state === 'fall') return;
  e.hp -= dmg;
  const y = hit ? hit.y : e.y + 1.3;
  spawnHitMarker(e.x, y, e.z, hit && hit.head ? 0xff5a4d : 0xffffff);
  spawnFloatingText(e.x + randRange(-0.3, 0.3), e.y + 2.5, e.z, '-' + Math.round(dmg), hit && hit.head ? '#ff8a80' : '#ffffff');
  if (byPlayer) playUiSound('hit');
  if (e.hp <= 0) { killPerson(e, byPlayer); return; }
  if (e.kind === 'ped') { e.state = 'panic'; e.panic = 8; e.alert = true; e.fromX = G.player.x; e.fromZ = G.player.z; if (byPlayer) reportCrime(2, 'ASSAULT'); }
  else if (e.state === 'idle' || e.state === 'cover') { e.state = 'shoot'; e.t = 0; e.burst = 3; e.cool = 0.3; }
}

function killPerson(e, byPlayer) {
  e.hp = 0;
  e.state = 'fall'; e.t = 0; e.alert = false; e.hostile = false;
  if (!byPlayer) return;
  G.stats.kills++;
  if (e.kind === 'ped') { reportCrime(2, 'HOMICIDE'); changeDistrictStanding(districtAt(e.x, e.z).id, -3); return; }
  const lawful = e.kind === 'cop' || e.kind === 'swat';
  const cash = lawful ? 0 : 50;
  if (cash) { addMoney(cash, 'Dropped cash'); spawnFloatingText(e.x, e.y + 3.7, e.z, '+' + cash, '#ffd43b'); }
  awardRankPoints(lawful ? 6 : 5, 'Enemy down');
  if (lawful) reportCrime(Math.min(5, Math.max(3, G.wanted + (e.kind === 'swat' ? 1 : 0))), 'OFFICER DOWN');
}

function spawnEnemy(lookName, x, z, weapon, label) {
  const e = spawnPerson(lookName === 'guard' ? 'guard' : lookName === 'swat' ? 'swat' : 'thug', x, z, Object.assign({}, PERSON_LOOKS[lookName], { weapon: weapon }));
  e.hostile = true; e.state = 'idle'; e.name = label;
  e.hp = e.maxHp = lookName === 'thug' ? 85 : 70;
  e.wait = randRange(0.5, 1.5); e.burst = 0; e.goX = x; e.goZ = z;
  e.heading = Math.atan2(G.player.x - x, G.player.z - z);
  attachEnemyMarkers(e);
  return e;
}

function attachEnemyMarkers(e) {
  e.marker = makeMarkerSprite('diamond');
  e.bar = makeHealthBarSprite();
  W.scene.add(e.marker);
  W.scene.add(e.bar);
  updatePersonMesh(e);
}

function punchInFront(w) {
  const p = G.player;
  p.punch = 0.3;
  playUiSound('hit');
  for (const e of W.people) {
    if (e.state === 'dead' || dist2d(e.x, e.z, p.x, p.z) > w.range) continue;
    if (Math.abs(angleDiff(Math.atan2(e.x - p.x, e.z - p.z), p.heading)) < 0.9) { damagePerson(e, w.dmg, true, null); if (e.kind === 'ped') reportCrime(1, 'ASSAULT'); break; }
  }
}

function reloadWeapon() {
  const w = WEAPONS[G.weaponIndex], slot = G.weapons[G.weaponIndex];
  if (!w.mag || slot.mag >= w.mag || slot.reserve <= 0 || G.reloading > 0) return;
  G.reloading = 1.2;
  playUiSound('reload');
}

function finishReload() {
  const w = WEAPONS[G.weaponIndex], slot = G.weapons[G.weaponIndex];
  const take = Math.min(w.mag - slot.mag, slot.reserve);
  slot.mag += take; slot.reserve -= take;
}

function selectWeapon(index) {
  if (!G.weapons[index].owned || index === G.weaponIndex) return;
  G.weaponIndex = index;
  G.reloading = 0;
  rebuildPlayerMesh();
  playUiSound('reload');
}

function updatePlayerWeapons(dt) {
  if (G.fireCooldown > 0) G.fireCooldown -= dt;
  if (G.reloading > 0) { G.reloading -= dt; if (G.reloading <= 0) finishReload(); }
  for (let i = 0; i < WEAPONS.length; i++) if (W.keysHit['Digit' + (i + 1)]) selectWeapon(i);
  if (W.keysHit.KeyR) reloadWeapon();
  openWeaponWheel(!!W.keys.Tab && !G.player.car);
  if (G.wheelOpen) {
    // Mouse direction picks a slice; twelve o'clock is slot 1, clockwise.
    W.wheelX = clamp(W.wheelX + W.mouse.dx, -60, 60); W.wheelY = clamp(W.wheelY + W.mouse.dy, -60, 60);
    if (Math.hypot(W.wheelX, W.wheelY) > 18) W.wheelHover = ((Math.round(Math.atan2(W.wheelX, -W.wheelY) / (Math.PI / 3)) % 6) + 6) % 6;
    return;
  }
  if (G.player.car) return;
  const w = WEAPONS[G.weaponIndex];
  if (w.auto ? W.mouse.left : W.mouse.leftHit) fireCurrentWeapon();
}
