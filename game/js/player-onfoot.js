// Raka on foot: walking, sprinting, jumping, aiming, entering and leaving cars, stealing them.
TA.spawnPlayer = function (x, z, h) {
  if (TA.player && TA.player.mesh) TA.scene.remove(TA.player.mesh);
  var p = {
    x: x, z: z, y: TA.groundY(x, z), h: h || 0, vy: 0, air: false, hp: TA.state.health, armour: TA.state.armour,
    car: null, mesh: TA.makePerson(TA.LOOKS.raka), phase: 0, moving: 0, dead: false, deadT: 0,
    weapon: TA.state.weapon, cool: 0, reloadT: 0, holdE: 0, nearCar: null, pose: null, lastShot: -9
  };
  p.mesh.position.set(x, p.y, z);
  TA.scene.add(p.mesh);
  TA.player = p;
  TA.cam.yaw = p.h;
  return p;
};

// The car the player could get into right now (nearest within reach), or null.
TA.findNearCar = function () {
  var p = TA.player, best = null, bd = 4.2;
  for (var i = 0; i < TA.cars.length; i++) {
    var c = TA.cars[i];
    if (c.dead) continue;
    var d = TA.dist(p.x, p.z, c.x, c.z) - c.model.len * 0.25;
    if (d < bd && Math.abs(c.speed) < 9) { bd = d; best = c; }
  }
  return best;
};

TA.carPrompt = function (car) {
  if (car.kind === 'police' || car.kind === 'swat') return 'Hold E to steal ' + car.name;
  if (car.driver) return 'Hold E to steal ' + car.name + ' — driver inside';
  if (car.owned || car.mission) return 'Press E to enter ' + car.name;
  return 'Hold E to steal ' + car.name;
};

TA.enterCar = function (car, stolen) {
  var p = TA.player;
  if (car.driver) {
    // the driver is pulled out and runs
    var side = { x: car.x + Math.cos(car.h) * 2.2, z: car.z - Math.sin(car.h) * 2.2 };
    var ped = TA.spawnPerson('ped', side.x, side.z, TA.randomLook(TA.rand));
    ped.corner = { i: TA.nearestNode(car.x, car.z).i, j: TA.nearestNode(car.x, car.z).j, sx: 1, sz: 1 }; ped.prev = null; ped.jit = { x: 0, z: 0 }; ped.speed = 1.5;
    ped.state = 'flee'; ped.timer = 8; ped.fx = car.x; ped.fz = car.z;
    car.driver = false;
    TA.crime(Math.min(5, Math.max(1, TA.run.wanted + 1)), 'CARJACKING');
    if (TA.sfx) TA.sfx('alarm', 1);
  } else if (stolen && !car.owned && !car.mission) {
    if (car.kind === 'police' || car.kind === 'swat') TA.crime(Math.max(3, TA.run.wanted), 'STOLEN POLICE VEHICLE');
    else if (TA.rand() < 0.3) { TA.crime(1, 'CAR THEFT'); if (TA.sfx) TA.sfx('alarm', 1); }
  }
  if (stolen && !car.owned) TA.state.stats.carsStolen++;
  car.prevKind = car.kind; car.kind = 'player'; car.ai = null; car.owned = true; car.static = false; car.siren = false;
  p.car = car; p.mesh.visible = false; p.holdE = 0;
  TA.cam.offset = 0;
  if (TA.onEnterCar) TA.onEnterCar(car);
  if (TA.radioOn) TA.radioOn(true);
};

TA.exitCar = function (forced) {
  var p = TA.player, car = p.car;
  if (!car) return;
  if (!forced && Math.abs(car.speed) > 9) { TA.run.prompt = 'Slow down to bail out'; return; }
  var o = { x: car.x + Math.cos(car.h) * (car.model.wid * 0.5 + 0.9), z: car.z - Math.sin(car.h) * (car.model.wid * 0.5 + 0.9) };
  TA.collideCircle(o, 0.45); TA.keepOnLand(o);
  p.x = o.x; p.z = o.z; p.y = TA.groundY(o.x, o.z); p.h = car.h; p.car = null; p.mesh.visible = true;
  car.kind = 'parked'; car.keep = true;
  TA.cam.yaw = car.h; TA.cam.pitch = 0.2;
  if (TA.radioOn) TA.radioOn(false);
};

