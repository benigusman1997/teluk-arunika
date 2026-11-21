/* player.js — Teluk Arunika v3.8. Jalan kaki + mengemudi, carjacking (tahan E),
   6 senjata + weapon wheel + amunisi, tembak + drive-by, HP/armor, beli senjata. */
(function () {
  'use strict';
  var TA = window.TA;

  /* 6 slot wheel: 1 Tinju, 2 Pistol, 3 SMG, 4 Shotgun, 5 Rifle, 6 Pemburu (sniper). */
  var WEAPONS = [
    { key: 'fists', name: 'Tinju', slot: 1, dmg: 12, rate: 300, range: 46, auto: false },
    { key: 'pistol', name: 'Pistol', slot: 2, dmg: 22, rate: 260, range: 420, auto: false },
    { key: 'smg', name: 'SMG', slot: 3, dmg: 14, rate: 90, range: 380, auto: true },
    { key: 'shotgun', name: 'Shotgun', slot: 4, dmg: 48, rate: 700, range: 260, auto: false },
    { key: 'rifle', name: 'Rifle', slot: 5, dmg: 38, rate: 420, range: 620, auto: false },
    { key: 'sniper', name: 'Pemburu', slot: 6, dmg: 95, rate: 1100, range: 900, auto: false },
  ];

  var CAR_MODELS = [
    { name: 'ARUNIKA SEDAN', color: '#3f7fbf', top: 150 },
    { name: 'PELABUHAN GT', color: '#c23b2e', top: 190 },
    { name: 'TAKSI KUNING', color: '#c2a52e', top: 140 },
    { name: 'TRUK KONTAINER', color: '#4a4a4a', top: 110 },
    { name: 'VAN HITAM', color: '#222226', top: 130 },
  ];

  var lastShot = 0, jackHold = 0, muzzle = null;

  function crewBonus() { return (TA.crew && TA.crew.getCrewBonus) ? TA.crew.getCrewBonus() : { speed: 0, armorRegen: 0, wantedCooldown: 0 }; }

  function update(dt) {
    var s = TA.state, p = s.player, keys = TA.keys;
    var mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    var my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    var run = keys['shift'] ? 1.6 : 1;
    var bonus = crewBonus();
    if (p.onFoot) {
      var sp = 150 * run;
      if (mx || my) {
        var len = Math.sqrt(mx * mx + my * my);
        p.x += (mx / len) * sp * dt; p.y += (my / len) * sp * dt;
        p.angle = Math.atan2(my, mx);
      }
      p.x = Math.max(30, Math.min(3570, p.x)); p.y = Math.max(30, Math.min(2570, p.y));
      if (TA.world) TA.world.collectStash(p.x, p.y);
      /* regen armor Budi */
      if (bonus.armorRegen > 0 && s.armor < s.maxArmor) s.armor = Math.min(s.maxArmor, s.armor + bonus.armorRegen * dt);
    } else {
      /* mengemudi: W/S gas-rem, A/D belok, arah mengikuti mobil */
      var top = 150 * (1 + bonus.speed);
      var accel = keys['w'] || keys['arrowup'] ? 240 : (keys['s'] || keys['arrowdown'] ? -160 : 0);
      s.car.speed = Math.max(-60, Math.min(top, s.car.speed + accel * dt));
      if (!accel) s.car.speed *= Math.max(0, 1 - 1.4 * dt);
      if (Math.abs(s.car.speed) > 4) {
        var steer = (keys['a'] || keys['arrowleft'] ? -1 : 0) + (keys['d'] || keys['arrowright'] ? 1 : 0);
        s.car.angle += steer * 2.1 * dt * (s.car.speed > 0 ? 1 : -1);
      }
      s.car.x += Math.cos(s.car.angle) * s.car.speed * dt;
      s.car.y += Math.sin(s.car.angle) * s.car.speed * dt;
      s.car.x = Math.max(40, Math.min(3560, s.car.x)); s.car.y = Math.max(40, Math.min(2560, s.car.y));
      p.x = s.car.x; p.y = s.car.y; p.angle = s.car.angle;
      /* tabrakan mengurangi kondisi */
      for (var i = 0; i < (TA.world ? TA.world.traffic.length : 0); i++) {
        var t = TA.world.traffic[i];
        var dx = t.x - s.car.x, dy = t.y - s.car.y;
        if (dx * dx + dy * dy < 1300 && Math.abs(s.car.speed) > 60) {
          s.car.condition = Math.max(5, s.car.condition - 1);
          s.car.speed *= 0.4;
          if (TA.audio) TA.audio.crashSound();
        }
      }
      /* pulih pelan oleh Budi saat mengemudi */
      if (bonus.armorRegen > 0 && s.car.condition < 100) s.car.condition = Math.min(100, s.car.condition + 0.4 * dt);
      /* koin + ramp */
      if (TA.world) TA.world.collectStash(s.car.x, s.car.y);
    }
    /* aim mengikuti mouse */
    if (TA.canvas) {
      var rect = TA.canvas.getBoundingClientRect();
      var wx = TA.mouse.x, wy = TA.mouse.y;
      var sx = p.x - (TA.state.shot ? 0 : 0);
      p.aimAngle = Math.atan2(wy - 360, wx - 640);
    }
    /* tembak otomatis saat mouse ditahan (SMG) */
    if (TA.mouse.down && s.mode === 'playing') {
      var w = WEAPONS[p.weapon - 1];
      if (w && w.auto) shoot();
    }
    if (muzzle && Date.now() - muzzle > 60) muzzle = null;
  }

  function enterCar() {
    var s = TA.state;
    if (s.player.onFoot) {
      var near = nearestTrafficCar();
      if (near) {
        s.player.onFoot = false; s.player.carId = near.idx;
        s.car = { name: near.name, condition: 70 + Math.floor(Math.random() * 25), speed: 0, x: near.x, y: near.y, angle: 0, color: near.color };
        if (TA.world) TA.world.traffic.splice(near.idx, 1);
        if (TA.ui) TA.ui.toast('Masuk mobil: ' + s.car.name);
      }
    } else { exitCar(); }
  }
  function exitCar() {
    var s = TA.state;
    s.player.onFoot = true; s.player.carId = -1;
    s.player.x = s.car.x + 40; s.player.y = s.car.y + 20;
    s.car.speed = 0;
  }
  function nearestTrafficCar() {
    var s = TA.state, best = null, bd = 1e9;
    var list = TA.world ? TA.world.traffic : [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var dx = t.x - s.player.x, dy = t.y - s.player.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { idx: i, x: t.x, y: t.y, name: t.name, color: t.color }; }
    }
    return bd < 90 * 90 ? best : null;
  }

  /* Carjacking: tahan E dekat mobil — alarm berbunyi, pengemudi kabur, wanted +1. */
  function jackCar(dt) {
    var s = TA.state;
    var near = nearestTrafficCar();
    if (!near) { jackHold = 0; return; }
    jackHold += dt;
    if (TA.ui) TA.ui.showJackProgress(Math.min(1, jackHold / 1.2));
    if (jackHold >= 1.2) {
      jackHold = 0;
      enterCar();
      if (TA.police) TA.police.setWanted(s.wanted + 1, 'PENCURIAN MOBIL');
      s.carsStolen++;
      if (TA.career) TA.career.addXP(10);
      if (TA.crew) TA.crew.showCrewChatter('AGUS', 'Alarm bunyi — kabur sebelum patroli datang!');
      if (TA.audio) TA.audio.sirenSound();
    }
  }
  function interactKey() {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    if (s.player.onFoot) {
      /* dekat mobil? jack; kalau tidak, masuk mobil sendiri */
      if (nearestTrafficCar()) jackCar(1.2);
      else enterCar();
    } else exitCar();
  }

  function switchWeapon(slot) {
    var s = TA.state;
    if (slot >= 1 && slot <= 6) {
      s.player.weapon = slot;
      if (TA.ui) TA.ui.renderWeaponWheel(false);
    }
  }
  function currentWeapon() { return WEAPONS[TA.state.player.weapon - 1]; }

  function shoot() {
    var s = TA.state, p = s.player;
    var now = Date.now();
    var w = currentWeapon();
    if (!w || now - lastShot < w.rate) return;
    /* amunisi */
    var key = w.key;
    if (key !== 'fists') {
      var a = s.ammo[key];
      if (!a || a[0] <= 0) { if (TA.ui) TA.ui.toast('Amunisi habis — beli di toko senjata!'); return; }
      a[0]--;
    }
    lastShot = now; muzzle = now;
    if (TA.audio) TA.audio.gunshotSound();
    var ang = (p.aimAngle !== undefined ? p.aimAngle : p.angle);
    /* tembak target kontrak hancur */
    if (s.wreck && s.wreck.active) {
      var t = s.wreck.targetPos;
      if (t) {
        var dx = t.x - p.x, dy = t.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        var aimDiff = Math.abs(Math.atan2(dy, dx) - ang);
        if (d < w.range + 120 && aimDiff < 0.35) {
          s.wreck.hp = Math.max(0, s.wreck.hp - w.dmg);
          if (TA.missions) TA.missions.updateWreckContract(0);
        }
      }
    }
    /* tembak penjaga bank (Misi 7 tahap 3) */
    if (s.mission && s.mission.index === 6 && s.mission.stage === 2 && s.bankGuardsDown < 9) {
      if (Math.random() < 0.5) {
        s.bankGuardsDown++;
        if (TA.ui) TA.ui.renderAll(true);
      }
    }
    if (s.wanted < 2) { if (TA.police) TA.police.setWanted(Math.max(s.wanted, 1), 'PENEMBAKAN'); }
  }

  function driveBy() { if (!TA.state.player.onFoot) shoot(); }

  function takeDamage(n) {
    var s = TA.state;
    var absorbed = Math.min(s.armor, n);
    s.armor -= absorbed; s.health -= (n - absorbed);
    if (s.health <= 0) { s.health = 0; if (TA.core) TA.core.gameOver(); }
    if (TA.ui) TA.ui.renderAll(true);
  }

  function buyWeapon(key) {
    var s = TA.state;
    var prices = { pistol: 200, smg: 600, shotgun: 800, rifle: 1200, sniper: 2000 };
    var p = prices[key];
    if (p === undefined) return false;
    if (s.money < p) { if (TA.ui) TA.ui.toast('Uang tidak cukup!'); return false; }
    s.money -= p;
    s.ammo[key][1] += s.ammo[key][0] === 0 ? 24 : 12;
    return true;
  }
  function buyArmor() {
    var s = TA.state;
    var price = 150;
    if (s.money < price) return false;
    s.money -= price; s.armor = s.maxArmor;
    return true;
  }
  function buyAmmo(key) {
    var s = TA.state;
    var price = 80;
    if (s.money < price || !s.ammo[key]) return false;
    s.money -= price; s.ammo[key][1] += 30;
    return true;
  }
  function getCarCondition() {
    var s = TA.state;
    var c = Math.round(s.car.condition);
    return c >= 80 ? c + '% BAGUS' : c >= 50 ? c + '% RUSAK' : c + '% PARAH';
  }
  function ammoText(key) {
    var a = TA.state.ammo[key];
    if (a === Infinity || a === undefined) return '∞';
    return a[0] + '/' + a[1];
  }

  TA.player = {
    WEAPONS: WEAPONS, CAR_MODELS: CAR_MODELS,
    update: update, movePlayer: update,
    enterCar: enterCar, exitCar: exitCar, jackCar: jackCar, interactKey: interactKey,
    shoot: shoot, driveBy: driveBy, switchWeapon: switchWeapon, currentWeapon: currentWeapon,
    takeDamage: takeDamage, buyWeapon: buyWeapon, buyArmor: buyArmor, buyAmmo: buyAmmo,
    getCarCondition: getCarCondition, ammoText: ammoText,
    get muzzle() { return muzzle; },
  };
})();
