// Roadblocks ("BLOKIR nn") with striped barriers and parked cruisers, plus spike strips.

function placeRoadblockAhead() {
  const p = playerPosition();
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  const alongX = Math.abs(fx) > Math.abs(fz);
  let x = p.x + fx * 230, z = p.z + fz * 230;
  // Snap onto the centre line of the road Raka is driving along.
  if (alongX) z = ROAD_ZS.reduce((best, rz) => (Math.abs(rz - p.z) < Math.abs(best - p.z) ? rz : best), ROAD_ZS[0]);
  else x = ROAD_XS.reduce((best, rx) => (Math.abs(rx - p.x) < Math.abs(best - p.x) ? rx : best), ROAD_XS[0]);
  x = clamp(x, ROAD_XS[0] + 20, ROAD_XS[6] - 20);
  z = clamp(z, ROAD_ZS[0] + 20, ROAD_ZS[4]);
  if (dist2d(x, z, p.x, p.z) < 90) return null;
  return buildRoadblockAt(x, z, alongX ? Math.sign(fx) : 0, alongX ? 0 : Math.sign(fz));
}

function deploySpikeStrips(block, distanceBefore) {
  const hw = Math.abs(block.dz) > 0.5 ? 8 : Math.abs(block.z - 270) < 1 ? 11 : 8;
  const batch = createGeometryBatch();
  batchAddBox(batch, 0, 0.05, 0, hw * 2 - 1.5, 0.06, 0.7, 0x23262b, 0);
  for (let i = -hw + 1.2; i < hw - 1; i += 0.45) batchAddBox(batch, i, 0.13, 0, 0.08, 0.16, 0.08, 0xc9ced6, 0.78);
  const mesh = batchToMesh(batch, sharedMaterial('flat'), false, true);
  const sx = block.x - block.dx * distanceBefore, sz = block.z - block.dz * distanceBefore;
  mesh.position.set(sx, groundHeightAt(sx, sz), sz);
  mesh.rotation.y = Math.abs(block.dx) > 0.5 ? Math.PI / 2 : 0;
  W.scene.add(mesh);
  block.spikes = { x: sx, z: sz, mesh: mesh, half: hw - 0.8, used: false };
  return block.spikes;
}

function buildRoadblockAt(x, z, dx, dz) {
  W.blockSerial = (W.blockSerial || 2) + 1;
  const block = { x: x, z: z, dx: dx, dz: dz, cars: [], barriers: [], spikes: null, name: 'BLOKIR ' + (W.blockSerial < 10 ? '0' : '') + W.blockSerial, passed: false };
  const rx = -dz, rz = dx, across = Math.atan2(rx, rz);
  for (const side of [-1, 1]) {
    const car = spawnCar('cruiser', x + rx * side * 3.4, z + rz * side * 3.4, across + (side > 0 ? 0.25 : Math.PI - 0.25), 'roadblock');
    car.siren = true; car.keep = true; car.name = block.name;
    block.cars.push(car);
  }
  const hw = Math.abs(dz) > 0.5 ? 8 : Math.abs(z - 270) < 1 ? 11 : 8;
  for (const off of [-hw + 1.4, 0, hw - 1.4]) {
    const mesh = makeBarrierMesh();
    const bx = x - dx * 4.5 + rx * off, bz = z - dz * 4.5 + rz * off;
    mesh.position.set(bx, 0, bz);
    mesh.rotation.y = across;
    W.scene.add(mesh);
    block.barriers.push({ mesh: mesh, x: bx, z: bz, vx: 0, vz: 0, vy: 0, spin: 0, broken: false });
  }
  deploySpikeStrips(block, 16);
  block.unit = { kind: 'roadblock', name: block.name, role: 'ROADBLOCK AHEAD', car: null, person: null, x: x, z: z, dist: 0 };
  W.units.push(block.unit);
  W.roadblocks.push(block);
  return block;
}

