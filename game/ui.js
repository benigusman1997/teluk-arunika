// TELUK ARUNIKA v3 — ui.js
// HUD + minimap + menu: start, pause (3 slot save + autosave + karier + kru),
// banner naik tingkat, dialog, weapon wheel, layar akhir, toast.
(function () {
  'use strict';

  var U = TA.ui = {};

  U.minimapZoom = 1;
  U.minimapCtx = null;
  U.toastTimer = null;
  U.bannerTimer = null;
  U.hudThrottle = 0;
  U.minimapThrottle = 0;
  U.dialogueStatic = false;

  U.initUI = function () {
    var mm = TA.el('minimap');
    if (mm) U.minimapCtx = mm.getContext('2d');
    // Tombol layar start.
    var btnNew = TA.el('btn-new-game');
    if (btnNew) btnNew.addEventListener('click', function () { TA.startNewGame(); });
    var btnContinue = TA.el('btn-continue');
    if (btnContinue) btnContinue.addEventListener('click', function () {
      if (!TA.loadGame('auto') && !TA.loadGame('1')) {
        TA.ui.toast('Tidak ada save — mulai permainan baru.');
        TA.startNewGame();
      }
    });
    if (btnContinue) btnContinue.style.display = TA.hasSave('auto') || TA.hasSave('1') ? '' : 'none';
    var btnResume = TA.el('btn-resume');
    if (btnResume) btnResume.addEventListener('click', function () { TA.resumeGame(); });
    var btnQuit = TA.el('btn-quit-menu');
    if (btnQuit) btnQuit.addEventListener('click', function () {
      TA.state.mode = 'menu';
      TA.ui.hideAllScreens();
      TA.ui.showStartScreen();
    });
    var btnRestart = TA.el('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', function () { TA.startNewGame(); });
    // Slot save di pause.
    document.querySelectorAll('[data-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        TA.saveGame(btn.getAttribute('data-save'));
        TA.ui.toast('Disimpan ke slot ' + btn.getAttribute('data-save') + '.');
        U.refreshSaveSlots();
      });
    });
    document.querySelectorAll('[data-load]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (TA.loadGame(btn.getAttribute('data-load'))) {
          TA.ui.toast('Save slot ' + btn.getAttribute('data-load') + ' dimuat.');
        } else {
          TA.ui.toast('Slot ' + btn.getAttribute('data-load') + ' kosong.');
        }
      });
    });
    // Toko senjata & armor (di pause).
    document.querySelectorAll('[data-buy-weapon]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        TA.player.buyWeapon(parseInt(btn.getAttribute('data-buy-weapon'), 10));
        U.refreshShop();
      });
    });
    var btnArmor = TA.el('btn-buy-armor');
    if (btnArmor) btnArmor.addEventListener('click', function () {
      TA.player.buyArmor();
      U.refreshShop();
    });
    // Dialog: klik untuk lanjut.
    var dlg = TA.el('dialogue');
    if (dlg) dlg.addEventListener('click', function () {
      if (!U.dialogueStatic) TA.missions.advanceDialogue();
    });
    // Pilihan cabang.
    var choice = TA.el('choice');
    if (choice) choice.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-choice]');
      if (!btn) return;
      var idx = parseInt(btn.getAttribute('data-choice'), 10);
      var opts = U._choiceOpts || [];
      U.hideChoice();
      TA.state.mode = 'playing';
      if (opts[idx]) opts[idx].run();
    });
    U.refreshSaveSlots();
    U.refreshShop();
    U.renderHUD(true);
  };

  U.hideAllScreens = function () {
    ['start-screen', 'pause-screen', 'ending-screen', 'gameover-screen'].forEach(function (id) {
      var e = TA.el(id);
      if (e) e.classList.add('hidden');
    });
    U.hideDialogue();
  };

  // ---------------------------------------------------------------- HUD
  U.renderHUD = function (force) {
    var s = TA.state;
    var now = performance.now();
    if (!force && now - U.hudThrottle < 120) return;
    U.hudThrottle = now;
    var set = function (id, v) { var e = TA.el(id); if (e) e.textContent = v; };
    var stars = '';
    for (var i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    set('wanted-stars', stars);
    var wEl = TA.el('wanted-stars');
    if (wEl) wEl.className = 'wanted' + (s.wanted >= 4 ? ' hot' : (s.wanted > 0 ? ' warm' : ''));
    set('money', TA.fmtMoney(s.money));
    set('day-debt', 'HARI ' + s.day + '/7 · UTANG ' + TA.fmtMoney(s.debt));
    var weatherIcon = s.weather === 'rain' ? '🌧' : (s.weather === 'storm' ? '⛈' : '☀');
    set('clock-weather', TA.fmtClock(s.timeMinutes) + ' ' + weatherIcon + ' ' +
      (s.timeOfDay === 'dawn' ? 'Fajar' : s.timeOfDay === 'day' ? 'Siang' : s.timeOfDay === 'dusk' ? 'Senja' : 'Malam'));
    var hpFill = TA.el('hp-fill');
    if (hpFill) hpFill.style.width = Math.max(0, Math.round(100 * s.hp / s.maxHp)) + '%';
    var arFill = TA.el('armor-fill');
    if (arFill) arFill.style.width = Math.max(0, Math.round(100 * s.armor / s.maxArmor)) + '%';
    set('hp-text', Math.round(s.hp) + ' / ' + s.maxHp);
    set('armor-text', Math.round(s.armor) + ' / ' + s.maxArmor);
    var w = TA.player.currentWeapon();
    var wi = s.weaponIndex;
    set('weapon-name', w.name.toUpperCase());
    set('ammo', TA.player.mag[wi] + ' / ' + TA.player.ammo[wi]);
    // Baris kru.
    var crewNames = [];
    if (s.crew.sari) crewNames.push('Sari ✓');
    if (s.crew.budi) crewNames.push('Budi ✓');
    if (s.crew.agus) crewNames.push('Agus ✓');
    set('crew-row', 'KRU: ' + (crewNames.length ? crewNames.join('  ') : '— (rekrut di bengkel, C)'));
    // Bar XP + tingkat karier.
    var rank = TA.career.getRank();
    set('rank-name', rank.name.toUpperCase());
    set('xp-text', s.xp + ' XP' + (rank.next ? ' · ' + (rank.next.xp - s.xp) + ' XP ke ' + rank.next.name : ' · MAKS'));
    var xpFill = TA.el('xp-fill');
    if (xpFill) xpFill.style.width = (rank.next ? Math.round(100 * rank.xpInto / rank.xpNeeded) : 100) + '%';
    // Speedometer (hanya saat di mobil).
    var sp = TA.el('speedo');
    if (sp) {
      sp.style.display = s.inCar ? '' : 'none';
      set('speed-num', Math.round(s.speedKmh));
    }
    // Crosshair hanya saat jalan kaki.
    var ch = TA.el('crosshair');
    if (ch) ch.style.display = s.inCar ? 'none' : '';
    // Indikator Gaspol aktif.
    var ab = TA.el('ability-indicator');
    if (ab) {
      var gaspol = performance.now() < s.gaspolUntil;
      ab.style.display = gaspol ? '' : 'none';
      if (gaspol) ab.textContent = '⚡ GASPOL — wanted beku';
    }
    // Cooldown kemampuan.
    var cd = TA.el('ability-cd');
    if (cd) cd.textContent = s.abilityCd > 0 ? 'Q cooldown: ' + Math.ceil(s.abilityCd) + ' dtk' : (s.crew.sari || s.crew.agus ? 'Q siap — kemampuan kru' : '');
  };

  U.setObjective = function (text) {
    var e = TA.el('objective');
    if (e) e.textContent = text;
  };

  U.setRadioText = function (text) {
    var e = TA.el('radio');
    if (e) e.textContent = '♪ ' + text;
  };

  U.setReloading = function (on) {
    var e = TA.el('reload-indicator');
    if (e) e.style.display = on ? '' : 'none';
  };

  U.showJackPrompt = function (show) {
    var e = TA.el('jack-prompt');
    if (e) e.style.display = show ? '' : 'none';
    if (!show) U.setJackProgress(0);
  };

  U.setJackProgress = function (p) {
    var e = TA.el('jack-fill');
    if (e) e.style.width = Math.round(TA.clamp(p, 0, 1) * 100) + '%';
  };

  U.flashDamage = function () {
    var e = TA.el('damage-flash');
    if (!e) return;
    e.style.opacity = '0.45';
    setTimeout(function () { e.style.opacity = '0'; }, 120);
  };

  U.flashAbility = function (text) {
    var e = TA.el('ability-flash');
    if (!e) return;
    e.textContent = text;
    e.style.opacity = '1';
    // Di mode screenshot, biarkan tetap menyala sampai capture.
    if (TA.shot > 0) return;
    setTimeout(function () { e.style.opacity = '0'; }, 1400);
  };

  U.flashSaving = function () {
    var e = TA.el('saving');
    if (!e) return;
    e.style.display = '';
    setTimeout(function () { e.style.display = 'none'; }, 900);
  };

  U.toast = function (msg) {
    var e = TA.el('toast');
    if (!e) return;
    e.textContent = msg;
    e.style.opacity = '1';
    if (U.toastTimer) clearTimeout(U.toastTimer);
    // Di mode screenshot, toast tidak boleh memudar sebelum capture.
    if (TA.shot > 0) return;
    U.toastTimer = setTimeout(function () { e.style.opacity = '0'; }, 4200);
  };

  U.showRankUpBanner = function (rankName) {
    var e = TA.el('banner');
    if (!e) return;
    e.innerHTML = '★ NAIK TINGKAT: ' + rankName.toUpperCase() + ' ★';
    e.style.display = '';
    if (U.bannerTimer) clearTimeout(U.bannerTimer);
    U.bannerTimer = setTimeout(function () { e.style.display = 'none'; }, 4000);
  };

  // ---------------------------------------------------------------- minimap
  U.toggleMinimapZoom = function () {
    U.minimapZoom = U.minimapZoom === 1 ? 2 : 1;
    var mm = TA.el('minimap');
    if (mm) mm.style.width = (180 * U.minimapZoom) + 'px';
  };

  U.renderMinimap = function () {
    var ctx = U.minimapCtx;
    if (!ctx) return;
    var S = 180;
    var scale = S / 470;
    var cx = TA.state.inCar && TA.car ? TA.car.x : TA.px;
    var cz = TA.state.inCar && TA.car ? TA.car.z : TA.pz;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(10, 16, 24, 0.85)';
    ctx.fillRect(0, 0, S, S);
    var toX = function (x) { return (x + 235) * scale; };
    var toY = function (z) { return (z + 235) * scale; };
    // Jalan.
    ctx.strokeStyle = '#5a6a7a';
    ctx.lineWidth = 5;
    TA.world.STREETS.forEach(function (st) {
      ctx.beginPath(); ctx.moveTo(toX(st), 0); ctx.lineTo(toX(st), S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, toY(st)); ctx.lineTo(S, toY(st)); ctx.stroke();
    });
    // Laut / pelabuhan.
    ctx.fillStyle = '#0e3a4d';
    ctx.fillRect(0, toY(215), S, S - toY(215));
    // Safehouse (biru), misi (kuning), taksi (hijau).
    var blip = function (x, z, color, r) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(toX(x), toY(z), r || 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    };
    var mk = TA.world.markers;
    if (mk.safehouse) blip(mk.safehouse.x, mk.safehouse.z, '#4ade80', 5);
    if (mk.taxiStand) blip(mk.taxiStand.x, mk.taxiStand.z, '#22ff88', 4);
    var m = TA.missions.current();
    if (m && m.target && TA.state.missionActive) {
      var pulse = 5 + Math.sin(performance.now() / 300) * 2;
      blip(m.target.x, m.target.z, '#facc15', pulse);
    }
    // Polisi (merah).
    TA.police.patrols.forEach(function (c) { blip(c.x, c.z, '#ff3333', 4); });
    TA.police.footPatrols.forEach(function (f) { blip(f.x, f.z, '#ff7777', 3); });
    if (TA.police.heli) {
      blip(TA.police.heli.group.position.x, TA.police.heli.group.position.z, '#ff0000', 6);
    }
    // Musuh (oranye).
    TA.enemies.forEach(function (e) { blip(e.x, e.z, '#ff8800', 3); });
    // Pemain: panah putih searah hadap.
    var yaw = TA.state.inCar && TA.car ? TA.car.heading : -TA.pyaw;
    ctx.save();
    ctx.translate(toX(cx), toY(cz));
    ctx.rotate(Math.PI - yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Kompas.
    var comp = TA.el('compass');
    if (comp) {
      var deg = ((-TA.pyaw * 180 / Math.PI) % 360 + 360) % 360;
      var dir = deg < 22.5 || deg >= 337.5 ? 'N' : deg < 67.5 ? 'NE' : deg < 112.5 ? 'E' :
        deg < 157.5 ? 'SE' : deg < 202.5 ? 'S' : deg < 247.5 ? 'SW' : deg < 292.5 ? 'W' : 'NW';
      comp.textContent = dir + ' ' + Math.round(deg) + '°';
    }
  };

  // ---------------------------------------------------------------- dialog
  U.showDialogue = function (line, idx, total) {
    var box = TA.el('dialogue');
    if (!box) return;
    box.style.display = '';
    var who = TA.el('dialogue-who');
    var text = TA.el('dialogue-text');
    var hint = TA.el('dialogue-hint');
    if (who) who.textContent = line.who;
    if (text) text.textContent = line.text;
    if (hint) hint.textContent = U.dialogueStatic ? '' : ('[' + (idx + 1) + '/' + total + '] Klik / Enter untuk lanjut');
  };

  U.hideDialogue = function () {
    var box = TA.el('dialogue');
    if (box) box.style.display = 'none';
  };

  U.advanceDialogue = function () {
    TA.missions.advanceDialogue();
  };

  U.showChoice = function (question, options) {
    var box = TA.el('choice');
    if (!box) return;
    U._choiceOpts = options;
    var q = TA.el('choice-question');
    var list = TA.el('choice-options');
    if (q) q.textContent = question;
    if (list) {
      list.innerHTML = '';
      options.forEach(function (opt, i) {
        var b = document.createElement('button');
        b.className = 'choice-btn';
        b.setAttribute('data-choice', String(i));
        b.textContent = opt.label;
        list.appendChild(b);
      });
    }
    box.style.display = '';
  };

  U.hideChoice = function () {
    var box = TA.el('choice');
    if (box) box.style.display = 'none';
    U._choiceOpts = null;
  };

  // ---------------------------------------------------------------- wheel
  U.showWeaponWheel = function (show) {
    var wheel = TA.el('wheel');
    if (!wheel) return;
    if (!show) { wheel.style.display = 'none'; return; }
    var html = '';
    TA.player.WEAPONS.forEach(function (w, i) {
      var owned = w.owned;
      html += '<div class="wheel-slot' + (TA.state.weaponIndex === i ? ' active' : '') + (owned ? '' : ' locked') + '">' +
        '<div class="wheel-key">' + (i + 1) + '</div><div class="wheel-name">' + w.name + '</div>' +
        '<div class="wheel-sub">' + (owned ? 'DMG ' + w.damage + ' · ' + TA.player.mag[i] + '/' + TA.player.ammo[i] : TA.fmtMoney(w.price)) + '</div></div>';
    });
    wheel.innerHTML = html;
    wheel.style.display = '';
  };

  // ---------------------------------------------------------------- layar
  U.showStartScreen = function () {
    U.hideAllScreens();
    var e = TA.el('start-screen');
    if (e) e.classList.remove('hidden');
    var rank = TA.career.getRank();
    var sub = TA.el('start-subtitle');
    if (sub) sub.textContent = 'Raka berutang $5.000 ke Darma Wijaya. 7 hari. 10 misi. Satu bengkel yang harus diselamatkan.';
    var cont = TA.el('btn-continue');
    if (cont) cont.style.display = TA.hasSave('auto') || TA.hasSave('1') ? '' : 'none';
  };

  U.showPauseScreen = function () {
    U.hideAllScreens();
    var e = TA.el('pause-screen');
    if (e) e.classList.remove('hidden');
    var s = TA.state;
    var set = function (id, v) { var el = TA.el(id); if (el) el.textContent = v; };
    set('pause-money', TA.fmtMoney(s.money));
    set('pause-day', 'Hari ' + s.day + '/7 · Utang ' + TA.fmtMoney(s.debt));
    set('pause-clock', TA.fmtClock(s.timeMinutes) + ' · ' +
      (s.weather === 'rain' ? 'Hujan' : 'Cerah') + ' · ' +
      (s.timeOfDay === 'dawn' ? 'Fajar' : s.timeOfDay === 'day' ? 'Siang' : s.timeOfDay === 'dusk' ? 'Senja' : 'Malam'));
    set('pause-mission', TA.missions.current() ? 'Misi ' + TA.missions.current().id + ' — ' + TA.missions.current().title : '—');
    set('pause-wanted', s.wanted + ' bintang');
    U.refreshSaveSlots();
    U.refreshShop();
    TA.career.renderCareerPanel();
    TA.crew.renderCrewPanel();
    U.renderHUD(true);
  };

  U.refreshSaveSlots = function () {
    document.querySelectorAll('[data-load]').forEach(function (btn) {
      var slot = btn.getAttribute('data-load');
      btn.textContent = 'Muat Slot ' + slot + (TA.hasSave(slot) ? ' ✓' : ' (kosong)');
    });
    var auto = TA.el('autosave-info');
    if (auto) auto.textContent = TA.hasSave('auto') ? 'Autosave aktif — terakhir setelah misi selesai.' : 'Autosave belum ada.';
  };

  U.refreshShop = function () {
    document.querySelectorAll('[data-buy-weapon]').forEach(function (btn) {
      var i = parseInt(btn.getAttribute('data-buy-weapon'), 10);
      var w = TA.player.WEAPONS[i];
      var discount = TA.crew.getCrewBonus().discount;
      var price = Math.round(w.price * (1 - discount));
      btn.textContent = w.owned ? w.name + ' — dimiliki ✓' : 'Beli ' + w.name + ' — ' + TA.fmtMoney(price);
    });
  };

  U.showEnding = function () {
    U.hideAllScreens();
    var s = TA.state;
    var rank = TA.career.getRank();
    var e = TA.el('ending-screen');
    if (e) e.classList.remove('hidden');
    var stats = TA.el('ending-stats');
    if (stats) {
      stats.innerHTML =
        '<div>UTANG LUNAS — Bengkel Selamat</div>' +
        '<div class="ending-line">Misi selesai: ' + s.missionsDone + ' / 10</div>' +
        '<div class="ending-line">XP akhir: ' + s.xp + ' · Tingkat: ' + rank.name + '</div>' +
        '<div class="ending-line">Uang: ' + TA.fmtMoney(s.money) + ' · Mobil dicuri: ' + s.carsStolen +
        ' · Musuh dikalahkan: ' + s.kills + ' · Side job: ' + s.jobsDone + '</div>' +
        '<div class="ending-line">Kru: ' + (s.crew.sari ? 'Sari ✓ ' : '') + (s.crew.budi ? 'Budi ✓ ' : '') + (s.crew.agus ? 'Agus ✓' : '') + '</div>' +
        '<div class="ending-line">Darma: ' + (TA.missions.finalChoice === 'capture' ? 'ditangkap hidup-hidup' : 'kabur — tapi uangnya tertinggal') + '</div>' +
        '<div class="ending-line">Fajar naik di Teluk Arunika. Raka bebas.</div>';
    }
  };

  U.showGameOver = function () {
    U.hideAllScreens();
    var e = TA.el('gameover-screen');
    if (e) e.classList.remove('hidden');
  };

  U.toggleCrewPanel = function () {
    var p = TA.el('crew-panel-wrap');
    if (!p) return;
    var open = p.style.display !== 'none';
    if (open) { p.style.display = 'none'; return; }
    TA.crew.renderCrewPanel();
    p.style.display = '';
  };

  // ---------------------------------------------------------------- frame
  U.update = function (dt) {
    if (TA.state.mode === 'playing' || TA.state.mode === 'cutscene') {
      U.renderHUD(false);
      U.minimapThrottle += dt;
      if (U.minimapThrottle > 0.12) {
        U.minimapThrottle = 0;
        U.renderMinimap();
      }
      // Prompt carjacking: tampilkan bila ada mobil lambat di dekat pemain.
      if (TA.state.mode === 'playing' && !TA.state.inCar && !TA.player.jackHolding) {
        var car = TA.player.nearestCar(10);
        var prompt = TA.el('interact-prompt');
        if (prompt) {
          if (car && Math.abs(car.speed) < 1.5) {
            prompt.style.display = '';
            prompt.textContent = 'TAHAN E — CURI MOBIL';
          } else {
            prompt.style.display = 'none';
          }
        }
      }
    }
  };
})();
