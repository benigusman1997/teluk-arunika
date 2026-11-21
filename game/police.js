/* police.js — wanted 1-5, dispatch, roadblock, spike strip, PIT, ELANG-1 + sorot */
(function () {
  'use strict';
  var TA = window.TA;
  TA.police = TA.police || {};

  var units = [];
  var roadblocks = [];
  var spikeStrips = [];
  var heli = { active: false, x: 0, y: 0, angle: 0 };
  var ticker = [];
  var cooldownT = 0;
  var sirenT = 0;

  function reset() {
    units = [];
    roadblocks = [];
    spikeStrips = [];
    heli = { active: false, x: 0, y: 0, angle: 0 };
    ticker = [
      'PATROLI-12: patroli rutin di Pasar Senja',
      'ELANG-1: standby di helipad Pelabuhan',
      'BLOKIR-03: siap siaga di Tol Layang'
    ];
    cooldownT = 0;
  }

  function logPoliceRadio(text) {
    ticker.unshift(text);
    if (ticker.length > 3) ticker.length = 3;
    TA.ui.renderPoliceTicker();
  }
  TA.police.logPoliceRadio = logPoliceRadio;

  function policeTicker() { return ticker.slice(); }
  TA.police.policeTicker = policeTicker;

  function getIncidentLabel() {
    var inc = TA.S.incident || '—';
    if (inc === '—') return 'DISPATCH POLISI';
    return 'DISPATCH POLISI — ' + inc;
  }
  TA.police.getIncidentLabel = getIncidentLabel;

  function getHeatState() {
    if (TA.S.wanted === 0) return { label: 'AMAN', pct: 0 };
    if (TA.S.heatVisible) return { label: 'TERLIHAT', pct: Math.round(TA.S.heat) };
    return { label: 'KEHILANGAN JEJAK', pct: Math.round(TA.S.heat) };
  }
  TA.police.getHeatState = getHeatState;

  function setWanted(n, incident) {
    var prev = TA.S.wanted;
    TA.S.wanted = TA.clamp(n, 0, 5);
    if (incident) TA.S.incident = incident;
    if (TA.S.wanted > TA.S.bestWanted) TA.S.bestWanted = TA.S.wanted;
    if (TA.S.wanted > 0) {
      TA.S.heat = 100;
      TA.S.heatVisible = true;
      cooldownT = 0;
    }
    if (TA.S.wanted >= 4 && !heli.active) {
      heli.active = true;
      heli.x = TA.S.px - 300; heli.y = TA.S.py - 300;
      logPoliceRadio('ELANG-1: target terpantau, sorot menyala');
      TA.ui.showToast('ELANG-1 DITERJUNKAN — helikopter polisi di atasmu!');
    }
    if (TA.S.wanted < 4 && heli.active) heli.active = false;
    if (TA.S.wanted >= 3 && roadblocks.length === 0) spawnRoadblock();
    if (TA.S.wanted !== prev) escalatePolice();
  }
  TA.police.setWanted = setWanted;

  function escalatePolice() {
    var w = TA.S.wanted;
    rebuildUnits();
    if (w >= 1) logPoliceRadio('PATROLI KAKI: pengejaran pejalan kaki dimulai');
    if (w >= 2) logPoliceRadio('PATROLI-12: mobil patroli mengejar target');
    if (w >= 3) logPoliceRadio('BLOKIR-03: roadblock dipasang di Pelabuhan');
    if (w >= 4) {
      logPoliceRadio('PATROLI-07: PIT maneuver disiapkan');
      deploySpikeStrip();
    }
    if (w >= 5) logPoliceRadio('ELANG-1: semua unit, tutup semua jalan keluar');
  }

  function rebuildUnits() {
    units = [];
    var w = TA.S.wanted;
    if (w <= 0) return;
    if (w <= 2 || !TA.S.inCar) {
      units.push({ name: 'PATROLI KAKI ×2', tactic: 'KEJAR KAKI', kind: 'foot', dist: 21 });
      units.push({ name: 'PATROLI KAKI ×2', tactic: 'KEJAR KAKI', kind: 'foot', dist: 34 });
    }
    if (w >= 2) {
      units.push({ name: 'PATROLI-12', tactic: 'RAMMING', kind: 'car', dist: 86 });
      units.push({ name: 'PATROLI-07', tactic: w >= 4 ? 'PIT' : 'FLANKING', kind: 'car', dist: 120 });
    }
    if (w >= 3) units.push({ name: 'BLOKIR-03', tactic: 'ROADBLOCK', kind: 'block', dist: 210 });
    if (w >= 4) units.push({ name: 'PATROLI-21', tactic: 'BOX IN', kind: 'car', dist: 150 });
    if (w >= 4) units.push({ name: 'PATROLI-09', tactic: 'FLANKING', kind: 'car', dist: 180 });
    if (w >= 4 || heli.active) units.push({ name: 'ELANG-1', tactic: 'SPOTLIGHT', kind: 'air', dist: 240 });
    if (w >= 5) units.push({ name: 'PATROLI-33', tactic: 'RAMMING', kind: 'car', dist: 260 });
  }

  function getDispatchUnits() {
    // jarak hidup: berdenyut pelan mengikuti gerakan pemain
    var t = Date.now() / 1000;
    return units.map(function (u, i) {
      var d = Math.max(8, Math.round(u.dist + Math.sin(t * 0.7 + i * 1.3) * 12 - (TA.S.inCar ? TA.S.speed * 0.05 : 0)));
      return { name: u.name, tactic: u.tactic, kind: u.kind, dist: d };
    });
  }
  TA.police.getDispatchUnits = getDispatchUnits;

  function getFootUnits() {
    return getDispatchUnits().filter(function (u) { return u.kind === 'foot'; });
  }
  TA.police.getFootUnits = getFootUnits;

  function spawnRoadblock() {
    var ahead = 420;
    roadblocks.push({
      x: TA.S.px + Math.cos(TA.S.angle) * ahead,
      y: TA.S.py + Math.sin(TA.S.angle) * ahead,
      angle: TA.S.angle + Math.PI / 2
    });
    logPoliceRadio('BLOKIR-03: roadblock dipasang di depan target');
  }
  TA.police.spawnRoadblock = spawnRoadblock;

  function deploySpikeStrip() {
    spikeStrips.push({
      x: TA.S.px + Math.cos(TA.S.angle) * 300,
      y: TA.S.py + Math.sin(TA.S.angle) * 300
    });
    logPoliceRadio('PATROLI-07: spike strip digelar di jalan');
  }
  TA.police.deploySpikeStrip = deploySpikeStrip;

  function onShotFired() {
    if (TA.S.wanted < 2) setWanted(2, 'PENEMBAKAN');
    else TA.S.incident = 'PENEMBAKAN';
    TA.S.heat = 100;
    TA.S.heatVisible = true;
    logPoliceRadio('PATROLI-12: tembakan di ' + TA.world.districtAt(TA.S.px, TA.S.py).name);
    for (var i = 0; i < TA.world.pedestrians().length; i++) {
      var p = TA.world.pedestrians()[i];
      if (TA.dist(p.x, p.y, TA.S.px, TA.S.py) < 350) p.panic = 3;
    }
  }
  TA.police.onShotFired = onShotFired;

  function cooldownWanted(dt) {
    if (TA.S.wanted <= 0) return;
    var rate = 4;
    var bonus = TA.crew.getCrewBonus();
    rate *= (1 + bonus.wantedCooldown);
    rate *= (1 + TA.career.wantedCooldownBonus());
    cooldownT += dt;
    // heat menyusut saat bersembunyi (tidak menembak / tidak terlihat)
    if (!TA.S.heatVisible) {
      TA.S.heat -= rate * dt;
      if (TA.S.heat <= 0) {
        TA.S.heat = 0;
        TA.S.wanted = Math.max(0, TA.S.wanted - 1);
        TA.S.heat = TA.S.wanted > 0 ? 100 : 0;
        TA.S.heatVisible = TA.S.wanted > 0;
        if (TA.S.wanted === 0) {
          TA.S.incident = '—';
          logPoliceRadio('DISPATCH: target hilang, unit kembali patroli');
          TA.ui.showToast('Jejak hilang — polisi kehilanganmu.');
        } else {
          rebuildUnits();
        }
      }
    } else {
      // terlihat: heat penuh, lalu perlahan "kehilangan jejak" bila pemain kabur jauh
      TA.S.heat = 100;
      if (cooldownT > 6) {
        TA.S.heatVisible = false;
        cooldownT = 0;
      }
    }
  }

  function updateHelicopter(dt) {
    if (!heli.active) return;
    heli.angle += dt * 0.9;
    var tx = TA.S.px + Math.cos(heli.angle) * 150;
    var ty = TA.S.py + Math.sin(heli.angle) * 150;
    heli.x += (tx - heli.x) * Math.min(1, dt * 2);
    heli.y += (ty - heli.y) * Math.min(1, dt * 2);
    sirenT += dt;
    if (sirenT > 4) { sirenT = 0; TA.audio.sirenSound(); }
  }

  function update(dt) {
    cooldownWanted(dt);
    updateHelicopter(dt);
    // roadblock: tabrakan memperlambat mobil
    if (TA.S.inCar) {
      for (var i = 0; i < roadblocks.length; i++) {
        if (TA.dist(TA.S.px, TA.S.py, roadblocks[i].x, roadblocks[i].y) < 60) {
          TA.S.speed *= 0.3;
          if (TA.S.car) TA.S.car.condition = Math.max(10, TA.S.car.condition - 8);
          TA.ui.showToast('ROADBLOCK! Mobil menghantam barikade.');
          roadblocks.splice(i, 1);
          break;
        }
      }
      for (var j = 0; j < spikeStrips.length; j++) {
        if (TA.dist(TA.S.px, TA.S.py, spikeStrips[j].x, spikeStrips[j].y) < 50) {
          TA.S.speed *= 0.25;
          if (TA.S.car) TA.S.car.condition = Math.max(10, TA.S.car.condition - 15);
          TA.ui.showToast('SPIKE STRIP! Ban bocor, kecepatan jatuh.');
          spikeStrips.splice(j, 1);
          break;
        }
      }
    }
    // unit mobil polisi mengejar (visual: bergerak ke arah pemain)
    for (var k = 0; k < units.length; k++) {
      var u = units[k];
      if (u.kind === 'car') {
        u.x = u.x === undefined ? TA.S.px - 200 - k * 60 : u.x;
        u.y = u.y === undefined ? TA.S.py + 120 + k * 40 : u.y;
        var dx = TA.S.px - u.x, dy = TA.S.py - u.y;
        var dd = Math.sqrt(dx * dx + dy * dy) || 1;
        var sp = 170 * dt;
        if (dd > 90) { u.x += (dx / dd) * sp; u.y += (dy / dd) * sp; }
      }
    }
  }

  function draw(ctx, W, H) {
    var camX = TA.S.camX - W / 2, camY = TA.S.camY - H / 2;
    // roadblock
    for (var i = 0; i < roadblocks.length; i++) {
      var r = roadblocks[i];
      ctx.save();
      ctx.translate(r.x - camX, r.y - camY);
      ctx.rotate(r.angle);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(-70, -10, 140, 20);
      ctx.fillStyle = '#fff';
      for (var s = -60; s < 60; s += 20) ctx.fillRect(s, -10, 10, 20);
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('POLISI', -20, -16);
      ctx.restore();
    }
    // spike strip
    for (var j = 0; j < spikeStrips.length; j++) {
      var sp = spikeStrips[j];
      ctx.fillStyle = '#222';
      ctx.fillRect(sp.x - 40 - camX, sp.y - 6 - camY, 80, 12);
      ctx.fillStyle = '#c0c8d8';
      for (var t = -36; t < 36; t += 12) {
        ctx.beginPath();
        ctx.moveTo(sp.x + t - camX, sp.y - 6 - camY);
        ctx.lineTo(sp.x + t + 5 - camX, sp.y + 6 - camY);
        ctx.lineTo(sp.x + t + 10 - camX, sp.y - 6 - camY);
        ctx.closePath(); ctx.fill();
      }
    }
    // mobil patroli
    for (var k = 0; k < units.length; k++) {
      var u = units[k];
      if (u.kind !== 'car' || u.x === undefined) continue;
      var px = u.x - camX, py = u.y - camY;
      if (px < -80 || px > W + 80 || py < -80 || py > H + 80) continue;
      ctx.fillStyle = '#1c2733';
      ctx.fillRect(px - 23, py - 11, 46, 22);
      ctx.fillStyle = '#f2f5ff';
      ctx.fillRect(px - 23, py - 11, 46, 7);
      ctx.fillStyle = (Math.floor(Date.now() / 300) % 2 === 0) ? '#ff2d2d' : '#2d6bff';
      ctx.fillRect(px - 6, py - 14, 12, 5);
    }
    // unit jalan kaki
    for (var f = 0; f < units.length; f++) {
      var fu = units[f];
      if (fu.kind !== 'foot') continue;
      var fx = TA.S.px - 60 - f * 40 - camX, fy = TA.S.py + 70 + f * 20 - camY;
      ctx.fillStyle = '#1c2733';
      ctx.beginPath(); ctx.arc(fx, fy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('POL', fx - 10, fy - 14);
    }
    // ELANG-1 + kerucut sorot
    if (heli.active) {
      var hx = heli.x - camX, hy = heli.y - camY;
      var px2 = TA.S.px - camX, py2 = TA.S.py - camY;
      // kerucut cahaya dari heli ke pemain
      var grad = ctx.createLinearGradient(hx, hy, px2, py2);
      grad.addColorStop(0, 'rgba(255,240,160,0.35)');
      grad.addColorStop(1, 'rgba(255,240,160,0.10)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy + 6);
      ctx.lineTo(px2 - 70, py2 - 10);
      ctx.lineTo(px2 + 70, py2 + 30);
      ctx.lineTo(hx + 8, hy + 6);
      ctx.closePath(); ctx.fill();
      // lingkaran sorot di tanah mengikuti pemain
      ctx.fillStyle = 'rgba(255,240,160,0.28)';
      ctx.beginPath(); ctx.ellipse(px2, py2, 70, 34, 0, 0, Math.PI * 2); ctx.fill();
      // heli
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4a63';
      ctx.beginPath(); ctx.arc(hx, hy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      var rot = Date.now() / 60;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(rot) * 26, hy + Math.sin(rot) * 4);
      ctx.lineTo(hx - Math.cos(rot) * 26, hy - Math.sin(rot) * 4);
      ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 12px Arial';
      if (hy > 100) ctx.fillText('ELANG-1', hx - 26, hy - 22);
    }
  }

  TA.police.reset = reset;
  TA.police.setWanted = setWanted;
  TA.police.escalatePolice = escalatePolice;
  TA.police.spawnRoadblock = spawnRoadblock;
  TA.police.deploySpikeStrip = deploySpikeStrip;
  TA.police.updateHelicopter = updateHelicopter;
  TA.police.cooldownWanted = cooldownWanted;
  TA.police.update = update;
  TA.police.draw = draw;
  TA.police.getDispatchUnits = getDispatchUnits;
  TA.police.heliActive = function () { return heli.active; };
  TA.police.roadblocks = function () { return roadblocks; };
})();
