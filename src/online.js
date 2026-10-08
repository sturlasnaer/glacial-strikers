// Online leaderboards. Each save gets a random player id; posts carry the club's name, a
// short tag from that id, and the score. Best scores wait in a queue until they're posted,
// so playing offline (or before the server is set up) loses nothing.

import { CLUB } from './data.js';
import { t } from './i18n.js';

// The leaderboard server (an AWS Lambda function URL). ?lb=<url> overrides it for testing.
const DEFAULT_URL = '';
const query = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lb') : null;
export const LB_URL = query || DEFAULT_URL;

export const BOARD_INFO = {
  cones: { name: 'Cone Weave', better: 'lower', fmt: (v) => t('{seconds}s', { seconds: v.toFixed(2) }) },
  sniper: { name: 'Sniper', better: 'higher', fmt: (v) => t('{n} pts', { n: v }) },
  rondo: { name: 'Keep-Away', better: 'higher', fmt: (v) => t('{n} pts', { n: v }) },
  breakaway: { name: 'Breakaway', better: 'higher', fmt: (v) => `${v}/5` },
  shootout_wins: { name: 'Shootout wins', better: 'higher', fmt: (v) => t(v === 1 ? '{n} win' : '{n} wins', { n: v }) },
  daily_streak: { name: 'Daily streak', better: 'higher', fmt: (v) => t(v === 1 ? '{n} day' : '{n} days', { n: v }) },
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

// ------------------------------------------------------------------ cloud saves
// The save is backed up under a random backup code (only a hash of it is stored on the
// server). The same code restores it on another device, which then keeps backing up to
// the same place.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function newToken() {
  const bytes = new Uint8Array(32);
  (globalThis.crypto || {}).getRandomValues?.(bytes);
  if (!bytes.some(Boolean)) for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((b) => B32[b & 31]).join('');
}
export function cloudState(save) {
  const st = onlineState(save);
  return (st.cloud ||= { token: newToken(), at: 0, sig: '' });
}
export const formatCode = (token) => token.match(/.{4}/g).join('-');
export const parseCode = (text) => {
  const t = String(text || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  return t.length === 32 ? t : null;
};
export const restoreLink = (save) => `${location.origin}${location.pathname}#restore=${cloudState(save).token}`;

// a cheap fingerprint so unchanged saves aren't uploaded again
const fingerprint = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + ':' + str.length; };

// Back up the save (at most every few minutes unless forced). Resolves to the time or null.
export async function backup(save, force = false) {
  if (!onlineOn(save) || !configured()) return null;
  const cs = cloudState(save);
  if (!force && Date.now() - cs.at < 4 * 60 * 1000) return null;
  const data = JSON.stringify(save);
  const sig = fingerprint(data.replace(/"cloud":\{[^}]*\}/, ''));
  if (!force && sig === cs.sig) return null;
  try {
    const r = await request('POST', null, { op: 'save_put', token: cs.token, data });
    cs.at = r.at || Date.now(); cs.sig = sig;
    return cs.at;
  } catch { return null; }
}

// Fetch a backed-up save by its code. Resolves to { save, at } or rejects.
export async function fetchCloudSave(code) {
  const token = parseCode(code);
  if (!token) throw new Error(t('That code doesn\'t look right: it has 32 letters and digits.'));
  if (!configured()) throw new Error(t('Cloud saves aren\'t open yet.'));
  try {
    const r = await request('POST', null, { op: 'save_get', token });
    return { save: JSON.parse(r.data), at: r.at };
  } catch (e) {
    throw new Error(e.status === 404 ? t('No save found for that code.') : t('Couldn\'t reach the server. Try again in a moment.'));
  }
}
