// Online leaderboards. Each save gets a random player id; posts carry the club's name, a
// short tag from that id, and the score. Best scores wait in a queue until they're posted,
// so playing offline (or before the server is set up) loses nothing. The drill boards also
// have weekly boards (Monday to Monday, UTC); a queued score keeps the time it was played,
// so it counts for that week.

import { CLUB } from './data.js';
import { t } from './i18n.js';

// The leaderboard server (an AWS Lambda function URL). ?lb=<url> overrides it for testing.
// A copy served from this computer (localhost) stays off the live server, so test saves and
// scores don't land on the real boards; ?online=1 turns it back on.
const DEFAULT_URL = 'https://vivkdhbjjsajnazmoijsbim3gq0tjzox.lambda-url.eu-west-1.on.aws/';
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
const local = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname) && params.get('online') !== '1';
export const LB_URL = (params && params.get('lb')) || (local ? '' : DEFAULT_URL);

export const BOARD_INFO = {
  cones: { name: 'Cone Weave', better: 'lower', weekly: true, fmt: (v) => t('{seconds}s', { seconds: v.toFixed(2) }) },
  sniper: { name: 'Sniper', better: 'higher', weekly: true, fmt: (v) => t('{n} pts', { n: v }) },
  rondo: { name: 'Keep-Away', better: 'higher', weekly: true, fmt: (v) => t('{n} pts', { n: v }) },
  breakaway: { name: 'Breakaway', better: 'higher', weekly: true, fmt: (v) => `${v}/5` },
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

// Record a score: queue it (keeping only the best per board), then try to post it. A Cone
// Weave run can come along as a ghost ({ path, splits }), sent once the score is a best.
// Resolves to the server's answer ({ best, rank, total, improved }) or null.
export async function submit(save, board, score, char = '', ghost = null) {
  if (!onlineOn(save) || !BOARD_INFO[board] || !Number.isFinite(score)) return null;
  const st = onlineState(save);
  const prev = st.pending[board];
  if (!prev || isBetter(board, score, prev.score)) st.pending[board] = { score, char, played: Date.now(), ...(ghost && (ghost.path || ghost.attempts) ? { ghost } : {}) };
  if (!configured()) return null;
  return post(save, board);
}

async function post(save, board) {
  const st = onlineState(save);
  const entry = st.pending[board];
  if (!entry) return null;
  try {
    const res = await request('POST', null, { board, player: st.id, name: CLUB.name, tag: tagOf(st.id), score: entry.score, char: entry.char, played: entry.played, groups: groupsOf(save).map((g) => g.code) });
    if (st.pending[board] === entry) delete st.pending[board];
    if (entry.ghost && (res.improved || (res.week && res.week.improved))) {
      await request('POST', null, { op: 'ghost_put', board, player: st.id, score: entry.score, played: entry.played, ghost: { ...entry.ghost, char: entry.char } }).catch(() => {});
    }
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

// period: 'all' or 'week' (the drill boards); group: a friends code, or null for everyone
export function fetchBoard(save, board, period = 'all', group = null) {
  if (!configured()) return Promise.reject(new Error('not configured'));
  return request('GET', { board, player: onlineState(save).id, ...(period === 'week' ? { period } : {}), ...(group ? { group } : {}) });
}

// The leader's run on a board (this week's, or a friends board's), to race as a ghost.
// Resolves to { name, tag, char, score, path, splits } or null.
export function fetchGhost(save, board, period = 'week', group = null) {
  if (!configured()) return Promise.reject(new Error('not configured'));
  return request('GET', { board, ghost: '1', ...(period === 'week' ? { period } : {}), ...(group ? { group } : {}) }).then((r) => r.ghost);
}

// ------------------------------------------------------------------ challenges
// Any Cone Weave or Breakaway run can be filed under a code for a friend to race; the link
// opens the game at #race=CODE.
export const CHALLENGE_BOARDS = ['cones', 'breakaway'];
export const challengeLink = (code) => `${location.origin}${location.pathname}#race=${code}`;
const serverError = () => new Error(t('Couldn\'t reach the server. Try again in a moment.'));

export async function createChallenge(save, board, score, char, ghost) {
  if (!configured()) throw serverError();
  const st = onlineState(save);
  const r = await request('POST', null, { op: 'challenge_put', board, player: st.id, name: CLUB.name, tag: tagOf(st.id), score, ghost: { ...ghost, char } })
    .catch((e) => { throw e.status === 429 ? new Error(t('One challenge at a time: try again in a few seconds.')) : serverError(); });
  return r.code;
}

// Resolves to { board, name, tag, char, score, path, splits, attempts }, or rejects.
export function fetchChallenge(code) {
  if (!configured()) return Promise.reject(serverError());
  return request('GET', { challenge: code }).then((r) => r.challenge)
    .catch((e) => { throw e.status === 404 || e.status === 400 ? new Error(t('No challenge with that code. It may be mistyped.')) : serverError(); });
}

// ------------------------------------------------------------------ friends boards
// A friends group is a six-character code with a name. The boards have a copy for each
// group with just its members; scores posted from here go onto the player's groups too.
export const MAX_GROUPS = 3;
export const groupsOf = (save) => (onlineState(save).groups ||= []);
export const parseGroupCode = (text) => {
  const c = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-HJ-NP-Z2-9]{6}$/.test(c) ? c : null;
};
export const inviteLink = (code) => `${location.origin}${location.pathname}#join=${code}`;
const groupError = (e) => new Error(e.status === 404 ? t('No friends board with that code.') : e.status === 429 ? t('One new board at a time: try again in half a minute.') : t('Couldn\'t reach the server. Try again in a moment.'));

// Start a new group (and join it). Resolves to { code, name }.
export async function createGroup(save, name) {
  if (!configured()) throw new Error(t('Couldn\'t reach the server. Try again in a moment.'));
  if (groupsOf(save).length >= MAX_GROUPS) throw new Error(t('You\'re on {n} friends boards already. Leave one to make room.', { n: MAX_GROUPS }));
  await flush(save); // so the bests copied in are the latest
  const r = await request('POST', null, { op: 'group_new', player: onlineState(save).id, name }).catch((e) => { throw groupError(e); });
  groupsOf(save).push({ code: r.code, name: r.name });
  return r;
}

export async function joinGroup(save, text) {
  const code = parseGroupCode(text);
  if (!code) throw new Error(t('That code doesn\'t look right: it has 6 letters and digits.'));
  const mine = groupsOf(save);
  const had = mine.find((g) => g.code === code);
  if (had) return had;
  if (mine.length >= MAX_GROUPS) throw new Error(t('You\'re on {n} friends boards already. Leave one to make room.', { n: MAX_GROUPS }));
  if (!configured()) throw new Error(t('Couldn\'t reach the server. Try again in a moment.'));
  await flush(save);
  const r = await request('POST', null, { op: 'group_join', player: onlineState(save).id, group: code }).catch((e) => { throw groupError(e); });
  const g = { code: r.code, name: r.name };
  mine.push(g);
  return g;
}

export async function leaveGroup(save, code) {
  if (configured()) await request('POST', null, { op: 'group_leave', player: onlineState(save).id, group: code }).catch((e) => { if (e.status !== 404) throw groupError(e); });
  const st = onlineState(save);
  st.groups = groupsOf(save).filter((g) => g.code !== code);
}

// "3d 4h" / "5h 20m" until the weekly boards reset
export function resetsIn(at, now = Date.now()) {
  const m = Math.max(0, Math.round((at - now) / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? t('{d}d {h}h', { d, h }) : t('{h}h {m}m', { h, m: m % 60 });
}

// ------------------------------------------------------------------ the Weekly Cup
// Every friends board runs a cup over its four weekly drill boards (5, 3 and 2 points for the
// top three on each, 1 for taking part). Resolves to { name, week, resetsAt, standings,
// last: { week, standings } }, the rows marked `me` for this player.
export function fetchCup(save, code) {
  if (!configured()) return Promise.reject(new Error('not configured'));
  return request('GET', { cup: code, player: onlineState(save).id });
}

// The ISO week (UTC) a time falls in, as the server keys it ('2026-W41').
export function weekKey(ms) {
  const DAY = 86400000, d = new Date(ms);
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ((d.getUTCDay() + 6) % 7) * DAY;
  const year = new Date(monday + 3 * DAY).getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4), week1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * DAY;
  return `${year}-W${String(Math.round((monday - week1) / (7 * DAY)) + 1).padStart(2, '0')}`;
}

// Once a week per board, see how last week's cup ended. A top-three finish (on a board where
// at least two played) goes into the save's trophy case; resolves to the new ones.
export async function settleCups(save, now = Date.now()) {
  if (!onlineOn(save) || !configured()) return [];
  const st = onlineState(save), last = weekKey(now - 7 * 86400000), out = [];
  st.cups ||= {}; // board code -> the last week settled
  for (const g of groupsOf(save)) {
    if (st.cups[g.code] === last) continue;
    const r = await fetchCup(save, g.code).catch(() => null);
    if (!r) continue;
    st.cups[g.code] = r.last.week;
    const me = r.last.standings.find((x) => x.me);
    if (!me || me.place > 3 || r.last.standings.length < 2) continue;
    const won = { week: r.last.week, code: g.code, name: r.name, place: me.place, of: r.last.standings.length, points: me.points };
    (save.weeklyCups ||= []).push(won);
    out.push(won);
  }
  return out;
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
