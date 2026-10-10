// Online leaderboards and cloud saves: the request handling, shared by the AWS Lambda
// (server/lambda.mjs) and the local test server (tools/leaderboard_server.mjs). Storage is
// passed in.
import { createHash, randomInt } from 'crypto';
//
// One record per player per board holds their best score. Boards rank by a sortable key
// (better scores first, earlier on ties). Scores come from a browser game, so they can be
// faked by anyone determined; the checks here keep out nonsense and spam, not cheaters.
//
// The drill boards also have a weekly board, stored as '<board>@<ISO week>' (for example
// 'sniper@2026-W41'), that starts empty every Monday at 00:00 UTC. A score counts for the
// week it was set in: the client sends when it was played, so a score queued offline
// still lands in the right week.
//
// Friends boards: a group is a short code (six letters and digits, no look-alikes) with a
// name, kept as a '_group' row. Every board has a copy per group, '<board>#<CODE>' (and
// '<board>@<week>#<CODE>'), kept up to date for the groups a score post names. Joining
// copies the player's current bests in; leaving rewrites their rows without a rank, which
// takes them out of the byRank index the boards are read and counted from.
//
// Ghost runs: a Cone Weave best can bring its run along (the skater's path, sampled 15
// times a second, and the gate splits); a Sniper best too (the skater's and the puck's paths
// and the targets hit). It's stored beside the best it belongs to, as a
// 'ghost:<board>' or 'ghost:<board>@<week>' row, and only while it matches that best.
// GET ?board=cones&ghost=1 (with period=week and/or group=CODE) returns the leader's run.
// Breakaway runs are five attempts, each the skater's path, the puck's and how it ended.
//
// Challenges: any run (not just a best) can be filed under a short code for a friend to
// race: POST {op: 'challenge_put'} returns the code, GET ?challenge=CODE the run.
//
// The Weekly Cup: every friends board runs one, Monday to Sunday, over the group's weekly
// drill boards (the first four; all six from week 42 of 2026). GET ?cup=CODE returns this
// week's standings and last week's, each with the drills that week counted.
// Nothing new is stored: past weeks' group boards are still there to read.

export const BOARDS = {
  cones: { better: 'lower', min: 8, max: 200, decimals: 2 }, // seconds
  sniper: { better: 'higher', min: 0, max: 10000, decimals: 0 },
  rondo: { better: 'higher', min: 0, max: 1000, decimals: 0 },
  breakaway: { better: 'higher', min: 0, max: 5, decimals: 0 },
  faceoffs: { better: 'higher', min: 0, max: 10, decimals: 0 }, // draws won of ten
  tips: { better: 'higher', min: 0, max: 10, decimals: 0 }, // tip-in goals of ten shots
  powerplay: { better: 'higher', min: 0, max: 20, decimals: 0 }, // goals in the Power Play drill's 45 seconds
  shootout_wins: { better: 'higher', min: 0, max: 100000, decimals: 0 },
  daily_streak: { better: 'higher', min: 0, max: 10000, decimals: 0 },
};

export const WEEKLY = new Set(['cones', 'sniper', 'rondo', 'breakaway', 'faceoffs', 'tips', 'powerplay']); // (the Power Play isn't in the Weekly Cup)
// The Weekly Cup's drills: the first four, and from week 42 of 2026 (Monday 12 October)
// Faceoffs and Tip-Ins too (so no cup changed its drills part of the way through a week)
export const CUP = ['cones', 'sniper', 'rondo', 'breakaway'];
export const CUP_FROM = { faceoffs: '2026-W42', tips: '2026-W42' };
export const cupBoards = (wk) => [...CUP, ...Object.keys(CUP_FROM).filter((b) => wk >= CUP_FROM[b])];
const DAY = 86400000;

// The ISO week (UTC) a time falls in, e.g. '2026-W41', and when that week ends.
export function weekOf(ms) {
  const d = new Date(ms);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY;
  const year = new Date(monday + 3 * DAY).getUTCFullYear(); // the week's Thursday decides its year
  const jan4 = Date.UTC(year, 0, 4);
  const week1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY;
  const n = Math.round((monday - week1) / (7 * DAY)) + 1;
  return { key: `${year}-W${String(n).padStart(2, '0')}`, ends: monday + 7 * DAY };
}
const weekBoard = (board, key) => `${board}@${key}`;

