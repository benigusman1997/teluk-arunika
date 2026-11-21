/* missions.js — Teluk Arunika v3.8. 10 operasi naratif dalam 3 bab, tiap misi
   3-4 tahap (Misi 6 & 10: 4 tahap; Misi 7 bank heist: 7 tahap), kontrak sindikat,
   cabang hari ke-5, Kontrak Hancur (wreck-the-target), Ekspor Mobil, dialog. */
(function () {
  'use strict';
  var TA = window.TA;

  var ACTS = [
    { id: 1, name: 'BAB I — UTANG', num: 'BAB I', missions: [0, 1, 2] },
    { id: 2, name: 'BAB II — SINDIKAT', num: 'BAB II', missions: [3, 4, 5, 6] },
    { id: 3, name: 'BAB III — FAJAR', num: 'BAB III', missions: [7, 8, 9] },
  ];
  var ACT_NAMES = { 1: 'Utang', 2: 'Sindikat', 3: 'Fajar' };

  var SYNDICATES = ['DARMA WIYAYA', 'GENG KERONO', 'KELO ARMS'];

  /* Misi: judul, bab, sindikat, hadiah, tahap (judul + objektif + next). */
  var MISSIONS = [
    { title: 'UTANG PERTAMA', act: 1, syndicate: 'DARMA WIYAYA', reward: 500, stages: [
      { title: 'TEMUI PAK AMIR', objective: 'Pergi ke bengkel Pak Amir di Pelabuhan', next: 'Dengarkan perintah Darma' },
      { title: 'ANTAR PAKET', objective: 'Antar paket ke Pasar Senja tanpa ketahuan', next: 'Kembali ke bengkel' },
      { title: 'BAYAR CICILAN', objective: 'Serahkan $500 ke penagih Darma', next: 'Hari 1 selesai' } ] },
    { title: 'GOLD PAINT', act: 1, syndicate: 'GENG KERONO', reward: 700, stages: [
      { title: 'CURI PELABUHAN GT', objective: 'Curi PELABUHAN GT emas di Pelabuhan', next: 'Bawa ke bengkel cat' },
      { title: 'GANTI WARNA', objective: 'Respray di garage — wanted turun', next: 'Antar ke pembeli' },
      { title: 'SERAHKAN MOBIL', objective: 'Antar mobil ke pembeli di Gang Neon', next: 'Misi selesai' } ] },
    { title: 'OFF THE FERRY', act: 1, syndicate: 'DARMA WIYAYA', reward: 900, stages: [
      { title: 'JEMPUT DI DERMAGA', objective: 'Jemput kurir di Dermaga Senja', next: 'Kabur dari patroli' },
      { title: 'KEJAR-KEJARAN', objective: 'Lolos dari 2 mobil patroli', next: 'Antar kurir ke safehouse' },
      { title: 'SELESAIKAN ANTARAN', objective: 'Antar kurir ke safehouse Pantai', next: 'Hari 3 selesai' } ] },
    { title: 'JALAN TIKUS', act: 2, syndicate: 'GENG KERONO', reward: 1100, stages: [
      { title: 'MASUK GANG NEON', objective: 'Sampai ke Gang Neon tanpa wanted', next: 'Temui informan' },
      { title: 'TEMUI INFORMAN', objective: 'Dengarkan info rute Kerono', next: 'Ambil paket rahasia' },
      { title: 'BAWA PAKET', objective: 'Bawa paket ke Pasar Senja', next: 'Misi selesai' } ] },
    { title: 'PILIHAN DARMA', act: 2, syndicate: 'DARMA WIYAYA', reward: 1500, stages: [
      { title: 'CABANG HARI KE-5', objective: 'PILIH: bayar Darma $500 ATAU khianati dia', next: 'Hadapi akibat pilihanmu' },
      { title: 'HADAPI AKIBAT', objective: 'Bayar utang / lawan anak buah Darma', next: 'Kembali ke bengkel' },
      { title: 'RAMPUNG', objective: 'Laporan ke Pak Amir', next: 'Bab II berlanjut' } ] },
    { title: 'WRECK THE REGENT', act: 2, syndicate: 'KELO ARMS', reward: 2000, stages: [
      { title: 'LACAK REGENT', objective: 'Temukan mobil Regent di Tol Layang', next: 'Kejar Regent' },
      { title: 'KEJAR REGENT', objective: 'Kejar Regent sebelum sampai tujuan', next: 'Hancurkan Regent' },
      { title: 'HANCURKAN REGENT', objective: 'Tabrak / tembak Regent sampai hancur', next: 'Hilang dari pantauan' },
      { title: 'VANISH', objective: 'Hilang dari pantauan polisi', next: 'Misi selesai' } ] },
    { title: 'PERAMPOKAN BANK ARUNIKA', act: 2, syndicate: 'DARMA WIYAYA', reward: 25000, stages: [
      { title: 'SAMPAI DI BANK ARUNIKA', objective: 'Tuju plaza Bank Arunika', next: 'Lumpuhkan alarm' },
      { title: 'LUMPUHKAN ALARM', objective: 'Tahan E 5 dtk di panel alarm', next: 'Habisi penjaga bank' },
      { title: 'HABISI PENJAGA BANK', objective: 'Habisi 9 penjaga bank di plaza', next: 'Bobol brankas' },
      { title: 'BOBOL BRANKAS', objective: 'Tahan E di brankas — timer 10 dtk', next: 'Ambil uang' },
      { title: 'AMBIL UANG', objective: 'Ambil tas uang — uang bertambah', next: 'Kabur dari bank' },
      { title: 'KABUR DARI BANK', objective: 'Keluar pintu depan — wanted langsung 4', next: 'Hilangkan jejak' },
      { title: 'HILANGKAN JEJAK', objective: 'Lolos dari kejar-kejaran wanted 4-5', next: 'Misi selesai' } ] },
    { title: 'ABU DAN BARA', act: 3, syndicate: 'KELO ARMS', reward: 800, stages: [
      { title: 'SEBERANGI JEMBATAN', objective: 'Seberangi jembatan ke Pulau Abu', next: 'Masuk kawah' },
      { title: 'MASUK KAWAH', objective: 'Ambil kiriman di kawah Pulau Abu', next: 'Kabur dari kawah' },
      { title: 'KABUR DARI KAWAH', objective: 'Kembali ke Pelabuhan sebelum meletus', next: 'Misi selesai' } ] },
    { title: 'BADAI TERAKHIR', act: 3, syndicate: 'GENG KERONO', reward: 1800, stages: [
      { title: 'HADANG KONVOI', objective: 'Hadang konvoi Kerono di Tol Layang', next: 'Rebut muatan' },
      { title: 'REBUT MUATAN', objective: 'Rebut muatan dari konvoi', next: 'Antar ke safehouse' },
      { title: 'ANTAR KE SAFEHOUSE', objective: 'Antar muatan ke safehouse', next: 'Misi selesai' } ] },
    { title: 'OPERASI TERAKHIR: FAJAR DI PELABUHAN', act: 3, syndicate: 'DARMA WIYAYA', reward: 5000, stages: [
      { title: 'SERBU GUDANG', objective: 'Serbu gudang terakhir Darma di Pelabuhan', next: 'Gelombang 2' },
      { title: 'GELOMBANG KEDUA', objective: 'Tahan gelombang kedua di balik kontainer', next: 'Gelombang terakhir' },
      { title: 'GELOMBANG TERAKHIR', objective: 'Bersihkan gudang — ELANG-1 menutup jalan kabur', next: 'Hadapi Darma' },
      { title: 'HADAPI DARMA', objective: 'PILIH: tangkap Darma hidup-hidup (+200 XP) atau biarkan kabur (+$500)', next: 'Utang lunas' } ] },
  ];

  var BANK_HEIST_STAGES = MISSIONS[6].stages.map(function (st) { return st.title; });

  /* ---------- Kontrak Hancur (side job, bukan misi ke-11) ---------- */
  var WRECK_CONTRACTS = [
    { key: 'komet', name: 'KOMET MERAH', dest: 'Pelabuhan', route: 'Pantai → Pelabuhan', reward: 1200, xp: 60, start: { x: 1150, y: 2080 }, destPos: { x: 420, y: 480 } },
    { key: 'harimau', name: 'HARIMAU SEDAN', dest: 'Tol Layang', route: 'Pasar → Tol Layang', reward: 800, xp: 60, start: { x: 1400, y: 700 }, destPos: { x: 1800, y: 1325 } },
    { key: 'srikandi', name: 'SRIKANDI GT', dest: 'Pulau Abu', route: 'Pelabuhan → Pulau Abu', reward: 1500, xp: 60, start: { x: 700, y: 600 }, destPos: { x: 3300, y: 2150 } },
  ];

  var dialogueQueue = [], dialogueIdx = 0;

  function getActForMission(i) {
    for (var a = 0; a < ACTS.length; a++) if (ACTS[a].missions.indexOf(i) >= 0) return ACTS[a];
    return ACTS[0];
  }
  function getMissionContract(i) {
    var m = MISSIONS[i];
    return 'KONTRAK: ' + m.syndicate + ' — $' + String(m.reward).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function startMission(i) {
    var s = TA.state;
    s.mission = { index: i, stage: 0 };
    s.bankGuardsDown = 0;
    showMissionIntro(i);
    if (TA.crew) TA.crew.showCrewChatter('SARI', 'Misi ' + (i + 1) + ': ' + MISSIONS[i].title + ' — ayo jalan!');
  }
  function startMissionStage(i, stage) {
    var s = TA.state;
    s.mission = { index: i, stage: stage };
  }
  function advanceStage() {
    var s = TA.state;
    if (!s.mission) return;
    var m = MISSIONS[s.mission.index];
    if (s.mission.stage < m.stages.length - 1) {
      s.mission.stage++;
    } else {
      completeMission(s.mission.index);
    }
    if (TA.ui) TA.ui.renderAll(true);
  }
  function getObjectiveDistance() {
    var s = TA.state;
    if (!s.mission) return 0;
    var targets = [[1550, 500], [2400, 500], [420, 700], [1200, 1400], [1550, 1300], [2000, 1325], [1550, 500], [3300, 2150], [2000, 1325], [420, 480]];
    var t = targets[s.mission.index] || [1500, 1300];
    var dx = t[0] - s.player.x, dy = t[1] - s.player.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 0.45);
  }
  function completeMission(i) {
    var s = TA.state;
    var m = MISSIONS[i];
    s.missionDone[i] = true;
    s.money += m.reward;
    s.mission = null;
    if (TA.career) TA.career.addXP(100);
    if (i === 9) {
      if (TA.core) TA.core.winGame();
      return;
    }
    if (i + 1 < MISSIONS.length) startMission(i + 1);
  }
  function checkObjective() {
    var s = TA.state;
    if (!s.mission) return;
    if (getObjectiveDistance() < 60) advanceStage();
  }
  function showDialogue(lines) {
    dialogueQueue = lines.slice(); dialogueIdx = 0;
    TA.state.mode = 'cutscene';
    if (TA.ui) TA.ui.showDialogue(dialogueQueue[0]);
  }
  function advanceDialogue() {
    dialogueIdx++;
    if (dialogueIdx >= dialogueQueue.length) {
      TA.state.mode = 'playing';
      if (TA.ui) TA.ui.hideDialogue();
    } else if (TA.ui) TA.ui.showDialogue(dialogueQueue[dialogueIdx]);
  }
  function showMissionIntro(i) {
    if (TA.ui) TA.ui.showMissionIntro(i);
  }

  /* ---------- bank heist ---------- */
  function startBankHeist() { startMission(6); }
  function updateBankHeist(dt) {
    var s = TA.state;
    if (!s.mission || s.mission.index !== 6) return;
    if (s.mission.stage === 2 && s.bankGuardsDown >= 9) advanceStage();
    if (s.mission.stage === 5) { if (TA.police) TA.police.setWanted(4, 'PERAMPOKAN BANK'); }
  }
  function getBankGuardsRemaining() { return Math.max(0, 9 - TA.state.bankGuardsDown); }

  /* ---------- Kontrak Hancur ---------- */
  function startWreckContract(key) {
    var s = TA.state;
    var c = null;
    for (var i = 0; i < WRECK_CONTRACTS.length; i++) if (WRECK_CONTRACTS[i].key === key) c = WRECK_CONTRACTS[i];
    if (!c) return;
    s.wreck = {
      key: c.key, name: c.name, hp: 100, maxHp: 100, distKm: 0.46,
      dest: c.dest, route: c.route, reward: c.reward, xp: c.xp,
      active: true, status: 'NEXT',
      targetPos: { x: c.start.x, y: c.start.y }, destPos: { x: c.destPos.x, y: c.destPos.y },
    };
    if (TA.ui) TA.ui.renderAll(true);
  }
  function updateWreckContract(dt) {
    var s = TA.state;
    var w = s.wreck;
    if (!w || !w.active) return;
    /* target kabur menuju destinasi */
    var dx = w.destPos.x - w.targetPos.x, dy = w.destPos.y - w.targetPos.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > 8) {
      var sp = 70;
      w.targetPos.x += (dx / d) * sp * dt;
      w.targetPos.y += (dy / d) * sp * dt;
    }
    w.distKm = Math.max(0, Math.round((d * 0.45 / 1000) * 100) / 100);
    /* tabrakan pemain merusak target */
    var pdx = w.targetPos.x - s.player.x, pdy = w.targetPos.y - s.player.y;
    if (pdx * pdx + pdy * pdy < 2600 && !s.player.onFoot && Math.abs(s.car.speed || 0) > 30) {
      w.hp = Math.max(0, w.hp - 26 * dt);
      s.car.speed *= 0.85;
    }
    if (w.hp <= 0) {
      w.active = false; w.status = 'DONE';
      s.wreckDone[w.key] = true;
      s.money += w.reward;
      if (TA.career) TA.career.addXP(w.xp);
      if (TA.crew) TA.crew.showCrewChatter('BUDI', w.name + ' hancur! Ambil hadiah di bengkel Pak Amir.');
      if (TA.ui) TA.ui.showBanner('KONTRAK SELESAI', w.name + ' dihancurkan — $' + w.reward + ' + ' + w.xp + ' XP');
    } else if (w.distKm <= 0.01 && d < 20) {
      w.active = false; w.status = 'GAGAL';
      if (TA.crew) TA.crew.showCrewChatter('SARI', w.name + ' sampai di ' + w.dest + ' — kontrak gagal, bisa diulang!');
      if (TA.ui) TA.ui.showBanner('KONTRAK GAGAL', w.name + ' lolos ke ' + w.dest + ' — coba lagi!');
    }
  }

  /* ---------- Ekspor Mobil ---------- */
  function startCarExport() {
    var s = TA.state;
    s.carExport = { target: 'PELABUHAN GT emas', active: true, dest: { x: 420, y: 480 } };
    if (TA.crew) TA.crew.showCrewChatter('AGUS', 'Ekspor: curi PELABUHAN GT emas, antar ke eksportir Pelabuhan.');
  }
  function completeCarExport() {
    var s = TA.state;
    if (!s.carExport || !s.carExport.active) return;
    s.carExport.active = false;
    s.money += 2500;
    if (TA.career) TA.career.addXP(80);
  }

  function update(dt) {
    /* staged screenshot (?shot=N): bekukan logika misi supaya nilai yang
       di-stage (HP target, jarak, tahap) tidak bergeser saat difoto. */
    if (TA.state.shot > 0) return;
    updateBankHeist(dt);
    updateWreckContract(dt);
    checkObjective();
  }

  function render(ox, oy) {
    var ctx = TA.ctx; if (!ctx) return;
    var s = TA.state;
    /* target kontrak hancur: mobil merah + garis rute merah ke destinasi */
    if (s.wreck && s.wreck.active) {
      var w = s.wreck, t = w.targetPos;
      ctx.strokeStyle = 'rgba(255,40,40,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(t.x - ox, t.y - oy); ctx.lineTo(w.destPos.x - ox, w.destPos.y - oy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(t.x - ox, t.y - oy);
      ctx.fillStyle = '#d82020'; ctx.fillRect(-24, -12, 48, 24);
      ctx.fillStyle = '#ffd23a'; ctx.fillRect(-6, -10, 14, 20);
      ctx.restore();
      ctx.fillStyle = '#ff4040'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(w.name + '  ♥ ' + Math.round(w.hp), t.x - ox, t.y - oy - 24);
      /* marker destinasi */
      ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(w.destPos.x - ox, w.destPos.y - oy, 12, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
      ctx.fillText('★', w.destPos.x - ox, w.destPos.y - oy + 4);
    }
    /* penjaga bank bertanda merah (Misi 7 tahap 3) */
    if (s.mission && s.mission.index === 6 && s.mission.stage === 2) {
      for (var g = 0; g < getBankGuardsRemaining(); g++) {
        var gx = 1450 + (g % 3) * 70, gy = 560 + Math.floor(g / 3) * 55;
        ctx.fillStyle = '#c22a2a'; ctx.beginPath(); ctx.arc(gx - ox, gy - oy, 9, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('!', gx - ox, gy - oy + 3);
      }
      /* van hitam getaway */
      ctx.fillStyle = '#18181c'; ctx.fillRect(1700 - ox, 620 - oy, 64, 26);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VAN GETAWAY', 1732 - ox, 612 - oy);
    }
    /* marker objektif misi */
    if (s.mission) {
      var targets = [[1550, 500], [2400, 500], [420, 700], [1200, 1400], [1550, 1300], [2000, 1325], [1550, 500], [3300, 2150], [2000, 1325], [420, 480]];
      var tg = targets[s.mission.index] || [1500, 1300];
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(tg[0] - ox, tg[1] - oy, 10, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#222'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('◆', tg[0] - ox, tg[1] - oy + 4);
    }
  }

  TA.missions = {
    MISSIONS: MISSIONS, ACTS: ACTS, ACT_NAMES: ACT_NAMES, SYNDICATES: SYNDICATES,
    BANK_HEIST_STAGES: BANK_HEIST_STAGES, WRECK_CONTRACTS: WRECK_CONTRACTS,
    startMission: startMission, startMissionStage: startMissionStage,
    advanceStage: advanceStage, completeMission: completeMission,
    showDialogue: showDialogue, advanceDialogue: advanceDialogue,
    checkObjective: checkObjective, getObjectiveDistance: getObjectiveDistance,
    getActForMission: getActForMission, getMissionContract: getMissionContract,
    showMissionIntro: showMissionIntro,
    startBankHeist: startBankHeist, updateBankHeist: updateBankHeist, getBankGuardsRemaining: getBankGuardsRemaining,
    startWreckContract: startWreckContract, updateWreckContract: updateWreckContract,
    startCarExport: startCarExport, completeCarExport: completeCarExport,
    update: update, render: render,
  };
})();
