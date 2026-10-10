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

export const GEAR = [
  // sticks
  { id: 'stick_wood', slot: 'stick', name: 'Birch Twig', icon: 'equipment_items/stick/wood', price: 0, mods: {}, text: 'Reliable starter stick.' },
  { id: 'stick_pass', slot: 'stick', name: 'Tape-to-Tape', icon: 'equipment_items/stick/passing', price: 120, mods: { pas: 2, sht: -1 }, text: 'Soft flex for crisp passes.' },
  { id: 'stick_slap', slot: 'stick', name: 'Cannon Shaft', icon: 'equipment_items/stick/slapshot', price: 160, mods: { sht: 2, agi: -1 }, text: 'Heavy and stiff. Big shot, slower hands.' },
  { id: 'stick_frost', slot: 'stick', name: 'Rimefang', icon: 'equipment_items/stick/frost', price: 320, mods: { sht: 1, pas: 2 }, text: 'Carved from glacier ice.' },
  { id: 'stick_bolt', slot: 'stick', name: 'Stormcaller', icon: 'equipment_items/stick/lightning', price: 360, mods: { sht: 2, spd: 1, pas: -1 }, text: 'Crackles when you wind up.' },
  { id: 'stick_grav', slot: 'stick', name: 'Event Horizon', icon: 'equipment_items/stick/gravity', price: 480, mods: { sht: 3, agi: -1, pas: -1 }, text: 'Shots feel heavier than they should.' },
  // skates
  { id: 'skate_start', slot: 'skates', name: 'Rental Blades', icon: 'equipment_items/skates/starter', price: 0, mods: {}, text: 'They fit. Mostly.' },
  { id: 'skate_agile', slot: 'skates', name: 'Pivot Pros', icon: 'equipment_items/skates/agile', price: 140, mods: { agi: 2, spd: -1 }, text: 'Short blades for tight turns.' },
  { id: 'skate_race', slot: 'skates', name: 'Long Track', icon: 'equipment_items/skates/racing', price: 150, mods: { spd: 2, agi: -1 }, text: 'Built for straight lines.' },
  { id: 'skate_tank', slot: 'skates', name: 'Iron Boots', icon: 'equipment_items/skates/reinforced', price: 170, mods: { chk: 1, sta: 1, spd: -1 }, text: 'Plant your feet and hit.' },
  { id: 'skate_frost', slot: 'skates', name: 'Hoarfrost Edges', icon: 'equipment_items/skates/frost', price: 340, mods: { spd: 1, agi: 2 }, text: 'Never lose an edge.' },
  { id: 'skate_bolt', slot: 'skates', name: 'Bolt Runners', icon: 'equipment_items/skates/lightning', price: 420, mods: { spd: 3, sta: -1, agi: -1 }, text: 'Blinding speed, tiring stride.' },
  // protection
  { id: 'arm_none', slot: 'armor', name: 'Practice Jersey', icon: 'equipment_items/armor/chest', price: 0, mods: {}, text: 'Light and breezy.' },
  { id: 'arm_vest', slot: 'armor', name: 'Padded Vest', icon: 'icons/gear_padded_vest', price: 110, mods: { sta: 2, spd: -1 }, text: 'Extra stamina for long shifts.' },
  { id: 'arm_should', slot: 'armor', name: 'Rampart Pads', icon: 'equipment_items/armor/shoulders', price: 180, mods: { chk: 2, agi: -1 }, text: 'Bounce checks right back.' },
  { id: 'arm_helm', slot: 'armor', name: 'Visor Helm', icon: 'equipment_items/armor/helmet', price: 150, mods: { pas: 1, sta: 1 }, text: 'Clear view of the ice.' },
  { id: 'arm_glove', slot: 'armor', name: 'Grip Gloves', icon: 'equipment_items/armor/gloves', price: 200, mods: { sht: 1, pas: 1, chk: -1 }, text: 'Soft hands, thin padding.' },
  { id: 'arm_legs', slot: 'armor', name: 'Glacier Guards', icon: 'equipment_items/armor/leg_guards', price: 260, mods: { chk: 2, sta: 2, spd: -1 }, text: 'Shot-blocking armour.' },
  // goalie
  { id: 'g_start', slot: 'goalie', name: 'Old Mitts', icon: 'equipment_items/armor/goalie_gloves', price: 0, mods: {}, text: 'Patched more than once.' },
  { id: 'g_pro', slot: 'goalie', name: 'Halla\'s Pro Set', icon: 'icons/gear_pro_mitts', price: 380, mods: { rfx: 2 }, text: 'Faster glove, quicker pads.' },
];

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
};

