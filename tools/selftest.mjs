// selftest.mjs — 128 checks for Teluk Arunika v3.5: files exist, parse, offline,
// main.ts determinism, game loads without console error, 10 missions x 3 stages,
// dispatch 6 units, Z/X/C, districts, car models, crew cards, location banner,
// XP format, and every shot check. Usage: node tools/selftest.mjs
import { spawn, execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const results = [];
function check(name, ok) { results.push({ name, ok: !!ok }); if (!ok) console.log('FAIL: ' + name); }
function read(p) { return readFileSync(join(root, p), 'utf8'); }
function contains(p, s) { try { return read(p).includes(s); } catch { return false; } }

// --- 1. Files exist (20) ---
const FILES = ['README.md', 'main.ts', 'serve.ts', 'shots.json',
  'game/index.html', 'game/style.css', 'game/core.js', 'game/world.js', 'game/player.js',
  'game/police.js', 'game/missions.js', 'game/crew.js', 'game/career.js', 'game/audio.js',
  'game/ui.js', 'game/vendor/three.min.js', 'vendor/makefun-game.ts',
  'tools/selftest.mjs', 'tools/shoot.mjs', 'LICENSE'];
FILES.forEach(f => check('exists ' + f, existsSync(join(root, f))));

// --- 2. Parse (13) ---
const PARSE = ['game/core.js', 'game/world.js', 'game/player.js', 'game/police.js',
  'game/missions.js', 'game/crew.js', 'game/career.js', 'game/audio.js', 'game/ui.js',
  'tools/selftest.mjs', 'tools/shoot.mjs', 'main.ts', 'serve.ts'];
PARSE.forEach(f => {
  let ok = false;
  if (f.endsWith('.ts')) {
    // node --check does not type-strip in this build: check a type-erased copy.
    try {
      const src = readFileSync(join(root, f), 'utf8')
        .replace(/:\s*Record<string,\s*string>/g, '')
        .replace(/:\s*string\b/g, '');
      writeFileSync('/tmp/ta-parse-check.ts', src);
      execFileSync('node', ['--check', '/tmp/ta-parse-check.ts'], { stdio: 'pipe' });
      ok = true;
    } catch { ok = false; }
  } else {
    try { execFileSync('node', ['--check', join(root, f)], { stdio: 'pipe' }); ok = true; }
    catch { ok = false; }
  }
  check('parse ' + f, ok);
});

// --- 3. Offline: no external URLs in game files (11) ---
const GAME_FILES = ['game/index.html', 'game/style.css', 'game/core.js', 'game/world.js',
  'game/player.js', 'game/police.js', 'game/missions.js', 'game/crew.js', 'game/career.js',
  'game/audio.js', 'game/ui.js'];
GAME_FILES.forEach(f => {
  const t = read(f);
  check('offline ' + f, !/https?:\/\//.test(t) && !/src\s*=\s*["']\/\//.test(t) && !/from\s+['"]https?:/.test(t));
});

// --- 4. Mission titles (10) ---
const MISSION_TITLES = ['Antar Paket Pertama', 'Taksi Pertama', 'Utang Pertama', 'Mobil Curian',
  'Paket Panas', 'Pilihan Darma', 'Wreck the Regent', 'Pelabuhan Membara', 'Jalan Terakhir',
  'Operasi Terakhir: Fajar di Pelabuhan'];
MISSION_TITLES.forEach(t => check('mission title: ' + t, contains('game/missions.js', t)));

// --- 5. Mission structure (3) ---
check('MISSIONS has 10 entries', (read('game/missions.js').match(/day: [0-9]/g) || []).length === 10);
check('30 stage NEXT entries', (read('game/missions.js').match(/next: '/g) || []).length === 30);

// --- 6. Staged mission banner (3) ---
check('banner format MISI n DARI 10', contains('game/ui.js', 'DARI 10'));
check('banner stage TAHAP', contains('game/ui.js', 'TAHAP '));
check('getObjectiveDistance exists', contains('game/missions.js', 'getObjectiveDistance'));

// --- 7. Police dispatch (7) ---
['ELANG-1', 'PATROLI-12', 'PATROLI-07', 'BLOKIR-03', 'PATROLI-21', 'PATROLI-09'].forEach(u =>
  check('dispatch unit ' + u, contains('game/police.js', u)));
check('ELANG-1 DITERJUNKAN label', contains('game/police.js', 'ELANG-1 DITERJUNKAN'));
check('getDispatchUnits exists', contains('game/police.js', 'getDispatchUnits'));

// --- 8. Crew (8) ---
['Sari', 'Budi', 'Agus'].forEach(n => check('crew member ' + n, contains('game/crew.js', n)));
check('key Z Gaspol', contains('game/core.js', "KeyZ"));
check('key X Perbaiki Cepat', contains('game/core.js', "KeyX"));
check('key C Ghost', contains('game/core.js', "KeyC"));
check('renderCrewCards exists', contains('game/crew.js', 'renderCrewCards'));
check('showCrewChatter exists', contains('game/crew.js', 'showCrewChatter'));

// --- 9. Career (7) ---
['Anak Baru', 'Sopir Andal', 'Penguasa Jalanan', 'Raja Teluk', 'Legenda Arunika'].forEach(r =>
  check('rank ' + r, contains('game/career.js', r)));
check('XP numeric format "n / n XP"', contains('game/ui.js', "' / '") && contains('game/ui.js', ' XP</span>'));
check('addXP exists', contains('game/career.js', 'addXP'));

// --- 10. Districts (7) ---
['PELABUHAN', 'PASAR', 'GANG NEON', 'PANTAI', 'TOL LAYANG'].forEach(d =>
  check('district ' + d, contains('game/world.js', d)));
check('updateDistrictStanding exists', contains('game/world.js', 'updateDistrictStanding'));
check('renderLocationBanner exists', contains('game/ui.js', 'renderLocationBanner'));

// --- 11. Car models (7) ---
['ARUNIKA SEDAN', 'PELABUHAN GT', 'TAKSI KUNING', 'PASAR VAN', 'NEON COUPE'].forEach(m =>
  check('car model ' + m, contains('game/player.js', m)));
check('getCarCondition exists', contains('game/player.js', 'getCarCondition'));
check('condition label RUSAK', contains('game/ui.js', 'RUSAK'));

// --- 12. Weapons (5) ---
['PISTOL', 'SMG', 'SHOTGUN', 'RIFLE'].forEach(w =>
  check('weapon ' + w, contains('game/player.js', w)));
check('weaponWheel exists', contains('game/ui.js', 'weapon-wheel'));

// --- 13. Save (3) ---
check('3 save slots in UI', contains('game/index.html', 'SLOT 1') && contains('game/index.html', 'SLOT 3'));
check('autosave present', contains('game/core.js', 'autosave'));
check('localStorage save', contains('game/core.js', 'localStorage'));

// --- 14. Radio (4) ---
['Dangdut Neon', 'Lo-Fi Hujan', 'Berita Kota'].forEach(s =>
  check('radio station ' + s, contains('game/audio.js', s)));
check('playRadioStation exists', contains('game/audio.js', 'playRadioStation'));

// --- 15. main.ts determinism (1) ---
let det = false;
try {
  rmSync('/tmp/ta-out1', { recursive: true, force: true });
  rmSync('/tmp/ta-out2', { recursive: true, force: true });
  execFileSync('node', ['main.ts'], { cwd: root, stdio: 'pipe', env: { ...process.env, MAKEFUN_OUTPUT_DIR: '/tmp/ta-out1' } });
  execFileSync('node', ['main.ts'], { cwd: root, stdio: 'pipe', env: { ...process.env, MAKEFUN_OUTPUT_DIR: '/tmp/ta-out2' } });
  det = readFileSync('/tmp/ta-out1/dossier.json').equals(readFileSync('/tmp/ta-out2/dossier.json'));
} catch (e) { det = false; }
check('main.ts dossier byte-identical x2', det);

// --- 16. Shots (16) ---
const shots = JSON.parse(read('shots.json'));
check('shots.json has 4 entries', shots.length === 4);
function jpegDims(buf) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
shots.forEach(s => {
  const p = join(root, 'screenshots', s.name);
  check('shot exists ' + s.name, existsSync(p));
  if (existsSync(p)) {
    const buf = readFileSync(p);
    check('shot size <=256KiB ' + s.name, buf.length <= 262144);
    check('shot is JPEG ' + s.name, buf[0] === 0xFF && buf[1] === 0xD8);
    const d = jpegDims(buf);
    check('shot 1280x720 ' + s.name, d && d.w === 1280 && d.h === 720);
  } else {
    check('shot size <=256KiB ' + s.name, false);
    check('shot is JPEG ' + s.name, false);
    check('shot 1280x720 ' + s.name, false);
  }
});

// --- 17. Game loads without console error (2) ---
async function loadCheck() {
  const server = spawn('node', ['serve.ts', '--port', '8092'], { cwd: root, stdio: 'pipe' });
  const wait = () => new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = () => fetch('http://localhost:8092/').then(() => res(true)).catch(() => Date.now() - t0 > 15000 ? rej(new Error('no server')) : setTimeout(tick, 300));
    tick();
  });
  try {
    await wait();
    const out = execFileSync('/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome', [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--enable-logging=stderr', '--v=0',
      '--virtual-time-budget=8000', '--dump-dom', 'http://localhost:8092/?shot=1',
    ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, encoding: 'utf8' });
    // execFileSync with stdio pipe returns stdout only; stderr captured via second pipe is lost — re-run capturing stderr:
    check('game loads: canvas + HUD in DOM', out.includes('game-canvas') && out.includes('mission-banner'));
    let errOut = '';
    try {
      execSync('/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome --headless=new --disable-gpu --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --virtual-time-budget=8000 --dump-dom http://localhost:8092/?shot=1 2>/tmp/ta-console.log >/dev/null', { timeout: 60000 });
      errOut = readFileSync('/tmp/ta-console.log', 'utf8');
    } catch { errOut = readFileSync('/tmp/ta-console.log', 'utf8'); }
    check('game loads: no Uncaught console error', !/Uncaught/.test(errOut));
  } finally {
    server.kill('SIGTERM');
  }
}

await loadCheck();
const passed = results.filter(r => r.ok).length;
console.log('\nSELFTEST: ' + passed + '/' + results.length + ' passed');
if (passed !== results.length) process.exitCode = 1;
