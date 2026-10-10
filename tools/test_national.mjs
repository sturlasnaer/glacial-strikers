// The National division's clubs: seven new clubs met one division up (and the best of them,
// with the Frostline's best, in the Elite). Each is complete (players from parts, recruits,
// a goalie to sign, words, a stage, a rink, a mascot), the leagues a division up are theirs,
// a match against them plays, and the Frostline's own lists (the daily challenge's) stay as
// they were.
//   node tools/test_national.mjs
import { TEAMS, RIVAL_IDS, NATIONAL_IDS, ELITE_IDS, ELITE_OWN_IDS, ALL_RIVALS, RECRUITS, GOALIE_RECRUITS, STAR_AGES, DIALOGUE, ARENAS, NATIONAL_STAGES, TOURNAMENT, TIER_LINES, stageOf, recruitKey } from '../src/data.js';
import { newLeague, nextFixture, recordOurGame, standings, strength, NATIONAL_TEAMS, ELITE_TEAMS } from '../src/league.js';
import { newSave, matchConfig, recruitStatus } from '../src/progress.js';
import { moveTier, tierOf } from '../src/tiers.js';
import { MASCOTS } from '../src/race.js';
import { TEAM_LIKES } from '../src/trades.js';
import { ARENA_MUSIC } from '../src/songs.js';
import { townOf } from '../src/trip.js';
import { holes, rivalSigning } from '../src/moves.js';
import { useModular } from '../src/modular.js';
import { Match } from '../src/match.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });

check('seven National clubs, easiest first', NATIONAL_IDS.length === 7 && NATIONAL_IDS.every((id, i) => !i || TEAMS[id].diff > TEAMS[NATIONAL_IDS[i - 1]].diff));
check('the Elite: the strongest of both and its own two, easiest first', ELITE_IDS.length === 9 && ELITE_IDS.some((id) => RIVAL_IDS.includes(id)) && ELITE_IDS.some((id) => NATIONAL_IDS.includes(id)) && ELITE_IDS.every((id, i) => !i || TEAMS[id].diff >= TEAMS[ELITE_IDS[i - 1]].diff));
check('the Frostline\'s list as it was (the daily challenge draws from it)', RIVAL_IDS.join() === 'lynx,comets,owls,rams,moose,ravens,royals' && ALL_RIVALS.length === 16);
for (const id of NATIONAL_IDS) {
  const t = TEAMS[id];
  check(`${id}: a club from parts, in its colours`, t.national && !t.art && t.mark && t.looks && ['frost', 'thunder', 'stone'].every((k) => t.looks[k] && t.names[k] && t.subs[k]) && t.goalieLook && t.names.goalie && t.subs.goalie && t.recolor && t.style, id);
  check(`${id}: three stars to sign, with ages`, ['frost', 'thunder', 'stone'].every((k) => { const r = RECRUITS[recruitKey(id, k)]; return r && r.parts && r.price > 0 && STAR_AGES[r.key] && r.title && !r.title.includes('undefined'); }));
  check(`${id}: a goalie to sign`, GOALIE_RECRUITS[`${id}_g`] && GOALIE_RECRUITS[`${id}_g`].price > 0 && GOALIE_RECRUITS[`${id}_g`].mask);
  check(`${id}: their words`, DIALOGUE[id] && DIALOGUE[id].pre.length >= 3 && DIALOGUE[id].win.length && DIALOGUE[id].loss.length);
  check(`${id}: a stage, a rink of their own, a mascot, a tune, a town`, stageOf(id).team === id && ARENAS[t.arena] && ARENAS[t.arena].national && MASCOTS[id] === t.mark && ARENA_MUSIC[t.arena] && townOf(t.arena) === id && TEAM_LIKES[id]);
}
// the Elite's own two: the Tigers and the Pandas (the strongest of all), met only at the top
check('the Elite\'s own: the Tigers and the Pandas, not the National\'s, and nobody dropped for them', ELITE_OWN_IDS.join() === 'tigers,pandas' && ELITE_OWN_IDS.every((id) => TEAMS[id].elite && !TEAMS[id].national && ELITE_IDS.includes(id) && !NATIONAL_IDS.includes(id)) && ELITE_IDS.includes('moose'));
check('the Pandas: the strongest club there is', ALL_RIVALS.every((id) => id === 'pandas' || TEAMS[id].diff < TEAMS.pandas.diff) && TEAMS.pandas.goalie.rfx >= 9);
for (const id of ELITE_OWN_IDS) {
  const t = TEAMS[id];
  check(`${id}: complete like the others`, ['frost', 'thunder', 'stone'].every((k) => RECRUITS[recruitKey(id, k)] && STAR_AGES[recruitKey(id, k)] && t.looks[k]) && GOALIE_RECRUITS[`${id}_g`] && DIALOGUE[id].final && stageOf(id).team === id && ARENAS[t.arena].national && MASCOTS[id] === t.mark && ARENA_MUSIC[t.arena] && townOf(t.arena) === id && TEAM_LIKES[id]);
}
check('the Pandas welcome us to the Elite', TIER_LINES.elite.team === 'pandas');
check('the Grizzlies\' players: "Grizzly", not "Grizzlie"', RECRUITS.grizzlies_c.title === 'Grizzly Centre');
check('a stage for every National club and the Elite\'s own, the Frostline\'s unchanged', NATIONAL_STAGES.length === 9 && TOURNAMENT.stages.length === 7 && stageOf('lynx') === TOURNAMENT.stages[0]);
check('the daily challenge\'s arenas as they were', Object.keys(ARENAS).filter((k) => !ARENAS[k].finalOnly && !ARENAS[k].exhibitionOnly && !ARENAS[k].national).join() === 'home,ember_dome,aurora_palace,golden_hall,dark_aerie,pine_pond,owl_observatory,moose_longhouse');
check('a welcome for each division up', TIER_LINES.national && TIER_LINES.elite && NATIONAL_IDS.includes(TIER_LINES.national.team) && ELITE_IDS.includes(TIER_LINES.elite.team));

