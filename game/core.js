/* core.js — Teluk Arunika v3.8. Boot, namespace window.TA, loop utama,
   mesin status (title / playing / paused / map / cutscene / win / gameover),
   input keyboard+mouse, staging deterministik ?shot=N untuk screenshot. */
(function () {
  'use strict';

  /* RNG deterministik (mulberry32) supaya kota + staging stabil antar run. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.TA = window.TA || {};
  var TA = window.TA;
  TA.rng = mulberry32(20261122);
  TA.VERSION = '3.8';

  /* ---------- state awal ---------- */
  function newGameState() {
    return {
      mode: 'title',            /* title | playing | paused | map | cutscene | win | gameover */
      time: 0,                  /* detik sejak boot */
      clockMin: 8 * 60 + 5,     /* jam game: 08:05 */
      weather: 'hujan',
      day: 4, debt: 5000000, money: 4250000,
      xp: 450, rank: 3,
      health: 100, armor: 50, maxHealth: 100, maxArmor: 100,
      wanted: 0, heat: 0, heatVisible: false,
      incident: 'PENEMBAKAN',
      player: { x: 1500, y: 1300, angle: -Math.PI / 2, onFoot: true, carId: -1, speed: 0, weapon: 2 },
      car: { name: 'ARUNIKA SEDAN', condition: 78, speed: 0, x: 1500, y: 1360, angle: -Math.PI / 2, color: '#3f7fbf' },
      carsStolen: 37, racesWon: 2, coins: 3, jumps: 1, bestWanted: 4, safehouses: 2,
      coinsTotal: 12, jumpsTotal: 5, districtsHeld: 1,
      radio: 0,
      ammo: { fists: Infinity, pistol: [12, 48], smg: [30, 60], shotgun: [6, 18], rifle: [10, 30], sniper: [5, 15] },
      crew: {
        sari: { recruited: false, cooldown: 0, ready: false },
        budi: { recruited: false, cooldown: 0, ready: false },
        agus: { recruited: false, cooldown: 0, ready: false },
      },
      districts: { 'PELABUHAN': 58, 'PASAR': 44, 'GANG NEON': 31, 'PANTAI': 52, 'TOL LAYANG': 39, 'PULAU ABU': 26 },
      mission: null,            /* {index, stage} */
      missionDone: [true, true, true, true, true, false, false, false, false, false],
      wreck: null,              /* {key, name, hp, maxHp, distKm, dest, reward, status} */
      wreckDone: { komet: false, harimau: false, srikandi: false },
      race: null,               /* {key, name, checkpoint, timer, best} */
      raceBest: { sprint: 102.3, circuit: null, highway: null },
      bankGuards: 9, bankGuardsDown: 0,
      chatter: null,            /* {name, text, until} */
      banner: null,             /* {title, sub, until} */
      swatBannerShown: false,
      minimapZoom: 1, waypoint: null,
      mapTab: 'PETA',
      paused: false,
      shot: 0,
    };
  }

  TA.state = newGameState();
  TA.keys = {};
  TA.mouse = { x: 640, y: 360, down: false };
  TA.canvas = null; TA.ctx = null;
  TA.threeAvailable = false;

  /* ---------- boot ---------- */
  function bootGame() {
    try {
      TA.canvas = document.getElementById('game-canvas');
      TA.ctx = TA.canvas.getContext('2d');
      TA.threeAvailable = typeof window.THREE !== 'undefined';
      if (TA.world && TA.world.buildCity) TA.world.buildCity();
      if (TA.audio && TA.audio.initAudio) TA.audio.initAudio();
      bindInput();
      var params = new URLSearchParams(window.location.search);
      var shot = parseInt(params.get('shot') || '0', 10) || 0;
      TA.state.shot = shot;
      if (shot > 0) { stageShot(shot); }
      else { showTitleScreen(); }
      requestAnimationFrame(tick);
      setBootStatus('OK');
    } catch (err) {
      setBootStatus('ERR: ' + err.message);
      var el = document.getElementById('js-errors');
      if (el) el.textContent = String(err && err.message || err);
    }
  }

  function setBootStatus(text) {
    var el = document.getElementById('boot-status');
    if (el) el.textContent = text;
  }

  window.addEventListener('error', function (e) {
    var el = document.getElementById('js-errors');
    if (el && !el.textContent) el.textContent = String(e.message || 'error');
  });

  /* ---------- input ---------- */
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      TA.keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
      if (k === 'escape') { togglePause(); }
      if (k === 'm') { toggleMap(); }
      if (k === 'r') { if (TA.audio) TA.audio.nextStation(); }
      if (k === 'v') { if (TA.ui) TA.ui.toggleCrewPanel(); }
      if (k === 'z') { if (TA.crew) TA.crew.activateCrewAbility('sari'); }
      if (k === 'x') { if (TA.crew) TA.crew.activateCrewAbility('budi'); }
      if (k === 'c') { if (TA.crew) TA.crew.activateCrewAbility('agus'); }
      if (k >= '1' && k <= '6') { if (TA.player) TA.player.switchWeapon(parseInt(k, 10)); }
      if (k === 'e') { if (TA.player) TA.player.interactKey(); }
      if (k === ' ') { if (TA.state.mode === 'cutscene') { if (TA.missions) TA.missions.advanceDialogue(); } }
    });
    window.addEventListener('keyup', function (e) { TA.keys[e.key.toLowerCase()] = false; });
    TA.canvas.addEventListener('mousemove', function (e) {
      var r = TA.canvas.getBoundingClientRect();
      TA.mouse.x = e.clientX - r.left; TA.mouse.y = e.clientY - r.top;
    });
    TA.canvas.addEventListener('mousedown', function () {
      TA.mouse.down = true;
      if (TA.state.mode === 'playing' && TA.player) TA.player.shoot();
    });
    window.addEventListener('mouseup', function () { TA.mouse.down = false; });
  }

  function togglePause() {
    var s = TA.state;
    if (s.mode === 'playing') { s.mode = 'paused'; if (TA.ui) TA.ui.showPauseScreen(); }
    else if (s.mode === 'paused') { s.mode = 'playing'; if (TA.ui) TA.ui.hidePauseScreen(); }
    else if (s.mode === 'map') { s.mode = 'playing'; if (TA.ui) TA.ui.hideFullMap(); }
  }
  function toggleMap() {
    var s = TA.state;
    if (s.mode === 'playing') { s.mode = 'map'; if (TA.ui) TA.ui.showFullMap(); }
    else if (s.mode === 'map') { s.mode = 'playing'; if (TA.ui) TA.ui.hideFullMap(); }
  }

  /* ---------- alur game ---------- */
  function startNewGame() {
    TA.state = newGameState();
    TA.state.mode = 'playing';
    if (TA.world) TA.world.resetTraffic();
    if (TA.missions) TA.missions.startMission(0);
    if (TA.ui) { TA.ui.hideTitleScreen(); var hud = document.getElementById('hud'); if (hud) hud.style.display = 'block'; TA.ui.showMissionIntro(0); }
  }
  function pauseGame() { if (TA.state.mode === 'playing') { TA.state.mode = 'paused'; if (TA.ui) TA.ui.showPauseScreen(); } }
  function resumeGame() { if (TA.state.mode === 'paused') { TA.state.mode = 'playing'; if (TA.ui) TA.ui.hidePauseScreen(); } }
  function gameOver() { TA.state.mode = 'gameover'; if (TA.ui) TA.ui.showGameOver(); }
  function winGame() { TA.state.mode = 'win'; if (TA.ui) TA.ui.showWinScreen(); }

  /* ---------- staging deterministik untuk screenshot ---------- */
  function stageShot(n) {
    var s = TA.state;
    s.mode = 'playing';
    s.day = 4; s.money = 4250000; s.xp = 450; s.rank = 3;
    s.health = 72; s.armor = 55;
    s.crew.sari.recruited = true; s.crew.sari.ready = true;
    s.crew.budi.recruited = true; s.crew.budi.ready = true;
    s.crew.agus.recruited = false;
    if (n === 1) {
      /* SWAT diterjunkan — siang, Pelabuhan. */
      s.weather = 'cerah'; s.clockMin = 14 * 60 + 20;
      s.wanted = 5; s.heat = 92; s.heatVisible = true; s.incident = 'PERAMPOKAN BANK';
      s.player.x = 620; s.player.y = 480; s.player.onFoot = false; s.player.carId = 0;
      s.car = { name: 'ARUNIKA SEDAN', condition: 62, speed: 87, x: 620, y: 480, angle: -0.4, color: '#3f7fbf' };
      s.mission = { index: 6, stage: 6 };
      if (TA.police) { TA.police.setWanted(5); TA.police.deploySWAT(); TA.police.setHeli(true); TA.police.addRoadblock(820, 420); }
      if (TA.crew) TA.crew.showCrewChatter('SARI', 'SWAT di depan! Jangan berhenti — belok kiri di gang!');
      if (TA.ui) TA.ui.showSwatBanner();
      s.banner = { title: 'SWAT ARUNIKA DITERJUNKAN', sub: 'Unit taktis mengepung — cari jalan keluar!', until: 9999 };
    } else if (n === 2) {
      /* Kontrak Hancur — senja, Pantai. Target KOMET MERAH kabur. */
      s.weather = 'mendung'; s.clockMin = 17 * 60 + 40;
      s.wanted = 2; s.heat = 40; s.heatVisible = true; s.incident = 'PENCURIAN MOBIL';
      s.player.x = 900; s.player.y = 2050; s.player.onFoot = false; s.player.carId = 0;
      s.car = { name: 'PELABUHAN GT', condition: 81, speed: 96, x: 900, y: 2050, angle: 0.1, color: '#c23b2e' };
      if (TA.missions) TA.missions.startWreckContract('komet');
      s.wreck.hp = 64; s.wreck.distKm = 0.32;
      if (TA.police) TA.police.setWanted(2);
      if (TA.crew) TA.crew.showCrewChatter('SARI', 'Dia kabur ke Pelabuhan! Tabrak KOMET MERAH sebelum sampai!');
    } else if (n === 3) {
      /* Layar peta penuh — malam, tab CERITA. */
      s.weather = 'hujan'; s.clockMin = 21 * 60 + 15;
      s.wanted = 0; s.mode = 'map'; s.mapTab = 'CERITA';
      s.player.x = 1500; s.player.y = 1300;
      s.mission = { index: 5, stage: 2 };
      s.wreckDone = { komet: true, harimau: false, srikandi: false };
      if (TA.ui) TA.ui.showFullMap();
    } else if (n === 4) {
      /* Kejar-kejaran malam — Tol Layang. SWAT + ELANG-1 + roadblock, wheel terbuka. */
      s.weather = 'hujan'; s.clockMin = 23 * 60 + 10;
      s.wanted = 5; s.heat = 88; s.heatVisible = true; s.incident = 'PENEMBAKAN';
      s.player.x = 1800; s.player.y = 1350; s.player.onFoot = false; s.player.carId = 0;
      s.car = { name: 'PELABUHAN GT', condition: 62, speed: 111, x: 1800, y: 1350, angle: 0.05, color: '#c23b2e' };
      s.mission = { index: 5, stage: 2 };
      if (TA.police) { TA.police.setWanted(5); TA.police.deploySWAT(); TA.police.setHeli(true); TA.police.addRoadblock(2050, 1330); TA.police.addSpikeStrip(1950, 1380); }
      if (TA.crew) TA.crew.showCrewChatter('BUDI', 'Ban aman, mesin panas — tapi kita bisa lolos dari mereka!');
      if (TA.ui) TA.ui.showWeaponWheel(true);
      s.banner = { title: 'SWAT ARUNIKA DITERJUNKAN', sub: 'ELANG-1 di atas — jangan berhenti!', until: 9999 };
    }
    if (TA.ui) { TA.ui.hideTitleScreen(); TA.ui.renderAll(true); }
    /* HUD tampil saat bermain; disembunyikan saat peta penuh (mode map). */
    var hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = (TA.state.mode === 'map') ? 'none' : 'block';
  }

  function showTitleScreen() {
    TA.state.mode = 'title';
    if (TA.ui) TA.ui.showTitleScreen();
  }

  /* ---------- loop utama ---------- */
  var last = 0;
  function tick(ts) {
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    var s = TA.state;
    s.time += dt;
    if (s.mode === 'playing' || s.mode === 'map') {
      s.clockMin = (s.clockMin + dt * 0.5) % 1440;
      if (TA.world) TA.world.update(dt);
      if (TA.player) TA.player.update(dt);
      if (TA.police) TA.police.update(dt);
      if (TA.missions) TA.missions.update(dt);
      if (TA.races) TA.races.update(dt);
      if (TA.crew) TA.crew.update(dt);
      if (TA.career) TA.career.update(dt);
    } else if (s.mode === 'title') {
      if (TA.world) TA.world.update(dt); /* kota hidup di belakang menu */
    }
    if (TA.world) TA.world.render();
    if (TA.ui) TA.ui.update(dt);
  }

  /* ---------- API publik ---------- */
  TA.core = {
    bootGame: bootGame, startNewGame: startNewGame, pauseGame: pauseGame,
    resumeGame: resumeGame, gameOver: gameOver, winGame: winGame,
    stageShot: stageShot, showTitleScreen: showTitleScreen,
    togglePause: togglePause, toggleMap: toggleMap, mulberry32: mulberry32,
  };
  TA.bootGame = bootGame;
  document.addEventListener('DOMContentLoaded', bootGame);
})();
