// Rivalries that remember: head-to-head records and dialogue that references them.

import { TEAMS, RECRUITS, member, recruitKey, clubT } from './data.js';
import { t } from './i18n.js';
import { rivalSub } from './slots.js';

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

export function rivalRecord(save, teamId) {
  save.rivals ||= {};
  return (save.rivals[teamId] ||= { played: 0, wins: 0, losses: 0, gf: 0, ga: 0, streak: 0, last: null, ourGoals: {}, theirGoals: {} });
}

// Record a finished match (or shootout) against a rival.
// ourScorers: { charId: goals }, theirScorers: { charId: goals }
export function recordRivalResult(save, teamId, gf, ga, won, opts = {}) {
  if (!TEAMS[teamId] || teamId === 'home') return;
  const r = rivalRecord(save, teamId);
  r.played++;
  if (won) r.wins++; else r.losses++;
  r.gf += gf; r.ga += ga;
  r.streak = won ? Math.max(1, r.streak + 1) : Math.min(-1, r.streak - 1);
  r.last = { gf, ga, won, shootout: !!opts.shootout, season: save.season, top: null, theirTop: null };
  const top = Object.entries(opts.ourScorers || {}).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 2) r.last.top = { id: top[0], goals: top[1] };
  const theirs = Object.entries(opts.theirScorers || {}).sort((a, b) => b[1] - a[1])[0];
  if (theirs && theirs[1] >= 2) r.last.theirTop = { id: theirs[0], goals: theirs[1] };
  for (const [id, g] of Object.entries(opts.ourScorers || {})) r.ourGoals[id] = (r.ourGoals[id] || 0) + g;
  for (const [id, g] of Object.entries(opts.theirScorers || {})) r.theirGoals[id] = (r.theirGoals[id] || 0) + g;
}

// Extra pre-match lines based on history. Returns [side, charId, text][].
export function rivalLines(save, teamId) {
  const r = save.rivals && save.rivals[teamId];
  const team = TEAMS[teamId];
  // one of ours scoring in game after game: they've noticed
  const hot = team && Object.entries(save.goalStreaks || {}).filter(([id, n]) => n >= 3 && save.roster[id] && member(id)).sort((a, b) => b[1] - a[1])[0];
  const hotLine = hot ? ['them', 'stone', clubT('{name}, {n} games in a row with a goal? Not tonight.', { name: member(hot[0]).name, n: hot[1] })] : null;
  if (!r || !r.last || !team) return hotLine ? [hotLine] : [];
  const L = r.last;
  const seed = r.played * 7 + r.gf * 3 + r.ga;
  const ours = (id) => (member(id) ? member(id).name : clubT('Somebody'));
  const theirs = (id) => (id.startsWith('sub_') ? (rivalSub(save, teamId, id.slice(4)) || { name: team.subs[id.slice(4)] }).name : team.names[id]) || clubT('Somebody');
  const lines = [];
  if (L.won) {
    const margin = L.gf - L.ga;
    if (L.shootout) lines.push(['them', 'frost', pick([clubT('A shootout. You beat us in a shootout. That\'s not hockey, that\'s a coin toss.'), clubT('Last time it came down to a shootout. This time we finish it in regulation.')], seed)]);
    else if (L.top) lines.push(['them', 'stone', pick([clubT('{name} put {n} past us last time. We\'ve drilled for that all week.', { name: ours(L.top.id), n: L.top.goals }), clubT('Somebody keep an eye on {name}. {n} goals on us last game. Never again.', { name: ours(L.top.id), n: L.top.goals })], seed)]);
    else if (margin >= 3) lines.push(['them', 'frost', pick([clubT('{gf}–{ga}. We haven\'t forgotten. Not for a second.', { gf: L.gf, ga: L.ga }), clubT('Still hearing about that {gf}–{ga} loss back home. Today we fix it.', { gf: L.gf, ga: L.ga })], seed)]);
    else lines.push(['them', 'thunder', pick([clubT('{gf}–{ga} last time. One lucky bounce, that\'s all you had.', { gf: L.gf, ga: L.ga }), clubT('You squeaked by us {gf}–{ga}. Enjoyed it? It won\'t happen twice.', { gf: L.gf, ga: L.ga })], seed)]);
    if (r.streak >= 2) lines.push(['them', 'stone', clubT('{n} straight losses to the Foxes. Coach made us skate laps until midnight.', { n: r.streak })]);
    else if (seed % 3 === 0) lines.push(['us', 'thunder', clubT('They remember us. Good. Let\'s give them something new to remember.')]);
  } else {
    if (L.theirTop) lines.push(['us', 'stone', clubT('{name} scored {n} on us last time. I\'m on them all game.', { name: theirs(L.theirTop.id), n: L.theirTop.goals })]);
    else lines.push(['us', 'frost', clubT('They beat us {ga}–{gf} last time. Remember how that felt.', { ga: L.ga, gf: L.gf })]);
    lines.push(['them', 'thunder', pick([clubT('Back for another lesson, Foxes?'), clubT('Didn\'t you learn anything last time?'), clubT('Oh good, the Foxes. Easy points.')], seed)]);
    if (r.streak <= -2) lines.push(['us', 'thunder', clubT('{n} losses in a row to this lot. That ends today.', { n: -r.streak })]);
  }
  if (save.season > 1 && L.season < save.season && seed % 2 === 0) lines.push(['them', 'frost', clubT('New season, same Foxes? We\'ll see.')]);
  if (hotLine) lines.splice(1, 0, hotLine);
  const poached = poachedLine(save, teamId);
  if (poached) lines.unshift(poached);
  return lines.slice(0, 3).map(done);
}
// (lines already in the player's language with the club's name in their own words: clubT; the
// dialogue leaves them as they are)
const done = (l) => (l ? [l[0], l[1], l[2], true] : l);

