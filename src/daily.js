// Daily challenge: one match a day, the same for everyone (seeded by the date): a rival,
// an arena, a couple of modifiers and a goal. Beat the goal on consecutive days to build
// a streak; the reward grows with it.

import { TEAMS, ARENAS, CHALLENGES, RIVAL_IDS } from './data.js';
import { makeRng } from './util.js';

export const DAILY_GOALS = [
  { id: 'win', text: 'Win the match.', check: (s) => s.winner === 0 },
  { id: 'by2', text: 'Win by 2 goals or more.', check: (s) => s.winner === 0 && s.score[0] - s.score[1] >= 2 },
  { id: 'onetimer', text: 'Win and score a one-timer.', check: (s) => s.winner === 0 && s.goals.some((g) => g.team === 0 && g.kind === 'onetimer') },
  { id: 'fast', text: 'Win in under 3 minutes.', check: (s) => s.winner === 0 && s.time < 180 },
  { id: 'clean', text: 'Win without taking a penalty.', check: (s) => s.winner === 0 && s.pen && s.pen[0].pims === 0 },
  { id: 'hits', text: 'Win with 8 or more hits.', check: (s) => s.winner === 0 && s.skaters.filter((k) => k.team === 0).reduce((a, k) => a + k.hits, 0) >= 8 },
  { id: 'combo', text: 'Win and score a chemistry combo goal.', check: (s) => s.winner === 0 && s.goals.some((g) => g.team === 0 && g.special && g.special.combo) },
  { id: 'shield', text: 'Win and shield the puck from a defender 8 times.', check: (s) => s.winner === 0 && s.skaters.filter((k) => k.team === 0).reduce((a, k) => a + (k.shields || 0), 0) >= 8 },
  // (from: a goal added later joins the draw from that date, so earlier days keep their challenge)
  { id: 'dekes', from: '2026-10-10', text: 'Win and deke past defenders 5 times.', check: (s) => s.winner === 0 && s.skaters.filter((k) => k.team === 0).reduce((a, k) => a + (k.dekes || 0), 0) >= 5 },
  { id: 'draws', from: '2026-10-10', text: 'Win and take 3 faceoffs clean, right on the drop.', check: (s) => s.winner === 0 && s.skaters.filter((k) => k.team === 0).reduce((a, k) => a + (k.cleanDraws || 0), 0) >= 3 },
  { id: 'spread', text: 'Win with all three skaters scoring a point.', check: (s) => s.winner === 0 && s.skaters.filter((k) => k.team === 0 && !k.extra).every((k) => k.goals + k.assists > 0) },
  { id: 'tipin', from: '2026-10-11', text: 'Win and score on a tip-in: shoot from the point with a teammate in front.', check: (s) => s.winner === 0 && (s.goals || []).some((g) => g.team === 0 && g.kind === 'tip') },
  { id: 'tight', from: '2026-10-12', text: 'Win and let in one goal at most.', check: (s) => s.winner === 0 && s.score[1] <= 1 },
  { id: 'comeback', from: '2026-10-12', text: 'Come back from two goals down and win.', check: (s) => s.winner === 0 && trailedBy(s.goals || []) >= 2 },
];
// The furthest behind we were at any point (the goals in order).
function trailedBy(goals) {
  let us = 0, them = 0, worst = 0;
  for (const g of goals) { if (g.team === 0) us++; else them++; worst = Math.max(worst, them - us); }
  return worst;
}
const GOAL_BY_ID = Object.fromEntries(DAILY_GOALS.map((g) => [g.id, g]));

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Today's challenge. The same date always gives the same challenge.
export function dailyFor(date = dayKey()) {
  const rng = makeRng(hash('glacial-strikers-daily-' + date));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const teamId = pick(RIVAL_IDS);
  // usually their building; sometimes somewhere else
  const arena = rng() < 0.65 ? (TEAMS[teamId].arena || 'home') : pick(Object.keys(ARENAS).filter((k) => !ARENAS[k].finalOnly && !ARENAS[k].exhibitionOnly)); // (the Cup Final's building isn't one: the list, and so every day's pick, stays as it was)
  const pool = CHALLENGES.filter((c) => c.id !== 'sudden');
  const mods = [];
  const n = rng() < 0.45 ? 2 : 1;
  while (mods.length < n) { const c = pick(pool).id; if (!mods.includes(c)) mods.push(c); }
  let goal = pick(DAILY_GOALS.filter((g) => !g.from || date >= g.from));
  if (mods.includes('onetimers') && (goal.id === 'combo' || goal.id === 'tipin')) goal = GOAL_BY_ID.onetimer; // (only one-timers count)
  return { date, teamId, arena, mods, goal: goal.id, seed: hash('seed-' + date) };
}

export const dailyGoal = (id) => GOAL_BY_ID[id];

export function dailyState(save) {
  return (save.daily ||= { last: null, streak: 0, best: 0, attempts: {}, completed: 0 });
}

// The streak still counts if the last completion was today or yesterday.
export function currentStreak(save, today = dayKey()) {
  const d = dailyState(save);
  return d.last === today || d.last === prevDay(today) ? d.streak : 0;
}

export const doneToday = (save, today = dayKey()) => dailyState(save).last === today;

export function dailyReward(streak) { return 120 + 30 * Math.min(6, Math.max(0, streak - 1)); }

// Mark today's challenge beaten. Returns { streak, coins } (null if already done).
export function completeDaily(save, today = dayKey()) {
  const d = dailyState(save);
  if (d.last === today) return null;
  d.streak = d.last === prevDay(today) ? d.streak + 1 : 1;
  d.last = today;
  d.best = Math.max(d.best, d.streak);
  d.completed++;
  const coins = dailyReward(d.streak);
  save.coins += coins;
  return { streak: d.streak, coins };
}

export function noteAttempt(save, today = dayKey()) {
  const d = dailyState(save);
  d.attempts = { [today]: (d.attempts[today] || 0) + 1 }; // only today's count is kept
}
