// Weapons and combat: six slots, firing, reload, weapon wheel,
// bullet damage, enemy cover AI, gunmen and drive-by shooting.

// Weapons: slot, name, kind, damage, shots per second, magazine,
// reserve, range in metres, price.
const WEAPONS = [
  { slot: 1, name: 'FISTS', kind: 'melee', damage: 12, rate: 2, mag: 0, reserve: 0, range: 2, price: 0 },
  { slot: 2, name: 'P-9', kind: 'pistol', damage: 22, rate: 4, mag: 12, reserve: 96, range: 45, price: 400 },
  { slot: 3, name: 'CICAK', kind: 'smg', damage: 14, rate: 11, mag: 30, reserve: 240, range: 40, price: 1200 },
  { slot: 4, name: 'GAJAH 12', kind: 'shotgun', damage: 8, rate: 1.2, mag: 8, reserve: 48, range: 18, price: 1800, pellets: 9 },
  { slot: 5, name: 'AR-GARUDA', kind: 'rifle', damage: 28, rate: 8, mag: 30, reserve: 180, range: 80, price: 3200 },
  { slot: 6, name: 'PEMBURU', kind: 'sniper', damage: 120, rate: 0.8, mag: 5, reserve: 30, range: 220, price: 4500 },
];

// Enemy gunmen spawned by missions and the bank heist.
let wpn_enemies = [];

// Fire the current weapon: rate-limited, ammo, muzzle flash, tracer,
// damage to the nearest enemy or pedestrian in the aim line.
function fireCurrentWeapon(dt) {
  const p = GAME.player;
  const slot = p.weaponSlot;
  const weapon = WEAPONS[slot - 1];
  if (!weapon) {
    return;
  }
  p._fireCool = (p._fireCool || 0) - dt;
  if (p._fireCool > 0) {
    return;
  }
  p._fireCool = 1 / weapon.rate;
  if (weapon.kind === 'melee') {
    wpn_meleeSwing(weapon);
    return;
  }
  const ammo = p.ammo[slot - 1];
  if (ammo.mag <= 0) {
    reloadWeapon();
    return;
  }
  ammo.mag -= 1;
  const pellets = weapon.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    wpn_fireOneBullet(weapon);
  }
  if (typeof spawnMuzzleFlashAndTracer === 'function') {
    spawnMuzzleFlashAndTracer(p.x, p.z, p.heading);
  }
  if (typeof playGunshotSound === 'function') {
    playGunshotSound();
  }
  GAME._gunfireAt = { x: p.x, z: p.z };
  if (typeof makeTrafficFleeGunfire === 'function') {
    makeTrafficFleeGunfire(p.x, p.z);
  }
  reportCrimeToDispatch('SHOTS FIRED', p.x, p.z);
}

// One bullet: hit the nearest enemy, guard or ped in a narrow cone.
function wpn_fireOneBullet(weapon) {
  const p = GAME.player;
  const spread = (taNextRandom() - 0.5) * 0.12;
  const dir = p.heading + spread;
  let best = null;
  let bestD = weapon.range;
  for (const enemy of wpn_enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    const d = distanceBetween(p.x, p.z, enemy.x, enemy.z);
    if (d > bestD) {
      continue;
    }
    const ang = Math.atan2(enemy.x - p.x, enemy.z - p.z);
    if (Math.abs(angleDifference(ang, dir)) < 0.12) {
      best = enemy;
      bestD = d;
    }
  }
  if (best) {
    applyBulletDamage(best, weapon.damage, 'player');
    if (typeof spawnHitMarker === 'function') {
      spawnHitMarker(best.x, best.z, weapon.damage);
    }
    return;
  }
  for (const ped of GAME.peds) {
    if (ped.state === 'down' || ped.police) {
      continue;
    }
    const d = distanceBetween(p.x, p.z, ped.x, ped.z);
    if (d > weapon.range) {
      continue;
    }
    const ang = Math.atan2(ped.x - p.x, ped.z - p.z);
    if (Math.abs(angleDifference(ang, dir)) < 0.1) {
      knockDownPedestrian(ped);
      return;
    }
  }
}

// A melee swing hits whatever is right in front of the player.
function wpn_meleeSwing(weapon) {
  const p = GAME.player;
  for (const enemy of wpn_enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    if (distanceBetween(p.x, p.z, enemy.x, enemy.z) < 2.2) {
      applyBulletDamage(enemy, weapon.damage, 'player');
      return;
    }
  }
}

