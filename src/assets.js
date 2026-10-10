// Loads the atlas pages, draws frames, recolours rival jerseys, makes UI icons.
//
// The 'home', 'away' and 'title' pages load at startup. Each rival roster has its own pages,
// the hub's characters and the arena-rule art have theirs ('hub', 'rules'), and the arenas,
// locker room and cut-in banners are separate images; those load when a scene needs them.
// (Everything is prefetched into the browser cache, but only decoded when used.)

import { TEAMS, PALETTES } from './data.js';
import { recolorParts, recolorPaint, headPlacement, PARTS_SCALE } from './modular.js';

const BASE = new URL('assets/', document.baseURI).href;
const INLINE = typeof window !== 'undefined' && window.__INLINE; // single-file offline build

// Page groups loaded at start and kept through every scene; and the ones every match needs,
// loaded with the rival's (the newer supers' effects, the linesman).
const CORE = ['home', 'away', 'title', 'icons_z', 'allstar', 'icons_ac', 'legends', 'club_masks'];
const MATCH = ['abilities_al', 'linesman', 'arena_au', 'supporter_masks'];
// A building's own layers, loaded only for a match there (the Cup Final's Coliseum: a big page).
const ARENA_GROUPS = { frostline_coliseum: ['arena_bx'], harbour_rink: ['arena_cm'], glacier_cave: ['arena_cp'], summit_rink: ['arena_cv'] };
// Groups whose data masks live on pages of their own (read, never team-recoloured), loaded and kept with them.
const COMPANION = { parts: 'parts_masks', goalie_parts: 'goalie_parts_masks' };

