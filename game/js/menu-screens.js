// Title screen, pause menu, the tabbed map screen (map, story, stats, crew, settings, controls, save) and endings.

function showTitleScreen() {
  const saves = listSaveSlots(), newest = saves[0];
  const items = [];
  if (newest) items.push({ label: 'CONTINUE', sub: 'DAY ' + newest.day + '/7 &middot; ' + formatMoney(newest.money) + ' &middot; CONTRACT ' + newest.contract + '/' + CONTRACTS.length + ' &middot; RANK ' + (newest.rank + 1) + ' ' + RANKS[newest.rank].name, act: () => { loadGameFromSlot(newest.slot); closeMenus(); } });
  items.push({ label: 'NEW GAME', sub: 'Seven days. Fifty thousand dollars.', act: () => { closeMenus(); startNewGame(); } });
  items.push({ label: 'LOAD GAME', sub: saves.length + ' save' + (saves.length === 1 ? '' : 's'), act: () => openMenu('load', 'title') });
  items.push({ label: 'SETTINGS', sub: 'Audio, mouse, quality', act: () => showSettingsMenu('title') });
  items.push({ label: 'CONTROLS', sub: 'Keyboard and mouse', act: () => openMenu('controls', 'title') });
  G.mode = 'title';
  W.menu = { kind: 'title', sel: 0, items: items, back: null, tab: 0 };
  renderMenu();
}

function showPauseMenu() {
  G.mode = 'paused';
  W.menu = { kind: 'pause', sel: 0, back: null, tab: 0, items: [
    { label: 'RESUME', sub: '', act: closeMenus },
    { label: 'MAP', sub: 'City map, story, stats, crew', act: () => showTabbedMapScreen(0) },
    { label: 'SETTINGS', sub: 'Audio, mouse, quality', act: () => showSettingsMenu('pause') },
    { label: 'SAVE', sub: 'Three slots plus autosave', act: () => showTabbedMapScreen(6) },
    { label: 'QUIT TO TITLE', sub: 'Unsaved progress is lost', act: () => { resetWorldForNewGame(); showTitleScreen(); } }
  ] };
  renderMenu();
}

function showTabbedMapScreen(tab) {
  G.mode = 'map';
  const items = tab === 6 ? [1, 2, 3].map((slot) => ({ label: 'SLOT ' + slot, act: () => { if (saveGameToSlot(slot)) { playUiSound('complete'); showTabbedMapScreen(6); } } })) : tab === 4 ? settingsItems() : [];
  W.menu = { kind: 'map', sel: 0, items: items, back: null, tab: tab };
  renderMenu();
  completeTutorialHint('map');
}

function showSettingsMenu(back) {
  W.menu = { kind: 'settings', sel: 0, items: settingsItems(), back: back, tab: 0 };
  if (G.mode === 'playing') G.mode = 'paused';
  renderMenu();
}

function showEndingScreen(ending) {
  W.menu = { kind: 'ending', sel: 0, ending: ending, back: null, tab: 0, items: [{ label: G.ending === 'lost' ? 'BACK TO TITLE' : 'KEEP PLAYING', sub: '', act: () => { if (G.ending === 'lost') { resetWorldForNewGame(); showTitleScreen(); } else closeMenus(); } }] };
  renderMenu();
}

function openMenu(kind, back) {
  const items = kind === 'load' ? listSaveSlots().map((s) => ({ label: s.name, act: () => { loadGameFromSlot(s.slot); closeMenus(); } })) : [];
  W.menu = { kind: kind, sel: 0, items: items, back: back, tab: 0 };
  renderMenu();
}

function closeMenus() {
  W.menu = null;
  G.mode = 'playing';
  document.getElementById('menu-root').classList.add('hidden');
  W.cam.snap = true;
}

function goBackInMenu() {
  const m = W.menu;
  if (m.kind === 'title' || m.kind === 'ending') return;
  if (m.back === 'title') showTitleScreen();
  else if (m.back === 'pause') showPauseMenu();
  else closeMenus();
}

function settingsItems() {
  const s = G.settings;
  const slider = (key, label) => ({ label: label, value: () => Math.round(s[key] * 100) + '%', step: (d) => { s[key] = clamp(Math.round((s[key] + d * 0.1) * 10) / 10, key === 'sensitivity' ? 0.3 : 0, key === 'sensitivity' ? 2 : 1); } });
  const toggle = (key, label) => ({ label: label, value: () => (s[key] ? 'ON' : 'OFF'), step: () => { s[key] = !s[key]; } });
  return [slider('master', 'MASTER VOLUME'), slider('music', 'RADIO VOLUME'), slider('effects', 'EFFECTS VOLUME'), slider('sensitivity', 'MOUSE SENSITIVITY'), toggle('invertY', 'INVERT Y'), toggle('shake', 'CAMERA SHAKE'),
    { label: 'GRAPHICS QUALITY', value: () => s.quality.toUpperCase(), step: (d) => { const q = ['low', 'medium', 'high']; setGraphicsQuality(q[clamp(q.indexOf(s.quality) + d, 0, 2)]); } }];
}

