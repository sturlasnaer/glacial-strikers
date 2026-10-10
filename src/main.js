// Puckbound — boot, game loop and scene flow.

import { Assets } from './assets.js';
import { Match, PENALTY_SECONDS } from './match.js';
import { Renderer } from './render.js';
import { FX } from './fx.js';
import { Input, TouchControls, mergeInputs } from './input.js';
import { audio } from './audio.js';
import { PadNav } from './padnav.js';
import { forceSeason, seasonFor } from './seasonal.js';
import { firstTime } from './guide.js';
import { submit as submitScore, flush as flushScores, BOARD_INFO, backup as cloudBackup, settleCups } from './online.js';
import { ARENA_MUSIC } from './songs.js';
import { ResurfacerLap } from './scenery.js';
import { UI, controlsHtml, crest, ruleIconSrc, cupPlaceImg, portrait, shotMapSvg, esc, hintKeys } from './ui.js';
import { seasonReview } from './review.js';
import { updateRecords, GAME_RECORDS } from './records.js';
import { noteCup, hallCandidates, induct } from './hall.js';
import { pressWorthy, pressPlayer, answerPress } from './press.js';
import { chantBoost, trainingSessions } from './facilities.js';
import { isKey, setKeyMap, setPadMap } from './keys.js';
import { HUD } from './hud.js';
import { toScreen } from './rink.js';
import { Replay } from './replay.js';
import { Commentary } from './commentary.js';
import { ClipRecorder } from './clips.js';
import { AchievementTracker, useAchievementArt, ACHIEVEMENTS } from './achievements.js';
import { createDrill, medalFor, DRILL_REWARDS } from './drills.js';
import { makeSkills, recordSkills, SKILLS_EVENTS } from './skills.js';
import { recordRivalResult, rivalLines, rivalAfterLine, rivalRecord } from './rivals.js';
import { recordRealGame, computeAwards, AWARD_BY_ID } from './awards.js';
import { dailyFor, dailyGoal, completeDaily, noteAttempt, dayKey, dailyState } from './daily.js';
import { standings } from './league.js';
import { nextFixture, recordOurGame, newLeague, rivalPlan, recordClassic, recordAllStar } from './league.js';
import { updateSeasonGoals, goalStates } from './goals.js';
import { pickMoment, markSeen, buffEffects } from './lockerroom.js';
import { GOAL_X } from './rink.js';
import { member, goalieInfo, TEAMS, TOURNAMENT, DIALOGUE, TWIST_INFO, POWER_INFO, COMBOS, CHARACTERS, GOALIE, GAME_PLANS, PLAYOFF_LINES, ROLE, recruitKey, ARENAS, CLUB, applyClub, GEAR_LOOK, RECRUITS, ROOKIES, setRookies, ALLSTAR, teamInfo, slotDef, LEGENDS, LEGEND_ART, LEGEND_FACES, useNewArt, setFreeGoalies, setGoalieLooks, useCaptainArt, setStyles, RIVAL_IDS, slotSprite, slotLook, EXPANSION_LINES } from './data.js';
import { rollLegend, legendState, STAY, joinLegend, LEGEND_LINES, twinsFirstTogether } from './legends.js';
import { rivalSigning, rivalOffer } from './moves.js';
import { refreshAgents } from './agents.js';
import { addNews } from './news.js';
import { teamHasParts, setFills, retireRivals } from './slots.js';
import { useModular, useGoalieParts, goalieArt } from './modular.js';
import { Quality } from './quality.js';
import { offerDraft } from './draft.js';
import { recordCareer, addSeatTotals } from './career.js';
import {
  loadSave, newSave, writeSave, setSaveOff, matchConfig, computeRewards, applyExp, applyGoalieExp, applyChem, drillRewards,
  lineupIds, homeKitGroups, allStarVote, allStarVoteStands, allStarConfig, setLeagueEdge, rosterIds, goalieIds,
} from './progress.js';
import { t, setLang, getLang, defaultLang } from './i18n.js';
import { whatsNewFor } from './whatsnew.js';

const STEP = 1 / 60;
// Vibrate only once the player has interacted (browsers block it before that).
const buzz = (p) => { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(p); };
const RIVALS = RIVAL_IDS;
const RULE_ART = ['meltwater', 'aurora_lanes', 'pond_cracks', 'cracked_ice', 'both', 'speed_lanes', 'rumble_strips', 'shadow_zones', 'moonbeams', 'loose_planks']; // rules drawn with the rule sprites

