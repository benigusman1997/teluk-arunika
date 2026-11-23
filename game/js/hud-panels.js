// HUD cards drawn as DOM on a 1280x720 stage: mission, dispatch, money and stars, crew, car, weapons.

function drawMissionCard() {
  const v = missionCardView();
  let html = '<div class="row"><span class="cap">' + v.head + '</span><span class="cap gold">' + v.act + '</span></div>';
  html += '<div class="row"><span class="cap" style="color:#fff">' + v.stage + '</span>' + (v.timer ? '<span class="timer">' + v.timer + '</span>' : '') + '</div>';
  html += '<div class="big">' + v.title + '</div><div class="txt">' + v.obj + '</div>';
  if (v.pips) {
    html += '<div class="row"><span class="cap" style="color:#ff8a80">' + v.pips.label + ' ' + v.pips.left + '/' + v.pips.total + '</span><div class="pips">';
    for (let i = 0; i < v.pips.total; i++) html += '<div class="pip' + (i < v.pips.left ? ' on' : '') + '"></div>';
    html += '</div></div>';
  }
  if (v.next) html += '<div class="txt dim">NEXT: ' + v.next + '</div>';
  if (v.line) html += '<div class="cap" style="margin-top:2px">' + v.line + '</div>';
  setCardHtml('card-mission', html);
}

function drawDispatchCard() {
  if (G.wanted <= 0) { setCardHtml('card-dispatch', ''); return; }
  const units = W.units.filter((u) => !u.gone);
  let html = '<div class="row"><span class="cap">TAPD DISPATCH &middot; ' + units.length + ' UNIT' + (units.length === 1 ? '' : 'S') + '</span><span class="stars">' + '&#9733;'.repeat(G.wanted) + '</span></div><div class="big">' + G.incident + '</div>';
  // Nearest ground units first; the SWAT van, helicopter and roadblock always make the short list.
  const special = units.filter((u) => u.kind === 'swat' || u.kind === 'heli' || u.kind === 'roadblock').slice(0, 3);
  const shown = units.filter((u) => !special.includes(u)).slice(0, 5 - special.length).concat(special);
  for (const u of shown) {
    const far = u.kind === 'heli' ? '' : Math.round(u.dist) + ' m';
    html += '<div class="unit"><span class="name">' + u.name + '</span><span class="pill" style="background:' + (DISPATCH_ROLES[u.role] || '#dee2e6') + '">' + u.role + '</span><span class="dist">' + far + '</span></div>';
  }
  if (units.length > shown.length) html += '<div class="unit dim">+' + (units.length - shown.length) + ' more</div>';
  html += '<div class="sight"><span style="color:' + (G.inSight ? '#ff8a80' : '#8ce99a') + '">' + (G.inSight ? 'IN SIGHT' : 'HIDDEN') + '</span><div class="bar"><i style="width:' + Math.round(G.heat * 100) + '%;background:' + (G.inSight ? '#ff5a4d' : '#8ce99a') + '"></i></div></div>';
  setCardHtml('card-dispatch', html);
}

function drawWantedStarsAndMoney() {
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted ? '<em>&#9733;</em>' : '&#9733;';
  const html = '<div class="money">' + formatMoney(G.money) + '</div><div class="stars">' + stars + '</div>' +
    (G.wanted > 0 ? '<div class="status">' + WANTED_STATUS[G.wanted] + '</div>' : '<div class="debt">DEBT ' + formatMoney(G.debt) + ' &middot; DAY ' + G.day + '/7</div>');
  setCardHtml('card-money', html);
  const r = currentRankIndex(), rank = RANKS[r], next = RANKS[r + 1];
  const frac = next ? (G.rp - rank.rp) / (next.rp - rank.rp) : 1;
  setCardHtml('card-rank', '<div class="row"><span>RANK ' + (r + 1) + ' <span class="gold">' + rank.name + '</span></span><span class="dim">' + G.rp + (next ? ' / ' + next.rp : '') + ' RP</span></div><div class="bar" style="margin-top:4px"><i style="width:' + Math.round(frac * 100) + '%;background:#ffd43b"></i></div>');
}

