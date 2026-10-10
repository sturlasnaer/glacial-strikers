// The road-trip map (League tab, Batch DG): the season as the towns the Foxes' team bus drives
// between. League games are played in the rival's own building, so each round is a trip to
// their town; the All-Star Game and the Cup Final are at home, the Winter Classic on Pine Pond.
import { TEAMS } from './data.js';
import { ALLSTAR_AFTER, CLASSIC_AFTER, classicOpponent } from './league.js';

// The town an arena is in: the club whose building it is (home for the rest).
export const townOf = (arena) => (arena && Object.keys(TEAMS).find((k) => k !== 'home' && TEAMS[k].arena === arena)) || 'home';

// Every stop of the season so far and to come, in order: { town, kind, done, won? }. The bus
// is at the last stop done (home before the first game) and drives on to the next.
export function tripStops(L) {
  const stops = [{ town: 'home', kind: 'start', done: true }];
  const opp = (i) => L.schedule[i].games[0].b;
  L.schedule.forEach((rd, i) => {
    const r = L.results[i] && L.results[i][0];
    stops.push({ town: townOf(TEAMS[opp(i)].arena), kind: 'regular', done: !!r, won: r ? r.ga > r.gb : undefined, opp: opp(i) });
    if (i === ALLSTAR_AFTER - 1 && !(L.allstar && L.allstar.skipped)) stops.push({ town: 'home', kind: 'allstar', done: !!L.allstar, won: L.allstar ? !!L.allstar.won : undefined });
    if (i === CLASSIC_AFTER - 1) {
      const c = L.classic, o = c ? c.opp : L.phase === 'regular' && L.round <= CLASSIC_AFTER ? classicOpponent(L) : null;
      if (o) stops.push({ town: townOf('pine_pond'), kind: 'classic', done: !!c, won: c ? !!c.won : undefined, opp: o });
    }
  });
  const po = L.playoffs;
  if (po) {
    const semi = po.semis.find((g) => g.a === 'home' || g.b === 'home');
    if (semi) { const o = semi.a === 'home' ? semi.b : semi.a; stops.push({ town: townOf(TEAMS[o].arena), kind: 'semi', done: !!semi.winner, won: semi.winner ? semi.winner === 'home' : undefined, opp: o }); }
    if (po.final && (po.final.a === 'home' || po.final.b === 'home')) stops.push({ town: 'home', kind: 'final', done: !!po.final.winner, won: po.final.winner ? po.final.winner === 'home' : undefined });
  }
  let at = 0;
  stops.forEach((s, i) => { if (s.done) at = i; });
  const next = stops[at + 1] && !stops[at + 1].done ? at + 1 : null;
  return { stops, at, next };
}
