// Takes the four showcase screenshots: serves game/, opens ?shot=N&seed=S in headless Chromium,
// waits for the scene-ready flag and writes 1280x720 JPEGs under the byte cap into screenshots/.
// Usage: node tools/shoot.mjs [shotNumber ...]   (PLAYWRIGHT_CORE and CHROMIUM_PATH may override paths)
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = join(repo, 'game');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg' };

export function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '') || 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

export async function loadChromium() {
  const candidates = [process.env.PLAYWRIGHT_CORE, join(repo, 'node_modules', 'playwright-core'), join(repo, '..', 'pw', 'node_modules', 'playwright-core')].filter(Boolean);
  const found = candidates.find((dir) => existsSync(join(dir, 'index.mjs')));
  if (!found) throw new Error('playwright-core not found; set PLAYWRIGHT_CORE to its folder');
  const { chromium } = await import(pathToFileURL(join(found, 'index.mjs')).href);
  return chromium;
}

export async function openGamePage(chromium, base, query) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (err) => problems.push('pageerror: ' + err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push('console: ' + msg.text()); });
  await page.goto(base + '/index.html' + query, { waitUntil: 'load', timeout: 120000 });
  return { browser, page, problems };
}

async function captureShot(chromium, base, shot, cap) {
  const { browser, page, problems } = await openGamePage(chromium, base, shot.query);
  try {
    await page.waitForFunction('window.__sceneReady === true', null, { timeout: 180000 });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    if (problems.length) throw new Error(shot.file + ': ' + problems.join(' | '));
    for (let quality = 92; quality >= 40; quality -= 4) {
      const jpeg = await page.screenshot({ type: 'jpeg', quality });
      if (jpeg.length <= cap) {
        await writeFile(join(repo, 'screenshots', shot.file), jpeg);
        console.log(shot.file + ' ' + jpeg.length + ' bytes (quality ' + quality + ')');
        return;
      }
    }
    throw new Error(shot.file + ': could not get under ' + cap + ' bytes');
  } finally {
    await browser.close();
  }
}

async function main() {
  const config = JSON.parse(await readFile(join(repo, 'shots.json'), 'utf8'));
  const wanted = process.argv.slice(2).map(Number);
  await mkdir(join(repo, 'screenshots'), { recursive: true });
  const chromium = await loadChromium();
  const server = await startStaticServer(gameDir);
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    // One browser at a time, closed after every capture, to stay inside a small memory budget.
    for (let i = 0; i < config.shots.length; i++) {
      if (wanted.length && !wanted.includes(i + 1)) continue;
      await captureShot(chromium, base, config.shots[i], config.maxBytes);
    }
  } finally {
    server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
