// Four deterministic showcase scenes for the screenshots. Each one seeds the RNG, stages real game
// entities with the real systems, runs a fixed number of real simulation steps, then freezes.
// Opened with ?scene=1..4&seed=N. Nothing here draws anything by hand: it is the game, paused.
TA.showcaseState = function (done) {
  var s = TA.newState();
  s.missionsDone = done; s.day = 5; s.clock = 15 * 60 + 42; s.money = 18420; s.debt = 23650; s.rp = 520;
  s.crew = { sari: true, budi: true, agus: true };
  s.owned = [true, true, true, true, true, true];
  s.ammo = [{ mag: 0, res: 0 }, { mag: 12, res: 84 }, { mag: 30, res: 210 }, { mag: 6, res: 42 }, { mag: 30, res: 180 }, { mag: 5, res: 25 }];
  s.weapon = 4; s.armour = 64; s.health = 82;
  s.standing = { pelabuhan: 72, pasar: 58, neon: 34, pantai: 46, tol: 22, abu: 8 };
  s.coins = [0, 2, 3, 5, 8]; s.ramps = [0, 3]; s.bestRace = [48.6, 61.2, 0]; s.wrecks = 2; s.exports = 4; s.fares = 9;
  s.upgrades = { engine: 2, plating: 1 }; s.branch = 'pay';
  s.stats = { kills: 41, carsStolen: 23, distance: 61800, busted: 2, wasted: 3, starsEscaped: 37, shots: 912, playMinutes: 164, earned: 44070 };
  return s;
};

TA.sceneStart = function (done, x, z, h) {
  var s = TA.showcaseState(done);
  s.px = x; s.pz = z; s.ph = h;
  TA.state = s;
  TA.enterWorld();
  TA.run.godMode = true;
  TA.input.auto = { hit: {} };
  return TA.player;
};

// Runs n real steps, moving the camera with them so it trails the action naturally.
TA.sceneRun = function (n, each) {
  for (var i = 0; i < n; i++) {
    if (each) each(i);
    TA.step(TA.CFG.STEP);
    TA.updateCamera(TA.CFG.STEP);
  }
};

TA.sceneCruiser = function (x, z, h, role, speed) {
  var u = TA.spawnCruiser(x, z, h, role);
  u.car.vx = Math.sin(h) * speed; u.car.vz = Math.cos(h) * speed; u.car.speed = speed;
  return u;
};

TA.scenePeds = function (list) {
  list.forEach(function (q, i) {
    var p = TA.spawnPerson('ped', q[0], q[1], TA.randomLook(TA.rand));
    var n = TA.nearestNode(q[0], q[1]);
    p.h = q[2] === undefined ? TA.rand() * 6.28 : q[2];
    p.corner = { i: n.i, j: n.j, sx: q[0] > n.x ? 1 : -1, sz: q[1] > n.z ? 1 : -1 }; p.prev = null; p.jit = { x: 0, z: 0 }; p.speed = 1.3;
    p.state = i % 4 === 3 ? 'idle' : 'walk'; p.timer = 30;
  });
};

