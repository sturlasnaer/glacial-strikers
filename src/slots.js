// Rival slots once you've signed their player (or signed and traded them on): whoever the
// rival brought in to fill the hole (a Draft Day pick, or a free agent signed mid-season,
// kept in save.rivalFills by 'team:kit'), or one of their reserves until then. They play in
// the newcomer art (Batch AA) in the team's colours, under their own name and style.
import { TEAMS, CHARACTERS, STAT_KEYS, recruitKey, makeDef, slotDef } from './data.js';

export const vacated = (save, teamId, kit) => {
  const k = recruitKey(teamId, kit);
  return !!(save.roster[k] || (save.tradedAway && save.tradedAway[k]));
};
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

// Who plays the slot, or null while their own player is still there:
// { name, def, stats (null: the slot's usual numbers), hand, fill }.
export function rivalSub(save, teamId, kit) {
  if (!vacated(save, teamId, kit)) return null;
  const f = fillOf(save, teamId, kit);
  if (!f) return { name: TEAMS[teamId].subs[kit], def: slotDef(teamId, kit), stats: null, hand: undefined, fill: null };
  return { name: f.name, def: makeDef(kit, f.arch, f.elem), stats: fillStats(save, f), hand: f.hand, fill: f };
}
