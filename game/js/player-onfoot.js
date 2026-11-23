// The player on foot: walking, sprinting, jumping, aiming, interacting,
// taking damage and respawning at the hospital.

// Walk Raka with WASD, sprint with Shift, jump with Space, aim with
// the right mouse button; E interacts, Q opens the weapon wheel.
function updatePlayerOnFoot(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  const p = GAME.player;
  if (p.vehicle >= 0) {
    plr_syncPlayerMesh();
    if (inp_pressed.KeyE) {
      enterOrExitVehicle();
    }
    return;
  }
  const speed = inp_isDown('sprint') ? 9 : 4.5;
  p.sprinting = inp_isDown('sprint');
  let mx = 0;
  let mz = 0;
  if (inp_isDown('forward')) {
    mz += 1;
  }
  if (inp_isDown('back')) {
    mz -= 1;
  }
  if (inp_isDown('left')) {
    mx -= 1;
  }
  if (inp_isDown('right')) {
    mx += 1;
  }
  if (mx !== 0 || mz !== 0) {
    const len = Math.sqrt(mx * mx + mz * mz);
    mx /= len;
    mz /= len;
    const camYaw = GAME.ui.lookYaw;
    const wx = mx * Math.cos(camYaw) + mz * Math.sin(camYaw);
    const wz = -mx * Math.sin(camYaw) + mz * Math.cos(camYaw);
    p.heading = Math.atan2(wx, wz);
    const nx = p.x + wx * speed * dt;
    const nz = p.z + wz * speed * dt;
    const fixed = collideWithBuildings(nx, nz, 0.6);
    p.x = clampNumber(fixed.x, -448, 448);
    p.z = clampNumber(fixed.z, -448, 448);
    p.action = 'walk';
  } else {
    p.action = 'idle';
  }
  p.aiming = inp_isDown('aim');
  if (inp_pressed.Space) {
    sprintJumpAndAim(dt);
  }
  if (inp_pressed.KeyQ) {
    GAME.ui.wheelOpen = !GAME.ui.wheelOpen;
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit1) {
    selectWeaponSlot(1);
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit2) {
    selectWeaponSlot(2);
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit3) {
    selectWeaponSlot(3);
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit4) {
    selectWeaponSlot(4);
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit5) {
    selectWeaponSlot(5);
  }
  if (GAME.ui.wheelOpen && inp_pressed.Digit6) {
    selectWeaponSlot(6);
  }
  if (inp_pressed.KeyR && typeof reloadWeapon === 'function') {
    reloadWeapon();
  }
  if (inp_pressed.KeyE) {
    interactWithNearestThing();
  }
  if (inp_isDown('fire') && typeof fireCurrentWeapon === 'function') {
    fireCurrentWeapon(dt);
  }
  plr_checkVehicleHits(dt);
  plr_syncPlayerMesh();
}

// Sprint burst, jump and aim: Space jumps, right button aims.
function sprintJumpAndAim(dt) {
  const p = GAME.player;
  p.y = 0.9;
  p._jumpVel = 4;
  GAME.ui.banner = '';
}

// Interact with the nearest thing: car, shop, phone box, mission spot.
function interactWithNearestThing() {
  const p = GAME.player;
  let best = null;
  let bestD = 4;
  for (let i = 0; i < GAME.vehicles.length; i++) {
    const v = GAME.vehicles[i];
    const d = distanceBetween(p.x, p.z, v.x, v.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best !== null) {
    GAME.ui.promptProgress = 0.01;
    updateCarTheftProgress(1 / 60, best);
    return;
  }
  for (const shop of SHOP_LOCATIONS) {
    if (distanceBetween(p.x, p.z, shop.x, shop.z) < 6) {
      if (typeof openShopAtPlace === 'function') {
        openShopAtPlace(shop.id);
      }
      return;
    }
  }
  GAME.ui.prompt = 'NOTHING TO USE HERE';
}

// Damage the player; armour absorbs first, then health. At zero health
// the player is knocked out and wakes at the hospital. God-mode
// showcase scenes never take damage.
function takePlayerDamage(amount, source) {
  if (GAME._godMode) {
    return;
  }
  const p = GAME.player;
  let left = amount;
  if (p.armour > 0) {
    const absorbed = Math.min(p.armour, left);
    p.armour -= absorbed;
    left -= absorbed;
  }
  p.health -= left;
  if (p.health <= 0) {
    p.health = 0;
    if (GAME.police.stars > 0) {
      arrestOrKnockOutPlayer('arrested');
    } else {
      arrestOrKnockOutPlayer('knocked out');
    }
  }
}

// Respawn at RS Arunika hospital with full health and no vehicle.
function respawnPlayerAtHospital() {
  const p = GAME.player;
  p.x = -20;
  p.z = 200;
  p.y = 0;
  p.health = 100;
  p.vehicle = -1;
  p.heading = Math.PI;
  plr_syncPlayerMesh();
}

// Cars and peds that hit the player on foot knock him down.
// Showcase scenes are god-mode: the staged player never gets hurt.
function plr_checkVehicleHits(dt) {
  if (GAME._godMode) {
    return;
  }
  const p = GAME.player;
  for (const v of GAME.vehicles) {
    if (v.driver === 'none' || Math.abs(v.speed) < 3) {
      continue;
    }
    if (distanceBetween(p.x, p.z, v.x, v.z) < 2.2) {
      takePlayerDamage(Math.abs(v.speed) * 1.5, 'car');
      p.x += Math.sin(v.heading) * 3;
      p.z += Math.cos(v.heading) * 3;
      return;
    }
  }
}

// Keep the player mesh on the player record, creating it on demand.
function plr_syncPlayerMesh() {
  if (!WORLD.meshes.player) {
    WORLD.meshes.player = makePersonMesh(0x18b89a, 'raka');
    WORLD.scene.add(WORLD.meshes.player);
  }
  const mesh = WORLD.meshes.player;
  const p = GAME.player;
  mesh.position.set(p.x, p.y || 0, p.z);
  mesh.rotation.y = p.heading;
  mesh.visible = true;
  if (p.vehicle >= 0) {
    mesh.visible = false;
  }
}
