// A living league: the rivals fill the holes your signings leave, with their Draft Day picks
// and now and then a free agent signed mid-season, and a rival who'll take your call may
// ring after a match with a trade offer of their own.
import { CHARACTERS, RECRUITS, ARCHETYPES, ELEMENTS, STAT_KEYS, member, recruitKey, RIVAL_IDS } from './data.js';
import { recruitStatus } from './progress.js';
import { tradeable, playerValue, TEAM_LIKES, trade } from './trades.js';
import { vacated, fillOf } from './slots.js';
import { randomLook } from './modular.js';

const RIVALS = RIVAL_IDS;
const KITS = ['frost', 'thunder', 'stone'];
const fills = (save) => (save.rivalFills ||= {});

// A rival's slots that need someone: vacated, and empty or held by a stopgap signing (a
// draft pick takes over from one of those).
export const holes = (save, teamId, draft = false) => KITS.filter((k) => {
  if (!vacated(save, teamId, k)) return false;
  const f = fillOf(save, teamId, k);
  return !f || (draft && f.how === 'sign');
});

// Draft Day: after your pick, a rival with a hole in that position takes each of the other
// two prospects (the drawn rivals otherwise, to their reserves). Rewrites d.rivals.
export function rivalDraft(save, d) {
  const left = d.prospects.map((p, i) => i).filter((i) => i !== d.picked);
  const taken = new Set();
  d.rivals = left.map((i, n) => {
    const p = d.prospects[i];
    const need = RIVALS.find((tid) => !taken.has(tid) && holes(save, tid, true).includes(p.kit));
    const team = need || [d.rivals[n], ...RIVALS].find((tid) => !taken.has(tid));
    taken.add(team);
    if (need) {
      fills(save)[`${team}:${p.kit}`] = { how: 'draft', name: p.name, kit: p.kit, arch: p.arch, elem: p.elem, hand: p.hand, parts: p.parts || null,
        base: { ...p.base }, special: p.special, potential: p.potential, season: d.season };
    }
    return team;
  });
  return d.rivals;
}

// Free agents a rival might sign mid-season: steady, done growing.
const AGENTS = {
  frost: ['Ostrom', 'Lasse', 'Corbin', 'Tibor', 'Vale'],
  thunder: ['Fenwick', 'Sully', 'Arno', 'Wren', 'Pike'],
  stone: ['Hollis', 'Brandt', 'Magnus', 'Ivo', 'Gunnhild'],
};
export const SIGN_CHANCE = 0.15; // after each league match, if anyone has a hole

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

function freeAgent(save, kit, rnd) {
  const used = new Set(Object.values(save.rivalFills || {}).map((f) => f.name));
  const names = AGENTS[kit].filter((n) => !used.has(n));
  const base = { ...CHARACTERS[kit].base };
  // a journeyman: a point better at one thing, a point worse at another
  const up = pick(STAT_KEYS, rnd), down = pick(STAT_KEYS.filter((k) => k !== up && base[k] > 3), rnd);
  base[up] = Math.min(10, base[up] + 1); base[down]--;
  const role = CHARACTERS[kit].role;
  return { how: 'sign', name: pick(names.length ? names : AGENTS[kit], rnd), kit, base, potential: 1, season: save.season,
    arch: pick(Object.values(ARCHETYPES).filter((a) => a.roles.includes(role)).map((a) => a.id), rnd),
    elem: pick(Object.keys(ELEMENTS), rnd), hand: rnd() < 0.6 ? 'L' : 'R', parts: randomLook(rnd, role) };
}

// After a league match: maybe a rival fills a hole. Returns { team, kit, name } or null.
export function rivalSigning(save, rnd = Math.random) {
  const open = RIVALS.flatMap((tid) => holes(save, tid).map((kit) => [tid, kit]));
  if (!open.length || rnd() >= SIGN_CHANCE) return null;
  const [team, kit] = pick(open, rnd);
  const f = freeAgent(save, kit, rnd);
  fills(save)[`${team}:${kit}`] = f;
  return { team, kit, name: f.name };
}

// Trade offers: a rival whose players will take your call asks for one of yours (a style they
// like counts double, worth counts too, and there's some luck in it), offering whichever of theirs is closest in value,
// with coins to even it out either way (they pay half the difference when yours is worth more).
export const OFFER_CHANCE = 0.12;
const OFFER_GAP = 3; // matches between offers

export function rivalOffer(save, rnd = Math.random) {
  const played = save.record.played;
  if (save.lastOffer != null && played - save.lastOffer < OFFER_GAP) return null;
  const mine = tradeable(save);
  if (!mine.length) return null;
  const teams = RIVALS.filter((tid) => KITS.some((k) => recruitStatus(save, recruitKey(tid, k)) === 'open'));
  if (!teams.length || rnd() >= OFFER_CHANCE) return null;
  const team = pick(teams, rnd);
  const likes = TEAM_LIKES[team] || [];
  // who they ask for: a style they like weighs most, then value, with a little luck
  const score = (id) => (likes.includes(member(id).def.arch) ? 2 : 1) * (1 + playerValue(save, id) / 600) * (0.6 + rnd() * 0.8);
  const want = mine.map((id) => [id, score(id)]).sort((a, b) => b[1] - a[1])[0][0];
  const value = Math.round(playerValue(save, want) * (likes.includes(member(want).def.arch) ? 1.25 : 1));
  const theirs = KITS.map((k) => recruitKey(team, k)).filter((k) => recruitStatus(save, k) === 'open');
  const get = [...theirs].sort((a, b) => Math.abs(RECRUITS[a].price - value) - Math.abs(RECRUITS[b].price - value))[0];
  const gap = RECRUITS[get].price - value;
  const coins = gap > 0 ? Math.ceil(gap / 10) * 10 : -Math.floor(-gap / 20) * 10;
  save.lastOffer = played;
  return { team, give: want, get, coins, likes: likes.includes(member(want).def.arch) };
}

// Taking an offer: the trade at the offered coins (negative: they pay you).
export function acceptOffer(save, o) {
  return trade(save, o.give, o.get, o.coins);
}
