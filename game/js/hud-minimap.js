// The round minimap and the full city map: a pre-rendered map image plus live blips, route and icons.
TA.MAP = { x0: -480, z0: -480, w: 1310, h: 860 };

TA.mapX = function (x) { return x - TA.MAP.x0; };
TA.mapZ = function (z) { return z - TA.MAP.z0; };

// Draws the static city once into an off-screen canvas at one pixel per metre.
TA.buildMapCanvas = function () {
  var M = TA.MAP, cv = document.createElement('canvas'), C = TA.CFG, I = C.ISLAND;
  cv.width = M.w; cv.height = M.h;
  var g = cv.getContext('2d'), X = TA.mapX, Z = TA.mapZ, i;
  g.fillStyle = '#1697ad'; g.fillRect(0, 0, M.w, M.h);
  g.fillStyle = '#35b9c9'; g.fillRect(X(-470), Z(-470), 940, 770);
  g.fillStyle = '#e8dfcf'; g.fillRect(X(-450), Z(-450), 900, 720);
  g.fillStyle = '#f6e4b5'; g.fillRect(X(-120), Z(222), 570, 48);
  g.fillStyle = '#35b9c9'; g.beginPath(); g.arc(X(I.x), Z(I.z), I.r + 16, 0, 7); g.fill();
  g.fillStyle = '#5c5552'; g.beginPath(); g.arc(X(I.x), Z(I.z), I.r, 0, 7); g.fill();
  g.fillStyle = '#3d3633'; g.beginPath(); g.arc(X(742), Z(-372), 44, 0, 7); g.fill();
  g.fillStyle = '#ff6a00'; g.beginPath(); g.arc(X(742), Z(-372), 9, 0, 7); g.fill();
  // district tints, sampled on a coarse grid so the borders follow districtAt()
  g.globalAlpha = 0.42;
  for (var x = -450; x < 450; x += 10) for (var z = -450; z < 270; z += 10) {
    if (z >= 222 && x >= -120) continue;
    g.fillStyle = TA.districtAt(x + 5, z + 5).tint; g.fillRect(X(x), Z(z), 10, 10);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#9bd17f'; g.globalAlpha = 0.6; g.fillRect(X(-450), Z(-450), 900, 108); g.globalAlpha = 1;
  // buildings
  g.fillStyle = 'rgba(70,60,80,0.55)';
  TA.world.buildings.forEach(function (b) { g.fillRect(X(b.x0), Z(b.z0), b.x1 - b.x0, b.z1 - b.z0); });
  // roads
  var road = function (ax, az, bx, bz, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(ax), Z(az)); g.lineTo(X(bx), Z(bz)); g.stroke(); };
  g.lineCap = 'square';
  for (i = 0; i < 2; i++) {
    var w = i ? 12 : 17, col = i ? '#fdfdfd' : '#7d7f86';
    TA.ROADS_NS.forEach(function (r) { road(r.x, -240, r.x, 210, w, col); });
    TA.ROADS_EW.forEach(function (r) { road(-360, r.z, 360, r.z, w, col); });
    road(-360, -330, -360, -240, w, col);
    road(-340, C.TOL_Z, 450, C.TOL_Z, w + 2, i ? '#ffe29a' : '#7d7f86');
    road(450, C.TOL_Z, 600, C.TOL_Z, w + 2, i ? '#ff6b6b' : '#7d2020');
    road(600, C.TOL_Z, 660, C.TOL_Z, w, col); road(660, C.TOL_Z, 660, -295, w, col);
  }
  g.fillStyle = '#b08968'; g.fillRect(X(176.5), Z(268), 7, 77);
  g.fillStyle = '#1d3557'; g.fillRect(X(-365), Z(281), 130, 22);
  TA.mapStatic = cv;
  return cv;
};

// A simple road route: hop between intersections, always toward the target.
TA.routeTo = function (fx, fz, tx, tz) {
  var pts = [[fx, fz]], n = TA.nearestNode(fx, fz), guard = 0;
  if (TA.dist(fx, fz, tx, tz) < 40 || fx > 452 || tx > 452) { pts.push([tx, tz]); return pts; }
  while (guard++ < 14) {
    pts.push([n.x, n.z]);
    var best = n, bd = TA.dist(n.x, n.z, tx, tz);
    n.nb.forEach(function (id) { var m = TA.world.nodes[id], d = TA.dist(m.x, m.z, tx, tz); if (d < bd - 1) { bd = d; best = m; } });
    if (best === n) break;
    n = best;
  }
  pts.push([tx, tz]);
  return pts;
};

