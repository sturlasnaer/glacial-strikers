// Divisions: the league is played at one of three levels. Win the Cup and the club goes up a
// level the next season; finish last in the regular season and it drops back down. Up a level
// the league's games get tougher (the rivals' best stats a point up, their goalies a point, the
// AI a little sharper) and pay more, with a grander cup to win (Batch DX's crests and cups).
// Only league games feel it: exhibitions, the daily challenge and the Mini Cup don't.

export const TIERS = [
  { id: 'regional', name: 'Frostline Regional Cup', cup: 'Frostline Cup', badge: 'badges/tier_regional', cupArt: 'badges/frostline_cup', purse: 1 },
  { id: 'national', name: 'Frostline National Cup', cup: 'National Cup', badge: 'badges/tier_national', cupArt: 'badges/national_cup', purse: 1.25 },
  { id: 'elite', name: 'Frostline Elite Cup', cup: 'Elite Cup', badge: 'badges/tier_elite', cupArt: 'badges/elite_cup', purse: 1.5 },
];
export const TIER_MAX = TIERS.length - 1;
export const TIER_STATS = 1; // (the rivals' four best stats, a point a level)
export const TIER_SHARP = 0.06; // (the AI, a level)

export const tierOf = (save) => Math.max(0, Math.min(TIER_MAX, (save && save.tier) || 0));
export const tierInfo = (save) => TIERS[tierOf(save)];
export const tierAt = (i) => TIERS[Math.max(0, Math.min(TIER_MAX, i || 0))];

// The season's over: up a level with the Cup, down one from last place in the regular season
// (`rows`: the final standings, best first). 'promoted', 'relegated' or null.
export function moveTier(save, L, rows) {
  if (!L) return null;
  const tier = tierOf(save);
  if (L.champion === 'home') {
    if (tier < TIER_MAX) { save.tier = tier + 1; return 'promoted'; }
    return null;
  }
  if (tier > 0 && rows && rows.length > 1 && rows[rows.length - 1].id === 'home') { save.tier = tier - 1; return 'relegated'; }
  return null;
}

// A Cup won, counted by level (the trophy shelf and the history show which).
export function noteTierCup(save) {
  const k = tierInfo(save).id;
  (save.tierCups ||= {})[k] = (save.tierCups[k] || 0) + 1;
}
