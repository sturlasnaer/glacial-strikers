// The locker room's pet: it starts sitting on the open floor, trots to spots on the floor and
// never off it, sits a while, now and then naps, wakes up and hops when tapped, and its name is
// cleaned (12 characters at most).
//   node tools/test_pet.mjs
import { newPet, stepPet, tapPet, tossPuck, cleanPetName, PET_AREA, PET_NAME_MAX, TRICK_TIME, FETCH_HOME, FETCH_DROP, PET_OUTFITS, buyOutfit, wearOutfit, ownsOutfit } from '../src/pet.js';
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

// tricks: tapped, it does one of those drawn now and then (else a hop), stays put through it,
// and doesn't start another mid-trick
{
  const q = newPet(makeRng(4));
  const seen = new Set();
  for (let i = 0; i < 40; i++) { tapPet(q, makeRng(i), ['spin', 'roll']); if (q.trick) seen.add(q.trick); else seen.add(q.hop > 0 ? 'hop' : '?'); for (let k = 0; k < 120; k++) stepPet(q, 1 / 60, makeRng(i)); }
  check('tricks and hops, both tricks', seen.has('spin') && seen.has('roll') && seen.has('hop') && !seen.has('?'), [...seen]);
  const r = newPet(makeRng(1)); r.state = 'walk'; r.tx = 30; r.ty = 70;
  tapPet(r, () => 0, ['five']);
  const x = r.x, tr = r.trick;
  for (let k = 0; k < 30; k++) stepPet(r, 1 / 60, makeRng(2));
  check('...a trick stops it and plays through', tr === 'five' && r.x === x && r.trickT > 0);
  tapPet(r, () => 0, ['spin']);
  check('...not another mid-trick', r.trick === 'five');
  for (let k = 0; k < 90; k++) stepPet(r, 1 / 60, makeRng(2));
  check('...then it carries on', r.trickT === 0 && r.trick === null);
  check('no tricks drawn: always a hop', (() => { const z = newPet(makeRng(3)); tapPet(z, () => 0, []); return !z.trick && z.hop > 0; })());
}

// outfits: bought once with coins and worn straight away, one at a time, taken off and on again
{
  const sv = { coins: 100 };
  check('three outfits to buy', PET_OUTFITS.length === 3 && PET_OUTFITS.every((o) => o.price > 0));
  check('not without the coins', !buyOutfit({ coins: 10 }, 'beanie'));
  check('bought: paid for and worn', buyOutfit(sv, 'scarf') && sv.coins === 40 && ownsOutfit(sv, 'scarf') && sv.pet.wear === 'scarf');
  check('...not twice', !buyOutfit(sv, 'scarf') && sv.coins === 40);
  sv.coins += 100;
  check('only one worn: the new one', buyOutfit(sv, 'bowtie') && sv.pet.wear === 'bowtie');
  check('taken off, and the old one put on again', wearOutfit(sv, null) && sv.pet.wear === null && wearOutfit(sv, 'scarf') && sv.pet.wear === 'scarf');
  check('not one it doesn\'t own', !wearOutfit(sv, 'beanie') && sv.pet.wear === 'scarf');
}

// fetch (Batch DI): runs to the puck, carries it back to the middle, drops it, then sits
{
  const rnd = makeRng(5), p = newPet(rnd);
  p.x = 40; p.y = 70;
  check('a toss starts a fetch', tossPuck(p, 65, 62) && p.fetch.phase === 'run' && p.state === 'fetch');
  check('one puck at a time', !tossPuck(p, 30, 70));
  let t = 0;
  while (p.fetch && p.fetch.phase === 'run' && t < 10) { stepPet(p, 0.05, rnd); t += 0.05; }
  check('runs to it and picks it up', p.fetch && p.fetch.phase === 'carry' && Math.abs(p.x - 65) < 0.01 && p.face === 1 && t < 2, t);
  tapPet(p, rnd, ['spin']);
  check('a tap meanwhile: busy fetching', !p.trick && !p.hop);
  while (p.fetch && p.fetch.phase === 'carry' && t < 20) { stepPet(p, 0.05, rnd); t += 0.05; }
  check('carries it back to the middle', p.fetch && p.fetch.phase === 'drop' && p.x === FETCH_HOME.x && p.y === FETCH_HOME.y && p.face === -1);
  for (let k = 0; k < FETCH_DROP / 0.05 + 2; k++) stepPet(p, 0.05, rnd);
  check('drops it and sits', !p.fetch && p.state === 'sit');
  const q = newPet(rnd);
  tossPuck(q, 99, 5);
  check('a toss off the floor lands on it', q.fetch.x === PET_AREA.x1 && q.fetch.y === PET_AREA.y0);
}

console.log(`Pet: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
