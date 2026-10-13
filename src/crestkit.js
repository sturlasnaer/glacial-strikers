// The crest generator (the club editor's "Design your own"): a shield, a pattern, an emblem and a
// ribbon with the short code, all in the club's colours. The shields, patterns, ribbon and the
// simple emblems are drawn here, pixel by pixel at 60 px and doubled, to sit with the painted art;
// Batch FC's crest kit takes over each part once it's in (art(id): that frame in the club's
// colours, or null).

export const CREST_SHIELDS = ['classic', 'round', 'hex', 'banner', 'diamond', 'square'];
export const CREST_PATTERNS = ['plain', 'stripes', 'chevron', 'halves', 'quarters', 'sash', 'hoops'];
export const CREST_SYMBOLS = ['letter', 'star', 'snowflake', 'puck']; // (drawn here, or Batch FC's where it has them)
export const CREST_ART_EMBLEMS = ['fox', 'wolf', 'bear', 'owl', 'narwhal', 'mountain', 'bolt', 'stick_puck', 'crown', 'pine', 'flame', 'wave', 'anchor', 'moose', 'skate']; // (Batch FC)
export const KIT_DEFAULT = { shield: 'classic', pattern: 'plain', emblem: 'letter', ribbon: true };
// The emblems to offer: the drawn ones, and the kit's once their art is in (has: frame exists?).
export const crestEmblems = (has) => [...CREST_SYMBOLS, ...CREST_ART_EMBLEMS.filter((e) => has('crest_kit/emblem/' + e))];

const N = 60, S = 120, NAVY = [20, 35, 59];
const hex = (h) => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
const luma = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
const canvas = (n) => { const c = document.createElement('canvas'); c.width = n; c.height = n; return c; };

// A shape as a hard-edged mask: true inside.
function mask(draw) {
  const c = canvas(N), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath(); draw(x); x.fill();
  const d = x.getImageData(0, 0, N, N).data, m = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}
const erode = (m, r) => {
  const o = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let all = m[y * N + x];
    for (let dy = -r; all && dy <= r; dy++) for (let dx = -r; all && dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= N || Y >= N || !m[Y * N + X]) all = 0;
    }
    o[y * N + x] = all;
  }
  return o;
};
const dilate = (m, r) => { // (inside, or within r of inside; the canvas's edge isn't inside)
  const o = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let any = 0;
    for (let dy = -r; !any && dy <= r; dy++) for (let dx = -r; !any && dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < N && Y < N && m[Y * N + X]) any = 1;
    }
    o[y * N + x] = any;
  }
  return o;
};

const SHIELDS = {
  classic: (x) => { x.moveTo(6, 4); x.lineTo(54, 4); x.lineTo(54, 28); x.bezierCurveTo(54, 44, 42, 52, 30, 57); x.bezierCurveTo(18, 52, 6, 44, 6, 28); x.closePath(); },
  round: (x) => { x.arc(30, 30, 26.5, 0, Math.PI * 2); },
  hex: (x) => { for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; x[i ? 'lineTo' : 'moveTo'](30 + Math.cos(a) * 27.5, 30 + Math.sin(a) * 27.5); } x.closePath(); },
  banner: (x) => { x.moveTo(8, 4); x.lineTo(52, 4); x.lineTo(52, 56); x.lineTo(30, 45); x.lineTo(8, 56); x.closePath(); },
  diamond: (x) => { x.moveTo(30, 2); x.lineTo(58, 30); x.lineTo(30, 58); x.lineTo(2, 30); x.closePath(); },
  square: (x) => { x.roundRect ? x.roundRect(5, 5, 50, 50, 9) : x.rect(5, 5, 50, 50); },
};
const PATTERNS = {
  plain: null,
  stripes: (x) => { x.rect(18, 0, 7, N); x.rect(35, 0, 7, N); },
  chevron: (x) => { x.moveTo(0, 20); x.lineTo(30, 36); x.lineTo(60, 20); x.lineTo(60, 30); x.lineTo(30, 46); x.lineTo(0, 30); x.closePath(); },
  halves: (x) => { x.rect(0, 0, 30, N); },
  quarters: (x) => { x.rect(0, 0, 30, 30); x.rect(30, 30, 30, 30); },
  sash: (x) => { x.moveTo(0, 6); x.lineTo(6, 0); x.lineTo(60, 54); x.lineTo(54, 60); x.closePath(); },
  hoops: (x) => { x.rect(0, 16, N, 7); x.rect(0, 34, N, 7); },
};

