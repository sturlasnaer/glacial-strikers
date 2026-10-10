// The fan cam's words: the player's sign is cleaned (no markup or control characters, spaces
// squeezed, 16 characters at most), and the crowd's own signs name the club or the scorer.
//   node tools/test_fancam.mjs
import { cleanSign, SIGN_MAX, CROWD_SIGNS } from '../src/fancam.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

check('as written', cleanSign('GO MOM!') === 'GO MOM!');
check('no markup', cleanSign('<b>HI</b>') === 'bHI/b', cleanSign('<b>HI</b>'));
check('no control characters, spaces squeezed and trimmed', cleanSign('  GO\n\tTEAM   GO ') === 'GO TEAM GO', JSON.stringify(cleanSign('  GO\n\tTEAM   GO ')));
check(`${SIGN_MAX} characters at most`, cleanSign('A'.repeat(40)).length === SIGN_MAX);
check('nothing stays nothing', cleanSign('') === '' && cleanSign(null) === '' && cleanSign('   ') === '');
check('Icelandic letters stay', cleanSign('ÁFRAM ÞÓRA!') === 'ÁFRAM ÞÓRA!');
check('the crowd\'s signs: the club or the scorer in each but the plain ones', CROWD_SIGNS.length >= 4 && CROWD_SIGNS.every((s) => /\{club\}|\{name\}/.test(s) || /^[A-Z !]+$/.test(s)));

console.log(`Fan cam: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
