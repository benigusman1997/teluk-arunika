/* core.js — boot, mesin status game, loop utama, input, kamera, save/load */
(function () {
  'use strict';
  window.TA = window.TA || {};
  var TA = window.TA;

  TA.S = {
    screen: 'title', // title | playing | paused | map | intro | dialogue | gameover | win
    money: 4250000, day: 4, hour: 14, minute: 32, weather: 'Hujan Deras', rain: 1,
    wanted: 0, heat: 0, heatVisible: false, incident: '—',
    hp: 100, armor: 75, xp: 450, respect: 62,
    mission: 7, stage: 3, stageTotal: 7, guardsKilled: 3, guardsTotal: 9,
    coins: 4, coinsTotal: 12, jumps: 2, jumpsTotal: 5,
    racesWon: 1, carsStolen: 37, bestWanted: 4, safehouses: 1, safehousesTotal: 3,
    districtsHeld: 2, districtsTotal: 6,
    inCar: false, car: null, speed: 0, onFoot: true,
    weapon: 1, wheelOpen: false, radio: 0, race: null,
    timeOfDay: 'siang', night: false,
    px: 1900, py: 1500, angle: 0, vx: 0, vy: 0,
    camX: 1900, camY: 1500, zoom: 1,
    missionDone: [true, true, true, true, true, true, false, false, false, false],
    saveSlots: [
      { day: 4, money: 4250000, mission: 6 },
      { day: 2, money: 1180000, mission: 3 },
      null
    ],
    autosave: true, paused: false, muted: false,
    mouseX: 640, mouseY: 360, shooting: false,
    bankAlarm: 0, bankMoneyTaken: false, explosionT: 0,
    waypoint: null, mapTab: 'cerita', mapZoom: 1, mapPanX: 0, mapPanY: 0
  };

  TA.keys = {};
  TA.canvas = null;
  TA.ctx = null;
  TA.lastT = 0;
  TA.rainDrops = [];
  TA.particles = [];
  TA.shotMode = 0;
  TA.booted = false;

  function fmtRp(n) {
    return 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmtDollar(n) {
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmtClock() {
    var h = TA.S.hour, m = TA.S.minute;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function seededRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function dist(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }

  TA.fmtRp = fmtRp;
  TA.fmtDollar = fmtDollar;
  TA.fmtClock = fmtClock;
  TA.seededRandom = seededRandom;
  TA.clamp = clamp;
  TA.dist = dist;

  function resizeCanvas() {
    var c = TA.canvas;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }

  function onKeyDown(e) {
    TA.keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') {
      if (TA.S.screen === 'playing') pauseGame();
      else if (TA.S.screen === 'paused') resumeGame();
      else if (TA.S.screen === 'map') TA.ui.closeFullMap();
    }
    if (e.key.toLowerCase() === 'm' && (TA.S.screen === 'playing' || TA.S.screen === 'map')) {
      if (TA.S.screen === 'playing') TA.ui.showFullMap(); else TA.ui.closeFullMap();
    }
    if (e.key.toLowerCase() === 'v' && TA.S.screen === 'playing') TA.ui.toggleCrewPanel();
    if (e.key.toLowerCase() === 'r' && TA.S.screen === 'playing') TA.audio.nextStation();
    if (e.key.toLowerCase() === 'e' && TA.S.screen === 'playing') TA.player.tryEnterExitCar();
    if (e.key.toLowerCase() === 'q' && TA.S.screen === 'playing') TA.crew.activateCrewAbility('q');
    if (e.key.toLowerCase() === 'z' && TA.S.screen === 'playing') TA.crew.activateCrewAbility('z');
    if (e.key.toLowerCase() === 'x' && TA.S.screen === 'playing') TA.crew.activateCrewAbility('x');
    if (e.key.toLowerCase() === 'c' && TA.S.screen === 'playing') TA.crew.activateCrewAbility('c');
    if (e.key >= '1' && e.key <= '6' && TA.S.screen === 'playing') TA.player.switchWeapon(parseInt(e.key, 10) - 1);
    if (e.key === ' ' && (TA.S.screen === 'intro' || TA.S.screen === 'dialogue')) TA.missions.advanceDialogue();
    if (e.key === 'Tab' && TA.S.screen === 'playing') { e.preventDefault(); TA.player.toggleWeaponWheel(); }
  }
  function onKeyUp(e) { TA.keys[e.key.toLowerCase()] = false; }
  function onMouseMove(e) { TA.S.mouseX = e.clientX; TA.S.mouseY = e.clientY; }
  function onMouseDown(e) {
    if (TA.S.screen === 'playing') { TA.S.shooting = true; TA.player.shoot(); }
    if (TA.S.screen === 'intro' || TA.S.screen === 'dialogue') TA.missions.advanceDialogue();
  }
  function onMouseUp() { TA.S.shooting = false; }

  function tick(ts) {
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, (ts - TA.lastT) / 1000 || 0.016);
    TA.lastT = ts;
    if (TA.shotMode > 0) {
      // mode screenshot staged: dunia ambient saja, state game dibekukan
      TA.world.updateAmbient(dt);
    } else if (TA.S.screen === 'playing') {
      TA.S.minute += dt * 0.6;
      if (TA.S.minute >= 60) { TA.S.minute = 0; TA.S.hour = (TA.S.hour + 1) % 24; }
      TA.player.update(dt);
      TA.world.update(dt);
      TA.police.update(dt);
      TA.missions.update(dt);
      TA.races.update(dt);
      TA.crew.update(dt);
      TA.career.update(dt);
      TA.audio.update(dt);
    } else if (TA.S.screen === 'title' || TA.S.screen === 'map') {
      TA.world.updateAmbient(dt);
    }
    updateCamera(dt);
    render(dt);
    TA.ui.update(dt);
  }

  function updateCamera(dt) {
    var tx = TA.S.px, ty = TA.S.py;
    if (TA.shotMode === 2) { tx = TA.S.px + 200; ty = TA.S.py; }
    TA.S.camX += (tx - TA.S.camX) * Math.min(1, dt * 5);
    TA.S.camY += (ty - TA.S.camY) * Math.min(1, dt * 5);
  }

  function render(dt) {
    var ctx = TA.ctx, W = TA.canvas.width, H = TA.canvas.height;
    ctx.clearRect(0, 0, W, H);
    TA.world.draw(ctx, W, H, dt);
    TA.player.draw(ctx, W, H);
    TA.police.draw(ctx, W, H);
    TA.world.drawEffects(ctx, W, H, dt);
    drawRain(ctx, W, H, dt);
  }

  function drawRain(ctx, W, H, dt) {
    if (TA.S.rain <= 0) return;
    if (TA.rainDrops.length === 0) {
      var rnd = seededRandom(77);
      for (var i = 0; i < 160; i++) TA.rainDrops.push({ x: rnd() * 1400, y: rnd() * 800, l: 10 + rnd() * 14, s: 500 + rnd() * 300 });
    }
    ctx.strokeStyle = 'rgba(180,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var j = 0; j < TA.rainDrops.length; j++) {
      var d = TA.rainDrops[j];
      d.y += d.s * dt; d.x -= d.s * dt * 0.25;
      if (d.y > H + 20) { d.y = -20; d.x = Math.random() * (W + 200); }
      if (d.x < -20) d.x = W + 10;
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3, d.y + d.l);
    }
    ctx.stroke();
  }

  function startNewGame() {
    TA.S.screen = 'playing';
    TA.S.day = 1; TA.S.hour = 8; TA.S.minute = 0;
    TA.S.money = 250000; TA.S.mission = 1; TA.S.stage = 1;
    TA.S.missionDone = [false, false, false, false, false, false, false, false, false, false];
    TA.S.xp = 0; TA.S.wanted = 0; TA.S.hp = 100; TA.S.armor = 0;
    TA.S.px = 900; TA.S.py = 1500;
    TA.ui.showHUD();
    TA.missions.showMissionIntro(1);
    TA.audio.initAudio();
  }

  function continueGame() {
    TA.S.screen = 'playing';
    TA.S.day = 4; TA.S.hour = 14; TA.S.minute = 32;
    TA.S.money = 4250000; TA.S.mission = 7; TA.S.stage = 1;
    TA.S.missionDone = [true, true, true, true, true, true, false, false, false, false];
    TA.S.xp = 450;
    TA.S.px = 1900; TA.S.py = 1500;
    TA.ui.showHUD();
    TA.audio.initAudio();
  }

  function pauseGame() {
    TA.S.screen = 'paused';
    TA.ui.showPauseScreen();
  }
  function resumeGame() {
    TA.S.screen = 'playing';
    TA.ui.hidePauseScreen();
  }
  function gameOver() {
    TA.S.screen = 'gameover';
    TA.ui.showToast('RAKA TERTANGKAP — Utang belum lunas.');
  }
  function winGame() {
    TA.S.screen = 'win';
    TA.ui.showEndScreen();
  }

  function saveGame(slot) {
    try {
      var data = {
        day: TA.S.day, money: TA.S.money, mission: TA.S.mission, xp: TA.S.xp,
        wanted: TA.S.wanted, coins: TA.S.coins, jumps: TA.S.jumps,
        racesWon: TA.S.racesWon, carsStolen: TA.S.carsStolen,
        crew: TA.crew.recruited(), missionDone: TA.S.missionDone
      };
      localStorage.setItem('ta_save_' + slot, JSON.stringify(data));
      TA.S.saveSlots[slot - 1] = { day: TA.S.day, money: TA.S.money, mission: TA.S.mission };
      TA.ui.showToast('Saving... Slot ' + slot + ' tersimpan.');
    } catch (err) { /* penyimpanan lokal tidak tersedia */
    }
  }
  function loadGame(slot) {
    try {
      var raw = localStorage.getItem('ta_save_' + slot);
      if (!raw) return false;
      var d = JSON.parse(raw);
      TA.S.day = d.day; TA.S.money = d.money; TA.S.mission = d.mission; TA.S.xp = d.xp || 0;
      TA.S.coins = d.coins || 0; TA.S.jumps = d.jumps || 0;
      TA.S.racesWon = d.racesWon || 0; TA.S.carsStolen = d.carsStolen || 0;
      if (d.missionDone) TA.S.missionDone = d.missionDone;
      return true;
    } catch (err) { return false; }
  }

  TA.startNewGame = startNewGame;
  TA.continueGame = continueGame;
  TA.pauseGame = pauseGame;
  TA.resumeGame = resumeGame;
  TA.gameOver = gameOver;
  TA.winGame = winGame;
  TA.saveGame = saveGame;
  TA.loadGame = loadGame;

  function bootGame() {
    TA.canvas = document.getElementById('game');
    TA.ctx = TA.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('error', function (e) {
      var el = document.getElementById('js-errors');
      if (el) el.textContent += 'ERROR: ' + (e.message || 'unknown') + '; ';
    });
    TA.world.buildCity();
    TA.world.buildTraffic();
    TA.world.buildPedestrians();
    TA.world.buildStashes();
    TA.world.buildRamps();
    TA.police.reset();
    TA.missions.reset();
    TA.races.reset();
    TA.crew.reset();
    TA.career.reset();
    TA.audio.reset();
    TA.ui.init();
    var params = new URLSearchParams(window.location.search);
    var shot = parseInt(params.get('shot') || '0', 10);
    TA.shotMode = isNaN(shot) ? 0 : shot;
    if (TA.shotMode > 0) {
      TA.ui.stageShot(TA.shotMode);
    } else {
      TA.ui.showTitleScreen();
    }
    var bootEl = document.getElementById('boot-status');
    if (bootEl) bootEl.textContent = 'OK';
    TA.booted = true;
    requestAnimationFrame(tick);
  }

  TA.bootGame = bootGame;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGame);
  } else {
    bootGame();
  }
})();
