// Teluk Arunika v3.6 — audio.js
// Fully synthetic offline WebAudio: engine hum, gunshots, sirens, rain,
// and 3 radio stations (R cycles). No audio files, no network.
(function () {
  'use strict';
  var TA = window.TA;

  var RADIO_STATIONS = [
    { name: 'ARUNIKA 98.4', genre: 'Dangdut Neon', freq: 98.4, bpm: 128, wave: 'sawtooth', base: 220 },
    { name: 'HUJAN 101.2', genre: 'Lo-fi Hujan', freq: 101.2, bpm: 72, wave: 'sine', base: 174 },
    { name: 'KOTA 87.5', genre: 'Berita Kota', freq: 87.5, bpm: 100, wave: 'triangle', base: 196 },
  ];

  var ctx = null;
  var master = null;
  var engineOsc = null;
  var engineGain = null;
  var rainNode = null;
  var radioTimer = 0;
  var radioStep = 0;
  var sirenOsc = null;
  var sirenGain = null;
  var radioOn = false;

  function initAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // engine: low sawtooth hum whose pitch follows speed
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      var engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // rain: filtered white noise loop
      var len = ctx.sampleRate * 2;
      var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      var rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1800;
      rainFilter.Q.value = 0.6;
      rainNode = ctx.createGain();
      rainNode.gain.value = TA.state.weather === 'rain' || TA.state.weather === 'storm' ? 0.06 : 0.0;
      noise.connect(rainFilter);
      rainFilter.connect(rainNode);
      rainNode.connect(master);
      noise.start();
      // siren: two-tone oscillator, gain 0 until police chase
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch (e) {
      ctx = null;
    }
  }

  function resumeAudio() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function engineSound(dt) {
    if (!ctx || !engineOsc) return;
    var target = 0;
    if (TA.state.inCar) target = 0.05 + Math.min(0.12, TA.state.carSpeed / 1600);
    engineGain.gain.value += (target - engineGain.gain.value) * Math.min(1, dt * 4);
    engineOsc.frequency.value = 50 + TA.state.carSpeed * 1.1;
  }

  function gunshotSound(vol) {
    if (!ctx) return;
    resumeAudio();
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + 0.15);
  }

  function sirenSound(dt) {
    if (!ctx || !sirenOsc) return;
    var active = TA.state.wanted >= 2;
    var target = active ? 0.05 : 0;
    sirenGain.gain.value += (target - sirenGain.gain.value) * Math.min(1, dt * 2);
    if (active) sirenOsc.frequency.value = 700 + Math.sin(TA.state.elapsed * 2.4) * 180;
  }

  function rainSound(level) {
    if (!ctx || !rainNode) return;
    rainNode.gain.value = level;
  }

  function playRadioStation(index) {
    TA.state.radio = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    radioOn = true;
    radioStep = 0;
    radioTimer = 0;
    TA.ui.renderRadioLine();
    TA.ui.showToast('Radio: ' + RADIO_STATIONS[TA.state.radio].name + ' — ' + RADIO_STATIONS[TA.state.radio].genre);
  }

  function cycleRadio() {
    playRadioStation(TA.state.radio + 1);
  }

  function currentStation() { return RADIO_STATIONS[TA.state.radio]; }

  function renderRadioLine() { TA.ui.renderRadioLine(); }

  function update(dt) {
    if (!ctx) return;
    engineSound(dt);
    if (rainNode) {
      var target = (TA.state.weather === 'storm' ? 0.1 : TA.state.weather === 'rain' ? 0.06 : 0.0);
      rainNode.gain.value += (target - rainNode.gain.value) * Math.min(1, dt);
    }
    // radio: simple bassline blips on the beat
    if (radioOn && TA.state.screen === 'playing') {
      radioTimer += dt;
      var st = RADIO_STATIONS[TA.state.radio];
      var beat = 60 / st.bpm / 2;
      if (radioTimer >= beat) {
        radioTimer = 0;
        radioStep++;
        var scale = [1, 1.125, 1.25, 1.5, 1.6875];
        var note = st.base * scale[radioStep % scale.length];
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        osc.type = st.wave;
        osc.frequency.value = note;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.045, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + beat);
      }
    }
  }

  TA.audio = {
    RADIO_STATIONS: RADIO_STATIONS,
    initAudio: initAudio,
    resumeAudio: resumeAudio,
    playRadioStation: playRadioStation,
    cycleRadio: cycleRadio,
    currentStation: currentStation,
    renderRadioLine: renderRadioLine,
    engineSound: engineSound,
    gunshotSound: gunshotSound,
    sirenSound: sirenSound,
    rainSound: rainSound,
    update: update,
  };
})();
