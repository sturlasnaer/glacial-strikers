// Match simulation: rules, puck physics, possession, shots, saves, goals, power pucks.
// Runs headless (see tools/sim.mjs) or driven by the game loop in main.js.

import { clamp, norm, dist, segDist, makeRng, Emitter, angDiff } from './util.js';
import {
  RINK, GOAL_X, MOUTH, NET_DEPTH, POST_R, CROSSBAR, DOTS,
  constrainToRink, netBox, makeTwists, auroraRows, clampInside, insideDepth, collideNets,
} from './rink.js';
import { Puck, Skater, Goalie, Barrier, collideBarrier, PUCK_R } from './entities.js';
import { Abilities } from './abilities.js';
import { TeamAI } from './ai.js';
import { pairKey, GAME_PLANS, COMBOS, CAST_PAIRS } from './data.js';

const CRACK_MAX = 72; // pond cracks stop spreading at this radius

export const WIN_SCORE = 5;
export const PENALTY_SECONDS = 15;
// the goalie's reach as a disc around them (see goalieSave), scaled to keep scoring where it was
export let GOALIE_DISC = 0.7;
const STALL_SECONDS = 6; // a dead puck this long is whistled (see updateStall)
export const setGoalieDisc = (v) => { GOALIE_DISC = v; }; // (for balance runs)

// ultimate shots, and the perks that fill the meter faster
const ULT_SHOTS = new Set(['zero', 'thunderclap', 'firestorm', 'eclipse']);
const METER_PERKS = ['Captain', 'Storm Rider', 'Bulwark', 'Fuel', 'Squall', 'Dusk'];
// the cast's three combos have their own effects; the newer pairs mix their elements' parts
const BESPOKE_COMBOS = new Set(CAST_PAIRS);
const lv3 = (level) => (level - 1) * 0.03;

export let STEAL_BASE = 0.47; // a defender's stick on the puck: steals a second at the base rate
export const setStealBase = (v) => { STEAL_BASE = v; }; // (for balance runs)

export class Match {
  // cfg: { teams: [teamCfg, teamCfg], humanTeam: 0|null, seed, powers: [], twist, diff: [d0, d1] }
  // teamCfg: { skaters: [{ def, stats, name, perks }], goalie: { stats, name } }
  constructor(cfg) {
    this.cfg = cfg;
    this.rng = makeRng(cfg.seed ?? (Math.random() * 1e9) >>> 0);
    this.events = new Emitter();
    this.time = 0;
    this.state = 'intro';
    this.stateT = 0;
    this.score = [0, 0];
    this.puck = new Puck();
    this.skaters = [];
    this.goalies = [];
    this.barriers = [];
    this.cyclones = []; // Gale's whirlwinds
    this.trails = [];
    this.pickups = [];
    this.assist = cfg.assist || 'normal'; // aim assist for human players
    this.mods = new Set(cfg.mods || []); // challenge modifiers, see CHALLENGES in data.js
    this.plans = cfg.plans || ['balanced', 'balanced']; // game plans, see GAME_PLANS in data.js
    this.buffs = cfg.buffs || {}; // locker-room buffs for the home team
    this.winScore = this.mods.has('sudden') ? 1 : WIN_SCORE;
    this.powers = this.mods.has('iceage') ? ['ice'] : cfg.powers || [];
    this.twists = makeTwists(cfg.twist || 'none', this.rng);
    if (this.twists.kind === 'pond_cracks') {
      // the pond cracks under big hits, hard shots and shockwaves
      this.on('hit', (e) => { if (e.power > 240) this.crackAt(e.b.x, e.b.y, Math.min(1.4, e.power / 400)); });
      this.on('shot', (e) => {
        if (['slap', 'onetimer', 'zero', 'thunderclap'].includes(e.kind)) this.crackAt(e.s.x + Math.cos(e.s.face) * 16, e.s.y + Math.sin(e.s.face) * 10, e.kind === 'slap' ? 0.7 : 1);
      });
      this.on('quake', (e) => this.crackAt(e.s.x, e.s.y, 1.5));
    }
    this.pickupT = 9;
    this.humanTeam = cfg.humanTeam ?? null; // player 1's team
    // every team with a human player (two in local versus)
    this.humans = cfg.humans ?? (this.humanTeam !== null ? [this.humanTeam] : []);
    // goalie mode: the player is in goal for team 0 and the AI skates all three skaters
    this.goalieMode = !!cfg.goalieMode && this.humanTeam === 0;
    if (this.goalieMode) this.humans = [];
    this.humanInputs = {};
    this.abilities = new Abilities(this);
    this.winner = null;
    this.lastGoal = null;
    this.goalLog = [];
    this.shotsOnGoal = [0, 0];
    this.possessionT = [0, 0];
    cfg.teams.forEach((t, team) => {
      t.skaters.forEach((sk, slot) => {
        this.skaters.push(new Skater(this, team, sk.def, sk.stats, slot, sk));
      });
      this.goalies.push(new Goalie(this, team, t.goalie.stats, t.goalie));
    });
    if (this.goalieMode) this.goalies[0].human = true;
    this.ai = [0, 1].map((team) => new TeamAI(this, team, (cfg.diff || [0.5, 0.5])[team]));
    for (const s of this.skaters) if (this.plans[s.team] === 'forecheck') s.d.regen *= 0.88;
    for (const s of this.teamSkaters(0)) {
      if (this.buffs.ultStart) s.ult = this.buffs.ultStart;
      if (this.buffs.staminaMul) { s.d.staminaMax *= this.buffs.staminaMul; s.stamina = s.d.staminaMax; }
    }
    this.faceoffWinnerHint = null;
    this.drill = cfg.drill || null;
    this.hype = { team: 0, t: 0 }; // crowd chant: that team's ultimates charge faster
    this.chem = cfg.teams.map((t) => t.chem || {}); // pairKey -> chemistry level 0..3
    this.chemStats = [{}, {}]; // pairKey -> { passes, assists, comboGoals }
    this.chain = [0, 0]; // consecutive completed passes per team
    this.penaltiesOn = cfg.penalties !== false && !cfg.drill;
    this.ultRate = cfg.ultRate || 1; // (the All-Star Game charges ultimates faster)
    this.pendingPenalty = null;
    this.penStats = [{ pims: 0, ppGoals: 0, kills: 0 }, { pims: 0, ppGoals: 0, kills: 0 }];
    this.extra = [null, null]; // extra attacker when a goalie is pulled
    this.prevPull = {};
    this.extraCfg = cfg.teams.map((t) => t.extra || (t.skaters[0] ? { ...t.skaters[0], name: 'Extra attacker' } : null));
    this.holdGoal = false; // set while a replay is showing
    this.setupFaceoff();
    this.state = 'intro';
    this.stateT = 0;
    if (this.drill) this.drill.init(this);
  }

  emit(type, data) { this.events.emit(type, data); }
  on(type, fn) { return this.events.on(type, fn); }

  teamSkaters(team) { return this.skaters.filter((s) => s.team === team); }
  opponents(s) { return this.skaters.filter((o) => o.team !== s.team); }
  // the goalie defending the net on `side`
  goalieAt(side) { return this.goalies.find((g) => g.goalSide === side); }
  controlled(team = this.humanTeam) { return this.skaters.find((s) => s.controlled && s.team === team); }

  // ------------------------------------------------------------------ flow
  // The skater who takes the draw: lowest slot not sitting in the box.
  faceoffCenter(team) {
    return this.teamSkaters(team).filter((s) => !s.parked).sort((a, b) => a.slot - b.slot)[0];
  }

  // A faceoff at centre ice, or at one of the painted dots (dotX, dotY).
  setupFaceoff(dotX = 0, dotY = 0) {
    this.endPenaltyShot();
    for (const t of [0, 1]) if (this.extra[t]) this.returnGoalie(t, true);
    const P = [
      [{ x: -30, y: 0 }, { x: -120, y: -125 }, { x: -230, y: 110 }, { x: -160, y: 0 }],
      [{ x: 30, y: 0 }, { x: 120, y: 125 }, { x: 230, y: -110 }, { x: 160, y: 0 }],
    ];
    const order = [0, 1].map((t) => this.teamSkaters(t).filter((s) => !s.parked).sort((a, b) => a.slot - b.slot));
    for (const s of this.skaters) {
      if (s.parked) continue;
      const i = order[s.team].indexOf(s);
      const pos = P[s.team][i] || { x: s.team ? 200 : -200, y: 0 };
      const q = clampInside(pos.x + dotX, pos.y + dotY, s.r + 6);
      s.x = q.x; s.y = q.y; s.vx = 0; s.vy = 0;
      s.face = s.team === 0 ? 0 : Math.PI;
      s.stun = 0; s.charging = false; s.ultWindup = 0; s.dashT = 0; s.state = 'skate'; s.celebrate = 0;
      s.trailT = 0;
    }
    for (const g of this.goalies) {
      g.x = g.goalSide * (GOAL_X - 28); g.y = 0; g.setState('ready'); g.react = null; g.track = null; g.holdT = 0;
    }
    const p = this.puck;
    p.owner = null; p.x = dotX; p.y = dotY; p.z = 46; p.vx = 0; p.vy = 0; p.vz = 0;
    this.stall = null;
    p.shot = null; p.pass = null; p.curve = null; p.touches = []; p.lastTouch = null;
    p.noPickup.clear(); p.rolled.clear(); p.trail.length = 0; p.inNet = null; p.power = null; p.powerT = 0;
    this.barriers.length = 0;
    this.cyclones.length = 0;
    this.trails.length = 0;
    this.chain = [0, 0];
    for (const s of this.skaters) { s.comboT = 0; s.comboFrom = null; }
    this.state = 'faceoff';
    this.stateT = 0;
    this.dropped = false;
    this.washedOut = false;
    this.faceoffRt = [0, 1].map((t) => this.ai[t].faceoffReaction());
    this.faceoffJump = [false, false]; // (a human who went before the puck was down)
    if (this.humans.length) {
      for (const s of this.skaters) s.controlled = this.humans.includes(s.team) && s === this.faceoffCenter(s.team);
    }
    this.emit('faceoff', {});
  }

  // Raw buttons from the player: { mx, my, sprint, a, b, skill, ult }
  setHumanInput(raw, team = this.humanTeam) {
    this.humanInputs[team] = raw;
    if (team === this.humanTeam) this.humanInput = raw;
  }

  mapHuman(c, raw) {
    const p = this.puck;
    const inp = Skater.blankInput();
    inp.mx = raw.mx; inp.my = raw.my; inp.sprint = raw.sprint; inp.sprintBtn = raw.sprintBtn ?? raw.sprint;
    inp.skill = raw.skill; inp.ult = raw.ult; inp.a = raw.a; inp.b = raw.b;
    if (p.owner === c) {
      // a button still held from a check shouldn't start a shot
      if (raw.a && (c.prevIn.check || c.aLatch)) c.aLatch = true;
      if (!raw.a) c.aLatch = false;
      inp.shoot = raw.a && !c.aLatch;
      inp.pass = raw.b;
    }
    else {
      const incoming = !p.owner && p.pass && p.pass.to === c;
      if (incoming || (c.prevIn.shoot && raw.a)) inp.shoot = raw.a;
      else inp.check = raw.a;
      inp.switch = raw.b;
    }
    return inp;
  }

