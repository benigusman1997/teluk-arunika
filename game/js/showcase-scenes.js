// Four staged showcase scenes (?shot=1..4): real entities placed in the real city, a few real steps, then frozen.

function stageShowcaseScene(number) {
  G.mode = 'playing';
  G.settings = Object.assign({}, DEFAULT_SETTINGS);
  if (number === 1) stageCoastChase();
  else if (number === 2) stageMarketCarjack();
  else if (number === 3) stageBankShootout();
  else stageTitleWithSaves();
  W.cam.snap = true;
  updateActiveCamera(FIXED_STEP);
  W.frozen = true;
}

function setShowcaseCareer(day, money, contractsDone, rp, playHours) {
  G.day = day; G.money = money; G.contractsDone = contractsDone; G.rp = rp; G.playTime = playHours * 3600;
  G.debt = Math.round(50000 - CONTRACTS.slice(0, contractsDone).reduce((sum, c) => sum + c.payout * 0.8, 0));
  for (const c of CREW) G.crew[c.id].recruited = contractsDone >= 3;
  G.weapons.forEach((w, i) => { w.owned = i <= Math.min(5, 1 + Math.floor(contractsDone / 2) + (contractsDone >= 6 ? 1 : 0)); if (w.owned) w.reserve = WEAPONS[i].reserve; });
  for (const id of Object.keys(G.hintsDone)) delete G.hintsDone[id];
  for (const h of TUTORIAL_HINTS) G.hintsDone[h.id] = contractsDone >= 3;
  G.standing.pantai = 44; G.standing.neon = 38; G.standing.pasar = 30;
}

function runShowcaseSteps(count) {
  W.dispatchTimer = 999; W.heliDelay = 999; W.swatDelay = 999; W.crewTalk = 999; W.bankTalk = 999; W.radioTimer = 0.01;
  for (let i = 0; i < count; i++) { G.frame++; stepPlaying(FIXED_STEP * G.timeScale); updateActiveCamera(FIXED_STEP); W.keysHit = {}; W.mouse.leftHit = false; }
}

function stageCoastChase() {
  const z = 270, x = -52, west = -Math.PI / 2;
  setShowcaseCareer(5, 18420, 6, 520, 3.4);
  G.clock = 17 * 60 + 5; applyTimeOfDay(G.clock);
  G.armour = 62; G.health = 81; G.weaponIndex = 4; G.cameraMode = 'lookback'; G.radioStation = 0;
  populateStreets();
  for (const car of W.cars.slice()) if (Math.abs(car.z - z) < 14 && car.x > x - 140 && car.x < x + 130) removeCar(car);
  const gt = spawnCar('gt', x, z + 3.2, west, 'parked', 0xff6f61);
  G.player.x = gt.x; G.player.z = gt.z;
  enterOrExitVehicle(gt);
  gt.speed = 36.5; gt.steer = 0.12; gt.slip = 1.4;
  jumpToMissionStage(6, 6);
  G.wanted = 4; G.incident = INCIDENTS[4]; G.heat = 1; G.inSight = true;
  // BLOKIR 03 waits ahead; the one behind has just been rammed through.
  buildRoadblockAt(x - 240, z, -1, 0);
  const smashed = buildRoadblockAt(x + 62, z, -1, 0);
  smashed.unit.gone = true; smashed.passed = true;
  smashed.barriers.forEach((b, i) => { smashBarrier(b, -9 - i * 3, (i - 1) * 5); b.vy = 7 + i; });
  smashed.cars[0].heading += 1.1; smashed.cars[0].x -= 5; smashed.cars[0].z -= 2;
  explodeCar(smashed.cars[0], 'player');
  spawnExplosion(x + 58, 1.2, z + 1, 1.5);
  const spots = [[5.7, -0.5, 35.5], [9.6, 7.2, 35], [15.5, -2.4, 34.5], [43, 2.5, 31]];
  for (const s of spots) { const u = addCruiserUnit(x + s[0], z + s[1], west); u.car.speed = s[2]; u.car.steer = (s[1] - 3) * 0.02; }
  const heli = spawnHelicopter(x + 53, z + 8, 13);
  heli.heading = west; heli.vx = -34;
  // Street life around the chase: oncoming taxi and scooter, people on both pavements, some diving.
  const taxi = spawnTrafficCarOnEdge(14, 19, 0.74, 'taxi'), scooter = spawnTrafficCarOnEdge(14, 19, 0.9, 'komet');
  if (taxi) taxi.ai.lane = 7.6;
  if (scooter) scooter.ai.lane = 3.0;
  for (let i = 0; i < 16; i++) {
    const south = i % 2 === 0, px = x - 2 + i * 3.4 + randRange(-1, 1), pz = south ? z + 13.2 + randRange(0, 2.6) : z - 12.6 - randRange(0, 2);
    const ped = spawnPerson('ped', px, pz, randomPedLook());
    ped.node = nearestWalkNode(px, pz); ped.heading = randRange(0, 6.28);
    if (i % 3 === 0) { ped.state = 'panic'; ped.panic = 6; ped.alert = true; ped.fromX = px; ped.fromZ = z; }
    if (i === 5 || i === 8) { ped.state = 'dive'; ped.t = 0.1; ped.alert = true; ped.vx = 0; ped.vz = south ? 4 : -4; ped.heading = south ? 0 : Math.PI; }
  }
  G.crew.sari.active = 4.2; G.crew.budi.cooldown = 21; G.crew.agus.cooldown = 0;
  W.keys.KeyW = true;
  runShowcaseSteps(14);
  for (let i = 0; i < 5; i++) { spawnTyreSmoke(gt); updateVisualEffects(FIXED_STEP * 2); }
  W.keys.KeyW = false;
  sayChatter('sari', CREW[0].lines[0], 99);
  G.banner = null;
}

