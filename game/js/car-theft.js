// Car theft: hold E to steal, pull the driver out, alarms, and the
// VEHICLE THEFT report that brings the TAPD running.

// Find the nearest stealable car and start the hold-E progress ring.
function stealNearestCar(dt) {
  const p = GAME.player;
  if (p.vehicle >= 0) {
    return;
  }
  let best = null;
  let bestD = 4;
  for (let i = 0; i < GAME.vehicles.length; i++) {
    const v = GAME.vehicles[i];
    if (v.driver === 'player') {
      continue;
    }
    const d = distanceBetween(p.x, p.z, v.x, v.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best === null) {
    GAME.ui.prompt = '';
    GAME.ui.promptProgress = 0;
    return;
  }
  const v = GAME.vehicles[best];
  GAME.ui.prompt = 'HOLD E — STEALING ' + v.model;
  if (inp_isDown('interact')) {
    GAME.ui.promptProgress = clampNumber(GAME.ui.promptProgress + dt / 1.5, 0, 1);
    updateCarTheftProgress(dt, best);
  } else {
    GAME.ui.promptProgress = 0;
  }
}

// Advance the theft: at full progress the driver tumbles out and the
// player takes the wheel, the alarm sounds and the crime is reported.
function updateCarTheftProgress(dt, index) {
  if (index === undefined) {
    stealNearestCar(dt);
    return;
  }
  if (GAME.ui.promptProgress < 1) {
    return;
  }
  const v = GAME.vehicles[index];
  if (!v) {
    return;
  }
  if (v.driver === 'traffic' || v.driver === 'police') {
    pullDriverOutOfCar(index);
  }
  v.driver = 'player';
  v.parked = false;
  GAME.player.vehicle = index;
  GAME.player.x = v.x;
  GAME.player.z = v.z;
  GAME.ui.prompt = '';
  GAME.ui.promptProgress = 0;
  GAME.career.stats.carsStolen += 1;
  triggerCarAlarm(v);
  reportCrimeToDispatch('VEHICLE THEFT', v.x, v.z);
  if (typeof awardRankPoints === 'function') {
    awardRankPoints(15);
  }
  GAME.ui.banner = 'VEHICLE THEFT — ' + v.model;
}

// Pull the driver out: they tumble onto the road and run off.
function pullDriverOutOfCar(index) {
  const v = GAME.vehicles[index];
  if (!v) {
    return;
  }
  const shirt = pickFromList([0xff9f5a, 0x36c2c9, 0xf25fa0, 0x8fc3ee]);
  const mesh = makePersonMesh(shirt, 'walk');
  const dx = v.x + Math.cos(v.heading) * 2.5;
  const dz = v.z - Math.sin(v.heading) * 2.5;
  mesh.position.set(dx, 0, dz);
  WORLD.scene.add(mesh);
  GAME.peds.push({
    x: dx, z: dz, heading: v.heading + Math.PI / 2, state: 'flee',
    shirt: shirt, marker: '!', mesh: mesh, speed: 4,
    _fleeTime: 4,
  });
  v.driver = 'none';
}

// Enter or exit the player's current vehicle with E.
function enterOrExitVehicle() {
  const p = GAME.player;
  if (p.vehicle >= 0) {
    const v = GAME.vehicles[p.vehicle];
    v.driver = 'none';
    v.speed = 0;
    p.vehicle = -1;
    p.x = v.x + Math.cos(v.heading) * 2.5;
    p.z = v.z - Math.sin(v.heading) * 2.5;
    GAME.ui.banner = '';
    return;
  }
  stealNearestCar(1 / 60);
}

// The alarm wails and flashes the car's lights for a few seconds.
function triggerCarAlarm(v) {
  v.alarm = true;
  v._alarmTime = 6;
  if (typeof playAlarmSound === 'function') {
    playAlarmSound();
  }
}

// Tick the alarm down; the lights stop flashing when it ends.
function thf_tickAlarm(dt) {
  for (const v of GAME.vehicles) {
    if (v.alarm) {
      v._alarmTime -= dt;
      if (v._alarmTime <= 0) {
        v.alarm = false;
      }
    }
  }
}
