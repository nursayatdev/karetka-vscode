'use strict';
/* Каретка — local runner. Serves the app and runs the code typed on the paper (Python / Node) on THIS computer.
   Safety: listens on 127.0.0.1 only, checks the Host header (DNS-rebinding), and every API call needs a random
   per-launch token that is injected only into the page this server itself serves. */
const http = require('http'), fs = require('fs'), path = require('path'), cp = require('child_process'),
      crypto = require('crypto'), os = require('os'), workspace = require('./workspace.js');

const ROOT = __dirname;
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = parseInt(opt('--port', process.env.KARETKA_PORT || '47831'), 10);
const NO_EXIT = argv.includes('--no-exit');
const TOKEN = crypto.randomBytes(18).toString('hex');
const RUNS = path.join(os.tmpdir(), 'karetka-runs');
const RUN_TIMEOUT = 120000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8' };

fs.mkdirSync(RUNS, { recursive: true });
try { for (const d of fs.readdirSync(RUNS)) { const p = path.join(RUNS, d); if (Date.now() - fs.statSync(p).mtimeMs > 6 * 3600e3) fs.rmSync(p, { recursive: true, force: true }); } } catch (e) {}

/* ---------- helpers ---------- */
const plain = (res, code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(msg); };
const json = (res, obj, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function probe(cmd, args) {
  try { const r = cp.spawnSync(cmd, args, { encoding: 'utf8', timeout: 8000, windowsHide: true }); if (r.status === 0) return (r.stdout || r.stderr || '').trim(); } catch (e) {}
  return null;
}
let ENV = null;
function getEnv() {
  if (ENV) return ENV;
  const out = { py: null, pyCmd: null, ffmpeg: false, node: process.version };
  for (const [cmd, pre] of [['python', []], ['py', ['-3']], ['python3', []]]) {
    const v = probe(cmd, [...pre, '--version']);
    if (v && /^Python 3/.test(v)) { out.py = v; out.pyCmd = { cmd, pre }; break; }
  }
  out.ffmpeg = !!probe('ffmpeg', ['-version']);
  ENV = out; return out;
}
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try { if (process.platform === 'win32') cp.spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }); else child.kill('SIGKILL'); } catch (e) {}
}

/* ---------- running a process and streaming its output as NDJSON ---------- */
let current = null;
function streamProcess(res, { cmd, args, cwd, id, listFiles, skip }) {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  const send = o => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  const t0 = Date.now(), ms = () => Date.now() - t0;
  let done = false, timer = null;
  const finish = code => {
    if (done) return; done = true; clearTimeout(timer);
    let files = [];
    if (listFiles) {
      try {
        files = fs.readdirSync(cwd).filter(n => !skip.includes(n) && n !== '__pycache__')
          .map(n => ({ n, st: fs.statSync(path.join(cwd, n)) })).filter(x => x.st.isFile())
          .sort((a, b) => a.st.mtimeMs - b.st.mtimeMs).slice(0, 24)
          .map(x => ({ name: x.n, size: x.st.size, url: `/files/${id}/${encodeURIComponent(x.n)}?t=${TOKEN}` }));
      } catch (e) {}
    }
    send({ t: 'end', code, ms: ms(), files });
    if (!res.writableEnded) res.end();
    if (current && current.id === id) current = null;
  };
  send({ t: 'start', id });
  let child;
  try {
    child = cp.spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      env: Object.assign({}, process.env, { PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONUNBUFFERED: '1', MPLBACKEND: 'Agg', TERM: 'xterm', KARETKA: '1' }) });
  } catch (e) { send({ t: 'err', s: 'Іске қосу қатесі: ' + e.message + '\n' }); return finish(127); }
  current = { child, id };
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', s => send({ t: 'out', s, ms: ms() }));
  child.stderr.on('data', s => send({ t: 'err', s, ms: ms() }));
  child.on('error', e => { send({ t: 'err', s: 'Іске қосу қатесі: ' + e.message + '\n' }); finish(127); });
  child.on('close', code => finish(code === null ? 137 : code));
  timer = setTimeout(() => { send({ t: 'err', s: `\n[Каретка] ${RUN_TIMEOUT / 1000} с шегіне жетті — тоқтатылды\n` }); killTree(child); }, RUN_TIMEOUT);
  res.on('close', () => { if (!res.writableEnded) killTree(child); });
}

