// Menu screens: title, hub (tournament / team / shop / training), dialogue, results.

import { Assets } from './assets.js';
import {
  CHARACTERS, GEAR, GEAR_BY_ID, TEAMS, TOURNAMENT, STAT_KEYS, STAT_NAMES, STAT_HINT,
  POWER_INFO, TWIST_INFO, GOALIE, COMBOS, CHEM_LEVELS, CHALLENGES, GAME_PLANS, ROLE, ART_NAME, ARENAS,
  RECRUITS, ROOKIES, LEGENDS, LEGEND_ART, LEGEND_FACES, GOALIE_RECRUITS, FREE_GOALIES, GOALIE_STYLES, goalieInfo, RIVAL_IDS, slotLook, CAST_PAIRS, ELEMENTS, ARCHETYPES, makeDef, member, comboFor, recruitKey, pairKey, GEAR_LOOK, CLUB, CLUB_DEFAULT, CLUB_PRESETS, CLUB_CRESTS, clubCrestId, PALETTES, clubText, applyClub, hexToHsv, teamInfo,
} from './data.js';
import { standings, classicOpponent, CLASSIC_AFTER, ALLSTAR_AFTER, leagueRivals } from './league.js';
import { BUFF_TEXT } from './lockerroom.js';
import { ACHIEVEMENTS } from './achievements.js';
import { AWARDS, AWARD_BY_ID, seasonStats } from './awards.js';
import { dailyFor, dailyGoal, dayKey, currentStreak, doneToday, dailyReward, dailyState } from './daily.js';
import {
  expToNext, effectiveStats, gearMods, canRaise, writeSave, MAX_LEVEL, goalieStats, STAT_CAP_BONUS, clearSave,
  chemLevel, chemProgress, lineupIds, rosterIds, recruitStatus, signRecruit, setLineup, joinLevel, isSigned, homeKitGroups, capBonus,
  CAMP, campOpen, campChoices, campChange, recruitPrice, goalieIds, starterId, goalieRec, goalieStatus, signGoalie, setStarter, GOALIE_CAMP, goalieStyle, goalieCampOpen, goalieCampChange,
} from './progress.js';
import { BOARD_INFO, fetchBoard, onlineState, tagOf, configured, onlineOn, cloudState, formatCode, restoreLink, fetchCloudSave, resetsIn, groupsOf, createGroup, joinGroup, leaveGroup, inviteLink, MAX_GROUPS, fetchCup, fetchGhost, CHALLENGE_BOARDS, createChallenge, fetchChallenge, challengeLink } from './online.js';
import { nextGuide, doneGuide, guideOff } from './guide.js';
import { draftOpen, draftPick, otherPicks, POTENTIAL_GRADE, DRAFT_LINES } from './draft.js';
import { careerOf, careerRows, careerGoalies } from './career.js';
import { legendState, legendLeft, signLegend } from './legends.js';
import { tradeable, tradeQuote, trade, TEAM_LIKES } from './trades.js';
import { rivalSub, fillLook, vacated, ageOf, RETIRE_AT, leagueGrowth } from './slots.js';
import { acceptOffer } from './moves.js';
import { agentState, marketOpen, agentsLeft, signAgent } from './agents.js';
import { latestNews } from './news.js';
import { audio } from './audio.js';
import { t } from './i18n.js';
const VOLUMES = () => [[0, t('Off')], [0.35, t('Low')], [0.7, t('Mid')], [1, t('Full')]];
// dialogue voices: each role speaks at its own pitch; rivals a little lower
const VOICE = { frost: 660, thunder: 800, stone: 470, goalie: 590 };
const voicePitch = (kit, us) => { const p = VOICE[String(kit).replace(/^sub_/, '')] || 620; return us ? p : p * 0.88; };
// Connected controllers: any at all, and whether it's a PlayStation pad (for button names).
// "Backed up 3 min ago" for the settings
function cloudStatus(save) {
  if (!configured()) return t('Opens with the online leaderboards. Your backup code is ready now.');
  const at = cloudState(save).at;
  if (!at) return t('Your save backs up automatically when you\'re in the locker room.');
  const min = Math.round((Date.now() - at) / 60000);
  return min < 1 ? t('Backed up just now.') : min < 60 ? t('Backed up {n} min ago.', { n: min }) : t('Backed up {when}.', { when: new Date(at).toLocaleString() });
}
const padList = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
const psPad = () => padList().some((p) => /dualsense|dualshock|playstation|054c/i.test(p.id));
import { DRILLS, MEDAL_NAMES, MEDAL_COLORS, formatScore } from './drills.js';
import { SKILLS_EVENTS, placeIn } from './skills.js';

const PORTRAIT = { frost: 'frost_captain', thunder: 'thunder_winger', stone: 'stone_defender', goalie: 'goalie' };
const ROLE_NAME = { C: 'Centre', W: 'Winger', D: 'Defender' };
const SLOT_NAMES = { stick: 'Stick', skates: 'Skates', armor: 'Protection', goalie: 'Goalie gear' };

// Portrait of a roster slot. Our cast has five expressions for dialogue; each rival has
// its own cast (the captain with expressions), shown in that team's colours.
// Icons of our own art use the club colours when the club has custom ones.
const CLUB_PAGES = () => (PALETTES.club.recolor ? 'club' : null);
const hexToHsvUI = (hex) => hexToHsv(hex);

