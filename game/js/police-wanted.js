// police-wanted.js — wanted stars, heat, line of sight, dispatch units and roles, pursuing cruisers.
var TA = window.TA || (window.TA = {});
function raiseWantedLevel(amount, reason) {
  var S = TA.S, before = S.wanted;
  S.heat = Math.min(5.6, S.heat + amount); S.wanted = Math.min(5, Math.floor(S.heat));
  S.lastCrime = reason; S.seenT = 0; S.searching = false;
  if (S.wanted > before) { TA.notify('WANTED LEVEL ' + S.wanted + ' — ' + reason); TA.showTutorialHint('wanted'); }
}
function dispatchPoliceUnits(dt) {
  var S = TA.S, P = TA.player, want = [0, 1, 2, 3, 3, 4][S.wanted], units = TA.cars.filter(function (c) { return c.role === 'police'; });
  TA.dispatchT = (TA.dispatchT || 0) - dt;
  if (units.length < want && TA.dispatchT <= 0) {
    TA.dispatchT = 2.5;
    var R = TA.CFG.ROADS, line = R[0], axisX = TA.rnd() < 0.5, pv = axisX ? P.z : P.x, pa = axisX ? P.x : P.z;
    R.forEach(function (r) { if (Math.abs(r - pv) < Math.abs(line - pv)) line = r; });
    var along = TA.clamp(pa + (TA.rnd() < 0.5 ? -1 : 1) * (120 + TA.rnd() * 60), -430, 430);
    var c = TA.spawnVehicle('cruiser', axisX ? along : line, axisX ? line : along, 0, 'police');
    c.unit = TA.CFG.ROLES[units.length % 3]; c.h = c.vh = Math.atan2(P.x - c.x, P.z - c.z); c.v = 15; TA.playSiren(true);
  }
  if (S.wanted === 0) {
    units.forEach(function (c) { if (TA.dist(c, P) > 70) TA.removeVehicle(c); else { c.role = 'parked'; c.v = 0; } });
    TA.people.forEach(function (p) { if ((p.kind === 'cop' || p.kind === 'swat') && !p.dead && TA.dist(p, P) > 40) { p.dead = true; p.deadT = -99; } });
    TA.playSiren(false);
  }
}
function pursueWithPitAndRamming(dt) {
  var P = TA.player, T = P.car || P, tv = P.car ? P.car.v : 0;
  for (var i = 0; i < TA.cars.length; i++) {
    var c = TA.cars[i]; if (c.role !== 'police' || c.dead) continue;
    var side = c.unit === 'PIT UNIT' ? 2.4 : c.unit === 'RAMMER' ? 0 : -2.4, lead = c.unit === 'INTERCEPTOR' ? 1.0 : 0.3;
    var tx = T.x + Math.sin(T.h) * tv * lead + Math.cos(T.h) * side, tz = T.z + Math.cos(T.h) * tv * lead - Math.sin(T.h) * side;
    var d = TA.dist(c, T), des = Math.atan2(tx - c.x, tz - c.z), top = c.cfg.top / 3.6 * (d < 12 && !P.car ? 0 : 1);
    c.back = (c.back || 0) - dt;
    if (c.back > 0) { c.v += (-6 - c.v) * Math.min(1, 4 * dt); c.h += 1.2 * dt; }
    else { c.h += TA.clamp(TA.angDiff(des, c.h), -2.2 * dt, 2.2 * dt); c.v += TA.clamp(top - c.v, -30 * dt, c.cfg.acc * dt); }
    c.vh = c.h;
    var nx = c.x + Math.sin(c.h) * c.v * dt, nz = c.z + Math.cos(c.h) * c.v * dt;
    if (TA.blocked(nx, nz, 1.2)) { if (c.back <= 0) c.back = 0.9; c.v *= 0.5; } else { c.x = nx; c.z = nz; }
    if (!P.car && d < 14 && !c.deployed) {
      c.deployed = true;
      for (var k = 0; k < 2; k++) TA.spawnPerson('cop', c.x + 2.5 * (k ? 1 : -1), c.z + 1, { shirt: 0x1b2a5c, pants: 0x141c38, hat: 0x101833, hp: 70, gun: true, bar: true, barColor: 0x4dabf7 });
    }
    if (d > 300) { TA.removeVehicle(c); i--; continue; }
    TA.poseVehicleMesh(c, dt, 0);
  }
}
function escapeByBreakingLineOfSight(dt) {
  var S = TA.S, P = TA.player; if (S.wanted === 0) { S.heat = Math.max(0, S.heat - dt * 0.02); return; }
  var seen = false, eyes = TA.cars.filter(function (c) { return c.role === 'police' || c.role === 'block'; }).concat(TA.people.filter(function (p) { return (p.kind === 'cop' || p.kind === 'swat') && !p.dead; }));
  if (TA.heli && !(P.z < -285 && P.z > -315)) eyes.push({ x: TA.heli.position.x, z: TA.heli.position.z, air: true });
  for (var i = 0; i < eyes.length && !seen; i++) {
    var e = eyes[i], d = TA.dist(e, P); if (d > 115) continue;
    seen = true;
    if (!e.air) for (var k = 1; k < 8; k++) if (TA.blocked(e.x + (P.x - e.x) * k / 8, e.z + (P.z - e.z) * k / 8, 0)) { seen = false; break; }
  }
  if (seen) { S.seenT = 0; S.searching = false; }
  else {
    S.seenT += dt; S.searching = S.seenT > 2.5;
    if (S.seenT > (S.rankPts >= 3200 ? 9 : 13)) { S.heat = 0; S.wanted = 0; S.searching = false; TA.notify('YOU LOST THE POLICE'); TA.awardRankPoints(40); TA.advanceMissionStage('escape'); }
  }
}
function bustPlayerIfCornered(dt) {
  var S = TA.S, P = TA.player; if (S.wanted === 0 || S.wanted > 2 || (P.car && Math.abs(P.car.v) > 2)) { TA.bustT = 0; return; }
  var near = TA.people.some(function (p) { return p.kind === 'cop' && !p.dead && TA.dist(p, P) < 2.5; });
  TA.bustT = near ? (TA.bustT || 0) + dt : 0;
  if (TA.bustT > 2.5) { S.stats.busted++; TA.respawnAtSafehouse('BUSTED', 0.15); }
}
TA.raiseWantedLevel = raiseWantedLevel; TA.dispatchPoliceUnits = dispatchPoliceUnits; TA.pursueWithPitAndRamming = pursueWithPitAndRamming;
TA.escapeByBreakingLineOfSight = escapeByBreakingLineOfSight; TA.bustPlayerIfCornered = bustPlayerIfCornered;
