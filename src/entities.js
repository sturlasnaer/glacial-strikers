// Skaters, goalies, the puck and stone barriers. Pure simulation, no DOM.

import { clamp, norm, angDiff, segDist } from './util.js';
import { constrainToRink, collideNets, RINK, GOAL_X, MOUTH, NET_DEPTH, POST_R, CROSSBAR, persp } from './rink.js';

export const SKATER_R = 15;
export const PUCK_R = 6;
export const GOALIE_R = 21;
const POKE_REACH = 16; // how far past touching a goalie's poke check reaches
const ROAM_SPEED = 300; // a goalie skating out to play the puck (skaters top out around 330)
const OPP_SPEED = 330;

// Goalies skate around their own net, never through it. The net plus a margin is a box;
// a path from a to b that would cross it goes via one or two of its corners.
function netBox(side, margin) {
  const gx = side * GOAL_X;
  const xa = gx - side * 4, xb = gx + side * (NET_DEPTH + margin); // the crease in front is open ice
  // (the sides and back keep a goalie-sized margin so the sprite clears the net)
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: -MOUTH - margin, y1: MOUTH + margin };
}
const inBox = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
// does the segment pass through the box (shrunk a hair, so corners and edges are fine)?
function crosses(b, ax, ay, bx, by) {
  const e = 0.5, x0 = b.x0 + e, x1 = b.x1 - e, y0 = b.y0 + e, y1 = b.y1 - e;
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t1 - t0 > 1e-6;
}
// the next point to skate to on the way from (ax, ay) to (bx, by) around the net on `side`
export function netWaypoint(side, ax, ay, bx, by, margin) {
  const b = netBox(side, margin);
  if (inBox(b, bx, by)) { // the target hugs the net: aim for the nearest point just outside
    const opts = [[b.x0, by], [b.x1, by], [bx, b.y0], [bx, b.y1]];
    [bx, by] = opts.sort((u, v) => Math.hypot(u[0] - bx, u[1] - by) - Math.hypot(v[0] - bx, v[1] - by))[0];
  }
  if (inBox(b, ax, ay)) { // squeezed against the net: step out sideways first
    const sy = ay >= 0 ? 1 : -1;
    return { x: ax, y: sy > 0 ? b.y1 : b.y0 };
  }
  if (!crosses(b, ax, ay, bx, by)) return { x: bx, y: by };
  const C = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]];
  const len = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  let best = null, bestLen = Infinity;
  // the first waypoint that isn't where we already stand
  const first = (pts) => pts.find((q) => Math.hypot(q[0] - ax, q[1] - ay) > 1) || pts[pts.length - 1];
  for (let i = 0; i < 4; i++) {
    const c = C[i];
    if (!crosses(b, ax, ay, c[0], c[1]) && !crosses(b, c[0], c[1], bx, by)) {
      const l = len([[ax, ay], c, [bx, by]]); if (l < bestLen) { bestLen = l; best = first([c, [bx, by]]); }
    }
    for (const j of [(i + 1) % 4, (i + 3) % 4]) {
      const c2 = C[j];
      if (!crosses(b, ax, ay, c[0], c[1]) && !crosses(b, c2[0], c2[1], bx, by)) {
        const l = len([[ax, ay], c, c2, [bx, by]]); if (l < bestLen) { bestLen = l; best = first([c, c2, [bx, by]]); }
      }
    }
  }
  return best ? { x: best[0], y: best[1] } : { x: bx, y: by };
}
function pathLength(side, ax, ay, bx, by, margin) {
  let x = ax, y = ay, total = 0;
  for (let i = 0; i < 4; i++) {
    const w = netWaypoint(side, x, y, bx, by, margin);
    total += Math.hypot(w.x - x, w.y - y);
    if (w.x === bx && w.y === by) break;
    x = w.x; y = w.y;
  }
  return total;
}

