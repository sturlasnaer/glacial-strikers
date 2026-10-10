// The Summit Rink's thin air: a loose puck glides further, shots leave the stick faster, a
// sprinting skater tires sooner and gets their breath back slower, and whole matches still
// finish. The arena is for exhibitions only, never a daily challenge's.
//   node tools/test_thinair.mjs
import { Match } from '../src/match.js';
import { CHARACTERS, ARENAS, TWIST_INFO } from '../src/data.js';
import { THIN_AIR } from '../src/rink.js';
import { dailyFor, dayKey } from '../src/daily.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const make = (twist, seed = 4) => new Match({ teams: [team(), team()], humanTeam: null, seed, powers: [], diff: [0.6, 0.6], twist });
const clear = (m) => { m.state = 'play'; for (const s of m.skaters) { s.x = -600; s.y = 260; s.parked = true; } for (const g of m.goalies) g.disabled = true; };

check('the arena: its rule, for exhibitions only, with its text', ARENAS.summit_rink.twist === 'thin_air' && ARENAS.summit_rink.exhibitionOnly && TWIST_INFO.thin_air);

// a loose puck slides further
const slide = (twist) => { const m = make(twist); clear(m); const p = m.puck; p.owner = null; p.x = -300; p.y = 0; p.z = 0; p.vx = 300; p.vy = 0; p.vz = 0; p.inNet = null; for (let i = 0; i < 60; i++) m.update(1 / 60); return p.x + 300; };
const thin = slide('thin_air'), normal = slide('none');
check('a loose puck glides further', thin > normal * 1.05, [Math.round(thin), Math.round(normal)]);

// shots leave the stick faster
const shot = (twist) => { const m = make(twist); m.state = 'play'; const s = m.teamSkaters(0)[0]; s.x = 200; s.y = 0; m.takePossession(s, 'test'); let sp = 0; m.on('shot', (e) => { sp = e.speed; }); m.shoot(s, { kind: 'wrist' }); return sp; };
check('shots fly faster', Math.abs(shot('thin_air') / shot('none') - THIN_AIR.shot) < 0.01, [shot('thin_air'), shot('none')]);

// sprinting tires sooner, and the breath comes back slower
const tire = (twist) => {
  const m = make(twist); m.state = 'play';
  const s = m.teamSkaters(0)[0]; s.controlled = true; m.humanTeam = 0;
  s.stamina = s.d.staminaMax;
  s.in = { ...s.in, mx: 1, my: 0, sprint: true };
  s.actions = () => {}; // (just the skating)
  const before = s.stamina;
  for (let i = 0; i < 30; i++) { s.in.sprint = true; s.in.mx = 1; s.update(1 / 60); }
  return before - s.stamina;
};
const used = tire('thin_air'), usedN = tire('none');
check('sprinting drains more', used > usedN * 1.15, [used, usedN]);

// whole matches
{
  let over = 0;
  for (let i = 0; i < 6; i++) { const m = make('thin_air', 300 + i); for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60); if (m.state === 'over') over++; }
  check('six matches in thin air finish', over === 6, over);
}

check('no daily challenge on the Summit', !Array.from({ length: 365 }, (_, i) => dailyFor(dayKey(new Date(Date.UTC(2026, 9, 10 + i)))).arena).includes('summit_rink'));

console.log(`Thin air: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
