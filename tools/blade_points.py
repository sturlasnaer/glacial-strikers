import os

import numpy as np
from PIL import Image

# Where the stick blade meets the ice in each ordinary skating frame (idle, skate_a, skate_b and
# glide in eight directions, and the side stride sets), so the carried puck can be drawn on the
# painted blade (the renderer's puckSpritePoint; BD/BE's stick-handling poses have measured
# points of their own, `motion_blades`, which win). Read from the gear masks: the stick is
# their red channel, and its lowest end, down by the skates, is the blade (on the BD/BE frames
# this lands within about 4 pixels of the measured points, median). A frame whose mask has no
# stick down there borrows the point of the others drawn the same way, when they agree; a set
# where they don't, or with none at all, keeps the puck where it really is.
POSES = ('idle', 'skate_a', 'skate_b', 'glide')


def blade_points(atlas, out):
    frames, pages = atlas['frames'], atlas['pages']
    cache = {}

    def crop(fid):
        f = frames[fid]
        name = pages[f[0]]['file'][4:]
        if name not in cache:
            cache[name] = np.array(Image.open(os.path.join(out, name)).convert('RGBA'))
        return cache[name][f[2]:f[2] + f[4], f[1]:f[1] + f[3]], f

    def guess(fid, band=4):
        m = 'gm:' + fid
        if m not in frames or fid not in frames:
            return None
        q, f = crop(m)
        ox, oy = (f[8], f[9]) if len(f) > 8 else (0, 0)  # (a trimmed mask: where it sits in the frame)
        ys, xs = np.nonzero((q[:, :, 0] > 128) & (q[:, :, 3] > 128))
        if len(ys) < 6:
            return None
        ys, xs = ys + oy, xs + ox
        low = ys.max()
        # (the stick's low end isn't down by the skates; BJ's redrawn masks mark the held stick,
        # and three early northwest frames paint the blade higher than that)
        trusted = atlas.get('art_additions', {}).get('BJ', {}).get('gear_mask_replacements', {})
        if low < 0.55 * frames[fid][4] and fid not in trusted:
            return None
        sel = ys >= low - 4
        return {'x': round(float(xs[sel].mean()), 2), 'y': round(float(ys[sel].mean()), 2)}

    groups = []  # frames drawn the same way: a direction's poses, or a stride set
    for kits in atlas['skaters'].values():
        for S in kits.values():
            for v in S.values():
                if isinstance(v, dict) and isinstance(v.get('frames'), dict):
                    groups.append([v['frames'][p] for p in POSES if v['frames'].get(p)])
            for k in ('stride', 'stride_west'):
                st = S.get(k)
                if st:
                    groups.append([*st['frames'], st['glide'], st['stop']])
    known = atlas.get('motion_blades', {})
    points = {}
    for ids in groups:
        got = {i: guess(i) for i in dict.fromkeys(ids) if i not in known and i in frames}
        # (borrowed relative to each frame's pivot and drawing scale: the poses differ in size)
        rel = [((g['x'] - frames[i][5]) / frames[i][7], (g['y'] - frames[i][6]) / frames[i][7]) for i, g in got.items() if g]
        if not rel:
            continue
        mx, my = sum(r[0] for r in rel) / len(rel), sum(r[1] for r in rel) / len(rel)
        # a frame to fill, and the others don't agree where the blade is (some of the first art
        # changes stick side from frame to frame): the whole set keeps the puck where it really
        # is, rather than hop between the blade and the body as the frames go by
        spread = max(max(abs(r[0] - mx), abs(r[1] - my)) for r in rel)
        if len(rel) < len(got) and spread > 20:
            continue
        for i, g in got.items():
            f = frames[i]
            points[i] = g or {'x': round(f[5] + mx * f[7], 2), 'y': round(f[6] + my * f[7], 2)}
    atlas['blade_points'] = points
    return atlas
