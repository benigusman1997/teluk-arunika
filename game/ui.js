// Teluk Arunika v3.6 — ui.js
// HUD + minimap + full-screen tabbed map, dispatch panel + police ticker,
// crew cards + chatter, mission/stage/contract banner, weapon wheel with
// ammo counts, radio line, location banner, start/pause/end screens.
(function () {
  'use strict';
  var TA = window.TA;

  var el = {};
  var minimapZoom = 1;
  var minimapHover = false;
  var lastHudText = '';
  var mapCanvasCtx = null;

  function $(id) { return document.getElementById(id); }

  function buildHUD() {
    ['hud', 'stars', 'money-row', 'day-row', 'time-row', 'rank-row', 'rank-name',
     'xp-fill', 'xp-text', 'crew-row', 'mission-banner', 'mission-title',
     'mission-stage', 'mission-objective', 'mission-distance', 'mission-next',
     'mission-contract', 'race-hud', 'race-timer', 'race-best', 'race-checkpoint',
     'dispatch-panel', 'dispatch-title', 'dispatch-list', 'police-ticker',
     'crew-cards', 'location-banner', 'district-name', 'street-name',
     'district-mood', 'speed-block', 'speed-value', 'car-name', 'car-condition',
     'radio-line', 'minimap', 'health-bar', 'hp-fill', 'armor-fill',
     'weapon-name', 'ammo-count', 'chatter-toast', 'toast', 'banner',
     'banner-title', 'banner-sub', 'rankup-banner', 'damage-flash',
     'saving-indicator', 'weapon-wheel', 'wheel-slots', 'crew-panel',
     'crew-panel-list', 'full-map', 'map-tabs', 'map-canvas', 'map-mission',
     'map-legend', 'map-districts', 'map-waypoint', 'save-btn',
     'start-screen', 'pause-screen', 'end-screen', 'end-title', 'end-stats',
     'mission-intro', 'intro-kicker', 'intro-title', 'intro-text',
     'dialogue-box', 'dialogue-speaker', 'dialogue-text',
     'pause-career', 'pause-crew', 'pause-saves', 'load-error'
    ].forEach(function (id) { el[id] = $(id); });

    // start screen buttons
    $('btn-new-game').addEventListener('click', function () { TA.core.startNewGame(); });
    $('btn-continue').addEventListener('click', function () { TA.core.continueGame(); });
    $('btn-resume').addEventListener('click', function () { TA.core.resumeGame(); });
    $('btn-save-1').addEventListener('click', function () { TA.career.saveGame(1); });
    $('btn-save-2').addEventListener('click', function () { TA.career.saveGame(2); });
    $('btn-save-3').addEventListener('click', function () { TA.career.saveGame(3); });
    $('btn-quit').addEventListener('click', function () { location.reload(); });
    $('btn-restart').addEventListener('click', function () { location.reload(); });
    el['dialogue-box'].addEventListener('click', function () { TA.missions.advanceDialogue(); });
    $('btn-close-map').addEventListener('click', function () { toggleFullMap(); });
    $('btn-close-crew').addEventListener('click', function () { toggleCrewPanel(); });
    $('btn-close-intro').addEventListener('click', function () {
      el['mission-intro'].style.display = 'none';
      TA.state.screen = 'playing';
    });
    if (el['save-btn']) el['save-btn'].addEventListener('click', function () { TA.career.saveGame(0); });
    if (el['map-canvas']) {
      el['map-canvas'].addEventListener('click', function (e) {
        var rect = el['map-canvas'].getBoundingClientRect();
        var mx = (e.clientX - rect.left) / rect.width;
        var my = (e.clientY - rect.top) / rect.height;
        var wx = -260 + mx * 580;
        var wz = -260 + my * 520;
        setWaypoint(wx, wz, 'Waypoint');
      });
    }
    // map tabs
    var tabs = document.querySelectorAll('#map-tabs .map-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { setMapTab(tab.dataset.tab); });
    });
    // crew recruit buttons (delegated)
    el['crew-panel-list'].addEventListener('click', function (e) {
      var btn = e.target.closest('[data-recruit]');
      if (btn) TA.crew.recruitCrewMember(btn.dataset.recruit);
    });
    // minimap hover tracking
    el['minimap'].addEventListener('mouseenter', function () { minimapHover = true; });
    el['minimap'].addEventListener('mouseleave', function () { minimapHover = false; });

    renderCrewCards();
    renderCrewPanel();
    renderDispatchPanel();
    renderPoliceTicker();
    renderLocationBanner();
    updateMissionBanner();
    updateRankRow();
    renderRadioLine();
  }

  // ---------- HUD ----------
  function formatClock(h) {
    var hh = Math.floor(h) % 24;
    var mm = Math.floor((h % 1) * 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }

  function weatherLabel(w) {
    return w === 'rain' ? 'HUJAN' : w === 'storm' ? 'BADAI' : 'CERAH';
  }

  function renderHUD() {
    var s = TA.state;
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    el['stars'].textContent = stars;
    el['stars'].className = s.wanted >= 4 ? 'stars hot' : 'stars';
    el['money-row'].textContent = '$' + s.money.toLocaleString('en-US');
    el['day-row'].textContent = 'HARI ' + s.day + ' / 7 · UTANG $' + s.debt.toLocaleString('en-US');
    el['time-row'].textContent = formatClock(s.time) + ' · ' + weatherLabel(s.weather);
    el['hp-fill'].style.width = Math.max(0, s.hp / s.maxHp * 100) + '%';
    el['armor-fill'].style.width = Math.max(0, s.armor / s.maxArmor * 100) + '%';
    var w = TA.player.WEAPONS[s.weapon];
    el['weapon-name'].textContent = w.name;
    el['ammo-count'].textContent = TA.player.getAmmoDisplay(w.key);
    // crew row
    var crewBits = [];
    TA.crew.CREW.forEach(function (c) {
      crewBits.push(c.name + (TA.crew.isRecruited(c.id) ? ' ✓' : ' ○'));
    });
    el['crew-row'].textContent = 'KRU: ' + crewBits.join(' · ');
    renderLocationBanner(); // keep the district banner in sync every frame
    // speed block
    if (s.inCar) {
      el['speed-block'].style.display = 'block';
      el['speed-value'].textContent = Math.round(s.carSpeed) + ' km/h';
      el['car-name'].textContent = TA.player.getCurrentCarName() || '';
      var cond = TA.player.getCarCondition();
      el['car-condition'].textContent = cond != null ? Math.round(cond) + '% KONDISI' : '';
      el['car-condition'].className = cond != null && cond < 35 ? 'car-cond bad' : 'car-cond';
    } else {
      el['speed-block'].style.display = 'none';
    }
    renderMinimap();
  }

  function updateRankRow() {
    var r = TA.career.getRank();
    el['rank-name'].textContent = 'TINGKAT ' + r.level + ' · ' + r.name;
    var nextXp = r.next ? r.next.xp : r.xp;
    var baseXp = TA.career.RANKS[r.level - 1].xp;
    var pct = r.next ? ((r.xp - baseXp) / (nextXp - baseXp)) * 100 : 100;
    el['xp-fill'].style.width = Math.min(100, Math.max(0, pct)) + '%';
    el['xp-text'].textContent = r.xp + ' / ' + (r.next ? nextXp : r.xp) + ' XP' + (r.next ? ' → ' + r.next.name : ' · MAKSIMAL');
  }

  function updateMissionBanner() {
    var s = TA.state;
    var m = TA.missions.currentMission();
    if (!m || !s.missionActive) {
      if (s.raceActive) {
        var r = TA.races.RACES[s.race.index];
        el['mission-banner'].style.display = 'block';
        el['mission-title'].textContent = 'BALAPAN LIAR — ' + r.name;
        el['mission-stage'].textContent = 'Checkpoint ' + (s.race.checkpoint + 1) + '/' + r.checkpoints.length;
        el['mission-objective'].textContent = 'Ikuti checkpoint — kalahkan BEST ' + TA.races.formatTime(TA.races.getBestTime(s.race.index));
        el['mission-distance'].textContent = '';
        el['mission-next'].textContent = 'NEXT: ' + (r.checkpoints[s.race.checkpoint + 1] ? r.checkpoints[s.race.checkpoint + 1].label : 'FINISH');
        el['mission-contract'].textContent = 'HADIAH $' + r.prize + ' · BIAYA MASUK $' + r.entry;
      } else {
        el['mission-banner'].style.display = 'none';
      }
      return;
    }
    var stage = TA.missions.currentStage();
    var act = TA.missions.getActForMission(s.missionIndex);
    var contract = TA.missions.getMissionContract(s.missionIndex);
    el['mission-banner'].style.display = 'block';
    el['mission-title'].textContent = 'MISI ' + (s.missionIndex + 1) + ' DARI 10 · ' + act.name + ' · TAHAP ' + (s.missionStage + 1) + '/' + m.stages.length;
    el['mission-stage'].textContent = stage ? stage.title : '';
    el['mission-objective'].textContent = stage ? stage.objective : '';
    el['mission-distance'].textContent = TA.missions.getObjectiveDistance() + ' m';
    var nextStage = m.stages[s.missionStage + 1];
    el['mission-next'].textContent = nextStage ? 'NEXT: ' + nextStage.title : 'NEXT: SELESAIKAN MISI';
    el['mission-contract'].textContent = 'KONTRAK: ' + contract.syndicate + ' — $' + contract.reward;
  }

  function updateRaceHUD() {
    var s = TA.state;
    if (!s.raceActive || !s.race) { el['race-hud'].style.display = 'none'; return; }
    el['race-hud'].style.display = 'block';
    el['race-timer'].textContent = TA.races.formatTime(s.race.time);
    el['race-best'].textContent = 'BEST ' + TA.races.formatTime(TA.races.getBestTime(s.race.index));
    var r = TA.races.RACES[s.race.index];
    el['race-checkpoint'].textContent = 'CHECKPOINT ' + (s.race.checkpoint + 1) + '/' + r.checkpoints.length;
    updateMissionBanner();
  }

  // ---------- minimap ----------
  function renderMinimap() {
    var cv = el['minimap'];
    if (!cv) return;
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,16,24,0.92)';
    g.fillRect(0, 0, W, H);
    var px = TA.playerObj ? TA.playerObj.position.x : 0;
    var pz = TA.playerObj ? TA.playerObj.position.z : 0;
    var scale = (W / 520) * minimapZoom;
    function toX(x) { return W / 2 + (x - px) * scale; }
    function toY(z) { return H / 2 + (z - pz) * scale; }
    // roads
    g.strokeStyle = 'rgba(120,130,145,0.7)';
    g.lineWidth = 2;
    [-120, -80, -40, 0, 40, 80, 120].forEach(function (v) {
      g.beginPath(); g.moveTo(toX(v), 0); g.lineTo(toX(v), H); g.stroke();
      g.beginPath(); g.moveTo(0, toY(v)); g.lineTo(W, toY(v)); g.stroke();
    });
    // districts tint
    g.fillStyle = 'rgba(255,90,0,0.18)';
    g.fillRect(toX(170), toY(-30), 140 * scale, 140 * scale); // Pulau Abu
    g.fillStyle = 'rgba(40,120,255,0.15)';
    g.fillRect(toX(-170), toY(130), 120 * scale, 90 * scale); // port
    // race route
    if (TA.state.raceActive && TA.state.race) {
      var r = TA.races.RACES[TA.state.race.index];
      g.strokeStyle = '#00ff88';
      g.lineWidth = 2.5;
      g.beginPath();
      r.checkpoints.forEach(function (cp, i) {
        if (i === 0) g.moveTo(toX(cp.x), toY(cp.z)); else g.lineTo(toX(cp.x), toY(cp.z));
      });
      g.stroke();
      r.checkpoints.forEach(function (cp, i) {
        g.fillStyle = i === TA.state.race.checkpoint ? '#00ff88' : '#ffc400';
        g.beginPath(); g.arc(toX(cp.x), toY(cp.z), 4, 0, Math.PI * 2); g.fill();
      });
    }
    // objective blip (yellow)
    if (TA.state.missionActive) {
      var ob = TA.missions.getObjectiveBlip();
      g.fillStyle = '#ffe600';
      g.beginPath(); g.arc(toX(ob.x), toY(ob.z), 5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ffe600'; g.lineWidth = 1;
      g.beginPath(); g.arc(toX(ob.x), toY(ob.z), 8, 0, Math.PI * 2); g.stroke();
    }
    // safehouse (blue), taxi (green), export (purple)
    g.fillStyle = '#4aa8ff';
    g.fillRect(toX(24) - 3, toY(-24) - 3, 6, 6);
    g.fillStyle = '#3ad86a';
    g.fillRect(toX(60) - 3, toY(60) - 3, 6, 6);
    if (TA.state.carExport) {
      g.fillStyle = '#c07aff';
      g.beginPath(); g.arc(toX(-120), toY(170), 5, 0, Math.PI * 2); g.fill();
    }
    // police blips (red)
    g.fillStyle = '#ff3344';
    TA.police.getDispatchUnits().forEach(function (u, i) {
      var a = (i / 6) * Math.PI * 2 + TA.state.elapsed;
      g.beginPath(); g.arc(toX(px + Math.cos(a) * u.dist), toY(pz + Math.sin(a) * u.dist), 3.5, 0, Math.PI * 2); g.fill();
    });
    // waypoint
    if (TA.state.waypoint) {
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(toX(TA.state.waypoint.x), toY(TA.state.waypoint.z), 4, 0, Math.PI * 2); g.fill();
    }
    // player arrow (centre)
    g.fillStyle = '#ffffff';
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(TA.playerYaw || 0);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
    g.restore();
    // compass
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = 'bold 11px sans-serif';
    g.fillText('N', W - 14, 14);
  }

  function minimapHovered(x, y) { return minimapHover; }
  function zoomMinimap(dir) {
    minimapZoom = Math.max(0.6, Math.min(3, minimapZoom + dir * 0.3));
  }

  // ---------- dispatch + ticker ----------
  var lastDispatchSig = '';
  function renderDispatchPanel() {
    var units = TA.police.getDispatchUnits();
    var foot = TA.police.getFootUnits();
    var all = foot.concat(units);
    // cache: distances rounded to 5 m so the DOM is not rebuilt every frame
    var sig = TA.state.wanted + '|' + TA.state.heliActive + '|' +
      all.map(function (u) { return u.name + u.tactic + Math.round(u.dist / 5); }).join(',');
    if (sig === lastDispatchSig) {
      el['dispatch-panel'].style.display = TA.state.wanted > 0 ? 'block' : 'none';
      return;
    }
    lastDispatchSig = sig;
    var title = 'DISPATCH POLISI — ' + all.length + ' UNIT';
    if (TA.state.heliActive) title += ' · ELANG-1 DITERJUNKAN';
    el['dispatch-title'].textContent = title;
    if (all.length === 0) {
      el['dispatch-list'].innerHTML = '<div class="dispatch-empty">Tidak ada unit aktif — jalanan tenang.</div>';
    } else {
      el['dispatch-list'].innerHTML = all.map(function (u) {
        return '<div class="dispatch-row"><span class="du-name">' + u.name + '</span>' +
          '<span class="du-kind">' + u.kind + '</span>' +
          '<span class="du-tactic">' + u.tactic + '</span>' +
          '<span class="du-dist">' + u.dist + ' m</span></div>';
      }).join('');
    }
    el['dispatch-panel'].style.display = TA.state.wanted > 0 ? 'block' : 'none';
  }

  function renderPoliceTicker() {
    var lines = TA.police.getTicker();
    el['police-ticker'].innerHTML = lines.map(function (t) {
      return '<div class="ticker-line">📻 ' + t + '</div>';
    }).join('');
  }

  // ---------- crew cards + chatter ----------
  function renderCrewCards() {
    var html = '';
    TA.crew.CREW.forEach(function (c) {
      var rec = TA.crew.isRecruited(c.id);
      var ready = TA.crew.crewAbilityReady(c.id);
      var cd = Math.ceil(TA.crew.getCooldowns()[c.id] || 0);
      var status = !rec ? 'BELUM DIREKRUT' : (ready ? 'READY' : (c.id === 'agus' && TA.state.ghostUsedThisMission ? 'SEKALI/MISI' : 'COOLDOWN ' + cd + ' dtk'));
      var cls = !rec ? 'locked' : (ready ? 'ready' : 'cooling');
      html += '<div class="crew-card ' + cls + '">' +
        '<div class="cc-name">' + c.name + ' <span class="cc-nick">“' + c.nickname + '”</span></div>' +
        '<div class="cc-role">' + c.role + ' · ' + c.ability + ' [' + c.key + ']</div>' +
        '<div class="cc-status">' + status + '</div></div>';
    });
    el['crew-cards'].innerHTML = html;
  }

  function renderCrewPanel() {
    var html = '';
    TA.crew.CREW.forEach(function (c) {
      var rec = TA.crew.isRecruited(c.id);
      html += '<div class="crew-panel-row">' +
        '<div class="cp-face">' + c.name.charAt(0) + '</div>' +
        '<div class="cp-info"><b>' + c.name + ' “' + c.nickname + '”</b> — ' + c.role +
        '<br><span class="cp-desc">' + c.desc + '</span>' +
        '<br><span class="cp-passive">Pasif: ' + c.passive + '</span></div>' +
        '<div class="cp-action">' + (rec
          ? '<span class="recruited">✓ DIREKRUT</span>'
          : '<button data-recruit="' + c.id + '">REKRUT $' + c.price + '</button>') + '</div></div>';
    });
    el['crew-panel-list'].innerHTML = html;
  }

  function toggleCrewPanel() {
    TA.state.crewPanelOpen = !TA.state.crewPanelOpen;
    el['crew-panel'].style.display = TA.state.crewPanelOpen ? 'block' : 'none';
    if (TA.state.crewPanelOpen) renderCrewPanel();
  }

  function renderCrewChatter() {
    var c = TA.state.chatter;
    if (!c) { el['chatter-toast'].style.display = 'none'; return; }
    el['chatter-toast'].style.display = 'block';
    el['chatter-toast'].innerHTML = '<b>' + c.name + ':</b> ' + c.text;
  }

  // ---------- location banner ----------
  function renderLocationBanner() {
    var d = TA.career.getDistrict(TA.state.district);
    el['district-name'].textContent = d.name.toUpperCase();
    el['street-name'].textContent = TA.state.street;
    el['district-mood'].textContent = 'SUASANA · ' + d.standing;
    el['district-mood'].className = d.standing >= 60 ? 'mood good' : d.standing >= 40 ? 'mood mid' : 'mood bad';
  }

  function showLocationBanner() {
    renderLocationBanner();
    el['location-banner'].classList.add('pop');
    setTimeout(function () { el['location-banner'].classList.remove('pop'); }, 1200);
  }

  // ---------- radio line ----------
  function renderRadioLine() {
    var st = TA.audio.currentStation();
    el['radio-line'].textContent = '♪ ' + st.name + ' — ' + st.genre;
  }

  // ---------- weapon wheel ----------
  function openWeaponWheel() {
    TA.state.wheelOpen = true;
    el['weapon-wheel'].style.display = 'flex';
    refreshWeaponWheel();
  }

  function closeWeaponWheel() {
    TA.state.wheelOpen = false;
    el['weapon-wheel'].style.display = 'none';
  }

  function toggleWeaponWheel() {
    if (TA.state.wheelOpen) closeWeaponWheel(); else openWeaponWheel();
  }

  function refreshWeaponWheel() {
    if (!TA.state.wheelOpen) return;
    var html = '';
    TA.player.WEAPONS.forEach(function (w, i) {
      var owned = i === 0 || TA.player.getOwnedWeapons()[w.key];
      var sel = TA.state.weapon === i ? 'selected' : '';
      var ammo = TA.player.getAmmoDisplay(w.key);
      html += '<div class="wheel-slot ' + sel + ' ' + (owned ? '' : 'locked') + '" data-weapon="' + i + '">' +
        '<div class="ws-key">' + (i + 1) + '</div>' +
        '<div class="ws-name">' + w.name + '</div>' +
        '<div class="ws-ammo">' + ammo + '</div>' +
        (owned ? '' : '<div class="ws-locked">BELUM DIBELI</div>') +
        '</div>';
    });
    el['wheel-slots'].innerHTML = html;
    var slots = el['wheel-slots'].querySelectorAll('.wheel-slot');
    slots.forEach(function (slot) {
      slot.addEventListener('click', function () {
        TA.player.switchWeapon(parseInt(slot.dataset.weapon, 10));
        closeWeaponWheel();
      });
    });
  }

  // ---------- banners / toasts ----------
  function showBanner(title, sub) {
    el['banner-title'].textContent = title;
    el['banner-sub'].textContent = sub || '';
    el['banner'].style.display = 'block';
    el['banner'].classList.remove('fade');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(function () { el['banner'].classList.add('fade'); }, 2500);
  }

  function hideBanner() {
    el['banner'].style.display = 'none';
    el['banner'].classList.remove('fade');
  }

  function showToast(text) {
    el['toast'].textContent = text;
    el['toast'].style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el['toast'].style.display = 'none'; }, 3200);
  }

  function showRankUpBanner(rank) {
    el['rankup-banner'].innerHTML = '★ NAIK TINGKAT: ' + rank.name.toUpperCase() + ' ★<br><span>' + rank.perk + '</span>';
    el['rankup-banner'].style.display = 'block';
    clearTimeout(showRankUpBanner._t);
    showRankUpBanner._t = setTimeout(function () { el['rankup-banner'].style.display = 'none'; }, 4500);
  }

  function flashDamage() {
    el['damage-flash'].style.opacity = '0.45';
    setTimeout(function () { el['damage-flash'].style.opacity = '0'; }, 120);
  }

  function showSavingIndicator() {
    el['saving-indicator'].style.display = TA.state.saving ? 'block' : 'none';
  }

  // ---------- screens ----------
  function showStartScreen() {
    el['start-screen'].style.display = 'flex';
    el['hud'].style.display = 'none';
  }

  function hideStartScreen() {
    el['start-screen'].style.display = 'none';
    el['hud'].style.display = 'block';
  }

  function showPauseScreen() {
    el['pause-screen'].style.display = 'flex';
    var r = TA.career.getRank();
    el['pause-career'].innerHTML = '<b>KARIER — ' + r.name + ' (Tingkat ' + r.level + ')</b><br>' +
      'XP: ' + r.xp + ' / ' + (r.next ? r.next.xp : r.xp) + ' · Perk terbuka: ' + r.perk +
      (r.next ? '<br>Berikutnya: ' + r.next.name + ' (' + r.next.xp + ' XP) — ' + r.next.perk : '<br>Tingkat maksimal tercapai.');
    var crewHtml = '<b>KRU</b><br>';
    TA.crew.CREW.forEach(function (c) {
      crewHtml += c.name + ' “' + c.nickname + '” — ' + (TA.crew.isRecruited(c.id) ? '✓ direkrut (' + c.ability + ' [' + c.key + '])' : 'belum direkrut ($' + c.price + ')') + '<br>';
    });
    el['pause-crew'].innerHTML = crewHtml;
    el['pause-saves'].innerHTML = '<b>SAVE</b> — Uang $' + TA.state.money + ' · Hari ' + TA.state.day + '/7 · Misi ' + (TA.state.missionIndex + 1) + '/10 · ' + formatClock(TA.state.time) + ' ' + weatherLabel(TA.state.weather);
  }

  function hidePauseScreen() {
    el['pause-screen'].style.display = 'none';
  }

  function showEndScreen(won, title) {
    var r = TA.career.getRank();
    el['end-screen'].style.display = 'flex';
    el['end-title'].textContent = title;
    el['end-title'].className = won ? 'end-title win' : 'end-title lose';
    el['end-stats'].innerHTML =
      (won ? 'UTANG LUNAS — Bengkel Selamat' : 'Perjalanan Raka berakhir di sini.') +
      '<br>Misi selesai: ' + TA.state.missionIndex + '/10 · XP: ' + TA.state.xp +
      ' · Peringkat akhir: ' + r.name +
      '<br>Mobil dicuri: ' + TA.state.carsStolen + ' · Balapan dimenangkan: ' + TA.state.racesWon +
      ' · Uang: $' + TA.state.money;
  }

  function showMissionIntroCard(index, act, m) {
    el['intro-kicker'].textContent = 'MISI ' + (index + 1) + ' · ' + act.name;
    el['intro-title'].textContent = m.title;
    el['intro-text'].textContent = m.intro + ' — Kontrak: ' + TA.missions.getMissionContract(index).syndicate + ' — $' + m.reward;
    el['mission-intro'].style.display = 'flex';
    setTimeout(function () {
      el['mission-intro'].style.display = 'none';
      if (TA.state.screen === 'cutscene' && !isDialogueOpen()) TA.state.screen = 'playing';
    }, 2600);
  }

  function showDialogueBox(text, onDone) {
    var parts = text.split(':');
    el['dialogue-speaker'].textContent = parts[0] || '';
    el['dialogue-text'].textContent = parts.slice(1).join(':').replace(/^ “|”$/g, '').trim() || text;
    el['dialogue-box'].style.display = 'block';
    el['dialogue-box'].dataset.continue = 'SPACE / CLICK to continue';
  }

  function isDialogueOpen() {
    return el['dialogue-box'] && el['dialogue-box'].style.display === 'block';
  }

  function hideDialogueBox() {
    el['dialogue-box'].style.display = 'none';
  }

  // ---------- full map ----------
  function showFullMap() {
    TA.state.prevScreen = TA.state.screen;
    TA.state.screen = 'map';
    TA.state.mapOpen = true;
    el['full-map'].style.display = 'flex';
    setMapTab(TA.state.mapTab || 'PETA');
    renderFullMap();
  }

  function hideFullMap() {
    TA.state.mapOpen = false;
    el['full-map'].style.display = 'none';
    TA.state.screen = 'playing';
  }

  function toggleFullMap() {
    if (TA.state.mapOpen) hideFullMap(); else showFullMap();
  }

  function setMapTab(tab) {
    TA.state.mapTab = tab;
    var tabs = document.querySelectorAll('#map-tabs .map-tab');
    tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
    renderMapTabContent(tab);
  }

  function renderMapTabs() { renderMapTabContent(TA.state.mapTab); }

  function renderMapTabContent(tab) {
    var mission = el['map-mission'];
    var legend = el['map-legend'];
    var districts = el['map-districts'];
    if (tab === 'PETA') {
      var m = TA.missions.currentMission();
      var stage = TA.missions.currentStage();
      mission.innerHTML = '<b>CURRENT MISSION</b><br>' +
        (m ? 'Misi ' + (TA.state.missionIndex + 1) + ' — ' + m.title + '<br>' + (stage ? stage.title + ': ' + stage.objective : '') : 'Tidak ada misi aktif') +
        '<br><span class="map-sub">Kontrak: ' + (m ? TA.missions.getMissionContract(TA.state.missionIndex).syndicate + ' — $' + m.reward : '-') + '</span>';
      legend.innerHTML = '<b>LEGEND</b><br>' +
        '<span class="lg yellow">◆</span> Misi &nbsp; <span class="lg orange">◆</span> Respray &nbsp; <span class="lg blue">◆</span> Safehouse<br>' +
        '<span class="lg green">◆</span> Side job &nbsp; <span class="lg red">◆</span> Polisi &nbsp; <span class="lg purple">◆</span> Ekspor Mobil &nbsp; <span class="lg white">◆</span> Waypoint';
      renderDistrictStandingPanel();
    } else if (tab === 'CERITA') {
      var m2 = TA.missions.currentMission();
      mission.innerHTML = '<b>CERITA — 7 HARI UTANG</b><br>Raka, sopir taksi Teluk Arunika, berutang $5.000 ke Darma Wijaya. ' +
        'Tujuh hari untuk melunasi — kalau tidak, bengkel ayahnya disita.<br><span class="map-sub">Hari ' + TA.state.day + '/7 · Misi ' + (TA.state.missionIndex + 1) + '/10 · ' + (m2 ? m2.title : '') + '</span>';
      legend.innerHTML = '';
      districts.innerHTML = '';
    } else if (tab === 'STATISTIK') {
      mission.innerHTML = '<b>STATISTIK</b><br>Uang: $' + TA.state.money + ' · XP: ' + TA.state.xp + ' · Peringkat: ' + TA.career.getRank().name +
        '<br>Mobil dicuri: ' + TA.state.carsStolen + ' · Balapan dimenangkan: ' + TA.state.racesWon + ' · Ekspor selesai: ' + TA.state.exportsDone +
        '<br>Tembakan: ' + TA.state.shotsFired + ' · Musuh dilumpuhkan: ' + TA.state.kills;
      legend.innerHTML = '';
      districts.innerHTML = '';
    } else if (tab === 'KRU') {
      var ch = '<b>KRU</b><br>';
      TA.crew.CREW.forEach(function (c) {
        ch += c.name + ' “' + c.nickname + '” — ' + c.role + ' · ' + (TA.crew.isRecruited(c.id) ? '✓ ' + c.ability + ' [' + c.key + ']' : 'belum direkrut $' + c.price) + '<br>';
      });
      mission.innerHTML = ch;
      legend.innerHTML = '';
      districts.innerHTML = '';
    } else if (tab === 'KONTROL') {
      mission.innerHTML = '<b>KONTROL</b><br>WASD jalan/mengemudi · E masuk/curi mobil · Shift lari · Mouse + klik tembak<br>1-5 senjata · Tab weapon wheel · R radio · M peta · V panel kru · Z/X/C kemampuan kru · Esc jeda';
      legend.innerHTML = '';
      districts.innerHTML = '';
    } else if (tab === 'PENGATURAN') {
      mission.innerHTML = '<b>PENGATURAN</b><br>Musik: ON · SFX: ON · Kualitas: Tinggi<br><span class="map-sub">Semua audio sintetis WebAudio — tanpa file eksternal.</span>';
      legend.innerHTML = '';
      districts.innerHTML = '';
    } else if (tab === 'SIMPAN') {
      mission.innerHTML = '<b>SIMPAN</b><br>Autosave aktif. Klik SAVE GAME untuk menyimpan sekarang.<br><span class="map-sub">Uang $' + TA.state.money + ' · Hari ' + TA.state.day + '/7 · Misi ' + (TA.state.missionIndex + 1) + '/10</span>';
      legend.innerHTML = '';
      districts.innerHTML = '';
    }
    renderFullMap();
  }

  function renderDistrictStandingPanel() {
    var html = '<b>DISTRICT STANDING</b><br>';
    TA.career.DISTRICTS.forEach(function (d) {
      html += '<div class="ds-row"><span class="ds-name">' + d.name + '</span>' +
        '<span class="ds-bar"><span class="ds-fill" style="width:' + d.standing + '%"></span></span>' +
        '<span class="ds-val">' + d.standing + '</span></div>';
    });
    el['map-districts'].innerHTML = html;
  }

  function setWaypoint(x, z, label) {
    var dx = x - TA.playerPos.x, dz = z - TA.playerPos.z;
    var distKm = (Math.sqrt(dx * dx + dz * dz) / 1000).toFixed(2);
    TA.state.waypoint = { x: x, z: z, label: label || 'Waypoint', distKm: parseFloat(distKm) };
    el['map-waypoint'].textContent = 'Line up at the ' + (label || 'waypoint') + ' start · ' + distKm + ' km';
    renderFullMap();
  }

  function renderFullMap() {
    var cv = el['map-canvas'];
    if (!cv) return;
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    // sea + land
    g.fillStyle = '#0d2a3d';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#1d2733';
    g.fillRect(0, 0, W * 0.82, H);
    function toX(x) { return ((x + 260) / 580) * W; }
    function toY(z) { return ((z + 260) / 520) * H; }
    // districts
    var zones = [
      { x: -180, z: 120, w: 150, h: 140, c: 'rgba(40,120,255,0.20)', label: 'PELABUHAN' },
      { x: 30, z: 40, w: 120, h: 110, c: 'rgba(255,200,60,0.16)', label: 'PASAR' },
      { x: -180, z: -80, w: 90, h: 120, c: 'rgba(255,45,120,0.18)', label: 'GANG NEON' },
      { x: -260, z: 210, w: 520, h: 50, c: 'rgba(255,230,150,0.14)', label: 'PANTAI' },
      { x: -60, z: -260, w: 40, h: 200, c: 'rgba(120,120,140,0.20)', label: 'TOL LAYANG' },
      { x: 170, z: -30, w: 150, h: 140, c: 'rgba(255,90,0,0.28)', label: 'PULAU ABU' },
    ];
    zones.forEach(function (zn) {
      g.fillStyle = zn.c;
      g.fillRect(toX(zn.x), toY(zn.z), (zn.w / 580) * W, (zn.h / 520) * H);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.font = 'bold 11px sans-serif';
      g.fillText(zn.label, toX(zn.x) + 6, toY(zn.z) + 16);
    });
    // roads
    g.strokeStyle = 'rgba(160,170,185,0.55)';
    g.lineWidth = 2;
    [-120, -80, -40, 0, 40, 80, 120].forEach(function (v) {
      g.beginPath(); g.moveTo(toX(v), 0); g.lineTo(toX(v), H); g.stroke();
      g.beginPath(); g.moveTo(0, toY(v)); g.lineTo(W, toY(v)); g.stroke();
    });
    // bridge to Pulau Abu
    g.strokeStyle = '#ffaa33';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(toX(80), toY(40)); g.lineTo(toX(240), toY(40)); g.stroke();
    // waypoint route
    if (TA.state.waypoint) {
      var wp = TA.state.waypoint;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.moveTo(toX(TA.playerPos.x), toY(TA.playerPos.z));
      g.lineTo(toX(wp.x), toY(wp.z));
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(toX(wp.x), toY(wp.z), 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 11px sans-serif';
      g.fillText('Line up at the ' + wp.label + ' start · ' + wp.distKm + ' km', toX(wp.x) + 10, toY(wp.z) - 8);
    }
    // markers
    function marker(x, z, color, label) {
      g.fillStyle = color;
      g.beginPath(); g.arc(toX(x), toY(z), 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#000';
      g.stroke();
      if (label) { g.fillStyle = '#fff'; g.font = '10px sans-serif'; g.fillText(label, toX(x) + 9, toY(z) + 3); }
    }
    var ob = TA.missions.getObjectiveBlip();
    marker(ob.x, ob.z, '#ffe600', 'Misi');
    marker(24, -24, '#ff7a00', 'Respray');
    marker(24, -24, '#4aa8ff', 'Safehouse');
    marker(60, 60, '#3ad86a', 'Side job');
    marker(-120, 170, '#c07aff', 'Ekspor Mobil');
    TA.police.getDispatchUnits().forEach(function (u, i) {
      marker(TA.playerPos.x + Math.cos(i) * 30, TA.playerPos.z + Math.sin(i) * 30, '#ff3344', '');
    });
    // player
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(toX(TA.playerPos.x), toY(TA.playerPos.z), 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#000'; g.stroke();
    // map title
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 20px sans-serif';
    g.fillText('TELUK ARUNIKA', 14, 26);
  }

  // ---------- per-frame ----------
  function update(dt) {
    if (TA.state.screen === 'playing' || TA.state.screen === 'map' || TA.state.screen === 'cutscene') {
      renderHUD();
      renderDispatchPanel();
      updateMissionBanner();
      updateRaceHUD();
      if (TA.state.mapOpen) renderFullMap();
      // mission banner distance refresh
      if (TA.state.missionActive) {
        el['mission-distance'].textContent = TA.missions.getObjectiveDistance() + ' m';
      }
    }
  }

  TA.ui = {
    buildHUD: buildHUD,
    renderHUD: renderHUD,
    renderMinimap: renderMinimap,
    minimapHovered: minimapHovered,
    zoomMinimap: zoomMinimap,
    renderDispatchPanel: renderDispatchPanel,
    renderPoliceTicker: renderPoliceTicker,
    renderCrewCards: renderCrewCards,
    renderCrewPanel: renderCrewPanel,
    toggleCrewPanel: toggleCrewPanel,
    renderCrewChatter: renderCrewChatter,
    renderLocationBanner: renderLocationBanner,
    showLocationBanner: showLocationBanner,
    renderRadioLine: renderRadioLine,
    openWeaponWheel: openWeaponWheel,
    closeWeaponWheel: closeWeaponWheel,
    toggleWeaponWheel: toggleWeaponWheel,
    refreshWeaponWheel: refreshWeaponWheel,
    showBanner: showBanner,
    hideBanner: hideBanner,
    showToast: showToast,
    showRankUpBanner: showRankUpBanner,
    flashDamage: flashDamage,
    showSavingIndicator: showSavingIndicator,
    showStartScreen: showStartScreen,
    hideStartScreen: hideStartScreen,
    showPauseScreen: showPauseScreen,
    hidePauseScreen: hidePauseScreen,
    showEndScreen: showEndScreen,
    showMissionIntroCard: showMissionIntroCard,
    showDialogueBox: showDialogueBox,
    hideDialogueBox: hideDialogueBox,
    isDialogueOpen: isDialogueOpen,
    showFullMap: showFullMap,
    hideFullMap: hideFullMap,
    toggleFullMap: toggleFullMap,
    setMapTab: setMapTab,
    renderMapTabs: renderMapTabs,
    setWaypoint: setWaypoint,
    renderDistrictStandingPanel: renderDistrictStandingPanel,
    renderFullMap: renderFullMap,
    updateRankRow: updateRankRow,
    updateMissionBanner: updateMissionBanner,
    updateRaceHUD: updateRaceHUD,
    update: update,
  };
})();
