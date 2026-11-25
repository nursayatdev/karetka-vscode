/* Каретка — проект: проводник, редактор и терминал (как мини VS Code).
   The folder is opened through the Windows dialog; files and commands go through the local runner (workspace.js),
   which accepts only this app (token) and keeps file operations inside the opened folder. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const el = (tag, id, cls) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; return e; };
const API = window.KARETKA_API;
const say = t => { if (window.__K && window.__K.toast) window.__K.toast(t); };
const enc = encodeURIComponent;

const css = el('style');
css.textContent = `
#fx{position:fixed;z-index:30;left:108px;top:62px;bottom:18px;width:min(940px,calc(100vw - 130px));display:none;flex-direction:column;overflow:hidden;
  background:#1e1f22;color:#d4d4d4;border-radius:12px;box-shadow:0 0 0 1px #3a3d44,0 30px 80px rgba(0,0,0,.75);font:13px "Segoe UI",system-ui,sans-serif;outline:none}
#fx.on{display:flex}
#fx.max{left:12px;top:12px;bottom:12px;width:calc(100vw - 24px)}
#fx button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
#fxHead{height:38px;flex:none;display:flex;align-items:center;gap:6px;padding:0 8px 0 12px;background:#26282c;border-bottom:1px solid #111}
#fxHead b{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#bfc3ca;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
#fxHead .sp{flex:1}
#fx .hb{height:26px;padding:0 10px!important;border-radius:6px;background:#34373d!important;white-space:nowrap}
#fx .hb:hover{background:#44484f!important}
#fx .hb.main{background:#0e639c!important;color:#fff}
#fx .hb:disabled{opacity:.4;cursor:default}
#fxBody{flex:1;display:flex;min-height:0}
#fxTree{width:240px;flex:none;overflow:auto;background:#222428;border-right:1px solid #111;padding:6px 0;user-select:none}
.fxRow{display:flex;align-items:center;gap:6px;height:23px;padding-right:8px;cursor:pointer;white-space:nowrap}
.fxRow:hover{background:#2c2f35}
.fxRow.sel{background:#37404d;color:#fff}
.fxRow .tw{width:12px;flex:none;text-align:center;color:#8a9099;font-size:10px}
.fxRow .ic{width:20px;flex:none;text-align:center;font:700 9.5px Consolas,monospace}
.fxRow span:last-child{overflow:hidden;text-overflow:ellipsis}
.fxNote{padding:4px 12px;color:#7d828a;font-size:12px}
#fxMain{flex:1;display:flex;flex-direction:column;min-width:0}
#fxTabs{height:34px;flex:none;display:flex;overflow-x:auto;overflow-y:hidden;background:#26282c;scrollbar-width:thin}
.fxTab{display:flex;align-items:center;gap:8px;padding:0 8px 0 12px;border-right:1px solid #151619;color:#9aa0a8;cursor:pointer;white-space:nowrap}
.fxTab.on{background:#1e1f22;color:#fff;box-shadow:inset 0 2px 0 #ffb347}
.fxTab i{font-style:normal;width:18px;height:18px;display:grid;place-items:center;border-radius:4px}
.fxTab i:hover{background:#41454c}
#fxView{flex:1;position:relative;min-height:0;background:#1e1f22}
#fxEmpty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#80868f;text-align:center;padding:20px}
#fxEmpty .hb{height:34px;padding:0 18px!important}
#fxEd{position:absolute;inset:0;display:none}
#fxGut,#fxHi,#fxTa{font:13.5px/20px "Cascadia Code",Consolas,"Courier New",monospace;tab-size:4;letter-spacing:0;font-variant-ligatures:none}
#fxGut{position:absolute;left:0;top:0;bottom:0;width:52px;overflow:hidden;text-align:right;color:#5d636d;white-space:pre;padding-top:8px;user-select:none}
#fxGut div{padding-right:12px}
#fxHi,#fxTa{position:absolute;left:52px;top:0;width:calc(100% - 52px);height:100%;margin:0;padding:8px 12px;border:0;white-space:pre;overflow:auto;box-sizing:border-box}
#fxHi{overflow:hidden;color:#d4d4d4;pointer-events:none}
#fxTa{background:transparent;color:transparent;caret-color:#fff;resize:none;outline:none}
#fxTa.plain{color:#d4d4d4}
#fxTa::selection{background:rgba(80,140,220,.4)}
#fxHi .fxh-c{color:#6a9955}#fxHi .fxh-s{color:#ce9178}#fxHi .fxh-n{color:#b5cea8}#fxHi .fxh-k{color:#c586c0}#fxHi .fxh-f{color:#dcdcaa}#fxHi .fxh-t{color:#569cd6}
#fxImg{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:20px;overflow:auto}
#fxImg img{max-width:100%;max-height:100%;background:repeating-conic-gradient(#333 0 25%,#2a2a2a 0 50%) 0 0/18px 18px}
#fxImg img{cursor:zoom-in}
#fxImg.zoom{display:block!important;padding:0}
#fxImg.zoom img{max-width:none;max-height:none;cursor:zoom-out;display:block}
#fxStat{height:24px;flex:none;display:flex;align-items:center;gap:16px;padding:0 12px;background:#0e639c;color:#fff;font-size:12px;white-space:nowrap;overflow:hidden}
#fxStat .sp{flex:1}
@media (max-width:760px){#fxTree{width:170px}}
#fx,#fxMenu{color-scheme:dark}
#fxHead .hb.go{background:#2d7d46!important;color:#fff}
#fxHead .hb.go:hover{background:#379455!important}
#fxMenu{position:fixed;z-index:60;display:none;min-width:190px;max-width:420px;padding:4px;background:#2b2d31;border:1px solid #454950;border-radius:8px;box-shadow:0 14px 34px rgba(0,0,0,.6);font:13px "Segoe UI",sans-serif;color:#ddd}
#fxMenu button{display:block;width:100%;text-align:left;padding:6px 10px;border:0;border-radius:5px;background:none;color:inherit;font:inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fxMenu button:hover{background:#0e639c;color:#fff}
#fxMenu .none{padding:6px 10px;color:#8a9099}
#fxTerm{height:210px;flex:none;display:flex;flex-direction:column;background:#181a1d;border-top:1px solid #3a3d44;min-height:0}
#fxTerm.off{display:none}
#fxGrip{height:4px;flex:none;cursor:ns-resize;margin-top:-2px}
#fxGrip:hover{background:#0e639c}
#fxTHead{height:28px;flex:none;display:flex;align-items:center;gap:8px;padding:0 8px 0 12px;font-size:11.5px;color:#aab0b8;white-space:nowrap}
#fxTHead b{letter-spacing:.08em}
#fxCwd{overflow:hidden;text-overflow:ellipsis;color:#6f757e;flex:1}
#fx #fxTHead .hb{height:20px;font-size:11.5px}
#fxOut{flex:1;min-height:0;overflow:auto;margin:0;padding:4px 12px;font:12.5px/17px "Cascadia Code",Consolas,"Courier New",monospace;white-space:pre-wrap;word-break:break-all;color:#d4d4d4;user-select:text;cursor:text}
#fxOut a{color:#4ea1ff;cursor:pointer;text-decoration:underline}
#fxLine{height:28px;flex:none;display:flex;align-items:center;gap:8px;padding:0 12px;border-top:1px solid #26282c;font:12.5px Consolas,monospace}
#fxPrompt{color:#7fd08a}
#fxCmd{flex:1;background:none;border:0;outline:none;color:#fff;font:inherit}
`;
document.head.appendChild(css);

const fx = el('div', 'fx', 'max'); fx.tabIndex = -1;
fx.innerHTML = `
<div id="fxHead"><b id="fxName">Проект</b>
  <button class="hb main" id="fxOpen">Открыть папку</button>
  <button class="hb" id="fxNew" disabled title="Новый файл в выбранной папке">+ Файл</button>
  <button class="hb" id="fxNewDir" disabled title="Новая папка">+ Папка</button>
  <button class="hb" id="fxReload" disabled title="Обновить список файлов">⟳</button>
  <span class="sp"></span>
  <button class="hb" id="fxSave" disabled title="Ctrl+S">Сохранить</button>
  <button class="hb go" id="fxRunFile" disabled title="Запустить открытый файл (F5)">▶ Файл</button>
  <button class="hb go" id="fxRunProj" disabled title="Запустить проект">▶ Проект ▾</button>
  <button class="hb" id="fxTermBtn" title="Терминал (Ctrl+\`)">Терминал</button>
  <button class="hb" id="fxMax" title="Свернуть / развернуть">▢</button>
  <button class="hb" id="fxClose" title="Закрыть (Esc)">✕</button></div>
<div id="fxBody">
  <div id="fxTree"><div class="fxNote">Папка не открыта</div></div>
  <div id="fxMain"><div id="fxTabs"></div>
    <div id="fxView">
      <div id="fxEmpty"><div></div><button class="hb main" id="fxOpen2">Открыть папку</button></div>
      <div id="fxEd"><div id="fxGut"><div></div></div><pre id="fxHi" aria-hidden="true"></pre><textarea id="fxTa" spellcheck="false" autocomplete="off" autocorrect="off" wrap="off"></textarea></div>
      <div id="fxImg"><img alt=""></div>
    </div>
    <div id="fxTerm"><div id="fxGrip"></div>
      <div id="fxTHead"><b>ТЕРМИНАЛ</b><span id="fxCwd"></span><button class="hb" id="fxStop" disabled title="Ctrl+C">■ Стоп</button><button class="hb" id="fxClear">Очистить</button><button class="hb" id="fxTermX">✕</button></div>
      <pre id="fxOut"></pre>
      <div id="fxLine"><span id="fxPrompt">&gt;</span><input id="fxCmd" spellcheck="false" autocomplete="off" placeholder="команда: python main.py, npm install, git status…"></div>
    </div>
  </div>
</div>
<div id="fxStat"><span id="fxPath">—</span><span class="sp"></span><span id="fxPos"></span><span id="fxLang"></span><span id="fxEol"></span></div>`;
const menu = el('div', 'fxMenu');
document.body.append(fx, menu);

/* keys, paste, wheel and clicks inside the panel must never reach the typewriter underneath */
for (const box of [fx, menu]) ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'wheel', 'mousedown', 'pointerdown', 'compositionstart', 'compositionend'].forEach(t => box.addEventListener(t, e => e.stopPropagation()));

