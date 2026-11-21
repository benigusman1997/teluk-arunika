/* player.js — jalan kaki + mengemudi, carjacking, 6 senjata + weapon wheel */
(function () {
  'use strict';
  var TA = window.TA;
  TA.player = TA.player || {};

  var WEAPONS = [
    { name: 'Tinju', key: 1, mag: Infinity, reserve: Infinity, dmg: 15, range: 40 },
    { name: 'Pistol', key: 2, mag: 12, reserve: 48, dmg: 25, range: 320 },
    { name: 'SMG', key: 3, mag: 30, reserve: 60, dmg: 14, range: 300 },
    { name: 'Shotgun', key: 4, mag: 6, reserve: 18, dmg: 45, range: 200 },
    { name: 'Rifle', key: 5, mag: 10, reserve: 30, dmg: 40, range: 520 },
    { name: 'Pemburu', key: 6, mag: 5, reserve: 15, dmg: 90, range: 700 }
  ];
  TA.player.WEAPONS = WEAPONS;

  var CAR_MODELS = [
    { name: 'ARUNIKA SEDAN', color: '#c0392b', top: 150, tune: 'STANDAR' },
    { name: 'PELABUHAN GT', color: '#2980b9', top: 185, tune: 'SPORT' },
    { name: 'TAKSI KUNING', color: '#f1c40f', top: 130, tune: 'TAKSI' },
    { name: 'GANG NEON LOW', color: '#8e44ad', top: 165, tune: 'LOWRIDER' },
    { name: 'PANTAI CRUISER', color: '#16a085', top: 140, tune: 'CRUISER' }
  ];
  TA.player.CAR_MODELS = CAR_MODELS;

  var ammo = {};
  var shotsFired = 0;
  var jackProgress = 0;
  var jackTarget = null;
  var muzzleT = 0;

  function resetAmmo() {
    ammo = {};
    for (var i = 0; i < WEAPONS.length; i++) {
      ammo[i] = { mag: WEAPONS[i].mag, reserve: WEAPONS[i].reserve };
    }
  }
  resetAmmo();
  TA.player.resetAmmo = resetAmmo;

  function ammoText(i) {
    var a = ammo[i];
    if (!isFinite(a.mag)) return '∞';
    return a.mag + '/' + a.reserve;
  }
  TA.player.ammoText = ammoText;

  function currentWeapon() { return WEAPONS[TA.S.weapon]; }

  function switchWeapon(i) {
    if (i < 0 || i >= WEAPONS.length) return;
    TA.S.weapon = i;
    TA.ui.renderWeaponWheel();
    TA.ui.showToast('Senjata: ' + WEAPONS[i].name + ' — ' + ammoText(i));
  }
  function toggleWeaponWheel() {
    TA.S.wheelOpen = !TA.S.wheelOpen;
    TA.ui.renderWeaponWheel();
  }

  function getCarCondition() {
    if (!TA.S.car) return 100;
    return Math.max(0, Math.round(TA.S.car.condition));
  }

  function enterCar(car) {
    TA.S.inCar = true;
    TA.S.onFoot = false;
    TA.S.car = car;
    TA.S.speed = 0;
    TA.ui.showToast('Masuk ' + car.name + ' — E untuk keluar');
  }

  function exitCar() {
    if (!TA.S.car) return;
    TA.S.inCar = false;
    TA.S.onFoot = true;
    TA.S.px += 30; TA.S.py += 10;
    TA.S.speed = 0;
    TA.S.car = null;
    TA.ui.showToast('Raka turun dari mobil.');
  }

  function jackCar() {
    // cari mobil AI terdekat
    var best = null, bd = 120;
    var list = TA.world.traffic();
    for (var i = 0; i < list.length; i++) {
      var d = TA.dist(TA.S.px, TA.S.py, list[i].x, list[i].y);
      if (d < bd) { bd = d; best = list[i]; }
    }
    if (!best) { TA.ui.showToast('Tidak ada mobil di dekat sini.'); return; }
    var model = CAR_MODELS[Math.floor(Math.random() * CAR_MODELS.length)];
    var car = { name: model.name, color: model.color, top: model.top, tune: model.tune, condition: 62 + Math.random() * 38, x: best.x, y: best.y, dir: best.dir };
    list.splice(list.indexOf(best), 1);
    TA.S.carsStolen++;
    TA.police.setWanted(Math.min(5, TA.S.wanted + 1), 'PENCURIAN MOBIL');
    TA.career.addXP(10, 'Curi mobil');
    enterCar(car);
    TA.ui.showToast('Mobil dicuri: ' + car.name + ' — wanted naik!');
    TA.crew.showChatter('SARI', 'Mobil bagus! Aku yang nyetir kalau kamu mau, Raka.');
  }

  function tryEnterExitCar() {
    if (TA.S.inCar) { exitCar(); return; }
    jackCar();
  }

  function buyWeapon(i) {
    var prices = [0, 500000, 1200000, 1500000, 2500000, 4000000];
    if (TA.S.money < prices[i]) { TA.ui.showToast('Uang tidak cukup untuk ' + WEAPONS[i].name + '.'); return false; }
    TA.S.money -= prices[i];
    ammo[i].reserve += WEAPONS[i].reserve;
    TA.ui.showToast(WEAPONS[i].name + ' dibeli — amunisi +' + WEAPONS[i].reserve + '.');
    return true;
  }
  function buyAmmo(i) {
    var cost = 80000;
    if (TA.S.money < cost) { TA.ui.showToast('Uang tidak cukup untuk amunisi.'); return false; }
    TA.S.money -= cost;
    ammo[i].reserve += WEAPONS[i].mag * 2;
    TA.ui.showToast('Amunisi ' + WEAPONS[i].name + ' +' + (WEAPONS[i].mag * 2) + '.');
    return true;
  }
  function buyArmor() {
    var cost = 300000;
    if (TA.S.money < cost) { TA.ui.showToast('Uang tidak cukup untuk armor.'); return false; }
    TA.S.money -= cost;
    TA.S.armor = Math.min(TA.career.maxArmor(), TA.S.armor + 50);
    TA.ui.showToast('Armor +50.');
    return true;
  }

  function takeDamage(n) {
    var rem = n;
    if (TA.S.armor > 0) {
      var absorbed = Math.min(TA.S.armor, rem);
      TA.S.armor -= absorbed; rem -= absorbed;
    }
    TA.S.hp -= rem;
    if (TA.S.hp <= 0) {
      TA.S.hp = 0;
      TA.gameOver();
    }
  }

  function aimAngle() {
    var W = TA.canvas.width, H = TA.canvas.height;
    var sx = W / 2, sy = H / 2;
    return Math.atan2(TA.S.mouseY - sy, TA.S.mouseX - sx);
  }

  function shoot() {
    if (TA.S.screen !== 'playing') return;
    var w = currentWeapon();
    var a = ammo[TA.S.weapon];
    if (isFinite(a.mag)) {
      if (a.mag <= 0) {
        if (a.reserve > 0) {
          var reload = Math.min(w.mag, a.reserve);
          a.mag = reload; a.reserve -= reload;
          TA.ui.showToast(w.name + ' — reload ' + reload + ' peluru.');
        } else {
          TA.ui.showToast(w.name + ' — amunisi habis! Beli di toko senjata.');
        }
        return;
      }
      a.mag--;
    }
    shotsFired++;
    muzzleT = 0.08;
    TA.S.angle = aimAngle();
    TA.audio.gunshotSound(w.name);
    TA.police.onShotFired();
    // tembak penjaga bank / musuh terdekat dalam jangkauan & arah
    var hit = TA.missions.tryHitEnemy(TA.S.px, TA.S.py, TA.S.angle, w.range, w.dmg);
    if (!hit && TA.S.inCar) {
      // drive-by: tembak dari mobil, radius lebih lebar
      TA.missions.tryHitEnemy(TA.S.px, TA.S.py, TA.S.angle, w.range + 60, Math.floor(w.dmg * 0.7));
    }
    if (TA.S.race && TA.S.race.active) { /* balapan: tembakan tidak dihitung */ }
  }

  function driveBy() { shoot(); }

  function update(dt) {
    var S = TA.S;
    var k = TA.keys;
    var run = k['shift'] ? 1.6 : 1;
    var mx = 0, my = 0;
    if (k['w'] || k['arrowup']) my -= 1;
    if (k['s'] || k['arrowdown']) my += 1;
    if (k['a'] || k['arrowleft']) mx -= 1;
    if (k['d'] || k['arrowright']) mx += 1;
    if (S.inCar && S.car) {
      var accel = 0;
      if (k['w'] || k['arrowup']) accel = 1;
      if (k['s'] || k['arrowdown']) accel = -0.6;
      var bonus = TA.crew.getCrewBonus();
      var top = S.car.top * (1 + bonus.speed);
      S.speed += accel * 220 * dt;
      if (accel === 0) S.speed -= Math.sign(S.speed) * 120 * dt;
      if (Math.abs(S.speed) < 2 && accel === 0) S.speed = 0;
      S.speed = TA.clamp(S.speed, -60, top);
      if (mx !== 0 && Math.abs(S.speed) > 5) {
        S.angle += mx * 1.9 * dt * Math.sign(S.speed);
      }
      S.px += Math.cos(S.angle) * S.speed * dt;
      S.py += Math.sin(S.angle) * S.speed * dt;
      S.px = TA.clamp(S.px, 40, TA.world.WORLD_W - 40);
      S.py = TA.clamp(S.py, 40, TA.world.WORLD_H - 40);
      if (Math.abs(S.speed) > 120 && Math.random() < dt * 0.3) {
        // tabrakan ringan sesekali di kecepatan tinggi
        S.car.condition = Math.max(20, S.car.condition - 0.4);
      }
      if (S.car.condition < 35 && Math.random() < dt * 0.05) {
        TA.ui.showToast('Mobil rusak parah (' + getCarCondition() + '%) — ke bengkel Pak Amir!');
      }
      // koin & ramp saat berkendara
      checkPickups();
    } else {
      var sp = 150 * run;
      if (mx !== 0 || my !== 0) {
        var len = Math.sqrt(mx * mx + my * my);
        S.px += (mx / len) * sp * dt;
        S.py += (my / len) * sp * dt;
        S.angle = Math.atan2(my, mx);
        S.px = TA.clamp(S.px, 40, TA.world.WORLD_W - 40);
        S.py = TA.clamp(S.py, 40, TA.world.WORLD_H - 40);
      }
      S.speed = (mx !== 0 || my !== 0) ? sp * 0.036 : 0;
      checkPickups();
      // tahan E dekat mobil = jack (handled by keydown tryEnterExitCar)
    }
    if (muzzleT > 0) muzzleT -= dt;
    if (S.shooting && TA.S.screen === 'playing' && shotsFired % 12 === 0) { /* auto-fire ritme */ }
    // regen armor pelan dari Budi
    var b = TA.crew.getCrewBonus();
    if (b.armorRegen > 0 && S.armor < TA.career.maxArmor()) {
      S.armor = Math.min(TA.career.maxArmor(), S.armor + b.armorRegen * dt);
    }
    if (S.car && b.carRepair > 0) {
      S.car.condition = Math.min(100, S.car.condition + b.carRepair * dt);
    }
  }

  function checkPickups() {
    var list = TA.world.stashes();
    for (var i = 0; i < list.length; i++) {
      if (!list[i].taken && TA.dist(TA.S.px, TA.S.py, list[i].x, list[i].y) < 34) {
        TA.world.collectStash(list[i].id);
      }
    }
    var ramps = TA.world.ramps();
    for (var j = 0; j < ramps.length; j++) {
      if (!ramps[j].done && TA.dist(TA.S.px, TA.S.py, ramps[j].x, ramps[j].y) < 40 && TA.S.inCar && Math.abs(TA.S.speed) > 90) {
        TA.world.registerStuntJump(ramps[j].id);
      }
    }
  }

  function draw(ctx, W, H) {
    var S = TA.S;
    var p = TA.world.worldToScreen(S.px, S.py, W, H);
    if (S.inCar && S.car) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(S.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-22, -9, 48, 26);
      ctx.fillStyle = S.car.color;
      ctx.fillRect(-23, -11, 46, 22);
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(-6, -9, 12, 18);
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(20, -8, 4, 4); ctx.fillRect(20, 4, 4, 4);
      ctx.restore();
      // nama mobil di atas mobil
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(S.car.name, p.x, p.y - 22);
      ctx.textAlign = 'left';
    } else {
      // Raka on-foot: lingkaran + arah + bayangan
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2d8b0';
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, 5, Math.PI, 0); ctx.fill();
      // arah aim
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(S.angle) * 22, p.y + Math.sin(S.angle) * 22);
      ctx.stroke();
      if (muzzleT > 0) {
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(S.angle) * 26, p.y + Math.sin(S.angle) * 26, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('RAKA', p.x, p.y - 20);
      ctx.textAlign = 'left';
    }
    // penjaga bank / musuh digambar missions.js lewat TA.missions.drawEnemies
    TA.missions.drawEnemies(ctx, W, H);
  }

  TA.player.update = update;
  TA.player.draw = draw;
  TA.player.enterCar = enterCar;
  TA.player.exitCar = exitCar;
  TA.player.jackCar = jackCar;
  TA.player.tryEnterExitCar = tryEnterExitCar;
  TA.player.shoot = shoot;
  TA.player.driveBy = driveBy;
  TA.player.switchWeapon = switchWeapon;
  TA.player.toggleWeaponWheel = toggleWeaponWheel;
  TA.player.takeDamage = takeDamage;
  TA.player.buyWeapon = buyWeapon;
  TA.player.buyAmmo = buyAmmo;
  TA.player.buyArmor = buyArmor;
  TA.player.getCarCondition = getCarCondition;
  TA.player.currentWeapon = currentWeapon;
  TA.player.ammo = function () { return ammo; };
  TA.player.shotsFired = function () { return shotsFired; };
})();
