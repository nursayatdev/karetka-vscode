/* Каретка — RUN key + printer.
   The text typed on the paper is the program. RUN sends it to the local runner (server.js); the output streams back and
   is printed on a white sheet that comes out of the printer's mouth as a real 3D sheet (WebGL): it bends under its own
   weight, is lit and shaded, and carries terminal text (with clear-screen / cursor / \r support so number animations play
   on the paper), pictures, video and the files the code wrote. */
(function () {
'use strict';
const K = window.__K;
if (!K) return;
const API = window.KARETKA_API || null;
const $ = id => document.getElementById(id);
const el = (tag, id, cls) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = Math.random;

/* ======================= styles ======================= */
const H = (l) => `hsl(var(--mh),var(--ms),${l}%)`;
const slab = [];                                   // brutal extrusion: a solid stack of hard-edged layers
for (let i = 2; i <= 28; i += 2) slab.push(`0 ${i}px 0 ${H(Math.max(9, 36 - i * .95))}`);
const css = document.createElement('style');
css.textContent = `
#runKey{position:absolute;width:170px;height:82px;transform:translateZ(38px);cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;gap:12px;
  border:3px solid ${H(13)};user-select:none;
  background:
    radial-gradient(circle at 11px 11px,${H(16)} 0 3px,rgba(255,255,255,.55) 3px 4px,transparent 4.5px),
    radial-gradient(circle at calc(100% - 11px) 11px,${H(16)} 0 3px,rgba(255,255,255,.55) 3px 4px,transparent 4.5px),
    radial-gradient(circle at 11px calc(100% - 11px),${H(16)} 0 3px,rgba(255,255,255,.55) 3px 4px,transparent 4.5px),
    radial-gradient(circle at calc(100% - 11px) calc(100% - 11px),${H(16)} 0 3px,rgba(255,255,255,.55) 3px 4px,transparent 4.5px),
    repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,rgba(0,0,0,.035) 1px 2px),
    linear-gradient(180deg,${H(80)} 0%,${H(66)} 50%,${H(52)} 100%);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.7),inset 0 -5px 0 rgba(0,0,0,.2),inset 3px 0 0 rgba(255,255,255,.25),inset -3px 0 0 rgba(0,0,0,.14),
    ${slab.join(',')},0 31px 0 #000,0 46px 38px rgba(0,0,0,.8);
  transition:transform .06s,box-shadow .06s,filter .15s}
#runKey:hover{filter:brightness(1.06)}
#runKey:active,#runKey.down{transform:translateZ(38px) translateY(23px);
  box-shadow:inset 0 3px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(0,0,0,.2),0 2px 0 ${H(30)},0 4px 0 ${H(24)},0 7px 0 #000,0 14px 16px rgba(0,0,0,.7)}
#runKey .lamp{width:13px;height:13px;border-radius:2px;background:#ffb347;box-shadow:0 0 0 2px ${H(15)},0 0 10px 1px rgba(255,170,60,.9),inset 0 -2px 0 rgba(150,70,0,.5);transition:all .2s}
#runKey.running .lamp{background:#ff5b4d;box-shadow:0 0 0 2px ${H(15)},0 0 12px 2px rgba(255,80,60,.95),inset 0 -2px 0 rgba(120,10,5,.5);animation:rkblink .5s steps(2) infinite}
@keyframes rkblink{50%{opacity:.35}}
#runKey b{font:900 29px "Courier New",Consolas,monospace;letter-spacing:.1em;color:${H(12)};text-shadow:0 2px 0 rgba(255,255,255,.55),0 -1px 0 rgba(0,0,0,.25);transform:scaleY(1.08)}
#runKey svg{width:17px;height:17px;fill:${H(12)};filter:drop-shadow(0 1.5px 0 rgba(255,255,255,.55))}

#printer{position:absolute;width:620px;height:200px;transform:translateZ(40px);border-radius:26px 26px 8px 8px;
  background:radial-gradient(ellipse 60% 20% at 50% 0%,rgba(255,252,240,.5),rgba(255,252,240,0) 72%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.014) 0 1px,rgba(0,0,0,.012) 1px 2px,rgba(255,255,255,0) 2px 3px),
    linear-gradient(180deg,${H(72)} 0%,${H(58)} 14%,${H(40)} 55%,${H(22)} 100%);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.75),inset 0 0 0 1px rgba(0,0,0,.3),inset 0 -30px 50px rgba(0,0,0,.35),0 -6px 30px rgba(0,0,0,.5),0 30px 60px rgba(0,0,0,.75)}
#prSlot{position:absolute;left:50%;top:6px;width:568px;height:15px;margin-left:-284px;border-radius:4px 4px 9px 9px;
  background:linear-gradient(180deg,#030304,#15171a);box-shadow:inset 0 4px 7px rgba(0,0,0,.95),0 1px 0 rgba(255,255,255,.4)}
#prFace{position:absolute;left:24px;right:24px;top:40px;height:132px;border-radius:16px;
  background:linear-gradient(180deg,rgba(0,0,0,.16),rgba(0,0,0,.28));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 0 rgba(255,255,255,.12)}
#prLcd{position:absolute;left:22px;top:26px;width:150px;height:48px;border-radius:9px;background:#0a0b0d;display:grid;place-items:center;
  box-shadow:inset 0 3px 8px rgba(0,0,0,.95),0 1px 0 rgba(255,255,255,.3);font:700 17px "Courier New",monospace;letter-spacing:.2em;color:#ffb347;text-shadow:0 0 9px rgba(255,170,60,.75)}
#prName{position:absolute;left:0;right:0;top:34px;text-align:center;font:700 12px "Segoe UI",sans-serif;letter-spacing:.5em;color:rgba(20,22,26,.6);text-shadow:0 1px 0 rgba(255,255,255,.3)}
#prName em{display:block;margin-top:5px;font-style:normal;font-weight:600;font-size:9.5px;letter-spacing:.7em;opacity:.8}
#prLeds{position:absolute;right:26px;top:36px;display:flex;gap:12px}
#prLeds i{width:17px;height:17px;border-radius:50%;background:radial-gradient(circle at 50% 60%,#33373d,#0e1013 70%);box-shadow:inset 0 2px 3px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.45);position:relative}
#prLeds i::after{content:"";position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle,#4a3b26,#1d1712);transition:all .3s}
#prLeds i.on::after{background:radial-gradient(circle,#fff8de,#ffd27a 35%,#ffa62b 65%,#c86a00);box-shadow:0 0 6px 1px rgba(255,170,60,.95),0 0 16px 3px rgba(255,140,30,.4)}
#prLeds i.ok::after{background:radial-gradient(circle,#eaffe9,#7be08a 40%,#27a844 75%,#127a2a);box-shadow:0 0 6px 1px rgba(80,220,110,.9),0 0 16px 3px rgba(60,200,90,.35)}
#prLeds i.bad::after{background:radial-gradient(circle,#ffe0dc,#ff7a6e 40%,#d22c20 75%,#8a130b);box-shadow:0 0 6px 1px rgba(255,90,70,.95),0 0 16px 3px rgba(255,60,40,.4)}
#prFace .btnrow{position:absolute;right:26px;bottom:20px;display:flex;gap:10px}
#prFace .btnrow b{width:34px;height:14px;border-radius:7px;background:linear-gradient(180deg,#d0d4d8,#868c93);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 0 #3d4147,0 3px 4px rgba(0,0,0,.5)}

#poBar{position:fixed;z-index:7;display:none;flex-direction:column;align-items:stretch;gap:4px;padding:5px;border-radius:9px;opacity:.82;transition:opacity .2s;
  background:rgba(13,14,17,.9);box-shadow:0 0 0 1px #2b2e34,0 6px 16px rgba(0,0,0,.55)}
#poBar:hover{opacity:1}
#poBar.on{display:flex}
#poBtns{display:flex;flex-direction:column;gap:4px}
.poBtn{all:unset;cursor:pointer;padding:3px 8px;border-radius:6px;font:800 10px "Segoe UI",sans-serif;letter-spacing:.06em;color:#2b2f34;white-space:nowrap;text-align:center;max-width:118px;overflow:hidden;text-overflow:ellipsis;
  background:linear-gradient(180deg,#d6dade,#a0a6ad 55%,#7d838a);box-shadow:inset 0 1px 0 rgba(255,255,255,.85),inset 0 -2px 3px rgba(0,0,0,.22),0 2px 0 #4b5056,0 4px 6px rgba(0,0,0,.5);transition:transform .06s,box-shadow .06s,filter .15s}
.poBtn:hover{filter:brightness(1.08)}
.poBtn:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 0 0 #4b5056,0 1px 2px rgba(0,0,0,.5)}
.poBtn.warn{background:linear-gradient(180deg,#ffd98a,#ffb13a 55%,#d97c00);color:#3b1d00}
#poClose{all:unset;cursor:pointer;height:18px;border-radius:6px;display:grid;place-items:center;color:#9aa0a8;font:700 10px "Segoe UI";background:#1b1d21;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
#poClose:hover{color:#fff;background:#2a2d33}
`;
document.head.appendChild(css);

/* ======================= the 3D parts inside the scene ======================= */
const tilt = $('tilt');
const runKey = el('div', 'runKey'); runKey.title = 'Қағаздағы кодты іске қосу  (Ctrl+Enter)';
const ICON_RUN = '<svg viewBox="0 0 24 24"><path d="M5 3.5v17L21 12z"/></svg>', ICON_STOP = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>';
const printer = el('div', 'printer');
printer.innerHTML = '<div id="prSlot"></div><div id="prFace"><div id="prLcd"><span id="prLcdT">READY</span></div><div id="prName">КАРЕТКА<em>PRINT</em></div><div id="prLeds"><i id="prL1" class="ok"></i><i id="prL2"></i><i id="prL3"></i></div><div class="btnrow"><b></b><b></b></div></div>';
tilt.append(runKey, printer);

const bar = el('div', 'poBar'); bar.innerHTML = '<span id="poBtns"></span><button id="poClose" title="Жабу (Esc)">✕</button>';
document.body.appendChild(bar);
const poBtns = $('poBtns');

/* ======================= sounds ======================= */
const snd = () => K.settings.sound && K.A.ctx;
const nowT = () => K.A.ctx.currentTime + .004;
function sRunKey(down) {               // heavy relay key: clack on the way down, softer knock on release
  if (!snd()) return; const t = nowT();
  if (down) { K.nz(t, { f: 1100, q: 2, dur: .035, g: .85 }); K.nz(t + .001, { f: 380, q: 1.2, dur: .09, g: .6 }); K.tn(t, { f: 95, f2: 38, dur: .16, g: .95 }); K.nz(t + .02, { f: 5200, q: 5, dur: .012, g: .25 }); K.tn(t, { f: 2100, dur: .12, g: .03, type: 'triangle' }); }
  else { K.nz(t, { f: 1700, q: 3, dur: .025, g: .4 }); K.tn(t, { f: 140, f2: 70, dur: .06, g: .4 }); }
}
function sPrintLine() {                // dot-matrix line: the head sweeps across (pitch glides), then the paper ratchets up
  if (!snd()) return; const t = nowT(), dir = R() < .5 ? -1 : 1;
  for (let i = 0; i < 14; i++) K.nz(t + i * .0045, { f: 1800 + i * 150 * dir + R() * 900, q: 7, dur: .006, g: .1 + R() * .05, out: K.pan(dir * (-.5 + i / 13)) });
  K.nz(t, { type: 'bandpass', f: 900, f2: 2600, q: 1.1, dur: .07, g: .09 });
  K.nz(t + .072, { f: 2000, q: 4, dur: .012, g: .17 }); K.tn(t + .072, { f: 125, f2: 75, dur: .04, g: .14 });
}
function sTick() { if (!snd()) return; const t = nowT(); for (let i = 0; i < 4; i++) K.nz(t + i * .006, { f: 2600 + R() * 1500, q: 7, dur: .006, g: .08, out: K.pan(R() * 1.2 - .6) }); }
let motor = null;
function motorOn() {                   // the printer's drive motor: spins up, hums with a slight wobble while printing
  if (!snd() || motor) return; const c = K.A.ctx, t = c.currentTime;
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(38, t); o.frequency.exponentialRampToValueAtTime(66, t + .45);
  const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 132; const g2 = c.createGain(); g2.gain.value = .009;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.05, t + .35);
  const lfo = c.createOscillator(); lfo.frequency.value = 6.5; const lg = c.createGain(); lg.gain.value = .8; lfo.connect(lg); lg.connect(o.frequency);
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(K.A.fx); o.start(); o2.start(); lfo.start();
  motor = { o, o2, lfo, g };
}
function motorOff() {
  if (!motor) return; const c = K.A.ctx, t = c.currentTime, m = motor; motor = null;
  try { m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(Math.max(.0002, m.g.gain.value), t); m.g.gain.exponentialRampToValueAtTime(.0001, t + .55); m.o.frequency.exponentialRampToValueAtTime(28, t + .55); } catch (e) {}
  setTimeout(() => { try { m.o.stop(); m.o2.stop(); m.lfo.stop(); } catch (e) {} }, 750);
}
let lastSlide = 0;
function sSlide() { if (!snd()) return; const n = performance.now(); if (n - lastSlide < 110) return; lastSlide = n; const t = nowT(); K.nz(t, { type: 'bandpass', f: 3200, f2: 5200, q: .6, dur: .16, g: .035, a: .03 }); K.nz(t, { type: 'lowpass', f: 700, q: .5, dur: .14, g: .05, a: .02 }); }
let lastRoll = 0;
function sFeedRoll() {                 // platen roller pulling the sheet out: soft ratchet ticks + a paper whisper
  if (!snd()) return; const n = performance.now(); if (n - lastRoll < 52) return; lastRoll = n; const t = nowT();
  K.nz(t, { type: 'bandpass', f: 2300 + R() * 500, q: 3.5, dur: .012, g: .075 }); K.tn(t, { f: 150, f2: 105, dur: .02, g: .05 });
  K.nz(t, { type: 'bandpass', f: 4200, f2: 6000, q: .6, dur: .1, g: .02, a: .02 });
}
function sFeedEnd() {                  // sheet in position: a small mechanical clunk, then the print head wakes
  if (!snd()) return; const t = nowT();
  K.tn(t, { f: 130, f2: 70, dur: .09, g: .22 }); K.nz(t, { type: 'bandpass', f: 1500, f2: 600, q: 1.2, dur: .08, g: .2 }); K.nz(t + .09, { f: 3000, q: 4, dur: .01, g: .1 });
}
function sPrintStart() { if (!snd()) return; const t = nowT(); K.tn(t, { f: 180, f2: 60, dur: .09, g: .3 }); K.nz(t, { type: 'bandpass', f: 800, f2: 300, q: .9, dur: .12, g: .3 }); motorOn(); }
function sPrintDone() { if (!snd()) return; motorOff(); const t = nowT() + .18; K.nz(t, { type: 'bandpass', f: 3800, f2: 1200, q: 2, dur: .11, g: .34 }); K.tn(t + .05, { f: 2400, dur: .55, g: .08, a: .001 }); K.tn(t + .05, { f: 4800, dur: .3, g: .03, a: .001 }); K.tn(t + .05, { f: 6900, dur: .18, g: .012, a: .001 }); }
function sPrintErr() { if (!snd()) return; motorOff(); const t = nowT() + .12; K.tn(t, { f: 118, dur: .13, g: .14, type: 'square' }); K.tn(t + .17, { f: 98, dur: .2, g: .14, type: 'square' }); K.nz(t, { f: 700, q: 1, dur: .3, g: .12 }); }
function sRetract() { if (!snd()) return; motorOn(); const t = nowT(); for (let i = 0; i < 12; i++) { K.nz(t + i * .04, { f: 1800, q: 4, dur: .01, g: .17 }); K.tn(t + i * .04, { f: 120, f2: 70, dur: .03, g: .1 }); } K.nz(t + .5, { f: 1200, q: 2, dur: .05, g: .3 }); setTimeout(motorOff, 520); }
let rasterT = null;
function sRaster(ms) { if (!snd()) return; clearInterval(rasterT); const t0 = performance.now(); rasterT = setInterval(() => { if (performance.now() - t0 > ms) return clearInterval(rasterT); sTick(); }, 36); }
let lastFrameSnd = 0;
function soundFrame() { const n = performance.now(); if (n - lastFrameSnd > 85) { lastFrameSnd = n; sTick(); } }

/* ======================= printer state ======================= */
const lcd = $('prLcdT'), L1 = $('prL1'), L2 = $('prL2'), L3 = $('prL3');
function setPrinter(s) {
  lcd.textContent = s === 'print' ? 'PRINT' : 'READY';
  L1.className = s === 'print' ? '' : 'ok'; L3.className = s === 'error' ? 'bad' : '';
  clearInterval(setPrinter._b);
  if (s === 'print') { let on = true; L2.className = 'on'; setPrinter._b = setInterval(() => { L2.className = (on = !on) ? 'on' : ''; if (!running) clearInterval(setPrinter._b); }, 260); } else L2.className = '';
}
function setRunUI(on) { runKey.classList.toggle('running', on); runKey.innerHTML = '<i class="lamp"></i>' + (on ? ICON_STOP : ICON_RUN) + '<b>' + (on ? 'STOP' : 'RUN') + '</b>'; }
setRunUI(false);

/* ======================= terminal emulator ======================= */
const term = { rows: [''], col: [], fg: null, pend: '', err: new Set(), r: 0, c: 0, saved: [0, 0], screen: false, cr: false };   // col[row][column] = ink colour
function termReset() { term.col = []; term.fg = null; term.pend = ''; term.rows = ['']; term.err = new Set(); term.r = 0; term.c = 0; term.saved = [0, 0]; term.screen = false; term.cr = false; }
function ensureRow(r) { while (term.rows.length <= r) term.rows.push(''); }
function putCh(ch, isErr) {
  ensureRow(term.r); let row = term.rows[term.r];
  if (term.cr) { term.screen = true; term.cr = false; }
  if (term.c > row.length) row = row.padEnd(term.c, ' ');
  term.rows[term.r] = row.slice(0, term.c) + ch + row.slice(term.c + 1); term.c++;
  if (term.fg || term.col[term.r]) (term.col[term.r] || (term.col[term.r] = []))[term.c - 1] = term.fg;
  if (isErr) term.err.add(term.r);
}
function clearAll() { term.col = []; term.rows = ['']; term.err.clear(); term.r = 0; term.c = 0; term.screen = true; term.cr = false; }
const ANSI16 = ['#1b1c20', '#b3262e', '#217a3c', '#9a6b00', '#1f4fa8', '#8a2f8f', '#11747c', '#5b5f66', '#6b7078', '#d23c43', '#2c9a4d', '#b98300', '#2f6bd0', '#a646ac', '#17929c', '#8b9098'];
function sgr(p) {
  const a = String(p || '0').split(';').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < a.length; i++) {
    const n = a[i];
    if (n === 0 || n === 39) term.fg = null;
    else if (n === 38 && a[i + 1] === 2) { term.fg = 'rgb(' + [a[i + 2], a[i + 3], a[i + 4]].map(v => Math.max(0, Math.min(255, v | 0))).join(',') + ')'; i += 4; }
    else if (n === 38 && a[i + 1] === 5) i += 2;
    else if (n >= 30 && n <= 37) term.fg = ANSI16[n - 30];
    else if (n >= 90 && n <= 97) term.fg = ANSI16[n - 82];
  }
}
function csi(p, cmd) {
  const n = parseInt(p, 10);
  switch (cmd) {
    case 'H': case 'f': { const a = p.split(';'); term.r = Math.max(0, (parseInt(a[0], 10) || 1) - 1); term.c = Math.max(0, (parseInt(a[1], 10) || 1) - 1); ensureRow(term.r); term.screen = true; break; }
    case 'J': { const m = isNaN(n) ? 0 : n;
      if (m === 2 || m === 3) clearAll();
      else if (m === 0) { ensureRow(term.r); term.rows.length = term.r + 1; term.rows[term.r] = term.rows[term.r].slice(0, term.c); }
      else if (m === 1) { for (let i = 0; i < term.r; i++) term.rows[i] = ''; ensureRow(term.r); term.rows[term.r] = ' '.repeat(term.c) + term.rows[term.r].slice(term.c); }
      break; }
    case 'K': { const m = isNaN(n) ? 0 : n; ensureRow(term.r); const row = term.rows[term.r];
      term.rows[term.r] = m === 0 ? row.slice(0, term.c) : m === 1 ? ' '.repeat(term.c + 1) + row.slice(term.c + 1) : ''; break; }
    case 'A': term.r = Math.max(0, term.r - (n || 1)); term.screen = true; break;
    case 'B': term.r += (n || 1); ensureRow(term.r); break;
    case 'C': term.c += (n || 1); break;
    case 'D': term.c = Math.max(0, term.c - (n || 1)); break;
    case 'G': term.c = Math.max(0, (n || 1) - 1); break;
    case 's': term.saved = [term.r, term.c]; break;
    case 'u': term.r = term.saved[0]; term.c = term.saved[1]; ensureRow(term.r); break;
    case 'm': sgr(p); break;                          // text colours (the printer prints in colour)
    default: break;                                   // cursor show/hide (?25l) … ignored
  }
}
function termWrite(s, isErr) {
  s = term.pend + s; term.pend = '';
  const cutAt = s.lastIndexOf('');                  // an escape sequence split between two chunks waits for the rest
  if (cutAt >= 0 && /^([[0-9;?]*)?$/.test(s.slice(cutAt))) { term.pend = s.slice(cutAt); s = s.slice(0, cutAt); }
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\x1b') {
      const nx = s[i + 1];
      if (nx === '[') { let j = i + 2; while (j < s.length && !/[A-Za-z@`]/.test(s[j])) j++; csi(s.slice(i + 2, j), s[j]); i = j; continue; }
      if (nx === ']') { let j = i + 2; while (j < s.length && s[j] !== '\x07' && !(s[j] === '\x1b' && s[j + 1] === '\\')) j++; i = s[j] === '\x1b' ? j + 1 : j; continue; }
      if (nx === 'c') { clearAll(); i++; continue; }
      i++; continue;
    }
    if (ch === '\n') { term.r++; term.c = 0; term.cr = false; ensureRow(term.r); }
    else if (ch === '\r') { term.c = 0; if (s[i + 1] !== '\n') term.cr = true; }
    else if (ch === '\b') term.c = Math.max(0, term.c - 1);
    else if (ch === '\f') clearAll();
    else if (ch === '\t') term.c = (Math.floor(term.c / 8) + 1) * 8;
    else if (ch >= ' ') putCh(ch, isErr);
  }
}

/* ======================= white paper: layout + picture of the printout ======================= */
const PW = 560, MX = 34, MTOP = 40, MBOT = 28;       // sheet width = the printer's mouth, margins (scene px)
const media = [];                                     // {kind:'img'|'video'|'text', el, rows, reveal}
let texDirty = true;
const noise = document.createElement('canvas'); noise.width = noise.height = 160;
(() => { const g = noise.getContext('2d'), im = g.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = R() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 7 + R() * 13; } g.putImageData(im, 0, 0); })();

function mediaSize(m, wi) {
  if (m.kind === 'img') { const im = m.el; if (!im.naturalWidth) return null; let w = im.naturalWidth <= 360 ? im.naturalWidth * Math.max(1, Math.floor(Math.min(440, wi) / im.naturalWidth)) : Math.min(wi, im.naturalWidth); let h = im.naturalHeight * w / im.naturalWidth; if (h > 520) { w *= 520 / h; h = 520; } return { w, h }; }
  if (m.kind === 'video') { const v = m.el; const vw = v.videoWidth || 320, vh = v.videoHeight || 180; const w = Math.min(wi, vw); return { w, h: vh * w / vw }; }
  return { w: wi, h: m.rows.length * 15 + 6 };
}
function layoutPaper(rowCap, hmax = Infinity, pageH = 0) {   // pageH: a printed sheet is always a full page (blank below the text)         // hmax: tallest sheet that still fits on the screen → text shrinks so the WHOLE page stays visible
  const all = term.rows; let end = all.length; if (!term.screen) while (end > 1 && !all[end - 1]) end--;
  let from = Math.max(0, end - rowCap), rows = all.slice(from, end); const wi = PW - 2 * MX;
  let maxc = 34; for (const r of rows) if (r.length > maxc) maxc = r.length;
  const dense = maxc > 100;
  let fs = Math.max(9, Math.min(15, wi / maxc / .6)), lh = Math.round(fs * 1.5);
  if (dense) { fs = (PW - 28) / maxc / .55; lh = fs * .9167; }          // Consolas: advance .55em; cell height : width = 5 : 3
  let mediaH = 0, nm = 0; const sizes = [];
  for (const m of media) { const b = mediaSize(m, wi); if (!b) continue; sizes.push({ m, b }); mediaH += b.h + (nm++ ? 14 : 0); }
  const textH = rows.length === 1 && !rows[0] ? 0 : rows.length * lh;
  const avail = hmax - MTOP - MBOT - mediaH - (mediaH && textH ? 14 : 0);
  if (dense && textH > avail && avail > 40) { const k = avail / textH; fs *= k; lh *= k; }
  else if (textH > avail && avail > 40) {                      // squeeze the lines (terminal screens are drawn denser: 1.25 line spacing)
    let lh2 = avail / rows.length, fs2 = Math.min(fs, lh2 / 1.25);
    if (fs2 < 7) { fs2 = 7; lh2 = 8.75; const keep = Math.max(1, Math.floor(avail / lh2)); if (rows.length > keep) { from += rows.length - keep; rows = rows.slice(-keep); } }
    fs = fs2; lh = Math.min(lh, lh2 > fs * 1.25 ? lh2 : fs * 1.25);
  }
  let y = MTOP + (rows.length === 1 && !rows[0] ? 0 : rows.length * lh); const blocks = [];
  for (const { m, b } of sizes) { if (blocks.length || y > MTOP) y += 14; blocks.push({ m, x: MX + (wi - b.w) / 2, y, w: b.w, h: b.h }); y += b.h; }
  return { rows, from, fs, lh, wi, dense, maxc, blocks, Hc: Math.max(pageH, Math.ceil(y + MBOT)) };
}
function paintPaper(L, scale, cvs) {
  cvs.width = Math.max(2, Math.round(PW * scale)); cvs.height = Math.max(2, Math.round(L.Hc * scale));
  const g = cvs.getContext('2d'); g.setTransform(scale, 0, 0, scale, 0, 0);
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, PW, L.Hc);
  g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, PW, L.Hc);
  g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(20,20,26,.55)';
  g.font = L.dense ? `bold ${L.fs}px Consolas, "Courier New", monospace` : `${L.fs}px "Courier New", Courier, monospace`;
  g.shadowBlur = L.dense ? 0 : .7;
  const cw = g.measureText('0').width, x0 = L.dense ? (PW - cw * L.maxc) / 2 : MX;
  L.rows.forEach((r, i) => {
    if (!r) return;
    if (r[0] === '⁣') {                            // a headline row (invisible separator + text): large bold letters, 7 rows tall
      const t = r.slice(1).trim(); let px = L.lh * 7; g.save(); g.shadowBlur = 0; g.font = `bold ${px}px Consolas, "Courier New", monospace`;
      const w = g.measureText(t).width; if (w > PW - 30) { px *= (PW - 30) / w; g.font = `bold ${px}px Consolas, "Courier New", monospace`; }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#141418'; g.fillText(t, PW / 2, MTOP + i * L.lh + L.lh * 3.5); g.restore(); return;
    }
    const y = MTOP + (i + 1) * L.lh - L.lh * (L.dense ? .1 : .3), cols = term.col[L.from + i], plain = term.err.has(L.from + i) ? '#a3222a' : '#1b1c20';
    if (!cols) { g.fillStyle = plain; g.fillText(r, x0, y); return; }
    for (let c = 0; c < r.length;) {                    // runs of the same colour
      const col = cols[c] || null; let e = c + 1; while (e < r.length && (cols[e] || null) === col) e++;
      const piece = r.slice(c, e); if (piece.trim()) { g.fillStyle = col || plain; g.fillText(piece, x0 + c * cw, y); if (L.dense) { g.strokeStyle = g.fillStyle; g.lineWidth = L.fs * .09; g.strokeText(piece, x0 + c * cw, y); } }
      c = e;
    }
  });
  g.shadowBlur = 0;
  for (const b of L.blocks) {
    const m = b.m; g.save();
    if (m.kind === 'text') {
      g.font = '12px "Courier New", monospace'; g.fillStyle = '#3a3d44'; g.beginPath(); g.rect(b.x, b.y, b.w, b.h * m.reveal); g.clip(); m.rows.forEach((r, i) => g.fillText(r, b.x, b.y + 13 + i * 15));
    } else {
      g.beginPath(); g.rect(b.x, b.y, b.w, b.h * (m.reveal == null ? 1 : m.reveal)); g.clip();
      g.imageSmoothingEnabled = !(m.kind === 'img' && m.el.naturalWidth <= 360);
      try { g.drawImage(m.el, b.x, b.y, b.w, b.h); } catch (e) {}
      g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    }
    g.restore();
  }
  return cvs;
}

/* ======================= WebGL: the sheet leaving the printer ======================= */
const glp = el('canvas', 'glp'); glp.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none';
$('stage').after(glp);                                // above the scene, below the panels
let gl = glp.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true }); const GL2 = !!gl;
if (!gl) gl = glp.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec3 aUV;
uniform vec2 uScreen; uniform vec2 uOrigin; uniform float uFit; uniform vec2 uRot; uniform vec2 uPO; uniform float uD;
varying vec3 vN; varying vec2 vUV; varying float vArc;
void main(){
  vec3 p = aPos - vec3(uOrigin, 0.);
  float cb = cos(uRot.y), sb = sin(uRot.y);
  p = vec3(p.x*cb + p.z*sb, p.y, -p.x*sb + p.z*cb);
  float ca = cos(uRot.x), sa = sin(uRot.x);
  p = vec3(p.x, p.y*ca - p.z*sa, p.y*sa + p.z*ca);
  p.xy *= uFit; p.xy += uOrigin;
  float s = uD / (uD - p.z);
  vec2 sc = uPO + (p.xy - uPO) * s;
  gl_Position = vec4(sc.x / uScreen.x * 2. - 1., 1. - sc.y / uScreen.y * 2., 0., 1.);
  vec3 n = aNor; n = vec3(n.x*cb + n.z*sb, n.y, -n.x*sb + n.z*cb); n = vec3(n.x, n.y*ca - n.z*sa, n.y*sa + n.z*ca);
  vN = n; vUV = aUV.xy; vArc = aUV.z;
}`;
const FS = `
precision highp float;
uniform sampler2D uTex; uniform float uLen; uniform float uCap;
varying vec3 vN; varying vec2 vUV; varying float vArc;
void main(){
  vec3 base = texture2D(uTex, vUV).rgb;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(vec3(-.34, -.52, .78));
  float d = max(dot(N, L), 0.);
  float shade = .66 + .42 * d;                                   // soft key light from the upper left
  shade *= mix(.58, 1., smoothstep(0., 52., vArc));              // dark just outside the printer's mouth
  float edge = smoothstep(0., .010, vUV.x) * smoothstep(0., .010, 1. - vUV.x);
  vec3 col = base * shade * mix(.84, 1., edge);
  float a = 1.;
  // (no fade at the top: the sheet is fitted to the screen, so the whole page stays visible)
  gl_FragColor = vec4(col * a, a);
}`;
function shader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
const U = {}; ['uScreen', 'uOrigin', 'uFit', 'uRot', 'uPO', 'uD', 'uTex', 'uLen', 'uCap'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
const NR = 84, NC = 9, vdata = new Float32Array(NR * NC * 9);
const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, vdata.byteLength, gl.DYNAMIC_DRAW);
const idx = []; for (let r = 0; r < NR - 1; r++) for (let c = 0; c < NC - 1; c++) { const a = r * NC + c; idx.push(a, a + 1, a + NC, a + 1, a + NC + 1, a + NC); }
const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
[['aPos', 0], ['aNor', 12], ['aUV', 24]].forEach(([n, off]) => { const l = gl.getAttribLocation(prog, n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 36, off); });
const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, GL2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
const aniso = gl.getExtension('EXT_texture_filter_anisotropic'); if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

/* physics: the sheet is clamped in the printer's mouth and stands up as a cantilever loaded by its own weight (same law as the
   typewriter sheet): slope θ(s) = θ0 + k·(3L²s − 3Ls² + s³). It bends toward the viewer, more the more paper is out. */
const TH0 = .035, TIP = .5, LREF = 560, KB = TIP / (LREF * LREF * LREF), BOW = 9, MAXA = .55;
const slope = (L, s) => TH0 + MAXA * Math.tanh(KB * (3 * L * L * s - 3 * L * s * s + s * s * s) / MAXA);   // cubic law, but a real sheet stiffens: the bend saturates
let slot = { x: 0, y: 0, z: 44 };                     // mouth of the printer in scene (tilt) coordinates
function sheetPoint(L, s) {                           // centre-line point at arc length s (numeric integration)
  const steps = Math.max(1, Math.ceil(s / 4)), ds = s / steps; let y = slot.y, z = slot.z;
  for (let i = 0; i < steps; i++) { const th = slope(L, (i + .5) * ds); y -= Math.cos(th) * ds; z += Math.sin(th) * ds; }
  return { y, z };
}
function proj(x, y, z) {                              // scene → screen, identical to the CSS 3D of #tilt
  const c = K.cam(), a = c.rx * Math.PI / 180, b = c.ry * Math.PI / 180, D = 1500;
  const px = x - c.cx, py = y - c.railY; const X = px * Math.cos(b) + z * Math.sin(b); let Z = -px * Math.sin(b) + z * Math.cos(b);
  const Y = py * Math.cos(a) - Z * Math.sin(a); Z = py * Math.sin(a) + Z * Math.cos(a);
  const s = D / (D - Z), ox = innerWidth / 2, oy = innerHeight * .35;
  return { x: ox + ((X * c.fit + c.cx) - ox) * s, y: oy + ((Y * c.fit + c.railY) - oy) * s };
}
function maxLength() {                                // longest sheet whose top edge stays below the top of the window
  let best = 120;
  for (let m = 160; m <= 1500; m += 40) { const p = sheetPoint(m, m), q = proj(slot.x, p.y, p.z); if (q.y > 78) best = m; else break; }
  return best;
}

const work = document.createElement('canvas');        // texture source (re-painted when the content changes)
let mode = 'live', pageReady = false;      // 'wait' = no output yet · 'page' = a picture: the sheet leaves the printer already printed
let holdPrint = false, hmaxNow = 600, fed = 0, Hc = MTOP + MBOT, open = false, closing = false, running = false, looping = false, lastT = 0, lastVid = 0, uploaded = false;
function uploadPaper() {
  const L = layoutPaper(200, hmaxNow, Math.min(hmaxNow, 780)); Hc = L.Hc;
  paintPaper(L, Math.max(1, Math.min(L.dense ? (running && mode === 'live' ? 2 : 3) : term.screen ? 1.5 : 2, 3900 / L.Hc)), work);   // while an animation runs: a lighter texture; sharp once it stops      // animated "screens" re-upload every frame: a lighter texture keeps them smooth
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, work);
  if (GL2) gl.generateMipmap(gl.TEXTURE_2D);
  uploaded = true; texDirty = false;
}
function drawSheet(Lvis, off) {
  const c = K.cam(), W = innerWidth, Hh = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (glp.width !== Math.round(W * dpr)) { glp.width = Math.round(W * dpr); glp.height = Math.round(Hh * dpr); }
  gl.viewport(0, 0, glp.width, glp.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (Lvis < 1.5) return null;
  let y = slot.y, z = slot.z, top = null; const ds = Lvis / (NR - 1);
  for (let r = 0; r < NR; r++) {
    const s = r * ds;
    if (r > 0) { const thm = slope(Lvis, (r - .5) * ds); y -= Math.cos(thm) * ds; z += Math.sin(thm) * ds; }
    const th = slope(Lvis, s), v = (off + Lvis - s) / Hc, grow = Math.min(1, s / 170);
    for (let k = 0; k < NC; k++) {
      const u = k / (NC - 1), q = 2 * u - 1, o = (r * NC + k) * 9;
      const bz = BOW * grow * (1 - q * q), dzdx = BOW * grow * (-4 * q / PW);
      let nx = -dzdx, ny = Math.sin(th), nz = Math.cos(th); const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      vdata[o] = slot.x + (u - .5) * PW; vdata[o + 1] = y; vdata[o + 2] = z + bz; vdata[o + 3] = nx; vdata[o + 4] = ny; vdata[o + 5] = nz; vdata[o + 6] = u; vdata[o + 7] = v; vdata[o + 8] = s;
    }
    if (r === NR - 1) top = { y, z };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, vdata);
  gl.uniform2f(U.uScreen, W, Hh); gl.uniform2f(U.uOrigin, c.cx, c.railY); gl.uniform1f(U.uFit, c.fit);
  gl.uniform2f(U.uRot, c.rx * Math.PI / 180, c.ry * Math.PI / 180); gl.uniform2f(U.uPO, W / 2, Hh * .35); gl.uniform1f(U.uD, 1500);
  gl.uniform1f(U.uLen, Lvis); gl.uniform1f(U.uCap, off > 0.5 ? 1 : 0); gl.uniform1i(U.uTex, 0);
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  return top;
}
function pframe(now) {
  if (!open) { looping = false; return; }
  const dt = Math.min(60, now - (lastT || now)); lastT = now;
  for (const m of media) { if (m.reveal != null && m.reveal < 1) { m.reveal = Math.min(1, m.reveal + dt / 1500); texDirty = true; } }
  if (now - lastVid > 66 && media.some(m => m.kind === 'video' && m.el.readyState >= 2 && !m.el.paused)) { texDirty = true; lastVid = now; }
  const mlNow = maxLength(); if (Math.abs(mlNow - hmaxNow) > 10) { hmaxNow = mlNow; texDirty = true; }
  if (texDirty || !uploaded) uploadPaper();
  // the paper feeds out (a step with each line, smooth in between) or is pulled back in
  const target = closing || mode === 'wait' || (mode === 'page' && !pageReady) ? 0 : Hc, diff = target - fed;
  if (Math.abs(diff) > .25 && mode === 'page' && pageReady && !closing) {     // slow, steady feed of the printed page
    const mv = Math.min(diff, Math.max(.9, Hc / 520) * dt / 16.7); fed += mv; sFeedRoll(); soundFrame();
  } else if (Math.abs(diff) > .25) {
    const step = closing ? Math.max(16, Math.abs(diff) * .1) : holdPrint ? Math.max(1.2, Math.min(6.2, Math.abs(diff) * .09)) : Math.max(1.5, Math.abs(diff) * .3);
    const mv = Math.sign(diff) * Math.min(Math.abs(diff), step * dt / 16.7); fed += mv; if (!closing && mv > .8) holdPrint ? sFeedRoll() : sSlide();
  } else fed = target;
  if (mode === 'page' && pageReady && !closing && fed >= Hc - .6) { mode = 'live'; pageReady = false; sFeedEnd(); setTimeout(finalize, 250); }
  if (mode === 'live' && holdPrint && !closing && fed >= target - .6) { holdPrint = false; sFeedEnd(); setTimeout(schedule, 420); }   // the blank sheet is out → now the printing starts
  const ml = maxLength(), Lvis = Math.min(fed, ml), off = Math.max(0, fed - Lvis);
  glp.style.display = 'block';
  const top = drawSheet(Lvis, off);
  if (top && Lvis > 50) {                              // small save buttons beside the printer — never on the paper
    const pr = printer.getBoundingClientRect(); bar.classList.add('on');
    const bw = bar.offsetWidth || 60, bh = bar.offsetHeight || 120;
    bar.style.left = Math.max(8, Math.min(innerWidth - bw - 8, pr.right + 12)) + 'px';
    bar.style.top = Math.max(8, Math.min(innerHeight - bh - 8, pr.top + 6)) + 'px';
  }
  else bar.classList.remove('on');
  if (closing && fed < .6) { open = false; closing = false; glp.style.display = 'none'; bar.classList.remove('on'); for (const m of media) if (m.kind === 'video') { try { m.el.pause(); m.el.remove(); } catch (e) {} } media.length = 0; looping = false; return; }
  requestAnimationFrame(pframe);
}
function openPO() { closing = false; if (!open) { open = true; lastT = 0; uploaded = false; } if (!looping) { looping = true; requestAnimationFrame(pframe); } }
function closePO() { if (!open || closing) return; holdPrint = false; mode = 'live'; pageReady = false; if (running) stop(); closing = true; sRetract(); setPrinter('ready'); }
$('poClose').onclick = closePO;
K.onEsc = () => { if (open && !closing) { closePO(); return true; } return false; };

/* ======================= printing pipeline (pace → paper) ======================= */
let queue = [], tickT = null, ended = null, dirty = false, lastRows = 1;
let runN = 0, ctrl = null, errText = '', pipPkg = '', files = [], lastEnv = null;
const rec = { frames: [], t0: 0, last: '', big: false };

function enqueue(text, isErr) { for (const piece of text.split(/(?<=\n)/)) if (piece) queue.push({ s: piece, err: isErr }); schedule(); }
function schedule() { if (!tickT) tickT = setTimeout(tick, 0); }
function tick() {
  tickT = null;
  if (mode === 'wait' || (holdPrint && mode === 'live')) { tickT = setTimeout(tick, 80); return; }          // wait until the blank sheet has fed out of the printer
  let budget = term.screen || mode === 'page' ? Infinity : 1 + Math.floor(queue.length / 18);      // a big burst is printed faster, but still line by line
  while (queue.length && budget > 0) { const p = queue.shift(); termWrite(p.s, p.err); if (p.s.includes('\n')) budget--; }
  if (!dirty) { dirty = true; requestAnimationFrame(onRows); }
  if (queue.length) tickT = setTimeout(tick, term.screen ? 0 : 46);
  else if (ended) { if (mode === 'page') { holdPrint = false; pageReady = true; } else setTimeout(finalize, 60); }
}
function onRows() {
  dirty = false; texDirty = true;
  const rows = term.rows, grew = rows.length - lastRows;
  if (grew > 0) for (let i = 0; i < Math.min(grew, 3); i++) setTimeout(sPrintLine, i * 60); else if (term.screen) soundFrame();
  lastRows = rows.length;
  if (!rec.big) {                                    // frames of small "screens" for MP4 / GIF export
    if (rows.length > 140) rec.big = true;
    else { const snap = rows.join('\n'); if (snap !== rec.last) { rec.last = snap; if (rec.frames.length < 1800) rec.frames.push({ t: performance.now() - rec.t0, rows: rows.slice(), err: new Set(term.err) }); } }
  }
}

/* ======================= talking to the runner ======================= */
const hdr = () => ({ 'Content-Type': 'application/json', 'X-Karetka-Token': API.token });
async function readStream(res, onEv) {
  const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); if (line.trim()) { try { onEv(JSON.parse(line)); } catch (e) {} } }
  }
}
async function loadEnv() { try { lastEnv = await (await fetch('/api/env', { headers: hdr() })).json(); } catch (e) { lastEnv = null; } return lastEnv; }

function resetRun() {
  queue = []; ended = null; termReset(); lastRows = 1; errText = ''; pipPkg = ''; files = []; ++runN;
  for (const m of media) if (m.kind === 'video') { try { m.el.pause(); m.el.remove(); } catch (e) {} }
  media.length = 0; fed = 0; texDirty = true; uploaded = false;                       // a fresh sheet
  rec.frames = []; rec.t0 = performance.now(); rec.last = ''; rec.big = false; poBtns.innerHTML = '';
}
const isPage = s => /[^\r\n]{101,}/.test(s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ''));      // very wide output = a picture made of characters
function decide(s) { if (mode === 'wait') mode = s !== null && isPage(s) ? 'page' : 'live'; }
function detectLang(code) { const first = code.split('\n').find(l => l.trim()) || ''; return /^\s*(?:\/\/|#)\s*(?:js|node|javascript)\b/i.test(first) ? 'js' : 'py'; }

async function startStream(path, payload) {
  resetRun(); holdPrint = true; mode = 'wait'; pageReady = false; openPO(); running = true; setRunUI(true); setPrinter('print'); sPrintStart();
  ctrl = new AbortController(); const myCtrl = ctrl;
  try {
    const res = await fetch(path, { method: 'POST', headers: hdr(), body: JSON.stringify(payload), signal: ctrl.signal });
    if (!res.ok || !res.body) { decide(null); enqueue(`сервер қатесі ${res.status}: ${await res.text().catch(() => '')}\n`, true); ended = { code: 1, ms: 0, files: [] }; schedule(); return; }
    await readStream(res, ev => {
      if (ev.t === 'out') { decide(ev.s); enqueue(ev.s, false); }
      else if (ev.t === 'err') { errText += ev.s; decide(null); enqueue(ev.s, true); }
      else if (ev.t === 'end') { decide(null); ended = ev; schedule(); }
    });
    if (!ended && myCtrl === ctrl) { ended = { code: 1, ms: 0, files: [] }; schedule(); }
  } catch (e) {
    if (myCtrl !== ctrl) return;
    decide(null);
    if (e.name === 'AbortError') ended = { code: 130, ms: Math.round(performance.now() - rec.t0), files: [] };
    else { enqueue('серверге қосыла алмадым: ' + e.message + '\n', true); ended = { code: 1, ms: 0, files: [] }; }
    schedule();
  }
}
async function run() {
  if (running) return stop();
  if (!API) { K.toast('Run үшін «Каретка» ярлығынан ашыңыз (локальды сервер керек)'); return; }
  const code = K.getCode();
  if (!code.trim()) { K.toast('Алдымен қағазға код жазыңыз'); return; }
  if (!lastEnv) await loadEnv();
  startStream('/api/run', { code, lang: detectLang(code) });
}
function stop() { if (ctrl) ctrl.abort(); }
runKey.addEventListener('pointerdown', () => sRunKey(true));
runKey.addEventListener('pointerup', () => sRunKey(false));
runKey.addEventListener('click', () => run());
window.addEventListener('karetka:run', () => { runKey.classList.add('down'); sRunKey(true); setTimeout(() => { runKey.classList.remove('down'); sRunKey(false); }, 110); run(); });

/* ======================= finishing: files, buttons ======================= */
const IMG = /\.(png|jpe?g|gif|webp|svg)$/i, VID = /\.(mp4|webm)$/i, TXT = /\.(txt|csv|json|md|log)$/i;
async function finalize() {
  if (!ended) return;
  const e = ended; ended = null; running = false; setRunUI(false); texDirty = true;
  const ok = e.code === 0, stopped = e.code === 130;
  setPrinter(ok || stopped ? 'ready' : 'error'); ok ? sPrintDone() : stopped ? (motorOff(), sTick()) : sPrintErr();
  const m = /No module named '([\w.]+)'/.exec(errText);
  if (m) { const root = m[1].split('.')[0]; pipPkg = ({ PIL: 'pillow', cv2: 'opencv-python', qrcode: 'qrcode[pil]', yaml: 'pyyaml', sklearn: 'scikit-learn', bs4: 'beautifulsoup4' })[root] || root; }
  files = (e.files || []).map(f => Object.assign({}, f, { ext: (f.name.split('.').pop() || 'file').toLowerCase() }));
  buildButtons();
  for (const f of files) await showFile(f);
}
async function showFile(f) {
  if (!open || closing) return;
  if (IMG.test(f.name)) {
    const img = new Image(); img.src = f.url; await new Promise(r => { img.onload = r; img.onerror = r; });
    if (!img.naturalWidth) return;
    media.push({ kind: 'img', el: img, reveal: 0 }); texDirty = true; sRaster(1500); await sleep(1600);
  } else if (VID.test(f.name)) {
    const v = document.createElement('video'); v.src = f.url; v.loop = true; v.muted = true; v.autoplay = true; v.playsInline = true; v.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px';
    document.body.appendChild(v); await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 2500); });
    if (!v.videoWidth) { v.remove(); return; }
    try { await v.play(); } catch (e) {}
    media.push({ kind: 'video', el: v }); texDirty = true; sRaster(700); await sleep(500);
  } else if (TXT.test(f.name) && f.size < 30000) {
    try { const t = await (await fetch(f.url)).text(); media.push({ kind: 'text', rows: t.replace(/\r/g, '').split('\n').slice(0, 40), reveal: 0 }); texDirty = true; sPrintLine(); await sleep(400); } catch (e) {}
  }
}

