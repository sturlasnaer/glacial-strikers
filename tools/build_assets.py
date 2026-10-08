#!/usr/bin/env python3
"""Slice the Glacial Strikers source sheets into compact WebP atlases for the game.

Usage: python tools/build_assets.py [<sprite-pack> [<output-dir> [<arena-add-on>]]]

The sprite pack is the complete v2 pack (v1 art, the P1 gameplay poses and the rival,
story and arena art in one combined atlas.json). The v3 arena add-on supplies the
side-view nets, the near-glass overlay, the scoreboard, team banners and the mascot.

- Crops every frame the game uses, downscales it per category (premultiplied alpha),
  trims empty margins, erases fragments from neighbouring cells, recomputes foot
  pivots for skaters and goalies, and shelf-packs the results into atlas pages.
- Pages are grouped: 'home' (never recoloured), 'away' (our trio in away colours, away
  fans; recoloured per rival) and one 'rival_<team>' group per rival roster, loaded
  only when that team is needed and recoloured into its colours.
- Every character is rescaled to the v1 skaters' standing height, so one world scale
  fits all of them.
- Arenas, the locker room and the ultimate cut-in banners are written as separate
  WebP images.
- Writes atlas.json with frame rects, pivots and the named mappings the game reads.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

PACK = sys.argv[1] if len(sys.argv) > 1 else '../assets/Glacial-Strikers-Expansion-v2'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/gfx'
ADDON = sys.argv[3] if len(sys.argv) > 3 else '../assets/Glacial-Strikers-v3-Arena-Add-On'
BATCH_A = sys.argv[4] if len(sys.argv) > 4 else '../assets/Glacial-Strikers-v4-Batch-A'
# Gear masks: <sheet>_gearmask.png beside each skater sheet's layout, painted pure red
# (#ff0000) on the stick, green (#00ff00) on skate boots, blue (#0000ff) on blades.
# The game recolours those pixels for the equipped gear.
GEAR_MASKS = sys.argv[5] if len(sys.argv) > 5 else '../assets/Glacial-Strikers-Gear-Masks'
BATCH_G = sys.argv[6] if len(sys.argv) > 6 else '../assets/Glacial-Strikers-v5-Goalies'
# Batch L: goalies in true profile, an add-on atlas in the v5 format whose goalies carry
# real 'east' and 'west' sets (flip_x false) and optionally 'back_west'. The profile east
# replaces the three-quarter side set; the west replaces the mirrored one.
BATCH_L = sys.argv[7] if len(sys.argv) > 7 else '../assets/Puckbound-Batch-L'
BATCH_N = sys.argv[8] if len(sys.argv) > 8 else '../assets/Puckbound-Batch-N'

# Atlas pixels per source pixel for v1 sheets. Picked so each sprite is close to its
# on-screen size on a 2x phone screen while keeping the download small.
SCALE = {
    'frost_captain': 0.6, 'thunder_winger': 0.6, 'stone_defender': 0.6, 'goalies': 0.5,
    'power_pucks': 0.3, 'ability_effects': 0.5, 'equipment_items': 0.5, 'rink_props': 0.5,
    'hud_elements': 0.45, 'character_portraits': 0.6,
}
SKATER_S = SCALE['frost_captain']  # atlas px per v1 skater px
GOALIE_S = SCALE['goalies']
# Fixed atlas scales for the v2 sheets that aren't characters on the ice.
FLAT = {
    'ice_spray_goal_lights': 0.3, 'expressions_core': 0.8, 'expressions_halla_royals_comets': 0.8,
    'expressions_rams_ravens_lynx': 0.8, 'rival_portraits': 0.95, 'rival_crests': 0.4,
    'hub_npcs': 0.33, 'crowd_fans': 0.3, 'expressions_blaze_horn': 0.8,
}
SKIP = {'rink_backdrop', 'side_net_layers', 'frost_captain_variant', 'goalies',
        'arena_ember_dome', 'arena_aurora_palace', 'arena_pine_pond', 'locker_room'}
V1_SKATER = {'nix': 'frost_captain', 'volta': 'thunder_winger', 'bram': 'stone_defender'}
ROLE_V1 = {'c': 'frost_captain', 'w': 'thunder_winger', 'd': 'stone_defender'}
RIVALS = ['pinewood_lynx', 'ember_comets', 'gilded_rams', 'obsidian_ravens', 'aurora_royals']
POSES = {'idle': 'idle', 'stride_a': 'skate_a', 'stride_b': 'skate_b', 'pass': 'pass',
         'windup': 'shot_windup', 'release': 'shot_release', 'check': 'check', 'celebrate': 'celebrate'}
ARENAS = {'ember_dome': 'arena_ember_dome', 'aurora_palace': 'arena_aurora_palace', 'pine_pond': 'arena_pine_pond'}
PAGE = 2048
PAD = 2

src = json.load(open(os.path.join(PACK, 'atlas.json')))
batch_sheets = set()
if BATCH_A and os.path.exists(os.path.join(BATCH_A, 'atlas.json')):
    from merge_batch_a import merge
    batch = json.load(open(os.path.join(BATCH_A, 'atlas.json')))
    src = merge(src, batch)
    batch_sheets = set(batch['sheets'])
goalie_batch_sheets = set()
if BATCH_G and os.path.exists(os.path.join(BATCH_G, 'atlas.json')):
    from merge_goalies import merge_goalies
    goalie_batch = json.load(open(os.path.join(BATCH_G, 'atlas.json')))
    src = merge_goalies(src, goalie_batch)
    goalie_batch_sheets = set(goalie_batch['sheets'])
goalie_west_sheets = set()
if BATCH_L and os.path.exists(os.path.join(BATCH_L, 'atlas.json')):
    west = json.load(open(os.path.join(BATCH_L, 'atlas.json')))
    for section in ('sheets', 'frames', 'animations'):
        for key, value in west.get(section, {}).items():
            if key in src.setdefault(section, {}) and src[section][key] != value:
                raise ValueError(f'Batch L conflicts with {section}/{key}')
            src[section][key] = value
    for key, g in west.get('goalies', {}).items():
        dst = src['goalies'].setdefault(key, {})
        if 'west' in g:
            dst['west_real'] = g['west']  # used in place of the mirrored 'west'
        if 'east' in g:
            dst['east_real'] = g['east']  # profile art in place of the three-quarter side set
        if 'back_west' in g:
            dst['back_west'] = g['back_west']
    goalie_west_sheets = set(west.get('sheets', {}))
    goalie_batch_sheets |= goalie_west_sheets
crowd_back_sheets = set()
if BATCH_N and os.path.exists(os.path.join(BATCH_N, 'atlas.json')):
    near = json.load(open(os.path.join(BATCH_N, 'atlas.json')))
    for section in ('sheets', 'frames'):
        for key, value in near[section].items():
            if key in src.setdefault(section, {}) and src[section][key] != value:
                raise ValueError(f'Batch N conflicts with {section}/{key}')
            src[section][key] = value
    crowd_back_sheets = set(near['sheets'])
    src['crowd_back'] = near['crowd_back']
    src['crowd_back_scale'] = near['crowd_back_scale']
frames = src['frames']
info = src['sheets']
os.makedirs(os.path.join(OUT, 'cutins'), exist_ok=True)

# v1 skater frames referenced by the direction mappings; other rows are alternates.
used_v1 = set()
for char in src['skaters'].values():
    for team in char.values():
        for d in team.values():
            used_v1.update(d['frames'].values())

sheets = {}


def sheet(name):
    if name not in sheets:
        root = BATCH_N if name in crowd_back_sheets else BATCH_L if name in goalie_west_sheets else BATCH_G if name in goalie_batch_sheets else (BATCH_A if name in batch_sheets else PACK)
        sheets[name] = Image.open(os.path.join(root, info[name]['image'])).convert('RGBA')
    return sheets[name]


def crop(fid):
    f = frames[fid]
    r = f['frame']
    return sheet(f['sheet']).crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))


def visible_height(fid):
    a = np.array(crop(fid))[..., 3]
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


def rival_of(fid):
    parts = fid.split('/')
    for seg in (parts[0], parts[1] if len(parts) > 1 else ''):
        for t in RIVALS:
            if seg == t or seg.startswith(t + '_'):
                return t
    return None


def group_of(fid):
    t = rival_of(fid)
    if t:
        return 'rival_' + t
    return 'away' if '/away' in fid else 'home'


# ---------------------------------------------------------------- scales
# Each character sheet is matched to the standing height of the v1 skater (or goalie)
# it stands in for, so every roster shares one world scale.
v1_h = {k: visible_height(src['skaters'][k]['home']['east']['frames']['idle']) for k in ROLE_V1.values()}
v1_goalie_h = visible_height('goalies/home_south/ready')


def standing_ratio(sh, v1_height):
    i = info[sh]
    return i['recommended_render_scale'] * v1_height / i['recommended_standing_height']


ratio = {}
for name, v1 in V1_SKATER.items():
    for kind in ('diagonals', 'skating', 'hit_reactions'):
        ratio[f'{name}_{kind}'] = standing_ratio(f'{name}_{kind}', v1_h[v1])
for t in RIVALS:
    for role, v1 in ROLE_V1.items():
        ratio[f'{t}_{role}'] = standing_ratio(f'{t}_{role}', v1_h[v1])
        for kind in ('diagonals', 'hit_reactions'):
            name = f'{t}_{role}_{kind}'
            if name in info:
                ratio[name] = standing_ratio(name, v1_h[v1])
# goalies: match each team's ready pose to the v1 goalie's ready pose
goalie_ready = {'halla': 'halla_side_goalies/halla/home/east/set_a/pose_1'}
for key, g in src['goalies'].items():
    team = key.split('/')[0]
    if team != 'halla':
        goalie_ready[team] = g['east']['frames']['ready']
goalie_ratio = {t: v1_goalie_h / visible_height(fid) for t, fid in goalie_ready.items()}
goalie_batch_ratio = {sh: standing_ratio(sh, v1_goalie_h) for sh in goalie_batch_sheets}
# signature celebrations: per character, matched like the strides
sig_ratio = {name: standing_ratio('signature_celebrations', v1_h[v1]) for name, v1 in V1_SKATER.items()}

# ---------------------------------------------------------------- frames
items = []


def add_item(fid, img, px, py, s, group, mask=None):
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a > 6)
    if len(xs):
        x0, y0 = max(0, xs.min() - 1), max(0, ys.min() - 1)
        x1, y1 = min(img.width, xs.max() + 2), min(img.height, ys.max() + 2)
        img = img.crop((x0, y0, x1, y1))
        if mask is not None:
            mask = mask.crop((x0, y0, x1, y1))
        px -= x0
        py -= y0
    items.append({'id': fid, 'img': img, 'px': round(px, 1), 'py': round(py, 1), 'scale': s, 'group': group})
    if mask is not None and np.array(mask)[..., :3].any():
        # keep only the painted part; the offset puts it back in place over the frame
        box = mask.getbbox()
        if box:
            items.append({'id': 'gm:' + fid, 'img': mask.crop(box), 'px': round(px, 1), 'py': round(py, 1), 'scale': s, 'group': 'gearmask', 'off': box[:2]})


mask_sheets = {}


def gear_mask(fid, f, nw, nh):
    """The frame's gear mask, cropped and scaled exactly like the frame (or None)."""
    sh = f['sheet']
    if sh not in mask_sheets:
        path = os.path.join(GEAR_MASKS, 'sheets', sh + '_gearmask.png')
        if os.path.exists(path):
            rgba = np.array(Image.open(path).convert('RGBA'))
            rgba[rgba[..., 3] < 128, :3] = 0  # transparent pixels never count, whatever colour they hold
            mask_sheets[sh] = Image.fromarray(rgba[..., :3])
        else:
            mask_sheets[sh] = None
    m = mask_sheets[sh]
    if m is None:
        return None
    r = f['frame']
    m = m.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])).resize((nw, nh), Image.NEAREST)
    a = np.array(m)
    out = np.zeros((nh, nw, 4), np.uint8)
    # snap to the three channels so resampling never invents mixed colours
    for c in range(3):
        out[..., c] = np.where(a[..., c] > 127, 255, 0)
    out[..., 3] = np.where(out[..., :3].any(-1), 255, 0)
    return Image.fromarray(out)


