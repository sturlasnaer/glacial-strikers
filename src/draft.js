// Draft Day: once a season is over (after Awards Night), three prospects hope to join the
// club, one per position. Pick one and they join the roster as a rookie in our colours (the
// Batch AA newcomer art). Rookies start below the line-up and raw, but potential (two to five
// stars) makes them learn faster and lets their stats grow further than anyone's.
import { CHARACTERS, ROOKIES, setRookies, KIT_OF_ROLE, TEAMS, STAT_KEYS, makeDef, ARCHETYPES, ELEMENTS, RIVAL_IDS, recruitKey, RECRUITS } from './data.js';
import { joinLevel, PERK_LEVELS, newMember } from './progress.js';
import { randomLook } from './modular.js';
import { leagueRivals } from './league.js';
import { rivalDraft } from './moves.js';
import { addNews } from './news.js';

const NAMES = {
  C: ['Flick', 'Pivot', 'Quill', 'Marlo', 'Juno', 'Quinn', 'Tinsel', 'Sly', 'Pippa', 'Kestrel'],
  W: ['Dash', 'Zip', 'Wisp', 'Skipper', 'Breeze', 'Spark', 'Flurry', 'Minnow', 'Swift', 'Jinx'],
  D: ['Tank', 'Boulder', 'Moose', 'Anvil', 'Brick', 'Tor', 'Haddock', 'Bjorn', 'Granite', 'Hulda'],
};
export const SCOUTING = {
  C: ['Sees passes nobody else sees. Needs a season to fill out.', 'Wins faceoffs in their sleep. The skating is a work in progress.', 'A playmaker from the outdoor rinks up north.'],
  W: ['Raw speed, rough hands. Give them two seasons.', 'Shoots first and asks questions never.', 'Small, slippery and fearless along the boards.'],
  D: ['Big frame, bigger hits. Still learning where to stand.', 'Calm with the puck, with a hard shot from the point.', 'Blocks everything. Even the shots you want to go in.'],
};
// what the scouts call each potential
export const POTENTIAL_GRADE = { 2: 'Depth player', 3: 'Solid prospect', 4: 'High upside', 5: 'Franchise talent' };
const RIVALS = RIVAL_IDS; // (the draw keeps to the league's clubs: see makeDraft)
// Kip opens the first visit
export const DRAFT_LINES = [
  ['kip', null, 'Welcome to Draft Day! Three rookies, one pick for the Foxes. Choose well.'],
  ['us', 'frost', 'Raw talent. Give them a season with us and they\'ll fly.'],
];

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];
// A name nobody in the league has: from the list, or once it's used up, one with a number
// after it ('Brick II').
export function freshName(list, taken, rnd) {
  for (const suffix of ['', ' II', ' III', ' IV', ' V']) {
    const free = list.filter((nm) => !taken.has(nm + suffix));
    if (free.length) return pick(free, rnd) + suffix;
  }
  return pick(list, rnd);
}
// Every name in the league now: the clubs' players and reserves, the rookies and free agents
// who've signed anywhere.
export function leagueNames(save) {
  const names = new Set(Object.values(ROOKIES).map((k) => k.name));
  for (const tm of Object.values(TEAMS)) for (const n of [...Object.values(tm.names || {}), ...Object.values(tm.subs || {})]) names.add(n);
  for (const f of Object.values(save.rivalFills || {})) names.add(f.name);
  return names;
}

function potentialRoll(rnd) {
  const x = rnd();
  return x < 0.3 ? 2 : x < 0.65 ? 3 : x < 0.9 ? 4 : 5;
}

