// Self-test for TELUK ARUNIKA: static checks on the repository, then runtime checks in headless Chromium.
// Usage: node tools/selftest.mjs   (same PLAYWRIGHT_CORE / CHROMIUM_PATH overrides as tools/shoot.mjs)
// Prints PASS or FAIL per check and exits 0 only when every check passes.
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer, loadChromium, openGamePage } from './shoot.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(name, ok, detail) {
  results.push(ok);
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  (' + detail + ')' : ''));
}

async function readText(relative) {
  return readFile(join(repo, relative), 'utf8');
}

// Width and height from the first start-of-frame marker of a JPEG.
function jpegSize(bytes) {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1], length = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
    i += 2 + length;
  }
  return null;
}

async function runStaticChecks() {
  const html = await readText('game/index.html');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const onDisk = (await readdir(join(repo, 'game', 'js'))).filter((f) => f.endsWith('.js')).sort();
  record('index.html loads three.min.js first', scripts[0] === 'vendor/three.min.js', scripts[0]);
  const listed = scripts.slice(1).map((s) => s.replace('js/', '')).sort();
  record('every game/js file is loaded exactly once', listed.length === onDisk.length && listed.every((f, n) => f === onDisk[n]), onDisk.length + ' files');
  record('game-main.js is loaded last', scripts[scripts.length - 1] === 'js/game-main.js');

  let remote = 0, lines = 0;
  for (const file of onDisk) {
    const text = await readText('game/js/' + file);
    lines += text.split('\n').length;
    if (/https?:\/\//.test(text)) remote++;
  }
  const page = html + (await readText('game/style.css'));
  record('own game source makes no network references', remote === 0 && !/https?:\/\//.test(page), lines + ' lines of game code');

  const readme = await readText('README.md');
  const badges = ['https://make.fun/badge/gta6-01.svg', 'https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg', 'https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg'];
  record('README carries the three make.fun badges', badges.every((b) => readme.includes('](' + b + ')](https://make.fun/bounty/gta6-01)')));

  const config = JSON.parse(await readText('shots.json'));
  let shotsOk = config.shots.length === 4, detail = [];
  for (const shot of config.shots) {
    const path = join(repo, 'screenshots', shot.file);
    const info = await stat(path).catch(() => null);
    const size = info ? jpegSize(await readFile(path)) : null;
    if (!info || info.size > config.maxBytes || !size || size[0] !== config.size[0] || size[1] !== config.size[1]) shotsOk = false;
    detail.push(info ? info.size : 'missing');
  }
  record('four 1280x720 screenshots under the byte cap', shotsOk, detail.join(', '));
  return config;
}

// Everything below runs inside the page, against the game's own global functions.
function playthroughInPage() {
  const out = {};
  const step = (frames) => { for (let i = 0; i < frames; i++) { G.frame++; stepPlaying(FIXED_STEP); W.keysHit = {}; W.mouse.leftHit = false; } };
  out.webgl = !!W.renderer.getContext() && W.scene.children.length > 20;
  out.titleMode = G.mode;

  startNewGame();
  G.dialogue = null; G.mode = 'playing';
  step(30);
  out.newGame = G.mode === 'playing' && G.day === 1 && W.cars.length > 20 && W.people.length > 20;
  out.newGameDetail = G.mode + ', day ' + G.day + ', ' + W.cars.length + ' cars, ' + W.people.length + ' people';

  // Put Raka beside a car on the open boulevard and drive east.
  const p = G.player;
  p.x = -300; p.z = 264;
  const car = spawnCar('gt', -300, 267, Math.PI / 2, 'parked');
  enterOrExitVehicle(car);
  const fromX = car.x, fromZ = car.z;
  W.keys.KeyW = true;
  step(150);
  W.keys.KeyW = false;
  out.driving = p.car === car && Math.abs(car.speed) > 4 && Math.hypot(car.x - fromX, car.z - fromZ) > 5;
  out.speed = Math.round(Math.abs(car.speed) * 3.6);

  reportCrime(3, INCIDENTS[3]);
  W.dispatchTimer = 0.05;
  step(240);
  out.wanted = G.wanted >= 3 && W.units.length > 0;
  out.units = W.units.length;
  clearWantedLevel(false);
  enterOrExitVehicle(car);
  step(10);

  startStoryContract(1);
  G.dialogue = null;
  const before = G.contract.stage, target = currentStage().at;
  p.x = target[0]; p.z = target[1];
  step(90);
  out.mission = !!G.contract && G.contract.stage > before;

  G.money = 4321; G.day = 3;
  saveGameToSlot(3);
  G.money = 1; G.day = 6;
  const loaded = loadGameFromSlot(3);
  out.saveLoad = loaded && G.money === 4321 && G.day === 3 && listSaveSlots().some((s) => s.slot === 3);
  localStorage.removeItem(SAVE_PREFIX + 3);
  return out;
}

async function runRuntimeChecks(config) {
  const chromium = await loadChromium();
  const server = await startStaticServer(join(repo, 'game'));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    // One browser at a time: the title boot and playthrough first, then each showcase scene.
    const first = await openGamePage(chromium, base, '?seed=7');
    try {
      await first.page.waitForFunction('window.__sceneReady === true', null, { timeout: 180000 });
      const r = await first.page.evaluate(playthroughInPage);
      record('boots to the title screen', r.titleMode === 'title', 'mode ' + r.titleMode);
      record('WebGL context and scene exist', r.webgl);
      record('new game starts with a populated city', r.newGame, r.newGameDetail);
      record('entering a car and accelerating gains speed', r.driving, r.speed + ' km/h');
      record('a crime raises the wanted level and units respond', r.wanted, r.units + ' units');
      record('reaching the objective advances the mission stage', r.mission);
      record('save and load round-trip restores the game', r.saveLoad);
      record('no console or page errors during play', first.problems.length === 0, first.problems.join(' | '));
    } finally {
      await first.browser.close();
    }
    for (const shot of config.shots) {
      const scene = await openGamePage(chromium, base, shot.query);
      try {
        await scene.page.waitForFunction('window.__sceneReady === true', null, { timeout: 180000 });
        const frozen = await scene.page.evaluate(() => W.frozen === true || G.mode === 'title');
        record('showcase scene ' + shot.query + ' is ready', frozen && scene.problems.length === 0, scene.problems.join(' | '));
      } finally {
        await scene.browser.close();
      }
    }
  } finally {
    server.close();
  }
}

async function main() {
  const config = await runStaticChecks();
  await runRuntimeChecks(config);
  const failed = results.filter((ok) => !ok).length;
  console.log(results.length - failed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => { console.error('FAIL  selftest crashed: ' + err.message); process.exit(1); });
