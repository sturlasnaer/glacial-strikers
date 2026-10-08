// Leaderboard server tests: ranking, ties, only-better updates, validation, rate limit.
//   node tools/test_leaderboard.mjs
import { handle, memoryStore, rankKey, cleanName } from '../server/leaderboard.mjs';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const store = memoryStore();
let clock = 1_800_000_000_000;
const post = (b) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, store, (clock += 5000));
const get = (board, player) => handle({ method: 'GET', query: { board, player } }, store, clock);
const id = (n) => n.toString(16).padStart(16, 'a');

// higher is better
await post({ board: 'sniper', player: id(1), name: 'Snowcrest Foxes', tag: 'AB12', score: 1800, char: 'frost' });
await post({ board: 'sniper', player: id(2), name: 'Night Owls', tag: 'CD34', score: 2400, char: 'thunder' });
await post({ board: 'sniper', player: id(3), name: 'Late Tie', tag: 'EF56', score: 2400, char: 'stone' });
let r = await get('sniper', id(1));
check('sniper order', r.body.top.map((t) => t.name).join() === 'Night Owls,Late Tie,Snowcrest Foxes', r.body.top);
check('sniper my rank', r.body.me && r.body.me.rank === 3, r.body.me);
check('sniper total', r.body.total === 3);

// a worse score doesn't replace the best, a better one does
r = await post({ board: 'sniper', player: id(1), name: 'Snowcrest Foxes', tag: 'AB12', score: 900 });
check('worse kept', r.body.best === 1800 && !r.body.improved, r.body);
r = await post({ board: 'sniper', player: id(1), name: 'Snowcrest Foxes', tag: 'AB12', score: 2600 });
check('better replaces', r.body.best === 2600 && r.body.improved && r.body.rank === 1, r.body);

// lower is better (times)
await post({ board: 'cones', player: id(1), name: 'A', score: 17.25 });
await post({ board: 'cones', player: id(2), name: 'B', score: 15.9 });
r = await get('cones', id(1));
check('cones order', r.body.top[0].name === 'B' && r.body.me.rank === 2, r.body);
r = await post({ board: 'cones', player: id(1), name: 'A', score: 15.5 });
check('cones better time', r.body.improved && r.body.rank === 1, r.body);

// validation
check('unknown board', (await post({ board: 'nope', player: id(1), score: 1 })).status === 400);
check('bad player', (await post({ board: 'sniper', player: 'x', score: 1 })).status === 400);
check('score too high', (await post({ board: 'breakaway', player: id(4), score: 6 })).status === 400);
check('fractional goals', (await post({ board: 'breakaway', player: id(4), score: 2.5 })).status === 400);
check('cones too fast', (await post({ board: 'cones', player: id(4), score: 2 })).status === 400);
check('bad json', (await handle({ method: 'POST', query: {}, body: '{' }, store)).status === 400);
// rate limit: two posts from one player within 2 s
clock += 10000;
await handle({ method: 'POST', query: {}, body: JSON.stringify({ board: 'rondo', player: id(5), name: 'X', score: 40 }) }, store, clock);
r = await handle({ method: 'POST', query: {}, body: JSON.stringify({ board: 'rondo', player: id(5), name: 'X', score: 50 }) }, store, clock + 500);
check('rate limited', r.status === 429, r);
// names
check('name cleaned', cleanName('  Big   <b>Bears</b> ') === 'Big bBears/b', cleanName('  Big   <b>Bears</b> '));
check('name filtered', cleanName('Sh1t F0x shit') === 'Anonymous Club');
check('name length', cleanName('x'.repeat(60)).length === 28);
// rank keys sort as numbers: better first, earlier first on ties
const k1 = BigInt(rankKey('sniper', 2400, 1000)), k2 = BigInt(rankKey('sniper', 2400, 2000)), k3 = BigInt(rankKey('sniper', 2399, 0));
check('tie goes to earlier', k1 > k2 && k2 > k3);
const t1 = BigInt(rankKey('cones', 15.5, 1000)), t2 = BigInt(rankKey('cones', 15.51, 0));
check('lower time ranks higher', t1 > t2);
console.log(`leaderboard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