// One prospect: the kit's base stats, a specialty a point higher, and the rawer the higher the
// potential (1 + potential points taken off, at most two from a stat and never below 2).
function prospect(role, taken, rnd) {
  const kit = KIT_OF_ROLE[role];
  const base = { ...CHARACTERS[kit].base };
  const potential = potentialRoll(rnd);
  const top = [...STAT_KEYS].sort((a, b) => base[b] - base[a]).slice(0, 3);
  const special = pick(top, rnd);
  base[special] = Math.min(10, base[special] + 1);
  const cut = {};
  for (let n = 1 + potential, guard = 0; n > 0 && guard < 80; guard++) {
    const k = pick(STAT_KEYS, rnd);
    if (k !== special && base[k] > 2 && (cut[k] || 0) < 2) { base[k]--; cut[k] = (cut[k] || 0) + 1; n--; }
  }
  const name = freshName(NAMES[role], taken, rnd);
  taken.add(name);
  // how they play and their super: any archetype that fits the position, any element
  const arch = pick(Object.values(ARCHETYPES).filter((a) => a.roles.includes(role)).map((a) => a.id), rnd);
  const elem = pick(Object.keys(ELEMENTS), rnd);
  const hand = rnd() < 0.6 ? 'L' : 'R'; // (most players shoot left)
  const parts = randomLook(rnd, role); // a face (and a build) of their own once the parts art is in
  return { name, kit, base, potential, special, arch, elem, hand, parts, blurb: pick(SCOUTING[role], rnd), perks: PERK_LEVELS.map(() => (rnd() < 0.5 ? 0 : 1)) };
}

// The season's three prospects, and the two rivals who pick after you.
export function makeDraft(save, season, rnd = Math.random) {
  const taken = leagueNames(save);
  const prospects = ['C', 'W', 'D'].map((role) => prospect(role, taken, rnd));
  const rivals = [...leagueRivals(save.league)].sort(() => rnd() - 0.5).slice(0, 2);
  return { season, prospects, rivals, picked: null };
}

// Skipping Draft Day: the three of them sign with rivals, holes you left first.
export function skipDraft(save) {
  const d = save.draft;
  if (!d || d.picked !== null) return;
  d.picked = -1;
  rivalDraft(save, d);
}

// When a season is over and this season's draft hasn't been made yet, make it. True if it did.
export function offerDraft(save) {
  const L = save.league;
  if (!L || L.phase !== 'done' || !L.awards) return false;
  if (save.draft && save.draft.season === L.season) return false;
  save.draft = makeDraft(save, L.season);
  return true;
}

export const draftOpen = (save) => !!(save.draft && save.draft.picked === null);

// Draft prospect i: they join the roster (a couple of levels below the line-up, points to
// spend, perks for the levels they skipped). Returns their roster id, or null.
export function draftPick(save, i) {
  const d = save.draft, p = d && d.prospects[i];
  if (!p || d.picked !== null) return null;
  save.rookieN = (save.rookieN || 0) + 1;
  const id = 'rk' + save.rookieN;
  save.rookies ||= {};
  save.rookies[id] = { name: p.name, kit: p.kit, arch: p.arch, elem: p.elem, hand: p.hand, parts: p.parts || null, base: p.base, potential: p.potential, blurb: p.blurb, season: d.season };
  setRookies(save.rookies);
  const m = newMember();
  m.level = m.joined = Math.max(1, joinLevel(save) - 2);
  m.points = m.level - 1;
  const opts = makeDef(p.kit, p.arch, p.elem).perks;
  PERK_LEVELS.forEach((lv, k) => { if (m.level >= lv) m.perks.push(opts[k][p.perks[k]]); });
  save.roster[id] = m;
  d.picked = i;
  addNews(save, { k: 'weDraft', name: p.name, kit: p.kit });
  rivalDraft(save, d); // the other two go to rivals, first to fill the holes you left
  return id;
}

// Who took the other two (for the line under the pick), and whether they fill a hole you left.
export const otherPicks = (d, save = null) => d.prospects.map((p, i) => i).filter((i) => i !== d.picked).map((i, n) => {
  const f = save && save.rivalFills && save.rivalFills[`${d.rivals[n]}:${d.prospects[i].kit}`];
  const gone = save && save.retired && save.retired[recruitKey(d.rivals[n], d.prospects[i].kit)];
  const fills = !!(f && f.how === 'draft' && f.name === d.prospects[i].name && f.season === d.season);
  // (in for a star who retired at the end of this season, not one gone seasons ago)
  return { name: d.prospects[i].name, team: TEAMS[d.rivals[n]], fills, replaces: fills && gone === d.season ? RECRUITS[recruitKey(d.rivals[n], d.prospects[i].kit)].name : null };
});
