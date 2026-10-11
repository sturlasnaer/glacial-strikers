// Locker-room moments: short scenes between league matches with a choice. Choices give
// chemistry, EXP, coins, or a buff that lasts for the next league match.

import { CHARACTERS, TEAMS, CLUB, teamInfo, pairKey, member, goalieInfo } from './data.js';
import { applyExp, applyGoalieExp, lineupIds, starterId } from './progress.js';
import { t } from './i18n.js';
import { goalStates } from './goals.js';

const ALL_PAIRS = ['frost+thunder', 'frost+stone', 'stone+thunder'];

// ---- effect helpers (each returns a short description of what happened)
const chem = (pairs, xp) => (save) => { for (const k of pairs) save.chem[k] = (save.chem[k] || 0) + xp; return null; };
const exp = (ids, xp) => (save, ctx) => { for (const id of ids) ctx.ups.push(...applyExp(save, id, xp)); return null; };
const coins = (n) => (save) => { save.coins = Math.max(0, save.coins + n); return null; };
const buff = (b) => (save) => { save.buffs = [...(save.buffs || []).filter((x) => x.id !== b.id), b]; return null; };
const all = (...fns) => (save, ctx) => { for (const f of fns) f(save, ctx); return null; };
// One of our own (create.js) who has just played their first league game, not yet welcomed.
const ownDebut = (c) => {
  const R = (c.save && c.save.rookies) || {};
  return ((c.summary && c.summary.skaters) || []).filter((k) => k.team === 0).map((k) => k.id).find((id) => R[id] && R[id].own && !R[id].welcomed) || null;
};
const welcome = (more) => (save, ctx) => {
  const id = ownDebut({ ...ctx, save });
  if (!id) return null;
  save.rookies[id].welcomed = true;
  return more(save, ctx, id);
};

export const BUFF_TEXT = (b) => {
  switch (b.type) {
    case 'stat': return t('{name} +{v} {stat}', { name: b.who !== 'all' && member(b.who) ? member(b.who).name : t('Everyone'), v: b.v, stat: { spd: t('Speed'), agi: t('Agility'), sht: t('Shooting'), pas: t('Passing'), chk: t('Checking'), sta: t('Stamina') }[b.stat] });
    case 'ult': return t('Fired up (start with {v}% ultimate)', { v: b.v });
    case 'stamina': return t('Well rested (+15% stamina)');
    case 'goalie': return t('In goal: +{v} reflex', { v: b.v });
    case 'scoutGoalie': return t('Scouted their goalie');
    case 'steal': return t('Scouted their skaters (+15% steals)');
    case 'hype': return t('Crowd ready to chant');
    default: return b.label || b.id;
  }
};

