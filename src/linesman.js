// The linesman (Batch AG), only for the look: nothing in a match depends on him. He holds
// the puck at the dot and drops it, skates clear to the far boards and follows play along
// them, and makes the calls: an arm up for a penalty, a point at the net for a goal, and a
// duck when a puck comes his way.
import { RINK } from './rink.js';

export const DROP = 1.1; // when the puck hits the ice (Match.updateFaceoff)
const LINE_Y = RINK.minY + 24; // along the far boards
const BEHIND = -16; // just behind the dot

export class Linesman {
  constructor() {
    this.x = 0; this.y = BEHIND; this.vx = 0; this.vy = 0;
    this.side = 1; // which way he skates clear
    this.duckT = 0; this.t = 0; this.faceoffs = 0;
  }

  update(dt, m) {
    this.t += dt;
    this.duckT = Math.max(0, this.duckT - dt);
    const p = m.puck, st = m.state;
    if (st === 'intro' || (st === 'faceoff' && m.stateT < DROP)) {
      if (this.mode !== 'dot') { this.side = this.faceoffs++ % 2 ? -1 : 1; this.mode = 'dot'; }
      this.x = p.x; this.y = BEHIND; this.vx = this.vy = 0;
      return;
    }
    if (st === 'faceoff' || this.mode === 'dot' || this.mode === 'clear') {
      // the puck's down: off to the far boards, out of the way
      this.mode = Math.abs(this.y - LINE_Y) < 6 ? 'follow' : 'clear';
      if (this.mode === 'clear') return this.skateTo(dt, this.x + this.side * 30, LINE_Y, 300);
    }
    if (st === 'play') {
      // a puck flying past: duck
      const sp = Math.hypot(p.vx, p.vy);
      if (!p.owner && sp > 380 && Math.hypot(p.x - this.x, p.y - this.y) < 54) this.duckT = 0.55;
    }
    // follow play along the boards, a little behind the puck
    const tx = Math.max(RINK.minX + 220, Math.min(RINK.maxX - 220, p.x * 0.7));
    this.skateTo(dt, st === 'play' ? tx : this.x, LINE_Y, 240);
  }

  skateTo(dt, tx, ty, max) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    const want = d < 4 ? 0 : Math.min(max, d * 3);
    const ax = d ? (dx / d) * want : 0, ay = d ? (dy / d) * want : 0;
    const k = Math.min(1, dt * 5);
    this.vx += (ax - this.vx) * k; this.vy += (ay - this.vy) * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
  }

  // Holding the puck (the art draws it, so the game's puck stays hidden).
  holding(m) { return m.state === 'intro' || (m.state === 'faceoff' && m.stateT < DROP - 0.2); }

  // The frame to draw: { id, flip }, or null without the art. L is the atlas's linesman map.
  frame(m, L) {
    if (!L) return null;
    const p = m.puck, st = m.state, beat = (n, fps) => Math.floor(this.t * fps) % n;
    if (st === 'intro' || (st === 'faceoff' && m.stateT < DROP - 0.5)) return { id: L.faceoff.ready[beat(2, 2)], flip: false };
    if (st === 'faceoff' && m.stateT < DROP + 0.15) {
      const i = m.stateT < DROP - 0.35 ? 0 : m.stateT < DROP - 0.2 ? 1 : 2; // crouched, the release, arms back
      return { id: L.faceoff.drop[i], flip: false };
    }
    if (st === 'penalty') return { id: L.calls.penalty[beat(2, 3)], flip: false };
    if (st === 'goal' && m.stateT < 2.6) return { id: L.calls.goal, flip: p.x < this.x }; // pointing at the net
    if (this.duckT > 0) return { id: L.calls.duck, flip: false };
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 40) {
      if (Math.abs(this.vy) > Math.abs(this.vx) * 1.4) return { id: L.glides[this.vy < 0 ? 'north' : 'south'].frame, flip: false };
      return { id: L.stride.frames[beat(4, 3 + sp / 60)], flip: this.vx < 0 };
    }
    return { id: L.calls.watch[beat(2, 1.5)], flip: p.x < this.x };
  }
}
