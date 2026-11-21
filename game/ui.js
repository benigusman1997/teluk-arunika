/* TELUK ARUNIKA — ui.js: HUD, minimap, menu, panel kru/dispatch, banner, dialog */
(function () {
  'use strict';
  var TA = window.TA;

  function $(id) { return document.getElementById(id); }

  TA.ui = {
    weaponFlashUntil: 0,
    missionFlashUntil: 0,
    rankUpUntil: 0,
    hudTimer: 0,

    init: function () {
      // Tombol senjata di wheel sudah di-bind core.js
    },

    el: $,

    hideAllScreens: function () {
      ['start-screen', 'pause-screen', 'end-screen', 'dialogue-box', 'choice-box', 'shop-panel', 'crew-panel', 'weapon-wheel'].forEach(function (id) {
        var e = $(id); if (e) e.classList.add('hidden');
      });
    },
    showStartScreen: function () {
      $('start-screen').classList.remove('hidden');
      $('btn-continue').classList.toggle('hidden', !TA.career.hasSave(0));
      $('hud').classList.add('hidden');
    },
    showPauseScreen: function () {
      this.refreshPauseScreen();
      $('pause-screen').classList.remove('hidden');
      $('hud').classList.add('hidden'); // HUD disembunyikan agar panel pause bersih
      this.hideDialogue();
      this.hideChoice();
    },
    hidePauseScreen: function () {
      $('pause-screen').classList.add('hidden');
      if (TA.state.mode === 'playing') $('hud').classList.remove('hidden');
    },

    refreshPauseScreen: function () {
      var s = TA.state;
      var r = TA.career.getRank();
      var next = TA.career.nextRank();
      var hh = Math.floor(s.timeMin / 60), mm = Math.floor(s.timeMin % 60);
      var clock = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      $('pause-stats').innerHTML =
        'Uang: $' + TA.fmtMoney(s.money) + ' &nbsp;·&nbsp; Utang: $' + TA.fmtMoney(s.debt) +
        ' &nbsp;·&nbsp; Hari ' + s.day + '/7 &nbsp;·&nbsp; Jam ' + clock +
        ' &nbsp;·&nbsp; Cuaca: ' + s.weather.toUpperCase() +
        '<br>Misi selesai: ' + s.stats.missionsDone + '/10 &nbsp;·&nbsp; Mobil dicuri: ' + s.stats.carsStolen +
        ' &nbsp;·&nbsp; Taksi: ' + s.stats.taxisDone + ' &nbsp;·&nbsp; Paket: ' + s.stats.packagesDone;
      var perks = TA.RANKS.filter(function (rk) { return rk.level <= r.level; }).map(function (rk) { return 'T' + rk.level + ' ' + rk.name + ' — ' + rk.perk; }).join('<br>');
      $('pause-career').innerHTML =
        '<b>KARIER — TINGKAT ' + r.level + ' · ' + r.name + '</b><br>' +
        'XP: ' + s.xp + ' / ' + (next ? next.xp : r.xp) + ' XP' +
        (next ? '<br>Perk berikutnya (T' + next.level + ' ' + next.name + '): ' + next.perk : '<br>Tingkat maksimum tercapai.') +
        '<br>Perk terbuka:<br>' + perks;
      var crewHtml = TA.CREW.map(function (m) {
        var rec = s.crew[m.id];
        return m.name + ' "' + m.nick + '" — ' + m.role + ': ' + (rec ? 'DIREKRUT ✓ (' + m.ability + ', ' + m.key + ')' : 'belum ($' + m.price + ', butuh T' + m.minRank + ')');
      }).join('<br>');
      $('pause-crew').innerHTML = '<b>KRU</b><br>' + crewHtml;
      var loads = [1, 2, 3].map(function (slot) {
        return 'Slot ' + slot + ': ' + (TA.career.hasSave(slot) ? 'tersimpan ✓ (klik SAVE untuk timpa)' : 'kosong');
      }).join(' &nbsp;·&nbsp; ');
      $('pause-loads').innerHTML = loads;
    },

    showEndScreen: function () {
      var s = TA.state;
      var r = TA.career.getRank();
      $('end-title').textContent = s.endTitle || 'UTANG LUNAS — BENGKEL SELAMAT';
      $('end-text').textContent = s.endText || '';
      $('end-stats').innerHTML =
        'Misi selesai: ' + s.stats.missionsDone + '/10<br>' +
        'XP akhir: ' + s.xp + ' &nbsp;·&nbsp; Peringkat akhir: <b>' + r.name + '</b> (Tingkat ' + r.level + ')<br>' +
        'Mobil dicuri: ' + s.stats.carsStolen + ' &nbsp;·&nbsp; Taksi: ' + s.stats.taxisDone +
        ' &nbsp;·&nbsp; Paket: ' + s.stats.packagesDone + ' &nbsp;·&nbsp; Musuh dilumpuhkan: ' + s.stats.enemiesDown +
        '<br>Kru: ' + (['sari', 'budi', 'agus'].filter(function (id) { return s.crew[id]; }).map(function (id) { return TA.crew.getMember(id).name; }).join(', ') || 'tanpa kru');
      $('end-screen').classList.remove('hidden');
      $('hud').classList.add('hidden');
      this.hideDialogue();
      this.hideChoice();
      this.hideWeaponWheel();
      $('shop-panel').classList.add('hidden');
      $('crew-panel').classList.add('hidden');
    },

    /* ---------- HUD ---------- */
    renderHUD: function () {
      var s = TA.state;
      // Bintang wanted
      var stars = $('wanted-stars');
      var html = '';
      for (var i = 1; i <= 5; i++) html += '<span class="' + (i <= s.wanted ? 'lit' : '') + '">&#9733;</span>';
      stars.innerHTML = html;
      $('money').textContent = TA.fmtMoney(s.money);
      $('day').textContent = s.day;
      $('debt').textContent = TA.fmtMoney(s.debt);
      var hh = Math.floor(s.timeMin / 60), mm = Math.floor(s.timeMin % 60);
      $('clock').textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      $('weather').textContent = s.weather === 'rain' ? 'HUJAN DERAS' : s.weather === 'clear' ? 'CERAH' : 'GERIMIS';
      // Karier berangka
      var r = TA.career.getRank();
      var prog = TA.career.rankProgress();
      $('rank-text').textContent = 'TINGKAT ' + r.level + ' · ' + r.name + ' — ' + s.xp + ' / ' + prog.need + ' XP';
      $('xp-fill').style.width = Math.round(prog.pct * 100) + '%';
      // Baris kru
      var crewHtml = 'KRU: ';
      var any = false;
      TA.CREW.forEach(function (m) {
        if (s.crew[m.id]) { crewHtml += '<span class="ok">' + m.name + ' ✓</span> '; any = true; }
        else crewHtml += m.name + ' — ';
      });
      $('crew-row').innerHTML = any ? crewHtml : 'KRU: — (rekrut di bengkel, V)';
      // HP / armor
      $('hp-fill').style.width = Math.round((s.hp / s.maxHp) * 100) + '%';
      $('armor-fill').style.width = Math.round((s.armor / s.maxArmor) * 100) + '%';
      $('hp-text').textContent = Math.round(s.hp) + '/' + s.maxHp;
      $('armor-text').textContent = Math.round(s.armor) + '/' + s.maxArmor;
      var w = TA.WEAPONS[s.weapon];
      if (TA.time.elapsed >= this.weaponFlashUntil) $('weapon-name').textContent = w.name;
      // Radio
      $('radio-name').textContent = s.radio >= 0 ? TA.RADIO_STATIONS[s.radio].name + ' — ' + TA.RADIO_STATIONS[s.radio].track : 'RADIO MATI — tekan R';
      // Lokasi + suasana distrik (dihitung live dari posisi pemain)
      var d = TA.world.districtAt(TA.player.x, TA.player.z);
      $('district-name').textContent = d.name;
      $('street-name').textContent = TA.world.streetAt(TA.player.x, TA.player.z);
      $('district-standing').textContent = TA.world.districtStandingLabel(d.standing) + ' · ' + d.standing;
      // Mobil + kondisi: di mobil tampil mobil yang dikendarai; jalan kaki di dekat
      // mobil parkir tampil mobil itu (yang akan dicuri)
      var sb = $('speed-block');
      var shownCar = (s.inCar && s.car) ? s.car : (!s.inCar ? TA.player.nearestParkedCar(6) : null);
      if (shownCar) {
        sb.classList.remove('hidden');
        var cond = TA.player.getCarCondition(shownCar);
        $('car-name').textContent = cond.name;
        $('car-condition').textContent = cond.label;
        $('speed').textContent = (s.inCar ? s.speedKmh : 0) + ' km/jam';
      } else {
        sb.classList.add('hidden');
      }
      // Taksi
      var ti = $('taxi-info');
      if (s.taxiJob) {
        var j = s.taxiJob;
        var tx = j.state === 'pickup' ? j.px : j.tx;
        var tz = j.state === 'pickup' ? j.pz : j.tz;
        ti.classList.remove('hidden');
        ti.textContent = 'TAKSI: ' + (j.state === 'pickup' ? 'jemput di ' + j.from : 'antar ke ' + j.to) +
          ' — ' + Math.round(TA.dist2d(TA.player.x, TA.player.z, tx, tz)) + ' m · $' + j.pay;
      } else if (s.packageJob) {
        ti.classList.remove('hidden');
        ti.textContent = 'PAKET: antar ke ' + s.packageJob.to + ' — ' +
          Math.round(TA.dist2d(TA.player.x, TA.player.z, s.packageJob.tx, s.packageJob.tz)) + ' m · $' + s.packageJob.pay;
      } else {
        ti.classList.add('hidden');
      }
      // Saving...
      $('save-notice').classList.toggle('hidden', TA.time.elapsed > s.saveNoticeUntil);
      // Banner naik tingkat
      $('rankup-banner').classList.toggle('hidden', TA.time.elapsed > this.rankUpUntil);
    },

    flashWeapon: function (msg) {
      $('weapon-name').textContent = msg;
      this.weaponFlashUntil = TA.time.elapsed + 2.5;
    },
    flashMission: function (msg) {
      $('mission-title').textContent = msg;
      this.missionFlashUntil = TA.time.elapsed + 3;
    },
    showRankUpBanner: function (msg) {
      var b = $('rankup-banner');
      b.textContent = msg;
      b.classList.remove('hidden');
      this.rankUpUntil = TA.time.elapsed + 4;
    },
    showRankUpCheck: function () { /* banner sudah ditampilkan oleh career.checkRankUp */ },

    updateMissionBanner: function () {
      var m = TA.missions.current();
      if (!m || !TA.state.missionActive) {
        $('mission-stage').textContent = 'TIDAK ADA MISI AKTIF';
        $('mission-title').textContent = '—';
        $('mission-objective').textContent = 'Selesaikan side job atau tunggu misi berikutnya.';
        $('mission-distance').textContent = '—';
        $('mission-next').textContent = '—';
        return;
      }
      var st = TA.missions.currentStage();
      $('mission-stage').textContent = 'MISI ' + m.id + ' DARI 10 · TAHAP ' + (TA.state.missionStage + 1) + '/' + m.stages.length;
      if (TA.time.elapsed < this.missionFlashUntil) { /* judul flash dipertahankan */ }
      else $('mission-title').textContent = st.title;
      $('mission-objective').textContent = st.objective;
      $('mission-distance').textContent = TA.missions.getObjectiveDistance() + ' m';
      $('mission-next').textContent = st.next;
    },

    renderDispatchPanel: function () {
      var units = TA.police.getDispatchUnits();
      $('dispatch-title').textContent = 'DISPATCH POLISI — ' + units.length + ' UNIT';
      var html = '';
      for (var i = 0; i < units.length; i++) {
        var u = units[i];
        html += '<div class="dispatch-unit"><span class="u-name">' + u.name + ' ' + u.type + '</span><span class="u-tactic">' + u.tactic + '</span><span class="u-dist">' + u.dist + ' m</span></div>';
      }
      if (units.length === 0) html = '<div class="dispatch-unit"><span class="u-name">Tidak ada unit aktif</span><span class="u-dist">—</span></div>';
      $('dispatch-list').innerHTML = html;
      $('heli-label').classList.toggle('hidden', !TA.police.heliActive);
    },

    renderCrewCards: function () {
      var s = TA.state;
      var html = '';
      TA.CREW.forEach(function (m) {
        var rec = s.crew[m.id];
        var status, cls;
        if (!rec) { status = 'BELUM DIREKRUT · $' + m.price; cls = 'cd'; }
        else if (TA.crew.crewAbilityReady(m.id)) { status = 'READY · [' + m.key + ']'; cls = 'ready'; }
        else if (m.id === 'agus') { status = 'SUDAH DIPAKAI'; cls = 'cd'; }
        else { status = 'COOLDOWN ' + Math.ceil(s.crewCooldown[m.id]) + ' dtk'; cls = 'cd'; }
        html += '<div class="crew-card' + (rec ? '' : ' locked') + '">' +
          '<div class="cc-name">' + m.name + ' "' + m.nick + '" — ' + m.role + '</div>' +
          '<div class="cc-ability">' + m.ability + ' [' + m.key + ']</div>' +
          '<div class="cc-status ' + cls + '">' + status + '</div></div>';
      });
      $('crew-cards').innerHTML = html;
    },

    renderCrewPanel: function () {
      var s = TA.state;
      var html = '';
      TA.CREW.forEach(function (m) {
        var rec = s.crew[m.id];
        var can = !rec && s.rank >= m.minRank && s.money >= m.price;
        html += '<div class="crew-member">' +
          '<span class="crew-silhouette">' + m.name.charAt(0) + '</span>' +
          '<div class="cm-info"><div class="cm-name">' + m.name + ' "' + m.nick + '" — ' + m.role +
          ' · ' + m.ability + ' [' + m.key + ']</div>' +
          '<div class="cm-desc">' + m.desc + '</div>' +
          '<div class="cm-desc">Status: ' + (rec ? 'DIREKRUT ✓' : 'Belum direkrut — $' + m.price + ' · butuh Tingkat ' + m.minRank) + '</div></div>' +
          (rec ? '<button disabled>DIREKRUT</button>'
            : '<button data-crew="' + m.id + '"' + (can ? '' : ' disabled') + '>REKRUT $' + m.price + '</button>') +
          '</div>';
      });
      $('crew-panel-list').innerHTML = html;
      var self = this;
      document.querySelectorAll('#crew-panel-list button[data-crew]').forEach(function (b) {
        b.addEventListener('click', function () {
          TA.crew.recruitCrewMember(b.getAttribute('data-crew'));
          self.renderCrewPanel();
          self.renderCrewCards();
        });
      });
    },

    toggleCrewPanel: function () {
      var p = $('crew-panel');
      if (p.classList.contains('hidden')) { this.renderCrewPanel(); p.classList.remove('hidden'); }
      else p.classList.add('hidden');
    },

    toggleShop: function () {
      var p = $('shop-panel');
      if (p.classList.contains('hidden')) { this.renderShop(); p.classList.remove('hidden'); }
      else p.classList.add('hidden');
    },
    renderShop: function () {
      var s = TA.state;
      var bonus = TA.crew.getCrewBonus();
      var html = '';
      TA.SHOP_ITEMS.forEach(function (it) {
        var price = Math.round(it.price * (1 - bonus.discount));
        var owned = it.kind === 'weapon' && s.weaponsOwned[it.index];
        html += '<div class="shop-item"><span>' + it.name + (owned ? ' (DIMILIKI)' : '') +
          (bonus.discount > 0 ? ' <i>diskon ' + Math.round(bonus.discount * 100) + '%</i>' : '') + '</span>' +
          '<button data-kind="' + it.kind + '" data-index="' + it.index + '" data-price="' + price + '"' +
          (owned || s.money < price ? ' disabled' : '') + '>BELI $' + price + '</button></div>';
      });
      $('shop-list').innerHTML = html;
      document.querySelectorAll('#shop-list button').forEach(function (b) {
        b.addEventListener('click', function () {
          var kind = b.getAttribute('data-kind');
          var idx = Number(b.getAttribute('data-index'));
          var ok = false;
          if (kind === 'weapon') ok = TA.player.buyWeapon(idx);
          else if (kind === 'armor') ok = TA.player.buyArmor();
          else if (kind === 'repair') ok = TA.player.repairCar();
          if (ok) { TA.ui.renderShop(); TA.ui.renderHUD(); }
        });
      });
    },

    showInteract: function (text) {
      var e = $('interact-prompt');
      e.textContent = text;
      e.classList.remove('hidden');
    },
    hideInteract: function () { $('interact-prompt').classList.add('hidden'); },

    showChatter: function (name, text) {
      var t = $('chatter-toast');
      $('chatter-name').textContent = name;
      $('chatter-text').textContent = text;
      t.classList.remove('hidden');
      TA.state.chatterUntil = TA.time.elapsed + 4.2;
    },
    hideChatter: function () { $('chatter-toast').classList.add('hidden'); },

    showDialogue: function (who, text) {
      $('dialogue-speaker').textContent = who;
      $('dialogue-text').textContent = text;
      $('dialogue-box').classList.remove('hidden');
    },
    hideDialogue: function () { $('dialogue-box').classList.add('hidden'); },

    showChoice: function (title, text, buttons) {
      $('choice-title').textContent = title;
      $('choice-text').textContent = text;
      var box = $('choice-buttons');
      box.innerHTML = '';
      buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.textContent = b.label;
        btn.addEventListener('click', b.fn);
        box.appendChild(btn);
      });
      $('choice-box').classList.remove('hidden');
    },
    hideChoice: function () { $('choice-box').classList.add('hidden'); },

    showWeaponWheel: function () {
      var w = $('weapon-wheel');
      w.classList.remove('hidden');
      this.weaponWheelUntil = TA.time.elapsed + 1.5;
      document.querySelectorAll('#weapon-wheel .wheel-slot').forEach(function (el) {
        el.classList.toggle('active', Number(el.getAttribute('data-weapon')) === TA.state.weapon);
      });
    },
    hideWeaponWheel: function () { $('weapon-wheel').classList.add('hidden'); },

    renderMinimap: function () {
      var cv = $('minimap');
      var ctx = cv.getContext('2d');
      if (!ctx) return;
      var W = 180, H = 180;
      var zoom = TA.state.minimapZoom;
      var range = 200 / zoom; // dunia yang terlihat
      var scale = W / (range * 2);
      var px = TA.player.x, pz = TA.player.z;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0c1420';
      ctx.fillRect(0, 0, W, H);
      function toX(x) { return W / 2 + (x - px) * scale; }
      function toY(z) { return H / 2 + (z - pz) * scale; }
      // Distrik: warna latar samar
      var dColors = { 'PELABUHAN': '#1a2a3a', 'PANTAI': '#2a2a1a', 'TOL LAYANG': '#241a2a', 'GANG NEON': '#2a1a2a', 'PASAR': '#1a2a22' };
      ctx.fillStyle = dColors[TA.state.district] || '#101820';
      ctx.fillRect(0, 0, W, H);
      // Jalan grid
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      [-160, -120, -80, -40, 0, 40, 80, 120, 160].forEach(function (r) {
        ctx.beginPath(); ctx.moveTo(toX(r), 0); ctx.lineTo(toX(r), H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, toY(r)); ctx.lineTo(W, toY(r)); ctx.stroke();
      });
      // Air
      ctx.fillStyle = '#0d2a44';
      ctx.fillRect(toX(195), 0, W, H);
      ctx.fillRect(0, 0, Math.max(0, toX(-195)), H);
      function blip(x, z, color, r) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(toX(x), toY(z), r || 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }
      // Safehouse biru
      blip(TA.world.safehouse.x, TA.world.safehouse.z, '#4aa8ff', 5);
      // Misi kuning
      var st = TA.missions.currentStage();
      if (st && TA.state.missionActive) blip(st.tx, st.tz, '#ffd23e', 5);
      // Taksi hijau
      if (TA.state.taxiJob) {
        var j = TA.state.taxiJob;
        blip(j.state === 'pickup' ? j.px : j.tx, j.state === 'pickup' ? j.pz : j.tz, '#37d67a', 4);
      }
      // Polisi merah
      TA.police.units.forEach(function (u) { blip(u.x, u.z, '#ff4a4a', 3); });
      if (TA.police.heliActive && TA.police.helicopter) blip(TA.police.helicopter.x, TA.police.helicopter.z, '#ff4a4a', 6);
      // Pemain: segitiga putih
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2 - 7);
      ctx.lineTo(W / 2 - 5, H / 2 + 5);
      ctx.lineTo(W / 2 + 5, H / 2 + 5);
      ctx.closePath(); ctx.fill();
      // Utara
      ctx.fillStyle = '#cfe3ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('N', 6, 14);
    },

    update: function (dt) {
      this.hudTimer -= dt;
      if (TA.state.mode === 'playing' || TA.state.mode === 'paused' || TA.state.mode === 'cutscene') {
        if (this.hudTimer <= 0) {
          this.hudTimer = 0.12;
          this.renderHUD();
          this.updateMissionBanner();
          this.renderDispatchPanel();
          this.renderCrewCards();
          this.renderMinimap();
        }
      }
      // Toast obrolan kru: sembunyikan setelah waktunya
      if (TA.state.chatterUntil && TA.time.elapsed > TA.state.chatterUntil && TA.crew.chatterQueue.length === 0) {
        this.hideChatter();
        TA.state.chatterUntil = 0;
      }
      // Weapon wheel menutup otomatis setelah waktunya (kecuali staging scene 3)
      if (TA.state.mode === 'playing' && TA.state.staged !== 3) {
        var w = $('weapon-wheel');
        if (!w.classList.contains('hidden') && TA.time.elapsed > (this.weaponWheelUntil || 0)) w.classList.add('hidden');
      }
    }
  };
})();
