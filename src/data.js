// Game content: characters, gear, rival teams, tournament, dialogue.

import { t } from './i18n.js';
import { bodySprite, goalieArt } from './modular.js';

export const STAT_KEYS = ['spd', 'agi', 'sht', 'pas', 'chk', 'sta'];
export const STAT_NAMES = {
  spd: 'Speed', agi: 'Agility', sht: 'Shooting', pas: 'Passing', chk: 'Checking', sta: 'Stamina',
};
export const STAT_HINT = {
  spd: 'Top skating speed',
  agi: 'Acceleration and turning',
  sht: 'Shot power and accuracy',
  pas: 'Pass speed, accuracy and puck control',
  chk: 'Hit power and knockback resistance',
  sta: 'Sprint and check energy',
};

// Sprite ids match the atlas skater keys.
export const CHARACTERS = {
  frost: {
    id: 'frost', sprite: 'frost_captain', name: 'Nix', title: 'Frost Captain', role: 'C', hand: 'L', arch: 'playmaker', elem: 'frost',
    blurb: 'Calm playmaker. Lays down ice trails that speed up the whole line.',
    base: { spd: 6, agi: 7, sht: 7, pas: 8, chk: 4, sta: 6 },
    skill: { id: 'glide', name: 'Glacier Glide', icon: 'hud_elements/ability/frost', cd: 12,
      text: 'Leave an ice trail for 3s. Teammates on it skate 30% faster.' },
    ult: { id: 'zero', name: 'Absolute Zero', icon: 'hud_elements/ability/frost', needsPuck: true,
      text: 'A freezing shot that slows every defender it passes.' },
    perks: [
      ['Long Glide: trail lasts 1.5s longer', 'Cold Snap: opponents on your trail are slowed'],
      ['Quick Release: wrist shots 10% faster', 'Vision: passes travel 12% faster'],
      ['Deep Freeze: Absolute Zero slows for longer', 'Captain: ultimate meter fills 15% faster'],
    ],
  },
  thunder: {
    id: 'thunder', sprite: 'thunder_winger', name: 'Volta', title: 'Thunder Winger', role: 'W', hand: 'R', arch: 'speedster', elem: 'thunder',
    blurb: 'Fastest skater on the ice. Blinks through gaps with a lightning dash.',
    base: { spd: 9, agi: 8, sht: 6, pas: 5, chk: 3, sta: 5 },
    skill: { id: 'dash', name: 'Bolt Dash', icon: 'hud_elements/ability/lightning', cd: 7,
      text: 'Dash through open ice. You can\'t be checked mid-dash.' },
    ult: { id: 'thunderclap', name: 'Thunderclap', icon: 'hud_elements/ability/lightning', needsPuck: true,
      text: 'Wind up for 0.6s, then fire the fastest shot in the game.' },
    perks: [
      ['Afterimage: dash 25% farther', 'Static: dash cooldown 2s shorter'],
      ['Breakaway: sprint costs 20% less stamina', 'Sniper: shots 15% more accurate'],
      ['Overcharge: Thunderclap winds up faster', 'Storm Rider: ultimate meter fills 15% faster'],
    ],
  },
  stone: {
    id: 'stone', sprite: 'stone_defender', name: 'Bram', title: 'Stone Defender', role: 'D', hand: 'L', arch: 'blueliner', elem: 'stone',
    blurb: 'Immovable blueliner with a cannon slapshot and bone-rattling checks.',
    base: { spd: 4, agi: 4, sht: 8, pas: 5, chk: 9, sta: 8 },
    skill: { id: 'bedrock', name: 'Bedrock', icon: 'hud_elements/ability/stone', cd: 13,
      text: 'For 4s you can\'t be knocked back and your checks always strip the puck.' },
    ult: { id: 'monolith', name: 'Monolith', icon: 'hud_elements/ability/stone', needsPuck: false,
      text: 'Raise a stone wall that blocks one shot or passing lane.' },
    perks: [
      ['Landslide: Bedrock lasts 2s longer', 'Aftershock: checks knock opponents farther'],
      ['Cannon: slapshots charge 25% faster', 'Outlet: passes travel 12% faster'],
      ['Fortress: Monolith lasts twice as long', 'Bulwark: ultimate meter fills 15% faster'],
    ],
  },
};

// Supers: each element brings a skill and an ultimate, with the perks that go with them (the
// first and third perk choices). Frost, Thunder and Stone are our cast's; the rest turn up on
// rivals, rookies and free agents.
const cast = (k) => ({ skill: CHARACTERS[k].skill, ult: CHARACTERS[k].ult, perks: [CHARACTERS[k].perks[0], CHARACTERS[k].perks[2]] });
export const ELEMENTS = {
  frost: { id: 'frost', name: 'Frost', color: '#7fe3ff', icon: 'hud_elements/ability/frost', ...cast('frost') },
  thunder: { id: 'thunder', name: 'Thunder', color: '#ffe066', icon: 'hud_elements/ability/lightning', ...cast('thunder') },
  stone: { id: 'stone', name: 'Stone', color: '#c9b79c', icon: 'hud_elements/ability/stone', ...cast('stone') },
  ember: {
    id: 'ember', name: 'Ember', color: '#ff7a3d', icon: 'hud_elements/ability/fire',
    skill: { id: 'heat', name: 'Heat Check', icon: 'hud_elements/ability/fire', cd: 10,
      text: 'Light up your stick: your next shot in the next 4s flies 20% faster and goalies can hardly hold it.' },
    ult: { id: 'firestorm', name: 'Firestorm', icon: 'hud_elements/ability/fire', needsPuck: true,
      text: 'A blazing shot that knocks back anyone it passes and leaves the goalie a nasty rebound.' },
    perks: [
      ['Kindling: Heat Check cooldown 3s shorter', 'Scorch: an ignited shot stuns anyone who blocks it'],
      ['Inferno: Firestorm flies 10% faster', 'Fuel: ultimate meter fills 15% faster'],
    ],
  },
  gale: {
    id: 'gale', name: 'Gale', color: '#bff0dc', icon: 'hud_elements/ability/stamina',
    skill: { id: 'tailwind', name: 'Tailwind', icon: 'hud_elements/ability/stamina', cd: 11,
      text: 'A gust at your back: you and teammates nearby skate 30% faster for 2s.' },
    ult: { id: 'cyclone', name: 'Cyclone', icon: 'hud_elements/ability/stamina', needsPuck: false,
      text: 'A whirlwind around you for 2.5s: opponents are blown out of it and a loose puck is pulled to your stick.' },
    perks: [
      ['Jet Stream: Tailwind lasts 1s longer', 'Updraft: Tailwind refills 15 stamina for everyone it touches'],
      ['Eye of the Storm: Cyclone lasts 1s longer', 'Squall: ultimate meter fills 15% faster'],
    ],
  },
  shadow: {
    id: 'shadow', name: 'Shadow', color: '#9b8cff', icon: 'hud_elements/ability/gravity',
    skill: { id: 'fade', name: 'Fade', icon: 'hud_elements/ability/gravity', cd: 12,
      text: 'Melt into the shadows for 3s: checks miss you and nobody can pick off a pass to or from you.' },
    ult: { id: 'eclipse', name: 'Eclipse', icon: 'hud_elements/ability/gravity', needsPuck: true,
      text: 'The puck vanishes into shadow as you shoot, and the goalie reads it late.' },
    perks: [
      ['Nightfall: Fade lasts 1.5s longer', 'Ambush: your first check out of Fade always strips the puck'],
      ['Total Eclipse: goalies can never hold an Eclipse', 'Dusk: ultimate meter fills 15% faster'],
    ],
  },
};

// Art on its way (Batch AL): once these frames are in the atlas, the newer supers and the
// combos of the newer pairs use them instead of the stand-ins.
const AL_ICONS = { heat: 'heat_check', tailwind: 'tailwind', fade: 'fade', firestorm: 'firestorm', cyclone: 'cyclone', eclipse: 'eclipse' };
export function useNewArt(has) {
  for (const E of [ELEMENTS.ember, ELEMENTS.gale, ELEMENTS.shadow]) {
    if (has('hud_elements/ability/' + E.id)) E.icon = 'hud_elements/ability/' + E.id;
    for (const a of [E.skill, E.ult]) if (has('hud_elements/ability/' + AL_ICONS[a.id])) a.icon = 'hud_elements/ability/' + AL_ICONS[a.id];
  }
  for (const c of Object.values(COMBOS)) {
    const id = 'icons/combo_' + c.name.toLowerCase().replace(/ö/g, 'o').replace(/[^a-z]+/g, '_');
    if (!c.icon && has(id)) c.icon = id;
  }
}

// Archetypes: how a player plays. Each brings a trait that's always on, the middle perk
// choice, and what the AI leans toward with them.
export const ARCHETYPES = {
  playmaker: { id: 'playmaker', name: 'archetype::Playmaker', roles: 'CW', trait: 'Passes travel 6% faster.', perks: CHARACTERS.frost.perks[1], ai: { pass: 1.25 } },
  speedster: { id: 'speedster', name: 'archetype::Speedster', roles: 'CW', trait: 'Sprints 5% faster.', perks: CHARACTERS.thunder.perks[1], ai: { rush: 1.25 } },
  blueliner: { id: 'blueliner', name: 'archetype::Blueliner', roles: 'D', trait: 'Slapshots fly 6% faster.', perks: CHARACTERS.stone.perks[1], ai: { slap: 1.3 } },
  sniper: { id: 'sniper', name: 'archetype::Sniper', roles: 'CW', trait: 'Shots are 12% more accurate.', ai: { shoot: 1.3 },
    perks: ['Quick Release: wrist shots 10% faster', 'Sniper: shots 15% more accurate'] },
  dangler: { id: 'dangler', name: 'archetype::Dangler', roles: 'CW', trait: 'With the puck, one check in five slides right off.', ai: { rush: 1.15 },
    perks: ['Slippery: 15% more checks slide off you', 'Vision: passes travel 12% faster'] },
  grinder: { id: 'grinder', name: 'archetype::Grinder', roles: 'CWD', trait: 'Stamina comes back 15% faster and steals come 8% easier.', ai: { chase: 1.2 },
    perks: ['Engine: stamina comes back 20% faster', 'Pickpocket: steals come 10% easier'] },
  enforcer: { id: 'enforcer', name: 'archetype::Enforcer', roles: 'CWD', trait: 'Checks hit 12% harder, and hits move you 12% less.', ai: {},
    perks: ['Thick Skin: shrug off hits 30% faster', 'Cannon: slapshots charge 25% faster'] },
};

// A player's full kit: the position's art and cast data, the archetype's trait and perks, the
// element's skill, ultimate and perks. Cached, so the same mix is the same object.
const DEFS = new Map();
export function makeDef(kit, arch, elem) {
  const c = CHARACTERS[kit];
  arch = ARCHETYPES[arch] ? arch : c.arch; elem = ELEMENTS[elem] ? elem : c.elem;
  if (arch === c.arch && elem === c.elem) return c;
  const key = `${kit}|${arch}|${elem}`;
  if (!DEFS.has(key)) {
    const E = ELEMENTS[elem], A = ARCHETYPES[arch];
    DEFS.set(key, { ...c, arch, elem, skill: E.skill, ult: E.ult, perks: [E.perks[0], A.perks, E.perks[1]] });
  }
  return DEFS.get(key);
}

// Which tier and choice a perk is, in any kit (old saves keep perks as text; a player whose
// element or archetype changed gets the same choice from their new lists).
export function perkSlot(text) {
  const lists = [...Object.values(ELEMENTS).flatMap((e) => [[0, e.perks[0]], [2, e.perks[1]]]), ...Object.values(ARCHETYPES).map((a) => [1, a.perks])];
  for (const [tier, opts] of lists) { const i = opts.indexOf(text); if (i >= 0) return { tier, i }; }
  return null;
}

export const GOALIE = {
  id: 'goalie', name: 'Halla', title: 'Goaltender', base: { rfx: 6, pos: 6 }, gstyle: 'hybrid',
};

// How a goalie plays. mods: reach (added), lat (side-to-side speed, x), react (reaction delay, x),
// low/high (reach added in the butterfly for low and high shots), roam (how keen they are to
// leave the crease for a puck: lower is keener; 0.2 for everyone else).
export const GOALIE_STYLES = {
  hybrid: { id: 'hybrid', name: 'Hybrid', text: 'Balanced: no weak spots, no tricks.', mods: {} },
  scrambler: { id: 'scrambler', name: 'Scrambler', text: 'Quick side to side and quick to react, with a little less reach.', mods: { lat: 1.15, reach: -0.5, react: 0.92 } },
  butterfly: { id: 'butterfly', name: 'Butterfly', text: 'Seals the ice when down, but the top of the net opens up.', mods: { low: 2.5, high: -1.5 } },
  wall: { id: 'wall', name: 'Wall', text: 'Big and square: covers more net, slower to move, stays home.', mods: { reach: 0.7, lat: 0.82, react: 1.1, roam: 0.45 } },
  reader: { id: 'reader', name: 'Reader', text: 'Reads the shot early, but slow to get across for a pass.', mods: { react: 0.88, lat: 0.85 } },
  puckhandler: { id: 'puckhandler', name: 'Puck-handler', text: 'Leaves the crease to play pucks behind the net whenever it can.', mods: { roam: -0.15 } },
};

