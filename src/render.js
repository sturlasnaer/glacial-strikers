// Canvas renderer for matches: rink, crowd, skaters, goalies, puck, effects, camera.

import { Assets } from './assets.js';
import { toScreen, persp, BACKDROP, GOAL_X, MOUTH, NET_DEPTH, RINK, ICICLE } from './rink.js';
import { clamp, lerp, makeRng } from './util.js';
import { POWER_INFO, COMBOS, TEAMS, ARENAS, PALETTES, GEAR_LOOK, CLUB } from './data.js';
import { ELEMENT_COLORS } from './fx.js';
import { NetRenderer, SpriteNets } from './net.js';
import { t } from './i18n.js';
import { headPlacement, PARTS_SCALE } from './modular.js';
import { handMirror } from './hands.js';
import { Linesman } from './linesman.js';
import { cupBanners } from './hall.js';
import { DRIVE } from './scenery.js';
import { seasonFor } from './seasonal.js';

const SKATER_SCALE = 0.5; // world px per source px
const CROSS_IN = 5, CROSS_KEEP = 3; // turn rates (radians a second) into and through a crossover
const GOALIE_SCALE = 0.43;
const PUCK_SCALE = 0.115;
const DIRS8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const DIRS4 = ['east', 'south', 'west', 'north'];
const GOAL_LIGHT = 'ice_spray_goal_lights/goal_light/phase_';
// Each player's colour with two on the ice: P1 ice, P2 coral against them (versus) or green beside them (co-op).
const seatColour = (match, c) => c.team === 1 ? '#ff6f7d' : match.coop && c.seat ? '#7fe08a' : '#71dce8';