// Convert 1-10 stats into physics numbers.
export function derive(stats) {
  const s = stats;
  return {
    maxSpeed: 228 + s.spd * 13,
    accel: 640 + s.agi * 72,
    turn: 9 + s.agi * 0.9,
    wrist: 640 + s.sht * 28,
    slapBase: 760 + s.sht * 30,
    slapGain: 380 + s.sht * 22,
    aimErr: Math.max(4, 24 - s.sht * 1.8),
    passSpeed: 560 + s.pas * 26,
    passErr: Math.max(2, 16 - s.pas * 1.4),
    handling: s.pas,
    checkPower: 250 + s.chk * 42,
    resist: clamp(s.chk * 0.055, 0, 0.6),
    staminaMax: 70 + s.sta * 6,
    regen: 9 + s.sta * 1.4,
  };
}

export class Puck {
  constructor() {
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.px = 0; this.py = 0;
    this.owner = null; // Skater or Goalie
    this.lastTouch = null; // last skater to touch it
    this.touches = []; // recent skater touches, newest first (for assists)
    this.shot = null; // { by, kind, t, speed, power, special }
    this.pass = null; // { from, to, t }
    this.power = null; // 'fire' | 'ice' | 'lightning' | 'gravity'
    this.powerT = 0;
    this.noPickup = new Map(); // skater -> seconds remaining
    this.rolled = new Set(); // skaters that already rolled to catch this pass-by
    this.curve = null; // gravity curve target
    this.frozenUntil = 0;
    this.trail = [];
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get loose() { return !this.owner; }
  setTouch(s) {
    if (!s || !s.isSkater) return;
    this.lastTouch = s;
    if (this.touches[0] !== s) this.touches.unshift(s);
    if (this.touches.length > 4) this.touches.length = 4;
  }
}

export class Skater {
  constructor(match, team, def, stats, slot, opts = {}) {
    this.isSkater = true;
    this.match = match;
    this.team = team; // 0 home, 1 away
    this.side = team === 0 ? 1 : -1; // attacking direction
    this.def = def;
    this.slot = slot;
    this.name = opts.name || def.name;
    this.perks = opts.perks || [];
    this.sprite = opts.sprite || def.sprite; // rivals have their own roster art
    this.who = opts.who || def.id; // roster member (recruits share a kit's def)
    this.look = opts.look || null; // palette for recruits in our colours
    this.gear = opts.gear || null; // equipped gear ids, for how it shows on the ice
    this.id = `${team}-${def.id}`;
    this.stats = stats;
    this.d = derive(stats);
    if (match.mods && match.mods.has('speed')) { this.d.maxSpeed *= 1.2; this.d.accel *= 1.15; }
    this.r = SKATER_R;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.face = team === 0 ? 0 : Math.PI;
    this.in = Skater.blankInput();
    this.prevIn = Skater.blankInput();
    this.state = 'skate';
    this.stateT = 0;
    this.charging = false;
    this.chargeT = 0;
    this.stamina = this.d.staminaMax;
    this.staminaLock = false;
    this.regenDelay = 0;
    this.ult = 0;
    this.skillCd = 0;
    this.stun = 0;
    this.slowT = 0;
    this.slowMul = 1;
    this.boostT = 0;
    this.trailT = 0;
    this.trailDist = 0;
    this.dashT = 0;
    this.dashDir = { x: 1, y: 0 };
    this.bedrockT = 0;
    this.empowered = 0; // lightning-pass shot boost (seconds)
    this.ultWindup = 0;
    this.checkCd = 0;
    this.hitThisCheck = null;
    this.oneTimerArmed = 0;
    this.comboT = 0; // window to fire a chemistry combo after a teammate's pass
    this.comboFrom = null;
    this.stride = 0;
    this.animT = 0;
    this.controlled = false;
    this.celebrate = 0;
    this.flash = 0;
    this.stats_ = { goals: 0, assists: 0, shots: 0, passes: 0, steals: 0, hits: 0, blocks: 0, skills: 0, ults: 0, oneTimers: 0, powerGoals: 0 };
  }