function updateMenuInput() {
  const m = W.menu, k = W.keysHit;
  if (!m) return;
  const adjustable = m.kind === 'settings' || (m.kind === 'map' && m.tab === 4);
  if (k.Escape || k.Backspace || (m.kind === 'map' && k.KeyM)) { goBackInMenu(); return; }
  if (m.items.length) {
    if (k.ArrowDown || k.KeyS) { m.sel = (m.sel + 1) % m.items.length; playUiSound('talk'); renderMenu(); }
    if (k.ArrowUp || k.KeyW) { m.sel = (m.sel + m.items.length - 1) % m.items.length; playUiSound('talk'); renderMenu(); }
  }
  if (adjustable && (k.ArrowLeft || k.ArrowRight || k.Enter)) { m.items[m.sel].step(k.ArrowLeft ? -1 : 1); saveSettings(); applyAudioSettings(); renderMenu(); return; }
  if (m.kind === 'map' && (k.KeyE || k.KeyQ || (!adjustable && (k.ArrowLeft || k.ArrowRight)))) { showTabbedMapScreen((m.tab + (k.KeyQ || k.ArrowLeft ? MAP_TABS.length - 1 : 1)) % MAP_TABS.length); return; }
  if ((k.Enter || k.Space) && m.items[m.sel] && m.items[m.sel].act) m.items[m.sel].act();
}

function clickMenu(event) {
  const el = event.target.closest('[data-i],[data-tab]');
  if (!el || !W.menu) return;
  if (el.dataset.tab !== undefined) { showTabbedMapScreen(Number(el.dataset.tab)); return; }
  const item = W.menu.items[Number(el.dataset.i)];
  W.menu.sel = Number(el.dataset.i);
  if (item.act) item.act();
  else { item.step(1); saveSettings(); applyAudioSettings(); renderMenu(); }
}

function renderMenu() {
  const m = W.menu, root = document.getElementById('menu-root');
  root.classList.remove('hidden');
  root.onclick = clickMenu;
  if (m.kind === 'title') root.innerHTML = titleHtml(m);
  else if (m.kind === 'map') root.innerHTML = '<div class="shade"></div><div class="panel" style="left:40px;top:30px;width:1200px;height:660px"><div class="tabs">' + MAP_TABS.map((t, i) => '<div class="tab' + (i === m.tab ? ' sel' : '') + '" data-tab="' + i + '">' + t + '</div>').join('') + '<div class="tab" style="margin-left:auto;background:none">Q / E tabs &middot; M close</div></div>' + mapTabHtml(m) + '</div>';
  else if (m.kind === 'ending') root.innerHTML = '<div class="shade"></div><div class="panel ending"><div class="logo" style="position:static;font-size:64px">' + m.ending.title + '</div><div class="subline" style="position:static;margin:10px 0">' + m.ending.sub + '</div><div class="txt" style="font-size:20px;margin:14px 30px">' + m.ending.text + '</div><div class="txt gold" style="font-size:18px;margin-bottom:12px">' + endingStatsLine() + '</div>' + itemsHtml(m, 300) + '</div>';
  else {
    const title = m.kind === 'pause' ? 'PAUSED' : m.kind === 'settings' ? 'SETTINGS' : m.kind === 'load' ? 'LOAD GAME' : 'CONTROLS';
    let body = m.kind === 'controls' ? controlsHtml() : m.kind === 'load' ? slotsHtml(listSaveSlots(), m.sel, true) || '<div class="txt">No saves yet. Sleep at a safehouse or save from the pause menu.</div>' : m.kind === 'settings' ? settingsHtml(m) : itemsHtml(m, 520);
    root.innerHTML = '<div class="shade"></div><div class="panel" style="left:340px;top:' + (m.kind === 'controls' ? 60 : 110) + 'px;width:600px"><div class="title2">' + title + '</div>' + body + '<div class="txt dim" style="margin-top:10px">Arrows / W S select &middot; Enter confirm &middot; Esc back</div></div>';
  }
  if (m.kind === 'title') drawFullCityMap(document.getElementById('title-map'), true);
  if (m.kind === 'map' && m.tab === 0) drawFullCityMap(document.getElementById('big-map'), true);
}

