// Training mini-games and the shootout, built on the match engine.
//
// A drill is a controller object passed to Match as cfg.drill. The match runs its normal
// physics but hands the rules to the controller: init(m), update(m, dt), onGoal(m, info),
// hud(m) and optional draw hooks. No browser APIs here so drills run headless too.

import { CHARACTERS, GOALIE, TEAMS, ROLE, member, slotDef } from './data.js';
import { effectiveStats, perkNames, goalieStats, chemLevel, lineupIds, homeGoalie, rivalGoalie } from './progress.js';
import { toScreen, GOAL_X, MOUTH } from './rink.js';
import { rivalSub } from './slots.js';
import { norm, clamp, makeRng } from './util.js';
import { Skater } from './entities.js';
import { t } from './i18n.js';
import { GhostRecorder, decodeGhost, ghostAt } from './ghost.js';

export const DRILLS = {
  cones: {
    id: 'cones', name: 'Cone Weave', trains: 'Skating', icon: 'rink_props/props/cone', unit: 'time',
    text: 'Carry the puck through all 9 gates, then score on the empty net. Each missed gate adds 2 seconds.',
    medals: [24, 19, 16.5],
  },
  sniper: {
    id: 'sniper', name: 'Sniper', trains: 'Shooting', icon: 'equipment_items/hub/target', unit: 'points',
    text: '45 seconds. Your linemate feeds you pucks: hit the lit targets. Steer up or down to pick a corner. One-timers and combos score extra.',
    medals: [800, 1600, 2400],
  },
  rondo: {
    id: 'rondo', name: 'Keep-Away', trains: 'Passing', icon: 'equipment_items/stick/passing', unit: 'points',
    text: 'Your line against two chasers for 40 seconds. Each pass scores your current chain length (up to 5). A steal resets the chain.',
    medals: [30, 55, 85],
  },
  breakaway: {
    id: 'breakaway', name: 'Breakaway', trains: 'Finishing', icon: 'equipment_items/armor/goalie_gloves', unit: 'goals',
    text: 'Five breakaways against a sharp goalie. Use your skill to deke and pick a corner.',
    medals: [2, 3, 4],
  },
};

export const MEDAL_NAMES = ['No medal', 'Bronze', 'Silver', 'Gold'];
export const MEDAL_COLORS = ['#8ea3c4', '#d08a4e', '#d7e4f2', '#ffd45e'];
export const DRILL_REWARDS = { exp: [15, 35, 60, 90], coins: [0, 10, 20, 35], firstMedal: [0, 40, 70, 110] };

export function medalFor(def, score) {
  if (def.unit === 'time') return def.medals.filter((t) => score <= t).length;
  return def.medals.filter((t) => score >= t).length;
}

export function formatScore(def, score) {
  if (score === null || score === undefined) return '–';
  if (def.unit === 'time') return t('{seconds}s', { seconds: score.toFixed(2) });
  if (def.unit === 'goals') return `${score}/5`;
  return t('{n} pts', { n: score });
}

const skaterCfg = (save, who) => {
  const m = member(who);
  return {
    def: m.def, who, stats: effectiveStats(who, save.roster[who]), name: m.name, perks: perkNames(save.roster[who]),
    sprite: m.sprite, look: m.look, parts: m.parts, gear: { ...save.roster[who].gear },
  };
};
const homeChem = (save) => Object.fromEntries(Object.keys(save.chem || {}).map((k) => [k, chemLevel(save.chem[k] || 0)]));

