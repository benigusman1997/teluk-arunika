// Air and SWAT: the ELANG-1 helicopter with its searchlight, the
// BADAK-2 SWAT van, breach officers and rooftop snipers.

// Fly the helicopter above the player, rotor spinning, searchlight
// cone tracking the car and a bright disc on the road below it.
function flyHelicopterWithSearchlight(dt) {
  const p = GAME.police;
  if (!WORLD._heli) {
    const heli = makeHelicopterMesh();
    WORLD.scene.add(heli);
    WORLD._heli = heli;
    WORLD._heliPos = { x: GAME.player.x, z: GAME.player.z, y: 42 };
  }
  const heli = WORLD._heli;
  const pos = WORLD._heliPos;
  const tx = GAME.player.x + 8;
  const tz = GAME.player.z - 6;
  pos.x = lerpNumber(pos.x, tx, 0.02);
  pos.z = lerpNumber(pos.z, tz, 0.02);
  pos.y = 42 + Math.sin(performance.now() / 1400) * 1.5;
  heli.position.set(pos.x, pos.y, pos.z);
  heli.rotation.y = Math.atan2(GAME.player.x - pos.x, GAME.player.z - pos.z);
  if (heli.userData.rotor) {
    heli.userData.rotor.rotation.y += dt * 22;
  }
  if (heli.userData.searchDisc) {
    heli.userData.searchDisc.position.set(
      GAME.player.x - pos.x, -pos.y + 0.2, GAME.player.z - pos.z,
    );
  }
  if (p.stars >= 4) {
    p.heli = true;
  }
}

// Aim the searchlight cone straight down at the player's position.
function aimSearchlightConeAtPlayer() {
  const heli = WORLD._heli;
  if (!heli) {
    return;
  }
  const cone = heli.userData.searchCone;
  if (!cone) {
    return;
  }
  const dx = GAME.player.x - heli.position.x;
  const dz = GAME.player.z - heli.position.z;
  cone.rotation.z = Math.atan2(dx, heli.position.y) * 0.4;
  cone.rotation.x = Math.PI + Math.atan2(dz, heli.position.y) * 0.4;
}

// Deploy the SWAT van and four officers near the player's position.
function deploySwatVanAndOfficers() {
  const p = GAME.police;
  if (p._swatDeployed) {
    return;
  }
  p._swatDeployed = true;
  const x = clampNumber(GAME.player.x + 30, -440, 440);
  const z = clampNumber(GAME.player.z + 10, -440, 440);
  const vanIndex = spawnVehicle('BADAK-2', x, z, 0, 'police');
  const van = GAME.vehicles[vanIndex];
  van.heading = Math.atan2(GAME.player.x - x, GAME.player.z - z);
  veh_syncMesh(vanIndex);
  p._swatVan = vanIndex;
  p._swatOfficers = [];
  for (let i = 0; i < 4; i++) {
    const mesh = makePersonMesh(0x111111, 'swat');
    const ox = x + (i % 2 === 0 ? -3 : 3);
    const oz = z + 4 + Math.floor(i / 2) * 3;
    mesh.position.set(ox, 0, oz);
    WORLD.scene.add(mesh);
    p._swatOfficers.push({ x: ox, z: oz, mesh: mesh, state: 'advance', shield: i === 0 });
    if (i === 0) {
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.3, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x1c2a4a }),
      );
      shield.position.set(0, 1.1, 0.3);
      mesh.add(shield);
    }
  }
  GAME.ui.banner = 'SWAT ARUNIKA DEPLOYED — BADAK-2';
}

// Advance SWAT officers toward the player and let the sniper watch.
function updateSwatBreachAndSniper(dt) {
  const p = GAME.police;
  if (!p._swatOfficers) {
    return;
  }
  for (const officer of p._swatOfficers) {
    const dx = GAME.player.x - officer.x;
    const dz = GAME.player.z - officer.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > 8) {
      officer.x += (dx / d) * 3.2 * dt;
      officer.z += (dz / d) * 3.2 * dt;
      officer.mesh.position.set(officer.x, 0, officer.z);
      officer.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      officer.state = 'hold';
      if (taNextRandom() < dt * 0.4 && typeof applyBulletDamage === 'function') {
        applyBulletDamage(GAME.player, 4, 'swat');
      }
    }
  }
  if (p.stars >= 5 && !p._sniper) {
    placeRooftopSniper();
  }
  if (p._sniper && taNextRandom() < dt * 0.2) {
    GAME.ui.banner = 'MATA 07 — OVERWATCH ON THE ROOF';
  }
}

// Place a rooftop sniper above the nearest tall building.
function placeRooftopSniper() {
  const p = GAME.police;
  const x = Math.round(GAME.player.x / 90) * 90 + 20;
  const z = Math.round(GAME.player.z / 90) * 90 - 20;
  const mesh = makePersonMesh(0x111111, 'swat');
  mesh.position.set(x, 24, z);
  WORLD.scene.add(mesh);
  p._sniper = { x: x, z: z, mesh: mesh };
  p.units.push({
    kind: 'MATA', callsign: 'MATA 07', role: 'OVERWATCH',
    dist: distanceBetween(x, z, GAME.player.x, GAME.player.z),
    x: x, z: z, heading: 0, speed: 0, vehicle: -1, mesh: mesh,
    state: 'overwatch',
  });
}

// Remove the helicopter and SWAT when the heat is gone.
function air_clearAirUnits() {
  if (WORLD._heli) {
    WORLD.scene.remove(WORLD._heli);
    WORLD._heli = null;
  }
  const p = GAME.police;
  if (p._swatOfficers) {
    for (const officer of p._swatOfficers) {
      WORLD.scene.remove(officer.mesh);
    }
    p._swatOfficers = null;
  }
  p._swatDeployed = false;
  if (p._sniper) {
    WORLD.scene.remove(p._sniper.mesh);
    p._sniper = null;
  }
}
