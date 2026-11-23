// Wanted system: stars, heat, dispatch units, line of sight, arrest.

// Dispatch unit types: callsign, what it is, from how many stars, roles.
const DISPATCH_UNIT_TYPES = [
  { callsign: 'PATROL', what: 'two foot officers with batons', stars: 1, roles: ['FOOT CHASE', 'ARREST'] },
  { callsign: 'CAMAR', what: 'cruiser', stars: 2, roles: ['PURSUIT', 'RAMMING', 'PIT', 'FLANKING', 'BOX-IN'] },
  { callsign: 'KILAT', what: 'interceptor', stars: 3, roles: ['INTERCEPT'] },
  { callsign: 'BLOKIR', what: 'roadblock of two cruisers and barriers', stars: 3, roles: ['ROADBLOCK'] },
  { callsign: 'RANJAU', what: 'spike strip', stars: 3, roles: ['SPIKES'] },
  { callsign: 'ELANG-1', what: 'helicopter', stars: 4, roles: ['SPOTLIGHT', 'TRACKING'] },
  { callsign: 'BADAK-2', what: 'SWAT van with four officers', stars: 4, roles: ['BREACH', 'SHIELD'] },
  { callsign: 'MATA', what: 'rooftop sniper', stars: 5, roles: ['OVERWATCH'] },
];

// Wanted tiers: stars, most units at once, seconds hidden to lose them.
const WANTED_TIERS = [
  { stars: 0, maxUnits: 0, hideSeconds: 0 },
  { stars: 1, maxUnits: 2, hideSeconds: 12 },
  { stars: 2, maxUnits: 4, hideSeconds: 18 },
  { stars: 3, maxUnits: 6, hideSeconds: 26 },
  { stars: 4, maxUnits: 8, hideSeconds: 36 },
  { stars: 5, maxUnits: 10, hideSeconds: 48 },
];

// Crime names shown on the dispatch card.
const INCIDENT_NAMES = [
  'DISTURBANCE', 'VEHICLE THEFT', 'HIT AND RUN', 'SHOTS FIRED',
  'ASSAULT ON OFFICER', 'ARMED ROBBERY', 'EVADING ARREST',
];

// TAPD radio lines the dispatcher barks during a pursuit.
const POLICE_RADIO_LINES = [
  'All units, suspect heading east on Pantai Boulevard.',
  'ELANG-1 has eyes on the GT. Keep the net tight.',
  'Roadblock forming at the next junction. Do not let him through.',
  'Suspect is armed. Approach with caution.',
  'Spike strip ready on the boulevard. Stand by.',
  'BADAK-2 moving in. Clear the plaza.',
  'We have him boxed. Move in, move in.',
  'Suspect lost visual. Search the side streets.',
];

// Raise the wanted level by n stars, up to five, and report the crime.
function raiseWantedLevel(n, incident) {
  const p = GAME.police;
  const before = p.stars;
  p.stars = clampNumber(p.stars + n, 0, 5);
  if (incident) {
    p.incident = incident;
  }
  p.heat = 1;
  p.seen = true;
  if (p.stars > before) {
    dispatchPoliceUnits();
    GAME.ui.banner = '★'.repeat(p.stars) + ' WANTED — ' + p.incident;
    if (typeof sayCrewChatter === 'function') {
      sayCrewChatter('SARI', 'TAPD is on us — ' + p.stars + ' stars!');
    }
  }
}

// Report a crime to dispatch: witnesses raise the heat, stars follow.
function reportCrimeToDispatch(incident, x, z) {
  const p = GAME.police;
  const dist = distanceBetween(x, z, GAME.player.x, GAME.player.z);
  if (dist > 120 && p.stars === 0) {
    return;
  }
  const starsFor = {
    'DISTURBANCE': 1, 'VEHICLE THEFT': 2, 'HIT AND RUN': 2,
    'SHOTS FIRED': 3, 'ASSAULT ON OFFICER': 3,
    'ARMED ROBBERY': 4, 'EVADING ARREST': 1,
  };
  raiseWantedLevel(starsFor[incident] || 1, incident);
}

