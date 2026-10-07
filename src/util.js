// Small math helpers shared by the simulation and the renderer.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const len = (x, y) => Math.hypot(x, y);
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const angleOf = (x, y) => Math.atan2(y, x);
export const TAU = Math.PI * 2;

export function norm(x, y) {
  const l = Math.hypot(x, y);
  return l > 1e-6 ? { x: x / l, y: y / l, l } : { x: 0, y: 0, l: 0 };
}

export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Distance from point p to segment ab, plus the projection parameter t.
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  const cx = ax + dx * t, cy = ay + dy * t;
  return { d: Math.hypot(px - cx, py - cy), t, cx, cy };
}

// Seedable RNG (mulberry32) so headless simulations are reproducible.
export function makeRng(seed = Date.now() >>> 0) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (a, b) => a + (b - a) * rng();
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  rng.normal = () => {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  return rng;
}

export class Emitter {
  constructor() { this.handlers = {}; }
  on(type, fn) { (this.handlers[type] ||= []).push(fn); return () => this.off(type, fn); }
  off(type, fn) { const h = this.handlers[type]; if (h) this.handlers[type] = h.filter((f) => f !== fn); }
  emit(type, data) {
    const h = this.handlers[type];
    if (h) for (const fn of h) fn(data);
    const all = this.handlers['*'];
    if (all) for (const fn of all) fn(type, data);
  }
}
