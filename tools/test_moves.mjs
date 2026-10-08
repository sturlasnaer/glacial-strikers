// A living league: rivals draft into the holes your signings leave, sign free agents now and
// then, and call with trade offers; whoever fills a slot plays it, grows, and shows up in
// the league's numbers.
//   node tools/test_moves.mjs
import { newSave, matchConfig, addRecruit } from '../src/progress.js';
import { makeDraft, draftPick, otherPicks } from '../src/draft.js';
import { holes, rivalDraft, rivalSigning, rivalOffer, acceptOffer, SIGN_CHANCE, OFFER_CHANCE } from '../src/moves.js';
import { rivalSub, fillStats, vacated } from '../src/slots.js';
import { recordSimGame, seasonStats } from '../src/awards.js';
import { TEAMS, TOURNAMENT, CHARACTERS, setRookies, recruitKey, member } from '../src/data.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const always = () => 0; // every chance comes up

const s = newSave();
setRookies({});
check('no holes before a signing', holes(s, 'lynx').length === 0 && rivalSub(s, 'lynx', 'frost') === null);
addRecruit(s, 'lynx_c');
check('a signing leaves a hole', vacated(s, 'lynx', 'frost') && holes(s, 'lynx').join() === 'frost');
const reserve = rivalSub(s, 'lynx', 'frost');
check('a reserve until it\'s filled', reserve.name === TEAMS.lynx.subs.frost && reserve.fill === null && reserve.stats === null);

// Draft Day: the centre prospect goes to the team that lost its centre
s.draft = makeDraft(s, 1, rnd);
const wingIdx = s.draft.prospects.findIndex((p) => p.kit === 'thunder');
const centre = s.draft.prospects.find((p) => p.kit === 'frost');
draftPick(s, wingIdx);
const picks = otherPicks(s.draft, s);
check('the rival with the hole takes the centre', s.draft.rivals.includes('lynx') && picks.find((o) => o.name === centre.name).team === TEAMS.lynx && picks.find((o) => o.name === centre.name).fills, picks);
check('only one pick fills a hole', picks.filter((o) => o.fills).length === 1);
const sub = rivalSub(s, 'lynx', 'frost');
check('the pick plays the slot', sub.name === centre.name && sub.def.arch === centre.arch && sub.hand === centre.hand && sub.fill.how === 'draft', sub);
check('the hole is filled', holes(s, 'lynx').length === 0);
const cfg = matchConfig(s, 'lynx', TOURNAMENT.stages[0]);
const sk = cfg.teams[1].skaters[0];
const bonus = TEAMS.lynx.bonus || {};
check('in a match: their name, style and numbers', sk.who === 'sub_frost' && sk.name === centre.name && sk.def.arch === centre.arch && sk.sprite === 'newcomer_c'
  && Object.keys(centre.base).every((k) => sk.stats[k] === Math.max(1, centre.base[k] + (bonus[k] || 0))), sk);

// a draft pick grows from their second season
const f = sub.fill;
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
s.season = f.season + 1;
check('no growth in their first season', sum(fillStats(s, f)) === sum(f.base));
s.season = f.season + 2;
const grown = fillStats(s, f);
check('then they grow', sum(grown) === sum(f.base) + Math.min(f.potential + 2, f.potential - 1) && Object.values(grown).every((v) => v <= 10), [sum(f.base), sum(grown), f.potential]);
s.season = f.season + 6;
check('up to a cap', sum(fillStats(s, f)) === sum(f.base) + f.potential + 2);
s.season = 1;

// free agents
const s2 = newSave();
check('no signing without a hole', rivalSigning(s2, always) === null);
addRecruit(s2, 'rams_d');
check('no signing when the dice say no', rivalSigning(s2, () => 0.99) === null && SIGN_CHANCE < 0.5);
const mv = rivalSigning(s2, always);
const ag = rivalSub(s2, 'rams', 'stone');
check('a rival signs a free agent', mv && mv.team === 'rams' && mv.kit === 'stone' && ag.name === mv.name && ag.fill.how === 'sign', [mv, ag]);
check('a journeyman: kit numbers, one up one down', sum(ag.stats) === sum(CHARACTERS.stone.base) && ['blueliner', 'grinder', 'enforcer'].includes(ag.def.arch), ag);
check('and stays who they are', (s2.season = 5, sum(fillStats(s2, ag.fill)) === sum(CHARACTERS.stone.base)));
s2.season = 1;
check('nothing left to fill', rivalSigning(s2, always) === null);
// a draft pick takes over from a stopgap
s2.draft = makeDraft(s2, 1, rnd);
const dPick = s2.draft.prospects.find((p) => p.kit === 'stone');
draftPick(s2, s2.draft.prospects.findIndex((p) => p.kit === 'frost'));
check('the draft replaces a stopgap', rivalSub(s2, 'rams', 'stone').name === dPick.name, rivalSub(s2, 'rams', 'stone'));

// season numbers under the right name
const L = { stats: { skaters: {}, goalies: {} } };
recordSimGame(s, L, { a: 'lynx', b: 'rams', ga: 3, gb: 1 }, rnd);
check('the league sheet names who played', seasonStats(L).skaters['lynx:sub_frost'].name === centre.name);

// trade offers
const s3 = newSave();
s3.coins = 1000;
check('no calls without talks', rivalOffer(s3, always) === null);
s3.rivals = { comets: { wins: 1, losses: 0 } };
check('no calls without anyone to trade', rivalOffer(s3, always) === null);
addRecruit(s3, 'ravens_w'); // (talks closed with the ravens; a signing is still ours to trade)
check('no call when the dice say no', rivalOffer(s3, () => 0.99) === null && OFFER_CHANCE < 0.5);
s3.record.played = 4;
const o = rivalOffer(s3, always);
check('an offer', o && o.team === 'comets' && o.give === 'ravens_w' && o.get.startsWith('comets_'), o);
check('not twice in a row', (s3.record.played = 5, rivalOffer(s3, always) === null));
s3.record.played = 7;
check('again after a while', !!rivalOffer(s3, always));
const before = s3.coins;
const done = acceptOffer(s3, o);
check('accepting trades them', done && s3.roster[o.get] && !s3.roster[o.give] && s3.tradedAway.ravens_w === 'comets' && s3.coins === before - o.coins, [s3.coins, before, o.coins]);
check('a hole on their side now', vacated(s3, 'comets', member(o.get).def.id));
// when yours is worth more, they pay
const s4 = newSave();
s4.coins = 0;
s4.rivals = { lynx: { wins: 1, losses: 0 } };
addRecruit(s4, 'royals_c');
s4.roster.royals_c.level = 9;
const o4 = rivalOffer(s4, always);
check('they pay the difference (half of it)', o4 && o4.coins < 0, o4);
check('even with an empty purse', acceptOffer(s4, o4) && s4.coins === -o4.coins, s4.coins);
check('a gone offer can\'t be taken twice', acceptOffer(s4, o4) === null);

console.log(`league moves: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
