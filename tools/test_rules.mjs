// The expansion clubs' arena rules: the Observatory's moonbeam sweeps the ice and a shot
// from inside it glares in the goalie's eyes; the Longhouse's loose planks send the puck off
// at odd angles. And AI-vs-AI matches in both buildings still play out.
//   node tools/test_rules.mjs
import { Match } from '../src/match.js';
import { makeTwists, RINK } from '../src/rink.js';
import { CHARACTERS, makeDef, ARENAS, TWIST_INFO } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const KITS = ['frost', 'thunder', 'stone'];
const team = () => ({ chem: {}, goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, skaters: KITS.map((k) => ({ def: makeDef(k), stats: { ...CHARACTERS[k].base }, perks: [] })) });
const mk = (twist, seed = 5) => new Match({ teams: [team(), team()], humanTeam: null, seed, powers: [], diff: [0.6, 0.6], twist });

check('the buildings have their rules', ARENAS.owl_observatory.twist === 'moonbeams' && ARENAS.moose_longhouse.twist === 'loose_planks' && TWIST_INFO.moonbeams && TWIST_INFO.loose_planks);
check('other rules have neither', ['meltwater', 'shadow_zones', 'none'].every((k) => { const t = makeTwists(k); return !t.beam && t.planks.length === 0; }));

// the moonbeam
{
  const m = mk('moonbeams');
  const b = m.twists.beam, seen = [];
  for (let i = 0; i < 60 * 30; i++) { m.updateTwists(1 / 60); seen.push(b.x); }
  check('the pool of light sweeps from end to end', Math.min(...seen) < -400 && Math.max(...seen) > 400, [Math.min(...seen), Math.max(...seen)]);
  check('...slowly', seen.slice(1).every((x, i) => Math.abs(x - seen[i]) < 3));
  check('in it, out of it', m.inBeam(b.x + b.rx - 1, b.y) && !m.inBeam(b.x + b.rx + 1, b.y) && m.inBeam(b.x, b.y + b.ry - 1) && !m.inBeam(b.x, b.y + b.ry + 1));
  // the same shot, from inside the beam and from outside it
  const g = m.goalies[1];
  m.rng = () => 0.5;
  let glare = 0;
  m.on('glare', () => glare++);
  const delay = (x) => { m.puck.x = x; m.puck.y = b.y; g.onShot({}); return g.react.t; };
  const inside = delay(b.x), outside = delay(b.x + b.rx * 1.5);
  check('a shot from the beam glares', inside > outside + 0.05 && glare === 1, [inside, outside, glare]);
}

// the loose planks
{
  const m = mk('loose_planks');
  const P = m.twists.planks;
  check('two on the far boards, two on the near, one on each end', P.filter((p) => p.side === 'far').length === 2 && P.filter((p) => p.side === 'near').length === 2 && P.some((p) => p.side === 'left') && P.some((p) => p.side === 'right'));
  check('...on the straight boards', P.every((p) => (p.side === 'far' || p.side === 'near' ? p.a0 > RINK.minX + RINK.r && p.a1 < RINK.maxX - RINK.r : p.a0 > RINK.minY + RINK.r && p.a1 < RINK.maxY - RINK.r)));
  m.state = 'play';
  m.puck.owner = null;
  let hits = 0, odd = 0, back = 0;
  m.on('plank', () => hits++);
  const fire = (x, y, vx, vy) => { Object.assign(m.puck, { x, y, z: 0, vx, vy, vz: 0, shot: null, pass: null }); for (let i = 0; i < 40; i++) m.puckStep(1 / 240); return { vx: m.puck.vx, vy: m.puck.vy }; };
  const far = P.find((p) => p.side === 'far'), mid = (far.a0 + far.a1) / 2;
  for (let i = 0; i < 40; i++) {
    const out = fire(mid, RINK.minY + 30, 0, -700);
    if (out.vy > 0) back++;
    if (Math.abs(Math.atan2(out.vx, out.vy)) > 0.3) odd++;
  }
  check('a puck off a loose plank takes an odd bounce', hits === 40 && odd === 40, [hits, odd]);
  check('...but always comes back off the boards', back === 40, back);
  hits = 0;
  const clear = far.a0 > 0 ? far.a0 - 120 : far.a1 + 120; // the same boards, away from the plank
  const out = fire(clear, RINK.minY + 30, 0, -700);
  check('the rest of the boards play true', hits === 0 && Math.abs(out.vx) < 1, [hits, out]);
  const end = P.find((p) => p.side === 'right');
  hits = 0;
  fire(RINK.maxX - 30, (end.a0 + end.a1) / 2, 700, 0);
  check('the end boards too', hits === 1);
  const near = P.find((p) => p.side === 'near');
  hits = 0;
  const nb = fire((near.a0 + near.a1) / 2, RINK.maxY - 30, 0, 700);
  check('...and the near boards', hits === 1 && nb.vy < 0, nb);
  check('a plank rattles when hit', end.rattle > 0);
}

// whole matches in both buildings
for (const twist of ['moonbeams', 'loose_planks']) {
  const m = mk(twist, 11);
  let ev = 0;
  m.on(twist === 'moonbeams' ? 'glare' : 'plank', () => ev++);
  let t = 0;
  for (; m.winner === null && m.state !== 'over' && t < 900; t += 1 / 60) m.update(1 / 60);
  check(`a match at the ${twist === 'moonbeams' ? 'Observatory' : 'Longhouse'} plays out`, m.winner !== null && t < 900, [m.score, t]);
  check(`...and the rule comes up`, ev > 0, ev);
  console.log(`  ${twist}: ${m.score.join('-')} in ${(t / 60).toFixed(1)} min, ${ev} ${twist === 'moonbeams' ? 'glares' : 'plank bounces'}`);
}

console.log(`arena rules: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
