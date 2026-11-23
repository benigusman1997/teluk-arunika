// Street races: three routes, checkpoints, rival racers, prizes.

// Race routes: name, length, checkpoints, prize, record time.
const RACE_ROUTES = [
  { name: 'PANTAI SPRINT', length: '1.8 km', checkpoints: 8, prize: 1200, record: '1:42.3' },
  { name: 'LINGKAR NEON', length: '2.4 km', checkpoints: 12, prize: 2000, record: '2:18.6' },
  { name: 'TANJAKAN ABU', length: '3.1 km', checkpoints: 14, prize: 3500, record: '3:05.9' },
];

// Rival racers: name and their car.
const RACE_RIVALS = [
  { name: 'DIMAS', model: 'SRIKANDI GT' },
  { name: 'WULAN', model: 'MERAK COUPE' },
  { name: 'JOKO', model: 'HARIMAU SEDAN' },
];

// Start a street race on a route: checkpoints, rivals, timer.
function startStreetRace(routeIndex) {
  const route = RACE_ROUTES[routeIndex];
  if (!route) {
    return;
  }
  GAME._race = {
    route: route, checkpoint: 0, time: 0,
    rivals: [], finished: false,
  };
  const startX = -360;
  const startZ = 360;
  for (let i = 0; i < 3; i++) {
    const rival = RACE_RIVALS[i];
    const index = spawnVehicle(rival.model, startX - 6 - i * 6, startZ + (i % 2) * 4, Math.PI / 2, 'rival');
    GAME._race.rivals.push({ name: rival.name, vehicle: index, progress: 0 });
  }
  GAME.ui.banner = 'RACE — ' + route.name + ' · ' + route.checkpoints + ' CHECKPOINTS';
  GAME.ui.dialogue = {
    who: 'SARI', role: 'Crew driver',
    text: 'Beat the record ' + route.record + ' and the prize is ours.',
  };
}

// Advance the race: checkpoints passed, rivals driving, finish.
function updateRaceCheckpoints(dt) {
  const race = GAME._race;
  if (!race || race.finished || GAME.mode !== 'playing') {
    return;
  }
  race.time += dt;
  driveRivalRacers(dt);
  const p = GAME.player;
  if (p.vehicle < 0) {
    return;
  }
  const v = GAME.vehicles[p.vehicle];
  const route = race.route;
  const total = route.checkpoints;
  const progress = clampNumber((v.x + 360) / 720, 0, 1);
  const nextCp = Math.floor(progress * total) + 1;
  if (nextCp > race.checkpoint && nextCp <= total) {
    race.checkpoint = nextCp;
    GAME.ui.banner = 'CHECKPOINT ' + race.checkpoint + '/' + total;
    if (typeof spawnObjectiveBeacon === 'function') {
      spawnObjectiveBeacon(v.x + 60, v.z);
    }
  }
  if (progress >= 1) {
    finishRaceAndPayPrize();
  }
}

// Drive the rival racers along the route at their own pace.
function driveRivalRacers(dt) {
  const race = GAME._race;
  if (!race) {
    return;
  }
  for (const rival of race.rivals) {
    const v = GAME.vehicles[rival.vehicle];
    if (!v) {
      continue;
    }
    const model = VEHICLE_MODELS[v.model];
    const cruise = (model.top / 3.6) * 0.82;
    v.speed = lerpNumber(v.speed, cruise, 0.02);
    v.x += Math.sin(v.heading) * v.speed * dt;
    v.z += Math.cos(v.heading) * v.speed * dt;
    if (v.x > 440) {
      v.x = -440;
    }
    rival.progress = clampNumber((v.x + 360) / 720, 0, 1);
    veh_syncMesh(rival.vehicle);
  }
}

// Finish the race: prize, record check and rank points.
function finishRaceAndPayPrize() {
  const race = GAME._race;
  if (!race || race.finished) {
    return;
  }
  race.finished = true;
  const won = race.checkpoint >= race.route.checkpoints;
  const bestRival = Math.max.apply(null, race.rivals.map(function progress(r) { return r.progress; }));
  const playerWon = won && bestRival < 1;
  if (playerWon) {
    GAME.money += race.route.prize;
    GAME.career.stats.racesWon += 1;
    GAME.career.stats.cashEarned += race.route.prize;
    GAME.ui.banner = 'RACE WON — $' + race.route.prize.toLocaleString();
    if (typeof awardRankPoints === 'function') {
      awardRankPoints(150);
    }
  } else {
    GAME.ui.banner = 'RACE LOST — THE RECORD STANDS';
  }
  GAME._race = null;
}
