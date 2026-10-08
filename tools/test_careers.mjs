// Rival careers and the league's news: stars age a year a season, the young improve and the
// old decline, the oldest retire after the awards and Draft Day fills their places; and every
// signing, pick, trade, retirement and champion lands in Around the Frostline.
//   node tools/test_careers.mjs
import { newSave, matchConfig, recruitStatus, signRecruit, addRecruit } from '../src/progress.js';
import { startAge, ageOf, formShift, agedStats, retireRivals, vacated, rivalSub, RETIRE_AT } from '../src/slots.js';
import { holes, rivalDraft } from '../src/moves.js';
import { makeDraft, draftPick, otherPicks } from '../src/draft.js';
import { trade } from '../src/trades.js';
import { latestNews, NEWS_KEEP, addNews } from '../src/news.js';
import { strength } from '../src/league.js';
import { CHARACTERS, STAR_AGES, RECRUITS, TOURNAMENT, setRookies } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
let seed = 13;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

const s = newSave();
setRookies({});
check('every star has an age', Object.keys(RECRUITS).every((k) => STAR_AGES[k] >= 20 && STAR_AGES[k] <= 33));
check('the old monarch is old', startAge('royals_d') >= 31 && startAge('lynx_w') <= 22);
check('a year older each season', ageOf(s, 'rams_d') === STAR_AGES.rams_d && (s.season = 3, ageOf(s, 'rams_d') === STAR_AGES.rams_d + 2));
s.season = 1;
check('as they were in the first season', Object.keys(RECRUITS).every((k) => formShift(s, k) === 0));
s.season = 4;
check('the young improve', formShift(s, 'lynx_w') > 0, formShift(s, 'lynx_w'));
check('the old decline', formShift(s, 'rams_d') < 0, formShift(s, 'rams_d'));
check('in their prime, steady', formShift(s, 'ravens_c') === 0 || Math.abs(formShift(s, 'ravens_c')) <= 1);
const base = { ...CHARACTERS.thunder.base };
check('form moves their best stats', sum(agedStats(s, 'lynx', 'thunder', base)) === sum(base) + 3 * formShift(s, 'lynx_w'));
const cfg = matchConfig(s, 'lynx', TOURNAMENT.stages[0]);
check('in a match', sum(cfg.teams[1].skaters[1].stats) > sum(matchConfig(newSave(), 'lynx', TOURNAMENT.stages[0]).teams[1].skaters[1].stats));
check('a team with young stars gets stronger', strength('lynx', s) > strength('lynx', newSave()), [strength('lynx', s), strength('lynx', newSave())]);

// retirement after the awards
const r = newSave();
r.season = 1;
check('nobody retires young', retireRivals(r).length === 0);
r.season = RETIRE_AT - STAR_AGES.royals_d + 1; // the season the old monarch turns 34
const gone = retireRivals(r);
check('the oldest retire', gone.some((x) => x.key === 'royals_d') && gone.every((x) => ageOf(r, x.key) >= RETIRE_AT), gone);
check('...once', retireRivals(r).length === 0);
check('their slot is empty', vacated(r, 'royals', 'stone') && holes(r, 'royals').includes('stone') && recruitStatus(r, 'royals_d') === 'retired');
check('...and can\'t be signed', (() => { r.coins = 9999; r.rivals = { royals: { wins: 1 } }; return signRecruit(r, 'royals_d') === null; })());
check('a reserve plays until Draft Day', rivalSub(r, 'royals', 'stone').name === 'Bastion' || rivalSub(r, 'royals', 'stone').fill === null);
r.league.phase = 'done'; r.league.awards = [];
r.draft = makeDraft(r, r.season, rnd);
const dIdx = r.draft.prospects.findIndex((p) => p.kit !== 'stone');
draftPick(r, dIdx);
const picks = otherPicks(r.draft, r);
const rep = picks.find((o) => o.replaces);
check('Draft Day replaces the retired', !r.draft.rivals.includes('royals') || (rep && rep.replaces === RECRUITS.royals_d.name && rivalSub(r, 'royals', 'stone').fill), picks);

// the news
const n = newSave();
setRookies({});
n.coins = 9999; n.rivals = { rams: { wins: 1 }, comets: { wins: 1 } };
signRecruit(n, 'rams_c');
addRecruit(n, 'comets_w');
trade(n, 'comets_w', 'rams_w');
const kinds = latestNews(n).map((x) => x.k);
check('signings and trades in the news', kinds.includes('weSign') && kinds.includes('trade') && latestNews(n)[0].k === 'trade', kinds);
check('stamped with the season', latestNews(n).every((x) => x.s === 1));
for (let i = 0; i < NEWS_KEEP + 10; i++) addNews(n, { k: 'champion', team: 'lynx' });
check('only the latest kept', n.news.length === NEWS_KEEP);

console.log(`careers and news: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
