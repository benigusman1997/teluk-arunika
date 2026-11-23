// HUD panels: build the DOM once under hud-root, then update text
// and widths from GAME only. Layout follows the v5.6 design grid.

// Build every HUD element once; later steps only update contents.
function buildHudPanels() {
  const root = WORLD.hudRoot;
  root.innerHTML = '';
  hud_el('mission', 'div', 'hud-card mission-card');
  hud_el('dispatch', 'div', 'hud-card dispatch-card');
  hud_el('status', 'div', 'hud-card status-card');
  for (let i = 0; i < 3; i++) {
    hud_el('crew' + i, 'div', 'crew-card');
  }
  hud_el('banner', 'div', 'banner-top');
  hud_el('minimapWrap', 'div', 'minimap-ring');
  const mm = document.createElement('canvas');
  mm.width = 180;
  mm.height = 180;
  mm.id = 'minimap-canvas';
  WORLD.hudRoot.querySelector('.minimap-ring').appendChild(mm);
  hud_el('health', 'div', 'health-row');
  hud_el('location', 'div', 'location-banner');
  hud_el('chatter', 'div', 'chatter-box');
  hud_el('radio', 'div', 'radio-line');
  hud_el('carcard', 'div', 'car-card');
  hud_el('prompt', 'div', 'prompt-line');
  hud_el('ring', 'div', 'progress-ring-wrap');
  hud_el('wheel', 'div', 'weapon-wheel');
  hud_el('hint', 'div', 'tutorial-hint');
  hud_el('title', 'div', 'title-screen');
  hud_el('phone', 'div', 'phone-screen');
  WORLD._hud = {};
  for (const key of ['mission', 'dispatch', 'status', 'banner', 'health',
    'location', 'chatter', 'radio', 'carcard', 'prompt', 'ring', 'wheel',
    'hint', 'title', 'phone']) {
    WORLD._hud[key] = root.querySelector('.' + hud_classFor(key));
  }
  WORLD._hud.crew = [
    root.querySelectorAll('.crew-card')[0],
    root.querySelectorAll('.crew-card')[1],
    root.querySelectorAll('.crew-card')[2],
  ];
  WORLD._hud.minimap = document.getElementById('minimap-canvas');
  for (const key of ['title', 'phone', 'wheel', 'hint', 'ring']) {
    WORLD._hud[key].style.display = 'none';
  }
  WORLD._hud.crew[0].style.top = '182px';
  WORLD._hud.crew[1].style.top = '238px';
  WORLD._hud.crew[2].style.top = '294px';
}

// Create one HUD element and append it to the root.
function hud_el(key, tag, cls) {
  const el = document.createElement(tag);
  el.className = cls;
  el.dataset.hud = key;
  WORLD.hudRoot.appendChild(el);
  return el;
}

// Map a HUD key to its CSS class name for querySelector.
function hud_classFor(key) {
  const map = {
    mission: 'mission-card', dispatch: 'dispatch-card',
    status: 'status-card', banner: 'banner-top',
    health: 'health-row', location: 'location-banner',
    chatter: 'chatter-box', radio: 'radio-line',
    carcard: 'car-card', prompt: 'prompt-line',
    ring: 'progress-ring-wrap', wheel: 'weapon-wheel',
    hint: 'tutorial-hint', title: 'title-screen',
    phone: 'phone-screen',
  };
  return map[key] || key;
}

// Update every panel from GAME state, once per fixed step.
function drawAllHudPanels(dt) {
  if (!GAME || !WORLD._hud) {
    return;
  }
  const hudOn = GAME.mode === 'playing' || GAME.mode === 'cutscene';
  for (const key of ['mission', 'dispatch', 'status', 'health',
    'location', 'chatter', 'radio', 'carcard']) {
    WORLD._hud[key].style.display = hudOn ? '' : 'none';
  }
  for (const card of WORLD._hud.crew) {
    card.style.display = hudOn ? '' : 'none';
  }
  if (!hudOn) {
    WORLD._hud.banner.style.display = 'none';
    WORLD._hud.prompt.style.display = 'none';
    return;
  }
  drawMissionCard();
  drawDispatchCard();
  drawWantedStarsAndMoney();
  drawRankAndWeaponRow();
  drawCrewCards();
  drawHealthArmourAndLocation();
  drawCarSpeedCard();
  drawChatterAndDialogueBox();
  drawPromptBannerAndHint();
  drawWeaponWheel();
}

