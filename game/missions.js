/* missions.js — 10 operasi naratif, 3 bab, kontrak sindikat, perampokan bank 7 tahap */
(function () {
  'use strict';
  var TA = window.TA;
  TA.missions = TA.missions || {};

  var ACTS = [
    { name: 'BAB I', title: 'Utang', from: 1, to: 3 },
    { name: 'BAB II', title: 'Sindikat', from: 4, to: 7 },
    { name: 'BAB III', title: 'Fajar', from: 8, to: 10 }
  ];
  var ACT_NAMES = { 'BAB I': 'Utang', 'BAB II': 'Sindikat', 'BAB III': 'Fajar' };
  TA.missions.ACTS = ACTS;
  TA.missions.ACT_NAMES = ACT_NAMES;

  var SYNDICATES = ['DARMA WIYAYA', 'GENG KERONO', 'KELO ARMS'];
  TA.missions.SYNDICATES = SYNDICATES;

  var MISSIONS = [
    { n: 1, name: 'Taksi Terakhir', act: 'BAB I', syndicate: 'DARMA WIYAYA', reward: 150,
      stages: ['Jemput Penumpang', 'Antar ke Pasar Senja', 'Tagih Ongkos'],
      objective: 'Antar penumpang ke Pasar Senja.',
      next: 'Jemput penumpang di dermaga',
      dialogue: [['RAKA', 'Satu penumpang lagi, lalu aku bisa bayar cicilan hari ini.'], ['PAK AMIR', 'Hati-hati, Nak. Darma tidak sabar menunggu.']] },
    { n: 2, name: 'Cat Emas', act: 'BAB I', syndicate: 'GENG KERONO', reward: 300,
      stages: ['Ambil Cat di Gudang', 'Cat Ulang Mobil', 'Antar ke Gang Neon'],
      objective: 'Cat ulang mobil curian jadi emas, antar ke Gang Neon.',
      next: 'Ambil kaleng cat di gudang Pelabuhan',
      dialogue: [['KERONO', 'Mobil itu harus emas sebelum senja. Jangan tanya kenapa.'], ['RAKA', 'Emas? Baiklah. Aku cuma sopir.']] },
    { n: 3, name: 'Utang Darah', act: 'BAB I', syndicate: 'DARMA WIYAYA', reward: 500,
      stages: ['Temui Darma', 'Tagih Utang Kecil', 'Pilih: Bayar atau Khianat'],
      objective: 'Hadapi Darma: bayar $500 atau khianati dia.',
      next: 'Masuk ke kantor Darma di Pelabuhan',
      dialogue: [['DARMA', 'Tiga hari lagi, Raka. Bengkel ayahmu taruhannya.'], ['RAKA', 'Aku akan bayar. Dengan caraku sendiri.']] },
    { n: 4, name: 'Paket Senja', act: 'BAB II', syndicate: 'KELO ARMS', reward: 600,
      stages: ['Ambil Paket', 'Hindari Patroli', 'Antar ke Pantai'],
      objective: 'Antar paket Kelo Arms ke kafe Pantai Arunika.',
      next: 'Ambil paket di gudang Kelo Arms',
      dialogue: [['KELO', 'Paket ini lebih mahal dari mobilmu. Jangan dibuka.'], ['RAKA', 'Aku tidak buka. Aku cuma antar.']] },
    { n: 5, name: 'Jembatan Bara', act: 'BAB II', syndicate: 'GENG KERONO', reward: 700,
      stages: ['Seberangi Jembatan Abu', 'Ambil Barang', 'Kembali Sebelum Fajar'],
      objective: 'Seberangi jembatan ke Pulau Abu dan ambil barangnya.',
      next: 'Tuju Jembatan Abu di timur',
      dialogue: [['SARI', 'Jembatan itu panas, Raka. Bara di bawahnya masih menyala.'], ['RAKA', 'Kalau begitu kita ngebut.']] },
    { n: 6, name: 'Gudang Kerono', act: 'BAB II', syndicate: 'GENG KERONO', reward: 900,
      stages: ['Masuk Gudang', 'Lumpuhkan Penjaga', 'Bakar Bukti', 'Kabur Lewat Tol'],
      objective: 'Serbu gudang Kerono, bakar bukti, kabur lewat Tol Layang.',
      next: 'Masuk lewat pintu samping gudang',
      dialogue: [['AGUS', 'Aku matikan kameranya 30 detik. Itu saja waktumu.'], ['RAKA', 'Cukup. Ayo masuk.']] },
    { n: 7, name: 'Perampokan Bank Arunika', act: 'BAB II', syndicate: 'DARMA WIYAYA', reward: 25000,
      stages: ['Sampai di Bank Arunika', 'Lumpuhkan Alarm', 'Habisi Penjaga Bank', 'Bobol Brankas', 'Ambil Uang', 'Kabur dari Bank', 'Hilangkan Jejak'],
      objective: 'Rampok Bank Arunika: 9 penjaga, brankas, lalu kabur.',
      next: 'Tuju plaza Bank Arunika',
      dialogue: [['DARMA', 'Bank itu menyimpan uangku. Ambil semuanya, Raka. Jangan sampai ada yang hidup bercerita.'], ['SARI', 'Van sudah siap di depan. Sembilan penjaga, Raka. Sembilan.'], ['RAKA', 'Kalau begitu, jangan ada yang meleset.']] },
    { n: 8, name: 'Abu dan Bara', act: 'BAB III', syndicate: 'KELO ARMS', reward: 800,
      stages: ['Mendarat di Pulau Abu', 'Cari Senjata di Kawah', 'Hadapi Penjaga Kawah', 'Kabur dari Pulau'],
      objective: 'Ambil kiriman senjata Kelo Arms di kawah Pulau Abu.',
      next: 'Seberangi Jembatan Abu ke kawah',
      dialogue: [['KELO', 'Senjata itu di kawah. Ambil sebelum orang Darma sampai.'], ['BUDI', 'Mesin mobilmu sudah kusiapkan. Jangan sampai meledak di tengah jalan.']] },
    { n: 9, name: 'Jalan Pulang', act: 'BAB III', syndicate: 'DARMA WIYAYA', reward: 1200,
      stages: ['Kumpulkan Kru', 'Serbu Markas Kecil', 'Rebut Catatan Utang'],
      objective: 'Rebut catatan utang Darma dari markas kecilnya.',
      next: 'Kumpulkan kru di bengkel Pak Amir',
      dialogue: [['PAK AMIR', 'Catatan itu bukti utangmu, Nak. Ambil kembali.'], ['RAKA', 'Besok, semua selesai.']] },
    { n: 10, name: 'Operasi Terakhir: Fajar di Pelabuhan', act: 'BAB III', syndicate: 'DARMA WIYAYA', reward: 2000,
      stages: ['Serbu Gudang Terakhir', 'Gelombang 1: Kontainer', 'Gelombang 2: Dermaga', 'Pilihan Akhir: Tangkap Darma'],
      objective: 'Serbu gudang terakhir Darma di fajar hari ke-7.',
      next: 'Tuju gudang terakhir di Pelabuhan',
      dialogue: [['RAKA', 'Tujuh hari. Ini hari terakhir.'], ['DARMA', 'Kamu datang juga, sopir taksi.'], ['SARI', 'Kami di belakangmu, Raka. Sampai akhir.']] }
  ];
  TA.missions.MISSIONS = MISSIONS;

  var BANK_HEIST_STAGES = [
    'Sampai di Bank Arunika', 'Lumpuhkan Alarm', 'Habisi Penjaga Bank',
    'Bobol Brankas', 'Ambil Uang', 'Kabur dari Bank', 'Hilangkan Jejak'
  ];
  TA.missions.BANK_HEIST_STAGES = BANK_HEIST_STAGES;

  var enemies = [];
  var dialogueQueue = [];
  var dialogueIdx = 0;
  var stageT = 0;
  var alarmHold = 0;
  var vaultHold = 0;
  var exportJob = null;

  function reset() {
    enemies = [];
    dialogueQueue = [];
    dialogueIdx = 0;
    stageT = 0;
    alarmHold = 0;
    vaultHold = 0;
    exportJob = null;
  }

  function getActForMission(n) {
    for (var i = 0; i < ACTS.length; i++) {
      if (n >= ACTS[i].from && n <= ACTS[i].to) return ACTS[i];
    }
    return ACTS[0];
  }
  TA.missions.getActForMission = getActForMission;

  function mission(n) { return MISSIONS[n - 1]; }
  TA.missions.mission = mission;

  function getMissionContract(n) {
    var m = mission(n);
    return 'KONTRAK: ' + m.syndicate + ' — ' + TA.fmtDollar(m.reward);
  }
  TA.missions.getMissionContract = getMissionContract;

  function missionStatus(n) {
    if (TA.S.missionDone[n - 1]) return 'DONE';
    if (TA.S.mission === n) return 'NEXT';
    return 'LOCKED';
  }
  TA.missions.missionStatus = missionStatus;

  function startMission(n) {
    var m = mission(n);
    TA.S.mission = n;
    TA.S.stage = 1;
    TA.S.stageTotal = m.stages.length;
    TA.S.guardsKilled = 0;
    TA.S.guardsTotal = n === 7 ? 9 : 0;
    if (n === 7) startBankHeist();
    if (n === 10) spawnWave(1);
    showMissionIntro(n);
    TA.career.updateDistrictStanding(TA.world.districtAt(TA.S.px, TA.S.py).name, 2);
  }

  function startBankHeist() {
    TA.S.stage = 1;
    TA.S.stageTotal = 7;
    TA.S.guardsKilled = 0;
    TA.S.guardsTotal = 9;
    spawnBankGuards();
    TA.S.px = 2060; TA.S.py = 1560;
    TA.police.setWanted(0);
    TA.S.incident = '—';
    TA.ui.showToast('PERAMPOKAN BANK ARUNIKA — 7 tahap. Van getaway siap di depan bank.');
  }
  TA.missions.startBankHeist = startBankHeist;

  function spawnBankGuards() {
    enemies = [];
    var B = TA.world.BANK;
    var rnd = TA.seededRandom(777);
    for (var i = 0; i < 9; i++) {
      enemies.push({
        x: B.x + 20 + rnd() * (B.w - 40),
        y: B.plazaY - 30 + rnd() * 160,
        hp: 50, alive: true, guard: true, shootT: 1 + rnd() * 2
      });
    }
  }

  function spawnWave(w) {
    enemies = [];
    var rnd = TA.seededRandom(1000 + w);
    var count = 4 + w * 2;
    for (var i = 0; i < count; i++) {
      enemies.push({
        x: 300 + rnd() * 900, y: 900 + rnd() * 800,
        hp: 50, alive: true, guard: false, shootT: 1 + rnd() * 2
      });
    }
    TA.ui.showToast('GELOMBANG ' + w + ' — ' + count + ' musuh berlindung di balik kontainer!');
  }

  function getBankGuardsRemaining() {
    var left = 0;
    for (var i = 0; i < enemies.length; i++) if (enemies[i].alive && enemies[i].guard) left++;
    return left;
  }
  TA.missions.getBankGuardsRemaining = getBankGuardsRemaining;

  function showMissionIntro(n) {
    var m = mission(n);
    var act = getActForMission(n);
    TA.S.screen = 'intro';
    TA.ui.showMissionIntro(n, m, act);
  }
  TA.missions.showMissionIntro = showMissionIntro;

  function showDialogue(lines) {
    dialogueQueue = lines;
    dialogueIdx = 0;
    TA.S.screen = 'dialogue';
    TA.ui.showDialogue(lines[0][0], lines[0][1]);
  }
  TA.missions.showDialogue = showDialogue;

  function advanceDialogue() {
    if (TA.S.screen === 'intro') {
      TA.ui.hideMissionIntro();
      var m = mission(TA.S.mission);
      showDialogue(m.dialogue);
      return;
    }
    if (TA.S.screen === 'dialogue') {
      dialogueIdx++;
      if (dialogueIdx >= dialogueQueue.length) {
        TA.ui.hideDialogue();
        TA.S.screen = 'playing';
        TA.ui.showHUD();
      } else {
        TA.ui.showDialogue(dialogueQueue[dialogueIdx][0], dialogueQueue[dialogueIdx][1]);
      }
    }
  }
  TA.missions.advanceDialogue = advanceDialogue;

  function startMissionStage(n, stage) {
    TA.S.mission = n;
    TA.S.stage = stage;
    var m = mission(n);
    TA.S.stageTotal = m.stages.length;
    TA.ui.renderMissionBanner();
  }
  TA.missions.startMissionStage = startMissionStage;

  function advanceStage() {
    var m = mission(TA.S.mission);
    if (TA.S.stage < m.stages.length) {
      TA.S.stage++;
      TA.ui.renderMissionBanner();
      TA.ui.showToast('TAHAP ' + TA.S.stage + '/' + m.stages.length + ' — ' + m.stages[TA.S.stage - 1]);
      if (TA.S.mission === 7 && TA.S.stage === 3) spawnBankGuards();
      if (TA.S.mission === 7 && TA.S.stage === 6) TA.police.setWanted(4, 'PERAMPOKAN BANK');
      if (TA.S.mission === 10 && TA.S.stage === 2) spawnWave(2);
      if (TA.S.mission === 10 && TA.S.stage === 3) spawnWave(3);
    } else {
      completeMission(TA.S.mission);
    }
  }
  TA.missions.advanceStage = advanceStage;

  function completeMission(n) {
    var m = mission(n);
    TA.S.missionDone[n - 1] = true;
    TA.S.money += m.reward * 17000;
    TA.career.addXP(100, 'Misi ' + n + ' selesai');
    TA.career.updateDistrictStanding(TA.world.districtAt(TA.S.px, TA.S.py).name, 8);
    TA.ui.showToast('MISI ' + n + ' SELESAI — ' + m.name + ' · +' + TA.fmtDollar(m.reward) + ' · +100 XP');
    TA.crew.showChatter('SARI', 'Misi selesai! Kamu luar biasa, Raka.');
    if (n === 10) {
      TA.S.screen = 'win';
      TA.ui.showEndScreen();
      return;
    }
    if (n === 3) {
      // cabang hari ke-5: bayar Darma $500 atau khianati
      TA.ui.showToast('CABANG: Bayar Darma $500, atau khianati dia dan simpan uangnya? (Misi 4 menentukan)');
    }
    var next = Math.min(10, n + 1);
    startMission(next);
  }
  TA.missions.completeMission = completeMission;

  function checkObjective() {
    // objektif selesai bila pemain mencapai target
    var tgt = currentTarget();
    if (!tgt) return;
    if (TA.dist(TA.S.px, TA.S.py, tgt.x, tgt.y) < 70) advanceStage();
  }

  function currentTarget() {
    var m = mission(TA.S.mission);
    var B = TA.world.BANK;
    if (TA.S.mission === 7) {
      if (TA.S.stage === 1) return { x: B.x + B.w / 2, y: B.plazaY + 60 };
      if (TA.S.stage === 2) return { x: B.x + 60, y: B.y + 60 };
      if (TA.S.stage === 3) return { x: B.x + B.w / 2, y: B.plazaY + 80 };
      if (TA.S.stage === 4) return { x: B.x + 65, y: B.y + B.h - 30 };
      if (TA.S.stage === 5) return { x: B.x + 65, y: B.y + B.h - 30 };
      if (TA.S.stage === 6) return { x: B.x + B.w / 2, y: B.plazaY + 200 };
      if (TA.S.stage === 7) return { x: 900, y: 1500 };
    }
    if (TA.S.mission === 8) return { x: 3750, y: 2300 };
    if (TA.S.mission === 10) return { x: 700, y: 1200 };
    if (TA.S.race && TA.S.race.active) return TA.S.race.checkpoints[TA.S.race.cp];
    return { x: 2400, y: 1200 };
  }
  TA.missions.currentTarget = currentTarget;

  function getObjectiveDistance() {
    var tgt = currentTarget();
    if (!tgt) return 0;
    return Math.round(TA.dist(TA.S.px, TA.S.py, tgt.x, tgt.y) / 10);
  }
  TA.missions.getObjectiveDistance = getObjectiveDistance;

  function updateBankHeist(dt) {
    if (TA.S.mission !== 7) return;
    var B = TA.world.BANK;
    if (TA.S.stage === 1) {
      if (TA.dist(TA.S.px, TA.S.py, B.x + B.w / 2, B.plazaY + 60) < 70) advanceStage();
    } else if (TA.S.stage === 2) {
      if (TA.dist(TA.S.px, TA.S.py, B.x + 60, B.y + 60) < 60) {
        alarmHold += dt;
        if (alarmHold > 5) { alarmHold = 0; advanceStage(); TA.ui.showToast('ALARM DILUMPUHKAN — 5 detik. Masuk!'); }
      } else alarmHold = 0;
    } else if (TA.S.stage === 3) {
      if (getBankGuardsRemaining() <= 0) {
        advanceStage();
        TA.world.addExplosion(B.x + B.w / 2, B.plazaY + 40);
      }
    } else if (TA.S.stage === 4) {
      if (TA.dist(TA.S.px, TA.S.py, B.x + 65, B.y + B.h - 30) < 60) {
        vaultHold += dt;
        if (vaultHold > 10) { vaultHold = 0; advanceStage(); TA.police.setWanted(3, 'PERAMPOKAN BANK'); TA.ui.showToast('BRANKAS TERBUKA — alarm berbunyi!'); }
      } else vaultHold = 0;
    } else if (TA.S.stage === 5) {
      if (TA.dist(TA.S.px, TA.S.py, B.x + 65, B.y + B.h - 30) < 60) {
        TA.S.bankMoneyTaken = true;
        advanceStage();
        TA.ui.showToast('TAS UANG DIAMBIL — $25.000! Kabur!');
      }
    } else if (TA.S.stage === 6) {
      if (TA.dist(TA.S.px, TA.S.py, B.x + B.w / 2, B.plazaY + 200) < 70) {
        TA.police.setWanted(4, 'PERAMPOKAN BANK');
        advanceStage();
      }
    } else if (TA.S.stage === 7) {
      if (TA.S.wanted === 0) {
        completeMission(7);
      }
    }
  }

  function update(dt) {
    stageT += dt;
    if (TA.S.mission === 7) updateBankHeist(dt);
    else checkObjective();
    // musuh menembak balik
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      e.shootT -= dt;
      var d = TA.dist(e.x, e.y, TA.S.px, TA.S.py);
      if (d < 380 && e.shootT <= 0) {
        e.shootT = 1.4 + Math.random();
        if (Math.random() < 0.45) TA.player.takeDamage(6);
      }
    }
    // ekspor mobil
    if (exportJob && exportJob.active) {
      if (TA.S.inCar && TA.S.car && TA.S.car.name === exportJob.carName) {
        if (TA.dist(TA.S.px, TA.S.py, exportJob.x, exportJob.y) < 80) completeCarExport();
      }
    }
  }

  function tryHitEnemy(px, py, angle, range, dmg) {
    var hitAny = false;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var dx = e.x - px, dy = e.y - py;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > range) continue;
      var ang = Math.atan2(dy, dx);
      var diff = Math.abs(ang - angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.35 || d < 50) {
        e.hp -= dmg;
        hitAny = true;
        if (e.hp <= 0) {
          e.alive = false;
          if (e.guard) {
            TA.S.guardsKilled++;
            TA.ui.renderMissionBanner();
            TA.ui.showToast('PENJAGA ' + TA.S.guardsKilled + '/9 — tumbang!');
            if (Math.random() < 0.5) TA.world.addExplosion(e.x, e.y);
          }
          TA.career.addXP(5, 'Musuh tumbang');
        }
        break;
      }
    }
    return hitAny;
  }
  TA.missions.tryHitEnemy = tryHitEnemy;

  function drawEnemies(ctx, W, H) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      var p = TA.world.worldToScreen(e.x, e.y, W, H);
      if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.arc(p.x, p.y - 2, 5, 0, Math.PI * 2); ctx.fill();
      // tanda merah di atas penjaga
      ctx.fillStyle = '#ff2d2d';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 26);
      ctx.lineTo(p.x - 6, p.y - 16);
      ctx.lineTo(p.x + 6, p.y - 16);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(e.guard ? 'PENJAGA' : 'MUSUH', p.x, p.y - 30);
      ctx.textAlign = 'left';
      // bar HP
      ctx.fillStyle = '#222';
      ctx.fillRect(p.x - 12, p.y + 14, 24, 4);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(p.x - 12, p.y + 14, 24 * Math.max(0, e.hp / 50), 4);
    }
  }
  TA.missions.drawEnemies = drawEnemies;

  function startCarExport(carName) {
    exportJob = { active: true, carName: carName, x: 500, y: 1000, reward: 900 };
    TA.ui.showToast('EKSPOR MOBIL: curi ' + carName + ' emas, antar ke eksportir Pelabuhan — $900.');
  }
  TA.missions.startCarExport = startCarExport;

  function completeCarExport() {
    if (!exportJob) return;
    exportJob.active = false;
    TA.S.money += exportJob.reward * 17000;
    TA.career.addXP(40, 'Ekspor mobil');
    TA.ui.showToast('EKSPOR SELESAI — +' + TA.fmtDollar(exportJob.reward) + ' · +40 XP');
  }
  TA.missions.completeCarExport = completeCarExport;

  TA.missions.reset = reset;
  TA.missions.startMission = startMission;
  TA.missions.startMissionStage = startMissionStage;
  TA.missions.advanceStage = advanceStage;
  TA.missions.completeMission = completeMission;
  TA.missions.checkObjective = checkObjective;
  TA.missions.update = update;
  TA.missions.updateBankHeist = updateBankHeist;
  TA.missions.enemies = function () { return enemies; };
  TA.missions.exportJob = function () { return exportJob; };
})();
