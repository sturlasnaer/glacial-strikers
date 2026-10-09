// Supers and archetypes: each newer element's skill and ultimate does what it says, the
// archetype traits apply, the newer combos fire, and AI-vs-AI matches with the new supers
// still look like hockey.
//   node tools/test_supers.mjs [matches]
import { Match } from '../src/match.js';
import { CHARACTERS, makeDef, slotDef, member, COMBOS, ELEMENTS, ARCHETYPES, perkSlot, pairKey } from '../src/data.js';
import { GOAL_X } from '../src/rink.js';

const N = +(process.argv[2] || 6);
let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };
const KITS = ['frost', 'thunder', 'stone'];
const team = (mix = {}) => ({ chem: { 'frost+thunder': 2, 'frost+stone': 2, 'stone+thunder': 2 }, goalie: { stats: { rfx: 6, pos: 6 }, name: 'G' },
  skaters: KITS.map((k) => { const [arch, elem, perks] = mix[k] || []; return { def: makeDef(k, arch, elem), stats: { ...CHARACTERS[k].base }, perks: perks || [] }; }) });
const mk = (a = {}, b = {}, seed = 3) => { const m = new Match({ teams: [team(a), team(b)], humanTeam: null, seed, powers: [], diff: [0.6, 0.6] }); m.state = 'play'; return m; };
const step = (m, n = 1) => { for (let i = 0; i < n; i++) m.update(1 / 60); };
const give = (m, s) => { m.puck.owner = null; m.puck.x = s.x + 10; m.puck.y = s.y; m.puck.z = 0; m.puck.vx = m.puck.vy = 0; m.takePossession(s, 'catch'); };
const place = (s, x, y) => { s.x = x; s.y = y; s.vx = 0; s.vy = 0; };

// the data
check('six elements, fifteen pairs and the twins', Object.keys(ELEMENTS).length === 6 && Object.keys(COMBOS).length === 16 && COMBOS.ragnarok);
for (const a of Object.values(ELEMENTS)) for (const b of Object.values(ELEMENTS)) if (a !== b && !COMBOS[pairKey(a.id, b.id)]) check('a combo for every pair', false, a.id + b.id);
check('the cast is unchanged', makeDef('frost') === CHARACTERS.frost && makeDef('frost', 'playmaker', 'frost') === CHARACTERS.frost);
check('a mix keeps the art, takes the super', makeDef('thunder', 'sniper', 'ember').sprite === CHARACTERS.thunder.sprite && makeDef('thunder', 'sniper', 'ember').ult.id === 'firestorm' && makeDef('thunder', 'sniper', 'ember').perks[1] === ARCHETYPES.sniper.perks);
check('rival slots', slotDef('comets', 'thunder').elem === 'ember' && slotDef('ravens', 'thunder').elem === 'shadow' && slotDef('lynx', 'thunder').elem === 'gale' && slotDef('rams', 'stone').arch === 'enforcer');
check('signings bring their super', member('ravens_w').def.ult.id === 'eclipse' && member('comets_c').def.arch === 'sniper');
check('perks map across kits', perkSlot('Static: dash cooldown 2s shorter').tier === 0 && perkSlot('Static: dash cooldown 2s shorter').i === 1);

// Ember: Heat Check ignites the next shot; Firestorm can't be held and knocks back defenders
{
  const m = mk({ thunder: ['sniper', 'ember'] });
  const s = m.skaters.find((k) => k.team === 0 && k.def.elem === 'ember');
  place(s, GOAL_X - 300, 0); give(m, s);
  m.abilities.useSkill(s);
  check('Heat Check', s.igniteT > 3.9 && s.skillCd === 10, [s.igniteT, s.skillCd]);
  let shot = null; m.on('shot', (e) => { shot = e; });
  m.shoot(s, { kind: 'wrist' });
  check('an ignited shot', shot && shot.special.ember && s.igniteT === 0, shot && shot.special);
  const m2 = mk({ thunder: ['sniper', 'ember'] });
  const f = m2.skaters.find((k) => k.team === 0 && k.def.elem === 'ember');
  place(f, GOAL_X - 360, 0); give(m2, f); f.ult = 100;
  const d = m2.skaters.find((k) => k.team === 1);
  for (const o of m2.skaters) if (o !== f && o !== d) place(o, -400, o.team ? 200 : -200);
  m2.abilities.useUlt(f);
  check('Firestorm fires', m2.puck.shot && m2.puck.shot.special.firestorm && f.ult === 0);
  // a defender in its path gets knocked aside
  const pv = m2.puck;
  place(d, pv.x + pv.vx * 0.05, pv.y + pv.vy * 0.05 + 30);
  step(m2, 6);
  check('Firestorm knocks back', d.stun > 0 || Math.hypot(d.vx, d.vy) > 100, [d.stun, d.vx, d.vy]);
}

