// Special teams: two penalty killers hold a tandem in the slot rather than chasing round the
// boards (and press a carrier inside the dots), and a power play spreads into the umbrella,
// the point and both flanks.
//   node tools/test_specialteams.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X, BLUE_X } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });

// team 0 on the power play with the puck at (x, y) in team 1's end (team 0 attacks +x)
function setup(x, y) {
  const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 3, powers: [], diff: [0.6, 0.6] });
  m.state = 'play';
  const [a, b, c] = m.teamSkaters(0), [d, e, f] = m.teamSkaters(1);
  f.parked = true; f.boxT = 60; f.x = 70; f.y = -400;
  a.x = x; a.y = y;
  b.x = 300; b.y = -60; c.x = 260; c.y = 120;
  d.x = 380; d.y = 40; e.x = 450; e.y = -80;
  m.takePossession(a, 'test');
  return { m, carrier: a, killers: [d, e], mates: [b, c] };
}
const near = (s, x, y, r) => Math.hypot(s.x - x, s.y - y) < r;

// the puck on the half-wall: the killers settle in the slot, nobody chases to the boards
{
  const { m, carrier, killers } = setup(GOAL_X - 300, 200);
  check('power play counted', m.powerPlay(0) === 1 && m.powerPlay(1) === -1);
  const roles = m.ai[1].plan(m.teamSkaters(1), carrier, false, true, false);
  const spots = killers.map((k) => roles.get(k));
  check('killers: both hold spots', spots.every((r) => r && r.kind === 'spot'), spots.map((r) => r && r.kind));
  const xs = spots.map((r) => GOAL_X - r.x).sort((p, q) => p - q);
  check('...a low slot and a high slot', Math.abs(xs[0] - 85) < 2 && Math.abs(xs[1] - 175) < 2, xs);
  check('...the low one on the far side from the puck', spots.find((r) => Math.abs(GOAL_X - r.x - 85) < 2).y < 0);
  for (let i = 0; i < 60 * 1.5; i++) { m.puck.owner = carrier; carrier.vx = carrier.vy = 0; m.update(1 / 60); carrier.x = GOAL_X - 300; carrier.y = 200; }
  check('...and skate there', killers.every((k) => Math.hypot(GOAL_X - k.x, k.y) < 230), killers.map((k) => [k.x | 0, k.y | 0]));
}

// inside the dots: one presses the carrier
{
  const { m, carrier } = setup(GOAL_X - 150, 60);
  const roles = m.ai[1].plan(m.teamSkaters(1), carrier, false, true, false);
  check('carrier in close: pressed', [...roles.values()].some((r) => r.kind === 'pressure'), [...roles.values()].map((r) => r.kind));
}

// at even strength the defence is as before: someone presses on the half-wall too
{
  const { m, carrier } = setup(GOAL_X - 300, 200);
  const f = m.teamSkaters(1).find((k) => k.parked); f.parked = false; f.boxT = 0; f.x = 200; f.y = 0;
  const roles = m.ai[1].plan(m.teamSkaters(1), carrier, false, true, false);
  check('even strength: pressed on the half-wall', [...roles.values()].some((r) => r.kind === 'pressure'));
}

// the power play's umbrella
{
  const { m, carrier } = setup(GOAL_X - 230, 150); // a flank
  const sp = m.ai[0].baseSupportSpots(carrier);
  const far = sp.find((p) => p.pref === 'W'), top = sp.find((p) => p.pref === 'D');
  check('umbrella from a flank: the far flank and the point', far && top && far.y < -100 && GOAL_X - far.x > 150 && GOAL_X - top.x > GOAL_X - BLUE_X - 120, sp);
  const pt = setup(GOAL_X - 360, 10);
  const sp2 = pt.m.ai[0].baseSupportSpots(pt.carrier);
  check('...from the point: both flanks', sp2.length === 2 && sp2.every((p) => Math.abs(p.y) > 120 && GOAL_X - p.x < 220) && sp2[0].y * sp2[1].y < 0, sp2);
  const f = m.teamSkaters(1).find((k) => k.parked); f.parked = false; f.boxT = 0;
  const even = m.ai[0].baseSupportSpots(carrier);
  check('...not at even strength', !even.some((p) => p.pref === 'C'), even);
}

// whole matches with penalties still run their course
{
  let pens = 0, ppg = 0, over = 0;
  for (let i = 0; i < 12; i++) {
    const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 200 + i, powers: [], diff: [0.6, 0.6] });
    m.on('penalty', () => pens++); m.on('goal', (e) => { if (e.powerPlay) ppg++; });
    for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
    if (m.state === 'over') over++;
  }
  check('twelve matches finish', over === 12, over);
  check('...with penalties called', pens > 4, pens);
}

console.log(`special teams: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
