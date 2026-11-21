// Teluk Arunika v3.6 — races.js (NEW in v3.6)
// Street races: 3 routes with entry fee, prize, rival AI cars, sequential
// checkpoints, running timer + best time. Race 2 needs career Rank 2,
// Race 3 needs Rank 3.
(function () {
  'use strict';
  var TA = window.TA;

  var RACES = [
    {
      name: 'Pelabuhan Sprint', district: 'PELABUHAN',
      entry: 50, prize: 400, best: 102.3, // 1:42.3
      checkpoints: [
        { x: -80, z: 150, label: 'Dermaga Senja' },
        { x: -80, z: 80, label: 'Gudang Kontainer' },
        { x: -40, z: 0, label: 'Simpang Plaza' },
        { x: 0, z: -80, label: 'Jembatan Kecil' },
        { x: 40, z: -140, label: 'Gerbang Tol' },
      ],
      rivals: 3,
    },
    {
      name: 'Pasar Senja Circuit', district: 'PASAR',
      entry: 100, prize: 700, best: 125.7, // 2:05.7
      minRank: 2,
      checkpoints: [
        { x: 60, z: 60, label: 'Pasar Ikan' },
        { x: 120, z: 40, label: 'Lorong Lampion' },
        { x: 120, z: -80, label: 'Simpang Timur' },
        { x: 40, z: -120, label: 'Menara Jam' },
        { x: 60, z: 60, label: 'Garis Finish' },
      ],
      rivals: 4,
    },
    {
      name: 'Tol Layang Highway', district: 'TOL LAYANG',
      entry: 200, prize: 1200, best: 168.9, // 2:48.9
      minRank: 3,
      checkpoints: [
        { x: -40, z: -160, label: 'Gerbang Tol' },
        { x: -40, z: -60, label: 'Layang Tengah' },
        { x: -40, z: 40, label: 'Tikungan Pelabuhan' },
        { x: 80, z: 40, label: 'Jembatan Pulau Abu' },
        { x: 170, z: 40, label: 'Finish Pulau Abu' },
      ],
      rivals: 5,
    },
  ];

  var rivalCars = [];
  var checkpointMarkers = [];
  var raceState = null; // { index, checkpoint, time, running, finished }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = (sec % 60).toFixed(1);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getBestTime(index) {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem('ta_race_best') || '{}'); } catch (e) { stored = {}; }
    if (stored[index] != null) return stored[index];
    return RACES[index].best;
  }

  function saveBestTime(index, time) {
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem('ta_race_best') || '{}'); } catch (e) { stored = {}; }
    if (stored[index] == null || time < stored[index]) {
      stored[index] = time;
      try { localStorage.setItem('ta_race_best', JSON.stringify(stored)); } catch (e) {}
    }
  }

  function startRace(index) {
    var r = RACES[index];
    if (!r) return false;
    if (r.minRank && TA.career.getRank().level < r.minRank) {
      TA.ui.showToast('Balapan ini butuh karier Tingkat ' + r.minRank + ' (' + TA.career.RANKS[r.minRank - 1].name + ').');
      return false;
    }
    if (TA.state.money < r.entry) {
      TA.ui.showToast('Biaya masuk $' + r.entry + ' — uangmu kurang.');
      return false;
    }
    TA.state.money -= r.entry;
    raceState = { index: index, checkpoint: 0, time: 0, running: true, finished: false };
    TA.state.race = raceState;
    TA.state.raceActive = true;
    spawnCheckpointMarkers();
    spawnRivalCars();
    TA.ui.showBanner('BALAPAN LIAR — ' + r.name, 'Checkpoint 1/' + r.checkpoints.length + ' · BEST ' + formatTime(getBestTime(index)) + ' · Hadiah $' + r.prize);
    TA.crew.showCrewChatter('SARI', 'Gaspol dari start! Jangan beri mereka celah.');
    return true;
  }

  function spawnCheckpointMarkers() {
    clearCheckpointMarkers();
    var T = TA.three;
    var r = RACES[raceState.index];
    r.checkpoints.forEach(function (cp, i) {
      var ring = new T.Mesh(new T.TorusGeometry(5, 0.5, 10, 32),
        new T.MeshBasicMaterial({ color: i === 0 ? 0x00ff88 : 0xffc400, transparent: true, opacity: 0.9 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cp.x, 3, cp.z);
      TA.scene.add(ring);
      checkpointMarkers.push(ring);
    });
    // start line: checkered strip on the road
    var start = new T.Mesh(new T.PlaneGeometry(10, 2),
      new T.MeshBasicMaterial({ color: 0xffffff }));
    start.rotation.x = -Math.PI / 2;
    start.position.set(r.checkpoints[0].x, 0.15, r.checkpoints[0].z);
    TA.scene.add(start);
    checkpointMarkers.push(start);
  }

  function clearCheckpointMarkers() {
    checkpointMarkers.forEach(function (m) { TA.scene.remove(m); });
    checkpointMarkers = [];
  }

  function spawnRivalCars() {
    clearRivalCars();
    var r = RACES[raceState ? raceState.index : 0];
    var colors = [0xff2d78, 0x00e5ff, 0xffe600, 0x7c4dff, 0x00ff9d];
    var start = r.checkpoints[0];
    for (var i = 0; i < r.rivals; i++) {
      var model = TA.player.CAR_MODELS[(i + 1) % TA.player.CAR_MODELS.length];
      var T = TA.three;
      var g = new T.Group();
      var body = new T.Mesh(new T.BoxGeometry(2, 0.75, 4.4),
        new T.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.3, metalness: 0.6 }));
      body.position.y = 0.7; body.castShadow = true;
      g.add(body);
      var cab = new T.Mesh(new T.BoxGeometry(1.7, 0.6, 2.1),
        new T.MeshStandardMaterial({ color: 0x141c26, roughness: 0.15, metalness: 0.8 }));
      cab.position.set(0, 1.32, -0.2);
      g.add(cab);
      g.position.set(start.x + 6 + i * 5, 0, start.z + 8);
      TA.scene.add(g);
      rivalCars.push({
        mesh: g, targetCp: 1, speed: 11 + i * 1.5,
        progress: 0, name: ['KERONO BOY ' + (i + 1), 'SI CEPAT', 'BAYANGAN'][i % 3],
      });
    }
  }

  function clearRivalCars() {
    rivalCars.forEach(function (r) { TA.scene.remove(r.mesh); });
    rivalCars = [];
  }

  function updateRace(dt) {
    if (!raceState || !raceState.running) {
      // idle animation for checkpoint rings
      checkpointMarkers.forEach(function (m, i) { if (m.rotation) m.rotation.z += dt * 0.5; });
      return;
    }
    var r = RACES[raceState.index];
    raceState.time += dt;
    // checkpoint rings pulse
    checkpointMarkers.forEach(function (m, i) {
      if (m.rotation) m.rotation.z += dt * (i === raceState.checkpoint ? 2 : 0.5);
    });
    // player checkpoint
    var cp = r.checkpoints[raceState.checkpoint];
    if (cp) {
      var dx = cp.x - TA.playerPos.x, dz = cp.z - TA.playerPos.z;
      if (dx * dx + dz * dz < 100) {
        raceState.checkpoint++;
        if (raceState.checkpoint >= r.checkpoints.length) {
          completeRace();
        } else {
          TA.ui.showToast('Checkpoint ' + raceState.checkpoint + '/' + r.checkpoints.length + ' — ' + r.checkpoints[raceState.checkpoint].label);
        }
      }
    }
    // rivals drive the checkpoint chain
    rivalCars.forEach(function (rv) {
      var target = r.checkpoints[Math.min(rv.targetCp, r.checkpoints.length - 1)];
      var dx = target.x - rv.mesh.position.x, dz = target.z - rv.mesh.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 8) rv.targetCp = Math.min(rv.targetCp + 1, r.checkpoints.length - 1);
      if (d > 0.5) {
        rv.mesh.position.x += (dx / d) * rv.speed * dt;
        rv.mesh.position.z += (dz / d) * rv.speed * dt;
        rv.mesh.rotation.y = Math.atan2(dx, dz);
      }
    });
    TA.ui.updateRaceHUD();
  }

  function completeRace() {
    var r = RACES[raceState.index];
    raceState.running = false;
    raceState.finished = true;
    var time = raceState.time;
    var best = getBestTime(raceState.index);
    var isRecord = time < best;
    saveBestTime(raceState.index, time);
    // did any rival finish first? (rival progress vs player)
    var rivalBest = Math.min.apply(null, rivalCars.map(function (rv) { return rv.targetCp; }));
    var won = rivalBest < r.checkpoints.length - 1 || raceState.checkpoint >= r.checkpoints.length;
    if (won) {
      TA.state.money += r.prize;
      TA.state.racesWon++;
      TA.career.addXP(60);
      TA.ui.showBanner('MENANG — ' + r.name, 'Waktu ' + formatTime(time) + (isRecord ? ' · REKOR BARU!' : ' · BEST ' + formatTime(getBestTime(raceState.index))) + ' · +$' + r.prize + ' · +60 XP');
      TA.crew.showCrewChatter('SARI', 'MENANG! Waktu ' + formatTime(time) + ' — mereka tidak ada apa-apanya.');
    } else {
      TA.ui.showBanner('KALAH — ' + r.name, 'Waktu ' + formatTime(time) + ' · Coba lagi, Raka.');
    }
    TA.state.raceActive = false;
    clearCheckpointMarkers();
    clearRivalCars();
    raceState = null;
    TA.state.race = null;
  }

  function quitRace() {
    if (!raceState) return;
    raceState = null;
    TA.state.race = null;
    TA.state.raceActive = false;
    clearCheckpointMarkers();
    clearRivalCars();
  }

  TA.races = {
    RACES: RACES,
    startRace: startRace,
    updateRace: updateRace,
    completeRace: completeRace,
    quitRace: quitRace,
    getBestTime: getBestTime,
    formatTime: formatTime,
    spawnRivalCars: spawnRivalCars,
    getRaceState: function () { return raceState; },
  };
})();
