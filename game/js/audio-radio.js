// Synthesised audio (Web Audio, no files): engine, sirens, guns, crashes, UI blips and three radio stations.

function playEngineSound(dt) {
  const a = W.audio, car = G.player.car;
  if (!a) return;
  const on = car && !car.wrecked && G.mode === 'playing';
  const sp = on ? Math.abs(car.speed) : 0;
  // A fake gearbox: the pitch climbs inside each gear and drops on the shift.
  const gear = Math.min(4, Math.floor(sp / 11)), rev = (sp - gear * 11) / 11;
  a.engine.frequency.setTargetAtTime(on ? 52 + gear * 14 + rev * 58 : 40, a.ctx.currentTime, 0.05);
  a.engineGain.gain.setTargetAtTime(on ? 0.05 + Math.min(0.07, sp * 0.003) : 0, a.ctx.currentTime, 0.1);
}

function playSiren(dt) {
  const a = W.audio;
  if (!a) return;
  let near = 1e9;
  const p = playerPosition();
  for (const car of W.cars) if (car.siren && !car.wrecked) near = Math.min(near, dist2d(car.x, car.z, p.x, p.z));
  const on = near < 140 && G.mode === 'playing';
  a.siren.frequency.setTargetAtTime(660 + Math.sin(G.time * 5.2) * 190, a.ctx.currentTime, 0.03);
  a.sirenGain.gain.setTargetAtTime(on ? clamp(0.09 - near * 0.0006, 0.01, 0.09) : 0, a.ctx.currentTime, 0.15);
  if (W.heli && G.mode === 'playing') a.rotorGain.gain.setTargetAtTime(clamp(0.1 - dist2d(W.heli.x, W.heli.z, p.x, p.z) * 0.001, 0, 0.1) * (0.6 + 0.4 * Math.sin(G.time * 38)), a.ctx.currentTime, 0.02);
  else a.rotorGain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.2);
}

function tuneRadioStation() {
  if (!G.radioOn) { G.radioOn = true; G.radioStation = 0; }
  else if (G.radioStation + 1 >= RADIO_STATIONS.length) G.radioOn = false;
  else G.radioStation++;
  W.radioStep = 0;
  W.newsLine = '';
  const s = RADIO_STATIONS[G.radioStation];
  showBanner(G.radioOn ? s.name : 'RADIO OFF', G.radioOn ? s.show : '', 1.6);
  playUiSound('talk');
}

function initAudio() {
  if (W.audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain(), effects = ctx.createGain(), music = ctx.createGain();
  master.connect(ctx.destination); effects.connect(master); music.connect(master);
  const voice = (type, freq, dest) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq; g.gain.value = 0; o.connect(g); g.connect(dest); o.start(); return [o, g]; };
  const engine = voice('sawtooth', 50, effects), siren = voice('square', 700, effects), rotor = voice('triangle', 46, effects);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  W.audio = { ctx: ctx, master: master, effects: effects, music: music, noise: noise, engine: engine[0], engineGain: engine[1], siren: siren[0], sirenGain: siren[1], rotorGain: rotor[1] };
  applyAudioSettings();
}

function applyAudioSettings() {
  const a = W.audio;
  if (!a) return;
  a.master.gain.value = G.settings.master;
  a.effects.gain.value = G.settings.effects;
  a.music.gain.value = G.settings.music * 0.5;
}

// One enveloped tone; the building block for blips, horn and radio notes.
function playTone(freq, seconds, type, volume, dest, slideTo) {
  const a = W.audio;
  if (!a || a.ctx.state !== 'running') return;
  const o = a.ctx.createOscillator(), g = a.ctx.createGain(), t = a.ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + seconds);
  o.connect(g); g.connect(dest || a.effects);
  o.start(t); o.stop(t + seconds + 0.02);
}

function playNoise(seconds, volume, cutoff) {
  const a = W.audio;
  if (!a || a.ctx.state !== 'running') return;
  const src = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain(), t = a.ctx.currentTime;
  src.buffer = a.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.15), t + seconds);
  g.gain.setValueAtTime(volume, t); g.gain.exponentialRampToValueAtTime(0.0008, t + seconds);
  src.connect(f); f.connect(g); g.connect(a.effects);
  src.start(t); src.stop(t + seconds + 0.02);
}

