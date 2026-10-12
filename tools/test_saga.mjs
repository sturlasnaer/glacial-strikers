// A rival with a story (saga.js): one rival captain's chapters over the seasons, each once, in
// order of when they come; never the Foxes; and the replay list.
//   node tools/test_saga.mjs
import { newSave } from '../src/progress.js';
import { RECRUITS } from '../src/data.js';
import { startSaga, sagaDue, playSaga, sagaChapters, sagaActive, sagaLastSeason } from '../src/saga.js';
import { ageOf, RETIRE_AT } from '../src/slots.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = newSave();
s.league.phase = 'regular'; s.league.round = 0;
check('never the Foxes', startSaga(newSave(), 'foxes') === null);
const g = startSaga(s, 'ravens');
check('the story starts with the rivalry club\'s captain', g && g.team === 'ravens' && g.key === 'ravens_c' && sagaActive(s));
check('...once a career', startSaga(s, 'royals') === null && s.saga.team === 'ravens');
check('the grudge after a game against them (only them)', sagaDue(s, 'after', 'ravens') === 'grudge' && sagaDue(s, 'after', 'lynx') === null);
const grudge = playSaga(s, 'grudge', { won: true });
const name = RECRUITS.ravens_c.name;
check('...in words, the captain named, ready for the dialogue (l[3])', grudge.lines.length === 3 && grudge.lines.every((l) => l[3] === true && !l[2].includes('{')) && grudge.lines.some((l) => l[2].includes(name)), grudge.lines);
check('...the captain speaks as their kit', grudge.lines.some((l) => l[0] === 'them' && l[1] === 'frost'));
check('...once', sagaDue(s, 'after', 'ravens') === null);
check('no rematch the same season', sagaDue(s, 'before', 'ravens') === null);

s.season = 2;
check('the rematch next season, before a game against them', sagaDue(s, 'before', 'ravens') === 'rematch');
playSaga(s, 'rematch');
check('no rumour before round 3', sagaDue(s, 'hub') === null);
s.league.round = 3;
check('the rumour mid-season', sagaDue(s, 'hub') === 'rumour');
s.cups = 1;
check('respect comes first after one of our Cups', sagaDue(s, 'hub') === 'respect');
playSaga(s, 'respect'); playSaga(s, 'rumour');
check('...each once', sagaDue(s, 'hub') === null);

const last = RETIRE_AT - ageOf({ season: 1 }, 'ravens_c') + 1; // (the season they turn RETIRE_AT)
s.season = last;
check('their last season: they say so before our game', sagaLastSeason(s) && sagaDue(s, 'before', 'ravens') === 'last', [last, ageOf(s, 'ravens_c')]);
playSaga(s, 'last');
s.league.phase = 'done';
check('...and the farewell at the season\'s end, before the awards retire them', sagaDue(s, 'awards') === 'farewell');
playSaga(s, 'farewell');
check('...once', sagaDue(s, 'awards') === null);
check('the replay list in story order', sagaChapters(s).map((c) => c.id).join() === 'grudge,rematch,rumour,respect,last,farewell', sagaChapters(s).map((c) => c.id));

const t = newSave();
t.league.phase = 'regular';
startSaga(t, 'lynx'); playSaga(t, 'grudge', { won: false });
t.roster.lynx_c = { ...(t.roster.frost || {}), level: 1, exp: 0 };
check('signed: rivals to teammates, in our colours', sagaDue(t, 'hub') === 'joined' && !sagaActive(t));
const j = playSaga(t, 'joined');
check('...the captain speaking as one of ours', j.lines.some((l) => l[0] === 'us' && l[1] === 'lynx_c'));
t.season = 30; t.league.phase = 'done';
check('...and no farewell for one of ours', sagaDue(t, 'awards') === null && sagaDue(t, 'before', 'lynx') === null);

console.log(`Rival story: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
