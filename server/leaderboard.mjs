// Online leaderboards and cloud saves: the request handling, shared by the AWS Lambda
// (server/lambda.mjs) and the local test server (tools/leaderboard_server.mjs). Storage is
// passed in.
import { createHash } from 'crypto';
//
// One record per player per board holds their best score. Boards rank by a sortable key
// (better scores first, earlier on ties). Scores come from a browser game, so they can be
// faked by anyone determined; the checks here keep out nonsense and spam, not cheaters.
//
// The drill boards also have a weekly board, stored as '<board>@<ISO week>' (for example
// 'sniper@2026-W41'), that starts empty every Monday at 00:00 UTC. A score counts for the
// week it was set in: the client sends when it was played, so a score queued offline
// still lands in the right week.

export const BOARDS = {
  cones: { better: 'lower', min: 8, max: 200, decimals: 2 }, // seconds
  sniper: { better: 'higher', min: 0, max: 10000, decimals: 0 },
  rondo: { better: 'higher', min: 0, max: 1000, decimals: 0 },
  breakaway: { better: 'higher', min: 0, max: 5, decimals: 0 },
  shootout_wins: { better: 'higher', min: 0, max: 100000, decimals: 0 },
  daily_streak: { better: 'higher', min: 0, max: 10000, decimals: 0 },
};

export const WEEKLY = new Set(['cones', 'sniper', 'rondo', 'breakaway']);
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

// a small filter: clubs with these in the name post as "Anonymous Club"
const BLOCK = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'whore', 'slut', 'bitch', 'dick', 'cock', 'pussy', 'retard', 'kike', 'spic', 'chink'];
export function cleanName(name) {
  let n = String(name || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o');
  if (!n || BLOCK.some((w) => flat.includes(w))) n = 'Anonymous Club';
  return n;
}

// Sort key: better first, then earlier. Kept as a decimal string (it doesn't fit a double).
export function rankKey(board, score, at) {
  const b = BOARDS[board];
  const units = BigInt(Math.round(score * 100)); // hundredths
  const base = b.better === 'higher' ? units : 100000000n - units;
  return (base * 10000000000000n + (9999999999999n - BigInt(at))).toString();
}

const ok = (body, status = 200) => ({ status, body });
const bad = (msg, status = 400) => ({ status, body: { error: msg } });

export async function handle(req, store, now = Date.now()) {
  if (req.method === 'OPTIONS') return ok({});
  if (req.method === 'GET') {
    const board = req.query.board;
    if (!BOARDS[board]) return bad('unknown board'); // (saves aren't readable this way)
    const weekly = req.query.period === 'week';
    if (weekly && !WEEKLY.has(board)) return bad('no weekly board');
    const week = weekOf(now);
    const key = weekly ? weekBoard(board, week.key) : board;
    const top = await store.top(key, TOP);
    let me = null;
    const player = req.query.player;
    if (player && /^[a-f0-9]{16,40}$/.test(player)) {
      const mine = await store.get(key, player);
      if (mine) me = { rank: (await store.countAbove(key, mine.rank)) + 1, score: mine.score };
    }
    return ok({ board, top: top.map(publicRow), me, total: await store.count(key), ...(weekly ? { week: week.key, resetsAt: week.ends } : {}) });
  }
  if (req.method === 'POST') {
    let b;
    const size = typeof req.body === 'string' ? req.body.length : 0;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return bad('bad json'); }
    if (!b || typeof b !== 'object') return bad('bad body');
    if (b.op === 'save_put' || b.op === 'save_get') return cloudSave(b, store, now);
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
    async top(board, n) { return [...of(board).values()].sort(cmp).slice(0, n); },
    async countAbove(board, rank) { const r = BigInt(rank); return [...of(board).values()].filter((x) => BigInt(x.rank) > r).length; },
    async count(board) { return of(board).size; },
  };
}
