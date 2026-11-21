// Helper CDP (Chrome DevTools Protocol) untuk self-test & screenshot.
// Node 22+ stdlib saja: WebSocket global + child_process + http.
// Dipakai tools/selftest.mjs dan tools/shoot.mjs.
import { spawn, execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import http from 'node:http';

export const CHROME =
  process.env.TA_CHROME ||
  (process.env.HOME + '/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');

export function chromeExists() {
  try { accessSync(CHROME, constants.X_OK); return true; } catch { return false; }
}

function httpJson(method, port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export async function waitPort(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { await httpJson('GET', port, '/json/version'); return true; }
    catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  return false;
}

export async function launchChrome(port, userDataDir) {
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-frame-rate-limit',
    '--run-all-compositor-stages-before-draw',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,720',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: true });
  const ok = await waitPort(port);
  if (!ok) { killChrome(proc); throw new Error('chrome did not open CDP port ' + port); }
  return proc;
}

// Matikan Chrome beserta seluruh pohon prosesnya (SIGTERM lalu SIGKILL).
export function killChrome(proc) {
  if (!proc) return;
  try { process.kill(-proc.pid, 'SIGTERM'); } catch {}
  try { proc.kill('SIGTERM'); } catch {}
  setTimeout(() => {
    try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
    try { proc.kill('SIGKILL'); } catch {}
  }, 2500);
}

export async function newTab(port, url) {
  const target = await httpJson('PUT', port, '/json/new?about:blank');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (e) => reject(new Error('ws error: ' + (e.message || 'unknown')));
  });
  const session = new CDPSession(ws);
  session.onConsole = null;
  session.onException = null;
  session.onRequest = null;
  session.onResponse = null;
  // Pasang handler SEBELUM perintah pertama dikirim, kalau tidak respons hilang.
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id && session.pending.has(msg.id)) {
      const { resolve, reject } = session.pending.get(msg.id);
      session.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      if (session.onConsole) session.onConsole(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      const text = (d.exception && d.exception.description) || d.text || 'exception';
      if (session.onException) session.onException(text);
    }
    if (msg.method === 'Network.requestWillBeSent') {
      if (session.onRequest) session.onRequest(msg.params.request.url);
    }
    if (msg.method === 'Network.responseReceived') {
      if (session.onResponse) session.onResponse(msg.params.response.url, msg.params.response.status);
    }
    if (msg.method === 'Network.loadingFailed') {
      if (session.onResponse) session.onResponse(msg.params.errorText || 'loading failed', 0);
    }
    if (msg.method === 'Page.screencastFrame') {
      session._onScreencastFrame(msg.params);
    }
  };
  await session.send('Page.enable', {}, 120000);
  await session.send('Runtime.enable', {}, 120000);
  await session.send('Network.enable', {}, 120000);
  await session.send('Log.enable', {}, 120000);
  // Paksa viewport persis 1280x720 (tanpa ini headless bisa memberi 1280x577).
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  }, 120000);
  await session.send('Page.navigate', { url }, 120000);
  return session;
}

class CDPSession {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this._frameWaiters = [];
  }
  _onScreencastFrame(params) {
    this.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {});
    const w = this._frameWaiters.shift();
    if (w) w.resolve(Buffer.from(params.data, 'base64'));
  }
  waitScreencastFrame(timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('screencast frame timeout')), timeoutMs);
      this._frameWaiters.push({
        resolve: (buf) => { clearTimeout(timer); resolve(buf); },
      });
    });
  }
  send(method, params = {}, timeoutMs = 30000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }
      }, timeoutMs);
    });
  }
  async evaluate(expression, timeoutMs = 30000) {
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    }, timeoutMs);
    if (r.exceptionDetails) {
      throw new Error('evaluate failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result ? r.result.value : undefined;
  }
  async waitFor(expression, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (await this.evaluate(expression)) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }
  // Screenshot: jeda loop render dulu supaya antrean GPU SwiftShader
  // terkuras, pompa beberapa frame terakhir secara manual, tunggu sebentar,
  // lalu Page.captureScreenshot. Tanpa jeda ini capture bisa macet >120 dtk
  // karena frame baru terus mengantre di GPU software.
  async screenshot() {
    await this.evaluate('clearInterval(window.__taPump); TA.renderPaused = true; true').catch(() => {});
    await this.evaluate('for (let i = 0; i < 3; i++) TA.pumpFrame(0.016); true', 120000).catch(() => {});
    await sleep(5000); // biarkan GPU menyelesaikan frame terakhir
    let buf = null;
    try {
      const r = await this.send('Page.captureScreenshot', { format: 'png' }, 300000);
      buf = Buffer.from(r.data, 'base64');
    } finally {
      await this.evaluate('TA.renderPaused = false; true').catch(() => {});
    }
    return buf;
  }
  close() { try { this.ws.close(); } catch {} }
}

export function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { ...opts, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code ?? 1) : 0, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