function drawCrewCards() {
  let html = '';
  for (const c of CREW) {
    const s = G.crew[c.id];
    const state = !s.recruited ? 'RECRUIT ' + formatMoney(c.cost) : s.active > 0 ? 'ACTIVE' : s.cooldown > 0 ? Math.ceil(s.cooldown) + ' s' : 'READY';
    const fill = !s.recruited ? 0 : s.active > 0 ? s.active / c.duration : 1 - s.cooldown / c.cooldown;
    html += '<div class="crew' + (s.active > 0 ? ' active' : '') + (s.recruited ? '' : ' locked') + '"><img src="' + portraitUrl(c) + '" style="border-color:' + c.color + '">' +
      '<div class="who"><div class="n">' + c.name + ' <span style="color:' + c.color + '">' + c.ability + '</span></div><div class="a">' + c.role + ' &middot; ' + state + '</div></div>' +
      '<div class="key">' + c.key + '</div><div class="cd"><i style="width:' + Math.round(clamp(fill, 0, 1) * 100) + '%;background:' + (s.active > 0 ? '#ffd43b' : '#63e6be') + '"></i></div></div>';
  }
  setCardHtml('card-crew', html);
}

function drawCarSpeedCard() {
  const car = G.player.car;
  if (!car) { setCardHtml('card-car', ''); return; }
  const cond = clamp(car.hp / car.spec.hp, 0, 1);
  setCardHtml('card-car', '<div class="cap">' + car.spec.name + (car.tyresOut ? ' &middot; <span style="color:#ff8a80">TYRES OUT</span>' : '') + '</div>' +
    '<div class="cond"><span>CONDITION</span><div class="bar"><i style="width:' + Math.round(cond * 100) + '%;background:' + (cond > 0.4 ? '#ffa94d' : '#ff5a4d') + '"></i></div><span>' + Math.round(cond * 100) + '%</span></div>' +
    '<div class="speed">' + Math.round(Math.abs(car.speed) * 3.6) + '<small>KM/H</small></div>');
}

function buildHud() {
  const root = document.getElementById('hud-root');
  const ids = ['card-mission', 'card-dispatch', 'card-map', 'card-vitals', 'card-hint', 'card-place', 'card-banner', 'card-money', 'card-rank', 'card-weapons', 'card-crew', 'weapon-wheel', 'card-car', 'card-ammo', 'card-chatter', 'card-radio', 'card-prompt', 'card-dialogue', 'intro-card'];
  let html = '<div id="hud-play">';
  for (const id of ids) html += '<div class="card hidden" id="' + id + '"></div>';
  html += '<div id="crosshair" class="hidden"></div><canvas id="ring" class="hidden" width="80" height="80"></canvas></div><div id="menu-root" class="hidden"></div>';
  root.innerHTML = html;
  document.getElementById('card-map').innerHTML = '<canvas id="minimap" width="202" height="202"></canvas>';
  document.getElementById('weapon-wheel').innerHTML = '<canvas id="wheel" width="226" height="226"></canvas>';
  W.hudCache = { 'card-map': 'x', 'weapon-wheel': 'x' };
  W.portraits = {};
}

function updateHud() {
  const playing = G.mode === 'playing' || G.mode === 'cutscene';
  document.getElementById('hud-play').classList.toggle('hidden', !playing);
  if (!playing) return;
  const talking = !!G.dialogue;
  drawMissionCard();
  drawDispatchCard();
  drawWantedStarsAndMoney();
  drawCrewCards();
  drawCarSpeedCard();
  drawWeaponRowAndAmmo();
  drawVitalsAndPlace();
  drawTalkCards(talking);
  drawPromptAndRing();
  document.getElementById('card-map').classList.remove('hidden');
  drawMinimap();
  // Stack the two columns so cards never overlap whatever their content height.
  stackCards(['card-mission', 'card-dispatch', 'card-hint'], 16, 8);
  stackCards(G.wheelOpen ? ['card-money', 'card-rank', 'card-crew', 'weapon-wheel'] : ['card-money', 'card-rank', 'card-weapons', 'card-crew'], 16, 6);
  document.getElementById('card-weapons').classList.toggle('hidden', G.wheelOpen);
  document.getElementById('weapon-wheel').classList.toggle('hidden', !G.wheelOpen);
  if (G.wheelOpen) drawWeaponWheel();
  document.getElementById('crosshair').classList.toggle('hidden', !!G.player.car || !(G.player.aiming || W.showcase === 3));
}

