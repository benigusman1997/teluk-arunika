// Minimap and full city map: canvas 2D drawings of the bay, districts,
// roads, bridge, island, player arrow, police blips and objectives.

// Draw the round minimap every step from GAME state.
function drawMinimap(dt) {
  const canvas = WORLD._hud ? WORLD._hud.minimap : null;
  if (!canvas || !GAME) {
    return;
  }
  const ctx = canvas.getContext('2d');
  const size = 180;
  const scale = size / 1000;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#12324a';
  ctx.fillRect(0, 0, size, size);
  map_drawSea(ctx, scale, cx, cy);
  map_drawDistricts(ctx, scale, cx, cy);
  map_drawRoads(ctx, scale, cx, cy);
  map_drawBridgeAndIsland(ctx, scale, cx, cy);
  drawMapIconsAndLegend(ctx, scale, cx, cy);
  drawRouteToWaypoint(ctx, scale, cx, cy);
  map_drawPlayerArrow(ctx, scale, cx, cy);
  ctx.restore();
}

// Sea and beach on the minimap.
function map_drawSea(ctx, scale, cx, cy) {
  ctx.fillStyle = '#19b5c4';
  ctx.fillRect(0, (410 + 450) * scale, 180, 180);
  ctx.fillStyle = '#f1dca7';
  ctx.fillRect(0, (374 + 450) * scale, 180, 8);
  ctx.fillStyle = '#19b5c4';
  ctx.fillRect(0, (0) * scale, ( -450 + 450) * scale + 0, 180);
}

// District tints on the minimap.
function map_drawDistricts(ctx, scale, cx, cy) {
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(
      (d.x0 + 450) * scale, (d.z0 + 450) * scale,
      (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale,
    );
  }
  ctx.globalAlpha = 1;
}

// Roads as pale lines on the minimap.
function map_drawRoads(ctx, scale, cx, cy) {
  ctx.strokeStyle = '#cfc8ba';
  ctx.lineWidth = 2;
  for (const line of cty_ROAD_LINES) {
    const p = (line + 450) * scale;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 180);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(180, p);
    ctx.stroke();
  }
}

// Flyover, red bridge and Ash Island on the minimap.
function map_drawBridgeAndIsland(ctx, scale, cx, cy) {
  ctx.strokeStyle = '#d93838';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo((450 + 450) * scale, (-360 + 450) * scale);
  ctx.lineTo((750 + 450) * scale, (-360 + 450) * scale);
  ctx.stroke();
  ctx.fillStyle = '#6b5b53';
  ctx.beginPath();
  ctx.arc((620 + 450) * scale, (-360 + 450) * scale, 130 * scale, 0, Math.PI * 2);
  ctx.fill();
}

// Icons: police blips, objective, side jobs, safehouses, races.
function drawMapIconsAndLegend(ctx, scale, cx, cy) {
  for (const u of GAME.police.units) {
    if (!u.x && u.x !== 0) {
      continue;
    }
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc((u.x + 450) * scale, (u.z + 450) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const place of CITY_PLACES) {
    if (place.name.indexOf('SAFEHOUSE') === 0) {
      ctx.fillStyle = '#4db8ff';
      ctx.fillRect((place.x + 450) * scale - 2, (place.z + 450) * scale - 2, 4, 4);
    }
  }
  ctx.fillStyle = '#ffcf3a';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('N', 88, 12);
}

// Route line from the player to the active waypoint.
function drawRouteToWaypoint(ctx, scale, cx, cy) {
  const wp = GAME.ui.waypoint;
  if (!wp) {
    const m = GAME.mission;
    if (m.id === 0) {
      return;
    }
    const target = map_targetForMission(m.id, m.stage);
    if (!target) {
      return;
    }
    ctx.strokeStyle = '#ffcf3a';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo((GAME.player.x + 450) * scale, (GAME.player.z + 450) * scale);
    ctx.lineTo((target.x + 450) * scale, (target.z + 450) * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.arc((target.x + 450) * scale, (target.z + 450) * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = '#ffcf3a';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo((GAME.player.x + 450) * scale, (GAME.player.z + 450) * scale);
  ctx.lineTo((wp.x + 450) * scale, (wp.z + 450) * scale);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Player arrow on the minimap, rotated to the heading.
function map_drawPlayerArrow(ctx, scale, cx, cy) {
  const px = (GAME.player.x + 450) * scale;
  const pz = (GAME.player.z + 450) * scale;
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(GAME.player.heading);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#141c2e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Mission target place for the minimap route.
function map_targetForMission(id, stage) {
  const targets = {
    1: { x: -270, z: -90 },
    2: { x: -270, z: -90 },
    3: { x: -400, z: 300 },
    4: { x: -380, z: 210 },
    5: { x: 40, z: -40 },
    6: { x: 0, z: -360 },
    7: { x: 90, z: -90 },
    8: { x: 620, z: -360 },
    9: { x: 270, z: -180 },
    10: { x: -400, z: 400 },
  };
  return targets[id] || null;
}

// Full city map for the title screen and the map tab: sea, six
// districts with names, roads, flyover, bridge, island and icons.
function drawFullCityMap(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const scale = w / 1300;
  const ox = 40;
  const oy = 10;
  ctx.fillStyle = '#12324a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#19b5c4';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.fillRect(0, 0, w * 0.03, h);
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(
      ox + (d.x0 + 450) * scale, oy + (d.z0 + 450) * scale,
      (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale,
    );
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#cfc8ba';
  ctx.lineWidth = 1.5;
  for (const line of cty_ROAD_LINES) {
    const p = (line + 450) * scale;
    ctx.beginPath();
    ctx.moveTo(ox + p, oy);
    ctx.lineTo(ox + p, oy + 900 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy + p);
    ctx.lineTo(ox + 900 * scale, oy + p);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d93838';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ox + 900 * scale, oy + 90 * scale);
  ctx.lineTo(ox + 1200 * scale, oy + 90 * scale);
  ctx.stroke();
  ctx.fillStyle = '#6b5b53';
  ctx.beginPath();
  ctx.arc(ox + 1070 * scale, oy + 90 * scale, 130 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Arial';
  for (const d of DISTRICTS) {
    if (d.id === 'PULAU ABU') {
      ctx.fillText(d.id, ox + (d.x0 + 450) * scale + 6, oy + (d.z1 + 450) * scale - 8);
    } else {
      ctx.fillText(d.id, ox + (d.x0 + 450) * scale + 6, oy + (d.z0 + 450) * scale + 16);
    }
  }
  ctx.fillStyle = '#ffcf3a';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('GUNUNG ABU', ox + 1010 * scale, oy + 90 * scale);
  for (const place of CITY_PLACES) {
    const px = ox + (place.x + 450) * scale;
    const py = oy + (place.z + 450) * scale;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffcf3a';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('BANK ARUNIKA', ox + (90 + 450) * scale + 5, oy + (-90 + 450) * scale);
  ctx.fillText('BENGKEL PAK AMIR', ox + (-270 + 450) * scale + 5, oy + (30 + 450) * scale);
  ctx.fillText('PIER 9', ox + (-400 + 450) * scale + 5, oy + (400 + 450) * scale);
}

// Set a waypoint from the phone or the map screen.
function setMapWaypoint(x, z) {
  GAME.ui.waypoint = { x: x, z: z };
  GAME.ui.banner = 'WAYPOINT SET';
}
