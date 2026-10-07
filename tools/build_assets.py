#!/usr/bin/env python3
"""Slice the Glacial Strikers source sheets into compact WebP atlases for the game.

Usage: python tools/build_assets.py <path-to-sprite-pack> <output-dir> [<expansion-pack> ...]

- Crops every frame the game uses, downscales it per category (premultiplied alpha),
  trims empty margins, recomputes foot pivots for skaters/goalies, and shelf-packs the
  results into atlas pages. Away-team art is packed on its own pages so rival teams can
  be recoloured at runtime without touching the home team.
- Writes atlas.json with frame rects, pivots and the skater direction mappings.
- Expansion packs (P1 gameplay: diagonals, strides, hit reactions, side goalies, ice
  spray) are rescaled to match the v1 characters and merged into the same atlas.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

PACK = sys.argv[1] if len(sys.argv) > 1 else '../assets/Glacial-Strikers-Sprite-Pack'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/gfx'
EXTRA = sys.argv[3:] if len(sys.argv) > 3 else ['../assets/Glacial-Strikers-P1-Gameplay']

# Atlas pixels per source pixel, by sheet. Picked so each sprite is close to its
# on-screen size on a 2x phone screen while keeping the download small.
SCALE = {
    'frost_captain': 0.6, 'frost_captain_variant': 0.6, 'thunder_winger': 0.6,
    'stone_defender': 0.6, 'goalies': 0.5, 'power_pucks': 0.3,
    'ability_effects': 0.5, 'equipment_items': 0.5, 'rink_props': 0.5,
    'hud_elements': 0.45, 'character_portraits': 0.6,
}
FOOT_PIVOT_SHEETS = {'frost_captain', 'frost_captain_variant', 'thunder_winger', 'stone_defender', 'goalies'}
# Expansion character names -> v1 skater sheet.
P1_CHARS = {'nix': 'frost_captain', 'volta': 'thunder_winger', 'bram': 'stone_defender'}
# v1 pose names for the expansion's diagonal poses.
DIAG_POSES = {'idle': 'idle', 'stride_a': 'skate_a', 'stride_b': 'skate_b', 'pass': 'pass',
              'windup': 'shot_windup', 'release': 'shot_release', 'check': 'check', 'celebrate': 'celebrate'}
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

def sheet(name, pack=PACK):
    if name not in sheets:
        sheets[name] = Image.open(os.path.join(pack, 'sheets', name + '.png')).convert('RGBA')
    return sheets[name]


def visible_height(fid, fr, pack):
    r = fr['frame']
    a = np.array(sheet(fr['sheet'], pack).crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])))[..., 3]
    ys = np.nonzero((a > 100).any(axis=1))[0]
    return float(ys.max() - ys.min() + 1)


def drop_fragments(img):
    """Erase small blobs touching the crop edge (stick tips etc. from neighbouring cells)."""
    a = np.array(img)
    solid = a[..., 3] > 24
    h, w = solid.shape
    label = np.zeros((h, w), np.int32)
    sizes, edge = [0], [False]
    n = 0
    for y0, x0 in zip(*np.nonzero(solid)):
        if label[y0, x0]:
            continue
        n += 1
        label[y0, x0] = n
        stack, size, touches = [(y0, x0)], 0, False
        while stack:
            y, x = stack.pop()
            size += 1
            if y in (0, h - 1) or x in (0, w - 1):
                touches = True
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n
                    stack.append((ny, nx))
        sizes.append(size)
        edge.append(touches)
    if n < 2:
        return img
    big = max(sizes)
    kill = [i for i in range(1, n + 1) if edge[i] and sizes[i] < big * 0.06]
    if not kill:
        return img
    mask = np.isin(label, kill)
    # also clear the faint fringe around removed blobs
    grow = mask.copy()
    grow[1:] |= mask[:-1]; grow[:-1] |= mask[1:]; grow[:, 1:] |= mask[:, :-1]; grow[:, :-1] |= mask[:, 1:]
    a[grow & ~(label > 0) | mask] = 0
    return Image.fromarray(a)


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


def add_item(fid, img, px, py, s, group):
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a > 6)
    if len(xs):
        x0, y0 = max(0, xs.min() - 1), max(0, ys.min() - 1)
        x1, y1 = min(img.width, xs.max() + 2), min(img.height, ys.max() + 2)
        img = img.crop((x0, y0, x1, y1))
        px -= x0
        py -= y0
    items.append({'id': fid, 'img': img, 'px': round(px, 1), 'py': round(py, 1), 'scale': s, 'group': group})


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
    add_item(fid, img, px, py, s, 'away' if is_away(fid) else 'home')

# ---------------------------------------------------------------- expansions
skater_map = json.loads(json.dumps(src['skaters']))
goalies_side = {}
for pack in EXTRA:
    if not os.path.exists(os.path.join(pack, 'atlas.json')):
        print('skipping missing pack', pack)
        continue
    ex = json.load(open(os.path.join(pack, 'atlas.json')))
    exf = ex['frames']
    # Source px of the expansion sheet -> v1 source px, matched on standing height.
    ratio = {}
    for name, v1 in P1_CHARS.items():
        v1_h = visible_height(None, frames[src['skaters'][v1]['home']['east']['frames']['idle']], PACK)
        for kind in ('diagonals', 'skating', 'hit_reactions'):
            sh = f'{name}_{kind}'
            if sh in ex['sheets']:
                ratio[sh] = ex['sheets'][sh]['recommended_render_scale'] * v1_h / ex['sheets'][sh]['recommended_standing_height']
    if 'halla_side_goalies' in ex['sheets']:
        ratio['halla_side_goalies'] = visible_height(None, frames['goalies/home_south/ready'], PACK) / \
            visible_height(None, exf['halla_side_goalies/halla/home/east/set_a/pose_1'], pack)
    for fid, f in exf.items():
        sh = f['sheet']
        if sh == 'side_net_layers':
            continue  # drawn for a different camera angle; the game keeps its own nets
        if sh == 'ice_spray_goal_lights':
            k, s, cleanup, pivot = 0.3, 0.3, False, 'pack'
        elif sh == 'halla_side_goalies':
            s = SCALE['goalies']; k, cleanup, pivot = s * ratio[sh], True, 'foot'
        else:
            s = SCALE['frost_captain']; k, cleanup, pivot = s * ratio[sh], True, 'foot'
        r = f['frame']
        img = sheet(sh, pack).crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
        nw, nh = max(1, round(r['w'] * k)), max(1, round(r['h'] * k))
        img = img.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA')
        if cleanup:
            img = drop_fragments(img)
        if pivot == 'foot':
            px, py = foot_pivot(img)
        else:
            px, py = f['pivot_pixels']['x'] * k, f['pivot_pixels']['y'] * k
        add_item(fid, img, px, py, s, 'away' if is_away(fid) else 'home')
    # direction mappings in the game's pose names
    for name, v1 in P1_CHARS.items():
        for team in ('home', 'away'):
            dirs = ex['characters'].get(name, {}).get(team, {})
            t = skater_map[v1][team]
            for d, m in dirs.items():
                t[d] = {'flip_x': m['flip_x'], 'frames': {DIAG_POSES[k]: v for k, v in m['frames'].items()}}
            east = ex['animations'].get(f'{name}/{team}/east/stride')
            if east:
                t['stride'] = {
                    'frames': east['frames'],
                    'stop': ex['animations'][f'{name}/{team}/east/stop']['frames'][0],
                    'glide': ex['animations'][f'{name}/{team}/east/glide']['frames'][0],
                }
            hit = {d: ex['animations'][f'{name}/{team}/{d}/hit_recovery']['frames']
                   for d in ('east', 'south') if f'{name}/{team}/{d}/hit_recovery' in ex['animations']}
            if hit:
                t['hit'] = hit
    for key, g in ex.get('goalies', {}).items():
        team = key.split('/')[1]
        if 'east' in g:
            goalies_side[team] = g['east']['frames']

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
    'skaters': skater_map,
    'goalies_side': goalies_side,
}
with open(os.path.join(OUT, 'atlas.json'), 'w') as fh:
    json.dump(atlas, fh, separators=(',', ':'))

total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f'{len(out_frames)} frames on {len(pages)} pages; {total/1e6:.2f} MB total')
for p in pages:
    print('  ', p)
