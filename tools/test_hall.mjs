// The Hall of Fame (hall.js): who goes in and when, jersey numbers, the Cup seasons and the
// banners they make.
//   node tools/test_hall.mjs
import { HALL, jerseyNumber, noteCup, cupBanners, hallCandidates, induct, inHall } from '../src/hall.js';
import { newSave } from '../src/progress.js';
import { careerOf } from '../src/career.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = newSave();
const c = careerOf(s);
const sk = (g, a = 0) => ({ gp: 40, w: 30, g, a, shots: 0, hits: 0, steals: 0, blocks: 0, seasons: {} });
c.skaters.frost = sk(HALL.goals - 1, 10);
c.skaters.thunder = sk(HALL.goals);
c.skaters.stone = sk(40, HALL.points - 40);
c.goalies.halla = { gp: 60, w: HALL.goalieWins, sa: 0, sv: 0, so: 0 };

let cands = hallCandidates(s, ['frost', 'thunder', 'stone'], ['halla']);
check('75 goals, 120 points or 40 wins: in', cands.map((x) => x.id + ':' + x.why).join() === 'thunder:goals,stone:points,halla:wins', cands);
check('...74 goals: not yet', !cands.some((x) => x.id === 'frost'));
for (const x of cands) induct(s, x, x.id);
check('inducted, with their numbers', inHall(s, 'thunder') && s.hall.find((h) => h.id === 'thunder').number === 17 && s.hall.find((h) => h.id === 'halla').number === 31 && s.hall.find((h) => h.id === 'thunder').g === HALL.goals);
check('...and only once', hallCandidates(s, ['frost', 'thunder', 'stone'], ['halla']).length === 0);

// three Cups on the roster
noteCup(s, ['frost', 'rk1'], ['halla']); s.season = 2; noteCup(s, ['frost', 'rk1']); s.season = 3;
check('two Cups: not yet', !hallCandidates(s, ['frost', 'rk1']).some((x) => x.id === 'rk1'));
noteCup(s, ['frost', 'rk1']);
const cups = hallCandidates(s, ['frost', 'rk1']);
check('three Cups: in', cups.some((x) => x.id === 'rk1' && x.why === 'cups') && cups.some((x) => x.id === 'frost'), cups);
check('the Cup seasons kept', s.cupSeasons.join() === '1,2,3');

// numbers: the cast's own, anyone else a free one
const n1 = jerseyNumber(s, 'rk1'), n2 = jerseyNumber(s, 'fa_7');
check('numbers: 2 to 98, not the cast\'s', [n1, n2].every((n) => n >= 2 && n <= 98 && ![9, 17, 44, 31].includes(n)) && jerseyNumber(s, 'frost') === 9);
induct(s, { id: 'rk1', why: 'cups' }, 'Rookie');
const taken = new Set(s.hall.map((h) => h.number));
check('...never one already in the Hall', ['fa_1', 'fa_2', 'rk2', 'rk3', 'x'].every((id) => !taken.has(jerseyNumber(s, id))));
check('...no two members share one', taken.size === s.hall.length);

// banners: an old save's Cups without seasons
check('banners for every Cup, old ones without a season', cupBanners({ cups: 3, cupSeasons: [4] }).join() === ',,4' && cupBanners({}).length === 0);

console.log(`hall: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
