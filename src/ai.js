// Team AI. Writes intents into skater.in for every skater the player isn't controlling.
// The same code drives rivals and the player's teammates; difficulty (0..1) controls
// reaction time, decision quality, aim and aggression.

import { clamp, lerp, norm, segDist } from './util.js';
import { GOAL_X, MOUTH, BLUE_X, clampInside, RINK, insideDepth, netBox, ICICLE } from './rink.js';
import { netWaypoint } from './entities.js';

export class TeamAI {
  constructor(match, team, diff) {
    this.m = match;
    this.team = team;
    this.diff = clamp(diff, 0, 1);
    this.side = team === 0 ? 1 : -1;
    this.attX = this.side * GOAL_X;
    this.ownX = -this.side * GOAL_X;
    this.brains = new Map();
  }

  // ---- difficulty hooks used by the match
  faceoffReaction() { return lerp(0.5, 0.13, this.diff) + this.m.rng() * lerp(0.25, 0.1, this.diff); }
  aimMul(s) { return s.controlled ? ({ off: 1.15, strong: 0.75 }[this.m.assist] || 1) : lerp(1.6, 0.85, this.diff); }
  catchMul(s) { return s.controlled ? 1 : lerp(0.72, 1, this.diff); }
  stealMul() {
    const plan = this.gamePlan;
    return lerp(0.5, 0.9, this.diff) * (plan === 'forecheck' ? 1.2 : 1) * (this.m.planEdge && this.m.planEdge(this.team) > 0 ? 1.15 : 1)
      * (this.team === 0 && this.m.buffs ? this.m.buffs.stealMul || 1 : 1);
  }
  get gamePlan() { return (this.m.plans && this.m.plans[this.team]) || 'balanced'; }
  get interval() { return lerp(0.42, 0.12, this.diff); }

  brain(s) {
    let b = this.brains.get(s);
    if (!b) {
      b = { t: this.m.rng() * 0.3, tx: s.x, ty: s.y, sprint: false, shootHold: 0, slapT: 0, passTo: null, wantCheck: false, wantSkill: false, wantUlt: false, role: null };
      this.brains.set(s, b);
    }
    return b;
  }

  update(dt) {
    const m = this.m;
    const human = m.humans.includes(this.team);
    const mine = m.teamSkaters(this.team);
    const p = m.puck;
    const owner = p.owner;
    const ours = owner && owner.team === this.team;
    const theirs = owner && owner.team !== this.team;

    // defensive / support assignments computed once per tick
    const plan = this.plan(mine, owner, ours, theirs, human);

    for (const s of mine) {
      if ((human && s.controlled) || s.scripted || s.parked) continue;
      const b = this.brain(s);
      const inp = s.in;
      inp.shoot = inp.pass = inp.check = inp.skill = inp.ult = inp.sprint = inp.dump = false;
      inp.passTo = null; inp.aimY = 0;

      if (m.state === 'goal' || m.state === 'over') { this.celebrate(s, b); continue; }
      if (m.state !== 'play') { inp.mx = inp.my = 0; continue; }

      b.t -= dt;
      if (b.checkRest > 0) b.checkRest -= dt;
      const decide = b.t <= 0;
      if (decide) b.t = this.interval * (0.7 + m.rng() * 0.6);

      if (owner === s) this.carrier(s, b, decide, dt);
      else {
        // drop any half-finished slapshot if we lost the puck
        b.shootHold = 0;
        const role = plan.get(s) || { kind: 'hold', x: s.x, y: s.y };
        b.role = role.kind;
        if (role.kind === 'pressure') this.pressure(s, b, decide, role);
        else if (role.kind === 'chase') this.chase(s, b, role);
        else if (role.kind === 'receive') this.receive(s, b);
        else this.seek(s, role.x, role.y, role.sprint);
        // arm a one-timer when a pass is on its way
        const chem = p.pass && p.pass.from ? m.chemLevel(p.pass.from, s) : 0;
        if (p.pass && p.pass.to === s && !p.owner && m.inShootingRange(s) && m.rng() < (0.01 + 0.04 * this.diff) * (1 + chem * 0.4)) b.armOT = true;
        if (b.armOT && p.pass && p.pass.to === s && !p.owner) inp.shoot = true;
        else b.armOT = false;
      }
    }
  }

