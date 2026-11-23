// Procedural meshes: geometry batching, canvas textures, cars, police units, helicopter, people, palms and street props.

// ---- geometry batch: merges many coloured primitives into one mesh ----------
TA.GEO = {};
TA.unitGeo = function (key, make) {
  if (!TA.GEO[key]) { var g = make(); TA.GEO[key] = g.index ? g.toNonIndexed() : g; }
  return TA.GEO[key];
};

TA.Batch = function () {
  var pos = [], nor = [], col = [], uv = [];
  var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
  var p = new THREE.Vector3(), s = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  var b = { count: 0 };
  b.add = function (geo, color) {
    var gp = geo.attributes.position, gn = geo.attributes.normal;
    c.setHex(color);
    nm.getNormalMatrix(m);
    for (var i = 0; i < gp.count; i++) {
      v.fromBufferAttribute(gp, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      n.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize(); nor.push(n.x, n.y, n.z);
      col.push(c.r, c.g, c.b); uv.push(0, 0);
    }
    b.count += gp.count;
  };
  b.place = function (x, y, z, sx, sy, sz, ry, rx, rz) {
    e.set(rx || 0, ry || 0, rz || 0); q.setFromEuler(e);
    m.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
  };
  // box centred on (x, y, z)
  b.box = function (x, y, z, sx, sy, sz, color, ry, rx, rz) {
    b.place(x, y, z, sx, sy, sz, ry, rx, rz);
    b.add(TA.unitGeo('box', function () { return new THREE.BoxGeometry(1, 1, 1); }), color);
  };
  b.cyl = function (x, y, z, rTop, rBot, h, color, seg, rx, rz) {
    var rmax = Math.max(rTop, rBot), ratio = Math.round(rTop / rmax * 20) + '_' + Math.round(rBot / rmax * 20) + '_' + (seg || 8);
    b.place(x, y, z, rmax, h, rmax, 0, rx, rz);
    b.add(TA.unitGeo('cyl' + ratio, function () { return new THREE.CylinderGeometry(rTop / rmax, rBot / rmax, 1, seg || 8); }), color);
  };
  b.sphere = function (x, y, z, sx, sy, sz, color) {
    b.place(x, y, z, sx, sy, sz);
    b.add(TA.unitGeo('sphere', function () { return new THREE.SphereGeometry(1, 10, 7); }), color);
  };
  // flat quad given four corners (counter-clockwise seen from the normal side) with texture repeats u, v
  b.quad = function (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, color, u, w) {
    c.setHex(color);
    v.set(bx - ax, by - ay, bz - az); n.set(dx - ax, dy - ay, dz - az); v.cross(n).normalize();
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
    uv.push(0, 0, u || 1, 0, u || 1, w || 1, 0, 0, u || 1, w || 1, 0, w || 1);
    for (var i = 0; i < 6; i++) { nor.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
    b.count += 6;
  };
  // horizontal rectangle at height y (used for roads, paint, roofs, water)
  b.flat = function (x0, z0, x1, z1, y, color, u, w) {
    b.quad(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0, color, u, w);
  };
  // the four walls of a box footprint, textured with window cells of 4 m by 3.4 m
  b.walls = function (x0, z0, x1, z1, y0, y1, color) {
    var u = (x1 - x0) / 4, w = (z1 - z0) / 4, t = (y1 - y0) / 3.4;
    b.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, color, u, t);
    b.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0, color, u, t);
    b.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1, color, w, t);
    b.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0, color, w, t);
  };
  b.geometry = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    return g;
  };
  b.build = function (material) {
    var mesh = new THREE.Mesh(b.geometry(), material || TA.flatMaterial());
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  };
  return b;
};

TA.flatMaterial = function () {
  if (!TA._flatMat) TA._flatMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  return TA._flatMat;
};

