// Translation checker: collects every English string the game can show (t('...') keys in
// the code, plus the story and data text in the modules) and lists what a catalogue is
// missing or no longer uses.
//   node tools/i18n_check.mjs [lang] [--json out.json] [--unused]
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const lang = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'is';
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const root = new URL('..', import.meta.url).pathname;
const keys = new Map(); // text -> where
const coded = new Set(); // keys written as t('...') in the code, kept even when they match a name
const add = (s, where) => { if (typeof s === 'string' && /[A-Za-z]/.test(s) && !keys.has(s)) keys.set(s, where); };

// 1. t('...') calls in the source
const unquote = (q, body) => (q === '`' ? body : body.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n'));
const LIT = String.raw`(['"\`])((?:\\.|(?!\1)[^\\])*?)\1`;
for (const f of readdirSync(join(root, 'src'))) {
  if (!f.endsWith('.js') || f === 'i18n.js') continue; // (its comments hold examples)
  const src = readFileSync(join(root, 'src', f), 'utf8');
  // t('a') and t(cond ? 'a' : 'b')
  const re = new RegExp(String.raw`\bt\(\s*(?:[^'"\`()?]*\?\s*)?` + LIT + String.raw`(?:\s*:\s*` + LIT.replace('\\1', '\\3') + ')?', 'g');
  for (const m of src.matchAll(re)) {
    if (m[1] === '`' && m[2].includes('${')) continue;
    add(unquote(m[1], m[2]), f); coded.add(unquote(m[1], m[2]));
    if (m[4] !== undefined && !(m[3] === '`' && m[4].includes('${'))) { add(unquote(m[3], m[4]), f); coded.add(unquote(m[3], m[4])); }
  }
}
// static text marked in the page
for (const m of readFileSync(join(root, 'index.html'), 'utf8').matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)) add(m[1], 'index.html');

// 2. story and data text (shown through t() at the display site)
const FIELDS = new Set(['name', 'text', 'desc', 'blurb', 'title', 'label', 'fx', 'reply', 'trains', 'tip', 'rule', 'round', 'sub', 'hint', 'line', 'short', 'say', 'style', 'trait']);
const LIST_FIELDS = new Set(['levels']); // lists of display lines
const SKIP_NAMES = new Set(['GOALIE', 'CLUB', 'CLUB_DEFAULT', 'NPC_NAMES', 'PALETTES']); // (people's and team names are removed below)
function walk(v, path, where, depth = 0) {
  if (v == null || depth > 7) return;
  if (Array.isArray(v)) {
    // dialogue lines: [side, speaker, text]
    if (v.length >= 3 && (v[0] === 'us' || v[0] === 'them' || v[0] === 'kip') && typeof v[2] === 'string') { add(v[2], where); return; }
    v.forEach((x, i) => walk(x, path.concat(i), where, depth + 1));
    return;
  }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'string') { if (FIELDS.has(k)) add(x, `${where}:${path.concat(k).join('.')}`); }
      else if (Array.isArray(x) && LIST_FIELDS.has(k) && x.every((y) => typeof y === 'string')) x.forEach((y) => add(y, `${where}:${path.concat(k).join('.')}`));
      else if (typeof x !== 'function') walk(x, path.concat(k), where, depth + 1);
    }
  }
}
const modules = ['data.js', 'facilities.js', 'press.js', 'records.js', 'achievements.js', 'awards.js', 'drills.js', 'daily.js', 'lockerroom.js', 'guide.js', 'online.js', 'songs.js', 'skills.js', 'draft.js', 'legends.js', 'agents.js', 'whatsnew.js', 'goals.js', 'decor.js'];
for (const f of modules) {
  const mod = await import(join(root, 'src', f));
  for (const [name, v] of Object.entries(mod)) {
    if (SKIP_NAMES.has(name) || typeof v === 'function') continue;
    walk(v, [name], f);
  }
}
// plain maps and lists of display text
const STRING_MAPS = { 'data.js': ['STAT_NAMES', 'STAT_HINT', 'TWIST_INFO', 'ROOKIE_TITLE', 'AGENT_TITLE', 'OWN_TITLE', 'MASK_NAMES'], 'create.js': ['OWN_TEXT'], 'drills.js': ['MEDAL_NAMES'], 'draft.js': ['POTENTIAL_GRADE', 'SCOUTING'], 'agents.js': ['PITCH'], 'decor.js': ['SLOT_NAMES'], 'fancam.js': ['CROWD_SIGNS'] };
for (const [f, names] of Object.entries(STRING_MAPS)) {
  const mod = await import(join(root, 'src', f));
  for (const n of names) for (const v of Object.values(mod[n] || {})) [].concat(v).forEach((x) => add(x, `${f}:${n}`));
}
const uiSrc = readFileSync(join(root, 'src', 'ui.js'), 'utf8');
// display text in the screens' own constant tables (hub stations and the like)
for (const f of ['ui.js', 'hud.js', 'main.js']) {
  const src = readFileSync(join(root, 'src', f), 'utf8');
  for (const m of src.matchAll(/\b(label|tip|title|hint):\s*'((?:\\.|[^'\\])+)'/g)) add(m[2].replace(/\\'/g, "'"), `${f}:${m[1]}`);
}
for (const name of ['ROLE_NAME', 'SLOT_NAMES', 'NPC_NAMES', 'CEL_NAMES']) {
  const map = new RegExp(`const ${name} = \\{([^}]*)\\}`).exec(uiSrc);
  if (map) for (const m of map[1].matchAll(/:\s*'([^']+)'/g)) add(m[1], `ui.js:${name}`);
}
// reasons and labels the match engine sends out, translated where they're shown
const matchSrc = readFileSync(join(root, 'src', 'match.js'), 'utf8');
for (const m of matchSrc.matchAll(/reason(?::|\s*=)\s*'([^']+)'/g)) add(m[1], 'match.js:reason');
for (const r of ['Semifinal', 'Final', 'Cup Final', 'Quarterfinal', 'Group Stage', 'Exhibition', 'Versus', 'Daily challenge', 'Shootout', 'League · round {n}']) add(r, 'round names');
// people's names in data stay as they are
const data = await import(join(root, 'src', 'data.js'));
const people = new Set();
for (const c of Object.values(data.CHARACTERS || {})) people.add(c.name);
for (const r of Object.values(data.RECRUITS || {})) people.add(r.name);
for (const l of Object.values(data.LEGENDS || {})) people.add(l.name);
for (const ar of Object.values(data.ARENAS || {})) people.add(ar.name);
for (const tm of Object.values(data.TEAMS || {})) { people.add(tm.name); people.add(tm.short); for (const n of Object.values(tm.names || {})) people.add(n); for (const n of Object.values(tm.subs || {})) people.add(n); }
for (const p of people) if (!coded.has(p)) keys.delete(p);
// the INTRO dialogue in main.js
const main = readFileSync(join(root, 'src', 'main.js'), 'utf8');
for (const m of main.matchAll(/\[\s*'(?:us|them)'\s*,\s*'[a-z_]+'\s*,\s*'((?:\\.|[^'\\])*)'\s*\]/g)) add(m[1].replace(/\\'/g, "'"), 'main.js:INTRO');

