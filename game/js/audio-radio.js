// audio-radio.js — WebAudio synthesis: engine, guns, sirens, crashes, ambience and three radio stations.
var TA = window.TA || (window.TA = {});
function playEngineSound(speed, on) {
  var A = TA.audio; if (!A) return;
  if (!A.engine) { A.engine = A.ctx.createOscillator(); A.engine.type = 'sawtooth'; A.engineGain = A.ctx.createGain(); A.engineGain.gain.value = 0; A.engine.connect(A.engineGain); A.engineGain.connect(A.master); A.engine.start(); }
  A.engine.frequency.value = 45 + Math.abs(speed) * 3.2; A.engineGain.gain.value = on ? 0.06 : 0;
}
function playSiren(on) {
  var A = TA.audio; if (!A) return;
  if (!A.siren) { A.siren = A.ctx.createOscillator(); A.siren.type = 'square'; A.sirenGain = A.ctx.createGain(); A.sirenGain.gain.value = 0; A.siren.connect(A.sirenGain); A.sirenGain.connect(A.master); A.siren.start(); }
  A.sirenGain.gain.value = on ? 0.035 : 0; A.sirenOn = on;
}
function tuneRadioStation(i) {
  var S = TA.S, st = TA.CFG.STATIONS; S.station = (i + st.length) % st.length; TA.radioStep = 0; TA.radioT = 0;
  TA.notify('RADIO: ' + st[S.station].name);
}
function updateRadioAndSiren(dt) {
  var A = TA.audio, S = TA.S; if (!A) return;
  A.master.gain.value = S.settings.volume;
  if (A.sirenOn) A.siren.frequency.value = 650 + Math.sin(S.time * 6) * 180;
  var st = TA.CFG.STATIONS[S.station]; if (!TA.player.car || !st.notes.length) return;
  TA.radioT = (TA.radioT || 0) - dt;
  if (TA.radioT <= 0) { TA.radioT = st.tempo; var n = st.notes[(TA.radioStep = (TA.radioStep || 0) + 1) % st.notes.length]; beep(220 * Math.pow(2, n / 12), st.tempo * 0.9, st.wave, 0.05); if (TA.radioStep % 4 === 0) beep(55 * Math.pow(2, n / 12), st.tempo * 1.8, 'triangle', 0.09); }
}
function beep(freq, dur, wave, vol, slideTo) {
  var A = TA.audio; if (!A) return;
  var o = A.ctx.createOscillator(), g = A.ctx.createGain(), t = A.ctx.currentTime;
  o.type = wave; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur);
}
function noiseBurst(dur, vol, cutoff) {
  var A = TA.audio; if (!A) return;
  var n = A.ctx.createBufferSource(), buf = A.ctx.createBuffer(1, A.ctx.sampleRate * dur, A.ctx.sampleRate), d = buf.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  var f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; var g = A.ctx.createGain(); g.gain.value = vol;
  n.buffer = buf; n.connect(f); f.connect(g); g.connect(A.master); n.start();
}
function unlockAudio() {
  if (TA.audio || !(window.AudioContext || window.webkitAudioContext)) return;
  var ctx = new (window.AudioContext || window.webkitAudioContext)(), master = ctx.createGain(); master.connect(ctx.destination);
  TA.audio = { ctx: ctx, master: master };
}
TA.playEngineSound = playEngineSound; TA.playSiren = playSiren; TA.tuneRadioStation = tuneRadioStation; TA.updateRadioAndSiren = updateRadioAndSiren; TA.unlockAudio = unlockAudio;
TA.playGun = function (w) { noiseBurst(w === 3 ? 0.3 : 0.12, 0.25, w === 3 ? 900 : 2400); };
TA.playBoom = function () { noiseBurst(0.9, 0.6, 400); beep(90, 0.7, 'sine', 0.4, 30); };
TA.playCrash = function () { noiseBurst(0.25, 0.3, 1200); };
TA.playSkid = function () { if ((TA.skidT || 0) < TA.S.time) { TA.skidT = TA.S.time + 0.2; noiseBurst(0.2, 0.05, 3000); } };
TA.playHorn = function () { beep(392, 0.35, 'square', 0.08); beep(494, 0.35, 'square', 0.06); };
TA.playAlarm = function () { for (var i = 0; i < 4; i++) setTimeout(function () { beep(880, 0.15, 'square', 0.07); }, i * 220); };
TA.playCash = function () { beep(1320, 0.08, 'triangle', 0.1); setTimeout(function () { beep(1760, 0.14, 'triangle', 0.1); }, 90); };
