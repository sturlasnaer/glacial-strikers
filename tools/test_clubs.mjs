// Playable clubs: a new career as the Foxes (the cast's story, as before) or as one of the
// Frostline's clubs. As another club, its three stars and goalie are the roster in its own
// name, colours and crest; the Foxes take its place in the league (its slot: difficulty,
// prize, stats; the second season for an expansion club), signable like any club's; the
// cast's names in other clubs' lines become its stars'; and the save keeps all of it.
//   node tools/test_clubs.mjs
import { TEAMS, RIVAL_IDS, FOUNDING_RIVALS, ELITE_IDS, ALL_RIVALS, CAREER, CLUB, RECRUITS, GOALIE_RECRUITS, DIALOGUE, useCareer, applyClub, clubText, stageOf, careerClub, clubOwn } from '../src/data.js';
import { tradeable } from '../src/trades.js';
import { AchievementTracker } from '../src/achievements.js';
import { newSave, goalieIds, starterId, lineupIds, matchConfig } from '../src/progress.js';
import { newLeague, nextFixture, recordOurGame, standings, BYE, isBye, realRounds } from '../src/league.js';
import { makeRng } from '../src/util.js';
import { CLUB_CHOICES, CLUB_STORIES, CLUB_PAYOFFS, payoffDue, clubStars, clubStart } from '../src/clubs.js';
import { pickRunners, mascotOf } from '../src/race.js';
import { postcardFor } from '../src/trip.js';
import { useModular } from '../src/modular.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });

check('nine choices: the Foxes, the Frostline\'s seven and one\'s own, each with a story', CLUB_CHOICES.length === 9 && CLUB_CHOICES[0] === 'foxes' && CLUB_CHOICES.at(-1) === 'custom' && CLUB_CHOICES.every((id) => CLUB_STORIES[id] && CLUB_STORIES[id].intro.length >= 4 && CLUB_STORIES[id].blurb && clubStars(id).length === 4));
check('the picker says how strong each starts: the Lynx tough (a young goalie), the Royals strong, the Foxes even', clubStart('lynx') === 'tough' && clubStart('royals') === 'strong' && clubStart('foxes') === 'even' && clubStart('custom') === 'even' && CLUB_CHOICES.every((id) => ['tough', 'even', 'strong'].includes(clubStart(id))));
check('...only real clubs can be played', careerClub('lynx') === 'lynx' && careerClub('foxes') === null && careerClub('home') === null && careerClub('pandas') === null && careerClub('nope') === null);

// the Foxes' story: as before
{
  const s = newSave();
  check('the Foxes: the cast, Halla, the league as it was', !s.team && lineupIds(s).join() === 'frost,thunder,stone' && starterId(s) === 'halla' && CAREER.team === null && RIVAL_IDS.join() === 'lynx,comets,owls,rams,moose,ravens,royals' && !s.league.teams.includes('foxes'));
  applyClub(s.club);
  check('...named and coloured as ever', CLUB.name === 'Snowcrest Foxes' && !CLUB.team && clubText('Go Foxes, Nix!') === 'Go Foxes, Nix!');
}

