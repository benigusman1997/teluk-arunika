// TELUK ARUNIKA v3 — missions.js
// 10 operasi naratif: dialog cutscene, objektif, hadiah, cabang hari ke-5,
// Misi 10 "Operasi Terakhir: Fajar di Pelabuhan" + layar akhir.
(function () {
  'use strict';

  var M = TA.missions = {};

  M.MISSIONS = [
    {
      id: 1, title: 'Taksi Pertama', day: 1, type: 'goto',
      target: { x: 20, z: 20, label: 'Pangkalan taksi' },
      intro: [
        { who: 'Pak Amir', text: 'Raka. Darma menagih $5.000 dalam 7 hari, atau bengkel ini disita.' },
        { who: 'Raka', text: 'Aku akan cari uangnya, Pak. Mulai dari narik taksi hari ini.' },
        { who: 'Pak Amir', text: 'Antar penumpang di pangkalan taksi. Jangan bikin masalah dulu.' }
      ],
      reward: 120, xp: 100,
      outro: 'Penumpang pertama diantar. $120 masuk. 6 hari tersisa.',
      stages: [
        { title: 'Nyalakan Mesin', objective: 'Jalan ke pangkalan taksi', type: 'reach', target: { x: 20, z: 20 }, next: 'Jemput Penumpang' },
        { title: 'Jemput Penumpang', objective: 'Jemput penumpang di Pasar Arunika', type: 'reach', target: { x: 0, z: 0 }, next: 'Antar ke Pelabuhan' },
        { title: 'Antar ke Pelabuhan', objective: 'Antar penumpang ke pelabuhan', type: 'reach', target: { x: 0, z: 195 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 2, title: 'Paket Basah', day: 2, type: 'goto',
      target: { x: 0, z: 0, label: 'Pasar Arunika' },
      intro: [
        { who: 'Raka', text: 'Hujan deras, paket harus sampai sebelum pasar tutup.' },
        { who: 'Sari', text: 'Aku baru di kota ini. Kau butuh sopir yang tahu jalan tikus?' }
      ],
      reward: 150, xp: 100,
      outro: 'Paket sampai. $150. Sari mengawasimu dari warung kopi.',
      stages: [
        { title: 'Ambil Paket', objective: 'Ambil paket di Pasar Arunika', type: 'reach', target: { x: 0, z: 0 }, next: 'Lintasi Gang Neon' },
        { title: 'Lintasi Gang Neon', objective: 'Bawa paket lewat gang neon', type: 'reach', target: { x: -40, z: 0 }, next: 'Serahkan di Pelabuhan' },
        { title: 'Serahkan di Pelabuhan', objective: 'Serahkan paket di dermaga', type: 'reach', target: { x: 0, z: 195 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 3, title: 'Setoran Warung', day: 3, type: 'collect',
      target: { x: 0, z: 0, label: 'Pasar Arunika' },
      intro: [
        { who: 'Pak Amir', text: 'Tiga warung di pasar belum bayar setoran minggu ini. Tagih, Raka.' },
        { who: 'Raka', text: 'Tiga warung, hujan-hujanan. Baiklah.' }
      ],
      reward: 220, xp: 100, collectNeeded: 3,
      outro: 'Tiga warung lunas. $220. Utang makin dekat terbayar.',
      stages: [
        { title: 'Warung Pertama', objective: 'Tagih setoran warung pertama', type: 'collect', target: { x: -14, z: 10 }, next: 'Warung Kedua' },
        { title: 'Warung Kedua', objective: 'Tagih setoran warung kedua', type: 'collect', target: { x: 14, z: -10 }, next: 'Warung Ketiga' },
        { title: 'Warung Ketiga', objective: 'Tagih setoran warung terakhir', type: 'collect', target: { x: 0, z: 16 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 4, title: 'Mata-Mata Pelabuhan', day: 4, type: 'goto',
      target: { x: 0, z: 195, label: 'Gudang pelabuhan' },
      intro: [
        { who: 'Agus', text: 'Gudang Darma di pelabuhan dijaga ketat. Aku bisa butakan kameranya... untuk harga yang pas.' },
        { who: 'Raka', text: 'Amati dulu. Jangan sampai ketahuan.' }
      ],
      reward: 180, xp: 100,
      outro: 'Kau tahu jadwal jaga gudang itu sekarang. Informasi itu mahal.',
      stages: [
        { title: 'Menyusup ke Dermaga', objective: 'Sampai di dermaga pelabuhan', type: 'reach', target: { x: 0, z: 180 }, next: 'Amati Gudang' },
        { title: 'Amati Gudang', objective: 'Amati jadwal jaga gudang Darma', type: 'reach', target: { x: 0, z: 195 }, next: 'Kembali ke Bengkel' },
        { title: 'Kembali ke Bengkel', objective: 'Laporkan ke Pak Amir', type: 'reach', target: { x: -60, z: 60 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 5, title: 'Bayar atau Khianati', day: 5, type: 'choice',
      target: { x: -60, z: 60, label: 'Bengkel Pak Amir' },
      intro: [
        { who: 'Darma', text: 'Setengah utang, Raka. $500 malam ini, atau aku ambil bengkel ayahmu sekarang.' },
        { who: 'Raka', text: 'Lima ratus... Aku punya pilihannya. Bayar, atau khianati dia sekali untuk selamanya.' }
      ],
      reward: 0, xp: 50,
      outro: 'Keputusan hari ke-5 akan menentukan akhir cerita ini.',
      stages: [
        { title: 'Temui Darma', objective: 'Temui Darma di bengkel Pak Amir', type: 'reach', target: { x: -60, z: 60 }, next: 'Tentukan Pilihan' },
        { title: 'Tentukan Pilihan', objective: 'Bayar $500 atau khianati Darma', type: 'choice', target: { x: -60, z: 60 }, next: 'Tinggalkan Bengkel' },
        { title: 'Tinggalkan Bengkel', objective: 'Tinggalkan bengkel, kembali ke pasar', type: 'reach', target: { x: 0, z: 0 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 6, title: 'Balas Dendam', day: 6, type: 'kill',
      target: { x: -40, z: 0, label: 'Gang neon' },
      intro: [
        { who: 'Raka', text: 'Anak buah Darma merusak taksi Pak Amir semalam. Sekarang giliranku.' },
        { who: 'Budi', text: 'Mobilmu sudah kupasangi pelat baja. Hajar mereka, Raka.' }
      ],
      reward: 300, xp: 100, killsNeeded: 5,
      outro: 'Lima anak buah Darma tumbang. Gang neon kembali tenang.',
      stages: [
        { title: 'Cari Anak Buah Darma', objective: 'Masuk ke gang neon', type: 'reach', target: { x: -40, z: 0 }, next: 'Wreck the Regent' },
        { title: 'WRECK THE REGENT', objective: 'Hancurkan 5 anak buah Darma', type: 'kill', count: 5, target: { x: -40, z: 0 }, next: 'Kabur dari Polisi' },
        { title: 'Kabur dari Polisi', objective: 'Turunkan wanted sampai 0 / sembunyi di safehouse', type: 'escape', target: { x: -40, z: 0 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 7, title: 'Pelarian Tol Layang', day: 6, type: 'escape',
      target: { x: -40, z: 0, label: 'Safehouse gang neon' },
      intro: [
        { who: 'Sari', text: 'Polisi sudah di mana-mana, Raka! Wanted 3! Lewat tol layang, gaspol!' },
        { who: 'Raka', text: 'Pegang erat. Kita hilang di gang neon.' }
      ],
      reward: 260, xp: 100,
      outro: 'Kau lolos dari kejaran. Safehouse melindungimu malam ini.',
      stages: [
        { title: 'Naik ke Tol Layang', objective: 'Naik ke jalan tol layang', type: 'reach', target: { x: 0, z: -160 }, next: 'Hilang di Lalu Lintas' },
        { title: 'Hilang di Lalu Lintas', objective: 'Bertahan 20 detik tanpa tertangkap', type: 'survive', seconds: 20, target: { x: 0, z: -160 }, next: 'Masuk Safehouse' },
        { title: 'Masuk Safehouse', objective: 'Masuk ke safehouse gang neon', type: 'reach', target: { x: -40, z: 0 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 8, title: 'Gudang Terbakar', day: 7, type: 'kill',
      target: { x: 40, z: 200, label: 'Gudang Darma' },
      intro: [
        { who: 'Agus', text: 'Dokumen utang ayahmu ada di gudang itu. Ambil sebelum Darma membakarnya.' },
        { who: 'Raka', text: 'Enam penjaga. Satu kesempatan. Masuk.' }
      ],
      reward: 350, xp: 100, killsNeeded: 6,
      outro: 'Dokumen utang direbut. Darma tidak punya lagi pegangan atas bengkel.',
      stages: [
        { title: 'Masuk Gudang', objective: 'Masuk ke gudang Darma', type: 'reach', target: { x: 40, z: 200 }, next: 'Habisi 6 Penjaga' },
        { title: 'Habisi 6 Penjaga', objective: 'Habisi 6 penjaga gudang', type: 'kill', count: 6, target: { x: 40, z: 200 }, next: 'Ambil Dokumen' },
        { title: 'Ambil Dokumen', objective: 'Ambil dokumen utang ayahmu', type: 'reach', target: { x: 40, z: 210 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 9, title: 'Jebakan di Pasar', day: 7, type: 'waves',
      target: { x: 0, z: 0, label: 'Pasar Arunika' },
      intro: [
        { who: 'Darma', text: 'Kau pikir bisa menang, Raka? Pasarmu sudah kukepung.' },
        { who: 'Raka', text: 'Tiga gelombang. Aku tidak akan lari lagi.' }
      ],
      reward: 400, xp: 100, waves: 3,
      outro: 'Pasar bertahan. Darma kehabisan anak buah — tinggal dia sendiri.',
      stages: [
        { title: 'Gelombang 1', objective: 'Tahan gelombang 1 di pasar', type: 'waves', wave: 1, target: { x: 0, z: 0 }, next: 'Gelombang 2' },
        { title: 'Gelombang 2', objective: 'Tahan gelombang 2 di pasar', type: 'waves', wave: 2, target: { x: 0, z: 0 }, next: 'Gelombang 3' },
        { title: 'Gelombang 3', objective: 'Tahan gelombang terakhir', type: 'waves', wave: 3, target: { x: 0, z: 0 }, next: 'Selesaikan misi' }
      ]
    },
    {
      id: 10, title: 'Operasi Terakhir: Fajar di Pelabuhan', day: 7, type: 'final',
      target: { x: 0, z: 195, label: 'Pelabuhan Arunika' },
      intro: [
        { who: 'Darma', text: 'Raka. Kau datang juga. Tujuh hari... dan kau masih berutang padaku.' },
        { who: 'Sari', text: 'Gaspol, Raka. Kita habisi gudang ini bareng-bareng.' },
        { who: 'Agus', text: 'Kamera pelabuhan sudah kubutakan. Mereka tidak lihat kita datang.' },
        { who: 'Budi', text: 'Mobil dan senjatamu sudah siap. Akhiri ini, Raka.' }
      ],
      reward: 1000, xp: 100, waves: 3,
      outro: 'Gudang terakhir Darma jatuh. Fajar naik di Teluk Arunika.',
      stages: [
        { title: 'Serbu Dermaga', objective: 'Serbu dermaga pelabuhan', type: 'reach', target: { x: 0, z: 185 }, next: 'Bersihkan Gudang' },
        { title: 'Bersihkan Gudang', objective: 'Habisi gelombang 1 & 2 di gudang', type: 'waves', wave: 2, target: { x: 0, z: 195 }, next: 'Gelombang Terakhir' },
        { title: 'Gelombang Terakhir', objective: 'Habisi gelombang terakhir, hadapi Darma', type: 'waves', wave: 3, target: { x: 0, z: 195 }, next: 'Hadapi Darma' }
      ]
    }
  ];

  M.dialogueLines = [];
  M.dialogueCb = null;
  M.dialogueIdx = 0;
  M.dialogueStatic = false;
  M.marker = null;
  M.markerPulse = 0;
  M.wave = 0;
  M.waveTimer = 0;
  M.wavesCleared = {}; // gelombang yang sudah dibersihkan (untuk tahap 'waves')
  M.collectCount = 0;
  M.escapeTimer = 0;
  M.choiceMade = false;
  M.finalChoice = null;

  M.initMissions = function () {
    // Penanda objektif 3D: silinder cahaya kuning berdenyut (ramping, tidak menutupi layar).
    var geo = new THREE.CylinderGeometry(1.6, 1.6, 14, 16, 1, true);
    var mat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.7, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    M.marker = new THREE.Mesh(geo, mat);
    M.marker.visible = false;
    TA.scene.add(M.marker);
  };

  M.current = function () {
    return M.MISSIONS[TA.state.missionIndex] || null;
  };

  M.startMission = function (i, shotMode) {
    var m = M.MISSIONS[i];
    if (!m) return;
    var s = TA.state;
    s.missionIndex = i;
    s.day = Math.min(7, m.day);
    s.missionActive = true;
    s.missionKills = 0;
    s.missionStage = 0;
    s.ghostUsedThisMission = false;
    M.wave = 0; M.waveTimer = 0; M.wavesCleared = {}; M.collectCount = 0; M.escapeTimer = 0;
    M.choiceMade = false; M.finalChoice = null;
    s.missionTarget = m.killsNeeded || m.collectNeeded || m.waves || 0;
    if (m.type === 'kill') M.spawnEnemies(m.killsNeeded, m.target.x, m.target.z);
    if (m.type === 'waves' || m.type === 'final') { M.wave = 1; M.spawnWave(1); }
    if (m.type === 'escape' && TA.state.wanted < 3) TA.police.setWanted(3);
    M.startMissionStage(i, 0);
    if (!shotMode && m.intro) {
      M.showDialogue(m.intro, null);
    }
    TA.ui.renderHUD(true);
  };

  // ---------------------------------------------------------- misi bertahap (v3.5)
  M.currentStage = function () {
    var m = M.current();
    return (m && m.stages) ? (m.stages[TA.state.missionStage] || null) : null;
  };

  // Jarak (meter) dari pemain/mobil ke objektif tahap saat ini.
  M.getObjectiveDistance = function () {
    var m = M.current();
    var st = M.currentStage();
    var t = (st && st.target) || (m && m.target);
    if (!t) return 0;
    var s = TA.state;
    var px = s.inCar && TA.car ? TA.car.x : TA.px;
    var pz = s.inCar && TA.car ? TA.car.z : TA.pz;
    return Math.round(Math.sqrt((px - t.x) * (px - t.x) + (pz - t.z) * (pz - t.z)));
  };

  M.startMissionStage = function (mi, si) {
    var m = M.MISSIONS[mi];
    if (!m || !m.stages || !m.stages[si]) return;
    var s = TA.state;
    s.missionStage = si;
    var st = m.stages[si];
    if (st.type === 'survive') st._t = st.seconds;
    if (st.target) {
      M.marker.position.set(st.target.x, 7, st.target.z);
      M.marker.visible = true;
    }
    TA.ui.renderMissionBanner();
    if (st.type === 'choice') {
      M.showBranchChoice();
    } else if (!TA.shot) {
      TA.ui.toast('TAHAP ' + (si + 1) + '/' + m.stages.length + ' — ' + st.title);
    }
  };

  M.advanceStage = function () {
    var m = M.current();
    if (!m || !TA.state.missionActive) return;
    var s = TA.state;
    if (m.type === 'collect') {
      M.collectCount++;
      s.jobsDone++;
      TA.career.addXP(10);
      TA.ui.toast('Setoran warung ' + M.collectCount + '/' + m.collectNeeded + ' ditagih.');
    }
    if (s.missionStage + 1 < m.stages.length) {
      M.startMissionStage(s.missionIndex, s.missionStage + 1);
    } else if (m.type === 'final') {
      M.finalChoiceStep();
    } else {
      M.completeMission();
    }
  };

  M.clearEnemies = function () {
    TA.enemies.forEach(function (e) { TA.scene.remove(e.group); });
    TA.enemies = [];
  };

  M.spawnEnemies = function (n, cx, cz) {
    for (var i = 0; i < n; i++) {
      M.spawnEnemy(cx + TA.rand(-14, 14), cz + TA.rand(-14, 14));
    }
  };

  M.spawnEnemy = function (x, z) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.4),
      new THREE.MeshLambertMaterial({ color: TA.pick([0x5a1a1a, 0x3a1a2a, 0x2a2a2a]) }));
    body.position.y = 0.95;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xc89070 }));
    head.position.y = 1.8;
    // Senjata di tangan.
    var gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    gun.position.set(0.4, 1.1, 0.4);
    g.add(body, head, gun);
    g.position.set(x, 0, z);
    TA.scene.add(g);
    var enemy = {
      group: g, x: x, z: z, hp: 60, alive: true,
      name: 'Anak buah Darma', shootTimer: TA.rand(1, 3)
    };
    g.userData.enemy = enemy;
    TA.enemies.push(enemy);
    return enemy;
  };

  // Gelombang musuh untuk Misi 9 & 10 (berlindung di balik kontainer).
  M.spawnWave = function (wave) {
    var m = M.current();
    var cx = m && m.target ? m.target.x : 0;
    var cz = m && m.target ? m.target.z : 195;
    var n = 3 + wave; // gelombang 1: 4, gelombang 2: 5, gelombang 3: 6
    M.spawnEnemies(n, cx, cz);
    TA.ui.toast('Gelombang ' + wave + ' dari 3 — ' + n + ' musuh di pelabuhan!');
    TA.ui.setObjective('Misi ' + m.id + ' — Gelombang ' + wave + '/3: habisi semua musuh');
  };

  M.showDialogue = function (lines, cb, staticMode) {
    M.dialogueLines = lines;
    M.dialogueCb = cb || null;
    M.dialogueIdx = 0;
    M.dialogueStatic = !!staticMode;
    TA.ui.dialogueStatic = !!staticMode;
    if (!staticMode) TA.state.mode = 'cutscene';
    TA.ui.showDialogue(lines[0], 0, lines.length);
  };

  M.advanceDialogue = function () {
    if (M.dialogueStatic) return; // shot 3: dialog tetap tampil
    M.dialogueIdx++;
    if (M.dialogueIdx >= M.dialogueLines.length) {
      TA.ui.hideDialogue();
      var cb = M.dialogueCb;
      M.dialogueCb = null;
      TA.state.mode = 'playing';
      if (cb) cb();
    } else {
      TA.ui.showDialogue(M.dialogueLines[M.dialogueIdx], M.dialogueIdx, M.dialogueLines.length);
    }
  };

  // v3.5: penyelesaian misi dinilai dari TAHAP saat ini (bukan tipe misi lama).
  // Gelombang tetap maju sendiri (Misi 9 & 10): begitu satu gelombang habis,
  // gelombang berikut muncul — tahap 'waves' mencatatnya lewat wavesCleared.
  M.checkObjective = function (dt) {
    var s = TA.state;
    var m = M.current();
    if (!m || !s.missionActive) return;
    var px = s.inCar && TA.car ? TA.car.x : TA.px;
    var pz = s.inCar && TA.car ? TA.car.z : TA.pz;

    if ((m.type === 'waves' || m.type === 'final') && TA.enemies.length === 0) {
      if (!M.wavesCleared[M.wave]) {
        M.wavesCleared[M.wave] = true;
        if (M.wave < m.waves) {
          M.wave++;
          M.waveTimer = 1.2;
        }
      }
    }

    var st = M.currentStage();
    if (!st) return;
    var dx, dz;
    if (st.type === 'reach' || st.type === 'collect') {
      dx = px - st.target.x; dz = pz - st.target.z;
      if (Math.sqrt(dx * dx + dz * dz) < 12) M.advanceStage();
    } else if (st.type === 'kill') {
      if (s.missionKills >= st.count) M.advanceStage();
    } else if (st.type === 'escape') {
      if (s.wanted <= 0) M.advanceStage();
    } else if (st.type === 'survive') {
      st._t = (st._t == null ? st.seconds : st._t) - dt;
      if (st._t <= 0) M.advanceStage();
    } else if (st.type === 'choice') {
      if (M.choiceMade) M.advanceStage();
    } else if (st.type === 'waves') {
      if (M.wavesCleared[st.wave]) M.advanceStage();
    }
  };

  // Cabang hari ke-5: bayar Darma $500 atau khianati.
  M.showBranchChoice = function () {
    TA.state.mode = 'cutscene';
    TA.ui.showChoice(
      'Darma menagih $500 malam ini. Apa yang kau lakukan, Raka?',
      [
        {
          label: 'Bayar $500 — utang berkurang, Darma tenang',
          run: function () {
            var s = TA.state;
            if (s.money >= 500) {
              s.money -= 500; s.debt -= 500;
              TA.career.addXP(50);
              TA.ui.toast('Kau bayar $500. Darma mengangguk... untuk sekarang.');
            } else {
              TA.ui.toast('Uangmu tidak cukup! Darma murka — wanted +2.');
              TA.police.setWanted(Math.min(5, s.wanted + 2));
            }
            M.choiceMade = true;
            M.advanceStage();
          }
        },
        {
          label: 'Khianati — ambil uangnya, Darma jadi musuh (+$300)',
          run: function () {
            var s = TA.state;
            s.money += 300;
            TA.career.addXP(25);
            TA.police.setWanted(Math.min(5, s.wanted + 2));
            TA.ui.toast('Kau mengkhianati Darma. Mulai sekarang, dia memburumu.');
            M.choiceMade = true;
            M.advanceStage();
          }
        }
      ]
    );
  };

  // Pilihan akhir Misi 10: tangkap Darma hidup-hidup (+200 XP) atau biarkan kabur (+$500).
  M.finalChoiceStep = function () {
    var s = TA.state;
    if (M.finalChoice) return;
    M.finalChoice = 'pending';
    s.mode = 'cutscene';
    TA.ui.showChoice(
      'Darma terpojok di ujung dermaga. Fajar naik. Keputusan terakhirmu:',
      [
        {
          label: 'Tangkap Darma hidup-hidup (+200 XP reputasi)',
          run: function () {
            TA.career.addXP(200);
            TA.ui.toast('Darma ditangkap hidup-hidup. Kota ini akhirnya aman.');
            M.finalChoice = 'capture';
            M.completeMission();
          }
        },
        {
          label: 'Biarkan Darma kabur — sita uangnya (+$500)',
          run: function () {
            TA.state.money += 500;
            TA.ui.toast('Darma kabur dengan kapal... tapi uangnya tertinggal.');
            M.finalChoice = 'escape';
            M.completeMission();
          }
        }
      ]
    );
  };

  M.completeMission = function () {
    var s = TA.state;
    var m = M.current();
    if (!m || !s.missionActive) return;
    s.missionActive = false;
    s.missionsDone++;
    s.money += m.reward;
    s.debt = Math.max(0, s.debt - Math.round(m.reward * 0.4));
    TA.career.addXP(m.xp);
    if (m.type === 'goto' || m.type === 'collect') s.jobsDone++;
    // Suasana distrik naik: misi selesai di distrik itu.
    var d = TA.world.getDistrictAt(m.target.x, m.target.z);
    if (d) TA.world.updateDistrictStanding(d.id, 8);
    if (TA.crew.isRecruited('budi')) {
      TA.ui.showCrewChatter('Budi', 'Bagus, Raka. Mobil aman, armor sudah kupulihkan.');
    }
    TA.ui.hideDialogue();
    M.marker.visible = false;
    TA.ui.toast('MISI SELESAI — ' + m.title + ' · +' + TA.fmtMoney(m.reward) + ' · +' + m.xp + ' XP');
    TA.ui.setObjective(m.outro || 'Misi selesai.');
    TA.audio.missionSound();
    TA.autosave();
    if (m.id === 10) {
      // Layar akhir setelah jeda singkat.
      setTimeout(function () { TA.winGame(); }, 1200);
      return;
    }
    var next = m.id; // indeks berikutnya (id 1 -> index 1)
    if (next < M.MISSIONS.length) {
      setTimeout(function () {
        if (TA.state.mode === 'playing') M.startMission(next);
      }, 2500);
    }
  };

  M.update = function (dt) {
    var s = TA.state;
    // Denyut penanda objektif.
    if (M.marker && M.marker.visible) {
      M.markerPulse += dt * 3;
      M.marker.material.opacity = 0.25 + Math.abs(Math.sin(M.markerPulse)) * 0.25;
      M.marker.rotation.y += dt * 0.8;
    }
    if (M.waveTimer > 0) {
      M.waveTimer -= dt;
      if (M.waveTimer <= 0) M.spawnWave(M.wave);
    }
    // Musuh menembak pemain dari jarak menengah.
    for (var i = 0; i < TA.enemies.length; i++) {
      var e = TA.enemies[i];
      if (!e.alive) continue;
      var px = s.inCar && TA.car ? TA.car.x : TA.px;
      var pz = s.inCar && TA.car ? TA.car.z : TA.pz;
      var dx = px - e.x, dz = pz - e.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      e.group.lookAt(px, 0, pz);
      e.shootTimer -= dt;
      if (d < 42 && e.shootTimer <= 0) {
        e.shootTimer = TA.rand(1.6, 3.2);
        // Akurasi musuh: 35% kena.
        if (TA.rng() < 0.35) {
          TA.player.takeDamage(TA.randi(4, 9), 'musuh');
        }
        TA.audio.enemyShotSound(e.x, e.z);
      }
      // Musuh maju mendekat bila terlalu jauh.
      if (d > 26) {
        e.x += (dx / d) * 2.2 * dt;
        e.z += (dz / d) * 2.2 * dt;
        e.group.position.set(e.x, 0, e.z);
      }
    }
    if (s.mode === 'playing') M.checkObjective(dt);
    // Sinkron fase waktu dari jam game.
    TA.world.syncTimeOfDay();
  };
})();
