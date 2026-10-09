// Ghost runs: a bot skates Cone Weave, its run is recorded, packed and unpacked, then it
// races its own ghost (gate splits, and the result against it).
//   node tools/test_ghost.mjs
import { Match } from '../src/match.js';
import { createDrill } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { GhostRecorder, decodeGhost, ghostAt, GHOST_HZ } from '../src/ghost.js';
import { cleanRun } from '../server/leaderboard.mjs';
import { GOAL_X } from '../src/rink.js';

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
check('the server takes the run', cleanRun('cones', { ...a.res.ghost, char: 'thunder' }, a.res.score) !== null);
check('the result line', /behind you|ahead of you/.test(b.res.vsLine) && b.res.vsWon === false, b.res);

// Breakaway: five attempts, each a skater path, a puck path and how it ended
function breakaway(opts = {}, aimY = 22) {
  const { cfg, ctrl } = createDrill('breakaway', save, 'frost', { seed: 9, ...opts });
  const m = new Match(cfg);
  for (let i = 0; i < 60 * 80 && m.state !== 'drill_over'; i++) {
    const s = m.controlled();
    const close = s.x > GOAL_X - 190;
    const t = toward(s, GOAL_X - 120, aimY * Math.sign(s.y || 1));
    m.setHumanInput(raw({ mx: close ? 0.3 : t.mx, my: close ? (s.y > 0 ? -1 : 1) : t.my, a: close && ctrl.phase === 'run' && i % 8 === 0 }));
    m.update(1 / 60);
  }
  return { m, ctrl, res: ctrl.result };
}
const ba = breakaway();
const runB = ba.res && ba.res.ghost;
check('breakaway finished with five attempts', runB && runB.attempts.length === 5, ba.res);
check('goals match the attempts', runB.attempts.filter((x) => x.result === 'goal').length === ba.res.score, [ba.res.score, runB.attempts.map((x) => x.result)]);
check('each attempt has both paths', runB.attempts.every((x) => decodeGhost(x.path).length > 3 && decodeGhost(x.puck).length > 3));
check('the server takes the breakaway run', cleanRun('breakaway', { ...runB, char: 'frost' }, ba.res.score) !== null);
const bb = breakaway({ ghost: { ...runB, char: 'frost', score: ba.res.score, label: 'Best' } }, 70);
check('raced the breakaway ghost', bb.ctrl.ghost && bb.ctrl.ghost.att.length === 5);
check('its record in the HUD', /^Best: [●○·]( [●○·]){4}$/.test(bb.ctrl.hud(bb.m).note), bb.ctrl.hud(bb.m).note);
check('the result line', typeof bb.res.vsLine === 'string' && /Best: \d goals? · (you win|they win|a tie)/.test(bb.res.vsLine), bb.res.vsLine);
check('ghost sprites draw', bb.ctrl.sprites(bb.m, { drawRaceGhost() {}, drawGhostPuck() {} }).length === 2);

// Sniper: the AI shoots the run (the player's skater too), it's kept with the pace, and the
// next run brings it back as a ghost with its hits
function sniper(best = null) {
  const s0 = newSave();
  if (best) s0.paces = { sniper: best };
  const { cfg, ctrl } = createDrill('sniper', s0, 'thunder', { seed: 5 });
  const m = new Match(cfg);
  m.humans = [];
  for (let i = 0; i < 60 * 50 && m.state !== 'drill_over'; i++) m.update(1 / 60);
  return { m, ctrl, res: ctrl.result };
}
const sa = sniper();
const race = sa.res && sa.res.race;
check('sniper run recorded', race && decodeGhost(race.path).length > 600 && decodeGhost(race.puck).length > 600 && race.char === 'thunder', race && [race.path.length, race.char]);
check('...its hits, one a target hit', Array.isArray(race.lit) && race.lit.length === sa.res.hits && race.lit.every(([at, i]) => at > 0 && at <= 45 && i >= 0 && i < 3), [race.lit, sa.res.hits]);
const sb = sniper({ score: sa.res.score, pace: sa.res.pace, race });
check('...comes back as a ghost', sb.ctrl.ghost && sb.ctrl.ghost.lit.length === race.lit.length && sb.ctrl.ghostS);
check('...its sprites draw', sb.ctrl.sprites(sb.m, { drawRaceGhost() {}, drawGhostPuck() {} }).length === 2);
check('...an old best without a run: no ghost', !sniper({ score: 100, pace: [[0, 0]] }).ctrl.ghost);

console.log(`ghosts: ${ok} passed, ${fail} failed  (run ${a.res.score}s, ${samples.length} samples, ${path.length} chars; breakaway ${ba.res.score}/5 vs ${bb.res.score}/5)`);
process.exit(fail ? 1 : 0);
