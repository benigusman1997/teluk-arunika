/* ui.js — HUD + minimap + peta penuh bertab + title screen + wheel + banner */
(function () {
  'use strict';
  var TA = window.TA;
  TA.ui = TA.ui || {};

  function el(id) { return document.getElementById(id); }
  function show(id) { var e = el(id); if (e) e.classList.remove('hidden'); }
  function hide(id) { var e = el(id); if (e) e.classList.add('hidden'); }

  var toastT = 0;
  var rankupT = 0;

  function init() {
    var bn = el('btn-new');
    if (bn) bn.addEventListener('click', function () { TA.startNewGame(); });
    var bc = el('btn-continue');
    if (bc) bc.addEventListener('click', function () { TA.continueGame(); });
    var bct = el('btn-controls');
    if (bct) bct.addEventListener('click', function () {
      el('controls-panel').classList.toggle('hidden');
      el('settings-panel').classList.add('hidden');
    });
    var bs = el('btn-settings');
    if (bs) bs.addEventListener('click', function () {
      el('settings-panel').classList.toggle('hidden');
      el('controls-panel').classList.add('hidden');
    });
    var tabs = document.querySelectorAll('.map-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        TA.S.mapTab = this.getAttribute('data-tab');
        renderMapTabs();
      });
    }
    var slots = document.querySelectorAll('.save-slot');
    for (var j = 0; j < slots.length; j++) {
      slots[j].addEventListener('click', function () {
        var s = parseInt(this.getAttribute('data-slot'), 10);
        if (TA.S.screen === 'paused' || TA.S.screen === 'map') TA.saveGame(s);
        else if (TA.S.screen === 'title') TA.continueGame();
      });
    }
    var bsg = el('btn-save-game');
    if (bsg) bsg.addEventListener('click', function () { TA.saveGame(1); });
    var mc = el('map-canvas');
    if (mc) mc.addEventListener('click', function (e) {
      var r = mc.getBoundingClientRect();
      var wx = (e.clientX - r.left) / r.width * 4200;
      var wy = (e.clientY - r.top) / r.height * 3200;
      TA.S.waypoint = { x: Math.round(wx), y: Math.round(wy) };
      var wl = el('waypoint-line');
      if (wl) wl.textContent = 'Waypoint: ' + Math.round(TA.dist(TA.S.px, TA.S.py, wx, wy) / 10) + ' m — garis rute digambar di peta';
      renderFullMapCanvas();
    });
    renderSaveSlots();
  }
  TA.ui.init = init;

  function renderSaveSlots() {
    var slots = document.querySelectorAll('#save-slots .save-slot, #pause-saves .save-slot');
    for (var i = 0; i < slots.length; i++) {
      var s = TA.S.saveSlots[i];
      var span = slots[i].querySelector('span');
      if (span && s) span.textContent = 'Hari ' + s.day + ' · ' + TA.fmtRp(s.money) + ' · Misi ' + s.mission + '/10';
    }
  }
  TA.ui.renderSaveSlots = renderSaveSlots;

  /* ---------- screens ---------- */
  function showTitleScreen() {
    TA.S.screen = 'title';
    show('title-screen');
    hide('hud'); hide('full-map'); hide('pause-screen'); hide('mission-intro');
    hide('dialogue-box'); hide('crew-panel'); hide('end-screen');
    renderSaveSlots();
  }
  TA.ui.showTitleScreen = showTitleScreen;

  function showHUD() {
    hide('title-screen'); hide('full-map'); hide('pause-screen');
    hide('mission-intro'); hide('dialogue-box'); hide('end-screen');
    show('hud');
    renderMissionBanner();
    renderRankRow();
    renderCrewRow();
    renderCrewCards();
    renderWeaponWheel();
    renderDispatchPanel();
    renderRadioLine();
  }
  TA.ui.showHUD = showHUD;

  function showPauseScreen() {
    show('pause-screen');
    var r = TA.career.getRank();
    var pc = el('pause-career');
    if (pc) pc.innerHTML = 'KARIER — TINGKAT ' + r.level + ' · ' + r.name + ' — ' + TA.S.xp + ' / ' + (r.next ? r.next.xp : 'MAX') + ' XP<br>Perk terbuka: ' + r.perk + '<br>Uang: ' + TA.fmtRp(TA.S.money) + ' · Hari ' + TA.S.day + '/7 · ' + TA.fmtClock() + ' · ' + TA.S.weather;
    var pr = el('pause-crew');
    if (pr) {
      var names = TA.crew.recruited().map(function (id) {
        for (var i = 0; i < TA.crew.CREW.length; i++) if (TA.crew.CREW[i].id === id) return TA.crew.CREW[i].name;
        return id;
      }).join(', ');
      pr.textContent = 'KRU: ' + (names || 'belum ada') + ' · Misi ' + TA.S.mission + '/10 · Koin ' + TA.S.coins + '/12 · Lompatan ' + TA.S.jumps + '/5';
    }
    renderSaveSlots();
  }
  TA.ui.showPauseScreen = showPauseScreen;

  function hidePauseScreen() { hide('pause-screen'); }
  TA.ui.hidePauseScreen = hidePauseScreen;

  function showFullMap() {
    TA.S.screen = 'map';
    hide('title-screen'); hide('hud'); hide('pause-screen');
    show('full-map');
    renderMapTabs();
    renderFullMapCanvas();
  }
  TA.ui.showFullMap = showFullMap;

  function closeFullMap() {
    hide('full-map');
    TA.S.screen = 'playing';
    show('hud');
  }
  TA.ui.closeFullMap = closeFullMap;

  function renderMapTabs() {
    var tabs = document.querySelectorAll('.map-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === TA.S.mapTab);
    }
    // panel yang tampil mengikuti tab aktif (agar CERITA + STATISTIK muat
    // dalam satu layar tanpa scroll, dan PETA menampilkan legenda + standing)
    var showPanels = {
      peta: ['current-mission-panel', 'legend-panel', 'standing-panel'],
      cerita: ['current-mission-panel', 'story-panel', 'stats-panel'],
      statistik: ['stats-panel', 'standing-panel'],
      kru: ['current-mission-panel', 'story-panel', 'stats-panel'],
      pengaturan: ['current-mission-panel', 'legend-panel', 'standing-panel'],
      kontrol: ['current-mission-panel', 'legend-panel', 'standing-panel'],
      simpan: ['current-mission-panel', 'stats-panel']
    };
    var visible = showPanels[TA.S.mapTab] || showPanels.peta;
    var all = ['current-mission-panel', 'story-panel', 'stats-panel', 'legend-panel', 'standing-panel'];
    for (var j = 0; j < all.length; j++) {
      var p = el(all[j]);
      if (p) p.classList.toggle('hidden', visible.indexOf(all[j]) < 0);
    }
    renderStoryList();
    renderCareerStats();
    renderLegend();
    renderDistrictStandingPanel();
    renderCurrentMission();
    renderFullMapCanvas();
  }
  TA.ui.renderMapTabs = renderMapTabs;

  function renderCurrentMission() {
    var m = TA.missions.mission(TA.S.mission);
    var act = TA.missions.getActForMission(TA.S.mission);
    var t = el('cm-title');
    if (t) t.textContent = 'MISI ' + m.n + ' DARI 10 · ' + act.name + ' — ' + act.title + ' — ' + m.name;
    var d = el('cm-desc');
    if (d) d.textContent = m.objective + ' Tahap ' + TA.S.stage + '/' + m.stages.length + ': ' + m.stages[TA.S.stage - 1] + '.';
    var c = el('cm-contract');
    if (c) c.textContent = TA.missions.getMissionContract(m.n);
  }

  function renderStoryList() {
    var list = el('story-list');
    if (!list) return;
    var html = '';
    for (var n = 1; n <= 10; n++) {
      var m = TA.missions.mission(n);
      var act = TA.missions.getActForMission(n);
      var st = TA.missions.missionStatus(n);
      var cls = st === 'DONE' ? 'done' : (st === 'NEXT' ? 'next' : 'locked');
      html += '<div class="story-row ' + cls + '"><span class="st-name">' + m.name.toUpperCase() + '</span>' +
        '<span class="st-meta">' + act.name + ' · ' + act.title.toUpperCase() + ' · ' + TA.fmtDollar(m.reward) + '</span>' +
        '<span class="st-status">' + st + '</span></div>';
    }
    list.innerHTML = html;
  }
  TA.ui.renderStoryList = renderStoryList;

  function renderCareerStats() {
    var box = el('career-stats');
    if (!box) return;
    var stats = TA.career.careerStats();
    var html = '';
    for (var i = 0; i < stats.length; i++) {
      html += '<span class="cs-label">' + stats[i].label + '</span><span class="cs-value">' + stats[i].value + '</span>';
    }
    box.innerHTML = html;
  }
  TA.ui.renderCareerStats = renderCareerStats;

  function renderLegend() {
    var box = el('legend-list');
    if (!box) return;
    box.innerHTML = '<span>◆ Misi</span><span>◉ Respray</span><span>⌂ Safehouse</span><span>★ Side job</span><span>● Polisi</span><span>▣ Ekspor Mobil</span><span>⚑ Waypoint</span><span>◍ Koin Arunika</span>';
  }

  function renderDistrictStandingPanel() {
    var box = el('district-standing-list');
    if (!box) return;
    var html = '';
    var ds = TA.career.DISTRICTS;
    for (var i = 0; i < ds.length; i++) {
      html += '<div class="stand-row"><span class="sd-name">' + ds[i].name + '</span>' +
        '<span class="sd-bar"><span class="sd-fill" style="display:block;width:' + ds[i].standing + '%"></span></span>' +
        '<span class="sd-val">' + ds[i].standing + '%</span></div>';
    }
    box.innerHTML = html;
  }
  TA.ui.renderDistrictStandingPanel = renderDistrictStandingPanel;

  function renderFullMapCanvas() {
    var cv = el('map-canvas');
    if (!cv || el('full-map').classList.contains('hidden')) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var sx = W / 4200, sy = H / 3200;
    ctx.fillStyle = '#0c1226';
    ctx.fillRect(0, 0, W, H);
    var ds = TA.world.DISTRICTS;
    for (var i = 0; i < ds.length; i++) {
      ctx.fillStyle = ds[i].ground;
      ctx.fillRect(ds[i].x * sx, ds[i].y * sy, ds[i].w * sx, ds[i].h * sy);
    }
    ctx.strokeStyle = '#232838';
    ctx.lineWidth = 6;
    for (var gx = 0; gx <= 10; gx++) { ctx.beginPath(); ctx.moveTo(gx * 400 * sx, 0); ctx.lineTo(gx * 400 * sx, H); ctx.stroke(); }
    for (var gy = 0; gy <= 8; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * 400 * sy); ctx.lineTo(W, gy * 400 * sy); ctx.stroke(); }
    // label distrik digambar SETELAH jalan agar tidak tertutup garis jalan
    for (var li = 0; li < ds.length; li++) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(ds[li].name + ' ' + TA.career.districtStanding(ds[li].name) + '%', ds[li].x * sx + 8, ds[li].y * sy + 18);
    }
    // bank
    var B = TA.world.BANK;
    ctx.fillStyle = '#c8b98a';
    ctx.fillRect(B.x * sx, B.y * sy, B.w * sx, B.h * sy);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('BANK ARUNIKA', B.x * sx + 2, B.y * sy + B.h * sy + 14);
    // koin
    ctx.fillStyle = '#ffd23e';
    var st = TA.world.stashes();
    for (var s = 0; s < st.length; s++) {
      if (st[s].taken) continue;
      ctx.beginPath(); ctx.arc(st[s].x * sx, st[s].y * sy, 4, 0, Math.PI * 2); ctx.fill();
    }
    // safehouse
    ctx.fillStyle = '#6db3ff';
    ctx.fillRect(900 * sx - 5, 1500 * sy - 5, 10, 10);
    // waypoint + garis rute
    if (TA.S.waypoint) {
      ctx.strokeStyle = '#ffd23e';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(TA.S.px * sx, TA.S.py * sy);
      ctx.lineTo(TA.S.waypoint.x * sx, TA.S.waypoint.y * sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(TA.S.waypoint.x * sx, TA.S.waypoint.y * sy, 6, 0, Math.PI * 2); ctx.fill();
    }
    // pemain
    ctx.fillStyle = '#37d67a';
    ctx.beginPath(); ctx.arc(TA.S.px * sx, TA.S.py * sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('RAKA', TA.S.px * sx + 10, TA.S.py * sy + 4);
  }
  TA.ui.renderFullMapCanvas = renderFullMapCanvas;

  /* ---------- intro / dialogue / end ---------- */
  function showMissionIntro(n, m, act) {
    show('mission-intro');
    hide('hud');
    var k = el('intro-kicker');
    if (k) k.textContent = 'MISI ' + n + ' · ' + act.name + ' — ' + act.title.toUpperCase();
    var t = el('intro-title');
    if (t) t.textContent = m.name.toUpperCase();
    var r = el('intro-reward');
    if (r) r.textContent = TA.missions.getMissionContract(n);
    var d = el('intro-dialogue');
    if (d) d.textContent = m.dialogue[0][0] + ': "' + m.dialogue[0][1] + '"';
  }
  TA.ui.showMissionIntro = showMissionIntro;

  function hideMissionIntro() { hide('mission-intro'); }
  TA.ui.hideMissionIntro = hideMissionIntro;

  function showDialogue(name, text) {
    show('dialogue-box');
    var n = el('dialogue-name'); if (n) n.textContent = name;
    var t = el('dialogue-text'); if (t) t.textContent = text;
  }
  TA.ui.showDialogue = showDialogue;

  function hideDialogue() { hide('dialogue-box'); }
  TA.ui.hideDialogue = hideDialogue;

  function showEndScreen() {
    show('end-screen');
    hide('hud');
    var r = TA.career.getRank();
    var box = el('end-stats');
    if (box) box.innerHTML = 'Misi selesai: 10/10 · XP: ' + TA.S.xp + ' · Peringkat akhir: ' + r.name +
      '<br>Uang: ' + TA.fmtRp(TA.S.money) + ' · Mobil dicuri: ' + TA.S.carsStolen +
      ' · Koin: ' + TA.S.coins + '/12 · Lompatan: ' + TA.S.jumps + '/5 · Balapan: ' + TA.S.racesWon + ' menang';
  }
  TA.ui.showEndScreen = showEndScreen;

  /* ---------- HUD pieces ---------- */
  function renderMissionBanner() {
    var m = TA.missions.mission(TA.S.mission);
    var act = TA.missions.getActForMission(TA.S.mission);
    var t = el('mission-title');
    if (t) t.textContent = 'MISI ' + m.n + ' DARI 10 · ' + act.name + ' — ' + act.title.toUpperCase() + ' · TAHAP ' + TA.S.stage + '/' + m.stages.length;
    var s = el('mission-stage');
    if (s) s.textContent = m.stages[TA.S.stage - 1] + (TA.S.mission === 7 && TA.S.stage === 3 ? '  ·  PENJAGA ' + TA.S.guardsKilled + '/9' : '');
    var o = el('mission-objective');
    if (o) o.textContent = m.objective;
    var d = el('mission-dist');
    if (d) d.textContent = TA.missions.getObjectiveDistance() + ' m';
    var nx = el('mission-next');
    if (nx) nx.textContent = 'NEXT: ' + m.next;
    var c = el('mission-contract');
    if (c) c.textContent = TA.missions.getMissionContract(m.n);
  }
  TA.ui.renderMissionBanner = renderMissionBanner;

  function renderRankRow() {
    var r = TA.career.getRank();
    var rn = el('rank-name');
    if (rn) rn.textContent = 'TINGKAT ' + r.level + ' · ' + r.name;
    var xt = el('xp-text');
    if (xt) xt.textContent = TA.S.xp + ' / ' + (r.next ? r.next.xp : 'MAX') + ' XP';
    var xf = el('xp-fill');
    if (xf) {
      var pct = r.next ? Math.round((TA.S.xp - r.xp) / (r.next.xp - r.xp) * 100) : 100;
      xf.style.width = TA.clamp(pct, 0, 100) + '%';
    }
  }
  TA.ui.renderRankRow = renderRankRow;

  function renderCrewRow() {
    var row = el('crew-row');
    if (!row) return;
    var rec = TA.crew.recruited();
    var parts = [];
    for (var i = 0; i < TA.crew.CREW.length; i++) {
      var c = TA.crew.CREW[i];
      parts.push(c.name + (rec.indexOf(c.id) >= 0 ? ' ✓' : ' —'));
    }
    row.textContent = 'KRU: ' + parts.join('  ');
  }
  TA.ui.renderCrewRow = renderCrewRow;

  function renderCrewCards() {
    var box = el('crew-cards');
    if (!box) return;
    var html = '';
    for (var i = 0; i < TA.crew.CREW.length; i++) {
      var c = TA.crew.CREW[i];
      var rec = TA.crew.isRecruited(c.id);
      var st = TA.crew.crewAbilityReady(c.id);
      html += '<div class="crew-card' + (rec ? '' : ' locked') + '">' +
        '<span class="cc-key">' + c.key + '</span>' +
        '<span class="cc-name">' + c.name + ' "' + c.nick + '" — ' + c.role + '</span> ' +
        '<span class="cc-status' + (st.ready ? '' : ' cool') + '">' + (rec ? st.label : 'BELUM · ' + TA.fmtDollar(c.cost)) + '</span><br>' +
        '<span class="cc-ability">' + c.ability + ': ' + c.desc + '</span></div>';
    }
    box.innerHTML = html;
  }
  TA.ui.renderCrewCards = renderCrewCards;

  function renderCrewPanel() {
    var box = el('crew-panel-list');
    if (!box) return;
    var html = '';
    for (var i = 0; i < TA.crew.CREW.length; i++) {
      var c = TA.crew.CREW[i];
      var rec = TA.crew.isRecruited(c.id);
      html += '<div class="crew-full"><b>' + c.name + ' "' + c.nick + '"</b> — ' + c.role +
        ' · <span class="cf-status">' + (rec ? 'DIREKRUT ✓' : 'Harga ' + TA.fmtDollar(c.cost) + ' (butuh Tingkat ' + c.minRank + ')') + '</span><br>' +
        '<span class="cf-desc">' + c.desc + ' Pasif: ' + c.passive + '</span></div>';
    }
    box.innerHTML = html;
  }
  TA.ui.renderCrewPanel = renderCrewPanel;

  function toggleCrewPanel() {
    var p = el('crew-panel');
    if (!p) return;
    if (p.classList.contains('hidden')) { renderCrewPanel(); p.classList.remove('hidden'); }
    else p.classList.add('hidden');
  }
  TA.ui.toggleCrewPanel = toggleCrewPanel;

  function showCrewChatter(name, text) {
    show('crew-chatter');
    var n = el('chatter-name'); if (n) n.textContent = name.toUpperCase() + ':';
    var t = el('chatter-text'); if (t) t.textContent = text;
  }
  TA.ui.showCrewChatter = showCrewChatter;

  function hideCrewChatter() { hide('crew-chatter'); }
  TA.ui.hideCrewChatter = hideCrewChatter;

  function renderWeaponWheel() {
    var w = el('weapon-wheel');
    if (!w) return;
    if (!TA.S.wheelOpen) { w.classList.add('hidden'); return; }
    w.classList.remove('hidden');
    var html = '<div class="ww-title">WEAPON WHEEL — 1-6 UNTUK GANTI SENJATA</div>';
    for (var i = 0; i < TA.player.WEAPONS.length; i++) {
      var wp = TA.player.WEAPONS[i];
      html += '<div class="ww-slot' + (TA.S.weapon === i ? ' active' : '') + '">' +
        '<span><span class="ww-key">' + wp.key + '</span>' + wp.name + '</span>' +
        '<span class="ww-ammo">' + TA.player.ammoText(i) + '</span></div>';
    }
    w.innerHTML = html;
  }
  TA.ui.renderWeaponWheel = renderWeaponWheel;

  function renderDispatchPanel() {
    var units = TA.police.getDispatchUnits();
    var title = el('dispatch-title');
    if (title) title.textContent = TA.police.getIncidentLabel() + ' — ' + units.length + ' UNIT';
    var inc = el('dispatch-incident');
    if (inc) inc.textContent = 'INSIDEN: ' + (TA.S.incident === '—' ? '—' : TA.S.incident);
    var heat = TA.police.getHeatState();
    var hl = el('heat-label');
    if (hl) {
      hl.textContent = heat.label;
      hl.classList.toggle('cold', heat.label === 'KEHILANGAN JEJAK');
    }
    var hf = el('heat-fill');
    if (hf) {
      hf.style.width = heat.pct + '%';
      hf.style.background = heat.label === 'TERLIHAT' ? 'linear-gradient(90deg,#ff5a5a,#ff2d2d)' : 'linear-gradient(90deg,#37d67a,#2ecc71)';
    }
    var box = el('dispatch-units');
    if (box) {
      if (units.length === 0) box.innerHTML = 'Tidak ada unit aktif — kota tenang.';
      else {
        var html = '';
        for (var i = 0; i < units.length; i++) {
          var u = units[i];
          html += '<div class="' + (u.kind === 'air' ? 'unit-air' : '') + '">' + u.name + ' — ' + u.tactic + ' · ' + u.dist + ' m</div>';
        }
        box.innerHTML = html;
      }
    }
    renderPoliceTicker();
  }
  TA.ui.renderDispatchPanel = renderDispatchPanel;

  function renderPoliceTicker() {
    var box = el('police-ticker');
    if (!box) return;
    var lines = TA.police.policeTicker();
    box.innerHTML = lines.map(function (l) { return '<div>▸ ' + l + '</div>'; }).join('');
  }
  TA.ui.renderPoliceTicker = renderPoliceTicker;

  function renderRadioLine() {
    var st = TA.audio.RADIO_STATIONS[TA.S.radio];
    var r = el('radio-line');
    if (r) r.textContent = st.name + ' — ' + st.genre;
  }
  TA.ui.renderRadioLine = renderRadioLine;

  function showToast(text) {
    var t = el('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.remove('hidden');
    toastT = 4;
  }
  TA.ui.showToast = showToast;

  function showRankUpBanner(text) {
    var b = el('rankup-banner');
    if (!b) return;
    b.textContent = text;
    b.classList.remove('hidden');
    rankupT = 4;
  }
  TA.ui.showRankUpBanner = showRankUpBanner;

  function showRaceHUD() {
    show('race-hud');
    updateRaceHUD();
  }
  TA.ui.showRaceHUD = showRaceHUD;

  function hideRaceHUD() { hide('race-hud'); }
  TA.ui.hideRaceHUD = hideRaceHUD;

  function updateRaceHUD() {
    var r = TA.S.race;
    if (!r) return;
    var t = el('race-title');
    if (t) t.textContent = 'BALAPAN LIAR — ' + r.def.name;
    var tm = el('race-timer');
    if (tm) tm.textContent = TA.races.fmtTime(r.t);
    var b = el('race-best');
    if (b) b.textContent = 'BEST ' + r.def.best + ' · MASUK ' + TA.fmtRp(r.def.entry);
    var c = el('race-check');
    if (c) c.textContent = 'CHECKPOINT ' + r.cp + '/' + r.checkpoints.length;
  }
  TA.ui.updateRaceHUD = updateRaceHUD;

  /* ---------- minimap ---------- */
  function renderMinimap() {
    var cv = el('minimap');
    if (!cv || el('hud').classList.contains('hidden')) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var sx = W / 4200, sy = H / 3200;
    ctx.fillStyle = '#10182e';
    ctx.fillRect(0, 0, W, H);
    var ds = TA.world.DISTRICTS;
    for (var i = 0; i < ds.length; i++) {
      ctx.fillStyle = ds[i].ground;
      ctx.fillRect(ds[i].x * sx, ds[i].y * sy, ds[i].w * sx, ds[i].h * sy);
    }
    ctx.strokeStyle = '#2c3550';
    ctx.lineWidth = 2;
    for (var gx = 0; gx <= 10; gx++) { ctx.beginPath(); ctx.moveTo(gx * 400 * sx, 0); ctx.lineTo(gx * 400 * sx, H); ctx.stroke(); }
    for (var gy = 0; gy <= 8; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * 400 * sy); ctx.lineTo(W, gy * 400 * sy); ctx.stroke(); }
    // bank
    var B = TA.world.BANK;
    ctx.fillStyle = '#c8b98a';
    ctx.fillRect(B.x * sx - 2, B.y * sy - 2, 8, 6);
    // koin
    ctx.fillStyle = '#ffd23e';
    var st = TA.world.stashes();
    for (var s = 0; s < st.length; s++) {
      if (!st[s].taken) { ctx.beginPath(); ctx.arc(st[s].x * sx, st[s].y * sy, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    // safehouse
    ctx.fillStyle = '#6db3ff';
    ctx.fillRect(900 * sx - 3, 1500 * sy - 3, 6, 6);
    // rute balapan
    if (TA.S.race && TA.S.race.active) {
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(TA.S.px * sx, TA.S.py * sy);
      for (var c = TA.S.race.cp; c < TA.S.race.checkpoints.length; c++) {
        ctx.lineTo(TA.S.race.checkpoints[c].x * sx, TA.S.race.checkpoints[c].y * sy);
      }
      ctx.stroke();
    }
    // target misi
    var tgt = TA.missions.currentTarget();
    if (tgt) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(tgt.x * sx, tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    }
    // blip polisi merah
    var units = TA.police.getDispatchUnits();
    ctx.fillStyle = '#ff2d2d';
    for (var u = 0; u < units.length; u++) {
      var bx = TA.S.px + (u * 37 - 60) * 3;
      var by = TA.S.py + (u % 3 - 1) * 120;
      ctx.beginPath(); ctx.arc(TA.clamp(bx, 10, 4190) * sx, TA.clamp(by, 10, 3190) * sy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // pemain
    ctx.fillStyle = '#37d67a';
    ctx.beginPath(); ctx.arc(TA.S.px * sx, TA.S.py * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(TA.S.px * sx, TA.S.py * sy, 6, 0, Math.PI * 2); ctx.stroke();
  }

  /* ---------- per-frame ---------- */
  var hudT = 0;
  function update(dt) {
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) hide('toast');
    }
    if (rankupT > 0) {
      rankupT -= dt;
      if (rankupT <= 0) hide('rankup-banner');
    }
    hudT += dt;
    if (hudT < 0.12) {
      if (TA.S.screen === 'map') renderFullMapCanvas();
      return;
    }
    hudT = 0;
    if (TA.S.screen === 'playing' || TA.S.screen === 'paused') {
      var stars = el('wanted-stars');
      if (stars) {
        var html = '';
        for (var i = 1; i <= 5; i++) html += '<span class="' + (i <= TA.S.wanted ? '' : 'star-off') + '">★</span>';
        stars.innerHTML = html;
      }
      var wl = el('wanted-label');
      if (wl) wl.textContent = TA.S.wanted > 0 ? 'WANTED ' + TA.S.wanted : '';
      var money = el('money');
      if (money) money.textContent = TA.fmtRp(TA.S.money);
      var dtEl = el('day-time');
      if (dtEl) dtEl.textContent = 'HARI ' + TA.S.day + ' · ' + TA.fmtClock();
      var wEl = el('weather');
      if (wEl) wEl.textContent = TA.S.weather + (TA.S.night ? ' · MALAM' : ' · SIANG');
      renderMissionBanner();
      renderDispatchPanel();
      renderCrewCards();
      renderRankRow();
      var d = TA.world.districtAt(TA.S.px, TA.S.py);
      var dn = el('district-name');
      if (dn) dn.textContent = d.name + ' — ' + d.street;
      var dsEl = el('district-standing');
      if (dsEl) dsEl.textContent = (TA.career.districtStanding(d.name) >= 70 ? 'DIKUASAI' : TA.career.districtStanding(d.name) >= 45 ? 'NETRAL' : 'TEGANG') + ' · ' + TA.career.districtStanding(d.name);
      var cn = el('car-name');
      if (cn) {
        if (TA.S.inCar && TA.S.car) cn.textContent = TA.S.car.name + ' · ' + TA.player.getCarCondition() + '% · TUNE ' + TA.S.car.tune;
        else cn.textContent = 'JALAN KAKI — RAKA';
      }
      var sp = el('speed');
      if (sp) sp.innerHTML = Math.round(Math.abs(TA.S.speed)) + ' <span>KM/JAM</span>';
      var hp = el('hp-text');
      if (hp) hp.textContent = 'HP ' + Math.round(TA.S.hp);
      var ar = el('armor-text');
      if (ar) ar.textContent = 'ARMOR ' + Math.round(TA.S.armor);
      renderMinimap();
    }
    if (TA.S.screen === 'map') renderFullMapCanvas();
  }
  TA.ui.update = update;

  /* ---------- staged screenshots ---------- */
  function stageShot(n) {
    if (n === 1) {
      // kabur dari bank, tahap 7, siang — wanted 4, dispatch PERAMPOKAN BANK, heat TERLIHAT
      TA.S.screen = 'playing';
      TA.S.night = false; TA.S.weather = 'Siang Cerah'; TA.S.rain = 0.4;
      TA.S.day = 4; TA.S.hour = 14; TA.S.minute = 32;
      TA.S.money = 4250000; TA.S.mission = 7; TA.S.stage = 7; TA.S.stageTotal = 7;
      TA.S.missionDone = [true, true, true, true, true, true, false, false, false, false];
      TA.S.guardsKilled = 9; TA.S.guardsTotal = 9; TA.S.bankMoneyTaken = true;
      TA.S.px = 2300; TA.S.py = 1560; TA.S.angle = 0.15;
      var car = { name: 'PELABUHAN GT', color: '#2980b9', top: 185, tune: 'SPORT', condition: 62, x: 2300, y: 1560, dir: 0 };
      TA.S.car = car; TA.S.inCar = true; TA.S.onFoot = false; TA.S.speed = 87;
      TA.S.weapon = 2;
      TA.S.xp = 450;
      TA.police.setWanted(4, 'PERAMPOKAN BANK');
      TA.S.heat = 92; TA.S.heatVisible = true;
      TA.police.logPoliceRadio('ELANG-1: target terpantau di Tol Layang');
      TA.police.logPoliceRadio('PATROLI-12: tembakan di Pasar Senja');
      TA.police.logPoliceRadio('BLOKIR-03: roadblock dipasang di Pelabuhan');
      showHUD();
      renderMissionBanner();
      renderDispatchPanel();
    } else if (n === 2) {
      // tembak-menembak tahap 3 di plaza Bank Arunika
      TA.S.screen = 'playing';
      TA.S.night = false; TA.S.weather = 'Siang Cerah'; TA.S.rain = 0.2;
      TA.S.day = 4; TA.S.hour = 13; TA.S.minute = 5;
      TA.S.money = 4250000; TA.S.mission = 7; TA.S.stage = 3; TA.S.stageTotal = 7;
      TA.S.missionDone = [true, true, true, true, true, true, false, false, false, false];
      TA.S.guardsKilled = 3; TA.S.guardsTotal = 9;
      TA.S.px = 2060; TA.S.py = 1520; TA.S.angle = -Math.PI / 2;
      TA.S.inCar = false; TA.S.onFoot = true; TA.S.car = null; TA.S.speed = 0;
      TA.S.weapon = 2; TA.S.wheelOpen = true;
      TA.S.xp = 450;
      TA.missions.startBankHeist();
      TA.S.stage = 3; TA.S.stageTotal = 7;
      TA.S.px = 2060; TA.S.py = 1520; TA.S.angle = -Math.PI / 2;
      // 3 penjaga sudah tumbang
      var en = TA.missions.enemies();
      for (var i = 0; i < 3 && i < en.length; i++) en[i].alive = false;
      TA.S.guardsKilled = 3;
      TA.police.setWanted(4, 'PENEMBAKAN');
      TA.S.heat = 88; TA.S.heatVisible = true;
      TA.police.logPoliceRadio('PATROLI-12: tembakan di Pasar Senja');
      TA.police.logPoliceRadio('ELANG-1: target terpantau di Bank Arunika');
      TA.world.addExplosion(1850, 1420);
      showHUD();
      renderMissionBanner();
      renderDispatchPanel();
      renderWeaponWheel();
      TA.crew.showChatter('SARI', 'Sembilan penjaga, Raka. Van sudah siap di depan!');
    } else if (n === 3) {
      // peta penuh malam — tab CERITA + STATISTIK
      TA.S.screen = 'map';
      TA.S.night = true; TA.S.weather = 'Hujan'; TA.S.rain = 1;
      TA.S.day = 4; TA.S.hour = 21; TA.S.minute = 40;
      TA.S.money = 4250000; TA.S.mission = 7; TA.S.stage = 1; TA.S.stageTotal = 7;
      TA.S.missionDone = [true, true, true, true, true, true, false, false, false, false];
      TA.S.px = 2060; TA.S.py = 1520;
      TA.S.waypoint = { x: 1200, y: 1000 };
      TA.S.mapTab = 'cerita';
      TA.S.xp = 450; TA.S.coins = 4; TA.S.jumps = 2; TA.S.racesWon = 1; TA.S.carsStolen = 37;
      showFullMap();
      var wl = el('waypoint-line');
      if (wl) wl.textContent = 'Line up at the Pelabuhan Sprint start · 0.46 km';
    } else if (n === 4) {
      // title screen — kota hujan hidup di belakang
      TA.S.screen = 'title';
      TA.S.night = true; TA.S.weather = 'Hujan Deras'; TA.S.rain = 1;
      TA.S.day = 4; TA.S.hour = 21; TA.S.minute = 15;
      TA.S.px = 2000; TA.S.py = 1400;
      showTitleScreen();
    }
  }
  TA.ui.stageShot = stageShot;
})();
