// Goalie mode: scripted checks of the player-in-goal controls, then whole matches with a
// simple bot in goal (positioning help on, it blocks shots and passes when it holds the
// puck) next to the same matches with the AI goalie, to compare save rates.
//   node tools/test_goalie.mjs [matches]
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';

const team = () => ({ chem: {}, skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'Halla' } });
// (without goalie mode nobody is human: the same three AI skaters, with the AI in goal)
const mk = (goalieMode, seed = 5, assist = 'normal') => new Match({ teams: [team(), team()], humanTeam: goalieMode ? 0 : null, goalieMode, assist, seed, powers: [], diff: [0.72, 0.6] });
const raw = (o = {}) => ({ mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false, ...o });
const run = (m, inputs) => { for (const inp of inputs) { m.setHumanInput(inp); m.update(1 / 60); } };
let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };

// set-up: nobody steers a skater, the goalie is the player's
{
  const m = mk(true);
  check('no controlled skater', !m.controlled());
  check('our goalie is human', m.goalies[0].human && !m.goalies[1].human);
  check('can\'t pull yourself', (m.state = 'play', m.score = [3, 4], !m.canPullGoalie(0)));
}
// butterfly on A, dive on B toward the stick
{
  const m = mk(true); m.state = 'play';
  const g = m.goalies[0];
  run(m, [raw({ a: true }), raw()]);
  check('A: butterfly', g.state === 'butterfly', g.state);
  run(m, Array(40).fill(raw()));
  run(m, [raw({ b: true, my: 1 })]);
  check('B: dive toward the stick', g.state === 'dive' && g.diveDir === 1, [g.state, g.diveDir]);
}
// the stick nudges the position (help on), and places it (help off)
{
  const m = mk(true); m.state = 'play';
  const g = m.goalies[0];
  m.puck.owner = null; m.puck.x = 0; m.puck.y = 0; m.puck.vx = m.puck.vy = 0;
  run(m, Array(60).fill(raw()));
  const y0 = g.y;
  run(m, Array(60).fill(raw({ my: 1 })));
  check('stick nudges her across (help)', g.y > y0 + 15, [y0, g.y]);
  const m2 = mk(true, 5, 'off'); m2.state = 'play';
  const g2 = m2.goalies[0];
  m2.puck.owner = null; m2.puck.x = 0; m2.puck.y = 0; m2.puck.vx = m2.puck.vy = 0;
  run(m2, Array(60).fill(raw({ my: -1 })));
  check('stick places her (no help)', g2.y < -25, g2.y);
}
// holding: the player picks the pass; a held puck isn't played automatically at once
{
  const m = mk(true); m.state = 'play';
  const g = m.goalies[0];
  m.goalieCatch(g, true);
  run(m, Array(60).fill(raw()));
  check('holds while you choose', m.puck.owner === g, m.puck.owner && m.puck.owner.id);
  let passes = 0; m.on('goalie_pass', () => passes++);
  const mate = m.teamSkaters(0)[0]; mate.x = g.x + 200; mate.y = 120;
  run(m, [raw({ a: true, mx: 1, my: 0.5 }), raw()]);
  check('A passes it', passes === 1 && m.puck.owner !== g);
}
// Wall of Ice: saves charge it, the ultimate button fires it
{
  const m = mk(true); m.state = 'play';
  const g = m.goalies[0];
  g.ult = 100;
  let walls = 0; m.on('goalie_wall', () => walls++);
  const r0 = g.reach();
  run(m, [raw({ ult: true }), raw()]);
  check('Wall of Ice', walls === 1 && g.wallT > 4 && g.reach() > r0 + 8, [walls, g.wallT]);
}

// whole matches: a bot in goal vs the AI goalie, same seeds
const N = Number(process.argv[2] || 10);
const bot = (m) => {
  const g = m.goalies[0], p = m.puck;
  if (g.state === 'hold') return raw({ a: g.holdT < 2.2, mx: 1 });
  const shot = p.shot && p.shot.team === 1 && p.vx < 0 && p.x < -GOAL_X + 260;
  return raw({ a: shot && m.rng() < 0.2 });
};
for (const mode of [false, true]) {
  let ga = 0, sa = 0, wins = 0, len = 0;
  for (let i = 0; i < N; i++) {
    const m = mk(mode, 100 + i);
    let t = 0;
    while (m.state !== 'over' && t < 900) { m.setHumanInput(mode ? bot(m) : raw()); m.update(1 / 60); t += 1 / 60; }
    ga += m.score[1]; sa += m.shotsOnGoal[1]; wins += m.winner === 0 ? 1 : 0; len += t;
  }
  console.log(`${mode ? 'bot in goal' : 'AI in goal '}  goals against/match ${(ga / N).toFixed(2)}  save% ${((1 - ga / Math.max(1, sa)) * 100).toFixed(1)}  win% ${(wins / N * 100).toFixed(0)}  length ${(len / N / 60).toFixed(1)} min`);
}
console.log(`goalie mode: ${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
