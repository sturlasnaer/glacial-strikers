// Visual effects: particles, sprite animations, floating text, ice scratches, crowd,
// screen shake, hit-stop and slow motion. Listens to match events.

import { toScreen, persp, GOAL_X, BACKDROP } from './rink.js';
import { POWER_INFO, COMBOS } from './data.js';
import { makeRng, clamp } from './util.js';

const rnd = makeRng(1234);
const SPRAY = 'ice_spray_goal_lights/ice_spray/phase_';
const CHIPS = 'ice_spray_goal_lights/ice_chips/phase_';
const PHASES = [1, 2, 3, 4, 5, 6, 7, 8];

const ELEMENT_COLORS = {
  fire: ['#ffd27a', '#ff8a3d', '#ff4d2e'],
  ice: ['#ffffff', '#bff4ff', '#71dce8'],
  lightning: ['#fffbd1', '#ffe066', '#ffd23f'],
  gravity: ['#e3cfff', '#b07cff', '#7a4bd6'],
  snow: ['#ffffff', '#eaf6ff', '#cfe9f7'],
  gold: ['#fff2cb', '#ffd45e', '#ffb340'],
};

export class FX {
  constructor() {
    this.parts = [];
    this.anims = [];
    this.texts = [];
    this.bolts = [];
    this.rings = [];
    this.shakeT = 0; // trauma 0..1
    this.hitstop = 0;
    this.slowmo = 0;
    this.slowScale = 1;
    this.flash = null; // { color, t, life }
    this.lamp = 0; // goal lamp timer
    this.lampColor = '#ff3b3b';
    this.zoomPunch = 0;
    this.crowd = makeCrowd();
    this.excite = 0; // crowd excitement 0..1
    this.cheerTeam = null;
    this.shakeMul = 1; this.flashes = true; this.particleMul = 1; // comfort settings
    this.chant = null; // { team, t } crowd chanting in rhythm
    this.marks = null; // offscreen canvas for skate scratches
    this.marksCtx = null;
    this.marksFade = 0;
    this.time = 0;
    this.snow = Array.from({ length: 70 }, () => ({ x: rnd(), y: rnd(), s: rnd.range(0.6, 1.8), v: rnd.range(0.02, 0.06), w: rnd.range(0, 6.28) }));
  }

