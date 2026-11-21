/* TELUK ARUNIKA — crew.js: 3 kru, kemampuan pasif/aktif, panel kru, obrolan radio */
(function () {
  'use strict';
  var TA = window.TA;

  TA.CREW = [
    {
      id: 'sari', name: 'Sari', nick: 'Si Gesit', role: 'Sopir', price: 300, key: 'Z', ability: 'Gaspol',
      cooldown: 45, minRank: 2,
      desc: 'Mobil +15% kecepatan maksimum & handling lebih responsif. Aktif (Z): boost 3 detik, wanted tidak naik selama boost.'
    },
    {
      id: 'budi', name: 'Budi', nick: 'Montir', role: 'Mekanik', price: 250, key: 'X', ability: 'Perbaiki Cepat',
      cooldown: 60, minRank: 2,
      desc: 'Armor pulih +1/dtk (s.d. 50), mobil pulih +2/dtk, biaya perbaikan & armor -20%. Aktif (X): armor +25 instan.'
    },
    {
      id: 'agus', name: 'Agus', nick: 'Si Pendiam', role: 'Peretas', price: 400, key: 'C', ability: 'Ghost',
      cooldown: 0, minRank: 3,
      desc: 'Wanted cooldown 30% lebih cepat. Aktif (C): wanted turun 1 bintang, sekali per misi.'
    }
  ];

  TA.crew = {
    boostUntil: 0,
    chatterQueue: [],

    getMember: function (id) {
      for (var i = 0; i < TA.CREW.length; i++) if (TA.CREW[i].id === id) return TA.CREW[i];
      return null;
    },
    isRecruited: function (id) { return !!TA.state.crew[id]; },

    recruitCrewMember: function (id) {
      var s = TA.state;
      var m = this.getMember(id);
      if (!m || s.crew[id]) return false;
      if (s.rank < m.minRank) { TA.ui.flashWeapon(m.name + ' butuh Tingkat ' + m.minRank + ' (' + TA.RANKS[m.minRank - 1].name + ')'); return false; }
      if (s.money < m.price) { TA.ui.flashWeapon('Uang tidak cukup untuk merekrut ' + m.name + ' ($' + m.price + ')'); return false; }
      s.money -= m.price;
      s.crew[id] = true;
      TA.audio.buySound();
      this.showCrewChatter(m.name.toUpperCase(), 'Aku ikut, Raka. ' + m.ability + ' siap dipakai!');
      TA.ui.renderCrewPanel();
      TA.ui.renderCrewCards();
      return true;
    },

    activeAbilityKey: function () {
      // Q: pakai kemampuan kru pertama yang siap (prioritas Sari > Budi > Agus)
      var order = ['sari', 'budi', 'agus'];
      for (var i = 0; i < order.length; i++) {
        if (TA.state.crew[order[i]] && this.crewAbilityReady(order[i])) return order[i];
      }
      return null;
    },

    crewAbilityReady: function (id) {
      if (!TA.state.crew[id]) return false;
      if (id === 'agus') return !TA.state.ghostUsedThisMission && TA.state.wanted > 0;
      return TA.state.crewCooldown[id] <= 0;
    },

    activateCrewAbility: function (id) {
      var s = TA.state;
      if (!id || !s.crew[id]) return false;
      var m = this.getMember(id);
      if (id === 'sari') {
        if (s.crewCooldown.sari > 0) return false;
        if (!s.inCar) { TA.ui.flashWeapon('Gaspol hanya bisa di dalam mobil'); return false; }
        s.crewCooldown.sari = m.cooldown;
        this.boostUntil = TA.time.elapsed + 3;
        TA.player.speed *= 1.4;
        this.showCrewChatter('SARI', 'Gaspol!');
        TA.audio.boostSound();
        return true;
      }
      if (id === 'budi') {
        if (s.crewCooldown.budi > 0) return false;
        s.crewCooldown.budi = m.cooldown;
        s.armor = Math.min(s.maxArmor, s.armor + 25);
        this.showCrewChatter('BUDI', 'Armor diperbaiki +25. Mesin aman, Raka.');
        TA.audio.repairSound();
        return true;
      }
      if (id === 'agus') {
        if (s.ghostUsedThisMission) { TA.ui.flashWeapon('Ghost sudah dipakai di misi ini'); return false; }
        if (s.wanted <= 0) { TA.ui.flashWeapon('Tidak ada wanted untuk dihapus'); return false; }
        s.ghostUsedThisMission = true;
        TA.police.setWanted(s.wanted - 1, 'ghost');
        this.showCrewChatter('AGUS', 'Ghost aktif. Satu bintang hilang dari radar mereka.');
        TA.audio.ghostSound();
        return true;
      }
      return false;
    },

    getCrewBonus: function () {
      var s = TA.state;
      var b = { speedMul: 1, handling: 1, armorRegen: 0, carRegen: 0, discount: 0, wantedCooldownMul: 1 };
      if (s.crew.sari) { b.speedMul = 1.15; b.handling = 1.25; }
      if (s.crew.budi) { b.armorRegen = 1; b.carRegen = 2; b.discount = 0.2; }
      if (s.crew.agus) { b.wantedCooldownMul *= 0.7; }
      if (s.rank >= 3) b.discount = Math.max(b.discount, 0.15);
      if (s.rank >= 5) b.wantedCooldownMul *= 0.8;
      if (TA.time.elapsed < this.boostUntil) { b.speedMul *= 1.35; }
      return b;
    },

    crewBonus: function () { return this.getCrewBonus(); },

    showCrewChatter: function (name, text) {
      this.chatterQueue.push({ name: name, text: text });
      if (this.chatterQueue.length === 1) this.displayNextChatter();
    },
    displayNextChatter: function () {
      var q = this.chatterQueue[0];
      if (!q) return;
      TA.ui.showChatter(q.name, q.text);
      var self = this;
      setTimeout(function () {
        self.chatterQueue.shift();
        if (self.chatterQueue.length > 0) self.displayNextChatter();
        else TA.ui.hideChatter();
      }, 4200);
    },

    mission10CrewLines: function () {
      var s = TA.state;
      var lines = [];
      if (s.crew.sari) lines.push({ who: 'SARI', text: 'Aku di sayap kiri. Kalau Darma kabur lewat dermaga, aku yang potong jalannya!' });
      if (s.crew.budi) lines.push({ who: 'BUDI', text: 'Mobil sudah kupasangi pelat baja. Maju saja, Raka — aku yang jaga belakang.' });
      if (s.crew.agus) lines.push({ who: 'AGUS', text: 'CCTV pelabuhan sudah kumatiin. Mereka buta selama sepuluh menit. Cukup, kan?' });
      if (lines.length > 0) this.showDialogueLines(lines);
    },
    showDialogueLines: function (lines) {
      var all = lines.slice();
      TA.missions.showDialogue(all, function () { TA.state.mode = 'playing'; });
    },

    renderCrewPanel: function () { TA.ui.renderCrewPanel(); },
    renderCrewCards: function () { TA.ui.renderCrewCards(); },

    update: function (dt) {
      var s = TA.state;
      for (var k in s.crewCooldown) {
        if (s.crewCooldown[k] > 0) s.crewCooldown[k] -= dt;
      }
      // Selama boost Gaspol, wanted tidak naik
      if (TA.time.elapsed < this.boostUntil) {
        s.wantedHeat = Math.min(s.wantedHeat, 50);
      }
    }
  };
})();