  // ------------------------------------------------------------ planning
  plan(mine, owner, ours, theirs, human) {
    const m = this.m, p = this.m.puck;
    const roles = new Map();
    const free = mine.filter((s) => !(human && s.controlled) && !s.scripted && !s.parked);
    const ctrls = human ? mine.filter((s) => s.controlled) : []; // (the player's skater; two in co-op)
    const opps = m.skaters.filter((o) => o.team !== this.team && !o.parked);

    // pass coming to one of us
    if (!owner && p.pass && p.pass.to && p.pass.to.team === this.team && free.includes(p.pass.to)) {
      roles.set(p.pass.to, { kind: 'receive' });
    }

    // our own pass on its way: the others keep supporting, round the receiver (dropping into
    // loose-puck mode for the flight of every pass had them twitch back and forth)
    const flight = !owner && p.pass && p.pass.from && p.pass.from.team === this.team && p.pass.to && p.pass.to.team === this.team && !p.pass.to.parked ? p.pass.to : null;
    if ((ours && owner.isSkater) || flight) {
      // support the carrier
      const c = owner || flight;
      const spots = this.supportSpots(c);
      let avail = free.filter((s) => s !== c && !roles.has(s));
      // the give-and-go: the teammate who just passed to the player skates hard into open ice
      // ahead, on the far side, for the return pass
      const giver = c.controlled && human && c.recvFrom && avail.includes(c.recvFrom) && m.time - c.recvT < 1.8 ? c.recvFrom : null;
      if (giver) {
        const gx = clamp(c.x + this.side * 170, -GOAL_X + 150, GOAL_X - 150), gy = clamp(c.y > 0 ? c.y - 150 : c.y + 150, -170, 170);
        roles.set(giver, { ...this.openUp({ x: gx, y: gy, kind: 'spot', sprint: true }, c), sprint: true });
        avail = avail.filter((s) => s !== giver);
        spots.sort((a, b) => Math.hypot(a.x - gx, a.y - gy) - Math.hypot(b.x - gx, b.y - gy)).shift(); // (the spot it would have had)
      }
      // a fourth skater (pulled goalie) parks in front of their net
      if (avail.length > 2) spots.push({ x: this.attX - this.side * 70, y: c.y > 0 ? -30 : 30, kind: 'spot', pref: 'C' });
      this.assign(avail, spots, roles, (s, sp) => (sp.pref === s.def.role ? -80 : 0));
      return roles;
    }
    if (ours && owner.isGoalie) {
      const spots = [
        { x: this.ownX + this.side * 260, y: -170, kind: 'spot' },
        { x: this.ownX + this.side * 260, y: 170, kind: 'spot' },
        { x: this.side * -40, y: 0, kind: 'spot' },
      ];
      this.assign(free, spots, roles);
      return roles;
    }
    if (theirs && owner.isGoalie) {
      const spots = [
        { x: -this.side * 40, y: -120, kind: 'spot' },
        { x: -this.side * 40, y: 120, kind: 'spot' },
        { x: this.side * 120, y: 0, kind: 'spot' },
      ];
      this.assign(free, spots, roles);
      return roles;
    }
    if (theirs) {
      const c = owner;
      // pressure: closest free skater (unless the player is already on it)
      const dc = (s) => Math.hypot(s.x - c.x, s.y - c.y);
      const ctrl = ctrls.slice().sort((a, b) => dc(a) - dc(b))[0], humanClose = ctrl && dc(ctrl) < 150;
      const sorted = free.filter((s) => !roles.has(s)).sort((a, b) => dc(a) - dc(b));
      let left = sorted;
      const plan = this.gamePlan;
      // killing a penalty (two against three) in our end: no chasing round the boards. One takes
      // the top of the slot between the puck and the net, the other the low slot on the far
      // side, and the carrier is only pressed once they're inside the dots.
      const pk = m.powerPlay(this.team) < 0 && (c.x - this.ownX) * this.side < GOAL_X - BLUE_X + 40;
      if (pk && Math.hypot(this.ownX - c.x, c.y) > 230) {
        this.assign(sorted, [
          { x: this.ownX + this.side * 175, y: clamp(c.y * 0.4, -70, 70), kind: 'spot', sprint: true },
          { x: this.ownX + this.side * 85, y: c.y > 0 ? -35 : 35, kind: 'spot', sprint: true },
        ], roles);
        return roles;
      }
      if (!humanClose && sorted.length) {
        roles.set(sorted[0], { kind: 'pressure', target: c });
        left = sorted.slice(1);
      }
      // forecheck: send a second hunter while they're still in their own end
      const inTheirEnd = (c.x - this.attX * 0.55) * this.side > 0;
      const vsHuman = this.m.humans.includes(c.team), hd = this.diff * this.diff; // (against the player: more room, the top teams still tough)
      if (plan === 'forecheck' && inTheirEnd && left.length >= 2 && (!vsHuman || hd > 0.36)) {
        roles.set(left[0], { kind: 'pressure', target: c });
        left = left.slice(1);
      }
      // trap: everyone else sets up at our blue line until they cross it
      if (plan === 'trap' && (c.x - this.ownX) * this.side > GOAL_X - BLUE_X + 60) {
        const bx = this.ownX + this.side * (GOAL_X - BLUE_X + 20);
        this.assign(left, [{ x: bx, y: -95, kind: 'spot' }, { x: bx, y: 95, kind: 'spot' }, { x: bx - this.side * 120, y: 0, kind: 'spot' }], roles);
        return roles;
      }
      // someone stays home: when whoever's on the carrier isn't between them and our net, the
      // free skater furthest back takes the slot on the carrier's line to our net (rather than
      // all of them marking, which left the carrier a clear run in)
      const out = -Math.sign(this.ownX) || this.side, gs = (s) => (s.x - c.x) * -out; // (how far goal-side of the carrier)
      const presser = humanClose ? ctrl : sorted[0];
      if (left.length && !(plan === 'forecheck' && inTheirEnd) && (!presser || gs(presser) < 20)) {
        const back = [...left].sort((a, b) => gs(b) - gs(a))[0];
        const hd = Math.max(90, (c.x - this.ownX) * out * 0.45);
        roles.set(back, { kind: 'spot', x: this.ownX + out * hd, y: clamp(c.y * 0.45, -120, 120), sprint: true });
        left = left.filter((s) => s !== back);
      }
      // (the player's teammates get room to take a pass: marked from further off on the easier levels)
      const markD = Math.max(plan === 'trap' ? 72 : plan === 'forecheck' ? 32 : plan === 'rungun' ? 40 : 48, vsHuman ? lerp(115, 55, hd) : 0);
      // mark the other attackers, goal side
      const marks = opps.filter((o) => o !== c).map((o) => {
        const g = norm(this.ownX - o.x, -o.y);
        const toC = norm(c.x - o.x, c.y - o.y);
        return { x: o.x + g.x * markD + toC.x * 22, y: o.y + g.y * markD + toC.y * 22, kind: 'mark', who: o, sprint: true };
      });
      // keep someone home if the carrier is deep in our zone
      if (left.length > marks.length) marks.push({ x: this.ownX + this.side * 110, y: 0, kind: 'spot' });
      this.assign(left, marks, roles);
      return roles;
    }

    // loose puck: fastest intercept chases, others support
    const chasers = free.filter((s) => !roles.has(s));
    if (!chasers.length) return roles;
    const times = chasers.map((s) => ({ s, ...this.intercept(s) }));
    times.sort((a, b) => a.t - b.t);
    // if the player is clearly closer, let them go; we still send our closest at a lower intensity
    const ctrlT = ctrls.length ? Math.min(...ctrls.map((k) => this.intercept(k).t)) : 1e9;
    // (the one already chasing keeps at it unless someone else is clearly quicker: two near
    // equal chasers swapping every tick just twitch)
    const kept = this.chaser && times.find((x) => x.s === this.chaser);
    const first = kept && kept.t < times[0].t + 0.15 ? kept : times[0];
    this.chaser = null;
    if (!(ctrls.length && ctrlT + 0.25 < first.t)) {
      // the player's pass: rather than charging the teammate as they take it, a gap goal-side of
      // them (closer on the stronger teams); cutting it off out in the lane is still fair game
      const to = p.pass && p.pass.to && p.pass.from.team !== this.team && m.humans.includes(p.pass.from.team) ? p.pass.to : null;
      if (to && Math.hypot(first.x - to.x, first.y - to.y) < 70) {
        const hd = this.diff * this.diff, g = norm(this.ownX - to.x, -to.y), gap = lerp(95, 30, hd);
        roles.set(first.s, { kind: 'spot', x: to.x + g.x * gap, y: to.y + g.y * gap, sprint: hd > 0.3 });
      } else roles.set(first.s, { kind: 'chase', x: first.x, y: first.y });
      times.splice(times.indexOf(first), 1);
      this.chaser = first.s;
    }
    // their pass on its way: the rest keep marking, goal side, as if it had arrived
    if (p.pass && p.pass.from && p.pass.from.team !== this.team) {
      // (the player's side: marked from as far off as when they have the puck, see above)
      const md = this.m.humans.includes(p.pass.from.team) ? Math.max(48, lerp(115, 55, this.diff * this.diff)) : 48;
      const marks = opps.filter((o) => o !== p.pass.from).map((o) => { const g = norm(this.ownX - o.x, -o.y); return { x: o.x + g.x * md, y: o.y + g.y * md, kind: 'mark', who: o, sprint: true }; });
      this.assign(times.map((t) => t.s), marks, roles);
      return roles;
    }
    // opponents also racing? send a second if we're losing the race and it's in our zone
    const inOurHalf = p.x * this.side < 0;
    const spots = inOurHalf
      ? [{ x: this.ownX + this.side * 140, y: clamp(p.y * 0.4, -80, 80), kind: 'spot' }, { x: p.x + this.side * 220, y: p.y > 0 ? -150 : 150, kind: 'spot' }]
      : [{ x: p.x - this.side * 120, y: clamp(-p.y * 0.5, -150, 150), kind: 'spot' }, { x: this.side * (BLUE_X - 40), y: p.y > 0 ? -90 : 90, kind: 'spot' }];
    this.assign(times.map((t) => t.s), spots, roles);
    return roles;
  }

