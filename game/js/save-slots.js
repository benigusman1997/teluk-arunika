// Save slots in localStorage: an autosave plus three manual slots, and the persisted settings.

function saveGameToSlot(slot) {
  const p = playerPosition();
  W.saveStamp = Math.max(Date.now(), (W.saveStamp || 0) + 1);
  const data = { version: 41, savedAt: W.saveStamp };
  for (const key of SAVED_FIELDS) data[key] = G[key];
  data.crew = {};
  for (const c of CREW) data.crew[c.id] = G.crew[c.id].recruited;
  data.at = { x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, heading: p.heading };
  data.carModel = G.player.car ? G.player.car.model : null;
  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
  } catch (err) {
    showBanner('SAVE FAILED', 'Browser storage is not available', 2.5);
    return false;
  }
  return true;
}

function loadGameFromSlot(slot) {
  const data = readSlot(slot);
  if (!data) return false;
  resetWorldForNewGame();
  const fresh = createNewGameState();
  for (const key of SAVED_FIELDS) if (data[key] !== undefined) fresh[key] = data[key];
  for (const c of CREW) fresh.crew[c.id].recruited = !!data.crew[c.id];
  fresh.settings = G.settings;
  fresh.player.x = data.at.x; fresh.player.z = data.at.z; fresh.player.heading = data.at.heading;
  fresh.camYaw = data.at.heading;
  G = fresh;
  G.mode = 'playing';
  if (data.carModel && isLandAt(data.at.x, data.at.z)) {
    const car = spawnCar(data.carModel, data.at.x + 3, data.at.z, data.at.heading, 'parked');
    car.keep = true;
  }
  COIN_SPOTS.forEach((c, i) => { W.coinMeshes[i].visible = !G.coins[i]; });
  rebuildPlayerMesh();
  applyTimeOfDay(G.clock);
  W.cam.snap = true;
  showBanner('GAME LOADED', slot === 0 ? 'Autosave' : 'Slot ' + slot, 2);
  return true;
}

function autosaveAtSafehouse(placeId) {
  G.lastSafehouse = placeId;
  G.health = 100;
  // Sleeping runs the clock to 07:00; crossing midnight costs a day of the week.
  if (G.clock >= 7 * 60) advanceDebtDay();
  if (G.mode !== 'playing') return false;
  G.clock = 7 * 60;
  applyTimeOfDay(G.clock);
  const ok = saveGameToSlot(0);
  if (ok) showBanner('GAME SAVED', PLACES[placeId].name + ' - day ' + G.day + ' of 7, 07:00', 3);
  playUiSound('complete');
  return ok;
}

function readSlot(slot) {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    const data = raw ? JSON.parse(raw) : null;
    return data && data.version === 41 ? data : null;
  } catch (err) {
    return null;
  }
}

// Slot summaries for the title and save screens, newest first.
function listSaveSlots() {
  const list = [];
  for (let slot = 0; slot <= 3; slot++) {
    const d = readSlot(slot);
    if (!d) continue;
    let r = 0;
    for (let i = 0; i < RANKS.length; i++) if (d.rp >= RANKS[i].rp) r = i;
    list.push({ slot: slot, name: slot === 0 ? 'AUTOSAVE' : 'SLOT ' + slot, day: d.day, money: d.money, contract: Math.min(d.contractsDone + 1, CONTRACTS.length), done: d.contractsDone, rank: r, playTime: d.playTime, savedAt: d.savedAt });
  }
  list.sort((a, b) => b.savedAt - a.savedAt);
  return list;
}

function saveSettings() {
  try { localStorage.setItem(SAVE_PREFIX + 'settings', JSON.stringify(G.settings)); } catch (err) { showBanner('SETTINGS NOT SAVED', 'Browser storage is not available', 2); }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + 'settings');
    if (raw) Object.assign(G.settings, JSON.parse(raw));
  } catch (err) {
    G.settings = Object.assign({}, DEFAULT_SETTINGS);
  }
}

const SAVE_PREFIX = 'teluk-arunika-v41-';
const SAVED_FIELDS = ['day', 'clock', 'weather', 'money', 'debt', 'health', 'armour', 'rp', 'standing', 'stats', 'weaponIndex', 'weapons', 'contractsDone', 'branch', 'ending', 'hintsDone', 'coins', 'rampsDone',
  'bestTimes', 'upgrades', 'wrecksDone', 'radioStation', 'lastSafehouse', 'playTime'];
