// Shot outcome diagnostics: node tools/shots.mjs [matches]
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
const N = +(process.argv[2] || 3);
const team = () => ({
  skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })),
  goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' },
});
const out = {}; const byKind = {}; let dists = [];
for (let i = 0; i < N; i++) {
  const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 77 + i, powers: [], diff: [0.6, 0.6] });
  let cur = null;
  const close = (r) => { if (cur) { out[r] = (out[r] || 0) + 1; const k = byKind[cur.kind] ||= {}; k[r] = (k[r] || 0) + 1; cur = null; } };
  m.on('shot', (e) => { close('lost'); const p = m.puck; cur = { kind: e.kind, d: Math.hypot(e.s.side * 633 - p.x, p.y) }; dists.push(cur.d); });
  m.on('save', (e) => close(e.caught ? 'catch' : 'rebound'));
  m.on('goal', () => close('goal'));
  m.on('block', () => close('block'));
  m.on('post', () => close('post'));
  m.on('net_hit', () => close('net_outside'));
  m.on('puck_boards', () => close('wide'));
  m.on('possession', () => close('picked'));
  let t = 0; while (m.state !== 'over' && t < 600) { m.update(1 / 60); t += 1 / 60; }
  close('lost');
}
console.log(out); console.log(byKind);
dists.sort((a, b) => a - b);
console.log('shot distance p25/50/75', dists[dists.length >> 2] | 0, dists[dists.length >> 1] | 0, dists[(dists.length * 3) >> 2] | 0);
