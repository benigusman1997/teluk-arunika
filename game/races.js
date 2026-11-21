/* races.js — Teluk Arunika v3.6. Side job Balapan Liar: 3 rute, garis start,
   checkpoint berurutan, timer + rekor BEST, mobil lawan AI, biaya + hadiah. */
(function () {
  'use strict';
  var TA = window.TA;

  var RACES = [
    { key: 'sprint', name: 'Pelabuhan Sprint', district: 'PELABUHAN', fee: 100, prize: 600, unlockRank: 1,
      start: { x: 300, y: 900 }, checkpoints: [{ x: 800, y: 900 }, { x: 800, y: 500 }, { x: 300, y: 500 }] },
    { key: 'circuit', name: 'Pasar Senja Circuit', district: 'PASAR', fee: 250, prize: 1200, unlockRank: 2,
      start: { x: 1100, y: 700 }, checkpoints: [{ x: 1700, y: 700 }, { x: 1700, y: 300 }, { x: 1100, y: 300 }] },
    { key: 'highway', name: 'Tol Layang Highway', district: 'TOL LAYANG', fee: 500, prize: 2500, unlockRank: 3,
      start: { x: 600, y: 1325 }, checkpoints: [{ x: 1800, y: 1325 }, { x: 2900, y: 1325 }, { x: 3300, y: 1900 }] },
  ];

  function fmtTime(sec) {
    if (sec === null || sec === undefined) return '--:--.-';
    var m = Math.floor(sec / 60), s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  }
  function getBestTime(key) {
    var b = TA.state.raceBest[key];
    return b === null || b === undefined ? null : b;
  }

  function startRace(key) {
    var s = TA.state;
    var r = null;
    for (var i = 0; i < RACES.length; i++) if (RACES[i].key === key) r = RACES[i];
    if (!r) return false;
    if (s.rank < r.unlockRank) { if (TA.ui) TA.ui.toast('Butuh karier Tingkat ' + r.unlockRank + ' untuk balapan ini!'); return false; }
    if (s.money < r.fee) { if (TA.ui) TA.ui.toast('Uang tidak cukup untuk biaya masuk $' + r.fee); return false; }
    s.money -= r.fee;
    s.race = { key: r.key, name: r.name, checkpoint: 0, timer: 0, best: getBestTime(r.key), rivals: [
      { x: r.start.x + 60, y: r.start.y - 40, cp: 0, speed: 120 },
      { x: r.start.x + 60, y: r.start.y + 40, cp: 0, speed: 110 },
    ]};
    s.player.x = r.start.x; s.player.y = r.start.y;
    s.player.onFoot = false;
    s.car = { name: 'ARUNIKA SEDAN', condition: 92, speed: 0, x: r.start.x, y: r.start.y, angle: 0, color: '#3f7fbf' };
    if (TA.crew) TA.crew.showCrewChatter('SARI', 'Balapan ' + r.name + ' — kalahkan waktu terbaik ' + fmtTime(s.race.best) + '!');
    if (TA.ui) TA.ui.showBanner('BALAPAN LIAR — ' + r.name, 'Biaya $' + r.fee + ' · Hadiah $' + r.prize + ' · BEST ' + fmtTime(s.race.best));
    return true;
  }

  function updateRace(dt) {
    var s = TA.state;
    if (!s.race) return;
    var r = null;
    for (var i = 0; i < RACES.length; i++) if (RACES[i].key === s.race.key) r = RACES[i];
    if (!r) return;
    s.race.timer += dt;
    /* checkpoint berurutan */
    var cp = r.checkpoints[s.race.checkpoint];
    if (cp) {
      var dx = cp.x - s.player.x, dy = cp.y - s.player.y;
      if (dx * dx + dy * dy < 70 * 70) {
        s.race.checkpoint++;
        if (TA.audio) TA.audio.checkpointSound();
      }
    }
    /* mobil lawan AI mengejar checkpoint */
    for (var j = 0; j < s.race.rivals.length; j++) {
      var rv = s.race.rivals[j];
      var tcp = r.checkpoints[Math.min(rv.cp, r.checkpoints.length - 1)];
      var rx = tcp.x - rv.x, ry = tcp.y - rv.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
      rv.x += (rx / rd) * rv.speed * dt; rv.y += (ry / rd) * rv.speed * dt;
      if (rd < 70) rv.cp++;
    }
    if (s.race.checkpoint >= r.checkpoints.length) completeRace();
  }

  function completeRace() {
    var s = TA.state;
    var r = null;
    for (var i = 0; i < RACES.length; i++) if (RACES[i].key === s.race.key) r = RACES[i];
    var t = s.race.timer;
    var won = s.race.rivals.every(function (rv) { return rv.cp < r.checkpoints.length; });
    if (won) {
      s.money += r.prize; s.racesWon++;
      if (TA.career) TA.career.addXP(50);
    }
    var prevBest = getBestTime(r.key);
    if (prevBest === null || t < prevBest) s.raceBest[r.key] = Math.round(t * 10) / 10;
    if (TA.ui) TA.ui.showBanner(won ? 'MENANG BALAPAN!' : 'KALAH BALAPAN', r.name + ' — ' + fmtTime(t) + ' · BEST ' + fmtTime(s.raceBest[r.key]) + (won ? ' · +$' + r.prize : ''));
    s.race = null;
  }

  function update(dt) { updateRace(dt); }

  function render(ox, oy) {
    var ctx = TA.ctx; if (!ctx) return;
    var s = TA.state;
    if (!s.race) return;
    var r = null;
    for (var i = 0; i < RACES.length; i++) if (RACES[i].key === s.race.key) r = RACES[i];
    if (!r) return;
    /* garis start */
    ctx.fillStyle = '#fff';
    ctx.fillRect(r.start.x - ox - 8, r.start.y - oy - 40, 16, 80);
    ctx.fillStyle = '#222'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('START', r.start.x - ox, r.start.y - oy - 48);
    /* checkpoint aktif */
    var cp = r.checkpoints[s.race.checkpoint];
    if (cp) {
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cp.x - ox, cp.y - oy, 26, 0, 6.29); ctx.stroke();
      ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('CP ' + (s.race.checkpoint + 1) + '/' + r.checkpoints.length, cp.x - ox, cp.y - oy - 32);
    }
    /* mobil lawan */
    for (var j = 0; j < s.race.rivals.length; j++) {
      var rv = s.race.rivals[j];
      ctx.fillStyle = j === 0 ? '#7a2e7a' : '#2e7a5a';
      ctx.fillRect(rv.x - ox - 20, rv.y - oy - 10, 40, 20);
    }
  }

  TA.races = {
    RACES: RACES, startRace: startRace, updateRace: updateRace,
    completeRace: completeRace, getBestTime: getBestTime, fmtTime: fmtTime,
    update: update, render: render,
  };
})();
