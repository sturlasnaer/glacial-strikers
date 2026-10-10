// The Resurfacer drill: the machine stays in its area and turns like one, the grid counts what
// it has cleaned, the clock ends it at a minute (or a clean rink sooner), and the medals and
// score read as percentages. No online board.
//   node tools/test_resurface.mjs
import { createDrill, DRILLS, medalFor, formatScore } from '../src/drills.js';
import { DrivenResurfacer, clampDrive, DRIVE } from '../src/scenery.js';
import { newSave } from '../src/progress.js';
import { Match } from '../src/match.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

// the machine
{
  const r = new DrivenResurfacer();
  const x0 = r.x;
  for (let i = 0; i < 60; i++) r.drive(1 / 60, 1, 0, false);
  check('it drives where the stick points, at its own pace', r.x > x0 + 150 && r.x < x0 + 245 && Math.abs(r.y) < 1, r.x - x0);
  const h0 = r.heading;
  r.drive(1 / 60, 0, 1, false);
  check('...and turns gradually, like a machine', r.heading > h0 && r.heading - h0 <= DRIVE.TURN / 60 + 1e-9);
  for (let i = 0; i < 60 * 8; i++) r.drive(1 / 60, 1, 1, true);
  const c = clampDrive(r.x, r.y);
  check('...never out of its area (the corners are round)', Math.abs(c.x - r.x) < 1e-6 && Math.abs(c.y - r.y) < 1e-6 && r.x <= DRIVE.X && r.y <= DRIVE.Y1);
  const corner = clampDrive(2000, 2000), cx = DRIVE.X - DRIVE.R, cy = DRIVE.Y1 - DRIVE.R;
  check('a far corner comes back onto the rounded edge', Math.abs(Math.hypot(corner.x - cx, corner.y - cy) - DRIVE.R) < 1e-6);
  const still = new DrivenResurfacer(); still.drive(1 / 60, 0, 0, false);
  check('with the stick let go it stays put and leaves no trail', still.speed === 0 && still.trail.length === 0);
}

// the drill
{
  const s = newSave();
  const { cfg, ctrl, def } = createDrill('resurface', s, 'frost', { seed: 1 });
  const m = new Match(cfg);
  check('nobody on the ice, no goalies', m.skaters.every((k) => k.parked) && m.goalies.every((g) => g.disabled));
  check('a grid of ice to clean, a little already under the machine', ctrl.total > 1500 && ctrl.clean > 0 && ctrl.pct < 3, [ctrl.total, ctrl.clean]);
  let t = 0, marks = 0;
  m.on('gate_ok', () => marks++);
  while (m.state !== 'play' && t < 5) { m.update(1 / 60); t += 1 / 60; }
  for (let i = 0; i < 60 * 10; i++) { m.setHumanInput({ mx: Math.cos(i / 90), my: Math.sin(i / 70), sprint: false }); m.update(1 / 60); }
  check('driving cleans the ice', ctrl.pct >= 10 && ctrl.pct < 60, ctrl.pct);
  check('...with a ping every ten percent', marks === Math.floor(ctrl.pct / 10), [marks, ctrl.pct]);
  for (let i = 0; i < 60 * 55 && !ctrl.result; i++) { m.setHumanInput({ mx: 0, my: 0 }); m.update(1 / 60); }
  check('the clock ends it at a minute, scored in percent', ctrl.result && ctrl.result.time === 60 && ctrl.result.score === ctrl.pct, ctrl.result);
  check('percent medals: 60, 78, 90', medalFor(def, 59) === 0 && medalFor(def, 60) === 1 && medalFor(def, 78) === 2 && medalFor(def, 90) === 3 && formatScore(def, 84) === '84%');
  check('no online board for it', DRILLS.resurface.offline === true);
  // a clean rink ends it early
  const b = createDrill('resurface', newSave(), 'frost', { seed: 2 }), m2 = new Match(b.cfg);
  while (m2.state !== 'play') m2.update(1 / 60);
  b.ctrl.cells.fill(2, 0); b.ctrl.clean = b.ctrl.total; m2.update(1 / 60);
  check('...and a clean rink sooner, at 100%', b.ctrl.result && b.ctrl.result.score === 100 && b.ctrl.result.time < 1, b.ctrl.result);
}

console.log(`Resurfacer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