const ta = $('fxTa'), hi = $('fxHi'), gut = $('fxGut').firstElementChild, tree = $('fxTree'), out = $('fxOut'), cmdIn = $('fxCmd');
let ws = { root: null, name: null, cwd: null, suggestions: [] };
let selDir = '', selRow = null;
const tabs = [];                 // {name, path, kind:'text'|'img', text, saved, eol, bom, readonly, mtime, url, scroll}
let cur = null;
const open = new Set();          // expanded folders, so a refresh keeps the tree as it was

/* ---------- talking to the runner ---------- */
async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'X-Karetka-Token': API.token, ...(opts.headers || {}) } });
  if (!r.ok) { const e = new Error(r.status === 401 ? 'Приложение было перезапущено — нажмите F5' : (await r.text()) || ('ошибка ' + r.status)); e.status = r.status; throw e; }
  return r;
}
const getJson = async url => (await api(url)).json();
const post = async (url, body) => (await api(url, { method: 'POST', body: JSON.stringify(body || {}) })).json();
const join = (dir, name) => (dir ? dir + '/' + name : name);
const abs = rel => ws.root + (rel ? '\\' + rel.replace(/\//g, '\\') : '');
const extOf = n => (n.includes('.') ? n.split('.').pop() : '').toLowerCase();

/* ---------- show / hide ---------- */
let loaded = false;
async function show() {
  fx.classList.add('on'); (cur && cur.kind === 'text' ? ta : fx).focus();
  if (!loaded) { loaded = true; await refreshInfo(true); }
}
function hide() { fx.classList.remove('on'); menu.style.display = 'none'; const s = $('sink'); if (s) s.focus(); }
function toggle() { fx.classList.contains('on') ? hide() : show(); }
window.addEventListener('karetka:files', toggle);

async function refreshInfo(withTree) {
  if (!API) { tree.innerHTML = '<div class="fxNote">Откройте «Каретку» ярлыком: проекту нужен локальный сервер.</div>'; showTab(); return; }
  try { ws = await getJson('/api/ws/info'); } catch (e) { say(e.message); return; }
  applyInfo(); if (withTree) await reload();
}
function applyInfo() {
  const on = !!ws.root;
  $('fxName').textContent = ws.name || 'Проект';
  for (const id of ['fxNew', 'fxNewDir', 'fxReload', 'fxRunProj']) $(id).disabled = !on;
  $('fxCwd').textContent = ws.cwd || ''; cmdIn.disabled = !on;
  showTab();
}

/* ---------- the tree ---------- */
const ICONS = { py: ['PY', '#4ea1ff'], js: ['JS', '#f1d44a'], mjs: ['JS', '#f1d44a'], jsx: ['JSX', '#61dafb'], ts: ['TS', '#4a9eea'], tsx: ['TSX', '#61dafb'], json: ['{ }', '#f1b24a'], html: ['<>', '#ff7a59'], css: ['#', '#6fb3ff'], md: ['MD', '#9ad08a'], txt: ['≡', '#aab'], csv: ['≡', '#7fd0a0'], png: ['▣', '#c89bff'], jpg: ['▣', '#c89bff'], jpeg: ['▣', '#c89bff'], gif: ['▣', '#c89bff'], webp: ['▣', '#c89bff'], svg: ['▣', '#c89bff'], ps1: ['>_', '#6fb3ff'], bat: ['>_', '#6fb3ff'] };
function row(name, depth, isDir) {
  const r = el('div', null, 'fxRow'); r.style.paddingLeft = (8 + depth * 14) + 'px'; r.title = name;
  const tw = el('span', null, 'tw'), ic = el('span', null, 'ic'), nm = el('span');
  const k = ICONS[extOf(name)] || ['·', '#9aa0a8'];
  tw.textContent = isDir ? '▸' : ''; ic.textContent = isDir ? '📁' : k[0]; ic.style.color = isDir ? '#e3b341' : k[1]; nm.textContent = name;
  r.append(tw, ic, nm); return r;
}
function select(r, dir) { if (selRow) selRow.classList.remove('sel'); selRow = r; selDir = dir; if (r) r.classList.add('sel'); }
const note = (text, depth) => { const n = el('div', null, 'fxNote'); n.style.paddingLeft = (26 + depth * 14) + 'px'; n.textContent = text; return n; };

async function listDir(dir, box, depth) {
  let d;
  try { d = await getJson('/api/ws/list?p=' + enc(dir)); } catch (e) { box.textContent = ''; box.append(note(e.message, depth)); return; }
  box.textContent = '';
  if (!d.items.length) { box.append(note('(пусто)', depth)); return; }
  for (const it of d.items) {
    const p = join(dir, it.name), r = row(it.name, depth, it.dir); box.append(r);
    r.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); select(r, it.dir ? p : dir); contextMenu(e.clientX, e.clientY, p, it); };
    if (it.dir) {
      const kids = el('div'); box.append(kids); kids.hidden = true;
      const expand = async () => { kids.hidden = false; r.firstChild.textContent = '▾'; open.add(p); await listDir(p, kids, depth + 1); };
      r.onclick = () => { select(r, p); if (kids.hidden) expand(); else { kids.hidden = true; r.firstChild.textContent = '▸'; open.delete(p); } };
      if (open.has(p)) await expand();
    } else {
      r.onclick = () => { select(r, dir); openFile(p); };
      if (cur && cur.path === p) select(r, dir);
    }
  }
  if (d.total > d.items.length) box.append(note('…ещё ' + (d.total - d.items.length), depth));
}
async function reload() {
  if (!ws.root) { tree.innerHTML = '<div class="fxNote">Папка не открыта</div>'; return; }
  selDir = ''; selRow = null; const y = tree.scrollTop; await listDir('', tree, 0); tree.scrollTop = y;
}

