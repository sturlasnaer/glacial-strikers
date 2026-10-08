// Signature abilities (cooldowns) and ultimates (meter).

import { norm, clamp } from './util.js';
import { Barrier } from './entities.js';
import { clampInside } from './rink.js';

export class Abilities {
  constructor(match) { this.m = match; }

  useSkill(s) {
    const m = this.m;
    const sk = s.def.skill;
    let cd = sk.cd;
    switch (sk.id) {
      case 'glide':
        s.trailT = 3 + (s.hasPerk('Long Glide') ? 1.5 : 0);
        s.trailDist = 99;
        break;
      case 'dash': {
        let d = norm(s.in.mx, s.in.my);
        if (d.l < 0.2) d = { x: Math.cos(s.face), y: Math.sin(s.face) };
        s.dashDir = { x: d.x, y: d.y };
        s.dashT = 0.16 * (s.hasPerk('Afterimage') ? 1.25 : 1);
        s.charging = false;
        if (s.hasPerk('Static')) cd -= 2;
        break;
      }
      case 'bedrock':
        s.bedrockT = 4 + (s.hasPerk('Landslide') ? 2 : 0);
        break;
      case 'heat': // Ember: the next shot is ignited
        s.igniteT = 4;
        if (s.hasPerk('Kindling')) cd -= 3;
        break;
      case 'tailwind': { // Gale: a gust for you and the teammates near you
        const dur = 2 + (s.hasPerk('Jet Stream') ? 1 : 0);
        for (const o of m.teamSkaters(s.team)) {
          if (o !== s && Math.hypot(o.x - s.x, o.y - s.y) > 180) continue;
          o.boostT = Math.max(o.boostT, dur);
          o.gustT = Math.max(o.gustT, dur);
          if (s.hasPerk('Updraft')) o.stamina = Math.min(o.d.staminaMax, o.stamina + 15);
        }
        break;
      }
      case 'fade': // Shadow: checks miss you, passes to and from you can't be picked off
        s.fadeT = 3 + (s.hasPerk('Nightfall') ? 1.5 : 0);
        if (s.hasPerk('Ambush')) s.ambush = true;
        break;
      default: return;
    }
    s.skillCd = cd;
    s.stats_.skills++;
    m.emit('skill', { s, id: sk.id });
  }

  canUlt(s) {
    if (s.ult < 100) return false;
    if (s.def.ult.needsPuck && !s.hasPuck) return false;
    return true;
  }

  useUlt(s) {
    const m = this.m;
    const u = s.def.ult;
    if (!this.canUlt(s)) { m.emit('ult_denied', { s }); return; }
    s.ult = 0;
    s.stats_.ults++;
    switch (u.id) {
      case 'zero':
        m.emit('ult', { s, id: u.id });
        m.shoot(s, { kind: 'zero' });
        break;
      case 'thunderclap': {
        s.ultWindup = s.hasPerk('Overcharge') ? 0.42 : 0.6;
        s.charging = false;
        // the goalie sees it coming: squares up to the centre
        const g = m.goalieAt(s.side);
        g.alert = s.ultWindup + 0.3;
        m.emit('ult', { s, id: u.id });
        m.emit('ult_windup', { s, t: s.ultWindup });
        break;
      }
      case 'firestorm':
      case 'eclipse':
        m.emit('ult', { s, id: u.id });
        m.shoot(s, { kind: u.id });
        break;
      case 'cyclone': { // a whirlwind that follows you: opponents blown out, the loose puck pulled in
        m.cyclones.push({ owner: s, team: s.team, x: s.x, y: s.y, t: 0, life: 2.5 + (s.hasPerk('Eye of the Storm') ? 1 : 0), r: 130, fumbled: new Set() });
        m.emit('ult', { s, id: u.id });
        break;
      }
      case 'monolith': {
        const c = Math.cos(s.face), sn = Math.sin(s.face);
        const pos = clampInside(s.x + c * 80, s.y + sn * 70, 40);
        const life = s.hasPerk('Fortress') ? 12 : 6;
        const b = new Barrier(pos.x, pos.y, s.face + Math.PI / 2, s.team, life);
        m.barriers.push(b);
        // shove anyone standing where it rises
        for (const o of m.skaters) {
          const d = Math.hypot(o.x - b.x, o.y - b.y);
          if (d < 50) { const n = norm(o.x - b.x, o.y - b.y); o.vx += n.x * 260; o.vy += n.y * 260; }
        }
        m.emit('ult', { s, id: u.id });
        m.emit('barrier', { b, s });
        break;
      }
    }
  }

  releaseThunderclap(s) {
    this.m.shoot(s, { kind: 'thunderclap' });
  }
}

export { clamp };
