// Legends in Scouting: now and then, after a match, one of the legends turns up as a free
// agent and stays for three matches. Once one twin has signed, the other comes looking
// sooner. They join at your line-up's level, with the perks for the levels they skipped.
import { LEGENDS, member } from './data.js';
import { joinLevel, newMember, PERK_LEVELS } from './progress.js';
import { addNews } from './news.js';

// What's said when a legend turns up (over the reveal painting), when the second twin comes
// looking for the first, and before the twins' first game side by side.
export const LEGEND_LINES = {
  arrive: {
    fafnir: [
      ['kip', null, 'Folks, hold on to your seats: a legend is in town! The dragon of the blue line is looking for a team.'],
      ['us', 'fafnir', 'Fast feet, a hot shot and a long tail. Got a jersey that fits?'],
      ['kip', null, 'Find the dragon in Team › Scouting, but not for long: legends don\'t wait.'],
    ],
    fenrir: [
      ['kip', null, 'Folks, hold on to your seats: a legend is in town! The wolf of the wing is looking for a team.'],
      ['us', 'fenrir', 'Blink and the puck\'s gone. So am I. Who wants me?'],
      ['kip', null, 'Find the wolf in Team › Scouting, but not for long: legends don\'t wait.'],
    ],
  },
  twin: {
    fafnir: [
      ['kip', null, 'Now there\'s a sight: the dragon has come looking for the wolf!'],
      ['us', 'fafnir', 'Where my twin plays, I play. Let\'s finish the set.'],
    ],
    fenrir: [
      ['kip', null, 'Now there\'s a sight: the wolf has come looking for the dragon!'],
      ['us', 'fenrir', 'Where my twin plays, I play. Room on the wing?'],
    ],
  },
  together: [
    ['kip', null, 'Everybody on your feet: for the first time, the twins take the ice together!'],
    ['us', 'fenrir', 'Ready?'],
    ['us', 'fafnir', 'Always. Pass it to me and duck.'],
  ],
};

// The twins dressed side by side for the first time? (once; true marks it seen)
export function twinsFirstTogether(save, line) {
  const st = legendState(save);
  if (st.together || !line.includes('fafnir') || !line.includes('fenrir')) return false;
  st.together = true;
  return true;
}

export const LEGEND_CHANCE = 0.08; // a match's chance that a legend turns up
export const TWIN_CHANCE = 0.3; // once their twin is yours
export const STAY = 3; // matches they wait for your call
const FIRST_AFTER = 6; // not before a few matches

export const legendState = (save) => (save.legends ||= { visiting: null, until: 0, seen: [] });

// After a match: a visit ends, or maybe one begins. Returns the legend who just turned up,
// or null. Without their art they stay hidden (`art` says which legends can show).
export function rollLegend(save, rnd = Math.random, art = () => true) {
  const st = legendState(save), played = save.record.played;
  if (st.visiting && (save.roster[st.visiting] || played >= st.until)) st.visiting = null;
  if (st.visiting || played < FIRST_AFTER) return null;
  const free = Object.keys(LEGENDS).filter((k) => !save.roster[k] && art(k));
  if (!free.length) return null;
  const twinIn = free.filter((k) => save.roster[LEGENDS[k].twin]);
  if (rnd() >= (twinIn.length ? TWIN_CHANCE : LEGEND_CHANCE)) return null;
  const key = twinIn.length ? twinIn[0] : free[Math.floor(rnd() * free.length)];
  st.visiting = key;
  st.until = played + STAY;
  if (!st.seen.includes(key)) st.seen.push(key);
  return key;
}

// Matches left before the visiting legend moves on.
export const legendLeft = (save) => Math.max(0, legendState(save).until - save.record.played);

export function signLegend(save, key) {
  const L = LEGENDS[key], st = legendState(save);
  if (!L || st.visiting !== key || save.roster[key] || save.coins < L.price) return null;
  save.coins -= L.price;
  st.visiting = null;
  addNews(save, { k: 'weLegend', name: L.name });
  return joinLegend(save, key);
}

// A legend joins the roster (signed, or for a test run).
export function joinLegend(save, key) {
  const m = newMember();
  m.level = joinLevel(save) + 1; // (joinLevel is a level below the line-up)
  m.points = m.level - 1;
  const opts = member(key).def.perks;
  PERK_LEVELS.forEach((lv, i) => { if (m.level >= lv) m.perks.push(opts[i][0]); });
  save.roster[key] = m;
  return m;
}
