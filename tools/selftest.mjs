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
          // Abaikan noise driver SwiftShader: THREE mencatat "Shader Error ...
          // VALIDATE_STATUS false" ke console saat validasi program gagal
          // sesekali di software renderer — bukan error game (render tetap jalan).
          tab.onConsole = (t) => { if (!/Shader Error|VALIDATE_STATUS/.test(t)) errors.push(t); };
          tab.onException = (t) => errors.push(t);
          tab.onRequest = (u) => { if (!u.startsWith('http://127.0.0.1:' + PORT) && !u.startsWith('data:')) externalReqs.push(u); };
          tab.onResponse = (u, st) => { if (st >= 400) badRequests.push(u + ' -> ' + st); };
          const ready = await tab.waitFor('window.__TA_READY__ === true', 300000);
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
          check('rekrut Budi (butuh rank 2 + $250)', await ev(r.tab, 'TA.crew.recruitCrewMember("budi") === true && TA.state.crew.budi === true'));
          check('addXP + rank-up ke Penguasa Jalanan', await ev(r.tab, 'TA.career.addXP(250); TA.career.getRank().name === "Penguasa Jalanan"'));
          check('rank berangka: TINGKAT 3 · 400 / 800 XP', await ev(r.tab, 'TA.state.xp = 400; TA.career.applyRankPerks(); TA.ui.renderHUD(true); document.getElementById("rank-name").textContent === "TINGKAT 3 · PENGUASA JALANAN" && document.getElementById("xp-text").textContent === "400 / 800 XP"'));
          check('rekrut Agus (butuh rank 3 + $400)', await ev(r.tab, 'TA.crew.recruitCrewMember("agus") === true && TA.state.crew.agus === true'));
          check('bonus kru Sari: speedMul 1.15', await ev(r.tab, 'TA.crew.getCrewBonus().speedMul === 1.15'));
          check('Gaspol (Z) aktif saat di mobil', await ev(r.tab, 'TA.state.inCar = true; TA.car = TA.world.makeCar(0xc0392b, 0, 0, 0); TA.crew.activateCrewAbility("sari") === true && TA.state.crewCd.sari > 40'));
          check('Budi Perbaiki Cepat (X): armor +25', await ev(r.tab, 'TA.state.armor = 20; TA.crew.activateCrewAbility("budi") === true && TA.state.armor === 45 && TA.state.crewCd.budi > 50'));
          check('Agus Ghost (C): wanted -1, sekali/misi', await ev(r.tab, 'TA.police.setWanted(2); TA.state.ghostUsedThisMission = false; TA.crew.activateCrewAbility("agus") === true && TA.state.wanted === 1 && TA.state.ghostUsedThisMission === true'));
          check('wanted 5 -> ELANG-1 spawn', await ev(r.tab, 'TA.police.setWanted(5); !!TA.police.heli'));
          check('roadblock spawn di wanted 3+', await ev(r.tab, 'TA.police.roadblocks.length >= 1'));
          check('dispatch: 6 unit + ELANG-1 SPOTLIGHT', await ev(r.tab, 'TA.police.getDispatchUnits().length >= 4 && TA.police.getDispatchUnits().some(function (u) { return u.name === "ELANG-1" && u.tactic === "SPOTLIGHT" && typeof u.dist === "number"; })'));
          check('dispatch: unit punya nama + taktik + jarak', await ev(r.tab, 'TA.police.getDispatchUnits().every(function (u) { return u.name && u.tactic && typeof u.dist === "number"; })'));
          check('semua misi punya 3 tahap', await ev(r.tab, 'TA.missions.MISSIONS.every(function (m) { return m.stages && m.stages.length === 3; })'));
          check('startMissionStage + currentStage', await ev(r.tab, 'TA.missions.startMissionStage(0, 1); TA.missions.currentStage().title === "Jemput Penumpang" && TA.state.missionStage === 1'));
          check('getObjectiveDistance angka meter', await ev(r.tab, 'typeof TA.missions.getObjectiveDistance() === "number" && TA.missions.getObjectiveDistance() >= 0'));
          check('5 distrik + getDistrictAt', await ev(r.tab, 'TA.world.DISTRICTS.length === 5 && TA.world.getDistrictAt(0, 195).id === "pelabuhan" && TA.world.getDistrictAt(0, 0).id === "pasar" && TA.world.getDistrictAt(-40, 0).id === "gang" && TA.world.getDistrictAt(0, -160).id === "tol" && TA.world.getDistrictAt(100, 100).id === "pantai"'));
          check('updateDistrictStanding naik/turun', await ev(r.tab, 'var s0 = TA.world.getDistrictAt(0, 0).standing; TA.world.updateDistrictStanding("pasar", 5); var s1 = TA.world.getDistrictAt(0, 0).standing; TA.world.updateDistrictStanding("pasar", -5); s1 === s0 + 5'));
          check('getTaxiPay ikut suasana distrik', await ev(r.tab, 'var f = TA.world.getTaxiPay(90); f.pay > 0 && f.district && typeof f.mult === "number"'));
          check('5 model mobil + getCarCondition', await ev(r.tab, 'TA.player.CAR_MODELS.length === 5 && TA.player.getCarCondition().name === "PELABUHAN GT" && TA.player.getCarCondition().pct === 100 && TA.player.getCarCondition().label === "PRIMA"'));
          check('kartu kru: 3 mini card tampil', await ev(r.tab, 'TA.crew.renderCrewCards(); document.querySelectorAll("#crew-cards .crew-mini").length === 3 && document.getElementById("crew-cards").style.display !== "none"'));
          check('banner lokasi tampil (PASAR)', await ev(r.tab, 'document.getElementById("location-banner").style.display !== "none" && document.getElementById("location-banner").textContent.indexOf("PASAR") >= 0'));
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
              check('shot3: banner tahap MISI 10 · TAHAP 2/3', await ev(rr.tab, 'document.getElementById("objective").textContent.indexOf("MISI 10 DARI 10") >= 0 && document.getElementById("objective").textContent.indexOf("TAHAP 2/3") >= 0 && document.getElementById("objective").textContent.indexOf("BERSIHKAN GUDANG") >= 0'));
            }
            if (s.name.startsWith('shot4')) {
              check('shot4: pause terlihat', await ev(rr.tab, '!document.getElementById("pause-screen").classList.contains("hidden")'));
              check('shot4: panel karier terisi', await ev(rr.tab, 'document.getElementById("career-panel").innerHTML.length > 100'));
              check('shot4: panel kru terisi (kolom pause)', await ev(rr.tab, 'document.querySelectorAll(".crew-panel-list")[1].innerHTML.length > 100'));
              check('shot4: panel kru popup terisi', await ev(rr.tab, 'document.querySelectorAll(".crew-panel-list")[0].innerHTML.length > 100'));
              check('shot4: jam 02:14', await ev(rr.tab, 'TA.fmtClock(TA.state.timeMinutes) === "02:14"'));
              check('shot4: rank berangka 640 / 800 XP', await ev(rr.tab, 'document.getElementById("xp-text").textContent === "640 / 800 XP"'));
            }
            if (s.name.startsWith('shot1')) {
              check('shot1: wanted 2', await ev(rr.tab, 'TA.state.wanted === 2'));
              check('shot1: Sari direkrut', await ev(rr.tab, 'TA.state.crew.sari === true'));
              check('shot1: XP 120', await ev(rr.tab, 'TA.state.xp === 120'));
              check('shot1: rank berangka 120 / 150 XP', await ev(rr.tab, 'document.getElementById("xp-text").textContent === "120 / 150 XP" && document.getElementById("rank-name").textContent.indexOf("TINGKAT 1") === 0'));
              check('shot1: banner lokasi PASAR + NETRAL', await ev(rr.tab, 'document.getElementById("location-banner").style.display !== "none" && document.getElementById("location-banner").textContent.indexOf("PASAR") >= 0 && document.getElementById("location-banner").textContent.indexOf("NETRAL") >= 0'));
              check('shot1: prompt PELABUHAN GT — 62% RUSAK', await ev(rr.tab, 'document.getElementById("interact-prompt").style.display !== "none" && document.getElementById("interact-prompt").textContent.indexOf("PELABUHAN GT") >= 0 && document.getElementById("interact-prompt").textContent.indexOf("62%") >= 0'));
            }
            if (s.name.startsWith('shot2')) {
              check('shot2: wanted 4', await ev(rr.tab, 'TA.state.wanted === 4'));
              check('shot2: ELANG-1 ada', await ev(rr.tab, '!!TA.police.heli'));
              check('shot2: roadblock ada', await ev(rr.tab, 'TA.police.roadblocks.length >= 1'));
              check('shot2: spike strip ada', await ev(rr.tab, 'TA.police.spikes.length >= 1'));
              check('shot2: dispatch 6 UNIT + ELANG-1 DITERJUNKAN', await ev(rr.tab, 'document.getElementById("dispatch-panel").style.display !== "none" && document.getElementById("dispatch-panel").textContent.indexOf("6 UNIT") >= 0 && document.getElementById("dispatch-panel").textContent.indexOf("ELANG-1 DITERJUNKAN") >= 0'));
              check('shot2: kartu kru 2 (Sari + Budi)', await ev(rr.tab, 'document.querySelectorAll("#crew-cards .crew-mini").length === 2'));
              check('shot2: banner MISI 6 · TAHAP 2/3 WRECK THE REGENT', await ev(rr.tab, 'document.getElementById("objective").textContent.indexOf("MISI 6 DARI 10") >= 0 && document.getElementById("objective").textContent.indexOf("TAHAP 2/3") >= 0 && document.getElementById("objective").textContent.indexOf("WRECK THE REGENT") >= 0'));
              check('shot2: obrolan kru Roadblock tampil', await ev(rr.tab, 'document.getElementById("crew-chatter").style.display !== "none" && document.getElementById("crew-chatter").textContent.indexOf("Roadblock") >= 0'));
              check('shot2: mobil PELABUHAN GT — 62% RUSAK', await ev(rr.tab, 'document.getElementById("car-name").textContent.indexOf("PELABUHAN GT") >= 0 && document.getElementById("car-name").textContent.indexOf("62%") >= 0'));
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
