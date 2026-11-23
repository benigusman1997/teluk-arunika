// Side activities: street races, taxi fares, car export, wreck contracts, Arunika coins, stunt ramps,
// shops (weapons / ammo / armour), respray, garage upgrades and safehouses.
TA.markers = [];
TA.coins = [];
TA.pickups = [];

TA.addWorldMarker = function (type, x, z, label, color, data) {
  var mesh = new THREE.Mesh(TA._ringGeo || (TA._ringGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.9, 20, 1, true)),
    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  mesh.position.set(x, TA.groundY(x, z) + 0.5, z);
  TA.scene.add(mesh);
  var m = { type: type, x: x, z: z, label: label, color: color, mesh: mesh, data: data };
  TA.markers.push(m);
  return m;
};

TA.buildActivities = function () {
  var P = TA.PLACES, b = TA.Batch();
  TA.RACES.forEach(function (r, i) { TA.addWorldMarker('race', r.start[0], r.start[1], 'RACE: ' + r.name, 0x4cc9f0, i); });
  TA.SAFEHOUSES.forEach(function (k) { TA.addWorldMarker('safe', P[k].x, P[k].z, P[k].name, 0x4895ef, k); });
  TA.addWorldMarker('gunshop', P.gunshop.x, P.gunshop.z, 'KELO ARMS', 0xff9f1c);
  TA.addWorldMarker('garage', -166, -8, "Pak Amir's Garage", 0xffd166);
  TA.addWorldMarker('respray', P.respray.x, P.respray.z, 'SEMPROT KILAT', 0xf78fb3);
  TA.addWorldMarker('export', -270, 263, 'CAR EXPORT', 0x90be6d);
  TA.addWorldMarker('wreck', -196, -8, 'WRECK CONTRACTS', 0xf94144);
  TA.RAMPS.forEach(function (r) { TA.addRamp(b, r[0], r[1], r[2]); });
  TA.scene.add(b.build());
  var geo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), mat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
  geo.rotateX(Math.PI / 2);
  TA.COINS.forEach(function (c, i) {
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(c[0], TA.groundY(c[0], c[1]) + 1.2, c[1]);
    TA.scene.add(mesh);
    TA.coins.push({ i: i, x: c[0], z: c[1], mesh: mesh });
  });
};

// Small glowing pickups used by missions (cash bags, crates, envelopes).
TA.addPickup = function (x, z, color) {
  var mesh = new THREE.Mesh(TA._pickGeo || (TA._pickGeo = new THREE.BoxGeometry(0.7, 0.5, 0.5)), new THREE.MeshBasicMaterial({ color: color }));
  mesh.position.set(x, TA.groundY(x, z) + 0.7, z);
  TA.scene.add(mesh);
  var it = { x: x, z: z, mesh: mesh, taken: false };
  TA.pickups.push(it);
  return it;
};
TA.removePickup = function (it) { TA.scene.remove(it.mesh); var i = TA.pickups.indexOf(it); if (i >= 0) TA.pickups.splice(i, 1); };

// ---- shops -----------------------------------------------------------------
TA.openShop = function (kind) {
  var s = TA.state, cheap = TA.rankInfo().n >= 4 ? 0.8 : 1, items = [];
  if (kind === 'gunshop') {
    TA.WEAPONS.forEach(function (w, i) {
      if (i === 0) return;
      var owned = s.owned[i], price = Math.round((owned ? w.price * 0.12 + 40 : w.price) * cheap);
      items.push({ label: owned ? w.name + ' ammo ×' + w.mag * 2 : w.label + ' "' + w.name + '"', price: price, buy: function () { TA.giveWeapon(i, w.mag * 2); } });
    });
    items.push({ label: 'Body armour', price: Math.round(500 * cheap), buy: function () { TA.player.armour = 100; } });
  } else {
    items.push({ label: 'Repair this car', price: 200, buy: function () { var c = TA.player.car; if (c) { c.hp = c.maxHp; c.tyres = true; } } });
    items.push({ label: 'Engine tune (+8% speed) — level ' + s.upgrades.engine + '/3', price: 2000 + s.upgrades.engine * 1500, buy: function () { if (s.upgrades.engine < 3) s.upgrades.engine++; } });
    items.push({ label: 'Armour plating — level ' + s.upgrades.plating + '/3', price: 1500 + s.upgrades.plating * 1200, buy: function () { if (s.upgrades.plating < 3) s.upgrades.plating++; } });
    TA.CREW.forEach(function (c) { if (!s.crew[c.id]) items.push({ label: 'Recruit ' + c.name + ' "' + c.nick + '" — ' + c.ability, price: c.cost, buy: function () { TA.unlockCrew(c.id); } }); });
  }
  TA.run.shop = { kind: kind, title: kind === 'gunshop' ? 'KELO ARMS' : "PAK AMIR'S GARAGE", items: items };
};

