// People as simulation entities, and the ambient pedestrians: spawning, walking the sidewalk graph,
// crossing at zebra crossings, running from gunfire, reacting to being bumped or hit by cars.
TA.people = [];
TA.PED_TARGET = 48;
TA.PED_SHOUTS = ['Hey, watch it!', 'Aduh!', 'Are you blind?', 'Call the TAPD!', 'Not again...', 'Woi!'];

TA.spawnPerson = function (kind, x, z, look) {
  var p = {
    kind: kind, x: x, z: z, y: TA.groundY(x, z), h: TA.rand() * 6.28, hp: kind === 'ped' ? 40 : kind === 'swat' ? 140 : 80, maxHp: 0,
    speed: 0, phase: TA.rand() * 6, state: 'walk', timer: 0, dead: false, deadT: 0, look: look, mesh: TA.makePerson(look),
    weapon: 0, cool: 0, corner: null, pose: null, hostile: kind !== 'ped', name: ''
  };
  p.maxHp = p.hp;
  p.mesh.position.set(x, p.y, z);
  TA.scene.add(p.mesh);
  TA.people.push(p);
  return p;
};

TA.removePerson = function (p) {
  var i = TA.people.indexOf(p);
  if (i >= 0) TA.people.splice(i, 1);
  TA.scene.remove(p.mesh);
  if (TA.removeMarkerFor) TA.removeMarkerFor(p);
  p.removed = true;
};

// Sidewalk corner (i, j, sx, sz): 10 m off the intersection centre, on one of its four corners.
TA.cornerPos = function (c) { return { x: TA.ROADS_NS[c.i].x + c.sx * 10, z: TA.ROADS_EW[c.j].z + c.sz * 10 }; };

TA.nextCorner = function (c, prev) {
  var opts = [{ i: c.i, j: c.j, sx: -c.sx, sz: c.sz }, { i: c.i, j: c.j, sx: c.sx, sz: -c.sz }];
  if (c.i + c.sx >= 0 && c.i + c.sx <= 6) opts.push({ i: c.i + c.sx, j: c.j, sx: -c.sx, sz: c.sz }, { i: c.i + c.sx, j: c.j, sx: -c.sx, sz: c.sz });
  if (c.j + c.sz >= 0 && c.j + c.sz <= 4) opts.push({ i: c.i, j: c.j + c.sz, sx: c.sx, sz: -c.sz }, { i: c.i, j: c.j + c.sz, sx: c.sx, sz: -c.sz });
  var pick = opts[Math.floor(TA.rand() * opts.length) % opts.length];
  if (prev && pick.i === prev.i && pick.j === prev.j && pick.sx === prev.sx && pick.sz === prev.sz) pick = opts[(opts.indexOf(pick) + 1) % opts.length];
  return pick;
};

TA.spawnPedestrian = function (cx, cz, minDist, maxDist) {
  for (var tries = 0; tries < 12; tries++) {
    var c = { i: TA.ri(0, 6), j: TA.ri(0, 4), sx: TA.rand() < 0.5 ? -1 : 1, sz: TA.rand() < 0.5 ? -1 : 1 };
    var next = TA.nextCorner(c, null), a = TA.cornerPos(c), b = TA.cornerPos(next), t = TA.rand();
    var x = TA.lerp(a.x, b.x, t) + TA.rr(-1.2, 1.2), z = TA.lerp(a.z, b.z, t) + TA.rr(-1.2, 1.2), d = TA.dist(x, z, cx, cz);
    if (d < minDist || d > maxDist) continue;
    var p = TA.spawnPerson('ped', x, z, TA.randomLook(TA.rand));
    p.prev = c; p.corner = next; p.speed = 1.2 + TA.rand() * 0.7; p.jit = { x: TA.rr(-1.3, 1.3), z: TA.rr(-1.3, 1.3) };
    return p;
  }
  return null;
};

TA.populatePedestrians = function (cx, cz, minDist) {
  var count = TA.people.filter(function (p) { return p.kind === 'ped' && !p.dead; }).length, tries = 0;
  while (count < TA.PED_TARGET && tries++ < 30) if (TA.spawnPedestrian(cx, cz, minDist, 190)) count++;
};

TA.updatePedestrians = function (dt) {
  var pl = TA.player;
  for (var i = TA.people.length - 1; i >= 0; i--) {
    var p = TA.people[i];
    if (p.dead) {
      p.deadT += dt;
      if (p.deadT > 25 && (!pl || TA.dist(p.x, p.z, pl.x, pl.z) > 50)) TA.removePerson(p);
      continue;
    }
    if (p.kind !== 'ped') continue;
    if (pl && TA.dist(p.x, p.z, pl.x, pl.z) > 230 && !TA.run.showcase) { TA.removePerson(p); continue; }
    TA.walkPedestrian(p, dt);
    TA.personVsCars(p);
    TA.placePerson(p, dt);
  }
  if (pl && TA.run.frame % 40 === 7 && !TA.run.showcase) TA.populatePedestrians(pl.x, pl.z, 70);
};