  // greedy assignment of skaters to spots by distance (+ optional bias)
  assign(skaters, spots, roles, bias) {
    const left = [...skaters];
    const sp = spots.map((s) => ({ ...s, x: clampInside(s.x, s.y, 30).x, y: clampInside(s.x, s.y, 30).y }));
    while (left.length && sp.length) {
      let best = null, bd = 1e9;
      for (const s of left) for (const o of sp) {
        const d = Math.hypot(s.x - o.x, s.y - o.y) + (bias ? bias(s, o) : 0);
        if (d < bd) { bd = d; best = [s, o]; }
      }
      const [s, o] = best;
      roles.set(s, o);
      left.splice(left.indexOf(s), 1);
      sp.splice(sp.indexOf(o), 1);
    }
    for (const s of left) roles.set(s, { kind: 'spot', x: this.ownX + this.side * 200, y: 0 });
  }

  supportSpots(c) {
    let spots = this.baseSupportSpots(c);
    const plan = this.gamePlan, side = this.side;
    if (plan === 'rungun') for (const sp of spots) sp.x += side * (sp.pref === 'W' ? 90 : 60);
    if (plan === 'trap') {
      // sit the defender back, but send the winger long for the counterattack
      const breakout = c.x * side < -BLUE_X;
      for (const sp of spots) { if (sp.pref === 'D') sp.x -= side * 70; else if (breakout) { sp.x += side * 90; sp.sprint = true; } }
    }
    // the player has the puck: the teammates find open ice near their spots, with a clear lane
    // for the pass (they used to stand on their spot whoever was marking it)
    if (c.controlled && this.m.humans.includes(this.team)) spots = spots.map((sp) => this.openUp(sp, c));
    return spots;
  }

