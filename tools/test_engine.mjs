// The match engine's housekeeping: a puck nobody can reach gets played or whistled, nobody
// passes to the penalty box, the goalie covers a sharp angle as well as a straight shot,
// someone stays home on defence, and skaters stay on the ice.
//   node tools/test_engine.mjs
import { Match } from '../src/match.js';
import { CHARACTERS, makeDef } from '../src/data.js';
import { GOAL_X, DOTS, insideDepth, netBox } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const KITS = ['frost', 'thunder', 'stone'];
const team = () => ({ chem: {}, goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, skaters: KITS.map((k) => ({ def: makeDef(k), stats: { ...CHARACTERS[k].base }, perks: [] })) });
const mk = (seed = 5) => new Match({ teams: [team(), team()], humanTeam: null, seed, powers: [], diff: [0.6, 0.6] });

// a dead puck behind the net, everyone in front of it: played, or whistled and faced off
{
  let slow = 0, n = 0, whistles = 0;
  for (const side of [-1, 1]) for (const py of [0, 20, -10]) for (let seed = 1; seed <= 5; seed++) {
    const m = mk(seed * 7 + 3);
    m.state = 'play';
    Object.assign(m.puck, { x: side * (GOAL_X + 56), y: py, z: 0, vx: 0, vy: 0, vz: 0, owner: null, shot: null, pass: null });
    m.skaters.forEach((s, i) => { s.x = side * (GOAL_X - 70); s.y = (i - 2.5) * 30; s.vx = s.vy = 0; });
    m.on('stall', () => whistles++);
    let t = 0;
    while (t < 8 && !m.puck.owner && m.state === 'play') { m.update(1 / 60); t += 1 / 60; }
    n++;
    if (t >= 8) slow++;
  }
  check('a puck behind the net is played or whistled within 8 s', slow === 0, { slow, n, whistles });
}
{
  const m = mk(3), seen = [];
  m.state = 'play';
  m.on('stall', (e) => seen.push(e));
  // wedged where nobody goes: nobody moves (the AI is told to stand still)
  for (const a of m.ai) a.update = () => {};
  Object.assign(m.puck, { x: GOAL_X + 56, y: 24, z: 0, vx: 0, vy: 0, owner: null });
  for (const s of m.skaters) { s.x = -300; s.y = s.slot * 40; s.parked = false; }
  for (let i = 0; i < 60 * 7 && !seen.length; i++) m.update(1 / 60);
  check('...and a stall is whistled to the nearest dot', seen.length === 1 && m.state === 'faceoff' && m.puck.x === DOTS[3].x && m.puck.y === DOTS[3].y, [seen.length, m.state, m.puck.x, m.puck.y]);
}

// nobody passes to a teammate in the penalty box
{
  let toBox = 0, passes = 0;
  for (let seed = 0; seed < 6; seed++) {
    const m = mk(40 + seed);
    m.state = 'play';
    const boxed = m.teamSkaters(0)[1];
    m.on('pass', (e) => { passes++; if (e.to === boxed) toBox++; });
    m.pendingPenalty = { s: boxed, reason: 'Tripping' };
    m.whistlePenalty();
    for (let i = 0; i < 60 * 20 && boxed.parked; i++) m.update(1 / 60);
  }
  check('no pass goes to the penalty box', toBox === 0 && passes > 20, { toBox, passes });
  const m = mk(9);
  m.state = 'play';
  const [a, b] = m.teamSkaters(0);
  b.parked = true;
  m.takePossession(a, 'catch');
  m.pass(a, b);
  check('...not even when it\'s asked for', !m.puck.pass || m.puck.pass.to !== b);
}

