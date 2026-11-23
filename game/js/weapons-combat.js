// weapons-combat.js — six weapons, ammo, shooting, hit markers, enemy AI with cover, player health.
var TA = window.TA || (window.TA = {});
function fireCurrentWeapon(dt, inp) {
  var S = TA.S, P = TA.player, W = TA.CFG.WEAPONS[S.weapon];
  S.fireT -= dt; if (!inp.fire || S.fireT > 0 || P.car) return;
  if (S.ammo[S.weapon] <= 0) { TA.notify('OUT OF AMMO — ' + W.name); S.fireT = 0.5; return; }
  S.fireT = W.rate; S.ammo[S.weapon]--;
  var yaw = TA.camYaw + (TA.rnd() - 0.5) * W.spread, dx = Math.sin(yaw), dz = Math.cos(yaw), ox = P.x + dx * 0.9 + Math.cos(yaw) * -0.4, oz = P.z + dz * 0.9 + Math.sin(yaw) * 0.4;
  var best = null, bd = W.range, targets = TA.people.concat(TA.cars);
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i]; if (t.dead || t === P.car) continue;
    var rx = t.x - P.x, rz = t.z - P.z, f = rx * dx + rz * dz, s = Math.abs(rx * dz - rz * dx);
    if (f > 0.3 && f < bd && s < (t.cfg ? 1.5 : 0.55 + W.spread * f)) { bd = f; best = t; }
  }
  var ex = P.x + dx * bd, ez = P.z + dz * bd;
  if (S.weapon > 0) { TA.spawnTracer(ox, 1.55, oz, ex, 1.3, ez); TA.spawnMuzzleFlash(ox, 1.55, oz); TA.playGun(S.weapon); TA.danger = { x: P.x, z: P.z, t: S.time }; }
  if (W.boom) explodeAt(ex, ez, 9, W.dmg);
  else if (best) { if (best.cfg) TA.damageVehicleOnCollision(best, W.dmg * 0.35); else TA.hurtPerson(best, W.dmg); TA.hitMarkT = 0.15; TA.spawnSparks(ex, 1.2, ez); }
  if (S.weapon > 0 && TA.people.some(function (p) { return (p.kind === 'ped' || p.kind === 'cop') && !p.dead && TA.dist(p, P) < 60; })) TA.raiseWantedLevel(0.3, 'SHOTS FIRED');
}
function openWeaponWheel(show) {
  var el = document.getElementById('wheel'), S = TA.S; if (!el) return;
  el.style.display = show ? 'block' : 'none'; if (!show) return;
  var html = '<div class="wheel-mid">' + TA.CFG.WEAPONS[S.weapon].name + '<br><b>' + (S.ammo[S.weapon] === Infinity ? '∞' : S.ammo[S.weapon]) + '</b></div>';
  TA.CFG.WEAPONS.forEach(function (w, i) {
    var a = i / 6 * Math.PI * 2 - Math.PI / 2, x = 105 + Math.cos(a) * 72 - 29, y = 105 + Math.sin(a) * 72 - 20;
    html += '<div class="wheel-slot' + (i === S.weapon ? ' on' : '') + (S.owned[i] ? '' : ' locked') + '" style="left:' + x + 'px;top:' + y + 'px">' + (i + 1) + ' ' + w.name.split(' ')[0] + '</div>';
  });
  el.innerHTML = html;
}
function updateEnemyCoverAI(dt) {
  var P = TA.player, S = TA.S;
  for (var i = 0; i < TA.people.length; i++) {
    var e = TA.people[i]; if (e.dead || e.kind === 'ped' || e.kind === 'driver') continue;
    var d = TA.dist(e, P), hostile = e.kind === 'guard' || e.kind === 'enemy' || S.wanted >= 2 || (e.kind === 'cop' && S.wanted >= 1 && d < 10);
    e.t += dt; e.h = Math.atan2(P.x - e.x, P.z - e.z); e.suppress = Math.max(0, (e.suppress || 0) - dt);
    var peek = true;
    if (e.cover) { peek = (e.t % 3.2) > 1.3 && e.suppress <= 0; e.mesh.scale.y = peek ? 1 : 0.62; }
    else if (d > (e.shield ? 7 : 13) && hostile) {
      var nx = e.x + Math.sin(e.h) * 3.6 * dt, nz = e.z + Math.cos(e.h) * 3.6 * dt;
      if (!TA.blocked(nx, nz, 0.4)) { e.x = nx; e.z = nz; e.phase += dt * 10; }
    }
    TA.animatePerson(e.mesh, e.phase, e.cover ? 0 : 0.7);
    e.mesh.position.set(e.x, 0.24, e.z); e.mesh.rotation.y = e.h;
    e.fireT -= dt;
    if (hostile && peek && e.suppress <= 0 && d < 48 && e.fireT <= 0 && !e.shield) {
      e.fireT = e.kind === 'swat' ? 0.55 : 0.9 + TA.rnd() * 0.6;
      var hit = TA.rnd() < (P.car ? 0.15 : 0.34), mx = hit ? 0 : (TA.rnd() - 0.5) * 3;
      TA.spawnTracer(e.x + Math.sin(e.h) * 0.9, 1.55, e.z + Math.cos(e.h) * 0.9, P.x + mx, 1.2, P.z + mx); TA.spawnMuzzleFlash(e.x + Math.sin(e.h) * 0.95, 1.55, e.z + Math.cos(e.h) * 0.95); TA.playGun(1);
      if (hit) hurtPlayer(e.kind === 'swat' ? 9 : 6);
    }
  }
}
function explodeAt(x, z, r, dmg) {
  TA.spawnExplosion(x, 1, z); TA.danger = { x: x, z: z, t: TA.S.time };
  TA.people.forEach(function (p) { var d = Math.hypot(p.x - x, p.z - z); if (d < r) TA.hurtPerson(p, dmg * (1 - d / r)); });
  TA.cars.forEach(function (c) { var d = Math.hypot(c.x - x, c.z - z); if (d < r) TA.damageVehicleOnCollision(c, dmg * (1 - d / r)); });
  if (TA.dist(TA.player, { x: x, z: z }) < r) hurtPlayer(30);
  TA.raiseWantedLevel(0.8, 'EXPLOSION');
}
function hurtPlayer(d) {
  var S = TA.S; if (S.mode !== 'playing') return;
  var a = Math.min(S.armor, d * 0.7); S.armor -= a; S.hp -= d - a; TA.hurtFlash = 0.3;
  if (S.hp <= 0) { S.stats.wasted++; respawnAtSafehouse('WASTED', 0.1); }
}
function respawnAtSafehouse(word, fee) {
  var S = TA.S, P = TA.player, h = TA.landmarks.safehouses[0];
  if (P.car) TA.enterOrExitVehicleForced();
  P.x = h.x; P.z = h.z + 8; S.hp = 100; S.heat = 0; S.wanted = 0; S.money = Math.floor(S.money * (1 - fee));
  if (S.stage >= 0) { S.stage = -1; TA.notify(word + ' — CONTRACT FAILED, RETURN TO THE MARKER'); } else TA.notify(word);
  TA.bigWord = { text: word, t: 2.5 };
}
TA.fireCurrentWeapon = fireCurrentWeapon; TA.openWeaponWheel = openWeaponWheel; TA.updateEnemyCoverAI = updateEnemyCoverAI;
TA.explodeAt = explodeAt; TA.hurtPlayer = hurtPlayer; TA.respawnAtSafehouse = respawnAtSafehouse;
