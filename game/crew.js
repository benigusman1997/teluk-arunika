// crew.js — 3 recruitable crew members with real gameplay bonuses + active abilities (Z / X / C),
// crew cards in HUD, crew panel (V), radio chatter.
(function () {
  'use strict';
  var TA = window.TA;

  var CREW = [
    { id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir', price: 300, key: 'Z', ability: 'Gaspol',
      desc: 'Mobil +15% kecepatan maks & handling responsif. Aktif: boost 3 dtk, wanted tak naik saat boost.',
      passive: 'Kecepatan +15%, handling +20%' },
    { id: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik', price: 250, key: 'X', ability: 'Perbaiki Cepat',
      desc: 'Armor pulih +1/dtk sampai 50, mobil pulih HP +2/dtk, biaya bengkel -20%. Aktif: armor +25 instan (cooldown 60 dtk).',
      passive: 'Armor regen, mobil regen, diskon bengkel 20%' },
    { id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas', price: 400, key: 'C', ability: 'Ghost',
      desc: 'Wanted cooldown 30% lebih cepat. Aktif: wanted turun 1 bintang, sekali per misi.',
      passive: 'Wanted cooldown +30%' },
  ];
  var boostUntil = 0;

  function recruitCrewMember(id) {
    var s = TA.state;
    var m = CREW.find(function (c) { return c.id === id; });
    if (!m) return false;
    if (s.crew[id]) return false;
    if (id === 'sari' || id === 'budi') {
      if (s.rank < 2) { TA.ui.toast('Rekrutmen Sari & Budi terbuka di Tingkat 2 (Sopir Andal).'); return false; }
    }
    if (id === 'agus' && s.rank < 3) { TA.ui.toast('Agus terbuka di Tingkat 3 (Penguasa Jalanan).'); return false; }
    if (s.money < m.price) { TA.ui.toast('Uang tidak cukup untuk merekrut ' + m.name + ' ($' + m.price + ').'); return false; }
    s.money -= m.price;
    s.crew[id] = true;
    TA.ui.toast(m.name + ' "' + m.nick + '" bergabung dengan kru! (tombol ' + m.key + ')');
    TA.crew.showCrewChatter(m.name, 'Aku ikut, Raka. Kita selesaikan utang ini bersama.');
    TA.ui.renderHUD();
    TA.ui.renderCrewPanel();
    return true;
  }

  function crewAbilityReady(id) {
    var s = TA.state;
    if (!s.crew[id]) return false;
    return (s.crewCooldown[id] || 0) <= 0;
  }

  function activateCrewAbility(id) {
    var s = TA.state;
    if (!s.crew[id]) { TA.ui.toast('Kru belum direkrut. Buka panel kru (V).'); return false; }
    if (!crewAbilityReady(id)) {
      TA.ui.toast('Kemampuan masih cooldown (' + Math.ceil(s.crewCooldown[id]) + ' dtk).');
      return false;
    }
    if (id === 'sari') {
      if (!s.inCar) { TA.ui.toast('Gaspol hanya bisa dipakai saat di mobil.'); return false; }
      boostUntil = performance.now() / 1000 + 3;
      s.crewCooldown.sari = 45;
      TA.ui.toast('SARI: Gaspol! Boost 3 detik — wanted tak naik!');
      TA.crew.showCrewChatter('Sari', 'Gaspol! Pegangan — kita tembus blokade ini!');
    } else if (id === 'budi') {
      var maxArmor = 100 + (TA.career.getRank().armorBonus || 0);
      s.armor = Math.min(maxArmor, s.armor + 25);
      if (s.carId) TA.player.repairCar(s.carId);
      s.crewCooldown.budi = 60;
      TA.ui.toast('BUDI: Perbaiki Cepat! Armor +25, mobil diperbaiki.');
      TA.crew.showCrewChatter('Budi', 'Armor sudah kubetulkan. Mesinmu seperti baru, Raka.');
    } else if (id === 'agus') {
      if (s.ghostUsedThisMission) { TA.ui.toast('Ghost sudah dipakai di misi ini.'); return false; }
      s.ghostUsedThisMission = true;
      s.crewCooldown.agus = 30;
      TA.police.setWanted(Math.max(0, s.wanted - 1));
      TA.ui.toast('AGUS: Ghost! Wanted turun 1 bintang.');
      TA.crew.showCrewChatter('Agus', 'Kamera kota sudah kugelapkan. Mereka kehilangan jejakmu.');
    }
    TA.ui.renderHUD();
    return true;
  }

  function getCrewBonus() {
    var s = TA.state;
    var b = { speedMul: 1, handling: 1, shopDiscount: false, armorRegen: 0, carRegen: 0, wantedCooldownMul: 1 };
    if (s.crew.sari) { b.speedMul = 1.15; b.handling = 1.2; }
    if (s.crew.budi) { b.armorRegen = 1; b.carRegen = 2; b.shopDiscount = true; }
    if (s.crew.agus) b.wantedCooldownMul = 1.3;
    if (performance.now() / 1000 < boostUntil) b.speedMul *= 1.5;
    return b;
  }

  function showCrewChatter(name, text) {
    TA.ui.showCrewChatter(name, text);
  }

  function update(dt) {
    var s = TA.state;
    Object.keys(s.crewCooldown).forEach(function (k) {
      if (s.crewCooldown[k] > 0) s.crewCooldown[k] = Math.max(0, s.crewCooldown[k] - dt);
    });
    var b = getCrewBonus();
    if (b.armorRegen && s.armor < 50) s.armor = Math.min(50, s.armor + b.armorRegen * dt);
  }

  function renderCrewPanel() { TA.ui.renderCrewPanel(); }
  function renderCrewCards() { TA.ui.renderCrewCards(); }

  TA.crew = {
    CREW: CREW,
    recruitCrewMember: recruitCrewMember, activateCrewAbility: activateCrewAbility,
    crewAbilityReady: crewAbilityReady, getCrewBonus: getCrewBonus,
    renderCrewPanel: renderCrewPanel, renderCrewCards: renderCrewCards,
    showCrewChatter: showCrewChatter, update: update,
  };
})();
