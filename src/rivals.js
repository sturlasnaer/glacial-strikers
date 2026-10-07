// Rivalries that remember: head-to-head records and dialogue that references them.

import { TEAMS, RECRUITS, member, recruitKey } from './data.js';

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
  const t = TEAMS[teamId];
  if (!r || !r.last || !t) return [];
  const L = r.last;
  const seed = r.played * 7 + r.gf * 3 + r.ga;
  const ours = (id) => (member(id) ? member(id).name : 'Somebody');
  const theirs = (id) => (id.startsWith('sub_') ? t.subs[id.slice(4)] : t.names[id]) || 'Somebody';
  const lines = [];
  if (L.won) {
    const margin = L.gf - L.ga;
    if (L.shootout) lines.push(['them', 'frost', pick([`A shootout. You beat us in a shootout. That's not hockey, that's a coin toss.`, `Last time it came down to a shootout. This time we finish it in regulation.`], seed)]);
    else if (L.top) lines.push(['them', 'stone', pick([`${ours(L.top.id)} put ${L.top.goals} past us last time. We've drilled for that all week.`, `Somebody keep an eye on ${ours(L.top.id)}. ${L.top.goals} goals on us last game. Never again.`], seed)]);
    else if (margin >= 3) lines.push(['them', 'frost', pick([`${L.gf}–${L.ga}. We haven't forgotten. Not for a second.`, `Still hearing about that ${L.gf}–${L.ga} loss back home. Today we fix it.`], seed)]);
    else lines.push(['them', 'thunder', pick([`${L.gf}–${L.ga} last time. One lucky bounce, that's all you had.`, `You squeaked by us ${L.gf}–${L.ga}. Enjoyed it? It won't happen twice.`], seed)]);
    if (r.streak >= 2) lines.push(['them', 'stone', `${r.streak} straight losses to the Strikers. Coach made us skate laps until midnight.`]);
    else if (seed % 3 === 0) lines.push(['us', 'thunder', `They remember us. Good. Let's give them something new to remember.`]);
  } else {
    if (L.theirTop) lines.push(['us', 'stone', `${theirs(L.theirTop.id)} scored ${L.theirTop.goals} on us last time. I'm on them all game.`]);
    else lines.push(['us', 'frost', `They beat us ${L.ga}–${L.gf} last time. Remember how that felt.`]);
    lines.push(['them', 'thunder', pick([`Back for another lesson, Strikers?`, `Didn't you learn anything last time?`, `Oh good, the Strikers. Easy points.`], seed)]);
    if (r.streak <= -2) lines.push(['us', 'thunder', `${-r.streak} losses in a row to these guys. That ends today.`]);
  }
  if (save.season > 1 && L.season < save.season && seed % 2 === 0) lines.push(['them', 'frost', `New season, same Strikers? We'll see.`]);
  const poached = poachedLine(save, teamId);
  if (poached) lines.unshift(poached);
  return lines.slice(0, 3);
}

// When you've signed one of their skaters, they bring it up.
export function poachedLine(save, teamId) {
  const t = TEAMS[teamId];
  const gone = ['frost', 'thunder', 'stone'].filter((k) => save.roster[recruitKey(teamId, k)]);
  if (!t || !gone.length) return null;
  const speaker = ['frost', 'thunder', 'stone'].find((k) => !gone.includes(k)) || 'frost';
  const names = gone.map((k) => RECRUITS[recruitKey(teamId, k)].name);
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const seed = (save.rivals && save.rivals[teamId] && save.rivals[teamId].played) || 0;
  return ['them', speaker, pick([`You took ${who} from us. Let's see who regrets it.`, `Nice jersey, ${names[0]}. It'll look even better after we beat you.`, `Signing ${who} won't save you, Strikers.`], seed)];
}

// One extra line after the match, from the rival captain.
export function rivalAfterLine(save, teamId, won, gf, ga) {
  const r = save.rivals && save.rivals[teamId];
  if (!r || r.played < 2) return null;
  if (won && r.streak >= 3) return ['them', 'frost', `${r.streak} in a row. You've got our number, Strikers.`];
  if (won && r.streak === 1 && r.losses > 0) return ['them', 'thunder', `So you finally beat us. The series is ${r.wins}–${r.losses}.`];
  if (!won && r.streak <= -2) return ['them', 'stone', `${-r.streak} straight. Maybe this is our building now.`];
  return null;
}