// a career as the Comets
{
  const s = newSave('comets');
  check('the Comets: their stars and goalie are the roster', s.team === 'comets' && lineupIds(s).join() === 'comets_c,comets_w,comets_d' && Object.keys(s.roster).length === 3 && starterId(s) === 'comets_g' && goalieIds(s).join() === 'comets_g');
  check('...the Foxes in their place in the league, the same slot', RIVAL_IDS.join() === 'lynx,foxes,owls,rams,moose,ravens,royals' && FOUNDING_RIVALS.includes('foxes') && !FOUNDING_RIVALS.includes('comets') && s.league.teams.join() === 'home,lynx,foxes,rams,ravens,royals');
  check('...with the slot\'s difficulty, prize and stats', TEAMS.foxes.diff === TEAMS.comets.diff && stageOf('foxes').reward === stageOf('comets').reward && TEAMS.foxes.goalie.rfx === TEAMS.comets.goalie.rfx);
  check('...signable like any club\'s (the cast, Halla in goal)', RECRUITS.foxes_c.name === 'Nix' && RECRUITS.foxes_w.sprite === 'thunder_winger' && GOALIE_RECRUITS.foxes_g.name === 'Halla' && GOALIE_RECRUITS.foxes_g.art === null && ALL_RIVALS.includes('foxes') && !ALL_RIVALS.includes('comets'));
  check('...a match against the Foxes: the cast in their colours, Halla in goal', (() => { const c = matchConfig(s, 'foxes', stageOf('foxes'), { league: true }); return c.teams[1].skaters.map((k) => k.name).join() === 'Nix,Volta,Bram' && c.teams[1].goalie.name === 'Halla' && c.teams[1].goalie.art === null; })());
  check('...the Foxes have words of their own (never the word that would become ours)', DIALOGUE.foxes && !JSON.stringify(DIALOGUE.foxes).includes('Foxes'));
  applyClub(s.club);
  check('...named, coloured and crested as the Comets', CLUB.name === 'Ember Comets' && CLUB.nick === 'Comets' && CLUB.team === 'comets' && TEAMS.home.name === 'Ember Comets' && TEAMS.home.crest === 'rival_crests/crest/ember_comets');
  check('...lines about the Foxes and the cast become ours', clubText('The Snowcrest Foxes! Pass it, Volta.') === 'The Ember Comets! Pass it, Blaze.');
  check('...a new season keeps the Foxes in the league', newLeague(2).teams.includes('foxes') && !newLeague(2).teams.includes('comets'));
  check('...our mascot runs for us; the Snow Fox for the Foxes', mascotOf('home') === 'ember_comets' && mascotOf('foxes') === 'snow_fox' && !pickRunners('foxes', () => 0.3).includes('comets'));
  check('...beating the Foxes sends Snowcrest\'s postcard, the Cup our own', postcardFor('regular', 'home', 'foxes') === 'home' && postcardFor('final', 'frostline_coliseum') === 'comets');
  const got = []; new AchievementTracker(s, (a) => got.push(a.id)).checkMeta();
  check('...our own stars are the club\'s, like the cast: not signings, not for trade', clubOwn('comets_c') && clubOwn('comets_g') && !clubOwn('foxes_c') && !clubOwn('lynx_w') && tradeable(s).length === 0 && !got.includes('signing'), [tradeable(s), got]);
}

