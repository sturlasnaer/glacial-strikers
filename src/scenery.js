// The ice resurfacer's lap on the title screen, before the demo match faces off.
import { toScreen } from './rink.js';

// One clockwise lap (as seen from the camera) inside the boards, in rink units.
const X = 560, Y0 = -205, Y1 = 238, R = 120;
const SEGS = [];
{
  const line = (x0, y0, x1, y1) => SEGS.push({ len: Math.hypot(x1 - x0, y1 - y0), at: (k) => ({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, dx: x1 - x0, dy: y1 - y0 }) });
  const arc = (cx, cy, a0) => SEGS.push({ len: (Math.PI / 2) * R, at: (k) => { const a = a0 + (Math.PI / 2) * k; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), dx: -Math.sin(a), dy: Math.cos(a) }; } });
  line(0, Y0, X - R, Y0); arc(X - R, Y0 + R, -Math.PI / 2);
  line(X, Y0 + R, X, Y1 - R); arc(X - R, Y1 - R, 0);
  line(X - R, Y1, -(X - R), Y1); arc(-(X - R), Y1 - R, Math.PI / 2);
  line(-X, Y1 - R, -X, Y0 + R); arc(-(X - R), Y0 + R, Math.PI);
  line(-(X - R), Y0, 0, Y0);
}
const LAP = SEGS.reduce((a, s) => a + s.len, 0);
const SPEED = 250;
const DIRS = ['east', 'south', 'west', 'north'];

export class ResurfacerLap {
  constructor() {
    this.d = 0;
    this.t = 0;
    this.trail = []; // { x, y, t } screen points of fresh ice
  }
  get done() { return this.d >= LAP; }
  update(dt) {
    this.t += dt;
    this.d = Math.min(LAP, this.d + SPEED * dt);
    const p = this.pos();
    const s = toScreen(p.x, p.y);
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(s.x - last.x, s.y - last.y) > 8) this.trail.push({ x: s.x, y: s.y, t: this.t });
  }
  pos() {
    let d = this.d;
    for (const seg of SEGS) {
      if (d <= seg.len) return seg.at(d / seg.len);
      d -= seg.len;
    }
    return SEGS[SEGS.length - 1].at(1);
  }
  // atlas frame for the machine's heading, wheels turning at 2 frames a second
  frame(ids) {
    const p = this.pos();
    const dir = Math.abs(p.dx) >= Math.abs(p.dy) ? (p.dx > 0 ? 'east' : 'west') : (p.dy > 0 ? 'south' : 'north');
    return ids[DIRS.indexOf(dir) + (Math.floor(this.t * 2) % 2) * 4];
  }
}
