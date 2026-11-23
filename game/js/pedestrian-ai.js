// Pedestrians: walking the sidewalks, crossing streets, panicking and diving away from danger.

function spawnPedestrians(target) {
  const focus = playerPosition();
  let count = 0;
  for (let i = W.people.length - 1; i >= 0; i--) {
    const p = W.people[i];
    if (p.kind !== 'ped') continue;
    if (dist2d(p.x, p.z, focus.x, focus.z) > 230 || (p.state === 'dead' && p.t > 25)) removePerson(p); else count++;
  }
  // Random nodes often fall outside the ring near the map edge, so allow plenty of tries per call.
  for (let tries = 0; tries < 28 && count < target; tries++) {
    const n = randInt(0, W.walkNodes.length - 1), node = W.walkNodes[n], d = dist2d(node.x, node.z, focus.x, focus.z);
    if (d > 190 || (d < 38 && G.mode === 'playing' && !W.showcase)) continue;
    const next = randPick(node.links), q = W.walkNodes[next], t = rand();
    const p = spawnPerson('ped', lerp(node.x, q.x, t), lerp(node.z, q.z, t), randomPedLook());
    p.prevNode = n; p.node = next;
    p.heading = Math.atan2(q.x - node.x, q.z - node.z);
    count++;
  }
}

function walkPedestriansOnSidewalks(dt) {
  const player = playerPosition();
  for (const p of W.people) {
    if (p.kind !== 'ped') continue;
    p.t += dt;
    if (p.state === 'walk') {
      const node = W.walkNodes[p.node];
      const tx = node.x + p.offX, tz = node.z + p.offZ, d = dist2d(p.x, p.z, tx, tz);
      if (d < 1.2) {
        const options = node.links.filter((l) => l !== p.prevNode);
        p.prevNode = p.node;
        p.node = options.length ? randPick(options) : node.links[0];
      } else {
        const want = Math.atan2(tx - p.x, tz - p.z);
        p.heading += clamp(angleDiff(want, p.heading), -4 * dt, 4 * dt);
        p.x += Math.sin(p.heading) * p.pace * dt;
        p.z += Math.cos(p.heading) * p.pace * dt;
        p.phase += dt * p.pace * 4.2;
      }
      // Bumped by Raka on foot: stumble aside and hurry off.
      if (!G.player.car && dist2d(p.x, p.z, player.x, player.z) < 0.75) { p.state = 'panic'; p.t = 0; p.panic = 2; p.fromX = player.x; p.fromZ = player.z; p.alert = false; }
    } else if (p.state === 'panic') {
      const want = Math.atan2(p.x - p.fromX, p.z - p.fromZ);
      p.heading += clamp(angleDiff(want, p.heading), -7 * dt, 7 * dt);
      p.x += Math.sin(p.heading) * 5.6 * dt;
      p.z += Math.cos(p.heading) * 5.6 * dt;
      p.phase += dt * 14;
      p.panic -= dt;
      if (p.panic <= 0) { p.state = 'walk'; p.alert = false; p.node = nearestWalkNode(p.x, p.z); p.prevNode = -1; }
    } else if (p.state === 'dive') {
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (p.t > 0.45) { p.state = 'down'; p.t = 0; p.vx = p.vz = 0; }
    } else if (p.state === 'down') {
      p.x += p.vx * dt; p.z += p.vz * dt;
      p.vx *= Math.exp(-dt * 4); p.vz *= Math.exp(-dt * 4);
      if (p.t > 1.6) { if (p.hp <= 0) { p.state = 'dead'; p.t = 0; } else { p.state = 'panic'; p.panic = 6; p.alert = true; p.t = 0; } }
    }
    if (p.state !== 'dead') {
      const out = pushOutOfColliders(p.x, p.z, 0.35);
      p.x = out.x; p.z = out.z;
      p.y = groundHeightAt(p.x, p.z);
    }
    updatePersonMesh(p);
  }
}

function panicPedestriansNearDanger() {
  // Fast cars: dive out of the way, or get knocked down when it is too late.
  for (const car of W.cars) {
    const sp = Math.abs(car.speed) + Math.hypot(car.kx, car.kz);
    if (sp < 6 || car.wrecked) continue;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading), reach = car.spec.len * 0.45;
    for (const p of W.people) {
      if (p.state === 'dead' || p.state === 'down' || p.inCar || Math.abs(p.y - car.y) > 1.5) continue;
      const ox = p.x - car.x, oz = p.z - car.z, along = ox * fx + oz * fz, side = ox * fz - oz * fx;
      if (Math.abs(along) < reach + 0.4 && Math.abs(side) < car.spec.wid * 0.5 + 0.35) {
        knockDownPerson(p, fx * sp * 0.7 + fz * Math.sign(side) * 3, fz * sp * 0.7 - fx * Math.sign(side) * 3, sp * 3.2, car === G.player.car);
      } else if (p.kind === 'ped' && p.state !== 'dive' && along > 0 && along < 9 + sp * 0.5 && Math.abs(side) < 2.4) {
        const dir = side >= 0 ? 1 : -1;
        p.state = 'dive'; p.t = 0; p.alert = true;
        p.vx = fz * dir * 6.5; p.vz = -fx * dir * 6.5;
        p.heading = Math.atan2(p.vx, p.vz);
        p.fromX = car.x; p.fromZ = car.z;
      }
    }
  }
}