  applyHuman() {
    for (const team of this.humans) {
      const raw = this.humanInputs[team];
      const c = this.controlled(team);
      if (!raw || !c) continue;
      if (this.drill && this.state !== 'play') { c.in = Skater.blankInput(); continue; }
      c.in = this.mapHuman(c, raw);
      if (this.state === 'play' && c.in.switch && !c.prevIn.switch && !c.prevIn.b && !(this.drill && this.drill.noSwitch)) this.switchControl(null, team);
      if (raw.pull && !this.prevPull[team]) this.togglePull(team);
      this.prevPull[team] = !!raw.pull;
    }
  }

  // Hand control to the best-placed teammate (closest to the puck).
  switchControl(to, team) {
    const t = to ? to.team : team ?? this.humanTeam;
    const cur = this.controlled(t);
    if (!cur) return;
    let next = to;
    if (!next) {
      const p = this.puck;
      const mates = this.teamSkaters(cur.team).filter((s) => s !== cur && !s.parked);
      mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      next = mates[0];
    }
    if (!next || next === cur) return;
    cur.controlled = false;
    cur.in = Skater.blankInput();
    next.controlled = true;
    next.oneTimerArmed = 0; // only the player's own button arms a one-timer
    // carry the held buttons over so the new skater doesn't see a fresh press
    next.in = this.mapHuman(next, this.humanInputs[t] || {});
    next.prevIn = { ...next.in, a: true, b: true, shoot: next.in.shoot, pass: true, check: true, switch: true };
    this.emit('switch', { s: next });
  }

  update(dt) {
    this.time += dt;
    this.stateT += dt;
    this.applyHuman();
    if (!this.drill && this.twists.kind !== 'none') this.updateTwists(dt);
    if (this.drill) {
      this.drill.update(this, dt);
      if (this.state === 'play' || this.state === 'drill_over') this.tickEntities(dt, false);
      else for (const s of this.skaters) { s.animT += dt; s.prevIn = { ...s.in }; }
      return;
    }
    const st = this.state;
    if (st === 'intro') {
      if (this.stateT > 1.2) { this.state = 'faceoff'; this.stateT = 0; this.emit('faceoff', {}); }
      this.tickEntities(dt, true);
      return;
    }
    if (st === 'faceoff') return this.updateFaceoff(dt);
    if (st === 'goal') {
      this.tickEntities(dt, false);
      if (this.stateT > 3.4 && !this.holdGoal) {
        if (this.winner !== null) { this.state = 'over'; this.stateT = 0; this.emit('final', { winner: this.winner }); }
        else this.setupFaceoff();
      }
      return;
    }
    if (st === 'over') { this.tickEntities(dt, false); return; }
    if (st === 'penalty') {
      this.tickEntities(dt, false);
      if (this.stateT > 2) { const d = this.penaltyDot; if (this.penaltyShotFor) this.setupPenaltyShot(); else this.setupFaceoff(d ? d.x : 0, d ? d.y : 0); }
      return;
    }
    // play
    if (this.hype.t > 0) this.hype.t -= dt;
    if (this.pshot ? this.updatePenaltyShot(dt) : this.updateStall(dt)) return;
    this.updateBox(dt);
    this.aiGoaliePull(dt);
    this.possessionT[this.puck.owner ? this.puck.owner.team : 0] += this.puck.owner ? dt : 0;
    this.tickEntities(dt, false);
    this.updatePickups(dt);
    if (this.pendingPenalty) this.whistlePenalty();
  }

  updateFaceoff(dt) {
    const p = this.puck;
    // everyone holds position; animate the drop
    for (const s of this.skaters) if (!(s.controlled && this.humans.includes(s.team))) s.in = Skater.blankInput();
    const DROP = 1.1;
    if (this.stateT > DROP - 0.35) {
      p.z = Math.max(0, 46 * (1 - (this.stateT - (DROP - 0.35)) / 0.35));
    }
    const centers = [this.faceoffCenter(0), this.faceoffCenter(1)].filter(Boolean);
    const human = (c) => c.controlled && this.humans.includes(c.team);
    // jumping the drop: a press while the puck is still in the air holds you back a moment
    // after it lands, so the draw is timing, not mashing
    if (!this.dropped && this.stateT > DROP - 0.35) {
      for (const c of centers) if (human(c) && !this.faceoffJump[c.team] && (c.pressed('a') || c.pressed('b'))) { this.faceoffJump[c.team] = true; this.emit('faceoff_early', { s: c }); }
    }
    if (!this.dropped && this.stateT >= DROP) { this.dropped = true; p.z = 0; this.emit('drop', {}); }
    if (this.dropped) {
      const t = this.stateT - DROP;
      let winner = null;
      for (const c of centers) {
        if (human(c)) {
          // (jumped it: held back past the other centre's own reaction, or 0.3 s against a player)
          const other = centers.find((o) => o.team !== c.team), wait = other && !human(other) ? Math.max(0.3, this.faceoffRt[other.team] + 0.05) : 0.3;
          if ((c.pressed('a') || c.pressed('b')) && (!this.faceoffJump[c.team] || t > wait)) winner = winner || c;
        } else if (t >= this.faceoffRt[c.team]) winner = winner || c;
      }
      if (winner) {
        this.takePossession(winner, 'faceoff');
        this.emit('faceoff_win', { s: winner, clean: human(winner) && t < 0.12 }); // (right on the drop)
        this.state = 'play'; this.stateT = 0;
      } else if (t > 0.9) { this.state = 'play'; this.stateT = 0; }
    }
    for (const s of this.skaters) { s.animT += dt; s.prevIn = { ...s.in }; }
  }

  tickEntities(dt, frozen) {
    if (frozen) return;
    const live = this.state === 'play';
    // controllers
    for (const a of this.ai) a.update(dt);
    for (const s of this.skaters) s.update(dt);
    for (const g of this.goalies) g.update(dt);
    this.collideSkaters();
    if (live) { this.protectPuck(dt); this.stickChecks(dt); }
    this.updatePuck(dt);
    this.updateTrails(dt);
    this.updateBarriers(dt);
    this.updateCyclones(dt);
    for (const s of this.skaters) s.prevIn = { ...s.in };
  }

