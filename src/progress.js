// Save data, stats, levelling, rewards and match setup.

import { GUIDE } from './guide.js';
import {
  CHARACTERS, GEAR_BY_ID, STAT_KEYS, TEAMS, TOURNAMENT, GOALIE, COMBOS, CHEM_LEVELS, CHALLENGES, ROLE,
  RECRUITS, member, pairKey, recruitKey,
} from './data.js';
import { newLeague, migrateLeague } from './league.js';
import { seasonStats } from './awards.js';
import { t } from './i18n.js';

const KEY = 'glacial-strikers-save-v1';
export const MAX_LEVEL = 10;
export const PERK_LEVELS = [3, 5, 7];
export const STAT_CAP_BONUS = 3; // points you can add to a stat above its base

export function newSave() {
  const roster = {};
  for (const id of Object.keys(CHARACTERS)) roster[id] = newMember();
  return {
    v: 1,
    coins: 150,
    roster, // every signed skater, keyed by member id
    lineup: { C: 'frost', W: 'thunder', D: 'stone' }, // who dresses for matches
    club: null, // custom name and colours, see applyClub in data.js
    goalie: { level: 1, exp: 0, gear: 'g_start' },
    owned: ['stick_wood', 'skate_start', 'arm_none', 'g_start'],
    chem: Object.fromEntries(Object.keys(COMBOS).map((k) => [k, 0])), // chemistry XP per pair
    stage: 0,
    beaten: [],
    champion: false,
    season: 1,
    training: { best: {}, medals: {}, sessions: 2 },
    rivals: {}, // head-to-head records, see rivals.js
    league: newLeague(1), // standings and playoffs, see league.js
    buffs: [], // locker-room buffs for the next league match
    planHistory: {}, lastPlan: 'balanced',
    discount: 0,
    locker: { seen: [], seasonSeen: [], season: 1 }, // drill bests, medal tiers, rewarded sessions left
    seenIntro: false,
    settings: {
      music: true, sfx: true, musicVol: 1, sfxVol: 1, audioQuality: 'auto', online: true, difficulty: 'normal', tips: true, replays: true, clips: true,
      assist: 'normal', autoSprint: false, speed: 'normal',
      shake: 1, flashes: true, particles: 'full',
      markers: 'color', textSize: 'normal', touchSize: 'normal', lefty: false,
    },
    record: { played: 0, wins: 0, goals: 0 },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
    // players who already know their way around don't need the coach's first-time tips
    if (!s.guide && s.record && s.record.played >= 3) s.guide = { done: GUIDE.map((g) => g.id), off: false, hints: ['ult', 'combo'] };
    // fill fields added later
    const base = newSave();
    for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
    for (const k of Object.keys(base.settings)) if (s.settings[k] === undefined) s.settings[k] = base.settings[k];
    for (const id of Object.keys(CHARACTERS)) if (!s.roster[id]) s.roster[id] = base.roster[id];
    for (const [role, who] of Object.entries(s.lineup)) {
      const m = member(who);
      if (!s.roster[who] || !m || m.role !== role) s.lineup[role] = base.lineup[role];
    }
    for (const k of Object.keys(COMBOS)) if (typeof s.chem[k] !== 'number') s.chem[k] = 0;
    if (!s.league || !s.league.schedule) s.league = migrateLeague(s);
    return s;
  } catch { return null; }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export const expToNext = (level) => 100 + (level - 1) * 60;

export const chemLevel = (xp) => CHEM_LEVELS.filter((t) => xp >= t).length;

// Progress toward the next chemistry level as 0..1 (1 at max level).
export function chemProgress(xp) {
  const lvl = chemLevel(xp);
  if (lvl >= CHEM_LEVELS.length) return 1;
  const lo = lvl ? CHEM_LEVELS[lvl - 1] : 0, hi = CHEM_LEVELS[lvl];
  return (xp - lo) / (hi - lo);
}

export function gearMods(r) {
  const out = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const slot of ['stick', 'skates', 'armor']) {
    const g = GEAR_BY_ID[r.gear[slot]];
    if (!g) continue;
    for (const [k, v] of Object.entries(g.mods)) if (k in out) out[k] += v;
  }
  return out;
}

function newMember() {
  return {
    level: 1, exp: 0, points: 0, alloc: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    perks: [], pendingPerk: null,
    gear: { stick: 'stick_wood', skates: 'skate_start', armor: 'arm_none' },
  };
}