  attach(match, homeColor, awayColor) {
    this.match = match;
    this.colors = [homeColor, awayColor];
    this.parts.length = 0; this.anims.length = 0; this.texts.length = 0; this.bolts.length = 0; this.rings.length = 0;
    this.excite = 0.2;
    if (typeof document !== 'undefined') {
      if (!this.marks) {
        this.marks = document.createElement('canvas');
        this.marks.width = BACKDROP.w / 2; this.marks.height = BACKDROP.h / 2;
        this.marksCtx = this.marks.getContext('2d');
      }
      this.marksCtx.clearRect(0, 0, this.marks.width, this.marks.height);
    }
    const on = (t, f) => match.on(t, f);
    on('stride', ({ s }) => this.scratch(s, 1));
    on('stop', ({ s, power }) => {
      this.scratch(s, 3);
      // spray fans out in the direction of travel
      const dir = Math.sign(s.vx) || 1;
      this.anim(SPRAY, s.x + dir * 8, s.y + 2, clamp(0.09 + power / 4000, 0.1, 0.16), { fps: 22, frames: PHASES, flip: dir < 0 });
      const n = Math.min(12, 3 + power / 40);
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(s.vy, s.vx) + rnd.range(-0.9, 0.9);
        const sp = rnd.range(60, 220);
        this.part(s.x + Math.cos(a) * 12, s.y + Math.sin(a) * 8, 2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd.range(60, 160), rnd.range(0.3, 0.7), rnd.pick(ELEMENT_COLORS.snow), rnd.range(1.5, 3.2));
      }
    });
    on('shot', ({ s, kind, power, special }) => {
      const p = match.puck;
      const big = kind === 'slap' || kind === 'onetimer' || kind === 'zero' || kind === 'thunderclap';
      this.ring(p.x, p.y, big ? 34 : 20, '#ffffff', 0.25);
      this.burst(p.x, p.y, 4, big ? 12 : 6, power ? ELEMENT_COLORS[power] : ELEMENT_COLORS.snow, 160, 0.35);
      if (big) this.shake(0.25);
      if (kind === 'onetimer') this.text(s.x, s.y - 90, 'ONE-TIMER!', '#ffe066', 1.1, 22);
      if (kind === 'zero') this.anim('ability_effects/frost_shot/phase_', p.x, p.y, 0.5, { follow: p, fps: 14 });
      if (kind === 'thunderclap') { this.flashScreen('#fff7c2', 0.25); this.shake(0.5); this.anim('ability_effects/lightning_shot/phase_', p.x, p.y, 0.55, { follow: p, fps: 16 }); }
      if (power) this.text(s.x, s.y - 90, POWER_INFO[power].name.toUpperCase() + '!', POWER_INFO[power].color, 1, 20);
      if (special && special.charged) this.text(s.x, s.y - 110, 'CHARGED!', '#ffe066', 1, 18);
    });
    on('hit', ({ a, b, power, stripped }) => {
      const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      this.anim('ability_effects/check_impact/phase_', x, y + 4, clamp(0.22 + power / 1600, 0.24, 0.5), { fps: 18, z: 26 });
      if (power > 180) this.anim(CHIPS, b.x, b.y + 2, clamp(0.08 + power / 5000, 0.09, 0.15), { fps: 18, frames: PHASES, flip: b.x < a.x });
      this.shake(clamp(power / 700, 0.15, 0.6));
      this.hitstop = Math.max(this.hitstop, clamp(0.03 + power / 6000, 0.04, 0.1));
      this.excite = Math.min(1, this.excite + 0.15);
      if (power > 260) this.text(x, y - 80, rnd.pick(['CRUNCH!', 'BOOM!', 'WHAM!']), '#ffffff', 0.8, 20);
      if (stripped) this.text(b.x, b.y - 100, 'PUCK LOOSE', '#fff2cb', 0.8, 14);
      if (a.bedrockT > 0) this.anim('ability_effects/stone_barrier/phase_', b.x, b.y + 4, 0.18, { fps: 20, frames: [1, 2, 5, 6] });
    });
    on('steal', ({ s }) => this.text(s.x, s.y - 92, 'STEAL!', '#71dce8', 0.9, 18));
    // arena rules
    on('splash', ({ x, y, power }) => {
      const n = Math.min(14, 5 + power / 40);
      for (let i = 0; i < n; i++) {
        const a = rnd.range(0, Math.PI * 2), sp = rnd.range(40, 150);
        this.part(x, y, 2, Math.cos(a) * sp, Math.sin(a) * sp * 0.7, rnd.range(90, 200), rnd.range(0.3, 0.6), rnd.pick(['#cfe9f7', '#ffd8b0', '#9fc3e0']), rnd.range(1.6, 3));
      }
    });
    on('ice_crack', ({ x, y, k }) => {
      this.anim(CHIPS, x, y + 2, 0.1 + k * 0.03, { fps: 18, frames: PHASES });
      this.shake(0.12 * k);
      this.text(x, y - 40, 'CRACK!', '#cfe9f7', 0.6, 14);
    });
    on('block', ({ s }) => { this.text(s.x, s.y - 92, 'BLOCKED!', '#fff2cb', 0.9, 18); this.shake(0.15); });
    on('save', ({ g, caught, speed }) => {
      if (caught === false || (speed && speed > 700)) {
        this.burst(g.x - g.goalSide * 10, g.y, 14, 10, ELEMENT_COLORS.snow, 180, 0.4);
        this.shake(0.15);
      }
      if (speed > 850 || caught === false) this.text(g.x - g.goalSide * 30, g.y - 110, caught ? 'SAVE!' : 'REBOUND', caught ? '#ffffff' : '#fff2cb', 0.9, caught ? 20 : 15);
      this.excite = Math.min(1, this.excite + 0.2);
    });
    on('goalie_dive', ({ g }) => {
      this.burst(g.x, g.y, 2, 6, ELEMENT_COLORS.snow, 160, 0.4);
      this.anim(CHIPS, g.x, g.y + 2, 0.12, { fps: 18, frames: PHASES, flip: g.diveDir < 0 });
    });
    on('post', ({ x, y }) => { this.burst(x, y, 20, 12, ELEMENT_COLORS.gold, 220, 0.4); this.text(x, y - 70, 'POST!', '#ff6f7d', 0.9, 18); this.shake(0.2); this.excite = Math.min(1, this.excite + 0.3); });
    on('puck_boards', ({ x, y, power }) => { if (power > 500) this.burst(x, y, 4, 6, ELEMENT_COLORS.snow, 100, 0.3); });
    on('goal', (g) => {
      const side = g.side;
      const color = this.colors[g.team] || '#ffd45e';
      this.lamp = 3.2; this.lampColor = color;
      this.slowmo = 0.9; this.slowScale = 0.3;
      this.shake(0.8);
      this.zoomPunch = 1;
      this.excite = 1; this.cheerTeam = g.team;
      this.flashScreen('#ffffff', 0.2);
      const gx = side * GOAL_X;
      for (let i = 0; i < 70; i++) {
        const a = rnd.range(0, Math.PI * 2);
        const sp = rnd.range(80, 420);
        this.part(gx - side * 10, g.y, rnd.range(10, 40), Math.cos(a) * sp - side * 120, Math.sin(a) * sp, rnd.range(150, 420), rnd.range(0.8, 1.8), rnd.pick(['#ffd45e', '#ffffff', color, '#71dce8', '#ff6f7d']), rnd.range(2, 4), 'confetti');
      }
      this.ring(gx, g.y, 120, color, 0.6);
    });
    on('power_get', ({ type, k }) => {
      this.burst(k.x, k.y, 10, 26, ELEMENT_COLORS[type], 260, 0.6);
      this.ring(k.x, k.y, 70, POWER_INFO[type].color, 0.5);
      this.text(k.x, k.y - 70, POWER_INFO[type].name.toUpperCase(), POWER_INFO[type].color, 1.2, 20);
    });
    on('pickup_spawn', ({ k }) => { this.ring(k.x, k.y, 46, POWER_INFO[k.type].color, 0.6); this.burst(k.x, k.y, 20, 14, ELEMENT_COLORS[k.type], 120, 0.6); });
    on('skill', ({ s, id }) => {
      if (id === 'dash') {
        this.anim('ability_effects/lightning_dash/phase_', s.x, s.y, 0.42, { rot: Math.atan2(s.dashDir.y, s.dashDir.x), fps: 26, z: 26 });
        this.flashScreen('#fff7c2', 0.08);
        for (let i = 0; i < 4; i++) this.ghost(s, i * 0.04);
      }
      if (id === 'bedrock') { this.anim('ability_effects/stone_barrier/phase_', s.x, s.y + 6, 0.22, { fps: 16, frames: [1, 2, 3, 5, 6] }); this.shake(0.2); }
      if (id === 'glide') this.burst(s.x, s.y, 2, 16, ELEMENT_COLORS.ice, 160, 0.5);
      this.text(s.x, s.y - 96, s.def.skill.name.toUpperCase(), '#ffffff', 0.9, 15);
    });
    on('ult', ({ s, id }) => {
      this.text(s.x, s.y - 110, s.def.ult.name.toUpperCase() + '!', '#ffd45e', 1.3, 24);
      this.flashScreen(id === 'zero' ? '#bff4ff' : id === 'monolith' ? '#c9b79c' : '#fff7c2', 0.18);
      this.shake(0.35);
    });
    on('ult_windup', ({ s, t }) => {
      this.anim('ability_effects/lightning_shot/phase_', s.x, s.y, 0.4, { fps: 6 / t, follow: s, z: 30, frames: [1, 2, 3, 4] });
      this.reticle = { side: s.side, t: 0, life: t + 0.3 };
    });
    on('barrier', ({ b }) => { this.shake(0.5); this.burst(b.x, b.y, 4, 26, ['#8a7f73', '#b5a796', '#5e564d'], 220, 0.6); });
    on('barrier_block', ({ b }) => { this.shake(0.4); this.text(b.x, b.y - 80, 'WALLED!', '#c9b79c', 1, 20); this.burst(b.x, b.y, 10, 30, ['#8a7f73', '#b5a796', '#5e564d'], 260, 0.7); });
    on('frozen', ({ s, g }) => {
      const e = s || g;
      this.anim('ability_effects/frost_shot/phase_', e.x, e.y, 0.22, { fps: 14, z: 30 });
      this.text(e.x, e.y - 96, 'FROZEN', '#bff4ff', 0.8, 15);
    });
    on('lightning_pass', ({ x0, y0, to }) => {
      this.bolt(x0, y0, to.x, to.y);
      this.flashScreen('#fff7c2', 0.1);
      this.text(to.x, to.y - 96, 'CHARGED!', '#ffe066', 1, 18);
    });
    on('faceoff_win', ({ s }) => this.text(s.x, s.y - 92, 'WON IT!', '#ffffff', 0.7, 14));
    on('combo', ({ s, key }) => {
      const p = match.puck;
      const c = COMBOS[key];
      this.text(s.x, s.y - 112, c.name.toUpperCase() + '!', c.colors[1], 1.3, 26);
      this.burst(p.x, p.y, 6, 22, [c.colors[0], c.colors[1], '#ffffff'], 260, 0.5);
      this.ring(p.x, p.y, 60, c.colors[1], 0.4);
      this.shake(0.35);
      if (key === 'frost+thunder') { this.anim('ability_effects/frost_shot/phase_', p.x, p.y, 0.4, { follow: p, fps: 14 }); this.anim('ability_effects/lightning_shot/phase_', p.x, p.y, 0.35, { follow: p, fps: 16 }); }
      if (key === 'frost+stone') { this.anim('ability_effects/stone_barrier/phase_', s.x, s.y + 4, 0.2, { fps: 18, frames: [1, 2, 5, 6] }); this.anim('ability_effects/frost_shot/phase_', p.x, p.y, 0.4, { follow: p, fps: 14 }); }
    });
    on('quake', ({ s, radius }) => {
      this.ring(s.x, s.y, radius * 1.6, '#ffe066', 0.5);
      this.ring(s.x, s.y, radius * 1.1, '#c9b79c', 0.6);
      this.anim('ability_effects/check_impact/phase_', s.x, s.y + 4, 0.45, { fps: 18 });
      this.anim('ability_effects/stone_barrier/phase_', s.x, s.y + 6, 0.25, { fps: 16, frames: [1, 2, 3, 5, 6] });
      this.burst(s.x, s.y, 2, 30, ['#8a7f73', '#b5a796', '#ffe066'], 300, 0.6);
      this.shake(0.55);
      this.hitstop = Math.max(this.hitstop, 0.06);
    });
    on('plow', ({ s, x, y }) => {
      this.anim('ability_effects/check_impact/phase_', x, y, 0.3, { fps: 20, z: 20 });
      this.text(s.x, s.y - 96, 'PLOWED!', '#c9b79c', 0.9, 18);
      this.shake(0.3);
    });
    on('chain', ({ s, n }) => this.text(s.x, s.y - 100, `PASS CHAIN x${n}`, '#71dce8', 0.9, 16));
    on('combo_ready', ({ s }) => { if (s.controlled || s.team === 0) this.text(s.x, s.y - 104, 'COMBO!', '#ffd45e', 0.6, 15); });
    on('ult_ready', ({ s }) => { if (s.controlled) this.text(s.x, s.y - 110, 'ULTIMATE READY', '#ffd45e', 1.2, 16); });
  }

  // ---------------------------------------------------------------- spawners
  part(x, y, z, vx, vy, vz, life, color, size, kind = 'dot') {
    if (this.parts.length > 600) return;
    if (this.particleMul < 1 && rnd() > this.particleMul) return;
    this.parts.push({ x, y, z, vx, vy, vz, life, t: 0, color, size, kind, rot: rnd.range(0, 6.28) });
  }
  burst(x, y, z, n, colors, speed, life) {
    for (let i = 0; i < n; i++) {
      const a = rnd.range(0, Math.PI * 2), sp = rnd.range(speed * 0.3, speed);
      this.part(x, y, z, Math.cos(a) * sp, Math.sin(a) * sp * 0.7, rnd.range(40, 200), rnd.range(life * 0.5, life), rnd.pick(colors), rnd.range(1.5, 3.5));
    }
  }
  ring(x, y, r, color, life) { this.rings.push({ x, y, r, color, life, t: 0 }); }
  anim(prefix, x, y, scale, o = {}) { this.anims.push({ prefix, x, y, scale, t: 0, fps: o.fps || 12, frames: o.frames || [1, 2, 3, 4, 5, 6], follow: o.follow, rot: o.rot || 0, z: o.z ?? 0, flip: !!o.flip }); }
  text(x, y, str, color, life = 1, size = 16) { this.texts.push({ x, y, str, color, life, t: 0, size }); }
  bolt(x0, y0, x1, y1) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : rnd.range(-16, 16);
      pts.push({ x: x0 + (x1 - x0) * t - ((y1 - y0) / 200) * j, y: y0 + (y1 - y0) * t + ((x1 - x0) / 200) * j });
    }
    this.bolts.push({ pts, t: 0, life: 0.35 });
  }
  ghost(s, delay) { this.parts.push({ kind: 'ghost', s, x: s.x, y: s.y, face: s.face, t: -delay, life: 0.3, z: 0, vx: 0, vy: 0, vz: 0 }); }
  shake(a) { this.shakeT = Math.min(1, this.shakeT + a * this.shakeMul); }
  flashScreen(color, life) { if (this.flashes) this.flash = { color, t: 0, life }; }

  scratch(s, w) {
    if (!this.marksCtx) return;
    const c = this.marksCtx;
    const p = toScreen(s.x, s.y);
    const a = Math.atan2(s.vy, s.vx);
    const l = w > 1 ? 14 : 9;
    c.strokeStyle = w > 1 ? 'rgba(255,255,255,0.55)' : 'rgba(170,205,230,0.32)';
    c.lineWidth = w > 1 ? 2 : 1;
    c.beginPath();
    const side = (s.stride > 35 ? 1 : -1) * 3;
    const ox = -Math.sin(a) * side, oy = Math.cos(a) * side;
    c.moveTo((p.x + ox) / 2, (p.y + oy) / 2);
    c.quadraticCurveTo((p.x + ox + Math.cos(a) * l * 0.5 + oy) / 2, (p.y + oy + Math.sin(a) * l * 0.5 - ox) / 2, (p.x + ox + Math.cos(a) * l) / 2, (p.y + oy + Math.sin(a) * l) / 2);
    c.stroke();
  }

  // ------------------------------------------------------------------ update
  update(dt, realDt) {
    this.time += realDt;
    this.shakeT = Math.max(0, this.shakeT - realDt * 1.6);
    this.hitstop = Math.max(0, this.hitstop - realDt);
    if (this.slowmo > 0) { this.slowmo -= realDt; if (this.slowmo <= 0) this.slowScale = 1; }
    this.lamp = Math.max(0, this.lamp - realDt);
    this.zoomPunch = Math.max(0, this.zoomPunch - realDt * 1.2);
    this.excite = Math.max(0.15, this.excite - realDt * 0.12);
    if (this.excite < 0.5) this.cheerTeam = null;
    if (this.chant) { this.chant.t += realDt; if (this.chant.t > 8) this.chant = null; }
    if (this.flash) { this.flash.t += realDt; if (this.flash.t > this.flash.life) this.flash = null; }
    if (this.reticle) { this.reticle.t += dt; if (this.reticle.t > this.reticle.life) this.reticle = null; }
    // fade old scratches slowly
    this.marksFade += realDt;
    if (this.marksCtx && this.marksFade > 2) {
      this.marksFade = 0;
      const c = this.marksCtx;
      c.save(); c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.06)';
      c.fillRect(0, 0, this.marks.width, this.marks.height); c.restore();
    }
    for (const p of this.parts) {
      p.t += dt;
      if (p.kind === 'ghost') continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vz -= (p.kind === 'confetti' ? 260 : 520) * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
      const drag = p.kind === 'confetti' ? 1.8 : 2.6;
      p.vx *= Math.exp(-drag * dt); p.vy *= Math.exp(-drag * dt);
      p.rot += dt * 8;
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const a of this.anims) { a.t += dt; if (a.follow) { a.x = a.follow.x; a.y = a.follow.y; } }
    this.anims = this.anims.filter((a) => a.t * a.fps < a.frames.length);
    for (const t of this.texts) t.t += realDt;
    this.texts = this.texts.filter((t) => t.t < t.life);
    for (const b of this.bolts) b.t += realDt;
    this.bolts = this.bolts.filter((b) => b.t < b.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const f of this.snow) {
      f.y += f.v * realDt * (0.6 + f.s * 0.3);
      f.x += Math.sin(this.time * 0.8 + f.w) * 0.004 * realDt * 10;
      if (f.y > 1.05) { f.y = -0.05; f.x = rnd(); }
    }
  }

  shakeOffset() {
    const t = this.shakeT * this.shakeT;
    if (t <= 0) return { x: 0, y: 0 };
    return { x: (rnd() * 2 - 1) * 14 * t, y: (rnd() * 2 - 1) * 10 * t };
  }
}

