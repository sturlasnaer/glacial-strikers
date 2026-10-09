// The Hall of Fame: the club's greats. A skater goes in at 75 goals or 120 points for the club
// (every full match counts, as on the career page), anyone on three Cup-winning rosters, and a
// goalie at 40 wins. Each gets a jersey number, a plaque in Trophies › Hall of Fame and a
// banner in the rafters at home, next to one for every Frostline Cup. Kept as
// save.hall = [{ id, goalie, name, number, season, g, a, w, cups, why }]. No browser APIs here.

import { careerOf } from './career.js';

export const HALL = { goals: 75, points: 120, cups: 3, goalieWins: 40 };

// Our cast's numbers; anyone else gets one of their own from their id (never a cast number,
// nor one already in the Hall).
const CAST = { frost: 9, thunder: 17, stone: 44, halla: 31 };
export function jerseyNumber(save, id) {
  if (CAST[id]) return CAST[id];
  const taken = new Set([...Object.values(CAST), ...(save.hall || []).map((h) => h.number)]);
  let h = 7;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = 0; i < 97; i++) { const n = 2 + ((h + i * 13) % 97); if (!taken.has(n)) return n; }
  return 99;
}

// A Cup won: the season goes on the list, and everyone on the roster has one more.
export function noteCup(save, rosterIds, goalieIds = []) {
  (save.cupSeasons ||= []).push(save.season || 1);
  save.cupsWith ||= {};
  for (const id of [...rosterIds, ...goalieIds]) save.cupsWith[id] = (save.cupsWith[id] || 0) + 1;
}
// The seasons the club won the Cup (older saves counted them without the seasons: those show
// without a number).
export const cupBanners = (save) => { const list = [...(save.cupSeasons || [])]; while (list.length < (save.cups || 0)) list.unshift(null); return list; };

export const inHall = (save, id) => (save.hall || []).some((h) => h.id === id);

// Who's earned it and isn't in yet: [{ id, goalie, why }]. ids: the skaters on the roster
// (and retired ones still in the career book), goalieIds: ours.
export function hallCandidates(save, ids, goalieIds = []) {
  const c = careerOf(save), cups = save.cupsWith || {}, out = [];
  for (const id of ids) {
    if (inHall(save, id)) continue;
    const r = c.skaters[id];
    const why = r && r.g >= HALL.goals ? 'goals' : r && r.g + r.a >= HALL.points ? 'points' : (cups[id] || 0) >= HALL.cups ? 'cups' : null;
    if (why) out.push({ id, goalie: false, why });
  }
  for (const id of goalieIds) {
    if (inHall(save, id)) continue;
    const g = c.goalies[id];
    const why = g && g.w >= HALL.goalieWins ? 'wins' : (cups[id] || 0) >= HALL.cups ? 'cups' : null;
    if (why) out.push({ id, goalie: true, why });
  }
  return out;
}

// Into the Hall: name is how the plaque and the banner read.
export function induct(save, cand, name) {
  const c = careerOf(save), r = cand.goalie ? c.goalies[cand.id] || {} : c.skaters[cand.id] || {};
  const entry = { id: cand.id, goalie: !!cand.goalie, name, number: jerseyNumber(save, cand.id), season: save.season || 1,
    g: r.g || 0, a: r.a || 0, gp: r.gp || 0, w: r.w || 0, cups: (save.cupsWith || {})[cand.id] || 0, why: cand.why };
  (save.hall ||= []).push(entry);
  return entry;
}