// tier: sold once the club reaches that division (1 the National, 2 the Elite; tierTop in
// tiers.js). art: the piece's own icon (Batch ET), worn once it's in; until then the icon of a
// piece like it (useGearArt).
export const GEAR = [
  // sticks
  { id: 'stick_wood', slot: 'stick', name: 'Birch Twig', icon: 'equipment_items/stick/wood', price: 0, mods: {}, text: 'Reliable starter stick.' },
  { id: 'stick_pass', slot: 'stick', name: 'Tape-to-Tape', icon: 'equipment_items/stick/passing', price: 120, mods: { pas: 2, sht: -1 }, text: 'Soft flex for crisp passes.' },
  { id: 'stick_slap', slot: 'stick', name: 'Cannon Shaft', icon: 'equipment_items/stick/slapshot', price: 160, mods: { sht: 2, agi: -1 }, text: 'Heavy and stiff. Big shot, slower hands.' },
  { id: 'stick_frost', slot: 'stick', name: 'Rimefang', icon: 'equipment_items/stick/frost', price: 320, mods: { sht: 1, pas: 2 }, text: 'Carved from glacier ice.' },
  { id: 'stick_bolt', slot: 'stick', name: 'Stormcaller', icon: 'equipment_items/stick/lightning', price: 360, mods: { sht: 2, spd: 1, pas: -1 }, text: 'Crackles when you wind up.' },
  { id: 'stick_grav', slot: 'stick', name: 'Event Horizon', icon: 'equipment_items/stick/gravity', price: 480, mods: { sht: 3, agi: -1, pas: -1 }, text: 'Shots feel heavier than they should.' },
  { id: 'stick_capital', slot: 'stick', tier: 1, name: 'Capital Carbon', icon: 'equipment_items/stick/passing', art: 'equipment_items/stick/capital', price: 620, mods: { sht: 2, pas: 2, agi: -1 }, text: 'Light, stiff and true. Made for the big rinks.' },
  { id: 'stick_aurora', slot: 'stick', tier: 2, name: 'Northern Light', icon: 'equipment_items/stick/frost', art: 'equipment_items/stick/aurora', price: 980, mods: { sht: 3, pas: 2, sta: -1 }, text: 'Glows green in the dark. Shots seem to bend.' },
  // skates
  { id: 'skate_start', slot: 'skates', name: 'Rental Blades', icon: 'equipment_items/skates/starter', price: 0, mods: {}, text: 'They fit. Mostly.' },
  { id: 'skate_agile', slot: 'skates', name: 'Pivot Pros', icon: 'equipment_items/skates/agile', price: 140, mods: { agi: 2, spd: -1 }, text: 'Short blades for tight turns.' },
  { id: 'skate_race', slot: 'skates', name: 'Long Track', icon: 'equipment_items/skates/racing', price: 150, mods: { spd: 2, agi: -1 }, text: 'Built for straight lines.' },
  { id: 'skate_tank', slot: 'skates', name: 'Iron Boots', icon: 'equipment_items/skates/reinforced', price: 170, mods: { chk: 1, sta: 1, spd: -1 }, text: 'Plant your feet and hit.' },
  { id: 'skate_frost', slot: 'skates', name: 'Hoarfrost Edges', icon: 'equipment_items/skates/frost', price: 340, mods: { spd: 1, agi: 2 }, text: 'Never lose an edge.' },
  { id: 'skate_bolt', slot: 'skates', name: 'Bolt Runners', icon: 'equipment_items/skates/lightning', price: 420, mods: { spd: 3, sta: -1, agi: -1 }, text: 'Blinding speed, tiring stride.' },
  { id: 'skate_capital', slot: 'skates', tier: 1, name: 'Glidemasters', icon: 'equipment_items/skates/racing', art: 'equipment_items/skates/capital', price: 640, mods: { spd: 2, agi: 2, sta: -1 }, text: 'Fast and nimble, if a little tiring.' },
  { id: 'skate_aurora', slot: 'skates', tier: 2, name: 'Diamond Edges', icon: 'equipment_items/skates/frost', art: 'equipment_items/skates/aurora', price: 980, mods: { spd: 3, agi: 2, sta: -1 }, text: 'The sharpest blades in the country.' },
  // protection
  { id: 'arm_none', slot: 'armor', name: 'Practice Jersey', icon: 'equipment_items/armor/chest', price: 0, mods: {}, text: 'Light and breezy.' },
  { id: 'arm_vest', slot: 'armor', name: 'Padded Vest', icon: 'icons/gear_padded_vest', price: 110, mods: { sta: 2, spd: -1 }, text: 'Extra stamina for long shifts.' },
  { id: 'arm_should', slot: 'armor', name: 'Rampart Pads', icon: 'equipment_items/armor/shoulders', price: 180, mods: { chk: 2, agi: -1 }, text: 'Bounce checks right back.' },
  { id: 'arm_helm', slot: 'armor', name: 'Visor Helm', icon: 'equipment_items/armor/helmet', price: 150, mods: { pas: 1, sta: 1 }, text: 'Clear view of the ice.' },
  { id: 'arm_glove', slot: 'armor', name: 'Grip Gloves', icon: 'equipment_items/armor/gloves', price: 200, mods: { sht: 1, pas: 1, chk: -1 }, text: 'Soft hands, thin padding.' },
  { id: 'arm_legs', slot: 'armor', name: 'Glacier Guards', icon: 'equipment_items/armor/leg_guards', price: 260, mods: { chk: 2, sta: 2, spd: -1 }, text: 'Shot-blocking armour.' },
  { id: 'arm_capital', slot: 'armor', tier: 1, name: 'Captain\'s Harness', icon: 'icons/gear_padded_vest', art: 'equipment_items/armor/capital', price: 580, mods: { sta: 3, chk: 1, agi: -1 }, text: 'Built for the long shifts of the National game.' },
  { id: 'arm_aurora', slot: 'armor', tier: 2, name: 'Diamond Plate', icon: 'equipment_items/armor/chest', art: 'equipment_items/armor/aurora', price: 920, mods: { chk: 2, sta: 2, sht: 1, spd: -1 }, text: 'Light armour that gives nothing away.' },
  // goalie (rfx: reflexes, pos: angles)
  { id: 'g_start', slot: 'goalie', name: 'Old Mitts', icon: 'equipment_items/armor/goalie_gloves', price: 0, mods: {}, text: 'Patched more than once.' },
  { id: 'g_block', slot: 'goalie', name: 'Brick Blocker', icon: 'equipment_items/armor/goalie_gloves', art: 'equipment_items/goalie/blocker', price: 180, mods: { pos: 2, rfx: -1 }, text: 'Big and square: covers the angles, a beat slower.' },
  { id: 'g_glove', slot: 'goalie', name: 'Snapjaw Glove', icon: 'icons/gear_pro_mitts', art: 'equipment_items/goalie/snapjaw', price: 220, mods: { rfx: 2, pos: -1 }, text: 'Snaps shut on anything, but tempts you out of position.' },
  { id: 'g_pro', slot: 'goalie', name: 'Halla\'s Pro Set', icon: 'icons/gear_pro_mitts', price: 380, mods: { rfx: 2 }, text: 'Faster glove, quicker pads.' },
  { id: 'g_capital', slot: 'goalie', tier: 1, name: 'Capital Pads', icon: 'equipment_items/armor/goalie_gloves', art: 'equipment_items/goalie/capital', price: 600, mods: { rfx: 1, pos: 2 }, text: 'Wide pads that close the gaps.' },
  { id: 'g_diamond', slot: 'goalie', tier: 2, name: 'Diamond Mitts', icon: 'icons/gear_pro_mitts', art: 'equipment_items/goalie/diamond', price: 980, mods: { rfx: 2, pos: 2 }, text: 'The Elite\'s finest glove and pads.' },
];
// The pieces' own icons once they're drawn.
export function useGearArt(frames) { for (const g of GEAR) if (g.art && frames[g.art]) g.icon = g.art; }
// Is it on sale yet? (division gear: once the club has reached that division)
export const gearOpen = (save, g) => (g.tier || 0) <= Math.max((save && save.tier) || 0, (save && save.tierTop) || 0);

export const GEAR_BY_ID = Object.fromEntries(GEAR.map((g) => [g.id, g]));

// How gear shows on the ice. Sticks glow at the blade (and colour shots), skates leave
// a trail, protection shows when it does its job. Starter gear has no look.
// color/accent also drive recolour masks for sticks and skates when that art exists.
export const GEAR_LOOK = {
  stick_pass: { color: '#5fd3e6', accent: '#e8fbff', fx: 'tape', desc: 'Tape-blue glow on the puck and shot trail' },
  stick_slap: { color: '#c9752e', accent: '#ffd27a', fx: 'heat', desc: 'Heat haze on the windup' },
  stick_frost: { color: '#9fe8ff', accent: '#ffffff', fx: 'frost', desc: 'Frost mist and an icy shot trail' },
  stick_bolt: { color: '#ffd23f', accent: '#fffbd1', fx: 'sparks', desc: 'Sparks crackle on the windup' },
  stick_grav: { color: '#8a55e0', accent: '#e3cfff', fx: 'swirl', desc: 'Purple swirl and a gravity ring on release' },
  // mark: the colour each stride cuts into the ice
  skate_agile: { color: '#8fd0ff', trail: 'carve', mark: 'rgba(120,190,255,0.6)', desc: 'Bright carve spray on tight turns' },
  skate_race: { color: '#d8ecff', trail: 'streak', mark: 'rgba(110,170,240,0.55)', long: true, desc: 'Long blue speed lines' },
  skate_tank: { color: '#6f7a8f', trail: 'gouge', mark: 'rgba(45,55,75,0.5)', wide: true, desc: 'Deep dark gouges in the ice' },
  skate_frost: { color: '#7fe3ff', trail: 'frost', mark: 'rgba(60,200,235,0.65)', desc: 'Frost trail and cyan skate marks' },
  skate_bolt: { color: '#ffd23f', trail: 'sparks', mark: 'rgba(255,190,30,0.65)', desc: 'Sparks and golden skate marks' },
  arm_vest: { show: 'puff', desc: 'Soft puff when you take a hit' },
  arm_should: { show: 'shield', color: '#d8c39a', desc: 'Stone shield flash when you\'re hit' },
  arm_helm: { show: 'glint', desc: 'Visor glint' },
  arm_glove: { show: 'grip', color: '#ffd45e', desc: 'Golden sparkle on clean catches' },
  arm_legs: { show: 'guard', color: '#bff4ff', desc: 'Icy flash on blocked shots' },
  // the divisions' gear
  stick_capital: { color: '#c8d2e0', accent: '#ffffff', fx: 'tape', desc: 'Silver glow on the puck and shot trail' },
  stick_aurora: { color: '#5ff2b0', accent: '#e0fff3', fx: 'swirl', desc: 'Green aurora swirl and a ring on release' },
  skate_capital: { color: '#e6e9f2', trail: 'carve', mark: 'rgba(205,215,235,0.6)', desc: 'Silver carve spray on tight turns' },
  skate_aurora: { color: '#bfefff', trail: 'frost', mark: 'rgba(170,240,255,0.65)', desc: 'Diamond frost trail and bright skate marks' },
  arm_capital: { show: 'shield', color: '#d9e0ea', desc: 'Silver shield flash when you\'re hit' },
  arm_aurora: { show: 'guard', color: '#e9fbff', desc: 'Diamond flash on blocked shots' },
};

