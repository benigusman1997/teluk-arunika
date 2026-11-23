// tools/selftest.mjs — loads the game headless, plays a few seconds and asserts the core systems respond.
// Usage: PW_MODULES=/path/to/node_modules CHROME_BIN=/path/to/chrome node tools/selftest.mjs
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(process.env.PW_MODULES || join(repo, 'node_modules'), 'x.js'));
const { chromium } = require('playwright-core');
const errors = [], results = [];
const reached = (page, js) => page.waitForFunction(js, null, { timeout: 45000 }).then(() => true, () => false);
const check = (name, ok) => { results.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) errors.push(name); };

const browser = await chromium.launch({
  headless: true, executablePath: process.env.CHROME_BIN,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage', '--renderer-process-limit=1'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push('page error: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith('file:')) errors.push('network request: ' + r.url()); });
  await page.goto(pathToFileURL(join(repo, 'game', 'index.html')).href);
  await page.waitForFunction('window.TA && TA.S && TA.S.mode === "title"', null, { timeout: 90000 });
  check('WebGL renderer created', await page.evaluate('!!TA.renderer.getContext()'));
  check('city has colliders, traffic and pedestrians', await page.evaluate('TA.colliders.length > 150 && TA.cars.length >= 30 && TA.people.length >= 60'));
  await page.evaluate('TA.startNewGame()');
  const x0 = await page.evaluate('TA.player.z');
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  check('player walks', await reached(page, 'TA.player.z !== ' + x0));
  await page.evaluate('(function () { var c = TA.cars.filter(function (c) { return c.role === "traffic"; })[0]; TA.player.x = c.x + 2; TA.player.z = c.z; TA.stealNearestCar(); })()');
  check('carjack puts the player in a car and raises heat', await reached(page, '!!TA.player.car && TA.S.heat > 0 && TA.S.stats.stolen === 1'));
  await page.keyboard.down('KeyW');
  check('car accelerates', await reached(page, '!!TA.player.car && Math.abs(TA.player.car.v) > 1'));
  await page.keyboard.up('KeyW');
  await page.evaluate('TA.raiseWantedLevel(5, "SELFTEST")');
  check('five stars dispatch cruisers, ELANG-1 and BADAK-2', await reached(page, 'TA.S.wanted === 5 && TA.cars.some(function (c) { return c.role === "police"; }) && !!TA.heli && !!TA.swatVan'));
  await page.evaluate('TA.startStoryContract(0)');
  check('contract opens with a cutscene', await page.evaluate('TA.S.mode === "cutscene"'));
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  check('dialogue ends and the mission stage starts', await page.evaluate('TA.S.mode === "playing" && TA.S.stage >= 0'));
  await page.evaluate('TA.saveGameToSlot(1)');
  check('save slot written', await page.evaluate('!!TA.slotSummary(1)'));
  await page.keyboard.press('Escape');
  check('pause menu opens', await page.evaluate('TA.S.mode === "paused"'));
} finally {
  await browser.close();
}
console.log(results.join('\n'));
if (errors.length) { console.log('SELFTEST FAILED:\n' + errors.join('\n')); process.exit(1); }
console.log('SELFTEST OK');
