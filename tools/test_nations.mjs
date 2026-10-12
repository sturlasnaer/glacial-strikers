// The Nations Cup (nations.js): the regions' teams, the round robin with the other regions' games
// alongside ours, the final, and the league's fixture for it.
//   node tools/test_nations.mjs
import { newSave, nationsConfig } from '../src/progress.js';
import { RECRUITS, NATIONS, TEAMS, teamInfo } from '../src/data.js';
import { regionTeam, newNations, recordNations, nationsNext, nationsStandings, REGION_IDS, US } from '../src/nations.js';
import { nextFixture } from '../src/league.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = newSave();
for (const id of REGION_IDS) {
  const tm = regionTeam(s, id);
  check(`${id}: a centre, a winger and a defender`, tm.skaters.length === 3 && tm.skaters.map((k) => RECRUITS[k].kit).join() === 'frost,thunder,stone', tm.skaters);
  check(`${id}: from two of its clubs at most (a phone holds two clubs' art)`, tm.teams.length <= 2 && tm.teams.every((c) => NATIONS[id].clubs.includes(c)), tm.teams);
  check(`${id}: a goalie of its clubs, and a strength`, NATIONS[id].clubs.includes(tm.goalie) && tm.diff > 0 && tm.diff <= 1);
  check(`${id}: a team for the screens`, teamInfo(id) && teamInfo(id).name && teamInfo(id).short);
}
const coast = regionTeam(s, 'region_coast'), star = coast.skaters[0];
const s2 = newSave(); s2.roster[star] = { level: 1, exp: 0 };
check('a star we\'ve signed doesn\'t play for their region', !regionTeam(s2, 'region_coast').skaters.includes(star));

const cfg = nationsConfig(s, coast);
check('a game: our line-up against the region\'s three, penalties on', cfg.teams[0].skaters.length === 3 && cfg.teams[1].skaters.map((k) => k.who).join() === coast.skaters.join() && cfg.penalties !== false);

// a cup won
let N = newNations(s);
check('the regions met weakest first', N.order.length === 3 && regionTeam(s, N.order[0]).diff <= regionTeam(s, N.order[2]).diff, N.order);
check('our first game: the weakest', nationsNext(N).opp === N.order[0] && !nationsNext(N).final);
const outs = [recordNations(s, N, 5, 1), recordNations(s, N, 5, 2), recordNations(s, N, 5, 3)];
check('three wins: into the final', outs.join() === 'next,next,final' && nationsNext(N).final, outs);
check('...the others played each other alongside (three games each)', Object.values(N.table).every((r) => r.p === 3) && N.games.length === 6);
check('...and the table adds up', Object.values(N.table).reduce((a, r) => a + r.w, 0) === 6 && nationsStandings(N)[0].id === US);
check('the final, won: the cup', recordNations(s, N, 5, 4) === 'champion' && N.champion === US && N.over && nationsNext(N) === null);

// a cup lost
const L = s.league;
L.phase = 'done'; L.awards = []; L.nations = newNations(s);
const f = nextFixture(L);
check('the league\'s next fixture: the Nations Cup', f && f.kind === 'nations' && f.opponent === L.nations.order[0] && f.stage.arena === 'nations', f);
const M = L.nations;
const lost = [recordNations(s, M, 1, 5), recordNations(s, M, 2, 5), recordNations(s, M, 0, 5)];
check('three losses: out, the final played without us', lost[2] === 'out' && M.over && M.final.played && M.champion !== US && REGION_IDS.includes(M.champion), lost);
check('...and nothing more for us', nationsNext(M) === null && nextFixture(L) === null);
check('the regions\' clubs are all real', REGION_IDS.every((id) => NATIONS[id].clubs.every((c) => TEAMS[c])));

console.log(`Nations Cup: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