// Spawn dispatch units up to the tier cap, each with a role and a mesh.
function dispatchPoliceUnits() {
  const p = GAME.police;
  const tier = WANTED_TIERS[p.stars];
  if (!tier) {
    return;
  }
  while (p.units.length < tier.maxUnits) {
    const kind = pol_pickUnitKind(p.stars, p.units.length);
    const unit = pol_makeUnit(kind, p.units.length);
    p.units.push(unit);
  }
  if (p.stars >= 4 && !p.heli) {
    p.heli = true;
    if (typeof flyHelicopterWithSearchlight === 'function') {
      flyHelicopterWithSearchlight(0);
    }
  }
  if (p.stars >= 4 && !p.swat) {
    p.swat = true;
    if (typeof deploySwatVanAndOfficers === 'function') {
      deploySwatVanAndOfficers();
    }
  }
  pol_sortUnitsByDistance();
}

// Pick the next unit kind for the current star level and slot.
function pol_pickUnitKind(stars, slot) {
  if (stars === 1) {
    return 'PATROL';
  }
  if (slot === 0 || slot === 1) {
    return 'CAMAR';
  }
  if (stars >= 3 && slot === 2) {
    return 'KILAT';
  }
  if (stars >= 3 && slot === 3) {
    return 'BLOKIR';
  }
  if (stars >= 4 && slot === 4) {
    return 'ELANG-1';
  }
  if (stars >= 4 && slot === 5) {
    return 'BADAK-2';
  }
  if (stars >= 5 && slot >= 6) {
    return 'MATA';
  }
  return slot % 2 === 0 ? 'CAMAR' : 'PATROL';
}

// Build one unit record with a callsign, role, position and mesh.
function pol_makeUnit(kind, slot) {
  const p = GAME.player;
  const angle = taNextRandom() * Math.PI * 2;
  const dist = 40 + taNextRandom() * 60;
  const x = clampNumber(p.x + Math.sin(angle) * dist, -440, 440);
  const z = clampNumber(p.z + Math.cos(angle) * dist, -440, 440);
  const numbers = { PATROL: 11 + slot * 7, CAMAR: 12 + slot * 9, KILAT: 21 + slot * 3, BLOKIR: 3, RANJAU: 5, 'ELANG-1': 1, 'BADAK-2': 2, MATA: 7 };
  const roles = {
    PATROL: 'FOOT CHASE', CAMAR: 'PURSUIT', KILAT: 'INTERCEPT',
    BLOKIR: 'ROADBLOCK', RANJAU: 'SPIKES', 'ELANG-1': 'SPOTLIGHT',
    'BADAK-2': 'BREACH', MATA: 'OVERWATCH',
  };
  const unit = {
    kind: kind, callsign: kind + ' ' + String(numbers[kind] || slot).padStart(2, '0'),
    role: roles[kind] || 'PURSUIT', dist: dist, x: x, z: z,
    heading: 0, speed: 0, vehicle: -1, mesh: null, state: 'responding',
  };
  if (kind === 'CAMAR' || kind === 'KILAT') {
    unit.vehicle = spawnVehicle(kind === 'KILAT' ? 'TAPD KILAT' : 'TAPD CAMAR', x, z, 0, 'police');
    unit.mesh = WORLD.meshes.vehicles[unit.vehicle];
  } else if (kind === 'BADAK-2') {
    unit.vehicle = spawnVehicle('BADAK-2', x, z, 0, 'police');
    unit.mesh = WORLD.meshes.vehicles[unit.vehicle];
  } else if (kind === 'PATROL') {
    const mesh = makePersonMesh(0x1c2a4a, 'police');
    mesh.position.set(x, 0, z);
    WORLD.scene.add(mesh);
    unit.mesh = mesh;
    GAME.peds.push({ x: x, z: z, heading: 0, state: 'chase', shirt: 0x1c2a4a, marker: '', mesh: mesh, police: true });
  }
  return unit;
}

// Keep the unit list sorted by distance so the HUD shows the nearest.
function pol_sortUnitsByDistance() {
  const p = GAME.player;
  for (const u of GAME.police.units) {
    if (u.vehicle >= 0 && GAME.vehicles[u.vehicle]) {
      const v = GAME.vehicles[u.vehicle];
      u.x = v.x;
      u.z = v.z;
    }
    u.dist = distanceBetween(u.x, u.z, p.x, p.z);
  }
  GAME.police.units.sort(function byDist(a, b) {
    return a.dist - b.dist;
  });
}

