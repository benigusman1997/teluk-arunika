// Cruiser pursuit tactics: PIT, ramming, flanking, box-in, roadblocks
// and spike strips, driven by each unit's role.

// Run every cruiser's tactic for its role, once per step.
function runCruiserPursuitTactics(dt) {
  const p = GAME.police;
  if (p.stars === 0) {
    return;
  }
  for (const unit of p.units) {
    if (unit.vehicle < 0 || !GAME.vehicles[unit.vehicle]) {
      continue;
    }
    const v = GAME.vehicles[unit.vehicle];
    if (unit.role === 'PIT') {
      attemptPitManeuver(unit, v, dt);
    } else if (unit.role === 'RAMMING') {
      ramPlayerVehicle(unit, v, dt);
    } else if (unit.role === 'FLANKING') {
      flankAndBoxInPlayer(unit, v, dt, 0.5);
    } else if (unit.role === 'BOX-IN') {
      flankAndBoxInPlayer(unit, v, dt, 1);
    } else if (unit.role === 'ROADBLOCK') {
      placeRoadblockAhead(unit, v, dt);
    } else if (unit.role === 'INTERCEPT') {
      tac_interceptPlayer(unit, v, dt);
    } else {
      tac_chasePlayer(unit, v, dt);
    }
    veh_syncMesh(unit.vehicle);
  }
}

// Steer a police vehicle toward a point with a capped turn rate.
function tac_steerToward(v, tx, tz, dt, topSpeed) {
  const want = Math.atan2(tx - v.x, tz - v.z);
  const diff = angleDifference(want, v.heading);
  v.heading += clampNumber(diff, -1.8 * dt, 1.8 * dt);
  const target = topSpeed / 3.6;
  if (v.speed < target) {
    v.speed += 9 * dt;
  } else {
    v.speed -= 4 * dt;
  }
  v.x += Math.sin(v.heading) * v.speed * dt;
  v.z += Math.cos(v.heading) * v.speed * dt;
  const fixed = collideWithBuildings(v.x, v.z, 1.6);
  v.x = fixed.x;
  v.z = fixed.z;
}

// Plain chase: follow the player's car or the player on foot.
function tac_chasePlayer(unit, v, dt) {
  tac_steerToward(v, GAME.player.x, GAME.player.z, dt, 190);
  if (unit.dist < 4 && GAME.player.vehicle >= 0) {
    ramPlayerVehicle(unit, v, dt);
  }
}

// Intercept: aim at a point ahead of the player's motion.
function tac_interceptPlayer(unit, v, dt) {
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  let tx = GAME.player.x;
  let tz = GAME.player.z;
  if (pv) {
    tx += Math.sin(pv.heading) * pv.speed * 2.2;
    tz += Math.cos(pv.heading) * pv.speed * 2.2;
  }
  tac_steerToward(v, tx, tz, dt, 235);
}

// PIT: pull alongside the player's rear wheel, then swing in.
function attemptPitManeuver(unit, v, dt) {
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!pv) {
    tac_chasePlayer(unit, v, dt);
    return;
  }
  const side = unit._pitSide || (unit._pitSide = taNextRandom() > 0.5 ? 1 : -1);
  const tx = pv.x + Math.cos(pv.heading) * side * 3.2 - Math.sin(pv.heading) * 2.5;
  const tz = pv.z - Math.sin(pv.heading) * side * 3.2 - Math.cos(pv.heading) * 2.5;
  tac_steerToward(v, tx, tz, dt, 200);
  if (unit.dist < 3.5) {
    const push = 2.2 * dt;
    pv.heading += side * push * 0.4;
    pv.speed *= (1 - 0.3 * dt);
    if (taNextRandom() < dt * 2) {
      damageVehicleOnCollision(pv, 12);
      GAME.ui.banner = 'PIT MANEUVER — HOLD ON';
    }
  }
}

// Ram the player's car from behind and shove it forward.
function ramPlayerVehicle(unit, v, dt) {
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!pv) {
    tac_chasePlayer(unit, v, dt);
    return;
  }
  tac_steerToward(v, pv.x - Math.sin(pv.heading) * 4, pv.z - Math.cos(pv.heading) * 4, dt, 205);
  if (unit.dist < 4) {
    pv.speed += 3 * dt;
    pv.x += Math.sin(pv.heading) * 1.2 * dt;
    pv.z += Math.cos(pv.heading) * 1.2 * dt;
    if (taNextRandom() < dt * 1.5) {
      damageVehicleOnCollision(pv, 10);
      if (typeof spawnSparks === 'function') {
        spawnSparks(pv.x, pv.z);
      }
    }
  }
}

