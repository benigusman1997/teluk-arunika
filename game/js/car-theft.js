// Carjacking: hold E to steal an occupied car (progress ring, driver pulled out, alarm), tap E to enter or exit.

function stealNearestCar(dt) {
  const p = G.player;
  let car = p.carjack ? p.carjack.car : null;
  if (!car) {
    let best = 3.3;
    for (const c of W.cars) {
      if (c.wrecked || Math.abs(c.y - p.y) > 1.5) continue;
      const d = dist2d(p.x, p.z, c.x, c.z) - c.spec.len * 0.25;
      if (d < best) { best = d; car = c; }
    }
  }
  if (!car || p.aiming) return;
  if (!car.occupied) {
    G.prompt = { text: 'E - ENTER ' + car.spec.name };
    if (W.keysHit.KeyE) {
      if (car.kind === 'parked') { G.stats.carsStolen++; if (rand() < 0.35) { car.alarm = 6; reportCrime(1, 'CAR THEFT'); } }
      enterOrExitVehicle(car);
    }
    return;
  }
  // Occupied: the driver has to come out first. Holding E fills the ring.
  if (W.keys.KeyE) {
    if (!p.carjack) { p.carjack = { car: car, t: 0 }; if (car.ai) car.ai.shoved = 3; car.speed *= 0.3; }
    const door = carDoorPoint(car);
    p.carjack.t += dt;
    p.x = lerp(p.x, door.x, 1 - Math.exp(-dt * 10)); p.z = lerp(p.z, door.z, 1 - Math.exp(-dt * 10));
    p.heading = Math.atan2(car.x - p.x, car.z - p.z);
    car.speed *= Math.exp(-dt * 6);
    if (car.ai) car.ai.shoved = 1;
    car.doorOpen = clamp(p.carjack.t / (CARJACK_SECONDS * 0.5), 0, 1);
    car.alarm = 8;
    // Halfway through, the driver is hauled out of the seat and hangs on beside the door.
    if (p.carjack.t > CARJACK_SECONDS * 0.45) {
      if (!p.carjack.driver) { p.carjack.driver = spawnDriverAtDoor(car); p.carjack.driver.state = 'dragged'; }
      const d = p.carjack.driver, fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      d.x = door.x + fx * 1.0 + (door.x - car.x) * 0.35; d.z = door.z + fz * 1.0 + (door.z - car.z) * 0.35;
      d.heading = car.heading + 2.2; d.alert = false;
      updatePersonMesh(d);
    }
    if (p.carjack.t >= CARJACK_SECONDS) { const driver = p.carjack.driver; p.carjack = null; pullDriverOut(car, driver); enterOrExitVehicle(car); return; }
    G.prompt = { text: 'HOLD E - STEALING ' + car.spec.name, progress: p.carjack.t / CARJACK_SECONDS };
  } else {
    if (p.carjack) { car.doorOpen = 0; if (p.carjack.driver) removePerson(p.carjack.driver); p.carjack = null; }
    G.prompt = { text: 'HOLD E - STEAL ' + car.spec.name, progress: 0 };
    showTutorialHint('steal');
  }
}

function pullDriverOut(car, dragged) {
  const door = carDoorPoint(car), side = { x: door.x - car.x, z: door.z - car.z }, len = Math.hypot(side.x, side.z) || 1;
  const driver = dragged || spawnDriverAtDoor(car);
  driver.state = 'down'; driver.t = 0; driver.hp = 60;
  driver.vx = (side.x / len) * 3.2; driver.vz = (side.z / len) * 3.2;
  driver.heading = Math.atan2(-side.x, -side.z);
  car.alarm = 8;
  car.occupied = false;
  G.stats.carsStolen++;
  alarmPedestriansNear(car.x, car.z, 22);
  const lawful = car.kind === 'police' || car.kind === 'swat' || car.kind === 'roadblock';
  reportCrime(lawful ? 3 : 2, lawful ? 'POLICE VEHICLE STOLEN' : 'CARJACKING');
  awardRankPoints(4, 'Car stolen');
  changeDistrictStanding(districtAt(car.x, car.z).id, -1);
  playUiSound('alarm');
  completeTutorialHint('steal');
  return driver;
}

function enterOrExitVehicle(car) {
  const p = G.player;
  if (p.car) {
    const c = p.car;
    if (Math.abs(c.speed) > 7) { showBanner('TOO FAST', 'Slow down before you bail out', 1.2); return false; }
    // Step out on the driver's side, or the other side when a wall is in the way.
    let spot = carDoorPoint(c);
    if (pointBlocked(spot.x, spot.z, 0)) spot = { x: c.x * 2 - spot.x, z: c.z * 2 - spot.z };
    p.car = null; p.onFoot = true;
    p.x = spot.x; p.z = spot.z; p.y = c.y; p.heading = c.heading;
    G.camYaw = c.heading;
    c.kind = 'parked'; c.occupied = false; c.speed = 0; c.siren = false; c.doorOpen = 0;
    if (c.mesh.userData.rider) c.mesh.userData.rider.visible = false;
    W.cam.snap = true;
    return true;
  }
  p.car = car; p.onFoot = false; p.carjack = null; p.crouch = false; p.aiming = false;
  car.kind = 'player'; car.occupied = true; car.ai = null; car.doorOpen = 0; car.siren = false; car.keep = true;
  if (car.mesh.userData.rider) car.mesh.userData.rider.visible = true;
  for (const u of W.units) if (u.car === car) u.gone = true;
  if (W.swat && W.swat.car === car) W.swat = null;
  openWeaponWheel(false);
  W.cam.snap = true;
  showBanner(car.spec.name, streetNameAt(car.x, car.z), 1.6);
  showTutorialHint('drive');
  return true;
}

function spawnDriverAtDoor(car) {
  const door = carDoorPoint(car);
  const look = car.kind === 'police' || car.kind === 'roadblock' ? PERSON_LOOKS.cop : car.kind === 'swat' ? PERSON_LOOKS.swat : randomPedLook();
  return spawnPerson('ped', door.x + (door.x - car.x) * 0.5, door.z + (door.z - car.z) * 0.5, look);
}

// The driver sits on the right (left-hand traffic), so that is the door Raka goes for.
function carDoorPoint(car) {
  const rx = -Math.cos(car.heading), rz = Math.sin(car.heading), reach = car.spec.wid * 0.5 + 0.55;
  return { x: car.x + rx * reach + Math.sin(car.heading) * 0.2, z: car.z + rz * reach + Math.cos(car.heading) * 0.2 };
}

const CARJACK_SECONDS = 1.4;