const TOP = 25;
const MIN_GAP_MS = 2000; // per player and board
export const MAX_SCORE_BODY = 2048;
export const MAX_SAVE_BODY = 262144; // a save is a few tens of KB; the table allows 400 KB
const SAVE_GAP_MS = 20000;
const SAVE_BOARD = '_save';
const GROUP_BOARD = '_group';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_GROUPS = 3;
const GROUP_GAP_MS = 30000; // between new groups from one player
const validCode = (c) => typeof c === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(c);
const groupKey = (key, code) => `${key}#${code}`;
const validPlayer = (p) => typeof p === 'string' && /^[a-f0-9]{16,40}$/.test(p);
export const GHOST_BOARDS = new Set(['cones', 'breakaway', 'sniper']);
const GHOST_HZ = 15;
export const MAX_GHOST_PATH = 6000; // base64: a 4-byte start, then 3 bytes a sample (60 s at most)
const MAX_ATTEMPT_PATH = 1500; // a breakaway attempt is 8 s at most
const MAX_SNIPER_PATH = 3000; // the 45-second Sniper run, the skater's path and the puck's
const MAX_GHOST_BODY = 14000;
const CHALLENGE_BOARD = '_challenge';
const CHALLENGE_GAP_MS = 15000; // between challenges from one player
const validChallenge = (c) => typeof c === 'string' && /^[A-HJ-NP-Z2-9]{7}$/.test(c);
const RESULTS = new Set(['goal', 'save', 'miss', 'time']);

// Cloud saves are filed under a hash of the player's backup code, so the code itself is
// never stored: knowing the table's contents doesn't let anyone read or overwrite a save.
const saveKey = (token) => createHash('sha256').update('puckbound-save:' + token).digest('hex');
const validToken = (t) => typeof t === 'string' && /^[A-Z2-7]{32}$/.test(t);

async function cloudSave(b, store, now) {
  if (!validToken(b.token)) return bad('bad code');
  const key = saveKey(b.token);
  if (b.op === 'save_get') {
    const row = await store.get(SAVE_BOARD, key);
    return row ? ok({ data: row.data, at: row.at }) : bad('not found', 404);
  }
  if (typeof b.data !== 'string' || b.data.length < 2 || b.data.length > MAX_SAVE_BODY - 512) return bad('bad save');
  try { if (typeof JSON.parse(b.data) !== 'object') return bad('bad save'); } catch { return bad('bad save'); }
  const prev = await store.get(SAVE_BOARD, key);
  if (prev && now - (prev.at || 0) < SAVE_GAP_MS) return bad('slow down', 429);
  await store.put({ board: SAVE_BOARD, player: key, data: b.data, at: now });
  return ok({ at: now });
}

// The board keys a group has right now: every all-time board and this week's drill boards.
const groupKeys = (code, now) => {
  const wk = weekOf(now).key;
  return [
    ...Object.keys(BOARDS).map((board) => ({ board, from: board, key: groupKey(board, code) })),
    ...[...WEEKLY].map((board) => ({ board, from: weekBoard(board, wk), key: groupKey(weekBoard(board, wk), code) })),
  ];
};
const live = (row) => !!row && row.rank !== undefined;

// Keep a player's best on one group board (a left player's row counts as empty).
async function groupBest(store, key, board, who, score, at, now) {
  const def = BOARDS[board];
  const prev = await store.get(key, who.player);
  const better = !live(prev) || (def.better === 'higher' ? score > prev.score : score < prev.score);
  if (better) await store.put({ board: key, ...who, score, at, rank: rankKey(board, score, at), last: now });
  else if (prev.name !== who.name || prev.tag !== who.tag) await store.put({ ...prev, name: who.name, tag: who.tag });
}

// Copy the player's current bests into a group's boards.
async function copyBests(store, code, player, now) {
  for (const g of groupKeys(code, now)) {
    const row = await store.get(g.from, player);
    if (live(row)) await groupBest(store, g.key, g.board, { player, name: row.name, tag: row.tag, char: row.char }, row.score, row.at, now);
  }
}

