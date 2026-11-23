// Weapons, ammo, shooting (hitscan), the weapon wheel logic, hostile gunmen that take cover and flank, damage.
TA.weaponName = function (i) { return TA.WEAPONS[i].name; };

TA.giveWeapon = function (i, reserve) {
  var s = TA.state, w = TA.WEAPONS[i];
  if (!s.owned[i]) { s.owned[i] = true; s.ammo[i].mag = w.mag; }
  s.ammo[i].res += reserve || 0;
};

TA.selectWeapon = function (i) {
  if (!TA.state.owned[i]) return false;
  TA.state.weapon = i; TA.player.weapon = i; TA.player.reloadT = 0;
  if (TA.sfx) TA.sfx('click', 0.5);
  return true;
};

TA.cycleWeapon = function (dir) {
  var i = TA.state.weapon;
  for (var k = 0; k < 6; k++) { i = (i + dir + 6) % 6; if (TA.state.owned[i]) { TA.selectWeapon(i); return; } }
};

TA.reloadWeapon = function () {
  var p = TA.player, w = TA.WEAPONS[p.weapon], a = TA.state.ammo[p.weapon];
  if (!w.mag || a.mag >= w.mag || a.res <= 0 || p.reloadT > 0) return;
  p.reloadT = 1.1;
  if (TA.sfx) TA.sfx('reload', 0.6);
};

// Player weapon handling for one step: wheel, number keys, reload, firing on foot and drive-by.
TA.updateWeapons = function (dt) {
  var p = TA.player, s = TA.state, i;
  TA.run.wheelOpen = TA.keyDown('Tab') && !p.dead;
  TA.run.slowmo = TA.run.wheelOpen ? 0.25 : 1;
  for (i = 0; i < 6; i++) if (TA.keyHit('Digit' + (i + 1)) && !TA.run.shop) TA.selectWeapon(i);
  if (TA.run.wheelOpen) {
    // the mouse direction picks a slice of the wheel
    var m = TA.input.wheelVec || (TA.input.wheelVec = { x: 0, y: 0 });
    m.x = TA.clamp(m.x + TA.input.mouseDX, -80, 80); m.y = TA.clamp(m.y + TA.input.mouseDY, -80, 80);
    TA.input.mouseDX = 0; TA.input.mouseDY = 0;
    if (m.x * m.x + m.y * m.y > 900) { var slice = Math.floor(((Math.atan2(m.x, -m.y) + Math.PI * 2 + Math.PI / 6) % (Math.PI * 2)) / (Math.PI / 3)); if (s.owned[slice] && slice !== s.weapon) TA.selectWeapon(slice); }
    return;
  }
  if (TA.input.wheelVec) TA.input.wheelVec.x = TA.input.wheelVec.y = 0;
  p.cool -= dt;
  if (p.reloadT > 0) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) { var w0 = TA.WEAPONS[p.weapon], a0 = s.ammo[p.weapon], take = Math.min(w0.mag - a0.mag, a0.res); a0.mag += take; a0.res -= take; }
    return;
  }
  if (TA.keyHit('KeyR')) TA.reloadWeapon();
  var w = TA.WEAPONS[p.weapon], a = s.ammo[p.weapon];
  var trigger = w.auto ? TA.firing() : (TA.input.clicked || (TA.input.auto && TA.input.auto.fire));
  if (!trigger || p.cool > 0) return;
  if (p.car && p.weapon === 0) return;
  if (w.mag && a.mag <= 0) { TA.reloadWeapon(); if (a.res <= 0 && TA.sfx) TA.sfx('click', 0.4); return; }
  if (w.mag) a.mag--;
  p.cool = w.rate; p.lastShot = TA.run.time; s.stats.shots++;
  var aimH = TA.playerAimHeading(w);
  p.aimH = aimH;
  var ox = p.x + Math.sin(aimH) * 0.6, oz = p.z + Math.cos(aimH) * 0.6;
  for (i = 0; i < w.pellets; i++) TA.fireShot(p, ox, p.y + 1.4, oz, aimH + (TA.rand() - 0.5) * 2 * w.spread, w, 'player');
  if (p.weapon > 0) {
    TA.gunNoise(p.x, p.z, 45);
    if (TA.sfx) TA.sfx(p.weapon === 3 ? 'boom' : 'shot', p.weapon >= 4 ? 1 : 0.7);
    if (TA.anyWitness(p.x, p.z, 70)) TA.crime(2, 'SHOTS FIRED');
  } else if (TA.sfx) TA.sfx('punch', 0.6);
};

// Aim along the camera, with a little assist toward the nearest hostile near the crosshair.
TA.playerAimHeading = function (w) {
  var p = TA.player, yaw = TA.cam.yaw, best = yaw, bestScore = p.car ? 1.2 : 0.22;
  var consider = function (x, z) {
    var d = TA.dist(p.x, p.z, x, z);
    if (d > w.range || d < 0.5) return;
    var hd = TA.headingTo(x - p.x, z - p.z), off = Math.abs(TA.wrapAngle(hd - yaw));
    if (off < bestScore && TA.losClear(p.x, p.z, x, z)) { bestScore = off; best = hd; }
  };
  TA.people.forEach(function (o) { if (!o.dead && o.hostile) consider(o.x, o.z); });
  TA.cars.forEach(function (c) { if (!c.dead && (c.kind === 'police' || c.kind === 'swat' || c.target)) consider(c.x, c.z); });
  if (TA.heli && TA.heli.active) consider(TA.heli.x, TA.heli.z);
  return best;
};