for fid, f in frames.items():
    sh = f['sheet']
    if sh in SKIP or sh.startswith('ultimate_'):
        continue
    cleanup, foot = False, False
    if sh in SCALE:  # v1
        if sh in ROLE_V1.values() and fid not in used_v1:
            continue
        k = s = SCALE[sh]
        foot = sh in ROLE_V1.values()
    elif sh in crowd_back_sheets:
        k = s = 0.5 * info[sh]['recommended_render_scale']
    elif sh in FLAT:
        k = s = FLAT[sh]
        cleanup = sh == 'crowd_fans'
    elif sh in ratio:
        s, k, cleanup, foot = SKATER_S, SKATER_S * ratio[sh], True, True
    elif sh == 'signature_celebrations':
        s, k, cleanup, foot = SKATER_S, SKATER_S * sig_ratio[fid.split('/')[1]], True, True
    elif sh in goalie_batch_ratio:
        s, k, cleanup, foot = GOALIE_S, GOALIE_S * goalie_batch_ratio[sh], True, True
    elif sh in ('halla_side_goalies', 'rival_goalies_a', 'rival_goalies_b', 'pinewood_lynx_goalie'):
        team = 'halla' if sh == 'halla_side_goalies' else rival_of(fid)
        s, k, cleanup, foot = GOALIE_S, GOALIE_S * goalie_ratio[team], True, True
    else:
        print('unhandled sheet', sh)
        continue
    r = f['frame']
    img = crop(fid)
    nw, nh = max(1, round(r['w'] * k)), max(1, round(r['h'] * k))
    img = img.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA')
    if cleanup:
        img = drop_fragments(img)
    if foot:
        px, py = foot_pivot(img)
    else:
        px, py = f['pivot_pixels']['x'] * k, f['pivot_pixels']['y'] * k
    mask = gear_mask(fid, f, nw, nh) if foot else None
    if mask is not None:
        mask = Image.fromarray(np.where(np.array(img)[..., 3:4] > 6, np.array(mask), 0).astype(np.uint8))
    add_item(fid, img, px, py, s, group_of(fid), mask)

