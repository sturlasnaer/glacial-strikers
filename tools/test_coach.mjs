// The cub as coach (Little player games, Batch DJ): which tip, when, and never too often.
//   node tools/test_coach.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';
import { newCoach, coachStep, coachPraise, COACH_GAP, COACH_SAME } from '../src/coach.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
// the player's skater at (x, y) with the puck, a teammate out in the open, one rival `near` away
const setup = (x, y, near) => {
  const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 4, powers: [], diff: [0.5, 0.3] });
  m.state = 'play';
  const c = m.controlled(), [, mate, other] = m.teamSkaters(0), [o, ...rest] = m.teamSkaters(1);
  for (const [k, kx, ky] of [[c, x, y], [mate, x - 40, y + 200], [other, -500, -200], [o, x + near, y]]) { k.x = kx; k.y = ky; }
  for (const r of rest) { r.x = -560; r.y = 290; r.parked = true; }
  m.takePossession(c, 'test');
  return { m, c, o };
};
const run = (st, m, secs) => { let out = null; for (let i = 0; i < secs * 10 && !out; i++) out = coachStep(st, m, 0.1); return out; };

{
  const { m } = setup(-100, 0, 45), st = newCoach();
  check('a breath before the first tip', coachStep(st, m, 0.1) === null);
  check('pressed, a teammate open: pass it', run(st, m, 3) === 'pass');
  check('then quiet for a while', run(st, m, COACH_GAP - 0.5) === null);
  check('not the same tip again so soon', run(st, m, COACH_SAME - COACH_GAP - 1) === null);
  check('but again in the end', run(st, m, 3) === 'pass');
}
{
  const { m, c } = setup(GOAL_X - 200, 0, 300), st = newCoach();
  check('in front of their net: shoot', c.side > 0 && run(st, m, 3) === 'shoot', c.side);
}
{
  const { m, o } = setup(-100, 0, 300), st = newCoach();
  m.takePossession(o, 'test');
  check('the rivals keep the puck: get it back', run(st, m, 2.5) === null && run(st, m, 2) === 'chase');
}
{
  const { m } = setup(-100, 0, 45), st = newCoach();
  m.state = 'faceoff';
  check('only in play', run(st, m, 4) === null);
}
{
  const { m } = setup(-100, 0, 300), st = newCoach();
  check('nothing to say: nothing said', run(st, m, 5) === null);
}

{
  const st = newCoach();
  st.t = 0;
  const said = [1, 2, 3, 4, 5, 6, 7].map(() => { const k = coachPraise(st); if (k) st.t = 0; return k; });
  check('"Nice pass!" every third pass', said.join() === 'true,false,false,true,false,false,true', said.join());
  st.t = 3;
  check('not while it\'s just said something', !coachPraise(st));
  check('and praise holds the tips back a while', (() => { const s2 = newCoach(); s2.t = 0; coachPraise(s2); return s2.t === COACH_GAP; })());
}

console.log(`Coach cub: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