const LAMPS = [
  [252, 18], [697, 15], [838, 15], [1282, 18], [18, 185], [1518, 185],
  [208, 858], [330, 875], [678, 845], [858, 845], [1206, 875], [1325, 858],
];

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: BACKDROP.cx, y: BACKDROP.cy, zoom: 1 };
    this.dpr = 1;
    this.w = 1; this.h = 1;
    this.tintCache = new Map();
    this.cracks = null;
    this.font = '"Jersey 10", "Pixelify Sans", ui-monospace, monospace';
    const arenaArt = Assets.atlas && Assets.atlas.arena;
    this.nets = arenaArt && arenaArt.nets ? new SpriteNets(arenaArt.nets) : new NetRenderer();
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    this.dpr = Math.min(this.maxDpr || 2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
  }

  baseZoom() {
    const portrait = this.h > this.w;
    const z = portrait ? Math.min(this.w / 700, this.h / 900) : Math.min(this.w / 1080, this.h / 560);
    return clamp(z, 0.36, 2.4);
  }

  snapCamera(match) {
    const p = match.puck;
    const s = toScreen(p.x, p.y);
    this.cam.x = s.x; this.cam.y = s.y;
    this.cam.zoom = this.baseZoom();
  }

  updateCamera(match, fx, dt, opts = {}) {
    this.nets.update(dt * fx.slowScale);
    const p = match.puck;
    const sp = toScreen(p.x, p.y);
    let tx = sp.x, ty = sp.y;
    const ctrl = (match.humans && match.humans.length > 1) || match.coop || match.keeperCoop ? null : match.controlled(); // (two players: the puck)
    if (ctrl && !ctrl.parked && match.state === 'play') {
      const cs = toScreen(ctrl.x, ctrl.y);
      tx = lerp(tx, cs.x, 0.3); ty = lerp(ty, cs.y, 0.3);
    }
    if (p.owner && p.owner.isSkater && match.state === 'play') tx += p.owner.side * 120;
    tx += clamp(p.vx * 0.12, -120, 120); ty += clamp(p.vy * 0.1, -60, 60);
    if (match.state === 'goal' && match.lastGoal) {
      const g = toScreen(match.lastGoal.side * (GOAL_X - 90), 0);
      tx = g.x; ty = g.y - 30;
    }
    if (opts.focus) { tx = opts.focus.x; ty = opts.focus.y; }
    // goalie mode: keep Halla in the picture while the puck is in her end
    if (match.goalieMode && match.state === 'play') {
      const g = match.goalies[0], gs = toScreen(g.x, g.y);
      const near = clamp(1 - (p.x - g.x) * -g.goalSide / 700, 0, 1);
      tx = lerp(tx, gs.x, near * 0.6); // (well into the picture: on a phone the touch buttons cover the screen's edges)
      const vw = this.w / (this.cam.zoom || 1), m = vw * 0.22; // (and never in the outer fifth of the view, wherever the puck is)
      tx = clamp(tx, gs.x - vw / 2 + m, gs.x + vw / 2 - m);
    }
    if (opts.attract) { tx = lerp(tx, BACKDROP.cx, 0.5); }
    const k = 1 - Math.exp(-4.5 * dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const zt = this.baseZoom() * (1 + fx.zoomPunch * 0.12) * (opts.zoom || 1);
    this.cam.zoom += (zt - this.cam.zoom) * (1 - Math.exp(-6 * dt));
    // keep the view on the backdrop
    const vw = this.w / this.cam.zoom, vh = this.h / this.cam.zoom;
    this.cam.x = vw >= BACKDROP.w ? BACKDROP.w / 2 : clamp(this.cam.x, vw / 2, BACKDROP.w - vw / 2);
    this.cam.y = vh >= BACKDROP.h ? BACKDROP.h / 2 : clamp(this.cam.y, vh / 2, BACKDROP.h - vh / 2);
  }

  worldToCss(x, y, z = 0) {
    const s = toScreen(x, y, z);
    return { x: (s.x - this.cam.x) * this.cam.zoom + this.w / 2, y: (s.y - this.cam.y) * this.cam.zoom + this.h / 2 };
  }

  // ------------------------------------------------------------------ frame
  render(match, fx, ui = {}) {
    const ctx = this.ctx;
    const { dpr } = this;
    const z = this.cam.zoom;
    const sh = fx.shakeOffset();
    // clear only when the backdrop doesn't cover the screen (zoomed out, or shaken off an edge):
    // a full-screen fill a frame that a phone's GPU can do without
    const vx0 = this.cam.x - (this.w / 2 + sh.x) / z, vy0 = this.cam.y - (this.h / 2 + sh.y) / z;
    const covered = vx0 >= 0 && vy0 >= 0 && vx0 + this.w / z <= BACKDROP.w && vy0 + this.h / z <= BACKDROP.h;
    if (!covered) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#0b1424';
      ctx.fillRect(0, 0, this.c.width, this.c.height);
    }
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (this.w / 2 - this.cam.x * z + sh.x), dpr * (this.h / 2 - this.cam.y * z + sh.y));
    if (ui.awayTeamId && TEAMS[ui.awayTeamId]) Assets.prepareTeam(TEAMS[ui.awayTeamId]); // picks up pages loaded mid-match
    Assets.prepareTeam(PALETTES.homekit); // our recruits in home colours
    this.awayPages = Assets.pagesFor(ui.awayTeamId);
    const arena = ARENAS[ui.arena] ? ui.arena : 'home';
    this.arena = ARENAS[arena];

    // backdrop
    ctx.imageSmoothingEnabled = z * dpr < 1.3;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(Assets.backdropFor(arena), 0, 0);
    ctx.imageSmoothingEnabled = true;
    // team logo painted under the ice at centre
    const cc = toScreen(0, 0);
    const host = arena !== 'home' && TEAMS[ui.awayTeamId] && TEAMS[ui.awayTeamId].arena === arena ? TEAMS[ui.awayTeamId] : null;
    const hostCrest = host && Assets.atlas.crests && Assets.atlas.crests[host.art || host.mark];
    if (hostCrest && !host.art) { // an expansion club's crest, drawn in coral and violet: in their colours (cached)
      const cv = Assets.iconCanvas(hostCrest, 200, host.id, { recolor: true }), f = Assets.frame(hostCrest), w = f ? (f[3] / f[7]) * 0.26 : 96;
      if (cv) { ctx.save(); ctx.globalAlpha *= 0.3; ctx.drawImage(cv, cc.x - w / 2, cc.y + 4 - (w * 0.8) / 2, w, w * 0.8); ctx.restore(); }
    } else if (hostCrest) Assets.draw(ctx, hostCrest, cc.x, cc.y + 4, 0.26, { alpha: 0.3, squash: 0.8 });
    else if (arena !== 'frostline_coliseum') Assets.draw(ctx, Assets.frame(TEAMS.home.crest) ? TEAMS.home.crest : 'hud_elements/misc/home_crest', cc.x, cc.y + 2, 0.5, { alpha: 0.3, squash: 0.8, pages: Assets.clubPages() }); // (our crest: the Snow Fox or the club's choice)
    this.drawLamps(ctx, fx);
    this.drawCrowd(ctx, fx, ui);
    this.drawArenaProps(ctx, match, fx, ui, arena);
    const box = this.penaltyBox();
    if (box) this.drawPenaltyBoxes(ctx, match, fx, box);
    this.drawGoalLights(ctx, match, fx);
    if (fx.marks) ctx.drawImage(fx.marks, 0, 0, BACKDROP.w, BACKDROP.h);
    const lap = ui.lap; // the resurfacer's lap before the title screen's match: nobody on the ice
    if (lap) this.drawLapSheen(ctx, lap);
    this.drawTwists(ctx, match, fx);
    if (!lap) this.warmUp(match); // (gear recolours and heads, built ahead of their first use)
    // the linesman (Batch AG): not in drills, replays or the resurfacer's lap
    const L = !lap && (!match.drill || match.drill.linesman) && !ui.replay && Assets.atlas.linesman ? this.official(match, fx) : null;
    this.puckHeld = !!(L && L.holding(match)); // (in his hand: his art draws it)
    if (L) this.drawLinesmanShadow(ctx, L);
    if (!lap) {
      this.drawTrails(ctx, match);
      this.drawCyclones(ctx, match, fx);
      this.drawPickupsGround(ctx, match, fx);
      this.drawShadows(ctx, match);
      this.drawGroundMarkers(ctx, match, fx);
    }
    if (match.drill && match.drill.drawGround) match.drill.drawGround(ctx, this, match, fx, Assets);
    this.drawRings(ctx, fx);
    if (window.__debugRink) this.drawDebug(ctx, match);

    // depth-sorted sprites
    const list = [];
    if (lap) list.push({ y: lap.pos().y, f: () => this.drawResurfacer(ctx, lap) });
    else for (const s of match.skaters) if (!(box && s.boxT > 0)) list.push({ y: s.y, f: () => this.drawSkater(ctx, s, match, fx) });
    // Nets: back layer, then a puck that's inside the net, then the front layer.
    // The goalie always draws after his own net so the crossbar never cuts through him.
    const NET_KEY = -MOUTH * 0.5;
    const p = match.puck;
    const inNet = this.puckInNet(p);
    for (const side of [-1, 1]) {
      list.push({ y: NET_KEY - 0.3, f: () => this.nets.draw(ctx, side, 'back') });
      list.push({ y: NET_KEY, f: () => this.nets.draw(ctx, side, 'front') });
    }
    // A goalie standing in the goal mouth draws inside the net: back layer, puck, goalie,
    // then the front layer (near post, roof, near-side mesh) over them. Out of the crease
    // they draw in front of it.
    this.goaliePoses = new Map();
    for (const g of lap ? [] : match.goalies) {
      if (g.disabled && !g.leaving) continue;
      const pose = this.goaliePose(g, match, ui.replay);
      this.goaliePoses.set(g, pose);
      if (g.disabled) { list.push({ y: g.leaveY, f: () => this.drawGoalie(ctx, g, match, pose) }); continue; } // skating off to the bench
      const inMouth = this.goalieInMouth(g) && !(pose && pose.front); // facing the camera: step out in front of the net
      const outBack = (g.x - g.goalSide * GOAL_X) * g.goalSide > -2 && !inMouth; // beside or behind the net: sort like a skater
      list.push({ y: inMouth ? NET_KEY - 0.2 : outBack ? g.y + 1 : Math.max(g.y + 1, NET_KEY + 0.5), f: () => this.drawGoalie(ctx, g, match, pose) });
    }
    if (match.drill && match.drill.sprites) for (const sp of match.drill.sprites(match, this, Assets)) list.push({ y: sp.y, f: () => sp.f(ctx) });
    if (!lap) list.push({ y: inNet ? NET_KEY - 0.25 : p.owner ? p.y + 0.5 : p.y, f: () => this.drawPuck(ctx, p, fx, match) });
    const lf = L && L.frame(match, Assets.atlas.linesman);
    if (lf) list.push({ y: L.y, f: () => { const q = toScreen(L.x, L.y); Assets.draw(ctx, lf.id, q.x, q.y, SKATER_SCALE * persp(L.y), { flip: lf.flip, pages: Assets.pages }); } });
    for (const b of lap ? [] : match.barriers) list.push({ y: b.y, f: () => this.drawBarrier(ctx, b) });
    for (const k of lap || !match.twists.ice ? [] : match.twists.ice.chunks) list.push({ y: k.y, f: () => this.drawChunk(ctx, k) });
    for (const k of lap ? [] : match.pickups) list.push({ y: k.y, f: () => this.drawPickupOrb(ctx, k, fx) });
    for (const pt of fx.parts) if (pt.kind === 'ghost') list.push({ y: pt.s.y - 1, f: () => this.drawGhost(ctx, pt, match) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    if (!lap && match.twists.ice) for (const f of match.twists.ice.falls) this.drawIcicleFall(ctx, f); // (from the ceiling, over everyone)
    // near glass over anyone skating along the bottom boards (Pine Pond has snowbanks)
    const foreground = Assets.atlas.arena.glasses?.[arena];
    if (foreground) Assets.draw(ctx, foreground.frame, foreground.x, foreground.y, 1);
    else if (Assets.glass && arena !== 'pine_pond') ctx.drawImage(Assets.glass, Assets.atlas.arena.glass.x, Assets.atlas.arena.glass.y);
    if (arena === 'home') this.drawSupporters(ctx, fx, ui.save);
    else this.drawRivalSupporters(ctx, fx, ui.awayTeamId, arena);
    if (match.allstar && arena === 'home') this.drawAllStarDressing(ctx, fx, true);
    else if (arena === 'home') this.drawSeasonal(ctx, fx, true);

    this.drawParticles(ctx, fx);
    this.drawAnims(ctx, fx);
    this.drawBolts(ctx, fx);
    this.drawGoalLamp(ctx, match, fx);
    this.drawReticle(ctx, fx);
    if (!lap) this.drawRavens(ctx, match, fx);
    if (!lap) this.drawOverheads(ctx, match, fx);
    if (match.drill && match.drill.drawOver) match.drill.drawOver(ctx, this, match, fx, Assets);

    // screen space
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTexts(ctx, fx);
    this.drawSnow(ctx, fx);
    this.drawVignette(ctx, fx);
    if (this.clipOverlay) this.drawClipOverlay(ctx, fx);
    if (fx.flash) {
      ctx.globalAlpha = 0.55 * (1 - fx.flash.t / fx.flash.life);
      ctx.fillStyle = fx.flash.color;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }
  }

  // A Sniper drill target board (Batch T); false without the art, so the drill draws its own.
  drawSniperTarget(ctx, x, y, state, pulse = 0) {
    const A = Assets.atlas.art_additions, T = A && A.training_props && A.training_props.sniper_target;
    if (!T || !T[state]) return false;
    Assets.draw(ctx, T[state], x, y, Assets.atlas.art_draw_scales[T[state]] * (1 + pulse));
    return true;
  }

  // ------------------------------------------------------------ the resurfacer's lap
  drawResurfacer(ctx, lap) {
    const P = Assets.atlas.art_additions && Assets.atlas.art_additions.polish;
    if (!P || !P.resurfacer) return;
    const p = lap.pos(), s = toScreen(p.x, p.y);
    Assets.draw(ctx, lap.frame(P.resurfacer, (id) => { const f = Assets.frame(id); return !!(f && Assets.pages[f[0]]); }), s.x, s.y, 0.36 * persp(p.y)); // (the diagonals only once their page is in: the drill's)
  }

  // Freshly flooded ice: a wet sheen along the machine's path that dries over a few seconds.
  drawLapSheen(ctx, lap) {
    if (lap.persist) return this.drawCleanIce(ctx, lap);
    const tr = lap.trail;
    if (tr.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 50;
    for (let i = 1; i < tr.length; i++) {
      const a = Math.max(0, 1 - (lap.t - tr[i].t) / 7);
      if (!a) continue;
      ctx.strokeStyle = `rgba(232,248,255,${0.38 * a})`;
      ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y - 6); ctx.lineTo(tr[i].x, tr[i].y - 6); ctx.stroke();
    }
    ctx.restore();
  }

  // The Resurfacer drill: a frosty, scraped haze over the ice still to do, wiped clean (with a
  // wet sheen) wherever the machine has been. Kept on a canvas of its own, a stroke per new
  // stretch of its path.
  drawCleanIce(ctx, lap) {
    let L = lap.layer;
    if (!L) {
      const c = document.createElement('canvas'); c.width = BACKDROP.w; c.height = BACKDROP.h;
      const g = c.getContext('2d');
      // the haze over the area the drill counts: the drive area grown by the sweep
      const { X, Y0, Y1, R, SWEEP } = DRIVE, x = X + SWEEP, y0 = Y0 - SWEEP, y1 = Y1 + SWEEP, r = R + SWEEP, pts = [];
      const arc = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + (Math.PI / 2) * (i / 8); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
      arc(x - r, y0 + r, -Math.PI / 2); arc(x - r, y1 - r, 0); arc(-(x - r), y1 - r, Math.PI / 2); arc(-(x - r), y0 + r, Math.PI);
      g.beginPath();
      pts.forEach(([px, py], i) => { const s = toScreen(px, py); if (i) g.lineTo(s.x, s.y); else g.moveTo(s.x, s.y); });
      g.closePath();
      g.fillStyle = 'rgba(150,168,188,0.42)'; g.fill();
      g.save(); g.clip(); // skate scratches and snow in the haze
      const rng = makeRng(7);
      g.fillStyle = 'rgba(240,246,252,0.5)';
      for (let i = 0; i < 160; i++) { const s = toScreen((rng() * 2 - 1) * x, y0 + rng() * (y1 - y0)); g.beginPath(); g.ellipse(s.x, s.y, 6 + rng() * 14, 2 + rng() * 5, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(110,130,152,0.45)'; g.lineWidth = 1.5;
      for (let i = 0; i < 320; i++) { const s = toScreen((rng() * 2 - 1) * x, y0 + rng() * (y1 - y0)), a = rng() * Math.PI, l = 10 + rng() * 30; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a) * l, s.y + Math.sin(a) * l * 0.5); g.stroke(); }
      g.restore();
      L = lap.layer = { c, g, n: 1 };
    }
    const tr = lap.trail, g = L.g;
    if (tr.length >= 2 && L.n < tr.length) {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = DRIVE.SWEEP * 2;
      g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000';
      g.beginPath(); g.moveTo(tr[L.n - 1].x, tr[L.n - 1].y); for (let i = L.n; i < tr.length; i++) g.lineTo(tr[i].x, tr[i].y); g.stroke();
      g.restore();
      L.n = tr.length;
    }
    ctx.drawImage(L.c, 0, 0);
    // a wet sheen on the last few seconds of the path
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = DRIVE.SWEEP * 1.6;
    for (let i = Math.max(1, tr.length - 120); i < tr.length; i++) {
      const a = Math.max(0, 1 - (lap.t - tr[i].t) / 4);
      if (!a) continue;
      ctx.strokeStyle = `rgba(232,248,255,${0.32 * a})`;
      ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y - 4); ctx.lineTo(tr[i].x, tr[i].y - 4); ctx.stroke();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ environment
  drawLamps(ctx, fx) {
    const t = fx.time;
    const ar = this.arena || ARENAS.home;
    if (!ar.lamps) return; // outdoor rink
    const fl = ar.flicker || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < LAMPS.length; i++) {
      const [x, y] = LAMPS[i];
      const flick = 0.75 + (Math.sin(t * 7 * fl + i * 1.7) * 0.08 + Math.sin(t * 13 * fl + i) * 0.05) * fl;
      const goal = fx.lamp > 0 ? (fx.flashes ? (Math.sin(fx.lamp * 14) > 0 ? 1 : 0.4) : 0.6) : 0;
      const r = 34 + goal * 18;
      const g = ctx.createRadialGradient(x, y + 6, 0, x, y + 6, r);
      const col = goal ? fx.lampColor : ar.lamps;
      g.addColorStop(0, hexA(col, 0.45 * flick + goal * 0.3));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y + 6 - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  drawCrowd(ctx, fx, ui) {
    const t = fx.time;
    const ex = fx.excite;
    const awayColor = ui.awayColor || '#ff6f7d', awayColor2 = ui.awayColor2 || '#8261bd';
    const ch = fx.chant;
    // chant rhythm: 16 beats of 0.25s; claps on beats 8, 10, 12, 13, 14
    const beatPos = ch ? (ch.t / 0.25) % 16 : 0;
    const onClap = ch && [8, 10, 12, 13, 14].some((b) => beatPos >= b && beatPos < b + 0.6);
    const onWord = ch && [0, 2, 4, 5].some((b) => beatPos >= b && beatPos < b + 0.8);
    const sprites = Assets.atlas.crowd;
    // in a rival's building most of the crowd wears their colours
    const swap = !!(this.arena && this.arena !== ARENAS.home);
    const every = this.crowdShare < 1 ? Math.round(1 / this.crowdShare) : 1; // auto-quality: fewer fans
    let n = 0;
    for (const f of fx.crowd) {
      if (every > 1 && n++ % every) continue;
      const side = swap ? 1 - f.team : f.team; // (no copy per fan per frame: the garbage collector felt it)
      const chanting = ch && ch.team === side;
      const cheer = fx.cheerTeam === side || (chanting && (onClap || onWord));
      const amp = cheer ? 7 : 1 + ex * 3;
      const sp = cheer ? 16 : 3 + ex * 6;
      const bob = chanting ? (onClap || onWord ? 6 : 0) : Math.max(0, Math.sin(t * sp + f.phase)) * amp;
      const s = f.s;
      const x = f.x, y = f.y - bob;
      if (sprites && !f.back) {
        // far stands: sprite fans facing the ice (and the camera)
        const up = cheer || (ex > 0.6 && Math.sin(t * 5 + f.phase) > 0.3);
        const list = sprites[side ? 'away' : 'home'][up ? 'cheering' : 'sitting'];
        Assets.draw(ctx, list[f.fan], x, y - 4 * s, 0.18 * s, { pages: side ? this.awayPages : Assets.clubPages(), flip: f.phase > 3.14 });
        continue;
      }
      // near benches: fans seen from behind (Batch N sprites)
      const flag = f.flag && side === 0 && Assets.atlas.art_additions && Assets.atlas.art_additions.crowd_back_extras && Assets.atlas.art_additions.crowd_back_extras.home_flag;
      if (flag) { // a home fan waving the club flag
        Assets.draw(ctx, flag[Math.floor(t * (cheer ? 4 : 2) + f.phase) % 2], x, y + 5 * s, 0.155 * (s / 1.75), { pages: Assets.clubPages() });
        continue;
      }
      const backs = Assets.atlas.crowd_back;
      if (backs && backs[side ? 'away' : 'home']) {
        const team = side ? 'away' : 'home';
        const up = cheer || (ex > 0.6 && Math.sin(t * 5 + f.phase) > 0.3);
        const index = ((f.fan || 0) % 8 + 8) % 8;
        const scale = Assets.atlas.crowd_back_scale?.[team]?.[index] || 0.25;
        // the same fan and body size in both poses, feet on the bench
        Assets.draw(ctx, backs[team][up ? 'cheering' : 'sitting'][index], x, y + 5 * s, scale * (s / 1.75), { pages: side ? this.awayPages : Assets.clubPages() });
        continue;
      }
      // (drawn fans, for builds without those sprites), cached per pose
      const home = side === 0;
      const jersey = home ? (f.phase > 3 ? TEAMS.home.color : '#fff2cb') : (f.phase > 3 ? awayColor : awayColor2);
      const trim = home ? (f.phase > 3 ? '#fff2cb' : TEAMS.home.color) : (f.phase > 3 ? awayColor2 : awayColor);
      const up = cheer || (ex > 0.6 && Math.sin(t * 5 + f.phase) > 0.3);
      const sign = !!(f.sign && ex > 0.35);
      const K = Math.max(1, Math.min(4, Math.round(this.cam.zoom * this.dpr * 2) / 2)); // pixels per world unit
      const key = `${f.x}|${up}|${sign}|${jersey}|${trim}|${K}`;
      this.fanCache ||= new Map();
      let spr = this.fanCache.get(key);
      if (!spr) {
        spr = document.createElement('canvas');
        spr.width = Math.ceil(26 * s * K); spr.height = Math.ceil(42 * s * K);
        const c2 = spr.getContext('2d');
        c2.scale(K, K);
        this.drawNearFan(c2, f, 13 * s, 30 * s, s, jersey, trim, up, sign);
        if (this.fanCache.size > 300) this.fanCache.delete(this.fanCache.keys().next().value);
        this.fanCache.set(key, spr);
      }
      ctx.drawImage(spr, x - 13 * s, y - 30 * s, spr.width / K, spr.height / K);
    }
  }

  // The Stands facility unlocks the dedicated near-side supporters at home.
  drawSupporters(ctx, fx, save) {
    const level = (save?.facilities?.stands || 0), sets = Assets.atlas.crowd_supporters;
    if (level < 2 || !sets) return;
    const cheering = fx.cheerTeam === 0 && fx.lamp > 0;
    const phase = Math.floor(fx.time * (fx.chant?.team === 0 ? 4 : 1.3)) % 2;
    const positions = level >= 3 ? [['drummer', 575], ['capo', 675], ['banner', 820]] : [['drummer', 630], ['capo', 735]];
    for (const [key, x] of positions) {
      const set = sets[key], id = set && (cheering ? set.cheer : set.chant[phase]);
      if (id) Assets.draw(ctx, id, x, 935, set.render_scale, { pages: Assets.clubPages() });
      if (key === 'banner' && id) {
        const f = Assets.frame(id), region = Assets.atlas.overlay_regions?.[id]?.club_short_name;
        if (!f || !region) continue;
        ctx.save(); ctx.fillStyle = '#fff2cb'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `9px ${this.font}`;
        ctx.fillText(String(CLUB.short).toUpperCase().slice(0, 14), x + (region.x + region.w / 2 - f[5] / f[7]) * set.render_scale, 935 + (region.y + region.h / 2 - f[6] / f[7]) * set.render_scale, region.w * set.render_scale); ctx.restore();
      }
    }
  }

  drawRivalSupporters(ctx, fx, teamId, arena) {
    const team = TEAMS[teamId], club = team && (team.art || team.mark);
    const sets = club && team.arena === arena && Assets.atlas.rival_supporters?.[club];
    if (!sets) return;
    const cheering = fx.cheerTeam === 1 && fx.lamp > 0;
    const phase = Math.floor(fx.time * (fx.chant?.team === 1 ? 4 : 1.3)) % 2;
    for (const [role, x] of [['drummer', 575], ['capo', 675], ['banner', 820]]) {
      const set = sets[role], id = set && (cheering ? set.cheer : set.chant[phase]);
      if (!id) continue;
      Assets.draw(ctx, id, x, 935, set.render_scale, { pages: Assets.pagesFor(teamId) });
      const f = Assets.frame(id), region = Assets.atlas.overlay_regions?.[id]?.club_short_name;
      if (role !== 'banner' || !f || !region) continue;
      ctx.save(); ctx.fillStyle = '#fff2cb'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `9px ${this.font}`;
      ctx.fillText(String(team.short).toUpperCase(), x + (region.x + region.w / 2 - f[5] / f[7]) * set.render_scale, 935 + (region.y + region.h / 2 - f[6] / f[7]) * set.render_scale, region.w * set.render_scale); ctx.restore();
    }
  }

  // One fan seen from behind, at (x, y) = the middle of the shoulders.
  drawNearFan(ctx, f, x, y, s, jersey, trim, up, sign) {
    const NAVY = '#14233b';
    ctx.lineWidth = 1.6; ctx.strokeStyle = NAVY; ctx.lineJoin = 'round';
    const oval = (cx, cy, rx, ry, fill, from = 0, to = Math.PI * 2) => {
      ctx.beginPath(); ctx.ellipse(x + cx * s, y + cy * s, rx * s, ry * s, 0, from, to); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
    };
    if (sign) { // the back of a cardboard sign on a stick
      ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 0.6 * s, y - 16 * s, 1.2 * s, 8 * s);
      ctx.fillStyle = '#c9a878'; ctx.fillRect(x - 9 * s, y - 25 * s, 18 * s, 10 * s); ctx.strokeRect(x - 9 * s, y - 25 * s, 18 * s, 10 * s);
    }
    if (up) { // arms in the air
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * 5 * s, y - 1 * s); ctx.lineTo(x + side * 7.5 * s, y - 12 * s);
        ctx.lineWidth = 3.4 * s; ctx.strokeStyle = NAVY; ctx.stroke(); ctx.lineWidth = 2 * s; ctx.strokeStyle = jersey; ctx.stroke();
        oval(side * 7.6, -12.5, 1.7, 1.7, f.skin);
      }
      ctx.lineWidth = 1.6; ctx.strokeStyle = NAVY;
    }
    // sloping shoulders and back, a stripe across the jersey
    oval(0, 5, 8, 7.5, jersey, Math.PI, Math.PI * 2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y + 5 * s, 8 * s, 7.5 * s, 0, Math.PI, Math.PI * 2); ctx.clip();
    ctx.fillStyle = trim; ctx.fillRect(x - 8 * s, y + 0.5 * s, 16 * s, 1.8 * s); ctx.restore();
    if (f.scarf) oval(0, -2.2, 4.6, 1.6, trim);
    // the back of the head: hair, or a beanie with a pompom
    if (!f.hat) { oval(-4.6, -6.5, 1.1, 1.6, f.skin); oval(4.6, -6.5, 1.1, 1.6, f.skin); }
    oval(0, -7, 4.8, 5, f.hair);
    if (f.hat) {
      oval(0, -7.6, 5, 4.6, f.hat, Math.PI, Math.PI * 2);
      ctx.fillStyle = trim; ctx.fillRect(x - 4.9 * s, y - 8.4 * s, 9.8 * s, 1.6 * s); ctx.strokeRect(x - 4.9 * s, y - 8.4 * s, 9.8 * s, 1.6 * s);
      oval(0, -12.6, 1.5, 1.5, f.hat === '#fff2cb' ? TEAMS.home.color : '#fff2cb');
    }
  }

  // Hanging team banners and the Snow Fox at home, and the scoreboard in the icy buildings.
  drawArenaProps(ctx, match, fx, ui, arena) {
    const A = Assets.atlas.arena;
    if (!A) return;
    const t = fx.time;
    if (arena === 'home' && A.banners) {
      const vis = TEAMS[ui.awayTeamId] && A.banners[TEAMS[ui.awayTeamId].art || TEAMS[ui.awayTeamId].mark];
      const spots = [[102, 36, 0], [1433, 36, 1], [120, 856, 1], [1417, 850, 0]];
      spots.forEach(([x, y, theirs], i) => {
        const id = theirs && vis ? vis : A.banners.glacial_strikers;
        Assets.draw(ctx, id, x, y, 0.185, { rot: Math.sin(t * 1.3 + i * 1.7) * 0.025, pages: Assets.clubPages() });
      });
    }
    if (arena === 'home' && ui && ui.save) this.drawRafters(ctx, ui.save, t);
    if (arena === 'home' && A.mascot) {
      const party = (fx.cheerTeam === 0 && fx.lamp > 0) || (fx.chant && fx.chant.team === 0);
      let pose = 'idle';
      if (party) pose = Math.floor(t * 4) % 2 ? 'cheer_a' : 'cheer_b';
      else if (fx.excite > 0.55 || Math.floor(t / 3) % 4 === 0) pose = Math.floor(t * 2) % 2 ? 'wave' : 'idle';
      const S = Assets.atlas.seasonal, sz = seasonFor(), costume = S && sz && S[sz] && S[sz].mascot; // (dressed up for the season, Batch CF)
      const M = costume && costume[pose] && Assets.frame(costume[pose]) && Assets.pages[Assets.frame(costume[pose])[0]] ? costume : A.mascot;
      Assets.draw(ctx, M[pose], 768, 950 - (party ? Math.abs(Math.sin(t * 8)) * 6 : 0), 0.125, M === A.mascot ? { pages: Assets.clubPages() } : {}); // (a costume: its own colours)
    }
    // the host's mascot dances where the Snow Fox does at home
    const host = A.mascot_arenas && A.mascot_arenas[arena];
    const mascot = host && A.rival_mascots && A.rival_mascots[host];
    const hostTeam = mascot && Object.values(TEAMS).find((tm) => tm.art === host || tm.mark === host);
    if (hostTeam) {
      const playing = ui.awayTeamId === hostTeam.id; // only cheers for its own team
      const party = playing && ((fx.cheerTeam === 1 && fx.lamp > 0) || (fx.chant && fx.chant.team === 1));
      let pose = 'idle';
      if (party) pose = Math.floor(t * 4) % 2 ? 'cheer_a' : 'cheer_b';
      else if (fx.excite > 0.55 || Math.floor(t / 3) % 4 === 0) pose = Math.floor(t * 2) % 2 ? 'wave' : 'idle';
      Assets.draw(ctx, mascot[pose], mascot.foot.x, mascot.foot.y - (party ? Math.abs(Math.sin(t * 8)) * 6 : 0), mascot.source_scale, { pages: Assets.pagesFor(hostTeam.id) });
    }
    if (match.classic && arena === 'pine_pond') this.drawWinterClassic(ctx, fx);
    // the Harbour Rink's gulls wheeling over the far stands and the lighthouse's beam (Batch CN):
    // { gulls: { frames, y, scale, speed, fps }, beam: { frame, x, y, scale, period } }
    const H = arena === 'harbour_rink' && A.harbour;
    if (H && H.beam && Assets.frame(H.beam.frame)) {
      const a = Math.sin((t * Math.PI * 2) / (H.beam.period || 8));
      Assets.draw(ctx, H.beam.frame, H.beam.x, H.beam.y, H.beam.scale || 0.5, { alpha: 0.35 + 0.35 * Math.max(0, a), flip: a < 0 });
    }
    if (H && H.gulls && H.gulls.frames) for (let i = 0; i < 3; i++) {
      const g = H.gulls, span = 1900, x = ((t * (g.speed || 50) * (i % 2 ? -1 : 1) + i * 620) % span + span) % span - 180;
      Assets.draw(ctx, g.frames[Math.floor(t * (g.fps || 6) + i) % g.frames.length], x, g.y + i * 26 + Math.sin(t * 1.3 + i) * 12, g.scale || 0.4, { flip: i % 2 === 1 });
    }
    // the Harbour Rink's windsock (Batch CM): limp, lifting, then streaming in a gust
    const sock = arena === 'harbour_rink' && A.windsock, wind = match.twists && match.twists.wind;
    if (sock && sock.frames) {
      const k = wind && wind.gust > 0 ? Math.min(1, wind.gust / 0.6, (wind.len - wind.gust) / 0.6) : 0;
      Assets.draw(ctx, sock.frames[k > 0.66 ? 2 : k > 0.2 ? 1 : 0], sock.x, sock.y, sock.scale || 0.5, { flip: !!(wind && wind.dir < 0 && k > 0.2) });
    }
    if (match.allstar && arena === 'home') this.drawAllStarDressing(ctx, fx, false);
    else if (arena === 'home') this.drawSeasonal(ctx, fx, false); // (Halloween, the holidays: Batch CD)
    const board = (A.scoreboards && A.scoreboards[arena]) || (arena === 'ember_dome' ? A.scoreboard_volcanic : A.scoreboard);
    if (board) this.drawScoreboard(ctx, match, fx, board);
    this.drawGlassFans(ctx, fx);
    this.drawCameraFlashes(ctx, fx);
  }

  // The club's history in the rafters at home: a banner for every Frostline Cup (left of the
  // scoreboard) and every Hall of Fame number (right of it), newest nearest the middle. Batch
  // BS's cloth when it's in, a painted pennant until then; the season, number and name are
  // written on.
  drawRafters(ctx, save, time) {
    const cups = cupBanners(save).slice(-4), hall = (save.hall || []).slice(-4);
    if (!cups.length && !hall.length) return;
    const art = (k) => { const id = `rafters/${k}_banner_${Math.floor(time * 1.3) % 2 ? 'b' : 'a'}`; return Assets.frame(id) && Assets.pages[Assets.frame(id)[0]] ? id : null; };
    const LEFT = [580, 470, 360, 250], RIGHT = [956, 1066, 1176, 1286];
    const one = (x, i, kind, big, small) => {
      const sway = Math.sin(time * 1.3 + i * 1.7) * 0.025, id = art(kind);
      ctx.save();
      ctx.translate(x, 36); ctx.rotate(sway);
      if (id) Assets.draw(ctx, id, 0, 0, 0.185, kind === 'number' ? { pages: Assets.clubPages() } : {});
      else { // a pennant: navy cloth, a gold edge, a point at the bottom
        ctx.fillStyle = kind === 'cup' ? '#14233b' : '#1d3253';
        ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(30, 66); ctx.lineTo(0, 84); ctx.lineTo(-30, 66); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // the words: the cup banner's band, the number banner's chest and name strip
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = id && kind === 'cup' ? '#14233b' : '#ffd45e';
      // (the cup's season goes low on the cloth, clear of the scoreboard over the top of the screen)
      const f = id && Assets.frame(id), regions = id && Assets.atlas.overlay_regions?.[id];
      const r = regions?.[kind === 'number' ? 'number' : 'season'];
      ctx.font = `${r ? (kind === 'number' ? 22 : 9) : kind === 'number' ? 30 : 15}px ${this.font}`;
      if (r) ctx.fillText(big, (r.x + r.w / 2 - f[5] / f[7]) * 0.185, (r.y + r.h / 2 - f[6] / f[7]) * 0.185, r.w * 0.185);
      else ctx.fillText(big, 0, kind === 'number' ? 30 : id ? 70 : 52);
      if (small && (!regions || kind === 'number')) {
        ctx.font = `${regions ? 8 : 11}px ${this.font}`; ctx.fillStyle = '#14233b';
        const n = regions?.name;
        if (n) ctx.fillText(small, (n.x + n.w / 2 - f[5] / f[7]) * 0.185, (n.y + n.h / 2 - f[6] / f[7]) * 0.185, n.w * 0.185);
        else ctx.fillText(small, 0, kind === 'number' ? 55 : id ? 82 : 26);
      }
      ctx.restore();
    };
    cups.slice().reverse().forEach((season, i) => one(LEFT[i], i, 'cup', season ? t('SEASON {n}', { n: season }) : t('CHAMPIONS'), t('FROSTLINE CUP')));
    hall.slice().reverse().forEach((h, i) => one(RIGHT[i], i + 4, 'number', String(h.number), String(h.name).toUpperCase().slice(0, 10)));
  }

  // Pine Pond dressed for the Winter Classic (Batch W): a banner over the far snowbank, string
  // lights, fire barrels in the corners and fans in toques and blankets.
  drawWinterClassic(ctx, fx) {
    const art = Assets.atlas.winter_classic, fans = Assets.atlas.winter_crowd;
    const f0 = art && art.banner && Assets.frame(art.banner.frames[0]);
    if (!f0 || !Assets.pages[f0[0]]) return;
    const p = art.placement, t = fx.time, phase = Math.floor(t * 2) % 2;
    const place = (set, i, foot, opts) => Assets.draw(ctx, set.frames[((i % set.frames.length) + set.frames.length) % set.frames.length], foot.x, foot.y, set.source_scale, opts);
    place(art.banner, phase, p.banner_foot);
    for (const run of [...p.far_light_runs, ...p.near_light_runs]) for (let i = 0; i < run.tiles; i++) place(art.lights, phase + i, { x: run.x + 32 + i * 64, y: run.y });
    p.barrel_feet.forEach((foot, i) => place(art.barrels, Math.floor(t * 6) + i, foot));
    const cheering = fx.cheerTeam !== null && fx.lamp > 0;
    p.fan_feet.forEach((foot, i) => {
      const kit = i < 2 ? 'home' : 'away';
      const id = fans && fans[kit] && fans[kit][cheering && fx.cheerTeam === (i < 2 ? 0 : 1) ? 'cheering' : 'sitting'];
      const fid = id && id[i % id.length];
      // (home fans are on the winter pages, which load after the club colours are made: drawn as painted)
      if (fid) Assets.draw(ctx, fid, foot.x, foot.y - (cheering ? Math.abs(Math.sin(t * 8 + i)) * 3 : 0), 0.15, kit === 'away' ? { pages: this.awayPages } : {});
    });
  }

  // The home rink on All-Star night (Batch AB): the star banner over the far glass and star
  // bunting along the far boards, then (near) the bunting on the near boards, over the players.
  drawAllStarDressing(ctx, fx, near) { this.drawDressing(ctx, fx, Assets.atlas.allstar, near); }

  // The home rink by the calendar (seasonal.js, Batch CD): the All-Star dressing's banner and
  // bunting, plus props standing at backdrop spots ({ frames, x, y, scale, fps }) and flyers
  // crossing the rafters ({ frames, y, scale, speed, fps }). Nothing until its art is in.
  drawSeasonal(ctx, fx, near) {
    const S = Assets.atlas.seasonal, season = seasonFor(), A = S && season && S[season];
    if (!A) return;
    this.drawDressing(ctx, fx, A, near);
    if (near) return;
    // the banner's lettering: its middle is left blank for the game to write (in either language)
    const b = A.banner_rect_backdrop, f0 = A.banner && Assets.frame(A.banner[0]);
    if (b && f0 && Assets.pages[f0[0]]) {
      const text = season === 'halloween' ? t('Spooky season!') : t('Happy holidays!');
      ctx.save(); ctx.font = `22px ${this.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#14233b'; ctx.fillStyle = season === 'halloween' ? '#ffb347' : '#fff2cb';
      const x = b.x + b.w / 2, y = b.y + b.h / 2 + 4;
      ctx.strokeText(text, x, y, b.w * 0.5); ctx.fillText(text, x, y, b.w * 0.5);
      ctx.restore();
    }
    const at = (list, i, fps = 2) => list[Math.floor(fx.time * fps + i) % list.length];
    (A.props || []).forEach((p, i) => { if (p.frames && p.frames.length) Assets.draw(ctx, at(p.frames, i, p.fps), p.x, p.y, p.scale || 0.5); });
    (A.flyers || []).forEach((b, i) => {
      if (!b.frames || !b.frames.length) return;
      const span = 1800, x = ((fx.time * (b.speed || 60) + i * 700) % span) - 130; // (across and round again, off screen in between)
      Assets.draw(ctx, at(b.frames, i, b.fps || 8), x, b.y + Math.sin(fx.time * 3 + i) * 10, b.scale || 0.4);
    });
  }

  drawDressing(ctx, fx, A, near) {
    const f0 = A && A.banner && Assets.frame(A.banner[0]);
    if (!f0 || !Assets.pages[f0[0]]) return;
    const phase = Math.floor(fx.time * 2) % 2; // the cloth sways at 2 fps
    const strip = (r, i) => {
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); // never onto the ice
      for (let x = r.x; x < r.x + r.w; x += 64) Assets.draw(ctx, A.bunting[(phase + i) % 2], x + 32, r.y + r.h / 2, 0.5);
      ctx.restore();
    };
    const [far, nearRun] = A.bunting_rects_backdrop;
    if (near) { strip(nearRun, 1); return; }
    const b = A.banner_rect_backdrop;
    Assets.draw(ctx, A.banner[phase], b.x + b.w / 2, b.y + b.h / 2, 0.5);
    strip(far, 0);
  }

  // The penalty boxes built into the far boards (Batch P), or null without the art.
  penaltyBox() {
    const A = Assets.atlas.arena;
    const variant = Object.keys(ARENAS).find((key) => ARENAS[key] === this.arena);
    const box = A && (A.penalty_boxes?.[variant] || (this.arena === ARENAS.pine_pond && A.penalty_box_pond?.frames ? A.penalty_box_pond : A.penalty_box));
    return box && box.frames ? box : null;
  }
  boxSpot(s) {
    const box = this.penaltyBox(), f = box && box.foot_positions[s.team];
    return f ? { x: f.x, y: f.y - 8 } : toScreen(s.x, s.y);
  }

  // Each team's box: the back wall and bench, whoever is serving time, then the boards, door
  // and front glass over their legs, and the red light blinking while the penalty runs. The
  // door swings open for a moment as a skater goes in or comes out.
  drawPenaltyBoxes(ctx, match, fx, box) {
    this.boxIn ||= [false, false];
    this.boxDoor ||= [0, 0];
    const opts = { squash: box.runtime_squash };
    box.foot_positions.forEach((f, team) => {
      const inside = match.skaters.filter((s) => s.team === team && s.boxT > 0);
      if (!!inside.length !== this.boxIn[team]) { this.boxIn[team] = !!inside.length; this.boxDoor[team] = fx.time + 0.45; }
      Assets.draw(ctx, box.frames.back, f.x, f.y, box.source_scale, opts);
      for (const s of inside) this.drawSkater(ctx, s, match, fx, this.boxSpot(s));
      Assets.draw(ctx, box.frames[fx.time < this.boxDoor[team] ? 'front_open' : 'front_closed'], f.x, f.y, box.source_scale, opts);
      if (inside.length && Math.floor(fx.time * 3) % 2 === 0) Assets.draw(ctx, box.frames.light_on, f.x, f.y, box.source_scale, opts);
    });
  }

  // After a goal, fans run down to the far glass behind that net and bang on it.
  drawGlassFans(ctx, fx) {
    const g = fx.glassFans;
    const A = Assets.atlas.art_additions && Assets.atlas.art_additions.arena_additions;
    const ids = g && A && A[g.team === 0 ? 'b_glass_home' : 'b_glass_away'];
    if (!ids) return;
    const pages = g.team === 0 ? Assets.clubPages() : this.awayPages;
    const c = toScreen(g.side * 470, RINK.minY);
    const rail = c.y - 42; // top of the far boards, where the glass starts
    const rise = Math.min(1, g.t / 0.25), fade = Math.min(1, (g.life - g.t) / 0.4);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, BACKDROP.w, rail - 1); ctx.clip(); // legs hidden behind the boards
    for (let i = 0; i < 4; i++) {
      const bang = Math.abs(Math.sin(g.t * 9 + i * 1.3)) * 3;
      Assets.draw(ctx, ids[(i + g.seed) % ids.length], c.x + (i - 1.5) * 25, rail + 5 + (1 - rise) * 26 - bang, 0.05, { pages, alpha: 0.9 * fade, flip: (i + g.seed) % 3 === 0 });
    }
    ctx.restore();
  }

  // Camera flashes popping in the far stands on big moments.
  drawCameraFlashes(ctx, fx) {
    const A = Assets.atlas.art_additions && Assets.atlas.art_additions.arena_additions;
    const id = A && A.b_flash && A.b_flash[0];
    if (!id) return;
    for (const c of fx.cams) {
      if (c.t < 0) continue;
      const k = 1 - c.t / 0.2;
      Assets.draw(ctx, id, c.x, c.y, 0.006 + 0.012 * k, { alpha: k, blend: 'lighter' });
    }
  }

  // Scoreboard hanging over the far stairs, with the live score drawn into its displays.
  drawScoreboard(ctx, match, fx, sb) {
    const S = 0.09, X = 768, Y = 0;
    Assets.draw(ctx, sb.frames?.[Math.floor(fx.time * 2) % sb.frames.length] || sb.frame, X, Y, S);
    const put = (f, text, color) => {
      ctx.font = `${f.font_size * S}px ${this.font}`;
      ctx.fillStyle = color || sb.color;
      ctx.fillText(text, X + (f.x + f.w / 2 - sb.pivot[0]) * S, Y + (f.y + f.h / 2 - sb.pivot[1]) * S + 0.5);
    };
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    put(sb.fields.home_score, String(match.score[0]));
    put(sb.fields.away_score, String(match.score[1]));
    const g = match.lastGoal;
    if ((match.state === 'goal' || match.state === 'over') && g) {
      if (!fx.flashes || Math.floor(fx.time * 4) % 2) put(sb.fields.clock, match.state === 'over' ? t('FINAL') : t('GOAL!'), g.team === 0 ? '#71dce8' : '#ff6f7d');
    } else {
      const s = Math.floor(match.time || 0);
      put(sb.fields.clock, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    }
    put(sb.fields.period, `FT${match.winScore || 5}`);
    ctx.restore();
  }

  drawTwists(ctx, match, fx) {
    const tw = match.twists;
    if (!tw || tw.kind === 'none') return;
    const t = fx.time;
    const art = this.ruleArt();
    const aurora = tw.kind === 'aurora_lanes';
    const tiles = art && (aurora ? art.lane : art.speed_lane);
    for (const l of tw.lanes) if (tiles) this.drawLaneTiles(ctx, l, t, tiles, 1); else this.drawLane(ctx, l, t, aurora, 1);
    if (aurora && tw.next) {
      // the next lanes flicker in before the lights shift
      const blink = 0.35 + Math.max(0, Math.sin(t * 12)) * 0.4;
      for (const l of tw.next) if (tiles) this.drawLaneTiles(ctx, l, t, tiles, blink, true); else this.drawLane(ctx, l, t, true, blink, true);
    }
    for (const p of tw.pools) if (art) this.drawPoolArt(ctx, p, t, art); else this.drawPool(ctx, p, t);
    for (const c of tw.cracks) if (art) this.drawCrackArt(ctx, c, art); else this.drawCrack(ctx, c, tw);
    for (const st of tw.strips) this.drawStrip(ctx, st, match, art);
    for (const z of tw.shadows) this.drawShadowZone(ctx, z, t, art);
    if (tw.beam) this.drawMoonbeam(ctx, tw.beam, t);
    for (const pl of tw.planks) this.drawPlank(ctx, pl, t);
    if (tw.wind && tw.wind.gust > 0) this.drawGust(ctx, tw.wind, t);
    if (tw.ice) for (const f of tw.ice.falls) this.drawIcicleShadow(ctx, f, t);
  }

  // The Glacier Cave's art (Batch CP), once its page is in: arena_glacier/icicle_fall_1..3,
  // icicle_shatter_1..3 and ice_chunk.
  glacierFrame(id) {
    const f = Assets.frame('arena_glacier/' + id);
    return f && Assets.pages[f[0]] ? f : null;
  }

  // A falling icicle's shadow on the ice: growing and darkening, with a blinking ring round it.
  drawIcicleShadow(ctx, f, t) {
    const k = Math.min(1, f.t / ICICLE.warn), s = toScreen(f.x, f.y), r = (8 + ICICLE.r * k) * persp(f.y);
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(1, 0.42);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20,45,80,${0.12 + 0.38 * k})`; ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${(0.25 + 0.45 * Math.abs(Math.sin(t * 9))) * k})`; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  // The icicle itself, dropping in the last 0.4 s before it lands.
  drawIcicleFall(ctx, f) {
    const drop = (f.t - (ICICLE.warn - 0.4)) / 0.4;
    if (drop < 0) return;
    const s = toScreen(f.x, f.y), q = persp(f.y), h = (1 - drop * drop) * 320;
    const art = this.glacierFrame('icicle_fall_1');
    if (art) {
      const id = 'arena_glacier/icicle_fall_' + (1 + Math.min(2, Math.floor(drop * 3)));
      Assets.draw(ctx, id, s.x, s.y - h, (58 * q) / (art[4] / art[7]));
      return;
    }
    ctx.save();
    ctx.translate(s.x, s.y - h); ctx.scale(q, q);
    ctx.beginPath(); ctx.moveTo(-3, -150); ctx.lineTo(-3, -70); ctx.moveTo(3, -140); ctx.lineTo(3, -70);
    ctx.strokeStyle = 'rgba(70,120,170,0.35)'; ctx.lineWidth = 2; ctx.stroke(); // (a streak behind it)
    ctx.beginPath(); ctx.moveTo(-11, -62); ctx.lineTo(11, -62); ctx.lineTo(1.5, 0); ctx.lineTo(-1.5, 0); ctx.closePath();
    ctx.fillStyle = '#bfe7fb'; ctx.fill();
    ctx.strokeStyle = '#2c6a99'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5, -58); ctx.lineTo(-1.5, -10);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  // A chunk of ice left on the rink, bursting into shards for a moment as it lands.
  drawChunk(ctx, k) {
    const s = toScreen(k.x, k.y), q = persp(k.y);
    const burst = k.t < 0.36 && this.glacierFrame('icicle_shatter_1');
    if (burst) Assets.draw(ctx, 'arena_glacier/icicle_shatter_' + (1 + Math.floor(k.t / 0.12)), s.x, s.y, (90 * q) / (burst[3] / burst[7]));
    const art = this.glacierFrame('ice_chunk');
    if (art) { Assets.draw(ctx, 'arena_glacier/ice_chunk', s.x, s.y, (k.r * 2.7 * q) / (art[3] / art[7]), { flip: k.v % 2 === 1 }); return; }
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(q * (k.v % 2 ? -1 : 1), q);
    ctx.beginPath(); ctx.ellipse(0, 2, 19, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,50,90,0.28)'; ctx.fill();
    const pts = [[-17, 0], [-13, -12], [-4, -19], [8, -15], [17, -5], [14, 3], [1, 6], [-11, 5]];
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = '#bfe7fb'; ctx.fill();
    ctx.strokeStyle = '#3f7fae'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-3, -16); ctx.lineTo(5, -12); ctx.lineTo(-4, -6); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    ctx.restore();
  }

  // A gust off the sea (the Harbour Rink): streaks of blown snow racing down the ice, thicker
  // as it builds and thinning as it dies.
  drawGust(ctx, w, t) {
    const k = Math.min(1, w.gust / 0.6, (w.len - w.gust) / 0.6);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const y = -260 + ((i * 97) % 560), speed = 900 + (i % 5) * 160, len = 40 + (i % 7) * 14;
      const x = ((((t * speed + i * 211) % 1700) + 1700) % 1700) - 850; // (wrapping round the rink)
      const a = toScreen(w.dir * x, y), b = toScreen(w.dir * (x - len), y + 6);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(70,110,150,${0.22 * k})`; ctx.lineWidth = 4 + (i % 2); ctx.stroke(); // (a soft shadow, so it reads on white ice)
      ctx.strokeStyle = `rgba(255,255,255,${(0.55 + (i % 3) * 0.15) * k})`; ctx.lineWidth = 1.6 + (i % 2); ctx.stroke();
    }
    ctx.restore();
  }

  // The expansion buildings' rule art (Batch AY), once the rule pages are in.
  expansionArt(kind) {
    const R = Assets.atlas.expansion_rules && Assets.atlas.expansion_rules[kind];
    const probe = R && Object.values(R)[0][0], f = probe && Assets.frame(probe);
    return f && Assets.pages[f[0]] ? R : null;
  }

  // Moonbeams: the shaft of light from the telescope and its pool on the ice (the pool is
  // the bottom left of the art, the shaft rising to the right), shimmering. In code, a soft
  // pool, until the art is in.
  drawMoonbeam(ctx, b, t) {
    const s = toScreen(b.x, b.y), art = this.expansionArt('moonbeams');
    if (art) {
      const frames = art.moonbeams, id = frames[Math.floor(t * 5) % frames.length];
      const k = 1.06 * persp(b.y), sq = 1.35; // (the pool in the art is about 360 px wide)
      Assets.draw(ctx, id, s.x + 36 * k, s.y - 77 * k * sq, k, { squash: sq, alpha: 0.9 });
      return;
    }
    const rx = b.rx * persp(b.y), shimmer = 0.85 + Math.sin(t * 1.7) * 0.15;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(1, b.ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(170,205,255,${0.32 * shimmer})`); g.addColorStop(0.7, `rgba(150,195,255,${0.18 * shimmer})`); g.addColorStop(1, 'rgba(150,195,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Loose planks: wooden stretches of the boards, rattling when the puck hits them. The side
  // art lies along the far and near boards; the end art, a curved stretch, stands along the
  // end boards turned toward the ice. In code until the art is in.
  drawPlank(ctx, pl, t) {
    const art = this.expansionArt('loose_planks'), rattling = pl.rattle > 0;
    const side = pl.side === 'far' || pl.side === 'near';
    if (art) {
      const frames = side ? art.planks_side : art.planks_end;
      const id = rattling ? frames[1 + (Math.floor(t * 18) % 2)] : frames[0];
      if (side) {
        const by = pl.side === 'far' ? RINK.minY : RINK.maxY, mid = toScreen((pl.a0 + pl.a1) / 2, by);
        const k = ((pl.a1 - pl.a0) * persp(by)) / 227, sq = 0.46; // (the board in the art is 227 px long, its foot 51 px under the pivot)
        const foot = pl.side === 'far' ? mid.y + 1 : mid.y + 20;
        Assets.draw(ctx, id, mid.x - 14.5 * k, foot - 51 * k * sq, k, { squash: sq });
      } else {
        const dir = pl.side === 'left' ? -1 : 1, mid = toScreen(RINK.maxX * dir, (pl.a0 + pl.a1) / 2);
        const k = (pl.a1 - pl.a0) / 248, sq = 0.6;
        Assets.draw(ctx, id, mid.x + dir * 8, mid.y, k, { squash: sq, rot: dir * -Math.PI / 2 });
      }
      return;
    }
    const jig = rattling ? Math.round(Math.sin(t * 70) * 2 * Math.min(1, pl.rattle * 3)) : 0;
    ctx.save();
    if (side) {
      const by = pl.side === 'far' ? RINK.minY : RINK.maxY, h = 16;
      const a = toScreen(pl.a0, by), b = toScreen(pl.a1, by), y = (pl.side === 'far' ? a.y - h : a.y) + jig;
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(a.x, y, b.x - a.x, h);
      ctx.fillStyle = '#b07a3e'; ctx.fillRect(a.x, y, b.x - a.x, 3);
      ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x + 0.5, y + 0.5, b.x - a.x - 1, h - 1);
      for (let x = a.x + 14; x < b.x - 4; x += 14) { ctx.beginPath(); ctx.moveTo(x + 0.5, y + 1); ctx.lineTo(x + 0.5, y + h - 1); ctx.stroke(); }
    } else {
      const dir = pl.side === 'left' ? -1 : 1, x = RINK.maxX * dir;
      const a = toScreen(x, pl.a0), b = toScreen(x, pl.a1), w = 9, x0 = (dir < 0 ? a.x - 2 : a.x - w + 2) + jig;
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x0, a.y, w, b.y - a.y);
      ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 0.5, a.y + 0.5, w - 1, b.y - a.y - 1);
      for (let y = a.y + 14; y < b.y - 4; y += 14) { ctx.beginPath(); ctx.moveTo(x0 + 1, y + 0.5); ctx.lineTo(x0 + w - 1, y + 0.5); ctx.stroke(); }
    }
    ctx.restore();
  }

  // The rule sprites (Batches I, S and T), once their pages are in (drawn in code until then).
  ruleArt() {
    const A = Assets.atlas.art_additions;
    const R = A && A.arena_rules;
    const f = R && R.pool && Assets.frame(R.pool[0]);
    if (!f || !Assets.pages[f[0]]) return null;
    return (this.ruleSet ||= { ...R, ...(A.new_arena_rules || {}) });
  }

  // Rumble strips: the ridged tile along the boards, rattling while someone rides it fast.
  drawStrip(ctx, st, match, art) {
    const a = toScreen(st.x0, st.y), b = toScreen(st.x1, st.y);
    const busy = match.skaters.some((s) => s.speed > 150 && match.stripAt(s.x, s.y) === st);
    if (art && art.rumble_strip) { this.drawLaneTiles(ctx, { ...st, dir: 1 }, 0, [art.rumble_strip[busy ? 1 : 0]], 1, false, 0); return; }
    ctx.save();
    ctx.fillStyle = busy ? 'rgba(255,212,94,0.45)' : 'rgba(255,212,94,0.28)';
    ctx.fillRect(a.x, a.y - st.h / 2, b.x - a.x, st.h);
    ctx.strokeStyle = 'rgba(120,80,20,0.55)'; ctx.lineWidth = 2;
    for (let x = a.x + 4; x < b.x; x += 9) { ctx.beginPath(); ctx.moveTo(x, a.y - st.h / 2 + 3); ctx.lineTo(x, a.y + st.h / 2 - 3); ctx.stroke(); }
    ctx.restore();
  }

  // A raven's shadow drifting over the ice (the raven itself is drawn overhead, later).
  drawShadowZone(ctx, z, t, art) {
    const s = toScreen(z.x, z.y), rx = z.rx * persp(z.y);
    const frames = art && art.shadow_zone;
    if (frames) {
      const id = frames[Math.floor(t * 4) % frames.length], f = Assets.frame(id);
      const k = (2.1 * rx) / (f[3] / f[7]);
      Assets.draw(ctx, id, s.x, s.y, k, { squash: (2.1 * z.ry) / ((f[4] / f[7]) * k), alpha: 0.75 });
      return;
    }
    ctx.save();
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rx);
    g.addColorStop(0, 'rgba(30,18,50,0.55)'); g.addColorStop(1, 'rgba(30,18,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, z.ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // The ravens circling high over the Dark Aerie, above their shadows.
  drawRavens(ctx, match, fx) {
    const tw = match.twists;
    if (!tw || !tw.shadows.length) return;
    const art = this.ruleArt(), frames = art && art.flying_raven;
    if (!frames) return;
    for (const z of tw.shadows) {
      const s = toScreen(z.x, z.y);
      const left = -Math.sin(z.ph + tw.t * z.w) * z.w < 0; // which way it's flying round
      Assets.draw(ctx, frames[Math.floor(fx.time * 8 + z.ph) % frames.length], s.x + 24, s.y - 170, Assets.atlas.art_draw_scales[frames[0]] * 1.3, { flip: left });
    }
  }

  // Lanes and strips: a tile repeated along the lane, scrolling the way it pushes.
  drawLaneTiles(ctx, l, t, frames, alpha, ghost, speed = 45) {
    const a = toScreen(l.x0, l.y), b = toScreen(l.x1, l.y);
    const id = frames[Math.floor(t * 8) % frames.length];
    const f = Assets.frame(id);
    const len = b.x - a.x, n = Math.max(1, Math.round(len / 64)), w = len / n;
    const k = w / (f[3] / f[7]);
    const squash = l.h / ((f[4] / f[7]) * k);
    const off = ((t * speed) % w) * l.dir;
    ctx.save();
    ctx.beginPath(); ctx.rect(a.x, a.y - l.h / 2, len, l.h); ctx.clip();
    ctx.globalAlpha = alpha;
    for (let i = -1; i <= n; i++) Assets.draw(ctx, id, a.x + (i + 0.5) * w + off, a.y, k, { squash, flip: l.dir < 0 });
    ctx.restore();
    if (ghost) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = `rgba(220,255,240,${0.8 * alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(a.x, a.y - l.h / 2 + 3, len, l.h - 6);
      ctx.restore();
    }
  }

  // Meltwater: the pool's ripple loop stretched over the pool, with steam rising off it.
  drawPoolArt(ctx, p, t, R) {
    const s = toScreen(p.x, p.y);
    const id = R.pool[Math.floor(t * 5 + p.ph * 3) % R.pool.length];
    const f = Assets.frame(id);
    const rx = p.rx * persp(p.y);
    const k = (2.15 * rx) / (f[3] / f[7]);
    Assets.draw(ctx, id, s.x, s.y, k, { squash: (2.15 * p.ry) / ((f[4] / f[7]) * k) });
    this.drawSteam(ctx, s, rx, t, p.ph);
  }

  // Pond cracks: one of three crack drawings per crack, at the growth stage its size has reached.
  drawCrackArt(ctx, c, R) {
    const s = toScreen(c.x, c.y);
    const variant = Math.abs(Math.round(c.x * 13 + c.y * 7)) % 3;
    const stage = c.r < 36 ? 0 : c.r < 50 ? 1 : c.r < 62 ? 2 : 3;
    Assets.draw(ctx, R.cracks[variant * 4 + stage], s.x, s.y, 0.5 * persp(c.y), { squash: 0.85 });
  }

  drawLane(ctx, l, t, aurora, alpha, ghost) {
    const a = toScreen(l.x0, l.y - l.h / 2), b = toScreen(l.x1, l.y + l.h / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, a.y, 0, b.y);
    if (aurora) {
      // green to violet, drifting along the lane like the lights overhead
      const hue = 140 + Math.sin(t * 0.7 + l.y * 0.01) * 50;
      g.addColorStop(0, `hsla(${hue},90%,60%,0)`);
      g.addColorStop(0.5, `hsla(${hue},90%,62%,${ghost ? 0.25 : 0.55})`);
      g.addColorStop(1, `hsla(${hue + 90},85%,60%,0)`);
    } else {
      g.addColorStop(0, 'rgba(113,220,232,0)');
      g.addColorStop(0.5, 'rgba(113,220,232,0.5)');
      g.addColorStop(1, 'rgba(113,220,232,0)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    if (ghost) {
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(220,255,240,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(a.x, a.y + 4, b.x - a.x, b.y - a.y - 8);
      ctx.setLineDash([]);
    }
    // chevrons
    ctx.strokeStyle = aurora ? 'rgba(235,255,245,0.95)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4;
    const step = 60, off = ((t * 120) % step) * l.dir;
    for (let x = l.x0 + 20; x < l.x1 - 10; x += step) {
      const cx = x + off;
      if (cx < l.x0 + 10 || cx > l.x1 - 10) continue;
      const c = toScreen(cx, l.y);
      ctx.beginPath();
      ctx.moveTo(c.x - 8 * l.dir, c.y - 9);
      ctx.lineTo(c.x + 4 * l.dir, c.y);
      ctx.lineTo(c.x - 8 * l.dir, c.y + 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Meltwater: a slushy pool with a warm sheen, slow ripples and a little steam.
  drawPool(ctx, p, t) {
    const s = toScreen(p.x, p.y);
    const rx = p.rx * persp(p.y), ry = p.ry;
    ctx.save();
    const g = ctx.createRadialGradient(s.x - rx * 0.2, s.y - ry * 0.2, 0, s.x, s.y, rx);
    g.addColorStop(0, 'rgba(255,170,90,0.5)');
    g.addColorStop(0.5, 'rgba(70,120,170,0.55)');
    g.addColorStop(0.92, 'rgba(70,115,160,0.4)');
    g.addColorStop(1, 'rgba(70,115,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // wet rim catching the torchlight
    ctx.strokeStyle = 'rgba(255,225,190,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, rx * 0.9, ry * 0.9, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,70,110,0.35)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, rx * 0.9, ry * 0.9, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,200,0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const k = ((t * 0.35 + i * 0.5 + p.ph) % 1);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, rx * (0.3 + k * 0.6), ry * (0.3 + k * 0.6), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    this.drawSteam(ctx, s, rx, t, p.ph);
  }

  // A little steam off the warm meltwater.
  drawSteam(ctx, s, rx, t, ph) {
    ctx.save();
    ctx.fillStyle = '#fff2e0';
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.4 + i / 3 + ph) % 1;
      const wx = s.x + Math.sin(t * 1.3 + i * 2 + ph) * rx * 0.4;
      ctx.globalAlpha = 0.3 * (1 - k);
      ctx.beginPath(); ctx.arc(wx, s.y - k * 34, 4 + k * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Cracks keep their shape as they grow: lines are made once per crack, in units of r.
  drawCrack(ctx, c, tw) {
    this.crackLines ||= new WeakMap();
    let lines = this.crackLines.get(c);
    if (!lines) {
      const r = makeRng(Math.round(c.x * 13 + c.y * 7) | 0);
      lines = [];
      for (let i = 0; i < 7; i++) {
        let a = r.range(0, Math.PI * 2), x = 0, y = 0;
        const pts = [[x, y]];
        for (let j = 0; j < 5; j++) {
          a += r.range(-0.6, 0.6);
          const l = r.range(0.14, 0.31);
          x += Math.cos(a) * l; y += Math.sin(a) * l * 0.8;
          pts.push([x, y]);
        }
        lines.push(pts);
      }
      this.crackLines.set(c, lines);
    }
    const fresh = tw.t - (c.born || -9) < 0.5 ? 1 - (tw.t - c.born) / 0.5 : 0;
    const s = toScreen(c.x, c.y);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, c.r);
    g.addColorStop(0, 'rgba(60,110,150,0.32)');
    g.addColorStop(1, 'rgba(60,110,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, c.r, c.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    const draw = (dx, dy) => {
      for (const pts of lines) {
        ctx.beginPath();
        pts.forEach(([x, y], i) => { const q = toScreen(c.x + x * c.r, c.y + y * c.r); i ? ctx.lineTo(q.x + dx, q.y + dy) : ctx.moveTo(q.x + dx, q.y + dy); });
        ctx.stroke();
      }
    };
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,70,110,0.7)';
    draw(0, 0);
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(255,255,255,${0.6 + fresh * 0.4})`;
    draw(1, -1);
  }

  drawTrails(ctx, match) {
    for (const tr of match.trails) {
      const a = 1 - tr.t / tr.life;
      const s = toScreen(tr.x, tr.y);
      Assets.draw(ctx, 'ability_effects/frost_trail/phase_3', s.x, s.y + 2, 0.17, { rot: tr.ang, alpha: a * 0.85, squash: 0.7 });
    }
  }

  drawPickupsGround(ctx, match, fx) {
    for (const k of match.pickups) {
      const s = toScreen(k.x, k.y);
      const fade = Math.min(1, k.t / 0.5, (k.life - k.t) / 1.5);
      const pulse = 1 + Math.sin(fx.time * 5) * 0.06;
      Assets.draw(ctx, `power_pucks/${k.type}/pickup_ring`, s.x, s.y, 0.27 * pulse, { alpha: 0.9 * fade });
    }
  }

  // The linesman for this match, moved on to now (on the effects' clock: he's only for the look).
  official(match, fx) {
    if (this.lineFor !== match) { this.lineFor = match; this.linesman = new Linesman(); this.lineT = fx.time; }
    this.linesman.update(Math.max(0, Math.min(0.05, fx.time - this.lineT)), match);
    this.lineT = fx.time;
    return this.linesman;
  }
  drawLinesmanShadow(ctx, L) {
    const p = toScreen(L.x, L.y), k = persp(L.y);
    ctx.fillStyle = 'rgba(20,35,59,0.28)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 20 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawShadows(ctx, match) {
    ctx.fillStyle = 'rgba(20,35,59,0.28)';
    const box = this.penaltyBox();
    for (const s of match.skaters) {
      if (box && s.boxT > 0) continue;
      const p = toScreen(s.x, s.y), k = persp(s.y);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 21 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of match.goalies) {
      if (g.disabled && !g.leaving) continue;
      const p = g.disabled ? toScreen(g.leaveX, g.leaveY) : toScreen(g.x, g.y);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    const pk = match.puck;
    if (!match.inShadow(pk.x, pk.y) && !this.puckHeld) {
      const p = toScreen(pk.x, pk.y);
      const zf = clamp(1 - pk.z / 80, 0.4, 1);
      ctx.fillStyle = `rgba(20,35,59,${0.35 * zf})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 8 * zf, 3 * zf, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawGroundMarkers(ctx, match, fx) {
    const versus = match.humans && match.humans.length > 1;
    // goalie mode: Wall of Ice rises across the crease (Batch Q), or the crease lights up
    const wall = match.goalieMode && match.goalies[0].wallT > 0 ? match.goalies[0] : null;
    const W = wall && Assets.atlas.goalie_mode && Assets.atlas.goalie_mode.wall;
    const wf = W && Assets.frame(W.rise[0]);
    if (wall && wf && Assets.pages[wf[0]]) {
      const age = W.duration - wall.wallT, c = toScreen(wall.goalSide * (GOAL_X - 4), 0);
      const id = wall.wallT < W.shatter.length / W.shatter_fps
        ? W.shatter[Math.min(W.shatter.length - 1, Math.floor((W.shatter.length / W.shatter_fps - wall.wallT) * W.shatter_fps))]
        : age < W.rise.length / W.rise_fps ? W.rise[Math.floor(age * W.rise_fps)] : W.shimmer[Math.floor(age * W.shimmer_fps) % W.shimmer.length];
      Assets.draw(ctx, id, c.x, c.y, W.source_scale, { alpha: W.opacity, flip: wall.goalSide > 0 }); // drawn for the left net
    } else if (wall) {
      const c = toScreen(wall.goalSide * (GOAL_X - 4), 0), k = Math.min(1, wall.wallT / 0.6);
      ctx.save();
      ctx.globalAlpha = (0.35 + Math.sin(fx.time * 7) * 0.1) * k;
      const gr = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, 95);
      gr.addColorStop(0, 'rgba(232,251,255,0.9)'); gr.addColorStop(1, 'rgba(113,220,232,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, 95, 78, 0, 0, Math.PI * 2); ctx.fill();
      for (const [w, col] of [[7, 'rgba(42,159,176,0.7)'], [3, '#e8fbff']]) { // a frosty rim around the crease
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.ellipse(c.x, c.y, 82, 68, 0, -Math.PI / 2, Math.PI / 2, wall.goalSide > 0); ctx.stroke();
      }
      ctx.restore();
    }
    for (const c of match.skaters) {
      if (!c.controlled || c.parked || match.state === 'over') continue;
      const p = toScreen(c.x, c.y);
      const pulse = 1 + Math.sin(fx.time * 6) * 0.05;
      if ((versus && c.team === 1) || ((match.coop || match.keeperCoop) && c.team === 0)) {
        ctx.strokeStyle = seatColour(match, c); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 24 * pulse, 9 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      } else Assets.draw(ctx, 'hud_elements/misc/selection_ring', p.x, p.y + 1, 0.2 * pulse * persp(c.y), { alpha: 0.95 });
    }
    // the teammate a pass would go to right now (a player with the puck): a thin ring at their
    // feet, gold (in versus, each player's own colour)
    for (const [team, seat] of match.state === 'play' && this.passRing !== false ? (match.humans || []).flatMap((t) => (match.coop && t === 0 ? [0, 1] : [0]).map((k) => [t, k])) : []) {
      const ctrl = match.controlled(team, seat);
      const target = ctrl && ctrl.hasPuck && !(match.simpleSeat && match.simpleSeat(team, seat) && match.simpleShot(ctrl)) ? match.choosePassTarget(ctrl) : null; // (Simple controls: no ring where the button shoots)
      if (!target) continue;
      const p = toScreen(target.x, target.y), k = persp(target.y), pulse = 1 + Math.sin(fx.time * 6) * 0.06;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 22 * k * pulse, 8 * k * pulse, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(20,35,59,0.45)'; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = -fx.time * 20;
      ctx.strokeStyle = versus || match.coop ? seatColour(match, ctrl) : '#ffd45e'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
    // loose puck highlight so it never gets lost
    const pk = match.puck;
    if (!pk.owner && match.state === 'play') {
      const p = toScreen(pk.x, pk.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(fx.time * 8) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawRings(ctx, fx) {
    for (const r of fx.rings) {
      const k = r.t / r.life;
      const s = toScreen(r.x, r.y);
      ctx.strokeStyle = hexA(r.color, 0.8 * (1 - k));
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r.r * (0.3 + k), r.r * (0.3 + k) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawDebug(ctx, match) {
    ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2;
    ctx.beginPath();
    const R = RINK.r;
    for (let i = 0; i <= 200; i++) {
      // walk the rounded rect perimeter
      const t = i / 200 * Math.PI * 2;
      const cx = Math.cos(t), cy = Math.sin(t);
      const x = cx > 0 ? RINK.maxX - R + cx * R : RINK.minX + R + cx * R;
      const y = cy > 0 ? RINK.maxY - R + cy * R : RINK.minY + R + cy * R;
      const q = toScreen(x, y);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.stroke();
    for (const side of [-1, 1]) {
      const a = toScreen(side * GOAL_X, -MOUTH), b = toScreen(side * GOAL_X, MOUTH);
      const c = toScreen(side * (GOAL_X + NET_DEPTH), MOUTH), d = toScreen(side * (GOAL_X + NET_DEPTH), -MOUTH);
      ctx.strokeStyle = '#00ff88';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.stroke();
      const g1 = toScreen(side * GOAL_X, RINK.minY), g2 = toScreen(side * GOAL_X, RINK.maxY);
      ctx.strokeStyle = '#ffff00'; ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.lineTo(g2.x, g2.y); ctx.stroke();
    }
    for (const s of match.skaters) { const q = toScreen(s.x, s.y); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, s.r, 0, 7); ctx.stroke(); }
  }

  // ------------------------------------------------------------- characters
  skaterFrame(s, match) {
    const set = Assets.atlas.skaters[this.spriteOf(s)][s.team === 0 ? 'home' : 'away'];
    // real time, so the hold also runs during replays (match time stands still then)
    const dir = this.skaterDir(s, !!set.northeast, performance.now() / 1000);
    const motion = this.motionFrame(s, match, set, dir);
    if (motion) return motion;
    // Parts celebrations face the camera and use their own drawn stick hand.
    if (set.signature_hand && s.stun <= 0 && s.celebrate > 0 &&
        (match.state === 'goal' || match.state === 'over') && match.lastGoal?.scorer === s)
      return this.poseFrame(s, match, set, 'south');
    const md = handMirror(set.hands, dir, s.hand);
    if (md) { const fr = this.poseFrame(s, match, set, md); return { ...fr, flip: !fr.flip }; }
    return this.poseFrame(s, match, set, dir);
  }

  // Stick handling and crossovers (Batches BD and BE), for the sets drawn with them: each has
  // its own hand map, as the poses are drawn with the character's own stick hand. Anything
  // with its own pose (a hit, a shot, a pass, a check, a dash, a stop, a celebration) wins.
  motionFrame(s, match, set, dir) {
    if (s.stun > 0 || (s.celebrate > 0 && (match.state === 'goal' || match.state === 'over')) ||
        s.ultWindup > 0 || (s.charging && s.chargeT > 0.08) || s.dashT > 0 ||
        s.state === 'shoot' || s.state === 'pass' || s.state === 'check' || s.stopping) return null;
    // crossovers through a hard turn at speed: two frames, stepping with the stride. Into one
    // on a sharp curve, kept while it still curves, and held a moment so it never flickers.
    const cross = set.crossover, tr = s.turnRate || 0, now = performance.now() / 1000;
    if (s.speed > 70 && Math.abs(tr) > CROSS_KEEP && (Math.abs(tr) > CROSS_IN || s._crossUntil >= now)) { s._crossUntil = now + 0.2; s._crossDir = Math.sign(tr); }
    if (cross && s.speed > 70 && s._crossUntil > now) {
      const md = handMirror(cross.hands, dir, s.hand);
      let turn = s._crossDir > 0 ? 'right' : 'left';
      if (md) turn = turn === 'right' ? 'left' : 'right'; // (mirrored, a right turn is drawn as a left)
      const seq = cross[md || dir]?.[turn];
      if (seq) return { id: seq[Math.floor(s.stridePhase || 0) % 2], flip: !!md, pose: 'crossover' };
    }
    // the puck worked from forehand to backhand and back, gliding or on the move (striding
    // hard keeps the stride)
    const handling = set.stickhandling;
    if (handling && s.hasPuck && s.speed > 40 && (s.gliding || s.speed < 200)) {
      const md = handMirror(handling.hands, dir, s.hand);
      // (protecting it, it's on the backhand, as the puck itself is: see Match.protectPuck)
      const pose = (s.protect || 0) > 0.5 || Math.sin((s.danglePhase || 0) * Math.PI * 2) < 0 ? 'backhand' : 'forehand';
      const id = handling[md || dir]?.[pose];
      if (id) return { id, flip: !!md, pose: 'handling' };
    }
    return null;
  }

  // Where the drawn puck sits on the frame's blade (screen space): measured for the
  // stick-handling and crossover poses, read from the gear masks for the ordinary skating
  // frames (tools/blade_points.py); null for others. Only the drawing moves: the puck itself
  // stays where it is.
  puckSpritePoint(s, match) {
    const fr = this.skaterFrame(s, match), A = Assets.atlas, blade = A.motion_blades?.[fr.id] || A.blade_points?.[fr.id];
    const f = blade && Assets.frame(fr.id);
    if (!f) return null;
    const p = toScreen(s.x, s.y);
    const k = SKATER_SCALE * persp(s.y) * (s.parts ? PARTS_SCALE.body : 1) / f[7];
    const dy = (blade.y - f[6]) * k;
    return { x: p.x + (blade.x - f[5]) * k * (fr.flip ? -1 : 1) - (fr.pose === 'handling' ? (s.lean || 0) * dy : 0), y: p.y + dy };
  }

  // The frame for a pose facing `dir` (skaterFrame mirrors the other facing for the other hand).
  poseFrame(s, match, set, dir) {
    const map = set[dir];
    const side = dir.endsWith('east') ? 'east' : dir.endsWith('west') ? 'west' : null;
    const sp = s.speed;

    // hit reactions: stagger, then a knockdown held for the stun on big hits
    if (s.stun <= 0) s._stunMax = 0;
    else if (!s._stunMax || s.stun > s._prevStun + 1e-4) s._stunMax = s.stun; // new or refreshed
    s._prevStun = s.stun;
    if (s.stun > 0 && set.hit) {
      const own = side === 'west' && set.hit.west; // drawn facing west (sets drawn both ways)
      const seq = set.hit[own ? 'west' : side ? 'east' : 'south'];
      const t = s._stunMax - s.stun;
      let i = 0;
      if (s._stunMax >= 0.38) i = t < 0.1 ? 0 : s.stun > 0.14 ? 1 : 2;
      return { id: seq[i], flip: side === 'west' && !own, pose: i === 1 ? 'down' : 'stagger' };
    }
    let pose = 'idle';
    if (s.celebrate > 0 && (match.state === 'goal' || match.state === 'over') && set.signature && match.lastGoal && match.lastGoal.scorer === s) {
      const i = Math.min(3, Math.floor((3 - s.celebrate) * 6));
      return { id: set.signature[i], flip: set.signature_hand ? s.hand !== set.signature_hand : Math.cos(s.face) < -0.3, pose: 'signature' };
    }
    if (s.celebrate > 0 && (match.state === 'goal' || match.state === 'over')) pose = 'celebrate';
    else if (s.stun > 0) pose = 'check';
    else if (s.ultWindup > 0 || (s.charging && s.chargeT > 0.08)) pose = 'shot_windup';
    else if (s.dashT > 0) pose = 'check';
    else if (s.state === 'shoot') pose = 'shot_release';
    else if (s.state === 'pass') pose = 'pass';
    else if (s.state === 'check') pose = 'check';
    else if (sp > 40) {
      // side-on skating has a 4-frame stride, a glide and a hockey stop
      if (set.stride && (dir === 'east' || dir === 'west')) {
        const st = (dir === 'west' && set.stride_west) || set.stride; // (drawn facing west, when it is)
        const flip = dir === 'west' && !set.stride_west;
        if (s.stopping) return { id: st.stop, flip, pose: 'stop' };
        if (s.gliding && sp < s.d.maxSpeed * 1.05) return { id: st.glide, flip, pose: 'glide' };
        return { id: st.frames[Math.floor(s.stridePhase ?? s.animT * (3 + sp / 60)) % 4], flip, pose: 'stride' };
      }
      if (s.gliding && map.frames.skate_a) pose = 'skate_b';
      else pose = Math.floor((s.stridePhase ?? s.animT * (3 + sp / 60)) * 0.85) % 2 ? 'skate_a' : 'skate_b';
    }
    return { id: map.frames[pose], flip: map.flip_x, pose };
  }

  // A rival's own roster art once its page has loaded, else our art in their colours. (The
  // page to look for is the one it's drawn from: in the All-Star Game only recoloured copies
  // are kept.)
  spriteOf(s) {
    if (s.sprite === s.def.sprite) return s.sprite;
    const set = Assets.atlas.skaters[s.sprite];
    const f = set && Assets.frame(set.away.south.frames.idle);
    const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.clubPages()) : this.awayPages || Assets.pages;
    return f && (pages[f[0]] || Assets.pages[f[0]]) ? s.sprite : s.def.sprite;
  }

  // 8-way facing (4-way with v1 art only). Hysteresis plus a short hold keeps a skater
  // turning along a sector edge from flickering between two directions.
  skaterDir(s, eight, now) {
    const a = Math.atan2(Math.sin(s.face), Math.cos(s.face));
    const n = eight ? 8 : 4;
    const step = (Math.PI * 2) / n;
    const raw = ((Math.round(a / step) % n) + n) % n;
    let i = raw, waiting = false;
    if (s._dirI !== undefined && s._dirN === n && s._dirI !== raw) {
      let d = Math.abs(a - s._dirI * step) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < step / 2 + 0.14) i = s._dirI;
      else if (d < step * 1.2) {
        // adjacent sector: switch once the new facing has held for a moment
        if (s._dirPend !== raw || now < s._dirPendT) { s._dirPend = raw; s._dirPendT = now; }
        if (now - s._dirPendT < 0.07) { i = s._dirI; waiting = true; }
      }
    }
    if (!waiting) s._dirPend = undefined;
    s._dirI = i; s._dirN = n;
    return (eight ? DIRS8 : DIRS4)[i];
  }

  drawSkater(ctx, s, match, fx, at = null) {
    // the twins' Ragnarök goal: one celebration for the two of them, where the scorer is (Batch AI)
    const G = match.lastGoal, J = Assets.atlas.legends && Assets.atlas.legends.joint_celebration;
    if (J && G && G.scorer && G.special && G.special.combo === 'ragnarok' && s.celebrate > 0 && (match.state === 'goal' || match.state === 'over') && !at) {
      if (G.scorer !== s) { if (s.who === G.scorer.twin && Assets.frame(J.frames[0])) return; } else {
        const q = toScreen(s.x, s.y), id = J.frames[Math.min(J.frames.length - 1, Math.floor((3 - s.celebrate) * J.fps))];
        if (Assets.frame(id)) { Assets.draw(ctx, id, q.x, q.y, SKATER_SCALE * persp(s.y), { flip: Math.cos(s.face) < -0.3, pages: Assets.pagesFor(s.look) }); return; }
      }
    }
    const fr = this.skaterFrame(s, match);
    const p = at || toScreen(s.x, s.y);
    const k = SKATER_SCALE * persp(s.y) * (s.parts ? PARTS_SCALE.body : 1);
    let y = p.y, rot = 0;
    if (fr.pose === 'celebrate') y -= Math.abs(Math.sin(s.animT * 7 + s.slot)) * 12;
    if (fr.pose === 'check' && s.stun > 0) rot = Math.sin(s.animT * 30) * 0.12 + (fr.flip ? 0.25 : -0.25);
    else if (fr.pose === 'stagger') rot = Math.sin(s.animT * 30) * 0.05;
    const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.clubPages()) : this.awayPages;
    // aura for active abilities
    if (s.bedrockT > 0) this.aura(ctx, p.x, p.y - 30, 34, '#c9b79c', fx.time);
    if (s.boostT > 0 || s.trailT > 0) this.aura(ctx, p.x, p.y - 26, 28, '#71dce8', fx.time);
    if (s.empowered > 0) this.aura(ctx, p.x, p.y - 30, 30, '#ffe066', fx.time * 2);
    // the newer supers: drawn effects once Batch AL is in, glows until then
    const sfx = (name, n, on, color, r) => {
      if (!on) return;
      const art = this.loopFrame(`ability_effects/${name}/phase_`, n, fx.time, 10);
      if (art) Assets.draw(ctx, art, p.x, p.y, 0.5 * k / SKATER_SCALE * 0.6); else this.aura(ctx, p.x, p.y - 26, r, color, fx.time * 2);
    };
    sfx('heat_check', 4, s.igniteT > 0, '#ff7a3d', 30 + Math.sin(fx.time * 23) * 3);
    sfx('tailwind', 4, s.gustT > 0, '#bff0dc', 30);
    sfx('fade', 4, s.fadeT > 0, '#6b4fd8', 34); // (see-through as well, below)
    ctx.save();
    if (s.fadeT > 0) ctx.globalAlpha *= 0.42 + Math.sin(fx.time * 9) * 0.06;
    // leaning into a turn: the sprite skewed about its skates (rows shift, so the pixel art
    // keeps its lines), head and gear with it; a little lift on each push of the stride
    const skating = fr.pose === 'stride' || fr.pose === 'skate_a' || fr.pose === 'skate_b' || fr.pose === 'glide' || fr.pose === 'handling';
    if (s.lean && skating && !at) { ctx.translate(p.x, y); ctx.transform(1, 0, -s.lean, 1, 0, 0); ctx.translate(-p.x, -y); }
    if (fr.pose === 'stride' && Math.floor(s.stridePhase ?? 0) % 2) y -= 1;
    const geared = s.gear && this.gearFrame(fr.id, pages, s.gear);
    if (geared) this.drawFrameCanvas(ctx, geared, Assets.frame(fr.id), p.x, y, k, fr.flip, rot);
    else Assets.draw(ctx, fr.id, p.x, y, k, { flip: fr.flip, rot, pages });
    let tint = null;
    if (s.flash > 0) tint = ['#ffffff', 0.7 * (s.flash / 0.25)];
    else if (s.slowT > 0 && s.slowMul < 0.9) tint = ['#9fe8ff', 0.45];
    else if (s.bedrockT > 0) tint = ['#b8a58c', 0.22];
    if (tint) this.drawTinted(ctx, fr.id, pages, p.x, y, k, fr.flip, rot, tint[0], tint[1]);
    if (s.parts) this.drawHead(ctx, s, fr, p.x, y, k, pages); // a player from parts: the head on its anchor
    if (s.gear) this.drawGearLook(ctx, s, fr, p, y, k, fx);
    ctx.restore();
  }

  // The head of a player from parts (Batch AJ), then anything that passes in front of it.
  drawHead(ctx, s, fr, x, y, k, pages) {
    const M = Assets.atlas.modular, f = Assets.frame(fr.id);
    const hp = M && f && headPlacement(M, s.parts, fr.id, f, x, y, k, fr.flip);
    if (!hp) return;
    const hf = Assets.frame(hp.head), c = hf && Assets.partsCanvas(hp.head, s.parts);
    if (c) this.drawFrameCanvas(ctx, c, hf, hp.x, hp.y, k * PARTS_SCALE.head, hp.flip, hp.rot); // (bigger than drawn: see PARTS_SCALE)
    if (hp.front) Assets.draw(ctx, hp.front, x, y, k, { flip: fr.flip, pages });
  }

  // A looping effect's frame id at time t, or null while its art isn't in the atlas.
  loopFrame(prefix, n, t, fps) {
    const id = prefix + (1 + (Math.floor(t * fps) % n));
    return Assets.atlas.frames[id] ? id : null;
  }

  // Gale's Cyclone: wind rings swirling on the ice around its owner, fading as it ends.
  drawCyclones(ctx, match, fx) {
    for (const c of match.cyclones) {
      const p = toScreen(c.x, c.y), k = persp(c.y);
      const a = Math.min(1, c.t / 0.25, (c.life - c.t) / 0.4);
      const art = this.loopFrame('ability_effects/cyclone/phase_', 6, c.t, 12);
      if (art) { ctx.save(); ctx.globalAlpha *= a; Assets.draw(ctx, art, p.x, p.y, 0.5 * k); ctx.restore(); continue; } // (Batch AL)
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const rr = (0.35 + i * 0.16) * c.r * k, spin = fx.time * (5 - i * 0.6) + i * 1.3;
        ctx.strokeStyle = hexA(i % 2 ? '#ffffff' : '#9fe3c8', 0.85 * a * (1 - i * 0.1));
        ctx.lineWidth = 6 - i * 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - 10, rr, rr * 0.45, 0, spin, spin + 2.2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Equipped gear on the ice: a glow at the blade for special sticks, a visor glint.
  drawGearLook(ctx, s, fr, p, y, k, fx) {
    const st = GEAR_LOOK[s.gear.stick];
    if (st && fr.pose !== 'down' && fr.pose !== 'signature') {
      const b = this.worldToBackdrop(s.stickPoint(18));
      const hot = s.hasPuck || s.charging || s.ultWindup > 0;
      const r = (hot ? 12 : 9) * (1 + Math.sin(fx.time * 6 + s.slot) * 0.12);
      ctx.save();
      // a coloured haze where the puck is handled (the sprite's painted stick keeps its
      // look until gear-mask art lets us recolour it)
      if (!hot) { ctx.restore(); return this.drawVisor(ctx, s, fr, p, y, k, fx); }
      ctx.drawImage(this.glowSprite(st.color), b.x - r, b.y - r, r * 2, r * 2);
      ctx.translate(b.x, b.y);
      if (st.fx === 'swirl') {
        ctx.strokeStyle = hexA(st.color, hot ? 0.8 : 0.5); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.75, 0, fx.time * 4, fx.time * 4 + 4); ctx.stroke();
      }
      ctx.restore();
    }
    this.drawVisor(ctx, s, fr, p, y, k, fx);
  }

  // A soft round glow in a colour, drawn once and scaled (no new gradient every frame).
  glowSprite(color) {
    this.glowCache ||= new Map();
    let c = this.glowCache.get(color);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 48;
      const g = c.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, hexA(color, 0.5)); gr.addColorStop(1, hexA(color, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      this.glowCache.set(color, c);
    }
    return c;
  }

  drawVisor(ctx, s, fr, p, y, k, fx) {
    const ar = GEAR_LOOK[s.gear.armor];
    if (ar && ar.show === 'glint') {
      const ph = (fx.time * 0.3 + s.slot * 0.31) % 1;
      if (ph < 0.06) {
        const f = Assets.frame(fr.id);
        const sc = k / f[7];
        const hx = p.x + (fr.flip ? -1 : 1) * (f[3] * 0.5 - f[5]) * sc * 0.4, hy = y - f[6] * sc * 0.78;
        const a = Math.sin((ph / 0.06) * Math.PI);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.moveTo(hx, hy - 6); ctx.lineTo(hx + 1.5, hy - 1.5); ctx.lineTo(hx + 6, hy); ctx.lineTo(hx + 1.5, hy + 1.5); ctx.lineTo(hx, hy + 6); ctx.lineTo(hx - 1.5, hy + 1.5); ctx.lineTo(hx - 6, hy); ctx.lineTo(hx - 1.5, hy - 1.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  worldToBackdrop(pt) { return toScreen(pt.x, pt.y); }

  // After the club's colours change.
  clearCaches() { this.tintCache.clear(); this.gearCache?.clear(); }

  // True gear recolours, when the sprite pack has gear masks for this frame: red mask
  // pixels are the stick, green the boots, blue the blades. Each is reshaded in the
  // gear's colour by the original pixel's brightness, keeping the dark outlines.
  // Everything a match will need drawn from pixels, built a little each frame (within about
  // 2 ms) from the start: each geared skater's recoloured poses, and each head of a player made
  // from parts. Built the first time a pose showed instead, it could cost a dropped frame.
  warmUp(match) {
    if (this.warmFor !== match) {
      this.warmFor = match;
      const q = [];
      for (const s of match.skaters) {
        const set = Assets.atlas.skaters[this.spriteOf(s)];
        const kit = set && set[s.team === 0 ? 'home' : 'away'];
        const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.clubPages()) : this.awayPages;
        if (kit && s.gear && (GEAR_LOOK[s.gear.stick] || GEAR_LOOK[s.gear.skates])) {
          const ids = [];
          for (const [k, v] of Object.entries(kit)) {
            if (v && v.frames && !Array.isArray(v.frames)) ids.push(...Object.values(v.frames)); // the eight directions
            else if (k.startsWith('stride') && v) ids.push(...v.frames, v.stop, v.glide);
            else if (k === 'hit' && v) ids.push(...Object.values(v).flat());
            else if (k === 'signature' && Array.isArray(v)) ids.push(...v);
            else if ((k === 'stickhandling' || k === 'crossover') && v) for (const [d, poses] of Object.entries(v)) if (d !== 'hands') ids.push(...Object.values(poses).flat());
          }
          for (const id of new Set(ids)) q.push(() => this.touch(this.gearFrame(id, pages, s.gear)));
        }
        // the stick-handling and crossover pages (Batches BD/BE), uploaded before their first pose
        for (const sec of ['stickhandling', 'crossover']) {
          const v = kit && kit[sec], first = v && Object.entries(v).find(([d]) => d !== 'hands');
          const f = first && Assets.frame(Object.values(first[1]).flat()[0]), pg = f && pages && pages[f[0]];
          if (pg) q.push(() => this.touch(pg));
        }
        const M = Assets.atlas.modular, views = s.parts && M && M.heads[s.parts.head];
        if (views) for (const st of Object.values(views)) for (const id of Object.values(st)) q.push(() => this.touch(Assets.partsCanvas(id, s.parts)));
      }
      this.warmQueue = q;
    }
    const t0 = performance.now();
    while (this.warmQueue.length && performance.now() - t0 < 2) this.warmQueue.shift()();
  }

  // Draw a new canvas once, tiny and off to the side, so its first real draw isn't also its
  // upload to the GPU.
  touch(c) { if (c && this.ctx) this.ctx.drawImage(c, 0, 0, 1, 1, -64, -64, 1, 1); return c; }

  gearFrame(id, pages, gear) {
    const st = GEAR_LOOK[gear.stick], sk = GEAR_LOOK[gear.skates];
    if (!st && !sk) return null;
    const mf = Assets.frame('gm:' + id);
    const f = Assets.frame(id);
    if (!mf || !f || !Assets.pages[mf[0]] || !pages[f[0]]) return null;
    this.gearCache ||= new Map();
    const key = `${id}|${pages === Assets.pages ? 'h' : pages === this.awayPages ? 'a' : 'k'}|${gear.stick}|${gear.skates}`;
    let c = this.gearCache.get(key);
    if (c) { this.gearCache.delete(key); this.gearCache.set(key, c); return c; } // (most recently drawn last)
    const [, , , fw, fh] = f;
    const cx = Assets.framePixels(id, pages); // (from the original page, not read back off the GPU)
    if (!cx) return null;
    c = cx.canvas;
    const m = document.createElement('canvas'); m.width = fw; m.height = fh;
    const mx = m.getContext('2d', { willReadFrequently: true });
    mx.drawImage(Assets.pages[mf[0]], mf[1], mf[2], mf[3], mf[4], mf[8] || 0, mf[9] || 0, mf[3], mf[4]); // masks are cropped; [8], [9] place them
    const img = cx.getImageData(0, 0, fw, fh), d = img.data, md = mx.getImageData(0, 0, fw, fh).data;
    const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const stick = st && rgb(st.color), boot = sk && rgb(sk.color).map((v) => v * 0.8), blade = sk && rgb(sk.color);
    const row = fw * 4;
    // the sprite's own edge (next to transparency) is its outline
    const edge = (i) => d[i - 4 + 3] < 10 || d[i + 4 + 3] < 10 || (i >= row && d[i - row + 3] < 10) || (i + row < d.length && d[i + row + 3] < 10);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 10 || md[i + 3] < 128) continue;
      const isBoot = md[i] <= 127 && md[i + 1] > 127;
      const col = md[i] > 127 ? stick : isBoot ? boot : md[i + 2] > 127 ? blade : null;
      if (!col) continue;
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      let k;
      if (l >= 0.2) k = 0.35 + l * 0.85;
      else if (isBoot && !edge(i)) k = 0.5 + l * 1.2; // dark boot leather takes a deep shade of the colour
      else continue; // outline
      d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k);
    }
    cx.putImageData(img, 0, 0);
    // the pixel work needed a CPU-side canvas; drawing every frame wants an ordinary one (a
    // CPU canvas gets uploaded to the GPU on every draw, which phones feel)
    const out = document.createElement('canvas'); out.width = fw; out.height = fh;
    out.getContext('2d').drawImage(c, 0, 0);
    if (this.gearCache.size > 600) this.gearCache.delete(this.gearCache.keys().next().value);
    this.gearCache.set(key, out);
    return out;
  }

  drawFrameCanvas(ctx, c, f, x, y, k, flip, rot) {
    const sc = k / f[7];
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -sc : sc, sc);
    ctx.drawImage(c, -f[5], -f[6]);
    ctx.restore();
  }

  drawGhost(ctx, g, match) {
    if (g.t < 0) return;
    const s = g.s;
    const fr = this.skaterFrame(s, match);
    const p = toScreen(g.x, g.y);
    const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.clubPages()) : this.awayPages;
    this.drawTinted(ctx, fr.id, pages, p.x, p.y, SKATER_SCALE * persp(g.y) * (s.parts ? PARTS_SCALE.body : 1), fr.flip, 0, '#ffe066', 0.55 * (1 - g.t / g.life), true);
  }

  // A race ghost (a recorded run): the skater's art, see-through with a frosty tint, and
  // whose run it is above the head.
  drawRaceGhost(ctx, s, match, alpha, label) {
    const fr = this.skaterFrame(s, match);
    const f = Assets.frame(fr.id);
    if (!f) return;
    const p = toScreen(s.x, s.y);
    const k = SKATER_SCALE * persp(s.y) * (s.parts ? PARTS_SCALE.body : 1);
    const pages = s.look ? Assets.pagesFor(s.look) : Assets.clubPages();
    Assets.draw(ctx, fr.id, p.x, p.y, k, { flip: fr.flip, pages, alpha: alpha * 0.5 });
    this.drawTinted(ctx, fr.id, pages, p.x, p.y, k, fr.flip, 0, '#bff4ff', alpha * 0.35);
    if (s.parts) { ctx.save(); ctx.globalAlpha *= alpha * 0.6; this.drawHead(ctx, s, fr, p.x, p.y, k, pages); ctx.restore(); } // (a player from parts: their head too)
    if (!label) return;
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.font = `bold 13px ${this.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(11,20,36,0.8)'; ctx.fillStyle = '#bff4ff';
    const y = p.y - f[6] * (k / f[7]) - 6;
    ctx.strokeText(label, p.x, y); ctx.fillText(label, p.x, y);
    ctx.restore();
  }

  // A race ghost's puck (Breakaway ghosts shoot too).
  drawGhostPuck(ctx, x, y, alpha) {
    const s = toScreen(x, y);
    Assets.draw(ctx, 'power_pucks/plain/phase_1', s.x, s.y - 2, PUCK_SCALE * persp(y), { alpha: alpha * 0.5 });
  }

  aura(ctx, x, y, r, color, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * (1 + Math.sin(t * 6) * 0.08));
    g.addColorStop(0, hexA(color, 0.35));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
    ctx.restore();
  }

  drawTinted(ctx, id, pages, x, y, k, flip, rot, color, alpha, only) {
    const key = id + color + (pages === Assets.pages ? 'h' : pages === this.awayPages ? 'a' : 'k');
    let c = this.tintCache.get(key);
    const f = Assets.atlas.frames[id];
    if (!f) return;
    const [pi, fx, fy, fw, fh, px, py, s] = f;
    if (!c) {
      c = document.createElement('canvas');
      c.width = fw; c.height = fh;
      const cx = c.getContext('2d');
      cx.drawImage(pages[pi], fx, fy, fw, fh, 0, 0, fw, fh);
      cx.globalCompositeOperation = 'source-atop';
      cx.fillStyle = color;
      cx.fillRect(0, 0, fw, fh);
      this.tintCache.set(key, c);
    }
    const sc = k / s;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(flip ? -sc : sc, sc);
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, -px, -py);
    ctx.restore();
  }

  goalieInMouth(g) {
    return Math.abs(g.x - g.goalSide * GOAL_X) < 36 && Math.abs(g.y) < MOUTH + 8 && g.state !== 'dive';
  }

  // gloveUp: which side the catching glove is on in this art (up-screen for the
  // right-facing set and its mirror, toward the camera for real left-facing art)
  goalieSideFrame(g, set, gloveUp = true) {
    let pose = 'ready';
    switch (g.state) {
      case 'butterfly': pose = 'butterfly'; break;
      case 'glove': pose = g.saveHigh || (gloveUp ? g.saveUp : !g.saveUp) ? 'glove_save' : 'blocker_save'; break;
      case 'hold': pose = 'cover'; break;
      case 'dive': case 'down': pose = g.stateT > 0.32 ? 'pad_stretch' : g.diveDir < 0 ? 'dive_up' : 'dive_down'; break;
      default:
        if ((g.prevState === 'hold' || g.prevState === 'dive' || g.prevState === 'down') && g.stateT < 0.2) pose = 'getting_up';
        else if (g.shuffle) pose = g.shuffle < 0 ? 'shuffle_up' : 'shuffle_down';
    }
    return set[pose] || set.ready;
  }

  // A goalie's art sets: their own rival art once it's loaded, otherwise home or away.
  // In the right-hand net they face left: real left-facing art (Batch L) when this
  // goalie has it, otherwise the right-facing art mirrored.
  // A goalie's pages: ours in the club colours (a signed rival goalie in our kit), theirs in theirs.
  goaliePages(g) { return g.team === 0 ? (g.look ? Assets.pagesFor(g.look) : Assets.clubPages()) : this.awayPages; }

  goalieSets(g) {
    const A = Assets.atlas, key = g.team === 0 ? 'home' : 'away';
    const drawn = g.team === 0 ? this.goaliePages(g) : this.awayPages || Assets.pages;
    const loaded = (set, probe) => { const f = set && Assets.frame(probe(set)); return f && (drawn[f[0]] || Assets.pages[f[0]]) ? set : null; };
    const pick = (all, probe) => (all && g.art && loaded(all[g.art], probe)) || (all && all[key]);
    const own = (all, probe) => all && loaded(all[g.art || key], probe); // never another goalie's art
    const left = g.goalSide > 0;
    const sideW = left && own(A.goalies_side_west, (s) => s.ready);
    const backW = left && own(A.goalies_back_west, (s) => s.ready);
    const puckW = left && own(A.goalies_puck_handling_west, (s) => s.pass_windup);
    return {
      side: sideW || pick(A.goalies_side, (s) => s.ready), flip: left && !sideW, gloveUp: !sideW,
      front: pick(A.goalies_front, (s) => s.idle_a),
      back: backW || pick(A.goalies_back, (s) => s.ready), backFlip: left && !backW,
      skate: pick(A.goalies_skating, (s) => s.east.frames[0]),
      puck: puckW || pick(A.goalies_puck_handling, (s) => s.pass_windup), puckFlip: left && !puckW,
    };
  }

  // Which pose a goalie shows: { id, flip, hidePuck }. Side, back and puck-handling art
  // faces right (toward the play from the left net) and is mirrored at the right net.
  // The front view faces the camera and is never mirrored.
  goaliePose(g, match, replay) {
    const S = this.goalieSets(g);
    if (!S.side) return null;
    const flip = S.flip, bflip = S.backFlip, pflip = S.puckFlip;
    const ms = match.state, mt = match.stateT;
    const beat = (t, n, rate) => Math.floor(t * rate) % n;
    // just played the puck from behind the net: the follow-through before skating back
    if (S.puck && g.state === 'return' && g.prevState === 'hold' && g.stateT < 0.2) return { id: S.puck.pass_release, flip: S.puckFlip };
    // skating to the bench when pulled, out to play the puck, or back to the crease
    if (S.skate && ((g.disabled && g.leaving) || g.state === 'skate_in' || g.state === 'roam' || g.state === 'return')) {
      const vx = g.disabled ? (g.team === 0 ? -20 : 20) - g.leaveX : g.vx;
      const vy = g.disabled ? RINK.minY - g.leaveY : g.vy;
      const dir = Math.abs(vx) > Math.abs(vy) * 0.8 ? (vx > 0 ? 'east' : 'west') : vy < 0 ? 'north' : 'south';
      const set = S.skate[dir];
      return { id: set.frames[beat(g.stateT, set.frames.length, 7)], flip: !!set.flip_x };
    }
    // whistles: face the camera; after a goal against, turn and fish the puck out
    if (!replay && S.front && S.back) {
      const F = S.front, B = S.back;
      if (ms === 'intro') return { id: F.wave, flip: false, front: true };
      if (ms === 'faceoff' && mt < 0.75) return { id: beat(mt, 2, 5) ? F.tap_pads : F.idle_a, flip: false, front: true };
      if (ms === 'penalty') return { id: beat(mt, 2, 1.6) ? F.idle_b : F.idle_a, flip: false, front: true };
      if (ms === 'over') return { id: match.winner === g.team ? (beat(mt, 2, 2.5) ? F.wave : F.celebrate) : F.dejected, flip: false, front: true };
      if (ms === 'goal' && match.lastGoal) {
        if (match.lastGoal.team === g.team) return { id: mt < 0.25 ? F.idle_a : F.celebrate, flip: false, front: true };
        if (mt < 0.7) return { id: B.look_back, flip: bflip };
        if (mt < 2.4) return { id: beat(mt, 2, 3.5) ? B.fish_puck_b : B.fish_puck_a, flip: bflip };
        return { id: B.dejected, flip: bflip };
      }
    }
    const P = S.puck;
    if (P) {
      if (g.state === 'poke') return { id: g.stateT < 0.12 ? P.poke_a : P.poke_b, flip: pflip };
      if (g.state === 'hold' && g.holdT < 0.3) return { id: P.pass_windup, flip: pflip, hidePuck: true };
      if (g.state === 'hold' && g.stopPose && g.stateT < 0.4) return { id: P.stop_behind_net, flip: pflip, hidePuck: true };
      if (g.state === 'ready' && g.prevState === 'hold' && g.stateT < 0.22) return { id: P.pass_release, flip: pflip };
    }
    // the puck's behind the goal line: look back over the shoulder
    const p = match.puck;
    if (S.back && g.state === 'ready' && !g.shuffle && !p.inNet && (p.x - g.goalSide * GOAL_X) * g.goalSide > 8) return { id: S.back.look_back, flip: bflip };
    return { id: this.goalieSideFrame(g, S.side, S.gloveUp), flip };
  }

  drawGoalie(ctx, g, match, pose) {
    const key = g.team === 0 ? 'home' : 'away';
    if (pose) {
      const { id, flip } = pose;
      const wx = g.disabled ? g.leaveX : g.x, wy = g.disabled ? g.leaveY : g.y;
      const p = toScreen(wx, wy);
      const pages = this.goaliePages(g);
      const k = GOALIE_SCALE * persp(wy) * (match.mods && match.mods.has('giant') ? 1.25 : 1);
      Assets.draw(ctx, id, p.x, p.y, k, { pages, flip });
      if (g.mask) this.drawGoalieMask(ctx, g, id, p.x, p.y, k, flip, pages); // a goalie made from parts (Batch AT)
      if (g.wallT > 0) this.drawTinted(ctx, id, pages, p.x, p.y, k, flip, 0, '#9fe8ff', 0.3 + Math.sin(match.time * 7) * 0.12); // Wall of Ice
      if (g.slowT > 0) this.drawTinted(ctx, id, pages, p.x, p.y, k, flip, 0, '#9fe8ff', 0.4);
      if (g.flash > 0) this.drawTinted(ctx, id, pages, p.x, p.y, k, flip, 0, '#ffffff', g.flash * 2.5);
      return;
    }
    let old = 'ready', rot = 0;
    switch (g.state) {
      case 'butterfly': old = 'butterfly'; break;
      case 'glove': case 'hold': old = 'glove_save'; break;
      case 'dive': case 'down': old = 'dive'; rot = g.diveDir * Math.PI * 0.42 * (g.goalSide < 0 ? -1 : 1); break;
      default:
        if (g.shuffle) old = g.shuffle < 0 ? 'shuffle_left' : 'shuffle_right';
    }
    const id = `goalies/${key}_south/${old}`;
    const p = toScreen(g.x, g.y);
    const pages = this.goaliePages(g);
    const flip = g.goalSide > 0;
    const k = GOALIE_SCALE * persp(g.y) * (match.mods && match.mods.has('giant') ? 1.25 : 1);
    const yOff = old === 'dive' ? -20 : 0;
    Assets.draw(ctx, id, p.x, p.y + yOff, k, { pages, flip, rot });
    if (g.slowT > 0) this.drawTinted(ctx, id, pages, p.x, p.y + yOff, k, flip, rot, '#9fe8ff', 0.4);
    if (g.flash > 0) this.drawTinted(ctx, id, pages, p.x, p.y + yOff, k, flip, rot, '#ffffff', g.flash * 2.5);
  }

  // A goalie made from parts: the painted mask on the body frame's anchor, then whatever passes
  // in front of it (a raised glove or paddle).
  drawGoalieMask(ctx, g, id, x, y, k, flip, pages) {
    const GP = Assets.atlas.goalie_parts, a = GP && GP.anchors[id], f = a && Assets.frame(id);
    const views = a && GP.masks[g.mask.mask];
    const head = views && (views[a.view] || views.s);
    const hf = head && Assets.frame(head), c = hf && Assets.paintCanvas(head, g.mask);
    if (!f || !c) return;
    const dx = (a.x - f[5]) * (k / f[7]), dy = (a.y - f[6]) * (k / f[7]);
    this.drawFrameCanvas(ctx, c, hf, x + (flip ? -dx : dx), y + dy, k, flip, ((a.rot || 0) * Math.PI / 180) * (flip ? -1 : 1));
    if (a.front) Assets.draw(ctx, a.front, x, y, k, { pages, flip });
  }

  puckInNet(p) {
    if (p.owner) return false;
    for (const side of [-1, 1]) {
      const behind = (p.x - side * GOAL_X) * side;
      if (behind > 0 && behind < NET_DEPTH + 4 && Math.abs(p.y) < MOUTH + 2 && p.z < 30) return true;
    }
    return false;
  }

  drawPuck(ctx, p, fx, match) {
    if (this.puckHeld) return;
    if (p.owner && p.owner.isGoalie && this.goaliePoses && this.goaliePoses.get(p.owner)?.hidePuck) return;
    const dark = match.twists && match.twists.shadows.length && match.inShadow(p.x, p.y);
    ctx.save();
    if (dark) ctx.globalAlpha = 0.2; // hard to see in a raven's shadow
    // Eclipse (and a shadow combo) hides the puck for the start of its flight
    const hid = p.shot && p.shot.special && (p.shot.special.eclipse ? 0.4 : p.shot.special.hidden || 0);
    if (hid && match.time - p.shot.t < hid) ctx.globalAlpha = 0.07;
    // a screened shot at the player in goal: faint until it's past the body in the way
    const sc = p.shot && p.shot.screener;
    if (sc && p.shot.screenedG && p.shot.screenedG.human && (p.x - sc.x) * p.shot.screenedG.goalSide < 0) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.3);
    // trail
    if (p.trail.length > 1) {
      const cb = p.shot && p.shot.special && p.shot.special.combo;
      const stick = p.shot && p.shot.by && p.shot.by.gear && GEAR_LOOK[p.shot.by.gear.stick];
      const sp = p.shot && p.shot.special;
      const col = sp && (sp.firestorm || sp.ember) && !cb ? '#ff7a3d' : sp && sp.eclipse ? '#6b4fd8' : cb ? COMBOS[cb].colors[1] : p.shot && p.shot.power ? POWER_INFO[p.shot.power].color : p.power ? POWER_INFO[p.power].color : stick && p.shot ? stick.color : '#ffffff';
      ctx.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
        const a = toScreen(p.trail[i - 1].x, p.trail[i - 1].y, p.trail[i - 1].z);
        const b = toScreen(p.trail[i].x, p.trail[i].y, p.trail[i].z);
        ctx.strokeStyle = hexA(col, 0.55 * (1 - i / p.trail.length));
        ctx.lineWidth = 7 * (1 - i / p.trail.length) + 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y - 3); ctx.lineTo(b.x, b.y - 3); ctx.stroke();
      }
    }
    // a puck on a drawn blade (stick handling, crossovers) is drawn there, easing back to where
    // it really is once it leaves the stick
    let s = toScreen(p.x, p.y, p.z);
    const now = performance.now() / 1000, dt = Math.min(0.1, now - (p._drawT || now));
    p._drawT = now;
    const on = p.owner && p.owner.isSkater && this.puckSpritePoint(p.owner, match);
    const off = p._drawOff ||= { x: 0, y: 0 };
    const e = 1 - Math.exp(-dt * (on ? 30 : 18)); // (quick: it follows the blade from forehand to backhand)
    off.x += ((on ? on.x - s.x : 0) - off.x) * e; off.y += ((on ? on.y - s.y : 0) - off.y) * e;
    s = { x: s.x + off.x, y: s.y + off.y };
    // off the ice: its shadow below it, smaller and fainter the higher it goes, so a lifted
    // shot or a chip reads as up in the air
    if (p.z > 1.5 && !p.inNet) {
      const g = toScreen(p.x, p.y, 0), k = persp(p.y) * Math.max(0.55, 1 - p.z * 0.006);
      ctx.fillStyle = `rgba(12, 24, 44, ${Math.max(0.12, 0.34 - p.z * 0.003).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(g.x + off.x, g.y - 1, 7 * k, 2.8 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    const sp = p.shot && p.shot.special;
    const comboType = sp && sp.combo ? { 'frost+thunder': 'lightning', 'frost+stone': 'ice', 'stone+thunder': 'lightning' }[sp.combo] : null;
    const type = p.power || comboType || (sp && sp.zero ? 'ice' : sp && (sp.thunder || sp.charged) ? 'lightning' : 'plain');
    const ph = 1 + (Math.floor(fx.time * 8) % 4);
    // (Settings › Puck: larger, and a ring round it, for small screens)
    if (this.puckRing && !p.inNet) {
      const k = persp(p.y) * (this.puckSize || 1), pulse = 0.75 + Math.sin(fx.time * 5) * 0.15;
      ctx.save(); ctx.globalAlpha *= pulse;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(11, 20, 36, 0.6)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 2, 13 * k, 9 * k, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffd45e'; ctx.stroke();
      ctx.restore();
    }
    Assets.draw(ctx, `power_pucks/${type}/phase_${ph}`, s.x, s.y - 2, PUCK_SCALE * persp(p.y) * (this.puckSize || 1));
    ctx.restore();
    if (p.power && match.state === 'play' && Math.random() < 0.5) {
      fx.part(p.x, p.y, 4, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, 60, 0.4, ELEMENT_COLORS[p.power][Math.floor(Math.random() * 3)], 2);
    }
  }

  drawBarrier(ctx, b) {
    const [ax, ay, bx, by] = b.ends();
    let frame = 4;
    if (b.t < 0.12) frame = 1; else if (b.t < 0.24) frame = 2; else if (b.t < 0.36) frame = 3;
    if (b.breaking > 0) frame = b.breaking > 0.3 ? 5 : 6;
    const pts = [0.17, 0.5, 0.83].map((t) => ({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t })).sort((a, c) => a.y - c.y);
    for (const q of pts) {
      const s = toScreen(q.x, q.y);
      Assets.draw(ctx, `ability_effects/stone_barrier/phase_${frame}`, s.x, s.y - 8, 0.2);
    }
  }

  drawPickupOrb(ctx, k, fx) {
    const s = toScreen(k.x, k.y);
    const fade = Math.min(1, k.t / 0.5, (k.life - k.t) / 1.5);
    const blink = k.life - k.t < 3 ? (Math.sin(fx.time * 18) > 0 ? 1 : 0.35) : 1;
    const bob = Math.sin(fx.time * 3 + k.x) * 5;
    Assets.draw(ctx, `power_pucks/${k.type}/pickup_orb`, s.x, s.y - 30 + bob, 0.2, { alpha: fade * blink });
  }

  // A hat thrown on the ice (a hat trick): the fans' own hats once they're drawn, else a simple
  // one in pixels: a toque with a bobble, a cap, a beanie.
  drawHat(ctx, p, s) {
    const id = `crowd_props/hats/hat_${1 + (p.style % 6)}`;
    const k = persp(p.y);
    if (Assets.frame(id)) { Assets.draw(ctx, id, s.x, s.y, 0.3 * k, { rot: Math.sin(p.rot) * 0.5 }); return; }
    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    ctx.rotate(Math.sin(p.rot) * 0.4);
    ctx.scale(2 * k, 2 * k);
    if (p.z <= 0.5) { ctx.fillStyle = 'rgba(12, 24, 44, 0.25)'; ctx.fillRect(-7, 1, 14, 2); }
    ctx.fillStyle = p.color;
    if (p.style === 1) { ctx.fillRect(-5, -6, 10, 5); ctx.fillRect(2, -2, 7, 2); } // a cap and its bill
    else { ctx.fillRect(-5, -6, 10, 6); ctx.fillRect(-4, -8, 8, 2); } // a toque
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    if (p.style === 0) ctx.fillRect(-2, -11, 4, 3); // the bobble
    else if (p.style === 2) ctx.fillRect(-5, -2, 10, 2); // a beanie's cuff
    ctx.restore();
  }

  // --------------------------------------------------------------- effects
  drawParticles(ctx, fx) {
    for (const p of fx.parts) {
      if (p.kind === 'ghost') continue;
      const s = toScreen(p.x, p.y, p.z);
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.fillStyle = p.color;
      if (p.kind === 'hat') { this.drawHat(ctx, p, s); continue; }
      if (p.kind === 'confetti') {
        const w = p.size * 1.6, h = p.size * Math.abs(Math.cos(p.rot));
        ctx.fillRect(s.x - w / 2, s.y - h / 2, w, h + 0.5);
      } else if (p.kind === 'line') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + p.dx, s.y + p.dy); ctx.stroke();
      } else ctx.fillRect(s.x - p.size / 2, s.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawAnims(ctx, fx) {
    for (const a of fx.anims) {
      const i = Math.min(a.frames.length - 1, Math.floor(a.t * a.fps));
      const s = toScreen(a.x, a.y, a.z);
      Assets.draw(ctx, a.prefix + a.frames[i], s.x, s.y, a.scale, { rot: a.rot, flip: a.flip });
    }
  }

  drawBolts(ctx, fx) {
    for (const b of fx.bolts) {
      const a = 1 - b.t / b.life;
      for (const [w, col] of [[7, `rgba(255,224,102,${0.5 * a})`], [3, `rgba(255,255,240,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath();
        b.pts.forEach((pt, i) => { const s = toScreen(pt.x, pt.y, 10); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
        ctx.stroke();
      }
    }
  }

  // Red goal lights on the end boards behind each net; the scored-on one spins.
  goalLightPos(side) {
    const s = toScreen(side * 727, -6);
    return { x: s.x, y: s.y - 14 };
  }

  drawGoalLights(ctx, match, fx) {
    if (!Assets.frame(GOAL_LIGHT + 1)) return;
    for (const side of [-1, 1]) {
      const p = this.goalLightPos(side);
      const lit = fx.lamp > 0 && match.lastGoal && match.lastGoal.side === side;
      const phase = !lit ? 1 : fx.flashes ? 2 + (Math.floor(fx.time * 16) % 6) : 4;
      Assets.draw(ctx, GOAL_LIGHT + phase, p.x, p.y, 0.17, { flip: side > 0 });
    }
  }

  drawGoalLamp(ctx, match, fx) {
    if (fx.lamp <= 0 || !match.lastGoal) return;
    const side = match.lastGoal.side;
    const sprite = !!Assets.frame(GOAL_LIGHT + 1);
    const s = sprite ? this.goalLightPos(side) : toScreen(side * (GOAL_X + NET_DEPTH + 10), 0);
    const cy = sprite ? s.y - 8 : s.y - 60;
    const on = fx.flashes ? Math.sin(fx.lamp * 12) > 0 : true;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = on ? 140 : 90;
    const g = ctx.createRadialGradient(s.x, cy, 0, s.x, cy, r);
    g.addColorStop(0, hexA('#ff3b3b', on ? 0.65 : 0.3));
    g.addColorStop(1, hexA('#ff3b3b', 0));
    ctx.fillStyle = g;
    ctx.fillRect(s.x - r, cy - r, r * 2, r * 2);
    ctx.restore();
    if (!sprite) Assets.draw(ctx, 'rink_props/props/lamp', s.x + side * 18, s.y - 40, 0.22);
  }

  drawReticle(ctx, fx) {
    const r = fx.reticle;
    if (!r) return;
    const s = toScreen(r.side * GOAL_X, 0);
    const k = r.t / r.life;
    ctx.strokeStyle = `rgba(255,224,102,${0.9 - k * 0.5})`;
    ctx.lineWidth = 3;
    const rad = 60 * (1 - k * 0.6);
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 10, rad * 0.5, rad, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x - rad * 0.7, s.y - 10); ctx.lineTo(s.x + rad * 0.7, s.y - 10);
    ctx.moveTo(s.x, s.y - 10 - rad * 1.2); ctx.lineTo(s.x, s.y - 10 + rad * 1.2); ctx.stroke();
  }

  drawOverheads(ctx, match, fx) {
    const versus = match.humans && match.humans.length > 1;
    for (const c of match.skaters) {
      if (!c.controlled || c.parked || match.state === 'over' || match.state === 'goal') continue;
      const p = toScreen(c.x, c.y);
      const bob = Math.sin(fx.time * 6) * 3;
      const tagArt = (versus || match.coop || match.keeperCoop) && Assets.frame('hud_elements/tags/p1') && `hud_elements/tags/${c.team === 1 ? 'p2_coral' : c.seat ? 'p2_mint' : 'p1'}`; // (Batch CI)
      if (tagArt && Assets.frame(tagArt)) Assets.draw(ctx, tagArt, p.x, p.y - 100 + bob, 0.5);
      else if (versus || match.coop || match.keeperCoop) {
        const tag = c.team === 1 || c.seat ? 'P2' : 'P1';
        ctx.font = `bold 16px ${this.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#14233b'; ctx.strokeText(tag, p.x, p.y - 104 + bob);
        ctx.fillStyle = seatColour(match, c); ctx.fillText(tag, p.x, p.y - 104 + bob);
      } else Assets.draw(ctx, 'hud_elements/misc/player_arrow', p.x, p.y - 96 + bob, 0.1);
      // charge meter
      if (c.charging || c.ultWindup > 0) {
        const v = c.ultWindup > 0 ? 1 : clamp((c.chargeT - 0.1) / 0.85, 0, 1);
        const w = 44, x = p.x - w / 2, y = p.y - 84;
        ctx.fillStyle = 'rgba(20,35,59,0.85)'; ctx.fillRect(x - 2, y - 2, w + 4, 8);
        ctx.fillStyle = v >= 1 ? '#ffd45e' : '#71dce8'; ctx.fillRect(x, y, w * v, 4);
      }
    }
    // keeper co-op: player 2's tag over our goalie
    if (match.keeperCoop && match.state !== 'over' && match.state !== 'goal') {
      const g = match.goalies[0], p = toScreen(g.x, g.y), bob = Math.sin(fx.time * 6) * 3;
      if (Assets.frame('hud_elements/tags/p2_mint')) Assets.draw(ctx, 'hud_elements/tags/p2_mint', p.x, p.y - 106 + bob, 0.5);
      else {
      ctx.font = `bold 16px ${this.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#14233b'; ctx.strokeText('P2', p.x, p.y - 110 + bob);
      ctx.fillStyle = '#7fe08a'; ctx.fillText('P2', p.x, p.y - 110 + bob);
      }
    }
    // penalty box timers and the extra attacker tag
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of match.skaters) {
      const tag = s.boxT > 0 ? `${Math.ceil(s.boxT)}s` : s.extraAttacker ? '+1' : null;
      if (!tag) continue;
      const p = s.boxT > 0 ? this.boxSpot(s) : toScreen(s.x, s.y);
      ctx.font = `bold 15px ${this.font}`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#14233b'; ctx.strokeText(tag, p.x, p.y - 100);
      ctx.fillStyle = s.boxT > 0 ? '#ff6f7d' : '#ffd45e'; ctx.fillText(tag, p.x, p.y - 100);
    }
    // small team chevrons over everyone else for readability
    for (const s of match.skaters) {
      if (s.controlled || s.parked || match.state === 'goal') continue;
      const p = toScreen(s.x, s.y);
      if (this.markers === 'shapes') {
        // colorblind-friendly: blue down-triangle for us, orange diamond for them
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        if (s.team === 0) { ctx.moveTo(p.x - 7, p.y - 94); ctx.lineTo(p.x + 7, p.y - 94); ctx.lineTo(p.x, p.y - 84); }
        else { ctx.moveTo(p.x, p.y - 96); ctx.lineTo(p.x + 6, p.y - 89); ctx.lineTo(p.x, p.y - 82); ctx.lineTo(p.x - 6, p.y - 89); }
        ctx.closePath();
        ctx.fillStyle = s.team === 0 ? '#3d8bff' : '#ff9f1c';
        ctx.fill(); ctx.stroke();
        continue;
      }
      ctx.fillStyle = s.team === 0 ? 'rgba(113,220,232,0.85)' : 'rgba(255,111,125,0.85)';
      ctx.beginPath(); ctx.moveTo(p.x - 4, p.y - 88); ctx.lineTo(p.x + 4, p.y - 88); ctx.lineTo(p.x, p.y - 83); ctx.fill();
    }
  }

  drawTexts(ctx, fx) {
    const zk = clamp(this.cam.zoom, 0.85, 1.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of fx.texts) {
      const k = t.t / t.life;
      const p = this.worldToCss(t.x, t.y);
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
      const size = Math.round(t.size * zk * pop);
      ctx.font = `${size}px ${this.font}`;
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const y = p.y - k * 30 * zk;
      ctx.lineWidth = Math.max(3, size / 5);
      ctx.strokeStyle = '#14233b';
      ctx.strokeText(t.str, p.x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  drawSnow(ctx, fx) {
    const share = this.snowShare ?? 1; // auto-quality
    if (share <= 0) return;
    const every = Math.round(1 / share);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const ox = (this.cam.x / BACKDROP.w) * 0.3, oy = (this.cam.y / BACKDROP.h) * 0.2;
    // the Winter Classic gets a second, nearer layer of big slow flakes
    for (const layer of fx.heavySnow ? [0, 1] : [0]) {
      for (let i = 0; i < fx.snow.length; i += every) {
        const f = fx.snow[i];
        const fx0 = layer ? (f.x + 0.37) % 1 : f.x, fy0 = layer ? (f.y * 0.8 + fx.time * 0.012 * f.s) % 1 : f.y;
        const x = ((((fx0 - ox * f.s * (layer ? 1.6 : 1)) % 1) + 1) % 1) * this.w;
        const y = ((((fy0 - oy * f.s) % 1) + 1) % 1) * this.h;
        const s = f.s * (layer ? 3 : 1.6);
        ctx.globalAlpha = (0.35 + f.s * 0.3) * (layer ? 0.8 : 1);
        ctx.fillRect(x, y, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Letterbox + captions baked into recorded goal clips.
  drawClipOverlay(ctx, fx) {
    const o = this.clipOverlay, w = this.w, h = this.h, bar = Math.max(34, h * 0.1);
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar);
    ctx.textBaseline = 'middle';
    const big = Math.round(bar * 0.55);
    ctx.font = `${big}px ${this.font}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#71dce8'; ctx.fillText('PUCKBOUND', 14, bar / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = Math.sin(fx.time * 6) > 0 ? '#ff3b3b' : '#7a1d1d';
    ctx.beginPath(); ctx.arc(w - 14 - ctx.measureText(t('REPLAY')).width - 12, bar / 2, big * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(t('REPLAY'), w - 14, bar / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd45e'; ctx.fillText(o.title, 14, h - bar / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff2cb'; ctx.fillText(o.score, w - 14, h - bar / 2);
  }

  // The darkened edges are a still overlay over the canvas (#vignette, in the page's CSS):
  // drawn here they were another full-screen gradient fill every frame. Only the goal
  // lamp's flicker is drawn.
  drawVignette(ctx, fx) {
    // a goal clip records the canvas: while one is being made the vignette is drawn on it, and
    // the page's still layer is hidden so it isn't doubled
    const rec = !!this.clipOverlay;
    if (rec !== this.vigRec) { this.vigRec = rec; const el = typeof document !== 'undefined' && document.getElementById('vignette'); if (el) el.hidden = rec; }
    if (rec) {
      if (!this.vig || this.vigW !== this.w || this.vigH !== this.h) {
        this.vigW = this.w; this.vigH = this.h;
        const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.45, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
        g.addColorStop(0, 'rgba(11,20,36,0)'); g.addColorStop(1, 'rgba(11,20,36,0.55)');
        this.vig = g;
      }
      ctx.fillStyle = this.vig;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (fx.flashes && fx.lamp > 0 && Math.sin(fx.lamp * 12) > 0) {
      ctx.fillStyle = hexA(fx.lampColor, 0.08);
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`;
}
