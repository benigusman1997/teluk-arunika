// Radio stations and sound: four stations with synth recipes, plus
// engine, siren, gunshot, explosion, horn and alarm sounds in WebAudio.

// Radio stations: name, genre, host, three tracks, synth recipe.
const RADIO_STATIONS = [
  { name: 'ARUNIKA 98.4', genre: 'Dangdut Neon', host: 'Mbak Rini', tracks: ['Goyang Dermaga', 'Neon di Matamu', 'Kopi Tengah Malam'], tempo: 128, scale: 'minor pentatonic', wave: 'sawtooth' },
  { name: 'OMBAK 101.2', genre: 'Island Lo-fi', host: 'Bayu', tracks: ['Pasir Hangat', 'Senja Pelan', 'Perahu Tidur'], tempo: 78, scale: 'major seventh', wave: 'triangle' },
  { name: 'KOTA 87.5', genre: 'City News', host: 'Dewi', tracks: ['Headlines', 'Traffic Report', 'Weather Bay'], tempo: 100, scale: 'spoken', wave: 'sine' },
  { name: 'SUARA DERMAGA 93.1', genre: 'Dock Rock', host: 'Bang Jali', tracks: ['Besi dan Garam', 'Kontainer 47 Blues', 'Jangkar Karat'], tempo: 104, scale: 'blues', wave: 'square' },
];

// The shared audio context, created on the first key press.
let rad_audio = null;
let rad_musicTimer = 0;

// Get or create the audio context, resuming it if suspended.
function rad_getAudio() {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return null;
  }
  if (!rad_audio) {
    try {
      rad_audio = new window.AudioContext();
    } catch (e) {
      return null;
    }
  }
  if (rad_audio.state === 'suspended') {
    rad_audio.resume();
  }
  return rad_audio;
}

// Tune to the next or previous radio station.
function tuneRadioStation(dir) {
  GAME.radio.station = (GAME.radio.station + dir + RADIO_STATIONS.length) % RADIO_STATIONS.length;
  GAME.radio.track = 0;
  const station = RADIO_STATIONS[GAME.radio.station];
  GAME.ui.banner = '♪ ' + station.name + ' — ' + station.tracks[0];
}

// Play the current station: a soft synth line on the beat.
function updateRadioPlayback(dt) {
  if (!GAME || !GAME.radio.on || GAME.mode !== 'playing') {
    return;
  }
  rad_musicTimer -= dt;
  if (rad_musicTimer > 0) {
    return;
  }
  const station = RADIO_STATIONS[GAME.radio.station];
  const beat = 60 / station.tempo;
  rad_musicTimer = beat;
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  const scale = [0, 3, 5, 7, 10];
  const note = scale[Math.floor(taNextRandom() * scale.length)];
  const freq = 220 * Math.pow(2, note / 12);
  const osc = audio.createOscillator();
  osc.type = station.wave;
  osc.frequency.value = freq;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.05 * GAME.settings.music, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + beat * 0.9);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + beat);
}

// A low engine hum that follows the car's speed.
function playEngineSound() {
  const audio = rad_getAudio();
  if (!audio || GAME.player.vehicle < 0) {
    return;
  }
  const v = GAME.vehicles[GAME.player.vehicle];
  const osc = audio.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 60 + Math.abs(v.speed) * 4;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.03 * GAME.settings.effects, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.2);
}

// A two-tone police siren wail.
function playSirenSound() {
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  for (let i = 0; i < 2; i++) {
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(i === 0 ? 700 : 950, audio.currentTime + i * 0.3);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.06 * GAME.settings.effects, audio.currentTime + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.3 + 0.28);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(audio.currentTime + i * 0.3);
    osc.stop(audio.currentTime + i * 0.3 + 0.3);
  }
}

// A short gunshot crack.
function playGunshotSound() {
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  const buffer = audio.createBuffer(1, 2205, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  gain.gain.value = 0.25 * GAME.settings.effects;
  src.connect(gain);
  gain.connect(audio.destination);
  src.start();
}

// A deep explosion boom.
function playExplosionSound() {
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audio.currentTime + 0.7);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.4 * GAME.settings.effects, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.8);
}

// A car horn beep.
function playHornSound() {
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  const osc = audio.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 370;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.08 * GAME.settings.effects, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.25);
}

// A car alarm wail.
function playAlarmSound() {
  const audio = rad_getAudio();
  if (!audio) {
    return;
  }
  for (let i = 0; i < 3; i++) {
    const osc = audio.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.05 * GAME.settings.effects, audio.currentTime + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + i * 0.3 + 0.15);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(audio.currentTime + i * 0.3);
    osc.stop(audio.currentTime + i * 0.3 + 0.15);
  }
}
