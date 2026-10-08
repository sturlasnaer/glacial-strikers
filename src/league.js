// The Frostline league: a 6-team round robin (5 rounds), then a top-4 playoff.
// The player's games are real matches; every other game is simulated with a quick
// strength model so standings move each round. After round 3 comes the Winter Classic,
// an outdoor showcase on Pine Pond against the league leaders that doesn't count in the
// standings.

import { TEAMS, TOURNAMENT } from './data.js';
import { makeRng } from './util.js';
import { recordSimGame } from './awards.js';
import { t } from './i18n.js';

export const LEAGUE_TEAMS = ['home', 'lynx', 'comets', 'rams', 'ravens', 'royals'];
export const CLASSIC_AFTER = 3; // the Winter Classic comes after this many rounds
const OUR_ORDER = ['lynx', 'comets', 'rams', 'ravens', 'royals'];

// Rough team strength for simulated games (home strength follows the player's levels).
export function strength(teamId, save) {
  if (teamId === 'home') {
    const line = save.lineup ? [save.lineup.C, save.lineup.W, save.lineup.D] : ['frost', 'thunder', 'stone'];
    const lv = line.reduce((a, id) => a + ((save.roster[id] && save.roster[id].level) || 1), 0) / 3;
    return 0.45 + lv * 0.06;
  }
  const t = TEAMS[teamId];
  return 0.35 + t.diff * 0.75 + (save.season - 1) * 0.08;
}

// Round-robin schedule where our opponents come in tournament order.
// Circle method: we sit at the centre and meet rival r in round r; the other four
// pair up as (r+1, r-1) and (r+2, r-2) around the circle, so every pair meets once.
function buildSchedule() {
  const R = OUR_ORDER, n = R.length;
  const at = (i) => R[((i % n) + n) % n];
  return R.map((opp, r) => ({
    games: [{ a: 'home', b: opp }, { a: at(r + 1), b: at(r - 1) }, { a: at(r + 2), b: at(r - 2) }],
  }));
}

export function newLeague(season) {
  return {
    season,
    phase: 'regular', // 'regular' | 'playoffs' | 'done'
    round: 0,
    schedule: buildSchedule(),
    results: [], // per round: [{ a, b, ga, gb }]
    table: Object.fromEntries(LEAGUE_TEAMS.map((t) => [t, { gp: 0, w: 0, l: 0, gf: 0, ga: 0 }])),
    playoffs: null, // { semis: [{ a, b, seedA, seedB, ga, gb, winner }], final: {...} }
    champion: null,
    seedRng: (season * 7919) >>> 0,
  };
}

// Make sure every pair meets exactly once; fall back to a standard circle schedule if not.
(function verify() {
  const s = buildSchedule();
  const seen = new Set();
  for (const r of s) for (const g of r.games) seen.add([g.a, g.b].sort().join('-'));
  if (seen.size !== 15) throw new Error('League schedule does not cover every pairing: ' + seen.size);
})();

// First-to-5 result from two strengths.
export function simGame(sa, sb, rng) {
  const pa = sa / (sa + sb);
  let a = 0, b = 0;
  // a little randomness each game so upsets happen
  const p = Math.min(0.85, Math.max(0.15, pa + rng.normal() * 0.08));
  while (a < 5 && b < 5) { if (rng() < p) a++; else b++; }
  return [a, b];
}

function addResult(L, g) {
  const ta = L.table[g.a], tb = L.table[g.b];
  ta.gp++; tb.gp++;
  ta.gf += g.ga; ta.ga += g.gb; tb.gf += g.gb; tb.ga += g.ga;
  if (g.ga > g.gb) { ta.w++; tb.l++; } else { tb.w++; ta.l++; }
}

export function standings(L) {
  const rows = LEAGUE_TEAMS.map((id) => ({ id, ...L.table[id], pts: L.table[id].w * 2, diff: L.table[id].gf - L.table[id].ga }));
  rows.sort((x, y) => y.pts - x.pts || y.diff - x.diff || y.gf - x.gf || headToHead(L, y.id, x.id));
  return rows;
}

function headToHead(L, a, b) {
  for (const round of L.results) for (const g of round) {
    if (g.a === a && g.b === b) return g.ga > g.gb ? 1 : -1;
    if (g.a === b && g.b === a) return g.gb > g.ga ? 1 : -1;
  }
  return 0;
}

