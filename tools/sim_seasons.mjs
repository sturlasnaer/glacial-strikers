// A save played through several seasons, headless, to check the economy and the difficulty:
// real AI matches for every game we play (our line plays itself), the league simulated
// around it, and a simple player who spends skill points, does both training sessions after
// each match (silver medals), signs an upgrade when one's affordable (rivals' stars, free
// agents, goalies), takes trade offers that help, drafts the most promising rookie, and
// starts the next season, up or down a division as it goes (tier: R/N/E, ↑ promoted, ↓ relegated).
// Prints a line per season.
//   node tools/sim_seasons.mjs [seasons=4] [seeds=2]      (DIFF=easy|normal|hard: the rival difficulty setting; TEAM=lynx|…|custom: a club career)
import { Match } from '../src/match.js';
import { setLeagueEdge, newSave, matchConfig, computeRewards, applyExp, applyGoalieExp, applyChem, lineupIds, rosterIds, canRaise, effectiveStats, setLineup,
  recruitStatus, signRecruit, recruitPrice, goalieStatus, signGoalie, goalieStats, starterId, setStarter, joinLevel } from '../src/progress.js';
import { newLeague, nextFixture, recordOurGame, recordClassic, recordAllStar, standings, strength, leagueRivals } from '../src/league.js';
import { recordRealGame, computeAwards, AWARD_BY_ID } from '../src/awards.js';
import { recordRivalResult } from '../src/rivals.js';
import { rivalSigning, rivalOffer, acceptOffer } from '../src/moves.js';
import { refreshAgents, agentState, signAgent } from '../src/agents.js';
import { retireRivals } from '../src/slots.js';
import { makeDraft, draftPick } from '../src/draft.js';
import { recordCareer } from '../src/career.js';
import { updateSeasonGoals, goalStates, seasonGoals } from '../src/goals.js';
import { FACILITY_IDS, nextCost, buildFacility, facilityLevel } from '../src/facilities.js';
import { RECRUITS, GOALIE_RECRUITS, CHARACTERS, GEAR, gearOpen, member, setRookies, setFreeGoalies, stageOf } from '../src/data.js';
import { moveTier, tierOf } from '../src/tiers.js';
import { DRILL_REWARDS } from '../src/drills.js';
import { useModular } from '../src/modular.js';
import { setFills } from '../src/slots.js';

const SEASONS = +(process.argv[2] || 4), SEEDS = +(process.argv[3] || 2);
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
useModular({ skaters: { body_std: {}, body_big: {}, body_small: {} }, modular: { heads: { c: {}, cage: {}, braids: {} } } });

function play(s, teamId, stage, rnd) {
  const cfg = matchConfig(s, teamId, stage, { league: true }); // (as the game plays a league fixture: the division's strength)
  cfg.humanTeam = null; cfg.humans = []; cfg.seed = Math.floor(rnd() * 1e9);
  const m = new Match(cfg);
  for (let t = 0; m.winner === null && m.state !== 'over' && t < 900; t += 1 / 60) m.update(1 / 60);
  return m.summary();
}

