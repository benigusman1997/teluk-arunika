/* ui.js — Teluk Arunika v3.8. HUD DOM + minimap + title screen + pause +
   peta layar penuh bertab (CERITA/STATISTIK/...) + weapon wheel 6 slot +
   panel dispatch + kartu kru + banner + intro misi + dialog. */
(function () {
  'use strict';
  var TA = window.TA;

  function $(id) { return document.getElementById(id); }
  function fmtRp(n) { return 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtDollar(n) { return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fmtClock(min) {
    var h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function setText(id, t) { var el = $(id); if (el && el.textContent !== t) el.textContent = t; }
  function show(id) { var el = $(id); if (el) el.style.display = 'block'; }
  function hide(id) { var el = $(id); if (el) el.style.display = 'none'; }

  var wheelTimer = 0, toastTimer = 0, introTimer = 0, bannerTimer = 0;

  /* ---------- HUD ---------- */
  function renderHUD() {
    var s = TA.state;
    var stars = '';
    for (var i = 0; i < 5; i++) stars += (i < s.wanted) ? '★' : '☆';
    setText('wanted-stars', stars);
    setText('money', fmtRp(s.money));
    setText('day-debt', 'HARI ' + s.day + ' / 7 · UTANG ' + fmtRp(s.debt));
    setText('clock-weather', fmtClock(s.clockMin) + ' · ' + (s.weather === 'hujan' ? 'HUJAN' : s.weather === 'cerah' ? 'CERAH' : 'MENDUNG'));
    /* kru + karier */
    var crewLine = 'KRU: ';
    crewLine += s.crew.sari.recruited ? 'Sari ✓ ' : 'Sari — ';
    crewLine += s.crew.budi.recruited ? 'Budi ✓ ' : 'Budi — ';
    crewLine += s.crew.agus.recruited ? 'Agus ✓' : 'Agus —';
    setText('crew-row', crewLine);
    var rank = TA.career ? TA.career.getRank(s.xp) : { name: 'Anak Baru', xp: 0 };
    var next = TA.career ? TA.career.nextRank(s.xp) : null;
    var xpText = 'TINGKAT ' + rank.level + ' · ' + rank.name + ' — ' + s.xp + ' / ' + (next ? next.xp : s.xp) + ' XP';
    setText('rank-row', xpText);
    var pct = next ? Math.min(100, Math.round((s.xp - rank.xp) / (next.xp - rank.xp) * 100)) : 100;
    var xf = $('xp-fill'); if (xf) xf.style.width = pct + '%';
    /* HEALTH / ARMOUR kiri bawah */
    setText('health-num', 'HEALTH ' + Math.round(s.health));
    setText('armor-num', 'ARMOUR ' + Math.round(s.armor));
    var hf = $('health-fill'); if (hf) hf.style.width = Math.max(0, s.health / s.maxHealth * 100) + '%';
    var af = $('armor-fill'); if (af) af.style.width = Math.max(0, s.armor / s.maxArmor * 100) + '%';
    /* kecepatan + mobil + radio */
    var kmh = s.player.onFoot ? 0 : Math.round(Math.abs(s.car.speed || 0) * 1.1);
    setText('speed-num', kmh + ' KM/JAM');
    var cond = TA.player ? TA.player.getCarCondition() : '';
    setText('car-name', s.player.onFoot ? 'JALAN KAKI' : (s.car.name + ' — ' + cond));
    setText('radio-line', TA.audio ? TA.audio.radioLine() : 'ARUNIKA 98.4 — Dangdut Neon');
    /* lokasi */
    var d = TA.world ? TA.world.districtAt(s.player.x, s.player.y) : null;
    if (d) {
      setText('location-name', d.name + ' — ' + d.label);
      setText('location-standing', 'SUASANA ' + (s.districts[d.name] || 50) + ' · ' + ((s.districts[d.name] || 50) >= 50 ? 'NETRAL' : 'PANAS'));
    }
    renderMissionBanner();
    renderWreckBar();
    renderDispatchPanel();
    renderCrewCards();
    renderChatter();
    renderMinimap();
    if (TA.races) renderRaceHud();
  }

  function renderRaceHud() {
    var s = TA.state;
    var el = $('race-hud');
    if (!el) return;
    if (s.race) {
      el.style.display = 'block';
      var best = TA.races ? TA.races.getBestTime(s.race.key) : null;
      setText('race-timer', 'BALAPAN LIAR — ' + s.race.name + ' · ' + TA.races.fmtTime(s.race.timer) + ' · BEST ' + TA.races.fmtTime(best) + ' · CP ' + s.race.checkpoint + '/3');
    } else el.style.display = 'none';
  }

  function renderMissionBanner() {
    var s = TA.state;
    var el = $('mission-banner');
    if (!el) return;
    if (!s.mission) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    var m = TA.missions.MISSIONS[s.mission.index];
    var act = TA.missions.getActForMission(s.mission.index);
    var st = m.stages[s.mission.stage];
    setText('mission-title', 'MISI ' + (s.mission.index + 1) + ' DARI 10 · ' + act.name + ' · TAHAP ' + (s.mission.stage + 1) + '/' + m.stages.length + ' — ' + st.title);
    setText('mission-objective', st.objective + ' · ' + TA.missions.getObjectiveDistance() + ' m');
    setText('mission-next', 'NEXT: ' + st.next);
    setText('mission-contract', 'KONTRAK: ' + m.syndicate + ' — ' + fmtDollar(m.reward));
    if (s.mission.index === 6 && s.mission.stage === 2) {
      setText('mission-objective', st.objective + ' · PENJAGA ' + s.bankGuardsDown + '/9 · ' + TA.missions.getObjectiveDistance() + ' m');
    }
  }

  function renderWreckBar() {
    var s = TA.state;
    var el = $('wreck-bar');
    if (!el) return;
    if (!s.wreck || !s.wreck.active) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    var w = s.wreck;
    setText('wreck-title', 'KONTRAK HANCUR — HANCURKAN ' + w.name);
    var wf = $('wreck-hp-fill'); if (wf) wf.style.width = Math.max(0, w.hp) + '%';
    setText('wreck-hp-num', 'HP TARGET ' + Math.round(w.hp) + '/100');
    setText('wreck-dist', w.distKm.toFixed(2) + ' km ke ' + w.dest + ' · NEXT: Ambil hadiah di bengkel Pak Amir');
  }

  function renderDispatchPanel() {
    var s = TA.state;
    var el = $('dispatch-panel');
    if (!el) return;
    if (s.wanted <= 0 && !(TA.police && TA.police.swat.deployed)) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    var units = TA.police ? TA.police.getDispatchUnits() : [];
    var label = TA.police ? TA.police.getIncidentLabel() : 'PENEMBAKAN';
    setText('dispatch-header', 'DISPATCH POLISI — ' + label + ' · ' + units.length + ' UNIT');
    var heat = TA.police ? TA.police.getHeatState() : { label: 'AMAN', pct: 0 };
    setText('heat-label', heat.label);
    var hfill = $('heat-fill'); if (hfill) { hfill.style.width = heat.pct + '%'; hfill.style.background = heat.label === 'TERLIHAT' ? '#e23a3a' : '#3ac25a'; }
    var rows = $('dispatch-rows');
    if (rows) {
      var html = '';
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        html += '<div class="dispatch-row"><span class="du-name">' + u.id + '</span><span class="du-role">' + u.role + '</span><span class="du-dist">' + u.dist + ' m</span></div>';
      }
      if (rows.innerHTML !== html) rows.innerHTML = html;
    }
    renderPoliceTicker();
  }

  function renderPoliceTicker() {
    var t = TA.police ? TA.police.policeTicker() : [];
    var el = $('police-ticker');
    if (!el) return;
    var html = '';
    for (var i = 0; i < t.length; i++) html += '<div>▸ ' + t[i] + '</div>';
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  function renderCrewCards() {
    var s = TA.state;
    var el = $('crew-cards');
    if (!el || !TA.crew) return;
    var html = '';
    var list = TA.crew.CREW;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var st = s.crew[c.key];
      var status = !st.recruited ? 'BELUM DIREKRUT' : (st.cooldown > 0 ? Math.ceil(st.cooldown) + ' dtk' : 'READY');
      var cls = !st.recruited ? 'crew-card locked' : (st.cooldown > 0 ? 'crew-card cooling' : 'crew-card ready');
      html += '<div class="' + cls + '"><b>' + c.name + ' "' + c.nick + '"</b> · ' + c.role +
        '<br>' + c.ability + ' [' + c.keybind + '] · ' + status + '</div>';
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  function renderChatter() {
    var s = TA.state;
    var el = $('chatter-toast');
    if (!el) return;
    if (s.chatter && s.time < s.chatter.until) {
      el.style.display = 'block';
      setText('chatter-name', s.chatter.name);
      setText('chatter-text', s.chatter.text);
    } else el.style.display = 'none';
  }

  /* ---------- minimap ---------- */
  function renderMinimap() {
    var cv = $('minimap-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = 220, H = 158, sx = W / 3600, sy = H / 2600;
    var s = TA.state;
    ctx.fillStyle = '#10141c'; ctx.fillRect(0, 0, W, H);
    if (TA.world) {
      var ds = TA.world.DISTRICTS;
      for (var i = 0; i < ds.length; i++) {
        ctx.fillStyle = ds[i].name === 'PULAU ABU' ? '#3a2a22' : '#2a2f38';
        ctx.fillRect(ds[i].x * sx, ds[i].y * sy, ds[i].w * sx, ds[i].h * sy);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    for (var g = 260; g < 3600; g += 260) { ctx.beginPath(); ctx.moveTo(g * sx, 0); ctx.lineTo(g * sx, H); ctx.stroke(); }
    /* rute kontrak hancur (garis merah) */
    if (s.wreck && s.wreck.active) {
      ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.wreck.targetPos.x * sx, s.wreck.targetPos.y * sy);
      ctx.lineTo(s.wreck.destPos.x * sx, s.wreck.destPos.y * sy); ctx.stroke();
      ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(s.wreck.targetPos.x * sx, s.wreck.targetPos.y * sy, 4, 0, 6.29); ctx.fill();
    }
    /* safehouse biru, taksi hijau, misi kuning */
    ctx.fillStyle = '#3a8ad8'; ctx.fillRect(420 * sx - 3, 700 * sy - 3, 6, 6);
    ctx.fillStyle = '#3ac25a'; ctx.fillRect(1100 * sx - 3, 500 * sy - 3, 6, 6);
    if (s.mission) {
      var tg = [[1550, 500], [2400, 500], [420, 700], [1200, 1400], [1550, 1300], [2000, 1325], [1550, 500], [3300, 2150], [2000, 1325], [420, 480]][s.mission.index];
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(tg[0] * sx, tg[1] * sy, 4, 0, 6.29); ctx.fill();
    }
    /* blip polisi merah */
    if (TA.police) {
      var units = TA.police.getDispatchUnits();
      ctx.fillStyle = '#ff2a2a';
      for (var u = 0; u < units.length; u++) { ctx.beginPath(); ctx.arc(units[u].x * sx, units[u].y * sy, 3, 0, 6.29); ctx.fill(); }
    }
    /* pemain */
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(s.player.x * sx, s.player.y * sy, 4, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }

  /* ---------- weapon wheel ---------- */
  function renderWeaponWheel(forceShow) {
    var el = $('weapon-wheel');
    if (!el) return;
    if (forceShow) { el.style.display = 'block'; wheelTimer = 4; }
    if (!forceShow && wheelTimer <= 0 && TA.state.shot !== 4) { el.style.display = 'none'; return; }
    var s = TA.state;
    var html = '<div class="wheel-title">SENJATA — tekan 1-6</div><div class="wheel-grid">';
    var ws = TA.player.WEAPONS;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      var ammo = TA.player.ammoText(w.key);
      var sel = (s.player.weapon === w.slot) ? ' wheel-slot sel' : ' wheel-slot';
      html += '<div class="' + sel + '"><b>' + w.slot + ' · ' + w.name.toUpperCase() + '</b><br>' + ammo + '</div>';
    }
    html += '</div>';
    if (el.innerHTML !== html) el.innerHTML = html;
    el.style.display = 'block';
  }
  function showWeaponWheel(open) { renderWeaponWheel(open); }

  /* ---------- banner / toast / dialog ---------- */
  function showBanner(title, sub) {
    var s = TA.state;
    s.banner = { title: title, sub: sub || '', until: s.time + 4 };
    bannerTimer = 4;
    setText('big-banner-title', title);
    setText('big-banner-sub', sub || '');
    show('big-banner');
  }
  function showSwatBanner() {
    setText('swat-banner', 'SWAT ARUNIKA DITERJUNKAN');
    show('swat-banner');
  }
  function renderSWATBanner() { showSwatBanner(); }
  function showRankUpBanner(rank) {
    setText('rankup-title', 'NAIK TINGKAT: ' + rank.name + '!');
    setText('rankup-sub', rank.perk);
    show('rankup-banner');
    setTimeout(function () { hide('rankup-banner'); }, 5000);
  }
  function toast(text) {
    setText('toast', text);
    show('toast');
    toastTimer = 3;
  }
  function showJackProgress(p) {
    var el = $('jack-progress');
    if (!el) return;
    el.style.display = 'block';
    var f = $('jack-fill'); if (f) f.style.width = Math.round(p * 100) + '%';
    if (p >= 1) el.style.display = 'none';
  }
  function showDialogue(line) {
    setText('dialogue-text', line || '');
    show('dialogue-box');
  }
  function hideDialogue() { hide('dialogue-box'); }

  /* ---------- intro misi ---------- */
  function showMissionIntro(i) {
    var m = TA.missions.MISSIONS[i];
    var act = TA.missions.getActForMission(i);
    setText('intro-kicker', 'MISI ' + (i + 1) + ' · ' + act.name + ' — ' + m.title);
    setText('intro-title', m.title);
    setText('intro-reward', 'KONTRAK: ' + m.syndicate + ' — ' + fmtDollar(m.reward));
    var s = TA.state;
    var crewLine = '';
    if (s.crew.sari.recruited) crewLine += 'SARI: Aku di belakangmu, Raka. ';
    if (s.crew.budi.recruited) crewLine += 'BUDI: Mesin siap, jangan ditabrak. ';
    if (s.crew.agus.recruited) crewLine += 'AGUS: Jalur aman. ';
    setText('intro-dialog', 'DARMA: ' + m.stages[0].objective + '. ' + (crewLine || 'RAKA: Utang ini harus lunas minggu ini.'));
    setText('intro-hint', 'SPACE / CLICK to continue');
    show('mission-intro');
    introTimer = 5;
  }

  /* ---------- title / pause / akhir ---------- */
  function showTitleScreen() {
    hide('pause-screen'); hide('full-map'); hide('mission-intro'); hide('hud');
    var s = TA.state;
    var done = 0;
    for (var i = 0; i < s.missionDone.length; i++) if (s.missionDone[i]) done++;
    setText('continue-line', 'Hari ' + s.day + ' · ' + fmtRp(s.money) + ' · Misi ' + (done + 1) + '/10');
    renderSaveSlots('save-slots');
    show('title-screen');
  }
  function showStartScreen() { showTitleScreen(); }
  function hideTitleScreen() { hide('title-screen'); }
  function renderSaveSlots(id) {
    var el = $(id);
    if (!el || !TA.career) return;
    var saves = TA.career.listSaves();
    var html = '';
    for (var i = 0; i < 3; i++) {
      var sv = saves[i];
      if (sv) {
        var d = 0; for (var m = 0; m < sv.missionDone.length; m++) if (sv.missionDone[m]) d++;
        html += '<div class="save-slot">SLOT ' + (i + 1) + ' — Hari ' + sv.day + ' · ' + fmtRp(sv.money) + ' · Misi ' + (d + 1) + '/10</div>';
      } else html += '<div class="save-slot empty">SLOT ' + (i + 1) + ' — KOSONG</div>';
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function showPauseScreen() {
    hide('hud');
    var s = TA.state;
    var rank = TA.career ? TA.career.getRank(s.xp) : { name: 'Anak Baru' };
    setText('pause-career', 'KARIER: TINGKAT ' + rank.level + ' · ' + rank.name + ' — ' + s.xp + ' XP · UANG ' + fmtRp(s.money) + ' · HARI ' + s.day + '/7 · KOIN ARUNIKA ' + s.coins + '/12 · LOMPATAN ' + s.jumps + '/5 · BALAPAN ' + s.racesWon + ' · MOBIL DICURI ' + s.carsStolen + ' · WANTED TERTINGGI ' + s.bestWanted + ' BINTANG · SAFEHOUSE ' + s.safehouses + '/3');
    var crewHtml = '';
    var list = TA.crew ? TA.crew.CREW : [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      crewHtml += '<div>' + c.name + ' "' + c.nick + '" — ' + c.role + ' · ' + (s.crew[c.key].recruited ? 'DIREKRUT ✓' : 'BELUM · $' + c.price) + ' · ' + c.desc + '</div>';
    }
    var pc = $('pause-crew'); if (pc) pc.innerHTML = crewHtml;
    renderSaveSlots('pause-slots');
    show('pause-screen');
  }
  function hidePauseScreen() { hide('pause-screen'); show('hud'); }
  function showGameOver() {
    hide('hud');
    setText('gameover-text', 'RAKA TERTANGKAP — Utang belum lunas. Bengkel Pak Amir disita.');
    show('gameover-screen');
  }
  function showWinScreen() {
    hide('hud');
    var s = TA.state;
    var rank = TA.career ? TA.career.getRank(s.xp) : { name: 'Anak Baru' };
    setText('win-stats', 'UTANG LUNAS — Bengkel Selamat · Misi 10/10 · ' + s.xp + ' XP · Gelar: ' + rank.name + ' · Uang ' + fmtRp(s.money));
    show('win-screen');
  }

  /* ---------- peta layar penuh ---------- */
  function showFullMap() {
    hide('hud');
    show('full-map');
    renderMapTabs();
  }
  function hideFullMap() { hide('full-map'); show('hud'); }
  function renderMapTabs() {
    var s = TA.state;
    var tabs = ['PETA', 'CERITA', 'STATISTIK', 'KRU', 'PENGATURAN', 'KONTROL', 'SIMPAN'];
    var el = $('map-tabs');
    if (el) {
      var html = '';
      for (var i = 0; i < tabs.length; i++) {
        html += '<button class="map-tab' + (s.mapTab === tabs[i] ? ' active' : '') + '" data-tab="' + tabs[i] + '">' + tabs[i] + '</button>';
      }
      if (el.innerHTML !== html) {
        el.innerHTML = html;
        var btns = el.querySelectorAll('.map-tab');
        for (var b = 0; b < btns.length; b++) btns[b].addEventListener('click', function (ev) { s.mapTab = ev.target.getAttribute('data-tab'); renderMapTabs(); });
      }
    }
    renderMapContent();
  }
  function renderMapContent() {
    var s = TA.state;
    var panes = ['map-pane-peta', 'map-pane-cerita', 'map-pane-statistik', 'map-pane-kru', 'map-pane-pengaturan', 'map-pane-kontrol', 'map-pane-simpan'];
    for (var i = 0; i < panes.length; i++) hide(panes[i]);
    var map = { 'PETA': 'map-pane-peta', 'CERITA': 'map-pane-cerita', 'STATISTIK': 'map-pane-statistik', 'KRU': 'map-pane-kru', 'PENGATURAN': 'map-pane-pengaturan', 'KONTROL': 'map-pane-kontrol', 'SIMPAN': 'map-pane-simpan' };
    show(map[s.mapTab] || 'map-pane-peta');
    renderStoryList();
    renderCareerStats();
    renderDistrictStandingPanel();
    renderFullMapCanvas();
    /* CURRENT MISSION */
    var cm = $('map-current-mission');
    if (cm) {
      if (s.mission) {
        var m = TA.missions.MISSIONS[s.mission.index];
        cm.textContent = 'CURRENT MISSION: Misi ' + (s.mission.index + 1) + ' — ' + m.title + ' · ' + m.stages[s.mission.stage].objective;
      } else cm.textContent = 'CURRENT MISSION: —';
    }
    var wl = $('waypoint-line');
    if (wl) {
      wl.textContent = s.waypoint ? ('Line up at the ' + s.waypoint.label + ' start · ' + s.waypoint.dist + ' km') : 'Klik peta untuk pasang waypoint';
    }
  }
  function renderStoryList() {
    var el = $('map-story');
    if (!el || !TA.missions) return;
    var s = TA.state;
    var html = '<h3>CERITA — 10 KONTRAK</h3>';
    for (var i = 0; i < TA.missions.MISSIONS.length; i++) {
      var m = TA.missions.MISSIONS[i];
      var act = TA.missions.getActForMission(i);
      var status = s.missionDone[i] ? 'DONE' : (s.mission && s.mission.index === i ? 'NEXT' : (i === 0 || s.missionDone[i - 1] ? 'NEXT' : 'LOCKED'));
      var cls = status === 'DONE' ? 'done' : (status === 'NEXT' ? 'next' : 'locked');
      html += '<div class="story-row ' + cls + '">' + m.title + ' — ' + act.num + ' · ' + act.name.split('— ')[1] + ' · ' + fmtDollar(m.reward) + ' — ' + status + '</div>';
    }
    html += '<h3>KONTRAK HANCUR</h3>';
    var wc = TA.missions.WRECK_CONTRACTS;
    for (var j = 0; j < wc.length; j++) {
      var w = wc[j];
      var st = s.wreckDone[w.key] ? 'DONE' : (s.wreck && s.wreck.key === w.key && s.wreck.active ? 'NEXT' : 'LOCKED');
      var cl2 = st === 'DONE' ? 'done' : (st === 'NEXT' ? 'next' : 'locked');
      html += '<div class="story-row ' + cl2 + '">HANCURKAN ' + w.name + ' — ke ' + w.dest + ' · ' + fmtDollar(w.reward) + ' + 60 XP — ' + st + '</div>';
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function renderCareerStats() {
    var el = $('map-stats');
    if (!el) return;
    var s = TA.state;
    var rank = TA.career ? TA.career.getRank(s.xp) : { name: 'Anak Baru' };
    var html = '<h3>CAREER</h3>' +
      '<div>UANG: ' + fmtRp(s.money) + '</div>' +
      '<div>RESPECT: ' + rank.name + ' · ' + s.xp + ' XP</div>' +
      '<div>DISTRIK DIKUASAI: ' + s.districtsHeld + '/6</div>' +
      '<div>KOIN ARUNIKA: ' + s.coins + '/12</div>' +
      '<div>LOMPATAN: ' + s.jumps + '/5</div>' +
      '<div>BALAPAN DIMENANGKAN: ' + s.racesWon + '</div>' +
      '<div>MOBIL DICURI: ' + s.carsStolen + '</div>' +
      '<div>WANTED TERTINGGI: ' + s.bestWanted + ' BINTANG</div>' +
      '<div>SAFEHOUSE: ' + s.safehouses + '/3</div>' +
      '<div>MISI SELESAI: ' + s.missionDone.filter(Boolean).length + '/10</div>' +
      '<div>HARI: ' + s.day + '/7</div>';
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function renderDistrictStandingPanel() {
    var el = $('map-standing');
    if (!el) return;
    var s = TA.state;
    var html = '<h3>DISTRICT STANDING</h3>';
    var names = TA.career ? TA.career.DISTRICTS : Object.keys(s.districts);
    for (var i = 0; i < names.length; i++) {
      var n = names[i], v = s.districts[n] || 0;
      html += '<div class="standing-row"><span>' + n + '</span><span class="standing-bar"><i style="width:' + v + '%"></i></span><span>' + v + '</span></div>';
    }
    if (el.innerHTML !== html) el.innerHTML = html;
    var lg = $('map-legend');
    if (lg) {
      lg.innerHTML = '<h3>LEGEND</h3><div>◆ Misi</div><div>◈ Respray</div><div>■ Safehouse</div><div>● Side job</div><div>▲ Polisi</div><div>◆ Ekspor Mobil</div><div>✖ Kontrak Hancur</div><div>⬢ SWAT</div><div>◎ Waypoint</div>';
    }
  }
  function renderFullMapCanvas() {
    var cv = $('map-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height, sx = W / 3600, sy = H / 2600;
    var s = TA.state;
    ctx.fillStyle = '#141a24'; ctx.fillRect(0, 0, W, H);
    /* laut dulu (di bawah label distrik) */
    ctx.fillStyle = '#2a5a7a'; ctx.fillRect(0, 0, 110 * sx, H);
    ctx.fillStyle = '#2a5a7a'; ctx.fillRect(0, 2420 * sy, 2000 * sx, 180 * sy);
    var ds = TA.world ? TA.world.DISTRICTS : [];
    for (var i = 0; i < ds.length; i++) {
      ctx.fillStyle = ds[i].name === 'PULAU ABU' ? '#4a3226' : '#2c3442';
      ctx.fillRect(ds[i].x * sx, ds[i].y * sy, ds[i].w * sx, ds[i].h * sy);
      ctx.fillStyle = '#cfd8e8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(ds[i].name + ' · ' + (s.districts[ds[i].name] || 0), ds[i].x * sx + 6, ds[i].y * sy + 16);
    }
    /* kawah */
    ctx.fillStyle = '#ff5a14'; ctx.beginPath(); ctx.arc(3300 * sx, 2150 * sy, 14, 0, 6.29); ctx.fill();
    /* waypoint + rute */
    if (s.waypoint) {
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(s.player.x * sx, s.player.y * sy);
      ctx.lineTo(s.waypoint.x * sx, s.waypoint.y * sy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(s.waypoint.x * sx, s.waypoint.y * sy, 5, 0, 6.29); ctx.fill();
    }
    /* wreck route */
    if (s.wreck && s.wreck.active) {
      ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.wreck.targetPos.x * sx, s.wreck.targetPos.y * sy);
      ctx.lineTo(s.wreck.destPos.x * sx, s.wreck.destPos.y * sy); ctx.stroke();
    }
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(s.player.x * sx, s.player.y * sy, 5, 0, 6.29); ctx.fill();
  }
  function setWaypoint(x, y) {
    var s = TA.state;
    var d = Math.round(Math.sqrt((x - s.player.x) * (x - s.player.x) + (y - s.player.y) * (y - s.player.y)) * 0.45) / 1000;
    var dist = TA.world ? TA.world.districtAt(x, y) : null;
    s.waypoint = { x: x, y: y, label: dist ? dist.name : 'Titik', dist: d.toFixed(2) };
    renderMapContent();
  }

  /* ---------- panel kru ---------- */
  function toggleCrewPanel() {
    var el = $('crew-panel');
    if (!el) return;
    if (el.style.display === 'block') { el.style.display = 'none'; return; }
    var s = TA.state;
    var html = '<h3>KRU — BENGKEL PAK AMIR</h3>';
    var list = TA.crew ? TA.crew.CREW : [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      html += '<div class="crew-panel-row"><b>' + c.name + ' "' + c.nick + '"</b> — ' + c.role + ' · ' + c.desc +
        '<br>Status: ' + (s.crew[c.key].recruited ? 'DIREKRUT ✓' : 'BELUM — $' + c.price + ' [tekan ' + c.keybind + ' untuk kemampuan]') + '</div>';
    }
    el.innerHTML = html;
    el.style.display = 'block';
  }

  /* ---------- update per frame ---------- */
  var lastHud = 0;
  function update(dt) {
    var s = TA.state;
    if (wheelTimer > 0) { wheelTimer -= dt; if (wheelTimer <= 0 && s.shot !== 4) hide('weapon-wheel'); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hide('toast'); }
    if (introTimer > 0) { introTimer -= dt; if (introTimer <= 0) hide('mission-intro'); }
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) hide('big-banner'); }
    if (s.mode === 'playing' || s.mode === 'map' || s.mode === 'title' || s.mode === 'paused') {
      if (s.time - lastHud > 0.08) { lastHud = s.time; renderHUD(); }
    }
  }
  function renderAll(force) { renderHUD(); }

  /* ---------- wiring tombol ---------- */
  function wireButtons() {
    var bn = $('btn-new'); if (bn) bn.addEventListener('click', function () { if (TA.core) TA.core.startNewGame(); });
    var bc = $('btn-continue'); if (bc) bc.addEventListener('click', function () {
      hideTitleScreen(); show('hud'); TA.state.mode = 'playing';
      if (TA.missions && !TA.state.mission) TA.missions.startMission(5);
    });
    var br = $('btn-resume'); if (br) br.addEventListener('click', function () { if (TA.core) TA.core.resumeGame(); });
    var bs = $('btn-save-game'); if (bs) bs.addEventListener('click', function () { if (TA.career) TA.career.saveGame(1); });
    var bsp = $('btn-save-pause'); if (bsp) bsp.addEventListener('click', function () { if (TA.career) TA.career.saveGame(1); });
    var bctl = $('btn-controls'); if (bctl) bctl.addEventListener('click', function () { toast('WASD jalan · E mobil · 1-6 senjata · R radio · M peta · V kru · Esc jeda'); });
    var bst = $('btn-settings'); if (bst) bst.addEventListener('click', function () { toast('Pengaturan: musik ON · SFX ON · kualitas Tinggi'); });
    var bq = $('btn-quit-title'); if (bq) bq.addEventListener('click', function () { hidePauseScreen(); TA.state.mode = 'title'; showTitleScreen(); });
    var bm = $('btn-close-map'); if (bm) bm.addEventListener('click', function () { if (TA.core) TA.core.toggleMap(); });
    var mc = $('map-canvas');
    if (mc) mc.addEventListener('click', function (e) {
      var r = mc.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * 3600;
      var y = (e.clientY - r.top) / r.height * 2600;
      setWaypoint(x, y);
    });
    var mi = $('mission-intro');
    if (mi) mi.addEventListener('click', function () { hide('mission-intro'); });
    var go = $('btn-retry');
    if (go) go.addEventListener('click', function () { hide('gameover-screen'); if (TA.core) TA.core.startNewGame(); });
  }
  document.addEventListener('DOMContentLoaded', wireButtons);

  TA.ui = {
    renderHUD: renderHUD, renderMinimap: renderMinimap,
    showStartScreen: showStartScreen, showTitleScreen: showTitleScreen, hideTitleScreen: hideTitleScreen,
    showPauseScreen: showPauseScreen, hidePauseScreen: hidePauseScreen,
    showRankUpBanner: showRankUpBanner, showBanner: showBanner,
    showSwatBanner: showSwatBanner, renderSWATBanner: renderSWATBanner,
    renderDispatchPanel: renderDispatchPanel, renderPoliceTicker: renderPoliceTicker,
    renderCrewCards: renderCrewCards, renderCrewPanel: toggleCrewPanel, toggleCrewPanel: toggleCrewPanel,
    renderWeaponWheel: renderWeaponWheel, showWeaponWheel: showWeaponWheel,
    showFullMap: showFullMap, hideFullMap: hideFullMap, renderMapTabs: renderMapTabs,
    setWaypoint: setWaypoint, renderDistrictStandingPanel: renderDistrictStandingPanel,
    renderStoryList: renderStoryList, renderCareerStats: renderCareerStats,
    showMissionIntro: showMissionIntro, showDialogue: showDialogue, hideDialogue: hideDialogue,
    showGameOver: showGameOver, showWinScreen: showWinScreen,
    toast: toast, showJackProgress: showJackProgress,
    update: update, renderAll: renderAll,
  };
})();