  // ------------------------------------------------------------- skaters
  collideSkaters() {
    const S = this.skaters;
    for (let i = 0; i < S.length; i++) {
      const a = S[i];
      if (a.parked) continue;
      for (let j = i + 1; j < S.length; j++) {
        const b = S[j];
        if (b.parked) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const rr = a.r + b.r + (a.bedrockT > 0 ? 4 : 0) + (b.bedrockT > 0 ? 4 : 0);
        const d2 = dx * dx + dy * dy;
        if (d2 >= (rr + 6) * (rr + 6)) continue;
        const d = Math.sqrt(d2) || 0.01;
        if (this.state === 'play' && a.team !== b.team) {
          if (a.state === 'check' && a.stateT < 0.32 && a.hitThisCheck !== b) this.hit(a, b);
          else if (b.state === 'check' && b.stateT < 0.32 && b.hitThisCheck !== a) this.hit(b, a);
        }
        if (d2 >= rr * rr) continue;
        const nx = dx / d, ny = dy / d;
        const pen = rr - d;
        const ma = a.bedrockT > 0 ? 4 : 1, mb = b.bedrockT > 0 ? 4 : 1;
        a.x -= nx * pen * (mb / (ma + mb)); a.y -= ny * pen * (mb / (ma + mb));
        b.x += nx * pen * (ma / (ma + mb)); b.y += ny * pen * (ma / (ma + mb));
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const j2 = -rv * 0.6;
          a.vx -= nx * j2 * (mb / (ma + mb)); a.vy -= ny * j2 * (mb / (ma + mb));
          b.vx += nx * j2 * (ma / (ma + mb)); b.vy += ny * j2 * (ma / (ma + mb));
        }
      }
      // goalies are immovable
      for (const g of this.goalies) {
        if (g.disabled) continue;
        const dx = a.x - g.x, dy = a.y - g.y;
        const rr = a.r + g.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.01;
          const nx = dx / d, ny = dy / d;
          a.x = g.x + nx * rr; a.y = g.y + ny * rr;
          const vn = a.vx * nx + a.vy * ny;
          if (vn < 0) { a.vx -= 1.3 * vn * nx; a.vy -= 1.3 * vn * ny; }
        }
      }
    }
    // (a shove can push someone into the boards: back onto the ice, and out of the nets)
    for (const a of S) if (!a.parked) { constrainToRink(a, a.r); collideNets(a, a.r); }
  }

  hit(a, b) {
    a.hitThisCheck = b;
    if (b.dashT > 0 || b.fadeT > 0) return; // dashing through, or a shadow
    // a Dangler with the puck: some checks slide right off
    if (b.def.arch === 'dangler' && this.puck.owner === b && this.rng() < 0.2 + (b.hasPerk('Slippery') ? 0.15 : 0)) { this.emit('deke', { s: b, by: a }); return; } // (slipped the check)
    const hadPuck = this.puck.owner === b || this.time - (b.lastPuckT ?? -9) < 0.5;
    const puckDist = Math.hypot(this.puck.x - b.x, this.puck.y - b.y);
    const dir = norm(b.x - a.x, b.y - a.y);
    const rel = Math.max(0, (a.vx - b.vx) * dir.x + (a.vy - b.vy) * dir.y);
    let power = a.d.checkPower * clamp(0.55 + rel / 480, 0.6, 1.45) * (this.mods.has('heavy') ? 1.5 : 1);
    if (a.bedrockT > 0) power *= 1.7;
    if (a.hasPerk('Aftershock')) power *= 1.2;
    if (a.def.arch === 'enforcer') power *= 1.12; // (Heavy)
    const res = b.bedrockT > 0 ? 0.9 : b.d.resist;
    const kb = power * (1 - res) * (b.def.arch === 'enforcer' ? 0.88 : 1);
    b.vx += dir.x * kb; b.vy += dir.y * kb;
    b.stun = b.bedrockT > 0 ? 0 : clamp(0.18 + kb / 1000, 0.2, 0.65) * (b.hasPerk('Thick Skin') ? 0.7 : 1);
    const ambush = a.ambush && a.fadeT <= 0;
    if (a.ambush && a.fadeT <= 0) a.ambush = false;
    b.charging = false; b.ultWindup = 0;
    b.flash = 0.25;
    a.vx *= 0.45; a.vy *= 0.45;
    a.stats_.hits++;
    this.addUlt(a, 5);
    const p = this.puck;
    let stripped = false;
    if (p.owner === b && (a.bedrockT > 0 || ambush || kb > 150 || this.rng() < 0.75)) {
      stripped = true;
      this.loosePuck(b);
      const perp = this.rng.range(-1, 1);
      p.vx = b.vx * 0.4 + dir.x * 90 - dir.y * perp * 120;
      p.vy = b.vy * 0.4 + dir.y * 90 + dir.x * perp * 120;
      p.noPickup.set(b, 0.7);
      this.pendingSteal = { by: a.team, from: b, t: this.time };
    }
    if (b.ultWindup > 0 && b.def.ult.id === 'thunderclap') b.ult = 50;
    this.emit('hit', { a, b, power: kb, stripped });
    this.judgeHit(a, b, kb, hadPuck, puckDist);
  }

  // The deke: with someone right in front (a skater, or the goalie), the carrier cuts away from
  // them with a burst, the puck pulled across to the backhand and hard to poke for a moment. A
  // goalie can bite on it, leaning the way the puck was shown (less often the better they read
  // the play). Costs stamina, and a breath before the next.
  deke(s) {
    const c = Math.cos(s.face), sn = Math.sin(s.face);
    let by = null, bd = 1e9;
    for (const o of [...this.opponents(s), this.goalieAt(s.side)]) {
      if (!o || o.parked || o.disabled) continue;
      const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), ahead = (dx * c + dy * sn) / (d || 1);
      if (d < (o.isGoalie ? 230 : 110) && ahead > 0.3 && d < bd) { bd = d; by = o; }
    }
    if (!by) return false;
    const cross = c * (by.y - s.y) - sn * (by.x - s.x); // which side of our line they're on
    const side = cross > 0 ? -1 : 1; // cut the other way
    const px = -sn * side, py = c * side;
    s.vx += px * 250 + c * 40; s.vy += py * 250 + sn * 40;
    const sp = Math.hypot(s.vx, s.vy), cap = s.d.maxSpeed * 1.35;
    if (sp > cap) { s.vx *= cap / sp; s.vy *= cap / sp; }
    s.dekeT = 0.45; s.dekeCd = 1.6; s.protect = 1;
    s.stamina -= 10; s.regenDelay = 0.5;
    if (by.isGoalie && this.rng() < clamp(0.45 + (s.stats.agi - by.stats.rfx) * 0.05, 0.15, 0.8)) {
      by.biteT = 0.55; by.biteY = -py * 26; // (sold the other way)
      this.emit('deke_goalie', { s, g: by });
    }
    this.emit('deke', { s, by });
    return true;
  }

  // Puck protection: a carrier with a stick reaching in on the forehand side pulls the puck
  // across to the backhand, in close, with their body between it and the stick (quicker and
  // fuller the better their hands). A stick on the backhand side finds it out on the forehand.
  protectPuck(dt) {
    const c = this.puck.owner;
    if (!c || !c.isSkater) return;
    let near = null, nd = 85;
    for (const d of this.opponents(c)) {
      if (d.stun > 0 || d.parked) continue;
      const st = d.stickPoint(), dd = Math.hypot(st.x - c.x, st.y - c.y);
      if (dd < nd) { nd = dd; near = d; }
    }
    let want = c.dekeT > 0 ? 1 : 0; // (mid-deke: pulled right in)
    if (near && !(c.dekeT > 0)) {
      const side = c.hand === 'R' ? -1 : 1, lx = side * Math.sin(c.face), ly = -side * Math.cos(c.face); // the stick side
      if ((near.x - c.x) * lx + (near.y - c.y) * ly > 0) want = clamp(0.45 + (c.stats.agi + c.stats.pas) * 0.03, 0, 1);
    }
    c.protect += (want - c.protect) * Math.min(1, dt * (6 + c.stats.agi * 0.6));
    c.shieldCd = Math.max(0, (c.shieldCd || 0) - dt);
  }

  // Defender's stick on the puck has a chance to poke it free.
  stickChecks(dt) {
    const p = this.puck;
    const c = p.owner;
    if (!c || !c.isSkater) return;
    for (const d of this.opponents(c)) {
      if (d.stun > 0 || d.parked) continue;
      const sp = d.stickPoint();
      if (Math.hypot(sp.x - p.x, sp.y - p.y) > 20) {
        // a stick that would have had it on the forehand, beaten by the puck pulled across: a shield
        if (c.protect > 0.5 && !(c.shieldCd > 0)) {
          const b = c.bladeReach(), open = c.bladeAt(b.fwd, b.lat);
          if (Math.hypot(sp.x - open.x, sp.y - open.y) < 16) { c.shieldCd = 1.2; c.stats_.shields++; this.emit('shield', { s: c, by: d }); }
        }
        continue;
      }
      const shielded = c.dekeT > 0 || (d.x - c.x) * (p.x - c.x) + (d.y - c.y) * (p.y - c.y) < 0; // reaching round the carrier's body (or a deke going by)
      // (the base was 0.8 when the puck sat in front of the body: out on the blade it's easier to reach)
      const rate = STEAL_BASE * (shielded ? 0.58 : 1) * (1 + (d.stats.chk - c.stats.pas) * 0.06) * this.ai[d.team].stealMul() * (d.def.arch === 'grinder' ? 1.08 : 1) * (d.hasPerk('Pickpocket') ? 1.1 : 1);
      if (this.rng() < rate * dt) {
        this.takePossession(d, 'steal');
        c.stun = 0.12;
        p.noPickup.set(c, 0.5);
        return;
      }
    }
  }

  addUlt(s, amt) {
    if (!s || !s.isSkater) return;
    let mult = (METER_PERKS.some((k) => s.hasPerk(k)) ? 1.15 : 1) * this.ultRate;
    if (this.hype.t > 0 && this.hype.team === s.team) mult *= 1.25;
    const before = s.ult;
    s.ult = Math.min(100, s.ult + amt * mult);
    if (before < 100 && s.ult >= 100) this.emit('ult_ready', { s });
  }

  // --------------------------------------------------------------- puck
  takePossession(s, how) {
    const p = this.puck;
    const prev = p.owner;
    const prevTeam = prev ? prev.team : p.lastTouch ? p.lastTouch.team : null;
    if (prev && prev.isSkater) prev.lastPuckT = this.time;
    p.owner = s;
    p.vz = 0; p.z = 0;
    p.curve = null;
    const passInfo = p.pass;
    p.shot = null; p.pass = null;
    p.rolled.clear();
    if (s.isSkater) {
      s.protect = 0;
      const cp = s.carryPoint();
      if (Math.hypot(cp.x - p.x, cp.y - p.y) > 60) { p.x = cp.x; p.y = cp.y; } // (close: it eases onto the blade, see updatePuck)
      // pass completed?
      if (prevTeam !== null && prevTeam !== s.team) this.chain[prevTeam] = 0;
      if (passInfo && passInfo.from.isSkater && passInfo.from.team === s.team && passInfo.from !== s) {
        passInfo.from.stats_.passes++;
        this.addUlt(passInfo.from, 4);
        this.emit('receive', { s, from: passInfo.from });
        this.chemStat(s.team, passInfo.from, s).passes++;
        this.chain[s.team]++;
        if (this.chain[s.team] >= 3) this.emit('chain', { team: s.team, n: this.chain[s.team], s });
        const lvl = this.chemLevel(passInfo.from, s);
        if (lvl > 0) {
          s.comboFrom = passInfo.from;
          s.comboT = 0.75;
          this.emit('combo_ready', { s, from: passInfo.from, level: lvl });
        }
      }
      // takeaway
      const stole = how === 'steal' || (prevTeam !== null && prevTeam !== s.team && (prev?.isSkater || (this.pendingSteal && this.pendingSteal.by === s.team && this.time - this.pendingSteal.t < 1.5)));
      if (stole && how !== 'faceoff' && !(prev && prev.isGoalie)) {
        s.stats_.steals++;
        this.addUlt(s, 8);
        this.emit('steal', { s, from: prev });
      }
      this.pendingSteal = null;
      p.setTouch(s);
      if (this.humans.includes(s.team) && !s.controlled && !s.scripted && this.controlled(s.team)) this.switchControl(s);
      // one-timer
      if (how === 'catch' && passInfo && passInfo.from.team === s.team && (s.oneTimerArmed > 0 || s.in.shoot) && this.inShootingRange(s)) {
        s.charging = false;
        this.shoot(s, { kind: 'onetimer', fore: this.forehand(s, passInfo.from) });
        return;
      }
      if (s.charging) s.charging = false;
    }
    this.emit('possession', { s, how });
  }

  loosePuck(from) {
    const p = this.puck;
    if (p.owner !== from) return;
    p.owner = null;
    if (from.isSkater) { from.charging = false; p.setTouch(from); }
  }

  inShootingRange(s) {
    const gx = s.side * GOAL_X;
    const dx = (gx - s.x) * s.side;
    return dx > 20 && dx < 560;
  }

  aimFor(s, explicit) {
    const g = this.goalieAt(s.side);
    const iy = explicit ?? (Math.abs(s.in.aimY) > 0.35 ? s.in.aimY : Math.abs(s.in.my) > 0.45 && s.controlled ? s.in.my : 0);
    if (typeof iy === 'number' && Math.abs(iy) > 0.35 && explicit === undefined) return Math.sign(iy) * MOUTH * 0.66;
    if (explicit !== undefined && explicit !== null) return explicit;
    if (this.drill && this.drill.neutralAim !== undefined) return this.drill.neutralAim;
    if (s.controlled && this.assist === 'off') return 0; // no auto-corner without assist
    // smart aim: the side the goalie is leaving open
    const side = g.y > 3 ? -1 : g.y < -3 ? 1 : (this.rng() < 0.5 ? -1 : 1);
    return side * MOUTH * 0.62;
  }

  shoot(s, opts) {
    const p = this.puck;
    if (p.owner !== s) return;
    const kind = opts.kind;
    const gx = s.side * GOAL_X;
    let aimY = this.aimFor(s, opts.aimY);
    const charge = opts.charge ?? 0.6;
    let speed;
    switch (kind) {
      case 'wrist': speed = s.d.wrist * (s.hasPerk('Quick Release') ? 1.1 : 1); break;
      case 'slap': speed = (s.d.slapBase + s.d.slapGain * charge) * (s.def.arch === 'blueliner' ? 1.06 : 1); break;
      case 'onetimer': speed = (s.d.slapBase + s.d.slapGain * 0.55) * 1.05 * (opts.fore === undefined ? 1 : opts.fore ? 1.06 : 0.96); break;
      case 'zero': speed = 1120; break;
      case 'thunderclap': speed = 1750; break;
      case 'firestorm': speed = 1400 * (s.hasPerk('Inferno') ? 1.1 : 1); break;
      case 'eclipse': speed = 1250; break;
      default: speed = s.d.wrist;
    }
    const distG = Math.hypot(gx - p.x, aimY - p.y);
    let err = s.d.aimErr * (0.45 + distG / 520);
    if (kind === 'slap') err *= 0.75 + 0.6 * charge;
    if (kind === 'onetimer') err *= opts.fore ? 0.78 : 0.85; // (a one-timer on the forehand is the clean one)
    if (ULT_SHOTS.has(kind)) err *= 0.7;
    if (s.hasPerk('Sniper')) err *= 0.85;
    if (s.def.arch === 'sniper') err *= 0.88; // (Pick a Corner)
    err *= this.ai[s.team].aimMul(s);
    aimY += this.rng.normal() * err;

    speed *= this.planShotMul(s.team);
    const special = { zero: kind === 'zero', thunder: kind === 'thunderclap', firestorm: kind === 'firestorm', eclipse: kind === 'eclipse' };
    // Heat Check: an ignited shot
    if (s.igniteT > 0 && !ULT_SHOTS.has(kind)) { speed *= 1.2; special.ember = true; s.igniteT = 0; }
    // pass chain: each completed pass in a row adds a little power
    const chain = this.chain[s.team];
    if (chain >= 2) { speed *= 1 + Math.min(4, chain) * 0.03; special.chain = chain; }
    this.chain[s.team] = 0;
    // chemistry combo: quick shot right after a pass from a bonded teammate
    let combo = null;
    if (s.comboT > 0 && s.comboFrom && !ULT_SHOTS.has(kind)) {
      const level = this.chemLevel(s.comboFrom, s);
      const key = s.twin && s.comboFrom.who === s.twin ? 'ragnarok' : pairKey(s.comboFrom.def.elem, s.def.elem);
      if (level > 0 && COMBOS[key]) combo = { key, pair: pairKey(s.comboFrom.who, s.who), level, from: s.comboFrom };
    }
    s.comboT = 0; s.comboFrom = null;
    if (combo) {
      special.combo = combo.key; special.comboLevel = combo.level; special.comboPair = combo.pair;
      if (combo.key === 'frost+thunder') speed *= 1.1 + combo.level * 0.03;
      if (combo.key === 'frost+stone') speed *= 1.06;
      if (combo.key === 'stone+thunder') speed *= 1.12 + (combo.level >= 3 ? 0.06 : 0);
      aimY = this.aimFor(s, opts.aimY);
      if (combo.key === 'ragnarok') {
        // the twins: out of the dark and on fire
        speed *= 1.2 + lv3(combo.level);
        Object.assign(special, { firestorm: true, ember: true, hidden: 0.3 });
        aimY += this.rng.normal() * s.d.aimErr * 0.5;
      } else if (!BESPOKE_COMBOS.has(combo.key)) {
        // the newer pairs: each element brings its part
        const parts = combo.key.split('+'), lv = combo.level;
        if (parts.includes('thunder')) speed *= 1.1 + lv * 0.03;
        if (parts.includes('ember')) special.ember = true;
        if (parts.includes('shadow')) special.hidden = 0.2 + lv * 0.05;
        if (parts.includes('frost')) special.chill = true;
        if (parts.includes('gale')) { aimY = this.aimFor(s, null); aimY += this.rng.normal() * s.d.aimErr * 0.45; }
        else aimY += this.rng.normal() * s.d.aimErr * 0.85;
      } else aimY += this.rng.normal() * s.d.aimErr * 0.85;
    }
    let power = null;
    if (p.power) {
      power = p.power;
      if (power === 'fire') speed *= 1.3;
      if (power === 'lightning') speed *= 1.1;
      p.power = null; p.powerT = 0;
      this.emit('power_use', { s, type: power, action: 'shot' });
    }
    if (s.empowered > 0) { speed *= 1.25; special.charged = true; s.empowered = 0; }

    let dir;
    // behind the goal line: just throw it at the net front
    if ((p.x - gx) * s.side > -8) dir = norm(gx - s.side * 40 - p.x, -p.y);
    else dir = norm(gx - p.x, aimY - p.y);

    if (power === 'gravity') {
      // launch off-line toward the goalie side, then curve onto the aim point
      const g = this.goalieAt(s.side);
      const decoy = Math.sign(g.y - aimY || 1) * 0.42;
      const c = Math.cos(decoy), sn = Math.sin(decoy);
      dir = { x: dir.x * c - dir.y * sn, y: dir.x * sn + dir.y * c };
      p.curve = { tx: gx, ty: aimY, rate: 3.6, t: 0 };
    }
    this.loosePuck(s);
    p.vx = dir.x * speed; p.vy = dir.y * speed;
    p.vz = kind === 'slap' ? 40 + 120 * charge : kind === 'wrist' ? 70 : 30;
    p.shot = { by: s, team: s.team, kind, t: this.time, speed, power, special, frozen: new Set(), onNet: false,
      plow: combo && combo.key === 'frost+stone' ? (combo.level >= 2 ? 2 : 1) : combo && !BESPOKE_COMBOS.has(combo.key) && combo.key.includes('stone') ? 1 : 0 };
    p.pass = null;
    p.noPickup.set(s, 0.35);
    p.rolled.clear();
    s.setState('shoot', 0.24);
    s.charging = false;
    s.stats_.shots++;
    if (kind === 'onetimer') s.stats_.oneTimers++;
    const g = this.goalieAt(s.side);
    g.onShot(p.shot);
    this.emit('shot', { s, kind, speed, power, special });
    if (combo) {
      this.emit('combo', { s, from: combo.from, key: combo.key, level: combo.level });
      if (combo.key === 'stone+thunder') this.quake(s, combo.level);
    }
  }

  // Does a pass from `from` reach s on the forehand? A left shot's blade is on the left: the
  // forehand side is the shooter's left as they face the net (y runs down the screen).
  forehand(s, from) {
    const fx = s.side * GOAL_X - s.x, fy = -s.y, l = Math.hypot(fx, fy) || 1;
    const left = (fy / l) * (from.x - s.x) - (fx / l) * (from.y - s.y) > 0;
    return (s.hand || 'L') === 'L' ? left : !left;
  }

  choosePassTarget(s) {
    const mates = this.skaters.filter((o) => o.team === s.team && o !== s && !o.parked);
    const aim = norm(s.in.mx, s.in.my);
    const ax = aim.l > 0.3 ? aim.x : Math.cos(s.face), ay = aim.l > 0.3 ? aim.y : Math.sin(s.face);
    let best = null, bestScore = -1e9;
    for (const m of mates) {
      const v = norm(m.x - s.x, m.y - s.y);
      const ang = ax * v.x + ay * v.y;
      const open = Math.min(1.5, this.nearestOpp(m) / 110);
      const lane = this.laneClear(s.x, s.y, m.x, m.y, s.team);
      const score = ang * 2.2 + open * 0.6 + lane * 0.8 - v.l / 1400 + (m.x - s.x) * s.side / 900;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  nearestOpp(m) {
    let best = 1e9;
    for (const o of this.skaters) if (o.team !== m.team) best = Math.min(best, Math.hypot(o.x - m.x, o.y - m.y));
    return best;
  }

  // 0..1: how clear a passing lane is of opponents (one in the box isn't in it). (A lane that
  // counts the ground a defender covers while the pass travels was tried: carriers held on
  // to the puck, sticks found it more, and matches ran about a minute longer.)
  laneClear(ax, ay, bx, by, team) {
    let worst = 1;
    for (const o of this.skaters) {
      if (o.team === team || o.parked) continue;
      const sd = segDist(o.x, o.y, ax, ay, bx, by);
      if (sd.t < 0.05 || sd.t > 0.97) continue;
      worst = Math.min(worst, clamp((sd.d - 14) / 40, 0, 1));
    }
    for (const b of this.barriers) {
      if (!b.alive) continue;
      const sd = segDist(b.x, b.y, ax, ay, bx, by);
      if (sd.d < b.len / 2) worst = Math.min(worst, 0.1);
    }
    return worst;
  }

  pass(s, toHint) {
    const p = this.puck;
    if (p.owner !== s) return;
    const target = toHint && !toHint.parked ? toHint : this.choosePassTarget(s); // (never to the penalty box)
    const speed = s.d.passSpeed * ((s.hasPerk('Vision') || s.hasPerk('Outlet')) ? 1.12 : 1) * (s.def.arch === 'playmaker' ? 1.06 : 1)
      * (target && s.twin && target.who === s.twin ? 1.15 : 1); // the twins' link
    s.setState('pass', 0.2);
    if (!target) return;
    if (p.power === 'lightning') {
      p.power = null; p.powerT = 0;
      this.loosePuck(s);
      p.shot = null;
      this.emit('lightning_pass', { from: s, to: target, x0: p.x, y0: p.y });
      this.emit('power_use', { s, type: 'lightning', action: 'pass' });
      p.pass = { from: s, to: target, t: this.time };
      this.takePossession(target, 'catch');
      target.empowered = 5;
      return;
    }
    // tape to tape: aimed at the receiver's blade, led by where they're skating
    const aim = target.isSkater ? target.stickPoint(18) : target;
    let tx = aim.x, ty = aim.y;
    for (let i = 0; i < 3; i++) {
      const t = Math.hypot(tx - p.x, ty - p.y) / speed;
      tx = aim.x + target.vx * t * 0.85;
      ty = aim.y + target.vy * t * 0.85;
    }
    const c = clampInside(tx, ty, 34);
    const dir0 = norm(c.x - p.x, c.y - p.y);
    const e = this.rng.normal() * s.d.passErr * (0.4 + dir0.l / 600);
    const dir = norm(c.x - p.x - dir0.y * e, c.y - p.y + dir0.x * e);
    this.loosePuck(s);
    p.vx = dir.x * speed; p.vy = dir.y * speed; p.vz = 0;
    p.pass = { from: s, to: target, t: this.time };
    p.shot = null;
    p.noPickup.set(s, 0.3);
    p.rolled.clear();
    this.emit('pass', { s, to: target });
  }

  // Dump it in: fire the puck around the end boards behind their net and chase it.
  dumpPuck(s) {
    const p = this.puck;
    if (p.owner !== s) return;
    let sy = Math.sign(s.y) || (this.rng() < 0.5 ? -1 : 1);
    // the Longhouse: an AI dumps it into the corner without a loose plank on the way
    if (!s.controlled && this.twists.planks.length) {
      const loose = (y) => this.twists.planks.some((pl) => (pl.side === 'far' || pl.side === 'near') ? (pl.side === 'far') === (y < 0) && Math.max(pl.a0 * s.side, pl.a1 * s.side) > GOAL_X - 260 : pl.side === (s.side > 0 ? 'right' : 'left') && Math.sign((pl.a0 + pl.a1) / 2) === Math.sign(y));
      if (loose(sy * 200) && !loose(-sy * 200)) sy = -sy;
    }
    const tx = s.side * (GOAL_X + 60), ty = sy * 200 + this.rng.range(-30, 30);
    const d = norm(tx - p.x, ty - p.y);
    s.setState('pass', 0.2);
    this.loosePuck(s);
    const speed = 760;
    p.vx = d.x * speed; p.vy = d.y * speed; p.vz = 0;
    p.pass = null; p.shot = null;
    p.noPickup.set(s, 0.4);
    p.rolled.clear();
    this.emit('dump', { s });
  }

  // The goalie plays a held puck: to the open teammate (or the one the player aims at), else
  // around the boards (or always, when the player rims it).
  goalieDistribute(g, aim = null, rim = false) {
    const p = this.puck;
    const mates = this.teamSkaters(g.team).filter((m) => !m.parked);
    let best = null, bestScore = -1e9;
    for (const m of rim ? [] : mates) {
      const lane = this.laneClear(g.x, g.y, m.x, m.y, g.team);
      const open = this.nearestOpp(m);
      let score = lane * 2 + Math.min(open, 200) / 100 - Math.hypot(m.x - g.x, m.y - g.y) / 900;
      if (aim) { const d = norm(m.x - g.x, m.y - g.y), a = norm(aim.x, aim.y); score += (d.x * a.x + d.y * a.y) * 4 + 2; }
      if (score > bestScore) { bestScore = score; best = m; }
    }
    g.setState('ready');
    p.owner = null;
    const hp = g.holdPoint();
    p.x = hp.x; p.y = hp.y;
    if (best && bestScore > 1.2) {
      const d = norm(best.x - p.x, best.y - p.y);
      p.vx = d.x * 620; p.vy = d.y * 620;
      p.pass = { from: g, to: best, t: this.time };
    } else {
      // rim it around the boards
      const ty = this.rng() < 0.5 ? -1 : 1;
      const d = norm(-g.goalSide * 0.5, ty);
      p.vx = d.x * 700; p.vy = d.y * 700;
      p.pass = null;
    }
    p.shot = null;
    p.noPickup.set(g, 1);
    this.emit('goalie_pass', { g });
  }

  // The goalie pokes the puck off a carrier's stick, out to the side of the crease.
  goaliePoke(g, s) {
    const p = this.puck;
    this.loosePuck(s);
    const d = norm(-g.goalSide * 0.45, Math.sign(p.y - g.y) || (this.rng() < 0.5 ? -1 : 1));
    p.vx = d.x * 320; p.vy = d.y * 320;
    p.noPickup.set(s, 0.35); p.noPickup.set(g, 0.6);
    this.emit('poke_check', { g, s });
  }

  updatePuck(dt) {
    const p = this.puck;
    for (const [k, v] of p.noPickup) { if (v - dt <= 0) p.noPickup.delete(k); else p.noPickup.set(k, v - dt); }
    if (p.power) {
      p.powerT -= dt;
      if (p.powerT <= 0) { this.emit('power_expire', { type: p.power }); p.power = null; }
    }
    if (p.owner) {
      const o = p.owner;
      const cp = o.isSkater ? o.carryPoint() : o.holdPoint();
      p.px = p.x; p.py = p.y;
      if (o.isSkater) {
        // carried along, then eased onto the blade: a catch or a quick turn brings it round
        // the stick rather than jumping it there
        p.x += (o.vx || 0) * dt; p.y += (o.vy || 0) * dt;
        const dx = cp.x - p.x, dy = cp.y - p.y, k = Math.hypot(dx, dy) > 60 ? 1 : 1 - Math.exp(-dt * 26);
        p.x += dx * k; p.y += dy * k;
        collideNets(p, PUCK_R); // (on a wraparound the blade passes the net: the puck goes round it, not through the mesh)
        if (p.trail.length) p.trail.length = 0; // (the streak of the pass it came in on)
      } else { p.x = cp.x; p.y = cp.y; }
      p.z = 0;
      p.vx = o.vx || 0; p.vy = o.vy || 0;
      // carried puck can still touch pickups
      this.checkPickupTouch();
      return;
    }

    // substeps for fast pucks
    const sp = p.speed;
    const steps = Math.max(1, Math.ceil((sp * dt) / 10));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      if (this.puckStep(h)) break;
    }
    // record trail for fast pucks
    if (sp > 500 || p.power) { p.trail.unshift({ x: p.x, y: p.y, z: p.z, t: this.time }); if (p.trail.length > 14) p.trail.length = 14; }
    else if (p.trail.length) p.trail.pop();
    this.checkPickupTouch();
    if (p.shot && p.speed < 250) p.shot = null;
    if (p.pass && this.time - p.pass.t > 2.2) p.pass = null;
  }

  // One integration substep for a loose puck. Returns true if the puck was claimed.
  puckStep(h) {
    const p = this.puck;
    p.px = p.x; p.py = p.y;
    // gravity curve
    if (p.curve) {
      p.curve.t += h;
      const want = Math.atan2(p.curve.ty - p.y, p.curve.tx - p.x);
      const cur = Math.atan2(p.vy, p.vx);
      const d = angDiff(cur, want);
      const turn = clamp(d, -p.curve.rate * h, p.curve.rate * h);
      const sp = p.speed, na = cur + turn;
      p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      if (p.curve.t > 0.9 || Math.abs(p.x - p.curve.tx) < 40) p.curve = null;
    }
    p.x += p.vx * h; p.y += p.vy * h;
    // height
    if (p.z > 0 || p.vz !== 0) {
      p.vz -= 900 * h;
      p.z += p.vz * h;
      if (p.z <= 0) { p.z = 0; p.vz = p.vz < -60 ? -p.vz * 0.3 : 0; }
    }
    // friction
    const f = Math.exp(-(this.mods.has('speed') ? 0.3 : 0.42) * h);
    p.vx *= f; p.vy *= f;
    const lane = this.laneAt(p.x, p.y);
    if (lane) p.vx += lane.dir * 140 * h;
    if (this.inCrack(p.x, p.y)) { const f2 = Math.exp(-1.6 * h); p.vx *= f2; p.vy *= f2; }
    else if (this.twists.pools.length && p.z <= 0 && this.inPool(p.x, p.y)) { const f2 = Math.exp(-1.25 * h); p.vx *= f2; p.vy *= f2; }
    if (p.speed < 4) { p.vx = 0; p.vy = 0; }

    // boards
    const n = constrainToRink(p, PUCK_R);
    if (n) {
      const vn = p.vx * n.nx + p.vy * n.ny;
      if (vn > 0) {
        const tx = -n.ny, ty = n.nx;
        const vt = p.vx * tx + p.vy * ty;
        p.vx = tx * vt * 0.92 - n.nx * vn * 0.7;
        p.vy = ty * vt * 0.92 - n.ny * vn * 0.7;
        if (vn > 120) this.emit('puck_boards', { x: p.x, y: p.y, power: vn });
        if (vn > 90 && this.twists.planks.length) { const pl = this.plankAt(p.x, p.y, n); if (pl) this.plankBounce(p, n, vn, pl); }
        if (p.shot) { p.shot.wide = true; }
      }
    }
    // barriers
    for (const b of this.barriers) {
      const hit = collideBarrier(p, PUCK_R, b, 0.6);
      if (hit) {
        this.emit('barrier_hit', { b, power: -hit.vn });
        if (-hit.vn > 300 && (p.shot || p.pass) && (p.shot ? p.shot.team : p.pass.from.team) !== b.team) {
          b.breaking = 0.6;
          this.emit('barrier_block', { b });
          if (p.shot) { p.shot = null; }
          p.pass = null;
        }
      }
    }
    // goals, posts, nets, goalies
    if (this.puckNets()) return true;
    if (this.state !== 'play') return false;
    // skaters: catches and blocks
    return this.puckSkaters();
  }

  puckNets() {
    const p = this.puck;
    for (const side of [-1, 1]) {
      const gx = side * GOAL_X;
      // posts
      for (const py of [-MOUTH, MOUTH]) {
        const dx = p.x - gx, dy = p.y - py;
        const rr = POST_R + PUCK_R;
        if (dx * dx + dy * dy < rr * rr && p.z < CROSSBAR) {
          const d = Math.hypot(dx, dy) || 1;
          const nx = dx / d, ny = dy / d;
          p.x = gx + nx * rr; p.y = py + ny * rr;
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= 1.8 * vn * nx; p.vy -= 1.8 * vn * ny; }
          if (-vn > 150) this.emit('post', { x: p.x, y: p.y, power: -vn });
          if (p.shot) p.shot.post = true;
        }
      }
      // goalie save plane
      if (this.state === 'play') {
        const g = this.goalieAt(side);
        if (!g.disabled && g.state !== 'hold' && this.goalieSave(g)) return true;
      }
      // goal line crossing
      const b = netBox(side);
      const prevIn = (p.px - gx) * side;
      const nowIn = (p.x - gx) * side;
      if (prevIn < 0 && nowIn >= 0) {
        const t = prevIn / (prevIn - nowIn);
        const yc = p.py + (p.y - p.py) * t;
        if (Math.abs(yc) < MOUTH - 1 && p.z < CROSSBAR) {
          if (this.state === 'play') {
            this.goal(side, yc);
          }
          // settle in the net
          p.x = gx + side * 8; p.y = yc;
          p.vx *= 0.15; p.vy *= 0.15; p.vz = 0; p.z = 0;
          p.inNet = side;
          return true;
        }
      }
      // inside the net: keep it there
      if (p.inNet === side) {
        p.x = clamp(p.x, b.x0 + 4, b.x1 - 4); p.y = clamp(p.y, -MOUTH + 4, MOUTH - 4);
        p.vx *= 0.8; p.vy *= 0.8;
        continue;
      }
      // net body from outside
      if (p.x > b.x0 - PUCK_R && p.x < b.x1 + PUCK_R && p.y > b.y0 - PUCK_R && p.y < b.y1 + PUCK_R && nowIn > 0) {
        const opts = [
          { n: [side, 0], pen: (b.x1 + PUCK_R - p.x) * (side > 0 ? 1 : 0) + (p.x - (b.x0 - PUCK_R)) * (side < 0 ? 1 : 0) },
          { n: [0, -1], pen: p.y - (b.y0 - PUCK_R) },
          { n: [0, 1], pen: b.y1 + PUCK_R - p.y },
        ].sort((a, c) => a.pen - c.pen)[0];
        const [nx, ny] = opts.n;
        p.x += nx * opts.pen; p.y += ny * opts.pen;
        const vn = p.vx * nx + p.vy * ny;
        if (vn < 0) { p.vx -= 1.5 * vn * nx; p.vy -= 1.5 * vn * ny; }
        if (-vn > 150) this.emit('net_hit', { side });
        if (p.shot) p.shot.wide = true;
      }
    }
    return false;
  }

  goalieSave(g) {
    const p = this.puck;
    const gs = g.goalSide;
    // only pucks travelling into the net side
    const prevRel = (p.px - g.x) * gs, nowRel = (p.x - g.x) * gs;
    const slow = p.speed < 260;
    if (slow) {
      // smother slow pucks in the crease
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < g.r + 12 && Math.abs(p.y) < MOUTH + 20 && p.owner === null && !p.noPickup.has(g)) {
        this.goalieCatch(g, false);
        return true;
      }
      return false;
    }
    if (!(prevRel < 0 && nowRel >= 0)) return false;
    const t = prevRel / (prevRel - nowRel);
    const yc = p.py + (p.y - p.py) * t;
    if (Math.abs(yc) > MOUTH + 22) return false;
    let reach = g.reach() * this.planGoalieMul(g.team) * (g.team === 1 ? this.buffs.oppGoalieMul || 1 : 1);
    const off = yc - g.y;
    if (g.state === 'dive' && Math.sign(off) === g.diveDir) reach += 34;
    if (g.state === 'dive' && Math.sign(off) !== g.diveDir) reach *= 0.6;
    const sh = p.shot;
    if (sh && sh.power === 'fire') reach *= 0.8;
    if (sh && sh.special && sh.special.combo === 'frost+thunder') reach *= 0.97;
    if (sh && sh.special && sh.special.thunder) reach *= 0.9;
    if (sh && sh.special) {
      if (sh.special.firestorm) reach *= 0.85;
      if (sh.special.eclipse) reach *= 0.8; // read late
      if (sh.special.hidden) reach *= 0.92;
      if (sh.special.ember) reach *= 0.95;
    }
    // the goalie covers a disc, not a line across the crease: what counts is how close the
    // puck's path passes him (so a sharp angle doesn't slip by a goalie it hits square)
    const across = Math.abs(off) * Math.max(0.3, Math.abs(p.vx) / Math.max(1, Math.hypot(p.vx, p.vy)));
    if (across > reach * GOALIE_DISC + PUCK_R) return false;
    // saved
    if (sh) this.shotOnGoal(sh);
    const speed = p.speed;
    let catchP = clamp(0.5 - (speed - 500) / 1500, 0.06, 0.5) * (0.8 + g.stats.rfx * 0.04);
    if (sh && (sh.power === 'fire' || sh.special?.charged || sh.special?.thunder)) catchP *= 0.3;
    const cb = sh && sh.special && sh.special.combo;
    if (cb === 'frost+thunder') catchP *= sh.special.comboLevel >= 3 ? 0 : 0.5;
    if (cb === 'frost+stone') catchP = 0;
    if (sh && sh.special) {
      if (sh.special.ember) catchP *= 0.4;
      if (sh.special.eclipse) catchP *= sh.by.hasPerk('Total Eclipse') ? 0 : 0.3;
      if (sh.special.firestorm) catchP = 0;
    }
    if (g.state === 'dive') catchP *= 0.4;
    p.x = g.x - gs * 4; p.y = g.y + off;
    g.saves++;
    g.flash = 0.2;
    if (g.human) g.ult = Math.min(100, g.ult + 14); // Wall of Ice charges with saves
    if (sh && (ULT_SHOTS.has(sh.kind) || (sh.special && sh.special.combo))) this.emit('big_save', { g, kind: sh.kind });
    for (const s of this.teamSkaters(g.team)) this.addUlt(s, 2);
    if (sh && sh.power === 'ice') { g.slowT = 1.3; this.emit('frozen', { g }); }
    if (this.rng() < catchP && (!sh || sh.power !== 'ice')) {
      this.goalieCatch(g, true);
      return true;
    }
    // rebound
    const out = -gs;
    p.vx = out * Math.abs(p.vx) * this.rng.range(0.18, 0.34);
    p.vy = p.vy * 0.25 + this.rng.range(-1, 1) * 230;
    if (sh && sh.special && sh.special.firestorm) { p.vx = out * Math.abs(speed) * 0.36; p.vy = this.rng.range(-1, 1) * 260; } // a nasty rebound
    if (cb === 'frost+stone' && sh.special.comboLevel >= 3) {
      // heavy rebound straight back into the slot
      p.vx = out * Math.abs(speed) * 0.42; p.vy = -p.y * 2 + this.rng.range(-60, 60);
    }
    p.vz = this.rng.range(0, 80);
    p.shot = null; p.pass = null; p.curve = null;
    p.noPickup.set(g, 0.4);
    p.rolled.clear();
    g.saveHigh = p.z > 14; g.saveUp = p.y < g.y;
    if (g.state !== 'skate_in') g.setState(Math.abs(off) > 10 ? 'glove' : 'butterfly');
    this.emit('save', { g, caught: false, speed, x: p.x, y: p.y });
    return false;
  }

  goalieCatch(g, fromShot) {
    const p = this.puck;
    p.owner = g;
    p.shot = null; p.pass = null; p.curve = null;
    p.vx = 0; p.vy = 0; p.vz = 0; p.z = 0;
    g.setState('hold');
    g.holdT = g.human ? 2.5 : 0.9; // the player gets a moment to pick a pass
    g.stopPose = !fromShot;
    g.track = null; g.react = null;
    if (p.power === 'ice') { /* ice power survives */ }
    this.emit('save', { g, caught: true, x: p.x, y: p.y, fromShot });
  }

  shotOnGoal(sh) {
    if (sh.onNet) return;
    sh.onNet = true;
    this.shotsOnGoal[sh.team]++;
    this.addUlt(sh.by, 5);
  }

  puckSkaters() {
    const p = this.puck;
    if (p.z > 18) return false;
    const sp = p.speed;
    // A slow loose puck always goes to the closest stick in reach (no catch roll).
    if (sp < 260) {
      let best = null, bd = 1e9;
      for (const s of this.skaters) {
        if (s.stun > 0 || p.noPickup.has(s) || s.dashT > 0 || s.parked) continue;
        const st = s.stickPoint();
        const d = Math.min(Math.hypot(st.x - p.x, st.y - p.y), Math.hypot(s.x - p.x, s.y - p.y) - s.r + 8);
        if (d < 24 && d < bd) { bd = d; best = s; }
      }
      if (best) { this.takePossession(best, 'catch'); return true; }
      p.rolled.clear();
      return false;
    }
    for (const s of this.skaters) {
      if (s.stun > 0 || p.noPickup.has(s) || s.dashT > 0 || s.parked) { p.rolled.delete(s); continue; }
      // a pass sails past teammates it wasn't meant for
      if (p.pass && p.pass.from.team === s.team && p.pass.to !== s && p.pass.to && !p.pass.to.parked) { p.rolled.delete(s); continue; }
      // Fade: nobody picks off a pass to or from a shadow
      if (p.pass && p.pass.from.team !== s.team && (p.pass.from.fadeT > 0 || (p.pass.to && p.pass.to.fadeT > 0))) { p.rolled.delete(s); continue; }
      const st = s.stickPoint();
      const ds = Math.hypot(st.x - p.x, st.y - p.y);
      const db = Math.hypot(s.x - p.x, s.y - p.y);
      const intended = p.pass && p.pass.to === s;
      const reach = intended ? (s.controlled && this.assist === 'strong' ? 38 : 30) : 22;
      if (p.shot && p.shot.plow > 0 && p.shot.team !== s.team && db < s.r + PUCK_R + 10) {
        // Avalanche bulldozes through the blocker
        p.shot.plow--;
        const n = norm(s.x - p.x, s.y - p.y);
        const dir = norm(p.vx, p.vy);
        s.vx += (dir.x * 0.7 + n.x * 0.5) * 300; s.vy += (dir.y * 0.7 + n.y * 0.5) * 300;
        s.stun = Math.max(s.stun, 0.35); s.flash = 0.25;
        this.emit('plow', { s, x: p.x, y: p.y });
        continue;
      }
      if (ds < reach || db < s.r + PUCK_R) {
        if (p.rolled.has(s)) continue;
        p.rolled.add(s);
        let chance;
        if (intended) chance = sp < 1500 ? 1 : 0.6;
        else if (p.shot && p.shot.team === s.team) chance = sp < 300 ? 1 : 0; // let teammates' shots through
        else chance = sp < 260 ? 1 : sp < 600 ? 0.8 : sp < 1000 ? 0.45 : 0.2;
        // (a pass the player makes is caught like the player's own catches: an AI teammate's
        // fumble roll on it felt like the game dropping one pass in nine)
        if (!(intended && p.pass.from.controlled && this.humans.includes(p.pass.from.team))) chance *= this.ai[s.team].catchMul(s);
        if (this.rng() < chance) {
          this.takePossession(s, 'catch');
          return true;
        }
        // body block / deflection
        if (db < s.r + PUCK_R + 2 && sp > 300) {
          const n = norm(p.x - s.x, p.y - s.y);
          const vn = p.vx * n.x + p.vy * n.y;
          if (vn < 0) { p.vx -= 1.5 * vn * n.x; p.vy -= 1.5 * vn * n.y; }
          p.vx *= 0.55; p.vy *= 0.55;
          if (p.shot && p.shot.team !== s.team) {
            s.stats_.blocks++;
            this.addUlt(s, 6);
            if (p.shot.power === 'ice' || p.shot.special?.zero) { s.slowT = 1.2; s.slowMul = 0.5; this.emit('frozen', { s }); }
            if (p.shot.special?.ember && p.shot.by.hasPerk('Scorch')) { s.stun = Math.max(s.stun, 0.6); this.emit('scorched', { s }); }
            this.emit('block', { s });
            p.shot = null;
          }
          p.setTouch(s);
          p.pass = null;
        }
      } else p.rolled.delete(s);
    }
    // Absolute Zero: slow defenders the shot passes
    const sh = p.shot;
    const bolt = sh && sh.special && (sh.special.combo === 'frost+thunder' || sh.special.chill);
    if (sh && sh.special && sh.special.firestorm) {
      // Firestorm: knocks back anyone it passes
      for (const s of this.skaters) {
        if (s.team === sh.team || sh.frozen.has(s) || Math.hypot(s.x - p.x, s.y - p.y) > 60) continue;
        sh.frozen.add(s);
        const n = norm(-p.vy, p.vx), side = Math.sign((s.x - p.x) * n.x + (s.y - p.y) * n.y) || 1;
        s.vx += n.x * side * 240; s.vy += n.y * side * 240;
        s.stun = Math.max(s.stun, 0.3); s.flash = 0.25;
        this.emit('scorched', { s });
      }
    }
    if (sh && sh.special && (sh.special.zero || bolt)) {
      for (const s of this.skaters) {
        if (s.team === sh.team || sh.frozen.has(s)) continue;
        if (Math.hypot(s.x - p.x, s.y - p.y) < (bolt ? 58 : 70)) {
          sh.frozen.add(s);
          s.slowT = bolt ? 0.9 + sh.special.comboLevel * 0.35 : sh.by.hasPerk('Deep Freeze') ? 2.4 : 1.6;
          s.slowMul = 0.5;
          this.emit('frozen', { s });
        }
      }
    }
    return false;
  }

  goal(side, yc) {
    const p = this.puck;
    const team = side === 1 ? 0 : 1; // team attacking that net
    const sh = p.shot;
    if (this.mods.has('onetimers') && !this.drill && !(sh && sh.kind === 'onetimer' && sh.team === team)) {
      // challenge: only one-timers count
      this.emit('no_goal', { team, reason: 'One-timers only!' });
      this.state = 'goal'; this.stateT = 2.0; this.lastGoal = null; this.washedOut = true; // (the linesman waves it off)
      p.shot = null; p.pass = null; p.curve = null;
      return;
    }
    if (this.drill) {
      this.emit('drill_goal', { side, y: yc });
      this.drill.onGoal(this, { team, side, y: yc, kind: sh ? sh.kind : 'scramble', special: sh ? sh.special : null, power: sh ? sh.power : null, scorer: p.lastTouch });
      return;
    }
    if (sh && sh.team === team) this.shotOnGoal(sh);
    this.score[team]++;
    let scorer = p.lastTouch && p.lastTouch.team === team ? p.lastTouch : null;
    const assists = [];
    if (scorer) {
      for (const t of p.touches.slice(1)) {
        if (t.team !== team) break;
        if (t !== scorer && !assists.includes(t)) assists.push(t);
        if (assists.length >= 2) break;
      }
      scorer.stats_.goals++;
      this.addUlt(scorer, 15);
      if (sh && sh.power) scorer.stats_.powerGoals++;
      for (const a of assists) { a.stats_.assists++; this.addUlt(a, 8); this.chemStat(team, a, scorer).assists++; }
      if (sh && sh.special && sh.special.combo) this.chemStat(team, null, null, sh.special.comboPair).comboGoals++;
    }
    const info = {
      team, scorer, assists, kind: sh ? sh.kind : 'scramble', power: sh ? sh.power : null,
      special: sh ? sh.special : null, time: this.time, y: yc, side,
    };
    this.lastGoal = info;
    this.goalLog.push(info);
    if (this.score[team] >= this.winScore) this.winner = team;
    // a power-play goal ends the minor penalty
    const boxed = this.teamSkaters(1 - team).find((k) => k.boxT > 0);
    if (boxed) { info.powerPlay = true; this.penStats[team].ppGoals++; this.releaseFromBox(boxed, true); }
    this.state = 'goal';
    this.stateT = 0;
    p.shot = null; p.pass = null; p.curve = null; p.power = null;
    for (const s of this.skaters) {
      s.charging = false; s.ultWindup = 0;
      if (s.team === team) s.celebrate = 3;
    }
    this.emit('goal', info);
  }

  // -------------------------------------------------------- power pucks
  updatePickups(dt) {
    const p = this.puck;
    for (const k of this.pickups) k.t += dt;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      if (this.pickups[i].t > this.pickups[i].life) { this.emit('pickup_fade', { k: this.pickups[i] }); this.pickups.splice(i, 1); }
    }
    if (!this.powers.length) return;
    if (this.pickups.length === 0 && !p.power) {
      this.pickupT -= dt;
      if (this.pickupT <= 0) {
        this.pickupT = this.mods.has('iceage') ? this.rng.range(5, 8) : this.rng.range(11, 17);
        const spots = [...DOTS, { x: 0, y: -150 }, { x: 0, y: 160 }, { x: -330, y: 0 }, { x: 330, y: 0 }]
          .filter((d) => Math.hypot(d.x - p.x, d.y - p.y) > 170);
        const s = this.rng.pick(spots);
        const k = { x: s.x + this.rng.range(-20, 20), y: s.y + this.rng.range(-15, 15), type: this.rng.pick(this.powers), t: 0, life: 12 };
        this.pickups.push(k);
        this.emit('pickup_spawn', { k });
      }
    }
  }

  checkPickupTouch() {
    const p = this.puck;
    if (this.state !== 'play' || p.z > 20) return;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      if (k.t < 0.6) continue;
      if (Math.hypot(k.x - p.x, k.y - p.y) < 28) {
        this.pickups.splice(i, 1);
        p.power = k.type;
        p.powerT = 10;
        const by = p.owner && p.owner.isSkater ? p.owner : p.lastTouch;
        this.emit('power_get', { type: k.type, by, k });
      }
    }
  }

  // ------------------------------------------------------ arena twists
  laneAt(x, y) {
    for (const l of this.twists.lanes) {
      if (x > l.x0 && x < l.x1 && Math.abs(y - l.y) < l.h / 2) return l;
    }
    return null;
  }
  inCrack(x, y) {
    for (const c of this.twists.cracks) if (Math.hypot(x - c.x, (y - c.y) * 1.25) < c.r) return true;
    return false;
  }
  inPool(x, y) {
    for (const p of this.twists.pools) {
      const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
      if (dx * dx + dy * dy < 1) return p;
    }
    return null;
  }
  stripAt(x, y) {
    for (const st of this.twists.strips) if (x > st.x0 && x < st.x1 && Math.abs(y - st.y) < st.h / 2) return st;
    return null;
  }
  // Moonbeams: inside the pool of light.
  inBeam(x, y) {
    const b = this.twists.beam;
    if (!b) return false;
    const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
    return dx * dx + dy * dy < 1;
  }
  // Loose planks: the plank of the board the puck just hit (n: that board's outward normal).
  plankAt(x, y, n) {
    for (const pl of this.twists.planks) {
      const on = pl.side === 'far' ? n.ny < -0.97 : pl.side === 'near' ? n.ny > 0.97 : pl.side === 'left' ? n.nx < -0.97 : n.nx > 0.97;
      const along = pl.side === 'far' || pl.side === 'near' ? x : y;
      if (on && along > pl.a0 && along < pl.a1) return pl;
    }
    return null;
  }
  // A loose plank gives: the puck comes off at an odd angle, sometimes dead, sometimes lively.
  plankBounce(p, n, power, pl) {
    const sp = Math.hypot(p.vx, p.vy) * (0.7 + this.rng() * 0.45);
    const base = Math.atan2(p.vy, p.vx), dev = (0.35 + this.rng() * 0.45) * (this.rng() < 0.5 ? -1 : 1);
    const off = (a) => Math.cos(a) * n.nx + Math.sin(a) * n.ny < -0.25; // still coming off the boards
    const a = off(base + dev) ? base + dev : off(base - dev) ? base - dev : base;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    pl.rattle = 0.5;
    this.emit('plank', { x: p.x, y: p.y, power, pl });
  }
  inShadow(x, y) {
    for (const z of this.twists.shadows) {
      const dx = (x - z.x) / z.rx, dy = (y - z.y) / z.ry;
      if (dx * dx + dy * dy < 1) return z;
    }
    return null;
  }
  surfaceSpeed(s) {
    if (this.inCrack(s.x, s.y)) return 0.7;
    if (this.twists.pools.length && this.inPool(s.x, s.y)) return 0.78;
    return 1;
  }

  // Moving parts of the arena rules: drifting meltwater, shifting aurora lanes, spreading
  // pond cracks, circling raven shadows, pucks hopping on rumble strips, the sweeping
  // moonbeam and rattling planks.
  updateTwists(dt) {
    const tw = this.twists;
    tw.t += dt;
    if (tw.kind === 'meltwater') {
      for (const p of tw.pools) {
        const a = p.ph + tw.t * p.w;
        p.x = p.ax + Math.cos(a) * p.orbit;
        p.y = p.ay + Math.sin(a) * p.orbit * 0.55;
      }
      if (this.state === 'play') {
        for (const s of this.skaters) {
          const inside = !!this.inPool(s.x, s.y);
          s.splashCd = Math.max(0, (s.splashCd || 0) - dt);
          if (inside && !s.inPool && s.speed > 230 && !s.splashCd) { this.emit('splash', { x: s.x, y: s.y, power: s.speed, s }); s.splashCd = 4; }
          s.inPool = inside;
        }
      }
    } else if (tw.kind === 'aurora_lanes') {
      tw.phaseT += dt;
      // the next lanes show up a moment before the lights shift
      if (!tw.next && tw.phaseT > tw.period - 2.5) tw.next = auroraRows(this.rng);
      if (tw.phaseT >= tw.period) {
        tw.lanes = tw.next || auroraRows(this.rng);
        tw.next = null;
        tw.phaseT = 0;
        this.emit('aurora_shift', {});
      }
    } else if (tw.kind === 'pond_cracks' && this.state === 'play') {
      for (const c of tw.cracks) c.r = Math.min(CRACK_MAX, c.r + dt * 0.3); // cracks creep outward
    } else if (tw.kind === 'shadow_zones') {
      for (const z of tw.shadows) {
        const a = z.ph + tw.t * z.w;
        z.x = z.ax + Math.cos(a) * z.orbit;
        z.y = z.ay + Math.sin(a) * z.orbit * 0.6;
      }
    } else if (tw.kind === 'moonbeams') {
      const b = tw.beam;
      b.x = Math.sin(b.ph + (tw.t * Math.PI * 2) / b.period) * b.reach;
      b.y = Math.sin(b.dph + (tw.t * Math.PI * 2) / b.dperiod) * b.drift;
    } else if (tw.kind === 'loose_planks') {
      for (const pl of tw.planks) pl.rattle = Math.max(0, pl.rattle - dt);
    } else if (tw.kind === 'rumble_strips' && this.state === 'play') {
      // carry the puck fast over the ridges and now and then it hops off the stick
      const s = this.puck.owner;
      if (s && s.isSkater) {
        s.hopCd = Math.max(0, (s.hopCd || 0) - dt);
        if (!s.hopCd && s.speed > 150 && this.stripAt(s.x, s.y)) {
          s.hopCd = 0.3;
          if (this.rng() < 0.4) this.puckHop(s);
        }
      }
    }
  }

  puckHop(s) {
    const p = this.puck;
    this.loosePuck(s);
    p.vx = s.vx * 1.15 + (this.rng() - 0.5) * 140;
    p.vy = s.vy * 0.8 + (this.rng() - 0.5) * 140;
    p.vz = 160;
    p.noPickup.set(s, 0.45);
    s.hopCd = 1.2;
    this.emit('puck_hop', { x: p.x, y: p.y, s });
  }

  crackAt(x, y, k = 1) {
    const tw = this.twists;
    if (Math.hypot(Math.abs(x) - GOAL_X, y) < 120 || insideDepth(x, y) < 40) return; // creases and boards hold
    const near = tw.cracks.find((c) => Math.hypot(x - c.x, (y - c.y) * 1.25) < c.r + 24);
    if (near) near.r = Math.min(CRACK_MAX, near.r + 7 * k);
    else if (tw.cracks.length < 6) tw.cracks.push({ x, y, r: 24 + 10 * k, born: tw.t });
    else return;
    this.emit('ice_crack', { x, y, grow: !!near, k });
  }

  // -------------------------------------------------------- ability bits
  addTrail(s) {
    this.trails.push({ x: s.x, y: s.y, t: 0, life: s.hasPerk('Long Glide') ? 5.5 : 4, team: s.team, owner: s, ang: Math.atan2(s.vy, s.vx) });
    if (this.trails.length > 120) this.trails.shift();
  }

  updateTrails(dt) {
    for (const tr of this.trails) tr.t += dt;
    while (this.trails.length && this.trails[0].t > this.trails[0].life) this.trails.shift();
    if (!this.trails.length) return;
    for (const s of this.skaters) {
      for (const tr of this.trails) {
        if (Math.abs(tr.x - s.x) > 26 || Math.abs(tr.y - s.y) > 26) continue;
        if (tr.team === s.team) { s.boostT = Math.max(s.boostT, 0.3); break; }
        if (tr.owner.hasPerk('Cold Snap')) { s.slowT = Math.max(s.slowT, 0.3); s.slowMul = 0.75; break; }
      }
    }
  }

  // Gale's Cyclone: follows its owner; opponents inside are blown outward (and a carrier may
  // fumble once), and a loose puck inside is pulled to the owner's stick.
  updateCyclones(dt) {
    for (const c of this.cyclones) {
      c.t += dt;
      const o = c.owner;
      if (o.parked) c.t = c.life;
      c.x = o.x; c.y = o.y;
      const fade = Math.min(1, (c.life - c.t) / 0.4);
      for (const s of this.skaters) {
        if (s.team === c.team || s.parked) continue;
        const d = Math.hypot(s.x - c.x, s.y - c.y);
        if (d > c.r || d < 1) continue;
        const n = norm(s.x - c.x, s.y - c.y), k = (1 - d / c.r) * fade;
        s.vx += (n.x * 900 - n.y * 300) * k * dt; s.vy += (n.y * 900 + n.x * 300) * k * dt; // out and around
        if (this.puck.owner === s && !c.fumbled.has(s) && d < c.r * 0.75) {
          c.fumbled.add(s);
          if (this.rng() < 0.5) { this.loosePuck(s); this.puck.noPickup.set(s, 0.5); this.emit('fumble', { s }); }
        }
      }
      const p = this.puck;
      if (!p.owner && !p.inNet && p.z < 20) {
        const d = Math.hypot(p.x - o.x, p.y - o.y);
        if (d < c.r && d > 12) { const n = norm(o.x - p.x, o.y - p.y); p.vx += n.x * 700 * fade * dt; p.vy += n.y * 700 * fade * dt; }
      }
    }
    this.cyclones = this.cyclones.filter((c) => c.t < c.life);
  }

  updateBarriers(dt) {
    for (const b of this.barriers) {
      b.t += dt;
      if (b.breaking > 0) { b.breaking -= dt; if (b.breaking <= 0) b.alive = false; }
      else if (b.t > b.life) { b.breaking = 0.6; this.emit('barrier_fade', { b }); }
    }
    this.barriers = this.barriers.filter((b) => b.alive);
  }

  collideBarriers(e, rad, bounce) {
    for (const b of this.barriers) collideBarrier(e, rad, b, bounce);
  }

  // ------------------------------------------------------------ penalties
  // Decide whether the ref calls this hit. Hits on the puck carrier are clean unless
  // they're brutal; hitting someone away from the puck is interference.
  judgeHit(a, b, power, hadPuck, puckDist) {
    if (!this.penaltiesOn || this.state !== 'play' || this.pendingPenalty) return;
    if (this.teamSkaters(a.team).some((k) => k.boxT > 0)) return; // one in the box at a time
    let reason = null;
    // taken down from behind on a breakaway (nobody else back, in the attacking half, going
    // in): a penalty shot instead of the power play
    if (hadPuck && b.speed > 120 && b.x * b.side > 0 && Math.cos(Math.atan2(a.y - b.y, a.x - b.x) - Math.atan2(b.vy, b.vx)) < -0.3
      && !this.skaters.some((o) => o.team === a.team && o !== a && !o.parked && (o.x - b.x) * b.side > 0) && this.rng() < 0.3) {
      this.pendingPenalty = { s: a, reason: 'Hooking', shot: b };
      return;
    }
    const looseNear = !this.puck.owner && puckDist < 80;
    if (!hadPuck && !looseNear && puckDist > 110) { if (this.rng() < 0.3) reason = 'Interference'; }
    else if (power > 330 && this.rng() < 0.12) reason = 'Charging';
    else if (insideDepth(b.x, b.y) < 34 && power > 260 && this.rng() < 0.1) reason = 'Boarding';
    if (reason) this.pendingPenalty = { s: a, reason };
  }

  // A penalty shot: the fouled skater alone from centre ice against the goalie, everyone else
  // along the benches. Taken in ordinary play, so goals, saves and replays all work as ever.
  setupPenaltyShot() {
    const s = this.penaltyShotFor;
    this.penaltyShotFor = null;
    if (!s || s.parked) { this.setupFaceoff(); return; }
    const benched = [];
    let n = [0, 0];
    for (const o of this.skaters) {
      if (o === s || o.parked) continue;
      benched.push(o);
      o.parked = true; o.controlled = false;
      o.x = (o.team === 0 ? -1 : 1) * (150 + n[o.team]++ * 45); o.y = RINK.minY + 16; o.vx = o.vy = 0; o.face = Math.PI / 2;
      o.stun = 0; o.charging = false; o.ultWindup = 0; o.dashT = 0; o.state = 'skate'; o.in = Skater.blankInput();
    }
    for (const g of this.goalies) { g.x = g.goalSide * (GOAL_X - 28); g.y = 0; g.setState('ready'); g.react = null; g.track = null; g.holdT = 0; }
    const p = this.puck;
    Object.assign(s, { x: -s.side * 30, y: 0, vx: 0, vy: 0, face: s.side > 0 ? 0 : Math.PI, stun: 0, charging: false, ultWindup: 0, dashT: 0, state: 'skate' });
    p.x = s.x + s.side * 20; p.y = 0; p.z = 0; p.vx = p.vy = p.vz = 0;
    p.shot = null; p.pass = null; p.curve = null; p.trail.length = 0; p.inNet = null; p.power = null; p.powerT = 0;
    p.noPickup.clear(); p.rolled.clear();
    this.barriers.length = 0; this.cyclones.length = 0; this.trails.length = 0;
    if (this.humans.includes(s.team)) for (const o of this.teamSkaters(s.team)) o.controlled = o === s;
    this.takePossession(s, 'faceoff');
    this.pshot = { s, t: 0, gone: 0, benched };
    this.stall = null;
    this.state = 'play'; this.stateT = 0;
    this.emit('penalty_shot', { s });
  }

  // While it's on: over when the shot is saved, missed or stopped (or carried back out), a goal
  // ends it the usual way.
  updatePenaltyShot(dt) {
    const ps = this.pshot, p = this.puck, s = ps.s;
    ps.t += dt;
    if (p.owner !== s) ps.gone += dt;
    const back = p.x * s.side < -60; // (taken back past centre)
    const dead = ps.gone > 0 && (ps.gone > 1.8 || (p.owner && p.owner.isGoalie) || (!p.owner && Math.hypot(p.vx, p.vy) < 40 && ps.gone > 0.4));
    if (!(dead || back || ps.t > 10)) return false;
    this.emit('penalty_shot_over', { s, scored: false });
    this.setupFaceoff();
    return true;
  }

  endPenaltyShot() {
    if (!this.pshot) return;
    for (const o of this.pshot.benched) o.parked = false;
    this.pshot = null;
  }

  // The painted dot on that side of centre (side -1 or 1) nearest a height on the ice.
  nearestDot(side, y) {
    return DOTS.filter((d) => Math.sign(d.x) === side).sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
  }

  // The referee: a puck nobody can get to (wedged behind a net, pinned on the boards), or an
  // AI carrier boxed in with it, gets whistled dead after a few seconds and faced off at the
  // nearest dot. (A player holding the puck still is left alone.)
  updateStall(dt) {
    const p = this.puck, o = p.owner;
    if ((o && (o.isGoalie || (o.controlled && this.humans.includes(o.team)))) || p.inNet) { this.stall = null; return false; }
    if (!this.stall || Math.hypot(p.x - this.stall.x, p.y - this.stall.y) > 40) { this.stall = { x: p.x, y: p.y, t: 0 }; return false; }
    if ((this.stall.t += dt) < STALL_SECONDS) return false;
    const d = this.nearestDot(p.x < 0 ? -1 : 1, p.y);
    if (o) this.loosePuck(o);
    this.emit('stall', { x: p.x, y: p.y });
    this.setupFaceoff(d.x, d.y);
    return true;
  }

  whistlePenalty() {
    const { s, reason, shot } = this.pendingPenalty;
    this.pendingPenalty = null;
    if (shot) { // a penalty shot: nobody to the box; the linesman signals, then it's taken
      if (this.puck.owner) this.loosePuck(this.puck.owner);
      this.penaltyShotFor = shot;
      this.state = 'penalty'; this.stateT = 0; this.penaltyReason = reason;
      this.emit('penalty', { s, reason, team: s.team, shot: true, shooter: shot });
      return;
    }
    if (s.controlled) this.switchControl(null, s.team);
    s.parked = true; s.boxT = PENALTY_SECONDS; s.boxReason = reason;
    s.controlled = false; s.charging = false; s.ultWindup = 0; s.dashT = 0; s.stun = 0;
    s.x = s.team === 0 ? -70 : 70; s.y = RINK.minY + 16; s.vx = 0; s.vy = 0; s.face = Math.PI / 2;
    if (this.puck.owner === s) this.loosePuck(s);
    this.penStats[s.team].pims++;
    this.state = 'penalty'; this.stateT = 0; this.penaltyReason = reason; // (the linesman's signal)
    this.penaltyDot = this.nearestDot(s.team === 0 ? -1 : 1, this.puck.y); // faceoff on the offender's side of centre
    this.emit('penalty', { s, reason, team: s.team });
  }

  updateBox(dt) {
    if (this.pshot) return; // (the clock in the box stops for a penalty shot)
    for (const s of this.skaters) {
      if (!(s.boxT > 0)) continue;
      s.boxT -= dt;
      if (s.boxT <= 0) { this.penStats[s.team].kills++; this.releaseFromBox(s, false); }
    }
  }

  releaseFromBox(s, byGoal) {
    s.boxT = 0; s.parked = false;
    s.y = RINK.minY + 40; s.vy = 220; s.vx = s.side * 120;
    this.emit('penalty_over', { s, byGoal });
  }

  powerPlay(team) { // +1 if this team has the extra skater
    const a = this.teamSkaters(team).some((k) => k.boxT > 0), b = this.teamSkaters(1 - team).some((k) => k.boxT > 0);
    return a === b ? 0 : b ? 1 : -1;
  }

  // ------------------------------------------------------------ pulled goalie
  canPullGoalie(team) {
    if (this.drill || this.state !== 'play' || this.extra[team] || this.pshot) return false;
    if (this.goalieMode && team === 0) return false; // you're the one in goal
    const us = this.score[team], them = this.score[1 - team];
    return us < them && them >= this.winScore - 1 && this.winScore > 1 && !!this.extraCfg[team];
  }

  togglePull(team) {
    if (this.extra[team]) this.returnGoalie(team);
    else if (this.canPullGoalie(team)) this.pullGoalie(team);
  }

  pullGoalie(team) {
    const g = this.goalies.find((k) => k.team === team);
    if (this.puck.owner === g) return;
    g.leaving = true; g.leaveX = g.x; g.leaveY = g.y;
    g.disabled = true; g.x = g.goalSide * 900; g.y = 900;
    const c = this.extraCfg[team];
    const x = new Skater(this, team, c.def, c.stats, 3, { name: c.name, perks: [], sprite: c.sprite, look: c.look, parts: c.parts, hand: c.hand, gear: c.gear, who: 'extra' });
    x.extraAttacker = true;
    x.x = team === 0 ? -20 : 20; x.y = RINK.minY + 30; x.vy = 260; x.vx = (team === 0 ? 1 : -1) * 120;
    x.face = Math.PI / 2;
    this.skaters.push(x);
    this.extra[team] = x;
    this.emit('goalie_pulled', { team, s: x });
  }

  returnGoalie(team, silent = false) {
    const x = this.extra[team];
    if (!x) return;
    if (this.puck.owner === x) this.loosePuck(x);
    if (x.controlled) { this.switchControl(null, team); x.controlled = false; }
    this.skaters.splice(this.skaters.indexOf(x), 1);
    this.extra[team] = null;
    const g = this.goalies.find((k) => k.team === team);
    g.disabled = false; g.leaving = false; g.react = null; g.track = null;
    if (silent) { g.x = g.goalSide * (GOAL_X - 28); g.y = 0; g.setState('ready'); return; }
    // mid-play: skate back from the bench gate, leaving the net open for a moment
    g.x = team === 0 ? -20 : 20; g.y = RINK.minY + 24;
    g.setState('skate_in');
    this.emit('goalie_returned', { team });
  }

  // AI coaches pull their goalie when they're running out of time.
  aiGoaliePull(dt) {
    for (const t of [0, 1]) {
      if (this.humans.includes(t) || this.extra[t] || !this.canPullGoalie(t)) continue;
      const p = this.puck;
      const attacking = p.owner && p.owner.team === t && (p.x * (t === 0 ? 1 : -1)) > 0;
      if (attacking && this.score[1 - t] - this.score[t] <= 2 && this.rng() < 0.25 * dt) this.pullGoalie(t);
    }
  }

  // ------------------------------------------------------------ game plans
  // +1 when this team's plan beats the opponent's, -1 when it's beaten.
  planEdge(team) {
    const mine = GAME_PLANS[this.plans[team]], theirs = this.plans[1 - team];
    if (mine && mine.beats === theirs) return 1;
    const t = GAME_PLANS[theirs];
    if (t && t.beats === this.plans[team]) return -1;
    return 0;
  }
  planShotMul(team) {
    return (this.plans[team] === 'rungun' ? 1.02 : 1) * (this.planEdge(team) > 0 ? 1.07 : 1);
  }
  planGoalieMul(team) {
    const p = this.plans[team];
    // the goalie whose team got out-planned faces better looks
    return (p === 'trap' ? 1.08 : p === 'rungun' ? 0.98 : 1) * (this.planEdge(team) < 0 ? 0.95 : 1);
  }

  // ------------------------------------------------------------ chemistry
  chemLevel(a, b) {
    if (!a || !b || !a.isSkater || !b.isSkater || a.team !== b.team) return 0;
    return this.chem[a.team][pairKey(a.who, b.who)] || 0;
  }

  // Bonds are between people (a.who), combos between kits (def.id).
  chemStat(team, a, b, key) {
    const k = key || pairKey(a.who, b.who);
    return (this.chemStats[team][k] ||= { passes: 0, assists: 0, comboGoals: 0 });
  }

  // Thunderquake shockwave around the shooter.
  quake(s, level) {
    const radius = 72 + (level - 1) * 16;
    for (const o of this.opponents(s)) {
      const d = Math.hypot(o.x - s.x, o.y - s.y);
      if (d > radius || o.dashT > 0) continue;
      const n = norm(o.x - s.x, o.y - s.y);
      const k = o.bedrockT > 0 ? 0.2 : 1;
      o.vx += n.x * 280 * k; o.vy += n.y * 280 * k;
      o.stun = Math.max(o.stun, 0.28 * k);
      o.flash = 0.25;
    }
    this.emit('quake', { s, radius });
  }

  // --------------------------------------------------------- summaries
  summary() {
    return {
      goalieMode: this.goalieMode,
      pen: this.penStats,
      mods: [...this.mods],
      chem: this.chemStats[0],
      score: [...this.score],
      winner: this.winner,
      goals: this.goalLog,
      shots: [...this.shotsOnGoal],
      skaters: this.skaters.filter((s) => !s.extraAttacker).map((s) => ({ id: s.who, kit: s.def.id, team: s.team, name: s.name, ...s.stats_ })),
      saves: this.goalies.map((g) => g.saves),
      goalie: this.goalies[0].who || 'halla', // who was in our net
      goalieNames: this.goalies.map((g) => g.name || ''),
      goalieWho: this.goalies.map((g) => g.who || null),
      time: this.time,
    };
  }
}
