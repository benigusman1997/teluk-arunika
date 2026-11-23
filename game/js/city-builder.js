// The city: ground, roads and paint, sidewalks, blocks and buildings, the six districts and their landmarks,
// sea, beach, bridge, elevated highway, collision map and the lane graph used by traffic and police.
TA.world = { colliders: [], grid: {}, nodes: [], buildings: [], signs: [], parkSpots: [], coverSpots: [] };
TA.PASTELS = [0xff8f7e, 0x9be7c4, 0x5fd3d3, 0xffc857, 0xf78fb3, 0xfff1d6, 0xa0c4ff, 0xffd6a5, 0xcdb4db, 0xb8e986];
TA.BRANDS = ['KOPI SAGARA', 'ARUNIKA AIR', 'NEON MIE', 'RADIO OMBAK', 'HOTEL KENANGA', 'SOTO BU TINI', 'KOMET MOTOR', 'ES KELAPA JAYA', 'TOKO LENTERA', 'BATIK SENJA', 'WARUNG LAUT', 'ARUNIKA TELECOM'];

// ---- collision map ----------------------------------------------------------
TA.addCollider = function (x0, z0, x1, z1, h, kind) {
  var c = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h: h, kind: kind || 'b' };
  var w = TA.world, idx = w.colliders.push(c) - 1;
  for (var gx = Math.floor(c.x0 / 40); gx <= Math.floor(c.x1 / 40); gx++) for (var gz = Math.floor(c.z0 / 40); gz <= Math.floor(c.z1 / 40); gz++) {
    var key = gx * 1000 + gz; (w.grid[key] || (w.grid[key] = [])).push(idx);
  }
  if (kind === 'b') w.buildings.push(c);
  return c;
};

// Pushes a circle out of every solid it overlaps. Returns true when something was hit.
TA.collideCircle = function (o, r) {
  var w = TA.world, hit = false;
  for (var gx = Math.floor((o.x - r) / 40); gx <= Math.floor((o.x + r) / 40); gx++) for (var gz = Math.floor((o.z - r) / 40); gz <= Math.floor((o.z + r) / 40); gz++) {
    var list = w.grid[gx * 1000 + gz];
    if (!list) continue;
    for (var i = 0; i < list.length; i++) {
      var c = w.colliders[list[i]];
      var px = TA.clamp(o.x, c.x0, c.x1), pz = TA.clamp(o.z, c.z0, c.z1), dx = o.x - px, dz = o.z - pz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-6) { var d = Math.sqrt(d2); o.x = px + dx / d * r; o.z = pz + dz / d * r; o.nx = dx / d; o.nz = dz / d; }
      else {
        var l = o.x - c.x0, rr = c.x1 - o.x, t = o.z - c.z0, bt = c.z1 - o.z, m = Math.min(l, rr, t, bt);
        if (m === l) { o.x = c.x0 - r; o.nx = -1; o.nz = 0; } else if (m === rr) { o.x = c.x1 + r; o.nx = 1; o.nz = 0; }
        else if (m === t) { o.z = c.z0 - r; o.nx = 0; o.nz = -1; } else { o.z = c.z1 + r; o.nx = 0; o.nz = 1; }
      }
    }
  }
  return hit;
};

TA.pointSolid = function (x, z, y) {
  var list = TA.world.grid[Math.floor(x / 40) * 1000 + Math.floor(z / 40)];
  if (!list) return false;
  for (var i = 0; i < list.length; i++) {
    var c = TA.world.colliders[list[i]];
    if (c.h > 2.5 && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && (y === undefined || y < c.h)) return true;
  }
  return false;
};

