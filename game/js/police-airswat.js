// police-airswat.js — helicopter ELANG-1 with its searchlight, armoured van BADAK-2 and the SWAT team.
var TA = window.TA || (window.TA = {});
function flyHelicopterWithSearchlight(dt, force) {
  var S = TA.S, P = TA.player, T = P.car || P;
  if (S.wanted >= 4 && !TA.heli) {
    TA.heli = TA.makeHelicopterMesh(); TA.heli.position.set(T.x - 80, 60, T.z - 80);
    TA.scene.add(TA.heli); TA.scene.add(TA.heli.userData.cone); TA.scene.add(TA.heli.userData.disc); TA.notify('ELANG-1 IS OVERHEAD');
  }
  var H = TA.heli; if (!H) return;
  var u = H.userData, away = S.wanted < 4;
  if (!force) {
    var a = S.time * 0.35, tx = away ? H.position.x + 40 : T.x + Math.cos(a) * 16, tz = away ? H.position.z - 40 : T.z + Math.sin(a) * 16;
    H.position.x += (tx - H.position.x) * Math.min(1, 1.5 * dt); H.position.z += (tz - H.position.z) * Math.min(1, 1.5 * dt);
    H.position.y += ((away ? 90 : 20) - H.position.y) * Math.min(1, dt);
    H.rotation.y = Math.atan2(T.x - H.position.x, T.z - H.position.z);
  }
  u.rotor.rotation.y += dt * 30; u.tail.rotation.x += dt * 40;
  var g = new THREE.Vector3(T.x, 0.15, T.z), top = H.position.clone(); top.y -= 1; var dir = top.clone().sub(g), len = dir.length();
  u.cone.position.copy(g).add(top).multiplyScalar(0.5); u.cone.scale.set(1, len, 1);
  u.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  u.disc.position.copy(g); u.cone.visible = u.disc.visible = !away;
  if (away && TA.dist({ x: H.position.x, z: H.position.z }, T) > 260) { TA.scene.remove(H); TA.scene.remove(u.cone); TA.scene.remove(u.disc); TA.heli = null; }
}
function deploySwatVanAndOfficers(dt, at) {
  var S = TA.S, P = TA.player, T = P.car || P;
  if ((S.wanted >= 5 || at) && !TA.swatVan) {
    var x = at ? at.x : TA.clamp(T.x + 150, -430, 430), z = at ? at.z : T.z;
    TA.swatVan = TA.spawnVehicle('swat', x, z, at ? at.h : -Math.PI / 2, 'police'); TA.swatVan.unit = 'BADAK-2 SWAT'; TA.swatVan.hp = 400; TA.notify('BADAK-2 SWAT DEPLOYED');
  }
  var V = TA.swatVan; if (!V) return;
  if (V.dead || S.wanted === 0 && !at) { if (TA.dist(V, T) > 80 || V.dead) { if (!V.dead) TA.removeVehicle(V); TA.swatVan = null; } return; }
  if (!V.swatOut && (at || TA.dist(V, T) < 28)) {
    V.swatOut = true; V.role = 'block'; V.v = 0;
    for (var k = 0; k < 4; k++) {
      var o = TA.spawnPerson('swat', V.x - Math.sin(V.h) * (4.5 + (k % 2) * 1.6) + Math.cos(V.h) * (k - 1.5) * 1.5, V.z - Math.cos(V.h) * (4.5 + (k % 2) * 1.6) - Math.sin(V.h) * (k - 1.5) * 1.5, { shirt: 0x1c1f26, pants: 0x121418, hat: 0x0c0d10, helmet: true, hp: 120, gun: true, bar: true, barColor: 0x4dabf7 });
      if (k === 0) { var sh = TA.box(0.9, 1.5, 0.12, 0x2b3a67, 0, 1.0, 0.5); o.mesh.add(sh); o.shield = true; }
    }
  }
}
TA.flyHelicopterWithSearchlight = flyHelicopterWithSearchlight; TA.deploySwatVanAndOfficers = deploySwatVanAndOfficers;
