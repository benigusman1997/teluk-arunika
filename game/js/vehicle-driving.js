// Cars as simulation entities, the arcade driving model for the player (and any AI that drives "for real"),
// collisions with the city and other cars, damage, condition, smoke and the final explosion.
TA.cars = [];
TA.carSeq = 0;

TA.spawnCar = function (key, x, z, h, kind, color) {
  var model = TA.CAR_MODELS[key];
  var col = color !== undefined ? color : model.colors[Math.floor(TA.rand() * model.colors.length) % model.colors.length];
  var car = {
    id: ++TA.carSeq, key: key, model: model, color: col, mesh: TA.makeCar(key, col),
    x: x, z: z, y: TA.groundY(x, z), h: h, vx: 0, vz: 0, vy: 0, speed: 0, air: false,
    hp: model.hp, maxHp: model.hp, kind: kind || 'parked', driver: kind === 'traffic', dead: false, deadT: 0,
    radius: Math.max(1.0, model.wid * 0.62), tyres: true, boost: 0, smokeT: 0, ai: null, name: model.name, siren: false, owned: false
  };
  car.mesh.position.set(x, car.y, z); car.mesh.rotation.y = h;
  TA.scene.add(car.mesh);
  TA.cars.push(car);
  return car;
};

TA.removeCar = function (car) {
  var i = TA.cars.indexOf(car);
  if (i >= 0) TA.cars.splice(i, 1);
  TA.scene.remove(car.mesh);
  car.removed = true;
  if (TA.player && TA.player.car === car) TA.player.car = null;
};

TA.carForward = function (car) { return { x: Math.sin(car.h), z: Math.cos(car.h) }; };

// One step of arcade car physics. throttle -1..1, steer -1..1 (positive = right), handbrake true/false.
TA.stepCarPhysics = function (car, throttle, steer, handbrake, dt) {
  var m = car.model, fx = Math.sin(car.h), fz = Math.cos(car.h);
  var vf = car.vx * fx + car.vz * fz, vlx = car.vx - fx * vf, vlz = car.vz - fz * vf;
  var top = m.top * (car.tyres ? 1 : 0.45) * (car.kind === 'player' ? 1 + TA.state.upgrades.engine * 0.08 : 1) * (car.boost > 0 ? 1.35 : 1);
  var hpFactor = car.hp < car.maxHp * 0.25 ? 0.7 : 1;
  if (!car.air) {
    if (throttle > 0) vf += m.acc * (car.boost > 0 ? 2 : 1) * hpFactor * throttle * Math.max(0, 1 - vf / top) * dt;
    else if (throttle < 0) vf += (vf > 0.5 ? -26 : -m.acc * 0.6 * Math.max(0, 1 + vf / (top * 0.3))) * -throttle * dt;
    vf -= vf * (0.12 + (handbrake ? 1.1 : 0)) * dt + Math.sign(vf) * Math.min(Math.abs(vf), 0.8 * dt);
    // steering tightens with speed; reversing flips it
    var rate = 2.7 / (1 + Math.abs(vf) / 24) * Math.min(1, Math.abs(vf) / 4) * (handbrake ? 1.5 : 1);
    car.h = TA.wrapAngle(car.h - steer * rate * dt * (vf >= 0 ? 1 : -1));
    var grip = (handbrake ? 1.4 : 9) * m.grip * (car.tyres ? 1 : 0.5) * (TA.state.weather === 'rain' ? 0.6 : 1);
    var keep = Math.exp(-grip * dt);
    vlx *= keep; vlz *= keep;
    car.slip = Math.sqrt(vlx * vlx + vlz * vlz);
  }
  fx = Math.sin(car.h); fz = Math.cos(car.h);
  car.vx = fx * vf + vlx; car.vz = fz * vf + vlz;
  car.speed = vf;
  TA.moveCar(car, dt);
};

