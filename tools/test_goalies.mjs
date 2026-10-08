// Goalies: goaltending styles change how a goalie moves and reaches, rival goalies sign,
// the starter is the one in our net, their old team plays a backup, and careers and awards
// follow whoever was in goal.
//   node tools/test_goalies.mjs [matches]
import { Match } from '../src/match.js';
import { CHARACTERS, GOALIE_STYLES, GOALIE_RECRUITS, TEAMS, TOURNAMENT, goalieInfo } from '../src/data.js';
import { newSave, signGoalie, setStarter, starterId, goalieIds, goalieStats, homeGoalie, rivalGoalie, goalieStatus, applyGoalieExp, matchConfig, homeKitGroups } from '../src/progress.js';
import { careerOf, recordCareer, careerGoalies } from '../src/career.js';
import { recordRealGame, computeAwards, seasonStats } from '../src/awards.js';

const N = +(process.argv[2] || 4);
let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };
const KITS = ['frost', 'thunder', 'stone'];
const team = (goalie) => ({ chem: {}, goalie, skaters: KITS.map((k) => ({ def: CHARACTERS[k], stats: { ...CHARACTERS[k].base }, perks: [] })) });
const mk = (g0, g1 = { stats: { rfx: 6, pos: 6 }, name: 'G' }, seed = 3) => new Match({ teams: [team(g0), team(g1)], humanTeam: null, seed, powers: [], diff: [0.6, 0.6] });
const keeper = (style) => mk({ stats: { rfx: 6, pos: 6 }, name: 'K', style }).goalies[0];

// styles
const base = keeper('hybrid');
check('every team has a style and a backup', Object.values(TEAMS).filter((t) => t.id !== 'home').every((t) => GOALIE_STYLES[t.gstyle] && t.subs.goalie), Object.values(TEAMS).map((t) => t.gstyle));
check('six styles', Object.keys(GOALIE_STYLES).length === 6 && Object.values(GOALIE_STYLES).every((s) => s.name && s.text));
check('a scrambler moves quicker side to side', keeper('scrambler').lat > base.lat * 1.1, [keeper('scrambler').lat, base.lat]);
check('...with a little less reach', keeper('scrambler').reach() < base.reach());
check('a wall covers more net, moves slower', keeper('wall').reach() > base.reach() && keeper('wall').lat < base.lat);
check('a reader reacts sooner, moves across slower', keeper('reader').style.react < 1 && keeper('reader').lat < base.lat);
{
  const b = keeper('butterfly');
  b.state = 'butterfly'; b.match.puck.z = 2;
  const low = b.reach();
  b.match.puck.z = 30;
  const high = b.reach();
  const h = keeper('hybrid'); h.state = 'butterfly'; h.match.puck.z = 2;
  check('a butterfly seals the ice, opens up high', low > h.reach() && high < h.reach(), [low, high, h.reach()]);
}
check('an unknown style plays hybrid', keeper('nope').lat === base.lat && keeper(undefined).reach() === base.reach());