// Rival teams use the away sprites. recolor shifts the coral/violet jersey hues. habit: how the
// club likes to attack (ai.js: shoot / pass shift its shoot-or-pass choices, deke / dump / slap
// scale how often it dekes, dumps the puck in and winds up a slapshot; never how hard it presses).
export const TEAMS = {
  home: {
    id: 'home', name: 'Snowcrest Foxes', short: 'FOX', crest: 'hud_elements/misc/home_crest',
    color: '#71dce8', color2: '#fff2cb',
  },
  lynx: {
    elems: { thunder: 'gale' }, // supers other than the slot's own
    id: 'lynx', habit: { pass: 0.05, deke: 1.2 }, plan: 'forecheck', chem: 0, name: 'Pinewood Lynx', short: 'PIN', crest: 'hud_elements/misc/away_crest',
    art: 'pinewood_lynx', arena: 'pine_pond',
    color: '#7fd16b', color2: '#2f6b3a', recolor: { h1: 118, h2: 95, sat: 0.9, val: 0.92, sat2: 0.8, val2: 0.55 },
    diff: 0.12, bonus: { spd: -1, chk: -1 }, goalie: { rfx: 4, pos: 4 },
    names: { frost: 'Fern', thunder: 'Pip', stone: 'Oakley', goalie: 'Moss' },
    gstyle: 'scrambler', subs: { goalie: 'Thistle', frost: 'Birch', thunder: 'Skip', stone: 'Stump' }, // who plays the slot after you sign its skater
    style: 'Young and eager. They chase the puck in a pack.',
  },
  comets: {
    elems: { thunder: 'ember' }, // supers other than the slot's own
    id: 'comets', habit: { shoot: 0.12, pass: -0.08, slap: 1.4 }, plan: 'rungun', chem: 1, name: 'Ember Comets', short: 'EMB', crest: 'hud_elements/misc/away_crest',
    art: 'ember_comets', arena: 'ember_dome',
    color: '#ff6f7d', color2: '#8261bd',
    diff: 0.35, bonus: {}, goalie: { rfx: 5, pos: 5 },
    names: { frost: 'Cinder', thunder: 'Blaze', stone: 'Ash', goalie: 'Smolder' },
    gstyle: 'butterfly', subs: { goalie: 'Ashby', frost: 'Flint', thunder: 'Spark', stone: 'Coal' }, // who plays the slot after you sign its skater
    style: 'Hot-headed scorers who shoot from everywhere.',
  },
  rams: {
    id: 'rams', habit: { dump: 1.6, slap: 1.2 }, plan: 'forecheck', chem: 1, name: 'Gilded Rams', short: 'RAM', crest: 'hud_elements/misc/away_crest',
    art: 'gilded_rams', arena: 'golden_hall',
    color: '#ffd45e', color2: '#a86b1d', recolor: { h1: 44, h2: 22, sat: 1.0, val: 1.05, sat2: 0.9, val2: 0.65 },
    diff: 0.55, bonus: { sht: 1, chk: 1 }, goalie: { rfx: 6, pos: 6 },
    names: { frost: 'Aurum', thunder: 'Gilda', stone: 'Horn', goalie: 'Bulwark' },
    gstyle: 'wall', subs: { goalie: 'Ingot', frost: 'Bullion', thunder: 'Brass', stone: 'Crag' }, // who plays the slot after you sign its skater
    style: 'Heavy hitters with heavier slapshots.',
  },
  ravens: {
    elems: { thunder: 'shadow' }, // supers other than the slot's own
    id: 'ravens', habit: { pass: 0.12 }, plan: 'trap', chem: 2, name: 'Obsidian Ravens', short: 'RAV', crest: 'hud_elements/misc/away_crest',
    art: 'obsidian_ravens', arena: 'dark_aerie',
    color: '#9aa3b5', color2: '#2a2f3d', recolor: { h1: 220, h2: 220, sat: 0.12, val: 0.66, sat2: 0.15, val2: 0.4 },
    diff: 0.72, bonus: { agi: 1, pas: 1, chk: 1 }, goalie: { rfx: 7, pos: 7 },
    names: { frost: 'Corvin', thunder: 'Nyx', stone: 'Basalt', goalie: 'Grim' },
    gstyle: 'puckhandler', subs: { goalie: 'Murk', frost: 'Rook', thunder: 'Shade', stone: 'Onyx' }, // who plays the slot after you sign its skater
    style: 'Disciplined, fast passing, punishing on the forecheck.',
  },
  royals: {
    id: 'royals', habit: { deke: 1.4, shoot: 0.05 }, plan: 'counter', chem: 3, name: 'Aurora Royals', short: 'AUR', crest: 'hud_elements/misc/away_crest',
    art: 'aurora_royals', arena: 'aurora_palace',
    color: '#c58cff', color2: '#43207a', recolor: { h1: 284, h2: 46, sat: 0.95, val: 0.92, sat2: 1.0, val2: 1.0 },
    diff: 0.9, bonus: { spd: 1, sht: 1, pas: 1, chk: 1 }, goalie: { rfx: 8, pos: 8 },
    names: { frost: 'Solenne', thunder: 'Aurelio', stone: 'Regalia', goalie: 'Crown' },
    gstyle: 'reader', subs: { goalie: 'Squire', frost: 'Regent', thunder: 'Herald', stone: 'Bastion' }, // who plays the slot after you sign its skater
    style: 'Defending champions. No weaknesses, plenty of swagger.',
  },
  // The expansion clubs, from the second season of a save (league.js): no roster art of
  // their own, so their players are made from parts (looks) in the team's colours, and their
  // goalies too (goalieLook). Their crests, buildings, mascots and captains' banners come from
  // Batch AU under their mark.
  owls: {
    elems: { thunder: 'gale', stone: 'frost' }, // supers other than the slot's own
    id: 'owls', habit: { pass: 0.1, shoot: -0.05 }, plan: 'counter', chem: 1, name: 'Glacier Owls', short: 'OWL', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'glacier_owls', arena: 'owl_observatory', expansion: true,
    goalieLook: { mask: 'stars', paint: '#dbe7f3', body: 'small' }, // (their goalie, made from parts: Batch AT, a small build from AX)
    looks: { frost: { body: 'small', head: 'glasses', skin: 0, hair: 4 }, thunder: { body: 'std', head: 'visor', skin: 2, hair: 5 }, stone: { body: 'big', head: 'beard', skin: 1, hair: 7 } },
    color: '#e8eef5', color2: '#4a5568', recolor: { h1: 210, h2: 215, sat: 0.08, val: 1.08, sat2: 0.25, val2: 0.5 },
    diff: 0.45, bonus: { agi: 1, pas: 1, chk: -1 }, goalie: { rfx: 6, pos: 5 },
    names: { frost: 'Talon', thunder: 'Strix', stone: 'Boreas', goalie: 'Hush' },
    gstyle: 'hybrid', subs: { goalie: 'Hollow', frost: 'Plume', thunder: 'Feather', stone: 'Perch' }, // who plays the slot after you sign its skater
    style: 'Patient and sharp-eyed. They wait for your mistake, then pounce.',
  },
  moose: {
    elems: { frost: 'ember' }, // supers other than the slot's own
    id: 'moose', habit: { dump: 1.4, slap: 1.3 }, plan: 'forecheck', chem: 2, name: 'Thunder Moose', short: 'MOO', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'thunder_moose', arena: 'moose_longhouse', expansion: true,
    goalieLook: { mask: 'wolf_teeth', paint: '#f2a93b', body: 'big' }, // (a big build)
    looks: { frost: { body: 'std', head: 'moustache', skin: 3, hair: 1 }, thunder: { body: 'small', head: 'mohawk', skin: 4, hair: 6 }, stone: { body: 'big', head: 'cage', skin: 2, hair: 0 } },
    color: '#2f7a4a', color2: '#f2a93b', recolor: { h1: 140, h2: 38, sat: 0.8, val: 0.62, sat2: 1.0, val2: 1.0 },
    diff: 0.62, bonus: { chk: 1, sta: 1, spd: -1 }, goalie: { rfx: 6, pos: 7 },
    names: { frost: 'Tamarack', thunder: 'Rumble', stone: 'Thorvald', goalie: 'Brakken' },
    gstyle: 'wall', subs: { goalie: 'Tundra', frost: 'Spruce', thunder: 'Larch', stone: 'Bramble' }, // who plays the slot after you sign its skater
    style: 'Big, loud and hard to move. Every shift feels like a stampede.',
  },
  // The National division's clubs (tiers.js): met once the club is promoted, from all over the
  // country. Like the expansion clubs, their players are made from parts in the team's colours;
  // their crests, mascots, towns and rinks are Batches EA to EG's, under their mark.
  capybaras: {
    id: 'capybaras', habit: { pass: 0.1, deke: 0.6, slap: 0.6 }, plan: 'trap', chem: 1, name: 'Hot Springs Capybaras', short: 'CAP', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'hot_springs_capybaras', arena: 'hot_springs', national: true,
    goalieLook: { mask: 'classic', paint: '#c9905a', body: 'big' },
    looks: { frost: { body: 'small', head: 'round_cheeks', skin: 3, hair: 2 }, thunder: { body: 'std', head: 'curls', skin: 4, hair: 1 }, stone: { body: 'big', head: 'buzz_cut', skin: 2, hair: 0 } },
    color: '#c9905a', color2: '#3fb8a8', recolor: { h1: 29, h2: 172, sat: 0.6, val: 0.85, sat2: 0.85, val2: 0.9 }, // (caramel, with hot-spring teal: clear of our cyan)
    diff: 0.3, bonus: { pas: 1, sta: 1, spd: -1 }, goalie: { rfx: 6, pos: 6 },
    names: { frost: 'Tapioca', thunder: 'Paddle', stone: 'Basil', goalie: 'Sauna' },
    gstyle: 'reader', subs: { goalie: 'Steam', frost: 'Lily', thunder: 'Ripple', stone: 'Pebble' },
    style: 'Calm as a hot bath. Nothing rattles them, and they never rush a pass.',
  },
  puffins: {
    id: 'puffins', habit: { pass: 0.1, deke: 1.2 }, plan: 'rungun', chem: 1, name: 'Cliffside Puffins', short: 'PUF', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'cliffside_puffins', arena: 'puffin_cliffs', national: true,
    goalieLook: { mask: 'stars', paint: '#ff7a2f', body: 'small' },
    looks: { frost: { body: 'small', head: 'freckles', skin: 0, hair: 3 }, thunder: { body: 'small', head: 'space_buns', skin: 1, hair: 5 }, stone: { body: 'std', head: 'cage', skin: 2, hair: 0 } },
    color: '#ff7a2f', color2: '#1d2433', recolor: { h1: 22, h2: 220, sat: 1.0, val: 1.0, sat2: 0.2, val2: 0.35 },
    diff: 0.45, bonus: { agi: 1, pas: 1, chk: -1 }, goalie: { rfx: 6, pos: 5 },
    names: { frost: 'Skerry', thunder: 'Dart', stone: 'Burrow', goalie: 'Tern' },
    gstyle: 'scrambler', subs: { goalie: 'Gull', frost: 'Spray', thunder: 'Flit', stone: 'Cliff' },
    style: 'Quick little passers who dart everywhere. Blink and the puck is gone.',
  },
  grizzlies: {
    elems: { stone: 'ember' }, // supers other than the slot's own
    id: 'grizzlies', habit: { dump: 1.6, slap: 1.4 }, plan: 'forecheck', chem: 2, name: 'Timberline Grizzlies', short: 'GRZ', single: 'Grizzly', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'timberline_grizzlies', arena: 'timber_lodge', national: true,
    goalieLook: { mask: 'stripes', paint: '#7a4a2a', body: 'big' },
    looks: { frost: { body: 'std', head: 'beard', skin: 1, hair: 6 }, thunder: { body: 'std', head: 'long_hair', skin: 3, hair: 4 }, stone: { body: 'big', head: 'eye_black', skin: 2, hair: 7 } },
    color: '#7a4a2a', color2: '#2f6b3a', recolor: { h1: 26, h2: 135, sat: 0.7, val: 0.55, sat2: 0.7, val2: 0.55 },
    diff: 0.55, bonus: { chk: 2, spd: -1 }, goalie: { rfx: 6, pos: 7 },
    names: { frost: 'Bruin', thunder: 'Kodiak', stone: 'Timber', goalie: 'Den' },
    gstyle: 'wall', subs: { goalie: 'Burl', frost: 'Cedar', thunder: 'Honey', stone: 'Boulder' },
    style: 'Big, heavy hitters from the mountain forest. Keep your head up along the boards.',
  },
  seals: {
    elems: { thunder: 'frost' }, // supers other than the slot's own
    id: 'seals', habit: { deke: 1.8 }, plan: 'counter', chem: 2, name: 'Driftwood Seals', short: 'SEL', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'driftwood_seals', arena: 'ice_floes', national: true,
    goalieLook: { mask: 'pixel', paint: '#4f6d8a', body: 'std' },
    looks: { frost: { body: 'small', head: 'ponytail', skin: 2, hair: 3 }, thunder: { body: 'std', head: 'side_part', skin: 0, hair: 1 }, stone: { body: 'big', head: 'bandaged_nose', skin: 4, hair: 0 } },
    color: '#4f6d8a', color2: '#c9d3dc', recolor: { h1: 210, h2: 205, sat: 0.45, val: 0.7, sat2: 0.12, val2: 1.0 },
    diff: 0.62, bonus: { agi: 2, chk: -1 }, goalie: { rfx: 7, pos: 6 },
    names: { frost: 'Kelp', thunder: 'Slick', stone: 'Barnacle', goalie: 'Floe' },
    gstyle: 'butterfly', subs: { goalie: 'Drift', frost: 'Coral', thunder: 'Splash', stone: 'Anchor' },
    style: 'Slippery as wet ice. They duck out of every check and slide away with the puck.',
  },
  penguins: {
    id: 'penguins', habit: { pass: 0.18, shoot: -0.1 }, plan: 'balanced', chem: 3, name: 'Pack Ice Penguins', short: 'PNG', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'pack_ice_penguins', arena: 'pack_ice', national: true,
    goalieLook: { mask: 'lightning', paint: '#ffd23f', body: 'std' },
    looks: { frost: { body: 'small', head: 'braids', skin: 1, hair: 4 }, thunder: { body: 'std', head: 'visor', skin: 3, hair: 2 }, stone: { body: 'big', head: 'moustache', skin: 0, hair: 6 } },
    color: '#ffd23f', color2: '#20242e', recolor: { h1: 48, h2: 225, sat: 1.0, val: 1.05, sat2: 0.15, val2: 0.3 },
    diff: 0.72, bonus: { pas: 2, sta: 1, spd: -1 }, goalie: { rfx: 7, pos: 7 },
    names: { frost: 'Tux', thunder: 'Krill', stone: 'Rookery', goalie: 'Huddle' },
    gstyle: 'hybrid', subs: { goalie: 'Iceberg', frost: 'Pebbles', thunder: 'Slide', stone: 'Colony' },
    style: 'All teamwork: pass, pass, pass, and then they score.',
  },
  bulls: {
    elems: { frost: 'ember', thunder: 'ember' }, // supers other than the slot's own
    id: 'bulls', habit: { shoot: 0.1, deke: 0.6, dump: 1.3 }, plan: 'forecheck', chem: 2, name: 'Sunmesa Bulls', short: 'BUL', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'sunmesa_bulls', arena: 'sunmesa', national: true,
    goalieLook: { mask: 'flame', paint: '#c0392b', body: 'big' },
    looks: { frost: { body: 'std', head: 'mohawk', skin: 4, hair: 1 }, thunder: { body: 'std', head: 'afro_puffs', skin: 4, hair: 0 }, stone: { body: 'big', head: 'sports_hijab', skin: 3, hair: 0 } },
    color: '#c0392b', color2: '#e8b04b', recolor: { h1: 4, h2: 40, sat: 1.0, val: 0.8, sat2: 0.9, val2: 1.0 },
    diff: 0.82, bonus: { chk: 1, spd: 1, sht: 1, pas: -1 }, goalie: { rfx: 8, pos: 7 },
    names: { frost: 'Mesa', thunder: 'Rodeo', stone: 'Toro', goalie: 'Canyon' },
    gstyle: 'wall', subs: { goalie: 'Adobe', frost: 'Sage', thunder: 'Dusty', stone: 'Saguaro' },
    style: 'From the warm canyon country. They put their heads down and charge straight at you.',
  },
  narwhals: {
    elems: { thunder: 'gale' }, // supers other than the slot's own
    id: 'narwhals', habit: { deke: 1.5, shoot: 0.06 }, plan: 'rungun', chem: 3, name: 'Northlight Narwhals', short: 'NAR', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'northlight_narwhals', arena: 'fjord_hall', national: true,
    goalieLook: { mask: 'aurora', paint: '#1f4e8c', body: 'std' },
    looks: { frost: { body: 'std', head: 'long_braids', skin: 0, hair: 5 }, thunder: { body: 'small', head: 'gap_tooth', skin: 1, hair: 2 }, stone: { body: 'big', head: 'freckled_redhead', skin: 0, hair: 3 } },
    color: '#1f4e8c', color2: '#7fe0a8', recolor: { h1: 214, h2: 148, sat: 0.9, val: 0.75, sat2: 0.8, val2: 1.0 },
    diff: 0.95, bonus: { spd: 2, sht: 1, agi: 1, chk: -1 }, goalie: { rfx: 8, pos: 8 },
    names: { frost: 'Tusk', thunder: 'Lumen', stone: 'Fjord', goalie: 'Glimmer' },
    gstyle: 'reader', subs: { goalie: 'Pod', frost: 'Brine', thunder: 'Streak', stone: 'Bergen' },
    style: 'Fast and flashy, the stars of the north. Their wingers are gone before you turn.',
  },
  // Two more National clubs (the division grows to ten): the dam builders and the lagoon's dancers.
  beavers: {
    elems: { frost: 'stone' }, // supers other than the slot's own
    id: 'beavers', habit: { dump: 1.5, slap: 1.3 }, plan: 'trap', chem: 2, name: 'Birchwood Beavers', short: 'BEA', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'birchwood_beavers', arena: 'millpond', national: true,
    goalieLook: { mask: 'classic', paint: '#7a2433', body: 'big' },
    looks: { frost: { body: 'std', head: 'gap_tooth', skin: 2, hair: 1 }, thunder: { body: 'small', head: 'freckles', skin: 0, hair: 4 }, stone: { body: 'big', head: 'buzz_cut', skin: 3, hair: 0 } },
    color: '#7a2433', color2: '#f1e6cf', recolor: { h1: 352, h2: 40, sat: 0.7, val: 0.55, sat2: 0.15, val2: 1.0 }, // (wine red and birch white)
    diff: 0.38, bonus: { chk: 1, sta: 1, agi: -1 }, goalie: { rfx: 6, pos: 8 },
    names: { frost: 'Chipper', thunder: 'Woody', stone: 'Logjam', goalie: 'Stopper' },
    gstyle: 'wall', subs: { goalie: 'Birchbark', frost: 'Twiggy', thunder: 'Paddletail', stone: 'Mudpie' },
    style: 'Busy builders. They stack up a dam in front of their net and dare you to get through.',
  },
  flamingos: {
    elems: { stone: 'gale' }, // supers other than the slot's own
    id: 'flamingos', habit: { deke: 2, pass: 0.05 }, plan: 'rungun', chem: 2, name: 'Coral Bay Flamingos', short: 'FLA', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'coral_bay_flamingos', arena: 'coral_bay', national: true,
    goalieLook: { mask: 'stars', paint: '#ff6fae', body: 'small' },
    looks: { frost: { body: 'std', head: 'curls', skin: 1, hair: 3 }, thunder: { body: 'small', head: 'space_buns', skin: 4, hair: 2 }, stone: { body: 'std', head: 'visor', skin: 2, hair: 5 } },
    color: '#ff6fae', color2: '#2fa36b', recolor: { h1: 330, h2: 150, sat: 0.9, val: 1.0, sat2: 0.8, val2: 0.75 }, // (flamingo pink and palm green)
    diff: 0.67, bonus: { agi: 2, pas: 1, chk: -2 }, goalie: { rfx: 7, pos: 6 },
    names: { frost: 'Flutter', thunder: 'Tango', stone: 'Lagoon', goalie: 'Stilts' },
    gstyle: 'scrambler', subs: { goalie: 'Shrimp', frost: 'Sunny', thunder: 'Mango', stone: 'Palmer' },
    style: 'Graceful and tricky, from the warm lagoons. They glide past you on one skate and make it look easy.',
  },
  // The Elite division's own two clubs (tiers.js): met only at the top, the strongest in the
  // country, the fierce one and the calm one.
  tigers: {
    elems: { thunder: 'ember' }, // supers other than the slot's own
    id: 'tigers', habit: { shoot: 0.08, slap: 1.3 }, plan: 'forecheck', chem: 3, name: 'Taiga Tigers', short: 'TIG', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'taiga_tigers', arena: 'taiga_rink', elite: true,
    goalieLook: { mask: 'tiger', paint: '#ff8c1a', body: 'std' },
    looks: { frost: { body: 'std', head: 'eye_black', skin: 1, hair: 2 }, thunder: { body: 'small', head: 'ponytail', skin: 3, hair: 5 }, stone: { body: 'big', head: 'beard', skin: 4, hair: 1 } },
    color: '#ff8c1a', color2: '#1a1a1a', recolor: { h1: 30, h2: 0, sat: 1.0, val: 1.0, sat2: 0.0, val2: 0.2 }, // (tiger orange, black stripes)
    diff: 0.93, bonus: { spd: 1, agi: 1, sht: 1, chk: 1 }, goalie: { rfx: 8, pos: 8 },
    names: { frost: 'Stripe', thunder: 'Pounce', stone: 'Boreal', goalie: 'Prowl' },
    gstyle: 'scrambler', subs: { goalie: 'Snowpaw', frost: 'Saffron', thunder: 'Zigzag', stone: 'Bracken' },
    style: 'Fierce hunters from the snowy forests of the far east. They pounce on every loose puck.',
  },
  pandas: {
    elems: { thunder: 'shadow' }, // supers other than the slot's own
    id: 'pandas', habit: { pass: 0.12, shoot: -0.04, deke: 1.3 }, plan: 'trap', chem: 3, name: 'Bamboo Ridge Pandas', short: 'PAN', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'bamboo_ridge_pandas', arena: 'bamboo_grove', elite: true,
    goalieLook: { mask: 'classic', paint: '#1f1f1f', body: 'big' },
    looks: { frost: { body: 'std', head: 'bun', skin: 2, hair: 0 }, thunder: { body: 'small', head: 'glasses', skin: 0, hair: 4 }, stone: { body: 'big', head: 'cage', skin: 3, hair: 0 } },
    color: '#f2f2ec', color2: '#1f1f1f', recolor: { h1: 60, h2: 0, sat: 0.05, val: 1.08, sat2: 0.0, val2: 0.22 }, // (panda white, black trim)
    diff: 0.98, bonus: { agi: 1, pas: 1, chk: 1, sta: 1 }, goalie: { rfx: 9, pos: 8 },
    names: { frost: 'Inkwell', thunder: 'Tumble', stone: 'Bamboo', goalie: 'Summit' },
    gstyle: 'wall', subs: { goalie: 'Lantern', frost: 'Mist', thunder: 'Sprout', stone: 'Dumpling' },
    style: 'Calm, strong and patient. They look sleepy right up until they take the puck off you.',
  },
  // The Snowcrest Foxes as a club of the league, for a career as another club (clubs.js): the
  // cast in their own colours, in the slot of the club the player took (CAREER, useCareer
  // below: its difficulty, prize and stats). careerOnly: nowhere else.
  foxes: {
    id: 'foxes', careerOnly: true, habit: { pass: 0.08, deke: 1.1 }, plan: 'balanced', chem: 2, name: 'Snowcrest Foxes', short: 'FOX', single: 'Fox', crest: 'hud_elements/misc/home_crest',
    art: null, arena: null, castGoalie: true, // (the cast's art in their colours; Halla in goal)
    color: '#71dce8', color2: '#fff2cb', recolor: { h1: 46, h2: 188, sat: 0.32, val: 1.08, sat2: 0.9, val2: 1.3 },
    diff: 0.5, bonus: {}, goalie: { rfx: 6, pos: 6 },
    names: { frost: 'Nix', thunder: 'Volta', stone: 'Bram', goalie: 'Halla' },
    gstyle: 'hybrid', subs: { goalie: 'Glacia', frost: 'Sleet', thunder: 'Zephyr', stone: 'Drumlin' },
    style: 'Snowcrest\'s plucky underdogs: quick passes, big hearts, and never beaten till the buzzer.',
  },
};
// The rivals, easiest first. The first five are the league's founding clubs.
export const RIVAL_IDS = ['lynx', 'comets', 'owls', 'rams', 'moose', 'ravens', 'royals'];
export const FOUNDING_RIVALS = ['lynx', 'comets', 'rams', 'ravens', 'royals'];
// The National division's clubs, easiest first (nine: the schedule wants an odd number of
// rivals), and the Elite division's: the strongest of both regions (tiers.js). RIVAL_IDS stays
// the Frostline's own (the daily challenge draws from it).
export const NATIONAL_IDS = ['capybaras', 'beavers', 'puffins', 'grizzlies', 'seals', 'flamingos', 'penguins', 'bulls', 'narwhals'];
// (the Elite has two clubs of its own, the Tigers and the Pandas: nine rivals, ten clubs, nine
// rounds; the schedule wants an odd number of rivals)
export const ELITE_OWN_IDS = ['tigers', 'pandas'];
export const ELITE_IDS = ['moose', 'seals', 'ravens', 'penguins', 'bulls', 'royals', 'tigers', 'narwhals', 'pandas'];
export const ALL_RIVALS = [...RIVAL_IDS, ...NATIONAL_IDS, ...ELITE_OWN_IDS];
// A career as another club (clubs.js): CAREER.team is that club (null: the Foxes' own story).
// useCareer swaps it out of the league's lists for the Foxes, in place (everything that reads
// the lists sees it), and gives the Foxes that club's slot: its difficulty, stats, chemistry,
// and whether it joins in the second season.
export const CAREER = { team: null, custom: false }; // (custom: a club of the player's own, clubs.js)
const BASE_LISTS = [[RIVAL_IDS, [...RIVAL_IDS]], [FOUNDING_RIVALS, [...FOUNDING_RIVALS]], [ELITE_IDS, [...ELITE_IDS]], [ALL_RIVALS, [...ALL_RIVALS]]];
export const careerClub = (team) => (team && team !== 'foxes' && TEAMS[team] && TEAMS[team].names && !TEAMS[team].careerOnly && RIVAL_IDS.concat(BASE_LISTS[0][1]).includes(team) ? team : null);
// A club of the player's own ('custom'): no club leaves; the Foxes join the Frostline as a club
// too, mid-table (an even number of rivals: the league has a bye each round, league.js).
const insertAfter = (list, after, id) => list.splice(list.indexOf(after) + 1, 0, id);
// A club career's own stars and goalie: the club's from the start, like the cast in the Foxes'
// story, not signings (no trades or rivals' calls for them, no Signing of the Year, no 'signed').
export const clubOwn = (id) => !!((CAREER.team && ((RECRUITS[id] && RECRUITS[id].team === CAREER.team) || id === CAREER.team + '_g')) || (CAREER.custom && ROOKIES[id] && ROOKIES[id].founder)); // (one's own club: its founders)
export function useCareer(team) {
  const custom = team === 'custom', own = custom ? null : careerClub(team);
  CAREER.team = own; CAREER.custom = custom;
  for (const [list, base] of BASE_LISTS) { list.length = 0; list.push(...base.map((id) => (id === own ? 'foxes' : id))); }
  if (custom) { insertAfter(RIVAL_IDS, 'owls', 'foxes'); insertAfter(FOUNDING_RIVALS, 'comets', 'foxes'); insertAfter(ALL_RIVALS, 'owls', 'foxes'); }
  const F = TEAMS.foxes, T = own && TEAMS[own];
  Object.assign(F, { diff: T ? T.diff : 0.5, bonus: T ? { ...T.bonus } : {}, goalie: T ? { ...T.goalie } : { rfx: 6, pos: 6 }, chem: T ? T.chem : 2, expansion: !!(T && T.expansion) });
  return own || (custom ? 'custom' : null);
}
// The daily challenge's clubs: the same for everyone (a club career meets the Foxes in its own
// place; a club of one's own adds none).
export const dailyRivals = () => BASE_LISTS[0][1].map((id) => (id === CAREER.team ? 'foxes' : id));
// What plays a rival's roster slot: their own art, or a body from parts (an expansion club),
// or null for our cast's art in their colours.
export const slotLook = (teamId, kit) => { const t = TEAMS[teamId]; return t && t.looks && t.looks[kit] && bodySprite(t.looks[kit]) ? t.looks[kit] : null; };
export const slotSprite = (teamId, kit) => { const t = TEAMS[teamId]; return t && t.drawn && t.drawn[kit] ? t.drawn[kit] : t && t.art ? `${t.art}_${ROLE[kit]}` : (slotLook(teamId, kit) ? bodySprite(slotLook(teamId, kit)) : null); };
// The expansion clubs' captains as characters of their own (Batch BA): once their art is in
// they skate in it instead of being made from parts, for their club and once signed.
export const CAPTAIN_ART = { owls: 'glacier_owls_c', moose: 'thunder_moose_c' };
export function useCaptainArt(has) {
  for (const [team, key] of Object.entries(CAPTAIN_ART)) {
    if (!has(key)) continue;
    const t = TEAMS[team];
    (t.drawn ||= {}).frost = key;
    if (t.looks) delete t.looks.frost;
    const r = RECRUITS[team + '_c'];
    if (r) { r.sprite = key; r.parts = null; }
  }
}

