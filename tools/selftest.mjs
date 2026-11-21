// Self-test Teluk Arunika v3.5 — 128 assertion, mencakup SETIAP fitur di DESIGN.md.
// Jalankan dari root repo:  node tools/selftest.mjs
// Bagian statis: file ada, tanpa referensi eksternal, urutan script, id HUD, API tiap modul.
// Bagian runtime: game dimuat di headless Chromium (playwright-core + chrome-headless-shell),
// dicek tanpa console error dan data game (10 misi, 3 kru, 5 tingkat, 5 distrik, 6 mobil).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const here = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const PW_DIR = join(dirname(here), 'pw');
const { chromium } = require(join(PW_DIR, 'node_modules', 'playwright-core'));

const GAME_FILES = ['index.html', 'style.css', 'core.js', 'world.js', 'player.js', 'police.js', 'missions.js', 'crew.js', 'career.js', 'audio.js', 'ui.js'];
const SCRIPT_ORDER = ['vendor/three.min.js', 'core.js', 'world.js', 'player.js', 'police.js', 'missions.js', 'crew.js', 'career.js', 'audio.js', 'ui.js'];
const HUD_IDS = ['crew-row', 'rank-row', 'xp-fill', 'crew-panel', 'mission-stage', 'mission-distance', 'mission-next', 'dispatch-panel', 'location-banner', 'district-standing', 'car-name', 'car-condition'];
const API = {
  'core.js': ['bootGame', 'startNewGame', 'pauseGame', 'resumeGame', 'gameOver', 'winGame', 'applyStaging'],
  'world.js': ['buildCity', 'buildTraffic', 'buildPedestrians', 'setWeather', 'setTimeOfDay', 'DISTRICTS', 'updateDistrictStanding', 'districtAt'],
  'player.js': ['CAR_MODELS', 'WEAPONS', 'enterCar', 'exitCar', 'jackCar', 'shoot', 'switchWeapon', 'takeDamage', 'buyWeapon', 'getCarCondition'],
  'police.js': ['setWanted', 'escalatePolice', 'spawnRoadblock', 'deploySpikeStrip', 'policeHelicopter', 'updateHelicopter', 'cooldownWanted', 'getDispatchUnits'],
  'missions.js': ['MISSIONS', 'startMission', 'completeMission', 'showDialogue', 'checkObjective', 'startMissionStage', 'advanceStage', 'getObjectiveDistance'],
  'crew.js': ['CREW', 'recruitCrewMember', 'activateCrewAbility', 'getCrewBonus', 'renderCrewPanel', 'renderCrewCards', 'crewAbilityReady', 'showCrewChatter'],
  'career.js': ['RANKS', 'addXP', 'getRank', 'checkRankUp', 'applyRankPerks'],
  'audio.js': ['initAudio', 'playRadioStation', 'engineSound', 'gunshotSound', 'sirenSound', 'RADIO_STATIONS'],
  'ui.js': ['renderHUD', 'renderMinimap', 'showStartScreen', 'showPauseScreen', 'showRankUpBanner', 'renderDispatchPanel', 'renderCrewCards'],
};

let passed = 0, failed = 0, total = 0;
const failures = [];
function check(name, cond) {
  total++;
  if (cond) { passed++; }
  else { failed++; failures.push(name); console.log('  FAIL: ' + name); }
}
const read = (p) => readFileSync(join(here, p), 'utf8');

/* ---------- A. file ada (18) ---------- */
for (const f of GAME_FILES) check('file game/' + f + ' ada', existsSync(join(here, 'game', f)));
check('file game/vendor/three.min.js ada', existsSync(join(here, 'game/vendor/three.min.js')));
check('file main.ts ada', existsSync(join(here, 'main.ts')));
check('file serve.ts ada', existsSync(join(here, 'serve.ts')));
check('file shots.json ada', existsSync(join(here, 'shots.json')));
check('file README.md ada', existsSync(join(here, 'README.md')));
check('file LICENSE ada', existsSync(join(here, 'LICENSE')));
check('file .makefun/owner.json ada', existsSync(join(here, '.makefun/owner.json')));

