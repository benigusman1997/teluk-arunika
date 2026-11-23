// Ten story contracts in three acts: staged objectives, the Bank Arunika job, choices and endings.

function startStoryContract(index) {
  const c = CONTRACTS[index];
  G.contract = { index: index, stage: 0, timer: null, progress: 0, total: 0, items: [], vault: null };
  G.activity = null;
  playCutsceneDialogue(c.intro, () => { showMissionIntroCard(c, index); enterMissionStage(0); });
}

function advanceMissionStage() {
  const stages = contractStages(G.contract.index);
  awardRankPoints(10, 'Stage cleared');
  playUiSound('stage');
  if (G.contract.stage + 1 >= stages.length) { completeContract(); return; }
  enterMissionStage(G.contract.stage + 1);
  showBanner('STAGE ' + (G.contract.stage + 1) + '/' + stages.length, stages[G.contract.stage].title, 2);
}

function runBankArunikaJob(dt) {
  const m = G.contract, stage = m.stage;
  // The crew talks the job through; the vault clock starts when the guards are engaged.
  W.bankTalk = (W.bankTalk || 0) - dt;
  if (W.bankTalk <= 0) {
    W.bankTalk = 9;
    const who = stage <= 1 ? 'agus' : stage <= 4 ? (rand() < 0.6 ? 'agus' : 'budi') : 'sari';
    const crew = CREW.find((c) => c.id === who);
    sayChatter(who, stage === 3 ? 'Drill is at ' + Math.round((m.progress / 10) * 100) + ' percent. Keep them off the door!' : randPick(crew.lines), 5);
  }
  if (stage >= 2 && stage <= 4) {
    if (m.vault === null) m.vault = BANK_STAGES[3].vaultTimer;
    m.vault -= dt;
    if (m.vault <= 0) { failContract('The vault time lock sealed'); return; }
  }
  if (stage >= 2 && G.wanted < 4) raiseWantedLevel(4, 'ARMED ROBBERY');
  if (stage >= 2 && stage <= 4) G.heat = 1;
  if (stage === 5 && !W.mission.van) {
    W.mission.van = spawnCar('getaway', PLACES.bank.x - 8, PLACES.bank.z + 22, Math.PI, 'mission', 0x17181c);
    W.mission.cars.push(W.mission.van);
  }
}

function showEndingDebtCleared(key) {
  G.ending = key;
  G.debt = 0;
  G.mode = 'ending';
  clearWantedLevel(false);
  saveGameToSlot(0);
  showEndingScreen(ENDINGS[key]);
}

function contractStages(index) {
  return CONTRACTS[index].bank ? BANK_STAGES : CONTRACTS[index].stages;
}

function currentStage() {
  return G.contract ? contractStages(G.contract.index)[G.contract.stage] : null;
}

function enterMissionStage(i) {
  const m = G.contract, s = contractStages(m.index)[i];
  clearMissionMarkers();
  m.stage = i; m.progress = 0; m.total = 0; m.items = [];
  m.timer = s.timer || null;
  if (s.wanted) raiseWantedLevel(s.wanted, INCIDENTS[s.wanted]);
  if (s.type === 'enter') {
    let car = W.mission.cars.find((c) => c.model === s.model && !c.wrecked && !c.removed);
    if (!car) { car = spawnCar(s.model, s.at[0], s.at[1], s.heading, 'mission', s.color); car.occupied = false; W.mission.cars.push(car); }
    m.wantModel = s.model;
    addObjectiveMarker(car.x, car.z, 0x4dabf7, car);
  } else if (s.type === 'goto' || s.type === 'hold') {
    addObjectiveMarker(s.at[0], s.at[1], 0xffd43b, null);
  } else if (s.type === 'collect') {
    const points = s.points === 'wrecks' ? W.mission.convoy.map((c) => [c.x + 3, c.z + 3]) : s.points;
    m.items = points.map((p) => ({ x: p[0], z: p[1], taken: false }));
    m.total = m.items.length;
    for (const it of m.items) it.marker = addObjectiveMarker(it.x, it.z, 0x51cf66, null);
  } else if (s.type === 'kill') {
    const at = s.branchAt && G.branch ? s.branchAt[G.branch] : s.at;
    m.total = s.count;
    for (let n = 0; n < s.count; n++) {
      const a = (n / s.count) * 6.28 + 0.4, r = 4 + (n % 3) * 3.5;
      let x = at[0] + Math.cos(a) * r, z = at[1] + Math.sin(a) * r;
      const out = pushOutOfColliders(x, z, 0.6); x = out.x; z = out.z;
      const boss = s.boss && n === 0;
      const e = spawnEnemy(s.look, x, z, boss ? 'rifle' : s.weapon, boss ? s.boss : s.label);
      if (boss) { e.hp = e.maxHp = 320; e.mesh.scale.setScalar(1.12); }
      W.mission.enemies.push(e);
    }
    addObjectiveMarker(at[0], at[1], 0xff5a4d, null);
  } else if (s.type === 'lose') {
    if (G.wanted < s.stars) raiseWantedLevel(s.stars, INCIDENTS[s.stars]);
  } else if (s.type === 'choice') {
    addObjectiveMarker(s.a.at[0], s.a.at[1], 0x51cf66, null).choice = s.a;
    addObjectiveMarker(s.b.at[0], s.b.at[1], 0xe64980, null).choice = s.b;
  } else if (s.type === 'destroy') {
    W.mission.convoy = [];
    m.total = s.count;
    for (let n = 0; n < s.count; n++) {
      const car = spawnCar(s.model, s.at[0] + n * 16, s.at[1] + 2.5, s.heading, 'convoy');
      car.y = groundHeightAt(car.x, car.z);
      car.name = 'CONVOY ' + (n + 1);
      W.mission.convoy.push(car);
      W.mission.cars.push(car);
    }
  }
}