// Sprite-pack names: each roster slot's role letter, and our cast's names in the art.
export const ROLE = { frost: 'c', thunder: 'w', stone: 'd', goalie: 'g' };
export const ART_NAME = { frost: 'nix', thunder: 'volta', stone: 'bram', goalie: 'halla' };
// Arenas: rivals with their own building host you there.
export const ARENAS = {
  home: { name: 'Frostline Rink', lamps: '#ffb84d' },
  ember_dome: { name: 'Ember Dome', lamps: '#ff7a2e', flicker: 2.2, ice: 'rgba(255,140,60,0.06)' },
  aurora_palace: { name: 'Aurora Palace', lamps: '#ffd27a' },
  golden_hall: { name: 'Golden Hall', lamps: '#ffc04a', flicker: 1.6 },
  dark_aerie: { name: 'Dark Aerie', lamps: '#b48cff', flicker: 0.7 },
  pine_pond: { name: 'Pine Pond', lamps: null },
  owl_observatory: { name: 'The Observatory', lamps: '#bfe8ff' }, // (the Glacier Owls')
  moose_longhouse: { name: 'The Longhouse', lamps: '#ffb05c', flicker: 1.4 }, // (the Thunder Moose's)
  // the Cup Final's neutral building (Batch BX): not a daily challenge's arena
  frostline_coliseum: { name: 'Frostline Coliseum', lamps: '#ffd45e', finalOnly: true },
  // the National and Elite Cup Finals' buildings (Batch EO): the Coliseum until their art is in
  capital_dome: { name: 'The Capital Dome', lamps: '#ffe9b0', finalOnly: true },
  diamond_arena: { name: 'Diamond Arena', lamps: '#d6f0ff', finalOnly: true },
  // an outdoor rink on the frozen harbour (Batch CM), for exhibitions: in Quick play once its art is in, never a daily's
  harbour_rink: { name: 'Harbour Rink', lamps: '#ffd27a', exhibitionOnly: true },
  // a rink carved inside a glacier (Batch CP), for exhibitions: in Quick play once its art is in, never a daily's
  glacier_cave: { name: 'Glacier Cave', lamps: '#9fe3ff', exhibitionOnly: true },
  // a mountaintop rink at the top of a cable car (Batch CV), for exhibitions: in Quick play once its art is in, never a daily's
  summit_rink: { name: 'Summit Rink', lamps: '#ffe9a6', exhibitionOnly: true },
  // the National clubs' buildings (Batches EE to EG): their own rink once its art is in (ours until then), never a daily's
  hot_springs: { name: 'The Hot Springs', lamps: '#ffc98a', national: true },
  puffin_cliffs: { name: 'Cliffside Rink', lamps: '#ffe0b0', national: true },
  timber_lodge: { name: 'Timber Lodge', lamps: '#ffb05c', flicker: 1.2, national: true },
  ice_floes: { name: 'The Floes', lamps: '#cfe8ff', national: true },
  pack_ice: { name: 'Pack Ice Arena', lamps: '#e6f4ff', national: true },
  sunmesa: { name: 'Sunmesa Arena', lamps: '#ffb347', national: true },
  fjord_hall: { name: 'Fjord Hall', lamps: '#9fffc8', national: true },
  millpond: { name: 'Millpond Rink', lamps: '#ffcf8a', national: true }, // (the Beavers': Batch EM)
  coral_bay: { name: 'Coral Bay Rink', lamps: '#ffb0d0', national: true }, // (the Flamingos': Batch EM)
  taiga_rink: { name: 'Taiga Rink', lamps: '#ffb36b', national: true }, // (the Tigers': Batch EL)
  bamboo_grove: { name: 'Bamboo Grove', lamps: '#ffd8a0', national: true }, // (the Pandas': Batch EL)
};

