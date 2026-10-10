// The club's record book: the bests of our full matches (league, playoffs, the Winter Classic,
// the All-Star Game, exhibitions and the daily challenge, as on the career page), kept as they
// happen (save.records), and the season and career bests read from the career book. A record
// broken comes back from updateRecords, for a toast after the match. No browser APIs here.

import { careerOf } from './career.js';

// Each kept record: how a match's value is read, and the text that shows it ({n}, {name}, {team}, {season}).
export const GAME_RECORDS = {
  bigWin: { name: 'Biggest win', text: '{n}-goal win over the {team} (season {season})' },
  goalsGame: { name: 'Most goals in a match', text: '{n} by {name} against the {team} (season {season})' },
  pointsGame: { name: 'Most points in a match', text: '{n} by {name} against the {team} (season {season})' },
  savesGame: { name: 'Most saves in a match', text: '{n} by {name} against the {team} (season {season})' },
  fastestGoal: { name: 'Fastest goal', text: '{n}s in, by {name} against the {team} (season {season})' },
  winStreak: { name: 'Longest winning streak', text: '{n} in a row (season {season})' },
};

// A finished match: game = { summary, won, opp, oppName, season, nameOf(id) }. Returns the
// records it broke: [{ id, n, name }].
export function updateRecords(save, game) {
  const R = (save.records ||= {}), sm = game.summary, broken = [];
  const set = (id, n, extra = {}, better = (a, b) => a > b) => {
    const cur = R[id];
    if (cur && !better(n, cur.n)) return;
    R[id] = { n, team: game.oppName, season: game.season, ...extra };
    if (cur) { broken.push({ id, n, ...extra }); R.brokenN = (R.brokenN || 0) + 1; } // (the first one of each isn't news)
  };
  const ours = (sm.skaters || []).filter((k) => k.team === 0);
  const margin = sm.score[0] - sm.score[1];
  if (margin > 0) set('bigWin', margin);
  const top = (f) => ours.slice().sort((a, b) => f(b) - f(a))[0];
  const g = top((k) => k.goals || 0);
  if (g && g.goals > 0) set('goalsGame', g.goals, { name: game.nameOf(g.id) });
  const p = top((k) => (k.goals || 0) + (k.assists || 0));
  if (p && p.goals + p.assists > 0) set('pointsGame', p.goals + p.assists, { name: game.nameOf(p.id) });
  if (sm.saves && sm.saves[0] > 0) set('savesGame', sm.saves[0], { name: game.goalieName || '' });
  const first = (sm.goals || [])[0];
  if (first && first.team === 0 && first.scorer) set('fastestGoal', Math.round(first.time * 10) / 10, { name: game.nameOf(first.scorer.who || first.scorer.id) }, (a, b) => a < b);
  // the streak runs across matches (and seasons)
  R.streakNow = game.won ? (R.streakNow || 0) + 1 : 0;
  if (R.streakNow >= 2) set('winStreak', R.streakNow);
  return broken;
}

// Season and career bests from the career book: [{ id, who, name, n, season? }] for the page.
export function careerRecords(save, nameOf) {
  const c = careerOf(save), out = [];
  let goalsSeason = null, pointsSeason = null, goals = null, points = null;
  for (const [id, r] of Object.entries(c.skaters)) {
    for (const [season, ss] of Object.entries(r.seasons || {})) {
      if (!goalsSeason || ss.g > goalsSeason.n) goalsSeason = { n: ss.g, who: id, season: +season };
      if (!pointsSeason || ss.g + ss.a > pointsSeason.n) pointsSeason = { n: ss.g + ss.a, who: id, season: +season };
    }
    if (!goals || r.g > goals.n) goals = { n: r.g, who: id };
    if (!points || r.g + r.a > points.n) points = { n: r.g + r.a, who: id };
  }
  if (goalsSeason && goalsSeason.n) out.push({ id: 'goalsSeason', ...goalsSeason, name: nameOf(goalsSeason.who) });
  if (pointsSeason && pointsSeason.n) out.push({ id: 'pointsSeason', ...pointsSeason, name: nameOf(pointsSeason.who) });
  if (goals && goals.n) out.push({ id: 'goalsCareer', ...goals, name: nameOf(goals.who) });
  if (points && points.n) out.push({ id: 'pointsCareer', ...points, name: nameOf(points.who) });
  return out;
}
export const CAREER_RECORDS = {
  goalsSeason: { name: 'Most goals in a season', text: '{n} by {name} (season {season})' },
  pointsSeason: { name: 'Most points in a season', text: '{n} by {name} (season {season})' },
  goalsCareer: { name: 'Most goals for the club', text: '{n} by {name}' },
  pointsCareer: { name: 'Most points for the club', text: '{n} by {name}' },
};
