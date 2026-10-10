// Locker room decorations (Shop › Locker room): bought once, each shows in its own spot in the
// room: a string over the lockers, posters on two locker doors, a rug under the team, a piece
// in the front corner and something on the bench. One item a spot (two posters), swapped or
// put away at will. Items show in the Shop once their art is in (Batch CS).

export const DECOR = [
  { id: 'pennants', slot: 'banner', name: 'Pennant string', price: 80, frames: ['decor/banner_pennants'] },
  { id: 'fairy_lights', slot: 'banner', name: 'Fairy lights', price: 140, frames: ['decor/banner_lights_1', 'decor/banner_lights_2'] },
  { id: 'snowflakes', slot: 'banner', name: 'Paper snowflakes', price: 90, frames: ['decor/banner_snowflakes'] },
  { id: 'poster_fox', slot: 'poster', name: 'Snow Fox poster', price: 60, frames: ['decor/poster_fox'] },
  { id: 'poster_aurora', slot: 'poster', name: 'Aurora poster', price: 60, frames: ['decor/poster_aurora'] },
  { id: 'poster_legends', slot: 'poster', name: 'Legends poster', price: 120, frames: ['decor/poster_legends'] },
  { id: 'poster_retro', slot: 'poster', name: 'Old team photo', price: 80, frames: ['decor/poster_retro'] },
  { id: 'rug_crest', slot: 'rug', name: 'Crest rug', price: 160, frames: ['decor/rug_crest'] },
  { id: 'rug_rink', slot: 'rug', name: 'Rink rug', price: 180, frames: ['decor/rug_rink'] },
  { id: 'rug_fur', slot: 'rug', name: 'Fluffy rug', price: 140, frames: ['decor/rug_fur'] },
  { id: 'pine', slot: 'corner', name: 'Little pine', price: 100, frames: ['decor/corner_pine'] },
  { id: 'fridge', slot: 'corner', name: 'Drinks cooler', price: 150, frames: ['decor/corner_fridge'] },
  { id: 'sculpture', slot: 'corner', name: 'Ice fox sculpture', price: 220, frames: ['decor/corner_sculpture'] },
  { id: 'arcade', slot: 'corner', name: 'Arcade cabinet', price: 260, frames: ['decor/corner_arcade_1', 'decor/corner_arcade_2'] },
  { id: 'boombox', slot: 'bench', name: 'Boombox', price: 120, frames: ['decor/bench_boombox_1', 'decor/bench_boombox_2'] },
  { id: 'plushie', slot: 'bench', name: 'Snow fox plushie', price: 70, frames: ['decor/bench_plushie'] },
];
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]));
export const SLOT_NAMES = { banner: 'Over the lockers', poster: 'On the locker doors', rug: 'On the floor', corner: 'In the corner', bench: 'On the bench' };
export const SLOTS_OF = { banner: 1, poster: 2, rug: 1, corner: 1, bench: 1 };

// Where each spot is in the room (room pixels, 1536×864) and how big an item there is drawn:
// h is the height, w a width to fit (the frame's height follows), anchor where its pivot goes.
export const DECOR_SLOTS = {
  banner: [{ x: 760, y: 18, w: 860 }],
  poster: [{ x: 330, y: 125, h: 110 }, { x: 1095, y: 125, h: 110 }],
  rug: [{ x: 735, y: 610, w: 560 }],
  corner: [{ x: 1330, y: 790, h: 200 }],
  bench: [{ x: 857, y: 680, h: 90 }],
};

export function decorOf(save) {
  return (save.decor ||= { owned: [], on: [] }); // on: ids in the room, oldest first
}

export const owns = (save, id) => decorOf(save).owned.includes(id);
export const isOn = (save, id) => decorOf(save).on.includes(id);

// Buy an item (and put it up). Returns false if it can't be.
export function buyDecor(save, id) {
  const d = DECOR_BY_ID[id];
  if (!d || owns(save, id) || (save.coins || 0) < d.price) return false;
  save.coins -= d.price;
  decorOf(save).owned.push(id);
  putUp(save, id);
  return true;
}

// Put an owned item up: whatever had its spot comes down (with two posters, the older one).
export function putUp(save, id) {
  const d = DECOR_BY_ID[id], D = decorOf(save);
  if (!d || !owns(save, id) || isOn(save, id)) return false;
  const same = D.on.filter((k) => DECOR_BY_ID[k] && DECOR_BY_ID[k].slot === d.slot);
  if (same.length >= SLOTS_OF[d.slot]) D.on.splice(D.on.indexOf(same[0]), 1);
  D.on.push(id);
  return true;
}

export function takeDown(save, id) {
  const D = decorOf(save), i = D.on.indexOf(id);
  if (i < 0) return false;
  D.on.splice(i, 1);
  return true;
}

// Every spot in the room has something in it (both locker doors a poster).
export const decorFull = (save) => Object.entries(SLOTS_OF).every(([slot, n]) => decorOf(save).on.filter((k) => DECOR_BY_ID[k] && DECOR_BY_ID[k].slot === slot).length >= n);

// What's up in the room and where: [{ item, at }] (the posters on the left door first).
export function placed(save, slots = DECOR_SLOTS) {
  const out = [], used = {};
  for (const id of decorOf(save).on) {
    const d = DECOR_BY_ID[id];
    if (!d) continue;
    const n = used[d.slot] = (used[d.slot] ?? -1) + 1;
    const spots = slots[d.slot] || DECOR_SLOTS[d.slot];
    out.push({ item: d, at: spots[Math.min(n, spots.length - 1)] });
  }
  return out;
}
