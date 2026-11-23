// Side jobs and services: street races, taxi fares, wreck contracts, coins, stunt ramps, shops, export.

function startStreetRace(index) {
  const race = RACES[index], car = G.player.car;
  car.x = race.start[0]; car.z = race.start[1]; car.heading = race.heading; car.speed = 0; car.slip = 0;
  const rivals = [];
  for (let n = 0; n < 3; n++) {
    const rx = -Math.cos(race.heading), rz = Math.sin(race.heading);
    const rival = spawnCar(n === 1 ? 'sedan' : 'gt', car.x + rx * (n - 1) * 3.4 - Math.sin(race.heading) * (6 + n * 5), car.z + rz * (n - 1) * 3.4 - Math.cos(race.heading) * (6 + n * 5), race.heading, 'rival');
    rival.name = RIVAL_NAMES[n]; rival.keep = true;
    rival.race = { next: 0, lap: 0, pace: 0.86 + n * 0.05, done: false };
    rivals.push(rival);
  }
  G.activity = { type: 'race', index: index, next: 0, lap: 0, time: -3, rivals: rivals, finished: 0, marker: makeBeacon(race.points[0][0], race.points[0][1], 0xf783ac, 5) };
  showBanner(race.name, 'Three, two, one...', 3);
  W.cam.snap = true;
}

function runTaxiFare(dt) {
  const a = G.activity, p = playerPosition();
  if (!G.player.car || G.player.car.model !== 'taxi') { endActivity(false, 'You left the taxi'); return; }
  a.timer -= dt;
  if (a.timer <= 0) { endActivity(false, 'The fare gave up waiting'); return; }
  if (dist2d(p.x, p.z, a.x, a.z) < 7 && Math.abs(p.speed) < 3) {
    if (a.phase === 'pickup') {
      const options = W.nodes.filter((n) => !n.ramp && dist2d(n.x, n.z, p.x, p.z) > 200);
      const to = randPick(options);
      a.phase = 'drop'; a.x = to.x + 6; a.z = to.z + 6; a.fare = Math.round(60 + dist2d(p.x, p.z, to.x, to.z) * 0.7); a.timer = 40 + dist2d(p.x, p.z, to.x, to.z) / 9;
      a.marker.position.set(a.x, 0, a.z);
      sayChatter('amir', 'Passenger is in. ' + streetNameAt(a.x, a.z) + ', and mind the paint.', 4);
    } else {
      const tip = Math.round(a.timer * 2);
      addMoney(a.fare + tip, 'Taxi fare');
      G.stats.fares++;
      awardRankPoints(8, 'Fare delivered');
      changeDistrictStanding(districtAt(p.x, p.z).id, 2);
      endActivity(true, 'Fare ' + formatMoney(a.fare) + ' + tip ' + formatMoney(tip));
    }
  }
}

function startWreckContract(index) {
  const t = WRECK_TARGETS[index], node = nearestNodeIndex(t.at[0], t.at[1]);
  const car = spawnTrafficCarOnEdge(node, W.nodes[node].links[0], 0.5, t.model) || spawnCar(t.model, t.at[0], t.at[1], 0, 'traffic', t.color);
  if (!car.ai) car.ai = { from: node, to: W.nodes[node].links[0], lane: 2.1, pace: 1, flee: 0, shoved: 0, wait: 0 };
  car.ai.pace = 1.5; car.ai.flee = 9999; car.keep = true; car.name = t.name; car.hp = car.spec.hp * 1.6;
  G.activity = { type: 'wreck', index: index, car: car, timer: 150, marker: makeBeacon(car.x, car.z, 0xe03131, 2) };
  showBanner('WRECK CONTRACT', t.name + ' - bounty ' + formatMoney(t.bounty), 3);
}

function collectArunikaCoin(index) {
  G.coins[index] = true;
  W.coinMeshes[index].visible = false;
  const found = G.coins.filter(Boolean).length;
  addMoney(250, 'Arunika coin');
  awardRankPoints(5, 'Coin found');
  playUiSound('pickup');
  showBanner('ARUNIKA COIN ' + found + '/' + COIN_SPOTS.length, found === COIN_SPOTS.length ? 'All coins found: +$5,000' : '+$250', 2);
  if (found === COIN_SPOTS.length) addMoney(5000, 'Coin collection');
}

