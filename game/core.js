/* TELUK ARUNIKA — core.js: boot, namespace TA, loop utama, input, mode game, staging ?scene= */
(function () {
  'use strict';
  window.TA = window.TA || {};
  var TA = window.TA;

  /* ---------- util deterministik ---------- */
  TA.RNG_SEED = 20261121;
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  TA.rng = mulberry32(TA.RNG_SEED);
  TA.reseed = function (seed) { TA.rng = mulberry32(seed); };
  TA.rand = function (a, b) { return a + TA.rng() * (b - a); };
  TA.randInt = function (a, b) { return Math.floor(TA.rand(a, b + 1)); };
  TA.pick = function (arr) { return arr[Math.floor(TA.rng() * arr.length)]; };
  TA.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  TA.dist2d = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  TA.fmtMoney = function (n) { return Math.round(n).toLocaleString('en-US'); };

  /* ---------- state ---------- */
  TA.DEFAULT_STATE = function () {
    return {
      mode: 'menu', // menu | playing | paused | cutscene | end
      money: 250, debt: 7000, day: 1,
      timeMin: 9 * 60 + 20, // 09:20
      weather: 'rain', // rain | clear | drizzle
      wanted: 0, wantedHeat: 0, hiddenTimer: 0,
      hp: 100, maxHp: 100, armor: 0, maxArmor: 100,
      xp: 0, rank: 1,
      crew: { sari: false, budi: false, agus: false },
      crewCooldown: { sari: 0, budi: 0, agus: 0 },
      ghostUsedThisMission: false,
      missionIndex: 0, missionStage: 0, missionActive: false, missionDone: [],
      branchChoice: null, // 'pay' | 'betray' (misi 5)
      mission10Wave: 0, mission10Choice: null,
      district: 'Pasar', street: 'Jl. Merdeka',
      radio: -1, radioStation: '',
      weapon: 0, weaponsOwned: [true, false, false, false],
      inCar: false, car: null, carHp: 100, speedKmh: 0,
      taxiJob: null, packageJob: null,
      stats: { missionsDone: 0, carsStolen: 0, taxisDone: 0, packagesDone: 0, shotsFired: 0, enemiesDown: 0, wantedEscapes: 0 },
      staged: 0, webgl: true, minimapZoom: 1,
      saveNoticeUntil: 0, chatterUntil: 0,
      jackProgress: 0, jackTarget: null,
      endTitle: '', endText: ''
    };
  };
  TA.state = TA.DEFAULT_STATE();

  TA.input = { keys: {}, mouseX: 640, mouseY: 360, mouseDown: false, mouseClicked: false };
  TA.player = { x: 0, z: 0, angle: 0, speed: 0, onFoot: true, mesh: null, carMesh: null, moving: false };
  TA.enemies = [];
  TA.time = { last: 0, elapsed: 0 };

  /* ---------- boot ---------- */
  TA.bootGame = function () {
    var canvas = document.getElementById('game-canvas');
    TA.canvas = canvas;
    try {
      TA.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      TA.renderer.setSize(1280, 720, false);
      TA.renderer.setPixelRatio(1);
    } catch (e) {
      TA.state.webgl = false;
      var ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, 1280, 720); }
    }
    TA.scene = new THREE.Scene();
    TA.scene.background = new THREE.Color(0x1a2436);
    TA.scene.fog = new THREE.Fog(0x1a2436, 60, 240);
    TA.camera = new THREE.PerspectiveCamera(55, 1280 / 720, 0.1, 600);
    TA.camera.position.set(10, 17, 12);

    var hemi = new THREE.HemisphereLight(0x8fa8cc, 0x1a1410, 0.75);
    TA.scene.add(hemi);
    TA.sun = new THREE.DirectionalLight(0xffe0b3, 0.9);
    TA.sun.position.set(40, 80, 20);
    TA.scene.add(TA.sun);
    TA.moon = new THREE.DirectionalLight(0x7a9cc8, 0.35);
    TA.moon.position.set(-30, 60, -40);
    TA.scene.add(TA.moon);

    TA.world.buildCity();
    TA.world.buildTraffic();
    TA.world.buildPedestrians();
    TA.world.buildRain();
    TA.player.spawnPlayer(0, 0);
    TA.police.init();
    TA.ui.init();
    TA.audio.initAudio();
    TA.bindInput();
    TA.applyStaging();
    if (TA.state.mode === 'menu' && TA.state.staged === 0) TA.ui.showStartScreen();
    TA.time.last = performance.now();
    requestAnimationFrame(TA.frame);
  };

  TA.frame = function (now) {
    var dt = Math.min(0.05, (now - TA.time.last) / 1000 || 0.016);
    TA.time.last = now;
    TA.time.elapsed += dt;
    try { TA.tick(dt); } catch (e) { if (TA.state.mode !== 'menu') console.error(e); }
    requestAnimationFrame(TA.frame);
  };

  TA.tick = function (dt) {
    var s = TA.state;
    if (s.mode === 'playing' || s.mode === 'cutscene') {
      s.timeMin += dt * 2.2; // ~2.2 menit game per detik nyata
      if (s.timeMin >= 1440) { s.timeMin -= 1440; s.day = Math.min(7, s.day + 1); }
      TA.world.update(dt);
      TA.player.update(dt);
      TA.police.update(dt);
      TA.missions.update(dt);
      TA.crew.update(dt);
      TA.career.update(dt);
      TA.audio.update(dt);
      TA.updateCamera(dt);
    } else if (s.mode === 'menu') {
      TA.world.updateMenu(dt);
      TA.updateCamera(dt);
    } else if (s.mode === 'paused' || s.mode === 'end') {
      TA.world.updateAmbient(dt);
    }
    TA.ui.update(dt);
    if (TA.state.webgl && TA.renderer) {
      try { TA.renderer.render(TA.scene, TA.camera); } catch (e) { /* render gagal: HUD tetap jalan */ }
    }
  };

  TA.updateCamera = function (dt) {
    var p = TA.player, cam = TA.camera;
    var tx = p.x + 11, ty = 17, tz = p.z + 13;
    if (s_inCarZoom()) { tx = p.x + 14; ty = 20; tz = p.z + 16; }
    cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 4);
    cam.position.y += (ty - cam.position.y) * Math.min(1, dt * 4);
    cam.position.z += (tz - cam.position.z) * Math.min(1, dt * 4);
    cam.lookAt(p.x, 0, p.z);
    function s_inCarZoom() { return !p.onFoot; }
  };

  /* ---------- mode / lifecycle ---------- */
  TA.setMode = function (m) { TA.state.mode = m; };
  TA.startNewGame = function () {
    TA.state = TA.DEFAULT_STATE();
    TA.state.mode = 'playing';
    TA.enemies = [];
    TA.reseed(TA.RNG_SEED);
    TA.player.spawnPlayer(0, 0);
    TA.police.reset();
    TA.world.resetCityState();
    TA.ui.hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    TA.missions.startMission(0);
    TA.career.applyRankPerks();
  };
  TA.pauseGame = function () {
    if (TA.state.mode !== 'playing') return;
    TA.state.mode = 'paused';
    TA.ui.showPauseScreen();
  };
  TA.resumeGame = function () {
    if (TA.state.mode !== 'paused') return;
    TA.state.mode = 'playing';
    TA.ui.hidePauseScreen();
  };
  TA.gameOver = function (reason) {
    TA.state.mode = 'end';
    TA.state.endTitle = 'RAKA TERTANGKAP — BENGKEL DISITA';
    TA.state.endText = reason || 'Raka kehabisan HP di jalanan Teluk Arunika. Utang tak terbayar, bengkel ayahnya disita Darma.';
    TA.ui.showEndScreen();
  };
  TA.winGame = function () {
    TA.state.mode = 'end';
    TA.state.endTitle = 'UTANG LUNAS — BENGKEL SELAMAT';
    var r = TA.career.getRank();
    TA.state.endText = 'Fajar di pelabuhan. Darma jatuh, utang lunas, bengkel ayah selamat. ' +
      'Raka menutup 7 hari sebagai ' + r.name + ' Teluk Arunika.' +
      (TA.state.mission10Choice === 'capture' ? ' Darma ditangkap hidup-hidup — reputasi Raka melambung.' : ' Darma kabur dengan perahu, tapi uangnya tertinggal.');
    TA.ui.showEndScreen();
  };

  /* ---------- input ---------- */
  TA.bindInput = function () {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      TA.input.keys[k] = true;
      if (k === 'escape') {
        if (TA.state.mode === 'playing') TA.pauseGame();
        else if (TA.state.mode === 'paused') TA.resumeGame();
      }
      if (k === 'm') TA.state.minimapZoom = TA.state.minimapZoom === 1 ? 1.6 : 1;
      if (k === 'r' && TA.state.mode === 'playing') TA.audio.cycleRadio();
      if (k === 'v' && TA.state.mode === 'playing') TA.ui.toggleCrewPanel();
      if (k === 'b' && TA.state.mode === 'playing') TA.ui.toggleShop();
      if (k === 'q' && TA.state.mode === 'playing') TA.crew.activateCrewAbility(TA.crew.activeAbilityKey());
      if (k === 'z' && TA.state.mode === 'playing') TA.crew.activateCrewAbility('sari');
      if (k === 'x' && TA.state.mode === 'playing') TA.crew.activateCrewAbility('budi');
      if (k === 'c' && TA.state.mode === 'playing') TA.crew.activateCrewAbility('agus');
      if (['1', '2', '3', '4'].indexOf(k) >= 0 && TA.state.mode === 'playing') TA.player.switchWeapon(Number(k) - 1);
      if ((k === ' ' || k === 'enter') && TA.state.mode === 'cutscene') TA.missions.advanceDialogue();
      if (k === 't' && TA.state.mode === 'playing') TA.player.tryTaxiJob();
      if (k === 'g' && TA.state.mode === 'playing') TA.player.tryPackageJob();
    });
    window.addEventListener('keyup', function (e) { TA.input.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('mousemove', function (e) {
      var r = TA.canvas.getBoundingClientRect();
      TA.input.mouseX = (e.clientX - r.left) * (1280 / r.width);
      TA.input.mouseY = (e.clientY - r.top) * (720 / r.height);
    });
    window.addEventListener('mousedown', function (e) {
      if (e.target !== TA.canvas) return;
      TA.input.mouseDown = true;
      TA.input.mouseClicked = true;
      if (TA.state.mode === 'playing') TA.player.shoot();
      else if (TA.state.mode === 'cutscene') TA.missions.advanceDialogue();
    });
    window.addEventListener('mouseup', function () { TA.input.mouseDown = false; });
    document.getElementById('btn-newgame').addEventListener('click', function () { TA.audio.unlock(); TA.startNewGame(); });
    document.getElementById('btn-continue').addEventListener('click', function () {
      var ok = TA.career.loadGame(0);
      if (ok) { TA.audio.unlock(); TA.state.mode = 'playing'; TA.ui.hideAllScreens(); document.getElementById('hud').classList.remove('hidden'); }
    });
    document.getElementById('btn-resume').addEventListener('click', function () { TA.resumeGame(); });
    document.getElementById('btn-quit').addEventListener('click', function () {
      TA.career.saveGame(0);
      TA.state.mode = 'menu';
      TA.ui.hidePauseScreen();
      TA.ui.showStartScreen();
      document.getElementById('hud').classList.add('hidden');
    });
    document.getElementById('btn-restart').addEventListener('click', function () { TA.startNewGame(); });
    document.querySelectorAll('#pause-screen .save-slots button').forEach(function (b) {
      b.addEventListener('click', function () { TA.career.saveGame(Number(b.getAttribute('data-slot'))); TA.ui.refreshPauseScreen(); });
    });
    document.querySelectorAll('#weapon-wheel .wheel-slot').forEach(function (el) {
      el.addEventListener('click', function () { TA.player.switchWeapon(Number(el.getAttribute('data-weapon'))); TA.ui.hideWeaponWheel(); });
    });
  };

  /* ---------- staging deterministik ?scene=1..4 ---------- */
  TA.applyStaging = function () {
    var q = new URLSearchParams(window.location.search);
    var scene = Number(q.get('scene') || 0);
    if (!scene || scene < 1 || scene > 4) return;
    TA.reseed(TA.RNG_SEED + scene);
    TA.startNewGame();
    TA.state.staged = scene;
    TA.ui.hideAllScreens();
    document.getElementById('hud').classList.remove('hidden');
    TA.state.mode = 'playing';
    if (scene === 1) TA.staging.scene1();
    else if (scene === 2) TA.staging.scene2();
    else if (scene === 3) TA.staging.scene3();
    else if (scene === 4) TA.staging.scene4();
  };

  TA.staging = {
    scene1: function () {
      // Siang hujan, on-foot, mobil curian di depan, wanted 2, kru Sari, XP 120
      var s = TA.state;
      s.weather = 'rain'; s.timeMin = 9 * 60 + 20; s.day = 1;
      s.xp = 120;
      s.crew.sari = true;
      TA.world.setWeather('rain'); TA.world.setTimeOfDay(9.33);
      TA.player.spawnPlayer(6, 10);
      TA.player.spawnParkedCar('sedan', 8.5, 7, Math.PI);
      TA.police.setWanted(2, 'curanmor');
      TA.missions.startMission(0);
      s.missionStage = 0;
      TA.world.updateDistrictFromPlayer();
      // Lewati dialog intro agar mode bermain + prompt "Hold E to jack" terlihat
      TA.missions.advanceDialogue();
      TA.missions.advanceDialogue();
      TA.crew.showCrewChatter('SARI', 'Mobil itu kuncinya longgar. Tahan E, cepat!');
    },
    scene2: function () {
      // Kejar-kejaran malam: di mobil, roadblock + spike strip, ELANG-1, wanted 4
      var s = TA.state;
      s.weather = 'clear'; s.timeMin = 23 * 60 + 40; s.day = 3;
      s.xp = 520; s.rank = 3;
      s.crew.sari = true; s.crew.budi = true; s.crew.agus = true;
      TA.world.setWeather('clear'); TA.world.setTimeOfDay(23.67);
      TA.player.spawnPlayer(-30, -30);
      var car = TA.player.spawnParkedCar('gt', -30, -34, Math.PI * 0.5);
      TA.player.enterCar(car);
      s.speedKmh = 87; s.carHp = 100; s.armor = 100;
      TA.career.applyRankPerks();
      TA.police.setWanted(4, 'kejar-kejaran');
      TA.police.spawnRoadblock(-30, -70);
      TA.police.deploySpikeStrip(-30, -58);
      TA.police.activateHelicopter();
      TA.police.heliLocked = true; // ELANG-1 tetap di udara untuk shot 2 (wanted 4)
      TA.missions.startMission(5);
      s.missionStage = 1; // TAHAP 2/3
      TA.world.updateDistrictFromPlayer();
      // Lewati dialog intro misi 6 (3 baris) agar kejar-kejaran terlihat
      TA.missions.advanceDialogue();
      TA.missions.advanceDialogue();
      TA.missions.advanceDialogue();
      TA.crew.showCrewChatter('SARI', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
      TA.crew.showCrewChatter('SARI', 'Gaspol!');
    },
    scene3: function () {
      // Misi 10 fajar di pelabuhan: tembak-menembak, weapon wheel, dialog Darma + kru
      var s = TA.state;
      s.weather = 'clear'; s.timeMin = 5 * 60 + 50; s.day = 7;
      s.xp = 1350; s.rank = 4;
      s.crew.sari = true; s.crew.budi = true; s.crew.agus = true;
      s.hp = 78; s.armor = 60;
      TA.career.applyRankPerks();
      TA.world.setWeather('clear'); TA.world.setTimeOfDay(5.83);
      TA.player.spawnPlayer(128, -10);
      TA.missions.startMission(9);
      s.missionStage = 1;
      TA.missions.spawnMission10Wave(1);
      TA.police.setWanted(1, 'tembak-menembak');
      TA.ui.showWeaponWheel();
      TA.ui.weaponWheelUntil = Infinity; // staging: wheel tetap terbuka untuk screenshot
      TA.missions.showDialogue([
        { who: 'DARMA', text: 'Raka... kau pikir bisa mengambil pelabuhanku? Anak taksi kemarin sore!' },
        { who: 'SARI', text: 'Jangan dengarkan dia, Raka. Kita sudah sampai sejauh ini — habisi!' },
        { who: 'RAKA', text: 'Tujuh hari, Darma. Hari ini utangku lunas — dengan caraku.' }
      ], function () { TA.state.mode = 'playing'; });
      s.mode = 'cutscene';
    },
    scene4: function () {
      // Malam neon + pause/karier: gang neon, taksi side job, jam 02:14 hujan
      var s = TA.state;
      s.weather = 'rain'; s.timeMin = 2 * 60 + 14; s.day = 4;
      s.xp = 450; s.rank = 3; s.money = 1240;
      s.crew.sari = true; s.crew.budi = true; s.crew.agus = false;
      TA.world.setWeather('rain'); TA.world.setTimeOfDay(2.23);
      TA.player.spawnPlayer(20, 90);
      TA.player.spawnParkedCar('taxi', 24, 86, 0);
      TA.player.taxiJob = { from: 'Gang Neon', to: 'Pelabuhan', pay: 85, tx: 130, tz: 20, state: 'pickup', px: 20, pz: 96 };
      s.taxiJob = TA.player.taxiJob;
      TA.missions.startMission(3);
      TA.world.updateDistrictFromPlayer();
      // Lewati dialog intro misi 4 (2 baris) agar layar pause bersih
      TA.missions.advanceDialogue();
      TA.missions.advanceDialogue();
      TA.state.mode = 'paused';
      TA.ui.showPauseScreen();
    }
  };

  window.addEventListener('DOMContentLoaded', function () {
    if (typeof THREE === 'undefined') {
      document.getElementById('start-screen').innerHTML = '<div class="start-inner"><h1>THREE.JS GAGAL DIMUAT</h1><p>game/vendor/three.min.js tidak ditemukan.</p></div>';
      return;
    }
    TA.bootGame();
  });
})();
