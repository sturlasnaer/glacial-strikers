// Stick hands: a sprite set can say which hand each facing is drawn with (`hands`, after its
// own mirroring). A player who shoots with the other hand is drawn as the opposite facing,
// mirrored, when that facing is drawn with the same hand (true of sets drawn left-shot in all
// eight directions). Returns the facing to mirror, or null to draw as is.
const MIRROR = { east: 'west', west: 'east', northeast: 'northwest', northwest: 'northeast', southeast: 'southwest', southwest: 'southeast', south: 'south', north: 'north' };
export function handMirror(hands, dir, hand) {
  if (!hands || !hand || !hands[dir] || hands[dir] === hand) return null;
  const m = MIRROR[dir];
  return hands[m] === hands[dir] ? m : null;
}
