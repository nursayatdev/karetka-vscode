'use strict';
/* Каретка — the project folder behind the file panel: file operations and a terminal.
   Called only after server.js has checked Host, token and (for POST) Origin.
   The folder can be chosen only through the Windows dialog on this computer (or --workspace at start-up);
   file operations are confined to it. The terminal runs what the user types, like the terminal in VS Code. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');

const STORE = path.join(process.env.LOCALAPPDATA || os.homedir(), 'Karetka', 'workspace.json');
const argAt = process.argv.indexOf('--workspace');
let root = null, cwd = null, term = null;

const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } };
function setRoot(p, remember) {
  root = path.resolve(p); cwd = root;
  if (remember) try { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify({ root })); } catch (e) {}
}
if (argAt > 0 && isDir(process.argv[argAt + 1] || '')) setRoot(process.argv[argAt + 1], false);
else try { const s = JSON.parse(fs.readFileSync(STORE, 'utf8')); if (s.root && isDir(s.root)) setRoot(s.root, false); } catch (e) {}

/* ---------- confinement ---------- */
const inside = (base, p) => { const r = path.relative(base, p); return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r)); };
function resolve(rel) {
  if (!root) throw Object.assign(new Error('папка не открыта'), { code: 400 });
  const p = path.resolve(root, '.' + path.sep + String(rel || ''));
  let probe = p; while (!fs.existsSync(probe) && path.dirname(probe) !== probe) probe = path.dirname(probe);   // follow links of the existing part
  if (!inside(root, p) || !inside(fs.realpathSync(root), fs.realpathSync(probe))) throw Object.assign(new Error('путь вне папки проекта'), { code: 403 });
  return p;
}
const goodName = n => typeof n === 'string' && n && n !== '.' && n !== '..' && !/[\\/:*?"<>|]/.test(n);

/* ---------- PowerShell helpers (folder dialog, recycle bin) ---------- */
function powershell(script, env) {
  return new Promise((res, rej) => {
    const p = cp.spawn('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, env: { ...process.env, ...env } });
    let out = '', err = ''; p.stdout.on('data', d => out += d.toString('utf8')); p.stderr.on('data', d => err += d);
    p.on('error', rej); p.on('close', c => c === 0 ? res(out.trim()) : rej(new Error(String(err).slice(-300))));
  });
}
const PICK = `$ProgressPreference='SilentlyContinue'; Add-Type -AssemblyName System.Windows.Forms; [Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$o=New-Object System.Windows.Forms.Form; $o.TopMost=$true; $d=New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description='Выберите папку проекта'
if($env:KTK_PATH){$d.SelectedPath=$env:KTK_PATH}; if($d.ShowDialog($o) -eq 'OK'){[Console]::Write($d.SelectedPath)}`;
const RECYCLE = `$ProgressPreference='SilentlyContinue'; $ErrorActionPreference='Stop'; Add-Type -AssemblyName Microsoft.VisualBasic; $p=$env:KTK_PATH
if(Test-Path -LiteralPath $p -PathType Container){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p,'OnlyErrorDialogs','SendToRecycleBin')}else{[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,'OnlyErrorDialogs','SendToRecycleBin')}`;

/* ---------- what "Run project" can offer ---------- */
function suggestions() {
  const out = []; if (!root) return out;
  const has = f => fs.existsSync(path.join(root, f));
  try { const s = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
    for (const k of Object.keys(s).sort((a, b) => ['dev', 'start'].includes(b) - ['dev', 'start'].includes(a))) if (/^[\w:.\-]+$/.test(k)) out.push('npm run ' + k);
    if (!has('node_modules')) out.unshift('npm install'); } catch (e) {}
  if (has('manage.py')) out.push('python manage.py runserver');
  for (const f of ['main.py', 'app.py', 'run.py', 'bot.py']) if (has(f)) out.push('python ' + f);
  for (const f of ['index.js', 'server.js', 'main.js']) if (has(f) && !has('package.json')) out.push('node ' + f);
  if (has('index.html')) out.push('start "" index.html');
  if (has('requirements.txt')) out.push('python -m pip install -r requirements.txt');
  return out.slice(0, 12);
}
const info = () => ({ root, name: root ? path.basename(root) || root : null, cwd, running: !!term, suggestions: suggestions() });

/* ---------- terminal ---------- */
function killTerm() {
  const c = term; term = null; if (!c || c.exitCode !== null) return;
  try { if (process.platform === 'win32') cp.spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { windowsHide: true }); else c.kill('SIGKILL'); } catch (e) {}
}
function runTerm(res, command) {
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
  const send = o => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  const end = code => { send({ t: 'end', code, cwd }); res.end(); };
  const cd = /^\s*(?:cd|chdir)(?:\s+\/d)?(?:\s+|(?=\.)|$)(.*)$/i.exec(command);
  if (cd && !/[&|<>]/.test(command)) {                       // "cd" must survive between commands
    const to = cd[1].trim().replace(/^"(.*)"$/, '$1');
    const next = to ? path.resolve(cwd, to) : root;
    if (isDir(next)) { cwd = next; return end(0); }
    send({ t: 'out', s: 'Папка не найдена: ' + to + '\n' }); return end(1);
  }
  killTerm();
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PYTHONUNBUFFERED: '1', NO_COLOR: '1', FORCE_COLOR: '0' };
  let child;
  try {
    child = process.platform === 'win32'
      ? cp.spawn('cmd.exe', ['/d', '/s', '/c', '"chcp 65001>nul & ' + command + '"'], { cwd, env, windowsHide: true, windowsVerbatimArguments: true })
      : cp.spawn('/bin/sh', ['-c', command], { cwd, env });
  } catch (e) { send({ t: 'out', s: e.message + '\n' }); return end(1); }
  term = child;
  for (const s of [child.stdout, child.stderr]) { s.setEncoding('utf8'); s.on('data', d => send({ t: 'out', s: d })); }
  child.on('error', e => send({ t: 'out', s: e.message + '\n' }));
  child.on('close', code => { if (term === child) term = null; end(code === null ? 130 : code); });
}

