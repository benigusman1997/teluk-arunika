/* TELUK ARUNIKA — career.js: 5 tingkat karier, XP, perk, save/load */
(function () {
  'use strict';
  var TA = window.TA;

  TA.RANKS = [
    { level: 1, name: 'Anak Baru', xp: 0, perk: 'Tanpa perk.' },
    { level: 2, name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru (Sari & Budi).' },
    { level: 3, name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% di semua toko + buka rekrut Agus.' },
    { level: 4, name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25.' },
    { level: 5, name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar tampil di layar akhir.' }
  ];

  TA.career = {
    SAVE_PREFIX: 'teluk-arunika-save-',

    getRank: function (xp) {
      var x = xp === undefined ? TA.state.xp : xp;
      var r = TA.RANKS[0];
      for (var i = 0; i < TA.RANKS.length; i++) if (x >= TA.RANKS[i].xp) r = TA.RANKS[i];
      return r;
    },
    nextRank: function () {
      var r = this.getRank();
      if (r.level >= 5) return null;
      return TA.RANKS[r.level];
    },
    rankProgress: function () {
      var r = this.getRank();
      var next = this.nextRank();
      if (!next) return { cur: r.xp, need: r.xp, pct: 1 };
      var span = next.xp - r.xp;
      return { cur: TA.state.xp, need: next.xp, pct: TA.clamp((TA.state.xp - r.xp) / span, 0, 1) };
    },

    addXP: function (n, reason) {
      var s = TA.state;
      var before = this.getRank();
      s.xp += n;
      var after = this.getRank();
      s.rank = after.level;
      if (after.level > before.level) {
        this.checkRankUp(before, after);
      }
      return s.xp;
    },

    checkRankUp: function (before, after) {
      this.applyRankPerks();
      TA.ui.showRankUpBanner('NAIK TINGKAT: ' + after.name + '!');
      TA.audio.rankUpSound();
      TA.crew.showCrewChatter('PAK AMIR', 'Kau naik tingkat, Nak. ' + after.name + '! ' + after.perk);
    },

    applyRankPerks: function () {
      var s = TA.state;
      var r = this.getRank();
      s.rank = r.level;
      if (r.level >= 4) {
        s.maxArmor = 150;
        s.maxHp = 125;
        if (s.hp > s.maxHp) s.hp = s.maxHp;
      } else {
        s.maxArmor = 100;
        s.maxHp = 100;
      }
    },

    update: function (dt) { /* XP pasif: tidak ada; semua XP dari aksi */ },

    saveData: function () {
      var s = TA.state;
      return {
        version: 3, money: s.money, debt: s.debt, day: s.day, timeMin: s.timeMin,
        weather: s.weather, hp: s.hp, maxHp: s.maxHp, armor: s.armor, maxArmor: s.maxArmor,
        xp: s.xp, rank: s.rank, crew: s.crew,
        missionIndex: s.missionIndex, missionStage: s.missionStage,
        missionDone: s.missionDone, branchChoice: s.branchChoice,
        weaponsOwned: s.weaponsOwned, weapon: s.weapon,
        districts: TA.DISTRICTS.map(function (d) { return { id: d.id, standing: d.standing }; }),
        stats: s.stats,
        playerX: TA.player.x, playerZ: TA.player.z,
        savedAt: new Date().toISOString()
      };
    },

    saveGame: function (slot) {
      try {
        localStorage.setItem(this.SAVE_PREFIX + slot, JSON.stringify(this.saveData()));
        TA.state.saveNoticeUntil = TA.time.elapsed + 1.6;
        return true;
      } catch (e) { return false; }
    },

    loadGame: function (slot) {
      try {
        var raw = localStorage.getItem(this.SAVE_PREFIX + slot);
        if (!raw) return false;
        var d = JSON.parse(raw);
        var s = TA.state;
        s.money = d.money; s.debt = d.debt; s.day = d.day; s.timeMin = d.timeMin;
        s.weather = d.weather || 'rain';
        s.hp = d.hp; s.maxHp = d.maxHp || 100; s.armor = d.armor || 0; s.maxArmor = d.maxArmor || 100;
        s.xp = d.xp || 0; s.rank = d.rank || 1; s.crew = d.crew || { sari: false, budi: false, agus: false };
        s.missionIndex = d.missionIndex || 0; s.missionStage = d.missionStage || 0;
        s.missionDone = d.missionDone || []; s.branchChoice = d.branchChoice || null;
        s.weaponsOwned = d.weaponsOwned || [true, false, false, false];
        s.weapon = d.weapon || 0;
        s.stats = d.stats || s.stats;
        if (d.districts) d.districts.forEach(function (sd) {
          for (var i = 0; i < TA.DISTRICTS.length; i++) if (TA.DISTRICTS[i].id === sd.id) TA.DISTRICTS[i].standing = sd.standing;
        });
        TA.player.spawnPlayer(d.playerX || 0, d.playerZ || 0);
        TA.world.setWeather(s.weather);
        TA.world.setTimeOfDay(s.timeMin / 60);
        s.missionActive = true;
        this.applyRankPerks();
        return true;
      } catch (e) { return false; }
    },

    hasSave: function (slot) {
      try { return !!localStorage.getItem(this.SAVE_PREFIX + slot); } catch (e) { return false; }
    }
  };
})();
