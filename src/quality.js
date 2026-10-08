// Auto-quality: during matches, watch the frame rate and trade detail for smoothness on a
// slow device, one step at a time (resolution first, then effects, the crowd and the snow),
// and step back up when there's room again. A device remembers where it settled.
const KEY = 'puckbound-quality';

// dpr: the most screen pixels per CSS pixel; fx: share of particles; crowd: share of fans
// drawn; snow: share of snowflakes.
export const STEPS = [
  { dpr: 2, fx: 1, crowd: 1, snow: 1 },
  { dpr: 1.75, fx: 1, crowd: 1, snow: 1 },
  { dpr: 1.5, fx: 1, crowd: 1, snow: 1 },
  { dpr: 1.5, fx: 0.6, crowd: 0.5, snow: 0.5 },
  { dpr: 1.25, fx: 0.4, crowd: 0.5, snow: 0.25 },
  { dpr: 1, fx: 0.25, crowd: 0.34, snow: 0 },
];
const SLOW = 1 / 45; // an average frame longer than this is too slow...
const DOWN_AFTER = 2; // ...for this many seconds: one step down
const FAST = 1 / 56; // comfortably smooth...
const UP_AFTER = 12; // ...for this long: try one step up

export class Quality {
  constructor(store = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.store = store;
    let saved = null;
    try { saved = store && JSON.parse(store.getItem(KEY) || 'null'); } catch { /* storage off */ }
    this.level = saved && Number.isInteger(saved.level) ? Math.max(0, Math.min(STEPS.length - 1, saved.level)) : 0;
    this.floor = saved && Number.isInteger(saved.floor) ? saved.floor : 0; // can't go above this (it was too slow there)
    this.avg = 0; this.slowT = 0; this.fastT = 0; this.lastUp = -1;
  }

  get step() { return STEPS[this.level]; }

  // One frame of a match (dt in seconds). True when the level changed.
  update(dt, now) {
    if (!(dt > 0) || dt > 0.25) { this.slowT = this.fastT = 0; return false; }
    this.avg = this.avg ? this.avg * 0.95 + dt * 0.05 : dt;
    this.slowT = this.avg > SLOW ? this.slowT + dt : 0;
    this.fastT = this.avg < FAST ? this.fastT + dt : 0;
    if (this.slowT > DOWN_AFTER && this.level < STEPS.length - 1) {
      // too slow soon after stepping up: that level is out of reach on this device
      if (this.lastUp >= 0 && now - this.lastUp < 20) this.floor = Math.max(this.floor, this.level + 1);
      return this.set(this.level + 1);
    }
    if (this.fastT > UP_AFTER && this.level > this.floor) { this.lastUp = now; return this.set(this.level - 1); }
    return false;
  }

  set(level) {
    this.level = level; this.slowT = this.fastT = 0; this.avg = 1 / 60;
    try { this.store && this.store.setItem(KEY, JSON.stringify({ level, floor: this.floor })); } catch { /* storage off */ }
    return true;
  }
}