const anyDirty = () => tabs.some(t => t.kind === 'text' && t.text !== t.saved);

async function pickFolder() {
  if (!API) { say('Откройте «Каретку» ярлыком — нужен локальный сервер'); return; }
  if (anyDirty() && !confirm('Есть несохранённые изменения. Открыть другую папку и потерять их?')) return;
  say('Выберите папку в окне Windows…');
  let d; try { d = await post('/api/ws/pick'); } catch (e) { say(e.message); return; }
  if (!d.picked) return;
  tabs.splice(0).forEach(t => t.url && URL.revokeObjectURL(t.url)); cur = null; open.clear();
  ws = d; renderTabs(); applyInfo(); await reload();
}

/* ---------- create / rename / delete ---------- */
async function create(dir, folder) {
  if (!ws.root) return;
  const name = (prompt((folder ? 'Имя новой папки' : 'Имя нового файла') + ' в «' + (dir || ws.name) + '»', folder ? 'src' : 'main.py') || '').trim();
  if (!name) return;
  try { await post('/api/ws/create', { dir, name, folder }); } catch (e) { say(e.message); return; }
  if (dir) open.add(dir); await reload(); await refreshInfo(false);
  if (!folder) await openFile(join(dir, name));
}
async function rename(p, it) {
  const name = (prompt('Новое имя', it.name) || '').trim(); if (!name || name === it.name) return;
  try { await post('/api/ws/rename', { p, name }); } catch (e) { say(e.message); return; }
  const next = join(p.split('/').slice(0, -1).join('/'), name);
  for (const t of tabs) if (t.path === p || t.path.startsWith(p + '/')) { t.path = next + t.path.slice(p.length); t.name = t.path.split('/').pop(); }
  for (const o of [...open]) if (o === p || o.startsWith(p + '/')) { open.delete(o); open.add(next + o.slice(p.length)); }
  renderTabs(); showTab(); await reload(); await refreshInfo(false);
}
async function remove(p, it) {
  if (!confirm('Переместить «' + it.name + '»' + (it.dir ? ' со всем содержимым' : '') + ' в Корзину?')) return;
  try { await post('/api/ws/delete', { p }); } catch (e) { say(e.message); return; }
  for (const t of tabs.filter(t => t.path === p || t.path.startsWith(p + '/'))) { t.saved = t.text; closeTab(t); }
  await reload(); await refreshInfo(false); say('В Корзине: ' + it.name);
}
function popup(x, y, items) {
  menu.textContent = '';
  for (const [label, fn] of items) { const b = el('button'); b.textContent = label; b.title = label; b.onclick = () => { menu.style.display = 'none'; fn(); }; menu.append(b); }
  if (!items.length) { const n = el('div', null, 'none'); n.textContent = 'Не нашёл, что запускать. Напишите команду в терминале.'; menu.append(n); }
  menu.style.display = 'block';
  menu.style.left = Math.min(x, innerWidth - menu.offsetWidth - 8) + 'px'; menu.style.top = Math.min(y, innerHeight - menu.offsetHeight - 8) + 'px';
}
addEventListener('pointerdown', () => { menu.style.display = 'none'; });
fx.addEventListener('pointerdown', () => { menu.style.display = 'none'; });
function contextMenu(x, y, p, it) {
  const dir = it.dir ? p : p.split('/').slice(0, -1).join('/');
  const items = [];
  if (!it.dir && runCommand(p)) items.push(['▶ Запустить', () => runFile(p)]);
  items.push(['Новый файл', () => create(dir, false)], ['Новая папка', () => create(dir, true)], ['Переименовать', () => rename(p, it)], ['Удалить (в Корзину)', () => remove(p, it)]);
  popup(x, y, items);
}
tree.addEventListener('contextmenu', e => { e.preventDefault(); if (ws.root) popup(e.clientX, e.clientY, [['Новый файл', () => create('', false)], ['Новая папка', () => create('', true)]]); });

