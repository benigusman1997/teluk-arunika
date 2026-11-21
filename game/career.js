/* career.js — 5 tingkat karier, XP, perk, suasana distrik, statistik karier */
(function () {
  'use strict';
  var TA = window.TA;
  TA.career = TA.career || {};

  var RANKS = [
    { level: 1, name: 'Anak Baru', xp: 0, perk: 'Tanpa perk' },
    { level: 2, name: 'Sopir Andal', xp: 150, perk: 'Buka rekrutmen kru (Sari & Budi)' },
    { level: 3, name: 'Penguasa Jalanan', xp: 400, perk: 'Diskon 15% semua toko + buka rekrut Agus' },
    { level: 4, name: 'Raja Teluk', xp: 800, perk: 'Kapasitas armor +50, HP maksimum +25' },
    { level: 5, name: 'Legenda Arunika', xp: 1500, perk: 'Wanted cooldown 20% lebih cepat + gelar di layar akhir' }
  ];
  TA.career.RANKS = RANKS;

  var DISTRICTS = [
    { name: 'PELABUHAN', standing: 58 }, { name: 'PASAR', standing: 47 },
    { name: 'GANG NEON', standing: 52 }, { name: 'PANTAI', standing: 71 },
    { name: 'TOL LAYANG', standing: 64 }, { name: 'PULAU ABU', standing: 33 }
  ];
  TA.career.DISTRICTS = DISTRICTS;

  function reset() { /* standing dipertahankan dari state awal */ }

  function getRank() {
    var xp = TA.S.xp;
    var cur = RANKS[0];
    var next = null;
    for (var i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].xp) cur = RANKS[i];
      else { next = RANKS[i]; break; }
    }
    return { level: cur.level, name: cur.name, xp: cur.xp, next: next, perk: cur.perk };
  }
  TA.career.getRank = getRank;

  function addXP(n, reason) {
    var before = getRank().level;
    TA.S.xp += n;
    var after = getRank().level;
    if (after > before) {
      checkRankUp(after);
    }
    TA.ui.renderRankRow();
  }
  TA.career.addXP = addXP;

  function checkRankUp(level) {
    var r = RANKS[level - 1];
    TA.ui.showRankUpBanner('NAIK TINGKAT: ' + r.name + '! — ' + r.perk);
    applyRankPerks();
  }
  TA.career.checkRankUp = checkRankUp;

  function applyRankPerks() {
    var lvl = getRank().level;
    if (lvl >= 4) {
      TA.S.hp = Math.min(maxHP(), TA.S.hp);
    }
  }
  TA.career.applyRankPerks = applyRankPerks;

  function maxArmor() {
    return getRank().level >= 4 ? 150 : 100;
  }
  TA.career.maxArmor = maxArmor;

  function maxHP() {
    return getRank().level >= 4 ? 125 : 100;
  }
  TA.career.maxHP = maxHP;

  function wantedCooldownBonus() {
    return getRank().level >= 5 ? 0.20 : 0;
  }
  TA.career.wantedCooldownBonus = wantedCooldownBonus;

  function shopDiscount() {
    var d = getRank().level >= 3 ? 0.15 : 0;
    d += TA.crew.getCrewBonus().discount;
    return Math.min(0.35, d);
  }
  TA.career.shopDiscount = shopDiscount;

  function updateDistrictStanding(name, delta) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      if (DISTRICTS[i].name === name) {
        DISTRICTS[i].standing = TA.clamp(DISTRICTS[i].standing + delta, 0, 100);
        return DISTRICTS[i].standing;
      }
    }
    return 50;
  }
  TA.career.updateDistrictStanding = updateDistrictStanding;

  function districtStanding(name) {
    for (var i = 0; i < DISTRICTS.length; i++) {
      if (DISTRICTS[i].name === name) return DISTRICTS[i].standing;
    }
    return 50;
  }
  TA.career.districtStanding = districtStanding;

  function districtsHeld() {
    var n = 0;
    for (var i = 0; i < DISTRICTS.length; i++) if (DISTRICTS[i].standing >= 70) n++;
    return n;
  }
  TA.career.districtsHeld = districtsHeld;

  function careerStats() {
    var r = getRank();
    return [
      { label: 'UANG', value: TA.fmtRp(TA.S.money) },
      { label: 'RESPECT', value: String(TA.S.respect) },
      { label: 'TINGKAT', value: 'TINGKAT ' + r.level + ' · ' + r.name + ' — ' + TA.S.xp + '/' + (r.next ? r.next.xp : 'MAX') + ' XP' },
      { label: 'DISTRIK DIKUASAI', value: districtsHeld() + '/6' },
      { label: 'KOIN ARUNIKA', value: TA.S.coins + '/12' },
      { label: 'LOMPATAN', value: TA.S.jumps + '/5' },
      { label: 'BALAPAN DIMENANGKAN', value: String(TA.S.racesWon) },
      { label: 'MOBIL DICURI', value: String(TA.S.carsStolen) },
      { label: 'WANTED TERTINGGI', value: TA.S.bestWanted + ' BINTANG' },
      { label: 'SAFEHOUSE', value: TA.S.safehouses + '/3' },
      { label: 'MISI SELESAI', value: TA.S.missionDone.filter(Boolean).length + '/10' },
      { label: 'HARI', value: 'Hari ' + TA.S.day + ' / 7' }
    ];
  }
  TA.career.careerStats = careerStats;

  function update(dt) {
    // suasana distrik turun pelan saat wanted tinggi (kekacauan)
    if (TA.S.wanted >= 4 && Math.random() < dt * 0.05) {
      var d = TA.world.districtAt(TA.S.px, TA.S.py);
      updateDistrictStanding(d.name, -1);
    }
  }

  TA.career.reset = reset;
  TA.career.update = update;
})();
