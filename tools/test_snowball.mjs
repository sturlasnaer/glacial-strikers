// Snowball fun with the cub (Training, Batch DT): the cub's rounds of the forts, hits, the minute
// and the prize.
//   node tools/test_snowball.mjs
import { newSnowball, stepSnowball, throwAt, snowPrize, SNOW_TIME, SNOW_UP, SNOW_PRIZE_MAX } from '../src/snowball.js';
import { makeRng } from '../src/util.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const rnd = makeRng(7);
const st = newSnowball(5);
const run = (secs) => { for (let i = 0; i < secs * 20; i++) stepSnowball(st, 0.05, rnd); };
run(1.2);
check('it pops up at a fort', st.cub.phase === 'rise' || st.cub.phase === 'up', st.cub.phase);
check('a miss at another fort is no hit', !throwAt(st, (st.cub.spot + 1) % 5) && st.score === 0);
const at = st.cub.spot;
check('a snowball at it: a hit', throwAt(st, at) && st.score === 1 && st.cub.phase === 'hit');
check('not twice for one pop', !throwAt(st, at) && st.score === 1);
for (let i = 0; i < 20 && st.cub.phase === 'hit'; i++) stepSnowball(st, 0.05, rnd);
check('...not even as it ducks after', st.cub.phase === 'down' && !throwAt(st, at) && st.score === 1, st.cub.phase);
// it stays up long enough for small hands, and moves on to another fort
const seen = new Set([at]); let maxUp = 0, upT = 0, prev = at, repeats = 0;
for (let i = 0; i < 20 * 40; i++) {
  stepSnowball(st, 0.05, rnd);
  if (st.cub.phase === 'up') { upT += 0.05; maxUp = Math.max(maxUp, upT); } else upT = 0;
  if (st.cub.phase === 'rise' && st.cub.spot !== prev) { seen.add(st.cub.spot); prev = st.cub.spot; } else if (st.cub.phase === 'rise' && upT === 0 && st.cub.spot === prev && st.cub.t > 0.25) repeats++;
}
check('up for a good while', maxUp >= SNOW_UP - 0.1, maxUp);
check('round all the forts', seen.size === 5, [...seen]);
run(SNOW_TIME);
check('a minute, then over', st.over && !throwAt(st, st.cub.spot));
check('a coin a hit, up to a cap', snowPrize(3) === 3 && snowPrize(500) === SNOW_PRIZE_MAX);

console.log(`Snowball fun: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