// Gale: Tailwind boosts you and the teammates near you; Cyclone blows a carrier off the puck
{
  const m = mk({ frost: ['playmaker', 'gale'] });
  const s = m.skaters.find((k) => k.team === 0 && k.def.elem === 'gale');
  const [near, far] = m.skaters.filter((k) => k.team === 0 && k !== s);
  place(s, 0, 0); place(near, 60, 40); place(far, -600, 0);
  m.abilities.useSkill(s);
  check('Tailwind', s.boostT >= 2 && near.boostT >= 2 && far.boostT === 0, [s.boostT, near.boostT, far.boostT]);
  const m2 = mk({ frost: ['playmaker', 'gale'] }, {}, 11);
  const c = m2.skaters.find((k) => k.team === 0 && k.def.elem === 'gale');
  const carrier = m2.skaters.find((k) => k.team === 1);
  for (const o of m2.skaters) place(o, -500, o.team ? 300 : -300);
  place(c, 0, 0); place(carrier, 50, 0); give(m2, carrier);
  c.ult = 100; m2.abilities.useUlt(c);
  check('Cyclone up', m2.cyclones.length === 1);
  m2.cyclones[0].fumbled.add(carrier); for (const a of m2.ai) a.update = () => {}; // (the push on its own, everyone standing still: the fumble is checked below)
  let lost = 0;
  for (let i = 0; i < 20; i++) {
    const mm = mk({ frost: ['playmaker', 'gale'] }, {}, 20 + i);
    const cc = mm.skaters.find((k) => k.team === 0 && k.def.elem === 'gale');
    const cr = mm.skaters.find((k) => k.team === 1);
    for (const o of mm.skaters) place(o, -500, o.team ? 300 : -300);
    place(cc, 0, 0); place(cr, 50, 0); give(mm, cr);
    cc.ult = 100; mm.abilities.useUlt(cc);
    step(mm, 20);
    if (mm.puck.owner !== cr) lost++;
  }
  check('Cyclone shakes the puck loose about half the time', lost >= 5 && lost <= 17, lost);
  step(m2, 60);
  check('Cyclone pushes outward', Math.hypot(carrier.x - c.x, carrier.y - c.y) > 70, Math.hypot(carrier.x - c.x, carrier.y - c.y));
  step(m2, 120);
  check('Cyclone ends', m2.cyclones.length === 0);
}

// Shadow: Fade makes checks miss; Eclipse is read late
{
  const m = mk({ thunder: ['dangler', 'shadow'] });
  const s = m.skaters.find((k) => k.team === 0 && k.def.elem === 'shadow');
  const a = m.skaters.find((k) => k.team === 1);
  place(s, 0, 0); place(a, -30, 0); give(m, s);
  m.abilities.useSkill(s);
  check('Fade', s.fadeT >= 3);
  m.hit(a, s);
  check('checks miss a shadow', s.stun <= 0 && m.puck.owner === s);
  const m2 = mk({ thunder: ['dangler', 'shadow'] });
  const e = m2.skaters.find((k) => k.team === 0 && k.def.elem === 'shadow');
  place(e, GOAL_X - 300, 0); give(m2, e); e.ult = 100;
  m2.abilities.useUlt(e);
  check('Eclipse fires', m2.puck.shot && m2.puck.shot.special.eclipse);
}

