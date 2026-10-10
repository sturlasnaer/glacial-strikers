// How the AI feels from the player's side: team 0 is driven by a plain scripted "player" (carry
// the puck up the ice, shoot near the net, chase the puck without it, a check now and then),
// the other team by the AI at a given difficulty. Prints, per minute of play: the player's
// carries lost to AI sticks (steals) and to hits, the hits the player's skaters take, how long
// a carry lasts, how close the nearest defender crowds the carrier, and the score.
//   node tools/sim_player.mjs [matches] [diff ...]      e.g. node tools/sim_player.mjs 12 0.12 0.35 0.55
//   SIMPLE=1 for Simple controls, PLAN=forecheck (or trap, rungun) for the AI's game plan
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';

const N = +(process.argv[2] || 12);
const diffs = process.argv.slice(3).map(Number);
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, chem: {} });

export function probe(diff, n = N, simple = !!process.env.SIMPLE) {
  const tot = { min: 0, steals: 0, hitLoss: 0, hitsTaken: 0, carries: 0, carryT: 0, crowd: 0, crowdN: 0, gf: 0, ga: 0, wins: 0, passes: 0, done: 0, picked: 0, open: 0, openN: 0 };
  for (let i = 0; i < n; i++) {
    const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 500 + i, powers: [], diff: [0.6, diff], simple, twist: 'none', plans: ['balanced', process.env.PLAN || 'balanced'] });
    let carryStart = null, f = 0, inFlight = false;
    m.on('pass', (e) => { if (e.s.team === 0 && e.s.controlled) { tot.passes++; inFlight = true; } });
    m.on('steal', (e) => { if (e.from && e.from.team === 0 && e.from.controlled) tot.steals++; });
    m.on('hit', (e) => { if (e.b.team === 0) { tot.hitsTaken++; if (e.stripped && e.b.controlled) tot.hitLoss++; } });
    const rnd = ((s) => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(77 + i);
    while (m.state !== 'over' && f < 60 * 600) {
      const c = m.controlled(), p = m.puck;
      const inp = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false };
      if (c && m.state === 'play') {
        if (c.hasPuck) {
          const tx = c.side * GOAL_X * 0.8, ty = Math.sin(f / 50) * 90; // (a little weave)
          const d = Math.hypot(tx - c.x, ty - c.y) || 1;
          inp.mx = (tx - c.x) / d; inp.my = (ty - c.y) / d;
          inp.sprint = c.stamina > 40;
          inp.a = Math.abs(c.side * GOAL_X - c.x) < 260 && f % 20 < 3;
          // pressed: pass (the room the open teammate has is counted too)
          let near = 1e9;
          for (const o of m.teamSkaters(1)) near = Math.min(near, Math.hypot(o.x - c.x, o.y - c.y));
          if (!inp.a && near < 75 && f % 15 === 0) inp.b = true;
          for (const mate of m.teamSkaters(0)) if (mate !== c) { let d = 1e9; for (const o of m.teamSkaters(1)) d = Math.min(d, Math.hypot(o.x - mate.x, o.y - mate.y)); tot.open += Math.min(d, 400); tot.openN++; }
          if (carryStart === null) carryStart = m.time;
          tot.crowd += Math.min(near, 400); tot.crowdN++;
        } else {
          if (carryStart !== null) { tot.carries++; tot.carryT += m.time - carryStart; carryStart = null; }
          const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
          inp.mx = (p.x - c.x) / d; inp.my = (p.y - c.y) / d;
          inp.sprint = d > 120 && c.stamina > 50;
          inp.a = p.owner && p.owner.team === 1 && d < 50 && rnd() < 0.05;
          inp.b = !p.owner && d > 260 && f % 40 === 0; // (switch to someone nearer now and then)
        }
      }
      m.setHumanInput(inp);
      m.update(1 / 60);
      f++;
      if (inFlight && m.puck.owner) { inFlight = false; if (m.puck.owner.team === 0) tot.done++; else tot.picked++; }
      else if (inFlight && m.state !== 'play') inFlight = false;
    }
    tot.min += f / 60 / 60;
    tot.gf += m.score[0]; tot.ga += m.score[1];
    if (m.score[0] > m.score[1]) tot.wins++;
  }
  return {
    diff,
    steals: tot.steals / tot.min, hitLoss: tot.hitLoss / tot.min, hitsTaken: tot.hitsTaken / tot.min,
    carry: tot.carryT / Math.max(1, tot.carries), crowd: tot.crowd / Math.max(1, tot.crowdN),
    passes: tot.passes / tot.min, passOk: tot.done / Math.max(1, tot.done + tot.picked), open: tot.open / Math.max(1, tot.openN),
    score: `${(tot.gf / n).toFixed(1)}–${(tot.ga / n).toFixed(1)}`, wins: `${tot.wins}/${n}`, minutes: tot.min / n,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const d of diffs.length ? diffs : [0.12, 0.35, 0.55]) {
    const r = probe(d);
    console.log(`diff ${d.toFixed(2)}  steals/min ${r.steals.toFixed(2)}  lost to hits/min ${r.hitLoss.toFixed(2)}  hits taken/min ${r.hitsTaken.toFixed(2)}  passes ${r.passes.toFixed(1)}/min, ${Math.round(r.passOk * 100)}% reach  carrier space ${r.crowd.toFixed(0)}  mates' space ${r.open.toFixed(0)}  score ${r.score}  wins ${r.wins}`);
  }
}
