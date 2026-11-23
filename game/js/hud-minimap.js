// The corner minimap (north-up, centred on the player) and the full city map used by the map screen.

function drawMinimap() {
  const canvas = document.getElementById('minimap'), g = canvas.getContext('2d');
  const p = playerPosition(), size = 202, half = size / 2, scale = G.player.car ? 0.4 : 0.9;
  g.save();
  g.fillStyle = '#2b6f8f';
  g.fillRect(0, 0, size, size);
  // North-up: x east runs right, z south runs down, centred on the player.
  g.translate(half, half);
  g.scale(scale, scale);
  g.translate(-p.x, -p.z);
  drawMapLayers(g, 1 / scale, true);
  g.restore();
  g.save();
  g.translate(half, half);
  g.rotate(Math.PI - p.heading);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#0b1220'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(9,14,26,0.85)'; g.fillRect(0, 0, 26, 24);
  g.fillStyle = '#ffd43b'; g.font = '900 17px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', 13, 13);
  if (G.wanted > 0 && Math.floor(G.time * 3) % 2 === 0) { g.strokeStyle = 'rgba(255,70,60,0.9)'; g.lineWidth = 6; g.strokeRect(3, 3, size - 6, size - 6); }
}

function drawFullCityMap(canvas, labels) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.fillStyle = '#2b6f8f';
  g.fillRect(0, 0, w, h);
  // Fit the mainland and Pulau Abu: x -450..830, z -470..410.
  const scale = Math.min(w / 1280, h / 880);
  g.save();
  g.translate(w / 2, h / 2);
  g.scale(scale, scale);
  g.translate(-190, 30);
  drawMapLayers(g, 1 / scale, false);
  if (labels) {
    g.font = '900 ' + 15 / scale + 'px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const d of MAP_DISTRICT_LABELS) { g.fillStyle = 'rgba(9,14,26,0.7)'; const tw = g.measureText(d.name).width + 10 / scale; g.fillRect(d.x - tw / 2, d.z - 11 / scale, tw, 22 / scale); g.fillStyle = d.tint; g.fillText(d.name, d.x, d.z); }
  }
  const p = playerPosition();
  g.translate(p.x, p.z);
  g.rotate(Math.PI - p.heading);
  g.fillStyle = '#fff'; g.strokeStyle = '#0b1220'; g.lineWidth = 2 / scale;
  const u = 1 / scale;
  g.beginPath(); g.moveTo(0, -11 * u); g.lineTo(8 * u, 9 * u); g.lineTo(0, 4 * u); g.lineTo(-8 * u, 9 * u); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// Shared drawing in world units (x east, z south): land, districts, roads, route, icons, police.
function drawMapLayers(g, px, mini) {
  g.fillStyle = '#e9d9a6';
  g.fillRect(LAND.x0, LAND.z0, LAND.x1 - LAND.x0, LAND.beachZ - LAND.z0);
  g.beginPath(); g.arc(ISLAND.x, ISLAND.z, ISLAND.r, 0, 6.3); g.fillStyle = '#8f8880'; g.fill();
  for (const d of MAP_DISTRICT_RECTS) { g.fillStyle = d.fill; g.fillRect(d.x0, d.z0, d.x1 - d.x0, d.z1 - d.z0); }
  g.fillStyle = '#8a6b4a'; g.fillRect(LAND.pierX - 4, LAND.z1, 8, LAND.pierZ1 - LAND.z1);
  g.strokeStyle = '#3a4354'; g.lineCap = 'butt';
  for (const x of ROAD_XS) { g.lineWidth = 16; g.beginPath(); g.moveTo(x, ROAD_ZS[0] - 8); g.lineTo(x, ROAD_ZS[4] + 8); g.stroke(); }
  ROAD_ZS.forEach((z, i) => { g.lineWidth = i === 4 ? 22 : 16; g.beginPath(); g.moveTo(ROAD_XS[0] - 8, z); g.lineTo(ROAD_XS[6] + 8, z); g.stroke(); });
  g.lineWidth = 16;
  g.beginPath(); g.moveTo(ROAD_XS[0], ROAD_ZS[0]); g.lineTo(ROAD_XS[0], FLYOVER.z); g.stroke();
  g.strokeStyle = '#c94a3d'; g.lineWidth = 18;
  g.beginPath(); g.moveTo(FLYOVER.x0 - 10, FLYOVER.z); g.lineTo(FLYOVER.x1 + 20, FLYOVER.z); g.stroke();
  g.fillStyle = '#f4f1e8'; g.fillRect(8, -92, 46, 64);
  const route = currentRoutePoints();
  if (route.length > 1) {
    g.strokeStyle = '#ffd43b'; g.lineWidth = Math.max(5, 4 * px); g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(route[0].x, route[0].z);
    for (let i = 1; i < route.length; i++) g.lineTo(route[i].x, route[i].z);
    g.stroke();
  }
  const r = (mini ? 6.5 : 7) * px;
  for (const icon of mapIcons()) {
    if (icon.kind === 'target') { g.fillStyle = '#ffd43b'; g.strokeStyle = '#1a1300'; g.lineWidth = 2 * px; g.beginPath(); g.arc(icon.x, icon.z, r * 1.25, 0, 6.3); g.fill(); g.stroke(); continue; }
    g.fillStyle = icon.color;
    g.fillRect(icon.x - r, icon.z - r, r * 2, r * 2);
    g.strokeStyle = '#0b1220'; g.lineWidth = 1.5 * px; g.strokeRect(icon.x - r, icon.z - r, r * 2, r * 2);
  }
  for (const u of W.units) {
    const src = u.car || u.person || u;
    const flash = Math.floor(G.time * 4 + (src.id || 0)) % 2 === 0;
    if (u.kind === 'roadblock') { g.fillStyle = '#be4bdb'; g.fillRect(u.x - 2.2 * r, u.z - 0.7 * r, 4.4 * r, 1.4 * r); g.fillStyle = '#fff'; g.fillRect(u.x - 0.6 * r, u.z - 0.7 * r, 1.2 * r, 1.4 * r); continue; }
    g.fillStyle = u.kind === 'heli' ? '#ffffff' : flash ? '#ff4d4d' : '#4dabf7';
    g.strokeStyle = '#0b1220'; g.lineWidth = 1.5 * px;
    g.beginPath();
    if (u.kind === 'heli') { g.moveTo(src.x, src.z - 1.5 * r); g.lineTo(src.x + 1.3 * r, src.z + r); g.lineTo(src.x - 1.3 * r, src.z + r); g.closePath(); }
    else g.arc(src.x, src.z, u.kind === 'foot' ? r * 0.7 : r, 0, 6.3);
    g.fill(); g.stroke();
  }
  for (const e of W.people) if (e.hostile && e.kind !== 'cop' && e.state !== 'dead') { g.fillStyle = '#ff3b30'; g.beginPath(); g.moveTo(e.x, e.z - r * 0.9); g.lineTo(e.x + r * 0.9, e.z); g.lineTo(e.x, e.z + r * 0.9); g.lineTo(e.x - r * 0.9, e.z); g.closePath(); g.fill(); }
}