// ---------------------------------------------------------------- roster and recruitment
export const lineupIds = (save) => [save.lineup.C, save.lineup.W, save.lineup.D];
export const rosterIds = (save) => Object.keys(save.roster).filter((id) => member(id));
export const isSigned = (save, key) => !!save.roster[key];

// A rival's skaters can be signed once you've beaten that team.
export function recruitStatus(save, key) {
  if (save.roster[key]) return 'signed';
  const r = RECRUITS[key];
  const rec = save.rivals && save.rivals[r.team];
  return rec && rec.wins > 0 ? 'open' : 'locked';
}

// New signings join a level below your line-up's average.
export function joinLevel(save) {
  const ids = lineupIds(save);
  const avg = ids.reduce((a, id) => a + save.roster[id].level, 0) / ids.length;
  return Math.max(1, Math.min(MAX_LEVEL - 1, Math.round(avg) - 1));
}

export function signRecruit(save, key) {
  const r = RECRUITS[key];
  if (!r || recruitStatus(save, key) !== 'open' || save.coins < r.price) return null;
  save.coins -= r.price;
  const m = newMember();
  const level = joinLevel(save);
  m.level = level;
  m.points = level - 1; // yours to spend
  const opts = CHARACTERS[r.kit].perks;
  PERK_LEVELS.forEach((lv, i) => { if (level >= lv) m.perks.push(opts[i][r.perks[i]]); });
  save.roster[key] = m;
  return m;
}

// Put a member into their position's line-up slot.
export function setLineup(save, who) {
  const m = member(who);
  if (!m || !save.roster[who]) return false;
  save.lineup[m.role] = who;
  return true;
}

// Rival roster pages to show our recruits in home colours.
export const homeKitGroups = (save) => [...new Set(rosterIds(save).filter((id) => RECRUITS[id]).map((id) => 'rival_' + TEAMS[RECRUITS[id].team].art))];

export function effectiveStats(id, r) {
  const base = member(id).base;
  const gm = gearMods(r);
  const out = {};
  for (const k of STAT_KEYS) out[k] = Math.max(1, Math.min(13, base[k] + r.alloc[k] + gm[k]));
  return out;
}

export function perkNames(r) { return r.perks.map((p) => p.split(':')[0]); }

export function goalieStats(save) {
  const g = save.goalie;
  const gear = GEAR_BY_ID[g.gear];
  const rfx = GOALIE.base.rfx + Math.floor((g.level - 1) / 2) + (gear?.mods.rfx || 0);
  return { rfx, pos: GOALIE.base.pos + Math.floor(g.level / 3) };
}

const DIFF_OFFSET = { easy: -0.15, normal: 0, hard: 0.12 };

// Build the Match config for a game against `teamId`.
export function matchConfig(save, teamId, stage, opts = {}) {
  const t = TEAMS[teamId];
  const ids = ['frost', 'thunder', 'stone']; // rival slots (and kits)
  const line = lineupIds(save);
  const home = {
    skaters: line.map((who) => {
      const m = member(who);
      return {
        def: m.def, who, stats: effectiveStats(who, save.roster[who]), name: m.name, perks: perkNames(save.roster[who]),
        sprite: m.recruit ? m.recruit.sprite : null, look: m.recruit ? 'homekit' : null, gear: { ...save.roster[who].gear },
      };
    }),
    goalie: { stats: goalieStats(save), name: GOALIE.name },
    chem: lineChem(save, line),
  };
  const seasonBoost = (save.season - 1) * 0.08;
  const away = {
    skaters: ids.map((id) => {
      const stats = { ...CHARACTERS[id].base };
      for (const [k, v] of Object.entries(t.bonus || {})) stats[k] = Math.max(1, stats[k] + v);
      // a slot whose skater you signed is filled by a newcomer in their colours
      if (isSigned(save, recruitKey(teamId, id))) return { def: CHARACTERS[id], who: 'sub_' + id, stats, name: t.subs[id], perks: [] };
      return { def: CHARACTERS[id], stats, name: t.names[id], perks: [], sprite: t.art ? `${t.art}_${ROLE[id]}` : null };
    }),
    goalie: { stats: { ...t.goalie }, name: t.names.goalie, art: t.art || null },
    chem: Object.fromEntries(Object.keys(COMBOS).map((k) => [k, Math.min(3, (t.chem || 0) + (save.season > 1 ? 1 : 0))])),
  };
  const diff = Math.min(1, Math.max(0, t.diff + (DIFF_OFFSET[save.settings.difficulty] || 0) + seasonBoost));
  // locker-room buffs: stat bumps and goalie reflex land here, the rest goes to the match
  const fx = opts.buffs;
  if (fx) {
    for (const b of fx.stats) for (const sk of home.skaters) if (b.who === 'all' || b.who === sk.who) sk.stats[b.stat] = Math.min(13, sk.stats[b.stat] + b.v);
    home.goalie.stats.rfx += fx.goalieRfx;
  }
  return {
    assist: save.settings.assist || 'normal',
    plans: opts.plans || ['balanced', 'balanced'],
    buffs: fx ? { ultStart: fx.ultStart, staminaMul: fx.staminaMul, oppGoalieMul: fx.oppGoalieMul, stealMul: fx.stealMul } : {},
    teams: [home, away],
    humanTeam: opts.attract ? null : 0,
    goalieMode: !!opts.goalieMode && !opts.attract, // the player in goal, the AI skating
    powers: stage ? stage.powers : ['fire', 'ice', 'lightning', 'gravity'],
    twist: stage ? stage.twist : 'none',
    diff: [opts.goalieMode ? 0.72 : 0.6, diff], // in goalie mode all three of ours are AI: sharper ones
    seed: (Math.random() * 1e9) >>> 0,
  };
}

