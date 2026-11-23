// tools/shoot.mjs — takes the four showcase screenshots with headless Chromium. Usage: node tools/shoot.mjs [1 2 3 4]
// playwright-core is found through PW_MODULES (a node_modules directory outside this repository).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(process.env.PW_MODULES || join(repo, 'node_modules'), 'x.js'));
const { chromium } = require('playwright-core');
const names = { 1: 'shot1-coast-chase', 2: 'shot2-market-carjack', 3: 'shot3-bank-shootout', 4: 'shot4-title-saves' };
const scenes = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '3', '4'];
const quality = +(process.env.SHOT_QUALITY || 84);

mkdirSync(join(repo, 'screenshots'), { recursive: true });
const browser = await chromium.launch({
  headless: true, executablePath: process.env.CHROME_BIN,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--renderer-process-limit=1'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  for (const n of scenes) {
    await page.goto(pathToFileURL(join(repo, 'game', 'index.html')).href + '?shot=' + n);
    await page.waitForFunction('window.__shotReady === true', null, { timeout: 90000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(repo, 'screenshots', names[n] + '.jpg'), type: 'jpeg', quality });
    console.log('shot', n, 'saved');
  }
} finally {
  await browser.close();
}
