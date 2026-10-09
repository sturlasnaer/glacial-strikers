// Scripted checks of the player's controls through Match.setHumanInput.
import { Match } from '../src/match.js';
import { CHARACTERS } from '../src/data.js';
import { GOAL_X as GOAL_X_ } from '../src/rink.js';
const team = (chem = {}) => ({ chem, skaters: ['frost', 'thunder', 'stone'].map((id) => ({ def: CHARACTERS[id], stats: { ...CHARACTERS[id].base }, perks: [] })), goalie: { stats: { rfx: 6, pos: 6 } } });
const mk = (chem) => { const m = new Match({ teams: [team(chem), team()], humanTeam: 0, seed: 5, powers: [], diff: [0.6, 0.6] }); m.state = 'play'; return m; };
const raw = (o = {}) => ({ mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false, ...o });
const log = [];
const run = (m, inputs) => { for (const inp of inputs) { m.setHumanInput(inp); m.update(1 / 60); } };
const freeze = (m) => { for (const s of m.skaters) if (s.team === 1) { s.x = 0; s.y = -250 + s.slot * 30; } };
let ok = 0, fail = 0;
const check = (name, cond) => { if (cond) ok++; else { fail++; console.log('FAIL', name); } };

// 1. wrist shot: tap A with puck
{ const m = mk(); const c = m.controlled(); c.x = 300; c.y = 0; m.takePossession(c); let shots = []; m.on('shot', (e) => shots.push(e.kind));
  run(m, [raw({ a: true }), raw(), raw(), raw()]); check('wrist shot', shots[0] === 'wrist'); }
// 2. slapshot: hold A 0.6s
{ const m = mk(); freeze(m); const c = m.controlled(); c.x = 200; c.y = 0; m.takePossession(c); let shots = []; m.on('shot', (e) => shots.push(e));
  run(m, [...Array(36).fill(raw({ a: true })), raw()]); check('slapshot', shots[0]?.kind === 'slap' && shots[0].speed > 1000); }
// 3. pass: B with puck switches control to receiver on catch
{ const m = mk(); freeze(m); const c = m.controlled(); c.x = 0; c.y = 0; c.face = 0; m.takePossession(c);
  const mate = m.teamSkaters(0).find((s) => s !== c); mate.x = 150; mate.y = 20; mate.vx = mate.vy = 0;
  let passes = 0; m.on('pass', () => passes++);
  run(m, [raw({ b: true, mx: 1 }), ...Array(40).fill(raw())]);
  check('pass made', passes === 1); check('control switched to receiver', m.controlled() === mate && m.puck.owner === mate); }
// 4. one-timer: hold A while pass arrives
{ const m = mk(); freeze(m); const passer = m.teamSkaters(0)[1]; const c = m.controlled(); c.x = 380; c.y = 60; passer.x = 330; passer.y = -120; m.takePossession(passer);
  let kinds = []; m.on('shot', (e) => kinds.push(e.kind));
  m.pass(passer, c);
  run(m, Array(40).fill(raw({ a: true })));
  check('one-timer', kinds.includes('onetimer')); }
// 5. check: A without puck lunges and hits carrier
{ const m = mk(); const c = m.controlled(); const opp = m.teamSkaters(1)[0]; c.x = 0; c.y = 0; opp.x = 40; opp.y = 0; m.takePossession(opp);
  let hits = 0; m.on('hit', () => hits++);
  run(m, [raw({ a: true, mx: 1 }), ...Array(20).fill(raw({ mx: 1 }))]);
  check('check hit', hits === 1); }
// 6. switch: B without puck changes controlled skater
{ const m = mk(); const c = m.controlled(); m.puck.owner = null; m.puck.x = 400; m.puck.y = 0; const before = c;
  run(m, [raw({ b: true }), raw(), raw()]); check('switch', m.controlled() !== before); }
// 7. skill + ult
{ const m = mk(); const c = m.controlled(); let sk = 0, ul = 0; m.on('skill', () => sk++); m.on('ult', () => ul++);
  c.x = 300; m.takePossession(c); c.ult = 100;
  run(m, [raw({ skill: true }), raw(), raw({ ult: true }), raw(), raw()]); check('skill used', sk === 1); check('ult used', ul === 1); }
// 8. holding A from a check doesn't fire a shot after stealing the puck
{ const m = mk(); const c = m.controlled(); let shots = 0; m.on('shot', () => shots++);
  m.puck.owner = null; m.puck.x = c.x + 30; m.puck.y = c.y; run(m, [raw({ a: true }), ...Array(5).fill(raw({ a: true }))]);
  m.takePossession(c); run(m, [...Array(20).fill(raw({ a: true })), raw(), raw()]); check('no accidental shot', shots === 0); }