# ---------------------------------------------------------------- v3 arena add-on
# World scales: net 0.38 (mouth = 76 world px), scoreboard 0.09, banners 0.185,
# mascot 0.125. Atlas copies are kept at 2x for sharp phone screens.
arena = {}
if os.path.exists(os.path.join(ADDON, 'atlas-v3.json')):
    v3 = json.load(open(os.path.join(ADDON, 'atlas-v3.json')))

    def v3img(path):
        return Image.open(os.path.join(ADDON, path)).convert('RGBA')

    def add_scaled(fid, img, px, py, k, s):
        nw, nh = max(1, round(img.width * k)), max(1, round(img.height * k))
        img = img.convert('RGBa').resize((nw, nh), Image.LANCZOS).convert('RGBA')
        add_item(fid, img, px * k, py * k, s, 'home')

    piv = v3['net_geometry']['shared_pivot_pixels']
    arena['nets'] = {}
    for state, layers in v3['net_layers'].items():
        arena['nets'][state] = {}
        for layer, nl in layers.items():
            fid = f'net/{layer}/{state}'
            add_scaled(fid, v3img(nl['image']), piv['x'], piv['y'], 0.76, 0.76)
            arena['nets'][state][layer] = fid
    sb = v3['arena_scoreboards']['main']
    sbf = v3['frames'][sb['frame']]
    add_scaled('arena/scoreboard', v3img(sb['image']), sbf['pivot_pixels']['x'], sbf['pivot_pixels']['y'], 0.2, 0.2)
    arena['scoreboard'] = {'frame': 'arena/scoreboard', 'pivot': [sbf['pivot_pixels']['x'], sbf['pivot_pixels']['y']],
                           'fields': sb['display_fields'], 'color': sb['text_color']}
    arena['banners'] = {}
    for team, b in v3['arena_banners'].items():
        add_scaled(f'arena/banner/{team}', v3img(b['image']), b['pivot_pixels']['x'], b['pivot_pixels']['y'], 0.37, 0.37)
        arena['banners'][team] = f'arena/banner/{team}'
    fox = v3['mascots']['snow_fox']
    arena['mascot'] = {}
    for pose, im in fox['images'].items():
        add_scaled(f'mascot/snow_fox/{pose}', v3img(im['image']), im['pivot_pixels']['x'], im['pivot_pixels']['y'], 0.25, 0.25)
        arena['mascot'][pose] = f'mascot/snow_fox/{pose}'
    # near glass: its own image, cropped to the rail band, drawn over the players
    glass = v3img(v3['foreground_layers']['near_glass']['image'])
    x0, y0, x1, y1 = glass.getbbox()
    glass.crop((x0, y0, x1, y1)).save(os.path.join(OUT, 'near_glass.webp'), 'WEBP', quality=92, method=6, alpha_quality=100)
    arena['glass'] = {'file': 'gfx/near_glass.webp', 'x': x0, 'y': y0}