  static blankInput() {
    return { mx: 0, my: 0, sprint: false, shoot: false, pass: false, check: false, skill: false, ult: false, a: false, b: false, switch: false, aimX: 0, aimY: 0, passTo: null };
  }

  get hasPuck() { return this.match.puck.owner === this; }
  get speed() { return Math.hypot(this.vx, this.vy); }
  hasPerk(name) { return this.perks.includes(name); }

  pressed(k) { return this.in[k] && !this.prevIn[k]; }
  released(k) { return !this.in[k] && this.prevIn[k]; }

  maxSpeed() {
    let m = this.d.maxSpeed;
    const m2 = this.match;
    if (this.in.sprint && !this.staminaLock && this.stamina > 0) m *= 1.3;
    if (this.hasPuck) m *= 0.94;
    if (this.charging) m *= 0.45;
    if (this.ultWindup > 0) m *= 0.3;
    if (this.boostT > 0) m *= 1.3;
    if (this.slowT > 0) m *= this.slowMul;
    m *= m2.surfaceSpeed(this);
    return m;
  }

  update(dt) {
    const m = this.match;
    this.animT += dt;
    this.stateT += dt;
    if (this.parked) { this.vx = 0; this.vy = 0; this.charging = false; return; }
    if (this.flash > 0) this.flash -= dt;
    if (this.celebrate > 0) this.celebrate -= dt;
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.checkCd = Math.max(0, this.checkCd - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.boostT = Math.max(0, this.boostT - dt);
    this.empowered = Math.max(0, this.empowered - dt);
    this.bedrockT = Math.max(0, this.bedrockT - dt);
    this.oneTimerArmed = Math.max(0, this.oneTimerArmed - dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.comboFrom = null; }

    if (this.stun > 0) {
      this.stun -= dt;
      this.charging = false;
      this.ultWindup = 0;
      const f = Math.exp(-3.2 * dt);
      this.vx *= f; this.vy *= f;
      this.integrate(dt);
      return;
    }

    // ---- actions ----
    const inp = this.in;
    if (m.state === 'play') this.actions(dt);

    // ---- movement ----
    if (this.dashT > 0) {
      this.dashT -= dt;
      const sp = 1150;
      this.vx = this.dashDir.x * sp; this.vy = this.dashDir.y * sp;
      if (this.dashT <= 0) {
        const keep = this.d.maxSpeed * 1.15;
        this.vx = this.dashDir.x * keep; this.vy = this.dashDir.y * keep;
      }
    } else {
      const mv = norm(inp.mx, inp.my);
      let mag = Math.min(1, Math.hypot(inp.mx, inp.my));
      this.gliding = false;
      // holding shoot while a pass is on its way = getting set for the one-timer:
      // the stick aims, the skates barely move
      const pk = m.puck;
      if (inp.shoot && !this.hasPuck && !pk.owner && pk.pass && pk.pass.to === this) mag *= 0.15;
      const max = this.maxSpeed();
      let accel = this.d.accel * (this.boostT > 0 ? 1.4 : 1) * (this.charging ? 0.5 : 1);
      if (this.state === 'check' && this.stateT < 0.25) accel *= 0.25;
      if (mag > 0.08) {
        const wx = mv.x * max * mag, wy = mv.y * max * mag;
        let dvx = wx - this.vx, dvy = wy - this.vy;
        const dl = Math.hypot(dvx, dvy);
        const sp = this.speed;
        const dot = sp > 1 ? (this.vx * mv.x + this.vy * mv.y) / sp : 1;
        if (sp > 140 && dot < -0.2) {
          accel *= 1.8; // hockey stop
          if (this.stateT > 0.15 && !this.stopping) { this.stopping = true; m.emit('stop', { s: this, power: sp }); }
        } else this.stopping = false;
        if (dl > 0) {
          const step = Math.min(dl, accel * dt);
          this.vx += (dvx / dl) * step; this.vy += (dvy / dl) * step;
        }
      } else {
        this.stopping = false;
        this.gliding = true;
        const f = Math.exp(-1.15 * dt);
        this.vx *= f; this.vy *= f;
      }
      // speed lanes push
      const lane = m.laneAt(this.x, this.y);
      if (lane) this.vx += lane.dir * 260 * dt;
      // cap
      const sp = this.speed, cap = max * 1.6;
      if (sp > cap && this.state !== 'check') { this.vx *= cap / sp; this.vy *= cap / sp; }
    }

    // stamina
    const sprinting = inp.sprint && Math.hypot(inp.mx, inp.my) > 0.2 && !this.staminaLock && this.dashT <= 0;
    if (sprinting) {
      this.stamina -= 30 * (this.hasPerk('Breakaway') ? 0.8 : 1) * dt;
      this.regenDelay = 0.5;
      if (this.stamina <= 0) { this.stamina = 0; this.staminaLock = true; }
    } else {
      this.regenDelay -= dt;
      if (this.regenDelay <= 0) this.stamina = Math.min(this.d.staminaMax, this.stamina + this.d.regen * dt);
    }
    if (this.staminaLock && this.stamina > this.d.staminaMax * 0.3) this.staminaLock = false;

    // facing
    let tf = null;
    if (this.charging || this.ultWindup > 0) {
      tf = Math.atan2(-this.y * 0.6, this.side * GOAL_X - this.x);
    } else if (this.speed > 40) tf = Math.atan2(this.vy, this.vx);
    else if (Math.hypot(inp.mx, inp.my) > 0.2) tf = Math.atan2(inp.my, inp.mx);
    if (tf !== null) {
      const d = angDiff(this.face, tf);
      const rate = this.d.turn * (this.hasPuck ? 0.9 : 1);
      this.face += clamp(d, -rate * dt, rate * dt);
    }

    // stride timer for skate scratches/sounds
    const spd = this.speed;
    if (spd > 60) {
      this.stride += spd * dt;
      if (this.stride > 70) { this.stride = 0; m.emit('stride', { s: this }); }
    }

    // frost trail
    if (this.trailT > 0) {
      this.trailT -= dt;
      this.trailDist += spd * dt;
      if (this.trailDist > 20) { this.trailDist = 0; m.addTrail(this); }
    }

    if (this.state !== 'skate' && this.stateT > this.stateLen) this.state = 'skate';
    this.integrate(dt);
  }

  integrate(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const n = constrainToRink(this, this.r);
    if (n) {
      const vn = this.vx * n.nx + this.vy * n.ny;
      if (vn > 0) {
        this.vx -= 1.35 * vn * n.nx; this.vy -= 1.35 * vn * n.ny;
        if (vn > 260) this.match.emit('boards', { s: this, power: vn });
      }
    }
    const h = collideNets(this, this.r);
    if (h) {
      const vn = this.vx * h.nx + this.vy * h.ny;
      if (vn < 0) { this.vx -= 1.2 * vn * h.nx; this.vy -= 1.2 * vn * h.ny; }
    }
    this.match.collideBarriers(this, this.r, 0.4);
  }

  setState(s, len) { this.state = s; this.stateT = 0; this.stateLen = len; }

  actions(dt) {
    const m = this.match;
    const inp = this.in;

    // ultimate wind-up (Thunderclap)
    if (this.ultWindup > 0) {
      this.ultWindup -= dt;
      if (!this.hasPuck) { this.ultWindup = 0; return; }
      if (this.ultWindup <= 0) m.abilities.releaseThunderclap(this);
      return;
    }

    if (this.pressed('skill') && this.skillCd <= 0) m.abilities.useSkill(this);
    if (this.pressed('ult') && this.ult >= 100) m.abilities.useUlt(this);

    if (this.hasPuck) {
      if (this.pressed('shoot')) { this.charging = true; this.chargeT = 0; }
      if (this.charging) {
        this.chargeT += dt * (this.hasPerk('Cannon') ? 1.25 : 1);
        if (!inp.shoot) {
          this.charging = false;
          if (this.chargeT < 0.16) m.shoot(this, { kind: 'wrist' });
          else m.shoot(this, { kind: 'slap', charge: clamp((this.chargeT - 0.1) / 0.85, 0, 1) });
          return;
        }
      }
      if (this.pressed('pass') && !this.charging) { if (inp.dump) m.dumpPuck(this); else m.pass(this, inp.passTo); }
    } else {
      this.charging = false;
      if (inp.shoot) this.oneTimerArmed = 0.3;
      if (this.pressed('check') && this.checkCd <= 0 && this.stamina >= 12) this.startCheck();
    }
  }

  startCheck() {
    const inp = this.in;
    let dir = norm(inp.mx, inp.my);
    if (dir.l < 0.2) dir = { x: Math.cos(this.face), y: Math.sin(this.face) };
    this.vx += dir.x * 360; this.vy += dir.y * 360;
    const sp = this.speed, cap = this.d.maxSpeed * 1.55;
    if (sp > cap) { this.vx *= cap / sp; this.vy *= cap / sp; }
    this.face = Math.atan2(dir.y, dir.x);
    this.stamina -= this.match.mods && this.match.mods.has('heavy') ? 8 : 16;
    this.regenDelay = 0.6;
    this.checkCd = 0.7;
    this.hitThisCheck = null;
    this.setState('check', 0.32);
    this.match.emit('check_start', { s: this });
  }

  stickPoint(dist = 22) {
    return { x: this.x + Math.cos(this.face) * dist, y: this.y + Math.sin(this.face) * dist * 0.85 + 3 };
  }

  // Where the puck sits while carried.
  carryPoint() {
    const t = this.animT * (6 + this.speed / 60);
    const wob = Math.sin(t) * 3.5;
    const c = Math.cos(this.face), s = Math.sin(this.face);
    return { x: this.x + c * 25 - s * wob, y: this.y + s * 21 + c * wob + 3 };
  }

  sortY() { return this.y; }
}

export class Goalie {
  constructor(match, team, stats, opts = {}) {
    this.isGoalie = true;
    this.match = match;
    this.team = team;
    this.goalSide = team === 0 ? -1 : 1; // which net we defend
    this.name = opts.name || 'Goalie';
    this.art = opts.art || null;
    this.stats = stats; // { rfx, pos }
    this.r = GOALIE_R;
    this.x = this.goalSide * (GOAL_X - 28);
    this.y = 0;
    this.vy = 0; this.vx = 0;
    this.state = 'ready';
    this.stateT = 0;
    this.react = null; // pending reaction { t, }
    this.diveDir = 0;
    this.holdT = 0;
    this.slowT = 0;
    this.flash = 0;
    this.saves = 0;
    this.shotsFaced = 0;
    this.pokeCd = 0;
    this.stopPose = false; // smothered a loose puck with the stick (pose only)
    this.leaving = false; this.leaveX = 0; this.leaveY = 0; // skating to the bench when pulled (visual)
    this.id = `${team}-goalie`;
  }
  get lat() { return (120 + this.stats.rfx * 11) * (this.slowT > 0 ? 0.45 : 1); }