// the goalie: a shot at their body is saved from a sharp angle as from straight on
{
  const sharp = (y0) => {
    const m = mk(2);
    m.state = 'play';
    for (const s of m.skaters) { s.x = -500; s.y = s.slot * 50 - 50; }
    const g = m.goalieAt(1), shooter = m.teamSkaters(0)[0];
    g.x = GOAL_X - 28; g.y = 0; g.setState('ready');
    shooter.x = GOAL_X - 100; shooter.y = y0;
    m.takePossession(shooter, 'catch');
    // aimed at the goalie's middle
    const p = m.puck; p.x = shooter.x + 10; p.y = y0;
    const dx = g.x - p.x, dy = g.y - p.y, l = Math.hypot(dx, dy);
    m.loosePuck(shooter);
    Object.assign(p, { vx: (dx / l) * 900, vy: (dy / l) * 900, vz: 0, z: 0, shot: { by: shooter, kind: 'wrist', t: m.time, team: 0 } });
    let saved = false, scored = false;
    m.on('save', () => { saved = true; });
    m.on('goal', () => { scored = true; });
    for (let i = 0; i < 40 && !saved && !scored; i++) m.update(1 / 60);
    return { saved, scored };
  };
  const straight = sharp(0), angle = sharp(130);
  check('a shot into the goalie is saved straight on', straight.saved && !straight.scored, straight);
  check('...and from a sharp angle', angle.saved && !angle.scored, angle);
}

// defence: with the carrier past the one pressing, somebody heads back between them and the net
{
  let ok = 0, n = 0;
  for (let seed = 0; seed < 8; seed++) {
    const m = mk(60 + seed);
    m.state = 'play';
    const ai = m.ai[1], c = m.teamSkaters(0)[0];
    // our carrier breaking in on the right-hand net, team 1 all caught up ice
    c.x = 250 + seed * 20; c.y = 40 - seed * 10; c.vx = 240; c.vy = 0;
    m.teamSkaters(0).slice(1).forEach((s, i) => { s.x = -100; s.y = i ? 150 : -150; });
    m.teamSkaters(1).forEach((s, i) => { s.x = 120 + i * 30; s.y = -120 + i * 120; s.vx = s.vy = 0; });
    m.takePossession(c, 'catch');
    const mine = m.teamSkaters(1), roles = ai.plan(mine, c, false, true, false);
    n++;
    if ([...roles.values()].some((r) => r.kind === 'spot' && r.x > c.x + 20 && Math.abs(r.y - c.y * 0.45) < 130)) ok++;
  }
  check('someone heads back between the carrier and the net', ok === n, { ok, n });
}

