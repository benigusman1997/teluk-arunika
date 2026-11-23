// Vehicle driving: arcade physics, collisions, damage, tyres, explosion.

// Vehicle models: name, class, top speed, acceleration, handling,
// body points and street value.
const VEHICLE_MODELS = {
  'ARUNIKA SEDAN': { class: 'sedan', top: 150, accel: 5, handling: 6, hp: 100, value: 2400 },
  'PELABUHAN GT': { class: 'sports', top: 215, accel: 8, handling: 8, hp: 90, value: 9500 },
  'RAJAWALI SUPER': { class: 'super', top: 250, accel: 10, handling: 7, hp: 80, value: 18000 },
  'MERAK COUPE': { class: 'coupe', top: 190, accel: 7, handling: 7, hp: 90, value: 6800 },
  'HARIMAU SEDAN': { class: 'muscle', top: 200, accel: 8, handling: 5, hp: 110, value: 7200 },
  'SRIKANDI GT': { class: 'tuner', top: 205, accel: 8, handling: 9, hp: 85, value: 8400 },
  'KANCIL HATCH': { class: 'hatchback', top: 140, accel: 5, handling: 8, hp: 80, value: 1600 },
  'TAKSI KUNING': { class: 'taxi', top: 150, accel: 5, handling: 6, hp: 110, value: 2000 },
  'ANGKOT MINI': { class: 'minibus', top: 120, accel: 3, handling: 4, hp: 140, value: 1800 },
  'OMBAK PICKUP': { class: 'pickup', top: 135, accel: 4, handling: 5, hp: 150, value: 2600 },
  'BANTENG HAULER': { class: 'truck', top: 110, accel: 2, handling: 3, hp: 300, value: 5000 },
  'KOMET': { class: 'scooter', top: 105, accel: 6, handling: 9, hp: 40, value: 700 },
  'TAPD CAMAR': { class: 'cruiser', top: 205, accel: 8, handling: 7, hp: 140, value: 0 },
  'TAPD KILAT': { class: 'interceptor', top: 235, accel: 9, handling: 8, hp: 110, value: 0 },
  'BADAK-2': { class: 'armoured', top: 150, accel: 4, handling: 4, hp: 400, value: 0 },
  'ELANG-1': { class: 'helicopter', top: 180, accel: 7, handling: 8, hp: 200, value: 0 },
};

// Spawn a vehicle into the world with a mesh and a state record.
function spawnVehicle(modelId, x, z, heading, driver) {
  const model = VEHICLE_MODELS[modelId];
  if (!model) {
    return -1;
  }
  const colours = {
    'PELABUHAN GT': 0xff5a3c, 'RAJAWALI SUPER': 0xffcf3a,
    'MERAK COUPE': 0x7fd9b6, 'HARIMAU SEDAN': 0xd93838,
    'SRIKANDI GT': 0x36c2c9, 'TAKSI KUNING': 0xffcf3a,
    'ANGKOT MINI': 0x2ee6c8, 'OMBAK PICKUP': 0x8a5a33,
    'BANTENG HAULER': 0x9aa5b1, 'KOMET': 0xf25fa0,
    'ARUNIKA SEDAN': 0x8fc3ee, 'KANCIL HATCH': 0xff9f5a,
  };
  const index = GAME.vehicles.length;
  const vehicle = {
    model: modelId, x: x, z: z, heading: heading, speed: 0,
    hp: model.hp, maxHp: model.hp, driver: driver || 'none',
    parked: driver === 'none', alarm: false,
    colour: colours[modelId] || 0xf4f1e6, tyreBurst: 0,
    smoke: 0, gear: 1, drift: 0, nitro: 0,
  };
  GAME.vehicles.push(vehicle);
  let mesh = null;
  if (modelId === 'TAPD CAMAR' || modelId === 'TAPD KILAT') {
    mesh = makePoliceCruiserMesh(12 + index);
  } else if (modelId === 'BADAK-2') {
    mesh = makeSwatVanMesh();
  } else {
    mesh = makeCarMesh(modelId, vehicle.colour);
  }
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  WORLD.scene.add(mesh);
  WORLD.meshes.vehicles[index] = mesh;
  return index;
}

