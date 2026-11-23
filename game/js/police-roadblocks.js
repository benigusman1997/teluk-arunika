// police-roadblocks.js — roadblocks across the player's road and spike strips in front of them.
var TA = window.TA || (window.TA = {});
function placeRoadblockAhead(dist) {
  var P = TA.player, T = P.car || P, axisX = Math.abs(Math.sin(T.h)) > Math.abs(Math.cos(T.h)), dir = axisX ? Math.sign(Math.sin(T.h)) : Math.sign(Math.cos(T.h));
  var R = TA.CFG.ROADS, pv = axisX ? T.z : T.x, line = R[0]; R.forEach(function (r) { if (Math.abs(r - pv) < Math.abs(line - pv)) line = r; });
  var along = TA.clamp((axisX ? T.x : T.z) + dir * (dist || 130), -425, 425), rb = { axisX: axisX, line: line, along: along, dir: dir, t: 0, parts: [], cars: [] };
  for (var s = -1; s <= 1; s += 2) {
    var cx = axisX ? along : line + s * 3.6, cz = axisX ? line + s * 3.6 : along;
    var c = TA.spawnVehicle('cruiser', cx, cz, (axisX ? 0 : Math.PI / 2) + s * 0.25, 'block'); c.unit = 'ROADBLOCK'; rb.cars.push(c);
    var o = TA.spawnPerson('cop', cx - (axisX ? dir * 3 : 0), cz - (axisX ? 0 : dir * 3), { shirt: 0x1b2a5c, pants: 0x141c38, hat: 0x101833, hp: 70, gun: true, bar: true, barColor: 0x4dabf7 });
    o.h = Math.atan2(T.x - o.x, T.z - o.z);
  }
  for (var k = -3; k <= 3; k++) {
    var bx = axisX ? along - dir * 5 : line + k * 2.1, bz = axisX ? line + k * 2.1 : along - dir * 5;
    var b = TA.box(axisX ? 0.4 : 1.8, 1, axisX ? 1.8 : 0.4, k % 2 ? 0xff3b30 : 0xffffff, bx, 0.6, bz); TA.scene.add(b); rb.parts.push(b);
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), TA.mat(0xff7a00)); cone.position.set(axisX ? along - dir * 8 : line + k * 2.1, 0.4, axisX ? line + k * 2.1 : along - dir * 8); TA.scene.add(cone); rb.parts.push(cone);
  }
  deploySpikeStrips(rb);
  TA.roadblocks.push(rb); TA.notify('ROADBLOCK AHEAD'); return rb;
}
function deploySpikeStrips(rb) {
  var a = rb.along - rb.dir * 16, m = TA.box(rb.axisX ? 0.9 : 13, 0.08, rb.axisX ? 13 : 0.9, 0x25262b, rb.axisX ? a : rb.line, 0.1, rb.axisX ? rb.line : a);
  m.castShadow = false; TA.scene.add(m); rb.parts.push(m); rb.spike = a;
  for (var k = -6; k <= 6; k++) { var t = TA.glow(0.12, 0.16, 0.12, 0xdde3ea, rb.axisX ? a : rb.line + k, 0.2, rb.axisX ? rb.line + k : a); TA.scene.add(t); rb.parts.push(t); }
}
function updateRoadblocks(dt) {
  var S = TA.S, car = TA.player.car;
  TA.blockT = (TA.blockT || 0) + dt;
  if (S.wanted >= 3 && car && Math.abs(car.v) > 12 && TA.blockT > 22 && TA.roadblocks.length < 2) { TA.blockT = 0; placeRoadblockAhead(); }
  for (var i = TA.roadblocks.length - 1; i >= 0; i--) {
    var rb = TA.roadblocks[i]; rb.t += dt;
    if (car && car.tyres) {
      var al = rb.axisX ? car.x : car.z, la = rb.axisX ? car.z : car.x;
      if (Math.abs(al - rb.spike) < 1.4 && Math.abs(la - rb.line) < 6.5) { car.tyres = false; TA.notify('TYRES SHREDDED BY SPIKE STRIP'); TA.spawnSparks(car.x, 0.3, car.z); }
    }
    if (rb.t > 45 || S.wanted === 0) {
      rb.parts.forEach(function (m) { TA.scene.remove(m); }); rb.cars.forEach(function (c) { if (c.role === 'block') TA.removeVehicle(c); });
      TA.roadblocks.splice(i, 1);
    }
  }
}
TA.placeRoadblockAhead = placeRoadblockAhead; TA.deploySpikeStrips = deploySpikeStrips; TA.updateRoadblocks = updateRoadblocks;
