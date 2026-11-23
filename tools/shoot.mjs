// Screenshot tool: opens the game from disk in headless Chromium and
// captures the four showcase scenes (or the probe) as JPEGs that fit
// the 262,144-byte cap, at the highest quality that fits.
import { createRequire } from 'node:module';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const PW_CORE = process.env.PW_CORE
  || '/home/hatch/workspace/goals/make-gta6-bounty/pw/node_modules/playwright-core';
const CHROME_BIN = process.env.CHROME_BIN
  || '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const { chromium } = require(PW_CORE);

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const shotsDir = join(repo, 'screenshots');
const MAX_BYTES = 262144;

// Scene table: number, file name, fixed steps are set in the game.
const SCENES = [
  { n: 1, file: 'shot1-coast-chase.jpg' },
  { n: 2, file: 'shot2-market-carjack.jpg' },
  { n: 3, file: 'shot3-bank-shootout.jpg' },
  { n: 4, file: 'shot4-title-saves.jpg' },
];

// Capture one page as a JPEG, stepping quality down until it fits.
async function captureShot(browser, url, outPath) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push('console: ' + msg.text());
    }
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  try {
    await page.waitForFunction(
      () => window.__shotReady === true,
      null,
      { timeout: 90000 },
    );
  } catch (e) {
    errors.push('shot never became ready: ' + e.message);
  }
  let quality = 95;
  let buffer = null;
  let usedQuality = quality;
  while (quality >= 40) {
    buffer = await page.screenshot({ type: 'jpeg', quality: quality });
    if (buffer.length <= MAX_BYTES) {
      usedQuality = quality;
      break;
    }
    quality -= 3;
    usedQuality = quality;
  }
  if (buffer.length > MAX_BYTES) {
    buffer = await page.screenshot({ type: 'jpeg', quality: 40 });
    usedQuality = 40;
  }
  writeFileSync(outPath, buffer);
  await page.close();
  return { size: buffer.length, quality: usedQuality, errors: errors };
}

// Main: arguments are scene numbers, the word probe, or nothing (all).
async function main() {
  const args = process.argv.slice(2);
  mkdirSync(shotsDir, { recursive: true });
  const gameUrl = pathToFileURL(join(repo, 'game', 'index.html')).href;
  const browser = await chromium.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: [
      '--no-sandbox', '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader', '--disable-dev-shm-usage',
      '--mute-audio', '--hide-scrollbars', '--window-size=1280,720',
    ],
  });
  let picked = SCENES;
  if (args.length === 1 && args[0] === 'probe') {
    const result = await captureShot(
      browser, gameUrl + '?probe=1', '/tmp/probe.jpg',
    );
    console.log('probe /tmp/probe.jpg size=' + result.size
      + ' quality=' + result.quality);
    for (const err of result.errors) {
      console.log('ERROR ' + err);
    }
    await browser.close();
    return;
  }
  if (args.length > 0) {
    const wanted = new Set(args.map((a) => parseInt(a, 10)));
    picked = SCENES.filter((s) => wanted.has(s.n));
  }
  for (const scene of picked) {
    const outPath = join(shotsDir, scene.file);
    const result = await captureShot(
      browser, gameUrl + '?shot=' + scene.n, outPath,
    );
    const size = statSync(outPath).size;
    console.log(scene.file + ' size=' + size
      + ' quality=' + result.quality
      + (size <= MAX_BYTES ? ' OK' : ' OVER CAP'));
    for (const err of result.errors) {
      console.log('ERROR ' + scene.file + ' ' + err);
    }
  }
  await browser.close();
}

main().catch((err) => {
  console.error('shoot failed: ' + err.message);
  process.exit(1);
});
