// Part 2 and new additions (Batches AD to AM): every mapping points at a frame, stick hands
// resolve on the new eight-way sets, the twins and the body from parts have full sets, and
// the linesman holds, drops, clears and calls.
//   node tools/test_part2.mjs
import { readFileSync } from 'node:fs';
import { handMirror } from '../src/hands.js';
import { Linesman, DROP } from '../src/linesman.js';
import { Match } from '../src/match.js';
import { CHARACTERS, RECRUITS, TEAMS } from '../src/data.js';
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
check('every head masked', Object.keys(M.heads).length >= 4 && Object.values(M.heads).every((v) => Object.values(v).every((st) => Object.values(st).every((f) => M.masks[f] && F[M.masks[f]]))));
check('portrait faces', Object.values(M.portraits.faces).every((e) => ['neutral', 'grin', 'determined', 'shocked', 'defeated'].every((x) => F[e[x]])));

// AN: the backup goalie in every goalie view, its portrait, the style icons
const G = ['goalies_side', 'goalies_side_west', 'goalies_front', 'goalies_back', 'goalies_skating', 'goalies_puck_handling', 'goalies_puck_handling_west'];
check('the backup goalie in every view', G.every((k) => A[k].newcomer) && F[A.goalies_side.newcomer.ready] && A.portraits.newcomer_g && F[A.portraits.newcomer_g.neutral]);
check('...the size of a younger goalie', (() => { const b = F[A.goalies_side.newcomer.ready], h = F[A.goalies_side.home.ready]; return b[4] / b[7] < h[4] / h[7] && b[4] / b[7] > (h[4] / h[7]) * 0.7; })(), [F[A.goalies_side.newcomer.ready], F[A.goalies_side.home.ready]]);
check('...recoloured with the newcomers', A.pages[F[A.goalies_side.newcomer.ready][0]].group === 'newcomers');
check('goaltending style icons', ['hybrid', 'scrambler', 'butterfly', 'wall', 'reader', 'puckhandler'].every((k) => F['icons/gstyle_' + k]) && F['icons/contract']);
// AO: three builds, ten heads (sixteen with AZ's), shoulders per build, the jersey moment
check('three builds', ['body_std', 'body_big', 'body_small'].every((k) => A.skaters[k] && EIGHT.every((d) => A.skaters[k].home[d])), Object.keys(A.skaters).filter((k) => k.startsWith('body_')));
check('twenty-four heads (AJ, AO, AZ, CB), each with its faces and masks', Object.keys(M.heads).length === 24 && Object.keys(M.heads).every((h) => M.portraits.faces[h] && Object.values(M.heads[h]).every((v) => Object.values(v).every((f) => F[f] && F[M.masks[f]]))), Object.keys(M.heads));
check('shoulders per build', ['std', 'big', 'small'].every((b) => M.portraits.bodies[b] && F[M.portraits.bodies[b].body]));
const JM = M.jersey_moments && M.jersey_moments.body_std;
check('the parts jersey moment', JM && JM.length === 3 && JM.every((f) => F[f] && M.anchors[f]) && M.anchors[JM[1]].hide_head && A.draft_animations.body_std && A.draft_animations.newcomer_c, JM);
for (const k of ['body_big', 'body_small']) {
  const fr = EIGHT.flatMap((d) => Object.values(A.skaters[k].home[d].frames));
  check(`${k}: an anchor on every frame`, fr.every((f) => M.anchors[f]), fr.filter((f) => !M.anchors[f]).slice(0, 3));
}

// AQ to AU
check('cut-in backdrops per element', ['frost', 'thunder', 'stone', 'ember', 'gale', 'shadow'].every((e) => A.banners['bg_' + e]) && A.banners.bg_glow);
check('Vigga: standing art, portrait, market icon', A.art_additions.hub_fullbody.agent.idle.every((f) => F[f]) && F[A.npcs.agent] && F['icons/free_agents']);
const GP = A.goalie_parts;
check('goalies from parts: every pose anchored, twelve masks with paint (AT and BC)', Object.values(A.goalies_side.parts).every((f) => GP.anchors[f]) && Object.keys(GP.masks).length === 12 && Object.keys(GP.masks).every((k) => GP.portraits.faces[k]) && Object.values(GP.masks).every((v) => Object.values(v).every((h) => F[h] && GP.paint[h] && F[GP.paint[h]])));
check('...drawn at the backup goalie\'s scale', Math.abs(F[A.goalies_side.parts.ready][7] - F[A.goalies_side.newcomer.ready][7]) < 1e-6);
check('the clubs\' crests, buildings, mascots, boards and banners', ['glacier_owls', 'thunder_moose'].every((m) => F[A.crests[m]] && A.arena.rival_mascots[m] && A.arena.banners[m] && A.banners[m + '_c']) && ['owl_observatory', 'moose_longhouse'].every((k) => A.arenas[k] && A.arena.scoreboards[k] && A.arena.mascot_arenas[k]));
check('...on their own pages', A.pages[F[A.arena.rival_mascots.glacier_owls.idle][0]].group === 'rival_glacier_owls');