// ctx: { won, gf, ga, summary, streak, next (fixture), save }
export const MOMENTS = [
  {
    // one of our own just played their first league game: the room welcomes them
    id: 'homegrown', who: [], weight: 25,
    when: (c) => !!ownDebut(c),
    whoFn: (c) => [ownDebut(c), 'frost'],
    title: 'One of our own',
    text: (c) => t('{name}\'s first league game for the {club} is in the books. Nix flips them the game puck. "Welcome to the room. Everybody signs it."', { name: c.save.rookies[ownDebut(c)].name, club: CLUB.nick }),
    choices: [
      { label: 'Everybody signs the puck', fx: 'The newcomer +20 EXP, and +6 chemistry with the line', reply: 'The puck goes on the shelf above their locker, covered in signatures.',
        apply: welcome((save, ctx, id) => { ctx.ups.push(...applyExp(save, id, 20)); for (const o of lineupIds(save)) if (o !== id) { const k = pairKey(id, o); save.chem[k] = (save.chem[k] || 0) + 6; } return null; }) },
      { label: 'A speech from the rookie', fx: 'Next match: fired up (start with 25% ultimate)', reply: 'Short, nervous and perfect. The room roars.',
        apply: welcome((save) => buff({ id: 'fired', type: 'ult', v: 25 })(save)) },
    ],
  },
  {
    // one of Coach Brekka's season goals left (and at least one met): the list goes up on the board
    id: 'goal-push', who: ['frost'], weight: 5, once: true,
    when: (c) => { const g = goalStates(c.save); return g.some((x) => x.done) && !g.some((x) => x.failed) && g.filter((x) => !x.done).length === 1; },
    title: 'One to go',
    text: (c) => { const g = goalStates(c.save).find((x) => !x.done && !x.failed); return t('Coach Brekka pins the season goals to the board, all ticked but one: "{goal}" Nix taps it. "We finish this."', { goal: t(g.text, { n: g.n }) }); },
    choices: [
      { label: 'Fire them up', fx: 'Next match: fired up (start with 25% ultimate)', apply: buff({ id: 'fired', type: 'ult', v: 25 }), reply: 'The list stays on the board. Everybody reads it on the way out.' },
      { label: 'Watch the tape', fx: 'Next match: +15% steals', apply: buff({ id: 'scout', type: 'steal', v: 1.15 }), reply: 'Two hours of video. Bram takes notes in three colours.' },
    ],
  },
  {
    id: 'extra-reps', who: ['thunder', 'frost'], weight: 3, when: () => true,
    title: 'Extra reps',
    text: () => t('Volta catches Nix after practice. "Stay late? I want to nail those one-timers off your passes."'),
    choices: [
      { label: 'Stay and drill it', fx: '+12 Frostbolt chemistry, Nix & Volta +10 EXP', apply: all(chem(['frost+thunder'], 12), exp(['frost', 'thunder'], 10)), reply: 'They stay until the Zamboni kicks them off the ice.' },
      { label: 'Get some rest', fx: 'Next match: well rested (+15% stamina)', apply: buff({ id: 'rest', type: 'stamina', v: 1.15 }), reply: 'Nix sends everyone home early. Fresh legs tomorrow.' },
    ],
  },
  {
    id: 'ice-time', who: ['stone'], weight: 4,
    when: (c) => c.summary && ((c.summary.skaters.find((k) => k.team === 0 && k.id === 'stone') || {}).shots || 0) <= 2,
    title: 'Ice time',
    text: () => t('Bram stares at his skates. "Feels like I\'m just the wall back there. Nobody passes me the puck."'),
    choices: [
      { label: 'Run plays through Bram', fx: 'Next match: Bram +1 Shooting, +6 chemistry for his pairs', apply: all(buff({ id: 'bram-sht', type: 'stat', who: 'stone', stat: 'sht', v: 1 }), chem(['frost+stone', 'stone+thunder'], 6)), reply: 'Bram grins. "Finally. Watch this cannon."' },
      { label: 'Walls win championships', fx: 'Next match: Bram +1 Checking, Bram +15 EXP', apply: all(buff({ id: 'bram-chk', type: 'stat', who: 'stone', stat: 'chk', v: 1 }), exp(['stone'], 15)), reply: '"...Okay. That\'s actually a great line." He cracks his knuckles.' },
    ],
  },
  {
    id: 'tough-loss', who: ['frost'], weight: 6, when: (c) => c.won === false,
    title: 'After the loss',
    text: (c) => t('Nobody talks much after a {ga}–{gf} loss. Nix breaks the silence: "We need to look at the tape."', { ga: c.ga, gf: c.gf }),
    choices: [
      { label: 'Film session (40 coins)', fx: 'Every skater +25 EXP', cost: 40, apply: all(coins(-40), exp(['frost', 'thunder', 'stone'], 25)), reply: 'Three hours of rewinding. Everyone sees something they\'ll fix.' },
      { label: 'Team dinner instead', fx: '+6 chemistry for every pair', apply: chem(ALL_PAIRS, 6), reply: 'Bram orders for the table. By dessert everyone is laughing again.' },
    ],
  },
  {
    id: 'hat-trick', who: [], weight: 6,
    when: (c) => c.summary && c.summary.skaters.some((k) => k.team === 0 && k.goals >= 3),
    whoFn: (c) => [c.summary.skaters.filter((k) => k.team === 0).sort((a, b) => b.goals - a.goals)[0].id],
    title: 'Fan mail',
    text: (c) => { const k = c.summary.skaters.filter((s) => s.team === 0).sort((a, b) => b.goals - a.goals)[0]; return t('After that hat trick, {name}\'s locker is buried in fan mail.', { name: k.name }); },
    choices: [
      { label: 'Answer every letter', fx: '+40 coins from a happy sponsor', apply: coins(40), reply: 'A local skate shop sends a thank-you cheque.' },
      { label: 'Sign sticks for kids', fx: 'Next match: the crowd is ready to chant from the start', apply: buff({ id: 'hype', type: 'hype' }), reply: 'Twenty kids leave with signed sticks. They\'ll be loud next game.' },
    ],
  },
  {
    id: 'lucky-socks', who: ['thunder', 'stone'], weight: 5, when: (c) => c.streak >= 2,
    title: 'Lucky socks',
    text: (c) => t('{n} wins in a row, and Volta refuses to wash her socks. Bram is holding his nose.', { n: c.streak }),
    choices: [
      { label: 'Don\'t touch the streak', fx: 'Next match: fired up (start with 35% ultimate)', apply: buff({ id: 'fired', type: 'ult', v: 35 }), reply: '"Superstition is a strategy," Volta says. Nobody argues.' },
      { label: 'Laundry. Now.', fx: '+4 chemistry for every pair', apply: chem(ALL_PAIRS, 4), reply: 'The whole room cheers when the socks go in the machine.' },
    ],
  },
  {
    id: 'goalie-reps', who: [], weight: 4, when: (c) => c.ga >= 4 || (c.summary && c.summary.saves[0] >= 18),
    title: 'Halla\'s request',
    text: () => t('Halla taps her blocker on the bench. "Stay after and fire pucks at me. I need more reps."'),
    choices: [
      { label: 'Shooting gallery for Halla', fx: 'Next match: Halla +1 reflex', apply: buff({ id: 'halla', type: 'goalie', v: 1 }), reply: 'Two hundred shots later, Halla is stopping them blindfolded. Almost.' },
      { label: 'She needs rest', fx: 'Halla +40 EXP', apply: (save) => { applyGoalieExp(save, 40); return null; }, reply: 'Halla naps on the trainer\'s table. She wakes up sharp.' },
    ],
  },
  {
    id: 'trash-talk', who: ['frost', 'thunder'], weight: 6,
    when: (c) => c.next && c.save.rivals && c.save.rivals[c.next.opponent] && c.save.rivals[c.next.opponent].last && !c.save.rivals[c.next.opponent].last.won,
    title: 'Trash talk',
    text: (c) => t('The {team} posted a video laughing at the last time we played them.', { team: teamInfo(c.next.opponent).name }),
    choices: [
      { label: 'Answer on the ice', fx: 'Next match: fired up (25% ultimate) and a loud crowd', apply: all(buff({ id: 'fired', type: 'ult', v: 25 }), buff({ id: 'hype', type: 'hype' })), reply: 'Volta pins the video to the locker room door.' },
      { label: 'Ignore it, stay focused', fx: 'Next match: every skater +1 Passing', apply: buff({ id: 'focus', type: 'stat', who: 'all', stat: 'pas', v: 1 }), reply: 'Nix turns the TV off. "We play our game."' },
    ],
  },
  {
    id: 'scout', who: ['frost'], weight: 4, when: (c) => !!c.next,
    title: 'Scouting report',
    text: (c) => t('The scout drops a thick folder on the table: everything on the {team}.', { team: teamInfo(c.next.opponent).name }),
    choices: [
      { label: 'Study their goalie', fx: 'Next match: their goalie covers 6% less net', apply: buff({ id: 'scout', type: 'scoutGoalie', v: 0.94 }), reply: '"Weak glove side when they\'re tired," Nix circles it twice.' },
      { label: 'Study their skaters', fx: 'Next match: +15% steals', apply: buff({ id: 'scout', type: 'steal', v: 1.15 }), reply: 'Bram memorizes every carrier\'s favourite move.' },
    ],
  },
  {
    id: 'nerves', who: ['thunder', 'frost'], weight: 20, when: (c) => c.next && c.next.kind === 'semi', once: true,
    title: 'Playoff nerves',
    text: () => t('It\'s 2 a.m. and Volta is still awake, lacing and unlacing her skates.'),
    choices: [
      { label: 'Nix gives a pep talk', fx: '+15 Frostbolt chemistry', apply: chem(['frost+thunder'], 15), reply: '"You\'re the fastest skater in this league. Act like it." Volta finally sleeps.' },
      { label: 'Let her skate it off', fx: 'Next match: Volta +1 Speed', apply: buff({ id: 'volta-spd', type: 'stat', who: 'thunder', stat: 'spd', v: 1 }), reply: 'Forty laps of the empty rink. She\'s flying tomorrow.' },
    ],
  },
  {
    id: 'speech', who: ['frost', 'stone', 'thunder'], weight: 30, when: (c) => c.next && c.next.kind === 'final', once: true,
    title: 'The night before the final',
    text: () => t('Everyone is sitting in their stall, quiet. Nix stands up. "Should I say something?"'),
    choices: [
      { label: 'Give the speech', fx: 'Next match: fired up (start with 50% ultimate)', apply: buff({ id: 'fired', type: 'ult', v: 50 }), reply: 'Nobody remembers the exact words. Everybody remembers how it felt.' },
      { label: 'Let actions speak', fx: 'Next match: every skater +1 Shooting', apply: buff({ id: 'final-sht', type: 'stat', who: 'all', stat: 'sht', v: 1 }), reply: 'Nix just taps her stick on the floor. One by one, everyone joins in.' },
    ],
  },
  {
    id: 'stew', who: ['stone'], weight: 3, when: (c) => c.won === true,
    title: 'Bram\'s stew',
    text: () => t('Bram shows up with a pot of stew big enough for both teams.'),
    choices: [
      { label: 'Everyone eats', fx: '+5 chemistry for every pair, every skater +10 EXP', apply: all(chem(ALL_PAIRS, 5), exp(['frost', 'thunder', 'stone'], 10)), reply: 'Second helpings for everyone. Volta takes thirds.' },
      { label: 'Sell it at the concession stand', fx: '+30 coins', apply: coins(30), reply: 'Sold out by the second period.' },
    ],
  },
  {
    id: 'spat', who: ['thunder', 'stone'], weight: 4,
    when: (c) => (c.save.chem['stone+thunder'] || 0) <= Math.min(c.save.chem['frost+thunder'] || 0, c.save.chem['frost+stone'] || 0),
    title: 'Who takes the shot?',
    text: () => t('Volta and Bram are arguing about who should have shot on that last rush. Loudly.'),
    choices: [
      { label: 'Make them drill together', fx: '+15 Thunderquake chemistry', apply: chem(['stone+thunder'], 15), reply: 'One hour of 2-on-0 drills. They come back high-fiving.' },
      { label: 'Let them cool off', fx: 'Next match: Volta +1 Agility, Bram +1 Stamina', apply: all(buff({ id: 'volta-agi', type: 'stat', who: 'thunder', stat: 'agi', v: 1 }), buff({ id: 'bram-sta', type: 'stat', who: 'stone', stat: 'sta', v: 1 })), reply: 'Separate warm-ups. Both come back with something to prove.' },
    ],
  },
  {
    id: 'deal', who: [], weight: 3, when: () => true,
    title: 'A deal at the pro shop',
    text: () => t('The pro shop owner leans over the counter. "For the Foxes? I can do you a favour."'),
    choices: [
      { label: 'Take the discount', fx: '25% off your next shop purchase', apply: (save) => { save.discount = 0.25; return null; }, reply: '"Just tell your friends where you got your gear."' },
      { label: 'Free tape job for Nix', fx: 'Next match: Nix +1 Shooting', apply: buff({ id: 'nix-sht', type: 'stat', who: 'frost', stat: 'sht', v: 1 }), reply: 'Fresh tape, perfect curl. Nix twirls the stick like a baton.' },
    ],
  },
  {
    id: 'blowout', who: ['thunder'], weight: 5, when: (c) => c.won && c.gf - c.ga >= 3,
    title: 'Front page',
    text: (c) => t('The morning paper: "{club} ROLL {gf}–{ga}." Volta has already framed it.', { club: CLUB.nick.toUpperCase(), gf: c.gf, ga: c.ga }),
    choices: [
      { label: 'Enjoy it', fx: 'Next match: the crowd is ready to chant', apply: buff({ id: 'hype', type: 'hype' }), reply: 'Fans line up outside the rink for autographs.' },
      { label: 'Stay humble', fx: 'Every skater +10 EXP', apply: exp(['frost', 'thunder', 'stone'], 10), reply: 'Nix flips the paper over. "One game at a time."' },
    ],
  },
];

