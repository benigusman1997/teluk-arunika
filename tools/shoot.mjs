// Takes the four screenshots listed in shots.json: serves game/ locally, opens each showcase scene
// in headless Chromium at 1280x720, waits for the scene-ready signal and saves the best JPEG under the cap.
//
//   node tools/shoot.mjs            all four
//   node tools/shoot.mjs 1          only shot 1
//
// Needs playwright-core and a Chromium build from outside this repository:
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core  CHROMIUM=/path/to/chrome  node tools/shoot.mjs
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const repo = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const CAP = 262144;

// A tiny static server for game/ on a free local port.
export function serveGame() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(req.url.split('?')[0]);
      const file = join(repo, 'game', path === '/' ? 'index.html' : path);
      if (path.includes('..') || !existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port + '/' }));
  });
}

// Finds playwright-core and the full Chromium build (not the headless shell) outside the repository.
export async function launchBrowser() {
  const core = process.env.PLAYWRIGHT_CORE || join(homedir(), 'workspace/goals/make-gta6-bounty/pw/node_modules/playwright-core');
  const { chromium } = createRequire(import.meta.url)(core);
  let exe = process.env.CHROMIUM;
  if (!exe) {
    const cache = join(homedir(), '.cache/ms-playwright');
    const build = readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
    exe = join(cache, build, 'chrome-linux64', 'chrome');
    if (!existsSync(exe)) exe = join(cache, build, 'chrome-linux', 'chrome');
  }
  return chromium.launch({ executablePath: exe, headless: true, args: ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
}

export async function openPage(browser, url, errors) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e && e.stack || e)));
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

async function main() {
  const spec = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
  const only = process.argv[2] ? Number(process.argv[2]) : 0;
  const { server, base } = await serveGame();
  mkdirSync(join(repo, 'screenshots'), { recursive: true });
  let failed = 0;
  for (let i = 0; i < spec.shots.length; i++) {
    if (only && only !== i + 1) continue;
    const shot = spec.shots[i], errors = [];
    const browser = await launchBrowser();            // one browser at a time: the build machine is small
    try {
      const page = await openPage(browser, base + shot.query, errors);
      await page.waitForFunction('window.__sceneReady', null, { timeout: 180000 });
      const info = await page.evaluate('window.__sceneReady');
      await page.waitForTimeout(300);
      let best = null, quality = 95;
      for (; quality >= 40; quality -= 3) {
        best = await page.screenshot({ type: 'jpeg', quality });
        if (best.length <= CAP) break;
      }
      writeFileSync(join(repo, 'screenshots', shot.file), best);
      console.log(shot.file + '  ' + best.length + ' bytes  q' + quality + '  ' + JSON.stringify(info) + (errors.length ? '  ERRORS: ' + errors.join(' | ') : ''));
      if (errors.length || best.length > CAP) failed++;
    } catch (e) {
      failed++;
      console.log(shot.file + '  FAILED  ' + e.message + '  ' + errors.join(' | '));
    }
    await browser.close();
  }
  server.close();
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
