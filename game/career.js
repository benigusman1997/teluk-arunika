// career.js — 5 career ranks with XP thresholds + perks, rank-up banner, save/load of XP + rank.
(function () {
  'use strict';
  var TA = window.TA;

  var RANKS = [
    { level: 1, name: 'Anak Baru', xp: 0, perk: 'Tanpa perk — buktikan dirimu di jalanan.' },
    { level: 2, name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru: Sari & Budi bisa direkrut.' },
    { level: 3, name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% di semua toko + buka rekrut Agus.' },
    { level: 4, name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25.', armorBonus: 50, hpBonus: 25 },
    { level: 5, name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar di layar akhir.', wantedCooldownMul: 1.2 },
  ];

  function getRank() {
    var xp = TA.state.xp;
    var r = RANKS[0];
    RANKS.forEach(function (rank) { if (xp >= rank.xp) r = rank; });
    return r;
  }
  function getNextRank() {
    var r = getRank();
    return RANKS[r.level] || null; // RANKS indexed 0..4; next is level (1-based) -> index
  }

  function addXP(amount) {
    var s = TA.state;
    var before = getRank();
    s.xp += amount;
    checkRankUp(before);
    TA.ui.renderHUD();
  }

  function checkRankUp(before) {
    var after = getRank();
    if (after.level > (before ? before.level : 1)) {
      TA.state.rank = after.level;
      applyRankPerks(after);
      TA.ui.showRankUpBanner('NAIK TINGKAT: ' + after.name + '!');
      TA.ui.toast('NAIK TINGKAT: ' + after.name + ' — ' + after.perk);
    }
    TA.state.rank = after.level;
  }

  function applyRankPerks(rank) {
    var s = TA.state;
    if (rank.hpBonus) s.hp = Math.min(100 + rank.hpBonus, s.hp + rank.hpBonus);
    // shop discount + wanted cooldown are read live from getRank() by player/police
  }

  function update(dt) { /* rank state is event-driven; nothing per-frame */ }

  TA.career = {
    RANKS: RANKS,
    addXP: addXP, getRank: getRank, getNextRank: getNextRank,
    checkRankUp: checkRankUp, applyRankPerks: applyRankPerks, update: update,
  };
})();
