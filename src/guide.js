// First-time guide: Coach Brekka introduces the hub one thing at a time. Each step has a
// moment (when), something to point at (target, a selector in the hub) and a line. A step
// shows once; using the thing it points at, or "Got it", marks it done.

export const GUIDE = [
  { id: 'play', when: (s) => s.record.played === 0, target: '#h-play', text: 'First things first: let\'s get a game in. Hit Play match when you\'re ready.' },
  { id: 'points', when: (s, x) => x.anyPoints, target: '[data-tab="team"]', text: 'You\'ve got skill points to spend. Open the lockers and make them count.' },
  { id: 'training', when: (s) => s.record.played >= 1 && s.training.sessions > 0, target: '[data-tab="training"]', text: 'Every match refills two rewarded training sessions. Grab a stick at the rack and earn some EXP.' },
  { id: 'shop', when: (s, x) => x.shopNew, target: '[data-tab="shop"]', text: 'Ottar has gear you can afford. Special sticks and skates show on the ice, too.' },
  { id: 'scouting', when: (s, x) => x.scoutOpen, target: '[data-tab="team"]', text: 'Beat a team and their skaters will take your call. Check Scouting in the lockers.' },
  { id: 'daily', when: (s) => s.record.played >= 2, target: '#h-daily', text: 'There\'s a daily challenge every day, the same one for everyone. Keep a streak going and it pays more.' },
  { id: 'club', when: (s) => s.record.wins >= 1 && !s.club, target: '[data-tab="team"]', text: 'This is your club now. Rename it and pick your colours in Team › Club.' },
  { id: 'trophies', when: (s) => Object.keys((s.achievements && s.achievements.unlocked) || {}).length >= 1, target: '[data-tab="trophies"]', text: 'Your first trophy is in the chest. There are plenty more, and online leaderboards for the drills.' },
];

const state = (save) => (save.guide ||= { done: [], off: false, hints: [] });

export function nextGuide(save, ctx) {
  const g = state(save);
  if (g.off) return null;
  return GUIDE.find((step) => !g.done.includes(step.id) && step.when(save, ctx)) || null;
}

export function doneGuide(save, id) { const g = state(save); if (!g.done.includes(id)) g.done.push(id); }
export function guideOff(save) { state(save).off = true; }

// One-time hints during matches (ultimate ready, combo ready...): true the first time only.
export function firstTime(save, key) {
  const g = state(save);
  if (g.off || g.hints.includes(key)) return false;
  g.hints.push(key);
  return true;
}
