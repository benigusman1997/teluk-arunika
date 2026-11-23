// Player car physics: arcade driving, handbrake drift, collisions, damage and condition.

function driveVehicleWithArcadePhysics(car, throttle, steer, handbrake, dt) {
  const spec = car.spec;
  let top = (spec.top / 3.6) * car.boost * (car.tyresOut ? 0.45 : 1);
  if (car.hp < 35) top *= 0.75;
  const sp = Math.abs(car.speed);
  if (throttle > 0) {
    if (car.speed < top) car.speed += spec.accel * throttle * car.boost * dt * (1.15 - 0.75 * clamp(car.speed / top, 0, 1));
  } else if (throttle < 0) {
    if (car.speed > 1) car.speed -= 24 * dt;
    else if (car.speed > -top * 0.3) car.speed -= spec.accel * 0.7 * dt;
  }
  car.speed -= car.speed * (throttle === 0 ? 0.55 : 0.12) * dt;
  if (car.speed > top) car.speed -= (car.speed - top) * 2.5 * dt;
  car.steer = lerp(car.steer, steer, 1 - Math.exp(-dt * 9));
  const grip = spec.grip * car.gripBonus * (G.weather === 'rain' ? 0.82 : 1);
  const turn = car.steer * (2.5 / (1 + sp * 0.05)) * clamp(sp / 3.5, 0, 1) * (car.speed < 0 ? -1 : 1) * grip;
  car.heading -= turn * dt;
  applyHandbrakeDrift(car, handbrake, grip, dt);
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  car.x += (fx * car.speed - fz * car.slip) * dt;
  car.z += (fz * car.speed + fx * car.slip) * dt;
  // Jumps off stunt ramps and the flyover edge: simple ballistic height.
  const ground = groundHeightAt(car.x, car.z);
  if (car.y > ground + 0.05 || car.vy > 0) {
    car.vy -= 22 * dt;
    car.y += car.vy * dt;
    if (car.y <= ground) { if (car.vy < -9) damageVehicleOnCollision(car, -car.vy * 0.8, null); car.y = ground; car.vy = 0; }
  } else car.y = ground;
}

function applyHandbrakeDrift(car, handbrake, grip, dt) {
  const sp = Math.abs(car.speed);
  car.drifting = false;
  if (handbrake && sp > 5) {
    car.speed -= Math.sign(car.speed) * 10 * dt;
    car.slip = lerp(car.slip, -car.steer * sp * 0.5, 1 - Math.exp(-dt * 4));
    car.heading -= car.steer * 1.3 * dt;
    car.drifting = Math.abs(car.steer) > 0.2;
  } else {
    car.slip *= Math.exp(-dt * 4.5 * grip);
    if (sp > 22 && Math.abs(car.steer) > 0.75) { car.slip -= car.steer * sp * 0.08 * dt * 8; car.drifting = sp > 30; }
  }
}

function damageVehicleOnCollision(car, impactSpeed, other) {
  if (car.wrecked || impactSpeed < 3.5) return;
  const plating = car === G.player.car ? 1 - 0.2 * G.upgrades.armour : 1;
  car.hp -= (impactSpeed - 3) * 1.5 * plating * (car.kind === 'traffic' ? 1.6 : 1);
  spawnSparks(car.x + Math.sin(car.heading) * car.spec.len * 0.4, car.y + 0.6, car.z + Math.cos(car.heading) * car.spec.len * 0.4, Math.min(10, 3 + impactSpeed * 0.4));
  playCrashSound(impactSpeed);
  if (car === G.player.car) {
    addCameraShake(Math.min(0.6, impactSpeed * 0.03));
    if (other && other.kind === 'traffic' && impactSpeed > 9) reportCrime(1, 'HIT AND RUN');
  }
  if (car.hp <= 0) explodeCar(car, car === G.player.car ? null : G.player.car === other ? 'player' : null);
}