// Rival teams use the away sprites. recolor shifts the coral/violet jersey hues.
export const TEAMS = {
  home: {
    id: 'home', name: 'Snowcrest Foxes', short: 'FOX', crest: 'hud_elements/misc/home_crest',
    color: '#71dce8', color2: '#fff2cb',
  },
  lynx: {
    elems: { thunder: 'gale' }, // supers other than the slot's own
    id: 'lynx', plan: 'forecheck', chem: 0, name: 'Pinewood Lynx', short: 'PIN', crest: 'hud_elements/misc/away_crest',
    art: 'pinewood_lynx', arena: 'pine_pond',
    color: '#7fd16b', color2: '#2f6b3a', recolor: { h1: 118, h2: 95, sat: 0.9, val: 0.92, sat2: 0.8, val2: 0.55 },
    diff: 0.12, bonus: { spd: -1, chk: -1 }, goalie: { rfx: 4, pos: 4 },
    names: { frost: 'Fern', thunder: 'Pip', stone: 'Oakley', goalie: 'Moss' },
    gstyle: 'scrambler', subs: { goalie: 'Thistle', frost: 'Birch', thunder: 'Skip', stone: 'Stump' }, // who plays the slot after you sign its skater
    style: 'Young and eager. They chase the puck in a pack.',
  },
  comets: {
    elems: { thunder: 'ember' }, // supers other than the slot's own
    id: 'comets', plan: 'rungun', chem: 1, name: 'Ember Comets', short: 'EMB', crest: 'hud_elements/misc/away_crest',
    art: 'ember_comets', arena: 'ember_dome',
    color: '#ff6f7d', color2: '#8261bd',
    diff: 0.35, bonus: {}, goalie: { rfx: 5, pos: 5 },
    names: { frost: 'Cinder', thunder: 'Blaze', stone: 'Ash', goalie: 'Smolder' },
    gstyle: 'butterfly', subs: { goalie: 'Ashby', frost: 'Flint', thunder: 'Spark', stone: 'Coal' }, // who plays the slot after you sign its skater
    style: 'Hot-headed scorers who shoot from everywhere.',
  },
  rams: {
    id: 'rams', plan: 'forecheck', chem: 1, name: 'Gilded Rams', short: 'RAM', crest: 'hud_elements/misc/away_crest',
    art: 'gilded_rams', arena: 'golden_hall',
    color: '#ffd45e', color2: '#a86b1d', recolor: { h1: 44, h2: 22, sat: 1.0, val: 1.05, sat2: 0.9, val2: 0.65 },
    diff: 0.55, bonus: { sht: 1, chk: 1 }, goalie: { rfx: 6, pos: 6 },
    names: { frost: 'Aurum', thunder: 'Gilda', stone: 'Horn', goalie: 'Bulwark' },
    gstyle: 'wall', subs: { goalie: 'Ingot', frost: 'Bullion', thunder: 'Brass', stone: 'Crag' }, // who plays the slot after you sign its skater
    style: 'Heavy hitters with heavier slapshots.',
  },
  ravens: {
    elems: { thunder: 'shadow' }, // supers other than the slot's own
    id: 'ravens', plan: 'trap', chem: 2, name: 'Obsidian Ravens', short: 'RAV', crest: 'hud_elements/misc/away_crest',
    art: 'obsidian_ravens', arena: 'dark_aerie',
    color: '#9aa3b5', color2: '#2a2f3d', recolor: { h1: 220, h2: 220, sat: 0.12, val: 0.66, sat2: 0.15, val2: 0.4 },
    diff: 0.72, bonus: { agi: 1, pas: 1, chk: 1 }, goalie: { rfx: 7, pos: 7 },
    names: { frost: 'Corvin', thunder: 'Nyx', stone: 'Basalt', goalie: 'Grim' },
    gstyle: 'puckhandler', subs: { goalie: 'Murk', frost: 'Rook', thunder: 'Shade', stone: 'Onyx' }, // who plays the slot after you sign its skater
    style: 'Disciplined, fast passing, punishing on the forecheck.',
  },
  royals: {
    id: 'royals', plan: 'counter', chem: 3, name: 'Aurora Royals', short: 'AUR', crest: 'hud_elements/misc/away_crest',
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
    id: 'owls', plan: 'counter', chem: 1, name: 'Glacier Owls', short: 'OWL', crest: 'hud_elements/misc/away_crest',
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
    id: 'moose', plan: 'forecheck', chem: 2, name: 'Thunder Moose', short: 'MOO', crest: 'hud_elements/misc/away_crest',
    art: null, mark: 'thunder_moose', arena: 'moose_longhouse', expansion: true,
    goalieLook: { mask: 'wolf_teeth', paint: '#f2a93b', body: 'big' }, // (a big build)
    looks: { frost: { body: 'std', head: 'moustache', skin: 3, hair: 1 }, thunder: { body: 'small', head: 'mohawk', skin: 4, hair: 6 }, stone: { body: 'big', head: 'cage', skin: 2, hair: 0 } },
    color: '#2f7a4a', color2: '#f2a93b', recolor: { h1: 140, h2: 38, sat: 0.8, val: 0.62, sat2: 1.0, val2: 1.0 },
    diff: 0.62, bonus: { chk: 1, sta: 1, spd: -1 }, goalie: { rfx: 6, pos: 7 },
    names: { frost: 'Tamarack', thunder: 'Rumble', stone: 'Thorvald', goalie: 'Brakken' },
    gstyle: 'wall', subs: { goalie: 'Tundra', frost: 'Spruce', thunder: 'Larch', stone: 'Bramble' }, // who plays the slot after you sign its skater
    style: 'Big, loud and hard to move. Every shift feels like a stampede.',
  },
};
// The rivals, easiest first. The first five are the league's founding clubs.
export const RIVAL_IDS = ['lynx', 'comets', 'owls', 'rams', 'moose', 'ravens', 'royals'];
export const FOUNDING_RIVALS = ['lynx', 'comets', 'rams', 'ravens', 'royals'];
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
  frostline_coliseum: { name: 'Frostline Coliseum', lamps: '#ffd45e', twist: 'none' },
  home: { name: 'Frostline Rink', lamps: '#ffb84d', twist: null },
  ember_dome: { name: 'Ember Dome', lamps: '#ff7a2e', flicker: 2.2, ice: 'rgba(255,140,60,0.06)', twist: 'meltwater', rule: 'Meltwater' },
  aurora_palace: { name: 'Aurora Palace', lamps: '#ffd27a', twist: 'aurora_lanes', rule: 'Aurora lanes' },
  golden_hall: { name: 'Golden Hall', lamps: '#ffc04a', flicker: 1.6, twist: 'rumble_strips', rule: 'Rumble strips' },
  dark_aerie: { name: 'Dark Aerie', lamps: '#b48cff', flicker: 0.7, twist: 'shadow_zones', rule: 'Shadow zones' },
  pine_pond: { name: 'Pine Pond', lamps: null, twist: 'pond_cracks', rule: 'Pond cracks' },
  owl_observatory: { name: 'The Observatory', lamps: '#bfe8ff', twist: 'moonbeams', rule: 'Moonbeams' }, // (the Glacier Owls')
  moose_longhouse: { name: 'The Longhouse', lamps: '#ffb05c', flicker: 1.4, twist: 'loose_planks', rule: 'Loose planks' }, // (the Thunder Moose's)
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
};
const ROLE_TITLE = { C: 'Centre', W: 'Winger', D: 'Defender' };
for (const [key, r] of Object.entries(RECRUITS)) {
  const t = TEAMS[r.team];
  const c = CHARACTERS[r.kit];
  // (an expansion club's player is made from parts: their look, and the newcomer art until it's in)
  Object.assign(r, { key, name: t.names[r.kit], role: c.role, title: `${t.name.split(' ').slice(-1)[0].replace(/s$/, '')} ${ROLE_TITLE[c.role]}`, sprite: t.art ? `${t.art}_${ROLE[r.kit]}` : `newcomer_${ROLE[r.kit]}`, parts: (t.looks || {})[r.kit] || null, elem: (t.elems || {})[r.kit] || c.elem });
}
export const recruitKey = (teamId, kit) => `${teamId}_${ROLE[kit]}`;
// How old each rival star is in a save's first season (slots.js ages them): the young ones
// still improving, the old monarch near the end.
export const STAR_AGES = {
  lynx_c: 22, lynx_w: 21, lynx_d: 26, comets_c: 25, comets_w: 23, comets_d: 29, rams_c: 27, rams_w: 26, rams_d: 30,
  ravens_c: 28, ravens_w: 24, ravens_d: 29, royals_c: 27, royals_w: 25, royals_d: 32, owls_c: 26, owls_w: 24, owls_d: 31,
  moose_c: 28, moose_w: 22, moose_d: 27,
};
// The kit a rival slot plays with: that player's archetype and the team's super for the slot.
export const slotDef = (teamId, kit) => {
  const r = RECRUITS[recruitKey(teamId, kit)];
  return { ...makeDef(kit, r?.arch, ((TEAMS[teamId] || {}).elems || {})[kit]), hand: r?.hand || CHARACTERS[kit].hand };
};
export const KIT_OF_ROLE = { C: 'frost', W: 'thunder', D: 'stone' };