// 9. chemistry combo: pass Nix -> Volta, Volta one-times it = Frostbolt
{ const m = mk({ 'frost+thunder': 1 }); freeze(m); const nix = m.teamSkaters(0).find((s) => s.def.id === 'frost'); const volta = m.teamSkaters(0).find((s) => s.def.id === 'thunder');
  for (const s of m.teamSkaters(0)) s.controlled = s === volta;
  volta.x = 380; volta.y = 60; nix.x = 330; nix.y = -120; m.takePossession(nix);
  let combos = []; m.on('combo', (e) => combos.push(e.key));
  m.pass(nix, volta); run(m, Array(40).fill(raw({ a: true })));
  check('frostbolt combo fires', combos[0] === 'frost+thunder'); }
// 10. no chemistry, no combo
{ const m = mk({}); freeze(m); const nix = m.teamSkaters(0).find((s) => s.def.id === 'frost'); const volta = m.teamSkaters(0).find((s) => s.def.id === 'thunder');
  for (const s of m.teamSkaters(0)) s.controlled = s === volta;
  volta.x = 380; volta.y = 60; nix.x = 330; nix.y = -120; m.takePossession(nix);
  let combos = 0, shots = 0; m.on('combo', () => combos++); m.on('shot', () => shots++);
  m.pass(nix, volta); run(m, Array(40).fill(raw({ a: true })));
  check('no combo without chemistry', combos === 0 && shots === 1); }
// 11. late shot after the window is a normal shot
{ const m = mk({ 'frost+thunder': 2 }); freeze(m); const nix = m.teamSkaters(0).find((s) => s.def.id === 'frost'); const volta = m.teamSkaters(0).find((s) => s.def.id === 'thunder');
  for (const s of m.teamSkaters(0)) s.controlled = s === volta;
  volta.x = 300; volta.y = 40; nix.x = 250; nix.y = -100; m.takePossession(nix);
  let combos = 0; m.on('combo', () => combos++);
  m.pass(nix, volta); run(m, Array(30).fill(raw())); run(m, Array(80).fill(raw())); run(m, [raw({ a: true }), raw(), raw()]);
  check('combo window expires', combos === 0); }
// 12. thunderquake knocks back nearby defenders
{ const m = mk({ 'stone+thunder': 1 }); const bram = m.teamSkaters(0).find((s) => s.def.id === 'stone'); const volta = m.teamSkaters(0).find((s) => s.def.id === 'thunder');
  for (const s of m.teamSkaters(0)) s.controlled = s === bram;
  const opp = m.teamSkaters(1)[0]; for (const s of m.teamSkaters(1)) { s.x = 0; s.y = -260; }
  bram.x = 300; bram.y = 0; volta.x = 250; volta.y = -120; opp.x = 340; opp.y = 30; m.takePossession(volta);
  let quakes = 0; m.on('quake', () => quakes++);
  m.pass(volta, bram); run(m, Array(40).fill(raw({ a: true })));
  check('thunderquake', quakes === 1); }
// 13. pass chain counts and resets on a shot
{ const m = mk({}); freeze(m); m.ai[1].update = () => {}; for (const s of m.teamSkaters(1)) { s.x = -500; s.y = 200; s.in.mx = 0; s.in.my = 0; } const [a, b, c] = m.teamSkaters(0); a.x = 0; a.y = 0; b.x = 120; b.y = 40; c.x = 60; c.y = -80; m.takePossession(a);
  let chains = 0; m.on('chain', () => chains++);
  m.pass(a, b); for (let i = 0; i < 30; i++) m.update(1 / 60);
  m.pass(m.puck.owner, c); for (let i = 0; i < 30; i++) m.update(1 / 60);
  m.pass(m.puck.owner, a); for (let i = 0; i < 30; i++) m.update(1 / 60);
  check('pass chain x3', chains >= 1 && m.chain[0] >= 3); }