TA.updatePlayerOnFoot = function (dt) {
  var p = TA.player, ax = TA.axis(), yaw = TA.cam.yaw;
  var sprint = TA.keyDown('ShiftLeft') || TA.keyDown('ShiftRight'), aim = TA.aiming();
  var speed = aim ? 2.4 : sprint ? 7.2 : 4.2;
  var mx = Math.sin(yaw) * ax.f - Math.cos(yaw) * ax.r, mz = Math.cos(yaw) * ax.f + Math.sin(yaw) * ax.r, len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0.01) {
    mx /= len; mz /= len;
    var o = { x: p.x + mx * speed * dt, z: p.z + mz * speed * dt };
    TA.collideCircle(o, 0.42); TA.keepOnLand(o);
    // parked and moving cars are solid for a walker too
    for (var i = 0; i < TA.cars.length; i++) {
      var c = TA.cars[i], d = TA.dist(o.x, o.z, c.x, c.z), r = c.radius + 0.35;
      if (d < r && d > 0.01) { o.x = c.x + (o.x - c.x) / d * r; o.z = c.z + (o.z - c.z) / d * r; }
    }
    TA.state.stats.distance += TA.dist(p.x, p.z, o.x, o.z);
    p.x = o.x; p.z = o.z; p.moving = speed;
    if (!aim) p.h = TA.turnToward(p.h, TA.headingTo(mx, mz), 12 * dt);
  }
  if (aim || TA.firing() || TA.run.time - p.lastShot < 0.6) p.h = TA.turnToward(p.h, p.aimH !== undefined && TA.run.time - p.lastShot < 0.6 ? p.aimH : yaw, 14 * dt);
  // jump
  var gy = TA.groundY(p.x, p.z);
  if (!p.air && TA.keyHit('Space')) { p.air = true; p.vy = 5.6; }
  if (p.air) { p.vy -= 16 * dt; p.y += p.vy * dt; if (p.y <= gy) { p.y = gy; p.air = false; } } else p.y = gy;

  // cars: E enters an owned car at once; any other car needs E held (theft, or pulling the driver out)
  var near = TA.findNearCar();
  p.nearCar = near;
  if (near) {
    TA.run.prompt = TA.carPrompt(near);
    var quick = (near.owned || near.mission) && !near.driver && near.kind !== 'police';
    if (quick ? TA.keyHit('KeyE') : TA.keyDown('KeyE')) {
      p.holdE += dt;
      if (quick || p.holdE > 0.55) TA.enterCar(near, !quick);
    } else p.holdE = 0;
  } else p.holdE = 0;

  p.pose = (aim || TA.run.time - p.lastShot < 0.5) && p.weapon > 0 ? 'aim' : null;
  p.phase += p.moving * dt * 3.6;
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.h;
  TA.animatePerson(p.mesh, p.phase, p.moving > 0.2 ? (sprint ? 1.0 : 0.6) : 0, p.pose);
  p.moving = 0;
};

TA.damagePlayer = function (dmg, from) {
  var p = TA.player;
  if (!p || p.dead || TA.run.godMode) return;
  if (p.armour > 0) { var soak = Math.min(p.armour, dmg * 0.7); p.armour -= soak; dmg -= soak; }
  p.hp -= dmg;
  if (TA.flashDamage) TA.flashDamage();
  if (p.hp <= 0) { p.hp = 0; TA.killPlayer('WASTED'); }
};

// WASTED or BUSTED: the screen holds for a moment, then Raka wakes at the nearest safehouse, poorer.
TA.killPlayer = function (word) {
  var p = TA.player;
  if (p.dead) return;
  if (p.car) TA.exitCar(true);
  p.dead = true; p.deadT = 0; p.deadWord = word;
  p.mesh.position.set(p.x, p.y, p.z); TA.animatePerson(p.mesh, 0, 0, word === 'WASTED' ? 'down' : null);
  if (word === 'WASTED') TA.state.stats.wasted++; else TA.state.stats.busted++;
  TA.showBanner(word, word === 'WASTED' ? 'The bay keeps its own.' : 'TAPD takes its cut.', word === 'WASTED' ? '#e63946' : '#4895ef');
};

TA.updatePlayerDead = function (dt) {
  var p = TA.player;
  p.deadT += dt;
  if (p.deadT < 3.2) return;
  var best = null, bd = 1e9;
  TA.SAFEHOUSES.forEach(function (k) { var s = TA.PLACES[k], d = TA.dist(p.x, p.z, s.x, s.z); if (d < bd) { bd = d; best = s; } });
  var fee = Math.round(TA.state.money * 0.1);
  TA.addMoney(-fee);
  if (TA.failMission) TA.failMission(p.deadWord === 'WASTED' ? 'You were wasted.' : 'You were busted.');
  TA.setWanted(0);
  p.dead = false; p.hp = 100; p.armour = 0; p.x = best.x; p.z = best.z + 3; p.h = 0; p.pose = null;
  TA.keepOnLand(p); TA.cam.yaw = 0; TA.cam.snap = true;
  if (p.deadWord === 'BUSTED') { for (var i = 2; i < 6; i++) { TA.state.ammo[i].mag = 0; TA.state.ammo[i].res = Math.floor(TA.state.ammo[i].res / 2); } }
  TA.showBanner('BACK ON YOUR FEET', best.name + ' · -' + TA.fmtMoney(fee), '#ffd166');
};
