// Save data, stats, levelling, rewards and match setup.

import { GUIDE } from './guide.js';
import {
  CHARACTERS, GEAR_BY_ID, STAT_KEYS, TEAMS, TOURNAMENT, GOALIE, COMBOS, CHEM_LEVELS, CHALLENGES, ROLE, CAST_PAIRS, makeDef, perkSlot,
  RECRUITS, ROOKIES, LEGENDS, LEGEND_ART, LEGEND_FACES, GOALIE_RECRUITS, FREE_GOALIES, setFreeGoalies, setGoalieLooks, goalieInfo, areTwins, setRookies, setStyles, ELEMENTS, ARCHETYPES, member, pairKey, recruitKey, slotDef, GOALIE_STYLES, RIVAL_IDS, slotSprite, slotLook, CLUB_DEFAULT } from './data.js';
import { newLeague, migrateLeague } from './league.js';
import { lookFor, maskFor, goalieArt, isPartsArt } from './modular.js';
import { seasonStats } from './awards.js';
import { rivalSub, setFills, agedStats, grown, goalieGrowth, leagueGrowth, seasonBoost, GOALIE_CAP } from './slots.js';
import { leagueRivals } from './league.js';
import { t } from './i18n.js';
import { drillExpMul, staminaRegenMul } from './facilities.js';
import { addNews } from './news.js';

// Profiles: up to three saves on one device (a family sharing a tablet), each its own club, cloud
// backup and leaderboard name. The first is the save from before there were profiles.
const BASE_KEY = 'glacial-strikers-save-v1', PROFILE_KEY = 'puckbound-profile';
export const PROFILES = 3;
const keyOf = (i) => (i ? `${BASE_KEY}-p${i + 1}` : BASE_KEY);
let profile = 0;
try { if (typeof window !== 'undefined') profile = Math.max(0, Math.min(PROFILES - 1, (+localStorage.getItem(PROFILE_KEY)) | 0)); } catch { /* storage unavailable */ }
let KEY = keyOf(profile);
export const currentProfile = () => profile;
// Switch profiles (the game reloads to pick the new one up).
export function setProfile(i) {
  profile = Math.max(0, Math.min(PROFILES - 1, i | 0)); KEY = keyOf(profile);
  try { localStorage.setItem(PROFILE_KEY, String(profile)); } catch { /* storage unavailable */ }
}
// What's in each: [{ i, empty } | { i, name, season, played, coins, cups }].
export function profileSummaries() {
  return Array.from({ length: PROFILES }, (_, i) => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(keyOf(i)) || 'null'); } catch { s = null; }
    if (!s || s.v !== 1) return { i, empty: true };
    return { i, name: (s.club && s.club.name) || CLUB_DEFAULT.name, crest: (s.club && s.club.crest) || CLUB_DEFAULT.crest, season: s.season || 1, played: (s.record && s.record.played) || 0, coins: s.coins || 0, cups: s.cups || 0 };
  });
}
// Erase another profile (the one in use is reset from Settings).
export function eraseProfile(i) {
  if (i === profile || saveOff) return false;
  try { localStorage.removeItem(keyOf(i)); localStorage.removeItem(keyOf(i) + '.unread'); } catch { return false; }
  return true;
}
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
    chem: Object.fromEntries(CAST_PAIRS.map((k) => [k, 0])), // chemistry XP per pair of members
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
      markers: 'color', passRing: true, puck: 'auto', textSize: 'normal', touchSize: 'normal', lefty: false, breakAfter: 0, simple: false, simple2: 'none', little: false, sign: '', race: true,
    },
    record: { played: 0, wins: 0, goals: 0 },
    rookies: {}, // drafted rookies by roster id (rk1, rk2, …), see draft.js
    goalies: {}, // signed rival goalies by key ('rams_g'): { level, exp, gear }; Halla is save.goalie
    goalieStarter: 'halla', // who starts in goal
    draft: null, // this season's Draft Day once it's over
  };
}

// Little player (Settings): one tap sets the game up for the youngest, and off puts the
// player's own settings back as they were.
export const LITTLE = { simple: true, difficulty: 'easy', speed: 'relaxed', assist: 'strong', touchSize: 'large', puck: 'ring' };
export function setLittle(settings, on) {
  if (on && !settings.little) {
    settings.littlePrev = Object.fromEntries(Object.keys(LITTLE).map((k) => [k, settings[k]]));
    Object.assign(settings, LITTLE);
    settings.little = true;
  } else if (!on && settings.little) {
    Object.assign(settings, settings.littlePrev || {});
    delete settings.littlePrev;
    settings.little = false;
  }
}