// Arcade driving for the player's car and every driven vehicle.
function driveVehicleWithArcadePhysics(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  for (let i = 0; i < GAME.vehicles.length; i++) {
    const v = GAME.vehicles[i];
    if (v.driver !== 'player') {
      continue;
    }
    const model = VEHICLE_MODELS[v.model];
    const top = (model.top / 3.6) * (1 + GAME.garage.upgrades.engine * 0.08);
    const grip = (GAME.time.weather === 'HUJAN TROPIS' ? 0.85 : 1)
      * (v.tyreBurst > 0 ? 0.55 : 1);
    const accel = model.accel * 4.2 * dt * grip;
    let throttle = 0;
    if (inp_isDown('forward')) {
      throttle = 1;
    } else if (inp_isDown('back')) {
      throttle = -0.6;
    }
    if (GAME.crew.active.Z > 0) {
      v.speed += accel * 0.4;
    }
    if (throttle > 0) {
      v.speed += accel * throttle;
    } else if (throttle < 0) {
      v.speed += accel * throttle;
    } else {
      v.speed *= (1 - 0.6 * dt);
    }
    if (inp_isDown('jump')) {
      applyHandbrakeDrift(v, dt);
    }
    const maxSpeed = top * (v.tyreBurst > 0 ? 0.5 : 1);
    v.speed = clampNumber(v.speed, -top * 0.4, maxSpeed);
    const steer = (inp_isDown('left') ? 1 : 0) - (inp_isDown('right') ? 1 : 0);
    const steerPower = model.handling * 0.055 * clampNumber(Math.abs(v.speed) / 8, 0.2, 1);
    v.heading += steer * steerPower * (v.speed >= 0 ? 1 : -1) * grip;
    const nx = v.x + Math.sin(v.heading) * v.speed * dt;
    const nz = v.z + Math.cos(v.heading) * v.speed * dt;
    const hit = collideVehicleWithWorld(v, nx, nz);
    v.x = hit.x;
    v.z = hit.z;
    v.gear = veh_gearForSpeed(v.speed, model.top);
    GAME.career.stats.distance += Math.abs(v.speed) * dt / 1000;
    if (Math.abs(v.speed) > 20 && inp_isDown('jump')) {
      if (typeof spawnSkidMark === 'function') {
        spawnSkidMark(v.x, v.z, v.heading);
      }
      if (typeof spawnTyreSmoke === 'function') {
        spawnTyreSmoke(v.x, v.z);
      }
    }
    veh_syncMesh(i);
    GAME.player.x = v.x;
    GAME.player.z = v.z;
    GAME.player.heading = v.heading;
  }
}

// Handbrake drift: cuts grip, swings the tail, leaves smoke and marks.
function applyHandbrakeDrift(v, dt) {
  v.speed *= (1 - 1.4 * dt);
  v.drift = clampNumber(v.drift + dt * 2, 0, 1);
  const steer = (inp_isDown('left') ? 1 : 0) - (inp_isDown('right') ? 1 : 0);
  v.heading += steer * 1.6 * dt;
  if (typeof spawnTyreSmoke === 'function') {
    spawnTyreSmoke(v.x, v.z);
  }
}

// Collide a vehicle with buildings and the city edge; returns the
// corrected position and applies damage on a hard hit.
function collideVehicleWithWorld(v, nx, nz) {
  const fixed = collideWithBuildings(nx, nz, 1.6);
  if (fixed.x !== nx || fixed.z !== nz) {
    const impact = Math.abs(v.speed);
    if (impact > 9) {
      damageVehicleOnCollision(v, impact);
      if (typeof shakeCamera === 'function') {
        shakeCamera(0.5, 0.4);
      }
    }
    v.speed *= 0.45;
  }
  const bx = clampNumber(fixed.x, -448, 448);
  const bz = clampNumber(fixed.z, -448, 448);
  if (bx !== fixed.x || bz !== fixed.z) {
    v.speed *= 0.5;
  }
  return { x: bx, z: bz };
}

// Damage a vehicle on a collision; smoke, then fire, then explosion.
function damageVehicleOnCollision(v, impact) {
  const dmg = Math.floor((impact - 8) * 2.2);
  v.hp -= dmg;
  v.smoke = clampNumber(v.smoke + dmg * 0.02, 0, 1);
  if (v.hp <= 0) {
    explodeVehicle(GAME.vehicles.indexOf(v));
  }
}

// A burst tyre halves top speed and pulls the car to one side.
function burstTyreOnSpikes(v) {
  if (v.tyreBurst > 0) {
    return;
  }
  v.tyreBurst = 1;
  v.speed *= 0.6;
  GAME.ui.banner = 'TYRE BLOWN — SPIKE STRIP';
  if (typeof shakeCamera === 'function') {
    shakeCamera(0.4, 0.5);
  }
}

// Blow a vehicle up: fireball, smoke, debris, and the driver is out.
function explodeVehicle(index) {
  const v = GAME.vehicles[index];
  if (!v || v.hp > -999) {
    v.hp = 0;
  }
  if (typeof spawnExplosion === 'function') {
    spawnExplosion(v.x, v.z);
  }
  if (v.driver === 'player') {
    GAME.player.vehicle = -1;
    GAME.player.x = v.x + 3;
    GAME.player.z = v.z + 3;
    GAME.player.health -= 25;
  }
  v.driver = 'none';
  v.speed = 0;
  const mesh = WORLD.meshes.vehicles[index];
  if (mesh) {
    mesh.visible = false;
  }
}

// Gear number from speed for the HUD car card.
function veh_gearForSpeed(speed, topKmh) {
  const kmh = Math.abs(speed) * 3.6;
  if (kmh < 1) {
    return 1;
  }
  const g = Math.floor((kmh / topKmh) * 5) + 1;
  return clampNumber(g, 1, 5);
}

// Copy a vehicle record onto its mesh each step.
function veh_syncMesh(index) {
  const v = GAME.vehicles[index];
  const mesh = WORLD.meshes.vehicles[index];
  if (!v || !mesh) {
    return;
  }
  mesh.position.set(v.x, 0, v.z);
  mesh.rotation.y = v.heading;
  if (v.smoke > 0.4 && typeof spawnTyreSmoke === 'function') {
    if (taNextRandom() > 0.7) {
      spawnTyreSmoke(v.x, v.z);
    }
  }
}