// The All-Star Game's benches, by fan vote (this season's points). Our side: our best
// scorer and the top star of each of the two rival teams with the biggest stars, all in our
// colours. The League All-Stars: those two teams' next three, and the better of their two
// goalies. Two rival teams at most, so a phone holds the art. Signed players are ours and
// newcomers aren't voted in; null when there aren't enough stars left.
const RIVAL_IDS = ['lynx', 'comets', 'rams', 'ravens', 'royals'];
export function allStarVote(save, L) {
  const st = seasonStats(L);
  const pts = (key) => { const r = st.skaters[key]; return r ? r.g * 3 + r.a * 2 + (r.hits + r.steals) * 0.25 : 0; };
  const line = lineupIds(save);
  const star = [...line].sort((a, b) => pts(`home:${b}`) - pts(`home:${a}`) || line.indexOf(a) - line.indexOf(b))[0];
  const stars = (team) => ['frost', 'thunder', 'stone'].filter((kit) => !save.roster[recruitKey(team, kit)])
    .map((kit) => ({ team, kit, who: recruitKey(team, kit), pts: pts(`${team}:${kit}`) }))
    .sort((a, b) => b.pts - a.pts || a.kit.localeCompare(b.kit));
  const teams = RIVAL_IDS.map((team) => ({ team, list: stars(team) })).filter((x) => x.list.length >= 2)
    .sort((a, b) => (b.list[0].pts + b.list[1].pts) - (a.list[0].pts + a.list[1].pts) || RIVAL_IDS.indexOf(a.team) - RIVAL_IDS.indexOf(b.team));
  let pair = null; // the best two teams that leave three for the other bench
  for (let i = 0; i < teams.length && !pair; i++) for (let j = i + 1; j < teams.length && !pair; j++) if (teams[i].list.length + teams[j].list.length >= 5) pair = [teams[i], teams[j]];
  if (!star || !pair) return null;
  const [A, B] = pair;
  const theirs = [...A.list.slice(1), ...B.list.slice(1)].sort((a, b) => b.pts - a.pts).slice(0, 3);
  const svp = (team) => { const g = st.goalies[team]; return g && g.sa ? g.sv / g.sa : 0; };
  const goalie = svp(B.team) > svp(A.team) ? B.team : A.team;
  return { star, ours: [star, A.list[0].who, B.list[0].who], theirs: theirs.map((x) => x.who), teams: [A.team, B.team], goalie,
    points: Object.fromEntries([[star, pts(`home:${star}`)], ...[...A.list, ...B.list].map((x) => [x.who, x.pts])]) };
}

