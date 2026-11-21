/* selftest.mjs — cek statis + runtime headless Chromium untuk Teluk Arunika v3.8.
   Jalankan: node tools/selftest.mjs  (dari root repo). Keluar 0 bila 100% lolos. */
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GAME = join(ROOT, 'game');
const CHROME = process.env.CHROME || '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
}

/* ---------- 1. file yang dipertahankan tidak berubah ---------- */
const PRESERVED = {
  'LICENSE': '63640a4e1ac9cb9526898150349d41f8',
  '.makefun/owner.json': '7e814a1576a08a567a3407d2878ed576',
  'vendor/makefun-game.ts': '2da03e097f2d64ae65e3d1c3586e652a',
  'game/vendor/three.min.js': 'bc138621ece88793eb711a9e967b273a',
};
for (const [rel, md5] of Object.entries(PRESERVED)) {
  const p = join(ROOT, rel);
  const ok = existsSync(p) && createHash('md5').update(readFileSync(p)).digest('hex') === md5;
  check('preserved: ' + rel, ok, ok ? 'checksum sama' : 'BERUBAH / HILANG');
}

/* ---------- 2. file yang ditulis ulang ada ---------- */
const REQUIRED = [
  'game/index.html', 'game/style.css', 'game/core.js', 'game/world.js',
  'game/player.js', 'game/police.js', 'game/missions.js', 'game/races.js',
  'game/crew.js', 'game/career.js', 'game/audio.js', 'game/ui.js',
  'main.ts', 'serve.ts', 'shots.json', 'README.md',
  'tools/selftest.mjs', 'tools/shoot.mjs',
];
for (const f of REQUIRED) check('exists: ' + f, existsSync(join(ROOT, f)));

/* ---------- 3. game/ offline: tanpa http(s) di source top-level ---------- */
for (const f of readdirSync(GAME)) {
  if (!['.html', '.js', '.css'].includes(extname(f))) continue;
  const text = readFileSync(join(GAME, f), 'utf8');
  const bad = /https?:\/\//i.test(text);
  check('offline: game/' + f, !bad, bad ? 'mengandung URL http(s)' : 'tanpa referensi eksternal');
}

/* ---------- 4. README: 3 badge live make.fun, tanpa shields.io ---------- */
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const badges = (readme.match(/make\.fun\/badge\/gta6-01/g) || []).length;
check('readme: 3 badge live make.fun', badges >= 3, badges + ' badge ditemukan');
check('readme: tanpa shields.io', !/shields\.io/.test(readme));
check('readme: judul entry v3.8', readme.includes('SWAT tactical response, wreck-target contracts'));

/* ---------- 5. shots.json + screenshot ---------- */
function jpegDims(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xc0 || m === 0xc2) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}
let shots = null;
try {
  shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8')).shots;
} catch (e) { shots = null; }
check('shots.json: 4 shot', Array.isArray(shots) && shots.length === 4, shots ? shots.length + ' shot' : 'tidak bisa dibaca');
if (shots) {
  for (const s of shots) {
    const p = join(ROOT, s.file);
    const ok = existsSync(p);
    if (!ok) { check('shot file: ' + s.file, false, 'hilang'); continue; }
    const buf = readFileSync(p);
    const magic = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const dims = jpegDims(buf);
    check('shot: ' + s.file, magic && buf.length <= 262144 && dims && dims.w === 1280 && dims.h === 720,
      buf.length + ' bytes, ' + (dims ? dims.w + 'x' + dims.h : 'dimensi?'));
  }
}

/* ---------- 6. main.ts dua run, dossier byte-identik ---------- */
function runMain(outDir) {
  rmSync(outDir, { recursive: true, force: true });
  const r = spawnSync('node', ['main.ts'], {
    cwd: ROOT, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outDir },
    encoding: 'utf8', timeout: 60000,
  });
  return r;
}
const out1 = join(ROOT, '.selftest-out1');
const out2 = join(ROOT, '.selftest-out2');
const r1 = runMain(out1);
const r2 = runMain(out2);
check('main.ts run 1 exit 0', r1.status === 0, (r1.stderr || '').trim().slice(0, 200));
check('main.ts run 2 exit 0', r2.status === 0, (r2.stderr || '').trim().slice(0, 200));
let dossierSame = false;
if (r1.status === 0 && r2.status === 0) {
  try {
    const d1 = readFileSync(join(out1, 'dossier.json'));
    const d2 = readFileSync(join(out2, 'dossier.json'));
    dossierSame = d1.equals(d2);
  } catch (e) { dossierSame = false; }
}
check('dossier byte-identik dua run', dossierSame);
rmSync(out1, { recursive: true, force: true });
rmSync(out2, { recursive: true, force: true });

/* ---------- 7. runtime headless Chromium ---------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = join(GAME, rel);
  if (!file.startsWith(GAME) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

function chromeDump(url) {
  // async spawn: spawnSync akan memblokir event loop sehingga server HTTP
  // di proses ini tidak bisa menjawab Chrome — pakai spawn async.
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-extensions', '--window-size=1280,720',
      '--virtual-time-budget=8000', '--dump-dom', url,
    ], { timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve(out));
  });
}
function textOf(dom, id) {
  const m = dom.match(new RegExp('<[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/[^>]+>'));
  return m ? m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null;
}

const SHOT_MARKERS = {
  0: ['TELUK', 'LANJUTKAN'],
  1: ['SWAT ARUNIKA DITERJUNKAN', 'SWAT-01', 'PENGEPUNGAN', 'TERLIHAT', 'HEALTH', 'ARMOUR'],
  2: ['KONTRAK HANCUR', 'KOMET MERAH', '0.32 km', 'NEXT'],
  3: ['KONTRAK HANCUR', 'CERITA', 'KOIN ARUNIKA', 'PULAU ABU'],
  4: ['PEMBURU', 'ARUNIKA 98.4', 'ELANG-1', 'SWAT'],
};
for (const shot of [0, 1, 2, 3, 4]) {
  const url = 'http://127.0.0.1:' + port + '/index.html' + (shot ? '?shot=' + shot : '');
  const dom = await chromeDump(url);
  const boot = textOf(dom, 'boot-status');
  const errs = textOf(dom, 'js-errors');
  check('runtime shot ' + shot + ': boot OK', boot === 'OK', 'boot-status=' + boot);
  check('runtime shot ' + shot + ': tanpa console error', !errs, errs ? errs.slice(0, 200) : 'bersih');
  for (const marker of SHOT_MARKERS[shot]) {
    check('runtime shot ' + shot + ': "' + marker + '" tampil', dom.includes(marker));
  }
}
server.close();

/* ---------- ringkasan ---------- */
const passed = checks.filter((c) => c.pass).length;
console.log('\nSELFTEST: ' + passed + '/' + checks.length + ' lolos');
if (passed !== checks.length) {
  console.log('GAGAL:');
  for (const c of checks.filter((c) => !c.pass)) console.log('  - ' + c.name + ' — ' + c.detail);
  process.exit(1);
}