else:
    print('no arena add-on at', ADDON)

# ---------------------------------------------------------------- mappings
skaters = json.loads(json.dumps(src['skaters']))
for name, v1 in V1_SKATER.items():
    for team in ('home', 'away'):
        t = skaters[v1][team]
        for d, m in src['characters'][name][team].items():
            t[d] = {'flip_x': m['flip_x'], 'frames': {POSES[p]: v for p, v in m['frames'].items()}}
        an = src['animations']
        t['stride'] = {
            'frames': an[f'{name}/{team}/east/stride']['frames'],
            'stop': an[f'{name}/{team}/east/stop']['frames'][0],
            'glide': an[f'{name}/{team}/east/glide']['frames'][0],
        }
        t['hit'] = {d: an[f'{name}/{team}/{d}/hit_recovery']['frames'] for d in ('east', 'south')}
        t['signature'] = an[f'{name}/{team}/signature_celebration']['frames']
# rival rosters: cardinal and any added diagonal directions; away colours only
for key, r in src['rivals'].items():
    dirs = {d: {'flip_x': m['flip_x'], 'frames': {POSES[p]: v for p, v in m['frames'].items()}}
            for d, m in r['away'].items()}
    hit_keys = {d: f'{key}/away/{d}/hit_recovery' for d in ('east', 'south')}
    if all(k in src['animations'] for k in hit_keys.values()):
        dirs['hit'] = {d: src['animations'][k]['frames'] for d, k in hit_keys.items()}
    skaters[key] = {'home': dirs, 'away': dirs}