// traits
{
  const m = mk({ frost: ['enforcer', 'frost'], stone: ['blueliner', 'stone'] }, { frost: ['dangler', 'frost'] });
  const enf = m.skaters.find((k) => k.team === 0 && k.def.arch === 'enforcer');
  const sp = m.skaters.find((k) => k.team === 0 && k.def.arch === 'speedster');
  check('speedster sprints faster', (sp.in.sprint = true, sp.maxSpeed() > sp.d.maxSpeed * 1.33));
  const dang = m.skaters.find((k) => k.team === 1 && k.def.arch === 'dangler');
  let slid = 0;
  for (let i = 0; i < 200; i++) { place(dang, 0, 0); give(m, dang); dang.stun = 0; place(enf, -30, 0); m.hit(enf, dang); if (m.puck.owner === dang && dang.stun <= 0) slid++; }
  check('a dangler slips about one check in five', slid > 20 && slid < 70, slid);
}

// a newer combo: pass from Gale to Ember and shoot quickly
{
  const m = mk({ frost: ['playmaker', 'gale'], thunder: ['sniper', 'ember'] });
  const g = m.skaters.find((k) => k.team === 0 && k.def.elem === 'gale');
  const e = m.skaters.find((k) => k.team === 0 && k.def.elem === 'ember');
  m.chem[0][pairKey(g.who, e.who)] = 2;
  place(e, GOAL_X - 300, 0); give(m, e);
  e.comboFrom = g; e.comboT = 0.5;
  let combo = null; m.on('combo', (x) => { combo = x; });
  m.shoot(e, { kind: 'wrist' });
  check('Wildfire', combo && combo.key === 'ember+gale' && m.puck.shot.special.ember, combo);
}

// whole matches: the new supers get used and the scores stay sane
{
  let goals = 0, ults = {}, skills = {}, games = 0;
  for (let i = 0; i < N; i++) {
    const m = new Match({ teams: [team({ frost: ['playmaker', 'gale'], thunder: ['sniper', 'ember'] }), team({ thunder: ['dangler', 'shadow'] })], humanTeam: null, seed: 100 + i, powers: [], diff: [0.6, 0.6] });
    m.on('ult', (e) => { ults[e.id] = (ults[e.id] || 0) + 1; });
    m.on('skill', (e) => { skills[e.id] = (skills[e.id] || 0) + 1; });
    for (let t = 0; t < 480 && m.state !== 'over'; t += 1 / 60) m.update(1 / 60);
    goals += m.score[0] + m.score[1]; games++;
  }
  console.log(`  ${games} games: ${(goals / games).toFixed(1)} goals a game; ultimates ${JSON.stringify(ults)}; skills ${JSON.stringify(skills)}`);
  check('every new skill gets used', ['heat', 'tailwind', 'fade'].every((k) => skills[k] > 0), skills);
  check('every new ultimate gets used', ['firestorm', 'cyclone', 'eclipse'].every((k) => ults[k] > 0), ults);
  check('scores look like hockey', goals / games > 3 && goals / games < 12, goals / games);
}