function updatePlayerDriving(dt) {
  const car = G.player.car;
  const throttle = (W.keys.KeyW || W.keys.ArrowUp ? 1 : 0) - (W.keys.KeyS || W.keys.ArrowDown ? 1 : 0);
  const steer = (W.keys.KeyD || W.keys.ArrowRight ? 1 : 0) - (W.keys.KeyA || W.keys.ArrowLeft ? 1 : 0);
  car.boost = (1 + 0.12 * G.upgrades.engine) * (G.crew.sari.active > 0 ? 1.45 : 1);
  car.gripBonus = 1 + 0.1 * G.upgrades.tyres;
  const before = { x: car.x, z: car.z };
  driveVehicleWithArcadePhysics(car, car.wrecked ? 0 : throttle, steer, !!W.keys.Space, dt);
  resolveCarAgainstWorld(car);
  resolveCarAgainstCars(car);
  G.stats.distance += dist2d(before.x, before.z, car.x, car.z);
  G.stats.topSpeed = Math.max(G.stats.topSpeed, Math.abs(car.speed) * 3.6);
  if ((car.drifting || (throttle > 0 && car.speed < 8 && car.speed > 0.5)) && G.frame % 3 === 0) spawnTyreSmoke(car);
  if (W.keysHit.KeyH) playHorn();
  if (W.keysHit.KeyV) cycleCameraMode();
  if (!isLandAt(car.x, car.z) && car.y < 1) sinkPlayerInWater();
  G.player.x = car.x; G.player.z = car.z; G.player.y = car.y; G.player.heading = car.heading;
}

function spawnCar(modelId, x, z, heading, kind, colorHex) {
  const spec = CAR_MODELS[modelId];
  const color = colorHex === undefined ? randPick(spec.colors) : colorHex;
  const mesh = modelId === 'cruiser' ? makePoliceCruiserMesh() : modelId === 'badak' ? makeSwatVanMesh() : makeCarMesh(modelId, color);
  const car = {
    id: W.nextId++, model: modelId, spec: spec, mesh: mesh, color: color, kind: kind,
    x: x, z: z, y: groundHeightAt(x, z), vy: 0, heading: heading, speed: 0, slip: 0, steer: 0,
    kx: 0, kz: 0, hp: spec.hp, boost: 1, gripBonus: 1, tyresOut: false, drifting: false, wrecked: false,
    occupied: kind !== 'parked', siren: false, alarm: 0, ai: null, name: '', stuck: 0, fire: 0, doorOpen: 0
  };
  W.scene.add(mesh);
  W.cars.push(car);
  updateCarMesh(car, 0);
  return car;
}

function removeCar(car) {
  W.scene.remove(car.mesh);
  const i = W.cars.indexOf(car);
  if (i >= 0) W.cars.splice(i, 1);
  car.removed = true;
}

function resolveCarAgainstWorld(car) {
  if (car.y > groundHeightAt(car.x, car.z) + 1.2) return;
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), r = car.spec.wid * 0.56, reach = car.spec.len * 0.3;
  for (const end of [1, -1]) {
    const px = car.x + fx * reach * end, pz = car.z + fz * reach * end;
    const out = pushOutOfColliders(px, pz, r);
    if (!out.hit) continue;
    car.x += out.x - px; car.z += out.z - pz;
    const into = -(fx * out.nx + fz * out.nz) * car.speed;
    if (into > 0.5) {
      damageVehicleOnCollision(car, into, null);
      car.speed *= into > 6 ? 0.25 : 0.7;
      // Glance off the wall instead of sticking to it.
      const side = fx * out.nz - fz * out.nx;
      car.heading += clamp(side, -1, 1) * 0.06 * end;
    }
  }
}

function resolveCarAgainstCars(car) {
  const ra = car.spec.len * 0.42;
  for (const other of W.cars) {
    if (other === car || Math.abs(other.y - car.y) > 2.5) continue;
    const rb = other.spec.len * 0.42, dx = other.x - car.x, dz = other.z - car.z, d = Math.hypot(dx, dz);
    if (d >= ra + rb || d < 0.001) continue;
    const nx = dx / d, nz = dz / d, overlap = ra + rb - d;
    const ma = car.spec.hp, mb = other.spec.hp * (other.wrecked ? 2 : 1), share = mb / (ma + mb);
    car.x -= nx * overlap * share; car.z -= nz * overlap * share;
    other.x += nx * overlap * (1 - share); other.z += nz * overlap * (1 - share);
    const va = Math.sin(car.heading) * car.speed * nx + Math.cos(car.heading) * car.speed * nz;
    const vb = Math.sin(other.heading) * other.speed * nx + Math.cos(other.heading) * other.speed * nz;
    const closing = va - vb;
    if (closing <= 0.5) continue;
    damageVehicleOnCollision(car, closing * (1 - share) * 1.6, other);
    damageVehicleOnCollision(other, closing * share * 1.6, car);
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), closing * (1 - share) * 0.8);
    other.kx += nx * closing * share * 0.9; other.kz += nz * closing * share * 0.9;
    if (other.ai) other.ai.shoved = 1.5;
  }
}