// Side-job and service icons plus the current objective.
function mapIcons() {
  const icons = [];
  for (const id of SAFEHOUSES) icons.push({ x: PLACES[id].x, z: PLACES[id].z, color: '#51cf66', kind: 'safe', name: 'Safehouse' });
  icons.push({ x: PLACES.gunshop.x, z: PLACES.gunshop.z, color: '#ff922b', kind: 'shop', name: 'KELO ARMS' });
  icons.push({ x: PLACES.respray.x, z: PLACES.respray.z, color: '#22b8cf', kind: 'shop', name: 'Respray' });
  icons.push({ x: PLACES.dock.x, z: PLACES.dock.z, color: '#94d82d', kind: 'export', name: 'Export dock' });
  RACES.forEach((race) => icons.push({ x: race.start[0], z: race.start[1], color: '#f783ac', kind: 'race', name: race.name }));
  WRECK_TARGETS.forEach((t, i) => { if (!G.wrecksDone[i]) icons.push({ x: t.at[0], z: t.at[1], color: '#e03131', kind: 'wreck', name: t.name }); });
  if (!G.contract && G.contractsDone < CONTRACTS.length) { const s = PLACES[CONTRACTS[G.contractsDone].start]; icons.push({ x: s.x, z: s.z, kind: 'target', name: 'Contract' }); }
  for (const m of W.markers) if (m.objective) icons.push({ x: m.x, z: m.z, kind: 'target', name: 'Objective' });
  return icons;
}

function currentRoutePoints() {
  // With heat on and no objective, the route points at the last safehouse as a place to hide.
  const target = W.markers.find((m) => m.objective) || (!G.contract && G.contractsDone < CONTRACTS.length ? PLACES[CONTRACTS[G.contractsDone].start] : G.wanted > 0 ? PLACES[G.lastSafehouse] : null);
  if (!target) return [];
  const p = playerPosition();
  if (!W.routeCache || W.routeCache.tx !== target.x || W.routeCache.tz !== target.z || dist2d(W.routeCache.px, W.routeCache.pz, p.x, p.z) > 25) {
    W.routeCache = { tx: target.x, tz: target.z, px: p.x, pz: p.z, path: findRoute(p.x, p.z, target.x, target.z) };
  }
  const path = W.routeCache.path.slice(1);
  // Skip the first junction when it lies behind the player on the way to the second one.
  const start = path.length > 2 && dist2d(p.x, p.z, path[1].x, path[1].z) < dist2d(path[0].x, path[0].z, path[1].x, path[1].z) ? 1 : 0;
  return [{ x: p.x, z: p.z }].concat(path.slice(start));
}

const MAP_DISTRICT_RECTS = [
  { x0: -430, x1: 410, z0: -400, z1: -252, fill: '#b9d7a8' },
  { x0: -430, x1: -100, z0: -252, z1: 124, fill: '#f0c08a' },
  { x0: -100, x1: 200, z0: -252, z1: 124, fill: '#d2b3ee' },
  { x0: 200, x1: 410, z0: -252, z1: 124, fill: '#a9cfe6' },
  { x0: -430, x1: 410, z0: 124, z1: 287, fill: '#ffe9a8' }
];
const MAP_DISTRICT_LABELS = [
  { name: 'TOL LAYANG', x: -10, z: -365, tint: '#b9e3a4' }, { name: 'PASAR SENJA', x: -265, z: -60, tint: '#ffc78a' }, { name: 'GANG NEON', x: 50, z: -150, tint: '#dcbcff' },
  { name: 'PELABUHAN', x: 305, z: -60, tint: '#a9d8f5' }, { name: 'PANTAI', x: -10, z: 205, tint: '#ffe08a' }, { name: 'PULAU ABU', x: 700, z: -330, tint: '#e0dad3' }
];
