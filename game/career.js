// Teluk Arunika v3.6 — career.js
// 5 career ranks with XP + perks, 6 districts with standing 0-100
// (incl. Pulau Abu), save/load (localStorage, 3 slots + autosave).
(function () {
  'use strict';
  var TA = window.TA;

  var RANKS = [
    { level: 1, name: 'Anak Baru', xp: 0, perk: 'Tanpa perk — buktikan dirimu di jalanan.' },
    { level: 2, name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru (Sari & Budi).' },
    { level: 3, name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% di semua toko + buka rekrut Agus.' },
    { level: 4, name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25.' },
    { level: 5, name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar di layar akhir.' },
  ];

  var DISTRICTS = [
    { id: 'PELABUHAN', name: 'Pelabuhan', standing: 58 },
    { id: 'PASAR', name: 'Pasar', standing: 64 },
    { id: 'GANG NEON', name: 'Gang Neon', standing: 47 },
    { id: 'PANTAI', name: 'Pantai', standing: 71 },
    { id: 'TOL LAYANG', name: 'Tol Layang', standing: 52 },
    { id: 'PULAU ABU', name: 'Pulau Abu', standing: 41 },
  ];

  function getRank() {
    var xp = TA.state.xp;
    var rank = RANKS[0];
    RANKS.forEach(function (r) { if (xp >= r.xp) rank = r; });
    var next = RANKS.filter(function (r) { return r.xp > xp; })[0] || null;
    return { level: rank.level, name: rank.name, xp: xp, next: next, perk: rank.perk };
  }

  function refreshRank() {
    var r = getRank();
    applyRankPerks(r.level);
    return r;
  }

  function addXP(amount) {
    var before = getRank().level;
    TA.state.xp += amount;
    var after = getRank();
    if (after.level > before) {
      checkRankUp(before, after);
    }
    TA.ui.updateRankRow();
  }

  function checkRankUp(beforeLevel, after) {
    applyRankPerks(after.level);
    TA.ui.showRankUpBanner(after);
    TA.crew.showCrewChatter('SARI', 'Naik tingkat! Kau sekarang ' + after.name + '!');
  }

  function applyRankPerks(level) {
    var s = TA.state;
    if (level >= 4) {
      s.maxArmor = 100;
      s.maxHp = 125;
    } else {
      s.maxArmor = 50;
      s.maxHp = 100;
    }
    s.hp = Math.min(s.hp, s.maxHp);
    s.armor = Math.min(s.armor, s.maxArmor);
  }

  function getShopDiscount() {
    return getRank().level >= 3 ? 0.85 : 1.0;
  }

  function getRankCooldownMult() {
    return getRank().level >= 5 ? 0.8 : 1.0;
  }

  // ---------- districts ----------
  function getDistrict(id) {
    return DISTRICTS.filter(function (d) { return d.id === id; })[0] || DISTRICTS[0];
  }

  function updateDistrictStanding(id, delta) {
    var d = getDistrict(id);
    d.standing = Math.max(0, Math.min(100, d.standing + delta));
    TA.ui.renderDistrictStandingPanel();
  }

  function bumpDistrict(id, delta) { updateDistrictStanding(id, delta); }

  function getTaxiFareMultiplier(id) {
    var d = getDistrict(id);
    return 0.7 + (d.standing / 100) * 0.6; // 0.7x .. 1.3x by standing
  }

  // ---------- save / load ----------
  function saveGame(slot) {
    slot = slot || 0; // 0 = autosave
    var s = TA.state;
    var data = {
      money: s.money, day: s.day, debt: s.debt,
      xp: s.xp, hp: s.hp, armor: s.armor,
      missionIndex: s.missionIndex, missionStage: s.missionStage,
      crew: TA.crew.getState().recruited,
      districts: DISTRICTS.map(function (d) { return { id: d.id, standing: d.standing }; }),
      racesWon: s.racesWon, carsStolen: s.carsStolen, kills: s.kills,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('ta_save_' + slot, JSON.stringify(data));
    } catch (e) { /* storage unavailable in some sandboxes */ }
    s.saving = true;
    TA.ui.showSavingIndicator();
    setTimeout(function () { s.saving = false; TA.ui.showSavingIndicator(); }, 900);
    return true;
  }

  function loadGame(slot) {
    var raw = null;
    try { raw = localStorage.getItem('ta_save_' + (slot || 0)); } catch (e) { raw = null; }
    if (!raw) return false;
    var data = JSON.parse(raw);
    var s = TA.state;
    s.money = data.money; s.day = data.day; s.debt = data.debt;
    s.xp = data.xp; s.hp = data.hp; s.armor = data.armor;
    s.missionIndex = data.missionIndex; s.missionStage = data.missionStage;
    s.racesWon = data.racesWon || 0; s.carsStolen = data.carsStolen || 0; s.kills = data.kills || 0;
    if (data.crew) TA.crew.setState({ recruited: data.crew });
    if (data.districts) {
      data.districts.forEach(function (dd) {
        var d = getDistrict(dd.id);
        if (d) d.standing = dd.standing;
      });
    }
    refreshRank();
    return true;
  }

  function loadSave() {
    // autosave slot loads silently at boot if present
    loadGame(0);
    refreshRank();
  }

  function update(dt) {
    // autosave every 60s of play
    if (TA.state.screen === 'playing' && TA.state.elapsed > 0 &&
        Math.floor(TA.state.elapsed) % 60 === 0 && Math.floor(TA.state.elapsed - dt) % 60 !== 0) {
      saveGame(0);
    }
  }

  TA.career = {
    RANKS: RANKS,
    DISTRICTS: DISTRICTS,
    addXP: addXP,
    getRank: getRank,
    checkRankUp: checkRankUp,
    applyRankPerks: applyRankPerks,
    refreshRank: refreshRank,
    getShopDiscount: getShopDiscount,
    getRankCooldownMult: getRankCooldownMult,
    getDistrict: getDistrict,
    updateDistrictStanding: updateDistrictStanding,
    bumpDistrict: bumpDistrict,
    getTaxiFareMultiplier: getTaxiFareMultiplier,
    saveGame: saveGame,
    loadGame: loadGame,
    loadSave: loadSave,
    update: update,
  };
})();
