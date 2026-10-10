// The season in review: what the club did this season, shown when the next one starts. The
// league table and playoffs, the top scorers (from the career book), Coach Brekka's goals, the
// club records set this season, the Hall of Fame's new members and the Cups. No browser APIs.

import { standings } from './league.js';
import { careerOf } from './career.js';
import { goalStates } from './goals.js';
import { GAME_RECORDS } from './records.js';

const ours = (g) => g && (g.a === 'home' || g.b === 'home');

export function seasonReview(save) {
  const L = save.league, season = save.season || 1;
  if (!L || !L.table || !L.table.home) return null;
  const order = standings(L).map((r) => r.id), row = L.table.home;
  const P = L.playoffs;
  const result = L.champion === 'home' ? 'champion' : P && ours(P.final) ? 'final' : P && P.semis && P.semis.some(ours) ? 'semi' : L.phase === 'regular' ? 'unfinished' : 'missed';
  const c = careerOf(save);
  const top = Object.entries(c.skaters).map(([id, r]) => ({ id, ...(r.seasons && r.seasons[season] ? r.seasons[season] : { gp: 0, g: 0, a: 0 }) }))
    .filter((r) => r.gp > 0).sort((a, b) => b.g + b.a - (a.g + a.a) || b.g - a.g).slice(0, 3);
  const goals = goalStates(save);
  const records = Object.entries(save.records || {}).filter(([id, r]) => GAME_RECORDS[id] && r && r.season === season).map(([id, r]) => ({ id, ...r }));
  return {
    season, place: order.indexOf('home') + 1, teams: order.length, w: row.w, l: row.l, gf: row.gf, ga: row.ga, result,
    top, goalsMet: goals.filter((g) => g.done).length, goalsOf: goals.length,
    records, hall: (save.hall || []).filter((h) => h.season === season), cups: save.cups || 0,
  };
}
