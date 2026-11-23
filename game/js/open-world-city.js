// The open world: roads, blocks, the six districts and their landmarks, sea, beach, bridge, flyover, collision map, lane graph.

function buildOpenWorldCity() {
  seedRandom(20261123);
  const ctx = { flat: createGeometryBatch(), win: createGeometryBatch(), paint: createGeometryBatch(), ground: createGeometryBatch(), nsLamps: createGeometryBatch(), ewLamps: createGeometryBatch(), signCount: 0 };
  buildGroundSeaAndBeach(ctx);
  buildRoadNetworkAndLanes(ctx);
  buildSixDistricts(ctx);
  buildFlyoverAndRedBridge(ctx);
  buildStreetProps(ctx);
  W.scene.add(batchToMesh(ctx.ground, sharedMaterial('flat'), false, true));
  W.scene.add(batchToMesh(ctx.paint, sharedMaterial('paint'), false, true));
  W.scene.add(batchToMesh(ctx.flat, sharedMaterial('flat'), true, true));
  W.scene.add(batchToMesh(ctx.win, sharedMaterial('windows'), true, true));
  W.trafficLights.ns = new THREE.Mesh(batchToGeometry(ctx.nsLamps), new THREE.MeshBasicMaterial({ color: 0x35e06a, toneMapped: false }));
  W.trafficLights.ew = new THREE.Mesh(batchToGeometry(ctx.ewLamps), new THREE.MeshBasicMaterial({ color: 0xff3b30, toneMapped: false }));
  W.scene.add(W.trafficLights.ns);
  W.scene.add(W.trafficLights.ew);
  buildColliderGrid();
  linkWalkNodesAcrossStreets();
}

function buildSixDistricts(ctx) {
  for (let i = 0; i < 6; i++) {
    for (let j = -1; j < 4; j++) {
      const x0 = ROAD_XS[i] + 8, x1 = ROAD_XS[i + 1] - 8;
      const z0 = j < 0 ? -312 : ROAD_ZS[j] + 8, z1 = j < 0 ? -248 : (j === 3 ? 259 : ROAD_ZS[j + 1] - 8);
      const block = { x0: x0, z0: z0, x1: x1, z1: z1, district: districtAt((x0 + x1) / 2, (z0 + z1) / 2).id, reserved: [], open: false };
      W.blocks.push(block);
      addBlockSlabAndWalkNodes(ctx, block);
    }
  }
  buildBankArunika(ctx);
  buildNamedLandmarks(ctx);
  buildPelabuhanPort(ctx);
  for (const block of W.blocks) fillBlockWithBuildings(ctx, block);
  buildPasarSenjaMarket(ctx);
  buildPantaiBeach(ctx);
  buildPulauAbu(ctx);
}

function buildRoadNetworkAndLanes(ctx) {
  for (let i = 0; i < ROAD_XS.length; i++) {
    for (let j = 0; j < ROAD_ZS.length; j++) W.nodes.push({ x: ROAD_XS[i], z: ROAD_ZS[j], links: [], hwx: 8, hwz: j === 4 ? 11 : 8 });
  }
  const at = (i, j) => i * ROAD_ZS.length + j;
  const link = (a, b) => { W.nodes[a].links.push(b); W.nodes[b].links.push(a); };
  for (let i = 0; i < ROAD_XS.length; i++) {
    for (let j = 0; j < ROAD_ZS.length; j++) {
      if (i + 1 < ROAD_XS.length) link(at(i, j), at(i + 1, j));
      if (j + 1 < ROAD_ZS.length) link(at(i, j), at(i, j + 1));
    }
  }
  // The flyover: a ground node at the west ramp and one on Pulau Abu.
  W.nodes.push({ x: -360, z: FLYOVER.z, links: [], hwx: 8, hwz: 9, ramp: true });
  W.nodes.push({ x: 652, z: FLYOVER.z, links: [], hwx: 8, hwz: 9, ramp: true });
  link(at(0, 0), W.nodes.length - 2);
  link(W.nodes.length - 2, W.nodes.length - 1);
  for (let a = 0; a < W.nodes.length; a++) {
    for (const b of W.nodes[a].links) if (b > a) paintRoadSegment(ctx, W.nodes[a], W.nodes[b]);
  }
  for (let n = 0; n < at(6, 4) + 1; n++) addTrafficLightPoles(ctx, W.nodes[n]);
}

function roadHalfWidth(a, b) {
  if (a.ramp && b.ramp) return FLYOVER.half;
  return Math.abs(a.z - b.z) < 1 && Math.abs(a.z - 270) < 1 ? 11 : 8;
}

function paintStrip(batch, cx, cz, dx, dz, length, width, color, y) {
  const rx = -dz, rz = dx, hl = length / 2, hwid = width / 2, h = y === undefined ? 0.03 : y;
  batchAddQuad(batch, [cx - dx * hl - rx * hwid, h, cz - dz * hl - rz * hwid], [cx - dx * hl + rx * hwid, h, cz - dz * hl + rz * hwid],
    [cx + dx * hl + rx * hwid, h, cz + dz * hl + rz * hwid], [cx + dx * hl - rx * hwid, h, cz + dz * hl - rz * hwid], color);
}

function paintRoadSegment(ctx, a, b) {
  if (a.ramp && b.ramp) return;
  const len = dist2d(a.x, a.z, b.x, b.z), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
  const hw = roadHalfWidth(a, b), along = Math.abs(dx) > 0.5;
  const insetA = (along ? a.hwx : a.hwz) + 0.5, insetB = b.ramp ? 2 : (along ? b.hwx : b.hwz) + 0.5;
  const rx = -dz, rz = dx, white = 0xe9e4d6, yellow = 0xf2c230, p = ctx.paint;
  const s0 = insetA + 5, s1 = len - insetB - 5, mid = (s0 + s1) / 2, run = s1 - s0;
  for (const off of [-0.22, 0.22]) paintStrip(p, a.x + dx * mid + rx * off, a.z + dz * mid + rz * off, dx, dz, run, 0.16, yellow);
  for (const off of [-(hw - 0.35), hw - 0.35]) paintStrip(p, a.x + dx * mid + rx * off, a.z + dz * mid + rz * off, dx, dz, run + 8, 0.14, white);
  for (let s = s0 + 2; s < s1 - 3; s += 8) {
    for (const off of [-hw / 2, hw / 2]) paintStrip(p, a.x + dx * (s + 1.5) + rx * off, a.z + dz * (s + 1.5) + rz * off, dx, dz, 3, 0.16, white);
  }
  for (const end of [insetA + 2.2, len - insetB - 2.2]) {
    if (b.ramp && end > len / 2) continue;
    for (let off = -hw + 0.9; off <= hw - 0.9; off += 1.15) paintStrip(p, a.x + dx * end + rx * off, a.z + dz * end + rz * off, dx, dz, 3, 0.55, white);
  }
  // Stop lines and straight-on arrows on the approach side (left-hand traffic).
  for (const dir of [1, -1]) {
    const stop = dir > 0 ? s1 + 0.3 : s0 - 0.3;
    paintStrip(p, a.x + dx * stop - rx * dir * hw / 2, a.z + dz * stop - rz * dir * hw / 2, dx, dz, 0.45, hw - 0.9, white);
    for (const lane of [hw * 0.25, hw * 0.75]) {
      const s = stop - dir * 9, cx = a.x + dx * s - rx * dir * lane, cz = a.z + dz * s - rz * dir * lane;
      paintStrip(p, cx - dx * dir * 0.9, cz - dz * dir * 0.9, dx, dz, 2.4, 0.3, white);
      const tx = cx + dx * dir * 1.6, tz = cz + dz * dir * 1.6, bx = cx + dx * dir * 0.3, bz = cz + dz * dir * 0.3;
      const tri = dir > 0 ? [[bx - rx * 0.7, 0.03, bz - rz * 0.7], [bx + rx * 0.7, 0.03, bz + rz * 0.7], [tx, 0.03, tz], [tx, 0.03, tz]] : [[bx + rx * 0.7, 0.03, bz + rz * 0.7], [bx - rx * 0.7, 0.03, bz - rz * 0.7], [tx, 0.03, tz], [tx, 0.03, tz]];
      batchAddQuad(p, tri[0], tri[1], tri[2], tri[3], white);
    }
  }
  // Manhole covers, patches and skid marks so the asphalt never reads as an empty slab.
  for (let s = s0 + 6; s < s1 - 6; s += randRange(11, 19)) {
    const off = randRange(-hw + 1.5, hw - 1.5), cx = a.x + dx * s + rx * off, cz = a.z + dz * s + rz * off, roll = rand();
    if (roll < 0.35) { paintStrip(p, cx, cz, dx, dz, 1.0, 1.0, 0x45474d); paintStrip(p, cx, cz, dx, dz, 0.7, 0.7, 0x55575e, 0.034); }
    else if (roll < 0.7) for (const w of [-0.75, 0.75]) paintStrip(p, cx + rx * w, cz + rz * w, dx, dz, randRange(5, 11), 0.24, 0x484a50);
    else paintStrip(p, cx, cz, dx, dz, randRange(2.5, 5), randRange(1.6, 2.6), 0x62646b);
  }
}