function playGunSound(weaponId, volume) {
  const v = clamp(volume, 0, 1);
  if (weaponId === 'shotgun') { playNoise(0.3, 0.5 * v, 2600); playTone(90, 0.2, 'square', 0.2 * v, null, 40); }
  else if (weaponId === 'sniper') { playNoise(0.45, 0.5 * v, 5200); playTone(140, 0.3, 'sawtooth', 0.2 * v, null, 40); }
  else if (weaponId === 'rifle') { playNoise(0.12, 0.34 * v, 4200); playTone(170, 0.08, 'square', 0.14 * v, null, 70); }
  else if (weaponId === 'smg') { playNoise(0.07, 0.26 * v, 5200); playTone(230, 0.05, 'square', 0.1 * v, null, 110); }
  else { playNoise(0.1, 0.3 * v, 3600); playTone(200, 0.07, 'square', 0.12 * v, null, 80); }
}

function playCrashSound(impact) {
  const v = clamp(impact / 25, 0.1, 1);
  playNoise(0.25 + v * 0.2, 0.4 * v, 1800);
  playTone(110, 0.15, 'triangle', 0.25 * v, null, 45);
}

function playExplosionSound() {
  playNoise(1.1, 0.7, 900);
  playTone(70, 0.8, 'sine', 0.5, null, 28);
}

function playHorn(volume) {
  const v = volume || 0.5;
  playTone(392, 0.32, 'square', 0.12 * v);
  playTone(494, 0.32, 'square', 0.12 * v);
}

function playUiSound(name) {
  const s = UI_SOUNDS[name];
  s.forEach((n, i) => setTimeout(() => playTone(n[0], n[1], n[2], 0.12), i * 90));
}

function updateAudio(dt) {
  const a = W.audio;
  if (!a) return;
  playEngineSound(dt);
  playSiren(dt);
  // Radio sequencer: a bass note per beat plus a pentatonic lead, only while driving.
  const station = RADIO_STATIONS[G.radioStation];
  if (!G.player.car || !G.radioOn || G.mode !== 'playing') return;
  W.radioClock = (W.radioClock || 0) + dt;
  const beat = 60 / station.tempo / 2;
  if (W.radioClock < beat) return;
  W.radioClock -= beat;
  const step = W.radioStep = (W.radioStep || 0) + 1;
  const note = (degree, octave) => station.root * Math.pow(2, (station.scale[degree % station.scale.length] + 12 * octave) / 12);
  if (station.news) {
    if (step % 64 === 1) W.newsLine = station.news[Math.floor(step / 64) % station.news.length];
    if (step % 8 === 0) playTone(note(0, 0), 0.12, station.wave, 0.05, a.music);
    return;
  }
  if (step % 2 === 0) playTone(note([0, 0, 3, 4][Math.floor(step / 8) % 4], -1), beat * 1.6, 'triangle', 0.16, a.music);
  const lead = RADIO_PATTERN[(step + Math.floor(step / 32) * 3) % RADIO_PATTERN.length];
  if (lead >= 0) playTone(note(lead, 1), beat * 0.9, station.wave, 0.07, a.music);
  if (step % 4 === 2) playNoise(0.04, 0.08 * G.settings.music, 7000);
}

const RADIO_PATTERN = [0, -1, 2, 3, -1, 4, 2, -1, 5, 4, -1, 2, 3, -1, 1, 0];
const UI_SOUNDS = {
  talk: [[660, 0.06, 'square']],
  hit: [[1200, 0.04, 'square']],
  reload: [[300, 0.05, 'square'], [420, 0.05, 'square']],
  pickup: [[784, 0.08, 'triangle'], [1046, 0.12, 'triangle']],
  stage: [[523, 0.1, 'triangle'], [659, 0.1, 'triangle'], [784, 0.16, 'triangle']],
  complete: [[523, 0.12, 'triangle'], [659, 0.12, 'triangle'], [784, 0.12, 'triangle'], [1046, 0.3, 'triangle']],
  fail: [[330, 0.18, 'sawtooth'], [247, 0.18, 'sawtooth'], [196, 0.4, 'sawtooth']],
  wanted: [[880, 0.1, 'square'], [660, 0.1, 'square'], [880, 0.1, 'square']],
  alarm: [[988, 0.12, 'square'], [784, 0.12, 'square'], [988, 0.12, 'square'], [784, 0.12, 'square']]
};