// 14. local versus: both players control their own skater
{ const m = new Match({ teams: [team(), team()], humanTeam: 0, humans: [0, 1], seed: 9, powers: [], diff: [0.6, 0.6] }); m.state = 'play';
  const p1 = m.controlled(0), p2 = m.controlled(1);
  check('versus: two controlled skaters', p1 && p2 && p1.team === 0 && p2.team === 1);
  const y1 = p1.y, y2 = p2.y;
  for (let i = 0; i < 30; i++) { m.setHumanInput(raw({ my: -1 }), 0); m.setHumanInput(raw({ my: 1 }), 1); m.update(1 / 60); }
  check('versus: both move', m.controlled(0).y < y1 - 30 && m.controlled(1).y > y2 + 30);
  // P2 switch button changes only P2's skater
  m.puck.owner = null; m.puck.x = 400; m.puck.y = 0;
  const before1 = m.controlled(0), before2 = m.controlled(1);
  m.setHumanInput(raw(), 0); m.setHumanInput(raw({ b: true }), 1); m.update(1 / 60);
  check('versus: P2 switch', m.controlled(0) === before1 && m.controlled(1) !== before2 && m.controlled(1).team === 1);
  // P2 shoots with the puck
  const c2 = m.controlled(1); c2.x = -400; c2.y = 0; m.takePossession(c2); let shots = []; m.on('shot', (e) => shots.push(e.s.team));
  m.setHumanInput(raw({ a: true }), 1); m.update(1 / 60); m.setHumanInput(raw(), 1); m.update(1 / 60); m.update(1 / 60);
  check('versus: P2 shoots', shots.includes(1)); }
// 15. challenge: one-timers only disallows a wrist-shot goal
{ const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 3, powers: [], diff: [0.6, 0.6], mods: ['onetimers'] }); m.state = 'play';
  let ng = 0, goals = 0; m.on('no_goal', () => ng++); m.on('goal', () => goals++);
  m.puck.owner = null; m.puck.x = 600; m.puck.y = 0; m.puck.z = 0; m.puck.vz = 0; m.puck.vx = 900; m.puck.vy = 0; m.puck.shot = { team: 0, kind: 'wrist', by: m.skaters[0], special: {}, frozen: new Set() };
  for (const g of m.goalies) g.y = 300;
  for (let i = 0; i < 10; i++) m.update(1 / 60);
  check('challenge: one-timers only', ng === 1 && goals === 0 && m.score[0] === 0); }
// 16. interference: checking a skater far from the puck can draw a penalty
{ let calls = 0, n = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const m = new Match({ teams: [team(), team()], humanTeam: 0, seed, powers: [], diff: [0.6, 0.6] }); m.state = 'play';
    for (const s of m.teamSkaters(1)) { s.x = -500; s.y = 250; }
    const c = m.controlled(); const opp = m.teamSkaters(1)[1]; c.x = 0; c.y = 0; opp.x = 40; opp.y = 0;
    m.puck.owner = null; m.puck.x = 400; m.puck.y = -200; m.puck.z = 0;
    let pen = null, delayed = null; m.on('penalty', (e) => { pen = e; }); m.on('penalty_delayed', (e) => { delayed = e; });
    run(m, [raw({ a: true, mx: 1 }), ...Array(10).fill(raw({ mx: 1 }))]);
    // (called at once if we have the puck, or delayed while it's loose or theirs)
    n++; if (pen || delayed) { calls++; if (pen ? !(pen.s === c && c.boxT > 0 && m.state === 'penalty') : !(delayed.s === c && m.pendingPenalty && m.pendingPenalty.s === c)) fail++; }
  }
  check('interference gets called sometimes', calls > 3 && calls < 20); }
// 17. power-play goal releases the boxed player; goalie pull works and returns after a goal
{ const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 4, powers: [], diff: [0.6, 0.6] }); m.state = 'play';
  const boxed = m.teamSkaters(1)[2]; m.pendingPenalty = { s: boxed, reason: 'Boarding' }; m.whistlePenalty();
  check('penalty parks the skater', boxed.parked && boxed.boxT > 0 && m.powerPlay(0) === 1);
  for (let i = 0; i < 200; i++) m.update(1 / 60); // stoppage, faceoff
  m.state = 'play'; m.score = [0, 4];
  check('can pull goalie when trailing', m.canPullGoalie(0));
  m.setHumanInput(raw({ pull: true }), 0); m.update(1 / 60); m.setHumanInput(raw(), 0); m.update(1 / 60);
  check('goalie pulled', !!m.extra[0] && m.goalieAt(-1).disabled && m.teamSkaters(0).length === 4);
  m.puck.owner = null; m.puck.x = 600; m.puck.y = 0; m.puck.z = 0; m.puck.vx = 900; m.puck.vy = 0; m.puck.lastTouch = m.teamSkaters(0)[0]; m.goalieAt(1).y = 300;
  for (let i = 0; i < 10; i++) m.update(1 / 60);
  check('PP goal releases boxed player', m.score[0] === 1 && !boxed.parked && boxed.boxT === 0);
  for (let i = 0; i < 260; i++) m.update(1 / 60);
  check('goalie returns after a goal', !m.extra[0] && !m.goalieAt(-1).disabled && m.teamSkaters(0).length === 3); }
