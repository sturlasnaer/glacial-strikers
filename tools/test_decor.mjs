// Locker room decorations: bought once with coins (not twice, not without the coins), put up
// in their spot as they're bought; one item a spot (two posters, the older coming down for a
// third), put away and up again at will, and drawn where their spot is. Every spot filled is
// Home Sweet Home.
//   node tools/test_decor.mjs
import { DECOR, DECOR_BY_ID, DECOR_SLOTS, SLOTS_OF, decorOf, buyDecor, putUp, takeDown, owns, isOn, placed, decorFull } from '../src/decor.js';
import { ACHIEVEMENTS } from '../src/achievements.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

check('sixteen items, every one in a known spot with its frames and a price', DECOR.length === 16 && DECOR.every((d) => SLOTS_OF[d.slot] && d.frames.length && d.price > 0) && new Set(DECOR.map((d) => d.id)).size === 16);
check('...a spot for each, two locker doors', Object.keys(SLOTS_OF).every((k) => DECOR_SLOTS[k].length === SLOTS_OF[k]) && DECOR_SLOTS.poster.length === 2);

const s = { coins: 100 };
check('not without the coins', !buyDecor(s, 'arcade') && s.coins === 100 && !owns(s, 'arcade'));
check('bought: paid for and up in the room', buyDecor(s, 'pennants') && s.coins === 20 && owns(s, 'pennants') && isOn(s, 'pennants'));
check('...not twice', !buyDecor(s, 'pennants') && s.coins === 20);
s.coins = 2000;
buyDecor(s, 'fairy_lights');
check('one string over the lockers: the new one takes its place', isOn(s, 'fairy_lights') && !isOn(s, 'pennants') && owns(s, 'pennants'));
buyDecor(s, 'poster_fox'); buyDecor(s, 'poster_aurora');
check('two posters, one a door', isOn(s, 'poster_fox') && isOn(s, 'poster_aurora'));
const doors = placed(s).filter((p) => p.item.slot === 'poster').map((p) => [p.item.id, p.at.x]);
check('...the first on the left door, the second on the right', doors[0][0] === 'poster_fox' && doors[0][1] < doors[1][1], doors);
buyDecor(s, 'poster_retro');
check('...a third: the older one comes down', !isOn(s, 'poster_fox') && isOn(s, 'poster_aurora') && isOn(s, 'poster_retro'));
check('put away', takeDown(s, 'fairy_lights') && !isOn(s, 'fairy_lights') && owns(s, 'fairy_lights'));
check('...and up again', putUp(s, 'fairy_lights') && isOn(s, 'fairy_lights'));
check('only what you own goes up', !putUp(s, 'rug_rink') && !isOn(s, 'rug_rink'));
check('not every spot yet', !decorFull(s));
buyDecor(s, 'rug_fur'); buyDecor(s, 'pine'); buyDecor(s, 'plushie');
check('every spot filled', decorFull(s), decorOf(s).on);
check('...and where they go: a spot each', placed(s).every((p) => DECOR_SLOTS[p.item.slot].includes(p.at)) && placed(s).length === 6);
const moved = placed(s, { ...DECOR_SLOTS, rug: [{ x: 700, y: 620, w: 500 }] }).find((p) => p.item.slot === 'rug');
check('...moved where the art says', moved.at.x === 700);
check('the trophy for it', ACHIEVEMENTS.some((a) => a.id === 'home-sweet-home'));
check('the old spots of an item that went', (() => { const t = { decor: { owned: ['gone'], on: ['gone', 'pine'] } }; return placed(t).length === 1 && placed(t)[0].item === DECOR_BY_ID.pine; })());

console.log(`Decorations: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
