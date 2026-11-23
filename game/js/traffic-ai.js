// Ambient traffic: spawning cars around the player, driving them along the lane graph (left-hand traffic),
// stopping at red lights and behind obstacles, honking, fleeing gunfire. Also the traffic light lamps.
TA.TRAFFIC_TARGET = 32;

TA.laneOffset = function (key) { return key === 'komet' ? 4.5 : 2.5; };

// Point on the left-hand lane of the edge a -> b, "back" metres before b (negative = past a's side).
TA.lanePoint = function (a, b, offset, back) {
  var dx = b.x - a.x, dz = b.z - a.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
  dx /= d; dz /= d;
  return { x: b.x - dx * back + dz * offset, z: b.z - dz * back - dx * offset, dx: dx, dz: dz };
};

TA.spawnTrafficCar = function (from, to, t, key) {
  key = key || TA.pick(TA.TRAFFIC_MIX);
  var off = TA.laneOffset(key), end = TA.lanePoint(from, to, off, 0), len = TA.dist(from.x, from.z, to.x, to.z);
  var back = len * (1 - t), x = end.x - end.dx * back, z = end.z - end.dz * back;
  for (var i = 0; i < TA.cars.length; i++) if (TA.dist(x, z, TA.cars[i].x, TA.cars[i].z) < 9) return null;
  var car = TA.spawnCar(key, x, z, TA.headingTo(end.dx, end.dz), 'traffic');
  car.ai = { from: from.id, to: to.id, phase: 'lane', cruise: Math.min(car.model.top * 0.45, 11 + TA.rand() * 5), wait: 0, flee: 0, honk: 0 };
  car.speed = car.ai.cruise * 0.8;
  return car;
};

TA.randomEdge = function () {
  var nodes = TA.world.nodes, a = nodes[Math.floor(TA.rand() * nodes.length) % nodes.length];
  return [a, nodes[a.nb[Math.floor(TA.rand() * a.nb.length) % a.nb.length]]];
};

// Fill the streets around a point; used at game start and whenever traffic thins out.
TA.populateTraffic = function (cx, cz, minDist) {
  var tries = 0, count = TA.cars.filter(function (c) { return c.kind === 'traffic'; }).length;
  while (count < TA.TRAFFIC_TARGET && tries++ < 60) {
    var e = TA.randomEdge(), t = 0.15 + TA.rand() * 0.7, x = TA.lerp(e[0].x, e[1].x, t), z = TA.lerp(e[0].z, e[1].z, t), d = TA.dist(x, z, cx, cz);
    if (d < minDist || d > 300) continue;
    if (TA.spawnTrafficCar(e[0], e[1], t)) count++;
  }
};

TA.spawnParkedCars = function () {
  TA.world.parkSpots.forEach(function (s, i) {
    if (i % 2 && TA.rand() < 0.5) return;
    var key = TA.pick(['sedan', 'sedan', 'gt', 'taxi', 'angkot', 'komet', 'sedan']);
    var car = TA.spawnCar(key, s.x, s.z, s.h, 'parked');
    car.keep = true;
  });
};

TA.updateTraffic = function (dt) {
  var p = TA.player, cars = TA.cars, i;
  for (i = cars.length - 1; i >= 0; i--) {
    var c = cars[i];
    if (c.kind !== 'traffic' || c.dead) continue;
    if (!c.driver) { c.kind = 'parked'; continue; }
    if (p && TA.dist(c.x, c.z, p.x, p.z) > 340 && !TA.run.showcase) { TA.removeCar(c); continue; }
    TA.driveTrafficCar(c, dt);
  }
  if (p && TA.run.frame % 30 === 0 && !TA.run.showcase) TA.populateTraffic(p.x, p.z, 130);
  if (TA.run.frame % 20 === 0) TA.updateTrafficLamps();
};

