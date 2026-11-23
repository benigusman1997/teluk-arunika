// Tiny static server for playing TELUK ARUNIKA locally: `node serve.ts` then open http://localhost:8080
// Standard library only. It serves the game/ folder next to this file and nothing else.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot: string = join(dirname(fileURLToPath(import.meta.url)), 'game');
const port: number = Number(process.env.PORT) || 8080;

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

function resolveRequestPath(url: string): string | null {
  const clean = decodeURIComponent(url.split('?')[0].split('#')[0]);
  const relative = normalize(clean === '/' ? '/index.html' : clean);
  const full = join(gameRoot, relative);
  // Refuse anything that climbs out of game/.
  return full === gameRoot || full.startsWith(gameRoot + sep) ? full : null;
}

const server = createServer(async (request, response) => {
  const file = resolveRequestPath(request.url || '/');
  if (!file) {
    response.writeHead(403, { 'content-type': 'text/plain' });
    response.end('Forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log('TELUK ARUNIKA is running at http://localhost:' + port);
  console.log('Screenshot scenes: /?shot=1 ... /?shot=4   (Ctrl+C to stop)');
});
