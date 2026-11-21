/* audio.js — Teluk Arunika v3.8. WebAudio sintetis offline: mesin, tembakan,
   sirene, hujan, tabrakan, checkpoint. Radio 3 stasiun (tombol R). */
(function () {
  'use strict';
  var TA = window.TA;

  var RADIO_STATIONS = [
    { name: 'ARUNIKA 98.4', genre: 'Dangdut Neon' },
    { name: 'HUJAN 101.2', genre: 'Lo-fi Hujan' },
    { name: 'KOTA 87.5', genre: 'Berita Kota' },
  ];

  var ctx = null, master = null, engineOsc = null, rainNode = null;

  function initAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function ensure() {
    if (!ctx) initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return !!ctx;
  }
  function beep(freq, dur, type, vol) {
    if (!ensure()) return;
    try {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch (e) { /* audio opsional */ }
  }
  function noiseBurst(dur, vol, lowpass) {
    if (!ensure()) return;
    try {
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
      var g = ctx.createGain(); g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch (e) { /* audio opsional */ }
  }

  function engineSound(on, speed) {
    if (!ensure()) return;
    try {
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        var g = ctx.createGain(); g.gain.value = 0.04;
        engineOsc.connect(g); g.connect(master);
        engineOsc.start();
        engineOsc._gain = g;
      }
      if (engineOsc) {
        engineOsc.frequency.value = 50 + (speed || 0) * 0.9;
        if (!on) { engineOsc.stop(); engineOsc = null; }
      }
    } catch (e) { engineOsc = null; }
  }
  function gunshotSound() { noiseBurst(0.12, 0.5, 3000); beep(180, 0.08, 'square', 0.25); }
  function sirenSound() { beep(660, 0.4, 'sine', 0.18); setTimeout(function () { beep(520, 0.4, 'sine', 0.18); }, 450); }
  function rainSound() { noiseBurst(1.5, 0.05, 900); }
  function crashSound() { noiseBurst(0.3, 0.4, 700); }
  function checkpointSound() { beep(880, 0.15, 'sine', 0.25); setTimeout(function () { beep(1320, 0.2, 'sine', 0.25); }, 160); }

  function playRadioStation(i) {
    var s = TA.state;
    s.radio = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    if (TA.ui) TA.ui.renderAll(true);
  }
  function nextStation() { playRadioStation(TA.state.radio + 1); }
  function radioLine() {
    var st = RADIO_STATIONS[TA.state.radio];
    return st.name + ' — ' + st.genre;
  }

  TA.audio = {
    RADIO_STATIONS: RADIO_STATIONS,
    initAudio: initAudio, playRadioStation: playRadioStation, nextStation: nextStation,
    radioLine: radioLine, engineSound: engineSound, gunshotSound: gunshotSound,
    sirenSound: sirenSound, rainSound: rainSound, crashSound: crashSound,
    checkpointSound: checkpointSound,
  };
})();
