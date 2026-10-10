// Snowball fun with the cub (Training, Batch DT): a minute of tossing soft snowballs at the cub
// as it pops up from behind the snow forts. No losing: every hit is a giggle and a coin. The cub
// rises, stays up a while, ducks back down and waits, at one fort at a time (never the same one
// twice running). A tap on it counts at once (it doesn't duck the snowball on its way).
// rnd: () => [0, 1) (the menus' own randomness; nothing here touches a match).

export const SNOW_TIME = 60;
export const SNOW_UP = 1.8; // (seconds it stays up: plenty for small hands)
export const SNOW_HIT = 0.9; // (the giggle)
export const SNOW_PRIZE_MAX = 30;

export const newSnowball = (spots = 5) => ({ t: 0, score: 0, spots, over: false, cub: { spot: -1, phase: 'wait', t: 0.8 } });

export function stepSnowball(st, dt, rnd = Math.random) {
  if (st.over) return st;
  st.t += dt;
  if (st.t >= SNOW_TIME) { st.over = true; st.cub.phase = 'wait'; return st; }
  const c = st.cub;
  c.t -= dt;
  if (c.t > 0) return st;
  if (c.phase === 'wait') {
    let s = Math.floor(rnd() * st.spots);
    if (s === c.spot && st.spots > 1) s = (s + 1 + Math.floor(rnd() * (st.spots - 1))) % st.spots;
    c.spot = s; c.phase = 'rise'; c.t = 0.3; c.hit = false;
  } else if (c.phase === 'rise') { c.phase = 'up'; c.t = SNOW_UP; }
  else if (c.phase === 'up' || c.phase === 'hit') { c.phase = 'down'; c.t = 0.25; }
  else { c.phase = 'wait'; c.t = 0.4 + rnd() * 0.8; }
  return st;
}

// A snowball at a fort: a hit if the cub's showing there (on its way up or down too: small hands).
export function throwAt(st, spot) {
  const c = st.cub;
  if (st.over || c.spot !== spot || c.hit || !['rise', 'up', 'down'].includes(c.phase)) return false;
  c.phase = 'hit'; c.t = SNOW_HIT; c.hit = true; st.score++; // (one hit a pop)
  return true;
}

export const snowPrize = (score) => Math.min(SNOW_PRIZE_MAX, score);