function addTrafficLightPoles(ctx, node) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = node.x + sx * (node.hwx + 0.9), z = node.z + sz * (node.hwz + 0.9);
      batchAddBox(ctx.flat, x, 2.3, z, 0.2, 4.6, 0.2, 0x3c4a52, 0);
      batchAddBox(ctx.flat, x, 5.2, z, 0.56, 1.3, 0.56, 0x22282d, 0);
      batchAddBox(ctx.nsLamps, x, 5.25, z - sz * 0.3, 0.34, 0.9, 0.06, 0xffffff, 0);
      batchAddBox(ctx.ewLamps, x - sx * 0.3, 5.25, z, 0.06, 0.9, 0.34, 0xffffff, 0);
      addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 4.6);
    }
  }
}

function buildGroundSeaAndBeach(ctx) {
  const g = ctx.ground;
  batchAddBox(g, (LAND.x0 + LAND.x1) / 2, -1.5, (LAND.z0 + LAND.z1) / 2, LAND.x1 - LAND.x0, 3, LAND.z1 - LAND.z0, 0x62656c, 0);
  flatRect(g, LAND.x0, LAND.z0, LAND.x1, -345, 0.02, 0x7fbf63);
  flatRect(g, LAND.x0, -345, -368, LAND.z1, 0.02, 0x86c56a);
  flatRect(g, 368, -312, LAND.x1, LAND.z1, 0.02, 0x9c9b97);
  // Sand sloping into the water south of the promenade.
  batchAddQuad(g, [LAND.x0, 0.02, LAND.z1], [LAND.x0, -1.0, 340], [LAND.x1, -1.0, 340], [LAND.x1, 0.02, LAND.z1], 0xf3deb2);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(3200, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x35bcc9, map: sharedTexture('sea') }));
  sharedTexture('sea').repeat.set(1, 1);
  const uv = sea.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 150, uv.getY(i) * 150);
  sea.position.y = -0.55;
  sea.receiveShadow = true;
  W.scene.add(sea);
  W.sea = sea;
  const shore = createGeometryBatch();
  flatRect(shore, LAND.x0 - 16, 318, LAND.x1 + 16, 352, -0.5, 0x8fe6dc);
  flatRect(shore, LAND.x1, LAND.z0 - 10, LAND.x1 + 14, 318, -0.5, 0x6fd6d4);
  flatRect(shore, LAND.x0 - 14, LAND.z0 - 10, LAND.x0, 318, -0.5, 0x6fd6d4);
  const shoreMesh = batchToMesh(shore, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6 }), false, false);
  W.scene.add(shoreMesh);
  // Parks on the north and west edges.
  for (let i = 0; i < 70; i++) {
    const north = i % 2 === 0;
    const x = north ? randRange(LAND.x0 + 6, LAND.x1 - 60) : randRange(LAND.x0 + 5, -374);
    const z = north ? randRange(LAND.z0 + 5, -350) : randRange(-340, 250);
    if (north && x > -366 && x < -352) continue;
    addRoundTree(ctx.flat, x, z, randRange(0.8, 1.4));
    addCollider(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 4);
  }
}

function flatRect(batch, x0, z0, x1, z1, y, color, uvScale) {
  const u = uvScale ? [[x0 * uvScale, z0 * uvScale], [x0 * uvScale, z1 * uvScale], [x1 * uvScale, z1 * uvScale], [x1 * uvScale, z0 * uvScale]] : null;
  batchAddQuad(batch, [x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], color, u);
}

function addRoundTree(batch, x, z, s) {
  SCRATCH.m.compose(SCRATCH.p.set(x, 1.6 * s, z), SCRATCH.q.identity(), SCRATCH.s.set(0.5 * s, 3.2 * s, 0.5 * s));
  batchAddGeometry(batch, unitGeometry('cyl6'), SCRATCH.m, 0x7a5a3c);
  SCRATCH.m.compose(SCRATCH.p.set(x, 4.6 * s, z), SCRATCH.q.identity(), SCRATCH.s.set(5.2 * s, 4.4 * s, 5.2 * s));
  batchAddGeometry(batch, unitGeometry('sphere'), SCRATCH.m, 0x3f9d57);
  SCRATCH.m.compose(SCRATCH.p.set(x + 1.2 * s, 5.8 * s, z + 0.6 * s), SCRATCH.q.identity(), SCRATCH.s.set(3.2 * s, 2.8 * s, 3.2 * s));
  batchAddGeometry(batch, unitGeometry('sphere'), SCRATCH.m, 0x55b468);
}

function addBlockSlabAndWalkNodes(ctx, block) {
  const tint = { pelabuhan: 0xbdbab2, pasar: 0xdccbb0, neon: 0xcfcdd2, pantai: 0xe6d9bf, layang: 0xc9cdc4, abu: 0x8a8580 }[block.district];
  batchAddBox(ctx.ground, (block.x0 + block.x1) / 2, 0.08, (block.z0 + block.z1) / 2, block.x1 - block.x0, 0.16, block.z1 - block.z0, tint, 0);
  // Kerb line a shade lighter than the paving.
  const k = 0xf0ebe0, t = 0.3;
  batchAddBox(ctx.ground, (block.x0 + block.x1) / 2, 0.09, block.z0 + t / 2, block.x1 - block.x0, 0.17, t, k, 0);
  batchAddBox(ctx.ground, (block.x0 + block.x1) / 2, 0.09, block.z1 - t / 2, block.x1 - block.x0, 0.17, t, k, 0);
  batchAddBox(ctx.ground, block.x0 + t / 2, 0.09, (block.z0 + block.z1) / 2, t, 0.17, block.z1 - block.z0, k, 0);
  batchAddBox(ctx.ground, block.x1 - t / 2, 0.09, (block.z0 + block.z1) / 2, t, 0.17, block.z1 - block.z0, k, 0);
  const inset = 4.4, base = W.walkNodes.length;
  const corners = [[block.x0 + inset, block.z0 + inset], [block.x1 - inset, block.z0 + inset], [block.x1 - inset, block.z1 - inset], [block.x0 + inset, block.z1 - inset]];
  corners.forEach((c, n) => W.walkNodes.push({ x: c[0], z: c[1], links: [base + (n + 1) % 4, base + (n + 3) % 4], block: W.blocks.length - 1 }));
}

function linkWalkNodesAcrossStreets() {
  for (let a = 0; a < W.walkNodes.length; a++) {
    for (let b = a + 1; b < W.walkNodes.length; b++) {
      const p = W.walkNodes[a], q = W.walkNodes[b];
      if (p.block === q.block) continue;
      const dx = Math.abs(p.x - q.x), dz = Math.abs(p.z - q.z);
      if ((dx < 1 && dz < 34) || (dz < 1 && dx < 34)) { p.links.push(b); q.links.push(a); }
    }
  }
}

function reserveLot(x0, z0, x1, z1) {
  for (const block of W.blocks) {
    if (x0 >= block.x0 - 1 && x1 <= block.x1 + 1 && z0 >= block.z0 - 1 && z1 <= block.z1 + 1) block.reserved.push({ x0: x0, z0: z0, x1: x1, z1: z1 });
  }
}