/* ---------- opening ---------- */
async function openFile(path) {
  const had = tabs.find(t => t.path === path);
  if (had) { cur = had; renderTabs(); showTab(); return; }
  const name = path.split('/').pop(), t = { name, path, scroll: [0, 0] };
  try {
    const r = await api('/api/ws/read?p=' + enc(path)); t.mtime = r.headers.get('X-Mtime');
    if (/^(png|jpe?g|gif|webp|bmp|ico)$/.test(extOf(name))) { t.kind = 'img'; t.url = URL.createObjectURL(await r.blob()); }
    else {
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.length > 1.5e6) { say('Файл слишком большой для редактора (больше 1,5 МБ)'); return; }
      if (buf.subarray(0, 8000).includes(0)) { say('Это не текстовый файл — его нельзя редактировать'); return; }
      let text;
      t.bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch (e) { text = new TextDecoder('windows-1251').decode(buf); t.readonly = true; say('Кодировка не UTF-8: файл открыт только для чтения'); }
      t.kind = 'text'; t.eol = text.includes('\r\n') ? '\r\n' : '\n';
      t.text = t.saved = text.replace(/\r\n?/g, '\n');
    }
  } catch (e) { say('Не удалось открыть: ' + e.message); return; }
  const again = tabs.find(x => x.path === path); if (again) { cur = again; } else { tabs.push(t); cur = t; }
  renderTabs(); showTab();
}