async function groups(b, store, now) {
  if (!validPlayer(b.player)) return bad('bad player');
  if (b.op === 'group_new') {
    const mark = await store.get(GROUP_BOARD, 'by:' + b.player);
    if (mark && now - (mark.at || 0) < GROUP_GAP_MS) return bad('slow down', 429);
    let code = null;
    for (let i = 0; i < 6 && !code; i++) {
      const c = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
      if (!(await store.get(GROUP_BOARD, c))) code = c;
    }
    if (!code) return bad('try again', 503);
    const name = cleanName(b.name, 'Friends');
    await store.put({ board: GROUP_BOARD, player: code, name, at: now });
    await store.put({ board: GROUP_BOARD, player: 'by:' + b.player, at: now });
    await copyBests(store, code, b.player, now);
    return ok({ code, name });
  }
  const code = String(b.group || '').toUpperCase();
  if (!validCode(code)) return bad('bad code');
  const group = await store.get(GROUP_BOARD, code);
  if (!group) return bad('not found', 404);
  if (b.op === 'group_join') {
    await copyBests(store, code, b.player, now);
    return ok({ code, name: group.name });
  }
  // group_leave
  for (const g of groupKeys(code, now)) {
    const row = await store.get(g.key, b.player);
    if (live(row)) await store.put({ board: g.key, player: b.player, left: now });
  }
  return ok({ code });
}

// The played time a score counts for (a queued score can arrive late, but not from the future).
const playedAt = (played, now) => { const p = Number(played); return Number.isFinite(p) && p <= now + 60000 && p > now - 8 * DAY ? Math.min(p, now) : now; };

// A packed path: base64 of a 4-byte start and 3 bytes a sample. Its length in seconds, or -1.
const pathSecs = (p, max) => {
  if (typeof p !== 'string' || p.length > max || !/^[A-Za-z0-9+/]+=*$/.test(p)) return -1;
  const bytes = Math.floor(p.replace(/=+$/, '').length * 3 / 4);
  return bytes >= 7 && (bytes - 4) % 3 === 0 ? (bytes - 4) / 3 / GHOST_HZ : -1;
};

// Check a run for a board and keep only its known parts; null if it isn't one.
// Cone Weave: { path, splits } (no longer than its time). Breakaway: { attempts: [{ path,
// puck, result }] } (up to five, as many goals as the score). Sniper: { path, puck, lit } (45
// seconds; lit: when each target was hit and which, a hundred points at least for each).
export function cleanRun(board, g, score) {
  if (!GHOST_BOARDS.has(board) || !g || typeof g !== 'object' || !Number.isFinite(score)) return null;
  const char = String(g.char || '').replace(/[^a-z0-9_]/g, '').slice(0, 24);
  if (board === 'cones') {
    const secs = pathSecs(g.path, MAX_GHOST_PATH);
    if (secs < 0 || secs > score + 1) return null;
    const splits = Array.isArray(g.splits) ? g.splits.slice(0, 12).map(Number).filter(Number.isFinite) : [];
    return { path: g.path, splits, char };
  }
  if (board === 'sniper') {
    const a = pathSecs(g.path, MAX_SNIPER_PATH), b = pathSecs(g.puck, MAX_SNIPER_PATH);
    if (a < 0 || b < 0 || a > 46 || b > 46 || !Array.isArray(g.lit) || g.lit.length > 60 || g.lit.length * 100 > score) return null;
    const lit = g.lit.map((x) => (Array.isArray(x) ? [Number(x[0]), Number(x[1])] : null));
    if (lit.some((x) => !x || !Number.isFinite(x[0]) || x[0] < 0 || x[0] > 46 || ![0, 1, 2].includes(x[1]))) return null;
    return { path: g.path, puck: g.puck, lit, char };
  }
  if (!Array.isArray(g.attempts) || !g.attempts.length || g.attempts.length > 5) return null;
  const attempts = [];
  for (const a of g.attempts) {
    if (!a || !RESULTS.has(a.result) || pathSecs(a.path, MAX_ATTEMPT_PATH) < 0 || pathSecs(a.puck, MAX_ATTEMPT_PATH) < 0) return null;
    attempts.push({ path: a.path, puck: a.puck, result: a.result });
  }
  if (attempts.filter((a) => a.result === 'goal').length !== score) return null;
  return { attempts, char };
}

