// Puck Party: no goalies, no opponents, a puck dropped away from the skater, the nets and the
// boards; a goal in either net counts and the next puck drops elsewhere; ten goals end it,
// timed, with medals at 120, 75 and 45 seconds; no online board; Simple controls work in it.
//   node tools/test_puckparty.mjs
import { createDrill, DRILLS, medalFor, PARTY_GOALS } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { Match } from '../src/match.js';
import { GOAL_X } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const { cfg, ctrl, def } = createDrill('puckparty', newSave(), 'frost', { seed: 3 });
const m = new Match(cfg);
check('no goalies, nobody else on the ice', m.goalies.every((g) => g.disabled) && m.teamSkaters(1).length === 0 && m.teamSkaters(0).length === 1);
const p = m.puck, s = m.controlled();
check('a loose puck, away from the skater', !p.owner && Math.hypot(p.x - s.x, p.y - s.y) > 150 && Math.abs(p.x) < 450);
// score ten: carry it to the nearer net each time
let f = 0;
while (!ctrl.result && f < 60 * 300) {
  const c = m.controlled(), q = m.puck;
  let inp = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false };
  if (m.state === 'play') {
    const side = (q.x >= 0 ? 1 : -1), tx = c.hasPuck ? side * GOAL_X : q.x, ty = c.hasPuck ? 0 : q.y;
    const d = Math.hypot(tx - c.x, ty - c.y) || 1;
    inp = { ...inp, mx: (tx - c.x) / d, my: (ty - c.y) / d, sprint: true, a: c.hasPuck && Math.abs(side * GOAL_X - c.x) < 200 && f % 12 < 2 };
  }
  m.setHumanInput(inp); m.update(1 / 60); f++;
}
check(`ten goals end it, timed`, ctrl.result && ctrl.goals === PARTY_GOALS && ctrl.result.score > 5 && ctrl.result.score < 300, [ctrl.goals, ctrl.result]);
check('medals at 120, 75 and 45 seconds', medalFor(def, 125) === 0 && medalFor(def, 100) === 1 && medalFor(def, 60) === 2 && medalFor(def, 40) === 3);
check('just for fun: no online board', DRILLS.puckparty.offline);

{
  const k = createDrill('puckparty', newSave(), 'frost', { seed: 4 });
  const km = new Match({ ...k.cfg, simple: true });
  check('Simple controls work in it', km.simpleSeat(0, 0));
}

console.log(`Puck Party: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
