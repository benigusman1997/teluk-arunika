// Wanted level 1-5, heat, and the TAPD dispatch: named units with roles — foot patrols, CAMAR cruisers,
// BLOKIR roadblocks with spike strips. (The helicopter and SWAT live in police-airswat.js.)
TA.units = [];
TA.unitSeq = 0;
TA.spikes = [];

TA.setWanted = function (n) {
  var r = TA.run, old = r.wanted;
  n = TA.clamp(Math.round(n), 0, 5);
  if (n === old) return;
  r.wanted = n;
  if (n > old) {
    r.heat = 1; r.inSight = true; r.shotsAtPolice = n >= 3;
    if (n >= 4 && old < 4) TA.showBanner('SWAT ARUNIKA DEPLOYED', 'BADAK-2 AND ELANG-1 ARE ON YOU', '#e63946');
    else TA.showBanner(TA.STATUS_LINES[n], 'WANTED LEVEL ' + n, '#ffd166');
    TA.policeSay(TA.pick(TA.POLICE_RADIO));
  }
  if (n === 0) {
    if (old > 0) { TA.state.stats.starsEscaped += old; TA.addRP(old * 6); TA.showBanner('HEAT LOST', 'TAPD CODE 4 — ALL UNITS STAND DOWN', '#90be6d'); TA.policeSay('Dispatch: suspect lost. Code 4.'); }
    r.heat = 0; r.inSight = false; r.shotsAtPolice = false;
    TA.standDownUnits();
  }
};

// A crime raises the wanted level to at least "stars" (never lowers it).
TA.crime = function (stars, reason) {
  if (TA.run.mode !== 'playing' || TA.run.noCrime) return;
  if (stars > TA.run.wanted) { TA.run.incident = reason || TA.INCIDENTS[stars]; TA.setWanted(stars); }
  else if (TA.run.wanted > 0) TA.run.heat = 1;
};

TA.policeSay = function (line) { TA.run.policeLine = line; TA.run.policeLineT = 6; };

TA.addUnit = function (type, name, role, ent) {
  var u = { id: ++TA.unitSeq, type: type, name: name, role: role, car: ent && ent.model ? ent : null, person: ent && !ent.model ? ent : null, dist: 0, roleT: 0, lost: 0 };
  if (u.car) { u.car.unit = u; u.car.siren = true; u.car.name = name; }
  if (u.person) u.person.unit = u;
  TA.units.push(u);
  return u;
};

TA.unitPos = function (u) { return u.car || u.person || u.pos || { x: 0, z: 0 }; };

TA.removeUnit = function (u, keepEntity) {
  var i = TA.units.indexOf(u);
  if (i >= 0) TA.units.splice(i, 1);
  if (keepEntity) return;
  if (u.car && !u.car.dead && TA.player.car !== u.car) TA.removeCar(u.car);
  if (u.person && !u.person.dead) TA.removePerson(u.person);
  if (u.strip) { TA.scene.remove(u.strip.mesh); TA.spikes.splice(TA.spikes.indexOf(u.strip), 1); }
};

TA.standDownUnits = function () {
  TA.units.slice().forEach(function (u) { if (u.type !== 'heli') TA.removeUnit(u); });
  if (TA.heliStandDown) TA.heliStandDown();
};

// A road point between "min" and "max" metres from the player, preferably out of sight.
TA.policeSpawnPoint = function (min, max, ahead) {
  var p = TA.player, best = null, bs = -1e9, f = TA.cameraFocus(), fx = Math.sin(f.h), fz = Math.cos(f.h);
  TA.world.nodes.forEach(function (n) {
    var d = TA.dist(n.x, n.z, p.x, p.z);
    if (d < min || d > max) return;
    var dot = ((n.x - p.x) * fx + (n.z - p.z) * fz) / d, score = (ahead ? dot : -dot * 0.5) * 60 - Math.abs(d - (min + max) / 2) * 0.3 + TA.rand() * 30;
    if (score > bs) { bs = score; best = n; }
  });
  return best || TA.nearestNode(p.x + 150, p.z);
};

TA.spawnCruiser = function (x, z, h, role) {
  var used = TA.units.map(function (u) { return u.name; }), name = TA.CRUISER_NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || 'CAMAR ' + TA.ri(10, 99);
  var car = TA.spawnCar('cruiser', x, z, h, 'police');
  car.driver = true;
  return TA.addUnit('cruiser', name, role || 'PURSUIT', car);
};

TA.spawnFootPatrol = function (x, z) {
  var cop = TA.spawnGunman('cop', x, z, 1, 'PATROL');
  var n = TA.units.filter(function (u) { return u.type === 'foot'; }).length + 1;
  return TA.addUnit('foot', 'PATROL ' + TA.pad2(n * 7 % 90 + 4), 'FOOT CHASE', cop);
};

