// Side activities: taxi fares, wreck contracts, export list,
// Arunika coins and stunt ramps.

// Taxi passengers: name, pickup, drop and tip rule.
const TAXI_PASSENGERS = [
  { name: 'Ibu Ratna', from: 'MARKET GATE', to: 'HOTEL NUSA', tip: 'big tip if under 90 s' },
  { name: 'Pak Hadi', from: 'BANK ARUNIKA', to: 'PIER 9', tip: 'tip for a smooth ride' },
  { name: 'Mbak Sinta', from: 'HOTEL NUSA', to: 'BENGKEL PAK AMIR', tip: 'tip if no crash' },
  { name: 'Bang Udin', from: 'TAPD HQ', to: 'PASAR SENJA', tip: 'double fare at night' },
  { name: 'Nenek Ani', from: 'RS ARUNIKA', to: 'SAFEHOUSE PANTAI', tip: 'tip for the long way' },
];

// Wreck targets: model, fleeing to, payout, own health bar.
const WRECK_TARGETS = [
  { model: 'MERAK COUPE', to: 'PELABUHAN', payout: 2000 },
  { model: 'HARIMAU SEDAN', to: 'TOL LAYANG', payout: 2800 },
  { model: 'SRIKANDI GT', to: 'PULAU ABU', payout: 3600 },
];

// Export wanted list: five models wanted at the port, +50% value.
const EXPORT_WANTED_LIST = [
  'PELABUHAN GT', 'RAJAWALI SUPER', 'MERAK COUPE', 'SRIKANDI GT', 'HARIMAU SEDAN',
];

// Twelve Arunika coin places, $250 each, $5,000 bonus for all twelve.
const ARUNIKA_COIN_PLACES = [
  { x: -400, z: 400 }, { x: 200, z: 340 }, { x: 90, z: -60 },
  { x: -270, z: -90 }, { x: 620, z: -360 }, { x: 535, z: -360 },
  { x: -20, z: 200 }, { x: 180, z: -270 }, { x: -270, z: 30 },
  { x: 0, z: -180 }, { x: 300, z: 330 }, { x: -400, z: 210 },
];

// Five stunt ramps with a distance to beat.
const STUNT_RAMPS = [
  { name: 'PIER JUMP', x: -400, z: 400, beat: 25 },
  { name: 'FLYOVER DROP', x: 0, z: -360, beat: 30 },
  { name: 'BEACH LAUNCH', x: 200, z: 390, beat: 22 },
  { name: 'BRIDGE LEAP', x: 535, z: -360, beat: 35 },
  { name: 'MARKET HOP', x: -270, z: -90, beat: 18 },
];

// Run the side activities every step: fares, wrecks, coins, stunts.
function updateSideActivities(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  if (GAME._taxi) {
    runTaxiFare(dt);
  }
  if (GAME._wreck) {
    sid_tickWreck(dt);
  }
  sid_checkCoins();
  sid_checkStunts(dt);
}

// Start a taxi fare with a named passenger.
function runTaxiFare(dt) {
  const fare = GAME._taxi;
  if (!fare) {
    const passenger = pickFromList(TAXI_PASSENGERS);
    GAME._taxi = { passenger: passenger, stage: 'pickup', timer: 90 };
    GAME.ui.banner = 'TAXI — PICK UP ' + passenger.name.toUpperCase();
    return;
  }
  fare.timer -= dt;
  const p = GAME.player;
  if (fare.stage === 'pickup') {
    const from = sid_placeByName(fare.passenger.from);
    if (from && distanceBetween(p.x, p.z, from.x, from.z) < 8) {
      fare.stage = 'drop';
      GAME.ui.banner = 'FARE ON BOARD — DRIVE TO ' + fare.passenger.to;
    }
    return;
  }
  const to = sid_placeByName(fare.passenger.to);
  if (to && distanceBetween(p.x, p.z, to.x, to.z) < 8) {
    const pay = 120 + Math.max(0, Math.floor(fare.timer)) * 2;
    GAME.money += pay;
    GAME.career.stats.cashEarned += pay;
    GAME.ui.banner = 'FARE PAID — $' + pay;
    GAME._taxi = null;
    if (typeof awardRankPoints === 'function') {
      awardRankPoints(40);
    }
  }
  if (fare.timer <= 0) {
    GAME.ui.banner = 'FARE LOST — TOO SLOW';
    GAME._taxi = null;
  }
}

// A place record by name from the city table.
function sid_placeByName(name) {
  for (const place of CITY_PLACES) {
    if (place.name === name) {
      return place;
    }
  }
  return null;
}

