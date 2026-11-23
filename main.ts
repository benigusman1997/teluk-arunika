// main.ts — builds the entry: copies game/ and screenshots/ into the output directory and writes dossier.json.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || join(repo, 'out');

function copyTree(from: string, to: string, only?: RegExp): number {
  let count = 0;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name), dst = join(to, entry.name);
    if (entry.isDirectory()) count += copyTree(src, dst, only);
    else if (entry.isFile() && (!only || only.test(entry.name))) { writeFileSync(dst, readFileSync(src)); count++; }
  }
  return count;
}

if (!existsSync(join(repo, 'game', 'index.html'))) throw new Error('game/index.html is missing next to main.ts');
mkdirSync(out, { recursive: true });
const gameFiles = copyTree(join(repo, 'game'), join(out, 'game'));
const shots = copyTree(join(repo, 'screenshots'), join(out, 'screenshots'), /\.(jpe?g|png)$/i);
writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
}));
console.log('TELUK ARUNIKA built: ' + gameFiles + ' game files, ' + shots + ' screenshots -> ' + out);
