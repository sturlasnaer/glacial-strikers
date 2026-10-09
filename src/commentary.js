// Play-by-play commentary: short broadcast call-outs generated from match events.

import { POWER_INFO, TEAMS, COMBOS, CLUB, teamInfo } from './data.js';
import { GOAL_X } from './rink.js';
import { t } from './i18n.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Commentary {
  constructor(onLine) {
    this.onLine = onLine; // (text, priority) => void
    this.cool = 0;
    this.queue = [];
  }

  attach(m, awayTeamId) {
    this.m = m;
    this.away = teamInfo(awayTeamId);
    this.cool = 2;
    this.queue.length = 0;
    this.lastBreak = null;
    this.glareT = undefined; this.plankT = undefined;
    const team = (t) => (t === 0 ? CLUB.nick : this.away.nick || this.away.name.split(' ').slice(-1)[0]);
    const n = (s) => s.name;

    m.on('goal', (g) => {
      const s = g.scorer;
      let line;
      if (!s) line = t('Own goal! {team} will take it.', { team: team(g.team) });
      else if (this.glareT !== undefined && m.time - this.glareT < 1.5) line = t('Out of the moonlight! {name} scores!', { name: n(s) });
      else if (this.plankT !== undefined && m.time - this.plankT < 2.5) line = t('Off the loose boards and in! {name} will take it!', { name: n(s) });
      else if (g.kind === 'onetimer') line = pick([t('ONE-TIMER! {name} buries it!', { name: n(s) }), t('{name} one-times it home!', { name: n(s) })]);
      else if (g.kind === 'zero') line = t('{name} freezes the whole defense! GOAL!', { name: n(s) });
      else if (g.kind === 'thunderclap') line = t('THUNDERCLAP! {name} lights the lamp!', { name: n(s) });
      else if (g.powerPlay) line = t('Power-play goal! {name} makes them pay.', { name: n(s) });
      else if (m.goalies.find((k) => k.goalSide === g.side).disabled) line = t('{name} into the empty net!', { name: n(s) });
      else if (g.special && g.special.combo) line = t('{combo} goal! {name} finishes the combo!', { combo: t(COMBOS[g.special.combo].name), name: n(s) });
      else if (g.power) line = t('{name} scores with the {power}!', { name: n(s), power: t(POWER_INFO[g.power].name) });
      else if (g.assists.length) line = pick([t('{name} scores! Lovely feed from {from}.', { name: n(s), from: n(g.assists[0]) }), t('{from} to {name}... SCORES!', { from: n(g.assists[0]), name: n(s) })]);
      else line = pick([t('{name} SCORES!', { name: n(s) }), t('{name} finds the back of the net!', { name: n(s) }), t('What a finish from {name}!', { name: n(s) })]);
      this.say(line, 3, true);
      const [a, b] = m.score;
      setTimeout(() => {
        if (this.m !== m) return;
        if (a === 4 && b === 4) this.say(t('Four apiece. Next goal wins it!'), 2);
        else if (a === 4 || b === 4) { if (a < 5 && b < 5) this.say(t('{team} one goal from victory!', { team: team(a === 4 ? 0 : 1) }), 2); }
        else if (a === b) this.say(t('All tied up at {n}!', { n: a }), 2);
      }, 2600);
    });
    m.on('save', (e) => {
      if (e.speed > 900 || e.caught === false && e.speed > 700) this.say(pick([t('{name} says no!', { name: e.g.name }), t('Huge stop by {name}!', { name: e.g.name }), t('{name} with the glove!', { name: e.g.name })]), 1);
    });
    m.on('goalie_dive', (e) => this.say(t('{name} sprawls across!', { name: e.g.name }), 1));
    m.on('goalie_plays', (e) => this.say(pick([t('{name} comes out to play it.', { name: e.g.name }), t('{name} stops it behind the net.', { name: e.g.name }), t('Out goes {name} to handle the puck.', { name: e.g.name })]), 1));
    m.on('dump', (e) => { if (Math.random() < 0.4) this.say(t('{name} dumps it in.', { name: n(e.s) }), 0); });
    m.on('hit', (e) => {
      if (e.power > 250) this.say(pick([t('{hitter} lays out {target}!', { hitter: n(e.a), target: n(e.b) }), t('BOOM! {name} with the hit!', { name: n(e.a) }), t('{name} won\'t forget that one.', { name: n(e.b) })]), 1);
    });
    m.on('post', () => this.say(pick([t('Off the iron!'), t('PING! Off the post!'), t('Inches away!')]), 2));
    m.on('steal', (e) => this.say(pick([t('{name} picks the pocket!', { name: n(e.s) }), t('Takeaway by {name}!', { name: n(e.s) })]), 0));
    m.on('block', (e) => this.say(t('{name} blocks it with the body!', { name: n(e.s) }), 1));
    m.on('power_get', (e) => { if (e.by) this.say(t('{name} grabs the {power}!', { name: n(e.by), power: t(POWER_INFO[e.type].name) }), 1); });
    m.on('ult', (e) => this.say(t('{name} unleashes {ult}!', { name: n(e.s), ult: t(e.s.def.ult.name) }), 2));
    m.on('barrier_block', () => this.say(t('The wall holds!'), 1));
    // the expansion buildings and the puck on the stick
    m.on('glare', (e) => { this.glareT = m.time; this.say(pick([t('{name} loses it in the moonlight!', { name: e.g.name }), t('Out of the moonbeam! {name} squints.', { name: e.g.name })]), 1); });
    m.on('plank', () => { this.plankT = m.time; if (Math.random() < 0.45) this.say(pick([t('Off the loose boards! Who knows where that\'s going.'), t('The Longhouse boards take a bite out of that one!')]), 0); });
    m.on('deke', (e) => { if (!e.by.isGoalie && Math.random() < 0.5) this.say(pick([t('{name} dekes {by}!', { name: n(e.s), by: n(e.by) }), t('{name} walks right around {by}!', { name: n(e.s), by: n(e.by) })]), 1); });
    m.on('deke_goalie', (e) => this.say(pick([t('{name} sells the deke... {goalie} bites!', { name: n(e.s), goalie: e.g.name }), t('What a move! {goalie} is way out of position!', { goalie: e.g.name })]), 2));
    m.on('shield', (e) => { if (Math.random() < 0.3) this.say(pick([t('{name} shields it from {by}.', { name: n(e.s), by: n(e.by) }), t('{name} keeps it away from {by}.', { name: n(e.s), by: n(e.by) })]), 0); });
    m.on('faceoff_win', (e) => { if (e.clean) this.say(t('{name} wins it clean off the drop!', { name: n(e.s) }), 1); else if (Math.random() < 0.35) this.say(t('{name} wins the draw.', { name: n(e.s) }), 0); });
    m.on('stall', () => this.say(pick([t('Whistled dead: nobody can get to it.'), t('The referee blows it dead. Faceoff!')]), 2));
    m.on('faceoff_early', (e) => { if (Math.random() < 0.5) this.say(t('{name} jumped the draw.', { name: n(e.s) }), 0); });
    m.on('lightning_pass', (e) => this.say(t('Lightning pass to {name}!', { name: n(e.to) }), 1));
    m.on('combo', (e) => this.say(pick([t('{from} to {name}... {combo}!', { from: n(e.from), name: n(e.s), combo: t(COMBOS[e.key].name).toUpperCase() }), t('{combo}! {from} and {name} in sync!', { combo: t(COMBOS[e.key].name), from: n(e.from), name: n(e.s) })]), 2));
    m.on('chain', (e) => { if (e.n === 3) this.say(pick([t('Tic-tac-toe!'), t('Beautiful passing!'), t('They\'re moving it around!')]), 1); else if (e.n >= 5) this.say(t('{n} passes in a row!', { n: e.n }), 1); });
    m.on('penalty', (e) => this.say(t('{name} heads to the box for {reason}. {team} on the power play!', { name: n(e.s), reason: t(e.reason).toLowerCase(), team: team(1 - e.team) }), 3, true));
    m.on('goalie_pulled', (e) => this.say(t('{team} pull their goalie for the extra attacker!', { team: team(e.team) }), 3));
    m.on('plow', (e) => this.say(t('{name} gets bowled over!', { name: n(e.s) }), 1));
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
        if (alone && this.lastBreak !== c) { this.lastBreak = c; this.say(pick([t('{name} is in alone!', { name: c.name }), t('Breakaway, {name}!', { name: c.name })]), 2); }
      }
    } else if (!c) this.lastBreak = this.lastBreak && m.puck.speed > 50 ? this.lastBreak : null;
  }
}
