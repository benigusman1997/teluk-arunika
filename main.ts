// TELUK ARUNIKA: Seven Days of Debt — entry program for the make.fun bounty gta6-01.
// Copies the static game (game/) and its screenshots (screenshots/) into the output
// directory and writes dossier.json there. Node 22, standard library only.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository is wherever this file lives, never the current working directory.
const repositoryDir: string = fileURLToPath(new URL('.', import.meta.url));
const outputDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Lists a directory in a fixed (sorted) order; a missing directory is simply empty.
// Hidden entries (editor or OS droppings such as .DS_Store) are never part of the game.
function listDirectorySorted(dir: string): { name: string; isDir: boolean }[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => ({ name: entry.name, isDir: entry.isDirectory() }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch {
    return [];
  }
}

// Small recursive read-then-write copy: no modes, no timestamps, existing directories are fine.
function copyTreeByReadThenWrite(fromDir: string, toDir: string): number {
  mkdirSync(toDir, { recursive: true });
  let copiedFiles = 0;
  for (const entry of listDirectorySorted(fromDir)) {
    const from = join(fromDir, entry.name);
    const to = join(toDir, entry.name);
    if (entry.isDir) {
      copiedFiles += copyTreeByReadThenWrite(from, to);
    } else {
      writeFileSync(to, readFileSync(from));
      copiedFiles += 1;
    }
  }
  return copiedFiles;
}

function writeEntryOutput(): void {
  mkdirSync(outputDir, { recursive: true });
  copyTreeByReadThenWrite(join(repositoryDir, 'game'), join(outputDir, 'game'));
  copyTreeByReadThenWrite(join(repositoryDir, 'screenshots'), join(outputDir, 'screenshots'));
  // Exactly the caps of the kit's starter (the scorer's own gate values).
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

writeEntryOutput();
