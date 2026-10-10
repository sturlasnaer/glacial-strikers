// The sticker album: a page a club and one for the legends (34 stickers, numbered in order,
// the mascots at the ends of their pages once drawn), two packs to start it, three different
// stickers a pack with the first always a new one (so it fills in 34 packs at most), doubles
// swapped for coins, a full page and the whole album paid once, and the same luck for the same
// rolls.
//   node tools/test_album.mjs
import { albumPages, albumOf, startAlbum, addPacks, openPack, progress, pageFull, PACK_SIZE, DOUBLE_COINS, PAGE_COINS, ALBUM_COINS, STARTER_PACKS } from '../src/album.js';
import { ACHIEVEMENTS } from '../src/achievements.js';
import { makeRng } from '../src/util.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const fresh = () => ({ coins: 0 });

const pages = albumPages();
const all = pages.flatMap((p) => p.stickers);
check('nine pages: our club, the seven rivals and the legends', pages.length === 9 && pages[0].team === 'home' && pages.at(-1).id === 'legends', pages.map((p) => p.id));
check('...34 stickers, four a club and two legends', all.length === 34 && pages.slice(0, 8).every((p) => p.stickers.length === 4) && pages[8].stickers.length === 2);
check('...numbered 1 to 34 in order, every one different', all.every((s, i) => s.n === i + 1) && new Set(all.map((s) => s.id)).size === 34);
check('...each with a name', all.every((s) => typeof s.name === 'string' && s.name.length > 0));
const withMascots = albumPages(() => true);
check('the mascots at the ends of their pages once drawn', withMascots.flatMap((p) => p.stickers).length === 42 && withMascots.slice(0, 8).every((p) => p.stickers.at(-1).kind === 'mascot') && withMascots.flatMap((p) => p.stickers).every((s, i) => s.n === i + 1));

// starting it
{
  const s = fresh();
  check('no packs, no pack', openPack(s, pages) === null);
  check('the album starts with two packs', startAlbum(s) && albumOf(s).packs === STARTER_PACKS);
  check('...once', !startAlbum(s) && albumOf(s).packs === STARTER_PACKS);
}

// a pack
{
  const s = fresh(); startAlbum(s);
  const r = openPack(s, pages, makeRng(1));
  check('three stickers, all different', r.stickers.length === PACK_SIZE && new Set(r.stickers.map((x) => x.sticker.id)).size === PACK_SIZE);
  check('...the first a new one, and a pack used', r.stickers[0].isNew && albumOf(s).packs === STARTER_PACKS - 1 && albumOf(s).opened === 1);
  check('...stuck in', r.stickers.every((x) => albumOf(s).got[x.sticker.id] >= 1) && progress(s, pages).got >= 1);
  const a = fresh(), b = fresh(); addPacks(a, 5); addPacks(b, 5);
  const ra = [], rb = [], ga = makeRng(9), gb = makeRng(9);
  for (let i = 0; i < 5; i++) { ra.push(openPack(a, pages, ga).stickers.map((x) => x.sticker.id + (x.foil ? '*' : ''))); rb.push(openPack(b, pages, gb).stickers.map((x) => x.sticker.id + (x.foil ? '*' : ''))); }
  check('the same rolls, the same stickers', JSON.stringify(ra) === JSON.stringify(rb));
}

// doubles and the payouts
{
  const s = fresh();
  const a = albumOf(s);
  for (const st of all) a.got[st.id] = 1; // (all but one page's last sticker)
  const last = pages[2].stickers[3];
  delete a.got[last.id];
  a.packs = 1;
  const coins0 = s.coins;
  const r = openPack(s, pages, () => 0.99); // (no foil)
  check('the last one: new, the other two doubles', r.stickers[0].sticker === last && r.stickers[0].isNew && r.stickers.slice(1).every((x) => !x.isNew && x.coins === DOUBLE_COINS));
  check('...its page and then the album are done, every page counted', r.pages.length === pages.length && r.full && a.full);
  check('...paid: the doubles, every page and the album', s.coins - coins0 === 2 * DOUBLE_COINS + pages.length * PAGE_COINS + ALBUM_COINS, s.coins - coins0);
  a.packs = 1;
  const r2 = openPack(s, pages, () => 0.99);
  check('...and only once', !r2.full && !r2.pages.length && r2.coins === PACK_SIZE * DOUBLE_COINS, r2.coins);
  a.packs = 1;
  const r3 = openPack(s, pages, () => 0.01); // (all foil)
  check('a first shiny one is kept, not swapped', r3.stickers.every((x) => x.foil && x.newFoil && x.coins === 0) && r3.stickers.every((x) => a.foil[x.sticker.id]));
}

// it fills: never more than 34 packs, and the legends turn up less often
{
  let most = 0, legends = 0, draws = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const s = fresh(), rng = makeRng(seed);
    let n = 0;
    while (!albumOf(s).full && n < 100) { addPacks(s, 1); const r = openPack(s, pages, rng); n++; for (const x of r.stickers) { draws++; if (x.sticker.kind === 'legend') legends++; } }
    most = Math.max(most, n);
    if (!pages.every((p) => pageFull(s, p))) most = 999;
  }
  check('the album fills in 34 packs at most', most <= 34, most);
  check('...the legends turn up less often than the others', legends / draws < 2 / 34, [legends, draws]);
}

check('trophies for a page and the whole album', ['sticker-page', 'sticker-album'].every((id) => ACHIEVEMENTS.some((a) => a.id === id)));

console.log(`Sticker album: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
