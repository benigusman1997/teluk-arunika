/* police.js — Teluk Arunika v3.8. Wanted 1-5 + eskalasi taktik, panel dispatch
   bernama + peran taktis + jarak, roadblock, spike strip, ELANG-1 + kerucut
   sorot, SWAT ARUNIKA (wanted ≥4), bar heat, label insiden, ticker radio. */
(function () {
  'use strict';
  var TA = window.TA;

  /* Peran taktis tetap — sama seperti cover SAN PALMA (nama + peran + meter). */
  var UNIT_ROLES = ['PENEMBAK JITU', 'PENGAWAS PANTAI', 'RAMMING', 'PENGEPUNGAN', 'PIT', 'ROADBLOCK', 'SPOTLIGHT', 'BOX IN', 'FLANKING', 'KEJAR KAKI'];

  var units = [];           /* unit dispatch aktif */
  var roadblocks = [];      /* {x,y} */
  var spikes = [];          /* {x,y} */
  var heli = { active: false, x: 0, y: 0, angle: 0 };
  var swat = { deployed: false, van: null, officers: [], sniper: null };
  var ticker = [];
  var heatTimer = 0;

  function logPoliceRadio(text) {
    ticker.unshift(text);
    if (ticker.length > 3) ticker.length = 3;
  }
  function policeTicker() { return ticker.slice(); }

  function setWanted(n, incident) {
    var s = TA.state;
    var prev = s.wanted;
    s.wanted = Math.max(0, Math.min(5, n));
    if (incident) s.incident = incident;
    if (s.wanted > prev) {
      s.heat = 100; s.heatVisible = true;
      if (s.wanted >= 4 && !swat.deployed) deploySWAT();
      if (s.wanted >= 5 && !heli.active) setHeli(true);
      if (s.wanted >= 3 && roadblocks.length === 0) addRoadblock(s.player.x + 320, s.player.y - 60);
      logPoliceRadio('DISPATCH: wanted naik ke ' + s.wanted + ' bintang — ' + (s.incident || ''));
      if (s.wanted > s.bestWanted) s.bestWanted = s.wanted;
    }
    if (s.wanted === 0) { s.heatVisible = false; }
    rebuildUnits();
  }

  function escalatePolice() { setWanted(TA.state.wanted + 1); }

  function rebuildUnits() {
    var s = TA.state, p = s.player;
    units = [];
    var w = s.wanted;
    if (w <= 0) return;
    /* unit jalan kaki saat wanted rendah / pemain jalan kaki */
    if (w <= 2 || p.onFoot) {
      units.push({ id: 'PATROLI KAKI ×2', role: 'KEJAR KAKI', kind: 'foot', x: p.x - 90, y: p.y + 70 });
      units.push({ id: 'PATROLI KAKI ×1', role: 'KEJAR KAKI', kind: 'foot', x: p.x + 110, y: p.y - 40 });
    }
    if (w >= 1) units.push({ id: 'PATROLI-07', role: p.onFoot ? 'PENGEPUNGAN' : 'RAMMING', kind: 'car', x: p.x - 260, y: p.y + 180 });
    if (w >= 2) units.push({ id: 'PATROLI-12', role: 'RAMMING', kind: 'car', x: p.x + 300, y: p.y - 140 });
    if (w >= 2) units.push({ id: 'PATROLI-21', role: 'FLANKING', kind: 'car', x: p.x + 180, y: p.y + 260 });
    if (w >= 3) units.push({ id: 'BLOKIR-03', role: 'ROADBLOCK', kind: 'block', x: p.x + 340, y: p.y - 60 });
    if (w >= 4) units.push({ id: 'PATROLI-09', role: 'PIT', kind: 'car', x: p.x - 140, y: p.y - 280 });
    if (w >= 4) units.push({ id: 'PATROLI-33', role: 'BOX IN', kind: 'car', x: p.x + 240, y: p.y + 120 });
    if (heli.active) units.push({ id: 'ELANG-1', role: 'SPOTLIGHT', kind: 'heli', x: heli.x, y: heli.y });
    if (swat.deployed) {
      units.push({ id: 'SWAT-01', role: 'PENGEPUNGAN', kind: 'swat', x: swat.officers[0] ? swat.officers[0].x : p.x - 60, y: swat.officers[0] ? swat.officers[0].y : p.y - 60 });
      units.push({ id: 'SWAT-02', role: 'PENEMBAK JITU', kind: 'swat', x: swat.sniper ? swat.sniper.x : p.x + 200, y: swat.sniper ? swat.sniper.y : p.y - 180 });
      units.push({ id: 'SWAT VAN', role: 'LAPIS BAJA', kind: 'swatvan', x: swat.van ? swat.van.x : p.x + 120, y: swat.van ? swat.van.y : p.y + 90 });
    }
  }

  function getDispatchUnits() {
    var s = TA.state, p = s.player;
    rebuildUnitsIfStale();
    return units.map(function (u) {
      var dx = u.x - p.x, dy = u.y - p.y;
      var d = Math.round(Math.sqrt(dx * dx + dy * dy) * 0.45);
      return { id: u.id, role: u.role, kind: u.kind, dist: d, x: u.x, y: u.y };
    });
  }
  var lastRebuild = 0;
  function rebuildUnitsIfStale() {
    if (TA.state.time - lastRebuild > 0.5) { lastRebuild = TA.state.time; rebuildUnits(); }
  }
  function getFootUnits() {
    return getDispatchUnits().filter(function (u) { return u.kind === 'foot'; });
  }
  function getIncidentLabel() {
    var map = { 'PERAMPOKAN BANK': 'PERAMPOKAN BANK', 'PENEMBAKAN': 'PENEMBAKAN', 'PENCURIAN MOBIL': 'PENCURIAN MOBIL', 'BALAPAN LIAR': 'BALAPAN LIAR' };
    return map[TA.state.incident] || 'PENEMBAKAN';
  }
  function getHeatState() {
    var s = TA.state;
    if (!s.heatVisible) return { label: 'AMAN', pct: 0 };
    return { label: s.heat > 25 ? 'TERLIHAT' : 'KEHILANGAN JEJAK', pct: Math.round(s.heat) };
  }

  function spawnRoadblock(x, y) { addRoadblock(x, y); }
  function addRoadblock(x, y) {
    roadblocks.push({ x: x, y: y });
    logPoliceRadio('BLOKIR-03: roadblock dipasang di ' + districtName(x, y));
  }
  function deploySpikeStrip(x, y) { addSpikeStrip(x, y); }
  function addSpikeStrip(x, y) {
    spikes.push({ x: x, y: y });
    logPoliceRadio('PATROLI-09: spike strip digelar — hati-hati ban!');
  }
  function districtName(x, y) {
    if (TA.world) { var d = TA.world.districtAt(x, y); return d ? d.name : 'KOTA'; }
    return 'KOTA';
  }

  function policeHelicopter(on) { setHeli(on); }
  function setHeli(on) {
    var s = TA.state;
    heli.active = !!on;
    if (on) {
      heli.x = s.player.x - 160; heli.y = s.player.y - 220;
      logPoliceRadio('ELANG-1: target terpantau di ' + districtName(s.player.x, s.player.y));
    }
    rebuildUnits();
  }
  function updateHelicopter(dt) {
    if (!heli.active) return;
    var s = TA.state;
    /* orbit ketat di atas pemain, sorot mengikuti */
    heli.angle += dt * 0.7;
    var tx = s.player.x + Math.cos(heli.angle) * 130;
    var ty = s.player.y - 180 + Math.sin(heli.angle) * 60;
    heli.x += (tx - heli.x) * Math.min(1, dt * 2);
    heli.y += (ty - heli.y) * Math.min(1, dt * 2);
  }

  /* ---------- SWAT ARUNIKA ---------- */
  function deploySWAT() {
    var s = TA.state, p = s.player;
    if (swat.deployed) return;
    swat.deployed = true;
    swat.van = { x: p.x + 130, y: p.y + 95, angle: 0.6 };
    swat.officers = [
      { x: p.x - 70, y: p.y - 80, side: -1 },
      { x: p.x + 80, y: p.y - 70, side: 1 },
      { x: p.x - 90, y: p.y + 85, side: -1 },
      { x: p.x + 95, y: p.y + 75, side: 1 },
    ];
    swat.sniper = { x: p.x + 210, y: p.y - 190, shotTimer: 2 };
    logPoliceRadio('SWAT-01: SWAT ARUNIKA diterjunkan — pengepungan dimulai');
    if (TA.ui) TA.ui.showSwatBanner();
    if (!s.swatBannerShown) {
      s.banner = { title: 'SWAT ARUNIKA DITERJUNKAN', sub: 'Unit taktis mengepung — cari jalan keluar!', until: 9999 };
      s.swatBannerShown = true;
    }
    rebuildUnits();
  }
  function updateSWAT(dt) {
    if (!swat.deployed) return;
    var s = TA.state, p = s.player;
    /* petugas mengepung dari dua sisi, merangsek saat pemain terpojok */
    for (var i = 0; i < swat.officers.length; i++) {
      var o = swat.officers[i];
      var wantX = p.x + o.side * 75, wantY = p.y + (i % 2 === 0 ? -75 : 75);
      var dx = wantX - o.x, dy = wantY - o.y, d = Math.sqrt(dx * dx + dy * dy);
      var closing = s.wanted >= 5 || Math.abs(s.car.speed || 0) < 10;
      var sp = closing ? 95 : 55;
      if (d > 4) { o.x += (dx / d) * sp * dt; o.y += (dy / d) * sp * dt; }
    }
    /* penembak jitu menjaga jarak ~200, menembak berkala */
    if (swat.sniper) {
      var sn = swat.sniper;
      var sdx = sn.x - p.x, sdy = sn.y - p.y, sd = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
      var target = 210;
      var move = (sd - target) * 0.4;
      sn.x += (sdx / sd) * move * dt; sn.y += (sdy / sd) * move * dt;
      sn.shotTimer -= dt;
      if (sn.shotTimer <= 0) {
        sn.shotTimer = 2.4;
        if (s.mode === 'playing' && s.shot !== 1 && s.shot !== 2 && s.shot !== 3 && s.shot !== 4) {
          if (TA.player) TA.player.takeDamage(2);
        }
      }
    }
    /* van lapis baja merapat pelan */
    if (swat.van) {
      var vx = p.x + 130 - swat.van.x, vy = p.y + 95 - swat.van.y;
      var vd = Math.sqrt(vx * vx + vy * vy);
      if (vd > 30) { swat.van.x += (vx / vd) * 40 * dt; swat.van.y += (vy / vd) * 40 * dt; }
    }
  }
  function getSWATUnits() {
    return getDispatchUnits().filter(function (u) { return u.kind === 'swat' || u.kind === 'swatvan'; });
  }

  function cooldownWanted(dt) {
    var s = TA.state;
    if (s.wanted <= 0) return;
    var bonus = (TA.crew && TA.crew.getCrewBonus) ? TA.crew.getCrewBonus() : { wantedCooldown: 0 };
    var rate = 2.2 * (1 + (bonus.wantedCooldown || 0));
    if (s.mode === 'playing' && !s.player.onFoot && Math.abs(s.car.speed || 0) > 90) rate *= 0.4;
    s.heat -= rate * dt;
    if (s.heat <= 0) {
      s.heat = 0;
      s.wanted = Math.max(0, s.wanted - 1);
      if (s.wanted > 0) s.heat = 60;
      else { s.heatVisible = false; swat.deployed = false; setHeli(false); roadblocks = []; spikes = []; logPoliceRadio('DISPATCH: jejak hilang — unit kembali.'); }
      rebuildUnits();
    }
  }

  function update(dt) {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    updateHelicopter(dt);
    updateSWAT(dt);
    cooldownWanted(dt);
    heatTimer += dt;
    if (heatTimer > 4) {
      heatTimer = 0;
      var d = districtName(s.player.x, s.player.y);
      var msgs = [
        'PATROLI-12: tembakan di ' + d,
        'ELANG-1: target terpantau di ' + d,
        'PATROLI-07: kejar mobil di ' + d,
      ];
      if (s.wanted >= 2) logPoliceRadio(msgs[Math.floor(Math.random() * msgs.length)]);
    }
    /* roadblock / spike: tabrakan memperlambat + merusak mobil */
    if (!s.player.onFoot) {
      for (var i = 0; i < roadblocks.length; i++) {
        var rb = roadblocks[i];
        var dx = rb.x - s.car.x, dy = rb.y - s.car.y;
        if (dx * dx + dy * dy < 1600) { s.car.speed *= 0.3; s.car.condition = Math.max(5, s.car.condition - 2); }
      }
      for (var j = 0; j < spikes.length; j++) {
        var sp2 = spikes[j];
        var dx2 = sp2.x - s.car.x, dy2 = sp2.y - s.car.y;
        if (dx2 * dx2 + dy2 * dy2 < 900) { s.car.speed *= 0.5; s.car.condition = Math.max(5, s.car.condition - 3); }
      }
    }
  }

  /* ---------- render ---------- */
  function render(ox, oy) {
    var ctx = TA.ctx; if (!ctx) return;
    var s = TA.state;
    /* roadblock */
    for (var i = 0; i < roadblocks.length; i++) {
      var rb = roadblocks[i];
      ctx.fillStyle = '#c2a52e';
      ctx.fillRect(rb.x - ox - 40, rb.y - oy - 8, 80, 16);
      ctx.fillStyle = '#222'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('POLISI', rb.x - ox, rb.y - oy - 12);
      ctx.fillStyle = '#2e5a9a';
      ctx.fillRect(rb.x - ox - 52, rb.y - oy - 22, 16, 30);
      ctx.fillRect(rb.x - ox + 36, rb.y - oy - 22, 16, 30);
    }
    /* spike strip */
    for (var j = 0; j < spikes.length; j++) {
      var sp = spikes[j];
      ctx.fillStyle = '#888';
      for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(sp.x - ox - 30 + k * 14, sp.y - oy + 8); ctx.lineTo(sp.x - ox - 23 + k * 14, sp.y - oy - 8); ctx.lineTo(sp.x - ox - 16 + k * 14, sp.y - oy + 8); ctx.fill(); }
    }
    /* unit patroli (mobil) */
    var list = getDispatchUnits();
    for (var u = 0; u < list.length; u++) {
      var un = list[u];
      if (un.kind === 'car') {
        ctx.save();
        ctx.translate(un.x - ox, un.y - oy);
        ctx.fillStyle = '#d8d8e8'; ctx.fillRect(-20, -10, 40, 20);
        ctx.fillStyle = '#2e5a9a'; ctx.fillRect(-20, -10, 40, 6);
        ctx.fillStyle = (Math.floor(s.time * 4) % 2 === 0) ? '#ff2a2a' : '#2a5aff';
        ctx.beginPath(); ctx.arc(-6, 0, 4, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 0, 4, 0, 6.29); ctx.fill();
        ctx.restore();
      } else if (un.kind === 'foot') {
        ctx.fillStyle = '#2e5a9a'; ctx.beginPath(); ctx.arc(un.x - ox, un.y - oy, 7, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('POL', un.x - ox, un.y - oy + 3);
      }
    }
    /* SWAT VAN + petugas taktis + penembak jitu */
    if (swat.deployed) {
      if (swat.van) {
        ctx.save();
        ctx.translate(swat.van.x - ox, swat.van.y - oy); ctx.rotate(0.6);
        ctx.fillStyle = '#1c1e24'; ctx.fillRect(-34, -15, 68, 30);
        ctx.fillStyle = '#3a3e48'; ctx.fillRect(-34, -15, 68, 8);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('SWAT', 0, 4);
        ctx.restore();
      }
      for (var o = 0; o < swat.officers.length; o++) {
        var off = swat.officers[o];
        ctx.fillStyle = '#22242c'; ctx.beginPath(); ctx.arc(off.x - ox, off.y - oy, 9, 0, 6.29); ctx.fill();
        ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('SWAT', off.x - ox, off.y - oy - 12);
      }
      if (swat.sniper) {
        ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(swat.sniper.x - ox, swat.sniper.y - oy, 8, 0, 6.29); ctx.fill();
        ctx.strokeStyle = '#ff5a2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(swat.sniper.x - ox, swat.sniper.y - oy); ctx.lineTo(s.player.x - ox, s.player.y - oy); ctx.stroke();
        ctx.fillStyle = '#ff5a2a'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('SNIPER', swat.sniper.x - ox, swat.sniper.y - oy - 12);
      }
    }
    /* ELANG-1 + kerucut sorot */
    if (heli.active) {
      var hx = heli.x - ox, hy = heli.y - oy;
      var px = s.player.x - ox, py = s.player.y - oy;
      /* kerucut cahaya menyapu tanah mengikuti pemain */
      var grad = ctx.createRadialGradient(px, py, 10, px, py, 190);
      grad.addColorStop(0, 'rgba(255,240,170,0.5)');
      grad.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, 190, 0, 6.29); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,170,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(px - 40, py - 30); ctx.moveTo(hx, hy); ctx.lineTo(px + 40, py + 30); ctx.stroke();
      ctx.fillStyle = '#22242c'; ctx.beginPath(); ctx.ellipse(hx, hy, 26, 12, 0, 0, 6.29); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx - 26, hy); ctx.lineTo(hx + 26, hy); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ELANG-1', hx, hy - 20);
    }
  }

  TA.police = {
    UNIT_ROLES: UNIT_ROLES,
    setWanted: setWanted, escalatePolice: escalatePolice,
    spawnRoadblock: spawnRoadblock, addRoadblock: addRoadblock,
    deploySpikeStrip: deploySpikeStrip, addSpikeStrip: addSpikeStrip,
    policeHelicopter: policeHelicopter, setHeli: setHeli, updateHelicopter: updateHelicopter,
    cooldownWanted: cooldownWanted,
    deploySWAT: deploySWAT, updateSWAT: updateSWAT, getSWATUnits: getSWATUnits,
    getDispatchUnits: getDispatchUnits, getFootUnits: getFootUnits,
    getIncidentLabel: getIncidentLabel, getHeatState: getHeatState,
    policeTicker: policeTicker, logPoliceRadio: logPoliceRadio,
    update: update, render: render,
    get swat() { return swat; }, get heli() { return heli; },
    get roadblocks() { return roadblocks; }, get spikes() { return spikes; },
  };
})();