function renderTabs() {
  const box = $('fxTabs'); box.textContent = '';
  for (const t of tabs) {
    const b = el('div', null, 'fxTab' + (t === cur ? ' on' : '')), n = el('span'), x = el('i');
    n.textContent = t.name; x.textContent = t.kind === 'text' && t.text !== t.saved ? '●' : '✕'; x.title = 'Закрыть вкладку';
    b.title = t.path; b.append(n, x);
    b.onclick = () => { cur = t; renderTabs(); showTab(); };
    x.onclick = e => { e.stopPropagation(); closeTab(t); };
    box.append(b);
  }
}
function closeTab(t) {
  if (t.kind === 'text' && t.text !== t.saved && !confirm('«' + t.name + '» не сохранён. Закрыть без сохранения?')) return;
  const i = tabs.indexOf(t); if (i < 0) return; tabs.splice(i, 1); if (t.url) URL.revokeObjectURL(t.url);
  if (cur === t) cur = tabs[Math.min(i, tabs.length - 1)] || null;
  renderTabs(); showTab();
}

function showTab() {
  const isText = cur && cur.kind === 'text', isImg = cur && cur.kind === 'img';
  $('fxEmpty').style.display = cur ? 'none' : 'flex';
  $('fxEmpty').firstElementChild.innerHTML = ws.root ? 'Выберите файл в списке слева.' : 'Откройте папку проекта,<br>чтобы смотреть, редактировать и запускать его.';
  $('fxOpen2').style.display = ws.root ? 'none' : '';
  $('fxEd').style.display = isText ? 'block' : 'none';
  $('fxImg').style.display = isImg ? 'flex' : 'none';
  $('fxPath').textContent = cur ? (ws.name + '/' + cur.path + (cur.readonly ? '  (только чтение)' : '')) : (ws.name || '—');
  $('fxLang').textContent = cur ? (extOf(cur.name) || 'text').toUpperCase() : '';
  $('fxEol').textContent = isText ? (cur.eol === '\r\n' ? 'CRLF' : 'LF') : '';
  $('fxPos').textContent = '';
  $('fxImg').classList.remove('zoom');
  if (isImg) $('fxImg').firstElementChild.src = cur.url;
  if (isText) { ta.value = cur.text; ta.readOnly = !!cur.readonly; lineCount = -1; paint(); ta.setSelectionRange(0, 0); ta.scrollLeft = cur.scroll[0]; ta.scrollTop = cur.scroll[1]; sync(); if (fx.classList.contains('on')) ta.focus(); pos(); }
  state();
}
function state() {
  $('fxSave').disabled = !(cur && cur.kind === 'text' && !cur.readonly && cur.text !== cur.saved);
  $('fxRunFile').disabled = !(cur && runCommand(cur.path));
}

