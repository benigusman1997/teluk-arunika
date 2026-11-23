// side-activities.js — street races, taxi fares, wreck contracts, Arunika coins, gun shop and respray.
var TA = window.TA || (window.TA = {});
function startStreetRace() {
  var P = TA.player; if (!P.car || TA.S.activity) return;
  var pts = [[P.car.x > 0 ? -300 : 300, 400], [P.car.x > 0 ? -300 : 300, -100], [0, -100]];
  TA.S.activity = { type: 'race', pts: pts, i: 0, t: 0, par: 75, label: 'STREET RACE' }; TA.notify('STREET RACE — 3 CHECKPOINTS, PAR 75 s');
}
function runTaxiFare() {
  var P = TA.player; if (!P.car || P.car.kind !== 'taxi' || TA.S.activity) { TA.notify('TAXI FARES NEED A TAKSI KUNING'); return; }
  var R = TA.CFG.ROADS, x = TA.pick(R), z = TA.pick(R);
  TA.S.activity = { type: 'taxi', pts: [[x, z]], i: 0, t: 0, par: 60, label: 'TAXI FARE', pay: 150 + Math.round(Math.hypot(x - P.x, z - P.z)) };
  TA.notify('FARE ACCEPTED — DROP OFF IN 60 s');
}
function startWreckContract() {
  if (TA.S.activity) return;
  TA.S.activity = { type: 'wreck', need: 3, got: 0, t: 0, par: 120, label: 'WRECK CONTRACT' }; TA.notify('WRECK CONTRACT — DESTROY 3 VEHICLES IN 120 s');
}
function collectArunikaCoin(dt) {
  var P = TA.player, T = P.car || P;
  for (var i = TA.coins.length - 1; i >= 0; i--) {
    var c = TA.coins[i]; c.rotation.y += dt * 3;
    if (Math.hypot(c.position.x - T.x, c.position.z - T.z) < 2.4) { TA.scene.remove(c); TA.coins.splice(i, 1); TA.S.money += 50; TA.S.stats.coins++; TA.playCash(); TA.notify('ARUNIKA COIN ' + TA.S.stats.coins + '/30  +$50'); }
  }
}
function createCoinsAndShops() {
  TA.coins = []; var g = new THREE.CylinderGeometry(0.7, 0.7, 0.14, 14); g.rotateX(Math.PI / 2);
  for (var i = 0; i < 30; i++) { var m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffd400 })); m.position.set(TA.pick(TA.CFG.ROADS) + 50, 1.2, -420 + TA.rnd() * 840); if (TA.blocked(m.position.x, m.position.z, 1)) m.position.x -= 50; TA.scene.add(m); TA.coins.push(m); }
}
function updateSideActivities(dt) {
  var S = TA.S, A = S.activity, P = TA.player, T = P.car || P; collectArunikaCoin(dt);
  var L = TA.landmarks; S.near = Math.hypot(T.x - L.gunshop.x, T.z - L.gunshop.z) < 8 ? 'gunshop' : Math.hypot(T.x - L.respray.x, T.z - L.respray.z) < 8 ? 'respray' : null;
  if (!A) return; A.t += dt;
  if (A.type !== 'wreck') {
    var p = A.pts[A.i]; if (S.stage < 0 || true) S.actTarget = p;
    if (Math.hypot(T.x - p[0], T.z - p[1]) < 9) { A.i++; TA.playCash(); if (A.i >= A.pts.length) { finishActivity(true); return; } }
  }
  if (A.t > A.par) finishActivity(false);
}
function finishActivity(ok) {
  var S = TA.S, A = S.activity, pay = A.type === 'race' ? 900 : A.type === 'taxi' ? A.pay : 1200; S.activity = null; S.actTarget = null;
  if (!ok) { TA.notify(A.label + ' FAILED'); return; }
  S.money += pay; TA.awardRankPoints(60); if (A.type === 'race') S.stats.races++; if (A.type === 'taxi') S.stats.fares++;
  TA.bigWord = { text: A.label + ' COMPLETE  +$' + pay, t: 3 };
}
function useNearbyShop() {
  var S = TA.S;
  if (S.near === 'respray' && TA.player.car) { var cost = S.rankPts >= 1800 ? 200 : 350; if (S.money < cost) return TA.notify('RESPRAY COSTS $' + cost); S.money -= cost; S.heat = 0; S.wanted = 0; TA.player.car.hp = 100; TA.player.car.tyres = true; TA.notify('RESPRAYED — POLICE LOST YOUR PLATES'); }
  if (S.near === 'gunshop') { var n = S.owned.indexOf(false), price = n < 0 ? 200 : n * 600; if (S.money < price) return TA.notify('KELO ARMS: NEED $' + price); S.money -= price; if (n >= 0) { S.owned[n] = true; S.weapon = n; } for (var i = 1; i < 6; i++) if (S.owned[i]) S.ammo[i] = TA.CFG.WEAPONS[i].ammo; TA.notify('KELO ARMS: ' + (n >= 0 ? TA.CFG.WEAPONS[n].name + ' BOUGHT' : 'AMMO REFILLED')); }
}
TA.startStreetRace = startStreetRace; TA.runTaxiFare = runTaxiFare; TA.startWreckContract = startWreckContract; TA.collectArunikaCoin = collectArunikaCoin;
TA.createCoinsAndShops = createCoinsAndShops; TA.updateSideActivities = updateSideActivities; TA.useNearbyShop = useNearbyShop;
TA.noteWreckForContract = function () { var A = TA.S.activity; if (A && A.type === 'wreck' && ++A.got >= A.need) finishActivity(true); };
