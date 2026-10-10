// The Glacier Cave's icicles: every 9 to 15 seconds (the first after 8 to 12) an icicle's
// shadow grows for 1.6 s and then it lands, never in a crease or along the boards. Anyone
// under it is knocked aside and stunned (a carrier loses the puck), and it leaves a chunk of
// ice that skaters bump off and the puck glances off, till the next faceoff (three at most).
// The same seed brings the same icicles, the AI gets out from under them, whole matches still
// finish, and the arena stays out of the daily challenge.
//   node tools/test_icicles.mjs
import { Match } from '../src/match.js';
import { CHARACTERS, ARENAS } from '../src/data.js';
import { makeTwists, GOAL_X, ICICLE, insideDepth } from '../src/rink.js';
import { dailyFor, dayKey } from '../src/daily.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const make = (seed) => new Match({ teams: [team(), team()], humanTeam: null, seed, powers: [], diff: [0.6, 0.6], twist: 'icicles' });

const tw = makeTwists('icicles', () => 0.5);
check('a quiet start: the first icicle 8 to 12 seconds in', tw.ice.next >= 8 && tw.ice.next <= 12 && !tw.ice.falls.length && !tw.ice.chunks.length, tw.ice);
check('the arena: its rule, for exhibitions only', ARENAS.glacier_cave.twist === 'icicles' && ARENAS.glacier_cave.exhibitionOnly);

// icicles over a stretch of play, and the same again with the same seed
const icicles = (seed, secs) => {
  const m = make(seed), warn = [], land = [];
  m.on('icicle_warn', (e) => warn.push([Math.round(m.time * 10) / 10, Math.round(e.x), Math.round(e.y)]));
  m.on('icicle', (e) => land.push({ t: m.time, x: e.x, y: e.y, hit: e.hit.length }));
  for (let t = 0; t < secs && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
  return { warn, land, m };
};
const a = icicles(11, 60), b = icicles(11, 60);
check('icicles fall', a.warn.length >= 2 && a.land.length >= 2, [a.warn.length, a.land.length]);
check('...the same seed, the same icicles', JSON.stringify(a.warn) === JSON.stringify(b.warn));
// (a goal in between: the faceoff sweeps a falling one away)
const shadowOf = (l) => a.warn.find(([, x, y]) => x === Math.round(l.x) && y === Math.round(l.y));
check('...each lands 1.6 s after its shadow shows', a.land.every((l) => shadowOf(l) && Math.abs(l.t - shadowOf(l)[0] - ICICLE.warn) < 0.15), a.land.map((l) => shadowOf(l) && l.t - shadowOf(l)[0]));
const many = [11, 12, 13].flatMap((s) => icicles(s, 240).warn);
check('...never in a crease or along the boards', many.every(([, x, y]) => Math.hypot(Math.abs(x) - GOAL_X, y) >= 158 && insideDepth(x, y) >= 58), many.find(([, x, y]) => Math.hypot(Math.abs(x) - GOAL_X, y) < 158 || insideDepth(x, y) < 58));

// landing on a puck carrier
{
  const m = make(3);
  m.state = 'play';
  const ice = m.twists.ice, s = m.teamSkaters(0)[0];
  for (const o of m.skaters) if (o !== s) { o.x = -500; o.y = 250; o.parked = true; }
  s.x = 100; s.y = 40; s.vx = s.vy = 0;
  m.takePossession(s, 'test');
  ice.next = 99;
  ice.falls.push({ x: 100, y: 40, t: ICICLE.warn - 0.01 });
  const hits = [];
  m.on('icicle', (e) => hits.push(e));
  m.update(1 / 60);
  check('it lands: the carrier under it is hit', hits.length === 1 && hits[0].hit.includes(s));
  check('...stunned, knocked aside and off the puck', s.stun > 0.3 && m.puck.owner !== s && Math.hypot(s.vx, s.vy) > 150, [s.stun, m.puck.owner && m.puck.owner.who, Math.hypot(s.vx, s.vy)]);
  check('...and a chunk of ice is left there', ice.chunks.length === 1 && ice.chunks[0].x === 100 && !ice.falls.length);
}

// the chunk: the puck glances off it, a skater bumps off it
{
  const m = make(4);
  m.state = 'play';
  const ice = m.twists.ice;
  ice.next = 99;
  for (const o of m.skaters) { o.x = -500; o.y = 250; o.parked = true; }
  for (const g of m.goalies) g.disabled = true;
  ice.chunks.push({ x: 0, y: 0, r: ICICLE.chunk, t: 1, v: 1 });
  const p = m.puck;
  p.owner = null; p.x = -120; p.y = 0; p.z = 0; p.vx = 500; p.vy = 0; p.vz = 0; p.inNet = null;
  for (let i = 0; i < 30; i++) m.update(1 / 60);
  check('a puck sliding into a chunk glances back off it', p.vx < 0 && p.x < 0, [Math.round(p.x), Math.round(p.vx)]);
  p.x = -120; p.y = 0; p.z = 30; p.vx = 500; p.vy = 0; p.vz = 0;
  m.update(1 / 60);
  check('...one in the air flies over it', p.vx > 0);
  const s = m.teamSkaters(0)[0];
  s.parked = false; s.x = 4; s.y = 0; s.vx = -50; s.vy = 0;
  m.collideBarriers(s, s.r, 0.4);
  check('a skater is pushed out of it', Math.hypot(s.x, s.y) >= ICICLE.chunk + s.r - 0.01, Math.hypot(s.x, s.y));
  // three at most, and the next faceoff sweeps them off
  for (let i = 0; i < 3; i++) m.icicleLands({ x: -300 + i * 120, y: 150, t: ICICLE.warn });
  check('three chunks at most: the oldest goes', ice.chunks.length === ICICLE.max && !ice.chunks.some((k) => k.x === 0));
  m.setupFaceoff();
  check('...and the faceoff clears the ice', !ice.chunks.length && !ice.falls.length);
}

// the AI gets out from under them: over whole matches few icicles hit anyone, and they finish
{
  let over = 0, falls = 0, hit = 0;
  for (let i = 0; i < 6; i++) {
    const r = icicles(200 + i, 900);
    if (r.m.state === 'over') over++;
    falls += r.land.length; hit += r.land.filter((l) => l.hit).length;
  }
  check('six matches under the icicles finish', over === 6, over);
  check('...and the AI mostly gets out from under them', falls > 10 && hit / falls < 0.25, { falls, hit });
}

// never a daily challenge's arena
{
  const days = Array.from({ length: 365 }, (_, i) => dailyFor(dayKey(new Date(Date.UTC(2026, 9, 10 + i)))).arena);
  check('no daily challenge in the Glacier Cave', !days.includes('glacier_cave'));
}

console.log(`Icicles: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
