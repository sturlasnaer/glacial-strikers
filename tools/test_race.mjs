// The mascot race: four runners (our Snow Fox, the opponent's and two more, only those drawn),
// every race finishes in good time with one winner, anyone can win, and the same rolls give
// the same race.
//   node tools/test_race.mjs
import { MASCOTS, pickRunners, newRace, stepRace } from '../src/race.js';
import { makeRng } from '../src/util.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const rnd = makeRng(3);
const r1 = pickRunners('rams', rnd);
check('four runners: the Snow Fox, theirs and two more, all different', r1.length === 4 && r1[0] === 'home' && r1[1] === 'rams' && new Set(r1).size === 4, r1);
check('...at home against ourselves (versus): still four', pickRunners('home', rnd).length === 4);
check('...only the ones drawn', JSON.stringify(pickRunners('lynx', rnd, (k) => ['home', 'owls'].includes(k))) === JSON.stringify(['home', 'owls']));
check('a mascot for every club: the Frostline\'s eight, the National nine and the Elite\'s two', Object.keys(MASCOTS).length === 19);

const run = (seed) => { const g = makeRng(seed), r = newRace(['home', 'lynx', 'rams', 'owls']); while (!r.winner && r.t < 60) stepRace(r, 1 / 60, g); return r; };
const wins = {}; let slowest = 0, fastest = 99;
for (let s = 1; s <= 400; s++) { const r = run(s); wins[r.winner] = (wins[r.winner] || 0) + 1; slowest = Math.max(slowest, r.t); fastest = Math.min(fastest, r.t); }
check('every race ends with a winner in 4 to 12 seconds', slowest < 12 && fastest > 4 && Object.values(wins).reduce((a, b) => a + b, 0) === 400, [fastest, slowest]);
check('...and anyone can win (each at least 15% of 400)', Object.keys(wins).length === 4 && Object.values(wins).every((n) => n >= 60), wins);
check('the same rolls, the same race', run(42).winner === run(42).winner && run(42).t === run(42).t);

console.log(`Mascot race: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
