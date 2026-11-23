// WebAudio synthesis: engine, guns, sirens, crashes, UI blips, city ambience, and the three radio stations.
TA.audio = { ctx: null, master: null, engine: null, siren: null, radioGain: null, step: 0, nextNote: 0, on: false };

// Browsers only allow audio after a user gesture, so the context is created on the first click or key.
TA.audioUnlock = function () {
  var a = TA.audio;
  if (a.ctx) { if (a.ctx.state === 'suspended') a.ctx.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { a.ctx = new AC(); } catch (e) { return; }
  a.master = a.ctx.createGain(); a.master.gain.value = TA.state.settings.volume; a.master.connect(a.ctx.destination);
  // engine: a saw oscillator through a low-pass, pitch follows speed
  a.engine = TA.makeVoice('sawtooth', 60, 0); a.engineFilter = a.ctx.createBiquadFilter(); a.engineFilter.type = 'lowpass'; a.engineFilter.frequency.value = 500;
  a.engine.gain.disconnect(); a.engine.gain.connect(a.engineFilter); a.engineFilter.connect(a.master);
  a.siren = TA.makeVoice('square', 700, 0);
  a.radioGain = a.ctx.createGain(); a.radioGain.gain.value = 0; a.radioGain.connect(a.master);
  a.noise = TA.makeNoiseBuffer();
  // ambience: very quiet filtered noise, like distant surf and traffic
  var amb = a.ctx.createBufferSource(); amb.buffer = a.noise; amb.loop = true;
  var af = a.ctx.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 380;
  var ag = a.ctx.createGain(); ag.gain.value = 0.05; amb.connect(af); af.connect(ag); ag.connect(a.master); amb.start();
};

TA.makeVoice = function (type, freq, gain) {
  var a = TA.audio, osc = a.ctx.createOscillator(), g = a.ctx.createGain();
  osc.type = type; osc.frequency.value = freq; g.gain.value = gain;
  osc.connect(g); g.connect(a.master); osc.start();
  return { osc: osc, gain: g };
};

TA.makeNoiseBuffer = function () {
  var ctx = TA.audio.ctx, buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = buf.getChannelData(0), rng = TA.makeRng(7);
  for (var i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
  return buf;
};

// One-shot tone with an exponential decay.
TA.blip = function (type, f0, f1, dur, vol, dest) {
  var a = TA.audio, t = a.ctx.currentTime, osc = a.ctx.createOscillator(), g = a.ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g); g.connect(dest || a.master); osc.start(t); osc.stop(t + dur + 0.02);
};

// One-shot burst of filtered noise (gunshots, crashes, explosions, snare hits).
TA.burst = function (freq, dur, vol, dest) {
  var a = TA.audio, t = a.ctx.currentTime, src = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
  src.buffer = a.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest || a.master); src.start(t, Math.random() * 0.5, dur + 0.05);
};

TA.sfx = function (name, vol) {
  var a = TA.audio;
  if (!a.ctx) return;
  vol = (vol === undefined ? 1 : vol) * 0.5;
  switch (name) {
    case 'shot': TA.burst(2600, 0.16, vol); TA.blip('square', 220, 60, 0.08, vol * 0.5); break;
    case 'boom': TA.burst(900, 0.5, vol * 1.3); TA.blip('sine', 110, 30, 0.4, vol); break;
    case 'explosion': TA.burst(500, 1.2, vol * 1.8); TA.blip('sine', 80, 24, 0.9, vol * 1.4); break;
    case 'crash': TA.burst(1400, 0.3, vol); break;
    case 'punch': TA.burst(500, 0.1, vol); break;
    case 'horn': TA.blip('square', 392, 380, 0.35, vol * 0.5); TA.blip('square', 494, 480, 0.35, vol * 0.4); break;
    case 'alarm': TA.blip('square', 880, 660, 0.25, vol * 0.5); break;
    case 'coin': TA.blip('triangle', 880, 1760, 0.18, vol); break;
    case 'click': TA.blip('square', 1200, 900, 0.04, vol * 0.5); break;
    case 'reload': TA.blip('square', 300, 500, 0.08, vol * 0.5); break;
    case 'stage': TA.blip('triangle', 523, 784, 0.25, vol); break;
    case 'ability': TA.blip('sawtooth', 220, 880, 0.3, vol * 0.6); break;
    case 'win': TA.blip('triangle', 523, 523, 0.15, vol); TA.blip('triangle', 784, 1046, 0.5, vol); break;
  }
};

// Positional variant: quieter with distance from the player, silent beyond 90 m.
TA.sfxAt = function (name, x, z) {
  var p = TA.player;
  if (!p || !TA.audio.ctx) return;
  var d = TA.dist(x, z, p.x, p.z);
  if (d < 90) TA.sfx(name, 0.8 * (1 - d / 90));
};

