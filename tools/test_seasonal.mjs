// The home rink's seasonal dressing: which days are Halloween's and the holidays', and the
// ?season= override.
//   node tools/test_seasonal.mjs
import { seasonFor, forceSeason } from '../src/seasonal.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const on = (m, d) => seasonFor(new Date(2026, m - 1, d));

check('Halloween: 20 October to 1 November', on(10, 19) === null && on(10, 20) === 'halloween' && on(10, 31) === 'halloween' && on(11, 1) === 'halloween' && on(11, 2) === null);
check('the holidays: 1 December to 6 January', on(11, 30) === null && on(12, 1) === 'holiday' && on(12, 31) === 'holiday' && on(1, 6) === 'holiday' && on(1, 7) === null);
check('the rest of the year: nothing', [[3, 14], [6, 21], [9, 1], [10, 10]].every(([m, d]) => on(m, d) === null));
forceSeason('holiday');
check('?season=holiday shows it any day', on(7, 4) === 'holiday');
forceSeason('none');
check('?season=none hides it in season', on(10, 31) === null);
forceSeason('fireworks');
check('anything else: the calendar again', on(10, 31) === 'halloween' && on(7, 4) === null);
forceSeason(null);

console.log(`Seasonal: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