// the leagues by division
const pairs = (L) => { const seen = new Set(); for (const r of L.schedule) for (const g of r.games) seen.add([g.a, g.b].sort().join('-')); return seen.size; };
const N = newLeague(3, 1), E = newLeague(3, 2), R = newLeague(3, 0);
check('the National: its own seven, seven rounds, every pair once', N.teams.join() === NATIONAL_TEAMS.join() && N.schedule.length === 7 && pairs(N) === 28);
check('the Elite: ten clubs, nine rounds, every pair once', E.teams.join() === ELITE_TEAMS.join() && E.teams.length === 10 && E.schedule.length === 9 && pairs(E) === 45 && E.schedule.every((r) => new Set(r.games.flatMap((g) => [g.a, g.b])).size === 10));
check('back down: the Frostline\'s again', R.teams.join() === ['home', ...RIVAL_IDS].join() && newLeague(1).teams.length === 6);
check('we meet them easiest first', N.schedule.map((r) => r.games[0].b).join() === NATIONAL_IDS.join());
const f = nextFixture(N);
check('a National fixture: their stage', f.opponent === 'capybaras' && f.stage.reward === NATIONAL_STAGES[0].reward && f.stage.powers.length === 2, f.stage);

// a promoted save: a National season, played through
{
  const s = newSave();
  s.league.champion = 'home';
  check('the Cup: up to the National', moveTier(s, s.league, standings(s.league)) === 'promoted' && tierOf(s) === 1);
  s.season = 2; s.league = newLeague(s.season, tierOf(s));
  check('...where the National clubs play', s.league.teams.includes('narwhals') && !s.league.teams.includes('lynx'));
  check('their stars locked until we beat them', recruitStatus(s, 'capybaras_c') === 'locked');
  check('stronger up here', strength('capybaras', s) > strength('capybaras', { ...s, tier: 0 }));
  const cfg = matchConfig(s, 'narwhals', stageOf('narwhals'), { league: true });
  check('a match config: three skaters from parts and a goalie', cfg.teams[1].skaters.length === 3 && cfg.teams[1].goalie.stats.rfx >= 8, cfg.teams[1].goalie.stats);
  let guard = 0;
  while (s.league.phase !== 'done' && guard++ < 40) {
    const fx = nextFixture(s.league);
    if (!fx || fx.kind === 'allstar' || fx.kind === 'classic') { if (fx && fx.kind === 'allstar') s.league.allstar = { skipped: true }; else if (fx) s.league.classic = { opp: fx.opponent, gf: 1, ga: 0, won: true }; continue; }
    recordOurGame(s.league, s, 5, 2);
  }
  check('a National season plays through to a champion', s.league.phase === 'done' && s.league.champion === 'home', s.league.phase);
  check('no holes, no signings among clubs we haven\'t touched', NATIONAL_IDS.every((id) => holes(s, id).length === 0) && rivalSigning(s, () => 0) === null);
}

// an Elite season, ten clubs, played through to the playoffs and a champion
{
  const s = newSave(); s.tier = 2; s.season = 5; s.league = newLeague(5, 2);
  let guard = 0;
  while (s.league.phase !== 'done' && guard++ < 40) {
    const fx = nextFixture(s.league);
    if (fx && fx.kind === 'allstar') { s.league.allstar = { skipped: true }; continue; }
    if (fx && fx.kind === 'classic') { s.league.classic = { opp: fx.opponent, gf: 1, ga: 0, won: true }; continue; }
    recordOurGame(s.league, s, 5, 3);
  }
  check('an Elite season of nine rounds plays through to a champion', s.league.phase === 'done' && s.league.champion === 'home' && s.league.results.length >= 9 && standings(s.league).length === 10, s.league.phase);
}

// and a real match against one plays (headless, both benches the AI's)
{
  const s = newSave(); s.tier = 1; s.league = newLeague(2, 1);
  const cfg = matchConfig(s, 'bulls', stageOf('bulls'), { league: true });
  cfg.humanTeam = null; cfg.humans = []; cfg.seed = 12345;
  const m = new Match(cfg);
  for (let t = 0; t < 60; t += 1 / 60) m.update(1 / 60);
  const sm = m.summary();
  check('a minute against the Bulls: no trouble', Array.isArray(sm.score) && sm.score.every((x) => Number.isFinite(x)), sm.score);
}

console.log(`National clubs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