// The drawn emblems, centred on (cx, cy) about r across, in colour c with a navy outline.
function symbol(kind, x, cx, cy, r, c, letter) {
  const fill = `rgb(${c})`, edge = `rgb(${NAVY})`;
  if (kind === 'letter') {
    x.font = `${Math.round(r * 1.25)}px "Jersey 10", "Pixelify Sans", ui-monospace, monospace`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = edge;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) x.fillText(letter, cx + dx, cy + dy + 1);
    x.fillStyle = fill; x.fillText(letter, cx, cy + 1);
    return;
  }
  const path = () => {
    x.beginPath();
    if (kind === 'star') for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.closePath();
  };
  if (kind === 'star') { x.fillStyle = edge; x.save(); x.translate(0, 1); path(); x.fill(); x.restore(); x.lineWidth = 2; x.strokeStyle = edge; path(); x.stroke(); x.fillStyle = fill; path(); x.fill(); return; }
  if (kind === 'snowflake') {
    const arm = (w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'square';
      for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3, dx = Math.cos(a) * r, dy = Math.sin(a) * r; x.beginPath(); x.moveTo(cx - dx, cy - dy); x.lineTo(cx + dx, cy + dy); x.stroke(); }
      for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3, bx = cx + Math.cos(a) * r * 0.6, by = cy + Math.sin(a) * r * 0.6;
        for (const s of [-1, 1]) { const b = a + s * 0.7; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(b) * r * 0.35, by + Math.sin(b) * r * 0.35); x.stroke(); } } };
    arm(5, edge); arm(2.5, fill);
    return;
  }
  if (kind === 'puck') { // two crossed sticks and a puck
    const stick = (s, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(cx - s * r, cy - r); x.lineTo(cx + s * r * 0.55, cy + r * 0.6); x.lineTo(cx + s * r * 0.95, cy + r * 0.6); x.stroke(); };
    for (const s of [-1, 1]) stick(s, edge, 5);
    for (const s of [-1, 1]) stick(s, fill, 2.5);
    x.fillStyle = edge; x.beginPath(); x.ellipse(cx, cy + r * 0.62, r * 0.5, r * 0.26, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgb(60,70,90)'; x.beginPath(); x.ellipse(cx, cy + r * 0.55, r * 0.38, r * 0.16, 0, 0, Math.PI * 2); x.fill();
  }
}

