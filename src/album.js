// The sticker album (Trophies › Sticker album): a sticker for everyone in the league, a page a
// club and one for the legends, collected from packs. A pack comes with every match (two for
// a win) and with the daily challenge, and two to start the album. Three stickers a pack: the
// first is always one you haven't got (so the youngest players get there), now and then one is
// a shiny foil, and a double is swapped for coins. A full page pays out, the whole album more.
// Each club's mascot joins the end of its page once its sticker is drawn (Batch CR). The
// National and Elite clubs' pages come after the legends, once the club has gone up to meet
// them (or played them), so the numbers before them stay put.
import { CHARACTERS, RECRUITS, GOALIE_RECRUITS, LEGENDS, RIVAL_IDS, NATIONAL_IDS, ELITE_OWN_IDS, TEAMS, recruitKey, CAREER } from './data.js';
import { tierOf } from './tiers.js';

export const PACK_SIZE = 3, FOIL_CHANCE = 0.1, DOUBLE_COINS = 10, PAGE_COINS = 150, ALBUM_COINS = 600, STARTER_PACKS = 2;
export const LEGEND_WEIGHT = 0.3; // (legends turn up less often)
const KITS = ['frost', 'thunder', 'stone'];

// The pages, in album order, each sticker numbered: { id, team, stickers: [{ id, n, kind, key,
// team, kit, name }] }. kind: skater, goalie, legend or mascot.
export function albumPages(hasMascot = () => false, open = () => false) {
  const pages = [];
  const club = (team, stickers) => {
    if (hasMascot(team)) stickers.push({ id: `${team}_mascot`, kind: 'mascot', key: team, team, name: 'Mascot' });
    pages.push({ id: team, team, stickers });
  };
  if (CAREER.team) { // (a career as another club: its stars and goalie, the cast on the Foxes' page)
    const g = GOALIE_RECRUITS[`${CAREER.team}_g`];
    club('home', [...KITS.map((kit) => { const k = recruitKey(CAREER.team, kit); return { id: k, kind: 'skater', key: k, team: 'home', kit, name: RECRUITS[k].name }; }),
      { id: g.key, kind: 'goalie', key: g.key, team: 'home', kit: 'goalie', name: g.name }]);
  } else club('home', [...KITS.map((kit) => ({ id: `home_${kit}`, kind: 'skater', key: kit, team: 'home', kit, name: CHARACTERS[kit].name })),
    { id: 'home_g', kind: 'goalie', key: 'halla', team: 'home', kit: 'goalie', name: 'Halla' }]);
  const clubPage = (tid) => {
    const g = GOALIE_RECRUITS[`${tid}_g`];
    club(tid, [...KITS.map((kit) => { const k = recruitKey(tid, kit); return { id: k, kind: 'skater', key: k, team: tid, kit, name: RECRUITS[k].name }; }),
      { id: g.key, kind: 'goalie', key: g.key, team: tid, kit: 'goalie', name: g.name }]);
  };
  for (const tid of RIVAL_IDS) clubPage(tid);
  pages.push({ id: 'legends', team: null, stickers: Object.values(LEGENDS).map((L) => ({ id: L.key, kind: 'legend', key: L.key, team: null, kit: L.kit, name: L.name })) });
  for (const tid of [...NATIONAL_IDS, ...ELITE_OWN_IDS].filter(open)) clubPage(tid);
  let n = 0;
  for (const p of pages) for (const s of p.stickers) s.n = ++n;
  return pages;
}

export function albumOf(save) {
  return (save.album ||= { got: {}, foil: {}, packs: 0, opened: 0, done: [], full: false, started: false });
}

export function addPacks(save, n) {
  if (n > 0) albumOf(save).packs += n;
}

// A National or Elite club's page is in the album once the club has been up to that division
// (or played them); the Frostline's always are.
export function albumClubOpen(save, tid) {
  const t = TEAMS[tid], need = t && t.elite ? 2 : t && t.national ? 1 : 0;
  return Math.max(tierOf(save), (save && save.tierTop) || 0) >= need || !!(save && save.rivals && save.rivals[tid] && save.rivals[tid].played);
}

// The first look: the album and the packs to start it.
export function startAlbum(save) {
  const a = albumOf(save);
  if (a.started) return false;
  a.started = true;
  a.packs += STARTER_PACKS;
  return true;
}

export function progress(save, pages) {
  const a = albumOf(save), all = pages.flatMap((p) => p.stickers);
  return { got: all.filter((s) => a.got[s.id]).length, total: all.length, foil: all.filter((s) => a.foil[s.id]).length };
}

export const pageFull = (save, page) => page.stickers.every((s) => albumOf(save).got[s.id]);

// Open a pack: { stickers: [{ sticker, isNew, foil, newFoil, coins }], pages: [page ids just
// filled], full (the album just filled), coins }, applied to the save. rng: () => [0, 1).
export function openPack(save, pages, rng = Math.random) {
  const a = albumOf(save);
  if (a.packs <= 0) return null;
  a.packs--; a.opened++;
  const all = pages.flatMap((p) => p.stickers);
  const weight = (s) => (s.kind === 'legend' ? LEGEND_WEIGHT : 1);
  const pick = (list) => {
    const total = list.reduce((n, s) => n + weight(s), 0);
    let r = rng() * total;
    for (const s of list) if ((r -= weight(s)) < 0) return s;
    return list[list.length - 1];
  };
  const chosen = [];
  const missing = all.filter((s) => !a.got[s.id]);
  chosen.push(pick(missing.length ? missing : all)); // (the first: one you haven't got)
  while (chosen.length < Math.min(PACK_SIZE, all.length)) chosen.push(pick(all.filter((s) => !chosen.includes(s))));
  let coins = 0;
  const out = chosen.map((s) => {
    const isNew = !a.got[s.id], foil = rng() < FOIL_CHANCE, newFoil = foil && !a.foil[s.id];
    a.got[s.id] = (a.got[s.id] || 0) + 1;
    if (foil) a.foil[s.id] = 1;
    const c = isNew || newFoil ? 0 : DOUBLE_COINS; // (a double you can swap; a first shiny one you keep)
    coins += c;
    return { sticker: s, isNew, foil, newFoil, coins: c };
  });
  const filled = pages.filter((p) => !a.done.includes(p.id) && pageFull(save, p)).map((p) => p.id);
  a.done.push(...filled);
  coins += filled.length * PAGE_COINS;
  const full = !a.full && all.every((s) => a.got[s.id]);
  if (full) { a.full = true; coins += ALBUM_COINS; }
  save.coins = (save.coins || 0) + coins;
  return { stickers: out, pages: filled, full, coins };
}
