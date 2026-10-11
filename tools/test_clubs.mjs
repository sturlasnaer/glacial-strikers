// Playable clubs: a new career as the Foxes (the cast's story, as before) or as one of the
// Frostline's clubs. As another club, its three stars and goalie are the roster in its own
// name, colours and crest; the Foxes take its place in the league (its slot: difficulty,
// prize, stats; the second season for an expansion club), signable like any club's; the
// cast's names in other clubs' lines become its stars'; and the save keeps all of it.
//   node tools/test_clubs.mjs
import { TEAMS, RIVAL_IDS, FOUNDING_RIVALS, ELITE_IDS, ALL_RIVALS, CAREER, CLUB, RECRUITS, GOALIE_RECRUITS, DIALOGUE, useCareer, applyClub, clubText, stageOf, careerClub } from '../src/data.js';
import { newSave, goalieIds, starterId, lineupIds, matchConfig } from '../src/progress.js';
import { newLeague } from '../src/league.js';
import { CLUB_CHOICES, CLUB_STORIES, clubStars } from '../src/clubs.js';
import { pickRunners, mascotOf } from '../src/race.js';
import { postcardFor } from '../src/trip.js';
import { useModular } from '../src/modular.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });

check('eight choices: the Foxes and the Frostline\'s seven, each with a story', CLUB_CHOICES.length === 8 && CLUB_CHOICES[0] === 'foxes' && CLUB_CHOICES.every((id) => CLUB_STORIES[id] && CLUB_STORIES[id].intro.length >= 4 && CLUB_STORIES[id].blurb && clubStars(id).length === 4));
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
// and back: a Foxes career after a club career puts everything back
{
  const s = newSave();
  applyClub(s.club);
  check('back to the Foxes\' story: lists, name and crest as they were', CAREER.team === null && RIVAL_IDS.join() === 'lynx,comets,owls,rams,moose,ravens,royals' && ELITE_IDS.includes('royals') && !ALL_RIVALS.includes('foxes') && CLUB.name === 'Snowcrest Foxes' && TEAMS.home.crest === 'hud_elements/misc/home_crest');
}
useCareer(null);

console.log(`Clubs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
