// Training mini-games and the shootout, built on the match engine.
//
// A drill is a controller object passed to Match as cfg.drill. The match runs its normal
// physics but hands the rules to the controller: init(m), update(m, dt), onGoal(m, info),
// hud(m) and optional draw hooks. No browser APIs here so drills run headless too.

import { CHARACTERS, GOALIE, TEAMS, ROLE, member, slotDef, slotSprite, slotLook } from './data.js';
import { effectiveStats, perkNames, goalieStats, chemLevel, lineupIds, homeGoalie, rivalGoalie } from './progress.js';
import { toScreen, GOAL_X, MOUTH } from './rink.js';
import { rivalSub, agedStats } from './slots.js';
import { norm, clamp, makeRng } from './util.js';
import { Skater } from './entities.js';
import { t } from './i18n.js';
import { GhostRecorder, decodeGhost, ghostAt } from './ghost.js';
import { DrivenResurfacer, DRIVE } from './scenery.js';

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
    text: 'Five breakaways against a sharp goalie. Tap SPRINT close in to deke: if they bite, shoot the other way.',
    medals: [2, 3, 4],
  },
  tips: {
    id: 'tips', name: 'Tip-Ins', trains: 'Net front', icon: 'equipment_items/stick/slapshot', art: 'equipment_items/hub/tips', unit: 'tips', // (art: Batch BO)
    text: 'Ten shots from the point. Get your stick in the lane in front of the net and press SHOOT as the puck comes by to tip it past the goalie.',
    medals: [2, 4, 6],
  },
  faceoffs: {
    id: 'faceoffs', name: 'Faceoffs', trains: 'Draws', icon: 'achievements/off_the_drop', art: 'equipment_items/hub/faceoffs', unit: 'draws', // (art: Batch BO, when it's in)
    text: 'Ten draws against a centre who gets quicker every time. Press SHOOT or PASS as the puck touches the ice: go while it\'s still in the air and you\'re held back.',
    medals: [5, 7, 9],
  },
  powerplay: {
    id: 'powerplay', name: 'Power Play', trains: 'Special teams', icon: 'hud_elements/ability/fire', art: 'equipment_items/hub/powerplay', unit: 'goals45', // (art: Batch CL, when it's in)
    text: 'Your line against two penalty killers for 45 seconds, their third in the box. Move the puck round the umbrella: a pass across to an open stick for a one-timer beats a box.',
    medals: [2, 3, 5],
  },
  resurface: {
    id: 'resurface', name: 'Resurfacer', trains: 'Ice care', icon: 'polish/resurfacer/east/phase_1', art: 'equipment_items/hub/resurface', unit: 'percent', offline: true, // (no online board: a drill for fun; art: Batch CC, when it's in)
    text: 'The ice needs a fresh coat. Drive the resurfacer with the stick (SPRINT is quicker but turns wider) and clean as much of the rink between the goal lines as you can in a minute.',
    medals: [60, 78, 90],
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
  if (def.unit === 'draws') return `${score}/${FACEOFF_DRAWS}`;
  if (def.unit === 'tips') return `${score}/${TIP_SHOTS}`;
  if (def.unit === 'percent') return `${score}%`;
  if (def.unit === 'goals45') return t(score === 1 ? '{n} goal' : '{n} goals', { n: score });
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
    case 'sniper': home = [charId, opts.feeder || mates[0]]; ctrl = new SniperDrill(opts.skills ? null : save.paces && save.paces.sniper, charId, opts.skills || opts.noGhost ? false : opts.ghost); break; // (your best run's pace, and a ghost: one picked or raced from a link, else your best)
    case 'rondo': home = [charId, ...mates]; away = ['frost', 'stone']; ctrl = new RondoDrill(save.paces && save.paces.rondo); break;
    case 'breakaway': ctrl = new BreakawayDrill(opts.ghost); break;
    case 'faceoffs': away = ['frost']; ctrl = new FaceoffDrill(); break;
    case 'tips': home = [charId, opts.feeder || mates.find((k) => member(k).role === 'D') || mates[0]]; ctrl = new TipDrill(); break;
    case 'resurface': ctrl = new ResurfaceDrill(); break;
    case 'powerplay': home = [charId, ...mates]; away = ['frost', 'thunder', 'stone']; ctrl = new PowerPlayDrill(); break;
    case 'shootout': home = line; awayTeam = opts.teamId || 'comets'; away = ids; ctrl = new ShootoutDrill(opts.teamId); break;
    case 'party': home = line; awayTeam = opts.teamId || 'comets'; away = ids; ctrl = new ShootoutDrill(opts.teamId, true); break; // (2 Players › Shootout)
    default: throw new Error('Unknown drill ' + id);
  }
  const t = TEAMS[awayTeam];
  const awaySkater = (k) => {
    const sub = rivalSub(save, awayTeam, k);
    const stats = { ...(sub ? sub.stats : CHARACTERS[k].base) };
    for (const [s, v] of Object.entries(t.bonus || {})) stats[s] = Math.max(1, stats[s] + v);
    if (sub) return { def: sub.def, who: 'sub_' + k, stats, name: sub.name, perks: [], sprite: sub.sprite, parts: sub.parts, hand: sub.hand };
    return { def: slotDef(awayTeam, k), stats: agedStats(save, awayTeam, k, stats), name: t.names[k], perks: [], sprite: slotSprite(awayTeam, k), parts: slotLook(awayTeam, k) };
  };
  const cfg = {
    teams: [
      { skaters: home.map((k, i) => (i === 0 && opts.skater ? opts.skater : skaterCfg(save, k))), goalie: homeGoalie(save), chem: homeChem(save) }, // (opts.skater: someone else skates it, like a Skills Night bot)
      { skaters: away.map(awaySkater), goalie: id === 'shootout' || id === 'party' ? rivalGoalie(save, awayTeam) : { stats: opts.goalie || { rfx: 4, pos: 5 }, name: 'Coach Brekka', art: null }, chem: {} },
    ],
    humanTeam: 0,
    ...(id === 'party' ? { humans: [0, 1] } : {}), // (both shooters are players)
    powers: [],
    twist: 'none',
    diff: [0.6, id === 'shootout' ? t.diff : id === 'party' ? 0.5 : 0.55],
    seed: opts.seed ?? (Math.random() * 1e9) >>> 0,
    assist: id === 'shootout' ? (save.settings && save.settings.assist) || 'normal' : 'normal', // (the shootout goalie's help; drills keep one setting for their boards)
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
  // Racing your own best run (Sniper, Keep-Away): its points over time, and this run's.
  setPace(best) { this.paceBest = best && Array.isArray(best.pace) ? best : null; this.pace = [[0, 0]]; }
  track(score) { this.pace.push([Math.round(this.t * 10) / 10, score]); }
  paceNote(score) {
    const b = this.paceBest;
    if (!b) return '';
    let at = 0;
    for (const [tt, v] of b.pace) { if (tt <= this.t) at = v; else break; }
    const d = score - at;
    return t('Your best: {n} by now ({diff})', { n: at, diff: (d >= 0 ? '+' : '−') + Math.abs(d) });
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
// Your best run comes back as a ghost: the skater and the puck, see-through, and a frosty ring
// on each target it hit when it hit it. Every run is recorded (kept with the best's pace).
const TARGETS = [-26, 0, 26];

class SniperDrill extends DrillBase {
  constructor(best, char, picked = null) {
    super();
    this.setPace(best);
    this.char = char;
    // the ghost: one picked (or a friend's challenge), none if turned off, else your best
    const r = picked === false ? null : picked || (best && best.race), path = r && decodeGhost(r.path), puck = r && decodeGhost(r.puck);
    this.ghost = path && path.length && puck && puck.length ? { path, puck, lit: Array.isArray(r.lit) ? r.lit : [], char: r.char || char, label: (picked && picked.label) || t('Your best'), score: picked ? picked.score : best && best.score } : null;
  }
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
    this.rec = new GhostRecorder(); this.recPuck = new GhostRecorder(); this.lit = [];
    if (this.ghost) this.ghostS = ghostSkater(this.ghost.char, this.ghost.path[0]);
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
    this.rec.update(this.t, s); this.recPuck.update(this.t, { x: p.x, y: p.y, face: 0 });
    if (this.t >= this.duration) {
      const race = { path: this.rec.encode(), puck: this.recPuck.encode(), lit: this.lit, char: this.char };
      // against a ghost with a score: by how much (the run itself goes up as a ghost and can be a challenge)
      const vs = this.ghost && Number.isFinite(this.ghost.score) ? this.score - this.ghost.score : null;
      const vsLine = vs === null ? null : `${this.ghost.label}: ${t(vs >= 0 ? '{n} pts behind you' : '{n} pts ahead of you', { n: Math.abs(vs) })}`;
      this.finish(m, this.score, { hits: this.hits, shots: this.shots, pace: this.pace, race, ghost: race, vs, vsLabel: this.ghost ? this.ghost.label : null, vsLine, vsWon: vs !== null ? vs >= 0 : null });
    }
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
      this.lit.push([Math.round(this.t * 10) / 10, this.targets.indexOf(hit)]); // (for the ghost's rings)
      this.light();
      this.hits++;
    } else pts = 10;
    this.score += pts;
    this.track(this.score);
    m.emit(hit ? 'target_hit' : 'target_miss', { pts, y: info.y, x: GOAL_X });
  }
  hud() {
    return { title: t('Sniper'), main: t('{n} pts', { n: this.score }), sub: `${t('{seconds}s left', { seconds: Math.max(0, Math.ceil(this.duration - this.t)) })} · ${t(this.hits === 1 ? '{n} target' : '{n} targets', { n: this.hits })}`, note: this.paceNote(this.score) };
  }
  sprites(m, R) {
    const gs = this.ghostS;
    if (!gs || !R.drawRaceGhost) return [];
    // it waits at the start through the countdown, then skates and shoots its run
    const t0 = m.state === 'countdown' ? 0 : this.t;
    moveGhost(gs, this.ghost.path, t0);
    const puck = ghostAt(this.ghost.puck, t0);
    const fade = m.state === 'drill_over' ? 0.4 : 0.8;
    return [
      { y: gs.y - 0.5, f: (ctx) => R.drawRaceGhost(ctx, gs, m, fade, this.ghost.label) },
      { y: puck.y, f: (ctx) => R.drawGhostPuck(ctx, puck.x, puck.y, fade) },
    ];
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
    // the ghost's hits: a frosty ring over the target, swelling and fading over 0.7 s
    if (this.ghost && m.state !== 'countdown') {
      for (const [at, i] of this.ghost.lit) {
        const k = (this.t - at) / 0.7;
        if (k < 0 || k > 1 || !this.targets[i]) continue;
        const p = toScreen(GOAL_X - 4, this.targets[i].y, 14);
        ctx.save();
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 11 + k * 12, 14 + k * 16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(11,20,36,0.7)'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// ------------------------------------------------------------ Keep-Away
const RONDO_X = 60;

class RondoDrill extends DrillBase {
  constructor(best) { super(); this.setPace(best); }
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
      this.track(this.score);
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
    if (this.t >= this.duration) this.finish(m, this.score, { best: this.best, steals: this.steals, pace: this.pace });
  }
  onGoal(m) { this.turnover(m, 'shot'); }
  hud() {
    return { title: t('Keep-Away'), main: t('{n} pts', { n: this.score }), sub: `${t('{seconds}s left', { seconds: Math.max(0, Math.ceil(this.duration - this.t)) })} · ${t('chain x{n}', { n: this.chain })}`, note: this.paceNote(this.score) };
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

// ------------------------------------------------------------- Tip-Ins
// Ten shots from the point at the net, the player in front: a stick in the lane and SHOOT pressed
// as the puck comes by tips it (the match's own tip, at the player's chance). Goals off a tip count.
const TIP_SHOTS = 10;
const TIP_SPOTS = [-110, 0, 110, -60, 60];
class TipDrill extends DrillBase {
  constructor() { super(); this.noSwitch = true; this.neutralAim = 0; }
  init(m) {
    this.hideGoalies(m, true);
    this.n = 0; this.goals = 0; this.tips = 0; this.results = []; this.phase = 'set'; this.setT = 0;
    const s = m.controlled();
    s.x = GOAL_X - 150; s.y = 0; s.face = Math.PI;
    this.feeder = m.teamSkaters(0).find((k) => k !== s);
    this.feeder.scripted = true;
    m.on('tip', () => { if (this.phase === 'shot') this.tipped = true; });
    this.place(m);
    this.startCountdown(m);
  }
  place(m) {
    const f = this.feeder, g = m.goalieAt(1), p = m.puck;
    f.x = 300; f.y = TIP_SPOTS[this.n % TIP_SPOTS.length]; f.vx = f.vy = 0; f.face = 0;
    g.x = GOAL_X - 28; g.y = 0; g.setState('ready'); g.react = null; g.track = null; g.holdT = 0;
    p.inNet = null; p.shot = null; p.pass = null;
    m.takePossession(f, 'drill');
    this.phase = 'set'; this.setT = 0; this.tipped = false; this.shotT = 0;
  }
  tick(m, dt) {
    const f = this.feeder, p = m.puck, g = m.goalieAt(1);
    f.in = Skater.blankInput();
    if (this.phase === 'set') {
      if ((this.setT += dt) > 1.4) { // the point shot, at the middle of the net
        m.shoot(f, { kind: 'wrist' });
        const d = norm(GOAL_X - p.x, -p.y), sp = Math.hypot(p.vx, p.vy);
        p.vx = d.x * sp; p.vy = d.y * sp; p.curve = null; p.vz = 20;
        this.phase = 'shot'; this.n++;
      }
      return;
    }
    if (this.phase === 'shot') {
      this.shotT += dt;
      const over = p.owner === g || (!p.owner && (p.speed < 60 || p.x > GOAL_X + 6 || p.x < 150)) || this.shotT > 3;
      if (over) this.end(m, 'miss');
      return;
    }
    if (this.phase === 'between' && (this.pauseT -= dt) <= 0) {
      if (this.n >= TIP_SHOTS) this.finish(m, this.goals, { tips: this.tips, results: this.results });
      else this.place(m);
    }
  }
  end(m, kind) {
    if (this.phase !== 'shot') return;
    if (this.tipped) this.tips++;
    this.results.push(kind);
    this.phase = 'between'; this.pauseT = 1;
    m.emit('tip_result', { kind, tipped: this.tipped, n: this.n });
  }
  // the lane the shot will take, while it's set up: get a stick on that line
  drawOver(ctx, R, m, fx) {
    if (this.phase !== 'set') return;
    const a = toScreen(this.feeder.x, this.feeder.y), b = toScreen(GOAL_X, 0);
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(fx.time * 5) * 0.15;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(20,35,59,0.35)'; ctx.lineWidth = 6; ctx.stroke();
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -fx.time * 30; ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  onGoal(m, info) { if (this.phase === 'shot' && info.side === 1) { if (this.tipped) { this.goals++; this.end(m, 'goal'); } else this.end(m, 'untipped'); } }
  hud() {
    const dots = Array.from({ length: TIP_SHOTS }, (_, i) => (this.results[i] === 'goal' ? '●' : this.results[i] ? '○' : '·')).join(' ');
    return { title: t('Tip-Ins'), main: t(this.goals === 1 ? '{n} goal' : '{n} goals', { n: this.goals }), sub: `${t('Shot {n} of {total}', { n: Math.min(TIP_SHOTS, this.n + (this.phase === 'set' ? 1 : 0)), total: TIP_SHOTS })}  ${dots}`, note: this.tips ? t(this.tips === 1 ? '{n} tip' : '{n} tips', { n: this.tips }) : '' };
  }
}

// ------------------------------------------------------------- Faceoffs
// Ten draws at centre ice, the linesman dropping the puck, against a centre who reacts a little
// quicker every time. The match's own faceoff decides each one: press after the puck lands and
// before they react; a press while it's in the air holds you back past their reaction.
const FACEOFF_DRAWS = 10;
const FACEOFF_RT = [0.5, 0.44, 0.39, 0.35, 0.31, 0.28, 0.25, 0.22, 0.2, 0.18];
class FaceoffDrill extends DrillBase {
  constructor() { super(); this.faceoffs = true; this.noSwitch = true; this.linesman = true; }
  init(m) {
    this.n = 0; this.wins = 0; this.clean = 0; this.results = []; this.phase = 'wait'; this.pauseT = 0;
    m.on('faceoff_win', (e) => this.drawn(m, e));
    this.startCountdown(m);
  }
  update(m, dt) {
    if (m.state === 'countdown') { super.update(m, dt); if (m.state === 'play') this.next(m); return; }
    if (m.state === 'faceoff') { this.t += dt; m.updateFaceoff(dt); return; }
    super.update(m, dt);
  }
  next(m) {
    m.setupFaceoff();
    m.faceoffRt[1] = FACEOFF_RT[this.n];
    this.phase = 'draw';
  }
  drawn(m, e) {
    if (this.phase !== 'draw') return;
    const won = e.s.team === 0;
    this.n++;
    if (won) this.wins++;
    if (won && e.clean) this.clean++;
    this.results.push(won ? 'won' : 'lost');
    this.phase = 'between'; this.pauseT = 1.2;
    m.emit('faceoff_result', { won, clean: won && e.clean, early: !won && m.faceoffJump[0], n: this.n, rt: e.rt, theirs: m.faceoffRt[1] });
  }
  tick(m, dt) {
    if (this.phase === 'draw') { this.drawn(m, { s: m.faceoffCenter(1), clean: false }); return; } // (nobody took it: theirs)
    if (this.phase !== 'between' || (this.pauseT -= dt) > 0) return;
    if (this.n >= FACEOFF_DRAWS) { this.phase = 'done'; this.finish(m, this.wins, { clean: this.clean, results: this.results }); }
    else this.next(m);
  }
  hud() {
    const dots = Array.from({ length: FACEOFF_DRAWS }, (_, i) => (this.results[i] === 'won' ? '●' : this.results[i] ? '○' : '·')).join(' ');
    return { title: t('Faceoffs'), main: t('{n} won', { n: this.wins }), sub: `${t('Draw {n} of {total}', { n: Math.min(FACEOFF_DRAWS, this.n + 1), total: FACEOFF_DRAWS })}  ${dots}`, note: this.clean ? t('{n} clean', { n: this.clean }) : '' };
  }
}

// ----------------------------------------------------------- Power Play
// Our line of three against two killers (their third sits in the box, the clock over it the
// drill's), so both sides play special teams: our AI spreads into the umbrella, theirs holds
// its tandem. A goal, a save held or a clear out of the zone restarts the entry at the blue line.
const PP_SECONDS = 45;
class PowerPlayDrill extends DrillBase {
  constructor() { super(); this.linesman = false; }
  init(m) {
    this.hideGoalies(m, true); // (their goalie stays)
    const away = m.teamSkaters(1);
    this.boxed = away[1];
    Object.assign(this.boxed, { parked: true, boxT: PP_SECONDS, boxReason: 'Hooking', x: 70, y: -260, vx: 0, vy: 0 });
    this.goals = 0; this.shots = 0; this.pauseT = 0; this.results = [];
    m.on('shot', (e) => { if (e.s.team === 0 && this.pauseT <= 0) this.shots++; });
    this.entry(m);
    this.startCountdown(m);
  }
  entry(m) {
    const home = m.teamSkaters(0), away = m.teamSkaters(1).filter((k) => k !== this.boxed), p = m.puck, g = m.goalieAt(1);
    const hp = [{ x: 120, y: 0 }, { x: 230, y: -150 }, { x: 230, y: 150 }];
    const c = m.controlled() || home[0];
    [c, ...home.filter((k) => k !== c)].forEach((s, i) => Object.assign(s, { x: hp[i].x, y: hp[i].y, vx: 140, vy: 0, face: 0, stun: 0, charging: false }));
    const ap = [{ x: 470, y: -60 }, { x: 470, y: 70 }];
    away.forEach((s, i) => Object.assign(s, { x: ap[i].x, y: ap[i].y, vx: 0, vy: 0, face: Math.PI, stun: 0 }));
    g.x = GOAL_X - 28; g.y = 0; g.vy = 0; g.setState('ready'); g.holdT = 0; g.react = null; g.track = null;
    p.inNet = null; p.shot = null; p.pass = null;
    m.takePossession(c, 'drill');
  }
  tick(m, dt) {
    this.boxed.boxT = Math.max(0.01, PP_SECONDS - this.t); // (the box clock is the drill's)
    if (this.t >= PP_SECONDS) { this.finish(m, this.goals, { shots: this.shots, results: this.results }); return; }
    if (this.pauseT > 0) { this.pauseT -= dt; if (this.pauseT <= 0) this.entry(m); return; }
    const p = m.puck, o = p.owner;
    if (o && o.isGoalie) return this.restart(m, 'save');
    if ((o && o.team === 1 && o.x < 40) || (!o && p.x < -20)) this.restart(m, 'clear'); // (cleared out past the blue line)
  }
  restart(m, why) { this.results.push(why); this.pauseT = 0.9; m.emit('pp_reset', { why }); }
  onGoal(m, info) {
    if (info.side !== 1 || this.pauseT > 0) return;
    this.goals++; this.results.push('goal');
    this.pauseT = 1.4;
    m.emit('drill_goal', { side: info.side, y: info.y });
  }
  hud() {
    return { title: t('Power Play'), main: t(this.goals === 1 ? '{n} goal' : '{n} goals', { n: this.goals }), sub: t('{seconds}s left', { seconds: Math.max(0, Math.ceil(PP_SECONDS - this.t)) }), note: this.shots ? t('{n} shots', { n: this.shots }) : '' };
  }
}

// ----------------------------------------------------------- Resurfacer
// Nobody on the ice: the player drives the resurfacer (scenery.js) and the score is how much of
// the rink between the goal lines it has cleaned, counted on a grid of 16-unit cells (a cell
// is clean once the machine's middle passes within the sweep of its centre).
const RESURFACE_SECONDS = 60, CELL = 16;
class ResurfaceDrill extends DrillBase {
  constructor() { super(); this.noSwitch = true; this.noCard = true; this.machine = new DrivenResurfacer(); this.keepGroups = ['title', 'resurfacer']; } // (its art lives with the title screen's, the diagonals on a page of their own; nobody's card on the HUD)
  init(m) {
    this.hideGoalies(m);
    for (const s of m.skaters) { s.parked = true; s.x = 0; s.y = -900; s.vx = s.vy = 0; }
    const p = m.puck;
    p.owner = null; p.x = 0; p.y = 0; p.vx = p.vy = 0;
    const { X, Y0, Y1, R, SWEEP } = DRIVE;
    this.x0 = -X - SWEEP; this.y0 = Y0 - SWEEP;
    this.cols = Math.ceil((2 * (X + SWEEP)) / CELL); this.rows = Math.ceil((Y1 - Y0 + 2 * SWEEP) / CELL);
    this.cells = new Uint8Array(this.cols * this.rows); // 0 outside, 1 to clean, 2 clean
    this.total = 0;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const x = this.x0 + (c + 0.5) * CELL, y = this.y0 + (r + 0.5) * CELL;
      // inside the drive area grown by the sweep (its rounded corners too)
      const cx = Math.sign(x) * (X - R), cy = y < Y0 + R ? Y0 + R : y > Y1 - R ? Y1 - R : null;
      const inside = Math.abs(x) <= X + SWEEP && y >= Y0 - SWEEP && y <= Y1 + SWEEP && (cy === null || Math.abs(x) <= X - R || Math.hypot(x - cx, y - cy) <= R + SWEEP);
      if (inside) { this.cells[r * this.cols + c] = 1; this.total++; }
    }
    this.clean = 0; this.mark = 0;
    this.sweep();
    this.startCountdown(m);
  }
  get pct() { return Math.floor((this.clean / this.total) * 100); }
  sweep() {
    const M = this.machine, s = DRIVE.SWEEP;
    const c0 = Math.max(0, Math.floor((M.x - s - this.x0) / CELL)), c1 = Math.min(this.cols - 1, Math.floor((M.x + s - this.x0) / CELL));
    const r0 = Math.max(0, Math.floor((M.y - s - this.y0) / CELL)), r1 = Math.min(this.rows - 1, Math.floor((M.y + s - this.y0) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * this.cols + c;
      if (this.cells[i] !== 1) continue;
      if (Math.hypot(this.x0 + (c + 0.5) * CELL - M.x, this.y0 + (r + 0.5) * CELL - M.y) <= s) { this.cells[i] = 2; this.clean++; }
    }
  }
  tick(m, dt) {
    const raw = m.humanInputs[0] || {};
    this.machine.drive(dt, raw.mx || 0, raw.my || 0, !!raw.sprint);
    this.sweep();
    const pct = this.pct;
    if (pct >= this.mark + 10) { this.mark = pct - (pct % 10); m.emit('gate_ok', { x: this.machine.x, y: this.machine.y, pct: this.mark }); }
    if (pct >= 100 || this.t >= RESURFACE_SECONDS) this.finish(m, Math.min(100, pct), { time: Math.round(Math.min(this.t, RESURFACE_SECONDS) * 10) / 10 });
  }
  keysHint(K) { return `${t('Steer with {move}', { move: K('up') + K('left') + K('down') + K('right') })} · ${K('sprint')} ${t('faster, wider turns')}`; }
  hud() {
    return { title: t('Resurfacer'), main: `${this.pct}%`, sub: t('{seconds}s left', { seconds: Math.max(0, Math.ceil(RESURFACE_SECONDS - this.t)) }), note: '' };
  }
}

// ------------------------------------------------------------- Shootout
// Alternating penalty shots: you shoot on their goalie, then you play goalie against
// their shooter (steer to move, shoot button = butterfly, pass button = dive). Best of
// five, then sudden death.
class ShootoutDrill extends DrillBase {
  // party: two players on one screen take turns shooting (player 2 for the other side), both
  // against computer goalies
  constructor(teamId, party = false) { super(); this.teamId = teamId; this.noSwitch = true; this.party = party; }
  touchLabels() { return this.turn === 'them' && !this.party ? { a: t('BLOCK'), b: t('DIVE') } : null; }
  init(m) {
    this.round = 0; this.turn = 'us'; this.goals = [0, 0]; this.log = [[], []];
    this.rng = makeRng(23);
    this.phase = 'run';
    // one chance each: a save or a poke check ends the attempt (no rebounds, no second go)
    const over = () => { if (this.phase === 'run') this.dead = true; };
    m.on('save', over); m.on('poke_check', over);
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
    // control: you skate on your turn, you're the goalie on theirs (party: player 2 skates theirs)
    for (const s of m.teamSkaters(0)) s.controlled = us && s === shooter;
    for (const s of m.teamSkaters(1)) s.controlled = this.party && !us && s === shooter;
    if (!us && !this.party) {
      // keep a parked skater "controlled" so input routing still works; the goalie reads it
      const proxy = m.teamSkaters(0).find((s) => s.parked);
      proxy.controlled = true;
    }
    const dir = us ? 1 : -1;
    shooter.x = -dir * 40; shooter.y = this.rng.range(-80, 80); shooter.vx = dir * 150; shooter.face = us ? 0 : Math.PI;
    for (const g of m.goalies) {
      g.x = g.goalSide * (GOAL_X - 28); g.y = 0; g.vy = 0; g.setState('ready'); g.holdT = 0; g.react = null; g.track = null; g.slowT = 0;
      g.disabled = us ? g.goalSide !== 1 : g.goalSide !== -1;
      // the player's goalie on their turn: goal mode's controls and its help (Settings › Aim assist)
      g.human = !this.party && !us && g.goalSide === -1;
      Object.assign(g, { prevHuman: { a: true, b: true, skill: true, ult: true }, butterflyT: 0, hx: undefined, hy: undefined, wallT: 0 });
      if (g.disabled) { g.x = g.goalSide * 900; g.y = 900; }
    }
    p.inNet = null; p.shot = null; p.pass = null;
    m.takePossession(shooter, 'drill');
    this.active = shooter;
    this.attT = 0; this.idle = 0; this.phase = 'run'; this.dead = false;
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
    if (this.turn === 'them' && !this.party) {
      // their shooter is AI: make sure it shoots before the time is up
      const s = this.active;
      if (s.hasPuck && this.attT > 4.5 && !s.prevIn.shoot) { s.in.shoot = true; }
    }
    const defending = this.turn === 'us' ? m.goalieAt(1) : g;
    if (p.owner === defending || this.dead) return this.end(m, false);
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
    if (this.party) return {
      title: sudden ? t('Shootout · sudden death') : t('Shootout · round {n}', { n: Math.min(this.round + 1, 99) }),
      main: `${this.goals[0]} – ${this.goals[1]}`,
      sub: t('P1 {us}   P2 {them}', { us: dots(0), them: dots(1) }),
      note: this.turn === 'us' ? t('Player 1 shoots') : t('Player 2 shoots'),
    };
    return {
      title: sudden ? t('Shootout · sudden death') : t('Shootout · round {n}', { n: Math.min(this.round + 1, 99) }),
      main: `${this.goals[0]} – ${this.goals[1]}`,
      sub: t('You {us}   Them {them}', { us: dots(0), them: dots(1) }),
      note: this.turn === 'us' ? t('Your shot') : t('You\'re in goal: steer to move, SHOOT = butterfly, PASS = dive'),
    };
  }
}
