// Self-test: static checks on the repository, then runtime checks of the real game in headless Chromium.
// Prints PASS / FAIL per check and a total; exits 0 only when everything passes.
//
//   node tools/selftest.mjs
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { repo, serveGame, launchBrowser, openPage } from './shoot.mjs';

const JS = ['game-config', 'game-state', 'input-controls', 'render-scene', 'mesh-factory', 'city-builder', 'traffic-ai', 'pedestrian-ai',
  'player-onfoot', 'vehicle-driving', 'weapons-combat', 'police-wanted', 'police-airswat', 'story-missions', 'side-activities',
  'crew-abilities', 'career-progress', 'audio-radio', 'visual-effects', 'hud-panels', 'hud-minimap', 'menu-screens', 'showcase-scenes', 'game-main'];
const OTHER = ['main.ts', 'serve.ts', 'shots.json', 'README.md', 'LICENSE', 'game/index.html', 'game/style.css', 'game/vendor/three.min.js', 'vendor/makefun-game.ts', 'tools/shoot.mjs', 'tools/selftest.mjs'];
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : '')); };
const text = (p) => (existsSync(join(repo, p)) ? readFileSync(join(repo, p), 'utf8') : '');

// ---- static ------------------------------------------------------------------
const files = JS.map((n) => 'game/js/' + n + '.js').concat(OTHER);
const missing = files.filter((f) => !existsSync(join(repo, f)));
check('all v4 files exist (' + files.length + ')', missing.length === 0, missing.join(', '));

const html = text('game/index.html');
const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const want = ['vendor/three.min.js'].concat(JS.map((n) => 'js/' + n + '.js'));
check('index.html loads three.js then the 24 scripts in order', JSON.stringify(order) === JSON.stringify(want), order.length + ' script tags');

const own = JS.map((n) => 'game/js/' + n + '.js').concat(['game/index.html', 'game/style.css']);
const withUrl = own.filter((f) => /https?:/.test(text(f)));
check('no network address in the game source', withUrl.length === 0, withUrl.join(', '));

const lines = own.concat(['main.ts', 'serve.ts', 'tools/shoot.mjs', 'tools/selftest.mjs']).reduce((n, f) => n + text(f).split('\n').length - 1, 0);
check('own source size is in the planned range', lines >= 4000 && lines <= 6200, lines + ' lines');

const readme = text('README.md');
const badges = ['badge/gta6-01.svg', 'badge/gta6-01/benigusman1997/teluk-arunika/rank.svg', 'badge/gta6-01/benigusman1997/teluk-arunika/reward.svg'];
check('README has the three live make.fun badges', badges.every((b) => readme.includes('https://make.fun/' + b)) && !/shields\.io|\{\{|\}\}/.test(readme));

const spec = JSON.parse(text('shots.json') || '{"shots":[]}');
const shotInfo = spec.shots.map((s) => {
  const p = join(repo, 'screenshots', s.file);
  if (!existsSync(p)) return s.file + ' missing';
  const b = readFileSync(p), size = statSync(p).size;
  const sof = b.indexOf(Buffer.from([0xff, 0xc0])), w = sof > 0 ? b.readUInt16BE(sof + 7) : 0, h = sof > 0 ? b.readUInt16BE(sof + 5) : 0;
  return size <= 262144 && size > 40000 && w === 1280 && h === 720 ? '' : s.file + ' ' + size + ' bytes ' + w + 'x' + h;
}).filter(Boolean);
check('four 1280x720 JPEG screenshots within 262,144 bytes', spec.shots.length === 4 && shotInfo.length === 0, shotInfo.join(', '));

const mainTs = text('main.ts');
check('main.ts locates itself by import.meta.url and uses the kit caps', /import\.meta\.url/.test(mainTs) && /text_max_bytes: 163840/.test(mainTs) && /game_max_files: 993/.test(mainTs) && !/process\.cwd|rmSync|process\.exit/.test(mainTs));