// the legends: they turn up now and then, sign, and the twins fire Ragnarök
{
  const { newSave, matchConfig, homeKitGroups } = await import('../src/progress.js');
  const { rollLegend, legendState, signLegend, legendLeft, STAY } = await import('../src/legends.js');
  const { LEGENDS, TOURNAMENT } = await import('../src/data.js');
  const s = newSave();
  s.record.played = 3;
  check('no legends early', rollLegend(s, () => 0) === null);
  s.record.played = 10;
  check('hidden without their art', rollLegend(s, () => 0, () => false) === null);
  let seen = 0;
  for (let i = 0; i < 1000; i++) { const t = newSave(); t.record.played = 10; if (rollLegend(t)) seen++; }
  check('rare: about one match in twelve', seen > 40 && seen < 130, seen);
  const key = rollLegend(s, () => 0);
  check('a legend turns up', !!LEGENDS[key] && legendState(s).visiting === key && legendLeft(s) === STAY);
  check('too pricey at first', signLegend(s, key) === null);
  s.coins = 5000;
  check('signs', !!signLegend(s, key) && s.roster[key] && !legendState(s).visiting && member(key).def.elem === LEGENDS[key].elem);
  const twin = LEGENDS[key].twin;
  check('the twin comes looking sooner', rollLegend(s, () => 0.2) === twin);
  signLegend(s, twin);
  s.lineup.W = 'fenrir'; s.lineup.D = 'fafnir';
  const cfg = matchConfig(s, 'lynx', TOURNAMENT.stages[0]);
  check('the twins\' bond', cfg.teams[0].chem['fafnir+fenrir'] === 3, cfg.teams[0].chem);
  check('until their art arrives they wear the newcomer art', cfg.teams[0].skaters[1].sprite === 'newcomer_w' && homeKitGroups(s).includes('newcomers'));
  const m = new Match({ ...cfg, humanTeam: null, seed: 4 }); m.state = 'play';
  const fen = m.skaters.find((k) => k.who === 'fenrir'), faf = m.skaters.find((k) => k.who === 'fafnir');
  place(fen, GOAL_X - 300, 0); give(m, fen);
  fen.comboFrom = faf; fen.comboT = 0.5;
  let combo = null; m.on('combo', (x) => { combo = x; });
  m.shoot(fen, { kind: 'wrist' });
  check('Ragnarök', combo && combo.key === 'ragnarok' && m.puck.shot.special.firestorm && m.puck.shot.special.hidden, combo);
}

// the training camp: a new super or style once a season each, perks carried over
{
  const { newSave, campChange, campOpen, campChoices, CAMP } = await import('../src/progress.js');
  const { setStyles } = await import('../src/data.js');
  const s = newSave(); setStyles({});
  s.coins = CAMP.elem.price + CAMP.arch.price;
  s.roster.thunder.perks = ['Static: dash cooldown 2s shorter', 'Sniper: shots 15% more accurate'];
  check('a winger can\'t be a blueliner', !campChoices('thunder', 'arch').includes('blueliner') && campChoices('stone', 'arch').includes('blueliner'));
  check('no change to what they have', !campChange(s, 'thunder', 'elem', 'thunder'));
  check('a new super', campChange(s, 'thunder', 'elem', 'shadow') && member('thunder').def.ult.id === 'eclipse' && s.coins === CAMP.arch.price);
  check('perks follow it', s.roster.thunder.perks[0] === 'Ambush: your first check out of Fade always strips the puck', s.roster.thunder.perks);
  check('once a season', !campOpen(s, 'thunder', 'elem') && !campChange(s, 'thunder', 'elem', 'gale') && campOpen(s, 'thunder', 'arch'));
  check('a new style', campChange(s, 'thunder', 'arch', 'dangler') && member('thunder').def.arch === 'dangler' && s.coins === 0 && s.roster.thunder.perks[1] === 'Vision: passes travel 12% faster', s.roster.thunder.perks);
  check('not without coins', (s.season = 2, !campChange(s, 'thunder', 'elem', 'gale')));
  s.coins = 999;
  check('next season it\'s open again', campChange(s, 'thunder', 'elem', 'gale') && member('thunder').def.elem === 'gale');
  setStyles({});
  check('styles belong to their save', member('thunder').def.elem === 'thunder');
}

