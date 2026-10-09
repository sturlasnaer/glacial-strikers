// Coach Brekka's season goals: three a season (one for the table, one for our play, one for a
// big night), the same picks every time for a season, each paid once as it's met and the bonus
// once for all three, and the ones out of reach marked as missed.
//   node tools/test_goals.mjs
import { newLeague, nextFixture, recordOurGame, recordClassic, recordAllStar } from '../src/league.js';
import { newSave } from '../src/progress.js';
import { seasonGoals, goalStates, updateSeasonGoals, SEASON_GOALS, ALL_GOALS_BONUS } from '../src/goals.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const summary = (gf, ga, o = {}) => ({ score: [gf, ga], skaters: [{ team: 0, id: o.scorer || 'frost', goals: o.hat ? 3 : Math.min(gf, 2) }, { team: 1, id: 'frost', goals: ga }], pen: [{ ppGoals: o.pp || 0 }, { ppGoals: 0 }] });

// Play a season out: win(f) says whether we win fixture f; returns the coins paid and the goals.
function season(s, win, opts = {}) {
  const L = s.league;
  let paid = 0, bonus = 0, guard = 0;
  seasonGoals(s);
  for (let f = nextFixture(L); f && guard < 20; f = nextFixture(L), guard++) {
    const w = win(f), sm = w ? summary(5, opts.shutout ? 0 : 2, { hat: opts.hat, pp: opts.pp }) : summary(2, 5);
    if (f.kind === 'classic') recordClassic(L, sm.score[0], sm.score[1], f.opponent);
    else if (f.kind === 'allstar') recordAllStar(L, { gf: sm.score[0], ga: sm.score[1], won: w });
    else recordOurGame(L, s, sm.score[0], sm.score[1]);
    const before = s.coins;
    const out = updateSeasonGoals(s, { kind: f.kind, won: w, summary: sm, opp: f.opponent });
    paid += s.coins - before;
    bonus += out.bonus;
    check('coins paid match what was met', s.coins - before === out.met.reduce((a, g) => a + g.coins, 0) + out.bonus, [s.coins - before, out]);
  }
  return { paid, bonus, states: goalStates(s) };
}

// the picks: three of the right kinds, the same for a season however often they're asked for
{
  const kinds = new Set();
  for (let season = 1; season <= 6; season++) {
    const s = newSave(); s.season = season; s.league = newLeague(season);
    const G = seasonGoals(s), ids = [...G.ids];
    check(`season ${season}: three goals, one for the table`, ids.length === 3 && SEASON_GOALS[ids[0]].kind === 'table' && SEASON_GOALS[ids[1]].kind === 'play', ids);
    check(`season ${season}: ...and they stay put`, seasonGoals(s).ids.join() === ids.join() && new Set(ids).size === 3, ids);
    if (season === 1) check('the first season asks for the playoffs', ids[0] === 'playoffs', ids);
    ids.forEach((id) => kinds.add(id));
  }
  check('a mix of goals over the seasons', kinds.size >= 6, [...kinds]);
}

// a season won outright: everything met, paid once each, with the bonus once
{
  const s = newSave(); s.league = newLeague(1); s.coins = 0;
  const G = seasonGoals(s);
  const r = season(s, () => true, { shutout: true, hat: true, pp: 1 });
  check('a perfect season meets all three', r.states.every((g) => g.done), r.states);
  check('...each paid once, and the bonus once', r.paid === G.ids.reduce((a, id) => a + SEASON_GOALS[id].coins, 0) + ALL_GOALS_BONUS && r.bonus === ALL_GOALS_BONUS, [r.paid, G.ids]);
  const again = updateSeasonGoals(s, { kind: 'regular', won: true, summary: summary(5, 0, { hat: true }), opp: 'lynx' });
  check('...and never again', again.met.length === 0 && again.bonus === 0);
}

// a season lost: nothing paid, everything missed by the end
{
  const s = newSave(); s.league = newLeague(1); s.coins = 0;
  const r = season(s, () => false);
  check('a lost season pays nothing', r.paid === 0, r.paid);
  check('...and every goal shows as missed', r.states.every((g) => g.failed && !g.done), r.states);
}

// each goal on its own: met by the play it asks for, and not by a season without it
{
  const set = (ids, prev = null, season = 2) => { const s = newSave(); s.season = season; s.league = newLeague(season); s.league.prevChampion = prev; s.coins = 0; s.league.goals = { season, ids, done: [], c: { streak: 0, best: 0, ppg: 0 } }; return s; };
  let s = set(['top2', 'goals', 'classic']);
  season(s, (f) => f.kind !== 'allstar');
  check('top two, goals and the Classic, all met by winning', goalStates(s).every((g) => g.done), goalStates(s));
  s = set(['cup', 'goals', 'classic'], null, 3);
  season(s, () => true);
  check('winning the cup', goalStates(s).find((g) => g.id === 'cup').done, goalStates(s));
  s = set(['cup', 'goals', 'classic'], null, 3);
  season(s, (f) => f.kind !== 'final');
  check('...and losing the final misses it', goalStates(s).find((g) => g.id === 'cup').failed, goalStates(s));
  s = set(['final', 'streak', 'revenge'], 'comets');
  season(s, () => true);
  check('the final, a streak and beating the champions', goalStates(s).every((g) => g.done), goalStates(s));
  s = set(['final', 'powerplay', 'rookie']);
  season(s, () => true, { pp: 1 });
  check('power-play goals count; a rookie goal needs a rookie', goalStates(s).filter((g) => g.done).map((g) => g.id).join() === 'final,powerplay', goalStates(s));
  s = set(['top2', 'defence', 'allstar']);
  season(s, (f) => f.kind === 'allstar' || f.kind === 'semi' || f.kind === 'final');
  const st = Object.fromEntries(goalStates(s).map((g) => [g.id, g]));
  check('losing the league games misses the top two and the defence goal', st.top2.failed && st.defence.failed && st.allstar.done, goalStates(s));
  s = set(['top2', 'streak', 'rookie']);
  const sm = summary(5, 1); sm.skaters[0].id = 'rk1';
  updateSeasonGoals(s, { kind: 'regular', won: true, summary: sm, opp: 'lynx' });
  check('a drafted rookie\'s goal', goalStates(s).find((g) => g.id === 'rookie').done);
}

console.log(`season goals: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
