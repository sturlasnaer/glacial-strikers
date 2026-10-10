// The Mini Cup (Quick play › Mini Cup): a short tournament for the youngest players. Three quick
// games (first to three) against rivals getting tougher, the bracket filling in as they go;
// win all three for the little cup (Batch DD's) and coins. A loss ends the run (try again).

export const MINI_ROUNDS = ['Round 1', 'Semifinal', 'Final'];
export const MINI_WIN = 3; // (goals to win a game)
export const MINI_PRIZE = 150;
// the rivals each round is drawn from, gentlest first
export const MINI_POOLS = [['lynx', 'comets'], ['owls', 'rams'], ['moose', 'ravens']];

export const miniOf = (save) => save.miniCup || null;

export function newMiniCup(save, rnd = Math.random) {
  save.miniCup = { round: 0, opps: MINI_POOLS.map((pool) => pool[Math.floor(rnd() * pool.length)]), results: [] };
  return save.miniCup;
}

// A game played: 'next' (on to the next round), 'champion' (all three won: the cup, coins, and a
// fresh start next time) or 'out' (the run's over).
export function miniResult(save, won) {
  const c = save.miniCup;
  if (!c) return null;
  c.results.push(!!won);
  if (!won) { c.over = 'out'; return 'out'; }
  c.round++;
  if (c.round >= MINI_ROUNDS.length) {
    c.over = 'champion';
    save.miniCups = (save.miniCups || 0) + 1;
    save.coins = (save.coins || 0) + MINI_PRIZE;
    return 'champion';
  }
  return 'next';
}