  reach() {
    let r = 5.5 + this.stats.rfx * 0.7;
    if (this.match.mods && this.match.mods.has('giant')) r *= 1.4;
    if (this.alert > 0) r += 5;
    if (this.state === 'butterfly') r += 5;
    if (this.state === 'glove') r += 6;
    if (this.slowT > 0) r *= 0.75;
    return r;
  }

  setState(s) { if (this.state !== s) { this.prevState = this.state; this.state = s; this.stateT = 0; } }

  // A shot was fired at our net: react after a short delay.
  onShot(shot) {
    this.shotsFaced++;
    const delay = Math.max(0.08, 0.24 - this.stats.rfx * 0.012) + this.match.rng() * 0.06;
    this.react = { t: delay, shot };
  }

  update(dt) {
    const m = this.match, p = m.puck;
    this.stateT += dt;
    if (this.disabled) { if (this.leaving) this.skateOff(dt); return; }
    if (this.state === 'skate_in') { this.skateIn(dt); return; }
    if (this.state === 'roam' || this.state === 'return') { this.updateRoam(dt); return; }
    this.slowT = Math.max(0, this.slowT - dt);
    if (this.flash > 0) this.flash -= dt;
    const gx = this.goalSide * GOAL_X;

    if (this.state === 'hold') {
      this.holdT -= dt;
      if (this.holdT <= 0 && m.state === 'play') {
        m.goalieDistribute(this);
        // played it from behind the net or the corner: head straight back, around the net
        if (pathLength(this.goalSide, this.x, this.y, this.goalSide * (GOAL_X - 28), 0, this.r + 6) > 70) this.setState('return');
      }
      return;
    }
    if (this.state === 'dive' || this.state === 'down') {
      // committed: slide and recover
      this.y += this.vy * dt;
      this.vy *= Math.exp(-5 * dt);
      this.y = clamp(this.y, -MOUTH - 14, MOUTH + 14);
      if (this.stateT > 0.55) this.setState('ready');
      return;
    }

    // player-controlled goalie (shootout)
    if (this.manual) {
      const mm = this.manual;
      if (mm.dive) {
        this.diveDir = mm.dive; mm.dive = false;
        this.setState('dive'); this.vy = this.diveDir * 420;
        m.emit('goalie_dive', { g: this });
        return;
      }
      if (this.stateT < 0.05 && this.state === 'ready') mm.ty = this.y; // just got up from a dive
      if (mm.butterfly > 0) { mm.butterfly -= dt; if (this.state !== 'butterfly') this.setState('butterfly'); }
      else if (this.state === 'butterfly' || this.state === 'glove') this.setState('ready');
      const lat = this.lat * 1.2;
      this.vy = clamp((mm.ty - this.y) * 12, -lat, lat);
      this.y += this.vy * dt;
      this.x += clamp((gx - this.goalSide * 28 - this.x) * 6, -120, 120) * dt;
      this.shuffle = Math.abs(this.vy) > 40 ? Math.sign(this.vy) : 0;
      return;
    }

    // out of position (played the puck behind the net, or knocked off it): back to the crease
    if (this.state === 'ready' && this.stateT > 0.25 && pathLength(this.goalSide, this.x, this.y, this.goalSide * (GOAL_X - 28), 0, this.r + 6) > 70) { this.setState('return'); return; }
    this.roamCd = Math.max(0, (this.roamCd || 0) - dt);
    if (this.state === 'ready' && this.roamCd <= 0 && this.shouldRoam()) { this.setState('roam'); return; }
    this.pokeCd = Math.max(0, this.pokeCd - dt);
    if (this.state === 'ready' && this.pokeCd <= 0 && m.state === 'play') this.tryPoke();

    // target position: stay on the line between puck and goal centre
    const px = p.x, py = p.y;
    const dx = px - gx, dy = py;
    const depth = clamp(Math.abs(dx) / 16, 24, 38) * (0.85 + this.stats.pos * 0.025);
    let tx, ty;
    if (dx * -this.goalSide <= 0) {
      // puck behind the goal line: hug the post on the puck's side
      tx = gx - this.goalSide * 16; ty = Math.sign(py || 1) * (MOUTH - 10);
    } else {
      const ang = Math.atan2(dy, Math.abs(dx));
      tx = gx - this.goalSide * depth * Math.cos(ang);
      ty = clamp(depth * Math.sin(ang) + py * 0.04, -MOUTH + 8, MOUTH - 8);
    }

    if (this.react) {
      this.react.t -= dt;
      if (this.react.t <= 0) {
        // predict crossing of our plane using the puck's current velocity
        const pr = this.predictY();
        if (pr) {
          // read the shot imperfectly: faster shots are harder to read
          const sp = Math.hypot(p.vx, p.vy);
          pr.y += this.match.rng.normal() * (4 + (sp / 1000) * (16 - this.stats.rfx));
          this.track = pr;
          const gap = pr.y - this.y;
          const need = Math.abs(gap) - this.reach();
          const reachable = this.lat * 1.3 * pr.t;
          if (need > reachable && need < reachable + 34 && Math.abs(pr.y) < MOUTH + 6) {
            this.diveDir = Math.sign(gap);
            this.setState('dive');
            this.vy = this.diveDir * 420;
            m.emit('goalie_dive', { g: this });
          } else {
            this.saveHigh = p.z > 14; this.saveUp = pr.y < this.y; // the renderer picks glove or blocker
            this.setState(p.z > 14 ? 'glove' : 'butterfly');
          }
        }
        this.react = null;
      }
    }
    if (this.alert > 0) {
      // telegraphed ultimate: square up in the middle of the net
      this.alert -= dt;
      ty = 0;
      if (this.state === 'ready') this.setState('butterfly');
    }
    if (this.track) {
      ty = clamp(this.track.y, -MOUTH - 4, MOUTH + 4);
      if (!p.shot || p.vx * this.goalSide <= 0) { this.track = null; if (this.state !== 'ready') this.setState('ready'); }
    }

    const lat = this.lat * (this.track ? 1.3 : 1);
    const ddy = ty - this.y;
    this.vy = clamp(ddy * 10, -lat, lat);
    this.y += this.vy * dt;
    this.x += clamp((tx - this.x) * 6, -120, 120) * dt;
    if (!this.track && this.state !== 'ready' && this.stateT > 0.45) this.setState('ready');
    if (!this.track && Math.abs(this.vy) > 40) this.shuffle = Math.sign(this.vy); else this.shuffle = 0;
  }