// ---- canvas textures --------------------------------------------------------
TA.canvasTexture = function (w, h, draw) {
  var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  var tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

// One wall cell with windows; the building's pastel colour is multiplied in through vertex colours.
TA.facadeTexture = function (variant) {
  return TA.canvasTexture(64, 64, function (g) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    var grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#9fd0ea'); grad.addColorStop(0.55, '#4f86a8'); grad.addColorStop(1, '#2f5d7c');
    g.fillStyle = grad;
    if (variant === 0) { g.fillRect(9, 12, 46, 36); g.fillStyle = '#e8eef2'; g.fillRect(31, 12, 2, 36); }
    else if (variant === 1) { g.fillRect(0, 10, 64, 40); g.fillStyle = '#dfe7ec'; g.fillRect(0, 28, 64, 2); g.fillRect(30, 10, 3, 40); }
    else { g.fillRect(7, 14, 20, 30); g.fillRect(37, 14, 20, 30); g.fillStyle = '#d9d2c5'; g.fillRect(3, 48, 58, 5); }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(12, 14, 10, 6);
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 60, 64, 4);
  });
};

TA.facadeMaterial = function (variant) {
  TA._facades = TA._facades || [];
  if (!TA._facades[variant]) TA._facades[variant] = new THREE.MeshLambertMaterial({ vertexColors: true, map: TA.facadeTexture(variant) });
  return TA._facades[variant];
};

// A flat sign with text (shop names, billboards, door decals). Unlit so it always reads.
TA.makeSign = function (text, w, h, bg, fg, sub) {
  var tex = TA.canvasTexture(256, Math.max(32, Math.round(256 * h / w / 8) * 8), function (g, cw, ch) {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, cw - 8, ch - 8);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    var size = Math.min(ch * (sub ? 0.46 : 0.62), cw / (text.length * 0.6));
    g.font = 'italic 900 ' + Math.round(size) + 'px Arial, Helvetica, sans-serif';
    g.fillText(text, cw / 2, sub ? ch * 0.4 : ch / 2 + 2);
    if (sub) { g.font = '700 ' + Math.round(ch * 0.2) + 'px Arial, Helvetica, sans-serif'; g.fillText(sub, cw / 2, ch * 0.76); }
  });
  var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  return mesh;
};

// ---- vehicles ---------------------------------------------------------------
TA.GLASS = 0x1c2b3a; TA.TYRE = 0x16181b; TA.CHROME = 0xc9ced4;

TA.addWheels = function (b, wid, len, r, axles) {
  axles.forEach(function (az) {
    b.cyl(-wid / 2 + 0.08, r, az, r, r, 0.26, TA.TYRE, 10, 0, Math.PI / 2);
    b.cyl(wid / 2 - 0.08, r, az, r, r, 0.26, TA.TYRE, 10, 0, Math.PI / 2);
    b.cyl(-wid / 2 - 0.06, r, az, r * 0.5, r * 0.5, 0.04, TA.CHROME, 8, 0, Math.PI / 2);
    b.cyl(wid / 2 + 0.06, r, az, r * 0.5, r * 0.5, 0.04, TA.CHROME, 8, 0, Math.PI / 2);
  });
};

TA.addCarLamps = function (b, wid, len, y) {
  b.box(-wid * 0.32, y, len / 2 + 0.01, 0.34, 0.16, 0.06, 0xfff4c2); b.box(wid * 0.32, y, len / 2 + 0.01, 0.34, 0.16, 0.06, 0xfff4c2);
  b.box(-wid * 0.32, y, -len / 2 - 0.01, 0.36, 0.14, 0.06, 0xe5383b); b.box(wid * 0.32, y, -len / 2 - 0.01, 0.36, 0.14, 0.06, 0xe5383b);
  b.box(0, 0.36, len / 2 + 0.05, wid * 0.96, 0.2, 0.14, 0x2b2f36); b.box(0, 0.36, -len / 2 - 0.05, wid * 0.96, 0.2, 0.14, 0x2b2f36);
};