// What the player plays next: { kind: 'regular'|'semi'|'final', opponent, round label, stage cfg }.
export function nextFixture(L) {
  if (L.phase === 'regular' && L.round === CLASSIC_AFTER && !L.classic) {
    const opp = classicOpponent(L);
    const base = TOURNAMENT.stages.find((s) => s.team === opp);
    return { kind: 'classic', opponent: opp, label: t('Winter Classic'), stage: { ...base, powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', round: 'Winter Classic', reward: 320, arena: 'pine_pond' } };
  }
  if (L.phase === 'regular') {
    const opp = L.schedule[L.round].games[0].b;
    const base = TOURNAMENT.stages.find((s) => s.team === opp);
    return { kind: 'regular', opponent: opp, label: t('Round {n} of 5', { n: L.round + 1 }), stage: { ...base, round: 'League · round {n}', roundN: L.round + 1 } };
  }
  if (L.phase === 'playoffs') {
    const po = L.playoffs;
    const ourSemi = po.semis.find((g) => g.a === 'home' || g.b === 'home');
    if (ourSemi && !ourSemi.winner) {
      const opp = ourSemi.a === 'home' ? ourSemi.b : ourSemi.a;
      const base = TOURNAMENT.stages.find((s) => s.team === opp);
      return { kind: 'semi', opponent: opp, label: t('Semifinal'), stage: { ...base, powers: ['fire', 'ice', 'lightning', 'gravity'], round: 'Semifinal', reward: 320 } };
    }
    if (po.final && !po.final.winner && (po.final.a === 'home' || po.final.b === 'home')) {
      const opp = po.final.a === 'home' ? po.final.b : po.final.a;
      return { kind: 'final', opponent: opp, label: t('Final'), stage: { team: opp, powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'both', round: 'Cup Final', reward: 480 } };
    }
  }
  return null;
}

// The Winter Classic's opponent: the league leaders (or the runners-up if that's us).
export function classicOpponent(L) {
  return standings(L).find((r) => r.id !== 'home').id;
}

// The Winter Classic is played: remember the result (the standings don't change).
export function recordClassic(L, gf, ga, opp) {
  L.classic = { opp, gf, ga, won: gf > ga };
}

// Record the player's game, simulate everything else up to the next player game.
// Returns { simulated: [{a,b,ga,gb,stage}], eliminated, champion, phaseChange }.
export function recordOurGame(L, save, gf, ga) {
  const rng = makeRng(L.seedRng + L.round * 101 + (L.phase === 'playoffs' ? 999 : 0));
  const out = { simulated: [], eliminated: false, champion: null, phaseChange: null };
  if (L.phase === 'regular') {
    const games = L.schedule[L.round].games;
    const ours = { a: 'home', b: games[0].b, ga: gf, gb: ga };
    const round = [ours];
    addResult(L, ours);
    for (const g of games.slice(1)) {
      const [x, y] = simGame(strength(g.a, save), strength(g.b, save), rng);
      const r = { a: g.a, b: g.b, ga: x, gb: y };
      addResult(L, r); round.push(r); out.simulated.push(r);
      recordSimGame(save, L, r, rng);
    }
    L.results.push(round);
    L.round++;
    if (L.round >= 5) {
      L.phase = 'playoffs';
      out.phaseChange = 'playoffs';
      seedPlayoffs(L);
      const qualified = L.playoffs.semis.some((g) => g.a === 'home' || g.b === 'home');
      if (!qualified) {
        out.eliminated = true;
        finishPlayoffs(L, save, rng, out);
      }
    }
    return out;
  }
  if (L.phase === 'playoffs') {
    const po = L.playoffs;
    const ourSemi = po.semis.find((g) => (g.a === 'home' || g.b === 'home') && !g.winner);
    if (ourSemi) {
      setResult(ourSemi, ourSemi.a === 'home' ? gf : ga, ourSemi.a === 'home' ? ga : gf);
      const other = po.semis.find((g) => g !== ourSemi);
      if (!other.winner) { const [x, y] = simGame(strength(other.a, save), strength(other.b, save), rng); setResult(other, x, y); out.simulated.push({ ...other, stage: t('Semifinal') }); recordSimGame(save, L, other, rng); }
      po.final = { a: po.semis[0].winner, b: po.semis[1].winner };
      if (ourSemi.winner !== 'home') { out.eliminated = true; finishPlayoffs(L, save, rng, out); }
      return out;
    }
    if (po.final && !po.final.winner) {
      setResult(po.final, po.final.a === 'home' ? gf : ga, po.final.a === 'home' ? ga : gf);
      L.champion = po.final.winner; L.phase = 'done';
      out.champion = L.champion;
      return out;
    }
  }
  return out;
}

function seedPlayoffs(L) {
  const top = standings(L).slice(0, 4).map((r) => r.id);
  L.playoffs = {
    seeds: top,
    semis: [{ a: top[0], b: top[3], seedA: 1, seedB: 4 }, { a: top[1], b: top[2], seedA: 2, seedB: 3 }],
    final: null,
  };
}

function setResult(g, x, y) { g.ga = x; g.gb = y; g.winner = x > y ? g.a : g.b; }

// Simulate whatever playoff games remain (after the player is out).
function finishPlayoffs(L, save, rng, out) {
  const po = L.playoffs;
  for (const g of po.semis) if (!g.winner) { const [x, y] = simGame(strength(g.a, save), strength(g.b, save), rng); setResult(g, x, y); out.simulated.push({ ...g, stage: t('Semifinal') }); recordSimGame(save, L, g, rng); }
  po.final = po.final || { a: po.semis[0].winner, b: po.semis[1].winner };
  if (!po.final.winner) { const [x, y] = simGame(strength(po.final.a, save), strength(po.final.b, save), rng); setResult(po.final, x, y); out.simulated.push({ ...po.final, stage: t('Final') }); recordSimGame(save, L, po.final, rng); }
  L.champion = po.final.winner;
  L.phase = 'done';
  out.champion = L.champion;
}

// A rival's game plan for a match against us. 'counter' picks whatever beats the plan
// we used most against them.
export function rivalPlan(save, teamId, PLANS) {
  const t = TEAMS[teamId];
  if (!t || !t.plan) return 'balanced';
  if (t.plan !== 'counter') return t.plan;
  const used = (save.planHistory || {})[teamId] || save.lastPlan || 'balanced';
  const counter = Object.values(PLANS).find((p) => p.beats === used);
  return counter ? counter.id : 'balanced';
}

// Older saves used a 5-stage ladder: rebuild a league from how far they got.
export function migrateLeague(save) {
  const L = newLeague(save.season || 1);
  const done = Math.min(5, save.stage || 0);
  for (let i = 0; i < done; i++) recordOurGame(L, save, 5, 3);
  if (save.champion && L.phase === 'playoffs') {
    recordOurGame(L, save, 5, 3);
    if (L.phase === 'playoffs') recordOurGame(L, save, 5, 3);
  }
  return L;
}
