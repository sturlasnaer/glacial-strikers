// The free-agent market: it opens after a few matches, offers one skater per position and
// now and then a goalie, refreshes every few matches, and signing brings a veteran onto the
// roster (or into goal) at the line-up's level.
//   node tools/test_agents.mjs
import { newSave, goalieIds, homeGoalie, homeKitGroups, setStarter, rosterIds, applyExp } from '../src/progress.js';
import { refreshAgents, agentState, signAgent, marketOpen, agentsLeft, MARKET_FROM, REFRESH } from '../src/agents.js';
import { member, goalieInfo, setRookies, setFreeGoalies, CHARACTERS, ROOKIES } from '../src/data.js';
import { tradeable, playerValue } from '../src/trades.js';
import { useModular } from '../src/modular.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
let seed = 9;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {} } } });

const s = newSave();
setRookies({}); setFreeGoalies({});
s.coins = 10000;
check('closed at first', !marketOpen(s) && !refreshAgents(s, rnd));
s.record.played = MARKET_FROM;
check('opens after a few matches', marketOpen(s) && refreshAgents(s, rnd));
const st = agentState(s);
check('one skater per position', st.list.filter((a) => !a.goalie).map((a) => CHARACTERS[a.kit].role).join('') === 'CWD', st.list);
check('faces and builds from parts', st.list.filter((a) => !a.goalie).every((a) => a.parts && ['std', 'big', 'small'].includes(a.parts.body)));
check('no new faces before it\'s time', !refreshAgents(s, rnd) && agentsLeft(s) === REFRESH);
s.record.played += REFRESH;
check('new faces after', refreshAgents(s, rnd));

// over many weeks: goalies now and then, prices follow quality, names don't repeat in a list
let goalies = 0, priceOk = true, namesOk = true;
for (let i = 0; i < 60; i++) {
  s.record.played += REFRESH;
  refreshAgents(s, rnd);
  const l = agentState(s).list;
  if (l.some((a) => a.goalie)) goalies++;
  if (new Set(l.map((a) => a.name)).size !== l.length) namesOk = false;
  for (const a of l.filter((x) => !x.goalie)) {
    const extra = sum(a.base) - sum(CHARACTERS[a.kit].base);
    if (a.price < 150 || (a.star && extra < 1)) priceOk = false;
    if (Object.values(a.base).some((v) => v < 2 || v > 10)) priceOk = false;
  }
}
check('a goalie now and then', goalies > 10 && goalies < 45, goalies);
check('prices and numbers make sense', priceOk);
check('no two of the same name', namesOk);

// signing a skater
while (!agentState(s).list.some((a) => a.goalie)) { s.record.played += REFRESH; refreshAgents(s, rnd); }
const before = s.coins, a = agentState(s).list[0];
s.roster.frost.level = 5; s.roster.thunder.level = 5; s.roster.stone.level = 5;
const n = agentState(s).list.length;
const id = signAgent(s, 0);
const m = member(id);
check('a skater joins the roster', id && s.roster[id] && rosterIds(s).includes(id) && s.coins === before - a.price && agentState(s).list.length === n - 1, id);
check('a veteran, not a rookie', m.agent && !m.rookie && m.title.startsWith('Veteran') && m.name === a.name && m.def.arch === a.arch && m.def.elem === a.elem);
check('at the line-up\'s level, with perks', s.roster[id].level === a.level && s.roster[id].perks.length === [3, 5, 7].filter((lv) => a.level >= lv).length, [s.roster[id], a.level]);
check('no faster growth', (() => { const e = s.roster[id].exp; applyExp(s, id, 40); return s.roster[id].exp - e === 40 || s.roster[id].level > a.level; })());
check('worth what they cost in a trade', tradeable(s).includes(id) && playerValue(s, id) === a.price + (s.roster[id].level - 1) * 20);
// signing a goalie
const gi = agentState(s).list.findIndex((x) => x.goalie), g = agentState(s).list[gi];
const gid = signAgent(s, gi);
check('a goalie joins the goalies', gid && s.goalies[gid] && goalieIds(s).includes(gid) && goalieInfo(gid).name === g.name && goalieInfo(gid).art === 'newcomer', gid);
check('starts if you choose', setStarter(s, gid) && homeGoalie(s).who === gid && homeGoalie(s).look === 'homekit' && homeGoalie(s).style === g.style);
check('in the newcomer goalie\'s art, our colours', homeKitGroups(s).includes('newcomers'));
check('can\'t sign what you can\'t afford', (() => { s.coins = 0; return signAgent(s, 0) === null; })());
// a second save forgets the first one's free agents
setRookies({}); setFreeGoalies({});
check('free agents belong to their save', member(id) === null && goalieInfo(gid).id === 'halla' && !ROOKIES[id]);

console.log(`free agents: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
