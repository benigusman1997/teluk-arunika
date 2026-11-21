// TELUK ARUNIKA v3 — main.ts (builder entry make.fun gta6-01)
// Menyalin game/ + screenshots/ ke direktori output lalu menulis dossier.json
// dengan buildDossier dari vendor/makefun-game.ts (salinan kit, jangan diubah).
// Node 22, standard library saja. Di luar grader, MAKEFUN_OUTPUT_DIR
// menggantikan /output:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Sebelum menulis dossier, builder ini memvalidasi dua hal:
//   1. game/ + screenshots/ ada dan berisi file yang diharapkan, dan
//   2. tidak ada referensi jaringan di file game (offline total).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Daftar file yang wajib ada agar entry dianggap lengkap oleh builder.
const REQUIRED_GAME_FILES = [
  'index.html',
  'style.css',
  'core.js',
  'world.js',
  'player.js',
  'police.js',
  'missions.js',
  'crew.js',
  'career.js',
  'audio.js',
  'ui.js',
  'vendor/three.min.js',
];

for (const rel of REQUIRED_GAME_FILES) {
  if (!existsSync(join(here, 'game', rel))) {
    throw new Error('missing required game file: game/' + rel);
  }
}

// Validasi offline: tidak boleh ada URL jaringan di file teks game/ yang
// ditulis sendiri. File vendor (game/vendor/ + *.min.js) dikecualikan:
// pustaka yang di-vendor boleh mengandung string URL di dalam kodenya
// (gate hanya memeriksa import/export specifier, bukan string literal),
// dan file-file itu bukan kode yang ditulis untuk entry ini.
// (Data URI dan path relatif lokal diizinkan.)
function assertOffline(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'vendor') continue;
      assertOffline(p);
      continue;
    }
    if (name.endsWith('.min.js') || name.endsWith('.min.mjs') || name.endsWith('.min.css')) continue;
    if (!/\.(html|js|mjs|css|json)$/.test(name)) continue;
    const text = readFileSync(p, 'utf8');
    if (text.includes('http://') || text.includes('https://') || text.includes('//fonts.') || text.includes('//cdn.')) {
      throw new Error('network reference found in ' + p);
    }
  }
}
assertOffline(join(here, 'game'));

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('missing screenshots/ directory');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error('expected 3 or 4 screenshots, found ' + shots.length);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Batas gate (reference/gate.json): hanya text_max_bytes yang membentuk byte;
// sisanya menolak entry yang akan ditolak scorer (lebih dari 4 screenshot atau
// satu di atas 256 KiB; lebih dari 993 file di game/ atau 48 MiB total, atau
// path di bawah game/ di atas 1000 byte).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log('Teluk Arunika v3: dossier written to ' + join(out, 'dossier.json'));
