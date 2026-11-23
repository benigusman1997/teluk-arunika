// Pedestrians: walkers on the sidewalks, zebra crossings, panic
// with "!" markers, diving away from cars and getting knocked down.

// Shirt colours for the crowd.
const ped_SHIRTS = [
  0xff7f6b, 0x7fd9b6, 0x36c2c9, 0xffc24a, 0xf25fa0, 0xfff1d6,
  0x8fc3ee, 0xd9764a, 0xff9f5a, 0xc77dff, 0x5dff9b, 0x2ee6c8,
];

// Spawn 50-60 pedestrians walking the sidewalks.
function spawnPedestrians() {
  for (let i = 0; i < 55; i++) {
    const walk = WORLD.sidewalks[Math.floor(taNextRandom() * WORLD.sidewalks.length)];
    const along = -440 + taNextRandom() * 880;
    let x = walk.x;
    let z = walk.z;
    if (walk.vertical) {
      z = along;
    } else {
      x = along;
    }
    const shirt = pickFromList(ped_SHIRTS);
    const mesh = makePersonMesh(shirt, 'walk');
    mesh.position.set(x, 0, z);
    WORLD.scene.add(mesh);
    const heading = walk.vertical
      ? (taNextRandom() > 0.5 ? 0 : Math.PI)
      : (taNextRandom() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    GAME.peds.push({
      x: x, z: z, heading: heading, state: 'walk', shirt: shirt,
      marker: '', mesh: mesh, speed: 1.2 + taNextRandom() * 0.8,
      walk: WORLD.sidewalks.indexOf(walk),
    });
  }
}

// Walk every pedestrian along its sidewalk, swaying arms and legs.
function walkPedestriansOnSidewalks(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  if (GAME.peds.length < 20) {
    spawnPedestrians();
  }
  for (const ped of GAME.peds) {
    if (ped.police) {
      continue;
    }
    if (ped.state === 'flee') {
      ped.x += Math.sin(ped.heading) * 4.5 * dt;
      ped.z += Math.cos(ped.heading) * 4.5 * dt;
      ped._fleeTime = (ped._fleeTime || 0) - dt;
      if (ped._fleeTime <= 0) {
        ped.state = 'walk';
        ped.marker = '';
      }
    } else if (ped.state === 'cross') {
      crossAtZebraCrossings(ped, dt);
    } else if (ped.state === 'down') {
      ped._downTime = (ped._downTime || 0) - dt;
      if (ped._downTime <= 0) {
        ped.state = 'walk';
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0;
      }
      continue;
    } else {
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
      if (ped.x < -445 || ped.x > 445 || ped.z < -445 || ped.z > 445) {
        ped.heading += Math.PI;
      }
      if (taNextRandom() < dt * 0.02) {
        ped.state = 'cross';
        ped._crossFrom = { x: ped.x, z: ped.z };
        ped._crossTo = {
          x: ped.x + Math.cos(ped.heading) * 16,
          z: ped.z - Math.sin(ped.heading) * 16,
        };
      }
    }
    if (ped.mesh) {
      ped.mesh.position.set(ped.x, ped.mesh.position.y, ped.z);
      ped.mesh.rotation.y = ped.heading;
      const swing = Math.sin(performance.now() / 180 + ped.x) * 0.4;
      if (ped.mesh.userData.armL) {
        ped.mesh.userData.armL.rotation.x = swing;
        ped.mesh.userData.armR.rotation.x = -swing;
        ped.mesh.userData.legL.rotation.x = -swing;
        ped.mesh.userData.legR.rotation.x = swing;
      }
    }
  }
  panicPedestriansNearDanger();
}

// Cross the road at a zebra crossing, then return to the sidewalk.
function crossAtZebraCrossings(ped, dt) {
  const to = ped._crossTo;
  if (!to) {
    ped.state = 'walk';
    return;
  }
  const dx = to.x - ped.x;
  const dz = to.z - ped.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1) {
    ped.state = 'walk';
    ped.heading += Math.PI / 2;
    return;
  }
  ped.x += (dx / d) * ped.speed * 1.4 * dt;
  ped.z += (dz / d) * ped.speed * 1.4 * dt;
}

// Panic everyone near gunfire, a crash or a speeding car.
function panicPedestriansNearDanger() {
  const p = GAME.player;
  const danger = GAME.police.stars >= 2 || (p.vehicle >= 0 && Math.abs(GAME.vehicles[p.vehicle].speed) > 18);
  if (!danger && !GAME._gunfireAt) {
    return;
  }
  for (const ped of GAME.peds) {
    if (ped.police || ped.state === 'down') {
      continue;
    }
    const gx = GAME._gunfireAt ? GAME._gunfireAt.x : p.x;
    const gz = GAME._gunfireAt ? GAME._gunfireAt.z : p.z;
    const d = distanceBetween(ped.x, ped.z, gx, gz);
    if (d < 30) {
      ped.state = 'flee';
      ped.marker = '!';
      ped._fleeTime = 3 + taNextRandom() * 2;
      ped.heading = Math.atan2(ped.x - gx, ped.z - gz);
    }
  }
  GAME._gunfireAt = null;
}

// Dive sideways out of the path of an oncoming car.
function diveAwayFromCars(ped, v) {
  const d = distanceBetween(ped.x, ped.z, v.x, v.z);
  if (d > 6) {
    return;
  }
  const ahead = Math.sin(v.heading) * (ped.x - v.x) + Math.cos(v.heading) * (ped.z - v.z);
  if (ahead > 0 && ahead < 8) {
    ped.x += Math.cos(v.heading) * 3;
    ped.z -= Math.sin(v.heading) * 3;
    ped.state = 'flee';
    ped.marker = '!';
    ped._fleeTime = 2;
  }
}

// Knock a pedestrian down: they fall, lie still, then get up.
function knockDownPedestrian(ped) {
  if (ped.state === 'down') {
    return;
  }
  ped.state = 'down';
  ped._downTime = 4;
  ped.marker = '';
  if (ped.mesh) {
    ped.mesh.rotation.x = -Math.PI / 2;
    ped.mesh.position.y = 0.3;
  }
  reportCrimeToDispatch('HIT AND RUN', ped.x, ped.z);
  GAME.career.stats.carsStolen += 0;
}

// Draw a "!" marker above a fleeing pedestrian (called from effects).
function ped_markerSprite(ped) {
  return ped.marker === '!' ? '!' : '';
}
