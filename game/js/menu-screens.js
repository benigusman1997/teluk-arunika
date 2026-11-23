// Menu screens: title, pause, tabbed map, settings, controls,
// save slot cards, story pips and the feature strip.

// Show the title screen over the live city.
function showTitleScreen() {
  const el = WORLD._hud.title;
  el.style.display = '';
  el.innerHTML = ''
    + '<div class="left">'
    + '<div class="logo">TELUK<br>ARUNIKA</div>'
    + '<div class="subline">Seven Days of Debt</div>'
    + '<div class="premise">An original open-world crime story. Raka\'s father owes the Naga Laut $50,000.</div>'
    + '<div class="premise">One week, one bay, and every car is yours to take.</div>'
    + '<div class="menu">'
    + '<div class="menu-row selected">CONTINUE <span class="detail">DAY 4/7 · $18,450 · CONTRACT 7/10 · TANGAN KANAN</span></div>'
    + '<div class="menu-row">NEW GAME</div>'
    + '<div class="menu-row">LOAD GAME</div>'
    + '<div class="menu-row">SETTINGS</div>'
    + '<div class="menu-row">CONTROLS</div>'
    + '</div>'
    + '<div class="saves-title">Save Slots</div>'
    + '<div class="saves-grid">'
    + '<div class="save-slot-card"><div class="slot-name">AUTOSAVE</div><div class="slot-info">DAY 4 · 7/10 · $18,450 · 3 h 12 m</div></div>'
    + '<div class="save-slot-card"><div class="slot-name">SLOT 1</div><div class="slot-info">DAY 2 · 3/10 · $9,250 · 1 h 05 m</div></div>'
    + '<div class="save-slot-card"><div class="slot-name">SLOT 2</div><div class="slot-info">DAY 6 · 9/10 · $47,300 · 5 h 40 m</div></div>'
    + '<div class="save-slot-card"><div class="slot-name">SLOT 3</div><div class="slot-info">EMPTY — starts a new game</div></div>'
    + '</div>'
    + '</div>'
    + '<div class="right">'
    + '<div class="map-panel"><h3>The Bay — Six Districts</h3>'
    + '<canvas id="title-map" width="600" height="300"></canvas>'
    + '<div class="legend">● player &nbsp; ● police &nbsp; ◆ objective &nbsp; ■ safehouse &nbsp; ⚑ race</div></div>'
    + '<div style="margin-top:12px"><h3 style="color:#ffcf3a;font-size:16px;letter-spacing:2px">STORY — 6/10 CONTRACTS</h3>'
    + drawStoryProgressPips()
    + '</div>'
    + '<div class="feature-strip">10 CONTRACTS · 3 ACTS · 12 VEHICLES · 6 WEAPONS<br>'
    + '5-STAR TAPD PURSUITS · ELANG-1 · BADAK-2 SWAT · ROADBLOCKS<br>'
    + 'CREW · RACES · TAXI · SHOPS · GARAGE · PHONE · 4 RADIO STATIONS</div>'
    + '</div>'
    + '<div class="title-footer">WASD move · E enter / steal · Q weapons · M map · P phone · V camera · Esc pause</div>';
  const mapCanvas = document.getElementById('title-map');
  if (mapCanvas && typeof drawFullCityMap === 'function') {
    drawFullCityMap(mapCanvas);
  }
}

// Show the pause menu.
function showPauseMenu() {
  const root = WORLD.hudRoot;
  if (WORLD._pauseEl) {
    WORLD._pauseEl.style.display = '';
    return;
  }
  const el = document.createElement('div');
  el.className = 'pause-menu';
  el.innerHTML = '<h2>Paused</h2>'
    + '<div class="menu-row selected">RESUME</div>'
    + '<div class="menu-row">MAP</div>'
    + '<div class="menu-row">PHONE</div>'
    + '<div class="menu-row">SETTINGS</div>'
    + '<div class="menu-row">SAVE</div>'
    + '<div class="menu-row">QUIT TO TITLE</div>';
  root.appendChild(el);
  WORLD._pauseEl = el;
}

// Hide the pause menu.
function mnu_hidePause() {
  if (WORLD._pauseEl) {
    WORLD._pauseEl.style.display = 'none';
  }
}

// Show the tabbed map screen: MAP / STORY / STATS / CREW / SAVE.
function showTabbedMapScreen() {
  const root = WORLD.hudRoot;
  if (WORLD._mapEl) {
    WORLD._mapEl.style.display = '';
    return;
  }
  const el = document.createElement('div');
  el.className = 'map-screen';
  el.innerHTML = '<h2>The Bay — Teluk Arunika</h2>'
    + '<canvas id="full-map" width="760" height="460"></canvas>'
    + '<div class="tabs"><span class="active">MAP</span><span>STORY</span>'
    + '<span>STATS</span><span>CREW</span><span>SAVE</span></div>'
    + '<div style="margin-top:10px;font-size:15px;color:#9fb4d8">M close · click a district to set a waypoint</div>';
  root.appendChild(el);
  WORLD._mapEl = el;
  const mapCanvas = document.getElementById('full-map');
  if (mapCanvas && typeof drawFullCityMap === 'function') {
    drawFullCityMap(mapCanvas);
  }
}