// the player between matches
function manage(s, log) {
  // skill points into each player's best stats, perks as they come
  for (const id of rosterIds(s)) {
    const r = s.roster[id], m = member(id);
    if (r.pendingPerk !== null && r.pendingPerk !== undefined) { r.perks.push(m.def.perks[r.pendingPerk][0]); r.pendingPerk = null; }
    for (let guard = 0; r.points > 0 && guard < 30; guard++) {
      const k = Object.keys(m.base).filter((x) => canRaise(r, id, x)).sort((a, b) => m.base[b] - m.base[a])[0];
      if (!k) break;
      r.points--; r.alloc[k]++;
    }
  }
  // gear: the dearest piece we can afford with a third of the purse, worn by the line
  for (const g of GEAR.filter((x) => x.price > 0 && gearOpen(s, x) && !s.owned.includes(x.id) && x.slot !== 'goalie').sort((a, b) => b.price - a.price)) {
    if (g.price * 3 > s.coins) continue;
    s.coins -= g.price; log.spent += g.price; s.owned.push(g.id);
    for (const id of lineupIds(s)) s.roster[id].gear[g.slot] = g.id;
    break;
  }
  // an upgrade, if there's one worth the money (keeping a little in hand)
  const worth = (id) => sum(effectiveStats(id, s.roster[id]));
  for (const role of ['C', 'W', 'D']) {
    const cur = s.lineup[role], now = worth(cur), lv = joinLevel(s);
    const options = [
      ...Object.keys(RECRUITS).filter((k) => RECRUITS[k].role === role && recruitStatus(s, k) === 'open').map((k) => ({ k, price: recruitPrice(s, k), val: sum(RECRUITS[k].base) + lv - 1 + 4 * Math.min(4, s.season - 1), sign: () => signRecruit(s, k) && k })),
      ...agentState(s).list.map((a, i) => ({ a, i })).filter(({ a }) => !a.goalie && CHARACTERS[a.kit].role === role).map(({ a, i }) => ({ k: a.name, price: a.price, val: sum(a.base) + a.level - 1, sign: () => signAgent(s, i) })),
    ].filter((o) => o.price + 100 <= s.coins && o.val > now + 2).sort((a, b) => b.val - a.val);
    if (options.length) { const id = options[0].sign(); if (id) { setLineup(s, id); log.signed.push(member(id).name); log.spent += options[0].price; } }
  }
  const g = goalieStats(s, starterId(s));
  const gk = Object.keys(GOALIE_RECRUITS).filter((k) => goalieStatus(s, k) === 'open' && GOALIE_RECRUITS[k].price + 100 <= s.coins && GOALIE_RECRUITS[k].base.rfx + GOALIE_RECRUITS[k].base.pos > g.rfx + g.pos + 1)[0];
  if (gk) { const price = GOALIE_RECRUITS[gk].price; if (signGoalie(s, gk)) { setStarter(s, gk); log.signed.push(GOALIE_RECRUITS[gk].name); log.spent += price; } }
  // with the line set, the club's facilities: the cheapest next level, keeping 2,500 for signings
  // (FAC=0 leaves them, to compare)
  for (let guard = 0; process.env.FAC !== '0' && guard < 4; guard++) {
    const next = FACILITY_IDS.map((id) => [id, nextCost(s, id)]).filter(([, c]) => c != null).sort((a, b) => a[1] - b[1])[0];
    if (!next || s.coins - next[1] < 2500) break;
    buildFacility(s, next[0]); log.spent += next[1]; log.built = (log.built || 0) + 1;
  }
}

