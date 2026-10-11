// Playable clubs: a new career's first choice. The Snowcrest Foxes' own story (Nix, Volta,
// Bram and Halla), or a career as one of the Frostline's clubs: its three stars and its goalie
// are the roster, it wears its own colours and crest, and the Foxes take its place in the
// league as a club like any other (useCareer and applyClub in data.js). Each has a story of its
// own: a line on the picker and the opening scene, spoken by the club's line-up (the 'us' lines'
// kits stand for its centre, winger and defender) and Kip.
import { TEAMS, CHARACTERS, GOALIE, RECRUITS, GOALIE_RECRUITS } from './data.js';

export const CLUB_CHOICES = ['foxes', 'lynx', 'comets', 'owls', 'rams', 'moose', 'ravens', 'royals', 'custom'];

export const CLUB_STORIES = {
  foxes: {
    tag: 'The classic',
    blurb: 'The Snowcrest Foxes: Nix, Volta, Bram and Halla. A young club with big dreams, and the story it all started with.',
    intro: [
      ['us', 'frost', 'Welcome to the Frostline Regional Cup, Foxes. Five rounds, then the top four play it off for the cup.'],
      ['us', 'thunder', 'Five rounds? I\'ll score five goals in the first match alone.'],
      ['us', 'stone', 'You\'ll score five because I\'m clearing the way. Pass to the open player, Volta.'],
      ['us', 'frost', 'Win matches, earn coins and EXP, then upgrade our gear in the hub. Let\'s go.'],
    ],
  },
  lynx: {
    tag: 'Underdogs',
    blurb: 'Pinewood\'s little club has never won a thing. Young, eager and nobody\'s pick: this is the season that changes.',
    intro: [
      ['kip', null, 'Folks, the Pinewood Lynx are back for another season. Nobody picks them to win. Nobody ever has.'],
      ['us', 'frost', 'Everyone says Pinewood never wins. This year we change that.'],
      ['us', 'thunder', 'I\'m going to skate so fast they won\'t even see me score!'],
      ['us', 'stone', 'Then I\'ll keep our end quiet. Pass it around and we can beat anyone.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. Let\'s go, Lynx!'],
    ],
  },
  comets: {
    tag: 'Hot heads',
    blurb: 'Ember\'s scorers shoot from everywhere and lose their tempers just as fast. Learn to pass, keep cool, and the cup is yours.',
    intro: [
      ['kip', null, 'From the volcano country, the Ember Comets! They score plenty. They also lose their heads plenty.'],
      ['us', 'thunder', 'Why pass when you can shoot? I say we shoot every single time!'],
      ['us', 'frost', 'Because the Royals laugh at us every spring. This year we pass first, then we shoot.'],
      ['us', 'stone', 'And I\'ll keep the fire out of our own net.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. Let\'s light it up!'],
    ],
  },
  owls: {
    tag: 'Newcomers',
    blurb: 'The Glacier Owls come down from the north a season early. Patient, sharp-eyed and brand new: show the old clubs how it\'s done.',
    intro: [
      ['kip', null, 'Big news: the Glacier Owls have joined the Frostline! The newest club in the league, and they\'ve been studying.'],
      ['us', 'frost', 'We\'ve watched every club\'s tapes. Now we get to play them.'],
      ['us', 'thunder', 'Watching is fine. Scoring is better. When do we start?'],
      ['us', 'stone', 'Patience. Short passes, heads up, and we wait for their mistakes.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. The north is here.'],
    ],
  },
  rams: {
    tag: 'Old guard',
    blurb: 'Gilded\'s heavy hitters ruled the Frostline once. The old guard wants one more cup before the young clubs take over.',
    intro: [
      ['kip', null, 'The Gilded Rams! Champions long ago, and they\'d like everyone to remember it.'],
      ['us', 'stone', 'In Gilded we settle things shoulder to shoulder. That hasn\'t changed.'],
      ['us', 'frost', 'The league has, though. The young clubs are fast. We have to be smart too.'],
      ['us', 'thunder', 'Smart, strong, and a wrist shot like a falling anvil. Let\'s bring the cup home.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. For Gilded!'],
    ],
  },
  moose: {
    tag: 'Stampede',
    blurb: 'The Thunder Moose charge in from the timber country a season early. Big, loud and impossible to move: knock the Frostline over.',
    intro: [
      ['kip', null, 'Make some room, folks: the Thunder Moose have joined the Frostline! Mind your toes.'],
      ['us', 'stone', 'Hear that rumble? That\'s us coming down the ice.'],
      ['us', 'thunder', 'STAMPEDE! Sorry. I get really excited.'],
      ['us', 'frost', 'Big is good. Big and clever is better. Move the puck and we\'ll flatten them.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. Let\'s stampede!'],
    ],
  },
  ravens: {
    tag: 'Always second',
    blurb: 'The Obsidian Ravens are always nearly there, second to the Royals year after year. Structure, discipline, and at last the top of the table.',
    intro: [
      ['kip', null, 'The Obsidian Ravens. Always so close. Always one step behind the Royals.'],
      ['us', 'frost', 'Second place is just first place with a mistake in it. We don\'t make mistakes.'],
      ['us', 'thunder', 'Then let\'s not make one this year. I\'m tired of watching the Royals\' parade.'],
      ['us', 'stone', 'Every player in their place, every pass on time. The cup will come.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. As calculated.'],
    ],
  },
  // a club of one's own: named and coloured in the club editor, three founding players and a
  // goalie made from parts; the Foxes stay in the league as neighbours from Snowcrest. (The
  // words for the Foxes in the lines are clubText's: they become the new club's name.)
  custom: {
    tag: 'Your story',
    blurb: 'A brand-new club of your own: your name, your colours, your crest, three founding players and a goalie. The Foxes stay in the league as your neighbours from Snowcrest.',
    intro: [
      ['kip', null, 'A brand-new club joins the Frostline tonight, right here in Snowcrest! Please welcome the Snowcrest Foxes!'],
      ['us', 'frost', 'New club, new kit, new story. Nobody knows us yet.'],
      ['us', 'thunder', 'They will soon. Wait till they see us skate!'],
      ['us', 'stone', 'Same town as the old club up the road. That makes every game against them a derby.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. Let\'s make some history.'],
    ],
  },
  royals: {
    tag: 'Champions',
    blurb: 'The Aurora Royals are the champions, and every club wants to knock them off the throne. The league\'s best stars: now keep the crown.',
    intro: [
      ['kip', null, 'The defending champions, the Aurora Royals! Every club in the Frostline wants their crown.'],
      ['us', 'frost', 'Let them try. Long live the Royals.'],
      ['us', 'thunder', 'Everyone plays their best game against us. Good. We\'ll play better.'],
      ['us', 'stone', 'Champions don\'t get comfortable. We defend the crown one game at a time.'],
      ['us', 'frost', 'Win games, earn coins and EXP, and build us up in the hub. The crown stays with us.'],
    ],
  },
};

