// Club facilities (Shop › Club facilities): building and paying, the three-level cap, and each
// facility's effect where the game uses it: the home chant, drill EXP and sessions, stamina
// coming back in a match, Draft Day's potential and the free-agent market.
//   node tools/test_facilities.mjs
import { FACILITIES, FACILITY_IDS, facilityLevel, nextCost, buildFacility, chantBoost, drillExpMul, trainingSessions, staminaRegenMul, scoutedProspects, extraAgents } from '../src/facilities.js';
import { newSave, matchConfig, drillRewards } from '../src/progress.js';
import { makeDraft } from '../src/draft.js';
import { refreshAgents, agentState, MARKET_FROM } from '../src/agents.js';
import { DRILL_REWARDS } from '../src/drills.js';
import { Match } from '../src/match.js';
import { setRookies, TOURNAMENT } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
setRookies({});

// building
{
  const s = newSave();
  check('four facilities, three levels each, rising costs', FACILITY_IDS.length === 4 && FACILITY_IDS.every((id) => FACILITIES[id].costs.length === 3 && FACILITIES[id].levels.length === 3 && FACILITIES[id].costs.every((c, i, a) => !i || c > a[i - 1])));
  check('a new club has none', FACILITY_IDS.every((id) => facilityLevel(s, id) === 0) && nextCost(s, 'stands') === FACILITIES.stands.costs[0]);
  s.coins = 100;
  check("can't build without the coins", !buildFacility(s, 'stands') && s.coins === 100 && facilityLevel(s, 'stands') === 0);
  s.coins = 100000;
  const before = s.coins;
  check('build: pays and goes up a level', buildFacility(s, 'stands') && s.coins === before - FACILITIES.stands.costs[0] && facilityLevel(s, 'stands') === 1);
  buildFacility(s, 'stands'); buildFacility(s, 'stands');
  const at3 = s.coins;
  check('...to three, then no more', facilityLevel(s, 'stands') === 3 && nextCost(s, 'stands') === null && !buildFacility(s, 'stands') && s.coins === at3);
  check('...an unknown one is nothing', !buildFacility(s, 'casino') && facilityLevel({ facilities: { stands: 9 } }, 'stands') === 3);
}

// the stands: only at home
{
  const s = newSave();
  check('stands: nothing without them', chantBoost(s, true).excite === 0 && chantBoost(s, true).cool === 0);
  s.facilities = { stands: 2 };
  const b = chantBoost(s, true), away = chantBoost(s, false);
  check('...at home, sooner and longer', b.excite > 0 && b.cool > 0 && b.longer === 1, b);
  check('...away, nothing', away.excite === 0 && away.cool === 0 && away.longer === 0);
}

// the training centre
{
  const s = newSave();
  const id = Object.keys(s.roster)[0];
  const base = drillRewards(newSave(), 'cones', id, 20, 2, DRILL_REWARDS).exp;
  s.facilities = { training: 2 };
  const more = drillRewards(s, 'cones', id, 20, 2, DRILL_REWARDS).exp;
  check('training: 30% more drill EXP at level 2', more === Math.round(base * 1.3) && drillExpMul(s) === 1.3, [base, more]);
  check('...two sessions until level 3, then three', trainingSessions(s) === 2 && trainingSessions({ facilities: { training: 3 } }) === 3);
}

// the physio room: stamina back faster in a match, for our skaters only
{
  const s = newSave();
  const stage = TOURNAMENT.stages[0];
  const plain = new Match(matchConfig(s, stage.team, stage));
  s.facilities = { physio: 3 };
  const cfg = matchConfig(s, stage.team, stage);
  const m = new Match(cfg);
  check('physio: 12% at level 3', staminaRegenMul(s) === 1.12 && cfg.buffs.regenMul === 1.12);
  const ours = (mm) => mm.teamSkaters(0)[0].d.regen, theirs = (mm) => mm.teamSkaters(1)[0].d.regen;
  check('...our skaters recover faster, theirs as before', Math.abs(ours(m) / ours(plain) - 1.12) < 1e-9 && theirs(m) === theirs(plain), [ours(m), ours(plain)]);
}

// the scouting office: better prospects, one more free agent
{
  const avg = (lvl) => {
    let sum = 0, n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const s = newSave();
      s.facilities = { scouting: lvl };
      let x = seed * 7919;
      const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      for (const p of makeDraft(s, 2, rnd).prospects) { sum += p.potential; n++; }
    }
    return sum / n;
  };
  const [a0, a1, a3] = [avg(0), avg(1), avg(3)];
  check('scouting: three prospects still', makeDraft(Object.assign(newSave(), { facilities: { scouting: 3 } }), 2).prospects.length === 3);
  check('...more potential at level 1, more again at 3', a1 > a0 + 0.1 && a3 > a1 + 0.3, [a0, a1, a3].map((v) => v.toFixed(2)));
  check('...how many are scouted', scoutedProspects({}) === 0 && scoutedProspects({ facilities: { scouting: 1 } }) === 1 && scoutedProspects({ facilities: { scouting: 3 } }) === 3);
  const market = (lvl) => { const s = newSave(); s.facilities = { scouting: lvl }; s.record.played = MARKET_FROM; refreshAgents(s, () => 0.99); return agentState(s).list.filter((a) => !a.goalie).length; };
  check('...one more free agent from level 2', market(0) === 3 && market(1) === 3 && market(2) === 4 && extraAgents({ facilities: { scouting: 2 } }) === 1, [market(0), market(2)]);
}

console.log(`facilities: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
