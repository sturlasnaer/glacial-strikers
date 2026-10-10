// Every page the atlas names is on disk, and every frame sits on a page and inside it: an import
// that renamed a page without updating the atlas (or the other way round) shows up here, not as
// art missing in the game.
//   node tools/test_atlas_pages.mjs
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../assets/', import.meta.url);
const A = JSON.parse(readFileSync(new URL('gfx/atlas.json', root)));
let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };

const missing = A.pages.filter((p) => !existsSync(new URL(p.file, root))).map((p) => p.file);
check('every page is on disk', !missing.length, missing);
check('every page has a group and a size', A.pages.every((p) => p.group && p.w > 0 && p.h > 0), A.pages.filter((p) => !(p.group && p.w > 0 && p.h > 0)));
const bad = Object.entries(A.frames).filter(([, f]) => { const p = A.pages[f[0]]; return !p || f[1] < 0 || f[2] < 0 || f[1] + f[3] > p.w || f[2] + f[4] > p.h; }).map(([id]) => id);
check('every frame is on a page, inside it', !bad.length, bad.slice(0, 10));

console.log(`Atlas pages: ${pass} passed, ${fail} failed (${A.pages.length} pages, ${Object.keys(A.frames).length} frames)`);
process.exit(fail ? 1 : 0);
