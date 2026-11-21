/* career.js — Teluk Arunika v3.8. 5 tingkat karier + XP, suasana 6 distrik,
   Koin Arunika 12 + lompatan 5, simpan/muat save slot localStorage. */
(function () {
  'use strict';
  var TA = window.TA;

  var RANKS = [
    { level: 1, name: 'Anak Baru', xp: 0, perk: 'Tanpa perk.' },
    { level: 2, name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru (Sari & Budi).' },
    { level: 3, name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% semua toko + buka rekrut Agus.' },
    { level: 4, name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25.' },
    { level: 5, name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar di layar akhir.' },
  ];

  var DISTRICTS = ['PELABUHAN', 'PASAR', 'GANG NEON', 'PANTAI', 'TOL LAYANG', 'PULAU ABU'];
  var STASHES = [];
  for (var i = 0; i < 12; i++) STASHES.push({ id: i + 1 });
  var STUNT_RAMPS = [];
  for (var j = 0; j < 5; j++) STUNT_RAMPS.push({ id: j + 1 });

  function getRank(xp) {
    var r = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].xp) r = RANKS[i];
    return r;
  }
  function nextRank(xp) {
    for (var i = 0; i < RANKS.length; i++) if (xp < RANKS[i].xp) return RANKS[i];
    return null;
  }
  function addXP(n) {
    var s = TA.state;
    var before = getRank(s.xp);
    s.xp += n;
    var after = getRank(s.xp);
    if (after.level > before.level) {
      checkRankUp(after);
    }
    if (TA.ui) TA.ui.renderAll(true);
  }
  function checkRankUp(rank) {
    applyRankPerks(rank);
    if (TA.ui) TA.ui.showRankUpBanner(rank);
  }
  function applyRankPerks(rank) {
    var s = TA.state;
    if (rank.level >= 4) { s.maxArmor = 150; s.maxHealth = 125; }
    if (TA.ui) TA.ui.renderAll(true);
  }

  function updateDistrictStanding(district, delta) {
    var s = TA.state;
    if (s.districts[district] === undefined) return;
    s.districts[district] = Math.max(0, Math.min(100, s.districts[district] + delta));
  }
  function update(dt) { /* suasana berubah lewat aksi; tidak ada tick pasif */ }

  function collectStash(id) {
    var s = TA.state;
    s.coins = Math.min(12, s.coins + 1);
    s.money += 50;
    addXP(10);
  }
  function registerStuntJump() {
    var s = TA.state;
    s.jumps = Math.min(5, s.jumps + 1);
    addXP(15);
  }

  /* ---------- save / load ---------- */
  function saveGame(slot) {
    var s = TA.state;
    try {
      var data = {
        day: s.day, money: s.money, xp: s.xp, rank: s.rank,
        missionDone: s.missionDone, wreckDone: s.wreckDone,
        crew: { sari: s.crew.sari.recruited, budi: s.crew.budi.recruited, agus: s.crew.agus.recruited },
        districts: s.districts, coins: s.coins, jumps: s.jumps,
        racesWon: s.racesWon, carsStolen: s.carsStolen, bestWanted: s.bestWanted,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('teluk-arunika-save-' + slot, JSON.stringify(data));
      if (TA.ui) TA.ui.toast('Menyimpan... Slot ' + slot + ' tersimpan.');
      return true;
    } catch (e) { return false; }
  }
  function loadGame(slot) {
    try {
      var raw = localStorage.getItem('teluk-arunika-save-' + slot);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function listSaves() {
    var out = [];
    for (var i = 1; i <= 3; i++) out.push(loadGame(i));
    return out;
  }

  TA.career = {
    RANKS: RANKS, DISTRICTS: DISTRICTS, STASHES: STASHES, STUNT_RAMPS: STUNT_RAMPS,
    addXP: addXP, getRank: getRank, nextRank: nextRank,
    checkRankUp: checkRankUp, applyRankPerks: applyRankPerks,
    updateDistrictStanding: updateDistrictStanding, update: update,
    collectStash: collectStash, registerStuntJump: registerStuntJump,
    saveGame: saveGame, loadGame: loadGame, listSaves: listSaves,
  };
})();
