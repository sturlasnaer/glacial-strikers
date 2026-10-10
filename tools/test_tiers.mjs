// Divisions: up a level with the Cup, down one from last place (not in the first season up); league games tougher and better
// paid a level up (the rivals' best stats, their goalies, the AI), and nothing else changes.
//   node tools/test_tiers.mjs
import { TIERS, TIER_MAX, tierOf, tierInfo, moveTier, noteTierCup, safeSeason } from '../src/tiers.js';
import { newSave, matchConfig, computeRewards } from '../src/progress.js';
import { strength, standings } from '../src/league.js';
import { TOURNAMENT } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = newSave();
check('a new save: the Regional division, the league as it was', tierOf(s) === 0 && tierInfo(s).name === TOURNAMENT.name);
check('three divisions', TIERS.length === 3 && TIER_MAX === 2);

// the season's end
const rows = (last) => [{ id: 'lynx' }, { id: 'home' }, { id: last }].map((r) => r);
check('the Cup: up a division', moveTier(s, { champion: 'home' }, rows('owls')) === 'promoted' && tierOf(s) === 1);
check('last place a level up: back down', moveTier(s, { champion: 'royals' }, [{ id: 'royals' }, { id: 'home' }]) === 'relegated' && tierOf(s) === 0);
check('last place in the Regional: nowhere lower', moveTier(s, { champion: 'royals' }, [{ id: 'royals' }, { id: 'home' }]) === null && tierOf(s) === 0);
s.tier = 2;
check('the Cup in the Elite: the top already', moveTier(s, { champion: 'home' }, rows('owls')) === null && tierOf(s) === 2);
check('mid-table: stay', moveTier(s, { champion: 'royals' }, [{ id: 'home' }, { id: 'royals' }]) === null && tierOf(s) === 2);

// a first season up is safe
{
  const p = newSave();
  check('promoted: the next season marked safe', moveTier(p, { champion: 'home', season: 3 }, rows('owls')) === 'promoted' && p.upIn === 4 && safeSeason(p, { season: 4 }) && !safeSeason(p, { season: 5 }));
  check('last place in the first season up: no drop', moveTier(p, { champion: 'royals', season: 4 }, [{ id: 'royals' }, { id: 'home' }]) === null && tierOf(p) === 1);
  check('last again the season after: down', moveTier(p, { champion: 'royals', season: 5 }, [{ id: 'royals' }, { id: 'home' }]) === 'relegated' && tierOf(p) === 0);
  check('never safe in the Regional', !safeSeason(p, { season: 4 }));
}

// league games a level up
const sum = (c) => c.teams[1].skaters.reduce((a, k) => a + Object.values(k.stats).reduce((b, x) => b + x, 0), 0);
s.tier = 0;
const base = matchConfig(s, 'comets', null, { league: true });
s.tier = 2;
const up = matchConfig(s, 'comets', null, { league: true }), friendly = matchConfig(s, 'comets', null, {});
check('the rivals\' stats a level up: higher', sum(up) > sum(base), `${sum(base)} -> ${sum(up)}`);
check('their goalie too', up.teams[1].goalie.stats.rfx > base.teams[1].goalie.stats.rfx);
check('and the AI sharper', up.diff[1] > base.diff[1], `${base.diff} -> ${up.diff}`);
check('not in an exhibition (or the Mini Cup, or the daily)', sum(friendly) === sum(base) && friendly.diff[1] === base.diff[1]);
const st0 = (() => { s.tier = 0; return strength('comets', s); })(), st2 = (() => { s.tier = 2; return strength('comets', s); })();
check('the rest of the league\'s results: stronger rivals a level up', st2 > st0);

// purses and cups
const summary = { winner: 0, score: [3, 1], skaters: [], goals: [], pen: null, mods: [], saves: [0, 0] };
s.tier = 0;
const c0 = computeRewards(s, summary, { reward: 100 }, false).coins;
s.tier = 1;
const c1 = computeRewards(s, summary, { reward: 100 }, false).coins, ex = computeRewards(s, summary, { reward: 100 }, true).coins;
check('a level up pays more', c1 === Math.round(c0 * 1.25), `${c0} -> ${c1}`);
check('but not exhibitions', ex === Math.round(c0 * 0.5), ex);
noteTierCup(s); noteTierCup(s);
check('cups counted by division', s.tierCups.national === 2);
check('(standings still work)', typeof standings === 'function');

console.log(`Divisions: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
