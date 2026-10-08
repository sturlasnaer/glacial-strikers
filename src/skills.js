// All-Star Skills Night: before the All-Star Game the stars show off in two drills. The
// other five All-Stars' results come from their stats, and the fastest skater's Cone Weave
// is skated by a bot so the player's All-Star can race it as a ghost. Made once per season
// (the same field when you come back to it), kept in the league as L.skills.

import { Match } from './match.js';
import { createDrill } from './drills.js';
import { member, TEAMS } from './data.js';
import { makeRng } from './util.js';

export const SKILLS_EVENTS = [
  { id: 'fastest', drill: 'cones', name: 'Fastest Skater', coins: 75 },
  { id: 'sharp', drill: 'sniper', name: 'Sharpshooter', coins: 75 },
];

// a rival star's stats, with their team's bonus
function starCfg(who) {
  const m = member(who), t = TEAMS[m.recruit.team];
  const stats = { ...m.base };
  for (const [k, v] of Object.entries(t.bonus || {})) stats[k] = Math.max(1, stats[k] + v);
  return { def: m.def, who, stats, name: m.name, perks: [], sprite: m.recruit.sprite, look: 'homekit' };
}

// A bot skates Cone Weave: through each gate on its line, then shoots on the empty net.
// pace (0-1) is how hard it pushes the stick. Returns { score, ghost } or null.
export function botConeRun(save, who, pace, seed = 1) {
  const { cfg, ctrl } = createDrill('cones', save, who, { seed, skater: starCfg(who) });
  const m = new Match({ ...cfg, humanTeam: 0 });
  const raw = { mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false };
  for (let i = 0; i < 60 * 45 && m.state !== 'drill_over'; i++) {
    const s = m.controlled(), g = ctrl.gates[ctrl.next];
    const dx = (g ? g.x + 30 : 520) - s.x, dy = (g ? g.y : 0) - s.y;
    const l = Math.hypot(dx * 0.6, dy) || 1;
    m.setHumanInput({ ...raw, mx: (dx * 0.6 / l) * pace, my: (dy / l) * pace, a: !g && s.x > 440 && i % 10 === 0 });
    m.update(1 / 60);
  }
  const r = ctrl.result;
  return r && !r.timeout ? { score: r.score, ghost: { ...r.ghost, char: who } } : null;
}

// The field for each event (the other five All-Stars), with the ghost to race.
export function makeSkills(save, vote, seed) {
  const rng = makeRng(seed);
  const field = [...vote.ours.slice(1), ...vote.theirs].map((who) => ({ who, name: member(who).name, team: member(who).recruit.team, stats: starCfg(who).stats }));
  const fastest = field.map((f) => ({ ...f, score: Math.min(24, Math.max(13, 20.5 - 0.55 * (f.stats.spd + f.stats.agi - 12) + rng.range(-1.2, 1.2))) }))
    .sort((a, b) => a.score - b.score);
  // the quickest one's run, skated by the bot at the pace that comes closest to their time
  const top = fastest[0];
  let best = null;
  for (const pace of [0.26, 0.3, 0.34, 0.38, 0.46, 0.55]) {
    const run = botConeRun(save, top.who, pace, seed);
    if (run && (!best || Math.abs(run.score - top.score) < Math.abs(best.score - top.score))) best = run;
  }
  if (best) top.score = best.score;
  for (const f of fastest.slice(1)) if (f.score <= top.score) f.score = top.score + rng.range(0.2, 1.1);
  const sharp = field.map((f) => ({ ...f, score: Math.round(Math.min(3000, Math.max(600, 950 + (f.stats.sht - 5) * 230 + rng.range(-260, 260))) / 10) * 10 }))
    .sort((a, b) => b.score - a.score);
  const strip = (list) => list.map(({ stats, ...f }) => ({ ...f, score: Math.round(f.score * 100) / 100 }));
  return {
    star: vote.star,
    events: {
      fastest: { field: strip(fastest), ghost: best ? { ...best.ghost, score: best.score, name: top.name } : null, mine: null, paid: false },
      sharp: { field: strip(sharp), mine: null, paid: false },
    },
  };
}

// Record a run in an event; true when it wins the event for the first time (pays out).
export function recordSkills(skills, id, score) {
  const ev = skills.events[id];
  const lower = id === 'fastest';
  if (ev.mine === null || (lower ? score < ev.mine : score > ev.mine)) ev.mine = score;
  const won = ev.field.every((f) => (lower ? ev.mine < f.score : ev.mine > f.score));
  if (won && !ev.paid) { ev.paid = true; return true; }
  return false;
}

// Where you placed (1 = first) in an event.
export const placeIn = (ev, lower) => (ev.mine === null ? null : 1 + ev.field.filter((f) => (lower ? f.score <= ev.mine : f.score >= ev.mine)).length);
