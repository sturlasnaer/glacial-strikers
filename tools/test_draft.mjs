// Draft Day and career numbers: prospects, picking a rookie, how rookies grow, and the
// career book filling up from match summaries.
//   node tools/test_draft.mjs
import { newSave, applyExp, canRaise, capBonus, matchConfig, homeKitGroups, rosterIds, STAT_CAP_BONUS } from '../src/progress.js';
import { makeDraft, offerDraft, draftOpen, draftPick, otherPicks, skipDraft } from '../src/draft.js';
import { newLeague, leagueRivals } from '../src/league.js';
import { member, ROOKIES, setRookies, TOURNAMENT } from '../src/data.js';
import { careerOf, recordCareer, careerRows } from '../src/career.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const s = newSave();
setRookies({});
check('no draft mid-season', !offerDraft(s) && !draftOpen(s));
s.league.phase = 'done';
check('no draft before the awards', !offerDraft(s));
s.league.awards = [];
check('draft once the season is over', offerDraft(s) && draftOpen(s) && !offerDraft(s));
for (let i = 0; i < 40; i++) {
  const d = makeDraft(s, 1, rnd);
  const roles = d.prospects.map((p) => member(p.kit).role).join('');
  if (roles !== 'CWD') { check('one prospect per position', false, roles); break; }
  for (const p of d.prospects) {
    const sum = Object.values(p.base).reduce((a, b) => a + b, 0), kitSum = Object.values(member(p.kit).base).reduce((a, b) => a + b, 0);
    if (p.potential < 2 || p.potential > 5 || sum !== kitSum - p.potential || Object.values(p.base).some((v) => v < 2 || v > 10)) { check('prospect stats', false, p); break; }
  }
  if (new Set(d.prospects.map((p) => p.name)).size !== 3 || new Set(d.rivals).size !== 2) { check('three names, two rivals', false, d); break; }
}
pass++; // the loop above

s.draft = makeDraft(s, 1, rnd);
const p = s.draft.prospects[1];
const id = draftPick(s, 1);
check('the pick joins the roster', id === 'rk1' && s.roster.rk1 && rosterIds(s).includes('rk1') && s.rookies.rk1.name === p.name, s.rookies);
check('a rookie is a member', member('rk1').role === 'W' && member('rk1').sprite === 'newcomer_w' && member('rk1').look === 'homekit' && member('rk1').rookie.potential === p.potential);
check('only one pick', draftPick(s, 0) === null && !draftOpen(s));
check('the other two went to rivals', otherPicks(s.draft).length === 2 && otherPicks(s.draft).every((o) => o.team && o.name !== p.name));
check('newcomer art in the home kit', homeKitGroups(s).includes('newcomers'));
s.lineup.W = 'rk1';
const cfg = matchConfig(s, 'lynx', TOURNAMENT.stages[0]);
const w = cfg.teams[0].skaters[1];
check('a rookie dresses in our colours', w.who === 'rk1' && w.sprite === 'newcomer_w' && w.look === 'homekit', w);

// growth: more EXP the higher the potential, and more room in each stat
const before = s.roster.rk1.exp;
applyExp(s, 'rk1', 50);
check('rookies learn faster', s.roster.rk1.exp - before === Math.round(50 * (1 + 0.15 * (p.potential - 1))), s.roster.rk1.exp);
check('a bigger stat cap', capBonus('rk1') === STAT_CAP_BONUS + Math.max(0, p.potential - 2) && capBonus('frost') === STAT_CAP_BONUS);
s.roster.rk1.points = 9;
const k = Object.keys(p.base).find((x) => p.base[x] <= 6);
s.roster.rk1.alloc[k] = STAT_CAP_BONUS;
check('room past the usual cap', canRaise(s.roster.rk1, 'rk1', k) === p.potential > 2);

// a second save forgets the first one's rookies
setRookies({});
check('rookies belong to their save', member('rk1') === null);
setRookies(s.rookies);

