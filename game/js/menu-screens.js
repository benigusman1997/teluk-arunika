// Title screen, tabbed map / pause screen, contract intro cards, ending card.
TA.menu = { tab: 0, intro: null, line: 0 };
TA.TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
TA.CONTROLS = [
  ['W A S D', 'Walk / drive'], ['Mouse', 'Look and aim'], ['Left click', 'Fire / punch'], ['Right click', 'Aim'], ['Shift', 'Sprint'], ['Space', 'Jump / handbrake'],
  ['E', 'Enter car (hold to steal) / exit'], ['F', 'Interact, start contracts and side jobs'], ['Tab', 'Weapon wheel (slows time)'], ['1 – 6', 'Select weapon / buy in shops'],
  ['R', 'Reload'], ['Z  X  C', 'Crew abilities: Gaspol, Quick Fix, Ghost'], ['Q', 'Next radio station'], ['H', 'Horn'], ['V', 'Toggle tropical rain'], ['M', 'Map screen'], ['P / Esc', 'Pause']
];

TA.initMenus = function () {
  var root = TA.hud.root, M = TA.menu;
  M.screen = TA.el('div', 'screen', root);
  M.screen.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-key]') : null;
    if (t) { TA.audioUnlock(); TA.menuKey(t.getAttribute('data-key')); }
  });
  TA.showTitle();
};

TA.slotRows = function (action) {
  var html = '';
  for (var i = 1; i <= 3; i++) {
    var s = TA.slotSummary(i);
    html += '<div class="slot' + (TA.run.slot === i ? ' cur' : '') + '" data-key="' + action + i + '"><b>SLOT ' + i + '</b><span>' + (s ? s.line : 'EMPTY') + '</span><i>' + (s ? s.rp + ' RP · saved ' + s.savedAt : '—') + '</i></div>';
  }
  return html;
};

TA.showTitle = function () {
  var M = TA.menu, auto = TA.slotSummary(0);
  TA.run.mode = 'title';
  M.screen.className = 'screen title'; M.screen.style.display = '';
  M.screen.innerHTML = '<div class="logo"><i>SEVEN DAYS OF DEBT</i><h1>TELUK ARUNIKA</h1><p>Raka owes Darma Wijaya $50,000. The bay gives him seven days.</p></div>' +
    '<div class="tmenu"><div class="btn big" data-key="Enter"><kbd>ENTER</kbd> NEW GAME</div>' +
    (auto ? '<div class="btn" data-key="KeyC"><kbd>C</kbd> CONTINUE — ' + auto.line + '</div>' : '') +
    '<div class="slots">' + TA.slotRows('Digit') + '</div><div class="hint">1 – 3 load a slot · click the game to capture the mouse · M map · P pause</div></div>' +
    '<div class="credit">An original open-world crime game in one HTML page. Every model, texture and sound is made in code.</div>';
};

TA.openMap = function (tab, paused) {
  var M = TA.menu;
  if (TA.run.mode !== 'playing' && TA.run.mode !== 'map' && TA.run.mode !== 'paused') return;
  TA.run.mode = paused ? 'paused' : 'map';
  M.tab = tab || 0;
  TA.releasePointer();
  TA.renderMapScreen();
};

TA.closeMenu = function () {
  TA.menu.screen.style.display = 'none';
  TA.run.mode = 'playing';
};

TA.storyRows = function () {
  var done = TA.state.missionsDone, cur = TA.run.mission ? TA.run.mission.index : -1;
  return TA.MISSIONS.map(function (m, i) {
    var st = i < done ? 'DONE' : i === cur ? 'ACTIVE' : i === done ? 'NEXT' : 'LOCKED';
    return '<div class="srow ' + st.toLowerCase() + '"><span class="num">' + TA.pad2(i + 1) + '</span><span class="act">ACT ' + ['', 'I', 'II', 'III'][m.act] + '</span><span class="nm">' + m.name + '</span><span class="pay">' + TA.fmtMoney(m.pay) + '</span><span class="st">' + st + '</span></div>';
  }).join('');
};

