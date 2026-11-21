/* TELUK ARUNIKA — player.js: jalan kaki + mengemudi, carjacking, 4 senjata, side job, toko */
(function () {
  'use strict';
  var TA = window.TA;

  TA.CAR_MODELS = [
    { id: 'sedan', name: 'ARUNIKA SEDAN', topSpeed: 132, accel: 22, color: 0x8a2f2f },
    { id: 'gt', name: 'PELABUHAN GT', topSpeed: 178, accel: 30, color: 0x2f5f8a },
    { id: 'taxi', name: 'TAKSI KUNING', topSpeed: 120, accel: 20, color: 0xd8a018 },
    { id: 'pickup', name: 'PICKUP BAJA', topSpeed: 118, accel: 18, color: 0x3f6b3a },
    { id: 'van', name: 'VAN PASAR', topSpeed: 105, accel: 15, color: 0x7a7a7a },
    { id: 'neon', name: 'SPORT NEON', topSpeed: 190, accel: 34, color: 0x9a2f8a }
  ];

  TA.WEAPONS = [
    { id: 'pistol', name: 'PISTOL', damage: 25, rate: 0.35, range: 42, price: 0 },
    { id: 'smg', name: 'SMG', damage: 14, rate: 0.1, range: 38, price: 450 },
    { id: 'shotgun', name: 'SHOTGUN', damage: 48, rate: 0.9, range: 22, price: 600 },
    { id: 'rifle', name: 'RIFLE', damage: 40, rate: 0.5, range: 70, price: 900 }
  ];

  TA.SHOP_ITEMS = [
    { kind: 'weapon', index: 1, name: 'SMG', price: 450 },
    { kind: 'weapon', index: 2, name: 'SHOTGUN', price: 600 },
    { kind: 'weapon', index: 3, name: 'RIFLE', price: 900 },
    { kind: 'armor', index: -1, name: 'ARMOR 50', price: 200 },
    { kind: 'repair', index: -1, name: 'PERBAIKI MOBIL (100%)', price: 150 }
  ];

  TA.player = TA.player || {};
  var P = TA.player;
  P.x = 0; P.z = 0; P.angle = 0; P.speed = 0; P.onFoot = true;
  P.mesh = null; P.carMesh = null; P.moving = false;
  P.lastShot = 0; P.tracers = [];
  P.parkedCars = [];

  P.makePedMesh = function (shirtColor) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), TA.world.mat(shirtColor));
    body.position.y = 1.0; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), TA.world.mat(0xd8a878));
    head.position.y = 1.75; g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), TA.world.mat(0x2a2f38));
    legL.position.set(-0.18, 0.4, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    return g;
  };

  P.makeCarMesh = function (color, scale) {
    var s = scale || 1;
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.0 * s, 0.65 * s, 4.2 * s), TA.world.mat(color, { roughness: 0.35, metalness: 0.5 }));
    body.position.y = 0.55 * s; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7 * s, 0.6 * s, 2.0 * s), TA.world.mat(0x1a2028, { roughness: 0.2, metalness: 0.6 }));
    cabin.position.set(0, 1.15 * s, -0.2 * s); g.add(cabin);
    var wheelGeo = new THREE.CylinderGeometry(0.38 * s, 0.38 * s, 0.3 * s, 10);
    var wheelMat = TA.world.mat(0x111111, { roughness: 0.9 });
    [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]].forEach(function (w) {
      var wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(w[0] * s, 0.38 * s, w[1] * s);
      g.add(wheel);
    });
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    var l1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    l1.position.set(-0.6 * s, 0.6 * s, 2.12 * s); g.add(l1);
    var l2 = l1.clone(); l2.position.x = 0.6 * s; g.add(l2);
    return g;
  };

  P.makePlayerMesh = function () {
    var g = new THREE.Group();
    var jacket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.45), TA.world.mat(0x1f6f6f));
    jacket.position.y = 1.05; g.add(jacket);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), TA.world.mat(0xd8a878));
    head.position.y = 1.85; g.add(head);
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.62), TA.world.mat(0x222831));
    cap.position.y = 2.08; g.add(cap);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), TA.world.mat(0x2a2f38));
    legL.position.set(-0.2, 0.42, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.2; g.add(legR);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.24), TA.world.mat(0x1f6f6f));
    arm.position.set(0.52, 1.05, 0.15); arm.rotation.x = -0.9; g.add(arm);
    g.userData.arm = arm;
    return g;
  };

  P.spawnPlayer = function (x, z) {
    if (P.mesh) TA.scene.remove(P.mesh);
    P.mesh = P.makePlayerMesh();
    TA.scene.add(P.mesh);
    P.x = x; P.z = z; P.angle = 0; P.speed = 0; P.onFoot = true;
    P.mesh.position.set(x, 0, z);
    if (P.carMesh) { TA.scene.remove(P.carMesh); P.carMesh = null; }
    TA.state.inCar = false; TA.state.car = null; TA.state.speedKmh = 0;
  };

  P.spawnParkedCar = function (modelId, x, z, angle) {
    var model = null;
    for (var i = 0; i < TA.CAR_MODELS.length; i++) if (TA.CAR_MODELS[i].id === modelId) model = TA.CAR_MODELS[i];
    if (!model) model = TA.CAR_MODELS[0];
    var mesh = P.makeCarMesh(model.color, 1);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = angle || 0;
    TA.scene.add(mesh);
    var car = { model: model, mesh: mesh, x: x, z: z, angle: angle || 0, hp: 100, locked: true, speed: 0 };
    P.parkedCars.push(car);
    return car;
  };

  P.getCarCondition = function (car) {
    var c = car || TA.state.car;
    if (!c) return { name: '—', pct: 100, label: '100% PRIMA' };
    var pct = Math.max(0, Math.round(c.hp));
    var word = pct >= 80 ? 'PRIMA' : pct >= 50 ? 'RUSAK' : pct >= 25 ? 'PARAH' : 'HANCUR';
    return { name: c.model.name, pct: pct, label: pct + '% ' + word };
  };

  P.nearestParkedCar = function (maxDist) {
    var best = null, bestD = maxDist || 4;
    for (var i = 0; i < P.parkedCars.length; i++) {
      var c = P.parkedCars[i];
      var d = TA.dist2d(P.x, P.z, c.x, c.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  P.enterCar = function (car) {
    if (!car) return false;
    if (P.carMesh) TA.scene.remove(P.carMesh);
    P.carMesh = car.mesh;
    P.onFoot = false;
    TA.state.inCar = true;
    TA.state.car = car;
    TA.state.carHp = car.hp;
    P.x = car.x; P.z = car.z; P.angle = car.angle;
    if (P.mesh) P.mesh.visible = false;
    TA.audio.engineSound(0);
    return true;
  };

  P.exitCar = function () {
    if (P.onFoot) return;
    var car = TA.state.car;
    if (car) { car.x = P.x; car.z = P.z; car.angle = P.angle; car.hp = TA.state.carHp; }
    P.onFoot = true;
    TA.state.inCar = false;
    TA.state.car = null;
    TA.state.speedKmh = 0;
    P.x += Math.sin(P.angle + Math.PI / 2) * 2.2;
    P.z += Math.cos(P.angle + Math.PI / 2) * 2.2;
    if (P.mesh) { P.mesh.visible = true; P.mesh.position.set(P.x, 0, P.z); }
    TA.audio.engineSound(0);
  };

  P.jackCar = function (car) {
    // Tahan E: alarm, pengemudi kabur, wanted +1, lalu masuk mobil
    var s = TA.state;
    s.jackProgress += 1 / 60;
    if (s.jackProgress < 1.2) return false;
    s.jackProgress = 0;
    s.jackTarget = null;
    car.locked = false;
    s.stats.carsStolen++;
    TA.career.addXP(10, 'curi mobil');
    TA.police.setWanted(s.wanted + 1, 'curanmor');
    TA.crew.showCrewChatter('SARI', 'Bagus! Alarmnya mati. Jalan, jangan dilihatin!');
    TA.audio.alarmSound();
    P.enterCar(car);
    return true;
  };

  P.damageCar = function (n) {
    if (!TA.state.car) return;
    TA.state.carHp = TA.clamp(TA.state.carHp - n, 0, 100);
    TA.state.car.hp = TA.state.carHp;
    if (TA.state.carHp <= 0) {
      TA.audio.explosionSound();
      P.exitCar();
      TA.player.takeDamage(15);
    }
  };

  P.movePlayer = function (dt) {
    var k = TA.input.keys;
    var s = TA.state;
    if (P.onFoot) {
      var mx = 0, mz = 0;
      if (k['w']) mz -= 1;
      if (k['s']) mz += 1;
      if (k['a']) mx -= 1;
      if (k['d']) mx += 1;
      var len = Math.sqrt(mx * mx + mz * mz);
      P.moving = len > 0;
      if (len > 0) {
        mx /= len; mz /= len;
        var spd = k['shift'] ? 9 : 5.5;
        var nx = P.x + mx * spd * dt, nz = P.z + mz * spd * dt;
        if (!TA.world.collides(nx, P.z, 0.6)) P.x = nx;
        if (!TA.world.collides(P.x, nz, 0.6)) P.z = nz;
        P.angle = Math.atan2(mx, mz);
      }
      P.mesh.position.set(P.x, Math.abs(Math.sin(TA.time.elapsed * 10)) * (P.moving ? 0.06 : 0), P.z);
      P.mesh.rotation.y = P.angle;
      // Interaksi: mobil terdekat
      var car = P.nearestParkedCar(4);
      if (car) {
        if (car.locked) {
          TA.ui.showInteract('Tahan E untuk mencuri mobil');
          if (k['e']) { s.jackTarget = car; P.jackCar(car); }
          else s.jackProgress = 0;
        } else {
          TA.ui.showInteract('Tekan E untuk masuk mobil');
          if (k['e']) P.enterCar(car);
        }
      } else if (TA.dist2d(P.x, P.z, TA.world.safehouse.x, TA.world.safehouse.z) < 7) {
        TA.ui.showInteract('SAFEHOUSE — wanted perlahan turun · tekan E untuk sembunyi');
        if (k['e']) { TA.police.cooldownWanted(dt * 6); }
      } else if (TA.dist2d(P.x, P.z, TA.world.garagePos.x, TA.world.garagePos.z) < 8 && TA.state.car) {
        TA.ui.showInteract('BENGKEL — tekan E untuk perbaiki mobil ($' + P.repairCost() + ')');
        if (k['e']) P.repairCar();
      } else {
        TA.ui.hideInteract();
      }
    } else {
      // Mengemudi
      var car2 = TA.state.car;
      var bonus = TA.crew.getCrewBonus();
      var top = car2.model.topSpeed * bonus.speedMul / 3.6; // m/detik
      if (k['w']) P.speed += car2.model.accel * dt * (P.speed < 0 ? 2 : 1);
      else if (k['s']) P.speed -= car2.model.accel * 1.4 * dt;
      else P.speed -= Math.sign(P.speed) * 8 * dt;
      P.speed = TA.clamp(P.speed, -top * 0.35, top);
      if (Math.abs(P.speed) < 0.2 && !k['w'] && !k['s']) P.speed = 0;
      var steer = 0;
      if (k['a']) steer = 1;
      if (k['d']) steer = -1;
      var steerFactor = TA.clamp(Math.abs(P.speed) / 8, 0, 1);
      P.angle += steer * 1.9 * steerFactor * dt * Math.sign(P.speed || 1) * bonus.handling;
      var nx2 = P.x + Math.sin(P.angle) * P.speed * dt;
      var nz2 = P.z + Math.cos(P.angle) * P.speed * dt;
      if (TA.world.collides(nx2, nz2, 1.6)) {
        P.damageCar(Math.abs(P.speed) * 0.9);
        TA.audio.crash();
        P.speed *= -0.25;
      } else {
        P.x = nx2; P.z = nz2;
      }
      s.speedKmh = Math.round(Math.abs(P.speed) * 3.6);
      car2.x = P.x; car2.z = P.z; car2.angle = P.angle;
      car2.mesh.position.set(P.x, 0, P.z);
      car2.mesh.rotation.y = P.angle;
      TA.audio.engineSound(Math.abs(P.speed) / top);
      if (k['e']) P.exitCar();
      // Budi: mobil pulih pelan
      if (bonus.carRegen > 0 && s.carHp < 100) {
        s.carHp = Math.min(100, s.carHp + bonus.carRegen * dt);
        car2.hp = s.carHp;
      }
      TA.ui.hideInteract();
    }
  };

  P.update = function (dt) {
    if (TA.state.mode !== 'playing') return;
    P.movePlayer(dt);
    P.updateJobs();
    // Tracer memudar
    for (var i = P.tracers.length - 1; i >= 0; i--) {
      var t = P.tracers[i];
      t.life -= dt;
      if (t.life <= 0) { TA.scene.remove(t.mesh); P.tracers.splice(i, 1); }
      else t.mesh.material.opacity = t.life * 3;
    }
    // Regen armor Budi
    var bonus = TA.crew.getCrewBonus();
    if (bonus.armorRegen > 0 && TA.state.armor < 50) {
      TA.state.armor = Math.min(50, TA.state.armor + bonus.armorRegen * dt);
    }
    // Update posisi mesh pemain saat di mobil (kamera mengikuti P.x/P.z)
    if (!P.onFoot && P.carMesh) {
      P.carMesh.position.set(P.x, 0, P.z);
      P.carMesh.rotation.y = P.angle;
    }
  };

  P.switchWeapon = function (i) {
    var s = TA.state;
    if (i < 0 || i > 3) return;
    if (!s.weaponsOwned[i]) { TA.ui.flashWeapon('Belum dimiliki — beli di toko (B)'); return; }
    s.weapon = i;
    TA.ui.flashWeapon(TA.WEAPONS[i].name);
    TA.ui.showWeaponWheel();
  };

  P.weaponWheelOpen = false;
  P.shoot = function () {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    var now = TA.time.elapsed;
    var w = TA.WEAPONS[s.weapon];
    if (now - P.lastShot < w.rate) return;
    P.lastShot = now;
    s.stats.shotsFired++;
    TA.audio.gunshotSound(w.id);
    // Arah tembak: dari pemain ke arah mouse di layar
    var aimAngle = P.angle;
    var best = null, bestD = w.range;
    for (var i = 0; i < TA.enemies.length; i++) {
      var e = TA.enemies[i];
      if (e.hp <= 0) continue;
      var d = TA.dist2d(P.x, P.z, e.x, e.z);
      if (d < bestD) {
        var ang = Math.atan2(e.x - P.x, e.z - P.z);
        var diff = Math.abs(((ang - aimAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff < 0.6 || d < 6) { best = e; bestD = d; }
      }
    }
    // Tracer visual
    var endX = P.x + Math.sin(aimAngle) * (best ? bestD : w.range);
    var endZ = P.z + Math.cos(aimAngle) * (best ? bestD : w.range);
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(P.x, 1.4, P.z), new THREE.Vector3(endX, 1.2, endZ)
    ]);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 1 }));
    TA.scene.add(line);
    P.tracers.push({ mesh: line, life: 0.12 });
    if (best) {
      best.hp -= w.damage;
      if (best.hp <= 0) {
        best.dead = true;
        s.stats.enemiesDown++;
        TA.career.addXP(5, 'musuh dilumpuhkan');
        if (best.mesh) best.mesh.visible = false;
      }
    }
    // Tembakan menarik perhatian: wanted naik bila ada polisi dekat
    if (s.wanted < 2 && TA.police.nearestUnitDist() < 40) TA.police.setWanted(2, 'tembakan');
  };

  P.driveBy = function () { P.shoot(); };

  P.takeDamage = function (n) {
    var s = TA.state;
    var remaining = n;
    if (s.armor > 0) {
      var absorbed = Math.min(s.armor, remaining);
      s.armor -= absorbed; remaining -= absorbed;
    }
    s.hp -= remaining;
    TA.audio.hurtSound();
    if (s.hp <= 0) { s.hp = 0; TA.gameOver(); }
  };

  P.repairCost = function () {
    var bonus = TA.crew.getCrewBonus();
    var missing = 100 - TA.state.carHp;
    return Math.max(20, Math.round(missing * 1.5 * (1 - bonus.discount)));
  };

  P.repairCar = function () {
    var s = TA.state;
    if (!s.car) return false;
    var cost = P.repairCost();
    if (s.money < cost) { TA.ui.flashWeapon('Uang tidak cukup untuk perbaikan'); return false; }
    s.money -= cost;
    s.carHp = 100; s.car.hp = 100;
    TA.audio.repairSound();
    return true;
  };

  P.buyWeapon = function (index) {
    var s = TA.state;
    var w = TA.WEAPONS[index];
    if (!w || s.weaponsOwned[index]) return false;
    var bonus = TA.crew.getCrewBonus();
    var price = Math.round(w.price * (1 - bonus.discount));
    if (s.money < price) return false;
    s.money -= price;
    s.weaponsOwned[index] = true;
    s.weapon = index;
    TA.audio.buySound();
    return true;
  };

  P.buyArmor = function () {
    var s = TA.state;
    var bonus = TA.crew.getCrewBonus();
    var price = Math.round(200 * (1 - bonus.discount));
    if (s.money < price || s.armor >= s.maxArmor) return false;
    s.money -= price;
    s.armor = Math.min(s.maxArmor, s.armor + 50);
    TA.audio.buySound();
    return true;
  };

  /* ---------- Side jobs ---------- */
  P.tryTaxiJob = function () {
    var s = TA.state;
    if (!s.inCar || !s.car || s.car.model.id !== 'taxi') { TA.ui.flashWeapon('Butuh TAKSI KUNING untuk side job taksi'); return; }
    if (s.taxiJob) return;
    var d = TA.world.districtAt(P.x, P.z);
    var dest = TA.pick(TA.DISTRICTS);
    var job = {
      from: d.name, to: dest.name, state: 'pickup',
      px: TA.rand(-120, 120), pz: TA.rand(-120, 120),
      tx: TA.rand(-120, 120), tz: TA.rand(-120, 120),
      pay: 0
    };
    job.pay = Math.round(60 * TA.world.taxiPayMultiplier(d.id));
    s.taxiJob = job;
    TA.crew.showCrewChatter('SARI', 'Penumpang di ' + d.name + '. Jemput, jangan ngebut di depan polisi!');
  };

  P.tryPackageJob = function () {
    var s = TA.state;
    if (s.packageJob) return;
    var dest = TA.pick(TA.DISTRICTS);
    s.packageJob = { to: dest.name, tx: TA.rand(-140, 140), tz: TA.rand(-140, 140), state: 'deliver', pay: 45 };
    TA.ui.flashWeapon('Paket diterima — antar ke ' + dest.name);
  };

  P.updateJobs = function () {
    var s = TA.state;
    if (s.taxiJob) {
      var j = s.taxiJob;
      var tx = j.state === 'pickup' ? j.px : j.tx;
      var tz = j.state === 'pickup' ? j.pz : j.tz;
      if (TA.dist2d(P.x, P.z, tx, tz) < 8) {
        if (j.state === 'pickup') { j.state = 'dropoff'; TA.ui.flashWeapon('Penumpang naik — antar ke ' + j.to); }
        else {
          s.money += j.pay;
          s.stats.taxisDone++;
          TA.career.addXP(15, 'side job taksi');
          TA.world.updateDistrictStanding(TA.world.districtAt(P.x, P.z).id, 2);
          TA.ui.flashWeapon('Taksi selesai: +$' + j.pay);
          s.taxiJob = null;
        }
      }
    }
    if (s.packageJob) {
      var pj = s.packageJob;
      if (TA.dist2d(P.x, P.z, pj.tx, pj.tz) < 8) {
        s.money += pj.pay;
        s.stats.packagesDone++;
        TA.career.addXP(10, 'antar paket');
        TA.world.updateDistrictStanding(TA.world.districtAt(P.x, P.z).id, 1);
        TA.ui.flashWeapon('Paket terkirim: +$' + pj.pay);
        s.packageJob = null;
      }
    }
  };
})();
