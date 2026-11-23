// Teluk Arunika — make.fun gta6-01 entry builder.
// Copies game/ and screenshots/ beside this file into MAKEFUN_OUTPUT_DIR
// (default /output) and writes dossier.json there with the vendored library.
// The grader runs "node /bot/main.ts" twice on a read-only repo with an
// empty pre-created output directory, no network, Node 22 type-stripping.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Find the repository from this file's own location, never the cwd.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy one tree into another with plain read-then-write calls, in sorted
// name order. Never deletes or recreates anything; creating a directory
// that already exists is fine; names starting with a dot are skipped.
function copyTree(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  const names = readdirSync(srcDir).sort();
  for (const name of names) {
    if (name.startsWith('.')) {
      continue;
    }
    const srcPath = join(srcDir, name);
    const dstPath = join(dstDir, name);
    const info = statSync(srcPath);
    if (info.isDirectory()) {
      copyTree(srcPath, dstPath);
    } else if (info.isFile()) {
      writeFileSync(dstPath, readFileSync(srcPath));
    }
  }
}

// Copy the game first, then the screenshots when they exist.
function copyGameAndScreenshots() {
  const gameSrc = join(here, 'game');
  if (existsSync(gameSrc)) {
    copyTree(gameSrc, join(out, 'game'));
  }
  const shotsSrc = join(here, 'screenshots');
  if (existsSync(shotsSrc)) {
    copyTree(shotsSrc, join(out, 'screenshots'));
  }
}

// Build the dossier the judge reads, with the kit starter's caps.
function writeDossier() {
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
}

// The output directory is created if missing and never removed.
function main() {
  mkdirSync(out, { recursive: true });
  copyGameAndScreenshots();
  writeDossier();
  const dossierText = readFileSync(join(out, 'dossier.json'), 'utf8');
  console.log('Teluk Arunika built: dossier ' + dossierText.length + ' bytes in ' + out);
}

main();
