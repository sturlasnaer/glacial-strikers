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
// the Faceoffs and Tip-Ins drills: whole numbers out of ten, weekly boards too
r = await post({ board: 'faceoffs', player: id(5), name: 'Draws', score: 7 });
check('faceoffs board', r.status === 200 && r.body.rank === 1 && r.body.week && r.body.week.rank === 1, r.body);
r = await post({ board: 'tips', player: id(5), name: 'Draws', score: 4 });
check('tips board', r.status === 200 && r.body.rank === 1, r.body);
check('faceoffs out of ten', (await post({ board: 'faceoffs', player: id(6), score: 11 })).status === 400);
check('tips whole numbers', (await post({ board: 'tips', player: id(6), score: 2.5 })).status === 400);
r = await handle({ method: 'GET', query: { board: 'tips', period: 'week', player: id(5) } }, store, clock);
check('tips weekly board', r.status === 200 && r.body.top.length === 1 && r.body.resetsAt, r.body);
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
// ghost runs: stored with the best they belong to; the leader's comes back on request
{
  const gs = memoryStore();
  let now = Date.UTC(2026, 9, 7, 10);
  const gpost = (b, at = (now += 5000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, gs, at);
  const gget = (query) => handle({ method: 'GET', query }, gs, now);
  // a path: a 4-byte start, then 3 bytes a sample at 15 a second
  const path = (secs) => Buffer.alloc(4 + Math.round(secs * 15) * 3, 1).toString('base64');
  await gpost({ board: 'cones', player: id(1), name: 'Foxes', tag: 'AB12', score: 18.5, played: now, char: 'frost' });
  await gpost({ board: 'cones', player: id(2), name: 'Owls', tag: 'CD34', score: 16.25, played: now, char: 'thunder' });
  r = await gpost({ op: 'ghost_put', board: 'cones', player: id(2), score: 16.25, played: now, ghost: { path: path(14.2), splits: [1.1, 2.3], char: 'thunder' } });
  check('ghost stored with the best', r.status === 200 && r.body.stored === 2, r.body);
  r = await gget({ board: 'cones', period: 'week', ghost: '1' });
  check('the week\'s leader\'s ghost', r.body.ghost && r.body.ghost.name === 'Owls' && r.body.ghost.score === 16.25 && r.body.ghost.splits.length === 2 && r.body.ghost.path === path(14.2), r.body);
  r = await gget({ board: 'cones', ghost: '1' });
  check('and all-time', r.body.ghost && r.body.ghost.char === 'thunder', r.body);
  check('only for its best', (await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 15, played: now, ghost: { path: path(12) } })).status === 409);
  check('a run longer than its time', (await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 18.5, played: now, ghost: { path: path(25) } })).status === 400);
  check('not base64', (await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 18.5, ghost: { path: 'not a path!' } })).status === 400);
  check('cones only', (await gpost({ op: 'ghost_put', board: 'sniper', player: id(1), score: 5, ghost: { path: path(1) } })).status === 400);
  check('too long a path', (await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 18.5, ghost: { path: 'A'.repeat(7000) } })).status === 400);
  check('too big a body', (await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 18.5, ghost: { path: 'A'.repeat(15000) } })).status === 413);
  // a better time without a run: the old run no longer matches, so there's no ghost
  await gpost({ board: 'cones', player: id(1), name: 'Foxes', tag: 'AB12', score: 15.75, played: now });
  r = await gget({ board: 'cones', period: 'week', ghost: '1' });
  check('a leader without a run has no ghost', r.status === 200 && r.body.ghost === null, r.body);
  r = await gpost({ op: 'ghost_put', board: 'cones', player: id(1), score: 15.75, played: now, ghost: { path: path(15.1), char: 'frost' } });
  r = await gget({ board: 'cones', period: 'week', ghost: '1' });
  check('the new leader\'s ghost', r.body.ghost && r.body.ghost.name === 'Foxes', r.body);
  // friends boards: the group's leader's run
  r = await gpost({ op: 'group_new', player: id(2), name: 'Owl Club' });
  r = await gget({ board: 'cones', period: 'week', group: r.body.code, ghost: '1' });
  check('a friends board\'s leader\'s ghost', r.body.ghost && r.body.ghost.name === 'Owls' && r.body.ghost.score === 16.25, r.body);
}
// breakaway ghosts: five attempts, each a skater path, a puck path and how it ended
{
  const bs = memoryStore();
  let now = Date.UTC(2026, 9, 7, 12);
  const bpost = (b, at = (now += 5000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, bs, at);
  const path = (secs) => Buffer.alloc(4 + Math.round(secs * 15) * 3, 2).toString('base64');
  const att = (result) => ({ path: path(3), puck: path(3), result });
  const run = { attempts: [att('goal'), att('save'), att('goal'), att('miss'), att('goal')], char: 'stone' };
  await bpost({ board: 'breakaway', player: id(1), name: 'Foxes', tag: 'AB12', score: 3, played: now });
  r = await bpost({ op: 'ghost_put', board: 'breakaway', player: id(1), score: 3, played: now, ghost: run });
  check('breakaway ghost stored', r.status === 200 && r.body.stored === 2, r.body);
  r = await handle({ method: 'GET', query: { board: 'breakaway', period: 'week', ghost: '1' } }, bs, now);
  check('its five attempts come back', r.body.ghost && r.body.ghost.attempts.length === 5 && r.body.ghost.attempts[1].result === 'save' && r.body.ghost.char === 'stone', r.body);
  check('goals must match the score', (await bpost({ op: 'ghost_put', board: 'breakaway', player: id(1), score: 3, played: now, ghost: { attempts: [att('goal')] } })).status === 400);
  check('no unknown results', (await bpost({ op: 'ghost_put', board: 'breakaway', player: id(1), score: 0, played: now, ghost: { attempts: [att('dance')] } })).status === 400);
  check('six attempts is too many', (await bpost({ op: 'ghost_put', board: 'breakaway', player: id(1), score: 3, ghost: { attempts: [...run.attempts, att('miss')] } })).status === 400);
}
// challenges: any run under a short code, for a friend to race
{
  const cs = memoryStore();
  let now = Date.UTC(2026, 9, 7, 13);
  const cpost = (b, at = (now += 20000)) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, cs, at);
  const path = (secs) => Buffer.alloc(4 + Math.round(secs * 15) * 3, 3).toString('base64');
  r = await cpost({ op: 'challenge_put', board: 'cones', player: id(1), name: 'Fox Den', tag: 'AB12', score: 17.5, ghost: { path: path(16), splits: [1, 2], char: 'frost' } });
  const code = r.body.code;
  check('a challenge code', r.status === 200 && /^[A-HJ-NP-Z2-9]{7}$/.test(code), r.body);
  r = await handle({ method: 'GET', query: { challenge: code.toLowerCase() } }, cs, now);
  check('the challenge comes back', r.status === 200 && r.body.challenge.board === 'cones' && r.body.challenge.name === 'Fox Den' && r.body.challenge.score === 17.5 && r.body.challenge.path === path(16) && r.body.challenge.char === 'frost', r.body);
  check('unknown code', (await handle({ method: 'GET', query: { challenge: 'ZZZZZZZ' } }, cs, now)).status === 404);
  check('bad code', (await handle({ method: 'GET', query: { challenge: 'nope' } }, cs, now)).status === 400);
  check('one at a time', (await cpost({ op: 'challenge_put', board: 'cones', player: id(1), name: 'X', score: 17, ghost: { path: path(16) } }, now + 1000)).status === 429);
  check('a run that doesn\'t fit its time', (await cpost({ op: 'challenge_put', board: 'cones', player: id(2), name: 'X', score: 10, ghost: { path: path(16) } })).status === 400);
  check('no challenges for sniper', (await cpost({ op: 'challenge_put', board: 'sniper', player: id(2), name: 'X', score: 900, ghost: { path: path(1) } })).status === 400);
  r = await cpost({ op: 'challenge_put', board: 'breakaway', player: id(3), name: 'Owls', score: 1, ghost: { attempts: [{ path: path(2), puck: path(2), result: 'goal' }, { path: path(2), puck: path(2), result: 'save' }] } });
  check('a breakaway challenge', r.status === 200 && r.body.code !== code, r.body);
}
// the Weekly Cup: a friends board's four weekly drill boards, scored by place
{
  const ws = memoryStore();
  let now = Date.UTC(2026, 9, 6, 12); // a Tuesday, week 41
  const wpost = (b) => handle({ method: 'POST', query: {}, body: JSON.stringify(b) }, ws, (now += 40000));
  const cupGet = (code, player) => handle({ method: 'GET', query: { cup: code, player } }, ws, now);
  r = await wpost({ op: 'group_new', player: id(1), name: 'Pond Crew' });
  const code = r.body.code;
  await wpost({ op: 'group_join', player: id(2), code });
  await wpost({ op: 'group_join', player: id(3), code });
  const score = (n, board, sc) => wpost({ board, player: id(n), name: 'P' + n, score: sc, played: now, groups: [code] });
  await score(1, 'sniper', 900); await score(2, 'sniper', 1200); await score(3, 'sniper', 400);
  await score(1, 'cones', 15.5); await score(2, 'cones', 19);
  await score(1, 'rondo', 30);
  await score(3, 'faceoffs', 9); // (a weekly board, but not in the cup)
  r = await cupGet(code, id(1));
  const st = r.body.standings;
  check('cup standings', r.status === 200 && st.length === 3 && st[0].name === 'P1' && st[0].points === 13 && st[0].me && st[1].name === 'P2' && st[1].points === 8 && st[2].points === 2, st);
  check('cup places per board', st[0].places.sniper === 2 && st[0].places.cones === 1 && st[0].firsts === 2, st[0]);
  check('Faceoffs is not a cup drill', st[2].places.faceoffs === undefined && st[2].points === 2, st[2]);
  const fr = await handle({ method: 'GET', query: { board: 'faceoffs', period: 'week', group: code, player: id(3) } }, ws, now);
  check("...but has the group's weekly board", fr.status === 200 && fr.body.top.length === 1 && fr.body.top[0].score === 9, fr.body);
  check('cup name and week', r.body.name === 'Pond Crew' && r.body.week === '2026-W41' && r.body.last.week === '2026-W40' && r.body.last.standings.length === 0, r.body);
  now += 7 * 86400000; // next week: last week's cup is settled, this week's is empty
  r = await cupGet(code, id(2));
  check('last week settled', r.body.last.standings[0].name === 'P1' && r.body.last.standings[1].me && r.body.standings.length === 0, r.body);
  check('cup unknown code', (await cupGet('ZZZZZZ')).status === 404);
  check('cup bad code', (await cupGet('nope')).status === 400);
}
console.log(`leaderboard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
