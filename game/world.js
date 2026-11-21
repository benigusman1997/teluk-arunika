/* world.js — bangun kota Teluk Arunika: distrik, bank, lalu lintas, pejalan kaki */
(function () {
  'use strict';
  var TA = window.TA;
  TA.world = TA.world || {};

  var WORLD_W = 4200, WORLD_H = 3200;
  TA.world.WORLD_W = WORLD_W;
  TA.world.WORLD_H = WORLD_H;

  var DISTRICTS = [
    { name: 'TOL LAYANG', street: 'Jalan Layang Arunika', x: 0, y: 0, w: 4200, h: 700, ground: '#3a3f52', standing: 64, desc: 'Tol layang di atas kota' },
    { name: 'PELABUHAN', street: 'Dermaga Senja', x: 0, y: 700, w: 1400, h: 1300, ground: '#2c3547', standing: 58, desc: 'Dermaga, kontainer, gudang' },
    { name: 'PASAR', street: 'Pasar Senja', x: 1400, y: 700, w: 1400, h: 1100, ground: '#33302e', standing: 47, desc: 'Pasar ramai, Bank Arunika' },
    { name: 'GANG NEON', street: 'Gang Neon', x: 2800, y: 700, w: 1400, h: 1100, ground: '#241a33', standing: 52, desc: 'Gang sempit, neon malam' },
    { name: 'PANTAI', street: 'Pantai Arunika', x: 0, y: 2000, w: 3300, h: 1200, ground: '#4a4238', standing: 71, desc: 'Pasir, ombak, kafe pantai' },
    { name: 'PULAU ABU', street: 'Kawah Abu', x: 3300, y: 2000, w: 900, h: 1200, ground: '#241c1a', standing: 33, desc: 'Pulau vulkanik, bara menyala' }
  ];
  TA.world.DISTRICTS = DISTRICTS;

  var BANK = { x: 1850, y: 1050, w: 420, h: 260, plazaY: 1330 };
  TA.world.BANK = BANK;

  var buildings = [];
  var traffic = [];
  var pedestrians = [];
  var stashes = [];
  var ramps = [];
  var explosions = [];
  var emberGlow = 0;

  var STASHES = [
    { x: 300, y: 900, d: 0 }, { x: 1200, y: 1750, d: 0 }, { x: 1600, y: 850, d: 1 },
    { x: 2400, y: 1600, d: 1 }, { x: 3000, y: 900, d: 2 }, { x: 3900, y: 1500, d: 2 },
    { x: 600, y: 2400, d: 3 }, { x: 1800, y: 2800, d: 3 }, { x: 2900, y: 2300, d: 3 },
    { x: 3600, y: 2200, d: 4 }, { x: 4000, y: 2900, d: 4 }, { x: 3500, y: 2600, d: 4 }
  ];
  var STUNT_RAMPS = [
    { x: 700, y: 350 }, { x: 2100, y: 350 }, { x: 3500, y: 350 },
    { x: 1200, y: 2900 }, { x: 3700, y: 2400 }
  ];
  TA.world.STASHES = STASHES;
  TA.world.STUNT_RAMPS = STUNT_RAMPS;

  function inBankPlaza(x, y) {
    return x > BANK.x - 40 && x < BANK.x + BANK.w + 40 && y > BANK.y - 20 && y < BANK.plazaY + 220;
  }
  function onRoad(x, y) {
    return (Math.abs((x % 400) - 0) < 26) || (Math.abs((y % 400) - 0) < 26);
  }

  function buildCity() {
    buildings = [];
    var rnd = TA.seededRandom(20261121);
    for (var gx = 0; gx < 10; gx++) {
      for (var gy = 0; gy < 8; gy++) {
        var bx = gx * 400 + 60, by = gy * 400 + 60;
        if (bx > 3800 || by > 2900) continue;
        if (inBankPlaza(bx + 80, by + 80)) continue;
        if (rnd() < 0.18) continue; // taman / lahan kosong
        var bw = 120 + rnd() * 140, bh = 110 + rnd() * 130;
        var hue = 200 + rnd() * 120;
        var colors = ['#2e3a55', '#3d2f4d', '#41362a', '#26343a', '#4d2f35', '#2f4034'];
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: colors[Math.floor(rnd() * colors.length)],
          roof: 'hsl(' + Math.floor(hue) + ',30%,' + (18 + rnd() * 14) + '%)',
          neon: rnd() < 0.4, h: 20 + rnd() * 60
        });
      }
    }
    // Pelabuhan: kontainer warna-warni
    for (var i = 0; i < 14; i++) {
      buildings.push({
        x: 120 + rnd() * 1100, y: 760 + rnd() * 900, w: 150, h: 60,
        color: ['#7a3b2e', '#2e5a7a', '#5a6e2e', '#7a6a2e'][i % 4],
        roof: '#222', neon: false, h: 14, container: true
      });
    }
    // Pulau Abu: batu lava
    for (var j = 0; j < 10; j++) {
      buildings.push({
        x: 3350 + rnd() * 750, y: 2050 + rnd() * 1000, w: 60 + rnd() * 90, h: 50 + rnd() * 70,
        color: '#1c1414', roof: '#ff5a1e', neon: false, h: 18, lava: true
      });
    }
  }

  function buildTraffic() {
    traffic = [];
    var rnd = TA.seededRandom(5150);
    var colors = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#7f8c8d', '#8e44ad', '#16a085', '#e67e22'];
    for (var i = 0; i < 16; i++) {
      traffic.push({
        x: 100 + rnd() * 4000, y: 100 + rnd() * 3000,
        dir: Math.floor(rnd() * 4), speed: 60 + rnd() * 80,
        color: colors[i % colors.length], taxi: i % 5 === 0,
        w: 46, h: 22, honk: 0
      });
    }
  }

  function buildPedestrians() {
    pedestrians = [];
    var rnd = TA.seededRandom(9090);
    for (var i = 0; i < 22; i++) {
      pedestrians.push({
        x: 100 + rnd() * 4000, y: 100 + rnd() * 3000,
        dir: rnd() * Math.PI * 2, speed: 20 + rnd() * 25,
        color: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#e67e22', '#9b59b6'][i % 6],
        panic: 0
      });
    }
  }

  function buildStashes() {
    stashes = STASHES.map(function (s, i) {
      return { x: s.x, y: s.y, d: s.d, taken: i < TA.S.coins, id: i };
    });
  }

  function buildRamps() {
    ramps = STUNT_RAMPS.map(function (r, i) {
      return { x: r.x, y: r.y, done: i < TA.S.jumps, id: i };
    });
  }

  function districtAt(x, y) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      var d = DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    }
    return DISTRICTS[1];
  }

  function update(dt) {
    updateTraffic(dt);
    updatePedestrians(dt);
    emberGlow += dt;
    for (var i = explosions.length - 1; i >= 0; i--) {
      explosions[i].t -= dt;
      explosions[i].r += dt * 120;
      if (explosions[i].t <= 0) explosions.splice(i, 1);
    }
    if (TA.S.explosionT > 0) TA.S.explosionT -= dt;
  }

  function updateAmbient(dt) {
    updateTraffic(dt * 0.5);
    emberGlow += dt;
  }

  function updateTraffic(dt) {
    for (var i = 0; i < traffic.length; i++) {
      var c = traffic[i];
      var sp = c.speed * dt;
      if (c.dir === 0) c.x += sp; else if (c.dir === 1) c.y += sp;
      else if (c.dir === 2) c.x -= sp; else c.y -= sp;
      if (c.x < 40) { c.x = 40; c.dir = 0; }
      if (c.x > WORLD_W - 40) { c.x = WORLD_W - 40; c.dir = 2; }
      if (c.y < 40) { c.y = 40; c.dir = 1; }
      if (c.y > WORLD_H - 40) { c.y = WORLD_H - 40; c.dir = 3; }
      // belok acak di persimpangan
      if (Math.abs(c.x % 400) < 6 && Math.abs(c.y % 400) < 6 && Math.random() < 0.01) {
        c.dir = Math.floor(Math.random() * 4);
      }
    }
  }

  function updatePedestrians(dt) {
    for (var i = 0; i < pedestrians.length; i++) {
      var p = pedestrians[i];
      var sp = p.speed * (p.panic > 0 ? 3 : 1) * dt;
      p.x += Math.cos(p.dir) * sp;
      p.y += Math.sin(p.dir) * sp;
      if (p.panic > 0) p.panic -= dt;
      if (p.x < 60 || p.x > WORLD_W - 60 || p.y < 60 || p.y > WORLD_H - 60) p.dir += Math.PI;
      if (Math.random() < 0.002) p.dir = Math.random() * Math.PI * 2;
    }
  }

  function addExplosion(x, y) {
    explosions.push({ x: x, y: y, t: 1.2, r: 10 });
    TA.S.explosionT = 1.2;
    for (var i = 0; i < pedestrians.length; i++) {
      if (TA.dist(pedestrians[i].x, pedestrians[i].y, x, y) < 300) pedestrians[i].panic = 3;
    }
  }

  function worldToScreen(x, y, W, H) {
    var camX = TA.S.camX - W / 2, camY = TA.S.camY - H / 2;
    return { x: x - camX, y: y - camY };
  }
  TA.world.worldToScreen = worldToScreen;

  function draw(ctx, W, H, dt) {
    var camX = TA.S.camX - W / 2, camY = TA.S.camY - H / 2;
    var night = TA.S.night;
    // latar: laut di sekeliling
    ctx.fillStyle = night ? '#060a18' : '#123a5c';
    ctx.fillRect(0, 0, W, H);
    // tanah distrik
    for (var d = 0; d < DISTRICTS.length; d++) {
      var dist = DISTRICTS[d];
      ctx.fillStyle = dist.ground;
      ctx.fillRect(dist.x - camX, dist.y - camY, dist.w, dist.h);
    }
    // pantai: pasir + ombak
    ctx.fillStyle = '#6e5f45';
    ctx.fillRect(0 - camX, 3050 - camY, 4200, 150);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (var w = 0; w < 8; w++) {
      ctx.fillRect(((w * 520 + Math.floor(performance.now() / 40) % 520)) - camX, 3060 - camY, 180, 5);
    }
    // Pulau Abu: pijar bara
    var glow = 0.5 + 0.5 * Math.sin(emberGlow * 2);
    ctx.fillStyle = 'rgba(255,90,30,' + (0.10 + 0.10 * glow) + ')';
    ctx.fillRect(3300 - camX, 2000 - camY, 900, 1200);
    // asap kawah
    ctx.fillStyle = 'rgba(120,110,110,0.35)';
    for (var s = 0; s < 5; s++) {
      var sx = 3750 + Math.sin(emberGlow * 0.7 + s) * 40 - camX;
      var sy = 2250 + s * 26 - camY - (emberGlow * 12 % 120);
      ctx.beginPath(); ctx.arc(sx, sy, 34 + s * 8, 0, Math.PI * 2); ctx.fill();
    }
    // jalan (grid)
    ctx.strokeStyle = night ? '#1c2233' : '#232838';
    ctx.lineWidth = 52;
    for (var gx = 0; gx <= 10; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * 400 - camX, 0 - camY); ctx.lineTo(gx * 400 - camX, WORLD_H - camY); ctx.stroke();
    }
    for (var gy = 0; gy <= 8; gy++) {
      ctx.beginPath(); ctx.moveTo(0 - camX, gy * 400 - camY); ctx.lineTo(WORLD_W - camX, gy * 400 - camY); ctx.stroke();
    }
    // garis tengah jalan
    ctx.strokeStyle = 'rgba(255,210,62,0.5)';
    ctx.lineWidth = 3; ctx.setLineDash([18, 22]);
    for (var gx2 = 0; gx2 <= 10; gx2++) {
      ctx.beginPath(); ctx.moveTo(gx2 * 400 - camX, 0 - camY); ctx.lineTo(gx2 * 400 - camX, WORLD_H - camY); ctx.stroke();
    }
    for (var gy2 = 0; gy2 <= 8; gy2++) {
      ctx.beginPath(); ctx.moveTo(0 - camX, gy2 * 400 - camY); ctx.lineTo(WORLD_W - camX, gy2 * 400 - camY); ctx.stroke();
    }
    ctx.setLineDash([]);
    // jembatan ke Pulau Abu
    ctx.fillStyle = '#4a4f63';
    ctx.fillRect(3200 - camX, 2350 - camY, 160, 90);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('JEMBATAN ABU', 3190 - camX, 2330 - camY);
    // tol layang (jalur atas)
    ctx.fillStyle = '#565e78';
    ctx.fillRect(0 - camX, 180 - camY, 4200, 90);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('TOL LAYANG ARUNIKA', 60 - camX, 170 - camY);
    // gedung
    for (var b = 0; b < buildings.length; b++) {
      var bd = buildings[b];
      if (bd.x - camX > W + 100 || bd.x - camX < -300 || bd.y - camY > H + 100 || bd.y - camY < -300) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bd.x - camX + 6, bd.y - camY + 8, bd.w, bd.h);
      ctx.fillStyle = bd.color;
      ctx.fillRect(bd.x - camX, bd.y - camY, bd.w, bd.h);
      ctx.fillStyle = bd.roof;
      ctx.fillRect(bd.x - camX + 6, bd.y - camY + 6, bd.w - 12, bd.h - 12);
      if (bd.neon && night) {
        ctx.fillStyle = ['#ff2d78', '#00e5ff', '#ffd23e'][b % 3];
        ctx.fillRect(bd.x - camX, bd.y - camY - 4, bd.w, 4);
      }
      if (bd.lava) {
        ctx.fillStyle = 'rgba(255,' + Math.floor(60 + 60 * glow) + ',20,0.8)';
        ctx.fillRect(bd.x - camX + 8, bd.y - camY + 8, bd.w - 16, 6);
      }
      if (bd.container) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(bd.x - camX + 8, bd.y - camY + 8, bd.w - 16, 4);
      }
    }
    // label distrik
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('PELABUHAN', 120 - camX, 780 - camY);
    ctx.fillText('PASAR SENJA', 1500 - camX, 780 - camY);
    ctx.fillText('GANG NEON', 2950 - camX, 780 - camY);
    ctx.fillText('PANTAI ARUNIKA', 120 - camX, 2080 - camY);
    ctx.fillStyle = 'rgba(255,120,40,0.7)';
    ctx.fillText('PULAU ABU', 3450 - camX, 2080 - camY);
    drawBank(ctx, camX, camY);
    drawStashesRamps(ctx, camX, camY);
    drawTraffic(ctx, camX, camY);
    drawPedestrians(ctx, camX, camY);
  }

  function drawBank(ctx, camX, camY) {
    var B = BANK;
    // plaza
    ctx.fillStyle = '#5a5648';
    ctx.fillRect(B.x - 60 - camX, B.plazaY - 40 - camY, B.w + 120, 220);
    ctx.fillStyle = '#6e6a58';
    for (var i = 0; i < 6; i++) ctx.fillRect(B.x - 40 + i * 80 - camX, B.plazaY - camY, 40, 6);
    // bangunan bank
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(B.x + 8 - camX, B.y + 10 - camY, B.w, B.h);
    ctx.fillStyle = '#c8b98a';
    ctx.fillRect(B.x - camX, B.y - camY, B.w, B.h);
    ctx.fillStyle = '#8a7a52';
    ctx.fillRect(B.x - camX, B.y - camY, B.w, 34);
    ctx.fillStyle = '#2a2118';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('BANK ARUNIKA', B.x + 62 - camX, B.y + 25 - camY);
    // kolom besar
    ctx.fillStyle = '#efe3c0';
    for (var c = 0; c < 6; c++) {
      var cx = B.x + 28 + c * 68 - camX;
      ctx.fillRect(cx, B.y + 44 - camY, 26, B.h - 60);
      ctx.fillRect(cx - 4, B.y + 40 - camY, 34, 8);
      ctx.fillRect(cx - 4, B.y + B.h - 24 - camY, 34, 8);
    }
    // pintu + brankas
    ctx.fillStyle = '#3a2c1c';
    ctx.fillRect(B.x + B.w / 2 - 40 - camX, B.y + B.h - 70 - camY, 80, 70);
    ctx.fillStyle = '#5a5f6e';
    ctx.fillRect(B.x + 30 - camX, B.y + B.h - 60 - camY, 70, 60);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('BRANKAS', B.x + 32 - camX, B.y + B.h - 66 - camY);
    // van hitam getaway
    ctx.fillStyle = '#14161c';
    ctx.fillRect(B.x + B.w + 30 - camX, B.plazaY + 40 - camY, 110, 52);
    ctx.fillStyle = '#232833';
    ctx.fillRect(B.x + B.w + 30 - camX, B.plazaY + 52 - camY, 110, 18);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('VAN GETAWAY', B.x + B.w + 30 - camX, B.plazaY + 30 - camY);
  }

  function drawStashesRamps(ctx, camX, camY) {
    for (var i = 0; i < stashes.length; i++) {
      var s = stashes[i];
      if (s.taken) continue;
      var pulse = 0.6 + 0.4 * Math.sin(emberGlow * 3 + i);
      ctx.fillStyle = 'rgba(255,210,62,' + pulse + ')';
      ctx.beginPath(); ctx.arc(s.x - camX, s.y - camY, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5200';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('K', s.x - 4 - camX, s.y + 5 - camY);
    }
    for (var j = 0; j < ramps.length; j++) {
      var r = ramps[j];
      ctx.fillStyle = r.done ? '#37d67a' : '#ff8c1a';
      ctx.beginPath();
      ctx.moveTo(r.x - camX, r.y + 26 - camY);
      ctx.lineTo(r.x + 44 - camX, r.y + 26 - camY);
      ctx.lineTo(r.x + 30 - camX, r.y - 14 - camY);
      ctx.lineTo(r.x + 14 - camX, r.y - 14 - camY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('RAMP', r.x + 2 - camX, r.y + 20 - camY);
    }
  }

  function drawTraffic(ctx, camX, camY) {
    for (var i = 0; i < traffic.length; i++) {
      var c = traffic[i];
      if (c.x - camX < -80 || c.x - camX > 1400 || c.y - camY < -80 || c.y - camY > 800) continue;
      ctx.save();
      ctx.translate(c.x - camX, c.y - camY);
      ctx.rotate(c.dir === 0 ? 0 : c.dir === 1 ? Math.PI / 2 : c.dir === 2 ? Math.PI : -Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-22, -9, 46, 24);
      ctx.fillStyle = c.taxi ? '#f1c40f' : c.color;
      ctx.fillRect(-23, -11, 46, 22);
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(-6, -9, 12, 18);
      ctx.fillStyle = '#222';
      ctx.fillRect(-19, -12, 7, 4); ctx.fillRect(-19, 8, 7, 4);
      ctx.fillRect(12, -12, 7, 4); ctx.fillRect(12, 8, 7, 4);
      if (c.taxi) { ctx.fillStyle = '#111'; ctx.font = 'bold 9px Arial'; ctx.fillText('TAXI', -12, 3); }
      ctx.restore();
    }
  }

  function drawPedestrians(ctx, camX, camY) {
    for (var i = 0; i < pedestrians.length; i++) {
      var p = pedestrians[i];
      if (p.x - camX < -20 || p.x - camX > 1300 || p.y - camY < -20 || p.y - camY > 740) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(p.x - camX, p.y - camY + 6, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2d8b0';
      ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY - 3, 4, 0, Math.PI * 2); ctx.fill();
      if (p.panic > 0) {
        ctx.fillStyle = '#ff5a5a';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('!', p.x + 8 - camX, p.y - 8 - camY);
      }
    }
  }

  function drawEffects(ctx, W, H, dt) {
    var camX = TA.S.camX - W / 2, camY = TA.S.camY - H / 2;
    for (var i = 0; i < explosions.length; i++) {
      var e = explosions[i];
      var a = Math.max(0, e.t / 1.2);
      ctx.fillStyle = 'rgba(255,' + Math.floor(120 * a + 40) + ',20,' + (0.85 * a) + ')';
      ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,' + (0.9 * a) + ')';
      ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY, e.r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,60,60,' + (0.5 * a) + ')';
      ctx.beginPath(); ctx.arc(e.x - camX, e.y - camY - e.r * 0.4, e.r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // penanda objektif (panah kuning berdenyut di atas target)
    var tgt = TA.missions.currentTarget();
    if (tgt && TA.S.screen === 'playing') {
      var sx = tgt.x - camX, sy = tgt.y - camY;
      if (sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40) {
        var bob = Math.sin(performance.now() / 180) * 6;
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 34 + bob);
        ctx.lineTo(sx - 10, sy - 52 + bob);
        ctx.lineTo(sx + 10, sy - 52 + bob);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  TA.world.buildCity = buildCity;
  TA.world.buildTraffic = buildTraffic;
  TA.world.buildPedestrians = buildPedestrians;
  TA.world.buildStashes = buildStashes;
  TA.world.buildRamps = buildRamps;
  TA.world.districtAt = districtAt;
  TA.world.update = update;
  TA.world.updateAmbient = updateAmbient;
  TA.world.addExplosion = addExplosion;
  TA.world.draw = draw;
  TA.world.drawEffects = drawEffects;
  TA.world.traffic = function () { return traffic; };
  TA.world.pedestrians = function () { return pedestrians; };
  TA.world.stashes = function () { return stashes; };
  TA.world.ramps = function () { return ramps; };
  TA.world.buildings = function () { return buildings; };

  TA.world.collectStash = function (id) {
    for (var i = 0; i < stashes.length; i++) {
      if (stashes[i].id === id && !stashes[i].taken) {
        stashes[i].taken = true;
        TA.S.coins++;
        TA.S.money += 150000;
        TA.career.addXP(10, 'Koin Arunika');
        TA.ui.showToast('KOIN ARUNIKA ' + TA.S.coins + '/12 — +Rp 150.000');
        return true;
      }
    }
    return false;
  };
  TA.world.registerStuntJump = function (id) {
    for (var i = 0; i < ramps.length; i++) {
      if (ramps[i].id === id && !ramps[i].done) {
        ramps[i].done = true;
        TA.S.jumps++;
        TA.career.addXP(15, 'Lompatan');
        TA.ui.showToast('LOMPATAN ' + TA.S.jumps + '/5 — gaya!');
        return true;
      }
    }
    return false;
  };
})();