function fillBlockWithBuildings(ctx, block) {
  const style = DISTRICT_STYLE[block.district];
  if (block.open) return;
  const inset = 6.2, gap = 3.5;
  const nx = style.nx, nz = block.z1 - block.z0 < 70 ? 1 : style.nz;
  const cw = (block.x1 - block.x0 - inset * 2 - gap * (nx - 1)) / nx, cd = (block.z1 - block.z0 - inset * 2 - gap * (nz - 1)) / nz;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const cx0 = block.x0 + inset + ix * (cw + gap), cz0 = block.z0 + inset + iz * (cd + gap);
      const w = Math.max(10.5, Math.floor(cw * randRange(0.78, 1) / 3.5) * 3.5), d = Math.max(10.5, Math.floor(cd * randRange(0.78, 1) / 3.5) * 3.5);
      // Keep the facade on the street side of the cell.
      const x0 = ix === 0 ? cx0 : ix === nx - 1 ? cx0 + cw - w : cx0 + (cw - w) / 2;
      const z0 = iz === 0 ? cz0 : iz === nz - 1 ? cz0 + cd - d : cz0 + (cd - d) / 2;
      if (block.reserved.some((r) => x0 < r.x1 + 3 && x0 + w > r.x0 - 3 && z0 < r.z1 + 3 && z0 + d > r.z0 - 3)) continue;
      const floors = randInt(style.floors[0], style.floors[1]);
      const face = ix === 0 ? 'w' : ix === nx - 1 ? 'e' : iz === 0 ? 'n' : 's';
      const sign = style.signs && rand() < style.signs && ctx.signCount < 46 ? SHOP_NAMES[ctx.signCount % SHOP_NAMES.length] : null;
      addBuilding(ctx, x0, z0, x0 + w, z0 + d, 4.2 + floors * 3.3, randPick(style.colors), { awnings: style.awnings, face: face, sign: sign, roofSign: style.roofSigns && floors > 14 && rand() < 0.6 });
    }
  }
}

function addBuilding(ctx, x0, z0, x1, z1, h, color, opts) {
  const o = opts || {}, b = ctx.win, f = ctx.flat;
  const y0 = 4.2, w = x1 - x0, d = z1 - z0;
  const u0 = randInt(0, 3) * 0.25, v0 = randInt(0, 3) * 0.25, uw = w / 14, ud = d / 14, vh = (h - y0) / 13.2;
  batchAddQuad(b, [x0, y0, z1], [x1, y0, z1], [x1, h, z1], [x0, h, z1], color, [[u0, v0], [u0 + uw, v0], [u0 + uw, v0 + vh], [u0, v0 + vh]]);
  batchAddQuad(b, [x1, y0, z0], [x0, y0, z0], [x0, h, z0], [x1, h, z0], color, [[u0, v0], [u0 + uw, v0], [u0 + uw, v0 + vh], [u0, v0 + vh]]);
  batchAddQuad(b, [x1, y0, z1], [x1, y0, z0], [x1, h, z0], [x1, h, z1], color, [[u0, v0], [u0 + ud, v0], [u0 + ud, v0 + vh], [u0, v0 + vh]]);
  batchAddQuad(b, [x0, y0, z0], [x0, y0, z1], [x0, h, z1], [x0, h, z0], color, [[u0, v0], [u0 + ud, v0], [u0 + ud, v0 + vh], [u0, v0 + vh]]);
  // Ground-floor band: darker, with shop fronts and awnings.
  const band = shadeColor(color, 0.62), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  batchAddBox(f, cx, 0.16 + (y0 - 0.16) / 2, cz, w + 0.3, y0 - 0.16, d + 0.3, band, 0);
  batchAddBox(f, cx, y0 + 0.12, cz, w + 0.6, 0.24, d + 0.6, 0xf1ece0, 0);
  const awn = [0xe8590c, 0x1aa7a1, 0xf2c230, 0xd6336c, 0x2f9e5b, 0x3b6fd9];
  for (const side of ['n', 's', 'w', 'e']) {
    const alongX = side === 'n' || side === 's', len = alongX ? w : d;
    const fx = side === 'w' ? x0 - 0.16 : side === 'e' ? x1 + 0.16 : 0, fz = side === 'n' ? z0 - 0.16 : side === 's' ? z1 + 0.16 : 0;
    const out = side === 'n' || side === 'w' ? -1 : 1;
    for (let s = 2.2; s < len - 2; s += 5.2) {
      const px = alongX ? x0 + s : fx, pz = alongX ? fz : z0 + s;
      batchAddBox(f, px, 1.75, pz, alongX ? 3.4 : 0.06, 2.5, alongX ? 0.06 : 3.4, 0x2a3a48, 0);
      batchAddBox(f, px, 2.55, pz, alongX ? 3.4 : 0.08, 0.5, alongX ? 0.08 : 3.4, 0x7fa7c4, 0);
      if (o.awnings && side === o.face) batchAddBox(f, alongX ? px : px + out * 0.8, 3.45, alongX ? pz + out * 0.8 : pz, alongX ? 4.4 : 1.7, 0.14, alongX ? 1.7 : 4.4, awn[Math.abs(Math.floor(s + x0 + z0)) % awn.length], 0);
    }
  }
  // Roof with parapet, water tank, AC boxes and an antenna.
  flatRect(f, x0, z0, x1, z1, h, 0x9a9690);
  batchAddBox(f, cx, h + 0.35, z0 + 0.2, w, 0.7, 0.4, shadeColor(color, 0.86), 0);
  batchAddBox(f, cx, h + 0.35, z1 - 0.2, w, 0.7, 0.4, shadeColor(color, 0.86), 0);
  batchAddBox(f, x0 + 0.2, h + 0.35, cz, 0.4, 0.7, d, shadeColor(color, 0.86), 0);
  batchAddBox(f, x1 - 0.2, h + 0.35, cz, 0.4, 0.7, d, shadeColor(color, 0.86), 0);
  const kit = rand();
  if (kit < 0.5) {
    SCRATCH.m.compose(SCRATCH.p.set(x0 + w * 0.3, h + 1.7, z0 + d * 0.3), SCRATCH.q.identity(), SCRATCH.s.set(2.6, 2.4, 2.6));
    batchAddGeometry(f, unitGeometry('cyl'), SCRATCH.m, 0x4a7fb5);
    batchAddBox(f, x0 + w * 0.3, h + 0.3, z0 + d * 0.3, 2.2, 0.6, 2.2, 0x6b6f76, 0);
  }
  if (kit > 0.25) for (let i = 0; i < 3; i++) batchAddBox(f, x0 + w * 0.65 + i * 1.9 - 1.9, h + 0.55, z0 + d * 0.7, 1.4, 1.1, 1.4, 0xc9c5bb, 0);
  if (kit > 0.7 || h > 50) batchAddBox(f, x1 - w * 0.25, h + 4, z0 + d * 0.25, 0.16, 8, 0.16, 0xd9534f, 0);
  if (h > 40) batchAddBox(f, cx, h + 1.6, cz, w * 0.5, 3.2, d * 0.5, shadeColor(color, 0.8), 0);
  if (o.sign) addWallSign(ctx, o.sign, o.face, x0, z0, x1, z1, 3.2, Math.min(alongLen(o.face, w, d) * 0.7, 9), 1.3);
  if (o.roofSign) addWallSign(ctx, ROOF_BRANDS[ctx.signCount % ROOF_BRANDS.length], o.face, x0, z0, x1, z1, h + 3.6, Math.min(alongLen(o.face, w, d) * 0.8, 20), 4.2);
  addCollider(x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15, h);
}

function alongLen(face, w, d) {
  return face === 'n' || face === 's' ? w : d;
}

function addWallSign(ctx, text, face, x0, z0, x1, z1, y, width, height) {
  const style = SIGN_STYLES[ctx.signCount % SIGN_STYLES.length];
  const sign = makeSignMesh(text, width, height, { bg: style[0], fg: style[1], size: 64, pxW: 512, border: style[1] });
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (face === 's') sign.position.set(cx, y, z1 + 0.4);
  else if (face === 'n') { sign.position.set(cx, y, z0 - 0.4); sign.rotation.y = Math.PI; }
  else if (face === 'e') { sign.position.set(x1 + 0.4, y, cz); sign.rotation.y = Math.PI / 2; }
  else { sign.position.set(x0 - 0.4, y, cz); sign.rotation.y = -Math.PI / 2; }
  W.scene.add(sign);
  ctx.signCount++;
  return sign;
}

