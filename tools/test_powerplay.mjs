// The Power Play drill: our three against two killers with their third in the box (so both
// sides play special teams), a goal counted and the entry restarted, a clear restarting it too,
// and the clock ending it at 45 seconds.
//   node tools/test_powerplay.mjs
import { createDrill, DRILLS, medalFor, formatScore } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { Match } from '../src/match.js';
import { GOAL_X } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const idle = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false };

const { cfg, ctrl, def } = createDrill('powerplay', newSave(), 'frost', { seed: 5 });
const m = new Match(cfg);
const boxed = m.teamSkaters(1).filter((k) => k.boxT > 0);
check('three of ours, two killers and one of theirs in the box', m.teamSkaters(0).length === 3 && m.teamSkaters(1).length === 3 && boxed.length === 1 && boxed[0].parked);
check('...a power play for us, a kill for them', m.powerPlay(0) === 1 && m.powerPlay(1) === -1);
check('...their goalie in, ours away', !m.goalieAt(1).disabled && m.goalieAt(-1).disabled);
check('...and we enter with the puck', m.puck.owner === m.controlled() && m.controlled().x < 200);
while (m.state !== 'play') { m.setHumanInput(idle); m.update(1 / 60); }

// a goal: counted, then the entry again
m.score = [0, 0];
ctrl.onGoal(m, { side: 1, y: 0 });
check('a goal counts', ctrl.goals === 1 && ctrl.results[0] === 'goal');
for (let i = 0; i < 100; i++) { m.setHumanInput(idle); m.update(1 / 60); }
check('...and the entry starts again at the blue line', m.puck.owner && m.puck.owner.team === 0 && m.puck.owner.x < 260, m.puck.owner && [m.puck.owner.team, Math.round(m.puck.owner.x)]);

// cleared out of the zone: restarted, no goal
const killer = m.teamSkaters(1).find((k) => !k.parked);
m.takePossession(killer, 'test'); killer.x = 20;
m.setHumanInput(idle); m.update(1 / 60);
check('a clear past the blue line restarts it', ctrl.results.at(-1) === 'clear' && ctrl.goals === 1);

// the box clock is the drill's, and the drill ends at 45 seconds
const left = Math.ceil(45 - ctrl.t);
check('the box clock counts the drill down', Math.ceil(boxed[0].boxT) === left, [boxed[0].boxT, left]);
for (let i = 0; i < 60 * 50 && !ctrl.result; i++) { m.setHumanInput(idle); m.update(1 / 60); }
check('it ends at 45 seconds with the goals', ctrl.result && ctrl.result.score === ctrl.goals && ctrl.t >= 45, ctrl.result);
check('medals 2, 3 and 5 goals; it says goals', medalFor(def, 1) === 0 && medalFor(def, 2) === 1 && medalFor(def, 3) === 2 && medalFor(def, 5) === 3 && formatScore(def, 1) === '1 goal' && formatScore(def, 4) === '4 goals');
check('an online board for it', !DRILLS.powerplay.offline);

console.log(`Power Play: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
