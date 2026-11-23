// The air unit and the tactical team: ELANG-1 helicopter with its searchlight, the SWAT ARUNIKA van
// "BADAK-2" and the officers it deploys (BREACH and SNIPER roles).
TA.heli = null;

TA.initAirUnit = function () {
  var mesh = TA.makeHelicopter(), light = TA.makeSearchlight();
  mesh.visible = false; light.cone.visible = false; light.disc.visible = false;
  TA.scene.add(mesh, light.cone, light.disc);
  TA.heli = { mesh: mesh, cone: light.cone, disc: light.disc, active: false, x: 0, y: 60, z: 0, h: 0, hp: 320, lx: 0, lz: 0, unit: null, downT: 0, orbit: 0 };
};

TA.deployHeli = function (x, z) {
  var h = TA.heli, p = TA.player;
  if (h.active || h.downT > 0) return;
  h.active = true; h.hp = 320;
  h.x = x !== undefined ? x : p.x + 160; h.z = z !== undefined ? z : p.z - 120; h.y = 46; h.lx = p.x; h.lz = p.z;
  h.mesh.visible = h.cone.visible = h.disc.visible = true;
  h.unit = TA.addUnit('heli', 'ELANG-1', 'SPOTLIGHT', null);
  h.unit.pos = h;
  TA.policeSay('ELANG-1 airborne over ' + TA.districtAt(p.x, p.z).name + '.');
};

TA.heliStandDown = function () {
  var h = TA.heli;
  if (!h || !h.active) return;
  h.active = false; h.mesh.visible = h.cone.visible = h.disc.visible = false;
  if (h.unit) { TA.removeUnit(h.unit, true); h.unit = null; }
};

TA.damageHeli = function (dmg) {
  var h = TA.heli;
  if (!h.active) return;
  h.hp -= dmg;
  if (TA.spawnSparks) TA.spawnSparks(h.x, h.y, h.z, 3);
  if (h.hp <= 0) {
    if (TA.spawnExplosion) TA.spawnExplosion(h.x, h.y, h.z, 2.4);
    TA.heliStandDown(); h.downT = 45;
    TA.addRP(25); TA.showBanner('ELANG-1 DOWN', 'TAPD SCRAMBLES A REPLACEMENT', '#f94144'); TA.crime(5, 'AIRCRAFT DOWN');
  }
};

// Hover ahead of and above the suspect, keep the searchlight on him, strafe at five stars.
TA.updateHeli = function (dt) {
  var h = TA.heli, p = TA.player;
  if (!h) return;
  if (h.downT > 0) h.downT -= dt;
  if (!h.active) return;
  var f = TA.cameraFocus(), fx = Math.sin(f.h), fz = Math.cos(f.h);
  h.orbit += dt * 0.25;
  var lead = p.car ? 14 + Math.min(20, f.speed * 0.45) : 26, lift = p.car ? 13.5 : 25;
  var tx = f.x + fx * lead + Math.sin(h.orbit) * 4, tz = f.z + fz * lead + Math.cos(h.orbit) * 4, ty = f.y + lift + Math.sin(h.orbit * 2.1) * 1.2;
  var k = 1 - Math.exp(-dt * 3.5), ox = h.x, oz = h.z;
  h.x += (tx - h.x) * k; h.z += (tz - h.z) * k; h.y += (ty - h.y) * k;
  var mvx = h.x - ox, mvz = h.z - oz;
  h.h = TA.turnToward(h.h, TA.headingTo(f.x - h.x, f.z - h.z), 2.5 * dt);
  h.mesh.position.set(h.x, h.y, h.z);
  h.mesh.rotation.set(TA.clamp((mvx * Math.sin(h.h) + mvz * Math.cos(h.h)) * 0.6, -0.3, 0.3) + 0.12, h.h, 0);
  h.mesh.userData.rotor.rotation.y += dt * 32; h.mesh.userData.tail.rotation.x += dt * 40;
  // searchlight: the spot trails the suspect a little, the cone stretches from the nose lamp to the spot
  var kl = 1 - Math.exp(-dt * 16), aheadL = f.speed * 0.1;
  h.lx += (f.x + fx * aheadL - h.lx) * kl; h.lz += (f.z + fz * aheadL - h.lz) * kl;
  var gy = TA.groundY(h.lx, h.lz) + 0.12, sx = h.x + Math.sin(h.h) * 1.5, sy = h.y - 1.1, sz = h.z + Math.cos(h.h) * 1.5;
  var dx = h.lx - sx, dy = gy - sy, dz = h.lz - sz, len = Math.sqrt(dx * dx + dy * dy + dz * dz), radius = 3.3;
  h.cone.position.set(sx, sy, sz);
  h.cone.material.opacity = p.car ? 0.2 : 0.07;   // on foot the camera sits inside the beam, so keep it faint
  h.cone.scale.set(radius, len, radius);
  h.cone.quaternion.setFromUnitVectors(TA._down || (TA._down = new THREE.Vector3(0, -1, 0)), (TA._tmpV || (TA._tmpV = new THREE.Vector3())).set(dx / len, dy / len, dz / len));
  h.disc.position.set(h.lx, gy, h.lz); h.disc.scale.setScalar(radius);
  // door gunner at five stars
  h.cool = (h.cool || 2) - dt;
  if (TA.run.wanted >= 5 && h.cool <= 0 && TA.dist(h.x, h.z, p.x, p.z) < 70) {
    h.cool = 0.5;
    var hd = TA.headingTo(p.x - h.x, p.z - h.z) + (TA.rand() - 0.5) * 0.14;
    if (TA.rand() < 0.35) { if (p.car) TA.damageCar(p.car, 6, 'cop'); else TA.damagePlayer(5, null); }
    if (TA.spawnTracer) TA.spawnTracer(h.x, h.y - 0.6, h.z, p.x + Math.sin(hd) * 2 - Math.sin(hd) * 2 + TA.rr(-1.5, 1.5), p.y + 0.5, p.z + TA.rr(-1.5, 1.5));
    if (TA.sfxAt) TA.sfxAt('shot', h.x, h.z);
  }
};

