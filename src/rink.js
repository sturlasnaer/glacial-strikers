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

// Twists: arena rules. Rivals' buildings have their own (meltwater, aurora lanes, pond
// cracks, rumble strips, shadow zones, and the expansion clubs' moonbeams and loose planks);
// the old stage twists (speed lanes, cracked ice) remain for the Frostline rink.
// Dynamic twists are updated by Match.updateTwists.
// The Glacier Cave's icicles: the shadow's warning (s), the reach of the impact, a chunk's
// radius, and how many chunks lie on the ice at once (the oldest melts into the ice for a new one).
export const ICICLE = { warn: 1.6, r: 34, chunk: 15, max: 3 };
// The Summit Rink's thin air: the puck glides further (its friction times glide), shots fly
// faster, and skaters tire sooner (sprinting drains faster, stamina comes back slower).
export const THIN_AIR = { glide: 0.6, shot: 1.08, drain: 1.25, regen: 0.85 };
export const AURORA_ROWS = [-215, -120, 125, 245];
const lane = (y, dir) => ({ x0: -440, x1: 440, y, h: 34, dir });

export function makeTwists(kind, rng = Math.random) {
  const pick = (n) => Math.floor(rng() * n);
  const base = { kind, lanes: [], cracks: [], pools: [], strips: [], shadows: [], planks: [], beam: null, t: 0 };
  if (kind === 'speed_lanes') return { ...base, lanes: [lane(-205, 1), lane(250, -1)] };
  if (kind === 'cracked_ice') {
    return { ...base, cracks: [{ x: -340, y: -70, r: 70 }, { x: 340, y: 90, r: 70 }, { x: 0, y: 215, r: 60 }, { x: 0, y: -190, r: 60 }] };
  }
  if (kind === 'both') {
    const a = makeTwists('speed_lanes'), b = makeTwists('cracked_ice');
    return { ...base, lanes: a.lanes, cracks: b.cracks.slice(0, 2) };
  }
  if (kind === 'meltwater') {
    // slush pools drifting around anchors away from the creases
    const anchors = [[-390, -110], [-130, 175], [170, -165], [410, 110]];
    return {
      ...base,
      pools: anchors.map(([ax, ay], i) => ({ ax, ay, x: ax, y: ay, rx: 74, ry: 54, orbit: 55 + pick(40), w: (0.12 + rng() * 0.08) * (i % 2 ? 1 : -1), ph: rng() * 6.28 })),
    };
  }
  if (kind === 'aurora_lanes') {
    const rows = auroraRows(rng);
    return { ...base, lanes: rows, next: null, period: 14, phaseT: 0 };
  }
  if (kind === 'rumble_strips') {
    // ridged ice along the far and near boards
    return { ...base, strips: [{ x0: -470, x1: 470, y: -251, h: 26 }, { x0: -470, x1: 470, y: 274, h: 26 }] };
  }
  if (kind === 'shadow_zones') {
    // two ravens circling overhead, each casting a drifting shadow
    const anchors = [[-250, -40], [250, 50]];
    return {
      ...base,
      shadows: anchors.map(([ax, ay], i) => ({ ax, ay, x: ax, y: ay, rx: 118, ry: 72, orbit: 120 + pick(70), w: (0.16 + rng() * 0.08) * (i ? 1 : -1), ph: rng() * 6.28 })),
    };
  }
  if (kind === 'moonbeams') {
    // a pool of moonlight from the telescope, sweeping slowly from end to end and wandering
    // up and down the ice as it goes (the Observatory)
    return { ...base, beam: { x: 0, y: 0, rx: 190, ry: 74, reach: 500, period: 22 + pick(6), ph: rng() * 6.28, drift: 120, dperiod: 13 + pick(5), dph: rng() * 6.28 } };
  }
  if (kind === 'loose_planks') {
    // stretches of the wooden boards that give (the Longhouse): one along the far boards and
    // one along the near boards in each half, and one on each end board behind the nets.
    // a0..a1 run along the board.
    const R = RINK.r, side = (s, dir) => { const c = dir * (140 + rng() * 270); return { side: s, a0: c - 85, a1: c + 85, rattle: 0 }; };
    const end = (s) => { const c = RINK.minY + R + 60 + rng() * (RINK.maxY - RINK.minY - 2 * R - 120); return { side: s, a0: c - 60, a1: c + 60, rattle: 0 }; };
    return { ...base, planks: [side('far', -1), side('far', 1), side('near', -1), side('near', 1), end('left'), end('right')] };
  }
  if (kind === 'sea_breeze') {
    // gusts off the sea down the length of the ice now and then (the Harbour Rink): next is
    // the wait before the first, gust the seconds left of one, dir +1 or -1 (towards which end)
    return { ...base, wind: { next: 7 + rng() * 5, gust: 0, len: 0, dir: 1 } };
  }
  if (kind === 'icicles') {
    // icicles over the Glacier Cave's ice: now and then one drops (its shadow grows first),
    // shatters, and leaves a chunk of ice on the rink till the next faceoff
    return { ...base, ice: { next: 8 + rng() * 4, falls: [], chunks: [] } };
  }
  if (kind === 'thin_air') return { ...base, air: THIN_AIR }; // (the Summit Rink)
  if (kind === 'pond_cracks') {
    // two hairline cracks to start; hits, hard shots and quakes add more
    const cracks = [];
    for (let i = 0; i < 2; i++) cracks.push({ x: (rng() - 0.5) * 700, y: (rng() - 0.5) * 380, r: 30, born: 0 });
    return { ...base, cracks };
  }
  return { ...base, kind: 'none' };
}

export function auroraRows(rng = Math.random) {
  const rows = [...AURORA_ROWS];
  const a = rows.splice(Math.floor(rng() * rows.length), 1)[0];
  const b = rows[Math.floor(rng() * rows.length)];
  return [lane(a, rng() < 0.5 ? 1 : -1), lane(b, rng() < 0.5 ? 1 : -1)];
}
