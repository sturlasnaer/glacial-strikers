// Loads the atlas pages, draws frames, recolours rival jerseys, makes UI icons.
//
// The 'home' and 'away' pages load at startup. Each rival roster has its own pages, and
// the arenas, locker room and cut-in banners are separate images; those load in the
// background after startup, and ensureTeam() waits for whatever a match needs.

import { TEAMS } from './data.js';

const BASE = new URL('assets/', document.baseURI).href;
const INLINE = typeof window !== 'undefined' && window.__INLINE; // single-file offline build

export const Assets = {
  atlas: null,
  pages: [], // HTMLImageElement | HTMLCanvasElement per page (undefined until loaded)
  backdrop: null,
  backdrops: new Map(), // arena key -> image
  recolored: new Map(), // teamId -> { pages, loaded } with the away and rival pages swapped
  iconCache: new Map(),
  bannerCache: new Map(),
  loading: new Map(), // file -> Promise<image>
  images: new Map(), // file -> image

  url(file) { return INLINE ? INLINE[file] : BASE + file; },

  async load(onProgress) {
    const atlas = INLINE ? INLINE['gfx/atlas.json'] : await (await fetch(BASE + 'gfx/atlas.json')).json();
    this.atlas = atlas;
    this.pages = new Array(atlas.pages.length);
    const core = atlas.pages.map((p, i) => i).filter((i) => atlas.pages[i].group === 'home' || atlas.pages[i].group === 'away');
    const files = [...core.map((i) => atlas.pages[i].file), 'gfx/rink_backdrop.webp'];
    let done = 0;
    const imgs = await Promise.all(files.map((f) => this.image(f).then((img) => {
      done++; onProgress?.(done / files.length);
      return img;
    })));
    this.backdrop = imgs.pop();
    this.backdrops.set('home', this.backdrop);
    core.forEach((pi, k) => { this.pages[pi] = imgs[k]; });
  },

  image(file) {
    if (!this.loading.has(file)) {
      this.loading.set(file, loadImage(this.url(file)).then((img) => { this.images.set(file, img); return img; }));
    }
    return this.loading.get(file);
  },

  async loadGroup(group) {
    await Promise.all(this.atlas.pages.map((p, i) => (p.group !== group || this.pages[i] ? null
      : this.image(p.file).then((img) => { this.pages[i] = img; }))));
  },

  // Everything a match or scene with this rival needs: roster pages, arena, banners.
  async ensureTeam(teamId, arena) {
    const t = TEAMS[teamId];
    const jobs = [];
    if (t && t.art) jobs.push(this.loadGroup('rival_' + t.art));
    if (arena && arena !== 'home') jobs.push(this.ensureArena(arena));
    await Promise.all(jobs).catch(() => {});
    if (t) this.prepareTeam(t);
  },

  async ensureArena(key) {
    const file = this.atlas.arenas && this.atlas.arenas[key];
    if (!file || this.backdrops.has(key)) return;
    this.backdrops.set(key, await this.image(file));
  },

  backdropFor(key) { return this.backdrops.get(key) || this.backdrop; },

  // Fetch the rest in the background, one file at a time, so play isn't slowed.
  async prefetch() {
    const a = this.atlas;
    const files = [
      ...a.pages.filter((p, i) => !this.pages[i]).map((p) => p.file),
      a.locker, ...Object.values(a.arenas || {}), ...Object.values(a.banners || {}),
    ].filter(Boolean);
    for (const f of files) {
      try {
        const img = await this.image(f);
        a.pages.forEach((p, i) => { if (p.file === f) this.pages[i] = img; });
        for (const [k, v] of Object.entries(a.arenas || {})) if (v === f) this.backdrops.set(k, img);
      } catch { /* offline and not cached: fine, it loads when needed */ }
    }
  },

  frame(id) { return this.atlas.frames[id]; },

  // pages to use for a given team palette (null = original art)
  pagesFor(teamId) {
    if (!teamId) return this.pages;
    const r = this.recolored.get(teamId);
    return r ? r.pages : this.pages;
  },

  // Recolour the away pages and this rival's roster pages into the team's colours.
  prepareTeam(team) {
    const own = (g) => g === 'away' || (team.art && g === 'rival_' + team.art);
    const loaded = this.pages.filter((img, i) => img && own(this.atlas.pages[i].group)).length;
    const r = this.recolored.get(team.id);
    if (r && r.loaded === loaded) return;
    if (!team.recolor) { this.recolored.delete(team.id); return; }
    const pages = this.pages.map((img, i) => {
      if (!img || !own(this.atlas.pages[i].group)) return img;
      const prev = r && r.pages[i];
      return prev && prev !== img ? prev : recolorPage(img, team.recolor);
    });
    this.recolored.set(team.id, { pages, loaded });
    for (const k of [...this.iconCache.keys()]) if (k.includes(`|${team.id}|`)) this.iconCache.delete(k);
  },

  // Cut-in banner image URL for a character key ('nix', 'ember_comets_c', ...), in the
  // team's colours. Returns null until the image has loaded.
  banner(key, teamId) {
    const file = this.atlas.banners && this.atlas.banners[key];
    if (!file) return null;
    const ck = key + '|' + (teamId || '');
    if (this.bannerCache.has(ck)) return this.bannerCache.get(ck);
    const img = this.images.get(file);
    if (!img) { this.image(file).catch(() => {}); return null; }
    const t = teamId && TEAMS[teamId];
    let url = this.url(file);
    if (t && t.recolor) url = recolorPage(img, t.recolor).toDataURL('image/jpeg', 0.88);
    this.bannerCache.set(ck, url);
    return url;
  },

  async ensureBanners(keys) { await Promise.all(keys.map((k) => this.atlas.banners && this.atlas.banners[k] && this.image(this.atlas.banners[k]).catch(() => {}))); },

  // Draw a frame with its pivot at (x, y). scale = world px per *source* px.
  draw(ctx, id, x, y, scale, opts = {}) {
    const f = this.atlas.frames[id];
    if (!f) return;
    const [pi, fx, fy, fw, fh, px, py, s] = f;
    const pages = opts.pages || this.pages;
    if (!pages[pi]) return;
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
    if (!f || !(pages || this.pages)[f[0]]) return;
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
    const page = this.pagesFor(teamId)[pi];
    if (!page) return '';
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    let sx = fx, sy = fy, sw = fw, sh = fh;
    if (opts.crop === 'head') { sh = Math.round(fh * 0.55); }
    const k = size / Math.max(sw, sh);
    if (opts.flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.drawImage(page, sx, sy, sw, sh, (size - sw * k) / 2, (size - sh * k) / 2, sw * k, sh * k);
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
