// Gear: the divisions' pieces (on sale once the club reaches the National or the Elite, and
// staying on sale after a drop), goalie gear that trades reflexes for angles, the two shop
// trophies, and the newer pieces' icons (their own once drawn, a like piece's until then).
//   node tools/test_gear.mjs
import { readFileSync } from 'node:fs';
import { GEAR, GEAR_BY_ID, GEAR_LOOK, gearOpen, useGearArt } from '../src/data.js';
import { newSave, goalieStats, goalieRec, starterId } from '../src/progress.js';
import { AchievementTracker } from '../src/achievements.js';
import { moveTier } from '../src/tiers.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const atlas = JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json', import.meta.url)));
const net = (g) => Object.values(g.mods).reduce((a, b) => a + b, 0);

const div = (n) => GEAR.filter((g) => (g.tier || 0) === n);
check('a stick, skates, protection and goalie gear for each division', [1, 2].every((n) => ['stick', 'skates', 'armor', 'goalie'].every((slot) => div(n).filter((g) => g.slot === slot).length === 1)));
check('...dearer and better than the regional shop\'s, the Elite\'s most of all', div(1).every((g) => g.price > 500 && net(g) >= 3) && div(2).every((g) => g.price > div(1).find((x) => x.slot === g.slot).price && net(g) >= 4));
check('...every piece still trades something away (the goalies\' aside)', GEAR.filter((g) => g.tier && g.slot !== 'goalie').every((g) => Object.values(g.mods).some((v) => v < 0)));
check('...a look on the ice for each skater piece', GEAR.filter((g) => g.tier && g.slot !== 'goalie').every((g) => GEAR_LOOK[g.id] && GEAR_LOOK[g.id].desc));
check('every icon is in the pack', GEAR.every((g) => atlas.frames[g.icon]), GEAR.filter((g) => !atlas.frames[g.icon]).map((g) => g.id));

// on sale by division
{
  const s = newSave();
  check('a new club: the regional shop only', GEAR.filter((g) => gearOpen(s, g)).every((g) => !g.tier) && GEAR.some((g) => !gearOpen(s, g)));
  const L = { season: 1, champion: 'home' };
  moveTier(s, L, []);
  check('up to the National: its gear on sale, not the Elite\'s', div(1).every((g) => gearOpen(s, g)) && div(2).every((g) => !gearOpen(s, g)));
  s.tier = 0; // (relegated: what's been on sale stays on sale)
  check('...still on sale after a drop', div(1).every((g) => gearOpen(s, g)));
  s.tier = 2; s.tierTop = 2;
  check('the Elite: everything', GEAR.every((g) => gearOpen(s, g)));
}

// goalie gear: reflexes and angles
{
  const s = newSave(), g = goalieRec(s, starterId(s)), base = goalieStats(s);
  const wear = (id) => { g.gear = id; return goalieStats(s); };
  const block = wear('g_block'), glove = wear('g_glove'), cap = wear('g_capital'), dia = wear('g_diamond');
  check('the blocker: angles for a little reflex', block.pos === base.pos + 2 && block.rfx === base.rfx - 1, [block, base]);
  check('the snapjaw glove: reflexes for a little angle', glove.rfx === base.rfx + 2 && glove.pos === base.pos - 1);
  check('the Capital pads and Diamond mitts: both up', cap.rfx === base.rfx + 1 && cap.pos === base.pos + 2 && dia.rfx === base.rfx + 2 && dia.pos === base.pos + 2);
  g.level = 30; g.vet = 10;
  check('...never past the cap', wear('g_diamond').rfx === 13 && goalieStats(s).pos === 13);
}

// the trophies: the regional shop's, then the divisions'
{
  const s = newSave(), got = [];
  const tr = new AchievementTracker(s, (a) => got.push(a.id));
  s.owned = GEAR.filter((g) => !g.tier).map((g) => g.id);
  tr.checkMeta();
  check('Fully Kitted: the regional shop\'s gear is enough', got.includes('kitted') && !got.includes('pro-kit'), got);
  s.owned = GEAR.map((g) => g.id);
  tr.checkMeta();
  check('Pro Kit: every piece of the divisions\' gear', got.includes('pro-kit'));
}

// the newer pieces' own icons, once drawn
{
  const fresh = GEAR.filter((g) => g.art);
  check('each new piece names its own icon, not yet drawn, and a stand-in', fresh.length === 10 && fresh.every((g) => g.art !== g.icon && atlas.frames[g.icon]));
  const before = GEAR_BY_ID.stick_aurora.icon;
  useGearArt({ 'equipment_items/stick/aurora': [0] });
  check('...and wears it once it\'s in', GEAR_BY_ID.stick_aurora.icon === 'equipment_items/stick/aurora' && GEAR_BY_ID.stick_capital.icon === 'equipment_items/stick/passing' && before === 'equipment_items/stick/frost');
}

console.log(`Gear: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
