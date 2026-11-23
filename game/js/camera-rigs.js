// Camera rigs: chase, hood, look-back and on-foot cameras, plus shake.

// Camera modes in cycle order.
const cam_MODES = ['chase', 'hood', 'lookback', 'far'];
let cam_shakeAmount = 0;
let cam_shakeTime = 0;

// Pick the right rig for the current state and run it every step.
function updateActiveCamera(dt) {
  if (!GAME || !WORLD || !WORLD.camera) {
    return;
  }
  if (GAME.mode === 'title') {
    cam_titleOrbit(dt);
    return;
  }
  const mode = cam_MODES[GAME.ui.cameraMode] || 'chase';
  if (GAME.player.vehicle >= 0) {
    if (mode === 'hood') {
      updateHoodCamera(dt);
    } else if (mode === 'lookback') {
      updateLookBackCamera(dt);
    } else {
      updateChaseCamera(dt);
    }
  } else {
    updateOnFootCamera(dt);
  }
  if (cam_shakeTime > 0 && GAME.settings.shake) {
    cam_shakeTime -= dt;
    const s = cam_shakeAmount * (cam_shakeTime > 0 ? 1 : 0);
    WORLD.camera.position.x += (taNextRandom() - 0.5) * s;
    WORLD.camera.position.y += (taNextRandom() - 0.5) * s * 0.5;
  }
}

// Slow orbit over the bay for the title screen backdrop.
function cam_titleOrbit(dt) {
  const t = (performance.now() / 1000) * 0.02;
  const cx = 120 + Math.cos(t) * 260;
  const cz = 180 + Math.sin(t) * 160;
  WORLD.camera.position.set(cx, 95, cz);
  WORLD.camera.lookAt(80, 10, -60);
}

// Chase camera: 7.5 m behind the car, 3.4 m up, FOV 62, speed pull-back,
// plus a look-around yaw from the mouse.
function updateChaseCamera(dt) {
  const v = GAME.vehicles[GAME.player.vehicle];
  if (!v) {
    return;
  }
  const speedKmh = Math.abs(v.speed) * 3.6;
  const pull = 7.5 + speedKmh * 0.012;
  const height = 3.4 + speedKmh * 0.004;
  const yaw = v.heading + GAME.ui.lookYaw + Math.PI;
  const tx = v.x + Math.sin(yaw) * pull;
  const tz = v.z + Math.cos(yaw) * pull;
  const cam = WORLD.camera;
  cam.position.x = lerpNumber(cam.position.x, tx, 0.18);
  cam.position.y = lerpNumber(cam.position.y, height, 0.18);
  cam.position.z = lerpNumber(cam.position.z, tz, 0.18);
  const lookX = v.x + Math.sin(v.heading + GAME.ui.lookYaw) * 14;
  const lookZ = v.z + Math.cos(v.heading + GAME.ui.lookYaw) * 14;
  cam.lookAt(lookX, 1.4, lookZ);
  cam.fov = 62 + speedKmh * 0.03;
  cam.updateProjectionMatrix();
}

// Hood camera: low over the bonnet, looking straight down the road.
function updateHoodCamera(dt) {
  const v = GAME.vehicles[GAME.player.vehicle];
  if (!v) {
    return;
  }
  const cam = WORLD.camera;
  cam.position.set(
    v.x + Math.sin(v.heading) * 1.4,
    1.5,
    v.z + Math.cos(v.heading) * 1.4,
  );
  cam.lookAt(
    v.x + Math.sin(v.heading) * 30,
    1.0,
    v.z + Math.cos(v.heading) * 30,
  );
  cam.fov = 68;
  cam.updateProjectionMatrix();
}

// Look-back camera: in front of the car, facing the driver.
function updateLookBackCamera(dt) {
  const v = GAME.vehicles[GAME.player.vehicle];
  if (!v) {
    return;
  }
  const cam = WORLD.camera;
  cam.position.set(
    v.x + Math.sin(v.heading) * 8,
    3.2,
    v.z + Math.cos(v.heading) * 8,
  );
  cam.lookAt(v.x, 1.2, v.z);
  cam.fov = 62;
  cam.updateProjectionMatrix();
}

// On-foot camera: 5.5 m behind Raka, 2.6 m up, slightly to his right.
function updateOnFootCamera(dt) {
  const p = GAME.player;
  const yaw = p.heading + Math.PI;
  const cam = WORLD.camera;
  const tx = p.x + Math.sin(yaw) * 5.5 + Math.cos(yaw) * 0.9;
  const tz = p.z + Math.cos(yaw) * 5.5 - Math.sin(yaw) * 0.9;
  cam.position.x = lerpNumber(cam.position.x, tx, 0.25);
  cam.position.y = lerpNumber(cam.position.y, 2.6, 0.25);
  cam.position.z = lerpNumber(cam.position.z, tz, 0.25);
  cam.lookAt(
    p.x + Math.sin(p.heading) * 6,
    1.5,
    p.z + Math.cos(p.heading) * 6,
  );
  cam.fov = 62;
  cam.updateProjectionMatrix();
}

// Cycle to the next camera mode.
function cycleCameraMode() {
  GAME.ui.cameraMode = (GAME.ui.cameraMode + 1) % cam_MODES.length;
  GAME.ui.banner = 'CAMERA — ' + cam_MODES[GAME.ui.cameraMode].toUpperCase();
}

// Add a shake impulse, for example on a crash or explosion.
function shakeCamera(amount, time) {
  cam_shakeAmount = amount;
  cam_shakeTime = time;
}
