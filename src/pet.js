// The locker room's pet (Batch CX): a Snow Fox cub that trots about the floor, sits and wags,
// now and then curls up for a nap, hops when it's tapped and fetches a puck tossed on the floor.
// Positions are in % of the room.
// rnd: () => [0, 1) (the menus' own randomness; nothing here touches a match).

export const PET_AREA = { x0: 28, x1: 70, y0: 60, y1: 80 }; // (the open floor in front of the lockers)
export const PET_SPEED = 7; // % of the room a second
export const PET_NAME_MAX = 12;

export function newPet(rnd = Math.random) {
  return { x: 48 + rnd() * 8, y: 72, tx: 0, ty: 0, state: 'sit', t: 0, until: 1.5 + rnd() * 2, face: 1, hop: 0 };
}

const walkTo = (p, rnd) => {
  p.state = 'walk'; p.t = 0;
  p.tx = PET_AREA.x0 + rnd() * (PET_AREA.x1 - PET_AREA.x0);
  p.ty = PET_AREA.y0 + rnd() * (PET_AREA.y1 - PET_AREA.y0);
};

export const TRICK_TIME = 1.3;

export function stepPet(p, dt, rnd = Math.random) {
  p.t += dt;
  if (p.trickT > 0) { p.trickT = Math.max(0, p.trickT - dt); if (!p.trickT) p.trick = null; return p; }
  if (p.fetch) return stepFetch(p, dt, rnd);
  if (p.ball) rollBall(p.ball, dt);
  if (p.state === 'play') { // (batting its ball about: Batch DO)
    if (p.t >= PLAY_TIME * 0.6 && !p.batted) { p.batted = true; p.ball.v = p.face * (10 + rnd() * 8); }
    if (p.t >= PLAY_TIME) { p.state = 'sit'; p.t = 0; p.until = 2 + rnd() * 3; }
    return p;
  }
  if (p.hop > 0) { p.hop = Math.max(0, p.hop - dt); return p; }
  if (p.state === 'walk' || p.state === 'tobed' || p.state === 'toball') {
    if (p.state === 'toball') { p.tx = p.ball.x - 5 * (p.ball.x >= p.x ? 1 : -1); p.ty = p.ball.y; } // (up to it, from its side)
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = PET_SPEED * dt;
    if (dx) p.face = dx > 0 ? 1 : -1;
    if (d <= v && p.state === 'toball') { p.x = p.tx; p.y = p.ty; p.face = p.ball.x >= p.x ? 1 : -1; p.state = 'play'; p.t = 0; p.batted = false; }
    else if (d <= v && p.state === 'tobed') { p.x = p.tx; p.y = p.ty; p.state = 'sleep'; p.inBed = true; p.t = 0; p.until = 8 + rnd() * 8; } // (a longer nap in its own bed)
    else if (d <= v) { p.x = p.tx; p.y = p.ty; p.state = 'sit'; p.t = 0; p.until = 2 + rnd() * 4; }
    else { p.x += (dx / d) * v; p.y += (dy / d) * v; }
  } else if (p.t >= p.until) {
    if (p.state === 'sit' && rnd() < 0.25) {
      if (p.bed) { p.state = 'tobed'; p.tx = p.bed.x; p.ty = p.bed.y; p.t = 0; } // (off to its basket for the nap: Batch DL)
      else { p.state = 'sleep'; p.t = 0; p.until = 6 + rnd() * 6; }
    } else if (p.ball && p.state === 'sit' && rnd() < 0.35) { p.inBed = false; p.state = 'toball'; p.t = 0; } // (off to play with its ball)
    else { p.inBed = false; walkTo(p, rnd); }
  }
  return p;
}

// Tapped: a happy hop, or now and then one of its tricks (those drawn: Batch DC), and awake again.
export function tapPet(p, rnd = Math.random, tricks = []) {
  if (p.trickT > 0 || p.fetch) return p;
  if (tricks.length && rnd() < 0.6) { p.trick = tricks[Math.floor(rnd() * tricks.length)]; p.trickT = TRICK_TIME; }
  else p.hop = 0.5;
  if (p.state === 'sleep' || p.state === 'walk' || p.state === 'tobed' || p.state === 'toball' || p.state === 'play') { p.state = 'sit'; p.t = 0; p.until = 1.5; p.inBed = false; }
  return p;
}

