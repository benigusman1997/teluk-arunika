/* races.js — Balapan Liar: 3 rute, checkpoint, timer, rekor terbaik */
(function () {
  'use strict';
  var TA = window.TA;
  TA.races = TA.races || {};

  var RACES = [
    { id: 1, name: 'Pelabuhan Sprint', district: 'PELABUHAN', entry: 50000, reward: 300,
      minRank: 1, best: '1:42.3', start: { x: 500, y: 1000 },
      checkpoints: [{ x: 500, y: 1500 }, { x: 900, y: 1500 }, { x: 1200, y: 1100 }, { x: 800, y: 800 }, { x: 500, y: 1000 }] },
    { id: 2, name: 'Pasar Senja Circuit', district: 'PASAR', entry: 150000, reward: 700,
      minRank: 2, best: '2:05.7', start: { x: 2000, y: 1200 },
      checkpoints: [{ x: 2400, y: 1200 }, { x: 2400, y: 1600 }, { x: 1800, y: 1600 }, { x: 1800, y: 1000 }, { x: 2000, y: 1200 }] },
    { id: 3, name: 'Tol Layang Highway', district: 'TOL LAYANG', entry: 300000, reward: 1500,
      minRank: 3, best: '2:48.1', start: { x: 800, y: 220 },
      checkpoints: [{ x: 2000, y: 220 }, { x: 3200, y: 220 }, { x: 3600, y: 600 }, { x: 3400, y: 2400 }, { x: 3600, y: 2200 }] }
  ];
  TA.races.RACES = RACES;

  var race = null;
  var rivals = [];

  function reset() {
    race = null;
    rivals = [];
    TA.S.race = null;
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }
  TA.races.fmtTime = fmtTime;

  function getBestTime(id) {
    var r = RACES[id - 1];
    return r ? r.best : '—';
  }
  TA.races.getBestTime = getBestTime;

  function canEnter(r) {
    return TA.career.getRank().level >= r.minRank;
  }

  function startRace(id) {
    var r = RACES[id - 1];
    if (!r) return false;
    if (!canEnter(r)) {
      TA.ui.showToast('Balapan ' + r.name + ' butuh karier Tingkat ' + r.minRank + '.');
      return false;
    }
    if (TA.S.money < r.entry) {
      TA.ui.showToast('Biaya masuk ' + TA.fmtRp(r.entry) + ' — uang tidak cukup.');
      return false;
    }
    TA.S.money -= r.entry;
    race = { def: r, t: 0, cp: 0, active: true, checkpoints: r.checkpoints };
    TA.S.race = race;
    TA.S.px = r.start.x; TA.S.py = r.start.y;
    if (!TA.S.inCar) {
      var car = { name: 'PELABUHAN GT', color: '#2980b9', top: 185, tune: 'SPORT', condition: 100, x: r.start.x, y: r.start.y, dir: 0 };
      TA.player.enterCar(car);
    }
    // mobil lawan AI
    rivals = [];
    for (var i = 0; i < 3; i++) {
      rivals.push({ x: r.start.x - 60, y: r.start.y + (i - 1) * 50, cp: 0, speed: 120 + i * 12, color: ['#c0392b', '#8e44ad', '#e67e22'][i] });
    }
    TA.ui.showToast('BALAPAN LIAR — ' + r.name + ' dimulai! Checkpoint 0/' + r.checkpoints.length + ' · BEST ' + r.best);
    TA.ui.showRaceHUD();
    return true;
  }
  TA.races.startRace = startRace;

  function updateRace(dt) {
    if (!race || !race.active) return;
    race.t += dt;
    var cp = race.checkpoints[race.cp];
    if (cp && TA.dist(TA.S.px, TA.S.py, cp.x, cp.y) < 90) {
      race.cp++;
      TA.ui.showToast('CHECKPOINT ' + race.cp + '/' + race.checkpoints.length + ' — ' + fmtTime(race.t));
      if (race.cp >= race.checkpoints.length) completeRace();
    }
    // lawan AI bergerak ke checkpoint-nya
    for (var i = 0; i < rivals.length; i++) {
      var rv = rivals[i];
      var target = race.checkpoints[rv.cp];
      if (!target) continue;
      var dx = target.x - rv.x, dy = target.y - rv.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      rv.x += (dx / d) * rv.speed * dt;
      rv.y += (dy / d) * rv.speed * dt;
      if (d < 90) rv.cp++;
    }
    TA.ui.updateRaceHUD();
  }

  function completeRace() {
    if (!race) return;
    race.active = false;
    var won = true;
    for (var i = 0; i < rivals.length; i++) {
      if (rivals[i].cp >= race.checkpoints.length) won = false;
    }
    var t = fmtTime(race.t);
    if (won) {
      TA.S.racesWon++;
      TA.S.money += race.def.reward * 17000;
      TA.career.addXP(60, 'Balapan menang');
      TA.ui.showToast('MENANG! ' + race.def.name + ' — ' + t + ' · +' + TA.fmtDollar(race.def.reward) + ' · +60 XP');
      TA.crew.showChatter('SARI', 'Itu dia! Tidak ada yang bisa menyalip kita!');
    } else {
      TA.ui.showToast('KALAH — ' + race.def.name + ' ' + t + '. Lawan lebih cepat. Coba lagi!');
    }
    TA.S.race = null;
    race = null;
    TA.ui.hideRaceHUD();
  }
  TA.races.completeRace = completeRace;

  function drawRivals(ctx, W, H) {
    for (var i = 0; i < rivals.length; i++) {
      var rv = rivals[i];
      var p = TA.world.worldToScreen(rv.x, rv.y, W, H);
      if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(p.x - 22, p.y - 9, 48, 26);
      ctx.fillStyle = rv.color;
      ctx.fillRect(p.x - 23, p.y - 11, 46, 22);
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(p.x - 6, p.y - 9, 12, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('LAWAN', p.x - 20, p.y - 18);
    }
  }
  TA.races.drawRivals = drawRivals;

  TA.races.reset = reset;
  TA.races.update = updateRace;
  TA.races.current = function () { return race; };
})();