const INTRO = [
  ['us', 'frost', 'Welcome to the Frostline Regional Cup, Foxes. Five rounds, then the top four play it off for the cup.'],
  ['us', 'thunder', 'Five rounds? I\'ll score five goals in the first match alone.'],
  ['us', 'stone', 'You\'ll score five because I\'m clearing the way. Pass to the open player, Volta.'],
  ['us', 'frost', 'Win matches, earn coins and EXP, then upgrade our gear in the hub. Let\'s go.'],
];

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.loadingEl = document.getElementById('loading');
    this.rotateEl = document.getElementById('rotate');
    this.scene = 'loading';
    this.acc = 0;
    this.last = 0;
    this.prevPause = false;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  async boot() {
    const bar = this.loadingEl.querySelector('.bar i');
    try {
      await Assets.load((f) => { bar.style.width = Math.round(f * 100) + '%'; });
      setTimeout(() => Assets.prefetch(), 1200);
      // the legends wear their own art once it's in (?legends=1 previews them before it is)
      for (const L of Object.values(LEGENDS)) {
        if (Assets.atlas.skaters && Assets.atlas.skaters[L.art]) LEGEND_ART.add(L.art);
        if (Assets.atlas.portraits && Assets.atlas.portraits[L.art]) LEGEND_FACES.add(L.art);
      }
      useNewArt((id) => !!Assets.atlas.frames[id]);
      useModular(Assets.atlas); // players from parts, once that art is in
      useCaptainArt((k) => !!(Assets.atlas.skaters && Assets.atlas.skaters[k])); // the expansion captains' own art (Batch BA)
      useGoalieParts(Assets.atlas); // and goalies (Batch AT)
      useAchievementArt(Assets.atlas.frames); // the newer trophies' own icons (Batch AN)
      this.legendsPreview = new URLSearchParams(location.search).has('legends');
      forceSeason(new URLSearchParams(location.search).get('season')); // (?season=halloween / holiday / none: the home rink's dressing, to look at)
    } catch (e) {
      this.loadingEl.querySelector('.err').textContent = t('The game art did not load. Check your connection and reload the page.');
      throw e;
    }
    if (document.fonts?.load) {
      await Promise.race([
        Promise.all([document.fonts.load('24px "Jersey 10"'), document.fonts.load('15px "Pixelify Sans"')]).catch(() => {}),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    }
    this.save = loadSave() || newSave();
    if (new URLSearchParams(location.search).has('twins')) this.twinsTest();
    setLang(defaultLang(this.save.settings.lang)); this.save.settings.lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    applyClub(this.save.club);
    Assets.prepareClub();
    // signings wear home colours, recoloured from their old team's pages
    const kit = homeKitGroups(this.save);
    if (kit.length) await Promise.race([Assets.ensureKit(kit), new Promise((r) => setTimeout(r, 2500))]);
    this.ach = new AchievementTracker(this.save, (a) => this.toastAchievement(a));
    this.renderer = new Renderer(this.canvas);
    this.quality = new Quality();
    this.fx = new FX();
    this.applyQuality(); // where this device settled last time
    this.input = new Input();
    this.touch = new TouchControls(document.getElementById('touch'), this.input);
    this.ui = new UI(this);
    this.padnav = new PadNav(this);
    window.addEventListener('pointerdown', () => { this.padnav.used = false; document.body.classList.remove('pad-nav'); });
    window.addEventListener('gamepadconnected', () => { if (this.scene === 'title') this.ui.title(); });
    this.hud = new HUD(this);
    this.replay = new Replay();
    this.clips = new ClipRecorder(this.canvas, audio);
    this.commentary = new Commentary((text) => this.hud.ticker(text));
    this.applySettings();
    this.renderer.resize();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.scene === 'match') this.pause(); });
    // audio needs a gesture
    const unlock = () => { audio.unlock(); audio.play(this.track || 'title'); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !this.isTouch) { this.isTouch = true; if (this.scene === 'match') this.hud.show(this.match, this.cur.teamId, this.cur.ctrl || null, { versus: !!this.cur.versus, coop: !!this.cur.coop }); } });
    this.input.onKey((code) => this.onKey(code));
    // newcomer art (Batch AA) is needed once a rival slot has been signed away, or for drafted rookies
    // (a signed goalie leaves a backup in their old net: the newcomer goalie, Batch AN)
    Assets.partsFor = teamHasParts;
    Assets.newcomerCheck = () => Object.keys(this.save.roster).some((k) => RECRUITS[k] || ROOKIES[k]) || Object.keys(this.save.goalies || {}).length > 0;
    this.setupInstall();

    flushScores(this.save).then((n) => { if (n) writeSave(this.save); });
    // the Batch X badges (medals, ranks, the daily star, the big cup) show all over the menus
    Assets.loadGroup('badges').then(() => { if (this.scene === 'hub') this.ui.hub(); }).catch(() => {});
    this.startAttract();
    this.loadingEl.remove();
    this.goTitle();
    this.warmIcons();
    // a restore link from another device: #restore=<code>
    const m = /#restore=([A-Za-z2-7-]+)/.exec(location.hash);
    if (m) { history.replaceState(null, '', location.pathname + location.search); this.ui.cloudRestore(m[1]); }
    // a friend's challenge: #race=<code>
    const rc = /#race=([A-Za-z0-9]{7})/.exec(location.hash);
    if (rc) { history.replaceState(null, '', location.pathname + location.search); this.ui.challengeInvite(rc[1].toUpperCase()); }
    // an invite to a friends board: #join=<code>
    const j = /#join=([A-Za-z0-9]{6})/.exec(location.hash);
    if (j) { history.replaceState(null, '', location.pathname + location.search); this.ui.friendsBoards(j[1].toUpperCase()); }
    requestAnimationFrame((t) => this.loop(t));
  }

  // The icons a match can show (achievement toasts, the arena rule on the ticker), made a few
  // at a time while the title screen is up: made mid-match, each copy out of a page the rink
  // is drawing forced the GPU to stop and hand it back, a hitch at the moment of a goal.
  warmIcons() {
    const jobs = [...ACHIEVEMENTS.map((a) => () => Assets.icon(a.icon, 72)), ...Object.keys(TWIST_INFO).map((k) => () => ruleIconSrc(k, 64))];
    const step = () => {
      for (let i = 0; i < 4 && jobs.length; i++) jobs.shift()();
      if (jobs.length) setTimeout(step, 60);
    };
    setTimeout(step, 1500);
  }

  // "Achievement unlocked" toast; shows anywhere (menus or matches).
  toastAchievement(a) {
    if (this.testRun) return; // (a test run on a copy of the save: nothing to celebrate)
    this.toast(Assets.icon(a.icon, 72), t('Achievement unlocked'), t(a.name), t('+{n} coins', { n: a.coins }));
    audio.jingle('achievement');
  }

  // Toasts queue: in the hub and in matches they stack (a moment apart); over the results they
  // come one at a time, small, in the top-left corner, clear of the score and the box score.
  toast(img, small, title, line) {
    (this.toastQ ||= []).push([img, small, title, line]);
    if (!this.toastBusy) { this.toastBusy = true; setTimeout(() => this.nextToast(), 0); } // (after the screen it's for is drawn)
  }

  nextToast() {
    const q = this.toastQ;
    if (!q.length) { this.toastBusy = false; return; }
    if (document.querySelector('.whatsnew')) { setTimeout(() => this.nextToast(), 500); return; } // (after the what's-new card, not over it)
    if (this.scene === 'match') { setTimeout(() => this.nextToast(), 800); return; } // (never over the ice: they wait for the results)
    const [img, small, title, line] = q.shift();
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.getElementById('app').appendChild(box); }
    const side = !!document.querySelector('.results, .modal-bg'); // (over a results screen or a pop-up: small, in the corner)
    box.classList.toggle('side', side);
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<img src="${img}" alt=""><div><small></small><b></b><span></span></div>`;
    el.querySelector('small').textContent = small;
    el.querySelector('b').textContent = title;
    el.querySelector('span').textContent = line;
    box.appendChild(el);
    const life = side ? 2600 : 4200;
    setTimeout(() => el.remove(), life);
    setTimeout(() => this.nextToast(), side ? life + 150 : 350);
  }

  // Apply comfort / accessibility settings everywhere they matter.
  applySettings() {
    const st = this.save.settings;
    setKeyMap(st.keys); setPadMap(st.pad);
    audio.setMusic(st.music !== false && (st.musicVol ?? 1) > 0, st.musicVol ?? 1); audio.setSfx(st.sfx !== false && (st.sfxVol ?? 1) > 0, st.sfxVol ?? 1);
    audio.setQuality(st.audioQuality || 'auto');
    this.fx.shakeMul = st.shake ?? 1;
    this.fx.flashes = st.flashes !== false;
    this.fx.particleMul = st.particles === 'reduced' ? 0.35 : 1;
    this.renderer.markers = st.markers || 'color';
    this.renderer.passRing = st.passRing !== false;
    // the puck: larger on a phone by default (Settings › Puck), with a ring if asked for
    const puck = st.puck === 'auto' || !st.puck ? (this.isTouch ? 'large' : 'normal') : st.puck;
    this.renderer.puckSize = puck === 'normal' ? 1 : 1.35;
    this.renderer.puckRing = puck === 'ring';
    document.body.classList.toggle('large-text', st.textSize === 'large');
    const t = document.getElementById('touch');
    t.dataset.size = st.touchSize || 'normal';
    t.classList.toggle('lefty', !!st.lefty);
  }

  // Offline play and "install to home screen". Service workers need https, so this only
  // kicks in on a real https host (add ?sw to test it on localhost).
  setupInstall() {
    this.standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const secure = location.protocol === 'https:' || /[?&]sw\b/.test(location.search);
    this.canOffline = 'serviceWorker' in navigator && secure;
    if (this.canOffline) navigator.serviceWorker.register('sw.js').catch(() => { this.canOffline = false; });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      if (this.scene === 'title') this.ui.title();
    });
    window.addEventListener('appinstalled', () => { this.installPrompt = null; this.standalone = true; });
  }

  async install() {
    const p = this.installPrompt;
    if (!p) return false;
    p.prompt();
    const r = await p.userChoice.catch(() => null);
    this.installPrompt = null;
    return r && r.outcome === 'accepted';
  }

  onResize() {
    this.renderer.resize();
    this.checkRotate();
  }

  checkRotate() {
    const portrait = window.innerHeight > window.innerWidth;
    const need = this.isTouch && portrait && (this.scene === 'match' || this.scene === 'paused');
    this.rotateEl.hidden = !need;
    if (need && this.scene === 'match') this.pause(true);
  }

  onKey(code) {
    const enter = code === 'Enter' || code === 'Space' || isKey('a', code);
    if (this.scene === 'title' && code === 'Enter' && !document.querySelector('.modal-bg')) this.startCampaign();
    else if (this.scene === 'dialogue' && enter) this.ui.dialogueAdvance?.();
    else if (this.scene === 'results' && code === 'Enter' && !document.querySelector('.modal-bg')) document.getElementById('r-go')?.click();
    else if (this.scene === 'hub' && code === 'Enter' && !document.querySelector('.modal-bg')) document.getElementById('h-play')?.click();
    // Esc does what the pad's B does: closes the top pop-up the way its own close button would
    // (one that has to be answered stays)
    if (code === 'Escape' && this.scene !== 'paused' && document.querySelector('.modal-bg')) this.padnav.back();
  }

  // Slow device? quality.js steps the detail down (resolution, then effects, crowd and snow)
  // while matches run under ~45 fps, and back up when there's headroom.
  watchFrameRate(dt) {
    if (this.scene !== 'match' || document.hidden) return;
    if (this.quality.update(dt, performance.now() / 1000)) this.applyQuality();
  }

  applyQuality() {
    const q = this.quality.step, r = this.renderer;
    if ((r.maxDpr || 2) !== q.dpr) { r.maxDpr = q.dpr; r.resize(); r.clearCaches?.(); }
    this.fx.qualityMul = q.fx;
    r.crowdShare = q.crowd;
    r.snowShare = q.snow;
  }

  // A controller press counts as the first touch: wake the audio (Chrome may still want a click).
  onPadPress() {
    if (this.padWoke) return;
    this.padWoke = true;
    audio.unlock(); audio.play(this.track || 'title');
    setTimeout(() => { this.padWoke = audio.ctx && audio.ctx.state === 'running'; }, 300);
  }

  // The soundtrack follows the scene (and comes back after the music room).
  music(name) {
    if (name === 'hub') name = { holiday: 'holiday', halloween: 'halloween' }[seasonFor()] || 'hub'; // (the locker room by the calendar)
    this.track = name; audio.play(name);
  }

  // A close game: either side one goal from winning, or next goal wins.
  clutch(m) {
    if (m.drill || this.attract || !['play', 'faceoff', 'penalty'].includes(m.state)) return false;
    return Math.max(m.score[0], m.score[1]) >= m.winScore - 1 || (m.mods && m.mods.has('sudden'));
  }

  // ------------------------------------------------------------- matches
  makeMatch(cfg, teamId, arena = 'home') {
    // keep only the art this match uses decoded (phones have little image memory)
    const geared = cfg.teams.some((t) => t.skaters.some((k) => k.gear && (GEAR_LOOK[k.gear.stick] || GEAR_LOOK[k.gear.skates])));
    const rules = RULE_ART.includes(cfg.twist);
    // the title and hub scenes show over the demo match, so their art stays with it
    const host = Object.values(TEAMS).find((tm) => tm.arena === arena); // its mascot dances in the stands
    const team = teamInfo(teamId); // (the All-Stars recolour the rival pages they're given)
    const dressed = arena === 'home' && !!seasonFor(); // (the home rink's Halloween or holiday dressing, Batch CD: only in season)
    Assets.trim({ teams: [teamId, ...(host ? [host.id] : [])], arena, gear: geared, groups: ['badges', ...(team.groups || []), ...(rules ? ['rules'] : []), ...(this.attract ? ['title', 'hub'] : []), ...((cfg.drill && cfg.drill.keepGroups) || []), ...(dressed ? ['seasonal'] : [])] });
    if (dressed) Assets.loadGroup('seasonal').then(() => { if (this.scene === 'title') this.ui.titleLogo(); }).catch(() => {}); // (the logo's trimmings too)
    if (geared) Assets.ensureGear();
    if (rules) Assets.loadGroup('rules').catch(() => {});
    this.lap = null;
    this.fx.heavySnow = false;
    Assets.prepareTeam(team);
    this.awayTeamId = teamId;
    this.arena = arena;
    if (!this.attract && this.save.settings.simple) cfg.simple = true; // (one button for the youngest players)
    const m = new Match(cfg);
    this.match = m;
    if (!this.attract) { // the title screen's match shows no cut-ins
      const pairs = [...m.skaters, ...m.goalies].map((k) => [this.hud.bannerKey(k), k.team === 0 ? (RECRUITS[k.who] ? 'homekit' : null) : teamId]);
      Assets.warmBanners(pairs);
    }
    this.acc = 0;
    this.fx.attach(m, TEAMS.home.color, team.color);
    this.renderer.snapCamera(m);
    return m;
  }

  startAttract() {
    const teamId = RIVALS[Math.floor(Math.random() * RIVALS.length)];
    const cfg = matchConfig(this.save, teamId, { powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none' }, { attract: true });
    cfg.diff = [0.7, 0.7];
    this.attract = true;
    const arena = TEAMS[teamId].arena;
    const where = arena && Assets.backdrops.has(arena) ? arena : 'home';
    cfg.twist = this.twistFor(where, { twist: 'none' });
    this.makeMatch(cfg, teamId, where);
    this.match.state = 'faceoff';
    // the ice gets resurfaced before each demo match
    if (Assets.atlas.art_additions && Assets.atlas.art_additions.polish) this.lap = new ResurfacerLap();
  }

  fixture() { return this.save.league ? nextFixture(this.save.league) : null; }

  nextStage() {
    const f = this.fixture();
    if (f) return f.stage;
    if (this.save.league) return null;
    if (this.save.champion) return null;
    return TOURNAMENT.stages[this.save.stage] || null;
  }

  startCampaign() {
    audio.unlock();
    if (!this.save.seenIntro) {
      this.scene = 'dialogue';
      this.music('story');
      this.ui.dialogue(INTRO, 'comets', null, () => {
        this.save.seenIntro = true;
        writeSave(this.save);
        this.goHub('tournament');
      });
      return;
    }
    this.goHub();
  }

  // Art to load before something starts: one thing at a time (taps meanwhile wait under the
  // running fox), and nothing at all if the player has gone somewhere else in the meantime.
  loadThen(promise, go) {
    if (this.loading) return;
    const token = this.loading = { scene: this.scene };
    const busy = document.getElementById('busy');
    const show = setTimeout(() => { if (busy) busy.hidden = false; }, 150);
    return Promise.race([Promise.resolve(promise).catch(() => {}), new Promise((r) => setTimeout(r, 15000))]).then(() => { // (never stuck on a load that hangs)
      clearTimeout(show);
      if (busy) busy.hidden = true;
      if (this.loading !== token) return;
      this.loading = null;
      if (this.scene === token.scene) go();
    });
  }

  startStage() {
    if (this.loading) return;
    const f = this.fixture();
    if (!f) return;
    if (f.kind === 'allstar') return this.startAllStar(f);
    const stage = f.stage;
    const team = TEAMS[f.opponent];
    const powers = stage.powers.length ? t('Power pucks: {list}.', { list: stage.powers.map((p) => t(POWER_INFO[p].name)).join(', ') }) : t('No power pucks this match.');
    const arena = stage.arena || this.arenaFor(team.id); // the Winter Classic is on Pine Pond
    const twist = TWIST_INFO[this.twistFor(arena, stage)];
    const sub = `${t(stage.round, { n: stage.roundN })} · ${powers} ${twist ? t(twist) : ''}`;
    this.scene = 'dialogue';
    this.music('story');
    this.loadThen(Assets.ensureTeam(team.id, arena), () => this.showStageDialogue(f, team, sub));
  }

  // The All-Star Game: the fans' vote, Kip's welcome, then the game. Our guests wear our
  // colours (like signings) and the League All-Stars the All-Star kit, so both rival teams'
  // pages load and get recoloured first.
  startAllStar(f) {
    const s = this.save, L = s.league;
    // (kept: the same benches if you come back, unless a trade or a retirement broke it up since)
    if (L.allstarVote && !allStarVoteStands(s, L.allstarVote)) L.allstarVote = null;
    const vote = L.allstarVote || (L.allstarVote = allStarVote(s, L));
    if (vote && L.skills) L.skills.star = vote.star; // (Skills Night keeps its field and its results)
    if (!vote) { recordAllStar(L, { skipped: true }); writeSave(s); return this.goHub('tournament'); }
    this.allStarFixture = f;
    this.scene = 'dialogue';
    this.music('story');
    this.prepAllStar(vote).then(() => this.ui.allStarVote(vote, () => this.openSkills()));
  }

  // Both rival teams' art, recoloured for both benches.
  prepAllStar(vote) {
    // (an expansion club's art is under its mark; players and goalies from parts have pages of their own)
    ALLSTAR.groups = [...new Set([...vote.teams.map((id) => 'rival_' + (TEAMS[id].art || TEAMS[id].mark)),
      ...(vote.teams.some(teamHasParts) ? ['parts'] : []), ...(vote.teams.some((id) => TEAMS[id].goalieLook) ? ['goalie_parts'] : [])])];
    return Promise.all([Assets.ensureKit([...new Set([...homeKitGroups(this.save), ...ALLSTAR.groups])]), ...ALLSTAR.groups.map((g) => Assets.loadGroup(g))])
      .catch(() => {}).then(() => Assets.prepareTeam(ALLSTAR));
  }

  // Skills Night before the All-Star Game (made once a season, kept in the league).
  openSkills() {
    const s = this.save, L = s.league;
    L.skills ||= makeSkills(s, L.allstarVote, (s.season * 7919 + 13) >>> 0);
    writeSave(s);
    this.scene = 'results';
    this.music('hub');
    this.ui.skillsNight(L.skills, (id) => {
      const ev = SKILLS_EVENTS.find((e) => e.id === id), g = L.skills.events[id].ghost;
      this.startDrill(ev.drill, L.skills.star, { skills: id, ...(g ? { ghost: { ...g, label: g.name } } : {}) });
    }, () => this.toAllStarGame());
  }

  toAllStarGame() {
    const vote = this.save.league.allstarVote, f = this.allStarFixture || this.fixture();
    this.scene = 'dialogue';
    this.music('story');
    this.prepAllStar(vote).then(() => this.ui.dialogue(PLAYOFF_LINES.allstar.pre, 'allstar', { sub: t('No penalties, and ultimates charge twice as fast.') },
      () => this.beginMatch('allstar', f.stage, false, [], { fixture: f, allstar: vote })));
  }

  // Rivals with their own building host you there.
  arenaFor(teamId, pick) {
    if (pick && pick !== 'auto') return pick;
    return (TEAMS[teamId] && TEAMS[teamId].arena) || 'home';
  }

  announceRule(twist, arena) {
    if (!twist || twist === 'none' || !TWIST_INFO[twist]) return;
    setTimeout(() => { if (this.scene === 'match') this.hud.ticker(t(TWIST_INFO[twist]), ruleIconSrc(twist, 64)); }, 1400);
  }

  // A rival's building brings its own rule; the Frostline rink keeps the stage's twist.
  twistFor(arena, stage, rules = true) {
    if (!rules) return 'none';
    return (ARENAS[arena] && ARENAS[arena].twist) || (stage && stage.twist) || 'none';
  }

  showStageDialogue(f, t, sub) {
    const stage = f.stage;
    let lines;
    if (f.kind === 'regular') lines = [...rivalLines(this.save, t.id), ...DIALOGUE[t.id].pre];
    else if (f.kind === 'final' && DIALOGUE[t.id].final) lines = [...rivalLines(this.save, t.id).slice(0, 1), ...DIALOGUE[t.id].final];
    else lines = [...rivalLines(this.save, t.id).slice(0, 1), ...PLAYOFF_LINES[f.kind].pre];
    // skip our lines that talk to a skater who has since signed with us
    const gone = ['frost', 'thunder', 'stone'].filter((k) => this.save.roster[recruitKey(t.id, k)]).map((k) => t.names[k]);
    if (gone.length) lines = lines.filter((l) => l[0] !== 'us' || !gone.some((n) => l[2].includes(n)));
    this.ui.dialogue(lines, t.id, { sub }, () => {
      const theirPlan = rivalPlan(this.save, t.id, GAME_PLANS);
      this.scene = 'results';
      this.ui.planPicker(t.id, f, theirPlan, (plan) => this.beginMatch(t.id, stage, false, [], { plan, theirPlan, fixture: f }));
    });
  }

  startExhibition(teamId, mods = [], arena = 'auto', rules = true, coop = false) {
    this.lastExhibition = { teamId, mods, arena, rules, coop }; // (for Play again on the results)
    const where = this.arenaFor(teamId, arena);
    this.loadThen(Assets.ensureTeam(teamId, where), () =>
      this.beginMatch(teamId, { powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', reward: 120, round: 'Exhibition' }, true, mods, { arena: where, rules, coop }));
  }

  // Training drills and the shootout run on the match engine with a drill controller.
  startDrill(id, charId, opts = {}) {
    audio.unlock();
    const ghostTeam = opts.ghost && RECRUITS[opts.ghost.char] && id !== 'shootout' ? RECRUITS[opts.ghost.char].team : null;
    if (this.loading) return;
    if (ghostTeam && !opts.awayTeam) return this.loadThen(Assets.ensureTeam(ghostTeam), () => this.startDrill(id, charId, { ...opts, awayTeam: ghostTeam }));
    if (id === 'faceoffs' && !opts.awayTeam) return this.loadThen(Assets.ensureTeam('lynx'), () => this.startDrill(id, charId, { ...opts, awayTeam: 'lynx' })); // (with the linesman)
    if (id === 'resurface' && !(Assets.groupReady('title') && Assets.groupReady('resurfacer'))) return this.loadThen(Promise.all(['title', 'resurfacer'].map((g) => Assets.loadGroup(g))), () => this.startDrill(id, charId, opts)); // (the machine's art, and its diagonals)
    const { cfg, ctrl, def, awayTeam } = createDrill(id, this.save, charId, opts);
    this.cur = { drill: id, char: charId, teamId: awayTeam, ctrl, def, opts };
    this.attract = false;
    const m = this.makeMatch(cfg, awayTeam);
    this.hookMatch(m);
    this.hookDrill(m);
    this.resetReplay();
    this.ui.clear();
    this.scene = 'match';
    this.hud.show(m, awayTeam, ctrl);
    this.touch.reset();
    this.drillShown = false;
    this.tutorial = -1;
    this.music(id === 'shootout' ? 'shootout' : id === 'resurface' ? 'waltz' : 'training'); // (the Resurfacer: the arena organ's waltz)
    audio.setArena('home');
    this.checkRotate();
  }

  startShootout(teamId) { this.loadThen(Assets.ensureTeam(teamId), () => this.startDrill('shootout', lineupIds(this.save)[0], { teamId })); }

  // Local versus: player 1 is our club, player 2 picks a rival. Both use base stats.
  startVersus(teamId) {
    audio.unlock();
    const arena = this.arenaFor(teamId);
    this.loadThen(Assets.ensureTeam(teamId, arena), () => this.beginVersus(teamId, arena));
  }

  beginVersus(teamId, arena) {
    const team = TEAMS[teamId];
    const ids = ['frost', 'thunder', 'stone'];
    const chem = { 'frost+thunder': 1, 'frost+stone': 1, 'stone+thunder': 1 };
    const cfg = {
      teams: [
        { skaters: ids.map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, name: CHARACTERS[id].name, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: GOALIE.name }, chem },
        { skaters: ids.map((id) => ({ def: slotDef(teamId, id), stats: { ...CHARACTERS[id].base }, name: team.names[id], perks: [], sprite: slotSprite(teamId, id), parts: slotLook(teamId, id) })), goalie: { stats: { rfx: 6, pos: 6 }, name: team.names.goalie, art: team.art || (team.goalieLook ? goalieArt(team.goalieLook) : 'newcomer'), mask: team.goalieLook || null }, chem },
      ],
      humanTeam: 0, humans: [0, 1],
      powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none',
      diff: [0.6, 0.6], seed: (Math.random() * 1e9) >>> 0, twist: this.twistFor(arena, { twist: 'none' }),
    };
    this.cur = { versus: true, teamId, stage: { round: 'Versus' }, exhibition: true, mods: [] };
    this.attract = false;
    const m = this.makeMatch(cfg, teamId, arena);
    this.hookMatch(m);
    this.resetReplay();
    this.commentary.attach(m, teamId);
    this.chantCool = 25;
    this.ui.clear();
    this.scene = 'match';
    this.hud.show(m, teamId, null, { versus: true });
    this.touch.reset();
    this.tutorial = -1;
    this.music(ARENA_MUSIC[arena] || 'frostline');
    audio.setArena(arena);
    this.hud.banner(`<div class="small">${t('Local versus')}</div><div class="big" style="font-size:clamp(48px,10vw,110px)">${t('FACEOFF')}</div>`, 1.6);
    this.announceRule(cfg.twist, arena);
  }

  endVersus(summary) {
    const team = TEAMS[this.cur.teamId];
    this.hud.hide();
    this.scene = 'results';
    audio.jingle('win');
    this.music('victory');
    const p1 = summary.winner === 0;
    if (summary.winner !== null) { this.ach.unlock('versus'); writeSave(this.save); }
    this.ui.modal(`
      <div style="text-align:center">
        <div class="label">${t('Local versus')}</div>
        <div class="drill-score" style="color:${p1 ? 'var(--ice)' : 'var(--coral)'}">${t('Player {n} wins!', { n: p1 ? 1 : 2 })}</div>
        <div class="medal-big" style="--m:var(--cream)">${CLUB.nick} ${summary.score[0]} – ${summary.score[1]} ${team.name.split(' ').slice(-1)[0]}</div>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="vs-title">${t('Title')}</button><button class="btn gold" id="vs-again">${t('Rematch')}</button></div>`, (m, close) => {
      m.querySelector('#vs-again').addEventListener('click', () => { close(); this.startVersus(this.cur.teamId); });
      m.querySelector('#vs-title').addEventListener('click', () => { close(); this.startAttract(); this.goTitle(); });
    }, false);
  }

  // Which gamepad belongs to a team's player in versus, or a seat's in co-op (undefined = keyboard).
  padFor(team, seat = 0) {
    const pads = this.input.pads();
    if (this.cur && this.cur.coop && team === 0) return !pads.length ? undefined : seat ? pads[pads.length >= 2 ? 1 : 0].index : pads.length >= 2 ? pads[0].index : undefined;
    if (!(this.cur && this.cur.versus)) return null;
    if (pads.length >= 2) return pads[team === 0 ? 0 : 1].index;
    if (pads.length === 1) return team === 1 ? pads[0].index : undefined;
    return undefined;
  }

  // Co-op: with no gamepad, a shared keyboard (player 1 on the left, or touch; player 2 round the
  // arrows); with one, player 2 has it and player 1 their own keys or touch; with two, one each.
  coopInputs() {
    const I = this.input, pads = I.pads();
    if (!pads.length) return [mergeInputs(I.readLayout('p1'), I.readTouch()), I.readLayout('p2')];
    const p2 = pads[pads.length >= 2 ? 1 : 0];
    return [I.read({ skipPad: p2.index }), I.readPad(p2)];
  }

  hookDrill(m) {
    const fx = this.fx, hud = this.hud;
    m.on('drill_count', (e) => { hud.banner(`<div class="big" style="font-size:clamp(60px,14vw,140px)">${e.n}</div>`, 0.8); audio.sfx('click'); });
    m.on('drill_go', () => { hud.banner(`<div class="big" style="color:#ffd45e">${t('GO!')}</div>`, 0.8); audio.sfx('whistle', { vol: 0.6 }); });
    m.on('drill_goal', (e) => this.renderer.nets.ripple(e.side, e.y, 0.8));
    m.on('gate_ok', (e) => { fx.ring(e.x, e.y, 34, '#7fe08a', 0.4); audio.sfx('coin', { vol: 0.35 }); });
    m.on('gate_miss', (e) => { fx.text(e.x, e.y - 60, '+2s', '#ff6f7d', 0.9, 20); audio.sfx('deny'); });
    m.on('target_hit', (e) => { fx.text(GOAL_X - 70, e.y - 80, `+${e.pts}`, '#ffd45e', 1, 24); fx.burst(GOAL_X - 4, e.y, 14, 18, ['#ff3b3b', '#fff2cb', '#ffd45e'], 220, 0.5); audio.sfx('post', { vol: 0.6 }); audio.crowdCheer(0.3); });
    m.on('target_miss', (e) => { fx.text(GOAL_X - 70, e.y - 80, '+10', '#c3d3ea', 0.8, 16); audio.sfx('boards', { vol: 0.4 }); });
    m.on('rondo_pass', (e) => { fx.text(e.s.x, e.s.y - 100, `+${e.pts}`, '#71dce8', 0.8, 15 + e.pts * 2); audio.sfx('coin', { vol: 0.25 + e.pts * 0.05 }); });
    m.on('rondo_steal', (e) => { hud.banner(`<div class="small">${e.why === 'zone' ? t('OUT OF THE ZONE') : e.why === 'shot' ? t('NO SHOOTING!') : t('STOLEN!')}</div>`, 1); audio.sfx('deny'); });
    m.on('breakaway_result', (e) => {
      hud.banner(`<div class="small" style="color:${e.kind === 'goal' ? '#ffd45e' : '#c3d3ea'}">${{ goal: t('GOAL!'), save: t('SAVED'), miss: t('MISSED'), time: t('TOO SLOW') }[e.kind]}</div>`, 1.2);
      if (e.kind === 'goal') { audio.jingle('goal'); audio.crowdCheer(0.6); fx.lamp = 1.5; } else audio.crowdOoh(0.5);
    });
    m.on('shootout_turn', (e) => {
      const us = e.us;
      hud.banner(`<div class="small">${us ? t('YOUR SHOT') : t('YOU\'RE IN GOAL')}</div><div class="sub">${us ? e.shooter.name : t('Stop {name}!', { name: e.shooter.name })}</div>`, 1.6);
    });
    m.on('shootout_result', (e) => {
      const mine = e.team === 0;
      hud.banner(`<div class="small" style="color:${e.scored === mine ? '#ffd45e' : '#ff6f7d'}">${e.scored ? t('SCORES!') : mine ? t('STOPPED') : t('BIG SAVE!')}</div><div class="sub">${e.goals[0]} – ${e.goals[1]}</div>`, 1.4);
      if (e.scored) { audio.jingle('goal'); fx.lamp = 1.4; } else audio.crowdOoh(0.6);
      if (!mine && !e.scored) audio.crowdCheer(0.6);
    });
    m.on('tip_result', (e) => {
      hud.banner(`<div class="small" style="color:${e.kind === 'goal' ? '#ffd45e' : '#c3d3ea'}">${e.kind === 'goal' ? t('GOAL!') : e.tipped ? t('SAVED') : t('NO TIP')}</div>`, 0.9);
      if (e.kind === 'goal') { audio.jingle('goal'); audio.crowdCheer(0.4); fx.lamp = 1.2; } else audio.crowdOoh(0.3);
    });
    m.on('faceoff_result', (e) => {
      const secs = (v) => t('{seconds}s', { seconds: v.toFixed(2) });
      const sub = e.won && e.rt != null ? secs(e.rt) : !e.won && e.theirs != null ? t('They took {s}', { s: secs(e.theirs) }) : '';
      hud.banner(`<div class="small" style="color:${e.won ? '#ffd45e' : '#ff6f7d'}">${e.clean ? t('CLEAN DRAW!') : e.won ? t('WON IT!') : e.early ? t('TOO EARLY!') : t('TOO SLOW')}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`, 1.1);
      if (e.won) { audio.sfx('coin', { vol: e.clean ? 0.6 : 0.4 }); if (e.clean) audio.crowdCheer(0.3); } else audio.sfx('deny');
    });
    m.on('drill_over', () => { audio.sfx('whistle'); hud.banner(`<div class="big" style="font-size:clamp(48px,10vw,110px)">${t('FINISHED')}</div>`, 1.4); });
  }

  finishDrill() {
    const c = this.cur, res = c.ctrl.result, s = this.save;
    this.hud.hide();
    this.scene = 'results';
    if (c.drill === 'shootout') return this.finishShootout(res);
    const medal = medalFor(c.def, res.score);
    const skills = c.opts.skills && s.league && s.league.skills;
    const rw = drillRewards(s, c.drill, c.char, res.score, medal, DRILL_REWARDS, { practice: !!skills });
    if (skills) {
      rw.skills = true;
      const ev = SKILLS_EVENTS.find((e) => e.id === c.opts.skills);
      if (recordSkills(skills, ev.id, res.score)) { s.coins += ev.coins; rw.extra = [[t('Skills Night: {event} won!', { event: t(ev.name) }), `+${ev.coins}`]]; audio.jingle('win'); }
    }
    // your best run is kept, to race as a ghost
    const run = res.ghost && (res.ghost.path || res.ghost.attempts) ? { ...res.ghost, char: c.char, score: res.score } : null;
    s.ghosts ||= {};
    const prev = s.ghosts[c.drill];
    const better = !prev || (c.def.unit === 'time' ? res.score < prev.score : res.score > prev.score);
    if (run && !res.timeout && better) s.ghosts[c.drill] = run;
    // Sniper and Keep-Away keep your best run's pace, to race in the HUD
    if (res.pace && !skills && !(s.paces && s.paces[c.drill] && s.paces[c.drill].score >= res.score)) (s.paces ||= {})[c.drill] = { score: res.score, pace: res.pace, ...(res.race ? { race: res.race } : {}) }; // (Sniper's run too, for its ghost)
    this.ach.checkMeta();
    writeSave(s);
    if (res.vsLine) rw.ghostVs = { line: res.vsLine, won: res.vsWon };
    if (run && !res.timeout) rw.run = { ghost: res.ghost, char: c.char }; // (to challenge a friend with)
    // racing your own best again: the newest one
    const again = c.opts.ghost && c.opts.ghost.mine && s.ghosts[c.drill] ? { ...c.opts, ghost: { ...c.opts.ghost, ...s.ghosts[c.drill] } } : c.opts;
    this.ui.drillResult(c.def, res.score, rw, c.char,
      () => this.startDrill(c.drill, c.char, again),
      () => this.resolvePerks(() => { this.startAttract(); if (skills) this.openSkills(); else this.goHub('training'); }));
    if (!c.def.offline) this.postScore(c.drill, res.score, c.char, '#d-online', res.timeout ? null : res.ghost); // (no online board for some)
  }

  // Post a best score to the online leaderboard; show the rank in `where` if given.
  postScore(board, score, char = '', where = null, ghost = null) {
    submitScore(this.save, board, score, char, ghost).then((r) => {
      writeSave(this.save);
      const el = where && document.querySelector(where);
      if (!el || !r || r.rank == null) return;
      const info = BOARD_INFO[board], fmt = (v) => (typeof v === 'number' ? info.fmt(v) : '–'); // (a partial answer shows what it has)
      const all = r.improved
        ? t('Online: {rank} of {total} · new personal best posted', { rank: `<b>#${r.rank}</b>`, total: r.total })
        : t('Online: {rank} of {total} · your best {best}', { rank: `<b>#${r.rank}</b>`, total: r.total, best: fmt(r.best) });
      const wk = r.week && r.week.rank != null ? t(r.week.improved ? 'This week: {rank} of {total} · new weekly best' : 'This week: {rank} of {total} · your best {best}', { rank: `<b>#${r.week.rank}</b>`, total: r.week.total, best: fmt(r.week.best) }) : '';
      el.innerHTML = wk ? `${wk}<br>${all}` : all;
    }).catch(() => {});
  }

  // Gamepad rumble for one team's player (or everyone when team is undefined).
  rumble(strong, weak, ms, team, seat = 0) {
    const pad = team === undefined ? null : this.padFor ? this.padFor(team, seat) : null;
    if (team !== undefined && pad === undefined) return;
    this.input.rumble(strong, weak, ms, pad);
  }

  recordRival(teamId, gf, ga, won, shootout) { recordRivalResult(this.save, teamId, gf, ga, won, { shootout }); }

  finishShootout(res) {
    const s = this.save, c = this.cur;
    const won = res.score === 1;
    const team = TEAMS[c.teamId];
    const coins = (won ? 60 : 20) + res.goals[0] * 10;
    s.coins += coins;
    const ups = [];
    for (const id of lineupIds(s)) ups.push(...applyExp(s, id, won ? 20 : 10));
    applyGoalieExp(s, won ? 20 : 10);
    this.recordRival(c.teamId, res.goals[0], res.goals[1], won, true);
    s.shootoutWins = (s.shootoutWins ?? (this.ach.has('shootout') ? 1 : 0)) + (won ? 1 : 0);
    if (won) this.ach.unlock('shootout');
    this.ach.checkMeta();
    writeSave(s);
    if (won) this.postScore('shootout_wins', s.shootoutWins, lineupIds(s)[0]);
    audio.jingle(won ? 'win' : 'lose');
    this.music(won ? 'victory' : 'defeat');
    this.ui.modal(`
      <div style="text-align:center">
        <div class="label">${t('Shootout vs {team}', { team: team.name })}</div>
        <div class="drill-score">${res.goals[0]} – ${res.goals[1]}</div>
        <div class="medal-big" style="--m:${won ? '#ffd45e' : '#ff6f7d'}">${won ? t('You win the shootout!') : t('They take it')}</div>
      </div>
      <div class="reward-lines"><div><span>${t('Coins')}</span><span class="gold-t">+${coins}</span></div><div><span>${t('Whole team')}</span><span class="gold-t">${t('+{n} EXP', { n: won ? 20 : 10 })}</span></div></div>
      ${ups.length ? `<div class="lvlup">${t('Level up! Check the Team tab.')}</div>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="so-again">${t('Again')}</button><button class="btn gold" id="so-done">${t('Done')}</button></div>`, (m, close) => {
      m.querySelector('#so-again').addEventListener('click', () => { close(); this.startShootout(c.teamId); });
      m.querySelector('#so-done').addEventListener('click', () => { close(); this.resolvePerks(() => { this.startAttract(); this.goHub(); }); });
    }, false);
  }

  beginMatch(teamId, stage, exhibition, mods = [], extra = {}) {
    const s = this.save;
    // the twins' first game side by side: Kip makes the most of it
    if (!extra.twinsSeen && twinsFirstTogether(s, lineupIds(s))) {
      writeSave(s);
      const reveal = Assets.atlas.legends && Assets.atlas.legends.reveal;
      this.scene = 'dialogue';
      this.ui.dialogue(LEGEND_LINES.together, 'home', null, () => this.beginMatch(teamId, stage, exhibition, mods, { ...extra, twinsSeen: true }), null, reveal ? { bg: Assets.url(reveal.image) } : null);
      return;
    }
    const plan = extra.plan || 'balanced';
    const theirPlan = extra.theirPlan || (exhibition ? rivalPlan(s, teamId, GAME_PLANS) : 'balanced');
    let buffs = null;
    if (!exhibition && !extra.allstar) {
      // locker-room buffs are used up by this match
      buffs = buffEffects(s.buffs);
      s.buffs = [];
      s.planHistory[teamId] = plan;
      s.lastPlan = plan;
      writeSave(s);
    }
    this.cur = { teamId, stage, exhibition, stageIndex: exhibition ? -1 : s.stage, mods, plan, theirPlan, fixture: extra.fixture, daily: extra.daily || null, allstar: extra.allstar || null };
    // two players from the title or Play as (the daily challenge is for one): both skating, or player 2 in goal
    const as = extra.daily ? 'skaters' : extra.coop === 'keeper' ? 'coopGoalie' : extra.coop ? 'coop' : s.settings.playAs;
    const coop = as === 'coop', keeperCoop = as === 'coopGoalie';
    const goalieMode = as === 'goalie' || keeperCoop; // (daily goals are for skaters)
    const cfg = extra.allstar ? allStarConfig(s, extra.allstar, { goalieMode }) : matchConfig(s, teamId, stage, { plans: [plan, theirPlan], buffs, goalieMode });
    cfg.mods = mods;
    cfg.coop = coop; cfg.keeperCoop = keeperCoop;
    this.cur.coop = coop || keeperCoop; // (two players' input either way)
    const arena = extra.arena || stage.arena || this.arenaFor(teamId);
    cfg.twist = this.twistFor(arena, stage, extra.rules !== false);
    this.attract = false;
    const m = this.makeMatch(cfg, teamId, arena);
    const classic = !!(extra.fixture && extra.fixture.kind === 'classic');
    this.fx.heavySnow = classic;
    m.classic = classic;
    if (classic) Assets.loadGroup('winter').catch(() => {}); // Pine Pond dressed up
    if (m.goalieMode) Assets.loadGroup('goalie').catch(() => {}); // Wall of Ice
    if (extra.allstar) Assets.dropOriginals(ALLSTAR.groups.filter((g) => g !== 'parts' && g !== 'goalie_parts')); // only the recoloured copies are drawn (heads and masks recolour from the originals)
    this.hookMatch(m);
    this.resetReplay();
    this.clips.clear();
    this.ach.attachMatch(m);
    this.replayPending = false;
    this.commentary.attach(m, teamId);
    // one of ours on a scoring streak in league games: the booth mentions it at the first faceoff
    const hot = !exhibition && m.teamSkaters(0).map((k) => ({ k, n: (s.goalStreaks || {})[k.who] || 0 })).filter((x) => x.n >= 3).sort((a, b) => b.n - a.n)[0];
    if (hot) { const once = () => { m.events.off && m.events.off('drop', once); if (!once.done) { once.done = true; this.commentary.say(t('{name} has scored in {n} straight games. Can they make it {next}?', { name: hot.k.name, n: hot.n, next: hot.n + 1 }), 2); } }; m.on('drop', once); }
    this.chantCool = 25;
    this.ui.clear();
    this.scene = 'match';
    m.allstar = !!extra.allstar; // the home rink is dressed for it
    m.bigGame = classic || m.allstar || /\bFinal$/.test(stage.round || ''); // the gold scoreboard
    this.hud.show(m, teamId, null, { coop: cfg.coop });
    if (m.keeperCoop && firstTime(s, 'keeperCoop')) setTimeout(() => { if (this.scene === 'match' && this.match === m) this.hud.hint(t('Two players! Player 1 skates, player 2 is in goal, and the AI skates the other two.'), 6); }, 2600);
    if (m.coop && firstTime(s, 'coop')) setTimeout(() => { if (this.scene === 'match' && this.match === m) this.hud.hint(t('Two players! Each of you swaps only with the skater the AI has. Pass to it and you take it over; your partner keeps theirs.'), 6); }, 2600);
    if (classic) setTimeout(() => { if (this.scene === 'match') this.hud.ticker(t('The Winter Classic! Outdoor hockey under the snow, and the whole league is watching.')); }, 500);
    if (extra.allstar) setTimeout(() => { if (this.scene === 'match') this.hud.ticker(t('The All-Star Game! The fans voted, and the league\'s best share the ice.')); }, 500);
    this.announceRule(cfg.twist, arena);
    if (this.cur.daily) setTimeout(() => { if (this.scene === 'match') this.hud.banner(`<div class="small">${t('Daily challenge')}</div><div class="sub" style="font-size:clamp(16px,3vw,24px)">${t(dailyGoal(this.cur.daily.goal).text)}</div>`, 3); }, 300);
    this.touch.reset();
    this.music(classic ? 'classic' : /\bFinal$/.test(stage.round || '') ? 'final' : ARENA_MUSIC[arena] || 'frostline');
    audio.setArena(arena);
    const edge = m.planEdge(0);
    const plans = { a: t(GAME_PLANS[plan].name), b: t(GAME_PLANS[theirPlan].name) };
    const planLine = plan !== 'balanced' || theirPlan !== 'balanced'
      ? `<div class="sub" style="font-size:clamp(14px,2.4vw,20px)">${edge > 0 ? t('{a} vs {b} · your edge', plans) : edge < 0 ? t('{a} vs {b} · their edge', plans) : t('{a} vs {b}', plans)}</div>` : '';
    const twoLine = m.coop || m.keeperCoop ? `<div class="sub" style="font-size:clamp(14px,2.4vw,20px);color:#7fe08a">${m.keeperCoop ? t('Two players, one in goal') : t('Two players')}${extra.coop ? '' : ` · ${t('Play as › Skaters to play alone')}`}</div>` : ''; // (Play as is remembered: say so; from the title's 2 Players it isn't)
    this.hud.banner(`<div class="small">${exhibition ? t('Exhibition') : t(stage.round, { n: stage.roundN })}</div><div class="big" style="font-size:clamp(48px,10vw,110px)">${t('FACEOFF')}</div>${planLine}${twoLine}`, 2);
    if (buffs && buffs.hype) { this.chantCool = 4; this.fx.excite = 0.7; }
    this.checkRotate();
    navigator.wakeLock?.request?.('screen').then((l) => { this.wake = l; }).catch(() => {});
    if (this.isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      // fullscreen, then held on its side where the phone allows it (Android; iPhones ignore it and the rotate prompt shows)
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
    }
    const simpleFirst = m.simple && !goalieMode && !this.cur.coop && firstTime(s, 'simple'); // (Simple controls have tips of their own)
    this.tutorial = !this.cur.coop && (simpleFirst || (goalieMode ? (this.save.goalieGames || 0) : this.save.record.played) < 2) ? 0 : -1; // (co-op: the key hints show both players' keys)
    this.tutT = 1.5;
  }

  tutorialTips() {
    const touch = this.isTouch, k = hintKeys(this.input.lastDevice === 'gamepad');
    if (this.match && this.match.goalieMode) return [
      touch ? t('You\'re in goal! Drag your left thumb to move Halla: she holds the angle, you nudge her.') : t('You\'re in goal! Move Halla with {move}: she holds the angle, you nudge her.', k),
      touch ? t('Shot coming? BLOCK drops into the butterfly, DIVE throws Halla across the net.') : t('Shot coming? {shoot} drops into the butterfly, {pass} dives across the net.', k),
      touch ? t('Caught it? PASS goes toward your thumb, CLEAR rims it around the boards.') : t('Caught it? {shoot} passes toward where you\'re steering, {pass} rims it around the boards.', k),
      touch ? t('The round button pokes the puck off a close carrier. Saves charge Wall of Ice: fire it with the star.') : t('{skill} pokes the puck off a close carrier. Saves charge Wall of Ice: fire it with {ult}.', k),
    ];
    if (this.match && this.match.simple) return [
      touch ? t('Drag your thumb to skate. Push it all the way to go fast.') : t('Skate with {move}. You go fast by yourself.', k),
      touch ? t('Near their net, PLAY shoots. Further out, PLAY passes to a teammate.') : t('Near their net, {shoot} shoots. Further out, it passes to a teammate.', k),
      touch ? t('No puck? PLAY checks, and you always skate the player nearest the puck.') : t('No puck? {shoot} checks, and you always skate the player nearest the puck.', k),
    ];
    return [
      touch ? t('Drag your left thumb to skate. Hold SPRINT for a burst of speed.') : t('Skate with {move}. Hold {sprint} to sprint.', k),
      touch ? t('With the puck: tap SHOOT for a wrist shot, hold it to charge a slapshot.') : t('With the puck: tap {shoot} for a wrist shot, hold {shoot} to charge a slapshot.', k),
      touch ? t('Defender in your face? Tap SPRINT to deke past them. Near the goalie, a deke can make them bite.') : t('Defender in your face? Tap {sprint} to deke past them. Near the goalie, a deke can make them bite.', k),
      touch ? t('PASS goes to the teammate you\'re steering toward: the gold ring at their feet. Hold SHOOT as it arrives for a one-timer.') : t('{pass} passes toward the teammate you\'re steering at: the gold ring at their feet. Hold {shoot} as it arrives for a one-timer.', k),
      touch ? t('No puck? SHOOT becomes CHECK and PASS switches to the skater nearest the puck.') : t('No puck? {shoot} checks and {pass} switches to the skater nearest the puck.', k),
      touch ? t('The round button above SHOOT is your signature skill. The star fires your ultimate when it glows.') : t('{skill} fires your signature skill. {ult} fires your ultimate when the gold bar is full.', k),
    ];
  }

  hookMatch(m) {
    const cam = () => this.renderer.cam;
    const vol = (x, y) => {
      const s = toScreen(x, y);
      return Math.max(0.25, 1 - Math.hypot(s.x - cam().x, s.y - cam().y) / 1100);
    };
    // volume by distance from the camera, and stereo position across the screen
    const at = (x, y, k = 1) => {
      const s = toScreen(x, y);
      return { vol: k * vol(x, y), pan: Math.max(-0.8, Math.min(0.8, (s.x - cam().x) / 700)) };
    };
    m.on('shot', (e) => {
      audio.sfx(e.kind === 'thunderclap' ? 'thunder' : ['slap', 'onetimer', 'zero', 'firestorm', 'eclipse'].includes(e.kind) ? 'slap' : 'stick', at(e.s.x, e.s.y));
      if (e.s.controlled && e.kind !== 'wrist') this.rumble(0.35, 0.6, 90, e.s.team, e.s.seat);
    });
    m.on('pass', (e) => audio.sfx('pass', at(e.s.x, e.s.y)));
    m.on('receive', (e) => audio.sfx('receive', at(e.s.x, e.s.y)));
    m.on('goalie_pass', (e) => audio.sfx('pass', at(e.g.x, e.g.y, 0.6)));
    m.on('poke_check', (e) => audio.sfx('poke', at(e.g.x, e.g.y)));
    m.on('dump', (e) => audio.sfx('slap', at(e.s.x, e.s.y, 0.6)));
    m.on('goalie_plays', (e) => audio.sfx('stop', at(e.g.x, e.g.y, 0.7)));
    m.on('puck_boards', (e) => { if (e.power > 220) audio.sfx('boards', at(e.x, e.y, Math.min(1, e.power / 900))); });
    m.on('boards', (e) => audio.sfx('boards', at(e.s.x, e.s.y, 0.5)));
    m.on('post', (e) => { audio.sfx('post', at(e.x, e.y)); this.rumble(0.15, 0.6, 120); });
    m.on('net_hit', (e) => { audio.sfx('net', at(e.side * GOAL_X, 0, 0.6)); this.renderer.nets.ripple(e.side, this.match.puck.y, 0.4); });
    m.on('hit', (e) => {
      audio.sfx('check', at(e.b.x, e.b.y, Math.min(1, Math.max(0.4, e.power / 450))));
      for (const k of [e.a, e.b]) if (k.controlled) { this.rumble(Math.min(1, e.power / 400), 0.3, 130, k.team, k.seat); if (k === e.b) buzz(15); }
    });
    m.on('penalty', (e) => {
      const ours = e.team === 0;
      if (e.shot) { // taken down on a breakaway: a penalty shot
        this.hud.banner(`<div class="small" style="color:${ours ? '#ff6f7d' : '#ffd45e'}">${t('PENALTY SHOT')}</div><div class="sub">${e.s.name} · ${t(e.reason)} · ${e.shooter.name}</div><div class="small" style="font-size:clamp(20px,3.6vw,34px);margin-top:6px">${ours ? (m.goalieMode || (this.cur && this.cur.versus) ? t('One on one with your goalie!') : t('One on one: you\'re in goal!')) : t('Alone against the goalie: make it count!')}</div>`, 2);
        audio.sfx('whistle'); audio.crowdOoh(1);
        return;
      }
      this.hud.banner(`<div class="small" style="color:${ours ? '#ff6f7d' : '#ffd45e'}">${t('PENALTY')}</div><div class="sub">${e.s.name} · ${t(e.reason)} · ${PENALTY_SECONDS}s</div><div class="small" style="font-size:clamp(20px,3.6vw,34px);margin-top:6px">${ours ? t('Penalty kill: survive it!') : t('Power play!')}</div>`, 2);
      audio.sfx('whistle'); audio.crowdOoh(ours ? 0.4 : 0.8);
      if (ours && e.reason === 'Interference' && !this.penTipShown && !this.cur.versus) {
        this.penTipShown = true;
        setTimeout(() => this.hud.hint(this.isTouch ? t('Only check the puck carrier. Hits away from the puck draw penalties.') : t('Only check the puck carrier. Hits away from the puck draw penalties.'), 5), 2200);
      }
    });
    m.on('plan_change', (e) => { if (!m.humans.includes(e.team)) this.hud.ticker(t('The {team} switch to {plan}!', { team: e.team === 1 ? (teamInfo(this.awayTeamId).nick || teamInfo(this.awayTeamId).name.split(' ').slice(-1)[0]) : CLUB.nick, plan: t(GAME_PLANS[e.id].name) })); });
    m.on('tip', (e) => audio.sfx('stick', at(e.s.x, e.s.y, 0.7)));
    m.on('screen', (e) => { if (e.g.human && !this.attract && !(this.cur && this.cur.versus) && firstTime(this.save, 'screened')) this.hud.hint(t('Screened! A body in front hides the puck until it\'s past them. Watch for it coming out.'), 4); });
    m.on('penalty_delayed', (e) => {
      audio.crowdOoh(0.4);
      if (!this.attract && e.team === 1 && !m.goalieMode && !(this.cur && this.cur.versus) && firstTime(this.save, 'delayed')) this.hud.hint(this.isTouch ? t('Delayed penalty! The whistle waits until they touch the puck. Keep it, and tap PULL GOALIE for a free extra attacker.') : t('Delayed penalty! The whistle waits until they touch the puck. Keep it, and press {pull} for a free extra attacker.', hintKeys(this.input.lastDevice === 'gamepad')), 6);
    });
    m.on('penalty_over', (e) => { if (!e.byGoal) this.hud.ticker(t('{name} is out of the box. Back to full strength.', { name: e.s.name })); });
    m.on('goalie_pulled', (e) => {
      this.hud.banner(`<div class="small" style="color:${e.team === 0 ? '#ffd45e' : '#ff6f7d'}">${e.team === 0 ? t('GOALIE PULLED') : t('THEY PULLED THEIR GOALIE')}</div><div class="sub">${e.team === 0 ? t('Extra attacker on! Protect the empty net.') : t('Empty net! Shoot from anywhere.')}</div>`, 1.8);
      audio.sfx('whistle', { vol: 0.4 }); audio.crowdCheer(0.4);
    });
    m.on('goal', () => {
      setTimeout(() => {
        if (this.match !== m || this.pullTipShown || this.cur.versus) return;
        if (m.canPullGoalie && m.score[0] < m.score[1] && m.score[1] >= m.winScore - 1) {
          this.pullTipShown = true;
          this.hud.hint(this.isTouch ? t('Desperate? Tap PULL GOALIE for an extra attacker.') : t('Desperate? Press {pull} to pull your goalie for an extra attacker.', hintKeys(this.input.lastDevice === 'gamepad')), 6);
        }
      }, 4200);
    });
        m.on('goalie_returned', (e) => { if (e.team === 0) this.hud.ticker(t('Halla is back in net.')); });
    m.on('no_goal', (e) => { this.hud.banner(`<div class="small" style="color:#ff6f7d">${t('NO GOAL')}</div><div class="sub">${t(e.reason)}</div>`, 1.6); audio.sfx('whistle'); audio.crowdOoh(0.8); });
    m.on('save', (e) => { audio.sfx(e.caught ? 'catch' : 'save', at(e.x, e.y, 0.85)); if (!e.caught) audio.crowdOoh(0.6); });
    m.on('big_save', (e) => { if (!this.attract && !(this.cur && this.cur.drill)) { this.hud.cutin(e.g, null, t('DENIED!')); audio.crowdOoh(1); } });
    m.on('goalie_wall', (e) => {
      audio.sfx('freeze'); audio.sfx('ult');
      this.hud.cutin(e.g, null, t('WALL OF ICE'));
      this.hud.ticker(t('{name} puts up the Wall of Ice!', { name: e.g.name }));
      this.rumble(0.5, 0.7, 260, 0, m.keeperCoop ? 1 : 0); // (keeper co-op: player 2's pad)
    });
    m.on('block', () => audio.sfx('save', { vol: 0.6 }));
    m.on('goal', (e) => {
      this.rumble(0.9, 0.6, 400);
      this.replay.markGoal();
      this.replayPending = this.save.settings.replays !== false;
      this.renderer.nets.ripple(e.side, e.y, 1);
      // the building cheers its own team; a horn for the home side, a siren for visitors
      const homeSide = this.arena === 'home' ? 0 : 1;
      audio.goalHorn(e.team === homeSide, homeSide === 0 && this.save.settings.horn && this.save.settings.horn !== 'home' ? this.save.settings.horn : null); // (our rink: the club's pick)
      audio.sfx('net', at(e.side * GOAL_X, e.y));
      if (e.team === homeSide) audio.crowdCheer(1);
      else { audio.crowdAww(1); audio.crowdCheer(0.25); if (homeSide === 1) audio.crowdBoo(0.6); }
      if (!(this.cur && this.cur.drill)) audio.jingle(e.team === 0 || (this.cur && this.cur.versus) ? 'goal_for' : 'goal_against');
      this.hud.goal(e);
      if (e.team === 0) buzz([30, 40, 60]);
      setTimeout(() => { if (this.match === m) audio.sfx('whistle', { vol: 0.5 }); }, 2600);
    });
    m.on('faceoff', () => audio.sfx('whistle', { vol: 0.55 }));
    m.on('penalty_shot', (e) => {
      this.replay.clear(); // (its replay starts at centre ice, not before the foul)
      if (m.pshot && m.pshot.keeper && !(this.cur && this.cur.versus)) this.hud.hint(this.isTouch ? t('You\'re in goal! BLOCK drops to the butterfly, DIVE dives across.') : t('You\'re in goal! {shoot} drops to the butterfly, {pass} dives.', hintKeys(this.input.lastDevice === 'gamepad')), 4);
    });
    m.on('hat_trick', () => setTimeout(() => { if (this.match === m) audio.crowdCheer(1); }, 400)); // (the hats come down to a roar)
    // how the draw is won: shown once, on the first early press or the first faceoff after a goal
    const drawHint = () => {
      if (this.attract || (this.cur && this.cur.versus) || m.goalieMode || m.coop || !firstTime(this.save, 'faceoff')) return; // (versus and co-op have their own keys)
      this.hud.hint(this.isTouch ? t('Wait for the puck to touch the ice, then tap SHOOT or PASS to win the draw.')
        : t('Wait for the puck to touch the ice, then press {shoot} or {pass} to win the draw.', hintKeys(this.input.lastDevice === 'gamepad')), 5);
    };
    m.on('faceoff_early', (e) => { audio.sfx('deny', { vol: 0.5 }); if (e.s.team === 0) drawHint(); });
    m.on('faceoff', () => { if (m.score[0] + m.score[1] > 0 && !m.drill) drawHint(); });
    m.on('drop', () => audio.sfx('drop'));
    m.on('stop', (e) => audio.sfx('stop', at(e.s.x, e.s.y, 0.8)));
    m.on('splash', (e) => {
      const now = performance.now();
      if (now - (this.lastSplash || 0) < 700) return; // one splash at a time
      this.lastSplash = now;
      audio.sfx('splash', at(e.x, e.y, Math.min(1, e.power / 300)));
    });
    m.on('icicle_warn', (e) => audio.sfx('shimmer', at(e.x, e.y, 0.5)));
    m.on('icicle', (e) => {
      audio.sfx('crack', at(e.x, e.y, 0.9)); audio.sfx('stone', at(e.x, e.y, 0.5));
      const ours = e.hit.find((s) => s.controlled);
      if (ours) this.rumble(0.25, 0.5, 160, ours.team, ours.seat || 0);
      if (e.hit.length && !this.attract) this.hud.ticker(t('{name} got caught under a falling icicle!', { name: e.hit[0].name }));
    });
    m.on('chunk_hit', (e) => audio.sfx('boards', at(e.x, e.y, Math.min(0.8, 0.3 + e.power / 1200))));
    m.on('ice_crack', (e) => { audio.sfx('crack', { vol: 0.5 + e.k * 0.3 }); if (!e.grow) this.rumble(0.1, 0.3, 80); });
    m.on('aurora_shift', () => audio.sfx('shimmer', { vol: 0.8 }));
    m.on('gust', (e) => { audio.sfx('whoosh', { vol: 0.9 }); if (!this.attract) this.hud.ticker(e.dir > 0 ? t('A gust off the sea, blowing to the right!') : t('A gust off the sea, blowing to the left!')); });
    m.on('puck_hop', (e) => { audio.sfx('boards', at(e.x, e.y, 0.45)); audio.sfx('stick', at(e.x, e.y, 0.5)); });
    m.on('deke', (e) => audio.sfx('glide', at(e.s.x, e.s.y, 0.55)));
    m.on('plank', (e) => { audio.sfx('boards', at(e.x, e.y, Math.min(1, 0.4 + e.power / 900))); audio.sfx('stick', at(e.x, e.y, 0.6)); });
    m.on('glare', (e) => audio.sfx('shimmer', at(e.x, e.y, 0.35)));
    m.on('stride', (e) => { if (e.s.controlled) audio.sfx('stride'); });
    m.on('pickup_spawn', () => {
      audio.sfx('pickup', { vol: 0.7 });
      if (this.tutorial >= 0 && !this.powerTipShown) { this.powerTipShown = true; this.hud.hint(this.isTouch ? t('A power orb! Skate the puck through it to charge the puck.') : t('A power orb! Skate or shoot the puck through it to charge the puck.'), 5); }
    });
    m.on('power_get', (e) => { audio.sfx('power', { type: e.type }); if (e.by && e.by.team === 0) this.hud.hint(t(POWER_INFO[e.type].text), 3.5); });
    m.on('skill', (e) => (e.id === 'heat' ? audio.sfx('power', { type: 'fire', ...at(e.s.x, e.s.y) }) : audio.sfx({ dash: 'dash', glide: 'glide', bedrock: 'bedrock', tailwind: 'whoosh', fade: 'shimmer' }[e.id], at(e.s.x, e.s.y))));
    m.on('ult', (e) => {
      audio.sfx(e.id === 'monolith' ? 'stone' : 'ult');
      audio.sfx('whoosh', { vol: 0.8 });
      this.hud.cutin(e.s);
      if (e.s.controlled) this.rumble(0.6, 0.9, 260, e.s.team, e.s.seat);
      this.fx.slowmo = 0.45; this.fx.slowScale = 0.3;
    });
    m.on('frozen', () => audio.sfx('freeze', { vol: 0.7 }));
    m.on('barrier_block', () => audio.sfx('stone', { vol: 0.8 }));
    m.on('ult_denied', (e) => { if (e.s.controlled) { audio.sfx('deny'); this.hud.hint(t('{ult} needs the puck.', { ult: t(e.s.def.ult.name) }), 2); } });
    m.on('ult_ready', (e) => {
      if (!e.s.controlled) return;
      audio.sfx('pickup', { vol: 0.8 });
      if (!this.attract && e.s.team === 0 && firstTime(this.save, 'ult')) this.hud.hint(this.isTouch ? t('Your ultimate is charged! Tap the glowing star.') : t('Your ultimate is charged! Press I (gamepad: Y / △).'), 5);
    });
    m.on('steal', (e) => audio.sfx('stick', at(e.s.x, e.s.y, 0.6)));
    m.on('lightning_pass', () => audio.sfx('dash'));
    m.on('combo', (e) => {
      audio.sfx('combo', { key: e.key });
      this.hud.cutin(e.s, e.from, t(COMBOS[e.key].name));
      if (e.s.controlled) this.rumble(0.5, 0.8, 220, e.s.team, e.s.seat);
      this.fx.slowmo = 0.3; this.fx.slowScale = 0.35;
      if (e.s.team === 0) buzz(20);
    });
    m.on('quake', () => audio.sfx('thunder', { vol: 0.7 }));
    m.on('plow', () => audio.sfx('check', { vol: 0.8 }));
    m.on('combo_ready', (e) => {
      if (!e.s.controlled) return;
      audio.sfx('pickup', { vol: 0.5 });
      if (!this.attract && e.s.team === 0 && firstTime(this.save, 'combo')) this.hud.hint(t('Chemistry! Shoot right away after a bonded teammate\'s pass for a combo shot.'), 5);
    });
    m.on('chain', (e) => { if (e.team === 0) audio.sfx('coin', { vol: 0.5 }); });
    m.on('final', () => {
      audio.sfx('whistle');
      setTimeout(() => { if (this.match === m) this.endMatch(); }, 2600);
    });
  }

  endMatch() {
    if (this.scene !== 'match' && this.scene !== 'paused') return;
    if (this.scene === 'paused') { this.pauseModal?.remove(); this.autoPaused = false; } // (paused just after the final whistle)
    const m = this.match, s = this.save, c = this.cur;
    const summary = m.summary();
    if (c.versus) return this.endVersus(summary);
    const rewards = computeRewards(s, summary, c.stage, c.exhibition);
    s.coins += rewards.coins;
    const ups = [];
    for (const id of Object.keys(rewards.exp)) ups.push(...applyExp(s, id, rewards.exp[id]));
    const gUp = applyGoalieExp(s, rewards.gExp, summary.goalie);
    const chemUps = applyChem(s, rewards.chem);
    s.record.played++;
    s.record.goals += summary.score[0];
    if (refreshAgents(s)) this.agentNews = true; // new faces on the free-agent market
    recordCareer(s, summary, rewards.won);
    // the club's record book: a record broken gets a toast
    const oppName = teamInfo(c.teamId) ? teamInfo(c.teamId).name : '';
    for (const r of updateRecords(s, { summary, won: rewards.won, opp: c.teamId, oppName, season: s.season, nameOf: (id) => (member(id) ? member(id).name : ''), goalieName: (summary.goalieNames && summary.goalieNames[0]) || goalieInfo(summary.goalie || 'halla').name })) {
      const R = GAME_RECORDS[r.id];
      addNews(s, { k: 'record', rec: r.id, n: r.n, name: r.name || '', team: c.teamId });
      setTimeout(() => this.toast(Assets.icon(Assets.atlas.frames['icons/career'] ? 'icons/career' : 'icons/stat_goals', 72), t('New club record'), t(R.name), t(R.text, { ...s.records[r.id], n: s.records[r.id].n })), 3000);
    }
    // now and then a legend turns up in Scouting
    const legend = rollLegend(s, Math.random, (k) => LEGEND_ART.has(LEGENDS[k].art) || this.legendsPreview);
    if (legend) this.pendingLegend = legend; // Kip announces them on the way back to the hub
    const scorers = (team) => Object.fromEntries(summary.skaters.filter((k) => k.team === team && k.goals).map((k) => [k.id, k.goals]));
    const allstar = !!(c.fixture && c.fixture.kind === 'allstar');
    const firstWin = rewards.won && !((s.rivals && s.rivals[c.teamId] && s.rivals[c.teamId].wins) > 0);
    if (!allstar) recordRivalResult(s, c.teamId, summary.score[0], summary.score[1], rewards.won, { ourScorers: scorers(0), theirScorers: scorers(1) });
    if (firstWin && TEAMS[c.teamId] && TEAMS[c.teamId].names) {
      setTimeout(() => this.toast(crest(c.teamId, 72), t('Scouting'), t('{team} will take your call', { team: TEAMS[c.teamId].name }), t('Sign their skaters in Team › Scouting')), 1600);
    }
    let becameChampion = false, leagueOut = null;
    if (rewards.won) s.record.wins++;
    const classic = !!(c.fixture && c.fixture.kind === 'classic');
    if (!c.exhibition && s.league && classic) {
      // a showcase: on the record and in the trophy case, not in the standings
      recordClassic(s.league, summary.score[0], summary.score[1], c.teamId);
      (s.classics ||= []).push({ season: s.season, opp: c.teamId, gf: summary.score[0], ga: summary.score[1] });
      if (rewards.won) this.ach.unlock('winter-classic');
    } else if (!c.exhibition && s.league && allstar) {
      // a showcase too; afterwards our signings' art is all the kit needs again
      const score = (k) => k.goals * 3 + k.assists * 2 + k.steals + k.hits * 0.5;
      const mvp = [...summary.skaters].sort((a, b) => score(b) - score(a))[0];
      recordAllStar(s.league, { gf: summary.score[0], ga: summary.score[1], won: rewards.won, mvp: mvp && { name: mvp.name, team: mvp.team } });
      (s.allstars ||= []).push({ season: s.season, gf: summary.score[0], ga: summary.score[1], star: c.allstar.star });
      if (rewards.won) this.ach.unlock('all-star');
      Assets.ensureKit(homeKitGroups(s));
    } else if (!c.exhibition && s.league) {
      recordRealGame(s, s.league, summary, c.teamId);
      for (const k of summary.skaters) if (k.team === 0 && k.goals >= 3) addNews(s, { k: 'hatTrick', name: k.name, team: c.teamId, n: k.goals }); // (the league notices)
      // scoring streaks in league games: news at 3, 5, 7 and 10 straight
      const streaks = (s.goalStreaks ||= {});
      for (const k of summary.skaters) {
        if (k.team !== 0 || !s.roster[k.id]) continue;
        streaks[k.id] = k.goals > 0 ? (streaks[k.id] || 0) + 1 : 0;
        if ([3, 5, 7, 10].includes(streaks[k.id])) addNews(s, { k: 'streak', name: k.name, team: 'home', n: streaks[k.id] });
        if (streaks[k.id] >= 5) this.ach.unlock('hot-hand');
      }
      leagueOut = recordOurGame(s.league, s, summary.score[0], summary.score[1]);
      leagueOut.kind = c.fixture ? c.fixture.kind : 'regular';
      leagueOut.won = rewards.won;
      // the rivals live too: a hole filled now and then, and maybe a call with an offer
      const move = rivalSigning(s);
      if (move) leagueOut.moves = [move];
      this.pendingOffer = rivalOffer(s);
      if (leagueOut.champion === 'home') { s.champion = true; becameChampion = true; s.cups = (s.cups || 0) + 1; noteCup(s, rosterIds(s), goalieIds(s)); }
      if (leagueOut.champion) addNews(s, { k: 'champion', team: leagueOut.champion });
      s.stage = s.league.round;
    }
    // the Hall of Fame: anyone who's earned it goes in (the ceremony comes after the results)
    this.pendingHall = hallCandidates(s, rosterIds(s), goalieIds(s)).map((h) => induct(s, h, h.goalie ? goalieInfo(h.id).name : member(h.id).name));
    for (const h of this.pendingHall) addNews(s, { k: 'hall', name: h.name, n: h.number });
    if (!c.exhibition && s.league) { // Coach Brekka's season goals: paid as they're met
      const sg = updateSeasonGoals(s, { kind: c.fixture ? c.fixture.kind : 'regular', won: rewards.won, summary, opp: c.teamId });
      for (const g of sg.met) rewards.lines.push([t('Season goal: {goal}', { goal: t(g.text, { n: g.n }) }), g.coins]);
      if (sg.bonus) { rewards.lines.push([t('All three season goals!'), sg.bonus]); this.ach.unlock('coachs-orders'); }
      rewards.coins += sg.met.reduce((a, g) => a + g.coins, 0) + sg.bonus;
      if (sg.met.length) setTimeout(() => this.toast(Assets.icon(Assets.atlas.frames['icons/season_goals'] ? 'icons/season_goals' : (Assets.atlas.npcs && Assets.atlas.npcs.coach) || 'badges/daily_star', 72), t('Season goal'), t(sg.met[0].text, { n: sg.met[0].n }), t('+{n} coins', { n: sg.met[0].coins + sg.bonus })), 2400);
    }
    if (c.daily) {
      const goal = dailyGoal(c.daily.goal);
      const met = goal.check(summary);
      const done = met ? completeDaily(s, c.daily.date) : null;
      if (done) {
        rewards.lines.push([t('Daily challenge · {n}-day streak', { n: done.streak }), done.coins]);
        setTimeout(() => audio.jingle('daily'), 4200);
        this.postScore('daily_streak', dailyState(s).best);
        rewards.coins += done.coins;
        this.ach.unlock('daily');
        if (done.streak >= 7) this.ach.unlock('daily-streak');
      } else rewards.lines.push([met ? t('Daily challenge (already done today)') : t('Daily goal missed: {goal}', { goal: t(goal.text) }), 0]);
    }
    this.ach.endMatch(summary, { league: !c.exhibition && !allstar, exhibition: c.exhibition, mods: c.mods, coop: !!c.coop });
    if (summary.seats) addSeatTotals(s, summary); // (two players: who's ahead, over every co-op match)
    if (summary.goalieMode) { s.goalieGames = (s.goalieGames || 0) + 1; if (rewards.won) this.ach.unlock('between-pipes'); }
    this.ach.checkMeta();
    s.training.sessions = trainingSessions(s);
    writeSave(s);
    this.wake?.release?.().catch(() => {});
    this.hud.hide();
    this.scene = 'results';
    this.music(rewards.won ? 'victory' : 'defeat');
    if (ups.length) setTimeout(() => audio.jingle('level'), 2600);
    const rematch = c.exhibition && !c.daily && !c.fixture && !c.versus && this.lastExhibition && this.lastExhibition.teamId === c.teamId;
    this.rematchNext = false;
    this.ui.results({ summary, rewards, ups, chemUps, teamId: c.teamId, exhibition: c.exhibition, round: c.stage.round, roundN: c.stage.roundN, gUp, clips: this.clips, rematch }, () => {
      this.fx.heavySnow = false;
      const finish = () => {
        // Play again: the same exhibition straight away
        if (this.rematchNext) { this.rematchNext = false; const e = this.lastExhibition; return this.startExhibition(e.teamId, e.mods, e.arena, e.rules, e.coop); }
        if (becameChampion) { this.scene = 'results'; this.music('final'); audio.jingle('champion'); this.ui.champion(() => this.goHub('tournament')); } else this.goHub(rewards.won ? 'tournament' : 'team');
      };
      const call = (next) => { const o = this.pendingOffer; this.pendingOffer = null; return o ? this.ui.rivalCall(o, next) : next(); };
      const hall = (next) => { const h = this.pendingHall || []; this.pendingHall = null; return h.length ? this.ui.hallCeremony(h, next) : next(); };
      const after = () => this.leagueUpdate(leagueOut, () => call(() => this.resolvePerks(() => this.ui.chemUnlocked(chemUps, () => hall(() => {
        if (becameChampion || c.exhibition) return finish();
        this.lockerRoom(summary, rewards, finish);
      })))));
      const kind = c.fixture ? c.fixture.kind : 'regular';
      const script = kind === 'regular' ? DIALOGUE[c.teamId] : kind === 'final' && DIALOGUE[c.teamId].final ? { win: DIALOGUE[c.teamId].finalWin, loss: DIALOGUE[c.teamId].finalLoss } : PLAYOFF_LINES[kind];
      let lines = !c.exhibition && script ? [...(script[rewards.won ? 'win' : 'loss'] || [])] : null;
      const extra = allstar ? null : rivalAfterLine(s, c.teamId, rewards.won, summary.score[0], summary.score[1]);
      if (extra) lines = [...(lines || []), extra];
      if (lines) { this.scene = 'dialogue'; this.ui.dialogue(lines, c.teamId, null, after, rewards.won ? 'won' : 'lost'); } else after();
    });
    if (classic && rewards.won) this.ui.fireworks();
  }

  resolvePerks(done) {
    const id = Object.keys(this.save.roster).find((k) => this.save.roster[k].pendingPerk !== null);
    if (!id) return done();
    this.ui.perkChoice(id, () => this.resolvePerks(done));
  }

  giveExp(id, amount) { return applyExp(this.save, id, amount); }

  skipReplay() {
    if (!this.replay.active) return;
    this.replay.active = false;
    this.endReplay();
  }

  startClip(m) {
    if (!this.save.settings.clips || !this.clips.supported || !m.lastGoal) return;
    const g = m.lastGoal, away = teamInfo(this.awayTeamId);
    const scorer = g.scorer ? g.scorer.name : t('Goal');
    const assists = g.assists && g.assists.length ? g.assists.map((a) => a.name).join(' & ') : '';
    const who = (name) => (assists ? t('{scorer} from {assists}', { scorer: name, assists }) : name);
    const kind = g.kind === 'onetimer' ? ` · ${t('one-timer')}` : g.kind === 'tip' ? ` · ${t('tip-in')}` : g.special && g.special.combo ? ` · ${t(COMBOS[g.special.combo].name)}` : g.powerPlay ? ` · ${t('power play')}` : '';
    const score = `${TEAMS.home.short} ${m.score[0]} – ${m.score[1]} ${away.short}`;
    this.renderer.clipOverlay = { title: `${who(scorer.toUpperCase())}${kind}`, score };
    this.clips.start({ scorer, line: `${who(scorer)}${kind}. ${score}`, team: g.team, score });
  }

  // Buttons still down from the pause menu (the one that pressed Resume) count once they're let go.
  releaseHeld(...inputs) {
    if (!this.heldFromPause) return;
    for (const k of this.heldFromPause) {
      if (inputs.some((i) => i[k])) for (const i of inputs) i[k] = false;
      else this.heldFromPause.delete(k);
    }
    if (!this.heldFromPause.size) this.heldFromPause = null;
  }

  // Drop any replay (and the clip it was recording) for good: a new match, or leaving one.
  resetReplay() {
    this.replay.clear();
    this.replayPending = false;
    this.clips.stop();
    this.renderer.clipOverlay = null;
    this.hud.replayMode(false);
  }

  endReplay() {
    const m = this.match;
    this.clips.stop();
    this.renderer.clipOverlay = null;
    this.hud.replayMode(false);
    if (!m) return;
    m.holdGoal = false;
    m.stateT = Math.max(m.stateT, 3.4);
  }

  // The crowd starts chanting when the game gets loud; that team's ultimates charge faster.
  updateChants(dt, m) {
    this.chantCool -= dt;
    if (this.chantCool > 0 || m.state !== 'play' || this.fx.chant) return;
    const trailingBy = m.score[0] - m.score[1];
    // (the Stands facility: at home, our fans get going sooner and keep at it longer)
    const boost = chantBoost(this.save, this.arena === 'home' && !this.attract && !(this.cur && this.cur.versus));
    let team = null;
    if (this.fx.excite > 0.55) team = trailingBy <= -2 ? 1 : 0;
    else if (boost.excite && this.fx.excite > 0.55 - boost.excite && trailingBy > -2) team = 0;
    if (team === null) return;
    this.chantCool = 30 - (team === 0 ? boost.cool : 0);
    this.fx.chant = { team, t: 0 };
    m.hype = { team, t: 7 + (team === 0 ? boost.longer : 0) };
    const away = teamInfo(this.awayTeamId);
    const name = team === 0 ? CLUB.nick.toUpperCase() : (away.nick || away.name.split(' ').slice(-1)[0]).toUpperCase();
    audio.chant(team === 0 ? 0.9 : 0.6);
    this.fx.text(0, -420, t('LET\'S GO {name}!', { name }), team === 0 ? '#71dce8' : away.color, 4, 24);
    this.hud.ticker(team === 0 ? t('The crowd is on its feet! {club} ultimates charge faster.', { club: CLUB.nick }) : t('{team} fans are loud. Their ultimates charge faster.', { team: (away.nick || away.name.split(' ').slice(-1)[0]) }));
  }

  // After a league match: other results, standings moves and playoff news.
  leagueUpdate(out, done) {
    if (!out) return done();
    this.scene = 'results';
    this.ui.leagueUpdate(out, this.save.league, done);
  }

  // Maybe show a locker-room moment between league matches.
  lockerRoom(summary, rewards, done) {
    const s = this.save;
    const L = s.league;
    let streak = 0;
    if (L) for (let i = L.results.length - 1; i >= 0; i--) { const g = L.results[i][0]; if (g.ga > g.gb) streak++; else break; }
    const ctx = { won: rewards.won, gf: summary.score[0], ga: summary.score[1], summary, streak, next: this.fixture(), ups: [] };
    // after a big game the press gets the player of the night instead
    const c = this.cur, game = { kind: c && c.fixture ? c.fixture.kind : 'regular', opp: c && c.teamId, won: rewards.won };
    const who = c && pressWorthy(s, game) && pressPlayer(summary);
    if (who && member(who)) {
      this.scene = 'results';
      const away = teamInfo(game.opp), name = member(who).name;
      const vars = { name, team: away ? away.name : '', club: CLUB.nick, score: `${summary.score[0]}–${summary.score[1]}`, n: Math.abs(rivalRecord(s, game.opp).streak) };
      return this.ui.pressConference(game, who, vars, (i) => { const a = answerPress(s, game, who, name, i); writeSave(s); return a; }, () => this.resolvePerks(done));
    }
    const m = pickMoment(s, ctx);
    if (!m) return done();
    this.scene = 'results';
    this.ui.lockerMoment(m, ctx, (i) => {
      m.choices[i].apply(s, ctx);
      markSeen(s, m);
      writeSave(s);
      return m.choices[i].reply;
    }, () => this.resolvePerks(done));
  }

  newSeason(reviewed = false) {
    if (this.loading) return; // (a second tap while the new clubs' art loads)
    const s = this.save;
    // first, the season just gone in review
    const review = !reviewed && seasonReview(s);
    if (review) { this.ui.seasonReview(review, () => this.newSeason(true)); return; }
    s.season++;
    s.stage = 0; s.beaten = []; s.champion = false;
    const before = new Set(Object.keys((s.rivals || {}))), last = s.league;
    s.league = newLeague(s.season);
    s.league.prevChampion = (last && last.champion) || null; // (beat them: a season goal)
    s.buffs = [];
    setLeagueEdge(s, last); // (the league keeps up with a club that ran away with it)
    writeSave(s);
    // the league grows: Kip welcomes the new clubs (once)
    const fresh = s.league.teams.filter((id) => TEAMS[id] && TEAMS[id].expansion && !before.has(id));
    if (fresh.length && !s.expansionSeen) {
      s.expansionSeen = true;
      addNews(s, { k: 'expansion', teams: fresh });
      writeSave(s);
      this.ui.clear(); // (the hub, and its New season button, go while the art loads)
      this.loadThen(Promise.all(fresh.map((id) => Assets.ensureTeam(id))), () => {
        this.scene = 'dialogue';
        this.ui.dialogue(EXPANSION_LINES, fresh[0], null, () => this.goHub('tournament'));
      });
      return;
    }
    this.goHub('tournament');
  }

  // ?twins=1: a test run with Fáfnir and Fenrir dressed (Fenrir on the wing, Fáfnir on
  // defence). It plays on a copy of the save: nothing is written and nothing goes online.
  twinsTest() {
    setSaveOff(true);
    this.testRun = true;
    const s = this.save;
    s.settings.online = false;
    for (const k of ['fafnir', 'fenrir']) if (!s.roster[k]) joinLegend(s, k);
    s.lineup.W = 'fenrir'; s.lineup.D = 'fafnir';
    s.seenIntro = true;
    const badge = document.createElement('div');
    badge.className = 'test-badge';
    badge.textContent = t('Test run: Fáfnir and Fenrir. Nothing is saved.');
    document.getElementById('app').appendChild(badge);
  }

  resetSave() {
    this.save = newSave();
    setRookies({});
    setFreeGoalies({});
    setGoalieLooks({});
    setStyles({}); // (training-camp changes)
    setFills(this.save);
    this.applyClubLook(); // the default club again: name, colours, crest
    this.ui.guideStep = null; this.ui.partsLoading = false;
    this.ach = new AchievementTracker(this.save, (a) => this.toastAchievement(a));
    writeSave(this.save);
    this.goTitle();
  }

  pause(auto) {
    if (this.scene !== 'match') return;
    this.scene = 'paused';
    this.touch.reset();
    const st = this.save.settings;
    // two players (versus, co-op): both players' keys above the usual list
    const two = this.cur && (this.cur.versus || this.cur.coop) ? `<p class="two-keys">${this.hud.el.querySelector('#keyhints')?.innerHTML || ''}</p>` : '';
    const controls = () => two + controlsHtml(this.isTouch, this.input.lastDevice === 'gamepad');
    const modal = this.ui.modal(`
      <h2>${t('Paused')}</h2>
      <div class="row"><button class="btn gold" id="p-resume">${t('Resume')}</button>
      <button class="btn small ${st.music ? 'cream' : 'ghost'}" id="p-music">${st.music ? t('Music on') : t('Music off')}</button>
      <button class="btn small ${st.sfx ? 'cream' : 'ghost'}" id="p-sfx">${st.sfx ? t('Sound on') : t('Sound off')}</button>
      ${this.cur && this.cur.drill ? '' : `<button class="btn small ghost" id="p-stats">${t('Match stats')}</button>`}
      <button class="btn small ghost" id="p-photo">${t('Photo')}</button></div>
      ${this.cur && !this.cur.drill && !this.cur.versus && !this.cur.allstar && !this.match.goalieMode ? `<div class="row p-plans"><span class="label">${t('Game plan')}</span>${Object.values(GAME_PLANS).map((p) => `<button class="btn small ${this.match.plans[0] === p.id ? 'cream' : 'ghost'}" data-pplan="${p.id}">${esc(t(p.name))}</button>`).join('')}<span class="muted" style="font-size:12.5px">${(() => { const theirs = this.match.plans[1], beat = Object.values(GAME_PLANS).find((p) => p.beats === theirs); return beat ? t('They\'re playing {plan}; {beat} beats it.', { plan: esc(t(GAME_PLANS[theirs].name)), beat: esc(t(beat.name)) }) : t('They\'re playing {plan}.', { plan: esc(t(GAME_PLANS[theirs].name)) }); })()}</span></div>` : ''}
      <div id="p-body">${controls()}</div>
      <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${this.cur && this.cur.drill ? t('Quitting a drill gives no rewards.') : t(this.match.winScore === 1 ? 'Score {a}–{b}, next goal wins.' : 'Score {a}–{b}, first to 5 wins.', { a: this.match.score[0], b: this.match.score[1] })}</span>
      <button class="btn small ghost" id="p-quit">${this.cur && this.cur.drill ? t('Quit') : t('Forfeit match')}</button></div>`, (m, close) => {
      const resume = () => { close(); this.resume(); };
      m.querySelector('#p-resume').addEventListener('click', resume);
      m.querySelector('#p-music').addEventListener('click', (e) => { st.music = !st.music; if (st.music && !st.musicVol) st.musicVol = 1; this.applySettings(); writeSave(this.save); e.target.textContent = st.music ? t('Music on') : t('Music off'); e.target.className = 'btn small ' + (st.music ? 'cream' : 'ghost'); });
      m.querySelector('#p-sfx').addEventListener('click', (e) => { st.sfx = !st.sfx; if (st.sfx && !st.sfxVol) st.sfxVol = 1; this.applySettings(); writeSave(this.save); e.target.textContent = st.sfx ? t('Sound on') : t('Sound off'); e.target.className = 'btn small ' + (st.sfx ? 'cream' : 'ghost'); });
      m.querySelector('#p-photo').addEventListener('click', (e) => this.photo(e.target));
      m.querySelectorAll('[data-pplan]').forEach((b) => b.addEventListener('click', () => { // a new plan from here on
        this.match.setPlan(0, b.dataset.pplan);
        m.querySelectorAll('[data-pplan]').forEach((o) => { const on = o.dataset.pplan === this.match.plans[0]; o.classList.toggle('cream', on); o.classList.toggle('ghost', !on); });
        audio.sfx('click');
      }));
      m.querySelector('#p-stats')?.addEventListener('click', (e) => { // the box score and shot map so far, or the controls again
        const body = m.querySelector('#p-body'), on = e.target.classList.toggle('cream');
        e.target.classList.toggle('ghost', !on);
        body.innerHTML = on ? this.pauseStats() : controls();
      });
      m.querySelector('#p-quit').addEventListener('click', (e) => {
        if (!e.target.dataset.armed) { e.target.dataset.armed = '1'; e.target.textContent = this.forfeitLoses() ? t('Tap again: it counts as a loss') : t('Tap again to confirm'); return; }
        close();
        this.forfeit();
      });
    }, false);
    this.pauseModal = modal;
    if (auto) this.autoPaused = true;
  }

  // A photo of the ice as it stands (the pause menu): shared on a phone, saved elsewhere.
  photo(btn) {
    const c = this.renderer.c;
    if (!c || !c.toBlob) return;
    audio.sfx('click');
    const shoot = (fn) => { try { c.toBlob(fn, 'image/png'); } catch { if (btn) btn.disabled = true; } }; // (a canvas that won't give itself up)
    shoot(async (b) => {
      if (!b) return;
      const name = `puckbound-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      const file = new File([b], name, { type: 'image/png' });
      try {
        if (this.isTouch && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Puckbound' }); return; }
      } catch { /* share sheet closed */ return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (btn) { btn.textContent = t('Saved!'); setTimeout(() => { if (btn.isConnected) btn.textContent = t('Photo'); }, 1500); }
    });
  }

  // The pause menu's match stats: shots, each skater's line and the shot map so far.
  pauseStats() {
    const m = this.match, sm = m.summary(), team = TEAMS[this.cur.teamId], theirs = (team && team.color) || '#f5b3bb';
    const rows = sm.skaters.map((k) => `<tr style="color:${k.team === 0 ? 'var(--cream)' : '#f5b3bb'}"><td>${esc(k.name)}</td><td>${k.goals}</td><td>${k.assists}</td><td>${k.shots}</td><td>${k.hits}</td></tr>`).join('');
    return `<div class="muted" style="font-size:13px">${t('Shots on goal {a}–{b}', { a: sm.shots[0], b: sm.shots[1] })} · ${t('Faceoffs {a}–{b}', { a: sm.draws[0], b: sm.draws[1] })} · ${t('{n} saves', { n: sm.saves[0] })}</div>
      <table class="res-table"><thead><tr><th>${t('Player')}</th><th>${t('G')}</th><th>${t('A')}</th><th>${t('SOG')}</th><th>${t('HIT')}</th></tr></thead><tbody>${rows}</tbody></table>
      ${sm.shotMap.length ? shotMapSvg(sm.shotMap, CLUB.trim || '#71dce8', theirs) : ''}`;
  }

  resume() {
    if (this.scene !== 'paused') return;
    if (this.isTouch && window.innerHeight > window.innerWidth) return;
    this.pauseModal?.remove();
    this.scene = 'match';
    this.touch.reset();
    this.acc = 0;
    this.heldFromPause = new Set(['a', 'b', 'skill', 'ult', 'pull']); // (the button that pressed Resume isn't a pass)
  }

  // A league, playoff or Winter Classic game given up is lost (the other side gets to the
  // winning score): it can't be quit and played again for a better result.
  forfeitLoses() {
    const c = this.cur, m = this.match;
    return !!(c && !c.drill && !c.versus && !c.exhibition && c.fixture && c.fixture.kind !== 'allstar' && m && m.winner !== 0);
  }

  forfeit() {
    const drill = this.cur && this.cur.drill;
    this.resetReplay(); // (a goal's replay could still be running)
    // the deciding goal's in (its replay or the final whistle still to come): the result stands
    if (this.cur && !drill && !this.cur.versus && this.match && this.match.winner !== null) { this.scene = 'match'; return this.endMatch(); }
    if (this.forfeitLoses()) {
      const m = this.match;
      m.score[1] = Math.max(m.score[1], m.winScore, m.score[0] + 1);
      m.winner = 1; m.state = 'over';
      this.scene = 'match';
      return this.endMatch();
    }
    this.hud.hide();
    this.wake?.release?.().catch(() => {});
    this.startAttract();
    this.goHub(drill && drill !== 'shootout' ? 'training' : undefined);
  }

  goTitle() {
    this.scene = 'title';
    this.resetReplay();
    this.hud.hide();
    if (!this.attract) this.startAttract();
    this.ui.title();
    if (!Assets.groupReady('title')) Assets.loadGroup('title').then(() => { if (this.scene === 'title') this.ui.titleLogo(); }).catch(() => {});
    this.music('title');
    audio.setArena('menu');
  }

  goHub(tab) {
    this.scene = 'hub';
    this.resetReplay();
    this.hud.hide();
    this.rotateEl.hidden = true;
    if (!this.attract) this.startAttract();
    audio.setArena('menu');
    flushScores(this.save).then((n) => { if (n) writeSave(this.save); }).catch(() => {});
    cloudBackup(this.save).then((t) => { if (t) writeSave(this.save); }).catch(() => {});
    // last week's friends-board cups: a top-three finish gets a toast and a place in the trophies
    settleCups(this.save).then((won) => {
      if (!won.length) return;
      this.ach.checkMeta();
      writeSave(this.save);
      won.forEach((w, i) => setTimeout(() => this.toast(cupPlaceImg(w.place, 72), t('Weekly Cup · {name}', { name: w.name }),
        w.place === 1 ? t('You won the Weekly Cup!') : w.place === 2 ? t('Second in the Weekly Cup') : t('Third in the Weekly Cup'), t('{n} points last week', { n: w.points })), 800 + i * 2600));
    }).catch(() => {});
    this.ui.guideBudget = 1; // one new coach's tip per visit
    if (refreshAgents(this.save)) { this.agentNews = true; writeSave(this.save); }
    if (this.agentNews && !this.testRun) {
      this.agentNews = false;
      const fa = Assets.atlas.frames['icons/free_agents'] ? 'icons/free_agents' : 'icons/contract';
      setTimeout(() => this.toast(Assets.icon(fa, 72), t('Free agents'), t('New faces on the market'), t('See them in Team › Scouting')), 1200);
    }
    if (this.awardsNight()) return;
    if (offerDraft(this.save)) writeSave(this.save); // Draft Day opens once the awards are handed out
    if (this.pendingLegend) { // a legend turns up: Kip calls it over the reveal painting
      const key = this.pendingLegend, L = LEGENDS[key];
      this.pendingLegend = null;
      const lines = this.save.roster[L.twin] ? LEGEND_LINES.twin[key] : LEGEND_LINES.arrive[key];
      const reveal = Assets.atlas.legends && Assets.atlas.legends.reveal;
      this.scene = 'dialogue';
      this.music('awards');
      this.ui.dialogue(lines, 'home', null, () => this.goHub('team'), null, reveal ? { bg: Assets.url(reveal.image) } : null);
      return;
    }
    if (this.legendsPreview && !legendState(this.save).visiting) {
      const st = legendState(this.save), free = Object.keys(LEGENDS).filter((k) => !this.save.roster[k]);
      if (free.length) { st.visiting = free[0]; st.until = this.save.record.played + STAY; }
    }
    this.ui.hub(tab);
    this.setHubBackground();
    this.music('hub');
    // the break reminder (Settings): after that much time in matches, at the next return to the room
    const brk = this.save.settings.breakAfter;
    if (brk && (this.playT || 0) >= brk * 60 && !this.testRun) {
      const mins = Math.round(this.playT / 60);
      this.playT = 0;
      setTimeout(() => {
        if (this.scene !== 'hub' || document.querySelector('.modal-bg')) { this.playT = brk * 60; return; } // (next time)
        this.ui.modal(`<div class="wn-coach">${this.ui.npcHtml('coach', t('That\'s {n} minutes on the ice. Great session! How about a rest, a stretch and a drink of water?', { n: mins }))}</div>
          <div class="row" style="justify-content:flex-end"><button class="btn small ghost" data-close>${t('Keep playing')}</button><button class="btn gold" id="brk-go">${t('Take a break')}</button></div>`, (m, close) => {
          m.querySelector('#brk-go').addEventListener('click', () => { close(); audio.sfx('confirm'); this.startAttract(); this.goTitle(); });
        });
      }, 700);
      return;
    }
    // what's new since a returning player was last here (once)
    const was = this.save.seenWhatsNew, news = !this.testRun && whatsNewFor(this.save);
    if (news) setTimeout(() => {
      if (this.scene !== 'hub' || document.querySelector('.modal-bg')) return; // (another time)
      this.save.seenWhatsNew = news.id; writeSave(this.save);
      this.ui.whatsNew(news);
    }, 900);
    else if (this.save.seenWhatsNew !== was) writeSave(this.save); // (a new player: nothing to read)
  }

  // New club colours or name: recolour our art and the signings, clear cached frames.
  applyClubLook() {
    applyClub(this.save.club);
    Assets.prepareClub();
    this.renderer.clearCaches();
    const kit = homeKitGroups(this.save);
    // once our pages are recoloured, the hub again (cards and portraits drawn before kept the old kit)
    if (kit.length) Assets.ensureKit(kit).then(() => { if (this.scene === 'hub') this.ui.hub(this.ui.tab); }).catch(() => {});
  }

  // Once a season is over: hand out the awards (once) and hold the ceremony.
  awardsNight() {
    const s = this.save, L = s.league;
    if (!L || L.phase !== 'done' || L.awards) return false;
    const order = standings(L).map((r) => r.id);
    const list = computeAwards(s, L, order);
    L.awards = list;
    // the season in the club's history (the Trophies tab lists them)
    if (!(s.history ||= []).some((h) => h.season === L.season)) {
      const row = L.table.home, po = L.playoffs, inGame = (g) => g && (g.a === 'home' || g.b === 'home');
      const gs = goalStates(s);
      s.history.push({ season: L.season, finish: order.indexOf('home') + 1, teams: order.length, w: row.w, l: row.l, gf: row.gf, ga: row.ga,
        playoff: L.champion === 'home' ? 'champion' : po && inGame(po.final) ? 'final' : po && po.semis.some(inGame) ? 'semi' : 'missed',
        goals: gs.filter((g) => g.done).length, of: gs.length });
    }
    // the season's over: the oldest rival stars retire (Draft Day fills their places)
    for (const r of retireRivals(s)) addNews(s, { k: 'retire', team: r.team, name: RECRUITS[r.key].name, kit: r.kit, n: r.seasons });
    if (!list.length) { writeSave(s); return false; }
    s.awards ||= [];
    let ours = 0;
    for (const w of list) {
      if (w.team !== 'home') continue;
      ours++;
      const a = AWARD_BY_ID[w.id];
      s.coins += a.coins;
      w.reward = { coins: a.coins, exp: a.exp };
      if (w.id === 'iron_wall') applyGoalieExp(s, a.exp, w.face === 'goalie' ? 'halla' : w.face); else if (s.roster[w.face]) applyExp(s, w.face, a.exp);
      s.awards.push({ season: L.season, id: w.id, name: w.name, face: w.face, line: w.line });
      if (w.id === 'mvp') this.ach.unlock('mvp');
    }
    if (ours >= 3) this.ach.unlock('sweep');
    writeSave(s);
    this.scene = 'results';
    this.music('awards');
    this.ui.awardsNight(list, L.season, () => this.resolvePerks(() => this.goHub('tournament')));
    return true;
  }

  // Today's daily challenge: fixed rival, arena, modifiers and goal.
  startDaily() {
    if (this.loading) return;
    const d = dailyFor(dayKey());
    noteAttempt(this.save, d.date);
    writeSave(this.save);
    this.loadThen(Assets.ensureTeam(d.teamId, d.arena), () => {
      this.beginMatch(d.teamId, { powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', reward: 120, round: 'Daily challenge' }, true, d.mods, { arena: d.arena, daily: d });
    });
  }

  // The locker room fills the hub once its image is in; until then the rink shows through.
  setHubBackground() {
    const file = Assets.atlas.locker;
    if (!file) return;
    Assets.image(file).then(() => {
      if (this.scene !== 'hub') return;
      document.body.style.setProperty('--locker', `url("${Assets.url(file)}")`);
      document.body.classList.add('in-hub');
      this.hubBg = true;
      audio.setCrowd(0);
    }).catch(() => {});
  }

  // ----------------------------------------------------------------- loop
  // One frame. Whatever goes wrong in it, the next one is still asked for: a throw in a
  // listener would otherwise stop the game dead.
  loop(now) {
    try { this.frame(now); } catch (e) {
      const key = String(e && e.stack || e).slice(0, 200);
      if (!(this.loopErrors ||= new Set()).has(key)) { this.loopErrors.add(key); console.error(e); }
    } finally { requestAnimationFrame((t) => this.loop(t)); }
  }

  frame(now) {
    const rawDt = (now - this.last) / 1000;
    const realDt = Math.max(0, Math.min(0.05, rawDt || 0));
    this.last = now;
    this.watchFrameRate(rawDt);
    const inMatch = this.scene === 'match' || this.scene === 'paused';
    if (this.scene === 'match' && !this.attract) this.playT = (this.playT || 0) + realDt; // (for the break reminder: time in matches and drills)
    if (!inMatch && !this.rotateEl.hidden) this.rotateEl.hidden = true; // (the match is over: the results and menus work upright)
    const versus = !!(this.cur && this.cur.versus) && inMatch, coop = !!(this.cur && this.cur.coop) && inMatch;
    const raw = this.input.read();
    if (versus || (coop && !this.input.pads().length)) {
      // P is player 2's ultimate on a shared keyboard, so only Esc / Start pause
      raw.pause = this.input.keys.has('Escape') || this.input.pads().some((gp) => gp.buttons[9] && gp.buttons[9].pressed);
    }
    if (raw.pause && !this.prevPause) {
      if (this.scene === 'match') this.pause();
      else if (this.scene === 'paused') this.resume();
    }
    this.prevPause = raw.pause;

    if (this.hubBg && this.scene !== 'hub') { this.hubBg = false; document.body.classList.remove('in-hub'); }
    this.padnav.update(Math.min(0.05, realDt));
    const m = this.hubBg ? null : this.match; // nothing to draw behind the locker room
    // catch size changes that don't fire resize events (browser UI, emulation)
    if (this.canvas.clientWidth !== Math.round(this.renderer.w) || this.canvas.clientHeight !== Math.round(this.renderer.h)) this.onResize();
    if (m) {
      if (this.scene !== 'paused' && this.replay.active) {
        // instant replay: play recorded frames, skip on a fresh button press
        const press = raw.a || raw.b || raw.sprint;
        if (press && !this.replayGuard) this.skipReplay();
        this.replayGuard = press;
        const ev = this.replay.active ? this.replay.step(m, realDt) : 'done';
        this.fx.update(realDt * 0.4, realDt);
        if (ev === 'goal' && m.lastGoal) { this.renderer.nets.ripple(m.lastGoal.side, m.lastGoal.y, 1); this.fx.lamp = 2; this.fx.shake(0.3); audio.crowdCheer(0.5); }
        if (ev === 'done') this.endReplay();
      } else if (this.scene !== 'paused') {
        if (this.scene === 'match' && versus) {
          const pads = this.input.pads();
          let p1 = this.input.readLayout('p1'), p2 = this.input.readLayout('p2');
          if (pads.length >= 2) { p1 = mergeInputs(p1, this.input.readPad(pads[0])); p2 = mergeInputs(p2, this.input.readPad(pads[1])); }
          else if (pads.length === 1) p2 = mergeInputs(p2, this.input.readPad(pads[0]));
          this.releaseHeld(p1, p2);
          m.setHumanInput(p1, 0); m.setHumanInput(p2, 1);
        } else if (this.scene === 'match' && coop) {
          const [p1, p2] = this.coopInputs();
          this.releaseHeld(p1, p2);
          for (const i of [p1, p2]) { i.sprintBtn = i.sprint; if ((this.save.settings.autoSprint || m.simple) && Math.hypot(i.mx, i.my) > 0.92) i.sprint = true; }
          m.setHumanInput(p1, 0, 0); m.setHumanInput(p2, 0, 1);
        } else if (this.scene === 'match') {
          this.releaseHeld(raw);
          raw.sprintBtn = raw.sprint; // (the button itself: a quick tap of it dekes, even with auto-sprint)
          if ((this.save.settings.autoSprint || m.simple) && Math.hypot(raw.mx, raw.my) > 0.92) raw.sprint = true;
          m.setHumanInput(raw);
        }
        if (this.lap && this.attract) {
          // resurfacing: the match waits for the machine (and for its art, a couple of seconds at most)
          if (Assets.groupReady('title')) this.lap.update(realDt);
          else if ((this.lap.wait = (this.lap.wait || 0) + realDt) > 2) this.lap = null;
          if (this.lap && this.lap.done) this.lap = null;
        }
        let simDt = this.lap ? 0 : realDt * this.fx.slowScale * (this.save.settings.speed === 'relaxed' && !(this.cur && this.cur.drill) && !this.attract ? 0.85 : 1);
        if (this.fx.hitstop > 0) simDt = 0;
        this.acc += simDt;
        let n = 0;
        const isDrill = !!(this.cur && this.cur.drill);
        const rec = this.scene === 'match' && !this.attract && !isDrill;
        while (this.acc >= STEP && n < 4) {
          m.update(STEP); this.acc -= STEP; n++;
          if (rec && (m.state === 'play' || (m.state === 'goal' && m.stateT < 0.75))) this.replay.record(m);
        }
        if (n >= 4) this.acc = 0;
        this.fx.update(simDt, realDt);
        if (rec && this.replayPending && m.state === 'goal' && m.stateT > 2.0) {
          this.replayPending = false;
          if (this.replay.start()) {
            m.holdGoal = true;
            this.startClip(m);
            this.hud.replayMode(true);
            this.replayGuard = raw.a || raw.b || raw.sprint;
            this.fx.parts = this.fx.parts.filter((p) => p.kind === 'hat'); // (a hat trick's hats stay on the ice)
            this.fx.texts.length = 0;
            audio.sfx('whoosh');
          }
        }
        if (this.scene === 'match' && !isDrill) { this.commentary.update(realDt); this.updateChants(realDt, m); }
        if (this.scene === 'match' && isDrill && m.state === 'drill_over' && m.stateT > 1.1 && !this.drillShown) { this.drillShown = true; this.finishDrill(); }
      }
      const t = teamInfo(this.awayTeamId);
      const lap = this.lap && this.attract ? this.lap : (m && m.drill && m.drill.machine) || null; // (the title's lap, or the Resurfacer drill's machine)
      const focus = lap && toScreen(lap.pos().x, lap.pos().y);
      this.renderer.updateCamera(m, this.fx, realDt, { attract: this.attract, focus, zoom: this.attract ? 0.9 : this.replay.active ? 1.15 : m.pshot ? 1.12 : 1 });
      this.renderer.render(m, this.fx, { awayTeamId: this.awayTeamId, awayColor: t.color, awayColor2: t.color2, arena: this.arena, replay: this.replay.active, lap, save: this.save }); // (save: the rafters' banners at home)
      this.clips.frame();
      this.hud.update(realDt);
      this.crowdT = (this.crowdT || 0) - realDt;
      if (this.crowdT <= 0) {
        this.crowdT = 0.25;
        audio.setCrowd(this.attract || this.scene !== 'match' ? 0 : this.fx.excite);
        audio.setIntensity(this.scene === 'match' && this.clutch(m) ? 1 : 0);
      }
      if (this.attract && m.state === 'over' && m.stateT > 3) this.startAttract();
      if (this.scene === 'match' && this.tutorial >= 0) {
        this.tutT -= realDt;
        const tips = this.tutorialTips();
        if (this.tutT <= 0 && this.tutorial < tips.length && m.state === 'play') {
          this.hud.hint(tips[this.tutorial], 6);
          this.tutorial++;
          this.tutT = 9;
        }
      }
    }
  }
}

const app = new App();
window.__app = app;
app.boot();