// The crest, S px square. kit: { shield, pattern, emblem, ribbon }; col: { trim, jersey } (hex);
// opts: { short (the ribbon's letters), letter (the letter emblem), art(id) }.
export function drawCrest(kit, col, opts = {}) {
  const k = { ...KIT_DEFAULT, ...(kit || {}) }, art = opts.art || (() => null);
  const T = hex(col.trim), J = hex(col.jersey);
  const out = canvas(S), o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  const shieldArt = art('crest_kit/shield/' + k.shield);
  // the shield and its pattern (drawn: filled with the jersey, the pattern in the trim inside a
  // trim rim, a darker line inside the rim and a navy outline; or Batch FC's, the pattern laid in)
  if (shieldArt) {
    o.drawImage(shieldArt, 0, 0, S, S);
    const pa = k.pattern !== 'plain' && (art('crest_kit/pattern/' + k.pattern) || patternLayer(k.pattern, T, null));
    if (pa) {
      // Clip to the native shield's solid interior, leaving its painted rim visible. Native
      // cutout margins can contain faint alpha, which must not admit pattern pixels.
      const lo = canvas(N), lx = lo.getContext('2d');
      lx.imageSmoothingEnabled = false; lx.drawImage(shieldArt, 0, 0, N, N);
      const d = lx.getImageData(0, 0, N, N), m = new Uint8Array(N * N);
      for (let i = 0; i < m.length; i++) m[i] = d.data[i * 4 + 3] >= 128 ? 1 : 0;
      const inside = erode(m, 3);
      for (let i = 0; i < inside.length; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = inside[i] ? 255 : 0; }
      lx.putImageData(d, 0, 0);
      const layer = canvas(S), px = layer.getContext('2d'); px.imageSmoothingEnabled = false;
      px.drawImage(lo, 0, 0, S, S); px.globalCompositeOperation = 'source-in';
      px.drawImage(pa, S * 0.08, S * 0.08, S * 0.84, S * 0.84);
      o.drawImage(layer, 0, 0);
    }
  } else {
    const { m, inner, deep, rim } = shieldMasks(k.shield);
    const pat = PATTERNS[k.pattern] ? cached('p:' + k.pattern, () => mask(PATTERNS[k.pattern])) : null;
    const lo = canvas(N), lx = lo.getContext('2d'), img = lx.createImageData(N, N), d = img.data;
    const dark = shade(J, luma(J) > 0.5 ? 0.82 : 1.35), trimDark = shade(T, 0.8);
    for (let i = 0; i < N * N; i++) {
      let c = null;
      if (m[i]) c = !inner[i] ? (i % N < 30 || (i / N | 0) < 8 ? T : trimDark) : pat && pat[i] ? T : !deep[i] ? dark : J;
      else if (rim[i]) c = NAVY;
      if (c) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
    }
    lx.putImageData(img, 0, 0);
    o.drawImage(lo, 0, 0, S, S);
  }
  // the emblem: Batch FC's, or one drawn here (light on a dark jersey, the trim on a light one)
  const ribbon = k.ribbon && opts.short;
  const cy = ribbon ? 0.43 : 0.5, size = ribbon ? 0.46 : 0.54;
  const em = art('crest_kit/emblem/' + k.emblem);
  if (em) {
    const w = em.width, h = em.height, f = (S * size) / Math.max(w, h);
    o.drawImage(em, S / 2 - (w * f) / 2, S * cy - (h * f) / 2, w * f, h * f);
  } else if (CREST_SYMBOLS.includes(k.emblem)) {
    const lo = canvas(N), lx = lo.getContext('2d');
    const ink = luma(J) > 0.72 ? (luma(T) > 0.72 ? NAVY : T) : [255, 246, 224];
    symbol(k.emblem, lx, N / 2, N * cy, (N * size) / 2, ink, (opts.letter || 'A').slice(0, 1).toUpperCase());
    hard(lx);
    o.drawImage(lo, 0, 0, S, S);
  }
  // the ribbon with the short code
  if (ribbon) {
    const ra = art('crest_kit/ribbon');
    if (ra) o.drawImage(ra, S * 0.04, S * 0.62, S * 0.92, S * 0.24);
    else {
      const lo = canvas(N), lx = lo.getContext('2d');
      lx.fillStyle = `rgb(${NAVY})`; lx.fillRect(5, 39, 50, 13); lx.fillRect(2, 42, 3, 9); lx.fillRect(55, 42, 3, 9);
      lx.fillStyle = `rgb(${T})`; lx.fillRect(6, 40, 48, 11); lx.fillStyle = `rgb(${shade(T, 0.75)})`; lx.fillRect(3, 43, 2, 7); lx.fillRect(55, 43, 2, 7);
      o.drawImage(lo, 0, 0, S, S);
    }
    const tx = canvas(S), tc = tx.getContext('2d');
    tc.font = '22px "Jersey 10", "Pixelify Sans", ui-monospace, monospace'; tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.fillStyle = luma(T) > 0.6 || ra ? `rgb(${NAVY})` : 'rgb(255,246,224)';
    tc.fillText(String(opts.short).slice(0, 3).toUpperCase(), S / 2, S * 0.758);
    o.drawImage(tx, 0, 0);
  }
  return out;
}
// The shapes never change: their masks are worked out once (the editor previews thirty at a time).
const CACHE = new Map();
const cached = (key, make) => { if (!CACHE.has(key)) CACHE.set(key, make()); return CACHE.get(key); };
const shieldMasks = (id) => cached('s:' + id, () => { const m = mask(SHIELDS[id] || SHIELDS.classic); return { m, inner: erode(m, 3), deep: erode(m, 4), rim: dilate(m, 1) }; });
// (a drawn pattern on its own, for Batch FC's shields)
function patternLayer(kind, T) {
  if (!PATTERNS[kind]) return null;
  const m = cached('p:' + kind, () => mask(PATTERNS[kind])), c = canvas(N), x = c.getContext('2d'), img = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) if (m[i]) { img.data[i * 4] = T[0]; img.data[i * 4 + 1] = T[1]; img.data[i * 4 + 2] = T[2]; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
}
// hard edges: no half-transparent pixels (pixel art)
function hard(x) {
  const d = x.getImageData(0, 0, N, N);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 110 ? 255 : 0;
  x.putImageData(d, 0, 0);
}
