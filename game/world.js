/* world.js — Teluk Arunika v3.8. Bangun kota pelabuhan: 6 distrik (termasuk
   Pulau Abu vulkanik), 60+ gedung, tol layang, pelabuhan, pantai, Bank Arunika,
   lalu lintas AI, pejalan kaki, siklus siang/malam + hujan, render Canvas 2D. */
(function () {
  'use strict';
  var TA = window.TA;
  var WORLD_W = 3600, WORLD_H = 2600;

  /* 6 distrik: nama, zona, warna tanah, suasana awal. */
  var DISTRICTS = [
    { name: 'PELABUHAN', x: 0, y: 0, w: 900, h: 1000, ground: '#3a4148', label: 'Dermaga Senja' },
    { name: 'PASAR', x: 900, y: 0, w: 1100, h: 1000, ground: '#4a4238', label: 'Pasar Senja' },
    { name: 'GANG NEON', x: 2000, y: 0, w: 1000, h: 1000, ground: '#3c2f45', label: 'Gang Neon' },
    { name: 'TOL LAYANG', x: 0, y: 1000, w: 3600, h: 700, ground: '#33363d', label: 'Jalan Layang' },
    { name: 'PANTAI', x: 0, y: 1700, w: 2000, h: 900, ground: '#5a4a33', label: 'Pantai Arunika' },
    { name: 'PULAU ABU', x: 2000, y: 1700, w: 1600, h: 900, ground: '#2b2622', label: 'Kawah Abu' },
  ];

  var buildings = [], traffic = [], peds = [], containers = [], stashes = [], ramps = [];
  var rainDrops = [], embers = [], smoke = [];
  var cam = { x: 1500, y: 1300 };

  function rng() { return TA.rng(); }

  function buildCity() {
    buildings = []; containers = []; stashes = []; ramps = [];
    var r = TA.core.mulberry32(20261122);
    /* gedung: blok kota, hindari jalan grid tiap 260 px */
    var palette = ['#5a5f6b', '#6b5a4a', '#4a5a6b', '#5b4a5a', '#4f5a4a', '#6b6b52'];
    var count = 0, guard = 0;
    while (count < 72 && guard++ < 900) {
      var bx = 60 + Math.floor(r() * 34) * 100;
      var by = 60 + Math.floor(r() * 24) * 100;
      if (bx % 260 < 70 || by % 260 < 70) continue;
      if (bx > 2900 && by > 1700) continue; /* Pulau Abu: kawah, bukan gedung */
      if (bx < 900 && by < 900 && r() < 0.45) continue; /* pelabuhan: kontainer */
      var bw = 60 + r() * 90, bh = 60 + r() * 90;
      buildings.push({ x: bx, y: by, w: bw, h: bh, c: palette[Math.floor(r() * palette.length)], neon: r() < 0.3 });
      count++;
    }
    /* kontainer pelabuhan */
    var cc = ['#b3541e', '#2e6b8a', '#7a8a2e', '#8a2e4e'];
    for (var i = 0; i < 26; i++) {
      containers.push({ x: 120 + (i % 6) * 130, y: 140 + Math.floor(i / 6) * 110, w: 110, h: 44, c: cc[i % 4] });
    }
    /* 12 Koin Arunika tersebar di 6 distrik */
    var spots = [[300, 700], [700, 300], [1100, 500], [1600, 800], [2200, 400], [2700, 800], [500, 1300], [1500, 1500], [2600, 1200], [800, 2000], [1600, 2300], [3200, 2100]];
    for (var k = 0; k < 12; k++) stashes.push({ x: spots[k][0], y: spots[k][1], taken: k < 3 });
    /* 5 ramp lompatan */
    var rs = [[400, 1100], [1200, 1600], [2200, 1100], [3000, 1500], [1400, 2200]];
    for (var j = 0; j < 5; j++) ramps.push({ x: rs[j][0], y: rs[j][1], done: j < 1 });
    /* hujan + bara + asap */
    rainDrops = []; for (var d = 0; d < 220; d++) rainDrops.push({ x: r() * 1280, y: r() * 720, s: 6 + r() * 8 });
    embers = []; for (var e = 0; e < 60; e++) embers.push({ x: 3300 + (r() - 0.5) * 260, y: 2150 + (r() - 0.5) * 200, s: 1 + r() * 2.5, p: r() * 6.28 });
    smoke = []; for (var sm = 0; sm < 24; sm++) smoke.push({ x: 3300 + (r() - 0.5) * 120, y: 2100 + (r() - 0.5) * 80, r: 12 + r() * 26, p: r() * 6.28 });
    spawnTraffic(); spawnPedestrians();
  }

  function spawnTraffic() {
    traffic = [];
    var r = TA.core.mulberry32(777);
    var names = ['ARUNIKA SEDAN', 'PELABUHAN GT', 'TAKSI KUNING', 'TRUK KONTAINER', 'MOTOR BEBEK', 'VAN HITAM'];
    for (var i = 0; i < 16; i++) {
      var horiz = r() < 0.5;
      traffic.push({
        x: 100 + r() * 3400, y: 100 + r() * 2400, horiz: horiz,
        speed: 28 + r() * 40, dir: r() < 0.5 ? 1 : -1,
        color: ['#7a2e2e', '#2e5a7a', '#c2a52e', '#4a4a4a', '#6b3a7a', '#2e7a4a'][i % 6],
        name: names[i % names.length], honk: 0,
      });
    }
  }
  function spawnPedestrians() {
    peds = [];
    var r = TA.core.mulberry32(888);
    for (var i = 0; i < 22; i++) {
      peds.push({ x: 150 + r() * 3300, y: 150 + r() * 2300, a: r() * 6.28, s: 12 + r() * 18, panic: 0, c: ['#d8d8d8', '#e8b23a', '#3a8ad8', '#d85a5a'][i % 4] });
    }
  }
  function resetTraffic() { spawnTraffic(); spawnPedestrians(); }

  function districtAt(x, y) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    }
    return DISTRICTS[1];
  }

  function update(dt) {
    var s = TA.state;
    /* lalu lintas: bergerak di jalurnya, berhenti sebentar di "lampu merah" */
    for (var i = 0; i < traffic.length; i++) {
      var t = traffic[i];
      var light = Math.floor((s.time + i * 1.7) / 6) % 2 === 0;
      var sp = light ? t.speed : t.speed * 0.15;
      if (t.horiz) { t.x += sp * t.dir * dt; if (t.x < 60) t.dir = 1; if (t.x > 3540) t.dir = -1; }
      else { t.y += sp * t.dir * dt; if (t.y < 60) t.dir = 1; if (t.y > 2540) t.dir = -1; }
      /* menghindar dari pemain */
      var dx = t.x - s.player.x, dy = t.y - s.player.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < 70 && dd > 1) { t.x += (dx / dd) * 30 * dt; t.y += (dy / dd) * 30 * dt; }
    }
    updatePedestrians(dt);
    for (var j = 0; j < rainDrops.length; j++) {
      var rd = rainDrops[j];
      rd.y += rd.s * 60 * dt; rd.x += 30 * dt;
      if (rd.y > 730) { rd.y = -10; rd.x = Math.random() * 1280; }
    }
    for (var k = 0; k < embers.length; k++) { embers[k].p += dt; embers[k].y -= 12 * dt; if (embers[k].y < 1980) embers[k].y = 2260; }
    for (var m = 0; m < smoke.length; m++) { smoke[m].p += dt * 0.4; smoke[m].y -= 8 * dt; if (smoke[m].y < 1900) smoke[m].y = 2160; }
    /* kamera mengikuti pemain */
    cam.x += (s.player.x - cam.x) * Math.min(1, dt * 5);
    cam.y += (s.player.y - cam.y) * Math.min(1, dt * 5);
  }

  function updatePedestrians(dt) {
    var s = TA.state;
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      var dx = p.x - s.player.x, dy = p.y - s.player.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (s.wanted >= 3 && dd < 260) p.panic = 1; /* lari/tiarap saat tembakan */
      if (p.panic > 0) { p.x += (dx / (dd || 1)) * 60 * dt; p.y += (dy / (dd || 1)) * 60 * dt; p.panic -= dt * 0.2; }
      else {
        p.x += Math.cos(p.a) * p.s * dt; p.y += Math.sin(p.a) * p.s * dt;
        if (Math.random() < 0.005) p.a = Math.random() * 6.28;
        if (p.x < 60 || p.x > 3540 || p.y < 60 || p.y > 2540) p.a += Math.PI;
      }
    }
  }

  function setWeather(w) { TA.state.weather = w; }
  function setTimeOfDay(h) { TA.state.clockMin = h * 60; }

  /* ---------- render ---------- */
  function render() {
    var ctx = TA.ctx; if (!ctx) return;
    var s = TA.state;
    var W = 1280, H = 720;
    var ox = cam.x - W / 2, oy = cam.y - H / 2;
    /* langit / suasana berdasar jam */
    var hour = s.clockMin / 60;
    var night = (hour < 6 || hour >= 18);
    var dusk = (hour >= 16.5 && hour < 18.5);
    var sky = night ? '#0d1220' : dusk ? '#4a2f3a' : (s.weather === 'hujan' ? '#5a6068' : '#8aa0b8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    /* zona distrik */
    for (var di = 0; di < DISTRICTS.length; di++) {
      var d = DISTRICTS[di];
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x - ox, d.y - oy, d.w, d.h);
    }
    /* laut di barat + selatan pantai */
    ctx.fillStyle = night ? '#0a2030' : '#2a5a7a';
    ctx.fillRect(0 - ox, 0 - oy, 110, 2600);
    ctx.fillRect(0 - ox, 2420 - oy, 2000, 180);
    /* grid jalan */
    ctx.strokeStyle = 'rgba(20,20,24,0.9)'; ctx.lineWidth = 34;
    for (var gx = 260; gx < WORLD_W; gx += 260) { ctx.beginPath(); ctx.moveTo(gx - ox, 0 - oy); ctx.lineTo(gx - ox, WORLD_H - oy); ctx.stroke(); }
    for (var gy = 260; gy < WORLD_H; gy += 260) { ctx.beginPath(); ctx.moveTo(0 - ox, gy - oy); ctx.lineTo(WORLD_W - ox, gy - oy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,200,90,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([18, 18]);
    for (var gx2 = 260; gx2 < WORLD_W; gx2 += 260) { ctx.beginPath(); ctx.moveTo(gx2 - ox, 0 - oy); ctx.lineTo(gx2 - ox, WORLD_H - oy); ctx.stroke(); }
    for (var gy2 = 260; gy2 < WORLD_H; gy2 += 260) { ctx.beginPath(); ctx.moveTo(0 - ox, gy2 - oy); ctx.lineTo(WORLD_W - ox, gy2 - oy); ctx.stroke(); }
    ctx.setLineDash([]);
    /* tol layang: jalur ganda tebal di y 1000-1700 */
    ctx.fillStyle = '#2c2f36'; ctx.fillRect(0 - ox, 1280 - oy, WORLD_W, 90);
    ctx.fillStyle = '#3a3e46'; ctx.fillRect(0 - ox, 1290 - oy, WORLD_W, 70);
    ctx.strokeStyle = '#d8c85a'; ctx.lineWidth = 3; ctx.setLineDash([30, 24]);
    ctx.beginPath(); ctx.moveTo(0 - ox, 1325 - oy); ctx.lineTo(WORLD_W - ox, 1325 - oy); ctx.stroke();
    ctx.setLineDash([]);
    /* jembatan ke Pulau Abu */
    ctx.fillStyle = '#4a4038'; ctx.fillRect(2900 - ox, 1750 - oy, 220, 60);
    /* kawah Pulau Abu: tanah abu + pijar bara + asap */
    ctx.fillStyle = '#1e1a17'; ctx.beginPath(); ctx.arc(3300 - ox, 2150 - oy, 190, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(3300 - ox, 2150 - oy, 120, 0, 6.29); ctx.fill();
    var glow = ctx.createRadialGradient(3300 - ox, 2150 - oy, 8, 3300 - ox, 2150 - oy, 110);
    glow.addColorStop(0, 'rgba(255,90,20,0.85)'); glow.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(3300 - ox, 2150 - oy, 110, 0, 6.29); ctx.fill();
    for (var e = 0; e < embers.length; e++) {
      var em = embers[e];
      ctx.fillStyle = 'rgba(255,' + (100 + Math.floor(80 * Math.abs(Math.sin(em.p)))) + ',20,0.9)';
      ctx.beginPath(); ctx.arc(em.x - ox, em.y - oy, em.s, 0, 6.29); ctx.fill();
    }
    for (var sm = 0; sm < smoke.length; sm++) {
      var sk = smoke[sm];
      ctx.fillStyle = 'rgba(120,110,105,0.25)';
      ctx.beginPath(); ctx.arc(sk.x - ox + Math.sin(sk.p) * 20, sk.y - oy, sk.r, 0, 6.29); ctx.fill();
    }
    /* kontainer pelabuhan */
    for (var ci = 0; ci < containers.length; ci++) {
      var c = containers[ci];
      ctx.fillStyle = c.c; ctx.fillRect(c.x - ox, c.y - oy, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(c.x - ox, c.y - oy, c.w, c.h);
    }
    /* Bank Arunika: fasad kolom + plaza */
    ctx.fillStyle = '#7a7468'; ctx.fillRect(1420 - ox, 420 - oy, 260, 170);
    ctx.fillStyle = '#d8cfb8'; ctx.fillRect(1420 - ox, 420 - oy, 260, 26);
    for (var col = 0; col < 6; col++) { ctx.fillStyle = '#e8e0cc'; ctx.fillRect((1440 + col * 40) - ox, 446 - oy, 18, 120); }
    ctx.fillStyle = '#1a1a22'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BANK ARUNIKA', 1550 - ox, 405 - oy);
    /* gedung */
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      ctx.fillStyle = b.c; ctx.fillRect(b.x - ox, b.y - oy, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(b.x - ox, b.y - oy, b.w, b.h);
      if (b.neon && night) {
        ctx.fillStyle = 'rgba(255,60,180,0.5)';
        ctx.fillRect(b.x - ox + 4, b.y - oy + 4, b.w - 8, 5);
      }
      ctx.fillStyle = 'rgba(255,220,120,0.5)';
      for (var wy = 0; wy < 3; wy++) for (var wx = 0; wx < 3; wx++) {
        if ((bi + wx + wy) % 3 === 0) ctx.fillRect(b.x - ox + 8 + wx * (b.w / 3), b.y - oy + 10 + wy * (b.h / 3), 8, 10);
      }
    }
    /* koin Arunika + ramp */
    for (var ki = 0; ki < stashes.length; ki++) {
      var st = stashes[ki]; if (st.taken) continue;
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(st.x - ox, st.y - oy, 9, 0, 6.29); ctx.fill();
      ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (var ri = 0; ri < ramps.length; ri++) {
      var rp = ramps[ri];
      ctx.fillStyle = rp.done ? '#3a7a4a' : '#c2a52e';
      ctx.beginPath(); ctx.moveTo(rp.x - ox, rp.y - oy - 16); ctx.lineTo(rp.x - ox + 26, rp.y - oy + 10); ctx.lineTo(rp.x - ox - 26, rp.y - oy + 10); ctx.closePath(); ctx.fill();
    }
    /* lalu lintas */
    for (var ti = 0; ti < traffic.length; ti++) drawCar(traffic[ti], ox, oy);
    /* pejalan kaki */
    for (var pi = 0; pi < peds.length; pi++) {
      var p = peds[pi];
      ctx.fillStyle = p.panic > 0 ? '#ff5a5a' : p.c;
      ctx.beginPath(); ctx.arc(p.x - ox, p.y - oy, 6, 0, 6.29); ctx.fill();
    }
    /* polisi + SWAT + helikopter digambar police.js */
    if (TA.police && TA.police.render) TA.police.render(ox, oy);
    /* misi: target kontrak hancur + marker */
    if (TA.missions && TA.missions.render) TA.missions.render(ox, oy);
    /* pemain / mobil pemain */
    drawPlayer(ox, oy);
    /* hujan + refleksi basah */
    if (s.weather === 'hujan') {
      ctx.strokeStyle = 'rgba(180,200,220,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var dri = 0; dri < rainDrops.length; dri++) {
        var rd = rainDrops[dri];
        ctx.moveTo(rd.x, rd.y); ctx.lineTo(rd.x - 3, rd.y + rd.s);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,160,200,0.05)'; ctx.fillRect(0, 0, W, H);
    }
    /* label distrik saat ini digambar di DOM (#location-banner), bukan di canvas,
       supaya tidak menumpuk di atas bar HEALTH/ARMOUR kiri bawah. */
    /* siang/malam: vignette malam */
    if (night) { ctx.fillStyle = 'rgba(8,10,26,0.18)'; ctx.fillRect(0, 0, W, H); }
  }

  function drawCar(t, ox, oy) {
    var ctx = TA.ctx;
    ctx.save();
    ctx.translate(t.x - ox, t.y - oy);
    ctx.rotate(t.horiz ? (t.dir > 0 ? 0 : Math.PI) : (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillStyle = t.color; ctx.fillRect(-22, -11, 44, 22);
    ctx.fillStyle = 'rgba(160,210,235,0.8)'; ctx.fillRect(-6, -9, 14, 18);
    ctx.fillStyle = '#111'; ctx.fillRect(-16, -12, 8, 4); ctx.fillRect(-16, 8, 8, 4);
    ctx.fillRect(10, -12, 8, 4); ctx.fillRect(10, 8, 8, 4);
    ctx.restore();
  }

  function drawPlayer(ox, oy) {
    var ctx = TA.ctx; var s = TA.state;
    if (!s.player.onFoot) {
      ctx.save();
      ctx.translate(s.car.x - ox, s.car.y - oy);
      ctx.rotate(s.car.angle);
      ctx.fillStyle = s.car.color; ctx.fillRect(-24, -12, 48, 24);
      ctx.fillStyle = 'rgba(160,210,235,0.85)'; ctx.fillRect(-6, -10, 15, 20);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(20, -9, 4, 6); ctx.fillRect(20, 3, 4, 6);
      ctx.fillStyle = '#111'; ctx.fillRect(-17, -13, 9, 4); ctx.fillRect(-17, 9, 9, 4);
      ctx.fillRect(11, -13, 9, 4); ctx.fillRect(11, 9, 9, 4);
      ctx.restore();
      /* nama mobil melayang */
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.car.name, s.car.x - ox, s.car.y - oy - 26);
    } else {
      ctx.save();
      ctx.translate(s.player.x - ox, s.player.y - oy);
      ctx.rotate(s.player.angle);
      ctx.fillStyle = '#e8b23a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#e8b23a'; ctx.fillRect(8, -3, 12, 6);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('RAKA', s.player.x - ox, s.player.y - oy - 20);
    }
  }

  function collectStash(x, y) {
    for (var i = 0; i < stashes.length; i++) {
      var st = stashes[i];
      if (!st.taken && Math.abs(st.x - x) < 24 && Math.abs(st.y - y) < 24) {
        st.taken = true; TA.state.coins++;
        if (TA.career) TA.career.addXP(10);
        return true;
      }
    }
    return false;
  }

  TA.world = {
    buildCity: buildCity, spawnTraffic: spawnTraffic, spawnPedestrians: spawnPedestrians,
    updateTraffic: spawnTraffic, updatePedestrians: updatePedestrians,
    setWeather: setWeather, setTimeOfDay: setTimeOfDay,
    update: update, render: render, resetTraffic: resetTraffic,
    districtAt: districtAt, collectStash: collectStash,
    DISTRICTS: DISTRICTS, WORLD_W: WORLD_W, WORLD_H: WORLD_H,
    get traffic() { return traffic; }, get buildings() { return buildings; },
  };
})();
