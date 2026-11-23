// Traffic: cars that follow the lane network, stop at red lights,
// brake for obstacles, honk, swerve and flee from gunfire.

// Spawn 30-40 traffic cars of mixed models on lane paths.
function spawnTrafficCars() {
  const models = [
    'ARUNIKA SEDAN', 'KANCIL HATCH', 'MERAK COUPE', 'HARIMAU SEDAN',
    'TAKSI KUNING', 'ANGKOT MINI', 'OMBAK PICKUP', 'KOMET',
  ];
  const colours = [0xff7f6b, 0x7fd9b6, 0x36c2c9, 0xffc24a, 0xf4f1e6, 0x8fc3ee, 0xf25fa0];
  for (let i = 0; i < 34; i++) {
    const lane = WORLD.lanes[Math.floor(taNextRandom() * WORLD.lanes.length)];
    const point = lane.points[Math.floor(taNextRandom() * lane.points.length)];
    const model = pickFromList(models);
    const index = spawnVehicle(model, point.x, point.z, 0, 'traffic');
    const v = GAME.vehicles[index];
    v.lane = WORLD.lanes.indexOf(lane);
    v.lanePos = lane.points.indexOf(point);
    v.cruise = 8 + taNextRandom() * 8;
    v.colour = pickFromList(colours);
    const mesh = WORLD.meshes.vehicles[index];
    if (mesh) {
      mesh.traverse(function tint(child) {
        if (child.material && child.geometry && child.geometry.type === 'BoxGeometry') {
          return;
        }
      });
    }
  }
}

// Drive every traffic car along its lane, one waypoint at a time.
function driveTrafficAlongLanes(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  if (GAME.vehicles.filter(function isTraffic(v) { return v.driver === 'traffic'; }).length < 10) {
    spawnTrafficCars();
  }
  for (let i = 0; i < GAME.vehicles.length; i++) {
    const v = GAME.vehicles[i];
    if (v.driver !== 'traffic') {
      continue;
    }
    const lane = WORLD.lanes[v.lane];
    if (!lane) {
      continue;
    }
    const target = lane.points[v.lanePos];
    if (!target) {
      v.lanePos = 0;
      continue;
    }
    const d = distanceBetween(v.x, v.z, target.x, target.z);
    if (d < 6) {
      v.lanePos += lane.dir;
      if (v.lanePos >= lane.points.length) {
        v.lanePos = 0;
      }
      if (v.lanePos < 0) {
        v.lanePos = lane.points.length - 1;
      }
      continue;
    }
    const want = Math.atan2(target.x - v.x, target.z - v.z);
    const diff = angleDifference(want, v.heading);
    v.heading += clampNumber(diff, -1.4 * dt, 1.4 * dt);
    let speed = v.cruise;
    if (trf_lightAheadIsRed(v)) {
      speed = 0;
    }
    if (brakeForObstaclesAhead(v)) {
      speed = 0;
    }
    if (v.flee) {
      speed = v.cruise * 1.8;
    }
    v.speed = lerpNumber(v.speed, speed, 0.08);
    v.x += Math.sin(v.heading) * v.speed * dt;
    v.z += Math.cos(v.heading) * v.speed * dt;
    veh_syncMesh(i);
  }
  honkAndSwerveAroundPlayer(dt);
}

// True when the next traffic light ahead of a car is red.
function trf_lightAheadIsRed(v) {
  for (const light of WORLD.trafficLights) {
    const d = distanceBetween(v.x, v.z, light.x, light.z);
    if (d < 22 && d > 4 && light.state === 'red') {
      const ahead = Math.sin(v.heading) * (light.x - v.x) + Math.cos(v.heading) * (light.z - v.z);
      if (ahead > 0) {
        return true;
      }
    }
  }
  return false;
}

// Cycle the traffic lights: green, amber, red.
function updateTrafficLights(dt) {
  for (const light of WORLD.trafficLights) {
    light.timer -= dt;
    if (light.timer <= 0) {
      if (light.state === 'red') {
        light.state = 'green';
        light.timer = 9 + taNextRandom() * 4;
        light.lamp.material.color.setHex(0x22cc44);
        light.lamp.material.emissive.setHex(0x11aa22);
      } else if (light.state === 'green') {
        light.state = 'amber';
        light.timer = 2;
        light.lamp.material.color.setHex(0xffaa00);
        light.lamp.material.emissive.setHex(0xcc8800);
      } else {
        light.state = 'red';
        light.timer = 8 + taNextRandom() * 4;
        light.lamp.material.color.setHex(0xff2a2a);
        light.lamp.material.emissive.setHex(0xff1111);
      }
    }
  }
}

// Brake when another car, the player or a pedestrian is right ahead.
function brakeForObstaclesAhead(v) {
  const aheadX = v.x + Math.sin(v.heading) * 9;
  const aheadZ = v.z + Math.cos(v.heading) * 9;
  for (const other of GAME.vehicles) {
    if (other === v || other.driver === 'none') {
      continue;
    }
    if (distanceBetween(aheadX, aheadZ, other.x, other.z) < 4) {
      return true;
    }
  }
  if (GAME.player.vehicle < 0) {
    if (distanceBetween(aheadX, aheadZ, GAME.player.x, GAME.player.z) < 3.5) {
      return true;
    }
  }
  for (const ped of GAME.peds) {
    if (ped.state === 'cross' && distanceBetween(aheadX, aheadZ, ped.x, ped.z) < 4) {
      return true;
    }
  }
  return false;
}

// Honk at the player when he blocks the road; swerve around a wreck.
function honkAndSwerveAroundPlayer(dt) {
  const p = GAME.player;
  for (const v of GAME.vehicles) {
    if (v.driver !== 'traffic') {
      continue;
    }
    const d = distanceBetween(v.x, v.z, p.x, p.z);
    if (d < 12 && v.speed < 1) {
      v._honk = (v._honk || 0) - dt;
      if (v._honk <= 0) {
        v._honk = 2.5;
        if (typeof playHornSound === 'function') {
          playHornSound();
        }
      }
    }
    if (d < 8 && p.vehicle < 0) {
      v.heading += 0.6 * dt;
    }
  }
}

// Gunfire makes nearby traffic flee: cars speed up and scatter.
function makeTrafficFleeGunfire(x, z) {
  for (const v of GAME.vehicles) {
    if (v.driver !== 'traffic') {
      continue;
    }
    if (distanceBetween(v.x, v.z, x, z) < 40) {
      v.flee = true;
      v.cruise = 18 + taNextRandom() * 6;
      v.lanePos = (v.lanePos + 3) % (WORLD.lanes[v.lane].points.length || 1);
    }
  }
}

// A traffic car that is wrecked stops and smokes.
function trf_wreckCar(index) {
  const v = GAME.vehicles[index];
  if (!v) {
    return;
  }
  v.driver = 'none';
  v.speed = 0;
  v.hp = 0;
  if (typeof spawnTyreSmoke === 'function') {
    spawnTyreSmoke(v.x, v.z);
  }
}
