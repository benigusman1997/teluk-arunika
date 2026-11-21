// Screenshot Teluk Arunika v3.5 — 4 shot 1280x720 JPEG, masing-masing <= 256 KiB.
// Jalankan dari root repo:  node tools/shoot.mjs
// Memakai staging deterministik ?scene=1..4, lalu memverifikasi isi tiap shot dari DOM.
import { statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const here = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const PW_DIR = join(dirname(here), 'pw');
const { chromium } = require(join(PW_DIR, 'node_modules', 'playwright-core'));

const SHOTS = [
  { name: 'shot1-onfoot-rain.jpg', scene: 1, wait: 3200, quality: 82,
    verify: async (page) => ({
      'mode bermain (tidak game over)': await page.evaluate(() => window.TA.state.mode === 'playing'),
      'banner lokasi tampil': await page.evaluate(() => document.getElementById('location-banner').offsetParent !== null),
      'nama mobil tampil': await page.evaluate(() => !document.getElementById('speed-block').classList.contains('hidden') || document.getElementById('car-name').textContent.length > 0),
      'wanted 2 bintang': await page.evaluate(() => window.TA.state.wanted === 2),
      'baris kru tampil': await page.evaluate(() => document.getElementById('crew-row').textContent.includes('Sari')),
    }) },
  { name: 'shot2-chase-night.jpg', scene: 2, wait: 5200, quality: 82,
    verify: async (page) => ({
      'mode bermain (tidak game over)': await page.evaluate(() => window.TA.state.mode === 'playing'),
      'panel dispatch tampil': await page.evaluate(() => document.getElementById('dispatch-list').children.length >= 4),
      'kartu kru tampil': await page.evaluate(() => document.getElementById('crew-cards').children.length === 3),
      'banner tahap misi tampil': await page.evaluate(() => document.getElementById('mission-stage').textContent.includes('TAHAP 2/3')),
      'toast obrolan kru tampil': await page.evaluate(() => !document.getElementById('chatter-toast').classList.contains('hidden')),
      'ELANG-1 aktif': await page.evaluate(() => window.TA.police.heliActive === true),
      'wanted 4 bintang': await page.evaluate(() => window.TA.state.wanted === 4),
    }) },
  { name: 'shot3-shootout.jpg', scene: 3, wait: 3200, quality: 82,
    verify: async (page) => ({
      'mode cutscene dialog (tidak game over)': await page.evaluate(() => window.TA.state.mode === 'cutscene'),
      'misi 10 aktif': await page.evaluate(() => window.TA.MISSIONS[window.TA.state.missionIndex].id === 10),
      'weapon wheel terbuka': await page.evaluate(() => !document.getElementById('weapon-wheel').classList.contains('hidden')),
      'dialog cutscene tampil': await page.evaluate(() => !document.getElementById('dialogue-box').classList.contains('hidden')),
      'musuh gelombang 1 ada': await page.evaluate(() => window.TA.enemies.length >= 3),
      'langit fajar': await page.evaluate(() => window.TA.state.timeMin > 300 && window.TA.state.timeMin < 400),
    }) },
  { name: 'shot4-pause-save.jpg', scene: 4, wait: 3200, quality: 82,
    verify: async (page) => ({
      'layar pause tampil': await page.evaluate(() => !document.getElementById('pause-screen').classList.contains('hidden')),
      'detail karier tampil': await page.evaluate(() => document.getElementById('pause-career').textContent.includes('Penguasa Jalanan')),
      'panel kru di pause tampil': await page.evaluate(() => document.getElementById('pause-crew').textContent.includes('Sari')),
      'jam 02:14': await page.evaluate(() => document.getElementById('clock').textContent === '02:14'),
      'XP 450 tampil': await page.evaluate(() => document.getElementById('rank-text').textContent.includes('450')),
    }) },
];

const PORT = 8902;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitServer(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/index.html`); if (r.ok) return true; } catch { /* belum siap */ }
    await sleep(300);
  }
  return false;
}

let ok = true;
try {
  if (!(await waitServer())) throw new Error('serve.ts tidak menjawab di port ' + PORT);
  const exe = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html?scene=${shot.scene}`, { waitUntil: 'load' });
    await page.waitForTimeout(shot.wait);
    const checks = await shot.verify(page);
    for (const [name, pass] of Object.entries(checks)) {
      console.log(`  [${pass ? 'OK ' : 'FAIL'}] shot${shot.scene} ${name}`);
      if (!pass) ok = false;
    }
    if (errors.length) { console.log('  console errors:', errors.slice(0, 3)); ok = false; }
    let quality = shot.quality;
    const out = join(here, 'screenshots', shot.name);
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.screenshot({ path: out, type: 'jpeg', quality });
      const size = statSync(out).size;
      console.log(`${shot.name}: ${size} byte (quality ${quality}, batas 262144)`);
      if (size <= 262144) break;
      quality -= 12;
      if (attempt === 3) { console.log(`  FAIL: ${shot.name} masih > 256 KiB di quality ${quality}`); ok = false; }
    }
    await page.close();
  }
  await browser.close();
} catch (e) {
  console.log('SHOOT ERROR:', e.message);
  ok = false;
} finally {
  server.kill();
}
process.exit(ok ? 0 : 1);