function updateSideActivities(dt) {
  const p = playerPosition(), car = G.player.car, a = G.activity;
  if (a && a.type === 'race') updateRace(dt, a, car);
  else if (a && a.type === 'taxi') runTaxiFare(dt);
  else if (a && a.type === 'wreck') {
    a.timer -= dt;
    a.marker.position.set(a.car.x, a.car.y, a.car.z);
    if (a.car.wrecked) { const t = WRECK_TARGETS[a.index]; G.wrecksDone[a.index] = true; addMoney(t.bounty, 'Wreck contract'); awardRankPoints(25, 'Wreck contract'); endActivity(true, t.name + ' is off the road'); }
    else if (a.timer <= 0) endActivity(false, 'The target got away');
  }
  COIN_SPOTS.forEach((c, i) => {
    if (G.coins[i]) return;
    W.coinMeshes[i].rotation.y += dt * 2.5;
    if (dist2d(p.x, p.z, c[0], c[1]) < (car ? 3.5 : 1.6)) collectArunikaCoin(i);
  });
  if (car) {
    STUNT_RAMPS.forEach((r, i) => {
      if (car.y < 0.3 && car.vy === 0 && dist2d(car.x, car.z, r.x, r.z) < 3 && car.speed > 13 && Math.abs(angleDiff(car.heading, r.h)) < 0.6) { car.vy = car.speed * 0.36; car.y += 0.1; W.stunt = { i: i, t: 0 }; }
    });
    if (W.stunt) {
      W.stunt.t += dt;
      if (car.y <= groundHeightAt(car.x, car.z) + 0.01 && W.stunt.t > 0.3) {
        const air = W.stunt.t, bonus = Math.round(air * 300);
        if (!G.rampsDone[W.stunt.i]) { G.rampsDone[W.stunt.i] = true; G.stats.stunts++; addMoney(bonus, 'Stunt jump'); awardRankPoints(10, 'Stunt jump'); showBanner('STUNT JUMP ' + G.rampsDone.filter(Boolean).length + '/' + STUNT_RAMPS.length, air.toFixed(1) + ' s air +' + formatMoney(bonus), 2.4); }
        W.stunt = null;
      }
    }
  }
  if (W.keysHit.KeyQ && car) tuneRadioStation();
  if (!a && !G.contract) offerActivitiesAndServices(p, car);
  else if (!a) offerServices(p, car);
}

function updateRace(dt, a, car) {
  const race = RACES[a.index];
  a.time += dt;
  if (!car) { endActivity(false, 'You left your car'); return; }
  if (a.time < 0) { car.speed = 0; for (const r of a.rivals) r.speed = 0; return; }
  for (const r of a.rivals) {
    if (r.wrecked || r.race.done) continue;
    const cp = race.points[r.race.next];
    r.boost = r.race.pace * 1.15;
    const steer = steerTowards(r, cp[0], cp[1]);
    driveVehicleWithArcadePhysics(r, Math.abs(steer) > 0.8 && r.speed > 16 ? 0 : 1, steer, false, dt);
    resolveCarAgainstWorld(r);
    resolveCarAgainstCars(r);
    if (dist2d(r.x, r.z, cp[0], cp[1]) < 14) { r.race.next++; if (r.race.next >= race.points.length) { r.race.next = 0; r.race.lap++; if (r.race.lap >= race.laps) { r.race.done = true; a.finished++; } } }
  }
  const cp = race.points[a.next];
  if (dist2d(car.x, car.z, cp[0], cp[1]) < 14) {
    a.next++;
    playUiSound('pickup');
    if (a.next >= race.points.length) { a.next = 0; a.lap++; }
    if (a.lap >= race.laps) {
      const place = a.finished + 1, key = 'race' + a.index;
      if (!G.bestTimes[key] || a.time < G.bestTimes[key]) G.bestTimes[key] = a.time;
      if (place === 1) { addMoney(race.prize, race.name); G.stats.racesWon++; awardRankPoints(30, 'Race won'); changeDistrictStanding(districtAt(car.x, car.z).id, 4); }
      else addMoney(Math.round(race.prize / (place * 2)), race.name);
      endActivity(place === 1, 'P' + place + ' in ' + formatDuration(a.time));
      return;
    }
    const n = race.points[a.next];
    a.marker.position.set(n[0], groundHeightAt(n[0], n[1]), n[1]);
  }
}

