// The season in review (review.js): a real season played through, then the card's numbers.
//   node tools/test_review.mjs
import { seasonReview } from '../src/review.js';
import { newSave } from '../src/progress.js';
import { recordOurGame, nextFixture } from '../src/league.js';
import { careerOf } from '../src/career.js';
import { updateRecords } from '../src/records.js';
import { setRookies } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
setRookies({});
const s = newSave(), L = s.league;
let guard = 0;
while (L.phase !== 'done' && guard++ < 40) { const f = nextFixture(L); if (!f) break; if (f.kind === 'classic') { L.classic = { won: true }; continue; } if (f.kind === 'allstar') { L.allstar = { won: true }; continue; } recordOurGame(L, s, 5, 2); }
const c = careerOf(s);
c.skaters.frost = { gp: 9, g: 14, a: 6, seasons: { 1: { gp: 9, g: 14, a: 6 } } };
c.skaters.thunder = { gp: 9, g: 9, a: 12, seasons: { 1: { gp: 9, g: 9, a: 12 } } };
c.skaters.stone = { gp: 3, g: 1, a: 1, seasons: { 0: { gp: 3, g: 1, a: 1 } } }; // (another season)
s.records = { bigWin: { n: 4, team: 'Pinewood Lynx', season: 1 }, goalsGame: { n: 3, name: 'Nix', team: 'X', season: 0 } };
s.hall = [{ id: 'frost', name: 'Nix', number: 9, season: 1 }];
const r = seasonReview(s);
check('a season won through: champions, first', r && r.result === 'champion' && r.place === 1 && r.w > 0 && r.l === 0, r && [r.result, r.place, r.w, r.l]);
check('...goals for and against from the table', r.gf === s.league.table.home.gf && r.ga === s.league.table.home.ga);
check('...the season\'s top scorers, best first, this season only', r.top.map((k) => k.id).join() === 'thunder,frost', r.top);
check('...this season\'s records and inductees', r.records.map((x) => x.id).join() === 'bigWin' && r.hall.length === 1);
check('a save without a league: no review', seasonReview({ ...newSave(), league: null }) === null);
const s2 = newSave(); s2.league.phase = 'done'; s2.league.playoffs = { semis: [], final: null };
check('no playoffs: missed', seasonReview(s2).result === 'missed');

console.log(`review: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
