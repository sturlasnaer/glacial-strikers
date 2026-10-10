// The Mini Cup: three rounds against rivals from gentler to tougher pools, a win moves on, a loss
// ends the run, three wins bring the cup (counted) and the prize once; and its games are to three.
//   node tools/test_minicup.mjs
import { MINI_ROUNDS, MINI_POOLS, MINI_PRIZE, MINI_WIN, newMiniCup, miniResult, miniOf } from '../src/minicup.js';
import { Match } from '../src/match.js';
import { CHARACTERS, TEAMS } from '../src/data.js';
import { makeRng } from '../src/util.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = { coins: 0 };
const c = newMiniCup(s, makeRng(2));
check('three rounds, a rival from each pool', c.opps.length === 3 && c.opps.every((o, i) => MINI_POOLS[i].includes(o) && TEAMS[o]) && MINI_ROUNDS.length === 3);
check('...the pools get tougher', MINI_POOLS.every((p, i) => i === 0 || Math.min(...p.map((k) => TEAMS[k].diff)) > Math.max(...MINI_POOLS[i - 1].map((k) => TEAMS[k].diff))));
check('a win: on to the semifinal', miniResult(s, true) === 'next' && miniOf(s).round === 1);
check('...and the final', miniResult(s, true) === 'next' && miniOf(s).round === 2);
check('the cup: counted, and the prize', miniResult(s, true) === 'champion' && s.miniCups === 1 && s.coins === MINI_PRIZE && miniOf(s).over === 'champion');
const s2 = { coins: 0 };
newMiniCup(s2, makeRng(5));
check('a loss ends the run, no cup, no prize', miniResult(s2, false) === 'out' && !s2.miniCups && s2.coins === 0 && miniOf(s2).over === 'out');
check('nothing on: nothing to record', miniResult({}, true) === null);
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 3, powers: [], diff: [0.5, 0.5], winScore: MINI_WIN });
for (let t = 0; t < 900 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
check('its games are to three', m.winScore === 3 && m.state === 'over' && Math.max(...m.score) === 3, m.score);

console.log(`Mini Cup: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
