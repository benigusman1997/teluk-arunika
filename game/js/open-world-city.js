// open-world-city.js — roads, blocks, the six districts and landmarks, sea, beach, bridge, flyover, collision map, lane graph.
var TA = window.TA || (window.TA = {});
function buildOpenWorldCity() {
  TA.colliders = []; TA.landmarks = {}; TA.world = new THREE.Group(); TA.scene.add(TA.world);
  var land = TA.box(960, 2, 925, 0xf0dcae, 0, -1, -12); land.castShadow = false; TA.world.add(land);
  var seaTex = TA.canvasTex(128, 128, function (g) {
    g.fillStyle = '#25b9c4'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2;
    for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 12 + i * 26); g.bezierCurveTo(40, i * 26, 80, 26 + i * 26, 128, 12 + i * 26); g.stroke(); }
  });
  var sea = new THREE.Mesh(TA.scaleUV(new THREE.PlaneGeometry(7000, 7000), 180, 180), new THREE.MeshLambertMaterial({ map: seaTex }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; TA.world.add(sea); TA.sea = sea;
  var shore = new THREE.Mesh(new THREE.PlaneGeometry(1100, 26), new THREE.MeshLambertMaterial({ color: 0x8be9e0, transparent: true, opacity: 0.8 }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(0, -0.5, 460); TA.world.add(shore);
  buildRoadNetworkAndLanes();
  buildSixDistricts();
  buildCoastPortAndIsland();
}
function buildSixDistricts() {
  var P = TA.CFG.PALETTE;
  for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) {
    var cx = -350 + i * 100, cz = -350 + j * 100;
    var slab = TA.box(86, 0.24, 86, 0xcfc4ae, cx, 0.12, cz); slab.castShadow = false; TA.world.add(slab);
    if (i === 5 && j === 6) { buildBankArunika(cx, cz); continue; }
    var port = i <= 1 && j >= 5, market = i >= 2 && i <= 4 && j >= 5 && j <= 6, neon = i >= 2 && i <= 5 && j >= 1 && j <= 4;
    for (var a = -1; a <= 1; a += 2) for (var b = -1; b <= 1; b += 2) {
      var x = cx + a * 20, z = cz + b * 20, col = TA.pick(P);
      if (port) { buildContainerStacks(x, z); continue; }
      var h = neon ? 42 + TA.rnd() * 55 : market ? 7 + TA.rnd() * 6 : j === 7 ? 13 + TA.rnd() * 10 : 10 + TA.rnd() * 14;
      var w = 30 + TA.rnd() * 6, d = 30 + TA.rnd() * 6;
      addBuilding(x, z, w, d, h, col);
      if (neon && TA.rnd() < 0.6) addRoofSign(x, h, z, TA.pick(['KOPI NAGA', 'SENJA TV', 'ARUNIKA AIR', 'MIE KILAT', 'OMBAK COLA']));
      if (market || j === 7) {
        var aw = TA.box(w * 0.9, 0.25, 3, TA.pick([0xff5a5a, 0x2fbf71, 0xffb020, 0x3f88c5]), x, 3.4, z + b * (d / 2 + 1.4)); aw.rotation.x = b * 0.25; TA.world.add(aw);
        var sg = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ map: TA.signTex(TA.pick(['WARUNG SARI', 'TOKO EMAS', 'BAKSO 88', 'BATIK RAYA', 'ES KELAPA']), '#ffffff', TA.pick(['#d6336c', '#1c7ed6', '#2b8a3e', '#e8590c'])) }));
        sg.position.set(x, 5.4, z + b * (d / 2 + 0.15)); if (b < 0) sg.rotation.y = Math.PI; TA.world.add(sg);
      }
    }
    if (market) for (var k = 0; k < 12; k++) {
      var side = k % 4, t = -30 + Math.floor(k / 4) * 30 + (k % 2) * 8;
      addMarketStall(cx + (side === 0 ? -40.5 : side === 1 ? 40.5 : t), cz + (side === 2 ? -40.5 : side === 3 ? 40.5 : t));
    }
    if (i === 1 && j === 3) {
      var ws = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: TA.signTex('BENGKEL AMIR · TAKSI', '#222222', '#ffcc1a') }));
      ws.position.set(cx - 20, 6, cz - 38.3); ws.rotation.y = Math.PI; TA.world.add(ws); TA.landmarks.workshop = { x: cx - 20, z: cz - 50 };
    }
  }
  TA.landmarks.respray = { x: 200, z: -200 }; TA.landmarks.gunshop = { x: 300, z: 0 };
  TA.landmarks.safehouses = [{ x: -250, z: -100 }, { x: 100, z: 100 }, { x: 300, z: 300 }];
}
function buildRoadNetworkAndLanes() {
  var roadTex = TA.canvasTex(128, 128, function (g) {
    g.fillStyle = '#6a676b'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f4f1e6'; g.fillRect(5, 0, 3, 128); g.fillRect(120, 0, 3, 128);
    g.fillStyle = '#ffd23f'; g.fillRect(61, 0, 2.5, 80); g.fillRect(65.5, 0, 2.5, 80);
    g.fillStyle = '#f4f1e6'; g.fillRect(33, 20, 2, 50); g.fillRect(94, 20, 2, 50);
  });
  var crossTex = TA.canvasTex(128, 128, function (g) {
    g.fillStyle = '#6a676b'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f4f1e6';
    for (var k = 0; k < 7; k++) { g.fillRect(28 + k * 11, 3, 6, 17); g.fillRect(28 + k * 11, 108, 6, 17); g.fillRect(3, 28 + k * 11, 17, 6); g.fillRect(108, 28 + k * 11, 17, 6); }
  });
  var rm = new THREE.MeshLambertMaterial({ map: roadTex }), rg = TA.scaleUV(new THREE.PlaneGeometry(14, 940), 1, 94);
  var cm = new THREE.MeshLambertMaterial({ map: crossTex }), cg = new THREE.PlaneGeometry(22, 22);
  var lampG = new THREE.CylinderGeometry(0.12, 0.16, 7, 6), R = TA.CFG.ROADS;
  TA.lightMats = [new THREE.MeshBasicMaterial({ color: 0x2bff6a }), new THREE.MeshBasicMaterial({ color: 0xff3030 })];
  R.forEach(function (c) {
    var a = new THREE.Mesh(rg, rm); a.rotation.x = -Math.PI / 2; a.position.set(c, 0.03, 0); a.receiveShadow = true; TA.world.add(a);
    var b = new THREE.Mesh(rg, rm); b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI / 2; b.position.set(0, 0.04, c); b.receiveShadow = true; TA.world.add(b);
    R.forEach(function (d) {
      var x = new THREE.Mesh(cg, cm); x.rotation.x = -Math.PI / 2; x.position.set(c, 0.06, d); x.receiveShadow = true; TA.world.add(x);
      var lamp = new THREE.Mesh(lampG, TA.mat(0x4a4f57)); lamp.position.set(c + 8.2, 3.5, d + 8.2); TA.world.add(lamp);
      TA.world.add(TA.box(2.2, 0.15, 0.4, 0x4a4f57, c + 7.2, 7, d + 8.2)); TA.world.add(TA.glow(0.7, 0.1, 0.34, 0xfff3c4, c + 6.4, 6.9, d + 8.2));
      var pole = new THREE.Mesh(lampG, TA.mat(0x30343a)); pole.scale.y = 0.75; pole.position.set(c - 8.2, 2.6, d - 8.2); TA.world.add(pole);
      var l1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), TA.lightMats[0]); l1.position.set(c - 8.2, 5.4, d - 7.8); TA.world.add(l1);
      var l2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), TA.lightMats[1]); l2.position.set(c - 7.8, 5.4, d - 8.2); TA.world.add(l2);
    });
  });
}
function buildBankArunika(cx, cz) {
  TA.world.add(TA.box(64, 17, 42, 0xe8946a, cx, 8.5, cz - 12)); TA.colliders.push({ x0: cx - 32, x1: cx + 32, z0: cz - 33, z1: cz + 9 });
  TA.world.add(TA.box(68, 2.2, 6, 0xf1e9d8, cx, 15.6, cz + 11)); TA.world.add(TA.box(70, 0.5, 9, 0xd9b38c, cx, 0.45, cz + 12));
  var colG = new THREE.CylinderGeometry(0.9, 1, 14, 12);
  for (var k = 0; k < 8; k++) { var c = new THREE.Mesh(colG, TA.mat(0xffffff)); c.position.set(cx - 28 + k * 8, 7.5, cz + 12); c.castShadow = true; TA.world.add(c); }
  var sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.6), new THREE.MeshBasicMaterial({ map: TA.signTex('BANK ARUNIKA', '#b8860b', '#fbf7ee') }));
  sign.position.set(cx, 19.2, cz + 14.2); TA.world.add(sign); TA.world.add(TA.box(31, 4.2, 0.6, 0xfbf7ee, cx, 19.2, cz + 13.8));
  TA.world.add(TA.box(7, 6, 0.3, 0x3a2a1a, cx, 3.6, cz + 9.2));
  TA.landmarks.bank = { x: cx, z: cz + 14 }; TA.landmarks.cover = [];
  [[-16, 30], [-4, 31], [9, 30], [20, 31]].forEach(function (p) {
    TA.world.add(TA.box(4.4, 1.15, 1.3, 0xd7cdb8, cx + p[0], 0.8, cz + p[1])); TA.world.add(TA.box(3.8, 0.5, 0.8, 0x3fae5a, cx + p[0], 1.5, cz + p[1]));
    TA.colliders.push({ x0: cx + p[0] - 2.2, x1: cx + p[0] + 2.2, z0: cz + p[1] - 0.65, z1: cz + p[1] + 0.65 }); TA.landmarks.cover.push({ x: cx + p[0], z: cz + p[1] });
  });
}
function buildCoastPortAndIsland() {
  var W = TA.world, i;
  for (i = -15; i < 28; i++) { var p = TA.makePalmTree(7 + TA.rnd() * 3); p.position.set(i * 16 + 4, 0, 410.5 + TA.rnd() * 2); p.rotation.y = TA.rnd() * 6; W.add(p); }
  for (i = 0; i < 16; i++) {
    var ux = -200 + i * 40 + TA.rnd() * 12, uz = 424 + TA.rnd() * 12, um = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1, 8), TA.mat(TA.pick([0xff5a5a, 0xffd23f, 0x35a7ff, 0xff7aa2])));
    um.position.set(ux, 2.4, uz); W.add(um); W.add(TA.box(0.1, 2.4, 0.1, 0xffffff, ux, 1.2, uz)); W.add(TA.box(0.8, 0.3, 2, 0xfdfdfd, ux + 1.2, 0.3, uz));
  }
  W.add(TA.box(8, 0.5, 90, 0xb98b5e, 250, 0.5, 475)); TA.landmarks.pier = { x: 250, z: 430 };
  for (i = 0; i < 4; i++) {
    var gx = -430 + i * 45, cr = new THREE.Group();
    cr.add(TA.box(1.5, 34, 1.5, 0xff7b24, -7, 17, 0)); cr.add(TA.box(1.5, 34, 1.5, 0xff7b24, 7, 17, 0)); cr.add(TA.box(16, 2, 2, 0xff7b24, 0, 30, 0));
    cr.add(TA.box(2.4, 2.4, 60, 0xff9a3d, 0, 35, 14)); cr.add(TA.box(4, 3, 4, 0xfff3e0, 0, 32, 20));
    cr.position.set(gx, 0, 432); W.add(cr); TA.colliders.push({ x0: gx - 8, x1: gx - 6, z0: 431, z1: 433 }, { x0: gx + 6, x1: gx + 8, z0: 431, z1: 433 });
  }
  var ship = new THREE.Group(); ship.add(TA.box(110, 12, 20, 0xa33a2f, 0, 4, 0)); ship.add(TA.box(110, 1, 20.4, 0xf4f1e6, 0, 9.6, 0)); ship.add(TA.box(16, 16, 16, 0xfdfdfd, -40, 18, 0)); ship.add(TA.box(5, 7, 5, 0xff7b24, -42, 29, 0));
  for (i = 0; i < 9; i++) ship.add(TA.box(11, 5.2 * (1 + (i % 3)), 15, TA.pick([0xd9480f, 0x1c7ed6, 0x2b8a3e, 0xf2c94c]), -22 + i * 8.5 + 4, 10 + 2.6 * (1 + (i % 3)), 0));
  ship.position.set(-330, 0, 478); W.add(ship);
  for (i = 0; i < 6; i++) { var bt = new THREE.Group(); bt.add(TA.box(2.4, 1.2, 7, TA.pick([0xffffff, 0x35a7ff, 0xff5a5a]), 0, 0, 0)); bt.add(TA.box(1.6, 1.2, 2, 0xfdfdfd, 0, 1, -1)); bt.position.set(-120 + i * 110 + TA.rnd() * 40, 0, 520 + TA.rnd() * 160); bt.rotation.y = TA.rnd() * 6; W.add(bt); }
  W.add(TA.box(1130, 1.2, 13, 0xcfc8ba, 95, 10, -300)); W.add(TA.box(1130, 1, 0.5, 0xfdfdfd, 95, 11, -306.5)); W.add(TA.box(1130, 1, 0.5, 0xfdfdfd, 95, 11, -293.5));
  for (i = -9; i <= 9; i++) if (i % 2) { W.add(TA.box(2.2, 10, 2.2, 0xb9b2a4, i * 50, 5, -309)); W.add(TA.box(2.2, 10, 2.2, 0xb9b2a4, i * 50, 5, -291)); }
  [510, 600].forEach(function (tx) {
    W.add(TA.box(3, 62, 3, 0xe03131, tx, 31, -308)); W.add(TA.box(3, 62, 3, 0xe03131, tx, 31, -292)); W.add(TA.box(3, 3, 19, 0xe03131, tx, 58, -300));
    for (var k = 1; k <= 5; k++) for (var s = -1; s <= 1; s += 2) { var cb = TA.box(0.35, Math.hypot(k * 8, 46), 0.35, 0xe03131, tx + s * k * 4, 34, -300); cb.rotation.z = s * Math.atan2(k * 8, 46); W.add(cb); }
  });
  var isl = new THREE.Mesh(new THREE.CylinderGeometry(150, 165, 3, 28), TA.mat(0x5d5752)); isl.position.set(760, 0, -300); W.add(isl);
  var cone = new THREE.Mesh(new THREE.ConeGeometry(95, 120, 20), TA.mat(0x6b625b)); cone.position.set(790, 60, -310); W.add(cone);
  var lava = new THREE.Mesh(new THREE.ConeGeometry(22, 26, 14), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); lava.position.set(790, 109, -310); W.add(lava);
  for (i = 0; i < 7; i++) { var sm = new THREE.Mesh(new THREE.SphereGeometry(14 + i * 5, 8, 6), new THREE.MeshLambertMaterial({ color: 0x8d8780, transparent: true, opacity: 0.75 })); sm.position.set(790 + i * 12, 130 + i * 24, -310 - i * 6); W.add(sm); }
}
function buildContainerStacks(x, z) {
  for (var k = 0; k < 3; k++) {
    var n = 1 + Math.floor(TA.rnd() * 3), zz = z - 11 + k * 11;
    for (var s = 0; s < n; s++) TA.world.add(TA.box(26, 2.9, 5.6, TA.pick([0xd9480f, 0x1c7ed6, 0x2b8a3e, 0xf2c94c, 0x862e9c, 0xe03131]), x, 1.7 + s * 3, zz));
    TA.colliders.push({ x0: x - 13, x1: x + 13, z0: zz - 2.8, z1: zz + 2.8 });
  }
}
function addBuilding(x, z, w, d, h, col) {
  TA.wallMats = TA.wallMats || {};
  var m = TA.wallMats[col] || (TA.wallMats[col] = new THREE.MeshLambertMaterial({ map: TA.canvasTex(64, 64, function (g) {
    g.fillStyle = '#' + ('00000' + col.toString(16)).slice(-6); g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 60, 64, 4);
    for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) { g.fillStyle = (a + b) % 2 ? '#31506e' : '#4f7ea8'; g.fillRect(8 + a * 32, 12 + b * 30, 17, 16); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(8 + a * 32, 12 + b * 30, 17, 4); }
  }) }));
  var geo = TA.scaleUV(new THREE.BoxGeometry(w, h, d), Math.round(w / 9), Math.round(h / 7)), b = new THREE.Mesh(geo, m);
  b.position.set(x, h / 2 + 0.24, z); b.castShadow = true; b.receiveShadow = true; TA.world.add(b);
  TA.world.add(TA.box(w + 0.8, 0.7, d + 0.8, 0xfdfaf2, x, h + 0.5, z));
  TA.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
}
function addRoofSign(x, h, z, text) {
  var s = new THREE.Mesh(new THREE.PlaneGeometry(22, 5), new THREE.MeshBasicMaterial({ map: TA.signTex(text, '#fff7d6', TA.pick(['#e8590c', '#c2255c', '#1971c2', '#2f9e44'])), side: THREE.DoubleSide }));
  s.position.set(x, h + 4.4, z + 14); TA.world.add(s); TA.world.add(TA.box(0.4, 2.4, 0.4, 0x555555, x - 8, h + 1.4, z + 14)); TA.world.add(TA.box(0.4, 2.4, 0.4, 0x555555, x + 8, h + 1.4, z + 14));
}
function addMarketStall(x, z) {
  var c = TA.pick([0xff5a5a, 0xffd23f, 0x35a7ff, 0x2fbf71, 0xff7aa2]);
  TA.world.add(TA.box(2.2, 0.9, 1.4, 0xb98b5e, x, 0.7, z)); TA.world.add(TA.box(1.8, 0.35, 1, TA.pick([0xff922b, 0x94d82d, 0xfa5252]), x, 1.3, z));
  var u = new THREE.Mesh(new THREE.ConeGeometry(2, 0.9, 8), TA.mat(c)); u.position.set(x, 3, z); u.castShadow = true; TA.world.add(u);
  var u2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.56, 8), TA.mat(0xffffff)); u2.position.set(x, 3.22, z); TA.world.add(u2);
  TA.world.add(TA.box(0.1, 2.6, 0.1, 0xffffff, x, 1.5, z));
}
function districtAt(x, z) {
  if (x > 480) return TA.CFG.DISTRICTS[5]; if (z < -250) return TA.CFG.DISTRICTS[4]; if (z > 300 && x > -200) return TA.CFG.DISTRICTS[3];
  if (x < -200 && z > 100) return TA.CFG.DISTRICTS[0]; if (z > 100 && x < 100) return TA.CFG.DISTRICTS[1]; return TA.CFG.DISTRICTS[2];
}
function blocked(x, z, r) {
  if (x < -465 || x > 465 || z < -465 || z > 446) return true;
  for (var i = 0, c = TA.colliders, n = c.length; i < n; i++) { var k = c[i]; if (x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r) return true; }
  return false;
}
TA.buildOpenWorldCity = buildOpenWorldCity; TA.districtAt = districtAt; TA.blocked = blocked;