function endActivity(won, text) {
  const a = G.activity;
  if (!a) return;
  if (a.marker) W.scene.remove(a.marker);
  if (a.rivals) for (const r of a.rivals) { r.keep = false; if (!r.removed) removeCar(r); }
  if (a.car && !a.car.removed) { a.car.keep = false; if (a.car.ai) a.car.ai.flee = 0; }
  showBanner((a.type === 'race' ? RACES[a.index].name : a.type === 'taxi' ? 'TAXI FARE' : 'WRECK CONTRACT') + (won ? ' - DONE' : ' - FAILED'), text, 3);
  playUiSound(won ? 'complete' : 'fail');
  G.activity = null;
}

function offerActivitiesAndServices(p, car) {
  RACES.forEach((race, i) => {
    if (car && dist2d(p.x, p.z, race.start[0], race.start[1]) < 7) { G.prompt = { text: 'E - RACE: ' + race.name + ' (' + formatMoney(race.prize) + ')' }; if (W.keysHit.KeyE) startStreetRace(i); }
  });
  WRECK_TARGETS.forEach((t, i) => {
    if (!G.wrecksDone[i] && dist2d(p.x, p.z, t.at[0], t.at[1]) < 6) { G.prompt = { text: 'E - WRECK CONTRACT: ' + t.name }; if (W.keysHit.KeyE && (car || !nearbyCarForEntry(p))) startWreckContract(i); }
  });
  if (car && car.model === 'taxi' && Math.abs(car.speed) < 4) {
    G.prompt = G.prompt || { text: 'T - START TAXI FARES' };
    if (W.keysHit.KeyT) {
      const from = randPick(W.nodes.filter((n) => !n.ramp && dist2d(n.x, n.z, p.x, p.z) > 80 && dist2d(n.x, n.z, p.x, p.z) < 260));
      G.activity = { type: 'taxi', phase: 'pickup', x: from.x + 6, z: from.z + 6, timer: 70, fare: 0, marker: makeBeacon(from.x + 6, from.z + 6, 0xffc21a, 2.5) };
      showBanner('TAXI FARE', 'Pick up at ' + streetNameAt(from.x, from.z), 2.5);
    }
  }
  offerServices(p, car);
}

function nearbyCarForEntry(p) {
  return W.cars.some((c) => !c.wrecked && dist2d(p.x, p.z, c.x, c.z) < 4);
}