// One hitscan ray. Finds the nearest person, car or wall along it, applies damage, draws the tracer.
TA.fireShot = function (shooter, ox, oy, oz, heading, w, by) {
  var dx = Math.sin(heading), dz = Math.cos(heading), best = w.range, hit = null, kind = null, i, o, t, px, pz, side;
  for (t = 1.5; t < best; t += 1.5) if (TA.pointSolid(ox + dx * t, oz + dz * t, oy)) { best = t; kind = 'wall'; break; }
  for (i = 0; i < TA.people.length; i++) {
    o = TA.people[i];
    if (o.dead || o === shooter) continue;
    px = o.x - ox; pz = o.z - oz; t = px * dx + pz * dz; side = Math.abs(px * dz - pz * dx);
    if (t > 0 && t < best && side < 0.5) { best = t; hit = o; kind = 'person'; }
  }
  for (i = 0; i < TA.cars.length; i++) {
    o = TA.cars[i];
    if (o.dead || (shooter.car === o) || o === shooter.ownCar) continue;
    px = o.x - ox; pz = o.z - oz; t = px * dx + pz * dz; side = Math.abs(px * dz - pz * dx);
    if (t > 0 && t - o.radius < best && side < o.radius + 0.3) { best = Math.max(0.5, t - o.radius); hit = o; kind = 'car'; }
  }
  var pl = TA.player;
  if (by !== 'player' && pl && !pl.dead) {
    px = pl.x - ox; pz = pl.z - oz; t = px * dx + pz * dz; side = Math.abs(px * dz - pz * dx);
    if (t > 0 && t < best + (pl.car ? pl.car.radius : 0) && side < (pl.car ? pl.car.radius + 0.2 : 0.5)) { best = Math.min(best, t); hit = pl; kind = 'player'; }
  }
  if (by === 'player' && TA.heli && TA.heli.active && w.range > 30) {
    px = TA.heli.x - ox; pz = TA.heli.z - oz; t = px * dx + pz * dz; side = Math.abs(px * dz - pz * dx);
    if (t > 0 && t < best && side < 3 && TA.aiming()) { best = t; hit = TA.heli; kind = 'heli'; }
  }
  var ex = ox + dx * best, ez = oz + dz * best, ey = kind === 'heli' ? TA.heli.y : oy - 0.2;
  if (w.range > 3 && TA.spawnTracer) { TA.spawnTracer(ox, oy, oz, ex, ey, ez); TA.spawnMuzzle(ox, oy, oz); }
  if (kind === 'person') { TA.damagePerson(hit, w.dmg, by); if (TA.spawnSparks) TA.spawnSparks(ex, oy, ez, 2, 0xb3001b); if (hit.hostile && by === 'player') hit.alert = 12; }
  else if (kind === 'car') { TA.damageCar(hit, w.dmg * 0.55, by); if (TA.spawnSparks) TA.spawnSparks(ex, oy, ez, 3); }
  else if (kind === 'player') { if (pl.car) { TA.damageCar(pl.car, w.dmg * 0.35, by); TA.damagePlayer(w.dmg * 0.12, shooter); } else TA.damagePlayer(w.dmg * 0.5, shooter); }
  else if (kind === 'heli') TA.damageHeli(w.dmg);
  else if (kind === 'wall' && TA.spawnSparks) TA.spawnSparks(ex, oy, ez, 2);
  return kind;
};

TA.gunNoise = function (x, z, radius) {
  TA.scarePedestrians(x, z, radius); TA.scareTraffic(x, z, radius);
  TA.people.forEach(function (o) { if (o.hostile && !o.dead && TA.dist(x, z, o.x, o.z) < radius * 1.6) o.alert = 12; });
};

TA.anyWitness = function (x, z, radius) {
  for (var i = 0; i < TA.people.length; i++) { var o = TA.people[i]; if (!o.dead && TA.dist(x, z, o.x, o.z) < radius) return true; }
  return false;
};

// ---- hostile gunmen: guards, thugs, SWAT officers and armed police -----------
TA.spawnGunman = function (kind, x, z, weapon, name) {
  var g = TA.spawnPerson(kind, x, z, TA.LOOKS[kind === 'enemy' ? 'thug' : kind]);
  g.weapon = weapon; g.name = name || ''; g.state = 'hold'; g.timer = 1 + TA.rand() * 2; g.cool = 0.5 + TA.rand(); g.hostile = true;
  g.home = { x: x, z: z }; g.goal = null; g.alert = 0; g.accuracy = kind === 'swat' ? 0.07 : kind === 'guard' ? 0.11 : 0.14;
  if (kind === 'guard' || kind === 'thug' || kind === 'enemy') g.hp = g.maxHp = kind === 'guard' ? 90 : 70;
  return g;
};

