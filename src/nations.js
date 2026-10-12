// The Nations Cup (Batch EZ): once the season's awards are out, for a club in the National or the
// Elite, the four regions' best. Our club plays for the Frostline against the Coast, the
// Timberlands and the Far Wilds (data.js NATIONS), each the best of its two strongest clubs: a
// round robin (we play each once, the other two regions' game is simulated alongside ours),
// then a final between the top two. Kept on the league (L.nations) for that season.
import { TEAMS, RECRUITS, NATIONS, recruitKey } from './data.js';
import { vacated, agedStats } from './slots.js';
import { makeRng } from './util.js';

export const NATIONS_FROM = 1; // (a division: the National and up)
export const NATIONS_REWARD = 260; // (a game's prize, as the All-Star Game's)
export const NATIONS_PRIZE = 300; // (the cup's, on top)
export const REGION_IDS = Object.keys(NATIONS);
export const US = 'frostline';

const value = (save, key) => { const r = RECRUITS[key]; return Object.values(agedStats(save, r.team, r.kit, r.base)).reduce((a, b) => a + b, 0); };

// A region's team: its two strongest clubs (their difficulty), and from those the best centre,
// winger and defender still there (a star we've signed, or who's been traded or retired, is gone;
// a third club only fills a place both have lost), and the better goalie. Its strength: the two
// clubs' average (as the All-Stars'), so the regions range from the Timberlands to the Far Wilds.
export function regionTeam(save, regionId) {
  const R = NATIONS[regionId];
  const clubs = R.clubs.filter((id) => TEAMS[id]).sort((a, b) => TEAMS[b].diff - TEAMS[a].diff || R.clubs.indexOf(a) - R.clubs.indexOf(b));
  const two = clubs.slice(0, 2);
  const pick = (kit) => {
    for (const pool of [two, clubs]) {
      const keys = pool.filter((id) => RECRUITS[recruitKey(id, kit)] && !vacated(save, id, kit)).map((id) => recruitKey(id, kit));
      if (keys.length) return keys.sort((a, b) => value(save, b) - value(save, a))[0];
    }
    return null;
  };
  const skaters = ['frost', 'thunder', 'stone'].map(pick).filter(Boolean);
  const goalie = [...two].sort((a, b) => (TEAMS[b].goalie.rfx + TEAMS[b].goalie.pos) - (TEAMS[a].goalie.rfx + TEAMS[a].goalie.pos))[0];
  return { id: regionId, skaters, teams: [...new Set(skaters.map((k) => RECRUITS[k].team))], goalie, diff: two.reduce((a, id) => a + TEAMS[id].diff, 0) / two.length };
}

const row = () => ({ p: 0, w: 0, l: 0, gf: 0, ga: 0, pts: 0 });
// A new cup: we meet the regions weakest first.
export function newNations(save) {
  const order = [...REGION_IDS].sort((a, b) => regionTeam(save, a).diff - regionTeam(save, b).diff || REGION_IDS.indexOf(a) - REGION_IDS.indexOf(b));
  return { round: 0, order, table: Object.fromEntries([US, ...REGION_IDS].map((id) => [id, row()])), games: [], final: null, champion: null, over: false };
}

// The table: points (two a win), then goal difference, then goals.
export const nationsStandings = (N) => Object.entries(N.table).map(([id, r]) => ({ id, ...r }))
  .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || (a.id === US ? -1 : b.id === US ? 1 : 0));

// Our next game: { opp, final }, or null when it's over (or we're out of the final).
export function nationsNext(N) {
  if (!N || N.over) return null;
  if (N.round < 3) return { opp: N.order[N.round], final: false };
  if (N.final && N.final.a === US && !N.final.played) return { opp: N.final.b, final: true };
  return null;
}

const enter = (N, a, b, ga, gb) => {
  for (const [id, f, g] of [[a, ga, gb], [b, gb, ga]]) { const r = N.table[id]; r.p++; r.gf += f; r.ga += g; if (f > g) { r.w++; r.pts += 2; } else r.l++; }
  N.games.push({ a, b, ga, gb, round: N.round });
};
// A game we're not in, first to five: the stronger region more likely to win.
function sim(save, N, a, b, rng) {
  const p = Math.max(0.2, Math.min(0.8, 0.5 + (regionTeam(save, a).diff - regionTeam(save, b).diff) * 1.2));
  const aWins = rng() < p, other = Math.floor(rng() * 5);
  return aWins ? [5, other] : [other, 5];
}

// Our game's result (gf, ga), with the other regions' game that round. Returns what's next:
// 'next' (another group game), 'final' (we're in it), 'out' (the final's without us: played
// already, see N.champion), 'champion' or 'runner-up'.
export function recordNations(save, N, gf, ga) {
  const rng = makeRng(((save.season || 1) * 7919 + N.round * 131 + 17) >>> 0);
  const next = nationsNext(N);
  if (!next) return null;
  if (next.final) {
    N.final.played = true; N.final.gf = gf; N.final.ga = ga;
    N.champion = gf > ga ? US : next.opp;
    N.over = true;
    return gf > ga ? 'champion' : 'runner-up';
  }
  enter(N, US, next.opp, gf, ga);
  const others = N.order.filter((id) => id !== next.opp);
  const [x, y] = others;
  const [sx, sy] = sim(save, N, x, y, rng);
  enter(N, x, y, sx, sy);
  N.round++;
  if (N.round < 3) return 'next';
  const [first, second] = nationsStandings(N);
  if (first.id === US || second.id === US) { N.final = { a: US, b: first.id === US ? second.id : first.id }; return 'final'; }
  const [fa, fb] = sim(save, N, first.id, second.id, rng);
  N.final = { a: first.id, b: second.id, played: true, gf: fa, ga: fb };
  N.champion = fa > fb ? first.id : second.id;
  N.over = true;
  return 'out';
}
