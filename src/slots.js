// Rival slots once you've signed their player (or signed and traded them on): whoever the
// rival brought in to fill the hole (a Draft Day pick, or a free agent signed mid-season,
// kept in save.rivalFills by 'team:kit'), or one of their reserves until then. They play in
// the newcomer art (Batch AA) in the team's colours, under their own name and style.
import { TEAMS, CHARACTERS, STAT_KEYS, STAR_AGES, recruitKey, makeDef, slotDef, slotLook } from './data.js';
import { bodySprite } from './modular.js';
import { TIER_STATS } from './tiers.js';

// The save's fills, for the portraits (which don't see the save): set when a save loads.
export let RIVAL_FILLS = {};
export const setFills = (save) => { RIVAL_FILLS = (save.rivalFills ||= {}); };
// A fill made from parts (Batch AJ/AO): their look, or null.
export const fillLook = (teamId, kit) => { const f = RIVAL_FILLS[`${teamId}:${kit}`]; return f && f.parts && bodySprite(f.parts) ? f.parts : null; };
// Does a rival field anyone made from parts? (their pages then load and take the team's colours)
export const teamHasParts = (teamId) => ['frost', 'thunder', 'stone'].some((k) => fillLook(teamId, k) || slotLook(teamId, k)); // (an expansion club: all of them)

export const vacated = (save, teamId, kit) => {
  const k = recruitKey(teamId, kit);
  return !!(save.roster[k] || (save.tradedAway && save.tradedAway[k]) || (save.retired && save.retired[k]));
};

// Rival careers: every rival star has an age (the same in every save), a year older each
// season. The young improve, the old decline, and at RETIRE_AT they hang up their skates
// after the season's awards; their slot then goes to a draft pick or a signing like any
// other you've emptied. (Players on your roster don't age: they grow by levels.)
export const RETIRE_AT = 34;
export function startAge(key) {
  if (STAR_AGES[key]) return STAR_AGES[key];
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return 21 + ((h >>> 0) % 11); // (anyone else: 21 to 31 in their first season)
}
export const ageOf = (save, key) => startAge(key) + ((save.season || 1) - 1);
const curve = (a) => (a <= 25 ? (a - 25) * 0.6 : a <= 30 ? 0 : -(a - 30) * 0.8);
// How much better (+) or worse (-) they are than in the first season, on their best stats.
export const formShift = (save, key) => Math.round(curve(ageOf(save, key)) - curve(startAge(key)));
// The league gets better every season: each rival player a point up on their four best
// stats per season after the first (four seasons at most), each rival goalie a point every
// other season.
export const leagueGrowth = (save) => Math.max(0, Math.min(4, (save.season || 1) - 1));
// The rivals play sharper each season too, for the same four seasons (after that the
// difficulty setting still has its say).
export const seasonBoost = (save) => leagueGrowth(save) * 0.08;
// On top of that, the league keeps up with a club that has run away from it: set each season
// from how far our line was ahead (see setLeagueEdge in progress.js), 0 to 3.
export const leagueEdge = (save) => save.leagueEdge || 0;
export function grown(save, stats, tier = 0) {
  const g = leagueGrowth(save) + leagueEdge(save) + tier * TIER_STATS; // (and a point a division up: league games, see tiers.js)
  if (!g) return stats;
  const out = { ...stats };
  for (const k of [...STAT_KEYS].sort((a, b) => out[b] - out[a]).slice(0, 4)) out[k] = Math.min(12 + leagueEdge(save), out[k] + g);
  return out;
}
// Rival goalies: a point a season (three at most), and the league's goalie edge on top (see
// setLeagueEdge), so a goalie we've built up doesn't leave every rival's behind.
export const goalieGrowth = (save) => Math.min(3, Math.max(0, (save.season || 1) - 1)) + (save.goalieEdge || 0);
export const GOALIE_CAP = 12;

