// Menu screens: title, hub (tournament / team / shop / training), dialogue, results.

import { Assets } from './assets.js';
import {
  CHARACTERS, GEAR, GEAR_BY_ID, TEAMS, TOURNAMENT, STAT_KEYS, STAT_NAMES, STAT_HINT,
  POWER_INFO, TWIST_INFO, GOALIE, COMBOS, CHEM_LEVELS, CHALLENGES, GAME_PLANS, ROLE, ART_NAME, ARENAS,
  RECRUITS, member, comboFor, recruitKey, pairKey, GEAR_LOOK, CLUB, CLUB_DEFAULT, CLUB_PRESETS, PALETTES, clubText, applyClub, hexToHsv,
} from './data.js';
import { standings } from './league.js';
import { BUFF_TEXT } from './lockerroom.js';
import { ACHIEVEMENTS } from './achievements.js';
import { AWARDS, AWARD_BY_ID, seasonStats } from './awards.js';
import { dailyFor, dailyGoal, dayKey, currentStreak, doneToday, dailyReward, dailyState } from './daily.js';
import {
  expToNext, effectiveStats, gearMods, canRaise, writeSave, MAX_LEVEL, goalieStats, STAT_CAP_BONUS, clearSave,
  chemLevel, chemProgress, lineupIds, rosterIds, recruitStatus, signRecruit, setLineup, joinLevel, isSigned, homeKitGroups,
} from './progress.js';
import { audio } from './audio.js';
const VOLUMES = [[0, 'Off'], [0.35, 'Low'], [0.7, 'Mid'], [1, 'Full']];
// dialogue voices: each role speaks at its own pitch; rivals a little lower
const VOICE = { frost: 660, thunder: 800, stone: 470, goalie: 590 };
const voicePitch = (kit, us) => { const p = VOICE[String(kit).replace(/^sub_/, '')] || 620; return us ? p : p * 0.88; };
import { DRILLS, MEDAL_NAMES, MEDAL_COLORS, formatScore } from './drills.js';

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
  if (team === 0 && RECRUITS[id]) {
    // a signing: their own portrait, in our colours
    const r = RECRUITS[id];
    const p = P[`${TEAMS[r.team].art}_${ROLE[r.kit]}`];
    const fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
    return (fid && Assets.icon(fid, size, 'homekit')) || Assets.icon(`character_portraits/home/${PORTRAIT[r.kit]}`, size);
  }
  if (team !== 0 && id.startsWith('sub_')) return Assets.icon(`character_portraits/away/${PORTRAIT[id.slice(4)]}`, size, teamId);
  if (team === 0) {
    const p = P[ART_NAME[id]];
    if (expr && p && p[expr]) return Assets.icon(p[expr], size, CLUB_PAGES());
    return Assets.icon(`character_portraits/home/${PORTRAIT[id]}`, size, CLUB_PAGES());
  }
  const t = TEAMS[teamId];
  const p = t && t.art && P[`${t.art}_${ROLE[id]}`];
  const fid = p && ((expr && p[expr]) || p.neutral_roster || p.neutral);
  const url = fid && Assets.icon(fid, size, teamId);
  return url || Assets.icon(`character_portraits/away/${PORTRAIT[id]}`, size, teamId);
};
export const crest = (teamId, size = 96) => {
  if (teamId === 'home') return Assets.icon('hud_elements/misc/home_crest', size, CLUB_PAGES());
  const t = TEAMS[teamId];
  const c = t && t.art && Assets.atlas.crests && Assets.atlas.crests[t.art];
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

// The locker room hub: stations in the painting, in % of the 16:9 image.
const STATIONS = [
  { tab: 'team', label: 'Team', icon: 'equipment_items/hub/locker', rect: [19, 2, 47, 27], at: [42, 15], tip: 'Lockers: line-up, stats, gear and scouting' },
  { tab: 'shop', label: 'Shop', npc: 'shopkeeper', rect: [69, 11, 30, 58], at: [84, 38], tip: 'Gearsmith Ottar\'s counter' },
  { tab: 'training', label: 'Training', npc: 'coach', rect: [0.5, 15, 13.5, 40], at: [11, 31], tip: 'Grab a stick and hit the practice rink' },
  { tab: 'trophies', label: 'Trophies', icon: 'equipment_items/reward/trophy', rect: [14.5, 23, 8.5, 17], at: [21, 44], tip: 'The trophy chest' },
  { tab: 'tournament', label: 'League', npc: 'announcer', rect: [10, 77, 58, 18], at: [37, 86], tip: 'Benches: schedule, standings and playoffs' },
];
// Where the dressed skaters and Halla stand on the floor (feet, % of the room).
const CREW_SPOTS = [[29, 71], [41, 67], [53, 64], [64, 70]];

// Portrait for a league stat row or award winner (ours or a rival's).
const rowFace = (r, size) => (r.team === 'home' ? portrait(r.face, 0, null, size) : portrait(r.face, 1, r.team, size));

// Hub characters: a portrait and a line of chatter at the top of their tab.
const NPC_NAMES = { coach: 'Coach Brekka', shopkeeper: 'Gearsmith Ottar', announcer: 'Kip Vance, PA' };
function npc(key, text) {
  const id = Assets.atlas.npcs && Assets.atlas.npcs[key];
  const img = id && Assets.icon(id, 128);
  if (!img) return '';
  return `<div class="npc"><img src="${img}" alt=""><div class="say"><b>${NPC_NAMES[key]}</b>${esc(text)}</div></div>`;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// How a piece of gear shows on the ice.
const lookHtml = (id) => (GEAR_LOOK[id] && GEAR_LOOK[id].desc ? `<div class="look">On the ice: ${esc(GEAR_LOOK[id].desc)}</div>` : '');

function modsHtml(mods) {
  const parts = Object.entries(mods).filter(([, v]) => v).map(([k, v]) =>
    `<span class="mod ${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v} ${k === 'rfx' ? 'Reflex' : STAT_NAMES[k]}</span>`);
  return parts.length ? `<div class="mods">${parts.join('')}</div>` : '<div class="mods"><span class="mod">No modifiers</span></div>';
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
        <div class="title-logo">Puck<span>bound</span></div>
        <div class="title-sub">3-on-3 arcade hockey RPG</div>
        <div class="title-buttons">
          <button class="btn gold" id="t-start">${hasSave ? 'Continue' : 'New Season'}</button>
          <button class="btn" id="t-quick">Quick Match</button>
          <button class="btn" id="t-versus">2 Players</button>
          <button class="btn ghost" id="t-settings">Settings</button>
          ${this.app.installPrompt && !this.app.standalone ? '<button class="btn cream" id="t-install">Install app</button>' : ''}
        </div>
        ${this.app.isTouch ? '' : '<div class="press" id="t-press">Press Enter to start</div>'}
      </div>
      <div class="title-foot">Best in landscape on phones · Keyboard, gamepad and touch</div>`);
    this.click('#t-start', () => { audio.sfx('confirm'); this.app.startCampaign(); });
    this.click('#t-quick', () => { audio.sfx('confirm'); this.quickMatchPicker(); });
    this.click('#t-versus', () => { audio.sfx('confirm'); this.versusPicker(); });
    this.click('#t-settings', () => { audio.sfx('click'); this.settings(); });
    this.click('#t-install', async () => { audio.sfx('confirm'); await this.app.install(); this.title(); });
    return r;
  }

  quickMatchPicker() {
    const opts = Object.values(TEAMS).filter((t) => t.id !== 'home');
    const rec = (id) => { const r = this.app.save.rivals && this.app.save.rivals[id]; return r && r.played ? ` · record ${r.wins}–${r.losses}` : ''; };
    this.challenges ||= new Set();
    const mult = () => [...this.challenges].reduce((m, id) => m * CHALLENGES.find((c) => c.id === id).mult, 1);
    this.modal(`
      <h2>Quick play</h2>
      <p class="muted" style="margin:0">Exhibitions use your current team and pay half rewards. A shootout is five penalty shots each way: you shoot, then you play goalie.</p>
      <div>
        <div class="label" style="font-size:15px">Match challenges <span class="muted" id="ch-mult" style="font-family:var(--body);font-size:12px;letter-spacing:0;text-transform:none"></span></div>
        <div class="filters" style="margin:6px 0 0">${CHALLENGES.map((c) => `<button class="chip" data-ch="${c.id}" aria-pressed="${this.challenges.has(c.id)}" title="${esc(c.text)}">${esc(c.name)}</button>`).join('')}</div>
      </div>
      <div>
        <div class="label" style="font-size:15px">Arena</div>
        <div class="filters" style="margin:6px 0 0">${['auto', ...Object.keys(ARENAS)].map((k) => `<button class="chip" data-arena="${k}" aria-pressed="${(this.arenaPick || 'auto') === k}">${k === 'auto' ? 'Their building' : esc(ARENAS[k].name)}${ARENAS[k] && ARENAS[k].rule ? ` <span class="muted">· ${esc(ARENAS[k].rule)}</span>` : ''}</button>`).join('')}
          <button class="chip" id="arena-rules" aria-pressed="${this.arenaRules !== false}" title="Meltwater in the Ember Dome, aurora lanes in the Aurora Palace, pond cracks on Pine Pond">Arena rules ${this.arenaRules !== false ? 'on' : 'off'}</button></div>
      </div>
      <div class="choice">${opts.map((t) => `
        <div class="qp-row">
          <img src="${crest(t.id, 64)}" alt="" width="44" height="44">
          <span style="min-width:0"><b>${esc(t.name)}</b><span class="muted" style="font-size:12px">${esc(t.style)}${rec(t.id)}</span></span>
          <span class="row" style="gap:6px"><button class="btn small" data-team="${t.id}">Match</button><button class="btn small ghost" data-so="${t.id}">Shootout</button></span>
        </div>`).join('')}
      </div>
      <button class="btn small ghost" data-close>Back</button>`, (m, close) => {
      const upd = () => { const x = mult(); m.querySelector('#ch-mult').textContent = this.challenges.size ? `coins x${+x.toFixed(2)}` : ''; };
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
        el.textContent = `Arena rules ${this.arenaRules ? 'on' : 'off'}`;
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
      <h2>Local versus</h2>
      <p class="muted" style="margin:0">Two players on one screen: ${esc(CLUB.nick)} against a rival, same stats on both sides, first to 5. Needs a keyboard or gamepads.</p>
      <div class="keys">
        <kbd style="color:var(--ice)">Player 1</kbd><span>WASD skate · F shoot/check · G pass/switch · Left Shift sprint · R skill · T ultimate</span>
        <kbd style="color:var(--coral)">Player 2</kbd><span>Arrows skate · K shoot/check · L pass/switch · Right Shift sprint · O skill · P ultimate</span>
        <kbd>Gamepads</kbd><span>With two pads each player gets one. With one pad, it goes to player 2.</span>
      </div>
      <div class="label" style="font-size:15px">Player 2 plays as</div>
      <div class="filters" style="margin:0">${opts.map((t) => `<button class="chip" data-vs="${t.id}" aria-pressed="${this.vsTeam === t.id}" style="display:inline-flex;gap:6px;align-items:center"><img src="${crest(t.id, 40)}" width="20" height="20" alt="">${esc(t.name)}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>Back</button><button class="btn gold" id="vs-go">Start</button></div>`, (m, close) => {
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
    const nt = next ? TEAMS[next.team] : null;
    const anyPoints = rosterIds(s).some((id) => s.roster[id].points > 0 || s.roster[id].pendingPerk !== null);
    const room = this.tab === 'room' && !!(Assets.atlas && Assets.atlas.locker);
    if (this.tab === 'room' && !room) this.tab = 'tournament';
    document.body.classList.toggle('hub-room', room);
    const r = this.set(`
      <div class="dim"></div>
      <div class="hub">
        <div class="hub-top">
          <img class="crest" src="${crest('home', 96)}" alt="">
          <div class="hub-title">${esc(CLUB.name)}<small>${esc(TOURNAMENT.name)}${s.season > 1 ? ' · Season ' + s.season : ''}</small></div>
          <div class="coins"><img src="${ico('equipment_items/reward/coins', 64)}" alt="">${s.coins}</div>
          <button class="icon-btn" id="h-settings" aria-label="Settings">☰</button>
        </div>
        ${room ? `<div class="room-wrap" id="room-wrap"><div class="room" id="room">${this.roomHtml(s, anyPoints)}</div></div>` : `
        <div class="tabs" role="tablist">
          <button class="tab room-tab" data-tab="room" aria-label="Back to the locker room">◂ Locker room</button>
          ${[['tournament', 'League'], ['team', 'Team'], ['shop', 'Shop'], ['training', 'Training'], ['trophies', 'Trophies']].map(([t, label]) => `<button class="tab" role="tab" data-tab="${t}" aria-selected="${this.tab === t}">${label}${t === 'team' && anyPoints ? '<span class="dot"></span>' : ''}</button>`).join('')}
        </div>
        <div class="hub-body panel" id="hub-body"></div>`}
        <div class="hub-cta">
          ${nt ? `<div class="next">${esc(next.round)}<br><b>vs ${esc(nt.name)}</b>${s.buffs && s.buffs.length ? `<span class="buffs">${s.buffs.map((b) => `<span class="buff">${esc(BUFF_TEXT(b))}</span>`).join('')}</span>` : ''}</div>
          <button class="btn gold" id="h-play">Play match</button>` : `<div class="next"><b>${s.league && s.league.champion && s.league.champion !== 'home' ? `${esc(TEAMS[s.league.champion].name)} won the cup` : 'Champions!'}</b><br>Start a new season or play exhibitions.</div>
          <button class="btn gold" id="h-season">New season</button>`}
          <button class="btn ghost daily-btn" id="h-daily" title="Today's daily challenge">${doneToday(s) ? '✓' : '★'} Daily${currentStreak(s) ? ` <span class="streak">${currentStreak(s)}🔥</span>` : ''}</button>
          <button class="btn ghost" id="h-title">Title</button>
        </div>
      </div>`);
    this.click('[data-tab]', (el) => { audio.sfx('click'); this.hub(el.dataset.tab); });
    this.click('#h-play', () => { audio.sfx('confirm'); this.app.startStage(); });
    this.click('#h-season', () => { audio.sfx('confirm'); this.app.newSeason(); });
    this.click('#h-title', () => { audio.sfx('back'); this.app.goTitle(); });
    this.click('#h-daily', () => this.dailyCard());
    this.click('#h-settings', () => { audio.sfx('click'); this.settings(); });
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
      team: anyPoints ? 'Points to spend' : scoutOpen ? 'Scouts calling' : '',
      shop: shopNew ? 'New gear in reach' : '',
      training: s.training.sessions ? `${s.training.sessions} session${s.training.sessions > 1 ? 's' : ''}` : '',
      trophies: `${got}/${ACHIEVEMENTS.length}`,
      tournament: next ? `Next: ${TEAMS[next.opponent].name.split(' ').slice(-1)[0]}` : '',
    };
    const npcs = Assets.atlas.npcs || {};
    const spots = STATIONS.map((st) => {
      const [x, y, w, h] = st.rect;
      const img = st.npc && npcs[st.npc] ? Assets.icon(npcs[st.npc], 72) : st.icon ? ico(st.icon, 64) : '';
      const b = badge[st.tab];
      const [ax, ay] = st.at;
      return `<button class="spot" data-tab="${st.tab}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" title="${esc(st.tip)}" aria-label="${esc(st.label)}: ${esc(st.tip)}">
        <span class="spot-label" style="left:${((ax - x) / w) * 100}%;top:${((ay - y) / h) * 100}%">${img ? `<img src="${img}" alt="">` : ''}<b>${esc(st.label)}</b>${b ? `<small class="${st.tab === 'trophies' ? '' : 'hot'}">${esc(b)}</small>` : ''}</span></button>`;
    }).join('');
    const line = lineupIds(s);
    const crew = [...line, 'goalie'].map((id, i) => {
      const [x, y] = CREW_SPOTS[i];
      let src;
      if (id === 'goalie') src = Assets.icon((Assets.atlas.goalies_front || {}).home?.idle_a || Assets.atlas.goalies_side.home.ready, 160, CLUB_PAGES());
      else {
        const m = member(id);
        const set = m.recruit ? Assets.atlas.skaters[m.recruit.sprite] : Assets.atlas.skaters[m.def.sprite];
        src = m.recruit ? Assets.icon(set.home.south.frames.idle, 160, 'homekit') : Assets.icon(set.home.south.frames.idle, 160, CLUB_PAGES());
        if (!src) src = Assets.icon(Assets.atlas.skaters[m.def.sprite].home.south.frames.idle, 160, CLUB_PAGES());
      }
      const name = id === 'goalie' ? GOALIE.name : member(id).name;
      return `<button class="crew" data-crew="${id}" style="left:${x}%;top:${y}%;animation-delay:${-i * 0.7}s" aria-label="${esc(name)}"><img src="${src}" alt=""><span>${esc(name)}</span></button>`;
    }).join('');
    return `<img class="room-bg" src="${Assets.url(Assets.atlas.locker)}" alt="">${spots}${crew}`;
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
  }

  tabTournament(body) {
    const s = this.app.save;
    const L = s.league;
    const name = (id) => TEAMS[id].name;
    const short = (id) => (id === 'home' ? CLUB.nick : TEAMS[id].name.split(' ').slice(-1)[0]);
    const rows = standings(L);
    const record = (id) => { const r = s.rivals && s.rivals[id]; return r && r.played ? `${r.wins}–${r.losses}` : ''; };
    const table = `<table class="league-table">
      <thead><tr><th>#</th><th style="text-align:left">Team</th><th>GP</th><th>W</th><th>L</th><th>GF</th><th>GA</th><th>+/-</th><th>PTS</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${r.id === 'home' ? 'us' : ''} ${i === 3 ? 'cut' : ''}">
        <td>${i + 1}</td><td class="tm"><img src="${crest(r.id, 40)}" alt="" width="22" height="22">${esc(name(r.id))}</td>
        <td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.diff > 0 ? '+' : ''}${r.diff}</td><td class="pts">${r.pts}</td></tr>`).join('')}</tbody>
    </table>
    <div class="muted" style="font-size:12px;margin-top:4px">Top 4 make the playoffs: 1 plays 4, 2 plays 3, winners meet in the Cup Final.</div>`;
    const schedule = L.schedule.map((rd, i) => {
      const opp = rd.games[0].b;
      const res = L.results[i] && L.results[i][0];
      const t = TEAMS[opp];
      const status = res ? (res.ga > res.gb ? `<span class="good">W ${res.ga}–${res.gb}</span>` : `<span class="bad">L ${res.ga}–${res.gb}</span>`) : i === L.round && L.phase === 'regular' ? '<span class="gold-t">NEXT</span>' : '<span class="muted">—</span>';
      return `<div class="fixture ${i === L.round && L.phase === 'regular' ? 'next' : ''}">
        <span class="muted">R${i + 1}</span><img src="${crest(opp, 48)}" alt="" width="26" height="26">
        <span class="fx-name"><b>${esc(t.name)}</b><span class="muted">${esc(GAME_PLANS[t.plan === 'counter' ? 'balanced' : t.plan].name)}${t.plan === 'counter' ? ' (adapts)' : ''}${record(opp) ? ` · record ${record(opp)}` : ''}</span></span>
        <span class="fx-res">${status}</span></div>`;
    }).join('');
    let bracket = '';
    if (L.playoffs) {
      const po = L.playoffs;
      const game = (g, label) => g ? `<div class="po-game"><div class="label" style="font-size:12px">${label}</div>
        ${[['a', 'ga'], ['b', 'gb']].map(([k, sc]) => `<div class="po-team ${g.winner === g[k] ? 'win' : g.winner ? 'lose' : ''} ${g[k] === 'home' ? 'us' : ''}"><img src="${crest(g[k], 40)}" alt="" width="22" height="22">${esc(short(g[k]))}<b>${g[sc] ?? ''}</b></div>`).join('')}</div>` : `<div class="po-game"><div class="label" style="font-size:12px">${label}</div><div class="muted" style="font-size:13px">Waiting for the semifinals</div></div>`;
      bracket = `<div class="label" style="margin:14px 0 6px">Playoffs</div>
        <div class="bracket-po">${game(po.semis[0], 'Semifinal · 1 v 4')}${game(po.semis[1], 'Semifinal · 2 v 3')}${game(po.final, 'Cup Final')}</div>
        ${L.champion ? `<p class="gold-t" style="font-family:var(--display);font-size:26px;text-align:center;margin:10px 0 0">${L.champion === 'home' ? 'The Frostline Cup is yours!' : `${esc(name(L.champion))} win the Frostline Cup.`}</p>` : ''}`;
    }
    const last = L.results.length ? L.results[L.results.length - 1].slice(1) : [];
    const next = this.app.fixture && this.app.fixture();
    const nt = next && TEAMS[next.opponent];
    const venue = nt && nt.arena ? ARENAS[nt.arena].name : 'Frostline Rink';
    const call = L.champion ? (L.champion === 'home' ? `Champions! Ladies and gentlemen, your ${CLUB.name}!` : 'What a season. The ice goes quiet until next year.')
      : nt ? pick([`Next up: the ${nt.name} at ${venue}! Get loud!`, `${nt.name} at ${venue}. ${nt.style}`, `Tonight at ${venue}: ${CLUB.nick} versus ${nt.name}. You won't want to miss it.`])
        : 'Welcome to the Frostline league!';
    body.innerHTML = `
      ${npc('announcer', call)}
      <div class="label" style="margin-bottom:6px">${esc(TOURNAMENT.name)} · Season ${s.season}</div>
      <div class="league-grid">
        <div style="min-width:0">${table}
          ${last.length ? `<div class="label" style="margin:12px 0 4px;font-size:14px">Around the league · round ${L.results.length}</div>
          <div class="around">${last.map((g) => `<div>${esc(short(g.a))} <b>${g.ga}–${g.gb}</b> ${esc(short(g.b))}</div>`).join('')}</div>` : ''}
          ${bracket}
        </div>
        <div style="min-width:0"><div class="label" style="margin-bottom:6px;font-size:14px">Your schedule</div><div class="schedule">${schedule}</div>
          ${this.leadersHtml(L)}</div>
      </div>`;
  }

  // Scoring leaders this season, and the award winners once it's over.
  leadersHtml(L) {
    const st = L.stats && seasonStats(L);
    let html = '';
    if (L.awards && L.awards.length) {
      html += `<div class="label" style="margin:14px 0 6px;font-size:14px">Season ${L.season} awards</div><div class="aw-list">${L.awards.map((w) => `
        <div class="aw-row ${w.team === 'home' ? 'us' : ''}"><img src="${rowFace(w, 64)}" alt=""><div style="min-width:0"><small>${esc(AWARD_BY_ID[w.id].name)}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${crest(w.team, 40)}" alt=""></div>`).join('')}</div>`;
    }
    const rows = st ? Object.values(st.skaters).sort((x, y) => (y.g + y.a) - (x.g + x.a) || y.g - x.g).slice(0, 6) : [];
    if (rows.length) {
      html += `<div class="label" style="margin:14px 0 6px;font-size:14px">Scoring leaders</div>
        <table class="league-table leaders"><thead><tr><th style="text-align:left">Player</th><th>GP</th><th>G</th><th>A</th><th>PTS</th></tr></thead><tbody>${rows.map((r) => `
          <tr class="${r.team === 'home' ? 'us' : ''}"><td class="tm"><img src="${crest(r.team, 40)}" alt="" width="20" height="20">${esc(r.name)}</td><td>${r.gp}</td><td>${r.g}</td><td>${r.a}</td><td class="pts">${r.g + r.a}</td></tr>`).join('')}</tbody></table>`;
    }
    return html;
  }

  tabTrophies(body) {
    const s = this.app.save;
    const tr = this.app.ach;
    const got = ACHIEVEMENTS.filter((a) => tr.has(a.id));
    const earned = got.reduce((n, a) => n + a.coins, 0);
    body.innerHTML = `
      <div class="train-top"><div><div class="label">Trophy case</div>
        <p style="margin:2px 0 0;font-size:13px">${got.length} of ${ACHIEVEMENTS.length} unlocked · ${earned} coins earned${s.cups ? ` · ${s.cups} cup${s.cups > 1 ? 's' : ''} won` : ''}</p></div></div>
      ${s.awards && s.awards.length ? `<div class="label" style="margin:4px 0 6px">Award cabinet</div>
      <div class="aw-list cabinet">${s.awards.slice().reverse().map((w) => `
        <div class="aw-row us"><img src="${rowFace({ ...w, team: 'home' }, 64)}" alt=""><div style="min-width:0"><small>Season ${w.season} · ${esc(AWARD_BY_ID[w.id].name)}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${ico(AWARD_BY_ID[w.id].icon, 64)}" alt=""></div>`).join('')}</div>
      <div class="label" style="margin:14px 0 6px">Achievements</div>` : ''}
      <div class="trophies">${ACHIEVEMENTS.map((a) => {
        const done = tr.has(a.id);
        const pr = !done && tr.progress(a);
        return `<div class="trophy ${done ? 'got' : ''}">
          <img src="${ico(a.icon, 96)}" alt="">
          <div style="min-width:0"><b>${esc(a.name)}</b><span>${esc(clubText(a.text))}</span>
            ${pr ? `<div class="xpbar" style="margin-top:4px"><i style="width:${Math.round((pr[0] / pr[1]) * 100)}%"></i></div><span class="muted">${pr[0]} / ${pr[1]}</span>` : ''}</div>
          <span class="tcoins">${done ? '✓' : `+${a.coins}`}</span>
        </div>`;
      }).join('')}</div>`;
  }

  // The season's awards night, hosted by Kip Vance: one envelope at a time.
  awardsNight(list, season, onDone) {
    const npc = Assets.atlas.npcs && Assets.atlas.npcs.announcer;
    const host = npc ? Assets.icon(npc, 128) : '';
    let i = -1, opened = false;
    const r = this.set(`
      <div class="dim"></div>
      <div class="awards panel">
        <div class="aw-head">${host ? `<img src="${host}" alt="">` : ''}<div><div class="label">Frostline Awards · Season ${season}</div><div class="aw-say" id="aw-say">Welcome, everyone, to the Frostline Awards! ${['', 'One honour', 'Two honours', 'Three honours', 'Four honours', 'Five honours', 'Six honours'][list.length] || list.length + ' honours'}, one envelope each. Let's get to it.</div></div></div>
        <div class="aw-stage" id="aw-stage"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn small ghost" id="aw-skip">Skip</button><button class="btn gold" id="aw-next">First award</button></div>
      </div>`);
    const stage = r.querySelector('#aw-stage'), say = r.querySelector('#aw-say'), next = r.querySelector('#aw-next');
    const card = (w) => {
      const a = AWARD_BY_ID[w.id];
      const t = w.team === 'home' ? TEAMS.home : TEAMS[w.team];
      return `<div class="aw-card ${opened ? 'open' : ''} ${w.team === 'home' ? 'us' : ''}">
        <div class="aw-face aw-back"><img src="${ico(a.icon, 160)}" alt=""><b>${esc(a.name)}</b><span>${esc(clubText(a.blurb))}</span></div>
        <div class="aw-face aw-front">
          <img class="aw-portrait" src="${rowFace(w, 220)}" alt="">
          <div style="min-width:0"><small>${esc(a.name)}</small><b>${esc(w.name)}</b>
            <span class="aw-team"><img src="${crest(w.team, 40)}" alt="" width="20" height="20">${esc(t.name)}</span>
            <span class="muted">${esc(w.line)}</span>
            ${w.reward ? `<span class="gold-t">+${w.reward.coins} coins · +${w.reward.exp} EXP</span>` : ''}</div>
        </div></div>`;
    };
    const show = () => {
      const w = list[i];
      stage.innerHTML = card(w);
      if (!opened) {
        say.textContent = `And the ${AWARD_BY_ID[w.id].name} goes to...`;
        next.textContent = 'Open the envelope';
        audio.jingle('reveal');
      } else {
        const ours = w.team === 'home';
        say.textContent = ours ? `${w.name} of the ${CLUB.name}! What a season!` : `${w.name} of the ${TEAMS[w.team].name}. Tip of the cap.`;
        next.textContent = i < list.length - 1 ? 'Next award' : 'That\'s the show';
        if (ours) { audio.jingle('win'); audio.crowdCheer(0.8); } else { audio.crowdOoh(0.5); audio.crowdCheer(0.3); }
      }
    };
    const summary = () => {
      say.textContent = 'That\'s a wrap on the season. See you on the ice!';
      stage.innerHTML = `<div class="aw-list">${list.map((w) => `<div class="aw-row ${w.team === 'home' ? 'us' : ''}"><img src="${rowFace(w, 64)}" alt=""><div style="min-width:0"><small>${esc(AWARD_BY_ID[w.id].name)}</small><b>${esc(w.name)}</b><span class="muted">${esc(w.line)}</span></div><img class="cr" src="${crest(w.team, 40)}" alt=""></div>`).join('')}</div>`;
      next.textContent = 'Back to the locker room';
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
    const t = TEAMS[d.teamId];
    const ar = ARENAS[d.arena];
    const streak = currentStreak(s), done = doneToday(s);
    const st = dailyState(s);
    const tries = (st.attempts && st.attempts[d.date]) || 0;
    audio.sfx('click');
    this.modal(`
      <h2>Daily challenge</h2>
      <p class="muted" style="margin:0">${esc(d.date)} · the same challenge for everyone today. Beat the goal on consecutive days to build a streak.</p>
      <div class="daily">
        <img src="${crest(d.teamId, 96)}" alt="" width="64" height="64">
        <div style="min-width:0"><b>vs ${esc(t.name)}</b><span class="muted">${esc(ar.name)}${ar.rule ? ` · ${esc(ar.rule)}` : ''}</span>
          <span>${d.mods.map((id) => `<span class="chip" aria-pressed="true" style="pointer-events:none">${esc(CHALLENGES.find((c) => c.id === id).name)}</span>`).join(' ')}</span></div>
      </div>
      <div class="daily-goal"><small>Goal</small><b>${esc(dailyGoal(d.goal).text)}</b></div>
      <div class="row" style="gap:14px;flex-wrap:wrap">
        <span>Streak <b class="gold-t">${streak}</b>${st.best ? ` <span class="muted">(best ${st.best})</span>` : ''}</span>
        <span>Reward <b class="gold-t">${done ? 'claimed' : dailyReward(streak + 1) + ' coins'}</b></span>
        ${tries ? `<span class="muted">${tries} attempt${tries > 1 ? 's' : ''} today</span>` : ''}
      </div>
      ${done ? '<p class="good" style="margin:0">Done for today. Come back tomorrow to keep the streak going.</p>' : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>Back</button><button class="btn gold" id="daily-go">${done ? 'Play again' : 'Play'}</button></div>`, (m, close) => {
      this.click('#daily-go', () => { close(); audio.sfx('confirm'); this.app.startDaily(); }, m);
    });
  }

  // Before a league match: pick a game plan, with a scouting report on theirs.
  planPicker(teamId, fixture, theirPlan, onPick) {
    const s = this.app.save;
    const t = TEAMS[teamId];
    const their = GAME_PLANS[theirPlan];
    const cur = s.lastPlan || 'balanced';
    const counters = (id) => GAME_PLANS[id].beats === theirPlan;
    const countered = (id) => their.beats === id;
    this.set('<div class="dim"></div>');
    this.modal(`
      <h2>Game plan</h2>
      <div class="scout"><img src="${crest(teamId, 64)}" alt="" width="40" height="40"><div><div class="label" style="font-size:13px">Scouting report · ${esc(fixture.label)}</div>
        ${esc(t.name)} will most likely play <b class="gold-t">${esc(their.name)}</b>.${t.plan === 'counter' ? ' They adapt to what you used against them last time.' : ''}</div></div>
      ${s.buffs && s.buffs.length ? `<div class="buffs">${s.buffs.map((b) => `<span class="buff">${esc(BUFF_TEXT(b))}</span>`).join('')}</div>` : ''}
      ${rosterIds(s).length > 3 ? `<div class="line-row" id="line-row">${lineupIds(s).map((id) => `<span><img src="${portrait(id, 0, null, 64)}" width="26" height="26" alt="">${esc(member(id).name)}</span>`).join('')}<button class="btn small ghost" id="line-change">Change line-up</button></div>` : ''}
      <div class="plans">${Object.values(GAME_PLANS).map((p) => `
        <button class="plan ${p.id === cur ? 'sel' : ''}" data-plan="${p.id}">
          <b>${esc(p.name)}</b>
          <span>${esc(p.text)}</span>
          <span class="good">+ ${esc(p.pros)}</span>
          <span class="bad">− ${esc(p.cons)}</span>
          ${p.beats ? `<span class="muted">Beats ${esc(GAME_PLANS[p.beats].name)}</span>` : ''}
          ${counters(p.id) ? '<span class="edge good">Counters their plan</span>' : countered(p.id) ? '<span class="edge bad">Countered by their plan</span>' : ''}
        </button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn gold" id="plan-go">Drop the puck</button></div>`, (m, close) => {
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

  // After a league match: the rest of the round, standings moves, playoff news.
  leagueUpdate(out, L, done) {
    const short = (id) => (id === 'home' ? CLUB.nick : TEAMS[id].name.split(' ').slice(-1)[0]);
    const rows = standings(L);
    const pos = rows.findIndex((r) => r.id === 'home') + 1;
    let headline = '';
    if (out.champion === 'home') headline = 'Frostline Cup champions!';
    else if (out.eliminated && out.kind === 'regular') headline = 'Missed the playoffs';
    else if (out.eliminated) headline = 'Knocked out';
    else if (out.phaseChange === 'playoffs') headline = `Playoffs! You're the #${L.playoffs.seeds.indexOf('home') + 1} seed`;
    else if (out.kind === 'semi' && out.won) headline = 'On to the Cup Final!';
    else if (L.phase === 'regular') headline = `${pos}${['st', 'nd', 'rd'][pos - 1] || 'th'} place after round ${L.round}`;
    const games = out.simulated.map((g) => `<div>${g.stage ? `<span class="muted">${esc(g.stage)}:</span> ` : ''}${esc(short(g.a))} <b>${g.ga}–${g.gb}</b> ${esc(short(g.b))}</div>`).join('');
    const top = rows.slice(0, 6).map((r, i) => `<div class="mini-row ${r.id === 'home' ? 'us' : ''}"><span>${i + 1}. ${esc(short(r.id))}</span><span>${r.w}–${r.l}</span><b>${r.pts}</b></div>`).join('');
    this.modal(`
      <h2>${esc(headline || 'League update')}</h2>
      ${games ? `<div class="label" style="font-size:13px">Around the league</div><div class="around">${games}</div>` : ''}
      ${L.phase === 'regular' || out.phaseChange ? `<div class="label" style="font-size:13px">Standings</div><div class="mini-table">${top}</div>` : ''}
      ${out.eliminated && L.champion ? `<p>${esc(TEAMS[L.champion] ? TEAMS[L.champion].name : 'The ' + CLUB.nick)} win the Frostline Cup. Start a new season from the hub when you\'re ready.</p>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn gold" data-close>Continue</button></div>`, null, false, done);
  }

  // A locker-room scene with two choices. choose(i) applies it and returns the reply text.
  lockerMoment(m, ctx, choose, done) {
    const who = m.whoFn ? m.whoFn(ctx) : m.who;
    audio.sfx('blip');
    this.modal(`
      <div class="label">Locker room</div>
      <div class="locker">
        <div class="locker-faces">${who.map((id) => `<img src="${portrait(id, 0, null, 152)}" alt="">`).join('') || `<img src="${portrait('goalie', 0, null, 152)}" alt="">`}</div>
        <div><h2>${esc(m.title)}</h2><p style="margin:6px 0 0">${esc(clubText(m.text(ctx)))}</p></div>
      </div>
      <div class="choice" id="lm-choices">${m.choices.map((c, i) => `<button class="btn ghost" data-lm="${i}"><b>${esc(c.label)}</b>${esc(c.fx)}</button>`).join('')}</div>
      <div id="lm-reply" hidden></div>`, (el, close) => {
      this.click('[data-lm]', (b) => {
        const reply = choose(+b.dataset.lm);
        audio.sfx('confirm');
        el.querySelector('#lm-choices').hidden = true;
        const r = el.querySelector('#lm-reply');
        r.hidden = false;
        r.innerHTML = `<p class="gold-t" style="margin:0">${esc(m.choices[+b.dataset.lm].fx)}</p><p style="margin:6px 0 10px">${esc(reply || '')}</p><div class="row" style="justify-content:flex-end"><button class="btn gold" id="lm-go">Continue</button></div>`;
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
        return `<div class="stat" title="${esc(STAT_HINT[k])}"><span>${STAT_NAMES[k]}</span><span class="pips">${pips.join('')}</span><span class="v">${eff[k]}</span>
          <button class="plus" data-raise="${id}:${k}" ${canRaise(r, id, k) ? '' : 'disabled'} aria-label="Raise ${STAT_NAMES[k]}">+</button></div>`;
      }).join('');
      const pct = r.level >= MAX_LEVEL ? 100 : Math.round((r.exp / expToNext(r.level)) * 100);
      const starter = s.roster[s.lineup[m.role]] && member(s.lineup[m.role]);
      return `<div class="card ${dressed ? '' : 'benched'}">
        <div class="card-head">
          <img src="${portrait(id, 0, null, 152)}" alt="">
          <div style="min-width:0">
            <h3>${esc(m.name)}</h3>
            <div class="sub">${esc(m.title)}${m.recruit ? ' · signed' : ''}</div>
            <div class="lvl">LV ${r.level}${r.points ? ` <span style="font-size:15px">· ${r.points} point${r.points > 1 ? 's' : ''} to spend</span>` : ''}</div>
          </div>
        </div>
        ${dressed ? `<div class="dress on">${ROLE_NAME[m.role]} · dressed</div>` : `<button class="btn small dress" data-dress="${id}">Dress at ${ROLE_NAME[m.role].toLowerCase()} (for ${esc(starter.name)})</button>`}
        <div class="xpbar" title="${r.exp}/${expToNext(r.level)} EXP"><i style="width:${pct}%"></i></div>
        ${r.pendingPerk !== null ? `<div class="pending" data-perk="${id}">New perk unlocked: choose one</div>` : ''}
        <div class="stats">${stats}</div>
        <div class="gear-row">${['stick', 'skates', 'armor'].map((slot) => {
          const g = GEAR_BY_ID[r.gear[slot]];
          return `<button class="slot" data-gear="${id}:${slot}"><img src="${ico(g.icon, 92)}" alt=""><span>${esc(g.name)}</span></button>`;
        }).join('')}</div>
        <div class="abil"><img src="${ico(c.skill.icon, 68)}" alt=""><div><b>${esc(c.skill.name)}</b>${esc(c.skill.text)} <span class="muted">(${c.skill.cd}s)</span></div></div>
        <div class="abil"><img src="${ico('hud_elements/misc/level_star', 68)}" alt=""><div><b>${esc(c.ult.name)}</b>${esc(c.ult.text)}</div></div>
        ${r.perks.length ? `<div class="perks">${r.perks.map((p) => `<span class="perk" title="${esc(p)}">${esc(p.split(':')[0])}</span>`).join('')}</div>` : ''}
      </div>`;
    };
    const g = s.goalie;
    const gs = goalieStats(s);
    const gg = GEAR_BY_ID[g.gear];
    const gpct = g.level >= MAX_LEVEL ? 100 : Math.round((g.exp / expToNext(g.level)) * 100);
    const goalieCard = `<div class="card">
      <div class="card-head"><img src="${portrait('goalie', 0, null, 152)}" alt="">
        <div><h3>${esc(GOALIE.name)}</h3><div class="sub">Goaltender (AI)</div><div class="lvl">LV ${g.level}</div></div></div>
      <div class="xpbar"><i style="width:${gpct}%"></i></div>
      <div class="stats">
        <div class="stat"><span>Reflex</span><span class="pips">${Array.from({ length: 12 }, (_, i) => `<i class="${i < gs.rfx ? 'b' : ''}"></i>`).join('')}</span><span class="v">${gs.rfx}</span><span></span></div>
        <div class="stat"><span>Angles</span><span class="pips">${Array.from({ length: 12 }, (_, i) => `<i class="${i < gs.pos ? 'b' : ''}"></i>`).join('')}</span><span class="v">${gs.pos}</span><span></span></div>
      </div>
      <p class="muted" style="margin:0;font-size:12.5px">Halla levels up from saves. Reflex rises every two levels.</p>
      <div class="gear-row" style="grid-template-columns:1fr"><button class="slot" data-gear="goalie:goalie"><img src="${ico(gg.icon, 92)}" alt=""><span>${esc(gg.name)}</span></button></div>
    </div>`;
    const pairs = [];
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) pairs.push(pairKey(line[i], line[j]));
    body.innerHTML = `
      <div class="club-bar"><img src="${crest('home', 96)}" alt="" width="40" height="40"><div style="min-width:0"><b>${esc(CLUB.name)}</b><span class="muted">${esc(CLUB.short)} · the ${esc(CLUB.nick)}</span></div>
        <span class="club-sw" style="--a:${CLUB.trim};--b:${CLUB.jersey}"></span><button class="btn small ghost" id="club-edit">Customise club</button></div>
      <div class="label" style="margin-bottom:4px">Line-up</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">A centre, a winger and a defender dress for every match. Each position brings its kit: centres play Nix's frost kit, wingers Volta's thunder kit, defenders Bram's stone kit.</p>
      <div class="roster">${line.map((id) => card(id, true)).join('')}${goalieCard}</div>
      ${bench.length ? `<div class="label" style="margin:16px 0 4px">Bench</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Benched skaters don't earn match EXP, but you can bring them to training.</p>
      <div class="roster">${bench.map((id) => card(id, false)).join('')}</div>` : ''}
      <div class="label" style="margin:16px 0 4px">Chemistry</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Bonds grow between the people in your line through passes, assists and combo goals. The combo a pair fires depends on their positions. From level 1, pass between the pair and shoot right away (a one-timer works) to fire it. A new signing starts with no chemistry.</p>
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
    this.click('[data-gear]', (el) => { const [id, slot] = el.dataset.gear.split(':'); this.gearPicker(id, slot); }, body);
    this.click('[data-dress]', (el) => { setLineup(s, el.dataset.dress); writeSave(s); audio.sfx('confirm'); this.hub('team'); }, body);
    this.click('[data-sign]', (el) => this.signOffer(el.dataset.sign), body);
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
      return ['hud_elements/misc/home_crest', sk.frost_captain.home.south.frames.idle, sk.thunder_winger.home.south.frames.celebrate, sk.stone_defender.home.east.frames.idle];
    };
    const rc = () => {
      const p = { trim: hexToHsvUI(draft.trim), jersey: hexToHsvUI(draft.jersey), mode: 'home' };
      return draft.trim === CLUB_DEFAULT.trim && draft.jersey === CLUB_DEFAULT.jersey ? null : p;
    };
    this.modal(`
      <h2>Your club</h2>
      <div class="club-preview" id="club-preview"></div>
      <div class="club-form">
        <label>Club name<input id="club-name" maxlength="26" value="${esc(draft.name)}" autocomplete="off"></label>
        <label>Nickname <small class="muted">chants, commentary and dialogue</small><input id="club-nick" maxlength="16" value="${esc(draft.nick)}" autocomplete="off"></label>
        <label>Short code<input id="club-short" maxlength="3" value="${esc(draft.short)}" autocomplete="off" style="text-transform:uppercase;width:5.5em"></label>
      </div>
      <div class="label" style="font-size:15px;margin:4px 0 0">Colours</div>
      <div class="filters" style="margin:6px 0 0">${CLUB_PRESETS.map((p) => `<button class="chip preset" data-preset="${p.id}" aria-pressed="${p.trim === draft.trim && p.jersey === draft.jersey}"><span class="club-sw" style="--a:${p.trim};--b:${p.jersey}"></span>${esc(p.name)}</button>`).join('')}</div>
      <div class="row" style="gap:16px;margin-top:4px">
        <label class="color-pick">Trim <input type="color" id="club-trim" value="${draft.trim}"></label>
        <label class="color-pick">Jersey <input type="color" id="club-jersey" value="${draft.jersey}"></label>
      </div>
      <div class="row" style="justify-content:space-between">
        <button class="btn small ghost" id="club-reset">Reset to ${esc(CLUB_DEFAULT.name)}</button>
        <span class="row" style="gap:8px"><button class="btn small ghost" data-close>Cancel</button><button class="btn gold" id="club-save">Save club</button></span>
      </div>`, (m, close) => {
      const $ = (sel) => m.querySelector(sel);
      const paint = () => {
        const r = rc();
        $('#club-preview').innerHTML = previewIds().map((id, i) => `<img src="${Assets.previewIcon(id, i ? 132 : 96, r)}" alt="">`).join('')
          + `<div class="club-name-preview"><b>${esc(draft.name)}</b><span>${esc(draft.short)} · ${esc(draft.nick)}</span></div>`;
        m.querySelectorAll('[data-preset]').forEach((b) => { const p = CLUB_PRESETS.find((x) => x.id === b.dataset.preset); b.setAttribute('aria-pressed', p.trim === draft.trim && p.jersey === draft.jersey); });
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
    const teams = ['lynx', 'comets', 'rams', 'ravens', 'royals'];
    const rows = teams.map((tid) => {
      const t = TEAMS[tid];
      const keys = ['frost', 'thunder', 'stone'].map((kit) => recruitKey(tid, kit));
      const open = recruitStatus(s, keys[0]) !== 'locked' || keys.some((k) => isSigned(s, k));
      const players = keys.map((k) => {
        const r = RECRUITS[k];
        const st = recruitStatus(s, k);
        const top = Object.entries(r.base).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([sk, v]) => `${STAT_NAMES[sk]} ${v}`).join(' · ');
        const face = st === 'signed' ? portrait(k, 0, null, 96) : portrait(r.kit, 1, tid, 96);
        return `<div class="recruit ${st}">
          <img src="${face}" alt="">
          <div style="min-width:0"><b>${esc(r.name)}</b><span class="muted">${ROLE_NAME[r.role]} · ${esc(top)}</span></div>
          ${st === 'signed' ? '<span class="tag good">Signed</span>' : st === 'open' ? `<button class="btn small ${s.coins >= r.price ? 'gold' : 'ghost'}" data-sign="${k}"><img src="${ico('equipment_items/reward/coins', 40)}" alt="" width="16" height="16"> ${r.price}</button>` : '<span class="tag">Locked</span>'}
        </div>`;
      }).join('');
      return `<div class="scout-team ${open ? '' : 'locked'}">
        <div class="scout-head"><img src="${crest(tid, 48)}" alt="" width="28" height="28"><b>${esc(t.name)}</b>${open ? '' : '<span class="muted"> · beat them to open talks</span>'}</div>
        <div class="recruits">${players}</div>
      </div>`;
    }).join('');
    return `<div class="label" style="margin:16px 0 4px">Scouting</div>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Beat a rival and their skaters will take your call. Signings join a level below your line-up's average with points to spend and the perks they already had.</p>
      <div class="scouting">${rows}</div>`;
  }

  signOffer(key) {
    const s = this.app.save;
    const r = RECRUITS[key];
    const m = member(key);
    const lv = joinLevel(s);
    const starter = member(s.lineup[r.role]);
    const perks = CHARACTERS[r.kit].perks.filter((_, i) => lv >= [3, 5, 7][i]).map((opts, i) => opts[r.perks[i]].split(':')[0]);
    audio.sfx('click');
    this.modal(`
      <h2>Sign ${esc(r.name)}?</h2>
      <div class="card-head" style="margin:0"><img src="${portrait(r.kit, 1, r.team, 152)}" alt="" style="width:76px;height:76px">
        <div><div class="sub">${esc(TEAMS[r.team].name)} · ${ROLE_NAME[r.role]}</div><p style="margin:4px 0 0">${esc(r.blurb)}</p></div></div>
      <div class="stats">${STAT_KEYS.map((k) => {
        const diff = r.base[k] - starter.base[k];
        return `<div class="stat"><span>${STAT_NAMES[k]}</span><span class="pips">${Array.from({ length: 12 }, (_, i) => `<i class="${i < r.base[k] ? 'b' : ''}"></i>`).join('')}</span><span class="v">${r.base[k]}</span><span class="${diff > 0 ? 'good' : diff < 0 ? 'bad' : 'muted'}" style="font-size:12px">${diff > 0 ? '+' : ''}${diff || '='}</span></div>`;
      }).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px">Base stats, compared with ${esc(starter.name)}. Plays the ${ROLE_NAME[r.role].toLowerCase()} kit (${esc(m.def.skill.name)}, ${esc(m.def.ult.name)}). Joins at level ${lv} with ${lv - 1} point${lv === 2 ? '' : 's'} to spend${perks.length ? ` and ${perks.join(', ')}` : ''}. No chemistry with your line yet.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>Not now</button>
        <button class="btn gold" id="sign-go" ${s.coins >= r.price ? '' : 'disabled'}>Sign for ${r.price}</button></div>`, (mm, close) => {
      this.click('#sign-go', () => {
        if (!signRecruit(s, key)) return;
        this.app.ach.unlock('signing');
        this.app.ach.checkMeta();
        writeSave(s);
        audio.jingle('sign');
        close();
        Assets.ensureKit(homeKitGroups(s)).then(() => this.hub('team'));
        this.modal(`<h2>${esc(r.name)} signs!</h2>
          <p>${esc(r.name)} joins the ${esc(CLUB.nick)} on your bench. Dress ${esc(r.name)} at ${ROLE_NAME[r.role].toLowerCase()} from the Team tab, or before a match.</p>
          <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>Later</button><button class="btn gold" id="dress-now">Dress now</button></div>`, (m2, close2) => {
          this.click('#dress-now', () => { setLineup(s, key); writeSave(s); audio.sfx('confirm'); close2(); this.hub('team'); }, m2);
        });
      }, mm);
    });
  }

  // Quick line-up change, one row per position.
  lineupPicker(done) {
    const s = this.app.save;
    const ids = rosterIds(s);
    audio.sfx('click');
    const render = () => ['C', 'W', 'D'].map((role) => `
      <div class="label" style="font-size:14px;margin:8px 0 4px">${ROLE_NAME[role]}</div>
      <div class="filters" style="margin:0">${ids.filter((id) => member(id).role === role).map((id) => `
        <button class="chip" data-line="${id}" aria-pressed="${s.lineup[role] === id}" style="display:inline-flex;gap:6px;align-items:center">
          <img src="${portrait(id, 0, null, 64)}" width="24" height="24" alt="">${esc(member(id).name)} <span class="muted">LV ${s.roster[id].level}</span></button>`).join('')}</div>`).join('');
    this.modal(`<h2>Line-up</h2><div id="lp">${render()}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn gold" data-close>Done</button></div>`, (m) => {
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
      <h2>${esc(c.name)}: choose a perk</h2>
      <p class="muted">Level ${PERK_LEVEL_LABEL(r.pendingPerk)} perk. You keep this choice for good.</p>
      <div class="choice">${opts.map((p, i) => `<button class="btn ghost" data-pick="${i}"><b>${esc(p.split(':')[0])}</b>${esc(cap((p.split(':')[1] || '').trim()))}</button>`).join('')}</div>`,
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
    const cur = id === 'goalie' ? s.goalie.gear : s.roster[id].gear[slot];
    const who = id === 'goalie' ? GOALIE.name : member(id).name;
    audio.sfx('click');
    this.modal(`
      <h2>${esc(who)} · ${SLOT_NAMES[slot]}</h2>
      <div class="choice">${items.map((g) => `
        <button class="btn ${g.id === cur ? 'cream' : 'ghost'}" data-eq="${g.id}" style="display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center">
          <img src="${ico(g.icon, 92)}" alt="" width="52" height="52">
          <span><b>${esc(g.name)}${g.id === cur ? ' (equipped)' : ''}</b>${modsHtml(g.mods)}${lookHtml(g.id)}</span>
        </button>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:12.5px">Buy more gear in the shop. Owned gear can be shared by the whole team.</p>
      <button class="btn small ghost" data-close>Done</button>`, (m, close) => {
      this.click('[data-eq]', (el) => {
        if (id === 'goalie') s.goalie.gear = el.dataset.eq; else s.roster[id].gear[slot] = el.dataset.eq;
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
      <div class="filters">${['all', 'stick', 'skates', 'armor', 'goalie'].map((f) => `<button class="chip" data-f="${f}" aria-pressed="${filter === f}">${f === 'all' ? 'All' : SLOT_NAMES[f]}</button>`).join('')}</div>
      ${npc('shopkeeper', s.coins < 150 ? pick(['Short on coins? Win a few and come back. I\'ll keep it polished.', 'Browsing is free. Buying is not.']) : pick(['Every piece trades something away. Ask what it costs you, not just the coins.', 'Forged it myself. Well, most of it.', 'That stick? Lightning in a bottle. Mind the recoil.']))}
      <p class="muted" style="margin:0 0 10px;font-size:13px">Every item trades something away. Bought gear unlocks for the whole team; equip it from the Team tab.</p>
      <div class="shop">${items.map((g) => {
        const owned = s.owned.includes(g.id);
        const price = Math.round(g.price * (1 - (s.discount || 0)));
        const afford = s.coins >= price;
        return `<div class="item">
          <img src="${ico(g.icon, 128)}" alt="">
          <div style="min-width:0">
            <div class="label" style="font-size:13px">${SLOT_NAMES[g.slot]}</div>
            <h4>${esc(g.name)}</h4>
            <p>${esc(g.text)}</p>
            ${modsHtml(g.mods)}${lookHtml(g.id)}
            <div class="buy">${owned ? '<span class="good" style="font-family:var(--display);font-size:20px">OWNED</span>'
              : `<span class="price"><img src="${ico('equipment_items/reward/coins', 40)}" alt="">${price}${s.discount ? ` <s class="muted" style="font-size:14px">${g.price}</s>` : ''}</span>
                 <button class="btn small ${afford ? 'gold' : ''}" data-buy="${g.id}" ${afford ? '' : 'disabled'}>Buy</button>`}</div>
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
      if (g.slot === 'goalie') { s.goalie.gear = g.id; writeSave(s); this.hub('shop'); return; }
      this.modal(`
        <h2>${esc(g.name)} unlocked</h2>
        ${modsHtml(g.mods)}
        <p class="muted">Equip it on someone now?</p>
        <div class="row">${rosterIds(s).map((id) => `<button class="btn ghost small" data-who="${id}" style="display:flex;gap:6px;align-items:center"><img src="${portrait(id, 0, null, 64)}" width="32" height="32" alt="">${esc(member(id).name)}</button>`).join('')}</div>
        <button class="btn small ghost" data-close>Later</button>`, (m, close) => {
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
      ${npc('coach', tr.sessions ? pick(['Cone Weave builds legs, Sniper builds hands. Pick one and sweat.', 'Gold medals don\'t come from watching. Lace up.', 'Keep-Away is where chemistry starts. Move the puck!']) : 'No rewarded sessions left. Play a match, then come back and work.')}
      <div class="train-top">
        <div><div class="label">Training rink</div>
          <p style="margin:2px 0 0;font-size:13px">Play drills to earn EXP for the skater you bring. Rewarded sessions refill after every match; practice is always free.</p></div>
        <div class="sessions"><span class="pips3">${pips(tr.sessions)}</span> ${tr.sessions} rewarded session${tr.sessions === 1 ? '' : 's'} left</div>
      </div>
      <div class="row" style="margin:10px 0">
        <span class="label" style="font-size:15px">Skater:</span>
        ${rosterIds(s).map((id) => `<button class="btn small ${this.drillChar === id ? 'cream' : 'ghost'}" data-char="${id}" style="display:flex;gap:6px;align-items:center"><img src="${portrait(id, 0, null, 64)}" width="28" height="28" alt="">${esc(member(id).name)}</button>`).join('')}
      </div>
      <div class="drills">${Object.values(DRILLS).map((d) => {
        const best = tr.best[d.id];
        const medal = tr.medals[d.id] || 0;
        return `<div class="card drill">
          <div class="card-head"><img src="${ico(d.icon, 128)}" alt="" style="border:0;background:none">
            <div style="min-width:0"><h3>${esc(d.name)}</h3><div class="sub">Trains ${esc(d.trains)}</div>
              <div class="medal-row">${[1, 2, 3].map((t) => `<span class="medal ${t <= medal ? 'got' : ''}" style="--m:${MEDAL_COLORS[t]}" title="${MEDAL_NAMES[t]}: ${formatScore(d, d.medals[t - 1])}">${formatScore(d, d.medals[t - 1])}</span>`).join('')}</div>
            </div></div>
          <p class="muted" style="margin:0;font-size:13px">${esc(d.text)}</p>
          <div class="row" style="justify-content:space-between">
            <span style="font-size:13px">Best: <b class="gold-t">${best === undefined || best === null ? '–' : formatScore(d, best)}</b></span>
            <button class="btn small ${tr.sessions > 0 ? 'gold' : ''}" data-play="${d.id}">${tr.sessions > 0 ? 'Train' : 'Practice'}</button>
          </div>
        </div>`;
      }).join('')}</div>`;
    this.click('[data-char]', (el) => { this.drillChar = el.dataset.char; audio.sfx('click'); this.tabTraining(body); }, body);
    this.click('[data-play]', (el) => { audio.sfx('confirm'); this.app.startDrill(el.dataset.play, this.drillChar); }, body);
  }

  // Result card after a drill: score, medal, rewards; Retry or Done.
  drillResult(d, score, rw, charId, onRetry, onDone) {
    const name = member(charId).name;
    const medal = rw.medal;
    const lines = [];
    if (rw.exp) lines.push([`${name} +${rw.exp} EXP`, '']);
    if (rw.coins - rw.bonus > 0) lines.push(['Session coins', `+${rw.coins - rw.bonus}`]);
    if (rw.bonus) lines.push([`First ${MEDAL_NAMES[medal].toLowerCase()} medal`, `+${rw.bonus}`]);
    if (!rw.rewarded) lines.push(['Practice run (no sessions left)', '']);
    const ups = rw.ups.length ? `<div class="lvlup">${name} reached level ${rw.ups[rw.ups.length - 1].level}!</div>` : '';
    this.modal(`
      <div style="text-align:center">
        <div class="label">${esc(d.name)}</div>
        <div class="drill-score">${formatScore(d, score)}</div>
        <div class="medal-big" style="--m:${MEDAL_COLORS[medal]}">${MEDAL_NAMES[medal]}${rw.newBest && rw.prevBest !== undefined && rw.prevBest !== null ? ' · new best!' : ''}</div>
        <div class="muted" style="font-size:13px">Bronze ${formatScore(d, d.medals[0])} · Silver ${formatScore(d, d.medals[1])} · Gold ${formatScore(d, d.medals[2])}</div>
      </div>
      ${lines.length ? `<div class="reward-lines">${lines.map(([a, b]) => `<div><span>${esc(a)}</span><span class="gold-t">${b}</span></div>`).join('')}</div>` : ''}
      ${ups}
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="d-retry">Retry</button><button class="btn gold" id="d-done">Done</button></div>`, (m, close) => {
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

  // Music room: play any track. The scene's music comes back on close.
  jukebox() {
    audio.unlock();
    const list = audio.tracks();
    const back = this.app.track;
    const mark = (m, id) => m.querySelectorAll('[data-track]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.track === id)));
    this.modal(`
      <h2>Music room</h2>
      <p class="muted" style="margin-top:0">Every track is played live by the game's chiptune engine.</p>
      <div class="jukebox">${list.map((t) => `<button class="chip" data-track="${t.id}" aria-pressed="false">${esc(t.name)}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn small" data-close>Close</button></div>`, (m) => {
      mark(m, audio.songName);
      this.click('[data-track]', (el) => { audio.play(el.dataset.track); mark(m, el.dataset.track); }, m);
    }, true, () => { if (back) audio.play(back); });
  }

  settings() {
    const s = this.app.save;
    const st = s.settings;
    const seg = (key, opts) => `<span class="seg">${opts.map(([v, label]) => `<button class="chip" data-set="${key}" data-v="${v}" aria-pressed="${String(st[key]) === String(v)}">${label}</button>`).join('')}</span>`;
    const row = (label, ctl, hint) => `<div class="toggle"><span>${label}${hint ? `<small class="muted" style="display:block;font-size:11.5px">${hint}</small>` : ''}</span>${ctl}</div>`;
    const onOff = (key) => seg(key, [[true, 'On'], [false, 'Off']]);
    const body = () => `
      <h2>Settings</h2>
      <div class="label">Sound</div>
      ${row('Music', seg('musicVol', VOLUMES))}
      ${row('Sound effects', seg('sfxVol', VOLUMES))}
      ${row('Music room', '<button class="btn small ghost" id="s-jukebox">Listen</button>', 'Every track in the game, from the title theme to the Cup Final.')}
      <div class="label">Gameplay</div>
      ${row('Rival difficulty', seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']]))}
      ${row('Aim assist', seg('assist', [['off', 'Off'], ['normal', 'Normal'], ['strong', 'Strong']]), 'Strong tightens your shots and widens pass catching. Off aims dead centre unless you steer.')}
      ${row('Auto-sprint', seg('autoSprint', [[false, 'Off'], [true, 'On']]), 'Sprint whenever the stick is pushed all the way.')}
      ${row('Game speed', seg('speed', [['normal', 'Normal'], ['relaxed', 'Relaxed']]), 'Relaxed plays matches at 85% speed. Drills stay at full speed.')}
      ${row('Goal replays', onOff('replays'))}
      ${row('Goal clips', onOff('clips'), 'Record each replay as a short video you can share.')}
      <div class="label">Comfort</div>
      ${row('Screen shake', seg('shake', [[1, 'Full'], [0.5, 'Low'], [0, 'Off']]))}
      ${row('Flashes', onOff('flashes'), 'Screen flashes and blinking goal lights.')}
      ${row('Effects', seg('particles', [['full', 'Full'], ['reduced', 'Reduced']]), 'Fewer sparks, snow sprays and confetti.')}
      <div class="label">Visibility and controls</div>
      ${row('Team markers', seg('markers', [['color', 'Colors'], ['shapes', 'Shapes']]), 'Shapes: blue triangles for your team, orange diamonds for rivals.')}
      ${row('Text size', seg('textSize', [['normal', 'Normal'], ['large', 'Large']]))}
      ${row('Touch buttons', seg('touchSize', [['normal', 'Normal'], ['large', 'Large'], ['huge', 'Huge']]))}
      ${row('Touch layout', seg('lefty', [[false, 'Stick left'], [true, 'Stick right']]))}
      ${row('Play offline', `<span style="font-size:13px;text-align:right;max-width:30ch">${installHelp(this.app)}</span>`)}
      <div class="label">Controls</div>
      ${controlsHtml(this.app.isTouch)}
      <div class="toggle"><span class="muted">Erase the save and start over</span><button class="btn small ghost" id="s-reset">Reset save</button></div>
      <button class="btn small" id="s-close">Close</button>`;
    this.modal(body(), (m, close) => {
      const bind = () => {
        this.click('[data-set]', (el) => {
          const v = el.dataset.v;
          st[el.dataset.set] = v === 'true' ? true : v === 'false' ? false : Number.isNaN(+v) ? v : +v;
          if (el.dataset.set === 'musicVol') st.music = st.musicVol > 0;
          if (el.dataset.set === 'sfxVol') st.sfx = st.sfxVol > 0;
          writeSave(s);
          audio.sfx('click');
          this.app.applySettings();
          const y = m.scrollTop;
          m.innerHTML = body(); bind(); m.scrollTop = y;
        }, m);
        this.click('#s-install', async () => { await this.app.install(); m.innerHTML = body(); bind(); }, m);
        this.click('#s-close', () => { audio.sfx('back'); close(); }, m);
        this.click('#s-jukebox', () => { audio.sfx('click'); this.jukebox(); }, m);
        this.click('#s-reset', (el) => {
          if (el.dataset.armed) { clearSave(); close(); this.app.resetSave(); return; }
          el.dataset.armed = '1'; el.textContent = 'Tap again to erase'; el.classList.add('gold');
        }, m);
      };
      bind();
    });
  }

  // -------------------------------------------------------------- dialogue
  // lines: [side ('us'|'them'), charId, text]
  dialogue(lines, teamId, header, onDone, mood = null) {
    lines = lines.map((l) => [l[0], l[1], clubText(l[2])]);
    const t = TEAMS[teamId];
    let i = 0, typing = null, shown = 0;
    const ours = (l) => portrait(l[1], 0, null, 420, expression('us', l[2], mood));
    const gone = (id) => isSigned(this.app.save, recruitKey(teamId, id));
    const theirs = (l) => portrait(gone(l[1]) ? 'sub_' + l[1] : l[1], 1, teamId, 420, expression('them', l[2], mood));
    const r = this.set(`
      <div class="dim"></div>
      <div class="dlg" id="dlg">
        <button class="btn small ghost dlg-skip" id="dlg-skip">Skip</button>
        ${header ? `<div class="dlg-head"><div class="vs">${esc(CLUB.nick)}<em>vs</em>${esc(t.name.split(' ').slice(-1)[0])}</div>${header.sub ? `<div class="twist">${esc(header.sub)}</div>` : ''}</div>` : ''}
        <div class="portraits"><img id="pl" alt=""><img id="pr" class="them" alt=""></div>
        <div class="dlg-box panel"><div class="dlg-name" id="dn"></div><div class="dlg-text" id="dt"></div><div class="dlg-more">▼</div></div>
      </div>`);
    const pl = r.querySelector('#pl'), pr = r.querySelector('#pr'), dn = r.querySelector('#dn'), dt = r.querySelector('#dt');
    const show = () => {
      const [side, id, text] = lines[i];
      const us = side === 'us';
      const lastUs = [...lines.slice(0, i + 1)].reverse().find((l) => l[0] === 'us');
      const lastThem = [...lines.slice(0, i + 1)].reverse().find((l) => l[0] === 'them') || lines.find((l) => l[0] === 'them');
      pl.src = ours(lastUs || ['us', 'frost', '']);
      if (lastThem) { pr.src = theirs(lastThem); pr.hidden = false; } else pr.hidden = true;
      pl.classList.toggle('on', us); pr.classList.toggle('on', !us);
      dn.textContent = us ? member(id)?.name || GOALIE.name : gone(id) ? t.subs[id] : t.names[id];
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
    const t = TEAMS[teamId];
    const won = summary.winner === 0;
    const mine = summary.skaters.filter((s) => s.team === 0);
    const score = (s) => s.goals * 3 + s.assists * 2 + s.steals + s.blocks + s.hits * 0.5;
    const mvp = [...summary.skaters].sort((a, b) => score(b) - score(a))[0];
    const s = this.app.save;
    const r = this.set(`
      <div class="dim"></div>
      <div class="results panel">
        <div class="res-head">
          <h1 class="${won ? 'gold-t' : ''}">${won ? 'Victory!' : 'Defeat'}</h1>
          <div class="score">${esc(CLUB.nick)} ${summary.score[0]} – ${summary.score[1]} ${esc(t.name.split(' ').slice(-1)[0])}</div>
          <div class="muted">${exhibition ? 'Exhibition' : esc(data.round || '')} · Shots on goal ${summary.shots[0]}–${summary.shots[1]}</div>
        </div>
        <div class="res-grid">
          <div>
            <div class="label">Box score</div>
            <table class="res-table"><thead><tr><th>Player</th><th>G</th><th>A</th><th>SOG</th><th>STL</th><th>HIT</th></tr></thead><tbody>
              ${summary.skaters.map((k) => `<tr style="color:${k.team === 0 ? 'var(--cream)' : '#f5b3bb'}"><td>${esc(k.name)}</td><td>${k.goals}</td><td>${k.assists}</td><td>${k.shots}</td><td>${k.steals}</td><td>${k.hits}</td></tr>`).join('')}
            </tbody></table>
            <div class="mvp" style="margin-top:10px"><img src="${portrait(mvp.id, mvp.team, teamId, 128)}" alt=""><div><div class="label">Player of the match</div><div style="font-family:var(--display);font-size:28px">${esc(mvp.name)}</div></div></div>
          </div>
          <div>
            <div class="label">Rewards</div>
            <div class="reward-lines">${rewards.lines.map(([a, b]) => `<div><span>${esc(a)}</span><span class="gold-t">${b ? '+' + b : ''}</span></div>`).join('')}</div>
            <div class="reward-total"><span>Coins</span><span>+${rewards.coins}</span></div>
            <div class="label" style="margin-top:10px">Experience</div>
            <div style="display:grid;gap:6px">
              ${mine.map((k) => {
                const rr = s.roster[k.id];
                const lu = ups.filter((u) => u.id === k.id);
                const pct = rr.level >= MAX_LEVEL ? 100 : Math.round((rr.exp / expToNext(rr.level)) * 100);
                return `<div class="xp-row"><img src="${portrait(k.id, 0, null, 88)}" alt="">
                  <div><div>${esc(k.name)} <span class="muted">+${rewards.exp[k.id]} EXP</span> ${lu.length ? `<span class="lvlup">LEVEL ${rr.level}!</span>` : ''}</div>
                  <div class="xpbar"><i data-w="${pct}"></i></div></div><span class="lvl">LV ${rr.level}</span></div>`;
              }).join('')}
              ${data.rewards.chem ? `<div class="label" style="margin-top:6px">Chemistry</div>
              ${Object.entries(data.rewards.chem).map(([k, g]) => {
                const [a, b] = k.split('+');
                const cb = comboFor(k);
                const up = (data.chemUps || []).find((u) => u.key === k);
                return `<div class="xp-row"><span class="duo small"><img src="${portrait(a, 0, null, 64)}" alt=""><img src="${portrait(b, 0, null, 64)}" alt=""></span>
                  <div><div>${esc(cb ? cb.name : 'Chemistry')} <span class="muted">+${g.xp} · ${g.passes} passes${g.comboGoals ? ` · ${g.comboGoals} combo goal${g.comboGoals > 1 ? 's' : ''}` : ''}</span> ${up ? `<span class="lvlup">LEVEL ${up.level}!</span>` : ''}</div>
                  <div class="xpbar"><i data-w="${Math.round(chemProgress(s.chem[k]) * 100)}"></i></div></div><span class="lvl">${chemPips(chemLevel(s.chem[k]))}</span></div>`;
              }).join('')}` : ''}
              <div class="xp-row"><img src="${portrait('goalie', 0, null, 88)}" alt=""><div><div>${GOALIE.name} <span class="muted">+${rewards.gExp} EXP · ${summary.saves[0]} saves</span>${data.gUp ? ' <span class="lvlup">LEVEL UP!</span>' : ''}</div></div><span class="lvl">LV ${s.goalie.level}</span></div>
            </div>
          </div>
        </div>
        ${data.clips && data.clips.clips.length ? `<div>
          <div class="label">Highlights</div>
          <div class="clips">${data.clips.clips.map((c, i) => `<div class="clip">
            <video src="${c.url}" muted loop playsinline autoplay></video>
            <div class="clip-line">${esc(c.meta.line)}</div>
            <div class="row" style="gap:6px">${data.clips.canShare(c) ? `<button class="btn small cream" data-share="${i}">Share</button>` : ''}<a class="btn small ghost" href="${c.url}" download="${esc(data.clips.fileFor(c, i).name)}">Save</a></div>
          </div>`).join('')}</div>
        </div>` : ''}
        <div class="row" style="justify-content:flex-end"><button class="btn gold" id="r-go">Continue</button></div>
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
      <h2>Chemistry level up!</h2>
      ${ups.map((u) => {
        const c = comboFor(u.key);
        const [a, b] = u.key.split('+');
        const na = member(a).name, nb = member(b).name;
        return `<div class="card chem" style="gap:6px">
          <div class="chem-head"><span class="duo"><img src="${portrait(a, 0, null, 96)}" alt=""><img src="${portrait(b, 0, null, 96)}" alt=""></span>
          <div><h3>${esc(c.name)}</h3><div class="sub">${esc(na)} + ${esc(nb)} · level ${u.level}</div></div></div>
          <p style="margin:0">${u.level === 1 ? `${esc(c.text)}<br><b class="gold-t">How:</b> pass from ${esc(na)} to ${esc(nb)} (or back), then shoot right away. Holding shoot as the pass arrives fires it as a one-timer.` : esc(c.levels[u.level - 1])}</p>
        </div>`;
      }).join('')}
      <button class="btn gold" data-close>Got it</button>`, null, false, done);
  }

  champion(onDone) {
    const s = this.app.save;
    this.set(`
      <div class="dim"></div>
      <div class="results panel" style="text-align:center;align-items:center">
        <img src="${ico('equipment_items/reward/trophy', 256)}" alt="" width="150" height="150">
        <h1 class="gold-t" style="font-family:var(--display);font-weight:normal;font-size:clamp(44px,9vw,80px);line-height:.85;margin:0">Champions!</h1>
        <p style="max-width:46ch">The ${esc(CLUB.name)} win the ${esc(TOURNAMENT.name)}${s.season > 1 ? ` (season ${s.season})` : ''}. Nix lifts the cup while Volta does laps and Bram carries Halla around on his shoulders.</p>
        <p class="muted" style="max-width:46ch">Start a new season to face every rival again with sharper AI, keeping your levels and gear.</p>
        <div class="row" style="justify-content:center"><button class="btn gold" id="c-go">Back to the hub</button></div>
      </div>`);
    audio.jingle('win');
    this.click('#c-go', () => { audio.sfx('confirm'); onDone(); });
  }
}

const PERK_LEVEL_LABEL = (i) => [3, 5, 7][i];

function installHelp(app) {
  if (app.standalone) return '<span class="good">Installed. Plays offline.</span>';
  if (!app.canOffline) return 'Open the game from its https address to install it and play offline.';
  if (app.installPrompt) return '<button class="btn small cream" id="s-install">Install app</button>';
  if (app.isIOS) return 'In Safari tap Share, then Add to Home Screen.';
  return 'Use your browser menu: Install app / Add to Home screen.';
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
      <div style="min-width:0"><h3>${esc(c.name)}</h3><div class="sub">${esc(member(a).name)} + ${esc(member(b).name)}</div></div>
      ${chemPips(lvl)}
    </div>
    <div class="xpbar" title="${xp} chemistry${next ? ` / ${next}` : ''}"><i style="width:${Math.round(chemProgress(xp) * 100)}%"></i></div>
    <p style="margin:0;font-size:13px">${esc(c.text)}</p>
    <div class="chem-levels">${c.levels.map((t, i) => `<span class="${i < lvl ? 'got' : ''}">Lv${i + 1} · ${esc(t)}</span>`).join('')}</div>
  </div>`;
}

export function controlsHtml(touch) {
  if (touch) {
    return `<div class="keys">
    <kbd>Left thumb</kbd><span>Touch anywhere on the left half and drag to skate</span>
    <kbd>SHOOT</kbd><span>Tap for a wrist shot, hold for a slapshot. Hold it as a pass arrives for a one-timer</span>
    <kbd>CHECK</kbd><span>Same button without the puck: shoulder check</span>
    <kbd>PASS</kbd><span>Passes toward the teammate you're steering at. Without the puck it switches player</span>
    <kbd>SPRINT</kbd><span>Hold for speed (uses stamina)</span>
    <kbd>Snowflake</kbd><span>Signature ability (swaps per character)</span>
    <kbd>Star</kbd><span>Ultimate, when it glows gold</span>
    <kbd>Pull goalie</kbd><span>Appears when you're behind and they need one more goal</span>
  </div>`;
  }
  return `<div class="keys">
    <kbd>WASD / Arrows</kbd><span>Skate</span>
    <kbd>Shift</kbd><span>Sprint (uses stamina)</span>
    <kbd>J / Space</kbd><span>Shoot: tap for a wrist shot, hold for a slapshot. Without the puck: check</span>
    <kbd>K / Enter</kbd><span>Pass (aim with movement). Without the puck: switch player</span>
    <kbd>U / Q</kbd><span>Signature ability</span>
    <kbd>I / E</kbd><span>Ultimate (when the gold meter is full)</span>
    <kbd>H</kbd><span>Pull the goalie for an extra attacker (when trailing and they need one more goal)</span>
    <kbd>Esc / P</kbd><span>Pause</span>
    <kbd>Gamepad</kbd><span>Stick to skate · X/RT shoot-check · A pass-switch · RB sprint · B skill · Y ultimate</span>
    <kbd>Touch</kbd><span>Left thumb anywhere to skate · right-side buttons for actions</span>
  </div>`;
}
