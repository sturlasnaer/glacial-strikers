// Browser smoke: plays whole seasons of a career in headless Chrome, every league game won on
// the spot, clicking through everything after it (results, the locker room, the press, the
// Cup and its story scene, awards night, Draft Day, a new season and the division's welcome),
// and reports the page's errors. Needs the game served locally (python3 tools/serve.py 8767).
//   node tools/smoke_seasons.mjs [club=ravens] [url=http://127.0.0.1:8767/index.html?nosw=1]
//   (club: foxes, lynx, comets, owls, rams, moose, ravens, royals or custom)
// Chrome is closed with Browser.close (a kill leaks a big code-sign clone on macOS); the save is
// cleared afterwards and nothing goes online (settings.online is off).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLUB = process.argv[2] || 'ravens', URL = process.argv[3] || 'http://127.0.0.1:8767/index.html?nosw=1';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 500), prof = mkdtempSync(join(tmpdir(), 'puckbound-smoke-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=960,540', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const exited = new Promise((r) => chrome.on('exit', r));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ } }
if (!target) { console.log('no chrome'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map(), logs = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 400));
});
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const run = async (code) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${code} })()`, awaitPromise: true, returnByValue: true, timeout: 600000 });
  return r.result.exceptionDetails ? { exception: String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 600) } : r.result.result.value;
};
let fail = 0;
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: URL }); await sleep(5000);
  const out = await run(`const CLUB = ${JSON.stringify(CLUB)};\nfor (let i = 0; i < 120; i++) { if (window.__app && window.__app.ui && !document.querySelector('#loading')) break; await new Promise(r => setTimeout(r, 250)); }
window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message))); window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej: ' + String(e.reason && e.reason.message || e.reason)));
const app = window.__app, sleep = (ms) => new Promise(r => setTimeout(r, ms));
const seen = new Set(), log = [];
const note = () => { const d = document.querySelector('.dlg-text, .dlg-line'); const h = document.querySelector('.modal h2, .modal h1'); if (h) seen.add('modal: ' + h.innerText.slice(0, 60)); const txt = document.body.innerText; for (const k of ['Frostline champions', 'go national', 'National Cup! New rinks', 'new table', 'Draft Day', 'Frostline Awards', 'FROSTLINE AWARDS']) if (txt.includes(k)) seen.add(k); };
const SEL = ['#club-save', '#dr-yes', '#name-now', '[data-pick="0"]', '#dr-later', '#aw-next', '#as-go', '#vs-go', '#plan-go', '#dlg-skip', '[data-lm="0"]', '#lm-go', '[data-pc="0"]', '#pc-go', '#hc-go', '#c-go', '#r-go', '#rv-go', '#ch-go', '#ns-skip', '[data-close]'];
const advance = async () => { note(); for (const q of SEL) { const b = [...document.querySelectorAll(q)].find(e => e.offsetParent !== null && !e.disabled); if (b) { b.click(); return q; } } return null; };
app.save.settings.online = false;
if (CLUB !== 'foxes') { app.chooseClub(CLUB); await sleep(2500); } else { app.save.clubPicked = true; app.save.seenIntro = true; }
for (let k = 0; k < 8; k++) { if (!(await advance())) break; await sleep(400); }
const s = app.save; s.settings.online = false; s.settings.race = false; s.seenIntro = true; s.seenWhatsNew = '2026-10-11l'; s.guide = { done: [], off: true, hints: [] }; if (app.scene !== 'hub') { app.goHub(); await sleep(800); }
let games = 0;
for (let step = 0; step < 500; step++) {
  if (app.scene === 'match') { const m = app.match; m.score = [5, 1]; m.state = 'over'; app.endMatch(); games++; await sleep(600); continue; }
  if (app.scene === 'hub' && !document.querySelector('.modal-bg')) {
    const f = app.fixture();
    if (f && f.kind === 'allstar') s.league.allstar = { skipped: true };
    if (f && f.kind === 'classic') s.league.classic = { opp: f.opponent, gf: 1, ga: 0, won: true };
    if (app.fixture()) { app.startStage(); await sleep(700); continue; }
    const d = document.querySelector('#h-draft'), ns = document.querySelector('#h-season');
    if (d) { d.click(); log.push('draft'); await sleep(900); continue; }
    if (ns) { if (s.season >= 2 && log.includes('season2')) break; ns.click(); log.push('newseason'); await sleep(1500); continue; }
  }
  const q = await advance(); if (!q) await sleep(300); else await sleep(350);
  if (s.season >= 2 && !log.includes('season2')) log.push('season2');
}
return { games, season: s.season, tier: s.tier, payoffs: s.payoffs, seen: [...seen], log: log.slice(-8), errs: window.__errs };
`);
  console.log(JSON.stringify({ club: CLUB, ...out, seen: undefined }, null, 1));
  if (!out || out.exception || (out.errs && out.errs.length) || logs.length || !(out.games > 0)) fail = 1;
  await run('localStorage.clear(); return 1');
} finally {
  if (logs.length) console.log('page errors:\n' + logs.slice(0, 20).join('\n'));
  await Promise.race([send('Browser.close'), sleep(2000)]);
  await Promise.race([exited, sleep(8000)]);
  try { rmSync(prof, { recursive: true, force: true }); } catch { /* still in use */ }
}
console.log(fail ? 'smoke: FAILED' : 'smoke: ok');
process.exit(fail);
