// Press conferences (press.js): which games get one, who's asked, the three answers' edges,
// the headline in the league news, and the gap between feud games.
//   node tools/test_press.mjs
import { pressWorthy, pressPlayer, pressQuestion, PRESS_ANSWERS, answerPress, pressHeadline, PRESS_GAP } from '../src/press.js';
import { newSave } from '../src/progress.js';
import { buffEffects } from '../src/lockerroom.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const feud = (streak, played = 4) => { const s = newSave(); s.record.played = 10; s.rivals = { comets: { played, streak } }; return s; };
// which games
check('the Winter Classic, won or lost', pressWorthy(newSave(), { kind: 'classic', won: true }) && pressWorthy(newSave(), { kind: 'classic', won: false }));
check('a semifinal won, not lost', pressWorthy(newSave(), { kind: 'semi', won: true }) && !pressWorthy(newSave(), { kind: 'semi', won: false }));
check('not the final or the All-Star Game', !pressWorthy(newSave(), { kind: 'final', won: true }) && !pressWorthy(newSave(), { kind: 'allstar', won: true }));
check('a league game in a feud (two in a row either way)', pressWorthy(feud(2), { kind: 'regular', opp: 'comets', won: true }) && pressWorthy(feud(-3), { kind: 'regular', opp: 'comets', won: false }));
check('...not an ordinary one', !pressWorthy(feud(1), { kind: 'regular', opp: 'comets' }) && !pressWorthy(feud(-1), { kind: 'regular', opp: 'comets' }) && !pressWorthy(newSave(), { kind: 'regular', opp: 'comets' }));
check('...nor before they\'ve met three times', !pressWorthy(feud(2, 2), { kind: 'regular', opp: 'comets' }));

// who's asked
const sm = { skaters: [{ team: 0, id: 'frost', goals: 0, assists: 1 }, { team: 0, id: 'stone', goals: 2, assists: 0 }, { team: 1, id: 'frost', goals: 3, assists: 0 }] };
check('the player of the night, from our side', pressPlayer(sm) === 'stone');
check('...nobody scored: still one of ours', pressPlayer({ skaters: [{ team: 1, id: 'x', goals: 1 }, { team: 0, id: 'thunder', goals: 0, assists: 0 }] }) === 'thunder' && pressPlayer({ skaters: [] }) === null);
check('questions for each kind of game', new Set([{ kind: 'classic', won: true }, { kind: 'classic', won: false }, { kind: 'semi', won: true }, { kind: 'regular', won: true }, { kind: 'regular', won: false }].map(pressQuestion)).size === 5);

// the answers
{
  const g = { kind: 'regular', opp: 'comets', won: true };
  const s = feud(2);
  const chem0 = s.chem['frost+thunder'] || 0;
  const a = answerPress(s, g, 'stone', 'Bram', 0);
  check('humble: +4 chemistry for every pair', a.tone === 'humble' && s.chem['frost+thunder'] === chem0 + 4 && a.label === 'Credit the team', a);
  check('...a headline in the news', s.news.at(-1).k === 'press' && s.news.at(-1).tone === 'humble' && s.news.at(-1).name === 'Bram' && s.news.at(-1).team === 'comets');
  check('...and the next feud waits', s.pressAt === 10 && !pressWorthy(s, g));
  s.record.played += PRESS_GAP;
  check('...for three league games', pressWorthy(s, g));
  answerPress(s, g, 'stone', 'Bram', 1);
  check('confident: fired up next match', buffEffects(s.buffs).ultStart === 25);
  answerPress(s, { ...g, won: false }, 'stone', 'Bram', 2);
  check('fiery: the crowd ready to chant', buffEffects(s.buffs).hype === true && s.buffs.filter((b) => b.id === 'hype').length === 1);
  check('...worded for a loss', answerPress(s, { ...g, won: false }, 'stone', 'Bram', 2).label === 'Wait for the rematch');
  check('every answer has its edge and a headline', PRESS_ANSWERS.every((x) => x.fx && x.win.label && x.loss.reply && pressHeadline(x.tone) === x.news.line));
  check('an answer that isn\'t one does nothing', answerPress(s, g, 'stone', 'Bram', 7) === null);
}

console.log(`press: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