// Mission card: act, contract, title, stage pill, objective, next,
// payout, counter pips or timer.
function drawMissionCard() {
  const m = GAME.mission;
  const el = WORLD._hud.mission;
  const act = m.id > 0 ? 'ACT ' + hud_romanFor(m.id) + ' · CONTRACT ' + m.id + '/10' : 'FREE ROAM';
  const title = m.id > 0 ? hud_contractTitle(m.id) : 'TELUK ARUNIKA';
  let html = '<h3>' + act + '</h3>';
  html += '<div class="title">' + title + '</div>';
  if (m.id > 0) {
    const stages = STORY_CONTRACTS[m.id - 1].stages.length;
    html += '<span class="pill">STAGE ' + m.stage + '/' + stages + '</span>';
  }
  html += '<div class="objective">▶ ' + (m.objective || 'Explore the bay') + '</div>';
  if (m.next) {
    html += '<div class="next">NEXT · ' + m.next + '</div>';
  }
  if (m.id > 0) {
    html += '<div class="payout">PAYOUT $' + hud_contractPayout(m.id).toLocaleString() + ' · CREW</div>';
  }
  if (m.counterMax > 0) {
    let pips = '';
    for (let i = 0; i < m.counterMax; i++) {
      pips += i < m.counter ? '●' : '○';
    }
    html += '<div class="pips">' + pips + ' ' + m.counter + '/' + m.counterMax + '</div>';
  }
  if (m.timer > 0) {
    const s = Math.ceil(m.timer);
    html += '<div class="timer">⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '</div>';
  }
  el.innerHTML = html;
}

// Dispatch card: incident, units with roles and distances, heat word.
function drawDispatchCard() {
  const p = GAME.police;
  const el = WORLD._hud.dispatch;
  const units = p.units.slice().sort(function sortUnits(a, b) {
    return a.dist - b.dist;
  });
  let html = '<h3>TAPD DISPATCH — ' + p.incident + ' · ' + units.length + ' UNITS</h3>';
  const shown = units.slice(0, 5);
  for (const u of shown) {
    const dist = u.displayDist || (u.dist >= 1000 ? (u.dist / 1000).toFixed(1) + ' km' : Math.round(u.dist) + ' m');
    html += '<div class="unit-row"><span>' + u.callsign + '</span>'
      + '<span class="role">' + u.role + '</span>'
      + '<span class="dist">' + dist + '</span></div>';
  }
  if (units.length > 5) {
    html += '<div class="dim">+' + (units.length - 5) + ' more · BADAK-2 EN ROUTE</div>';
  }
  if (units.length === 0) {
    html += '<div class="dim">No active units. The bay is quiet.</div>';
  }
  const heatWord = p.seen ? 'IN SIGHT' : (p.stars > 0 ? 'SEARCHING' : 'CLEAR');
  html += '<div class="heat">' + heatWord + '</div>';
  html += '<div class="heat-bar"><div class="heat-fill" style="width:'
    + Math.round(p.heat * 100) + '%"></div></div>';
  el.innerHTML = html;
}

// Status card: wanted stars, money, debt, day, time, weather.
function drawWantedStarsAndMoney() {
  const el = WORLD._hud.status;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += i < GAME.police.stars ? '★' : '<span class="off">★</span>';
  }
  const t = GAME.time;
  const hh = String(t.hour).padStart(2, '0');
  const mm = String(t.minute).padStart(2, '0');
  el.innerHTML = '<div class="wanted-stars">' + stars + '</div>'
    + '<div class="money-readout">$' + GAME.money.toLocaleString() + '</div>'
    + '<div class="debt-line">DEBT $' + GAME.debt.toLocaleString()
    + ' · DAY ' + t.day + '/7 · ' + hh + ':' + mm + ' · ' + t.weather + '</div>';
}

// Rank line with RP bar and the six weapon tiles.
function drawRankAndWeaponRow() {
  const el = WORLD._hud.status;
  const rank = hud_rankFor(GAME.career.rp);
  const pct = Math.round((GAME.career.rp / rank.next) * 100);
  let tiles = '<div class="weapon-tiles">';
  const names = ['FISTS', 'P-9', 'CICAK', 'GAJAH 12', 'AR-GARUDA', 'PEMBURU'];
  for (let i = 0; i < 6; i++) {
    tiles += '<div class="tile' + (GAME.player.weaponSlot === i + 1 ? ' active' : '')
      + '">' + (i + 1) + '</div>';
  }
  tiles += '</div>';
  el.innerHTML += '<div class="rank-line">' + rank.name + ' · '
    + GAME.career.rp.toLocaleString() + ' / ' + rank.next.toLocaleString() + ' RP</div>'
    + '<div class="rp-bar"><div class="rp-fill" style="width:' + pct + '%"></div></div>'
    + tiles;
}