TA.updateShop = function () {
  var shop = TA.run.shop;
  shop.items.forEach(function (it, i) {
    if (!TA.keyHit('Digit' + (i + 1))) return;
    if (TA.state.money < it.price) { TA.showBanner('NOT ENOUGH CASH', it.label + ' costs ' + TA.fmtMoney(it.price), '#f8961e'); return; }
    TA.addMoney(-it.price); it.buy();
    if (TA.sfx) TA.sfx('coin', 0.8);
    TA.openShop(shop.kind);
  });
};

// ---- activities ------------------------------------------------------------
TA.startRace = function (i) {
  var def = TA.RACES[i], p = TA.player, rivals = [];
  for (var k = 0; k < 3; k++) {
    var c = TA.spawnCar(k === 0 ? 'gt' : 'sedan', def.start[0] + (k - 1) * 4, def.start[1] + 5 + k * 2, TA.headingTo(def.cps[0][0] - def.start[0], def.cps[0][1] - def.start[1]), 'mission');
    c.driver = true; c.keep = true; c.cp = 0; c.name = ['Bimo', 'Yuli', 'Dedi'][k]; rivals.push(c);
  }
  TA.run.activity = { type: 'race', index: i, def: def, cp: 0, time: 0, rivals: rivals, place: 1 };
  TA.setBeacon(def.cps[0][0], def.cps[0][1]);
  TA.showBanner('STREET RACE', def.name.toUpperCase() + ' — ' + def.cps.length + ' CHECKPOINTS', '#4cc9f0');
};

TA.startTaxiFare = function () {
  var a = TA.pick(TA.world.nodes), b = TA.pick(TA.world.nodes);
  if (a === b) b = TA.world.nodes[(a.id + 9) % 35];
  TA.run.activity = { type: 'taxi', phase: 'pickup', x: a.x + 6, z: a.z + 12, dx: b.x - 6, dz: b.z - 12, timer: 0, fare: 0 };
  TA.setBeacon(a.x + 6, a.z + 12);
  TA.showBanner('TAXI FARE', 'PICK UP ON ' + TA.streetAt(a.x + 6, a.z + 12).toUpperCase(), '#ffc300');
};

TA.startWreckContract = function () {
  var def = TA.WRECK_TARGETS[TA.state.wrecks % 3], n = TA.policeSpawnPoint(90, 200, true), nb = TA.world.nodes[n.nb[0]];
  var car = TA.spawnCar(def.model, n.x, n.z, TA.headingTo(nb.x - n.x, nb.z - n.z), 'mission', 0x7b2cbf);
  car.driver = true; car.target = true; car.keep = true; car.name = def.name; car.hp = car.maxHp = car.model.hp * 1.6; car.node = nb.id; car.prevNode = n.id;
  TA.addMarker(car, 0xff3b30, true);
  TA.run.activity = { type: 'wreck', def: def, car: car };
  TA.showBanner('WRECK CONTRACT', 'RUN ' + def.name.toUpperCase() + ' OFF THE ROAD — ' + TA.fmtMoney(def.pay), '#f94144');
};

TA.endActivity = function () { TA.run.activity = null; TA.setBeacon(null); };

