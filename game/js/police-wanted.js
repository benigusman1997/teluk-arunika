// Wanted stars, heat, line of sight, dispatch units and roles, cruisers and the foot patrol.

function raiseWantedLevel(stars, incident) {
  const level = clamp(stars, 0, 5);
  if (level > G.wanted) {
    G.wanted = level;
    G.incident = incident || INCIDENTS[level];
    showBanner(level >= 4 ? 'AIR UNIT DEPLOYED' : level === 3 ? 'ROADBLOCKS AHEAD' : 'WANTED - ' + level + (level === 1 ? ' STAR' : ' STARS'), 'TAPD DISPATCH - ' + G.incident, 2.2);
    playUiSound('wanted');
    showTutorialHint('wanted');
  }
  G.heat = 1;
  G.crimePoints = 0;
}

function dispatchPoliceUnits(dt) {
  if (G.wanted <= 0) return;
  W.dispatchTimer = (W.dispatchTimer || 0) - dt;
  if (W.dispatchTimer > 0) return;
  W.dispatchTimer = 2.2;
  const want = DISPATCH_PLAN[G.wanted];
  const cruisers = W.units.filter((u) => u.kind === 'cruiser').length, foot = W.units.filter((u) => u.kind === 'foot').length;
  const p = playerPosition();
  if (cruisers < want.cruisers) {
    // Send the next cruiser from a road junction some way off, never right on top of Raka.
    const picks = W.nodes.filter((n) => { const d = dist2d(n.x, n.z, p.x, p.z); return d > 90 && d < 230 && !n.ramp; });
    if (picks.length) {
      const n = randPick(picks);
      addCruiserUnit(n.x + randRange(-3, 3), n.z + randRange(-3, 3), Math.atan2(p.x - n.x, p.z - n.z));
    }
  } else if (foot < want.foot && !G.player.car) {
    const a = randRange(0, 6.28), x = p.x + Math.cos(a) * 45, z = p.z + Math.sin(a) * 45;
    if (!pointBlocked(x, z, 0) && isLandAt(x, z)) addFootPatrolUnit(x, z);
  }
  if (want.roadblock && G.player.car && Math.abs(p.speed) > 12 && !W.units.some((u) => u.kind === 'roadblock')) placeRoadblockAhead();
}

function pursueWithPitAndRamming(dt) {
  const p = playerPosition();
  const pfx = Math.sin(p.heading), pfz = Math.cos(p.heading), prx = -pfz, prz = pfx, pv = G.player.car ? p.speed : 0;
  W.units.forEach((unit, index) => {
    if (unit.kind !== 'cruiser') return;
    const car = unit.car, side = index % 2 ? 1 : -1;
    let tx = p.x, tz = p.z;
    if (G.player.car) {
      if (unit.role === 'RAMMING') { tx += pfx * pv * 0.25; tz += pfz * pv * 0.25; }
      else if (unit.role === 'PIT') { tx += -pfx * 1.6 + prx * side * 1.9; tz += -pfz * 1.6 + prz * side * 1.9; }
      else if (unit.role === 'BOX-IN') { tx += pfx * (9 + pv * 0.45) + prx * side * 1.5; tz += pfz * (9 + pv * 0.45) + prz * side * 1.5; }
      else if (unit.role === 'FLANKING') { tx += pfx * 2 + prx * side * 4.6; tz += pfz * 2 + prz * side * 4.6; }
      else { tx -= pfx * 8; tz -= pfz * 8; }
    }
    const dist = dist2d(car.x, car.z, p.x, p.z);
    car.siren = true;
    car.boost = (1 + G.wanted * 0.03) * (dist > 55 ? 1.3 : 1);
    let throttle = 1, steer = steerTowards(car, tx, tz), handbrake = false;
    if (!G.player.car && dist < 11) { throttle = car.speed > 1 ? -1 : 0; if (car.speed < 2 && !unit.dismounted) { unit.dismounted = true; addFootPatrolUnit(car.x - Math.cos(car.heading) * 1.6, car.z + Math.sin(car.heading) * 1.6); } }
    else if (Math.abs(steer) > 0.9 && car.speed > 14) { throttle = 0; handbrake = true; }
    else if (G.player.car && dist < 7 && unit.role !== 'RAMMING' && unit.role !== 'PIT') throttle = car.speed > pv + 1 ? 0 : 0.6;
    if (unit.reverse > 0) { unit.reverse -= dt; throttle = -1; steer = -steer; }
    driveVehicleWithArcadePhysics(car, throttle, steer, handbrake, dt);
    resolveCarAgainstWorld(car);
    resolveCarAgainstCars(car);
    if (Math.abs(car.speed) < 1.2 && dist > 14) { car.stuck += dt; if (car.stuck > 1.6) { unit.reverse = 1.1; car.stuck = 0; unit.jams = (unit.jams || 0) + 1; } } else car.stuck = 0;
    if ((unit.jams > 3 || dist > 320 || !isLandAt(car.x, car.z)) && dist > 60) { removeCar(car); unit.gone = true; }
  });
  updateFootPatrol(dt);
  W.units = W.units.filter((u) => !u.gone && !(u.car && (u.car.wrecked || u.car.removed)) && !(u.person && (u.person.state === 'dead' || u.person.removed)));
  for (const u of W.units) {
    const src = u.car || u.person || u;
    u.dist = dist2d(src.x, src.z, p.x, p.z);
  }
  W.units.sort((a, b) => a.dist - b.dist);
}

