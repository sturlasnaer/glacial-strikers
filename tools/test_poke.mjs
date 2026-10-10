// The poke check: without the puck the shoot/check button pokes at the carrier's puck, SPRINT
// held makes it a body check, and Simple controls always poke. A poke that reaches the puck
// knocks it loose now and then, more often in front of the carrier than round their body; the
// AI never pokes (AI-vs-AI play is as it was).
//   node tools/test_poke.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const idle = () => ({ mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false });
// our skater facing a rival carrier `gap` px away (the rival's puck toward us, or behind them)
const setup = (seed, cfg = {}, gap = 40, behind = false) => {
  const m = new Match({ teams: [team(), team()], humanTeam: 0, seed, powers: [], diff: [0.5, 0.2], ...cfg });
  m.state = 'play';
  for (const g of m.goalies) g.disabled = true;
  const c = m.controlled(), [o, ...rest] = m.teamSkaters(1);
  for (const k of [...m.teamSkaters(0), ...rest]) if (k !== c) { k.x = -500; k.y = 250; k.parked = true; }
  c.x = 0; c.y = 0; c.face = 0; c.vx = c.vy = 0;
  o.x = gap; o.y = 0; o.face = behind ? 0 : Math.PI; o.vx = o.vy = 0;
  m.takePossession(o, 'test');
  m.ai[1].update = () => {}; // (the rival stands still: just the poke)
  return { m, c, o };
};
const press = (m, inp, frames = 20) => { m.setHumanInput({ ...idle(), ...inp }); m.update(1 / 60); for (let i = 0; i < frames; i++) { m.setHumanInput(idle()); m.update(1 / 60); } };

{
  const { m, c } = setup(1);
  const seen = [];
  m.on('poke', (e) => seen.push(e.s));
  press(m, { a: true }, 0);
  check('the button without the puck: a poke', c.state === 'poke' && seen[0] === c, c.state);
  const t = setup(1);
  press(t.m, { a: true, sprint: true }, 0);
  check('with SPRINT held: a body check, as before', t.c.state === 'check', t.c.state);
  const k = setup(1, { simple: true });
  press(k.m, { a: true }, 0);
  check('Simple controls: always a poke', k.c.state === 'poke', k.c.state);
}
{
  let front = 0, back = 0, far = 0, steals = 0;
  for (let i = 0; i < 60; i++) {
    const a = setup(100 + i);
    a.m.on('steal', (e) => { if (e.s.team === 0) steals++; });
    press(a.m, { a: true }, 40);
    if (a.m.puck.owner !== a.o) front++;
    const b = setup(100 + i, {}, 40, true);
    press(b.m, { a: true });
    if (b.m.puck.owner !== b.o) back++;
    const f = setup(100 + i, {}, 120);
    press(f.m, { a: true });
    if (f.m.puck.owner !== f.o) far++;
  }
  check('in front of the carrier: it knocks the puck loose fairly often', front >= 15 && front <= 50, front);
  check('round their body: much less often', back < front * 0.7, `${back} vs ${front}`);
  check('out of reach: never', far === 0, far);
  check('a poke that wins it counts as a steal when we pick it up', steals > 0, steals);
}
{
  const { m, c } = setup(5);
  press(m, { a: true }, 2);
  const again = c.state;
  press(m, { a: true }, 0);
  check('a breath before the next poke', again === 'poke' && c.pokeCd > 0, c.pokeCd);
}

console.log(`Poke check: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
