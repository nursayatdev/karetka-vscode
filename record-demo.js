'use strict';
/* Каретка — records the TikTok demo (/demo?rec=1) to an MP4 with picture AND sound.
   Usage:  node record-demo.js [--speed 1.5] [--out karetka-demo.mp4] [--w 1280] [--h 720]
   Picture: Edge DevTools screencast of the page only (no taskbar, no other windows). Sound: the demo page mixes its own audio graph
   (mouse, typewriter, printer…) into a MediaRecorder. ffmpeg then joins both into H.264/AAC in ./output. */
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), cp = require('child_process');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const SPEED = opt('--speed', '1.5'), OUTNAME = opt('--out', 'karetka-demo.mp4'), VW = parseInt(opt('--w', '1280'), 10), VH = parseInt(opt('--h', '720'), 10);
const SCENE = opt('--scene', ''), DSF = parseFloat(opt('--dsf', SCENE ? '1.5' : '1'));
const PORT = SCENE ? 47832 : 47831, UP = 47990, DBG = 9333;      // the eye scene uses its own runner opened on the demo project
const PROJECT = path.join(os.homedir(), 'Desktop', SCENE === 'cat' ? 'neural-cat' : 'eye-project');
const OUT = path.join(__dirname, 'output'); fs.mkdirSync(OUT, { recursive: true });
const AUD = path.join(OUT, '_audio.webm'), MP4 = path.join(OUT, OUTNAME);
const TMP = path.join(__dirname, 'output', '_tmp'); fs.mkdirSync(TMP, { recursive: true });       // on this drive: frames take 1-2 GB, keep them off the system disk
const FR = path.join(TMP, 'frames-' + Date.now()); fs.mkdirSync(FR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);
const run = (cmd, args) => new Promise((res, rej) => { const f = cp.spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }); let e = ''; f.stderr.on('data', d => e = (e + d).slice(-1500)); f.on('close', c => c === 0 ? res() : rej(new Error(cmd + ': ' + e))); });

async function alive() { try { const r = await fetch(`http://127.0.0.1:${PORT}/api/whoami`); return (await r.json()).app === 'karetka'; } catch (e) { return false; } }