// ---- runtime -------------------------------------------------------------------
const { server, base } = await serveGame();
const browser = await launchBrowser();
try {
  const errors = [];
  const page = await openPage(browser, base + '?test=1', errors);
  await page.waitForFunction('window.__booted === true', null, { timeout: 120000 });
  check('game boots with no console errors', errors.length === 0, errors.join(' | '));
  const run = async (name, body) => {
    let r;
    try { r = await page.evaluate(body); } catch (e) { r = { ok: false, detail: String(e.message).split('\n')[0] }; }
    check(name, !!r.ok && errors.length === 0, r.detail + (errors.length ? ' | ' + errors.join(' | ') : ''));
  };
  await run('WebGL context is live', () => {
    const gl = TA.renderer.getContext();
    return { ok: !!gl && !gl.isContextLost() && typeof THREE.REVISION === 'string', detail: 'three r' + THREE.REVISION + ', ' + TA.renderer.info.memory.geometries + ' geometries' };
  });
  await run('title screen, then a new game starts', () => {
    const title = TA.run.mode === 'title';
    TA.menuKey('Enter');
    TA.input.auto = { hit: {} };
    TA.simulate(30);
    return { ok: title && TA.run.mode === 'playing' && !!TA.player && TA.cars.length > 10 && TA.people.length > 10, detail: TA.cars.length + ' cars, ' + TA.people.length + ' people, $' + TA.state.money };
  });
  await run('player walks, enters a car and gains speed', () => {
    const p = TA.player, x0 = p.x, z0 = p.z;
    TA.input.auto.KeyW = true; TA.simulate(60);
    const walked = Math.hypot(p.x - x0, p.z - z0);
    const car = TA.spawnCar('gt', -120, 60, 0, 'parked');
    p.x = -122.5; p.z = 60; TA.enterCar(car, true);
    TA.simulate(240);
    const kmh = Math.abs(car.speed) * 3.6;
    return { ok: walked > 1 && p.car === car && kmh > 60, detail: 'walked ' + walked.toFixed(1) + ' m, then ' + kmh.toFixed(0) + ' km/h' };
  });
  await run('wanted level rises and TAPD units spawn', () => {
    TA.run.godMode = true;
    TA.crime(3, 'SELF TEST'); TA.simulate(420);
    const three = TA.run.wanted, units3 = TA.units.length;
    TA.crime(4, 'SELF TEST'); TA.simulate(420);
    return { ok: three >= 3 && units3 >= 2 && TA.run.wanted >= 4 && TA.heli.active && TA.dispatchRows().length >= 3, detail: units3 + ' units at 3 stars, ' + TA.units.length + ' at ' + TA.run.wanted + ' stars, air unit ' + (TA.heli.active ? 'up' : 'down') };
  });
  await run('contract starts and its stage advances', () => {
    TA.input.auto.KeyW = false; TA.setWanted(0); TA.exitCar(true); TA.simulate(5);
    TA.startMission(0, 0);
    const ms = TA.run.mission, before = ms.stage;
    TA.player.x = ms.car.x + 2.2; TA.player.z = ms.car.z; TA.enterCar(ms.car, false); TA.simulate(5);
    const o = TA.missionObjective();
    return { ok: before === 0 && TA.run.mission.stage === 1 && /STAGE 2\/3/.test(o.stage), detail: o.head + ' · ' + o.stage + ' · ' + o.title };
  });
  await run('shooting, crew ability and side job work', () => {
    TA.failMission('self test'); TA.exitCar(true); TA.state.crew.budi = true; TA.player.hp = 40;
    const fixed = TA.useAbility('budi') && TA.player.hp > 40;
    TA.giveWeapon(1, 60); TA.selectWeapon(1); const before = TA.state.ammo[1].mag;
    TA.input.auto.fire = true; TA.simulate(20); TA.input.auto.fire = false;
    TA.startWreckContract(); TA.simulate(30);
    const a = TA.run.activity;
    return { ok: fixed && TA.state.ammo[1].mag < before && !!a && a.type === 'wreck' && !a.car.dead, detail: 'fired ' + (before - TA.state.ammo[1].mag) + ' rounds, wreck target ' + (a ? a.def.name : 'none') };
  });
  await run('save and load round-trip', () => {
    TA.endActivity(); TA.setWanted(0);
    TA.state.money = 4321; TA.state.missionsDone = 3; TA.state.rp = 410; TA.saveGame(2);
    TA.state.money = 1; TA.state.missionsDone = 0;
    const loaded = TA.continueGame(2), s = TA.slotSummary(2);
    return { ok: loaded && TA.state.money === 4321 && TA.state.missionsDone === 3 && TA.rankInfo().n === 3 && TA.run.mode === 'playing', detail: s ? s.line : 'no slot' };
  });
  await run('map screen opens with every tab', () => {
    TA.openMap(0, false);
    const tabs = TA.TABS.map((t, i) => { TA.menuKey('Tab' + i); return TA.menu.screen.querySelectorAll('.panel').length; });
    TA.menuKey('Escape');
    return { ok: tabs.every((n) => n >= 1) && TA.run.mode === 'playing', detail: tabs.join('/') + ' panels' };
  });
  await page.close();
  for (const shot of spec.shots) {
    const errs = [], p2 = await openPage(browser, base + shot.query, errs);
    let info = null;
    try { await p2.waitForFunction('window.__sceneReady', null, { timeout: 120000 }); info = await p2.evaluate('window.__sceneReady'); } catch (e) { errs.push(e.message.split('\n')[0]); }
    check('showcase scene ready: ' + shot.file, !!info && errs.length === 0, info ? JSON.stringify(info) : errs.join(' | '));
    await p2.close();
  }
} finally {
  await browser.close();
  server.close();
}
const passed = results.filter(Boolean).length;
console.log('\nTOTAL ' + passed + ' / ' + results.length + ' passed');
process.exit(passed === results.length ? 0 : 1);