function buildBankArunika(ctx) {
  const f = ctx.flat, stone = 0xe6dcc6, shade = 0xcfc4ab;
  reserveLot(8, -112, 112, -8);
  // Dark patterned plaza so the pale facade and the people on it stand out.
  const plaza = createGeometryBatch();
  flatRect(plaza, 8.3, -111.7, 51, -8.3, 0.175, 0xffffff, 0.125);
  const plazaMesh = batchToMesh(plaza, new THREE.MeshLambertMaterial({ map: sharedTexture('plaza') }), false, true);
  W.scene.add(plazaMesh);
  batchAddBox(f, 78, 11, -60, 54, 22, 84, stone, 0);
  batchAddBox(f, 78, 23, -60, 46, 4, 70, shade, 0);
  batchAddBox(f, 51.2, 0.5, -60, 5, 0.66, 78, 0xbfb49c, 0);
  batchAddBox(f, 48.6, 13.6, -60, 7.4, 3.6, 78, stone, 0);
  batchAddBox(f, 48.4, 15.7, -60, 8.2, 0.7, 80, shade, 0);
  batchAddBox(f, 48.4, 11.6, -60, 7.8, 0.5, 79, shade, 0);
  for (let i = 0; i < 8; i++) {
    const z = -92 + i * (64 / 7);
    SCRATCH.m.compose(SCRATCH.p.set(47, 6.1, z), SCRATCH.q.identity(), SCRATCH.s.set(1.7, 10.6, 1.7));
    batchAddGeometry(f, unitGeometry('cyl'), SCRATCH.m, 0xefe6d2);
    batchAddBox(f, 47, 1.05, z, 2.3, 0.5, 2.3, shade, 0);
    batchAddBox(f, 47, 11.2, z, 2.2, 0.4, 2.2, shade, 0);
    addCollider(46.1, z - 0.9, 47.9, z + 0.9, 11);
    if (i < 7 && i !== 3) batchAddBox(f, 50.94, 6.4, z + 32 / 7, 0.1, 6.6, 3.6, 0x2c4257, 0);
  }
  batchAddBox(f, 50.9, 3.6, -60, 0.2, 6.4, 5.4, 0x3b2a1c, 0);
  batchAddBox(f, 50.8, 3.4, -60, 0.2, 5.6, 0.2, 0xd9b45a, 0);
  const sign = makeSignMesh('BANK ARUNIKA', 19, 2.7, { bg: '#1f3a34', fg: '#f3d27a', size: 96, pxW: 1024, border: '#f3d27a' });
  sign.position.set(44.86, 13.6, -60);
  sign.rotation.y = -Math.PI / 2;
  W.scene.add(sign);
  for (const z of [-104, -16]) {
    batchAddBox(f, 30, 5, z, 0.14, 10, 0.14, 0xd8d8d8, 0);
    batchAddBox(f, 30.9, 9.2, z, 1.7, 1.1, 0.05, z < -60 ? 0xd6332a : 0xf8f9fa, 0);
    addHydrantBinPlanter(f, 'planter', 20, z + (z < -60 ? 4 : -4));
    addCollider(19.2, z + (z < -60 ? 4 : -4) - 0.8, 20.8, z + (z < -60 ? 4 : -4) + 0.8, 1.2);
  }
  addCollider(51, -102, 106, -18, 22);
  // A side block behind the bank keeps the skyline busy.
  addBuilding(ctx, 60, -16.5, 102, -13, 4.2 + 3.3 * 4, 0xd9c7a3, { face: 's' });
}

function buildNamedLandmarks(ctx) {
  const f = ctx.flat;
  const garage = (x0, z0, x1, z1, h, color, name, face, signBg) => {
    reserveLot(x0, z0, x1, z1);
    batchAddBox(f, (x0 + x1) / 2, 0.16 + h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, color, 0);
    batchAddBox(f, (x0 + x1) / 2, h + 0.3, (z0 + z1) / 2, x1 - x0 + 0.6, 0.3, z1 - z0 + 0.6, 0xf1ece0, 0);
    const alongX = face === 's' || face === 'n', len = alongX ? x1 - x0 : z1 - z0;
    for (const t of [0.28, 0.72]) {
      const px = alongX ? x0 + len * t : (face === 'w' ? x0 - 0.06 : x1 + 0.06), pz = alongX ? (face === 's' ? z1 + 0.06 : z0 - 0.06) : z0 + len * t;
      batchAddBox(f, px, 2.2, pz, alongX ? len * 0.3 : 0.1, 4, alongX ? 0.1 : len * 0.3, 0x2b3238, 0);
      for (let k = 0; k < 4; k++) batchAddBox(f, px, 0.9 + k * 0.9, pz, alongX ? len * 0.3 : 0.14, 0.08, alongX ? 0.14 : len * 0.3, 0x59636b, 0);
    }
    const sign = makeSignMesh(name, Math.min(len * 0.86, 16), 1.7, { bg: signBg, fg: '#ffffff', size: 72, pxW: 512, border: '#ffd43b' });
    sign.position.set(alongX ? (x0 + x1) / 2 : (face === 'w' ? x0 - 0.3 : x1 + 0.3), h - 1.2, alongX ? (face === 's' ? z1 + 0.3 : z0 - 0.3) : (z0 + z1) / 2);
    sign.rotation.y = face === 's' ? 0 : face === 'n' ? Math.PI : face === 'e' ? Math.PI / 2 : -Math.PI / 2;
    W.scene.add(sign);
    addCollider(x0, z0, x1, z1, h);
  };
  garage(-318, 88, -282, 105.5, 7.5, 0x8fd6c2, 'BENGKEL PAK AMIR', 's', '#0b7285');
  garage(134.5, 46, 160, 74, 9, 0x6b7a55, 'KELO ARMS', 'w', '#2b2f1e');
  garage(254.5, -76, 278, -44, 7.5, 0xff9ebb, 'CAT KILAT RESPRAY', 'w', '#c2255c');
  garage(254.5, -206, 300, -154, 11, 0xb96a45, 'GUDANG 9', 'w', '#5c3a21');
  garage(282, 86, 318, 105.5, 15, 0xe8d9b5, 'DERMAGA LOFT', 's', '#364fc7');
  garage(-84, 226, -36, 252.5, 21, 0xffc9a8, 'PANTAI APARTEMEN', 's', '#e8590c');
  // Wijaya Tower: the tallest building downtown, with a gold crown.
  reserveLot(38, 62, 82, 106);
  addBuilding(ctx, 39, 63, 81, 105, 4.2 + 3.3 * 29, 0x6fa3d8, { face: 's' });
  batchAddBox(f, 60, 104.5, 84, 30, 6, 30, 0xd9b45a, 0);
  batchAddBox(f, 60, 113, 84, 0.5, 14, 0.5, 0xd9534f, 0);
  const crown = makeSignMesh('WIJAYA', 26, 5, { bg: '#17202b', fg: '#f3d27a', size: 96, pxW: 512 });
  crown.position.set(60, 104.5, 99.2);
  W.scene.add(crown);
  const crownWest = crown.clone();
  crownWest.position.set(68.9 - 24, 104.5, 84);
  crownWest.rotation.y = -Math.PI / 2;
  W.scene.add(crownWest);
}

