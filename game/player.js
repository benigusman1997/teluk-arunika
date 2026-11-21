// Teluk Arunika v3.6 — player.js
// On foot + driving, carjacking (hold E), 4 guns + fists with ammo counts,
// weapon wheel, drive-by, HP/armor, shops (buy weapon / armor / ammo).
(function () {
  'use strict';
  var TA = window.TA;

  // Car models: name + base top speed. Condition % drops on crashes.
  var CAR_MODELS = [
    { name: 'ARUNIKA SEDAN', topSpeed: 132, accel: 22, color: 0xc0c8d0 },
    { name: 'PELABUHAN GT', topSpeed: 168, accel: 30, color: 0xb3402a },
    { name: 'TAKSI KUNING', topSpeed: 118, accel: 19, color: 0xd8b820 },
    { name: 'KERONO LOWRIDER', topSpeed: 142, accel: 25, color: 0x7a3ab3 },
    { name: 'PICKUP BAJA', topSpeed: 124, accel: 20, color: 0x3a7a3a },
    { name: 'VAN PASAR', topSpeed: 104, accel: 16, color: 0x2a5a8a },
  ];

  // Weapons: fists + 4 guns. Ammo is mag / reserve (ISLA-style wheel counts).
  var WEAPONS = [
    { name: 'Fists', key: 'fists', damage: 12, rate: 0.4, auto: false, range: 2.2, infinite: true },
    { name: '.38 Pistol', key: 'pistol', damage: 22, rate: 0.28, auto: false, range: 55, infinite: false },
    { name: 'SMG', key: 'smg', damage: 14, rate: 0.09, auto: true, range: 48, infinite: false },
    { name: 'Shotgun', key: 'shotgun', damage: 55, rate: 0.9, auto: false, range: 22, infinite: false },
    { name: 'Rifle', key: 'rifle', damage: 40, rate: 0.22, auto: false, range: 90, infinite: false },
  ];

  var AMMO = {
    pistol: { mag: 12, magSize: 12, reserve: 48 },
    smg: { mag: 30, magSize: 30, reserve: 60 },
    shotgun: { mag: 6, magSize: 6, reserve: 18 },
    rifle: { mag: 10, magSize: 10, reserve: 30 },
  };

  var AMMO_PRICE = { pistol: 40, smg: 90, shotgun: 70, rifle: 120 };
  var ARMOR_PRICE = 150;
  var WEAPON_PRICE = { pistol: 250, smg: 600, shotgun: 450, rifle: 900 };

  var ownedWeapons = { pistol: true, smg: false, shotgun: false, rifle: false };
  var cars = [];            // drivable parked cars
  var lastShot = 0;
  var jackProgress = 0;
  var jackTarget = null;
  var tracers = [];
  var moveSpeed = 6;

  function buildPlayer() {
    var T = TA.three;
    var g = new T.Group();
    g.name = 'raka';
    var body = new T.Mesh(new T.CapsuleGeometry(0.34, 0.85, 3, 10),
      new T.MeshStandardMaterial({ color: 0x4a9fe8, roughness: 0.6, emissive: 0x1a4a7a, emissiveIntensity: 1.0 }));
    body.position.y = 1.05; body.castShadow = true;
    g.add(body);
    var head = new T.Mesh(new T.SphereGeometry(0.27, 12, 12),
      new T.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.8 }));
    head.position.y = 1.92;
    g.add(head);
    var cap = new T.Mesh(new T.CylinderGeometry(0.29, 0.29, 0.12, 12),
      new T.MeshStandardMaterial({ color: 0xd83a2a, roughness: 0.7 }));
    cap.position.y = 2.12;
    g.add(cap);
    var legs = new T.Mesh(new T.BoxGeometry(0.5, 0.7, 0.3),
      new T.MeshStandardMaterial({ color: 0x22262e, roughness: 0.9 }));
    legs.position.y = 0.35;
    g.add(legs);
    g.position.set(TA.playerPos.x, 0, TA.playerPos.z);
    TA.scene.add(g);
    TA.playerObj = g;
  }

  function makeCarMesh(model, x, z, rotY) {
    var T = TA.three;
    var g = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(2, 0.75, 4.4),
      new T.MeshStandardMaterial({ color: model.color, roughness: 0.3, metalness: 0.65 }));
    body.position.y = 0.7; body.castShadow = true;
    g.add(body);
    var cabin = new T.Mesh(new T.BoxGeometry(1.7, 0.6, 2.1),
      new T.MeshStandardMaterial({ color: 0x141c26, roughness: 0.15, metalness: 0.8 }));
    cabin.position.set(0, 1.32, -0.2);
    g.add(cabin);
    var wheelGeo = new T.CylinderGeometry(0.42, 0.42, 0.3, 12);
    var wheelMat = new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]].forEach(function (w) {
      var wheel = new T.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(w[0], 0.42, w[1]);
      g.add(wheel);
    });
    var head = new T.Mesh(new T.BoxGeometry(1.6, 0.28, 0.2),
      new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1.8 }));
    head.position.set(0, 0.75, 2.25);
    g.add(head);
    var tail = new T.Mesh(new T.BoxGeometry(1.6, 0.28, 0.2),
      new T.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 1.2 }));
    tail.position.set(0, 0.75, -2.25);
    g.add(tail);
    g.position.set(x, 0, z);
    g.rotation.y = rotY || 0;
    TA.scene.add(g);
    return g;
  }

  function spawnCars() {
    var spots = [
      { model: 0, x: 6, z: 14, rot: 0.2 },
      { model: 1, x: -8, z: 22, rot: -0.3 },
      { model: 2, x: 14, z: -10, rot: 1.57 },
      { model: 3, x: -14, z: -30, rot: 0 },
      { model: 4, x: 46, z: 30, rot: 0.6 },
      { model: 5, x: -46, z: 90, rot: -1.2 },
    ];
    spots.forEach(function (s, i) {
      var model = CAR_MODELS[s.model];
      var mesh = makeCarMesh(model, s.x, s.z, s.rot);
      cars.push({
        index: i, model: model, mesh: mesh,
        condition: 62 + ((i * 13) % 36), // 62..97%
        hp: 100, locked: i % 3 === 0, alarm: false,
        speed: 0, steer: 0,
      });
    });
  }

  function placePlayerAt(x, y, z, yaw) {
    TA.playerPos.x = x; TA.playerPos.z = z;
    TA.playerYaw = yaw || 0;
    if (TA.playerObj) TA.playerObj.position.set(x, y || 0, z);
    if (TA.playerObj) TA.playerObj.rotation.y = TA.playerYaw;
  }

  function nearestCar(maxDist) {
    var best = null, bestD = maxDist || 6;
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    cars.forEach(function (c) {
      var dx = c.mesh.position.x - px, dz = c.mesh.position.z - pz;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  // Hold E near a car: jack it (alarm, driver flees, wanted +1).
  function tryEnterExitCar() {
    var s = TA.state;
    if (s.inCar) { exitCar(); return; }
    var car = nearestCar(6);
    if (!car) return;
    if (car.locked) {
      jackCar(car);
    } else {
      enterCar(car);
    }
  }

  function jackCar(car) {
    var s = TA.state;
    jackProgress += 0.34;
    car.alarm = true;
    TA.audio.gunshotSound(0.2);
    if (jackProgress >= 1) {
      jackProgress = 0;
      car.locked = false;
      car.alarm = false;
      s.carsStolen++;
      TA.police.setWanted(Math.min(5, s.wanted + 1));
      TA.career.addXP(10);
      TA.ui.showBanner('MOBIL DICURI — ' + car.model.name, 'Bawa ke garage untuk ganti warna & turunkan wanted.');
      TA.crew.showCrewChatter('AGUS', 'Alarm mati. Cepat, sebelum patroli datang.');
      enterCar(car);
    } else {
      TA.ui.showToast('Hold E — membobol ' + car.model.name + '… ' + Math.round(jackProgress * 100) + '%');
    }
  }

  function enterCar(car) {
    var s = TA.state;
    s.inCar = true;
    s.carIndex = car.index;
    TA.carObj = car.mesh;
    TA.playerObj.visible = false;
    TA.ui.showToast('Masuk ' + car.model.name + ' — ' + Math.round(car.condition) + '% kondisi');
  }

  function enterCarByIndex(i) {
    var car = cars[i];
    if (!car) return;
    TA.state.inCar = true;
    TA.state.carIndex = i;
    TA.carObj = car.mesh;
    TA.playerObj.visible = false;
    TA.playerObj.position.copy(car.mesh.position);
  }

  function exitCar() {
    var s = TA.state;
    var car = cars[s.carIndex];
    s.inCar = false;
    s.carIndex = -1;
    TA.carObj = null;
    TA.playerObj.visible = true;
    if (car) {
      TA.playerObj.position.set(car.mesh.position.x + 3, 0, car.mesh.position.z + 3);
      TA.playerPos.x = TA.playerObj.position.x;
      TA.playerPos.z = TA.playerObj.position.z;
    }
  }

  function getCarCondition() {
    if (TA.state.carIndex < 0) return null;
    var car = cars[TA.state.carIndex];
    return car ? car.condition : null;
  }

  function getCurrentCarName() {
    if (TA.state.carIndex < 0) return null;
    var car = cars[TA.state.carIndex];
    return car ? car.model.name : null;
  }

  function damageCar(amount) {
    if (TA.state.carIndex < 0) return;
    var car = cars[TA.state.carIndex];
    car.condition = Math.max(5, car.condition - amount);
    car.hp -= amount * 2;
    if (car.hp <= 0) explodeCar(car);
  }

  function explodeCar(car) {
    var T = TA.three;
    var flash = new T.PointLight(0xff6600, 60, 30);
    flash.position.copy(car.mesh.position).y += 2;
    TA.scene.add(flash);
    setTimeout(function () { TA.scene.remove(flash); }, 400);
    car.condition = 5; car.hp = 100;
    TA.ui.showToast('Mobil meledak! ' + car.model.name + ' hancur.');
    if (TA.state.inCar) takeDamage(25);
  }

  function repairCar() {
    if (TA.state.carIndex < 0) return false;
    var car = cars[TA.state.carIndex];
    var cost = Math.round((100 - car.condition) * 2 * TA.crew.getCrewBonus().repairDiscount);
    if (TA.state.money < cost) return false;
    TA.state.money -= cost;
    car.condition = 100; car.hp = 100;
    TA.ui.showToast('Mobil diperbaiki — 100% kondisi ($' + cost + ')');
    return true;
  }

  // ---------- combat ----------
  function currentWeapon() { return WEAPONS[TA.state.weapon]; }

  function switchWeapon(i) {
    if (i < 0 || i >= WEAPONS.length) return;
    if (i > 0 && !ownedWeapons[WEAPONS[i].key]) {
      TA.ui.showToast(WEAPONS[i].name + ' belum dibeli — kunjungi toko senjata.');
      return;
    }
    TA.state.weapon = i;
    TA.audio.gunshotSound(0.05);
    TA.ui.refreshWeaponWheel();
  }

  function shoot() {
    var s = TA.state;
    var w = currentWeapon();
    var now = TA.state.elapsed;
    if (now - lastShot < w.rate) return;
    lastShot = now;
    if (!w.infinite) {
      var a = AMMO[w.key];
      if (a.mag <= 0) {
        if (a.reserve > 0) { reloadWeapon(); return; }
        TA.ui.showToast('Amunisi habis! Beli di toko senjata (R ke toko).');
        return;
      }
      a.mag--;
    }
    s.shotsFired++;
    TA.audio.gunshotSound(0.5);
    TA.world.panicPedestrians(TA.playerObj.position.x, TA.playerObj.position.z);
    TA.police.onGunshot();
    // tracer line from player toward aim
    var T = TA.three;
    var from = TA.playerObj.position.clone(); from.y += 1.4;
    var dir = new T.Vector3(-Math.sin(TA.playerYaw), 0, -Math.cos(TA.playerYaw));
    if (s.inCar && TA.carObj) {
      from = TA.carObj.position.clone(); from.y += 1.2;
      dir = new T.Vector3(-Math.sin(TA.carObj.rotation.y), 0, -Math.cos(TA.carObj.rotation.y));
    }
    var to = from.clone().add(dir.clone().multiplyScalar(w.range));
    var geo = new T.BufferGeometry().setFromPoints([from, to]);
    var line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }));
    TA.scene.add(line);
    tracers.push({ line: line, until: now + 0.08 });
    // hit chance vs nearest police unit (abstracted combat)
    TA.police.damageNearestEnemy(w.damage);
  }

  function reloadWeapon() {
    var w = currentWeapon();
    if (w.infinite) return;
    var a = AMMO[w.key];
    var need = a.magSize - a.mag;
    var take = Math.min(need, a.reserve);
    a.mag += take; a.reserve -= take;
    TA.ui.showToast('Reload ' + w.name + ' — ' + a.mag + '/' + a.reserve);
  }

  function driveBy() {
    if (!TA.state.inCar) return;
    shoot();
  }

  function takeDamage(amount) {
    var s = TA.state;
    var absorbed = Math.min(s.armor, amount);
    s.armor -= absorbed;
    s.hp -= (amount - absorbed);
    TA.ui.flashDamage();
    if (s.hp <= 0) {
      s.hp = 0;
      TA.core.gameOver('Raka tumbang di jalanan Teluk Arunika.');
    }
  }

  function heal(amount) {
    var s = TA.state;
    s.hp = Math.min(s.maxHp, s.hp + amount);
  }

  // ---------- shops ----------
  function buyWeapon(key) {
    var price = WEAPON_PRICE[key];
    if (!price || ownedWeapons[key]) return false;
    var discount = TA.crew.getCrewBonus().shopDiscount;
    var cost = Math.round(price * discount);
    if (TA.state.money < cost) return false;
    TA.state.money -= cost;
    ownedWeapons[key] = true;
    TA.ui.showToast(WEAPONS.filter(function (w) { return w.key === key; })[0].name + ' dibeli ($' + cost + ')');
    return true;
  }

  function buyArmor() {
    var cost = Math.round(ARMOR_PRICE * TA.crew.getCrewBonus().shopDiscount);
    if (TA.state.money < cost || TA.state.armor >= TA.state.maxArmor) return false;
    TA.state.money -= cost;
    TA.state.armor = TA.state.maxArmor;
    TA.ui.showToast('Armor penuh ($' + cost + ')');
    return true;
  }

  function buyAmmo(key) {
    var a = AMMO[key];
    if (!a) return false;
    var cost = AMMO_PRICE[key] || 50;
    if (TA.state.money < cost) return false;
    TA.state.money -= cost;
    a.reserve += a.magSize * 2;
    TA.ui.showToast('Amunisi ' + key + ' +' + (a.magSize * 2) + ' ($' + cost + ')');
    return true;
  }

  function getAmmoDisplay(key) {
    if (key === 'fists') return '∞';
    var a = AMMO[key];
    return a.mag + '/' + a.reserve;
  }

  // ---------- per-frame ----------
  function update(dt) {
    var s = TA.state;
    var k = TA.keys;
    var sprint = k['ShiftLeft'] || k['ShiftRight'];
    if (s.screen !== 'playing' && s.screen !== 'map') return;

    if (s.inCar && TA.carObj) {
      updateDriving(dt);
    } else {
      // on foot: WASD relative to camera yaw
      var sp = (sprint ? 9 : moveSpeed);
      var mx = 0, mz = 0;
      if (k['KeyW']) mz -= 1;
      if (k['KeyS']) mz += 1;
      if (k['KeyA']) mx -= 1;
      if (k['KeyD']) mx += 1;
      if (mx !== 0 || mz !== 0) {
        var len = Math.sqrt(mx * mx + mz * mz);
        mx /= len; mz /= len;
        var cy = TA.camYaw;
        var wx = mx * Math.cos(cy) - mz * Math.sin(cy);
        var wz = mx * Math.sin(cy) + mz * Math.cos(cy);
        TA.playerPos.x += wx * sp * dt;
        TA.playerPos.z += wz * sp * dt;
        TA.playerPos.x = Math.max(-245, Math.min(305, TA.playerPos.x));
        TA.playerPos.z = Math.max(-245, Math.min(245, TA.playerPos.z));
        TA.playerYaw = Math.atan2(wx, wz);
        TA.playerObj.position.set(TA.playerPos.x, 0, TA.playerPos.z);
        TA.playerObj.rotation.y = TA.playerYaw;
        updateDistrictFromPosition();
      }
      // hold E near a locked car = jacking progress
      if (k['KeyE']) {
        var car = nearestCar(6);
        if (car && car.locked) jackCar(car);
      }
      // crew passive: Budi regenerates armor slowly
      if (TA.crew.getCrewBonus().armorRegen > 0) {
        s.armor = Math.min(50, s.armor + TA.crew.getCrewBonus().armorRegen * dt);
      }
    }

    // expire tracers
    for (var i = tracers.length - 1; i >= 0; i--) {
      if (TA.state.elapsed > tracers[i].until) {
        TA.scene.remove(tracers[i].line);
        tracers.splice(i, 1);
      }
    }
    updateDistrictFromPosition(); // district always follows position (incl. teleports)
  }

  function updateDriving(dt) {
    var s = TA.state;
    var car = cars[s.carIndex];
    if (!car) return;
    var k = TA.keys;
    var bonus = TA.crew.getCrewBonus();
    var top = car.model.topSpeed * bonus.speedMult;
    var accel = car.model.accel;
    if (k['KeyW'] || k['ArrowUp']) car.speed += accel * dt;
    if (k['KeyS'] || k['ArrowDown']) car.speed -= accel * 1.4 * dt;
    if (!k['KeyW'] && !k['KeyS']) car.speed *= (1 - 0.6 * dt);
    // Sari Gaspol boost
    if (bonus.boostActive) car.speed += 60 * dt;
    car.speed = Math.max(-40, Math.min(top / 3.6, car.speed));
    var steer = 0;
    if (k['KeyA'] || k['ArrowLeft']) steer = 1;
    if (k['KeyD'] || k['ArrowRight']) steer = -1;
    var spdFactor = Math.min(1, Math.abs(car.speed) / 12);
    car.mesh.rotation.y += steer * 1.6 * spdFactor * dt * Math.sign(car.speed || 1);
    var fwd = car.speed * dt;
    car.mesh.position.x -= Math.sin(car.mesh.rotation.y) * fwd;
    car.mesh.position.z -= Math.cos(car.mesh.rotation.y) * fwd;
    car.mesh.position.x = Math.max(-245, Math.min(305, car.mesh.position.x));
    car.mesh.position.z = Math.max(-245, Math.min(245, car.mesh.position.z));
    s.carSpeed = Math.abs(car.speed) * 3.6;
    TA.playerObj.position.copy(car.mesh.position);
    TA.playerPos.x = car.mesh.position.x;
    TA.playerPos.z = car.mesh.position.z;
    TA.camYaw = car.mesh.rotation.y + Math.PI;
    updateDistrictFromPosition();
    // collisions with traffic = damage + condition loss
    TA.world.getTraffic().forEach(function (t) {
      var dx = t.position.x - car.mesh.position.x;
      var dz = t.position.z - car.mesh.position.z;
      if (dx * dx + dz * dz < 12) {
        car.speed *= 0.4;
        damageCar(1.5);
        t.position.x += dx * 0.5;
        t.position.z += dz * 0.5;
      }
    });
    // Budi passive: car slowly repairs
    if (bonus.carRepair > 0) car.condition = Math.min(100, car.condition + bonus.carRepair * dt);
  }

  function updateDistrictFromPosition() {
    var x = TA.playerPos.x, z = TA.playerPos.z;
    var d = 'PELABUHAN', street = 'Dermaga Senja';
    if (x > 170) { d = 'PULAU ABU'; street = 'Jalan Bara'; }
    else if (z > 150) { d = 'PELABUHAN'; street = 'Dermaga Senja'; }
    else if (z > 220) { d = 'PANTAI'; street = 'Pantai Arunika'; }
    else if (x < -100 && z > -80 && z < 40) { d = 'GANG NEON'; street = 'Lorong Lampion'; }
    else if (x > 30 && z > 40) { d = 'PASAR'; street = 'Jalan Ikan Bakar'; }
    else if (z < -100) { d = 'TOL LAYANG'; street = 'Tol Layang'; }
    if (d !== TA.state.district) {
      TA.state.district = d;
      TA.state.street = street;
      TA.ui.showLocationBanner();
    }
  }

  function movePlayer(dx, dz) {
    TA.playerPos.x += dx; TA.playerPos.z += dz;
    if (TA.playerObj) TA.playerObj.position.set(TA.playerPos.x, 0, TA.playerPos.z);
  }

  TA.player = {
    CAR_MODELS: CAR_MODELS,
    WEAPONS: WEAPONS,
    AMMO: AMMO,
    buildPlayer: buildPlayer,
    spawnCars: spawnCars,
    placePlayerAt: placePlayerAt,
    movePlayer: movePlayer,
    tryEnterExitCar: tryEnterExitCar,
    enterCar: enterCar,
    enterCarByIndex: enterCarByIndex,
    exitCar: exitCar,
    jackCar: jackCar,
    getCarCondition: getCarCondition,
    getCurrentCarName: getCurrentCarName,
    damageCar: damageCar,
    repairCar: repairCar,
    switchWeapon: switchWeapon,
    shoot: shoot,
    driveBy: driveBy,
    takeDamage: takeDamage,
    heal: heal,
    buyWeapon: buyWeapon,
    buyArmor: buyArmor,
    buyAmmo: buyAmmo,
    getAmmoDisplay: getAmmoDisplay,
    getOwnedWeapons: function () { return ownedWeapons; },
    getCars: function () { return cars; },
    update: update,
  };
})();