  // The most open ice near a support spot: away from the defenders, the lane from the carrier
  // clear, not too far off the spot, on the ice and out of the creases.
  openUp(sp, c) {
    const m = this.m, opps = m.skaters.filter((o) => o.team !== this.team && !o.parked);
    if (!opps.length) return sp;
    const score = (x, y) => {
      let near = 260;
      for (const o of opps) near = Math.min(near, Math.hypot(o.x - x, o.y - y));
      return near + m.laneClear(c.x, c.y, x, y, this.team, true) * 140 - Math.hypot(x - sp.x, y - sp.y) * 0.3;
    };
    let best = sp, bs = score(sp.x, sp.y);
    for (const r of [70, 140]) for (let a = 0; a < 8; a++) {
      const x = sp.x + Math.cos((a * Math.PI) / 4) * r, y = sp.y + Math.sin((a * Math.PI) / 4) * r * 0.8;
      if (insideDepth(x, y) < 50 || Math.hypot(Math.abs(x) - GOAL_X, y) < 90) continue;
      const v = score(x, y);
      if (v > bs + 8) { bs = v; best = { ...sp, x, y }; } // (a clear gain, so it doesn't twitch between two)
    }
    return best;
  }

  baseSupportSpots(c) {
    const side = this.side;
    const cx = c.x * side; // progress toward attack goal
    const ySign = c.y >= 0 ? 1 : -1;
    if (cx < -BLUE_X) {
      // breakout from our zone
      return [
        { x: c.x + side * 300, y: -ySign * 150, kind: 'spot', pref: 'W', sprint: true },
        { x: c.x + side * 120, y: -ySign * 60, kind: 'spot', pref: 'D' },
      ];
    }
    if (cx < BLUE_X - 20) {
      // neutral zone rush
      return [
        { x: side * (BLUE_X + 170), y: -ySign * 120, kind: 'spot', pref: 'W', sprint: true },
        { x: c.x - side * 90, y: -ySign * 40, kind: 'spot', pref: 'D' },
      ];
    }
    // a power play in their zone: the umbrella, the point and both flanks at the dots, so a pass
    // across finds someone for a one-timer (with the puck at the point, the flanks; on a flank,
    // the point and the far flank)
    if (this.m.powerPlay(this.team) > 0 && !(c.controlled && this.m.humans.includes(this.team))) {
      const fy = c.y >= 0 ? 1 : -1;
      const far = { x: this.attX - side * 190, y: -fy * 130, kind: 'spot', pref: 'W' };
      if (Math.hypot(this.attX - c.x, c.y) > 300) return [far, { x: this.attX - side * 200, y: fy * 140, kind: 'spot', pref: 'C' }];
      return [far, { x: side * (BLUE_X + 90), y: clamp(c.y * 0.2, -40, 40), kind: 'spot', pref: 'D' }];
    }
    // offensive zone, the player with the puck out at the point: the winger goes to the front of
    // the net, for a tip or the rebound (the AI's own point men pass instead)
    if (c.controlled && this.m.humans.includes(this.team) && Math.hypot(this.attX - c.x, c.y) > 330) {
      return [
        { x: this.attX - side * 78, y: clamp(c.y * 0.15, -30, 30), kind: 'spot', pref: 'W' },
        { x: side * (BLUE_X + 70), y: -ySign * 60 + c.y * 0.2, kind: 'spot', pref: 'D' },
      ];
    }
    // offensive zone: one-timer spot on the far side + point man
    return [
      { x: this.attX - side * 165, y: -ySign * 85, kind: 'spot', pref: 'W' },
      { x: side * (BLUE_X + 70), y: -ySign * 60 + c.y * 0.2, kind: 'spot', pref: 'D' },
    ];
  }

  intercept(s) {
    const p = this.m.puck;
    const k = 0.42;
    const sp = s.d.maxSpeed * 1.1;
    for (let t = 0.05; t <= 2; t += 0.1) {
      const f = (1 - Math.exp(-k * t)) / k;
      const px = p.x + p.vx * f, py = p.y + p.vy * f;
      const c = clampInside(px, py, 12);
      if (Math.hypot(c.x - s.x, c.y - s.y) / sp <= t) return { t, x: c.x, y: c.y };
    }
    const f = (1 - Math.exp(-k * 2)) / k;
    const c = clampInside(p.x + p.vx * f, p.y + p.vy * f, 12);
    return { t: 2 + Math.hypot(c.x - s.x, c.y - s.y) / sp, x: c.x, y: c.y };
  }

