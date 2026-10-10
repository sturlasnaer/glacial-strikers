// The locker room's pet: it starts sitting on the open floor, trots to spots on the floor and
// never off it, sits a while, now and then naps, wakes up and hops when tapped, and its name is
// cleaned (12 characters at most).
//   node tools/test_pet.mjs
// (and the collection: every club's pet, the room and the pet house)
import { newPet, stepPet, tapPet, tossPuck, cleanPetName, PET_AREA, PET_NAME_MAX, TRICK_TIME, FETCH_HOME, FETCH_DROP, PET_BED, ownsBed, buyBed, PET_BALL, PLAY_TIME, ownsBall, buyBall, PET_OUTFITS, buyOutfit, wearOutfit, ownsOutfit, PET_KINDS, PET_FRAMES, PET_WINS, ROOM_MAX, petDir, petIcon, ownedPets, roomPets, housePets, petsDue, adoptPet, sendToHouse, bringToRoom, petNameOf, renamePet, winsAgainst } from '../src/pet.js';
import { TEAMS } from '../src/data.js';
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

// its basket (Batch DL): bought once; with it in the room, the cub walks to it for its naps
{
  const save = { coins: 100 };
  check('the basket: bought once', buyBed(save) && ownsBed(save) && save.coins === 100 - PET_BED.price && !buyBed(save));
  check('not without the coins', !buyBed({ coins: 10 }));
  const rnd = makeRng(9), p = newPet(rnd);
  p.bed = { x: 62, y: 66 };
  let t = 0, went = false;
  while (t < 120 && !(p.state === 'sleep' && p.inBed)) { stepPet(p, 0.1, rnd); t += 0.1; if (p.state === 'tobed') went = true; }
  check('off to its basket for a nap', went && p.inBed && p.x === 62 && p.y === 66, t);
  tapPet(p, rnd, []);
  check('a tap wakes it, out of the basket', !p.inBed && p.state === 'sit');
  const q = newPet(makeRng(9));
  let slept = false;
  for (let k = 0; k < 1200; k++) { stepPet(q, 0.1, rnd); if (q.state === 'sleep') { slept = true; break; } }
  check('without one: a nap on the floor, as before', slept && !q.inBed);
}

// its ball (Batch DO): bought once; the cub goes to it, pounces, and the bat sends it rolling
{
  const save = { coins: 50 };
  check('the ball: bought once', buyBall(save) && ownsBall(save) && save.coins === 50 - PET_BALL.price && !buyBall(save));
  const rnd = makeRng(3), p = newPet(rnd);
  p.ball = { x: 60, y: 74, v: 0 };
  let t = 0, went = false, played = false, rolled = false;
  while (t < 200 && !rolled) {
    stepPet(p, 0.1, rnd); t += 0.1;
    if (p.state === 'toball') went = true;
    if (p.state === 'play') played = true;
    if (p.ball.v) rolled = true;
  }
  check('it goes to its ball, plays, and bats it away', went && played && rolled, t);
  for (let k = 0; k < 100; k++) stepPet(p, 0.1, rnd);
  check('the ball rolls to a stop on the floor', p.ball.v === 0 && p.ball.x >= 28 && p.ball.x <= 70);
  const q = newPet(makeRng(3));
  q.ball = { x: 60, y: 74, v: 0 }; q.state = 'toball';
  tapPet(q, rnd, []);
  check('a tap on the way: it sits for you', q.state === 'sit');
}

// the collection: a club's pet after three wins against it (once its art is in), four in the
// room at most and the rest in the pet house, swapped about, named
{
  const sv = { season: 2, rivals: { lynx: { wins: 3 }, owls: { wins: 2 }, comets: { wins: 4 }, rams: { wins: 3 }, moose: { wins: 7 }, ravens: { wins: 3 } } };
  check('nineteen pets: Snowball and one from each club', PET_KINDS.length === 19 && PET_KINDS[0].id === 'fox' && new Set(PET_KINDS.map((k) => k.team)).size === 19 && PET_KINDS.every((k) => k.name && k.pet && (k.team === 'home' || TEAMS[k.team])));
  check('a new save: Snowball alone, in the room', ownedPets({}).join() === 'fox' && roomPets({}).join() === 'fox' && housePets({}).length === 0);
  check('gifts due: three wins (not two), and only with their art', petsDue(sv).join() === 'lynx,salamander,lamb,moose,raven' && petsDue(sv, (k) => k !== 'lamb').join() === 'lynx,salamander,moose,raven');
  const where = petsDue(sv).map((k) => adoptPet(sv, k));
  check('into the room until it\'s full, then the pet house', where.join() === 'room,room,room,house,house' && roomPets(sv).length === ROOM_MAX && housePets(sv).join() === 'moose,raven', where);
  check('no gift twice, none due now', adoptPet(sv, 'lynx') === null && petsDue(sv).length === 0 && adoptPet(sv, 'fox') === null);
  check('the room full: nobody comes in', !bringToRoom(sv, 'moose'));
  check('Snowball to the pet house, the moose calf in', sendToHouse(sv, 'fox') && bringToRoom(sv, 'moose') && roomPets(sv).join() === 'lynx,salamander,lamb,moose' && housePets(sv).join() === 'fox,raven');
  check('not twice to the pet house, nor one we haven\'t got', !sendToHouse(sv, 'fox') && !sendToHouse(sv, 'penguin') && !bringToRoom(sv, 'penguin'));
  check('their names: the one they came with, then ours', petNameOf(sv, 'lamb') === 'Nugget' && renamePet(sv, 'lamb', '  Goldie<> ') && petNameOf(sv, 'lamb') === 'Goldie' && !renamePet(sv, 'penguin', 'X'));
  check('Snowball\'s name where it always was', renamePet(sv, 'fox', 'Fluff') && sv.pet.name === 'Fluff' && petNameOf(sv, 'fox') === 'Fluff' && petNameOf({}, 'fox', (x) => x + '!') === 'Snowball!');
  check('its art: Snowball\'s own, the others\' by kind', petDir('fox') === 'pet/' && petDir('seal') === 'pets/seal/' && petIcon('fox') === 'icons/pet' && petIcon('seal') === 'icons/pet_seal' && PET_FRAMES.length === 9);
  check('wins counted from the rivals\' record', winsAgainst(sv, 'moose') === 7 && winsAgainst(sv, 'narwhals') === 0 && PET_WINS === 3);
}

console.log(`Pet: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
