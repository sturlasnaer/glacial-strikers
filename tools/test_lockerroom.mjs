// Locker-room moments: the Foxes' story has the cast's scenes; a career as another club has the
// same scenes played by its line-up (named, no pronouns), with every boost landing on whoever
// plays there, and none of the cast's own. Every moment's words render for both.
//   node tools/test_lockerroom.mjs
import { MOMENTS, CAREER_MOMENTS, pickMoment, buffEffects, BUFF_TEXT } from '../src/lockerroom.js';
import { newSave, lineupIds, starterId } from '../src/progress.js';
import { useCareer, member, goalieInfo, TEAMS } from '../src/data.js';
import { useModular } from '../src/modular.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });
const CAST = /\b(Nix|Volta|Bram|Halla)\b/;
const PRONOUNS = /\b(he|she|his|her|him|hers)\b/i;
const say = (x, c) => (typeof x === 'function' ? x(c) : x);

// a context where every moment could happen: a loss after a win streak, our defender quiet,
// a rival who beat us last time up next, a playoff semi
const ctxFor = (s, extra = {}) => {
  const ids = lineupIds(s);
  const summary = { skaters: [...ids.map((id, i) => ({ team: 0, id, goals: i === 0 ? 3 : 0, shots: i === 2 ? 1 : 4, name: member(id).name })), { team: 1, id: 'x', goals: 0 }], saves: [20, 10], score: [5, 1] };
  return { won: true, gf: 5, ga: 1, summary, streak: 3, next: { opponent: 'royals', kind: 'semi' }, ups: [], save: s, ...extra };
};

check('a club version of each of the cast\'s fifteen scenes', CAREER_MOMENTS.length === 15 && CAREER_MOMENTS.every((m) => m.id.endsWith('-club') && MOMENTS.some((o) => o.id === m.id.replace('-club', ''))));

for (const team of ['lynx', 'custom']) {
  const s = newSave(team, () => 0.4);
  s.rivals = { royals: { last: { won: false } } };
  const c = ctxFor(s), names = lineupIds(s).map((id) => member(id).name).concat(goalieInfo(starterId(s)).name);
  let ok = true, bad = [];
  for (const m of CAREER_MOMENTS) {
    if (m.id === 'homegrown-club' || m.id === 'goal-push-club') continue; // (their own conditions, below)
    const words = [say(m.text, c), ...m.choices.flatMap((ch) => [say(ch.label, c), say(ch.fx, c), say(ch.reply, c)])].join(' ');
    if (CAST.test(words) || PRONOUNS.test(words.replace(/"[^"]*"/g, '')) || words.includes('undefined')) { ok = false; bad.push(m.id); }
  }
  check(`${team}: every scene's words name the line-up, no cast and no he/she`, ok, bad);
  const faces = CAREER_MOMENTS.filter((m) => m.whoFn && m.id !== 'homegrown-club').every((m) => m.whoFn(c).every((id) => lineupIds(s).includes(id) || id === starterId(s)));
  check(`${team}: the portraits are the line-up's (and the goalie's)`, faces);
  // the picks: only the club versions (and the shared ones), never the cast's
  const seen = new Set();
  const reg = { ...c, next: { opponent: 'royals', kind: 'regular' } }; // (a semi would always bring the nerves)
  for (let i = 0; i < 400; i++) { s.locker = { seen: [], seasonSeen: [], season: s.season }; const m = pickMoment(s, reg, () => (i % 97) / 97); if (m) seen.add(m.id); }
  check(`${team}: picks only the club's versions and the shared ones`, [...seen].length > 4 && [...seen].every((id) => id.endsWith('-club') || id === 'hat-trick'), [...seen]);
}
useCareer(null);

// the boosts land on the line-up
{
  const s = newSave('ravens'), c = ctxFor(s);
  const nerves = CAREER_MOMENTS.find((m) => m.id === 'nerves-club');
  nerves.choices[1].apply(s, c);
  check('a boost for the winger: the Ravens\' winger', s.buffs.some((b) => b.type === 'stat' && b.who === s.lineup.W && b.stat === 'spd') && BUFF_TEXT(s.buffs.find((b) => b.stat === 'spd')).includes(member(s.lineup.W).name));
  const before = { ...s.chem };
  CAREER_MOMENTS.find((m) => m.id === 'spat-club').choices[0].apply(s, c);
  const k = Object.keys(s.chem).find((x) => s.chem[x] !== before[x]);
  check('...chemistry for the pair it names', k && k.includes(s.lineup.W) && k.includes(s.lineup.D) && s.chem[k] - (before[k] || 0) === 15);
  const exp0 = s.roster[s.lineup.D].exp + s.roster[s.lineup.D].level * 1000;
  CAREER_MOMENTS.find((m) => m.id === 'ice-time-club').choices[1].apply(s, c);
  check('...EXP for the defender it names', s.roster[s.lineup.D].exp + s.roster[s.lineup.D].level * 1000 > exp0);
  check('...and the stat boosts reach the match', buffEffects(s.buffs).stats.some((b) => b.who === s.lineup.D));
  useCareer(null);
}

// the Foxes' story: the cast's own scenes, never the club versions
{
  const s = newSave(), c = ctxFor(s, { next: { opponent: 'royals', kind: 'regular' } }), seen = new Set();
  s.rivals = { royals: { last: { won: false } } };
  for (let i = 0; i < 400; i++) { s.locker = { seen: [], seasonSeen: [], season: s.season }; const m = pickMoment(s, c, () => (i % 97) / 97); if (m) seen.add(m.id); }
  check('the Foxes\' story: the cast\'s scenes only', [...seen].length > 4 && [...seen].every((id) => !id.endsWith('-club')), [...seen]);
}
check('the goalie boost reads for anyone in goal', !CAST.test(BUFF_TEXT({ type: 'goalie', v: 1 })));

console.log(`Locker room: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