// stick hands: mirroring the other facing for the other hand, and forehand one-timers
{
  const { handMirror } = await import('../src/hands.js');
  const all = Object.fromEntries(['east', 'west', 'north', 'south', 'northeast', 'northwest', 'southeast', 'southwest'].map((d) => [d, 'L']));
  check('a left-shot set mirrors for a right shot', handMirror(all, 'east', 'R') === 'west' && handMirror(all, 'southwest', 'R') === 'southeast' && handMirror(all, 'south', 'R') === 'south' && handMirror(all, 'east', 'L') === null);
  check('a set that swaps hands when it turns is drawn as it is', handMirror({ east: 'R', west: 'L', south: 'L' }, 'east', 'L') === null && handMirror(undefined, 'east', 'R') === null);
  check('the other hand drawn both ways', handMirror({ east: 'R', west: 'R', south: 'L' }, 'east', 'L') === 'west');
  const m = mk(); const sh = m.skaters.find((k) => k.team === 0);
  place(sh, GOAL_X - 300, 0);
  const passer = { x: GOAL_X - 300, y: -150 }; // north of a shooter facing the net (east): their left
  sh.hand = 'L'; const l = m.forehand(sh, passer);
  sh.hand = 'R'; const r = m.forehand(sh, passer);
  check('forehand: a left shot takes it from the left', l === true && r === false);
  sh.side = -1; place(sh, -(GOAL_X - 300), 0); sh.hand = 'L';
  check('facing the other net, left is the other way', m.forehand(sh, { x: -(GOAL_X - 300), y: 150 }) === true);
}

// trades: a signing or a rookie, plus coins, for a rival's player
{
  const P = await import('../src/progress.js');
  const { trade, tradeQuote, tradeable } = await import('../src/trades.js');
  const { setRookies } = await import('../src/data.js');
  const s = P.newSave(); setRookies({});
  s.rivals = { rams: { wins: 1 }, comets: { wins: 1 } }; s.coins = 2000;
  check('nothing to trade at first', tradeable(s).length === 0);
  P.signRecruit(s, 'comets_d');
  s.lineup.D = 'comets_d';
  const q = tradeQuote(s, 'comets_d', 'rams_d');
  check('a quote: their price less what you send', q.coins === 80 && !q.likes, q);
  s.roster.comets_d.level = 4;
  check('levels add value', tradeQuote(s, 'comets_d', 'rams_d').coins === 20);
  const coins = s.coins;
  check('the trade', !!trade(s, 'comets_d', 'rams_d') && s.roster.rams_d && !s.roster.comets_d && s.coins === coins - 20);
  check('they join the other club\'s reserves', P.recruitStatus(s, 'comets_d') === 'traded' && P.isSigned(s, 'comets_d') && s.tradedAway.comets_d === 'rams');
  check('the line-up fills the gap', s.lineup.D === 'stone');
  check('the old club plays a newcomer in that slot', P.matchConfig(s, 'comets', null).teams[1].skaters[2].who === 'sub_stone');
  check('no trading for someone who\'s gone', !trade(s, 'rams_d', 'comets_d'));
  check('the cast stays', !tradeable(s).includes('frost') && tradeable(s).includes('rams_d'));
}

// Monolith: the AI goes round a stone wall instead of skating into it, and doesn't shoot into one
{
  const { Barrier } = await import('../src/entities.js');
  let rounded = 0, stuck = 0;
  for (let i = 0; i < 6; i++) {
    const mm = mk({}, {}, 40 + i);
    for (const o of mm.skaters) place(o, -600, o.team ? 280 : -280);
    const chaser = mm.skaters.find((k) => k.team === 1);
    place(chaser, -60, 30 * (i - 3));
    mm.puck.owner = null; Object.assign(mm.puck, { x: 140, y: 0, vx: 0, vy: 0, z: 0 });
    mm.barriers.push(new Barrier(40, 0, Math.PI / 2, 0, 6)); // a wall across the way to the puck
    let got = false;
    for (let f = 0; f < 240 && !got; f++) { mm.update(1 / 60); if (mm.puck.owner === chaser || chaser.x > 70) got = true; }
    if (got) rounded++; else stuck++;
  }
  check('Monolith: the AI goes round the wall to the puck', rounded === 6, [rounded, stuck]);
  const mm = mk({}, {}, 7);
  const ai = mm.ai[1], c = mm.skaters.find((k) => k.team === 1);
  place(c, ai.attX - ai.side * 250, 0);
  mm.barriers.push(new Barrier(ai.attX - ai.side * 150, 0, Math.PI / 2, 0, 6));
  check('...and won\'t shoot into it', ai.shotLane(c, 0) === 0);
}

console.log(`supers: ${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