// Builds the merged, vertex-coloured body of one car model facing +z.
TA.buildCarGeometry = function (key, color) {
  var m = TA.CAR_MODELS[key], b = TA.Batch(), w = m.wid, l = m.len;
  if (key === 'gt') {
    b.box(0, 0.5, 0, w, 0.42, l, color); b.box(0, 0.62, l * 0.3, w * 0.96, 0.2, l * 0.36, color, 0, 0.1);
    b.box(0, 0.92, -0.25, w * 0.84, 0.44, l * 0.4, TA.GLASS); b.box(0, 1.16, -0.25, w * 0.8, 0.06, l * 0.34, color);
    b.box(0, 1.0, -l / 2 + 0.2, w * 0.98, 0.06, 0.34, 0x22252a); b.box(-w * 0.4, 0.86, -l / 2 + 0.2, 0.08, 0.3, 0.2, 0x22252a); b.box(w * 0.4, 0.86, -l / 2 + 0.2, 0.08, 0.3, 0.2, 0x22252a);
    b.box(0, 0.74, 0.1, 0.3, 0.02, l * 0.9, 0xffffff);
    TA.addWheels(b, w, l, 0.36, [l * 0.31, -l * 0.31]); TA.addCarLamps(b, w, l, 0.58);
  } else if (key === 'hauler') {
    b.box(0, 1.5, l / 2 - 1.1, w, 2.1, 2.2, color); b.box(0, 2.0, l / 2 - 0.02, w * 0.86, 0.8, 0.06, TA.GLASS);
    b.box(0, 0.75, -0.9, w * 0.9, 0.3, l - 2.2, 0x2b2f36); b.box(0, 2.05, -1.15, w, 2.3, l - 2.6, 0xdde1e6);
    b.box(0, 2.05, -1.15, w + 0.02, 0.5, l - 2.6, color);
    TA.addWheels(b, w, l, 0.52, [l / 2 - 1.2, -l / 2 + 1.0, -l / 2 + 2.2]); TA.addCarLamps(b, w, l, 0.95);
  } else if (key === 'angkot' || key === 'van' || key === 'swatvan') {
    var hgt = m.hgt;
    b.box(0, 0.36 + (hgt - 0.4) / 2, -0.1, w, hgt - 0.4, l * 0.94, color);
    b.box(0, hgt * 0.72, l * 0.47 - 0.1, w * 0.88, hgt * 0.26, 0.08, TA.GLASS);
    b.box(0, hgt * 0.7, -0.3, w + 0.02, hgt * 0.22, l * 0.6, key === 'swatvan' ? 0x0b132b : TA.GLASS);
    if (key === 'angkot') b.box(0, hgt * 0.42, -0.1, w + 0.03, 0.14, l * 0.94, 0xffffff);
    if (key === 'swatvan') { b.box(0, 0.5, l / 2, w * 1.02, 0.5, 0.3, 0x30343b); b.box(0, hgt + 0.06, 0, w * 0.5, 0.12, 0.5, 0x30343b); b.box(0, hgt * 0.42, -0.1, w + 0.03, 0.2, l * 0.94, 0xf1f3f5); }
    TA.addWheels(b, w, l, key === 'swatvan' ? 0.5 : 0.38, [l * 0.32, -l * 0.32]); TA.addCarLamps(b, w, l, 0.7);
  } else if (key === 'komet') {
    b.box(0, 0.55, 0, 0.34, 0.3, 1.3, color); b.box(0, 0.86, 0.5, 0.3, 0.6, 0.12, color); b.box(0, 1.16, 0.5, 0.62, 0.06, 0.08, 0x2b2f36);
    b.box(0, 0.74, -0.3, 0.36, 0.1, 0.62, 0x22252a);
    b.cyl(0, 0.3, 0.72, 0.3, 0.3, 0.12, TA.TYRE, 10, 0, Math.PI / 2); b.cyl(0, 0.3, -0.72, 0.3, 0.3, 0.12, TA.TYRE, 10, 0, Math.PI / 2);
    // rider
    b.box(0, 1.2, -0.2, 0.46, 0.56, 0.26, 0x457b9d); b.box(0, 1.63, -0.16, 0.28, 0.28, 0.28, 0xf2f2f2); b.box(0, 1.62, 0.0, 0.24, 0.12, 0.04, TA.GLASS);
    b.box(-0.2, 0.86, 0.02, 0.14, 0.2, 0.5, 0x2f3e46); b.box(0.2, 0.86, 0.02, 0.14, 0.2, 0.5, 0x2f3e46);
    b.box(0, 0.86, 0.9, 0.16, 0.12, 0.05, 0xfff4c2); b.box(0, 0.7, -0.96, 0.16, 0.1, 0.05, 0xe5383b);
  } else {
    // sedan family: sedan, taxi, cruiser
    b.box(0, 0.62, 0, w, 0.52, l, color);
    b.box(0, 1.12, -0.2, w * 0.86, 0.5, l * 0.52, TA.GLASS); b.box(0, 1.39, -0.2, w * 0.84, 0.07, l * 0.46, color);
    b.box(-w * 0.43, 1.12, -0.2, 0.05, 0.5, 0.1, color); b.box(w * 0.43, 1.12, -0.2, 0.05, 0.5, 0.1, color);
    if (key === 'cruiser') {
      b.box(0, 0.66, 0, w + 0.03, 0.16, l * 0.98, 0x1d4ed8); b.box(0, 0.62, l * 0.36, w + 0.02, 0.5, l * 0.26, 0x1b263b);
      b.box(0, 1.46, -0.2, 1.2, 0.08, 0.34, 0x2b2f36); b.box(0, 0.5, l / 2 + 0.12, w * 0.8, 0.34, 0.1, 0x2b2f36);
    }
    if (key === 'taxi') { b.box(0, 0.7, 0, w + 0.03, 0.12, l * 0.6, 0x1b1b1b); b.box(0, 1.5, -0.2, 0.7, 0.2, 0.3, 0xfff8dc); }
    TA.addWheels(b, w, l, 0.34, [l * 0.31, -l * 0.31]); TA.addCarLamps(b, w, l, 0.7);
  }
  return b.geometry();
};