TA.updateActiveActivity = function (dt) {
  var a = TA.run.activity, p = TA.player, s = TA.state;
  if (a.type === 'race') {
    a.time += dt;
    var cp = a.def.cps[a.cp];
    a.rivals.forEach(function (c, k) {
      if (c.dead || c.removed) return;
      var t = a.def.cps[Math.min(c.cp, a.def.cps.length - 1)];
      if (TA.driveToward(c, t[0] + (k - 1) * 3, t[1] + (k - 1) * 3, dt, c.model.top * (0.6 + k * 0.05)) < 14 && c.cp < a.def.cps.length) c.cp++;
    });
    a.place = 1 + a.rivals.filter(function (c) { return c.cp > a.cp; }).length;
    if (TA.dist(p.x, p.z, cp[0], cp[1]) < 12 && p.car) {
      a.cp++; if (TA.sfx) TA.sfx('stage', 0.6);
      if (a.cp >= a.def.cps.length) {
        var prize = [1500, 700, 300, 100][a.place - 1], best = s.bestRace[a.index];
        if (!best || a.time < best) s.bestRace[a.index] = Math.round(a.time * 10) / 10;
        TA.addMoney(prize); TA.addRP(a.place === 1 ? 35 : 12);
        TA.showBanner(a.place === 1 ? 'RACE WON' : 'FINISHED P' + a.place, a.def.name.toUpperCase() + ' · ' + a.time.toFixed(1) + 's · +' + TA.fmtMoney(prize), '#4cc9f0');
        a.rivals.forEach(function (c) { c.keep = false; c.driver = false; c.kind = 'parked'; });
        TA.endActivity();
      } else TA.setBeacon(a.def.cps[a.cp][0], a.def.cps[a.cp][1]);
    }
  } else if (a.type === 'taxi') {
    if (!p.car || p.car.key !== 'taxi') { TA.showBanner('FARE LOST', 'YOU LEFT THE TAXI', '#f8961e'); TA.endActivity(); return; }
    a.timer += dt;
    var tx = a.phase === 'pickup' ? a.x : a.dx, tz = a.phase === 'pickup' ? a.z : a.dz;
    if (TA.dist(p.x, p.z, tx, tz) < 8 && Math.abs(p.car.speed) < 5) {
      if (a.phase === 'pickup') { a.phase = 'drop'; a.timer = 0; a.fare = 120 + Math.round(TA.dist(a.x, a.z, a.dx, a.dz) * 1.4); TA.setBeacon(a.dx, a.dz); TA.showBanner('PASSENGER ABOARD', 'DROP OFF ON ' + TA.streetAt(a.dx, a.dz).toUpperCase(), '#ffc300'); }
      else { var tip = Math.max(0, Math.round(a.fare * 0.5 - a.timer * 4)); TA.addMoney(a.fare + tip); s.fares++; TA.addRP(10); TA.addStanding(TA.districtAt(p.x, p.z).id, 3); TA.showBanner('FARE PAID', TA.fmtMoney(a.fare) + ' + ' + TA.fmtMoney(tip) + ' TIP', '#ffc300'); TA.endActivity(); }
    }
  } else if (a.type === 'wreck') {
    var c = a.car;
    if (c.dead) { TA.addMoney(a.def.pay); s.wrecks++; TA.addRP(30); TA.showBanner('TARGET WRECKED', a.def.name.toUpperCase() + ' · +' + TA.fmtMoney(a.def.pay), '#f94144'); c.keep = false; TA.endActivity(); return; }
    var n = TA.world.nodes[c.node];
    if (TA.driveToward(c, n.x, n.z, dt, c.model.top * 0.62) < 12) {
      var opts = n.nb.filter(function (id) { return id !== c.prevNode; }), far = opts[0], fd = -1;
      opts.forEach(function (id) { var d = TA.dist(TA.world.nodes[id].x, TA.world.nodes[id].z, p.x, p.z); if (d > fd) { fd = d; far = id; } });
      c.prevNode = c.node; c.node = far;
    }
    TA.setBeacon(c.x, c.z);
    if (TA.dist(c.x, c.z, p.x, p.z) > 420) { TA.showBanner('TARGET ESCAPED', a.def.name.toUpperCase() + ' GOT AWAY', '#f8961e'); TA.removeMarkerFor(c); TA.removeCar(c); TA.endActivity(); }
  }
};

TA.exportCar = function () {
  var p = TA.player, c = p.car, value = Math.round((c.key === 'gt' ? 2200 : c.key === 'hauler' ? 1800 : c.key === 'komet' ? 300 : 900) * (0.4 + 0.6 * c.hp / c.maxHp));
  TA.exitCar(true); TA.removeCar(c);
  TA.addMoney(value); TA.state.exports++; TA.addRP(12); TA.addStanding('pelabuhan', 4);
  TA.showBanner('CAR EXPORTED', c.name + ' · +' + TA.fmtMoney(value), '#90be6d');
};

TA.useSafehouse = function (m) {
  var p = TA.player;
  p.hp = 100; if (TA.rankInfo().n >= 3) p.armour = Math.max(p.armour, 50);
  if (TA.run.wanted > 0 && !TA.run.inSight) TA.setWanted(0);
  TA.state.clock = (TA.state.clock + 120) % 1440;
  TA.saveGame(0); TA.saveGame(TA.run.slot || 1);
  TA.showBanner('GAME SAVED', m.label.toUpperCase() + ' · SLOT ' + (TA.run.slot || 1), '#4895ef');
};

