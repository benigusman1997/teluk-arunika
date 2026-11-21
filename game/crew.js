// TELUK ARUNIKA v3 — crew.js
// Sistem kru: 3 anggota yang direkrut dengan uang di bengkel Pak Amir.
// Kemampuan pasif BENAR-BENAR mengubah gameplay; kemampuan aktif di tombol Q.
(function () {
  'use strict';

  var C = TA.crew = {};

  C.CREW = [
    {
      id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir',
      cost: 300, rankNeeded: 2,
      passive: 'Mobil +15% kecepatan maksimum & handling lebih responsif.',
      ability: 'GASPOL (Q di mobil): boost 3 detik, wanted tidak naik selama boost. Cooldown 45 dtk.',
      color: '#ff2e88',
      quote: 'Gaspol, Raka!'
    },
    {
      id: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik',
      cost: 250, rankNeeded: 2,
      passive: 'Armor pulih +1/dtk sampai 50. Mobil pulih +2 HP/dtk. Biaya perbaikan & armor -20%.',
      ability: 'Pasif murni — tidak ada tombol aktif. Budi bekerja di belakang layar.',
      color: '#facc15',
      quote: 'Mobilmu aman bersamaku.'
    },
    {
      id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas',
      cost: 400, rankNeeded: 3,
      passive: 'Wanted cooldown 30% lebih cepat (sembunyi lebih singkat).',
      ability: 'GHOST (Q saat jalan kaki): wanted langsung turun 1 bintang. Sekali per misi. Cooldown 60 dtk.',
      color: '#22d3ee',
      quote: 'Mereka tidak melihat kita.'
    }
  ];

  C.initCrew = function () {
    // Tidak ada state runtime tambahan; status rekrut hidup di TA.state.crew.
  };

  C.isRecruited = function (id) {
    return !!TA.state.crew[id];
  };

  C.recruitCrewMember = function (id) {
    var s = TA.state;
    var member = null;
    for (var i = 0; i < C.CREW.length; i++) if (C.CREW[i].id === id) member = C.CREW[i];
    if (!member) return false;
    if (C.isRecruited(id)) {
      TA.ui.toast(member.name + ' sudah bergabung dengan krumu.');
      return false;
    }
    var rank = TA.career.getRank();
    if (rank.index + 1 < member.rankNeeded) {
      TA.ui.toast(member.name + ' baru bisa direkrut di tingkat ' +
        TA.career.RANKS[member.rankNeeded - 1].name + ' (' +
        TA.career.RANKS[member.rankNeeded - 1].xp + ' XP). Kamu masih ' + rank.name + '.');
      return false;
    }
    if (s.money < member.cost) {
      TA.ui.toast('Uang tidak cukup untuk merekrut ' + member.name + ' (' + TA.fmtMoney(member.cost) + ').');
      return false;
    }
    s.money -= member.cost;
    s.crew[id] = true;
    TA.ui.toast(member.name + ' "' + member.nick + '" bergabung! ' + member.quote);
    TA.audio.recruitSound();
    TA.career.addXP(20);
    TA.ui.renderHUD(true);
    C.renderCrewPanel();
    TA.autosave();
    return true;
  };

  // Bonus gabungan kru — dipakai player.js (kecepatan), police.js (cooldown),
  // career.js / player.js (diskon). Satu sumber kebenaran.
  C.getCrewBonus = function () {
    var s = TA.state;
    var b = {
      speedMul: 1, handling: 1, armorRegen: 0, carRepair: 0,
      discount: 0, wantedCooldownMul: 1
    };
    if (s.crew.sari) { b.speedMul = 1.15; b.handling = 1.25; }
    if (s.crew.budi) { b.armorRegen = 1; b.carRepair = 2; b.discount = 0.2; }
    if (s.crew.agus) { b.wantedCooldownMul = 1.3; }
    // Perk tingkat 3: diskon 15% di semua toko (ditumpuk dengan diskon Budi).
    var rank = TA.career.getRank();
    if (rank.index >= 2) b.discount = Math.max(b.discount, 0.15);
    if (s.crew.budi && rank.index >= 2) b.discount = 0.32;
    // Perk tingkat 5: wanted cooldown 20% lebih cepat.
    if (rank.index >= 4) b.wantedCooldownMul *= 1.2;
    return b;
  };

  // Kemampuan aktif (tombol Q). Konteks menentukan siapa yang bekerja.
  C.activateCrewAbility = function () {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    if (s.abilityCd > 0) {
      TA.ui.toast('Kemampuan kru cooldown — ' + Math.ceil(s.abilityCd) + ' dtk lagi.');
      return;
    }
    if (s.inCar && s.crew.sari) {
      // GASPOL: boost 3 detik + wanted beku.
      s.gaspolUntil = performance.now() + 3000;
      s.abilityCd = 45;
      TA.ui.toast('SARI: Gaspol!');
      TA.audio.boostSound();
      TA.ui.flashAbility('SARI: GASPOL!');
      return;
    }
    if (!s.inCar && s.crew.agus) {
      if (s.ghostUsedThisMission) {
        TA.ui.toast('AGUS: Ghost sudah dipakai di misi ini.');
        return;
      }
      if (s.wanted <= 0) {
        TA.ui.toast('AGUS: Tidak ada wanted untuk dihapus.');
        return;
      }
      s.ghostUsedThisMission = true;
      s.abilityCd = 60;
      TA.police.setWanted(s.wanted - 1);
      TA.ui.toast('AGUS: Ghost — wanted turun 1 bintang. Mereka kehilangan jejakmu.');
      TA.audio.ghostSound();
      TA.ui.flashAbility('AGUS: GHOST!');
      return;
    }
    if (s.crew.budi && !s.crew.sari && !s.crew.agus) {
      TA.ui.toast('BUDI: Mobil dan armormu sedang kuperbaiki — pasif, tanpa tombol.');
      return;
    }
    if (!s.crew.sari && !s.crew.budi && !s.crew.agus) {
      TA.ui.toast('Belum ada kru. Rekrut di bengkel Pak Amir (tombol C).');
      return;
    }
    if (s.inCar && !s.crew.sari) {
      TA.ui.toast('Sari belum direkrut — Gaspol butuh sopir. Rekrut di bengkel (C).');
      return;
    }
    TA.ui.toast('Tidak ada kemampuan aktif yang cocok di situasi ini.');
  };

  // Dipanggil tiap frame dari core.tick.
  C.update = function (dt) {
    var s = TA.state;
    if (s.abilityCd > 0) s.abilityCd -= dt;
    var bonus = C.getCrewBonus();
    // Budi: armor pulih pelan sampai 50.
    if (bonus.armorRegen > 0 && s.armor < 50 && s.armor < s.maxArmor) {
      s.armor = Math.min(50, s.armor + bonus.armorRegen * dt);
    }
  };

  C.renderCrewPanel = function () {
    // Ada dua tempat panel kru (popup tombol C + kolom layar pause) —
    // keduanya memakai class .crew-panel-list, isi semuanya.
    var panels = document.querySelectorAll('.crew-panel-list');
    if (!panels.length) return;
    var html = '';
    C.CREW.forEach(function (m) {
      var recruited = C.isRecruited(m.id);
      var rank = TA.career.getRank();
      var locked = !recruited && rank.index + 1 < m.rankNeeded;
      html += '<div class="crew-card' + (recruited ? ' recruited' : '') + (locked ? ' locked' : '') + '">' +
        '<div class="crew-avatar" style="background:' + m.color + '">' +
        (recruited ? '&#10003;' : m.name.charAt(0)) + '</div>' +
        '<div class="crew-info"><div class="crew-name">' + m.name + ' &ldquo;' + m.nick + '&rdquo; — ' + m.role + '</div>' +
        '<div class="crew-desc">' + m.passive + '</div>' +
        '<div class="crew-desc"><b>Aktif:</b> ' + m.ability + '</div>' +
        '<div class="crew-status">' + (recruited ? 'DIREKRUT &#10003;' :
          (locked ? 'Terkunci — butuh tingkat ' + TA.career.RANKS[m.rankNeeded - 1].name :
            '<button class="btn-small" data-recruit="' + m.id + '">Rekrut — ' + TA.fmtMoney(m.cost) + '</button>')) +
        '</div></div></div>';
    });
    panels.forEach(function (panel) {
      panel.innerHTML = html;
      panel.querySelectorAll('[data-recruit]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          C.recruitCrewMember(btn.getAttribute('data-recruit'));
        });
      });
    });
  };
})();