TA.carGeoCache = {};
TA.makeCar = function (key, color) {
  var id = key + ':' + color, model = TA.CAR_MODELS[key];
  if (!TA.carGeoCache[id]) TA.carGeoCache[id] = TA.buildCarGeometry(key, color);
  var group = new THREE.Group(), body = new THREE.Mesh(TA.carGeoCache[id], TA.flatMaterial());
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  group.userData.bars = [];
  if (key === 'cruiser' || key === 'swatvan') {
    var y = key === 'cruiser' ? 1.56 : model.hgt + 0.2, z = key === 'cruiser' ? -0.2 : 0;
    var geo = TA._barGeo || (TA._barGeo = new THREE.BoxGeometry(0.52, 0.16, 0.3));
    var red = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2a2a })), blue = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    red.position.set(-0.32, y, z); blue.position.set(0.32, y, z);
    group.add(red, blue); group.userData.bars = [red, blue];
    var label = key === 'cruiser' ? 'TAPD' : 'BADAK-2', dark = key === 'swatvan';
    [-1, 1].forEach(function (side) {
      var sign = TA.makeSign(label, key === 'cruiser' ? 1.1 : 2.2, key === 'cruiser' ? 0.34 : 0.5, dark ? '#14213d' : '#ffffff', dark ? '#ffffff' : '#1d4ed8');
      sign.position.set(side * (model.wid / 2 + 0.03), key === 'cruiser' ? 0.86 : 1.2, key === 'cruiser' ? -0.5 : -0.4);
      sign.rotation.y = side * Math.PI / 2;
      group.add(sign);
    });
  }
  if (key === 'taxi') {
    var ts = TA.makeSign('TAKSI', 0.66, 0.2, '#fff8dc', '#1b1b1b');
    ts.position.set(0, 1.5, -0.04); ts.rotation.y = Math.PI; group.add(ts);
  }
  return group;
};

// Flash the red and blue lamps of a light bar (alternating, about four times a second).
TA.flashBars = function (group, time, on) {
  var bars = group.userData.bars;
  if (!bars || !bars.length) return;
  var phase = Math.floor(time * 8) % 2;
  bars[0].material.color.setHex(on && phase === 0 ? 0xff2a2a : 0x551010);
  bars[1].material.color.setHex(on && phase === 1 ? 0x3d7bff : 0x101c55);
  bars[0].scale.setScalar(on && phase === 0 ? 1.5 : 1); bars[1].scale.setScalar(on && phase === 1 ? 1.5 : 1);
};