// Icons shared by the minimap and the full map. px, pz convert world metres to canvas pixels.
TA.drawMapIcons = function (g, px, pz, scale, labels) {
  var p = TA.player, target = TA.stageTarget(), i, s = Math.max(1, scale);
  var dot = function (x, z, r, col, shape) {
    g.fillStyle = col; g.strokeStyle = '#0b1320'; g.lineWidth = 1.5;
    g.beginPath();
    if (shape === 'sq') g.rect(px(x) - r, pz(z) - r, r * 2, r * 2);
    else if (shape === 'di') { g.moveTo(px(x), pz(z) - r * 1.3); g.lineTo(px(x) + r * 1.3, pz(z)); g.lineTo(px(x), pz(z) + r * 1.3); g.lineTo(px(x) - r * 1.3, pz(z)); g.closePath(); }
    else g.arc(px(x), pz(z), r, 0, 7);
    g.fill(); g.stroke();
  };
  if (target) {
    var route = TA.routeTo(p.x, p.z, target.x, target.z);
    g.strokeStyle = '#ffd43b'; g.lineWidth = 3 * s; g.lineJoin = 'round'; g.setLineDash([6 * s, 4 * s]);
    g.beginPath(); route.forEach(function (pt, k) { if (k) g.lineTo(px(pt[0]), pz(pt[1])); else g.moveTo(px(pt[0]), pz(pt[1])); }); g.stroke(); g.setLineDash([]);
  }
  var colors = { race: '#4ade80', wreck: '#4ade80', export: '#4ade80', safe: '#4895ef', gunshop: '#ff9f1c', garage: '#ffd166', respray: '#f78fb3' };
  var letters = { race: 'R', wreck: 'W', export: 'X', safe: 'S', gunshop: 'G', garage: 'A', respray: 'P' };
  TA.markers.forEach(function (m) {
    dot(m.x, m.z, 5 * s, colors[m.type], m.type === 'safe' ? 'sq' : 'ci');
    g.fillStyle = '#0b1320'; g.font = 'bold ' + Math.round(8 * s) + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letters[m.type], px(m.x), pz(m.z) + 0.5);
    if (labels && (m.type === 'gunshop' || m.type === 'respray' || (m.type === 'safe' && m.data !== 'workshop'))) { g.fillStyle = '#0b1320'; g.font = 'bold 9px Arial'; g.textAlign = 'left'; g.fillText(m.label.replace(' Safehouse', ''), px(m.x) + 8, pz(m.z)); }
  });
  TA.coins.forEach(function (c) { if (labels && TA.state.coins.indexOf(c.i) < 0) dot(c.x, c.z, 2.5, '#ffd43b'); });
  TA.people.forEach(function (o) { if (!o.dead && o.hostile && o.kind !== 'cop' && o.kind !== 'swat') dot(o.x, o.z, 3 * s, '#ff6b6b'); });
  TA.units.forEach(function (u) { var q = TA.unitPos(u); dot(q.x, q.z, (u.type === 'heli' ? 5 : 4) * s, TA.run.time % 0.5 < 0.25 ? '#ff3b30' : '#3d7bff', u.type === 'heli' ? 'di' : 'ci'); });
  TA.cars.forEach(function (c) { if (c.target && !c.dead) dot(c.x, c.z, 4.5 * s, '#ff3b30', 'di'); });
  if (target) dot(target.x, target.z, 6 * s, '#ffd43b', 'di');
  // player arrow
  g.save(); g.translate(px(p.x), pz(p.z)); g.rotate(-TA.cameraFocus().h + Math.PI);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#0b1320'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -9 * s); g.lineTo(6.5 * s, 7 * s); g.lineTo(0, 3.5 * s); g.lineTo(-6.5 * s, 7 * s); g.closePath(); g.fill(); g.stroke();
  g.restore();
};

TA.drawMinimap = function () {
  var cv = TA.hud.mapCanvas, g = cv.getContext('2d'), p = TA.player, size = cv.width, zoom = 0.55, span = size / zoom;
  var sx = TA.mapX(p.x) - span / 2, sz = TA.mapZ(p.z) - span / 2;
  g.save();
  g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, 7); g.clip();
  g.fillStyle = '#1697ad'; g.fillRect(0, 0, size, size);
  g.drawImage(TA.mapStatic, sx, sz, span, span, 0, 0, size, size);
  TA.drawMapIcons(g, function (x) { return (TA.mapX(x) - sx) * zoom; }, function (z) { return (TA.mapZ(z) - sz) * zoom; }, 1, false);
  g.restore();
};

// The big map on the map screen, with district names and a legend-friendly icon size.
TA.drawFullMap = function (cv) {
  var g = cv.getContext('2d'), M = TA.MAP, k = cv.width / M.w;
  g.drawImage(TA.mapStatic, 0, 0, cv.width, cv.height);
  g.font = 'italic 900 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['PELABUHAN', -285, 165], ['PASAR SENJA', -240, -150], ['GANG NEON', 90, -100], ['PANTAI', 150, 246], ['TOL LAYANG', 60, -390], ['PULAU ABU', 690, -250]].forEach(function (d) {
    g.lineWidth = 3; g.strokeStyle = 'rgba(11,19,32,0.85)'; g.strokeText(d[0], TA.mapX(d[1]) * k, TA.mapZ(d[2]) * k);
    g.fillStyle = '#ffffff'; g.fillText(d[0], TA.mapX(d[1]) * k, TA.mapZ(d[2]) * k);
  });
  TA.drawMapIcons(g, function (x) { return TA.mapX(x) * k; }, function (z) { return TA.mapZ(z) * k; }, 1.15, true);
};
