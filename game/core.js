// TELUK ARUNIKA v3 — core.js
// Boot, namespace, mesin status game, loop utama, input, save/load, mode screenshot.
// Semua modul lain menempelkan API-nya ke window.TA di bawah ini.
(function () {
  'use strict';

  // RNG deterministik (mulberry32) supaya build kota & screenshot bisa diulang.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var params = new URLSearchParams(window.location.search);
  var seed = parseInt(params.get('seed') || '7', 10);
  if (!seed || seed < 0) seed = 7;
  var shot = parseInt(params.get('shot') || '0', 10);
  if (!shot || shot < 0 || shot > 4) shot = 0;

  var TA = window.TA = {
    version: '3.0.0',
    seed: seed,
    shot: shot,
    rng: mulberry32(seed),
    rand: function (a, b) { return a + TA.rng() * (b - a); },
    randi: function (a, b) { return Math.floor(TA.rand(a, b + 1)); },
    pick: function (arr) { return arr[Math.floor(TA.rng() * arr.length)]; },
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    el: function (id) { return document.getElementById(id); },
    fmtMoney: function (n) {
      return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },
    fmtClock: function (mins) {
      var h = Math.floor(mins / 60) % 24;
      var m = Math.floor(mins % 60);
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },
    state: {
      mode: 'menu', // menu | playing | paused | cutscene | ending | gameover
      money: 250,
      day: 1,
      debt: 5000,
      xp: 0,
      rankIndex: 0,
      wanted: 0,
      wantedTimer: 0,
      wantedHidden: 0,
      hp: 100,
      maxHp: 100,
      armor: 0,
      maxArmor: 100,
      weaponIndex: 0,
      timeMinutes: 8 * 60 + 20,
      weather: 'rain',
      timeOfDay: 'day',
      missionIndex: 0,
      missionActive: false,
      missionKills: 0,
      missionTarget: 0,
      missionStage: 0,
      crew: { sari: false, budi: false, agus: false },
      crewCd: { sari: 0, budi: 0, agus: 0 }, // cooldown kemampuan kru (detik)
      ghostUsedThisMission: false,
      gaspolUntil: 0,
      radio: 0,
      radioOn: true,
      kills: 0,
      carsStolen: 0,
      jobsDone: 0,
      missionsDone: 0,
      inCar: false,
      speedKmh: 0,
      dead: false,
      choicePending: null,
      playSeconds: 0
    },
    // Posisi pemain (jalan kaki). Dipakai world/player/police/missions.
    px: 0, pz: 24, pyaw: 0, ppitch: 0,
    car: null,           // mobil yang sedang dikendarai (objek dari world.makeCar)
    traffic: [],         // mobil AI
    peds: [],            // pejalan kaki
    enemies: [],         // musuh misi
    keys: {},
    mouseDX: 0, mouseDY: 0,
    pointerLocked: false,
    framesRendered: 0,
    ready: false,
    shotReady: false,
    renderPaused: false,
    lastError: null
  };

  // Tangkap error runtime supaya self-test headless bisa melihatnya.
  window.addEventListener('error', function (e) {
    TA.lastError = String(e.message || e.error || 'unknown error');
  });

  // ---------------------------------------------------------------- boot
  TA.bootGame = function () {
    if (typeof THREE === 'undefined') {
      TA.lastError = 'THREE failed to load';
      document.body.innerHTML = '<div style="color:#fff;font:16px sans-serif;padding:40px">THREE failed to load</div>';
      return;
    }
    var renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;
    TA.el('app').appendChild(renderer.domElement);
    TA.renderer = renderer;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2733);
    scene.fog = new THREE.Fog(0x1a2733, 60, 420);
    TA.scene = scene;

    var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 900);
    camera.rotation.order = 'YXZ';
    TA.camera = camera;

    var hemi = new THREE.HemisphereLight(0xbfd4e6, 0x1c1a16, 0.75);
    scene.add(hemi);
    TA.hemi = hemi;
    var sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
    sun.position.set(120, 180, 60);
    scene.add(sun);
    TA.sun = sun;
    var amb = new THREE.AmbientLight(0x404860, 0.5);
    scene.add(amb);
    TA.amb = amb;

    TA.world.buildCity();
    TA.world.spawnTraffic(16);
    TA.world.spawnPedestrians(26);
    TA.world.setWeather('rain');
    TA.world.setTimeOfDay('day');

    TA.player.initPlayer();
    TA.police.initPolice();
    TA.missions.initMissions();
    TA.crew.initCrew();
    TA.career.initCareer();
    TA.ui.initUI();
    TA.audio.prime();

    TA.bindInput();
    window.addEventListener('resize', TA.onResize);

    if (TA.shot > 0) {
      TA.applyShot(TA.shot);
      // Shot 4 menata sendiri mode 'paused' + layar pause; shot 3 butuh
      // dialog + weapon wheel tetap terlihat, jadi jangan sembunyikan layar.
      TA.state.mode = TA.shot === 4 ? 'paused' : 'playing';
      if (TA.shot === 1 || TA.shot === 2) TA.ui.hideAllScreens();
    } else {
      TA.ui.showStartScreen();
    }

    TA.ready = true;
    window.__TA_READY__ = true;
    TA.clock = new THREE.Clock();
    TA.animate();
  };

  TA.onResize = function () {
    TA.camera.aspect = window.innerWidth / window.innerHeight;
    TA.camera.updateProjectionMatrix();
    TA.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ---------------------------------------------------------------- loop
  TA.animate = function () {
    requestAnimationFrame(TA.animate);
    // renderPaused: dijeda tool screenshot supaya antrean GPU SwiftShader
    // sempat terkuras sebelum capture (kalau tidak, capture bisa macet).
    if (TA.renderPaused) return;
    var dt = Math.min(TA.clock.getDelta(), 0.05);
    TA.pumpFrame(dt);
  };

  // Satu frame penuh (dipakai loop rAF dan dipompa manual dari tool screenshot
  // saat headless men-throttle requestAnimationFrame).
  TA.pumpFrame = function (dt) {
    TA.tick(dt);
    TA.renderer.render(TA.scene, TA.camera);
    TA.framesRendered++;
    if (TA.shot > 0 && !TA.shotReady && TA.framesRendered > 12) {
      TA.shotReady = true;
      window.__TA_SHOT_READY__ = true;
    }
  };

  TA.tick = function (dt) {
    var s = TA.state;
    if (s.mode === 'playing' || s.mode === 'cutscene') {
      s.playSeconds += dt;
      s.timeMinutes += dt * 0.35; // ~1 menit game per 3 detik nyata
      if (s.timeMinutes >= 1440) s.timeMinutes -= 1440;
      if (s.mode === 'playing') {
        TA.player.movePlayer(dt);
        TA.player.updateJack(dt);
        TA.player.updateWeapon(dt);
      }
      TA.world.updateTraffic(dt);
      TA.world.updatePedestrians(dt);
      TA.world.updateRain(dt);
      TA.world.updateTaxiJob(dt);
      TA.police.update(dt);
      TA.missions.update(dt);
      TA.crew.update(dt);
      TA.career.update(dt);
      TA.audio.update(dt);
    }
    TA.ui.update(dt);
    TA.updateCamera(dt);
  };

  TA.updateCamera = function (dt) {
    var cam = TA.camera;
    var s = TA.state;
    if (s.inCar && TA.car) {
      // Kamera kejar di belakang mobil (mode mengemudi).
      var h = TA.car.heading;
      var fx = Math.sin(h), fz = Math.cos(h);
      var cx = TA.car.x - fx * 9.5;
      var cz = TA.car.z - fz * 9.5;
      var wantY = 4.2 + Math.min(TA.car.speed * 0.02, 1.2);
      cam.position.x = TA.lerp(cam.position.x, cx, 1 - Math.pow(0.001, dt));
      cam.position.y = TA.lerp(cam.position.y, wantY, 1 - Math.pow(0.001, dt));
      cam.position.z = TA.lerp(cam.position.z, cz, 1 - Math.pow(0.001, dt));
      cam.lookAt(TA.car.x + fx * 8, 1.4, TA.car.z + fz * 8);
      cam.rotation.order = 'YXZ';
    } else {
      cam.position.set(TA.px, 1.7, TA.pz);
      cam.rotation.set(TA.ppitch, TA.pyaw, 0);
    }
  };

  // ---------------------------------------------------------------- input
  TA.bindInput = function () {
    var s = TA.state;
    document.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      TA.keys[e.code] = true;
      if (e.code === 'Escape') {
        if (s.mode === 'playing') TA.pauseGame();
        else if (s.mode === 'paused') TA.resumeGame();
        return;
      }
      if (s.mode === 'cutscene' && (e.code === 'Enter' || e.code === 'Space')) {
        TA.ui.advanceDialogue();
        return;
      }
      if (s.mode !== 'playing') return;
      if (e.code === 'Digit1') TA.player.switchWeapon(0);
      if (e.code === 'Digit2') TA.player.switchWeapon(1);
      if (e.code === 'Digit3') TA.player.switchWeapon(2);
      if (e.code === 'Digit4') TA.player.switchWeapon(3);
      if (e.code === 'KeyZ') TA.crew.activateCrewAbility('sari');
      if (e.code === 'KeyX') TA.crew.activateCrewAbility('budi');
      if (e.code === 'KeyC') TA.crew.activateCrewAbility('agus');
      if (e.code === 'KeyV') TA.ui.toggleCrewPanel();
      if (e.code === 'KeyR') TA.audio.cycleRadio();
      if (e.code === 'KeyM') TA.ui.toggleMinimapZoom();
      if (e.code === 'Tab') { e.preventDefault(); TA.ui.showWeaponWheel(true); }
      if (e.code === 'KeyE') TA.player.tryEnterCar();
    });
    document.addEventListener('keyup', function (e) {
      TA.keys[e.code] = false;
      if (e.code === 'Tab') TA.ui.showWeaponWheel(false);
      if (e.code === 'KeyE') TA.player.cancelJack();
    });
    document.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (TA.state.mode === 'playing' && !TA.pointerLocked) {
        var c = TA.renderer.domElement;
        if (c && c.requestPointerLock) { try { c.requestPointerLock(); } catch (err) { /* abaikan */ } }
      }
      if (TA.state.mode === 'playing') TA.player.startFiring();
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 0) TA.player.stopFiring();
    });
    document.addEventListener('mousemove', function (e) {
      if (!TA.pointerLocked) return;
      TA.mouseDX += e.movementX || 0;
      TA.mouseDY += e.movementY || 0;
    });
    document.addEventListener('pointerlockchange', function () {
      TA.pointerLocked = document.pointerLockElement === TA.renderer.domElement;
    });
    // Audio butuh gestur pengguna: inisialisasi sekali di interaksi pertama.
    var prime = function () { TA.audio.initAudio(); };
    document.addEventListener('pointerdown', prime, { once: true });
    document.addEventListener('keydown', prime, { once: true });
  };

  // ------------------------------------------------------- mesin status
  TA.startNewGame = function () {
    var s = TA.state;
    s.money = 250; s.day = 1; s.debt = 5000; s.xp = 0; s.rankIndex = 0;
    s.wanted = 0; s.wantedTimer = 0; s.hp = 100; s.maxHp = 100;
    s.armor = 0; s.maxArmor = 100; s.weaponIndex = 0;
    s.timeMinutes = 8 * 60 + 20; s.weather = 'rain'; s.timeOfDay = 'day';
    s.missionIndex = 0; s.missionActive = false; s.missionKills = 0;
    s.crew = { sari: false, budi: false, agus: false };
    s.crewCd = { sari: 0, budi: 0, agus: 0 };
    s.kills = 0; s.carsStolen = 0; s.jobsDone = 0; s.missionsDone = 0;
    s.inCar = false; s.dead = false; s.playSeconds = 0;
    TA.world.resetDistricts();
    TA.px = 0; TA.pz = 24; TA.pyaw = 0; TA.ppitch = 0;
    TA.player.resetWeapons();
    TA.police.clearPolice();
    TA.ui.hideAllScreens();
    TA.world.setTimeOfDay('day');
    TA.world.setWeather('rain');
    TA.missions.startMission(0); // menampilkan dialog intro (mode 'cutscene')
    TA.ui.toast('Hari 1 — Utang $5.000 ke Darma. 7 hari. Bengkel ayahmu taruhannya.');
    TA.audio.initAudio();
  };

  TA.pauseGame = function () {
    TA.state.mode = 'paused';
    TA.ui.showPauseScreen();
    if (document.pointerLockElement) document.exitPointerLock();
  };

  TA.resumeGame = function () {
    TA.state.mode = 'playing';
    TA.ui.hideAllScreens();
  };

  TA.gameOver = function () {
    TA.state.mode = 'gameover';
    TA.state.dead = true;
    TA.ui.showGameOver();
    if (document.pointerLockElement) document.exitPointerLock();
  };

  TA.winGame = function () {
    TA.state.mode = 'ending';
    TA.ui.showEnding();
    if (document.pointerLockElement) document.exitPointerLock();
  };

  // ---------------------------------------------------------------- save
  TA.saveData = function () {
    var s = TA.state;
    return {
      version: 3, money: s.money, day: s.day, debt: s.debt, xp: s.xp,
      rankIndex: s.rankIndex, hp: s.hp, maxHp: s.maxHp, armor: s.armor,
      maxArmor: s.maxArmor, missionIndex: s.missionIndex,
      crew: { sari: s.crew.sari, budi: s.crew.budi, agus: s.crew.agus },
      kills: s.kills, carsStolen: s.carsStolen, jobsDone: s.jobsDone,
      missionsDone: s.missionsDone, weapons: TA.player.saveWeapons(),
      timeMinutes: s.timeMinutes
    };
  };

  TA.saveGame = function (slot) {
    try {
      localStorage.setItem('ta_save_' + slot, JSON.stringify(TA.saveData()));
      TA.ui.flashSaving();
      return true;
    } catch (err) { return false; }
  };

  TA.autosave = function () { return TA.saveGame('auto'); };

  TA.loadGame = function (slot) {
    try {
      var raw = localStorage.getItem('ta_save_' + slot);
      if (!raw) return false;
      var d = JSON.parse(raw);
      var s = TA.state;
      s.money = d.money; s.day = d.day; s.debt = d.debt; s.xp = d.xp;
      s.rankIndex = d.rankIndex || 0; s.hp = d.hp; s.maxHp = d.maxHp || 100;
      s.armor = d.armor; s.maxArmor = d.maxArmor || 100;
      s.missionIndex = d.missionIndex || 0;
      s.crew = d.crew || { sari: false, budi: false, agus: false };
      s.kills = d.kills || 0; s.carsStolen = d.carsStolen || 0;
      s.jobsDone = d.jobsDone || 0; s.missionsDone = d.missionsDone || 0;
      s.timeMinutes = d.timeMinutes || 480;
      TA.player.loadWeapons(d.weapons);
      TA.career.applyRankPerks();
      TA.police.clearPolice();
      s.wanted = 0; s.inCar = false; s.dead = false;
      TA.px = 0; TA.pz = 24; TA.pyaw = 0; TA.ppitch = 0;
      TA.missions.startMission(s.missionIndex);
      s.mode = 'playing';
      TA.ui.hideAllScreens();
      TA.ui.toast('Save dimuat — selamat datang kembali, Raka.');
      return true;
    } catch (err) { return false; }
  };

  TA.hasSave = function (slot) {
    try { return !!localStorage.getItem('ta_save_' + slot); } catch (err) { return false; }
  };

  // ------------------------------------------------------- mode screenshot
  // Menata tiap shot persis seperti rencana di DESIGN.md — deterministik.
  TA.applyShot = function (n) {
    var s = TA.state;
    // Reset bersih dulu.
    TA.police.clearPolice();
    TA.missions.clearEnemies();
    TA.player.resetWeapons();
    s.wanted = 0; s.inCar = false; s.dead = false;
    s.crew = { sari: false, budi: false, agus: false };
    s.crewCd = { sari: 0, budi: 0, agus: 0 };
    s.gaspolUntil = 0;
    TA.car = null;
    if (n === 1) {
      // Siang hujan, on-foot, mobil curian di depan, wanted 2, kru + XP terlihat.
      s.money = 1240; s.day = 3; s.debt = 4200; s.xp = 120; s.rankIndex = 0;
      s.wanted = 2; s.hp = 86; s.armor = 40;
      s.crew.sari = true;
      s.timeMinutes = 10 * 60 + 35;
      TA.world.setTimeOfDay('day');
      TA.world.setWeather('rain');
      TA.px = 2; TA.pz = 26; TA.pyaw = 0.15; TA.ppitch = -0.02;
      TA.world.placeJackCar(2, 18);
      TA.jackTarget.hp = 62; // kondisi mobil curian: PELABUHAN GT — 62% RUSAK
      TA.missions.startMission(2, true); // mode shot: tanpa dialog
    } else if (n === 2) {
      // Kejar-kejaran malam: di mobil, roadblock + spike strip, ELANG-1, toast Gaspol.
      s.money = 2380; s.day = 5; s.debt = 3100; s.xp = 520; s.rankIndex = 2;
      s.hp = 74; s.armor = 60; s.speedKmh = 87;
      s.crew.sari = true; s.crew.budi = true;
      s.timeMinutes = 22 * 60 + 40;
      TA.world.setTimeOfDay('night');
      TA.world.setWeather('rain');
      TA.car = TA.world.makeCar(0xc0392b, 40, 8, Math.PI);
      TA.car.speed = 24; TA.car.stolen = true; TA.car.hp = 62; // PELABUHAN GT — 62% RUSAK
      TA.scene.add(TA.car.group);
      s.inCar = true;
      TA.camera.position.set(40, 4.4, 17.5); // snap kamera kejar ke posisi akhir
      TA.police.setWanted(4);
      TA.police.spawnRoadblock(40, -10);
      TA.police.deploySpikeStrip(40, 0);
      TA.police.spawnHelicopter();
      // ELANG-1 diposisikan supaya terlihat di frame (kiri-atas-tengah),
      // sorot mengarah ke mobil pemain.
      var heli = TA.police.heli;
      heli.group.position.set(34, 8, -6);
      heli.light.target.position.set(6, -8, 14);
      heli.light.target.updateMatrixWorld();
      TA.ui.toast('SARI: Gaspol!');
      TA.ui.flashAbility('SARI: GASPOL!');
      // v3.5: Misi 6 tahap 2 "WRECK THE REGENT" + obrolan kru soal roadblock.
      TA.missions.startMission(5, true);
      TA.missions.startMissionStage(5, 1);
      TA.ui.showCrewChatter('Sari', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
    } else if (n === 3) {
      // Misi 10, fajar di pelabuhan: baku tembak di balik kontainer, wheel + dialog.
      s.money = 3120; s.day = 7; s.debt = 500; s.xp = 1450; s.rankIndex = 3;
      s.wanted = 3; s.hp = 92; s.armor = 80;
      s.crew.sari = true; s.crew.budi = true; s.crew.agus = true;
      s.timeMinutes = 5 * 60 + 50;
      TA.world.setTimeOfDay('dawn');
      TA.world.setWeather('clear');
      TA.px = -6; TA.pz = 168; TA.pyaw = 3.2; TA.ppitch = 0.02;
      TA.missions.startMission(9, true);
      TA.missions.startMissionStage(9, 1); // v3.5: tahap 2 "Bersihkan Gudang"
      TA.missions.spawnEnemies(6, 0, 180);
      TA.player.WEAPONS.forEach(function (w) { w.owned = true; });
      TA.player.switchWeapon(3);
      TA.ui.showWeaponWheel(true);
      TA.missions.showDialogue([
        { who: 'Darma', text: 'Raka. Kau datang juga. Tujuh hari... dan kau masih berutang padaku.' },
        { who: 'Sari', text: 'Gaspol, Raka. Kita habisi gudang ini bareng-bareng.' },
        { who: 'Agus', text: 'Kamera pelabuhan sudah kubutakan. Mereka tidak lihat kita datang.' }
      ], null, true);
    } else if (n === 4) {
      // Malam neon + pause: panel karier + panel kru terbuka.
      s.money = 4860; s.day = 6; s.debt = 1800; s.xp = 640; s.rankIndex = 2;
      s.wanted = 0; s.hp = 100; s.armor = 50; s.jobsDone = 5;
      s.crew.sari = true; s.crew.budi = true; s.crew.agus = false;
      s.timeMinutes = 2 * 60 + 14;
      TA.world.setTimeOfDay('night');
      TA.world.setWeather('rain');
      TA.px = -38; TA.pz = -20; TA.pyaw = 2.9; TA.ppitch = 0;
      TA.missions.startMission(5, true);
      s.mode = 'paused';
      TA.ui.showPauseScreen();
    }
    TA.career.applyRankPerks();
    TA.ui.renderHUD(true);
    // Layar start tidak punya class hidden di HTML — sembunyikan eksplisit
    // untuk semua shot (shot 3 tidak memanggil hideAllScreens agar dialog
    // + weapon wheel tetap terlihat).
    var ss = TA.el('start-screen');
    if (ss) ss.classList.add('hidden');
  };
})();