function offerServices(p, car) {
  const cheap = currentRankIndex() >= 1 ? 0.9 : 1;
  if (!car && dist2d(p.x, p.z, PLACES.gunshop.x, PLACES.gunshop.z) < 5) {
    // KELO ARMS sells the next weapon you do not own, then ammunition and armour.
    const next = G.weapons.findIndex((w) => !w.owned);
    const item = next > 0 ? { text: WEAPONS[next].name.toUpperCase(), price: Math.round(WEAPONS[next].price * cheap) } : G.armour < 100 ? { text: 'BODY ARMOUR', price: Math.round(400 * cheap) } : { text: 'AMMUNITION', price: Math.round(WEAPONS[G.weaponIndex].ammoPrice * cheap) };
    G.prompt = { text: 'E - BUY ' + item.text + ' ' + formatMoney(item.price) + ' &middot; B - AMMO' };
    if (W.keysHit.KeyE && G.money >= item.price) {
      addMoney(-item.price, 'KELO ARMS');
      if (next > 0) { G.weapons[next].owned = true; G.weapons[next].reserve = WEAPONS[next].reserve; selectWeapon(next); }
      else if (G.armour < 100) G.armour = 100;
      else G.weapons[G.weaponIndex].reserve += WEAPONS[G.weaponIndex].mag * 3;
      playUiSound('pickup');
    }
    const ammo = Math.round(WEAPONS[G.weaponIndex].ammoPrice * cheap);
    if (W.keysHit.KeyB && WEAPONS[G.weaponIndex].mag && G.money >= ammo) { addMoney(-ammo, 'Ammunition'); G.weapons[G.weaponIndex].reserve += WEAPONS[G.weaponIndex].mag * 3; playUiSound('reload'); }
  }
  if (car && dist2d(p.x, p.z, PLACES.respray.x, PLACES.respray.z) < 7) {
    const price = Math.round(300 * cheap);
    G.prompt = { text: G.wanted > 3 ? 'TOO HOT FOR A RESPRAY' : 'E - RESPRAY + REPAIR ' + formatMoney(price) };
    if (W.keysHit.KeyE && G.wanted <= 3 && G.money >= price && !G.inSight) {
      addMoney(-price, 'Cat Kilat');
      const fresh = spawnCar(car.model, car.x, car.z, car.heading, 'player', randPick(car.spec.colors.filter((c) => c !== car.color).concat([0x9b5de5])));
      fresh.keep = true; fresh.occupied = true;
      removeCar(car);
      G.player.car = fresh;
      clearWantedLevel(false);
      showBanner('RESPRAYED', 'New paint, clean plates, heat gone', 2.5);
    } else if (W.keysHit.KeyE && G.inSight) showBanner('STILL IN SIGHT', 'Lose the units before the respray', 1.6);
  }
  if (car && dist2d(p.x, p.z, PLACES.amir.x + 10, PLACES.amir.z + 8) < 8 && Math.abs(car.speed) < 3) {
    const u = UPGRADES.find((x) => G.upgrades[x.id] < x.max);
    if (u) {
      const price = Math.round(u.price * (G.upgrades[u.id] + 1) * cheap);
      G.prompt = { text: 'U - ' + u.name + ' LV ' + (G.upgrades[u.id] + 1) + ' ' + formatMoney(price) };
      if (W.keysHit.KeyU && G.money >= price) { addMoney(-price, u.name); G.upgrades[u.id]++; playUiSound('complete'); showBanner(u.name, u.desc, 2); }
    }
  }
  if (car && EXPORT_LIST.includes(car.model) && dist2d(p.x, p.z, PLACES.dock.x, PLACES.dock.z) < 9 && Math.abs(car.speed) < 3 && G.wanted === 0) {
    const pay = Math.round(car.spec.price * 0.6 * clamp(car.hp / car.spec.hp, 0.3, 1));
    G.prompt = { text: 'E - EXPORT ' + car.spec.name + ' FOR ' + formatMoney(pay) };
    if (W.keysHit.KeyE) { enterOrExitVehicle(); removeCar(car); addMoney(pay, 'Export dock'); G.stats.exports++; awardRankPoints(12, 'Car exported'); playUiSound('complete'); showBanner('EXPORTED', car.spec.name + ' shipped +' + formatMoney(pay), 2.4); }
  }
  if (!car) {
    for (const id of SAFEHOUSES) {
      if (dist2d(p.x, p.z, PLACES[id].x, PLACES[id].z + 4) < 3.5 && G.wanted === 0) {
        G.prompt = { text: 'E - SLEEP AND SAVE (' + PLACES[id].name + ')' };
        if (W.keysHit.KeyE) autosaveAtSafehouse(id);
      }
    }
    if (dist2d(p.x, p.z, PLACES.amir.x + 6, PLACES.amir.z + 4) < 4) {
      const c = CREW.find((m) => !G.crew[m.id].recruited);
      if (c) { G.prompt = { text: 'G - RECRUIT ' + c.name + ' (' + c.role + ') ' + formatMoney(c.cost) }; if (W.keysHit.KeyG) recruitCrewMember(c.id); }
    }
    if (dist2d(p.x, p.z, PLACES.tower.x, PLACES.tower.z + 6) < 4 && G.debt > 0 && !G.contract) {
      const pay = Math.min(1000, G.debt, G.money);
      G.prompt = { text: 'E - PAY DARMA ' + formatMoney(pay) + ' (DEBT ' + formatMoney(G.debt) + ')' };
      if (W.keysHit.KeyE && pay > 0) { G.money -= pay; G.debt -= pay; playUiSound('pickup'); showBanner('DEBT PAID DOWN', formatMoney(G.debt) + ' left', 2); }
    }
  }
}

