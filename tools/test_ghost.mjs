// Ghost runs: a bot skates Cone Weave, its run is recorded, packed and unpacked, then it
// races its own ghost (gate splits, and the result against it).
//   node tools/test_ghost.mjs
import { Match } from '../src/match.js';
import { createDrill } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { GhostRecorder, decodeGhost, ghostAt, GHOST_HZ } from '../src/ghost.js';

let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };
const raw = (o = {}) => ({ mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false, ...o });
const toward = (s, x, y) => { const dx = x - s.x, dy = y - s.y, l = Math.hypot(dx, dy) || 1; return { mx: dx / l, my: dy / l }; };
const save = newSave();

function run(opts = {}, slow = 1) {
  const { cfg, ctrl } = createDrill('cones', save, 'thunder', { seed: 7, ...opts });
  const m = new Match(cfg);
  let tap = 0;
  for (let i = 0; i < 60 * 70 && m.state !== 'drill_over'; i++) {
    const s = m.controlled(), g = ctrl.gates[ctrl.next];
    const t = g ? toward(s, g.x + 40, g.y) : toward(s, 520, 0);
    tap++;
    m.setHumanInput(raw({ mx: t.mx * slow, my: t.my * slow, sprint: slow === 1 && s.stamina > 25, a: !g && s.x > 440 && tap % 10 < 1 }));
    m.update(1 / 60);
  }
  return { m, ctrl, res: ctrl.result };
}

// packing: a path survives the round trip to within a unit
{
  const r = new GhostRecorder();
  for (let i = 0; i <= 60; i++) r.update(i / 60, { x: -560 + i * 5.3, y: Math.sin(i / 9) * 70, face: i / 20 });
  const back = decodeGhost(r.encode());
  check('15 samples a second', back.length === 16, back.length); // (one second of samples, both ends)
  const last = back[back.length - 1];
  check('path round trip', Math.abs(last.x - (-560 + 60 * 5.3)) <= 1 && Math.abs(last.y - Math.sin(60 / 9) * 70) <= 1, last);
  check('facing round trip', Math.abs(last.face - 3) < 0.03, last.face);
  check('garbage is no path', decodeGhost('###') === null && decodeGhost('AAAA') === null);
  const mid = ghostAt(back, 0.5);
  check('eased between samples', mid.x > back[7].x && mid.x < back[8].x + 1 && !mid.done && ghostAt(back, 5).done);
}

// a full run is recorded with its splits
const a = run();
check('run finished', a.res && !a.res.timeout, a.res);
const path = a.res.ghost.path, splits = a.res.ghost.splits;
const samples = decodeGhost(path);
const secs = (samples.length - 1) / GHOST_HZ;
check('ghost covers the run', Math.abs(secs - a.ctrl.t) < 0.15, [secs, a.ctrl.t]);
check('nine splits, rising', splits.length === 9 && splits.every((v, i) => !i || v > splits[i - 1]), splits);
check('path fits the server limit', path.length < 6000, path.length);
check('it ends at the net', samples[samples.length - 1].x > 380, samples[samples.length - 1]);

// racing it: the same bot, slower, falls behind at the gates and loses to the ghost
const ghost = { path, splits, score: a.res.score, char: 'thunder', label: 'Best' };
const b = run({ ghost }, 0.8);
check('raced the ghost', b.ctrl.ghost && b.res.vsLabel === 'Best', b.res);
check('slower run is behind at the gates', b.ctrl.split && b.ctrl.split.delta > 0, b.ctrl.split);
check('and loses to it', b.res.vs > 0 && Math.abs(b.res.vs - (b.res.score - a.res.score)) < 0.011, [b.res.vs, b.res.score, a.res.score]);
check('the HUD says so', /behind you|ahead of you/.test(b.ctrl.hud(b.m).note), b.ctrl.hud(b.m).note);
const c = run({ ghost });
check('the same run ties it', Math.abs(c.res.vs) < 0.05, c.res.vs);

console.log(`ghosts: ${ok} passed, ${fail} failed  (run ${a.res.score}s, ${samples.length} samples, ${path.length} chars)`);
process.exit(fail ? 1 : 0);