// Rival goalies you can sign once you've beaten their team ('<team>_g'). Their club then plays
// a backup. Halla is 'halla'.
const GOALIE_PRICES = { lynx: 220, comets: 300, owls: 400, rams: 380, moose: 480, ravens: 460, royals: 560 };
export const GOALIE_RECRUITS = Object.fromEntries(Object.entries(GOALIE_PRICES).map(([team, price]) => {
  const t = TEAMS[team];
  return [`${team}_g`, { key: `${team}_g`, team, name: t.names.goalie, base: { ...t.goalie }, gstyle: t.gstyle, price, art: t.art || (t.goalieLook ? goalieArt(t.goalieLook) : 'newcomer'), mask: t.goalieLook || null, title: 'Goaltender' }]; // (an expansion club's goalie: made from parts)
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

// Make the club's settings live: names everywhere, colours for our art and signings.
export function applyClub(club) {
  const c = { ...CLUB_DEFAULT, ...(club || {}) };
  Object.assign(CLUB, c, { custom: !!club && (c.name !== CLUB_DEFAULT.name || c.trim !== CLUB_DEFAULT.trim || c.jersey !== CLUB_DEFAULT.jersey || c.short !== CLUB_DEFAULT.short || c.nick !== CLUB_DEFAULT.nick || c.crest !== CLUB_DEFAULT.crest) });
  const home = TEAMS.home;
  home.name = c.name; home.short = c.short; home.color = c.trim; home.color2 = c.jersey; home.crest = clubCrestId(c.crest);
  const t = hexToHsv(c.trim), j = hexToHsv(c.jersey);
  const recoloured = c.trim !== CLUB_DEFAULT.trim || c.jersey !== CLUB_DEFAULT.jersey;
  // our own art: teal trim (h 187 s .51 v .91) and cream jersey (h 45 s .2 v 1)
  PALETTES.club.recolor = recoloured ? { mode: 'home', trim: t, jersey: j } : null;
  // signings: coral (s ~.6, v ~1) becomes the jersey, violet (s ~.5, v ~.75) the trim
  Object.assign(PALETTES.homekit.recolor, {
    h1: j.h, sat: Math.max(0.05, j.s / 0.6), val: Math.max(0.2, j.v * 1.06),
    h2: t.h, sat2: Math.max(0.05, t.s / 0.55), val2: Math.max(0.2, t.v / 0.72),
  });
  return CLUB;
}

// Swap the default club name into a line of text.
export function clubText(str) {
  if (!CLUB.custom || !str) return str;
  return String(str).replace(/Snowcrest Foxes/g, CLUB.name).replace(/\bFoxes\b/g, CLUB.nick);
}

// Twists: 'none' | 'speed_lanes' | 'cracked_ice' | 'both'
export const TOURNAMENT = {
  name: 'Frostline Regional Cup',
  stages: [
    { team: 'lynx', round: 'Group Stage', powers: [], twist: 'none', reward: 120 },
    { team: 'comets', round: 'Group Stage', powers: ['fire', 'ice'], twist: 'none', reward: 160 },
    { team: 'owls', round: 'Group Stage', powers: ['fire', 'ice', 'lightning'], twist: 'none', reward: 185 },
    { team: 'rams', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', reward: 210 },
    { team: 'moose', round: 'Quarterfinal', powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'none', reward: 240 },
    { team: 'ravens', round: 'Semifinal', powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'speed_lanes', reward: 270 },
    { team: 'royals', round: 'Final', powers: ['fire', 'ice', 'lightning', 'gravity'], twist: 'cracked_ice', reward: 400 },
  ],
};

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

export const TWIST_INFO = {
  none: '',
  speed_lanes: 'Speed lanes: glowing strips along the boards boost anyone skating with the arrows.',
  cracked_ice: 'Cracked ice: rough patches slow skaters down. Keep the puck moving.',
  both: 'Speed lanes and cracked ice.',
  meltwater: 'Ember Dome rules: meltwater pools drift across the warm ice. Skaters and the puck bog down in them.',
  aurora_lanes: 'Aurora Palace rules: aurora lanes push skaters and the puck along the arrows, and shift every few seconds with the lights.',
  pond_cracks: 'Pine Pond rules: big hits and hard shots crack the pond. Cracks slow skaters, grab the puck and spread as the game goes on.',
  rumble_strips: 'Golden Hall rules: ridged ice runs along the boards. Carry the puck fast across it and it hops off your stick.',
  shadow_zones: 'Dark Aerie rules: ravens circle overhead. The puck is hard to see in their shadows, and goalies pick up shots from them late.',
  moonbeams: 'Observatory rules: a beam of moonlight sweeps slowly across the ice. A shot from inside it glares in the goalie\'s eyes.',
  loose_planks: 'Longhouse rules: some of the wooden boards are loose. A puck that hits one comes off at an odd angle.',
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
