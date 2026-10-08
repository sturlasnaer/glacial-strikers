// Ghost runs: a drill run recorded as the skater's path, to race later (your own best, or
// the week's best from the online board). 15 samples a second, packed as base64: the start
// position (two 16-bit numbers), then three bytes a sample: the step in x and y (signed)
// and the facing (0-255 for a full turn).

export const GHOST_HZ = 15;
const TURN = Math.PI * 2;

export class GhostRecorder {
  constructor() { this.samples = []; this.next = 0; }
  // called every frame while the run is on; t is the run's clock
  update(t, s) {
    while (t >= this.next) { this.samples.push([s.x, s.y, s.face]); this.next += 1 / GHOST_HZ; }
  }
  encode() {
    const n = this.samples.length;
    if (!n) return '';
    const bytes = new Uint8Array(4 + n * 3);
    const dv = new DataView(bytes.buffer);
    let [px, py] = this.samples[0].map(Math.round);
    dv.setInt16(0, px, true); dv.setInt16(2, py, true);
    this.samples.forEach(([x, y, face], i) => {
      const dx = Math.max(-127, Math.min(127, Math.round(x) - px)), dy = Math.max(-127, Math.min(127, Math.round(y) - py));
      px += dx; py += dy; // (steps are clamped, so the path never drifts from what was stored)
      dv.setInt8(4 + i * 3, dx); dv.setInt8(5 + i * 3, dy);
      bytes[6 + i * 3] = Math.round((((face % TURN) + TURN) % TURN) / TURN * 256) & 255;
    });
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
}

// Unpack a path into samples [{x, y, face}], or null if it isn't one.
export function decodeGhost(path) {
  let bin;
  try { bin = atob(path); } catch { return null; }
  if (bin.length < 7 || (bin.length - 4) % 3) return null;
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const dv = new DataView(bytes.buffer);
  let x = dv.getInt16(0, true), y = dv.getInt16(2, true);
  const out = [];
  for (let i = 4; i < bytes.length; i += 3) {
    x += dv.getInt8(i); y += dv.getInt8(i + 1);
    out.push({ x, y, face: bytes[i + 2] / 256 * TURN });
  }
  return out;
}

// Where the ghost is at time t: position eased between samples, its speed and facing.
export function ghostAt(samples, t) {
  const f = Math.max(0, t * GHOST_HZ);
  const i = Math.min(samples.length - 1, Math.floor(f));
  const a = samples[i], b = samples[Math.min(samples.length - 1, i + 1)];
  const k = Math.min(1, f - i);
  const dx = b.x - a.x, dy = b.y - a.y;
  return { x: a.x + dx * k, y: a.y + dy * k, face: k < 0.5 ? a.face : b.face, speed: Math.hypot(dx, dy) * GHOST_HZ, done: f >= samples.length - 1 };
}