TA.useRespray = function () {
  var p = TA.player, fee = TA.rankInfo().n >= 4 ? 200 : 350;
  if (!p.car) { TA.showBanner('BRING A CAR', 'SEMPROT KILAT ONLY PAINTS CARS', '#f8961e'); return; }
  if (TA.run.inSight && TA.run.wanted > 0) { TA.showBanner('THEY CAN SEE YOU', 'BREAK LINE OF SIGHT FIRST', '#f8961e'); return; }
  if (TA.state.money < fee) { TA.showBanner('NOT ENOUGH CASH', 'RESPRAY COSTS ' + TA.fmtMoney(fee), '#f8961e'); return; }
  TA.addMoney(-fee);
  var c = p.car, color = TA.pick(TA.PASTELS);
  TA.scene.remove(c.mesh); c.mesh = TA.makeCar(c.key, color); c.color = color; TA.scene.add(c.mesh); c.hp = Math.max(c.hp, c.maxHp * 0.7);
  TA.setWanted(0);
  TA.showBanner('FRESH PAINT', 'TAPD IS LOOKING FOR ANOTHER COLOUR', '#f78fb3');
};

// Per-step: marker prompts, coins, the active activity, shop keys.
TA.updateActivities = function (dt) {
  var p = TA.player, s = TA.state, i, near = null;
  for (i = 0; i < TA.coins.length; i++) {
    var c = TA.coins[i];
    if (s.coins.indexOf(c.i) >= 0) { c.mesh.visible = false; continue; }
    c.mesh.visible = true; c.mesh.rotation.y += dt * 3;
    if (TA.dist(p.x, p.z, c.x, c.z) < 2.4) {
      s.coins.push(c.i); TA.addMoney(250); TA.addRP(8); if (TA.sfx) TA.sfx('coin', 1);
      TA.showBanner('ARUNIKA COIN ' + s.coins.length + '/12', s.coins.length === 12 ? 'ALL FOUND — +$5,000' : '+$250', '#ffd43b');
      if (s.coins.length === 12) TA.addMoney(5000);
    }
  }
  for (i = 0; i < TA.pickups.length; i++) TA.pickups[i].mesh.rotation.y += dt * 2.5;
  if (TA.run.activity) TA.updateActiveActivity(dt);
  for (i = 0; i < TA.markers.length; i++) if (TA.dist(p.x, p.z, TA.markers[i].x, TA.markers[i].z) < 4.5) near = TA.markers[i];
  if (TA.run.shop && (!near || near.type !== TA.run.shop.kind)) TA.run.shop = null;
  if (TA.run.shop) TA.updateShop();
  if (!near || TA.run.mission && near.type !== 'gunshop' && near.type !== 'garage' && near.type !== 'respray' && near.type !== 'safe') {
    if (p.car && p.car.key === 'taxi' && !TA.run.activity && !TA.run.mission && TA.run.wanted === 0) { if (!TA.run.prompt) TA.run.prompt = 'Press F to take a taxi fare'; if (TA.keyHit('KeyF')) TA.startTaxiFare(); }
    return;
  }
  if (near.type === 'gunshop' || near.type === 'garage') { if (!TA.run.shop) TA.openShop(near.type); TA.run.prompt = near.label + ' — press a number to buy'; return; }
  if (TA.run.activity) return;
  TA.run.prompt = 'Press F — ' + near.label + (near.type === 'race' && s.bestRace[near.data] ? ' (best ' + s.bestRace[near.data] + 's)' : '');
  if (!TA.keyHit('KeyF')) return;
  if (near.type === 'race') { if (p.car) TA.startRace(near.data); else TA.showBanner('BRING A CAR', 'RACES NEED WHEELS', '#f8961e'); }
  else if (near.type === 'safe') TA.useSafehouse(near);
  else if (near.type === 'respray') TA.useRespray();
  else if (near.type === 'export') { if (p.car && p.car.kind === 'player' && !p.car.mission) TA.exportCar(); else TA.showBanner('NOTHING TO EXPORT', 'DRIVE A STOLEN CAR ONTO THE DOCK', '#f8961e'); }
  else if (near.type === 'wreck') TA.startWreckContract();
};

// Stunt ramps: first clean jump off each one pays a bonus.
TA.onRampJump = function (i, car) {
  car.onLand = function () {
    car.onLand = null;
    var first = TA.state.ramps.indexOf(i) < 0;
    if (first) { TA.state.ramps.push(i); TA.addMoney(400); TA.addRP(15); }
    TA.showBanner('STUNT JUMP ' + TA.state.ramps.length + '/5', first ? '+$400' : 'ALREADY LANDED', '#ff9f1c');
  };
};