// Integrates position, resolves collisions against the city, keeps the car on land and on the ground.
TA.moveCar = function (car, dt) {
  var before = Math.sqrt(car.vx * car.vx + car.vz * car.vz);
  car.x += car.vx * dt; car.z += car.vz * dt;
  var fx = Math.sin(car.h), fz = Math.cos(car.h), off = car.model.len * 0.28, hitAny = false;
  for (var s = -1; s <= 1; s += 2) {
    var probe = { x: car.x + fx * off * s, z: car.z + fz * off * s, nx: 0, nz: 0 };
    var px = probe.x, pz = probe.z;
    if (TA.collideCircle(probe, car.radius) || TA.keepOnLand(probe)) {
      car.x += probe.x - px; car.z += probe.z - pz;
      var vn = car.vx * probe.nx + car.vz * probe.nz;
      if (vn < 0) { car.vx -= probe.nx * vn * 1.35; car.vz -= probe.nz * vn * 1.35; if (-vn > 4) TA.carImpact(car, -vn, car.x - probe.nx * car.radius, car.z - probe.nz * car.radius); }
      else if (!probe.nx && !probe.nz) { car.vx *= 0.5; car.vz *= 0.5; }
      hitAny = true;
    }
  }
  if (hitAny) car.speed = car.vx * fx + car.vz * fz;
  var gy = TA.groundY(car.x, car.z);
  if (car.air) {
    car.vy -= 22 * dt; car.y += car.vy * dt;
    if (car.y <= gy) { car.y = gy; car.air = false; if (car.vy < -9) TA.carImpact(car, -car.vy * 0.5, car.x, car.z); car.vy = 0; if (car.onLand) car.onLand(car); }
  } else car.y = gy;
  car.mesh.position.set(car.x, car.y, car.z);
  car.mesh.rotation.set(car.air ? -car.vy * 0.02 : 0, car.h, TA.clamp((car.slip || 0) * 0.02, -0.1, 0.1) * (car.steerSign || 0));
  if (car.kind === 'player') TA.state.stats.distance += before * dt;
};

TA.launchCar = function (car, vy) { if (!car.air) { car.air = true; car.vy = vy; car.y += 0.2; } };

// Damage from a crash, scaled by the closing speed; sparks fly from the contact point.
TA.carImpact = function (car, closing, x, z) {
  var plating = car.kind === 'player' ? 1 - TA.state.upgrades.plating * 0.2 : 1;
  TA.damageCar(car, closing * 0.9 * plating, null);
  if (TA.spawnSparks) TA.spawnSparks(x, car.y + 0.6, z, Math.min(8, 2 + closing * 0.3));
  if (car.kind === 'player') { TA.addShake(Math.min(0.6, closing * 0.03)); if (TA.sfx) TA.sfx('crash', Math.min(1, closing / 20)); }
};

TA.damageCar = function (car, amount, by) {
  if (car.dead || car.invincible) return;
  car.hp -= amount;
  if (by === 'player' && car.kind === 'traffic' && car.ai) car.ai.flee = 8;
  if (car.hp <= 0) TA.explodeCar(car, by);
};

TA.explodeCar = function (car, by) {
  if (car.dead) return;
  car.dead = true; car.hp = 0; car.deadT = 0; car.driver = false; car.vx *= 0.3; car.vz *= 0.3; car.siren = false;
  car.mesh.children[0].material = TA.wreckMaterial || (TA.wreckMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2623 }));
  TA.flashBars(car.mesh, 0, false);
  if (TA.spawnExplosion) TA.spawnExplosion(car.x, car.y + 1, car.z, 1 + car.model.len / 6);
  TA.blastDamage(car.x, car.z, 7, 70, car);
  if (TA.onCarDestroyed) TA.onCarDestroyed(car, by);
  if (TA.player && TA.player.car === car) { TA.exitCar(true); TA.damagePlayer(60, null); }
};

