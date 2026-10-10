// Local co-op: two players on our team, each with a skater of their own (a seat), the AI on the
// third. Switching never takes the other player's skater, a pass is followed by whoever made
// it, a player left without a skater picks up a free one, and whole matches run their course.
//   node tools/test_coop.mjs
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const idle = () => ({ mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false, pull: false });
const make = (seed, coop = true) => new Match({ teams: [team(), team()], humanTeam: 0, coop, seed, powers: [], diff: [0.5, 0.5] });
const seatsOk = (m) => {
  const mine = m.teamSkaters(0).filter((s) => s.controlled);
  const seats = mine.map((s) => s.seat || 0);
  return mine.length <= 2 && new Set(seats).size === seats.length && !m.teamSkaters(1).some((s) => s.controlled);
};

// the faceoff: one player takes the draw, the other the next skater, and they take turns
{
  const m = make(1);
  const a = m.controlled(0, 0), b = m.controlled(0, 1);
  check('two players, two skaters', a && b && a !== b, [a && a.who, b && b.who]);
  check('...nobody on the other team', !m.teamSkaters(1).some((s) => s.controlled));
  const first = m.faceoffCenter(0).seat;
  m.setupFaceoff();
  check('...the draw goes to the other player next time', m.faceoffCenter(0).seat === 1 - first);
  const solo = make(1, false);
  check('one player: one skater, as before', solo.teamSkaters(0).filter((s) => s.controlled).length === 1 && !solo.coop);
}

// switching: only to the free skater, and only your own control moves
{
  const m = make(2);
  m.state = 'play';
  const opp = m.teamSkaters(1)[0];
  m.takePossession(opp, 'test');
  const a = m.controlled(0, 0), b = m.controlled(0, 1), free = m.teamSkaters(0).find((s) => !s.controlled);
  m.setHumanInput({ ...idle(), b: true }, 0, 0); m.setHumanInput(idle(), 0, 1);
  m.applyHuman();
  check('switch: player 1 takes the free skater', m.controlled(0, 0) === free, m.controlled(0, 0) && m.controlled(0, 0).who);
  check('...player 2 keeps theirs', m.controlled(0, 1) === b);
  check('...the old one goes to the AI', !a.controlled);
  for (let i = 0; i < 3; i++) { m.setHumanInput(idle(), 0, 0); m.applyHuman(); for (const s of m.skaters) s.prevIn = { ...s.in }; }
  m.setHumanInput(idle(), 0, 0); m.setHumanInput({ ...idle(), b: true }, 0, 1);
  m.applyHuman();
  check('player 2 switches to the skater player 1 left', m.controlled(0, 1) === a && m.controlled(0, 0) === free);
}

// a pass: whoever made it follows it to the receiver
{
  const m = make(3);
  m.state = 'play';
  const p2 = m.controlled(0, 1), p1 = m.controlled(0, 0), ai = m.teamSkaters(0).find((s) => !s.controlled);
  for (const o of m.teamSkaters(1)) { o.x = -500; o.y = 300; }
  p2.x = 0; p2.y = 0; ai.x = 160; ai.y = 0; p1.x = -200; p1.y = -200;
  m.takePossession(p2, 'test');
  m.pass(p2, ai);
  let caught = false;
  for (let i = 0; i < 120 && !caught; i++) { m.setHumanInput(idle(), 0, 0); m.setHumanInput(idle(), 0, 1); m.update(1 / 60); caught = m.puck.owner === ai; }
  check('the pass arrives', caught, m.puck.owner && m.puck.owner.who);
  check('...and player 2 has the receiver', m.controlled(0, 1) === ai, m.controlled(0, 1) && m.controlled(0, 1).who);
  check('...player 1 still has theirs', m.controlled(0, 0) === p1);
  check('...the passer goes to the AI', !p2.controlled);
}

// off to the box with nobody free: the player waits, then takes the one who comes back
{
  const m = make(4);
  m.state = 'play';
  const [x, y, z] = m.teamSkaters(0);
  for (const s of [x, y, z]) { s.controlled = false; s.seat = 0; }
  x.controlled = true; x.seat = 0; y.controlled = true; y.seat = 1;
  z.parked = true; z.boxT = 5; // (already in the box)
  m.pendingPenalty = { s: y, reason: 'Hooking' };
  m.whistlePenalty();
  check('in the box: player 2 has nobody', !m.controlled(0, 1) && m.controlled(0, 0) === x);
  m.state = 'play';
  m.releaseFromBox(z, false);
  m.setHumanInput(idle(), 0, 0); m.setHumanInput(idle(), 0, 1);
  m.applyHuman();
  check('...and takes the skater back from the box', m.controlled(0, 1) === z, m.controlled(0, 1) && m.controlled(0, 1).who);
  check('...seats still apart', seatsOk(m));
}

// whole matches: two simple players chase the puck, carry it in and shoot; the seats never
// share a skater and the matches finish
{
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const bot = (m, seat) => {
    const c = m.controlled(0, seat), p = m.puck, out = idle();
    if (!c) return out;
    const tx = p.owner === c ? GOAL_X - 120 : p.x, ty = p.owner === c ? 0 : p.y;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
    out.mx = dx / d; out.my = dy / d; out.sprint = rnd() < 0.4;
    if (p.owner === c) { out.a = d < 140 && rnd() < 0.5; out.b = rnd() < 0.02; }
    else { out.a = rnd() < 0.05; out.b = rnd() < 0.01; }
    out.skill = rnd() < 0.01; out.ult = rnd() < 0.01;
    return out;
  };
  let over = 0, bad = 0, goals = [0, 0], switches = 0;
  for (let i = 0; i < 8; i++) {
    const m = make(100 + i);
    m.on('switch', () => switches++);
    for (let t = 0; t < 1500 && m.state !== 'over'; t += 1 / 60) {
      m.setHumanInput(bot(m, 0), 0, 0); m.setHumanInput(bot(m, 1), 0, 1);
      m.update(1 / 60);
      if (!seatsOk(m)) bad++;
    }
    if (m.state === 'over') over++;
    goals[0] += m.score[0]; goals[1] += m.score[1];
  }
  check('eight co-op matches finish', over === 8, over);
  check('...the seats never share a skater or cross over', bad === 0, bad);
  check('...goals at both ends', goals[0] > 0 && goals[1] > 0, goals);
  check('...and control moves around', switches > 20, switches);
}

console.log(`Co-op: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
