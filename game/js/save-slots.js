// Save slots: three slots plus autosave in localStorage, with
// summaries that keep day, money, contract count, rank and play time.

// Save the game into a slot (0 = autosave, 1-3 = manual slots).
function saveGameToSlot(slot) {
  const summary = {
    day: GAME.time.day, money: GAME.money, debt: GAME.debt,
    contracts: GAME.career.stats.contractsDone, rank: GAME.career.rank,
    rp: GAME.career.rp, playMinutes: Math.floor((GAME._playSeconds || 0) / 60),
    mission: GAME.mission.id, branch: GAME.mission.branch,
    player: { x: GAME.player.x, z: GAME.player.z, health: GAME.player.health },
    garage: GAME.garage.cars,
    crew: GAME.crew.recruited,
    settings: GAME.settings,
  };
  try {
    localStorage.setItem('teluk-arunika.save.' + slot, JSON.stringify(summary));
  } catch (e) {
    return false;
  }
  if (slot === 0) {
    GAME.ui.banner = 'AUTOSAVED';
  } else {
    GAME.ui.banner = 'SAVED TO SLOT ' + slot;
  }
  return true;
}

// Load a save slot back into the game state.
function loadGameFromSlot(slot) {
  let raw = null;
  try {
    raw = localStorage.getItem('teluk-arunika.save.' + slot);
  } catch (e) {
    return false;
  }
  if (!raw) {
    return false;
  }
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return false;
  }
  GAME.time.day = data.day;
  GAME.money = data.money;
  GAME.debt = data.debt;
  GAME.career.stats.contractsDone = data.contracts;
  GAME.career.rank = data.rank;
  GAME.career.rp = data.rp;
  GAME.mission.branch = data.branch || 'none';
  GAME.player.x = data.player.x;
  GAME.player.z = data.player.z;
  GAME.player.health = data.player.health;
  GAME.player.vehicle = -1;
  GAME.garage.cars = data.garage || [];
  GAME.crew.recruited = data.crew || [];
  if (data.settings) {
    GAME.settings = data.settings;
  }
  GAME.mode = 'playing';
  return true;
}

// Autosave at a safehouse when the player parks nearby.
function autosaveAtSafehouse() {
  const p = GAME.player;
  for (const place of CITY_PLACES) {
    if (place.name.indexOf('SAFEHOUSE') === 0) {
      if (distanceBetween(p.x, p.z, place.x, place.z) < 10) {
        saveGameToSlot(0);
        return true;
      }
    }
  }
  saveGameToSlot(0);
  return true;
}

// List the slots with one-line summaries for the menu cards.
function listSaveSlots() {
  const slots = [];
  const names = ['AUTOSAVE', 'SLOT 1', 'SLOT 2', 'SLOT 3'];
  for (let i = 0; i < 4; i++) {
    let raw = null;
    try {
      raw = localStorage.getItem('teluk-arunika.save.' + i);
    } catch (e) {
      raw = null;
    }
    if (!raw) {
      slots.push({ name: names[i], summary: i === 3 ? 'EMPTY — starts a new game' : 'EMPTY' });
      continue;
    }
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = null;
    }
    if (!data) {
      slots.push({ name: names[i], summary: 'CORRUPT SAVE' });
      continue;
    }
    const hours = Math.floor(data.playMinutes / 60);
    const mins = data.playMinutes % 60;
    slots.push({
      name: names[i],
      summary: 'DAY ' + data.day + ' · ' + data.contracts + '/10 · $'
        + data.money.toLocaleString() + ' · ' + hours + ' h '
        + String(mins).padStart(2, '0') + ' m',
    });
  }
  return slots;
}

// Save the settings alone, so they survive a fresh boot.
function saveSettings() {
  try {
    localStorage.setItem('teluk-arunika.settings', JSON.stringify(GAME.settings));
  } catch (e) {
    return false;
  }
  return true;
}

// Load saved settings at boot, keeping defaults for missing keys.
function loadSettings() {
  let raw = null;
  try {
    raw = localStorage.getItem('teluk-arunika.settings');
  } catch (e) {
    return;
  }
  if (!raw) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    for (const key in data) {
      GAME.settings[key] = data[key];
    }
  } catch (e) {
    return;
  }
}
