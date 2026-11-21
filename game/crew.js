// Teluk Arunika v3.6 — crew.js
// 3 crew members with passive + active abilities that REALLY change gameplay.
// Sari (driver, Z Gaspol), Budi (mechanic, X quick-repair), Agus (hacker, C Ghost).
// Crew ability cards on the HUD + radio chatter toasts.
(function () {
  'use strict';
  var TA = window.TA;

  var CREW = [
    {
      id: 'sari', name: 'Sari', nickname: 'Si Gesit', role: 'Sopir',
      price: 300, key: 'Z', ability: 'Gaspol',
      desc: 'Mobil +15% kecepatan maks & handling responsif. Aktif: boost 3 dtk, wanted tidak naik selama boost.',
      passive: 'Top speed +15%',
    },
    {
      id: 'budi', name: 'Budi', nickname: 'Montir', role: 'Mekanik',
      price: 250, key: 'X', ability: 'Perbaiki Cepat',
      desc: 'Armor pulih +1/dtk (s.d. 50), mobil pulih HP +2/dtk, harga perbaikan & armor -20%. Aktif: armor +25 instan.',
      passive: 'Armor regen + perbaikan -20%',
    },
    {
      id: 'agus', name: 'Agus', nickname: 'Si Pendiam', role: 'Peretas',
      price: 400, key: 'C', ability: 'Ghost',
      desc: 'Wanted cooldown 30% lebih cepat. Aktif: sekali per misi, wanted turun 1 bintang.',
      passive: 'Wanted cooldown 30% lebih cepat',
    },
  ];

  var recruited = { sari: false, budi: false, agus: false };
  var cooldowns = { sari: 0, budi: 0, agus: 0 }; // seconds remaining
  var boostUntil = 0;
  var chatterTimer = 0;

  function isRecruited(id) { return !!recruited[id]; }

  function recruitCrewMember(id) {
    var member = CREW.filter(function (c) { return c.id === id; })[0];
    if (!member) return false;
    if (recruited[id]) return false;
    var rank = TA.career.getRank().level;
    if (id === 'agus' && rank < 3) {
      TA.ui.showToast('Agus baru bisa direkrut di Tingkat 3 (Penguasa Jalanan).');
      return false;
    }
    if ((id === 'sari' || id === 'budi') && rank < 2) {
      TA.ui.showToast('Rekrutmen kru dibuka di Tingkat 2 (Sopir Andal).');
      return false;
    }
    if (TA.state.money < member.price) {
      TA.ui.showToast('Uangmu kurang — ' + member.name + ' butuh $' + member.price + '.');
      return false;
    }
    TA.state.money -= member.price;
    recruited[id] = true;
    TA.ui.showToast(member.name + ' "' + member.nickname + '" bergabung dengan kru! (' + member.ability + ' — tombol ' + member.key + ')');
    TA.crew.showCrewChatter(member.name.toUpperCase(), 'Aku di timmu sekarang, Raka. Gas!');
    TA.ui.renderCrewCards();
    TA.ui.renderCrewPanel();
    return true;
  }

  function crewAbilityReady(id) {
    return recruited[id] && cooldowns[id] <= 0 && (id !== 'agus' || !TA.state.ghostUsedThisMission);
  }

  function activateCrewAbility(id) {
    if (!recruited[id]) {
      TA.ui.showToast('Kru belum direkrut — buka panel kru (V).');
      return false;
    }
    if (!crewAbilityReady(id)) {
      if (id === 'agus' && TA.state.ghostUsedThisMission) {
        TA.ui.showToast('Ghost sudah dipakai di misi ini.');
      } else {
        TA.ui.showToast('Kemampuan masih cooldown (' + Math.ceil(cooldowns[id]) + ' dtk).');
      }
      return false;
    }
    if (id === 'sari') {
      if (!TA.state.inCar) { TA.ui.showToast('Gaspol hanya bisa di dalam mobil.'); return false; }
      boostUntil = TA.state.elapsed + 3;
      cooldowns.sari = 45;
      TA.crew.showCrewChatter('SARI', 'Gaspol! Pegangan!');
      TA.ui.showToast('SARI: Gaspol! Boost 3 detik — wanted tidak naik.');
    } else if (id === 'budi') {
      TA.state.armor = Math.min(TA.state.maxArmor, TA.state.armor + 25);
      cooldowns.budi = 60;
      TA.crew.showCrewChatter('BUDI', 'Armor kutambal 25. Jangan ditembak lagi, ya?');
      TA.ui.showToast('BUDI: Perbaiki Cepat — armor +25.');
    } else if (id === 'agus') {
      TA.state.ghostUsedThisMission = true;
      cooldowns.agus = 0;
      if (TA.state.wanted > 0) TA.police.setWanted(TA.state.wanted - 1, true);
      TA.crew.showCrewChatter('AGUS', 'Ghost aktif. Kamera buta 30 detik — wanted turun satu.');
      TA.ui.showToast('AGUS: Ghost — wanted turun 1 bintang.');
    }
    TA.ui.renderCrewCards();
    return true;
  }

  // Combined passive bonuses, read by player.js / police.js / career.js.
  function getCrewBonus() {
    return {
      speedMult: recruited.sari ? 1.15 : 1.0,
      boostActive: boostUntil > 0 && TA.state.elapsed < boostUntil,
      armorRegen: recruited.budi ? 1 : 0,          // +1/dtk s.d. 50
      carRepair: recruited.budi ? 2 : 0,           // +2 HP/dtk
      repairDiscount: recruited.budi ? 0.8 : 1.0,  // -20%
      shopDiscount: recruited.budi ? 0.8 : 1.0,
      wantedCooldownMult: (recruited.agus ? 0.7 : 1.0),
    };
  }

  function crewBonus() { return getCrewBonus(); }

  function showCrewChatter(name, text) {
    TA.state.chatter = { name: name, text: text, until: TA.state.elapsed + 5 };
    chatterTimer = 5;
    TA.ui.renderCrewChatter();
  }

  function update(dt) {
    ['sari', 'budi', 'agus'].forEach(function (id) {
      if (cooldowns[id] > 0) cooldowns[id] -= dt;
    });
    if (chatterTimer > 0) {
      chatterTimer -= dt;
      if (chatterTimer <= 0) {
        TA.state.chatter = null;
        TA.ui.renderCrewChatter();
      }
    }
    // cooldown display refresh (cheap: once a second)
    if (Math.floor(TA.state.elapsed) !== Math.floor(TA.state.elapsed - dt)) {
      TA.ui.renderCrewCards();
    }
  }

  function getState() {
    return { recruited: recruited, cooldowns: cooldowns };
  }

  function setState(saved) {
    if (!saved) return;
    if (saved.recruited) recruited = saved.recruited;
  }

  TA.crew = {
    CREW: CREW,
    recruitCrewMember: recruitCrewMember,
    activateCrewAbility: activateCrewAbility,
    crewAbilityReady: crewAbilityReady,
    getCrewBonus: getCrewBonus,
    crewBonus: crewBonus,
    showCrewChatter: showCrewChatter,
    isRecruited: isRecruited,
    getState: getState,
    setState: setState,
    getCooldowns: function () { return cooldowns; },
    renderCrewPanel: function () { TA.ui.renderCrewPanel(); },
    renderCrewCards: function () { TA.ui.renderCrewCards(); },
    update: update,
  };
})();