  // Poke check: a carrier cutting in close in front of the crease.
  tryPoke() {
    const m = this.match, c = m.puck.owner;
    if (!c || !c.isSkater || c.team === this.team || this.slowT > 0) return;
    const ahead = (c.x - this.x) * -this.goalSide;
    if (ahead < 4 || Math.hypot(c.x - this.x, c.y - this.y) > this.r + c.r + POKE_REACH) return;
    this.pokeCd = 1.5;
    this.setState('poke');
    if (m.rng() < 0.22 + this.stats.rfx * 0.02) m.goaliePoke(this, c);
  }

  // Pulled: skate off to the bench. Only for show; the goalie is already out of play.
  skateOff(dt) {
    const bx = this.team === 0 ? -20 : 20, by = RINK.minY + 8;
    const dx = bx - this.leaveX, dy = by - this.leaveY, d = Math.hypot(dx, dy);
    const step = 420 * dt;
    if (d <= step) { this.leaving = false; return; }
    this.leaveX += (dx / d) * step; this.leaveY += (dy / d) * step;
  }

  // Back from the bench: skate to the crease, blocking anything on the way.
  skateIn(dt) {
    if (this.skateTo(this.goalSide * (GOAL_X - 28), 0, 540, dt)) this.setState('ready');
  }

