// Veteran levels: past level 10 the EXP keeps paying (a veteran level every VET_EXP, ten at
// most), each a stat point that can push a stat further past its usual +3 (12 is still the top); goalies
// grow too.
//   node tools/test_veteran.mjs
import { applyExp, applyGoalieExp, canRaise, goalieStats, newSave, expToNext, expPct, nextExp, MAX_LEVEL, VET_MAX, VET_EXP, STAT_CAP_BONUS } from '../src/progress.js';
import { member } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const save = newSave(), id = 'thunder', r = save.roster[id];
let need = 0; for (let L = 1; L < MAX_LEVEL; L++) need += expToNext(L);
applyExp(save, id, need);
check('level 10 as before', r.level === MAX_LEVEL && !r.vet && r.points === MAX_LEVEL - 1);
check('the EXP bar now heads for a veteran level', nextExp(r) === VET_EXP && expPct(r) === 0);
const ups = applyExp(save, id, VET_EXP + 10);
check('a veteran level: a point, and said', r.vet === 1 && r.points === MAX_LEVEL && ups.length === 1 && ups[0].vet === 1 && r.exp === 10, JSON.stringify(ups));
// spending: the usual limit is +3 over the base and 11 at most; a veteran a point further each, to 12
const base = member(id).base, k = Object.keys(base).sort((a, b) => base[a] - base[b])[0]; // (the lowest stat: room to grow)
r.alloc[k] = STAT_CAP_BONUS;
check('a veteran can go past the usual +3', canRaise(r, id, k));
r.vet = 0;
check('...where a non-veteran cannot', !canRaise(r, id, k));
r.vet = 3;
const top = Object.keys(base).sort((a, b) => base[b] - base[a])[0];
r.alloc[top] = 12 - base[top];
check('12 at most, for a veteran too', !canRaise(r, id, top));
r.alloc[top] = 11 - base[top];
check('(from 11 to 12 is fine)', canRaise(r, id, top));
// ten at most
applyExp(save, id, VET_EXP * 20);
check('ten veteran levels at most', r.vet === VET_MAX && expPct(r) === 100 && r.exp <= VET_EXP);
// goalies: reflexes and angles by turns, 13 at most
const g = save.goalie, before = goalieStats(save);
applyGoalieExp(save, need + VET_EXP * 4);
const after = goalieStats(save);
check('a veteran goalie: reflexes and angles up by turns', g.vet === 4 && after.rfx >= before.rfx + 2 && after.pos >= before.pos + 2, JSON.stringify({ before, after, vet: g.vet }));
applyGoalieExp(save, VET_EXP * 50);
const top2 = goalieStats(save);
check('...to 13 at most', g.vet === VET_MAX && top2.rfx <= 13 && top2.pos <= 13, JSON.stringify(top2));

console.log(`Veterans: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
