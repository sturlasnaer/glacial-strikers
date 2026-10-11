// Playable clubs: a new career's first choice. The Snowcrest Foxes' own story (Nix, Volta,
// Bram and Halla), or a career as one of the Frostline's clubs: its three stars and its goalie
// are the roster, it wears its own colours and crest, and the Foxes take its place in the
// league as a club like any other (useCareer and applyClub in data.js). Each has a story of its
// own: a line on the picker and the opening scene, spoken by the club's line-up (the 'us' lines'
// kits stand for its centre, winger and defender) and Kip.
import { TEAMS, CHARACTERS, GOALIE } from './data.js';

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

// Who a choice starts with, for the picker: centre, winger, defender and goalie.
export function clubStars(team) {
  if (team === 'custom') return ['?', '?', '?', '?'];
  if (team === 'foxes') return [CHARACTERS.frost.name, CHARACTERS.thunder.name, CHARACTERS.stone.name, GOALIE.name];
  const n = TEAMS[team].names;
  return [n.frost, n.thunder, n.stone, n.goalie];
}
