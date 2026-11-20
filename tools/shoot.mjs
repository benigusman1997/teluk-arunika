// Teluk Arunika — screenshot + self-test harness (take 4, written fresh).
// Serves the repo over a tiny local HTTP server, runs ?test=1 in headless
// Chromium (swiftshader), prints every check, then stages ?shot=1..4 and
// saves screenshots/shotN.jpg as JPEGs under the 262144-byte cap.
// Usage: node tools/shoot.mjs   (run from the repo root)
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS_DIR = join(ROOT, 'screenshots');
const CHROME_BIN = join(process.env.HOME || '', '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const MAX_SHOT_BYTES = 262144;
const VIEW = { width: 1280, height: 720 };

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

function serve() {
  const server = createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const rel = urlPath === '/' ? 'game/index.html' : urlPath.replace(/^\/+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404); res.end('not found: ' + rel); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    } catch (e) {
      res.writeHead(500); res.end(String(e));
    }
  });
  return new Promise((resolveListen) => server.listen(0, '127.0.0.1', () => resolveListen(server)));
}

async function snapUnderCap(page, outPath) {
  for (const quality of [78, 62, 48, 34]) {
    const buf = await page.screenshot({ type: 'jpeg', quality });
    writeFileSync(outPath, buf);
    if (buf.length <= MAX_SHOT_BYTES) return { bytes: buf.length, quality };
  }
  const size = statSync(outPath).size;
  return { bytes: size, quality: 34, over: true };
}

const server = await serve();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log('serving', ROOT, 'on', base);
console.log('chrome:', CHROME_BIN, existsSync(CHROME_BIN) ? 'found' : 'MISSING');

let failures = 0;
const browser = await chromium.launch({
  executablePath: CHROME_BIN,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});

// ---- self-test page ----
{
  const page = await browser.newPage({ viewport: VIEW });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('reqfail: ' + r.url()));
  await page.goto(base + '/game/index.html?test=1', { waitUntil: 'load', timeout: 60000 });
  try {
    await page.waitForFunction(() => window.__testsDone === true, null, { timeout: 60000 });
  } catch {
    console.log('TIMEOUT waiting for __testsDone');
    failures++;
  }
  const results = await page.evaluate(() => window.__testResults || []);
  for (const line of results) console.log(line);
  const fails = results.filter((l) => l.startsWith('FAIL'));
  const passes = results.filter((l) => l.startsWith('PASS'));
  console.log(`SELF-TEST: ${passes.length} PASS, ${fails.length} FAIL`);
  if (fails.length) failures += fails.length;
  for (const p of problems) { console.log('PROBLEM:', p); failures++; }
  await page.close();
}

// ---- staged screenshots ----
for (let n = 1; n <= 4; n++) {
  const page = await browser.newPage({ viewport: VIEW });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('reqfail: ' + r.url()));
  await page.goto(base + `/game/index.html?shot=${n}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3500);
  const outPath = join(SHOTS_DIR, `shot${n}.jpg`);
  const { bytes, quality, over } = await snapUnderCap(page, outPath);
  if (bytes < 8192) { console.log(`shot${n}.jpg suspiciously small (${bytes} bytes) — likely blank`); failures++; }
  console.log(`shot${n}.jpg: ${bytes} bytes (quality ${quality}, 1280x720)${over ? ' OVER CAP!' : ''}`);
  if (over) failures++;
  for (const p of problems) { console.log(`shot${n} PROBLEM:`, p); failures++; }
  await page.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? 'HARNESS OK — 0 failures' : `HARNESS DONE WITH ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
