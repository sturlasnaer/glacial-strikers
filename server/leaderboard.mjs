// Online leaderboards: the request handling, shared by the AWS Lambda (server/lambda.mjs)
// and the local test server (tools/leaderboard_server.mjs). Storage is passed in.
//
// One record per player per board holds their best score. Boards rank by a sortable key
// (better scores first, earlier on ties). Scores come from a browser game, so they can be
// faked by anyone determined; the checks here keep out nonsense and spam, not cheaters.

export const BOARDS = {
  cones: { better: 'lower', min: 8, max: 200, decimals: 2 }, // seconds
  sniper: { better: 'higher', min: 0, max: 10000, decimals: 0 },
  rondo: { better: 'higher', min: 0, max: 1000, decimals: 0 },
  breakaway: { better: 'higher', min: 0, max: 5, decimals: 0 },
  shootout_wins: { better: 'higher', min: 0, max: 100000, decimals: 0 },
  daily_streak: { better: 'higher', min: 0, max: 10000, decimals: 0 },
};

const TOP = 25;
const MIN_GAP_MS = 2000; // per player and board

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
    if (!BOARDS[board]) return bad('unknown board');
    const top = await store.top(board, TOP);
    let me = null;
    const player = req.query.player;
    if (player && /^[a-f0-9]{16,40}$/.test(player)) {
      const mine = await store.get(board, player);
      if (mine) me = { rank: (await store.countAbove(board, mine.rank)) + 1, score: mine.score };
    }
    return ok({ board, top: top.map(publicRow), me, total: await store.count(board) });
  }
  if (req.method === 'POST') {
    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return bad('bad json'); }
    if (!b || typeof b !== 'object') return bad('bad body');
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
    return ok({ board, best: row.score, improved: better, rank, total: await store.count(board) });
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
    async get(board, player) { return of(board).get(player) || null; },
    async put(row) { of(row.board).set(row.player, { ...row }); },
    async top(board, n) { return [...of(board).values()].sort(cmp).slice(0, n); },
    async countAbove(board, rank) { const r = BigInt(rank); return [...of(board).values()].filter((x) => BigInt(x.rank) > r).length; },
    async count(board) { return of(board).size; },
  };
}
