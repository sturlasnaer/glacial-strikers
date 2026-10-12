// Pond hockey (Batch EY): three on three, no goalies, the little nets, no penalties; and the
// regular nets back for the next match.
//   node tools/test_pond.mjs
import { Match } from '../src/match.js';
import { CHARACTERS, ARENAS } from '../src/data.js';
import * as R from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const play = (m) => { let f = 0; while (m.state !== 'over' && f < 60 * 900) { m.update(1 / 60); f++; } return f / 3600; };

const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 7, powers: [], diff: [0.5, 0.5], pond: true, goalieMode: true, keeperCoop: true });
check('the pond: its little nets', R.MOUTH === R.MOUTH_POND && R.MOUTH_POND < R.MOUTH_STD, R.MOUTH);
check('...no one in goal', m.goalies.every((g) => g.disabled));
check('...no penalties, no pulling a goalie', !m.penaltiesOn && !m.canPullGoalie(0) && !m.canPullGoalie(1));
check('...nor playing in goal', !m.goalieMode && !m.keeperCoop);

let mins = 0, goals = 0, pens = 0;
for (let i = 0; i < 6; i++) {
  const g = new Match({ teams: [team(), team()], humanTeam: null, seed: 40 + i, powers: [], diff: [0.5, 0.5], pond: true });
  g.on('penalty', () => pens++);
  mins += play(g); goals += g.score[0] + g.score[1];
  check('a pond game ends with a winner', g.state === 'over' && Math.max(...g.score) === g.winScore, g.score);
}
check('...quick ones (a few minutes)', mins / 6 > 0.7 && mins / 6 < 4, (mins / 6).toFixed(2));
check('...and no penalties called', pens === 0, pens);

const reg = new Match({ teams: [team(), team()], humanTeam: null, seed: 3, powers: [], diff: [0.5, 0.5] });
check('the next match has the regular nets and goalies again', R.MOUTH === R.MOUTH_STD && reg.goalies.every((g) => !g.disabled));
check('the pond is for pond hockey only (not in the daily or the arena picks)', ARENAS.pond && ARENAS.pond.exhibitionOnly && ARENAS.pond.pond);

console.log(`Pond hockey: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
