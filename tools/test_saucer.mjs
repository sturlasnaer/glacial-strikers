// The saucer pass: a pass from the player's side lifts over the stick of a rival right on the
// passer (closer in against the top teams), so being pressed isn't losing the puck; rivals
// further out can still read the lane. Never in AI-vs-AI or two-player versus games.
//   node tools/test_saucer.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const idle = () => ({ mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false });
// the passer at centre ice, a teammate 130 to the right, one rival at `near` in the lane, the
// others parked out of the way
const setup = (cfg, near = 40) => {
  const m = new Match({ teams: [team(), team()], seed: 3, powers: [], diff: [0.5, 0.5], twist: 'none', ...cfg });
  m.state = 'play';
  for (const g of m.goalies) g.disabled = true;
  const [c, mate, other] = m.teamSkaters(0);
  const [o, ...rest] = m.teamSkaters(1);
  for (const [s, x, y] of [[c, 0, 0], [mate, 130, 0], [other, -300, 200], [o, near, 10]]) { s.x = x; s.y = y; s.vx = s.vy = 0; }
  for (const r of rest) { r.x = -560; r.y = 290; r.parked = true; }
  m.takePossession(c, 'test');
  return { m, c, mate, o };
};

{
  const { m, c, mate, o } = setup({ humanTeam: 0 });
  m.pass(c, mate);
  check("the player's pass goes over the rival on them", m.puck.pass && m.puck.pass.over && m.puck.pass.over.includes(o) && m.puck.vz > 0);
  let top = 0;
  for (let i = 0; i < 40 && !m.puck.owner; i++) { m.setHumanInput(idle()); m.update(1 / 60); top = Math.max(top, m.puck.z); }
  check('and reaches the teammate', m.puck.owner === mate, m.puck.owner && m.puck.owner.team);
  check('a low hop, catchable all the way', top > 4 && top < 18, top);
}
{
  const { m, c, mate, o } = setup({ humanTeam: 0 }, 112);
  m.pass(c, mate);
  check('a rival out in the lane is no part of it', !(m.puck.pass.over || []).includes(o));
}
{
  const { m, c, mate, o } = setup({ humanTeam: 0, diff: [0.5, 1] }, 55);
  m.pass(c, mate);
  check('the top teams: only the rival right on top', !(m.puck.pass.over || []).includes(o));
  const t = setup({ humanTeam: 0, diff: [0.5, 1] }, 30);
  t.m.pass(t.c, t.mate);
  check('(who it still goes over)', (t.m.puck.pass.over || []).includes(t.o));
}
{
  const { m, c, mate } = setup({ humanTeam: null });
  m.pass(c, mate);
  check('AI against AI: as it was', !m.puck.pass.over && m.puck.vz === 0);
  const v = setup({ humanTeam: 0, humans: [0, 1] });
  v.m.pass(v.c, v.mate);
  check('two players against each other: as it was', !v.m.puck.pass.over);
}

console.log(`Saucer pass: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
