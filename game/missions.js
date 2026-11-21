// missions.js — 10 narrative operations, each 3 stages, dialogue cutscenes, day-5 branch, Mission 10 + end screen.
(function () {
  'use strict';
  var TA = window.TA;

  var MISSIONS = [
    { title: 'Antar Paket Pertama', day: 1, reward: 300, xp: 100, district: 'pasar',
      dialogue: [ ['PAK AMIR', 'Raka, paket ini harus sampai ke Dermaga Senja sebelum hujan makin deras. Jangan tanya isinya.'],
                  ['RAKA', 'Baik, Pak. Satu paket, satu jalan lurus.'] ],
      stages: [
        { title: 'AMBIL PAKET', objective: 'Ambil paket di Pasar Senja', next: 'Antar ke Dermaga Senja', dist: 120 },
        { title: 'ANTAR KE PELABUHAN', objective: 'Bawa paket ke Dermaga Senja', next: 'Serahkan ke kontak pelabuhan', dist: 85 },
        { title: 'SERAHKAN PAKET', objective: 'Serahkan paket ke kontak di gudang 7', next: 'Misi selesai — kembali ke bengkel', dist: 30 },
      ] },
    { title: 'Taksi Pertama', day: 1, reward: 200, xp: 100, district: 'pasar',
      dialogue: [ ['PENUMPANG', 'Ke Gang Neon, cepat! Aku telat janji.'], ['RAKA', 'Naik. Argo jalan, cerita belakangan.'] ],
      stages: [
        { title: 'JEMPUT PENUMPANG', objective: 'Jemput penumpang di Pasar Senja', next: 'Antar ke Gang Neon', dist: 95 },
        { title: 'ANTAR PENUMPANG', objective: 'Antar penumpang ke Lorong Lampion', next: 'Terima bayaran', dist: 110 },
        { title: 'TERIMA BAYARAN', objective: 'Terima bayaran + tip dari penumpang', next: 'Misi selesai', dist: 10 },
      ] },
    { title: 'Utang Pertama', day: 2, reward: 400, xp: 100, district: 'pelabuhan',
      dialogue: [ ['DARMA', 'Raka. Dua ribu dulu, hari ini. Bengkel ayahmu itu… sayang kalau disita.'],
                  ['RAKA', 'Aku bayar. Tapi ini yang terakhir kau datang tanpa kabar.'] ],
      stages: [
        { title: 'KUMPULKAN UANG', objective: 'Kumpulkan $400 dari job taksi', next: 'Bawa uang ke gudang Darma', dist: 140 },
        { title: 'KE GUDANG DARMA', objective: 'Bawa uang ke gudang pelabuhan', next: 'Serahkan uang ke anak buah Darma', dist: 90 },
        { title: 'BAYAR DARMA', objective: 'Serahkan uang — utang berkurang', next: 'Misi selesai', dist: 20 },
      ] },
    { title: 'Mobil Curian', day: 3, reward: 500, xp: 100, district: 'gang',
      dialogue: [ ['SARI', 'Ada Neon Coupe parkir di gang. Alarmnya mati — lima menit, Raka.'],
                  ['RAKA', 'Kalau ketahuan, kau yang nyetir kaburnya.'] ],
      stages: [
        { title: 'CURI NEON COUPE', objective: 'Curi Neon Coupe di Gang Neon (tahan E)', next: 'Kabur dari polisi', dist: 70 },
        { title: 'KABUR DARI POLISI', objective: 'Lepas dari wanted — sembunyi atau ganti mobil', next: 'Bawa mobil ke garage', dist: 150 },
        { title: 'GANTI WARNA', objective: 'Bawa mobil ke garage, ganti warna, wanted turun', next: 'Misi selesai', dist: 45 },
      ] },
    { title: 'Paket Panas', day: 4, reward: 600, xp: 100, district: 'tol',
      dialogue: [ ['AGUS', 'Paket ini dipantau. Jalur tol layang, jangan berhenti di lampu merah.'],
                  ['RAKA', 'Kalau ada roadblock, aku yang tanggung jawab.'] ],
      stages: [
        { title: 'AMBIL DI TOL', objective: 'Ambil paket di Jalan Layang Arunika', next: 'Turun ke pantai', dist: 130 },
        { title: 'LEWATI ROADBLOCK', objective: 'Lewati roadblock di tol (wanted ≥ 3)', next: 'Antar ke Pesisir Arunika', dist: 100 },
        { title: 'SERAHKAN DI PANTAI', objective: 'Serahkan paket di Pesisir Arunika', next: 'Misi selesai', dist: 25 },
      ] },
    { title: 'Pilihan Darma', day: 5, reward: 500, xp: 100, district: 'pelabuhan', branch: true,
      dialogue: [ ['DARMA', 'Bayar $500 sekarang, atau khianati aku dan ambil jalanku sendiri. Pilih, Raka.'],
                  ['RAKA', '…Aku perlu waktu. Tapi aku tidak lari.'] ],
      stages: [
        { title: 'KE GUDANG DARMA', objective: 'Temui Darma di gudang pelabuhan', next: 'Pilih: bayar atau khianati', dist: 90 },
        { title: 'PILIHAN', objective: 'Pilih: bayar Darma $500 ATAU khianati (tekan B bayar / K khianat)', next: 'Hadapi konsekuensinya', dist: 15 },
        { title: 'KONSEKUENSI', objective: 'Selesaikan urusan dengan anak buah Darma', next: 'Misi selesai', dist: 60 },
      ] },
    { title: 'Wreck the Regent', day: 6, reward: 700, xp: 100, district: 'pantai',
      dialogue: [ ['BUDI', 'Mobil Regent itu milik orang Darma. Rusak total — biar dia tahu kita tidak takut.'],
                  ['RAKA', 'Satu mobil. Tanpa korban. Itu aturanku.'] ],
      stages: [
        { title: 'TEMUKAN REGENT', objective: 'Temukan mobil Regent di Pesisir Arunika', next: 'Tabrak sampai hancur', dist: 110 },
        { title: 'WRECK THE REGENT', objective: 'Hancurkan mobil Regent (tabrak / tembak)', next: 'Kabur dari polisi', dist: 40 },
        { title: 'KABUR', objective: 'Lepas dari wanted 4 — sembunyi di safehouse', next: 'Misi selesai', dist: 80 },
      ] },
    { title: 'Pelabuhan Membara', day: 6, reward: 800, xp: 100, district: 'pelabuhan',
      dialogue: [ ['SARI', 'Gudang 7 terbakar — itu jebakan, Raka. Tapi di dalam ada bukti utang ayahmu.'],
                  ['RAKA', 'Kalau bukti itu ada, aku masuk.'] ],
      stages: [
        { title: 'MASUK GUDANG 7', objective: 'Masuk gudang 7 di pelabuhan', next: 'Cari bukti utang', dist: 75 },
        { title: 'CARI BUKTI', objective: 'Temukan dokumen utang di balik kontainer', next: 'Keluar sebelum runtuh', dist: 35 },
        { title: 'KELUAR DARI GUDANG', objective: 'Keluar dari gudang sebelum ELANG-1 tiba', next: 'Misi selesai', dist: 50 },
      ] },
    { title: 'Jalan Terakhir', day: 7, reward: 900, xp: 100, district: 'gang',
      dialogue: [ ['PAK AMIR', 'Hari terakhir, Nak. Apa pun yang terjadi malam ini, bengkel ini milik kita.'],
                  ['RAKA', 'Malam ini selesai. Janji.'] ],
      stages: [
        { title: 'KUMPULKAN KRU', objective: 'Kumpulkan kru di bengkel Pak Amir', next: 'Menuju pelabuhan', dist: 60 },
        { title: 'MENUJU PELABUHAN', objective: 'Bawa kru ke pelabuhan — ELANG-1 mengintai', next: 'Siap menyerbu gudang Darma', dist: 120 },
        { title: 'SIAP SERBU', objective: 'Tiba di pelabuhan, bersiap untuk Operasi Terakhir', next: 'Misi 10 terbuka', dist: 20 },
      ] },
    { title: 'Operasi Terakhir: Fajar di Pelabuhan', day: 7, reward: 1500, xp: 200, district: 'pelabuhan', final: true,
      dialogue: [ ['DARMA', 'Raka… kau datang juga. Tujuh hari, dan kau masih berdiri. Sayang sekali.'],
                  ['SARI', 'Kita bersama, Raka. Gaspol sampai fajar!'],
                  ['BUDI', 'Mesin siap. Kalau mobilmu rusak, aku yang betulkan.'],
                  ['AGUS', 'Aku matikan lampu gudang. Mereka tidak akan melihat kita datang.'],
                  ['RAKA', 'Darma — ini berakhir hari ini.'] ],
      stages: [
        { title: 'GELOMBANG 1', objective: 'Hadapi gelombang 1 di balik kontainer', next: 'Gelombang 2', dist: 60 },
        { title: 'GELOMBANG 2', objective: 'Hadapi gelombang 2 — ELANG-1 + roadblock menghalangi kabur', next: 'Gelombang 3', dist: 45 },
        { title: 'HADAPI DARMA', objective: 'Hadapi Darma: tangkap hidup-hidup (+200 XP) atau biarkan kabur (+$500)', next: 'Utang lunas', dist: 25 },
      ] },
  ];

  var dialogueQueue = [];
  var dialogueIndex = 0;
  var dialogueActive = false;
  var stageTimer = 0;

  function startMission(i) {
    var s = TA.state;
    if (i < 0 || i >= MISSIONS.length) return;
    s.missionIndex = i; s.missionStage = 0; s.missionActive = true;
    s.ghostUsedThisMission = false;
    startMissionStage(i, 0);
    var m = MISSIONS[i];
    if (m.dialogue) showDialogueQueue(m.dialogue);
    TA.ui.renderHUD();
    TA.ui.toast('MISI ' + (i + 1) + ' DARI 10: ' + m.title);
  }

  function startMissionStage(missionIndex, stageIndex) {
    var s = TA.state;
    s.missionIndex = missionIndex; s.missionStage = stageIndex; s.missionActive = true;
    stageTimer = 0;
    var m = MISSIONS[missionIndex];
    var st = m.stages[stageIndex];
    TA.ui.renderMissionBanner();
    TA.ui.toast('TAHAP ' + (stageIndex + 1) + '/3 — ' + st.title);
  }

  function advanceStage() {
    var s = TA.state;
    var m = MISSIONS[s.missionIndex];
    if (s.missionStage < m.stages.length - 1) {
      startMissionStage(s.missionIndex, s.missionStage + 1);
    } else {
      completeMission(s.missionIndex);
    }
  }

  function getObjectiveDistance() {
    var m = MISSIONS[TA.state.missionIndex];
    if (!m) return 0;
    var st = m.stages[TA.state.missionStage];
    return st ? st.dist : 0;
  }

  function checkObjective(kind) {
    var s = TA.state;
    if (!s.missionActive) return;
    stageTimer += 1;
    // Simple progression: objective advances by time-in-stage + actions
    if (kind === 'shoot' && stageTimer > 4) advanceStage();
    else if (kind === 'arrive' && stageTimer > 6) advanceStage();
    else if (kind === 'drive' && stageTimer > 8) advanceStage();
  }

  function completeMission(i) {
    var s = TA.state;
    var m = MISSIONS[i];
    s.missionActive = false;
    s.missionsDone++;
    s.money += m.reward;
    TA.career.addXP(m.xp);
    TA.world.updateDistrictStanding(m.district, 8);
    TA.ui.toast('MISI SELESAI: ' + m.title + ' — +$' + m.reward + ' · +' + m.xp + ' XP');
    TA.crew.showCrewChatter('Sari', 'Misi selesai! ' + m.title + ' — kita makin dekat melunasi utang.');
    if (m.final) {
      TA.state.darmaChoice = TA.state.darmaChoice || 'tangkap';
      if (TA.state.darmaChoice === 'tangkap') TA.career.addXP(200);
      else s.money += 500;
      TA.core.winGame();
      return;
    }
    if (i === 5) { // day-5 branch resolution
      if (s.darmaChoice === 'khianat') { s.money += 500; TA.ui.toast('Kau mengkhianati Darma — +$500, tapi wanted naik.'); TA.police.setWanted(3); }
      else { s.money = Math.max(0, s.money - 500); TA.ui.toast('Kau membayar Darma $500. Utang berkurang.'); s.debt = Math.max(0, s.debt - 500); }
    }
    if (i + 1 < MISSIONS.length) {
      setTimeout(function () { if (TA.state.mode === 'playing') startMission(i + 1); }, 2500);
    }
    TA.core.autosave();
  }

  function showDialogueQueue(lines) {
    dialogueQueue = lines.slice();
    dialogueIndex = 0;
    dialogueActive = true;
    TA.state.mode = 'cutscene';
    showCurrentDialogue();
  }
  function showDialogue(speaker, text) { showDialogueQueue([[speaker, text]]); }
  function showCurrentDialogue() {
    var line = dialogueQueue[dialogueIndex];
    if (!line) { closeDialogue(); return; }
    TA.ui.showDialogue(line[0], line[1]);
  }
  function advanceDialogue() {
    if (!dialogueActive) return;
    dialogueIndex++;
    if (dialogueIndex >= dialogueQueue.length) closeDialogue();
    else showCurrentDialogue();
  }
  function closeDialogue() {
    dialogueActive = false;
    TA.ui.hideDialogue();
    if (TA.state.mode === 'cutscene') TA.state.mode = 'playing';
  }

  function update(dt) {
    if (!TA.state.missionActive) return;
    stageTimer += dt;
    // auto-advance stage after enough time in stage (keeps the demo moving)
    var m = MISSIONS[TA.state.missionIndex];
    var st = m.stages[TA.state.missionStage];
    if (stageTimer > 45) advanceStage();
    // mission marker distance shrinks as player moves (simulated)
    if (st && st.dist > 5) st.dist = Math.max(5, st.dist - dt * 2);
  }

  TA.missions = {
    MISSIONS: MISSIONS,
    startMission: startMission, startMissionStage: startMissionStage,
    advanceStage: advanceStage, getObjectiveDistance: getObjectiveDistance,
    completeMission: completeMission, showDialogue: showDialogue,
    showDialogueQueue: showDialogueQueue, advanceDialogue: advanceDialogue,
    checkObjective: checkObjective, update: update,
  };
})();
