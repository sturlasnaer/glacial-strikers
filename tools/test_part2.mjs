// Part 2 and new additions (Batches AD to AM): every mapping points at a frame, stick hands
// resolve on the new eight-way sets, the twins and the body from parts have full sets, and
// the linesman holds, drops, clears and calls.
//   node tools/test_part2.mjs
import { readFileSync } from 'node:fs';
import { handMirror } from '../src/hands.js';
import { Linesman, DROP } from '../src/linesman.js';
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { ACHIEVEMENTS, useAchievementArt } from '../src/achievements.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const A = JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json', import.meta.url), 'utf8'));
const F = A.frames;

// every frame a mapping names is in the atlas
const missing = [];
const walk = (o, path) => {
  if (typeof o === 'string') { if (/^(ak_|fafnir_|fenrir_|modular\/|head_|icons\/|achievements\/|badges\/|linesman_|ability_effects\/|hub_fullbody\/|newcomer_._jersey|twins\/|hud_elements\/ability)/.test(o) && !F[o]) missing.push(`${path} = ${o}`); }
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${path}[${i}]`));
  else if (o && typeof o === 'object') for (const k in o) walk(o[k], `${path}.${k}`);
};
for (const k of ['fafnir', 'fenrir', 'body_std', 'frost_captain', 'thunder_winger', 'stone_defender', 'newcomer_c', 'newcomer_w', 'newcomer_d']) walk(A.skaters[k], k);
for (const k of ['modular', 'badges', 'linesman', 'draft_animations', 'ability_effects_al', 'training_camp', 'art_additions']) walk(A[k], k);
check('every mapped frame exists', missing.length === 0, missing.slice(0, 8));
const pages = new Set(A.pages.map((p) => p.group));
check('the new page groups', ['legends_ice', 'legends_gearmask', 'parts', 'abilities_al', 'linesman', 'draft_rookies'].every((g) => pages.has(g)), [...pages]);
check('frames sit on real pages', Object.values(F).every((f) => f[0] < A.pages.length));

// full eight-way sets with hands
const EIGHT = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];
for (const k of ['fafnir', 'fenrir', 'body_std']) {
  const set = A.skaters[k].home;
  check(`${k}: eight directions, hits, strides both ways`, EIGHT.every((d) => set[d] && set[d].frames.idle && set.hands[d]) && set.hit.west && set.stride.frames.length === 4 && set.stride_west.frames.length === 4 && set.signature.length >= 4, Object.keys(set));
}
for (const k of ['frost_captain', 'newcomer_w']) {
  const set = A.skaters[k].home;
  check(`${k}: drawn facing west`, !set.west.flip_x && set.stride_west && set.hit.west && set.hands.west, set.west);
}
// stick hands: the other hand comes from the opposite facing, mirrored
const nix = A.skaters.frost_captain.home.hands;
check('Nix shoots left: his east is the west art mirrored', CHARACTERS.frost.hand === 'L' && nix.east === 'R' && handMirror(nix, 'east', 'L') === 'west');
check('...and south as drawn', handMirror(nix, 'south', 'L') === null);
check('a right shot on a left-drawn set', handMirror(A.skaters.fenrir.home.hands, 'northeast', 'R') === 'northwest' && handMirror(A.skaters.fafnir.home.hands, 'east', 'L') === null);
check('away kits of the cast are left alone', !A.skaters.frost_captain.away.hands);

// the parts: anchors for every body frame, masks for every head
const M = A.modular, body = A.skaters.body_std.home;
const bodyFrames = EIGHT.flatMap((d) => Object.values(body[d].frames));
check('a head anchor on every body frame', bodyFrames.every((f) => M.anchors[f]), bodyFrames.filter((f) => !M.anchors[f]).slice(0, 4));
check('four heads, each masked', Object.keys(M.heads).length === 4 && Object.values(M.heads).every((v) => Object.values(v).every((st) => Object.values(st).every((f) => M.masks[f] && F[M.masks[f]]))));
check('portrait faces', Object.values(M.portraits.faces).every((e) => ['neutral', 'grin', 'determined', 'shocked', 'defeated'].every((x) => F[e[x]])));

// achievements: own icons for the old borrowers
useAchievementArt(F);
check('every achievement icon exists', ACHIEVEMENTS.every((a) => F[a.icon]), ACHIEVEMENTS.filter((a) => !F[a.icon]).map((a) => a.id));
check('the Batch AF icons in use', ACHIEVEMENTS.filter((a) => a.icon.startsWith('achievements/')).length >= 36);

// the linesman
const KITS = ['frost', 'thunder', 'stone'];
const team = () => ({ chem: {}, goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' }, skaters: KITS.map((k) => ({ def: CHARACTERS[k], stats: { ...CHARACTERS[k].base }, perks: [] })) });
const m = new Match({ teams: [team(), team()], humanTeam: null, seed: 5, powers: [], diff: [0.6, 0.6] });
const L = new Linesman(), Lm = A.linesman;
const run = (sec) => { for (let i = 0; i < sec * 60; i++) { m.update(1 / 60); L.update(1 / 60, m); } };
while (m.state === 'intro') { m.update(1 / 60); L.update(1 / 60, m); }
check('at the dot with the puck', m.state === 'faceoff' && Math.abs(L.x - m.puck.x) < 1 && L.holding(m) && Lm.faceoff.ready.includes(L.frame(m, Lm).id));
run(DROP - 0.3);
check('drops it', !L.holding(m) || m.stateT < DROP - 0.2, m.stateT);
check('the drop frames', Lm.faceoff.drop.includes(L.frame(m, Lm).id), L.frame(m, Lm));
run(1.6);
check('skates clear to the far boards', L.y < -200 && m.state === 'play', [L.x, L.y, m.state]);
run(3);
check('and follows play along them', L.y < -230 && Math.abs(L.x) < 711, [L.x, L.y]);
const fr = L.frame(m, Lm);
check('skating or watching', [...Lm.stride.frames, ...Lm.calls.watch, Lm.glides.north.frame, Lm.glides.south.frame, Lm.calls.duck].includes(fr.id), fr);
m.state = 'penalty'; m.stateT = 0;
check('an arm up for a penalty', Lm.calls.penalty.includes(L.frame(m, Lm).id));
m.state = 'goal';
check('points at the net for a goal', L.frame(m, Lm).id === Lm.calls.goal);

console.log(`part 2 art: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