// Nearest cover: a spot just behind a solid, on the side away from the player.
TA.findCover = function (g, pl) {
  var best = null, bd = 30, list = TA.world.coverSpots.concat(TA.dynamicCover || []);
  for (var i = 0; i < list.length; i++) {
    var c = list[i], d = TA.dist(g.x, g.z, c.x, c.z);
    if (d < bd && TA.dist(c.x, c.z, pl.x, pl.z) > 7 && !c.taken) { bd = d; best = c; }
  }
  return best;
};

TA.updateGunmen = function (dt) {
  var pl = TA.player;
  for (var i = 0; i < TA.people.length; i++) {
    var g = TA.people[i];
    if (g.dead || g.kind === 'ped') continue;
    var d = TA.dist(g.x, g.z, pl.x, pl.z), w = TA.WEAPONS[g.weapon], sees = d < 75 && !pl.dead && TA.losClear(g.x, g.z, pl.x, pl.z);
    var isPolice = g.kind === 'cop' || g.kind === 'swat';
    var active = isPolice ? TA.run.wanted > 0 : (g.alert > 0 || (sees && d < (g.sight || 34)));
    if (g.alert > 0) g.alert -= dt;
    if (!active) { g.pose = null; TA.personVsCars(g); TA.placePerson(g, dt); continue; }
    if (sees && !isPolice) g.alert = 10;
    var speed = 0, wantH = TA.headingTo(pl.x - g.x, pl.z - g.z);
    g.timer -= dt;
    // a patrol officer with a low wanted level runs the suspect down to arrest him instead of shooting
    var arrest = g.kind === 'cop' && TA.run.wanted <= 2 && !TA.run.shotsAtPolice;
    if (arrest) {
      speed = d > 1.6 ? 5.6 : 0; g.goal = null;
      if (d < 2 && !pl.car && Math.abs(pl.moving || 0) < 6) { g.bust = (g.bust || 0) + dt; if (g.bust > 1.6) TA.killPlayer('BUSTED'); } else g.bust = 0;
      if (pl.car && d < 3.5 && Math.abs(pl.car.speed) < 2) { g.bust = (g.bust || 0) + dt; if (g.bust > 2.2) TA.killPlayer('BUSTED'); }
    } else if (g.state === 'hold') {
      if (g.timer <= 0) {
        // leave cover: either flank around the player or fall back to new cover
        var cover = TA.rand() < 0.5 ? TA.findCover(g, pl) : null;
        if (cover) g.goal = { x: cover.x, z: cover.z };
        else { var ang = wantH + Math.PI + (TA.rand() < 0.5 ? -1 : 1) * (0.7 + TA.rand() * 0.6), r = Math.min(Math.max(8, d * 0.7), w.range * 0.6); g.goal = { x: pl.x + Math.sin(ang) * r, z: pl.z + Math.cos(ang) * r }; }
        g.state = 'move'; g.timer = 3 + TA.rand() * 2;
      } else if (d > w.range * 0.8 || !sees) { g.goal = { x: pl.x, z: pl.z }; speed = 4.4; }
    } else if (g.state === 'move') {
      speed = g.kind === 'swat' ? 5 : 4.2;
      if (!g.goal || g.timer <= 0 || TA.dist(g.x, g.z, g.goal.x, g.goal.z) < 1.2) { g.state = 'hold'; g.timer = 1.6 + TA.rand() * 2.4; g.goal = null; speed = 0; }
    }
    if (speed > 0) {
      var gh = g.goal ? TA.headingTo(g.goal.x - g.x, g.goal.z - g.z) : wantH;
      g.h = TA.turnToward(g.h, gh, 8 * dt);
      var o = { x: g.x + Math.sin(g.h) * speed * dt, z: g.z + Math.cos(g.h) * speed * dt };
      TA.collideCircle(o, 0.42); TA.keepOnLand(o);
      g.x = o.x; g.z = o.z; g.moving = speed;
    } else g.h = TA.turnToward(g.h, wantH, 9 * dt);
    // shooting: only with a clear line, with spread that grows with distance and the target's speed
    g.cool -= dt;
    g.pose = !arrest && sees ? 'aim' : null;
    if (!arrest && sees && g.cool <= 0 && d < w.range && g.weapon > 0) {
      g.cool = w.rate * (w.auto ? 2.2 : 1.6) + TA.rand() * 0.5;
      var spread = g.accuracy * (1 + (pl.car ? Math.abs(pl.car.speed) * 0.04 : (pl.moving || 0) * 0.08));
      TA.fireShot(g, g.x + Math.sin(wantH) * 0.6, g.y + 1.4, g.z + Math.cos(wantH) * 0.6, wantH + (TA.rand() - 0.5) * 2 * spread, w, g.kind);
      if (TA.sfxAt) TA.sfxAt('shot', g.x, g.z);
    }
    TA.personVsCars(g);
    TA.placePerson(g, dt);
  }
};