function explodeCar(car, creditedTo) {
  if (car.wrecked) return;
  car.wrecked = true;
  car.hp = 0; car.speed *= 0.3; car.siren = false; car.fire = 14;
  spawnExplosion(car.x, car.y + 0.8, car.z, 1.3);
  car.mesh.children[0].material = W.mat.wreck || (W.mat.wreck = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x3a3632 }));
  if (car.mesh.userData.lightbar) flashLightBar(car.mesh.userData.lightbar, 0, false);
  const wasPolice = car.kind === 'police' || car.kind === 'swat' || car.kind === 'roadblock';
  if (car === G.player.car) hurtPlayer(200, 'explosion');
  else if (dist2d(car.x, car.z, playerPosition().x, playerPosition().z) < 7) hurtPlayer(45, 'explosion');
  if (creditedTo === 'player' || wasPolice || car.kind === 'target' || car.kind === 'convoy') {
    G.stats.wrecks++;
    if (wasPolice) { reportCrime(1, 'OFFICER DOWN'); awardRankPoints(8, 'Cruiser wrecked'); }
  }
  for (const other of W.cars) if (other !== car && !other.wrecked && dist2d(car.x, car.z, other.x, other.z) < 6) other.hp -= 35;
  car.kind = 'wreck';
  car.occupied = false;
  car.ai = null;
}

function sinkPlayerInWater() {
  spawnSplash(G.player.car ? G.player.car.x : G.player.x, G.player.car ? G.player.car.z : G.player.z);
  if (G.player.car) { const car = G.player.car; G.player.car = null; G.player.onFoot = true; removeCar(car); }
  hurtPlayer(200, 'drowned');
}

function updateCarMesh(car, dt) {
  const m = car.mesh;
  if (car.kx || car.kz) {
    car.x += car.kx * dt; car.z += car.kz * dt;
    const k = Math.exp(-dt * 3.2);
    car.kx *= k; car.kz *= k;
    if (Math.abs(car.kx) + Math.abs(car.kz) < 0.05) car.kx = car.kz = 0;
  }
  m.position.set(car.x, car.y, car.z);
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading), half = car.spec.len * 0.4;
  const pitch = car.y > 0.3 ? Math.atan2(groundHeightAt(car.x - fx * half, car.z - fz * half) - groundHeightAt(car.x + fx * half, car.z + fz * half), half * 2) : 0;
  m.rotation.set(pitch + (car.vy ? -car.vy * 0.012 : 0), car.heading, clamp(car.slip * 0.018 + car.steer * Math.abs(car.speed) * 0.0022, -0.12, 0.12), 'YXZ');
  if (m.userData.lightbar && !car.wrecked) flashLightBar(m.userData.lightbar, G.time + car.id * 0.37, car.siren);
  if (m.userData.door) m.userData.door.rotation.y = -car.doorOpen * 1.15;
  if (car.wrecked && car.fire > 0) {
    car.fire -= dt;
    if (G.frame % 5 === car.id % 5) spawnFireAndSmoke(car.x, car.y + 1.0, car.z, car.fire > 4 ? 1 : 0.5);
  } else if (!car.wrecked && car.hp < car.spec.hp * 0.4 && G.frame % 9 === car.id % 9) spawnSmokePuff(car.x + fx * half, car.y + 1.0, car.z + fz * half, 0.5, 0x555555);
  if (car.alarm > 0) car.alarm -= dt;
}

function updateAllCars(dt) {
  for (let i = W.cars.length - 1; i >= 0; i--) {
    const car = W.cars[i];
    if (!car.wrecked && car.hp <= 0) explodeCar(car, null);
    if (car.kind === 'wreck' && car.fire <= 0 && dist2d(car.x, car.z, G.player.x, G.player.z) > 160 && !car.keep) { removeCar(car); continue; }
    updateCarMesh(car, dt);
  }
}
