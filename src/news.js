// Around the Frostline: what's happened in the league, newest first, for the League tab.
// Kept as small records (the words are made when they're shown, in the player's language):
//   { k: kind, s: season, r: round, team?, name?, kit?, ... }
// Kinds: 'rivalSign', 'rivalDraft', 'retire', 'weSign', 'weAgent', 'weGoalie', 'weLegend',
// 'weDraft', 'trade', 'champion', 'expansion', 'edge', 'hatTrick' (ours, in a league game).
export const NEWS_KEEP = 80;

export function addNews(save, item) {
  const L = save.league;
  (save.news ||= []).push({ s: save.season || 1, r: L ? L.round : 0, ...item });
  if (save.news.length > NEWS_KEEP) save.news.splice(0, save.news.length - NEWS_KEEP);
}

// The newest first, at most n.
export const latestNews = (save, n = 20) => (save.news || []).slice(-n).reverse();