function handleRun(res, spec) {
  const code = String(spec.code || ''), lang = spec.lang === 'js' ? 'js' : 'py';
  if (code.length > 400000) return plain(res, 413, 'too large');
  if (current) { killTree(current.child); current = null; }
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const dir = path.join(RUNS, id); fs.mkdirSync(dir, { recursive: true });
  const file = lang === 'js' ? 'main.js' : 'main.py';
  fs.writeFileSync(path.join(dir, file), code, 'utf8');
  let cmd, args;
  if (lang === 'js') { cmd = process.execPath; args = [file]; }
  else {
    const env = getEnv();
    if (!env.pyCmd) {
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
      res.write(JSON.stringify({ t: 'start', id }) + '\n');
      res.write(JSON.stringify({ t: 'err', s: 'Python табылмады. python.org сайтынан Python 3 орнатыңыз (Add to PATH белгісімен).\n' }) + '\n');
      res.write(JSON.stringify({ t: 'end', code: 127, ms: 0, files: [] }) + '\n'); return res.end();
    }
    cmd = env.pyCmd.cmd; args = [...env.pyCmd.pre, '-u', '-X', 'utf8', file];
  }
  streamProcess(res, { cmd, args, cwd: dir, id, listFiles: true, skip: [file] });
}
function handlePip(res, spec) {
  const pkg = String(spec.pkg || '');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.\-]*(\[[A-Za-z0-9_,\-]+\])?$/.test(pkg)) return plain(res, 400, 'bad package name');
  const env = getEnv(); if (!env.pyCmd) return plain(res, 400, 'no python');
  if (current) { killTree(current.child); current = null; }
  const id = 'pip' + Date.now().toString(36);
  streamProcess(res, { cmd: env.pyCmd.cmd, args: [...env.pyCmd.pre, '-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', pkg], cwd: RUNS, id, listFiles: false, skip: [] });
}
async function handleEncode(res, body) {
  const env = getEnv(); if (!env.ffmpeg) return plain(res, 400, 'ffmpeg табылмады');
  let spec; try { spec = JSON.parse(body.toString('utf8')); } catch (e) { return plain(res, 400, 'bad json'); }
  const frames = Array.isArray(spec.frames) ? spec.frames.slice(0, 900) : [];
  const fmt = spec.fmt === 'gif' ? 'gif' : 'mp4', fps = Math.max(1, Math.min(30, parseInt(spec.fps, 10) || 12));
  if (frames.length < 2) return plain(res, 400, 'not enough frames');
  const dir = path.join(RUNS, 'enc' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex')); fs.mkdirSync(dir, { recursive: true });
  frames.forEach((u, i) => { const m = /^data:image\/png;base64,(.+)$/.exec(String(u)); if (m) fs.writeFileSync(path.join(dir, 'f_' + String(i + 1).padStart(4, '0') + '.png'), Buffer.from(m[1], 'base64')); });
  const out = 'out.' + fmt;
  const args = fmt === 'gif'
    ? ['-y', '-framerate', String(fps), '-i', 'f_%04d.png', '-vf', 'split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse', '-loop', '0', out]
    : ['-y', '-framerate', String(fps), '-i', 'f_%04d.png', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
  const p = cp.spawn('ffmpeg', args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; p.stderr.on('data', d => { err = (err + d).slice(-2000); });
  p.on('close', code => {
    try {
      if (code !== 0) return plain(res, 500, 'ffmpeg: ' + err.split('\n').slice(-4).join(' '));
      const data = fs.readFileSync(path.join(dir, out));
      res.writeHead(200, { 'Content-Type': MIME['.' + fmt], 'Content-Length': data.length, 'Cache-Control': 'no-store' }); res.end(data);
    } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} }
  });
}

/* ---------- files produced by the user's code ---------- */
function serveFile(req, res, fp, download) {
  let st; try { st = fs.statSync(fp); if (!st.isFile()) throw 0; } catch (e) { return plain(res, 404, 'not found'); }
  const ext = path.extname(fp).toLowerCase(), size = st.size;
  let start = 0, end = size - 1, status = 200;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m && size > 0) {
    if (m[1] !== '') { start = +m[1]; if (m[2] !== '') end = Math.min(+m[2], size - 1); }
    else if (m[2] !== '') { start = Math.max(0, size - +m[2]); }
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end(); }
    status = 206;
  }
  const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (status === 206) h['Content-Range'] = `bytes ${start}-${end}/${size}`;
  if (download) h['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(fp))}`;
  res.writeHead(status, h);
  if (size === 0) return res.end();
  fs.createReadStream(fp, { start, end }).pipe(res);
}