// ---- SWAT ARUNIKA ----------------------------------------------------------
TA.spawnSwatVan = function (x, z, h) {
  var car = TA.spawnCar('swatvan', x, z, h, 'swat');
  car.driver = true;
  var n = TA.units.filter(function (u) { return u.type === 'swatvan'; }).length;
  var u = TA.addUnit('swatvan', 'BADAK-' + (2 + n), 'BREACH', car);
  u.team = 4; u.deployed = false;
  TA.policeSay(u.name + ' rolling with a full tactical team.');
  return u;
};

TA.deploySwatTeam = function (u) {
  var car = u.car;
  u.deployed = true;
  for (var i = 0; i < u.team; i++) {
    var side = i % 2 ? 1 : -1, back = car.model.len * 0.5 + 1 + Math.floor(i / 2) * 1.3;
    var o = { x: car.x - Math.sin(car.h) * back + Math.cos(car.h) * side * 1.2, z: car.z - Math.cos(car.h) * back - Math.sin(car.h) * side * 1.2 };
    TA.collideCircle(o, 0.45);
    var sniper = i === u.team - 1, g = TA.spawnGunman('swat', o.x, o.z, sniper ? 5 : 4, 'SWAT');
    g.ownCar = car;
    if (sniper) { g.accuracy = 0.03; g.sniper = true; }
    TA.addUnit('swat', 'SWAT ' + String.fromCharCode(65 + i) + (TA.units.length % 9 + 1), sniper ? 'SNIPER' : 'BREACH', g);
  }
  TA.showBanner('SWAT ARUNIKA DEPLOYED', u.name + ' — TACTICAL TEAM ON THE GROUND', '#e63946');
  if (TA.say) TA.say('agus', 'Tactical channel just lit up. That is SWAT, Raka.');
};

TA.updateSwat = function (dt) {
  var p = TA.player;
  for (var i = TA.units.length - 1; i >= 0; i--) {
    var u = TA.units[i];
    if (u.type !== 'swatvan') continue;
    var car = u.car;
    if (car.dead || car.kind !== 'swat') { TA.removeUnit(u, true); continue; }
    var d = TA.dist(car.x, car.z, p.x, p.z);
    if (d > 400) { TA.removeUnit(u); continue; }
    if (u.deployed) { TA.stepCarPhysics(car, car.speed > 0.5 ? -1 : 0, 0, true, dt); continue; }
    var slowTarget = !p.car || Math.abs(p.car.speed) < 9;
    if (d < (slowTarget ? 26 : 12)) {
      TA.stepCarPhysics(car, car.speed > 0.5 ? -1 : 0, 0, true, dt);
      if (Math.abs(car.speed) < 3) TA.deploySwatTeam(u);
    } else {
      var tx = p.x, tz = p.z;
      if (d > 30 && !TA.losClear(car.x, car.z, p.x, p.z)) {
        var here = TA.nearestNode(car.x, car.z), bestN = here, bd = 1e9;
        if (TA.dist(car.x, car.z, here.x, here.z) > 16) { tx = here.x; tz = here.z; }
        else { here.nb.forEach(function (id) { var n = TA.world.nodes[id], nd = TA.dist(n.x, n.z, p.x, p.z); if (nd < bd) { bd = nd; bestN = n; } }); tx = bestN.x; tz = bestN.z; }
      }
      TA.driveToward(car, tx, tz, dt, car.model.top, 18);
    }
  }
};

// Called by the dispatch loop: four stars bring the air unit and one van, five bring a second van.
TA.reinforceAir = function () {
  var w = TA.run.wanted, p = TA.player;
  if (w < 4) { if (TA.heli.active && w < 3) TA.heliStandDown(); return; }
  if (!TA.heli.active) TA.deployHeli();
  var vans = TA.units.filter(function (u) { return u.type === 'swatvan'; }).length;
  if (vans < (w >= 5 ? 2 : 1)) {
    var n = TA.policeSpawnPoint(120, 240, false);
    TA.spawnSwatVan(n.x, n.z, TA.headingTo(p.x - n.x, p.z - n.z));
  }
};
