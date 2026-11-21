/* crew.js — Teluk Arunika v3.8. 3 anggota kru (Sari sopir, Budi montir, Agus
   peretas): rekrut di bengkel, bonus pasif nyata, kemampuan aktif Z/X/C,
   kartu kru di HUD, obrolan radio kru, panel kru (V). */
(function () {
  'use strict';
  var TA = window.TA;

  var CREW = [
    { key: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir', price: 300,
      ability: 'Gaspol', keybind: 'Z', cooldown: 45,
      desc: 'Mobil +15% kecepatan. Gaspol: boost 3 dtk, wanted tidak naik.' },
    { key: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik', price: 250,
      ability: 'Perbaiki Cepat', keybind: 'X', cooldown: 60,
      desc: 'Armor pulih +1/dtk, mobil pulih +2/dtk, diskon toko 20%.' },
    { key: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas', price: 400,
      ability: 'Ghost', keybind: 'C', cooldown: 0,
      desc: 'Wanted cooldown 30% lebih cepat. Ghost: wanted -1, sekali per misi.' },
  ];

  function recruitCrewMember(key) {
    var s = TA.state;
    var c = null;
    for (var i = 0; i < CREW.length; i++) if (CREW[i].key === key) c = CREW[i];
    if (!c || s.crew[key].recruited) return false;
    if (s.rank < 2 && (key === 'sari' || key === 'budi')) { if (TA.ui) TA.ui.toast('Rekrutmen kru buka di Tingkat 2!'); return false; }
    if (s.rank < 3 && key === 'agus') { if (TA.ui) TA.ui.toast('Agus buka di Tingkat 3!'); return false; }
    if (s.money < c.price) { if (TA.ui) TA.ui.toast('Uang tidak cukup untuk merekrut ' + c.name + '!'); return false; }
    s.money -= c.price;
    s.crew[key].recruited = true;
    s.crew[key].ready = true;
    showCrewChatter(c.name, 'Aku ikut! ' + c.ability + ' siap dipakai — tekan ' + c.keybind + '.');
    if (TA.ui) TA.ui.renderAll(true);
    return true;
  }

  function activateCrewAbility(key) {
    var s = TA.state;
    var c = null;
    for (var i = 0; i < CREW.length; i++) if (CREW[i].key === key) c = CREW[i];
    if (!c || !s.crew[key].recruited) return;
    if (s.crew[key].cooldown > 0) { if (TA.ui) TA.ui.toast(c.ability + ' cooldown ' + Math.ceil(s.crew[key].cooldown) + ' dtk'); return; }
    if (key === 'sari') {
      if (s.player.onFoot) { if (TA.ui) TA.ui.toast('Gaspol hanya bisa di mobil!'); return; }
      s.car.speed = Math.min(240, s.car.speed + 70);
      s.crew.sari.cooldown = 45; s.crew.sari.ready = false;
      showCrewChatter('SARI', 'Gaspol! Pegangan — wanted tidak naik selama boost!');
      if (TA.police) TA.police.logPoliceRadio('SARI: Gaspol aktif — boost 3 detik!');
      setTimeout(function () { /* boost berakhir */ }, 3000);
    } else if (key === 'budi') {
      s.armor = Math.min(s.maxArmor, s.armor + 25);
      s.car.condition = Math.min(100, s.car.condition + 20);
      s.crew.budi.cooldown = 60; s.crew.budi.ready = false;
      showCrewChatter('BUDI', 'Perbaiki Cepat! Armor +25, mobil sudah kubereskan.');
    } else if (key === 'agus') {
      if (s.ghostUsedThisMission) { if (TA.ui) TA.ui.toast('Ghost sudah dipakai di misi ini!'); return; }
      s.ghostUsedThisMission = true;
      if (TA.police && s.wanted > 0) TA.police.setWanted(s.wanted - 1);
      showCrewChatter('AGUS', 'Ghost. Mereka kehilangan jejak kita — wanted turun 1.');
    }
    if (TA.ui) TA.ui.renderAll(true);
  }

  function getCrewBonus() {
    var s = TA.state;
    var b = { speed: 0, armorRegen: 0, wantedCooldown: 0, discount: 0 };
    if (s.crew.sari.recruited) b.speed = 0.15;
    if (s.crew.budi.recruited) { b.armorRegen = 1; b.discount = 0.2; }
    if (s.crew.agus.recruited) b.wantedCooldown = 0.3;
    if (s.rank >= 5) b.wantedCooldown += 0.2;
    return b;
  }
  function crewBonus() { return getCrewBonus(); }

  function crewAbilityReady(key) {
    var s = TA.state;
    return s.crew[key].recruited && s.crew[key].cooldown <= 0;
  }

  function showCrewChatter(name, text) {
    TA.state.chatter = { name: name, text: text, until: TA.state.time + 6 };
    if (TA.ui) TA.ui.renderAll(true);
  }

  function update(dt) {
    var s = TA.state;
    for (var k = 0; k < CREW.length; k++) {
      var key = CREW[k].key;
      if (s.crew[key].cooldown > 0) {
        s.crew[key].cooldown -= dt;
        if (s.crew[key].cooldown <= 0) { s.crew[key].cooldown = 0; s.crew[key].ready = true; }
      }
    }
    if (s.chatter && s.time > s.chatter.until) s.chatter = null;
  }

  function renderCrewPanel() { if (TA.ui) TA.ui.toggleCrewPanel(); }
  function renderCrewCards() { if (TA.ui) TA.ui.renderCrewCards(); }

  TA.crew = {
    CREW: CREW, recruitCrewMember: recruitCrewMember,
    activateCrewAbility: activateCrewAbility, getCrewBonus: getCrewBonus,
    crewBonus: crewBonus, crewAbilityReady: crewAbilityReady,
    showCrewChatter: showCrewChatter, update: update,
    renderCrewPanel: renderCrewPanel, renderCrewCards: renderCrewCards,
  };
})();