// signing
const s = newSave();
s.coins = 2000;
check('locked before a win', goalieStatus(s, 'rams_g') === 'locked' && !signGoalie(s, 'rams_g'));
s.rivals = { rams: { wins: 1, losses: 0 } };
s.goalie.level = 5;
check('open after one', goalieStatus(s, 'rams_g') === 'open');
const g = signGoalie(s, 'rams_g');
check('signs a level below Halla', g && g.level === 4 && s.coins === 2000 - GOALIE_RECRUITS.rams_g.price && goalieStatus(s, 'rams_g') === 'signed', g);
check('only once', !signGoalie(s, 'rams_g'));
check('Halla still starts', starterId(s) === 'halla' && goalieIds(s).join() === 'halla,rams_g');
check('no starter who isn\'t ours', !setStarter(s, 'lynx_g') && starterId(s) === 'halla');
check('choose the starter', setStarter(s, 'rams_g') && starterId(s) === 'rams_g');
const hg = homeGoalie(s);
check('our goalie in our colours, their own style', hg.who === 'rams_g' && hg.look === 'homekit' && hg.art === TEAMS.rams.art && hg.style === TEAMS.rams.gstyle && hg.name === TEAMS.rams.names.goalie, hg);
check('their rival art loads in our kit', homeKitGroups(s).includes('rival_' + TEAMS.rams.art));
const rg = rivalGoalie(s, 'rams');
check('their old team plays a backup', rg.name === TEAMS.rams.subs.goalie && rg.art === 'newcomer' && rg.who === 'sub_goalie' && rg.stats.rfx === TEAMS.rams.goalie.rfx - 1, rg);
check('other rivals keep theirs', rivalGoalie(s, 'lynx').name === TEAMS.lynx.names.goalie && rivalGoalie(s, 'lynx').style === TEAMS.lynx.gstyle);
const cfg = matchConfig(s, 'rams', TOURNAMENT.stages[0]);
check('the match config', cfg.teams[0].goalie.who === 'rams_g' && cfg.teams[1].goalie.who === 'sub_goalie');
const m = new Match(cfg);
check('in the match', m.goalies[0].who === 'rams_g' && m.goalies[0].look === 'homekit' && m.goalies[0].style === GOALIE_STYLES[TEAMS.rams.gstyle].mods);
check('EXP goes to the starter', applyGoalieExp(s, 10000) > 0 && s.goalies.rams_g.level > 4 && s.goalie.exp === 0);
check('stats grow with level', goalieStats(s, 'rams_g').rfx > GOALIE_RECRUITS.rams_g.base.rfx);
check('Halla is Halla', goalieInfo('halla').name === 'Halla' && goalieInfo('nobody').name === 'Halla');

// careers and awards follow who was in net
const sum = { skaters: [], shots: [5, 20], saves: [4, 18], score: [3, 2], goalie: 'rams_g' };
recordCareer(s, sum, true);
recordCareer(s, { ...sum, goalie: 'halla', score: [1, 0] }, true);
const rows = careerGoalies(s, goalieIds(s));
check('a career line each', rows.find((r) => r.id === 'rams_g').gp === 1 && rows.find((r) => r.id === 'rams_g').sv === 4 && rows.find((r) => r.id === 'halla').so === 1, rows);
const old = newSave();
old.career = { skaters: {}, goalie: { gp: 3, w: 2, sa: 40, sv: 37, so: 1 } };
check('an old career book moves to Halla', careerOf(old).goalies.halla.sv === 37 && !careerOf(old).goalie);
const L = { stats: { skaters: {}, goalies: {} } };
for (let i = 0; i < 4; i++) recordRealGame(s, L, { ...sum, skaters: [], shots: [10, 30], saves: [9, 29], score: [3, 1] }, 'lynx');
const aw = computeAwards(s, L, ['home', 'lynx']);
const iw = seasonStats(L).goalies.home;
check('the season line names who played', iw.name === TEAMS.rams.names.goalie && iw.face === 'rams_g', iw);
const wall = aw.find((a) => a.id === 'iron_wall');
check('the Iron Wall goes to them', !wall || (wall.team !== 'home' || wall.face === 'rams_g'), wall);

// every style plays full AI matches
const sv = {};
for (const st of Object.keys(GOALIE_STYLES)) {
  let saves = 0, shots = 0;
  for (let i = 0; i < N; i++) {
    const mm = mk({ stats: { rfx: 6, pos: 6 }, name: 'K', style: st }, undefined, 11 + i * 7);
    mm.state = 'play';
    let t = 0;
    while (!mm.winner && t < 400) { mm.update(1 / 60); t += 1 / 60; }
    const r = mm.summary();
    saves += r.saves[0]; shots += r.shots[1];
  }
  sv[st] = shots ? +(saves / shots).toFixed(3) : 0;
}
console.log('save % by style (AI):', JSON.stringify(sv));
check('every style stops pucks', Object.values(sv).every((v) => v > 0.55 && v < 0.98), sv);

console.log(`goalies: ${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
