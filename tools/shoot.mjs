// shoot.mjs — takes 4 real-render screenshots of the game with headless Chromium (1280x720 JPEG, <=256 KiB).
// Usage: node tools/shoot.mjs
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const PORT = 8091;

function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      fetch('http://localhost:' + port + '/').then(() => resolve(true)).catch(() => {
        if (Date.now() - start > timeoutMs) reject(new Error('server did not start'));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function shotOne(shot) {
  const png = join('/tmp', shot.name.replace(/\.jpg$/, '.png'));
  const url = 'http://localhost:' + PORT + '/' + shot.query;
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--hide-scrollbars', '--window-size=1280,720',
    '--virtual-time-budget=9000', '--timeout=30000',
    '--screenshot=' + png, url,
  ];
  try {
    execFileSync(CHROME, args, { stdio: 'pipe', timeout: 60000 });
  } catch (e) {
    console.log('chrome failed for ' + shot.name + ': ' + (e.stderr || e.message || e));
  }
  if (!existsSync(png)) { console.log('FAIL no render: ' + shot.name); return false; }
  // Convert to JPEG, shrink quality until <= 256 KiB
  const out = join(root, 'screenshots', shot.name);
  let q = 6;
  for (;;) {
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', png, '-q:v', String(q), out], { stdio: 'pipe' });
    const size = statSync(out).size;
    if (size <= 262144 || q >= 20) break;
    q += 3;
  }
  const size = statSync(out).size;
  console.log(shot.name + ': ' + size + ' bytes (q=' + q + ') ' + (size <= 262144 ? 'OK' : 'TOO BIG'));
  unlinkSync(png);
  return size <= 262144;
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: root, stdio: 'pipe' });
try {
  await waitForPort(PORT, 20000);
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  let ok = true;
  for (const shot of shots) ok = shotOne(shot) && ok;
  console.log(ok ? 'ALL SHOTS OK' : 'SOME SHOTS FAILED');
} finally {
  server.kill('SIGTERM');
}