// A club of one's own starts from these in the editor (the player names it), and its founders
// take names from these lists.
export const CUSTOM_CLUB = { name: 'Snowcrest Wolves', nick: 'Wolves', short: 'WLV', trim: '#e0303c', jersey: '#f6f1e9', crest: 'wolf' };
export const FOUNDER_NAMES = {
  C: ['Rowan', 'Juno', 'Sasha', 'Kai', 'Linnea', 'Emery'],
  W: ['Skye', 'Remy', 'Tove', 'Milo', 'Astrid', 'Jesse'],
  D: ['Bodhi', 'Ingrid', 'Rory', 'Sol', 'Freja', 'Arlo'],
  G: ['Wren', 'Signe', 'Teo', 'Hollis', 'Ylva', 'Quinn'],
};

// How strong a choice starts, against the Foxes' story (the game's tuning): its three stars'
// stats and twice its goalie's. 'tough', 'even' or 'strong' (one's own club starts even: founders
// like the cast). Worked out once, before any career moves the lists.
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const strength = (skaters, g) => skaters.reduce((a, b) => a + sum(b), 0) + 2 * (g.rfx + g.pos);
const BASELINE = strength(['frost', 'thunder', 'stone'].map((k) => CHARACTERS[k].base), GOALIE.base);
const START = Object.fromEntries(CLUB_CHOICES.filter((id) => id !== 'foxes' && id !== 'custom').map((id) => {
  const d = strength(['c', 'w', 'd'].map((k) => RECRUITS[`${id}_${k}`].base), GOALIE_RECRUITS[`${id}_g`].base) - BASELINE;
  return [id, d < -2 ? 'tough' : d > 7 ? 'strong' : 'even'];
}));
export const clubStart = (team) => START[team] || 'even';
export const START_NAMES = { tough: { name: 'Tough start' }, even: { name: 'Even start' }, strong: { name: 'Strong start' } };