// AV to AZ
check('news icons', ['sign', 'draft', 'trade', 'retire', 'cup', 'new_club'].every((k) => F[A.news_icons[k]] && A.pages[F[A.news_icons[k]][0]].group === 'icons_z'));
check('club crests on the home pages', Object.keys(A.club_crests).length === 6 && Object.values(A.club_crests).every((f) => F[f] && A.pages[F[f][0]].group === 'home'));
check('goalie builds: every pose anchored, with shoulders', ['big', 'small'].every((b) => ['goalies_side', 'goalies_side_west', 'goalies_front', 'goalies_back', 'goalies_puck_handling', 'goalies_puck_handling_west'].every((k) => Object.values(A[k]['parts_' + b]).every((f) => GP.anchors[f])) && GP.portraits.bodies[b] && F[GP.portraits.bodies[b].body]) && GP.builds.join() === 'std,big,small');
check('...at the standard build\'s scale', F[A.goalies_side.parts_big.ready][7] === F[A.goalies_side.parts.ready][7]);
const ER = A.expansion_rules;
check('moonbeam, glare, planks and splinters with the rule art', ER.moonbeams.moonbeams.length === 4 && ER.moonbeams.glare.length === 3 && ER.loose_planks.planks_side.length === 3 && ER.loose_planks.planks_end.length === 3 && ER.loose_planks.splinters.length === 4 && [...ER.moonbeams.moonbeams, ...ER.loose_planks.splinters].every((f) => A.pages[F[f][0]].group === 'rules'));
check('...and their rule icons', F[A.rule_icons.moonbeams] && F[A.rule_icons.loose_planks]);

// BA: the expansion captains, drawn like the founding rivals' captains
for (const key of ['glacier_owls_c', 'thunder_moose_c']) {
  const S = A.skaters[key];
  check(`${key}: eight directions, strides both ways, hits, signature, hands`, S && EIGHT.every((d) => S.away[d] && Object.values(S.away[d].frames).every((f) => F[f])) && S.away.stride.frames.length === 4 && S.away.stride_west.frames.length === 4 && S.away.hit.east.length === 3 && S.away.signature.length === 4 && S.away.hands.south);
  check('...on their club\'s pages, gear masks, portraits', A.pages[F[S.away.south.frames.idle][0]].group === 'rival_' + key.slice(0, -2) && F['gm:' + S.away.east.frames.idle] && ['neutral', 'grin', 'determined', 'shocked', 'defeated'].every((e) => F[A.portraits[key][e]]));
}

// BB: the founding rivals facing west, each keeping their own stick hand
{
  const keys = Object.keys(RECRUITS).filter((k) => TEAMS[RECRUITS[k].team].art);
  const ok = keys.filter((k) => { const S = A.skaters[RECRUITS[k].sprite].away; return ['west', 'northwest', 'southwest'].every((d) => S[d].flip_x === false && F[S[d].frames.idle]) && S.hands.west === RECRUITS[k].hand && S.stride_west.frames.length === 4 && S.hit.west.length === 3; });
  check('all fifteen founding rival skaters drawn facing west, in their own hand', keys.length === 15 && ok.length === 15, keys.filter((k) => !ok.includes(k)));
}

// achievements: own icons for the old borrowers
useAchievementArt(F);
check('every achievement icon exists', ACHIEVEMENTS.every((a) => F[a.icon]), ACHIEVEMENTS.filter((a) => !F[a.icon]).map((a) => a.id));
const own = (a) => a.icon.startsWith('achievements/') || a.icon.startsWith('allstar/');
// (requested ones show a stand-in until their art arrives: BF's five, in; BK's two)
const PENDING = new Set(['moonstruck', 'splinters', 'protector', 'game-face', 'new-colours', 'sold-it', 'off-the-drop', 'penalty-shot', 'redirect', 'wiped-out', 'coachs-orders', 'traffic', 'bench-boss', 'hot-hand', 'breaking-ground', 'built-to-last', 'media-darling', 'raise-the-banner', 'record-breaker', 'better-together', 'fresh-sheet', 'one-of-our-own', 'homegrown-hero', 'special-teams', 'sticker-page', 'sticker-album', 'home-sweet-home', 'mini-cup']);
check('every achievement has its own icon (AF, AN, BF, BK, BO, BW, CA, CC; CJ, CL, CR, CS, DD pending)', ACHIEVEMENTS.every((a) => own(a) || (PENDING.has(a.id) && !F[a.art])), ACHIEVEMENTS.filter((a) => !own(a) && !PENDING.has(a.id)).map((a) => a.id));

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
const Ls = { ...Lm, calls: { ...Lm.calls, charging: ['sig_a', 'sig_b'], washout: ['wo_a', 'wo_b'] } };
m.state = 'penalty'; m.penaltyReason = 'Charging';
check('the signal for the call (Batch AS)', Ls.calls.charging.includes(L.frame(m, Ls).id) && Lm.calls.charging.includes(L.frame(m, Lm).id) && Lm.calls.interference && Lm.calls.boarding);
m.state = 'goal'; m.washedOut = true;
check('waves off a goal that doesn\'t count', Ls.calls.washout.includes(L.frame(m, Ls).id) && Lm.calls.washout.includes(L.frame(m, Lm).id));
m.washedOut = false;
check('points at the net for a real goal', L.frame(m, Lm).id === Lm.calls.goal);

console.log(`part 2 art: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
