// The club's record book (records.js): kept from every full match, broken only by a better one
// (and the first of each isn't news), the streak across matches, and the career bests.
//   node tools/test_records.mjs
import { updateRecords, careerRecords, GAME_RECORDS } from '../src/records.js';
import { newSave } from '../src/progress.js';
import { careerOf } from '../src/career.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const s = newSave();
const names = { frost: 'Nix', thunder: 'Volta', stone: 'Bram' };
const game = (score, ours, opts = {}) => ({ summary: { score, skaters: ours.map(([id, goals, assists]) => ({ team: 0, id, goals, assists })), saves: opts.saves || [10, 5], goals: opts.goals || [] },
  won: score[0] > score[1], opp: 'lynx', oppName: 'Pinewood Lynx', season: 1, nameOf: (id) => names[id], goalieName: 'Halla' });

let b = updateRecords(s, game([5, 2], [['frost', 2, 1], ['thunder', 1, 2]], { goals: [{ team: 0, time: 14.2, scorer: { who: 'thunder' } }] }));
check('the first match sets them, quietly', b.length === 0 && s.records.bigWin.n === 3 && s.records.goalsGame.name === 'Nix' && s.records.pointsGame.n === 3 && s.records.fastestGoal.n === 14.2 && s.records.savesGame.n === 10);
b = updateRecords(s, game([5, 4], [['stone', 3, 0]], { goals: [{ team: 1, time: 5, scorer: { who: 'x' } }], saves: [8, 3] }));
check('a better one is news, a worse one isn\'t', b.map((r) => r.id).join() === 'goalsGame' && s.records.goalsGame.name === 'Bram' && s.records.bigWin.n === 3, b);
check('...their goal first doesn\'t count for the fastest', s.records.fastestGoal.n === 14.2);
b = updateRecords(s, game([5, 0], [['frost', 1, 1]], { goals: [{ team: 0, time: 9.1, scorer: { who: 'frost' } }] }));
check('a faster goal, a bigger win, three in a row', ['bigWin', 'fastestGoal', 'winStreak'].every((id) => b.some((r) => r.id === id)) && s.records.fastestGoal.n === 9.1 && s.records.winStreak.n === 3, b);
updateRecords(s, game([1, 5], [['frost', 1, 0]]));
check('a loss ends the streak, the record stays', s.records.streakNow === 0 && s.records.winStreak.n === 3);
check('every record has a name and a text', Object.values(GAME_RECORDS).every((r) => r.name && r.text.includes('{n}')));

const c = careerOf(s);
c.skaters.frost = { g: 30, a: 10, seasons: { 1: { g: 12, a: 4 }, 2: { g: 18, a: 6 } } };
c.skaters.thunder = { g: 20, a: 40, seasons: { 1: { g: 20, a: 40 } } };
const cr = Object.fromEntries(careerRecords(s, (id) => names[id]).map((r) => [r.id, r]));
check('career bests', cr.goalsSeason.n === 20 && cr.goalsSeason.name === 'Volta' && cr.goalsSeason.season === 1 && cr.pointsSeason.n === 60 && cr.goalsCareer.name === 'Nix' && cr.pointsCareer.n === 60);

console.log(`records: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
