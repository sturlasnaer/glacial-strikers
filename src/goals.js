// Coach Brekka's goals for the season: three targets set when a season starts (one for the
// standings, one for our play, one for a big night), each paying coins the moment it's met, and
// a bonus for all three. They live on the league (save.league.goals), so a new season brings
// new ones. No browser APIs here.

import { standings, leagueTeams } from './league.js';
import { makeRng } from './util.js';
import { FIRST_GOAL } from './clubs.js';

export const ALL_GOALS_BONUS = 150;

const ours = (g) => g && (g.a === 'home' || g.b === 'home');
const rankOf = (L) => standings(L).findIndex((r) => r.id === 'home') + 1;
const regularOver = (L) => L.phase !== 'regular';
const rounds = (L) => leagueTeams(L).length - 1;

// text and {n}: what it asks; done / failed: from the league and the counters (c); progress: "3/12".
export const SEASON_GOALS = {
  playoffs: { kind: 'table', coins: 100, text: 'Make the playoffs: finish in the top four.',
    done: (L) => !!(L.playoffs && L.playoffs.semis.some(ours)), failed: (L) => regularOver(L) && !(L.playoffs && L.playoffs.semis.some(ours)) },
  top2: { kind: 'table', coins: 150, text: 'Finish the regular season in the top two.',
    done: (L) => regularOver(L) && !!L.playoffs && L.playoffs.seeds.indexOf('home') >= 0 && L.playoffs.seeds.indexOf('home') < 2,
    failed: (L) => regularOver(L) && !(L.playoffs && L.playoffs.seeds.indexOf('home') >= 0 && L.playoffs.seeds.indexOf('home') < 2),
    progress: (L) => (L.round > 0 && !regularOver(L) ? `#${rankOf(L)}` : '') },
  final: { kind: 'table', coins: 180, text: 'Reach the Cup Final.',
    done: (L) => !!(L.playoffs && ours(L.playoffs.final)), failed: (L) => (L.phase === 'done' && !(L.playoffs && ours(L.playoffs.final))) || !!(L.playoffs && regularOver(L) && !L.playoffs.semis.some(ours)) || !!(L.playoffs && L.playoffs.semis.some((g) => ours(g) && g.winner && g.winner !== 'home')) },
  cup: { kind: 'table', coins: 220, text: 'Win the Frostline Cup.', done: (L) => L.champion === 'home', failed: (L) => (L.phase === 'done' && L.champion !== 'home') || !!(L.playoffs && regularOver(L) && !L.playoffs.semis.some(ours)) || !!(L.playoffs && L.playoffs.semis.some((g) => ours(g) && g.winner && g.winner !== 'home')) || !!(L.playoffs && L.playoffs.final && L.playoffs.final.winner && L.playoffs.final.winner !== 'home') },
  goals: { kind: 'play', coins: 120, text: 'Score {n} goals in the regular season.', n: (L) => rounds(L) * 3,
    done: (L, c, n) => L.table.home.gf >= n, failed: (L, c, n) => regularOver(L) && L.table.home.gf < n, progress: (L, c, n) => `${Math.min(n, L.table.home.gf)}/${n}` },
  defence: { kind: 'play', coins: 130, text: 'Let in {n} goals or fewer in the regular season.', n: (L) => Math.round(rounds(L) * 2.5),
    done: (L, c, n) => regularOver(L) && L.table.home.ga <= n, failed: (L, c, n) => L.table.home.ga > n, progress: (L, c, n) => `${L.table.home.ga}/${n}` },
  shutout: { kind: 'play', coins: 140, text: 'Win a league game 5–0.', done: (L, c) => !!c.shutout, failed: (L) => L.phase === 'done' },
  streak: { kind: 'play', coins: 130, text: 'Win three league games in a row.', done: (L, c) => c.best >= 3, failed: (L) => L.phase === 'done', progress: (L, c) => (c.streak ? `${Math.min(3, c.streak)}/3` : '') },
  hattrick: { kind: 'play', coins: 120, text: 'Score a hat trick in a league game.', done: (L, c) => !!c.hat, failed: (L) => L.phase === 'done' },
  powerplay: { kind: 'play', coins: 100, text: 'Score a power-play goal in a league game.', done: (L, c) => c.ppg >= 1, failed: (L) => L.phase === 'done' }, // (a quarter of a goal a match, both teams together: two was a long shot)
  classic: { kind: 'night', coins: 150, text: 'Win the Winter Classic.', done: (L) => !!(L.classic && L.classic.won), failed: (L) => !!(L.classic && !L.classic.won) || (L.phase !== 'regular' && !L.classic) },
  allstar: { kind: 'night', coins: 120, text: 'Win the All-Star Game.', done: (L) => !!(L.allstar && L.allstar.won), failed: (L) => !!(L.allstar && !L.allstar.won) || (L.phase !== 'regular' && !L.allstar) },
  rookie: { kind: 'night', coins: 120, text: 'Get a goal from one of your drafted rookies.', done: (L, c) => !!c.rookie, failed: (L) => L.phase === 'done' },
  revenge: { kind: 'night', coins: 150, text: 'Beat last season\'s champions.', done: (L, c) => !!c.revenge, failed: (L) => L.phase === 'done' },
};