function buildPelabuhanPort(ctx) {
  const f = ctx.flat, colors = [0xe8590c, 0x1c7ed6, 0x2b8a3e, 0xfab005, 0xc92a2a, 0x5f3dc4, 0xe9ecef, 0x0c8599];
  const yard = W.blocks.find((b) => 318 > b.x0 && 318 < b.x1 && -66 > b.z0 && -66 < b.z1);
  yard.open = true;
  const stack = (x, z, levels, ry) => {
    for (let k = 0; k < levels; k++) addShippingContainer(f, x, 0.16 + k * 2.62, z, ry, randPick(colors));
    if (ry) addCollider(x - 3.05, z - 1.25, x + 3.05, z + 1.25, levels * 2.6); else addCollider(x - 1.25, z - 3.05, x + 1.25, z + 3.05, levels * 2.6);
  };
  for (const z of [-104, -101.4, -84, -30, -27.4, -15]) {
    for (let x = 290; x <= 346; x += 6.6) if (rand() > 0.2) stack(x, z, randInt(1, 3), Math.PI / 2);
  }
  stack(318, -56, 1, Math.PI / 2);
  const tag = makeSignMesh('47', 2.2, 1.6, { bg: '#f8f9fa', fg: '#c92a2a', size: 110, pxW: 256 });
  tag.position.set(318, 1.6, -57.3);
  tag.rotation.y = Math.PI;
  W.scene.add(tag);
  for (const z of [-204, -196, -180, 150, 162, 190, 204]) stack(378, z, randInt(1, 3), 0);
  // Four gantry cranes on the quay and a moored cargo ship.
  for (const z of [-150, -70, 10, 90]) {
    const c = 0xe8590c;
    for (const lx of [386, 404]) {
      for (const lz of [-7, 7]) {
        batchAddBox(f, lx, 14, z + lz, 1.2, 28, 1.2, c, 0);
        addCollider(lx - 0.7, z + lz - 0.7, lx + 0.7, z + lz + 0.7, 28);
      }
      batchAddBox(f, lx, 27, z, 1.0, 1.4, 15, c, 0);
      batchAddBox(f, lx, 9, z, 0.6, 0.8, 14, 0xf1ece0, 0);
    }
    batchAddBox(f, 412, 29, z, 72, 1.8, 2.2, c, 0);
    batchAddBox(f, 395, 37, z, 1.4, 15, 1.4, c, 0);
    batchAddBeam(f, 395, 44, z, 446, 30, z, 0.5, 0xf1ece0);
    batchAddBeam(f, 395, 44, z, 378, 30, z, 0.5, 0xf1ece0);
    batchAddBox(f, 398, 26, z + 2.4, 3.4, 3, 3, 0xf1ece0, 0);
    batchAddBox(f, 430, 27.6, z, 3, 1.2, 3, 0x2b3238, 0);
    batchAddBox(f, 430, 21, z, 0.2, 12, 0.2, 0x2b3238, 0);
    addShippingContainer(f, 430, 13, z, 0, randPick(colors));
  }
  batchAddBox(f, 433, 2, -20, 26, 6.4, 180, 0x27313f, 0);
  batchAddBox(f, 433, -0.3, -20, 26.4, 1.4, 180.4, 0xb5302a, 0);
  batchAddBox(f, 433, 5.4, -20, 27, 0.5, 181, 0xe9ecef, 0);
  for (let z = -100; z <= 30; z += 6.6) {
    for (const x of [424, 427, 430, 433, 436, 439, 442]) if (rand() > 0.25) for (let k = 0; k < randInt(1, 3); k++) addShippingContainer(f, x, 5.6 + k * 2.62, z, 0, randPick(colors));
  }
  batchAddBox(f, 433, 12, 56, 22, 13, 16, 0xf1ece0, 0);
  batchAddBox(f, 433, 17.2, 47.8, 22.4, 1.6, 0.3, 0x22303d, 0);
  batchAddBox(f, 433, 22, 60, 5, 8, 5, 0xe8590c, 0);
  batchAddBox(f, 433, 25, 60, 5.2, 1.2, 5.2, 0x22303d, 0);
  // Port gate over Jl. Kenanga.
  for (const z of [-9.6, 9.6]) { batchAddBox(f, 250, 4.5, z, 0.9, 9, 0.9, 0x2d6a8f, 0); addCollider(249.5, z - 0.5, 250.5, z + 0.5, 9); }
  batchAddBox(f, 250, 8.4, 0, 1.0, 1.9, 20, 0x2d6a8f, 0);
  const gate = makeSignMesh('PELABUHAN ARUNIKA', 16, 1.5, { bg: '#2d6a8f', fg: '#ffffff', size: 64, pxW: 512 });
  gate.position.set(249.45, 8.4, 0);
  gate.rotation.y = -Math.PI / 2;
  W.scene.add(gate);
}

function buildPasarSenjaMarket(ctx) {
  const f = ctx.flat, gz = PLACES.gate.z, red = 0xc92a2a, gold = 0xf2c230;
  for (const s of [-1, 1]) {
    batchAddBox(f, -240 + s * 9.6, 4.6, gz, 1.3, 9.2, 1.3, red, 0);
    batchAddBox(f, -240 + s * 9.6, 0.5, gz, 1.8, 0.7, 1.8, gold, 0);
    addCollider(-240 + s * 9.6 - 0.7, gz - 0.7, -240 + s * 9.6 + 0.7, gz + 0.7, 9);
  }
  batchAddBox(f, -240, 9.6, gz, 22, 1.7, 1.4, red, 0);
  batchAddBox(f, -240, 10.8, gz, 25, 0.5, 2.6, gold, 0);
  batchAddBox(f, -240, 11.5, gz, 17, 0.9, 1.6, red, 0);
  batchAddBox(f, -240, 12.2, gz, 20, 0.4, 2.4, gold, 0);
  for (const side of [1, -1]) {
    const sign = makeSignMesh('PASAR SENJA', 13, 1.4, { bg: '#7a1414', fg: '#ffd43b', size: 80, pxW: 512 });
    sign.position.set(-240, 9.6, gz + side * 0.72);
    sign.rotation.y = side > 0 ? 0 : Math.PI;
    W.scene.add(sign);
  }
  const stallColors = [0xe03131, 0x1c7ed6, 0x2f9e44, 0xf08c00, 0xae3ec9, 0x0c8599];
  for (let z = -104; z <= 104; z += 8) {
    if (Math.abs(z) < 16 || Math.abs(z - gz) < 5) continue;
    for (const s of [-1, 1]) {
      const x = -240 + s * 10.4;
      if (rand() < 0.72) {
        addMarketStall(f, x, z, Math.PI / 2, randPick(stallColors));
        addCollider(x - 0.8, z - 1.6, x + 0.8, z + 1.6, 2.8);
      } else if (rand() < 0.7) {
        addBeachUmbrella(f, x, z, randPick(stallColors), 0.16);
        batchAddBox(f, x, 0.5, z + 1.2, 1.0, 0.7, 1.0, 0xa9764a, 0);
      }
    }
  }
  // Lantern strings across the market street.
  for (let z = -100; z <= 100; z += 20) {
    if (Math.abs(z) < 16) continue;
    batchAddBeam(f, -249.2, 7.2, z, -230.8, 7.2, z, 0.06, 0x2b2b2b);
    for (const s of [-1, 1]) batchAddBox(f, -240 + s * 9.2, 3.7, z, 0.14, 7.2, 0.14, 0x5a4632, 0);
    for (let i = 0; i < 7; i++) batchAddBox(f, -246.6 + i * 2.2, 6.8, z, 0.5, 0.6, 0.5, i % 2 ? gold : red, 0);
  }
}

