#!/usr/bin/env python3
"""Slice the Glacial Strikers source sheets into compact WebP atlases for the game.

Usage: python tools/build_assets.py <path-to-sprite-pack> <output-dir>

- Crops every frame the game uses, downscales it per category (premultiplied alpha),
  trims empty margins, recomputes foot pivots for skaters/goalies, and shelf-packs the
  results into atlas pages. Away-team art is packed on its own pages so rival teams can
  be recoloured at runtime without touching the home team.
- Writes atlas.json with frame rects, pivots and the skater direction mappings.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

PACK = sys.argv[1] if len(sys.argv) > 1 else '../assets/Glacial-Strikers-Sprite-Pack'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/gfx'

# Atlas pixels per source pixel, by sheet. Picked so each sprite is close to its
# on-screen size on a 2x phone screen while keeping the download small.
SCALE = {
    'frost_captain': 0.6, 'frost_captain_variant': 0.6, 'thunder_winger': 0.6,
    'stone_defender': 0.6, 'goalies': 0.5, 'power_pucks': 0.3,
    'ability_effects': 0.5, 'equipment_items': 0.5, 'rink_props': 0.5,
    'hud_elements': 0.45, 'character_portraits': 0.6,
}
FOOT_PIVOT_SHEETS = {'frost_captain', 'frost_captain_variant', 'thunder_winger', 'stone_defender', 'goalies'}
PAGE = 2048
PAD = 2

src = json.load(open(os.path.join(PACK, 'atlas.json')))
frames = src['frames']

# Frames referenced by the skater direction mappings; other skater rows are alternates.
used_skater = set()
for char in src['skaters'].values():
    for team in char.values():
        for d in team.values():
            used_skater.update(d['frames'].values())

sheets = {}

def sheet(name):
    if name not in sheets:
        sheets[name] = Image.open(os.path.join(PACK, 'sheets', name + '.png')).convert('RGBA')
    return sheets[name]


def is_away(fid):
    return '/away' in fid or fid.startswith('character_portraits/away')


def foot_pivot(img):
    """Body-centre x from the torso band, and the lowest opaque row near that x."""
    a = np.array(img)[..., 3]
    h, w = a.shape
    band = a[int(h * 0.25):int(h * 0.7)]
    ys, xs = np.nonzero(band > 128)
    if len(xs) == 0:
        return w / 2, h - 1
    cx = float(np.median(xs))
    lo, hi = int(max(0, cx - w * 0.22)), int(min(w, cx + w * 0.22))
    rows = np.nonzero((a[:, lo:hi] > 128).any(axis=1))[0]
    py = float(rows.max()) if len(rows) else h - 1
    return cx, py


items = []
for fid, f in frames.items():
    sh = f['sheet']
    if sh == 'rink_backdrop':
        continue
    if sh in ('frost_captain', 'frost_captain_variant', 'thunder_winger', 'stone_defender') and fid not in used_skater:
        continue
    r = f['frame']
    img = sheet(sh).crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
    s = SCALE[sh]
    nw, nh = max(1, round(r['w'] * s)), max(1, round(r['h'] * s))
    img = img.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA')
    if sh in FOOT_PIVOT_SHEETS:
        px, py = foot_pivot(img)
    else:
        px, py = f['pivot_pixels']['x'] * s, f['pivot_pixels']['y'] * s
    # trim fully transparent margins (keep 1px)
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a > 6)
    if len(xs):
        x0, y0 = max(0, xs.min() - 1), max(0, ys.min() - 1)
        x1, y1 = min(nw, xs.max() + 2), min(nh, ys.max() + 2)
        img = img.crop((x0, y0, x1, y1))
        px -= x0
        py -= y0
    items.append({'id': fid, 'img': img, 'px': round(px, 1), 'py': round(py, 1), 'scale': s,
                  'group': 'away' if is_away(fid) else 'home'})

out_frames = {}
pages = []
for group in ('home', 'away'):
    group_items = sorted([i for i in items if i['group'] == group], key=lambda i: -i['img'].height)
    page_imgs = []
    cur = None
    x = y = shelf_h = 0
    for it in group_items:
        w, h = it['img'].size
        if cur is None or x + w + PAD > PAGE:
            x = 0
            y += shelf_h + PAD if cur is not None else 0
            shelf_h = 0
        if cur is None or y + h + PAD > PAGE:
            cur = Image.new('RGBA', (PAGE, PAGE), (0, 0, 0, 0))
            page_imgs.append(cur)
            x = y = shelf_h = 0
        cur.paste(it['img'], (x + PAD, y + PAD))
        it['rect'] = (len(pages) + len(page_imgs) - 1, x + PAD, y + PAD, w, h)
        x += w + PAD
        shelf_h = max(shelf_h, h + PAD)
    for idx, p in enumerate(page_imgs):
        # crop unused bottom of the page
        a = np.array(p)[..., 3]
        rows = np.nonzero(a.any(axis=1))[0]
        p = p.crop((0, 0, PAGE, int(rows.max()) + PAD + 1))
        name = f'{group}_{idx}.webp'
        p.save(os.path.join(OUT, name), 'WEBP', quality=92, method=6, alpha_quality=100)
        pages.append({'file': 'gfx/' + name, 'group': group, 'w': p.width, 'h': p.height})
    for it in group_items:
        pi, fx, fy, fw, fh = it['rect']
        out_frames[it['id']] = [pi, fx, fy, fw, fh, it['px'], it['py'], it['scale']]

# Backdrop: opaque WebP at source resolution.
Image.open(os.path.join(PACK, 'sheets', 'rink_backdrop.png')).convert('RGB').save(
    os.path.join(OUT, 'rink_backdrop.webp'), 'WEBP', quality=90, method=6)

atlas = {
    'pages': pages,
    'frames': out_frames,
    'skaters': src['skaters'],
}
with open(os.path.join(OUT, 'atlas.json'), 'w') as fh:
    json.dump(atlas, fh, separators=(',', ':'))

total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f'{len(out_frames)} frames on {len(pages)} pages; {total/1e6:.2f} MB total')
for p in pages:
    print('  ', p)
