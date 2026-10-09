// The free-agent market: players made from parts who aren't on any team, signed for coins.
// An agent offers a few at a time (one per position, and now and then a goalie), with new
// faces every few matches. They're veterans: they join at your line-up's level with the
// perks for the levels they've had, they don't grow any faster than anyone else, and they
// know what they're worth. A signed skater is kept like a drafted rookie (save.rookies,
// with agent: true); a signed goalie in save.freeGoalies.
import { CHARACTERS, KIT_OF_ROLE, STAT_KEYS, ARCHETYPES, ELEMENTS, GOALIE_STYLES, setRookies, setFreeGoalies, makeDef } from './data.js';
import { joinLevel, PERK_LEVELS, newMember, rosterIds } from './progress.js';
import { randomLook, randomMask, maskFor } from './modular.js';
import { addNews } from './news.js';

export const MARKET_FROM = 3; // matches played before the agent calls
export const REFRESH = 5; // new faces every this many matches
const GOALIE_CHANCE = 0.4;

const NAMES = {
  C: ['Bodil', 'Errol', 'Mika', 'Tove', 'Sander', 'Ines', 'Rurik', 'Lotta'],
  W: ['Kasper', 'Nell', 'Ruben', 'Sigga', 'Dex', 'Maja', 'Otto', 'Freya'],
  D: ['Hakon', 'Greta', 'Bruno', 'Ylva', 'Gunnar', 'Petra', 'Ivar', 'Disa'],
  G: ['Stellan', 'Runa', 'Matti', 'Saga', 'Odd', 'Linnea'],
};
// what the agent says about them (by position)
export const PITCH = {
  C: ['Twelve seasons, three leagues, never missed a faceoff drill.', 'Sees the ice like a map. Wants a team that passes.', 'Cut by a big club for asking for ice time. Has a point to prove.'],
  W: ['Fast, cheap and eager. Two out of three is a bargain.', 'Scored forty in the minors. The minors noticed.', 'Shoots from anywhere. Sometimes it even goes in.'],
  D: ['Big, steady, boring in the best way.', 'Blocks shots with whatever is closest. Usually their face.', 'Played every position once. Liked defence the most.'],
  G: ['Stopped a penalty shot with the mask once. On purpose, they say.', 'Calm as a frozen pond. Reads the play early.', 'Backed up a champion for three years. Wants the net now.'],
};

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];
export const agentState = (save) => (save.agents ||= { until: 0, list: [], n: 0 });

// One skater: the kit's numbers moved about (a point up here, a point down there; now and
// then one who's simply better), a style that fits the position, any super, a look of their own.
function skater(save, role, taken, rnd) {
  const kit = KIT_OF_ROLE[role], base = { ...CHARACTERS[kit].base };
  // (stars turn up more often as the league gets better, and they're better)
  const g = Math.max(0, Math.min(3, (save.season || 1) - 1));
  const star = rnd() < 0.15 + 0.1 * g;
  const ups = star ? 3 + g : 2, downs = star ? 1 : 2;
  for (let i = 0; i < ups; i++) { const k = pick(STAT_KEYS, rnd); base[k] = Math.min(10, base[k] + 1); }
  for (let i = 0, guard = 0; i < downs && guard < 30; guard++) { const k = pick(STAT_KEYS, rnd); if (base[k] > 2) { base[k]--; i++; } }
  // the league gets better: so do the players looking for a club
  for (const k of [...STAT_KEYS].sort((a, b) => base[b] - base[a]).slice(0, 4)) base[k] = Math.min(10 + g, base[k] + g);
  const level = joinLevel(save);
  const extra = STAT_KEYS.reduce((a, k) => a + base[k] - CHARACTERS[kit].base[k], 0);
  const names = NAMES[role].filter((n) => !taken.has(n));
  const name = pick(names.length ? names : NAMES[role], rnd);
  taken.add(name);
  return {
    name, kit, base, level, star,
    arch: pick(Object.values(ARCHETYPES).filter((a) => a.roles.includes(role)).map((a) => a.id), rnd),
    elem: pick(Object.keys(ELEMENTS), rnd), hand: rnd() < 0.6 ? 'L' : 'R', parts: randomLook(rnd, role),
    perks: PERK_LEVELS.map(() => (rnd() < 0.5 ? 0 : 1)), blurb: pick(PITCH[role], rnd),
    price: Math.max(150, Math.round((170 + level * 25 + extra * 45) / 10) * 10),
  };
}

function goalie(save, taken, rnd) {
  const names = NAMES.G.filter((n) => !taken.has(n));
  const name = pick(names.length ? names : NAMES.G, rnd);
  taken.add(name);
  const base = { rfx: 5 + Math.floor(rnd() * 3), pos: 5 + Math.floor(rnd() * 3) };
  const level = Math.max(1, save.goalie.level - 1);
  return { goalie: true, name, base, level, style: pick(Object.keys(GOALIE_STYLES), rnd), blurb: pick(PITCH.G, rnd), look: randomMask(rnd),
    price: Math.round((200 + level * 20 + (base.rfx + base.pos - 12) * 60) / 10) * 10 };
}

// New faces when it's time (true when the list changed). Not before a few matches.
export function refreshAgents(save, rnd = Math.random) {
  const st = agentState(save), played = save.record.played;
  if (played < MARKET_FROM || played < st.until) return false;
  const taken = new Set([...rosterIds(save).map((id) => (save.rookies && save.rookies[id] && save.rookies[id].name) || id),
    ...Object.values(save.freeGoalies || {}).map((g) => g.name)]);
  st.list = ['C', 'W', 'D'].map((role) => skater(save, role, taken, rnd));
  if (rnd() < GOALIE_CHANCE) st.list.push(goalie(save, taken, rnd));
  st.until = played + REFRESH;
  return true;
}

export const marketOpen = (save) => save.record.played >= MARKET_FROM;
export const agentsLeft = (save) => Math.max(0, agentState(save).until - save.record.played);

// Sign the i-th free agent: a skater joins the roster (returns their id), a goalie joins the
// goalies. Null if they can't be signed.
export function signAgent(save, i) {
  const st = agentState(save), a = st.list[i];
  if (!a || save.coins < a.price) return null;
  save.coins -= a.price;
  st.list.splice(i, 1);
  st.n = (st.n || 0) + 1;
  if (a.goalie) {
    const id = 'fa_g' + st.n;
    (save.freeGoalies ||= {})[id] = { name: a.name, base: a.base, style: a.style, blurb: a.blurb, price: a.price, look: a.look || maskFor(id) }; // (listed before the masks were in: one of their own now)
    setFreeGoalies(save.freeGoalies);
    (save.goalies ||= {})[id] = { level: a.level, exp: 0, gear: 'g_start' };
    addNews(save, { k: 'weAgent', name: a.name, kit: 'goalie' });
    return id;
  }
  save.rookieN = (save.rookieN || 0) + 1;
  const id = 'rk' + save.rookieN;
  (save.rookies ||= {})[id] = { name: a.name, kit: a.kit, arch: a.arch, elem: a.elem, hand: a.hand, parts: a.parts || null, base: a.base, potential: 1, blurb: a.blurb, season: save.season, agent: true, price: a.price };
  setRookies(save.rookies);
  const m = newMember();
  m.level = m.joined = a.level;
  m.points = m.level - 1;
  const opts = makeDef(a.kit, a.arch, a.elem).perks;
  PERK_LEVELS.forEach((lv, k) => { if (m.level >= lv) m.perks.push(opts[k][a.perks[k]]); });
  save.roster[id] = m;
  addNews(save, { k: 'weAgent', name: a.name, kit: a.kit });
  return id;
}