/* ---------- B. tanpa referensi eksternal (11) ---------- */
for (const f of GAME_FILES) {
  const t = read('game/' + f);
  check('game/' + f + ' tanpa http/https eksternal', !/https?:\/\//.test(t) && !/src="\/\//.test(t));
}

/* ---------- C+D. index.html: urutan script + tanpa src eksternal (2) ---------- */
{
  const html = read('game/index.html');
  let last = -1, ok = true;
  for (const s of SCRIPT_ORDER) { const i = html.indexOf('src="' + s + '"'); if (i < 0 || i < last) ok = false; last = i; }
  check('index.html memuat 10 script berurutan (three, core..ui)', ok);
  check('index.html tanpa script/link eksternal', !/src="https?:/.test(html) && !/href="https?:/.test(html));
}

/* ---------- E. id HUD (12) ---------- */
{
  const html = read('game/index.html');
  for (const id of HUD_IDS) check('index.html punya #' + id, html.includes('id="' + id + '"'));
}

/* ---------- F. API tiap modul (63) ---------- */
for (const [file, names] of Object.entries(API)) {
  const t = read('game/' + file);
  for (const n of names) check(file + ' punya ' + n, t.includes(n));
}

/* ---------- G. main.ts (2) ---------- */
{
  const t = read('main.ts');
  check('main.ts memakai buildDossier dari vendor/makefun-game.ts', t.includes('buildDossier') && t.includes('./vendor/makefun-game.ts'));
  check('main.ts memakai caps scorer (163840, 262144, 993, 50331648)', t.includes('163840') && t.includes('262144') && t.includes('993') && t.includes('50331648'));
}

/* ---------- H. shots.json (2) ---------- */
{
  const shots = JSON.parse(read('shots.json'));
  check('shots.json punya 4 entri', Array.isArray(shots) && shots.length === 4);
  check('shots.json memakai ?scene=1..4', shots.every((s, i) => s.query === '?scene=' + (i + 1)) && shots.every((s) => s.name.endsWith('.jpg')));
}

/* ---------- I. README 3 badge live (3) ---------- */
{
  const t = read('README.md');
  check('README badge kompetisi make.fun', t.includes('https://make.fun/badge/gta6-01.svg'));
  check('README badge rank repo', t.includes('https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg'));
  check('README badge reward repo', t.includes('https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg'));
}

console.log(`statis: ${passed}/${total} lolos`);

/* ---------- J+K. runtime di headless Chromium (11) ---------- */
const PORT = 8901;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitServer(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/index.html`); if (r.ok) return true; } catch { /* belum siap */ }
    await sleep(300);
  }
  return false;
}

let browser = null;
try {
  if (!(await waitServer())) throw new Error('serve.ts tidak menjawab di port ' + PORT);
  const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
  browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  async function loadScene(n, waitMs) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html?scene=${n}`, { waitUntil: 'load' });
    await page.waitForTimeout(waitMs);
    return { page, errors };
  }

  // Scene 1-4: tanpa console error
  const scenes = [];
  for (let n = 1; n <= 4; n++) {
    const s = await loadScene(n, n === 2 ? 5200 : 3200);
    scenes.push(s);
    check('scene ' + n + ' tanpa console error', s.errors.length === 0);
    if (s.errors.length) console.log('   error scene ' + n + ':', s.errors.slice(0, 3));
  }

  // Data game di scene 1
  const s1 = scenes[0].page;
  check('TA.MISSIONS berisi 10 misi', await s1.evaluate(() => window.TA.MISSIONS.length === 10));
  check('TA.CREW berisi 3 anggota kru', await s1.evaluate(() => window.TA.CREW.length === 3));
  check('TA.RANKS berisi 5 tingkat karier', await s1.evaluate(() => window.TA.RANKS.length === 5));
  check('TA.DISTRICTS berisi 5 distrik', await s1.evaluate(() => window.TA.DISTRICTS.length === 5));
  check('TA.CAR_MODELS berisi 6 model mobil', await s1.evaluate(() => window.TA.CAR_MODELS.length === 6));
  // Scene 2: dispatch punya unit aktif
  const s2 = scenes[1].page;
  check('scene 2: dispatch punya >= 4 unit aktif', await s2.evaluate(() => window.TA.police.getDispatchUnits().length >= 4));
  // Scene 4: layar pause terlihat
  const s4 = scenes[3].page;
  check('scene 4: layar pause terlihat', await s4.evaluate(() => !document.getElementById('pause-screen').classList.contains('hidden')));

  for (const s of scenes) await s.page.close();
} catch (e) {
  console.log('RUNTIME ERROR:', e.message);
  check('runtime selesai tanpa exception', false);
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log(`\nSELF-TEST: ${passed}/${total} PASS (${failed} gagal)`);
if (failures.length) { console.log('Gagal:'); failures.forEach((f) => console.log(' - ' + f)); }
if (total !== 128) console.log('PERINGATAN: total assertion ' + total + ', diharapkan 128');
process.exit(failed === 0 && total === 128 ? 0 : 1);