// The first season's standings goal, as the club's story asks it (goals.js; the rest make the
// playoffs): the Ravens done with second place, the Royals keeping the crown, the old guard's
// one more final.
export const FIRST_GOAL = { ravens: 'top2', royals: 'cup', rams: 'final' };

// Who a choice starts with, for the picker: centre, winger, defender and goalie.
export function clubStars(team) {
  if (team === 'custom') return ['?', '?', '?', '?'];
  if (team === 'foxes') return [CHARACTERS.frost.name, CHARACTERS.thunder.name, CHARACTERS.stone.name, GOALIE.name];
  const n = TEAMS[team].names;
  return [n.frost, n.thunder, n.stone, n.goalie];
}

// Each story's payoff: a short scene after the club's first Cup (cup), and after its first
// Elite Cup, the top of the country (top); national and elite (below) are the chapters between. Spoken like the opening scene; in a club of one's
// own, the cast's names and the Foxes' are the founders' and the club's (clubText).
export const CLUB_PAYOFFS = {
  foxes: {
    cup: [
      ['kip', null, 'The Snowcrest Foxes are Frostline champions! The little club from Snowcrest has done it!'],
      ['us', 'thunder', 'Told you. Five goals in the first match, a cup at the end. Right on schedule.'],
      ['us', 'stone', 'You scored two in the first match, Volta.'],
      ['us', 'frost', 'Who\'s counting? We\'re champions. Big dreams, remember? This is only the start.'],
    ],
    top: [
      ['kip', null, 'Elite champions! The Snowcrest Foxes are the best club in the whole country!'],
      ['us', 'stone', 'From a pond in Snowcrest to the top of the country.'],
      ['us', 'thunder', 'Can we put the cup on the bus roof? Everyone should see it.'],
      ['us', 'frost', 'Everyone will. Thank you, all of you. What a story.'],
    ],
  },
  lynx: {
    cup: [
      ['kip', null, 'Unbelievable! The Pinewood Lynx are Frostline champions! The club nobody picked has won the cup!'],
      ['us', 'frost', 'Pinewood never wins, they said. Somebody go and tell them.'],
      ['us', 'thunder', 'I\'m going to run the cup round every pine tree in Pinewood!'],
      ['us', 'stone', 'We passed it around and beat everyone. Just like we said.'],
    ],
    top: [
      ['kip', null, 'The Pinewood Lynx are Elite champions! From nobody\'s pick to the best club in the country!'],
      ['us', 'stone', 'That empty trophy shelf back home is going to need to be a lot bigger.'],
      ['us', 'thunder', 'Did anyone even see me score? I was SO fast.'],
      ['us', 'frost', 'The whole country saw. Underdogs no more.'],
    ],
  },
  comets: {
    cup: [
      ['kip', null, 'The Ember Comets are Frostline champions! And folks, they passed the puck!'],
      ['us', 'thunder', 'Okay. Fine. Passing works. Don\'t tell anyone I said that.'],
      ['us', 'frost', 'Pass first, then shoot. Nobody\'s laughing at us this spring.'],
      ['us', 'stone', 'And the fire stayed out of our own net. Mostly.'],
    ],
    top: [
      ['kip', null, 'The Ember Comets are Elite champions! The hot heads kept their cool all the way to the top!'],
      ['us', 'thunder', 'Can I celebrate with one big slapshot? Into an empty net? Please?'],
      ['us', 'stone', 'Go on. You\'ve earned it.'],
      ['us', 'frost', 'From the volcano country to the top of the country. Light it up!'],
    ],
  },
  owls: {
    cup: [
      ['kip', null, 'The Glacier Owls are Frostline champions! Their very first season, and the cup is theirs!'],
      ['us', 'frost', 'We studied every club. We waited for every mistake. It worked.'],
      ['us', 'thunder', 'Told you scoring was better than watching.'],
      ['us', 'stone', 'Patience. I said patience. Now let\'s hang that banner up north.'],
    ],
    top: [
      ['kip', null, 'The Glacier Owls are Elite champions! The newest club in the Frostline is the best in the country!'],
      ['us', 'frost', 'There are no tapes left to watch. Every club has seen us now.'],
      ['us', 'thunder', 'And every club saw us win.'],
      ['us', 'stone', 'The north is here. And the north is staying.'],
    ],
  },
  rams: {
    cup: [
      ['kip', null, 'The Gilded Rams are Frostline champions again! The old guard has one more cup!'],
      ['us', 'stone', 'Shoulder to shoulder, the Gilded way. Some things never change.'],
      ['us', 'frost', 'And some things did. We were smart this year as well as strong.'],
      ['us', 'thunder', 'Take that old cup out of the glass case. It\'s got company now.'],
    ],
    top: [
      ['kip', null, 'The Gilded Rams are Elite champions! The proudest club in the Frostline is the best in the country!'],
      ['us', 'frost', 'The young clubs were fast. We were faster when it counted.'],
      ['us', 'stone', 'Hang it high in the hall, next to the old banners. Higher, even.'],
      ['us', 'thunder', 'For Gilded! For every Ram who ever wore the gold!'],
    ],
  },
  moose: {
    cup: [
      ['kip', null, 'The Thunder Moose are Frostline champions! Their first season, and they knocked the whole league over!'],
      ['us', 'thunder', 'STAMPEDE! Sorry. No, actually, not sorry this time. STAMPEDE!'],
      ['us', 'stone', 'Big and clever. Told you it would work.'],
      ['us', 'frost', 'Wait till the timber country hears. They\'ll hear us before they see us.'],
    ],
    top: [
      ['kip', null, 'The Thunder Moose are Elite champions! Mind your toes, everyone: the biggest club in the country is the best!'],
      ['us', 'stone', 'Hear that rumble? That\'s the whole country stamping its feet.'],
      ['us', 'thunder', 'Antler hats for everybody!'],
      ['us', 'frost', 'Nobody could move us. Nobody could stop us. Let\'s go home.'],
    ],
  },
  ravens: {
    cup: [
      ['kip', null, 'The Obsidian Ravens are Frostline champions! After all those years in second place, they\'re first!'],
      ['us', 'frost', 'First place. No mistakes in it. As calculated.'],
      ['us', 'thunder', 'Somebody take the second-place pennants off the wall. All of them.'],
      ['us', 'stone', 'Every player in their place, every pass on time. I said the cup would come.'],
    ],
    top: [
      ['kip', null, 'The Obsidian Ravens are Elite champions! Nobody is ahead of them now, not in the whole country!'],
      ['us', 'frost', 'I ran the numbers. There is no higher place to finish.'],
      ['us', 'thunder', 'So we\'re done being second? For good?'],
      ['us', 'stone', 'For good. Now let\'s draw some new arrows on that board.'],
    ],
  },
  royals: {
    cup: [
      ['kip', null, 'The Aurora Royals keep the crown! Every club came for it, and the Royals are champions again!'],
      ['us', 'frost', 'Long live the Royals. The cabinet needs another shelf.'],
      ['us', 'thunder', 'Everybody played their best game against us. We played better. Every time.'],
      ['us', 'stone', 'Champions don\'t get comfortable. Next season they\'ll come for it again.'],
    ],
    top: [
      ['kip', null, 'The Aurora Royals are Elite champions! The crown of the whole country belongs to them now!'],
      ['us', 'stone', 'A bigger kingdom, the same crown. We defended it one game at a time.'],
      ['us', 'thunder', 'The northern lights are out tonight. Even the sky is celebrating.'],
      ['us', 'frost', 'Long live the Royals. The crown stays with us.'],
    ],
  },
  custom: {
    cup: [
      ['kip', null, 'The Snowcrest Foxes are Frostline champions! A brand-new club, and already a cup of their own!'],
      ['us', 'frost', 'Nobody knew us when we started. Everybody knows us now.'],
      ['us', 'thunder', 'Wait till they see us skate, I said. Well, they saw.'],
      ['us', 'stone', 'And the old club up the road? They\'ll be hearing about this for years.'],
    ],
    top: [
      ['kip', null, 'The Snowcrest Foxes are Elite champions! From a brand-new club to the best in the country!'],
      ['us', 'stone', 'An empty locker room, a blank crest, one puck on the bench. Look at us now.'],
      ['us', 'thunder', 'We made history. Can we make some more?'],
      ['us', 'frost', 'Every season. This is our story, and it\'s only just started.'],
    ],
  },
};

