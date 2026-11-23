// TELUK ARUNIKA: Seven Days of Debt — make.fun gta6-01 entry program (Node 22, standard library only).
//
// The game is the static site in game/ beside this file. This program hands it in: it copies game/
// and screenshots/ into the output directory and writes dossier.json with the vendored make.fun
// library. It never looks at the working directory, never touches anything outside the output
// directory, and never removes or recreates the output directory itself.
//
//   node main.ts                              writes to /output
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts  writes to /tmp/out
//   node serve.ts                             plays the game on port 8080

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Read-then-write copy of one directory tree. The source may be read-only; every file is written
// fresh, in sorted order, so two runs produce the same bytes. A missing source is simply skipped.
function copyTree(from: string, to: string): number {
  let count = 0;
  let entries;
  try {
    entries = readdirSync(from, { withFileTypes: true });
  } catch {
    return 0;
  }
  mkdirSync(to, { recursive: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(src, dst);
    } else if (entry.isFile()) {
      // One unreadable file must not stop the hand-in; skip it and carry on.
      try {
        writeFileSync(dst, readFileSync(src));
        count += 1;
      } catch {
        continue;
      }
    }
  }
  return count;
}

mkdirSync(out, { recursive: true });
const gameFiles = copyTree(join(here, 'game'), join(out, 'game'));
mkdirSync(join(out, 'screenshots'), { recursive: true });
const shotFiles = copyTree(join(here, 'screenshots'), join(out, 'screenshots'));

// The scorer's own caps, exactly as in the kit's starter.
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

console.log('teluk-arunika: ' + gameFiles + ' game files, ' + shotFiles + ' screenshots, dossier.json -> ' + out);