export function loadSave() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
    // players who already know their way around don't need the coach's first-time tips
    if (!s.guide && s.record && s.record.played >= 3) s.guide = { done: GUIDE.map((g) => g.id), off: false, hints: ['ult', 'combo'] };
    const legacy = !s.league || !s.league.schedule; // (from before the league: see below)
    // fill fields added later
    const base = newSave();
    for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
    for (const k of Object.keys(base.settings)) if (s.settings[k] === undefined) s.settings[k] = base.settings[k];
    // rookies drafted before the parts art was in get a face of their own once it is
    for (const [id, k] of Object.entries(s.rookies || {})) if (!k.parts) { const l = lookFor(id); if (l) k.parts = l; }
    setRookies(s.rookies); // drafted rookies (and signed free agents), so member() knows them
    for (const [id, g] of Object.entries(s.freeGoalies || {})) if (!g.look) { const m = maskFor(id); if (m) g.look = m; } // (a mask of their own once the art's in)
    setFreeGoalies(s.freeGoalies); // free-agent goalies, so goalieInfo() knows them
    setGoalieLooks(s.goalieLooks); // masks picked at goalie camp
    setFills(s); // the rivals' fills, so their portraits know them
    setStyles(s.roster); // changes made at the training camp
    // perks are kept as text: a player whose super or archetype has changed since gets the
    // same choice from their new lists
    for (const [id, r] of Object.entries(s.roster)) { const m = member(id); if (m) remapPerks(r, m.def); }
    for (const id of Object.keys(CHARACTERS)) if (!s.roster[id]) s.roster[id] = base.roster[id];
    for (const [role, who] of Object.entries(s.lineup)) {
      const m = member(who);
      if (!s.roster[who] || !m || m.role !== role) s.lineup[role] = base.lineup[role];
    }
    for (const k of CAST_PAIRS) if (typeof s.chem[k] !== 'number') s.chem[k] = 0;
    if (legacy) s.league = migrateLeague(s);
    return s;
  } catch (e) {
    // a save this version can't read: kept aside (never overwritten by the fresh one that
    // starts now), so a fix can bring it back
    console.error('save not loaded', e);
    try { if (raw && !localStorage.getItem(KEY + '.unread')) localStorage.setItem(KEY + '.unread', raw); } catch { /* storage full */ }
    return null;
  }
}

// A test run (?twins=1) plays on a copy: nothing is written.
let saveOff = false;
export const setSaveOff = (on) => { saveOff = on; };
export const savesOff = () => saveOff;