function stageMarketCarjack() {
  const x = -240, north = Math.PI;
  setShowcaseCareer(1, 1150, 1, 70, 0.4);
  G.clock = 11 * 60 + 40; applyTimeOfDay(G.clock);
  G.health = 100; G.weaponIndex = 1; rebuildPlayerMesh();
  populateStreets();
  for (const car of W.cars.slice()) if (Math.abs(car.x - x) < 9 && car.z > 30 && car.z < 110) removeCar(car);
  jumpToMissionStage(1, 0);
  const sedan = spawnCar('sedan', x - 2.1, 68, north, 'traffic', 0x7fd8be);
  sedan.ai = { from: nearestNodeIndex(x, 120), to: nearestNodeIndex(x, 0), lane: 2.1, pace: 1, flee: 0, shoved: 3, wait: 0 };
  const door = carDoorPoint(sedan);
  const p = G.player;
  p.x = door.x + 0.1; p.z = door.z + 0.5; p.heading = Math.atan2(sedan.x - p.x, sedan.z - p.z);
  G.camYaw = north + 0.16; G.camPitch = 0.2;
  p.carjack = { car: sedan, t: CARJACK_SECONDS * 0.5 };
  // Market traffic and a crowd; several have seen the carjacking.
  const bus = spawnTrafficCarOnEdge(nearestNodeIndex(x, 0), nearestNodeIndex(x, 120), 0.36, 'angkot'), taxi = spawnTrafficCarOnEdge(nearestNodeIndex(x, 120), nearestNodeIndex(x, 0), 0.7, 'taxi');
  if (bus) bus.ai.shoved = 2;
  if (taxi) taxi.ai.shoved = 2;
  spawnCar('komet', x + 5.6, 58, 0.2, 'parked'); spawnCar('komet', x - 6.2, 50, north, 'parked', 0x1c7ed6);
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, px = x + side * randRange(6.6, 8.6), pz = 76 - i * 2.9 + randRange(-1, 1);
    const ped = spawnPerson('ped', px, pz, randomPedLook());
    ped.node = nearestWalkNode(px, pz); ped.heading = side > 0 ? north : 0;
    if (i % 3 !== 1) { ped.state = 'panic'; ped.panic = 7; ped.alert = true; ped.fromX = sedan.x; ped.fromZ = sedan.z; ped.heading = Math.atan2(px - sedan.x, pz - sedan.z); }
  }
  G.wanted = 2; G.incident = INCIDENTS[2]; G.heat = 0.8; G.inSight = true;
  const a = addFootPatrolUnit(x + 5.2, 47), b = addFootPatrolUnit(x - 5.6, 39);
  a.person.phase = 1.2; b.person.phase = 4;
  addCruiserUnit(x + 2.1, -24, 0).car.speed = 9;
  W.keys.KeyE = true;
  runShowcaseSteps(9);
  W.keys.KeyE = false;
  G.hint = { id: 'steal', text: TUTORIAL_HINTS[1].text, t: 99 };
  const intro = CONTRACTS[1].intro;
  G.dialogue = { lines: intro, index: 0, face: intro[0][0], text: intro[0][1], t: 0, onDone: null };
  G.banner = null;
}

