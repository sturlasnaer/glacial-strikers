// Simple controls (Settings, for the youngest players): one button does the right thing. With
// the puck it shoots in front of their net and passes anywhere else; a button held while the
// puck arrives is no fresh press; without the puck it checks; and the skater nearest the puck
// becomes ours whenever the other side has it (not while our own pass is on its way). In a
// two-player game they can be for one player only. Drills keep their own controls, and whole
// matches run their course.
//   node tools/test_simple.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';
import { newSave, setLittle, LITTLE } from '../src/progress.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const idle = () => ({ mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false });
const make = (seed, extra = {}) => new Match({ teams: [team(), team()], humanTeam: 0, seed, powers: [], diff: [0.5, 0.5], simple: true, ...extra });
const step = (m, inp) => { m.setHumanInput(inp); m.update(1 / 60); };
const events = (m, name) => { const out = []; m.on(name, (e) => out.push(e)); return out; };
// play, the opponents out of the way and both goalies off
const setup = (seed) => {
  const m = make(seed);
  m.state = 'play';
  for (const o of m.teamSkaters(1)) { o.x = -560; o.y = 290; o.parked = true; }
  for (const g of m.goalies) g.disabled = true;
  return m;
};

check('the setting is there, off to begin with', newSave().settings.simple === false);
check('a match takes it', make(1).simple && !new Match({ teams: [team(), team()], humanTeam: 0, seed: 1, powers: [], diff: [0.5, 0.5] }).simple);

// where the button shoots: a wedge out in front of their net
{
  const m = make(2), c = m.controlled();
  const at = (x, y) => { c.x = c.side * x; c.y = y; return m.simpleShot(c); };
  check('in the slot it shoots', at(GOAL_X - 150, 0) && at(GOAL_X - 60, 40));
  check('...out of the wedge it passes', !at(GOAL_X - 40, 200) && !at(GOAL_X - 150, 260) && !at(0, 0) && !at(-300, 0));
  check('...and from behind their net too', !at(GOAL_X + 30, 0));
}

// with the puck in the slot: a tap is a wrist shot
{
  const m = setup(3), c = m.controlled(), shots = events(m, 'shot'), passes = events(m, 'pass');
  c.x = c.side * (GOAL_X - 140); c.y = 0; c.vx = c.vy = 0;
  m.takePossession(c, 'test');
  step(m, { ...idle(), a: true }); step(m, idle());
  check('in the slot: a tap shoots', shots.length === 1 && shots[0].s === c && shots[0].kind === 'wrist' && !passes.length, [shots.length, passes.length]);
}

// with the puck far out: the button (either one) passes
for (const key of ['a', 'b']) {
  const m = setup(4), c = m.controlled(), shots = events(m, 'shot'), passes = events(m, 'pass');
  const mate = m.teamSkaters(0).find((s) => s !== c);
  c.x = -c.side * 200; c.y = 0; c.vx = c.vy = 0; mate.x = c.x + c.side * 180; mate.y = 40;
  m.takePossession(c, 'test');
  step(m, { ...idle(), [key]: true });
  check(`far out: ${key.toUpperCase()} passes`, passes.length === 1 && passes[0].s === c && !shots.length, [passes.length, shots.length]);
  for (let i = 0; i < 20; i++) step(m, { ...idle(), [key]: true });
  check('...holding it on does nothing more', passes.length === 1 && shots.length === 0, [passes.length, shots.length]);
}

// a pass arriving while the button is still held: no pass straight back out
{
  const m = setup(5), c = m.controlled(), passes = events(m, 'pass');
  const mate = m.teamSkaters(0).find((s) => s !== c);
  c.x = -c.side * 200; c.y = 0; mate.x = c.x + c.side * 160; mate.y = 0;
  m.takePossession(c, 'test');
  step(m, { ...idle(), a: true });
  let got = false;
  for (let i = 0; i < 90 && !got; i++) { step(m, { ...idle(), a: true }); got = m.puck.owner === mate && mate.controlled; }
  for (let i = 0; i < 20; i++) step(m, { ...idle(), a: true });
  check('the receiver is ours', got);
  check('...and keeps the puck while the button is held', m.puck.owner === mate && passes.length === 1, [passes.length, m.puck.owner && m.puck.owner.who]);
  step(m, idle()); step(m, { ...idle(), a: true });
  check('...a fresh press passes again', passes.length === 2, passes.length);
}

// no puck: the button checks
{
  const m = make(6), c = m.controlled(), checks = events(m, 'poke');
  m.state = 'play';
  const opp = m.teamSkaters(1)[0];
  c.x = 0; c.y = 0; opp.x = 300; opp.y = 0;
  for (const s of m.teamSkaters(0)) if (s !== c) { s.x = -500; s.y = 250; }
  m.takePossession(opp, 'test');
  step(m, { ...idle(), a: true });
  check('no puck: a press pokes at the puck (no body checks for the youngest)', checks.length === 1 && checks[0].s === c && c.state === 'poke', checks.length);
}

