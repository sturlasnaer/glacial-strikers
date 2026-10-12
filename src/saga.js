// A rival with a story: one rival captain per career, whose story runs over the seasons. It
// starts at the first league game against the season's rivalry club (rivals.js rivalryOf): the
// grudge after it, the rematch the season after, a trade rumour, respect after one of our Cups,
// their last season and a farewell when they retire; or, if we sign them, rivals to teammates.
// Each chapter plays once (save.saga.seen); its lines are kept (save.saga.log) so Trophies › Our
// story can play it again. The scenes' backdrops (Batch FA) are atlas.saga.<bg> once drawn.
import { TEAMS, RECRUITS, recruitKey, clubT } from './data.js';
import { vacated, ageOf, RETIRE_AT } from './slots.js';

// The chapters in story order: when each comes ('after' a league game against them, 'before' one,
// in the 'hub', or at the season's 'awards'), its backdrop and its lines. A line is [side, who,
// text]: who 'captain' is them; 'self' is the captain once they're one of ours.
export const SAGA = {
  grudge: { when: 'after', name: 'The grudge', bg: 'handshake',
    won: [
      ['kip', null, 'That\'s {name}, the {club} captain. They don\'t take losing well.'],
      ['them', 'captain', 'Enjoy tonight, Foxes. I\'ll remember this score.'],
      ['us', 'frost', 'Remember it all you like. We\'ll be ready next time too.'],
    ],
    lost: [
      ['them', 'captain', 'So you\'re the Foxes everyone\'s talking about. I\'m {name}. You\'ll see a lot of me.'],
      ['us', 'frost', 'We\'ll see you again, {name}. And next time it\'ll be different.'],
      ['kip', null, 'A rivalry is born. Keep an eye on {name}.'],
    ] },
  rematch: { when: 'before', name: 'The rematch', bg: 'handshake', lines: [
    ['them', 'captain', 'I\'ve thought about our last game all summer, Foxes.'],
    ['us', 'frost', 'So have we, {name}. Let\'s play.'],
  ] },
  rumour: { when: 'hub', name: 'The rumour', bg: 'rumour', lines: [
    ['kip', null, 'This morning\'s papers: {name} has asked the {club} for a trade. Half the league wants them.'],
    ['them', 'captain', 'Don\'t believe everything you read. Well. Not everything.'],
    ['us', 'stone', 'If {name} ever pulls on our jersey, I\'m buying the cocoa.'],
  ] },
  respect: { when: 'hub', name: 'Respect', bg: 'handshake', lines: [
    ['them', 'captain', '{name} here. I watched the final. You earned that cup, Foxes.'],
    ['us', 'frost', 'Thanks, {name}. That means a lot, coming from you.'],
    ['them', 'captain', 'Don\'t get used to it. Next season it\'s ours.'],
  ] },
  last: { when: 'before', name: 'The last season', bg: 'handshake', lines: [
    ['them', 'captain', 'This is my last season, Foxes. I want to go out beating you.'],
    ['us', 'frost', 'Then we\'ll give you a game to remember, {name}.'],
  ] },
  farewell: { when: 'awards', name: 'Farewell', bg: 'farewell', lines: [
    ['kip', null, 'After {n} seasons, {name} of the {club} is hanging up the skates.'],
    ['them', 'captain', 'Every game against you was the best game of my week. Thank you, Foxes.'],
    ['us', 'frost', 'The rink won\'t be the same without you, {name}.'],
    ['kip', null, 'Let\'s hear it for {name}!'],
  ] },
  joined: { when: 'hub', name: 'Rivals to teammates', bg: 'handshake', lines: [
    ['kip', null, 'Well, well. {name}, our old rival, in our colours.'],
    ['us', 'self', 'Never thought I\'d wear this jersey. Turns out it fits.'],
    ['us', 'frost', 'Welcome aboard, {name}. Now you\'re stuck with us.'],
  ] },
};
export const SAGA_ORDER = Object.keys(SAGA);

// Start the story with this club's captain (once a career), at a league game against the
// season's rivalry club. Not the Foxes in a career as another club (the cast's names are ours
// there), nor a captain already gone.
export function startSaga(save, teamId) {
  if (save.saga || !TEAMS[teamId] || !TEAMS[teamId].names || teamId === 'foxes' || teamId === 'home') return null;
  if (vacated(save, teamId, 'frost')) return null;
  save.saga = { team: teamId, key: recruitKey(teamId, 'frost'), since: save.season || 1, cups: save.cups || 0, seen: {}, log: {} };
  return save.saga;
}

export const sagaName = (save) => (save.saga && RECRUITS[save.saga.key] ? RECRUITS[save.saga.key].name : '');
// Still captain of their club (not signed, traded or retired)?
export const sagaActive = (save) => !!save.saga && !vacated(save, save.saga.team, 'frost');
// This is their last season: they retire after its awards (slots.js retireRivals).
export const sagaLastSeason = (save) => sagaActive(save) && ageOf(save, save.saga.key) >= RETIRE_AT;

// The chapter due at this point, or null. at: 'after' | 'before' (a league game against teamId),
// 'hub', 'awards'.
export function sagaDue(save, at, teamId = null) {
  const g = save.saga;
  if (!g) return null;
  const seen = g.seen, active = sagaActive(save), vsThem = teamId === g.team;
  const L = save.league, inSeason = L && L.phase !== 'done';
  if (at === 'after') return vsThem && active && !seen.grudge ? 'grudge' : null;
  if (at === 'before') {
    if (!vsThem || !active || !seen.grudge) return null;
    if (sagaLastSeason(save) && !seen.last) return 'last';
    if ((save.season || 1) > g.since && !seen.rematch) return 'rematch';
    return null;
  }
  if (at === 'awards') return seen.grudge && sagaLastSeason(save) && !seen.farewell ? 'farewell' : null;
  if (at === 'hub') {
    if (save.roster[g.key] && !seen.joined) return 'joined';
    if (!active || !seen.grudge) return null;
    if ((save.cups || 0) > g.cups && !seen.respect) return 'respect';
    if ((save.season || 1) > g.since && inSeason && (L.round || 0) >= 3 && !seen.rumour && !sagaLastSeason(save)) return 'rumour';
  }
  return null;
}

// The chapter's lines, in the player's words with the names in (dialogue lines with l[3]: see
// clubT), and marks it played: seen, and kept for the replay. ctx: { won } for the grudge.
export function playSaga(save, chapter, ctx = {}) {
  const g = save.saga, c = SAGA[chapter];
  const lines = sagaLines(save, chapter, ctx);
  g.seen[chapter] = save.season || 1;
  g.log[chapter] = lines;
  return { lines, bg: c.bg };
}

export function sagaLines(save, chapter, ctx = {}) {
  const g = save.saga, c = SAGA[chapter], team = TEAMS[g.team];
  const params = { name: sagaName(save), club: team.name, n: save.season || 1 };
  const src = c.lines || (ctx.won ? c.won : c.lost);
  return src.map(([side, who, text]) => [side, who === 'captain' ? 'frost' : who === 'self' ? g.key : who, clubT(text, params), true]);
}

// The story so far, for Trophies › Our story: [{ id, name, lines, team }] in story order.
export const sagaChapters = (save) => (save.saga ? SAGA_ORDER.filter((k) => save.saga.log[k]).map((k) => ({ id: k, name: SAGA[k].name, lines: save.saga.log[k], team: save.saga.team, bg: SAGA[k].bg })) : []);
