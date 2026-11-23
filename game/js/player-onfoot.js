// player-onfoot.js — Raka on foot: walking, sprinting, jumping, aiming.
var TA = window.TA || (window.TA = {});
function updatePlayerOnFoot(dt, inp) {
  var P = TA.player, S = TA.S;
  var speed = aimAndSprint(inp), mx = inp.strafe, mz = inp.fwd, len = Math.hypot(mx, mz);
  if (len > 0) {
    var yaw = TA.camYaw, dx = (Math.sin(yaw) * mz + Math.cos(yaw) * mx) / len, dz = (Math.cos(yaw) * mz - Math.sin(yaw) * mx) / len;
    var nx = P.x + dx * speed * dt, nz = P.z + dz * speed * dt;
    if (!TA.blocked(nx, P.z, 0.4)) P.x = nx; if (!TA.blocked(P.x, nz, 0.4)) P.z = nz;
    if (!inp.aim && !inp.fire) P.h = Math.atan2(dx, dz);
    P.phase += dt * speed * 2.2; S.stats.km += speed * dt / 1000;
  }
  if (inp.jump && P.y <= 0) P.vy = 5.2;
  P.vy -= 14 * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0;
  TA.animatePerson(P.mesh, P.phase, len > 0 ? (speed > 5 ? 1.0 : 0.6) : 0);
  P.mesh.position.set(P.x, 0.24 + P.y, P.z); P.mesh.rotation.y = P.h;
}
function aimAndSprint(inp) {
  var P = TA.player, aiming = inp.aim || inp.fire;
  P.mesh.userData.aiming = aiming && TA.S.weapon > 0;
  P.mesh.userData.arms[1].rotation.x = P.mesh.userData.aiming ? -1.45 : P.mesh.userData.arms[1].rotation.x;
  if (aiming) P.h = TA.camYaw;
  P.gun.visible = TA.S.weapon > 0;
  return aiming ? 2.6 : inp.sprint ? 7.4 : 4.2;
}
function createPlayerRaka(x, z) {
  var mesh = TA.makePersonMesh(0x12b5a6, 0x2b3350, 0xf5f0e6);
  mesh.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
  var gun = TA.box(0.1, 0.14, 0.75, 0x1b1b1f, 0.4, 1.32, 0.45); mesh.add(gun);
  TA.scene.add(mesh);
  TA.player = { mesh: mesh, gun: gun, x: x, z: z, y: 0, vy: 0, h: 0, phase: 0, car: null };
  TA.camYaw = 0; TA.camPitch = 0.18;
  mesh.position.set(x, 0.24, z);
}
TA.updatePlayerOnFoot = updatePlayerOnFoot; TA.aimAndSprint = aimAndSprint; TA.createPlayerRaka = createPlayerRaka;