// Store a run with the best it belongs to (all-time and/or that week's).
async function putGhost(b, store, now) {
  if (!GHOST_BOARDS.has(b.board)) return bad('no ghosts for that board');
  if (!validPlayer(b.player)) return bad('bad player');
  const score = Number(b.score);
  const run = cleanRun(b.board, b.ghost, score);
  if (!run) return bad('bad ghost');
  const row = { player: b.player, score, ...run, at: now };
  let stored = 0;
  const wb = weekBoard(b.board, weekOf(playedAt(b.played, now)).key);
  for (const key of [b.board, ...(WEEKLY.has(b.board) ? [wb] : [])]) {
    const best = await store.get(key, b.player);
    if (live(best) && best.score === score) { await store.put({ board: 'ghost:' + key, ...row }); stored++; }
  }
  return stored ? ok({ stored }) : bad('not your best', 409);
}

// File a run under a new challenge code (one a player every 15 seconds).
async function putChallenge(b, store, now) {
  if (!validPlayer(b.player)) return bad('bad player');
  const score = Number(b.score);
  const def = BOARDS[b.board];
  if (!def || !Number.isFinite(score) || score < def.min || score > def.max) return bad('bad score');
  const run = cleanRun(b.board, b.ghost, score);
  if (!run) return bad('bad ghost');
  const mark = await store.get(CHALLENGE_BOARD, 'by:' + b.player);
  if (mark && now - (mark.at || 0) < CHALLENGE_GAP_MS) return bad('slow down', 429);
  let code = null;
  for (let i = 0; i < 6 && !code; i++) {
    const c = Array.from({ length: 7 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
    if (!(await store.get(CHALLENGE_BOARD, c))) code = c;
  }
  if (!code) return bad('try again', 503);
  await store.put({ board: CHALLENGE_BOARD, player: code, b: b.board, score, name: cleanName(b.name), tag: String(b.tag || '').replace(/[^A-Z0-9]/g, '').slice(0, 4), ...run, at: now });
  await store.put({ board: CHALLENGE_BOARD, player: 'by:' + b.player, at: now });
  return ok({ code });
}

// a small filter: clubs with these in the name post as "Anonymous Club"
const BLOCK = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'whore', 'slut', 'bitch', 'dick', 'cock', 'pussy', 'retard', 'kike', 'spic', 'chink'];
export function cleanName(name, fallback = 'Anonymous Club') {
  let n = String(name || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (!n || BLOCK.some((w) => flat.includes(w))) n = fallback;
  return n;
}

// Sort key: better first, then earlier. Kept as a decimal string (it doesn't fit a double).
export function rankKey(board, score, at) {
  const b = BOARDS[board];
  const units = BigInt(Math.round(score * 100)); // hundredths
  const base = b.better === 'higher' ? units : 100000000n - units;
  return (base * 10000000000000n + (9999999999999n - BigInt(at))).toString();
}

// A Weekly Cup table: 5, 3 and 2 points for the top three on each drill board, 1 for taking
// part; most points first, then most wins. Ties share a place.
const CUP_POINTS = [5, 3, 2];
async function cupTable(store, code, wk, player) {
  const table = new Map();
  for (const board of cupBoards(wk)) {
    const rows = await store.top(groupKey(weekBoard(board, wk), code), TOP);
    rows.forEach((r, i) => {
      const e = table.get(r.player) || { player: r.player, points: 0, firsts: 0, places: {} };
      Object.assign(e, { name: r.name, tag: r.tag });
      e.points += CUP_POINTS[i] || 1;
      if (i === 0) e.firsts++;
      e.places[board] = i + 1;
      table.set(r.player, e);
    });
  }
  const list = [...table.values()].sort((a, b) => b.points - a.points || b.firsts - a.firsts || String(a.name).localeCompare(String(b.name)));
  let place = 0;
  return list.map((e, i) => {
    if (!i || e.points !== list[i - 1].points || e.firsts !== list[i - 1].firsts) place = i + 1;
    return { place, name: e.name, tag: e.tag, points: e.points, firsts: e.firsts, places: e.places, ...(e.player === player ? { me: true } : {}) };
  });
}

const ok = (body, status = 200) => ({ status, body });
const bad = (msg, status = 400) => ({ status, body: { error: msg } });

export async function handle(req, store, now = Date.now()) {
  if (req.method === 'OPTIONS') return ok({});
  if (req.method === 'GET') {
    if (req.query.challenge !== undefined) {
      const code = String(req.query.challenge).toUpperCase();
      if (!validChallenge(code)) return bad('bad code');
      const c = await store.get(CHALLENGE_BOARD, code);
      if (!c) return bad('not found', 404);
      return ok({ challenge: { board: c.b, name: c.name, tag: c.tag, char: c.char, score: c.score, path: c.path, splits: c.splits, attempts: c.attempts, puck: c.puck, lit: c.lit, at: c.at } });
    }
    if (req.query.cup !== undefined) {
      const code = String(req.query.cup).toUpperCase();
      if (!validCode(code)) return bad('bad code');
      const g = await store.get(GROUP_BOARD, code);
      if (!g) return bad('not found', 404);
      const player = validPlayer(req.query.player) ? req.query.player : null;
      const week = weekOf(now), last = weekOf(now - 7 * DAY);
      return ok({
        code, name: g.name, week: week.key, resetsAt: week.ends, drills: cupBoards(week.key), standings: await cupTable(store, code, week.key, player),
        last: { week: last.key, drills: cupBoards(last.key), standings: await cupTable(store, code, last.key, player) },
      });
    }
    const board = req.query.board;
    if (!BOARDS[board]) return bad('unknown board'); // (saves aren't readable this way)
    const weekly = req.query.period === 'week';
    if (weekly && !WEEKLY.has(board)) return bad('no weekly board');
    const week = weekOf(now);
    const group = req.query.group;
    if (group !== undefined && !validCode(group)) return bad('bad code');
    const key = group ? groupKey(weekly ? weekBoard(board, week.key) : board, group) : weekly ? weekBoard(board, week.key) : board;
    if (req.query.ghost !== undefined) {
      // the leader's run, if it's stored with their best (ghost rows are filed under the main boards)
      if (!GHOST_BOARDS.has(board)) return bad('no ghosts for that board');
      const [lead] = await store.top(key, 1);
      const g = lead && await store.get('ghost:' + (weekly ? weekBoard(board, week.key) : board), lead.player);
      return ok({ board, ghost: g && g.score === lead.score ? { name: lead.name, tag: lead.tag, char: g.char, score: g.score, path: g.path, splits: g.splits || [], attempts: g.attempts, puck: g.puck, lit: g.lit } : null });
    }
    const top = await store.top(key, TOP);
    let me = null;
    const player = req.query.player;
    if (player && /^[a-f0-9]{16,40}$/.test(player)) {
      const mine = await store.get(key, player);
      if (live(mine)) me = { rank: (await store.countAbove(key, mine.rank)) + 1, score: mine.score };
    }
    return ok({ board, top: top.map(publicRow), me, total: await store.count(key), ...(weekly ? { week: week.key, resetsAt: week.ends } : {}) });
  }
  if (req.method === 'POST') {
    let b;
    const size = typeof req.body === 'string' ? req.body.length : 0;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return bad('bad json'); }
    if (!b || typeof b !== 'object') return bad('bad body');
    if (b.op === 'save_put' || b.op === 'save_get') return cloudSave(b, store, now);
    if (b.op === 'group_new' || b.op === 'group_join' || b.op === 'group_leave') return groups(b, store, now);
    if (b.op === 'ghost_put') return size > MAX_GHOST_BODY ? bad('too big', 413) : putGhost(b, store, now);
    if (b.op === 'challenge_put') return size > MAX_GHOST_BODY ? bad('too big', 413) : putChallenge(b, store, now);
    if (size > MAX_SCORE_BODY) return bad('too big', 413);
    const { board, player } = b;
    const def = BOARDS[board];
    if (!def) return bad('unknown board');
    if (typeof player !== 'string' || !/^[a-f0-9]{16,40}$/.test(player)) return bad('bad player');
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < def.min || score > def.max) return bad('score out of range');
    if (def.decimals === 0 && !Number.isInteger(score)) return bad('score must be whole');
    const name = cleanName(b.name);
    const tag = String(b.tag || '').replace(/[^A-Z0-9]/g, '').slice(0, 4);
    const char = String(b.char || '').replace(/[^a-z0-9_]/g, '').slice(0, 24);
    const prev = await store.get(board, player);
    if (prev && now - (prev.last || 0) < MIN_GAP_MS) return bad('slow down', 429);
    const better = !prev || (def.better === 'higher' ? score > prev.score : score < prev.score);
    const at = better ? now : prev.at;
    const row = better
      ? { board, player, name, tag, char, score, at, rank: rankKey(board, score, now), last: now }
      : { ...prev, name, tag, last: now }; // keep the best; refresh the name (club renamed)
    await store.put(row);
    const rank = (await store.countAbove(board, row.rank)) + 1;
    const out = { board, best: row.score, improved: better, rank, total: await store.count(board) };
    if (WEEKLY.has(board)) {
      // the week the score was set in (a queued score can arrive late, but not from the future)
      const played = Number(b.played);
      const when = Number.isFinite(played) && played <= now + 60000 && played > now - 8 * DAY ? Math.min(played, now) : now;
      const wk = weekOf(when), wb = weekBoard(board, wk.key);
      const prevW = await store.get(wb, player);
      const betterW = !prevW || (def.better === 'higher' ? score > prevW.score : score < prevW.score);
      const rowW = betterW ? { board: wb, player, name, tag, char, score, at: when, rank: rankKey(board, score, when), last: now } : prevW;
      if (betterW || prevW.name !== name || prevW.tag !== tag) await store.put(betterW ? rowW : { ...prevW, name, tag });
      out.week = { key: wk.key, best: rowW.score, improved: betterW, rank: (await store.countAbove(wb, rowW.rank)) + 1, total: await store.count(wb), resetsAt: wk.ends };
    }
    // the friends boards this player is on (codes that don't exist are skipped)
    const codes = [...new Set(Array.isArray(b.groups) ? b.groups : [])].filter(validCode).slice(0, MAX_GROUPS);
    for (const code of codes) {
      if (!(await store.get(GROUP_BOARD, code))) continue;
      const who = { player, name, tag, char };
      await groupBest(store, groupKey(board, code), board, who, score, now, now);
      if (out.week) {
        const played = Number(b.played);
        const when = Number.isFinite(played) && played <= now + 60000 && played > now - 8 * DAY ? Math.min(played, now) : now;
        await groupBest(store, groupKey(weekBoard(board, weekOf(when).key), code), board, who, score, when, now);
      }
    }
    return ok(out);
  }
  return bad('method not allowed', 405);
}

const publicRow = (r) => ({ name: r.name, tag: r.tag, score: r.score, char: r.char, at: r.at });

// In-memory storage, for the local server and tests.
export function memoryStore() {
  const boards = new Map();
  const of = (b) => { if (!boards.has(b)) boards.set(b, new Map()); return boards.get(b); };
  const cmp = (a, b) => (BigInt(b.rank) > BigInt(a.rank) ? 1 : BigInt(b.rank) < BigInt(a.rank) ? -1 : 0);
  return {
    async get(board, player) { const r = of(board).get(player); return r ? { ...r } : null; },
    async put(row) { of(row.board).set(row.player, { ...row }); },
    // (like the byRank index, only rows with a rank are on a board)
    async top(board, n) { return [...of(board).values()].filter(live).sort(cmp).slice(0, n); },
    async countAbove(board, rank) { const r = BigInt(rank); return [...of(board).values()].filter((x) => live(x) && BigInt(x.rank) > r).length; },
    async count(board) { return [...of(board).values()].filter(live).length; },
  };
}
