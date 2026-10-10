// The comeback helper (Little player): an AI team two goals up on the player eases off a little,
// three up more, and is itself again once it's close; never without Little player, and never
// for the player's own AI teammates.
//   node tools/test_comeback.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const make = (comeback) => new Match({ teams: [team(), team()], humanTeam: 0, seed: 2, powers: [], diff: [0.6, 0.5], comeback });

const m = make(true);
const at = (a, b) => { m.score = [a, b]; m.easeOff(); return Math.round(m.ai[1].diff * 100) / 100; };
check('even: itself', at(1, 1) === 0.5);
check('two up: eases off a little', at(0, 2) === 0.4);
check('three up: more', at(0, 3) === 0.3);
check('close again: itself', at(2, 3) === 0.5);
check("the player's own teammates never change", (at(0, 4), m.ai[0].diff === 0.6));
const n = make(false);
n.score = [0, 4];
for (let i = 0; i < 3; i++) n.update(1 / 60);
check('without Little player: nothing', n.ai[1].diff === 0.5 && !n.comeback);

console.log(`Comeback helper: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