  // Skate toward a point, around our net. True on arrival.
  skateTo(tx, ty, speed, dt) {
    const margin = this.r + 6;
    let step = speed * dt;
    for (let i = 0; i < 3 && step > 0; i++) {
      const w = netWaypoint(this.goalSide, this.x, this.y, tx, ty, margin);
      const dx = w.x - this.x, dy = w.y - this.y, d = Math.hypot(dx, dy);
      if (d > 0.01) { this.vx = (dx / d) * speed; this.vy = (dy / d) * speed; }
      if (d > step) { this.x += (dx / d) * step; this.y += (dy / d) * step; return false; }
      this.x = w.x; this.y = w.y; step -= d;
      if (Math.hypot(tx - this.x, ty - this.y) < 1) { this.vx = 0; this.vy = 0; return true; }
    }
    return false;
  }

  // Should we leave the crease for a loose puck behind our net? Only if we clearly win the race.
  shouldRoam() {
    const m = this.match, p = m.puck;
    if (m.state !== 'play' || m.drill || p.owner || p.shot || p.pass || p.z > 10 || this.slowT > 0) return false;
    const behind = (p.x - this.goalSide * GOAL_X) * this.goalSide;
    if (behind < 6 || Math.abs(p.y) > 240 || p.speed > 680) return false; // stopping a rim is fine
    const mine = pathLength(this.goalSide, this.x, this.y, p.x, p.y, this.r + 6) / ROAM_SPEED;
    return mine + 0.2 < this.rivalTime();
  }