// Crew cards with portraits, key badges, ability names and states.
function drawCrewCards() {
  const crew = [
    { key: 'Z', name: 'SARI', ability: 'GASPOL', colour: '#ff6fb5' },
    { key: 'X', name: 'BUDI', ability: 'QUICK FIX', colour: '#ff9f5a' },
    { key: 'C', name: 'AGUS', ability: 'GHOST', colour: '#5dff9b' },
  ];
  for (let i = 0; i < 3; i++) {
    const c = crew[i];
    const cd = GAME.crew.cooldowns[c.key] || 0;
    const active = GAME.crew.active[c.key] || 0;
    const state = active > 0
      ? 'ACTIVE ' + Math.ceil(active) + ' s'
      : (cd > 0 ? Math.ceil(cd) + ' s' : 'READY');
    const cls = active > 0 ? 'state' : (cd > 0 ? 'state cooling' : 'state');
    WORLD._hud.crew[i].innerHTML = '<div class="key">' + c.key + '</div>'
      + '<div><div class="who">' + c.name + ' · ' + c.ability + '</div>'
      + '<div class="ability">Crew driver · ' + c.ability + '</div></div>'
      + '<div class="' + cls + '">' + state + '</div>';
  }
}

// Health and armour bars plus the district location banner.
function drawHealthArmourAndLocation() {
  const el = WORLD._hud.health;
  const p = GAME.player;
  el.innerHTML = 'HEALTH ' + Math.round(p.health)
    + '<div class="bar hp"><div class="fill" style="width:' + clampNumber(p.health, 0, 100) + '%"></div></div>'
    + 'ARMOUR ' + Math.round(p.armour)
    + '<div class="bar ar"><div class="fill" style="width:' + clampNumber(p.armour, 0, 100) + '%"></div></div>';
  const district = districtAtPosition(p.x, p.z);
  const standing = GAME.career.standing[district] || 40;
  const street = hud_streetFor(district);
  const word = standingWordFor(standing);
  WORLD._hud.location.textContent = district + ' · ' + street + ' · ' + word + ' ' + standing;
}

// Car card with model, condition, gear and the big speed number;
// on foot it becomes the ammo card.
function drawCarSpeedCard() {
  const el = WORLD._hud.carcard;
  if (GAME.player.vehicle >= 0) {
    const v = GAME.vehicles[GAME.player.vehicle];
    const kmh = Math.round(Math.abs(v.speed) * 3.6);
    const pct = Math.round((v.hp / v.maxHp) * 100);
    el.innerHTML = '<div class="model">' + v.model + '</div>'
      + '<div class="cond-bar"><div class="cond-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="gear">' + pct + '% · GEAR ' + v.gear + '</div>'
      + '<div class="speed-readout">' + kmh + ' <span class="unit">KM/H</span></div>';
  } else {
    const slot = GAME.player.weaponSlot;
    const ammo = GAME.player.ammo[slot - 1];
    const names = ['FISTS', 'P-9', 'CICAK', 'GAJAH 12', 'AR-GARUDA', 'PEMBURU'];
    el.innerHTML = '<div class="model">' + names[slot - 1] + '</div>'
      + '<div class="gear">' + ammo.mag + ' / ' + ammo.reserve + ' · ON FOOT</div>'
      + '<div class="speed-readout" style="font-size:28px">ON FOOT</div>';
  }
  const stations = ['ARUNIKA 98.4', 'OMBAK 101.2', 'KOTA 87.5', 'SUARA DERMAGA 93.1'];
  const tracks = ['Goyang Dermaga', 'Pasir Hangat', 'City News', 'Besi dan Garam'];
  WORLD._hud.radio.textContent = '♪ ' + stations[GAME.radio.station] + ' — ' + tracks[GAME.radio.station];
}

// Chatter or dialogue box at the bottom centre.
function drawChatterAndDialogueBox() {
  const el = WORLD._hud.chatter;
  const d = GAME.ui.dialogue;
  if (d.text) {
    el.className = 'dialogue-box';
    el.innerHTML = '<div class="speaker">' + d.who + ' · ' + d.role + '</div>'
      + '<div class="line">"' + d.text + '"</div>';
    el.style.display = '';
    return;
  }
  const c = GAME.crew.chatter;
  if (c.text && c.ttl > 0) {
    el.className = 'chatter-box';
    el.innerHTML = '<div class="portrait"></div><div><div class="speaker">'
      + c.who + '</div><div class="line">"' + c.text + '"</div></div>';
    el.style.display = '';
    return;
  }
  el.style.display = 'none';
}

