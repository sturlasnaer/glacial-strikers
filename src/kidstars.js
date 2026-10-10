// Star stickers for the youngest (Little player games, Batch DN): after each game a gold star for
// something the young player's team did well: passing first (the part of the game we most want
// them to find), then scoring, defending and hustle, and teamwork for everyone. When more than
// one is earned, a different one from last time. Counted in save.kidStars.

export const KID_STAR_IDS = ['passer', 'scorer', 'defender', 'hustle', 'team'];

export function pickKidStar(summary, last = null) {
  const us = summary.skaters.filter((k) => k.team === 0), sum = (f) => us.reduce((a, k) => a + (k[f] || 0), 0);
  const earned = [];
  if (sum('passes') >= 12) earned.push('passer');
  if (summary.score[0] >= 2) earned.push('scorer');
  if (sum('steals') + sum('blocks') >= 4) earned.push('defender');
  if (sum('shots') >= 8) earned.push('hustle');
  earned.push('team');
  return earned.find((k) => k !== last) || earned[0];
}

export function awardKidStar(save, summary) {
  const K = (save.kidStars ||= { n: 0, last: null, got: {} });
  const id = pickKidStar(summary, K.last);
  K.n++; K.last = id; K.got[id] = (K.got[id] || 0) + 1;
  return id;
}
