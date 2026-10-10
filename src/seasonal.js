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
