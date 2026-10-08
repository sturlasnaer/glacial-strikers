// Season awards: a stat sheet for every skater and goalie in the league, built from our
// real matches and filled in for the simulated ones, and an awards night when the
// season ends.

import { TEAMS, RECRUITS, GOALIE, recruitKey } from './data.js';
import { t } from './i18n.js';

const KITS = ['frost', 'thunder', 'stone'];

export const AWARDS = [
  { id: 'mvp', name: 'League MVP', blurb: 'The most valuable skater in the Frostline.', icon: 'icons/award_mvp', coins: 200, exp: 80 },
  { id: 'golden_stick', name: 'Golden Stick', blurb: 'Most goals this season.', icon: 'icons/award_golden_stick', coins: 120, exp: 50 },
  { id: 'playmaker', name: 'Playmaker', blurb: 'Most assists this season.', icon: 'icons/award_playmaker', coins: 120, exp: 50 },
  { id: 'iron_wall', name: 'Iron Wall', blurb: 'Best save percentage (60+ shots faced).', icon: 'icons/award_iron_wall', coins: 120, exp: 60, goalie: true },
  { id: 'enforcer', name: 'Enforcer', blurb: 'Most hits this season.', icon: 'icons/award_enforcer', coins: 100, exp: 40 },
  { id: 'signing', name: 'Signing of the Year', blurb: 'The best season by a Foxes signing.', icon: 'icons/award_signing', coins: 100, exp: 50, ours: true },
];
export const AWARD_BY_ID = Object.fromEntries(AWARDS.map((a) => [a.id, a]));

export function seasonStats(L) { return (L.stats ||= { skaters: {}, goalies: {} }); }

function skaterRow(st, key, info) {
  return (st.skaters[key] ||= { key, ...info, gp: 0, g: 0, a: 0, hits: 0, steals: 0, blocks: 0, shots: 0 });
}
function goalieRow(st, team, name) {
  return (st.goalies[team] ||= { team, name, gp: 0, sa: 0, sv: 0, so: 0 });
}

// Who plays a rival slot right now: the original, or a newcomer if we signed them.
function rivalSlot(save, teamId, kit) {
  const t = TEAMS[teamId];
  if (save.roster[recruitKey(teamId, kit)]) return { key: `${teamId}:sub_${kit}`, name: t.subs[kit], team: teamId, face: 'sub_' + kit, kit };
  return { key: `${teamId}:${kit}`, name: t.names[kit], team: teamId, face: kit, kit };
}

// One of our league or playoff matches, from the match summary.
export function recordRealGame(save, L, summary, teamId) {
  const st = seasonStats(L);
  for (const k of summary.skaters) {
    const home = k.team === 0;
    const key = home ? `home:${k.id}` : `${teamId}:${k.id}`;
    const r = skaterRow(st, key, { name: k.name, team: home ? 'home' : teamId, face: k.id, kit: k.kit });
    r.name = k.name;
    r.gp++; r.g += k.goals; r.a += k.assists; r.hits += k.hits; r.steals += k.steals; r.blocks += k.blocks || 0; r.shots += k.shots || 0;
  }
  const ours = goalieRow(st, 'home', GOALIE.name), theirs = goalieRow(st, teamId, TEAMS[teamId].names.goalie);
  ours.gp++; theirs.gp++;
  ours.sa += summary.shots[1]; ours.sv += summary.saves[0];
  theirs.sa += summary.shots[0]; theirs.sv += summary.saves[1];
  if (summary.score[1] === 0) ours.so++;
  if (summary.score[0] === 0) theirs.so++;
}