function titleHtml(m) {
  const saves = listSaveSlots().slice(0, 3), done = saves.length ? saves[0].done : 0;
  let pips = '';
  for (let i = 0; i < CONTRACTS.length; i++) pips += (i > 0 && CONTRACTS[i].act !== CONTRACTS[i - 1].act ? '<div class="gap"></div>' : '') + '<div class="p' + (i < done ? ' done' : i === done ? ' now' : '') + '">' + (i + 1) + '</div>';
  return '<div class="shade left"></div><div class="logo">TELUK<span>ARUNIKA</span></div><div class="subline">SEVEN DAYS OF DEBT</div><div class="menu">' + itemsHtml(m, 520) + '</div>' +
    '<div style="position:absolute;left:824px;top:24px;width:440px;display:flex;flex-direction:column;gap:8px"><div class="panel" style="position:static"><div class="cap" style="font-size:18px">SAVE SLOTS</div>' + (slotsHtml(saves, -1, false) || '<div class="txt" style="margin-top:8px">No saves yet - start a new game.</div>') + '</div>' +
    '<div class="panel" style="position:static"><div class="cap" style="font-size:18px">STORY - ' + done + '/' + CONTRACTS.length + ' CONTRACTS</div><div class="story-pips">' + pips + '</div></div>' +
    '<div class="panel" style="position:static;padding:8px"><canvas id="title-map" width="424" height="' + (saves.length === 3 ? 262 : 320) + '" style="display:block;border-radius:8px"></canvas></div></div>' +
    '<div class="footer">WASD move &middot; E enter / steal &middot; Tab weapons &middot; M map &middot; V camera &middot; Esc pause</div>';
}

function itemsHtml(m, width) {
  return m.items.map((it, i) => '<div class="item' + (i === m.sel ? ' sel' : '') + '" data-i="' + i + '" style="width:' + width + 'px"><span>' + it.label + '</span>' + (it.sub ? '<small>' + it.sub + '</small>' : '') + '</div>').join('');
}

function slotsHtml(saves, sel, clickable) {
  return saves.map((s, i) => '<div class="slot' + (i === 0 ? ' new' : '') + '"' + (clickable ? ' data-i="' + i + '"' : '') + (i === sel ? ' style="background:#ffd43b;color:#1a1300"' : '') + '><div><div class="a">' + s.name + ' &middot; DAY ' + s.day + '/7 &middot; ' + formatMoney(s.money) + '</div><div class="b"' + (i === sel ? ' style="color:#1a1300"' : '') + '>CONTRACT ' + s.contract + '/' + CONTRACTS.length + ' &middot; ' + RANKS[s.rank].name + ' &middot; ' + formatDuration(s.playTime / 60) + ' h</div></div>' + (i === 0 ? '<span class="tag">NEWEST</span>' : '') + '</div>').join('');
}

function settingsHtml(m) {
  return m.items.map((it, i) => '<div class="item' + (i === m.sel ? ' sel' : '') + '" data-i="' + i + '" style="height:46px;flex-direction:row;align-items:center;font-size:20px"><span>' + it.label + '</span><span>&#9664; ' + it.value() + ' &#9654;</span></div>').join('');
}

function controlsHtml() {
  return '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:22px">' + CONTROLS_LIST.map((c) => '<div class="kv"><span>' + c[1] + '</span><span>' + c[0] + '</span></div>').join('') + '</div>';
}

function endingStatsLine() {
  return 'Day ' + G.day + ' &middot; ' + formatMoney(G.stats.earned) + ' earned &middot; ' + G.stats.carsStolen + ' cars stolen &middot; ' + G.stats.escapes + ' escapes &middot; rank ' + RANKS[currentRankIndex()].name;
}

