/* audio.js — WebAudio sintetis offline: mesin, tembakan, sirene, hujan, radio 3 stasiun */
(function () {
  'use strict';
  var TA = window.TA;
  TA.audio = TA.audio || {};

  var RADIO_STATIONS = [
    { name: 'ARUNIKA 98.4', genre: 'Dangdut Neon' },
    { name: 'HUJAN 101.2', genre: 'Lo-fi Hujan' },
    { name: 'KOTA 87.5', genre: 'Berita Kota' }
  ];
  TA.audio.RADIO_STATIONS = RADIO_STATIONS;

  var ctx = null;
  var master = null;
  var engineOsc = null;
  var engineGain = null;
  var radioOsc = null;
  var radioGain = null;
  var radioTimer = 0;
  var started = false;

  function reset() {
    ctx = null; master = null; engineOsc = null; engineGain = null;
    radioOsc = null; radioGain = null; started = false;
  }

  function initAudio() {
    if (started) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      started = true;
      startEngine();
      startRadio();
      startRain();
    } catch (err) { /* audio tidak tersedia — game tetap jalan tanpa suara */ }
  }
  TA.audio.initAudio = initAudio;

  function startEngine() {
    if (!ctx) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function engineSound() {
    if (!ctx || !engineOsc) return;
    var rpm = 50 + Math.abs(TA.S.speed) * 1.2;
    engineOsc.frequency.setTargetAtTime(rpm, ctx.currentTime, 0.1);
    engineGain.gain.setTargetAtTime(TA.S.inCar ? 0.05 : 0.0, ctx.currentTime, 0.1);
  }

  function gunshotSound(weapon) {
    if (!ctx) return;
    try {
      var dur = weapon === 'Shotgun' ? 0.25 : 0.12;
      var noise = ctx.createBufferSource();
      var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buf;
      var g = ctx.createGain();
      g.gain.value = 0.35;
      noise.connect(g); g.connect(master);
      noise.start();
    } catch (err) { /* abaikan */ }
  }
  TA.audio.gunshotSound = gunshotSound;

  function sirenSound() {
    if (!ctx) return;
    try {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(700, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.5);
      o.frequency.linearRampToValueAtTime(700, ctx.currentTime + 1.0);
      var g = ctx.createGain();
      g.gain.value = 0.08;
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + 1.05);
    } catch (err) { /* abaikan */ }
  }
  TA.audio.sirenSound = sirenSound;

  function startRain() {
    if (!ctx) return;
    try {
      var len = ctx.sampleRate * 2;
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
      var src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      var g = ctx.createGain();
      g.gain.value = TA.S.rain > 0 ? 0.06 : 0.0;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1200;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch (err) { /* abaikan */ }
  }
  TA.audio.rainSound = startRain;

  function playRadioStation(i) {
    TA.S.radio = ((i % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    TA.ui.renderRadioLine();
  }
  TA.audio.playRadioStation = playRadioStation;

  function nextStation() {
    playRadioStation(TA.S.radio + 1);
    var st = RADIO_STATIONS[TA.S.radio];
    TA.ui.showToast('RADIO: ' + st.name + ' — ' + st.genre);
  }
  TA.audio.nextStation = nextStation;

  function startRadio() {
    if (!ctx) return;
    radioOsc = ctx.createOscillator();
    radioOsc.type = 'triangle';
    radioGain = ctx.createGain();
    radioGain.gain.value = 0.0;
    radioOsc.connect(radioGain);
    radioGain.connect(master);
    radioOsc.start();
  }

  function radioMelody() {
    if (!ctx || !radioOsc) return;
    var scales = [
      [262, 294, 330, 392, 440],
      [220, 262, 294, 330, 392],
      [330, 370, 415, 494, 554]
    ];
    var scale = scales[TA.S.radio % scales.length];
    var note = scale[Math.floor(Math.random() * scale.length)];
    radioOsc.frequency.setTargetAtTime(note, ctx.currentTime, 0.05);
    radioGain.gain.setTargetAtTime(0.04, ctx.currentTime, 0.1);
  }

  function update(dt) {
    if (!started) return;
    engineSound();
    radioTimer += dt;
    if (radioTimer > 0.5) {
      radioTimer = 0;
      radioMelody();
    }
  }

  TA.audio.reset = reset;
  TA.audio.update = update;
  TA.audio.engineSound = engineSound;
  TA.audio.rainSound = startRain;
})();