/* ---------- http ---------- */
let lastPing = 0; const started = Date.now();
const server = http.createServer(async (req, res) => {
  try {
    const host = (req.headers.host || '').toLowerCase();
    if (host !== `127.0.0.1:${PORT}` && host !== `localhost:${PORT}`) return plain(res, 403, 'forbidden host');
    const u = new URL(req.url, 'http://x'), p = u.pathname;
    if (p === '/api/whoami') return json(res, { app: 'karetka' });
    if (p.startsWith('/api/') || p.startsWith('/files/')) {
      if ((req.headers['x-karetka-token'] || u.searchParams.get('t')) !== TOKEN) return plain(res, 401, 'bad token');
      if (req.method === 'POST') { const o = req.headers.origin; if (o && o !== `http://127.0.0.1:${PORT}` && o !== `http://localhost:${PORT}`) return plain(res, 403, 'bad origin'); }
    }
    if (p.startsWith('/api/ws/') || p.startsWith('/api/term/')) return await workspace.handle(req, res, u, { json, plain, readBody });
    if (p === '/api/ping') { lastPing = Date.now(); return json(res, { ok: true }); }
    if (p === '/api/env') { const e = getEnv(); return json(res, { py: e.py, ffmpeg: e.ffmpeg, node: e.node }); }
    if (p === '/api/run' && req.method === 'POST') { let b; try { b = JSON.parse((await readBody(req, 1.2e6)).toString('utf8')); } catch (e) { return plain(res, 400, 'bad json'); } return handleRun(res, b); }
    if (p === '/api/pip' && req.method === 'POST') { let b; try { b = JSON.parse((await readBody(req, 4e3)).toString('utf8')); } catch (e) { return plain(res, 400, 'bad json'); } return handlePip(res, b); }
    if (p === '/api/encode' && req.method === 'POST') return handleEncode(res, await readBody(req, 240e6));
    if (p.startsWith('/files/')) {
      const parts = p.split('/'); const id = parts[2] || '', name = decodeURIComponent(parts[3] || '');
      if (!/^[a-z0-9]+$/.test(id) || !name || name.includes('..') || /[\\/]/.test(name)) return plain(res, 400, 'bad path');
      return serveFile(req, res, path.join(RUNS, id, name), u.searchParams.get('dl') === '1');
    }
    // static app files (whitelist)
    let rel = p === '/' ? 'index.html' : p === '/demo' ? 'demo.html' : p.slice(1);
    if (!(rel === 'index.html' || rel === 'demo.html' || rel === 'runner.js' || rel === 'files.js' || /^assets\/[\w.\-]+$/.test(rel))) return plain(res, 404, 'not found');
    const fp = path.join(ROOT, rel);
    if (rel === 'index.html') {
      const html = fs.readFileSync(fp, 'utf8').replace('</head>', `<script>window.KARETKA_API={token:${JSON.stringify(TOKEN)}}</script></head>`);
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' }); return res.end(html);
    }
    return serveFile(req, res, fp, false);
  } catch (e) { try { if (e && e.code === 'ENOSPC') plain(res, 507, 'Дискте бос орын жоқ — C: дискін босатыңыз'); else plain(res, 500, String(e && e.message || e)); } catch (_) {} }
});
server.on('error', e => { console.error('server error:', e.message); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => console.log(`Karetka runner on http://127.0.0.1:${PORT}/`));

if (!NO_EXIT) setInterval(() => {            // quit once the app window has been closed
  const idle = lastPing ? Date.now() - lastPing : Date.now() - started - 120000;
  if (idle > 45000) process.exit(0);
}, 5000).unref();
process.on('exit', () => { if (current) killTree(current.child); workspace.killTerm(); });