// Match config for the All-Star Game (like matchConfig, from a vote).
export function allStarConfig(save, vote, opts = {}) {
  const rival = (who, look) => {
    const m = member(who), t = TEAMS[m.recruit.team];
    const stats = { ...m.base };
    for (const [k, v] of Object.entries(t.bonus || {})) stats[k] = Math.max(1, stats[k] + v);
    return { def: m.def, who, stats, name: m.name, perks: [], sprite: m.recruit.sprite, ...(look ? { look } : {}) };
  };
  const ours = (who) => {
    if (!save.roster[who]) return rival(who, 'homekit');
    const m = member(who);
    return { def: m.def, who, stats: effectiveStats(who, save.roster[who]), name: m.name, perks: perkNames(save.roster[who]),
      sprite: m.recruit ? m.recruit.sprite : null, look: m.recruit ? 'homekit' : null, gear: { ...save.roster[who].gear } };
  };
  const g = TEAMS[vote.goalie];
  const seasonBoost = (save.season - 1) * 0.08;
  const diff = Math.min(1, Math.max(0, (TEAMS[vote.teams[0]].diff + TEAMS[vote.teams[1]].diff) / 2 + 0.08 + (DIFF_OFFSET[save.settings.difficulty] || 0) + seasonBoost));
  return {
    assist: save.settings.assist || 'normal',
    plans: ['balanced', 'balanced'],
    buffs: {},
    teams: [
      { skaters: vote.ours.map(ours), goalie: { stats: goalieStats(save), name: GOALIE.name }, chem: {} },
      { skaters: vote.theirs.map((w) => rival(w)), goalie: { stats: { rfx: g.goalie.rfx + 1, pos: g.goalie.pos + 1 }, name: g.names.goalie, art: g.art }, chem: {} },
    ],
    humanTeam: 0,
    goalieMode: !!opts.goalieMode,
    powers: ['fire', 'ice', 'lightning', 'gravity'],
    twist: 'none',
    diff: [opts.goalieMode ? 0.72 : 0.6, diff],
    seed: (Math.random() * 1e9) >>> 0,
    penalties: false, // All-Star rules: no penalties, and ultimates charge twice as fast
    ultRate: 2,
  };
}

// Rewards from a finished match summary.
export function computeRewards(save, summary, stage, exhibition) {
  const won = summary.winner === 0;
  const baseReward = stage ? stage.reward : 80;
  const lines = [];
  let coins = Math.round(won ? baseReward : baseReward * 0.35);
  lines.push([won ? t('Victory purse') : t('Appearance fee'), coins]);
  const mine = summary.skaters.filter((s) => s.team === 0);
  const goals = mine.reduce((a, s) => a + s.goals, 0);
  const passes = mine.reduce((a, s) => a + s.passes, 0);
  if (goals) { lines.push([t('Goals x{n}', { n: goals }), goals * 10]); coins += goals * 10; }
  if (passes >= 10) { lines.push([t('Teamwork (10+ passes)'), 25]); coins += 25; }
  const pointGetters = mine.filter((s) => s.goals + s.assists > 0).length;
  if (pointGetters === 3) { lines.push([t('Line chemistry (all 3 scored a point)'), 30]); coins += 30; }
  const powerGoals = mine.reduce((a, s) => a + s.powerGoals, 0);
  if (powerGoals) { lines.push([t('Power puck goals'), powerGoals * 15]); coins += powerGoals * 15; }
  const oneTimers = summary.goals.filter((g) => g.team === 0 && g.kind === 'onetimer').length;
  if (oneTimers) { lines.push([t('One-timer goals'), oneTimers * 15]); coins += oneTimers * 15; }
  if (won && summary.score[1] === 0) { lines.push([t('Shutout'), 40]); coins += 40; }
  if (summary.pen) {
    const ppg = summary.pen[0].ppGoals, kills = summary.pen[0].kills;
    if (ppg) { lines.push([t('Power-play goals x{n}', { n: ppg }), ppg * 15]); coins += ppg * 15; }
    if (kills) { lines.push([t('Penalties killed x{n}', { n: kills }), kills * 10]); coins += kills * 10; }
  }
  if (exhibition) { coins = Math.round(coins * 0.5); lines.push([t('Exhibition (half rewards)'), 0]); }
  const mult = (summary.mods || []).reduce((m, id) => m * ((CHALLENGES.find((c) => c.id === id) || {}).mult || 1), 1);
  if (mult !== 1) { const before = coins; coins = Math.round(coins * mult); lines.push([t('Challenges x{n}', { n: +mult.toFixed(2) }), coins - before]); }

  const exp = {};
  for (const s of mine) {
    if (!save.roster[s.id]) continue; // an All-Star guest
    let e = (won ? 45 : 28) + s.goals * 16 + s.assists * 11 + s.steals * 5 + s.hits * 3 + s.blocks * 6 + s.passes * 2 + Math.min(s.skills, 6) * 3 + s.ults * 6;
    if (pointGetters === 3) e += 15;
    if (exhibition) e = Math.round(e * 0.6);
    exp[s.id] = Math.min(220, Math.round(e));
  }
  // chemistry: passes, assists and combo goals between each pair that dressed
  const chem = {};
  const ids = [...new Set(mine.filter((s) => save.roster[s.id]).map((s) => s.id))];
  const pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.push(pairKey(ids[i], ids[j]));
  for (const k of pairs) {
    const c = (summary.chem && summary.chem[k]) || { passes: 0, assists: 0, comboGoals: 0 };
    let x = c.passes + c.assists * 6 + c.comboGoals * 10 + (won ? 3 : 1);
    if (exhibition) x = Math.round(x * 0.6);
    chem[k] = { xp: Math.min(40, x), ...c };
  }
  // in goalie mode Halla played the match herself: double
  const gExp = Math.min(320, Math.round(((won ? 30 : 18) + summary.saves[0] * 3) * (exhibition ? 0.6 : 1) * (summary.goalieMode ? 2 : 1)));
  return { won, coins, lines, exp, gExp, chem };
}