/* ---------- http ---------- */
async function handle(req, res, u, { json, plain, readBody }) {
  const p = u.pathname, q = k => u.searchParams.get(k);
  const body = async () => JSON.parse((await readBody(req, 64e3)).toString('utf8') || '{}');
  const post = req.method === 'POST';
  try {
    if (p === '/api/ws/info') return json(res, info());
    if (p === '/api/ws/pick' && post) { const chosen = await powershell(PICK, { KTK_PATH: root || '' }); if (chosen && isDir(chosen)) { killTerm(); setRoot(chosen, true); } return json(res, { ...info(), picked: !!chosen }); }
    if (p === '/api/ws/list') {
      const dir = resolve(q('p'));
      const items = fs.readdirSync(dir, { withFileTypes: true }).map(d => ({ name: d.name, dir: d.isDirectory() || (d.isSymbolicLink() && isDir(path.join(dir, d.name))) }));
      items.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
      return json(res, { items: items.slice(0, 1500), total: items.length });
    }
    if (p === '/api/ws/read') {
      const f = resolve(q('p')), st = fs.statSync(f);
      if (!st.isFile()) return plain(res, 400, 'это не файл');
      if (st.size > 8e6) return plain(res, 413, 'файл больше 8 МБ');
      const data = fs.readFileSync(f);
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Mtime': String(st.mtimeMs), 'X-Content-Type-Options': 'nosniff' });
      return res.end(data);
    }
    if (p === '/api/ws/write' && post) {
      const f = resolve(q('p')), data = await readBody(req, 8e6);
      if (q('mtime') && fs.existsSync(f) && String(fs.statSync(f).mtimeMs) !== q('mtime')) return plain(res, 409, 'changed on disk');
      fs.writeFileSync(f, data); return json(res, { mtime: String(fs.statSync(f).mtimeMs) });
    }
    if (p === '/api/ws/create' && post) {
      const b = await body(); if (!goodName(b.name)) return plain(res, 400, 'недопустимое имя');
      const f = resolve(path.join(String(b.dir || ''), b.name));
      if (fs.existsSync(f)) return plain(res, 409, 'уже существует');
      if (b.folder) fs.mkdirSync(f); else fs.writeFileSync(f, '', { flag: 'wx' });
      return json(res, { ok: true });
    }
    if (p === '/api/ws/rename' && post) {
      const b = await body(); if (!goodName(b.name)) return plain(res, 400, 'недопустимое имя');
      const from = resolve(b.p), to = resolve(path.join(path.dirname(String(b.p)), b.name));
      if (from === root) return plain(res, 400, 'нельзя');
      if (fs.existsSync(to) && from.toLowerCase() !== to.toLowerCase()) return plain(res, 409, 'уже существует');
      fs.renameSync(from, to); return json(res, { ok: true });
    }
    if (p === '/api/ws/delete' && post) {                    // always to the Recycle Bin, never a permanent delete
      const b = await body(), f = resolve(b.p);
      if (f === root) return plain(res, 400, 'нельзя удалить папку проекта');
      await powershell(RECYCLE, { KTK_PATH: f }); return json(res, { ok: true });
    }
    if (p === '/api/term/run' && post) { const b = await body(); const c = String(b.cmd || ''); if (!root) return plain(res, 400, 'папка не открыта'); if (!c.trim() || c.length > 4000 || /[\r\n]/.test(c)) return plain(res, 400, 'bad command'); return runTerm(res, c); }
    if (p === '/api/term/input' && post) { const b = await body(); if (term && term.stdin.writable) term.stdin.write(String(b.s || '')); return json(res, { ok: !!term }); }
    if (p === '/api/term/stop' && post) { killTerm(); return json(res, { ok: true }); }
    return plain(res, 404, 'not found');
  } catch (e) {
    if (res.headersSent) return res.end();
    return plain(res, typeof e.code === 'number' ? e.code : e.code === 'ENOENT' ? 404 : 500, e.code === 'ENOENT' ? 'не найдено' : String(e.message || e));
  }
}
module.exports = { handle, killTerm };