export function writeSave(s) {
  if (saveOff) return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function clearSave() {
  if (saveOff) return; // (a test run never touches the real save)
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

// (the top levels take longer: a season or so each, once you're past six)
export const expToNext = (level) => 100 + (level - 1) * 60 + Math.max(0, level - 5) ** 2 * 45;

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

export function newMember() {
  return {
    level: 1, exp: 0, points: 0, alloc: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    perks: [], pendingPerk: null,
    gear: { stick: 'stick_wood', skates: 'skate_start', armor: 'arm_none' },
  };
}

// ---------------------------------------------------------------- roster and recruitment
export const lineupIds = (save) => [save.lineup.C, save.lineup.W, save.lineup.D];
export const rosterIds = (save) => Object.keys(save.roster).filter((id) => member(id));
// A rival's player gone from their club: signed by us, or traded on to another club's reserves.
export const isSigned = (save, key) => !!save.roster[key] || !!(save.goalies && save.goalies[key]) || !!(save.tradedAway && save.tradedAway[key]);

// A rival's skaters can be signed once you've beaten that team.
export function recruitStatus(save, key) {
  if (save.roster[key]) return 'signed';
  if (save.tradedAway && save.tradedAway[key]) return 'traded';
  if (save.retired && save.retired[key]) return 'retired';
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

// Perks are kept as text, by tier: after a change of super or style, each one becomes the same
// choice (first or second) on the player's new lists.
export function remapPerks(r, def) {
  r.perks = r.perks.map((p, i) => {
    if (!def.perks[i] || def.perks[i].includes(p)) return p;
    const slot = perkSlot(p);
    return slot ? def.perks[i][slot.i] : p;
  });
}

// The training camp: once a season each, a player can take an element stone (a new super,
// from Ottar) or a week of Brekka's style camp (a new archetype).
export const CAMP = { elem: { price: 220 }, arch: { price: 180 } };
export function campOpen(save, id, kind) {
  const r = save.roster[id];
  return !!r && !(r.camp && r.camp[kind] === save.season);
}
export function campChoices(id, kind) {
  const m = member(id);
  if (!m) return [];
  return kind === 'elem' ? Object.keys(ELEMENTS) : Object.values(ARCHETYPES).filter((a) => a.roles.includes(m.role)).map((a) => a.id);
}
export function campChange(save, id, kind, value) {
  const r = save.roster[id], m = member(id);
  if (!r || !m || !campOpen(save, id, kind) || save.coins < CAMP[kind].price) return false;
  if (!campChoices(id, kind).includes(value) || m.def[kind] === value) return false;
  save.coins -= CAMP[kind].price;
  r[kind] = value;
  r.camp = { ...(r.camp || {}), [kind]: save.season };
  setStyles(save.roster);
  remapPerks(r, member(id).def);
  return true;
}

// What a rival's star costs now: their price, more each season as the league gets better.
export const recruitPrice = (save, key) => Math.round((RECRUITS[key].price * (1 + 0.12 * Math.min(8, (save.season || 1) - 1))) / 10) * 10; // (for eight seasons)
export function signRecruit(save, key) {
  const r = RECRUITS[key];
  if (!r || recruitStatus(save, key) !== 'open' || save.coins < recruitPrice(save, key)) return null;
  save.coins -= recruitPrice(save, key);
  addNews(save, { k: 'weSign', name: r.name, team: r.team });
  return addRecruit(save, key);
}

// A rival's player joins (signed, or in a trade): a level below the line-up, points to spend,
// and the perks they already had.
export function addRecruit(save, key) {
  const r = RECRUITS[key];
  const m = newMember();
  const level = joinLevel(save);
  m.level = m.joined = level;
  m.points = level - 1 + 4 * leagueGrowth(save); // yours to spend (and what they've grown since the first season)
  const opts = member(key).def.perks;
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
export const homeKitGroups = (save) => {
  const ids = rosterIds(save), legends = ids.filter((id) => LEGENDS[id]);
  return [...new Set([
    ...ids.filter((id) => RECRUITS[id]).map((id) => (TEAMS[RECRUITS[id].team].art ? 'rival_' + TEAMS[RECRUITS[id].team].art : RECRUITS[id].parts ? 'parts' : 'rival_' + TEAMS[RECRUITS[id].team].mark)), // (an expansion club's player: from parts, or their captain's own art)
    ...Object.keys(save.goalies || {}).filter((k) => GOALIE_RECRUITS[k]).map((k) => (isPartsArt(GOALIE_RECRUITS[k].art) ? 'goalie_parts' : { newcomer: 'newcomers' }[GOALIE_RECRUITS[k].art] || 'rival_' + GOALIE_RECRUITS[k].art)), // signed goalies
    ...(Object.keys(save.goalies || {}).some((k) => FREE_GOALIES[k] && FREE_GOALIES[k].look) ? ['goalie_parts'] : []), // (free agents with a mask of their own)
    ...(ids.some((id) => ROOKIES[id] && !member(id).parts) || legends.some((id) => !LEGEND_ART.has(LEGENDS[id].art)) || Object.keys(save.goalies || {}).some((k) => FREE_GOALIES[k]) ? ['newcomers'] : []), // (a free-agent goalie wears the newcomer goalie)
    ...(ids.some((id) => member(id).parts) ? ['parts'] : []), // players from parts (Batch AJ: the 'parts' page group)
    ...(legends.some((id) => LEGEND_ART.has(LEGENDS[id].art) || LEGEND_FACES.has(LEGENDS[id].art)) ? ['legends'] : []),
    ...(legends.some((id) => LEGEND_ART.has(LEGENDS[id].art)) ? ['legends_ice'] : []), // their skating sets (Batch AI part 2)
  ])];
};

// The league keeps up: at the start of a season, after a season we won most of (prev: last
// season's league), how far our line's numbers are ahead of the rival skaters' (average stat
// total per skater). A lead of up to EDGE_FREE is ours to enjoy; past it, every EDGE_STEP more
// puts the rivals a point up on their four best stats, up to 3. The goalies the same way, a
// point on reflexes and positioning per two we're ahead past two. Returns the skater edge (and
// puts it in the news when either grows).
export const EDGE_FREE = 3, EDGE_STEP = 3;
export function lastSeasonRate(L) {
  let w = 0, n = 0;
  for (const round of (L && L.results) || []) {
    const g = round.find((r) => r.a === 'home' || r.b === 'home');
    if (!g) continue;
    n++;
    if (g.a === 'home' ? g.ga > g.gb : g.gb > g.ga) w++;
  }
  return n ? w / n : 0;
}
export function setLeagueEdge(save, prevLeague = null) {
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const ours = lineupIds(save).reduce((a, id) => a + sum(effectiveStats(id, save.roster[id])), 0) / 3;
  const prev = save.leagueEdge || 0; // (last season's edge)
  save.leagueEdge = 0;
  const rivals = leagueRivals(save.league);
  const theirs = rivals.reduce((a, id) => a + matchConfig(save, id, null).teams[1].skaters.reduce((b, k) => b + sum(k.stats), 0) / 3, 0) / Math.max(1, rivals.length);
  save.leagueEdge = Math.max(0, Math.min(3, Math.floor((ours - theirs - EDGE_FREE) / EDGE_STEP) + 1));
  if (ours - theirs <= EDGE_FREE) save.leagueEdge = 0;
  // the goalies the same way: our starter's reflexes and positioning against the rivals' average
  const gPrev = save.goalieEdge || 0;
  save.goalieEdge = 0;
  const g = goalieStats(save), gOurs = g.rfx + g.pos;
  const gTheirs = rivals.reduce((a, id) => { const r = rivalGoalie(save, id).stats; return a + r.rfx + r.pos; }, 0) / Math.max(1, rivals.length);
  save.goalieEdge = Math.max(0, Math.min(3, Math.floor((gOurs - gTheirs - 2) / 2)));
  if (prevLeague && lastSeasonRate(prevLeague) < 0.6) { save.leagueEdge = 0; save.goalieEdge = 0; } // (no runaway last season: no catching up)
  if (save.leagueEdge > prev || save.goalieEdge > gPrev) addNews(save, { k: 'edge', n: save.leagueEdge + save.goalieEdge });
  return save.leagueEdge;
}

export function effectiveStats(id, r) {
  const base = member(id).base;
  const gm = gearMods(r);
  const out = {};
  for (const k of STAT_KEYS) out[k] = Math.max(1, Math.min(13, base[k] + r.alloc[k] + gm[k]));
  return out;
}

export function perkNames(r) { return r.perks.map((p) => p.split(':')[0]); }

// Goalies: Halla ('halla', save.goalie) and any rival goalies signed (save.goalies).
export const goalieIds = (save) => ['halla', ...Object.keys(save.goalies || {}).filter((k) => GOALIE_RECRUITS[k] || FREE_GOALIES[k])];
export const starterId = (save) => (goalieIds(save).includes(save.goalieStarter) ? save.goalieStarter : 'halla');

// Who's in the season's team photo (kept with the season in the club's history): the line-up
// in front, up to five more behind, the starting goalie and one more, and the Cup if it's ours.
export function teamPhoto(save, champ) {
  const line = lineupIds(save), rest = rosterIds(save).filter((id) => !line.includes(id));
  const keepers = [starterId(save), ...goalieIds(save).filter((g) => g !== starterId(save))].slice(0, 2);
  return { ids: [...line, ...rest].slice(0, 8), keepers, champ: !!champ };
}
export const goalieRec = (save, id) => (id === 'halla' ? save.goalie : save.goalies && save.goalies[id]);

export function goalieStats(save, id = starterId(save)) {
  const g = goalieRec(save, id), base = goalieInfo(id).base;
  const gear = GEAR_BY_ID[g.gear];
  const rfx = base.rfx + Math.floor((g.level - 1) / 2) + (gear?.mods.rfx || 0);
  return { rfx, pos: base.pos + Math.floor(g.level / 3) };
}

// Our goalie in a match config: who starts, in their own art (our colours) and style.
export function homeGoalie(save) {
  const id = starterId(save), info = goalieInfo(id);
  return { stats: goalieStats(save, id), name: info.name, art: info.art, look: info.art ? 'homekit' : null, mask: info.mask || null, style: goalieStyle(save, id), who: id };
}
// A rival's goalie: their own, or a backup once you've signed theirs.
export function rivalGoalie(save, teamId) {
  const t = TEAMS[teamId];
  const gg = goalieGrowth(save); // (the league gets better)
  if (isSigned(save, teamId + '_g')) return { stats: { rfx: Math.min(GOALIE_CAP, Math.max(3, t.goalie.rfx - 1) + gg), pos: Math.min(GOALIE_CAP, Math.max(3, t.goalie.pos - 1) + gg) }, name: t.subs.goalie || t.names.goalie, art: 'newcomer', style: 'hybrid', who: 'sub_goalie' }; // (the plain away goalie until the newcomer goalie, Batch AN)
  return { stats: { rfx: Math.min(GOALIE_CAP, t.goalie.rfx + gg), pos: Math.min(GOALIE_CAP, t.goalie.pos + gg) }, name: t.names.goalie, art: t.art || (t.goalieLook ? goalieArt(t.goalieLook) : 'newcomer'), mask: t.goalieLook || null, style: t.gstyle || 'hybrid' }; // (an expansion club's goalie: the newcomer goalie)
}

export function goalieStatus(save, key) {
  if (save.goalies && save.goalies[key]) return 'signed';
  const rec = save.rivals && save.rivals[GOALIE_RECRUITS[key].team];
  return rec && rec.wins > 0 ? 'open' : 'locked';
}
// A rival goalie signs: a level below Halla's, with her gear's starter set.
export function signGoalie(save, key) {
  const g = GOALIE_RECRUITS[key];
  if (!g || goalieStatus(save, key) !== 'open' || save.coins < g.price) return null;
  save.coins -= g.price;
  (save.goalies ||= {})[key] = { level: Math.max(1, save.goalie.level - 1), exp: 0, gear: 'g_start' };
  addNews(save, { k: 'weGoalie', name: g.name, team: g.team });
  return save.goalies[key];
}
// Goalies go to camp too: a new goaltending style, once a season.
export const GOALIE_CAMP = { price: 200 };
export const goalieStyle = (save, id) => (goalieRec(save, id) && goalieRec(save, id).style) || goalieInfo(id).style;
export function goalieCampOpen(save, id) {
  const g = goalieRec(save, id);
  return !!g && g.camp !== save.season;
}
export function goalieCampChange(save, id, style) {
  const g = goalieRec(save, id);
  if (!g || !GOALIE_STYLES[style] || style === goalieStyle(save, id) || !goalieCampOpen(save, id) || save.coins < GOALIE_CAMP.price) return false;
  save.coins -= GOALIE_CAMP.price;
  g.style = style;
  g.camp = save.season;
  return true;
}
// A goalie made from parts can wear any mask design in any paint: free, whenever, at goalie
// camp. Their build stays. Returns the new look, or null.
export const canPickMask = (save, id) => !!(goalieRec(save, id) && goalieInfo(id).mask);
export function pickMask(save, id, change) {
  if (!canPickMask(save, id)) return null;
  const look = { ...goalieInfo(id).mask, ...change };
  (save.goalieLooks ||= {})[id] = look;
  setGoalieLooks(save.goalieLooks);
  return look;
}
export function setStarter(save, id) {
  if (!goalieIds(save).includes(id)) return false;
  save.goalieStarter = id;
  return true;
}

const DIFF_OFFSET = { easy: -0.15, normal: 0, hard: 0.12 };
// a rival's stat bonus on top of a skater's numbers
const withBonus = (base, t) => { const st = { ...base }; for (const [k, v] of Object.entries(t.bonus || {})) st[k] = Math.max(1, st[k] + v); return st; };

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
        sprite: m.sprite, look: m.look, parts: m.parts, gear: { ...save.roster[who].gear }, twin: m.legend ? m.legend.twin : null, hand: m.hand,
      };
    }),
    goalie: homeGoalie(save),
    chem: lineChem(save, line),
  };
  const away = {
    skaters: ids.map((id) => {
      const stats = { ...CHARACTERS[id].base };
      for (const [k, v] of Object.entries(t.bonus || {})) stats[k] = Math.max(1, stats[k] + v);
      // a slot whose skater you signed: whoever they brought in, a newcomer in their colours
      const sub = rivalSub(save, teamId, id);
      if (sub) return { def: sub.def, who: 'sub_' + id, stats: grown(save, withBonus(sub.stats, t)), name: sub.name, perks: [], sprite: sub.sprite, parts: sub.parts, hand: sub.hand };
      return { def: slotDef(teamId, id), stats: grown(save, agedStats(save, teamId, id, stats)), name: t.names[id], perks: [], sprite: slotSprite(teamId, id), parts: slotLook(teamId, id), hand: RECRUITS[recruitKey(teamId, id)]?.hand };
    }),
    goalie: rivalGoalie(save, teamId),
    chem: Object.fromEntries(CAST_PAIRS.map((k) => [k, Math.min(3, (t.chem || 0) + (save.season > 1 ? 1 : 0))])),
  };
  const diff = Math.min(1, Math.max(0, t.diff + (DIFF_OFFSET[save.settings.difficulty] || 0) + seasonBoost(save)));
  // locker-room buffs: stat bumps and goalie reflex land here, the rest goes to the match
  const fx = opts.buffs;
  if (fx) {
    for (const b of fx.stats) for (const sk of home.skaters) if (b.who === 'all' || b.who === sk.who) sk.stats[b.stat] = Math.min(13, sk.stats[b.stat] + b.v);
    home.goalie.stats.rfx += fx.goalieRfx;
  }
  return {
    assist: save.settings.assist || 'normal',
    plans: opts.plans || ['balanced', 'balanced'],
    buffs: { ...(fx ? { ultStart: fx.ultStart, staminaMul: fx.staminaMul, oppGoalieMul: fx.oppGoalieMul, stealMul: fx.stealMul } : {}), regenMul: staminaRegenMul(save) }, // (and the physio room)
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
export function allStarVote(save, L) {
  const st = seasonStats(L);
  const pts = (key) => { const r = st.skaters[key]; return r ? r.g * 3 + r.a * 2 + (r.hits + r.steals) * 0.25 : 0; };
  const line = lineupIds(save);
  const star = [...line].sort((a, b) => pts(`home:${b}`) - pts(`home:${a}`) || line.indexOf(a) - line.indexOf(b))[0];
  const stars = (team) => ['frost', 'thunder', 'stone'].filter((kit) => !isSigned(save, recruitKey(team, kit)) && !(save.retired && save.retired[recruitKey(team, kit)]))
    .map((kit) => ({ team, kit, who: recruitKey(team, kit), pts: pts(`${team}:${kit}`) }))
    .sort((a, b) => b.pts - a.pts || a.kit.localeCompare(b.kit));
  const teams = leagueRivals(L).map((team) => ({ team, list: stars(team) })).filter((x) => x.list.length >= 2)
    .sort((a, b) => (b.list[0].pts + b.list[1].pts) - (a.list[0].pts + a.list[1].pts) || RIVAL_IDS.indexOf(a.team) - RIVAL_IDS.indexOf(b.team));
  let pair = null; // the best two teams that leave three for the other bench
  for (let i = 0; i < teams.length && !pair; i++) for (let j = i + 1; j < teams.length && !pair; j++) if (teams[i].list.length + teams[j].list.length >= 5) pair = [teams[i], teams[j]];
  if (!star || !pair) return null;
  const [A, B] = pair;
  const theirs = [...A.list.slice(1), ...B.list.slice(1)].sort((a, b) => b.pts - a.pts).slice(0, 3);
  // the better save percentage, and a club's own goalie over the backup in for one we signed
  const svp = (team) => { const g = st.goalies[team]; return (g && g.sa ? g.sv / g.sa : 0) - (isSigned(save, team + '_g') ? 1 : 0); };
  const goalie = svp(B.team) > svp(A.team) ? B.team : A.team;
  return { star, ours: [star, A.list[0].who, B.list[0].who], theirs: theirs.map((x) => x.who), teams: [A.team, B.team], goalie,
    points: Object.fromEntries([[star, pts(`home:${star}`)], ...[...A.list, ...B.list].map((x) => [x.who, x.pts])]) };
}

// A vote kept from earlier in the season still stands while our star is still ours, and
// nobody on it has since retired or left their club (signed by us: then they'd be in our
// line-up and theirs; our guests may have joined us since, and play for us either way).
export function allStarVoteStands(save, vote) {
  const gone = (who) => !!(save.retired && save.retired[who]) || !!(save.tradedAway && save.tradedAway[who]);
  return !!save.roster[vote.star] && vote.ours.slice(1).every((w) => save.roster[w] || !gone(w))
    && vote.theirs.every((w) => !isSigned(save, w) && !gone(w));
}

// Match config for the All-Star Game (like matchConfig, from a vote).
export function allStarConfig(save, vote, opts = {}) {
  const rival = (who, look) => {
    const m = member(who), t = TEAMS[m.recruit.team];
    const stats = { ...m.base };
    for (const [k, v] of Object.entries(t.bonus || {})) stats[k] = Math.max(1, stats[k] + v);
    return { def: m.def, who, stats, name: m.name, perks: [], sprite: m.sprite || m.recruit.sprite, parts: m.parts || null, ...(look ? { look } : {}) };
  };
  const ours = (who) => {
    if (!save.roster[who]) return rival(who, 'homekit'); // (a guest: see allStarVoteStands)
    const m = member(who);
    return { def: m.def, who, stats: effectiveStats(who, save.roster[who]), name: m.name, perks: perkNames(save.roster[who]),
      sprite: m.sprite, look: m.look, parts: m.parts, gear: { ...save.roster[who].gear } };
  };
  const g = TEAMS[vote.goalie], rg = rivalGoalie(save, vote.goalie); // (their backup, if we signed theirs)
  const diff = Math.min(1, Math.max(0, (TEAMS[vote.teams[0]].diff + TEAMS[vote.teams[1]].diff) / 2 + 0.08 + (DIFF_OFFSET[save.settings.difficulty] || 0) + seasonBoost(save)));
  return {
    assist: save.settings.assist || 'normal',
    plans: ['balanced', 'balanced'],
    buffs: {},
    teams: [
      { skaters: vote.ours.map(ours), goalie: homeGoalie(save), chem: {} },
      { skaters: vote.theirs.map((w) => rival(w)), goalie: { stats: isSigned(save, vote.goalie + '_g') ? { rfx: rg.stats.rfx + 1, pos: rg.stats.pos + 1 } : { rfx: g.goalie.rfx + 1, pos: g.goalie.pos + 1 }, name: rg.name, art: rg.art, mask: rg.mask || null }, chem: {} },
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
  r.exp += ROOKIES[id] ? Math.round(amount * rookieExpMul(ROOKIES[id])) : amount;
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
  const exp = rewarded ? Math.round(tables.exp[medal] * drillExpMul(save)) : 0; // (the training centre adds to it)
  const coins = (rewarded ? tables.coins[medal] : 0) + bonus;
  if (rewarded) tr.sessions--;
  save.coins += coins;
  const ups = exp ? applyExp(save, charId, exp) : [];
  return { newBest, prevBest, exp, coins, bonus, rewarded, ups, medal, prevMedal };
}

export function applyGoalieExp(save, amount, id = starterId(save)) {
  const g = goalieRec(save, id) || save.goalie;
  g.exp += amount;
  let up = 0;
  while (g.level < MAX_LEVEL && g.exp >= expToNext(g.level)) { g.exp -= expToNext(g.level); g.level++; up++; }
  return up;
}

export function canRaise(r, id, k) {
  return r.points > 0 && r.alloc[k] < capBonus(id) && member(id).base[k] + r.alloc[k] < 12;
}

// Drafted rookies learn faster the higher their potential, and can raise each stat further.
export const rookieExpMul = (k) => 1 + 0.15 * (k.potential - 1);
export const capBonus = (id) => STAT_CAP_BONUS + (ROOKIES[id] ? Math.max(0, ROOKIES[id].potential - 2) : 0);

// Chemistry levels for every pair in a line, keyed by member pair.
export function lineChem(save, line) {
  const out = {};
  for (let i = 0; i < line.length; i++) for (let j = i + 1; j < line.length; j++) {
    const k = pairKey(line[i], line[j]);
    out[k] = areTwins(line[i], line[j]) ? 3 : chemLevel(save.chem[k] || 0); // twins: a bond from day one
  }
  return out;
}

export function currentStage(save) {
  return TOURNAMENT.stages[Math.min(save.stage, TOURNAMENT.stages.length - 1)];
}
