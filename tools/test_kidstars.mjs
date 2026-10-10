// Star stickers for the youngest (Little player games, Batch DN): which star, a different one
// from last time when there's a choice, and the count.
//   node tools/test_kidstars.mjs
import { pickKidStar, awardKidStar, KID_STAR_IDS } from '../src/kidstars.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const game = (score, stats) => ({ score, skaters: [{ team: 0, passes: 0, shots: 0, steals: 0, blocks: 0, ...stats }, { team: 1, passes: 40, shots: 20, steals: 9, blocks: 9 }] });

check('a quiet game: teamwork', pickKidStar(game([0, 3], {})) === 'team');
check('lots of passes: the passer first', pickKidStar(game([3, 1], { passes: 15, shots: 10 })) === 'passer');
check('not the same as last time when there\'s another', pickKidStar(game([3, 1], { passes: 15 }), 'passer') === 'scorer');
check('the only one earned, again if need be', pickKidStar(game([0, 1], {}), 'team') === 'team');
check('defending counts steals and blocks', pickKidStar(game([0, 1], { steals: 2, blocks: 2 })) === 'defender');
check('shots: hustle', pickKidStar(game([1, 1], { shots: 9 })) === 'hustle');
check('the rivals\' numbers don\'t count', pickKidStar(game([1, 4], {})) === 'team');
const save = {};
const a = awardKidStar(save, game([3, 1], { passes: 15 })), b = awardKidStar(save, game([3, 1], { passes: 15 }));
check('counted, with a change between games', save.kidStars.n === 2 && a === 'passer' && b === 'scorer' && save.kidStars.got.passer === 1);
check('five kinds', KID_STAR_IDS.length === 5);

console.log(`Kid stars: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
