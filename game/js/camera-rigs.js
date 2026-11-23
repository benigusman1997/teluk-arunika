// camera-rigs.js — chase, hood, cinematic look-back and on-foot cameras.
var TA = window.TA || (window.TA = {});
function updateChaseCamera(dt, car) {
  var mode = TA.S.camMode, back = mode === 2 ? 12 : 7.4, up = mode === 2 ? 5.2 : 3.1, k = TA.camSnap ? 1 : Math.min(1, 5 * dt);
  TA.camH = TA.camH === undefined || TA.camSnap ? car.h : TA.camH + TA.angDiff(car.h, TA.camH) * Math.min(1, 4 * dt);
  var sx = Math.sin(TA.camH), cz = Math.cos(TA.camH), cam = TA.camera;
  if (mode === 1) { cam.position.set(car.x + Math.sin(car.h) * 0.6, 1.5, car.z + Math.cos(car.h) * 0.6); cam.lookAt(car.x + Math.sin(car.h) * 30, 1.2, car.z + Math.cos(car.h) * 30); }
  else {
    cam.position.x += (car.x - sx * back - cam.position.x) * k; cam.position.z += (car.z - cz * back - cam.position.z) * k; cam.position.y += (up - cam.position.y) * k;
    cam.lookAt(car.x + sx * 7, 1.3, car.z + cz * 7);
  }
  cam.fov = 58 + Math.min(16, Math.abs(car.v) * 0.3); cam.updateProjectionMatrix(); applyCameraShake();
}
function updateLookBackCamera(dt, car) {
  var cam = TA.camera;
  cam.position.set(car.x + Math.sin(car.h) * 8 + Math.cos(car.h) * 2, 2.2, car.z + Math.cos(car.h) * 8 - Math.sin(car.h) * 2);
  cam.lookAt(car.x - Math.sin(car.h) * 6, 1.2, car.z - Math.cos(car.h) * 6); cam.fov = 52; cam.updateProjectionMatrix();
}
function updateOnFootCamera(dt) {
  var P = TA.player, yaw = TA.camYaw, pit = TA.camPitch, cam = TA.camera, back = 5.4, k = TA.camSnap ? 1 : Math.min(1, 10 * dt);
  var tx = P.x - Math.sin(yaw) * back * Math.cos(pit) - Math.cos(yaw) * 0.75, tz = P.z - Math.cos(yaw) * back * Math.cos(pit) + Math.sin(yaw) * 0.75, ty = 2.1 + P.y + Math.sin(pit) * back;
  cam.position.x += (tx - cam.position.x) * k; cam.position.y += (ty - cam.position.y) * k; cam.position.z += (tz - cam.position.z) * k;
  cam.lookAt(P.x + Math.sin(yaw) * 12, 1.5 + P.y, P.z + Math.cos(yaw) * 12);
  cam.fov = 58; cam.updateProjectionMatrix(); applyCameraShake();
}
function cycleCameraMode() { TA.S.camMode = (TA.S.camMode + 1) % 3; TA.notify('CAMERA: ' + ['CHASE', 'HOOD', 'FAR CHASE'][TA.S.camMode]); }
function applyCameraShake() {
  if (TA.shake > 0) { TA.camera.position.x += (Math.random() - 0.5) * TA.shake; TA.camera.position.y += (Math.random() - 0.5) * TA.shake; }
}
TA.updateChaseCamera = updateChaseCamera; TA.updateLookBackCamera = updateLookBackCamera; TA.updateOnFootCamera = updateOnFootCamera; TA.cycleCameraMode = cycleCameraMode;