export const Assets = {
  atlas: null,
  pages: [], // HTMLImageElement | HTMLCanvasElement per page (undefined until loaded)
  backdrop: null,
  backdrops: new Map(), // arena key -> image
  recolored: new Map(), // teamId -> { pages, loaded } with the away and rival pages swapped
  iconCache: new Map(),
  loading: new Map(), // file -> Promise<image>
  images: new Map(), // file -> image

  url(file) { return INLINE ? INLINE[file] : BASE + file; },

  async load(onProgress) {
    const atlas = INLINE ? INLINE['gfx/atlas.json'] : await (await fetch(BASE + 'gfx/atlas.json')).json();
    this.atlas = atlas;
    this.pages = new Array(atlas.pages.length);
    // (the icon pages are small and the menus use them everywhere: award, plan, challenge and online icons, the All-Star crest)
    const core = atlas.pages.map((p, i) => i).filter((i) => CORE.includes(atlas.pages[i].group));
    const glass = atlas.arena && atlas.arena.glass && atlas.arena.glass.file;
    const files = [...core.map((i) => atlas.pages[i].file), ...(glass ? [glass] : []), 'gfx/rink_backdrop.webp'];
    let done = 0;
    const imgs = await Promise.all(files.map((f) => this.image(f).then((img) => {
      done++; onProgress?.(done / files.length);
      return img;
    })));
    this.backdrop = imgs.pop();
    if (glass) this.glass = imgs.pop();
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
    await Promise.all([...this.atlas.pages.map((p, i) => (p.group !== group || this.pages[i] ? null
      : this.image(p.file).then((img) => { this.pages[i] = img; }))), COMPANION[group] && this.loadGroup(COMPANION[group])]);
  },
  // Every page of a group decoded (false for a group the atlas doesn't have).
  groupReady(group) {
    const own = this.atlas.pages.map((p, i) => i).filter((i) => this.atlas.pages[i].group === group);
    return own.length > 0 && own.every((i) => this.pages[i]) && (!COMPANION[group] || !this.atlas.pages.some((p) => p.group === COMPANION[group]) || this.groupReady(COMPANION[group]));
  },

  // Everything a match or scene with this rival needs: roster pages, arena, banners.
  async ensureTeam(teamId, arena) {
    const t = TEAMS[teamId];
    const jobs = [];
    if (t && (t.art || t.mark)) jobs.push(this.loadGroup('rival_' + (t.art || t.mark)));
    if (t && t.goalieLook) jobs.push(this.loadGroup('goalie_parts')); // (their goalie, made from parts)
    for (const g of [...MATCH, ...(ARENA_GROUPS[arena] || [])]) jobs.push(this.loadGroup(g));
    if (t && (t.art || t.mark) && this.needNewcomers) jobs.push(this.loadGroup('newcomers')); // (a signed slot's newcomer, or the backup goalie)
    if (this.partsFor && this.partsFor(teamId)) jobs.push(this.loadGroup('parts')); // (a fill made from parts, in their colours)
    if (arena && arena !== 'home') jobs.push(this.ensureArena(arena));
    await Promise.all(jobs).catch(() => {});
    if (t) this.prepareTeam(t);
  },

  async ensureArena(key) {
    // the host's mascot lives on its team's pages
    const host = this.atlas.arena && this.atlas.arena.mascot_arenas && this.atlas.arena.mascot_arenas[key];
    const team = host && Object.values(TEAMS).find((tm) => tm.art === host || tm.mark === host);
    if (team && this.atlas.arena.rival_mascots && this.atlas.arena.rival_mascots[host]) {
      await this.loadGroup('rival_' + host).catch(() => {});
      this.prepareTeam(team);
    }
    const file = this.atlas.arenas && this.atlas.arenas[key];
    if (!file || this.backdrops.has(key)) return;
    this.backdrops.set(key, await this.image(file));
  },

  backdropFor(key) { return this.backdrops.get(key) || this.backdrop; },

  // Warm the browser cache with the rest, one file at a time, without decoding anything:
  // decoded art is what fills a phone's memory, so it only happens when a scene needs it.
  async prefetch() {
    if (INLINE) return; // the single-file build already has everything
    if (typeof navigator !== 'undefined' && ((navigator.serviceWorker && navigator.serviceWorker.controller) || (navigator.connection && navigator.connection.saveData))) return; // (the offline cache has it all already; or the phone is saving data)
    const a = this.atlas;
    const files = [
      ...a.pages.filter((p, i) => !this.pages[i]).map((p) => p.file),
      a.locker, ...Object.values(a.arenas || {}), ...Object.values(a.banners || {}),
    ].filter(Boolean);
    for (const f of files) {
      if (this.loading.has(f)) continue; // (a scene already asked for it)
      try {
        // read each one to the end, a piece at a time and thrown away: a response left unread
        // holds its connection, and after six of them every later image from the site waited
        // (an arena's backdrop never came)
        const r = await fetch(this.url(f));
        if (r.body && r.body.getReader) { const rd = r.body.getReader(); while (!(await rd.read()).done); } else await r.arrayBuffer();
      } catch { /* offline and not cached: fine, it loads when needed */ }
    }
  },

  // Equipped gear recolours from the masks; load them only when someone wears special gear.
  ensureGear() { return Promise.all([this.loadGroup('gearmask'), ...(this.needLegends ? [this.loadGroup('legends_gearmask')] : []), ...(this.needNewcomers ? [this.loadGroup('newcomer_gearmask')] : [])]).catch(() => {}); },
  get needLegends() { return !!(PALETTES.homekit.groups && PALETTES.homekit.groups.includes('legends_ice')); }, // (a twin on the roster)
  newcomerCheck: null, // the game's check: has the save signed a rival (skater or goalie) or drafted a rookie (newcomer art)?
  get needNewcomers() { return !!(this.newcomerCheck && this.newcomerCheck()); },
  partsFor: null, // the game's check: does this rival field anyone made from parts?

  forget(file) { this.images.delete(file); this.loading.delete(file); },

  // Free decoded art the current scene doesn't use. keep: { teams: [team ids], arena, gear,
  // groups: [scene groups] }. Home and away art, the home rink, our signings' pages and the
  // club colours stay.
  trim(keep = {}) {
    const a = this.atlas;
    const groups = new Set([...CORE.filter((g) => g !== 'title'), ...(PALETTES.homekit.groups || []), ...(keep.groups || [])]);
    for (const id of keep.teams || []) { const t = TEAMS[id]; if (t && (t.art || t.mark)) groups.add('rival_' + (t.art || t.mark)); if (t && t.goalieLook) groups.add('goalie_parts'); }
    if (this.needNewcomers && (keep.teams || []).length) groups.add('newcomers');
    if (this.partsFor && (keep.teams || []).some(this.partsFor)) groups.add('parts');
    if ((keep.teams || []).length) for (const g of [...MATCH, ...(ARENA_GROUPS[keep.arena] || [])]) groups.add(g); // (in a match)
    if (keep.gear) { groups.add('gearmask'); groups.add('legends_gearmask'); if (this.needNewcomers) groups.add('newcomer_gearmask'); }
    for (const [g, c] of Object.entries(COMPANION)) if (groups.has(g)) groups.add(c); // (their masks with them)
    const released = new Set();
    a.pages.forEach((p, i) => { if (this.pages[i] && !groups.has(p.group)) { released.add(this.pages[i]); this.pages[i] = null; this.forget(p.file); } });
    // recoloured page sets keep references to the original pages they didn't change: drop those too
    for (const r of this.recolored.values()) r.pages = r.pages.map((pg) => (released.has(pg) ? null : pg));
    for (const [k, img] of [...this.backdrops]) {
      if (k === 'home' || k === keep.arena) continue;
      this.backdrops.delete(k); if (a.arenas && a.arenas[k]) this.forget(a.arenas[k]);
    }
    for (const k of [...this.recolored.keys()]) if (k !== 'club' && k !== 'homekit' && !(keep.teams || []).includes(k)) this.recolored.delete(k);
    // cut-in banners live on as image URLs; the decoded copies were only needed for recolouring
    for (const f of Object.values(a.banners || {})) this.forget(f);
  },

  // Let go of the original pages of these groups when only recoloured copies are drawn (the
  // All-Star Game: both rival teams' art in our kit and in the All-Star kit). They load
  // again whenever something needs them.
  dropOriginals(groups) {
    this.atlas.pages.forEach((p, i) => { if (this.pages[i] && groups.includes(p.group)) { this.pages[i] = null; this.forget(p.file); } });
  },

  frame(id) { return this.atlas.frames[id]; },

  // pages to use for a given team palette (null = original art)
  pagesFor(teamId) {
    if (!teamId) return this.pages;
    const r = this.recolored.get(teamId);
    return r ? r.pages : this.pages;
  },

  // Club colours: recolour our team's frames on the home pages ('club' palette).
  prepareClub() {
    const rc = PALETTES.club.recolor;
    this.recolored.delete('club');
    for (const k of [...this.iconCache.keys()]) if (k.includes('|club|')) this.iconCache.delete(k);
    for (const k of [...(this.bannerCanvasCache || new Map()).keys()]) if (k.endsWith('|club') || k.endsWith('|homekit')) this.bannerCanvasCache.delete(k);
    this.recolored.delete('homekit'); // signings follow the club colours too
    if (!rc) return;
    const ours = (id) => (/\/home[_/]/.test(id) && !id.startsWith('hud_elements/')) || id.startsWith('expressions_core/')
      || id.startsWith('expressions_halla_royals_comets/halla/') || id === 'hud_elements/misc/home_crest' || id.startsWith('crests_club/')
      || id === 'arena/banner/glacial_strikers' || id.startsWith('mascot/');
    const rects = new Map();
    for (const [id, f] of Object.entries(this.atlas.frames)) {
      if (!ours(id) || this.atlas.pages[f[0]].group !== 'home') continue;
      if (!rects.has(f[0])) rects.set(f[0], []);
      rects.get(f[0]).push([f[1], f[2], f[3], f[4]]);
    }
    const pages = this.pages.map((img, i) => (img && rects.has(i) ? recolorHome(img, rc, rects.get(i)) : img));
    // Native cloth masks isolate these banners and supporters from props and faces.
    const masked = new Map(), maskSources = new Map();
    for (const [id, mid] of Object.entries(this.atlas.club_art_masks || {})) {
      const f = this.atlas.frames[id], m = this.atlas.frames[mid];
      if (!f || !m || !pages[f[0]] || !this.pages[m[0]]) continue;
      if (!masked.has(f[0])) masked.set(f[0], cpuCanvas(pages[f[0]]));
      const ctx = masked.get(f[0]);
      const data = ctx.getImageData(f[1], f[2], f[3], f[4]);
      if (!maskSources.has(m[0])) maskSources.set(m[0], cpuCanvas(this.pages[m[0]]));
      const mc = maskSources.get(m[0]);
      const mask = mc.getImageData(m[1], m[2], m[3], m[4]);
      recolorClubPixels(data.data, mask.data, rc);
      ctx.putImageData(data, f[1], f[2]);
    }
    for (const [pi, ctx] of masked) pages[pi] = gpuCopy(ctx.canvas);
    this.recolored.set('club', { pages, loaded: 'club' });
  },

  // A frame of our art in trial club colours, for the club editor's preview.
  previewIcon(id, size, rc) {
    const f = this.atlas.frames[id];
    if (!f || !this.pages[f[0]]) return '';
    const [pi, fx, fy, fw, fh] = f;
    const src = document.createElement('canvas'); src.width = fw; src.height = fh;
    src.getContext('2d').drawImage(this.pages[pi], fx, fy, fw, fh, 0, 0, fw, fh);
    const img = rc ? recolorHome(src, rc, [[0, 0, fw, fh]]) : src;
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const k = size / Math.max(fw, fh);
    c.getContext('2d').drawImage(img, (size - fw * k) / 2, (size - fh * k) / 2, fw * k, fh * k);
    return c.toDataURL('image/png');
  },

  // Pages for our own team: club colours when set, else the original art.
  clubPages() { return this.recolored.has('club') ? this.recolored.get('club').pages : this.pages; },

  // Our recruits: load their teams' roster pages and recolour them into home colours.
  async ensureKit(groups) {
    const kit = PALETTES.homekit;
    kit.groups = groups;
    await Promise.all(groups.map((g) => this.loadGroup(g))).catch(() => {});
    this.prepareTeam(kit);
  },

  // Recolour the away pages and this rival's roster pages into the team's colours
  // (or, for a palette with groups, just those pages).
  prepareTeam(team) {
    const mark = team.art || team.mark; // (an expansion club's identity art: Batch AU)
    const own = (g) => (team.groups ? team.groups.includes(g) : g === 'away' || g === 'newcomers' || (g === 'parts' && (!this.partsFor || this.partsFor(team.id))) || (g === 'goalie_parts' && !!team.goalieLook) || (mark && g === 'rival_' + mark));
    const loaded = this.pages.filter((img, i) => img && own(this.atlas.pages[i].group)).length + '|' + (team.groups || []).join(',') + '|supporters:' + this.groupReady('supporter_masks');
    const r = this.recolored.get(team.id);
    if (r && r.loaded === loaded) return;
    if (!team.recolor) { this.recolored.delete(team.id); return; }
    const pages = this.pages.map((img, i) => {
      if (!own(this.atlas.pages[i].group)) return img;
      const prev = r && r.pages[i];
      if (!img) return prev || null; // the original was let go (dropOriginals): keep the copy
      const copy = prev && prev !== img ? prev : recolorPage(img, team.recolor);
      return this.recolorSupporters(copy, img, i, team.recolor);
    });
    this.recolored.set(team.id, { pages, loaded });
    for (const k of [...this.iconCache.keys()]) if (k.includes(`|${team.id}|`)) this.iconCache.delete(k);
  },

  // Restore each supporter from the original before colouring only its native cloth mask.
  recolorSupporters(copy, original, pi, rc) {
    let ctx, sourceCtx;
    const masks = new Map();
    for (const [id, mid] of Object.entries(this.atlas.rival_art_masks || {})) {
      const f = this.atlas.frames[id], m = this.atlas.frames[mid];
      if (!f || !m || f[0] !== pi || !this.pages[m[0]]) continue;
      ctx ||= cpuCanvas(copy);
      sourceCtx ||= cpuCanvas(original);
      if (!masks.has(m[0])) masks.set(m[0], cpuCanvas(this.pages[m[0]]));
      const source = sourceCtx.getImageData(f[1], f[2], f[3], f[4]);
      const mask = masks.get(m[0]).getImageData(m[1], m[2], m[3], m[4]);
      recolorSupporterPixels(source.data, mask.data, rc);
      ctx.putImageData(source, f[1], f[2]);
    }
    return ctx ? gpuCopy(ctx.canvas) : copy;
  },

  // A cut-in banner for a character key ('nix', 'ember_comets_c', ...) in the team's colours,
  // as something drawable (the image, or the recoloured canvas): no encoding, for the cut-ins
  // mid-match. Null until it's loaded (warmBanners loads them ahead).
  bannerCanvas(key, teamId) {
    const file = key && this.atlas.banners && this.atlas.banners[key];
    if (!file) return null;
    const ck = key + '|' + (teamId || '');
    this.bannerCanvasCache ||= new Map();
    if (this.bannerCanvasCache.has(ck)) return this.bannerCanvasCache.get(ck);
    const img = this.images.get(file);
    if (!img) { this.image(file).catch(() => {}); return null; }
    const t = teamId && (TEAMS[teamId] || PALETTES[teamId]);
    const out = t && t.recolor ? recolorPage(img, t.recolor) : img;
    if (this.bannerCanvasCache.size > 24) this.bannerCanvasCache.delete(this.bannerCanvasCache.keys().next().value);
    this.bannerCanvasCache.set(ck, out);
    return out;
  },

  // Load and recolour a match's cut-in banners ahead of time, one every few frames.
  warmBanners(list) {
    list.filter(([key]) => key && this.atlas.banners && this.atlas.banners[key]).forEach(([key, teamId], i) => {
      this.image(this.atlas.banners[key]).then(() => setTimeout(() => this.bannerCanvas(key, teamId), 120 * i)).catch(() => {});
    });
  },

  // Draw a frame with its pivot at (x, y). scale = world px per *source* px.
  draw(ctx, id, x, y, scale, opts = {}) {
    const f = this.atlas.frames[id];
    if (!f) return;
    const [pi, fx, fy, fw, fh, px, py, s] = f;
    const pages = opts.pages || this.pages;
    if (!pages[pi]) return;
    const k = scale / s;
    if (!opts.rot && opts.alpha === undefined && !opts.blend) {
      // the common case (crowds, skaters, props): no save/restore, which phones feel when it's
      // hundreds of sprites a frame. A mirror is two exact flips of the x axis.
      const sq = opts.squash || 1, w = fw * k, h = fh * k * sq, top = y - py * k * sq;
      if (opts.flip) { ctx.scale(-1, 1); ctx.drawImage(pages[pi], fx, fy, fw, fh, -x - px * k, top, w, h); ctx.scale(-1, 1); }
      else ctx.drawImage(pages[pi], fx, fy, fw, fh, x - px * k, top, w, h);
      return;
    }
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

  // Animation frames for <img> tags: each drawn at the same scale with its pivot at the same
  // spot, so swapping images doesn't jump. Returns { urls, w, h, fx, fy } (fx, fy: where the
  // pivot sits, as fractions of the image), or null until the pages are loaded.
  // The same frames side by side in one image, for CSS animations that step through it
  // (one element, so there's never a moment with no frame showing). { url, n, w, h, fx, fy }
  spriteStrip(ids, height, teamId = null) {
    const key = `strip|${ids.join(',')}|${height}|${teamId}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const pages = this.pagesFor(teamId);
    const fr = ids.map((id) => this.atlas.frames[id]);
    if (!fr.length || fr.some((f) => !f || !pages[f[0]])) return null;
    let l = 0, r = 0, t = 0, b = 0;
    for (const [, , , fw, fh, px, py, s] of fr) { l = Math.max(l, px / s); r = Math.max(r, (fw - px) / s); t = Math.max(t, py / s); b = Math.max(b, (fh - py) / s); }
    const k = height / (t + b), w = Math.ceil((l + r) * k);
    const c = document.createElement('canvas');
    c.width = w * fr.length; c.height = height;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    fr.forEach(([pi, fx, fy, fw, fh, px, py, s], i) => ctx.drawImage(pages[pi], fx, fy, fw, fh, i * w + (l - px / s) * k, (t - py / s) * k, (fw / s) * k, (fh / s) * k));
    const strip = { url: c.toDataURL('image/png'), n: fr.length, w, h: height, fx: l / (l + r), fy: t / (t + b) };
    this.iconCache.set(key, strip);
    return strip;
  },

  spriteSet(ids, height, teamId = null) {
    const key = `set|${ids.join(',')}|${height}|${teamId}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const pages = this.pagesFor(teamId);
    const fr = ids.map((id) => this.atlas.frames[id]);
    if (!fr.length || fr.some((f) => !f || !pages[f[0]])) return null;
    let l = 0, r = 0, t = 0, b = 0; // extents around the pivot, in source pixels
    for (const [, , , fw, fh, px, py, s] of fr) { l = Math.max(l, px / s); r = Math.max(r, (fw - px) / s); t = Math.max(t, py / s); b = Math.max(b, (fh - py) / s); }
    const k = height / (t + b), w = Math.ceil((l + r) * k);
    const urls = fr.map(([pi, fx, fy, fw, fh, px, py, s]) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = height;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(pages[pi], fx, fy, fw, fh, (l - px / s) * k, (t - py / s) * k, (fw / s) * k, (fh / s) * k);
      return c.toDataURL('image/png');
    });
    const set = { urls, w, h: height, fx: l / (l + r), fy: t / (t + b) };
    this.iconCache.set(key, set);
    return set;
  },

  // Data URL of a frame fitted in a square, for <img> tags in menus.
  // A head or face frame of the parts art (Batch AJ) with a look's skin and hair, as an
  // ordinary canvas the size of the frame (cached; null while the art isn't there).
  partsCanvas(id, look) {
    const f = this.atlas.frames[id], M = this.atlas.modular;
    const mid = M && M.masks && M.masks[id], mf = mid && this.atlas.frames[mid];
    if (!f || !this.pages[f[0]]) return null;
    this.partsCache ||= new Map();
    const key = `${id}|${look.skin}|${look.hair}`;
    if (this.partsCache.has(key)) return this.partsCache.get(key);
    const [pi, fx, fy, fw, fh] = f;
    const c = document.createElement('canvas'); c.width = fw; c.height = fh;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(this.pages[pi], fx, fy, fw, fh, 0, 0, fw, fh);
    if (mf && this.pages[mf[0]]) {
      const m = document.createElement('canvas'); m.width = fw; m.height = fh;
      const mx = m.getContext('2d', { willReadFrequently: true });
      mx.drawImage(this.pages[mf[0]], mf[1], mf[2], mf[3], mf[4], mf[8] || 0, mf[9] || 0, mf[3], mf[4]);
      const img = cx.getImageData(0, 0, fw, fh);
      recolorParts(img.data, mx.getImageData(0, 0, fw, fh).data, look);
      cx.putImageData(img, 0, 0);
    }
    const out = document.createElement('canvas'); out.width = fw; out.height = fh;
    out.getContext('2d').drawImage(c, 0, 0);
    if (this.partsCache.size > 400) this.partsCache.delete(this.partsCache.keys().next().value);
    this.partsCache.set(key, out);
    return out;
  },

  // A goalie mask (Batch AT) painted in a look's colour, as an ordinary canvas the size of the
  // frame (cached; null while the art isn't there).
  paintCanvas(id, look) {
    const f = this.atlas.frames[id], P = this.atlas.goalie_parts;
    const mid = P && P.paint && P.paint[id], mf = mid && this.atlas.frames[mid];
    if (!f || !this.pages[f[0]]) return null;
    this.partsCache ||= new Map();
    const key = `paint|${id}|${look.paint}`;
    if (this.partsCache.has(key)) return this.partsCache.get(key);
    const [pi, fx, fy, fw, fh] = f;
    const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    cx.canvas.width = fw; cx.canvas.height = fh;
    cx.drawImage(this.pages[pi], fx, fy, fw, fh, 0, 0, fw, fh);
    if (mf && this.pages[mf[0]] && look.paint) {
      const mx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      mx.canvas.width = fw; mx.canvas.height = fh;
      mx.drawImage(this.pages[mf[0]], mf[1], mf[2], mf[3], mf[4], mf[8] || 0, mf[9] || 0, mf[3], mf[4]);
      const img = cx.getImageData(0, 0, fw, fh);
      recolorPaint(img.data, mx.getImageData(0, 0, fw, fh).data, look.paint);
      cx.putImageData(img, 0, 0);
    }
    const out = document.createElement('canvas'); out.width = fw; out.height = fh;
    out.getContext('2d').drawImage(cx.canvas, 0, 0);
    if (this.partsCache.size > 400) this.partsCache.delete(this.partsCache.keys().next().value);
    this.partsCache.set(key, out);
    return out;
  },

  // A goalie made from parts standing (a body frame with the painted mask on it and whatever's in
  // front), as a data URL of the given height: for the locker room.
  goalieStanding(id, look, height, teamId = null) {
    const GP = this.atlas.goalie_parts, a = GP && GP.anchors[id], f = this.atlas.frames[id], pages = this.pagesFor(teamId);
    const views = a && GP.masks[look.mask], head = views && (views[a.view] || views.s), hf = head && this.atlas.frames[head];
    if (!f || !hf || !pages[f[0]]) return '';
    const key = `gstand|${id}|${look.mask}|${look.paint}|${look.body || 'std'}|${height}|${teamId}|`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const face = this.paintCanvas(head, look);
    if (!face) return '';
    const [pi, fx, fy, fw, fh, px, py, s] = f, [, , , hw, hh, hx, hy, hs] = hf;
    const ax = a.x / s, ay = a.y / s; // anchor, in source pixels from the body's corner
    const top = Math.min(0, ay - hy / hs), left = Math.min(0, ax - hx / hs), right = Math.max(fw / s, ax - hx / hs + hw / hs);
    const k = height / (fh / s - top), w = Math.ceil((right - left) * k);
    const c = document.createElement('canvas'); c.width = w; c.height = height;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const ox = -left * k, oy = -top * k;
    ctx.drawImage(pages[pi], fx, fy, fw, fh, ox, oy, (fw / s) * k, (fh / s) * k);
    ctx.drawImage(face, ox + (ax - hx / hs) * k, oy + (ay - hy / hs) * k, (hw / hs) * k, (hh / hs) * k);
    const fr = a.front && this.atlas.frames[a.front];
    if (fr && pages[fr[0]]) { // (placed like the body: the two share a foot point)
      const [qi, qx, qy, qw, qh, qpx, qpy, qs] = fr;
      ctx.drawImage(pages[qi], qx, qy, qw, qh, ox + (px / s - qpx / qs) * k, oy + (py / s - qpy / qs) * k, (qw / qs) * k, (qh / qs) * k);
    }
    const url = c.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  },

  // A goalie's portrait from parts: the shoulders in a team's colours and the painted mask.
  goaliePortrait(look, expr, size = 96, teamId = null) {
    const P = this.atlas.goalie_parts && this.atlas.goalie_parts.portraits;
    const faces = P && P.faces && P.faces[look.mask];
    const faceId = faces && (faces[expr] || faces.neutral);
    const sh = P && ((P.bodies && P.bodies[look.body]) || P); // the shoulders of their build (Batch AX)
    const bf = sh && this.atlas.frames[sh.body], ff = faceId && this.atlas.frames[faceId];
    const page = bf && this.pagesFor(teamId)[bf[0]];
    if (!bf || !ff || !page) return '';
    const key = `gparts|${look.mask}|${look.paint}|${look.body || 'std'}|${faceId}|${size}|${teamId}|${this.canvasMode ? 'c' : ''}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const face = this.paintCanvas(faceId, look);
    if (!face) return '';
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const [, fx, fy, fw, fh, px] = bf;
    const a = sh.anchor || { x: px, y: 0 };
    const top = Math.min(0, a.y - ff[6]), h = fh - top, k = size / Math.max(fw, h);
    const ox = (size - fw * k) / 2, oy = (size - h * k) / 2 - top * k;
    ctx.drawImage(page, fx, fy, fw, fh, ox, oy, fw * k, fh * k);
    ctx.drawImage(face, ox + (a.x - ff[5]) * k, oy + (a.y - ff[6]) * k, ff[3] * k, ff[4] * k);
    if (this.canvasMode) { this.iconCache.set(key, c); return c; }
    const url = c.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  },

  // A portrait from parts: the portrait body in a team's colours and the look's face on its
  // anchor, fitted in a square like icon(). '' while the art isn't there.
  partsPortrait(look, expr, size = 96, teamId = null) {
    const P = this.atlas.modular && this.atlas.modular.portraits;
    const faces = P && P.faces && P.faces[look.head];
    const faceId = faces && (faces[expr] || faces.neutral);
    const body = P && ((P.bodies && P.bodies[look.body]) || P); // the shoulders of their build (Batch AO)
    const bf = body && this.atlas.frames[body.body], ff = faceId && this.atlas.frames[faceId];
    const page = bf && this.pagesFor(teamId)[bf[0]];
    if (!bf || !ff || !page) return '';
    const key = `parts|${look.body}|${look.head}|${look.skin}|${look.hair}|${faceId}|${size}|${teamId}|${this.canvasMode ? 'c' : ''}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key); // (as a canvas mid-match, as a PNG in menus)
    const face = this.partsCanvas(faceId, look);
    if (!face) return '';
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const [, fx, fy, fw, fh, px, py] = bf;
    // fit the body and the face above it in the square
    const a = body.anchor || { x: px, y: 0 };
    const top = Math.min(0, a.y - ff[6]), h = fh - top, k = size / Math.max(fw, h);
    const ox = (size - fw * k) / 2, oy = (size - h * k) / 2 - top * k;
    ctx.drawImage(page, fx, fy, fw, fh, ox, oy, fw * k, fh * k);
    ctx.drawImage(face, ox + (a.x - ff[5]) * k, oy + (a.y - ff[6]) * k, ff[3] * k, ff[4] * k);
    if (this.canvasMode) { this.iconCache.set(key, c); return c; }
    const url = c.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  },

  // A player from parts in a sequence of body frames (the jersey moment, Batch AO): the body
  // in a palette with the look's head on each frame's anchor (none where the anchor hides
  // it), as data URLs of one size around a shared foot point, like spriteSet. Null until the
  // art is in.
  partsMoment(ids, look, height, teamId = null) {
    const M = this.atlas.modular, pages = this.pagesFor(teamId);
    const fr = ids.map((id) => this.atlas.frames[id]);
    if (!M || !fr.length || fr.some((f) => !f || !pages[f[0]])) return null;
    // each frame's head (frame id, its frame, offset from the body's pivot in source pixels)
    const heads = ids.map((id, i) => {
      const f = fr[i], hp = headPlacement(M, look, id, f, 0, 0, 1, false), hf = hp && this.atlas.frames[hp.head];
      return hp && hf ? { id: hp.head, f: hf, x: hp.x, y: hp.y } : null; // (at scale 1: source pixels)
    });
    let l = 0, r = 0, t = 0, b = 0; // extents around the pivot, in source pixels
    const H = PARTS_SCALE.head; // (the head bigger than drawn, round its neck)
    fr.forEach(([, , , fw, fh, px, py, s], i) => {
      l = Math.max(l, px / s); r = Math.max(r, (fw - px) / s); t = Math.max(t, py / s); b = Math.max(b, (fh - py) / s);
      const h = heads[i];
      if (h) { const [, , , hw, hh, hx, hy, hs] = h.f; l = Math.max(l, (hx / hs) * H - h.x); r = Math.max(r, h.x + ((hw - hx) / hs) * H); t = Math.max(t, (hy / hs) * H - h.y); }
    });
    const k = height / (t + b), w = Math.ceil((l + r) * k);
    const urls = fr.map(([pi, fx, fy, fw, fh, px, py, s], i) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = height;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(pages[pi], fx, fy, fw, fh, (l - px / s) * k, (t - py / s) * k, (fw / s) * k, (fh / s) * k);
      const h = heads[i], face = h && this.partsCanvas(h.id, look);
      if (face) {
        const [, , , hw, hh, hx, hy, hs] = h.f;
        ctx.drawImage(face, (l + h.x - (hx / hs) * H) * k, (t + h.y - (hy / hs) * H) * k, (hw / hs) * H * k, (hh / hs) * H * k);
      }
      return c.toDataURL('image/png');
    });
    return { urls, w, h: height, fx: l / (l + r), fy: t / (t + b) };
  },

  // A frame's pixels in the colours of a page set, on a CPU canvas for pixel work (the gear
  // recolours). Read from the original page and recoloured here: reading a recoloured page
  // back off the GPU would stall the frame.
  framePixels(id, pages) {
    const f = this.atlas.frames[id];
    if (!f) return null;
    const [pi, fx, fy, fw, fh] = f;
    const orig = this.pages[pi];
    let pal = null;
    if (pages !== this.pages) for (const [pid, r] of this.recolored) if (r.pages === pages) pal = pid;
    const src = pal && !orig ? pages[pi] : orig; // (an original that was let go: read the copy)
    if (!src) return null;
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    ctx.canvas.width = fw; ctx.canvas.height = fh;
    ctx.drawImage(src, fx, fy, fw, fh, 0, 0, fw, fh);
    if (pal && src === orig) {
      const rc = pal === 'club' ? PALETTES.club.recolor : (TEAMS[pal] || PALETTES[pal] || {}).recolor;
      if (rc && pal === 'club') recolorHomeIn(ctx, rc, [[0, 0, fw, fh]]);
      else if (rc) recolorPageIn(ctx, rc);
    }
    return ctx;
  },

  // A frame fitted in a square, as a canvas: for pictures shown mid-match (the ultimate
  // cut-ins), where turning it into a PNG first would stall the frame. Cached.
  iconCanvas(id, size = 96, teamId = null, opts = {}) {
    const key = `${id}|${size}|${teamId}|${opts.flip ? 1 : 0}|${opts.crop || ''}|${opts.recolor ? 1 : ''}`;
    this.canvasCache ||= new Map();
    if (this.canvasCache.has(key)) return this.canvasCache.get(key);
    const c = this.iconDraw(id, size, teamId, opts);
    if (!c) return null;
    if (this.canvasCache.size > 60) this.canvasCache.delete(this.canvasCache.keys().next().value);
    this.canvasCache.set(key, c);
    return c;
  },

  icon(id, size = 96, teamId = null, opts = {}) {
    if (this.canvasMode) return this.iconCanvas(id, size, teamId, opts); // (see portraitCanvas in ui.js)
    const key = `${id}|${size}|${teamId}|${opts.flip ? 1 : 0}|${opts.crop || ''}|${opts.recolor ? 1 : ''}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const c = this.iconDraw(id, size, teamId, opts);
    if (!c) return '';
    const url = c.toDataURL('image/png');
    this.iconCache.set(key, url);
    return url;
  },

  // A backdrop in its native aspect ratio, without the square icon's padding.
  sceneImage(id, width = 640) {
    const key = `scene|${id}|${width}`;
    if (this.iconCache.has(key)) return this.iconCache.get(key);
    const f = this.atlas.frames[id];
    if (!f || !this.pages[f[0]]) return '';
    const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width * f[4] / f[3]);
    c.getContext('2d').drawImage(this.pages[f[0]], f[1], f[2], f[3], f[4], 0, 0, c.width, c.height);
    const url = c.toDataURL('image/png'); this.iconCache.set(key, url); return url;
  },

  iconDraw(id, size, teamId, opts) {
    const f = this.atlas.frames[id];
    if (!f) return null;
    const [pi, fx, fy, fw, fh] = f;
    const page = this.pagesFor(teamId)[pi];
    if (!page) return null;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    let sx = fx, sy = fy, sw = fw, sh = fh;
    if (opts.crop === 'head') { sh = Math.round(fh * 0.55); }
    if (opts.crop === 'middle' && fw > fh * 2.4) { sw = Math.round(fh * 2.4); sx = fx + Math.round((fw - sw) / 2); } // (a long string of something: its middle, big enough to see)
    const k = size / Math.max(sw, sh);
    if (opts.flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.drawImage(page, sx, sy, sw, sh, (size - sw * k) / 2, (size - sh * k) / 2, sw * k, sh * k);
    // (art drawn in coral and violet on a page the team doesn't recolour: an expansion club's crest)
    const rc = opts.recolor && teamId && (TEAMS[teamId] || PALETTES[teamId] || {}).recolor;
    if (rc) { const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); cx.canvas.width = size; cx.canvas.height = size; cx.drawImage(c, 0, 0); recolorPageIn(cx, rc); return cx.canvas; }
    return c;
  },
};

// One retry after a short pause: a dropped request on a patchy connection shouldn't stop the game.
function loadImage(src, tries = 2) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    // decoded off the main thread now, not on first use: a page first drawn mid-match (an
    // icon at a goal) used to decode right there and stall the frame for half a second
    img.onload = () => Promise.race([img.decode ? img.decode().catch(() => {}) : null, new Promise((r) => setTimeout(r, 4000))]).then(() => res(img));
    img.onerror = () => (tries > 1 ? setTimeout(() => loadImage(src, tries - 1).then(res, rej), 600) : rej(new Error('Could not load ' + src)));
    img.src = src;
  });
}

// Club colours on our own art: the teal trim and cream jersey take the club's colours,
// shaded by the original pixel. Only inside `rects` (our team's frames) so effects and
// UI icons on the same page keep their colours.
// Remember what each source colour turned into: pixel art reuses a small palette, so the
// colour maths runs once per colour instead of once per pixel (about 5x faster).
function colorMemo() {
  const keys = new Int32Array(1 << 16).fill(-1), vals = new Int32Array(1 << 16);
  return {
    // returns the packed result (0xRRGGBB), -2 for "leave it", or -1 if not seen yet
    get(rgb) { const k = Math.imul(rgb, 2654435761) >>> 16; return keys[k] === rgb ? vals[k] : -1; },
    set(rgb, v) { const k = Math.imul(rgb, 2654435761) >>> 16; keys[k] = rgb; vals[k] = v; },
  };
}

// Recolouring works on a CPU-side canvas (pixel reads), but what's drawn every frame must be
// an ordinary canvas: a willReadFrequently canvas used as a drawing source is uploaded to the
// GPU on every draw, and a page is 2048 px square.
function cpuCanvas(img, w = img.width, h = img.height) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx;
}
function gpuCopy(c) {
  const out = document.createElement('canvas');
  out.width = c.width; out.height = c.height;
  out.getContext('2d').drawImage(c, 0, 0);
  return out;
}
const recolorHome = (img, rc, rects) => { const ctx = cpuCanvas(img); recolorHomeIn(ctx, rc, rects); return gpuCopy(ctx.canvas); };
const recolorPage = (img, rc) => { const ctx = cpuCanvas(img); recolorPageIn(ctx, rc); return gpuCopy(ctx.canvas); };

function recolorHomeIn(ctx, rc, rects) {
  const T = rc.trim, J = rc.jersey;
  const memo = colorMemo();
  for (const [x, y, w, h] of rects) {
    const data = ctx.getImageData(x, y, w, h);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const rgb = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      const known = memo.get(rgb);
      if (known === -2) continue;
      if (known >= 0) { d[i] = known >> 16; d[i + 1] = (known >> 8) & 255; d[i + 2] = known & 255; continue; }
      memo.set(rgb, -2);
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
      if (dl < 0.03 || mx < 0.3) continue;
      const s = dl / mx;
      let hh;
      if (mx === r) hh = ((g - b) / dl + 6) % 6; else if (mx === g) hh = (b - r) / dl + 2; else hh = (r - g) / dl + 4;
      hh *= 60;
      let out;
      if (hh >= 165 && hh <= 205 && s > 0.28) out = hsv2rgb(T.h / 360, Math.min(1, s * (T.s / 0.51)), Math.min(1, mx * (T.v / 0.91)));
      // jersey cream: hue 37-62, plus its saturated shading at 28-37 (pale skin sits at
      // 28-37 too, but less saturated and at full brightness, so it's left alone)
      else if ((hh >= 37 && hh <= 62 && s >= 0.06 && s <= 0.46 && mx > 0.74) || (hh >= 28 && hh < 37 && s >= 0.37 && s <= 0.5 && mx > 0.74 && mx < 0.95)) out = hsv2rgb(J.h / 360, Math.min(1, s * (J.s / 0.2) * 0.6 + J.s * 0.55), Math.min(1, J.v * (0.55 + mx * 0.45)));
      else continue;
      d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
      memo.set(rgb, (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); // as stored (rounded)
    }
    ctx.putImageData(data, x, y);
  }
}


// Pure-channel native club masks: red is teal cloth, green is cream trim.
// Keep source shading and alpha; unlabelled skin, hair, instruments and rails stay intact.
export function recolorClubPixels(d, md, rc) {
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3] || !md[i + 3]) continue;
    const colour = md[i] > 200 ? rc.trim : md[i + 1] > 200 ? rc.jersey : null;
    if (!colour) continue;
    const brightness = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
    const out = hsv2rgb(colour.h / 360, colour.s, Math.min(1, colour.v * (0.35 + brightness * 0.65)));
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
  }
}

// Native rival masks select cloth; source saturation/value keep its painted shading.
export function recolorSupporterPixels(d, md, rc) {
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3] || !md[i + 3]) continue;
    const secondary = md[i + 1] > 200;
    if (!secondary && md[i] <= 200) continue;
    const max = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
    const min = Math.min(d[i], d[i + 1], d[i + 2]) / 255;
    const saturation = max ? (max - min) / max : 0;
    const sm = secondary ? (rc.sat2 ?? rc.sat ?? 1) : (rc.sat ?? 1);
    const vm = secondary ? (rc.val2 ?? rc.val ?? 1) : (rc.val ?? 1);
    const out = hsv2rgb((secondary ? (rc.h2 ?? rc.h1) : rc.h1) / 360, Math.min(1, saturation * sm), Math.min(1, max * vm));
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
  }
}

// Shift the coral (primary) and violet (secondary) jersey colours of the away art.
// recolor: { h1, h2, sat, val } — target hues in degrees, saturation/value multipliers.
function recolorPageIn(ctx, rc) {
  const c = ctx.canvas;
  if (rc.mode === 'home') return recolorHomeIn(ctx, rc, [[0, 0, c.width, c.height]]);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const h1 = rc.h1 / 360, h2 = (rc.h2 ?? rc.h1) / 360;
  const sm = rc.sat ?? 1, vm = rc.val ?? 1;
  const sm2 = rc.sat2 ?? sm, vm2 = rc.val2 ?? vm;
  const memo = colorMemo();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const rgb = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const known = memo.get(rgb);
    if (known === -2) continue;
    if (known >= 0) { d[i] = known >> 16; d[i + 1] = (known >> 8) & 255; d[i + 2] = known & 255; continue; }
    memo.set(rgb, -2);
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
    memo.set(rgb, (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); // as stored (rounded)
  }
  ctx.putImageData(data, 0, 0);
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