// an expansion club: the Foxes join in the second season
{
  const s = newSave('owls');
  check('the Owls: the founding league without the Foxes, who join with the Moose', !s.league.teams.includes('foxes') && TEAMS.foxes.expansion && newLeague(2).teams.includes('foxes') && newLeague(2).teams.includes('moose'));
}
// up a division: the Foxes in the Elite if the club they replace is there
{
  newSave('royals');
  check('the Royals: the Foxes in the Elite in their place', ELITE_IDS.includes('foxes') && !ELITE_IDS.includes('royals') && newLeague(5, 2).teams.includes('foxes'));
}
// a club of one's own: founders and a goalie from parts, the Foxes as neighbours, and a bye
// each round (an even number of rivals)
{
  const s = newSave('custom', makeRng(5));
  check('one\'s own club: three founders from parts and a goalie', s.team === 'custom' && lineupIds(s).join() === 'rk1,rk2,rk3' && Object.values(s.rookies).every((r) => r.founder && r.parts) && starterId(s) === 'fa_g0' && goalieIds(s).join() === 'fa_g0' && CAREER.custom && !CAREER.team);
  check('...no club leaves: the Foxes join the Frostline, mid-table', RIVAL_IDS.length === 8 && RIVAL_IDS.join() === 'lynx,comets,owls,foxes,rams,moose,ravens,royals' && FOUNDING_RIVALS.length === 6 && stageOf('foxes').reward === stageOf('owls').reward);
  applyClub(s.club);
  check('...named as the player names it, the founders in the lines', CLUB.custom && CLUB.name === s.club.name && clubText('Pass it, Volta!') === `Pass it, ${s.club.names.thunder}!`);
  check('...its mascot is its crest\'s (Batch EU), the Foxes keep the Snow Fox', mascotOf('home') === 'club_' + s.club.crest && mascotOf('foxes') === 'snow_fox');
  // the season: six rivals, seven rounds, one of them our bye (the last), every pair once
  const L = s.league, rounds = L.schedule.length;
  check('...a bye a round: seven rounds for six rivals, ours the last', rounds === 7 && L.schedule[6].games[0].b === BYE && L.schedule.slice(0, 6).every((r) => r.games[0].b !== BYE) && realRounds(L) === 6);
  const pairs = new Set();
  for (const r of L.schedule) for (const g of r.games) if (!isBye(g)) pairs.add([g.a, g.b].sort().join('-'));
  check('...every pair meets once', pairs.size === 21);
  let guard = 0;
  while (L.phase === 'regular' && guard++ < 20) {
    const f = nextFixture(L);
    if (f.kind === 'allstar') { L.allstar = { skipped: true }; continue; }
    if (f.kind === 'classic') { L.classic = { opp: f.opponent, gf: 1, ga: 0, won: true }; continue; }
    check(`...never a fixture against the bye (round ${L.round + 1})`, f.opponent !== BYE);
    recordOurGame(L, s, 5, 2);
  }
  const rows = standings(L);
  check('...after our last game the bye round plays itself, then the playoffs', L.phase !== 'regular' && L.results.length === 7 && L.results[6][0].bye && rows.every((r) => r.gp === 6), rows.map((r) => r.id + ':' + r.gp).join());
}

// each story's payoff: after the club's first Cup, and after its first Elite Cup (once each;
// a save that won its cups before these scenes doesn't see them late)
check('every story has its payoffs', CLUB_CHOICES.every((id) => CLUB_PAYOFFS[id] && CLUB_PAYOFFS[id].cup.length >= 3 && CLUB_PAYOFFS[id].top.length >= 3));
check('...never naming the Foxes in another club\'s (they\'d read as ours)', CLUB_CHOICES.filter((id) => id !== 'foxes' && id !== 'custom').every((id) => !JSON.stringify(CLUB_PAYOFFS[id]).includes('Foxes')));
{
  const s = newSave('ravens');
  check('...none before a cup', payoffDue(s) === null);
  s.cups = 1; s.tierCups = { regional: 1 };
  check('...the first Cup: the club\'s own', payoffDue(s) === CLUB_PAYOFFS.ravens.cup && payoffDue(s) === null);
  s.cups = 2; s.tierCups.regional = 2;
  check('...not the second', payoffDue(s) === null);
  s.tier = 2; s.cups = 3; s.tierCups.elite = 1;
  check('...the first Elite Cup: the top of the country', payoffDue(s) === CLUB_PAYOFFS.ravens.top && payoffDue(s) === null);
  const old = newSave(); old.cups = 4; old.tier = 2; old.tierCups = { regional: 2, national: 1, elite: 1 };
  old.tierCups.elite = 2;
  check('...an older save with cups already won: nothing late', payoffDue(old) === null);
}

// and back: a Foxes career after a club career puts everything back
{
  const s = newSave();
  applyClub(s.club);
  check('back to the Foxes\' story: lists, name and crest as they were', CAREER.team === null && RIVAL_IDS.join() === 'lynx,comets,owls,rams,moose,ravens,royals' && ELITE_IDS.includes('royals') && !ALL_RIVALS.includes('foxes') && CLUB.name === 'Snowcrest Foxes' && TEAMS.home.crest === 'hud_elements/misc/home_crest');
}
useCareer(null);

console.log(`Clubs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
