// ui.js — HUD, minimap, start/pause/end screens, dispatch panel, crew cards, location banner,
// weapon wheel, dialogue, rank-up banner, toasts, crew chatter, save slots.
(function () {
  'use strict';
  var TA = window.TA;

  function $(id) { return document.getElementById(id); }
  var minimapZoom = 1;
  var toastTimer = null;
  var chatterTimer = null;

  function renderHUD() {
    var s = TA.state;
    // wanted stars
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    $('wanted-stars').innerHTML = '<span class="' + (s.wanted >= 3 ? 'hot' : '') + '">' + stars + '</span>';
    $('money').textContent = s.money.toLocaleString('en-US');
    $('day').textContent = s.day;
    $('debt').textContent = s.debt.toLocaleString('en-US');
    var rank = TA.career.getRank();
    var next = TA.career.getNextRank();
    var nextXp = next ? next.xp : rank.xp;
    var baseXp = rank.xp;
    var pct = next ? Math.min(100, (s.xp - baseXp) / (nextXp - baseXp) * 100) : 100;
    $('rank-row').innerHTML = 'TINGKAT ' + rank.level + ' · ' + rank.name + ' — <span id="xp-text">' + s.xp + ' / ' + nextXp + ' XP</span>';
    $('xp-fill').style.width = pct + '%';
    var crewBits = [];
    if (s.crew.sari) crewBits.push('Sari ✓');
    if (s.crew.budi) crewBits.push('Budi ✓');
    if (s.crew.agus) crewBits.push('Agus ✓');
    $('crew-row').textContent = 'KRU: ' + (crewBits.length ? crewBits.join(' · ') : '—');
    var hh = Math.floor(s.timeMinutes / 60), mm = Math.floor(s.timeMinutes % 60);
    $('clock').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    $('weather').textContent = s.weather;
    var st = TA.audio.STATIONS[s.radioStation];
    $('radio').textContent = 'RADIO: ' + st.name + ' — ' + st.song;
    $('hp').textContent = Math.max(0, Math.round(s.hp));
    $('armor').textContent = Math.round(s.armor);
    var w = TA.player.WEAPONS[s.weapon];
    $('weapon-name').textContent = w.name;
    $('ammo').textContent = (s.ammo[s.weapon] || 0) + ' / ∞';
    var carRow = $('car-row');
    if (s.inCar && s.carId) {
      var model = TA.player.CAR_MODELS[s.carId];
      var cond = TA.player.getCarCondition(s.carId);
      var condLabel = cond >= 80 ? 'BAIK' : (cond >= 40 ? 'RUSAK' : 'PARAH');
      $('car-name').textContent = model.name;
      $('car-condition').textContent = cond + '% ' + condLabel;
      $('speed').textContent = s.speedKmh;
      carRow.classList.remove('hidden');
    } else carRow.classList.add('hidden');
    renderMissionBanner();
    renderCrewCards();
    renderLocationBanner();
    renderDispatchPanel();
  }

  function renderMissionBanner() {
    var s = TA.state;
    var el = $('mission-banner');
    if (!s.missionActive) { el.classList.add('hidden'); return; }
    var m = TA.missions.MISSIONS[s.missionIndex];
    if (!m) { el.classList.add('hidden'); return; }
    var st = m.stages[s.missionStage];
    el.classList.remove('hidden');
    $('mission-title').textContent = 'MISI ' + (s.missionIndex + 1) + ' DARI 10 · TAHAP ' + (s.missionStage + 1) + '/' + m.stages.length;
    $('mission-stage').textContent = st.title;
    $('mission-objective').textContent = st.objective;
    $('mission-dist').textContent = 'JARAK: ' + TA.missions.getObjectiveDistance() + ' m';
    $('mission-next').textContent = 'NEXT: ' + st.next;
  }

  function renderDispatchPanel() {
    var s = TA.state;
    var el = $('dispatch-panel');
    var units = TA.police.getDispatchUnits();
    if (s.wanted <= 0 || units.length === 0) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('dispatch-title').textContent = 'DISPATCH POLISI — ' + units.length + ' UNIT';
    var html = '';
    units.forEach(function (u) {
      html += '<div class="dispatch-unit"><span>' + u.id + '</span><span class="tactic">' + u.tactic + '</span><span>' + u.dist + ' m</span></div>';
    });
    $('dispatch-list').innerHTML = html;
    $('dispatch-heli').classList.toggle('hidden', s.wanted < 5);
  }

  function renderCrewCards() {
    var s = TA.state;
    var el = $('crew-cards');
    var html = '';
    TA.crew.CREW.forEach(function (c) {
      if (!s.crew[c.id]) return;
      var cd = Math.ceil(s.crewCooldown[c.id] || 0);
      var ready = TA.crew.crewAbilityReady(c.id);
      var status = ready ? '<span class="cc-status ready">READY</span>' : '<span class="cc-status cd">' + cd + ' dtk</span>';
      html += '<div class="crew-card"><span class="cc-name">' + c.name + '</span> <span class="cc-nick">"' + c.nick + '"</span>' + status +
        '<div class="cc-ability">[' + c.key + '] ' + c.ability + '</div></div>';
    });
    el.innerHTML = html;
  }

  function renderLocationBanner() {
    var s = TA.state;
    var d = TA.world.DISTRICTS[s.currentDistrict];
    if (!d) return;
    $('district-name').textContent = d.name + ' — ' + d.street;
    var mood = s.districts[s.currentDistrict];
    var label = mood >= 70 ? 'DIHORMATI' : (mood >= 45 ? 'NETRAL' : 'DITAKUTI');
    $('district-mood').textContent = label + ' · ' + mood;
  }

  function renderMinimap() {
    var cv = $('minimap');
    if (!cv) return;
    var c = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#0a1428'; c.fillRect(0, 0, W, H);
    // roads grid
    c.strokeStyle = '#3a4a66'; c.lineWidth = 3;
    for (var i = 0; i < 7; i++) {
      c.beginPath(); c.moveTo(15 + i * 25, 0); c.lineTo(15 + i * 25, H); c.stroke();
      c.beginPath(); c.moveTo(0, 15 + i * 25); c.lineTo(W, 15 + i * 25); c.stroke();
    }
    // sea
    c.fillStyle = '#0a3550'; c.fillRect(0, H - 22, W, 22);
    // port containers
    c.fillStyle = '#b03030'; c.fillRect(8, 8, 30, 10);
    // mission marker (yellow)
    var s = TA.state;
    if (s.missionActive) {
      c.fillStyle = '#ffd23e';
      c.beginPath(); c.arc(120, 40, 6, 0, Math.PI * 2); c.fill();
    }
    // taxi (green), safehouse (blue)
    c.fillStyle = '#7dff5e'; c.beginPath(); c.arc(50, 120, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3fa7ff'; c.beginPath(); c.arc(140, 130, 5, 0, Math.PI * 2); c.fill();
    // police blips (red)
    c.fillStyle = '#ff3b30';
    TA.police.getDispatchUnits().forEach(function (u, i) {
      c.beginPath(); c.arc(30 + i * 22, 60 + (i % 2) * 18, 4, 0, Math.PI * 2); c.fill();
    });
    // player arrow (white)
    var px = 90 + (TA.playerPos.x / 150) * 80;
    var pz = 90 + (TA.playerPos.z / 150) * 80;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(px, pz - 7); c.lineTo(px - 5, pz + 6); c.lineTo(px + 5, pz + 6); c.closePath(); c.fill();
  }

  function showStartScreen() {
    $('start-screen').classList.remove('hidden');
    $('pause-screen').classList.add('hidden');
    $('end-screen').classList.add('hidden');
  }
  function showPauseScreen() {
    var s = TA.state;
    var rank = TA.career.getRank();
    var next = TA.career.getNextRank();
    $('pause-stats').innerHTML = 'Uang $' + s.money.toLocaleString('en-US') + ' · Hari ' + s.day + '/7 · Utang $' + s.debt.toLocaleString('en-US') +
      ' · Misi selesai ' + s.missionsDone + '/10 · Mobil dicuri ' + s.carsStolen + ' · Jam ' + $('clock').textContent + ' · ' + s.weather;
    $('career-detail').innerHTML = 'Tingkat ' + rank.level + ' · ' + rank.name + ' — ' + s.xp + ' / ' + (next ? next.xp : rank.xp) + ' XP<br>' +
      'Perk terbuka: ' + rank.perk + '<br>Perk berikutnya: ' + (next ? next.name + ' (' + next.xp + ' XP) — ' + next.perk : 'Maksimal — Legenda Arunika');
    var crewHtml = '';
    TA.crew.CREW.forEach(function (c) {
      crewHtml += '<div>' + c.name + ' "' + c.nick + '" — ' + (s.crew[c.id] ? 'DIREKRUT ✓ [' + c.key + '] ' + c.ability : 'Belum direkrut — $' + c.price) + '</div>';
    });
    $('pause-crew-list').innerHTML = crewHtml;
    $('pause-screen').classList.remove('hidden');
    renderCrewPanel();
  }
  function showEndScreen(won) {
    var s = TA.state;
    var rank = TA.career.getRank();
    $('end-title').textContent = won ? 'UTANG LUNAS — BENGKEL SELAMAT' : 'RAKA TERTANGKAP — UTANG TETAP BERJALAN';
    $('end-text').textContent = won
      ? 'Fajar naik di pelabuhan. Darma ditangkap hidup-hidup, bukti utang ayahmu kembali, dan bengkel Pak Amir selamat. Teluk Arunika akhirnya tenang — untuk hari ini.'
      : 'Raka tertangkap. Bengkel ayahnya disita, tapi cerita belum berakhir — coba lagi.';
    $('end-stats').innerHTML = 'Misi selesai: ' + s.missionsDone + '/10 · XP: ' + s.xp + ' · Peringkat akhir: ' + rank.name + ' · Uang: $' + s.money.toLocaleString('en-US') + ' · Mobil dicuri: ' + s.carsStolen;
    $('end-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
  }
  function showRankUpBanner(text) {
    var el = $('rankup-banner');
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 3500);
  }
  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.textContent = ''; }, 4000);
  }
  function showSaving() {
    var el = $('saving');
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 1200);
  }
  function showCrewChatter(name, text) {
    var el = $('chatter');
    $('chatter-name').textContent = name.toUpperCase();
    $('chatter-text').textContent = text;
    el.classList.remove('hidden');
    if (chatterTimer) clearTimeout(chatterTimer);
    // In shot mode (?shot=) keep chatter visible for the screenshot.
    if (!new URLSearchParams(window.location.search).get('shot')) {
      chatterTimer = setTimeout(function () { el.classList.add('hidden'); }, 5000);
    }
  }
  function showInteract(text) {
    var el = $('interact-prompt');
    el.textContent = text;
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('hidden'); }, 1500);
  }
  function showHeliLabel(on) { $('dispatch-heli').classList.toggle('hidden', !on); }

  function renderCrewPanel() {
    var s = TA.state;
    var html = '';
    TA.crew.CREW.forEach(function (c) {
      var owned = !!s.crew[c.id];
      var ready = TA.crew.crewAbilityReady(c.id);
      html += '<div class="crew-entry"><div class="crew-avatar">' + c.name[0] + '</div>' +
        '<div><div class="ce-name">' + c.name + ' "' + c.nick + '"</div><div class="ce-role">' + c.role + ' · ' + c.passive + '</div>' +
        '<div class="ce-ability">[' + c.key + '] ' + c.ability + ' — ' + c.desc + '</div></div>' +
        '<div class="ce-status">' + (owned ? (ready ? 'READY ✓' : 'COOLDOWN') : '$' + c.price) +
        (owned ? '' : '<br><button data-recruit="' + c.id + '">REKRUT $' + c.price + '</button>') + '</div></div>';
    });
    $('crew-list').innerHTML = html;
    var btns = document.querySelectorAll('[data-recruit]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () { TA.crew.recruitCrewMember(b.getAttribute('data-recruit')); });
    });
  }
  function toggleCrewPanel() {
    var el = $('crew-panel');
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) renderCrewPanel();
  }
  function toggleWeaponWheel(show) {
    var el = $('weapon-wheel');
    el.classList.toggle('hidden', !show);
    if (show) {
      var slots = document.querySelectorAll('.wheel-slot');
      slots.forEach(function (sl) {
        sl.classList.toggle('active', Number(sl.getAttribute('data-w')) === TA.state.weapon);
      });
    }
  }
  function toggleMinimapZoom() {
    minimapZoom = minimapZoom === 1 ? 1.6 : 1;
    var cv = $('minimap');
    cv.style.width = (180 * minimapZoom) + 'px';
    cv.style.height = (180 * minimapZoom) + 'px';
  }
  function showDialogue(speaker, text) {
    $('dialogue-speaker').textContent = speaker;
    $('dialogue-text').textContent = text;
    $('dialogue').classList.remove('hidden');
  }
  function hideDialogue() { $('dialogue').classList.add('hidden'); }

  function update(dt) {
    if (TA.state.mode === 'playing') renderMinimap();
  }

  TA.ui = {
    renderHUD: renderHUD, renderMinimap: renderMinimap,
    renderMissionBanner: renderMissionBanner, renderDispatchPanel: renderDispatchPanel,
    renderCrewCards: renderCrewCards, renderLocationBanner: renderLocationBanner,
    showStartScreen: showStartScreen, showPauseScreen: showPauseScreen,
    showEndScreen: showEndScreen, showRankUpBanner: showRankUpBanner,
    toast: toast, showSaving: showSaving, showCrewChatter: showCrewChatter,
    showInteract: showInteract, showHeliLabel: showHeliLabel,
    renderCrewPanel: renderCrewPanel, toggleCrewPanel: toggleCrewPanel,
    toggleWeaponWheel: toggleWeaponWheel, toggleMinimapZoom: toggleMinimapZoom,
    showDialogue: showDialogue, hideDialogue: hideDialogue, update: update,
  };
})();