function mapTabHtml(m) {
  if (m.tab === 0) {
    const legend = [['#ffd43b', 'Contract / objective'], ['#51cf66', 'Safehouse'], ['#ff922b', 'KELO ARMS'], ['#22b8cf', 'Respray'], ['#94d82d', 'Export dock'], ['#f783ac', 'Street race'], ['#e03131', 'Wreck contract'], ['#4dabf7', 'TAPD unit']];
    return '<div style="display:flex;gap:14px"><canvas id="big-map" width="820" height="560" style="border-radius:8px"></canvas><div style="flex:1"><div class="title2">TELUK ARUNIKA</div>' +
      legend.map((l) => '<div class="kv"><span><i style="display:inline-block;width:14px;height:14px;background:' + l[0] + ';margin-right:8px"></i>' + l[1] + '</span><span></span></div>').join('') +
      '<div class="title2" style="font-size:22px;margin-top:12px">DISTRICT STANDING</div>' + DISTRICTS.map((d) => '<div class="kv"><span style="color:' + d.tint + '">' + d.name + '</span><span>' + standingWord(G.standing[d.id]) + '</span></div>').join('') + '</div></div>';
  }
  if (m.tab === 1) return '<div class="title2">STORY - ' + G.contractsDone + '/' + CONTRACTS.length + ' CONTRACTS &middot; DEBT ' + formatMoney(G.debt) + ' &middot; DAY ' + G.day + '/7</div>' +
    CONTRACTS.map((c, i) => '<div class="kv"><span>' + (i + 1) + '. ' + c.title + ' <span class="dim">' + ACTS[c.act] + '</span></span><span style="color:' + (i < G.contractsDone ? '#8ce99a' : i === G.contractsDone ? '#ffd43b' : '#7d8797') + '">' + (i < G.contractsDone ? 'DONE' : i === G.contractsDone ? (G.contract ? 'IN PROGRESS' : 'AVAILABLE - ' + PLACES[c.start].name) : 'LOCKED') + ' &middot; ' + formatMoney(c.payout) + '</span></div>').join('') +
    (G.branch ? '<div class="txt" style="margin-top:10px">Your choice in contract 5: <b>' + (G.branch === 'loyal' ? 'paid Darma' : 'met the detective') + '</b></div>' : '');
  if (m.tab === 2) {
    const s = G.stats, rows = [['Rank', RANKS[currentRankIndex()].name + ' (' + G.rp + ' RP)'], ['Money earned', formatMoney(s.earned)], ['Play time', formatDuration(G.playTime / 60) + ' h'], ['Distance', (s.distance / 1000).toFixed(1) + ' km'], ['Top speed', Math.round(s.topSpeed) + ' km/h'], ['Cars stolen', s.carsStolen],
      ['Vehicles wrecked', s.wrecks], ['Escapes from TAPD', s.escapes], ['Races won', s.racesWon], ['Taxi fares', s.fares], ['Cars exported', s.exports], ['Stunt jumps', s.stunts + '/' + STUNT_RAMPS.length], ['Arunika coins', G.coins.filter(Boolean).length + '/' + COIN_SPOTS.length], ['Wreck contracts', G.wrecksDone.filter(Boolean).length + '/' + WRECK_TARGETS.length], ['Busted / wasted', s.busted + ' / ' + s.wasted], ['Takedowns', s.kills]];
    return '<div class="title2">STATS</div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px">' + rows.map((r) => '<div class="kv"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('') + '</div>';
  }
  if (m.tab === 3) return '<div class="title2">CREW</div>' + CREW.map((c) => '<div class="slot" style="height:120px"><img src="' + portraitUrl(c) + '" style="width:96px;height:96px;border-radius:10px;border:3px solid ' + c.color + ';margin-right:14px"><div style="flex:1"><div class="a" style="font-size:24px">' + c.name + ' <span class="dim">"' + c.nick + '" - ' + c.role + '</span></div><div class="b" style="font-size:18px">' + c.ability + ': ' + c.desc + ' &middot; key ' + c.key + ' &middot; cooldown ' + c.cooldown + ' s</div><div class="b" style="font-size:16px">"' + c.lines[0] + '"</div></div><span class="tag" style="font-size:18px;background:' + (G.crew[c.id].recruited ? '#8ce99a' : '#ffd43b') + '">' + (G.crew[c.id].recruited ? 'IN THE CREW' : 'RECRUIT ' + formatMoney(c.cost)) + '</span></div>').join('') + '<div class="txt dim" style="margin-top:10px">Recruit at Pak Amir\'s workshop (G). Upgrades for your car are sold there too (U).</div>';
  if (m.tab === 4) return '<div class="title2">SETTINGS</div><div style="width:600px">' + settingsHtml(m) + '</div><div class="txt dim">Left / Right change the value</div>';
  if (m.tab === 5) return '<div class="title2">CONTROLS</div>' + controlsHtml();
  const saves = listSaveSlots();
  return '<div class="title2">SAVE GAME</div><div style="width:600px">' + itemsHtml(m, 600) + '</div><div class="cap" style="margin-top:14px;font-size:18px">EXISTING SAVES</div><div style="width:600px">' + (slotsHtml(saves, -1, false) || '<div class="txt">None yet</div>') + '</div>';
}

const MAP_TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