// Flank to the player's side, or swing broadside to block the road.
function flankAndBoxInPlayer(unit, v, dt, strength) {
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!pv) {
    tac_chasePlayer(unit, v, dt);
    return;
  }
  const side = unit._flankSide || (unit._flankSide = taNextRandom() > 0.5 ? 1 : -1);
  const ahead = 8 + strength * 6;
  const tx = pv.x + Math.sin(pv.heading) * ahead + Math.cos(pv.heading) * side * 4;
  const tz = pv.z + Math.cos(pv.heading) * ahead - Math.sin(pv.heading) * side * 4;
  tac_steerToward(v, tx, tz, dt, 195);
  if (strength >= 1 && unit.dist < 14) {
    const want = pv.heading + Math.PI / 2;
    const diff = angleDifference(want, v.heading);
    v.heading += clampNumber(diff, -1.2 * dt, 1.2 * dt);
    v.speed = clampNumber(v.speed - 12 * dt, 0, v.speed);
  }
}

// Place a roadblock ahead of the player: two cruisers broadside,
// striped barriers, cones, and a spike strip on the seaward side.
function placeRoadblockAhead(unit, v, dt) {
  const p = GAME.police;
  if (p.roadblocks.length >= 2) {
    tac_chasePlayer(unit, v, dt);
    return;
  }
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  const hx = pv ? Math.sin(pv.heading) : 0;
  const hz = pv ? Math.cos(pv.heading) : 1;
  const bx = GAME.player.x + hx * 34;
  const bz = GAME.player.z + hz * 34;
  const rb = { x: bx, z: bz, mesh: new THREE.Group() };
  for (const side of [-1, 1]) {
    const cruiser = makePoliceCruiserMesh(30 + p.roadblocks.length * 2 + (side > 0 ? 1 : 0));
    cruiser.position.set(bx + Math.cos(pv ? pv.heading : 0) * side * 4, 0, bz - Math.sin(pv ? pv.heading : 0) * side * 4);
    cruiser.rotation.y = (pv ? pv.heading : 0) + Math.PI / 2;
    rb.mesh.add(cruiser);
  }
  for (const off of [-6, 0, 6]) {
    const barrier = makeRoadblockBarrier();
    barrier.position.set(bx + off, 0, bz);
    barrier.rotation.y = pv ? pv.heading : 0;
    rb.mesh.add(barrier);
  }
  WORLD.scene.add(rb.mesh);
  p.roadblocks.push(rb);
  unit.role = 'ROADBLOCK';
  unit.x = bx;
  unit.z = bz;
  unit.dist = 34;
  const spikes = msh_makeSpikeStrip();
  spikes.position.set(GAME.player.x + hx * 16, 0, GAME.player.z + hz * 16);
  spikes.rotation.y = pv ? pv.heading : 0;
  WORLD.scene.add(spikes);
  p._spikes = p._spikes || [];
  p._spikes.push({ x: GAME.player.x + hx * 16, z: GAME.player.z + hz * 16, mesh: spikes });
  GAME.ui.banner = 'ROADBLOCK AHEAD — BLOKIR 03';
}

// Deploy a spike strip across the player's lane.
function deploySpikeStrips(unit, v, dt) {
  const pv = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!pv) {
    return;
  }
  const p = GAME.police;
  p._spikes = p._spikes || [];
  if (p._spikes.length > 2) {
    return;
  }
  const sx = pv.x + Math.sin(pv.heading) * 18;
  const sz = pv.z + Math.cos(pv.heading) * 18;
  const strip = msh_makeSpikeStrip();
  strip.position.set(sx, 0, sz);
  strip.rotation.y = pv.heading;
  WORLD.scene.add(strip);
  p._spikes.push({ x: sx, z: sz, mesh: strip });
}

// Check whether the player's car has driven over a spike strip.
function tac_checkSpikes() {
  const p = GAME.police;
  if (!p._spikes || GAME.player.vehicle < 0) {
    return;
  }
  const v = GAME.vehicles[GAME.player.vehicle];
  for (const s of p._spikes) {
    if (distanceBetween(v.x, v.z, s.x, s.z) < 2.5) {
      burstTyreOnSpikes(v);
      WORLD.scene.remove(s.mesh);
      p._spikes.splice(p._spikes.indexOf(s), 1);
      return;
    }
  }
}

// Foot patrol officers sprint after the player on foot.
function sendFootPatrolChase(unit, dt) {
  const mesh = unit.mesh;
  if (!mesh) {
    return;
  }
  const dx = GAME.player.x - unit.x;
  const dz = GAME.player.z - unit.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  unit.x += (dx / d) * 6.5 * dt;
  unit.z += (dz / d) * 6.5 * dt;
  mesh.position.set(unit.x, 0, unit.z);
  mesh.rotation.y = Math.atan2(dx, dz);
  unit.dist = d;
  if (d < 1.6) {
    arrestOrKnockOutPlayer('arrested');
  }
}