TA.statRows = function () {
  return TA.careerStats().map(function (r) { return '<div class="kv"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
};

TA.standingRows = function () {
  return TA.DISTRICTS.map(function (d) {
    var v = Math.round(TA.state.standing[d.id] || 0);
    return '<div class="drow"><span class="dn">' + d.name + '</span>' + TA.bar(v / 100, d.tint) + '<span class="dw">' + TA.standingWord(v) + '</span></div>';
  }).join('');
};

TA.legendHtml = function () {
  var items = [['#ffffff', 'You'], ['#ffd43b', 'Objective / route'], ['#4ade80', 'Side jobs R W X'], ['#4895ef', 'Safehouse'], ['#ff9f1c', 'Gun shop'], ['#ffd166', 'Garage'], ['#f78fb3', 'Respray'], ['#ff3b30', 'TAPD / target'], ['#ffd43b', 'Arunika coin']];
  return items.map(function (it) { return '<span class="lg"><i style="background:' + it[0] + '"></i>' + it[1] + '</span>'; }).join('');
};

TA.crewRows = function () {
  return TA.CREW.map(function (c) {
    var have = TA.state.crew[c.id];
    return '<div class="crewrow" style="border-left-color:' + c.color + '"><div class="portrait" style="background:' + c.color + '">' + c.name.charAt(0) + '</div><div><b>' + c.name.toUpperCase() + ' "' + c.nick + '"</b><i>' + c.role + '</i>' +
      '<p><kbd>' + c.key + '</kbd> ' + c.ability + ' — ' + c.desc + ' · cooldown ' + c.cooldown + 's</p></div><span class="st">' + (have ? 'IN THE CREW' : 'RECRUIT: ' + TA.fmtMoney(c.cost)) + '</span></div>';
  }).join('');
};

TA.nowHtml = function () {
  var o = TA.missionObjective(), r = TA.run, loc = TA.locationInfo(), rows = TA.dispatchRows();
  return '<div class="kv"><span>Objective</span><b>' + (o ? o.stage + ' · ' + o.title : 'Free roam — see the yellow route') + '</b></div>' +
    '<div class="kv"><span>Location</span><b>' + loc.district + ' · ' + loc.street + '</b></div>' +
    '<div class="kv"><span>Heat</span><b><span class="ministars">' + ('★★★★★'.slice(0, r.wanted) || '—') + '</span> ' + (r.wanted ? TA.STATUS_LINES[r.wanted] + ' · ' + rows.length + ' UNITS' : 'NO HEAT') + '</b></div>' +
    '<div class="kv"><span>Crew</span><b>' + TA.CREW.map(function (c) { return c.name + (TA.state.crew[c.id] ? ' ✓' : ' —'); }).join(' · ') + '</b></div>';
};

TA.renderMapScreen = function () {
  var M = TA.menu, s = TA.state, rk = TA.rankInfo(), tab = TA.TABS[M.tab], set = s.settings, body;
  var head = '<div class="mhead"><div class="mtitle"><b>TELUK ARUNIKA</b><i>' + (TA.run.mode === 'paused' ? 'PAUSED' : 'CITY MAP') + ' · DAY ' + s.day + '/7 · ' + TA.clockText(s.clock) + ' · ' + TA.fmtMoney(s.money) + ' · DEBT ' + TA.fmtMoney(s.debt) + '</i></div><div class="tabs">' +
    TA.TABS.map(function (t, i) { return '<span class="tab' + (i === M.tab ? ' cur' : '') + '" data-key="Tab' + i + '">' + t + '</span>'; }).join('') + '</div></div>';
  var panel = function (title, inner, cls) { return '<div class="panel ' + (cls || '') + '"><h3>' + title + '</h3>' + inner + '</div>'; };
  if (tab === 'MAP') {
    body = '<div class="mleft"><canvas class="bigmap" width="655" height="430"></canvas>' + panel('LEGEND', '<div class="legend">' + TA.legendHtml() + '</div>', 'plegend') +
      panel('SAVE SLOTS <em>autosave on · save at safehouses or the SAVE tab</em>', '<div class="slots">' + TA.slotRows('Slot') + '</div>', 'psave') + '</div>' +
      '<div class="mright">' + panel('STORY — 10 CONTRACTS IN 3 ACTS', TA.storyRows(), 'pstory') +
      panel('CAREER — ' + rk.line + ' · ' + rk.numbers, '<div class="grid2">' + TA.statRows() + '</div>', 'pstats') +
      panel('DISTRICT STANDING', '<div class="grid2">' + TA.standingRows() + '</div>', 'pstand') + panel('RIGHT NOW', TA.nowHtml(), 'pnow') + '</div>';
  } else if (tab === 'STORY') {
    var ni = TA.nextMissionIndex(), m = ni >= 0 ? TA.MISSIONS[ni] : null;
    body = '<div class="wide">' + panel('STORY — 10 CONTRACTS IN 3 ACTS', TA.storyRows(), 'pstory') + panel(m ? 'NEXT: ' + m.name.toUpperCase() + ' — ' + m.giver : 'THE DEBT IS CLEARED',
      m ? m.intro.map(function (l) { return '<p class="say"><b>' + l[0] + '</b> ' + l[1] + '</p>'; }).join('') + '<p class="say">' + m.stages.length + ' stages · pays ' + TA.fmtMoney(m.pay) + ' · starts at ' + TA.PLACES[m.at].name + '</p>' : '<p class="say">Ending: ' + (s.ending || '—') + '</p>') + '</div>';
  } else if (tab === 'STATS') {
    body = '<div class="wide">' + panel('CAREER — ' + rk.line + ' · ' + rk.numbers, TA.bar(rk.frac, '#ffd166') + '<div class="grid2">' + TA.statRows() + '</div>') +
      panel('RANKS AND PERKS', TA.RANKS.map(function (r) { return '<div class="kv' + (r.n <= rk.n ? ' on' : '') + '"><span>RANK ' + r.n + ' · ' + r.name + ' (' + r.rp + ' RP)</span><b>' + r.perk + '</b></div>'; }).join('')) +
      panel('DISTRICT STANDING', '<div class="grid2">' + TA.standingRows() + '</div>') + '</div>';
  } else if (tab === 'CREW') {
    body = '<div class="wide">' + panel('THE CREW', TA.crewRows()) + panel('GARAGE', '<div class="kv"><span>Engine tune</span><b>LEVEL ' + s.upgrades.engine + ' / 3</b></div><div class="kv"><span>Armour plating</span><b>LEVEL ' + s.upgrades.plating + ' / 3</b></div><p class="say">Recruit and upgrade at Pak Amir\'s Garage in Pelabuhan.</p>') + '</div>';
  } else if (tab === 'SETTINGS') {
    body = '<div class="wide">' + panel('SETTINGS', '<div class="btn" data-key="Set1"><kbd>1</kbd> Master volume: ' + Math.round(set.volume * 100) + '%</div><div class="btn" data-key="Set2"><kbd>2</kbd> Invert mouse Y: ' + (set.invertY ? 'ON' : 'OFF') + '</div>' +
      '<div class="btn" data-key="Set3"><kbd>3</kbd> Shadows: ' + (set.shadows ? 'ON' : 'OFF') + '</div><div class="btn" data-key="Set4"><kbd>4</kbd> Weather: ' + (s.weather === 'rain' ? 'TROPICAL RAIN' : 'CLEAR') + '</div><div class="btn" data-key="Set5"><kbd>5</kbd> Quit to title</div>') + '</div>';
  } else if (tab === 'CONTROLS') {
    body = '<div class="wide">' + panel('CONTROLS', '<div class="grid2">' + TA.CONTROLS.map(function (c) { return '<div class="kv"><span><kbd>' + c[0] + '</kbd></span><b>' + c[1] + '</b></div>'; }).join('') + '</div>') + '</div>';
  } else {
    body = '<div class="wide">' + panel('SAVE — press 1 – 3 or click a slot to save here', '<div class="slots tall">' + TA.slotRows('Slot') + '</div>') +
      panel('LOAD — press 4 – 6', '<div class="slots tall">' + TA.slotRows('Load') + '</div><p class="say">Slot 0 is the autosave, written after every contract.</p>') + '</div>';
  }
  M.screen.className = 'screen map';
  M.screen.style.display = '';
  M.screen.innerHTML = head + '<div class="mbody">' + body + '</div><div class="mfoot">← → or click: change tab · M / Esc: back to the bay</div>';
  var cv = M.screen.querySelector('.bigmap');
  if (cv) TA.drawFullMap(cv);
};

// Contract intro: a letterboxed card with the giver's lines, advanced with F / Enter.
TA.showIntroCard = function (index, m) {
  TA.menu.intro = { index: index, m: m }; TA.menu.line = 0;
  TA.renderIntro();
};

TA.renderIntro = function () {
  var M = TA.menu, m = M.intro.m, l = m.intro[M.line];
  M.screen.className = 'screen intro'; M.screen.style.display = '';
  M.screen.innerHTML = '<div class="icard"><i>' + TA.ACTS[m.act] + ' · CONTRACT ' + (M.intro.index + 1) + '/10</i><h2>' + m.name.toUpperCase() + '</h2>' +
    '<div class="who">' + l[0] + '</div><p>' + l[1] + '</p><div class="pay">PAYS ' + TA.fmtMoney(m.pay) + ' · ' + m.stages.length + ' STAGES</div><div class="btn" data-key="Enter"><kbd>F</kbd> ' + (M.line + 1 < m.intro.length ? 'NEXT' : 'START') + ' &nbsp; <kbd>ESC</kbd> NOT NOW</div></div>';
};

TA.showEnding = function () {
  var M = TA.menu, s = TA.state;
  TA.run.mode = 'ending'; TA.releasePointer();
  var text = s.ending === 'leave' ? 'Raka takes the dawn ferry with one bag and no name. The bay forgets him by noon.' : s.ending === 'rule' ? 'Darma\'s chair is empty. By sunrise every dock boss in Pelabuhan answers to Raka.' : 'The ledger burns, the debt dies with it, and Pak Amir\'s garage opens at eight as always.';
  M.screen.className = 'screen intro'; M.screen.style.display = '';
  M.screen.innerHTML = '<div class="icard"><i>DAY ' + s.day + ' · ' + TA.clockText(s.clock) + '</i><h2>DEBT CLEARED</h2><p>' + text + '</p><div class="grid2">' + TA.statRows() + '</div><div class="btn" data-key="Enter"><kbd>ENTER</kbd> KEEP PLAYING IN FREE ROAM</div></div>';
};

// All keyboard and click input while a screen is open. Returns true when the key was used.
TA.menuKey = function (code) {
  var M = TA.menu, mode = TA.run.mode, s = TA.state, n;
  if (mode === 'title') {
    if (code === 'Enter' || code === 'KeyN') TA.newGame();
    else if (code === 'KeyC' && TA.readSlot(0)) TA.continueGame(0);
    else if (/^Digit[1-3]$/.test(code) && TA.readSlot(+code.slice(5))) TA.continueGame(+code.slice(5));
    else return false;
    return true;
  }
  if (mode === 'cutscene') {
    if (code === 'Escape') { TA.closeMenu(); return true; }
    if (code !== 'Enter' && code !== 'KeyF' && code !== 'Space') return false;
    if (++M.line < M.intro.m.intro.length) TA.renderIntro();
    else { M.screen.style.display = 'none'; TA.startMission(M.intro.index, 0); }
    return true;
  }
  if (mode === 'ending') { if (code === 'Enter') TA.closeMenu(); return true; }
  if (mode !== 'map' && mode !== 'paused') return false;
  var tab = TA.TABS[M.tab];
  if (code === 'Escape' || code === 'KeyM' || code === 'KeyP') { TA.closeMenu(); return true; }
  if (code === 'ArrowRight' || code === 'KeyE') M.tab = (M.tab + 1) % 7;
  else if (code === 'ArrowLeft' || code === 'KeyQ') M.tab = (M.tab + 6) % 7;
  else if (/^Tab\d$/.test(code)) M.tab = +code.slice(3);
  else if (/^Slot\d$/.test(code) || (tab === 'SAVE' && /^Digit[1-3]$/.test(code))) { n = +code.slice(-1); TA.saveGame(n); TA.run.slot = n; if (TA.sfx) TA.sfx('coin', 0.6); }
  else if (/^Load\d$/.test(code) || (tab === 'SAVE' && /^Digit[4-6]$/.test(code))) { n = +code.slice(-1); if (n > 3) n -= 3; if (TA.readSlot(n)) { TA.continueGame(n); return true; } }
  else if (tab === 'SETTINGS' && /^(Set|Digit)[1-5]$/.test(code)) {
    n = +code.slice(-1);
    if (n === 1) s.settings.volume = s.settings.volume >= 1 ? 0 : Math.round((s.settings.volume + 0.2) * 10) / 10;
    if (n === 2) s.settings.invertY = !s.settings.invertY;
    if (n === 3) { s.settings.shadows = !s.settings.shadows; TA.renderer.shadowMap.enabled = s.settings.shadows; TA.sun.castShadow = s.settings.shadows; }
    if (n === 4) TA.setWeather(s.weather === 'rain' ? 'clear' : 'rain');
    if (n === 5) { TA.autosave(); TA.showTitle(); return true; }
  } else return false;
  TA.renderMapScreen();
  return true;
};
