// Screenshot + self-test harness for Teluk Arunika (submit rebuild, take 2).
// Uses Playwright Chromium already on this VM. Run from submit/:
//   node tools/shoot.mjs
// Exits non-zero if the self-test has any FAIL or any console/page error occurs.
import { chromium } from 'playwright-core';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = 'file://' + path.join(ROOT, 'game/index.html');
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', r => errors.push('[reqfail] ' + r.url()));

// self-test first
await page.goto(GAME + '?test=1');
await page.waitForTimeout(5000);
const test = await page.evaluate(() => window.__testResults || []);
console.log('TEST TITLE:', await page.title());
console.log((test || []).join('\n'));
const fails = (test || []).filter(l => l.startsWith('FAIL')).length;
console.log('TEST FAILS:', fails);

// staged shots as JPEG (each must stay under the 262,144-byte cap)
for (const n of [1, 2, 3, 4]) {
  await page.goto(GAME + '?shot=' + n);
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => ({
    title: document.title,
    webglError: !document.getElementById('webgl-error').classList.contains('hidden'),
    hudHidden: document.getElementById('hud').classList.contains('hidden'),
    dialogOpen: !document.getElementById('dialog').classList.contains('hidden'),
    pauseOpen: !document.getElementById('pause').classList.contains('hidden'),
    wheelOpen: !document.getElementById('wheel').classList.contains('hidden'),
    prompt: document.getElementById('prompt').textContent,
  }));
  console.log('SHOT', n, JSON.stringify(info));
  const out = path.join(ROOT, 'screenshots', 'shot' + n + '.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
  const size = statSync(out).size;
  console.log('SHOT', n, 'bytes:', size, size > 262144 ? 'OVER CAP!' : 'ok');
  if (size < 5000) { console.error('SHOT', n, 'suspiciously small — likely a blank/black frame'); errors.push('[shot] shot' + n + ' only ' + size + ' bytes'); }
}
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
if (fails > 0 || errors.length > 0) process.exit(1);
