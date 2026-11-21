// Self-test Teluk Arunika v3 — tools/selftest.mjs
// Menjalankan semua pemeriksaan sampai lulus; keluar non-zero bila ada yang gagal.
//   node tools/selftest.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHROME, chromeExists, killChrome, launchChrome, newTab, run, sleep, waitPort } from './cdp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8901;
const CDP_PORT = 9333;

let passed = 0, failed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// Evaluate dengan timeout panjang + 1x retry: di SwiftShader headless, thread
// utama kadang sibuk render sehingga evaluate default 30 dtk kehabisan waktu.
// (Bukan retry untuk error logika — error JS tetap dilempar.)
async function ev(tab, expr, timeoutMs = 120000) {
  for (let a = 0; a < 2; a++) {
    try { return await tab.evaluate(expr, timeoutMs); }
    catch (e) { if (a === 1) throw e; await sleep(1000); }
  }
}

async function main() {
  console.log('== Teluk Arunika v3 self-test ==');
  console.log('root: ' + ROOT);

  // ---- 1. File wajib ada ----
  console.log('-- file & parse --');
  const gameFiles = ['index.html', 'style.css', 'core.js', 'world.js', 'player.js',
    'police.js', 'missions.js', 'crew.js', 'career.js', 'audio.js', 'ui.js'];
  for (const f of gameFiles) check('file ada: game/' + f, existsSync(join(ROOT, 'game', f)));
  check('file ada: game/vendor/three.min.js', existsSync(join(ROOT, 'game', 'vendor', 'three.min.js')));
  check('file ada: main.ts', existsSync(join(ROOT, 'main.ts')));
  check('file ada: serve.ts', existsSync(join(ROOT, 'serve.ts')));
  check('file ada: shots.json', existsSync(join(ROOT, 'shots.json')));
  check('file ada: README.md', existsSync(join(ROOT, 'README.md')));
  check('file ada: LICENSE (tidak diubah)', existsSync(join(ROOT, 'LICENSE')));
  check('file ada: vendor/makefun-game.ts', existsSync(join(ROOT, 'vendor', 'makefun-game.ts')));
  check('file ada: .makefun/owner.json', existsSync(join(ROOT, '.makefun', 'owner.json')));

  // ---- 2. Parse JS (node --check) ----
  for (const f of gameFiles.filter((x) => x.endsWith('.js'))) {
    const r = await run(process.execPath, ['--check', join(ROOT, 'game', f)]);
    check('parse: game/' + f, r.code === 0, r.stderr.trim().slice(0, 200));
  }

  // ---- 3. Offline: tanpa URL jaringan di game/ (kecuali file vendor) ----
  let netRefs = [];
  function scanOffline(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === 'vendor') continue;
        scanOffline(p);
        continue;
      }
      if (name.endsWith('.min.js') || name.endsWith('.min.mjs') || name.endsWith('.min.css')) continue;
      if (!/\.(html|js|mjs|css|json)$/.test(name)) continue;
      const text = readFileSync(p, 'utf8');
      if (text.includes('http://') || text.includes('https://')) netRefs.push(p.replace(ROOT + '/', ''));
    }
  }
  scanOffline(join(ROOT, 'game'));
  check('offline: tanpa http(s):// di game/', netRefs.length === 0, netRefs.join(', '));

  // ---- 4. shots.json valid ----
  let shots = [];
  try {
    shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'));
    check('shots.json: 4 shot', Array.isArray(shots) && shots.length === 4, 'len=' + shots.length);
    check('shots.json: nama + query + caption + focus + timeOfDay',
      shots.every((s) => s.name && s.query && s.caption && s.focus && s.timeOfDay));
    check('shots.json: nama file unik & .jpg', new Set(shots.map((s) => s.name)).size === 4 &&
      shots.every((s) => s.name.endsWith('.jpg')));
  } catch (e) {
    check('shots.json valid', false, e.message);
  }

  // ---- 5. main.ts deterministik (dua run -> dossier byte-identik) ----
  console.log('-- main.ts --');
  const outA = join(ROOT, '.selftest-out-a');
  const outB = join(ROOT, '.selftest-out-b');
  rmSync(outA, { recursive: true, force: true });
  rmSync(outB, { recursive: true, force: true });
  mkdirSync(outA, { recursive: true });
  mkdirSync(outB, { recursive: true });
  const runA = await run(process.execPath, ['main.ts'], { cwd: ROOT, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outA } });
  check('main.ts run 1 exit 0', runA.code === 0, runA.stderr.trim().slice(0, 300));
  const runB = await run(process.execPath, ['main.ts'], { cwd: ROOT, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outB } });
  check('main.ts run 2 exit 0', runB.code === 0, runB.stderr.trim().slice(0, 300));
  if (runA.code === 0 && runB.code === 0) {
    const dA = join(outA, 'dossier.json'), dB = join(outB, 'dossier.json');
    check('dossier.json ada', existsSync(dA) && existsSync(dB));
    if (existsSync(dA) && existsSync(dB)) {
      check('dossier byte-identik antar run', sha256(dA) === sha256(dB));
      const dj = JSON.parse(readFileSync(dA, 'utf8'));
      // buildDossier menghasilkan {cover, images:[{base64}]} — bukan daftar file.
      check('dossier: 4 gambar (cover + 4 shot)', Array.isArray(dj.images) && dj.images.length === 4, 'images=' + (dj.images?.length ?? 0));
      check('dossier: game/index.html disalin', existsSync(join(outA, 'game', 'index.html')));
      check('dossier: 9 file JS disalin', ['core.js','world.js','player.js','police.js','missions.js','crew.js','career.js','audio.js','ui.js'].every((f) => existsSync(join(outA, 'game', f))));
    }
  }
  rmSync(outA, { recursive: true, force: true });
  rmSync(outB, { recursive: true, force: true });

  // ---- 6. Headless Chromium: muat game, tanpa console error ----
  console.log('-- headless chromium --');
  if (!chromeExists()) {
    check('chrome tersedia di ' + CHROME, false);
  } else {
    const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
    let chrome = null;
    try {
      const up = await waitPort(PORT, 10000);
      check('serve.ts jalan di :' + PORT, up);
      if (up) {
        chrome = await launchChrome(CDP_PORT, '/tmp/ta-selftest-chrome-' + Date.now());
        const errors = [];
        const badRequests = [];
        const externalReqs = [];

        async function loadPage(url) {
          errors.length = 0; badRequests.length = 0; externalReqs.length = 0;
          const tab = await newTab(CDP_PORT, url);
          tab.onConsole = (t) => errors.push(t);
          tab.onException = (t) => errors.push(t);
          tab.onRequest = (u) => { if (!u.startsWith('http://127.0.0.1:' + PORT) && !u.startsWith('data:')) externalReqs.push(u); };
          tab.onResponse = (u, st) => { if (st >= 400) badRequests.push(u + ' -> ' + st); };
          const ready = await tab.waitFor('window.__TA_READY__ === true', 120000);
          if (ready) {
            // Pompa frame manual, dipecah 10 frame per evaluate: headless
            // men-throttle requestAnimationFrame dan satu frame SwiftShader lambat.
            for (let i = 0; i < 3; i++) {
              await ev(tab, 'for (let j = 0; j < 10; j++) TA.pumpFrame(0.016); true', 120000);
            }
          }
          return { tab, ready };
        }

        // Halaman utama (menu).
        let r = await loadPage('http://127.0.0.1:' + PORT + '/index.html?seed=1');
        check('game muat: __TA_READY__', r.ready);
        if (r.ready) {
          check('THREE terdefinisi', await ev(r.tab, 'typeof THREE !== "undefined"'));
          check('TA namespace ada', await ev(r.tab, 'typeof TA !== "undefined" && TA.version === "3.0.0"'));
          check('10 misi terdefinisi', await ev(r.tab, 'TA.missions.MISSIONS.length === 10'));
          check('3 kru terdefinisi', await ev(r.tab, 'TA.crew.CREW.length === 3'));
          check('5 tingkat karier terdefinisi', await ev(r.tab, 'TA.career.RANKS.length === 5'));
          check('4 senjata terdefinisi', await ev(r.tab, 'TA.player.WEAPONS.length === 4'));
          check('gedung 60+ dibangun', await ev(r.tab, 'TA.world.buildingCount >= 60'), await ev(r.tab, 'String(TA.world.buildingCount)'));
          check('traffic 16 spawn', await ev(r.tab, 'TA.traffic.length === 16'));
          check('pejalan kaki 26 spawn', await ev(r.tab, 'TA.peds.length === 26'));
          check('renderer WebGL aktif', await ev(r.tab, '!!TA.renderer && !!TA.renderer.getContext()'));
          check('tanpa TA.lastError', await ev(r.tab, '!TA.lastError'), await ev(r.tab, 'String(TA.lastError)'));
          // Gameplay: start new game + majukan dialog intro (3 baris) + save/load.
          check('startNewGame jalan', await ev(r.tab, 'TA.startNewGame(); TA.missions.advanceDialogue(); TA.missions.advanceDialogue(); TA.missions.advanceDialogue(); TA.state.mode === "playing" && TA.state.missionActive === true'));
          check('misi 1 aktif setelah start', await ev(r.tab, 'TA.missions.current().id === 1'));
          check('save/load roundtrip', await ev(r.tab, 'TA.saveGame("1"); TA.state.money = 99999; TA.loadGame("1"); TA.state.mode = "playing"; TA.ui.hideDialogue(); TA.state.money === 250'));
          check('addXP + rank-up ke Sopir Andal', await ev(r.tab, 'TA.state.xp = 0; TA.career.addXP(150); TA.career.getRank().name === "Sopir Andal"'));
          check('rekrut Sari (butuh rank 2 + $300)', await ev(r.tab, 'TA.state.money = 1000; TA.crew.recruitCrewMember("sari") === true && TA.state.crew.sari === true'));
          check('bonus kru Sari: speedMul 1.15', await ev(r.tab, 'TA.crew.getCrewBonus().speedMul === 1.15'));
          check('Gaspol aktif saat di mobil', await ev(r.tab, 'TA.state.inCar = true; TA.car = TA.world.makeCar(0xc0392b, 0, 0, 0); TA.crew.activateCrewAbility(); TA.state.abilityCd > 40'));
          check('wanted 5 -> ELANG-1 spawn', await ev(r.tab, 'TA.police.setWanted(5); !!TA.police.heli'));
          check('roadblock spawn di wanted 3+', await ev(r.tab, 'TA.police.roadblocks.length >= 1'));
          check('tanpa console error (menu+game)', errors.length === 0, errors.slice(0, 3).join(' | '));
          check('tanpa request eksternal', externalReqs.length === 0, externalReqs.slice(0, 3).join(', '));
          check('tanpa HTTP error', badRequests.length === 0, badRequests.slice(0, 3).join(', '));
          r.tab.close();
        } else {
          check('game muat: __TA_READY__', false, 'timeout');
        }

        // Keempat shot: muat + siap + tanpa error.
        for (const s of shots) {
          const rr = await loadPage('http://127.0.0.1:' + PORT + '/index.html' + s.query);
          check('shot muat: ' + s.name, rr.ready);
          if (rr.ready) {
            const shotOk = await ev(rr.tab, 'window.__TA_SHOT_READY__ === true');
            check('shot siap render: ' + s.name, shotOk);
            check('shot tanpa console error: ' + s.name, errors.length === 0, errors.slice(0, 2).join(' | '));
            if (s.name.startsWith('shot3')) {
              check('shot3: start screen tersembunyi', await ev(rr.tab, 'document.getElementById("start-screen").classList.contains("hidden")'));
              check('shot3: weapon wheel terlihat', await ev(rr.tab, 'document.getElementById("wheel").style.display !== "none"'));
              check('shot3: dialog terlihat', await ev(rr.tab, 'document.getElementById("dialogue").style.display !== "none"'));
              check('shot3: misi 10 aktif', await ev(rr.tab, 'TA.missions.current().id === 10'));
              check('shot3: musuh 10 spawn (gelombang 1 + 6)', await ev(rr.tab, 'TA.enemies.length === 10'));
            }
            if (s.name.startsWith('shot4')) {
              check('shot4: pause terlihat', await ev(rr.tab, '!document.getElementById("pause-screen").classList.contains("hidden")'));
              check('shot4: panel karier terisi', await ev(rr.tab, 'document.getElementById("career-panel").innerHTML.length > 100'));
              check('shot4: panel kru terisi (kolom pause)', await ev(rr.tab, 'document.querySelectorAll(".crew-panel-list")[1].innerHTML.length > 100'));
              check('shot4: panel kru popup terisi', await ev(rr.tab, 'document.querySelectorAll(".crew-panel-list")[0].innerHTML.length > 100'));
              check('shot4: jam 02:14', await ev(rr.tab, 'TA.fmtClock(TA.state.timeMinutes) === "02:14"'));
            }
            if (s.name.startsWith('shot1')) {
              check('shot1: wanted 2', await ev(rr.tab, 'TA.state.wanted === 2'));
              check('shot1: Sari direkrut', await ev(rr.tab, 'TA.state.crew.sari === true'));
              check('shot1: XP 120', await ev(rr.tab, 'TA.state.xp === 120'));
            }
            if (s.name.startsWith('shot2')) {
              check('shot2: wanted 4', await ev(rr.tab, 'TA.state.wanted === 4'));
              check('shot2: ELANG-1 ada', await ev(rr.tab, '!!TA.police.heli'));
              check('shot2: roadblock ada', await ev(rr.tab, 'TA.police.roadblocks.length >= 1'));
              check('shot2: spike strip ada', await ev(rr.tab, 'TA.police.spikes.length >= 1'));
            }
          }
          rr.tab.close();
        }
      }
    } finally {
      killChrome(chrome);
      try { server.kill(); } catch {}
    }
  }

  // ---- 7. Screenshot sudah ada & valid (bila sudah diambil) ----
  console.log('-- screenshots --');
  for (const s of shots) {
    const p = join(ROOT, 'screenshots', s.name);
    if (!existsSync(p)) { check('screenshot ada: ' + s.name, false, 'belum diambil — jalankan tools/shoot.mjs'); continue; }
    const st = statSync(p);
    check('screenshot <=256KiB: ' + s.name, st.size <= 262144, st.size + ' bytes');
    const probe = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p]);
    const dims = probe.stdout.trim();
    check('screenshot 1280x720: ' + s.name, dims === '1280,720', dims);
  }

  console.log('\n== HASIL: ' + passed + ' lulus, ' + failed + ' gagal ==');
  if (failures.length) console.log('Gagal:\n- ' + failures.join('\n- '));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('selftest crash:', e); process.exit(1); });
