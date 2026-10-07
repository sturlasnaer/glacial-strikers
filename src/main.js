// Glacial Strikers — boot, game loop and scene flow.

import { Assets } from './assets.js';
import { Match, PENALTY_SECONDS } from './match.js';
import { Renderer } from './render.js';
import { FX } from './fx.js';
import { Input, TouchControls, mergeInputs } from './input.js';
import { audio } from './audio.js';
import { UI, controlsHtml } from './ui.js';
import { HUD } from './hud.js';
import { toScreen } from './rink.js';
import { Replay } from './replay.js';
import { Commentary } from './commentary.js';
import { ClipRecorder } from './clips.js';
import { AchievementTracker } from './achievements.js';
import { createDrill, medalFor, DRILL_REWARDS } from './drills.js';
import { recordRivalResult, rivalLines, rivalAfterLine } from './rivals.js';
import { nextFixture, recordOurGame, newLeague, rivalPlan } from './league.js';
import { pickMoment, markSeen, buffEffects } from './lockerroom.js';
import { GOAL_X } from './rink.js';
import { TEAMS, TOURNAMENT, DIALOGUE, TWIST_INFO, POWER_INFO, COMBOS, CHARACTERS, GOALIE, GAME_PLANS, PLAYOFF_LINES } from './data.js';
import {
  loadSave, newSave, writeSave, matchConfig, computeRewards, applyExp, applyGoalieExp, applyChem, drillRewards,
} from './progress.js';

