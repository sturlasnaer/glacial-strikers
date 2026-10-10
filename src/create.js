// Players of your own: Team › Create a player builds a skater from the parts art (a build, a
// face, a skin tone and a hair colour), with a name, a position, a style, a super and a stick
// hand. Up to two on a save (one each for two players sharing it). They join at the line-up's
// level like a signing, as rookies with room to grow, and their look can be changed any time.
// No browser APIs here.

import { CHARACTERS, KIT_OF_ROLE, ARCHETYPES, ELEMENTS, setRookies, makeDef } from './data.js';
import { joinLevel, PERK_LEVELS, newMember } from './progress.js';
import { SKIN_TONES, HAIR_COLORS } from './modular.js';
import { addNews } from './news.js';

export const MAX_OWN = 2;
export const OWN_POTENTIAL = 3; // ('Solid prospect': they grow a little faster than a signing)
export const NAME_MAX = 14;
export const OWN_TEXT = { blurb: 'One of our own, made in the locker room.' };

export const ownIds = (save) => Object.keys(save.rookies || {}).filter((id) => save.rookies[id].own);
export const canCreate = (save) => ownIds(save).length < MAX_OWN;
export const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const stylesFor = (role) => Object.values(ARCHETYPES).filter((a) => a.roles.includes(role)).map((a) => a.id);

// Is a look made of parts there are? parts = { bodies, heads } (MODULAR, or a test's lists).
export function validLook(look, parts) {
  return !!look && parts.bodies.includes(look.body) && parts.heads.includes(look.head)
    && Number.isInteger(look.skin) && look.skin >= 0 && look.skin < SKIN_TONES.length
    && Number.isInteger(look.hair) && look.hair >= 0 && look.hair < HAIR_COLORS.length;
}

// A sensible first pick for the editor: a position's usual style, the position's own element.
export function defaultChoice(role = 'W', parts) {
  const kit = KIT_OF_ROLE[role];
  return {
    name: '', role, arch: CHARACTERS[kit].arch && stylesFor(role).includes(CHARACTERS[kit].arch) ? CHARACTERS[kit].arch : stylesFor(role)[0],
    elem: kit, hand: 'L', look: { body: parts.bodies.includes('std') ? 'std' : parts.bodies[0], head: parts.heads[0], skin: 1, hair: 1 },
  };
}

// Make them: c = { name, role, arch, elem, hand, look }. Returns their roster id, or null when
// something's missing (or there are two already).
export function createPlayer(save, c, parts) {
  const name = cleanName(c.name), role = c.role, kit = KIT_OF_ROLE[role];
  if (!name || !kit || !canCreate(save) || !stylesFor(role).includes(c.arch) || !ELEMENTS[c.elem] || !['L', 'R'].includes(c.hand) || !validLook(c.look, parts)) return null;
  save.rookieN = (save.rookieN || 0) + 1;
  const id = 'rk' + save.rookieN;
  const look = { body: c.look.body, head: c.look.head, skin: c.look.skin, hair: c.look.hair };
  (save.rookies ||= {})[id] = { name, kit, arch: c.arch, elem: c.elem, hand: c.hand, parts: look, base: { ...CHARACTERS[kit].base }, potential: OWN_POTENTIAL, blurb: OWN_TEXT.blurb, season: save.season || 1, own: true };
  setRookies(save.rookies);
  const m = newMember();
  m.level = m.joined = joinLevel(save);
  m.points = m.level - 1; // (theirs to spend)
  const opts = makeDef(kit, c.arch, c.elem).perks;
  PERK_LEVELS.forEach((lv, k) => { if (m.level >= lv) m.perks.push(opts[k][0]); });
  save.roster[id] = m;
  addNews(save, { k: 'weOwn', name, kit });
  return id;
}

// A new look for one of your own (free, any time).
export function restyle(save, id, look, parts) {
  const k = save.rookies && save.rookies[id];
  if (!k || !k.own || !validLook(look, parts)) return false;
  k.parts = { body: look.body, head: look.head, skin: look.skin, hair: look.hair };
  setRookies(save.rookies);
  return true;
}
