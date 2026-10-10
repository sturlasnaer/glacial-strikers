// The mascot race at the break (Batch DB): once a side has scored three, four club mascots
// race across the ice while the match waits. The player picks a runner first and wins coins if
// it wins. Each runner trots at its own pace with bursts and slips on the ice, so anyone can
// win. rnd: () => [0, 1) (the menus' own randomness; the match is frozen meanwhile).

export const MASCOTS = { home: 'snow_fox', lynx: 'pinewood_lynx', comets: 'ember_comets', rams: 'gilded_rams', ravens: 'obsidian_ravens', royals: 'aurora_royals', owls: 'glacier_owls', moose: 'thunder_moose',
  capybaras: 'hot_springs_capybaras', puffins: 'cliffside_puffins', grizzlies: 'timberline_grizzlies', seals: 'driftwood_seals', penguins: 'pack_ice_penguins', bulls: 'sunmesa_bulls', narwhals: 'northlight_narwhals', tigers: 'taiga_tigers', pandas: 'bamboo_ridge_pandas' }; // (the National clubs': Batch EC; the Elite's own: EL)
export const RACE_PRIZE = 25;
export const RACE_AT = 3; // (goals for either side)

// Four runners: our Snow Fox, the opponent's, and two more; only those drawn (has(team)).
export function pickRunners(opp, rnd, has = () => true) {
  const ids = ['home', ...(opp && opp !== 'home' && MASCOTS[opp] ? [opp] : [])].filter(has);
  const rest = Object.keys(MASCOTS).filter((k) => !ids.includes(k) && has(k));
  while (ids.length < 4 && rest.length) ids.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0]);
  return ids;
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
