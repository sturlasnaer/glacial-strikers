// Instant replay: records the last few seconds of a match and plays a goal back in
// slow motion by writing recorded positions into the live entities.

const SK = ['x', 'y', 'vx', 'vy', 'face', 'state', 'stateT', 'animT', 'charging', 'chargeT', 'ultWindup', 'dashT', 'stun', 'celebrate', 'flash', 'slowT', 'slowMul', 'bedrockT', 'boostT', 'trailT', 'empowered', 'igniteT', 'fadeT', 'gustT', 'controlled', 'stopping', 'gliding'];
const GK = ['x', 'y', 'vx', 'vy', 'state', 'stateT', 'prevState', 'saveHigh', 'saveUp', 'diveDir', 'shuffle', 'slowT', 'flash', 'holdT', 'stopPose', 'disabled', 'leaving', 'leaveX', 'leaveY'];
const LERP = new Set(['x', 'y', 'face']);
const SECONDS = 4.2;
const RATE = 60;

export class Replay {
  constructor() {
    this.buf = [];
    this.active = false;
  }

  clear() { this.buf.length = 0; this.goalAt = -1; this.active = false; }

  record(m) {
    const p = m.puck;
    this.buf.push({
      s: m.skaters.map((s) => SK.map((k) => s[k])),
      g: m.goalies.map((g) => GK.map((k) => g[k])),
      p: [p.x, p.y, p.z, p.vx, p.vy, p.owner, p.power, p.inNet, p.shot ? { power: p.shot.power, special: p.shot.special } : null, p.trail.map((t) => ({ ...t }))],
      trails: m.trails.length ? m.trails.map((t) => ({ ...t })) : null,
      barriers: m.barriers.length ? m.barriers.map((b) => ({ b, t: b.t, breaking: b.breaking })) : null,
    });
    if (this.buf.length > SECONDS * RATE) { this.buf.shift(); if (this.goalAt > 0) this.goalAt--; }
  }

  markGoal() { this.goalAt = this.buf.length - 1; }

  // Start playback; returns false if there isn't enough footage.
  start() {
    if (this.goalAt < 30) return false;
    this.frames = this.buf.slice();
    this.from = Math.max(0, this.goalAt - Math.round(2.0 * RATE));
    this.to = Math.min(this.frames.length - 1, this.goalAt + Math.round(0.6 * RATE));
    this.t = this.from;
    this.active = true;
    this.goalShown = false;
    return true;
  }

  // Advance by real seconds. Returns 'goal' when the replay crosses the goal moment,
  // 'done' at the end.
  step(m, realDt) {
    if (!this.active) return 'done';
    const near = Math.abs(this.t - this.goalAt) < 0.3 * RATE;
    const speed = near ? 0.35 : 0.7;
    this.t += realDt * RATE * speed;
    let ev = null;
    if (!this.goalShown && this.t >= this.goalAt) { this.goalShown = true; ev = 'goal'; }
    if (this.t >= this.to) { this.t = this.to; this.apply(m); this.active = false; return 'done'; }
    this.apply(m);
    return ev;
  }

  apply(m) {
    const i = Math.floor(this.t), f = this.t - i;
    const a = this.frames[i], b = this.frames[Math.min(i + 1, this.frames.length - 1)];
    m.skaters.forEach((s, k) => {
      if (!a.s[k] || !b.s[k]) return; // an extra attacker who jumped on mid-replay
      SK.forEach((key, j) => {
        const va = a.s[k][j], vb = b.s[k][j];
        s[key] = LERP.has(key) && typeof va === 'number' ? lerpVal(key, va, vb, f) : va;
      });
    });
    m.goalies.forEach((g, k) => {
      GK.forEach((key, j) => {
        const va = a.g[k][j], vb = b.g[k][j];
        g[key] = LERP.has(key) && typeof va === 'number' ? va + (vb - va) * f : va;
      });
    });
    const p = m.puck;
    const [x, y, z, vx, vy, owner, power, inNet, shot, trail] = a.p;
    p.x = x + (b.p[0] - x) * f; p.y = y + (b.p[1] - y) * f; p.z = z + (b.p[2] - z) * f;
    p.vx = vx; p.vy = vy; p.owner = owner; p.power = power; p.inNet = inNet; p.shot = shot; p.trail = trail;
    m.trails = a.trails ? a.trails : [];
    if (a.barriers) for (const r of a.barriers) { r.b.t = r.t; r.b.breaking = r.breaking; }
  }
}

function lerpVal(key, a, b, f) {
  if (key === 'face') {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * f;
  }
  return a + (b - a) * f;
}