function season(s, rnd, out) {
  const L = s.league, log = { w: 0, l: 0, gf: 0, ga: 0, earned: 0, spent: 0, signed: [], result: '', trades: 0 };
  const coins0 = s.coins;
  for (let guard = 0; guard < 30; guard++) {
    const f = nextFixture(L);
    if (!f) break;
    if (f.kind === 'allstar') { recordAllStar(L, { skipped: true }); seasonGoals(s); continue; } // (skipped: its season goal is swapped)
    const before = s.coins;
    const sm = play(s, f.opponent, f.stage, rnd);
    const won = sm.winner === 0;
    const rw = computeRewards(s, sm, f.stage, false);
    s.coins += rw.coins;
    for (const id of Object.keys(rw.exp)) applyExp(s, id, rw.exp[id]);
    applyGoalieExp(s, rw.gExp, sm.goalie);
    applyChem(s, rw.chem);
    s.record.played++; if (won) s.record.wins++;
    recordCareer(s, sm, won);
    recordRivalResult(s, f.opponent, sm.score[0], sm.score[1], won, {});
    log.w += won ? 1 : 0; log.l += won ? 0 : 1; log.gf += sm.score[0]; log.ga += sm.score[1];
    if (f.kind === 'classic') recordClassic(L, sm.score[0], sm.score[1], f.opponent);
    else {
      recordRealGame(s, L, sm, f.opponent);
      const o = recordOurGame(L, s, sm.score[0], sm.score[1]);
      if (o.champion) log.result = o.champion === 'home' ? 'CHAMPIONS' : `champion ${o.champion}`;
      else if (o.eliminated && !log.result) log.result = f.kind === 'regular' ? 'missed playoffs' : `out in the ${f.kind}`;
      rivalSigning(s, rnd);
      const offer = rivalOffer(s, rnd);
      if (offer && sum(RECRUITS[offer.get].base) > sum(effectiveStats(offer.give, s.roster[offer.give])) && s.coins >= offer.coins) { if (acceptOffer(s, offer)) { log.trades++; setLineup(s, offer.get); } }
    }
    // Coach Brekka's season goals, paid as they're met (as main.js does after every counted game)
    updateSeasonGoals(s, { kind: f.kind, won, summary: sm, opp: f.opponent });
    // two training sessions (silver)
    const low = lineupIds(s).sort((a, b) => s.roster[a].level - s.roster[b].level)[0];
    s.coins += 2 * DRILL_REWARDS.coins[2]; applyExp(s, low, 2 * DRILL_REWARDS.exp[2]);
    log.earned += s.coins - before;
    refreshAgents(s, rnd);
    manage(s, log);
  }
  // awards, retirements, the draft, a new season
  const order = standings(L).map((r) => r.id);
  for (const w of computeAwards(s, L, order)) if (w.team === 'home') { s.coins += AWARD_BY_ID[w.id].coins; log.earned += AWARD_BY_ID[w.id].coins; }
  const retired = retireRivals(s);
  L.awards = [];
  s.draft = makeDraft(s, L.season, rnd);
  const best = s.draft.prospects.map((p, i) => [i, p.potential]).sort((a, b) => b[1] - a[1])[0][0];
  draftPick(s, best);
  const line = lineupIds(s).map((id) => s.roster[id].level);
  // the line's numbers against the league's: average stat total per skater
  const ours = lineupIds(s).reduce((a, id) => a + sum(effectiveStats(id, s.roster[id])), 0) / 3;
  const theirs = leagueRivals(L).reduce((a, id) => a + matchConfig(s, id, stageOf(id), { league: true }).teams[1].skaters.reduce((b, k) => b + sum(k.stats), 0) / 3, 0) / leagueRivals(L).length;
  const rivals = leagueRivals(L);
  const tier = tierOf(s), moved = moveTier(s, L, standings(L)); // (up with the Cup, down from last place)
  out.push({ season: s.season, tier: ['R', 'N', 'E'][tier] + (moved === 'promoted' ? '↑' : moved === 'relegated' ? '↓' : ''), teams: L.teams.length, record: `${log.w}-${log.l}`, goals: `${log.gf}:${log.ga}`, place: order.indexOf('home') + 1, result: log.result || 'playoffs',
    goalsMet: (() => { const g = goalStates(s); return `${g.filter((x) => x.done).length}/${g.length}`; })(),
    which: goalStates(s).map((x) => x.id + (x.done ? '+' : '-')).join(' '),
    facilities: FACILITY_IDS.map((id) => facilityLevel(s, id)).join(''),
    coinsStart: coins0, earned: log.earned, spent: log.spent, coinsEnd: s.coins, levels: line.join('/'), signed: log.signed.join(', ') || '-', trades: log.trades,
    sumUs: +ours.toFixed(1), sumThem: +theirs.toFixed(1), us: +strength('home', s).toFixed(2), rivals: +(rivals.reduce((a, id) => a + strength(id, s), 0) / rivals.length).toFixed(2), retired: retired.length, edge: s.leagueEdge || 0,
    gUs: (() => { const g = goalieStats(s, starterId(s)); return g.rfx + g.pos; })(), gThem: +(rivals.reduce((a, id) => { const g = matchConfig(s, id, stageOf(id), { league: true }).teams[1].goalie.stats; return a + g.rfx + g.pos; }, 0) / rivals.length).toFixed(1) });
  s.season++;
  const last = s.league;
  s.league = newLeague(s.season, tierOf(s));
  setLeagueEdge(s, last);
}

for (let seed = 1; seed <= SEEDS; seed++) {
  let x = seed * 7919;
  const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const s = newSave(process.env.TEAM || null); // (TEAM=lynx…: a career as that club; TEAM=custom: one's own, clubs.js)
  s.settings.difficulty = process.env.DIFF || 'normal';
  setRookies(s.rookies || {}); setFreeGoalies(s.freeGoalies || {}); setFills(s);
  const out = [];
  const t0 = Date.now();
  for (let i = 0; i < SEASONS; i++) season(s, rnd, out);
  console.log(`seed ${seed} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.table(out);
}