(async () => {
  let ownServer = null;
  if (SCENE === 'eye') {                                    // start state: the code says W = 90, the person changes it to 110
    const py = path.join(PROJECT, 'eye.py'); fs.writeFileSync(py, fs.readFileSync(py, 'utf8').replace(/^W = \d+/m, 'W = 90'));
    try { fs.unlinkSync(path.join(PROJECT, 'eye_digits.png')); } catch (e) {}
  }
  if (!(await alive())) {
    ownServer = cp.spawn(process.execPath, [path.join(__dirname, 'server.js'), '--port', String(PORT), '--no-exit', ...(SCENE ? ['--workspace', PROJECT] : [])], { windowsHide: true, stdio: 'ignore', env: { ...process.env, TEMP: TMP, TMP: TMP } });
    for (let i = 0; i < 40 && !(await alive()); i++) await sleep(200);
    if (!(await alive())) throw new Error('runner did not start');
  }
  log('runner ok');

  try { fs.unlinkSync(AUD); } catch (e) {}
  let uploaded = false;
  const rx = http.createServer((req, res) => {
    const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
    if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
    const ws = fs.createWriteStream(AUD); req.pipe(ws); ws.on('finish', () => { uploaded = true; res.writeHead(200, h); res.end('ok'); });
  }).listen(UP, '127.0.0.1');

  const edge = [process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe', process.env.ProgramFiles + '\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => fs.existsSync(p));
  if (!edge) throw new Error('Microsoft Edge not found');
  const prof = path.join(TMP, 'edge-' + Date.now());
  const url = `http://127.0.0.1:${PORT}/demo?rec=1&scene=${SCENE}&speed=${SPEED}&up=${encodeURIComponent(`http://127.0.0.1:${UP}/up`)}`;
  const proc = cp.spawn(edge, [`--app=${url}`, `--user-data-dir=${prof}`, `--remote-debugging-port=${DBG}`, '--window-position=0,0', `--window-size=${VW + 16},${VH + 70}`,
    '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion,Translate,TranslateUI', `--force-device-scale-factor=${DSF}`], { stdio: 'ignore', env: { ...process.env, TEMP: TMP, TMP: TMP } });
  log('edge started');

  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(300); try { const l = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); target = l.find(t => t.type === 'page' && /\/demo/.test(t.url)); } catch (e) {} }
  if (!target) throw new Error('page target not found');
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const frames = []; let nf = 0, writing = 0;
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Page.screencastFrame') {
      const { data, metadata, sessionId } = m.params, name = path.join(FR, 'f' + String(++nf).padStart(6, '0') + '.jpg');
      frames.push({ ts: metadata.timestamp, name });
      writing++; fs.writeFile(name, Buffer.from(data, 'base64'), () => writing--);
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId } }));
    }
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr, gesture) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, userGesture: !!gesture }); return r.result && r.result.result && r.result.result.value; };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DSF, mobile: false });
  for (let i = 0; i < 50 && (await ev('typeof window.__startRec')) !== 'function'; i++) await sleep(200);
  await sleep(1200);
  await send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: Math.round(VW * DSF), maxHeight: Math.round(VH * DSF), everyNthFrame: 1 });
  await sleep(600);
  log('start recording (viewport ' + VW + 'x' + VH + ', speed ' + SPEED + ')');
  await ev('window.__startRec(); 1', true);

  const t0 = Date.now(); let last = '';
  for (;;) {
    await sleep(2000);
    const s = await ev('JSON.stringify(window.__rec)'); if (s !== last) { log('state', s); last = s; }
    if (/"state":"(done|error)"/.test(s || '')) break;
    if (Date.now() - t0 > 10 * 60e3) throw new Error('timeout');
  }
  const audioT0 = JSON.parse(last).t0;
  try { await send('Page.stopScreencast'); } catch (e) {}
  for (let i = 0; i < 40 && (!uploaded || writing); i++) await sleep(200);
  try { await send('Browser.close'); } catch (e) {}
  await sleep(500); try { proc.kill(); } catch (e) {}
  rx.close(); if (ownServer) try { ownServer.kill(); } catch (e) {}
  if (!fs.existsSync(AUD)) throw new Error('no audio received (' + last + ')');
  if (frames.length < 30) throw new Error('too few frames: ' + frames.length);
  log('frames', frames.length, 'audio', Math.round(fs.statSync(AUD).size / 1e4) / 100, 'MB');

  // concat list with the real timing of every frame
  const t00 = frames[0].ts;
  const list = frames.map((f, i) => `file '${f.name.replace(/\\/g, '/')}'\nduration ${Math.max(.001, (i + 1 < frames.length ? frames[i + 1].ts - f.ts : .5)).toFixed(4)}`).join('\n') + `\nfile '${frames[frames.length - 1].name.replace(/\\/g, '/')}'\n`;
  const LST = path.join(FR, 'list.txt'); fs.writeFileSync(LST, list);
  const off = (audioT0 - t00 * 1000) / 1000;                       // audio starts this many seconds after the first video frame
  log('audio offset', off.toFixed(3), 's');
  const aIn = off >= 0 ? ['-itsoffset', off.toFixed(3), '-i', AUD] : ['-ss', (-off).toFixed(3), '-i', AUD];
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', LST, ...aIn, '-vf', `fps=30,scale=${Math.round(VW * DSF)}:${Math.round(VH * DSF)}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-af', 'apad', '-shortest', '-movflags', '+faststart', MP4]);
  try { fs.unlinkSync(AUD); } catch (e) {}
  try { fs.rmSync(FR, { recursive: true, force: true }); fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  log('DONE', MP4, Math.round(fs.statSync(MP4).size / 1e5) / 10, 'MB');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); try { fs.rmSync(FR, { recursive: true, force: true }); } catch (_) {} process.exit(1); });
