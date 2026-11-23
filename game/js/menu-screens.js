// menu-screens.js — title screen with save slots, pause menu, tabbed full map, settings and controls.
var TA = window.TA || (window.TA = {});
function showTitleScreen() {
  TA.S.mode = 'title';
  var slots = '';
  ['auto', 1, 2, 3].forEach(function (n) { var s = TA.slotSummary(n); slots += '<button class="slot" data-act="load-' + n + '"><b>' + (n === 'auto' ? 'AUTOSAVE' : 'SLOT ' + n) + '</b><span>' + (s || 'EMPTY — starts a new game') + '</span></button>'; });
  showScreen('<div class="title"><div class="tleft"><h1>TELUK<br>ARUNIKA</h1><h2>SEVEN DAYS OF DEBT</h2><p>An original open-world crime story. Raka owes the Naga Laut $50,000. He has one week, one bay and no car of his own.</p>' +
    '<button class="big" data-act="new">▶ NEW GAME</button><button data-act="settings">SETTINGS</button><button data-act="controls">CONTROLS</button>' +
    '<div class="slots"><h4>SAVE SLOTS</h4>' + slots + '</div></div>' +
    '<div class="tright"><h4>THE BAY — SIX DISTRICTS</h4><canvas id="titlemap" width="400" height="290"></canvas><div class="feat">10 CONTRACTS · 3 ACTS · 9 VEHICLES · 6 WEAPONS<br>5-STAR TAPD PURSUITS · ELANG-1 · BADAK-2 SWAT<br>CREW ABILITIES · RACES · TAXI FARES · 30 COINS</div></div></div>');
  TA.drawFullCityMap(document.getElementById('titlemap').getContext('2d'), 400, 290, false); TA.labelTitleMap(document.getElementById('titlemap').getContext('2d'));
}
function showPauseMenu() {
  TA.S.mode = 'paused';
  showScreen('<div class="panel"><h1>PAUSED</h1><button data-act="resume">RESUME</button><button data-act="save-1">SAVE SLOT 1</button><button data-act="save-2">SAVE SLOT 2</button><button data-act="save-3">SAVE SLOT 3</button>' +
    '<button data-act="map">CITY MAP</button><button data-act="settings">SETTINGS</button><button data-act="controls">CONTROLS</button><button data-act="title">QUIT TO TITLE</button></div>');
}
function showTabbedMapScreen(tab) {
  var S = TA.S; S.mode = 'map'; tab = tab || 'map';
  var body = '<canvas id="fullmap" width="760" height="500"></canvas>';
  if (tab === 'stats') body = '<div class="list">' + Object.keys(S.stats).map(function (k) { return '<div>' + k.toUpperCase() + ' <b>' + (k === 'km' ? S.stats.km.toFixed(1) : S.stats[k]) + '</b></div>'; }).join('') + '<div>RANK <b>' + TA.currentRank().name + '</b></div></div>';
  if (tab === 'districts') body = '<div class="list">' + TA.CFG.DISTRICTS.map(function (d) { return '<div style="color:' + d.color + '">' + d.name + ' <b>STANDING ' + S.standing[d.id] + '</b></div>'; }).join('') + '</div>';
  if (tab === 'contracts') body = '<div class="list">' + TA.CFG.CONTRACTS.map(function (c, i) { return '<div>' + (S.done.indexOf(i) >= 0 ? '✔' : i === S.contract ? '▶' : '·') + ' ACT ' + c.act + ' — ' + c.title + ' <b>$' + c.pay + '</b></div>'; }).join('') + '</div>';
  showScreen('<div class="panel wide"><div class="tabs">' + ['map', 'contracts', 'districts', 'stats'].map(function (t) { return '<button class="' + (t === tab ? 'on' : '') + '" data-act="tab-' + t + '">' + t.toUpperCase() + '</button>'; }).join('') + '<button data-act="resume">CLOSE [M]</button></div>' + body + '</div>');
  if (tab === 'map') TA.drawFullCityMap(document.getElementById('fullmap').getContext('2d'), 760, 500, true);
}
function showSettingsMenu() {
  var s = TA.S.settings; TA.prevMode = TA.S.mode === 'settings' ? TA.prevMode : TA.S.mode; TA.S.mode = 'settings';
  showScreen('<div class="panel"><h1>SETTINGS</h1><button data-act="set-vol">VOLUME ' + Math.round(s.volume * 100) + '%</button><button data-act="set-sens">MOUSE SENSITIVITY ' + s.sens.toFixed(1) + '</button>' +
    '<button data-act="set-shadow">SHADOWS ' + (s.shadows ? 'ON' : 'OFF') + '</button><button data-act="set-inv">INVERT Y ' + (s.invertY ? 'ON' : 'OFF') + '</button><button data-act="back">BACK</button></div>');
}
function showControlsScreen() {
  TA.prevMode = TA.S.mode; TA.S.mode = 'settings';
  showScreen('<div class="panel"><h1>CONTROLS</h1><div class="list small"><div>WASD / ARROWS <b>move · drive</b></div><div>MOUSE <b>look · LMB fire · RMB aim</b></div><div>SHIFT <b>sprint</b> · SPACE <b>jump / handbrake</b></div><div>E <b>steal · enter · exit</b></div><div>Q <b>weapon wheel</b> · 1-6 <b>weapons</b></div><div>Z X C <b>crew abilities</b></div><div>V <b>camera</b> · C hold <b>look back</b></div><div>R <b>radio</b> · M <b>map</b> · ESC <b>pause</b></div><div>G <b>race</b> · T <b>taxi fare</b> · H <b>wreck contract</b> · B <b>shop</b> · L <b>rain</b></div></div><button data-act="back">BACK</button></div>');
}
function showScreen(html, light) {
  var el = document.getElementById('screens'); el.innerHTML = html; el.className = light ? 'show light' : 'show';
  if (document.exitPointerLock) document.exitPointerLock();
}
function hideScreens() { var el = document.getElementById('screens'); el.innerHTML = ''; el.className = ''; }
function handleMenuAction(act) {
  var S = TA.S, s = S.settings;
  if (act === 'new') TA.startNewGame();
  else if (act.indexOf('load-') === 0) { if (TA.loadGameFromSlot(act.slice(5))) hideScreens(); else TA.startNewGame(); }
  else if (act.indexOf('save-') === 0) TA.saveGameToSlot(act.slice(5));
  else if (act === 'resume' || act === 'free') { hideScreens(); S.mode = 'playing'; }
  else if (act === 'title') showTitleScreen();
  else if (act === 'map') showTabbedMapScreen('map');
  else if (act.indexOf('tab-') === 0) showTabbedMapScreen(act.slice(4));
  else if (act === 'settings') showSettingsMenu();
  else if (act === 'controls') showControlsScreen();
  else if (act === 'back') { S.mode = TA.prevMode; if (TA.prevMode === 'title') showTitleScreen(); else showPauseMenu(); }
  else if (act.indexOf('set-') === 0) {
    if (act === 'set-vol') s.volume = s.volume >= 1 ? 0 : Math.round((s.volume + 0.2) * 10) / 10;
    if (act === 'set-sens') s.sens = s.sens >= 2 ? 0.5 : s.sens + 0.5;
    if (act === 'set-shadow') s.shadows = !s.shadows; if (act === 'set-inv') s.invertY = !s.invertY;
    TA.persistSettings(false); showSettingsMenu();
  }
}
TA.showTitleScreen = showTitleScreen; TA.showPauseMenu = showPauseMenu; TA.showTabbedMapScreen = showTabbedMapScreen; TA.showSettingsMenu = showSettingsMenu;
TA.labelTitleMap = function (g) { g.font = 'bold 11px Arial'; g.textAlign = 'center'; [['PELABUHAN', 96, 238], ['PASAR SENJA', 176, 196], ['GANG NEON', 190, 118], ['PANTAI', 262, 262], ['TOL LAYANG', 190, 52], ['PULAU ABU', 352, 60]].forEach(function (d) { g.fillStyle = 'rgba(14,22,38,0.8)'; g.fillRect(d[1] - 42, d[2] - 12, 84, 16); g.fillStyle = '#ffe14d'; g.fillText(d[0], d[1], d[2]); }); };
TA.showScreen = showScreen; TA.hideScreens = hideScreens; TA.handleMenuAction = handleMenuAction;
