// Teluk Arunika v3.6 — missions.js
// 10 narrative operations in 3 acts, each mission a syndicate contract with
// 3-4 stages (Misi 6, 8 & 10 have 4), dialogue cutscenes, the day-5 branch
// (pay Darma $500 or betray him), Misi 10 + ending screen, car-export side job.
(function () {
  'use strict';
  var TA = window.TA;

  var ACTS = [
    { id: 1, name: 'BAB I — UTANG', range: [0, 2] },
    { id: 2, name: 'BAB II — SINDIKAT', range: [3, 6] },
    { id: 3, name: 'BAB III — FAJAR', range: [7, 9] },
  ];

  var SYNDICATES = {
    DARMA: { name: 'DARMA WIJAYA', color: '#ff5555' },
    KERONO: { name: 'GENG KERONO', color: '#c07aff' },
    KELO: { name: 'KELO ARMS', color: '#ffb020' },
  };

  var MISSIONS = [
    {
      title: 'TAKSI PERTAMA', syndicate: 'DARMA', reward: 200, day: 1,
      intro: 'Raka: “Satu minggu. Lima ribu dolar. Aku bisa.”',
      dialogue: ['PAK AMIR: “Taksi sudah siap, Nak. Penumpang pertama menunggu di Pasar.”', 'RAKA: “Hari ini aku mulai melunasi utang.”'],
      stages: [
        { title: 'JEMPUT PENUMPANG', objective: 'Antar penumpang ke Pasar Senja', target: 'PASAR' },
        { title: 'PAKET RAHASIA', objective: 'Antar paket ke Pelabuhan tanpa ketahuan polisi', target: 'PELABUHAN' },
        { title: 'LAPOR KE BENGKEL', objective: 'Kembali ke bengkel Pak Amir', target: 'BENGKEL' },
      ],
    },
    {
      title: 'CAT EMAS', syndicate: 'KERONO', reward: 350, day: 2,
      intro: 'Kerono: “Sedan emas itu. Bawa ke aku, dan catnya jadi milikmu.”',
      dialogue: ['SARI: “Sedan emas itu diparkir di Pantai. Kuncinya? Tidak ada kunci.”', 'RAKA: “Berarti kita curi saja.”'],
      stages: [
        { title: 'CURI SEDAN EMAS', objective: 'Curi PELABUHAN GT emas di Pantai', target: 'PANTAI' },
        { title: 'GANTI WARNA', objective: 'Bawa ke garage — ganti warna, turunkan wanted', target: 'BENGKEL' },
        { title: 'ANTAR KE PEMBELI', objective: 'Serahkan mobil ke kontak Kerono di Gang Neon', target: 'GANG NEON' },
      ],
    },
    {
      title: 'UTANG BERBUNGA', syndicate: 'DARMA', reward: 300, day: 3,
      intro: 'Darma: “Tagih mereka. Yang menolak… kau tahu caranya.”',
      dialogue: ['DARMA: “Tiga nama. Tiga alamat. Jangan kembali dengan tangan kosong.”', 'RAKA: “Aku penagih utang sekarang?”'],
      stages: [
        { title: 'TAGIH DI GANG NEON', objective: 'Temui penunggak pertama di Lorong Lampion', target: 'GANG NEON' },
        { title: 'KEJAR PENUNGGAK', objective: 'Dia kabur — kejar dengan mobil!', target: 'PASAR' },
        { title: 'SERAHKAN UANG', objective: 'Bawa hasil tagihan ke gudang Darma', target: 'PELABUHAN' },
      ],
    },
    {
      title: 'SENJATA KELO', syndicate: 'KELO', reward: 500, day: 3,
      intro: 'Kelo: “Kiriman senjata. Polisi tidak boleh tahu. Kau paham.”',
      dialogue: ['KELO: “Kontainer biru, dermaga tiga. Ambil dan jangan berhenti.”', 'AGUS: “Aku matikan kamera dermaga selama 90 detik. Cepat.”'],
      stages: [
        { title: 'AMBIL KIRIMAN', objective: 'Ambil peti senjata di Pelabuhan', target: 'PELABUHAN' },
        { title: 'KABUR DARI PATROLI', objective: 'Lepas dari wanted 2 — sembunyi atau ganti mobil', target: 'TOL LAYANG' },
        { title: 'ANTAR KE GUDANG', objective: 'Serahkan ke gudang Kelo di Pasar', target: 'PASAR' },
      ],
    },
    {
      title: 'PILIH JALAN', syndicate: 'DARMA', reward: 500, day: 5,
      intro: 'Darma: “Lima ratus dolar hari ini… atau kau khianati aku?”',
      dialogue: ['DARMA: “Bayar, dan kau tetap hidup. Khianati aku, dan seluruh Teluk memburumu.”', 'RAKA: “Pilihanku… akan menentukan segalanya.”'],
      branch: true,
      stages: [
        { title: 'TEMUI DARMA', objective: 'Datang ke gudang Darma di Pelabuhan', target: 'PELABUHAN' },
        { title: 'PILIH: BAYAR $500', objective: 'Bayar Darma — atau tekan X untuk khianati', target: 'PELABUHAN' },
        { title: 'KONSEKUENSI', objective: 'Hadapi akibat pilihanmu', target: 'GANG NEON' },
      ],
    },
    {
      title: 'JALUR TOL BERDARAH', syndicate: 'KERONO', reward: 650, day: 5,
      intro: 'Kerono: “Truk itu membawa milikku. Rebut di tol, sebelum fajar.”',
      dialogue: ['SARI: “Truk Kerono melaju 120 di tol layang. Kita potong jalannya.”', 'BUDI: “Mobilmu sudah kupasangi pelat baja. Tabrak saja.”'],
      stages: [
        { title: 'REBUT TRUK DI TOL', objective: 'Potong truk Kerono di Tol Layang', target: 'TOL LAYANG' },
        { title: 'KEJAR-KEJARAN', objective: 'Lepas dari mobil Kerono yang mengejar', target: 'TOL LAYANG' },
        { title: 'TEMBUS ROADBLOCK', objective: 'Tembus roadblock polisi di ujung tol', target: 'PELABUHAN' },
        { title: 'ANTAR MUATAN', objective: 'Antar muatan ke Pasar Senja', target: 'PASAR' },
      ],
    },
    {
      title: 'MATA-MATA PELABUHAN', syndicate: 'KELO', reward: 600, day: 6,
      intro: 'Kelo: “Foto gudang Darma. Aku mau tahu apa yang dia sembunyikan.”',
      dialogue: ['AGUS: “Kamera dermaga sudah kumainkan. Kau punya lima menit.”', 'RAKA: “Lima menit cukup.”'],
      stages: [
        { title: 'FOTO GUDANG DARMA', objective: 'Foto gudang dari atap kontainer', target: 'PELABUHAN' },
        { title: 'SELINAP MASUK', objective: 'Masuk tanpa memicu alarm', target: 'PELABUHAN' },
        { title: 'KABUR LEWAT PANTAI', objective: 'Kabur lewat Pantai Arunika', target: 'PANTAI' },
      ],
    },
    {
      title: 'BARA PULAU ABU', syndicate: 'KELO', reward: 800, day: 6,
      intro: 'Kelo: “Di Pulau Abu ada kiriman terakhir. Bara tidak menunggu.”',
      dialogue: ['KELO: “Gudang bara di Pulau Abu. Ambil petinya, jangan sentuh lavanya.”', 'SARI: “Jembatan ke pulau itu dijaga. Kita lewat jalan belakang.”'],
      stages: [
        { title: 'SEBERANGI JEMBATAN', objective: 'Seberangi jembatan ke Pulau Abu', target: 'PULAU ABU' },
        { title: 'TEMBUS PENJAGA BARA', objective: 'Lewati penjaga di Jalan Bara', target: 'PULAU ABU' },
        { title: 'AMBIL PETI KELO', objective: 'Ambil peti di dekat kawah', target: 'PULAU ABU' },
        { title: 'KABUR DARI LETUSAN', objective: 'Kabur sebelum asap menutup jalan', target: 'PELABUHAN' },
      ],
    },
    {
      title: 'BADAI DI DERMAGA', syndicate: 'DARMA', reward: 700, day: 7,
      intro: 'Darma: “Kau pikir kau bisa pergi? Badai baru mulai, Raka.”',
      dialogue: ['DARMA: “Sari ada di gudangku. Datang sendiri, atau dia yang membayar.”', 'RAKA: “Sentuh dia, dan kau menyesal.”'],
      stages: [
        { title: 'SELAMATKAN SARI', objective: 'Masuk gudang Darma di Pelabuhan', target: 'PELABUHAN' },
        { title: 'TAHAN SERANGAN', objective: 'Tahan gelombang anak buah Darma', target: 'PELABUHAN' },
        { title: 'KABUR DENGAN PERAHU', objective: 'Kabur lewat dermaga saat badai', target: 'PANTAI' },
      ],
    },
    {
      title: 'OPERASI TERAKHIR: FAJAR DI PELABUHAN', syndicate: 'DARMA', reward: 1000, day: 7,
      intro: 'Raka: “Fajar ini, utang lunas. Dengan cara apa pun.”',
      dialogue: [
        'RAKA: “Ini dia. Gudang terakhir Darma.”',
        'SARI: “Aku di sayap kiri. Jangan mati, Raka.”',
        'BUDI: “Senjata sudah kusiapkan. Maju!”',
        'AGUS: “Kamera mati. ELANG-1 tidak akan melihatmu… untuk sementara.”',
        'DARMA: “Kau datang juga. Anak bengkel yang keras kepala.”',
      ],
      stages: [
        { title: 'SERBU GUDANG', objective: 'Serbu gudang terakhir Darma di Pelabuhan', target: 'PELABUHAN' },
        { title: 'GELOMBANG 1: KONTAINER', objective: 'Bersihkan musuh di balik kontainer', target: 'PELABUHAN' },
        { title: 'GELOMBANG 2: ELANG-1', objective: 'Bertahan di bawah sorot ELANG-1', target: 'PELABUHAN' },
        { title: 'TANGKAP DARMA', objective: 'Tangkap Darma hidup-hidup (+200 XP) atau biarkan kabur (+$500)', target: 'PELABUHAN' },
      ],
    },
  ];

  var dialogueQueue = [];
  var dialogueIndex = 0;
  var stageTimer = 0;
  var objectiveBlip = { x: 0, z: 0 };

  function getActForMission(missionIndex) {
    for (var i = 0; i < ACTS.length; i++) {
      if (missionIndex >= ACTS[i].range[0] && missionIndex <= ACTS[i].range[1]) return ACTS[i];
    }
    return ACTS[0];
  }

  function getMissionContract(missionIndex) {
    var m = MISSIONS[missionIndex];
    if (!m) return null;
    var syn = SYNDICATES[m.syndicate];
    return { syndicate: syn.name, reward: m.reward, color: syn.color };
  }

  function currentMission() {
    return MISSIONS[TA.state.missionIndex] || null;
  }

  function currentStage() {
    var m = currentMission();
    if (!m) return null;
    return m.stages[TA.state.missionStage] || null;
  }

  function showMissionIntro(missionIndex) {
    var m = MISSIONS[missionIndex];
    if (!m) return;
    var act = getActForMission(missionIndex);
    TA.state.screen = 'cutscene';
    TA.ui.showMissionIntroCard(missionIndex, act, m);
  }

  function showDialogue(lines, onDone) {
    dialogueQueue = lines.slice();
    dialogueIndex = 0;
    TA.state.screen = 'cutscene';
    TA.ui.showDialogueBox(dialogueQueue[0], onDone);
    TA.missions._dialogueDone = onDone || null;
  }

  function advanceDialogue() {
    dialogueIndex++;
    if (dialogueIndex >= dialogueQueue.length) {
      TA.ui.hideDialogueBox();
      TA.state.screen = 'playing';
      var cb = TA.missions._dialogueDone;
      TA.missions._dialogueDone = null;
      if (cb) cb();
    } else {
      TA.ui.showDialogueBox(dialogueQueue[dialogueIndex]);
    }
  }

  function startMission(index) {
    var m = MISSIONS[index];
    if (!m) return;
    TA.state.missionIndex = index;
    TA.state.missionStage = 0;
    TA.state.missionActive = true;
    TA.state.ghostUsedThisMission = false;
    showMissionIntro(index);
    setTimeout(function () {
      showDialogue(m.dialogue, function () {
        TA.ui.showBanner(
          'MISI ' + (index + 1) + ' DARI 10 · ' + getActForMission(index).name + ' · TAHAP 1/' + m.stages.length,
          m.title + ' — ' + m.stages[0].title
        );
        TA.ui.updateMissionBanner();
      });
    }, 100);
    placeObjectiveBlip();
  }

  function startMissionStage(index, stage) {
    var m = MISSIONS[index];
    if (!m || !m.stages[stage]) return;
    TA.state.missionIndex = index;
    TA.state.missionStage = stage;
    TA.state.missionActive = true;
    placeObjectiveBlip();
    TA.ui.updateMissionBanner();
    TA.ui.showToast('TAHAP ' + (stage + 1) + '/' + m.stages.length + ' — ' + m.stages[stage].title);
  }

  function advanceStage() {
    var m = currentMission();
    if (!m) return;
    var next = TA.state.missionStage + 1;
    if (next >= m.stages.length) {
      completeMission();
      return;
    }
    startMissionStage(TA.state.missionIndex, next);
    // stage-advance chatter from the crew
    var chatter = [
      ['SARI', 'Tahap berikutnya — ikuti aku.'],
      ['BUDI', 'Bagus. Lanjut, Raka.'],
      ['AGUS', 'Jalur bersih. Teruskan.'],
    ];
    var c = chatter[next % chatter.length];
    TA.crew.showCrewChatter(c[0], c[1]);
  }

  function getObjectiveDistance() {
    var dx = objectiveBlip.x - TA.playerObj.position.x;
    var dz = objectiveBlip.z - TA.playerObj.position.z;
    return Math.round(Math.sqrt(dx * dx + dz * dz));
  }

  function placeObjectiveBlip() {
    var stage = currentStage();
    var spots = {
      'PELABUHAN': { x: -120, z: 170 },
      'PASAR': { x: 60, z: 60 },
      'GANG NEON': { x: -115, z: -20 },
      'PANTAI': { x: 0, z: 235 },
      'TOL LAYANG': { x: -40, z: -140 },
      'PULAU ABU': { x: 240, z: 40 },
      'BENGKEL': { x: 24, z: -24 },
    };
    var spot = spots[(stage && stage.target) || 'PELABUHAN'] || spots['PELABUHAN'];
    objectiveBlip = { x: spot.x, z: spot.z };
  }

  function checkObjective() {
    if (!TA.state.missionActive) return;
    var d = getObjectiveDistance();
    if (d < 14) {
      advanceStage();
    }
  }

  function completeMission() {
    var m = currentMission();
    if (!m) return;
    TA.state.missionActive = false;
    TA.state.money += m.reward;
    TA.career.addXP(100);
    TA.career.bumpDistrict(TA.state.district, 8);
    TA.ui.showBanner('MISI SELESAI — ' + m.title, '+$' + m.reward + ' · +100 XP');
    TA.crew.showCrewChatter('SARI', 'Misi selesai! Kau memang legenda jalanan.');
    TA.audio.playRadioStation(TA.state.radio);
    if (TA.state.missionIndex === 9) {
      // Misi 10: the final choice + ending
      showDialogue([
        'DARMA: “Tangkap aku… atau biarkan aku pergi. Pilihanmu, Raka.”',
        'RAKA: “Hidup-hidup. Kau akan membayar semuanya di pengadilan.”',
      ], function () {
        TA.career.addXP(200);
        TA.core.winGame();
      });
      return;
    }
    if (TA.state.missionIndex === 4) {
      // day-5 branch resolves here
      TA.state.choiceMadeDay5 = true;
    }
    // advance the day
    TA.state.day = Math.min(7, TA.state.day + 1);
    var next = TA.state.missionIndex + 1;
    if (next < MISSIONS.length) {
      setTimeout(function () { startMission(next); }, 1800);
    }
  }

  // ---------- car export side job ----------
  var EXPORT_TARGETS = [
    { name: 'PELABUHAN GT emas', model: 1, pay: 900 },
    { name: 'KERONO LOWRIDER ungu', model: 3, pay: 750 },
    { name: 'ARUNIKA SEDAN putih', model: 0, pay: 500 },
  ];

  function startCarExport() {
    if (TA.state.carExport) return;
    var t = EXPORT_TARGETS[TA.state.exportsDone % EXPORT_TARGETS.length];
    TA.state.carExport = { target: t.name, model: t.model, pay: t.pay, stage: 'steal' };
    TA.ui.showToast('EKSPOR MOBIL: curi ' + t.name + ' lalu antar ke eksportir di Pelabuhan ($' + t.pay + ')');
    TA.crew.showCrewChatter('AGUS', 'Target ekspor: ' + t.name + '. Jangan sampai rusak parah.');
  }

  function completeCarExport() {
    var ex = TA.state.carExport;
    if (!ex) return;
    TA.state.money += ex.pay;
    TA.state.exportsDone++;
    TA.career.addXP(40);
    TA.state.carExport = null;
    TA.ui.showBanner('EKSPOR SELESAI', '+' + '$' + ex.pay + ' · +40 XP — ' + ex.target + ' terkirim');
  }

  function update(dt) {
    if (TA.state.screen !== 'playing') return;
    stageTimer += dt;
    // auto-advance stage when the player reaches the objective (demo pacing)
    if (TA.state.missionActive && stageTimer > 2) {
      checkObjective();
      stageTimer = 0;
    }
    // car export: delivering the right car to the port completes it
    var ex = TA.state.carExport;
    if (ex && TA.state.inCar && TA.state.district === 'PELABUHAN') {
      var car = TA.player.getCars()[TA.state.carIndex];
      if (car && car.model === TA.player.CAR_MODELS[ex.model]) completeCarExport();
    }
  }

  TA.missions = {
    MISSIONS: MISSIONS,
    ACTS: ACTS,
    SYNDICATES: SYNDICATES,
    getActForMission: getActForMission,
    getMissionContract: getMissionContract,
    currentMission: currentMission,
    currentStage: currentStage,
    showMissionIntro: showMissionIntro,
    showDialogue: showDialogue,
    advanceDialogue: advanceDialogue,
    startMission: startMission,
    startMissionStage: startMissionStage,
    advanceStage: advanceStage,
    getObjectiveDistance: getObjectiveDistance,
    checkObjective: checkObjective,
    completeMission: completeMission,
    startCarExport: startCarExport,
    completeCarExport: completeCarExport,
    getObjectiveBlip: function () { return objectiveBlip; },
    update: update,
  };
})();