TA.walkPedestrian = function (p, dt) {
  var pl = TA.player, speed = p.speed;
  if (p.state === 'down') { p.timer -= dt; p.pose = 'down'; if (p.timer <= 0) { p.state = 'flee'; p.timer = 5; p.pose = null; } return; }
  if (p.state === 'flee') {
    p.timer -= dt; speed = 5.2;
    var away = TA.headingTo(p.x - p.fx, p.z - p.fz);
    p.h = TA.turnToward(p.h, away, 6 * dt);
    if (p.timer <= 0) p.state = 'walk';
  } else {
    var t = TA.cornerPos(p.corner), tx = t.x + p.jit.x, tz = t.z + p.jit.z, d = TA.dist(p.x, p.z, tx, tz);
    if (d < 1.2) { var n = TA.nextCorner(p.corner, p.prev); p.prev = p.corner; p.corner = n; }
    p.h = TA.turnToward(p.h, TA.headingTo(tx - p.x, tz - p.z), 3.5 * dt);
    // bumped by the player on foot: stumble aside and complain
    if (pl && !pl.car && TA.dist(p.x, p.z, pl.x, pl.z) < 0.75) {
      p.x += (p.x - pl.x) * 0.6; p.z += (p.z - pl.z) * 0.6;
      if (!p.bumpT || TA.run.time - p.bumpT > 3) { p.bumpT = TA.run.time; if (TA.floatText) TA.floatText(TA.pick(TA.PED_SHOUTS), p); }
    }
  }
  var o = { x: p.x + Math.sin(p.h) * speed * dt, z: p.z + Math.cos(p.h) * speed * dt };
  TA.collideCircle(o, 0.4); TA.keepOnLand(o);
  p.x = o.x; p.z = o.z; p.moving = speed;
};

TA.scarePedestrians = function (x, z, radius) {
  TA.people.forEach(function (p) {
    if (p.kind === 'ped' && !p.dead && p.state !== 'down' && TA.dist(x, z, p.x, p.z) < radius) { p.state = 'flee'; p.timer = 5 + TA.rand() * 3; p.fx = x; p.fz = z; }
  });
};

// Any person against moving cars: slow bumps knock them down, fast ones are fatal.
TA.personVsCars = function (p) {
  for (var i = 0; i < TA.cars.length; i++) {
    var c = TA.cars[i], sp = Math.abs(c.speed);
    if (sp < 2.5 || Math.abs(c.x - p.x) > 5 || Math.abs(c.z - p.z) > 5) continue;
    var dx = p.x - c.x, dz = p.z - c.z, fx = Math.sin(c.h), fz = Math.cos(c.h), along = dx * fx + dz * fz, side = dx * fz - dz * fx;
    if (Math.abs(along) > c.model.len * 0.5 + 0.4 || Math.abs(side) > c.model.wid * 0.5 + 0.35) continue;
    var byPlayer = c.kind === 'player';
    p.x += (side >= 0 ? fz : -fz) * 1.2; p.z += (side >= 0 ? -fx : fx) * 1.2;
    if (sp > 9) TA.damagePerson(p, 200, byPlayer ? 'playercar' : 'car');
    else { if (p.kind === 'ped') { p.state = 'down'; p.timer = 2.5; p.fx = c.x; p.fz = c.z; } TA.damagePerson(p, sp * 3, byPlayer ? 'playercar' : 'car'); }
    if (byPlayer && TA.crime) TA.crime(sp > 9 ? 2 : 1, 'HIT AND RUN');
    return;
  }
};

TA.damagePerson = function (p, dmg, by) {
  if (p.dead) return;
  p.hp -= dmg;
  if (p.kind === 'ped' && p.state !== 'down') { p.state = 'flee'; p.timer = 6; p.fx = TA.player ? TA.player.x : p.x + 1; p.fz = TA.player ? TA.player.z : p.z; }
  if (p.hp > 0) return;
  p.dead = true; p.deadT = 0; p.pose = 'down'; p.hp = 0;
  p.mesh.position.set(p.x, p.y, p.z); TA.animatePerson(p.mesh, 0, 0, 'down'); p.mesh.rotation.y = p.h;
  if (TA.removeMarkerFor) TA.removeMarkerFor(p);
  var playerDid = by === 'player' || by === 'playercar';
  if (playerDid) {
    TA.state.stats.kills++;
    if (p.kind === 'ped') { TA.crime(2, 'ASSAULT'); TA.addStanding(TA.districtAt(p.x, p.z).id, -4); }
    else if (p.kind === 'cop' || p.kind === 'swat') TA.crime(Math.min(5, Math.max(3, TA.run.wanted + 1)), 'OFFICER DOWN');
  }
  if (TA.onPersonKilled) TA.onPersonKilled(p, by);
};

// Writes the entity's position, facing and walk animation to its mesh.
TA.placePerson = function (p, dt) {
  p.y = TA.groundY(p.x, p.z);
  p.phase += (p.moving || 0) * dt * 4.2;
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.h;
  TA.animatePerson(p.mesh, p.phase, p.moving > 0.2 ? Math.min(0.9, 0.35 + p.moving * 0.09) : 0, p.pose);
  p.moving = 0;
};
