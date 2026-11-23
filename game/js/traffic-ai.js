// Ambient traffic: cars on lanes (left-hand traffic), traffic lights, honking, fleeing from gunfire.

function spawnTrafficCars(target) {
  const focus = playerPosition();
  let count = 0;
  for (let i = W.cars.length - 1; i >= 0; i--) {
    const car = W.cars[i];
    if (car.kind !== 'traffic') continue;
    if (dist2d(car.x, car.z, focus.x, focus.z) > 340) removeCar(car); else count++;
  }
  for (let tries = 0; tries < 6 && count < target; tries++) {
    const a = randInt(0, W.nodes.length - 1), A = W.nodes[a], b = randPick(A.links), B = W.nodes[b];
    const t = randRange(0.25, 0.75), x = lerp(A.x, B.x, t), z = lerp(A.z, B.z, t), d = dist2d(x, z, focus.x, focus.z);
    if (d > 300 || (d < 80 && G.mode === 'playing' && !W.showcase)) continue;
    if (spawnTrafficCarOnEdge(a, b, t, randPick(TRAFFIC_MIX))) count++;
  }
}

function driveTrafficAlongLanes(dt) {
  const player = playerPosition();
  for (const car of W.cars) {
    const ai = car.ai;
    if (car.kind !== 'traffic' || !ai || car.wrecked) continue;
    if (ai.shoved > 0) { ai.shoved -= dt; car.speed *= Math.exp(-dt * 2); continue; }
    if (ai.flee > 0) ai.flee -= dt;
    const A = W.nodes[ai.from], B = W.nodes[ai.to];
    const len = dist2d(A.x, A.z, B.x, B.z), dx = (B.x - A.x) / len, dz = (B.z - A.z) / len;
    const insetB = (B.ramp ? 3 : Math.abs(dx) > 0.5 ? B.hwx : B.hwz) + 1.5, insetA = (A.ramp ? 3 : Math.abs(dx) > 0.5 ? A.hwx : A.hwz) + 1.5;
    const s = (car.x - A.x) * dx + (car.z - A.z) * dz;
    if (s > len - insetB) {
      const options = B.links.filter((n) => n !== ai.from), back = ai.from;
      ai.from = ai.to;
      ai.to = options.length ? randPick(options) : back;
      ai.lane = randPick(roadHalfWidth(W.nodes[ai.from], W.nodes[ai.to]) > 10 ? [3.0, 7.6] : [2.1, 5.0]);
      continue;
    }
    const ahead = clamp(s + 7 + car.speed * 0.4, insetA + 3, len - insetB + 2);
    const tx = A.x + dx * ahead + dz * ai.lane, tz = A.z + dz * ahead - dx * ai.lane;
    const want = Math.atan2(tx - car.x, tz - car.z), diff = angleDiff(want, car.heading);
    car.heading += clamp(diff, -2.4 * dt, 2.4 * dt);
    let cruise = (roadHalfWidth(A, B) > 8.5 ? 15 : 11) * ai.pace * (ai.flee > 0 ? 1.9 : 1);
    if (Math.abs(diff) > 0.45) cruise = Math.min(cruise, 4.5);
    const toStop = len - insetB - 3 - s;
    if (ai.flee <= 0 && !B.ramp && toStop > -1 && toStop < 14 && trafficSignalIsRed(Math.abs(dx) < 0.5)) cruise = toStop < 2 ? 0 : Math.min(cruise, toStop * 0.8);
    // Brake for whatever is right ahead: another car, Raka, or a pedestrian crossing.
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    let blocked = false;
    for (const other of W.cars) {
      if (other === car) continue;
      const ox = other.x - car.x, oz = other.z - car.z, along = ox * fx + oz * fz;
      if (along > 0.5 && along < 9 + car.speed * 0.7 && Math.abs(ox * fz - oz * fx) < 2.0 && Math.abs(other.y - car.y) < 2) { blocked = true; cruise = Math.min(cruise, Math.max(0, (along - 6.5) * 1.2)); }
    }
    if (!G.player.car) {
      const ox = player.x - car.x, oz = player.z - car.z, along = ox * fx + oz * fz;
      if (along > 0.5 && along < 9 && Math.abs(ox * fz - oz * fx) < 1.8) { blocked = true; cruise = 0; }
    }
    if (blocked && car.speed < 0.5) {
      ai.wait += dt;
      if (ai.wait > 3 && dist2d(car.x, car.z, player.x, player.z) < 40) { ai.wait = -2; playHorn(0.35); }
    } else if (ai.wait > 0) ai.wait = 0;
    car.speed += clamp(cruise - car.speed, -16 * dt, 5.5 * dt);
    car.x += fx * car.speed * dt;
    car.z += fz * car.speed * dt;
    car.y = groundHeightAt(car.x, car.z);
    car.steer = clamp(diff, -1, 1);
  }
}

function updateTrafficLights(dt) {
  const tl = W.trafficLights;
  tl.phase = (tl.phase + dt) % 24;
  const p = tl.phase;
  tl.ns.material.color.setHex(p < 9 ? 0x35e06a : p < 11 ? 0xffc21a : 0xff3b30);
  tl.ew.material.color.setHex(p >= 12 && p < 21 ? 0x35e06a : p >= 21 && p < 23 ? 0xffc21a : 0xff3b30);
}

function trafficSignalIsRed(northSouth) {
  const p = W.trafficLights.phase;
  return northSouth ? p >= 9.5 : !(p >= 12 && p < 21.5);
}

function spawnTrafficCarOnEdge(a, b, t, model) {
  const A = W.nodes[a], B = W.nodes[b];
  const len = dist2d(A.x, A.z, B.x, B.z), dx = (B.x - A.x) / len, dz = (B.z - A.z) / len;
  const lane = randPick(roadHalfWidth(A, B) > 10 ? [3.0, 7.6] : [2.1, 5.0]);
  const x = lerp(A.x, B.x, t) + dz * lane, z = lerp(A.z, B.z, t) - dx * lane;
  for (const other of W.cars) if (dist2d(x, z, other.x, other.z) < 11) return null;
  const car = spawnCar(model, x, z, Math.atan2(dx, dz), 'traffic');
  car.ai = { from: a, to: b, lane: lane, pace: randRange(0.8, 1.15), flee: 0, shoved: 0, wait: 0 };
  car.speed = 8;
  return car;
}

function spawnParkedCars(limit) {
  let n = 0;
  for (const spot of W.parkSpots) {
    if (n >= limit) break;
    if (W.cars.some((c) => dist2d(c.x, c.z, spot.x, spot.z) < 7)) continue;
    const car = spawnCar(spot.scooter ? 'komet' : randPick(['sedan', 'sedan', 'gt', 'angkot', 'taxi']), spot.x, spot.z, spot.heading, 'parked');
    if (car.mesh.userData.rider) car.mesh.userData.rider.visible = false;
    n++;
  }
}

function alarmTrafficNear(x, z, radius) {
  for (const car of W.cars) if (car.ai && car.kind === 'traffic' && dist2d(car.x, car.z, x, z) < radius) car.ai.flee = 6;
}