function buildActivityMarkers() {
  W.coinMeshes = COIN_SPOTS.map((c) => {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffd43b, emissive: 0x8a6a00 }));
    coin.position.set(c[0], groundHeightAt(c[0], c[1]) + 1.1, c[1]);
    W.scene.add(coin);
    return coin;
  });
  const batch = createGeometryBatch();
  for (const r of STUNT_RAMPS) {
    for (let k = 0; k < 5; k++) batchAddBox(batch, r.x + Math.sin(r.h) * (k - 2) * 1.1, 0.14 + k * 0.2, r.z + Math.cos(r.h) * (k - 2) * 1.1, 4.2, 0.28 + k * 0.4, 1.15, k % 2 ? 0xffd43b : 0x23262b, r.h);
  }
  W.scene.add(batchToMesh(batch, sharedMaterial('flat'), true, true));
  W.serviceBeacons = [];
  RACES.forEach((race) => W.serviceBeacons.push(makeBeacon(race.start[0], race.start[1], 0xf783ac, 1.6)));
  WRECK_TARGETS.forEach((t) => W.serviceBeacons.push(makeBeacon(t.at[0], t.at[1], 0xe03131, 1.3)));
  for (const id of ['gunshop', 'respray', 'dock']) W.serviceBeacons.push(makeBeacon(PLACES[id].x, PLACES[id].z, id === 'gunshop' ? 0xff922b : id === 'respray' ? 0x22b8cf : 0x94d82d, 1.3));
  for (const id of SAFEHOUSES) W.serviceBeacons.push(makeBeacon(PLACES[id].x, PLACES[id].z + 4, 0x51cf66, 1.1));
}

function activityCardView() {
  const a = G.activity;
  if (a.type === 'race') {
    const race = RACES[a.index];
    return { head: 'STREET RACE', act: formatMoney(race.prize) + ' PRIZE', stage: 'LAP ' + Math.min(a.lap + 1, race.laps) + '/' + race.laps + ' &middot; P' + (a.finished + 1 + a.rivals.filter((r) => !r.race.done && (r.race.lap > a.lap || (r.race.lap === a.lap && r.race.next > a.next))).length),
      title: race.name, obj: 'Hit every <b>pink checkpoint</b> before ' + RIVAL_NAMES[0], next: 'Checkpoint ' + (a.next + 1) + '/' + race.points.length, line: G.bestTimes['race' + a.index] ? 'BEST ' + formatDuration(G.bestTimes['race' + a.index]) : 'NO BEST TIME YET', timer: a.time < 0 ? String(Math.ceil(-a.time)) : formatDuration(a.time), pips: null };
  }
  if (a.type === 'taxi') return { head: 'TAXI FARE', act: 'TAKSI KUNING', stage: a.phase === 'pickup' ? 'PICK UP' : 'DROP OFF', title: streetNameAt(a.x, a.z), obj: a.phase === 'pickup' ? 'Stop at the <b>yellow beacon</b> for your passenger' : 'Drive the passenger to the <b>yellow beacon</b>', next: a.phase === 'pickup' ? 'Drop off' : 'Fare ' + formatMoney(a.fare) + ' + tip', line: 'FARES DELIVERED ' + G.stats.fares, timer: formatDuration(Math.max(0, a.timer)), pips: null };
  const t = WRECK_TARGETS[a.index];
  return { head: 'WRECK CONTRACT', act: formatMoney(t.bounty) + ' BOUNTY', stage: 'TARGET ' + Math.round(clamp(a.car.hp / (a.car.spec.hp * 1.6), 0, 1) * 100) + '%', title: t.name, obj: 'Ram or shoot the <b>' + a.car.spec.name + '</b> until it burns', next: 'Collect the bounty', line: 'WRECKS ' + G.wrecksDone.filter(Boolean).length + '/' + WRECK_TARGETS.length, timer: formatDuration(Math.max(0, a.timer)), pips: null };
}
