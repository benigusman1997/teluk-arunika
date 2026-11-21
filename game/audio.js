// TELUK ARUNIKA v3 — audio.js
// Semua suara sintetis WebAudio, offline total: mesin, tembakan, sirene, hujan,
// alarm, ledakan, radio 3 stasiun (dangdut-neon / lo-fi hujan / berita kota).
(function () {
  'use strict';

  var A = TA.audio = {};

  A.ctx = null;
  A.master = null;
  A.engineOsc = null;
  A.engineGain = null;
  A.rainSrc = null;
  A.rainGain = null;
  A.sirenTimer = null;
  A.sirenOn = false;
  A.radioTimer = null;
  A.radioStep = 0;
  A.radioGain = null;

  A.STATIONS = [
    { name: 'DANGDUT NEON FM', track: 'Goyang Pelabuhan — Sari & The Monsoon', wave: 'sawtooth', tempo: 132, root: 220,
      notes: [0, 0, 3, 5, 7, 5, 3, 0, 0, 7, 10, 7, 5, 3, 2, 0] },
    { name: 'LO-FI HUJAN', track: 'Rintik di Atap Seng — Hujan Malam', wave: 'sine', tempo: 76, root: 174,
      notes: [0, 3, 7, 10, 7, 3, 0, -5, 0, 3, 5, 7, 5, 3, 0, -2] },
    { name: 'BERITA KOTA', track: 'Warta Teluk Arunika — Laporan Cuaca & Lalu Lintas', wave: 'triangle', tempo: 100, root: 196,
      notes: [0, 0, 0, 7, 0, 0, 5, 0, 0, 0, 7, 10, 7, 5, 3, 0] }
  ];

  // Dipanggil sekali di boot (tanpa suara) — AudioContext dibuat saat gestur.
  A.prime = function () {
    // Sengaja kosong: context dibuat di initAudio() setelah gestur pengguna.
  };

  A.initAudio = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(function () {});
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.55;
      A.master.connect(A.ctx.destination);
      A.startEngine();
      A.startRain();
      A.startRadio();
      return true;
    } catch (err) {
      return false;
    }
  };

  A.noiseBuffer = function (seconds) {
    var len = Math.floor(A.ctx.sampleRate * seconds);
    var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };

  // ---- mesin: osilator yang nadanya mengikuti kecepatan ----
  A.startEngine = function () {
    if (!A.ctx || A.engineOsc) return;
    A.engineOsc = A.ctx.createOscillator();
    A.engineOsc.type = 'sawtooth';
    A.engineOsc.frequency.value = 55;
    var filter = A.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    A.engineGain = A.ctx.createGain();
    A.engineGain.gain.value = 0.0;
    A.engineOsc.connect(filter);
    filter.connect(A.engineGain);
    A.engineGain.connect(A.master);
    A.engineOsc.start();
  };

  A.engineSound = function () {
    if (!A.ctx || !A.engineOsc) return;
    var s = TA.state;
    var target = s.inCar ? 0.05 + Math.min(0.12, Math.abs(s.speedKmh) / 1200) : 0;
    A.engineGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.1);
    A.engineOsc.frequency.setTargetAtTime(50 + Math.abs(s.speedKmh) * 1.6, A.ctx.currentTime, 0.1);
  };

  // ---- hujan: noise putih tersaring, loop ----
  A.startRain = function () {
    if (!A.ctx || A.rainSrc) return;
    var src = A.ctx.createBufferSource();
    src.buffer = A.noiseBuffer(2);
    src.loop = true;
    var filter = A.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.4;
    A.rainGain = A.ctx.createGain();
    A.rainGain.gain.value = 0;
    src.connect(filter);
    filter.connect(A.rainGain);
    A.rainGain.connect(A.master);
    src.start();
    A.rainSrc = src;
  };

  A.rainSound = function () {
    if (!A.ctx || !A.rainGain) return;
    var w = TA.state.weather;
    var target = w === 'storm' ? 0.16 : (w === 'rain' ? 0.09 : 0);
    A.rainGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.5);
  };

  // ---- sirene dua nada ----
  A.sirenSound = function () {
    if (!A.ctx || A.sirenOn) return;
    A.sirenOn = true;
    var osc = A.ctx.createOscillator();
    osc.type = 'sine';
    var gain = A.ctx.createGain();
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(A.master);
    osc.start();
    var high = true;
    A.sirenTimer = setInterval(function () {
      if (!A.ctx) return;
      osc.frequency.setTargetAtTime(high ? 880 : 660, A.ctx.currentTime, 0.05);
      high = !high;
    }, 450);
    A._sirenOsc = osc;
    A._sirenGain = gain;
  };

  A.stopSiren = function () {
    if (A.sirenTimer) { clearInterval(A.sirenTimer); A.sirenTimer = null; }
    if (A._sirenOsc) {
      try { A._sirenOsc.stop(); } catch (err) {}
      A._sirenOsc = null;
      A._sirenGain = null;
    }
    A.sirenOn = false;
  };

  // ---- efek sekali jalan ----
  A.blip = function (freq, dur, type, vol, slideTo) {
    if (!A.ctx) return;
    try {
      var osc = A.ctx.createOscillator();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, A.ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, A.ctx.currentTime + dur);
      var gain = A.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.12, A.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(A.master);
      osc.start();
      osc.stop(A.ctx.currentTime + dur);
    } catch (err) {}
  };

  A.noiseBurst = function (dur, vol, filterFreq) {
    if (!A.ctx) return;
    try {
      var src = A.ctx.createBufferSource();
      src.buffer = A.noiseBuffer(dur);
      var filter = A.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq || 1200;
      var gain = A.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.25, A.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(A.master);
      src.start();
    } catch (err) {}
  };

  A.gunshotSound = function (weaponName) {
    if (!A.ctx) return;
    if (weaponName === 'Shotgun') A.noiseBurst(0.28, 0.4, 900);
    else if (weaponName === 'Rifle') A.noiseBurst(0.16, 0.32, 1600);
    else if (weaponName === 'SMG') A.noiseBurst(0.09, 0.22, 2000);
    else A.noiseBurst(0.13, 0.28, 1400);
    A.blip(160, 0.08, 'square', 0.1, 60);
  };

  A.enemyShotSound = function () {
    A.noiseBurst(0.12, 0.1, 1000);
  };

  A.hitSound = function () { A.blip(520, 0.07, 'sine', 0.12, 700); };
  A.hurtSound = function () { A.blip(140, 0.18, 'sawtooth', 0.16, 70); };
  A.clickSound = function () { A.blip(900, 0.05, 'square', 0.07); };
  A.crashSound = function () { A.noiseBurst(0.3, 0.35, 500); };
  A.explosionSound = function () {
    A.noiseBurst(0.9, 0.5, 300);
    A.blip(90, 0.7, 'sine', 0.3, 30);
  };
  A.alarmSound = function () {
    A.blip(1200, 0.12, 'square', 0.1, 1200);
    setTimeout(function () { A.blip(1200, 0.12, 'square', 0.1, 1200); }, 160);
  };
  A.honkSound = function () {
    A.blip(370, 0.18, 'square', 0.08);
    setTimeout(function () { A.blip(370, 0.14, 'square', 0.08); }, 200);
  };
  A.missionSound = function () {
    A.blip(523, 0.12, 'sine', 0.14);
    setTimeout(function () { A.blip(659, 0.12, 'sine', 0.14); }, 130);
    setTimeout(function () { A.blip(784, 0.22, 'sine', 0.16); }, 260);
  };
  A.rankUpSound = function () {
    [523, 659, 784, 1046].forEach(function (f, i) {
      setTimeout(function () { A.blip(f, 0.18, 'triangle', 0.16); }, i * 120);
    });
  };
  A.recruitSound = function () { A.missionSound(); };
  A.boostSound = function () {
    A.blip(220, 0.5, 'sawtooth', 0.12, 880);
    A.noiseBurst(0.4, 0.12, 3000);
  };
  A.ghostSound = function () {
    A.blip(880, 0.4, 'sine', 0.1, 220);
  };

  // ---- radio: 3 stasiun, sequencer nada sederhana ----
  A.playRadioStation = function (i) {
    TA.state.radio = i;
    TA.state.radioOn = true;
    A.radioStep = 0;
    var st = A.STATIONS[i];
    TA.ui.setRadioText(st.name + ' — ' + st.track);
  };

  A.cycleRadio = function () {
    if (!TA.state.radioOn) { TA.state.radioOn = true; A.playRadioStation(TA.state.radio); return; }
    var next = (TA.state.radio + 1) % A.STATIONS.length;
    A.playRadioStation(next);
    TA.ui.toast('Radio: ' + A.STATIONS[next].name);
  };

  A.startRadio = function () {
    if (!A.ctx || A.radioTimer) return;
    A.radioGain = A.ctx.createGain();
    A.radioGain.gain.value = 0.06;
    A.radioGain.connect(A.master);
    A.playRadioStation(0);
    A.radioTimer = setInterval(function () {
      if (!A.ctx || !TA.state.radioOn) return;
      var st = A.STATIONS[TA.state.radio];
      var stepDur = 60 / st.tempo / 2; // 8th notes
      var note = st.notes[A.radioStep % st.notes.length];
      A.radioStep++;
      if (note === 0 && A.radioStep % 4 !== 1) {
        // Jeda singkat antar frasa.
      }
      var freq = st.root * Math.pow(2, note / 12);
      try {
        var osc = A.ctx.createOscillator();
        osc.type = st.wave;
        osc.frequency.value = freq;
        var g = A.ctx.createGain();
        g.gain.setValueAtTime(0.5, A.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + stepDur * 1.8);
        osc.connect(g);
        g.connect(A.radioGain);
        osc.start();
        osc.stop(A.ctx.currentTime + stepDur * 2);
      } catch (err) {}
    }, 240);
  };

  A.update = function (dt) {
    if (!A.ctx) return;
    A.engineSound();
    A.rainSound();
  };
})();
