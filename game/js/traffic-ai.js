// traffic-ai.js — ambient cars on lanes, traffic lights, honking, fleeing.
var TA = window.TA || (window.TA = {});
function spawnTrafficCars(n) {
  var kinds = ['sedan', 'sedan', 'gt', 'taxi', 'truck', 'angkot', 'komet', 'sedan', 'taxi', 'angkot'];
  for (var i = 0; i < n; i++) {
    var car = TA.spawnVehicle(kinds[i % kinds.length], 0, 0, 0, i % 5 === 4 ? 'parked' : 'traffic');
    placeTrafficCarOnLane(car, null);
  }
}
function driveTrafficAlongLanes(dt) {
  var S = TA.S, P = TA.player, greenX = (S.time % 20) < 10;
  for (var i = 0; i < TA.cars.length; i++) {
    var c = TA.cars[i]; if (c.role !== 'traffic' || c.dead) continue;
    var a = c.ai, pos = a.axis === 'x' ? c.x : c.z, want = 11;
    if (TA.dist(c, P) > 340 && S.mode === 'playing') { placeTrafficCarOnLane(c, P); continue; }
    var next = Math.round((pos + a.dir * 50) / 100) * 100, gap = (next - pos) * a.dir;
    var red = a.axis === 'x' ? !greenX : greenX;
    if (red && gap > 11 && gap < 22) want = 0;
    for (var j = 0; j < TA.cars.length; j++) {
      var o = TA.cars[j]; if (o === c) continue;
      var dx = o.x - c.x, dz = o.z - c.z, f = dx * Math.sin(c.h) + dz * Math.cos(c.h), s = Math.abs(dx * Math.cos(c.h) - dz * Math.sin(c.h));
      if (f > 0 && f < 10 + c.cfg.len && s < 2.2) { want = 0; if (o.role === 'player') { a.honk = (a.honk || 0) + dt; if (a.honk > 1.5) { TA.playHorn(); a.honk = 0; } } }
    }
    if (TA.danger && S.time - TA.danger.t < 6 && TA.dist(c, TA.danger) < 60) want = want ? 22 : 0;
    c.v += TA.clamp(want - c.v, -18 * dt, 7 * dt);
    var np = pos + a.dir * c.v * dt;
    if (Math.floor((pos - a.dir * 3.2 + 50) / 100) !== Math.floor((np - a.dir * 3.2 + 50) / 100) && TA.rnd() < 0.35 && Math.abs(next) < 400 && Math.abs(a.line) < 400) {
      var nd = TA.rnd() < 0.5 ? 1 : -1, old = a.line; a.line = Math.round(np / 100) * 100; a.axis = a.axis === 'x' ? 'z' : 'x'; a.dir = nd; np = old + nd * 4;
    }
    if (Math.abs(np) > 440) { a.dir = -a.dir; np = pos; }
    setTrafficPose(c, np);
  }
}
function updateTrafficLights() {
  var greenX = (TA.S.time % 20) < 10;
  TA.lightMats[0].color.setHex(greenX ? 0x2bff6a : 0xff3030); TA.lightMats[1].color.setHex(greenX ? 0xff3030 : 0x2bff6a);
}
function placeTrafficCarOnLane(car, near) {
  var R = TA.CFG.ROADS, tries = 0, p;
  do {
    car.ai = { axis: TA.rnd() < 0.5 ? 'x' : 'z', line: TA.pick(R), dir: TA.rnd() < 0.5 ? 1 : -1 };
    p = near ? (car.ai.axis === 'x' ? near.x : near.z) + (TA.rnd() < 0.5 ? -1 : 1) * (150 + TA.rnd() * 150) : -420 + TA.rnd() * 840;
    p = TA.clamp(p, -430, 430); setTrafficPose(car, p);
  } while (++tries < 8 && near && (TA.dist(car, near) < 140 || TA.dist(car, near) > 330));
  car.v = car.role === 'parked' ? 0 : 9;
  if (car.role === 'parked') { var off = car.ai.axis === 'x' ? 'z' : 'x'; car[off] += (car[off] > car.ai.line ? 1 : -1) * 2.2; car.mesh.position.set(car.x, 0, car.z); }
}
function setTrafficPose(c, p) {
  var a = c.ai;
  if (a.axis === 'x') { c.x = p; c.z = a.line - 3.3 * a.dir; c.h = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  else { c.z = p; c.x = a.line + 3.3 * a.dir; c.h = a.dir > 0 ? 0 : Math.PI; }
  c.vh = c.h; c.mesh.position.set(c.x, 0, c.z); c.mesh.rotation.y = c.h;
}
TA.spawnTrafficCars = spawnTrafficCars; TA.driveTrafficAlongLanes = driveTrafficAlongLanes; TA.updateTrafficLights = updateTrafficLights; TA.setTrafficPose = setTrafficPose;
