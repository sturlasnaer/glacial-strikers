// The home rink's seasonal dressing (Batch CD): Halloween from 20 October to 1 November, the
// holidays from 1 December to 6 January, by the device's own calendar. No browser APIs here
// (the page can force one with ?season=halloween or ?season=holiday, to look at it).

let forced = null;
export const forceSeason = (s) => { forced = s === 'halloween' || s === 'holiday' ? s : s === 'none' ? 'none' : null; };

export function seasonFor(d = new Date()) {
  if (forced) return forced === 'none' ? null : forced;
  const m = d.getMonth() + 1, day = d.getDate();
  if ((m === 10 && day >= 20) || (m === 11 && day === 1)) return 'halloween';
  if (m === 12 || (m === 1 && day <= 6)) return 'holiday';
  return null;
}

// Halloween treats in the locker room (Batch DQ): a bowl on the floor, one treat a day in the
// season (a few coins); in the holidays a pile of presents, one a day (Batch DS). The day by the
// device's own calendar.
export const TREAT_COINS = 15;
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const treatTaken = (save, d = new Date()) => save.treatDay === dayKey(d);
export function takeTreat(save, d = new Date()) {
  if (!seasonFor(d) || treatTaken(save, d)) return false;
  save.treatDay = dayKey(d);
  save.coins = (save.coins || 0) + TREAT_COINS;
  return true;
}
