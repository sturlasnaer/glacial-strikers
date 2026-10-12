// How crowded the ice is from the player's side: the scripted player of tools/sim_player.mjs (who
// pauses a moment after a catch before passing, as a person does) against the AI at each level.
// Per level: while the player carries the puck, opponents within 100 (about a sixth of the rink's
// width) and how often two or more are (by zone: own end, middle, their end), the player's own
// teammates on top of the carrier; over all play, skaters by the puck and scrums (4 of 6 within
// 100). AI=1 runs AI v AI for comparison (the AI's own carrier).
//   node tools/sim_crowd.mjs [matches=16] [diff ...]      e.g. node tools/sim_crowd.mjs 16 0.12 0.55 0.75
//   PLAN=forecheck (or trap, rungun) for the AI's game plan, SIMPLE=1 for Simple controls
// (2026-10-12, after the spacing change: two or more on the carrier about 24% easiest, 39% top; an
// AI carrier 17-20%; scrums 12-13%)
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X, BLUE_X } from '../src/rink.js';

const N = +(process.argv[2] || 16);
const diffs = process.argv.slice(3).map(Number);
const AI = process.env.AI === '1';
const NEAR = 100;
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function probe(diff) {
  const z = { def: [0, 0, 0], mid: [0, 0, 0], off: [0, 0, 0] }; // carry frames, opponents near, two or more
  const t = { carryF: 0, oppNear: 0, double: 0, mateNear: 0, playF: 0, puckCrowd: 0, scrum: 0, wins: 0, gf: 0, ga: 0 };
  for (let i = 0; i < N; i++) {
    const m = new Match({ teams: [team(), team()], humanTeam: AI ? null : 0, seed: 900 + i, powers: [], diff: [0.6, diff], simple: !!process.env.SIMPLE, plans: ['balanced', process.env.PLAN || 'balanced'] });
    const rnd = ((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(31 + i);
    let f = 0;
    while (m.state !== 'over' && f < 60 * 600) {
      const p = m.puck, c = AI ? (p.owner && p.owner.team === 0 ? p.owner : m.teamSkaters(0)[0]) : m.controlled();
      const inp = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false };
      if (c && m.state === 'play') {
        const all = [...m.teamSkaters(0), ...m.teamSkaters(1)], byPuck = all.filter((s) => dist(s, p) < NEAR).length;
        t.playF++; t.puckCrowd += byPuck; if (byPuck >= 4) t.scrum++;
        if (c.hasPuck) {
          t.carryF++;
          const opp = m.teamSkaters(1).filter((o) => dist(o, c) < NEAR).length, ax = c.x * c.side;
          const zone = ax > BLUE_X ? 'off' : ax < -BLUE_X ? 'def' : 'mid';
          t.oppNear += opp; if (opp >= 2) t.double++;
          z[zone][0]++; z[zone][1] += opp; if (opp >= 2) z[zone][2]++;
          t.mateNear += m.teamSkaters(0).filter((s) => s !== c && dist(s, c) < NEAR * 0.8).length;
          const tx = c.side * GOAL_X * 0.8, ty = Math.sin(f / 50) * 90, d = Math.hypot(tx - c.x, ty - c.y) || 1;
          inp.mx = (tx - c.x) / d; inp.my = (ty - c.y) / d;
          inp.sprint = c.stamina > 40;
          inp.a = Math.abs(c.side * GOAL_X - c.x) < 260 && f % 20 < 3;
          let near = 1e9; for (const o of m.teamSkaters(1)) near = Math.min(near, dist(o, c));
          if (!inp.a && near < 75 && f % 15 === 0 && m.time - (c.recvT ?? -9) > 0.8) inp.b = true;
        } else {
          const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
          inp.mx = (p.x - c.x) / d; inp.my = (p.y - c.y) / d;
          inp.sprint = d > 120 && c.stamina > 50;
          inp.a = p.owner && p.owner.team === 1 && d < 50 && rnd() < 0.05;
          inp.b = !p.owner && d > 260 && f % 40 === 0;
        }
      }
      if (!AI) m.setHumanInput(inp);
      m.update(1 / 60);
      f++;
    }
    t.gf += m.score[0]; t.ga += m.score[1]; if (m.score[0] > m.score[1]) t.wins++;
  }
  const pc = (x, n) => `${Math.round((100 * x) / Math.max(1, n))}%`;
  const zs = ['def', 'mid', 'off'].map((k) => `${k} ${pc(z[k][2], z[k][0])}`).join(' ');
  return `diff ${diff.toFixed(2)}${AI ? ' [AI v AI]' : ''}  carrier: opponents near ${(t.oppNear / t.carryF).toFixed(2)}, two or more ${pc(t.double, t.carryF)} (${zs}), own mates on top ${(t.mateNear / t.carryF).toFixed(2)}  |  by the puck ${(t.puckCrowd / t.playF).toFixed(2)}, scrums ${pc(t.scrum, t.playF)}  |  ${(t.gf / N).toFixed(1)}–${(t.ga / N).toFixed(1)}, wins ${t.wins}/${N}`;
}

for (const d of diffs.length ? diffs : [0.12, 0.35, 0.55, 0.75]) console.log(probe(d));
