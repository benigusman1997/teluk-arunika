// Screenshot Teluk Arunika v3 — tools/shoot.mjs
// Mengambil 4 screenshot ASLI render game di headless Chromium (1280x720),
// mengikuti shots.json. Output JPEG <= 256 KiB di screenshots/.
//   node tools/shoot.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { killChrome, launchChrome, newTab, run, sleep, waitPort } from './cdp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8902;
const CDP_PORT = 9334;

async function toJpeg(pngPath, jpgPath) {
  // Turunkan kualitas sampai <= 256 KiB.
  for (const q of [5, 7, 9, 12]) {
    await run('ffmpeg', ['-y', '-v', 'error', '-i', pngPath, '-q:v', String(q), jpgPath]);
    if (existsSync(jpgPath) && statSync(jpgPath).size <= 262144) return statSync(jpgPath).size;
  }
  return statSync(jpgPath).size;
}

async function main() {
  const only = process.argv.slice(2);
  let shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'));
  if (only.length) shots = shots.filter((s) => only.some((o) => s.name.includes(o)));
  console.log('== Teluk Arunika v3 — ambil ' + shots.length + ' screenshot ==');
  const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  let chrome = null;
  try {
    if (!await waitPort(PORT, 10000)) throw new Error('serve.ts tidak jalan');
    chrome = await launchChrome(CDP_PORT, '/tmp/ta-shoot-chrome-' + Date.now());
    mkdirSync(join(ROOT, 'screenshots'), { recursive: true });
    for (const shot of shots) {
      const errors = [];
      const tab = await newTab(CDP_PORT, 'http://127.0.0.1:' + PORT + '/index.html' + shot.query);
      tab.onConsole = (t) => errors.push(t);
      tab.onException = (t) => errors.push(t);
      const ready = await tab.waitFor('window.__TA_READY__ === true', 300000);
      if (!ready) { console.log('  FAIL  ' + shot.name + ' — shot tidak siap'); tab.close(); continue; }
      // Pompa frame manual, dipecah 10 frame per evaluate: headless
      // men-throttle requestAnimationFrame dan satu frame SwiftShader lambat.
      for (let i = 0; i < 2; i++) {
        await tab.evaluate('for (let j = 0; j < 10; j++) TA.pumpFrame(0.016); true', 120000);
      }
      const shotReady = await tab.waitFor('window.__TA_SHOT_READY__ === true', 30000);
      if (!shotReady) { console.log('  FAIL  ' + shot.name + ' — frame tidak ter-render'); tab.close(); continue; }
      await sleep(600); // biarkan hujan, lampu, dan HUD stabil
      await tab.evaluate('for (let j = 0; j < 10; j++) TA.pumpFrame(0.016); true', 120000);
      // Capture bisa macet di SwiftShader — coba sampai 2x.
      let png = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 2 && !png; attempt++) {
        try {
          png = await tab.screenshot();
        } catch (e) {
          lastErr = e;
          console.log('  ... capture percobaan ' + (attempt + 1) + ' gagal, coba lagi: ' + e.message);
          await sleep(3000);
        }
      }
      if (!png) { console.log('  FAIL  ' + shot.name + ' — capture gagal: ' + (lastErr && lastErr.message)); tab.close(); continue; }
      const tmpPng = join('/tmp', 'ta-' + shot.name.replace('.jpg', '.png'));
      writeFileSync(tmpPng, png);
      const jpgPath = join(ROOT, 'screenshots', shot.name);
      const size = await toJpeg(tmpPng, jpgPath);
      const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', jpgPath]);
      const dims = probe.stdout.trim();
      const ok = size <= 262144 && dims === '1280,720' && errors.length === 0;
      console.log((ok ? '  OK    ' : '  FAIL  ') + shot.name + ' — ' + size + ' bytes, ' + dims +
        (errors.length ? ', console error: ' + errors.slice(0, 2).join(' | ') : ''));
      if (!ok) process.exitCode = 1;
      tab.close();
    }
  } finally {
    killChrome(chrome);
    try { server.kill(); } catch {}
  }
  console.log('selesai.');
}

main().catch((e) => { console.error('shoot crash:', e); process.exit(1); });
