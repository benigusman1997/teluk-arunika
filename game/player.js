// TELUK ARUNIKA v3 — player.js
// Jalan kaki + mengemudi, carjacking (tahan E), 4 senjata + weapon wheel,
// tembak, drive-by, HP/armor, beli senjata & armor.
(function () {
  'use strict';

  var P = TA.player = {};

  P.WEAPONS = [
    { name: 'Pistol', damage: 22, rate: 0.28, mag: 12, reload: 1.0, range: 90, spread: 0.012, auto: false, price: 0, owned: true },
    { name: 'SMG', damage: 13, rate: 0.09, mag: 32, reload: 1.4, range: 70, spread: 0.03, auto: true, price: 450, owned: false },
    { name: 'Shotgun', damage: 14, rate: 0.85, mag: 6, reload: 1.8, range: 34, spread: 0.09, auto: false, price: 650, owned: false, pellets: 7 },
    { name: 'Rifle', damage: 42, rate: 0.16, mag: 24, reload: 1.6, range: 160, spread: 0.006, auto: true, price: 950, owned: false }
  ];

  P.ammo = [];          // sisa peluru per senjata (di luar mag)
  P.mag = [];           // isi mag saat ini
  P.firing = false;
  P.fireTimer = 0;
  P.reloadTimer = 0;
  P.jackTarget = null;  // mobil yang sedang dicuri
  P.jackProgress = 0;
  P.jackHolding = false;
  P.muzzle = null;
  P.muzzleTimer = 0;
  P.tracer = null;
  P.tracerTimer = 0;

  P.initPlayer = function () {
    P.resetWeapons();
    // Lampu kilat moncong senjata.
    P.muzzle = new THREE.PointLight(0xffc860, 0, 18);
    TA.scene.add(P.muzzle);
    var tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    P.tracer = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 }));
    P.tracer.frustumCulled = false;
    P.tracer.visible = false; // baru ditampilkan saat menembak (hemat kompilasi awal)
    TA.scene.add(P.tracer);
    P.raycaster = new THREE.Raycaster();
  };

  P.resetWeapons = function () {
    P.ammo = [72, 96, 24, 72];
    P.mag = [12, 32, 6, 24];
    P.WEAPONS[0].owned = true;
    P.WEAPONS[1].owned = false;
    P.WEAPONS[2].owned = false;
    P.WEAPONS[3].owned = false;
    P.firing = false; P.fireTimer = 0; P.reloadTimer = 0;
  };

  P.saveWeapons = function () {
    return P.WEAPONS.map(function (w, i) {
      return { owned: w.owned, ammo: P.ammo[i], mag: P.mag[i] };
    });
  };

  P.loadWeapons = function (saved) {
    if (!saved) return;
    saved.forEach(function (s, i) {
      if (P.WEAPONS[i]) {
        P.WEAPONS[i].owned = !!s.owned;
        P.ammo[i] = s.ammo | 0;
        P.mag[i] = s.mag | 0;
      }
    });
  };

  P.currentWeapon = function () {
    return P.WEAPONS[TA.state.weaponIndex];
  };

  // ------------------------------------------------------------ gerak
  P.movePlayer = function (dt) {
    var s = TA.state;
    var k = TA.keys;
    // Putar kamera dari mouse / panah.
    if (TA.mouseDX || TA.mouseDY) {
      TA.pyaw -= TA.mouseDX * 0.0022;
      TA.ppitch = TA.clamp(TA.ppitch - TA.mouseDY * 0.0022, -1.2, 1.2);
      TA.mouseDX = 0; TA.mouseDY = 0;
    }
    if (k.ArrowLeft) TA.pyaw += 1.9 * dt;
    if (k.ArrowRight) TA.pyaw -= 1.9 * dt;
    if (k.ArrowUp) TA.ppitch = TA.clamp(TA.ppitch + 1.4 * dt, -1.2, 1.2);
    if (k.ArrowDown) TA.ppitch = TA.clamp(TA.ppitch - 1.4 * dt, -1.2, 1.2);

    if (s.inCar && TA.car) { P.driveCar(dt); return; }

    var sprint = k.ShiftLeft || k.ShiftRight;
    var speed = sprint ? 7.2 : 4.2;
    var fx = -Math.sin(TA.pyaw), fz = -Math.cos(TA.pyaw);
    var rx = Math.cos(TA.pyaw), rz = -Math.sin(TA.pyaw);
    var mx = 0, mz = 0;
    if (k.KeyW) { mx += fx; mz += fz; }
    if (k.KeyS) { mx -= fx; mz -= fz; }
    if (k.KeyD) { mx += rx; mz += rz; }
    if (k.KeyA) { mx -= rx; mz -= rz; }
    var len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) {
      mx /= len; mz /= len;
      var nx = TA.px + mx * speed * dt;
      var nz = TA.pz + mz * speed * dt;
      if (!TA.world.collides(nx, TA.pz, 0.6)) TA.px = nx;
      if (!TA.world.collides(TA.px, nz, 0.6)) TA.pz = nz;
    }
    s.speedKmh = len > 0 ? speed * 3.6 * (sprint ? 1 : 0.7) : 0;
  };

  P.driveCar = function (dt) {
    var s = TA.state;
    var car = TA.car;
    var k = TA.keys;
    // Shot 2: mobil kejar-kejaran dibekukan di posisi staging, speedometer tetap 86.
    if (TA.shot === 2) {
      car.speed = 24;
      s.speedKmh = 86;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
      return;
    }
    var bonus = TA.crew.getCrewBonus();
    var maxSpeed = 34 * bonus.speedMul; // ~122 km/jam dasar
    var accel = 16 * (bonus.speedMul > 1 ? 1.25 : 1);
    var gaspol = TA.state.timeMinutes >= 0 && performance.now() < s.gaspolUntil;
    if (gaspol) maxSpeed *= 1.6;
    if (k.KeyW || k.ArrowUp) car.speed += accel * dt;
    if (k.KeyS || k.ArrowDown) car.speed -= accel * 1.4 * dt;
    // Shot 2: mobil kejar-kejaran harus tetap ngebut untuk screenshot.
    if (!k.KeyW && !k.KeyS && TA.shot !== 2) car.speed = TA.lerp(car.speed, 0, 1 - Math.pow(0.05, dt));
    if (k.Space) car.speed = TA.lerp(car.speed, 0, 1 - Math.pow(0.0001, dt)); // rem tangan
    car.speed = TA.clamp(car.speed, -10, maxSpeed);
    var steer = 0;
    if (k.KeyA || k.ArrowLeft) steer = 1;
    if (k.KeyD || k.ArrowRight) steer = -1;
    var steerFactor = TA.clamp(Math.abs(car.speed) / 8, 0.25, 1) * (car.speed < 0 ? -1 : 1);
    car.heading += steer * 1.9 * steerFactor * dt * bonus.handling;
    var fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    var nx = car.x + fx * car.speed * dt;
    var nz = car.z + fz * car.speed * dt;
    if (TA.world.collides(nx, nz, 1.6)) {
      car.speed *= 0.35; // tabrakan: melambat drastis
      TA.audio.crashSound();
      if (Math.abs(car.speed) > 6) P.takeDamage(2, 'tabrakan');
    } else {
      car.x = nx; car.z = nz;
    }
    car.group.position.set(car.x, 0, car.z);
    car.group.rotation.y = car.heading;
    s.speedKmh = Math.abs(car.speed) * 3.6;
    // Budi: mobil pulih pelan-pelan.
    if (bonus.carRepair > 0 && car.hp < 100) car.hp = Math.min(100, car.hp + bonus.carRepair * dt);
    // Spike strip / roadblock memperlambat.
    if (TA.police.onSpikeStrip(car.x, car.z)) {
      car.speed *= 0.5;
      if (!car.spiked) { car.spiked = true; TA.ui.toast('Ban kena spike strip!'); TA.audio.crashSound(); }
    } else car.spiked = false;
    // Ledakan bila HP mobil habis.
    if (car.hp <= 0) P.explodeCar(car);
  };

  P.explodeCar = function (car) {
    TA.audio.explosionSound();
    TA.ui.toast('Mobil meledak!');
    var flash = new THREE.PointLight(0xff7722, 60, 40);
    flash.position.set(car.x, 2, car.z);
    TA.scene.add(flash);
    setTimeout(function () { TA.scene.remove(flash); }, 350);
    if (car === TA.car) P.exitCar(true);
    TA.scene.remove(car.group);
    var idx = TA.traffic.indexOf(car);
    if (idx >= 0) TA.traffic.splice(idx, 1);
  };

  // ------------------------------------------------------------ carjacking
  P.nearestCar = function (maxDist) {
    var best = null, bestD = maxDist;
    for (var i = 0; i < TA.traffic.length; i++) {
      var c = TA.traffic[i];
      if (c === TA.car || c.stolen) continue;
      var dx = c.x - TA.px, dz = c.z - TA.pz;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  P.tryEnterCar = function () {
    var s = TA.state;
    if (s.inCar) { P.exitCar(false); return; }
    var car = P.nearestCar(5);
    if (car && Math.abs(car.speed) < 1.5) {
      P.jackTarget = car;
      P.jackHolding = true;
      P.jackProgress = 0;
      TA.ui.showJackPrompt(true);
    }
  };

  P.cancelJack = function () {
    P.jackHolding = false;
    P.jackProgress = 0;
    TA.ui.showJackPrompt(false);
  };

  P.updateJack = function (dt) {
    if (!P.jackHolding || !P.jackTarget) return;
    var car = P.jackTarget;
    var dx = car.x - TA.px, dz = car.z - TA.pz;
    if (Math.sqrt(dx * dx + dz * dz) > 6 || Math.abs(car.speed) > 2) {
      P.cancelJack();
      return;
    }
    P.jackProgress += dt / 0.9; // tahan E ~0,9 detik
    TA.ui.setJackProgress(P.jackProgress);
    if (P.jackProgress >= 1) {
      P.jackHolding = false;
      TA.ui.showJackPrompt(false);
      P.jackCar(car);
    }
  };

  P.jackCar = function (car) {
    var s = TA.state;
    // Pengemudi kabur (jadi pejalan kaki panik).
    TA.world.scarePedestrians(car.x, car.z, 8);
    car.stolen = true;
    car.driver = null;
    TA.car = car;
    s.inCar = true;
    s.carsStolen++;
    TA.police.setWanted(Math.min(5, s.wanted + 1));
    TA.career.addXP(10);
    TA.ui.toast('Mobil dicuri! Wanted +1 — bawa ke garasi untuk ganti warna.');
    TA.audio.alarmSound();
    TA.audio.initAudio();
  };

  P.enterCar = function (car) {
    TA.car = car;
    TA.state.inCar = true;
  };

  P.exitCar = function (destroyed) {
    var s = TA.state;
    if (!TA.car) return;
    if (!destroyed) {
      var h = TA.car.heading;
      TA.px = TA.car.x - Math.sin(h) * 3;
      TA.pz = TA.car.z - Math.cos(h) * 3;
      TA.pyaw = h;
    }
    TA.car = null;
    s.inCar = false;
    s.speedKmh = 0;
  };

  // ------------------------------------------------------------ senjata
  P.switchWeapon = function (i) {
    var w = P.WEAPONS[i];
    if (!w || !w.owned) {
      if (w) TA.ui.toast(w.name + ' belum dibeli — kunjungi toko senjata.');
      return;
    }
    TA.state.weaponIndex = i;
    P.fireTimer = 0;
    TA.ui.renderHUD(true);
    TA.audio.clickSound();
  };

  P.startFiring = function () {
    if (TA.state.mode !== 'playing') return;
    P.firing = true;
    if (!P.currentWeapon().auto) P.shootOnce();
  };

  P.stopFiring = function () { P.firing = false; };

  P.updateWeapon = function (dt) {
    if (P.reloadTimer > 0) {
      P.reloadTimer -= dt;
      if (P.reloadTimer <= 0) P.finishReload();
    }
    if (P.muzzleTimer > 0) { P.muzzleTimer -= dt; P.muzzle.intensity = Math.max(0, P.muzzleTimer * 60); }
    if (P.tracerTimer > 0) {
      P.tracerTimer -= dt;
      P.tracer.material.opacity = Math.max(0, P.tracerTimer * 8);
      if (P.tracerTimer <= 0) P.tracer.visible = false;
    }
    if (P.firing && P.currentWeapon().auto) {
      P.fireTimer -= dt;
      if (P.fireTimer <= 0) P.shootOnce();
    }
  };

  P.shootOnce = function () {
    var s = TA.state;
    var w = P.currentWeapon();
    if (P.reloadTimer > 0 || s.mode !== 'playing') return;
    var wi = s.weaponIndex;
    if (P.mag[wi] <= 0) { P.startReload(); return; }
    P.mag[wi]--;
    P.fireTimer = w.rate;
    // Arah tembak dari kamera (tengah layar) + spread.
    var pellets = w.pellets || 1;
    var hitAny = false;
    for (var p = 0; p < pellets; p++) {
      var dir = new THREE.Vector3();
      TA.camera.getWorldDirection(dir);
      dir.x += (TA.rng() - 0.5) * w.spread * 2;
      dir.y += (TA.rng() - 0.5) * w.spread * 2;
      dir.z += (TA.rng() - 0.5) * w.spread * 2;
      dir.normalize();
      P.raycaster.set(TA.camera.position, dir);
      P.raycaster.far = w.range;
      var targets = [];
      TA.enemies.forEach(function (e) { if (e.alive) targets.push(e.group); });
      TA.traffic.forEach(function (c) { if (c !== TA.car) targets.push(c.group); });
      var hits = P.raycaster.intersectObjects(targets, true);
      var end = TA.camera.position.clone().add(dir.clone().multiplyScalar(w.range));
      if (hits.length > 0) {
        var h = hits[0];
        end = h.point.clone();
        var obj = h.object;
        while (obj && !obj.userData.enemy && !obj.userData.car) obj = obj.parent;
        if (obj && obj.userData.enemy) {
          var enemy = obj.userData.enemy;
          enemy.hp -= w.damage;
          hitAny = true;
          if (enemy.hp <= 0) P.killEnemy(enemy);
          else TA.ui.toast('Kena! ' + enemy.name + ' HP ' + Math.max(0, Math.round(enemy.hp)));
        } else if (obj && obj.userData.car) {
          var car = obj.userData.car;
          car.hp -= w.damage * 0.6;
          if (car.hp <= 0) P.explodeCar(car);
          else TA.police.setWanted(Math.min(5, s.wanted + 1));
        }
      }
      if (p === 0) P.showShotEffects(end);
    }
    if (hitAny) TA.audio.hitSound();
    TA.audio.gunshotSound(w.name);
    TA.world.scarePedestrians(TA.px, TA.pz, 30);
    // Tembakan menaikkan wanted bila polisi dekat.
    if (s.wanted < 2 && TA.rng() < 0.5) TA.police.setWanted(Math.max(s.wanted, 1));
    if (P.mag[wi] <= 0) P.startReload();
    TA.ui.renderHUD(true);
  };

  P.showShotEffects = function (end) {
    var start = TA.camera.position.clone();
    if (!TA.state.inCar) {
      start.add(new THREE.Vector3(-Math.sin(TA.pyaw) * 0.4, -0.25, -Math.cos(TA.pyaw) * 0.4));
    }
    var pos = P.tracer.geometry.attributes.position;
    pos.setXYZ(0, start.x, start.y, start.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    P.tracer.visible = true;
    P.tracer.material.opacity = 0.9;
    P.tracerTimer = 0.08;
    P.muzzle.position.copy(start);
    P.muzzle.intensity = 24;
    P.muzzleTimer = 0.07;
  };

  P.startReload = function () {
    var wi = TA.state.weaponIndex;
    var w = P.WEAPONS[wi];
    if (P.ammo[wi] <= 0 || P.mag[wi] >= w.mag) return;
    P.reloadTimer = w.reload;
    TA.ui.setReloading(true);
  };

  P.finishReload = function () {
    var wi = TA.state.weaponIndex;
    var w = P.WEAPONS[wi];
    var need = w.mag - P.mag[wi];
    var take = Math.min(need, P.ammo[wi]);
    P.mag[wi] += take;
    P.ammo[wi] -= take;
    TA.ui.setReloading(false);
    TA.audio.clickSound();
    TA.ui.renderHUD(true);
  };

  P.killEnemy = function (enemy) {
    enemy.alive = false;
    TA.state.kills++;
    TA.state.missionKills++;
    // Jatuh.
    enemy.group.rotation.x = -Math.PI / 2;
    enemy.group.position.y = 0.4;
    setTimeout(function () {
      TA.scene.remove(enemy.group);
      var i = TA.enemies.indexOf(enemy);
      if (i >= 0) TA.enemies.splice(i, 1);
    }, 4000);
    TA.audio.hitSound();
  };

  // Drive-by: tembak dari jendela mobil (kamera kejar tetap dipakai).
  P.driveBy = function () { P.shootOnce(); };

  P.takeDamage = function (amount, source) {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    var remaining = amount;
    if (s.armor > 0) {
      var absorbed = Math.min(s.armor, remaining * 0.7);
      s.armor -= absorbed;
      remaining -= absorbed;
    }
    s.hp -= remaining;
    TA.ui.flashDamage();
    TA.audio.hurtSound();
    if (s.hp <= 0) {
      s.hp = 0;
      TA.gameOver();
    }
    TA.ui.renderHUD(true);
  };

  P.buyWeapon = function (i) {
    var s = TA.state;
    var w = P.WEAPONS[i];
    var discount = TA.crew.getCrewBonus().discount;
    var price = Math.round(w.price * (1 - discount));
    if (w.owned) { TA.ui.toast(w.name + ' sudah dimiliki.'); return false; }
    if (s.money < price) { TA.ui.toast('Uang tidak cukup untuk ' + w.name + ' (' + TA.fmtMoney(price) + ').'); return false; }
    s.money -= price;
    w.owned = true;
    P.ammo[i] += w.mag * 2;
    TA.ui.toast(w.name + ' dibeli! Tekan ' + (i + 1) + ' untuk memakai.');
    TA.ui.renderHUD(true);
    return true;
  };

  P.buyArmor = function () {
    var s = TA.state;
    var discount = TA.crew.getCrewBonus().discount;
    var price = Math.round(200 * (1 - discount));
    if (s.money < price) { TA.ui.toast('Uang tidak cukup untuk armor (' + TA.fmtMoney(price) + ').'); return false; }
    if (s.armor >= s.maxArmor) { TA.ui.toast('Armor sudah penuh.'); return false; }
    s.money -= price;
    s.armor = s.maxArmor;
    TA.ui.toast('Armor penuh — ' + TA.fmtMoney(price));
    TA.ui.renderHUD(true);
    return true;
  };
})();
