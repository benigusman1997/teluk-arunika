/* shoot.mjs — render 4 screenshot 1280x720 JPEG dari kode game via headless Chromium.
   Jalankan: node tools/shoot.mjs  (dari root repo). */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GAME = join(ROOT, 'game');
const OUT = join(ROOT, 'screenshots');
const CHROME = process.env.CHROME || '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const TMP = '/tmp/ta-shots';
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { n: 1, file: 'shot1-bank-escape.jpg' },
  { n: 2, file: 'shot2-bank-shootout.jpg' },
  { n: 3, file: 'shot3-full-map.jpg' },
  { n: 4, file: 'shot4-title-screen.jpg' },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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

function toJpeg(pngPath, jpgPath) {
  // konversi PNG -> JPEG via Python PIL, turunkan kualitas sampai <= 256 KiB
  for (const q of [88, 82, 76, 68, 58]) {
    const py = [
      'from PIL import Image',
      "im = Image.open('" + pngPath + "').convert('RGB')",
      "im.save('" + jpgPath + "', 'JPEG', quality=" + q + ", optimize=True)",
    ].join('; ');
    const r = spawnSync('python3', ['-c', py], { encoding: 'utf8', timeout: 60000 });
    if (r.status !== 0) throw new Error('PIL gagal: ' + r.stderr);
    const size = statSync(jpgPath).size;
    if (size <= 262144) return { quality: q, size };
  }
  const size = statSync(jpgPath).size;
  return { quality: 58, size };
}

for (const s of SHOTS) {
  const png = join(TMP, 'shot' + s.n + '.png');
  const jpg = join(OUT, s.file);
  const url = 'http://127.0.0.1:' + port + '/index.html?shot=' + s.n;
  // async spawn: spawnSync memblokir event loop sehingga server HTTP di
  // proses ini tidak bisa menjawab Chrome — pakai spawn async.
  const code = await new Promise((resolve, reject) => {
    const child = spawn(CHROME, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-extensions', '--hide-scrollbars', '--window-size=1280,720',
      '--virtual-time-budget=6000', '--screenshot=' + png, url,
    ], { timeout: 120000 });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (c) => resolve(c));
  });
  if (code !== 0 || !existsSync(png)) {
    console.log('FAIL shot ' + s.n + ': chrome exit ' + code);
    process.exit(1);
  }
  const info = toJpeg(png, jpg);
  console.log('shot ' + s.n + ' -> ' + s.file + ' ' + info.size + ' bytes (q' + info.quality + ')' +
    (info.size <= 262144 ? ' OK' : ' TERLALU BESAR'));
  if (info.size > 262144) process.exit(1);
}
server.close();
console.log('SHOOT: 4 screenshot selesai.');