function showBanner(title, sub, seconds) {
  G.banner = { title: title, sub: sub || '', t: seconds || 2 };
}

function setCardHtml(id, html) {
  if (W.hudCache[id] === html) return;
  W.hudCache[id] = html;
  const el = document.getElementById(id);
  el.innerHTML = html;
  el.classList.toggle('hidden', html === '');
}

function stackCards(ids, top, gap) {
  let y = top;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el.classList.contains('hidden') && id !== 'weapon-wheel') continue;
    el.style.top = y + 'px';
    y += (id === 'weapon-wheel' ? 230 : el.offsetHeight) + gap;
  }
}

function portraitUrl(face) {
  if (!W.portraits[face.name]) W.portraits[face.name] = makePortraitCanvas(face, 96).toDataURL('image/png');
  return W.portraits[face.name];
}

function faceById(id) {
  return STORY_FACES[id] || CREW.find((c) => c.id === id) || STORY_FACES.dispatch;
}

function drawWeaponRowAndAmmo() {
  let html = '';
  WEAPONS.forEach((w, i) => {
    const s = G.weapons[i];
    html += '<div class="wtile' + (i === G.weaponIndex ? ' cur' : '') + (s.owned ? '' : ' none') + '">' + (i === G.weaponIndex ? '<span>' + w.name.toUpperCase() + '</span>' : '<span>' + (i + 1) + '</span>') + '</div>';
  });
  setCardHtml('card-weapons', html);
  if (G.player.car) { setCardHtml('card-ammo', ''); return; }
  const w = WEAPONS[G.weaponIndex], s = G.weapons[G.weaponIndex];
  setCardHtml('card-ammo', '<div><div class="cap">' + w.cls + '</div><div class="big">' + w.name.toUpperCase() + '</div></div><div class="ammo">' + (w.mag ? (G.reloading > 0 ? 'RELOAD' : s.mag + ' <small>/ ' + s.reserve + '</small>') : '<small>MELEE</small>') + '</div>');
}

function drawVitalsAndPlace() {
  const maxArmour = currentRankIndex() >= 2 ? 125 : 100;
  setCardHtml('card-vitals', '<div class="line hp"><span>HEALTH</span><div class="bar"><i style="width:' + Math.round(clamp(G.health, 0, 100)) + '%"></i></div></div>' +
    '<div class="line ar"><span>ARMOUR</span><div class="bar"><i style="width:' + Math.round(clamp(G.armour / maxArmour, 0, 1) * 100) + '%"></i></div></div>');
  const p = playerPosition();
  setCardHtml('card-place', streetNameAt(p.x, p.z).toUpperCase() + ' &middot; <span class="gold">' + districtAt(p.x, p.z).name + '</span> &middot; ' + formatClock(G.clock) + ' &middot; DAY ' + G.day + '/7');
  setCardHtml('card-banner', G.banner ? '<div class="big">' + G.banner.title + '</div>' + (G.banner.sub ? '<div class="txt">' + G.banner.sub + '</div>' : '') : '');
}