// Scene 1 (cover): Contract 7, stage 7/7. Coral Pelabuhan GT flat out, westbound on Pantai Boulevard.
TA.scene1 = function () {
  var W = -Math.PI / 2, p = TA.sceneStart(6, 196, 212.6, W), k;
  TA.populateTraffic(p.x, p.z, 60); TA.populatePedestrians(p.x, p.z, 10);
  TA.cars.slice().forEach(function (c) { if (c.kind === 'traffic' && Math.abs(c.z - 210) < 9 && c.x < p.x + 20 && c.x > p.x - 150) TA.removeCar(c); });
  var car = TA.spawnCar('gt', p.x, p.z, W, 'parked', 0xff6f61);
  car.name = 'PELABUHAN GT'; car.owned = true; car.hp = car.maxHp * 0.71;
  TA.enterCar(car, false);
  car.vx = -37; car.vz = 0; car.speed = 37;
  TA.startMission(6, 6);
  TA.run.heat = 1; TA.run.inSight = true;
  // the pursuit: one cruiser ramming alongside, one boxing in ahead, one closing from behind, a wreck waiting to blow
  TA.sceneCruiser(p.x - 12, 208.0, W, 'RAMMING', 39);
  TA.sceneCruiser(p.x - 24, 211.2, W, 'BOX-IN', 38);
  TA.sceneCruiser(p.x - 15, 217.0, W, 'PIT', 39);
  var wreck = TA.sceneCruiser(p.x - 84, 205.6, W + 0.5, 'BLOCKADE', 4);
  TA.cam.offset = 0.3; TA.cam.hold = true;
  TA.spawnSwatVan(p.x - 150, 207.5, Math.PI / 2);
  TA.deployHeli(p.x - 62, 214); TA.heli.y = 21;
  // boulevard life: oncoming traffic in the far lane, people on the promenade
  [['angkot', -58, 205.6], ['taxi', -122, 207.4], ['sedan', -150, 213.2], ['komet', -176, 205.2]].forEach(function (t) {
    var c = TA.spawnCar(t[0], p.x + t[1], t[2], t[2] < 210 ? Math.PI / 2 : W, 'parked'); c.static = true;
  });
  TA.scenePeds([[p.x - 34, 221.5, 1.2], [p.x - 41, 222.4, -1.4], [p.x - 52, 221.2], [p.x - 66, 222.6, 1.6], [p.x - 78, 221.4], [p.x - 30, 198.6, 1.5], [p.x - 46, 198.2], [p.x - 61, 199, -1.5], [p.x - 84, 198.4], [p.x - 96, 222]]);
  TA.input.auto.KeyW = true;
  TA.useAbility('sari');
  TA.sceneRun(64, function (i) {
    if (i === 34) TA.explodeCar(wreck.car, 'player');
    if (i === 40) TA.say('sari', 'Gaspol! ELANG-1 is right on top of us — cut through the port!');
    if (i === 50) TA.policeSay('CAMAR 12: suspect westbound on Pantai Boulevard, 150 plus!');
  });
  TA.run.bannerT = 0;
};

// Scene 2: Pasar Senja on foot, two stars, a foot chase starting, a car to steal.
TA.scene2 = function () {
  var N = Math.PI, p = TA.sceneStart(1, -230.7, -67.4, N), i;
  TA.state.weapon = p.weapon = 1;
  TA.populateTraffic(p.x, p.z, 40);
  TA.startMission(1, 0);
  var sedan = TA.spawnCar('sedan', -233.9, -71.4, N, 'parked', 0x5fd3d3); sedan.keep = true;
  TA.scenePeds([[-230.4, -74.5, 0], [-229.8, -78, 3.1], [-231.2, -84], [-230, -88, 0.4], [-231.4, -92], [-229.9, -96, 3], [-230.8, -100], [-230.2, -104, 0.2], [-249, -70, 3.1], [-250.2, -76], [-249.4, -82, 0], [-250, -88], [-229.5, -71.2, 2], [-249.2, -95], [-250.4, -101]]);
  TA.run.incident = 'DISTURBANCE';
  TA.setWanted(2);
  TA.spawnFootPatrol(-230.6, -81); TA.spawnFootPatrol(-232.2, -85.5);
  TA.sceneCruiser(-243, -124, 0, 'PURSUIT', 9);
  TA.cam.yaw = N + 0.2; TA.cam.pitch = 0.13;
  TA.sceneRun(26, function (k) { if (k === 4) TA.say('agus', 'Two on foot behind the stalls. Take the sedan, I will loop the cameras.'); });
  TA.run.bannerT = 0;
};