// In a career as another club (clubs.js) the cast's moments are the line-up's: the same scenes
// played by its centre, winger and defender and its goalie, by name ({c}, {w}, {d}, {g}), and
// their boosts go to whoever plays there. label, fx and reply can be functions of ctx here.
const L = (save, r) => save.lineup[r];
const nm = (save, r) => (member(L(save, r)) || {}).name || '';
const names = (c) => ({ c: nm(c.save, 'C'), w: nm(c.save, 'W'), d: nm(c.save, 'D'), g: goalieInfo(starterId(c.save)).name });
const chemL = (pairs, xp) => (save) => { for (const [a, b] of pairs) { const k = pairKey(L(save, a), L(save, b)); save.chem[k] = (save.chem[k] || 0) + xp; } return null; };
const LINE_PAIRS = [['C', 'W'], ['C', 'D'], ['W', 'D']];
const expL = (roles, xp) => (save, ctx) => { for (const r of roles) ctx.ups.push(...applyExp(save, L(save, r), xp)); return null; };
const buffL = (b, role) => (save) => buff({ ...b, who: L(save, role) })(save);
const whoL = (...roles) => (c) => roles.map((r) => (r === 'G' ? starterId(c.save) : L(c.save, r)));
const shotsBy = (c, r) => ((c.summary.skaters.find((k) => k.team === 0 && k.id === L(c.save, r)) || {}).shots || 0);
const byId = (id) => MOMENTS.find((m) => m.id === id);
export const CAREER_MOMENTS = [
  {
    id: 'homegrown-club', weight: 25, when: (c) => !!ownDebut(c),
    whoFn: (c) => { const id = ownDebut(c); return [id, lineupIds(c.save).find((x) => x !== id)]; },
    title: 'One of our own',
    text: (c) => { const id = ownDebut(c), other = lineupIds(c.save).find((x) => x !== id); return t('{name}\'s first league game for the {club} is in the books. {other} flips them the game puck. "Welcome to the room. Everybody signs it."', { name: c.save.rookies[id].name, club: CLUB.nick, other: (member(other) || {}).name || '' }); },
    choices: byId('homegrown').choices,
  },
  {
    id: 'goal-push-club', weight: 5, once: true, when: byId('goal-push').when, whoFn: whoL('C'),
    title: 'One to go',
    text: (c) => { const g = goalStates(c.save).find((x) => !x.done && !x.failed); return t('Coach Brekka pins the season goals to the board, all ticked but one: "{goal}" {c} taps it. "We finish this."', { goal: t(g.text, { n: g.n }), ...names(c) }); },
    choices: [
      byId('goal-push').choices[0],
      { label: 'Watch the tape', fx: 'Next match: +15% steals', apply: buff({ id: 'scout', type: 'steal', v: 1.15 }), reply: (c) => t('Two hours of video. {d} takes notes in three colours.', names(c)) },
    ],
  },
  {
    id: 'extra-reps-club', weight: 3, when: () => true, whoFn: whoL('W', 'C'),
    title: 'Extra reps',
    text: (c) => t('{w} catches {c} after practice. "Stay late? I want to nail those one-timers off your passes."', names(c)),
    choices: [
      { label: 'Stay and drill it', fx: (c) => t('+12 chemistry for {c} and {w}, both +10 EXP', names(c)), apply: all(chemL([['C', 'W']], 12), expL(['C', 'W'], 10)), reply: 'They stay until the Zamboni kicks them off the ice.' },
      { label: 'Get some rest', fx: 'Next match: well rested (+15% stamina)', apply: buff({ id: 'rest', type: 'stamina', v: 1.15 }), reply: (c) => t('{c} sends everyone home early. Fresh legs tomorrow.', names(c)) },
    ],
  },
  {
    id: 'ice-time-club', weight: 4, when: (c) => c.summary && shotsBy(c, 'D') <= 2, whoFn: whoL('D'),
    title: 'Ice time',
    text: (c) => t('{d} stares at the floor. "Feels like I\'m just the wall back there. Nobody passes me the puck."', names(c)),
    choices: [
      { label: (c) => t('Run plays through {d}', names(c)), fx: (c) => t('Next match: {d} +1 Shooting, +6 chemistry with the line', names(c)), apply: all(buffL({ id: 'd-sht', type: 'stat', stat: 'sht', v: 1 }, 'D'), chemL([['C', 'D'], ['W', 'D']], 6)), reply: (c) => t('{d} grins. "Finally. Watch this cannon."', names(c)) },
      { label: 'Walls win championships', fx: (c) => t('Next match: {d} +1 Checking, and +15 EXP', names(c)), apply: all(buffL({ id: 'd-chk', type: 'stat', stat: 'chk', v: 1 }, 'D'), expL(['D'], 15)), reply: (c) => t('"...Okay. That\'s actually a great line." {d} cracks a smile.', names(c)) },
    ],
  },
  {
    id: 'tough-loss-club', weight: 6, when: (c) => c.won === false, whoFn: whoL('C'),
    title: 'After the loss',
    text: (c) => t('Nobody talks much after a {ga}–{gf} loss. {c} breaks the silence: "We need to look at the tape."', { ga: c.ga, gf: c.gf, ...names(c) }),
    choices: [
      { label: 'Film session (40 coins)', fx: 'Every skater +25 EXP', cost: 40, apply: all(coins(-40), expL(['C', 'W', 'D'], 25)), reply: 'Three hours of rewinding. Everyone sees something they\'ll fix.' },
      { label: 'Team dinner instead', fx: '+6 chemistry for every pair', apply: chemL(LINE_PAIRS, 6), reply: (c) => t('{d} orders for the table. By dessert everyone is laughing again.', names(c)) },
    ],
  },
  {
    id: 'lucky-socks-club', weight: 5, when: (c) => c.streak >= 2, whoFn: whoL('W', 'D'),
    title: 'Lucky socks',
    text: (c) => t('{n} wins in a row, and {w} refuses to wash those lucky socks. {d} has moved to the far end of the bench.', { n: c.streak, ...names(c) }),
    choices: [
      { label: 'Don\'t touch the streak', fx: 'Next match: fired up (start with 35% ultimate)', apply: buff({ id: 'fired', type: 'ult', v: 35 }), reply: (c) => t('"Superstition is a strategy," {w} says. Nobody argues.', names(c)) },
      { label: 'Laundry. Now.', fx: '+4 chemistry for every pair', apply: chemL(LINE_PAIRS, 4), reply: 'The whole room cheers when the socks go in the machine.' },
    ],
  },
  {
    id: 'goalie-reps-club', weight: 4, when: byId('goalie-reps').when, whoFn: whoL('G'),
    title: 'Extra shots',
    text: (c) => t('{g} taps the blocker on the bench. "Stay after and fire pucks at me. I need more reps."', names(c)),
    choices: [
      { label: (c) => t('Shooting gallery for {g}', names(c)), fx: (c) => t('Next match: {g} +1 reflex', names(c)), apply: buff({ id: 'halla', type: 'goalie', v: 1 }), reply: (c) => t('Two hundred shots later, {g} is stopping them blindfolded. Almost.', names(c)) },
      { label: 'A day off', fx: (c) => t('{g} +40 EXP', names(c)), apply: (save) => { applyGoalieExp(save, 40); return null; }, reply: (c) => t('{g} naps on the trainer\'s table and wakes up sharp.', names(c)) },
    ],
  },
  {
    id: 'trash-talk-club', weight: 6, when: byId('trash-talk').when, whoFn: whoL('C', 'W'),
    title: 'Trash talk', text: byId('trash-talk').text,
    choices: [
      { ...byId('trash-talk').choices[0], reply: (c) => t('{w} pins the video to the locker room door.', names(c)) },
      { ...byId('trash-talk').choices[1], reply: (c) => t('{c} turns the TV off. "We play our game."', names(c)) },
    ],
  },
  {
    id: 'scout-club', weight: 4, when: (c) => !!c.next, whoFn: whoL('C'),
    title: 'Scouting report', text: byId('scout').text,
    choices: [
      { ...byId('scout').choices[0], reply: (c) => t('"Weak glove side when they\'re tired," {c} circles it twice.', names(c)) },
      { ...byId('scout').choices[1], reply: (c) => t('{d} memorizes every carrier\'s favourite move.', names(c)) },
    ],
  },
  {
    id: 'nerves-club', weight: 20, once: true, when: byId('nerves').when, whoFn: whoL('W', 'C'),
    title: 'Playoff nerves',
    text: (c) => t('It\'s 2 a.m. and {w} is still awake, lacing and unlacing those skates.', names(c)),
    choices: [
      { label: (c) => t('{c} gives a pep talk', names(c)), fx: (c) => t('+15 chemistry for {c} and {w}', names(c)), apply: chemL([['C', 'W']], 15), reply: (c) => t('"You\'re the fastest skater in this league. Act like it." {w} finally sleeps.', names(c)) },
      { label: (c) => t('Let {w} skate it off', names(c)), fx: (c) => t('Next match: {w} +1 Speed', names(c)), apply: buffL({ id: 'w-spd', type: 'stat', stat: 'spd', v: 1 }, 'W'), reply: (c) => t('Forty laps of the empty rink. {w} will be flying tomorrow.', names(c)) },
    ],
  },
  {
    id: 'speech-club', weight: 30, once: true, when: byId('speech').when, whoFn: whoL('C', 'D', 'W'),
    title: 'The night before the final',
    text: (c) => t('Everyone is sitting in their stall, quiet. {c} stands up. "Should I say something?"', names(c)),
    choices: [
      byId('speech').choices[0],
      { ...byId('speech').choices[1], reply: (c) => t('{c} just taps a stick on the floor. One by one, everyone joins in.', names(c)) },
    ],
  },
  {
    id: 'stew-club', weight: 3, when: (c) => c.won === true, whoFn: whoL('D'),
    title: 'A pot of stew',
    text: (c) => t('{d} shows up with a pot of stew big enough for both teams.', names(c)),
    choices: [
      { label: 'Everyone eats', fx: '+5 chemistry for every pair, every skater +10 EXP', apply: all(chemL(LINE_PAIRS, 5), expL(['C', 'W', 'D'], 10)), reply: (c) => t('Second helpings for everyone. {w} takes thirds.', names(c)) },
      byId('stew').choices[1],
    ],
  },
  {
    id: 'spat-club', weight: 4, whoFn: whoL('W', 'D'),
    when: (c) => { const k = (a, b) => c.save.chem[pairKey(L(c.save, a), L(c.save, b))] || 0; return k('W', 'D') <= Math.min(k('C', 'W'), k('C', 'D')); },
    title: 'Who takes the shot?',
    text: (c) => t('{w} and {d} are arguing about who should have shot on that last rush. Loudly.', names(c)),
    choices: [
      { label: 'Make them drill together', fx: (c) => t('+15 chemistry for {w} and {d}', names(c)), apply: chemL([['W', 'D']], 15), reply: 'One hour of 2-on-0 drills. They come back high-fiving.' },
      { label: 'Let them cool off', fx: (c) => t('Next match: {w} +1 Agility, {d} +1 Stamina', names(c)), apply: all(buffL({ id: 'w-agi', type: 'stat', stat: 'agi', v: 1 }, 'W'), buffL({ id: 'd-sta', type: 'stat', stat: 'sta', v: 1 }, 'D')), reply: 'Separate warm-ups. Both come back with something to prove.' },
    ],
  },
  {
    id: 'deal-club', weight: 3, when: () => true, whoFn: whoL('C'),
    title: 'A deal at the pro shop', text: () => t('The pro shop owner leans over the counter. "For the {club}? I can do you a favour."', { club: CLUB.nick }),
    choices: [
      byId('deal').choices[0],
      { label: (c) => t('Free tape job for {c}', names(c)), fx: (c) => t('Next match: {c} +1 Shooting', names(c)), apply: buffL({ id: 'c-sht', type: 'stat', stat: 'sht', v: 1 }, 'C'), reply: (c) => t('Fresh tape, perfect curl. {c} twirls the stick like a baton.', names(c)) },
    ],
  },
  {
    id: 'blowout-club', weight: 5, when: byId('blowout').when, whoFn: whoL('W'),
    title: 'Front page',
    text: (c) => t('The morning paper: "{club} ROLL {gf}–{ga}." {w} has already framed it.', { club: CLUB.nick.toUpperCase(), gf: c.gf, ga: c.ga, ...names(c) }),
    choices: [
      byId('blowout').choices[0],
      { label: 'Stay humble', fx: 'Every skater +10 EXP', apply: expL(['C', 'W', 'D'], 10), reply: (c) => t('{c} flips the paper over. "One game at a time."', names(c)) },
    ],
  },
];