// Fetch (Batch DI): a puck tossed onto the floor; the cub runs for it, trots back to the middle
// of the room with it and drops it there, pleased with itself. fetch: { x, y, phase, t } with
// the puck at x, y (in its mouth while it carries it).
export const FETCH_RUN = 18, FETCH_CARRY = 9, FETCH_DROP = 1.4; // (% of the room a second; the drop's seconds)
export const FETCH_HOME = { x: 50, y: 72 };
export function tossPuck(p, x, y) {
  if (p.fetch || p.trickT > 0) return false;
  const A = PET_AREA;
  p.fetch = { x: Math.min(A.x1, Math.max(A.x0, x)), y: Math.min(A.y1, Math.max(A.y0, y)), phase: 'run', t: 0 };
  p.state = 'fetch'; p.hop = 0; p.inBed = false;
  return true;
}
function stepFetch(p, dt, rnd) {
  const f = p.fetch;
  f.t += dt;
  if (f.phase === 'drop') {
    if (f.t >= FETCH_DROP) { p.fetch = null; p.state = 'sit'; p.t = 0; p.until = 2 + rnd() * 3; }
    return p;
  }
  const [tx, ty, v] = f.phase === 'run' ? [f.x, f.y, FETCH_RUN] : [FETCH_HOME.x, FETCH_HOME.y, FETCH_CARRY];
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = v * dt;
  if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
  if (d > step) { p.x += (dx / d) * step; p.y += (dy / d) * step; return p; }
  p.x = tx; p.y = ty;
  if (f.phase === 'run') { f.phase = 'carry'; f.t = 0; }
  else { f.phase = 'drop'; f.t = 0; f.x = p.x + p.face * 4; f.y = p.y; } // (set down in front of it)
  return p;
}

export const cleanPetName = (s) => String(s || '').replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, PET_NAME_MAX);

// Outfits for the cub (Shop › Locker room, Batch DA): bought once, one worn at a time (none while
// it's in a seasonal costume).
export const PET_OUTFITS = [
  { id: 'scarf', name: 'Striped scarf', price: 60 },
  { id: 'beanie', name: 'Bobble hat', price: 70 },
  { id: 'bowtie', name: 'Bow tie', price: 50 },
];
export const petOf = (save) => (save.pet ||= {});
export const ownsOutfit = (save, id) => (petOf(save).outfits || []).includes(id);
export function buyOutfit(save, id) {
  const o = PET_OUTFITS.find((x) => x.id === id);
  if (!o || ownsOutfit(save, id) || (save.coins || 0) < o.price) return false;
  save.coins -= o.price;
  const P = petOf(save);
  (P.outfits ||= []).push(id);
  P.wear = id;
  return true;
}
export function wearOutfit(save, id) {
  if (id !== null && !ownsOutfit(save, id)) return false;
  petOf(save).wear = id;
  return true;
}

// A basket of its own (Shop › Locker room › For the cub, Batch DL): bought once, it stands in the
// room and the cub naps in it (p.bed: where, in % of the room, set by the room).
export const PET_BED = { id: 'bed', name: 'Cosy basket', price: 80 };
export const ownsBed = (save) => !!petOf(save).bed;
export function buyBed(save) {
  if (ownsBed(save) || (save.coins || 0) < PET_BED.price) return false;
  save.coins -= PET_BED.price;
  petOf(save).bed = true;
  return true;
}

// A ball (Shop › Locker room › For the cub, Batch DO): bought once, it lies on the floor and the
// cub now and then goes to play with it: crouch, wiggle, pounce, and a bat that sends it rolling
// (p.ball: { x, y, v } in % of the room, set by the room).
export const PET_BALL = { id: 'ball', name: 'Striped ball', price: 40 };
export const PLAY_TIME = 2.2;
export const ownsBall = (save) => !!petOf(save).ball;
export function buyBall(save) {
  if (ownsBall(save) || (save.coins || 0) < PET_BALL.price) return false;
  save.coins -= PET_BALL.price;
  petOf(save).ball = true;
  return true;
}
function rollBall(b, dt) {
  if (!b.v) return;
  b.x += b.v * dt;
  if (b.x < PET_AREA.x0 || b.x > PET_AREA.x1) { b.x = Math.min(PET_AREA.x1, Math.max(PET_AREA.x0, b.x)); b.v = -b.v * 0.5; } // (off the edge of the floor: back it comes)
  b.v *= Math.exp(-1.8 * dt);
  if (Math.abs(b.v) < 0.3) b.v = 0;
}


