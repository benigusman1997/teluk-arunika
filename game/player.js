// player.js — on-foot movement + driving, carjacking (hold E), 4 weapons, HP/armor, car models + condition.
(function () {
  'use strict';
  var TA = window.TA;

  var CAR_MODELS = {
    'sedan-1': { name: 'ARUNIKA SEDAN', topSpeed: 120, color: 0xc0c0c0 },
    'gt-1': { name: 'PELABUHAN GT', topSpeed: 165, color: 0xb03030 },
    'taxi-1': { name: 'TAKSI KUNING', topSpeed: 110, color: 0xd8a020 },
    'van-1': { name: 'PASAR VAN', topSpeed: 95, color: 0x2a6db0 },
    'coupe-1': { name: 'NEON COUPE', topSpeed: 150, color: 0x8040a0 },
  };
  var WEAPONS = {
    1: { name: 'PISTOL', damage: 20, rate: 0.35, range: 60 },
    2: { name: 'SMG', damage: 12, rate: 0.09, range: 50 },
    3: { name: 'SHOTGUN', damage: 45, rate: 0.9, range: 25 },
    4: { name: 'RIFLE', damage: 35, rate: 0.18, range: 120 },
  };
  var carCondition = { 'sedan-1': 62, 'gt-1': 88, 'taxi-1': 71, 'van-1': 55, 'coupe-1': 79 };
  var playerCarMesh = null;
  var jackProgress = 0;
  var lastShot = 0;
  var carSpeed = 0;

  function getCarCondition(carId) { return carCondition[carId] != null ? carCondition[carId] : 100; }
  function damageCar(carId, amount) {
    carCondition[carId] = Math.max(5, getCarCondition(carId) - amount);
    if (carCondition[carId] <= 15) TA.ui.toast('Mobil hampir hancur! Cari bengkel.');
  }
  function repairCar(carId) { carCondition[carId] = 100; }

  function movePlayer(dt) {
    var s = TA.state;
    var speed = s.inCar ? 0 : (TA.keys.ShiftLeft || TA.keys.ShiftRight ? 7 : 4);
    // mouse look
    TA.yaw -= TA.mouse.dx * 0.0022; TA.pitch -= TA.mouse.dy * 0.0022;
    TA.pitch = Math.max(-1.2, Math.min(1.2, TA.pitch));
    TA.mouse.dx = 0; TA.mouse.dy = 0;
    var fx = -Math.sin(TA.yaw), fz = -Math.cos(TA.yaw);
    var rx = Math.cos(TA.yaw), rz = -Math.sin(TA.yaw);
    var mx = 0, mz = 0;
    if (TA.keys.KeyW) { mx += fx; mz += fz; }
    if (TA.keys.KeyS) { mx -= fx; mz -= fz; }
    if (TA.keys.KeyA) { mx -= rx; mz -= rz; }
    if (TA.keys.KeyD) { mx += rx; mz += rz; }
    if (s.inCar) {
      driveCar(dt, fx, fz);
    } else {
      var len = Math.hypot(mx, mz) || 1;
      TA.playerPos.x += (mx / len) * speed * dt * (mx || mz ? 1 : 0);
      TA.playerPos.z += (mz / len) * speed * dt * (mx || mz ? 1 : 0);
      TA.playerPos.x = Math.max(-150, Math.min(150, TA.playerPos.x));
      TA.playerPos.z = Math.max(-150, Math.min(150, TA.playerPos.z));
      TA.camera.position.set(TA.playerPos.x, 1.7, TA.playerPos.z);
      TA.camera.rotation.set(TA.pitch, TA.yaw, 0, 'YXZ');
    }
    // district tracking
    var d = TA.world.getDistrictAt(TA.playerPos.x, TA.playerPos.z);
    if (d !== s.currentDistrict) {
      s.currentDistrict = d;
      TA.ui.renderLocationBanner();
    }
    // jacking progress while E held near a traffic car
    if (TA.keys.KeyE && !s.inCar) {
      var near = nearestCar();
      if (near) {
        jackProgress += dt;
        TA.ui.showInteract('Tahan E… menarik pengemudi (' + Math.round(jackProgress / 1.2 * 100) + '%)');
        if (jackProgress >= 1.2) { jackProgress = 0; completeJack(near); }
      }
    } else jackProgress = 0;
  }

  function nearestCar() {
    var best = null, bestD = 6;
    TA.world.TRAFFIC_CARS.forEach(function (c, i) {
      var d = Math.hypot(c.mesh.position.x - TA.playerPos.x, c.mesh.position.z - TA.playerPos.z);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function driveCar(dt, fx, fz) {
    var s = TA.state;
    var model = CAR_MODELS[s.carId] || CAR_MODELS['sedan-1'];
    var bonus = TA.crew.getCrewBonus();
    var top = model.topSpeed * bonus.speedMul;
    var accel = TA.keys.KeyW ? 28 : (TA.keys.KeyS ? -18 : 0);
    carSpeed += accel * dt;
    if (!TA.keys.KeyW && !TA.keys.KeyS) carSpeed *= (1 - 0.8 * dt);
    carSpeed = Math.max(-30, Math.min(top / 3.6, carSpeed));
    if (TA.keys.KeyA) TA.yaw += 1.6 * dt * (carSpeed > 0 ? 1 : -1) * bonus.handling;
    if (TA.keys.KeyD) TA.yaw -= 1.6 * dt * (carSpeed > 0 ? 1 : -1) * bonus.handling;
    var nx = -Math.sin(TA.yaw), nz = -Math.cos(TA.yaw);
    TA.playerPos.x += nx * carSpeed * dt;
    TA.playerPos.z += nz * carSpeed * dt;
    TA.playerPos.x = Math.max(-150, Math.min(150, TA.playerPos.x));
    TA.playerPos.z = Math.max(-150, Math.min(150, TA.playerPos.z));
    s.speedKmh = Math.round(Math.abs(carSpeed) * 3.6);
    if (playerCarMesh) {
      playerCarMesh.position.set(TA.playerPos.x, 0, TA.playerPos.z);
      playerCarMesh.rotation.y = TA.yaw + Math.PI;
    }
    TA.camera.position.set(TA.playerPos.x - nx * 0, 2.6, TA.playerPos.z);
    TA.camera.position.y = 2.6;
    TA.camera.rotation.set(-0.12 + TA.pitch * 0.4, TA.yaw, 0, 'YXZ');
    // crash into buildings/traffic damages the car
    TA.world.TRAFFIC_CARS.forEach(function (c) {
      var d = Math.hypot(c.mesh.position.x - TA.playerPos.x, c.mesh.position.z - TA.playerPos.z);
      if (d < 3.4 && Math.abs(carSpeed) > 8) { damageCar(s.carId, 4); carSpeed *= 0.4; TA.audio.gunshotSound(0.2); }
    });
  }

  function enterCar(carId) {
    var s = TA.state;
    if (!CAR_MODELS[carId]) carId = 'sedan-1';
    s.inCar = true; s.carId = carId;
    if (playerCarMesh) TA.scene.remove(playerCarMesh);
    playerCarMesh = TA.world.makeCarMesh(CAR_MODELS[carId].color);
    playerCarMesh.position.set(TA.playerPos.x, 0, TA.playerPos.z);
    TA.scene.add(playerCarMesh);
    TA.ui.renderHUD();
  }
  function exitCar() {
    var s = TA.state;
    s.inCar = false; s.speedKmh = 0; carSpeed = 0;
    if (playerCarMesh) { TA.scene.remove(playerCarMesh); playerCarMesh = null; }
    TA.playerPos.z += 3;
    TA.ui.renderHUD();
  }

  function jackCar() {
    var s = TA.state;
    if (s.inCar) { exitCar(); return; }
    var near = nearestCar();
    if (near == null) { TA.ui.toast('Tidak ada mobil di dekatmu.'); return; }
    TA.ui.showInteract('Tahan E untuk jack mobil…');
  }
  function completeJack(carIndex) {
    var s = TA.state;
    var ids = Object.keys(CAR_MODELS);
    var carId = ids[carIndex % ids.length];
    var traffic = TA.world.TRAFFIC_CARS[carIndex];
    if (traffic) { TA.scene.remove(traffic.mesh); TA.world.TRAFFIC_CARS.splice(carIndex, 1); }
    TA.police.setWanted(Math.min(5, s.wanted + 1));
    s.carsStolen++;
    TA.career.addXP(10);
    TA.ui.toast('Mobil dicuri! Wanted +1 — bawa ke garage untuk ganti warna.');
    TA.audio.sirenSound();
    enterCar(carId);
  }

  function switchWeapon(n) {
    TA.state.weapon = n;
    TA.ui.renderHUD();
    TA.ui.toggleWeaponWheel(false);
  }

  function shoot() {
    var now = performance.now() / 1000;
    var w = WEAPONS[TA.state.weapon];
    if (now - lastShot < w.rate) return;
    lastShot = now;
    if (TA.state.ammo[TA.state.weapon] <= 0) { TA.ui.toast('Amunisi habis! Beli di toko senjata.'); return; }
    TA.state.ammo[TA.state.weapon]--;
    TA.audio.gunshotSound(1);
    // tracer flash
    var dir = new THREE.Vector3(); TA.camera.getWorldDirection(dir);
    var start = TA.camera.position.clone();
    var end = start.clone().add(dir.multiplyScalar(w.range));
    var geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd23e }));
    TA.scene.add(line);
    setTimeout(function () { TA.scene.remove(line); }, 60);
    // muzzle flash light
    var flash = new THREE.PointLight(0xffc040, 2, 12);
    flash.position.copy(start); TA.scene.add(flash);
    setTimeout(function () { TA.scene.remove(flash); }, 50);
    // hit check vs nearest pedestrian/enemy: simple proximity kill
    TA.world.PEDESTRIANS.forEach(function (p) {
      var d = Math.hypot(p.mesh.position.x - TA.playerPos.x, p.mesh.position.z - TA.playerPos.z);
      if (d < w.range * 0.4) { p.fleeing = true; }
    });
    TA.missions.checkObjective('shoot');
    if (TA.state.wanted < 2) TA.police.setWanted(2);
    TA.ui.renderHUD();
  }

  function driveBy() { if (TA.state.inCar) shoot(); }

  function takeDamage(amount) {
    var s = TA.state;
    var absorbed = Math.min(s.armor, amount);
    s.armor -= absorbed;
    s.hp -= (amount - absorbed);
    TA.ui.renderHUD();
    if (s.hp <= 0) TA.core.gameOver();
  }

  function buyWeapon(n) {
    var prices = { 1: 0, 2: 800, 3: 1200, 4: 2000 };
    var s = TA.state;
    if (s.money < prices[n]) { TA.ui.toast('Uang tidak cukup.'); return false; }
    s.money -= prices[n];
    s.ammo[n] = (s.ammo[n] || 0) + (n === 1 ? 24 : 30);
    TA.ui.renderHUD(); return true;
  }
  function buyArmor() {
    var s = TA.state;
    var price = Math.round(500 * (TA.crew.getCrewBonus().shopDiscount ? 0.8 : 1));
    if (s.money < price) { TA.ui.toast('Uang tidak cukup.'); return false; }
    s.money -= price; s.armor = Math.min(100 + (TA.career.getRank().armorBonus || 0), s.armor + 50);
    TA.ui.renderHUD(); return true;
  }

  TA.player = {
    CAR_MODELS: CAR_MODELS, WEAPONS: WEAPONS,
    movePlayer: movePlayer, enterCar: enterCar, exitCar: exitCar,
    jackCar: jackCar, completeJack: completeJack, shoot: shoot, driveBy: driveBy,
    switchWeapon: switchWeapon, takeDamage: takeDamage,
    buyWeapon: buyWeapon, buyArmor: buyArmor,
    getCarCondition: getCarCondition, damageCar: damageCar, repairCar: repairCar,
  };
})();
