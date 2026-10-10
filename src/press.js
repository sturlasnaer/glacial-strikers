// Press conferences: after a big game (a semifinal won, the Winter Classic, or a league game
// against a team we're feuding with: two or more in a row either way), Kip Vance puts a
// question to the player of the night. Three answers, humble, confident or fiery: each a small
// edge (more chemistry, a fired-up start, a crowd ready to chant) and a headline in the league
// news. They take the place of that round's locker-room moment. No browser APIs here.
// Text keys take {name}, {team}, {club}, {score} and {n}.

import { addNews } from './news.js';

const ALL_PAIRS = ['frost+thunder', 'frost+stone', 'stone+thunder'];
export const PRESS_GAP = 3; // league games at least between two feud press conferences

// Is this game one for the press? game: { kind ('regular'|'semi'|'final'|'classic'|'allstar'),
// opp, won }. (A lost semifinal ends the season and the final has its own night; the All-Star
// Game is a showcase.)
export function pressWorthy(save, game) {
  if (game.kind === 'classic') return true;
  if (game.kind === 'semi') return !!game.won;
  if (game.kind !== 'regular') return false;
  const r = save.rivals && save.rivals[game.opp];
  const played = (save.record && save.record.played) || 0;
  return !!r && r.played >= 3 && Math.abs(r.streak) >= 2 && played - (save.pressAt ?? -99) >= PRESS_GAP;
}

// The player of the night: most points (goals count double), else the first of our skaters.
export function pressPlayer(summary) {
  const ours = (summary.skaters || []).filter((k) => k.team === 0);
  const pts = (k) => (k.goals || 0) * 2 + (k.assists || 0) + (k.steals || 0) * 0.2;
  return ours.slice().sort((a, b) => pts(b) - pts(a))[0]?.id || null;
}

export const PRESS_QUESTIONS = {
  classicWin: { text: 'A win outdoors on Pine Pond, {name}. What was the Winter Classic like out there?' },
  classicLoss: { text: 'A loss in the snow, {name}, but what a night. What will you remember from the Winter Classic?' },
  semi: { text: '{name}, you\'re in the Cup Final. Are the {club} the team to beat now?' },
  feudWin: { text: '{name}, {score} against the {team}: {n} in a row now. What makes this matchup yours?' },
  feudLoss: { text: '{name}, {score} against the {team}: {n} straight losses to them now. What\'s going wrong?' },
};
export const pressQuestion = (game) => PRESS_QUESTIONS[game.kind === 'classic' ? (game.won ? 'classicWin' : 'classicLoss') : game.kind === 'semi' ? 'semi' : game.won ? 'feudWin' : 'feudLoss'].text;

// The three answers, worded for a win or a loss; each with its edge and the headline it makes.
export const PRESS_ANSWERS = [
  { tone: 'humble', fx: 'Every pair +4 chemistry',
    win: { label: 'Credit the team', reply: '"Every one of us did the dirty work tonight. The goal is just the last touch."' },
    loss: { label: 'Own the mistakes', reply: '"That one\'s on us. We\'ll watch the tape together and fix it."' },
    news: { line: '{name} credits the whole {club} bench.' } },
  { tone: 'confident', fx: 'Next match: fired up (start with 25% ultimate)',
    win: { label: 'We\'re just getting started', reply: '"This is what we look like now. Better get used to it."' },
    loss: { label: 'We\'ll be fine', reply: '"One game. We\'ll be back on our feet before the next puck drop."' },
    news: { line: '{name}: "Get used to it." The {club} sound sure of themselves.' } },
  { tone: 'fiery', fx: 'Next match: the crowd is ready to chant from the start',
    win: { label: 'They had no answer', reply: '"They talked all week. The scoreboard did the talking tonight."' },
    loss: { label: 'Wait for the rematch', reply: '"Enjoy it while it lasts. We\'ll see them again, and we won\'t forget."' },
    news: { line: '{name} fires a shot at the {team} after the game.' } },
];
const EDGE = {
  humble: (save) => { save.chem ||= {}; for (const k of ALL_PAIRS) save.chem[k] = (save.chem[k] || 0) + 4; },
  confident: (save) => buff(save, { id: 'press', type: 'ult', v: 25 }),
  fiery: (save) => buff(save, { id: 'hype', type: 'hype' }),
};
const buff = (save, b) => { save.buffs = [...(save.buffs || []).filter((x) => x.id !== b.id), b]; };
export const pressHeadline = (tone) => (PRESS_ANSWERS.find((a) => a.tone === tone) || PRESS_ANSWERS[0]).news.line;

// The answer chosen: its edge, the headline, and when (for the gap between feud games).
// Returns { label, reply, fx, tone }.
export function answerPress(save, game, who, name, i) {
  const a = PRESS_ANSWERS[i];
  if (!a) return null;
  EDGE[a.tone](save);
  save.pressAt = (save.record && save.record.played) || 0;
  save.pressCount = (save.pressCount || 0) + 1;
  addNews(save, { k: 'press', tone: a.tone, name, team: game.opp, who });
  return { ...(game.won ? a.win : a.loss), fx: a.fx, tone: a.tone };
}