TA.driveTrafficCar = function (c, dt) {
  var ai = c.ai, nodes = TA.world.nodes, a = nodes[ai.from], b = nodes[ai.to], off = TA.laneOffset(c.key);
  var target = ai.phase === 'lane' ? TA.lanePoint(a, b, off, 12) : TA.lanePoint(a, b, off, TA.dist(a.x, a.z, b.x, b.z) - 12);
  var d = TA.dist(c.x, c.z, target.x, target.z), want = ai.cruise * (ai.flee > 0 ? 1.7 : 1);
  if (ai.flee > 0) ai.flee -= dt;
  if (ai.phase === 'lane') {
    // red or yellow light ahead: stop at the line
    var light = TA.lightState(b, Math.abs(target.dz) > 0.5);
    if (light !== 'green' && d < 14 && ai.flee <= 0) want = d < 3 ? 0 : Math.min(want, d * 0.7);
    if (d < 2.5 && (light === 'green' || ai.flee > 0)) {
      var options = b.nb.filter(function (id) { return id !== ai.from; });
      var straight = options.filter(function (id) { var n = nodes[id]; return Math.abs((n.x - b.x) * target.dz - (n.z - b.z) * target.dx) < 1; });
      var next = (straight.length && TA.rand() < 0.6) ? straight[0] : options[Math.floor(TA.rand() * options.length) % options.length];
      ai.from = b.id; ai.to = next; ai.phase = 'turn';
    }
  } else {
    want = Math.min(want, 7);
    if (d < 3) ai.phase = 'lane';
  }
  // obstacles ahead: other cars, pedestrians, the player
  var fx = Math.sin(c.h), fz = Math.cos(c.h), block = TA.obstacleAhead(c, fx, fz, 6 + c.speed * 1.1);
  if (block < 1e8) {
    want = Math.min(want, Math.max(0, (block - 5) * 1.2));
    if (c.speed < 0.5) { ai.wait += dt; if (ai.wait > 2.5 && ai.honk <= 0) { ai.honk = 4; if (TA.sfxAt) TA.sfxAt('horn', c.x, c.z); } } else ai.wait = 0;
  } else ai.wait = 0;
  ai.honk -= dt;
  c.speed += TA.clamp(want - c.speed, -14 * dt, c.model.acc * 0.5 * dt);
  if (c.speed < 0) c.speed = 0;
  var wantH = TA.headingTo(target.x - c.x, target.z - c.z);
  if (d > 1) c.h = TA.turnToward(c.h, wantH, (ai.phase === 'turn' ? 2.4 : 1.4) * dt * Math.min(1, c.speed / 3 + 0.2));
  // a traffic car that was shoved by a crash eases back to rolling along its own heading
  var k = Math.min(1, dt * 4);
  c.vx += (Math.sin(c.h) * c.speed - c.vx) * k; c.vz += (Math.cos(c.h) * c.speed - c.vz) * k;
  TA.moveCar(c, dt);
};

// Distance to the nearest thing in the car's path, or a huge number when the lane is clear.
TA.obstacleAhead = function (c, fx, fz, range) {
  var best = 1e9, i, o, dx, dz, along, side;
  for (i = 0; i < TA.cars.length; i++) {
    o = TA.cars[i];
    if (o === c) continue;
    dx = o.x - c.x; dz = o.z - c.z; along = dx * fx + dz * fz;
    if (along < 1 || along > range) continue;
    side = Math.abs(dx * fz - dz * fx);
    if (side < (c.model.wid + o.model.wid) * 0.5 + 0.3 && along < best) best = along;
  }
  for (i = 0; i < TA.people.length; i++) {
    o = TA.people[i];
    if (o.dead) continue;
    dx = o.x - c.x; dz = o.z - c.z; along = dx * fx + dz * fz;
    if (along < 1 || along > range * 0.8) continue;
    if (Math.abs(dx * fz - dz * fx) < 1.6 && along < best) best = along;
  }
  var p = TA.player;
  if (p && !p.car) { dx = p.x - c.x; dz = p.z - c.z; along = dx * fx + dz * fz; if (along > 1 && along < range && Math.abs(dx * fz - dz * fx) < 1.7 && along < best) best = along; }
  return best;
};

// Gunfire or an explosion nearby: drivers floor it for a few seconds.
TA.scareTraffic = function (x, z, radius) {
  TA.cars.forEach(function (c) { if (c.kind === 'traffic' && c.ai && TA.dist(x, z, c.x, c.z) < radius) c.ai.flee = 6; });
};

// ---- traffic light lamps (one instanced mesh, recoloured when a phase changes) ----
TA.buildTrafficLamps = function () {
  var nodes = TA.world.nodes, geo = new THREE.BoxGeometry(0.5, 0.5, 0.5), mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var inst = new THREE.InstancedMesh(geo, mat, nodes.length * 4), m = new THREE.Matrix4(), k = 0;
  TA.lampInfo = [];
  nodes.forEach(function (n) {
    [[-9, -9], [-9, 9], [9, 9], [9, -9]].forEach(function (c, ci) {
      m.makeTranslation(n.x + c[0], 4.7, n.z + c[1]);
      inst.setMatrixAt(k, m);
      TA.lampInfo.push({ node: n, alongZ: ci % 2 === 0 });
      k++;
    });
  });
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nodes.length * 12), 3);
  TA.trafficLamps = inst;
  TA.scene.add(inst);
  TA.updateTrafficLamps();
};

TA.updateTrafficLamps = function () {
  if (!TA.trafficLamps) return;
  var col = new THREE.Color(), table = { red: 0xff3b30, yellow: 0xffcc00, green: 0x34e36f };
  for (var i = 0; i < TA.lampInfo.length; i++) {
    var info = TA.lampInfo[i];
    col.setHex(table[TA.lightState(info.node, info.alongZ)]);
    TA.trafficLamps.setColorAt(i, col);
  }
  TA.trafficLamps.instanceColor.needsUpdate = true;
};