// Scene 3: Contract 7, stage 3/7. The plaza of Bank Arunika, weapon wheel open.
TA.scene3 = function () {
  var A = Math.PI - 0.1, p = TA.sceneStart(6, 46, -16.5, A), g, i;
  TA.populateTraffic(p.x, p.z, 70);
  var van = TA.spawnCar('van', 51.4, -21.6, Math.PI / 2, 'parked', 0x1b1b1f); van.owned = true; van.keep = true; van.name = 'GETAWAY VAN';
  TA.dynamicCover.push({ x: van.x, z: van.z + 3 });
  TA.startMission(6, 2);
  var foes = TA.run.mission.foes;
  [8, 3, 0].forEach(function (k) { TA.damagePerson(foes[k], 999, 'player'); });
  var burn = TA.spawnCar('sedan', 37, -40, 0.6, 'parked', 0xffc857);
  TA.setWanted(4);
  var badak = TA.spawnSwatVan(17, -37, Math.PI / 2); badak.car.vx = 7; badak.car.speed = 7;
  TA.sceneCruiser(8, 3.4, Math.PI / 2, 'FLANKING', 12);
  TA.deployHeli(52, -58); TA.heli.y = 26;
  TA.cam.yaw = A; TA.cam.pitch = 0.17;
  TA.sceneRun(46, function (k) {
    if (k === 6) TA.say('agus', 'Vault timer is running. Keep them off the door, Raka!');
    if (k === 24) TA.explodeCar(burn, 'player');
    if (k === 34) TA.input.auto.Tab = true;
  });
  // the frozen frame catches the guards mid-volley
  foes.forEach(function (f, k) {
    if (f.dead || k % 2) return;
    var h = TA.headingTo(p.x - f.x, p.z - f.z);
    TA.fireShot(f, f.x + Math.sin(h) * 0.6, f.y + 1.4, f.z + Math.cos(h) * 0.6, h + (k - 3) * 0.02, TA.WEAPONS[f.weapon], 'guard');
  });
  TA.fireShot(p, p.x + Math.sin(p.h) * 0.7, p.y + 1.4, p.z + Math.cos(p.h) * 0.7, p.h, TA.WEAPONS[4], 'player');
  TA.run.bannerT = 3;
};

// Scene 4: the full map screen in the middle of Contract 7, with three save slots written.
TA.scene4 = function () {
  var p = TA.sceneStart(6, 118, -6, Math.PI / 2);
  TA.populateTraffic(p.x, p.z, 40);
  TA.startMission(6, 5);
  TA.sceneCruiser(40, 4, Math.PI / 2, 'PURSUIT', 10); TA.sceneCruiser(124, -84, 0, 'INTERCEPT', 10);
  TA.sceneRun(12);
  [[1, 3, 4, 9200, 880, 41350], [2, 4, 5, 12740, 1310, 36900], [3, 6, 5, 18420, 520, 23650]].forEach(function (d) {
    var keep = TA.state, tmp = TA.showcaseState(d[1]);
    tmp.day = d[2]; tmp.money = d[3]; tmp.rp = d[4] === 520 ? 520 : Math.round(d[4] / 4); tmp.debt = d[5]; tmp.px = p.x; tmp.pz = p.z;
    TA.state = tmp; var pl = TA.player; TA.player = null; TA.saveGame(d[0]); TA.player = pl; TA.state = keep;
  });
  TA.run.slot = 3;
  TA.openMap(0, false);
};

TA.runShowcase = function (n, seed) {
  TA.run.showcase = n;
  TA.seedRandom(seed);
  for (var i = 0; i <= 3; i++) TA.deleteSlot(i);
  TA['scene' + n]();
  TA.run.showcase = n;
  TA.updateSky();
  TA.updateHud(0, true);
  TA.render();
  TA.run.frozen = true;
  window.__sceneReady = { scene: n, seed: seed, frame: TA.run.frame, kmh: TA.player.car ? Math.round(Math.abs(TA.player.car.speed) * 3.6) : 0, wanted: TA.run.wanted, units: TA.units.length };
};
