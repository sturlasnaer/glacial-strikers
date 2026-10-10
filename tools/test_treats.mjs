// Halloween treats in the locker room (Batch DQ): one a day, only in the season.
//   node tools/test_treats.mjs
import { takeTreat, treatTaken, TREAT_COINS } from '../src/seasonal.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const save = { coins: 10 };
const oct25 = new Date(2026, 9, 25, 18), oct25late = new Date(2026, 9, 25, 23, 50), oct26 = new Date(2026, 9, 26, 8), oct10 = new Date(2026, 9, 10);
check('not before the season', !takeTreat(save, oct10) && save.coins === 10);
check('a treat in the season', takeTreat(save, oct25) && save.coins === 10 + TREAT_COINS && treatTaken(save, oct25));
check('one a day', !takeTreat(save, oct25late) && save.coins === 10 + TREAT_COINS);
check('another tomorrow', !treatTaken(save, oct26) && takeTreat(save, oct26) && save.coins === 10 + 2 * TREAT_COINS);
check('none at Christmas', !takeTreat({ coins: 0 }, new Date(2026, 11, 20)));

console.log(`Treats: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
