// Legends in Scouting: now and then, after a match, one of the legends turns up as a free
// agent and stays for three matches. Once one twin has signed, the other comes looking
// sooner. They join at your line-up's level, with the perks for the levels they skipped.
import { LEGENDS, member } from './data.js';
import { joinLevel, newMember, PERK_LEVELS } from './progress.js';

export const LEGEND_CHANCE = 0.08; // a match's chance that a legend turns up
export const TWIN_CHANCE = 0.3; // once their twin is yours
export const STAY = 3; // matches they wait for your call
const FIRST_AFTER = 6; // not before a few matches

export const legendState = (save) => (save.legends ||= { visiting: null, until: 0, seen: [] });

// After a match: a visit ends, or maybe one begins. Returns the legend who just turned up,
// or null. Without their art they stay hidden (`art` says which legends can show).
export function rollLegend(save, rnd = Math.random, art = () => true) {
  const st = legendState(save), played = save.record.played;
  if (st.visiting && (save.roster[st.visiting] || played >= st.until)) st.visiting = null;
  if (st.visiting || played < FIRST_AFTER) return null;
  const free = Object.keys(LEGENDS).filter((k) => !save.roster[k] && art(k));
  if (!free.length) return null;
  const twinIn = free.filter((k) => save.roster[LEGENDS[k].twin]);
  if (rnd() >= (twinIn.length ? TWIN_CHANCE : LEGEND_CHANCE)) return null;
  const key = twinIn.length ? twinIn[0] : free[Math.floor(rnd() * free.length)];
  st.visiting = key;
  st.until = played + STAY;
  if (!st.seen.includes(key)) st.seen.push(key);
  return key;
}

// Matches left before the visiting legend moves on.
export const legendLeft = (save) => Math.max(0, legendState(save).until - save.record.played);

export function signLegend(save, key) {
  const L = LEGENDS[key], st = legendState(save);
  if (!L || st.visiting !== key || save.roster[key] || save.coins < L.price) return null;
  save.coins -= L.price;
  st.visiting = null;
  return joinLegend(save, key);
}

// A legend joins the roster (signed, or for a test run).
export function joinLegend(save, key) {
  const m = newMember();
  m.level = joinLevel(save) + 1; // (joinLevel is a level below the line-up)
  m.points = m.level - 1;
  const opts = member(key).def.perks;
  PERK_LEVELS.forEach((lv, i) => { if (m.level >= lv) m.perks.push(opts[i][0]); });
  save.roster[key] = m;
  return m;
}
