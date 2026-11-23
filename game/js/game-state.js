// Live game state, new-game defaults, and the three save slots plus autosave (localStorage).
TA.SAVE_KEY = 'teluk-arunika-v4-slot-';

// Everything that survives a save lives in TA.state.
TA.newState = function () {
  var standing = {};
  TA.DISTRICTS.forEach(function (d) { standing[d.id] = 20; });
  return {
    version: TA.VERSION,
    money: 350, debt: TA.CFG.DEBT, day: 1, clock: 16 * 60 + 40,   // minutes since midnight
    missionsDone: 0, branch: null, ending: null,
    rp: 0, standing: standing,
    crew: { sari: false, budi: false, agus: false },
    owned: [true, true, false, false, false, false],
    ammo: [{ mag: 0, res: 0 }, { mag: 12, res: 36 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }],
    weapon: 1, health: 100, armour: 0,
    coins: [], ramps: [], bestRace: [0, 0, 0], wrecks: 0, exports: 0, fares: 0,
    upgrades: { engine: 0, plating: 0 },
    radio: 0, weather: 'clear', px: -176, pz: -4, ph: Math.PI,
    stats: { kills: 0, carsStolen: 0, distance: 0, busted: 0, wasted: 0, starsEscaped: 0, shots: 0, playMinutes: 0, earned: 0 },
    settings: { volume: 0.6, invertY: false, shadows: true }
  };
};

// Everything that belongs to the running session (not saved) lives in TA.run.
TA.newRun = function () {
  return {
    mode: 'title',            // title / playing / paused / map / cutscene / ending
    time: 0, frame: 0, slowmo: 1,
    wanted: 0, heat: 0, inSight: false, wantedTimer: 0,
    mission: null,            // active contract runtime, see story-missions.js
    activity: null,           // active side activity
    prompt: '', banner: null, bannerT: 0,
    chatter: null, chatterT: 0, radioLine: '', policeLine: '',
    wheelOpen: false, frozen: false, showcase: 0, slot: 0
  };
};

TA.state = TA.newState();
TA.run = TA.newRun();

TA.storage = (function () {
  try { window.localStorage.setItem('ta-probe', '1'); window.localStorage.removeItem('ta-probe'); return window.localStorage; }
  catch (e) { var mem = {}; return { getItem: function (k) { return mem[k] || null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } }; }
})();

// Copy the live player values into the state object before writing it out.
TA.captureState = function () {
  var p = TA.player;
  if (p) {
    TA.state.px = Math.round(p.x * 10) / 10; TA.state.pz = Math.round(p.z * 10) / 10; TA.state.ph = p.h;
    TA.state.health = Math.round(p.hp); TA.state.armour = Math.round(p.armour);
  }
  return TA.state;
};

TA.saveGame = function (slot) {
  var data = JSON.parse(JSON.stringify(TA.captureState()));
  data.savedAt = 'DAY ' + data.day + ' ' + TA.clockText(data.clock);
  TA.storage.setItem(TA.SAVE_KEY + slot, JSON.stringify(data));
  return data;
};

TA.readSlot = function (slot) {
  var raw = TA.storage.getItem(TA.SAVE_KEY + slot);
  if (!raw) return null;
  try { var d = JSON.parse(raw); return d && d.version ? d : null; } catch (e) { return null; }
};

TA.loadGame = function (slot) {
  var d = TA.readSlot(slot);
  if (!d) return false;
  var fresh = TA.newState();
  Object.keys(d).forEach(function (k) { fresh[k] = d[k]; });
  TA.state = fresh;
  TA.run.slot = slot;
  return true;
};

TA.deleteSlot = function (slot) { TA.storage.removeItem(TA.SAVE_KEY + slot); };

// Slot 0 is the autosave; slots 1-3 are the manual ones shown on the save tab.
TA.autosave = function () { if (TA.run.mode === 'playing' && !TA.run.showcase) TA.saveGame(0); };

TA.slotSummary = function (slot) {
  var d = TA.readSlot(slot);
  if (!d) return null;
  return {
    day: d.day, money: d.money, debt: d.debt, done: d.missionsDone, rp: d.rp, savedAt: d.savedAt || '',
    line: 'DAY ' + d.day + '/7 · ' + TA.fmtMoney(d.money) + ' · JOB ' + Math.min(10, d.missionsDone + 1) + '/10'
  };
};

TA.latestSlot = function () {
  for (var s = 0; s <= 3; s++) if (TA.readSlot(s)) return s;
  return -1;
};

TA.clockText = function (minutes) {
  var m = Math.floor(minutes) % 1440;
  return TA.pad2(Math.floor(m / 60)) + ':' + TA.pad2(m % 60);
};

// The story clock: time of day advances, and each midnight eats one of the seven days.
TA.advanceClock = function (dt) {
  var s = TA.state;
  s.clock += dt * TA.CFG.MINUTES_PER_SECOND;
  s.stats.playMinutes += dt / 60;
  if (s.clock >= 1440) {
    s.clock -= 1440; s.day += 1;
    if (s.day > 7 && s.debt > 0 && !s.ending) { s.day = 7; if (TA.onDebtDue) TA.onDebtDue(); }
    else if (TA.showBanner) TA.showBanner('DAY ' + Math.min(7, s.day) + ' OF 7', TA.fmtMoney(s.debt) + ' STILL OWED TO DARMA WIJAYA', '#ffd166');
  }
};

TA.payDebt = function (amount) {
  var s = TA.state, pay = Math.min(amount, s.debt, s.money);
  if (pay <= 0) return 0;
  s.debt -= pay; s.money -= pay;
  return pay;
};

TA.addMoney = function (n) {
  TA.state.money = Math.max(0, TA.state.money + n);
  if (n > 0) TA.state.stats.earned += n;
};