// ELANG-1: white and blue police helicopter with a rotor disc and a searchlight cone.
TA.makeHelicopter = function () {
  var b = TA.Batch(), group = new THREE.Group();
  b.sphere(0, 0, 0.4, 1.25, 1.15, 2.4, 0xf8f9fa); b.sphere(0, 0.25, 1.75, 0.95, 0.75, 0.9, TA.GLASS);
  b.box(0, -0.15, 0.2, 2.56, 0.3, 3.2, 0x1d4ed8); b.box(0, 0.25, -3.4, 0.36, 0.4, 4.4, 0xf8f9fa);
  b.box(0, 0.95, -5.3, 0.1, 1.5, 0.8, 0x1d4ed8); b.box(0, 0.3, -5.3, 1.6, 0.08, 0.5, 0x1d4ed8);
  b.cyl(0, 1.3, 0.2, 0.14, 0.14, 0.6, 0x495057, 6);
  b.box(-1.0, -1.45, 0.3, 0.1, 0.1, 3.4, 0x343a40); b.box(1.0, -1.45, 0.3, 0.1, 0.1, 3.4, 0x343a40);
  b.box(-1.0, -1.1, 1.0, 0.07, 0.7, 0.07, 0x343a40); b.box(1.0, -1.1, 1.0, 0.07, 0.7, 0.07, 0x343a40);
  b.box(-1.0, -1.1, -0.5, 0.07, 0.7, 0.07, 0x343a40); b.box(1.0, -1.1, -0.5, 0.07, 0.7, 0.07, 0x343a40);
  b.sphere(0, -1.0, 1.5, 0.3, 0.3, 0.3, 0xfff6bf);
  group.add(b.build());
  var rotor = new THREE.Group();
  var disc = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0x8d99ae, transparent: true, opacity: 0.28, depthWrite: false }));
  var bladeMat = new THREE.MeshLambertMaterial({ color: 0x343a40 });
  var b1 = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.06, 0.34), bladeMat), b2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 11.2), bladeMat);
  rotor.add(disc, b1, b2); rotor.position.set(0, 1.62, 0.2);
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 14), disc.material);
  tail.rotation.z = Math.PI / 2; tail.position.set(0.22, 0.95, -5.3);
  var sign = TA.makeSign('ELANG-1', 1.9, 0.42, '#1d4ed8', '#ffffff');
  sign.position.set(1.27, 0.2, 0.2); sign.rotation.y = Math.PI / 2;
  group.add(rotor, tail, sign);
  group.userData.rotor = rotor; group.userData.tail = tail;
  return group;
};

// Translucent searchlight cone ending in a bright disc on the ground.
TA.makeSearchlight = function () {
  var coneGeo = new THREE.CylinderGeometry(0.06, 1, 1, 24, 1, true);
  coneGeo.translate(0, -0.5, 0);   // apex at the origin, opening downward along -y
  var cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff7cf, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  var disc = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: 0.42, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  cone.renderOrder = 5; disc.renderOrder = 4;
  return { cone: cone, disc: disc };
};

// ---- people -----------------------------------------------------------------
TA.SHIRTS = [0xef476f, 0xffd166, 0x06d6a0, 0x118ab2, 0xf78c6b, 0xffffff, 0x9b5de5, 0xf15bb5, 0x80ed99, 0xff9f1c, 0x3a86ff, 0xe76f51];
TA.SKINS = [0xc68642, 0xb9793f, 0xd9a066, 0x8d5524, 0xe0ac69];
TA.LOOKS = {
  raka: { shirt: 0x12b5a5, pants: 0x2b3a55, skin: 0xc68642, hair: 0x1b1b1b, hat: 'cap', hatColor: 0xf8f9fa },
  cop: { shirt: 0x1b2a4a, pants: 0x14203a, skin: 0xb9793f, hair: 0x111111, hat: 'cap', hatColor: 0x14203a },
  swat: { shirt: 0x15171a, pants: 0x15171a, skin: 0xb9793f, hair: 0x111111, hat: 'helmet', hatColor: 0x0d0f12 },
  guard: { shirt: 0x8d99ae, pants: 0x5c677d, skin: 0xc68642, hair: 0x222222, hat: 'cap', hatColor: 0x5c677d },
  thug: { shirt: 0x7f1d1d, pants: 0x1f2937, skin: 0xb9793f, hair: 0x111111, hat: 'none', hatColor: 0 }
};