// The middle chapters: our players' words when the club first goes up to the National and to
// the Elite, after Kip's welcome and the host club's (TIER_LINES in data.js).
const UP_LINES = {
  foxes: {
    national: [['us', 'thunder', 'The National Cup! New rinks, new rivals, new clubs to beat.'], ['us', 'stone', 'And new clubs who want to beat us. Stay sharp, everyone.']],
    elite: [['us', 'frost', 'The Elite. Not long ago this was a dream on a pond in Snowcrest.'], ['us', 'thunder', 'Now it\'s a real rink with real fans. Let\'s give them a show.']],
  },
  lynx: {
    national: [['us', 'thunder', 'Pinewood in the National Cup! Somebody pinch me.'], ['us', 'stone', 'Nobody picked us for this either. Same plan: pass it around.']],
    elite: [['us', 'frost', 'The little club from the pines, in the Elite. Imagine that.'], ['us', 'stone', 'Imagine it later. We have work to do.']],
  },
  comets: {
    national: [['us', 'thunder', 'New goalies to shoot at! Lots and lots of them.'], ['us', 'frost', 'And we pass first. Every time. Even here.']],
    elite: [['us', 'stone', 'The best clubs in the country. Keep your heads, and keep the fire in their net.'], ['us', 'thunder', 'Cool heads. Hot shots. Got it.']],
  },
  owls: {
    national: [['us', 'frost', 'A whole country of clubs we haven\'t studied yet. Get the tapes.'], ['us', 'thunder', 'Or we could just beat them. That works too.']],
    elite: [['us', 'stone', 'We came down from the north, and now we\'re at the top. Patience works.'], ['us', 'frost', 'Every club here has a weakness. We\'ll find each one.']],
  },
  rams: {
    national: [['us', 'stone', 'The old guard in the National. They\'ll learn what a Gilded check feels like.'], ['us', 'frost', 'Smart and strong, remember. Not just strong.']],
    elite: [['us', 'thunder', 'The Elite! The old banners never got this high.'], ['us', 'stone', 'Then we hang new ones. For Gilded.']],
  },
  moose: {
    national: [['us', 'thunder', 'New rinks to stampede through! Sorry. Not sorry.'], ['us', 'stone', 'Mind the boards in the new rinks. Some of them weren\'t built for us.']],
    elite: [['us', 'frost', 'The Elite. The biggest stage for the biggest club.'], ['us', 'thunder', 'Antler hats in the Elite stands. I can see it already.']],
  },
  ravens: {
    national: [['us', 'frost', 'A new table, and we finish at the top of it. That\'s the plan.'], ['us', 'stone', 'Every pass on time. Same as always.']],
    elite: [['us', 'thunder', 'No Royals to finish behind up here. Just us, and the best.'], ['us', 'frost', 'Then we finish first. As calculated.']],
  },
  royals: {
    national: [['us', 'frost', 'The crown goes national. Every club here wants to knock it off.'], ['us', 'thunder', 'Let them try. Long live the Royals.']],
    elite: [['us', 'stone', 'The Elite. A crown fit for the whole country.'], ['us', 'frost', 'Champions don\'t get comfortable. One game at a time.']],
  },
  custom: {
    national: [['us', 'frost', 'A club that didn\'t exist a few seasons ago, in the National Cup.'], ['us', 'thunder', 'Wait till they see us skate. Again.']],
    elite: [['us', 'stone', 'From an empty locker room to the Elite. Look at this place.'], ['us', 'frost', 'We built this. Now let\'s finish it.']],
  },
};
for (const [id, up] of Object.entries(UP_LINES)) Object.assign(CLUB_PAYOFFS[id], up);

// The story's chapters in order (Trophies › Our story), and which are open: the beginning
// always; the rest once the club has got there (cups and divisions as the save counts them, so
// saves from before the scenes can watch them too).
export function storyChapters(save) {
  const C = save.tierCups || {}, up = Math.max(save.tier || 0, save.tierTop || 0);
  return [
    { id: 'intro', open: true },
    { id: 'cup', open: (save.cups || 0) > 0 },
    { id: 'national', open: up >= 1 },
    { id: 'elite', open: up >= 2 },
    { id: 'top', open: (C.elite || 0) > 0 },
  ];
}

// The payoff due just after a Cup is won (counted: save.cups, save.tierCups), if any, once each:
// 'cup' for the club's first, 'top' for its first Elite Cup. Marks it seen.
export function payoffDue(save) {
  const seen = (save.payoffs ||= {});
  const key = (save.tierCups || {}).elite === 1 && save.tier === 2 && !seen.top ? 'top' : save.cups === 1 && !seen.cup ? 'cup' : null;
  if (!key) return null;
  seen[key] = true;
  return (CLUB_PAYOFFS[save.team || 'foxes'] || CLUB_PAYOFFS.foxes)[key];
}