// Build the match config for a drill. charId is the skater the player controls.
export function createDrill(id, save, charId, opts = {}) {
  const ids = ['frost', 'thunder', 'stone']; // rival slots
  // your line-up, with the skater you bring in their position's slot
  const line = lineupIds(save).map((w) => (member(w).role === member(charId).role ? charId : w));
  const mates = line.filter((k) => k !== charId);
  let home = [charId], away = [], ctrl, awayTeam = opts.awayTeam || 'lynx'; // (a ghost's team, so its art stays loaded)
  switch (id) {
    case 'cones': ctrl = new ConeDrill(opts.ghost); break;
    case 'sniper': home = [charId, opts.feeder || mates[0]]; ctrl = new SniperDrill(); break;
    case 'rondo': home = [charId, ...mates]; away = ['frost', 'stone']; ctrl = new RondoDrill(); break;
    case 'breakaway': ctrl = new BreakawayDrill(opts.ghost); break;
    case 'shootout': home = line; awayTeam = opts.teamId || 'comets'; away = ids; ctrl = new ShootoutDrill(opts.teamId); break;
    default: throw new Error('Unknown drill ' + id);
  }
  const t = TEAMS[awayTeam];
  const awaySkater = (k) => {
    const sub = rivalSub(save, awayTeam, k);
    const stats = { ...(sub ? sub.stats : CHARACTERS[k].base) };
    for (const [s, v] of Object.entries(t.bonus || {})) stats[s] = Math.max(1, stats[s] + v);
    if (sub) return { def: sub.def, who: 'sub_' + k, stats, name: sub.name, perks: [], sprite: sub.sprite, parts: sub.parts, hand: sub.hand };
    return { def: slotDef(awayTeam, k), stats, name: t.names[k], perks: [], sprite: t.art ? `${t.art}_${ROLE[k]}` : null };
  };
  const cfg = {
    teams: [
      { skaters: home.map((k, i) => (i === 0 && opts.skater ? opts.skater : skaterCfg(save, k))), goalie: homeGoalie(save), chem: homeChem(save) }, // (opts.skater: someone else skates it, like a Skills Night bot)
      { skaters: away.map(awaySkater), goalie: id === 'shootout' ? rivalGoalie(save, awayTeam) : { stats: opts.goalie || { rfx: 4, pos: 5 }, name: 'Coach Brekka', art: null }, chem: {} },
    ],
    humanTeam: 0,
    powers: [],
    twist: 'none',
    diff: [0.6, id === 'shootout' ? t.diff : 0.55],
    seed: opts.seed ?? (Math.random() * 1e9) >>> 0,
    drill: ctrl,
  };
  return { cfg, ctrl, def: DRILLS[id], awayTeam };
}

// ----------------------------------------------------------------- base
class DrillBase {
  constructor() {
    this.t = 0;
    this.cd = 0;
    this.result = null;
    this.neutralAim = undefined; // aim used when the stick is centred (undefined = smart aim)
  }
  startCountdown(m, secs = 3) {
    m.state = 'countdown'; m.stateT = 0;
    this.cd = secs; this.lastCount = Math.ceil(secs) + 1;
  }
  update(m, dt) {
    if (m.state === 'countdown') {
      this.cd -= dt;
      const n = Math.ceil(this.cd);
      if (n !== this.lastCount && n > 0) { this.lastCount = n; m.emit('drill_count', { n }); }
      if (this.cd <= 0) { m.state = 'play'; m.stateT = 0; m.emit('drill_go', {}); }
      return;
    }
    if (m.state === 'play') { this.t += dt; this.tick(m, dt); }
  }
  tick() {}
  onGoal() {}
  finish(m, score, extra = {}) {
    if (this.result) return;
    this.result = { score, ...extra };
    m.state = 'drill_over'; m.stateT = 0;
    m.emit('drill_over', this.result);
  }
  hideGoalies(m, keepRight = false) {
    for (const g of m.goalies) {
      if (keepRight && g.goalSide === 1) continue;
      g.disabled = true; g.x = g.goalSide * 900; g.y = 900;
    }
  }
}

// A stand-in skater for drawing a ghost (the renderer picks its frames; no physics).
function ghostSkater(char, at) {
  const mem = member(char) || member('frost');
  return { team: 0, def: mem.def, sprite: mem.sprite || mem.def.sprite, look: mem.look, parts: mem.parts,
    x: at.x, y: at.y, face: 0, speed: 0, animT: 0, stun: 0, celebrate: 0, ultWindup: 0,
    charging: false, dashT: 0, state: 'skate', stopping: false, gliding: false, d: { maxSpeed: 330 } };
}
// Move a ghost's stand-in to time t of its samples; true once its run is over.
function moveGhost(gs, samples, t) {
  const at = ghostAt(samples, t);
  const prevX = gs.x, prevY = gs.y;
  Object.assign(gs, { x: at.x, y: at.y, face: at.face, speed: at.speed });
  gs.animT += Math.hypot(at.x - prevX, at.y - prevY) / 330; // strides follow the distance skated
  return at.done;
}