function buildPantaiBeach(ctx) {
  const f = ctx.flat;
  batchAddBox(ctx.ground, (LAND.x0 + LAND.x1) / 2, 0.08, 284.25, LAND.x1 - LAND.x0, 0.16, 6.5, 0xe6d9bf, 0);
  batchAddBox(ctx.ground, (LAND.x0 + LAND.x1) / 2, 0.09, 281.15, LAND.x1 - LAND.x0, 0.17, 0.3, 0xf0ebe0, 0);
  // A chain of promenade walk nodes, later linked across the boulevard.
  let prev = -1;
  for (const rx of ROAD_XS) {
    for (const off of [-12.4, 12.4]) {
      W.walkNodes.push({ x: rx + off, z: 284.4, links: prev >= 0 ? [prev] : [], block: -1 });
      if (prev >= 0) W.walkNodes[prev].links.push(W.walkNodes.length - 1);
      prev = W.walkNodes.length - 1;
    }
  }
  for (let x = LAND.x0 + 8; x < LAND.x1 - 4; x += 12.5) {
    if (Math.abs(x - 150) < 6) continue;
    makePalmTree(f, x, 286.2, randRange(8.5, 11.5), randRange(0.1, 0.24), randRange(-0.5, 0.5));
    addCollider(x - 0.3, 285.9, x + 0.3, 286.5, 8);
  }
  for (let x = -350; x < 352; x += 16) {
    if (ROAD_XS.some((rx) => Math.abs(x - rx) < 13)) continue;
    makePalmTree(f, x, 260.4, randRange(7.5, 10), randRange(0.05, 0.18), randRange(2.6, 3.6));
    addCollider(x - 0.3, 260.1, x + 0.3, 260.7, 8);
  }
  const brolly = [0xff6b6b, 0x22b8cf, 0xffd43b, 0xf783ac, 0x51cf66, 0xff922b];
  for (let x = LAND.x0 + 14; x < LAND.x1 - 10; x += 8.5) {
    if (Math.abs(x - 150) < 9) continue;
    for (const z of [295, 306, 317]) if (rand() < 0.62) addBeachUmbrella(f, x + randRange(-1.5, 1.5), z + randRange(-1.5, 1.5), randPick(brolly), groundHeightAt(x, z) - 0.05);
  }
  // The pier with rails, lamps and a little hut at the end.
  batchAddBox(f, 150, 0.3, 339.5, 7, 0.3, 105, 0xb08a5e, 0);
  for (let z = 292; z <= 390; z += 7) {
    for (const s of [-1, 1]) {
      batchAddBox(f, 150 + s * 3.2, -0.6, z, 0.4, 2.6, 0.4, 0x6f5335, 0);
      batchAddBox(f, 150 + s * 3.4, 0.95, z, 0.14, 1.0, 0.14, 0xf1ece0, 0);
    }
  }
  for (const s of [-1, 1]) batchAddBox(f, 150 + s * 3.4, 1.45, 340, 0.12, 0.1, 104, 0xf1ece0, 0);
  batchAddBox(f, 147.6, 1.9, 388, 2.2, 2.8, 4, 0x1aa7a1, 0);
  batchAddBox(f, 147.6, 3.5, 388, 2.8, 0.3, 4.8, 0xfdf6e3, 0);
  // Lifeguard tower, volleyball net, boats in the bay.
  batchAddBox(f, -150, 3.2, 312, 3, 2.2, 3, 0xff6b6b, 0);
  batchAddBox(f, -150, 4.5, 312, 3.8, 0.3, 3.8, 0xfdf6e3, 0);
  for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) batchAddBox(f, -150 + dx, 1.0, 312 + dz, 0.2, 2.6, 0.2, 0xfdf6e3, 0);
  for (const x of [34, 44]) batchAddBox(f, x, 1.0, 303, 0.14, 2.6, 0.14, 0x3c4a52, 0);
  batchAddBox(f, 39, 1.75, 303, 10, 0.9, 0.04, 0xf8f9fa, 0);
  for (let i = 0; i < 9; i++) {
    const x = randRange(-420, 380), z = randRange(400, 640), ry = randRange(0, 6.28), hull = randPick([0xf8f9fa, 0xff6b6b, 0x1c7ed6, 0xffd43b]);
    if (Math.abs(x - 150) < 20 && z < 420) continue;
    batchAddBox(f, x, 0.1, z, 2.6, 1.3, 8, hull, ry);
    batchAddBox(f, x, 1.3, z, 1.8, 1.2, 3, 0xfdf6e3, ry);
    if (i % 2) { batchAddBox(f, x, 4.5, z, 0.14, 7.5, 0.14, 0x6b4a2f, 0); batchAddBox(f, x + Math.sin(ry) * 1.4, 4.6, z + Math.cos(ry) * 1.4, 0.05, 5.4, 2.6, 0xfdf6e3, ry); }
  }
  addBusStop(f, -40, 261.2, 0);
  addCollider(-41.8, 260.2, -38.2, 261, 2.6);
}

function buildPulauAbu(ctx) {
  const f = ctx.flat;
  SCRATCH.m.compose(SCRATCH.p.set(ISLAND.x, -1.5, ISLAND.z), SCRATCH.q.identity(), SCRATCH.s.set(ISLAND.r * 2, 3, ISLAND.r * 2));
  batchAddGeometry(ctx.ground, new THREE.CylinderGeometry(0.5, 0.52, 1, 28), SCRATCH.m, 0x57524e);
  SCRATCH.m.compose(SCRATCH.p.set(ISLAND.coneX, 30, ISLAND.coneZ), SCRATCH.q.identity(), SCRATCH.s.set(ISLAND.coneR * 2, 60, ISLAND.coneR * 2));
  batchAddGeometry(f, new THREE.CylinderGeometry(0.16, 0.5, 1, 14), SCRATCH.m, 0x3d3937);
  addCollider(ISLAND.coneX - 30, ISLAND.coneZ - 30, ISLAND.coneX + 30, ISLAND.coneZ + 30, 60);
  const ember = new THREE.Mesh(unitGeometry('sphere'), new THREE.MeshBasicMaterial({ color: 0xff7a2e, toneMapped: false }));
  ember.scale.set(15, 5, 15);
  ember.position.set(ISLAND.coneX, 59.5, ISLAND.coneZ);
  W.scene.add(ember);
  for (let i = 0; i < 9; i++) {
    const s = 12 + i * 5.5;
    SCRATCH.m.compose(SCRATCH.p.set(ISLAND.coneX + i * 9, 70 + i * 15, ISLAND.coneZ + i * 3), SCRATCH.q.identity(), SCRATCH.s.set(s, s * 0.8, s));
    batchAddGeometry(f, unitGeometry('sphere'), SCRATCH.m, i < 2 ? 0x8a6a5a : 0x7d7873);
  }
  for (let i = 0; i < 26; i++) {
    const a = randRange(0, 6.28), r = randRange(20, ISLAND.r - 8), x = ISLAND.x + Math.cos(a) * r, z = ISLAND.z + Math.sin(a) * r;
    if (Math.abs(z - FLYOVER.z) < 16 || dist2d(x, z, ISLAND.coneX, ISLAND.coneZ) < ISLAND.coneR + 4 || dist2d(x, z, PLACES.ashDealer.x, PLACES.ashDealer.z) < 16) continue;
    if (i % 3 === 0) {
      batchAddBeam(f, x, 0, z, x + 0.6, 5, z + 0.3, 0.3, 0x2b2623);
      batchAddBeam(f, x + 0.3, 3, z + 0.15, x + 1.8, 4.6, z - 0.6, 0.16, 0x2b2623);
    } else if (i % 3 === 1) {
      SCRATCH.m.compose(SCRATCH.p.set(x, 0.6, z), SCRATCH.q.identity(), SCRATCH.s.set(randRange(2, 4.5), randRange(1.6, 3), randRange(2, 4.5)));
      batchAddGeometry(f, unitGeometry('sphere'), SCRATCH.m, 0x3a3634);
      addCollider(x - 1, z - 1, x + 1, z + 1, 2);
    } else paintStrip(ctx.paint, x, z, 1, 0, randRange(2, 5), randRange(0.5, 1.2), 0xff7a2e);
  }
  batchAddBox(f, 652, 2.1, -281, 9, 4.2, 6, 0x4a4039, 0);
  batchAddBox(f, 652, 4.4, -281, 10, 0.4, 7, 0x7a2f22, 0);
  addCollider(647.5, -284, 656.5, -278, 4.2);
  const sign = makeSignMesh('ASH ARMS', 6, 1.1, { bg: '#1b1b1b', fg: '#ff7a2e', size: 70, pxW: 512 });
  sign.position.set(652, 3.3, -284.1);
  sign.rotation.y = Math.PI;
  W.scene.add(sign);
}

