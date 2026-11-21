// audio.js — fully synthetic offline WebAudio: engine hum, gunshots, sirens, rain loop, 3 radio stations.
(function () {
  'use strict';
  var TA = window.TA;

  var ctx = null, master = null, engineOsc = null, engineGain = null, rainSrc = null, radioTimer = null;
  var STATIONS = [
    { name: 'Dangdut Neon', song: 'Goyang Pelabuhan — Nella Arunika' },
    { name: 'Lo-Fi Hujan', song: 'Rintik di Dermaga — Hujan Senja' },
    { name: 'Berita Kota', song: 'Warta Teluk — Edisi Pagi' },
  ];
  var radioMelody = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196];

  function initAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      startRain();
      startEngine();
    } catch (err) { ctx = null; }
  }

  function startRain() {
    if (!ctx) return;
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.12;
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buf; rainSrc.loop = true;
    var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1200;
    var g = ctx.createGain(); g.gain.value = 0.35;
    rainSrc.connect(filt); filt.connect(g); g.connect(master);
    rainSrc.start();
  }
  function rainSound() { initAudio(); }

  function startEngine() {
    if (!ctx) return;
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
    engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
    var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 400;
    engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
  }

  function engineSound(rpm) {
    if (!ctx || !engineOsc) return;
    engineOsc.frequency.value = 50 + (rpm || 0) * 60;
    engineGain.gain.value = TA.state.inCar ? 0.08 : 0.0;
  }
  function updateEngine(dt) {
    if (!ctx) return;
    engineSound(Math.abs(TA.state.speedKmh || 0) / 120);
  }

  function gunshotSound(vol) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var noise = ctx.createBufferSource();
    var len = ctx.sampleRate * 0.15;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noise.buffer = buf;
    var g = ctx.createGain(); g.gain.value = 0.5 * (vol == null ? 1 : vol);
    noise.connect(g); g.connect(master);
    noise.start(t);
  }

  function sirenSound() {
    if (!ctx) return;
    var osc = ctx.createOscillator(); osc.type = 'sine';
    var g = ctx.createGain(); g.gain.value = 0.12;
    osc.connect(g); g.connect(master);
    var t = ctx.currentTime;
    for (var i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(700, t + i * 0.7);
      osc.frequency.linearRampToValueAtTime(1100, t + i * 0.7 + 0.35);
    }
    osc.start(t); osc.stop(t + 2.8);
  }

  function playRadioStation(index) {
    var s = TA.state;
    s.radioStation = index % STATIONS.length;
    s.radioOn = true;
    initAudio();
    if (!ctx) { TA.ui.renderHUD(); return; }
    if (radioTimer) clearInterval(radioTimer);
    var step = 0;
    var base = [220, 174.6, 196][s.radioStation] || 220;
    radioTimer = setInterval(function () {
      if (!ctx || !TA.state.radioOn) return;
      var osc = ctx.createOscillator(); osc.type = 'triangle';
      osc.frequency.value = base * (radioMelody[step % radioMelody.length] / 220);
      var g = ctx.createGain(); g.gain.value = 0.05;
      osc.connect(g); g.connect(master);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
      step++;
    }, 450);
    TA.ui.toast('RADIO: ' + STATIONS[s.radioStation].name + ' — ' + STATIONS[s.radioStation].song);
    TA.ui.renderHUD();
  }

  TA.audio = {
    STATIONS: STATIONS,
    initAudio: initAudio, playRadioStation: playRadioStation,
    engineSound: engineSound, gunshotSound: gunshotSound,
    sirenSound: sirenSound, rainSound: rainSound, updateEngine: updateEngine,
  };
})();
