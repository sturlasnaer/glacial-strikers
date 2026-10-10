// The season's rivalry game: the league game against the club that has beaten us most (the
// one played more breaks a tie), or with no losses last season's champions, or the league's
// strongest. Picked once a season and kept; its fixture says so and pays half as much again.
//   node tools/test_rivalry.mjs
import { rivalryOf, RIVALRY_PRIZE } from '../src/rivals.js';
import { newLeague, nextFixture, recordOurGame } from '../src/league.js';
import { stageOf } from '../src/data.js';
import { newSave } from '../src/progress.js';
import { ACHIEVEMENTS } from '../src/achievements.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

{
  const s = newSave(); s.league = newLeague(1);
  check('a new save: the league\'s strongest (no losses, no champions yet)', rivalryOf(s, s.league) === 'royals');
}
{
  const s = newSave(); s.season = 2; s.league = newLeague(2); s.league.prevChampion = 'ravens';
  check('no losses yet: last season\'s champions', rivalryOf(s, s.league) === 'ravens');
}
{
  const s = newSave(); s.season = 3; s.league = newLeague(3);
  s.rivals = { comets: { played: 6, wins: 2, losses: 4 }, rams: { played: 9, wins: 5, losses: 4 }, royals: { played: 4, wins: 1, losses: 3 } };
  check('the club that has beaten us most, more played breaking a tie', rivalryOf(s, s.league) === 'rams');
  s.rivals.comets.losses = 7;
  check('...picked once a season, and kept', rivalryOf(s, s.league) === 'rams');
  check('...a new season picks again', rivalryOf(s, newLeague(4)) === 'comets');
}
{
  const s = newSave(); s.season = 2; s.tier = 1; s.league = newLeague(2, 1);
  s.rivals = { lynx: { played: 9, wins: 0, losses: 9 }, penguins: { played: 2, wins: 0, losses: 2 } };
  check('only a club in this season\'s league', rivalryOf(s, s.league) === 'penguins');
  let f = null, guard = 0;
  while (guard++ < 30) {
    f = nextFixture(s.league);
    if (!f || f.opponent === 'penguins') break;
    if (f.kind === 'allstar') s.league.allstar = { skipped: true }; else if (f.kind === 'classic') s.league.classic = { opp: f.opponent, gf: 1, ga: 0, won: true }; else recordOurGame(s.league, s, 5, 3);
  }
  check('its fixture: the rivalry game, half as much again', f && f.rivalry && f.stage.rivalry && f.stage.reward === Math.round(stageOf('penguins').reward * RIVALRY_PRIZE) && /Rivalry/.test(f.stage.round), f && f.stage);
  recordOurGame(s.league, s, 5, 3);
  const g = nextFixture(s.league);
  check('...the other games as before', g && !g.rivalry && g.stage.reward === stageOf(g.opponent).reward);
}
check('a trophy for winning one', ACHIEVEMENTS.some((a) => a.id === 'bragging-rights'));

console.log(`Rivalry: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
