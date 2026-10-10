// The saucer pass: a pass from the player's side lifts over the stick of a rival right on the
// passer (closer in against the top teams), so being pressed isn't losing the puck; rivals
// further out can still read the lane. Never in AI-vs-AI or two-player versus games. And the
// teammate taking the pass isn't charged as they catch it (see ai.js plan).
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
  const said = [];
  m.on('saucer', (e) => said.push(e.s));
  m.pass(c, mate);
  check("the player's pass goes over the rival on them", m.puck.pass && m.puck.pass.over && m.puck.pass.over.includes(o) && m.puck.vz > 0);
  check('and says so (the first one gets a hint)', said.length === 1 && said[0] === c);
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

// room at the catch: while the player's pass is on its way, the rival nearest the teammate
// taking it holds a gap goal-side of them (it charged at the catch before), and in AI-vs-AI play
// it still goes for the puck
const nearCatch = (cfg) => {
  const { m, c, mate, o } = setup(cfg, 300);
  o.x = mate.x + 60; o.y = mate.y + 30; // (beside the teammate, quicker to the puck than anyone)
  m.pass(c, mate);
  m.puck.pass.over = null;
  m.setHumanInput(idle()); m.update(1 / 60);
  return m.ai[1].brain(o).role;
};
check('the player\'s teammate: a gap, not a charge', nearCatch({ humanTeam: 0, diff: [0.5, 0.3] }) === 'spot', nearCatch({ humanTeam: 0, diff: [0.5, 0.3] }));
check('AI against AI: it still goes for the puck', nearCatch({ humanTeam: null, diff: [0.5, 0.3] }) === 'chase', nearCatch({ humanTeam: null, diff: [0.5, 0.3] }));

// the give-and-go: the teammate who passed to the player heads for open ice ahead, hard
{
  const { m, c, mate } = setup({ humanTeam: 0 }, 300);
  m.pass(c, mate);
  for (let i = 0; i < 60 && !m.puck.owner; i++) { m.setHumanInput(idle()); m.update(1 / 60); }
  const now = m.controlled();
  check('the catch: control goes to the teammate, who remembers the pass', now === mate && mate.recvFrom === c, now && now.name);
  const roles = m.ai[0].plan(m.teamSkaters(0), m.puck.owner, true, false, true), r = roles.get(c);
  check('...and the passer goes ahead for the return, sprinting', r && r.sprint && (r.x - mate.x) * mate.side > 60, r);
  m.time += 2;
  const later = m.ai[0].plan(m.teamSkaters(0), m.puck.owner, true, false, true).get(c);
  check('...for a moment, then back to supporting', later && !(later.sprint && (later.x - mate.x) * mate.side > 60 && Math.abs(later.x - r.x) < 1), later);
}

// room is for skating with it: a player standing still with the puck is closed down after a
// moment on every level (a small player who stops shouldn't freeze the game), one skating keeps it
{
  const hold = (diff, steer) => {
    const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 901, powers: [], diff: [0.6, diff], twist: 'none' });
    for (let k = 0; k < 600 && m.state !== 'play'; k++) { m.setHumanInput(idle()); m.update(1 / 60); }
    m.state = 'play';
    const c = m.controlled(); c.x = -300; c.y = -200;
    m.takePossession(c, 'test');
    let t = 0, ang = 0;
    while (t < 20 && m.puck.owner === c) {
      if (steer && Math.floor(t * 60) % 45 === 0) ang += 1.1;
      m.setHumanInput(steer ? { ...idle(), mx: Math.cos(ang) * 0.8, my: Math.sin(ang) * 0.8 } : idle()); m.update(1 / 60); t += 1 / 60;
    }
    return t;
  };
  const still = hold(0.12, false), skating = hold(0.12, true);
  check('Easy: standing still with the puck, it\'s gone in a while', still < 12, still.toFixed(1));
  check('...skating about with it, it\'s kept', skating > 15, skating.toFixed(1));
}

console.log(`Saucer pass: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
