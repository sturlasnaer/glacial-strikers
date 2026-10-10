// The road-trip map's season (League tab, Batch DG): the stops in order (home, each round in the
// rival's town, the All-Star Game at home, the Winter Classic on Pine Pond, the playoffs), where
// the bus is and where it drives next.
//   node tools/test_trip.mjs
import { newLeague, ALLSTAR_AFTER, CLASSIC_AFTER } from '../src/league.js';
import { TEAMS } from '../src/data.js';
import { tripStops, townOf } from '../src/trip.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

check("a club's own building is in its town", townOf(TEAMS.lynx.arena) === 'lynx' && townOf('pine_pond') === 'lynx');
check('anywhere else is home', townOf('frostline_coliseum') === 'home' && townOf(undefined) === 'home' && townOf('home') === 'home');

const L = newLeague(1);
const n = L.schedule.length;
let T = tripStops(L);
check('from home', T.stops[0].town === 'home' && T.at === 0 && T.next === 1);
check('the first trip: the first rival', T.stops[1].town === townOf(TEAMS[L.schedule[0].games[0].b].arena));
check('every round, the All-Star Game and the Classic', T.stops.length === 1 + n + 2, T.stops.length);
check('the All-Star Game at home, after its round', T.stops[ALLSTAR_AFTER + 1].kind === 'allstar' && T.stops[ALLSTAR_AFTER + 1].town === 'home');
check('the Classic on Pine Pond', T.stops[CLASSIC_AFTER + 2].kind === 'classic' && T.stops[CLASSIC_AFTER + 2].town === 'lynx');

// two rounds played: the bus is at the second rival's, the All-Star Game next
for (let i = 0; i < ALLSTAR_AFTER; i++) { L.results[i] = [{ a: 'home', b: L.schedule[i].games[0].b, ga: 3, gb: i }]; L.round = i + 1; }
T = tripStops(L);
check('after two rounds: at the second rival', T.at === ALLSTAR_AFTER && T.stops[T.at].town === townOf(TEAMS[L.schedule[ALLSTAR_AFTER - 1].games[0].b].arena));
check('and home for the All-Star Game next', T.stops[T.next].kind === 'allstar' && T.stops[T.next].town === 'home');
check('results go with the stops', T.stops[1].won === true && T.stops[1].done);
L.allstar = { skipped: true };
T = tripStops(L);
check('a skipped All-Star Game is no stop', !T.stops.some((st) => st.kind === 'allstar') && T.stops[T.next].kind === 'regular');

// the season done and the playoffs: a semifinal away, the final at home
L.allstar = { won: true, gf: 4, ga: 2 };
for (let i = 0; i < n; i++) L.results[i] = [{ a: 'home', b: L.schedule[i].games[0].b, ga: 3, gb: 1 }];
L.classic = { opp: 'royals', gf: 2, ga: 3, won: false };
L.round = n; L.phase = 'playoffs';
L.playoffs = { semis: [{ a: 'home', b: 'rams', winner: 'home' }, { a: 'owls', b: 'moose', winner: 'moose' }], final: { a: 'home', b: 'moose' } };
T = tripStops(L);
const last = T.stops[T.stops.length - 1];
check('the semifinal in their town', T.stops[T.stops.length - 2].kind === 'semi' && T.stops[T.stops.length - 2].town === 'rams' && T.stops[T.stops.length - 2].done);
check('the final at home, next', last.kind === 'final' && last.town === 'home' && T.next === T.stops.length - 1);
L.playoffs.final.winner = 'home';
T = tripStops(L);
check('all done: nowhere next', T.next === null && T.at === T.stops.length - 1);

console.log(`Road trip: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
