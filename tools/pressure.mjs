// How hard the AI presses the player: a simple carrier bot (skate the puck at their net,
// shoot from close in, chase loose pucks) plays against each rival, and we measure how
// long it keeps the puck, how often it's hit and how often the puck is taken off it.
//   node tools/pressure.mjs [matches per team] [season]
import { Match } from '../src/match.js';
import { newSave, matchConfig } from '../src/progress.js';
import { TOURNAMENT } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';

const N = +(process.argv[2] || 4), season = +(process.argv[3] || 1);
const raw = (o = {}) => ({ mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false, ...o });
const toward = (s, x, y) => { const dx = x - s.x, dy = y - s.y, l = Math.hypot(dx, dy) || 1; return { mx: dx / l, my: dy / l, l }; };

export function pressure(teamId, n = N, seasonN = season, seed = 1) {
  const save = newSave();
  save.season = seasonN;
  const stage = TOURNAMENT.stages.find((s) => s.team === teamId);
  let held = 0, spells = 0, lost = 0, hits = 0, steals = 0, playT = 0, goalsFor = 0, goalsAgainst = 0;
  for (let i = 0; i < n; i++) {
    const m = new Match({ ...matchConfig(save, teamId, { ...stage, powers: [], twist: 'none' }), seed: seed * 100 + i });
    let spell = 0, had = false;
    m.on('hit', (e) => { if (e.b.controlled) hits++; });
    m.on('steal', (e) => { if (e.from && e.from.controlled) steals++; });
    for (let t = 0; t < 360 && m.state !== 'over'; t += 1 / 60) {
      const s = m.controlled();
      if (s && m.state === 'play') {
        playT += 1 / 60;
        if (s.hasPuck) {
          const to = toward(s, GOAL_X - 150, s.y * 0.6);
          m.setHumanInput(raw({ mx: to.mx, my: to.my, sprint: s.stamina > 40, a: s.x > GOAL_X - 230 }));
          spell += 1 / 60; had = true;
        } else {
          if (had) { held += spell; spells++; if (m.puck.owner && m.puck.owner.team !== 0) lost++; }
          had = false; spell = 0;
          const p = m.puck, to = toward(s, p.x, p.y);
          m.setHumanInput(raw({ mx: to.mx, my: to.my, sprint: to.l > 160 && s.stamina > 40 }));
        }
      } else m.setHumanInput(raw());
      m.update(1 / 60);
    }
    goalsFor += m.score[0]; goalsAgainst += m.score[1];
  }
  const min = playT / 60;
  return { team: teamId, hold: held / Math.max(1, spells), lostPct: lost / Math.max(1, spells), hitsMin: hits / min, stealsMin: steals / min, gf: goalsFor / n, ga: goalsAgainst / n };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`season ${season}, ${N} matches each: seconds the player keeps the puck, % of spells lost to them, hits on the player and steals from the player per minute`);
  for (const id of ['lynx', 'comets', 'rams', 'ravens', 'royals']) {
    const r = pressure(id);
    console.log(`${id.padEnd(7)} hold ${r.hold.toFixed(2)}s  lost ${(r.lostPct * 100).toFixed(0)}%  hits ${r.hitsMin.toFixed(2)}/min  steals ${r.stealsMin.toFixed(2)}/min  score ${r.gf.toFixed(1)}-${r.ga.toFixed(1)}`);
  }
}