// Seat positions measured from the backdrop's bleachers.
function makeCrowd() {
  const fans = [];
  const r = makeRng(99);
  const rows = [
    { x0: 285, x1: 675, y: 18, back: false, scale: 0.85 },
    { x0: 865, x1: 1262, y: 18, back: false, scale: 0.85 },
    { x0: 290, x1: 670, y: 62, back: false, scale: 1 },
    { x0: 870, x1: 1258, y: 62, back: false, scale: 1 },
    { x0: 430, x1: 640, y: 880, back: true, scale: 1.05 },
    { x0: 900, x1: 1110, y: 880, back: true, scale: 1.05 },
  ];
  const skins = ['#f1c7a5', '#d9a07a', '#a8714e', '#7a4b31', '#ffd9b8'];
  const hats = ['#71dce8', '#fff2cb', '#14233b', '#e8f6ff', '#ffd45e', null, null];
  for (const row of rows) {
    for (let x = row.x0; x < row.x1; x += r.range(13, 19)) {
      if (r() < 0.12) continue;
      fans.push({
        x, y: row.y + r.range(-2, 2), back: row.back, s: row.scale * r.range(0.9, 1.1),
        team: r() < 0.6 ? 0 : 1, skin: r.pick(skins), hat: r.pick(hats), phase: r.range(0, 6.28),
        sign: r() < 0.06, fan: Math.floor(r() * 8),
      });
    }
  }
  return fans;
}

export { ELEMENT_COLORS };
