// Loads the atlas pages, draws frames, recolours rival jerseys, makes UI icons.

const BASE = new URL('assets/', document.baseURI).href;

export const Assets = {
  atlas: null,
  pages: [], // HTMLImageElement | HTMLCanvasElement per page
  backdrop: null,
  recolored: new Map(), // teamId -> array of page canvases (away pages swapped)
  iconCache: new Map(),

  async load(onProgress) {
    // the single-file offline build embeds everything in window.__INLINE
    const INLINE = typeof window !== 'undefined' && window.__INLINE;
    const atlas = INLINE ? INLINE['gfx/atlas.json'] : await (await fetch(BASE + 'gfx/atlas.json')).json();
    this.atlas = atlas;
    const files = [...atlas.pages.map((p) => p.file), 'gfx/rink_backdrop.webp'];
    let done = 0;
    const imgs = await Promise.all(files.map((f) => loadImage(INLINE ? INLINE[f] : BASE + f).then((img) => {
      done++; onProgress?.(done / files.length);
      return img;
    })));
    this.backdrop = imgs.pop();
    this.pages = imgs;
  },

  frame(id) { return this.atlas.frames[id]; },

  // pages to use for a given team palette (null = original art)
  pagesFor(teamId) {
    if (!teamId) return this.pages;
    return this.recolored.get(teamId) || this.pages;
  },

  prepareTeam(team) {
    if (!team.recolor || this.recolored.has(team.id)) return;
    const pages = this.pages.map((img, i) => {
      if (this.atlas.pages[i].group !== 'away') return img;
      return recolorPage(img, team.recolor);
    });
    this.recolored.set(team.id, pages);
  },

  // Draw a frame with its pivot at (x, y). scale = world px per *source* px.
  draw(ctx, id, x, y, scale, opts = {}) {
    const f = this.atlas.frames[id];
    if (!f) return;
    const [pi, fx, fy, fw, fh, px, py, s] = f;
    const pages = opts.pages || this.pages;
    const k = scale / s;
    ctx.save();
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot);
    ctx.scale(opts.flip ? -k : k, (opts.squash || 1) * k);
    if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
    if (opts.blend) ctx.globalCompositeOperation = opts.blend;
    ctx.drawImage(pages[pi], fx, fy, fw, fh, -px, -py, fw, fh);
    ctx.restore();
  },

  // Draw a frame centred and fitted inside a box (UI use).
  drawFit(ctx, id, cx, cy, size, pages) {
    const f = this.atlas.frames[id];
    if (!f) return;
    const [pi, fx, fy, fw, fh] = f;
    const k = size / Math.max(fw, fh);
    ctx.drawImage((pages || this.pages)[pi], fx, fy, fw, fh, cx - (fw * k) / 2, cy - (fh * k) / 2, fw * k, fh * k);
  },

  // Data URL of a frame fitted in a square, for <img> tags in menus.
  icon(id, size = 96, teamId = null, opts = {}) {
    const key = `${id}|${size}|${teamId}|${opts.flip ? 1 : 0}|${opts.crop || ''}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const f = this.atlas.frames[id];
    if (!f) return '';
    const [pi, fx, fy, fw, fh] = f;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    let sx = fx, sy = fy, sw = fw, sh = fh;
    if (opts.crop === 'head') { sh = Math.round(fh * 0.55); }
    const k = size / Math.max(sw, sh);
    if (opts.flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.drawImage(this.pagesFor(teamId)[pi], sx, sy, sw, sh, (size - sw * k) / 2, (size - sh * k) / 2, sw * k, sh * k);
    const url = c.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  },
};

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not load ' + src));
    img.src = src;
  });
}

// Shift the coral (primary) and violet (secondary) jersey colours of the away art.
// recolor: { h1, h2, sat, val } — target hues in degrees, saturation/value multipliers.
function recolorPage(img, rc) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const h1 = rc.h1 / 360, h2 = (rc.h2 ?? rc.h1) / 360;
  const sm = rc.sat ?? 1, vm = rc.val ?? 1;
  const sm2 = rc.sat2 ?? sm, vm2 = rc.val2 ?? vm;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    if (dl < 0.08 || mx < 0.12) continue;
    const s = dl / mx;
    let h;
    if (mx === r) h = ((g - b) / dl + 6) % 6;
    else if (mx === g) h = (b - r) / dl + 2;
    else h = (r - g) / dl + 4;
    h *= 60;
    let nh, ns, nv;
    if ((h >= 328 || h < 9) && s > 0.42 && mx > 0.45) { nh = h1; ns = s * sm; nv = mx * vm; }
    else if (h >= 256 && h < 312 && s > 0.25) { nh = h2; ns = s * sm2; nv = mx * vm2; }
    else continue;
    // keep each pixel's shading offset relative to the base hue band
    const [nr, ng, nb] = hsv2rgb(nh, Math.min(1, ns), Math.min(1, nv));
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function hsv2rgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (((i % 6) + 6) % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return [r * 255, g * 255, b * 255];
}