function escapeByBreakingLineOfSight(dt) {
  if (G.wanted <= 0) { G.heat = 0; G.inSight = false; return; }
  const p = playerPosition();
  let seen = false;
  for (const u of W.units) {
    if (u.kind === 'roadblock') continue;
    const range = u.kind === 'heli' ? 170 : u.kind === 'foot' ? 60 : 120;
    const src = u.car || u.person || u;
    if (u.dist < range && (u.kind === 'heli' || !segmentBlocked(src.x, src.z, p.x, p.z))) { seen = true; break; }
  }
  G.inSight = seen;
  if (seen) G.heat = Math.min(1, G.heat + dt * 0.6);
  else G.heat -= dt / ((11 + G.wanted * 4) * (currentRankIndex() >= 3 ? 0.75 : 1));
  if (G.heat <= 0) clearWantedLevel(true);
  W.radioTimer = (W.radioTimer || 4) - dt;
  if (W.radioTimer <= 0 && G.wanted > 0) { W.radioTimer = 6; G.radioLine = composePoliceRadioLine(p); }
}

function reportCrime(stars, incident) {
  if (G.wanted < stars) { raiseWantedLevel(stars, incident); return; }
  G.heat = 1;
  G.crimePoints = (G.crimePoints || 0) + 1;
  if (G.crimePoints >= 4 && G.wanted < 5) raiseWantedLevel(G.wanted + 1, incident);
}

function clearWantedLevel(escaped) {
  if (G.wanted > 0 && escaped) {
    G.stats.escapes++;
    awardRankPoints(6 * G.wanted, 'Heat lost');
    showBanner('HEAT LOST', 'TAPD has lost the suspect', 2);
  }
  G.wanted = 0; G.heat = 0; G.inSight = false; G.incident = ''; G.crimePoints = 0; G.radioLine = '';
  for (const u of W.units) {
    if (u.car) { u.car.siren = false; if (u.dist > 50) removeCar(u.car); else { u.car.kind = 'parked'; u.car.speed = 0; } }
    if (u.person) { if (u.dist > 40) removePerson(u.person); else { u.person.kind = 'ped'; u.person.state = 'walk'; u.person.hostile = false; u.person.node = nearestWalkNode(u.person.x, u.person.z); } }
  }
  W.units = [];
  removeRoadblocks();
  dismissAirAndSwat();
}

function steerTowards(car, tx, tz) {
  let want = Math.atan2(tx - car.x, tz - car.z);
  // Feel ahead for walls and bend the course around them.
  const reach = 7 + Math.abs(car.speed) * 0.45;
  if (pointBlocked(car.x + Math.sin(car.heading) * reach, car.z + Math.cos(car.heading) * reach, 0)) {
    for (const off of [0.6, -0.6, 1.1, -1.1]) {
      if (!pointBlocked(car.x + Math.sin(car.heading + off) * reach, car.z + Math.cos(car.heading + off) * reach, 0)) { want = car.heading + off * 1.3; break; }
    }
  }
  return clamp(-angleDiff(want, car.heading) * 2.2, -1, 1);
}

