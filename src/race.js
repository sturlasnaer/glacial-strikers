// The mascot race at the break (Batch DB): once a side has scored three, four club mascots
// race across the ice while the match waits. The player picks a runner first and wins coins if
// it wins. Each runner trots at its own pace with bursts and slips on the ice, so anyone can
// win. rnd: () => [0, 1) (the menus' own randomness; the match is frozen meanwhile).

import { CAREER, CLUB } from './data.js';

export const MASCOTS = { home: 'snow_fox', lynx: 'pinewood_lynx', comets: 'ember_comets', rams: 'gilded_rams', ravens: 'obsidian_ravens', royals: 'aurora_royals', owls: 'glacier_owls', moose: 'thunder_moose',
  capybaras: 'hot_springs_capybaras', puffins: 'cliffside_puffins', grizzlies: 'timberline_grizzlies', seals: 'driftwood_seals', penguins: 'pack_ice_penguins', bulls: 'sunmesa_bulls', narwhals: 'northlight_narwhals', beavers: 'birchwood_beavers', flamingos: 'coral_bay_flamingos', tigers: 'taiga_tigers', pandas: 'bamboo_ridge_pandas' }; // (the National clubs': Batch EC and EM; the Elite's own: EL)
export const RACE_PRIZE = 25;
export const RACE_AT = 3; // (goals for either side)

// A runner's mascot: ours (the Snow Fox, or in a career as another club that club's, or for a
// club of one's own the mascot of its crest: Batch EU, club_<crest>, runs once drawn), the
// Foxes' (the Snow Fox, when they're a club of the league: clubs.js) or a club's own.
export const mascotOf = (id) => (id === 'home' ? (CAREER.custom ? 'club_' + (CLUB.crest || 'fox') : MASCOTS[CAREER.team] || MASCOTS.home) : id === 'foxes' ? MASCOTS.home : MASCOTS[id]);

// The race's field: ours and the opponent's, who always run, and the rest who could.
export function raceField(opp) {
  const ids = ['home', ...(opp && opp !== 'home' && mascotOf(opp) ? [opp] : [])];
  const rest = [...Object.keys(MASCOTS), ...(CAREER.team || CAREER.custom ? ['foxes'] : [])].filter((k) => !ids.includes(k) && k !== CAREER.team && (k !== 'home' || !CAREER.custom));
  return { ids, rest };
}

// Four runners: our Snow Fox, the opponent's, and two more; only those drawn (has(team)).
export function pickRunners(opp, rnd, has = () => true) {
  const field = raceField(opp), ids = field.ids.filter(has), rest = field.rest.filter(has);
  while (ids.length < 4 && rest.length) ids.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
  return ids;
}

// A runner's frames.
export const raceFrames = (id) => ['run_1', 'run_2', 'run_3', 'run_4', 'win'].map((f) => `race/${mascotOf(id)}/${f}`);

// The frames whose pages a match loads for its race (the race runs whoever's loaded; the whole
// race group is 30 MB decoded): ours and theirs, and two more from the same pages when there are
// two there, else two others (k: a different two each game). page(frame): its page, undefined if
// it isn't drawn.
export function raceLoad(opp, page, k = 0) {
  const { ids, rest } = raceField(opp), drawn = (id) => page(raceFrames(id)[0]) !== undefined;
  const base = ids.filter(drawn), on = new Set(base.flatMap(raceFrames).map(page));
  const others = rest.filter(drawn), free = others.filter((id) => raceFrames(id).every((f) => page(f) === undefined || on.has(page(f))));
  const away = others.filter((id) => !free.includes(id)), n = Math.min(Math.max(0, 2 - free.length), away.length);
  return [...base, ...Array.from({ length: n }, (_, j) => away[(k * 2 + j) % away.length])].flatMap(raceFrames).filter((f) => page(f) !== undefined);
}

export const newRace = (ids) => ({ t: 0, runners: ids.map((id) => ({ id, x: 0, boost: 0, slip: 0 })), winner: null });

export function stepRace(r, dt, rnd) {
  r.t += dt;
  for (const u of r.runners) {
    if (u.boost > 0) u.boost -= dt; else if (rnd() < dt * 0.35) u.boost = 0.5 + rnd() * 0.5;
    if (u.slip > 0) u.slip -= dt; else if (rnd() < dt * 0.18) u.slip = 0.35;
    const v = (0.12 + rnd() * 0.04) * (u.boost > 0 ? 1.7 : 1) * (u.slip > 0 ? 0.25 : 1);
    u.x = Math.min(1, u.x + v * dt);
    if (u.x >= 1 && !r.winner) r.winner = u.id;
  }
  return r;
}