function makeBarrierMesh() {
  const batch = createGeometryBatch();
  for (let i = 0; i < 6; i++) batchAddBox(batch, -1.25 + i * 0.5, 0.95, 0, 0.5, 0.36, 0.1, i % 2 ? 0xf1ece0 : 0xe03131, 0);
  for (let i = 0; i < 6; i++) batchAddBox(batch, -1.25 + i * 0.5, 0.5, 0, 0.5, 0.2, 0.1, i % 2 ? 0xe03131 : 0xf1ece0, 0);
  for (const s of [-1.2, 1.2]) { batchAddBox(batch, s, 0.55, 0, 0.1, 1.1, 0.1, 0x30343a, 0); batchAddBox(batch, s, 0.05, 0, 0.12, 0.1, 0.9, 0x30343a, 0); }
  batchAddBox(batch, 0, 1.22, 0, 0.22, 0.16, 0.16, 0xffa51f, 0);
  return batchToMesh(batch, sharedMaterial('flat'), true, false);
}

function smashBarrier(barrier, vx, vz) {
  barrier.broken = true;
  barrier.vx = vx; barrier.vz = vz; barrier.vy = 5 + Math.abs(vx + vz) * 0.1;
  barrier.spin = (vx - vz) * 0.4 + 3;
  spawnSparks(barrier.x, 0.8, barrier.z, 8);
}

function updateRoadblocks(dt) {
  const p = playerPosition(), car = G.player.car;
  for (let i = W.roadblocks.length - 1; i >= 0; i--) {
    const block = W.roadblocks[i];
    for (const b of block.barriers) {
      if (!b.broken) {
        for (const c of W.cars) {
          if (Math.abs(c.speed) > 4 && dist2d(c.x, c.z, b.x, b.z) < c.spec.len * 0.45 + 0.9) {
            smashBarrier(b, Math.sin(c.heading) * c.speed * 0.8, Math.cos(c.heading) * c.speed * 0.8);
            c.speed *= 0.92;
            if (c === car) { addCameraShake(0.25); playCrashSound(8); reportCrime(1, 'ROADBLOCK RAMMED'); }
          }
        }
      } else if (b.mesh.position.y > 0.12 || b.vy > 0) {
        b.vy -= 20 * dt;
        b.x += b.vx * dt; b.z += b.vz * dt;
        b.mesh.position.set(b.x, Math.max(0.12, b.mesh.position.y + b.vy * dt), b.z);
        b.mesh.rotation.x += b.spin * dt; b.mesh.rotation.z += b.spin * 0.6 * dt;
        if (b.mesh.position.y <= 0.12) { b.vy = 0; b.vx = b.vz = 0; b.mesh.rotation.x = Math.PI / 2; }
      }
    }
    const s = block.spikes;
    if (s && !s.used && car && !car.tyresOut) {
      const along = (car.x - s.x) * block.dx + (car.z - s.z) * block.dz, side = (car.x - s.x) * -block.dz + (car.z - s.z) * block.dx;
      if (Math.abs(along) < 1.4 && Math.abs(side) < s.half && car.y < 0.5) {
        s.used = true; car.tyresOut = true;
        showBanner('TYRES SHREDDED', 'Spike strip - Budi can fix it (X)', 2.2);
        spawnSparks(car.x, 0.3, car.z, 12);
      }
    }
    const beyond = (p.x - block.x) * block.dx + (p.z - block.z) * block.dz;
    if (beyond > 6) block.passed = true;
    if (dist2d(p.x, p.z, block.x, block.z) > 330 || (block.passed && beyond > 130)) { removeRoadblock(block); W.roadblocks.splice(i, 1); }
  }
}

function removeRoadblock(block) {
  for (const b of block.barriers) W.scene.remove(b.mesh);
  if (block.spikes) W.scene.remove(block.spikes.mesh);
  for (const car of block.cars) if (!car.removed) removeCar(car);
  block.unit.gone = true;
}

function removeRoadblocks() {
  for (const block of W.roadblocks) removeRoadblock(block);
  W.roadblocks = [];
}