function addCruiserUnit(x, z, heading) {
  const used = W.units.filter((u) => u.kind === 'cruiser').map((u) => u.name);
  const slot = CRUISER_NAMES.findIndex((n) => !used.includes(n));
  const car = spawnCar('cruiser', x, z, heading, 'police');
  car.siren = true;
  car.name = CRUISER_NAMES[Math.max(0, slot)];
  const unit = { kind: 'cruiser', name: car.name, role: G.wanted <= 2 ? 'PURSUIT' : CRUISER_ROLES[Math.max(0, slot)], car: car, person: null, dist: 0, reverse: 0, dismounted: false };
  W.units.push(unit);
  return unit;
}

function addFootPatrolUnit(x, z) {
  W.footSerial = (W.footSerial || 0) + 1;
  const cop = spawnPerson('cop', x, z, Object.assign({}, PERSON_LOOKS.cop, G.wanted >= 3 ? { weapon: 'pistol' } : {}));
  cop.state = 'chase'; cop.hp = cop.maxHp = 80; cop.hostile = true; cop.name = 'PATROL ' + (4 + W.footSerial * 7);
  const unit = { kind: 'foot', name: cop.name, role: 'FOOT CHASE', car: null, person: cop, dist: 0 };
  W.units.push(unit);
  return unit;
}

function updateFootPatrol(dt) {
  const p = playerPosition();
  for (const unit of W.units) {
    const cop = unit.person;
    if (unit.kind !== 'foot' || !cop || cop.state === 'dead' || cop.state === 'down') continue;
    const d = dist2d(cop.x, cop.z, p.x, p.z), armed = cop.weapon === 'pistol';
    const want = Math.atan2(p.x - cop.x, p.z - cop.z);
    cop.heading += clamp(angleDiff(want, cop.heading), -8 * dt, 8 * dt);
    cop.cool -= dt;
    if (armed && d < 22 && d > 5 && !segmentBlocked(cop.x, cop.z, p.x, p.z)) {
      cop.state = 'shoot';
      if (cop.cool <= 0) { cop.cool = randRange(0.7, 1.3); enemyShootAtPlayer(cop, 0.35); }
    } else if (d > 1.5) {
      cop.state = 'chase';
      cop.x += Math.sin(cop.heading) * 5.3 * dt; cop.z += Math.cos(cop.heading) * 5.3 * dt;
      cop.phase += dt * 13;
      const out = pushOutOfColliders(cop.x, cop.z, 0.35);
      cop.x = out.x; cop.z = out.z;
    } else if (!G.player.car) {
      cop.state = 'chase';
      cop.phase += dt * 9;
      if (cop.cool <= 0) { cop.cool = 0.9; hurtPlayer(9, 'baton'); spawnHitMarker(p.x, p.y + 1.4, p.z, 0xffffff); }
      W.bustTimer = (W.bustTimer || 0) + dt;
      if (G.wanted <= 2 && !G.player.moving && W.bustTimer > 1.6) arrestPlayer();
    }
    if (d > 2.5) W.bustTimer = 0;
    cop.y = groundHeightAt(cop.x, cop.z);
    updatePersonMesh(cop);
  }
}

function composePoliceRadioLine(p) {
  const lead = W.units.find((u) => u.kind === 'cruiser') || W.units[0];
  const who = lead ? lead.name : 'DISPATCH';
  const compass = ['southbound', 'eastbound', 'northbound', 'westbound'][((Math.round(p.heading / (Math.PI / 2)) % 4) + 4) % 4];
  const street = streetNameAt(p.x, p.z), kmh = Math.round(Math.abs(p.speed) * 3.6);
  if (!G.inSight) return who + ': lost visual near ' + street + ', all units sweep ' + districtAt(p.x, p.z).name + '.';
  if (G.player.car) return who + ': ' + compass + ', ' + street + (kmh > 90 ? ', ' + Math.floor(kmh / 10) * 10 + '+' : '.');
  return who + ': suspect on foot at ' + street + ', moving in.';
}

const DISPATCH_PLAN = [
  { cruisers: 0, foot: 0, roadblock: false },
  { cruisers: 0, foot: 2, roadblock: false },
  { cruisers: 2, foot: 2, roadblock: false },
  { cruisers: 3, foot: 2, roadblock: true },
  { cruisers: 4, foot: 2, roadblock: true },
  { cruisers: 5, foot: 3, roadblock: true }
];