TA.randomLook = function (rng) {
  var hats = ['none', 'none', 'none', 'cap', 'straw'];
  return {
    shirt: TA.SHIRTS[Math.floor(rng() * TA.SHIRTS.length)], pants: [0x2b3a55, 0x3d405b, 0x6b705c, 0x264653, 0xf4f1de][Math.floor(rng() * 5)],
    skin: TA.SKINS[Math.floor(rng() * TA.SKINS.length)], hair: [0x1b1b1b, 0x3b2f2f, 0x5c4033][Math.floor(rng() * 3)],
    hat: hats[Math.floor(rng() * hats.length)], hatColor: [0xffffff, 0xe63946, 0xf2cc8f][Math.floor(rng() * 3)]
  };
};

TA.limbMaterial = function (color) {
  TA._limbMats = TA._limbMats || {};
  return TA._limbMats[color] || (TA._limbMats[color] = new THREE.MeshLambertMaterial({ color: color }));
};

// Blocky but proportioned person, 1.8 m tall, facing +z. Arms and legs swing from the shoulder and hip.
TA.makePerson = function (look) {
  var b = TA.Batch(), group = new THREE.Group();
  b.box(0, 1.17, 0, 0.56, 0.62, 0.3, look.shirt); b.box(0, 0.9, 0, 0.5, 0.12, 0.28, look.pants);
  b.box(0, 1.52, 0, 0.14, 0.1, 0.14, look.skin); b.box(0, 1.69, 0, 0.3, 0.28, 0.3, look.skin);
  b.box(0, 1.72, 0.155, 0.2, 0.05, 0.01, 0x222222);
  if (look.hat === 'cap') { b.box(0, 1.86, 0, 0.32, 0.1, 0.32, look.hatColor); b.box(0, 1.83, 0.22, 0.28, 0.03, 0.18, look.hatColor); }
  else if (look.hat === 'helmet') { b.box(0, 1.8, 0, 0.36, 0.24, 0.36, look.hatColor); b.box(0, 1.7, 0.17, 0.3, 0.1, 0.03, 0x3a506b); }
  else if (look.hat === 'straw') { b.cyl(0, 1.85, 0, 0.12, 0.42, 0.14, 0xf2cc8f, 10); }
  else { b.box(0, 1.85, -0.02, 0.32, 0.08, 0.32, look.hair); b.box(0, 1.72, -0.15, 0.32, 0.22, 0.04, look.hair); }
  var body = b.build(); group.add(body);
  var armGeo = TA._armGeo || (TA._armGeo = new THREE.BoxGeometry(0.15, 0.62, 0.17).translate(0, -0.27, 0));
  var legGeo = TA._legGeo || (TA._legGeo = new THREE.BoxGeometry(0.22, 0.86, 0.24).translate(0, -0.43, 0));
  var parts = {};
  [['armL', armGeo, -0.36, 1.44, look.shirt], ['armR', armGeo, 0.36, 1.44, look.shirt], ['legL', legGeo, -0.14, 0.86, look.pants], ['legR', legGeo, 0.14, 0.86, look.pants]].forEach(function (d) {
    var mesh = new THREE.Mesh(d[1], TA.limbMaterial(d[4]));
    mesh.position.set(d[2], d[3], 0); mesh.castShadow = true;
    group.add(mesh); parts[d[0]] = mesh;
  });
  group.userData.parts = parts;
  return group;
};

// Walk cycle; pose 'aim' raises the right arm, 'down' lays the body flat, 'sit' hides it inside a car.
TA.animatePerson = function (group, phase, amount, pose) {
  var p = group.userData.parts, s = Math.sin(phase) * amount;
  p.legL.rotation.x = s; p.legR.rotation.x = -s;
  p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = pose === 'aim' ? -1.45 : s * 0.8;
  if (pose === 'aim') p.armL.rotation.x = -1.2;
  group.rotation.x = pose === 'down' ? -Math.PI / 2 : 0;
  group.position.y += pose === 'down' ? 0.2 : 0;
};