// A simulated game between two rivals: hand out believable stats to their players.
const SCORE_W = { frost: 0.4, thunder: 0.42, stone: 0.18 };
export function recordSimGame(save, L, g, rng) {
  const st = seasonStats(L);
  const side = (team, gf, ga) => {
    if (team === 'home') return;
    const slots = KITS.map((kit) => rivalSlot(save, team, kit));
    const rows = slots.map((sl) => skaterRow(st, sl.key, sl));
    rows.forEach((r) => { r.gp++; });
    const pickBy = (w, not) => {
      const opts = rows.filter((r) => r !== not);
      let x = rng() * opts.reduce((s, r) => s + w[r.kit], 0);
      for (const r of opts) { x -= w[r.kit]; if (x <= 0) return r; }
      return opts[opts.length - 1];
    };
    for (let i = 0; i < gf; i++) {
      const sc = pickBy(SCORE_W);
      sc.g++; sc.shots++;
      if (rng() < 0.75) { const a1 = pickBy({ frost: 0.45, thunder: 0.3, stone: 0.25 }, sc); a1.a++; if (rng() < 0.35) rows.find((r) => r !== sc && r !== a1).a++; }
    }
    for (const r of rows) {
      r.hits += Math.floor(rng() * (r.kit === 'stone' ? 7 : 4)) + (r.kit === 'stone' ? 2 : 0);
      r.steals += Math.floor(rng() * 4);
      r.shots += Math.floor(rng() * 6) + 2;
    }
    const gk = goalieRow(st, team, TEAMS[team].names.goalie);
    const sa = ga + 24 + Math.floor(rng() * 12);
    gk.gp++; gk.sa += sa; gk.sv += sa - ga;
    if (ga === 0) gk.so++;
  };
  side(g.a, g.ga, g.gb);
  side(g.b, g.gb, g.ga);
}

const line = (r) => `${t('{g} G · {a} A · {pts} PTS', { g: r.g, a: r.a, pts: r.g + r.a })}${r.hits ? ` · ${t(r.hits === 1 ? '{n} hit' : '{n} hits', { n: r.hits })}` : ''}`;

// Decide the season's awards. order: final standings (team ids, best first).
export function computeAwards(save, L, order) {
  const st = seasonStats(L);
  const rows = Object.values(st.skaters).filter((r) => r.gp >= 2);
  if (!rows.length) return [];
  const place = (team) => { const i = order.indexOf(team); return i < 0 ? 0 : (order.length - i) * 1.2 + (L.champion === team ? 4 : 0); };
  const best = (list, f) => [...list].sort((x, y) => f(y) - f(x) || (y.g + y.a) - (x.g + x.a) || y.hits - x.hits)[0];
  const out = [];
  const add = (id, r, text) => { if (r) out.push({ id, key: r.key, name: r.name, team: r.team, face: r.face, line: text || line(r) }); };
  add('mvp', best(rows, (r) => r.g * 3 + r.a * 2 + (r.hits + r.steals) * 0.25 + place(r.team)));
  add('golden_stick', best(rows, (r) => r.g));
  add('playmaker', best(rows, (r) => r.a));
  const gks = Object.values(st.goalies).filter((g) => g.sa >= 60);
  if (gks.length) {
    const g = [...gks].sort((x, y) => y.sv / y.sa - x.sv / x.sa)[0];
    out.push({ id: 'iron_wall', key: 'goalie:' + g.team, name: g.name, team: g.team, face: 'goalie', line: `${t('{pct} save %', { pct: (g.sv / g.sa).toFixed(3).replace(/^0/, '') })} · ${t(g.sv === 1 ? '{n} save' : '{n} saves', { n: g.sv })}${g.so ? ` · ${t(g.so > 1 ? '{n} shutouts' : '{n} shutout', { n: g.so })}` : ''}` });
  }
  const enf = best(rows, (r) => r.hits);
  add('enforcer', enf, `${t(enf.hits === 1 ? '{n} hit' : '{n} hits', { n: enf.hits })} · ${t(enf.steals === 1 ? '{n} steal' : '{n} steals', { n: enf.steals })}`);
  const signings = rows.filter((r) => r.team === 'home' && RECRUITS[r.face]);
  if (signings.length) add('signing', best(signings, (r) => r.g * 3 + r.a * 2 + r.hits * 0.3));
  return out;
}