function updateStoryMission(dt) {
  const p = playerPosition();
  if (!G.contract) { offerNextContract(p); return; }
  if (G.dialogue) return;
  const m = G.contract, s = currentStage(), c = CONTRACTS[m.index];
  if (c.bank) { runBankArunikaJob(dt); if (!G.contract) return; }
  if (m.timer !== null) { m.timer -= dt; if (m.timer <= 0) { failContract('Out of time'); return; } }
  const marker = W.markers.find((k) => k.objective);
  if (s.type === 'enter') {
    if (marker && marker.follow) { marker.x = marker.follow.x; marker.z = marker.follow.z; marker.mesh.position.set(marker.x, marker.follow.y, marker.z); if (marker.follow.wrecked) { failContract('The ' + marker.follow.spec.name + ' was destroyed'); return; } }
    if (G.player.car && G.player.car.model === m.wantModel) advanceMissionStage();
  } else if (s.type === 'goto') {
    if (dist2d(p.x, p.z, s.at[0], s.at[1]) < s.r && (!s.car || G.player.car)) advanceMissionStage();
    else if (s.car && !G.player.car && dist2d(p.x, p.z, s.at[0], s.at[1]) < s.r) G.prompt = { text: 'You need a car for this' };
  } else if (s.type === 'hold') {
    if (dist2d(p.x, p.z, s.at[0], s.at[1]) < s.r) {
      m.progress += dt;
      G.prompt = { text: s.label + ' ' + Math.round((m.progress / s.seconds) * 100) + '%', progress: m.progress / s.seconds };
      if (m.progress >= s.seconds) {
        if (s.boom) { spawnExplosion(s.at[0], 2, s.at[1] - 6, 2.2); spawnFireAndSmoke(s.at[0], 2, s.at[1] - 6, 2); }
        advanceMissionStage();
      }
    }
  } else if (s.type === 'collect') {
    for (const it of m.items) {
      if (!it.taken && dist2d(p.x, p.z, it.x, it.z) < (G.player.car ? 4.5 : 2.2)) {
        it.taken = true;
        removeMarker(it.marker);
        playUiSound('pickup');
        spawnFloatingText(it.x, 2.2, it.z, s.label, '#8ce99a');
      }
    }
    if (m.items.every((it) => it.taken)) advanceMissionStage();
  } else if (s.type === 'kill') {
    const alive = W.mission.enemies.filter((e) => e.state !== 'dead' && !e.removed);
    if (alive.length === 0) { W.mission.enemies = []; advanceMissionStage(); }
    else if (marker) { marker.x = alive[0].x; marker.z = alive[0].z; marker.mesh.visible = dist2d(p.x, p.z, alive[0].x, alive[0].z) > 45; marker.mesh.position.set(marker.x, 0, marker.z); }
  } else if (s.type === 'lose') {
    if (G.wanted === 0) advanceMissionStage();
  } else if (s.type === 'choice') {
    for (const k of W.markers) {
      if (k.choice && dist2d(p.x, p.z, k.x, k.z) < 3.2) {
        G.prompt = { text: 'E - ' + k.choice.label };
        if (W.keysHit.KeyE) { applyStoryChoice(k.choice.key); return; }
      }
    }
  } else if (s.type === 'destroy') {
    updateConvoy(dt, s);
    const left = W.mission.convoy.filter((car) => !car.wrecked).length;
    if (left === 0) advanceMissionStage();
    else if (W.mission.convoy.some((car) => !car.wrecked && dist2d(car.x, car.z, s.goal[0], s.goal[1]) < 20)) failContract('The convoy reached the port');
  }
}

