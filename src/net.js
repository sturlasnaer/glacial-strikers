// Hockey nets drawn as pixel art for this rink's side-on camera.
//
// The sprite pack's nets are drawn for a camera facing the mouth, but the end goals here
// are seen from the side. These nets are rasterized into small canvases (1 net pixel =
// 2 backdrop pixels) and scaled up without smoothing, so they match the chunky art.
// Each net has a back layer (far side, back mesh, base, far post) and a front layer
// (roof, near side, crossbar, near post), so the puck can sit inside the net and the
// goalie stands in front of it. A goal makes the mesh ripple.

import { toScreen, GOAL_X, MOUTH, NET_DEPTH, CROSSBAR } from './rink.js';

const PX = 2; // backdrop pixels per net pixel
const NAVY = [20, 35, 59, 255];
const RED = [232, 50, 60, 255];
const RED_HI = [255, 138, 138, 255];
const RED_DK = [150, 24, 44, 255];
const MESH = [255, 255, 255, 255];
const MESH_DIM = [176, 205, 230, 230];
const MESH_FILL = [226, 242, 255, 120];
const MESH_FILL_BACK = [170, 200, 228, 110];
const SHADOW = [20, 35, 59, 70];

export class NetRenderer {
  constructor() {
    this.cache = new Map(); // side -> { back, front, x, y, ripple key }
    this.ripples = { '-1': null, '1': null };
  }

  ripple(side, y, power = 1) {
    this.ripples[side] = { t: 0, y, amp: 7 * power };
  }

  update(dt) {
    for (const k of ['-1', '1']) {
      const r = this.ripples[k];
      if (r) { r.t += dt; if (r.t > 1.4) this.ripples[k] = null; }
    }
  }

  // Draw one layer ('back' | 'front') of the net on `side` in backdrop space.
  draw(ctx, side, layer) {
    const n = this.build(side);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(n[layer], n.x, n.y, n[layer].width * PX, n[layer].height * PX);
    ctx.restore();
  }

  build(side) {
    const r = this.ripples[side];
    // quantize ripple time so the canvas only re-renders ~30x a second while rippling
    const key = r ? Math.round(r.t * 30) : -1;
    const c = this.cache.get(side);
    if (c && c.key === key) return c;
    const out = rasterize(side, r);
    out.key = key;
    this.cache.set(side, out);
    return out;
  }
}

