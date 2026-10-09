// The league and its expansion: the founding six play five rounds in the first season; from
// the second, the Glacier Owls and Thunder Moose join (eight teams, seven rounds). Every
// pair meets once, a season plays through to a champion, a league already under way keeps
// its teams, and the new clubs' players are made from parts.
//   node tools/test_league.mjs
import { newLeague, leagueTeams, leagueRivals, nextFixture, recordOurGame, standings, strength, FOUNDING_TEAMS, EXPANDED_TEAMS } from '../src/league.js';
import { newSave, matchConfig, homeKitGroups, addRecruit, rivalGoalie } from '../src/progress.js';
import { TEAMS, TOURNAMENT, RIVAL_IDS, RECRUITS, GOALIE_RECRUITS, member, slotLook, slotSprite, useCaptainArt } from '../src/data.js';
import { useModular } from '../src/modular.js';
import { makeDraft } from '../src/draft.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const pairs = (L) => { const seen = new Set(); for (const r of L.schedule) for (const g of r.games) seen.add([g.a, g.b].sort().join('-')); return seen.size; };
const L1 = newLeague(1), L2 = newLeague(2);
check('the first season: the founding six, five rounds', L1.teams.length === 6 && L1.schedule.length === 5 && pairs(L1) === 15 && !L1.teams.includes('owls'));
check('from the second: eight teams, seven rounds', L2.teams.length === 8 && L2.schedule.length === 7 && pairs(L2) === 28 && L2.teams.includes('owls') && L2.teams.includes('moose'));
check('every round, everyone plays once', L2.schedule.every((r) => new Set(r.games.flatMap((g) => [g.a, g.b])).size === 8));
check('we meet the rivals easiest first', L2.schedule.map((r) => r.games[0].b).join() === RIVAL_IDS.join());
check('a league already under way keeps its teams', leagueTeams({}).length === 6 && leagueRivals({ teams: EXPANDED_TEAMS }).length === 7 && FOUNDING_TEAMS.length === 6);
check('a stage for every rival', RIVAL_IDS.every((id) => TOURNAMENT.stages.find((s) => s.team === id)));
check('the round label counts seven', nextFixture(L2).label.includes('7'), nextFixture(L2).label);

// a whole expanded season
{
  const s = newSave();
  s.season = 2; s.league = newLeague(2);
  const L = s.league;
  let guard = 0;
  while (L.phase !== 'done' && guard++ < 20) {
    const f = nextFixture(L);
    if (!f) break;
    if (f.kind === 'allstar') { L.allstar = { skipped: true }; continue; }
    if (f.kind === 'classic') { L.classic = { opp: f.opponent, gf: 1, ga: 0, won: true }; continue; }
    recordOurGame(L, s, 5, 2);
  }
  check('a season plays through to a champion', L.phase === 'done' && L.champion && L.results.length === 7, [L.phase, L.results.length]);
  check('the table has all eight, seven games each', standings(L).length === 8 && standings(L).every((r) => r.gp >= 7));
}

// the new clubs
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { glasses: {}, visor: {}, beard: {}, moustache: {}, mohawk: {}, cage: {} } } });
check('their players are made from parts', ['frost', 'thunder', 'stone'].every((k) => slotLook('owls', k) && slotSprite('owls', k).startsWith('body_')) && slotSprite('rams', 'frost') === 'gilded_rams_c');
const s = newSave();
s.season = 2; s.league = newLeague(2);
const cfg = matchConfig(s, 'moose', TOURNAMENT.stages.find((x) => x.team === 'moose'));
check('in a match: bodies and heads in their colours', cfg.teams[1].skaters.every((k) => k.sprite.startsWith('body_') && k.parts), cfg.teams[1].skaters.map((k) => k.sprite));
check('their goalie is made from parts, with a mask of their own', cfg.teams[1].goalie.art === 'parts_big' && cfg.teams[1].goalie.mask && cfg.teams[1].goalie.mask.mask === TEAMS.moose.goalieLook.mask && rivalGoalie(s, 'owls').name === TEAMS.owls.names.goalie);
check('a strength between the founding clubs', strength('lynx', s) < strength('owls', s) && strength('owls', s) < strength('moose', s) && strength('moose', s) < strength('royals', s));
s.rivals = { owls: { played: 1, wins: 1, losses: 0 } };
addRecruit(s, 'owls_c');
const m = member('owls_c');
check('sign one: from parts, in our colours', m.sprite.startsWith('body_') && m.parts && m.look === 'homekit' && m.name === TEAMS.owls.names.frost, m);
check('their parts load in our kit', homeKitGroups(s).includes('parts') && !homeKitGroups(s).some((g) => g === 'rival_null'));
check('their goalie can be signed too', GOALIE_RECRUITS.owls_g && GOALIE_RECRUITS.owls_g.art === 'parts_small' && GOALIE_RECRUITS.owls_g.mask && RECRUITS.moose_d.parts);
check('the draft draws from the league\'s clubs', makeDraft(s, 2, Math.random).rivals.every((r) => s.league.teams.includes(r)));

// once their captains' own art is in (Batch BA), they skate in it, for their club and once signed
useCaptainArt(() => true);
check('the captains in their own art', slotSprite('owls', 'frost') === 'glacier_owls_c' && !slotLook('owls', 'frost') && slotSprite('moose', 'frost') === 'thunder_moose_c' && slotSprite('owls', 'thunder').startsWith('body_'));
const s2 = newSave(); s2.season = 2; s2.league = newLeague(2); s2.rivals = { owls: { played: 1, wins: 1, losses: 0 } };
const cfg2 = matchConfig(s2, 'owls', TOURNAMENT.stages.find((x) => x.team === 'owls'));
check('...in a match', cfg2.teams[1].skaters[0].sprite === 'glacier_owls_c' && !cfg2.teams[1].skaters[0].parts);
addRecruit(s2, 'owls_c');
check('...and signed, in our colours', member('owls_c').sprite === 'glacier_owls_c' && !member('owls_c').parts && homeKitGroups(s2).includes('rival_glacier_owls'));

console.log(`league: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
