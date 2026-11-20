// Teluk Arunika — entry builder for make.fun (bounty gta6-01).
// Copies game/ and screenshots/ into the output directory, then writes
// dossier.json with the kit's buildDossier helper. Run with Node 22+:
//   MAKEFUN_OUTPUT_DIR=/tmp/out-test4 node main.ts
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function copyTree(relName: string): void {
  const src = join(repoRoot, relName);
  const dst = join(outDir, relName);
  if (!existsSync(src)) throw new Error(`missing ${relName}/ in ${repoRoot}`);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
if (!existsSync(join(outDir, 'dossier.json'))) throw new Error('dossier.json was not written');
const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true }).length;
const shotFiles = readdirSync(join(outDir, 'screenshots')).length;
console.log(`Teluk Arunika built -> ${outDir} (${gameFiles} game entries, ${shotFiles} screenshots, dossier.json ${dossier.length} bytes)`);