// Pick a moment for this context, or null. Moments marked once only show once per season.
// A moment that's about the cast (by who, or by name in its words): not in a career as another
// club, where the cast are the Foxes' (clubs.js).
const CAST_NAMES = /\b(Nix|Volta|Bram|Halla)\b/;
const castMoment = (m) => (m.who || []).some((id) => CHARACTERS[id]) || CAST_NAMES.test(JSON.stringify(m, (k, v) => (typeof v === 'function' ? String(v) : v)));
export function pickMoment(save, ctx, rng = Math.random) {
  const lr = (save.locker ||= { seen: [], seasonSeen: [], season: save.season });
  if (lr.season !== save.season) { lr.season = save.season; lr.seasonSeen = []; }
  const recent = lr.seen.slice(-3);
  const options = [...MOMENTS, ...CAREER_MOMENTS].filter((m) => {
    if (save.team ? castMoment(m) : m.id.endsWith('-club')) return false; // (a club career: its line-up's versions)
    if (m.once && lr.seasonSeen.includes(m.id)) return false;
    if (recent.includes(m.id)) return false;
    try { return m.when({ ...ctx, save }); } catch { return false; }
  });
  if (!options.length) return null;
  // big moments (playoffs) always show; otherwise 75% of the time
  const big = options.filter((m) => m.weight >= 20);
  if (!big.length && rng() > 0.75) return null;
  const pool = big.length ? big : options;
  let total = pool.reduce((a, m) => a + m.weight, 0), r = rng() * total;
  for (const m of pool) { r -= m.weight; if (r <= 0) return m; }
  return pool[pool.length - 1];
}

export function markSeen(save, m) {
  const lr = save.locker;
  lr.seen.push(m.id);
  if (lr.seen.length > 12) lr.seen.shift();
  if (m.once) lr.seasonSeen.push(m.id);
}

// Turn saved buffs into match tweaks. Stats are applied by matchConfig.
export function buffEffects(buffs = []) {
  const out = { stats: [], ultStart: 0, staminaMul: 1, goalieRfx: 0, oppGoalieMul: 1, stealMul: 1, hype: false };
  for (const b of buffs) {
    if (b.type === 'stat') out.stats.push(b);
    if (b.type === 'ult') out.ultStart = Math.max(out.ultStart, b.v);
    if (b.type === 'stamina') out.staminaMul = Math.max(out.staminaMul, b.v);
    if (b.type === 'goalie') out.goalieRfx += b.v;
    if (b.type === 'scoutGoalie') out.oppGoalieMul *= b.v;
    if (b.type === 'steal') out.stealMul *= b.v;
    if (b.type === 'hype') out.hype = true;
  }
  return out;
}