// Start a wreck contract: chase the target car and wreck it.
function startWreckContract(index) {
  const target = WRECK_TARGETS[index];
  if (!target) {
    return;
  }
  const v = spawnVehicle(target.model, GAME.player.x + 40, GAME.player.z, 0, 'wreck');
  GAME.vehicles[v].speed = 20;
  GAME._wreck = { target: target, vehicle: v, hp: 100, failed: false };
  GAME.ui.banner = 'WRECK — ' + target.model + ' TO ' + target.to;
}

// Tick the wreck contract: damage the target, fail if it arrives.
function sid_tickWreck(dt) {
  const wreck = GAME._wreck;
  const v = GAME.vehicles[wreck.vehicle];
  if (!v || v.hp <= 0) {
    GAME.money += wreck.target.payout;
    GAME.career.stats.cashEarned += wreck.target.payout;
    GAME.ui.banner = 'WRECKED — $' + wreck.target.payout.toLocaleString();
    GAME._wreck = null;
    return;
  }
  v.x += Math.sin(v.heading) * v.speed * dt;
  v.z += Math.cos(v.heading) * v.speed * dt;
  veh_syncMesh(wreck.vehicle);
  const dest = sid_placeByName(wreck.target.to === 'PELABUHAN' ? 'PIER 9' : 'BANK ARUNIKA');
  if (dest && distanceBetween(v.x, v.z, dest.x, dest.z) < 15) {
    GAME.ui.banner = 'TARGET ESCAPED — CONTRACT FAILED';
    GAME._wreck = null;
  }
}

// Export a stolen car at the port for +50% of its value.
function exportStolenCar(index) {
  const v = GAME.vehicles[index];
  if (!v) {
    return 0;
  }
  const model = VEHICLE_MODELS[v.model];
  const base = model ? model.value : 0;
  const bonus = EXPORT_WANTED_LIST.indexOf(v.model) >= 0 ? 1.5 : 1;
  const pay = Math.floor(base * bonus);
  GAME.money += pay;
  GAME.career.stats.cashEarned += pay;
  GAME.ui.banner = 'EXPORTED ' + v.model + ' — $' + pay.toLocaleString();
  const mesh = WORLD.meshes.vehicles[index];
  if (mesh) {
    mesh.visible = false;
  }
  v.driver = 'none';
  return pay;
}

// Collect an Arunika coin when the player walks or drives over it.
function collectArunikaCoin() {
  const p = GAME.player;
  GAME._coins = GAME._coins || [];
  for (const place of ARUNIKA_COIN_PLACES) {
    const key = place.x + ',' + place.z;
    if (GAME._coins.indexOf(key) >= 0) {
      continue;
    }
    if (distanceBetween(p.x, p.z, place.x, place.z) < 4) {
      GAME._coins.push(key);
      GAME.money += 250;
      GAME.career.stats.coinsFound += 1;
      GAME.ui.banner = 'ARUNIKA COIN — $250 (' + GAME._coins.length + '/12)';
      if (GAME._coins.length === 12) {
        GAME.money += 5000;
        GAME.ui.banner = 'ALL 12 COINS — $5,000 BONUS';
      }
      return true;
    }
  }
  return false;
}

// Land a stunt jump off a ramp: beat the distance for cash.
function landStuntJump() {
  const p = GAME.player;
  const v = p.vehicle >= 0 ? GAME.vehicles[p.vehicle] : null;
  if (!v || Math.abs(v.speed) < 15) {
    return;
  }
  for (const ramp of STUNT_RAMPS) {
    if (distanceBetween(p.x, p.z, ramp.x, ramp.z) < 10) {
      const dist = Math.abs(v.speed) * 1.8;
      if (dist > ramp.beat) {
        GAME.money += 400;
        GAME.career.stats.stunts += 1;
        GAME.ui.banner = 'STUNT — ' + ramp.name + ' ' + Math.round(dist) + ' m · $400';
      } else {
        GAME.ui.banner = 'STUNT — ' + ramp.name + ' ' + Math.round(dist) + ' m · BEAT ' + ramp.beat + ' m';
      }
      return;
    }
  }
}

// Check coin pickups and stunt ramps every step (not in showcase).
function sid_checkCoins() {
  if (GAME._showcase) {
    return;
  }
  collectArunikaCoin();
}

// Stunt check hook called from the step loop.
function sid_checkStunts(dt) {
  if (GAME.player.vehicle >= 0 && taNextRandom() < dt * 0.1) {
    landStuntJump();
  }
}