// ---------------------------------------------------------------- the pet collection
// Every club's mascot has a little one, and beat a club three times (any game: league,
// playoffs, Quick play) and they send it to the Foxes' locker room as a gift. Snowball the
// Snow Fox cub is there from the start. Up to ROOM_MAX of them wander the room; the rest wait
// in the pet house (Shop › Locker room), and they swap at will. A pet comes once its art is in
// (Batches EH to EM: pets/<kind>/walk_1.., on the `pets` pages). Their names are the player's.
export const PET_WINS = 3;
export const ROOM_MAX = 4;
export const PET_KINDS = [
  { id: 'fox', team: 'home', name: 'Snow Fox cub', pet: 'Snowball' },
  { id: 'lynx', team: 'lynx', name: 'Lynx kitten', pet: 'Whiskers' },
  { id: 'salamander', team: 'comets', name: 'Fire salamander', pet: 'Ember' },
  { id: 'owlet', team: 'owls', name: 'Snowy owlet', pet: 'Hoot' },
  { id: 'lamb', team: 'rams', name: 'Golden lamb', pet: 'Nugget' },
  { id: 'moose', team: 'moose', name: 'Moose calf', pet: 'Twig' },
  { id: 'raven', team: 'ravens', name: 'Raven chick', pet: 'Inky' },
  { id: 'polar', team: 'royals', name: 'Polar bear cub', pet: 'Frosty' },
  { id: 'capybara', team: 'capybaras', name: 'Capybara pup', pet: 'Mochi' },
  { id: 'beaver', team: 'beavers', name: 'Beaver kit', pet: 'Toothy' },
  { id: 'puffling', team: 'puffins', name: 'Puffling', pet: 'Skipper' },
  { id: 'bear', team: 'grizzlies', name: 'Grizzly cub', pet: 'Bumble' },
  { id: 'seal', team: 'seals', name: 'Seal pup', pet: 'Bubbles' },
  { id: 'flamingo', team: 'flamingos', name: 'Flamingo chick', pet: 'Pinky' },
  { id: 'penguin', team: 'penguins', name: 'Penguin chick', pet: 'Waddles' },
  { id: 'bull', team: 'bulls', name: 'Bull calf', pet: 'Chili' },
  { id: 'narwhal', team: 'narwhals', name: 'Narwhal calf', pet: 'Sprinkle' },
  { id: 'tiger', team: 'tigers', name: 'Tiger cub', pet: 'Marmalade' },
  { id: 'panda', team: 'pandas', name: 'Panda cub', pet: 'Patches' },
];
export const PET_KIND = Object.fromEntries(PET_KINDS.map((k) => [k.id, k]));
// The art a pet needs to wander the room (Snowball's are pet/…, the others' pets/<kind>/…).
export const petDir = (kind) => (kind === 'fox' ? 'pet/' : `pets/${kind}/`);
export const PET_FRAMES = ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'sit_1', 'sit_2', 'sleep_1', 'sleep_2', 'hop'];
export const petIcon = (kind) => (kind === 'fox' ? 'icons/pet' : `icons/pet_${kind}`);

export const petsOf = (save) => (save.pets ||= { got: {}, away: [] });
// Every pet the club has, in the collection's order (Snowball first).
export const ownedPets = (save) => PET_KINDS.filter((k) => k.id === 'fox' || petsOf(save).got[k.id]).map((k) => k.id);
// The ones in the room (ROOM_MAX at most), and those in the pet house.
export const roomPets = (save) => ownedPets(save).filter((id) => !petsOf(save).away.includes(id)).slice(0, ROOM_MAX);
export const housePets = (save) => { const room = roomPets(save); return ownedPets(save).filter((id) => !room.includes(id)); };
// Gifts due: pets whose club we've beaten often enough, not yet ours, with their art in (has).
export const winsAgainst = (save, team) => (save.rivals && save.rivals[team] && save.rivals[team].wins) || 0;
export const petsDue = (save, has = () => true) => PET_KINDS.filter((k) => k.id !== 'fox' && !petsOf(save).got[k.id] && winsAgainst(save, k.team) >= PET_WINS && has(k.id)).map((k) => k.id);
// A gift arrives: into the room if there's space, the pet house if not. 'room' | 'house' | null.
export function adoptPet(save, kind) {
  if (!PET_KIND[kind] || kind === 'fox' || petsOf(save).got[kind]) return null;
  const full = roomPets(save).length >= ROOM_MAX;
  const P = petsOf(save);
  P.got[kind] = { name: '', season: save.season || 1 };
  if (full) P.away.push(kind);
  return full ? 'house' : 'room';
}
// To the pet house and back (the room has ROOM_MAX places).
export function sendToHouse(save, kind) {
  const P = petsOf(save);
  if (!ownedPets(save).includes(kind) || P.away.includes(kind)) return false;
  P.away.push(kind);
  return true;
}
export function bringToRoom(save, kind) {
  const P = petsOf(save);
  if (!P.away.includes(kind) || roomPets(save).length >= ROOM_MAX) return false;
  P.away = P.away.filter((k) => k !== kind);
  return true;
}
// A pet's name: the player's, or the one it came with (Snowball's lives in save.pet).
export const petNameOf = (save, kind, tr = (x) => x) => (kind === 'fox' ? (save.pet && save.pet.name) : petsOf(save).got[kind] && petsOf(save).got[kind].name) || tr(PET_KIND[kind].pet);
export function renamePet(save, kind, name) {
  const n = cleanPetName(name);
  if (kind === 'fox') { petOf(save).name = n; return true; }
  const g = petsOf(save).got[kind];
  if (!g) return false;
  g.name = n;
  return true;
}
