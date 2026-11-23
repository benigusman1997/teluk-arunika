// Selftest: static checks over the repo plus one browser run that
// exercises the game's real global functions from the tool side.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
let passed = 0;
let failed = 0;

// Print one check result and count it.
function check(name, ok) {
  if (ok) {
    passed += 1;
    console.log('PASS ' + name);
  } else {
    failed += 1;
    console.log('FAIL ' + name);
  }
}

// The 32 game files in script order.
const JS_FILES = [
  'open-world-city.js', 'traffic-ai.js', 'pedestrian-ai.js',
  'police-wanted.js', 'police-pursuit-tactics.js', 'police-airswat.js',
  'story-missions.js', 'heist-bank-job.js', 'car-theft.js',
  'vehicle-driving.js', 'player-onfoot.js', 'weapons-combat.js',
  'street-races.js', 'side-activities.js', 'crew-abilities.js',
  'economy-shops-garage.js', 'phone-contacts.js', 'career-progress.js',
  'story-dialogue.js', 'tutorial-hints.js', 'save-slots.js',
  'hud-panels.js', 'hud-minimap.js', 'menu-screens.js', 'camera-rigs.js',
  'radio-stations.js', 'sky-daynight-weather.js', 'visual-effects.js',
  'input-controls.js', 'mesh-factory.js', 'showcase-scenes.js',
  'game-main.js',
];

// Forbidden phrases from the brief: no commercial game names anywhere.
const FORBIDDEN = [
  'Grand Theft Auto', 'GTA', 'Vice City', 'Leonida', 'Wasted',
  'Busted', 'Rockstar',
];

// Static checks over the repository.
function staticChecks() {
  for (const file of JS_FILES) {
    check('file exists game/js/' + file, existsSync(join(repo, 'game', 'js', file)));
  }
  const index = readFileSync(join(repo, 'game', 'index.html'), 'utf8');
  let lastPos = -1;
  let inOrder = true;
  for (const file of JS_FILES) {
    const pos = index.indexOf('js/' + file);
    if (pos < 0 || pos < lastPos) {
      inOrder = false;
    }
    lastPos = pos;
  }
  check('index.html names all 32 scripts in order', inOrder);
  let noRemote = true;
  for (const file of JS_FILES) {
    const text = readFileSync(join(repo, 'game', 'js', file), 'utf8');
    if (text.indexOf('http://') >= 0 || text.indexOf('https://') >= 0) {
      noRemote = false;
    }
  }
  check('no http/https inside game/ own source', noRemote);
  let clean = true;
  const allText = JS_FILES.map((f) => readFileSync(join(repo, 'game', 'js', f), 'utf8')).join('\n')
    + readFileSync(join(repo, 'game', 'index.html'), 'utf8')
    + readFileSync(join(repo, 'game', 'style.css'), 'utf8')
    + readFileSync(join(repo, 'README.md'), 'utf8');
  for (const phrase of FORBIDDEN) {
    if (allText.indexOf(phrase) >= 0) {
      clean = false;
      console.log('forbidden phrase found: ' + phrase);
    }
  }
  check('no forbidden phrases anywhere', clean);
  const readme = readFileSync(join(repo, 'README.md'), 'utf8');
  check('README has badge gta6-01', readme.indexOf('https://make.fun/badge/gta6-01.svg') >= 0);
  check('README has rank badge', readme.indexOf('https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg') >= 0);
  check('README has reward badge', readme.indexOf('https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg') >= 0);
  const shotFiles = ['shot1-coast-chase.jpg', 'shot2-market-carjack.jpg', 'shot3-bank-shootout.jpg', 'shot4-title-saves.jpg'];
  for (const shot of shotFiles) {
    const path = join(repo, 'screenshots', shot);
    const ok = existsSync(path) && statSync(path).size <= 262144 && statSync(path).size > 10000;
    check('screenshot ' + shot + ' exists and fits', ok);
  }
  let total = 0;
  for (const file of JS_FILES) {
    total += readFileSync(join(repo, 'game', 'js', file), 'utf8').split('\n').length;
  }
  check('game/js total >= 5000 lines (' + total + ')', total >= 5000);
  const license = readFileSync(join(repo, 'LICENSE'), 'utf8');
  check('LICENSE keeps SPDX MIT line', license.indexOf('SPDX-License-Identifier: MIT') >= 0);
}

// One browser run on selftest=1 exercising the real game functions.
async function browserChecks() {
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
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(gameUrl + '?selftest=1', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(
    () => window.__shotReady === true,
    null,
    { timeout: 60000 },
  );
  check('page has no script error', errors.length === 0);
  const webgl = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    return !!(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  });
  check('WebGL context exists', webgl);
  const mode = await page.evaluate(() => GAME.mode);
  check('GAME.mode is playing', mode === 'playing');
  const steal = await page.evaluate(() => {
    const index = spawnVehicle('ARUNIKA SEDAN', GAME.player.x + 2, GAME.player.z, 0, 'none');
    GAME.player.x = GAME.vehicles[index].x;
    GAME.player.z = GAME.vehicles[index].z;
    updateCarTheftProgress(1 / 60, index);
    GAME.ui.promptProgress = 1;
    updateCarTheftProgress(1 / 60, index);
    return GAME.player.vehicle;
  });
  check('spawn a car and steal it -> player in a vehicle', steal >= 0);
  const speed = await page.evaluate(() => {
    const v = GAME.vehicles[GAME.player.vehicle];
    v.speed = 0;
    v.x = 0;
    v.z = 0;
    v.heading = Math.PI / 2;
    GAME.player.x = 0;
    GAME.player.z = 0;
    for (let i = 0; i < 120; i++) {
      v.speed = Math.min(v.speed + 0.5, 30);
      driveVehicleWithArcadePhysics(1 / 60);
    }
    return Math.abs(v.speed) * 3.6;
  });
  check('hold the throttle for 120 steps -> speed above 20', speed > 20);
  const units = await page.evaluate(() => {
    raiseWantedLevel(3, 'ARMED ROBBERY');
    return GAME.police.units.filter((u) => u.role).length;
  });
  check('raiseWantedLevel to 3 -> at least three dispatch units', units >= 3);
  const stage = await page.evaluate(() => {
    startStoryContract(1);
    advanceMissionStage();
    return GAME.mission.stage;
  });
  check('startStoryContract 1 then advanceMissionStage -> stage 2', stage === 2);
  const slot = await page.evaluate(() => {
    selectWeaponSlot(5);
    return GAME.player.weaponSlot;
  });
  check('open and select weapon slot 5', slot === 5);
  const money = await page.evaluate(() => {
    GAME.money = 7777;
    saveGameToSlot(1);
    GAME.money = 0;
    loadGameFromSlot(1);
    return GAME.money;
  });
  check('saveGameToSlot 1 then loadGameFromSlot 1 -> money equal', money === 7777);
  const stars = await page.evaluate(() => {
    stageShowcaseScene(1);
    return GAME.police.stars;
  });
  check('stageShowcaseScene 1 -> four stars', stars === 4);
  await browser.close();
}

async function main() {
  staticChecks();
  await browserChecks();
  console.log('SELFTEST ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('selftest failed: ' + err.message);
  process.exit(1);
});
