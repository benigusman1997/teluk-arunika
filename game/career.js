// TELUK ARUNIKA v3 — career.js
// Progresi karier / reputasi: 5 tingkat, XP dari misi / side job / curi mobil /
// selamat dari wanted 4+ / tangkap Darma. Perk terbuka per tingkat.
(function () {
  'use strict';

  var CR = TA.career = {};

  CR.RANKS = [
    { name: 'Anak Baru', xp: 0, perk: 'Tanpa perk — buktikan dirimu di jalanan Teluk Arunika.' },
    { name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru: Sari (sopir) & Budi (montir) bisa direkrut.' },
    { name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% di semua toko + buka rekrut Agus (peretas).' },
    { name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25.' },
    { name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar tampil di layar akhir.' }
  ];

  CR.initCareer = function () {
    CR.applyRankPerks();
  };

  // Tingkat saat ini dari XP (index 0..4).
  CR.getRank = function () {
    var xp = TA.state.xp;
    var idx = 0;
    for (var i = 0; i < CR.RANKS.length; i++) {
      if (xp >= CR.RANKS[i].xp) idx = i;
    }
    var r = CR.RANKS[idx];
    return {
      index: idx, name: r.name, xp: r.xp, perk: r.perk,
      next: idx + 1 < CR.RANKS.length ? CR.RANKS[idx + 1] : null,
      xpInto: xp - r.xp,
      xpNeeded: idx + 1 < CR.RANKS.length ? CR.RANKS[idx + 1].xp - r.xp : 0
    };
  };

  CR.addXP = function (n) {
    if (!n) return;
    TA.state.xp += n;
    CR.checkRankUp();
    TA.ui.renderHUD(true);
  };

  CR.checkRankUp = function () {
    var s = TA.state;
    var rank = CR.getRank();
    if (rank.index > s.rankIndex) {
      s.rankIndex = rank.index;
      CR.applyRankPerks();
      TA.ui.showRankUpBanner(rank.name);
      TA.audio.rankUpSound();
      TA.ui.toast('NAIK TINGKAT: ' + rank.name + '! Perk baru: ' + rank.perk);
    }
  };

  // Terapkan perk tingkat ke stat pemain (idempotent: hitung dari dasar).
  CR.applyRankPerks = function () {
    var s = TA.state;
    var rank = CR.getRank();
    s.maxArmor = 100 + (rank.index >= 3 ? 50 : 0);
    s.maxHp = 100 + (rank.index >= 3 ? 25 : 0);
    if (s.armor > s.maxArmor) s.armor = s.maxArmor;
    if (s.hp > s.maxHp) s.hp = s.maxHp;
    s.rankIndex = rank.index;
  };

  CR.update = function (dt) {
    // Tidak ada logika per-frame; XP & rank dihitung saat kejadian.
  };

  // Panel karier untuk layar pause.
  CR.renderCareerPanel = function () {
    var panel = TA.el('career-panel');
    if (!panel) return;
    var s = TA.state;
    var rank = CR.getRank();
    var html = '<div class="career-current">Tingkat: <b>' + rank.name + '</b> · ' + s.xp + ' XP</div>';
    html += '<div class="xp-bar big"><div id="career-xp-fill" style="width:' +
      (rank.next ? Math.round(100 * rank.xpInto / rank.xpNeeded) : 100) + '%"></div></div>';
    html += '<div class="career-next">' + (rank.next ?
      'Berikutnya: <b>' + rank.next.name + '</b> (' + rank.next.xp + ' XP) — ' + rank.next.perk :
      'Tingkat maksimum tercapai — Legenda Arunika!') + '</div>';
    html += '<div class="career-list">';
    CR.RANKS.forEach(function (r, i) {
      var unlocked = i <= rank.index;
      html += '<div class="career-row' + (unlocked ? ' unlocked' : '') + '">' +
        '<span class="career-check">' + (unlocked ? '&#10003;' : '&#9675;') + '</span> ' +
        '<b>' + r.name + '</b> <span class="career-xp">' + r.xp + ' XP</span>' +
        '<div class="career-perk">' + r.perk + '</div></div>';
    });
    html += '</div>';
    html += '<div class="career-stats">Misi selesai: ' + s.missionsDone +
      ' · Mobil dicuri: ' + s.carsStolen + ' · Musuh dikalahkan: ' + s.kills +
      ' · Side job: ' + s.jobsDone + '</div>';
    panel.innerHTML = html;
  };
})();