function buildFlyoverAndRedBridge(ctx) {
  const f = ctx.flat, fz = FLYOVER.z, h = FLYOVER.height, hw = FLYOVER.half + 1, grey = 0x6c6f76;
  const flat0 = FLYOVER.x0 + FLYOVER.rampLen, flat1 = FLYOVER.x1 - FLYOVER.rampLen;
  batchAddBox(f, (flat0 + flat1) / 2, h - 0.6, fz, flat1 - flat0, 1.2, hw * 2, grey, 0);
  for (const r of [[FLYOVER.x0, flat0, 0.02, h], [flat1, FLYOVER.x1, h, 0.02]]) {
    batchAddQuad(f, [r[0], r[2], fz - hw], [r[0], r[2], fz + hw], [r[1], r[3], fz + hw], [r[1], r[3], fz - hw], grey);
    batchAddQuad(f, [r[0], 0, fz + hw], [r[1], 0, fz + hw], [r[1], r[3], fz + hw], [r[0], r[2], fz + hw], shadeColor(grey, 0.85));
    batchAddQuad(f, [r[1], 0, fz - hw], [r[0], 0, fz - hw], [r[0], r[2], fz - hw], [r[1], r[3], fz - hw], shadeColor(grey, 0.85));
    for (const s of [-1, 1]) batchAddBeam(f, r[0], r[2] + 0.5, fz + s * (hw - 0.2), r[1], r[3] + 0.5, fz + s * (hw - 0.2), 0.4, 0xe9e4d6);
  }
  for (const s of [-1, 1]) {
    batchAddBox(f, (flat0 + flat1) / 2, h + 0.5, fz + s * (hw - 0.2), flat1 - flat0, 1.0, 0.4, 0xe9e4d6, 0);
    addCollider(FLYOVER.x0 + 6, fz + s * (hw + 0.1) - 0.4, FLYOVER.x1 - 2, fz + s * (hw + 0.1) + 0.4, 2);
  }
  for (const off of [-0.22, 0.22]) paintStrip(ctx.paint, (flat0 + flat1) / 2, fz + off, 1, 0, flat1 - flat0, 0.16, 0xf2c230, h + 0.03);
  for (let x = flat0 + 4; x < flat1 - 4; x += 8) for (const off of [-4.5, 4.5]) paintStrip(ctx.paint, x, fz + off, 1, 0, 3, 0.16, 0xe9e4d6, h + 0.03);
  for (let x = flat0 + 14; x < LAND.x1 - 6; x += 36) {
    for (const s of [-1, 1]) batchAddBox(f, x, (h - 1.2) / 2, fz + s * 6, 1.7, h - 1.2, 1.7, 0x8b8e94, 0);
    batchAddBox(f, x, h - 1.7, fz, 2.2, 1.0, 17, 0x8b8e94, 0);
  }
  // The red cable-stayed bridge to Pulau Abu.
  const red = 0xd9342b;
  for (const px of [452, 536]) {
    for (const s of [-1, 1]) batchAddBeam(f, px, -2, fz + s * 12.5, px, 52, fz + s * 2.2, 2.0, red);
    batchAddBox(f, px, 52, fz, 2.4, 3, 7, red, 0);
    batchAddBox(f, px, 5.4, fz, 2.0, 1.6, 24, red, 0);
    batchAddBox(f, px, 30, fz, 1.6, 1.2, 13, red, 0);
    for (let k = 1; k <= 5; k++) {
      for (const dir of [-1, 1]) for (const s of [-1, 1]) batchAddBeam(f, px, 50 - k * 2.4, fz + s * 2.6, px + dir * k * 8.2, h + 0.9, fz + s * (hw - 0.3), 0.22, 0xf5efe4);
    }
  }
  const gantry = makeSignMesh('TOL LAYANG|PULAU ABU', 13, 3, { bg: '#1e7b46', fg: '#ffffff', size: 60, pxW: 512, border: '#ffffff' });
  gantry.position.set(-312.3, 10.2, fz);
  gantry.rotation.y = -Math.PI / 2;
  W.scene.add(gantry);
  for (const s of [-1, 1]) batchAddBox(f, -312, 5.8, fz + s * (hw + 0.9), 0.5, 11.6, 0.5, 0x3c4a52, 0);
  batchAddBox(f, -312, 10.2, fz, 0.4, 3.4, hw * 2 + 2, 0x3c4a52, 0);
}

function buildStreetProps(ctx) {
  const f = ctx.flat;
  W.parkSpots = [];
  for (let a = 0; a < W.nodes.length; a++) {
    for (const bi of W.nodes[a].links) {
      const A = W.nodes[a], B = W.nodes[bi];
      if (bi < a || A.ramp || B.ramp) continue;
      const len = dist2d(A.x, A.z, B.x, B.z), dx = (B.x - A.x) / len, dz = (B.z - A.z) / len, hw = roadHalfWidth(A, B);
      const rx = -dz, rz = dx, market = Math.abs(A.x + 240) < 1 && Math.abs(B.x + 240) < 1 && A.z > -130 && B.z < 130;
      const beach = hw > 10;
      for (let s = 16, n = 0; s < len - 14; s += 17, n++) {
        const side = n % 2 ? 1 : -1;
        if (beach && side > 0) continue;
        const x = A.x + dx * s + rx * side * (hw + 0.75), z = A.z + dz * s + rz * side * (hw + 0.75);
        addStreetLamp(f, x, z, Math.atan2(-rx * side, -rz * side));
        addCollider(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 7);
      }
      if (!market) {
        for (let s = 20; s < len - 20; s += randRange(13, 24)) {
          const side = rand() < 0.5 ? 1 : -1, kind = randPick(['bench', 'bin', 'hydrant', 'planter', 'bin', 'planter']);
          if (beach && side > 0) continue;
          const x = A.x + dx * s + rx * side * (hw + 1.7), z = A.z + dz * s + rz * side * (hw + 1.7);
          if (pointBlocked(x, z, 0)) continue;
          if (kind === 'bench') addBench(f, x, z, Math.atan2(-rx * side, -rz * side)); else addHydrantBinPlanter(f, kind, x, z);
          const r = kind === 'planter' ? 0.8 : kind === 'bench' ? 0.7 : 0.3;
          addCollider(x - r, z - r, x + r, z + r, 1);
        }
      }
      if (!beach && rand() < 0.55) {
        for (let k = 0; k < 3; k++) {
          const s = randRange(24, len - 24), dir = rand() < 0.5 ? 1 : -1;
          W.parkSpots.push({ x: A.x + dx * s - rx * dir * (hw - 1.15), z: A.z + dz * s - rz * dir * (hw - 1.15), heading: Math.atan2(dx * dir, dz * dir), scooter: market });
        }
      }
    }
  }
  for (const stop of BUS_STOPS) {
    addBusStop(f, stop[0], stop[1], stop[2]);
    addCollider(stop[0] - 1.6, stop[1] - 1.6, stop[0] + 1.6, stop[1] + 1.6, 2.6);
  }
  // Billboards with invented brands on a few corners.
  BILLBOARDS.forEach((b, i) => {
    batchAddBox(f, b[0], 4.5, b[1], 0.5, 9, 0.5, 0x3c4a52, 0);
    const alongX = Math.abs(Math.cos(b[2])) > 0.5;
    batchAddBox(f, b[0], 10.5, b[1], alongX ? 11 : 0.5, 4.6, alongX ? 0.5 : 11, 0x22282d, 0);
    const style = SIGN_STYLES[i % SIGN_STYLES.length];
    const sign = makeSignMesh(b[3], 10.4, 4, { bg: style[0], fg: style[1], size: 90, pxW: 512, border: style[1] });
    sign.position.set(b[0] + Math.sin(b[2]) * 0.3, 10.5, b[1] + Math.cos(b[2]) * 0.3);
    sign.rotation.y = b[2];
    W.scene.add(sign);
    addCollider(b[0] - 0.4, b[1] - 0.4, b[0] + 0.4, b[1] + 0.4, 9);
  });
}

// ---- collision map, ground height and routing -------------------------------------------------

function addCollider(x0, z0, x1, z1, h) {
  const c = { x0: x0, z0: z0, x1: x1, z1: z1, h: h };
  W.colliders.push(c);
  if (W.colliderGrid.size) registerCollider(c);
  return c;
}

