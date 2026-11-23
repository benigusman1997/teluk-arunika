// save-slots.js — three save slots plus autosave in localStorage, and settings persistence.
var TA = window.TA || (window.TA = {});
function saveGameToSlot(n) {
  var S = TA.S, P = TA.player, data = JSON.parse(JSON.stringify(S, function (k, v) { return v === Infinity ? 'INF' : v; }));
  data.pos = { x: P.x, z: P.z }; data.savedAt = 'DAY ' + S.day + ' · ' + S.done.length + '/10 · $' + S.money;
  try { localStorage.setItem('teluk-arunika-slot-' + n, JSON.stringify(data)); TA.notify(n === 'auto' ? 'AUTOSAVED' : 'SAVED TO SLOT ' + n); } catch (e) { TA.notify('SAVE FAILED'); }
}
function loadGameFromSlot(n) {
  var raw = null; try { raw = localStorage.getItem('teluk-arunika-slot-' + n); } catch (e) { raw = null; }
  if (!raw) return false;
  var d = JSON.parse(raw, function (k, v) { return v === 'INF' ? Infinity : v; }), S = TA.S = TA.createNewGameState();
  for (var k in d) if (k in S) S[k] = d[k];
  S.mode = 'playing'; S.stage = -1; S.wanted = 0; S.heat = 0; S.activity = null;
  if (TA.player.car) TA.enterOrExitVehicleForced();
  TA.player.x = d.pos.x; TA.player.z = d.pos.z; return true;
}
function autosaveAtSafehouse() { saveGameToSlot('auto'); }
function slotSummary(n) {
  try { var raw = localStorage.getItem('teluk-arunika-slot-' + n); return raw ? JSON.parse(raw).savedAt : null; } catch (e) { return null; }
}
function persistSettings(load) {
  try {
    if (load) { var s = localStorage.getItem('teluk-arunika-settings'); if (s) TA.S.settings = JSON.parse(s); }
    else localStorage.setItem('teluk-arunika-settings', JSON.stringify(TA.S.settings));
  } catch (e) { return; }
}
TA.saveGameToSlot = saveGameToSlot; TA.loadGameFromSlot = loadGameFromSlot; TA.autosaveAtSafehouse = autosaveAtSafehouse; TA.slotSummary = slotSummary; TA.persistSettings = persistSettings;