  // The nearest Monolith wall the straight line from (ax, ay) to (bx, by) crosses: its ends on
  // opposite faces, crossing within the wall's length and `rad` to spare (a target on our own
  // side, even right against the face, isn't across it). The barrier and our side, or null.
  wallAcross(ax, ay, bx, by, rad) {
    let best = null, bt = 2;
    for (const w of this.m.barriers) {
      if (!w.alive || w.breaking > 0) continue;
      const ux = Math.cos(w.ang), uy = Math.sin(w.ang), R = w.thick / 2 + rad;
      const da = (ax - w.x) * -uy + (ay - w.y) * ux, db = (bx - w.x) * -uy + (by - w.y) * ux; // across the wall
      if (da === db || Math.sign(da) === Math.sign(db)) continue;
      const t = da / (da - db);
      const along = (ax + (bx - ax) * t - w.x) * ux + (ay + (by - ay) * t - w.y) * uy;
      if (Math.abs(along) < w.len / 2 + R && t < bt) { bt = t; best = { w, side: Math.sign(da) || 1, ux, uy, R }; }
    }
    return best;
  }

  // ------------------------------------------------------------- actions
  seek(s, tx, ty, sprint, slowR = 60) {
    let c = clampInside(tx, ty, 22);
    // a stone wall in the way: round its nearer end rather than skating into it
    const wall = this.wallAcross(s.x, s.y, c.x, c.y, s.r + 4);
    if (wall) {
      const { w, side, ux, uy, R } = wall, reach = w.len / 2 + R + 14, m = this.m;
      // a way round that's open: on the ice, out of the nets and clear of any other wall
      const inNet = (q) => [-1, 1].some((sd) => { const b = netBox(sd); return q.x > b.x0 - s.r && q.x < b.x1 + s.r && q.y > b.y0 - s.r - 4 && q.y < b.y1 + s.r + 4; });
      const open = (q) => insideDepth(q.x, q.y) > s.r + 6 && !inNet(q) && !m.barriers.some((o) => o !== w && o.alive && o.breaking <= 0 && segDist(q.x, q.y, ...o.ends()).d < o.thick / 2 + s.r + 4);
      const ends = [1, -1].map((e) => ({ e, x: w.x + ux * reach * e - uy * side * R * 0.6, y: w.y + uy * reach * e + ux * side * R * 0.6 })).filter(open);
      if (ends.length) {
        const cost = (q) => Math.hypot(q.x - s.x, q.y - s.y) + Math.hypot(c.x - q.x, c.y - q.y);
        // keep the way round we picked for a moment, so it doesn't flip from frame to frame
        const held = s.detour && s.detour.w === w && m.time - s.detour.t < 0.6 && ends.find((q) => q.e === s.detour.e);
        const best = held || ends.sort((a, b) => cost(a) - cost(b))[0];
        if (!held) s.detour = { w, e: best.e, t: m.time };
        c = { x: best.x, y: best.y };
        slowR = Math.min(slowR, 20); // (keep the speed up going round)
      }
    }
    // and round the nets, never into them (a puck behind one is reached by going round it)
    for (const side of [-1, 1]) {
      const w = netWaypoint(side, s.x, s.y, c.x, c.y, s.r + 6);
      if (w.x !== c.x || w.y !== c.y) { c = w; slowR = Math.min(slowR, 20); }
    }
    let dx = c.x - s.x, dy = c.y - s.y;
    const d = Math.hypot(dx, dy);
    // separation from teammates
    for (const o of this.m.skaters) {
      if (o === s || o.team !== s.team) continue;
      const ox = s.x - o.x, oy = s.y - o.y, od = Math.hypot(ox, oy);
      if (od < 70 && od > 0.1) { dx += (ox / od) * (70 - od) * 1.2; dy += (oy / od) * (70 - od) * 1.2; }
    }
    // arena rules: skirt slush pools and cracks unless the target is inside one, and keep
    // the puck off the rumble strips
    const tw = this.m.twists;
    if (tw.strips.length && this.m.puck.owner === s) {
      for (const st of tw.strips) {
        const off = s.y - st.y;
        if (Math.abs(off) < st.h / 2 + 22 && s.x > st.x0 - 40 && s.x < st.x1 + 40) dy += Math.sign(st.y) * -1 * (st.h / 2 + 22 - Math.abs(off)) * (0.6 + this.diff * 0.8);
      }
    }
    if (tw.pools.length || tw.cracks.length) {
      for (const z of tw.pools.length ? tw.pools : tw.cracks) {
        const zr = z.rx || z.r;
        if (Math.hypot(c.x - z.x, c.y - z.y) < zr) continue;
        const ox = s.x - z.x, oy = s.y - z.y, od = Math.hypot(ox, oy);
        if (od < zr + 35 && od > 0.1) { const k = (zr + 35 - od) * (0.5 + this.diff * 0.7); dx += (ox / od) * k; dy += (oy / od) * k; }
      }
    }
    // the Glacier Cave: step round the ice chunks, and out from under a falling icicle's shadow
    if (tw.ice) {
      for (const k of tw.ice.chunks) {
        const ox = s.x - k.x, oy = s.y - k.y, od = Math.hypot(ox, oy), zr = k.r + s.r + 18;
        if (od < zr && od > 0.1) { const f = (zr - od) * 1.2; dx += (ox / od) * f; dy += (oy / od) * f; }
      }
      for (const f of tw.ice.falls) {
        const ox = s.x - f.x, oy = s.y - f.y, od = Math.hypot(ox, oy), zr = ICICLE.r + s.r + 16;
        if (od < zr && f.t > 0.5 - this.diff * 0.3) { const g = (zr - od) * (1 + this.diff * 2), l = od > 0.1 ? od : 1; dx += (od > 0.1 ? ox / l : s.side) * g; dy += (od > 0.1 ? oy / l : 0) * g; }
      }
    }
    const n = norm(dx, dy);
    const mag = clamp(d / slowR, 0, 1);
    s.in.mx = n.x * mag; s.in.my = n.y * mag;
    s.in.sprint = !!sprint && d > 160 && s.stamina > s.d.staminaMax * 0.35;
  }