goalies_side = {}
for key, g in src['goalies'].items():
    team, colour = key.split('/')
    goalies_side[colour if team == 'halla' else team] = g['east']['frames']

goalies_front, goalies_back, goalies_skating, goalies_puck_handling = {}, {}, {}, {}
for key, g in src['goalies'].items():
    if 'front' not in g:
        continue
    team, colour = key.split('/')
    name = colour if team == 'halla' else team
    goalies_front[name] = g['front']['frames']
    goalies_back[name] = g['back']['frames']
    goalies_skating[name] = {d: {'frames': [g[d]['frames']['skate_' + phase] for phase in ('abcd' if d in ('east', 'west') else 'ab')], 'flip_x': d == 'west'} for d in ('east', 'west', 'north', 'south')}
    goalies_puck_handling[name] = {pose: g['east']['frames'][pose] for pose in ('pass_windup', 'pass_release', 'poke_a', 'poke_b', 'stop_behind_net')}
# Batch L: real left-facing sets, for the goalie in the right-hand net
SIDE_POSES = ('ready', 'ready_repeat', 'shuffle_up', 'shuffle_down', 'butterfly', 'glove_save', 'blocker_save',
              'pad_stretch', 'dive_up', 'dive_down', 'cover', 'getting_up')
PUCK_POSES = ('pass_windup', 'pass_release', 'poke_a', 'poke_b', 'stop_behind_net')
goalies_side_west, goalies_back_west, goalies_puck_handling_west = {}, {}, {}
for key, g in src['goalies'].items():
    e = g.get('east_real')
    if e and 'ready' in e.get('frames', {}):
        team, colour = key.split('/')
        name = colour if team == 'halla' else team
        ef = e['frames']
        goalies_side[name] = {**goalies_side.get(name, {}), **{p: ef[p] for p in SIDE_POSES if p in ef}}
        if all(p in ef for p in PUCK_POSES):
            goalies_puck_handling[name] = {p: ef[p] for p in PUCK_POSES}
        if all(f'skate_{c}' in ef for c in 'abcd') and name in goalies_skating:
            goalies_skating[name]['east'] = {'frames': [ef[f'skate_{c}'] for c in 'abcd'], 'flip_x': False}
for key, g in src['goalies'].items():
    w = g.get('west_real')
    if not w or 'ready' not in w.get('frames', {}):
        continue
    team, colour = key.split('/')
    name = colour if team == 'halla' else team
    wf = w['frames']
    goalies_side_west[name] = {p: wf[p] for p in SIDE_POSES if p in wf}
    if all(p in wf for p in PUCK_POSES):
        goalies_puck_handling_west[name] = {p: wf[p] for p in PUCK_POSES}
    if all(f'skate_{c}' in wf for c in 'abcd') and name in goalies_skating:
        goalies_skating[name]['west'] = {'frames': [wf[f'skate_{c}'] for c in 'abcd'], 'flip_x': False}
    if 'back_west' in g:
        goalies_back_west[name] = g['back_west']['frames']
goalie_animations = {key: value for key, value in src['animations'].items() if '/g/' in key and any(fid in frames and frames[fid]['sheet'] in goalie_batch_sheets for fid in value['frames'])}