function drawTalkCards(talking) {
  if (talking) {
    const d = G.dialogue, f = faceById(d.face);
    setCardHtml('card-dialogue', '<img src="' + portraitUrl(f) + '" style="border-color:' + f.color + '"><div><div><span class="n" style="color:' + f.color + '">' + f.name + '</span><span class="r">' + f.role + '</span></div><div class="t">' + d.text + '</div><div class="k">ENTER - continue (' + (d.index + 1) + '/' + d.lines.length + ')</div></div>');
  } else setCardHtml('card-dialogue', '');
  if (G.chatter && !talking) {
    const f = faceById(G.chatter.face);
    setCardHtml('card-chatter', '<img src="' + portraitUrl(f) + '" style="border-color:' + f.color + '"><div><div class="n" style="color:' + f.color + '">' + f.name + (f.role ? ' <span class="dim">' + f.role.toUpperCase() + '</span>' : '') + '</div><div class="t">' + G.chatter.text + '</div></div>');
  } else setCardHtml('card-chatter', '');
  const station = RADIO_STATIONS[G.radioStation];
  const line = G.wanted > 0 && G.radioLine ? '<b>TAPD RADIO</b> ' + G.radioLine : G.player.car && G.radioOn ? '<b>' + station.name + '</b> ' + station.show + (W.newsLine ? ' - ' + W.newsLine : ' - Q to change station') : '';
  setCardHtml('card-radio', talking ? '' : line);
  setCardHtml('card-hint', G.hint ? '<span class="cap" style="color:#63e6be">TIP</span> <span class="txt">&middot; ' + G.hint.text + '</span>' : '');
  setCardHtml('intro-card', G.introCard ? '<div class="cap">' + G.introCard.head + '</div><div class="big">' + G.introCard.title + '</div><div class="txt">' + G.introCard.sub + '</div>' : '');
}

function drawPromptAndRing() {
  const pr = G.prompt, ring = document.getElementById('ring');
  setCardHtml('card-prompt', pr ? pr.text : '');
  const show = !!pr && pr.progress !== undefined && pr.progress !== null;
  ring.classList.toggle('hidden', !show);
  if (!show) return;
  const g = ring.getContext('2d');
  g.clearRect(0, 0, 80, 80);
  g.lineWidth = 10; g.strokeStyle = 'rgba(9,14,26,0.85)';
  g.beginPath(); g.arc(40, 40, 32, 0, 6.3); g.stroke();
  g.strokeStyle = '#ffd43b'; g.lineCap = 'round';
  g.beginPath(); g.arc(40, 40, 32, -1.57, -1.57 + 6.283 * clamp(pr.progress, 0.02, 1)); g.stroke();
  g.fillStyle = '#fff'; g.font = '900 24px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 40, 42);
}

function drawWeaponWheel() {
  const g = document.getElementById('wheel').getContext('2d'), c = 113;
  g.clearRect(0, 0, 226, 226);
  WEAPONS.forEach((w, i) => {
    const a0 = -Math.PI / 2 + (i - 0.5) * (Math.PI / 3), a1 = a0 + Math.PI / 3, mid = (a0 + a1) / 2;
    const sel = i === (W.wheelHover === undefined ? G.weaponIndex : W.wheelHover), owned = G.weapons[i].owned;
    g.beginPath(); g.arc(c, c, 108, a0 + 0.03, a1 - 0.03); g.arc(c, c, 46, a1 - 0.06, a0 + 0.06, true); g.closePath();
    g.fillStyle = sel ? '#ffd43b' : owned ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
    g.fill();
    g.fillStyle = sel ? '#1a1300' : owned ? '#ffffff' : '#7d8797';
    g.font = '900 15px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(w.cls, c + Math.cos(mid) * 78, c + Math.sin(mid) * 78 - 8);
    g.fillText(owned ? (w.mag ? G.weapons[i].mag + '/' + G.weapons[i].reserve : 'READY') : 'LOCKED', c + Math.cos(mid) * 78, c + Math.sin(mid) * 78 + 9);
  });
  const cur = WEAPONS[W.wheelHover === undefined ? G.weaponIndex : W.wheelHover];
  g.fillStyle = '#ffd43b'; g.font = 'italic 900 15px Arial';
  g.fillText(cur.name.toUpperCase(), c, c - 8);
  g.fillStyle = '#fff'; g.fillText('TAB', c, c + 10);
}
