// Builds dist/glacial-strikers-offline.html: one self-contained file with every script,
// style, font and image embedded. Double-click it to play with no server or internet.
//   node tools/build_offline.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const b64 = (p) => readFileSync(join(root, p)).toString('base64');

// ---- bundle the ES modules into one classic script
const modules = new Map(); // path -> { code, deps: [{ path, names: [[from, to]] }], exports: [[local, exported]] }
function load(path) {
  if (modules.has(path)) return;
  let code = read(path);
  const deps = [];
  code = code.replace(/import\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?/g, (_, names, from) => {
    const dep = normalize(join(dirname(path), from));
    deps.push({ path: dep, names: names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => { const [a, b] = n.split(/\s+as\s+/); return [a.trim(), (b || a).trim()]; }) });
    return '';
  });
  if (/^\s*import\s/m.test(code)) throw new Error(`Unsupported import form in ${path}`);
  const exports = [];
  code = code.replace(/export\s*\{([^}]*)\};?/g, (_, names) => {
    for (const n of names.split(',').map((x) => x.trim()).filter(Boolean)) { const [a, b] = n.split(/\s+as\s+/); exports.push([a.trim(), (b || a).trim()]); }
    return '';
  });
  code = code.replace(/export\s+((?:async\s+)?(?:function\*?|class|const|let|var))\s+([A-Za-z_$][\w$]*)/g, (_, kind, name) => { exports.push([name, name]); return `${kind} ${name}`; });
  if (/\bexport\s/.test(code)) throw new Error(`Unsupported export form in ${path}`);
  modules.set(path, { code, deps, exports });
  for (const d of deps) load(d.path);
}
load('src/main.js');

// dependencies first
const order = [], state = new Map();
function visit(p) {
  if (state.get(p) === 'done') return;
  if (state.get(p) === 'busy') throw new Error(`Import cycle at ${p}`);
  state.set(p, 'busy');
  for (const d of modules.get(p).deps) visit(d.path);
  state.set(p, 'done');
  order.push(p);
}
visit('src/main.js');

let bundle = '(() => {\n"use strict";\nconst __m = {};\n';
for (const p of order) {
  const m = modules.get(p);
  const imports = m.deps.map((d) => `const { ${d.names.map(([a, b]) => (a === b ? a : `${a}: ${b}`)).join(', ')} } = __m[${JSON.stringify(d.path)}];`).join('\n');
  bundle += `// ---- ${p}\n__m[${JSON.stringify(p)}] = (() => {\n${imports}\n${m.code}\nreturn { ${m.exports.map(([a, b]) => (a === b ? a : `${b}: ${a}`)).join(', ')} };\n})();\n`;
}
bundle += '})();\n';
// guard against a stray closing script tag inside the bundle
bundle = bundle.replace(/<\/script/gi, '<\\/script');

// ---- styles with fonts inlined
const fonts = read('src/fonts.css').replace(/url\(\.\.\/assets\/fonts\/([^)]+)\)/g, (_, f) => `url(data:font/woff2;base64,${b64('assets/fonts/' + f)})`);
const styles = read('src/styles.css');

// ---- art
const atlas = JSON.parse(read('assets/gfx/atlas.json'));
const inline = { 'gfx/atlas.json': atlas };
for (const f of [...atlas.pages.map((p) => p.file), 'gfx/rink_backdrop.webp']) inline[f] = `data:image/webp;base64,${b64('assets/' + f)}`;

// ---- page
let html = read('index.html');
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="data:image/png;base64,${b64('assets/icons/favicon-32.png')}">`)
  .replace(/<link rel="stylesheet" href="src\/fonts.css">\n?/, `<style>\n${fonts}\n</style>\n`)
  .replace(/<link rel="stylesheet" href="src\/styles.css">/, `<style>\n${styles}\n</style>`)
  .replace(/<script type="module" src="src\/main.js"><\/script>/, `<script>window.__INLINE = ${JSON.stringify(inline)};</script>\n<script>\n${bundle}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist/glacial-strikers-offline.html');
writeFileSync(out, html);
console.log(`dist/glacial-strikers-offline.html  ${(html.length / 1e6).toFixed(2)} MB  (${order.length} modules)`);
