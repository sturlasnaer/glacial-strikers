// Play-by-play commentary: short broadcast call-outs generated from match events.

import { POWER_INFO, TEAMS, COMBOS, CLUB } from './data.js';
import { GOAL_X } from './rink.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Commentary {
  constructor(onLine) {
    this.onLine = onLine; // (text, priority) => void
    this.cool = 0;
    this.queue = [];
  }

  attach(m, awayTeamId) {
    this.m = m;
    this.away = TEAMS[awayTeamId];
    this.cool = 2;
    this.queue.length = 0;
    this.lastBreak = null;
    const team = (t) => (t === 0 ? CLUB.nick : this.away.name.split(' ').slice(-1)[0]);
    const n = (s) => s.name;

    m.on('goal', (g) => {
      const s = g.scorer;
      let line;
      if (!s) line = `Own goal! ${team(g.team)} will take it.`;
      else if (g.kind === 'onetimer') line = pick([`ONE-TIMER! ${n(s)} buries it!`, `${n(s)} one-times it home!`]);
      else if (g.kind === 'zero') line = `${n(s)} freezes the whole defense! GOAL!`;
      else if (g.kind === 'thunderclap') line = `THUNDERCLAP! ${n(s)} lights the lamp!`;
      else if (g.powerPlay) line = `Power-play goal! ${n(s)} makes them pay.`;
      else if (m.goalies.find((k) => k.goalSide === g.side).disabled) line = `${n(s)} into the empty net!`;
      else if (g.special && g.special.combo) line = `${COMBOS[g.special.combo].name} goal! ${n(s)} finishes the combo!`;
      else if (g.power) line = `${n(s)} scores with the ${POWER_INFO[g.power].name}!`;
      else if (g.assists.length) line = pick([`${n(s)} scores! Lovely feed from ${n(g.assists[0])}.`, `${n(g.assists[0])} to ${n(s)}... SCORES!`]);
      else line = pick([`${n(s)} SCORES!`, `${n(s)} finds the back of the net!`, `What a finish from ${n(s)}!`]);
      this.say(line, 3, true);
      const [a, b] = m.score;
      setTimeout(() => {
        if (this.m !== m) return;
        if (a === 4 && b === 4) this.say('Four apiece. Next goal wins it!', 2);
        else if (a === 4 || b === 4) { if (a < 5 && b < 5) this.say(`${team(a === 4 ? 0 : 1)} one goal from victory!`, 2); }
        else if (a === b) this.say(`All tied up at ${a}!`, 2);
      }, 2600);
    });
    m.on('save', (e) => {
      if (e.speed > 900 || e.caught === false && e.speed > 700) this.say(pick([`${e.g.name} says no!`, `Huge stop by ${e.g.name}!`, `${e.g.name} with the glove!`]), 1);
    });
    m.on('goalie_dive', (e) => this.say(`${e.g.name} sprawls across!`, 1));
    m.on('hit', (e) => {
      if (e.power > 250) this.say(pick([`${n(e.a)} lays out ${n(e.b)}!`, `BOOM! ${n(e.a)} with the hit!`, `${n(e.b)} won't forget that one.`]), 1);
    });
    m.on('post', () => this.say(pick(['Off the iron!', 'PING! Off the post!', 'Inches away!']), 2));
    m.on('steal', (e) => this.say(pick([`${n(e.s)} picks the pocket!`, `Takeaway by ${n(e.s)}!`]), 0));
    m.on('block', (e) => this.say(`${n(e.s)} blocks it with the body!`, 1));
    m.on('power_get', (e) => { if (e.by) this.say(`${n(e.by)} grabs the ${POWER_INFO[e.type].name}!`, 1); });
    m.on('ult', (e) => this.say(`${n(e.s)} unleashes ${e.s.def.ult.name}!`, 2));
    m.on('barrier_block', () => this.say('The wall holds!', 1));
    m.on('faceoff_win', (e) => { if (Math.random() < 0.35) this.say(`${n(e.s)} wins the draw.`, 0); });
    m.on('lightning_pass', (e) => this.say(`Lightning pass to ${n(e.to)}!`, 1));
    m.on('combo', (e) => this.say(pick([`${n(e.from)} to ${n(e.s)}... ${COMBOS[e.key].name.toUpperCase()}!`, `${COMBOS[e.key].name}! ${n(e.from)} and ${n(e.s)} in sync!`]), 2));
    m.on('chain', (e) => { if (e.n === 3) this.say(pick(['Tic-tac-toe!', 'Beautiful passing!', 'They\'re moving it around!']), 1); else if (e.n >= 5) this.say(`${e.n} passes in a row!`, 1); });
    m.on('penalty', (e) => this.say(`${n(e.s)} heads to the box for ${e.reason.toLowerCase()}. ${team(1 - e.team)} on the power play!`, 3, true));
    m.on('goalie_pulled', (e) => this.say(`${team(e.team)} pull their goalie for the extra attacker!`, 3));
    m.on('plow', (e) => this.say(`${n(e.s)} gets bowled over!`, 1));
  }

  say(text, priority = 0, force = false) {
    if (force) { this.queue.length = 0; this.cool = 0; }
    if (this.cool > 0 && !force) {
      if (priority >= 2) this.queue = [{ text, priority }];
      return;
    }
    this.onLine(text, priority);
    this.cool = force ? 3.2 : 2.2;
  }

  update(dt) {
    const m = this.m;
    if (!m) return;
    this.cool -= dt;
    if (this.cool <= 0 && this.queue.length) { const q = this.queue.shift(); this.say(q.text, q.priority); }
    // breakaway: carrier past every defender, heading in alone
    const c = m.puck.owner;
    if (m.state === 'play' && c && c.isSkater) {
      const dx = (c.side * GOAL_X - c.x) * c.side;
      if (dx < 520 && dx > 60) {
        const alone = m.opponents(c).every((o) => (o.x - c.x) * c.side < -30);
        if (alone && this.lastBreak !== c) { this.lastBreak = c; this.say(pick([`${c.name} is in alone!`, `Breakaway, ${c.name}!`]), 2); }
      }
    } else if (!c) this.lastBreak = this.lastBreak && m.puck.speed > 50 ? this.lastBreak : null;
  }
}
