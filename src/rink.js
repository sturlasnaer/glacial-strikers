// Rink geometry, measured from rink_backdrop.png (1536x1024).
//
// World space is the ice floor: x is horizontal distance from the centre line in
// centre-line pixels, y is vertical backdrop pixels from the centre dot. The painted rink
// has mild perspective (the far boards are ~5% narrower), so x is scaled by persp(y) when
// projecting to the backdrop. Physics runs in world space; only drawing uses toScreen().

import { clamp } from './util.js';

export const BACKDROP = { w: 1536, h: 1024, cx: 768, cy: 484 };

export const RINK = {
  minX: -711, maxX: 711, // inner face of the end boards at the centre row
  minY: -277, maxY: 318, // far boards / near boards (glass base)
  r: 150, // corner radius
};

export const GOAL_X = 633; // goal line distance from centre
export const MOUTH = 38; // half width of the goal mouth
export const NET_DEPTH = 40;
export const POST_R = 4;
export const CROSSBAR = 40; // net height (a puck above this clears the net)
export const BLUE_X = 227;
export const CREASE = { rx: 80, ry: 70 };
// Neutral-zone faceoff dots painted on the backdrop.
export const DOTS = [
  { x: -180, y: -157 }, { x: -180, y: 168 }, { x: 180, y: -157 }, { x: 180, y: 168 },
];

export const persp = (y) => 1 + y * 0.000113;

export function toScreen(x, y, z = 0) {
  return { x: BACKDROP.cx + x * persp(y), y: BACKDROP.cy + y - z * 0.85 };
}

export function fromScreen(sx, sy) {
  const y = sy - BACKDROP.cy;
  return { x: (sx - BACKDROP.cx) / persp(y), y };
}

// Keep a circle of radius rad inside the rounded-rect rink.
// Returns the outward normal of the board it touched, or null.
export function constrainToRink(p, rad) {
  const R = RINK.r;
  const x0 = RINK.minX + R, x1 = RINK.maxX - R, y0 = RINK.minY + R, y1 = RINK.maxY - R;
  const cx = clamp(p.x, x0, x1), cy = clamp(p.y, y0, y1);
  const dx = p.x - cx, dy = p.y - cy;
  const lim = R - rad;
  const d2 = dx * dx + dy * dy;
  if (d2 <= lim * lim) return null;
  const d = Math.sqrt(d2) || 1;
  const nx = dx / d, ny = dy / d;
  p.x = cx + nx * lim;
  p.y = cy + ny * lim;
  return { nx, ny };
}

// How far inside the rink a point is (negative = outside).
export function insideDepth(x, y) {
  const R = RINK.r;
  const x0 = RINK.minX + R, x1 = RINK.maxX - R, y0 = RINK.minY + R, y1 = RINK.maxY - R;
  const cx = clamp(x, x0, x1), cy = clamp(y, y0, y1);
  return R - Math.hypot(x - cx, y - cy);
}

export function clampInside(x, y, margin) {
  const p = { x, y };
  constrainToRink(p, margin);
  return p;
}

// side: -1 = left net, +1 = right net. Net box lies behind the goal line.
export function netBox(side) {
  const front = side * GOAL_X, back = side * (GOAL_X + NET_DEPTH);
  return { x0: Math.min(front, back), x1: Math.max(front, back), y0: -MOUTH, y1: MOUTH, front, side };
}

// Push a circle out of both nets (solid for skaters on every side).
export function collideNets(p, rad) {
  let hit = null;
  for (const side of [-1, 1]) {
    const b = netBox(side);
    const cx = clamp(p.x, b.x0, b.x1), cy = clamp(p.y, b.y0 - 4, b.y1 + 4);
    const dx = p.x - cx, dy = p.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < rad * rad) {
      let nx, ny, d = Math.sqrt(d2);
      if (d < 1e-4) {
        // centre inside the box: push out through the nearest face
        const opts = [
          { n: [-1, 0], pen: p.x - b.x0 }, { n: [1, 0], pen: b.x1 - p.x },
          { n: [0, -1], pen: p.y - b.y0 }, { n: [0, 1], pen: b.y1 - p.y },
        ].sort((a, c) => a.pen - c.pen)[0];
        [nx, ny] = opts.n;
        p.x += nx * (opts.pen + rad);
        p.y += ny * (opts.pen + rad);
      } else {
        nx = dx / d; ny = dy / d;
        p.x = cx + nx * rad;
        p.y = cy + ny * rad;
      }
      hit = { nx, ny, side };
    }
  }
  return hit;
}

// Twists: arena modifiers that some tournament stages enable.
export function makeTwists(kind) {
  if (kind === 'speed_lanes') {
    return {
      kind,
      lanes: [
        { x0: -420, x1: 420, y: -205, h: 34, dir: 1 },
        { x0: -420, x1: 420, y: 250, h: 34, dir: -1 },
      ],
      cracks: [],
    };
  }
  if (kind === 'cracked_ice') {
    return {
      kind,
      lanes: [],
      cracks: [
        { x: -340, y: -70, r: 70 }, { x: 340, y: 90, r: 70 },
        { x: 0, y: 215, r: 60 }, { x: 0, y: -190, r: 60 },
      ],
    };
  }
  if (kind === 'both') {
    const a = makeTwists('speed_lanes'), b = makeTwists('cracked_ice');
    return { kind, lanes: a.lanes, cracks: b.cracks.slice(0, 2) };
  }
  return { kind: 'none', lanes: [], cracks: [] };
}