// ---------------------------------------------------------------- recruitment
// Beat a rival and their skaters will take your calls. A signing plays their position's
// kit (C: Nix's frost kit, W: Volta's thunder kit, D: Bram's stone kit) with their own
// stats, a few perks they arrive with, and no chemistry with your line yet.
// perks: which option they took at each perk level (levels 3, 5, 7) before joining.
const recruit = (team, kit, base, perks, price, blurb, arch, hand) => ({ team, kit, base, perks, price, blurb, arch, hand });
export const RECRUITS = {
  lynx_c: recruit('lynx', 'frost', { spd: 7, agi: 8, sht: 6, pas: 8, chk: 4, sta: 6 }, [1, 1, 1], 180, 'Pinewood\'s eager captain. Quick feet, quicker hands, never stops smiling.', 'playmaker', 'L'),
  lynx_w: recruit('lynx', 'thunder', { spd: 9, agi: 9, sht: 5, pas: 5, chk: 2, sta: 7 }, [0, 0, 1], 180, 'Tiny, tireless and somehow everywhere at once.', 'grinder', 'R'),
  lynx_d: recruit('lynx', 'stone', { spd: 5, agi: 5, sht: 6, pas: 6, chk: 8, sta: 9 }, [0, 1, 0], 180, 'Plays like a pine in a blizzard: bends, never breaks.', 'grinder', 'L'),
  comets_c: recruit('comets', 'frost', { spd: 6, agi: 6, sht: 9, pas: 7, chk: 5, sta: 6 }, [1, 0, 0], 260, 'Shoot-first centre with a temper to match.', 'sniper', 'R'),
  comets_w: recruit('comets', 'thunder', { spd: 8, agi: 7, sht: 9, pas: 4, chk: 4, sta: 5 }, [1, 1, 0], 260, 'Fire-starter. Never met a shot worth passing up.', 'sniper', 'L'),
  comets_d: recruit('comets', 'stone', { spd: 5, agi: 5, sht: 9, pas: 4, chk: 8, sta: 8 }, [1, 0, 1], 260, 'Booming point shot. Defends when the mood strikes.', 'blueliner', 'R'),
  rams_c: recruit('rams', 'frost', { spd: 5, agi: 6, sht: 8, pas: 8, chk: 7, sta: 6 }, [1, 0, 1], 340, 'Big-bodied centre who wins every battle along the boards.', 'enforcer', 'L'),
  rams_w: recruit('rams', 'thunder', { spd: 8, agi: 7, sht: 8, pas: 5, chk: 5, sta: 5 }, [0, 1, 0], 340, 'Power winger with a wrist shot like a falling anvil.', 'sniper', 'R'),
  rams_d: recruit('rams', 'stone', { spd: 4, agi: 4, sht: 8, pas: 4, chk: 10, sta: 10 }, [1, 0, 0], 340, 'The hardest hitter in the Frostline. Ask anyone. Carefully.', 'enforcer', 'L'),
  ravens_c: recruit('ravens', 'frost', { spd: 7, agi: 8, sht: 6, pas: 9, chk: 5, sta: 5 }, [0, 1, 1], 420, 'Reads the play two passes ahead and never wastes a touch.', 'playmaker', 'R'),
  ravens_w: recruit('ravens', 'thunder', { spd: 9, agi: 9, sht: 7, pas: 6, chk: 3, sta: 4 }, [1, 0, 0], 420, 'Silent, slippery, gone before you turn around.', 'dangler', 'L'),
  ravens_d: recruit('ravens', 'stone', { spd: 5, agi: 6, sht: 6, pas: 7, chk: 9, sta: 7 }, [0, 1, 0], 420, 'Positionally perfect. Never out of place, never rattled.', 'grinder', 'L'),
  royals_c: recruit('royals', 'frost', { spd: 7, agi: 8, sht: 8, pas: 8, chk: 4, sta: 6 }, [1, 0, 0], 520, 'Royals captain. Elegant, precise and very aware of it.', 'dangler', 'L'),
  royals_w: recruit('royals', 'thunder', { spd: 9, agi: 8, sht: 8, pas: 5, chk: 3, sta: 6 }, [0, 1, 0], 520, 'Flashy finisher with a release the crowd waits for.', 'sniper', 'R'),
  royals_d: recruit('royals', 'stone', { spd: 5, agi: 5, sht: 8, pas: 6, chk: 9, sta: 8 }, [1, 0, 0], 520, 'The old monarch of the blue line. Still has it.', 'blueliner', 'R'),
  owls_c: recruit('owls', 'frost', { spd: 6, agi: 8, sht: 6, pas: 9, chk: 4, sta: 6 }, [0, 1, 1], 300, 'Sees the whole ice from behind those glasses. Never forces a pass.', 'playmaker', 'R'),
  owls_w: recruit('owls', 'thunder', { spd: 8, agi: 9, sht: 7, pas: 6, chk: 3, sta: 6 }, [1, 0, 1], 300, 'Silent on the wing until the puck is already in the net.', 'dangler', 'L'),
  owls_d: recruit('owls', 'stone', { spd: 5, agi: 6, sht: 6, pas: 7, chk: 7, sta: 8 }, [0, 0, 1], 300, 'A calm old hand on the blue line. Seen it all twice.', 'blueliner', 'L'),
  moose_c: recruit('moose', 'frost', { spd: 5, agi: 5, sht: 8, pas: 7, chk: 8, sta: 8 }, [1, 1, 0], 380, 'Wins faceoffs by leaning on them. It works every time.', 'enforcer', 'L'),
  moose_w: recruit('moose', 'thunder', { spd: 9, agi: 7, sht: 8, pas: 4, chk: 6, sta: 6 }, [0, 0, 0], 380, 'All engine, no brakes. Points the mohawk at the net and goes.', 'speedster', 'R'),
  moose_d: recruit('moose', 'stone', { spd: 4, agi: 4, sht: 7, pas: 5, chk: 10, sta: 10 }, [1, 1, 1], 380, 'A wall in a cage mask. Forwards bounce off.', 'enforcer', 'R'),
  // the National division's (beat them there first)
  capybaras_c: recruit('capybaras', 'frost', { spd: 6, agi: 7, sht: 6, pas: 9, chk: 5, sta: 8 }, [0, 1, 1], 400, 'Never hurries, never panics. The puck always finds the open stick.', 'playmaker', 'L'),
  capybaras_w: recruit('capybaras', 'thunder', { spd: 7, agi: 8, sht: 7, pas: 7, chk: 4, sta: 8 }, [1, 0, 1], 400, 'Skates all day without breaking a sweat, then scores in the last minute.', 'grinder', 'R'),
  capybaras_d: recruit('capybaras', 'stone', { spd: 4, agi: 5, sht: 7, pas: 7, chk: 9, sta: 9 }, [0, 1, 0], 400, 'Big, gentle and impossible to knock over.', 'blueliner', 'L'),
  puffins_c: recruit('puffins', 'frost', { spd: 8, agi: 9, sht: 6, pas: 9, chk: 3, sta: 6 }, [1, 0, 1], 440, 'Darts in, flicks a pass, darts out. Hard to even see.', 'playmaker', 'R'),
  puffins_w: recruit('puffins', 'thunder', { spd: 9, agi: 9, sht: 7, pas: 7, chk: 2, sta: 7 }, [0, 1, 0], 440, 'Tiny and quick as a seabird. Loves a no-look pass.', 'dangler', 'L'),
  puffins_d: recruit('puffins', 'stone', { spd: 6, agi: 7, sht: 6, pas: 8, chk: 7, sta: 7 }, [0, 0, 1], 440, 'Moves the puck out before the forecheck even arrives.', 'blueliner', 'L'),
  grizzlies_c: recruit('grizzlies', 'frost', { spd: 5, agi: 6, sht: 8, pas: 7, chk: 9, sta: 8 }, [1, 1, 0], 480, 'Wins the puck in the corners and growls about it.', 'enforcer', 'L'),
  grizzlies_w: recruit('grizzlies', 'thunder', { spd: 7, agi: 6, sht: 9, pas: 5, chk: 8, sta: 7 }, [1, 0, 0], 480, 'A heavy shot from a heavy winger. Goalies feel it in their gloves.', 'sniper', 'R'),
  grizzlies_d: recruit('grizzlies', 'stone', { spd: 4, agi: 5, sht: 7, pas: 5, chk: 10, sta: 10 }, [1, 0, 1], 480, 'Like skating into a tree. A very large tree.', 'enforcer', 'L'),
  seals_c: recruit('seals', 'frost', { spd: 7, agi: 9, sht: 7, pas: 8, chk: 4, sta: 7 }, [0, 1, 1], 520, 'Slips every check like it was never there.', 'dangler', 'R'),
  seals_w: recruit('seals', 'thunder', { spd: 9, agi: 10, sht: 8, pas: 5, chk: 3, sta: 6 }, [1, 1, 0], 520, 'Slides away from defenders like a seal off a rock.', 'dangler', 'L'),
  seals_d: recruit('seals', 'stone', { spd: 6, agi: 7, sht: 7, pas: 7, chk: 8, sta: 8 }, [0, 1, 0], 520, 'Quick on the turn for a defender. Breakaways rarely get past.', 'blueliner', 'R'),
  penguins_c: recruit('penguins', 'frost', { spd: 6, agi: 7, sht: 7, pas: 10, chk: 5, sta: 8 }, [0, 0, 1], 560, 'Makes every linemate better. Counts passes, not goals.', 'playmaker', 'L'),
  penguins_w: recruit('penguins', 'thunder', { spd: 8, agi: 8, sht: 8, pas: 8, chk: 4, sta: 7 }, [1, 0, 1], 560, 'Always where the pass is going. Always.', 'playmaker', 'R'),
  penguins_d: recruit('penguins', 'stone', { spd: 5, agi: 6, sht: 7, pas: 8, chk: 8, sta: 9 }, [0, 1, 1], 560, 'Calm as an iceberg on the blue line.', 'blueliner', 'L'),
  bulls_c: recruit('bulls', 'frost', { spd: 8, agi: 7, sht: 9, pas: 6, chk: 7, sta: 7 }, [1, 0, 0], 600, 'Head down, straight to the net, puck in the top corner.', 'sniper', 'R'),
  bulls_w: recruit('bulls', 'thunder', { spd: 10, agi: 8, sht: 8, pas: 4, chk: 6, sta: 7 }, [0, 0, 1], 600, 'The fastest charge in the canyon country. Don\'t stand in the way.', 'speedster', 'L'),
  bulls_d: recruit('bulls', 'stone', { spd: 5, agi: 5, sht: 9, pas: 5, chk: 10, sta: 9 }, [1, 1, 0], 600, 'Hits like a summer storm and shoots like one too.', 'enforcer', 'R'),
  narwhals_c: recruit('narwhals', 'frost', { spd: 9, agi: 9, sht: 8, pas: 9, chk: 3, sta: 6 }, [1, 0, 1], 650, 'The north\'s brightest star, and dazzling with the puck.', 'dangler', 'L'),
  narwhals_w: recruit('narwhals', 'thunder', { spd: 10, agi: 9, sht: 9, pas: 5, chk: 3, sta: 6 }, [0, 1, 0], 650, 'Gone before you turn, and the puck is already in the net.', 'sniper', 'R'),
  narwhals_d: recruit('narwhals', 'stone', { spd: 7, agi: 7, sht: 8, pas: 8, chk: 7, sta: 7 }, [1, 0, 0], 650, 'Joins every rush and still beats everyone back.', 'blueliner', 'L'),
  beavers_c: recruit('beavers', 'frost', { spd: 6, agi: 6, sht: 7, pas: 8, chk: 7, sta: 8 }, [1, 1, 0], 420, 'Never stops working. Every shift, another log on the pile.', 'grinder', 'L'),
  beavers_w: recruit('beavers', 'thunder', { spd: 7, agi: 7, sht: 8, pas: 6, chk: 6, sta: 8 }, [0, 1, 1], 420, 'Chips away at the defence until something gives.', 'grinder', 'R'),
  beavers_d: recruit('beavers', 'stone', { spd: 4, agi: 5, sht: 7, pas: 6, chk: 9, sta: 10 }, [1, 0, 1], 420, 'Builds a wall in front of the net and stands behind it.', 'blueliner', 'L'),
  flamingos_c: recruit('flamingos', 'frost', { spd: 8, agi: 9, sht: 7, pas: 9, chk: 3, sta: 6 }, [0, 1, 0], 530, 'Glides through traffic on one skate, cool as you like.', 'playmaker', 'R'),
  flamingos_w: recruit('flamingos', 'thunder', { spd: 9, agi: 10, sht: 8, pas: 6, chk: 2, sta: 7 }, [1, 0, 1], 530, 'All long legs and fancy moves, and somehow never falls over.', 'dangler', 'L'),
  flamingos_d: recruit('flamingos', 'stone', { spd: 6, agi: 8, sht: 7, pas: 8, chk: 6, sta: 7 }, [0, 0, 1], 530, 'Steps out of the way, then takes the puck off you anyway.', 'blueliner', 'R'),
  // the Foxes, in a career as another club (clubs.js)
  foxes_c: recruit('foxes', 'frost', { ...CHARACTERS.frost.base }, [0, 0, 0], 300, 'Snowcrest\'s calm captain. Lays down ice trails that speed up the whole line.', CHARACTERS.frost.arch, CHARACTERS.frost.hand),
  foxes_w: recruit('foxes', 'thunder', { ...CHARACTERS.thunder.base }, [0, 0, 0], 300, 'Lightning on skates, and knows it. Never met a race she didn\'t want.', CHARACTERS.thunder.arch, CHARACTERS.thunder.hand),
  foxes_d: recruit('foxes', 'stone', { ...CHARACTERS.stone.base }, [0, 0, 0], 300, 'Immovable on the blue line, with a cannon of a slapshot.', CHARACTERS.stone.arch, CHARACTERS.stone.hand),
  // the Elite's own (beat them there first)
  tigers_c: recruit('tigers', 'frost', { spd: 9, agi: 8, sht: 9, pas: 8, chk: 6, sta: 6 }, [1, 0, 0], 680, 'Hunts the puck down and buries it.', 'sniper', 'R'),
  tigers_w: recruit('tigers', 'thunder', { spd: 10, agi: 9, sht: 9, pas: 5, chk: 6, sta: 6 }, [0, 0, 1], 680, 'A blur of orange and black, gone before you hear the skates.', 'speedster', 'L'),
  tigers_d: recruit('tigers', 'stone', { spd: 6, agi: 7, sht: 9, pas: 6, chk: 10, sta: 8 }, [1, 1, 0], 680, 'Pounces on anyone who comes near the net.', 'enforcer', 'R'),
  pandas_c: recruit('pandas', 'frost', { spd: 8, agi: 9, sht: 8, pas: 10, chk: 5, sta: 6 }, [0, 1, 1], 700, 'Unhurried and unstoppable. Every pass lands right on the tape.', 'playmaker', 'L'),
  pandas_w: recruit('pandas', 'thunder', { spd: 9, agi: 10, sht: 9, pas: 6, chk: 5, sta: 6 }, [1, 0, 1], 700, 'Rolls off checks like a panda down a hill, then scores.', 'dangler', 'R'),
  pandas_d: recruit('pandas', 'stone', { spd: 6, agi: 7, sht: 8, pas: 7, chk: 10, sta: 8 }, [1, 1, 0], 700, 'A gentle giant, until you try to get past.', 'enforcer', 'L'),
};
const ROLE_TITLE = { C: 'Centre', W: 'Winger', D: 'Defender' };
for (const [key, r] of Object.entries(RECRUITS)) {
  const t = TEAMS[r.team];
  const c = CHARACTERS[r.kit];
  // (an expansion club's player is made from parts: their look, and the newcomer art until it's in)
  Object.assign(r, { key, name: t.names[r.kit], role: c.role, title: `${t.single || t.name.split(' ').slice(-1)[0].replace(/s$/, '')} ${ROLE_TITLE[c.role]}`, sprite: t.art ? `${t.art}_${ROLE[r.kit]}` : `newcomer_${ROLE[r.kit]}`, parts: (t.looks || {})[r.kit] || null, elem: (t.elems || {})[r.kit] || c.elem });
}
for (const kit of ['frost', 'thunder', 'stone']) Object.assign(RECRUITS[`foxes_${ROLE[kit]}`], { sprite: CHARACTERS[kit].sprite, parts: null }); // (the cast's own art)
export const recruitKey = (teamId, kit) => `${teamId}_${ROLE[kit]}`;
// How old each rival star is in a save's first season (slots.js ages them): the young ones
// still improving, the old monarch near the end.
export const STAR_AGES = {
  lynx_c: 22, lynx_w: 21, lynx_d: 26, comets_c: 25, comets_w: 23, comets_d: 29, rams_c: 27, rams_w: 26, rams_d: 30,
  ravens_c: 28, ravens_w: 24, ravens_d: 29, royals_c: 27, royals_w: 25, royals_d: 32, owls_c: 26, owls_w: 24, owls_d: 31,
  moose_c: 28, moose_w: 22, moose_d: 27,
  capybaras_c: 29, capybaras_w: 24, capybaras_d: 27, puffins_c: 22, puffins_w: 21, puffins_d: 25, grizzlies_c: 28, grizzlies_w: 26, grizzlies_d: 31,
  seals_c: 25, seals_w: 23, seals_d: 28, penguins_c: 30, penguins_w: 26, penguins_d: 29, bulls_c: 26, bulls_w: 22, bulls_d: 30,
  narwhals_c: 24, narwhals_w: 23, narwhals_d: 27, pandas_c: 27, pandas_w: 23, pandas_d: 29,
  tigers_c: 25, tigers_w: 22, tigers_d: 28, foxes_c: 20, foxes_w: 20, foxes_d: 21, beavers_c: 27, beavers_w: 24, beavers_d: 30, flamingos_c: 23, flamingos_w: 22, flamingos_d: 26,
};
// The kit a rival slot plays with: that player's archetype and the team's super for the slot.
export const slotDef = (teamId, kit) => {
  const r = RECRUITS[recruitKey(teamId, kit)];
  return { ...makeDef(kit, r?.arch, ((TEAMS[teamId] || {}).elems || {})[kit]), hand: r?.hand || CHARACTERS[kit].hand };
};
export const KIT_OF_ROLE = { C: 'frost', W: 'thunder', D: 'stone' };

// Rival goalies you can sign once you've beaten their team ('<team>_g'). Their club then plays
// a backup. Halla is 'halla'.
const GOALIE_PRICES = { lynx: 220, comets: 300, owls: 400, rams: 380, moose: 480, ravens: 460, royals: 560,
  capybaras: 380, puffins: 400, grizzlies: 460, seals: 500, penguins: 540, bulls: 580, narwhals: 640, tigers: 680, pandas: 700, beavers: 420, flamingos: 520, foxes: 300 };