// Reload the current weapon from the reserve, or report it empty.
function reloadWeapon() {
  const p = GAME.player;
  const weapon = WEAPONS[p.weaponSlot - 1];
  const ammo = p.ammo[p.weaponSlot - 1];
  if (weapon.kind === 'melee') {
    return;
  }
  if (ammo.reserve <= 0) {
    GAME.ui.banner = weapon.name + ' — OUT OF AMMO';
    return;
  }
  const need = weapon.mag - ammo.mag;
  const take = Math.min(need, ammo.reserve);
  ammo.mag += take;
  ammo.reserve -= take;
  GAME.ui.banner = weapon.name + ' RELOADED';
}

// Open the weapon wheel and pause the action around it.
function openWeaponWheel() {
  GAME.ui.wheelOpen = true;
}

// Select a weapon slot from the wheel and close it.
function selectWeaponSlot(slot) {
  GAME.player.weaponSlot = clampNumber(slot, 1, 6);
  GAME.ui.wheelOpen = false;
  GAME.ui.banner = WEAPONS[slot - 1].name + ' READY';
}

// Apply bullet damage to any target with hp: enemies, the player,
// guards and vehicles. Returns true when the target drops.
function applyBulletDamage(target, damage, source) {
  if (target === GAME.player) {
    takePlayerDamage(damage, source);
    return GAME.player.health <= 0;
  }
  if (target.hp === undefined) {
    return false;
  }
  target.hp -= damage;
  if (target.hp <= 0) {
    target.hp = 0;
    if (target.mesh) {
      target.mesh.rotation.x = -Math.PI / 2;
      target.mesh.position.y = 0.3;
    }
    if (target.kind === 'guard' && GAME.mission.counterMax > 0) {
      GAME.mission.counter += 1;
    }
    if (typeof awardRankPoints === 'function') {
      awardRankPoints(10);
    }
    return true;
  }
  return false;
}

// Enemy cover AI: gunmen move between cover points, peek and shoot.
function updateEnemyCoverAI(dt) {
  for (const enemy of wpn_enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    const d = distanceBetween(enemy.x, enemy.z, GAME.player.x, GAME.player.z);
    enemy._cool = (enemy._cool || 0) - dt;
    if (d > 40) {
      const dx = GAME.player.x - enemy.x;
      const dz = GAME.player.z - enemy.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      enemy.x += (dx / len) * 4 * dt;
      enemy.z += (dz / len) * 4 * dt;
    } else if (enemy._cool <= 0 && d < 45) {
      enemy._cool = 1.2 + taNextRandom();
      if (taNextRandom() > 0.35) {
        takePlayerDamage(6 + Math.floor(taNextRandom() * 8), 'gunman');
        if (typeof spawnMuzzleFlashAndTracer === 'function') {
          spawnMuzzleFlashAndTracer(enemy.x, enemy.z, Math.atan2(GAME.player.x - enemy.x, GAME.player.z - enemy.z));
        }
      }
    }
    if (enemy.mesh) {
      enemy.mesh.position.set(enemy.x, 0, enemy.z);
      enemy.mesh.rotation.y = Math.atan2(GAME.player.x - enemy.x, GAME.player.z - enemy.z);
    }
  }
}

// Spawn one enemy gunman at a place, with a mesh and health.
function spawnEnemyGunman(x, z, kind, hp) {
  const shirt = kind === 'guard' ? 0x6b6f78 : 0x2a2f3a;
  const mesh = makePersonMesh(shirt, 'walk');
  mesh.position.set(x, 0, z);
  WORLD.scene.add(mesh);
  const enemy = {
    x: x, z: z, hp: hp || 60, maxHp: hp || 60,
    kind: kind || 'gunman', mesh: mesh, _cool: 1,
  };
  wpn_enemies.push(enemy);
  return enemy;
}

// Shoot from a moving vehicle: same weapon, worse spread, one hand.
function shootFromVehicle(dt) {
  const p = GAME.player;
  if (p.vehicle < 0) {
    return;
  }
  p._fireCool = (p._fireCool || 0) - dt;
  if (p._fireCool > 0 || !inp_isDown('fire')) {
    return;
  }
  const weapon = WEAPONS[p.weaponSlot - 1];
  if (weapon.kind === 'melee') {
    return;
  }
  fireCurrentWeapon(dt);
}

// Clear all spawned enemies, for example when a mission restarts.
function wpn_clearEnemies() {
  for (const enemy of wpn_enemies) {
    if (enemy.mesh) {
      WORLD.scene.remove(enemy.mesh);
    }
  }
  wpn_enemies = [];
}