/* ---------- editor ---------- */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PYKW = 'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield';
const JSKW = 'async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|let|new|null|of|return|super|switch|this|throw|true|try|typeof|undefined|var|void|while|yield|interface|type';
const STR = `"(?:\\\\.|[^"\\\\\\n])*"?|'(?:\\\\.|[^'\\\\\\n])*'?`;
const NUM = '\\b\\d+(?:\\.\\d+)?\\b';
function rules(ext) {
  if (ext === 'py') return [['c', '#[^\\n]*'], ['s', '"""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)|' + STR], ['k', '\\b(?:' + PYKW + ')\\b'], ['n', NUM], ['f', '\\b[A-Za-z_]\\w*(?=\\()']];
  if (/^(js|mjs|cjs|jsx|ts|tsx)$/.test(ext)) return [['c', '//[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$)'], ['s', '`(?:\\\\.|[^`\\\\])*`?|' + STR], ['k', '\\b(?:' + JSKW + ')\\b'], ['n', NUM], ['f', '\\b[A-Za-z_$][\\w$]*(?=\\()']];
  if (ext === 'json') return [['t', '"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)'], ['s', STR], ['k', '\\b(?:true|false|null)\\b'], ['n', NUM]];
  if (ext === 'css') return [['c', '/\\*[\\s\\S]*?(?:\\*/|$)'], ['s', STR], ['t', '[\\w-]+(?=\\s*:)'], ['n', '#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|em|rem|vh|vw|%|s|ms)?']];
  if (/^(html|htm|xml|svg)$/.test(ext)) return [['c', '<!--[\\s\\S]*?(?:-->|$)'], ['t', '</?[A-Za-z][\\w:-]*|/?>'], ['s', STR]];
  if (/^(ps1|sh|yml|yaml|toml|ini|env)$/.test(ext)) return [['c', '#[^\\n]*'], ['s', STR], ['n', NUM]];
  return null;
}
function highlight(src, ext) {
  const rs = rules(ext); if (!rs || src.length > 120000) return null;
  const re = new RegExp(rs.map(r => '(' + r[1] + ')').join('|'), 'g'); let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    if (!m[0]) { re.lastIndex++; continue; }
    let i = 1; while (m[i] === undefined) i++;
    out += esc(src.slice(last, m.index)) + '<span class="fxh-' + rs[i - 1][0] + '">' + esc(m[0]) + '</span>'; last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
let lineCount = -1;
function paint() {
  const h = highlight(ta.value, extOf(cur.name));
  ta.classList.toggle('plain', h === null); hi.innerHTML = h === null ? '' : h + '\n ';
  const n = ta.value.split('\n').length;
  if (n !== lineCount) { lineCount = n; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n'); }
}
function sync() { hi.scrollTop = ta.scrollTop; hi.scrollLeft = ta.scrollLeft; gut.style.transform = `translateY(${-ta.scrollTop}px)`; if (cur) cur.scroll = [ta.scrollLeft, ta.scrollTop]; }
function pos() { const before = ta.value.slice(0, ta.selectionStart), l = before.split('\n'); $('fxPos').textContent = 'Стр ' + l.length + ', стлб ' + (l[l.length - 1].length + 1); }
ta.addEventListener('scroll', sync);
['keyup', 'click', 'select'].forEach(t => ta.addEventListener(t, pos));
ta.addEventListener('input', () => {
  if (!cur || cur.kind !== 'text') return;
  const wasDirty = cur.text !== cur.saved; cur.text = ta.value; paint(); sync(); pos();
  if (wasDirty !== (cur.text !== cur.saved)) renderTabs();
  state();
});
const insert = s => { if (!document.execCommand('insertText', false, s)) { ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } };
ta.addEventListener('keydown', e => {
  if (ta.readOnly || e.ctrlKey || e.metaKey || e.altKey) return;
  const unit = /^(py)$/.test(extOf(cur.name)) ? '    ' : '  ', v = ta.value, a = ta.selectionStart, b = ta.selectionEnd, ls = v.lastIndexOf('\n', a - 1) + 1;
  if (e.key === 'Tab') {
    e.preventDefault();
    if (!e.shiftKey && !v.slice(a, b).includes('\n')) { insert(unit); return; }
    const block = v.slice(ls, b), next = e.shiftKey ? block.replace(new RegExp('^ {1,' + unit.length + '}', 'gm'), '') : block.replace(/^/gm, unit);
    if (next === block) return;
    ta.setSelectionRange(ls, b); insert(next); ta.setSelectionRange(ls, ls + next.length);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const line = v.slice(ls, a); let ind = (line.match(/^[ \t]*/) || [''])[0];
    if (/[:{[(]\s*$/.test(line)) ind += unit;
    insert('\n' + ind);
  }
});

/* ---------- saving ---------- */
async function save(t = cur) {
  if (!t || t.kind !== 'text' || t.readonly || t.text === t.saved) return true;
  const text = t.text, body = (t.bom ? '﻿' : '') + (t.eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text);
  const put = mtime => api('/api/ws/write?p=' + enc(t.path) + (mtime ? '&mtime=' + enc(mtime) : ''), { method: 'POST', body });
  try {
    let r;
    try { r = await put(t.mtime); }
    catch (e) { if (e.status !== 409) throw e; if (!confirm('Файл «' + t.name + '» изменён другой программой. Перезаписать?')) return false; r = await put(''); }
    t.mtime = (await r.json()).mtime; t.saved = text;
    renderTabs(); state(); say('Сохранено: ' + t.name); return true;
  } catch (e) { say('Не удалось сохранить: ' + e.message); return false; }
}
async function saveAll() { for (const t of tabs) if (!(await save(t))) return false; return true; }

/* ---------- terminal ---------- */
let log = '', running = false, drawReq = 0, history = [], hAt = 0, ctrl = null;
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function draw() {
  drawReq = 0;
  const atEnd = out.scrollTop + out.clientHeight >= out.scrollHeight - 30;
  out.innerHTML = escHtml(log).replace(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/[^\s<>"'&]*)?/g, u => '<a data-url="' + u.replace('0.0.0.0', 'localhost') + '">' + u + '</a>');
  if (atEnd) out.scrollTop = out.scrollHeight;
}
function print(s) {
  s = s.replace(/\x1b\][^\x07]*\x07|\x1b\[[0-9;?]*[A-Za-z]|\x1b./g, '').replace(/\r\n/g, '\n');
  for (const [i, piece] of s.split('\r').entries()) { if (i) log = log.slice(0, log.lastIndexOf('\n') + 1); log += piece; }
  if (log.length > 150000) log = log.slice(-120000);
  if (!drawReq) drawReq = setTimeout(draw, 40);
}
out.addEventListener('click', e => { const u = e.target.dataset && e.target.dataset.url; if (u) window.open(u, '_blank', 'noopener'); });
function termState() { $('fxStop').disabled = !running; $('fxPrompt').textContent = running ? '…' : '>'; cmdIn.placeholder = running ? 'программа работает: Enter отправит ей строку, Ctrl+C остановит' : 'команда: python main.py, npm install, git status…'; }
function openTerm() { $('fxTerm').classList.remove('off'); }
let stopped = false;
async function stopTerm() { if (!running) return; stopped = true; try { await post('/api/term/stop'); } catch (e) { say(e.message); } }
async function exec(command) {
  command = command.trim(); if (!command || !ws.root) return;
  openTerm();
  if (/^(cls|clear)$/i.test(command)) { log = ''; draw(); return; }
  if (running) { await stopTerm(); for (let i = 0; i < 40 && running; i++) await new Promise(r => setTimeout(r, 50)); }
  history.push(command); hAt = history.length;
  print((log && !log.endsWith('\n') ? '\n' : '') + ws.cwd + '> ' + command + '\n');
  running = true; stopped = false; termState(); const mine = ctrl = {};
  try {
    const r = await api('/api/term/run', { method: 'POST', body: JSON.stringify({ cmd: command }) });
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
        if (mine !== ctrl) continue;
        if (m.t === 'out') print(m.s);
        else if (m.t === 'end') { if (m.cwd) { ws.cwd = m.cwd; $('fxCwd').textContent = m.cwd; } if (m.code || stopped) print((log.endsWith('\n') ? '' : '\n') + (stopped ? '[остановлено]' : '[код выхода ' + m.code + ']') + '\n'); }
      }
    }
  } catch (e) { print('\n' + e.message + '\n'); }
  if (mine !== ctrl) return;
  running = false; termState(); draw();
  await reload(); await refreshInfo(false);                          // the command may have created files
}
cmdIn.addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    e.preventDefault(); const v = cmdIn.value; cmdIn.value = '';
    if (running) { print(v + '\n'); try { await post('/api/term/input', { s: v + '\n' }); } catch (err) { say(err.message); } }
    else exec(v);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); hAt = Math.max(0, Math.min(history.length, hAt + (e.key === 'ArrowUp' ? -1 : 1))); cmdIn.value = history[hAt] || '';
  } else if (e.ctrlKey && e.code === 'KeyC' && running && cmdIn.selectionStart === cmdIn.selectionEnd) { e.preventDefault(); print('^C\n'); stopTerm(); }
});
const grip = $('fxGrip');
grip.addEventListener('pointerdown', e => {
  const box = $('fxTerm'), y0 = e.clientY, h0 = box.offsetHeight; grip.setPointerCapture(e.pointerId);
  const mv = ev => { box.style.height = Math.max(90, Math.min($('fxMain').offsetHeight - 110, h0 + y0 - ev.clientY)) + 'px'; };
  grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', () => grip.removeEventListener('pointermove', mv), { once: true });
});

/* ---------- Run ---------- */
function runCommand(p) {
  if (!ws.root) return null;
  const f = '"' + (ws.cwd === ws.root ? p.replace(/\//g, '\\') : abs(p)) + '"', e = extOf(p);
  if (e === 'py') return 'python -u ' + f;
  if (/^(js|mjs|cjs)$/.test(e)) return 'node ' + f;
  if (/^(html|htm)$/.test(e)) return 'start "" ' + f;
  if (e === 'ps1') return 'powershell -NoProfile -ExecutionPolicy Bypass -File ' + f;
  if (/^(bat|cmd)$/.test(e)) return f;
  return null;
}
async function runFile(p) {
  p = p || (cur && cur.path); const c = p && runCommand(p);
  if (!c) { say('Этот тип файла запускается только из терминала'); return; }
  if (await saveAll()) exec(c);
}

/* click a picture to see it at full size, centred on the point clicked */
$('fxImg').firstElementChild.addEventListener('click', e => {
  const box = $('fxImg'), r = e.target.getBoundingClientRect(), fx0 = (e.clientX - r.left) / r.width, fy0 = (e.clientY - r.top) / r.height;
  if (box.classList.toggle('zoom')) { box.scrollLeft = fx0 * e.target.offsetWidth - box.clientWidth / 2; box.scrollTop = fy0 * e.target.offsetHeight - box.clientHeight / 2; }
});

/* ---------- buttons and shortcuts ---------- */
$('fxOpen').onclick = $('fxOpen2').onclick = pickFolder;
$('fxNew').onclick = () => create(selDir, false);
$('fxNewDir').onclick = () => create(selDir, true);
$('fxReload').onclick = async () => { await refreshInfo(false); await reload(); };
$('fxSave').onclick = () => save();
$('fxRunFile').onclick = () => runFile();
$('fxRunProj').onclick = async e => {
  const r = e.currentTarget.getBoundingClientRect(); await refreshInfo(false);
  popup(r.left, r.bottom + 4, ws.suggestions.map(c => [c, async () => { if (await saveAll()) exec(c); }]));
};
$('fxTermBtn').onclick = () => { $('fxTerm').classList.toggle('off'); if (!$('fxTerm').classList.contains('off')) cmdIn.focus(); };
$('fxTermX').onclick = () => $('fxTerm').classList.add('off');
$('fxStop').onclick = stopTerm;
$('fxClear').onclick = () => { log = ''; draw(); };
$('fxMax').onclick = () => fx.classList.toggle('max');
$('fxClose').onclick = hide;
fx.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'KeyS') { e.preventDefault(); save(); }
  else if (mod && e.code === 'KeyO') { e.preventDefault(); pickFolder(); }
  else if (mod && e.code === 'Backquote') { e.preventDefault(); openTerm(); cmdIn.focus(); }
  else if (e.key === 'F5' && !mod) { e.preventDefault(); runFile(); }
  else if (mod && /^Key[NRLT]$/.test(e.code)) e.preventDefault();       // keep the browser from reloading / opening windows over unsaved work
  else if (e.key === 'Escape') { e.preventDefault(); if (menu.style.display === 'block') menu.style.display = 'none'; else hide(); }
});
addEventListener('beforeunload', e => { if (anyDirty()) { e.preventDefault(); e.returnValue = ''; } });
const openBtn = $('bFiles');
if (openBtn) openBtn.addEventListener('click', toggle);
termState();
})();