function stageBankShootout() {
  setShowcaseCareer(5, 18420, 6, 520, 3.4);
  G.clock = 16 * 60 + 10; applyTimeOfDay(G.clock);
  G.armour = 74; G.health = 88; G.weaponIndex = 4; rebuildPlayerMesh();
  populateStreets();
  for (const car of W.cars.slice()) if (car.x > -6 && car.x < 60 && car.z > -100 && car.z < -20) removeCar(car);
  for (const ped of W.people.slice()) if (ped.x > -4 && ped.x < 60 && ped.z > -100 && ped.z < -20) removePerson(ped);
  const p = G.player;
  p.x = 14.6; p.z = -63.2; p.heading = Math.PI / 2; p.crouch = true;
  G.camYaw = Math.PI / 2; G.camPitch = -0.2; W.cam.pull = 3;
  const van = spawnCar('getaway', 17.6, -67.4, 0.12, 'mission', 0x17181c);
  van.occupied = false; van.keep = true;
  W.mission.cars.push(van);
  jumpToMissionStage(6, 2);
  G.contract.vault = 149;
  // Nine guards were on the plaza: five are down already, one is falling right now, three fight on.
  const guards = W.mission.enemies;
  const alive = [[31, -65.8, 'shoot'], [34.5, -60.8, 'cover'], [38.5, -57.6, 'shoot']];
  guards.forEach((g, i) => {
    if (i < 3) { g.x = alive[i][0]; g.z = alive[i][1]; g.state = alive[i][2]; g.burst = 3; g.cool = 0.4 + i * 0.3; g.wait = 9; g.hp = i === 1 ? 70 : 38 + i * 9; g.heading = Math.atan2(p.x - g.x, p.z - g.z); }
    else if (i === 3) { g.x = 25.5; g.z = -62.6; g.heading = Math.atan2(p.x - g.x, p.z - g.z); g.hp = 20; }
    else { g.x = 33 + (i - 4) * 3.1; g.z = i % 2 ? -70.5 - (i - 4) : -56.5 + (i - 4) * 0.7; g.hp = 0; g.state = 'dead'; g.hostile = false; g.heading = i * 1.3; }
    updatePersonMesh(g);
  });
  G.wanted = 4; G.incident = INCIDENTS[4]; G.heat = 1; G.inSight = true;
  const swat = spawnSwatVan(31, -54.2, Math.PI / 2 + 0.25);
  deploySwatOfficers(swat);
  swat.officers.forEach((o, i) => { o.x = 26.2 + i * 1.4; o.z = -55.6 - i * 1.3; o.state = i === 1 ? 'shoot' : 'advance'; o.goX = o.x - 3; o.goZ = o.z - 3; o.burst = 2; o.cool = 0.5; o.wait = 9; o.heading = Math.atan2(p.x - o.x, p.z - o.z); updatePersonMesh(o); });
  const cruiser = addCruiserUnit(42, -50, 2.5);
  cruiser.dismounted = true;
  addCruiserUnit(4.2, -84, 0.3).car.speed = 6;
  const heli = spawnHelicopter(72, -51, 32);
  heli.heading = -2.2;
  spawnExplosion(45.5, 0.6, -46.5, 0.9);
  W.mouse.left = true; p.aiming = true; W.mouse.right = true;
  runShowcaseSteps(16);
  W.mouse.left = false;
  damagePerson(guards[3], 60, true, { y: guards[3].y + 1.5, head: false });
  runShowcaseSteps(5);
  W.keys.Tab = true;
  runShowcaseSteps(2);
  W.wheelHover = 4;
  G.weapons[4].mag = 30; G.weapons[4].reserve = 180; G.reloading = 0;
  sayChatter('agus', CREW[2].lines[0], 99);
  showBanner('SWAT ARUNIKA DEPLOYED', '', 99);
}

function stageTitleWithSaves() {
  // Three real saves written through the real save code, oldest first.
  setShowcaseCareer(3, 6150, 3, 190, 1.2); G.clock = 9 * 60; saveGameToSlot(1);
  setShowcaseCareer(4, 11900, 5, 430, 2.6); G.clock = 14 * 60; saveGameToSlot(2);
  setShowcaseCareer(5, 18420, 6, 520, 3.4); G.clock = 17 * 60; saveGameToSlot(0);
  G.clock = 17 * 60 + 25; applyTimeOfDay(G.clock);
  G.player.x = 20; G.player.z = 150;
  populateStreets();
  for (let i = 0; i < 10; i++) { const a = 15 + (i % 5), b = a + 5; spawnTrafficCarOnEdge(i % 2 ? b : a, i % 2 ? a : b, 0.1 + i * 0.085, randPick(TRAFFIC_MIX)); }
  const heli = spawnHelicopter(-70, 150, 62);
  heli.heading = 1.2;
  aimSearchlight(heli, -40, 0, 190, 0);
  showTitleScreen();
  for (let i = 0; i < 40; i++) { G.frame++; G.time += FIXED_STEP; stepStreetLife(FIXED_STEP); updateAllCars(FIXED_STEP); }
  W.cam.orbit = 0.2;
}
