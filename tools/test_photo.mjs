// The season's team photo: the line-up first (in front), up to eight skaters in all, the
// starting goalie first and one more, and whether the Cup is in it.
//   node tools/test_photo.mjs
import { newSave, teamPhoto } from '../src/progress.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const s = newSave();
const p = teamPhoto(s, false);
check('the three of a new club, Halla in goal, no Cup', JSON.stringify(p) === JSON.stringify({ ids: ['frost', 'thunder', 'stone'], keepers: ['halla'], champ: false }), p);
s.lineup = { C: 'frost', W: 'stone', D: 'thunder' }; // (as the line-up says, whatever their kits)
check('the line-up in its order', teamPhoto(s, true).ids.join() === 'frost,stone,thunder' && teamPhoto(s, true).champ);
for (let i = 1; i <= 7; i++) s.roster['x' + i] = {}; // (not players: left out)
check('only real players', teamPhoto(s).ids.length === 3);

console.log(`Team photo: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
