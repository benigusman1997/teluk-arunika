// mesh-factory.js — procedural cars, cruiser, SWAT van, helicopter, people, palms, props and canvas textures.
var TA = window.TA || (window.TA = {});
function makeCarMesh(kind, color) {
  var c = TA.CFG.CARS[kind], g = new THREE.Group(), w = c.w, l = c.len, h = c.h, r = kind === 'truck' || kind === 'swat' ? 0.5 : 0.36;
  if (c.rider) {
    g.add(TA.box(0.45, 0.45, 1.5, color, 0, 0.6, 0)); g.add(TA.box(0.6, 0.1, 0.5, 0x222222, 0, 0.9, -0.2));
    g.add(TA.box(0.5, 0.5, 0.1, color, 0, 0.9, 0.7));
    var rider = makePersonMesh(0x7a4fd0, 0x2b2b3a, 0xff5a36); rider.position.set(0, 0.25, -0.1); rider.scale.set(0.9, 0.8, 0.9); g.add(rider);
  } else {
    g.add(TA.box(w, h * 0.42, l, color, 0, r + h * 0.21 + 0.05, 0));
    g.add(TA.box(w * 1.02, 0.16, l * 1.02, 0x2a2d33, 0, r + 0.02, 0));
    if (c.box) g.add(TA.box(w, h * 0.7, l * 0.68, 0xe9e4d8, 0, r + h * 0.6, -l * 0.14));
    g.add(TA.box(w * 0.88, h * 0.4, l * c.cab, 0x20303f, 0, r + h * 0.62, c.cabz * l));
    g.add(TA.box(w * 0.9, 0.07, l * c.cab * 0.94, color, 0, r + h * 0.83, c.cabz * l));
    for (var s = -1; s <= 1; s += 2) {
      g.add(TA.glow(0.38, 0.16, 0.06, 0xfff6c8, s * w * 0.33, r + h * 0.3, l / 2 + 0.01));
      g.add(TA.glow(0.38, 0.14, 0.06, 0xff2a2a, s * w * 0.33, r + h * 0.3, -l / 2 - 0.01));
      g.add(TA.box(0.06, h * 0.36, l * c.cab * 0.9, color, s * w * 0.45, r + h * 0.62, c.cabz * l).translateX(0));
    }
    if (c.sign) g.add(TA.glow(0.7, 0.22, 0.3, 0xfff1a0, 0, r + h * 0.95, 0));
  }
  g.userData.wheels = [];
  var wg = new THREE.CylinderGeometry(r, r, 0.28, 12); wg.rotateZ(Math.PI / 2);
  var pos = c.rider ? [[0, 0.7], [0, -0.7]] : [[-w / 2, l * 0.31], [w / 2, l * 0.31], [-w / 2, -l * 0.31], [w / 2, -l * 0.31]];
  pos.forEach(function (p) { var m = new THREE.Mesh(wg, TA.mat(0x16171a)); m.position.set(p[0], r, p[1]); m.castShadow = true; g.add(m); g.userData.wheels.push(m); });
  g.userData.kind = kind;
  return g;
}
function makePoliceCruiserMesh() {
  var g = makeCarMesh('cruiser', 0xffffff), c = TA.CFG.CARS.cruiser;
  for (var s = -1; s <= 1; s += 2) {
    g.add(TA.box(0.04, 0.2, c.len * 0.96, 0x1f5fd0, s * (c.w / 2 + 0.01), 0.82, 0));
    var d = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshBasicMaterial({ map: TA.signTex('TAPD', '#ffffff', '#12348a'), transparent: true }));
    d.position.set(s * (c.w / 2 + 0.04), 0.85, 0); d.rotation.y = s * Math.PI / 2; g.add(d);
  }
  g.add(TA.box(1.5, 0.08, 0.36, 0x222222, 0, 1.55, -0.2));
  g.userData.bar = [TA.glow(0.66, 0.2, 0.34, 0xff1a1a, -0.4, 1.66, -0.2), TA.glow(0.66, 0.2, 0.34, 0x2a6bff, 0.4, 1.66, -0.2)];
  g.add(g.userData.bar[0]); g.add(g.userData.bar[1]);
  return g;
}
function makeSwatVanMesh() {
  var g = makeCarMesh('swat', 0x24365e), c = TA.CFG.CARS.swat;
  for (var s = -1; s <= 1; s += 2) {
    var d = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.9), new THREE.MeshBasicMaterial({ map: TA.signTex('SWAT', '#ffffff', '#24365e'), transparent: true }));
    d.position.set(s * (c.w / 2 + 0.03), 1.6, -0.6); d.rotation.y = s * Math.PI / 2; g.add(d);
    var door = TA.box(0.08, 1.9, 1.2, 0x2f4680, s * 1.75, 1.6, -c.len / 2 - 0.35); door.rotation.y = s * 0.5; g.add(door);
  }
  g.add(TA.box(2.6, 0.5, 0.5, 0x15203a, 0, 0.75, c.len / 2 + 0.2));
  g.userData.bar = [TA.glow(0.5, 0.18, 0.3, 0xff1a1a, -0.5, 3.33, 1.6), TA.glow(0.5, 0.18, 0.3, 0x2a6bff, 0.5, 3.33, 1.6)];
  g.add(g.userData.bar[0]); g.add(g.userData.bar[1]);
  return g;
}
function makeHelicopterMesh() {
  var g = new THREE.Group();
  g.add(TA.box(1.9, 1.7, 4.2, 0xf4f6fa, 0, 0, 0)); g.add(TA.box(1.92, 0.4, 4.22, 0x1f5fd0, 0, -0.25, 0));
  g.add(TA.box(1.7, 1.0, 1.2, 0x20303f, 0, 0.2, 1.75)); g.add(TA.box(0.5, 0.5, 4.2, 0xf4f6fa, 0, 0.3, -4));
  g.add(TA.box(0.12, 1.3, 0.8, 0x1f5fd0, 0, 0.9, -5.8)); g.add(TA.box(0.3, 0.5, 0.3, 0x333333, 0, 1.1, 0));
  for (var s = -1; s <= 1; s += 2) g.add(TA.box(0.12, 0.12, 3.6, 0x333333, s * 1.1, -1.3, 0));
  var rotor = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 0.06, 24), new THREE.MeshBasicMaterial({ color: 0x555b66, transparent: true, opacity: 0.35 }));
  rotor.position.y = 1.4; g.add(rotor);
  var blades = TA.box(10.2, 0.08, 0.3, 0x22252b, 0, 1.45, 0); g.add(blades);
  var tail = TA.box(0.08, 1.8, 0.2, 0x22252b, 0.35, 0.9, -5.8); g.add(tail);
  var lbl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: TA.signTex('ELANG-1', '#12348a', '#f4f6fa') }));
  lbl.position.set(0.97, 0.35, -0.4); lbl.rotation.y = Math.PI / 2; g.add(lbl);
  var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 5, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff7c2, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  var disc = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.35, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  g.userData = { rotor: blades, tail: tail, cone: cone, disc: disc };
  return g;
}
function makePersonMesh(shirt, pants, hat, helmet) {
  var g = new THREE.Group(), skin = 0xd9a066, u = g.userData;
  u.legs = [TA.box(0.24, 0.8, 0.26, pants, -0.15, 0.4, 0), TA.box(0.24, 0.8, 0.26, pants, 0.15, 0.4, 0)];
  u.arms = [TA.box(0.18, 0.7, 0.2, shirt, -0.4, 1.15, 0), TA.box(0.18, 0.7, 0.2, shirt, 0.4, 1.15, 0)];
  u.legs.concat(u.arms).forEach(function (m) { m.geometry = m.geometry.clone(); m.geometry.translate(0, -0.35, 0); m.position.y += 0.35; g.add(m); });
  g.add(TA.box(0.6, 0.72, 0.34, shirt, 0, 1.16, 0));
  g.add(TA.box(0.36, 0.36, 0.36, skin, 0, 1.72, 0));
  if (hat !== undefined && hat !== null) { g.add(TA.box(0.4, helmet ? 0.26 : 0.14, 0.4, hat, 0, 1.95, 0)); if (!helmet) g.add(TA.box(0.36, 0.05, 0.24, hat, 0, 1.9, 0.26)); }
  else g.add(TA.box(0.38, 0.1, 0.38, 0x2a1b12, 0, 1.94, 0));
  return g;
}
function makePalmTree(h) {
  var g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, h, 7), TA.mat(0x9a7648));
  t.position.y = h / 2; t.castShadow = true; g.add(t);
  for (var i = 0; i < 7; i++) {
    var f = TA.box(0.9, 0.08, 3.6, i % 2 ? 0x2f9e4f : 0x45b964, 0, 0, 1.8), p = new THREE.Group();
    p.add(f); p.position.y = h; p.rotation.y = i * 0.9; f.rotation.x = 0.45; g.add(p);
  }
  return g;
}
function animatePerson(mesh, phase, amp) {
  var u = mesh.userData, a = Math.sin(phase) * amp;
  u.legs[0].rotation.x = a; u.legs[1].rotation.x = -a; u.arms[0].rotation.x = -a; if (!u.aiming) u.arms[1].rotation.x = a;
}
TA.mats = {};
TA.mat = function (color) { return TA.mats[color] || (TA.mats[color] = new THREE.MeshLambertMaterial({ color: color })); };
TA.box = function (w, h, d, color, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? TA.mat(color) : color);
  m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; return m;
};
TA.glow = function (w, h, d, color, x, y, z) {
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: color })); m.position.set(x, y, z); return m;
};
TA.canvasTex = function (w, h, draw) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
};
TA.signCache = {};
TA.signTex = function (text, fg, bg) {
  var k = text + fg + bg;
  return TA.signCache[k] || (TA.signCache[k] = TA.canvasTex(256, 64, function (g, w, h) {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = 'italic 900 44px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2, w - 12);
  }));
};
TA.textSprite = function (text, fg, bg, scale) {
  var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TA.signTex(text, fg, bg), depthTest: false, fog: false }));
  s.scale.set((scale || 1) * 4, scale || 1, 1); return s;
};
TA.scaleUV = function (geo, rx, ry) { var uv = geo.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry); return geo; };
TA.makeCarMesh = makeCarMesh; TA.makePoliceCruiserMesh = makePoliceCruiserMesh; TA.makeSwatVanMesh = makeSwatVanMesh;
TA.makeHelicopterMesh = makeHelicopterMesh; TA.makePersonMesh = makePersonMesh; TA.makePalmTree = makePalmTree; TA.animatePerson = animatePerson;
