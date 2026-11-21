/* crew.js — 3 anggota kru: rekrut, kemampuan aktif/pasif, obrolan radio */
(function () {
  'use strict';
  var TA = window.TA;
  TA.crew = TA.crew || {};

  var CREW = [
    { id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir', cost: 300, minRank: 2, key: 'Z',
      ability: 'Gaspol', desc: 'Boost kecepatan 3 detik + wanted tidak naik selama boost. Pasif: mobil +15% kecepatan & handling.',
      passive: 'Mobil +15% kecepatan maksimum' },
    { id: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik', cost: 250, minRank: 2, key: 'X',
      ability: 'Perbaiki Cepat', desc: 'Armor +25 instan (cooldown 60 dtk). Pasif: armor pulih +1/dtk, mobil pulih +2/dtk, harga toko -20%.',
      passive: 'Armor & mobil pulih pelan, diskon toko 20%' },
    { id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas', cost: 400, minRank: 3, key: 'C',
      ability: 'Ghost', desc: 'Wanted turun 1 bintang, sekali per misi (cooldown 45 dtk). Pasif: wanted cooldown 30% lebih cepat.',
      passive: 'Wanted cooldown 30% lebih cepat' }
  ];
  TA.crew.CREW = CREW;

  var recruitedIds = ['sari', 'budi'];
  var cooldowns = { sari: 0, budi: 0, agus: 0 };
  var ghostUsedThisMission = false;
  var lastMission = 7;
  var gaspolT = 0;
  var chatterT = 0;

  function reset() {
    recruitedIds = ['sari', 'budi'];
    cooldowns = { sari: 0, budi: 0, agus: 0 };
    ghostUsedThisMission = false;
    gaspolT = 0;
  }

  function recruited() { return recruitedIds.slice(); }
  function isRecruited(id) { return recruitedIds.indexOf(id) >= 0; }
  TA.crew.recruited = recruited;
  TA.crew.isRecruited = isRecruited;

  function recruitCrewMember(id) {
    var c = null;
    for (var i = 0; i < CREW.length; i++) if (CREW[i].id === id) c = CREW[i];
    if (!c) return false;
    if (isRecruited(id)) { TA.ui.showToast(c.name + ' sudah direkrut.'); return false; }
    if (TA.career.getRank().level < c.minRank) {
      TA.ui.showToast(c.name + ' butuh karier Tingkat ' + c.minRank + ' (' + c.role + ').');
      return false;
    }
    var price = c.cost * 17000;
    if (TA.S.money < price) { TA.ui.showToast('Rekrut ' + c.name + ' butuh ' + TA.fmtRp(price) + '.'); return false; }
    TA.S.money -= price;
    recruitedIds.push(id);
    TA.ui.showToast(c.name + ' "' + c.nick + '" bergabung dengan kru! Kemampuan: ' + c.ability + ' (tombol ' + c.key + ').');
    showChatter(c.name, 'Aku di timmu sekarang, Raka. Jangan kecewakan aku.');
    TA.ui.renderCrewCards();
    TA.ui.renderCrewPanel();
    return true;
  }
  TA.crew.recruitCrewMember = recruitCrewMember;

  function crewBonus() {
    var b = { speed: 0, armorRegen: 0, carRepair: 0, wantedCooldown: 0, discount: 0 };
    if (isRecruited('sari')) b.speed += 0.15;
    if (isRecruited('budi')) { b.armorRegen += 1; b.carRepair += 2; b.discount += 0.20; }
    if (isRecruited('agus')) b.wantedCooldown += 0.30;
    if (gaspolT > 0) b.speed += 0.6;
    return b;
  }
  TA.crew.getCrewBonus = crewBonus;

  function crewAbilityReady(id) {
    if (!isRecruited(id)) return { ready: false, label: 'BELUM DIREKRUT' };
    if (cooldowns[id] > 0) return { ready: false, label: Math.ceil(cooldowns[id]) + ' dtk' };
    if (id === 'agus' && ghostUsedThisMission) return { ready: false, label: 'SEKALI/MISI' };
    return { ready: true, label: 'READY' };
  }
  TA.crew.crewAbilityReady = crewAbilityReady;

  function activateCrewAbility(key) {
    var id = null;
    if (key === 'z') id = 'sari';
    else if (key === 'x') id = 'budi';
    else if (key === 'c' || key === 'q') id = 'agus';
    if (!id) return;
    var c = null;
    for (var i = 0; i < CREW.length; i++) if (CREW[i].id === id) c = CREW[i];
    if (!c || !isRecruited(id)) {
      TA.ui.showToast(c ? c.name + ' belum direkrut — rekrut di bengkel Pak Amir (V).' : '');
      return;
    }
    var st = crewAbilityReady(id);
    if (!st.ready) { TA.ui.showToast(c.ability + ' belum siap: ' + st.label + '.'); return; }
    if (id === 'sari') {
      if (!TA.S.inCar) { TA.ui.showToast('Gaspol hanya bisa di dalam mobil!'); return; }
      gaspolT = 3;
      cooldowns.sari = 45;
      TA.ui.showToast('SARI: Gaspol! Boost 3 detik — wanted tidak naik!');
      showChatter('SARI', 'Gaspol! Pegangan, Raka!');
    } else if (id === 'budi') {
      TA.S.armor = Math.min(TA.career.maxArmor(), TA.S.armor + 25);
      cooldowns.budi = 60;
      TA.ui.showToast('BUDI: Perbaiki Cepat! Armor +25.');
      showChatter('BUDI', 'Armor sudah kutambal. Jangan ditembak lagi, ya?');
    } else if (id === 'agus') {
      if (ghostUsedThisMission) { TA.ui.showToast('Ghost hanya sekali per misi.'); return; }
      ghostUsedThisMission = true;
      cooldowns.agus = 45;
      TA.police.setWanted(Math.max(0, TA.S.wanted - 1));
      TA.ui.showToast('AGUS: Ghost! Wanted turun 1 bintang.');
      showChatter('AGUS', '...sistem mereka buta 30 detik. Jalan.');
    }
    TA.ui.renderCrewCards();
  }
  TA.crew.activateCrewAbility = activateCrewAbility;

  function showChatter(name, text) {
    TA.ui.showCrewChatter(name, text);
    chatterT = 5;
  }
  TA.crew.showChatter = showChatter;

  function update(dt) {
    for (var k in cooldowns) {
      if (cooldowns[k] > 0) cooldowns[k] -= dt;
    }
    if (gaspolT > 0) gaspolT -= dt;
    if (chatterT > 0) {
      chatterT -= dt;
      if (chatterT <= 0) TA.ui.hideCrewChatter();
    }
    if (TA.S.mission !== lastMission) {
      lastMission = TA.S.mission;
      ghostUsedThisMission = false;
    }
    // obrolan kru otomatis saat peristiwa
    if (TA.S.wanted >= 3 && Math.random() < dt * 0.02 && isRecruited('sari')) {
      showChatter('SARI', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
    }
  }

  TA.crew.reset = reset;
  TA.crew.update = update;
  TA.crew.getCrewBonus = crewBonus;
  TA.crew.gaspolActive = function () { return gaspolT > 0; };
})();
