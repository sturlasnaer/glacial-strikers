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
  frame(ids, has) { return machineFrame(ids, this.pos(), this.t, has); }
}

// The frame for a heading: the nearest of eight once the diagonals are drawn (Batch CE; has(id)
// says whether a frame exists), else the nearest of the four.
const DIRS8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
function machineFrame(ids, p, t, has) {
  const phase = Math.floor(t * 2) % 2;
  if (has) {
    const dir = DIRS8[(Math.round(Math.atan2(p.dy, p.dx) / (Math.PI / 4)) + 8) % 8];
    const id = ids[0].replace(/\/east\/phase_\d$/, `/${dir}/phase_${phase + 1}`);
    if (id !== ids[0] && has(id)) return id;
  }
  const dir = Math.abs(p.dx) >= Math.abs(p.dy) ? (p.dx > 0 ? 'east' : 'west') : (p.dy > 0 ? 'south' : 'north');
  return ids[DIRS.indexOf(dir) + phase * 4];
}

// The resurfacer in the player's hands (Training › Resurfacer): it heads where the stick points,
// turning like a machine rather than a skater, and stays between the goal lines (the nets are
// in the way beyond them). Its fresh ice stays (persist): the drill counts it.
export const DRIVE = { X: 560, Y0: -240, Y1: 275, R: 120, SWEEP: 32, SPEED: 240, FAST: 300, TURN: 3, TURN_FAST: 2 };
export class DrivenResurfacer {
  constructor() {
    this.x = -DRIVE.X + 40; this.y = 0; this.heading = 0; this.speed = 0;
    this.t = 0; this.wheelT = 0;
    this.trail = []; // { x, y, t } screen points of fresh ice
    this.persist = true;
  }
  pos() { return { x: this.x, y: this.y, dx: Math.cos(this.heading), dy: Math.sin(this.heading) }; }
  frame(ids, has) { return machineFrame(ids, this.pos(), this.wheelT, has); }
  // mx, my: the stick; fast: SPRINT (quicker, but it turns wider)
  drive(dt, mx, my, fast) {
    this.t += dt;
    const push = Math.min(1, Math.hypot(mx, my));
    if (push > 0.25) {
      const want = Math.atan2(my, mx);
      let d = want - this.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const turn = (fast ? DRIVE.TURN_FAST : DRIVE.TURN) * dt;
      this.heading += Math.max(-turn, Math.min(turn, d));
      const top = (fast ? DRIVE.FAST : DRIVE.SPEED) * push;
      this.speed = Math.min(top, this.speed + 500 * dt);
    } else this.speed = Math.max(0, this.speed - 600 * dt);
    if (this.speed > 0) {
      this.wheelT += dt;
      const c = clampDrive(this.x + Math.cos(this.heading) * this.speed * dt, this.y + Math.sin(this.heading) * this.speed * dt);
      this.x = c.x; this.y = c.y;
    }
    const s = toScreen(this.x, this.y);
    const last = this.trail[this.trail.length - 1];
    if (this.speed > 0 && (!last || Math.hypot(s.x - last.x, s.y - last.y) > 6)) this.trail.push({ x: s.x, y: s.y, t: this.t });
  }
}

// Keep a point inside the drive area: a rectangle with rounded corners.
export function clampDrive(x, y) {
  const { X, Y0, Y1, R } = DRIVE;
  x = Math.max(-X, Math.min(X, x)); y = Math.max(Y0, Math.min(Y1, y));
  const cx = Math.sign(x) * (X - R), cy = y < Y0 + R ? Y0 + R : y > Y1 - R ? Y1 - R : null;
  if (cy !== null && Math.abs(x) > X - R) {
    const d = Math.hypot(x - cx, y - cy);
    if (d > R) { x = cx + ((x - cx) / d) * R; y = cy + ((y - cy) / d) * R; }
  }
  return { x, y };
}