// the nearest skater to the puck is ours when they have it
{
  const m = make(7);
  m.state = 'play';
  const c = m.controlled(), [near, far] = m.teamSkaters(0).filter((s) => s !== c);
  const opp = m.teamSkaters(1)[0];
  opp.x = 0; opp.y = 0; c.x = -450; c.y = 0; near.x = 80; near.y = 30; far.x = -300; far.y = -200;
  m.takePossession(opp, 'test');
  m.setHumanInput(idle()); m.applyHuman();
  check('they have it: the nearest skater is ours', m.controlled() === near && !c.controlled, m.controlled() && m.controlled().who);
  // and not straight back and forth: once in 0.6 seconds at most
  near.x = -500; c.x = 60;
  m.setHumanInput(idle()); m.applyHuman();
  check('...not again straight away', m.controlled() === near);
  m.time += 0.7;
  m.setHumanInput(idle()); m.applyHuman();
  check('...but after a moment', m.controlled() === c);
  // a skater only a little nearer: no switch
  const m2 = make(8);
  m2.state = 'play';
  const c2 = m2.controlled(), o2 = m2.teamSkaters(1)[0], n2 = m2.teamSkaters(0).find((s) => s !== c2);
  for (const s of m2.teamSkaters(0)) { s.x = -500; s.y = 250; }
  o2.x = 0; o2.y = 0; c2.x = 120; c2.y = 0; n2.x = 90; n2.y = 0;
  m2.takePossession(o2, 'test');
  m2.setHumanInput(idle()); m2.applyHuman();
  check('...only a little nearer: we keep ours', m2.controlled() === c2);
}

// our own pass on its way: no switching to someone else along its path
{
  const m = setup(9), c = m.controlled(), [to, other] = m.teamSkaters(0).filter((s) => s !== c);
  c.x = -300; c.y = 0; to.x = 300; to.y = 0; other.x = 0; other.y = 30;
  m.takePossession(c, 'test');
  m.pass(c, to);
  let wrong = false;
  for (let i = 0; i < 120 && m.puck.owner !== to; i++) { step(m, idle()); if (m.controlled() === other) wrong = true; }
  check('our pass on its way: it goes to the receiver', !wrong && m.controlled() === to, m.controlled() && m.controlled().who);
}

// drills keep their own controls
check('not in drills', !new Match({ teams: [team(), team()], humanTeam: 0, seed: 1, powers: [], diff: [0.5, 0.5], simple: true, drill: { init() {}, update() {} } }).simple);

// two players: Simple controls for one of them only
{
  const base = { teams: [team(), team()], seed: 12, powers: [], diff: [0.5, 0.5] };
  const vs = new Match({ ...base, humanTeam: 0, humans: [0, 1], simple: ['p2'] });
  check('against each other, player 2 only', vs.simple && !vs.simpleSeat(0, 0) && vs.simpleSeat(1, 0));
  const co = new Match({ ...base, humanTeam: 0, coop: true, simple: ['p2'] });
  check('together, player 2 only', co.simple && !co.simpleSeat(0, 0) && co.simpleSeat(0, 1));
  const both = new Match({ ...base, humanTeam: 0, coop: true, simple: ['p1', 'p2'] });
  check('...or both', both.simpleSeat(0, 0) && both.simpleSeat(0, 1));
  check('...or nobody', !new Match({ ...base, humanTeam: 0, coop: true, simple: [] }).simple);
  // player 1 keeps the full controls (A shoots anywhere); player 2's one button picks shoot or pass
  co.state = 'play';
  for (const o of co.teamSkaters(1)) { o.x = -560; o.y = 290; o.parked = true; }
  const p1 = co.controlled(0, 0), p2 = co.controlled(0, 1);
  p1.x = -co.teamSkaters(0)[0].side * 200; p1.y = 0;
  co.takePossession(p1, 'test');
  co.setHumanInput({ ...idle(), a: true }, 0, 0); co.setHumanInput(idle(), 0, 1);
  co.applyHuman();
  check('...player 1\'s A is still SHOOT far out', p1.in.shoot && !p1.in.pass);
  co.setHumanInput(idle(), 0, 0); co.applyHuman(); for (const k of co.skaters) k.prevIn = { ...k.in };
  co.takePossession(p2, 'test');
  co.setHumanInput({ ...idle(), a: true }, 0, 1);
  co.applyHuman();
  check('...player 2\'s one button picks for them', p2.simpleAct === (co.simpleShot(p2) ? 'shoot' : 'pass'));
}

// Little player: one tap sets it all up, and off puts the player's own settings back
{
  const st = { ...newSave().settings, difficulty: 'hard', speed: 'normal', assist: 'off', touchSize: 'huge', puck: 'normal', simple: false };
  const before = JSON.stringify(st);
  setLittle(st, true);
  check('Little player: Simple controls, easy rivals and the rest', st.little && Object.entries(LITTLE).every(([k, v]) => st[k] === v));
  setLittle(st, true);
  check('...twice changes nothing', st.little && st.littlePrev.difficulty === 'hard');
  setLittle(st, false);
  check('...and off, everything as it was', JSON.stringify(st) === before && st.difficulty === 'hard' && !st.simple && st.touchSize === 'huge' && !st.little, st);
}

// whole matches, a small player pressing now and then and steering at the puck (or their net)
{
  const run = (seed) => {
    const m = make(seed);
    let f = 0;
    while (m.state !== 'over' && f < 60 * 900) {
      const c = m.controlled(), p = m.puck;
      const tx = c && c.hasPuck ? c.side * GOAL_X : p.x, ty = c && c.hasPuck ? 0 : p.y;
      const d = c ? Math.hypot(tx - c.x, ty - c.y) || 1 : 1;
      const inp = c ? { ...idle(), mx: (tx - c.x) / d, my: (ty - c.y) / d, a: f % 50 < 4 } : idle();
      step(m, inp);
      f++;
    }
    return m;
  };
  let over = 0;
  const ms = [];
  for (let i = 0; i < 4; i++) { const m = run(100 + i); ms.push(m); if (m.state === 'over') over++; }
  check('four matches with Simple controls finish', over === 4, over);
  const a = run(100), b = ms[0];
  check('...the same seed and presses, the same match', JSON.stringify(a.score) === JSON.stringify(b.score) && a.time === b.time, [a.score, b.score]);
  const goals = ms.reduce((n, m) => n + m.score[0], 0);
  check('...and the small player scores some', goals > 0, goals);
}

console.log(`Simple controls: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