// Prompt line, top banner, progress ring and the tutorial hint card.
function drawPromptBannerAndHint() {
  const banner = WORLD._hud.banner;
  if (GAME.ui.banner) {
    banner.textContent = GAME.ui.banner;
    banner.style.display = '';
  } else if (GAME.police.stars > 0) {
    banner.textContent = '★'.repeat(GAME.police.stars) + ' WANTED — ELANG-1 OVERHEAD';
    banner.style.display = GAME.police.heli ? '' : 'none';
    if (!GAME.police.heli) {
      banner.textContent = '★'.repeat(GAME.police.stars) + ' WANTED';
      banner.style.display = '';
    }
  } else {
    banner.style.display = 'none';
  }
  const prompt = WORLD._hud.prompt;
  if (GAME.ui.prompt) {
    prompt.textContent = GAME.ui.prompt;
    prompt.style.display = '';
  } else {
    prompt.style.display = 'none';
  }
  const ring = WORLD._hud.ring;
  if (GAME.ui.promptProgress > 0 && GAME.ui.promptProgress < 1) {
    ring.innerHTML = '<div class="ring">' + Math.round(GAME.ui.promptProgress * 100) + '%</div>';
    ring.style.display = '';
  } else {
    ring.style.display = 'none';
  }
  const hint = WORLD._hud.hint;
  if (GAME.ui.hint) {
    hint.innerHTML = '<h4>Tip</h4><p>' + GAME.ui.hint + '</p>';
    hint.style.display = '';
  } else {
    hint.style.display = 'none';
  }
}

// The weapon wheel, a compact radial docked at the right edge.
function drawWeaponWheel() {
  const el = WORLD._hud.wheel;
  if (!GAME.ui.wheelOpen) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.style.right = '30px';
  el.style.top = '350px';
  const names = ['FISTS', 'P-9', 'CICAK', 'GAJAH 12', 'AR-GARUDA', 'PEMBURU'];
  const glyphs = ['✊', '🔫', '🔫', '💥', '🎯', '🔭'];
  let html = '';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = 73 + Math.cos(angle) * 62;
    const y = 73 + Math.sin(angle) * 62;
    html += '<div class="seg' + (GAME.player.weaponSlot === i + 1 ? ' active' : '')
      + '" style="left:' + x + 'px;top:' + y + 'px"><span class="glyph">'
      + glyphs[i] + '</span>' + names[i] + '</div>';
  }
  el.innerHTML = html;
}

// Roman numeral for the act number of a contract id.
function hud_romanFor(id) {
  if (id <= 3) {
    return 'I';
  }
  if (id <= 7) {
    return 'II';
  }
  return 'III';
}

// Contract titles, in story order.
function hud_contractTitle(id) {
  const titles = [
    '', 'FIRST FARE', 'NIGHT MARKET SHAKEDOWN', 'THE HARBOUR KEY',
    'CONTAINER 47', 'THE CHOICE', 'SMOKE ON THE FLYOVER',
    'THE BANK ARUNIKA JOB', 'ASH ISLAND ARMS', 'BURN THE LEDGER',
    'DAWN AT THE DOCKS',
  ];
  return titles[id] || 'FREE ROAM';
}

// Contract payouts, in story order.
function hud_contractPayout(id) {
  const payouts = [0, 800, 1500, 2400, 3600, 4500, 6000, 25000, 7500, 9000, 12000];
  return payouts[id] || 0;
}

// Rank name and next threshold for a rank-points total.
function hud_rankFor(rp) {
  if (rp >= 4500) {
    return { name: 'RAJA TELUK', next: 4500 };
  }
  if (rp >= 2000) {
    return { name: 'JURAGAN', next: 4500 };
  }
  if (rp >= 800) {
    return { name: 'TANGAN KANAN', next: 2000 };
  }
  if (rp >= 200) {
    return { name: 'SOPIR', next: 800 };
  }
  return { name: 'KERNET', next: 200 };
}

// Main street name for a district.
function hud_streetFor(district) {
  const streets = {
    PELABUHAN: 'Jalan Dermaga', 'PASAR SENJA': 'Jalan Pasar',
    'GANG NEON': 'Jalan Merdeka', PANTAI: 'Pantai Boulevard',
    'TOL LAYANG': 'Tol Layang', 'PULAU ABU': 'Jalan Abu',
  };
  return streets[district] || 'Jalan Merdeka';
}