// Line of sight between two ground points (tall solids only block it).
TA.losClear = function (x0, z0, x1, z1) {
  var d = TA.dist(x0, z0, x1, z1), n = Math.ceil(d / 3);
  for (var i = 1; i < n; i++) { var t = i / n; if (TA.pointSolid(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
  return true;
};

// ---- terrain queries -------------------------------------------------------
TA.tolHeight = function (x) {
  var C = TA.CFG;
  if (x <= C.TOL_X0 || x >= C.TOL_X1) return 0;
  if (x < -280) return C.TOL_H * (x - C.TOL_X0) / 60;
  if (x > 520) return C.TOL_H * (C.TOL_X1 - x) / 80;
  return C.TOL_H;
};
TA.onTol = function (x, z) { return Math.abs(z - TA.CFG.TOL_Z) < 9 && x > TA.CFG.TOL_X0 && x < TA.CFG.TOL_X1; };
TA.onRoad = function (x, z) {
  var i;
  if (z > -248 && z < 218 || (x < -352 && z > -338)) for (i = 0; i < 7; i++) if (Math.abs(x - TA.ROADS_NS[i].x) < 8) return true;
  if (x > -368 && x < 368) for (i = 0; i < 5; i++) if (Math.abs(z - TA.ROADS_EW[i].z) < 8) return true;
  return false;
};
TA.groundY = function (x, z) {
  if (TA.onTol(x, z)) return TA.tolHeight(x);
  if (x > 452) return 0;
  if (TA.onRoad(x, z)) return 0;
  if (z > TA.CFG.BEACH_Z && x > -120) return 0.05;
  return 0.12;
};

// Keeps a point on walkable land: the mainland, the bridge, the island and the pier.
TA.keepOnLand = function (o) {
  var C = TA.CFG, I = C.ISLAND;
  var onMain = o.x > -448 && o.x < 448 && o.z > -448 && o.z < C.COAST_Z - 1;
  var onBridge = o.x >= 440 && o.x < 612 && Math.abs(o.z - C.TOL_Z) < 8.6;
  var onIsland = TA.dist(o.x, o.z, I.x, I.z) < I.r - 2;
  var onPier = o.x > 176.5 && o.x < 183.5 && o.z > 260 && o.z < 344;
  if (onMain || onBridge || onIsland || onPier) return false;
  if (o.x > 448 && o.x < 640 && Math.abs(o.z - C.TOL_Z) < 30 && o.x < 600) { o.z = TA.clamp(o.z, C.TOL_Z - 8.5, C.TOL_Z + 8.5); return true; }
  if (o.x > 560) { var d = TA.dist(o.x, o.z, I.x, I.z), k = (I.r - 2.5) / d; o.x = I.x + (o.x - I.x) * k; o.z = I.z + (o.z - I.z) * k; return true; }
  o.x = TA.clamp(o.x, -447.5, 447.5); o.z = TA.clamp(o.z, -447.5, C.COAST_Z - 1.5);
  return true;
};

TA.districtAt = function (x, z) {
  var D = TA.DISTRICTS;
  if (x > 455) return D[5];
  if (z < -250) return D[4];
  if (z > 120 && x > -120) return D[3];
  if (x < -120 && z > 0) return D[0];
  if (x < -120) return D[1];
  return D[2];
};

TA.streetAt = function (x, z) {
  if (x > 455) return x < 590 ? 'Jembatan Merah' : 'Jalan Abu';
  if (Math.abs(z - TA.CFG.TOL_Z) < 12) return 'Tol Layang';
  var best = 1e9, name = '';
  TA.ROADS_NS.forEach(function (r) { var d = Math.abs(x - r.x); if (d < best) { best = d; name = r.name; } });
  TA.ROADS_EW.forEach(function (r) { var d = Math.abs(z - r.z); if (d < best) { best = d; name = r.name; } });
  return name;
};

// ---- lane graph -------------------------------------------------------------
TA.buildNodes = function () {
  var nodes = TA.world.nodes = [];
  for (var j = 0; j < 5; j++) for (var i = 0; i < 7; i++) nodes.push({ id: j * 7 + i, i: i, j: j, x: TA.ROADS_NS[i].x, z: TA.ROADS_EW[j].z, nb: [] });
  nodes.forEach(function (n) {
    if (n.i > 0) n.nb.push(n.id - 1); if (n.i < 6) n.nb.push(n.id + 1);
    if (n.j > 0) n.nb.push(n.id - 7); if (n.j < 4) n.nb.push(n.id + 7);
  });
};
TA.nearestNode = function (x, z) {
  var best = null, bd = 1e9;
  TA.world.nodes.forEach(function (n) { var d = TA.dist(x, z, n.x, n.z); if (d < bd) { bd = d; best = n; } });
  return best;
};
// Traffic lights: north-south green for the first half of a 18 s cycle, east-west for the second.
TA.lightState = function (node, alongZ) {
  var t = (TA.run.time + node.id * 2.3) % 18, ns = t < 9, phase = ns ? t : t - 9;
  if (ns !== alongZ) return 'red';
  return phase > 7.5 ? 'yellow' : 'green';
};

// ---- building helpers -------------------------------------------------------
TA.isReserved = function (x0, z0, x1, z1) {
  for (var k in TA.PLACES) {
    var r = TA.PLACES[k].rect;
    if (r && x0 < r[2] - 0.5 && x1 > r[0] + 0.5 && z0 < r[3] - 0.5 && z1 > r[1] + 0.5) return true;
  }
  return false;
};

TA.addSign = function (text, x, y, z, ry, w, h, bg, fg, sub) {
  var s = TA.makeSign(text, w, h, bg, fg, sub);
  s.position.set(x, y, z); s.rotation.y = ry;
  TA.scene.add(s); TA.world.signs.push(s);
  return s;
};

// A textured building: walls into the facade batch, roof and trims into the flat batch.
TA.addBuilding = function (B, x0, z0, x1, z1, h, color, variant, y0) {
  var base = y0 || 0.12;
  B.facade[variant].walls(x0, z0, x1, z1, base, h, color);
  B.flat.flat(x0, z0, x1, z1, h, 0xd8d2c8);
  B.flat.box((x0 + x1) / 2, h + 0.25, (z0 + z1) / 2, x1 - x0 + 0.5, 0.5, z1 - z0 + 0.5, 0xf7f3ea);
  B.flat.flat(x0 + 0.6, z0 + 0.6, x1 - 0.6, z1 - 0.6, h + 0.52, 0xbfb8ac);
  if (!y0) TA.addCollider(x0, z0, x1, z1, h, 'b');
};

TA.buildTower = function (B, rng, x0, z0, x1, z1) {
  var w = 26 + rng() * 12, d = 26 + rng() * 12, cx = (x0 + x1) / 2 + (rng() - 0.5) * 4, cz = (z0 + z1) / 2 + (rng() - 0.5) * 4;
  var floors = 12 + Math.floor(rng() * 14), h = floors * 3.4, color = TA.PASTELS[Math.floor(rng() * TA.PASTELS.length)], v = Math.floor(rng() * 2);
  TA.addBuilding(B, cx - w / 2 - 3, cz - d / 2 - 3, cx + w / 2 + 3, cz + d / 2 + 3, 7.2, 0xf4efe6, 1);
  TA.addBuilding(B, cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h, color, v, 7.2);
  B.flat.box(cx + 4, h + 1.6, cz - 3, 6, 2.4, 5, 0xadb5bd); B.flat.cyl(cx - 6, h + 3.5, cz + 5, 0.12, 0.12, 6, 0xe63946, 5);
  if (rng() < 0.55) {
    var brand = TA.BRANDS[Math.floor(rng() * TA.BRANDS.length)], south = rng() < 0.6;
    TA.addSign(brand, south ? cx : cx + w / 2 + 0.2, h + 3.2, south ? cz + d / 2 - 0.5 : cz, south ? 0 : Math.PI / 2, Math.min(w, d) * 0.8, 4.4, ['#e63946', '#1d3557', '#ff9f1c', '#2a9d8f'][Math.floor(rng() * 4)], '#ffffff');
  }
};

TA.buildShophouse = function (B, rng, x0, z0, x1, z1, face) {
  var h = 7 + Math.floor(rng() * 3) * 2, color = TA.PASTELS[Math.floor(rng() * TA.PASTELS.length)];
  TA.addBuilding(B, x0 + 1, z0 + 1, x1 - 1, z1 - 1, h, color, 2);
  var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, aw = [0xe63946, 0x2a9d8f, 0xf4a261, 0x457b9d, 0xffffff][Math.floor(rng() * 5)];
  var ox = face[0] * ((x1 - x0) / 2 + 0.2), oz = face[1] * ((z1 - z0) / 2 + 0.2);
  B.flat.box(cx + ox, 3.3, cz + oz, face[0] ? 2.6 : x1 - x0 - 4, 0.2, face[1] ? 2.6 : z1 - z0 - 4, aw, 0, face[1] * 0.25, -face[0] * 0.25);
  if (rng() < 0.5) TA.addSign(TA.BRANDS[Math.floor(rng() * TA.BRANDS.length)], cx + ox * 0.96, 5.2, cz + oz * 0.96, face[0] ? face[0] * Math.PI / 2 : (face[1] > 0 ? 0 : Math.PI), 12, 1.8, '#fff8e7', '#b5179e');
};

TA.buildHotel = function (B, rng, x0, z0, x1, z1) {
  var floors = 5 + Math.floor(rng() * 5), h = floors * 3.4, color = TA.PASTELS[Math.floor(rng() * TA.PASTELS.length)];
  TA.addBuilding(B, x0 + 2, z0 + 3, x1 - 2, z1 - 3, h, color, 2);
  B.flat.box((x0 + x1) / 2, 3.6, z1 - 2.6, x1 - x0 - 3, 0.3, 2.2, 0xffffff);
  B.flat.box((x0 + x1) / 2, h + 1.4, (z0 + z1) / 2, 8, 2.2, 6, 0x7fd1e0);
};

TA.buildWarehouse = function (B, rng, x0, z0, x1, z1) {
  var h = 9 + rng() * 4, color = [0xdfe7ef, 0xf3e9d2, 0xcfe1f2, 0xe9dccb][Math.floor(rng() * 4)], roof = [0xd62828, 0x1d70b8, 0x2a9d8f, 0xf77f00][Math.floor(rng() * 4)];
  B.flat.box((x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0 - 4, h, z1 - z0 - 4, color);
  B.flat.box((x0 + x1) / 2, h + 0.6, (z0 + z1) / 2, x1 - x0 - 3, 1.2, z1 - z0 - 3, roof);
  B.flat.box((x0 + x1) / 2, 2.6, z1 - 1.9, 8, 5.2, 0.3, 0x495057);
  TA.addCollider(x0 + 2, z0 + 2, x1 - 2, z1 - 2, h, 'b');
};

TA.buildContainerYard = function (B, rng, x0, z0, x1, z1) {
  for (var x = x0 + 5; x < x1 - 4; x += 6.5) for (var z = z0 + 9; z < z1 - 7; z += 15) {
    if (rng() < 0.2 || (z0 > 200 && Math.abs(x + 300) < 16)) continue;   // keep a truck lane open to Dermaga 4
    var stack = 1 + Math.floor(rng() * 4);
    for (var k = 0; k < stack; k++) TA.addContainer(B.flat, x, 0.12 + k * 2.6, z, 0, TA.CONTAINER_COLORS[Math.floor(rng() * 8)]);
    TA.addCollider(x - 1.3, z - 6.1, x + 1.3, z + 6.1, stack * 2.6, 'b');
  }
};

// Fills one block with lots according to its district.
TA.buildBlock = function (B, rng, x0, z0, x1, z1) {
  var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, d = TA.districtAt(cx, cz).id, lots, nx, nz, i, j;
  B.flat.box(cx, 0.03, cz, x1 - x0, 0.18, z1 - z0, d === 'pelabuhan' ? 0xc9c4ba : 0xe3dccf);
  var ax0 = x0 + 4, az0 = z0 + 4, ax1 = x1 - 4, az1 = z1 - 4;
  nx = d === 'pasar' ? 4 : d === 'pantai' ? 3 : 2; nz = d === 'pasar' ? 4 : d === 'pantai' ? 1 : 2;
  var lw = (ax1 - ax0) / nx, ld = (az1 - az0) / nz;
  for (i = 0; i < nx; i++) for (j = 0; j < nz; j++) {
    var lx0 = ax0 + i * lw, lz0 = az0 + j * ld, lx1 = lx0 + lw, lz1 = lz0 + ld;
    if (TA.isReserved(lx0, lz0, lx1, lz1)) continue;
    if (d === 'neon') TA.buildTower(B, rng, lx0, lz0, lx1, lz1);
    else if (d === 'pantai') TA.buildHotel(B, rng, lx0, lz0, lx1, lz1);
    else if (d === 'pelabuhan') { if ((i + j) % 2 === 0) TA.buildWarehouse(B, rng, lx0, lz0, lx1, lz1); else TA.buildContainerYard(B, rng, lx0, lz0, lx1, lz1); }
    else if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) {
      var face = j === nz - 1 ? [0, 1] : j === 0 ? [0, -1] : i === 0 ? [-1, 0] : [1, 0];
      TA.buildShophouse(B, rng, lx0, lz0, lx1, lz1, face);
    } else {
      TA.addStall(B.flat, (lx0 + lx1) / 2, (lz0 + lz1) / 2, rng() * 3, TA.PASTELS[i + j], 0xffffff, rng);
      TA.addCollider((lx0 + lx1) / 2 - 1.3, (lz0 + lz1) / 2 - 1.3, (lx0 + lx1) / 2 + 1.3, (lz0 + lz1) / 2 + 1.3, 1.1, 'p');
    }
  }
};

// ---- landmarks --------------------------------------------------------------
TA.buildBank = function (B) {
  var f = B.flat, white = 0xfbf7ee, x;
  f.flat(14, -108, 106, -12, 0.14, 0xd9c7a3);
  for (x = 18; x < 104; x += 8) f.flat(x, -48, x + 0.3, -13, 0.15, 0xb9a57e);
  B.facade[0].walls(28, -104, 92, -56, 0.12, 20, white); f.box(60, 20.4, -80, 66, 0.8, 50, white);
  f.box(60, 16.6, -53, 66, 3.2, 7, white); f.box(60, 19.2, -53, 54, 2, 6.6, white); f.box(60, 21, -53, 38, 1.6, 6.2, white); f.box(60, 22.4, -53, 20, 1.2, 5.8, white);
  for (x = 32; x <= 88; x += 8) {
    f.cyl(x, 7.6, -51, 1.05, 1.2, 15, white, 12); f.box(x, 0.5, -51, 3, 0.8, 3, 0xe9e2d2);
    TA.addCollider(x - 1.2, -52.2, x + 1.2, -49.8, 15, 'b');
    TA.world.coverSpots.push({ x: x, z: -54 });
  }
  f.box(60, 0.35, -47.4, 62, 0.45, 3, 0xe9e2d2); f.box(60, 0.25, -45.6, 64, 0.25, 2, 0xe2d9c6);
  f.box(60, 4.2, -55.8, 9, 7, 0.4, 0x3b2f2f); f.box(60, 4.2, -55.6, 8, 6.4, 0.2, 0xcfa23a);
  TA.addSign('BANK ARUNIKA', 60, 16.6, -49.4, 0, 34, 2.8, '#fbf7ee', '#9a6b00');
  [[24, -26], [96, -26], [24, -40], [96, -40]].forEach(function (p) {
    f.box(p[0], 0.6, p[1], 5, 1, 5, 0xd9cfbd); TA.addPalm(f, p[0], p[1], B.rng); TA.addCollider(p[0] - 2.5, p[1] - 2.5, p[0] + 2.5, p[1] + 2.5, 1.1, 'p');
  });
  f.cyl(60, 0.5, -22, 5, 5.4, 0.8, 0xd9cfbd, 16); f.cyl(60, 0.95, -22, 4.4, 4.4, 0.1, 0x48cae4, 16); f.cyl(60, 1.8, -22, 0.4, 0.7, 2.6, 0xf8f5ee, 8);
  TA.addCollider(55, -27, 65, -17, 1.2, 'p');
  [44, 76].forEach(function (px) { f.cyl(px, 6, -44, 0.08, 0.1, 12, 0xdee2e6, 6); f.box(px + 1.1, 11, -44, 2.2, 1.3, 0.05, px < 60 ? 0xd62828 : 0x1d70b8); });
  TA.addCollider(28, -104, 92, -56, 20, 'b');
};

TA.buildSpecials = function (B) {
  var f = B.flat, P = TA.PLACES, r;
  r = P.workshop.rect;
  f.box((r[0] + r[2]) / 2, 3.6, (r[1] + r[3]) / 2, r[2] - r[0], 7, r[3] - r[1], 0xffc857); f.box((r[0] + r[2]) / 2, 7.4, (r[1] + r[3]) / 2, r[2] - r[0] + 1, 0.6, r[3] - r[1] + 1, 0xd62828);
  [-12, 0, 12].forEach(function (o) { f.box((r[0] + r[2]) / 2 + o, 2.4, r[3] + 0.05, 9, 4.6, 0.2, 0x343a40); });
  TA.addSign("BENGKEL PAK AMIR", (r[0] + r[2]) / 2, 6.1, r[3] + 0.3, 0, 26, 1.9, '#1b1b1b', '#ffc300', 'TAKSI · SERVIS · SAFEHOUSE');
  TA.addCollider(r[0], r[1], r[2], r[3], 7, 'b');
  r = P.respray.rect;
  f.box((r[0] + r[2]) / 2, 3.2, (r[1] + r[3]) / 2, r[2] - r[0], 6.2, r[3] - r[1], 0x5fd3d3); f.box((r[0] + r[2]) / 2, 2.3, r[3] + 0.05, 10, 4.4, 0.2, 0x22252a);
  ['#ff595e', '#ffca3a', '#8ac926', '#1982c4'].forEach(function (c, i) { f.box(r[0] + 4 + i * 2.2, 5.6, r[3] + 0.1, 2, 0.9, 0.1, parseInt(c.slice(1), 16)); });
  TA.addSign('SEMPROT KILAT', (r[0] + r[2]) / 2 + 5, 5.5, r[3] + 0.3, 0, 16, 1.6, '#ffffff', '#e63946', 'RESPRAY · LOSE THE HEAT');
  TA.addCollider(r[0], r[1], r[2], r[3], 6.4, 'b');
  r = P.gunshop.rect;
  f.box((r[0] + r[2]) / 2, 3, (r[1] + r[3]) / 2, r[2] - r[0], 6, r[3] - r[1], 0x495057); f.box(r[0] - 0.05, 2.2, (r[1] + r[3]) / 2, 0.2, 3.6, 6, 0x1b1b1b);
  TA.addSign('KELO ARMS', r[0] - 0.3, 5, (r[1] + r[3]) / 2, -Math.PI / 2, 18, 1.8, '#1b1b1b', '#ff9f1c', 'WEAPONS · AMMO · ARMOUR');
  TA.addCollider(r[0], r[1], r[2], r[3], 6, 'b');
  [['safe2', 0xf78fb3, 'KOS PANTAI', 0, 1], ['safe3', 0xa0c4ff, 'LOTENG NEON', -1, 0]].forEach(function (s) {
    r = P[s[0]].rect;
    TA.addBuilding(B, r[0], r[1], r[2], r[3], 13.6, s[1], 2);
    var mx = (r[0] + r[2]) / 2, mz = (r[1] + r[3]) / 2;
    TA.addSign(s[2], s[3] ? r[0] - 0.3 : mx, 5, s[4] ? r[3] + 0.3 : mz, s[3] ? -Math.PI / 2 : 0, 14, 1.6, '#1d3557', '#ffffff', 'SAFEHOUSE');
  });
  TA.addBuilding(B, -440, 40, -384, 84, 17, 0xcfe1f2, 1);
  TA.addSign('WIJAYA LOGISTICS', -383.6, 12, 62, Math.PI / 2, 30, 3, '#1d3557', '#ffd166');
};

// PELABUHAN quay, PANTAI beach, pier and boats.
TA.buildCoast = function (B, rng) {
  var f = B.flat, x, i;
  f.box(165, 0.03, 220, 570, 0.18, 4, 0xe3dccf);
  f.flat(-120, TA.CFG.BEACH_Z, 450, 268, 0.05, 0xf6e4b5);
  f.quad(-120, -1.3, 286, 450, -1.3, 286, 450, 0.05, 268, -120, 0.05, 268, 0xe7d3a0);
  for (i = 0; i < 46; i++) {
    x = -105 + rng() * 540; var z = 230 + rng() * 26;
    if (Math.abs(x - 180) < 8) continue;
    TA.addUmbrella(f, x, z, [0xff595e, 0x1982c4, 0xffca3a, 0xff924c, 0x06d6a0][i % 5], 0xffffff);
    f.box(x + 1.6, 0.12, z + 0.4, 0.8, 0.06, 2, [0xef476f, 0x118ab2, 0xffd166][i % 3]); f.box(x - 1.5, 0.3, z + 0.3, 0.7, 0.3, 1.9, 0xf8f9fa);
  }
  for (x = -110; x <= 440; x += 13) {
    if (Math.abs(((x + 600) % 120) - 0) < 12 || Math.abs(((x + 600) % 120) - 120) < 12) continue;
    TA.addPalm(f, x, 220.5, rng); TA.addCollider(x - 0.3, 220.2, x + 0.3, 220.8, 6, 'p');
    if (x % 2 === 0) { TA.addPalm(f, x + 5, 199.5, rng); TA.addCollider(x + 4.7, 199.2, x + 5.3, 199.8, 6, 'p'); }
  }
  f.box(180, 0.2, 304, 7, 0.4, 82, 0xb08968);
  for (i = 0; i < 9; i++) { f.cyl(177, -1.5, 266 + i * 10, 0.3, 0.3, 4, 0x7f5539, 6); f.cyl(183, -1.5, 266 + i * 10, 0.3, 0.3, 4, 0x7f5539, 6); }
  f.box(180, 2.2, 340, 9, 0.3, 9, 0xe63946); f.cyl(180, 1.2, 340, 0.15, 0.15, 2, 0xf8f9fa, 6);
  // quay
  f.flat(-450, 218, -120, 270, 0.13, 0xc9c4ba); f.box(-285, 0.4, 269.4, 330, 0.5, 1, 0xffc300);
  [-420, -340, -260, -180].forEach(function (cx) { TA.addCrane(f, cx, 252); TA.addCollider(cx - 8, 246, cx + 8, 258, 30, 'p'); });
  TA.buildContainerYard(B, rng, -450, 222, -120, 246);
  TA.addShip(f, -300, 292);
  [[60, 330, 0.4, 0xe63946], [260, 360, 2.2, 0x1d70b8], [-40, 420, 1.2, 0xffffff], [380, 300, 3.0, 0xffc300], [120, 480, 0.2, 0x2a9d8f], [470, 60, 1.5, 0xf78fb3], [500, -150, 0.3, 0xffffff]].forEach(function (bt) { TA.addBoat(f, bt[0], bt[1], bt[2], bt[3]); });
};

// TOL LAYANG: elevated deck on pillars, plus the red cable-stayed bridge to PULAU ABU.
TA.buildTol = function (B) {
  var f = B.flat, C = TA.CFG, z = C.TOL_Z, x;
  for (x = C.TOL_X0; x < C.TOL_X1; x += 20) {
    var h0 = TA.tolHeight(x), h1 = TA.tolHeight(x + 20), hm = (h0 + h1) / 2, rz = Math.atan2(h1 - h0, 20), len = Math.sqrt(400 + (h1 - h0) * (h1 - h0)) + 0.1;
    f.box(x + 10, hm - 0.45, z, len, 0.9, 19, 0x6a6c70, 0, 0, rz);
    f.box(x + 10, hm + 0.45, z - 9.2, len, 0.9, 0.5, 0xe9e4da, 0, 0, rz); f.box(x + 10, hm + 0.45, z + 9.2, len, 0.9, 0.5, 0xe9e4da, 0, 0, rz);
    if (hm > 0.6) { B.paint.flat(x + 3, z - 0.12, x + 11, z + 0.12, hm + 0.03, 0xffd43b); B.paint.flat(x + 4, z - 4.6, x + 9, z - 4.4, hm + 0.03, 0xffffff); B.paint.flat(x + 4, z + 4.4, x + 9, z + 4.6, hm + 0.03, 0xffffff); }
    if (hm > 2.5 && x < 440 && ((x + 340) / 20) % 2 === 0) { f.box(x + 10, (hm - 0.9) / 2, z, 2.6, hm - 0.9, 2.6, 0xbdb6aa); f.box(x + 10, hm - 1.3, z, 3, 0.8, 16, 0xbdb6aa); }
    if (hm > 4 && x < 440 && ((x + 340) / 20) % 3 === 0) TA.addLamp(f, x + 10, z - 9.4, 0, 1);
  }
  TA.addCollider(C.TOL_X0 + 6, z - 9.9, C.TOL_X1, z - 9.1, 12, 'w'); TA.addCollider(C.TOL_X0 + 6, z + 9.1, C.TOL_X1, z + 9.9, 12, 'w');
  var red = 0xe5383b;
  [472, 548].forEach(function (tx) {
    [-11, 11].forEach(function (oz) { f.box(tx, 22, z + oz, 2.4, 60, 2.4, red); });
    f.box(tx, 50, z, 2, 2.4, 24, red); f.box(tx, 30, z, 1.6, 1.8, 22, red);
    for (var k = 1; k <= 5; k++) [-1, 1].forEach(function (dir) {
      var dx = dir * k * 7.2, top = 50 - k * 1.5, len2 = Math.sqrt(dx * dx + (top - 8.6) * (top - 8.6));
      [-10.4, 10.4].forEach(function (oz) { f.box(tx + dx / 2, (top + 8.6) / 2, z + oz, len2, 0.22, 0.22, 0xfff3e0, 0, 0, Math.atan2(8.6 - top, dx)); });
    });
  });
  f.flat(-368, -338, -340, -322, 0.01, 0x5d5e62); f.flat(-368, -338, -352, -240, 0.01, 0x5d5e62);
  TA.addSign('TOL LAYANG', -300, 9, z - 9.6, 0, 26, 3, '#2d6a4f', '#ffffff', 'PULAU ABU  →');
};

TA.buildIsland = function (B, rng) {
  var f = B.flat, I = TA.CFG.ISLAND, i;
  f.cyl(I.x, -1.6, I.z, I.r, I.r + 14, 3.2, 0x5a5350, 28); f.cyl(I.x, -0.02, I.z, I.r - 6, I.r, 0.1, 0x47413f, 28);
  f.flat(596, -338, 668, -322, 0.06, 0x3a3634); f.flat(652, -322, 668, -290, 0.06, 0x3a3634);
  f.cyl(742, 38, -372, 13, 66, 76, 0x3d3633, 14); f.cyl(742, 76.2, -372, 12, 13, 0.6, 0xff6a00, 12); f.cyl(742, 60, -372, 20, 30, 34, 0x332c2a, 12);
  for (i = 0; i < 9; i++) f.sphere(742 + i * 7 + rng() * 6, 86 + i * 13, -372 - i * 4, 12 + i * 3.4, 9 + i * 2, 12 + i * 3, i < 2 ? 0x7a5c4f : 0x8a8684);
  TA.addCollider(708, -406, 776, -338, 60, 'b');
  TA.addBuilding(B, 640, -286, 684, -262, 8, 0x8a8178, 2); TA.addSign('ASH ISLAND DEPOT', 662, 6, -261.7, 0, 20, 1.8, '#3a3634', '#ff9f1c');
  for (i = 0; i < 16; i++) { var a = rng() * 6.28, r = 40 + rng() * 60, px = I.x + Math.sin(a) * r, pz = I.z + Math.cos(a) * r; if (px > 700 && pz < -330 || (Math.abs(pz + 330) < 14 && px < 670)) continue; f.box(px, 0.8, pz, 2 + rng() * 3, 1.6 + rng() * 2, 2 + rng() * 3, 0x2f2a28, rng() * 3); }
  for (i = 0; i < 5; i++) TA.addContainer(f, 632 + i * 3.2, 0.05, -246, 0, [0x386641, 0x6c584c][i % 2]);
  TA.addCollider(630, -253, 647, -239, 2.6, 'b');
};

// ---- roads ------------------------------------------------------------------
TA.buildRoads = function (B) {
  var f = B.flat, p = B.paint, asphalt = 0x626367, white = 0xf8f9fa, yellow = 0xffd43b, s, k, t;
  TA.ROADS_NS.forEach(function (r) { f.flat(r.x - 8, -248, r.x + 8, 218, 0.0, asphalt); });
  TA.ROADS_EW.forEach(function (r) { f.flat(-368, r.z - 8, 368, r.z + 8, 0.0, asphalt); });
  for (var i = 0; i < 7; i++) for (var j = 0; j < 4; j++) {          // north-south segments
    var x = TA.ROADS_NS[i].x, z0 = TA.ROADS_EW[j].z + 13.5, z1 = TA.ROADS_EW[j + 1].z - 13.5;
    p.flat(x - 0.32, z0, x - 0.12, z1, 0.03, yellow); p.flat(x + 0.12, z0, x + 0.32, z1, 0.03, yellow);
    p.flat(x - 7.7, z0, x - 7.5, z1, 0.03, white); p.flat(x + 7.5, z0, x + 7.7, z1, 0.03, white);
    for (t = z0 + 2; t < z1 - 3; t += 8) { p.flat(x - 4.0, t, x - 3.82, t + 3.2, 0.03, white); p.flat(x + 3.82, t, x + 4.0, t + 3.2, 0.03, white); }
  }
  for (j = 0; j < 5; j++) for (i = 0; i < 6; i++) {                    // east-west segments
    var z = TA.ROADS_EW[j].z, x0 = TA.ROADS_NS[i].x + 13.5, x1 = TA.ROADS_NS[i + 1].x - 13.5;
    p.flat(x0, z - 0.32, x1, z - 0.12, 0.03, yellow); p.flat(x0, z + 0.12, x1, z + 0.32, 0.03, yellow);
    p.flat(x0, z - 7.7, x1, z - 7.5, 0.03, white); p.flat(x0, z + 7.5, x1, z + 7.7, 0.03, white);
    for (t = x0 + 2; t < x1 - 3; t += 8) { p.flat(t, z - 4.0, t + 3.2, z - 3.82, 0.03, white); p.flat(t, z + 3.82, t + 3.2, z + 4.0, 0.03, white); }
  }
  TA.world.nodes.forEach(function (n) {                                  // zebra crossings and stop lines
    for (s = -1; s <= 1; s += 2) {
      for (k = -7; k <= 7; k += 1.4) {
        if (n.j > 0 || s > 0) if (n.j < 4 || s < 0) p.flat(n.x + k - 0.35, n.z + s * 10 - 1.5, n.x + k + 0.35, n.z + s * 10 + 1.5, 0.03, white);
        if (n.i > 0 || s > 0) if (n.i < 6 || s < 0) p.flat(n.x + s * 10 - 1.5, n.z + k - 0.35, n.x + s * 10 + 1.5, n.z + k + 0.35, 0.03, white);
      }
      [[1, 1], [1, -1]].forEach(function (c) { TA.addTrafficPole(f, n.x + s * 9, n.z + s * c[1] * 9); });
    }
  });
};

// Street furniture along every road: lamps, benches, hydrants, bus stops, parking spots, market stalls.
TA.buildStreetProps = function (B, rng) {
  var f = B.flat, i, j, t, n = 0;
  for (i = 0; i < 7; i++) for (j = 0; j < 4; j++) {
    var x = TA.ROADS_NS[i].x, za = TA.ROADS_EW[j].z, zb = TA.ROADS_EW[j + 1].z;
    for (t = za + 24; t < zb - 20; t += 36) {
      var side = (n++ % 2) ? 1 : -1, lx = x + side * 9;
      TA.addLamp(f, lx, t, -side, 0); TA.addCollider(lx - 0.2, t - 0.2, lx + 0.2, t + 0.2, 6, 'p');
      if (rng() < 0.4) TA.addBench(f, x - side * 10.6, t + 8, side * Math.PI / 2);
      if (rng() < 0.3) TA.addHydrant(f, x + side * 8.8, t + 12);
      if (rng() < 0.75) TA.world.parkSpots.push({ x: x + side * 6.6, z: t + 15, h: side > 0 ? 0 : Math.PI });
      if (i === 3) { TA.addPalm(f, x - side * 9.4, t + 4, rng); }
    }
  }
  for (j = 0; j < 5; j++) for (i = 0; i < 6; i++) {
    var z = TA.ROADS_EW[j].z, xa = TA.ROADS_NS[i].x, xb = TA.ROADS_NS[i + 1].x;
    for (t = xa + 24; t < xb - 20; t += 36) {
      var sd = (n++ % 2) ? 1 : -1, lz = z + sd * 9;
      if (j < 4) { TA.addLamp(f, t, lz, 0, -sd); TA.addCollider(t - 0.2, lz - 0.2, t + 0.2, lz + 0.2, 6, 'p'); }
      if (rng() < 0.22) TA.addBusStop(f, t + 10, z - sd * 10.8, sd > 0 ? Math.PI : 0);
      if (rng() < 0.7 && j < 4) TA.world.parkSpots.push({ x: t + 15, z: z + sd * 6.6, h: sd > 0 ? -Math.PI / 2 : Math.PI / 2 });
      if (TA.districtAt(t, z - 20).id === 'pasar' && rng() < 0.8) TA.addStall(f, t + 6, z - sd * 10.4, sd > 0 ? 0 : Math.PI, TA.PASTELS[n % 10], 0xffffff, rng);
    }
  }
  // The Pasar Senja street market: two rows of stalls along Jl. Rempah, under a gate at each end.
  for (t = -106; t <= -66; t += 5.5) for (i = -1; i <= 1; i += 2) {
    var mx = -240 + i * 12.1;
    TA.addStall(f, mx, t + (i > 0 ? 0 : 2.6), Math.PI / 2, TA.PASTELS[(n++) % 10], n % 2 ? 0xffffff : 0xffd166, rng);
    TA.addCollider(mx - 0.6, t + (i > 0 ? 0 : 2.6) - 1.3, mx + 0.6, t + (i > 0 ? 0 : 2.6) + 1.3, 1.1, 'p');
    f.box(mx - i * 0.2, 3.3, t + 2.75, 0.05, 0.05, 5.5, 0x343a40);
    for (j = 0; j < 4; j++) f.box(mx - i * 0.2, 3.05, t + 0.7 + j * 1.4, 0.3, 0.42, 0.3, [0xff595e, 0xffca3a, 0x8ac926, 0x4cc9f0][(j + n) % 4]);
  }
  [-109, -57].forEach(function (gz) {
    f.cyl(-250.6, 3.6, gz, 0.22, 0.26, 7.2, 0xd62828, 8); f.cyl(-229.4, 3.6, gz, 0.22, 0.26, 7.2, 0xd62828, 8);
    f.box(-240, 7.5, gz, 22.4, 0.5, 0.6, 0xd62828); f.box(-240, 7.95, gz, 24, 0.3, 1.2, 0xffc857);
    TA.addCollider(-250.9, gz - 0.3, -250.3, gz + 0.3, 7, 'p'); TA.addCollider(-229.7, gz - 0.3, -229.1, gz + 0.3, 7, 'p');
    TA.addSign('PASAR SENJA', -240, 6.3, gz + 0.4, 0, 13, 1.7, '#7f1d1d', '#ffd166', 'NIGHT MARKET · JL. REMPAH');
    TA.addSign('PASAR SENJA', -240, 6.3, gz - 0.4, Math.PI, 13, 1.7, '#7f1d1d', '#ffd166', 'NIGHT MARKET · JL. REMPAH');
  });
};

TA.buildMargins = function (B, rng) {
  var f = B.flat, z, x;
  f.box(-409, 0.03, -50, 82, 0.18, 536, 0xe3dccf); f.box(409, 0.03, -15, 82, 0.18, 466, 0xe3dccf); f.box(49, 0.03, -283, 802, 0.18, 70, 0xe3dccf);
  f.box(0, 0.03, -396, 900, 0.18, 108, 0x9bd17f);
  for (z = -236; z < 190; z += 46) {
    if (!TA.isReserved(-448, z, -372, z + 44)) { if (z < 0) TA.buildShophouse(B, rng, -440, z, -384, z + 42, [1, 0]); else TA.buildWarehouse(B, rng, -446, z, -380, z + 44); }
    if (z < 110) TA.addBuilding(B, 384, z + 3, 436, z + 41, 17 + Math.floor(rng() * 8) * 3.4, TA.PASTELS[Math.floor(rng() * 10)], Math.floor(rng() * 3));
    else TA.buildHotel(B, rng, 380, z, 440, z + 44);
  }
  for (x = -320; x < 430; x += 50) TA.addBuilding(B, x + 3, -312, x + 45, -262, 14 + Math.floor(rng() * 7) * 3.4, TA.PASTELS[Math.floor(rng() * 10)], Math.floor(rng() * 3));
  for (x = -420; x < 440; x += 62) {
    TA.addBuilding(B, x, -430 + rng() * 20, x + 30, -392, 24 + rng() * 30, 0xfff1d6, 2);
    for (var k = 0; k < 3; k++) TA.addPalm(f, x + 36 + k * 8, -372 - rng() * 60, rng);
  }
};

// ---- assemble ---------------------------------------------------------------
TA.buildCity = function () {
  var rng = TA.makeRng(2026), B = { flat: TA.Batch(), paint: TA.Batch(), facade: [TA.Batch(), TA.Batch(), TA.Batch()], rng: rng };
  TA.buildNodes();
  // mainland slab and sea
  B.flat.box(0, -2.55, -90, 900, 5, 720, 0xd5cbb9);
  var sea = TA.Batch();
  sea.flat(-5000, -5000, 5000, 5000, -0.9, 0x1fb6c9);
  sea.flat(-520, 270, 520, 330, -0.86, 0x5fdcdc); sea.flat(450, -470, 500, 330, -0.86, 0x5fdcdc); sea.flat(-500, -470, -450, 330, -0.86, 0x5fdcdc);
  TA.sea = sea.build(new THREE.MeshLambertMaterial({ vertexColors: true })); TA.sea.castShadow = false;
  TA.scene.add(TA.sea);
  var waves = TA.Batch();
  for (var w = 0; w < 70; w++) { var wx = -900 + rng() * 2000, wz = 285 + rng() * 520, wl = 14 + rng() * 40; waves.flat(wx, wz, wx + wl, wz + 0.7, -0.8, 0xffffff); }
  for (w = 0; w < 30; w++) { var ex = 470 + rng() * 500, ez = -450 + rng() * 700; if (TA.dist(ex, ez, 700, -330) < 130) continue; waves.flat(ex, ez, ex + 0.7, ez + 20 + rng() * 30, -0.8, 0xffffff); }
  TA.waves = waves.build(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); TA.waves.castShadow = false;
  TA.scene.add(TA.waves);

  TA.buildRoads(B);
  for (var i = 0; i < 6; i++) for (var j = 0; j < 4; j++) {
    var x0 = TA.ROADS_NS[i].x + 8, x1 = TA.ROADS_NS[i + 1].x - 8, z0 = TA.ROADS_EW[j].z + 8, z1 = TA.ROADS_EW[j + 1].z - 8;
    if (i === 3 && j === 1) { B.flat.box(60, 0.03, -60, 104, 0.18, 104, 0xe3dccf); TA.buildBank(B); } else TA.buildBlock(B, rng, x0, z0, x1, z1);
  }
  TA.buildSpecials(B);
  TA.buildMargins(B, rng);
  TA.buildCoast(B, rng);
  TA.buildTol(B);
  TA.buildIsland(B, rng);
  TA.buildStreetProps(B, rng);

  TA.cityMesh = B.flat.build(); TA.scene.add(TA.cityMesh);
  var paintMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  TA.paintMesh = B.paint.build(paintMat); TA.paintMesh.castShadow = false; TA.scene.add(TA.paintMesh);
  B.facade.forEach(function (fb, v) { if (fb.count) TA.scene.add(fb.build(TA.facadeMaterial(v))); });
  TA.buildGulls();
};

// Seagulls: small white specks wheeling over the bay.
TA.buildGulls = function () {
  var geo = new THREE.BoxGeometry(1.5, 0.08, 0.34), mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  TA.gulls = [];
  for (var i = 0; i < 14; i++) {
    var m = new THREE.Mesh(geo, mat);
    TA.gulls.push({ mesh: m, cx: -200 + i * 55, cz: 250 + (i % 4) * 22, r: 16 + (i % 5) * 7, y: 16 + (i % 6) * 5, ph: i * 1.7 });
    TA.scene.add(m);
  }
};

TA.updateCity = function (dt) {
  var t = TA.run.time;
  TA.waves.position.z = Math.sin(t * 0.35) * 5; TA.waves.position.x = Math.cos(t * 0.22) * 4;
  for (var i = 0; i < TA.gulls.length; i++) {
    var g = TA.gulls[i], a = t * 0.4 + g.ph;
    g.mesh.position.set(g.cx + Math.sin(a) * g.r, g.y + Math.sin(a * 2.3) * 1.5, g.cz + Math.cos(a) * g.r);
    g.mesh.rotation.set(0, a + Math.PI / 2, Math.sin(t * 6 + g.ph) * 0.5);
  }
};
