// Canvas renderer for matches: rink, crowd, skaters, goalies, puck, effects, camera.

import { Assets } from './assets.js';
import { toScreen, persp, BACKDROP, GOAL_X, MOUTH, NET_DEPTH, RINK } from './rink.js';
import { clamp, lerp, makeRng } from './util.js';
import { POWER_INFO, COMBOS, TEAMS, ARENAS, PALETTES } from './data.js';
import { ELEMENT_COLORS } from './fx.js';
import { NetRenderer, SpriteNets } from './net.js';

const SKATER_SCALE = 0.5; // world px per source px
const GOALIE_SCALE = 0.43;
const PUCK_SCALE = 0.115;
const DIRS8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
const DIRS4 = ['east', 'south', 'west', 'north'];
const GOAL_LIGHT = 'ice_spray_goal_lights/goal_light/phase_';

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
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
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
    const ctrl = match.humans && match.humans.length > 1 ? null : match.controlled();
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1424';
    ctx.fillRect(0, 0, this.c.width, this.c.height);
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
    const hostCrest = host && Assets.atlas.crests && Assets.atlas.crests[host.art];
    if (hostCrest) Assets.draw(ctx, hostCrest, cc.x, cc.y + 4, 0.26, { alpha: 0.3, squash: 0.8 });
    else Assets.draw(ctx, 'hud_elements/misc/home_crest', cc.x, cc.y + 2, 0.5, { alpha: 0.3, squash: 0.8 });
    this.drawLamps(ctx, fx);
    this.drawCrowd(ctx, fx, ui);
    this.drawArenaProps(ctx, match, fx, ui, arena);
    this.drawGoalLights(ctx, match, fx);
    if (fx.marks) ctx.drawImage(fx.marks, 0, 0, BACKDROP.w, BACKDROP.h);
    this.drawTwists(ctx, match, fx);
    this.drawTrails(ctx, match);
    this.drawPickupsGround(ctx, match, fx);
    this.drawShadows(ctx, match);
    this.drawGroundMarkers(ctx, match, fx);
    if (match.drill && match.drill.drawGround) match.drill.drawGround(ctx, this, match, fx, Assets);
    this.drawRings(ctx, fx);
    if (window.__debugRink) this.drawDebug(ctx, match);

    // depth-sorted sprites
    const list = [];
    for (const s of match.skaters) list.push({ y: s.y, f: () => this.drawSkater(ctx, s, match, fx) });
    // Nets: back layer, then a puck that's inside the net, then the front layer.
    // The goalie always draws after his own net so the crossbar never cuts through him.
    const NET_KEY = -MOUTH * 0.5;
    const p = match.puck;
    const inNet = this.puckInNet(p);
    for (const side of [-1, 1]) {
      list.push({ y: NET_KEY - 0.3, f: () => this.nets.draw(ctx, side, 'back') });
      list.push({ y: NET_KEY, f: () => this.nets.draw(ctx, side, 'front') });
    }
    for (const g of match.goalies) if (!g.disabled) list.push({ y: Math.max(g.y + 1, NET_KEY + 0.5), f: () => this.drawGoalie(ctx, g, match) });
    if (match.drill && match.drill.sprites) for (const sp of match.drill.sprites(match, this, Assets)) list.push({ y: sp.y, f: () => sp.f(ctx) });
    list.push({ y: inNet ? NET_KEY - 0.1 : p.owner ? p.y + 0.5 : p.y, f: () => this.drawPuck(ctx, p, fx, match) });
    for (const b of match.barriers) list.push({ y: b.y, f: () => this.drawBarrier(ctx, b) });
    for (const k of match.pickups) list.push({ y: k.y, f: () => this.drawPickupOrb(ctx, k, fx) });
    for (const pt of fx.parts) if (pt.kind === 'ghost') list.push({ y: pt.s.y - 1, f: () => this.drawGhost(ctx, pt, match) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    // near glass over anyone skating along the bottom boards (Pine Pond has snowbanks)
    if (Assets.glass && arena !== 'pine_pond') ctx.drawImage(Assets.glass, Assets.atlas.arena.glass.x, Assets.atlas.arena.glass.y);

    this.drawParticles(ctx, fx);
    this.drawAnims(ctx, fx);
    this.drawBolts(ctx, fx);
    this.drawGoalLamp(ctx, match, fx);
    this.drawReticle(ctx, fx);
    this.drawOverheads(ctx, match, fx);
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
    for (const f0 of fx.crowd) {
      const f = swap ? { ...f0, team: 1 - f0.team } : f0;
      const chanting = ch && ch.team === f.team;
      const cheer = fx.cheerTeam === f.team || (chanting && (onClap || onWord));
      const amp = cheer ? 7 : 1 + ex * 3;
      const sp = cheer ? 16 : 3 + ex * 6;
      const bob = chanting ? (onClap || onWord ? 6 : 0) : Math.max(0, Math.sin(t * sp + f.phase)) * amp;
      const s = f.s;
      const x = f.x, y = f.y - bob;
      if (sprites && !f.back) {
        // far stands: sprite fans facing the ice (and the camera)
        const up = cheer || (ex > 0.6 && Math.sin(t * 5 + f.phase) > 0.3);
        const list = sprites[f.team ? 'away' : 'home'][up ? 'cheering' : 'sitting'];
        Assets.draw(ctx, list[f.fan], x, y - 3 * s, 0.125 * s, { pages: f.team ? this.awayPages : Assets.pages, flip: f.phase > 3.14 });
        continue;
      }
      const body = f.team === 0 ? (f.phase > 3 ? '#71dce8' : '#fff2cb') : (f.phase > 3 ? awayColor : awayColor2);
      // body
      ctx.fillStyle = '#14233b';
      ctx.fillRect(x - 5 * s, y - 2 * s, 10 * s, 11 * s);
      ctx.fillStyle = body;
      ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 9 * s);
      // arms up when cheering
      if (cheer || (ex > 0.6 && Math.sin(t * 5 + f.phase) > 0.3)) {
        ctx.fillStyle = body;
        ctx.fillRect(x - 6 * s, y - 9 * s, 2 * s, 8 * s);
        ctx.fillRect(x + 4 * s, y - 9 * s, 2 * s, 8 * s);
      }
      // head
      ctx.fillStyle = '#14233b';
      ctx.fillRect(x - 4 * s, y - 9 * s, 8 * s, 8 * s);
      ctx.fillStyle = f.back ? (f.hat || '#3a2a20') : f.skin;
      ctx.fillRect(x - 3 * s, y - 8 * s, 6 * s, 6 * s);
      if (f.hat) { ctx.fillStyle = f.hat; ctx.fillRect(x - 3.5 * s, y - 9 * s, 7 * s, 3 * s); }
      if (f.sign && ex > 0.35) {
        ctx.fillStyle = '#fff2cb';
        ctx.fillRect(x - 9 * s, y - 22 * s, 18 * s, 10 * s);
        ctx.fillStyle = f.team === 0 ? '#14233b' : awayColor;
        ctx.fillRect(x - 7 * s, y - 19 * s, 14 * s, 3 * s);
      }
    }
  }

  // Hanging team banners and the Snow Fox at home, and the scoreboard in the icy buildings.
  drawArenaProps(ctx, match, fx, ui, arena) {
    const A = Assets.atlas.arena;
    if (!A) return;
    const t = fx.time;
    if (arena === 'home' && A.banners) {
      const vis = TEAMS[ui.awayTeamId] && A.banners[TEAMS[ui.awayTeamId].art];
      const spots = [[102, 36, 0], [1433, 36, 1], [120, 856, 1], [1417, 850, 0]];
      spots.forEach(([x, y, theirs], i) => {
        const id = theirs && vis ? vis : A.banners.glacial_strikers;
        Assets.draw(ctx, id, x, y, 0.185, { rot: Math.sin(t * 1.3 + i * 1.7) * 0.025 });
      });
    }
    if (arena === 'home' && A.mascot) {
      const party = (fx.cheerTeam === 0 && fx.lamp > 0) || (fx.chant && fx.chant.team === 0);
      let pose = 'idle';
      if (party) pose = Math.floor(t * 4) % 2 ? 'cheer_a' : 'cheer_b';
      else if (fx.excite > 0.55 || Math.floor(t / 3) % 4 === 0) pose = Math.floor(t * 2) % 2 ? 'wave' : 'idle';
      Assets.draw(ctx, A.mascot[pose], 768, 950 - (party ? Math.abs(Math.sin(t * 8)) * 6 : 0), 0.125);
    }
    if (A.scoreboard && arena !== 'ember_dome') this.drawScoreboard(ctx, match, fx, A.scoreboard);
  }

  // Scoreboard hanging over the far stairs, with the live score drawn into its displays.
  drawScoreboard(ctx, match, fx, sb) {
    const S = 0.09, X = 768, Y = 0;
    Assets.draw(ctx, sb.frame, X, Y, S);
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
      if (!fx.flashes || Math.floor(fx.time * 4) % 2) put(sb.fields.clock, match.state === 'over' ? 'FINAL' : 'GOAL!', g.team === 0 ? '#71dce8' : '#ff6f7d');
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
    for (const l of tw.lanes) {
      const a = toScreen(l.x0, l.y - l.h / 2), b = toScreen(l.x1, l.y + l.h / 2);
      const g = ctx.createLinearGradient(0, a.y, 0, b.y);
      g.addColorStop(0, 'rgba(113,220,232,0)');
      g.addColorStop(0.5, 'rgba(113,220,232,0.5)');
      g.addColorStop(1, 'rgba(113,220,232,0)');
      ctx.fillStyle = g;
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      // chevrons
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
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
    }
    if (tw.cracks.length) {
      if (!this.cracks || this.cracksFor !== tw) {
        this.cracksFor = tw;
        const r = makeRng(7);
        this.cracks = tw.cracks.map((c) => {
          const lines = [];
          for (let i = 0; i < 7; i++) {
            let a = r.range(0, Math.PI * 2), x = c.x, y = c.y;
            const pts = [[x, y]];
            for (let j = 0; j < 5; j++) {
              a += r.range(-0.6, 0.6);
              const l = r.range(10, c.r / 3.2);
              x += Math.cos(a) * l; y += Math.sin(a) * l * 0.8;
              pts.push([x, y]);
            }
            lines.push(pts);
          }
          return { c, lines };
        });
      }
      for (const { c, lines } of this.cracks) {
        const s = toScreen(c.x, c.y);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, c.r);
        g.addColorStop(0, 'rgba(60,110,150,0.32)');
        g.addColorStop(1, 'rgba(60,110,150,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, c.r, c.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,70,110,0.7)';
        for (const pts of lines) {
          ctx.beginPath();
          pts.forEach(([x, y], i) => { const q = toScreen(x, y); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
          ctx.stroke();
        }
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        for (const pts of lines) {
          ctx.beginPath();
          pts.forEach(([x, y], i) => { const q = toScreen(x, y); i ? ctx.lineTo(q.x + 1, q.y - 1) : ctx.moveTo(q.x + 1, q.y - 1); });
          ctx.stroke();
        }
      }
    }
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

  drawShadows(ctx, match) {
    ctx.fillStyle = 'rgba(20,35,59,0.28)';
    for (const s of match.skaters) {
      const p = toScreen(s.x, s.y), k = persp(s.y);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 21 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of match.goalies) {
      if (g.disabled) continue;
      const p = toScreen(g.x, g.y);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    const pk = match.puck;
    if (!pk.inNet || true) {
      const p = toScreen(pk.x, pk.y);
      const zf = clamp(1 - pk.z / 80, 0.4, 1);
      ctx.fillStyle = `rgba(20,35,59,${0.35 * zf})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 8 * zf, 3 * zf, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawGroundMarkers(ctx, match, fx) {
    const versus = match.humans && match.humans.length > 1;
    for (const c of match.skaters) {
      if (!c.controlled || c.parked || match.state === 'over') continue;
      const p = toScreen(c.x, c.y);
      const pulse = 1 + Math.sin(fx.time * 6) * 0.05;
      if (versus && c.team === 1) {
        ctx.strokeStyle = '#ff6f7d'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 24 * pulse, 9 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      } else Assets.draw(ctx, 'hud_elements/misc/selection_ring', p.x, p.y + 1, 0.2 * pulse * persp(c.y), { alpha: 0.95 });
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
    const map = set[dir];
    const side = dir.endsWith('east') ? 'east' : dir.endsWith('west') ? 'west' : null;
    const sp = s.speed;

    // hit reactions: stagger, then a knockdown held for the stun on big hits
    if (s.stun <= 0) s._stunMax = 0;
    else if (!s._stunMax || s.stun > s._prevStun + 1e-4) s._stunMax = s.stun; // new or refreshed
    s._prevStun = s.stun;
    if (s.stun > 0 && set.hit) {
      const seq = set.hit[side ? 'east' : 'south'];
      const t = s._stunMax - s.stun;
      let i = 0;
      if (s._stunMax >= 0.38) i = t < 0.1 ? 0 : s.stun > 0.14 ? 1 : 2;
      return { id: seq[i], flip: side === 'west', pose: i === 1 ? 'down' : 'stagger' };
    }
    let pose = 'idle';
    if (s.celebrate > 0 && (match.state === 'goal' || match.state === 'over') && set.signature && match.lastGoal && match.lastGoal.scorer === s) {
      const i = Math.min(3, Math.floor((3 - s.celebrate) * 6));
      return { id: set.signature[i], flip: Math.cos(s.face) < -0.3, pose: 'signature' };
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
        const st = set.stride;
        const flip = dir === 'west';
        if (s.stopping) return { id: st.stop, flip, pose: 'stop' };
        if (s.gliding && sp < s.d.maxSpeed * 1.05) return { id: st.glide, flip, pose: 'glide' };
        return { id: st.frames[Math.floor(s.animT * (3 + sp / 60)) % 4], flip, pose: 'stride' };
      }
      if (s.gliding && map.frames.skate_a) pose = 'skate_b';
      else pose = Math.floor(s.animT * (3 + sp / 70)) % 2 ? 'skate_a' : 'skate_b';
    }
    return { id: map.frames[pose], flip: map.flip_x, pose };
  }

  // A rival's own roster art once its page has loaded, else our art in their colours.
  spriteOf(s) {
    if (s.sprite === s.def.sprite) return s.sprite;
    const set = Assets.atlas.skaters[s.sprite];
    const f = set && Assets.frame(set.away.south.frames.idle);
    return f && Assets.pages[f[0]] ? s.sprite : s.def.sprite;
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

  drawSkater(ctx, s, match, fx) {
    const fr = this.skaterFrame(s, match);
    const p = toScreen(s.x, s.y);
    const k = SKATER_SCALE * persp(s.y);
    let y = p.y, rot = 0;
    if (fr.pose === 'celebrate') y -= Math.abs(Math.sin(s.animT * 7 + s.slot)) * 12;
    if (fr.pose === 'check' && s.stun > 0) rot = Math.sin(s.animT * 30) * 0.12 + (fr.flip ? 0.25 : -0.25);
    else if (fr.pose === 'stagger') rot = Math.sin(s.animT * 30) * 0.05;
    const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.pages) : this.awayPages;
    // aura for active abilities
    if (s.bedrockT > 0) this.aura(ctx, p.x, p.y - 30, 34, '#c9b79c', fx.time);
    if (s.boostT > 0 || s.trailT > 0) this.aura(ctx, p.x, p.y - 26, 28, '#71dce8', fx.time);
    if (s.empowered > 0) this.aura(ctx, p.x, p.y - 30, 30, '#ffe066', fx.time * 2);
    Assets.draw(ctx, fr.id, p.x, y, k, { flip: fr.flip, rot, pages });
    let tint = null;
    if (s.flash > 0) tint = ['#ffffff', 0.7 * (s.flash / 0.25)];
    else if (s.slowT > 0 && s.slowMul < 0.9) tint = ['#9fe8ff', 0.45];
    else if (s.bedrockT > 0) tint = ['#b8a58c', 0.22];
    if (tint) this.drawTinted(ctx, fr.id, pages, p.x, y, k, fr.flip, rot, tint[0], tint[1]);
  }

  drawGhost(ctx, g, match) {
    if (g.t < 0) return;
    const s = g.s;
    const fr = this.skaterFrame(s, match);
    const p = toScreen(g.x, g.y);
    const pages = s.team === 0 ? (s.look ? Assets.pagesFor(s.look) : Assets.pages) : this.awayPages;
    this.drawTinted(ctx, fr.id, pages, p.x, p.y, SKATER_SCALE * persp(g.y), fr.flip, 0, '#ffe066', 0.55 * (1 - g.t / g.life), true);
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

  goalieSideFrame(g, set) {
    let pose = 'ready';
    switch (g.state) {
      case 'butterfly': pose = 'butterfly'; break;
      case 'glove': pose = g.saveHi ? 'glove_save' : 'blocker_save'; break;
      case 'hold': pose = 'cover'; break;
      case 'dive': case 'down': pose = g.stateT > 0.32 ? 'pad_stretch' : g.diveDir < 0 ? 'dive_up' : 'dive_down'; break;
      default:
        if ((g.prevState === 'hold' || g.prevState === 'dive' || g.prevState === 'down') && g.stateT < 0.2) pose = 'getting_up';
        else if (g.shuffle) pose = g.shuffle < 0 ? 'shuffle_up' : 'shuffle_down';
    }
    return set[pose] || set.ready;
  }

  drawGoalie(ctx, g, match) {
    const key = g.team === 0 ? 'home' : 'away';
    const gs = Assets.atlas.goalies_side || {};
    let side = g.art && gs[g.art];
    const sf = side && Assets.frame(side.ready);
    if (!sf || !Assets.pages[sf[0]]) side = gs[key];
    if (side) {
      const id = this.goalieSideFrame(g, side);
      const p = toScreen(g.x, g.y);
      const pages = g.team === 0 ? Assets.pages : this.awayPages;
      const flip = g.goalSide > 0; // the art faces right, toward the play from the left net
      const k = GOALIE_SCALE * persp(g.y) * (match.mods && match.mods.has('giant') ? 1.25 : 1);
      Assets.draw(ctx, id, p.x, p.y, k, { pages, flip });
      if (g.slowT > 0) this.drawTinted(ctx, id, pages, p.x, p.y, k, flip, 0, '#9fe8ff', 0.4);
      if (g.flash > 0) this.drawTinted(ctx, id, pages, p.x, p.y, k, flip, 0, '#ffffff', g.flash * 2.5);
      return;
    }
    let pose = 'ready', rot = 0;
    switch (g.state) {
      case 'butterfly': pose = 'butterfly'; break;
      case 'glove': case 'hold': pose = 'glove_save'; break;
      case 'dive': case 'down': pose = 'dive'; rot = g.diveDir * Math.PI * 0.42 * (g.goalSide < 0 ? -1 : 1); break;
      default:
        if (g.shuffle) pose = g.shuffle < 0 ? 'shuffle_left' : 'shuffle_right';
    }
    const id = `goalies/${key}_south/${pose}`;
    const p = toScreen(g.x, g.y);
    const pages = g.team === 0 ? Assets.pages : this.awayPages;
    const flip = g.goalSide > 0;
    const k = GOALIE_SCALE * persp(g.y) * (match.mods && match.mods.has('giant') ? 1.25 : 1);
    const yOff = pose === 'dive' ? -20 : 0;
    Assets.draw(ctx, id, p.x, p.y + yOff, k, { pages, flip, rot });
    if (g.slowT > 0) this.drawTinted(ctx, id, pages, p.x, p.y + yOff, k, flip, rot, '#9fe8ff', 0.4);
    if (g.flash > 0) this.drawTinted(ctx, id, pages, p.x, p.y + yOff, k, flip, rot, '#ffffff', g.flash * 2.5);
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
    // trail
    if (p.trail.length > 1) {
      const cb = p.shot && p.shot.special && p.shot.special.combo;
      const col = cb ? COMBOS[cb].colors[1] : p.shot && p.shot.power ? POWER_INFO[p.shot.power].color : p.power ? POWER_INFO[p.power].color : '#ffffff';
      ctx.lineCap = 'round';
      for (let i = 1; i < p.trail.length; i++) {
        const a = toScreen(p.trail[i - 1].x, p.trail[i - 1].y, p.trail[i - 1].z);
        const b = toScreen(p.trail[i].x, p.trail[i].y, p.trail[i].z);
        ctx.strokeStyle = hexA(col, 0.55 * (1 - i / p.trail.length));
        ctx.lineWidth = 7 * (1 - i / p.trail.length) + 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y - 3); ctx.lineTo(b.x, b.y - 3); ctx.stroke();
      }
    }
    const s = toScreen(p.x, p.y, p.z);
    const sp = p.shot && p.shot.special;
    const comboType = sp && sp.combo ? { 'frost+thunder': 'lightning', 'frost+stone': 'ice', 'stone+thunder': 'lightning' }[sp.combo] : null;
    const type = p.power || comboType || (sp && sp.zero ? 'ice' : sp && (sp.thunder || sp.charged) ? 'lightning' : 'plain');
    const ph = 1 + (Math.floor(fx.time * 8) % 4);
    Assets.draw(ctx, `power_pucks/${type}/phase_${ph}`, s.x, s.y - 2, PUCK_SCALE * persp(p.y));
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

  // --------------------------------------------------------------- effects
  drawParticles(ctx, fx) {
    for (const p of fx.parts) {
      if (p.kind === 'ghost') continue;
      const s = toScreen(p.x, p.y, p.z);
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        const w = p.size * 1.6, h = p.size * Math.abs(Math.cos(p.rot));
        ctx.fillRect(s.x - w / 2, s.y - h / 2, w, h + 0.5);
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
      if (versus) {
        ctx.font = `bold 16px ${this.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#14233b'; ctx.strokeText(c.team === 0 ? 'P1' : 'P2', p.x, p.y - 104 + bob);
        ctx.fillStyle = c.team === 0 ? '#71dce8' : '#ff6f7d'; ctx.fillText(c.team === 0 ? 'P1' : 'P2', p.x, p.y - 104 + bob);
      } else Assets.draw(ctx, 'hud_elements/misc/player_arrow', p.x, p.y - 96 + bob, 0.1);
      // charge meter
      if (c.charging || c.ultWindup > 0) {
        const v = c.ultWindup > 0 ? 1 : clamp((c.chargeT - 0.1) / 0.85, 0, 1);
        const w = 44, x = p.x - w / 2, y = p.y - 84;
        ctx.fillStyle = 'rgba(20,35,59,0.85)'; ctx.fillRect(x - 2, y - 2, w + 4, 8);
        ctx.fillStyle = v >= 1 ? '#ffd45e' : '#71dce8'; ctx.fillRect(x, y, w * v, 4);
      }
    }
    // penalty box timers and the extra attacker tag
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of match.skaters) {
      const tag = s.boxT > 0 ? `${Math.ceil(s.boxT)}s` : s.extraAttacker ? '+1' : null;
      if (!tag) continue;
      const p = toScreen(s.x, s.y);
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
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const ox = (this.cam.x / BACKDROP.w) * 0.3, oy = (this.cam.y / BACKDROP.h) * 0.2;
    for (const f of fx.snow) {
      const x = ((((f.x - ox * f.s) % 1) + 1) % 1) * this.w;
      const y = ((((f.y - oy * f.s) % 1) + 1) % 1) * this.h;
      const s = f.s * 1.6;
      ctx.globalAlpha = 0.35 + f.s * 0.3;
      ctx.fillRect(x, y, s, s);
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
    ctx.fillStyle = '#71dce8'; ctx.fillText('GLACIAL STRIKERS', 14, bar / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = Math.sin(fx.time * 6) > 0 ? '#ff3b3b' : '#7a1d1d';
    ctx.beginPath(); ctx.arc(w - 14 - ctx.measureText('REPLAY').width - 12, bar / 2, big * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText('REPLAY', w - 14, bar / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd45e'; ctx.fillText(o.title, 14, h - bar / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff2cb'; ctx.fillText(o.score, w - 14, h - bar / 2);
  }

  drawVignette(ctx, fx) {
    if (!this.vig || this.vigW !== this.w || this.vigH !== this.h) {
      this.vigW = this.w; this.vigH = this.h;
      const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.45, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      g.addColorStop(0, 'rgba(11,20,36,0)');
      g.addColorStop(1, 'rgba(11,20,36,0.55)');
      this.vig = g;
    }
    ctx.fillStyle = this.vig;
    ctx.fillRect(0, 0, this.w, this.h);
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
