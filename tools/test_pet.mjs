// The locker room's pet: it starts sitting on the open floor, trots to spots on the floor and
// never off it, sits a while, now and then naps, wakes up and hops when tapped, and its name is
// cleaned (12 characters at most).
//   node tools/test_pet.mjs
import { newPet, stepPet, tapPet, cleanPetName, PET_AREA, PET_NAME_MAX } from '../src/pet.js';
import { makeRng } from '../src/util.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const inArea = (p) => p.x >= PET_AREA.x0 - 0.01 && p.x <= PET_AREA.x1 + 0.01 && p.y >= PET_AREA.y0 - 0.01 && p.y <= PET_AREA.y1 + 0.01;

const rnd = makeRng(7), p = newPet(rnd);
check('it starts sitting on the floor', p.state === 'sit' && inArea(p));
const seen = new Set();
let off = 0, facedLeft = false, facedRight = false;
for (let i = 0; i < 60 * 600; i++) { stepPet(p, 1 / 60, rnd); seen.add(p.state); if (!inArea(p)) off++; if (p.state === 'walk') { if (p.face < 0) facedLeft = true; else facedRight = true; } }
check('over ten minutes it walks, sits and naps', seen.has('walk') && seen.has('sit') && seen.has('sleep'), [...seen]);
check('...always on the floor', off === 0, off);
check('...facing the way it trots', facedLeft && facedRight);
while (p.state !== 'sleep') stepPet(p, 1 / 60, rnd);
tapPet(p);
check('tapped while asleep: awake and hopping', p.state === 'sit' && p.hop > 0);
const x = p.x, y = p.y;
for (let i = 0; i < 20; i++) stepPet(p, 1 / 60, rnd);
check('...staying put while it hops', p.x === x && p.y === y);
for (let i = 0; i < 60; i++) stepPet(p, 1 / 60, rnd);
check('...and the hop is over', p.hop === 0);
check('its name: cleaned, 12 characters at most', cleanPetName('  <Snjó>\n bolti  ') === 'Snjó bolti' && cleanPetName('x'.repeat(40)).length === PET_NAME_MAX && cleanPetName('') === '');

console.log(`Pet: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
