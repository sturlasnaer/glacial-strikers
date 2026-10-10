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
  if (p.hop > 0) { p.hop = Math.max(0, p.hop - dt); return p; }
  if (p.state === 'walk') {
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = PET_SPEED * dt;
    if (dx) p.face = dx > 0 ? 1 : -1;
    if (d <= v) { p.x = p.tx; p.y = p.ty; p.state = 'sit'; p.t = 0; p.until = 2 + rnd() * 4; }
    else { p.x += (dx / d) * v; p.y += (dy / d) * v; }
  } else if (p.t >= p.until) {
    if (p.state === 'sit' && rnd() < 0.25) { p.state = 'sleep'; p.t = 0; p.until = 6 + rnd() * 6; }
    else walkTo(p, rnd);
  }
  return p;
}

// Tapped: a happy hop, or now and then one of its tricks (those drawn: Batch DC), and awake again.
export function tapPet(p, rnd = Math.random, tricks = []) {
  if (p.trickT > 0 || p.fetch) return p;
  if (tricks.length && rnd() < 0.6) { p.trick = tricks[Math.floor(rnd() * tricks.length)]; p.trickT = TRICK_TIME; }
  else p.hop = 0.5;
  if (p.state === 'sleep' || p.state === 'walk') { p.state = 'sit'; p.t = 0; p.until = 1.5; }
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
  p.state = 'fetch'; p.hop = 0;
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
