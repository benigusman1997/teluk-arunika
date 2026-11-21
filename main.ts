// main.ts — Teluk Arunika v3.8. Builder: salin game/ + screenshots/ ke output,
// validasi file ada + offline (tanpa http/https eksternal), tulis dossier.json
// via buildDossier dari vendor/makefun-game.ts (kit, jangan diubah).
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = process.env.MAKEFUN_OUTPUT_DIR || join(ROOT, 'out');

function fail(msg: string): never {
  console.error('main.ts: ' + msg);
  process.exit(1);
}

function walk(dir: string, out: string[]): void {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
}

const gameDir = join(ROOT, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html tidak ada');

// Validasi offline: tidak ada referensi http(s) di source top-level game/.
// File vendored (di bawah vendor/ atau *.min.js) dikecualikan — pustaka boleh
// menyebut URL di komentar/string, yang dilarang adalah game memuatnya.
const sources: string[] = [];
walk(gameDir, sources);
for (const f of sources) {
  if (!/\.(html|js|css)$/i.test(f)) continue;
  const rel = f.slice(gameDir.length + 1);
  if (rel.split('/').includes('vendor') || /\.min\.(js|mjs|css)$/i.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  if (/https?:\/\//i.test(text)) fail('referensi eksternal di ' + f);
}

const shotsDir = join(ROOT, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ tidak ada');
const shots = readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3 || shots.length > 4) fail('screenshots harus 3-4 gambar, ada ' + shots.length);
for (const f of shots) {
  const st = statSync(join(shotsDir, f));
  if (st.size > 262144) fail('screenshot ' + f + ' melebihi 256 KiB (' + st.size + ')');
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(gameDir, join(OUT, 'game'), { recursive: true });
cpSync(shotsDir, join(OUT, 'screenshots'), { recursive: true });

const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(OUT, 'dossier.json'), dossier);
console.log('main.ts: OK — dossier ' + dossier.length + ' bytes -> ' + OUT);