// career numbers
const sum = (goals) => ({ skaters: [
  { id: 'frost', team: 0, goals, assists: 1, hits: 2, steals: 1, shots: 4 },
  { id: 'rk1', team: 0, goals: 1, assists: 0, hits: 0, steals: 0, shots: 2 },
  { id: 'lynx_c', team: 1, goals: 3, assists: 0, hits: 0, steals: 0, shots: 5 },
], shots: [6, 9], saves: [8, 4], score: [goals + 1, 0] });
recordCareer(s, sum(2), true);
recordCareer(s, sum(0), false);
const c = careerOf(s);
check('career totals', c.skaters.frost.gp === 2 && c.skaters.frost.g === 2 && c.skaters.frost.a === 2 && c.skaters.frost.w === 1 && c.skaters.rk1.g === 2, c.skaters);
check('only our players', !c.skaters.lynx_c);
check('goalie line', c.goalies.halla.gp === 2 && c.goalies.halla.sv === 16 && c.goalies.halla.sa === 18 && c.goalies.halla.so === 2, c.goalies);
check('per season', c.skaters.frost.seasons[1].gp === 2);
const rows = careerRows(s, rosterIds(s));
check('rows by points', rows[0].id === 'frost' && rows[0].pts === 4 && rows.some((r) => r.id === 'thunder' && r.gp === 0), rows.map((r) => r.id + r.pts));

const old = newSave();
old.league.stats = { skaters: { 'home:frost': { key: 'home:frost', team: 'home', face: 'frost', gp: 5, g: 3, a: 2, hits: 1, steals: 0, shots: 9 } }, goalies: { home: { gp: 5, sa: 60, sv: 54, so: 1 } } };
check('an old save starts from this season', careerOf(old).skaters.frost.g === 3 && careerOf(old).goalies.halla.sv === 54);

// players from parts (Batch AJ): looks, recolouring through masks, head placement
{
  const Mo = await import('../src/modular.js');
  check('no parts without the art', Mo.randomLook() === null && Mo.lookFor('rk1') === null);
  Mo.useModular({ skaters: { body_std: {} }, modular: { heads: { braids: {}, beard: {} } } });
  const a = Mo.lookFor('rk7'), b = Mo.lookFor('rk7'), c = Mo.lookFor('rk8');
  check('a look per id, the same every time', a && JSON.stringify(a) === JSON.stringify(b) && a.body === 'std' && ['braids', 'beard'].includes(a.head), [a, c]);
  check('the body sprite', Mo.bodySprite(a) === 'body_std' && Mo.bodySprite({ body: 'tall' }) === null);
  // two skin pixels (one lit, one shaded), one hair pixel, one helmet pixel the mask leaves alone
  const d = new Uint8ClampedArray([200, 150, 120, 255, 100, 75, 60, 255, 90, 60, 40, 255, 20, 30, 70, 255]);
  const md = new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0]);
  Mo.recolorParts(d, md, { skin: 5, hair: 6 });
  check('skin recoloured, shading kept', d[0] > d[4] && Math.abs(d[0] / d[2] - 0x55 / 0x1f) < 0.6, [...d.slice(0, 8)]);
  check('hair recoloured', d[8] > d[10] * 2, [...d.slice(8, 12)]);
  check('the helmet untouched', d[12] === 20 && d[13] === 30 && d[14] === 70);
  const M = { anchors: { f1: { x: 30, y: 10, view: 'e', rot: 10, state: 'effort' } }, heads: { braids: { e: { normal: 'h_n', effort: 'h_e' } } } };
  const hp = Mo.headPlacement(M, { head: 'braids' }, 'f1', [0, 0, 0, 60, 120, 30, 120, 1], 100, 200, 0.5, false);
  const hf = Mo.headPlacement(M, { head: 'braids' }, 'f1', [0, 0, 0, 60, 120, 20, 120, 1], 100, 200, 0.5, true);
  check('the head on its anchor', hp.x === 100 && hp.y === 145 && hp.head === 'h_e' && hp.rot > 0, hp);
  check('mirrored', hf.x === 95 && hf.rot < 0, hf);
  Mo.useModular(null);
}

// skipping Draft Day: all three rookies sign with clubs in the league
{
  const s = newSave(); s.league = newLeague(1);
  s.draft = makeDraft(s, 1);
  skipDraft(s);
  const L = leagueRivals(s.league), picks = otherPicks(s.draft, s);
  check('a skipped draft sends all three to league clubs', s.draft.picked === -1 && picks.length === 3 && s.draft.rivals.every((t) => L.includes(t)) && new Set(s.draft.rivals).size === 3, s.draft.rivals);
}

console.log(`draft and career: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