// BLOKIR roadblock: two cruisers parked nose to tail across the road, with a spike strip in front.
TA.spawnRoadblock = function (node, towardX, towardZ) {
  var alongZ = Math.abs(towardZ - node.z) > Math.abs(towardX - node.x), sgn = alongZ ? Math.sign(towardZ - node.z) || 1 : Math.sign(towardX - node.x) || 1;
  var bx = node.x + (alongZ ? 0 : sgn * 16), bz = node.z + (alongZ ? sgn * 16 : 0), n = TA.units.filter(function (u) { return u.type === 'block'; }).length;
  var name = 'BLOKIR ' + TA.pad2(3 + n * 4), unit = null;
  [-3.4, 3.4].forEach(function (o, k) {
    var car = TA.spawnCar('cruiser', bx + (alongZ ? o : 0), bz + (alongZ ? 0 : o), alongZ ? Math.PI / 2 : 0, 'police');
    car.static = true; car.driver = false;
    var u = TA.addUnit('block', name + (k ? 'b' : ''), 'BLOCKADE', car);
    u.hidden = k === 1;
    if (!k) unit = u;
  });
  var sx = bx + (alongZ ? 0 : sgn * 9), sz = bz + (alongZ ? sgn * 9 : 0);
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 15 : 0.9, 0.12, alongZ ? 0.9 : 15), new THREE.MeshLambertMaterial({ color: 0x2b2d31 }));
  mesh.position.set(sx, 0.08, sz); TA.scene.add(mesh);
  unit.strip = { mesh: mesh, x: sx, z: sz, alongZ: alongZ };
  TA.spikes.push(unit.strip);
  TA.policeSay(name + ' in position on ' + TA.streetAt(bx, bz) + ', spikes out.');
  return unit;
};

// How many of each unit type a wanted level calls for.
TA.FORCE = [
  { foot: 0, cruiser: 0, block: 0 }, { foot: 2, cruiser: 0, block: 0 }, { foot: 1, cruiser: 3, block: 0 },
  { foot: 0, cruiser: 4, block: 1 }, { foot: 0, cruiser: 4, block: 1 }, { foot: 0, cruiser: 6, block: 2 }
];

TA.countUnits = function (type) { return TA.units.filter(function (u) { return u.type === type && !u.hidden && !(u.car && u.car.dead) && !(u.person && u.person.dead); }).length; };

TA.reinforce = function () {
  var want = TA.FORCE[TA.run.wanted], p = TA.player, n;
  if (TA.countUnits('foot') < want.foot) {
    n = TA.policeSpawnPoint(35, 110, false);
    var c = TA.cornerPos({ i: n.i, j: n.j, sx: p.x > n.x ? 1 : -1, sz: p.z > n.z ? 1 : -1 });
    TA.spawnFootPatrol(c.x, c.z);
  }
  if (TA.countUnits('cruiser') < want.cruiser) {
    n = TA.policeSpawnPoint(110, 230, TA.rand() < 0.4);
    var roles = ['PURSUIT', 'RAMMING', 'PIT', 'FLANKING', 'BOX-IN', 'PURSUIT'];
    TA.spawnCruiser(n.x + TA.rr(-3, 3), n.z + TA.rr(-3, 3), TA.headingTo(p.x - n.x, p.z - n.z), roles[TA.countUnits('cruiser') % roles.length]);
  }
  if (TA.countUnits('block') < want.block && p.car) {
    n = TA.policeSpawnPoint(120, 240, true);
    TA.spawnRoadblock(n, p.x, p.z);
  }
};

// Each role aims the cruiser at a different point around the suspect.
TA.roleTarget = function (u, tgt) {
  var fx = Math.sin(tgt.h), fz = Math.cos(tgt.h), sp = tgt.speed || 0, lead = Math.min(40, sp * 1.1);
  var side = (u.id % 2 ? 1 : -1);
  switch (u.role) {
    case 'RAMMING': return { x: tgt.x + fx * sp * 0.3, z: tgt.z + fz * sp * 0.3, fast: 1.15 };
    case 'PIT': return { x: tgt.x - fx * 2.2 + fz * side * 2.4, z: tgt.z - fz * 2.2 - fx * side * 2.4, fast: 1.1 };
    case 'FLANKING': return { x: tgt.x + fx * lead * 0.5 + fz * side * 5, z: tgt.z + fz * lead * 0.5 - fx * side * 5, fast: 1.1 };
    case 'BOX-IN': return { x: tgt.x + fx * (lead + 8), z: tgt.z + fz * (lead + 8), fast: 1.2 };
    default: return { x: tgt.x - fx * 6, z: tgt.z - fz * 6, fast: 1 };
  }
};