// penalty shots: a breakaway carrier hauled down from behind gets one, alone against the goalie;
// everyone's back for the faceoff after, and nobody went to the box
{
  let shots = 0, ends = 0, alone = true, back = true, boxed = 0;
  for (let seed = 0; seed < 6; seed++) {
    const m = mk(120 + seed);
    m.state = 'play';
    const shooter = m.teamSkaters(0)[1], foul = m.teamSkaters(1)[0];
    m.on('penalty_shot', () => { shots++; if (m.skaters.filter((s) => !s.parked).length !== 1 || m.puck.owner !== shooter) alone = false; });
    m.on('penalty_shot_over', () => ends++);
    m.on('goal', () => ends++);
    m.pendingPenalty = { s: foul, reason: 'Hooking', shot: shooter };
    m.whistlePenalty();
    for (let i = 0; i < 60 * 20 && !(ends && m.state === 'faceoff'); i++) m.update(1 / 60);
    if (m.skaters.some((s) => s.parked)) back = false;
    if (foul.boxT > 0) boxed++;
  }
  check('a penalty shot is taken alone against the goalie', shots === 6 && alone, { shots, alone });
  check('...and play resumes with everyone back, nobody in the box', ends === 6 && back && boxed === 0, { ends, back, boxed });
  // and it's called: take a breakaway carrier down from behind
  let called = 0;
  for (let seed = 0; seed < 30; seed++) {
    const m = mk(200 + seed);
    m.state = 'play';
    const c = m.teamSkaters(0)[0], d = m.teamSkaters(1)[0];
    for (const o of m.skaters) if (o !== c && o !== d) { o.x = -400; o.y = o.slot * 60 - 60; }
    c.x = 200; c.y = 0; c.vx = 260; c.vy = 0; d.x = 175; d.y = 0;
    m.takePossession(c, 'catch');
    m.judgeHit(d, c, 300, true, 10);
    if (m.pendingPenalty && m.pendingPenalty.shot === c) called++;
  }
  check('...called on about half the breakaway hits from behind', called >= 8 && called <= 22, called);
  // ...but never on a head-on or side check (the ref judges the play before the knockback)
  let wrong = 0;
  for (let seed = 0; seed < 40; seed++) for (const ang of [0, Math.PI / 2, -Math.PI / 2]) {
    const m = mk(300 + seed);
    m.state = 'play';
    const c = m.teamSkaters(0)[0], d = m.teamSkaters(1)[0];
    for (const o of m.skaters) if (o !== c && o !== d) { o.x = -400; o.y = o.slot * 60 - 60; }
    c.x = 200; c.y = 0; c.vx = 260; c.vy = 0;
    d.x = c.x + Math.cos(ang) * 28; d.y = c.y + Math.sin(ang) * 28; d.vx = -Math.cos(ang) * 200; d.vy = -Math.sin(ang) * 200;
    m.takePossession(c, 'catch');
    m.hit(d, c);
    if (m.pendingPenalty && m.pendingPenalty.shot) wrong++;
  }
  check('...and never on a head-on or side check', wrong === 0, wrong);
  // the shot itself: one chance (a save ends it), nobody assists it, and a pulled goalie goes back in
  let rebound = 0, assisted = 0, empty = 0, done = 0;
  for (let seed = 0; seed < 40; seed++) {
    const m = mk(400 + seed);
    m.state = 'play';
    const shooter = m.teamSkaters(0)[1], mate = m.teamSkaters(0)[2], foul = m.teamSkaters(1)[0];
    m.takePossession(mate, 'catch'); m.pass(mate, shooter); // (a pass before the foul: no assist from it)
    if (seed % 4 === 0) { m.score = [4, 3]; m.pullGoalie(1); }
    m.pendingPenalty = { s: foul, reason: 'Hooking', shot: shooter };
    m.whistlePenalty();
    let saved = false, live = true;
    m.on('penalty_shot', () => { if (m.goalieAt(1).disabled) empty++; });
    m.on('save', () => { saved = true; });
    m.on('goal', (g) => { if (live) { if (saved) rebound++; if (g.assists && g.assists.length) assisted++; } });
    m.on('penalty_shot_over', () => { live = false; done++; });
    for (let i = 0; i < 60 * 20 && (live || m.state !== 'faceoff'); i++) { m.update(1 / 60); if (m.state === 'faceoff' || m.state === 'over') live = false; }
  }
  check('...a penalty shot is one chance: no goals off a rebound', rebound === 0, rebound);
  check('...nobody gets an assist on it', assisted === 0, assisted);
  check('...and it\'s never on an empty net', empty === 0, empty);
}

// a penalty shot against the player's team: they take over in goal for it, and hand back after
{
  const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 77, powers: [], diff: [0.6, 0.6] });
  m.state = 'play';
  const shooter = m.teamSkaters(1)[0], foul = m.teamSkaters(0)[0], g = m.goalies.find((k) => k.team === 0);
  let during = false;
  m.on('penalty_shot', () => { during = g.human; });
  m.pendingPenalty = { s: foul, reason: 'Hooking', shot: shooter };
  m.whistlePenalty();
  const idle = { mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false };
  for (let i = 0; i < 60 * 15 && m.state !== 'faceoff'; i++) { m.setHumanInput(idle); m.update(1 / 60); }
  for (let i = 0; i < 60 * 6 && m.state !== 'faceoff'; i++) { m.setHumanInput(idle); m.update(1 / 60); }
  check('the player takes over in goal for a penalty shot against them', during && !g.human, { during, after: g.human });
}

// whole matches: skaters never end up in the boards or a net
{
  let worst = 0, inNet = 0;
  for (let seed = 0; seed < 4; seed++) {
    const m = mk(80 + seed);
    for (let t = 0; t < 60 * 120 && m.state !== 'over'; t++) {
      m.update(1 / 60);
      for (const s of m.skaters) {
        if (s.parked) continue;
        worst = Math.max(worst, s.r - insideDepth(s.x, s.y));
        for (const side of [-1, 1]) { const b = netBox(side); if (s.x > b.x0 + 4 && s.x < b.x1 - 4 && s.y > b.y0 + 4 && s.y < b.y1 - 4) inNet++; }
      }
    }
  }
  check('skaters stay on the ice', worst < 1.5, worst.toFixed(2));
  check('...and out of the nets', inNet === 0, inNet);
}

console.log(`engine: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
