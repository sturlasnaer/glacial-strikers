// The All-Star Game: it comes after league round 2, the fans' vote picks two mixed benches
// from our best scorer and two rival teams' stars, and it plays to the end with All-Star
// rules (no penalties, faster ultimates) without touching the standings.
//   node tools/test_allstar.mjs [matches]
import { Match } from '../src/match.js';
import { newSave, allStarVote, allStarConfig, matchConfig, computeRewards } from '../src/progress.js';
import { nextFixture, recordOurGame, recordAllStar, standings, ALLSTAR_AFTER } from '../src/league.js';
import { recordRealGame } from '../src/awards.js';
import { RECRUITS, TEAMS, recruitKey } from '../src/data.js';

let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };

// a season played up to the All-Star break (our games recorded like real ones)
function season(seed = 1) {
  const s = newSave();
  const L = s.league;
  for (let r = 0; r < ALLSTAR_AFTER; r++) {
    const f = nextFixture(L);
    const m = new Match({ ...matchConfig(s, f.opponent, f.stage), humanTeam: null, seed: seed * 10 + r });
    for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
    const sum = m.summary();
    recordRealGame(s, L, sum, f.opponent);
    recordOurGame(L, s, sum.score[0], sum.score[1]);
  }
  return s;
}

const s = season();
const L = s.league;
const f = nextFixture(L);
check('after round 2 comes the All-Star Game', f && f.kind === 'allstar' && f.opponent === 'allstar' && f.stage.arena === 'home', f);
const before = JSON.stringify(standings(L));

const v = allStarVote(s, L);
check('a vote', v && v.ours.length === 3 && v.theirs.length === 3, v);
check('our best scorer leads our bench', s.roster[v.star] && v.ours[0] === v.star);
const teamOf = (who) => RECRUITS[who] && RECRUITS[who].team;
check('two rival teams, one star each on our bench', new Set(v.ours.slice(1).map(teamOf)).size === 2 && v.ours.slice(1).every((w) => v.teams.includes(teamOf(w))), v);
check('their bench from the same two teams', v.theirs.every((w) => v.teams.includes(teamOf(w))), v);
check('nobody twice', new Set([...v.ours, ...v.theirs]).size === 6);
check('stars first: our guests outscored their teammates', v.ours.slice(1).every((w) => v.theirs.filter((x) => teamOf(x) === teamOf(w)).every((x) => v.points[x] <= v.points[w])), v.points);
check('their goalie from one of the two', v.teams.includes(v.goalie));

// signed players are ours, not voted in for the other bench
{
  const s2 = season(2);
  const v0 = allStarVote(s2, s2.league);
  const signed = v0.theirs[0];
  s2.roster[signed] = { level: 3, exp: 0, points: 0, perks: [], gear: {}, pendingPerk: null };
  const v2 = allStarVote(s2, s2.league);
  check('a signing isn\'t voted onto either bench as a guest', ![...v2.ours.slice(1), ...v2.theirs].includes(signed), v2);
  // sign nearly everyone: no game
  for (const k of Object.keys(RECRUITS)) if (!['lynx', 'comets'].includes(RECRUITS[k].team) || RECRUITS[k].kit !== 'frost') s2.roster[k] ||= { level: 1, exp: 0, points: 0, perks: [], gear: {}, pendingPerk: null };
  check('no stars left: no vote', allStarVote(s2, s2.league) === null);
}

// the match: All-Star rules, both benches mixed, plays to the end
const N = +(process.argv[2] || 6);
let goals = 0, pims = 0, ults = 0, done = 0;
for (let i = 0; i < N; i++) {
  const cfg = { ...allStarConfig(s, v), humanTeam: null, seed: 100 + i };
  const m = new Match(cfg);
  if (i === 0) {
    check('our guests wear our colours', m.teamSkaters(0).filter((k) => !s.roster[k.who]).every((k) => k.look === 'homekit' && k.sprite), m.teamSkaters(0).map((k) => [k.who, k.look]));
    check('their stars in their own art', m.teamSkaters(1).every((k) => k.sprite && k.sprite.startsWith(TEAMS[teamOf(k.who)].art)));
    check('no penalties, ultimates twice as fast', !m.penaltiesOn && m.ultRate === 2);
  }
  for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
  const sum = m.summary();
  if (m.state === 'over') done++;
  goals += sum.score[0] + sum.score[1];
  pims += sum.pen ? sum.pen[0].pims + sum.pen[1].pims : 0;
  ults += sum.skaters.reduce((a, k) => a + k.ults, 0);
  if (i === 0) {
    const rw = computeRewards(s, sum, f.stage, false);
    check('EXP only for our own players', Object.keys(rw.exp).every((id) => s.roster[id]) && Object.keys(rw.exp).length === 1, rw.exp);
    check('chemistry only between our own', Object.keys(rw.chem).length === 0, rw.chem);
    recordAllStar(L, { gf: sum.score[0], ga: sum.score[1], won: sum.winner === 0 });
  }
}
check('every game finished', done === N, [done, N]);
check('no penalties called', pims === 0, pims);
check('the standings didn\'t move', JSON.stringify(standings(L)) === before);
const after = nextFixture(L);
check('then round 3', after && after.kind === 'regular' && /3/.test(after.label), after);
console.log(`all-star: ${ok} passed, ${fail} failed  (${N} games: ${(goals / N).toFixed(1)} goals, ${(ults / N).toFixed(1)} ultimates a game; vote ${v.ours.join(',')} vs ${v.theirs.join(',')})`);
process.exit(fail ? 1 : 0);
