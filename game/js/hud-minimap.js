// hud-minimap.js — the round rotating minimap and the full city map drawing.
var TA = window.TA || (window.TA = {});
function drawMinimap(g) {
  var P = TA.player, T = P.car || P, h = P.car ? P.car.h : TA.camYaw, sc = 0.55;
  g.save(); g.clearRect(0, 0, 180, 180); g.beginPath(); g.arc(90, 90, 86, 0, 7); g.clip();
  g.translate(90, 90); g.rotate(h - Math.PI); g.scale(-sc, sc); g.translate(-T.x, -T.z);
  drawCityLayers(g, 2.4);
  g.restore();
  g.fillStyle = '#12e0c8'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(90, 80); g.lineTo(97, 98); g.lineTo(90, 94); g.lineTo(83, 98); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = TA.S.wanted ? (Math.floor(TA.S.time * 4) % 2 ? '#ff3b30' : '#2a6bff') : '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(90, 90, 86, 0, 7); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 13px Arial'; g.fillText('N', 90 - Math.sin(h - Math.PI) * -74 - 4, 90 - Math.cos(h - Math.PI) * 74 + 4);
}
function drawFullCityMap(g, w, h, labels) {
  g.save(); g.fillStyle = '#25b9c4'; g.fillRect(0, 0, w, h);
  var sc = Math.min(w / 1500, h / 1060); g.translate(w / 2 - 150 * sc, h / 2 - 20 * sc); g.scale(sc, sc);
  drawCityLayers(g, 5);
  if (labels) { g.font = 'bold 30px Arial'; g.textAlign = 'center'; TA.CFG.DISTRICTS.forEach(function (d) { g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(d.x - 105, d.z - 24, 210, 34); g.fillStyle = d.color; g.fillText(d.name, d.x, d.z + 3); }); }
  var P = TA.player; g.fillStyle = '#12e0c8'; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(P.x, P.z, 13, 0, 7); g.fill(); g.stroke();
  g.restore();
}
function drawCityLayers(g, dot) {
  var R = TA.CFG.ROADS, S = TA.S;
  g.fillStyle = '#f0dcae'; g.fillRect(-480, -475, 960, 925); g.fillStyle = '#5d5752'; g.beginPath(); g.arc(760, -300, 150, 0, 7); g.fill();
  g.fillStyle = '#cfc8ba'; g.fillRect(-470, -306, 1130, 12);
  g.fillStyle = '#d9cfbb'; for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) g.fillRect(-393 + i * 100, -393 + j * 100, 86, 86);
  g.fillStyle = '#fbf7ee'; g.fillRect(118, 217, 64, 42);
  g.fillStyle = '#77747a'; R.forEach(function (r) { g.fillRect(r - 7, -470, 14, 940); g.fillRect(-470, r - 7, 940, 14); });
  TA.cars.forEach(function (c) { if (c.role === 'police' || c.role === 'block') { g.fillStyle = Math.floor(S.time * 4) % 2 ? '#ff3b30' : '#2a6bff'; g.fillRect(c.x - dot * 2, c.z - dot * 2, dot * 4, dot * 4); } else if (c.role !== 'player') { g.fillStyle = '#f4f4f4'; g.fillRect(c.x - dot, c.z - dot, dot * 2, dot * 2); } });
  TA.people.forEach(function (p) { if (p.dead || p.kind === 'ped') return; g.fillStyle = p.kind === 'guard' || p.kind === 'enemy' ? '#ff3b30' : '#4dabf7'; g.beginPath(); g.arc(p.x, p.z, dot * 1.3, 0, 7); g.fill(); });
  TA.coins.forEach(function (c) { g.fillStyle = '#ffd400'; g.beginPath(); g.arc(c.position.x, c.position.z, dot, 0, 7); g.fill(); });
  TA.landmarks.safehouses.forEach(function (s) { g.fillStyle = '#2fbf71'; g.fillRect(s.x - dot * 2.5, s.z - dot * 2.5, dot * 5, dot * 5); });
  if (TA.beacon.visible) { g.fillStyle = '#ffe14d'; g.strokeStyle = '#111'; g.lineWidth = dot / 2; g.beginPath(); g.arc(TA.beacon.position.x, TA.beacon.position.z, dot * 3.4, 0, 7); g.fill(); g.stroke(); }
  if (TA.heli) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(TA.heli.position.x, TA.heli.position.z, dot * 2.6, 0, 7); g.fill(); }
}
TA.drawMinimap = drawMinimap; TA.drawFullCityMap = drawFullCityMap;