// ---- street props, all added to a batch -----------------------------------
TA.addPalm = function (b, x, z, rng) {
  var h = 7 + rng() * 4, lean = (rng() - 0.5) * 0.9, ang = rng() * 6.28, lx = Math.sin(ang) * lean, lz = Math.cos(ang) * lean;
  for (var i = 0; i < 4; i++) {
    var t = (i + 0.5) / 4;
    b.cyl(x + lx * t * t * 2, h * t, z + lz * t * t * 2, 0.2 - i * 0.02, 0.27 - i * 0.02, h / 4 + 0.1, i % 2 ? 0x9c7a55 : 0x8a6a48, 6);
  }
  var tx = x + lx * 2, tz = z + lz * 2;
  for (var f = 0; f < 8; f++) {
    var a = f / 8 * 6.283 + rng() * 0.4, len = 3 + rng() * 1.2, droop = 0.45 + rng() * 0.3;
    b.box(tx + Math.sin(a) * len * 0.45, h - Math.sin(droop) * len * 0.3 + 0.2, tz + Math.cos(a) * len * 0.45, 0.9, 0.08, len, f % 2 ? 0x2f9e44 : 0x3fb950, a, droop);
  }
  b.sphere(tx, h - 0.1, tz, 0.45, 0.4, 0.45, 0x6b4f2a);
};

TA.addLamp = function (b, x, z, dx, dz) {
  b.cyl(x, 3.4, z, 0.09, 0.13, 6.8, 0x6c757d, 6);
  b.box(x + dx * 0.9, 6.8, z + dz * 0.9, dx ? 2 : 0.14, 0.12, dz ? 2 : 0.14, 0x6c757d);
  b.box(x + dx * 1.8, 6.66, z + dz * 1.8, 0.5, 0.14, 0.5, 0xfff3bf);
};

TA.addTrafficPole = function (b, x, z) {
  b.cyl(x, 2.6, z, 0.1, 0.1, 5.2, 0x343a40, 6);
  b.box(x, 4.7, z, 0.44, 1.1, 0.44, 0x212529);
};

TA.addBench = function (b, x, z, ry) {
  b.box(x, 0.6, z, 1.8, 0.08, 0.5, 0xa47148, ry); b.box(x, 0.95, z, 1.8, 0.4, 0.07, 0xa47148, ry);
  b.box(x, 0.38, z, 1.6, 0.36, 0.1, 0x495057, ry);
};

TA.addHydrant = function (b, x, z) {
  b.cyl(x, 0.5, z, 0.16, 0.2, 0.7, 0xe63946, 8); b.sphere(x, 0.9, z, 0.18, 0.14, 0.18, 0xe63946);
};

TA.addBusStop = function (b, x, z, ry) {
  b.box(x, 2.6, z, 4.2, 0.12, 1.6, 0x118ab2, ry); b.box(x, 1.45, z, 4.0, 2.1, 0.08, 0xbde0fe, ry);
  var s = Math.sin(ry), c = Math.cos(ry);
  b.cyl(x - c * 1.9, 1.4, z + s * 1.9, 0.06, 0.06, 2.5, 0x495057, 6); b.cyl(x + c * 1.9, 1.4, z - s * 1.9, 0.06, 0.06, 2.5, 0x495057, 6);
  b.box(x, 0.62, z, 3.0, 0.1, 0.5, 0xf8f9fa, ry);
};

// Striped umbrella (beach or market stall).
TA.addUmbrella = function (b, x, z, c1, c2, size) {
  var r = size || 1.7;
  b.cyl(x, 1.25, z, 0.04, 0.04, 2.5, 0xf8f9fa, 5);
  b.cyl(x, 2.55, z, 0.08, r, 0.6, c1, 10); b.cyl(x, 2.3, z, r, r * 1.04, 0.1, c2, 10);
};

TA.addStall = function (b, x, z, ry, c1, c2, rng) {
  b.box(x, 0.55, z, 2.6, 1.0, 1.2, 0xb08968, ry); b.box(x, 1.08, z, 2.7, 0.08, 1.3, 0xe6ccb2, ry);
  var fruit = [0xff595e, 0xffca3a, 0x8ac926, 0xff924c];
  for (var i = 0; i < 4; i++) {
    var o = (i - 1.5) * 0.6;
    b.box(x + Math.cos(ry) * o, 1.22, z - Math.sin(ry) * o, 0.5, 0.22, 0.8, fruit[Math.floor(rng() * 4)], ry);
  }
  TA.addUmbrella(b, x, z, c1, c2, 2.0);
};