function registerCollider(c) {
  for (let cx = Math.floor((c.x0 - 4) / 20); cx <= Math.floor((c.x1 + 4) / 20); cx++) {
    for (let cz = Math.floor((c.z0 - 4) / 20); cz <= Math.floor((c.z1 + 4) / 20); cz++) {
      const key = (cx + 500) * 4096 + (cz + 500);
      if (!W.colliderGrid.has(key)) W.colliderGrid.set(key, []);
      W.colliderGrid.get(key).push(c);
    }
  }
}

function buildColliderGrid() {
  W.colliderGrid.clear();
  W.colliderGrid.set(-1, []);
  for (const c of W.colliders) registerCollider(c);
}

function collidersAt(x, z) {
  return W.colliderGrid.get((Math.floor(x / 20) + 500) * 4096 + (Math.floor(z / 20) + 500)) || NO_COLLIDERS;
}

function pointBlocked(x, z, minHeight) {
  const list = W.colliderGrid.size ? collidersAt(x, z) : W.colliders, mh = minHeight || 0;
  for (const c of list) if (c.h > mh && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return true;
  return false;
}

function pushOutOfColliders(x, z, r) {
  const out = { x: x, z: z, hit: false, nx: 0, nz: 0 };
  for (const c of collidersAt(x, z)) {
    const px = clamp(out.x, c.x0, c.x1), pz = clamp(out.z, c.z0, c.z1);
    let dx = out.x - px, dz = out.z - pz;
    const d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d > 0.0001) { dx /= d; dz /= d; out.x = px + dx * r; out.z = pz + dz * r; }
    else {
      const l = out.x - c.x0, rr = c.x1 - out.x, t = out.z - c.z0, b = c.z1 - out.z, m = Math.min(l, rr, t, b);
      dx = m === l ? -1 : m === rr ? 1 : 0; dz = m === t ? -1 : m === b ? 1 : 0;
      if (dx) { dz = 0; out.x = dx < 0 ? c.x0 - r : c.x1 + r; } else out.z = dz < 0 ? c.z0 - r : c.z1 + r;
    }
    out.hit = true; out.nx = dx; out.nz = dz;
  }
  return out;
}

// Line of sight: only things taller than a person block the view.
function segmentBlocked(ax, az, bx, bz) {
  const len = dist2d(ax, az, bx, bz), steps = Math.ceil(len / 2.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(lerp(ax, bx, t), lerp(az, bz, t), 2.5)) return true;
  }
  return false;
}

function groundHeightAt(x, z) {
  if (Math.abs(z - FLYOVER.z) <= FLYOVER.half + 1.2 && x > FLYOVER.x0 && x < FLYOVER.x1) {
    const up = (x - FLYOVER.x0) / FLYOVER.rampLen, down = (FLYOVER.x1 - x) / FLYOVER.rampLen;
    return FLYOVER.height * clamp(Math.min(up, down), 0, 1);
  }
  if (x > 560) return 0;
  if (z > 281 && z < 287.5) return 0.16;
  if (z >= 287.5) return Math.abs(x - LAND.pierX) < 3.5 && z < LAND.pierZ1 ? 0.45 : lerp(0.02, -1.0, clamp((z - 287.5) / 52, 0, 1));
  for (const b of W.blocks) if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return 0.16;
  return 0;
}

function isLandAt(x, z) {
  if (x >= LAND.x0 && x <= LAND.x1 && z >= LAND.z0 && z <= LAND.beachZ) return true;
  if (Math.abs(x - LAND.pierX) < 3.5 && z > 280 && z < LAND.pierZ1) return true;
  if (dist2d(x, z, ISLAND.x, ISLAND.z) < ISLAND.r) return true;
  return Math.abs(z - FLYOVER.z) <= FLYOVER.half + 1.2 && x > FLYOVER.x0 && x < FLYOVER.x1;
}

function nearestNodeIndex(x, z) {
  let best = 0, bestD = 1e9;
  W.nodes.forEach((n, i) => { const d = dist2d(x, z, n.x, n.z); if (d < bestD) { bestD = d; best = i; } });
  return best;
}

// Shortest path over the road graph, used for the minimap route line and by pursuing units.
function findRoute(ax, az, bx, bz) {
  const start = nearestNodeIndex(ax, az), goal = nearestNodeIndex(bx, bz);
  const dist = W.nodes.map(() => 1e9), prev = W.nodes.map(() => -1), done = W.nodes.map(() => false);
  dist[start] = 0;
  for (let step = 0; step < W.nodes.length; step++) {
    let u = -1;
    for (let i = 0; i < W.nodes.length; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (const v of W.nodes[u].links) {
      const nd = dist[u] + dist2d(W.nodes[u].x, W.nodes[u].z, W.nodes[v].x, W.nodes[v].z);
      if (nd < dist[v]) { dist[v] = nd; prev[v] = u; }
    }
  }
  const points = [{ x: bx, z: bz }];
  for (let n = goal; n >= 0; n = prev[n]) points.unshift({ x: W.nodes[n].x, z: W.nodes[n].z });
  points.unshift({ x: ax, z: az });
  return points;
}

const NO_COLLIDERS = [];
const DISTRICT_STYLE = {
  pelabuhan: { nx: 2, nz: 2, floors: [2, 3], colors: [0xb96a45, 0xd9c7a3, 0x8fa3b0, 0x6f8fa8, 0xc9b28a], awnings: false, signs: 0.2 },
  pasar: { nx: 3, nz: 3, floors: [1, 3], colors: [0xffb38a, 0xffd98a, 0xf7a1a1, 0xa8e0c8, 0xf5e6c8, 0xe9b8d8, 0xb9d9f0], awnings: true, signs: 0.6 },
  neon: { nx: 2, nz: 2, floors: [11, 24], colors: [0x7fb2e0, 0x8fd0c8, 0xf0c9a0, 0xff9e8a, 0xb7a6e8, 0xe6e0d2, 0x6fa0c8, 0xf2d27a], awnings: true, signs: 0.25, roofSigns: true },
  pantai: { nx: 3, nz: 2, floors: [3, 8], colors: [0xff9e8a, 0x8fe0c9, 0xffd27a, 0xf7a8c8, 0x8fd0f0, 0xfff1d6, 0xffb870], awnings: true, signs: 0.7 },
  layang: { nx: 3, nz: 1, floors: [4, 10], colors: [0xd9cdb8, 0xa8c8d8, 0xe0b090, 0xb8d8b0, 0xc8b8d8], awnings: false, signs: 0.3 },
  abu: { nx: 1, nz: 1, floors: [1, 1], colors: [0x4a4039], awnings: false, signs: 0 }
};
const SHOP_NAMES = ['WARUNG BU TINI', 'KOPI OMBAK', 'ES KELAPA JAYA', 'ARUNIKA TELECOM', 'HOTEL NUSA', 'TOKO SINAR', 'BAKSO PAK DE', 'SATE SENJA', 'APOTEK SEHAT', 'BATIK LARAS', 'MIE AYAM 88', 'SALON MELATI', 'TOKO EMAS RAJA', 'RUMAH MAKAN PADI', 'LAUNDRY KILAT', 'KEDAI TEH POCI'];
const ROOF_BRANDS = ['ARUNIKA TELECOM', 'NUSA AIR', 'KOPI OMBAK', 'BANK ARUNIKA', 'SINAR TV', 'GARUDA OIL'];
const SIGN_STYLES = [['#c92a2a', '#fff3bf'], ['#0b7285', '#ffffff'], ['#f59f00', '#1b1b1b'], ['#5f3dc4', '#ffffff'], ['#2b8a3e', '#fff9db'], ['#e64980', '#ffffff'], ['#1c1f26', '#ffd43b']];
const BUS_STOPS = [[130, -66, -1.5708], [-230, -180, -1.5708], [-130, 180, 1.5708], [60, 129.6, 3.1416], [250, 190, -1.5708]];
const BILLBOARDS = [[-126, 262, 0, 'ES KELAPA JAYA'], [116, 262, 0, 'KOPI OMBAK'], [236, 262, 0, 'HOTEL NUSA'], [-352, 6, 1.5708, 'ARUNIKA TELECOM'], [112, -116, -1.5708, 'NUSA AIR'], [-6, 126, 0, 'SINAR TV'], [352, -236, -1.5708, 'GARUDA OIL']];