  chase(s, b, role) {
    const p = this.m.puck;
    // aim the stick at the puck: approach to a point slightly behind it relative to our facing
    const tx = role.x, ty = role.y;
    this.seek(s, tx, ty, true, 10);
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d > 140) s.in.sprint = s.stamina > s.d.staminaMax * 0.25;
  }

  receive(s, b) {
    const p = this.m.puck;
    // step onto the puck's line
    const ahead = { x: p.x + p.vx * 0.6, y: p.y + p.vy * 0.6 };
    const sd = segDist(s.x, s.y, p.x, p.y, ahead.x, ahead.y);
    this.seek(s, sd.cx, sd.cy, false, 30);
    s.in.mx *= 0.7; s.in.my *= 0.7;
  }

  pressure(s, b, decide, role) {
    const m = this.m, c = role.target;
    const plan = this.gamePlan;
    const g = norm(this.ownX - c.x, -c.y);
    // contain the carrier from a gap goal-side, closing in only near our net or on the
    // forecheck: the stick still pokes at the puck, but nobody runs straight through them
    // (the player's carrier gets room to skate on the easier levels: a wider gap, and only the
    // stronger teams' forecheck hounds them all over the ice)
    const human = c.controlled && m.humans.includes(c.team), hd = this.diff * this.diff; // (against the player: gentle for longer, the top teams still tough)
    const hunts = plan === 'forecheck' && (!human || hd > 0.36);
    const tight = Math.abs(c.x - this.ownX) < 260 || hunts;
    const gap = human ? (tight ? lerp(85, 20, hd) : lerp(110, 32, hd)) : tight ? lerp(24, 14, this.diff) : lerp(48, 28, this.diff);
    const tx = c.x + c.vx * 0.22 + g.x * gap, ty = c.y + c.vy * 0.22 + g.y * gap;
    this.seek(s, tx, ty, !human || tight || hd > 0.3, 8); // (no sprinting up to the player out in the open on the easier levels)
    const d = Math.hypot(c.x - s.x, c.y - s.y);
    if (decide) {
      // checks are picked moments, with a breather after each one: a chance per second in
      // reach (sharper AIs decide more often, so it's spread over their decisions)
      // (on the player's carrier, far fewer on the easier levels, with a longer breather)
      const aggression = (human ? lerp(0.035, 0.24, hd) : lerp(0.1, 0.28, this.diff)) * this.interval * (hunts ? 1.3 : plan === 'trap' ? 0.6 : 1);
      if (d < 62 && s.checkCd <= 0 && !(b.checkRest > 0) && s.stamina > 35 && m.rng() < aggression) {
        b.checkRest = human ? lerp(5.5, 2, hd) : lerp(3, 1.8, this.diff);
        if (s.def.skill.id === 'bedrock' && s.skillCd <= 0 && m.rng() < this.diff) s.in.skill = true;
        s.in.check = true;
        const n = norm(c.x + c.vx * 0.1 - s.x, c.y + c.vy * 0.1 - s.y);
        s.in.mx = n.x; s.in.my = n.y;
      }
      // Cyclone on a carrier close by: blow them off the puck
      if (s.def.ult.id === 'cyclone' && s.ult >= 100 && d < 110 && m.rng() < 0.4 * this.diff + 0.25) s.in.ult = true;
      // Stone wall in the shooting lane when they're near our net
      // (not on a carrier along the boards: the wall would pin them there and the play would stop)
      if (s.def.ult.id === 'monolith' && s.ult >= 100 && Math.abs(c.x - this.ownX) < 330 && insideDepth(c.x, c.y) > 70 && m.rng() < 0.5 * this.diff + 0.2) {
        const n = norm(c.x - s.x, c.y - s.y);
        s.face = Math.atan2(n.y, n.x);
        s.in.ult = true;
      }
    }
  }

  celebrate(s, b) {
    const m = this.m;
    const lg = m.lastGoal;
    if (lg && lg.team === s.team && lg.scorer && lg.scorer !== s) {
      this.seek(s, lg.scorer.x - s.side * 20, lg.scorer.y + (s.slot - 1) * 26, false, 40);
    } else {
      s.in.mx *= 0.9; s.in.my *= 0.9;
      s.in.sprint = false;
    }
  }

  // ------------------------------------------------------------ carrier
  carrier(s, b, decide, dt) {
    const m = this.m;
    const inp = s.in;
    // finishing a slapshot wind-up
    if (b.shootHold > 0) {
      b.shootHold -= dt;
      inp.shoot = b.shootHold > 0;
      this.seek(s, this.attX - this.side * 200, s.y * 0.8, false);
      return;
    }
    const side = this.side;
    const dx = (this.attX - s.x) * side; // distance to goal line along attack
    const dG = Math.hypot(this.attX - s.x, s.y);
    // chemistry combo window right after a partner's pass: shoot quickly
    if (s.comboT > 0 && !b.comboRolled) {
      b.comboRolled = true;
      const good = dx > 30 && dx < 470 && Math.abs(s.y) < dx * 1.5 + 60;
      if (good && m.rng() < 0.3 + this.diff * 0.4) { inp.shoot = true; b.shootHold = 0.02; return; }
    }
    if (s.comboT <= 0) b.comboRolled = false;
    const opps = m.opponents(s);
    let near = 1e9, nearFront = 1e9, nearOpp = null;
    for (const o of opps) {
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d < near) { near = d; nearOpp = o; }
      if ((o.x - s.x) * side > -10 && d < nearFront) nearFront = d;
    }

    if (decide) {
      const g = m.goalieAt(side);
      // empty net: shoot from anywhere with a lane
      if (g.disabled && dx > 20 && dx < 820 && this.shotLane(s, 0) > 0.4) { inp.aimY = 0; inp.shoot = true; b.shootHold = 0.02; return; }
      const inZone = dx > 30 && dx < 420 && Math.abs(s.y) < dx * 1.4 + 60;
      // ultimate shots
      if (s.ult >= 100 && s.def.ult.needsPuck && inZone && dG < 380 && m.rng() < 0.4 + this.diff * 0.5) {
        inp.ult = true; return this.drive(s, near, nearOpp);
      }
      // shoot?
      if (inZone) {
        const aimY = (g.y > 0 ? -1 : 1) * MOUTH * 0.7;
        const lane = this.shotLane(s, aimY);
        const angle = Math.abs(s.y) / Math.max(dx, 1);
        // (an open lane counts for less the further out: from the point it's mostly a save)
        let score = (1 - dG / 430) * 1.2 + lane * 0.6 * clamp(1.4 - dG / 400, 0.3, 1) - angle * 0.35 + (Math.abs(g.y - aimY) > 25 ? 0.25 : 0);
        if (m.puck.power && m.puck.power !== 'lightning') score += 0.3;
        if (s.empowered > 0 || s.igniteT > 0) score += 0.3;
        if (m.twists.beam && m.inBeam(s.x, s.y)) score += 0.12 + 0.18 * this.diff; // (the Observatory: shoot out of the moonlight)
        if (s.def.arch === 'sniper') score += 0.12; // a sniper lets it go sooner
        const thresh = lerp(0.55, 0.75, this.diff) - (near < 60 ? 0.25 : 0) - (this.gamePlan === 'rungun' ? 0.14 : this.gamePlan === 'trap' ? -0.05 : 0);
        if (score > thresh) {
          inp.aimY = aimY / (MOUTH * 0.74);
          if (near > 110 && dG > 200 && m.rng() < 0.6) {
            b.shootHold = lerp(0.35, 0.75, m.rng());
            inp.shoot = true;
          } else {
            // wrist shot: press and release next tick
            inp.shoot = true; b.shootHold = 0.02;
          }
          return;
        }
      }
      // pass?
      const own = this.posValue(s, s);
      let best = null, bestV = -1e9;
      for (const t of m.teamSkaters(this.team)) {
        if (t === s || t.parked) continue; // (not to a teammate in the box)
        const lane = m.laneClear(s.x, s.y, t.x, t.y, this.team);
        const player = t.controlled && m.humans.includes(this.team); // (the player's teammates like to give it to them: more fun with the puck)
        if (lane < (player ? 0.25 : 0.35)) continue;
        let v = this.posValue(t, s) * (0.6 + lane * 0.4) + (player ? 0.18 : 0);
        const chem = m.chemLevel(s, t);
        if (chem) { const tdx = (this.attX - t.x) * this.side; if (tdx > 30 && tdx < 420) v += 0.12 * chem; }
        if (v > bestV) { bestV = v; best = t; }
      }
      const pressured = nearFront < 70 || near < 48;
      const margin = lerp(0.05, 0.3, this.diff);
      if (best && (bestV > own + margin || (pressured && bestV > own - 0.4)) && m.rng() < lerp(0.5, 0.95, this.diff)) {
        inp.pass = true; inp.passTo = best;
        return;
      }
      // dump it in: at their blue line, pressured, nothing on: rim it behind the net and chase
      if (dx > 340 && dx < 500 && nearFront < 85 && !m.extra[this.team] && m.rng() < lerp(0.35, 0.6, this.diff)) {
        inp.pass = true; inp.dump = true;
        return;
      }
      // a deke: past a defender closing in, or to sell the goalie on a breakaway
      if (s.dekeCd <= 0 && s.stamina > 25 && ((nearFront < 70 && m.rng() < 0.1 + this.diff * 0.2) || (nearFront > 140 && dG < 210 && m.rng() < 0.25))) inp.deke = true;
      // abilities while carrying
      if (s.skillCd <= 0) {
        const id = s.def.skill.id;
        if (id === 'dash' && nearFront < 90 && m.rng() < 0.3 + this.diff * 0.5) inp.skill = true;
        if (id === 'glide' && dx > 300 && m.rng() < 0.2 + this.diff * 0.4) inp.skill = true;
        if (id === 'bedrock' && near < 70 && m.rng() < 0.2 + this.diff * 0.3) inp.skill = true;
        if (id === 'heat' && dx > 120 && dx < 520 && m.rng() < 0.25 + this.diff * 0.4) inp.skill = true; // light it up on the way in
        if (id === 'tailwind' && dx > 420 && near > 90 && m.rng() < 0.2 + this.diff * 0.4) inp.skill = true; // a rush from deep
        if (id === 'fade' && nearFront < 80 && m.rng() < 0.3 + this.diff * 0.4) inp.skill = true; // slip the check
      }
      // a whirlwind to clear the way to the net
      if (s.def.ult.id === 'cyclone' && s.ult >= 100 && near < 90 && dx < 520 && m.rng() < 0.35) inp.ult = true;
      // a wall between the carrier and the defender closing in (not across the carrier's own way)
      if (s.def.ult.id === 'monolith' && s.ult >= 100 && nearOpp && !nearOpp.parked && near >= 85 && near < 130 && m.rng() < 0.3) { // (closer, and it would rise behind them)
        s.face = Math.atan2(nearOpp.y - s.y, nearOpp.x - s.x);
        inp.ult = true;
      }
      b.driveY = this.pickLane(s, nearOpp);
    }
    this.drive(s, near, nearOpp, b);
  }

  // how good a spot this teammate is in to have the puck (0..~2)
  posValue(t, from) {
    const m = this.m;
    const dx = (this.attX - t.x) * this.side;
    const dG = Math.hypot(this.attX - t.x, t.y);
    let v = 1 - clamp(dG / 900, 0, 1);
    if (dx > 40 && dx < 300 && Math.abs(t.y) < 140) v += 0.45; // slot
    const open = clamp(m.nearestOpp(t) / 120, 0, 1.3);
    v += open * 0.5;
    if (dx < 0) v -= 0.6; // behind the net
    // one-timer bonus: far side from goalie
    const g = m.goalieAt(this.side);
    if (dx > 40 && dx < 320 && Math.sign(t.y) !== Math.sign(g.y || 1) && Math.abs(t.y) > 40) v += 0.25;
    return v;
  }

  shotLane(s, aimY) {
    const m = this.m;
    if (this.wallAcross(s.x, s.y, this.attX, aimY, 6)) return 0; // (a Monolith in the way stops the shot dead)
    let worst = 1;
    for (const o of m.opponents(s)) {
      const sd = segDist(o.x, o.y, s.x, s.y, this.attX, aimY);
      if (sd.t < 0.05) continue;
      worst = Math.min(worst, clamp((sd.d - 12) / 30, 0, 1));
    }
    return worst;
  }

  pickLane(s, nearOpp) {
    // steer away from the closest defender, prefer the middle as we get close
    const dx = (this.attX - s.x) * this.side;
    let y = s.y * 0.7;
    if (nearOpp && Math.abs(nearOpp.y - s.y) < 90 && (nearOpp.x - s.x) * this.side > -20) {
      y = nearOpp.y > s.y ? nearOpp.y - 130 : nearOpp.y + 130;
    }
    // the Observatory: lean the attack toward the moonbeam when it lies between us and the net
    const B = this.m.twists.beam;
    if (B) { const bdx = (this.attX - B.x) * this.side; if (bdx > 60 && bdx < 420 && dx > bdx) y = y * 0.6 + B.y * 0.4; }
    if (dx < 380) y = clamp(y, -110, 110);
    return clamp(y, RINK.minY + 70, RINK.maxY - 70);
  }

  drive(s, near, nearOpp, b) {
    const dx = (this.attX - s.x) * this.side;
    let tx, ty = b && b.driveY !== undefined ? b.driveY : s.y * 0.7;
    if (dx < 0) { tx = this.attX - this.side * 140; ty = s.y > 0 ? 120 : -120; } // behind the net: come out front
    else if (dx < 200) { tx = this.attX - this.side * 120; ty = clamp(ty, -70, 70); }
    else tx = this.attX - this.side * 150;
    this.seek(s, tx, ty, near > 90, 20);
    // sidestep defenders right in front
    if (nearOpp && near < 80) {
      const away = norm(s.x - nearOpp.x, s.y - nearOpp.y);
      s.in.mx = s.in.mx * 0.7 + away.x * 0.5;
      s.in.my = s.in.my * 0.7 + away.y * 0.5;
    }
  }
}