export const GOALIE_RECRUITS = Object.fromEntries(Object.entries(GOALIE_PRICES).map(([team, price]) => {
  const t = TEAMS[team];
  return [`${team}_g`, { key: `${team}_g`, team, name: t.names.goalie, base: { ...t.goalie }, gstyle: t.gstyle, price, art: t.castGoalie ? null : t.art || (t.goalieLook ? goalieArt(t.goalieLook) : 'newcomer'), mask: t.goalieLook || null, title: 'Goaltender' }]; // (an expansion club's goalie: made from parts; the Foxes', Halla in her own art)
}));
// Free-agent goalies signed from the market (agents.js), by id ('fa_g1'), from the save.
export const FREE_GOALIES = {};
export function setFreeGoalies(list = {}) {
  for (const k of Object.keys(FREE_GOALIES)) delete FREE_GOALIES[k];
  Object.assign(FREE_GOALIES, list);
}
// Masks the player has picked at goalie camp for our goalies from parts, by id (from the save).
export const GOALIE_LOOKS = {};
export function setGoalieLooks(map = {}) {
  for (const k of Object.keys(GOALIE_LOOKS)) delete GOALIE_LOOKS[k];
  Object.assign(GOALIE_LOOKS, map);
}
// The mask designs, in the order goalie camp shows them (Batches AT and BC).
export const MASK_NAMES = { classic: 'Classic', flame: 'Flames', wolf_teeth: 'Wolf teeth', stars: 'Stars', stripes: 'Stripes', skull: 'Skull', snow_fox: 'Snow Fox', aurora: 'Aurora', lightning: 'Lightning', tiger: 'Tiger', crown: 'Royal crown', pixel: 'Pixel' };
// Who a goalie is: Halla, a rival's signed goalie or a free agent (in the newcomer goalie's
// art, Batch AN). { id, name, base, style, art }
export function goalieInfo(id) {
  const g = GOALIE_RECRUITS[id], f = FREE_GOALIES[id];
  const own = GOALIE_LOOKS[id]; // (a mask picked at goalie camp)
  if (g) return { id, name: g.name, base: g.base, style: g.gstyle, art: own ? goalieArt(own) : g.art, mask: own || g.mask || null, recruit: g };
  if (f) return { id, name: f.name, base: f.base, style: f.style, art: own || f.look ? goalieArt(own || f.look) : 'newcomer', mask: own || f.look || null, recruit: null, agent: f }; // (a mask of their own once Batch AT is in)
  return { id: 'halla', name: GOALIE.name, base: GOALIE.base, style: GOALIE.gstyle, art: null, recruit: null };
}

// Legends: free agents who turn up in Scouting now and then (see legends.js). Fáfnir and
// Fenrir are twins: dressed together they have a bond from day one and a combo of their own.
export const LEGENDS = {
  fafnir: {
    key: 'fafnir', name: 'Fáfnir', kit: 'stone', hand: 'L', arch: 'blueliner', elem: 'ember', twin: 'fenrir', price: 850, art: 'fafnir',
    title: 'Dragon Defender', base: { spd: 10, agi: 8, sht: 11, pas: 7, chk: 8, sta: 9 },
    blurb: 'A dragon on skates: faster than any defender has a right to be, with a shot like dragonfire.',
  },
  fenrir: {
    key: 'fenrir', name: 'Fenrir', kit: 'thunder', hand: 'R', arch: 'sniper', elem: 'shadow', twin: 'fafnir', price: 850, art: 'fenrir',
    title: 'Wolf Winger', base: { spd: 11, agi: 11, sht: 11, pas: 8, chk: 4, sta: 8 },
    blurb: 'A wolf with silk hands. Gone before anyone sees it coming, and so is the puck.',
  },
};
// The legends' own art once it's in the atlas (main.js sets it); until then they wear the
// newcomer art.
export const LEGEND_ART = new Set();
// Their portraits come first (Batch AI part 1): faces wherever portraits show.
export const LEGEND_FACES = new Set();
export const areTwins = (a, b) => !!(LEGENDS[a] && LEGENDS[a].twin === b);

// Players whose super or style was changed at the training camp, by roster id:
// { elem?, arch? } over their own. Kept in the save (roster[id].elem / .arch) and registered
// here at load and after a change, so member() knows them.
export const STYLES = {};
export function setStyles(roster = {}) {
  for (const k of Object.keys(STYLES)) delete STYLES[k];
  for (const [id, r] of Object.entries(roster)) if (r && (r.elem || r.arch)) STYLES[id] = { elem: r.elem, arch: r.arch };
}

// Drafted rookies (Draft Day), by roster id. They live in the save; loadSave and draftPick
// register them here so member() knows them.
export const ROOKIES = {};
export function setRookies(list = {}) {
  for (const k of Object.keys(ROOKIES)) delete ROOKIES[k];
  Object.assign(ROOKIES, list);
}
export const ROOKIE_TITLE = { C: 'Rookie Centre', W: 'Rookie Winger', D: 'Rookie Defender' };
export const AGENT_TITLE = { C: 'Veteran Centre', W: 'Veteran Winger', D: 'Veteran Defender' };
export const OWN_TITLE = { C: 'Homegrown Centre', W: 'Homegrown Winger', D: 'Homegrown Defender' }; // (players of your own, create.js)

// Everything about a member of our roster ('frost', 'thunder', 'stone', a recruit key or a
// rookie's id). Signings and rookies are drawn from rival or newcomer art in home colours.
function memberBase(who) {
  const k = ROOKIES[who];
  if (k) {
    const c = CHARACTERS[k.kit];
    const body = bodySprite(k.parts); // drawn from parts once that art is in (Batch AJ)
    // (a free agent from the market is kept like a rookie, but a veteran: no potential to show)
    return { who, kit: k.kit, def: makeDef(k.kit, k.arch, k.elem), name: k.name, title: k.agent ? AGENT_TITLE[c.role] : k.own ? OWN_TITLE[c.role] : ROOKIE_TITLE[c.role], base: k.base, role: c.role, blurb: k.blurb, recruit: null, rookie: k.agent ? null : k, agent: k.agent ? k : null, hand: k.hand || 'L', sprite: body || `newcomer_${ROLE[k.kit]}`, parts: body ? k.parts : null, look: 'homekit' };
  }
  const L = LEGENDS[who];
  if (L) {
    const c = CHARACTERS[L.kit];
    return { who, kit: L.kit, def: makeDef(L.kit, L.arch, L.elem), name: L.name, title: L.title, base: L.base, role: c.role, blurb: L.blurb, recruit: null, legend: L, hand: L.hand, sprite: LEGEND_ART.has(L.art) ? L.art : `newcomer_${ROLE[L.kit]}`, look: 'homekit' };
  }
  const r = RECRUITS[who];
  const c = CHARACTERS[r ? r.kit : who];
  if (!c) return null;
  if (!r) return { who, kit: who, def: c, name: c.name, title: c.title, base: c.base, role: c.role, blurb: c.blurb, recruit: null, hand: c.hand, sprite: null, look: null };
  const rb = r.parts && bodySprite(r.parts); // (an expansion club's player: their body and head)
  if (rb) return { who, kit: r.kit, def: makeDef(r.kit, r.arch, r.elem), name: r.name, title: r.title, base: r.base, role: c.role, blurb: r.blurb, recruit: r, hand: r.hand, sprite: rb, parts: r.parts, look: 'homekit' };
  return { who, kit: r.kit, def: makeDef(r.kit, r.arch, r.elem), name: r.name, title: r.title, base: r.base, role: c.role, blurb: r.blurb, recruit: r, hand: r.hand, sprite: r.sprite, look: 'homekit' };
}

// Everything about a member, with any change made at the training camp.
export function member(who) {
  const m = memberBase(who), o = STYLES[who];
  // (the def carries their own stick hand: a recruit may shoot the other way from their kit)
  if (!m || !o) return m && m.def.hand !== m.hand ? { ...m, def: { ...m.def, hand: m.hand } } : m;
  return { ...m, def: { ...makeDef(m.kit, o.arch || m.def.arch, o.elem || m.def.elem), hand: m.hand } };
}

// The combo two members fire comes from their kits; the bond itself is between them.
export function comboFor(pair) {
  const [ka, kb] = pair.split('+');
  if (areTwins(ka, kb)) return COMBOS.ragnarok;
  const [a, b] = [ka, kb].map(member);
  return a && b ? COMBOS[pairKey(a.def.elem, b.def.elem)] || null : null;
}

// Recruits on our side wear home colours: coral becomes cream, violet becomes teal.
// 'club' recolours our own art (teal trim, cream jersey) when the club has custom colours.
export const PALETTES = {
  homekit: { id: 'homekit', recolor: { h1: 46, h2: 188, sat: 0.32, val: 1.08, sat2: 0.9, val2: 1.3 }, groups: [] },
  club: { id: 'club', recolor: null },
};

// The All-Star Game's other bench: the league's stars in an All-Star kit (navy, gold trim).
// Not a league team (it isn't in TEAMS); the rival art pages it recolours are set per game.
export const ALLSTAR = {
  id: 'allstar', plan: 'balanced', chem: 0, get name() { return t('League All-Stars'); }, get nick() { return t('All-Stars'); }, short: 'ALL', crest: null, art: null, arena: 'home',
  color: '#3d63b8', color2: '#ffd45e', recolor: { h1: 222, h2: 46, sat: 0.75, val: 0.62, sat2: 1.0, val2: 1.05 },
  diff: 0.2, bonus: {}, goalie: { rfx: 6, pos: 6 }, names: { goalie: 'All-Star goalie' }, subs: {}, groups: [],
  style: 'The league\'s best, all on one bench.',
};
PALETTES.allstar = ALLSTAR;
// A team by id, the All-Stars included.
export const teamInfo = (id) => TEAMS[id] || (id === 'allstar' ? ALLSTAR : null);

// ---------------------------------------------------------------- your club
// Name, nickname, short code and colours (trim, jersey). Defaults are the Snowcrest Foxes.
export const CLUB_DEFAULT = { name: 'Snowcrest Foxes', nick: 'Foxes', short: 'FOX', trim: '#71dce8', jersey: '#fff2cb', crest: 'fox' };
// The club's crest: the Snow Fox, or one of Batch AW's designs (all recoloured like our art).
export const CLUB_CRESTS = [
  { id: 'fox', name: 'Snow Fox' }, { id: 'wolf', name: 'Wolf' }, { id: 'bear', name: 'Polar bear' }, { id: 'owl', name: 'Snowy owl' },
  { id: 'narwhal', name: 'Narwhal' }, { id: 'mountain', name: 'Mountain' }, { id: 'bolt', name: 'Lightning' },
];
export const clubCrestId = (crest) => (crest && crest !== 'fox' ? 'crests_club/' + crest : 'hud_elements/misc/home_crest');
export const CLUB = { ...CLUB_DEFAULT, custom: false };
export const CLUB_PRESETS = [
  { id: 'glacial', name: 'Snowcrest', trim: '#71dce8', jersey: '#fff2cb' },
  { id: 'crimson', name: 'Crimson', trim: '#e0303c', jersey: '#f6f1e9' },
  { id: 'forest', name: 'Forest', trim: '#2fae5a', jersey: '#f3efe0' },
  { id: 'royal', name: 'Royal', trim: '#3d6bff', jersey: '#e9eef8' },
  { id: 'inferno', name: 'Inferno', trim: '#ff8a1f', jersey: '#2b2b33' },
  { id: 'goldrush', name: 'Gold rush', trim: '#ffc21a', jersey: '#24315e' },
  { id: 'bubblegum', name: 'Bubblegum', trim: '#ff6fb5', jersey: '#fff0f7' },
  { id: 'midnight', name: 'Midnight', trim: '#a07bff', jersey: '#2a2440' },
];

export function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: mx ? d / mx : 0, v: mx };
}

// Make the club's settings live: names everywhere, colours for our art and signings. A career
// as another club (club.team, clubs.js) starts from that club: its name, colours and crest, its
// stars in its own kit, and the cast's names in other clubs' lines become its stars' (CAST_SWAP).
const CAST_SWAP = {};
export function applyClub(club) {
  const T = club && club.team && TEAMS[club.team] && !TEAMS[club.team].careerOnly ? TEAMS[club.team] : null;
  const start = T ? { ...CLUB_DEFAULT, name: T.name, nick: T.single ? T.name.split(' ').slice(-1)[0] : T.name.split(' ').slice(-1)[0], short: T.short, trim: T.color, jersey: T.color2, crest: 'team' } : CLUB_DEFAULT;
  const c = { ...start, ...(club || {}) };
  Object.assign(CLUB, c, { team: T ? T.id : null, custom: !!T || (!!club && (c.name !== CLUB_DEFAULT.name || c.trim !== CLUB_DEFAULT.trim || c.jersey !== CLUB_DEFAULT.jersey || c.short !== CLUB_DEFAULT.short || c.nick !== CLUB_DEFAULT.nick || c.crest !== CLUB_DEFAULT.crest)) });
  for (const k of Object.keys(CAST_SWAP)) delete CAST_SWAP[k];
  const names = T ? T.names : c.names; // (a club of one's own: its founders')
  if (names) Object.assign(CAST_SWAP, { Nix: names.frost, Volta: names.thunder, Bram: names.stone, Halla: names.goalie });
  const home = TEAMS.home;
  home.name = c.name; home.short = c.short; home.color = c.trim; home.color2 = c.jersey; home.crest = T && c.crest === 'team' ? `rival_crests/crest/${T.art || T.mark}` : clubCrestId(c.crest); // (a club career: its own crest)
  const t = hexToHsv(c.trim), j = hexToHsv(c.jersey);
  const recoloured = c.trim !== CLUB_DEFAULT.trim || c.jersey !== CLUB_DEFAULT.jersey;
  // our own art: teal trim (h 187 s .51 v .91) and cream jersey (h 45 s .2 v 1)
  PALETTES.club.recolor = recoloured ? { mode: 'home', trim: t, jersey: j } : null;
  // signings: coral (s ~.6, v ~1) becomes the jersey, violet (s ~.5, v ~.75) the trim
  Object.assign(PALETTES.homekit.recolor, T && T.recolor && c.trim === T.color && c.jersey === T.color2 ? { ...T.recolor } : { // (a club career: its own kit, exactly)
    h1: j.h, sat: Math.max(0.05, j.s / 0.6), val: Math.max(0.2, j.v * 1.06),
    h2: t.h, sat2: Math.max(0.05, t.s / 0.55), val2: Math.max(0.2, t.v / 0.72),
  });
  return CLUB;
}

// Swap the default club name into a line of text.
// clubText for words with names filled in: the club's name goes into the line's own words, never
// into what's filled in ({team} or {name} may be the Foxes or one of them, a club like any other
// in a career as another club). Already translated.
export const clubT = (text, params) => { const out = clubText(t(text)); return params ? out.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m)) : out; };
export function clubText(str) {
  if (!CLUB.custom || !str) return str;
  const out = String(str).replace(/Snowcrest Foxes/g, CLUB.name).replace(/\bFoxes\b/g, CLUB.nick);
  return CAST_SWAP.Nix ? out.replace(/\b(Nix|Volta|Bram|Halla)\b/g, (n) => CAST_SWAP[n] || n) : out; // (a club career: its stars, not the cast)
}

