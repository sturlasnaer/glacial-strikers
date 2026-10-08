// Players from parts (Batch AJ): a body drawn without a head, and a head that sits on the
// body's anchor for each frame, with skin and hair recoloured through the head's mask. A
// player's look is a small recipe kept in the save:
//   { body: 'std', head: 'braids', skin: 2, hair: 5 }
// The atlas (built by the merge script) gives the body a skater set like any other
// (`skaters.body_<id>`), and a `modular` section:
//   anchors: { <body frame id>: { x, y, view: 's'|'se'|'e'|'ne'|'n', rot, state, flip_head?, hide_head?, front? } }
//   (flip_head: the head view is drawn facing the other way on this frame; it combines with
//   the body's own mirroring)
//   heads:   { <name>: { <view>: { normal: <frame id>, effort: <frame id> } } }
//   masks:   { <head or face frame id>: <mask frame id> }  (red = skin, green = hair)
//   portraits: { body: <frame id>, anchor: { x, y }, faces: { <name>: { <expression>: <frame id> } } }
// The art's pages are the 'parts' page group, kept and recoloured into our kit while anyone
// on the roster is made from parts. Until the art is in, nobody has parts.

export const SKIN_TONES = ['#f8d8bf', '#eab993', '#cf9469', '#a76c45', '#7c4b2c', '#55331f'];
export const HAIR_COLORS = ['#2a211e', '#5b3a24', '#8b5a32', '#c88d46', '#e6c77d', '#b9b2a8', '#b9502f', '#1f3550'];

// What the game has to build players from (set from the atlas at start).
export const MODULAR = { bodies: [], heads: [] };
export function useModular(atlas) {
  const m = atlas && atlas.modular;
  MODULAR.bodies = m ? Object.keys(atlas.skaters || {}).filter((k) => k.startsWith('body_')).map((k) => k.slice(5)) : [];
  MODULAR.heads = m && m.heads ? Object.keys(m.heads) : [];
  return MODULAR.bodies.length > 0 && MODULAR.heads.length > 0;
}

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)];

// A new look from the parts there are (null without them).
export function randomLook(rnd = Math.random) {
  if (!MODULAR.bodies.length || !MODULAR.heads.length) return null;
  return { body: pick(MODULAR.bodies, rnd), head: pick(MODULAR.heads, rnd), skin: Math.floor(rnd() * SKIN_TONES.length), hair: Math.floor(rnd() * HAIR_COLORS.length) };
}

// The same look every time for an id (players who came before the parts did).
export function lookFor(id) {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let seed = h >>> 0;
  return randomLook(() => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0) / 4294967296));
}

// The sprite set for a look's body.
export const bodySprite = (look) => (look && MODULAR.bodies.includes(look.body) ? 'body_' + look.body : null);

// Recolour skin and hair in a head's pixels through its mask, keeping the drawn shading:
// each part's own middle brightness maps to the new colour, lighter and darker pixels follow.
export function recolorParts(d, md, look) {
  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const parts = [[0, rgb(SKIN_TONES[look.skin] || SKIN_TONES[2])], [1, rgb(HAIR_COLORS[look.hair] || HAIR_COLORS[1])]];
  const lum = (i) => (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
  for (const [ch, col] of parts) {
    const ls = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 10 && md[i + 3] > 127 && md[i + ch] > 127 && md[i + (1 - ch)] <= 127) ls.push(lum(i));
    if (!ls.length) continue;
    ls.sort((a, b) => a - b);
    const mid = ls[ls.length >> 1] || 0.5;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] <= 10 || md[i + 3] <= 127 || md[i + ch] <= 127 || md[i + (1 - ch)] > 127) continue;
      const k = Math.min(1.35, Math.max(0.25, lum(i) / mid));
      d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k);
    }
  }
  return d;
}

// Where the head goes for a body frame drawn at (x, y) at scale k (pivot px, py), mirrored or
// not: the screen point, the head frame to use, whether to mirror it, and its rotation.
export function headPlacement(modular, look, frameId, f, x, y, k, flip) {
  const a = modular.anchors && modular.anchors[frameId];
  if (a && a.hide_head) return null; // (inside a jersey being pulled on)
  const views = a && modular.heads[look.head];
  if (!views) return null;
  const view = views[a.view] || views.s;
  const head = view && (view[a.state] || view.normal);
  if (!head) return null;
  const px = f[5], py = f[6], s = f[7] || 1;
  const dx = (a.x - px) * (k / s), dy = (a.y - py) * (k / s);
  return { x: x + (flip ? -dx : dx), y: y + dy, head, flip: !!a.flip_head !== !!flip, rot: ((a.rot || 0) * Math.PI / 180) * (flip ? -1 : 1), front: a.front || null };
}