// ----------------------------------------------------------- Cone Weave
// Every run is recorded (a ghost to race later). With a ghost to race ({ path, splits,
// label, char }), it skates alongside, see-through, and each gate shows the split.
class ConeDrill extends DrillBase {
  constructor(ghost = null) {
    super();
    const samples = ghost && decodeGhost(ghost.path);
    this.ghost = samples && samples.length ? { ...ghost, samples, splits: ghost.splits || [] } : null;
  }
  init(m) {
    this.hideGoalies(m);
    const s = m.controlled();
    s.x = -560; s.y = 0; s.vx = 0; s.vy = 0; s.face = 0;
    m.takePossession(s, 'drill');
    this.gates = [];
    for (let i = 0; i < 9; i++) this.gates.push({ x: -400 + i * 108, y: (i % 2 ? -1 : 1) * 78, half: 34, state: 'todo' });
    this.next = 0; this.penalty = 0; this.lastX = s.x;
    this.rec = new GhostRecorder(); this.splits = []; this.split = null;
    if (this.ghost) this.ghostS = ghostSkater(this.ghost.char, this.ghost.samples[0]);
    this.startCountdown(m);
  }
  tick(m) {
    const s = m.controlled();
    this.rec.update(this.t, s);
    while (this.next < this.gates.length) {
      const g = this.gates[this.next];
      if (!(this.lastX < g.x && s.x >= g.x)) break;
      const ok = Math.abs(s.y - g.y) < g.half && s.hasPuck;
      g.state = ok ? 'ok' : 'miss';
      if (!ok) this.penalty += 2;
      m.emit(ok ? 'gate_ok' : 'gate_miss', { g, x: g.x, y: g.y });
      const at = Math.round((this.t + this.penalty) * 100) / 100;
      this.splits.push(at);
      const theirs = this.ghost && this.ghost.splits[this.next];
      if (theirs !== undefined) this.split = { delta: at - theirs, t: this.t };
      this.next++;
    }
    this.lastX = s.x;
    if (this.t > 60) this.finish(m, 60 + this.penalty, { penalty: this.penalty, timeout: true });
  }
  onGoal(m, info) {
    if (info.side !== 1) return;
    for (let i = this.next; i < this.gates.length; i++) { this.gates[i].state = 'miss'; this.penalty += 2; }
    this.next = this.gates.length;
    const score = Math.round((this.t + this.penalty) * 100) / 100;
    const ghost = { path: this.rec.encode(), splits: this.splits };
    const vs = this.ghost ? Math.round((score - this.ghost.score) * 100) / 100 : null;
    const vsLine = this.ghost ? `${this.ghost.label}: ${t(vs <= 0 ? '{seconds}s behind you' : '{seconds}s ahead of you', { seconds: Math.abs(vs).toFixed(2) })}` : null;
    this.finish(m, score, { penalty: this.penalty, ghost, vs, vsLabel: this.ghost ? this.ghost.label : null, vsLine, vsWon: vs !== null ? vs <= 0 : null });
  }
  hud() {
    const n = this.gates.length;
    return {
      title: t('Cone Weave'),
      main: t('{seconds}s', { seconds: (this.t + this.penalty).toFixed(2) }),
      sub: this.next < n ? `${t('Gate {n} of {total}', { n: this.next + 1, total: n })}${this.penalty ? ` · +${t('{seconds}s', { seconds: this.penalty })}` : ''}` : `${t('Score on the empty net!')}${this.penalty ? ` · +${t('{seconds}s', { seconds: this.penalty })}` : ''}`,
      note: !this.ghost ? '' : this.split ? `${this.ghost.label}: ${t(this.split.delta <= 0 ? '{seconds}s behind you' : '{seconds}s ahead of you', { seconds: Math.abs(this.split.delta).toFixed(2) })}`
        : t('Ghost: {who}', { who: this.ghost.label }),
    };
  }
  drawGround(ctx, R, m, fx) {
    this.gates.forEach((g, i) => {
      const a = toScreen(g.x, g.y - g.half), b = toScreen(g.x, g.y + g.half);
      const isNext = i === this.next && m.state !== 'drill_over';
      const col = g.state === 'ok' ? 'rgba(127,224,138,0.75)' : g.state === 'miss' ? 'rgba(255,111,125,0.75)' : isNext ? `rgba(113,220,232,${0.55 + Math.sin(fx.time * 8) * 0.3})` : 'rgba(255,255,255,0.35)';
      ctx.strokeStyle = col; ctx.lineWidth = isNext ? 5 : 3;
      ctx.setLineDash(g.state === 'todo' && !isNext ? [6, 6] : []);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
    });
  }
  sprites(m, R, Assets) {
    const out = [];
    for (const g of this.gates) for (const sgn of [-1, 1]) {
      const y = g.y + sgn * g.half;
      out.push({ y, f: (ctx) => { const p = toScreen(g.x, y); Assets.draw(ctx, 'rink_props/props/cone', p.x, p.y + 4, 0.15); } });
    }
    const gs = this.ghostS;
    if (gs && R.drawRaceGhost) {
      // it waits at the start through the countdown, and fades out where its run ended
      const done = moveGhost(gs, this.ghost.samples, m.state === 'countdown' ? 0 : this.t);
      if (done) gs.endT = gs.endT ?? this.t;
      const alpha = done ? Math.max(0, 1 - (this.t - gs.endT) / 1.2) : 1;
      if (alpha > 0) out.push({ y: gs.y - 0.5, f: (ctx) => R.drawRaceGhost(ctx, gs, m, alpha, this.ghost.label) });
    }
    return out;
  }
}