portraits = {}
for key, p in src['portraits'].items():
    portraits[key.split('/')[0]] = p
crests = {t: f'rival_crests/crest/{t}' for t in RIVALS}
crowd = {team: {pose: [f'crowd_fans/{team}/{pose}/fan_{i}' for i in range(1, 9)] for pose in ('sitting', 'cheering')}
         for team in ('home', 'away')}

# ---------------------------------------------------------------- packing
out_frames = {}
pages = []
groups = ['home', 'away'] + ['rival_' + t for t in RIVALS] + ['gearmask']
for group in groups:
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
        if group == 'gearmask':
            p.save(os.path.join(OUT, name), 'WEBP', lossless=True, method=6)  # exact channels
        else:
            p.save(os.path.join(OUT, name), 'WEBP', quality=90, method=6, alpha_quality=100)
        pages.append({'file': 'gfx/' + name, 'group': group, 'w': p.width, 'h': p.height})
    for it in group_items:
        pi, fx, fy, fw, fh = it['rect']
        out_frames[it['id']] = [pi, fx, fy, fw, fh, it['px'], it['py'], it['scale']] + (list(it['off']) if 'off' in it else [])

# ---------------------------------------------------------------- images
Image.open(os.path.join(PACK, 'sheets', 'rink_backdrop.png')).convert('RGB').save(
    os.path.join(OUT, 'rink_backdrop.webp'), 'WEBP', quality=90, method=6)
arenas = {}
for key, sh in ARENAS.items():
    Image.open(os.path.join(PACK, 'sheets', sh + '.png')).convert('RGB').resize((1536, 1024), Image.LANCZOS).save(
        os.path.join(OUT, sh + '.webp'), 'WEBP', quality=88, method=6)
    arenas[key] = f'gfx/{sh}.webp'
# Locker room fills the hub behind the menus (cover-fitted by CSS).
Image.open(os.path.join(PACK, 'sheets', 'locker_room.png')).convert('RGB').resize((1536, 864), Image.LANCZOS).save(
    os.path.join(OUT, 'locker_room.webp'), 'WEBP', quality=86, method=6)
banners = {}
for key, b in src['ultimate_banners'].items():
    who = key.split('/')[0]
    img = Image.open(os.path.join(PACK, b['image'])).convert('RGB')
    img = img.resize((960, round(img.height * 960 / img.width)), Image.LANCZOS)
    name = f'cutins/{who}.webp'
    img.save(os.path.join(OUT, name), 'WEBP', quality=84, method=6)
    banners[who] = 'gfx/' + name

atlas = {
    'pages': pages,
    'frames': out_frames,
    'skaters': skaters,
    'goalies_side': goalies_side,
    'goalies_front': goalies_front,
    'goalies_back': goalies_back,
    'goalies_skating': goalies_skating,
    'goalies_puck_handling': goalies_puck_handling,
    'goalies_side_west': goalies_side_west,
    'goalies_back_west': goalies_back_west,
    'goalies_puck_handling_west': goalies_puck_handling_west,
    'goalie_animations': goalie_animations,
    'portraits': portraits,
    'crests': crests,
    'npcs': {k: f'hub_npcs/portrait/{k}' for k in ('coach', 'shopkeeper', 'announcer')},
    'crowd': crowd,
    'crowd_back': src.get('crowd_back', {}),
    'crowd_back_scale': src.get('crowd_back_scale', {}),
    'arenas': arenas,
    'locker': 'gfx/locker_room.webp',
    'banners': banners,
    'arena': arena,
}
with open(os.path.join(OUT, 'atlas.json'), 'w') as fh:
    json.dump(atlas, fh, separators=(',', ':'))

size = lambda p: os.path.getsize(os.path.join(OUT, p))
total = sum(size(f) for f in os.listdir(OUT) if f.endswith(('.webp', '.json'))) + \
    sum(size('cutins/' + f) for f in os.listdir(os.path.join(OUT, 'cutins')))
print(f'{len(out_frames)} frames on {len(pages)} pages; {total / 1e6:.2f} MB total')
for p in pages:
    print(f"   {p['file']:28} {p['w']}x{p['h']}  {size(p['file'][4:]) / 1e6:.2f} MB")
print(f"   arenas {sum(size(v[4:]) for v in arenas.values()) / 1e6:.2f} MB, banners {sum(size(v[4:]) for v in banners.values()) / 1e6:.2f} MB, locker {size('locker_room.webp') / 1e6:.2f} MB")