function rasterize(side, ripple) {
  const s = side;
  const gx = s * GOAL_X;
  const M = MOUTH, D = NET_DEPTH, H = CROSSBAR;
  const bulge = (y, depthFrac) => {
    if (!ripple) return 0;
    const k = Math.exp(-ripple.t * 3.2) * Math.sin(ripple.t * 26);
    const fall = Math.exp(-((y - ripple.y) ** 2) / (2 * 22 * 22));
    return ripple.amp * k * fall * depthFrac;
  };
  // 3D net-local points
  const P = (x, y, z) => ({ x, y, z });
  const post = (y, z) => P(gx, y, z);
  const rearTop = (y) => P(gx + s * (D * 0.5 + bulge(y, 0.6)), y * 0.86, H * 0.8);
  const baseBack = (y) => P(gx + s * (D + bulge(y, 1)), y * 0.72, 0);
  // base side curve from a post foot back to the rear base corner
  const baseSide = (sign, t) => {
    const a = { x: gx, y: sign * M }, ctl = { x: gx + s * D * 0.95, y: sign * M * 0.98 }, b = { x: gx + s * (D + bulge(sign * M * 0.72, 1)), y: sign * M * 0.72 };
    const u = 1 - t;
    return P(u * u * a.x + 2 * u * t * ctl.x + t * t * b.x, u * u * a.y + 2 * u * t * ctl.y + t * t * b.y, 0);
  };

  // screen-space bounds (backdrop px)
  const pts = [];
  for (const y of [-M, M]) for (const z of [0, H]) pts.push(toScreen(gx, y, z));
  for (const y of [-M, M]) { pts.push(toScreen(gx + s * (D + 10), y, 0)); pts.push(toScreen(gx + s * (D * 0.5 + 8), y, H)); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  x0 = Math.floor(x0 / PX) * PX - 6 * PX; y0 = Math.floor(y0 / PX) * PX - 6 * PX;
  const W = Math.ceil((x1 - x0) / PX) + 12, Hh = Math.ceil((y1 - y0) / PX) + 12;
  const proj = (p) => { const q = toScreen(p.x, p.y, p.z); return [Math.round((q.x - x0) / PX), Math.round((q.y - y0) / PX)]; };

  const back = new Raster(W, Hh), front = new Raster(W, Hh);

  // ---- back layer
  // shadow on the ice
  back.poly([proj(post(-M, 0)), proj(post(M, 0)), proj(baseSide(1, 1)), proj(baseBack(0)), proj(baseSide(-1, 1))].map(([x, y]) => [x - s * 1, y + 2]), SHADOW);
  // far side panel (y = -M)
  const farPanel = [proj(post(-M, 0)), proj(post(-M, H)), proj(rearTop(-M)), proj(baseBack(-M))];
  back.poly(farPanel, MESH_FILL_BACK);
  meshQuad(back, post(-M, 0), post(-M, H), rearTop(-M), baseBack(-M), proj, MESH_DIM, 5, 4);
  // back panel (rear top bar down to the base)
  back.poly([proj(rearTop(-M)), proj(rearTop(M)), proj(baseBack(M)), proj(baseBack(-M))], MESH_FILL_BACK);
  meshQuad(back, rearTop(-M), rearTop(M), baseBack(M), baseBack(-M), proj, MESH_DIM, 10, 3, true);
  // base pipe on the ice
  pipe(back, curvePts(baseSide, -1, proj), RED_DK);
  pipe(back, [proj(baseBack(-M)), proj(baseBack(M))], RED_DK);
  // far post
  pipe(back, [proj(post(-M, 0)), proj(post(-M, H))], RED);

  // ---- front layer
  // roof (crossbar back to the rear top bar)
  front.poly([proj(post(-M, H)), proj(post(M, H)), proj(rearTop(M)), proj(rearTop(-M))], MESH_FILL);
  meshQuad(front, post(-M, H), post(M, H), rearTop(M), rearTop(-M), proj, MESH, 10, 3, true);
  // near side panel (y = +M)
  front.poly([proj(post(M, 0)), proj(post(M, H)), proj(rearTop(M)), proj(baseBack(M))], MESH_FILL);
  meshQuad(front, post(M, 0), post(M, H), rearTop(M), baseBack(M), proj, MESH, 5, 4);
  // navy silhouette edges, like the sprite outlines
  front.line(...proj(rearTop(M)), ...proj(baseBack(M)), NAVY);
  front.line(...proj(rearTop(-M)), ...proj(rearTop(M)), NAVY);
  back.line(...proj(rearTop(-M)), ...proj(baseBack(-M)), NAVY);
  // frame
  pipe(front, curvePts(baseSide, 1, proj), RED);
  pipe(front, [proj(rearTop(-M)), proj(rearTop(M))], RED_DK);
  pipe(front, [proj(post(-M, H)), proj(post(M, H))], RED, true);
  pipe(front, [proj(post(M, 0)), proj(post(M, H))], RED, true);

  return { back: back.canvas(), front: front.canvas(), x: x0, y: y0 };
}

function curvePts(fn, sign, proj) {
  const out = [];
  for (let i = 0; i <= 8; i++) out.push(proj(fn(sign, i / 8)));
  return out;
}

// Mesh lines across a quad (a-b top edge, d-c bottom edge), nu x nv cells.
function meshQuad(r, a, b, c, d, proj, color, nu, nv, swap) {
  const lerp3 = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
  const [A, B, C, Dd] = swap ? [a, b, c, d] : [a, b, c, d];
  for (let i = 0; i <= nu; i++) {
    const t = i / nu;
    r.line(...proj(lerp3(A, B, t)), ...proj(lerp3(Dd, C, t)), color);
  }
  for (let j = 0; j <= nv; j++) {
    const t = j / nv;
    r.line(...proj(lerp3(A, Dd, t)), ...proj(lerp3(B, C, t)), color);
  }
}

// A 2px red pipe with a navy outline and a highlight.
function pipe(r, pts, color, highlight) {
  for (let i = 1; i < pts.length; i++) r.thick(...pts[i - 1], ...pts[i], NAVY, 2);
  for (let i = 1; i < pts.length; i++) r.thick(...pts[i - 1], ...pts[i], color, 1);
  if (highlight) for (let i = 1; i < pts.length; i++) r.line(pts[i - 1][0], pts[i - 1][1] - 1, pts[i][0], pts[i][1] - 1, RED_HI);
}

class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  px(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.data;
    const a = c[3] / 255;
    if (a >= 1) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return; }
    const da = d[i + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    d[i] = (c[0] * a + d[i] * da * (1 - a)) / oa;
    d[i + 1] = (c[1] * a + d[i + 1] * da * (1 - a)) / oa;
    d[i + 2] = (c[2] * a + d[i + 2] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  thick(x0, y0, x1, y1, c, r) {
    for (let ox = -r; ox <= r; ox++) for (let oy = -r; oy <= r; oy++) {
      if (Math.abs(ox) + Math.abs(oy) > r) continue;
      this.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, c);
    }
  }
  // scanline polygon fill
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.max(0, minY); y <= Math.min(this.h - 1, maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) this.px(x, y, c);
    }
  }
  canvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    cv.getContext('2d').putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return cv;
  }
}
