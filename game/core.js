// Teluk Arunika v3.6 — core.js
// Boot + namespace window.TA, renderer/scene/camera, main loop, input,
// game-state machine (menu / playing / paused / cutscene / end / map).
// One job: own the frame. Every other module attaches to TA.<module>.
(function () {
  'use strict';

  var TA = window.TA || (window.TA = {});

  // ---------- shared state ----------
  TA.state = {
    screen: 'menu',            // menu | playing | paused | cutscene | end | map
    prevScreen: 'playing',
    money: 1250,
    day: 1,
    debt: 5000,
    debtDueDay: 7,
    hp: 100, maxHp: 100,
    armor: 50, maxArmor: 50,
    wanted: 0,
    wantedHeat: 0,             // 0..1, builds while seen, decays while hidden
    xp: 0,
    time: 14.5,                // hours 0..24
    weather: 'rain',           // rain | clear | storm
    district: 'PELABUHAN',
    street: 'Dermaga Senja',
    inCar: false,
    carIndex: -1,
    carSpeed: 0,               // km/h
    weapon: 1,                 // 0 fists, 1 pistol, 2 smg, 3 shotgun, 4 rifle
    missionIndex: 7,           // 0-based; Misi 8 active by default for the demo
    missionStage: 2,           // 0-based; stage 3 of 4
    missionActive: true,
    race: null,                // { index, checkpoint, time, running }
    raceActive: false,
    carExport: null,           // { target, delivered }
    taxi: null,
    waypoint: null,            // { x, z, label, distKm }
    radio: 0,
    mapTab: 'PETA',
    mapOpen: false,
    wheelOpen: false,
    crewPanelOpen: false,
    chatter: null,             // { name, text, until }
    banner: null,              // { title, sub, until }
    rankBanner: null,
    dialogue: null,            // { speaker, text, lines, i }
    saving: false,
    paused: false,
    camHold: false, // photo mode: freeze the follow camera (set by stageShot)
    muted: false,
    elapsed: 0,
    kills: 0,
    carsStolen: 0,
    racesWon: 0,
    exportsDone: 0,
    shotsFired: 0,
    heliActive: false,
    roadblockActive: false,
    spikeActive: false,
    ghostUsedThisMission: false,
    choiceMadeDay5: false,
    gameWon: false,
  };

  TA.config = {
    dayLengthSec: 480,         // full 24h cycle in seconds (visual only)
    debtTotal: 5000,
    startMoney: 1250,
  };

  TA.keys = {};
  TA.mouse = { x: 0, y: 0, down: false };
  TA.clock = { last: 0, dt: 0 };

  TA.three = null;             // THREE namespace once loaded
  TA.renderer = null;
  TA.scene = null;
  TA.camera = null;
  TA.playerObj = null;         // THREE.Group for Raka on foot
  TA.carObj = null;            // THREE.Group for the driven car
  TA.playerPos = { x: 0, z: 8 };
  TA.playerYaw = 0;            // facing angle
  TA.camYaw = 0;
  TA.camPitch = 0.32;
  TA.camDist = 9;

  // ---------- boot ----------
  function bootGame() {
    TA.three = window.THREE;
    if (!TA.three) {
      document.getElementById('load-error').style.display = 'block';
      return;
    }
    var canvas = document.getElementById('game-canvas');
    TA.renderer = new TA.three.WebGLRenderer({ canvas: canvas, antialias: true });
    TA.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    TA.renderer.setSize(window.innerWidth, window.innerHeight);
    TA.renderer.shadowMap.enabled = true;
    TA.renderer.shadowMap.type = TA.three.PCFSoftShadowMap;
    TA.renderer.outputColorSpace = TA.three.SRGBColorSpace;
    TA.renderer.toneMapping = TA.three.ACESFilmicToneMapping;
    TA.renderer.toneMappingExposure = 1.05;

    TA.scene = new TA.three.Scene();
    TA.scene.background = new TA.three.Color(0x1a2733);
    TA.scene.fog = new TA.three.Fog(0x1a2733, 60, 240);

    TA.camera = new TA.three.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);
    TA.camera.position.set(0, 12, 20);

    var hemi = new TA.three.HemisphereLight(0x8fa8c8, 0x1a1410, 0.9);
    hemi.name = 'hemi';
    TA.scene.add(hemi);
    var sun = new TA.three.DirectionalLight(0xffe0b3, 1.4);
    sun.name = 'sun';
    sun.position.set(60, 90, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 300;
    TA.scene.add(sun);
    TA.lights = { hemi: hemi, sun: sun };

    TA.world.buildCity();
    TA.world.buildVolcanicIsland();
    TA.world.spawnTraffic();
    TA.world.spawnPedestrians();
    TA.player.buildPlayer();
    TA.player.spawnCars();
    TA.police.buildPolice();
    TA.career.loadSave();
    TA.audio.initAudio();
    TA.ui.buildHUD();
    TA.ui.showStartScreen();
    TA.world.setTimeOfDay(TA.state.time);
    TA.world.setWeather(TA.state.weather);

    bindInput();
    window.addEventListener('resize', onResize);
    TA.clock.last = performance.now();
    requestAnimationFrame(tick);
  }

  function onResize() {
    TA.camera.aspect = window.innerWidth / window.innerHeight;
    TA.camera.updateProjectionMatrix();
    TA.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ---------- input ----------
  function bindInput() {
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      TA.keys[e.code] = true;
      if (TA.ui.isDialogueOpen() && (e.code === 'Space' || e.code === 'Enter')) {
        TA.missions.advanceDialogue();
        e.preventDefault();
        return;
      }
      if (TA.state.screen === 'playing' || TA.state.screen === 'map') {
        if (e.code === 'Escape') { pauseGame(); e.preventDefault(); }
        else if (e.code === 'KeyM') { TA.ui.toggleFullMap(); }
        else if (e.code === 'KeyR') { TA.audio.cycleRadio(); }
        else if (e.code === 'KeyV') { TA.ui.toggleCrewPanel(); }
        else if (e.code === 'KeyE') { TA.player.tryEnterExitCar(); }
        else if (e.code === 'Tab') { TA.ui.toggleWeaponWheel(); e.preventDefault(); }
        else if (e.code === 'KeyZ') { TA.crew.activateCrewAbility('sari'); }
        else if (e.code === 'KeyX') { TA.crew.activateCrewAbility('budi'); }
        else if (e.code === 'KeyC') { TA.crew.activateCrewAbility('agus'); }
        else if (e.code === 'Digit1') { TA.player.switchWeapon(0); }
        else if (e.code === 'Digit2') { TA.player.switchWeapon(1); }
        else if (e.code === 'Digit3') { TA.player.switchWeapon(2); }
        else if (e.code === 'Digit4') { TA.player.switchWeapon(3); }
        else if (e.code === 'Digit5') { TA.player.switchWeapon(4); }
        else if (e.code === 'KeyN') { TA.missions.startMission(TA.state.missionIndex); }
      } else if (TA.state.screen === 'paused' && e.code === 'Escape') {
        resumeGame();
      } else if (TA.state.screen === 'cutscene' && (e.code === 'Space' || e.code === 'Enter')) {
        TA.missions.advanceDialogue();
      } else if (TA.state.screen === 'menu' && e.code === 'Enter') {
        startNewGame();
      }
    });
    window.addEventListener('keyup', function (e) { TA.keys[e.code] = false; });
    window.addEventListener('mousedown', function (e) {
      TA.mouse.down = true;
      if (TA.state.screen === 'playing') TA.player.shoot();
    });
    window.addEventListener('mouseup', function () { TA.mouse.down = false; });
    window.addEventListener('mousemove', function (e) {
      TA.mouse.x = e.clientX; TA.mouse.y = e.clientY;
    });
    var canvas = document.getElementById('game-canvas');
    canvas.addEventListener('wheel', function (e) {
      if (TA.ui.minimapHovered(e.clientX, e.clientY)) {
        TA.ui.zoomMinimap(e.deltaY < 0 ? 1 : -1);
        e.preventDefault();
      }
    }, { passive: false });
  }

  // ---------- state machine ----------
  function startNewGame() {
    var s = TA.state;
    s.money = TA.config.startMoney; s.day = 1; s.debt = TA.config.debtTotal;
    s.hp = s.maxHp; s.armor = 50; s.wanted = 0; s.xp = 0;
    s.missionIndex = 0; s.missionStage = 0; s.missionActive = false;
    s.screen = 'playing';
    TA.ui.hideStartScreen();
    TA.ui.showBanner('HARI 1 — UTANG $5.000', '7 hari lagi. Bengkel ayahmu taruhannya.');
    TA.missions.startMission(0);
    TA.audio.playRadioStation(0);
  }

  function continueGame() {
    TA.state.screen = 'playing';
    TA.ui.hideStartScreen();
    TA.audio.playRadioStation(TA.state.radio);
  }

  function pauseGame() {
    if (TA.state.screen !== 'playing' && TA.state.screen !== 'map') return;
    TA.state.prevScreen = TA.state.screen;
    TA.state.screen = 'paused';
    TA.state.paused = true;
    TA.ui.showPauseScreen();
  }

  function resumeGame() {
    TA.state.screen = TA.state.prevScreen === 'map' ? 'map' : 'playing';
    TA.state.paused = false;
    TA.ui.hidePauseScreen();
  }

  function gameOver(reason) {
    TA.state.screen = 'end';
    TA.state.gameWon = false;
    TA.ui.showEndScreen(false, reason || 'Raka tumbang di jalanan Teluk Arunika.');
  }

  function winGame() {
    TA.state.screen = 'end';
    TA.state.gameWon = true;
    TA.ui.showEndScreen(true, 'UTANG LUNAS — Bengkel Selamat');
  }

  // ---------- main loop ----------
  function tick(now) {
    requestAnimationFrame(tick);
    var dt = Math.max(0, Math.min((now - TA.clock.last) / 1000, 0.05));
    TA.clock.last = now;
    TA.state.elapsed += dt;

    if (TA.state.screen === 'playing' || TA.state.screen === 'map' || TA.state.screen === 'cutscene') {
      TA.state.time = (TA.state.time + dt * (24 / TA.config.dayLengthSec)) % 24;
      TA.world.update(dt);
      TA.player.update(dt);
      TA.police.update(dt);
      TA.missions.update(dt);
      if (TA.races) TA.races.updateRace(dt);
      TA.crew.update(dt);
      TA.career.update(dt);
      TA.audio.update(dt);
      updateCamera(dt);
    }
    TA.ui.update(dt);
    TA.renderer.render(TA.scene, TA.camera);
  }

  function updateCamera(dt) {
    if (TA.state.camHold) return; // frozen for the staged shot
    var target = TA.state.inCar && TA.carObj ? TA.carObj.position : TA.playerObj.position;
    var yaw = TA.camYaw;
    var dist = TA.state.inCar ? TA.camDist + 4 : TA.camDist;
    var cx = target.x - Math.sin(yaw) * dist;
    var cz = target.z - Math.cos(yaw) * dist;
    var cy = target.y + 3.5 + TA.camPitch * dist * 0.6;
    TA.camera.position.x += (cx - TA.camera.position.x) * Math.min(1, dt * 6);
    TA.camera.position.y += (cy - TA.camera.position.y) * Math.min(1, dt * 6);
    TA.camera.position.z += (cz - TA.camera.position.z) * Math.min(1, dt * 6);
    TA.camera.lookAt(target.x, target.y + 1.8, target.z);
  }

  // Snap the follow camera to its ideal spot at once (used by screenshot
  // staging; normal play keeps the smooth lerp in updateCamera).
  function snapCamera() {
    var target = TA.state.inCar && TA.carObj ? TA.carObj.position : TA.playerObj.position;
    var dist = TA.state.inCar ? TA.camDist + 4 : TA.camDist;
    TA.camera.position.set(
      target.x - Math.sin(TA.camYaw) * dist,
      target.y + 3.5 + TA.camPitch * dist * 0.6,
      target.z - Math.cos(TA.camYaw) * dist
    );
    TA.camera.lookAt(target.x, target.y + 1.8, target.z);
  }

  // ---------- screenshot staging (photo mode: sets real game state) ----------
  // ?shot=1..4 in the URL stages the scene the screenshot plan calls for.
  // Every staged element is live game state rendered by the normal loop.
  function stageShot(n) {
    var s = TA.state;
    s.screen = 'playing';
    TA.ui.hideStartScreen();
    if (n === 1) {
      // Street race, day, Port
      s.time = 13.5; s.weather = 'clear'; s.district = 'PELABUHAN'; s.street = 'Dermaga Senja';
      s.wanted = 0; s.money = 1250; s.day = 3;
      s.inCar = true; s.carIndex = 1;
      TA.player.getCars()[1].mesh.position.set(-80, 0, 162);
      TA.player.getCars()[1].mesh.rotation.y = 0;
      TA.player.placePlayerAt(-80, 0, 162, 0);
      TA.player.enterCarByIndex(1);
      s.missionIndex = 1; s.missionStage = 0; s.missionActive = false;
      TA.world.setTimeOfDay(13.5); TA.world.setWeather('clear');
      TA.races.startRace(0);
      var rs = TA.races.getRaceState();
      if (rs) rs.time = 23.4;
      TA.camYaw = Math.PI;
      TA.crew.showCrewChatter('SARI', 'Start di depan, jangan rem di tikungan pertama!');
    } else if (n === 2) {
      // Full map at night
      s.time = 22.4; s.weather = 'rain'; s.district = 'PASAR'; s.street = 'Jalan Ikan Bakar';
      s.wanted = 2; s.money = 1850; s.day = 4;
      s.missionIndex = 5; s.missionStage = 1; s.missionActive = true;
      TA.world.setTimeOfDay(22.4); TA.world.setWeather('rain');
      TA.police.setWanted(2, true);
      TA.ui.showFullMap();
      TA.ui.setWaypoint(96, -40, 'Lantern Mile');
    } else if (n === 3) {
      // Mission 8 on Pulau Abu, volcanic dusk, weapon wheel open
      s.time = 18.2; s.weather = 'clear'; s.district = 'PULAU ABU'; s.street = 'Jalan Bara';
      s.wanted = 5; s.money = 2400; s.day = 6;
      s.missionIndex = 7; s.missionStage = 2; s.missionActive = true;
      TA.player.placePlayerAt(224, 0, 10, -1.57);
      TA.world.setTimeOfDay(18.2); TA.world.setWeather('clear');
      TA.police.setWanted(5, true);
      TA.police.placeHelicopterNearPlayer();
      TA.police.spawnRoadblock();
      TA.police.deploySpikeStrip();
      TA.police.logPoliceRadio('ELANG-1: target terpantau di Pulau Abu');
      TA.police.logPoliceRadio('BLOKIR-03: roadblock dipasang di Pelabuhan');
      TA.police.logPoliceRadio('PATROLI-12: tembakan di Pasar Senja');
      TA.crew.showCrewChatter('AGUS', 'Bara di mana-mana. Jangan diam di tempat terbuka.');
      TA.ui.openWeaponWheel();
      TA.camYaw = 1.57;
    } else if (n === 4) {
      // Night chase on the elevated toll road, wanted 5
      s.time = 2.1; s.weather = 'storm'; s.district = 'TOL LAYANG'; s.street = 'Tol Layang';
      s.wanted = 5; s.money = 3100; s.day = 5;
      s.missionIndex = 5; s.missionStage = 2; s.missionActive = true;
      s.inCar = true; s.carIndex = 0;
      TA.player.getCars()[0].mesh.position.set(-40, 0, -140);
      TA.player.getCars()[0].mesh.rotation.y = 0;
      TA.player.placePlayerAt(-40, 0, -140, 0);
      TA.player.enterCarByIndex(0);
      TA.world.setTimeOfDay(2.1); TA.world.setWeather('storm');
      TA.police.setWanted(5, true);
      TA.police.placeHelicopterNearPlayer(-16, 10);
      TA.police.spawnRoadblock();
      TA.police.deploySpikeStrip();
      TA.police.logPoliceRadio('ELANG-1: target terpantau di Tol Layang');
      TA.police.logPoliceRadio('PATROLI-07: PIT siap di tikungan tol');
      TA.crew.showCrewChatter('SARI', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
      TA.ui.showBanner('MISI 6 DARI 10 · BAB II · TAHAP 3/4', 'Tembus roadblock — JALUR TOL BERDARAH');
      TA.camYaw = Math.PI;
    }
    TA.career.refreshRank();
    snapCamera();
    if (n === 3) {
      // frame Raka below the weapon wheel: camera north-west of him, level
      // look at the crater (sightline verified clear of rocks + bridge deck)
      TA.camera.position.set(194, 6, 2);
      TA.camera.lookAt(252, 6, 30);
      TA.state.camHold = true;
    }
  }

  TA.core = {
    bootGame: bootGame,
    startNewGame: startNewGame,
    continueGame: continueGame,
    pauseGame: pauseGame,
    resumeGame: resumeGame,
    gameOver: gameOver,
    winGame: winGame,
    stageShot: stageShot,
  };

  window.addEventListener('DOMContentLoaded', function () {
    bootGame();
    var params = new URLSearchParams(window.location.search);
    var shot = parseInt(params.get('shot') || '0', 10);
    if (shot >= 1 && shot <= 4) {
      // let the first frame settle, then stage the shot state
      setTimeout(function () { stageShot(shot); }, 350);
    }
  });
})();