// When you've signed one of their skaters, they bring it up.
export function poachedLine(save, teamId) {
  const team = TEAMS[teamId];
  const gone = ['frost', 'thunder', 'stone'].filter((k) => save.roster[recruitKey(teamId, k)] || (save.tradedAway && save.tradedAway[recruitKey(teamId, k)]));
  if (!team || !gone.length) return null;
  const speaker = ['frost', 'thunder', 'stone'].find((k) => !gone.includes(k)) || 'frost';
  const names = gone.map((k) => RECRUITS[recruitKey(teamId, k)].name);
  const who = names.length > 1 ? clubT('{names} and {last}', { names: names.slice(0, -1).join(', '), last: names[names.length - 1] }) : names[0];
  const seed = (save.rivals && save.rivals[teamId] && save.rivals[teamId].played) || 0;
  return done(['them', speaker, pick([clubT('You took {who} from us. Let\'s see who regrets it.', { who }), clubT('Nice jersey, {name}. It\'ll look even better after we beat you.', { name: names[0] }), clubT('Signing {who} won\'t save you, Foxes.', { who })], seed)]);
}

// One extra line after the match, from the rival captain.
export function rivalAfterLine(save, teamId, won, gf, ga) {
  const r = save.rivals && save.rivals[teamId];
  if (!r || r.played < 2) return null;
  if (won && r.streak >= 3) return done(['them', 'frost', clubT('{n} in a row. You\'ve got our number, Foxes.', { n: r.streak })]);
  if (won && r.streak === 1 && r.losses > 0) return done(['them', 'thunder', clubT('So you finally beat us. The series is {wins}–{losses}.', { wins: r.wins, losses: r.losses })]);
  if (!won && r.streak <= -2) return done(['them', 'stone', clubT('{n} straight. Maybe this is our building now.', { n: -r.streak })]);
  return null;
}

// The season's rivalry game: the league game against the club in the league that has beaten
// us most (the one we've played more breaks a tie), or, with no losses yet, last season's
// champions or else the league's strongest. Picked once a season and kept on the league
// (L.rivalry); its prize is RIVALRY_PRIZE times a league game's.
export const RIVALRY_PRIZE = 1.5;
export function rivalryOf(save, L) {
  if (!L || !L.teams) return null;
  if (L.rivalry !== undefined) return L.rivalry;
  const ids = L.teams.filter((id) => id !== 'home'), rec = (id) => (save.rivals && save.rivals[id]) || { losses: 0, played: 0 };
  const most = [...ids].sort((a, b) => rec(b).losses - rec(a).losses || rec(b).played - rec(a).played || ids.indexOf(b) - ids.indexOf(a))[0];
  L.rivalry = rec(most).losses > 0 ? most : L.prevChampion && ids.includes(L.prevChampion) ? L.prevChampion : ids[ids.length - 1];
  return L.rivalry;
}