function spawnPerson(kind, x, z, look) {
  const mesh = makePersonMesh(look);
  const p = {
    id: W.nextId++, kind: kind, mesh: mesh, look: look, x: x, z: z, y: groundHeightAt(x, z), heading: 0, hp: 60, maxHp: 60,
    state: kind === 'ped' ? 'walk' : 'idle', t: 0, phase: rand() * 6, pace: randRange(1.25, 1.9), node: 0, prevNode: -1,
    offX: randRange(-1.3, 1.3), offZ: randRange(-1.3, 1.3), panic: 0, alert: false, fromX: 0, fromZ: 0, vx: 0, vz: 0,
    hostile: false, weapon: look.weapon || null, name: '', marker: null, bar: null, cool: randRange(0.3, 1.5), coverX: x, coverZ: z, aimPose: false, inCar: false
  };
  W.scene.add(mesh);
  W.people.push(p);
  updatePersonMesh(p);
  return p;
}

function removePerson(p) {
  W.scene.remove(p.mesh);
  if (p.marker) W.scene.remove(p.marker);
  if (p.bar) W.scene.remove(p.bar);
  if (p.alertSprite) W.scene.remove(p.alertSprite);
  const i = W.people.indexOf(p);
  if (i >= 0) W.people.splice(i, 1);
  p.removed = true;
}

function randomPedLook() {
  const hat = rand() < 0.2 ? 'cap' : null;
  return { shirt: randPick(PED_SHIRTS), pants: randPick(PED_PANTS), skin: randPick(PED_SKINS), hair: randPick(PED_HAIR), hat: hat, hatColor: randPick(PED_SHIRTS) };
}

function nearestWalkNode(x, z) {
  let best = 0, bestD = 1e9;
  W.walkNodes.forEach((n, i) => { const d = dist2d(x, z, n.x, n.z); if (d < bestD) { bestD = d; best = i; } });
  return best;
}

function knockDownPerson(p, vx, vz, damage, byPlayer) {
  p.hp -= damage;
  p.state = 'down'; p.t = 0; p.vx = vx; p.vz = vz; p.alert = false;
  if (byPlayer) {
    reportCrime(1, 'HIT AND RUN');
    if (p.hp <= 0) { G.stats.kills++; changeDistrictStanding(districtAt(p.x, p.z).id, -2); }
  }
  if (p.hp <= 0 && p.kind !== 'ped') killPerson(p, byPlayer);
}

function alarmPedestriansNear(x, z, radius) {
  for (const p of W.people) {
    if (p.kind !== 'ped' || p.state === 'dead' || p.state === 'down' || p.state === 'dive') continue;
    if (dist2d(p.x, p.z, x, z) < radius) { p.state = 'panic'; p.panic = randRange(5, 9); p.alert = true; p.fromX = x; p.fromZ = z; }
  }
}

function updatePersonMesh(p) {
  const m = p.mesh;
  m.position.set(p.x, p.y, p.z);
  m.rotation.y = p.heading;
  let pose = 'stand';
  if (p.state === 'walk') pose = 'walk';
  else if (p.state === 'panic' || p.state === 'chase' || p.state === 'advance' || p.state === 'flank') pose = p.kind === 'cop' && p.weapon === 'baton' ? 'baton' : 'run';
  else if (p.state === 'dive') pose = 'dive';
  else if (p.state === 'down' || p.state === 'dead') pose = 'down';
  else if (p.state === 'fall') pose = 'fall';
  else if (p.state === 'cover') pose = 'hide';
  else if (p.state === 'peek') pose = p.look.shield ? 'aim' : 'crouch';
  else if (p.state === 'shoot') pose = 'aim';
  else if (p.state === 'dragged') pose = 'fall';
  posePerson(m, pose, p.phase);
  if (p.alert && !p.alertSprite) { p.alertSprite = makeMarkerSprite('alert'); W.scene.add(p.alertSprite); }
  if (p.alertSprite) { p.alertSprite.visible = p.alert; p.alertSprite.position.set(p.x, p.y + 2.5, p.z); }
  if (p.marker) { p.marker.visible = p.state !== 'dead'; p.marker.position.set(p.x, p.y + 2.75 + Math.sin(G.time * 4 + p.id) * 0.08, p.z); }
  if (p.bar) { p.bar.visible = p.state !== 'dead'; p.bar.position.set(p.x, p.y + 2.25, p.z); if (p.bar.userData.shown !== p.hp / p.maxHp) redrawHealthBar(p.bar, Math.max(0, p.hp / p.maxHp)); }
}
