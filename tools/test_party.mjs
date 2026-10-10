// The shootout party (2 Players › Shootout): player 1 shoots for us, player 2 for the rival,
// taking turns; both goalies are the computer's; a whole party ends with a winner.
//   node tools/test_party.mjs
import { createDrill } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { Match } from '../src/match.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const idle = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false };

const { cfg, ctrl } = createDrill('party', newSave(), 'frost', { teamId: 'rams', seed: 9 });
const m = new Match(cfg);
check('two players', JSON.stringify(m.humans) === '[0,1]' && ctrl.party);
check('player 1 shoots first, for us', ctrl.turn === 'us' && m.controlled(0) === ctrl.active && !m.controlled(1));
check('...no goalie is a player', m.goalies.every((g) => !g.human));
// their turn
ctrl.end(m, false); ctrl.advance(m);
check('then player 2 shoots, for them', ctrl.turn === 'them' && m.controlled(1) === ctrl.active && ctrl.active.team === 1 && !m.controlled(0));
check('...still no goalie a player', m.goalies.every((g) => !g.human));
// player 2's stick moves their shooter
m.state = 'play'; ctrl.phase = 'run';
const s = ctrl.active, x0 = s.x;
for (let i = 0; i < 30; i++) { m.setHumanInput({ ...idle, mx: -1 }, 1); m.setHumanInput(idle, 0); m.update(1 / 60); }
check('player 2 skates their shooter', s.x < x0 - 10, [Math.round(x0), Math.round(s.x)]);

// a whole party: both shoot straight at the net, and it ends
{
  const d = createDrill('party', newSave(), 'frost', { teamId: 'lynx', seed: 4 });
  const p = new Match(d.cfg);
  let f = 0;
  while (!d.ctrl.result && f < 60 * 400) {
    const shoot = (team) => { const c = p.controlled(team); if (!c) return idle; const tx = c.side * 600; return { ...idle, mx: Math.sign(tx - c.x), my: -c.y / 300, a: c.hasPuck && Math.abs(tx - c.x) < 300 && f % 30 < 3 }; };
    p.setHumanInput(shoot(0), 0); p.setHumanInput(shoot(1), 1); p.update(1 / 60); f++;
  }
  check('a whole party ends with a winner', d.ctrl.result && d.ctrl.result.goals[0] !== d.ctrl.result.goals[1], d.ctrl.result);
}

console.log(`Shootout party: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
