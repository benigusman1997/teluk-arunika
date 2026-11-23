// Chase, hood, cinematic look-back and on-foot cameras, plus the title orbit and camera shake.

function updateChaseCamera(dt, car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const back = 6.6 + Math.abs(car.speed) * 0.035;
  placeCamera(dt, car.x - fx * back, car.y + 2.7, car.z - fz * back, car.x + fx * 5, car.y + 1.2, car.z + fz * 5, 62 + Math.min(10, Math.abs(car.speed) * 0.14), 7);
}

function updateHoodCamera(dt, car) {
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  placeCamera(dt, car.x + fx * 0.5, car.y + 1.32, car.z + fz * 0.5, car.x + fx * 40, car.y + 1.0, car.z + fz * 40, 68, 30);
}

function updateLookBackCamera(dt, car) {
  // Ahead of the car and low, looking back at its front three-quarter and at whatever chases it.
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  const sx = fz, sz = -fx;
  placeCamera(dt, car.x + fx * 8.4 + sx * 2.7, car.y + 2.75, car.z + fz * 8.4 + sz * 2.7, car.x - fx * 7 - sx * 0.3, car.y + 0.85, car.z - fz * 7 - sz * 0.3, 58, 9);
}

function updateOnFootCamera(dt) {
  const p = G.player;
  const yaw = G.camYaw, pitch = G.camPitch;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const rx = -fz, rz = fx;
  const aim = p.aiming;
  // W.cam.pull widens the shoulder view (mouse wheel in play, fixed in the staged scenes).
  const pull = W.cam.pull;
  let dist = (aim ? 3.5 : 4.2) + pull;
  const side = (aim ? 1.3 : 0.55) + pull * 0.6;
  const headY = p.y + (p.crouch ? 1.25 : 1.72);
  // Pull the camera in when a wall is between it and Raka.
  for (let d = 1.0; d <= dist; d += 0.5) {
    if (pointBlocked(p.x - fx * d + rx * side, p.z - fz * d + rz * side)) { dist = Math.max(0.9, d - 0.5); break; }
  }
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cx = p.x - fx * cp * dist + rx * side, cy = headY + sp * dist + 0.15, cz = p.z - fz * cp * dist + rz * side;
  placeCamera(dt, cx, cy, cz, cx + fx * cp * 30, cy - sp * 30, cz + fz * cp * 30, aim ? 50 : 60, 14);
}

function cycleCameraMode() {
  const order = ['chase', 'hood', 'lookback'];
  G.cameraMode = order[(order.indexOf(G.cameraMode) + 1) % order.length];
  showBanner(G.cameraMode === 'lookback' ? 'CINEMATIC CAMERA' : G.cameraMode.toUpperCase() + ' CAMERA', '', 1.2);
  W.cam.snap = true;
}

function updateTitleOrbitCamera(dt) {
  W.cam.orbit += dt * 0.012;
  const a = W.cam.orbit;
  placeCamera(dt, 118 + Math.sin(a) * 30, 46, 452 + Math.cos(a) * 12, -40, 34, 0, 50, 3);
}

function updateActiveCamera(dt) {
  const p = G.player;
  if (G.mode === 'title') updateTitleOrbitCamera(dt);
  else if (p.car) {
    if (G.cameraMode === 'hood') updateHoodCamera(dt, p.car);
    else if (G.cameraMode === 'lookback') updateLookBackCamera(dt, p.car);
    else updateChaseCamera(dt, p.car);
  } else updateOnFootCamera(dt);
  const focus = playerPosition();
  const ahead = G.mode === 'title' ? 0 : 14;
  const dir = new THREE.Vector3().subVectors(W.cam.look, W.cam.pos).setY(0).normalize();
  if (G.mode === 'title') updateSunShadows(W.cam.look.x, W.cam.look.z + 150);
  else updateSunShadows(focus.x + dir.x * ahead, focus.z + dir.z * ahead);
}

function placeCamera(dt, px, py, pz, lx, ly, lz, fov, stiffness) {
  const c = W.cam;
  const k = c.snap ? 1 : 1 - Math.exp(-dt * stiffness);
  c.pos.x = lerp(c.pos.x, px, k); c.pos.y = lerp(c.pos.y, py, k); c.pos.z = lerp(c.pos.z, pz, k);
  const kl = c.snap ? 1 : 1 - Math.exp(-dt * stiffness * 1.6);
  c.look.x = lerp(c.look.x, lx, kl); c.look.y = lerp(c.look.y, ly, kl); c.look.z = lerp(c.look.z, lz, kl);
  c.snap = false;
  const cam = W.camera;
  cam.position.copy(c.pos);
  if (c.shake > 0.001 && G.settings.shake) {
    cam.position.x += (Math.random() - 0.5) * c.shake;
    cam.position.y += (Math.random() - 0.5) * c.shake;
    c.shake *= Math.exp(-dt * 6);
  }
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = lerp(cam.fov, fov, k); cam.updateProjectionMatrix(); }
  cam.lookAt(c.look);
}

function addCameraShake(amount) {
  W.cam.shake = Math.min(1.2, W.cam.shake + amount);
}
