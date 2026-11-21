// TELUK ARUNIKA v3 — crew.js
// Sistem kru: 3 anggota yang direkrut dengan uang di bengkel Pak Amir.
// Kemampuan pasif BENAR-BENAR mengubah gameplay; kemampuan aktif di tombol
// masing-masing (v3.5): Sari = Z, Budi = X, Agus = C. Panel kru lengkap di V.
(function () {
  'use strict';

  var C = TA.crew = {};

  C.CREW = [
    {
      id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir',
      cost: 300, rankNeeded: 2, key: 'Z',
      passive: 'Mobil +15% kecepatan maksimum & handling lebih responsif.',
      ability: 'GASPOL (Z di mobil): boost 3 detik, wanted tidak naik selama boost. Cooldown 45 dtk.',
      color: '#ff2e88',
      quote: 'Gaspol, Raka!'
    },
    {
      id: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik',
      cost: 250, rankNeeded: 2, key: 'X',
      passive: 'Armor pulih +1/dtk sampai 50. Mobil pulih +2 HP/dtk. Biaya perbaikan & armor -20%.',
      ability: 'PERBAIKI CEPAT (X): armor +25 instan. Cooldown 60 dtk.',
      color: '#facc15',
      quote: 'Mobilmu aman bersamaku.'
    },
    {
      id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas',
      cost: 400, rankNeeded: 3, key: 'C',
      passive: 'Wanted cooldown 30% lebih cepat (sembunyi lebih singkat).',
      ability: 'GHOST (C saat jalan kaki): wanted langsung turun 1 bintang. Sekali per misi.',
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

  // Kemampuan aktif per anggota (v3.5): Sari = Z, Budi = X, Agus = C.
  // Cooldown dihitung per anggota di TA.state.crewCd (detik).
  C.activateCrewAbility = function (id) {
    var s = TA.state;
    if (s.mode !== 'playing') return false;
    var member = null;
    C.CREW.forEach(function (m) { if (m.id === id) member = m; });
    if (!member) return false;
    if (!C.isRecruited(id)) {
      TA.ui.toast(member.name + ' belum direkrut — rekrut di bengkel Pak Amir (V).');
      return false;
    }
    if (id === 'sari') {
      if (!s.inCar) {
        TA.ui.toast('SARI: Gaspol hanya bisa di mobil.');
        return false;
      }
      if (s.crewCd.sari > 0) {
        TA.ui.toast('SARI: Gaspol cooldown — ' + Math.ceil(s.crewCd.sari) + ' dtk.');
        return false;
      }
      // GASPOL: boost 3 detik + wanted beku.
      s.gaspolUntil = performance.now() + 3000;
      s.crewCd.sari = 45;
      TA.ui.toast('SARI: Gaspol!');
      TA.audio.boostSound();
      TA.ui.flashAbility('SARI: GASPOL!');
      TA.ui.showCrewChatter('Sari', 'Gaspol! Pegang erat, Raka!');
      return true;
    }
    if (id === 'budi') {
      if (s.crewCd.budi > 0) {
        TA.ui.toast('BUDI: Perbaiki Cepat cooldown — ' + Math.ceil(s.crewCd.budi) + ' dtk.');
        return false;
      }
      if (s.armor >= s.maxArmor) {
        TA.ui.toast('BUDI: Armor sudah penuh.');
        return false;
      }
      // PERBAIKI CEPAT: armor +25 instan.
      s.armor = Math.min(s.maxArmor, s.armor + 25);
      s.crewCd.budi = 60;
      TA.ui.toast('BUDI: Perbaiki Cepat! Armor +25.');
      TA.audio.repairSound();
      TA.ui.flashAbility('BUDI: PERBAIKI CEPAT!');
      TA.ui.showCrewChatter('Budi', 'Armor sudah kutambal, Raka. Lanjut!');
      TA.ui.renderHUD(true);
      return true;
    }
    if (id === 'agus') {
      if (s.ghostUsedThisMission) {
        TA.ui.toast('AGUS: Ghost sudah dipakai di misi ini.');
        return false;
      }
      if (s.wanted <= 0) {
        TA.ui.toast('AGUS: Tidak ada wanted untuk dihapus.');
        return false;
      }
      // GHOST: wanted langsung turun 1 bintang, sekali per misi.
      s.ghostUsedThisMission = true;
      TA.police.setWanted(s.wanted - 1);
      TA.ui.toast('AGUS: Ghost — wanted turun 1 bintang. Mereka kehilangan jejakmu.');
      TA.audio.ghostSound();
      TA.ui.flashAbility('AGUS: GHOST!');
      TA.ui.showCrewChatter('Agus', 'Kamera sudah kubutakan. Mereka kehilangan jejakmu.');
      return true;
    }
    return false;
  };

  // Status kemampuan satu anggota untuk kartu HUD: {ready, label}.
  C.crewAbilityReady = function (id) {
    var s = TA.state;
    if (!C.isRecruited(id)) return { ready: false, label: 'BELUM DIREKRUT' };
    if (id === 'sari') {
      return s.crewCd.sari > 0 ? { ready: false, label: Math.ceil(s.crewCd.sari) + ' dtk' } : { ready: true, label: 'READY' };
    }
    if (id === 'budi') {
      return s.crewCd.budi > 0 ? { ready: false, label: Math.ceil(s.crewCd.budi) + ' dtk' } : { ready: true, label: 'READY' };
    }
    if (id === 'agus') {
      return s.ghostUsedThisMission ? { ready: false, label: 'SEKALI/MISI' } : { ready: true, label: 'READY' };
    }
    return { ready: false, label: '—' };
  };

  // Dipanggil tiap frame dari core.tick.
  C.update = function (dt) {
    var s = TA.state;
    if (s.crewCd.sari > 0) s.crewCd.sari -= dt;
    if (s.crewCd.budi > 0) s.crewCd.budi -= dt;
    if (s.crewCd.agus > 0) s.crewCd.agus -= dt;
    var bonus = C.getCrewBonus();
    // Budi: armor pulih pelan sampai 50.
    if (bonus.armorRegen > 0 && s.armor < 50 && s.armor < s.maxArmor) {
      s.armor = Math.min(50, s.armor + bonus.armorRegen * dt);
    }
  };

  // Kartu kemampuan kru di HUD (v3.5): nama + kemampuan + tombol + status.
  C.renderCrewCards = function () {
    var e = TA.el('crew-cards');
    if (!e) return;
    var recruited = C.CREW.filter(function (m) { return C.isRecruited(m.id); });
    if (!recruited.length) {
      e.style.display = 'none';
      e.innerHTML = '';
      return;
    }
    var html = '<div class="crew-cards-title">KRU — KEMAMPUAN</div>';
    recruited.forEach(function (m) {
      var st = C.crewAbilityReady(m.id);
      var abilityName = m.id === 'sari' ? 'GASPOL' : m.id === 'budi' ? 'PERBAIKI CEPAT' : 'GHOST';
      html += '<div class="crew-mini" style="border-left-color:' + m.color + '">' +
        '<div class="crew-mini-name">' + m.name.toUpperCase() + ' &ldquo;' + m.nick + '&rdquo; — ' + m.role + '</div>' +
        '<div class="crew-mini-ability">' + abilityName + ' <span class="crew-mini-key">[' + m.key + ']</span> ' +
        '<span class="crew-mini-status ' + (st.ready ? 'ready' : 'cd') + '">' + st.label + '</span></div></div>';
    });
    e.innerHTML = html;
    e.style.display = '';
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
