// Leaderboard server tests: ranking, ties, only-better updates, validation, rate limit,
// cloud saves and the weekly boards.
//   node tools/test_leaderboard.mjs
import { handle, memoryStore, rankKey, cleanName, weekOf } from '../server/leaderboard.mjs';

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
// cloud saves
const token = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const call = (b, t = (clock += 30000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, store, t);
r = await call({ op: 'save_get', token });
check('no save yet', r.status === 404);
r = await call({ op: 'save_put', token, data: JSON.stringify({ v: 1, coins: 500 }) });
check('save stored', r.status === 200 && r.body.at > 0, r);
r = await call({ op: 'save_get', token });
check('save read back', r.status === 200 && JSON.parse(r.body.data).coins === 500, r);
check('wrong code finds nothing', (await call({ op: 'save_get', token: token.replace('A', 'B') })).status === 404);
check('bad code', (await call({ op: 'save_get', token: 'abc' })).status === 400);
check('not json', (await call({ op: 'save_put', token, data: 'hello' })).status === 400);
await call({ op: 'save_put', token, data: '{"v":1,"coins":600}' });
r = await handle({ method: 'POST', query: {}, body: JSON.stringify({ op: 'save_put', token, data: '{"v":1}' }) }, store, clock + 1000);
check('save rate limit', r.status === 429, r);
check('code never stored', ![...JSON.stringify(await store.top('_save', 10))].join('').includes(token));
check('saves not on boards', (await get('_save')).status === 400);
check('big score body refused', (await handle({ method: 'POST', query: {}, body: JSON.stringify({ board: 'sniper', player: id(9), score: 1, pad: 'x'.repeat(3000) }) }, store)).status === 413);
// weekly boards: ISO weeks in UTC, Monday to Monday
check('week of 2026-10-08', weekOf(Date.UTC(2026, 9, 8, 12)).key === '2026-W41', weekOf(Date.UTC(2026, 9, 8, 12)));
check('week ends Monday 00:00 UTC', weekOf(Date.UTC(2026, 9, 8, 12)).ends === Date.UTC(2026, 9, 12));
check('new year 2027-01-01 is 2026-W53', weekOf(Date.UTC(2027, 0, 1)).key === '2026-W53', weekOf(Date.UTC(2027, 0, 1)).key);
check('2024-12-30 is 2025-W01', weekOf(Date.UTC(2024, 11, 30)).key === '2025-W01', weekOf(Date.UTC(2024, 11, 30)).key);
check('Sunday night is still that week', weekOf(Date.UTC(2026, 9, 11, 23, 59)).key === '2026-W41');
check('Monday starts the next', weekOf(Date.UTC(2026, 9, 12)).key === '2026-W42');
{
  const ws = memoryStore();
  let now = Date.UTC(2026, 9, 5, 10); // Monday, week 41
  const wpost = (b, at = (now += 5000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, ws, at);
  const wget = (query) => handle({ method: 'GET', query }, ws, now);
  r = await wpost({ board: 'sniper', player: id(1), name: 'Foxes', tag: 'AB12', score: 500, played: now });
  check('weekly rank in the answer', r.body.week && r.body.week.key === '2026-W41' && r.body.week.rank === 1 && r.body.week.improved, r.body);
  r = await wget({ board: 'sniper', period: 'week', player: id(1) });
  check('weekly board has it', r.body.top.length === 1 && r.body.me.rank === 1 && r.body.week === '2026-W41' && r.body.resetsAt === Date.UTC(2026, 9, 12), r.body);
  now += 7 * 86400000; // next Monday
  r = await wget({ board: 'sniper', period: 'week', player: id(1) });
  check('a new week starts empty', r.body.top.length === 0 && r.body.me === null && r.body.week === '2026-W42', r.body);
  r = await wget({ board: 'sniper' });
  check('all-time keeps it', r.body.top.length === 1, r.body);
  r = await wpost({ board: 'sniper', player: id(1), name: 'Foxes', tag: 'AB12', score: 300, played: now });
  check('a lower score is this week\'s best', r.body.week.best === 300 && r.body.week.improved && r.body.best === 500 && !r.body.improved, r.body);
  r = await wpost({ board: 'sniper', player: id(2), name: 'Owls', tag: 'CD34', score: 900, played: now - 3 * 86400000 });
  check('a score queued last week lands in last week', r.body.week.key === '2026-W41', r.body.week);
  r = await wpost({ board: 'sniper', player: id(3), name: 'Bears', tag: 'EF56', score: 100, played: now + 3600000 });
  check('a score from the future counts now', r.body.week.key === '2026-W42', r.body.week);
  r = await wpost({ board: 'sniper', player: id(4), name: 'Elk', tag: 'GH78', score: 100, played: now - 30 * 86400000 });
  check('a very old played time counts now', r.body.week.key === '2026-W42', r.body.week);
  r = await wget({ board: 'sniper', period: 'week' });
  check('this week ranks its own scores', r.body.top.map((x) => x.name).join() === 'Foxes,Bears,Elk', r.body.top);
  check('no weekly daily streak', (await wget({ board: 'daily_streak', period: 'week' })).status === 400);
  r = await wpost({ board: 'daily_streak', player: id(1), name: 'Foxes', score: 3 });
  check('streaks have no weekly part', r.status === 200 && !r.body.week, r.body);
}
// friends boards: create a group, join it, post into it, leave it
{
  const fs = memoryStore();
  let now = Date.UTC(2026, 9, 6, 10); // week 41
  const fpost = (b, at = (now += 5000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, fs, at);
  const fget = (query) => handle({ method: 'GET', query }, fs, now);
  await fpost({ board: 'sniper', player: id(1), name: 'Foxes', tag: 'AB12', score: 700, played: now, char: 'frost' });
  await fpost({ board: 'cones', player: id(1), name: 'Foxes', tag: 'AB12', score: 19.5, played: now });
  await fpost({ board: 'sniper', player: id(2), name: 'Owls', tag: 'CD34', score: 900, played: now });
  await fpost({ board: 'sniper', player: id(3), name: 'Bears', tag: 'EF56', score: 1500, played: now }); // not a friend
  r = await fpost({ op: 'group_new', player: id(1), name: '  Office   League ' });
  const code = r.body.code, madeAt = now;
  check('group made', r.status === 200 && /^[A-HJ-NP-Z2-9]{6}$/.test(code) && r.body.name === 'Office League', r.body);
  r = await fget({ board: 'sniper', group: code, player: id(1) });
  check('creator\'s best copied in', r.body.top.length === 1 && r.body.top[0].name === 'Foxes' && r.body.top[0].char === 'frost' && r.body.me.rank === 1 && r.body.total === 1, r.body);
  r = await fget({ board: 'cones', group: code, period: 'week' });
  check('this week\'s best copied in too', r.body.top.length === 1 && r.body.top[0].score === 19.5 && r.body.week === '2026-W41', r.body);
  r = await fpost({ op: 'group_join', player: id(2), group: code.toLowerCase() });
  check('join (any case)', r.status === 200 && r.body.code === code && r.body.name === 'Office League', r.body);
  r = await fget({ board: 'sniper', group: code, player: id(1) });
  check('friends only, ranked', r.body.top.map((x) => x.name).join() === 'Owls,Foxes' && r.body.me.rank === 2 && r.body.total === 2, r.body);
  check('unknown code', (await fpost({ op: 'group_join', player: id(3), group: 'ZZZZZZ' })).status === 404);
  check('bad code', (await fpost({ op: 'group_join', player: id(3), group: 'O0O0' })).status === 400);
  check('bad code on read', (await fget({ board: 'sniper', group: 'nope' })).status === 400);
  check('join needs a player', (await fpost({ op: 'group_join', player: 'x', group: code })).status === 400);
  r = await fpost({ board: 'sniper', player: id(1), name: 'Foxes', tag: 'AB12', score: 1200, played: now, groups: [code, code, 'ZZZZZZ', 'bad'] });
  check('a post still answers for the main boards', r.status === 200 && r.body.rank === 2 && r.body.week.rank === 2, r.body);
  r = await fget({ board: 'sniper', group: code, period: 'week' });
  check('posts update the group\'s weekly board', r.body.top.map((x) => `${x.name}:${x.score}`).join() === 'Foxes:1200,Owls:900', r.body.top);
  r = await fget({ board: 'sniper', group: code });
  check('and its all-time board', r.body.top[0].score === 1200 && r.body.total === 2, r.body);
  check('unknown codes make no board', (await fs.count('sniper#ZZZZZZ')) === 0);
  await fpost({ board: 'sniper', player: id(1), name: 'Fox Den', tag: 'AB12', score: 100, played: now, groups: [code] });
  r = await fget({ board: 'sniper', group: code });
  check('a worse score keeps the best, takes the new club name', r.body.top[0].score === 1200 && r.body.top[0].name === 'Fox Den', r.body.top);
  r = await fpost({ op: 'group_leave', player: id(2), group: code });
  r = await fget({ board: 'sniper', group: code, player: id(2) });
  check('leaving takes you off', r.body.top.length === 1 && r.body.total === 1 && r.body.me === null, r.body);
  r = await fget({ board: 'sniper', player: id(2) });
  check('the main board keeps everyone', r.body.total === 3 && r.body.me.rank === 3, r.body);
  r = await fpost({ op: 'group_join', player: id(2), group: code });
  r = await fget({ board: 'sniper', group: code });
  check('joining again puts you back', r.body.total === 2, r.body);
  r = await fpost({ op: 'group_new', player: id(1), name: 'Second' }, madeAt + 10000);
  check('one new group at a time', r.status === 429, r);
  r = await fpost({ op: 'group_new', player: id(1), name: 'shit' }, madeAt + 60000);
  check('names are filtered', r.status === 200 && r.body.name === 'Friends' && r.body.code !== code, r.body);
}
console.log(`leaderboard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
