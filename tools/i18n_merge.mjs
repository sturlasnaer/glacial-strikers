// Merge translations (JSON objects of English -> translation) into a catalogue.
//   node tools/i18n_merge.mjs is a.json b.json [--replace]
// Existing entries are kept unless --replace. The catalogue is rewritten sorted by key.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const [lang, ...rest] = process.argv.slice(2);
const replace = rest.includes('--replace');
const files = rest.filter((f) => !f.startsWith('--'));
const root = new URL('..', import.meta.url).pathname;
const path = join(root, 'src', 'lang', `${lang}.js`);
const NAME = lang.toUpperCase();
const cat = { ...(await import(path))[NAME] };
let added = 0, changed = 0;
for (const f of files) {
  for (const [en, tr] of Object.entries(JSON.parse(readFileSync(f, 'utf8')))) {
    if (typeof tr !== 'string' || !tr.trim()) continue;
    if (!(en in cat)) { cat[en] = tr; added++; } else if (replace && cat[en] !== tr) { cat[en] = tr; changed++; }
  }
}
const head = readFileSync(path, 'utf8').split(`export const ${NAME} = {`)[0];
const body = Object.keys(cat).sort((a, b) => a.localeCompare(b, 'en')).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(cat[k])},`).join('\n');
writeFileSync(path, `${head}export const ${NAME} = {\n${body}\n};\n`);
console.log(`${lang}: ${Object.keys(cat).length} entries (${added} added, ${changed} replaced)`);