// Area damage around an explosion: people, other cars and the player.
TA.blastDamage = function (x, z, radius, dmg, source) {
  TA.cars.forEach(function (c) { if (c !== source && !c.dead) { var d = TA.dist(x, z, c.x, c.z); if (d < radius) TA.damageCar(c, dmg * (1 - d / radius), 'blast'); } });
  TA.people.forEach(function (p) { if (!p.dead) { var d = TA.dist(x, z, p.x, p.z); if (d < radius) TA.damagePerson(p, dmg * (1 - d / radius) * 1.5, 'blast'); } });
  var pl = TA.player;
  if (pl && !pl.car && TA.dist(x, z, pl.x, pl.z) < radius) TA.damagePlayer(dmg * 0.6 * (1 - TA.dist(x, z, pl.x, pl.z) / radius), null);
};

// Car against car: equal-mass push apart with damage to both, heavier models shove lighter ones.
TA.collideCars = function () {
  var cars = TA.cars, n = cars.length;
  for (var i = 0; i < n; i++) {
    var a = cars[i];
    for (var j = i + 1; j < n; j++) {
      var b = cars[j], dx = b.x - a.x, dz = b.z - a.z, rr = a.radius + b.radius + 0.5;
      if (Math.abs(dx) > rr || Math.abs(dz) > rr || Math.abs(a.y - b.y) > 2.5) continue;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d >= rr || d < 0.01) continue;
      var nx = dx / d, nz = dz / d, pen = rr - d, ma = a.model.hp, mb = b.model.hp, ta = mb / (ma + mb), tb = 1 - ta;
      if (a.static) { ta = 0; tb = 1; } if (b.static) { tb = 0; ta = a.static ? 0 : 1; }
      a.x -= nx * pen * ta; a.z -= nz * pen * ta; b.x += nx * pen * tb; b.z += nz * pen * tb;
      var rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rel > 0) {
        a.vx -= nx * rel * ta * 1.2; a.vz -= nz * rel * ta * 1.2; b.vx += nx * rel * tb * 1.2; b.vz += nz * rel * tb * 1.2;
        if (rel > 3) {
          var who = a.kind === 'player' ? 'player' : b.kind === 'player' ? 'player' : null;
          TA.damageCar(a, rel * 0.8 * (a.kind === 'player' ? 0.5 : 1), who); TA.damageCar(b, rel * 0.8 * (b.kind === 'player' ? 0.5 : 1), who);
          if (TA.spawnSparks) TA.spawnSparks(a.x + nx * a.radius, a.y + 0.7, a.z + nz * a.radius, Math.min(8, rel * 0.4));
          if (who) { TA.addShake(Math.min(0.5, rel * 0.025)); if (TA.sfx) TA.sfx('crash', Math.min(1, rel / 18)); if (TA.onPlayerRam) TA.onPlayerRam(a.kind === 'player' ? b : a, rel); }
        }
      }
    }
  }
};

// Steers and throttles a car toward a point using the same physics as the player (police, convoys, rivals).
TA.driveToward = function (car, tx, tz, dt, maxSpeed, brakeDist) {
  var want = TA.headingTo(tx - car.x, tz - car.z), diff = TA.wrapAngle(want - car.h), d = TA.dist(car.x, car.z, tx, tz);
  var steer = TA.clamp(-diff * 2.2, -1, 1), limit = maxSpeed * (Math.abs(diff) > 0.9 ? 0.35 : Math.abs(diff) > 0.4 ? 0.65 : 1);
  if (brakeDist && d < brakeDist) limit = Math.min(limit, maxSpeed * d / brakeDist);
  var throttle = car.speed < limit ? 1 : car.speed > limit + 3 ? -0.6 : 0;
  // stuck against something: back out with opposite lock
  car.stuckT = Math.abs(car.speed) < 1.2 && throttle > 0 ? (car.stuckT || 0) + dt : Math.max(0, (car.stuckT || 0) - dt * 2);
  if (car.stuckT > 1.2) { car.reverseT = 1.1; car.stuckT = 0; }
  if (car.reverseT > 0) { car.reverseT -= dt; throttle = -1; steer = -steer; }
  TA.stepCarPhysics(car, throttle, steer, false, dt);
  return d;
};

