// Players of your own (Team › Create a player): what makes a valid player, joining the roster
// at the line-up's level, the limit of two, a new look, the league news, and a match with one
// of them dressed.
//   node tools/test_create.mjs
import { createPlayer, restyle, canCreate, ownIds, defaultChoice, stylesFor, cleanName, MAX_OWN, OWN_POTENTIAL } from '../src/create.js';
import { newSave, matchConfig, joinLevel, PERK_LEVELS, lineupIds } from '../src/progress.js';
import { setRookies, member, TOURNAMENT, ROOKIES } from '../src/data.js';
import { Match } from '../src/match.js';
import { useModular } from '../src/modular.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
setRookies({});
useModular(JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json', import.meta.url)))); // (the bodies there are, for drawing from parts)
const PARTS = { bodies: ['std', 'big', 'small'], heads: ['braids', 'freckles', 'visor'] };

// what a player needs
{
  const s = newSave();
  const c = defaultChoice('W', PARTS);
  check('a first pick: a winger, a winger\'s style, a body and a face there are', c.role === 'W' && stylesFor('W').includes(c.arch) && c.look.body === 'std' && c.look.head === 'braids');
  check('no name, no player', createPlayer(s, { ...c, name: '  ' }, PARTS) === null && !ownIds(s).length);
  check('a defender can\'t be a sniper', createPlayer(s, { ...c, name: 'Ari', role: 'D', arch: 'sniper' }, PARTS) === null);
  check('an unknown super, hand or face is refused', [{ elem: 'plasma' }, { hand: 'X' }, { look: { ...c.look, head: 'wizard' } }, { look: { ...c.look, skin: 9 } }, { look: { ...c.look, hair: -1 } }].every((x) => createPlayer(s, { ...c, name: 'Ari', ...x }, PARTS) === null));
  check('names are tidied: no tags, one space, at most 14', cleanName('  <b>Ari</b>   Snow  ') === 'bAri/b Snow' && cleanName('x'.repeat(30)).length === 14);
}

// joining
{
  const s = newSave();
  for (const id of lineupIds(s)) s.roster[id].level = 6;
  const before = Object.keys(s.roster).length, lv = joinLevel(s);
  const id = createPlayer(s, { name: 'Ari', role: 'C', arch: 'sniper', elem: 'ember', hand: 'R', look: { body: 'small', head: 'freckles', skin: 3, hair: 6 } }, PARTS);
  const k = s.rookies[id], r = s.roster[id];
  check('they join the roster', id && Object.keys(s.roster).length === before + 1 && !lineupIds(s).includes(id), id);
  check('...one of our own, with their look, a rookie\'s potential', k.own && k.parts.head === 'freckles' && k.parts.skin === 3 && k.potential === OWN_POTENTIAL && k.hand === 'R' && k.elem === 'ember');
  check('...at the line-up\'s level, with points to spend', r.level === lv && r.points === lv - 1 && r.joined === lv, [r.level, r.points, lv]);
  check('...and the perks for the levels they skipped', r.perks.length === PERK_LEVELS.filter((l) => l <= lv).length, r.perks);
  const m = member(id);
  check('...a homegrown centre, drawn from parts', m.title === 'Homegrown Centre' && m.parts && m.parts.head === 'freckles' && m.def.elem === 'ember' && m.hand === 'R', [m.title, m.sprite]);
  check('...in the league news', s.news && s.news.some((n) => n.k === 'weOwn' && n.name === 'Ari'));
  check('one more can join', canCreate(s));
  const id2 = createPlayer(s, { ...defaultChoice('D', PARTS), name: 'Bea' }, PARTS);
  check('...then that\'s two', id2 && ownIds(s).length === MAX_OWN && !canCreate(s));
  check('...and no third', createPlayer(s, { ...defaultChoice('W', PARTS), name: 'Cy' }, PARTS) === null && ownIds(s).length === 2);

  // a new look
  check('a new look, any time', restyle(s, id, { body: 'big', head: 'visor', skin: 0, hair: 0 }, PARTS) && s.rookies[id].parts.head === 'visor' && ROOKIES[id].parts.body === 'big');
  check('...only from parts there are', !restyle(s, id, { body: 'huge', head: 'visor', skin: 0, hair: 0 }, PARTS) && s.rookies[id].parts.body === 'big');
  s.rookies.rk99 = { name: 'Drafted', kit: 'frost', parts: { body: 'std', head: 'braids', skin: 0, hair: 0 } };
  check('...and only for your own', !restyle(s, 'rk99', { body: 'big', head: 'visor', skin: 0, hair: 0 }, PARTS));
  delete s.rookies.rk99;

  // dressed for a match
  s.lineup.C = id;
  const stage = TOURNAMENT.stages[0];
  const mt = new Match(matchConfig(s, stage.team, stage));
  const ari = mt.teamSkaters(0).find((x) => x.who === id);
  check('they dress and skate', ari && ari.name === 'Ari', mt.teamSkaters(0).map((x) => x.who));
  for (let i = 0; i < 60 * 20; i++) mt.update(1 / 60);
  check('...through a match', mt.time > 19);
}

console.log(`Create a player: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