TA.updateCruiser = function (u, dt) {
  var car = u.car, p = TA.player, f = TA.cameraFocus();
  if (car.dead) { TA.removeUnit(u, true); TA.addRP(4); return; }
  if (car.kind !== 'police') { TA.removeUnit(u, true); return; }
  var d = TA.dist(car.x, car.z, p.x, p.z);
  u.dist = d;
  if (d > 380) { TA.removeUnit(u); return; }
  var tgt = TA.roleTarget(u, f), tx = tgt.x, tz = tgt.z;
  // no clear run at the suspect: go via the neighbouring intersection that gets closest to him
  if (d > 30 && !TA.losClear(car.x, car.z, p.x, p.z)) {
    var here = TA.nearestNode(car.x, car.z), bestN = here, bd = 1e9;
    if (TA.dist(car.x, car.z, here.x, here.z) > 16 && TA.losClear(car.x, car.z, here.x, here.z)) { tx = here.x; tz = here.z; }
    else {
      here.nb.forEach(function (id) { var n = TA.world.nodes[id], nd = TA.dist(n.x, n.z, p.x, p.z); if (nd < bd) { bd = nd; bestN = n; } });
      tx = bestN.x; tz = bestN.z;
    }
  }
  var top = car.model.top * tgt.fast * (0.72 + TA.run.wanted * 0.07);
  // on foot suspect: pull up nearby, do not run him over at full speed
  var brake = p.car ? 0 : 16;
  if (!p.car && d < 9) { TA.stepCarPhysics(car, car.speed > 1 ? -1 : 0, 0, true, dt); u.stopped = (u.stopped || 0) + dt; }
  else { TA.driveToward(car, tx, tz, dt, top, brake); u.stopped = 0; }
  // officers step out of a stopped cruiser
  if (u.stopped > 1.2 && !u.dismounted && TA.countUnits('foot') < 4) {
    u.dismounted = true;
    TA.spawnFootPatrol(car.x + Math.cos(car.h) * 2, car.z - Math.sin(car.h) * 2);
  }
  // change role now and then so the pack keeps reshuffling
  u.roleT += dt;
  if (u.roleT > 9) { u.roleT = 0; if (TA.rand() < 0.5) u.role = TA.pick(['PURSUIT', 'RAMMING', 'PIT', 'FLANKING', 'BOX-IN']); }
};

TA.updateSpikes = function () {
  var car = TA.player.car;
  if (!car || !car.tyres || car.air) return;
  for (var i = 0; i < TA.spikes.length; i++) {
    var s = TA.spikes[i];
    if (Math.abs(car.x - s.x) < (s.alongZ ? 7.5 : 1.6) && Math.abs(car.z - s.z) < (s.alongZ ? 1.6 : 7.5)) {
      car.tyres = false; TA.showBanner('TYRES SHREDDED', 'SPIKE STRIP — FIND ANOTHER CAR', '#f8961e'); if (TA.sfx) TA.sfx('crash', 0.6);
    }
  }
};

TA.updatePolice = function (dt) {
  var r = TA.run, p = TA.player, i, u;
  if (r.policeLineT > 0) { r.policeLineT -= dt; if (r.policeLineT <= 0) r.policeLine = ''; }
  if (r.wanted <= 0) return;
  // heat: full while any unit can see the suspect, draining once they all lose him
  var seen = false;
  for (i = TA.units.length - 1; i >= 0; i--) {
    u = TA.units[i];
    var pos = TA.unitPos(u);
    u.dist = TA.dist(pos.x, pos.z, p.x, p.z);
    if (u.type === 'cruiser') TA.updateCruiser(u, dt);
    else if (u.type === 'foot' || u.type === 'swat') { if (u.person.dead) { TA.removeUnit(u, true); continue; } if (u.dist > 260) { TA.removeUnit(u); continue; } }
    else if (u.type === 'block') { if (u.car.dead || u.car.kind !== 'police') { TA.removeUnit(u, true); continue; } if (u.dist > 330) { TA.removeUnit(u); continue; } }
    if (u.dist < (u.type === 'heli' ? 150 : 95) && (u.type === 'heli' || TA.losClear(pos.x, pos.z, p.x, p.z))) seen = true;
  }
  r.inSight = seen;
  var fade = (TA.rankInfo().n >= 5 ? 1.25 : 1) / (9 + r.wanted * 3.5);
  r.heat = seen ? 1 : Math.max(0, r.heat - fade * dt);
  if (r.heat <= 0) { TA.setWanted(0); return; }
  r.reinforceT = (r.reinforceT || 0) - dt;
  if (r.reinforceT <= 0) { r.reinforceT = 2.2 - r.wanted * 0.25; TA.reinforce(); if (TA.reinforceAir) TA.reinforceAir(); }
  if (TA.rand() < dt * 0.06) TA.policeSay(TA.pick(TA.POLICE_RADIO));
  TA.updateSpikes();
  // long chases escalate on their own
  r.wantedTimer += dt;
  if (r.wantedTimer > 70 && r.wanted < 5 && seen && r.wanted >= 2 && !r.mission) { r.wantedTimer = 0; TA.crime(r.wanted + 1, TA.INCIDENTS[r.wanted + 1]); }
};

// Rows for the dispatch card: nearest first, hidden duplicates removed.
TA.dispatchRows = function () {
  return TA.units.filter(function (u) { return !u.hidden; }).sort(function (a, b) { return a.dist - b.dist; });
};

// Ramming a cruiser, or anything in front of a cruiser, is noticed.
TA.onPlayerRam = function (other, rel) {
  if (other.kind === 'police' || other.kind === 'swat') TA.crime(Math.max(2, TA.run.wanted), 'ASSAULT ON OFFICER');
  else if (rel > 9 && TA.run.wanted === 0 && TA.units.length === 0 && TA.rand() < 0.25) TA.crime(1, 'RECKLESS DRIVER');
};
