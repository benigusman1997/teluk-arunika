// TELUK ARUNIKA: 7 Hari Utang — make.fun gta6-01 entry builder (Node 22, stdlib only).
// The entry is the game/ folder in this directory: static files a desktop browser
// loads offline (game/index.html + game.js + vendored Three.js, no network request).
// This script copies game/ and screenshots/ beside it into the output directory
// and writes the dossier.json the judge reads, using the vendored make.fun
// helper. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output, e.g.:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the result locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Total bytes of the copied game files, for the build summary line.
function dirBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(p) : statSync(p).size;
  }
  return total;
}

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's own gates: at most 4 screenshots, each at most
// 256 KiB; at most 993 files and 48 MiB under game/; no game path over 1000
// bytes. The dossier carries the rest of the entry metadata.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(
  'TELUK ARUNIKA build OK — ' +
  readdirSync(join(outDir, 'game')).length + ' game entries (' + dirBytes(join(outDir, 'game')) + ' bytes), ' +
  readdirSync(join(outDir, 'screenshots')).length + ' screenshots, dossier at ' +
  join(outDir, 'dossier.json'),
);
