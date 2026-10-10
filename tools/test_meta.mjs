// Around the matches: What's new shows every entry a returning player hasn't seen (and nothing to a
// new one), the three stars go to the night's best from either side, and the daily challenge's
// tip-in goal joins the draw only from its date.
//   node tools/test_meta.mjs
import { WHATS_NEW, whatsNewFor, WHATS_NEW_MAX } from '../src/whatsnew.js';
import { threeStars } from '../src/career.js';
import { dailyFor, dailyGoal } from '../src/daily.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

// What's new
{
  const latest = WHATS_NEW[0], all = WHATS_NEW.reduce((n, e) => n + e.items.length, 0);
  const a = whatsNewFor({ record: { played: 3 }, seenWhatsNew: WHATS_NEW[1] && WHATS_NEW[1].id });
  check("What's new: one entry behind shows just the newest", WHATS_NEW.length < 2 || (a && a.id === latest.id && a.items.length === latest.items.length), a);
  const b = whatsNewFor({ record: { played: 3 } });
  check('...never looked: the newest eight, and how many more', b && b.items.length === Math.min(all, WHATS_NEW_MAX) && b.more === all - b.items.length && b.items[0] === WHATS_NEW[0].items[0], b && [b.items.length, b.more]);
  check('...up to date: nothing', whatsNewFor({ record: { played: 3 }, seenWhatsNew: latest.id }) === null);
  const fresh = { record: { played: 0 } };
  check('...a new player: nothing, and marked up to date', whatsNewFor(fresh) === null && fresh.seenWhatsNew === latest.id);
  check('...every item has an icon and text', WHATS_NEW.every((e) => e.id && e.items.every((i) => i.icon && i.text)));
}

// the three stars
{
  const sm = (o = {}) => ({ score: [5, 2], winner: 0, saves: [14, 9], shots: [14, 16], skaters: [
    { team: 0, id: 'frost', goals: 1, assists: 1, hits: 0, steals: 0, blocks: 0 },
    { team: 0, id: 'thunder', goals: 3, assists: 0, hits: 1, steals: 0, blocks: 0 },
    { team: 0, id: 'stone', goals: 1, assists: 2, hits: 4, steals: 2, blocks: 1 },
    { team: 1, id: 'frost', goals: 2, assists: 0, hits: 0, steals: 1, blocks: 0 },
    { team: 1, id: 'thunder', goals: 0, assists: 1, hits: 2, steals: 0, blocks: 0 },
    { team: 1, id: 'stone', goals: 0, assists: 1, hits: 1, steals: 0, blocks: 0 }], ...o });
  const s = threeStars(sm()).map((k) => (k.goalie ? 'G' : k.id) + k.team);
  check('three stars: the hat trick first, three of them', s.length === 3 && s[0] === 'thunder0', s);
  const shut = threeStars(sm({ score: [1, 0], saves: [28, 6], skaters: sm().skaters.map((k) => ({ ...k, goals: k.team === 0 && k.id === 'frost' ? 1 : 0, assists: 0 })) })).map((k) => (k.goalie ? 'G' : k.id) + k.team);
  check('...a 28-save shutout puts the goalie first', shut[0] === 'G0', shut);
  const loss = threeStars(sm({ score: [2, 5], winner: 1, skaters: sm().skaters.map((k) => ({ ...k, goals: k.team === 1 ? (k.id === 'frost' ? 3 : 1) : 0 })) })).map((k) => k.team);
  check('...a loss: their scorers lead', loss[0] === 1, loss);
}

// the daily challenge: the tip-in goal from 11 October, and never under one-timers only
{
  const goals = (from, days) => Array.from({ length: days }, (_, i) => dailyFor(new Date(Date.UTC(2026, 9, from + i)).toISOString().slice(0, 10)));
  check('daily: no tip-in goal before 11 October', goals(1, 10).every((d) => d.goal !== 'tipin'));
  const later = goals(11, 200);
  check('...it comes up after', later.some((d) => d.goal === 'tipin'));
  check('...and never with one-timers only', later.every((d) => !(d.goal === 'tipin' && d.mods.includes('onetimers'))));
}

// the tight-game and comeback goals from 12 October
{
  const goals = (from, days) => Array.from({ length: days }, (_, i) => dailyFor(new Date(Date.UTC(2026, 9, from + i)).toISOString().slice(0, 10)));
  check('daily: no tight or comeback goal before 12 October', goals(1, 11).every((d) => !['tight', 'comeback'].includes(d.goal)));
  const later = goals(12, 300);
  check('...both come up after', later.some((d) => d.goal === 'tight') && later.some((d) => d.goal === 'comeback'));
  const g = (team) => ({ team });
  check('comeback: two down, then a win', dailyGoal('comeback').check({ winner: 0, score: [5, 3], goals: [g(1), g(1), g(0), g(0), g(0), g(1), g(0), g(0)] }));
  check('...one down isn\'t a comeback', !dailyGoal('comeback').check({ winner: 0, score: [5, 1], goals: [g(1), g(0), g(0), g(0), g(0), g(0)] }));
  check('tight: 5–1 yes, 5–2 no', dailyGoal('tight').check({ winner: 0, score: [5, 1] }) && !dailyGoal('tight').check({ winner: 0, score: [5, 2] }));
}

console.log(`meta: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