  rivalTime() {
    const p = this.match.puck;
    let t = Infinity;
    for (const s of this.match.skaters) if (s.team !== this.team && !s.parked) t = Math.min(t, Math.hypot(s.x - p.x, s.y - p.y) / OPP_SPEED);
    return t;
  }

  // Out of the crease: chase the puck ('roam'), or head back ('return').
  updateRoam(dt) {
    const m = this.match, p = m.puck;
    if (this.state === 'roam') {
      const loose = m.state === 'play' && !p.owner && !p.shot && (p.x - this.goalSide * GOAL_X) * this.goalSide > -30 && Math.abs(p.y) < 260;
      const mine = Math.hypot(p.x - this.x, p.y - this.y) / ROAM_SPEED;
      if (!loose || this.rivalTime() < mine + 0.05) { this.setState('return'); this.roamCd = 1.2; return; }
      if (Math.hypot(p.x - this.x, p.y - this.y) < this.r + PUCK_R + 8 && !p.noPickup.has(this)) {
        m.goalieCatch(this, false); // stops it with the stick, then plays it
        this.holdT = 0.45; this.roamCd = 1.5;
        m.emit('goalie_plays', { g: this });
        return;
      }
      this.skateTo(p.x, p.y, ROAM_SPEED, dt);
      return;
    }
    if (this.prevState === 'hold' && this.stateT < 0.2) return; // finish the pass first
    if (this.skateTo(this.goalSide * (GOAL_X - 28), 0, ROAM_SPEED * 1.15, dt)) this.setState('ready');
  }

