// serve.ts — Teluk Arunika v3.8. Server statis dev (Node 22 stdlib, port 8080).
// Sajikan game/ di root; buka http://localhost:8080/ untuk main.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const GAME = join(ROOT, 'game');
const PORT = Number(process.env.PORT || 8080);

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = url.replace(/^\/+/, '');
  if (rel === '' || rel === 'index.html') rel = 'index.html';
  let file = join(GAME, rel);
  if (!existsSync(file) || !statSync(file).isFile()) {
    const alt = join(ROOT, rel);
    if (existsSync(alt) && statSync(alt).isFile()) file = alt;
    else { res.writeHead(404); res.end('not found'); return; }
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('serve.ts: http://127.0.0.1:' + PORT + '/');
});