// Apply EXP; returns level-up events.
export function applyExp(save, id, amount) {
  const r = save.roster[id];
  const ups = [];
  r.exp += amount;
  while (r.level < MAX_LEVEL && r.exp >= expToNext(r.level)) {
    r.exp -= expToNext(r.level);
    r.level++;
    r.points++;
    const pi = PERK_LEVELS.indexOf(r.level);
    if (pi >= 0) r.pendingPerk = pi;
    ups.push({ id, level: r.level, perk: pi >= 0 ? pi : null });
  }
  if (r.level >= MAX_LEVEL) r.exp = Math.min(r.exp, expToNext(r.level));
  return ups;
}

// Add chemistry XP; returns [{ key, level }] for every pair that levelled up.
export function applyChem(save, gains) {
  const ups = [];
  for (const [k, g] of Object.entries(gains)) {
    const before = chemLevel(save.chem[k] || 0);
    save.chem[k] = (save.chem[k] || 0) + g.xp;
    const after = chemLevel(save.chem[k]);
    if (after > before) ups.push({ key: k, level: after });
  }
  return ups;
}

// Rewards for a finished training drill. Uses a session if one is left.
export function drillRewards(save, id, charId, score, medal, tables, opts = {}) {
  const tr = save.training;
  const prevBest = tr.best[id];
  const lowerBetter = id === 'cones';
  const newBest = prevBest === undefined || prevBest === null || (lowerBetter ? score < prevBest : score > prevBest);
  if (newBest) tr.best[id] = score;
  const prevMedal = tr.medals[id] || 0;
  let bonus = 0;
  for (let t = prevMedal + 1; t <= medal; t++) bonus += tables.firstMedal[t];
  if (medal > prevMedal) tr.medals[id] = medal;
  const rewarded = !opts.practice && tr.sessions > 0; // (Skills Night runs don't use a session)
  const exp = rewarded ? tables.exp[medal] : 0;
  const coins = (rewarded ? tables.coins[medal] : 0) + bonus;
  if (rewarded) tr.sessions--;
  save.coins += coins;
  const ups = exp ? applyExp(save, charId, exp) : [];
  return { newBest, prevBest, exp, coins, bonus, rewarded, ups, medal, prevMedal };
}

export function applyGoalieExp(save, amount) {
  const g = save.goalie;
  g.exp += amount;
  let up = 0;
  while (g.level < MAX_LEVEL && g.exp >= expToNext(g.level)) { g.exp -= expToNext(g.level); g.level++; up++; }
  return up;
}

export function canRaise(r, id, k) {
  return r.points > 0 && r.alloc[k] < STAT_CAP_BONUS && member(id).base[k] + r.alloc[k] < 12;
}

// Chemistry levels for every pair in a line, keyed by member pair.
export function lineChem(save, line) {
  const out = {};
  for (let i = 0; i < line.length; i++) for (let j = i + 1; j < line.length; j++) {
    const k = pairKey(line[i], line[j]);
    out[k] = chemLevel(save.chem[k] || 0);
  }
  return out;
}

export function currentStage(save) {
  return TOURNAMENT.stages[Math.min(save.stage, TOURNAMENT.stages.length - 1)];
}
