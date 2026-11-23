// pedestrian-ai.js — walkers on sidewalks, crossing, panic, diving away; also the shared person spawner.
var TA = window.TA || (window.TA = {});
function spawnPedestrians(n) {
  var shirts = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xf783ac, 0xffffff, 0xffa94d, 0xb197fc];
  for (var i = 0; i < n; i++) {
    var p = spawnPerson('ped', 0, 0, { shirt: shirts[i % shirts.length], pants: i % 2 ? 0x3b4252 : 0x6b4f3a, hat: i % 4 === 0 ? 0xf2e6c9 : null });
    p.ai = { axis: TA.rnd() < 0.5 ? 'x' : 'z', line: TA.pick(TA.CFG.ROADS) + (TA.rnd() < 0.5 ? 9.4 : -9.4), dir: TA.rnd() < 0.5 ? 1 : -1, speed: 1.2 + TA.rnd() * 0.7 };
    var t = -420 + TA.rnd() * 840; if (p.ai.axis === 'x') { p.x = t; p.z = p.ai.line; } else { p.z = t; p.x = p.ai.line; }
  }
}
function walkPedestriansOnSidewalks(dt) {
  var P = TA.player;
  for (var i = 0; i < TA.people.length; i++) {
    var p = TA.people[i]; if (p.kind !== 'ped' && p.kind !== 'driver') continue;
    if (p.dead) { continue; }
    if (p.panic > 0) { p.panic -= dt; p.x += Math.sin(p.h) * 5.6 * dt; p.z += Math.cos(p.h) * 5.6 * dt; p.phase += dt * 16; p.mark.visible = true; if (p.dive > 0) { p.dive -= dt; p.mesh.rotation.x = 1.1; } else p.mesh.rotation.x = 0; }
    else {
      p.mark.visible = false;
      if (!p.ai) { p.ai = { axis: 'x', line: Math.round(p.z / 100) * 100 + 9.4, dir: 1, speed: 1.4 }; p.z = p.ai.line; p.kind = 'ped'; }
      var a = p.ai, pos = a.axis === 'x' ? p.x : p.z, np = pos + a.dir * a.speed * dt;
      if (Math.abs(np) > 445) { a.dir = -a.dir; np = pos; }
      if (a.axis === 'x') { p.x = np; p.z = a.line; p.h = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { p.z = np; p.x = a.line; p.h = a.dir > 0 ? 0 : Math.PI; }
      p.phase += dt * 7;
      if (TA.dist(p, P) > 260 && TA.S.mode === 'playing') { var s = (TA.rnd() < 0.5 ? -1 : 1) * (60 + TA.rnd() * 150); if (a.axis === 'x') p.x = TA.clamp(P.x + s, -440, 440); else p.z = TA.clamp(P.z + s, -440, 440); }
    }
    TA.animatePerson(p.mesh, p.phase, p.panic > 0 ? 1.0 : 0.55);
    p.mesh.position.set(p.x, 0.24, p.z); p.mesh.rotation.y = p.h;
  }
}
function panicPedestriansNearDanger() {
  var S = TA.S, d = TA.danger && S.time - TA.danger.t < 1 ? TA.danger : null;
  for (var i = 0; i < TA.people.length; i++) {
    var p = TA.people[i]; if (p.kind !== 'ped' || p.dead) continue;
    if (d && TA.dist(p, d) < 45 && p.panic <= 0) { p.panic = 5 + TA.rnd() * 3; p.h = Math.atan2(p.x - d.x, p.z - d.z) + (TA.rnd() - 0.5); }
    for (var j = 0; j < TA.cars.length; j++) {
      var c = TA.cars[j], sp = Math.abs(c.v); if (sp < 6) continue;
      var dd = TA.dist(p, c);
      if (dd < 1.7) { TA.hurtPerson(p, 200, c); if (c.role === 'player') TA.raiseWantedLevel(0.9, 'HIT AND RUN'); }
      else if (dd < 9 && c.role !== 'traffic' && p.panic <= 0) { p.panic = 3; p.dive = 0.7; p.h = c.h + (((p.x - c.x) * Math.cos(c.h) - (p.z - c.z) * Math.sin(c.h)) > 0 ? 1.4 : -1.4); }
    }
  }
}
function spawnPerson(kind, x, z, o) {
  o = o || {};
  var mesh = TA.makePersonMesh(o.shirt === undefined ? 0x8899aa : o.shirt, o.pants === undefined ? 0x333b4a : o.pants, o.hat, o.helmet);
  var p = { kind: kind, x: x, z: z, h: o.h || 0, hp: o.hp || 60, maxHp: o.hp || 60, mesh: mesh, phase: TA.rnd() * 6, panic: 0, dive: 0, t: 0, fireT: TA.rnd() * 1.5 };
  p.mark = TA.textSprite('!', '#ffffff', '#e03131', 0.7); p.mark.scale.set(0.7, 0.7, 1); p.mark.position.y = 2.6; p.mark.visible = false; mesh.add(p.mark);
  if (o.bar) {
    p.barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1a1a, depthTest: false })); p.barBg.scale.set(1.5, 0.2, 1); p.barBg.position.y = 2.45; mesh.add(p.barBg);
    p.bar = new THREE.Sprite(new THREE.SpriteMaterial({ color: o.barColor || 0xff3b3b, depthTest: false })); p.bar.scale.set(1.4, 0.13, 1); p.bar.position.y = 2.45; mesh.add(p.bar);
  }
  if (o.gun) { var g = TA.box(0.1, 0.14, 0.75, 0x1b1b1f, 0.4, 1.32, 0.45); mesh.add(g); mesh.userData.aiming = true; mesh.userData.arms[1].rotation.x = -1.45; }
  mesh.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
  mesh.position.set(x, 0.24, z); mesh.rotation.y = p.h; TA.scene.add(mesh); TA.people.push(p); return p;
}
function hurtPerson(p, dmg, src) {
  if (p.dead) return; p.hp -= dmg;
  if (p.bar) p.bar.scale.x = Math.max(0.01, 1.4 * p.hp / p.maxHp);
  if (p.hp <= 0) {
    p.dead = true; p.deadT = TA.S.time; p.mesh.rotation.x = -Math.PI / 2; p.mesh.position.y = 0.5; p.mark.visible = false; if (p.bar) { p.bar.visible = false; p.barBg.visible = false; }
    if (p.kind === 'guard' || p.kind === 'enemy') { TA.S.kills++; TA.awardRankPoints(15); }
    if (p.kind === 'cop' || p.kind === 'swat') TA.raiseWantedLevel(1.2, 'OFFICER DOWN');
    if (p.kind === 'ped') TA.changeDistrictStanding(TA.districtAt(p.x, p.z).id, -2);
  }
}
function removeDeadPeople() {
  TA.people = TA.people.filter(function (p) { if (p.dead && TA.S.time - p.deadT > 9) { TA.scene.remove(p.mesh); return false; } return true; });
}
TA.spawnPedestrians = spawnPedestrians; TA.walkPedestriansOnSidewalks = walkPedestriansOnSidewalks; TA.panicPedestriansNearDanger = panicPedestriansNearDanger;
TA.spawnPerson = spawnPerson; TA.hurtPerson = hurtPerson; TA.removeDeadPeople = removeDeadPeople;
