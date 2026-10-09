// Club facilities: what the club's coins build once the roster is set (after a few seasons a club
// sits on thousands with nothing to buy). Four facilities, three levels each, each level a small
// help that never wins a match on its own. Kept as save.facilities = { stands: 0–3, ... }.
// No browser APIs here.

export const FACILITIES = {
  stands: {
    name: 'Stands', icon: 'icons/facility_stands', stand: 'icons/friends', costs: [1800, 4000, 7500],
    text: 'A louder home crowd: at home the chant starts sooner and lasts longer.',
    levels: ['Chants come a little sooner at home.', 'A supporters\' section with a drum: sooner again, and a second longer.', 'A packed house: the home chant at its loudest.'],
  },
  training: {
    name: 'Training centre', icon: 'icons/facility_training', stand: 'equipment_items/hub/target', costs: [1500, 3500, 6500],
    text: 'More EXP from rewarded drills, and at level 3 a third rewarded session between matches.',
    levels: ['Drills give 15% more EXP.', 'Drills give 30% more EXP.', 'Drills give 45% more EXP, and three rewarded sessions between matches.'],
  },
  scouting: {
    name: 'Scouting office', icon: 'icons/facility_scouting', stand: 'icons/scout', costs: [1200, 3000, 6000],
    text: 'Better prospects on Draft Day and more free agents on the market.',
    levels: ['Draft Day: one prospect with more potential.', 'One more free agent on the market.', 'Draft Day: every prospect with more potential.'],
  },
  physio: {
    name: 'Physio room', icon: 'icons/facility_physio', stand: 'icons/gear_padded_vest', costs: [2000, 4500, 8000],
    text: 'Stamina comes back faster in matches.',
    levels: ['Stamina comes back 4% faster.', 'Stamina comes back 8% faster.', 'Stamina comes back 12% faster.'],
  },
};
export const FACILITY_IDS = Object.keys(FACILITIES);
export const MAX_FACILITY = 3;

export const facilityLevel = (save, id) => Math.max(0, Math.min(MAX_FACILITY, (save.facilities && save.facilities[id]) | 0));
// What the next level costs, or null at the top.
export const nextCost = (save, id) => { const L = facilityLevel(save, id); return L < MAX_FACILITY ? FACILITIES[id].costs[L] : null; };

// Build the next level: true if it was paid for.
export function buildFacility(save, id) {
  const cost = FACILITIES[id] && nextCost(save, id);
  if (cost == null || save.coins < cost) return false;
  save.coins -= cost;
  (save.facilities ||= {})[id] = facilityLevel(save, id) + 1;
  return true;
}

// ---- the effects
// the home crowd at home: how much sooner the chant starts and how much longer it lasts
export function chantBoost(save, home) {
  const L = home ? facilityLevel(save, 'stands') : 0;
  return { excite: 0.05 * L, cool: 4 * L, longer: L >= 2 ? L - 1 : 0 };
}
export const drillExpMul = (save) => 1 + 0.15 * facilityLevel(save, 'training');
export const trainingSessions = (save) => (facilityLevel(save, 'training') >= 3 ? 3 : 2);
export const staminaRegenMul = (save) => 1 + 0.04 * facilityLevel(save, 'physio');
// Draft Day: how many of the three prospects roll their potential twice (keeping the better)
export const scoutedProspects = (save) => { const L = facilityLevel(save, 'scouting'); return L >= 3 ? 3 : L >= 1 ? 1 : 0; };
export const extraAgents = (save) => (facilityLevel(save, 'scouting') >= 2 ? 1 : 0);