export const portrait = (id, team, teamId, size = 160, expr = null) => {
  const P = Assets.atlas.portraits || {};
  if (id === 'halla') id = 'goalie';
  if (team === 0 && goalieInfo(id).mask) { // a goalie made from parts (Batch AT): their mask, in our colours
    const url = Assets.goaliePortrait(goalieInfo(id).mask, expr || 'neutral', size, 'homekit');
    if (url) return url;
  }
  if (team === 0 && FREE_GOALIES[id]) { // a free-agent goalie: the newcomer goalie (Batch AN) in our colours
    const p = P.newcomer_g, fid = p && ((expr && p[expr]) || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT.goalie}`, size, CLUB_PAGES());
  }
  if (team === 0 && GOALIE_RECRUITS[id]) { // a signed rival goalie, in our colours
    const p = P[`${GOALIE_RECRUITS[id].art}_g`], fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT.goalie}`, size, CLUB_PAGES());
  }
  if (team === 0 && RECRUITS[id] && member(id).parts) { // a signing from an expansion club: made from parts, in our colours
    const url = Assets.partsPortrait(member(id).parts, expr || 'neutral', size, 'homekit');
    if (url) return url;
  }
  if (team === 0 && RECRUITS[id]) {
    // a signing: their own portrait, in our colours
    const r = RECRUITS[id];
    const p = P[`${TEAMS[r.team].art}_${ROLE[r.kit]}`];
    const fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT[r.kit]}`, size);
  }
  if (team === 0 && LEGENDS[id]) { // a legend: their own portrait once it's in, a newcomer's until then
    const L = LEGENDS[id], p = P[LEGEND_FACES.has(L.art) || LEGEND_ART.has(L.art) ? L.art : `newcomer_${ROLE[L.kit]}`], fid = p && ((expr && p[expr]) || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT[L.kit]}`, size);
  }
  if (team === 0 && ROOKIES[id] && member(id).parts) { // a rookie from parts (Batch AJ)
    const url = Assets.partsPortrait(member(id).parts, expr || 'neutral', size, 'homekit');
    if (url) return url;
  }
  if (team === 0 && ROOKIES[id]) { // a drafted rookie: a newcomer (Batch AA) in our colours
    const p = P[`newcomer_${ROLE[ROOKIES[id].kit]}`], fid = p && ((expr && p[expr]) || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT[ROOKIES[id].kit]}`, size);
  }
  if (team !== 0 && id === 'sub_goalie') { // a backup in goal once theirs signed with us (a newcomer goalie, Batch AN)
    const p = P.newcomer_g, fid = p && ((expr && p[expr]) || p.neutral);
    return (fid && Assets.icon(fid, size, teamId)) || Assets.icon(`character_portraits/away/${PORTRAIT.goalie}`, size, teamId);
  }
  if (team !== 0 && id.startsWith('sub_') && fillLook(teamId, id.slice(4))) { // a fill made from parts, in the team's colours
    const url = Assets.partsPortrait(fillLook(teamId, id.slice(4)), expr || 'neutral', size, teamId);
    if (url) return url;
  }
  if (team !== 0 && id.startsWith('sub_')) { // a signed slot's newcomer (Batch AA), in the team's colours
    const p = P[`newcomer_${ROLE[id.slice(4)]}`], fid = p && ((expr && p[expr]) || p.neutral);
    return (fid && Assets.icon(fid, size, teamId)) || Assets.icon(`character_portraits/away/${PORTRAIT[id.slice(4)]}`, size, teamId);
  }
  if (team !== 0 && RECRUITS[id]) { // a rival star by player key (a League All-Star: in the All-Star kit)
    const r = RECRUITS[id];
    if (teamId !== 'allstar') return portrait(r.kit, 1, r.team, size, expr);
    const p = P[`${TEAMS[r.team].art}_${ROLE[r.kit]}`];
    const fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
    return (fid && Assets.icon(fid, size, 'allstar')) || Assets.icon(`character_portraits/away/${PORTRAIT[r.kit]}`, size, 'allstar');
  }
  if (team === 0) {
    const p = P[ART_NAME[id]];
    if (expr && p && p[expr]) return Assets.icon(p[expr], size, CLUB_PAGES());
    return Assets.icon(`character_portraits/home/${PORTRAIT[id]}`, size, CLUB_PAGES());
  }
  const t = TEAMS[teamId];
  if (t && t.goalieLook && id === 'goalie') { // an expansion club's goalie, made from parts (Batch AT)
    const url = Assets.goaliePortrait(t.goalieLook, expr || 'neutral', size, teamId);
    if (url) return url;
  }
  if (t && !t.art && id === 'goalie' && P.newcomer_g) { // an expansion club's goalie: the newcomer goalie in their colours
    const fid = (expr && P.newcomer_g[expr]) || P.newcomer_g.neutral, url = fid && Assets.icon(fid, size, teamId);
    if (url) return url;
  }
  if (t && !t.art && slotLook(teamId, id)) { // an expansion club's skater: made from parts, in their colours
    const url = Assets.partsPortrait(slotLook(teamId, id), expr || 'neutral', size, teamId);
    if (url) return url;
  }
  const p = t && t.art && P[`${t.art}_${ROLE[id]}`];
  const fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
  const url = fid && Assets.icon(fid, size, teamId);
  return url || Assets.icon(`character_portraits/away/${PORTRAIT[id]}`, size, teamId);
};
// A Weekly Cup finish: the cup (or, until Batch AE, the small cup) for first, rosettes (or
// the rank shields) for second and third.
export function cupPlaceImg(place, size = 64) {
  const B = Assets.atlas.badges || {};
  const id = place === 1 ? B.weekly_cup || B.cup_small : B[['', '', 'rosette_silver', 'rosette_bronze'][place]] || B['rank_' + place];
  return id ? Assets.icon(id, size) : '';
}

// Last week's top three: on the podium art (Batch AE), each above their step, or plain columns.
function podiumHtml(places) {
  const B = Assets.atlas.badges || {}, P = Assets.atlas.weekly_podium, set = B.podium && P && P.portrait_baselines && Assets.spriteSet([B.podium], 280), art = set && set.urls[0];
  if (!art) return `<div class="cup-podium">${places.map((x) => `<div class="pod p${x.place} ${x.me ? 'me' : ''}">${x.html}</div>`).join('')}</div>`;
  const [w, h] = P.logical_size, top = 120, step = { 1: 'gold', 2: 'silver', 3: 'bronze' };
  return `<div class="cup-podium art" style="aspect-ratio:${w}/${h + top}"><img class="pod-art" src="${art}" alt="" style="height:${(h / (h + top)) * 100}%">
    ${places.map((x) => { const b = P.portrait_baselines[step[x.place]]; return `<div class="pod p${x.place} ${x.me ? 'me' : ''}" style="left:${(b.x / w) * 100}%;bottom:${((h - b.y) / (h + top)) * 100}%">${x.html}</div>`; }).join('')}</div>`;
}

// The same portrait as a canvas (no PNG to encode): for the ultimate cut-ins mid-match.
export function portraitCanvas(id, team, teamId, size, expr) {
  Assets.canvasMode = true;
  try { return portrait(id, team, teamId, size, expr) || null; } finally { Assets.canvasMode = false; }
}

export const crest = (teamId, size = 96) => {
  if (teamId === 'home') return Assets.icon(Assets.frame(TEAMS.home.crest) ? TEAMS.home.crest : 'hud_elements/misc/home_crest', size, CLUB_PAGES());
  if (teamId === 'allstar') return Assets.icon((Assets.atlas.allstar && Assets.atlas.allstar.crest) || 'hud_elements/misc/level_star', size); // the League All-Stars' crest
  const t = TEAMS[teamId];
  const c = t && (t.art || t.mark) && Assets.atlas.crests && Assets.atlas.crests[t.art || t.mark];
  if (c && !t.art) return Assets.icon(c, size, teamId, { recolor: true }); // an expansion club's crest (Batch AU), drawn in coral and violet
  return c ? Assets.icon(c, size) : Assets.icon('hud_elements/misc/away_crest', size, teamId);
};
// Expression for a dialogue line, from its punctuation and how the match went.
function expression(side, text, mood) {
  if (/\?!|!\?/.test(text)) return 'shocked';
  const us = side === 'us';
  if (mood === 'won') return us ? 'grin' : /\.\.\./.test(text) ? 'shocked' : 'defeated';
  if (mood === 'lost') return us ? 'defeated' : 'grin';
  if (/^\.\.\./.test(text)) return 'neutral';
  if (us) return /!/.test(text) ? 'grin' : 'determined';
  return /!|\?$/.test(text) ? 'grin' : 'determined';
}
const ico = (id, size = 64) => Assets.icon(id, size);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The league news icon for each kind of story (Batch AV).
const NEWS_ICON = { rivalSign: 'sign', weSign: 'sign', weGoalie: 'sign', weAgent: 'sign', weLegend: 'sign', rivalDraft: 'draft', weDraft: 'draft', trade: 'trade', retire: 'retire', champion: 'cup', expansion: 'new_club' };
// The locker room hub: stations in the painting, in % of the 16:9 image.
const STATIONS = [
  { tab: 'team', label: 'Team', icon: 'equipment_items/hub/locker', rect: [19, 2, 47, 27], at: [42, 15], tip: 'Lockers: line-up, stats, gear and scouting' },
  { tab: 'shop', label: 'Shop', npc: 'shopkeeper', rect: [69, 11, 30, 58], at: [84, 27], tip: 'Gearsmith Ottar\'s counter' },
  { tab: 'training', label: 'Training', npc: 'coach', rect: [0.5, 15, 13.5, 40], at: [11.5, 15], tip: 'Grab a stick and hit the practice rink' },
  { tab: 'trophies', label: 'Trophies', icon: 'equipment_items/reward/trophy', rect: [14.5, 23, 8.5, 17], at: [21, 44], tip: 'The trophy chest' },
  { tab: 'tournament', label: 'League', npc: 'announcer', rect: [10, 77, 58, 18], at: [37, 86], tip: 'Benches: schedule, standings and playoffs' },
];
// Where the dressed skaters and Halla stand on the floor (feet, % of the room).
const CREW_SPOTS = [[32, 71], [43, 67], [54, 64], [64.5, 70]];
// The hub characters at their stations (feet, % of the room).
const NPC_SPOTS = [
  { who: 'brekka', tab: 'training', at: [22, 66] },
  { who: 'ottar', tab: 'shop', at: [75.5, 46] },
  { who: 'kip', tab: 'tournament', at: [72.5, 86] },
  { who: 'agent', tab: 'team', at: [63, 38], when: marketOpen }, // Vigga, by the lockers once she has players to offer (Batch AR)
];
// Button prompts from the UI kit (Batch U), as small images with the text as their alt.
const PAD_PROMPT = { '✕': 'ps_cross', '○': 'ps_circle', '□': 'ps_square', '△': 'ps_triangle', L1: 'ps_l1', R1: 'ps_r1', L2: 'ps_l2', R2: 'ps_r2', Options: 'ps_options', Create: 'ps_create', A: 'xbox_a', B: 'xbox_b', X: 'xbox_x', Y: 'xbox_y', LB: 'xbox_lb', RB: 'xbox_rb', LT: 'xbox_lt', RT: 'xbox_rt', Start: 'xbox_menu', Back: 'xbox_view' };
const KEYS = ['a', 'd', 'enter', 'esc', 'h', 'i', 'j', 'k', 'l', 'o', 'p', 's', 'shift', 'space', 'u', 'w'];
const promptImg = (name, alt) => `<img class="pb-prompt" src="${Assets.url(`gfx/ui-kit/images/${name}.png`)}" alt="${esc(alt)}">`;
// controller buttons named in a (translated) sentence
// the OWNED stamp (Batch V's blank frame, so the word can be in either language)
const ownedStamp = () => `<span class="pb-owned-blank owned-stamp">${t('OWNED')}</span>`;
// Batch X badges (their own page group, loaded at start and kept): an <img>, or the
// fallback until it has loaded
const MEDAL_BADGES = ['medal_empty', 'medal_bronze', 'medal_silver', 'medal_gold'];
function badge(name, size, cls = 'badge', fallback = '') {
  const id = Assets.atlas.badges && Assets.atlas.badges[name];
  const src = id && Assets.groupReady('badges') ? Assets.icon(id, size) : '';
  return src ? `<img class="${cls}" src="${src}" alt="">` : fallback;
}
const padGlyphs = (text) => text.replace(/✕|○|□|△|\b(?:L1|R1|L2|R2|LB|RB|LT|RT|Options|Create|Start|Back|[ABXY])\b/g, (m) => promptImg(PAD_PROMPT[m], m));
// a keyboard label like 'J / Space' or 'WASD / Arrows' as keycaps (keys without art stay text)
export function keyGlyphs(label) {
  return label.split(' / ').map((part) => {
    if (part === 'WASD') return ['w', 'a', 's', 'd'].map((k) => promptImg('key_' + k, k.toUpperCase())).join('');
    if (part === t('Arrows')) return ['up', 'left', 'down', 'right'].map((k) => promptImg('key_' + k, part)).join('');
    const k = part.toLowerCase();
    return KEYS.includes(k) ? promptImg('key_' + k, part) : esc(part);
  }).join(' / ');
}

// A small icon for an arena rule (Batch O), or nothing without the art.
export function ruleIconSrc(twist, size = 40) {
  const key = twist === 'shadow_zones' ? 'raven_shadows' : twist;
  const id = Assets.atlas.rule_icons && Assets.atlas.rule_icons[key];
  return id ? Assets.icon(id, size) : '';
}
// A picture in front of a chip's words (challenges, combos), or nothing without the art.
// Which hand a player shoots with.
const shoots = (hand) => (hand === 'R' ? t('Shoots right') : t('Shoots left'));
// How a player plays and their super, as two small chips.
const styleChips = (def) => {
  const E = ELEMENTS[def.elem], A = ARCHETYPES[def.arch];
  return `<span class="chip style" title="${esc(t(A.trait))}">${smallIcon('icons/arch_' + A.id)}${esc(t(A.name))}</span><span class="chip super" style="--el:${E.color}"><img class="rule-ico" src="${Assets.icon(E.icon, 40)}" alt="">${esc(t(E.name))}</span>`;
};
// A rookie's potential, two to five stars out of five.
const stars = (n) => {
  const full = Assets.atlas.frames['icons/potential_full'] && Assets.icon('icons/potential_full', 40), empty = full && Assets.icon('icons/potential_empty', 40);
  const label = `role="img" aria-label="${t('{n} of 5 stars', { n })}"`;
  if (full && empty) return `<span class="stars pics" ${label}>${`<img src="${full}" alt="">`.repeat(n)}${`<img src="${empty}" alt="">`.repeat(5 - n)}</span>`; // (Batch AD)
  return `<span class="stars" ${label}>${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
};
// The prospect card rims (Batch AD), by potential: bronze, silver, gold.
const CARD_RIMS = { bronze: 'gfx/prospect-cards/images/prospect_bronze.png', silver: 'gfx/prospect-cards/images/prospect_silver.png', gold: 'gfx/prospect-cards/images/prospect_gold.png' };
const rimFor = (potential) => CARD_RIMS[potential >= 4 ? 'gold' : potential === 3 ? 'silver' : 'bronze'];
const smallIcon = (id, size = 40, cls = 'rule-ico') => { const src = id && Assets.icon(id, size); return src ? `<img class="${cls}" src="${src}" alt="">` : ''; };
const btnIcon = (id) => smallIcon(id, 48, 'btn-ico'); // in front of a button's words
// A goaltending style's icon (Batch AN), the Iron Wall until it's in.
const goalieStyleIcon = (id, size = 68) => `<img src="${ico(Assets.atlas.frames['icons/gstyle_' + id] ? 'icons/gstyle_' + id : 'icons/award_iron_wall', size)}" alt="">`;
function ruleIcon(twist, size = 40) {
  const src = ruleIconSrc(twist, size);
  return src ? `<img class="rule-ico" src="${src}" alt="">` : '';
}

// "Play as: Skaters / Goalie" (goalie mode), remembered in the settings.
function playAsHtml(s) {
  const goalie = s.settings.playAs === 'goalie';
  return `<div class="play-as"><span class="label" style="font-size:14px">${t('Play as')}</span>
    <button class="chip" data-playas="skaters" aria-pressed="${!goalie}">${t('Skaters')}</button>
    <button class="chip" data-playas="goalie" aria-pressed="${goalie}" title="${esc(t('You play your starting goalie; the AI skates your line.'))}">${t('Goalie')}</button></div>`;
}

// The painted logo for the title screen, or the lettering until its art has loaded.
function logoHtml() {
  const P = Assets.atlas && Assets.atlas.art_additions && Assets.atlas.art_additions.polish;
  const set = P && P.logo && Assets.spriteSet(P.logo, 220);
  return set ? `<img class="title-logo-img" src="${set.urls[0]}" alt="Puckbound">` : 'Puck<span>bound</span>';
}

// Portrait for a league stat row or award winner (ours or a rival's).
const rowFace = (r, size) => (r.team === 'home' ? portrait(r.face, 0, null, size) : portrait(r.face, 1, r.team, size));

// Hub characters: a portrait and a line of chatter at the top of their tab.
const NPC_NAMES = { coach: 'Coach Brekka', shopkeeper: 'Gearsmith Ottar', announcer: 'Kip Vance, PA', agent: 'Vigga, the agent' };
function npc(key, text) {
  const id = Assets.atlas.npcs && Assets.atlas.npcs[key];
  const img = id && Assets.icon(id, 128);
  if (!img) return '';
  return `<div class="npc"><img src="${img}" alt=""><div class="say"><b>${t(NPC_NAMES[key])}</b>${esc(text)}</div></div>`;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// How a piece of gear shows on the ice.
const lookHtml = (id) => (GEAR_LOOK[id] && GEAR_LOOK[id].desc ? `<div class="look">${esc(t('On the ice: {look}', { look: t(GEAR_LOOK[id].desc) }))}</div>` : '');

function modsHtml(mods) {
  const parts = Object.entries(mods).filter(([, v]) => v).map(([k, v]) =>
    `<span class="mod ${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v} ${t(k === 'rfx' ? 'Reflex' : STAT_NAMES[k])}</span>`);
  return parts.length ? `<div class="mods">${parts.join('')}</div>` : `<div class="mods"><span class="mod">${t('No modifiers')}</span></div>`;
}

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('screen');
    this.tab = 'room';
  }

  clear() { this.root.innerHTML = ''; this.root.onclick = null; }

  set(html) {
    this.root.innerHTML = html;
    return this.root;
  }

  click(sel, fn, scope = this.root) {
    scope.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); fn(el, e); }));
  }

  // ------------------------------------------------------------------ title
  title() {
    const s = this.app.save;
    const hasSave = s && s.record.played > 0;
    const r = this.set(`
      <div class="dim"></div>
      <div class="title-wrap">
        <div class="title-crests"><img src="${crest('home', 128)}" alt=""></div>
        <div class="title-logo" id="t-logo">${logoHtml()}</div>
        <div class="title-sub">${t('3-on-3 arcade hockey RPG')}</div>
        <div class="title-buttons">
          <button class="btn gold" id="t-start">${hasSave ? t('Continue') : t('New Season')}</button>
          <button class="btn" id="t-quick">${t('Quick Match')}</button>
          <button class="btn" id="t-versus">${t('2 Players')}</button>
          <button class="btn ghost" id="t-settings">${t('Settings')}</button>
          ${this.app.installPrompt && !this.app.standalone ? `<button class="btn cream" id="t-install">${t('Install app')}</button>` : ''}
        </div>
        ${this.app.isTouch && !padList().length ? '' : `<div class="press" id="t-press">${padList().length ? t('Press {button} or Enter to start', { button: promptImg(psPad() ? 'ps_cross' : 'xbox_a', psPad() ? '✕' : 'A') }) : t('Press Enter to start')}</div>`}
      </div>
      <div class="title-foot">${t('Best in landscape on phones · Keyboard, gamepad and touch')}</div>`);
    this.click('#t-start', () => { audio.sfx('confirm'); this.app.startCampaign(); });
    this.click('#t-quick', () => { audio.sfx('confirm'); this.quickMatchPicker(); });
    this.click('#t-versus', () => { audio.sfx('confirm'); this.versusPicker(); });
    this.click('#t-settings', () => { audio.sfx('click'); this.settings(); });
    this.click('#t-install', async () => { audio.sfx('confirm'); await this.app.install(); this.title(); });
    return r;
  }

  // The painted logo replaces the lettering once the title art has loaded.
  titleLogo() {
    const el = document.getElementById('t-logo');
    if (el) el.innerHTML = logoHtml();
  }

  quickMatchPicker() {
    const opts = Object.values(TEAMS).filter((t) => t.id !== 'home');
    const rec = (id) => { const r = this.app.save.rivals && this.app.save.rivals[id]; return r && r.played ? ` · ${t('record {rec}', { rec: `${r.wins}–${r.losses}` })}` : ''; };
    this.challenges ||= new Set();
    const mult = () => [...this.challenges].reduce((m, id) => m * CHALLENGES.find((c) => c.id === id).mult, 1);
    this.modal(`
      <h2>${t('Quick play')}</h2>
      <p class="muted" style="margin:0">${t('Exhibitions use your current team and pay half rewards. A shootout is five penalty shots each way: you shoot, then you play goalie.')}</p>
      <div>
        <div class="label" style="font-size:15px">${t('Match challenges')} <span class="muted" id="ch-mult" style="font-family:var(--body);font-size:12px;letter-spacing:0;text-transform:none"></span></div>
        <div class="filters" style="margin:6px 0 0">${CHALLENGES.map((c) => `<button class="chip" data-ch="${c.id}" aria-pressed="${this.challenges.has(c.id)}" title="${esc(t(c.text))}">${smallIcon(c.icon)}${esc(t(c.name))}</button>`).join('')}</div>
      </div>
      <div>
        <div class="label" style="font-size:15px">${t('Arena')}</div>
        <div class="filters" style="margin:6px 0 0">${['auto', ...Object.keys(ARENAS)].map((k) => `<button class="chip" data-arena="${k}" aria-pressed="${(this.arenaPick || 'auto') === k}">${k === 'auto' ? t('Their building') : esc(ARENAS[k].name)}${ARENAS[k] && ARENAS[k].rule ? ` <span class="muted">· ${ruleIcon(ARENAS[k].twist, 32)}${esc(t(ARENAS[k].rule))}</span>` : ''}</button>`).join('')}
          <button class="chip" id="arena-rules" aria-pressed="${this.arenaRules !== false}" title="${esc(t('Meltwater in the Ember Dome, aurora lanes in the Aurora Palace, pond cracks on Pine Pond, rumble strips in the Golden Hall, raven shadows in the Dark Aerie'))}">${this.arenaRules !== false ? t('Arena rules on') : t('Arena rules off')}</button></div>
      </div>
      <div class="choice">${opts.map((tm) => `
        <div class="qp-row">
          <img src="${crest(tm.id, 64)}" alt="" width="44" height="44">
          <span style="min-width:0"><b>${esc(tm.name)}</b><span class="muted" style="font-size:12px">${esc(t(tm.style))}${rec(tm.id)}</span></span>
          <span class="row" style="gap:6px"><button class="btn small" data-team="${tm.id}">${t('Match')}</button><button class="btn small ghost" data-so="${tm.id}">${t('Shootout')}</button></span>
        </div>`).join('')}
      </div>
      <div class="row" style="justify-content:space-between;align-items:center">${playAsHtml(this.app.save)}<button class="btn small ghost" data-close>${t('Back')}</button></div>`, (m, close) => {
      this.bindPlayAs(m);
      const upd = () => { const x = mult(); m.querySelector('#ch-mult').textContent = this.challenges.size ? t('coins x{n}', { n: +x.toFixed(2) }) : ''; };
      upd();
      this.click('[data-ch]', (el) => {
        const id = el.dataset.ch;
        if (this.challenges.has(id)) this.challenges.delete(id); else this.challenges.add(id);
        el.setAttribute('aria-pressed', this.challenges.has(id));
        audio.sfx('click'); upd();
      }, m);
      this.click('[data-arena]', (el) => {
        this.arenaPick = el.dataset.arena;
        m.querySelectorAll('[data-arena]').forEach((b) => b.setAttribute('aria-pressed', b === el));
        audio.sfx('click');
      }, m);
      this.click('#arena-rules', (el) => {
        this.arenaRules = this.arenaRules === false;
        el.setAttribute('aria-pressed', this.arenaRules);
        el.textContent = this.arenaRules ? t('Arena rules on') : t('Arena rules off');
        audio.sfx('click');
      }, m);
      this.click('[data-team]', (el) => { close(); this.app.startExhibition(el.dataset.team, [...this.challenges], this.arenaPick || 'auto', this.arenaRules !== false); }, m);
      this.click('[data-so]', (el) => { close(); this.app.startShootout(el.dataset.so); }, m);
    });
  }

  versusPicker() {
    const opts = Object.values(TEAMS).filter((t) => t.id !== 'home');
    this.vsTeam ||= 'comets';
    this.modal(`
      <h2>${t('Local versus')}</h2>
      <p class="muted" style="margin:0">${t('Two players on one screen: {club} against a rival, same stats on both sides, first to 5. Needs a keyboard or gamepads.', { club: esc(CLUB.nick) })}</p>
      <div class="keys">
        <kbd style="color:var(--ice)">${t('Player 1')}</kbd><span>${t('WASD skate · F shoot/check · G pass/switch · Left Shift sprint · R skill · T ultimate')}</span>
        <kbd style="color:var(--coral)">${t('Player 2')}</kbd><span>${t('Arrows skate · K shoot/check · L pass/switch · Right Shift sprint · O skill · P ultimate')}</span>
        <kbd>${t('Gamepads')}</kbd><span>${t('With two pads each player gets one. With one pad, it goes to player 2.')}</span>
      </div>
      <div class="label" style="font-size:15px">${t('Player 2 plays as')}</div>
      <div class="filters" style="margin:0">${opts.map((t) => `<button class="chip" data-vs="${t.id}" aria-pressed="${this.vsTeam === t.id}" style="display:inline-flex;gap:6px;align-items:center"><img src="${crest(t.id, 40)}" width="20" height="20" alt="">${esc(t.name)}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Back')}</button><button class="btn gold" id="vs-go">${t('Start')}</button></div>`, (m, close) => {
      this.click('[data-vs]', (el) => {
        this.vsTeam = el.dataset.vs;
        m.querySelectorAll('[data-vs]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vs === this.vsTeam));
        audio.sfx('click');
      }, m);
      this.click('#vs-go', () => { close(); this.app.startVersus(this.vsTeam); }, m);
    });
  }

  // ------------------------------------------------------------------- hub
  hub(tab) {
    if (tab) this.tab = tab;
    const s = this.app.save;
    const next = this.app.nextStage();
    const nt = next ? teamInfo(next.team) : null;
    const anyPoints = rosterIds(s).some((id) => s.roster[id].points > 0 || s.roster[id].pendingPerk !== null);
    const room = this.tab === 'room' && !!(Assets.atlas && Assets.atlas.locker);
    if (this.tab === 'room' && !room) this.tab = 'tournament';
    document.body.classList.toggle('hub-room', room);
    const r = this.set(`
      <div class="dim"></div>
      <div class="hub">
        <div class="hub-top">
          <img class="crest" src="${crest('home', 96)}" alt="">
          <div class="hub-title">${esc(CLUB.name)}<small>${esc(t(TOURNAMENT.name))}${s.season > 1 ? ' · ' + t('Season {n}', { n: s.season }) : ''}</small></div>
          <div class="coins"><img src="${ico('equipment_items/reward/coins', 64)}" alt="">${s.coins}</div>
          <button class="icon-btn" id="h-settings" aria-label="${t('Settings')}">☰</button>
        </div>
        ${room ? `<div class="room-wrap" id="room-wrap"><div class="room" id="room">${this.roomHtml(s, anyPoints)}</div></div>` : `
        <div class="tabs" role="tablist">
          <button class="tab room-tab" data-tab="room" aria-label="${t('Back to the locker room')}"><span class="arr">◂</span> ${t('Locker room')}</button>
          ${[['tournament', t('League')], ['team', t('Team')], ['shop', t('Shop')], ['training', t('Training')], ['trophies', t('Trophies')]].map(([t, label]) => `<button class="tab" role="tab" data-tab="${t}" aria-selected="${this.tab === t}">${label}${t === 'team' && anyPoints ? '<span class="dot"></span>' : ''}</button>`).join('')}
        </div>
        <div class="hub-body panel" id="hub-body"></div>`}
        <div class="hub-cta">
          ${nt ? `<div class="next">${esc(t(next.round, { n: next.roundN }))}<br><b>${t('vs {team}', { team: esc(nt.name) })}</b>${s.buffs && s.buffs.length ? `<span class="buffs">${s.buffs.map((b) => `<span class="buff">${esc(BUFF_TEXT(b))}</span>`).join('')}</span>` : ''}</div>
          <button class="btn gold" id="h-play">${t('Play match')}</button>` : `<div class="next"><b>${s.league && s.league.champion && s.league.champion !== 'home' ? t('{team} won the cup', { team: esc(TEAMS[s.league.champion].name) }) : t('Champions!')}</b><br>${t('Start a new season or play exhibitions.')}</div>
          ${draftOpen(s) ? `<button class="btn gold" id="h-draft">${btnIcon('icons/draft')}${t('Draft Day')}</button>` : ''}<button class="btn ${draftOpen(s) ? 'ghost' : 'gold'}" id="h-season">${t('New season')}</button>`}
          <button class="btn ghost daily-btn" id="h-daily" title="${t('Today\'s daily challenge')}">${doneToday(s) ? badge('daily_done', 48, 'btn-ico', '✓') : badge('daily_star', 48, 'btn-ico', '★')} ${t('Daily')}${currentStreak(s) ? ` <span class="streak">${currentStreak(s)}${badge('streak_flame', 40, 'btn-ico', '🔥')}</span>` : ''}</button>
          <button class="btn ghost" id="h-title">${t('Title')}</button>
        </div>
      </div>`);
    this.click('[data-tab]', (el) => { audio.sfx('click'); this.hub(el.dataset.tab); });
    this.click('#h-play', () => { audio.sfx('confirm'); this.app.startStage(); });
    this.click('#h-season', () => {
      if (!draftOpen(s)) { audio.sfx('confirm'); this.app.newSeason(); return; }
      audio.sfx('click'); // the draft closes with the season
      this.modal(`<h2>${t('Draft Day isn\'t done')}</h2><p>${t('Three rookies are still waiting for your pick. Once the new season starts, they sign elsewhere.')}</p>
        <div class="row" style="justify-content:flex-end"><button class="btn small ghost" id="ns-skip">${t('Skip the draft')}</button><button class="btn gold" id="ns-draft">${btnIcon('icons/draft')}${t('Draft Day')}</button></div>`, (m, close) => {
        this.click('#ns-draft', () => { close(); audio.sfx('confirm'); this.draftDay(); }, m);
        this.click('#ns-skip', () => { close(); s.draft.picked = -1; audio.sfx('confirm'); this.app.newSeason(); }, m);
      });
    });
    this.click('#h-draft', () => { audio.sfx('confirm'); this.draftDay(); });
    this.click('#h-title', () => { audio.sfx('back'); this.app.goTitle(); });
    this.click('#h-daily', () => this.dailyCard());
    this.click('#h-settings', () => { audio.sfx('click'); this.settings(); });
    this.showGuide(r, s, {
      anyPoints,
      shopNew: GEAR.some((g) => g.price > 0 && !s.owned.includes(g.id) && Math.round(g.price * (1 - (s.discount || 0))) <= s.coins),
      scoutOpen: Object.keys(RECRUITS).some((k) => recruitStatus(s, k) === 'open' && s.coins >= recruitPrice(s, k)),
      allstarNext: !!(this.app.fixture && this.app.fixture() && this.app.fixture().kind === 'allstar'),
      online: onlineOn(s) && configured(),
      draftOpen: draftOpen(s),
      legendVisiting: !!(legendState(s).visiting && !s.roster[legendState(s).visiting]),
      marketReady: marketOpen(s) && agentState(s).list.some((a) => s.coins >= a.price),
      goalieTalk: Object.keys(GOALIE_RECRUITS).some((k) => goalieStatus(s, k) === 'open'),
      tradeReady: tradeable(s).length > 0 && Object.keys(RECRUITS).some((k) => recruitStatus(s, k) === 'open'),
      expansion: !!(s.league && s.league.teams && s.league.teams.some((id) => TEAMS[id] && TEAMS[id].expansion)),
      newCombo: lineupIds(s).some((a, i, l) => l.some((b, j) => j > i && !CAST_PAIRS.includes(pairKey(member(a).def.elem, member(b).def.elem)) && COMBOS[pairKey(member(a).def.elem, member(b).def.elem)])),
    });
    this.roomFit?.disconnect();
    if (room) {
      this.bindRoom(r);
      return r;
    }
    const body = r.querySelector('#hub-body');
    ({ tournament: () => this.tabTournament(body), team: () => this.tabTeam(body), shop: () => this.tabShop(body), training: () => this.tabTraining(body), trophies: () => this.tabTrophies(body) })[this.tab]();
    return r;
  }

  roomHtml(s, anyPoints) {
    const next = this.app.fixture && this.app.fixture();
    const scoutOpen = Object.keys(RECRUITS).some((k) => recruitStatus(s, k) === 'open' && s.coins >= RECRUITS[k].price);
    const shopNew = GEAR.some((g) => g.price > 0 && !s.owned.includes(g.id) && Math.round(g.price * (1 - (s.discount || 0))) <= s.coins);
    const got = Object.keys((s.achievements && s.achievements.unlocked) || {}).length;
    const badge = {
      team: anyPoints ? t('Points to spend') : scoutOpen ? t('Scouts calling') : '',
      shop: shopNew ? t('New gear in reach') : '',
      training: s.training.sessions ? t(s.training.sessions > 1 ? '{n} sessions' : '{n} session', { n: s.training.sessions }) : '',
      trophies: `${got}/${ACHIEVEMENTS.length}`,
      tournament: next ? t('Next: {team}', { team: teamInfo(next.opponent).nick || teamInfo(next.opponent).name.split(' ').slice(-1)[0] }) : '',
    };
    const npcs = Assets.atlas.npcs || {};
    const spots = STATIONS.map((st) => {
      const [x, y, w, h] = st.rect;
      const img = st.npc && npcs[st.npc] ? Assets.icon(npcs[st.npc], 72) : st.icon ? ico(st.icon, 64) : '';
      const b = badge[st.tab];
      const [ax, ay] = st.at;
      return `<button class="spot" data-tab="${st.tab}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" title="${esc(t(st.tip))}" aria-label="${esc(t(st.label))}: ${esc(t(st.tip))}">
        <span class="spot-label" style="left:${((ax - x) / w) * 100}%;top:${((ay - y) / h) * 100}%">${img ? `<img src="${img}" alt="">` : ''}<b>${esc(t(st.label))}</b>${b ? `<small class="${st.tab === 'trophies' ? '' : 'hot'}">${esc(b)}</small>` : ''}</span></button>`;
    }).join('');
    const line = lineupIds(s);
    const keeper = goalieInfo(starterId(s));
    const crew = [...line, 'goalie'].map((id, i) => {
      const [x, y] = CREW_SPOTS[i];
      let src;
      if (id === 'goalie') {
        const F = Assets.atlas.goalies_front || {}, own = keeper.art && F[keeper.art] && F[keeper.art].idle_a;
        src = (own && keeper.mask && Assets.goalieStanding(own, keeper.mask, 160, 'homekit')) // (made from parts: the body and their mask)
          || (own && !keeper.mask && Assets.icon(own, 160, 'homekit')) || Assets.icon(F.home?.idle_a || Assets.atlas.goalies_side.home.ready, 160, CLUB_PAGES());
      }
      else {
        const m = member(id);
        const set = Assets.atlas.skaters[m.sprite || m.def.sprite];
        // a legend stands in their own art before their skating sets are in (Batch AI part 1)
        const own = m.legend && Assets.atlas.legends && Assets.atlas.legends[m.legend.art] && Assets.atlas.legends[m.legend.art].idle;
        src = own ? Assets.icon(own, 160, 'homekit') : set && Assets.icon(set.home.south.frames.idle, 160, m.look || CLUB_PAGES());
        if (!src) src = Assets.icon(Assets.atlas.skaters[m.def.sprite].home.south.frames.idle, 160, CLUB_PAGES());
      }
      const name = id === 'goalie' ? keeper.name : member(id).name;
      return `<button class="crew" data-crew="${id}" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.7}s" aria-label="${esc(name)}"><img src="${src}" alt=""><span>${esc(name)}</span></button>`;
    }).join('');
    return `<img class="room-bg" src="${Assets.url(Assets.atlas.locker)}" alt=""><div class="room-props" id="room-props">${this.roomProps(s)}</div>${spots}${crew}`;
  }

  // Batch H art in the room: the trophy chest, the league board, and Brekka, Ottar and Kip at
  // their stations. Empty until the hub's pages have loaded.
  roomProps(s) {
    const A = Assets.atlas.art_additions;
    if (!A || !A.hub_fullbody || !Assets.groupReady('hub')) return '';
    const R = A.arena_additions || {};
    const at = (x, y) => `left:${(x / 1536) * 100}%;top:${(y / 864) * 100}%`;
    let html = '';
    // the chest glows while there are trophies you haven't looked at, and stands open after
    const got = Object.keys((s.achievements && s.achievements.unlocked) || {}).length;
    const chest = R.h_chest_open && R.chest_placement && Assets.spriteSet(R.h_chest_open, 190);
    if (chest && got) {
      const p = R.chest_placement, fresh = got > (s.trophiesSeen || 0);
      html += `<img class="room-chest${fresh ? ' fresh' : ''}" src="${chest.urls[fresh ? 0 : 1]}" alt="" style="${at(p.x, p.y)};height:${(p.h / 864) * 100}%">`;
    }
    const board = R.h_league_board && R.league_board_foot && Assets.spriteSet(R.h_league_board, 240);
    if (board) {
      const f = R.league_board_foot;
      html += `<button class="room-board" data-board="tournament" aria-label="${esc(t('League'))}" style="${at(f.x, f.y)};height:${(240 / 864) * 100}%;aspect-ratio:${board.w}/${board.h};transform:translate(-${board.fx * 100}%,-${board.fy * 100}%)"><img src="${board.urls[0]}" alt=""></button>`;
    }
    for (const n of NPC_SPOTS) {
      if (n.when && !n.when(s)) continue;
      const m = A.hub_fullbody[n.who];
      // idle a, idle b and talking in one strip: one element steps through it, so the
      // character never blinks out between frames (two toggled images could both be hidden)
      const set = m && Assets.spriteStrip([...m.idle, m.talking], 150);
      if (!set) continue;
      const [x, y] = n.at;
      html += `<div class="npc-body" data-for="${n.tab}" style="left:${x}%;top:${y}%;aspect-ratio:${set.w}/${set.h};transform:translate(-${set.fx * 100}%,-${set.fy * 100}%);background-image:url(${set.url})"></div>`;
    }
    return html;
  }

  // Coach Brekka's tip for this moment, pointing at the station or button it's about.
  // At most one new tip per visit to the hub; it stays until it's used or dismissed.
  showGuide(r, s, ctx) {
    let step = this.guideStep;
    if (!step && (this.guideBudget || 0) > 0) { step = nextGuide(s, ctx); if (step) { this.guideBudget--; this.guideStep = step; } }
    if (!step) return;
    const targets = [...r.querySelectorAll(step.target)];
    const finish = (off) => {
      if (off) guideOff(s); else doneGuide(s, step.id);
      writeSave(s);
      this.guideStep = null;
      r.querySelector('.guide-bubble')?.remove();
      targets.forEach((t) => t.classList.remove('guide-pulse'));
    };
    targets.forEach((t) => { t.classList.add('guide-pulse'); t.addEventListener('click', () => finish(false), { capture: true, once: true }); });
    const id = Assets.atlas.npcs && Assets.atlas.npcs.coach;
    const face = id ? Assets.icon(id, 96) : '';
    const el = document.createElement('div');
    el.className = 'guide-bubble';
    el.setAttribute('role', 'status');
    el.innerHTML = `${face ? `<img src="${face}" alt="">` : ''}<div><b>${t(NPC_NAMES.coach)}</b><p>${esc(t(step.text))}</p>
      <div class="row"><button class="btn small cream" data-g="ok">${t('Got it')}</button><button class="btn small ghost" data-g="off">${t('No more tips')}</button></div></div>`;
    el.querySelector('[data-g="ok"]').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('click'); finish(false); });
    el.querySelector('[data-g="off"]').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('back'); finish(true); });
    (r.querySelector('.hub') || r).appendChild(el);
  }

  bindRoom(r) {
    const wrap = r.querySelector('#room-wrap'), room = r.querySelector('#room');
    // keep the painting at 16:9 inside whatever space the hub leaves
    const fit = () => {
      const k = Math.min(wrap.clientWidth / 16, wrap.clientHeight / 9);
      room.style.width = `${Math.floor(16 * k)}px`;
      room.style.height = `${Math.floor(9 * k)}px`;
      room.style.setProperty('--u', `${(16 * k) / 100}px`);
    };
    fit();
    if (typeof ResizeObserver !== 'undefined') { this.roomFit = new ResizeObserver(fit); this.roomFit.observe(wrap); }
    this.click('[data-crew]', (el) => { audio.sfx('click'); this.hub(el.dataset.crew === 'goalie' ? 'team' : 'team'); }, room);
    const s = this.app.save;
    const props = room.querySelector('#room-props');
    const bindProps = () => {
      this.click('.room-board', (el) => { audio.sfx('click'); this.hub(el.dataset.board); }, props);
      // a character talks while you point at their station
      room.querySelectorAll('.spot').forEach((sp) => {
        const body = props.querySelector(`.npc-body[data-for="${sp.dataset.tab}"]`);
        if (!body) return;
        const on = () => body.classList.add('talk'), off = () => body.classList.remove('talk');
        sp.addEventListener('pointerenter', on); sp.addEventListener('pointerleave', off);
        sp.addEventListener('focus', on); sp.addEventListener('blur', off);
      });
    };
    if (props.childElementCount) bindProps();
    else Assets.loadGroup('hub').then(() => {
      if (!props.isConnected) return;
      props.innerHTML = this.roomProps(s);
      bindProps();
    }).catch(() => {});
  }

  tabTournament(body) {
    const s = this.app.save;
    const L = s.league;
    const name = (id) => TEAMS[id].name;
    const short = (id) => (id === 'home' ? CLUB.nick : TEAMS[id].name.split(' ').slice(-1)[0]);
    const rows = standings(L);
    const record = (id) => { const r = s.rivals && s.rivals[id]; return r && r.played ? `${r.wins}–${r.losses}` : ''; };
    const table = `<table class="league-table">
      <thead><tr><th>#</th><th style="text-align:left">${t('Team')}</th><th>${t('GP')}</th><th>${t('W')}</th><th>${t('L')}</th><th>${t('GF')}</th><th>${t('GA')}</th><th>+/-</th><th>${t('PTS')}</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.id === 'home' ? 'us' : ''} ${i === 3 ? 'cut' : ''}">
        <td>${i + 1}</td><td class="tm"><img src="${crest(r.id, 40)}" alt="" width="22" height="22">${esc(name(r.id))}</td>
        <td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.diff > 0 ? '+' : ''}${r.diff}</td><td class="pts">${r.pts}</td></tr>`).join('')}</tbody>
    </table>
    <div class="muted" style="font-size:12px;margin-top:4px">${t('Top 4 make the playoffs: 1 plays 4, 2 plays 3, winners meet in the Cup Final.')}</div>`;
    // the Winter Classic, between rounds 3 and 4
    const cl = L.classic, clNext = !cl && L.phase === 'regular' && L.round === CLASSIC_AFTER;
    const clOpp = cl ? cl.opp : L.phase === 'regular' && L.round <= CLASSIC_AFTER ? classicOpponent(L) : null;
    const classicRow = clOpp ? `<div class="fixture classic ${clNext ? 'next' : ''}">
        ${badge('snowflake', 48, 'row-ico', '<span class="muted">❄</span>')}<img src="${crest(clOpp, 48)}" alt="" width="26" height="26">
        <span class="fx-name"><b>${t('Winter Classic')}</b><span class="muted">${esc(TEAMS[clOpp].name)} · ${esc(ARENAS.pine_pond.name)}${cl ? '' : ` · ${standings(L)[0].id === 'home' ? t('the runners-up') : t('the league leaders')}`}</span></span>
        <span class="fx-res">${cl ? (cl.won ? `<span class="good">${t('W {a}–{b}', { a: cl.gf, b: cl.ga })}</span>` : `<span class="bad">${t('L {a}–{b}', { a: cl.gf, b: cl.ga })}</span>`) : clNext ? `<span class="gold-t">${t('NEXT')}</span>` : '<span class="muted">—</span>'}</span></div>` : '';
    // the All-Star Game, between rounds 2 and 3
    const as = L.allstar, asNext = !as && L.phase === 'regular' && L.round === ALLSTAR_AFTER;
    const allstarRow = (as ? !as.skipped : L.phase === 'regular' && L.round <= ALLSTAR_AFTER) ? `<div class="fixture classic allstar ${asNext ? 'next' : ''}">
        ${badge('daily_star', 48, 'row-ico', '<span class="muted">★</span>')}<img src="${crest('home', 48)}" alt="" width="26" height="26">
        <span class="fx-name"><b>${t('All-Star Game')}</b><span class="muted">${esc(ARENAS.home ? ARENAS.home.name : 'Frostline Rink')} · ${t('the fans vote in the league\'s stars')}</span></span>
        <span class="fx-res">${as ? (as.won ? `<span class="good">${t('W {a}–{b}', { a: as.gf, b: as.ga })}</span>` : `<span class="bad">${t('L {a}–{b}', { a: as.gf, b: as.ga })}</span>`) : asNext ? `<span class="gold-t">${t('NEXT')}</span>` : '<span class="muted">–</span>'}</span></div>` : '';
    const schedule = L.schedule.map((rd, i) => {
      const opp = rd.games[0].b;
      const res = L.results[i] && L.results[i][0];
      const tm = TEAMS[opp];
      const isNext = i === L.round && L.phase === 'regular' && !clNext && !asNext;
      const status = res ? (res.ga > res.gb ? `<span class="good">${t('W {a}–{b}', { a: res.ga, b: res.gb })}</span>` : `<span class="bad">${t('L {a}–{b}', { a: res.ga, b: res.gb })}</span>`) : isNext ? `<span class="gold-t">${t('NEXT')}</span>` : '<span class="muted">—</span>';
      return `<div class="fixture ${isNext ? 'next' : ''}">
        <span class="muted">${t('R{n}', { n: i + 1 })}</span><img src="${crest(opp, 48)}" alt="" width="26" height="26">
        <span class="fx-name"><b>${esc(tm.name)}</b><span class="muted">${esc(t(GAME_PLANS[tm.plan === 'counter' ? 'balanced' : tm.plan].name))}${tm.plan === 'counter' ? ` ${t('(adapts)')}` : ''}${record(opp) ? ` · ${t('record {rec}', { rec: record(opp) })}` : ''}</span></span>
        <span class="fx-res">${status}</span></div>${i === ALLSTAR_AFTER - 1 ? allstarRow : ''}${i === CLASSIC_AFTER - 1 ? classicRow : ''}`;
    }).join('');
    let bracket = '';
    if (L.playoffs) {
      const po = L.playoffs;
      const game = (g, label) => g ? `<div class="po-game"><div class="label" style="font-size:12px">${label}</div>
        ${[['a', 'ga'], ['b', 'gb']].map(([k, sc]) => `<div class="po-team ${g.winner === g[k] ? 'win' : g.winner ? 'lose' : ''} ${g[k] === 'home' ? 'us' : ''}"><img src="${crest(g[k], 40)}" alt="" width="22" height="22">${esc(short(g[k]))}<b>${g[sc] ?? ''}</b></div>`).join('')}</div>` : `<div class="po-game"><div class="label" style="font-size:12px">${label}</div><div class="muted" style="font-size:13px">${t('Waiting for the semifinals')}</div></div>`;
      bracket = `<div class="label" style="margin:14px 0 6px">${t('Playoffs')}</div>
        <div class="bracket-po">${game(po.semis[0], t('Semifinal · 1 v 4'))}${game(po.semis[1], t('Semifinal · 2 v 3'))}${game(po.final, t('Cup Final'))}</div>
        ${L.champion ? `<p class="gold-t" style="font-family:var(--display);font-size:26px;text-align:center;margin:10px 0 0">${L.champion === 'home' ? t('The Frostline Cup is yours!') : t('{team} win the Frostline Cup.', { team: esc(name(L.champion)) })}</p>` : ''}`;
    }
    const last = L.results.length ? L.results[L.results.length - 1].slice(1) : [];
    const next = this.app.fixture && this.app.fixture();
    const nt = next && teamInfo(next.opponent);
    const venueKey = next && next.stage.arena ? next.stage.arena : nt && nt.arena;
    const venue = venueKey ? ARENAS[venueKey].name : 'Frostline Rink';
    const call = L.champion ? (L.champion === 'home' ? t('Champions! Ladies and gentlemen, your {club}!', { club: CLUB.name }) : t('What a season. The ice goes quiet until next year.'))
      : nt ? pick([t('Next up: the {team} at {venue}! Get loud!', { team: nt.name, venue }), `${t('{team} at {venue}.', { team: nt.name, venue })} ${t(nt.style)}`, t('Tonight at {venue}: {club} versus {team}. You won\'t want to miss it.', { venue, club: CLUB.nick, team: nt.name })])
        : t('Welcome to the Frostline league!');
    body.innerHTML = `
      ${npc('announcer', call)}
      <div class="label" style="margin-bottom:6px">${esc(t(TOURNAMENT.name))} · ${t('Season {n}', { n: s.season })}</div>
      <div class="league-grid">
        <div style="min-width:0">${table}
          ${last.length ? `<div class="label" style="margin:12px 0 4px;font-size:14px">${t('Around the league · round {n}', { n: L.results.length })}</div>
          <div class="around">${last.map((g) => `<div>${esc(short(g.a))} <b>${g.ga}–${g.gb}</b> ${esc(short(g.b))}</div>`).join('')}</div>` : ''}
          ${bracket}
          ${this.newsHtml(s)}
        </div>
        <div style="min-width:0"><div class="label" style="margin-bottom:6px;font-size:14px">${t('Your schedule')}</div><div class="schedule">${schedule}</div>
          ${this.leadersHtml(L)}</div>
      </div>`;
  }

  // Around the Frostline: signings, draft picks, trades, retirements and champions, newest first.
  newsHtml(s) {
    const items = latestNews(s, 14);
    if (!items.length) return '';
    const tn = (id) => esc(TEAMS[id] ? TEAMS[id].name : CLUB.name);
    const role = (kit) => (kit === 'goalie' ? t('Goalie') : CHARACTERS[kit] ? t(ROLE_NAME[CHARACTERS[kit].role]) : '').toLowerCase();
    const line = (n) => {
      const name = `<b>${esc(n.name || '')}</b>`;
      switch (n.k) {
        case 'rivalSign': return t('The {team} signed {name} ({role}).', { team: tn(n.team), name, role: role(n.kit) });
        case 'rivalDraft': return t('The {team} drafted {name} ({role}).', { team: tn(n.team), name, role: role(n.kit) });
        case 'retire': return t(n.n === 1 ? '{name} of the {team} retires after {n} season.' : '{name} of the {team} retires after {n} seasons.', { team: tn(n.team), name, n: n.n });
        case 'weSign': return t('The {club} signed {name} from the {team}.', { club: esc(CLUB.nick), name, team: tn(n.team) });
        case 'weGoalie': return t('The {club} signed {name}, the {team}\'s goalie.', { club: esc(CLUB.nick), name, team: tn(n.team) });
        case 'weAgent': return t('The {club} signed free agent {name} ({role}).', { club: esc(CLUB.nick), name, role: role(n.kit) });
        case 'weLegend': return t('The {club} signed the legend {name}!', { club: esc(CLUB.nick), name });
        case 'weDraft': return t('The {club} drafted {name} ({role}).', { club: esc(CLUB.nick), name, role: role(n.kit) });
        case 'trade': return t('Trade: {gave} to the {team} for {name}.', { gave: `<b>${esc(n.gave || '')}</b>`, team: tn(n.team), name });
        case 'champion': return n.team === 'home' ? t('The {club} win the Frostline Cup!', { club: esc(CLUB.nick) }) : t('{team} win the Frostline Cup.', { team: tn(n.team) });
        case 'expansion': return t('The Glacier Owls and Thunder Moose join the Frostline.');
        default: return '';
      }
    };
    // what happened (Batch AV's icons) and whose crest it is
    const kind = (n) => { const id = Assets.atlas.news_icons && Assets.atlas.news_icons[NEWS_ICON[n.k]]; return id && Assets.frame(id) ? Assets.icon(id, 48) : ''; };
    const pics = (n) => {
      const k = kind(n), team = n.team && (TEAMS[n.team] || n.team === 'home') ? crest(n.team, 40) : '';
      const list = [k, team || (k ? '' : Assets.icon(Assets.atlas.frames['icons/free_agents'] ? 'icons/free_agents' : 'icons/contract', 40))].filter(Boolean);
      return list.map((src) => `<img src="${src}" alt="" width="20" height="20">`).join('');
    };
    return `<div class="label" style="margin:14px 0 4px;font-size:14px">${t('Around the Frostline')}</div>
      <div class="news">${items.map((n) => `<div class="news-row"><span class="news-pics">${pics(n)}</span><span>${line(n)}</span><small class="muted">${t('S{s}', { s: n.s })}</small></div>`).join('')}</div>`;
  }

  // Scoring leaders this season, and the award winners once it's over.
  leadersHtml(L) {
    const st = L.stats && seasonStats(L);
    let html = '';
    if (L.awards && L.awards.length) {
      html += `<div class="label" style="margin:14px 0 6px;font-size:14px">${t('Season {n} awards', { n: L.season })}</div><div class="aw-list">${L.awards.map((w) => `
        <div class="aw-row ${w.team === 'home' ? 'us' : ''}"><img src="${rowFace(w, 64)}" alt=""><div style="min-width:0"><small>${esc(t(AWARD_BY_ID[w.id].name))}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${crest(w.team, 40)}" alt=""></div>`).join('')}</div>`;
    }
    const rows = st ? Object.values(st.skaters).sort((x, y) => (y.g + y.a) - (x.g + x.a) || y.g - x.g).slice(0, 6) : [];
    if (rows.length) {
      html += `<div class="label" style="margin:14px 0 6px;font-size:14px">${t('Scoring leaders')}</div>
        <table class="league-table leaders"><thead><tr><th style="text-align:left">${t('Player')}</th><th>${t('GP')}</th><th>${t('G')}</th><th>${t('A')}</th><th>${t('PTS')}</th></tr></thead><tbody>${rows.map((r) => `
          <tr class="${r.team === 'home' ? 'us' : ''}"><td class="tm"><img src="${crest(r.team, 40)}" alt="" width="20" height="20">${esc(r.name)}</td><td>${r.gp}</td><td>${r.g}</td><td>${r.a}</td><td class="pts">${r.g + r.a}</td></tr>`).join('')}</tbody></table>`;
    }
    return html;
  }

  tabTrophies(body) {
    const s = this.app.save;
    const tr = this.app.ach;
    const got = ACHIEVEMENTS.filter((a) => tr.has(a.id));
    const earned = got.reduce((n, a) => n + a.coins, 0);
    const classicWins = (s.classics || []).filter((c) => c.gf > c.ga).length;
    const allstarWins = (s.allstars || []).filter((c) => c.gf > c.ga).length;
    if ((s.trophiesSeen || 0) !== got.length) { s.trophiesSeen = got.length; writeSave(s); } // the chest in the room stops glowing
    body.innerHTML = `
      <div class="train-top"><div><div class="label">${t('Trophy case')}</div>
        <p style="margin:2px 0 0;font-size:13px">${t('{n} of {total} unlocked', { n: got.length, total: ACHIEVEMENTS.length })} · ${t('{n} coins earned', { n: earned })}${s.cups ? ` · ${t(s.cups > 1 ? '{n} cups won' : '{n} cup won', { n: s.cups })}` : ''}${classicWins ? ` · ${t(classicWins > 1 ? '{n} Winter Classics won' : '{n} Winter Classic won', { n: classicWins })}` : ''}${allstarWins ? ` · ${t(allstarWins > 1 ? '{n} All-Star Games won' : '{n} All-Star Game won', { n: allstarWins })}` : ''}</p></div>
        <span class="row" style="gap:6px;margin:0"><button class="btn small ghost" id="tr-career">${btnIcon('icons/career')} ${t('Career stats')}</button><button class="btn small ghost" id="tr-lb">${badge('cup_small', 48, 'btn-ico', '🏆')} ${t('Online leaderboards')}</button></span></div>
      ${s.weeklyCups && s.weeklyCups.length ? `<div class="label" style="margin:4px 0 6px">${t('Weekly Cups')}</div>
      <div class="cup-shelf">${s.weeklyCups.slice(-12).reverse().map((w) => `<div class="cup-won" title="${esc(w.name)} · ${esc(w.week)}"><img src="${cupPlaceImg(w.place, 72)}" alt=""><small>${esc(w.name)}</small><span class="muted">${esc(w.week.replace(/^\d+-W/, t('week') + ' '))}</span></div>`).join('')}</div>` : ''}
      ${s.awards && s.awards.length ? `<div class="label" style="margin:4px 0 6px">${t('Award cabinet')}</div>
      <div class="aw-list cabinet">${s.awards.slice().reverse().map((w) => `
        <div class="aw-row us"><img src="${rowFace({ ...w, team: 'home' }, 64)}" alt=""><div style="min-width:0"><small>${t('Season {n}', { n: w.season })} · ${esc(t(AWARD_BY_ID[w.id].name))}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${ico(AWARD_BY_ID[w.id].icon, 64)}" alt=""></div>`).join('')}</div>
      <div class="label" style="margin:14px 0 6px">${t('Achievements')}</div>` : ''}
      <div class="trophies">${ACHIEVEMENTS.map((a) => {
        const done = tr.has(a.id);
        const pr = !done && tr.progress(a);
        return `<div class="trophy ${done ? 'got' : ''}">
          <img src="${ico(a.icon, 96)}" alt="">
          <div style="min-width:0"><b>${esc(t(a.name))}</b><span>${esc(clubText(t(a.text)))}</span>
            ${pr ? `<div class="xpbar" style="margin-top:4px"><i style="width:${Math.round((pr[0] / pr[1]) * 100)}%"></i></div><span class="muted">${pr[0]} / ${pr[1]}</span>` : ''}</div>
          <span class="tcoins">${done ? '✓' : `+${a.coins}`}</span>
        </div>`;
      }).join('')}</div>`;
    this.click('#tr-lb', () => { audio.sfx('click'); this.leaderboard('cones'); }, body);
    this.click('#tr-career', () => { audio.sfx('click'); this.careerPage(); }, body);
  }

  // Career stats: the club's lifetime numbers, every skater's totals (most points first,
  // the leader of each column in gold) and Halla's in goal. Tap a skater for their seasons.
  careerPage() {
    const s = this.app.save, rows = careerRows(s, rosterIds(s)), gks = careerGoalies(s, goalieIds(s));
    const cols = [['gp', t('GP'), t('Games played'), 'games'], ['w', t('W'), t('Wins'), 'wins'], ['g', t('G'), t('Goals'), 'goals'], ['a', t('A'), t('Assists'), 'assists'], ['pts', t('PTS'), t('Points'), null],
      ['shots', t('SH'), t('Shots'), 'shots'], ['hits', t('HIT'), t('Hits'), 'hits'], ['steals', t('STL'), t('Steals'), 'steals']];
    const best = Object.fromEntries(cols.map(([k]) => [k, Math.max(0, ...rows.map((r) => r[k]))]));
    const head = cols.map(([k, ab, name, icon]) => `<th title="${esc(name)}">${icon && Assets.atlas.frames['icons/stat_' + icon] ? smallIcon('icons/stat_' + icon, 48, 'th-ico') : ''}${ab}</th>`).join('');
    const body = rows.map((r) => {
      const m = member(r.id);
      return `<tr data-car="${r.id}"><td class="car-who"><img src="${portrait(r.id, 0, null, 64)}" alt=""><span><b>${esc(m.name)}</b><small>${t(ROLE_NAME[m.role])}</small></span></td>
        ${cols.map(([k]) => `<td class="${r[k] && r[k] === best[k] && k !== 'gp' ? 'lead' : ''}">${r[k]}</td>`).join('')}</tr>`;
    }).join('');
    const tile = (icon, n, label) => `<div class="car-tile">${icon && Assets.atlas.frames[icon] ? smallIcon(icon, 64, 'h-ico') : ''}<b>${n}</b><small>${esc(label)}</small></div>`;
    const sv = (g) => (g.sa ? (g.sv / g.sa).toFixed(3).replace(/^0/, '') : '–');
    this.modal(`
      <h2>${smallIcon('icons/career', 96, 'h-ico')}${t('Career stats')}</h2>
      <div class="car-tiles">
        ${tile('icons/stat_seasons', s.season, t('seasons'))}${tile('icons/stat_games', s.record.played, t('matches'))}${tile('icons/stat_wins', s.record.wins, t('wins'))}
        ${tile('icons/stat_goals', s.record.goals, t('goals'))}${tile('icons/stat_cups', s.cups || 0, t('cups'))}${tile(null, (s.awards || []).length, t('awards'))}
        ${tile(null, (s.allstars || []).length, t('All-Star Games'))}${tile('icons/stat_streak', dailyState(s).best || 0, t('best daily streak'))}
      </div>
      <div class="label" style="margin:8px 0 4px">${t('Skaters')}</div>
      <div class="car-wrap"><table class="car-table"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="label" style="margin:10px 0 4px">${t('In goal')}</div>
      ${gks.map((g) => `<div class="car-goalie"><img src="${portrait(g.id, 0, null, 64)}" alt=""><b>${esc(goalieInfo(g.id).name)}</b>
        <span>${t('{n} games', { n: g.gp })} · ${t('{n} wins', { n: g.w })} · ${t('{n} saves', { n: g.sv })} · ${t('save % {n}', { n: sv(g) })} · ${t('{n} shutouts', { n: g.so })}</span></div>`).join('')}
      <p class="muted" style="font-size:12px;margin:8px 0 0">${t('Every full match counts: league, playoffs, showcases, exhibitions and the daily challenge. Tap a skater for their seasons.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Done')}</button></div>`, (m) => {
      this.click('[data-car]', (el) => { audio.sfx('click'); this.careerOne(el.dataset.car); }, m);
    });
  }

  // One skater's career: season by season, and their awards.
  careerOne(id) {
    const s = this.app.save, m = member(id), r = careerRows(s, [id])[0];
    const seasons = Object.entries(r.seasons).sort((a, b) => +a[0] - +b[0]);
    const awards = (s.awards || []).filter((w) => w.face === id);
    this.modal(`
      <div class="card-head" style="margin:0"><img src="${portrait(id, 0, null, 152, 'grin')}" alt="" style="width:76px;height:76px"><div>
        <h2 style="margin:0">${esc(m.name)}</h2><div class="sub">${esc(t(m.title))}</div>
        <div>${t('{g} goals, {a} assists in {n} games', { g: r.g, a: r.a, n: r.gp })}</div></div></div>
      ${seasons.length ? `<table class="car-table small"><thead><tr><th>${t('Season')}</th><th>${t('GP')}</th><th>${t('G')}</th><th>${t('A')}</th><th>${t('PTS')}</th></tr></thead>
        <tbody>${seasons.map(([n, x]) => `<tr><td>${n}</td><td>${x.gp}</td><td>${x.g}</td><td>${x.a}</td><td>${x.g + x.a}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${t('No games yet.')}</p>`}
      ${awards.length ? `<div class="label" style="margin:8px 0 4px">${t('Awards')}</div>${awards.map((w) => `<div class="car-award"><img src="${ico(AWARD_BY_ID[w.id].icon, 64)}" alt=""><span>${t('Season {n}', { n: w.season })} · ${esc(t(AWARD_BY_ID[w.id].name))}</span></div>`).join('')}` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Done')}</button></div>`);
  }

  // The season's awards night, hosted by Kip Vance: one envelope at a time.
  // Skills Night: two events before the All-Star Game. Your All-Star against the other five;
  // compete (again) in either, or go on to the game.
  // Draft Day, once a season is over: Kip opens it (the first time), then the three prospects
  // side by side with their potential, the scouts' line and their stats against our starter.
  async draftDay() {
    const s = this.app.save, d = s.draft;
    if (!draftOpen(s)) return;
    // the prospects' faces, and Kip for the hall
    await Promise.all([Assets.loadGroup('newcomers'), d.prospects.some((p) => p.parts) && Assets.loadGroup('parts'), Assets.loadGroup('awards')].filter(Boolean)).catch(() => {});
    if (!d.met) {
      d.met = true; writeSave(s);
      this.dialogue(DRAFT_LINES, 'home', null, () => this.draftDay());
      return;
    }
    const H = Assets.atlas.draft_hall; // the draft hall and the card rims (Batch AD)
    const cards = d.prospects.map((p, i) => {
      const m = { role: CHARACTERS[p.kit].role }, starter = member(s.lineup[m.role]);
      const P = (Assets.atlas.portraits || {})[`newcomer_${ROLE[p.kit]}`];
      const face = (p.parts && Assets.partsPortrait(p.parts, 'determined', 152)) || (P ? Assets.icon(P.determined || P.neutral, 152) : portrait(p.kit, 1, null, 152));
      const pips = STAT_KEYS.map((k) => {
        const diff = p.base[k] - starter.base[k];
        return `<div class="stat"><span>${t(STAT_NAMES[k])}</span><span class="pips">${Array.from({ length: 12 }, (_, j) => `<i class="${j < p.base[k] ? 'b' : ''}"></i>`).join('')}</span><span class="v">${p.base[k]}</span><span class="${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'muted'}" style="font-size:12px;width:2.2em">${diff > 0 ? '+' + diff : diff || ''}</span></div>`;
      }).join('');
      return `<div class="card prospect pot-${p.potential}${H ? ' rim' : ''}"${H ? ` style="border-image-source:url(${Assets.url(rimFor(p.potential))})"` : ''}>
        <div class="card-head"><img src="${face}" alt=""><div style="min-width:0"><h3>${esc(p.name)}</h3>
          <div class="sub">${t(ROLE_NAME[m.role])} · ${stars(p.potential)}</div><div class="muted" style="font-size:12.5px">${esc(t(POTENTIAL_GRADE[p.potential]))}</div></div></div>
        ${p.arch ? `<div class="style-row">${styleChips(makeDef(p.kit, p.arch, p.elem))}</div>
        <p class="muted" style="margin:0;font-size:12px">${esc(t(makeDef(p.kit, p.arch, p.elem).skill.name))} · ${esc(t(makeDef(p.kit, p.arch, p.elem).ult.name))}</p>` : ''}
        <p class="scout-line">${smallIcon('icons/scout', 40)}${esc(t(p.blurb))}</p>
        <div class="stats">${pips}</div>
        <p class="muted" style="margin:0;font-size:12px">${t('Compared with {name}.', { name: esc(starter.name) })}</p>
        <button class="btn gold" data-pick="${i}">${t('Draft {name}', { name: esc(p.name) })}</button>
      </div>`;
    }).join('');
    const pct = (v, of) => `${(v / of) * 100}%`, F = H && H.podium_foreground;
    const r = this.set(`${H ? `<div class="aw-scene"><div class="aw-room" id="dr-room"><img class="aw-bg" src="${Assets.url(H.image)}" alt="">
        <div class="aw-host" id="dr-host"></div>
        ${F ? `<img class="aw-podium" src="${Assets.url(F.image)}" alt="" style="left:${pct(F.x, H.width)};top:${pct(F.y, H.height)};width:${pct(F.width, H.width)};height:${pct(F.height, H.height)}">` : ''}</div></div>` : '<div class="dim"></div>'}
      <div class="results panel draft${H ? ' on-stage' : ''}">
        <div class="label">${t('Season {n}', { n: d.season })}</div>
        <h1 class="gold-t" style="font-family:var(--display);font-weight:normal;font-size:clamp(34px,6vw,54px);line-height:.9;margin:0">${t('Draft Day')}</h1>
        <p style="margin:0;font-size:13.5px">${t('One pick. Rookies start a couple of levels below your line-up, but the more stars of potential, the faster they learn and the further their stats can grow.')}</p>
        <div class="prospects">${cards}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="dr-later">${t('Decide later')}</button></div>
      </div>`);
    if (H) {
      this.coverRoom(r, r.querySelector('#dr-room'), H.width / H.height);
      // Kip behind the podium, the foreground over his legs
      const pose = (Assets.atlas.awards_host || {}).speaking, set = pose && Assets.spriteSet([pose], 420), box = r.querySelector('#dr-host'), P = H.podium_rect;
      if (set && box && P) {
        box.style.cssText = `left:${pct(P.x + P.w / 2, H.width)};top:${pct(P.y + P.h * 0.92, H.height)};height:${pct(P.h * 1.7, H.height)};aspect-ratio:${set.w}/${set.h};transform:translate(-${set.fx * 100}%,-${set.fy * 100}%)`;
        box.innerHTML = `<img src="${set.urls[0]}" alt="">`;
      }
    }
    this.click('#dr-later', () => { audio.sfx('back'); this.app.goHub('tournament'); }, r);
    this.click('[data-pick]', (el) => {
      const p = d.prospects[+el.dataset.pick];
      audio.sfx('click');
      this.modal(`<h2>${t('Draft {name}?', { name: esc(p.name) })}</h2>
        <p>${t('The other two go to rival clubs.')}</p>
        <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not yet')}</button><button class="btn gold" id="dr-yes">${t('Draft {name}', { name: esc(p.name) })}</button></div>`, (m, close) => {
        this.click('#dr-yes', async () => {
          const id = draftPick(s, +el.dataset.pick);
          if (!id) return;
          this.app.ach.checkMeta();
          writeSave(s);
          audio.jingle('sign');
          close();
          // the jersey moment: a newcomer's own (Batch AD), or the parts body with the rookie's head (Batch AO)
          const look = member(id).parts, M = Assets.atlas.modular;
          const PJ = look && M && M.jersey_moments && M.jersey_moments['body_' + look.body];
          const J = !look && (Assets.atlas.draft_animations || {})[`newcomer_${ROLE[p.kit]}`];
          await Assets.ensureKit([...homeKitGroups(s), ...(J ? ['draft_rookies'] : [])]); // the rookie in our colours
          const moment = PJ ? Assets.partsMoment(PJ, look, 300, 'homekit') : J && Assets.spriteSet(J.frames, 300, 'homekit');
          this.app.goHub('team');
          const role = member(id).role;
          this.modal(`<h2>${t('{name} pulls on the {club} jersey!', { name: esc(p.name), club: esc(CLUB.nick) })}</h2>
            ${moment ? `<div class="jersey-moment" style="aspect-ratio:${moment.w}/${moment.h}">${moment.urls.map((u, k) => `<img src="${u}" alt="" style="animation-delay:${k * 0.55}s"${k === moment.urls.length - 1 ? ' class="last"' : ''}>`).join('')}</div>` : ''}
            <div class="card-head" style="margin:0"><img src="${portrait(id, 0, null, 152, 'grin')}" alt="" style="width:76px;height:76px"><div>
            ${otherPicks(d, s).map((o) => `<p style="margin:0 0 4px">${o.replaces ? t('The {team} took {name} to replace {old}, who retired.', { team: esc(o.team.name), name: esc(o.name), old: esc(o.replaces) }) : o.fills ? t('The {team} took {name} to fill the gap you left.', { team: esc(o.team.name), name: esc(o.name) }) : t('The {team} took {name}.', { team: esc(o.team.name), name: esc(o.name) })}</p>`).join('')}
            <p class="muted" style="margin:0;font-size:13px">${t('Dress {name} at {role} from the Team tab, or before a match.', { name: esc(p.name), role: t(ROLE_NAME[role]).toLowerCase() })}</p></div></div>
            <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Later')}</button><button class="btn gold" id="dress-now">${t('Dress now')}</button></div>`, (m2, close2) => {
            this.click('#dress-now', () => { setLineup(s, id); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
          });
        }, m);
      });
    }, r);
  }

  skillsNight(sk, onEvent, onGame) {
    const star = member(sk.star);
    const events = SKILLS_EVENTS.map((e) => {
      const ev = sk.events[e.id], d = DRILLS[e.drill], lower = e.id === 'fastest';
      const rows = [...ev.field, ...(ev.mine !== null ? [{ name: star.name, team: 'home', score: ev.mine, me: true }] : [])]
        .sort((a, b) => (lower ? a.score - b.score : b.score - a.score) || (b.me ? 1 : 0) - (a.me ? 1 : 0));
      const place = placeIn(ev, lower);
      const note = place === 1 ? `<b class="gold-t">${t('You won it!')}</b>` : place ? t('You placed {n} of {total}.', { n: place, total: rows.length })
        : ev.ghost ? t('Race {name}\'s ghost.', { name: esc(ev.ghost.name) }) : t('Beat {score} to win.', { score: esc(formatScore(d, ev.field[0].score)) });
      return `<div class="card sk-event">
        <div class="card-head"><img src="${ico(e.icon || d.icon, 96)}" alt="" style="border:0;background:none"><div style="min-width:0"><h3>${esc(t(e.name))}</h3><div class="sub">${esc(t(d.name))} · ${t('win it: +{n} coins', { n: e.coins })}</div></div></div>
        <div class="sk-field">${rows.map((r, i) => `<div class="sk-row ${r.me ? 'me' : ''}"><span class="sk-rank">${i + 1}</span><img src="${crest(r.team, 40)}" alt="" width="18" height="18"><span class="sk-name">${esc(r.name)}</span><b>${esc(formatScore(d, r.score))}</b></div>`).join('')}</div>
        <div class="row" style="justify-content:space-between;align-items:center;margin:0"><span class="muted" style="font-size:12.5px">${note}</span>
          <button class="btn small ${ev.mine === null ? 'gold' : ''}" data-sk="${e.id}">${ev.mine === null ? t('Compete') : t('Try again')}</button></div>
      </div>`;
    }).join('');
    const r = this.set(`<div class="dim"></div>
      <div class="results panel skills">
        <div class="label">${t('All-Star Game')}</div>
        <h1 class="gold-t" style="font-family:var(--display);font-weight:normal;font-size:clamp(34px,6vw,54px);line-height:.9;margin:0;display:flex;align-items:center;gap:10px">${smallIcon('icons/skills_night', 128, 'h-ico')}${t('Skills Night')}</h1>
        <p style="margin:0;font-size:13.5px">${t('Before the game, the stars show off. {name} competes for the {club} against the other five All-Stars. These runs don\'t use a training session.', { name: `<b>${esc(star.name)}</b>`, club: esc(CLUB.name) })}</p>
        <div class="sk-events">${events}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn gold" id="sk-game">${t('To the All-Star Game')}</button></div>
      </div>`);
    this.click('[data-sk]', (el) => { audio.sfx('confirm'); onEvent(el.dataset.sk); }, r);
    this.click('#sk-game', () => { audio.sfx('confirm'); onGame(); }, r);
  }

  // The All-Star Game's fan vote: both benches with this season's numbers, then Kip.
  allStarVote(vote, onGo) {
    const s = this.app.save, st = s.league && seasonStats(s.league);
    const line = (key) => { const r = st && st.skaters[key]; return r ? `${r.g} ${t('G')} · ${r.a} ${t('A')}` : ''; };
    const row = (who, side) => {
      const r = RECRUITS[who], m = member(who);
      const from = r && !s.roster[who] ? r.team : 'home';
      const face = side === 0 ? portrait(who, 0, null, 96) : portrait(r.kit, 1, r.team, 96);
      const key = from === 'home' ? `home:${who}` : `${r.team}:${r.kit}`;
      return `<div class="as-row ${who === vote.star ? 'star' : ''}"><img class="as-face" src="${face}" alt="">
        <div style="min-width:0"><b>${esc(m.name)}</b><span class="muted"><img src="${crest(from, 40)}" alt="" width="16" height="16"> ${esc(from === 'home' ? CLUB.name : TEAMS[from].name)}</span></div>
        <span class="as-pts">${line(key)}</span></div>`;
    };
    const g = TEAMS[vote.goalie];
    this.modal(`
      <h2>${t('All-Star Game')}</h2>
      <p style="margin:0;font-size:13.5px">${t('The fans have voted! {name} leads the home bench, with two of the league\'s stars in your colours. The rest of the league\'s best wear the All-Star navy.', { name: `<b>${esc(member(vote.star).name)}</b>` })}</p>
      <div class="as-benches">
        <div class="as-bench us"><div class="label"><img src="${crest('home', 40)}" alt="" width="20" height="20"> ${t('{club} All-Stars', { club: esc(CLUB.nick) })}</div>${vote.ours.map((w) => row(w, 0)).join('')}
          <div class="as-goalie muted">${t('In goal: {name}', { name: esc(goalieInfo(starterId(s)).name) })}</div></div>
        <div class="as-bench them"><div class="label"><img src="${crest('allstar', 40)}" alt="" width="20" height="20"> ${t('League All-Stars')}</div>${vote.theirs.map((w) => row(w, 1)).join('')}
          <div class="as-goalie muted">${t('In goal: {name}', { name: `${esc(g.names.goalie)} (${esc(g.name)})` })}</div></div>
      </div>
      <p class="muted" style="margin:0;font-size:12.5px">${t('A showcase: no penalties, ultimates charge twice as fast, and the standings don\'t change. Only your own players earn EXP.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn gold" id="as-go">${t('On to Skills Night')}</button></div>`, (m, close) => {
      this.click('#as-go', () => { audio.sfx('confirm'); close(); onGo(); }, m);
    }, false);
    audio.jingle('reveal');
  }

  // Fit a painted room over the screen, keeping its shape (cover), and keep it fitted.
  coverRoom(r, room, aspect = 16 / 9) {
    const fit = () => {
      const k = Math.max(r.clientWidth / aspect, r.clientHeight);
      room.style.width = `${aspect * k}px`; room.style.height = `${k}px`;
    };
    fit();
    if (typeof ResizeObserver !== 'undefined') { this.roomFit?.disconnect(); this.roomFit = new ResizeObserver(fit); this.roomFit.observe(r); }
  }

  awardsNight(list, season, onDone) {
    const npc = Assets.atlas.npcs && Assets.atlas.npcs.announcer;
    const host = npc ? Assets.icon(npc, 128) : '';
    // the Awards Night stage (Batch J): Kip at the podium behind the panel
    const S = Assets.atlas.awards_stage, P = S && S.podium_foreground;
    const onStage = !!(S && S.file);
    const pct = (v, of) => `${(v / of) * 100}%`;
    let i = -1, opened = false;
    const r = this.set(`
      ${onStage ? `<div class="aw-scene"><div class="aw-room" id="aw-room"><img class="aw-bg" src="${Assets.url(S.file)}" alt="">
        <div class="aw-host" id="aw-host"></div>
        ${P && P.file ? `<img class="aw-podium" src="${Assets.url(P.file)}" alt="" style="left:${pct(P.x, S.width)};top:${pct(P.y, S.height)};width:${pct(P.w, S.width)};height:${pct(P.h, S.height)}">` : ''}</div></div>` : '<div class="dim"></div>'}
      <div class="awards panel ${onStage ? 'on-stage' : ''}">
        <div class="aw-head">${host ? `<img src="${host}" alt="">` : ''}<div><div class="label">${t('Frostline Awards · Season {n}', { n: season })}</div><div class="aw-say" id="aw-say">${t('Welcome, everyone, to the Frostline Awards! {honours}, one envelope each. Let\'s get to it.', { honours: ['', t('One honour'), t('Two honours'), t('Three honours'), t('Four honours'), t('Five honours'), t('Six honours')][list.length] || t('{n} honours', { n: list.length }) })}</div></div></div>
        <div class="aw-stage" id="aw-stage"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn small ghost" id="aw-skip">${t('Skip')}</button><button class="btn gold" id="aw-next">${t('First award')}</button></div>
      </div>`);
    const stage = r.querySelector('#aw-stage'), say = r.querySelector('#aw-say'), next = r.querySelector('#aw-next');
    let pose = 'speaking';
    const setPose = (p) => { pose = p; r.querySelectorAll('[data-pose]').forEach((img) => { img.hidden = img.dataset.pose !== p; }); };
    if (onStage) {
      this.coverRoom(r, r.querySelector('#aw-room')); // (the stage's 16:9)
      const poses = Assets.atlas.awards_host || {};
      const ids = ['speaking', 'opening_envelope', 'applauding'].filter((p) => poses[p]);
      Assets.loadGroup('awards').then(() => {
        const set = ids.length && Assets.spriteSet(ids.map((p) => poses[p]), 420);
        const box = r.querySelector('#aw-host');
        if (!set || !box) return;
        const fr = ids.map((p) => Assets.frame(poses[p]));
        const srcH = Math.max(...fr.map((f) => f[4] / f[7])); // standing height in source pixels
        box.style.cssText = `left:${pct(S.host_foot.x, S.width)};top:${pct(S.host_foot.y, S.height)};height:${pct(srcH * S.host_source_scale, S.height)};aspect-ratio:${set.w}/${set.h};transform:translate(-${set.fx * 100}%,-${set.fy * 100}%)`;
        box.innerHTML = ids.map((p, k) => `<img data-pose="${p}" src="${set.urls[k]}" alt="">`).join('');
        setPose(pose);
      }).catch(() => {});
    }
    const card = (w) => {
      const a = AWARD_BY_ID[w.id];
      const tm = w.team === 'home' ? TEAMS.home : TEAMS[w.team];
      return `<div class="aw-card ${opened ? 'open' : ''} ${w.team === 'home' ? 'us' : ''}">
        <div class="aw-face aw-back"><img src="${ico(a.icon, 160)}" alt=""><b>${esc(t(a.name))}</b><span>${esc(clubText(t(a.blurb)))}</span></div>
        <div class="aw-face aw-front">
          <img class="aw-portrait" src="${rowFace(w, 220)}" alt="">
          <div style="min-width:0"><small>${esc(t(a.name))}</small><b>${esc(w.name)}</b>
            <span class="aw-team"><img src="${crest(w.team, 40)}" alt="" width="20" height="20">${esc(tm.name)}</span>
            <span class="muted">${esc(w.line)}</span>
            ${w.reward ? `<span class="gold-t">${t('+{coins} coins · +{exp} EXP', { coins: w.reward.coins, exp: w.reward.exp })}</span>` : ''}</div>
        </div></div>`;
    };
    const show = () => {
      const w = list[i];
      stage.innerHTML = card(w);
      setPose(opened ? 'applauding' : 'opening_envelope');
      if (!opened) {
        say.textContent = t('And the {award} goes to...', { award: t(AWARD_BY_ID[w.id].name) });
        next.textContent = t('Open the envelope');
        audio.jingle('reveal');
      } else {
        const ours = w.team === 'home';
        say.textContent = ours ? t('{name} of the {club}! What a season!', { name: w.name, club: CLUB.name }) : t('{name} of the {team}. Tip of the cap.', { name: w.name, team: TEAMS[w.team].name });
        next.textContent = i < list.length - 1 ? t('Next award') : t('That\'s the show');
        if (ours) { audio.jingle('win'); audio.crowdCheer(0.8); } else { audio.crowdOoh(0.5); audio.crowdCheer(0.3); }
      }
    };
    const summary = () => {
      setPose('speaking');
      say.textContent = t('That\'s a wrap on the season. See you on the ice!');
      stage.innerHTML = `<div class="aw-list">${list.map((w) => `<div class="aw-row ${w.team === 'home' ? 'us' : ''}"><img src="${rowFace(w, 64)}" alt=""><div style="min-width:0"><small>${esc(t(AWARD_BY_ID[w.id].name))}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${crest(w.team, 40)}" alt=""></div>`).join('')}</div>`;
      next.textContent = t('Back to the locker room');
    };
    this.click('#aw-next', () => {
      if (i >= list.length) { audio.sfx('confirm'); return onDone(); }
      if (i < 0 || opened) { i++; opened = false; if (i >= list.length) return summary(); }
      else opened = true;
      show();
    }, r);
    this.click('#aw-skip', () => { i = list.length; summary(); }, r);
  }

  // Today's daily challenge card.
  dailyCard() {
    const s = this.app.save;
    const d = dailyFor(dayKey());
    const tm = TEAMS[d.teamId];
    const ar = ARENAS[d.arena];
    const streak = currentStreak(s), done = doneToday(s);
    const st = dailyState(s);
    const tries = (st.attempts && st.attempts[d.date]) || 0;
    audio.sfx('click');
    this.modal(`
      <h2>${t('Daily challenge')}</h2>
      <p class="muted" style="margin:0">${t('{date} · the same challenge for everyone today. Beat the goal on consecutive days to build a streak.', { date: esc(d.date) })}</p>
      <div class="daily">
        <img src="${crest(d.teamId, 96)}" alt="" width="64" height="64">
        <div style="min-width:0"><b>${t('vs {team}', { team: esc(tm.name) })}</b><span class="muted">${esc(ar.name)}${ar.rule ? ` · ${ruleIcon(ar.twist, 32)}${esc(t(ar.rule))}` : ''}</span>
          <span>${d.mods.map((id) => { const c = CHALLENGES.find((x) => x.id === id); return `<span class="chip" aria-pressed="true" style="pointer-events:none">${smallIcon(c.icon)}${esc(t(c.name))}</span>`; }).join(' ')}</span></div>
      </div>
      <div class="daily-goal"><small>${t('Goal')}</small><b>${esc(t(dailyGoal(d.goal).text))}</b></div>
      <div class="row" style="gap:14px;flex-wrap:wrap">
        <span>${t('Streak {n}', { n: `<b class="gold-t">${streak}</b>` })}${st.best ? ` <span class="muted">${t('(best {n})', { n: st.best })}</span>` : ''}</span>
        <span>${t('Reward {reward}', { reward: `<b class="gold-t">${done ? t('claimed') : t('{n} coins', { n: dailyReward(streak + 1) })}</b>` })}</span>
        ${tries ? `<span class="muted">${t(tries > 1 ? '{n} attempts today' : '{n} attempt today', { n: tries })}</span>` : ''}
      </div>
      ${done ? `<p class="good" style="margin:0">${t('Done for today. Come back tomorrow to keep the streak going.')}</p>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Back')}</button><button class="btn gold" id="daily-go">${done ? t('Play again') : t('Play')}</button></div>`, (m, close) => {
      this.click('#daily-go', () => { close(); audio.sfx('confirm'); this.app.startDaily(); }, m);
    });
  }

  // Before a league match: pick a game plan, with a scouting report on theirs.
  planPicker(teamId, fixture, theirPlan, onPick) {
    const s = this.app.save;
    const tm = TEAMS[teamId];
    const their = GAME_PLANS[theirPlan];
    const cur = s.lastPlan || 'balanced';
    const counters = (id) => GAME_PLANS[id].beats === theirPlan;
    const countered = (id) => their.beats === id;
    this.set('<div class="dim"></div>');
    this.modal(`
      <h2>${t('Game plan')}</h2>
      <div class="scout"><img src="${crest(teamId, 64)}" alt="" width="40" height="40"><div><div class="label" style="font-size:13px">${t('Scouting report · {match}', { match: esc(fixture.label) })}</div>
        ${t('{team} will most likely play {plan}.', { team: esc(tm.name), plan: `<b class="gold-t">${esc(t(their.name))}</b>` })}${tm.plan === 'counter' ? ` ${t('They adapt to what you used against them last time.')}` : ''}</div></div>
      ${s.buffs && s.buffs.length ? `<div class="buffs">${s.buffs.map((b) => `<span class="buff">${esc(BUFF_TEXT(b))}</span>`).join('')}</div>` : ''}
      ${rosterIds(s).length > 3 ? `<div class="line-row" id="line-row">${lineupIds(s).map((id) => `<span><img src="${portrait(id, 0, null, 64)}" width="26" height="26" alt="">${esc(member(id).name)}</span>`).join('')}<button class="btn small ghost" id="line-change">${t('Change line-up')}</button></div>` : ''}
      <div class="plans">${Object.values(GAME_PLANS).map((p) => `
        <button class="plan ${p.id === cur ? 'sel' : ''}" data-plan="${p.id}">
          <b>${p.icon ? `<img class="plan-ico" src="${ico(p.icon, 80)}" alt="">` : ''}${esc(t(p.name))}</b>
          <span>${esc(t(p.text))}</span>
          <span class="good">+ ${esc(t(p.pros))}</span>
          <span class="bad">− ${esc(t(p.cons))}</span>
          ${p.beats ? `<span class="muted">${t('Beats {plan}', { plan: esc(t(GAME_PLANS[p.beats].name)) })}</span>` : ''}
          ${counters(p.id) ? `<span class="edge good">${t('Counters their plan')}</span>` : countered(p.id) ? `<span class="edge bad">${t('Countered by their plan')}</span>` : ''}
        </button>`).join('')}</div>
      <div class="row" style="justify-content:space-between;align-items:center">${playAsHtml(s)}<button class="btn gold" id="plan-go">${t('Drop the puck')}</button></div>`, (m, close) => {
      this.bindPlayAs(m);
      let pick = cur;
      this.click('[data-plan]', (el) => {
        pick = el.dataset.plan;
        m.querySelectorAll('[data-plan]').forEach((b) => b.classList.toggle('sel', b.dataset.plan === pick));
        audio.sfx('click');
      }, m);
      this.click('#plan-go', () => { close(); audio.sfx('confirm'); onPick(pick); }, m);
      this.click('#line-change', () => this.lineupPicker(() => {
        const row = m.querySelector('#line-row');
        if (row) row.querySelectorAll('span').forEach((el, i) => { const id = lineupIds(s)[i]; el.innerHTML = `<img src="${portrait(id, 0, null, 64)}" width="26" height="26" alt="">${esc(member(id).name)}`; });
      }), m);
    }, false);
  }

  bindPlayAs(m) {
    const s = this.app.save;
    this.click('[data-playas]', (el) => {
      s.settings.playAs = el.dataset.playas;
      writeSave(s);
      m.querySelectorAll('[data-playas]').forEach((b) => b.setAttribute('aria-pressed', b === el));
      audio.sfx('click');
    }, m);
  }

  // After a league match: the rest of the round, standings moves, playoff news.
  leagueUpdate(out, L, done) {
    const short = (id) => (id === 'home' ? CLUB.nick : TEAMS[id].name.split(' ').slice(-1)[0]);
    const rows = standings(L);
    const pos = rows.findIndex((r) => r.id === 'home') + 1;
    let headline = '';
    if (out.champion === 'home') headline = t('Frostline Cup champions!');
    else if (out.eliminated && out.kind === 'regular') headline = t('Missed the playoffs');
    else if (out.eliminated) headline = t('Knocked out');
    else if (out.phaseChange === 'playoffs') headline = t('Playoffs! You\'re the #{n} seed', { n: L.playoffs.seeds.indexOf('home') + 1 });
    else if (out.kind === 'semi' && out.won) headline = t('On to the Cup Final!');
    else if (L.phase === 'regular') headline = t(pos === 1 ? '{pos}st place after round {n}' : pos === 2 ? '{pos}nd place after round {n}' : pos === 3 ? '{pos}rd place after round {n}' : '{pos}th place after round {n}', { pos, n: L.round });
    const games = out.simulated.map((g) => `<div>${g.stage ? `<span class="muted">${esc(t(g.stage))}:</span> ` : ''}${esc(short(g.a))} <b>${g.ga}–${g.gb}</b> ${esc(short(g.b))}</div>`).join('')
      + (out.moves || []).map((mv) => `<div class="move">${smallIcon('icons/contract', 40)}${t('The {team} signed {name} ({role}) to fill the gap.', { team: esc(TEAMS[mv.team].name), name: esc(mv.name), role: t(ROLE_NAME[CHARACTERS[mv.kit].role]).toLowerCase() })}</div>`).join('');
    const top = rows.slice(0, 6).map((r, i) => `<div class="mini-row ${r.id === 'home' ? 'us' : ''}"><span>${i + 1}. ${esc(short(r.id))}</span><span>${r.w}–${r.l}</span><b>${r.pts}</b></div>`).join('');
    this.modal(`
      <h2>${esc(headline || t('League update'))}</h2>
      ${games ? `<div class="label" style="font-size:13px">${t('Around the league')}</div><div class="around">${games}</div>` : ''}
      ${L.phase === 'regular' || out.phaseChange ? `<div class="label" style="font-size:13px">${t('Standings')}</div><div class="mini-table">${top}</div>` : ''}
      ${out.eliminated && L.champion ? `<p>${t('{team} win the Frostline Cup.', { team: esc(TEAMS[L.champion] ? TEAMS[L.champion].name : t('The {club}', { club: CLUB.nick })) })} ${t('Start a new season from the hub when you\'re ready.')}</p>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn gold" data-close>${t('Continue')}</button></div>`, null, false, done);
  }

  // A locker-room scene with two choices. choose(i) applies it and returns the reply text.
  lockerMoment(m, ctx, choose, done) {
    const who = m.whoFn ? m.whoFn(ctx) : m.who;
    audio.sfx('blip');
    this.modal(`
      <div class="label">${t('Locker room')}</div>
      <div class="locker">
        <div class="locker-faces">${who.map((id) => `<img src="${portrait(id, 0, null, 152)}" alt="">`).join('') || `<img src="${portrait('goalie', 0, null, 152)}" alt="">`}</div>
        <div><h2>${esc(t(m.title))}</h2><p style="margin:6px 0 0">${esc(clubText(t(m.text(ctx))))}</p></div>
      </div>
      <div class="choice" id="lm-choices">${m.choices.map((c, i) => `<button class="btn ghost" data-lm="${i}"><b>${esc(t(c.label))}</b>${esc(t(c.fx))}</button>`).join('')}</div>
      <div id="lm-reply" hidden></div>`, (el, close) => {
      this.click('[data-lm]', (b) => {
        const reply = choose(+b.dataset.lm);
        audio.sfx('confirm');
        el.querySelector('#lm-choices').hidden = true;
        const r = el.querySelector('#lm-reply');
        r.hidden = false;
        r.innerHTML = `<p class="gold-t" style="margin:0">${esc(t(m.choices[+b.dataset.lm].fx))}</p><p style="margin:6px 0 10px">${esc(reply ? t(reply) : '')}</p><div class="row" style="justify-content:flex-end"><button class="btn gold" id="lm-go">${t('Continue')}</button></div>`;
        r.querySelector('#lm-go').addEventListener('click', () => { close(); done(); });
      }, el);
    }, false);
  }

  tabTeam(body) {
    const s = this.app.save;
    const line = lineupIds(s);
    const bench = rosterIds(s).filter((id) => !line.includes(id)).sort((x, y) => 'CWD'.indexOf(member(x).role) - 'CWD'.indexOf(member(y).role));
    const card = (id, dressed) => {
      const m = member(id);
      const c = m.def;
      const r = s.roster[id];
      const eff = effectiveStats(id, r);
      const gm = gearMods(r);
      const stats = STAT_KEYS.map((k) => {
        const base = m.base[k], al = r.alloc[k], g = gm[k];
        const pips = [];
        for (let i = 1; i <= 12; i++) {
          let cls = '';
          if (i <= Math.min(base, base + g)) cls = 'b';
          if (i > base && i <= base + al) cls = 'a';
          if (g > 0 && i > base + al && i <= base + al + g) cls = 'g';
          if (g < 0 && i > base + al + g && i <= base + al) cls = 'n';
          pips.push(`<i class="${cls}"></i>`);
        }
        return `<div class="stat" title="${esc(t(STAT_HINT[k]))}"><span>${t(STAT_NAMES[k])}</span><span class="pips">${pips.join('')}</span><span class="v">${eff[k]}</span>
          <button class="plus" data-raise="${id}:${k}" ${canRaise(r, id, k) ? '' : 'disabled'} aria-label="${t('Raise {stat}', { stat: t(STAT_NAMES[k]) })}">+</button></div>`;
      }).join('');
      const pct = r.level >= MAX_LEVEL ? 100 : Math.round((r.exp / expToNext(r.level)) * 100);
      const starter = s.roster[s.lineup[m.role]] && member(s.lineup[m.role]);
      return `<div class="card ${dressed ? '' : 'benched'}">
        <div class="card-head">
          <img src="${portrait(id, 0, null, 152)}" alt="">
          <div style="min-width:0">
            <h3>${esc(m.name)}</h3>
            <div class="sub">${esc(t(m.title))}${m.recruit ? ` · ${t('signed')}` : ''}${m.agent ? ` · ${t('free agent')}` : ''}${m.legend ? ` · <span class="gold-t">${t('legend')}</span>` : ''}${m.rookie ? ` · ${smallIcon('icons/rookie', 40)}<span class="pot" title="${esc(t(POTENTIAL_GRADE[m.rookie.potential]))}">${stars(m.rookie.potential)}</span>` : ''}</div>
            <div class="lvl">${t('LV {n}', { n: r.level })}${r.points ? ` <span style="font-size:15px">· ${t(r.points > 1 ? '{n} points to spend' : '{n} point to spend', { n: r.points })}</span>` : ''}</div>
          </div>
        </div>
        ${dressed ? `<div class="dress on">${t(ROLE_NAME[m.role])} · ${t('dressed')}</div>` : `<button class="btn small dress" data-dress="${id}">${t('Dress at {role} (for {name})', { role: t(ROLE_NAME[m.role]).toLowerCase(), name: esc(starter.name) })}</button>`}
        <div class="xpbar" title="${t('{n}/{max} EXP', { n: r.exp, max: expToNext(r.level) })}"><i style="width:${pct}%"></i></div>
        ${r.pendingPerk !== null ? `<div class="pending" data-perk="${id}">${t('New perk unlocked: choose one')}</div>` : ''}
        <div class="stats">${stats}</div>
        <div class="gear-row">${['stick', 'skates', 'armor'].map((slot) => {
          const g = GEAR_BY_ID[r.gear[slot]];
          return `<button class="slot" data-gear="${id}:${slot}"><img src="${ico(g.icon, 92)}" alt=""><span>${esc(t(g.name))}</span></button>`;
        }).join('')}</div>
        <div class="style-row">${styleChips(c)}<span class="muted">${shoots(m.hand)} · ${esc(t(ARCHETYPES[c.arch].trait))}</span><button class="btn small ghost camp-btn" data-camp="${id}">${smallIcon('icons/respec', 40, 'btn-ico')}${t('Change…')}</button></div>
        <div class="abil"><img src="${ico(c.skill.icon, 68)}" alt=""><div><b>${esc(t(c.skill.name))}</b>${esc(t(c.skill.text))} <span class="muted">(${c.skill.cd}s)</span></div></div>
        <div class="abil"><img src="${ico('hud_elements/misc/level_star', 68)}" alt=""><div><b>${esc(t(c.ult.name))}</b>${esc(t(c.ult.text))}</div></div>
        ${r.perks.length ? `<div class="perks">${r.perks.map((p) => `<span class="perk" title="${esc(t(p))}">${esc(t(p).split(':')[0])}</span>`).join('')}</div>` : ''}
      </div>`;
    };
    const keepers = goalieIds(s), starting = starterId(s);
    const goalieCard = (gid) => {
      const g = goalieRec(s, gid), info = goalieInfo(gid), gs = goalieStats(s, gid), st = GOALIE_STYLES[goalieStyle(s, gid)] || GOALIE_STYLES.hybrid;
      const gg = GEAR_BY_ID[g.gear], on = gid === starting;
      const gpct = g.level >= MAX_LEVEL ? 100 : Math.round((g.exp / expToNext(g.level)) * 100);
      const pips = (n) => Array.from({ length: 12 }, (_, i) => `<i class="${i < n ? 'b' : ''}"></i>`).join('');
      return `<div class="card ${on ? '' : 'benched'}">
        <div class="card-head"><img src="${portrait(gid, 0, null, 152)}" alt="">
          <div style="min-width:0"><h3>${esc(info.name)}</h3><div class="sub">${t('Goaltender (AI)')}${info.recruit ? ` · ${t('signed')}` : ''}</div><div class="lvl">${t('LV {n}', { n: g.level })}</div></div></div>
        ${keepers.length < 2 ? '' : on ? `<div class="dress on">${t('In goal')}</div>` : `<button class="btn small dress" data-start="${gid}">${t('Start in goal (for {name})', { name: esc(goalieInfo(starting).name) })}</button>`}
        <div class="xpbar"><i style="width:${gpct}%"></i></div>
        <div class="stats">
          <div class="stat"><span>${t('Reflex')}</span><span class="pips">${pips(gs.rfx)}</span><span class="v">${gs.rfx}</span><span></span></div>
          <div class="stat"><span>${t('Angles')}</span><span class="pips">${pips(gs.pos)}</span><span class="v">${gs.pos}</span><span></span></div>
        </div>
        <div class="abil">${goalieStyleIcon(st.id)}<div><b>${esc(t(st.name))}</b>${esc(t(st.text))}</div></div>
        <div class="style-row"><button class="btn small ghost camp-btn" data-gcamp="${gid}">${smallIcon('icons/respec', 40, 'btn-ico')}${t('Change style…')}</button></div>
        <p class="muted" style="margin:0;font-size:12.5px">${gid === 'halla' ? t('Halla levels up from saves. Reflex rises every two levels.') : t('Levels up from saves made in goal. Reflex rises every two levels.')}</p>
        <div class="gear-row" style="grid-template-columns:1fr"><button class="slot" data-gear="${gid}:goalie"><img src="${ico(gg.icon, 92)}" alt=""><span>${esc(t(gg.name))}</span></button></div>
      </div>`;
    };
    const benchKeepers = keepers.filter((gid) => gid !== starting);
    const pairs = [];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) pairs.push(pairKey(line[i], line[j]));
    body.innerHTML = `
      <div class="club-bar"><img src="${crest('home', 96)}" alt="" width="40" height="40"><div style="min-width:0"><b>${esc(CLUB.name)}</b><span class="muted">${esc(CLUB.short)} · ${t('the {club}', { club: esc(CLUB.nick) })}</span></div>
        <span class="club-sw" style="--a:${CLUB.trim};--b:${CLUB.jersey}"></span><button class="btn small ghost" id="club-edit">${t('Customise club')}</button></div>
      <div class="label" style="margin-bottom:4px">${t('Line-up')}</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">${t('A centre, a winger and a defender dress for every match. Every player brings a style and a super of their own.')} <button class="link-btn" id="t-supers">${t('How supers work')}</button></p>
      <div class="roster">${line.map((id) => card(id, true)).join('')}${goalieCard(starting)}</div>
      ${bench.length || benchKeepers.length ? `<div class="label" style="margin:16px 0 4px">${t('Bench')}</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">${t('Benched skaters don\'t earn match EXP, but you can bring them to training.')}${benchKeepers.length ? ` ${t('Only the goalie who starts earns EXP from saves.')}` : ''}</p>
      <div class="roster">${bench.map((id) => card(id, false)).join('')}${benchKeepers.map(goalieCard).join('')}</div>` : ''}
      <div class="label" style="margin:16px 0 4px">${t('Chemistry')}</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">${t('Bonds grow between the people in your line through passes, assists and combo goals. The combo a pair fires depends on their positions. From level 1, pass between the pair and shoot right away (a one-timer works) to fire it. A new signing starts with no chemistry.')}</p>
      <div class="chem-grid">${pairs.map((k) => chemCard(k, s.chem[k] || 0)).join('')}</div>
      ${this.scoutingHtml(s)}`;
    this.click('[data-raise]', (el) => {
      const [id, k] = el.dataset.raise.split(':');
      const r = s.roster[id];
      if (!canRaise(r, id, k)) return;
      r.points--; r.alloc[k]++;
      audio.sfx('confirm');
      writeSave(s);
      this.hub('team');
    }, body);
    this.click('[data-perk]', (el) => this.perkChoice(el.dataset.perk, () => this.hub('team')), body);
    this.click('[data-camp]', (el) => this.campModal(el.dataset.camp), body);
    this.click('#t-supers', () => this.supersHelp(), body);
    this.click('[data-gear]', (el) => { const [id, slot] = el.dataset.gear.split(':'); this.gearPicker(id, slot); }, body);
    this.click('[data-dress]', (el) => { setLineup(s, el.dataset.dress); writeSave(s); audio.sfx('confirm'); this.hub('team'); }, body);
    this.click('[data-start]', (el) => { setStarter(s, el.dataset.start); writeSave(s); audio.sfx('confirm'); Assets.ensureKit(homeKitGroups(s)).then(() => this.hub('team')); }, body);
    this.click('[data-gsign]', (el) => this.goalieOffer(el.dataset.gsign), body);
    this.click('[data-agent]', (el) => this.agentOffer(+el.dataset.agent), body);
    this.click('[data-gcamp]', (el) => this.goalieCamp(el.dataset.gcamp), body);
    this.click('[data-sign]', (el) => this.signOffer(el.dataset.sign), body);
    this.click('[data-trade]', (el) => this.tradeOffer(el.dataset.trade), body);
    this.click('[data-legend]', (el) => {
      const key = el.dataset.legend, L = LEGENDS[key];
      if (!signLegend(s, key)) return;
      this.app.ach.checkMeta();
      writeSave(s);
      audio.jingle('sign');
      Assets.ensureKit(homeKitGroups(s)).then(() => {
        this.hub('team');
        this.modal(`<h2>${t('{name} signs!', { name: esc(L.name) })}</h2>
          <p>${t('{name} joins the {club} on your bench.', { name: esc(L.name), club: esc(CLUB.nick) })} ${s.roster[L.twin] ? t('The twins are together: dress them both for Ragnarök.') : ''}</p>
          <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Later')}</button><button class="btn gold" id="dress-now">${t('Dress now')}</button></div>`, (m2, close2) => {
          this.click('#dress-now', () => { setLineup(s, key); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
        });
      });
    }, body);
    this.click('#club-edit', () => this.clubEditor(), body);
  }

  // Club name, nickname, short code and colours, with a live preview.
  clubEditor() {
    const s = this.app.save;
    const cur = { ...CLUB_DEFAULT, ...(s.club || {}) };
    const draft = { ...cur };
    let nickTouched = !!(s.club && s.club.nick), shortTouched = !!(s.club && s.club.short);
    audio.sfx('click');
    const previewIds = () => {
      const sk = Assets.atlas.skaters;
      return [clubCrestId(draft.crest), sk.frost_captain.home.south.frames.idle, sk.thunder_winger.home.south.frames.celebrate, sk.stone_defender.home.east.frames.idle];
    };
    const crests = CLUB_CRESTS.filter((c) => Assets.frame(clubCrestId(c.id))); // (the designs there's art for)
    const rc = () => {
      const p = { trim: hexToHsvUI(draft.trim), jersey: hexToHsvUI(draft.jersey), mode: 'home' };
      return draft.trim === CLUB_DEFAULT.trim && draft.jersey === CLUB_DEFAULT.jersey ? null : p;
    };
    this.modal(`
      <h2>${t('Your club')}</h2>
      <div class="club-preview" id="club-preview"></div>
      <div class="club-form">
        <label>${t('Club name')}<input id="club-name" maxlength="26" value="${esc(draft.name)}" autocomplete="off"></label>
        <label>${t('Nickname')} <small class="muted">${t('chants, commentary and dialogue')}</small><input id="club-nick" maxlength="16" value="${esc(draft.nick)}" autocomplete="off"></label>
        <label>${t('Short code')}<input id="club-short" maxlength="3" value="${esc(draft.short)}" autocomplete="off" style="text-transform:uppercase;width:5.5em"></label>
      </div>
      <div class="label" style="font-size:15px;margin:4px 0 0">${t('Crest')}</div>
      <div class="filters crest-picks" style="margin:6px 0 0">${crests.map((c) => `<button class="chip crest-pick" data-crest="${c.id}" aria-pressed="${draft.crest === c.id}" aria-label="${esc(t(c.name))}" title="${esc(t(c.name))}"><img alt="" width="40" height="40"></button>`).join('')}</div>
      <div class="label" style="font-size:15px;margin:4px 0 0">${t('Colours')}</div>
      <div class="filters" style="margin:6px 0 0">${CLUB_PRESETS.map((p) => `<button class="chip preset" data-preset="${p.id}" aria-pressed="${p.trim === draft.trim && p.jersey === draft.jersey}"><span class="club-sw" style="--a:${p.trim};--b:${p.jersey}"></span>${esc(t(p.name))}</button>`).join('')}</div>
      <div class="row" style="gap:16px;margin-top:4px">
        <label class="color-pick">${t('Trim')} <input type="color" id="club-trim" value="${draft.trim}"></label>
        <label class="color-pick">${t('Jersey')} <input type="color" id="club-jersey" value="${draft.jersey}"></label>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn small ghost" id="club-reset">${t('Reset to {club}', { club: esc(CLUB_DEFAULT.name) })}</button>
        <span class="row" style="gap:8px"><button class="btn small ghost" data-close>${t('Cancel')}</button><button class="btn gold" id="club-save">${t('Save club')}</button></span>
      </div>`, (m, close) => {
      const $ = (sel) => m.querySelector(sel);
      const paint = () => {
        const r = rc();
        $('#club-preview').innerHTML = previewIds().map((id, i) => `<img src="${Assets.previewIcon(id, i ? 132 : 96, r)}" alt="">`).join('')
          + `<div class="club-name-preview"><b>${esc(draft.name)}</b><span>${esc(draft.short)} · ${esc(draft.nick)}</span></div>`;
        m.querySelectorAll('[data-preset]').forEach((b) => { const p = CLUB_PRESETS.find((x) => x.id === b.dataset.preset); b.setAttribute('aria-pressed', p.trim === draft.trim && p.jersey === draft.jersey); });
        m.querySelectorAll('[data-crest]').forEach((b) => { b.setAttribute('aria-pressed', b.dataset.crest === draft.crest); b.querySelector('img').src = Assets.previewIcon(clubCrestId(b.dataset.crest), 80, r); });
        $('#club-trim').value = draft.trim; $('#club-jersey').value = draft.jersey;
      };
      paint();
      $('#club-name').addEventListener('input', (e) => {
        draft.name = e.target.value.trim() || CLUB_DEFAULT.name;
        const words = draft.name.split(/\s+/);
        if (!nickTouched) { draft.nick = words[words.length - 1]; $('#club-nick').value = draft.nick; }
        if (!shortTouched) { draft.short = words[0].replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase() || 'GLA'; $('#club-short').value = draft.short; }
        paint();
      });
      $('#club-nick').addEventListener('input', (e) => { nickTouched = true; draft.nick = e.target.value.trim() || draft.name.split(/\s+/).pop(); paint(); });
      $('#club-short').addEventListener('input', (e) => { shortTouched = true; draft.short = (e.target.value.trim().toUpperCase() || 'GLA').slice(0, 3); paint(); });
      $('#club-trim').addEventListener('input', (e) => { draft.trim = e.target.value; paint(); });
      $('#club-jersey').addEventListener('input', (e) => { draft.jersey = e.target.value; paint(); });
      this.click('[data-preset]', (el) => { const p = CLUB_PRESETS.find((x) => x.id === el.dataset.preset); draft.trim = p.trim; draft.jersey = p.jersey; audio.sfx('click'); paint(); }, m);
      this.click('[data-crest]', (el) => { draft.crest = el.dataset.crest; audio.sfx('click'); paint(); }, m);
      this.click('#club-reset', () => {
        Object.assign(draft, CLUB_DEFAULT); nickTouched = shortTouched = false;
        $('#club-name').value = draft.name; $('#club-nick').value = draft.nick; $('#club-short').value = draft.short;
        audio.sfx('click'); paint();
      }, m);
      this.click('#club-save', () => {
        const same = Object.keys(CLUB_DEFAULT).every((k) => draft[k] === CLUB_DEFAULT[k]);
        s.club = same ? null : { ...draft };
        this.app.applyClubLook();
        writeSave(s);
        audio.jingle('achievement');
        close();
        this.hub(this.tab);
      }, m);
    });
  }

  // Rival skaters you can sign: every team you've beaten.
  scoutingHtml(s) {
    // the league's clubs, and any other you've met
    const teams = RIVAL_IDS.filter((tid) => leagueRivals(s.league).includes(tid) || (s.rivals && s.rivals[tid]));
    const rows = teams.map((tid) => {
      const tm = TEAMS[tid];
      const keys = ['frost', 'thunder', 'stone'].map((kit) => recruitKey(tid, kit));
      const gk = `${tid}_g`, G = GOALIE_RECRUITS[gk], gst = goalieStatus(s, gk);
      const open = recruitStatus(s, keys[0]) !== 'locked' || keys.some((k) => isSigned(s, k)) || gst === 'signed';
      const players = keys.map((k) => {
        const r = RECRUITS[k];
        const st = recruitStatus(s, k);
        const top = Object.entries(r.base).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([sk, v]) => `${t(STAT_NAMES[sk])} ${v}`).join(' · ');
        const face = st === 'signed' ? portrait(k, 0, null, 96) : portrait(r.kit, 1, tid, 96);
        return `<div class="recruit ${st}">
          <img src="${face}" alt="">
          <div style="min-width:0"><b>${esc(r.name)}</b><span class="muted">${t(ROLE_NAME[r.role])} · ${esc(top)} · ${st === 'retired' ? t('retired') : ageOf(s, k) >= RETIRE_AT - 1 ? t('age {n}, last season', { n: ageOf(s, k) }) : t('age {n}', { n: ageOf(s, k) })}</span></div>
          ${st === 'signed' ? `<span class="tag good">${t('Signed')}</span>` : st === 'retired' ? `<span class="tag">${t('Retired')}</span>` : st === 'traded' ? `<span class="tag">${t('With the {team}', { team: esc(TEAMS[s.tradedAway[k]].name.split(' ').slice(-1)[0]) })}</span>` : st === 'open' ? `<span class="row" style="gap:4px;margin:0;flex-wrap:nowrap"><button class="btn small ghost" data-trade="${k}" ${tradeable(s).length ? '' : 'disabled'} title="${esc(t('Trade one of your players for them'))}">${btnIcon('icons/trade')}${t('Trade')}</button><button class="btn small ${s.coins >= recruitPrice(s, k) ? 'gold' : 'ghost'}" data-sign="${k}"><img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="16" height="16"> ${recruitPrice(s, k)}</button></span>` : `<span class="tag">${t('Locked')}</span>`}
        </div>`;
      }).join('') + `<div class="recruit ${gst}">
          <img src="${gst === 'signed' ? portrait(gk, 0, null, 96) : portrait('goalie', 1, tid, 96)}" alt="">
          <div style="min-width:0"><b>${esc(G.name)}</b><span class="muted">${t('Goalie')} · ${esc(t(GOALIE_STYLES[G.gstyle].name))} · ${t('Reflex')} ${G.base.rfx}</span></div>
          ${gst === 'signed' ? `<span class="tag good">${t('Signed')}</span>` : gst === 'open' ? `<button class="btn small ${s.coins >= G.price ? 'gold' : 'ghost'}" data-gsign="${gk}"><img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="16" height="16"> ${G.price}</button>` : `<span class="tag">${t('Locked')}</span>`}
        </div>`;
      return `<div class="scout-team ${open ? '' : 'locked'}">
        <div class="scout-head"><img src="${crest(tid, 48)}" alt="" width="28" height="28"><b>${esc(tm.name)}</b>${open ? '' : `<span class="muted"> · ${t('beat them to open talks')}</span>`}</div>
        <div class="recruits">${players}</div>
      </div>`;
    }).join('');
    return `<div class="label" style="margin:16px 0 4px">${t('Scouting')}</div>
      ${this.legendHtml(s)}
      ${this.agentsHtml(s)}
      <p class="muted" style="margin:0 0 10px;font-size:13px">${t('Beat a rival and their skaters will take your call. Signings join a level below your line-up\'s average with points to spend and the perks they already had.')} ${t('Their goalie too: a signed goalie brings their own style, and you choose who starts.')}</p>
      <div class="scouting">${rows}</div>`;
  }

  // The free-agent market: a card per player the agent has this week (face, position, style,
  // numbers against your starter, price).
  agentsHtml(s) {
    if (!marketOpen(s)) return '';
    const st = agentState(s), list = st.list || [];
    // their faces are made from parts: load them, then show the cards again
    const needs = [list.some((a) => a.parts) && 'parts', list.some((a) => a.look) && 'goalie_parts'].filter((g) => g && !Assets.groupReady(g));
    if (needs.length && !this.partsLoading) {
      this.partsLoading = true;
      Promise.all(needs.map((g) => Assets.loadGroup(g))).then(() => { this.partsLoading = false; if (this.tab === 'team') this.hub('team'); }).catch(() => { this.partsLoading = false; });
    }
    const P = Assets.atlas.portraits || {};
    const face = (a) => (a.goalie ? (a.look && Assets.goaliePortrait(a.look, 'neutral', 96)) || (P.newcomer_g && Assets.icon(P.newcomer_g.neutral, 96)) || portrait('goalie', 1, null, 96)
      : (a.parts && Assets.partsPortrait(a.parts, 'neutral', 96)) || (P[`newcomer_${ROLE[a.kit]}`] && Assets.icon(P[`newcomer_${ROLE[a.kit]}`].neutral, 96)) || portrait(a.kit, 1, null, 96));
    const cards = list.map((a, i) => {
      const what = a.goalie ? `${t('Goalie')} · ${esc(t(GOALIE_STYLES[a.style].name))}` : `${t(ROLE_NAME[CHARACTERS[a.kit].role])} · ${esc(t(ARCHETYPES[a.arch].name))} · ${esc(t(ELEMENTS[a.elem].name))}`;
      const top = a.goalie ? `${t('Reflex')} ${a.base.rfx} · ${t('Angles')} ${a.base.pos}` : Object.entries(a.base).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, v]) => `${t(STAT_NAMES[k])} ${v}`).join(' · ');
      return `<div class="recruit open agent">
        <img src="${face(a)}" alt="">
        <div style="min-width:0"><b>${esc(a.name)}${a.star ? ` <span class="gold-t" title="${esc(t('A cut above'))}">★</span>` : ''}</b><span class="muted">${what} · ${t('LV {n}', { n: a.level })}</span><span class="muted">${esc(top)}</span></div>
        <button class="btn small ${s.coins >= a.price ? 'gold' : 'ghost'}" data-agent="${i}"><img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="16" height="16"> ${a.price}</button>
      </div>`;
    }).join('');
    const left = agentsLeft(s);
    const line = list.length ? t('These are this week\'s free agents. New faces in {n} matches.', { n: left }) : t('Nobody on my list right now. New faces in {n} matches.', { n: left });
    return `<div class="scout-team agents">
      <div class="scout-head">${smallIcon(Assets.atlas.frames['icons/free_agents'] ? 'icons/free_agents' : 'icons/contract', 48, 'rule-ico')}<b>${t('Free agents')}</b><span class="muted"> · ${esc(line)}</span></div>
      ${npc('agent', list.length ? t(list[0].blurb) : line)}
      <div class="recruits">${cards}</div>
    </div>`;
  }

  // Signing a free agent: who they are, their numbers next to your starter's, the price.
  agentOffer(i) {
    const s = this.app.save, a = agentState(s).list[i];
    if (!a) return;
    const P = Assets.atlas.portraits || {};
    let compare, joins, face;
    if (a.goalie) {
      const now = starterId(s), cur = goalieStats(s, now);
      const theirs = { rfx: a.base.rfx + Math.floor((a.level - 1) / 2), pos: a.base.pos + Math.floor(a.level / 3) };
      const row = (label, v, was) => `<div class="stat"><span>${label}</span><span class="pips">${Array.from({ length: 12 }, (_, j) => `<i class="${j < v ? 'b' : ''}"></i>`).join('')}</span><span class="v">${v}</span><span class="${v > was ? 'good' : v < was ? 'bad' : 'muted'}" style="font-size:12px">${v > was ? '+' : ''}${v - was || '='}</span></div>`;
      compare = row(t('Reflex'), theirs.rfx, cur.rfx) + row(t('Angles'), theirs.pos, cur.pos);
      joins = t('At level {lv}, compared with {name} (who starts now).', { lv: a.level, name: esc(goalieInfo(now).name) });
      face = (a.look && Assets.goaliePortrait(a.look, 'determined', 152)) || (P.newcomer_g && Assets.icon(P.newcomer_g.neutral, 152)) || portrait('goalie', 1, null, 152);
    } else {
      const role = CHARACTERS[a.kit].role, starter = member(s.lineup[role]);
      compare = STAT_KEYS.map((k) => {
        const diff = a.base[k] - starter.base[k];
        return `<div class="stat"><span>${t(STAT_NAMES[k])}</span><span class="pips">${Array.from({ length: 12 }, (_, j) => `<i class="${j < a.base[k] ? 'b' : ''}"></i>`).join('')}</span><span class="v">${a.base[k]}</span><span class="${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'muted'}" style="font-size:12px">${diff > 0 ? '+' : ''}${diff || '='}</span></div>`;
      }).join('');
      joins = `${t('Base stats, compared with {name}.', { name: esc(starter.name) })} ${t(a.level === 2 ? 'Joins at level {lv} with {n} point to spend.' : 'Joins at level {lv} with {n} points to spend.', { lv: a.level, n: a.level - 1 })}`;
      face = (a.parts && Assets.partsPortrait(a.parts, 'determined', 152)) || (P[`newcomer_${ROLE[a.kit]}`] && Assets.icon(P[`newcomer_${ROLE[a.kit]}`].determined || P[`newcomer_${ROLE[a.kit]}`].neutral, 152)) || portrait(a.kit, 1, null, 152);
    }
    const what = a.goalie ? `<div class="abil" style="margin:4px 0 0">${goalieStyleIcon(a.style)}<div><b>${esc(t(GOALIE_STYLES[a.style].name))}</b>${esc(t(GOALIE_STYLES[a.style].text))}</div></div>`
      : `<div class="style-row">${styleChips(makeDef(a.kit, a.arch, a.elem))}</div><div class="muted" style="font-size:12.5px">${shoots(a.hand)}</div>`;
    audio.sfx('click');
    this.modal(`
      <h2>${t('Sign {name}?', { name: esc(a.name) })}</h2>
      <div class="card-head" style="margin:0"><img src="${face}" alt="" style="width:76px;height:76px">
        <div><div class="sub">${t('Free agent')} · ${a.goalie ? t('Goalie') : t(ROLE_NAME[CHARACTERS[a.kit].role])}</div>${what}<p style="margin:4px 0 0">${esc(t(a.blurb))}</p></div></div>
      <div class="stats">${compare}</div>
      <p class="muted" style="margin:0;font-size:13px">${joins} ${t('Free agents are veterans: they don\'t grow faster than anyone else, and they know what they\'re worth.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not now')}</button>
        <button class="btn gold" id="agent-go" ${s.coins >= a.price ? '' : 'disabled'}>${t('Sign for {n}', { n: a.price })}</button></div>`, (mm, close) => {
      this.click('#agent-go', () => {
        const id = signAgent(s, i);
        if (!id) return;
        this.app.ach.unlock('veteran');
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s)).then(() => {
          this.hub('team');
          if (a.goalie) {
            this.modal(`<h2>${t('{name} signs!', { name: esc(a.name) })}</h2>
              <p>${t('{name} joins the {club} in goal. Who starts?', { name: esc(a.name), club: esc(CLUB.nick) })}</p>
              <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Keep {name}', { name: esc(goalieInfo(starterId(s)).name) })}</button><button class="btn gold" id="start-now">${t('Start {name}', { name: esc(a.name) })}</button></div>`, (m2, close2) => {
              this.click('#start-now', () => { setStarter(s, id); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
            });
            return;
          }
          const role = member(id).role;
          this.modal(`<h2>${t('{name} signs!', { name: esc(a.name) })}</h2>
            <p>${t('{name} joins the {club} on your bench.', { name: esc(a.name), club: esc(CLUB.nick) })} ${t('Dress {name} at {role} from the Team tab, or before a match.', { name: esc(a.name), role: t(ROLE_NAME[role]).toLowerCase() })}</p>
            <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Later')}</button><button class="btn gold" id="dress-now">${t('Dress now')}</button></div>`, (m2, close2) => {
            this.click('#dress-now', () => { setLineup(s, id); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
          });
        });
      }, mm);
    });
  }

  // A legend visiting Scouting: who they are, their super, their numbers, and their price.
  legendHtml(s) {
    const key = legendState(s).visiting, L = LEGENDS[key];
    if (!L || s.roster[key]) return '';
    const m = member(key), left = legendLeft(s);
    const twin = s.roster[L.twin] ? `<p class="gold-t" style="margin:0;font-size:12.5px">${t('{name} is already yours: the twins together get Ragnarök from day one.', { name: esc(LEGENDS[L.twin].name) })}</p>` : '';
    const reveal = Assets.atlas.legends && Assets.atlas.legends.reveal;
    return `<div class="card legend">
      ${reveal ? `<div class="legend-reveal" style="background-image:url(${Assets.url(reveal.image)})"></div>` : ''}
      <div class="card-head"><img src="${portrait(key, 0, null, 152)}" alt=""><div style="min-width:0">
        <div class="label" style="font-size:12px">${t('A legend is in town')}</div><h3>${esc(L.name)}</h3><div class="sub">${esc(t(L.title))} · ${shoots(m.hand)}</div>
        <div class="style-row">${styleChips(m.def)}</div></div></div>
      <p style="margin:0;font-size:13px">${esc(t(L.blurb))}</p>${twin}
      <div class="legend-stats">${STAT_KEYS.map((k) => `<span>${t(STAT_NAMES[k])} <b>${L.base[k]}</b></span>`).join('')}</div>
      <div class="row" style="justify-content:space-between;align-items:center;margin:0"><span class="muted" style="font-size:12.5px">${t(left === 1 ? 'Gone after {n} more match.' : 'Gone after {n} more matches.', { n: left })}</span>
        <button class="btn ${s.coins >= L.price ? 'gold' : 'ghost'}" data-legend="${key}" ${s.coins >= L.price ? '' : 'disabled'}><img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="16" height="16"> ${L.price}</button></div>
    </div>`;
  }

  // Signing a rival's goalie: their style, their numbers next to whoever starts for us.
  goalieOffer(key) {
    const s = this.app.save, G = GOALIE_RECRUITS[key], st = GOALIE_STYLES[G.gstyle];
    const now = starterId(s), cur = goalieStats(s, now), lv = Math.max(1, s.goalie.level - 1);
    const row = (label, v, was) => `<div class="stat"><span>${label}</span><span class="pips">${Array.from({ length: 12 }, (_, i) => `<i class="${i < v ? 'b' : ''}"></i>`).join('')}</span><span class="v">${v}</span><span class="${v > was ? 'good' : v < was ? 'bad' : 'muted'}" style="font-size:12px">${v > was ? '+' : ''}${v - was || '='}</span></div>`;
    const theirs = { rfx: G.base.rfx + Math.floor((lv - 1) / 2), pos: G.base.pos + Math.floor(lv / 3) };
    audio.sfx('click');
    this.modal(`
      <h2>${t('Sign {name}?', { name: esc(G.name) })}</h2>
      <div class="card-head" style="margin:0"><img src="${portrait('goalie', 1, G.team, 152)}" alt="" style="width:76px;height:76px">
        <div><div class="sub">${esc(TEAMS[G.team].name)} · ${t('Goalie')}</div><div class="abil" style="margin:4px 0 0">${goalieStyleIcon(st.id)}<div><b>${esc(t(st.name))}</b>${esc(t(st.text))}</div></div></div></div>
      <div class="stats">${row(t('Reflex'), theirs.rfx, cur.rfx)}${row(t('Angles'), theirs.pos, cur.pos)}</div>
      <p class="muted" style="margin:0;font-size:13px">${t('At level {lv}, compared with {name} (who starts now).', { lv, name: esc(goalieInfo(now).name) })} ${t('Their old team plays a backup in goal from now on.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not now')}</button>
        <button class="btn gold" id="gsign-go" ${s.coins >= G.price ? '' : 'disabled'}>${t('Sign for {n}', { n: G.price })}</button></div>`, (mm, close) => {
      this.click('#gsign-go', () => {
        if (!signGoalie(s, key)) return;
        this.app.ach.unlock('second-keeper');
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s)).then(() => {
          this.hub('team');
          this.modal(`<h2>${t('{name} signs!', { name: esc(G.name) })}</h2>
            <p>${t('{name} joins the {club} in goal. Who starts?', { name: esc(G.name), club: esc(CLUB.nick) })}</p>
            <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Keep {name}', { name: esc(goalieInfo(now).name) })}</button><button class="btn gold" id="start-now">${t('Start {name}', { name: esc(G.name) })}</button></div>`, (m2, close2) => {
            this.click('#start-now', () => { setStarter(s, key); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
          });
        });
      }, mm);
    });
  }

  signOffer(key) {
    const s = this.app.save;
    const r = RECRUITS[key];
    const m = member(key);
    const lv = joinLevel(s), pts = lv - 1 + 4 * leagueGrowth(s); // (and what they've grown since the first season)
    const starter = member(s.lineup[r.role]);
    const perks = m.def.perks.filter((_, i) => lv >= [3, 5, 7][i]).map((opts, i) => t(opts[r.perks[i]]).split(':')[0]);
    audio.sfx('click');
    this.modal(`
      <h2>${t('Sign {name}?', { name: esc(r.name) })}</h2>
      <div class="card-head" style="margin:0"><img src="${portrait(r.kit, 1, r.team, 152)}" alt="" style="width:76px;height:76px">
        <div><div class="sub">${esc(TEAMS[r.team].name)} · ${t(ROLE_NAME[r.role])}</div><div class="style-row">${styleChips(m.def)}</div><p style="margin:4px 0 0">${esc(t(r.blurb))}</p></div></div>
      <div class="stats">${STAT_KEYS.map((k) => {
        const diff = r.base[k] - starter.base[k];
        return `<div class="stat"><span>${t(STAT_NAMES[k])}</span><span class="pips">${Array.from({ length: 12 }, (_, i) => `<i class="${i < r.base[k] ? 'b' : ''}"></i>`).join('')}</span><span class="v">${r.base[k]}</span><span class="${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'muted'}" style="font-size:12px">${diff > 0 ? '+' : ''}${diff || '='}</span></div>`;
      }).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px">${t('Base stats, compared with {name}.', { name: esc(starter.name) })} ${t('Plays the {role} kit ({skill}, {ult}).', { role: t(ROLE_NAME[r.role]).toLowerCase(), skill: esc(t(m.def.skill.name)), ult: esc(t(m.def.ult.name)) })} ${perks.length ? t(pts === 1 ? 'Joins at level {lv} with {n} point to spend and {perks}.' : 'Joins at level {lv} with {n} points to spend and {perks}.', { lv, n: pts, perks: perks.join(', ') }) : t(pts === 1 ? 'Joins at level {lv} with {n} point to spend.' : 'Joins at level {lv} with {n} points to spend.', { lv, n: pts })} ${t('No chemistry with your line yet.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not now')}</button>
        <button class="btn gold" id="sign-go" ${s.coins >= recruitPrice(s, key) ? '' : 'disabled'}>${t('Sign for {n}', { n: recruitPrice(s, key) })}</button></div>`, (mm, close) => {
      this.click('#sign-go', () => {
        if (!signRecruit(s, key)) return;
        this.app.ach.unlock('signing');
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s)).then(() => this.hub('team'));
        this.modal(`<h2>${t('{name} signs!', { name: esc(r.name) })}</h2>
          <p>${t('{name} joins the {club} on your bench.', { name: esc(r.name), club: esc(CLUB.nick) })} ${t('Dress {name} at {role} from the Team tab, or before a match.', { name: esc(r.name), role: t(ROLE_NAME[r.role]).toLowerCase() })}</p>
          <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Later')}</button><button class="btn gold" id="dress-now">${t('Dress now')}</button></div>`, (m2, close2) => {
          this.click('#dress-now', () => { setLineup(s, key); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
        });
      }, mm);
    });
  }

  // The training camp for one player: a new super from Ottar's element stones, or a new style
  // from Brekka's camp. Each once a season; the first tap on a choice arms it, the second buys.
  async campModal(id) {
    await Assets.loadGroup('hub').catch(() => {}); // (Ottar and Brekka)
    const s = this.app.save, m = member(id);
    const section = (kind) => {
      const open = campOpen(s, id, kind), price = CAMP[kind].price, afford = s.coins >= price;
      const items = campChoices(id, kind).map((v) => {
        const cur = m.def[kind] === v;
        const pic = kind === 'elem' ? (smallIcon('icons/stone_' + v, 80, 'camp-ico') || smallIcon(ELEMENTS[v].icon, 80, 'camp-ico')) : smallIcon('icons/arch_' + v, 80, 'camp-ico');
        const line = kind === 'elem' ? `${esc(t(ELEMENTS[v].skill.name))} · ${esc(t(ELEMENTS[v].ult.name))}` : esc(t(ARCHETYPES[v].trait));
        const name = kind === 'elem' ? t(ELEMENTS[v].name) : t(ARCHETYPES[v].name);
        return `<button class="camp-choice${cur ? ' cur' : ''}" data-pick="${kind}:${v}" ${cur || !open || !afford ? 'disabled' : ''} ${kind === 'elem' ? `style="--el:${ELEMENTS[v].color}"` : ''}>
          ${pic}<b>${esc(name)}${cur ? ` <small>${t('now')}</small>` : ''}</b><span>${line}</span></button>`;
      }).join('');
      const head = kind === 'elem' ? t('Super: an element stone from Ottar') : t('Style: a week of Brekka\'s camp');
      const note = !open ? t('Already changed this season.') : !afford ? t('Not enough coins.') : '';
      // Ottar holding up a stone, Brekka with the whistle (Batch AM)
      const pose = kind === 'elem' ? 'hub_fullbody/shopkeeper/offer' : 'hub_fullbody/coach/whistle';
      const who = Assets.atlas.frames[pose] && Assets.groupReady('hub') && Assets.spriteSet([pose], 200);
      return `<div class="label camp-head" style="margin:10px 0 4px">${who ? `<img class="camp-npc" src="${who.urls[0]}" alt="">` : ''}<span>${head} · <img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="14" height="14"> ${price}${note ? ` <span class="muted" style="text-transform:none;letter-spacing:0">${note}</span>` : ''}</span></div>
        <div class="camp-grid">${items}</div>`;
    };
    audio.sfx('click');
    this.modal(`<h2>${t('{name}: training camp', { name: esc(m.name) })}</h2>
      <p class="muted" style="margin:0;font-size:13px">${t('Each can change once a season. Perks carry over: the same choice on the new list.')}</p>
      ${section('elem')}${section('arch')}
      <p class="muted" id="camp-msg" style="min-height:1.2em;font-size:12.5px;margin:6px 0 0"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Done')}</button></div>`, (mm, close) => {
      let armed = null;
      this.click('[data-pick]', (el) => {
        const [kind, v] = el.dataset.pick.split(':');
        if (armed !== el) {
          mm.querySelectorAll('.camp-choice.armed').forEach((b) => b.classList.remove('armed'));
          armed = el; el.classList.add('armed'); audio.sfx('click');
          mm.querySelector('#camp-msg').textContent = t('Tap again to pay {n} coins.', { n: CAMP[kind].price });
          return;
        }
        if (!campChange(s, id, kind, v)) return;
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        this.hub('team');
        this.toastNote(t('{name} now plays {what}.', { name: m.name, what: kind === 'elem' ? t(ELEMENTS[v].name) : t(ARCHETYPES[v].name) }));
      }, mm);
    });
  }

  // How supers work: styles, the six elements' skills and ultimates, and which pairs make
  // which combo. From the Team tab.
  supersHelp() {
    const els = Object.values(ELEMENTS), arch = Object.values(ARCHETYPES);
    const pair = (a, b) => COMBOS[pairKey(a, b)];
    audio.sfx('click');
    this.modal(`<h2>${t('How supers work')}</h2>
      <p style="margin:0;font-size:13.5px">${t('Every player has a position, a style and a super. The style is how they play: a trait that\'s always on, and their middle perk choice. The super comes from their element: a skill on U, an ultimate on I when the meter is full, and the first and last perk choices.')}</p>
      <div class="label" style="margin:10px 0 4px">${t('Styles')}</div>
      <div class="help-grid">${arch.map((a) => `<div>${smallIcon('icons/arch_' + a.id)}<b>${esc(t(a.name))}</b><span>${esc(t(a.trait))}</span></div>`).join('')}</div>
      <div class="label" style="margin:10px 0 4px">${t('Supers')}</div>
      <div class="help-grid supers">${els.map((e) => `<div style="--el:${e.color}"><b class="el">${smallIcon(e.icon)}${esc(t(e.name))}</b>
        <span><b>${esc(t(e.skill.name))}</b> ${esc(t(e.skill.text))}</span><span><b>${esc(t(e.ult.name))}</b> ${esc(t(e.ult.text))}</span></div>`).join('')}</div>
      <div class="label" style="margin:10px 0 4px">${t('Combos')}</div>
      <p class="muted" style="margin:0 0 6px;font-size:12.5px">${t('Two players with chemistry fire a combo when one passes and the other shoots right away. Which combo depends on their two elements.')}</p>
      <div class="car-wrap"><table class="car-table combo-table"><thead><tr><th></th>${els.map((e) => `<th style="color:${e.color}">${esc(t(e.name))}</th>`).join('')}</tr></thead>
        <tbody>${els.map((a) => `<tr><td style="color:${a.color};text-align:left">${esc(t(a.name))}</td>${els.map((b) => `<td>${a === b ? '–' : esc(t(pair(a.id, b.id).name))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">${t('Change a player\'s super or style once a season at the training camp: Change… on their Team card.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Done')}</button></div>`);
  }

  // Goalie camp: a new goaltending style, once a season. The first tap arms a choice, the second pays.
  async goalieCamp(gid) {
    await Assets.loadGroup('hub').catch(() => {}); // (Brekka)
    const s = this.app.save, name = goalieInfo(gid).name, cur = goalieStyle(s, gid);
    const open = goalieCampOpen(s, gid), price = GOALIE_CAMP.price, afford = s.coins >= price;
    const who = Assets.atlas.frames['hub_fullbody/coach/whistle'] && Assets.groupReady('hub') && Assets.spriteSet(['hub_fullbody/coach/whistle'], 200);
    const note = !open ? t('Already changed this season.') : !afford ? t('Not enough coins.') : '';
    audio.sfx('click');
    this.modal(`<h2>${t('{name}: goalie camp', { name: esc(name) })}</h2>
      <p class="muted" style="margin:0;font-size:13px">${t('A week with Brekka and the shooters: a new way to play the net. Once a season.')}</p>
      <div class="label camp-head" style="margin:10px 0 4px">${who ? `<img class="camp-npc" src="${who.urls[0]}" alt="">` : ''}<span>${t('Goaltending style')} · <img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="14" height="14"> ${price}${note ? ` <span class="muted" style="text-transform:none;letter-spacing:0">${note}</span>` : ''}</span></div>
      <div class="camp-grid">${Object.values(GOALIE_STYLES).map((st) => `<button class="camp-choice${st.id === cur ? ' cur' : ''}" data-gstyle="${st.id}" ${st.id === cur || !open || !afford ? 'disabled' : ''}>
        ${goalieStyleIcon(st.id, 80).replace('<img ', '<img class="camp-ico" ')}<b>${esc(t(st.name))}${st.id === cur ? ` <small>${t('now')}</small>` : ''}</b><span>${esc(t(st.text))}</span></button>`).join('')}</div>
      <p class="muted" id="gcamp-msg" style="min-height:1.2em;font-size:12.5px;margin:6px 0 0"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Done')}</button></div>`, (mm, close) => {
      let armed = null;
      this.click('[data-gstyle]', (el) => {
        if (armed !== el) {
          mm.querySelectorAll('.camp-choice.armed').forEach((b) => b.classList.remove('armed'));
          armed = el; el.classList.add('armed'); audio.sfx('click');
          mm.querySelector('#gcamp-msg').textContent = t('Tap again to pay {n} coins.', { n: price });
          return;
        }
        if (!goalieCampChange(s, gid, el.dataset.gstyle)) return;
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        this.hub('team');
        this.toastNote(t('{name} now plays {what}.', { name, what: t(GOALIE_STYLES[el.dataset.gstyle].name) }));
      }, mm);
    });
  }

  toastNote(text) { this.app.toast(Assets.icon(Assets.atlas.npcs && Assets.atlas.npcs.coach, 72) || '', t('Training camp'), text, ''); }

  // A trade for a rival's player: pick one of yours to send; the rival tops up with nothing,
  // you top up with coins if your player is worth less than their price. Two taps to confirm.
  tradeOffer(key) {
    const s = this.app.save, r = RECRUITS[key], team = TEAMS[r.team];
    const likes = (TEAM_LIKES[r.team] || []).map((a) => t(ARCHETYPES[a].name)).join(t(' and '));
    const rows = tradeable(s).map((id) => {
      const m = member(id), q = tradeQuote(s, id, key), ok = s.coins >= q.coins;
      return `<button class="trade-row" data-give="${id}" ${ok ? '' : 'disabled'}>
        <img src="${portrait(id, 0, null, 64)}" alt=""><span class="tr-who"><b>${esc(m.name)}</b><small>${t(ROLE_NAME[m.role])} · ${t('LV {n}', { n: s.roster[id].level })} · ${esc(t(ARCHETYPES[m.def.arch].name))}${q.likes ? ` <span class="gold-t">★</span>` : ''}</small></span>
        <span class="tr-cost">${q.coins ? `+ <img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="14" height="14"> ${q.coins}` : t('Even swap')}</span></button>`;
    }).join('');
    audio.sfx('click');
    this.modal(`<h2>${t('Trade for {name}', { name: esc(r.name) })}</h2>
      <div class="card-head" style="margin:0"><img src="${portrait(r.kit, 1, r.team, 152)}" alt="" style="width:64px;height:64px">
        <div><div class="sub">${esc(team.name)} · ${t(ROLE_NAME[r.role])} · ${t('price {n}', { n: recruitPrice(s, key) })}</div><div class="style-row">${styleChips(member(key).def)}</div></div></div>
      <p class="muted" style="margin:6px 0;font-size:12.5px">${t('Send one of your signings or drafted rookies. The {team} like {styles} (★): they count those for a quarter more. Whoever you send joins their reserves.', { team: esc(team.name), styles: likes })}</p>
      <div class="trade-list">${rows || `<p class="muted">${t('You need a signing or a drafted rookie to trade.')}</p>`}</div>
      <p class="muted" id="tr-msg" style="min-height:1.2em;font-size:12.5px;margin:4px 0 0"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not now')}</button></div>`, (mm, close) => {
      let armed = null;
      this.click('[data-give]', (el) => {
        const give = el.dataset.give;
        if (armed !== el) {
          mm.querySelectorAll('.trade-row.armed').forEach((b) => b.classList.remove('armed'));
          armed = el; el.classList.add('armed'); audio.sfx('click');
          mm.querySelector('#tr-msg').textContent = t('Tap again to send {name} to the {team}.', { name: member(give).name, team: team.name });
          return;
        }
        const name = member(give).name;
        const done = trade(s, give, key);
        if (!done) return;
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s)).then(() => {
          this.hub('team');
          this.modal(`<h2>${t('{name} signs!', { name: esc(r.name) })}</h2>
            <p>${t('{name} heads to the {team}.', { name: esc(name), team: esc(team.name) })} ${t('Dress {name} at {role} from the Team tab, or before a match.', { name: esc(r.name), role: t(ROLE_NAME[r.role]).toLowerCase() })}</p>
            <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Later')}</button><button class="btn gold" id="dress-now">${t('Dress now')}</button></div>`, (m2, close2) => {
            this.click('#dress-now', () => { setLineup(s, key); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
          });
        });
      }, mm);
    });
  }

  // A rival rings after a match with an offer: one of yours for one of theirs, coins either way.
  rivalCall(o, done) {
    const s = this.app.save, team = TEAMS[o.team], r = RECRUITS[o.get], m = member(o.give), name = m.name;
    const coin = (n) => `<img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="14" height="14"> ${n}`;
    const terms = o.coins > 0 ? t('You add {coins}.', { coins: coin(o.coins) }) : o.coins < 0 ? t('They add {coins}.', { coins: coin(-o.coins) }) : t('Straight up, no coins.');
    audio.sfx('blip');
    this.modal(`<div class="label">${btnIcon('icons/trade')}${t('Trade offer')}</div>
      <h2>${t('The {team} are calling', { team: esc(team.name) })}</h2>
      <div class="trade-call">
        <div><img src="${portrait(o.give, 0, null, 152)}" alt=""><b>${esc(name)}</b><small>${t(ROLE_NAME[m.role])} · ${t('LV {n}', { n: s.roster[o.give].level })}</small></div>
        <span class="tc-arrow" aria-hidden="true">⇄</span>
        <div><img src="${portrait(r.kit, 1, r.team, 152)}" alt=""><b>${esc(r.name)}</b><small>${t(ROLE_NAME[r.role])} · ${esc(t(ARCHETYPES[member(o.get).def.arch].name))}</small></div>
      </div>
      <p style="margin:6px 0">${o.likes ? t('“We like how {name} plays. {name} for {theirs}?”', { name: esc(name), theirs: esc(r.name) }) : t('“{name} for {theirs}. Think it over.”', { name: esc(name), theirs: esc(r.name) })} ${terms}</p>
      <p class="muted" style="margin:0;font-size:12.5px">${t('{name} would join their reserves. The offer goes when you leave this screen.', { name: esc(name) })}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('No thanks')}</button>
        <button class="btn gold" id="call-yes" ${s.coins >= o.coins ? '' : 'disabled'}>${t('Accept')}</button></div>`, (mm, close) => {
      this.click('#call-yes', () => {
        if (!acceptOffer(s, o)) return;
        this.app.ach.unlock('dealmaker');
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s));
      }, mm);
    }, false, done);
  }

  // Quick line-up change, one row per position.
  lineupPicker(done) {
    const s = this.app.save;
    const ids = rosterIds(s);
    audio.sfx('click');
    const render = () => ['C', 'W', 'D'].map((role) => `
      <div class="label" style="font-size:14px;margin:8px 0 4px">${t(ROLE_NAME[role])}</div>
      <div class="filters" style="margin:0">${ids.filter((id) => member(id).role === role).map((id) => `
        <button class="chip" data-line="${id}" aria-pressed="${s.lineup[role] === id}" style="display:inline-flex;gap:6px;align-items:center">
          <img src="${portrait(id, 0, null, 64)}" width="24" height="24" alt="">${esc(member(id).name)} <span class="muted">${t('LV {n}', { n: s.roster[id].level })}</span></button>`).join('')}</div>`).join('');
    this.modal(`<h2>${t('Line-up')}</h2><div id="lp">${render()}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn gold" data-close>${t('Done')}</button></div>`, (m) => {
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-line]');
        if (!b) return;
        setLineup(s, b.dataset.line);
        writeSave(s);
        audio.sfx('click');
        m.querySelector('#lp').innerHTML = render();
      });
    }, true, () => done && done());
  }

  perkChoice(id, done) {
    const s = this.app.save;
    const r = s.roster[id];
    const m = member(id);
    const c = { ...m.def, name: m.name };
    if (r.pendingPerk === null) return done?.();
    const opts = c.perks[r.pendingPerk];
    audio.sfx('click');
    this.modal(`
      <h2>${t('{name}: choose a perk', { name: esc(c.name) })}</h2>
      <p class="muted">${t('Level {n} perk. You keep this choice for good.', { n: PERK_LEVEL_LABEL(r.pendingPerk) })}</p>
      <div class="choice">${opts.map((p, i) => `<button class="btn ghost" data-pick="${i}"><b>${esc(t(p).split(':')[0])}</b>${esc(cap((t(p).split(':')[1] || '').trim()))}</button>`).join('')}</div>`,
    (m, close) => {
      this.click('[data-pick]', (el) => {
        r.perks.push(opts[+el.dataset.pick]);
        r.pendingPerk = null;
        writeSave(s);
        audio.sfx('confirm');
        close();
        done?.();
      }, m);
    }, false);
  }

  gearPicker(id, slot) {
    const s = this.app.save;
    const items = GEAR.filter((g) => g.slot === slot && s.owned.includes(g.id));
    const gid = slot === 'goalie' ? (id === 'goalie' ? 'halla' : id) : null;
    const cur = gid ? goalieRec(s, gid).gear : s.roster[id].gear[slot];
    const who = gid ? goalieInfo(gid).name : member(id).name;
    audio.sfx('click');
    this.modal(`
      <h2>${esc(who)} · ${t(SLOT_NAMES[slot])}</h2>
      <div class="choice">${items.map((g) => `
        <button class="btn ${g.id === cur ? 'cream' : 'ghost'}" data-eq="${g.id}" style="display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center">
          <img src="${ico(g.icon, 92)}" alt="" width="52" height="52">
          <span><b>${esc(t(g.name))}${g.id === cur ? ` ${t('(equipped)')}` : ''}</b>${modsHtml(g.mods)}${lookHtml(g.id)}</span>
        </button>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:12.5px">${t('Buy more gear in the shop. Owned gear can be shared by the whole team.')}</p>
      <button class="btn small ghost" data-close>${t('Done')}</button>`, (m, close) => {
      this.click('[data-eq]', (el) => {
        if (gid) goalieRec(s, gid).gear = el.dataset.eq; else s.roster[id].gear[slot] = el.dataset.eq;
        writeSave(s);
        audio.sfx('confirm');
        close();
        this.hub(this.tab);
      }, m);
    });
  }

  tabShop(body) {
    const s = this.app.save;
    const filter = this.shopFilter || 'all';
    const items = GEAR.filter((g) => g.price > 0 && (filter === 'all' || g.slot === filter));
    body.innerHTML = `
      <div class="filters">${['all', 'stick', 'skates', 'armor', 'goalie'].map((f) => `<button class="chip" data-f="${f}" aria-pressed="${filter === f}">${f === 'all' ? t('All') : t(SLOT_NAMES[f])}</button>`).join('')}</div>
      ${npc('shopkeeper', s.coins < 150 ? pick([t('Short on coins? Win a few and come back. I\'ll keep it polished.'), t('Browsing is free. Buying is not.')]) : pick([t('Every piece trades something away. Ask what it costs you, not just the coins.'), t('Forged it myself. Well, most of it.'), t('That stick? Lightning in a bottle. Mind the recoil.')]))}
      <p class="muted" style="margin:0 0 10px;font-size:13px">${t('Every item trades something away. Bought gear unlocks for the whole team; equip it from the Team tab.')}</p>
      <div class="shop">${items.map((g) => {
        const owned = s.owned.includes(g.id);
        const price = Math.round(g.price * (1 - (s.discount || 0)));
        const afford = s.coins >= price;
        return `<div class="item" tabindex="0" data-card="${g.id}" data-pad-press="[data-buy]" aria-label="${esc(t(g.name))}">
          <img src="${ico(g.icon, 128)}" alt="">
          <div style="min-width:0">
            <div class="label" style="font-size:13px">${t(SLOT_NAMES[g.slot])}</div>
            <h4>${esc(t(g.name))}</h4>
            <p>${esc(t(g.text))}</p>
            ${modsHtml(g.mods)}${lookHtml(g.id)}
            <div class="buy">${owned ? ownedStamp()
              : `<span class="price">${price}${s.discount ? ` <s class="muted" style="font-size:14px">${g.price}</s>` : ''}</span>
                 <button class="btn small ${afford ? 'gold' : ''}" data-buy="${g.id}" ${afford ? '' : 'disabled'}>${t('Buy')}</button>`}</div>
          </div>
        </div>`;
      }).join('')}</div>`;
    this.click('[data-f]', (el) => { this.shopFilter = el.dataset.f; audio.sfx('click'); this.tabShop(body); }, body);
    this.click('[data-buy]', (el) => {
      const g = GEAR_BY_ID[el.dataset.buy];
      const price = Math.round(g.price * (1 - (s.discount || 0)));
      if (s.coins < price || s.owned.includes(g.id)) return;
      s.coins -= price;
      s.discount = 0;
      this.app.ach.checkMeta();
      s.owned.push(g.id);
      writeSave(s);
      audio.sfx('purchase');
      // offer to equip right away
      if (g.slot === 'goalie') { goalieRec(s, starterId(s)).gear = g.id; writeSave(s); this.hub('shop'); return; } // on whoever starts
      this.modal(`
        <h2>${t('{item} unlocked', { item: esc(t(g.name)) })}</h2>
        ${modsHtml(g.mods)}
        <p class="muted">${t('Equip it on someone now?')}</p>
        <div class="row">${rosterIds(s).map((id) => `<button class="btn ghost small" data-who="${id}" style="display:flex;gap:6px;align-items:center"><img src="${portrait(id, 0, null, 64)}" width="32" height="32" alt="">${esc(member(id).name)}</button>`).join('')}</div>
        <button class="btn small ghost" data-close>${t('Later')}</button>`, (m, close) => {
        this.click('[data-who]', (b) => { s.roster[b.dataset.who].gear[g.slot] = g.id; writeSave(s); audio.sfx('equip'); close(); this.hub('shop'); }, m);
      }, true, () => this.hub('shop'));
    }, body);
  }

  tabTraining(body) {
    const s = this.app.save;
    const tr = s.training;
    this.drillChar = this.drillChar || 'thunder';
    const pips = (n) => Array.from({ length: 2 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    body.innerHTML = `
      ${npc('coach', tr.sessions ? pick([t('Cone Weave builds legs, Sniper builds hands. Pick one and sweat.'), t('Gold medals don\'t come from watching. Lace up.'), t('Keep-Away is where chemistry starts. Move the puck!')]) : t('No rewarded sessions left. Play a match, then come back and work.'))}
      <div class="train-top">
        <div><div class="label">${t('Training rink')}</div>
          <p style="margin:2px 0 0;font-size:13px">${t('Play drills to earn EXP for the skater you bring. Rewarded sessions refill after every match; practice is always free.')}</p></div>
        <div class="sessions"><span class="pips3">${pips(tr.sessions)}</span> ${t(tr.sessions === 1 ? '{n} rewarded session left' : '{n} rewarded sessions left', { n: tr.sessions })}</div>
      </div>
      <div class="row" style="margin:10px 0">
        <span class="label" style="font-size:15px">${t('Skater:')}</span>
        ${rosterIds(s).map((id) => `<button class="btn small ${this.drillChar === id ? 'cream' : 'ghost'}" data-char="${id}" style="display:flex;gap:6px;align-items:center"><img src="${portrait(id, 0, null, 64)}" width="28" height="28" alt="">${esc(member(id).name)}</button>`).join('')}
      </div>
      <div class="drills">${Object.values(DRILLS).map((d) => {
        const best = tr.best[d.id];
        const medal = tr.medals[d.id] || 0;
        return `<div class="card drill">
          <div class="card-head"><img src="${ico(d.icon, 128)}" alt="" style="border:0;background:none">
            <div style="min-width:0"><h3>${esc(t(d.name))}</h3><div class="sub">${t('Trains {skill}', { skill: esc(t(d.trains)) })}</div>
              <div class="medal-row">${[1, 2, 3].map((mi) => `<span class="medal ${mi <= medal ? 'got' : ''}" style="--m:${MEDAL_COLORS[mi]}" title="${t(MEDAL_NAMES[mi])}: ${formatScore(d, d.medals[mi - 1])}">${badge(MEDAL_BADGES[mi <= medal ? mi : 0], 44, 'medal-ico')}${formatScore(d, d.medals[mi - 1])}</span>`).join('')}</div>
            </div></div>
          <p class="muted" style="margin:0;font-size:13px">${esc(t(d.text))}</p>
          ${CHALLENGE_BOARDS.includes(d.id) ? this.ghostPicker(s, d.id) : ''}
          <div class="row" style="justify-content:space-between">
            <span style="font-size:13px">${t('Best: {score}', { score: `<b class="gold-t">${best === undefined || best === null ? '–' : formatScore(d, best)}</b>` })}</span>
            <span class="row" style="gap:6px"><button class="btn small ghost" data-lb="${d.id}" title="${t('Online leaderboard')}" aria-label="${t('{drill} online leaderboard', { drill: esc(t(d.name)) })}">${badge('cup_small', 48, 'btn-ico', '🏆')}</button>
            <button class="btn small ${tr.sessions > 0 ? 'gold' : ''}" data-play="${d.id}">${tr.sessions > 0 ? t('Train') : t('Practice')}</button></span>
          </div>
        </div>`;
      }).join('')}</div>`;
    this.click('[data-char]', (el) => { this.drillChar = el.dataset.char; audio.sfx('click'); this.tabTraining(body); }, body);
    this.click('[data-play]', (el) => {
      if (CHALLENGE_BOARDS.includes(el.dataset.play)) return this.startGhostDrill(el.dataset.play, el, body);
      audio.sfx('confirm'); this.app.startDrill(el.dataset.play, this.drillChar);
    }, body);
    this.click('[data-ghost]', (el) => { (s.settings.ghosts ||= {})[el.dataset.drill] = el.dataset.ghost; writeSave(s); audio.sfx('click'); this.tabTraining(body); }, body);
    this.click('[data-lb]', (el) => { audio.sfx('click'); this.leaderboard(el.dataset.lb); }, body);
  }

  // A drill's ghost (Cone Weave, Breakaway): none, your best run, this week's best, or a
  // friends board's best.
  ghostChoice(s, id) {
    const pick = (s.settings.ghosts && s.settings.ghosts[id]) || (id === 'cones' && s.settings.ghost) || 'off';
    const online = onlineOn(s) && configured();
    if (pick === 'mine') return s.ghosts && s.ghosts[id] ? pick : 'off';
    if (pick === 'week') return online ? pick : 'off';
    if (pick.startsWith('g:')) return online && groupsOf(s).some((g) => 'g:' + g.code === pick) ? pick : 'off';
    return 'off';
  }

  ghostPicker(s, id) {
    const pick = this.ghostChoice(s, id);
    const mine = s.ghosts && s.ghosts[id];
    const opts = [['off', t('Off')], ...(mine ? [['mine', `${t('Your best')} ${formatScore(DRILLS[id], mine.score)}`]] : []),
      ...(onlineOn(s) && configured() ? [['week', t('Week\'s best')], ...groupsOf(s).map((g) => ['g:' + g.code, g.name])] : [])];
    return `<div class="ghost-row"><span class="label">${smallIcon('icons/ghost')}${t('Ghost')}</span>${opts.map(([v, label]) => `<button class="chip" data-drill="${id}" data-ghost="${v}" aria-pressed="${v === pick}">${esc(label)}</button>`).join('')}</div>
      <p class="muted ghost-msg" id="ghost-msg-${id}"></p>`;
  }

  // Start a ghost drill, fetching the ghost to race first when it's someone else's.
  async startGhostDrill(id, btn, body) {
    const s = this.app.save, pick = this.ghostChoice(s, id);
    let ghost = null;
    if (pick === 'mine') ghost = { ...s.ghosts[id], label: t('Your best'), mine: true };
    else if (pick !== 'off') {
      const label = btn.textContent;
      btn.textContent = t('Looking…');
      const g = await fetchGhost(s, id, 'week', pick.startsWith('g:') ? pick.slice(2) : null).catch(() => undefined);
      btn.textContent = label;
      const msg = body.querySelector('#ghost-msg-' + id);
      if (!g) { audio.sfx('deny'); if (msg) msg.textContent = g === null ? t('No run to race on that board yet. Set one!') : t('Couldn\'t reach the server. Try again in a moment.'); return; }
      ghost = { ...g, label: g.name };
    }
    audio.sfx('confirm');
    this.app.startDrill(id, this.drillChar, ghost ? { ghost } : {});
  }

  // A friend's challenge from a #race= link: their run, raced as a ghost with a skater you pick.
  challengeInvite(code) {
    const s = this.app.save;
    this.modal(`<h2>${smallIcon('icons/challenge', 96, 'h-ico')}${t('Challenge')}</h2><div id="ch-body"><p class="muted">${t('Looking…')}</p></div>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Not now')}</button><button class="btn gold" id="ch-go" disabled>${t('Race')}</button></div>`, (m, close) => {
      fetchChallenge(code).then((c) => {
        const d = DRILLS[c.board];
        let who = this.drillChar || lineupIds(s)[0];
        const body = m.querySelector('#ch-body');
        const draw = () => {
          body.innerHTML = `<p>${t('{name} challenges you to {drill}: {score}. Their ghost skates beside you; beat it.', { name: `<b>${esc(c.name)}</b>`, drill: esc(t(d.name)), score: `<b class="gold-t">${esc(formatScore(d, c.score))}</b>` })}</p>
            <div class="row" style="gap:6px;flex-wrap:wrap"><span class="label" style="font-size:14px">${t('Skater:')}</span>${rosterIds(s).map((id) => `<button class="btn small ${who === id ? 'cream' : 'ghost'}" data-chr="${id}">${esc(member(id).name)}</button>`).join('')}</div>`;
          this.click('[data-chr]', (el) => { who = el.dataset.chr; audio.sfx('click'); draw(); }, body);
        };
        draw();
        const go = m.querySelector('#ch-go');
        go.disabled = false;
        this.click('#ch-go', () => { audio.sfx('confirm'); close(); this.drillChar = who; this.app.startDrill(c.board, who, { ghost: { ...c, label: c.name } }); }, m);
      }).catch((e) => { const b = m.querySelector('#ch-body'); if (b) b.innerHTML = `<p class="muted">${esc(e.message)}</p>`; });
    });
  }

  // An online leaderboard: the top 25, with you highlighted and your rank.
  // The online boards. The drill boards open on this week's (it remembers your pick).
  leaderboard(board, period = this.lbPeriod || 'week') {
    const s = this.app.save;
    const info = BOARD_INFO[board];
    if (!info.weekly) period = 'all';
    const st = onlineState(s);
    const myTag = tagOf(st.id);
    const tabs = Object.entries(BOARD_INFO).map(([id, b]) => `<button class="chip" data-lbt="${id}" aria-pressed="${id === board}">${esc(t(b.name))}</button>`).join('');
    const periods = info.weekly ? `<div class="filters" style="margin:0 0 8px">${[['week', t('This week')], ['all', t('All time')]].map(([p, label]) => `<button class="chip" data-lbp="${p}" aria-pressed="${p === period}">${label}</button>`).join('')}</div>` : '';
    // everyone, or one of your friends boards
    const groups = groupsOf(s);
    if (!groups.some((g) => g.code === this.lbGroup)) this.lbGroup = null;
    const group = this.lbGroup;
    const scope = onlineOn(s) && configured() ? `<div class="filters" style="margin:0 0 8px">${[[null, t('Everyone')], ...groups.map((g) => [g.code, g.name])].map(([code, label]) => `<button class="chip" data-lbg="${code || ''}" aria-pressed="${code === group}">${esc(label)}</button>`).join('')}<button class="btn small ghost" id="lb-friends">${btnIcon('icons/friends')} ${t('Friends boards')}</button></div>` : '';
    const queued = st.pending[board];
    const note = (t) => `<p class="muted" style="font-size:13px">${t}</p>`;
    this.modal(`
      <h2>${t('Online leaderboards')}</h2>
      <div class="jukebox" style="margin:4px 0 10px">${tabs}</div>
      ${scope}${periods}
      <div id="lb-body">${!onlineOn(s) ? note(t('Online leaderboards are off in Settings.'))
        : !configured() ? note(queued ? t('The online leaderboards open soon. Your best scores are saved ({score} here) and will be posted when they do.', { score: esc(info.fmt(queued.score)) }) : t('The online leaderboards open soon. Your best scores are saved and will be posted when they do.'))
        : `<p class="muted">${t('Loading…')}</p>`}</div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">${t('You appear as {name}. Rename the club in Team › Club.', { name: `<b>${esc(CLUB.name)}</b> <span class="lb-tag">#${myTag}</span>` })}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Close')}</button></div>`, (m, close) => {
      this.click('[data-lbt]', (el) => { audio.sfx('click'); close(); this.leaderboard(el.dataset.lbt); }, m);
      this.click('[data-lbp]', (el) => { audio.sfx('click'); this.lbPeriod = el.dataset.lbp; close(); this.leaderboard(board, el.dataset.lbp); }, m);
      this.click('[data-lbg]', (el) => { audio.sfx('click'); this.lbGroup = el.dataset.lbg || null; close(); this.leaderboard(board, period); }, m);
      this.click('#lb-friends', () => { audio.sfx('click'); close(); this.friendsBoards('', () => this.leaderboard(board, period)); }, m);
      if (!onlineOn(s) || !configured()) return;
      fetchBoard(s, board, period, group).then((r) => {
        const out = m.querySelector('#lb-body');
        if (!out) return;
        const rows = r.top.map((row, i) => {
          const me = row.tag === myTag && row.name === CLUB.name;
          const who = row.char && member(row.char) ? ` <span class="muted">· ${esc(member(row.char).name)}</span>` : '';
          return `<div class="lb-row ${me ? 'me' : ''}"><span class="lb-rank">${i < 3 ? badge('rank_' + (i + 1), 56, 'rank-ico') : ''}<i>${i + 1}</i></span><span class="lb-name">${esc(row.name)} <span class="lb-tag">#${esc(row.tag)}</span>${who}</span><b>${esc(info.fmt(row.score))}</b></div>`;
        }).join('');
        const mine = r.me ? `<div class="lb-me">${t(r.week ? 'You this week: {rank} of {total} · best {score}' : 'You: {rank} of {total} · best {score}', { rank: `<b>#${r.me.rank}</b>`, total: r.total, score: esc(info.fmt(r.me.score)) })}</div>`
          : `<div class="lb-me muted">${r.total ? t('{n} on the board.', { n: r.total }) : r.week ? t('Nobody yet this week.') : t('Nobody yet.')} ${t('Play {board} to get on it.', { board: esc(t(info.name)) })}</div>`;
        const solo = group && r.total < 2 ? `<p class="muted" style="font-size:12px;margin:6px 0 0">${t('Share the code {code} so friends can join this board.', { code: `<b>${esc(group)}</b>` })}</p>` : '';
        const reset = r.week && r.resetsAt ? `<p class="muted" style="font-size:12px;margin:6px 0 0">${t('The weekly board starts again in {time} (Monday, 00:00 UTC).', { time: resetsIn(r.resetsAt) })}</p>` : '';
        out.innerHTML = `${mine}<div class="lb-list">${rows || ''}</div>${reset}${solo}`;
      }).catch(() => {
        const out = m.querySelector('#lb-body');
        if (out) out.innerHTML = note(t('Couldn\'t reach the leaderboard. Your scores are saved and will be posted when you\'re back online.'));
      });
    });
  }

  // Friends boards: your groups (copy the code, invite, leave), make a new one or join by code.
  friendsBoards(prefill = '', back = null) {
    const s = this.app.save;
    const groups = groupsOf(s);
    const off = !onlineOn(s) ? t('Online leaderboards are off in Settings.') : !configured() ? t('Couldn\'t reach the server. Try again in a moment.') : '';
    const list = groups.length ? groups.map((g) => `<div class="lb-row fb-row"><span class="lb-name">${esc(g.name)} <span class="lb-tag">${esc(g.code)}</span></span>
        <span class="row" style="gap:6px;margin:0"><button class="btn small ghost" data-cup="${g.code}"><img class="btn-ico" src="${cupPlaceImg(1, 48)}" alt=""> ${t('Weekly Cup')}</button><button class="btn small ghost" data-invite="${g.code}">${btnIcon('icons/share')} ${navigator.share ? t('Invite') : t('Copy link')}</button><button class="btn small ghost" data-leave="${g.code}">${t('Leave')}</button></span></div>`).join('')
      : `<p class="muted" style="font-size:13px">${t('Not on any friends boards yet.')}</p>`;
    const full = groups.length >= MAX_GROUPS;
    this.modal(`
      <h2>${smallIcon('icons/friends', 96, 'h-ico')}${t('Friends boards')}</h2>
      <p style="font-size:13.5px">${t('A board for just you and your friends: the same drills, shootout wins and daily streaks, this week and all time. Make one and share its code, or join with a friend\'s code. You can be on up to {n}.', { n: MAX_GROUPS })}</p>
      <div class="lb-list">${list}</div>
      ${off ? `<p class="muted" style="font-size:13px">${off}</p>` : `
      <div class="fb-form">
        <input class="cloud-input" id="fb-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="7" placeholder="${t('Code')}" value="${esc(prefill)}" ${full ? 'disabled' : ''}>
        <button class="btn small ${prefill ? 'gold' : ''}" id="fb-join" ${full ? 'disabled' : ''}>${t('Join')}</button>
      </div>
      <div class="fb-form">
        <input class="cloud-input fb-name" id="fb-name" autocomplete="off" maxlength="24" placeholder="${t('Board name')}" ${full ? 'disabled' : ''}>
        <button class="btn small ${prefill ? '' : 'gold'}" id="fb-new" ${full ? 'disabled' : ''}>${t('Make a board')}</button>
      </div>`}
      <p class="muted" id="fb-msg" style="min-height:1.3em;font-size:13px">${full ? t('You\'re on {n} friends boards already. Leave one to make room.', { n: MAX_GROUPS }) : ''}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Back')}</button></div>`, (m, close) => {
      const msg = m.querySelector('#fb-msg');
      const reopen = (note) => { close(); this.friendsBoards('', back); const el = document.querySelector('#fb-msg'); if (el && note) el.textContent = note; };
      const busy = async (fn) => {
        msg.textContent = t('Looking…');
        try { const note = await fn(); writeSave(s); audio.sfx('confirm'); reopen(note); } catch (e) { msg.textContent = e.message; audio.sfx('deny'); }
      };
      this.click('#fb-join', () => busy(async () => { const g = await joinGroup(s, m.querySelector('#fb-code').value); this.lbGroup = g.code; return t('You\'re on {name}.', { name: g.name }); }), m);
      this.click('#fb-new', () => busy(async () => { const g = await createGroup(s, m.querySelector('#fb-name').value.trim() || t('Friends')); this.lbGroup = g.code; return t('{name} is ready. Share the code {code} with your friends.', { name: g.name, code: g.code }); }), m);
      this.click('[data-leave]', (el) => {
        const g = groups.find((x) => x.code === el.dataset.leave);
        busy(async () => { await leaveGroup(s, g.code); return t('You left {name}.', { name: g.name }); });
      }, m);
      this.click('[data-cup]', (el) => { audio.sfx('click'); close(); this.weeklyCup(el.dataset.cup, () => this.friendsBoards('', back)); }, m);
      this.click('[data-invite]', (el) => {
        const g = groups.find((x) => x.code === el.dataset.invite);
        const link = inviteLink(g.code), text = t('Join my Puckbound friends board, {name}: code {code}', { name: g.name, code: g.code });
        if (navigator.share) navigator.share({ title: t('Friends boards'), text, url: link }).catch(() => {});
        else navigator.clipboard?.writeText(`${text}\n${link}`).then(() => { msg.textContent = t('Copied!'); }, () => { msg.textContent = t('Copy failed'); });
      }, m);
    }, true, () => back && back());
  }

  // A friends board's Weekly Cup: this week's table so far (points, wins and the place on
  // each drill), and last week's top three on the podium.
  weeklyCup(code, back = null) {
    const s = this.app.save;
    const g = groupsOf(s).find((x) => x.code === code);
    const drills = ['cones', 'sniper', 'rondo', 'breakaway'];
    this.modal(`<h2><img class="h-ico" src="${cupPlaceImg(1, 96)}" alt="">${t('Weekly Cup')} · ${esc(g ? g.name : code)}</h2><div id="cup-body"><p class="muted">${t('Looking…')}</p></div>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Back')}</button></div>`, (m) => {
      const body = m.querySelector('#cup-body');
      fetchCup(s, code).then((r) => {
        const row = (x) => `<div class="lb-row cup-row ${x.me ? 'me' : ''}"><span class="lb-rank">${x.place <= 3 ? `<img src="${cupPlaceImg(x.place, 48)}" alt="${x.place}" width="22" height="22">` : x.place}</span>
          <span class="lb-name">${esc(x.name)} <span class="lb-tag">${esc(x.tag || '')}</span></span>
          <span class="cup-places">${drills.map((d) => `<span title="${esc(t(DRILLS[d].name))}"><img src="${ico(DRILLS[d].icon, 40)}" alt="">${x.places[d] || '–'}</span>`).join('')}</span>
          <b class="lb-score">${t('{n} pts', { n: x.points })}</b></div>`;
        const podium = r.last.standings.filter((x) => x.place <= 3);
        body.innerHTML = `
          <p style="font-size:13.5px;margin:0 0 8px">${t('Every drill this week counts: 5, 3 and 2 points for the top three on each board, 1 for taking part. Ends in {time}.', { time: resetsIn(r.resetsAt) })}</p>
          <div class="lb-list">${r.standings.length ? r.standings.map(row).join('') : `<p class="muted" style="font-size:13px">${t('No runs on this board yet this week. Play a drill to get on it.')}</p>`}</div>
          <div class="label" style="margin:12px 0 6px">${t('Last week')}</div>
          ${podium.length >= 2 ? podiumHtml([1, 0, 2].map((i) => podium[i]).filter(Boolean).map((x) => ({ place: x.place, me: x.me, html: `<img src="${cupPlaceImg(x.place, 96)}" alt=""><b>${esc(x.name)}</b><small>${t('{n} pts', { n: x.points })}</small>` })))
            : `<p class="muted" style="font-size:13px">${t('No cup last week: it takes at least two players.')}</p>`}`;
      }).catch(() => { body.innerHTML = `<p class="muted">${t('Couldn\'t reach the server. Try again in a moment.')}</p>`; });
    }, true, () => back && back());
  }

  // Result card after a drill: score, medal, rewards; Retry or Done.
  drillResult(d, score, rw, charId, onRetry, onDone) {
    const name = member(charId).name;
    const medal = rw.medal;
    const lines = [];
    if (rw.exp) lines.push([t('{name} +{n} EXP', { name, n: rw.exp }), '']);
    if (rw.coins - rw.bonus > 0) lines.push([t('Session coins'), `+${rw.coins - rw.bonus}`]);
    if (rw.bonus) lines.push([t('First {medal} medal', { medal: t(MEDAL_NAMES[medal]).toLowerCase() }), `+${rw.bonus}`]);
    if (!rw.rewarded && !rw.extra && !rw.skills) lines.push([t('Practice run (no sessions left)'), '']);
    if (rw.extra) lines.push(...rw.extra);
    const ups = rw.ups.length ? `<div class="lvlup">${t('{name} reached level {n}!', { name, n: rw.ups[rw.ups.length - 1].level })}</div>` : '';
    this.modal(`
      <div style="text-align:center">
        <div class="label">${esc(t(d.name))}</div>
        <div class="drill-score">${formatScore(d, score)}</div>
        ${badge(MEDAL_BADGES[medal], 192, 'medal-img')}
        <div class="medal-big" style="--m:${MEDAL_COLORS[medal]}">${t(MEDAL_NAMES[medal])}${rw.newBest && rw.prevBest !== undefined && rw.prevBest !== null ? ` · ${t('new best!')}` : ''}</div>
        <div class="muted" style="font-size:13px">${t('Bronze {bronze} · Silver {silver} · Gold {gold}', { bronze: formatScore(d, d.medals[0]), silver: formatScore(d, d.medals[1]), gold: formatScore(d, d.medals[2]) })}</div>
        ${rw.ghostVs ? `<div class="ghost-vs ${rw.ghostVs.won ? 'won' : ''}">${esc(rw.ghostVs.line)}</div>` : ''}
      </div>
      ${lines.length ? `<div class="reward-lines">${lines.map(([a, b]) => `<div><span>${esc(a)}</span><span class="gold-t">${b}</span></div>`).join('')}</div>` : ''}
      ${ups}
      <div class="lb-result muted" id="d-online"></div>
      ${rw.run && onlineOn(this.app.save) && configured() ? `<div class="row" style="justify-content:space-between;align-items:center"><span class="muted" id="d-ch-msg" style="font-size:12.5px"></span><button class="btn small ghost" id="d-challenge">${btnIcon('icons/challenge')} ${t('Challenge a friend')}</button></div>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="d-retry">${t('Retry')}</button><button class="btn gold" id="d-done">${t('Done')}</button></div>`, (m, close) => {
      this.click('#d-challenge', async (el) => {
        const msg = m.querySelector('#d-ch-msg');
        el.disabled = true; msg.textContent = t('Looking…');
        try {
          const code = await createChallenge(this.app.save, d.id, score, rw.run.char, rw.run.ghost);
          const link = challengeLink(code), text = t('Can you beat my {drill}? {score}', { drill: t(d.name), score: formatScore(d, score) });
          if (navigator.share) { msg.textContent = ''; await navigator.share({ title: t('Challenge'), text, url: link }).catch(() => {}); }
          else { await navigator.clipboard?.writeText(`${text}\n${link}`); msg.textContent = t('Link copied: send it to a friend.'); }
        } catch (e) { msg.textContent = e.message; }
        el.disabled = false;
      }, m);
      m.querySelector('#d-retry').addEventListener('click', () => { close(); audio.sfx('confirm'); onRetry(); });
      m.querySelector('#d-done').addEventListener('click', () => { close(); audio.sfx('click'); onDone(); });
    }, false);
    audio.jingle(medal >= 2 ? 'win' : medal === 1 ? 'level' : 'lose');
  }

  // --------------------------------------------------------------- modals
  modal(html, bind, dismissable = true, onClose) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal panel" role="dialog" aria-modal="true">${html}</div>`;
    document.getElementById('app').appendChild(bg);
    const close = () => { bg.remove(); onClose?.(); };
    bg.addEventListener('click', (e) => { if (e.target === bg && dismissable) close(); });
    bg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { audio.sfx('back'); close(); }));
    bind?.(bg.querySelector('.modal'), () => { bg.remove(); });
    return bg;
  }

  // Your backup code (and a link) for moving the save to another device.
  cloudCode() {
    const s = this.app.save;
    const code = formatCode(cloudState(s).token);
    const link = restoreLink(s);
    this.modal(`
      <h2>${t('Your backup code')}</h2>
      <p>${t('Enter this code on another device (Settings › Cloud save › Restore), or open the link there, to carry on where you left off.')}</p>
      <div class="cloud-code" id="cc-code">${esc(code)}</div>
      <p class="muted" style="font-size:12.5px">${t('Anyone with the code can load your progress, so keep it to yourself.')} ${configured() ? '' : t('Cloud backups start when the online features open; the code stays the same.')}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" id="cc-copy">${t('Copy code')}</button><button class="btn small ghost" id="cc-link">${btnIcon('icons/share')} <span>${navigator.share ? t('Share link') : t('Copy link')}</span></button><button class="btn small" data-close>${t('Done')}</button></div>`, (m) => {
      const done = (btn, text) => { const el = btn.querySelector('span') || btn; el.textContent = text; setTimeout(() => { el.textContent = btn.id === 'cc-copy' ? t('Copy code') : navigator.share ? t('Share link') : t('Copy link'); }, 1600); };
      this.click('#cc-copy', (el) => { navigator.clipboard?.writeText(code).then(() => done(el, t('Copied!')), () => done(el, t('Copy failed'))); }, m);
      this.click('#cc-link', (el) => {
        if (navigator.share) navigator.share({ title: t('Puckbound save'), url: link }).catch(() => {});
        else navigator.clipboard?.writeText(link).then(() => done(el, t('Copied!')), () => done(el, t('Copy failed')));
      }, m);
    });
  }

  // Load a backed-up save by its code, after showing what it holds.
  cloudRestore(prefill = '') {
    this.modal(`
      <h2>${t('Restore a save')}</h2>
      <p>${t('Type or paste the backup code from your other device.')}</p>
      <input class="cloud-input" id="cr-code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" value="${esc(prefill)}">
      <p class="muted" id="cr-msg" style="min-height:1.3em;font-size:13px"></p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Cancel')}</button><button class="btn small gold" id="cr-go">${t('Find save')}</button></div>`, (m, close) => {
      const msg = m.querySelector('#cr-msg');
      this.click('#cr-go', async () => {
        msg.textContent = t('Looking…');
        try {
          const { save, at } = await fetchCloudSave(m.querySelector('#cr-code').value);
          close();
          const club = (save.club && save.club.name) || 'Snowcrest Foxes';
          const when = new Date(at).toLocaleString();
          this.modal(`
            <h2>${t('Replace this device\'s progress?')}</h2>
            <p><b>${esc(club)}</b> · ${t('season {n}', { n: save.season || 1 })} · ${t('{n} matches played', { n: save.record ? save.record.played : 0 })} · ${t('{n} coins', { n: save.coins || 0 })}<br><span class="muted">${t('Backed up {when}', { when: esc(when) })}</span></p>
            <p class="muted" style="font-size:13px">${t('Everything on this device is replaced by that save. This can\'t be undone.')}</p>
            <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Keep this device\'s')}</button><button class="btn small gold" id="cr-yes">${t('Replace')}</button></div>`, (m2) => {
            this.click('#cr-yes', () => { writeSave(save); location.replace(location.pathname + location.search); }, m2);
          });
        } catch (e) { msg.textContent = e.message; }
      }, m);
    });
  }

  // Music room: play any track. The scene's music comes back on close.
  jukebox() {
    audio.unlock();
    const list = audio.tracks();
    const back = this.app.track;
    const arenaNames = new Set(Object.values(ARENAS).map((a) => a.name)); // (songs named after arenas keep the name)
    const mark = (m, id) => m.querySelectorAll('[data-track]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.track === id)));
    this.modal(`
      <h2>${t('Music room')}</h2>
      <p class="muted" style="margin-top:0">${t('Every track is played live by the game\'s chiptune engine.')}</p>
      <div class="jukebox">${list.map((tr) => `<button class="chip" data-track="${tr.id}" aria-pressed="false">${esc(arenaNames.has(tr.name) ? tr.name : t(tr.name))}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>${t('Close')}</button></div>`, (m) => {
      mark(m, audio.songName);
      this.click('[data-track]', (el) => { audio.play(el.dataset.track); mark(m, el.dataset.track); }, m);
    }, true, () => { if (back) audio.play(back); });
  }

  settings() {
    const s = this.app.save;
    const st = s.settings;
    const seg = (key, opts) => `<span class="seg">${opts.map(([v, label]) => `<button class="chip" data-set="${key}" data-v="${v}" aria-pressed="${String(st[key]) === String(v)}">${label}</button>`).join('')}</span>`;
    const row = (label, ctl, hint) => `<div class="toggle"><span>${label}${hint ? `<small class="muted" style="display:block;font-size:11.5px">${hint}</small>` : ''}</span>${ctl}</div>`;
    const onOff = (key) => seg(key, [[true, t('On')], [false, t('Off')]]);
    const body = () => `
      <h2>${t('Settings')}</h2>
      <div class="label">${t('Sound')}</div>
      ${row(t('Language'), seg('lang', [['en', 'English'], ['is', 'Íslenska']]))}
      ${row(t('Music'), seg('musicVol', VOLUMES()))}
      ${row(t('Sound effects'), seg('sfxVol', VOLUMES()))}
      ${row(t('Audio quality'), seg('audioQuality', [['auto', t('Auto')], ['full', t('Full')], ['light', t('Light')]]), t('Light leaves out the backing layers and crowd voices for slower phones. Auto picks it on low-memory devices.'))}
      ${row(t('Music room'), `<button class="btn small ghost" id="s-jukebox">${t('Listen')}</button>`, t('Every track in the game, from the title theme to the Cup Final.'))}
      <div class="label">${t('Gameplay')}</div>
      ${row(t('Rival difficulty'), seg('difficulty', [['easy', t('Easy')], ['normal', t('Normal')], ['hard', t('Hard')]]))}
      ${row(t('Aim assist'), seg('assist', [['off', t('Off')], ['normal', t('Normal')], ['strong', t('Strong')]]), t('Strong tightens your shots and widens pass catching. Off aims dead centre unless you steer.'))}
      ${row(t('Auto-sprint'), seg('autoSprint', [[false, t('Off')], [true, t('On')]]), t('Sprint whenever the stick is pushed all the way.'))}
      ${row(t('Game speed'), seg('speed', [['normal', t('Normal')], ['relaxed', t('Relaxed')]]), t('Relaxed plays matches at 85% speed. Drills stay at full speed.'))}
      ${row(t('Goal replays'), onOff('replays'))}
      ${row(t('Goal clips'), onOff('clips'), t('Record each replay as a short video you can share.'))}
      ${row(t('Online features'), onOff('online'), t('Leaderboards (your club name, a random tag and your best scores) and automatic cloud backups of your save. Nothing personal is sent.'))}
      ${row(t('Cloud save'), `<span class="row" style="gap:6px"><button class="btn small ghost" id="s-code">${t('Backup code')}</button><button class="btn small ghost" id="s-restore">${t('Restore')}</button></span>`, cloudStatus(s))}
      <div class="label">${t('Comfort')}</div>
      ${row(t('Screen shake'), seg('shake', [[1, t('Full')], [0.5, t('Low')], [0, t('Off')]]))}
      ${row(t('Flashes'), onOff('flashes'), t('Screen flashes and blinking goal lights.'))}
      ${row(t('Effects'), seg('particles', [['full', t('Full')], ['reduced', t('Reduced')]]), t('Fewer sparks, snow sprays and confetti.'))}
      <div class="label">${t('Visibility and controls')}</div>
      ${row(t('Team markers'), seg('markers', [['color', t('Colors')], ['shapes', t('Shapes')]]), t('Shapes: blue triangles for your team, orange diamonds for rivals.'))}
      ${row(t('Text size'), seg('textSize', [['normal', t('Normal')], ['large', t('Large')]]))}
      ${row(t('Touch buttons'), seg('touchSize', [['normal', t('Normal')], ['large', t('Large')], ['huge', t('Huge')]]))}
      ${row(t('Touch layout'), seg('lefty', [[false, t('Stick left')], [true, t('Stick right')]]))}
      ${row(t('Play offline'), `<span style="font-size:13px;text-align:right;max-width:30ch">${installHelp(this.app)}</span>`)}
      <div class="label">${t('Controls')}</div>
      ${controlsHtml(this.app.isTouch)}
      <div class="toggle"><span class="muted">${t('Erase the save and start over')}</span><button class="btn small ghost" id="s-reset">${t('Reset save')}</button></div>
      <button class="btn small" id="s-close">${t('Close')}</button>`;
    this.modal(body(), (m, close) => {
      const bind = () => {
        this.click('[data-set]', (el) => {
          const v = el.dataset.v;
          st[el.dataset.set] = v === 'true' ? true : v === 'false' ? false : Number.isNaN(+v) ? v : +v;
          if (el.dataset.set === 'musicVol') st.music = st.musicVol > 0;
          if (el.dataset.set === 'sfxVol') st.sfx = st.sfxVol > 0;
          writeSave(s);
          if (el.dataset.set === 'lang') { location.reload(); return; }
          audio.sfx('click');
          this.app.applySettings();
          const y = m.scrollTop;
          m.innerHTML = body(); bind(); m.scrollTop = y;
        }, m);
        this.click('#s-install', async () => { await this.app.install(); m.innerHTML = body(); bind(); }, m);
        this.click('#s-close', () => { audio.sfx('back'); close(); }, m);
        this.click('#s-jukebox', () => { audio.sfx('click'); this.jukebox(); }, m);
        this.click('#s-code', () => { audio.sfx('click'); this.cloudCode(); }, m);
        this.click('#s-restore', () => { audio.sfx('click'); this.cloudRestore(); }, m);
        this.click('#s-reset', (el) => {
          if (el.dataset.armed) { clearSave(); close(); this.app.resetSave(); return; }
          el.dataset.armed = '1'; el.textContent = t('Tap again to erase'); el.classList.add('gold');
        }, m);
      };
      bind();
    });
  }

  // -------------------------------------------------------------- dialogue
  // lines: [side ('us'|'them'), charId, text]
  // (scene.bg: a painting behind the scene, like the legends' reveal)
  dialogue(lines, teamId, header, onDone, mood = null, scene = null) {
    lines = lines.map((l) => [l[0], l[1], clubText(t(l[2]))]);
    const tm = teamInfo(teamId);
    let i = 0, typing = null, shown = 0;
    const ours = (l) => portrait(l[1], 0, null, 420, expression('us', l[2], mood));
    const gone = (id) => TEAMS[teamId] && TEAMS[teamId].names && vacated(this.app.save, teamId, id); // (signed, traded or retired)
    const theirs = (l) => portrait(gone(l[1]) ? 'sub_' + l[1] : l[1], 1, teamId, 420, expression('them', l[2], mood));
    const kip = Assets.atlas.npcs && Assets.atlas.npcs.announcer ? Assets.icon(Assets.atlas.npcs.announcer, 420) : ''; // Kip Vance calls the big games
    const r = this.set(`
      ${scene && scene.bg ? `<div class="dlg-scene" style="background-image:url(${scene.bg})"></div>` : ''}<div class="dim${scene && scene.bg ? ' light' : ''}"></div>
      <div class="dlg" id="dlg">
        <button class="btn small ghost dlg-skip" id="dlg-skip">${t('Skip')}</button>
        ${header ? `<div class="dlg-head"><div class="vs">${esc(CLUB.nick)}<em>${t('vs')}</em>${esc(tm.nick || tm.name.split(' ').slice(-1)[0])}</div>${header.sub ? `<div class="twist">${esc(header.sub)}</div>` : ''}</div>` : ''}
        <div class="portraits"><img id="pl" alt=""><img id="pr" class="them" alt=""></div>
        <div class="dlg-box panel"><div class="dlg-name" id="dn"></div><div class="dlg-text" id="dt"></div><div class="dlg-more">▼</div></div>
      </div>`);
    const pl = r.querySelector('#pl'), pr = r.querySelector('#pr'), dn = r.querySelector('#dn'), dt = r.querySelector('#dt');
    const show = () => {
      const [side, id, text] = lines[i];
      const us = side === 'us' || side === 'kip';
      const lastUs = [...lines.slice(0, i + 1)].reverse().find((l) => l[0] === 'us');
      const lastThem = [...lines.slice(0, i + 1)].reverse().find((l) => l[0] === 'them') || lines.find((l) => l[0] === 'them');
      pl.src = side === 'kip' && kip ? kip : ours(lastUs || ['us', 'frost', '']);
      if (lastThem) { pr.src = theirs(lastThem); pr.hidden = false; } else pr.hidden = true;
      pl.classList.toggle('on', us); pr.classList.toggle('on', !us);
      dn.textContent = side === 'kip' ? t(NPC_NAMES.announcer) : us ? member(id)?.name || GOALIE.name : gone(id) ? rivalSub(this.app.save, teamId, id).name : tm.names[id];
      dn.className = 'dlg-name' + (us ? '' : ' them');
      shown = 0; dt.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => {
        shown += 2;
        dt.textContent = text.slice(0, shown);
        if (shown % 4 === 0) audio.sfx('blip', { pitch: voicePitch(us ? member(id)?.def?.id || 'goalie' : id, us), them: !us });
        if (shown >= text.length) { clearInterval(typing); typing = null; }
      }, 22);
    };
    const openedAt = performance.now();
    const advance = () => {
      if (performance.now() - openedAt < 350) return; // ignore the tap that opened the scene
      if (typing) { clearInterval(typing); typing = null; dt.textContent = lines[i][2]; return; }
      i++;
      if (i >= lines.length) { this.dialogueAdvance = null; this.set('<div class="dim"></div>'); onDone(); return; }
      audio.sfx('click');
      show();
    };
    this.dialogueAdvance = advance;
    r.querySelector('#dlg').addEventListener('click', advance);
    this.click('#dlg-skip', () => { clearInterval(typing); this.dialogueAdvance = null; this.set('<div class="dim"></div>'); onDone(); });
    show();
  }

  // --------------------------------------------------------------- results
  results(data, onContinue) {
    const { summary, rewards, ups, teamId, exhibition } = data;
    const tm = teamInfo(teamId);
    const won = summary.winner === 0;
    const mine = summary.skaters.filter((s) => s.team === 0);
    const score = (s) => s.goals * 3 + s.assists * 2 + s.steals + s.blocks + s.hits * 0.5;
    const mvp = [...summary.skaters].sort((a, b) => score(b) - score(a))[0];
    const s = this.app.save;
    const r = this.set(`
      <div class="dim"></div>
      <div class="results panel">
        <div class="res-head">
          <h1 class="${won ? 'gold-t' : ''}">${won ? t('Victory!') : t('Defeat')}</h1>
          <div class="score">${esc(CLUB.nick)} ${summary.score[0]} – ${summary.score[1]} ${esc(tm.name.split(' ').slice(-1)[0])}</div>
          <div class="muted">${exhibition ? t('Exhibition') : esc(data.round ? t(data.round, { n: data.roundN }) : '')} · ${t('Shots on goal {a}–{b}', { a: summary.shots[0], b: summary.shots[1] })}</div>
        </div>
        <div class="res-grid">
          <div>
            <div class="label">${t('Box score')}</div>
            <table class="res-table"><thead><tr><th>${t('Player')}</th><th>${t('G')}</th><th>${t('A')}</th><th>${t('SOG')}</th><th>${t('STL')}</th><th>${t('HIT')}</th></tr></thead><tbody>
              ${summary.skaters.map((k) => `<tr style="color:${k.team === 0 ? 'var(--cream)' : '#f5b3bb'}"><td>${esc(k.name)}</td><td>${k.goals}</td><td>${k.assists}</td><td>${k.shots}</td><td>${k.steals}</td><td>${k.hits}</td></tr>`).join('')}
            </tbody></table>
            <div class="mvp" style="margin-top:10px"><img src="${portrait(mvp.id, mvp.team, teamId, 128)}" alt=""><div><div class="label">${t('Player of the match')}</div><div style="font-family:var(--display);font-size:28px">${esc(mvp.name)}</div></div></div>
          </div>
          <div>
            <div class="label">${t('Rewards')}</div>
            <div class="reward-lines">${rewards.lines.map(([a, b]) => `<div><span>${esc(a)}</span><span class="gold-t">${b ? '+' + b : ''}</span></div>`).join('')}</div>
            <div class="reward-total"><span>${t('Coins')}</span><span>+${rewards.coins}</span></div>
            <div class="label" style="margin-top:10px">${t('Experience')}</div>
            <div style="display:grid;gap:6px">
              ${mine.filter((k) => s.roster[k.id]).map((k) => { // (All-Star guests go home with no EXP)
                const rr = s.roster[k.id];
                const lu = ups.filter((u) => u.id === k.id);
                const pct = rr.level >= MAX_LEVEL ? 100 : Math.round((rr.exp / expToNext(rr.level)) * 100);
                return `<div class="xp-row"><img src="${portrait(k.id, 0, null, 88)}" alt="">
                  <div><div>${esc(k.name)} <span class="muted">${t('+{n} EXP', { n: rewards.exp[k.id] })}</span> ${lu.length ? `<span class="lvlup">${t('LEVEL {n}!', { n: rr.level })}</span>` : ''}</div>
                  <div class="xpbar"><i data-w="${pct}"></i></div></div><span class="lvl">${t('LV {n}', { n: rr.level })}</span></div>`;
              }).join('')}
              ${data.rewards.chem && Object.keys(data.rewards.chem).length ? `<div class="label" style="margin-top:6px">${t('Chemistry')}</div>
              ${Object.entries(data.rewards.chem).map(([k, g]) => {
                const [a, b] = k.split('+');
                const cb = comboFor(k);
                const up = (data.chemUps || []).find((u) => u.key === k);
                return `<div class="xp-row"><span class="duo small"><img src="${portrait(a, 0, null, 64)}" alt=""><img src="${portrait(b, 0, null, 64)}" alt=""></span>
                  <div><div>${esc(cb ? t(cb.name) : t('Chemistry'))} <span class="muted">+${g.xp} · ${t('{n} passes', { n: g.passes })}${g.comboGoals ? ` · ${t(g.comboGoals > 1 ? '{n} combo goals' : '{n} combo goal', { n: g.comboGoals })}` : ''}</span> ${up ? `<span class="lvlup">${t('LEVEL {n}!', { n: up.level })}</span>` : ''}</div>
                  <div class="xpbar"><i data-w="${Math.round(chemProgress(s.chem[k]) * 100)}"></i></div></div><span class="lvl">${chemPips(chemLevel(s.chem[k]))}</span></div>`;
              }).join('')}` : ''}
              <div class="xp-row"><img src="${portrait(summary.goalie || 'goalie', 0, null, 88)}" alt=""><div><div>${esc(goalieInfo(summary.goalie || 'halla').name)} <span class="muted">${t('+{n} EXP', { n: rewards.gExp })} · ${t('{n} saves', { n: summary.saves[0] })}</span>${data.gUp ? ` <span class="lvlup">${t('LEVEL UP!')}</span>` : ''}</div></div><span class="lvl">${t('LV {n}', { n: (goalieRec(s, summary.goalie || 'halla') || s.goalie).level })}</span></div>
            </div>
          </div>
        </div>
        ${data.clips && data.clips.clips.length ? `<div>
          <div class="label">${t('Highlights')}</div>
          <div class="clips">${data.clips.clips.map((c, i) => `<div class="clip">
            <video src="${c.url}" muted loop playsinline autoplay></video>
            <div class="clip-line">${esc(c.meta.line)}</div>
            <div class="row" style="gap:6px">${data.clips.canShare(c) ? `<button class="btn small cream" data-share="${i}">${btnIcon('icons/share')} ${t('Share')}</button>` : ''}<a class="btn small ghost" href="${c.url}" download="${esc(data.clips.fileFor(c, i).name)}">${t('Save')}</a></div>
          </div>`).join('')}</div>
        </div>` : ''}
        <div class="row" style="justify-content:flex-end"><button class="btn gold" id="r-go">${t('Continue')}</button></div>
      </div>`);
    if (data.clips) this.click('[data-share]', async (el) => {
      const i = +el.dataset.share;
      try { await data.clips.share(data.clips.clips[i], i); } catch { /* share sheet closed */ }
    }, r);
    requestAnimationFrame(() => r.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w + '%'; }));
    if (won) audio.jingle('win'); else audio.jingle('lose');
    this.click('#r-go', () => { audio.sfx('confirm'); onContinue(); });
  }

  chemUnlocked(ups, done) {
    if (!ups.length) return done();
    audio.jingle('level');
    this.modal(`
      <h2>${t('Chemistry level up!')}</h2>
      ${ups.map((u) => {
        const c = comboFor(u.key);
        const [a, b] = u.key.split('+');
        const na = member(a).name, nb = member(b).name;
        return `<div class="card chem" style="gap:6px">
          <div class="chem-head"><span class="duo"><img src="${portrait(a, 0, null, 96)}" alt=""><img src="${portrait(b, 0, null, 96)}" alt=""></span>
          <div><h3>${esc(t(c.name))}</h3><div class="sub">${esc(na)} + ${esc(nb)} · ${t('level {n}', { n: u.level })}</div></div></div>
          <p style="margin:0">${u.level === 1 ? `${esc(t(c.text))}<br><b class="gold-t">${t('How:')}</b> ${t('pass from {a} to {b} (or back), then shoot right away. Holding shoot as the pass arrives fires it as a one-timer.', { a: esc(na), b: esc(nb) })}` : esc(t(c.levels[u.level - 1]))}</p>
        </div>`;
      }).join('')}
      <button class="btn gold" data-close>${t('Got it')}</button>`, null, false, done);
  }

  champion(onDone) {
    const s = this.app.save;
    // the champions painting (Batch AC) fills the screen, with the title in the calm ice it leaves for it
    const art = Assets.atlas.champions_painting;
    const title = `<h1 class="gold-t" style="font-family:var(--display);font-weight:normal;font-size:clamp(44px,9vw,80px);line-height:.85;margin:0">${t('Champions!')}</h1>`;
    this.set(`
      ${art ? `<div class="champ-stage" id="c-stage"><div class="champ-title">${title}</div></div>` : '<div class="dim"></div>'}
      <div class="results panel${art ? ' champ-panel' : ''}" style="text-align:center;align-items:center">
        ${art ? '' : `<div class="cup-big" id="c-cup">${Assets.groupReady('badges') ? '' : `<img src="${ico('equipment_items/reward/trophy', 256)}" alt="" width="150" height="150">`}</div>${title}`}
        <p style="max-width:46ch">${s.season > 1 ? t('The {club} win the {cup} (season {n}).', { club: esc(CLUB.name), cup: esc(t(TOURNAMENT.name)), n: s.season }) : t('The {club} win the {cup}.', { club: esc(CLUB.name), cup: esc(t(TOURNAMENT.name)) })} ${t('Nix lifts the cup while Volta does laps and Bram carries Halla around on his shoulders.')}</p>
        <p class="muted" style="max-width:46ch">${t('Start a new season to face every rival again with sharper AI, keeping your levels and gear.')}</p>
        <div class="row" style="justify-content:center"><button class="btn gold" id="c-go">${t('Back to the hub')}</button></div>
      </div>`);
    audio.jingle('win');
    this.click('#c-go', () => { audio.sfx('confirm'); onDone(); });
    if (art) {
      const img = new Image(); // fades in once it has arrived
      img.onload = () => { const st = this.root.querySelector('#c-stage'); if (st) { st.style.backgroundImage = `url(${img.src})`; st.classList.add('in'); } };
      img.src = Assets.url(art.image);
    }
    this.cupShine();
    this.fireworks();
  }

  // The big Frostline Cup (Batch X): it rests, then a glint runs across it.
  cupShine() {
    const box = this.root.querySelector('#c-cup');
    const anim = Assets.atlas.badge_animations && Assets.atlas.badge_animations.frostline_cup_shine;
    if (!box || !anim || !Assets.groupReady('badges')) return;
    const set = Assets.spriteSet(anim.frames, 300);
    if (!set) return;
    box.innerHTML = `<img src="${set.urls[0]}" alt="" style="aspect-ratio:${set.w}/${set.h}">`;
    const img = box.firstChild;
    const seq = [0, 0, 0, 0, 0, 0, 1, 2]; // about two seconds still, then the glint at 3 fps
    let k = 0;
    const timer = setInterval(() => {
      if (!img.isConnected) { clearInterval(timer); return; }
      k = (k + 1) % seq.length;
      img.src = set.urls[seq[k]];
    }, 1000 / (anim.fps || 3));
  }

  // Fireworks over the championship screen (title art, loaded on demand).
  fireworks() {
    const P = Assets.atlas.art_additions && Assets.atlas.art_additions.polish;
    if (!P || !P.fireworks || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const layer = document.createElement('div');
    layer.className = 'fireworks';
    this.root.appendChild(layer); // over the panel, bursting at the sides
    Assets.loadGroup('title').then(() => {
      const set = Assets.spriteSet(P.fireworks, 320);
      if (!set) return;
      const launch = () => {
        if (!layer.isConnected) return;
        const img = document.createElement('img');
        img.alt = '';
        img.src = set.urls[0];
        const x = Math.random() < 0.5 ? 3 + Math.random() * 20 : 77 + Math.random() * 20;
        img.style.cssText = `left:${x}%;top:${50 + Math.random() * 45}%;height:${Math.round(150 + Math.random() * 130)}px;transform:translate(-${set.fx * 100}%,-${set.fy * 100}%)`;
        layer.appendChild(img);
        let i = 0;
        const step = setInterval(() => {
          if (++i >= set.urls.length || !img.isConnected) { clearInterval(step); img.remove(); return; }
          img.src = set.urls[i];
        }, 150);
        setTimeout(launch, 300 + Math.random() * 650);
      };
      launch(); setTimeout(launch, 200);
    }).catch(() => {});
  }
}

const PERK_LEVEL_LABEL = (i) => [3, 5, 7][i];

function installHelp(app) {
  if (app.standalone) return `<span class="good">${t('Installed. Plays offline.')}</span>`;
  if (!app.canOffline) return t('Open the game from its https address to install it and play offline.');
  if (app.installPrompt) return `<button class="btn small cream" id="s-install">${t('Install app')}</button>`;
  if (app.isIOS) return t('In Safari tap Share, then Add to Home Screen.');
  return t('Use your browser menu: Install app / Add to Home screen.');
}

const chemPips = (lvl) => `<span class="pips3">${[1, 2, 3].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('')}</span>`;

function chemCard(k, xp) {
  const c = comboFor(k);
  const [a, b] = k.split('+');
  const lvl = chemLevel(xp);
  const next = lvl < CHEM_LEVELS.length ? CHEM_LEVELS[lvl] : null;
  return `<div class="card chem ${lvl ? '' : 'locked'}">
    <div class="chem-head">
      <span class="duo"><img src="${portrait(a, 0, null, 96)}" alt=""><img src="${portrait(b, 0, null, 96)}" alt=""></span>
      <div style="min-width:0"><h3>${esc(t(c.name))}</h3><div class="sub">${esc(member(a).name)} + ${esc(member(b).name)}</div></div>
      ${chemPips(lvl)}
    </div>
    <div class="xpbar" title="${next ? t('{n} chemistry / {max}', { n: xp, max: next }) : t('{n} chemistry', { n: xp })}"><i style="width:${Math.round(chemProgress(xp) * 100)}%"></i></div>
    <p style="margin:0;font-size:13px">${esc(t(c.text))}</p>
    <div class="chem-levels">${c.levels.map((lv, i) => `<span class="${i < lvl ? 'got' : ''}">${t('Lv{n}', { n: i + 1 })} · ${esc(t(lv))}</span>`).join('')}</div>
  </div>`;
}

export function controlsHtml(touch) {
  if (touch) {
    return `<div class="keys">
    <kbd>${t('Left thumb')}</kbd><span>${t('Touch anywhere on the left half and drag to skate')}</span>
    <kbd>${t('SHOOT')}</kbd><span>${t('Tap for a wrist shot, hold for a slapshot. Hold it as a pass arrives for a one-timer')}</span>
    <kbd>${t('CHECK')}</kbd><span>${t('Same button without the puck: shoulder check')}</span>
    <kbd>${t('PASS')}</kbd><span>${t('Passes toward the teammate you\'re steering at. Without the puck it switches player')}</span>
    <kbd>${t('SPRINT')}</kbd><span>${t('Hold for speed (uses stamina)')}</span>
    <kbd>${t('Snowflake')}</kbd><span>${t('Signature ability (swaps per character)')}</span>
    <kbd>${t('Star')}</kbd><span>${t('Ultimate, when it glows gold')}</span>
    <kbd>${t('Pull goalie')}</kbd><span>${t('Appears when you\'re behind and they need one more goal')}</span>
  </div>`;
  }
  return `<div class="keys">
    <kbd>${keyGlyphs(`WASD / ${t('Arrows')}`)}</kbd><span>${t('Skate')}</span>
    <kbd>${keyGlyphs('Shift')}</kbd><span>${t('Sprint (uses stamina)')}</span>
    <kbd>${keyGlyphs('J / Space')}</kbd><span>${t('Shoot: tap for a wrist shot, hold for a slapshot. Without the puck: check')}</span>
    <kbd>${keyGlyphs('K / Enter')}</kbd><span>${t('Pass (aim with movement). Without the puck: switch player')}</span>
    <kbd>${keyGlyphs('U / Q')}</kbd><span>${t('Signature ability')}</span>
    <kbd>${keyGlyphs('I / E')}</kbd><span>${t('Ultimate (when the gold meter is full)')}</span>
    <kbd>${keyGlyphs('H')}</kbd><span>${t('Pull the goalie for an extra attacker (when trailing and they need one more goal)')}</span>
    <kbd>${keyGlyphs('Esc / P')}</kbd><span>${t('Pause')}</span>
    ${psPad()
    ? `<kbd>${t('PlayStation pad')}</kbd><span>${padGlyphs(t('Left stick to skate · □ or R2 shoot-check · ✕ pass-switch · R1 or L2 sprint · ○ or L1 skill · △ ultimate · Options pause · Create pull goalie'))}</span>`
    : `<kbd>${t('Gamepad')}</kbd><span>${padGlyphs(t('Left stick to skate · X or RT shoot-check · A pass-switch · RB or LT sprint · B or LB skill · Y ultimate · Start pause · Back pull goalie'))}</span>`}
    <kbd>${t('Pad in menus')}</kbd><span>${padGlyphs(t('D-pad or stick to move · {select} select · {back} back · {tabs} switch tabs · right stick scrolls', { select: psPad() ? '✕' : 'A', back: psPad() ? '○' : 'B', tabs: psPad() ? 'L1/R1' : 'LB/RB' }))}</span>
    <kbd>${t('Touch')}</kbd><span>${t('Left thumb anywhere to skate · right-side buttons for actions')}</span>
  </div>`;
}