// A star's numbers now: the slot's numbers, their three best moved by their form.
export function agedStats(save, teamId, kit, stats) {
  const d = formShift(save, recruitKey(teamId, kit));
  if (!d) return stats;
  const out = { ...stats };
  for (const k of [...STAT_KEYS].sort((a, b) => out[b] - out[a]).slice(0, 3)) out[k] = Math.max(1, Math.min(12, out[k] + d));
  return out;
}
// After a season's awards: the stars old enough retire. Returns [{ key, team, kit }].
export function retireRivals(save) {
  const out = [];
  for (const teamId of Object.keys(TEAMS)) {
    if (teamId === 'home' || !TEAMS[teamId].names) continue;
    for (const kit of ['frost', 'thunder', 'stone']) {
      const key = recruitKey(teamId, kit);
      if (vacated(save, teamId, kit) || ageOf(save, key) < RETIRE_AT) continue;
      (save.retired ||= {})[key] = save.season;
      out.push({ key, team: teamId, kit, seasons: save.season });
    }
  }
  return out;
}
export const fillOf = (save, teamId, kit) => (save.rivalFills && save.rivalFills[`${teamId}:${kit}`]) || null;

// A fill's stats now: a draft pick grows each season after their first (more the higher
// their potential), back to the kit's numbers and a little past them; a signing is who
// they are.
export function fillStats(save, f) {
  const stats = { ...f.base };
  if (f.how !== 'draft') return stats;
  const kit = CHARACTERS[f.kit].base;
  let n = Math.min(f.potential + 2, Math.max(0, save.season - f.season - 1) * (f.potential - 1));
  for (let guard = 0; n > 0 && guard < 40; guard++) {
    // the stat furthest below the kit's first, then the specialty
    const k = [...STAT_KEYS].sort((a, b) => (kit[b] - stats[b]) - (kit[a] - stats[a]) || (b === f.special) - (a === f.special))[0];
    if (stats[k] >= 10) break;
    stats[k]++; n--;
  }
  return stats;
}

// A reserve is a step down from the star they stand in for: their two best stats a point lower.
export function reserveStats(kit) {
  const stats = { ...CHARACTERS[kit].base };
  for (const k of [...STAT_KEYS].sort((a, b) => stats[b] - stats[a]).slice(0, 2)) stats[k] = Math.max(1, stats[k] - 1);
  return stats;
}

// Who plays the slot, or null while their own player is still there:
// { name, def, stats, hand, fill, sprite, parts } (stats before the team's bonus; a fill made
// from parts wears their body and head, anyone else the newcomer art).
export function rivalSub(save, teamId, kit) {
  if (!vacated(save, teamId, kit)) return null;
  const f = fillOf(save, teamId, kit);
  const newcomer = `newcomer_${{ frost: 'c', thunder: 'w', stone: 'd' }[kit]}`;
  if (!f) return { name: TEAMS[teamId].subs[kit], def: slotDef(teamId, kit), stats: reserveStats(kit), hand: undefined, fill: null, sprite: newcomer, parts: null };
  const body = f.parts && bodySprite(f.parts);
  return { name: f.name, def: makeDef(kit, f.arch, f.elem), stats: fillStats(save, f), hand: f.hand, fill: f, sprite: body || newcomer, parts: body ? f.parts : null };
}

// What a rival has lost to you, for their strength in simulated games: each emptied slot
// (a reserve costs the most; a fill costs what it's short of the kit's numbers, and a little
// for being new), and a backup in goal.
const SUM = (o) => Object.values(o).reduce((a, b) => a + b, 0);
export function rosterShift(save, teamId) {
  if (!TEAMS[teamId] || teamId === 'home') return 0;
  let d = 0;
  for (const kit of ['frost', 'thunder', 'stone']) {
    if (!vacated(save, teamId, kit)) { d += formShift(save, recruitKey(teamId, kit)) * 0.012; continue; } // (a star's form)
    const f = fillOf(save, teamId, kit);
    d += f ? Math.min(0, SUM(fillStats(save, f)) - SUM(CHARACTERS[kit].base)) * 0.01 - 0.01 : -0.05;
  }
  if (save.goalies && save.goalies[teamId + '_g']) d -= 0.04;
  return d;
}
