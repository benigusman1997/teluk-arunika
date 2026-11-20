// Screenshot + self-test harness for Teluk Arunika (submit rebuild, take 3).
// Headless Chromium via playwright-core. Run from the submit/ directory:
//   node tools/shoot.mjs
// Exits non-zero when the self-test reports any FAIL, when a console error,
// page error or failed request appears, or when a screenshot looks blank.
import { chromium } from 'playwright-core';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'file://' + path.join(ROOT, 'game/index.html');
const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push('[console] ' + m.text()); });
page.on('pageerror', e => problems.push('[pageerror] ' + e.message));
page.on('requestfailed', r => problems.push('[reqfail] ' + r.url()));

// 1. self-test page: every check must PASS
await page.goto(PAGE + '?test=1');
await page.waitForTimeout(5000);
const results = await page.evaluate(() => window.__testResults || []);
console.log('TEST TITLE:', await page.title());
console.log((results || []).join('\n'));
const fails = (results || []).filter(l => l.startsWith('FAIL')).length;
console.log('TEST FAILS:', fails);

// 2. staged screenshots, one per story beat, JPEG under the 256 KiB cap
for (const n of [1, 2, 3, 4]) {
  await page.goto(PAGE + '?shot=' + n);
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({
    title: document.title,
    glError: !document.getElementById('glerr').classList.contains('off'),
    hudOff: document.getElementById('hud').classList.contains('off'),
    talkOpen: !document.getElementById('talk').classList.contains('off'),
    pauseOpen: !document.getElementById('pause').classList.contains('off'),
    wheelOpen: !document.getElementById('wheel').classList.contains('off'),
    cue: document.getElementById('cue').textContent,
  }));
  console.log('SHOT', n, JSON.stringify(state));
  const out = path.join(ROOT, 'screenshots', 'shot' + n + '.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 78 });
  const size = statSync(out).size;
  console.log('SHOT', n, 'bytes:', size, size > 262144 ? 'OVER CAP!' : 'ok');
  if (size < 5000) {
    console.error('SHOT', n, 'suspiciously small — likely a blank/black frame');
    problems.push('[shot] shot' + n + ' only ' + size + ' bytes');
  }
}
console.log('ERRORS:', problems.length ? problems.join('\n') : 'none');
const totalBytes = [1, 2, 3, 4].reduce((sum, n) => sum + statSync(path.join(ROOT, 'screenshots', 'shot' + n + '.jpg')).size, 0);
console.log('TOTAL SHOT BYTES:', totalBytes);
await browser.close();
if (fails > 0 || problems.length > 0) process.exit(1);