// 16. the deke: a quick tap of sprint with a defender in front cuts away with the puck pulled in;
// a held sprint is just sprinting; near the goalie it can make them bite
{ const m = mk(); const c = m.controlled(); const d = m.teamSkaters(1)[0];
  for (const o of m.skaters) if (o !== c && o !== d) { o.x = -600; o.y = 250; o.parked = true; }
  c.x = 0; c.y = 0; c.face = 0; d.x = 70; d.y = 6; m.takePossession(c, 'catch');
  let dekes = 0; m.on('deke', () => dekes++);
  run(m, [raw({ sprint: true, mx: 1 }), raw({ sprint: true, mx: 1 }), raw({ mx: 1 }), raw({ mx: 1 })]);
  check('a tap of sprint dekes past the defender', dekes === 1 && c.dekeT > 0 && c.protect === 1 && c.vy < -100);
  const m2 = mk(); const c2 = m2.controlled(); const d2 = m2.teamSkaters(1)[0];
  for (const o of m2.skaters) if (o !== c2 && o !== d2) { o.x = -600; o.y = 250; o.parked = true; }
  c2.x = 0; c2.y = 0; c2.face = 0; d2.x = 70; d2.y = 6; m2.takePossession(c2, 'catch');
  let dekes2 = 0; m2.on('deke', () => dekes2++);
  run(m2, [...Array(30).fill(raw({ sprint: true, mx: 1 })), raw({ mx: 1 })]);
  check('...a held sprint is just a sprint', dekes2 === 0);
  let bites = 0;
  for (let i = 0; i < 40; i++) {
    const m3 = new Match({ teams: [team(), team()], humanTeam: 0, seed: 100 + i, powers: [], diff: [0.6, 0.6] }); m3.state = 'play';
    const c3 = m3.controlled(); for (const o of m3.skaters) if (o !== c3) { o.x = -600; o.y = 250; o.parked = true; }
    c3.x = GOAL_X_ - 170; c3.y = 0; c3.face = 0; m3.takePossession(c3, 'catch');
    m3.on('deke_goalie', () => bites++);
    m3.deke(c3);
  }
  check('...and near the goalie, they bite now and then', bites > 6 && bites < 36, bites); }

// 17. the faceoff: a press right on the drop wins it clean; a press while the puck is still
// in the air holds you back past the other centre's reaction, so mashing loses the draw (at
// every difficulty, whatever the AI rolls)
{ const draw = (seed, diff, press) => {
    const m = new Match({ teams: [team(), team()], humanTeam: 0, seed, powers: [], diff: [0.6, diff] });
    m.state = 'faceoff'; m.stateT = 0; m.dropped = false;
    let w = null, clean = false, early = false;
    m.on('faceoff_win', (x) => { w = x.s.team; clean = !!x.clean; }); m.on('faceoff_early', () => { early = true; });
    for (let i = 0; i < 160 && m.state === 'faceoff'; i++) { m.setHumanInput(raw({ b: press(i) })); m.update(1 / 60); }
    return { w, clean, early };
  };
  let onDrop = 0, mashWins = 0, earlyWins = 0, n = 0;
  for (const diff of [0.1, 0.3, 0.6, 0.9]) for (let seed = 1; seed <= 15; seed++) {
    n++;
    const d = draw(seed, diff, (i) => i === 67 || i === 69); if (d.w === 0 && d.clean && !d.early) onDrop++;
    if (draw(seed, diff, (i) => i % 2 === 0).w === 0) mashWins++;
    const e = draw(seed, diff, (i) => i === 55 || i === 57); if (e.early && e.w === 0) earlyWins++;
  }
  check('a press on the drop wins the draw clean', onDrop === n);
  check('...one before it lands is too early', earlyWins === 0);
  check('...and mashing never wins it', mashWins === 0);
  // (counted for the daily goals: clean draws and dekes in the match summary)
  const m = new Match({ teams: [team(), team()], humanTeam: 0, seed: 7, powers: [], diff: [0.6, 0.6] });
  m.state = 'faceoff'; m.stateT = 0; m.dropped = false;
  for (let i = 0; i < 160 && m.state === 'faceoff'; i++) { m.setHumanInput(raw({ b: i === 67 })); m.update(1 / 60); }
  const c = m.controlled(); for (const o of m.skaters) if (o.team === 1) { o.x = c.x + 60; o.y = c.y; break; }
  c.face = 0; m.deke(c);
  const k = m.summary().skaters.find((x) => x.team === 0 && x.cleanDraws);
  check('clean draws and dekes are counted for the daily goals', k && k.cleanDraws === 1 && m.summary().skaters.some((x) => x.dekes === 1)); }

console.log(`controls: ${ok} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
