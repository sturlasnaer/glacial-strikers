// The Harbour Rink's sea breeze: gusts come every 10 to 18 seconds (the first after 7 to 12),
// last 2.5 to 4, push a loose puck down the ice their way and slow a skater heading into them;
// the same seed brings the same gusts; whole matches still finish. And the arena stays out of
// the daily challenge.
//   node tools/test_seabreeze.mjs
import { Match } from '../src/match.js';
import { CHARACTERS, ARENAS } from '../src/data.js';
import { makeTwists } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const make = (seed) => new Match({ teams: [team(), team()], humanTeam: null, seed, powers: [], diff: [0.6, 0.6], twist: 'sea_breeze' });

const tw = makeTwists('sea_breeze', () => 0.5);
check('a calm start: the first gust 7 to 12 seconds in', tw.wind.gust === 0 && tw.wind.next >= 7 && tw.wind.next <= 12, tw.wind);
check('the arena: its rule, for exhibitions only', ARENAS.harbour_rink.twist === 'sea_breeze' && ARENAS.harbour_rink.exhibitionOnly);

// gusts over a stretch of play, and the same again with the same seed
const gustsOf = (seed, secs) => {
  const m = make(seed), out = [];
  m.on('gust', (e) => out.push([Math.round(m.time * 10) / 10, e.dir]));
  for (let t = 0; t < secs && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
  return { out, m };
};
const a = gustsOf(11, 60), b = gustsOf(11, 60);
check('gusts come', a.out.length >= 2, a.out);
check('...the same seed, the same gusts', JSON.stringify(a.out) === JSON.stringify(b.out));
check('...both ways over time', new Set(gustsOf(12, 240).out.map((g) => g[1])).size === 2);

// the push: a loose puck drifts the gust's way
{
  const m = make(3);
  m.state = 'play';
  const w = m.twists.wind;
  w.next = 0; // (a gust now)
  m.update(1 / 60);
  const dir = w.dir, p = m.puck;
  for (const s of m.skaters) { s.x = -600; s.y = 250; s.parked = true; } // (out of the way)
  for (const g of m.goalies) g.disabled = true;
  p.owner = null; p.x = 0; p.y = -200; p.vx = 0; p.vy = 450; p.inNet = null; // (a pass going across the ice)
  const x0 = p.x;
  for (let i = 0; i < 50; i++) m.update(1 / 60);
  check('a moving puck (a pass across) drifts with the gust', (p.x - x0) * dir > 15, [p.x - x0, dir]);
}

// whole matches with the breeze
{
  let over = 0;
  for (let i = 0; i < 6; i++) { const m = make(200 + i); for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60); if (m.state === 'over') over++; }
  check('six matches in the breeze finish', over === 6, over);
}

console.log(`Sea breeze: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
