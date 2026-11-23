// car-theft.js — entering, exiting, the carjack sequence, alarms.
var TA = window.TA || (window.TA = {});
function stealNearestCar() {
  var P = TA.player, best = null, bd = 4.2;
  TA.cars.forEach(function (c) { var d = TA.dist(c, P); if (!c.dead && d < bd) { bd = d; best = c; } });
  if (!best) return null;
  if (best.role === 'traffic' || best.role === 'police') { TA.jack = { car: best, t: 0 }; best.v = 0; best.role = 'jacked'; }
  else enterOrExitVehicle(best);
  return best;
}
function pullDriverOut(dt) {
  var J = TA.jack; if (!J) return;
  J.t += dt; TA.S.prompt = 'HOLD E — STEALING ' + J.car.cfg.name;
  if (J.t >= 0.9) {
    var c = J.car, sx = c.x + Math.cos(c.h) * 2.6, sz = c.z - Math.sin(c.h) * 2.6;
    var d = TA.spawnPerson('driver', sx, sz, { shirt: 0xffa94d, pants: 0x5c4a3a }); d.panic = 7; d.h = c.h + Math.PI / 2; d.ai = null;
    TA.say(d, TA.pick(['"HEI! ITU MOBIL SAYA!"', '"TOLONG! MALING!"', '"JANGAN, BANG!"']));
    TA.danger = { x: c.x, z: c.z, t: TA.S.time }; TA.playAlarm();
    TA.raiseWantedLevel(0.7, 'GRAND THEFT AUTO'); TA.jack = null; TA.S.prompt = '';
    enterOrExitVehicle(c);
  }
}
function enterOrExitVehicle(car) {
  var P = TA.player, S = TA.S;
  if (P.car) {
    var c = P.car; if (Math.abs(c.v) > 9) return;
    c.role = 'parked'; c.v = 0; P.car = null; P.x = c.x + Math.cos(c.h) * 2.2; P.z = c.z - Math.sin(c.h) * 2.2; P.h = c.h; P.mesh.visible = true;
    TA.camYaw = c.h; return;
  }
  if (!car) return;
  if (!car.owned) { car.owned = true; S.stats.stolen++; TA.awardRankPoints(10); }
  car.role = 'player'; P.car = car; P.mesh.visible = false; car.vh = car.h;
  TA.showTutorialHint('drive'); TA.advanceMissionStage('steal', car);
}
TA.stealNearestCar = stealNearestCar; TA.pullDriverOut = pullDriverOut; TA.enterOrExitVehicle = enterOrExitVehicle;