/* ======================= downloads ======================= */
function saveBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000); K.toast(name + ' сақталды — «Жүктемелер» папкасы');
}
function btn(label, title, fn, cls) { const b = el('button', null, 'poBtn' + (cls ? ' ' + cls : '')); b.textContent = label; b.title = title; b.onclick = () => { K.sUi(true); setTimeout(() => K.sUi(false), 60); fn(); }; return b; }
const animOK = () => !rec.big && rec.frames.length >= 3 && (term.screen || rec.frames[rec.frames.length - 1].t > 1500);
function buildButtons() {
  poBtns.innerHTML = '';
  if (pipPkg) poBtns.append(btn('pip install ' + pipPkg, 'Модульді орнату', () => pipInstall(pipPkg), 'warn'));
  const seen = {};
  files.forEach(f => { seen[f.ext] = (seen[f.ext] || 0) + 1; poBtns.append(btn('↓ ' + f.ext.toUpperCase() + (seen[f.ext] > 1 ? ' ' + seen[f.ext] : ''), f.name, () => { const a = document.createElement('a'); a.href = f.url + '&dl=1'; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); K.toast(f.name + ' жүктелуде'); })); });
  poBtns.append(btn('TXT', 'Шығысты мәтін ретінде сақтау', saveTxt), btn('PNG', 'Басылған бетті сурет ретінде сақтау', savePng));
  if (animOK()) poBtns.append(btn('MP4', 'Анимацияны MP4 ретінде сақтау', () => exportAnim('mp4')), btn('GIF', 'Анимацияны GIF ретінде сақтау', () => exportAnim('gif')));
}
function saveTxt() { saveBlob(new Blob([term.rows.join('\n').replace(/\s+$/, '') + '\n'], { type: 'text/plain;charset=utf-8' }), 'karetka-output.txt'); }
function savePng() {
  const L = layoutPaper(400), c = document.createElement('canvas'); paintPaper(L, Math.max(1, Math.min(2, 3900 / L.Hc)), c);
  c.toBlob(b => saveBlob(b, 'karetka-printout.png'), 'image/png');
}
/* one frame of an animation on white paper (fixed size so the video doesn't jump) */
function frameCanvas(rows, errSet, fixed) {
  const FS = 16, LH = 23, PX = 40, PY = 36, m = document.createElement('canvas').getContext('2d'); m.font = `${FS}px "Courier New", Courier, monospace`;
  const cw = m.measureText('M').width, W = Math.ceil(PX * 2 + fixed.cols * cw), Hh = PY * 2 + fixed.rows * LH;
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, Hh); g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, W, Hh);
  g.font = `${FS}px "Courier New", Courier, monospace`; g.shadowBlur = .7; g.shadowColor = 'rgba(20,20,26,.5)';
  for (let i = 0; i < rows.length; i++) { if (!rows[i]) continue; g.fillStyle = errSet && errSet.has(i) ? '#a3222a' : '#1b1c20'; g.fillText(rows[i], PX, PY + (i + 1) * LH - 6); }
  return c;
}
async function exportAnim(fmt) {
  if (!lastEnv) await loadEnv();
  if (lastEnv && !lastEnv.ffmpeg) { K.toast('MP4/GIF үшін ffmpeg керек (табылмады)'); return; }
  const fr = rec.frames, dur = fr[fr.length - 1].t + 900, fps = dur < 4000 ? 20 : 12, n = Math.min(600, Math.ceil(dur / 1000 * fps));
  const fixed = { cols: Math.max(40, ...fr.map(f => Math.max(...f.rows.map(r => r.length)))), rows: Math.max(...fr.map(f => f.rows.length)) };
  K.toast('Анимация кодталып жатыр…');
  const urls = []; let fi = 0, lastFi = -1, lastUrl = '';
  for (let k = 0; k < n; k++) { const t = k * 1000 / fps; while (fi + 1 < fr.length && fr[fi + 1].t <= t) fi++; if (fi !== lastFi) { lastUrl = frameCanvas(fr[fi].rows, fr[fi].err, fixed).toDataURL('image/png'); lastFi = fi; } urls.push(lastUrl); if (k % 40 === 39) await sleep(0); }
  try {
    const r = await fetch('/api/encode', { method: 'POST', headers: hdr(), body: JSON.stringify({ fmt, fps, frames: urls }) });
    if (!r.ok) { K.toast('Кодтау қатесі: ' + (await r.text()).slice(0, 120)); return; }
    saveBlob(await r.blob(), 'karetka-animation.' + fmt);
  } catch (e) { K.toast('Кодтау қатесі: ' + e.message); }
}
async function pipInstall(pkg) {
  await startStream('/api/pip', { pkg });
  const iv = setInterval(() => { if (!running) { clearInterval(iv); if (/Successfully installed|already satisfied/i.test(term.rows.join('\n'))) { K.toast(pkg + ' орнатылды — RUN қайта басыңыз'); lastEnv = null; } } }, 400);
}

/* ======================= placement in the scene + heartbeat ======================= */
K.onLayout = m => {
  const { railY, cx } = m, put = (e, l, t) => { e.style.left = l + 'px'; e.style.top = t + 'px'; };
  put(runKey, cx - 512, railY + 74);                  // clear of the printer: a visible gap on the deck
  put(printer, cx - 310, railY + 132);
  slot = { x: cx, y: railY + 132 + 6 + 7.5, z: 44 };  // the printer's mouth
};
if (API) { const ping = () => fetch('/api/ping', { headers: { 'X-Karetka-Token': API.token } }).catch(() => {}); ping(); setInterval(ping, 8000); loadEnv(); }
else { runKey.style.filter = 'grayscale(.6) brightness(.85)'; runKey.title = 'Run: «Каретка» ярлығымен ашқанда жұмыс істейді (локальды сервер керек)'; }
K.layout();
})();