// Hide the tabbed map screen.
function mnu_hideMap() {
  if (WORLD._mapEl) {
    WORLD._mapEl.style.display = 'none';
  }
}

// Show the settings menu: volumes, mouse, shake, quality.
function showSettingsMenu() {
  const root = WORLD.hudRoot;
  if (WORLD._settingsEl) {
    WORLD._settingsEl.style.display = '';
    return;
  }
  const s = GAME.settings;
  const el = document.createElement('div');
  el.className = 'settings-menu';
  el.innerHTML = '<h2>Settings</h2>'
    + '<div class="row"><span>Master volume</span><span>' + Math.round(s.master * 100) + '%</span></div>'
    + '<div class="row"><span>Music volume</span><span>' + Math.round(s.music * 100) + '%</span></div>'
    + '<div class="row"><span>Effects volume</span><span>' + Math.round(s.effects * 100) + '%</span></div>'
    + '<div class="row"><span>Mouse sensitivity</span><span>' + s.mouse.toFixed(1) + 'x</span></div>'
    + '<div class="row"><span>Camera shake</span><span>' + (s.shake ? 'ON' : 'OFF') + '</span></div>'
    + '<div class="row"><span>Quality</span><span>' + s.quality.toUpperCase() + '</span></div>'
    + '<div style="margin-top:10px;font-size:15px;color:#9fb4d8">Esc to go back</div>';
  root.appendChild(el);
  WORLD._settingsEl = el;
}

// Show the controls screen.
function showControlsScreen() {
  const root = WORLD.hudRoot;
  if (WORLD._controlsEl) {
    WORLD._controlsEl.style.display = '';
    return;
  }
  const el = document.createElement('div');
  el.className = 'settings-menu';
  el.innerHTML = '<h2>Controls</h2>'
    + '<div class="row"><span>Move / drive</span><span>W A S D</span></div>'
    + '<div class="row"><span>Sprint / handbrake</span><span>Shift / Space</span></div>'
    + '<div class="row"><span>Fire / aim</span><span>Mouse L / R</span></div>'
    + '<div class="row"><span>Reload</span><span>R</span></div>'
    + '<div class="row"><span>Weapon wheel</span><span>Q / Tab</span></div>'
    + '<div class="row"><span>Enter / steal / use</span><span>E</span></div>'
    + '<div class="row"><span>Camera / map / phone</span><span>V / M / P</span></div>'
    + '<div class="row"><span>Radio / horn / crew</span><span>N / H / Z X C</span></div>'
    + '<div class="row"><span>Quick save / pause</span><span>F5 / Esc</span></div>';
  root.appendChild(el);
  WORLD._controlsEl = el;
}

// Draw the save slot cards for the title and load screens.
function drawSaveSlotCards() {
  const slots = listSaveSlots();
  let html = '';
  for (const slot of slots) {
    html += '<div class="save-slot-card"><div class="slot-name">' + slot.name + '</div>'
      + '<div class="slot-info">' + slot.summary + '</div></div>';
  }
  return html;
}

// Draw the ten story pips in three act groups.
function drawStoryProgressPips() {
  const done = GAME.career.stats.contractsDone;
  let html = '<div class="story-pips">';
  for (let i = 1; i <= 10; i++) {
    if (i <= done) {
      html += '<span class="done">●</span>';
    } else if (i === done + 1) {
      html += '<span class="next">◉</span>';
    } else {
      html += '<span class="locked">○</span>';
    }
    if (i === 3 || i === 7) {
      html += ' &nbsp; ';
    }
  }
  html += '</div>';
  return html;
}

// Handle menu input: Enter starts, arrows move the selection.
function handleMenuInput(code) {
  if (GAME.mode === 'title' && code === 'Enter') {
    WORLD._hud.title.style.display = 'none';
    startNewGame();
  }
  if (GAME.mode === 'paused' && code === 'Escape') {
    mnu_hidePause();
    switchGameMode('playing');
  }
  if (GAME.mode === 'map' && code === 'KeyM') {
    mnu_hideMap();
    switchGameMode('playing');
  }
  if (GAME.mode === 'ending' && code === 'Enter') {
    if (GAME._endingEl) {
      GAME._endingEl.remove();
      GAME._endingEl = null;
    }
    switchGameMode('playing');
  }
}
