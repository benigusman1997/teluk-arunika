/* TELUK ARUNIKA — audio.js: WebAudio sintetis offline (mesin, tembakan, sirene, hujan, radio) */
(function () {
  'use strict';
  var TA = window.TA;

  TA.RADIO_STATIONS = [
    { name: 'DANGDUT NEON', track: 'Goyang Dermaga — Niken Laras' },
    { name: 'LO-FI HUJAN', track: 'Rintik di Tol Layang — Arunika Beats' },
    { name: 'BERITA KOTA', track: 'Radio Arunika FM — Berita Pukul 9' }
  ];

  TA.audio = {
    ctx: null, enabled: false, master: null,
    engineOsc: null, engineGain: null, rainNode: null, sirenOsc: null, sirenGain: null,
    radioTimer: null, radioStep: 0, honkCooldown: 0,

    initAudio: function () {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        this.enabled = true;
        if (this.ctx.state === 'suspended') this.ctx.suspend();
      } catch (e) { this.enabled = false; }
    },
    unlock: function () {
      if (!this.ctx) this.initAudio();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.startRain();
    },
    ok: function () { return this.enabled && this.ctx && this.ctx.state === 'running'; },

    noiseBuffer: function (seconds) {
      var len = Math.floor(this.ctx.sampleRate * seconds);
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    },

    engineSound: function (level) {
      if (!this.ok()) return;
      try {
        if (!this.engineOsc) {
          this.engineOsc = this.ctx.createOscillator();
          this.engineOsc.type = 'sawtooth';
          this.engineGain = this.ctx.createGain();
          this.engineGain.gain.value = 0;
          var filt = this.ctx.createBiquadFilter();
          filt.type = 'lowpass'; filt.frequency.value = 420;
          this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.master);
          this.engineOsc.start();
        }
        this.engineOsc.frequency.value = 55 + level * 130;
        this.engineGain.gain.value = level > 0.02 ? 0.05 + level * 0.06 : 0;
      } catch (e) { /* abaikan */ }
    },

    gunshotSound: function (kind) {
      if (!this.ok()) return;
      try {
        var src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(0.14);
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(kind === 'shotgun' ? 0.5 : 0.3, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
        var f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = kind === 'rifle' ? 3200 : 1800;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
      } catch (e) { /* abaikan */ }
    },
    enemyShotSound: function () { this.gunshotSound('pistol'); },

    sirenSound: function (on) {
      if (!this.ok()) return;
      try {
        if (on && !this.sirenOsc) {
          this.sirenOsc = this.ctx.createOscillator();
          this.sirenOsc.type = 'sine';
          this.sirenGain = this.ctx.createGain();
          this.sirenGain.gain.value = 0.035;
          this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
          this.sirenOsc.start();
        }
        if (this.sirenOsc) this.sirenOsc.frequency.value = on ? (TA.time.elapsed % 1 < 0.5 ? 720 : 980) : 0;
        if (!on && this.sirenOsc) { this.sirenGain.gain.value = 0; }
      } catch (e) { /* abaikan */ }
    },

    rainSound: function (on) { if (on) this.startRain(); else this.stopRain(); },
    startRain: function () {
      if (!this.ok() || this.rainNode) return;
      try {
        var src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(2); src.loop = true;
        var f = this.ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
        var g = this.ctx.createGain(); g.gain.value = 0.05;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
        this.rainNode = src;
      } catch (e) { /* abaikan */ }
    },
    stopRain: function () {
      try { if (this.rainNode) { this.rainNode.stop(); this.rainNode = null; } } catch (e) { /* abaikan */ }
    },

    honk: function () {
      if (!this.ok() || this.honkCooldown > TA.time.elapsed) return;
      this.honkCooldown = TA.time.elapsed + 1.5;
      try {
        var o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 340;
        var g = this.ctx.createGain(); g.gain.value = 0.06;
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 0.18);
      } catch (e) { /* abaikan */ }
    },
    alarmSound: function () { this.honk(); },
    crash: function () {
      if (!this.ok()) return;
      try {
        var src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(0.25);
        var g = this.ctx.createGain(); g.gain.value = 0.25;
        var f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
      } catch (e) { /* abaikan */ }
    },
    explosionSound: function () { this.crash(); },
    hurtSound: function () {
      if (!this.ok()) return;
      try {
        var o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 140;
        var g = this.ctx.createGain(); g.gain.value = 0.1;
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 0.15);
      } catch (e) { /* abaikan */ }
    },
    buySound: function () {
      if (!this.ok()) return;
      try {
        var o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
        var g = this.ctx.createGain(); g.gain.value = 0.08;
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 0.12);
      } catch (e) { /* abaikan */ }
    },
    repairSound: function () { this.buySound(); },
    rankUpSound: function () {
      if (!this.ok()) return;
      try {
        var notes = [523, 659, 784, 1047];
        var self = this;
        notes.forEach(function (f, i) {
          var o = self.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
          var g = self.ctx.createGain(); g.gain.value = 0.09;
          o.connect(g); g.connect(self.master);
          o.start(self.ctx.currentTime + i * 0.12);
          o.stop(self.ctx.currentTime + i * 0.12 + 0.25);
        });
      } catch (e) { /* abaikan */ }
    },
    boostSound: function () {
      if (!this.ok()) return;
      try {
        var o = this.ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(120, this.ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(480, this.ctx.currentTime + 0.4);
        var g = this.ctx.createGain(); g.gain.value = 0.08;
        o.connect(g); g.connect(this.master);
        o.start(); o.stop(this.ctx.currentTime + 0.45);
      } catch (e) { /* abaikan */ }
    },
    ghostSound: function () { this.boostSound(); },

    playRadioStation: function (i) {
      TA.state.radio = i;
      var st = TA.RADIO_STATIONS[i];
      TA.state.radioStation = st ? st.name + ' — ' + st.track : '';
      if (!this.ok()) return;
      if (this.radioTimer) { clearInterval(this.radioTimer); this.radioTimer = null; }
      if (i < 0) return;
      var self = this;
      var scales = [[262, 294, 330, 392, 440], [220, 262, 294, 330, 392], [330, 392, 440, 523, 587]];
      var scale = scales[i % scales.length];
      this.radioStep = 0;
      this.radioTimer = setInterval(function () {
        if (!self.ok() || TA.state.radio !== i) { clearInterval(self.radioTimer); self.radioTimer = null; return; }
        try {
          var f = scale[self.radioStep % scale.length] * (self.radioStep % 8 === 4 ? 2 : 1);
          var o = self.ctx.createOscillator();
          o.type = i === 0 ? 'square' : 'sine';
          o.frequency.value = f;
          var g = self.ctx.createGain(); g.gain.value = 0.03;
          g.gain.exponentialRampToValueAtTime(0.001, self.ctx.currentTime + 0.35);
          o.connect(g); g.connect(self.master);
          o.start(); o.stop(self.ctx.currentTime + 0.4);
          self.radioStep++;
        } catch (e) { /* abaikan */ }
      }, 380);
    },
    cycleRadio: function () {
      var next = (TA.state.radio + 1) % (TA.RADIO_STATIONS.length + 1);
      if (next === TA.RADIO_STATIONS.length) this.playRadioStation(-1);
      else this.playRadioStation(next);
    },

    update: function (dt) {
      this.sirenSound(TA.state.wanted >= 2);
      if (TA.state.weather === 'rain') this.startRain();
      else this.stopRain();
    }
  };
})();
