/* TELUK ARUNIKA — missions.js: 10 operasi naratif bertahap, dialog, cabang, Misi 10 */
(function () {
  'use strict';
  var TA = window.TA;

  TA.MISSIONS = [
    {
      id: 1, title: 'Taksi Pertama', day: 1, reward: 120, xp: 100,
      intro: [
        { who: 'PAK AMIR', text: 'Raka, Darma menagih lagi. Tujuh hari, Nak. Tujuh hari sebelum bengkel ini disita.' },
        { who: 'RAKA', text: 'Aku tahu, Pak. Taksi dulu, kumpulkan receh. Satu penumpang demi satu penumpang.' }
      ],
      stages: [
        { title: 'JEMPUT PENUMPANG', objective: 'Jemput penumpang di Pasar Ikan.', next: 'Antar ke Pelabuhan', tx: 30, tz: 10, radius: 10 },
        { title: 'ANTAR KE PELABUHAN', objective: 'Antar penumpang ke Dermaga Senja.', next: 'Kembali ke bengkel Pak Amir', tx: 130, tz: 20, radius: 10 },
        { title: 'KEMBALI KE BENGKEL', objective: 'Kembali ke bengkel Pak Amir dan setor uang.', next: 'Misi selesai', tx: -14, tz: 14, radius: 8 }
      ]
    },
    {
      id: 2, title: 'Utang Berbunga', day: 2, reward: 180, xp: 100,
      intro: [
        { who: 'DARMA', text: 'Bunganya jalan terus, Raka. Hari ini kau tagih utang kecil itu untukku.' },
        { who: 'RAKA', text: 'Aku sopir taksi, bukan debt collector...' },
        { who: 'DARMA', text: 'Hari ini kau keduanya.' }
      ],
      stages: [
        { title: 'TEMUI SI PENAGIH', objective: 'Temui anak buah Darma di Gang Neon.', next: 'Ambil paket dari pasar', tx: 40, tz: 110, radius: 10 },
        { title: 'AMBIL PAKET', objective: 'Ambil paket titipan di Pasar.', next: 'Antar paket ke Tol Layang', tx: -20, tz: -20, radius: 10 },
        { title: 'ANTAR KE TOL', objective: 'Antar paket ke Tol Layang tanpa menarik polisi.', next: 'Misi selesai', tx: -60, tz: -130, radius: 10 }
      ]
    },
    {
      id: 3, title: 'Kontainer Hilang', day: 3, reward: 220, xp: 100,
      intro: [
        { who: 'SARI', text: 'Kontainer Darma hilang di pelabuhan. Katanya ada yang membajak kirimannya.' },
        { who: 'RAKA', text: 'Kalau aku yang menemukan, Darma berutang budi padaku. Itu bagus.' }
      ],
      stages: [
        { title: 'CEK DERMAGA', objective: 'Periksa Dermaga Senja di Pelabuhan.', next: 'Ikuti jejak ke kontainer', tx: 130, tz: -40, radius: 12 },
        { title: 'JEJAK KONTAINER', objective: 'Ikuti jejak ban ke tumpukan kontainer.', next: 'Amankan kontainer', tx: 165, tz: 60, radius: 12 },
        { title: 'AMANKAN KONTAINER', objective: 'Amankan kontainer dan kembali ke bengkel.', next: 'Misi selesai', tx: -14, tz: 14, radius: 8 }
      ]
    },
    {
      id: 4, title: 'Gang Neon', day: 4, reward: 260, xp: 100,
      intro: [
        { who: 'AGUS', text: 'Pengiriman malam ini lewat Gang Neon. Polisi pasang roadblock di jalan besar.' },
        { who: 'RAKA', text: 'Gang sempit, neon, hujan. Tempatku.' }
      ],
      stages: [
        { title: 'MASUK GANG', objective: 'Masuk Gang Lampion di distrik Gang Neon.', next: 'Ambil barang di ujung gang', tx: 30, tz: 90, radius: 10 },
        { title: 'AMBIL BARANG', objective: 'Ambil barang dari kios neon.', next: 'Kabur lewat pantai', tx: 60, tz: 150, radius: 10 },
        { title: 'KABUR LEWAT PANTAI', objective: 'Kabur lewat Pantai Senja, hindari roadblock.', next: 'Misi selesai', tx: -130, tz: 60, radius: 12 }
      ]
    },
    {
      id: 5, title: 'Pilihan Darma', day: 5, reward: 0, xp: 100, branch: true,
      intro: [
        { who: 'DARMA', text: 'Lima hari, Raka. Bayar $500 sekarang, atau... kita bicara dengan cara lain.' },
        { who: 'RAKA', text: 'Lima ratus... itu hampir semua yang kupunya.' }
      ],
      stages: [
        { title: 'TEMUI DARMA', objective: 'Temui Darma di gudang Pelabuhan.', next: 'Pilih: bayar atau khianati', tx: 150, tz: -20, radius: 12 },
        { title: 'PILIHAN', objective: 'Bayar Darma $500 ATAU khianati dan curi uangnya.', next: 'Hadapi akibatnya', tx: 150, tz: -20, radius: 12 },
        { title: 'HADAPI AKIBATNYA', objective: 'Kembali ke bengkel Pak Amir dengan selamat.', next: 'Misi selesai', tx: -14, tz: 14, radius: 8 }
      ]
    },
    {
      id: 6, title: 'Balas Dendam', day: 6, reward: 320, xp: 100,
      intro: [
        { who: 'RAKA', text: 'Regent itu — mobil Darma yang menabrak bengkel ayah dulu. Hari ini aku balas.' },
        { who: 'SARI', text: 'Aku yang nyetir kalau kau ragu. Tapi kau tidak ragu, kan?' }
      ],
      stages: [
        { title: 'LACAK REGENT', objective: 'Lacak mobil Regent Darma di Pasar.', next: 'Kejar dan hancurkan Regent', tx: -40, tz: 40, radius: 12 },
        { title: 'WRECK THE REGENT', objective: 'Tabrak dan hancurkan mobil Regent Darma!', next: 'Kabur dari kejaran polisi', tx: -90, tz: -60, radius: 14 },
        { title: 'KABUR', objective: 'Kabur dari kejaran polisi ke safehouse.', next: 'Misi selesai', tx: -14, tz: 14, radius: 8 }
      ]
    },
    {
      id: 7, title: 'Mata-mata Pelabuhan', day: 6, reward: 300, xp: 100,
      intro: [
        { who: 'AGUS', text: 'Gudang terakhir Darma dijaga ketat. Aku retas CCTV-nya, kau masuk diam-diam.' },
        { who: 'RAKA', text: 'Diam-diam. Itu bukan keahlianku, tapi coba dulu.' }
      ],
      stages: [
        { title: 'AWASI GUDANG', objective: 'Awasi gudang Darma dari Dermaga Utara.', next: 'Menyelinap ke dalam', tx: 170, tz: -120, radius: 12 },
        { title: 'MENYELINAP', objective: 'Menyelinap ke dalam gudang.', next: 'Keluar dengan bukti', tx: 150, tz: -80, radius: 10 },
        { title: 'KELUAR DENGAN BUKTI', objective: 'Keluar dari gudang membawa bukti.', next: 'Misi selesai', tx: -14, tz: 14, radius: 8 }
      ]
    },
    {
      id: 8, title: 'Jebakan di Tol', day: 7, reward: 350, xp: 100,
      intro: [
        { who: 'DARMA', text: 'Kau pikir bisa lari selamanya, Raka? Tol Arunika sudah kukunci.' },
        { who: 'SARI', text: 'Tol layang, kecepatan penuh. Pegangan!' }
      ],
      stages: [
        { title: 'NAIK KE TOL', objective: 'Naik ke Tol Layang lewat ramp barat.', next: 'Tembus blokade tol', tx: -140, tz: -130, radius: 12 },
        { title: 'TEMBUS BLOKADE', objective: 'Tembus blokade polisi di tengah tol.', next: 'Turun dan kabur', tx: 0, tz: -140, radius: 12 },
        { title: 'TURUN & KABUR', objective: 'Turun dari tol dan kabur ke Pantai.', next: 'Misi selesai', tx: -150, tz: -40, radius: 12 }
      ]
    },
    {
      id: 9, title: 'Serbuan Terakhir', day: 7, reward: 400, xp: 100,
      intro: [
        { who: 'PAK AMIR', text: 'Besok fajar, Nak. Kumpulkan krumu, siapkan senjatamu. Ini yang terakhir.' },
        { who: 'RAKA', text: 'Semua yang kita punya, Pak. Untuk bengkel ini.' }
      ],
      stages: [
        { title: 'KUMPULKAN KRU', objective: 'Kumpulkan kru di bengkel Pak Amir.', next: 'Beli amunisi & armor', tx: -14, tz: 14, radius: 8 },
        { title: 'SIAPKAN SENJATA', objective: 'Beli senjata & armor di toko Pasar.', next: 'Berkumpul di pelabuhan', tx: 14, tz: -14, radius: 8 },
        { title: 'BERKUMPUL', objective: 'Berkumpul di Dermaga Senja menjelang fajar.', next: 'Misi 10: Operasi Terakhir', tx: 130, tz: 20, radius: 10 }
      ]
    },
    {
      id: 10, title: 'Operasi Terakhir: Fajar di Pelabuhan', day: 7, reward: 1000, xp: 200, final: true,
      intro: [
        { who: 'DARMA', text: 'Raka... kau pikir bisa mengambil pelabuhanku? Anak taksi kemarin sore!' },
        { who: 'RAKA', text: 'Tujuh hari, Darma. Hari ini utangku lunas — dengan caraku.' }
      ],
      stages: [
        { title: 'GELOMBANG 1', objective: 'Lumpuhkan penjaga gelombang pertama di kontainer.', next: 'Gelombang 2: penjaga gudang', tx: 150, tz: -10, radius: 16 },
        { title: 'GELOMBANG 2', objective: 'Tembus penjaga gudang Darma.', next: 'Gelombang 3: Darma muncul', tx: 165, tz: 40, radius: 16 },
        { title: 'DARMA MUNCUL', objective: 'Hadapi Darma di Dermaga Senja.', next: 'Pilihan akhir', tx: 185, tz: 0, radius: 14 }
      ]
    }
  ];

  TA.missions = {
    dialogueLines: [], dialogueIndex: 0, dialogueDone: null,

    current: function () {
      return TA.MISSIONS[TA.state.missionIndex] || null;
    },
    currentStage: function () {
      var m = this.current();
      if (!m) return null;
      return m.stages[Math.min(TA.state.missionStage, m.stages.length - 1)];
    },
    getObjectiveDistance: function () {
      var st = this.currentStage();
      if (!st) return 0;
      return Math.round(TA.dist2d(TA.player.x, TA.player.z, st.tx, st.tz));
    },

    startMission: function (i) {
      var s = TA.state;
      var m = TA.MISSIONS[i];
      if (!m) return;
      s.missionIndex = i;
      s.missionStage = 0;
      s.missionActive = true;
      s.ghostUsedThisMission = false;
      s.day = m.day;
      this.showDialogue(m.intro.slice(), function () {
        s.mode = 'playing';
        // Dialog kru di Misi 10: satu baris per anggota yang direkrut
        if (m.id === 10) TA.crew.mission10CrewLines();
      });
    },

    startMissionStage: function (missionIdx, stageIdx) {
      TA.state.missionIndex = missionIdx;
      TA.state.missionStage = stageIdx;
      TA.state.missionActive = true;
      return this.currentStage();
    },

    advanceStage: function () {
      var s = TA.state;
      var m = this.current();
      if (!m) return;
      s.missionStage++;
      if (s.missionStage >= m.stages.length) {
        if (m.id === 10) { this.finishMission10(); return; }
        this.completeMission();
      } else {
        TA.ui.flashMission('TAHAP ' + (s.missionStage + 1) + '/' + m.stages.length + ': ' + m.stages[s.missionStage].title);
      }
    },

    checkObjective: function () {
      var s = TA.state;
      if (!s.missionActive || s.mode !== 'playing') return;
      var m = this.current();
      if (!m) return;
      if (m.id === 10) { this.checkMission10(); return; }
      var st = this.currentStage();
      if (!st) return;
      if (TA.dist2d(TA.player.x, TA.player.z, st.tx, st.tz) < st.radius) {
        if (m.branch && s.missionStage === 1 && !s.branchChoice) {
          this.offerBranchChoice();
          return;
        }
        this.advanceStage();
      }
    },

    offerBranchChoice: function () {
      var s = TA.state;
      s.mode = 'cutscene';
      TA.ui.showChoice('PILIHAN DARMA', 'Darma menagih $500. Bayar sekarang (uang -$500, wanted turun, reputasi naik) atau khianati: curi uang Darma dan kabur (uang +$800, wanted +2)?', [
        {
          label: 'BAYAR DARMA $500', fn: function () {
            s.branchChoice = 'pay';
            s.money = Math.max(0, s.money - 500);
            TA.police.setWanted(Math.max(0, s.wanted - 1), 'bayar');
            TA.world.updateDistrictStanding('pelabuhan', 5);
            TA.career.addXP(50, 'bayar Darma');
            TA.ui.hideChoice();
            s.mode = 'playing';
            TA.missions.advanceStage();
          }
        },
        {
          label: 'KHIANATI — CURI UANG DARMA', fn: function () {
            s.branchChoice = 'betray';
            s.money += 800;
            TA.police.setWanted(s.wanted + 2, 'khianat');
            TA.world.updateDistrictStanding('pelabuhan', -10);
            TA.ui.hideChoice();
            s.mode = 'playing';
            TA.missions.advanceStage();
          }
        }
      ]);
    },

    completeMission: function () {
      var s = TA.state;
      var m = this.current();
      if (!m) return;
      s.missionActive = false;
      s.stats.missionsDone++;
      s.missionDone.push(m.id);
      s.money += m.reward;
      TA.career.addXP(m.xp, 'selesaikan misi ' + m.id);
      var d = TA.world.districtAt(TA.player.x, TA.player.z);
      TA.world.updateDistrictStanding(d.id, 4);
      TA.career.saveGame(0); // autosave
      TA.ui.showRankUpCheck();
      var next = TA.MISSIONS[s.missionIndex + 1];
      if (next) {
        TA.crew.showCrewChatter('PAK AMIR', 'Misi selesai! +$' + m.reward + '. Misi berikutnya: ' + next.title + '.');
        this.startMission(s.missionIndex + 1);
      } else {
        TA.winGame();
      }
    },

    /* ---------- Misi 10 ---------- */
    spawnMission10Wave: function (wave) {
      var s = TA.state;
      s.mission10Wave = wave;
      var spots = wave === 1
        ? [[150, -20], [160, 0], [140, 10]]
        : wave === 2
          ? [[165, 30], [175, 50], [155, 55], [170, 20]]
          : [[185, -5], [180, 10], [190, 15], [175, -15]];
      for (var i = 0; i < spots.length; i++) {
        this.spawnEnemy(spots[i][0], spots[i][1], wave === 3 && i === 0 ? 'DARMA' : 'PENJAGA');
      }
      TA.crew.showCrewChatter('AGUS', 'Gelombang ' + wave + ' datang! Berlindung di balik kontainer!');
    },
    spawnEnemy: function (x, z, kind) {
      var mesh = TA.player.makePedMesh(kind === 'DARMA' ? 0x8a1a1a : 0x3a3a3a);
      var hat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), TA.world.mat(0x111111));
      hat.position.y = 2.05; mesh.add(hat);
      mesh.position.set(x, 0, z);
      TA.scene.add(mesh);
      var e = { x: x, z: z, hp: kind === 'DARMA' ? 150 : 60, kind: kind, mesh: mesh, shootTimer: TA.rand(1, 2.5), dead: false };
      TA.enemies.push(e);
      return e;
    },
    checkMission10: function () {
      var s = TA.state;
      var alive = 0;
      for (var i = 0; i < TA.enemies.length; i++) if (!TA.enemies[i].dead) alive++;
      var st = this.currentStage();
      if (st && TA.dist2d(TA.player.x, TA.player.z, st.tx, st.tz) < st.radius && alive === 0) {
        if (s.missionStage < 2) {
          s.missionStage++;
          this.spawnMission10Wave(s.missionStage + 1);
          TA.ui.flashMission('TAHAP ' + (s.missionStage + 1) + '/3: ' + st.title);
        } else {
          this.finishMission10();
        }
      }
    },
    finishMission10: function () {
      var s = TA.state;
      s.mode = 'cutscene';
      TA.ui.showChoice('PILIHAN AKHIR — DARMA TAK BERDAYA',
        'Darma terpojok di ujung dermaga. Tangkap dia hidup-hidup untuk polisi (reputasi +200 XP) atau biarkan dia kabur dengan perahu (uang +$500)?',
        [
          {
            label: 'TANGKAP DARMA HIDUP-HIDUP (+200 XP)', fn: function () {
              s.mission10Choice = 'capture';
              TA.career.addXP(200, 'tangkap Darma hidup-hidup');
              s.missionActive = false;
              s.stats.missionsDone++;
              s.missionDone.push(10);
              s.money += 1000;
              TA.career.saveGame(0);
              TA.ui.hideChoice();
              TA.winGame();
            }
          },
          {
            label: 'BIARKAN KABUR (+$500)', fn: function () {
              s.mission10Choice = 'escape';
              s.money += 500 + 1000;
              s.missionActive = false;
              s.stats.missionsDone++;
              s.missionDone.push(10);
              TA.career.saveGame(0);
              TA.ui.hideChoice();
              TA.winGame();
            }
          }
        ]);
    },

    /* ---------- dialog ---------- */
    showDialogue: function (lines, done) {
      this.dialogueLines = lines.slice();
      this.dialogueIndex = 0;
      this.dialogueDone = done || null;
      TA.state.mode = 'cutscene';
      this.renderDialogue();
    },
    renderDialogue: function () {
      var line = this.dialogueLines[this.dialogueIndex];
      if (!line) { this.endDialogue(); return; }
      TA.ui.showDialogue(line.who, line.text);
    },
    advanceDialogue: function () {
      this.dialogueIndex++;
      if (this.dialogueIndex >= this.dialogueLines.length) this.endDialogue();
      else this.renderDialogue();
    },
    endDialogue: function () {
      TA.ui.hideDialogue();
      var done = this.dialogueDone;
      this.dialogueDone = null;
      TA.state.mode = 'playing';
      if (done) done();
    },

    update: function (dt) {
      this.checkObjective();
      // Musuh Misi 10 menembak
      for (var i = 0; i < TA.enemies.length; i++) {
        var e = TA.enemies[i];
        if (e.dead) continue;
        e.shootTimer -= dt;
        var d = TA.dist2d(TA.player.x, TA.player.z, e.x, e.z);
        if (d < 55) {
          // Hadap pemain
          e.mesh.rotation.y = Math.atan2(TA.player.x - e.x, TA.player.z - e.z);
          if (e.shootTimer <= 0) {
            e.shootTimer = TA.rand(1.2, 2.6);
            if (TA.rng() < 0.55) TA.player.takeDamage(e.kind === 'DARMA' ? 9 : 5);
            TA.audio.enemyShotSound();
          }
        }
      }
    }
  };
})();
