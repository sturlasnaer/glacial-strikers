// Headless AI-vs-AI matches for balance tuning: node tools/sim.mjs [matches] [diffA] [diffB]
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';

const N = +(process.argv[2] || 20);
const dA = +(process.argv[3] || 0.6), dB = +(process.argv[4] || 0.6);
const chemLvl = +(process.argv[5] || 0);
const plans = (process.env.PLANS || 'balanced,balanced').split(',');
const chem = { 'frost+thunder': chemLvl, 'frost+stone': chemLvl, 'stone+thunder': chemLvl };
const team = () => ({
  skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })),
  goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' },
  chem,
});
const agg = { pens: 0, ppg: 0, pulls: 0, enGoals: 0, combos: 0, comboGoals: 0, chains: 0, goals: [0, 0], shots: [0, 0], time: 0, wins: [0, 0], kinds: {}, passes: 0, steals: 0, hits: 0, saves: 0, stuck: 0, ults: 0, skills: 0, powerGoals: 0, oneTimers: 0 };
for (let i = 0; i < N; i++) {
  const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 1000 + i, powers: ['fire', 'ice', 'lightning', 'gravity'], diff: [dA, dB], plans });
  m.on('combo', () => agg.combos++); m.on('penalty', () => agg.pens++); m.on('goalie_pulled', () => agg.pulls++); m.on('goal', (e) => { if (e.powerPlay) agg.ppg++; if (m.goalies[e.side === 1 ? 1 : 0].disabled) agg.enGoals++; }); m.on('chain', () => agg.chains++);
  const dt = 1 / 60;
  let t = 0;
  while (m.state !== 'over' && t < 900) { m.update(dt); t += dt; }
  if (m.state !== 'over') agg.stuck++;
  const s = m.summary();
  agg.goals[0] += s.score[0]; agg.goals[1] += s.score[1];
  agg.shots[0] += s.shots[0]; agg.shots[1] += s.shots[1];
  agg.time += t;
  if (s.winner !== null) agg.wins[s.winner]++;
  for (const g of s.goals) if (g.special && g.special.combo) agg.comboGoals++;
  for (const g of s.goals) agg.kinds[g.kind + (g.power ? '+' + g.power : '')] = (agg.kinds[g.kind + (g.power ? '+' + g.power : '')] || 0) + 1;
  for (const k of s.skaters) { agg.passes += k.passes; agg.steals += k.steals; agg.hits += k.hits; agg.ults += k.ults; agg.skills += k.skills; agg.powerGoals += k.powerGoals; agg.oneTimers += k.oneTimers; }
  agg.saves += s.saves[0] + s.saves[1];
}
const g = agg.goals[0] + agg.goals[1], sh = agg.shots[0] + agg.shots[1];
console.log(`matches ${N}  avg length ${(agg.time / N / 60).toFixed(2)} min  stuck ${agg.stuck}`);
console.log(`wins ${agg.wins}  goals ${agg.goals}  shots on goal ${agg.shots}  sv% ${(agg.saves / Math.max(1, sh)).toFixed(3)}  shooting% ${(g / Math.max(1, sh)).toFixed(3)}`);
console.log(`per match: passes ${(agg.passes / N).toFixed(1)} steals ${(agg.steals / N).toFixed(1)} hits ${(agg.hits / N).toFixed(1)} skills ${(agg.skills / N).toFixed(1)} ults ${(agg.ults / N).toFixed(1)} one-timer shots ${(agg.oneTimers / N).toFixed(1)}`);
console.log('goal kinds', agg.kinds);
console.log(`penalties/match ${(agg.pens / N).toFixed(2)}  PP goals/match ${(agg.ppg / N).toFixed(2)}  goalie pulls/match ${(agg.pulls / N).toFixed(2)}  empty-net goals/match ${(agg.enGoals / N).toFixed(2)}`);
console.log(`combos/match ${(agg.combos / N).toFixed(1)}  combo goals/match ${(agg.comboGoals / N).toFixed(2)}  combo conversion ${(agg.comboGoals / Math.max(1, agg.combos)).toFixed(2)}  3+ pass chains/match ${(agg.chains / N).toFixed(1)}`);