TA.CONTAINER_COLORS = [0xd62828, 0x1d70b8, 0xf77f00, 0x2a9d8f, 0xfcbf49, 0x6a4c93, 0xe9ecef, 0x386641];
TA.addContainer = function (b, x, y, z, ry, color) {
  b.box(x, y + 1.3, z, 2.44, 2.6, 12.2, color, ry);
  b.box(x, y + 1.3, z, 2.5, 2.3, 0.3, 0xffffff, ry);
};

// Gantry crane on the quay: two legs, a boom reaching over the water, a hanging container.
TA.addCrane = function (b, x, z) {
  var c = 0xf4a100, d = 0xd00000;
  [[-7, -5], [7, -5], [-7, 5], [7, 5]].forEach(function (o) { b.box(x + o[0], 17, z + o[1], 1.2, 34, 1.2, c); });
  b.box(x, 34, z - 5, 15.2, 1.4, 1.4, c); b.box(x, 34, z + 5, 15.2, 1.4, 1.4, c);
  b.box(x, 12, z - 5, 15.2, 0.8, 0.8, c); b.box(x, 12, z + 5, 15.2, 0.8, 0.8, c);
  b.box(x, 36, z + 16, 2.2, 2.2, 62, d); b.box(x, 44, z - 4, 1.2, 16, 1.2, d);
  b.box(x, 43, z + 14, 0.3, 0.3, 40, 0x343a40, 0, 0.36);
  b.box(x, 33.5, z + 2, 4, 3, 4, 0xf8f9fa);
  b.box(x, 27, z + 26, 0.12, 16, 0.12, 0x212529); TA.addContainer(b, x, 17.6, z + 26, Math.PI / 2, 0x1d70b8);
};

TA.addShip = function (b, x, z) {
  b.box(x, 2.2, z, 130, 9, 22, 0x1d3557); b.box(x, -1.2, z, 130, 2.2, 22.2, 0xc1121f); b.box(x, 6.9, z, 131, 0.5, 22.6, 0xf1faee);
  b.box(x - 52, 14, z, 14, 14, 18, 0xf8f9fa); b.box(x - 52, 22, z, 16, 2.4, 20, 0xf8f9fa); b.box(x - 52, 18.4, z, 14.2, 1.4, 18.2, TA.GLASS);
  b.cyl(x - 56, 27, z, 1.6, 1.8, 7, 0xd00000, 10);
  for (var i = 0; i < 7; i++) for (var j = 0; j < 5; j++) for (var k = 0; k < 1 + ((i * 3 + j * 5) % 3); k++) {
    TA.addContainer(b, x - 34 + i * 12.6, 7.1 + k * 2.6, z - 8.2 + j * 4.1, Math.PI / 2, TA.CONTAINER_COLORS[(i + j * 2 + k * 3) % 8]);
  }
};

TA.addBoat = function (b, x, z, ry, color) {
  b.box(x, 0.1, z, 2.4, 1.2, 7, color, ry); b.box(x, 0.9, z, 2.6, 0.2, 7.2, 0xffffff, ry);
  b.box(x - Math.sin(ry) * 1, 1.7, z - Math.cos(ry) * 1, 1.8, 1.4, 2.4, 0xf8f9fa, ry);
  b.cyl(x, 3.4, z, 0.05, 0.05, 4, 0xadb5bd, 5);
};

TA.addBillboard = function (b, x, z, ry, w, h, base) {
  var s = Math.sin(ry), c = Math.cos(ry);
  b.cyl(x - c * w * 0.3, base / 2, z + s * w * 0.3, 0.2, 0.2, base, 0x495057, 6); b.cyl(x + c * w * 0.3, base / 2, z - s * w * 0.3, 0.2, 0.2, base, 0x495057, 6);
  b.box(x, base + h / 2, z, w + 0.4, h + 0.4, 0.3, 0x343a40, ry);
};

// Stunt ramp wedge.
TA.addRamp = function (b, x, z, ry) {
  b.box(x, 0.75, z, 5, 0.25, 7.5, 0xff9f1c, ry, -0.22);
  b.box(x + Math.sin(ry) * 3.4, 0.75, z + Math.cos(ry) * 3.4, 5, 1.5, 0.3, 0xf8f9fa, ry);
};
