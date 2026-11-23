// Boot, world reset, the fixed-step loop and top-level key routing.
TA.query = function (name) {
  var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return m ? decodeURIComponent(m[1]) : null;
};

// Removes every dynamic entity so a new game, a load or a showcase scene starts from a clean city.
TA.resetWorld = function () {
  TA.run.mission = null; TA.run.activity = null; TA.run.shop = null;
  TA.standDownUnits(); TA.heliStandDown();
  TA.units.slice().forEach(function (u) { TA.removeUnit(u); });
  TA.cars.slice().forEach(function (c) { TA.removeCar(c); });
  TA.people.slice().forEach(function (p) { TA.removePerson(p); });
  TA.pickups.slice().forEach(function (it) { TA.removePickup(it); });
  TA.clearEffects();
  TA.dynamicCover = [];
  var keep = { slot: TA.run.slot, showcase: TA.run.showcase };
  TA.run = TA.newRun(); TA.run.slot = keep.slot; TA.run.showcase = keep.showcase;
  TA.CREW.forEach(function (c) { TA.crewRun[c.id].cd = 0; TA.crewRun[c.id].active = 0; });
};

// Puts Raka in the world from TA.state and fills the streets around him.
TA.enterWorld = function () {
  var s = TA.state;
  TA.resetWorld();
  TA.run.mode = 'playing';
  TA.spawnPlayer(s.px, s.pz, s.ph);
  TA.spawnParkedCars();
  if (!TA.run.showcase) { TA.populateTraffic(s.px, s.pz, 40); TA.populatePedestrians(s.px, s.pz, 12); }
  TA.setWeather(s.weather === 'rain' ? 'rain' : 'clear');
  TA.run.banner = null;
  TA.menu.screen.style.display = 'none';
  TA.snapCamera();
};

TA.newGame = function () {
  TA.state = TA.newState();
  TA.run.slot = 1;
  TA.enterWorld();
  TA.showBanner('TELUK ARUNIKA', 'DAY 1 OF 7 — $50,000 OWED TO DARMA WIJAYA', '#ffd166');
  TA.say('PAK AMIR', 'Raka! Come to the garage. I have a taxi and you have a debt.');
};

TA.continueGame = function (slot) {
  if (!TA.loadGame(slot)) return false;
  TA.enterWorld();
  TA.showBanner('GAME LOADED', (slot ? 'SLOT ' + slot : 'AUTOSAVE') + ' — DAY ' + TA.state.day + ' OF 7', '#4895ef');
  return true;
};

// Hooks called by other systems.
TA.onPersonKilled = function (p, by) {
  if (by !== 'player') return;
  TA.state.stats.kills++;
  if (p.kind === 'thug' || p.kind === 'guard') TA.addRP(4);
};
TA.onCarDestroyed = function (car, by) {
  if (car.kind === 'police' || car.kind === 'swat') { TA.addRP(10); TA.policeSay((car.name || 'Unit') + ' is down! Officer needs assistance!'); }
};
TA.onEnterCar = function (car) {
  if (car.key === 'taxi' && !TA.run.mission && !TA.run.activity) TA.say('sari', 'A taxi? Press F and earn a fare while you are at it.');
};

// One fixed simulation step.
TA.step = function (dt) {
  var r = TA.run, p = TA.player;
  r.time += dt; r.frame++;
  r.prompt = '';
  TA.advanceClock(dt);
  if (p.dead) TA.updatePlayerDead(dt);
  else if (p.car) TA.updatePlayerDriving(dt);
  else TA.updatePlayerOnFoot(dt);
  TA.updateWeapons(dt);
  TA.updateTraffic(dt);
  TA.updateCars(dt);
  TA.updatePedestrians(dt);
  TA.updateGunmen(dt);
  TA.updatePolice(dt);
  TA.updateHeli(dt);
  TA.updateSwat(dt);
  TA.updateMission(dt);
  TA.updateActivities(dt);
  TA.updateCrew(dt);
  TA.updateCareer(dt);
  TA.updateEffects(dt);
  TA.updateCity(dt);
  if (TA.keyHit('KeyV')) TA.setWeather(TA.state.weather === 'rain' ? 'clear' : 'rain');
  if (r.frame % 3600 === 0) TA.autosave();
  TA.endInputStep();
};

// Runs n steps without rendering; used by the self-test and the showcase scenes.
TA.simulate = function (n) {
  for (var i = 0; i < n && TA.run.mode === 'playing'; i++) TA.step(TA.CFG.STEP);
  return TA.run.frame;
};

TA.onKey = function (code, e) {
  if (TA.run.showcase) return;
  if (TA.run.mode !== 'playing') { if (TA.menuKey(code) && e) e.preventDefault(); return; }
  if (code === 'KeyM') TA.openMap(0, false);
  else if (code === 'KeyP' || code === 'Escape') TA.openMap(0, true);
};

TA.frame = function (now) {
  requestAnimationFrame(TA.frame);
  var r = TA.run, dt = Math.min(0.1, (now - TA.lastNow) / 1000 || 0);
  TA.lastNow = now;
  if (r.showcase && r.frozen) return;
  if (r.mode === 'playing') {
    TA.acc += dt * r.slowmo;
    var n = 0;
    while (TA.acc >= TA.CFG.STEP && n++ < 5) { TA.step(TA.CFG.STEP); TA.acc -= TA.CFG.STEP; if (TA.run.mode !== 'playing') break; }
    if (n >= 5) TA.acc = 0;
  } else { r.time += dt; TA.endInputStep(); }
  TA.updateAudio(dt);
  TA.updateSky();
  TA.updateCamera(dt);
  TA.updateHud(dt);
  if (!TA.noRender) TA.render();
};

TA.boot = function () {
  var scene = +TA.query('scene') || 0, seed = +TA.query('seed') || 20261123;
  TA.noRender = TA.query('test') === '1';
  TA.seedRandom(seed);
  TA.state = TA.newState();
  TA.run = TA.newRun();
  TA.initRenderer();
  TA.buildCity();
  TA.buildTrafficLamps();
  TA.initAirUnit();
  TA.initEffects();
  TA.buildActivities();
  TA.buildMapCanvas();
  TA.initHud();
  TA.initMenus();
  TA.initInput(TA.renderer.domElement);
  TA.acc = 0; TA.lastNow = performance.now();
  window.__booted = true;
  if (scene >= 1 && scene <= 4) TA.runShowcase(scene, seed);
  requestAnimationFrame(TA.frame);
};

window.addEventListener('load', TA.boot);
