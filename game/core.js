// core.js — boot: window.TA namespace, renderer, main loop, game state machine, input, save slots.
// TELUK ARUNIKA: 7 Hari Utang — FPS 3D open-world crime game (Three.js, offline, procedural).
(function () {
  'use strict';
  var TA = window.TA = window.TA || {};
  TA.VERSION = '3.5';

  TA.state = {
    mode: 'menu', // menu | playing | paused | cutscene | ended
    money: 2400, debt: 7000, day: 1, xp: 0, rank: 1,
    hp: 100, armor: 0, wanted: 0,
    missionIndex: 0, missionStage: 0, missionActive: false,
    timeMinutes: 14 * 60 + 32, // 14:32
    weather: 'HUJAN DERAS', timeOfDay: 'day',
    inCar: false, carId: null, speedKmh: 0,
    weapon: 1, ammo: { 1: 12, 2: 30, 3: 6, 4: 8 },
    crew: { sari: false, budi: false, agus: false },
    crewCooldown: { sari: 0, budi: 0, agus: 0 },
    ghostUsedThisMission: false,
    districts: { pelabuhan: 58, pasar: 46, gang: 61, pantai: 52, tol: 40 },
    currentDistrict: 'pelabuhan',
    radioStation: 0, radioOn: true,
    missionsDone: 0, carsStolen: 0, sideJobsDone: 0,
    darmaChoice: null, // 'tangkap' | 'lepas'
    seed: 1,
  };

  TA.keys = {};
  TA.mouse = { x: 0, y: 0, down: false, dx: 0, dy: 0 };
  TA.yaw = 0; TA.pitch = 0;
  TA.playerPos = { x: 8, y: 1.7, z: 26 };
  TA.playerVel = { x: 0, y: 0, z: 0 };
  TA.clock = { last: 0 };
  TA.saveKey = 'teluk-arunika-save';

  function makeRenderer() {
    var canvas = document.getElementById('game-canvas');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    return renderer;
  }

  function bootGame() {
    TA.renderer = makeRenderer();
    TA.scene = new THREE.Scene();
    TA.scene.background = new THREE.Color(0x1a2438);
    TA.scene.fog = new THREE.Fog(0x1a2438, 40, 260);
    TA.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 600);
    TA.camera.position.set(8, 1.7, 26);
    TA.world.buildCity(TA.scene);
    TA.world.spawnTraffic(TA.scene);
    TA.world.spawnPedestrians(TA.scene);
    TA.world.setTimeOfDay('day');
    TA.world.setWeather('HUJAN DERAS');
    TA.audio.initAudio();
    TA.ui.showStartScreen();
    TA.ui.renderHUD();
    TA.ui.renderMinimap();
    applyShotPreset();
    window.addEventListener('resize', function () {
      TA.camera.aspect = window.innerWidth / window.innerHeight;
      TA.camera.updateProjectionMatrix();
      TA.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', function (e) { TA.keys[e.code] = false; });
    document.addEventListener('mousemove', function (e) {
      TA.mouse.dx += e.movementX || 0; TA.mouse.dy += e.movementY || 0;
    });
    document.addEventListener('mousedown', function (e) {
      if (e.button === 0) { TA.mouse.down = true; if (TA.state.mode === 'playing') TA.player.shoot(); }
    });
    document.addEventListener('mouseup', function (e) { if (e.button === 0) TA.mouse.down = false; });
    document.getElementById('game-canvas').addEventListener('click', function () {
      if (TA.state.mode === 'playing') { TA.audio.initAudio(); }
    });
    bindButtons();
    requestAnimationFrame(tick);
  }

  function bindButtons() {
    var $ = function (id) { return document.getElementById(id); };
    $('btn-new').addEventListener('click', function () { startNewGame(); });
    $('btn-continue').addEventListener('click', function () {
      var s = loadSave('auto') || loadSave('1');
      if (s) { applySave(s); startGame(); } else { startNewGame(); }
    });
    $('btn-resume').addEventListener('click', resumeGame);
    $('btn-restart').addEventListener('click', function () { TA.missions.startMission(TA.state.missionIndex); resumeGame(); });
    $('btn-quit').addEventListener('click', function () { TA.state.mode = 'menu'; TA.ui.showStartScreen(); $('hud').classList.add('hidden'); });
    $('btn-again').addEventListener('click', function () { startNewGame(); });
    $('btn-load-auto').addEventListener('click', function () {
      var s = loadSave('auto'); if (s) { applySave(s); resumeGame(); }
    });
    var slots = document.querySelectorAll('.save-slot');
    slots.forEach(function (b) { b.addEventListener('click', function () { saveGame(b.getAttribute('data-slot')); }); });
    document.getElementById('dialogue').addEventListener('click', function () { TA.missions.advanceDialogue(); });
  }

  function onKeyDown(e) {
    TA.keys[e.code] = true;
    if (e.code === 'Escape') {
      if (TA.state.mode === 'playing') pauseGame();
      else if (TA.state.mode === 'paused') resumeGame();
      return;
    }
    if (TA.state.mode === 'cutscene' && (e.code === 'Enter' || e.code === 'Space')) { TA.missions.advanceDialogue(); return; }
    if (TA.state.mode !== 'playing') return;
    if (e.code === 'KeyE') TA.player.jackCar();
    if (e.code === 'KeyR') TA.audio.playRadioStation((TA.state.radioStation + 1) % 3);
    if (e.code === 'KeyV') TA.ui.toggleCrewPanel();
    if (e.code === 'KeyM') TA.ui.toggleMinimapZoom();
    if (e.code === 'Digit1') TA.player.switchWeapon(1);
    if (e.code === 'Digit2') TA.player.switchWeapon(2);
    if (e.code === 'Digit3') TA.player.switchWeapon(3);
    if (e.code === 'Digit4') TA.player.switchWeapon(4);
    if (e.code === 'KeyZ') TA.crew.activateCrewAbility('sari');
    if (e.code === 'KeyX') TA.crew.activateCrewAbility('budi');
    if (e.code === 'KeyC') TA.crew.activateCrewAbility('agus');
    if (e.code === 'Tab') { e.preventDefault(); TA.ui.toggleWeaponWheel(true); }
  }
  document.addEventListener('keyup', function (e) {
    if (e.code === 'Tab') TA.ui.toggleWeaponWheel(false);
  });

  function startNewGame() {
    var keep = TA.state.seed;
    TA.state = JSON.parse(JSON.stringify({
      mode: 'playing', money: 2400, debt: 7000, day: 1, xp: 0, rank: 1,
      hp: 100, armor: 0, wanted: 0, missionIndex: 0, missionStage: 0, missionActive: false,
      timeMinutes: 14 * 60 + 32, weather: 'HUJAN DERAS', timeOfDay: 'day',
      inCar: false, carId: null, speedKmh: 0, weapon: 1, ammo: { 1: 12, 2: 30, 3: 6, 4: 8 },
      crew: { sari: false, budi: false, agus: false },
      crewCooldown: { sari: 0, budi: 0, agus: 0 }, ghostUsedThisMission: false,
      districts: { pelabuhan: 58, pasar: 46, gang: 61, pantai: 52, tol: 40 },
      currentDistrict: 'pelabuhan', radioStation: 0, radioOn: true,
      missionsDone: 0, carsStolen: 0, sideJobsDone: 0, darmaChoice: null, seed: keep,
    }));
    TA.playerPos = { x: 8, y: 1.7, z: 26 };
    TA.yaw = 0; TA.pitch = 0;
    startGame();
    TA.missions.startMission(0);
  }

  function startGame() {
    TA.state.mode = 'playing';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    TA.ui.renderHUD();
  }

  function pauseGame() {
    TA.state.mode = 'paused';
    TA.ui.showPauseScreen();
  }
  function resumeGame() {
    TA.state.mode = 'playing';
    document.getElementById('pause-screen').classList.add('hidden');
  }
  function gameOver() {
    TA.state.mode = 'ended';
    TA.ui.showEndScreen(false);
  }
  function winGame() {
    TA.state.mode = 'ended';
    TA.career.addXP(0);
    TA.ui.showEndScreen(true);
  }

  // --- Save system: 3 slots + autosave (localStorage) ---
  function saveGame(slot) {
    try {
      var s = JSON.parse(JSON.stringify(TA.state));
      s.savedAt = new Date().toISOString();
      localStorage.setItem(TA.saveKey + '-' + slot, JSON.stringify(s));
      localStorage.setItem(TA.saveKey + '-auto', JSON.stringify(s));
      TA.ui.showSaving();
      return true;
    } catch (err) { return false; }
  }
  function loadSave(slot) {
    try {
      var raw = localStorage.getItem(TA.saveKey + '-' + slot);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  }
  function applySave(s) {
    var mode = TA.state.mode;
    TA.state = s; TA.state.mode = mode;
  }
  function autosave() { saveGame('auto'); }

  // --- Shot presets (?shot=1..4) for real-render screenshots ---
  function applyShotPreset() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    if (!shot) return;
    var s = TA.state;
    s.mode = 'playing';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    if (shot === '1') {
      s.wanted = 2; s.xp = 120; s.crew.sari = true; s.money = 2650;
      s.timeOfDay = 'day'; s.weather = 'HUJAN DERAS'; s.timeMinutes = 14 * 60 + 32;
      TA.world.setTimeOfDay('day'); TA.world.setWeather('HUJAN DERAS');
      TA.missions.startMission(0);
      TA.player.enterCar('sedan-1');
    } else if (shot === '2') {
      s.wanted = 5; s.xp = 520; s.rank = 3; s.crew.sari = true; s.crew.budi = true; s.crew.agus = true;
      s.money = 4100; s.timeOfDay = 'night'; s.weather = 'HUJAN RINGAN'; s.timeMinutes = 23 * 60 + 41;
      TA.world.setTimeOfDay('night'); TA.world.setWeather('HUJAN RINGAN');
      s.missionIndex = 5; s.missionStage = 1; s.missionActive = true;
      TA.police.setWanted(5);
      TA.player.enterCar('gt-1');
      TA.crew.showCrewChatter('Sari', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
      TA.ui.renderDispatchPanel();
      TA.ui.renderMissionBanner();
    } else if (shot === '3') {
      s.wanted = 3; s.xp = 1350; s.rank = 4; s.crew.sari = true; s.crew.budi = true; s.crew.agus = true;
      s.money = 6800; s.timeOfDay = 'dawn'; s.weather = 'BERAWAN'; s.timeMinutes = 5 * 60 + 47;
      TA.world.setTimeOfDay('dawn'); TA.world.setWeather('BERAWAN');
      TA.missions.startMission(9);
      TA.missions.showDialogue('Darma', 'Raka… kau datang juga. Tujuh hari, dan kau masih berdiri. Sayang sekali.');
      TA.ui.toggleWeaponWheel(true);
      TA.crew.showCrewChatter('Agus', 'Tiga gelombang di balik kontainer. Aku matikan lampu gudang — sekarang!');
    } else if (shot === '4') {
      s.wanted = 1; s.xp = 450; s.rank = 3; s.crew.sari = true; s.crew.budi = true;
      s.money = 5300; s.timeOfDay = 'night'; s.weather = 'HUJAN DERAS'; s.timeMinutes = 2 * 60 + 14;
      TA.world.setTimeOfDay('night'); TA.world.setWeather('HUJAN DERAS');
      s.missionIndex = 3; s.missionStage = 0; s.missionActive = true;
      document.getElementById('dialogue').classList.add('hidden');
      TA.ui.renderHUD();
      pauseGame();
    }
    TA.ui.renderHUD();
    TA.ui.renderMinimap();
  }

  var elapsed = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    var dt = Math.min((t - (TA.clock.last || t)) / 1000, 0.05);
    TA.clock.last = t;
    elapsed += dt;
    if (TA.state.mode === 'playing') {
      TA.state.timeMinutes = (TA.state.timeMinutes + dt / 6) % (24 * 60);
      TA.player.movePlayer(dt);
      TA.world.updateTraffic(dt);
      TA.world.updatePedestrians(dt);
      TA.police.update(dt);
      TA.missions.update(dt);
      TA.crew.update(dt);
      TA.career.update(dt);
      TA.audio.updateEngine(dt);
      TA.police.cooldownWanted(dt);
      if (elapsed > 20) { elapsed = 0; autosave(); }
    }
    TA.world.updateRain(dt);
    TA.world.updateHelicopterVisual(dt);
    TA.ui.update(dt);
    TA.renderer.render(TA.scene, TA.camera);
  }

  TA.core = {
    bootGame: bootGame, startNewGame: startNewGame, startGame: startGame,
    pauseGame: pauseGame, resumeGame: resumeGame, gameOver: gameOver, winGame: winGame,
    saveGame: saveGame, loadSave: loadSave, applySave: applySave, autosave: autosave,
    applyShotPreset: applyShotPreset,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGame);
  else bootGame();
})();
