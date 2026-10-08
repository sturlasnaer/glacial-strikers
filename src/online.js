// Online leaderboards. Each save gets a random player id; posts carry the club's name, a
// short tag from that id, and the score. Best scores wait in a queue until they're posted,
// so playing offline (or before the server is set up) loses nothing.

import { CLUB } from './data.js';

// The leaderboard server (an AWS Lambda function URL). ?lb=<url> overrides it for testing.
const DEFAULT_URL = '';
const query = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lb') : null;
export const LB_URL = query || DEFAULT_URL;

export const BOARD_INFO = {
  cones: { name: 'Cone Weave', better: 'lower', fmt: (v) => `${v.toFixed(2)}s` },
  sniper: { name: 'Sniper', better: 'higher', fmt: (v) => `${v} pts` },
  rondo: { name: 'Keep-Away', better: 'higher', fmt: (v) => `${v} pts` },
  breakaway: { name: 'Breakaway', better: 'higher', fmt: (v) => `${v}/5` },
  shootout_wins: { name: 'Shootout wins', better: 'higher', fmt: (v) => `${v} win${v === 1 ? '' : 's'}` },
  daily_streak: { name: 'Daily streak', better: 'higher', fmt: (v) => `${v} day${v === 1 ? '' : 's'}` },
};

export function onlineState(save) {
  if (!save.online) {
    const bytes = new Uint8Array(12);
    (globalThis.crypto || {}).getRandomValues?.(bytes);
    if (!bytes.some(Boolean)) for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    save.online = { id: [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''), pending: {} };
  }
  return save.online;
}

// four letters and digits, e.g. "K7Q2", so clubs with the same name can tell themselves apart
export const tagOf = (id) => parseInt(id.slice(0, 8), 16).toString(36).toUpperCase().slice(-4).padStart(4, '0');

export const onlineOn = (save) => save.settings.online !== false;
export const configured = () => !!LB_URL;

const isBetter = (board, a, b) => (BOARD_INFO[board].better === 'lower' ? a < b : a > b);

function request(method, params, body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), 7000);
  const url = method === 'GET' ? `${LB_URL}?${new URLSearchParams(params)}` : LB_URL;
  return fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: ctl?.signal })
    .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(Object.assign(new Error(j.error || r.status), { status: r.status })))))
    .finally(() => timer && clearTimeout(timer));
}

// Record a score: queue it (keeping only the best per board), then try to post it.
// Resolves to the server's answer ({ best, rank, total, improved }) or null.
export async function submit(save, board, score, char = '') {
  if (!onlineOn(save) || !BOARD_INFO[board] || !Number.isFinite(score)) return null;
  const st = onlineState(save);
  const prev = st.pending[board];
  if (!prev || isBetter(board, score, prev.score)) st.pending[board] = { score, char };
  if (!configured()) return null;
  return post(save, board);
}

async function post(save, board) {
  const st = onlineState(save);
  const entry = st.pending[board];
  if (!entry) return null;
  try {
    const res = await request('POST', null, { board, player: st.id, name: CLUB.name, tag: tagOf(st.id), score: entry.score, char: entry.char });
    if (st.pending[board] === entry) delete st.pending[board];
    return res;
  } catch (e) {
    if (e.status === 400) delete st.pending[board]; // the server won't ever take it
    if (e.status === 429) return new Promise((r) => setTimeout(r, 2500)).then(() => post(save, board)); // too quick: once more
    return null;
  }
}

// Post anything still queued (on start-up and after matches).
export async function flush(save) {
  if (!onlineOn(save) || !configured()) return 0;
  const boards = Object.keys(onlineState(save).pending);
  let sent = 0;
  for (const b of boards) if (await post(save, b)) sent++;
  return sent;
}

export function fetchBoard(save, board) {
  if (!configured()) return Promise.reject(new Error('not configured'));
  return request('GET', { board, player: onlineState(save).id });
}
