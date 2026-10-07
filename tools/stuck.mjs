// Find matches that stall: node tools/stuck.mjs [matches]
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
const team = () => ({ skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 } } });
const N = +(process.argv[2] || 20);
for (let i = 0; i < N; i++) {
  const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 1000 + i, powers: ['fire', 'ice', 'lightning', 'gravity'], diff: [0.6, 0.6] });
  let t = 0, lastGoal = 0, still = 0, lx = 0, ly = 0;
  m.on('goal', () => { lastGoal = t; });
  while (m.state !== 'over' && t < 900) {
    m.update(1 / 60); t += 1 / 60;
    const p = m.puck;
    if (Math.hypot(p.x - lx, p.y - ly) < 30) still += 1 / 60; else { still = 0; lx = p.x; ly = p.y; }
    if (still > 8) {
      console.log(`seed ${1000 + i} t=${t.toFixed(0)} state=${m.state} puck=(${p.x | 0},${p.y | 0}) z=${p.z | 0} v=${p.speed | 0} owner=${p.owner ? p.owner.name || p.owner.id : '-'} inNet=${p.inNet} near=` +
        m.skaters.map((s) => `${s.team}${s.def.id[0]}(${s.x | 0},${s.y | 0})`).join(' ') + ` goalies=` + m.goalies.map((g) => `${g.state}(${g.x | 0},${g.y | 0})`).join(' '));
      still = -60;
    }
  }
  if (t >= 900) console.log(`seed ${1000 + i} STUCK score ${m.score}`);
}