const STEP = 1 / 60;
// Vibrate only once the player has interacted (browsers block it before that).
const buzz = (p) => { if (navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(p); };
const RIVALS = ['lynx', 'comets', 'rams', 'ravens', 'royals'];

const INTRO = [
  ['us', 'frost', 'Welcome to the Frostline Regional Cup, Strikers. Five wins and the cup comes home.'],
  ['us', 'thunder', 'Five wins? I\'ll score five goals in the first match alone.'],
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
    } catch (e) {
      this.loadingEl.querySelector('.err').textContent = 'The game art did not load. Check your connection and reload the page.';
      throw e;
    }
    if (document.fonts?.load) {
      await Promise.race([
        Promise.all([document.fonts.load('24px "Jersey 10"'), document.fonts.load('15px "Pixelify Sans"')]).catch(() => {}),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    }
    this.save = loadSave() || newSave();
    this.ach = new AchievementTracker(this.save, (a) => this.toastAchievement(a));
    audio.setMusic(this.save.settings.music);
    audio.setSfx(this.save.settings.sfx);
    this.renderer = new Renderer(this.canvas);
    this.fx = new FX();
    this.input = new Input();
    this.touch = new TouchControls(document.getElementById('touch'), this.input);
    this.ui = new UI(this);
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
    const unlock = () => { audio.unlock(); audio.play(this.scene === 'match' ? 'match' : 'hub'); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && !this.isTouch) { this.isTouch = true; if (this.scene === 'match') this.hud.show(this.match, this.cur.teamId); } });
    this.input.onKey((code) => this.onKey(code));
    this.setupInstall();

    this.startAttract();
    this.loadingEl.remove();
    this.goTitle();
    requestAnimationFrame((t) => this.loop(t));
  }

  // "Achievement unlocked" toast; shows anywhere (menus or matches).
  toastAchievement(a) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.getElementById('app').appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<img src="${Assets.icon(a.icon, 72)}" alt=""><div><small>Achievement unlocked</small><b></b><span>+${a.coins} coins</span></div>`;
    el.querySelector('b').textContent = a.name;
    box.appendChild(el);
    audio.jingle('level');
    setTimeout(() => el.remove(), 4200);
  }

  // Apply comfort / accessibility settings everywhere they matter.
  applySettings() {
    const st = this.save.settings;
    audio.setMusic(st.music); audio.setSfx(st.sfx);
    this.fx.shakeMul = st.shake ?? 1;
    this.fx.flashes = st.flashes !== false;
    this.fx.particleMul = st.particles === 'reduced' ? 0.35 : 1;
    this.renderer.markers = st.markers || 'color';
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
    const enter = code === 'Enter' || code === 'Space' || code === 'KeyJ';
    if (this.scene === 'title' && code === 'Enter' && !document.querySelector('.modal-bg')) this.startCampaign();
    else if (this.scene === 'dialogue' && enter) this.ui.dialogueAdvance?.();
    else if (this.scene === 'results' && code === 'Enter') document.getElementById('r-go')?.click();
    else if (this.scene === 'hub' && code === 'Enter' && !document.querySelector('.modal-bg')) document.getElementById('h-play')?.click();
    if (code === 'Escape') {
      const m = document.querySelector('.modal-bg');
      if (m && this.scene !== 'paused') m.remove();
    }
  }

  // ------------------------------------------------------------- matches
  makeMatch(cfg, teamId) {
    Assets.prepareTeam(TEAMS[teamId]);
    this.awayTeamId = teamId;
    const m = new Match(cfg);
    this.match = m;
    this.acc = 0;
    this.fx.attach(m, '#71dce8', TEAMS[teamId].color);
    this.renderer.snapCamera(m);
    return m;
  }

  startAttract() {
    const teamId = RIVALS[Math.floor(Math.random() * RIVALS.length)];
    const cfg = matchConfig(this.save, teamId, { powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none' }, { attract: true });
    cfg.diff = [0.7, 0.7];
    this.attract = true;
    this.makeMatch(cfg, teamId);
    this.match.state = 'faceoff';
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
      this.ui.dialogue(INTRO, 'comets', null, () => {
        this.save.seenIntro = true;
        writeSave(this.save);
        this.goHub('tournament');
      });
      return;
    }
    this.goHub();
  }

  startStage() {
    const f = this.fixture();
    if (!f) return;
    const stage = f.stage;
    const t = TEAMS[f.opponent];
    const powers = stage.powers.length ? 'Power pucks: ' + stage.powers.map((p) => POWER_INFO[p].name).join(', ') + '.' : 'No power pucks this match.';
    const sub = `${stage.round} · ${powers} ${TWIST_INFO[stage.twist]}`;
    this.scene = 'dialogue';
    let lines;
    if (f.kind === 'regular') lines = [...rivalLines(this.save, t.id), ...DIALOGUE[t.id].pre];
    else if (f.kind === 'final' && DIALOGUE[t.id].final) lines = [...rivalLines(this.save, t.id).slice(0, 1), ...DIALOGUE[t.id].final];
    else lines = [...rivalLines(this.save, t.id).slice(0, 1), ...PLAYOFF_LINES[f.kind].pre];
    this.ui.dialogue(lines, t.id, { sub }, () => {
      const theirPlan = rivalPlan(this.save, t.id, GAME_PLANS);
      this.scene = 'results';
      this.ui.planPicker(t.id, f, theirPlan, (plan) => this.beginMatch(t.id, stage, false, [], { plan, theirPlan, fixture: f }));
    });
  }

  startExhibition(teamId, mods = []) {
    this.beginMatch(teamId, { powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', reward: 120, round: 'Exhibition' }, true, mods);
  }

  // Training drills and the shootout run on the match engine with a drill controller.
  startDrill(id, charId, opts = {}) {
    audio.unlock();
    const { cfg, ctrl, def, awayTeam } = createDrill(id, this.save, charId, opts);
    this.cur = { drill: id, char: charId, teamId: awayTeam, ctrl, def, opts };
    this.attract = false;
    const m = this.makeMatch(cfg, awayTeam);
    this.hookMatch(m);
    this.hookDrill(m);
    this.replay.clear();
    this.replayPending = false;
    this.ui.clear();
    this.scene = 'match';
    this.hud.show(m, awayTeam, ctrl);
    this.touch.reset();
    this.drillShown = false;
    this.tutorial = -1;
    audio.play('match');
    this.checkRotate();
  }

  startShootout(teamId) { this.startDrill('shootout', 'frost', { teamId }); }

  // Local versus: player 1 is the Strikers, player 2 picks a rival. Both use base stats.
  startVersus(teamId) {
    audio.unlock();
    const t = TEAMS[teamId];
    const ids = ['frost', 'thunder', 'stone'];
    const chem = { 'frost+thunder': 1, 'frost+stone': 1, 'stone+thunder': 1 };
    const cfg = {
      teams: [
        { skaters: ids.map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, name: CHARACTERS[id].name, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: GOALIE.name }, chem },
        { skaters: ids.map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, name: t.names[id], perks: [] })), goalie: { stats: { rfx: 6, pos: 6 }, name: t.names.goalie }, chem },
      ],
      humanTeam: 0, humans: [0, 1],
      powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none',
      diff: [0.6, 0.6], seed: (Math.random() * 1e9) >>> 0,
    };
    this.cur = { versus: true, teamId, stage: { round: 'Versus' }, exhibition: true, mods: [] };
    this.attract = false;
    const m = this.makeMatch(cfg, teamId);
    this.hookMatch(m);
    this.replay.clear();
    this.replayPending = false;
    this.commentary.attach(m, teamId);
    this.chantCool = 25;
    this.ui.clear();
    this.scene = 'match';
    this.hud.show(m, teamId, null, { versus: true });
    this.touch.reset();
    this.tutorial = -1;
    audio.play('match');
    this.hud.banner('<div class="small">Local versus</div><div class="big" style="font-size:clamp(48px,10vw,110px)">FACEOFF</div>', 1.6);
  }

  endVersus(summary) {
    const t = TEAMS[this.cur.teamId];
    this.hud.hide();
    this.scene = 'results';
    audio.jingle('win');
    const p1 = summary.winner === 0;
    if (summary.winner !== null) { this.ach.unlock('versus'); writeSave(this.save); }
    this.ui.modal(`
      <div style="text-align:center">
        <div class="label">Local versus</div>
        <div class="drill-score" style="color:${p1 ? 'var(--ice)' : 'var(--coral)'}">Player ${p1 ? 1 : 2} wins!</div>
        <div class="medal-big" style="--m:var(--cream)">Strikers ${summary.score[0]} – ${summary.score[1]} ${t.name.split(' ').slice(-1)[0]}</div>
      </div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="vs-title">Title</button><button class="btn gold" id="vs-again">Rematch</button></div>`, (m, close) => {
      m.querySelector('#vs-again').addEventListener('click', () => { close(); this.startVersus(this.cur.teamId); });
      m.querySelector('#vs-title').addEventListener('click', () => { close(); this.startAttract(); this.goTitle(); });
    }, false);
  }

  // Which gamepad belongs to a team's player in versus (undefined = keyboard).
  padFor(team) {
    if (!(this.cur && this.cur.versus)) return null;
    const pads = this.input.pads();
    if (pads.length >= 2) return pads[team === 0 ? 0 : 1].index;
    if (pads.length === 1) return team === 1 ? pads[0].index : undefined;
    return undefined;
  }

  hookDrill(m) {
    const fx = this.fx, hud = this.hud;
    m.on('drill_count', (e) => { hud.banner(`<div class="big" style="font-size:clamp(60px,14vw,140px)">${e.n}</div>`, 0.8); audio.sfx('click'); });
    m.on('drill_go', () => { hud.banner('<div class="big" style="color:#ffd45e">GO!</div>', 0.8); audio.sfx('whistle', { vol: 0.6 }); });
    m.on('drill_goal', (e) => this.renderer.nets.ripple(e.side, e.y, 0.8));
    m.on('gate_ok', (e) => { fx.ring(e.x, e.y, 34, '#7fe08a', 0.4); audio.sfx('coin', { vol: 0.35 }); });
    m.on('gate_miss', (e) => { fx.text(e.x, e.y - 60, '+2s', '#ff6f7d', 0.9, 20); audio.sfx('deny'); });
    m.on('target_hit', (e) => { fx.text(GOAL_X - 70, e.y - 80, `+${e.pts}`, '#ffd45e', 1, 24); fx.burst(GOAL_X - 4, e.y, 14, 18, ['#ff3b3b', '#fff2cb', '#ffd45e'], 220, 0.5); audio.sfx('post', { vol: 0.6 }); audio.crowdCheer(0.3); });
    m.on('target_miss', (e) => { fx.text(GOAL_X - 70, e.y - 80, '+10', '#c3d3ea', 0.8, 16); audio.sfx('boards', { vol: 0.4 }); });
    m.on('rondo_pass', (e) => { fx.text(e.s.x, e.s.y - 100, `+${e.pts}`, '#71dce8', 0.8, 15 + e.pts * 2); audio.sfx('coin', { vol: 0.25 + e.pts * 0.05 }); });
    m.on('rondo_steal', (e) => { hud.banner(`<div class="small">${e.why === 'zone' ? 'OUT OF THE ZONE' : e.why === 'shot' ? 'NO SHOOTING!' : 'STOLEN!'}</div>`, 1); audio.sfx('deny'); });
    m.on('breakaway_result', (e) => {
      hud.banner(`<div class="small" style="color:${e.kind === 'goal' ? '#ffd45e' : '#c3d3ea'}">${{ goal: 'GOAL!', save: 'SAVED', miss: 'MISSED', time: 'TOO SLOW' }[e.kind]}</div>`, 1.2);
      if (e.kind === 'goal') { audio.jingle('goal'); audio.crowdCheer(0.6); fx.lamp = 1.5; } else audio.crowdOoh(0.5);
    });
    m.on('shootout_turn', (e) => {
      const us = e.us;
      hud.banner(`<div class="small">${us ? 'YOUR SHOT' : 'YOU\'RE IN GOAL'}</div><div class="sub">${us ? e.shooter.name : `Stop ${e.shooter.name}!`}</div>`, 1.6);
    });
    m.on('shootout_result', (e) => {
      const mine = e.team === 0;
      hud.banner(`<div class="small" style="color:${e.scored === mine ? '#ffd45e' : '#ff6f7d'}">${e.scored ? 'SCORES!' : mine ? 'STOPPED' : 'BIG SAVE!'}</div><div class="sub">${e.goals[0]} – ${e.goals[1]}</div>`, 1.4);
      if (e.scored) { audio.jingle('goal'); fx.lamp = 1.4; } else audio.crowdOoh(0.6);
      if (!mine && !e.scored) audio.crowdCheer(0.6);
    });
    m.on('drill_over', () => { audio.sfx('whistle'); hud.banner('<div class="big" style="font-size:clamp(48px,10vw,110px)">FINISHED</div>', 1.4); });
  }

  finishDrill() {
    const c = this.cur, res = c.ctrl.result, s = this.save;
    this.hud.hide();
    this.scene = 'results';
    if (c.drill === 'shootout') return this.finishShootout(res);
    const medal = medalFor(c.def, res.score);
    const rw = drillRewards(s, c.drill, c.char, res.score, medal, DRILL_REWARDS);
    this.ach.checkMeta();
    writeSave(s);
    this.ui.drillResult(c.def, res.score, rw, c.char,
      () => this.startDrill(c.drill, c.char, c.opts),
      () => this.resolvePerks(() => { this.startAttract(); this.goHub('training'); }));
  }

  // Gamepad rumble for one team's player (or everyone when team is undefined).
  rumble(strong, weak, ms, team) {
    const pad = team === undefined ? null : this.padFor ? this.padFor(team) : null;
    if (team !== undefined && pad === undefined) return;
    this.input.rumble(strong, weak, ms, pad);
  }

  recordRival(teamId, gf, ga, won, shootout) { recordRivalResult(this.save, teamId, gf, ga, won, { shootout }); }

  finishShootout(res) {
    const s = this.save, c = this.cur;
    const won = res.score === 1;
    const t = TEAMS[c.teamId];
    const coins = (won ? 60 : 20) + res.goals[0] * 10;
    s.coins += coins;
    const ups = [];
    for (const id of ['frost', 'thunder', 'stone']) ups.push(...applyExp(s, id, won ? 20 : 10));
    applyGoalieExp(s, won ? 20 : 10);
    this.recordRival(c.teamId, res.goals[0], res.goals[1], won, true);
    if (won) this.ach.unlock('shootout');
    this.ach.checkMeta();
    writeSave(s);
    audio.jingle(won ? 'win' : 'lose');
    this.ui.modal(`
      <div style="text-align:center">
        <div class="label">Shootout vs ${t.name}</div>
        <div class="drill-score">${res.goals[0]} – ${res.goals[1]}</div>
        <div class="medal-big" style="--m:${won ? '#ffd45e' : '#ff6f7d'}">${won ? 'You win the shootout!' : 'They take it'}</div>
      </div>
      <div class="reward-lines"><div><span>Coins</span><span class="gold-t">+${coins}</span></div><div><span>Whole team</span><span class="gold-t">+${won ? 20 : 10} EXP</span></div></div>
      ${ups.length ? '<div class="lvlup">Level up! Check the Team tab.</div>' : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="so-again">Again</button><button class="btn gold" id="so-done">Done</button></div>`, (m, close) => {
      m.querySelector('#so-again').addEventListener('click', () => { close(); this.startShootout(c.teamId); });
      m.querySelector('#so-done').addEventListener('click', () => { close(); this.resolvePerks(() => { this.startAttract(); this.goHub(); }); });
    }, false);
  }

  beginMatch(teamId, stage, exhibition, mods = [], extra = {}) {
    const s = this.save;
    const plan = extra.plan || 'balanced';
    const theirPlan = extra.theirPlan || (exhibition ? rivalPlan(s, teamId, GAME_PLANS) : 'balanced');
    let buffs = null;
    if (!exhibition) {
      // locker-room buffs are used up by this match
      buffs = buffEffects(s.buffs);
      s.buffs = [];
      s.planHistory[teamId] = plan;
      s.lastPlan = plan;
      writeSave(s);
    }
    this.cur = { teamId, stage, exhibition, stageIndex: exhibition ? -1 : s.stage, mods, plan, theirPlan, fixture: extra.fixture };
    const cfg = matchConfig(s, teamId, stage, { plans: [plan, theirPlan], buffs });
    cfg.mods = mods;
    this.attract = false;
    const m = this.makeMatch(cfg, teamId);
    this.hookMatch(m);
    this.replay.clear();
    this.clips.clear();
    this.ach.attachMatch(m);
    this.replayPending = false;
    this.commentary.attach(m, teamId);
    this.chantCool = 25;
    this.ui.clear();
    this.scene = 'match';
    this.hud.show(m, teamId);
    this.touch.reset();
    audio.play('match');
    const edge = m.planEdge(0);
    const planLine = plan !== 'balanced' || theirPlan !== 'balanced'
      ? `<div class="sub" style="font-size:clamp(14px,2.4vw,20px)">${GAME_PLANS[plan].name} vs ${GAME_PLANS[theirPlan].name}${edge > 0 ? ' · your edge' : edge < 0 ? ' · their edge' : ''}</div>` : '';
    this.hud.banner(`<div class="small">${exhibition ? 'Exhibition' : stage.round}</div><div class="big" style="font-size:clamp(48px,10vw,110px)">FACEOFF</div>${planLine}`, 2);
    if (buffs && buffs.hype) { this.chantCool = 4; this.fx.excite = 0.7; }
    this.checkRotate();
    navigator.wakeLock?.request?.('screen').then((l) => { this.wake = l; }).catch(() => {});
    if (this.isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
    this.tutorial = this.save.record.played < 2 ? 0 : -1;
    this.tutT = 1.5;
  }

  tutorialTips() {
    const t = this.isTouch;
    return [
      t ? 'Drag your left thumb to skate. Hold SPRINT for a burst of speed.' : 'Skate with WASD or the arrow keys. Hold Shift to sprint.',
      t ? 'With the puck: tap SHOOT for a wrist shot, hold it to charge a slapshot.' : 'With the puck: tap J for a wrist shot, hold J to charge a slapshot.',
      t ? 'PASS goes to the teammate you\'re steering toward. Hold SHOOT as it arrives for a one-timer.' : 'K passes toward the teammate you\'re steering at. Hold J as it arrives for a one-timer.',
      t ? 'No puck? SHOOT becomes CHECK and PASS switches to the skater nearest the puck.' : 'No puck? J checks and K switches to the skater nearest the puck.',
      t ? 'The round button above SHOOT is your signature skill. The star fires your ultimate when it glows.' : 'U fires your signature skill. I fires your ultimate when the gold bar is full.',
    ];
  }

  hookMatch(m) {
    const cam = () => this.renderer.cam;
    const vol = (x, y) => {
      const s = toScreen(x, y);
      return Math.max(0.25, 1 - Math.hypot(s.x - cam().x, s.y - cam().y) / 1100);
    };
    m.on('shot', (e) => {
      audio.sfx(e.kind === 'thunderclap' ? 'thunder' : ['slap', 'onetimer', 'zero'].includes(e.kind) ? 'slap' : 'stick', { vol: vol(e.s.x, e.s.y) });
      if (e.s.controlled && e.kind !== 'wrist') this.rumble(0.35, 0.6, 90, e.s.team);
    });
    m.on('pass', (e) => audio.sfx('pass', { vol: vol(e.s.x, e.s.y) }));
    m.on('receive', (e) => audio.sfx('receive', { vol: vol(e.s.x, e.s.y) }));
    m.on('goalie_pass', () => audio.sfx('pass', { vol: 0.6 }));
    m.on('puck_boards', (e) => { if (e.power > 220) audio.sfx('boards', { vol: Math.min(1, e.power / 900) * vol(e.x, e.y) }); });
    m.on('boards', (e) => audio.sfx('boards', { vol: 0.5 * vol(e.s.x, e.s.y) }));
    m.on('post', () => { audio.sfx('post'); this.rumble(0.15, 0.6, 120); });
    m.on('net_hit', (e) => { audio.sfx('boards', { vol: 0.4 }); this.renderer.nets.ripple(e.side, this.match.puck.y, 0.4); });
    m.on('hit', (e) => {
      audio.sfx('check', { vol: Math.min(1, Math.max(0.4, e.power / 450)) });
      for (const k of [e.a, e.b]) if (k.controlled) { this.rumble(Math.min(1, e.power / 400), 0.3, 130, k.team); if (k === e.b) buzz(15); }
    });
    m.on('penalty', (e) => {
      const ours = e.team === 0;
      this.hud.banner(`<div class="small" style="color:${ours ? '#ff6f7d' : '#ffd45e'}">PENALTY</div><div class="sub">${e.s.name} · ${e.reason} · ${PENALTY_SECONDS}s</div><div class="small" style="font-size:clamp(20px,3.6vw,34px);margin-top:6px">${ours ? 'Penalty kill: survive it!' : 'Power play!'}</div>`, 2);
      audio.sfx('whistle'); audio.crowdOoh(ours ? 0.4 : 0.8);
      if (ours && e.reason === 'Interference' && !this.penTipShown && !this.cur.versus) {
        this.penTipShown = true;
        setTimeout(() => this.hud.hint(this.isTouch ? 'Only check the puck carrier. Hits away from the puck draw penalties.' : 'Only check the puck carrier. Hits away from the puck draw penalties.', 5), 2200);
      }
    });
    m.on('penalty_over', (e) => { if (!e.byGoal) this.hud.ticker(`${e.s.name} is out of the box. Back to full strength.`); });
    m.on('goalie_pulled', (e) => {
      this.hud.banner(`<div class="small" style="color:${e.team === 0 ? '#ffd45e' : '#ff6f7d'}">${e.team === 0 ? 'GOALIE PULLED' : 'THEY PULLED THEIR GOALIE'}</div><div class="sub">${e.team === 0 ? 'Extra attacker on! Protect the empty net.' : 'Empty net! Shoot from anywhere.'}</div>`, 1.8);
      audio.sfx('whistle', { vol: 0.4 }); audio.crowdCheer(0.4);
    });
    m.on('goal', () => {
      setTimeout(() => {
        if (this.match !== m || this.pullTipShown || this.cur.versus) return;
        if (m.canPullGoalie && m.score[0] < m.score[1] && m.score[1] >= m.winScore - 1) {
          this.pullTipShown = true;
          this.hud.hint(this.isTouch ? 'Desperate? Tap PULL GOALIE for an extra attacker.' : 'Desperate? Press H (gamepad: Back) to pull Halla for an extra attacker.', 6);
        }
      }, 4200);
    });
        m.on('goalie_returned', (e) => { if (e.team === 0) this.hud.ticker('Halla is back in net.'); });
    m.on('no_goal', (e) => { this.hud.banner(`<div class="small" style="color:#ff6f7d">NO GOAL</div><div class="sub">${e.reason}</div>`, 1.6); audio.sfx('whistle'); audio.crowdOoh(0.8); });
    m.on('save', (e) => { audio.sfx('save', { vol: 0.8 }); if (!e.caught) audio.crowdOoh(0.6); });
    m.on('block', () => audio.sfx('save', { vol: 0.6 }));
    m.on('goal', (e) => {
      this.rumble(0.9, 0.6, 400);
      this.replay.markGoal();
      this.replayPending = this.save.settings.replays !== false;
      this.renderer.nets.ripple(e.side, e.y, 1);
      audio.sfx('horn');
      this.hud.goal(e);
      if (e.team === 0) buzz([30, 40, 60]);
      setTimeout(() => { if (this.match === m) audio.sfx('whistle', { vol: 0.5 }); }, 2600);
    });
    m.on('faceoff', () => audio.sfx('whistle', { vol: 0.55 }));
    m.on('drop', () => audio.sfx('drop'));
    m.on('stop', (e) => audio.sfx('stop', { vol: 0.8 * vol(e.s.x, e.s.y) }));
    m.on('stride', (e) => { if (e.s.controlled) audio.sfx('stride'); });
    m.on('pickup_spawn', () => {
      audio.sfx('pickup', { vol: 0.7 });
      if (this.tutorial >= 0 && !this.powerTipShown) { this.powerTipShown = true; this.hud.hint(this.isTouch ? 'A power orb! Skate the puck through it to charge the puck.' : 'A power orb! Skate or shoot the puck through it to charge the puck.', 5); }
    });
    m.on('power_get', (e) => { audio.sfx('power', { type: e.type }); if (e.by && e.by.team === 0) this.hud.hint(POWER_INFO[e.type].text, 3.5); });
    m.on('skill', (e) => audio.sfx({ dash: 'dash', glide: 'glide', bedrock: 'bedrock' }[e.id], { vol: vol(e.s.x, e.s.y) }));
    m.on('ult', (e) => {
      audio.sfx(e.id === 'monolith' ? 'stone' : 'ult');
      audio.sfx('whoosh', { vol: 0.8 });
      this.hud.cutin(e.s);
      if (e.s.controlled) this.rumble(0.6, 0.9, 260, e.s.team);
      this.fx.slowmo = 0.45; this.fx.slowScale = 0.3;
    });
    m.on('frozen', () => audio.sfx('freeze', { vol: 0.7 }));
    m.on('barrier_block', () => audio.sfx('stone', { vol: 0.8 }));
    m.on('ult_denied', (e) => { if (e.s.controlled) { audio.sfx('deny'); this.hud.hint(`${e.s.def.ult.name} needs the puck.`, 2); } });
    m.on('ult_ready', (e) => { if (e.s.controlled) audio.sfx('pickup', { vol: 0.8 }); });
    m.on('steal', (e) => audio.sfx('stick', { vol: 0.6 * vol(e.s.x, e.s.y) }));
    m.on('lightning_pass', () => audio.sfx('dash'));
    m.on('combo', (e) => {
      audio.sfx('combo', { key: e.key });
      this.hud.cutin(e.s, e.from, COMBOS[e.key].name);
      if (e.s.controlled) this.rumble(0.5, 0.8, 220, e.s.team);
      this.fx.slowmo = 0.3; this.fx.slowScale = 0.35;
      if (e.s.team === 0) buzz(20);
    });
    m.on('quake', () => audio.sfx('thunder', { vol: 0.7 }));
    m.on('plow', () => audio.sfx('check', { vol: 0.8 }));
    m.on('combo_ready', (e) => { if (e.s.controlled) audio.sfx('pickup', { vol: 0.5 }); });
    m.on('chain', (e) => { if (e.team === 0) audio.sfx('coin', { vol: 0.5 }); });
    m.on('final', () => {
      audio.sfx('whistle');
      setTimeout(() => { if (this.match === m) this.endMatch(); }, 2600);
    });
  }

  endMatch() {
    if (this.scene !== 'match' && this.scene !== 'paused') return;
    const m = this.match, s = this.save, c = this.cur;
    const summary = m.summary();
    if (c.versus) return this.endVersus(summary);
    const rewards = computeRewards(s, summary, c.stage, c.exhibition);
    s.coins += rewards.coins;
    const ups = [];
    for (const id of Object.keys(rewards.exp)) ups.push(...applyExp(s, id, rewards.exp[id]));
    const gUp = applyGoalieExp(s, rewards.gExp);
    const chemUps = applyChem(s, rewards.chem);
    s.record.played++;
    s.record.goals += summary.score[0];
    const scorers = (team) => Object.fromEntries(summary.skaters.filter((k) => k.team === team && k.goals).map((k) => [k.id, k.goals]));
    recordRivalResult(s, c.teamId, summary.score[0], summary.score[1], rewards.won, { ourScorers: scorers(0), theirScorers: scorers(1) });
    let becameChampion = false, leagueOut = null;
    if (rewards.won) s.record.wins++;
    if (!c.exhibition && s.league) {
      leagueOut = recordOurGame(s.league, s, summary.score[0], summary.score[1]);
      leagueOut.kind = c.fixture ? c.fixture.kind : 'regular';
      leagueOut.won = rewards.won;
      if (leagueOut.champion === 'home') { s.champion = true; becameChampion = true; s.cups = (s.cups || 0) + 1; }
      s.stage = s.league.round;
    }
    this.ach.endMatch(summary, { league: !c.exhibition, exhibition: c.exhibition, mods: c.mods });
    this.ach.checkMeta();
    s.training.sessions = 2;
    writeSave(s);
    this.wake?.release?.().catch(() => {});
    this.hud.hide();
    this.scene = 'results';
    if (ups.length) setTimeout(() => audio.jingle('level'), 900);
    this.ui.results({ summary, rewards, ups, chemUps, teamId: c.teamId, exhibition: c.exhibition, round: c.stage.round, gUp, clips: this.clips }, () => {
      const finish = () => {
        if (becameChampion) { this.scene = 'results'; this.ui.champion(() => this.goHub('tournament')); } else this.goHub(rewards.won ? 'tournament' : 'team');
      };
      const after = () => this.leagueUpdate(leagueOut, () => this.resolvePerks(() => this.ui.chemUnlocked(chemUps, () => {
        if (becameChampion || c.exhibition) return finish();
        this.lockerRoom(summary, rewards, finish);
      })));
      const kind = c.fixture ? c.fixture.kind : 'regular';
      const script = kind === 'regular' ? DIALOGUE[c.teamId] : kind === 'final' && DIALOGUE[c.teamId].final ? { win: DIALOGUE[c.teamId].finalWin, loss: DIALOGUE[c.teamId].finalLoss } : PLAYOFF_LINES[kind];
      let lines = !c.exhibition && script ? [...(script[rewards.won ? 'win' : 'loss'] || [])] : null;
      const extra = rivalAfterLine(s, c.teamId, rewards.won, summary.score[0], summary.score[1]);
      if (extra) lines = [...(lines || []), extra];
      if (lines) { this.scene = 'dialogue'; this.ui.dialogue(lines, c.teamId, null, after); } else after();
    });
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
    const g = m.lastGoal, t = TEAMS[this.awayTeamId];
    const scorer = g.scorer ? g.scorer.name : 'Goal';
    const assist = g.assists && g.assists.length ? ` from ${g.assists.map((a) => a.name).join(' & ')}` : '';
    const kind = g.kind === 'onetimer' ? ' · one-timer' : g.special && g.special.combo ? ` · ${COMBOS[g.special.combo].name}` : g.powerPlay ? ' · power play' : '';
    const score = `GLA ${m.score[0]} – ${m.score[1]} ${t.short}`;
    this.renderer.clipOverlay = { title: `${scorer.toUpperCase()}${assist}${kind}`, score };
    this.clips.start({ scorer, line: `${scorer}${assist}${kind}. ${score}`, team: g.team, score });
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
    let team = null;
    if (this.fx.excite > 0.55) team = trailingBy <= -2 ? 1 : 0;
    if (team === null) return;
    this.chantCool = 30;
    this.fx.chant = { team, t: 0 };
    m.hype = { team, t: 7 };
    const t = TEAMS[this.awayTeamId];
    const name = team === 0 ? 'STRIKERS' : t.name.split(' ').slice(-1)[0].toUpperCase();
    audio.chant(team === 0 ? 0.9 : 0.6);
    this.fx.text(0, -420, `LET'S GO ${name}!`, team === 0 ? '#71dce8' : t.color, 4, 24);
    this.hud.ticker(team === 0 ? 'The crowd is on its feet! Strikers ultimates charge faster.' : `${t.name.split(' ').slice(-1)[0]} fans are loud. Their ultimates charge faster.`);
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

  newSeason() {
    const s = this.save;
    s.season++;
    s.stage = 0; s.beaten = []; s.champion = false;
    s.league = newLeague(s.season);
    s.buffs = [];
    writeSave(s);
    this.goHub('tournament');
  }

  resetSave() {
    this.save = newSave();
    this.ach = new AchievementTracker(this.save, (a) => this.toastAchievement(a));
    writeSave(this.save);
    this.goTitle();
  }

  pause(auto) {
    if (this.scene !== 'match') return;
    this.scene = 'paused';
    this.touch.reset();
    const st = this.save.settings;
    const modal = this.ui.modal(`
      <h2>Paused</h2>
      <div class="row"><button class="btn gold" id="p-resume">Resume</button>
      <button class="btn small ${st.music ? 'cream' : 'ghost'}" id="p-music">Music ${st.music ? 'on' : 'off'}</button>
      <button class="btn small ${st.sfx ? 'cream' : 'ghost'}" id="p-sfx">Sound ${st.sfx ? 'on' : 'off'}</button></div>
      ${controlsHtml(this.isTouch)}
      <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:13px">${this.cur && this.cur.drill ? 'Quitting a drill gives no rewards.' : `Score ${this.match.score[0]}–${this.match.score[1]}, first to 5 wins.`}</span>
      <button class="btn small ghost" id="p-quit">${this.cur && this.cur.drill ? 'Quit' : 'Forfeit match'}</button></div>`, (m, close) => {
      const resume = () => { close(); this.resume(); };
      m.querySelector('#p-resume').addEventListener('click', resume);
      m.querySelector('#p-music').addEventListener('click', (e) => { st.music = !st.music; audio.setMusic(st.music); writeSave(this.save); e.target.textContent = 'Music ' + (st.music ? 'on' : 'off'); e.target.className = 'btn small ' + (st.music ? 'cream' : 'ghost'); });
      m.querySelector('#p-sfx').addEventListener('click', (e) => { st.sfx = !st.sfx; audio.setSfx(st.sfx); writeSave(this.save); e.target.textContent = 'Sound ' + (st.sfx ? 'on' : 'off'); e.target.className = 'btn small ' + (st.sfx ? 'cream' : 'ghost'); });
      m.querySelector('#p-quit').addEventListener('click', (e) => {
        if (!e.target.dataset.armed) { e.target.dataset.armed = '1'; e.target.textContent = 'Tap again to confirm'; return; }
        close();
        this.forfeit();
      });
    }, false);
    this.pauseModal = modal;
    if (auto) this.autoPaused = true;
  }

  resume() {
    if (this.scene !== 'paused') return;
    if (this.isTouch && window.innerHeight > window.innerWidth) return;
    this.pauseModal?.remove();
    this.scene = 'match';
    this.touch.reset();
    this.acc = 0;
  }

  forfeit() {
    const drill = this.cur && this.cur.drill;
    this.hud.hide();
    this.wake?.release?.().catch(() => {});
    this.startAttract();
    this.goHub(drill && drill !== 'shootout' ? 'training' : undefined);
  }

  goTitle() {
    this.scene = 'title';
    this.hud.hide();
    if (!this.attract) this.startAttract();
    this.ui.title();
    audio.play('hub');
  }

  goHub(tab) {
    this.scene = 'hub';
    this.hud.hide();
    this.rotateEl.hidden = true;
    if (!this.attract) this.startAttract();
    this.ui.hub(tab);
    audio.play('hub');
  }

  // ----------------------------------------------------------------- loop
  loop(now) {
    const realDt = Math.max(0, Math.min(0.05, (now - this.last) / 1000 || 0));
    this.last = now;
    const versus = !!(this.cur && this.cur.versus) && (this.scene === 'match' || this.scene === 'paused');
    const raw = this.input.read();
    if (versus) {
      // P is player 2's ultimate in versus, so only Esc / Start pause
      raw.pause = this.input.keys.has('Escape') || this.input.pads().some((gp) => gp.buttons[9] && gp.buttons[9].pressed);
    }
    if (raw.pause && !this.prevPause) {
      if (this.scene === 'match') this.pause();
      else if (this.scene === 'paused') this.resume();
    }
    this.prevPause = raw.pause;

    const m = this.match;
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
          m.setHumanInput(p1, 0); m.setHumanInput(p2, 1);
        } else if (this.scene === 'match') {
          if (this.save.settings.autoSprint && Math.hypot(raw.mx, raw.my) > 0.92) raw.sprint = true;
          m.setHumanInput(raw);
        }
        let simDt = realDt * this.fx.slowScale * (this.save.settings.speed === 'relaxed' && !(this.cur && this.cur.drill) && !this.attract ? 0.85 : 1);
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
            this.fx.parts.length = 0;
            this.fx.texts.length = 0;
            audio.sfx('whoosh');
          }
        }
        if (this.scene === 'match' && !isDrill) { this.commentary.update(realDt); this.updateChants(realDt, m); }
        if (this.scene === 'match' && isDrill && m.state === 'drill_over' && m.stateT > 1.1 && !this.drillShown) { this.drillShown = true; this.finishDrill(); }
      }
      const t = TEAMS[this.awayTeamId];
      this.renderer.updateCamera(m, this.fx, realDt, { attract: this.attract, zoom: this.attract ? 0.9 : this.replay.active ? 1.15 : 1 });
      this.renderer.render(m, this.fx, { awayTeamId: this.awayTeamId, awayColor: t.color, awayColor2: t.color2 });
      this.clips.frame();
      this.hud.update(realDt);
      this.crowdT = (this.crowdT || 0) - realDt;
      if (this.crowdT <= 0) { this.crowdT = 0.25; audio.setCrowd(this.attract ? 0.15 : this.fx.excite); }
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
    requestAnimationFrame((t) => this.loop(t));
  }
}

const app = new App();
window.__app = app;
app.boot();
