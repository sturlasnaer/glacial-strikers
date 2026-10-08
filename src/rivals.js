// Rivalries that remember: head-to-head records and dialogue that references them.

import { TEAMS, RECRUITS, member, recruitKey } from './data.js';
import { t } from './i18n.js';

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
  if (!r || !r.last || !team) return [];
  const L = r.last;
  const seed = r.played * 7 + r.gf * 3 + r.ga;
  const ours = (id) => (member(id) ? member(id).name : t('Somebody'));
  const theirs = (id) => (id.startsWith('sub_') ? team.subs[id.slice(4)] : team.names[id]) || t('Somebody');
  const lines = [];
  if (L.won) {
    const margin = L.gf - L.ga;
    if (L.shootout) lines.push(['them', 'frost', pick([`A shootout. You beat us in a shootout. That's not hockey, that's a coin toss.`, `Last time it came down to a shootout. This time we finish it in regulation.`], seed)]);
    else if (L.top) lines.push(['them', 'stone', pick([t('{name} put {n} past us last time. We\'ve drilled for that all week.', { name: ours(L.top.id), n: L.top.goals }), t('Somebody keep an eye on {name}. {n} goals on us last game. Never again.', { name: ours(L.top.id), n: L.top.goals })], seed)]);
    else if (margin >= 3) lines.push(['them', 'frost', pick([t('{gf}–{ga}. We haven\'t forgotten. Not for a second.', { gf: L.gf, ga: L.ga }), t('Still hearing about that {gf}–{ga} loss back home. Today we fix it.', { gf: L.gf, ga: L.ga })], seed)]);
    else lines.push(['them', 'thunder', pick([t('{gf}–{ga} last time. One lucky bounce, that\'s all you had.', { gf: L.gf, ga: L.ga }), t('You squeaked by us {gf}–{ga}. Enjoyed it? It won\'t happen twice.', { gf: L.gf, ga: L.ga })], seed)]);
    if (r.streak >= 2) lines.push(['them', 'stone', t('{n} straight losses to the Foxes. Coach made us skate laps until midnight.', { n: r.streak })]);
    else if (seed % 3 === 0) lines.push(['us', 'thunder', `They remember us. Good. Let's give them something new to remember.`]);
  } else {
    if (L.theirTop) lines.push(['us', 'stone', t('{name} scored {n} on us last time. I\'m on them all game.', { name: theirs(L.theirTop.id), n: L.theirTop.goals })]);
    else lines.push(['us', 'frost', t('They beat us {ga}–{gf} last time. Remember how that felt.', { ga: L.ga, gf: L.gf })]);
    lines.push(['them', 'thunder', pick([`Back for another lesson, Foxes?`, `Didn't you learn anything last time?`, `Oh good, the Foxes. Easy points.`], seed)]);
    if (r.streak <= -2) lines.push(['us', 'thunder', t('{n} losses in a row to these guys. That ends today.', { n: -r.streak })]);
  }
  if (save.season > 1 && L.season < save.season && seed % 2 === 0) lines.push(['them', 'frost', `New season, same Foxes? We'll see.`]);
  const poached = poachedLine(save, teamId);
  if (poached) lines.unshift(poached);
  return lines.slice(0, 3);
}

// When you've signed one of their skaters, they bring it up.
export function poachedLine(save, teamId) {
  const team = TEAMS[teamId];
  const gone = ['frost', 'thunder', 'stone'].filter((k) => save.roster[recruitKey(teamId, k)] || (save.tradedAway && save.tradedAway[recruitKey(teamId, k)]));
  if (!team || !gone.length) return null;
  const speaker = ['frost', 'thunder', 'stone'].find((k) => !gone.includes(k)) || 'frost';
  const names = gone.map((k) => RECRUITS[recruitKey(teamId, k)].name);
  const who = names.length > 1 ? t('{names} and {last}', { names: names.slice(0, -1).join(', '), last: names[names.length - 1] }) : names[0];
  const seed = (save.rivals && save.rivals[teamId] && save.rivals[teamId].played) || 0;
  return ['them', speaker, pick([t('You took {who} from us. Let\'s see who regrets it.', { who }), t('Nice jersey, {name}. It\'ll look even better after we beat you.', { name: names[0] }), t('Signing {who} won\'t save you, Foxes.', { who })], seed)];
}

// One extra line after the match, from the rival captain.
export function rivalAfterLine(save, teamId, won, gf, ga) {
  const r = save.rivals && save.rivals[teamId];
  if (!r || r.played < 2) return null;
  if (won && r.streak >= 3) return ['them', 'frost', t('{n} in a row. You\'ve got our number, Foxes.', { n: r.streak })];
  if (won && r.streak === 1 && r.losses > 0) return ['them', 'thunder', t('So you finally beat us. The series is {wins}–{losses}.', { wins: r.wins, losses: r.losses })];
  if (!won && r.streak <= -2) return ['them', 'stone', t('{n} straight. Maybe this is our building now.', { n: -r.streak })];
  return null;
}