function updateConvoy(dt, s) {
  W.mission.convoy.forEach((car, n) => {
    if (car.wrecked) return;
    const lane = FLYOVER.z + 2.6 + (n % 2) * 3;
    const steer = clamp(-angleDiff(Math.atan2(s.goal[0] - car.x, (lane - car.z) * 6), car.heading) * 2, -1, 1);
    car.boost = 1.25;
    driveVehicleWithArcadePhysics(car, 1, steer, false, dt);
    resolveCarAgainstCars(car);
    car.y = groundHeightAt(car.x, car.z);
  });
}

function applyStoryChoice(key) {
  const m = G.contract;
  if (key === 'loyal' || key === 'betray') {
    G.branch = key;
    if (key === 'loyal') { addMoney(-Math.min(G.money, 1000), 'Paid Darma'); G.debt = Math.max(0, G.debt - 4000); changeDistrictStanding('neon', 10); sayChatter('darma', 'Family pays its debts. The detective will be angry - watch the flyover.', 5); }
    else { changeDistrictStanding('pasar', 10); clearWantedLevel(false); sayChatter('dispatch', 'Detective here. You did right. Darma already knows - his men are at the tower.', 5); }
    advanceMissionStage();
  } else {
    m.endingKey = key;
    sayChatter(key === 'free' ? 'amir' : 'darma', key === 'free' ? 'It is over, son. Walk to the water and breathe.' : 'So the seat is yours. The bay will never sleep again.', 5);
    advanceMissionStage();
  }
}

function completeContract() {
  const m = G.contract, c = CONTRACTS[m.index];
  const payout = Math.round(c.payout * (currentRankIndex() >= 4 ? 1.2 : 1));
  addMoney(payout, c.title);
  G.debt = Math.max(0, G.debt - Math.round(c.payout * 0.8));
  G.contractsDone = Math.max(G.contractsDone, m.index + 1);
  awardRankPoints(60 + m.index * 12, 'Contract complete');
  changeDistrictStanding(districtAt(G.player.x, G.player.z).id, 6);
  clearMissionMarkers();
  clearMissionActors();
  const ending = m.endingKey;
  G.contract = null;
  showBanner('CONTRACT COMPLETE', c.title + ' +' + formatMoney(payout), 3.5);
  playUiSound('complete');
  if (m.index === CONTRACTS.length - 1) { showEndingDebtCleared(ending || 'free'); return; }
  if (m.index === 2) showTutorialHint('crew');
  saveGameToSlot(0);
}

function failContract(reason) {
  if (!G.contract) return;
  const c = CONTRACTS[G.contract.index];
  clearMissionMarkers();
  clearMissionActors();
  G.contract = null;
  showBanner('CONTRACT FAILED', reason + ' - return to ' + PLACES[c.start].name, 3.5);
  playUiSound('fail');
}

function offerNextContract(p) {
  if (G.contractsDone >= CONTRACTS.length || G.activity || G.dialogue) return;
  const c = CONTRACTS[G.contractsDone], at = PLACES[c.start];
  if (!W.startBeacon || W.startBeacon.userData.index !== G.contractsDone) {
    if (W.startBeacon) W.scene.remove(W.startBeacon);
    W.startBeacon = makeBeacon(at.x, at.z, 0xffd43b, 2.4);
    W.startBeacon.userData.index = G.contractsDone;
  }
  W.startBeacon.visible = true;
  if (dist2d(p.x, p.z, at.x, at.z) < 4.5 && G.wanted === 0) {
    G.prompt = { text: 'E - START CONTRACT ' + (G.contractsDone + 1) + ': ' + c.title.toUpperCase() };
    if (W.keysHit.KeyE) { W.startBeacon.visible = false; startStoryContract(G.contractsDone); }
  }
}

