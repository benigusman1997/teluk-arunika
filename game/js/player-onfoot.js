// Raka on foot: third-person movement, sprint, jump, crouch, aiming, health and respawn.

function updatePlayerOnFoot(dt) {
  const p = G.player;
  aimAndSprint(dt);
  const ix = (W.keys.KeyD || W.keys.ArrowRight ? 1 : 0) - (W.keys.KeyA || W.keys.ArrowLeft ? 1 : 0);
  const iz = (W.keys.KeyW || W.keys.ArrowUp ? 1 : 0) - (W.keys.KeyS || W.keys.ArrowDown ? 1 : 0);
  p.moving = (ix !== 0 || iz !== 0) && !p.carjack;
  if (p.moving) {
    // Move relative to the camera; face the way Raka walks unless he is aiming.
    const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw), len = Math.hypot(ix, iz);
    const dx = (fx * iz - fz * ix) / len, dz = (fz * iz + fx * ix) / len;
    const speed = p.sprinting ? 6.5 : p.crouch || p.aiming ? 1.9 : 3.4;
    p.x += dx * speed * dt; p.z += dz * speed * dt;
    if (!p.aiming) p.heading += clamp(angleDiff(Math.atan2(dx, dz), p.heading), -12 * dt, 12 * dt);
    p.phase += dt * speed * 2.7;
    G.stats.distance += speed * dt;
    completeTutorialHint('move');
  }
  if (p.aiming || W.mouse.left) p.heading = G.camYaw;
  const out = pushOutOfColliders(p.x, p.z, 0.38);
  p.x = out.x; p.z = out.z;
  for (const car of W.cars) {
    const d = dist2d(p.x, p.z, car.x, car.z), min = car.spec.wid * 0.5 + 0.35;
    if (d < min && d > 0.01 && Math.abs(car.y - p.y) < 1.5) { p.x = car.x + ((p.x - car.x) / d) * min; p.z = car.z + ((p.z - car.z) / d) * min; }
  }
  const ground = groundHeightAt(p.x, p.z);
  if (W.keysHit.Space && p.y <= ground + 0.02 && !p.crouch) p.vy = 5.2;
  if (p.y > ground || p.vy > 0) { p.vy -= 16 * dt; p.y += p.vy * dt; if (p.y <= ground) { p.y = ground; p.vy = 0; } } else p.y = ground;
  if (!isLandAt(p.x, p.z)) sinkPlayerInWater();
  if (p.hurt > 0) p.hurt -= dt;
  if (p.punch > 0) p.punch -= dt;
  if (W.keysHit.KeyV) { G.camYaw += Math.PI; W.cam.snap = true; }
  stealNearestCar(dt);
  updatePlayerMesh();
}

function aimAndSprint(dt) {
  const p = G.player, sens = 0.0026 * G.settings.sensitivity;
  if (!G.wheelOpen) {
    G.camYaw -= W.mouse.dx * sens;
    G.camPitch = clamp(G.camPitch + W.mouse.dy * sens * (G.settings.invertY ? -1 : 1), -0.55, 0.9);
  }
  // Arrow-less mouse fallback: Q and E are taken, so [ and ] also turn the camera.
  G.camYaw += ((W.keys.BracketLeft ? 1 : 0) - (W.keys.BracketRight ? 1 : 0)) * 2.2 * dt;
  p.aiming = W.mouse.right && WEAPONS[G.weaponIndex].id !== 'fists';
  if (W.keysHit.ControlLeft) p.crouch = !p.crouch;
  p.sprinting = !!W.keys.ShiftLeft && p.moving && !p.aiming && !p.crouch;
  if (p.sprinting) p.crouch = false;
}

function hurtPlayer(amount, cause) {
  if (G.mode !== 'playing' || W.showcase || G.player.respawning) return;
  let dmg = amount;
  if (G.armour > 0 && cause !== 'drowned') { const soak = Math.min(G.armour, dmg * 0.7); G.armour -= soak; dmg -= soak; }
  G.health -= dmg;
  G.player.hurt = 0.35;
  if (G.settings.shake) addCameraShake(0.18);
  if (G.health <= 0) wastePlayer(cause);
}

function wastePlayer(cause) {
  const fee = Math.round(G.money * 0.1);
  G.stats.wasted++;
  G.money -= fee;
  respawnPlayerAtSafehouse('WASTED', (cause === 'drowned' ? 'Swept out of the bay' : 'Patched up at the clinic') + ' - ' + formatMoney(fee) + ' in bills');
}

function arrestPlayer() {
  const fee = Math.round(G.money * 0.15);
  G.stats.busted++;
  G.money -= fee;
  for (let i = 1; i < G.weapons.length; i++) G.weapons[i].reserve = Math.floor(G.weapons[i].reserve * 0.5);
  respawnPlayerAtSafehouse('BUSTED', 'TAPD took ' + formatMoney(fee) + ' and half your ammunition');
}

function respawnPlayerAtSafehouse(title, sub) {
  const p = G.player, home = PLACES[G.lastSafehouse];
  if (G.contract) failContract(title === 'BUSTED' ? 'You were arrested' : 'You were taken out');
  if (G.activity) endActivity(false, title);
  if (p.car) { p.car.kind = 'parked'; p.car.occupied = false; p.car = null; }
  clearWantedLevel(false);
  p.x = home.x; p.z = home.z + 4; p.y = 0; p.vy = 0; p.onFoot = true; p.carjack = null; p.crouch = false;
  G.health = 100;
  G.clock = (G.clock + 180) % 1440;
  if (G.clock < 180) advanceDebtDay();
  applyTimeOfDay(G.clock);
  W.cam.snap = true;
  showBanner(title, sub, 4);
  playUiSound('fail');
}

function rebuildPlayerMesh() {
  const id = WEAPONS[G.weaponIndex].id;
  const weapon = id === 'fists' ? null : id === 'pistol' ? 'pistol' : id === 'smg' ? 'smg' : 'rifle';
  if (W.playerMesh) W.scene.remove(W.playerMesh);
  W.playerMesh = makePersonMesh(Object.assign({}, PERSON_LOOKS.raka, { weapon: weapon }));
  W.scene.add(W.playerMesh);
  updatePlayerMesh();
}

function updatePlayerMesh() {
  const p = G.player, m = W.playerMesh;
  m.visible = !p.car;
  if (p.car) return;
  m.position.set(p.x, p.y, p.z);
  m.rotation.y = p.heading;
  const armed = WEAPONS[G.weaponIndex].id !== 'fists';
  let pose = 'stand';
  if (p.carjack) pose = 'drag';
  else if (p.punch > 0) pose = 'punch';
  else if (p.crouch) pose = armed ? 'crouch' : 'hide';
  else if (p.aiming || (armed && G.fireCooldown > 0)) pose = 'aim';
  else if (p.sprinting || p.y > groundHeightAt(p.x, p.z) + 0.1) pose = 'run';
  else if (p.moving) pose = 'walk';
  posePerson(m, pose, p.phase);
}
