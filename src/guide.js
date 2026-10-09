// First-time guide: Coach Brekka introduces the hub one thing at a time. Each step has a
// moment (when), something to point at (target, a selector in the hub) and a line. A step
// shows once; using the thing it points at, or "Got it", marks it done.

export const GUIDE = [
  { id: 'play', when: (s) => s.record.played === 0, target: '#h-play', text: 'First things first: let\'s get a game in. Hit Play match when you\'re ready.' },
  { id: 'draft', when: (s, x) => x.draftOpen, target: '#h-draft', text: 'Draft Day! Three rookies want to join the club. Tap Draft Day to meet them and pick one.' },
  { id: 'legend', when: (s, x) => x.legendVisiting, target: '[data-tab="team"]', text: 'A legend is in town! They\'re in Team › Scouting, but only for a few matches.' },
  { id: 'points', when: (s, x) => x.anyPoints, target: '[data-tab="team"]', text: 'You\'ve got skill points to spend. Open the lockers and make them count.' },
  { id: 'training', when: (s) => s.record.played >= 1 && s.training.sessions > 0, target: '[data-tab="training"]', text: 'Every match refills two rewarded training sessions. Grab a stick at the rack and earn some EXP.' },
  { id: 'shop', when: (s, x) => x.shopNew, target: '[data-tab="shop"]', text: 'Ottar has gear you can afford. Special sticks and skates show on the ice, too.' },
  { id: 'scouting', when: (s, x) => x.scoutOpen, target: '[data-tab="team"]', text: 'Beat a team and their skaters will take your call. Check Scouting in the lockers.' },
  { id: 'daily', when: (s) => s.record.played >= 2, target: '#h-daily', text: 'There\'s a daily challenge every day, the same one for everyone. Keep a streak going and it pays more.' },
  { id: 'club', when: (s) => s.record.wins >= 1 && !s.club, target: '[data-tab="team"]', text: 'This is your club now. Rename it and pick your colours in Team › Club.' },
  { id: 'trophies', when: (s) => Object.keys((s.achievements && s.achievements.unlocked) || {}).length >= 1, target: '[data-tab="trophies"]', text: 'Your first trophy is in the chest. There are plenty more, and online leaderboards for the drills.' },
  { id: 'allstar', when: (s, x) => x.allstarNext, target: '#h-play', text: 'The All-Star break! The fans vote in the league\'s stars, and Skills Night comes first. Show them what you\'ve got.' },
  { id: 'dekes', when: (s) => s.record.played >= 3, target: '[data-tab="training"]', text: 'Practise the deke in the Breakaway drill: tap SPRINT close to the goalie, and if they bite, shoot the other way.' },
  { id: 'pshot', when: (s) => s.record.played >= 5, target: '#h-play', text: 'Careful chasing from behind: reach round a faster skater and the ref can call hooking. Haul down a breakaway and it\'s a penalty shot. If it\'s against us, you\'re in goal for it.' },
  { id: 'ghosts', when: (s) => !!(s.ghosts && (s.ghosts.cones || s.ghosts.breakaway)), target: '[data-tab="training"]', text: 'Your best Cone Weave and Breakaway runs are saved. Pick Ghost › Your best on the card and race yourself.' },
  { id: 'challenge', when: (s, x) => x.online && !!(s.ghosts && (s.ghosts.cones || s.ghosts.breakaway)) && s.record.played >= 3, target: '[data-tab="training"]', text: 'After a Cone Weave or Breakaway run, tap Challenge a friend and send them the link. They race your ghost.' },
  { id: 'supers', when: (s) => s.record.played >= 2, target: '[data-tab="team"]', text: 'Every player brings a style, with a trait that\'s always on, and a super: a skill and an ultimate. Mix them at the training camp: Change… on a Team card.' },
  { id: 'mixcombos', when: (s, x) => x.newCombo, target: '[data-tab="team"]', text: 'Different supers make different combos. Build chemistry between two players and their elements fire a combo of their own.' },
  { id: 'market', when: (s, x) => x.marketReady, target: '[data-tab="team"]', text: 'Vigga the agent has free agents on her list: veterans, ready to play. They\'re in Team › Scouting, and the faces change every few matches.' },
  { id: 'goalies', when: (s, x) => x.goalieTalk, target: '[data-tab="team"]', text: 'Their goalie will take your call too. A new style in net changes how a match plays: look in Scouting.' },
  { id: 'trades', when: (s, x) => x.tradeReady, target: '[data-tab="team"]', text: 'Got a signing or a rookie you don\'t need? Trade them for a rival\'s player: Trade, next to the price in Scouting.' },
  { id: 'gcamp', when: (s) => s.record.played >= 8 && s.coins >= 200, target: '[data-tab="team"]', text: 'Goalies go to camp too. Change style… on a goalie\'s card teaches them a new way to play the net, once a season.' },
  { id: 'expansion', when: (s, x) => x.expansion, target: '[data-tab="tournament"]', text: 'Two new clubs this season: the Owls wait for your mistakes, the Moose run you over. Seven rounds to the playoffs now.' },
  { id: 'masks', when: (s, x) => x.maskPick, target: '[data-tab="team"]', text: 'Your goalie is made from parts, so the mask is yours to pick: Change style… on their card has twelve designs and any paint. Free, any time.' },
  { id: 'crests', when: (s) => s.record.played >= 6 && !(s.club && s.club.crest && s.club.crest !== 'fox'), target: '[data-tab="team"]', text: 'The Snow Fox isn\'t the only crest: Team › Customise club has six more, all in your colours.' },
  { id: 'moonbeams', when: (s, x) => x.nextRule === 'moonbeams', target: '[data-tab="tournament"]', text: 'Next up, the Observatory: a pool of moonlight sweeps the ice. Shoot from inside it and the goalie squints.' },
  { id: 'planks', when: (s, x) => x.nextRule === 'loose_planks', target: '[data-tab="tournament"]', text: 'Next up, the Longhouse: some of its boards are loose. A puck off a loose plank goes anywhere, so don\'t rim it blind.' },
  { id: 'friends', when: (s, x) => x.online && s.record.played >= 4 && !((s.online && s.online.groups) || []).length, target: '[data-tab="training"]', text: 'Make a friends board under the cup in Training and share its code: the same boards with just your friends, every week.' },
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