function jumpToMissionStage(contractIndex, stageIndex) {
  clearMissionMarkers();
  clearMissionActors();
  G.contractsDone = contractIndex;
  G.contract = { index: contractIndex, stage: stageIndex, timer: null, progress: 0, total: 0, items: [], vault: null };
  if (W.startBeacon) W.startBeacon.visible = false;
  enterMissionStage(stageIndex);
}

function addObjectiveMarker(x, z, color, follow) {
  const marker = { x: x, z: z, mesh: makeBeacon(x, z, color, 2.2), objective: true, follow: follow };
  W.markers.push(marker);
  return marker;
}

function removeMarker(marker) {
  W.scene.remove(marker.mesh);
  const i = W.markers.indexOf(marker);
  if (i >= 0) W.markers.splice(i, 1);
}

function clearMissionMarkers() {
  for (const m of W.markers.filter((k) => k.objective)) removeMarker(m);
  W.routeCache = null;
}

function clearMissionActors() {
  for (const e of W.mission.enemies) if (!e.removed) removePerson(e);
  for (const car of W.mission.cars) if (!car.removed && car !== G.player.car) { if (car.kind === 'convoy' || car.wrecked) car.keep = false; else car.kind = 'parked'; }
  W.mission = { enemies: [], cars: [], convoy: [], van: null };
  W.bankTalk = 0;
}

// Everything the mission card shows, for a contract, a side job or free roam.
function missionCardView() {
  if (G.contract) {
    const m = G.contract, c = CONTRACTS[m.index], stages = contractStages(m.index), s = stages[m.stage], next = stages[m.stage + 1];
    const view = { head: 'CONTRACT ' + (m.index + 1) + '/' + CONTRACTS.length, act: ACTS[c.act], stage: 'STAGE ' + (m.stage + 1) + '/' + stages.length, title: s.title, obj: s.obj,
      next: next ? next.title : 'PAYOUT ' + formatMoney(c.payout), line: c.title + ' &middot; ' + formatMoney(c.payout), timer: null, pips: null };
    if (m.vault !== null && m.stage <= 4) view.timer = 'VAULT ' + formatDuration(Math.max(0, m.vault));
    else if (m.timer !== null) view.timer = formatDuration(Math.max(0, m.timer));
    if (s.type === 'kill') view.pips = { label: s.label, total: m.total, left: W.mission.enemies.filter((e) => e.state !== 'dead' && e.state !== 'fall' && !e.removed).length };
    else if (s.type === 'collect') view.pips = { label: s.label, total: m.total, left: m.items.filter((it) => !it.taken).length };
    else if (s.type === 'destroy') view.pips = { label: s.label, total: m.total, left: W.mission.convoy.filter((car) => !car.wrecked).length };
    return view;
  }
  if (G.activity) return activityCardView();
  if (G.contractsDone >= CONTRACTS.length) return { head: 'STORY COMPLETE', act: 'FREE ROAM', stage: 'DAY ' + G.day, title: 'THE BAY IS YOURS', obj: 'Races, fares, wreck contracts and <b>Arunika coins</b> remain', next: '', line: '', timer: null, pips: null };
  const c = CONTRACTS[G.contractsDone];
  return { head: 'CONTRACT ' + (G.contractsDone + 1) + '/' + CONTRACTS.length, act: ACTS[c.act], stage: 'FREE ROAM', title: c.title, obj: 'Go to <b>' + PLACES[c.start].name + '</b> to start the contract',
    next: contractStages(G.contractsDone)[0].title, line: 'DEBT ' + formatMoney(G.debt) + ' &middot; DAY ' + G.day + '/7', timer: null, pips: null };
}

const ENDINGS = {
  free: { title: 'DEBT CLEARED', sub: 'ENDING A - THE WORKSHOP STAYS', text: 'Darma Wijaya leaves the docks in TAPD cuffs. The ledger is ash, the debt is gone, and at dawn Pak Amir opens the workshop shutters like any other day.' },
  boss: { title: 'DEBT CLEARED', sub: 'ENDING B - KING OF THE BAY', text: 'Darma sinks with his book. Raka takes the chair in Wijaya Tower, and every debt in Teluk Arunika is now owed to him.' },
  lost: { title: 'SEVEN DAYS ARE UP', sub: 'THE WORKSHOP IS GONE', text: "Darma's men change the locks on Pak Amir's workshop. Load a save and beat the clock." }
};
