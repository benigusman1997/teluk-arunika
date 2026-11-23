// showcase-scenes.js — four deterministic showcase states (?shot=1..4) staged only from the real game systems.
var TA = window.TA || (window.TA = {});
function stageShowcaseScene(n) {
  var S = TA.S; TA.resetRandomSeed(7 + n); S.mode = 'playing'; S.showcase = n; S.time = 12.3; S.money = 18450; S.rankPts = 1240; S.day = 4;
  S.crew = ['sari', 'bima', 'tono']; S.cooldown.sari = 22; S.owned = [true, true, true, true, true, true]; S.ammo = [Infinity, 48, 132, 14, 86, 2]; S.done = [0, 1, 2, 3]; S.hints = { start: 1, drive: 1, wanted: 1, combat: 1, crew: 1 };
  TA.hideScreens(); TA.camSnap = true;
  if (n === 1) stageCoastChase(); else if (n === 2) stageMarketCarjack(); else if (n === 3) stageBankShootout(); else stageTitleAndSaves();
}
function stageCoastChase() {
  var S = TA.S, P = TA.player; clearAround(-60, 400, 160);
  var car = TA.spawnVehicle('gt', -60, 396.7, Math.PI / 2, 'parked', 0xff5a36); TA.enterOrExitVehicle(car); car.v = 37.2; car.slip = 0; P.x = car.x; P.z = car.z;
  S.contract = 4; S.stage = 1; S.heat = 4.4; S.wanted = 4; S.lastCrime = 'ARMED ROBBERY · EVADING ARREST';
  [[-54.2, 402.9, 'PIT UNIT', 36], [-45, 403.6, 'INTERCEPTOR', 38], [-33, 396.6, 'RAMMER', 35]].forEach(function (u) { var c = TA.spawnVehicle('cruiser', u[0], u[1], Math.PI / 2 + (u[1] > 400 ? 0.06 : 0), 'police'); c.unit = u[2]; c.v = u[3]; });
  TA.placeRoadblockAhead(72);
  TA.flyHelicopterWithSearchlight(0); TA.heli.position.set(-24, 12.5, 390.5); TA.heli.rotation.y = -2.2; TA.flyHelicopterWithSearchlight(0, true);
  TA.notify('WANTED LEVEL 4 — ELANG-1 IS OVERHEAD'); S.subtitle = 'TONO: "Roadblock on the boulevard — cut through the beach!"'; S.subT = 99;
}
function stageMarketCarjack() {
  var S = TA.S, P = TA.player; clearAround(-100, 240, 90);
  var car = TA.spawnVehicle('sedan', -103.3, 247, Math.PI, 'traffic', 0x3f88c5); car.ai = { axis: 'z', line: -100, dir: -1 };
  P.x = -100.6; P.z = 248.2; P.h = -Math.PI / 2; TA.camYaw = Math.PI + 0.5; TA.camPitch = 0.26; P.mesh.rotation.y = P.h; P.mesh.position.set(P.x, 0.24, P.z);
  P.mesh.userData.arms[1].rotation.x = -1.3; P.gun.visible = false;
  var door = TA.box(0.08, 0.7, 1.1, 0x3f88c5, 1.5, 0.95, 0.5); door.rotation.y = 0.9; car.mesh.add(door);
  var d = TA.spawnPerson('driver', -98.3, 245.2, { shirt: 0xffa94d, pants: 0x5c4a3a }); d.mesh.rotation.set(0.75, 0.9, 0); d.mesh.position.y = 0.2; TA.say(d, '"HEI! ITU MOBIL SAYA!"');
  TA.jack = { car: car, t: 0.6 }; S.prompt = 'HOLD E — STEALING ARUNIKA SEDAN  ◔ 66%'; S.contract = 0; S.stage = 0; S.heat = 1.3; S.wanted = 1; S.lastCrime = 'GRAND THEFT AUTO'; S.done = [];
  var shirts = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xf783ac, 0xffffff, 0xb197fc, 0xff922b];
  for (var i = 0; i < 22; i++) {
    var side = i % 3 === 2 ? (i % 2 ? -3 : 3) : (i % 2 ? -8.3 : 8.3), p = TA.spawnPerson('ped', -100 + side, 239 - i * 1.55 - (i % 4), { shirt: shirts[i % 8], pants: i % 2 ? 0x3b4252 : 0x6b4f3a, hat: i % 5 === 0 ? 0xf2e6c9 : null });
    p.h = i % 3 === 2 ? Math.PI / 2 : (i % 2 ? 0.2 : Math.PI - 0.3); if (i % 5 < 2) { p.mark.visible = true; p.h = Math.PI + (i % 2 ? 0.5 : -0.5); TA.animatePerson(p.mesh, 1.2 + i, 1); } else TA.animatePerson(p.mesh, i, 0.5);
    p.mesh.rotation.y = p.h;
  }
  [[-108.4, 234], [-91.8, 236]].forEach(function (c) { var o = TA.spawnPerson('cop', c[0], c[1], { shirt: 0x1b2a5c, pants: 0x141c38, hat: 0x101833, hp: 70, bar: true, barColor: 0x4dabf7 }); o.mesh.rotation.y = 0; o.mesh.add(TA.box(0.08, 0.08, 0.7, 0x111111, 0.45, 0.9, 0.3)); });
  [['angkot', -96.7, 226, 0], ['taxi', -103.3, 214, Math.PI], ['komet', -97.2, 240, 0], ['komet', -102.6, 229, Math.PI]].forEach(function (v) { var c = TA.spawnVehicle(v[0], v[1], v[2], v[3], 'parked'); c.v = 9; });
}
function stageBankShootout() {
  var S = TA.S, P = TA.player; clearAround(150, 280, 90);
  S.contract = 7; S.stage = 1; S.done = [0, 1, 2, 3, 4, 5, 6]; S.weapon = 4; S.hp = 71; S.armor = 40; S.kills = 2;
  P.x = 147.2; P.z = 283.3; P.h = Math.PI + 0.1; TA.camYaw = Math.PI + 0.1; TA.camPitch = 0.24; P.mesh.position.set(P.x, 0.24, P.z); P.mesh.rotation.y = P.h; TA.aimAndSprint({ aim: true });
  var guards = TA.runBankArunikaJob(5, 150, 276); S.heat = 5.2; S.wanted = 5; S.lastCrime = 'ARMED ROBBERY — BANK ARUNIKA';
  TA.hurtPerson(guards[1], 45); TA.hurtPerson(guards[3], 25); TA.hurtPerson(guards[0], 200); guards[0].mesh.position.y = 0.75;
  TA.deploySwatVanAndOfficers(0, { x: 139, z: 267.5, h: Math.PI / 2 });
  var k = 0; TA.people.forEach(function (p) { if (p.kind === 'swat') { p.x = 135.5 + k * 2.2; p.z = 272.5 + (k % 2) * 1.5; p.h = 1.9; p.mesh.position.set(p.x, 0.24, p.z); p.mesh.rotation.y = p.h; k++; } });
  TA.spawnVehicle('getaway', 155, 262.6, Math.PI / 2, 'parked');
  S.wanted = 5; TA.flyHelicopterWithSearchlight(0); TA.heli.position.set(151, 9.5, 263); TA.heli.rotation.y = 2.6; TA.flyHelicopterWithSearchlight(0, true);
  var g = guards[2], mx = P.x - 0.5, mz = P.z - 1.35;
  TA.spawnTracer(mx, 1.6, mz, g.x, 1.5, g.z, 999); TA.spawnTracer(mx, 1.6, mz, guards[3].x + 0.5, 1.7, guards[3].z, 999); TA.spawnMuzzleFlash(mx, 1.6, mz - 0.2, 999).scale.setScalar(1.7);
  TA.spawnTracer(guards[4].x, 1.6, guards[4].z + 1, P.x + 2.2, 1.9, P.z + 1, 999); TA.spawnMuzzleFlash(guards[4].x, 1.6, guards[4].z + 1, 999);
  TA.openWeaponWheel(true); TA.hitMarkT = 99; S.subtitle = 'SARI: "Vault open in 41 seconds — hold the plaza!"'; S.subT = 99; TA.notify('BADAK-2 SWAT DEPLOYED');
}
function stageTitleAndSaves() {
  var P = TA.player; P.x = 150; P.z = 396; P.mesh.position.set(P.x, 0.24, P.z);
  try { localStorage.setItem('teluk-arunika-slot-auto', JSON.stringify({ savedAt: 'DAY 4 · 7/10 · $31,900' })); localStorage.setItem('teluk-arunika-slot-1', JSON.stringify({ savedAt: 'DAY 2 · 3/10 · $9,250' })); localStorage.setItem('teluk-arunika-slot-2', JSON.stringify({ savedAt: 'DAY 6 · 9/10 · $47,300' })); } catch (e) { P.h = 0; }
  TA.S.showcase = 4; TA.showTitleScreen();
}
function clearAround(x, z, r) {
  TA.cars.slice().forEach(function (c) { if (Math.hypot(c.x - x, c.z - z) < r) TA.removeVehicle(c); });
  TA.people = TA.people.filter(function (p) { if (Math.hypot(p.x - x, p.z - z) < r) { TA.scene.remove(p.mesh); return false; } return true; });
}
TA.stageShowcaseScene = stageShowcaseScene;
