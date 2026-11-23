// Static file server for game/ on port 8080 (Node standard library only):  node serve.ts
import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.env.PORT ?? 8080);
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = normalize(join(root, path === '/' ? 'index.html' : path));
  if (!file.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('TELUK ARUNIKA is running: open localhost:' + port + ' in a desktop browser'));