// This season's goals, set the first time they're asked for (also mid-season, for a save from
// before there were goals).
export function seasonGoals(save) {
  const L = save.league;
  if (!L) return null;
  if (L.goals && L.goals.season === L.season) {
    // an All-Star Game skipped (too few stars to vote in) can't be won: another goal instead
    const G = L.goals, i = G.ids.indexOf('allstar');
    if (i >= 0 && L.allstar && L.allstar.skipped && !G.done.includes('allstar')) G.ids[i] = !L.classic && !G.ids.includes('classic') ? 'classic' : ['hattrick', 'shutout', 'powerplay', 'streak'].find((k) => !G.ids.includes(k));
    return G;
  }
  const rng = makeRng(((L.seedRng || 1) * 31 + 7) >>> 0);
  const pick = (ids) => ids[Math.floor(rng() * ids.length)];
  const table = L.season <= 1 ? FIRST_GOAL[save.team] || 'playoffs' : pick(L.season >= 3 ? ['top2', 'final', 'cup'] : ['top2', 'final', 'final']);
  const play = pick(['goals', 'defence', 'shutout', 'streak', 'hattrick', 'powerplay']);
  const nights = [...(L.round <= 2 && !L.allstar ? ['allstar'] : []), ...(L.round <= 3 && !L.classic ? ['classic'] : []),
    ...(Object.keys(save.rookies || {}).some((id) => save.roster[id]) ? ['rookie'] : []),
    ...(L.prevChampion && L.prevChampion !== 'home' && leagueTeams(L).includes(L.prevChampion) ? ['revenge'] : [])];
  const night = nights.length ? pick(nights) : pick(['hattrick', 'shutout', 'powerplay'].filter((k) => k !== play));
  L.goals = { season: L.season, ids: [table, play, night], done: [], c: { streak: 0, best: 0, ppg: 0 } };
  return L.goals;
}

// Each goal as shown: { id, text, n, coins, done, failed, progress }.
export function goalStates(save) {
  const G = seasonGoals(save), L = save.league;
  if (!G) return [];
  return G.ids.map((id) => {
    const d = SEASON_GOALS[id], n = d.n ? d.n(L) : undefined, done = G.done.includes(id);
    return { id, text: d.text, n, coins: d.coins, done, failed: !done && !!d.failed(L, G.c, n), progress: !done && d.progress ? d.progress(L, G.c, n) : '' };
  });
}

// After one of our games counts (league, playoffs, the Winter Classic, the All-Star Game):
// game is { kind, won, summary, opp }. Pays for the goals met now; returns them (and the bonus).
export function updateSeasonGoals(save, game) {
  const G = seasonGoals(save), L = save.league;
  if (!G) return { met: [], bonus: 0 };
  const c = G.c, sm = game.summary, league = game.kind === 'regular' || game.kind === 'semi' || game.kind === 'final';
  if (league) {
    if (game.kind === 'regular') { c.streak = game.won ? c.streak + 1 : 0; c.best = Math.max(c.best, c.streak); }
    if (game.won && sm.score[1] === 0 && sm.score[0] >= 5) c.shutout = true;
    if (sm.skaters.some((k) => k.team === 0 && k.goals >= 3)) c.hat = true;
    c.ppg += (sm.pen && sm.pen[0] && sm.pen[0].ppGoals) || 0;
    if (game.won && L.prevChampion && game.opp === L.prevChampion) c.revenge = true;
  }
  if (game.kind !== 'allstar' && sm.skaters.some((k) => k.team === 0 && k.goals > 0 && String(k.id).startsWith('rk'))) c.rookie = true;
  const met = [];
  for (const id of G.ids) {
    const d = SEASON_GOALS[id], n = d.n ? d.n(L) : undefined;
    if (G.done.includes(id) || !d.done(L, c, n)) continue;
    G.done.push(id);
    save.coins += d.coins;
    met.push({ id, text: d.text, n, coins: d.coins });
  }
  let bonus = 0;
  if (met.length && G.done.length === G.ids.length) { bonus = ALL_GOALS_BONUS; save.coins += bonus; }
  return { met, bonus };
}