// character perks: 'Name: what it does', split on the colon where they're shown
const perkKeys = new Set();
for (const c of Object.values(data.CHARACTERS || {})) for (const opts of c.perks || []) for (const p of opts) { perkKeys.add(p); add(p, 'data.js:perks'); }
for (const e of Object.values(data.ELEMENTS || {})) for (const opts of e.perks || []) for (const p of opts) { perkKeys.add(p); add(p, 'data.js:perks'); }
for (const a of Object.values(data.ARCHETYPES || {})) for (const p of a.perks || []) { perkKeys.add(p); add(p, 'data.js:perks'); }

// 3. compare with the catalogue
const cat = (await import(join(root, 'src', 'lang', `${lang}.js`)))[lang.toUpperCase()];
const missing = [...keys.keys()].filter((k) => !cat[k]);
const unused = Object.keys(cat).filter((k) => !keys.has(k));
const badParams = Object.entries(cat).filter(([k, v]) => {
  const ps = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  return keys.has(k) && ps(k) !== ps(v);
});
// quotes would break the attributes some text is placed in
const shapeIssues = [];
for (const [k, v] of Object.entries(cat)) {
  if (perkKeys.has(k) && v.split(':').length !== 2) shapeIssues.push(`perk needs exactly one colon: ${JSON.stringify(v)}`);
  if (v.includes('"')) shapeIssues.push(`straight double quote (use „…“): ${JSON.stringify(v)}`);
}
for (const x of shapeIssues) console.log('  ' + x);
console.log(`${keys.size} strings · ${lang}: ${keys.size - missing.length} translated, ${missing.length} missing, ${unused.length} unused, ${badParams.length} with mismatched {placeholders}`);
for (const [k, v] of badParams) console.log(`  placeholders differ: ${JSON.stringify(k)} -> ${JSON.stringify(v)}`);
if (process.argv.includes('--unused')) for (const k of unused) console.log('  unused:', JSON.stringify(k));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(missing.map((k) => ({ en: k, where: keys.get(k) })), null, 1));
process.exit(badParams.length || shapeIssues.length ? 1 : 0);