// ---- radio: three generative stations ----------------------------------------
TA.SCALES = { arunika: [0, 2, 3, 7, 8, 12, 14, 15], ombak: [0, 3, 5, 7, 10, 12, 15, 17], kota: [0, 7, 12, 7] };

TA.radioOn = function (on) {
  TA.audio.on = on;
  var st = TA.RADIO[TA.state.radio];
  TA.run.radioLine = on ? st.name + ' — ' + st.show : '';
  if (TA.audio.radioGain) TA.audio.radioGain.gain.value = on ? 0.5 : 0;
};

TA.nextStation = function () {
  TA.state.radio = (TA.state.radio + 1) % TA.RADIO.length;
  TA.audio.step = 0;
  TA.radioOn(true);
  if (TA.sfx) TA.sfx('click', 0.6);
};

// Sixteenth-note sequencer; each station has its own drum pattern, bass and lead rule.
TA.radioTick = function () {
  var a = TA.audio, st = TA.RADIO[TA.state.radio], scale = TA.SCALES[st.id], step = a.step++, beat = step % 16, out = a.radioGain;
  var note = function (semi, base) { return base * Math.pow(2, semi / 12); };
  if (st.id === 'arunika') {
    if (beat % 4 === 0) TA.blip('sine', 150, 50, 0.16, 0.5, out);
    if (beat === 3 || beat === 6 || beat === 11 || beat === 14) TA.blip('sine', 320, 200, 0.07, 0.35, out);      // kendang
    if (beat % 2 === 1) TA.burst(6000, 0.03, 0.12, out);
    if (beat % 4 === 2) TA.blip('square', note(scale[(step >> 2) % 4], 110), note(scale[(step >> 2) % 4], 110), 0.14, 0.18, out);
    if (beat % 2 === 0) TA.blip('triangle', note(scale[(step * 5 + (step >> 3)) % 8], 440), note(scale[(step * 5) % 8], 440), 0.16, 0.2, out);
  } else if (st.id === 'ombak') {
    if (beat === 0 || beat === 10) TA.blip('sine', 110, 45, 0.3, 0.45, out);
    if (beat === 4 || beat === 12) TA.burst(1800, 0.12, 0.14, out);
    if (beat % 8 === 0) [0, 3, 7].forEach(function (s) { TA.blip('triangle', note(scale[(step >> 3) % 4] + s, 220), note(scale[(step >> 3) % 4] + s, 220), 0.9, 0.09, out); });
    if (beat % 4 === 3) TA.blip('sine', note(scale[(step * 3) % 8], 440), note(scale[(step * 3) % 8], 436), 0.3, 0.12, out);
  } else {
    // news: a soft time signal and murmuring "speech" blips; the headline goes to the HUD radio line
    if (beat === 0) TA.blip('sine', 1000, 1000, 0.08, 0.12, out);
    if (beat % 2 === 0) TA.blip('sawtooth', 130 + ((step * 37) % 60), 110 + ((step * 53) % 50), 0.1, 0.07, out);
    if (step % 96 === 0) TA.run.radioLine = st.name + ' — ' + TA.NEWS_LINES[(step / 96) % TA.NEWS_LINES.length];
  }
};

TA.updateAudio = function (dt) {
  var a = TA.audio, p = TA.player;
  if (TA.keyHit('KeyQ') && p && p.car) TA.nextStation();
  if (!a.ctx) return;
  a.master.gain.value = TA.run.mode === 'playing' ? TA.state.settings.volume : TA.state.settings.volume * 0.3;
  var car = p && p.car, sp = car ? Math.abs(car.speed) : 0;
  a.engine.gain.gain.value = car ? 0.07 + Math.min(0.08, sp * 0.002) : 0;
  if (car) { a.engine.osc.frequency.value = 55 + sp * 3.2 + (car.boost > 0 ? 40 : 0); a.engineFilter.frequency.value = 400 + sp * 30; }
  // siren: two-tone wail whenever a unit with its lights on is close
  var nearest = 1e9;
  TA.units.forEach(function (u) { if (u.car && u.car.siren && !u.car.dead) nearest = Math.min(nearest, u.dist); });
  a.siren.gain.gain.value = nearest < 140 ? 0.05 * (1 - nearest / 140) : 0;
  a.siren.osc.frequency.value = 650 + Math.sin(TA.run.time * 5) * 180;
  if (a.on && car) {
    a.nextNote -= dt;
    if (a.nextNote <= 0) { a.nextNote += 15 / TA.RADIO[TA.state.radio].bpm; TA.radioTick(); }
  }
};
