// Every club's habits: how it likes to attack (data.js TEAMS[].habit, read by ai.js). Each rival
// has one, made only of the known dials within bounds (style, never pressure); a league match
// carries it to the club's bench (and none for ours); and the dials show: a deke-happy side
// dekes more, a dump-and-chase side dumps it in more, a passing side passes more, on the
// same seeds.
//   node tools/test_habits.mjs
import { TEAMS, ALL_RIVALS, CHARACTERS, stageOf } from '../src/data.js';
import { newSave, matchConfig } from '../src/progress.js';
import { Match } from '../src/match.js';
import { useModular } from '../src/modular.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });

const DIALS = { shoot: [-0.2, 0.2], pass: [-0.2, 0.2], deke: [0.5, 2.5], dump: [0.5, 2], slap: [0.5, 2] };
check('every rival has habits, home none', ALL_RIVALS.every((id) => TEAMS[id].habit && Object.keys(TEAMS[id].habit).length) && !TEAMS.home.habit);
check('...only the known dials, within bounds', ALL_RIVALS.every((id) => Object.entries(TEAMS[id].habit).every(([k, v]) => DIALS[k] && v >= DIALS[k][0] && v <= DIALS[k][1])), ALL_RIVALS.filter((id) => !Object.entries(TEAMS[id].habit).every(([k, v]) => DIALS[k] && v >= DIALS[k][0] && v <= DIALS[k][1])));
check('clubs differ: at least five different habits', new Set(ALL_RIVALS.map((id) => JSON.stringify(TEAMS[id].habit))).size >= 5);

const cfg = matchConfig(newSave(), 'seals', stageOf('seals'), { league: true });
check('a match carries the club\'s habits to its bench', cfg.teams[1].habit === TEAMS.seals.habit && !cfg.teams[0].habit);
const m0 = new Match({ ...cfg, humanTeam: null, humans: [], seed: 1 });
check('...and the AI reads them', m0.ai[1].habit === TEAMS.seals.habit && Object.keys(m0.ai[0].habit).length === 0);

// the dials show, on the same seeds
const team = (habit) => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {}, habit });
function count(habit, ev, n = 8) {
  let c = 0, poss = 0;
  for (let i = 0; i < n; i++) {
    const m = new Match({ teams: [team(null), team(habit)], humanTeam: null, seed: 4000 + i, powers: [], diff: [0.6, 0.6] });
    m.on(ev, (e) => { if (e.s.team === 1) c++; });
    for (let t = 0; m.state !== 'over' && t < 600; t += 1 / 60) m.update(1 / 60);
    poss += m.possessionT[1];
  }
  return c / (poss / 60); // (a minute with the puck)
}
const base = { deke: count(null, 'deke'), dump: count(null, 'dump'), pass: count(null, 'pass') };
check('a deke-happy side dekes more', count({ deke: 2 }, 'deke') > base.deke * 1.3, base.deke);
check('a dump-and-chase side dumps it in more', count({ dump: 1.8 }, 'dump') > base.dump * 1.2, base.dump);
check('a passing side passes more', count({ pass: 0.18 }, 'pass') > base.pass * 1.04, base.pass);

console.log(`Habits: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
