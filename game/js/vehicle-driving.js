// vehicle-driving.js — player car physics, handbrake drift, collisions, damage and condition; the shared vehicle spawner.
var TA = window.TA || (window.TA = {});
function driveVehicleWithArcadePhysics(car, inp, dt) {
  var cfg = car.cfg, top = cfg.top / 3.6 * (car.tyres ? 1 : 0.45) * (0.55 + 0.45 * car.hp / 100);
  if (inp.fwd > 0) car.v += cfg.acc * (1 - Math.max(0, car.v) / top) * dt;
  else if (inp.fwd < 0) car.v -= (car.v > 0 ? 34 : 9) * dt;
  else car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 4 * dt);
  car.v = TA.clamp(car.v, -11, top);
  var steer = inp.turn * (1.9 - Math.min(1, Math.abs(car.v) / 60) * 0.9) * TA.clamp(car.v / 7, -1, 1);
  car.h += steer * dt;
  applyHandbrakeDrift(car, inp, dt);
  var nx = car.x + Math.sin(car.vh) * car.v * dt, nz = car.z + Math.cos(car.vh) * car.v * dt;
  if (TA.blocked(nx, nz, 1.3)) { damageVehicleOnCollision(car, Math.abs(car.v) * 0.9); car.v *= -0.3; TA.spawnSparks(nx, 0.8, nz); }
  else { car.x = nx; car.z = nz; }
  collideWithOtherCars(car);
  TA.S.stats.km += Math.abs(car.v) * dt / 1000;
  poseVehicleMesh(car, dt, steer);
}
function applyHandbrakeDrift(car, inp, dt) {
  var grip = (inp.brake ? 1.4 : 7) * car.cfg.grip;
  if (inp.brake) car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 14 * dt);
  car.vh += TA.angDiff(car.h, car.vh) * Math.min(1, grip * dt);
  car.slip = TA.angDiff(car.h, car.vh);
  if (Math.abs(car.slip) > 0.22 && Math.abs(car.v) > 9) { TA.spawnTyreSmoke(car.x - Math.sin(car.h) * 1.6, car.z - Math.cos(car.h) * 1.6); TA.playSkid(); }
}
function damageVehicleOnCollision(car, amount) {
  if (amount < 4 || car.dead) return;
  car.hp -= amount * 0.7; TA.playCrash();
  if (car.hp <= 0) {
    car.dead = true; car.v = 0; TA.spawnExplosion(car.x, 1, car.z); TA.danger = { x: car.x, z: car.z, t: TA.S.time };
    car.mesh.traverse(function (m) { if (m.isMesh && m.material.isMeshLambertMaterial) m.material = TA.mat(0x2a2623); });
    if (car.role === 'player') { TA.enterOrExitVehicleForced(); TA.hurtPlayer(45); }
    if (car.role === 'police') TA.awardRankPoints(25);
    car.role = 'wreck'; TA.S.stats.wrecks++; TA.noteWreckForContract(car);
  }
}
function collideWithOtherCars(car) {
  for (var i = 0; i < TA.cars.length; i++) {
    var o = TA.cars[i]; if (o === car) continue;
    var dx = o.x - car.x, dz = o.z - car.z, d = Math.hypot(dx, dz), min = (car.cfg.len + o.cfg.len) * 0.3;
    if (d < min && d > 0.01) {
      var push = (min - d) / d, rel = Math.abs(car.v - o.v * Math.cos(TA.angDiff(car.h, o.h)));
      car.x -= dx * push * 0.5; car.z -= dz * push * 0.5; o.x += dx * push * 0.5; o.z += dz * push * 0.5; o.mesh.position.set(o.x, 0, o.z);
      if (rel > 5) { damageVehicleOnCollision(car, rel * 0.5); damageVehicleOnCollision(o, rel * 0.6); TA.spawnSparks((car.x + o.x) / 2, 0.8, (car.z + o.z) / 2); car.v *= 0.6; if (o.role === 'traffic' && car.role === 'player') TA.raiseWantedLevel(0.25, 'RECKLESS DRIVING'); }
    }
  }
}
function poseVehicleMesh(car, dt, steer) {
  car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.h; car.mesh.rotation.z = TA.clamp(-(steer || 0) * car.v * 0.004 - car.slip * 0.15, -0.12, 0.12);
  var w = car.mesh.userData.wheels; for (var i = 0; i < w.length; i++) w[i].rotation.x += car.v * dt / 0.36;
  if (car.mesh.userData.bar) { var on = Math.floor(TA.S.time * 6) % 2; car.mesh.userData.bar[0].visible = !!on; car.mesh.userData.bar[1].visible = !on; }
}
function spawnVehicle(kind, x, z, h, role, color) {
  var cfg = TA.CFG.CARS[kind];
  var mesh = kind === 'cruiser' ? TA.makePoliceCruiserMesh() : kind === 'swat' ? TA.makeSwatVanMesh() : TA.makeCarMesh(kind, color === undefined ? TA.pick(cfg.colors) : color);
  var car = { kind: kind, cfg: cfg, mesh: mesh, x: x, z: z, h: h, vh: h, v: 0, slip: 0, hp: 100, tyres: true, role: role };
  mesh.position.set(x, 0, z); mesh.rotation.y = h; TA.scene.add(mesh); TA.cars.push(car); return car;
}
function removeVehicle(car) { TA.scene.remove(car.mesh); var i = TA.cars.indexOf(car); if (i >= 0) TA.cars.splice(i, 1); }
TA.driveVehicleWithArcadePhysics = driveVehicleWithArcadePhysics; TA.applyHandbrakeDrift = applyHandbrakeDrift; TA.damageVehicleOnCollision = damageVehicleOnCollision;
TA.poseVehicleMesh = poseVehicleMesh; TA.spawnVehicle = spawnVehicle; TA.removeVehicle = removeVehicle;
TA.enterOrExitVehicleForced = function () { var c = TA.player.car; if (c) { c.v = 0; TA.enterOrExitVehicle(); } };
