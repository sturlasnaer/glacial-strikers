// Shared league-name helpers: kept separate to avoid a draft/moves import cycle.
import { ROOKIES, TEAMS } from './data.js';

// A name nobody in the league has: from the list, or once it's used up, one with a number
// after it ('Brick II').
export function freshName(list, taken, rnd) {
  for (const suffix of ['', ' II', ' III', ' IV', ' V']) {
    const free = list.filter((nm) => !taken.has(nm + suffix));
    if (free.length) return free[Math.floor(rnd() * free.length)] + suffix;
  }
  return list[Math.floor(rnd() * list.length)];
}
// Every name in the league now: the clubs' players and reserves, the rookies and free agents
// who've signed anywhere.
export function leagueNames(save) {
  const names = new Set(Object.values(ROOKIES).map((k) => k.name));
  for (const tm of Object.values(TEAMS)) for (const n of [...Object.values(tm.names || {}), ...Object.values(tm.subs || {})]) names.add(n);
  for (const f of Object.values(save.rivalFills || {})) names.add(f.name);
  return names;
}