// ---- the player's car -----------------------------------------------------
TA.updatePlayerDriving = function (dt) {
  var p = TA.player, car = p.car, ax = TA.axis();
  var handbrake = TA.keyDown('Space');
  car.steerSign = ax.r;
  if (car.boost > 0) car.boost -= dt;
  if (car.dead) { TA.exitCar(true); return; }
  TA.stepCarPhysics(car, ax.f, ax.r, handbrake, dt);
  p.x = car.x; p.z = car.z; p.y = car.y; p.h = car.h;
  var sp = Math.abs(car.speed);
  if (TA.spawnSmoke) {
    if ((car.slip > 3.5 || (handbrake && sp > 8) || car.boost > 0) && !car.air) { TA.emitTyreSmoke(car); }
  }
  if (TA.keyHit('KeyH') && TA.sfx) TA.sfx('horn', 1);
  // stunt ramps launch the car
  if (!car.air && sp > 16) for (var i = 0; i < TA.RAMPS.length; i++) {
    var r = TA.RAMPS[i];
    if (TA.dist(car.x, car.z, r[0], r[1]) < 3.2 && Math.abs(TA.wrapAngle(car.h - r[2])) < 0.8) { TA.launchCar(car, 5 + sp * 0.22); if (TA.onRampJump) TA.onRampJump(i, car); }
  }
};

TA.emitTyreSmoke = function (car) {
  car.smokeT = (car.smokeT || 0) + 1;
  if (car.smokeT % 2) return;
  var fx = Math.sin(car.h), fz = Math.cos(car.h), rx = -fz, rz = fx, back = car.model.len * 0.36, w = car.model.wid * 0.42;
  TA.spawnSmoke(car.x - fx * back + rx * w, car.y + 0.2, car.z - fz * back + rz * w, 0.3, 0xffffff, 0.55, 0.16);
  TA.spawnSmoke(car.x - fx * back - rx * w, car.y + 0.2, car.z - fz * back - rz * w, 0.3, 0xffffff, 0.55, 0.16);
};

// Shared per-step upkeep for every car: wreck timers, damage smoke, light bars.
TA.updateCars = function (dt) {
  TA.collideCars();
  for (var i = TA.cars.length - 1; i >= 0; i--) {
    var c = TA.cars[i];
    if (c.dead) {
      c.deadT += dt;
      if (TA.spawnSmoke && TA.run.frame % 9 === 0 && c.deadT < 14) TA.spawnSmoke(c.x, c.y + 1.4, c.z, 1.6, 0x2b2b2b, 2.2);
      if (TA.spawnFire && TA.run.frame % 7 === 0 && c.deadT < 9) TA.spawnFire(c.x + TA.rr(-0.8, 0.8), c.y + 1, c.z + TA.rr(-0.8, 0.8), 1.1);
      if (c.deadT > 30 && TA.player && TA.dist(c.x, c.z, TA.player.x, TA.player.z) > 60 && !c.keep) TA.removeCar(c);
      else if (Math.abs(c.vx) + Math.abs(c.vz) > 0.05) { c.vx *= 0.9; c.vz *= 0.9; TA.moveCar(c, dt); }
      continue;
    }
    if (c.hp < c.maxHp * 0.4 && TA.spawnSmoke && TA.run.frame % (c.hp < c.maxHp * 0.2 ? 5 : 12) === 0) {
      TA.spawnSmoke(c.x + Math.sin(c.h) * c.model.len * 0.35, c.y + 1.0, c.z + Math.cos(c.h) * c.model.len * 0.35, 0.8, c.hp < c.maxHp * 0.2 ? 0x222222 : 0x9aa0a6, 1.4);
    }
    if (c.mesh.userData.bars.length) TA.flashBars(c.mesh, TA.run.time + c.id * 0.13, c.siren);
    // an empty car that was left rolling coasts to a stop
    if (!c.driver && c.kind !== 'player' && !c.static && (Math.abs(c.vx) + Math.abs(c.vz) > 0.05)) TA.stepCarPhysics(c, 0, 0, true, dt);
  }
};