// --------------------------------------------------------------- Sniper
const TARGETS = [-26, 0, 26];

class SniperDrill extends DrillBase {
  init(m) {
    this.hideGoalies(m);
    this.neutralAim = 0;
    const s = m.controlled();
    s.x = 430; s.y = 70; s.face = 0;
    const f = (this.feeder = m.teamSkaters(0).find((k) => k !== s));
    f.scripted = true; f.x = 250; f.y = -150; f.face = 0.6;
    this.rng = makeRng(7);
    this.targets = TARGETS.map((y) => ({ y, lit: false, flash: 0 }));
    this.light(); this.light();
    this.score = 0; this.hits = 0; this.shots = 0; this.duration = 45;
    this.spot = 0; this.dead = 0; this.holdT = 0;
    m.on('shot', (e) => { if (e.s === s) this.shots++; });
    m.takePossession(f, 'drill');
    this.startCountdown(m);
  }
  light() {
    const off = this.targets.filter((t) => !t.lit);
    if (off.length) this.rng.pick(off).lit = true;
  }
  tick(m, dt) {
    const p = m.puck, s = m.controlled(), f = this.feeder;
    for (const t of this.targets) t.flash = Math.max(0, t.flash - dt);
    // feeder drifts between three spots and passes when the shooter is set
    const spots = [{ x: 250, y: -150 }, { x: 250, y: 150 }, { x: 170, y: 10 }];
    const sp = spots[this.spot];
    const d = norm(sp.x - f.x, sp.y - f.y);
    const mag = clamp(d.l / 60, 0, 1);
    f.in = Skater.blankInput();
    f.in.mx = d.x * mag * 0.8; f.in.my = d.y * mag * 0.8;
    if (p.owner === f) {
      this.holdT += dt;
      const ready = m.inShootingRange(s) && !s.hasPuck && Math.hypot(s.x - f.x, s.y - f.y) > 90;
      if (this.holdT > 0.55 && (ready || this.holdT > 2.5) && !f.prevIn.pass) { f.in.pass = true; f.in.passTo = s; }
    } else this.holdT = 0;
    // a dead puck goes back to the feeder
    if (!p.owner) {
      const dead = p.inNet || p.speed < 70 || p.x > GOAL_X + 6;
      this.dead = dead ? this.dead + dt : 0;
      if (this.dead > (p.inNet ? 0.6 : 0.9)) this.respawn(m);
    } else this.dead = 0;
    if (this.t >= this.duration) this.finish(m, this.score, { hits: this.hits, shots: this.shots });
  }
  respawn(m) {
    const p = m.puck;
    p.inNet = null; p.shot = null; p.pass = null;
    this.spot = (this.spot + 1) % 3;
    m.takePossession(this.feeder, 'drill');
    this.dead = 0; this.holdT = 0;
  }
  onGoal(m, info) {
    if (info.side !== 1) return;
    const lit = this.targets.filter((t) => t.lit);
    let hit = null, best = 11;
    for (const t of lit) { const d = Math.abs(info.y - t.y); if (d < best) { best = d; hit = t; } }
    let pts;
    if (hit) {
      pts = 100 + (info.kind === 'onetimer' ? 50 : 0) + (info.special && info.special.combo ? 50 : 0) + (info.kind === 'slap' ? 25 : 0);
      hit.lit = false; hit.flash = 0.5;
      this.light();
      this.hits++;
    } else pts = 10;
    this.score += pts;
    m.emit(hit ? 'target_hit' : 'target_miss', { pts, y: info.y, x: GOAL_X });
  }
  hud() {
    return { title: t('Sniper'), main: t('{n} pts', { n: this.score }), sub: `${t('{seconds}s left', { seconds: Math.max(0, Math.ceil(this.duration - this.t)) })} · ${t(this.hits === 1 ? '{n} target' : '{n} targets', { n: this.hits })}` };
  }
  drawOver(ctx, R, m, fx) {
    for (const t of this.targets) {
      const p = toScreen(GOAL_X - 4, t.y, 14);
      if (R.drawSniperTarget(ctx, p.x, p.y, t.flash ? 'hit' : t.lit ? 'lit' : 'unlit', t.lit ? Math.sin(fx.time * 7) * 0.06 : 0)) continue;
      const r = 9 + (t.lit ? Math.sin(fx.time * 7) * 1 : 0) + t.flash * 10;
      ctx.globalAlpha = t.lit || t.flash ? 1 : 0.35;
      for (const [rr, col] of [[r + 2, '#14233b'], [r, t.flash ? '#ffd45e' : t.lit ? '#ff3b3b' : '#8ea3c4'], [r * 0.66, '#fff2cb'], [r * 0.33, t.lit ? '#ff3b3b' : '#8ea3c4']]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p.x, p.y, rr * 0.75, rr, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

// ------------------------------------------------------------ Keep-Away
const RONDO_X = 60;

class RondoDrill extends DrillBase {
  init(m) {
    this.hideGoalies(m);
    const home = m.teamSkaters(0), away = m.teamSkaters(1);
    const hp = [{ x: 300, y: 0 }, { x: 440, y: -140 }, { x: 440, y: 140 }];
    home.forEach((s, i) => { s.x = hp[i].x; s.y = hp[i].y; s.face = 0; });
    const ap = [{ x: 560, y: -50 }, { x: 560, y: 60 }];
    away.forEach((s, i) => { s.x = ap[i].x; s.y = ap[i].y; s.face = Math.PI; });
    m.takePossession(m.controlled(), 'drill');
    this.score = 0; this.chain = 0; this.best = 0; this.steals = 0; this.duration = 40; this.resetT = 0;
    m.on('receive', (e) => {
      if (m.state !== 'play' || e.s.team !== 0 || this.resetT > 0) return;
      this.chain++;
      this.best = Math.max(this.best, this.chain);
      const pts = Math.min(5, this.chain);
      this.score += pts;
      m.emit('rondo_pass', { s: e.s, pts, chain: this.chain });
    });
    m.on('possession', (e) => { if (m.state === 'play' && e.s.team === 1 && this.resetT <= 0) this.turnover(m, 'steal'); });
    this.startCountdown(m);
  }
  turnover(m, why) {
    this.chain = 0; this.steals++; this.resetT = 1.1;
    m.emit('rondo_steal', { why });
  }
  tick(m, dt) {
    const p = m.puck;
    if (this.resetT > 0) {
      this.resetT -= dt;
      if (this.resetT <= 0) {
        // give the puck back to whoever is furthest from the chasers
        const away = m.teamSkaters(1);
        const home = m.teamSkaters(0);
        let best = home[0], bd = -1;
        for (const h of home) {
          const d = Math.min(...away.map((a) => Math.hypot(a.x - h.x, a.y - h.y)));
          if (d > bd && h.x > RONDO_X + 30) { bd = d; best = h; }
        }
        p.inNet = null;
        m.takePossession(best, 'drill');
        for (const a of away) { const n = norm(a.x - best.x, a.y - best.y); a.vx += n.x * 200; a.vy += n.y * 200; }
      }
    } else if (p.x < RONDO_X || p.inNet) this.turnover(m, 'zone');
    // keep everyone inside the zone
    for (const s of m.skaters) if (s.x < RONDO_X - 20) s.vx = Math.max(s.vx, 120);
    if (this.t >= this.duration) this.finish(m, this.score, { best: this.best, steals: this.steals });
  }
  onGoal(m) { this.turnover(m, 'shot'); }
  hud() {
    return { title: t('Keep-Away'), main: t('{n} pts', { n: this.score }), sub: `${t('{seconds}s left', { seconds: Math.max(0, Math.ceil(this.duration - this.t)) })} · ${t('chain x{n}', { n: this.chain })}` };
  }
  drawGround(ctx, R, m, fx) {
    const a = toScreen(RONDO_X, -280), b = toScreen(RONDO_X, 320);
    ctx.fillStyle = 'rgba(11,20,36,0.28)';
    const l = toScreen(-720, -280), lb = toScreen(-720, 320);
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(lb.x, lb.y); ctx.fill();
    ctx.strokeStyle = `rgba(113,220,232,${0.6 + Math.sin(fx.time * 4) * 0.2})`; ctx.lineWidth = 4; ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
}

// ------------------------------------------------------------ Breakaway
// Every attempt is recorded (the skater's path, the puck's, how it ended), and a ghost's
// attempt plays alongside yours: same start, its shot, then GOAL or SAVED over its head.
class BreakawayDrill extends DrillBase {
  constructor(ghost = null) {
    super();
    const att = ghost && Array.isArray(ghost.attempts) ? ghost.attempts.map((a) => ({ result: a.result, path: decodeGhost(a.path), puck: decodeGhost(a.puck) })) : [];
    this.ghost = att.length && att.every((a) => a.path && a.path.length && a.puck && a.puck.length) ? { ...ghost, att } : null;
  }
  init(m) {
    this.hideGoalies(m, true);
    this.rng = makeRng(11);
    this.attempt = 0; this.goals = 0; this.results = []; this.phase = 'run'; this.runs = [];
    m.on('save', () => { if (this.phase === 'run') this.saved = true; });
    this.startAttempt(m);
    this.startCountdown(m);
  }
  startAttempt(m) {
    const s = m.controlled(), g = m.goalieAt(1), p = m.puck;
    s.x = -40; s.y = this.rng.range(-90, 90); s.vx = 150; s.vy = 0; s.face = 0; s.stun = 0;
    g.x = GOAL_X - 28; g.y = 0; g.vy = 0; g.setState('ready'); g.holdT = 0; g.react = null; g.track = null; g.slowT = 0;
    p.inNet = null; p.shot = null; p.pass = null;
    m.takePossession(s, 'drill');
    this.attT = 0; this.phase = 'run'; this.idle = 0; this.saved = false;
    this.rec = new GhostRecorder(); this.recPuck = new GhostRecorder();
    const ga = this.ghost && this.ghost.att[this.attempt];
    this.ghostS = ga ? ghostSkater(this.ghost.char, ga.path[0]) : null;
  }
  tick(m, dt) {
    const p = m.puck, g = m.goalieAt(1);
    if (this.phase === 'between') {
      this.pauseT -= dt;
      if (this.pauseT <= 0) {
        if (this.attempt >= 5) {
          const g = this.ghost ? this.ghost.att.filter((a) => a.result === 'goal').length : 0;
          const vsLine = this.ghost ? `${this.ghost.label}: ${t(g === 1 ? '{n} goal' : '{n} goals', { n: g })} · ${this.goals > g ? t('you win') : this.goals < g ? t('they win') : t('a tie')}` : null;
          this.finish(m, this.goals, { results: this.results, ghost: { attempts: this.runs }, vs: this.ghost ? g - this.goals : null, vsLabel: this.ghost ? this.ghost.label : null, vsLine, vsWon: this.ghost ? this.goals >= g : null });
        }
        else this.startAttempt(m);
      }
      return;
    }
    this.attT += dt;
    this.rec.update(this.attT, m.controlled());
    this.recPuck.update(this.attT, { x: p.x, y: p.y, face: 0 });
    if (p.owner === g) return this.end(m, 'save');
    if (!p.owner) {
      const stopped = p.speed < 60 || p.x > GOAL_X + 4 || (p.vx < 0 && p.x > 300 && !p.shot);
      this.idle = stopped ? this.idle + dt : 0;
      if (this.idle > 0.5) return this.end(m, this.saved ? 'save' : 'miss');
    }
    if (this.attT > 8) this.end(m, 'time');
  }
  end(m, kind) {
    if (this.phase !== 'run') return;
    this.results.push(kind);
    this.runs.push({ path: this.rec.encode(), puck: this.recPuck.encode(), result: kind });
    this.attempt++;
    this.phase = 'between'; this.pauseT = 1.4;
    m.emit('breakaway_result', { kind, n: this.attempt });
  }
  onGoal(m) { if (this.phase === 'run') { this.goals++; this.end(m, 'goal'); } }
  hud() {
    const dots = Array.from({ length: 5 }, (_, i) => (this.results[i] === 'goal' ? '●' : this.results[i] ? '○' : '·')).join(' ');
    // the ghost's record so far: attempts before this one, and this one once its shot is done
    let note = '';
    if (this.ghost) {
      const ga = this.ghost.att, cur = ga[this.attempt];
      const shown = this.attempt + (cur && this.phase === 'run' && this.attT * 15 >= cur.path.length - 1 ? 1 : 0);
      note = `${this.ghost.label}: ${ga.map((a, i) => (i >= shown ? '·' : a.result === 'goal' ? '●' : '○')).join(' ')}`;
    }
    return { title: t('Breakaway'), main: t(this.goals === 1 ? '{n} goal' : '{n} goals', { n: this.goals }), sub: `${t('Attempt {n} of 5', { n: Math.min(5, this.attempt + 1) })}  ${dots}`, note };
  }
  sprites(m, R) {
    const gs = this.ghostS, ga = this.ghost && this.ghost.att[this.attempt - (this.phase === 'between' ? 1 : 0)];
    if (!gs || !ga || !R.drawRaceGhost) return [];
    // the attempt plays from its start; after it ends the ghost lingers with its result
    const t0 = m.state === 'countdown' ? 0 : this.phase === 'between' ? 99 : this.attT;
    const done = moveGhost(gs, ga.path, t0);
    const puck = ghostAt(ga.puck, t0);
    const fade = this.phase === 'between' ? Math.max(0, this.pauseT / 1.4) : 1;
    const label = done ? (ga.result === 'goal' ? t('GOAL') : ga.result === 'save' ? t('SAVED') : t('MISSED')) : this.ghost.label;
    return [
      { y: gs.y - 0.5, f: (ctx) => R.drawRaceGhost(ctx, gs, m, fade, label) },
      { y: puck.y, f: (ctx) => R.drawGhostPuck(ctx, puck.x, puck.y, fade) },
    ];
  }
}

// ------------------------------------------------------------- Shootout
// Alternating penalty shots: you shoot on their goalie, then you play goalie against
// their shooter (steer to move, shoot button = butterfly, pass button = dive). Best of
// five, then sudden death.
class ShootoutDrill extends DrillBase {
  constructor(teamId) { super(); this.teamId = teamId; this.noSwitch = true; }
  touchLabels() { return this.turn === 'them' ? { a: t('BLOCK'), b: t('DIVE') } : null; }
  init(m) {
    this.round = 0; this.turn = 'us'; this.goals = [0, 0]; this.log = [[], []];
    this.rng = makeRng(23);
    this.phase = 'run';
    this.setup(m);
    this.startCountdown(m);
  }
  shooter(m, team) {
    const list = m.teamSkaters(team);
    return list[this.round % list.length];
  }
  setup(m) {
    const p = m.puck;
    const us = this.turn === 'us';
    const team = us ? 0 : 1;
    const shooter = this.shooter(m, team);
    for (const s of m.skaters) {
      s.parked = s !== shooter;
      s.scripted = s.parked;
      s.vx = 0; s.vy = 0; s.stun = 0; s.charging = false; s.ultWindup = 0;
      if (s.parked) { s.x = s.team === 0 ? -150 - s.slot * 40 : 150 + s.slot * 40; s.y = -262; }
    }
    // control: you skate on your turn, you're the goalie on theirs
    for (const s of m.teamSkaters(0)) s.controlled = us && s === shooter;
    if (!us) {
      // keep a parked skater "controlled" so input routing still works; the goalie reads it
      const proxy = m.teamSkaters(0).find((s) => s.parked);
      proxy.controlled = true;
    }
    const dir = us ? 1 : -1;
    shooter.x = -dir * 40; shooter.y = this.rng.range(-80, 80); shooter.vx = dir * 150; shooter.face = us ? 0 : Math.PI;
    for (const g of m.goalies) {
      g.x = g.goalSide * (GOAL_X - 28); g.y = 0; g.vy = 0; g.setState('ready'); g.holdT = 0; g.react = null; g.track = null; g.slowT = 0;
      g.disabled = us ? g.goalSide !== 1 : g.goalSide !== -1;
      g.manual = !us && g.goalSide === -1 ? { ty: 0, butterfly: 0, dive: false } : null;
      if (g.disabled) { g.x = g.goalSide * 900; g.y = 900; }
    }
    p.inNet = null; p.shot = null; p.pass = null;
    m.takePossession(shooter, 'drill');
    this.active = shooter;
    this.attT = 0; this.idle = 0; this.phase = 'run';
    m.emit('shootout_turn', { us, shooter, round: this.round });
  }
  tick(m, dt) {
    const p = m.puck;
    if (this.phase === 'between') {
      this.pauseT -= dt;
      if (this.pauseT <= 0) this.advance(m);
      return;
    }
    this.attT += dt;
    // the player plays goalie on their turn
    const g = m.goalieAt(-1);
    if (this.turn === 'them' && g.manual) {
      const inp = m.humanInput || {};
      g.manual.ty = clamp(g.manual.ty + (inp.my || 0) * 260 * dt, -MOUTH - 6, MOUTH + 6);
      if (inp.a && !this.prevA) g.manual.butterfly = 0.45;
      if (inp.b && !this.prevB && g.state !== 'dive') g.manual.dive = Math.sign(inp.my || (p.y - g.y) || 1);
      this.prevA = !!inp.a; this.prevB = !!inp.b;
      // their shooter is AI: make sure it shoots before the time is up
      const s = this.active;
      if (s.hasPuck && this.attT > 4.5 && !s.prevIn.shoot) { s.in.shoot = true; }
    }
    const defending = this.turn === 'us' ? m.goalieAt(1) : g;
    if (p.owner === defending) return this.end(m, false);
    if (!p.owner) {
      const behind = this.turn === 'us' ? p.x > GOAL_X + 4 : p.x < -GOAL_X - 4;
      const stopped = p.speed < 60 || behind;
      this.idle = stopped ? this.idle + dt : 0;
      if (this.idle > 0.5) return this.end(m, false);
    }
    if (this.attT > 8) this.end(m, false);
  }
  end(m, scored) {
    if (this.phase !== 'run') return;
    const team = this.turn === 'us' ? 0 : 1;
    this.log[team].push(scored);
    if (scored) this.goals[team]++;
    this.phase = 'between'; this.pauseT = 1.5;
    m.emit('shootout_result', { team, scored, goals: [...this.goals] });
  }
  onGoal(m, info) {
    const team = info.side === 1 ? 0 : 1;
    if ((this.turn === 'us') === (team === 0)) this.end(m, true);
  }
  advance(m) {
    const [a, b] = this.goals;
    const na = this.log[0].length, nb = this.log[1].length;
    const left = (n) => Math.max(0, 5 - n);
    // decided?
    if (na === nb) {
      if (na >= 5 && a !== b) return this.finish(m, a > b ? 1 : 0, { goals: [a, b], log: this.log });
      if (na < 5 && (a > b + left(nb) || b > a + left(na))) return this.finish(m, a > b ? 1 : 0, { goals: [a, b], log: this.log });
    } else if (na < 5 && b > a + left(na)) return this.finish(m, 0, { goals: [a, b], log: this.log });
    else if (na <= 5 && a > b + left(nb)) return this.finish(m, 1, { goals: [a, b], log: this.log });
    if (this.turn === 'us') this.turn = 'them';
    else { this.turn = 'us'; this.round++; }
    this.setup(m);
  }
  hud() {
    const dots = (team) => {
      const n = Math.max(5, this.log[0].length, this.log[1].length);
      return Array.from({ length: n }, (_, i) => (this.log[team][i] === true ? '●' : this.log[team][i] === false ? '○' : '·')).join(' ');
    };
    const sudden = this.log[0].length >= 5 && this.log[1].length >= 5;
    return {
      title: sudden ? t('Shootout · sudden death') : t('Shootout · round {n}', { n: Math.min(this.round + 1, 99) }),
      main: `${this.goals[0]} – ${this.goals[1]}`,
      sub: t('You {us}   Them {them}', { us: dots(0), them: dots(1) }),
      note: this.turn === 'us' ? t('Your shot') : t('You\'re in goal: steer to move, SHOOT = butterfly, PASS = dive'),
    };
  }
}