// Line of sight: the police see the player when close and in the open;
// hiding cools the heat until the stars drop.
function updatePoliceLineOfSight(dt) {
  const p = GAME.police;
  if (p.stars === 0) {
    p.heat = 0;
    p.seen = false;
    return;
  }
  pol_sortUnitsByDistance();
  const nearest = p.units.length > 0 ? p.units[0].dist : 9999;
  const inVehicle = GAME.player.vehicle >= 0;
  const speed = inVehicle ? Math.abs(GAME.vehicles[GAME.player.vehicle].speed) * 3.6 : 0;
  const visible = nearest < 90 || speed > 60 || p.heli;
  if (visible) {
    p.seen = true;
    p.heat = clampNumber(p.heat + dt * 0.5, 0, 1);
    p._hiddenFor = 0;
  } else {
    p.seen = false;
    p._hiddenFor = (p._hiddenFor || 0) + dt;
    p.heat = clampNumber(p.heat - dt * 0.25, 0, 1);
    const tier = WANTED_TIERS[p.stars];
    if (p._hiddenFor > tier.hideSeconds) {
      coolDownHeatWhenHidden(dt);
    }
  }
  if (p.stars >= 3 && taNextRandom() < dt * 0.05) {
    const line = pickFromList(POLICE_RADIO_LINES);
    GAME.ui.banner = line;
  }
}

// Lose one star after staying hidden long enough.
function coolDownHeatWhenHidden(dt) {
  const p = GAME.police;
  p.stars -= 1;
  p._hiddenFor = 0;
  p.heat = 0.5;
  if (p.stars <= 0) {
    clearWantedLevel();
    return;
  }
  p.incident = 'EVADING ARREST';
  GAME.ui.banner = 'LOSING THEM — ' + p.stars + ' STARS LEFT';
  while (p.units.length > WANTED_TIERS[p.stars].maxUnits) {
    pol_removeUnit(p.units[p.units.length - 1]);
  }
}

// Clear every star, unit and roadblock: the player is clean.
function clearWantedLevel() {
  const p = GAME.police;
  p.stars = 0;
  p.heat = 0;
  p.seen = false;
  p.incident = 'NONE';
  p.heli = false;
  p.swat = false;
  for (const u of p.units.slice()) {
    pol_removeUnit(u);
  }
  p.units = [];
  for (const rb of p.roadblocks) {
    if (rb.mesh) {
      WORLD.scene.remove(rb.mesh);
    }
  }
  p.roadblocks = [];
  GAME.ui.banner = 'CLEAN — HEAT GONE';
}

// Remove one unit and hide its vehicle or officer mesh.
function pol_removeUnit(unit) {
  const p = GAME.police;
  const i = p.units.indexOf(unit);
  if (i >= 0) {
    p.units.splice(i, 1);
  }
  if (unit.vehicle >= 0 && WORLD.meshes.vehicles[unit.vehicle]) {
    WORLD.meshes.vehicles[unit.vehicle].visible = false;
    GAME.vehicles[unit.vehicle].driver = 'none';
  }
  if (unit.mesh && unit.kind === 'PATROL') {
    WORLD.scene.remove(unit.mesh);
  }
}

// Arrest or knock out: at zero health the player wakes at the hospital
// or in a cell, lighter in the pocket.
function arrestOrKnockOutPlayer(kind) {
  const p = GAME.player;
  if (kind === 'arrested') {
    GAME.ui.banner = 'ARRESTED';
    GAME.money = Math.max(0, GAME.money - 1000);
    p.health = 100;
    p.vehicle = -1;
    p.x = 180;
    p.z = -270;
  } else {
    GAME.ui.banner = 'KNOCKED OUT';
    GAME.money = Math.max(0, GAME.money - 500);
    p.health = 100;
    p.vehicle = -1;
    p.x = -20;
    p.z = 200;
  }
  p.heading = 0;
  clearWantedLevel();
  if (typeof respawnPlayerAtHospital === 'function') {
    respawnPlayerAtHospital();
  }
}