  predictY() {
    const p = this.match.puck;
    if (p.vx * this.goalSide <= 0) return null;
    const t = (this.x - p.x) / p.vx;
    if (t < 0 || t > 2) return null;
    return { y: p.y + p.vy * t, t };
  }

  holdPoint() { return { x: this.x - this.goalSide * 14, y: this.y + 4 }; }
  sortY() { return this.y + 2; }
}

export class Barrier {
  constructor(x, y, ang, team, life) {
    this.x = x; this.y = y; this.ang = ang; this.team = team;
    this.len = 120; this.thick = 26;
    this.life = life; this.t = 0; this.alive = true; this.breaking = 0;
  }
  // segment endpoints
  ends() {
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    return [this.x - c * this.len / 2, this.y - s * this.len / 2, this.x + c * this.len / 2, this.y + s * this.len / 2];
  }
  sortY() { return this.y; }
}

// Collide a circle (entity with x,y,vx,vy) with a barrier segment. Returns hit normal.
export function collideBarrier(e, rad, b, bounce) {
  if (!b.alive || b.breaking > 0) return null;
  const [ax, ay, bx, by] = b.ends();
  const sd = segDist(e.x, e.y, ax, ay, bx, by);
  const lim = rad + b.thick / 2;
  if (sd.d >= lim) return null;
  let nx = e.x - sd.cx, ny = e.y - sd.cy;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  e.x = sd.cx + nx * lim; e.y = sd.cy + ny * lim;
  const vn = e.vx * nx + e.vy * ny;
  if (vn < 0) { e.vx -= (1 + bounce) * vn * nx; e.vy -= (1 + bounce) * vn * ny; }
  return { nx, ny, vn };
}

export { persp, MOUTH, GOAL_X, NET_DEPTH, POST_R, CROSSBAR };