// The Frostline clubs' match settings: the power pucks in play and the purse (a division's
// purse on top, tiers.js).
export const TOURNAMENT = {
  name: 'Frostline Regional Cup',
  stages: [
    { team: 'lynx', round: 'Group Stage', powers: [], reward: 120 },
    { team: 'comets', round: 'Group Stage', powers: ['fire', 'ice'], reward: 160 },
    { team: 'owls', round: 'Group Stage', powers: ['fire', 'ice', 'lightning'], reward: 185 },
    { team: 'rams', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 210 },
    { team: 'moose', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 240 },
    { team: 'ravens', round: 'Semifinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 270 },
    { team: 'royals', round: 'Final', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 400 },
  ],
};
// The National clubs' match settings, and the Elite's own (the league plays them like the Frostline's: see stageOf).
export const NATIONAL_STAGES = [
  { team: 'capybaras', round: 'Group Stage', powers: ['fire', 'ice'], reward: 160 },
  { team: 'puffins', round: 'Group Stage', powers: ['fire', 'ice', 'lightning'], reward: 185 },
  { team: 'grizzlies', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 210 },
  { team: 'seals', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 240 },
  { team: 'penguins', round: 'Semifinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 270 },
  { team: 'bulls', round: 'Semifinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 300 },
  { team: 'narwhals', round: 'Final', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 400 },
  { team: 'beavers', round: 'Group Stage', powers: ['fire', 'ice'], reward: 175 },
  { team: 'flamingos', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 255 },
  { team: 'tigers', round: 'Final', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 410 }, // (the Elite's own)
  { team: 'pandas', round: 'Final', powers: ['fire', 'ice', 'lightning', 'gravity'], reward: 420 },
];
export const stageOf = (team) => (team === 'foxes' ? { ...stageOf(CAREER.team || (CAREER.custom ? 'owls' : 'lynx')), team: 'foxes' } // (the Foxes play in the slot of the club the player took; mid-table beside a club of one's own)
  : TOURNAMENT.stages.find((x) => x.team === team) || NATIONAL_STAGES.find((x) => x.team === team) || TOURNAMENT.stages[0]);

// Chemistry: pairs who pass to each other build a bond over the season. From level 1, a
// pass between the pair followed by a quick shot (or one-timer) fires their combo shot.
export const CHEM_LEVELS = [12, 50, 120]; // total chemistry XP needed for levels 1, 2, 3
export const pairKey = (a, b) => [a, b].sort().join('+');
const GENERIC_LEVELS = ['Unlocks the combo', 'Stronger effects', 'Strongest effects'];
export const COMBOS = {
  // the twins' own: Fáfnir and Fenrir passing to each other
  ragnarok: {
    name: 'Ragnarök', colors: ['#ff7a3d', '#9b8cff'], icon: 'icons/combo_twins',
    text: 'The twins\' combo: a shot out of the dark and on fire. It flies faster, knocks back anyone in its way, and no goalie can hold it.',
    levels: ['The twins\' bond: from their first game together', 'Stronger effects', 'Strongest effects'],
  },
  'frost+thunder': {
    name: 'Frostbolt', colors: ['#bff4ff', '#ffe066'], icon: 'icons/combo_frostbolt',
    text: 'A crackling ice shot that slows every defender it passes and is hard to hold.',
    levels: ['Unlocks Frostbolt', 'Slows defenders longer', 'Goalies can\'t catch it'],
  },
  'frost+stone': {
    name: 'Avalanche', colors: ['#bff4ff', '#c9b79c'], icon: 'icons/combo_avalanche',
    text: 'A heavy shot that bulldozes through the first blocker. Goalies can\'t catch it.',
    levels: ['Unlocks Avalanche', 'Plows through two blockers', 'Big rebound into the slot'],
  },
  'stone+thunder': {
    name: 'Thunderquake', colors: ['#ffe066', '#c9b79c'], icon: 'icons/combo_thunderquake',
    text: 'The release sends a shockwave that knocks nearby defenders off their feet.',
    levels: ['Unlocks Thunderquake', 'Wider shockwave', 'Even faster shot'],
  },
  // two of the same element (a club whose centre and defender share one, or a super changed at
  // camp): the element's part, twice over. Ours only: the rivals don't get these (Match.shoot).
  'frost+frost': {
    name: 'Deep Freeze', colors: ['#bff4ff', '#e8fbff'], icon: null,
    text: 'An ice-cold shot that slows every defender it passes.', levels: GENERIC_LEVELS,
  },
  'thunder+thunder': {
    name: 'Double Strike', colors: ['#ffe066', '#fffbd1'], icon: null,
    text: 'A crackling rocket, faster than a single bolt.', levels: GENERIC_LEVELS,
  },
  'stone+stone': {
    name: 'Landslide', colors: ['#c9b79c', '#a08a6c'], icon: null,
    text: 'A heavy shot that plows through a blocker.', levels: GENERIC_LEVELS,
  },
  'ember+ember': {
    name: 'Wildfire', colors: ['#ff7a3d', '#ffb38a'], icon: null,
    text: 'A blazing shot that burns the goalie\'s glove.', levels: GENERIC_LEVELS,
  },
  'gale+gale': {
    name: 'Whirlwind', colors: ['#c8f0d8', '#e8fff2'], icon: null,
    text: 'A shot the wind carries to the open corner.', levels: GENERIC_LEVELS,
  },
  'shadow+shadow': {
    name: 'Eclipse', colors: ['#6b5b95', '#9b8cff'], icon: null,
    text: 'A shot that slips out of sight on its way to the net.', levels: GENERIC_LEVELS,
  },
  // the newer elements' pairs: each element brings its part of the shot (see Match.shoot)
  'ember+frost': {
    name: 'Steam Burst', colors: ['#ffb38a', '#bff4ff'], icon: null,
    text: 'A hissing shot that slows defenders it passes and is hard to hold.', levels: GENERIC_LEVELS,
  },
  'ember+stone': {
    name: 'Magma', colors: ['#ff7a3d', '#c9b79c'], icon: null,
    text: 'A molten shot that plows through a blocker and burns the goalie\'s glove.', levels: GENERIC_LEVELS,
  },
  'ember+thunder': {
    name: 'Plasma', colors: ['#ff7a3d', '#ffe066'], icon: null,
    text: 'A white-hot rocket: faster than anything, and hard to hold.', levels: GENERIC_LEVELS,
  },
  'ember+gale': {
    name: 'Wildfire', colors: ['#ff7a3d', '#bff0dc'], icon: null,
    text: 'Fanned flames that find the open corner and are hard to hold.', levels: GENERIC_LEVELS,
  },
  'ember+shadow': {
    name: 'Smoke Screen', colors: ['#ff7a3d', '#9b8cff'], icon: null,
    text: 'A shot out of the smoke: hidden at first, then too hot to hold.', levels: GENERIC_LEVELS,
  },
  'frost+gale': {
    name: 'Blizzard', colors: ['#bff4ff', '#bff0dc'], icon: null,
    text: 'A whiteout shot that finds the open corner and slows defenders.', levels: GENERIC_LEVELS,
  },
  'frost+shadow': {
    name: 'Black Ice', colors: ['#bff4ff', '#9b8cff'], icon: null,
    text: 'A shot nobody sees coming that slows anyone it passes.', levels: GENERIC_LEVELS,
  },
  'gale+thunder': {
    name: 'Hurricane', colors: ['#bff0dc', '#ffe066'], icon: null,
    text: 'A howling shot: faster, and steered to the open corner.', levels: GENERIC_LEVELS,
  },
  'shadow+thunder': {
    name: 'Dark Bolt', colors: ['#9b8cff', '#ffe066'], icon: null,
    text: 'A lightning shot out of nowhere: fast, and hidden at first.', levels: GENERIC_LEVELS,
  },
  'gale+stone': {
    name: 'Sandstorm', colors: ['#bff0dc', '#c9b79c'], icon: null,
    text: 'A grinding shot that plows a blocker aside and finds the corner.', levels: GENERIC_LEVELS,
  },
  'shadow+stone': {
    name: 'Obsidian', colors: ['#9b8cff', '#c9b79c'], icon: null,
    text: 'A heavy shot out of the dark that plows through a blocker.', levels: GENERIC_LEVELS,
  },
  'gale+shadow': {
    name: 'Night Wind', colors: ['#bff0dc', '#9b8cff'], icon: null,
    text: 'A silent shot that drifts to the open corner unseen.', levels: GENERIC_LEVELS,
  },
};
// the cast's three pairs, whose bonds every save starts with
export const CAST_PAIRS = ['frost+thunder', 'frost+stone', 'stone+thunder'];

// Game plans picked before league matches. Each one beats one other plan.
export const GAME_PLANS = {
  balanced: { id: 'balanced', name: 'Balanced', icon: 'icons/plan_balanced', beats: null, text: 'Read and react. No edge, no weakness.', pros: 'Safe against anything', cons: 'Never has the edge' },
  forecheck: { id: 'forecheck', name: 'Forecheck', icon: 'icons/plan_forecheck', beats: 'rungun', text: 'Two skaters hunt the puck in their end and finish every check.', pros: 'More hits and steals', cons: 'Stamina recovers slower; can get caught up ice' },
  trap: { id: 'trap', name: 'Trap', icon: 'icons/plan_trap', beats: 'forecheck', text: 'Clog the lanes at your blue line and sit goal-side of everyone.', pros: 'Fewer chances against, stronger goalie', cons: 'Fewer chances for' },
  rungun: { id: 'rungun', name: 'Run-and-gun', icon: 'icons/plan_rungun', beats: 'trap', text: 'Wingers cheat up ice, the defender joins the rush, shoot from anywhere.', pros: 'More and harder shots', cons: 'Your goalie sees more odd-man rushes' },
};

// Challenge modifiers for exhibitions. mult scales the coin reward.
export const CHALLENGES = [
  { id: 'onetimers', name: 'One-timers only', icon: 'icons/ch_onetimers', text: 'Only one-timer goals count, for both teams.', mult: 1.5 },
  { id: 'giant', name: 'Giant goalies', icon: 'icons/ch_giant_goalies', text: 'Both goalies cover 40% more net.', mult: 1.4 },
  { id: 'iceage', name: 'Ice age', icon: 'icons/ch_ice_age', text: 'Ice power orbs appear every few seconds.', mult: 1.1 },
  { id: 'speed', name: 'Lightning round', icon: 'icons/ch_lightning_round', text: 'Everyone skates 20% faster and the puck glides further.', mult: 1.2 },
  { id: 'heavy', name: 'Heavy hitters', icon: 'icons/ch_heavy_hitters', text: 'Checks hit 50% harder and cost half the stamina.', mult: 1.1 },
  { id: 'sudden', name: 'Next goal wins', icon: 'icons/ch_next_goal_wins', text: 'One goal decides it.', mult: 0.5 },
];

export const POWER_INFO = {
  fire: { name: 'Fire Puck', icon: 'hud_elements/ability/fire', color: '#ff7a3d', text: 'Next shot flies faster and burns past the goalie.' },
  ice: { name: 'Ice Puck', icon: 'hud_elements/ability/frost', color: '#7fe3ff', text: 'Next shot freezes the first skater or goalie it hits.' },
  lightning: { name: 'Lightning Puck', icon: 'hud_elements/ability/lightning', color: '#ffe066', text: 'Next pass is instant and charges the receiver\'s shot.' },
  gravity: { name: 'Gravity Puck', icon: 'hud_elements/ability/gravity', color: '#b07cff', text: 'Next shot curves toward your aim.' },
};

// Pre- and post-match scenes. speaker: 'us' (our captain), 'them' (their captain),
// or a character id from our roster.
// Kip, when the expansion clubs join the league (the second season)
export const EXPANSION_LINES = [
  ['kip', null, 'Big news, folks: the Frostline grows! Two new clubs join the league this season.'],
  ['kip', null, 'From the north, the patient, sharp-eyed Glacier Owls. And from the timber country, the Thunder Moose. Mind your toes.'],
  ['them', 'frost', 'New league, new rink, same old Foxes. We\'ve been watching your tapes.'],
  ['us', 'frost', 'Seven rounds now. More games, more chances. Let\'s go.'],
];
// ...and in a career as one of the expansion clubs (clubs.js), the two who join are the other
// expansion club and the Foxes (never the word for them: clubText would make it ours).
export function expansionLines(fresh) {
  if (!fresh.includes('foxes')) return EXPANSION_LINES;
  const other = fresh.find((id) => id !== 'foxes');
  return EXPANSION_LINES.map((l, i) => (i !== 1 ? l : ['kip', null, other === 'moose'
    ? 'From the timber country, the Thunder Moose. And from Snowcrest, the club with the fox on its crest and big dreams. Mind your toes.'
    : 'From the north, the patient, sharp-eyed Glacier Owls. And from Snowcrest, the club with the fox on its crest and big dreams.']));
}

export const DIALOGUE = {
  lynx: {
    pre: [
      ['them', 'frost', 'Are you the Snowcrest Foxes? Coach says you\'re the team to watch this year!'],
      ['us', 'frost', 'We\'re just getting started. Good luck out there, Fern.'],
      ['us', 'thunder', 'Nix, they\'re practically puppies. Can I go full speed?'],
      ['us', 'stone', 'Pass the puck, Volta. That\'s how we win this cup.'],
    ],
    win: [['them', 'frost', 'Wow... we didn\'t even see that last goal. See you at the next tournament!']],
    loss: [['them', 'frost', 'We won?! Pinewood never wins!']],
  },
  comets: {
    pre: [
      ['them', 'thunder', 'Snowcrest Foxes. Cute name. Ever played against fire?'],
      ['us', 'thunder', 'Ever tried to catch lightning, Blaze?'],
      ['them', 'stone', 'Watch for the power orbs. Grab one and that puck burns hot.'],
      ['us', 'frost', 'Stay calm and move the puck. Their tempers are their weakness.'],
    ],
    win: [['them', 'thunder', 'Tch. This isn\'t over. The Comets always come back around.']],
    loss: [['them', 'thunder', 'Told you. Nothing beats fire.']],
  },
  rams: {
    pre: [
      ['them', 'stone', 'In Gilded Rams country, we settle things shoulder to shoulder.'],
      ['us', 'stone', 'Finally, someone who speaks my language.'],
      ['us', 'frost', 'Their checks are heavy but slow. Quick passes will beat them.'],
      ['them', 'thunder', 'And if you get past Horn, Gilda will bury the rebound!'],
    ],
    win: [['them', 'stone', 'Hah! You hit like a mountain, Bram. Win the whole thing, all right?']],
    loss: [['them', 'stone', 'Good fight. Come back heavier.']],
  },
  ravens: {
    pre: [
      ['them', 'frost', 'The Foxes. You play with your hearts. We play with structure.'],
      ['us', 'frost', 'Structure breaks, Corvin. Ice cracks.'],
      ['them', 'thunder', 'Ride the speed lanes if you can keep up. We practise on them every day.'],
      ['us', 'thunder', 'Arrows on the ice? Sounds like a fast track to your net.'],
    ],
    win: [['them', 'frost', '...Unexpected. The Royals won\'t make the mistakes we did.']],
    loss: [['them', 'frost', 'As calculated.']],
  },
  owls: {
    pre: [
      ['them', 'frost', 'New league, new rink, same old Foxes. We\'ve been watching your tapes.'],
      ['us', 'thunder', 'Watching tapes? Do they ever actually skate?'],
      ['them', 'stone', 'We skate when it matters. Right after you make a mistake.'],
      ['us', 'frost', 'Then no mistakes. Short passes, and keep your heads up.'],
    ],
    win: [['them', 'frost', 'Noted. We\'ll have an answer for that next time.']],
    loss: [['them', 'thunder', 'Patience wins hockey games. You\'ll learn.']],
  },
  moose: {
    pre: [
      ['them', 'stone', 'Hear that rumble, Foxes? That\'s us coming down the ice.'],
      ['us', 'stone', 'Big doesn\'t mean fast. Move the puck before they arrive.'],
      ['them', 'thunder', 'We\'re big AND fast. Ask the boards.'],
      ['us', 'frost', 'Keep your feet moving and your head up. We can outskate a stampede.'],
    ],
    win: [['them', 'stone', 'You got lucky. The boards will remember you.']],
    loss: [['them', 'thunder', 'STAMPEDE! Sorry. We get excited.']],
  },
  royals: {
    pre: [
      ['them', 'frost', 'The Foxes. Cute little team. See you in the playoffs... if you make it.'],
      ['us', 'frost', 'We\'ll be there, Solenne. Count on it.'],
      ['them', 'thunder', 'Watch the lights. When the aurora shifts, so does the ice under you.'],
      ['us', 'stone', 'Everybody, together. Show them who we are.'],
    ],
    win: [['them', 'frost', 'A regular-season win. Don\'t get used to it.']],
    loss: [['them', 'frost', 'Long live the Royals. Try again, little Foxes.']],
    final: [
      ['them', 'frost', 'So the frozen underdogs reached the final. How charming.'],
      ['us', 'frost', 'We didn\'t come here for charm, Solenne. We came for the cup.'],
      ['them', 'thunder', 'Watch the lights. When the aurora shifts, so does the ice under you.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    finalWin: [['them', 'frost', 'The cup is yours, Foxes. Enjoy it while it lasts.']],
    finalLoss: [['them', 'frost', 'Champions again. Come back when you\'re ready, Foxes.']],
  },
  // the National division's clubs
  capybaras: {
    pre: [
      ['them', 'frost', 'Welcome to the Hot Springs! Have a nice warm soak after the game. We will.'],
      ['us', 'thunder', 'They look half asleep. Can I go full speed?'],
      ['them', 'thunder', 'Go ahead. We\'ll still be here when you\'re tired.'],
      ['us', 'frost', 'Don\'t let them slow us down. Quick passes, quick feet.'],
    ],
    win: [['them', 'frost', 'Hmm. Nice game. Time for a bath.']],
    loss: [['them', 'thunder', 'No rush, no fuss, and the win. See you next time.']],
  },
  puffins: {
    pre: [
      ['them', 'thunder', 'Hi! Hello! Are you the Foxes? Watch this! No, over here!'],
      ['us', 'stone', 'Stay in front of them. They\'re faster than they look.'],
      ['them', 'frost', 'Small birds, big cliffs. We fly off the boards.'],
      ['us', 'frost', 'Tight gaps and sticks on the ice. Take their passes away.'],
    ],
    win: [['them', 'thunder', 'Aw! Next time we\'ll be even quicker!']],
    loss: [['them', 'frost', 'Whoosh! Did you see that? Neither did you!']],
  },
  grizzlies: {
    pre: [
      ['them', 'stone', 'Welcome to the Timber Lodge. Mind the boards. They\'ve been hit a lot.'],
      ['us', 'stone', 'So have I. Let\'s see who blinks first.'],
      ['them', 'thunder', 'Honey for the winners, splinters for the rest.'],
      ['us', 'frost', 'Heads up and move the puck early. Don\'t let them pin us on the wall.'],
    ],
    win: [['them', 'stone', 'Grr. You\'re tougher than you look, Foxes.']],
    loss: [['them', 'frost', 'A good, honest game. Now, where\'s that honey?']],
  },
  seals: {
    pre: [
      ['them', 'thunder', 'Try to hit us. Go on. Try.'],
      ['us', 'thunder', 'Slippery, huh? I\'m slipperier.'],
      ['them', 'frost', 'Out on the Floes the ice moves with the tide. We move with it.'],
      ['us', 'frost', 'Don\'t chase them. Stay between them and our net and let them come to us.'],
    ],
    win: [['them', 'thunder', 'Wow. You actually caught us. Nobody catches us.']],
    loss: [['them', 'thunder', 'Splash! Too slippery for you.']],
  },
  penguins: {
    pre: [
      ['them', 'frost', 'Pass. Pass. Pass. Score. That\'s the plan. It always works.'],
      ['us', 'frost', 'We pass too, Tux. Let\'s see whose plan works better.'],
      ['them', 'stone', 'On the pack ice we huddle together. Nobody skates alone.'],
      ['us', 'stone', 'Then we break up the huddle. Pressure the passer.'],
    ],
    win: [['them', 'frost', 'Hmm. You out-passed the Penguins. That\'s new.']],
    loss: [['them', 'thunder', 'Teamwork wins again! Everyone gets a fish.']],
  },
  bulls: {
    pre: [
      ['them', 'stone', 'Hot sun, cold ice. From the canyon country, here come the Bulls!'],
      ['us', 'thunder', 'Ice in the desert? How does it even stay frozen?'],
      ['them', 'thunder', 'We skate so fast it doesn\'t have time to melt.'],
      ['us', 'frost', 'They charge straight ahead. Step aside and pass behind them.'],
    ],
    win: [['them', 'stone', 'You\'re a tough crowd, Foxes. Come and visit when it\'s warm.']],
    loss: [['them', 'frost', 'Nobody stops a charge from the canyon!']],
  },
  narwhals: {
    pre: [
      ['them', 'frost', 'The Northlight Narwhals. You\'ve heard of us. Everyone has.'],
      ['us', 'frost', 'We\'ve heard. Now you\'ll hear about us.'],
      ['them', 'thunder', 'Under the northern lights, our wingers shine. Try to keep up.'],
      ['us', 'stone', 'Everybody back, everybody together. They only score on the rush.'],
    ],
    win: [['them', 'frost', '...The Foxes. We\'ll remember that name.']],
    loss: [['them', 'thunder', 'The north shines brightest. Better luck next time.']],
    final: [
      ['them', 'frost', 'The Foxes in the final. You\'ve come a long way from the Frostline.'],
      ['us', 'frost', 'And we\'re going all the way, Tusk.'],
      ['them', 'thunder', 'Under the northern lights, our wingers shine. Try to keep up.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    finalWin: [['them', 'frost', 'The cup is yours. The north will be back for it.']],
    finalLoss: [['them', 'frost', 'The north shines brightest. Come back next season, Foxes.']],
  },
  beavers: {
    pre: [
      ['them', 'stone', 'Welcome to the Millpond. Mind the dam. We built it ourselves.'],
      ['us', 'thunder', 'They\'ve piled logs in front of their net. Is that even allowed?'],
      ['them', 'frost', 'Those are our defenders. Good luck chewing through them.'],
      ['us', 'frost', 'A dam has gaps. Move the puck side to side and find them.'],
    ],
    win: [['them', 'stone', 'A leak in the dam! Back to work, everyone.']],
    loss: [['them', 'frost', 'Nothing gets through a Beaver dam. Nothing!']],
  },
  flamingos: {
    pre: [
      ['them', 'thunder', 'Hello, darlings! Welcome to Coral Bay. Isn\'t the ice lovely and pink?'],
      ['us', 'stone', 'Pink ice? I just want to know where the puck is.'],
      ['them', 'frost', 'We glide, we twirl, we score. Try to keep up on two skates.'],
      ['us', 'frost', 'Stay on your feet and keep them to the outside. They don\'t like a bump.'],
    ],
    win: [['them', 'thunder', 'Oh! You ruffled our feathers. Well played.']],
    loss: [['them', 'frost', 'And that\'s how it\'s done. On one skate!']],
  },
  // the Foxes, as a club of the league (clubs.js; never the word for them: clubText would make it ours)
  foxes: {
    pre: [
      ['them', 'frost', 'So you\'re the club everyone\'s talking about. Snowcrest doesn\'t scare easily.'],
      ['us', 'frost', 'Neither do we. Let\'s play.'],
      ['them', 'thunder', 'Fast hands, quick feet, and we never quit. Try to keep up!'],
      ['us', 'stone', 'Keep it simple and stay together. They feed off mistakes.'],
    ],
    win: [['them', 'frost', 'Good game. Snowcrest will be back, and faster.']],
    loss: [['them', 'thunder', 'Snowcrest wins! Did you see that last goal?']],
    final: [
      ['them', 'frost', 'The final. Snowcrest has waited a long time for this one.'],
      ['us', 'frost', 'So have we. Let\'s make it a good one.'],
      ['them', 'stone', 'We\'re clearing the way, and we\'re not stopping.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    finalWin: [['them', 'frost', 'You earned it. Snowcrest will be back next season.']],
    finalLoss: [['them', 'frost', 'The cup goes home to Snowcrest! Thanks for a great final.']],
  },
  // the Elite's own
  tigers: {
    pre: [
      ['them', 'thunder', 'Smell that? Snow, pine needles, and Foxes. Our favourite.'],
      ['us', 'stone', 'Big cats, big claws. Keep your sticks down and your heads up.'],
      ['them', 'frost', 'In the taiga we hunt in the snow. We never stop until we catch something.'],
      ['us', 'frost', 'Then keep the puck moving. You can\'t catch what you can\'t reach.'],
    ],
    win: [['them', 'frost', 'Grrr. You got away this time, Foxes.']],
    loss: [['them', 'thunder', 'Pounce! Too slow, little Foxes.']],
    final: [
      ['them', 'frost', 'The Foxes in the final. We\'ve been tracking you all season.'],
      ['us', 'frost', 'Then you know we don\'t back down, Stripe.'],
      ['them', 'thunder', 'Smell that? Snow, pine needles, and Foxes. Our favourite.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    finalWin: [['them', 'frost', 'The Elite Cup is yours. Hunt well, Foxes.']],
    finalLoss: [['them', 'frost', 'The taiga wins again. Come back with sharper claws.']],
  },
  pandas: {
    pre: [
      ['them', 'frost', 'Welcome to Bamboo Grove. Take your time. We always do.'],
      ['us', 'thunder', 'They\'re just sitting there chewing. Are they even awake?'],
      ['them', 'stone', 'Wide awake. Come and find out.'],
      ['us', 'frost', 'Don\'t let the calm fool you. Move the puck fast and never hand it to them.'],
    ],
    win: [['them', 'frost', 'Well played, Foxes. It\'s been a long time since anyone did that.']],
    loss: [['them', 'thunder', 'Slow and steady. Every single time.']],
    final: [
      ['them', 'frost', 'The final, and the Foxes again. Good. We like a challenge.'],
      ['us', 'frost', 'Then here\'s one, Inkwell. The biggest cup in the country.'],
      ['them', 'stone', 'Wide awake. Come and find out.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    finalWin: [['them', 'frost', 'The Elite Cup is yours. You earned every bit of it.']],
    finalLoss: [['them', 'frost', 'Patience wins cups. Come back stronger, Foxes.']],
  },
};
// Kip's welcome the first season up a division (main.js newSeasonOn), spoken with the
// division's top club.
export const TIER_LINES = {
  national: { team: 'narwhals', lines: [
    ['kip', null, 'The Foxes go national! New rinks and new rivals, from all over the country.'],
    ['kip', null, 'Capybaras from the hot springs, Beavers from the lakes, Puffins off the sea cliffs, Grizzlies from the timber, slippery Seals, Flamingos from the warm lagoons, Penguins from the pack ice, the Bulls from the canyon country... and the mighty Northlight Narwhals.'],
    ['them', 'frost', 'So these are the Frostline champions. Welcome to the National Cup, Foxes.'],
    ['us', 'frost', 'Nine clubs we\'ve never played. Let\'s go and meet them.'],
  ] },
  elite: { team: 'pandas', lines: [
    ['kip', null, 'The Elite Cup! Only the very best clubs in the country play here.'],
    ['kip', null, 'The Frostline\'s finest, the toughest of the National clubs, and two clubs who only ever play up here: the fierce Taiga Tigers from the snowy forests, and the Bamboo Ridge Pandas, down from their misty mountains.'],
    ['them', 'frost', 'So you\'re the Foxes. We\'ve been waiting a long time for someone worth a game.'],
    ['us', 'frost', 'Then you\'ve found one, Inkwell. Watch.'],
  ] },
};

// Generic playoff scripts (the Royals have their own final, above).
export const PLAYOFF_LINES = {
  semi: {
    pre: [
      ['them', 'frost', 'Semifinal. Win or go home, Foxes.'],
      ['us', 'frost', 'Then we\'re not going home.'],
      ['us', 'thunder', 'Fast and loud, everybody. Let\'s go.'],
    ],
    win: [['them', 'frost', 'Go win the whole thing. Don\'t make us look bad.']],
    loss: [['them', 'frost', 'Good season, Foxes. Not good enough.']],
  },
  final: {
    pre: [
      ['them', 'frost', 'The Cup Final. Everything comes down to tonight.'],
      ['us', 'thunder', 'Then let\'s make it a good story.'],
      ['us', 'stone', 'Everybody, together. One more win.'],
    ],
    win: [['them', 'frost', 'The cup is yours. You earned every inch of it.']],
    loss: [['them', 'frost', 'Champions. Come back next season and try again.']],
  },
  // the Winter Classic, outdoors on Pine Pond (Kip Vance calls it)
  classic: {
    pre: [
      ['kip', 'announcer', 'Welcome to the Winter Classic! Outdoor hockey on Pine Pond, snow coming down, and the whole league watching.'],
      ['them', 'frost', 'No roof out here, Foxes. Nowhere to hide.'],
      ['us', 'frost', 'We all learned to skate on a pond like this. Let\'s play.'],
      ['us', 'stone', 'I brought a thermos of cocoa. For after.'],
    ],
    win: [['kip', 'announcer', 'The Foxes win the Winter Classic! Light up the sky over Pine Pond!'], ['them', 'frost', 'Fine. You earned the cocoa.']],
    loss: [['kip', 'announcer', 'The visitors take the Winter Classic. What a night on the pond.'], ['them', 'frost', 'Pond hockey suits us. See you in the spring.']],
  },
  // the All-Star Game at home, mid-season (Kip Vance calls it)
  allstar: {
    pre: [
      ['kip', 'announcer', 'Welcome to the All-Star Game! The fans have voted, and the league\'s best share one sheet of ice tonight.'],
      ['kip', 'announcer', 'All-Star rules: no penalties, and the ultimates charge twice as fast. Let\'s see some highlights!'],
      ['us', 'frost', 'Passing to the players we usually chase... this is going to be strange.'],
      ['us', 'stone', 'Strange is fine. Just pass me the puck.'],
    ],
    win: [['kip', 'announcer', 'The home All-Stars take it! What a show for the fans!']],
    loss: [['kip', 'announcer', 'The League All-Stars win it! Nobody leaves disappointed tonight.']],
  },
};

export const TUTORIAL_TIPS = [
  'Move with the left stick or WASD. Hold sprint to burn stamina for speed.',
  'With the puck: tap SHOOT for a quick wrist shot, hold it to charge a slapshot.',
  'Hold SHOOT while a pass is coming to fire a one-timer. Goalies hate those.',
  'Without the puck: SHOOT becomes CHECK, PASS becomes SWITCH player.',
  'Skate the puck through a glowing orb to power it up.',
];
