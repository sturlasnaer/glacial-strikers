import copy, json, os, shutil

import numpy as np
from PIL import Image

# Part 2 and new additions (Batches AD, AE, AF, AG, AI part 2, AJ, AK, AL and AM), and the
# batches that followed (AN: the backup goalie and icons; AO: more for the parts), from the
# packs' per-batch source atlases. Unlike the packs above, these are appended after the
# pages built so far, on pages of their own, and drawn at their authored pivots (the AJ head
# anchors and overlays are measured against the untrimmed frames, so nothing is trimmed).
# Adapted from the pack's integration/compile_additions.py, with our compression: art pages
# lossy like the rest, lossless only where exact channels matter (masks, the parts and the
# newcomers, which are recoloured by hue).
BATCHES = ('AD', 'AE', 'AF', 'AG', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP')
PARTS = ('AJ', 'AO', 'AP')  # the batches of players made from parts
GOALIE_S = 0.5  # (as in build_assets.py)
BACKUP_HEIGHT = 0.87  # the backup goalie stands this tall next to a starter
ROLE_V1 = {'c': 'frost_captain', 'w': 'thunder_winger', 'd': 'stone_defender'}
POSES = {'stride_a': 'skate_a', 'stride_b': 'skate_b', 'windup': 'shot_windup', 'release': 'shot_release'}
EIGHT = ('south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest')
LOSSLESS = {'parts', 'newcomers', 'draft_rookies', 'gearmask', 'newcomer_gearmask', 'legends_gearmask'}
PAGE, PAD = 2048, 2
# page groups the game knows, for groups packed separately here
PAGE_GROUP = {'icons_new': 'icons_z', 'newcomer_goalie': 'newcomers'}


def merge_part2(atlas, out, roots, v1_h, v1_goalie_h):
    """Append the packs to a built atlas (frames, pages and mappings). roots: the pack folders
    (a batch in a later one wins). v1_h: the v1 skaters' standing heights by sheet, and
    v1_goalie_h the v1 goalie's, which every character is scaled to."""
    folders = {}
    for root in [roots] if isinstance(roots, str) else roots:
        for b in BATCHES:
            if os.path.exists(os.path.join(root, f'Puckbound-Batch-{b}', 'atlas.json')):
                folders[b] = os.path.join(root, f'Puckbound-Batch-{b}')
    packs = {b: json.load(open(os.path.join(folders[b], 'atlas.json'))) for b in BATCHES if b in folders}
    if not packs:
        return atlas
    existing = set(atlas['frames'])
    items, factors = {}, {}

    def group_of(b, sh, meta):
        cat = meta['category']
        if b in PARTS:
            return 'parts'
        if b == 'AN':  # the backup goalie with the newcomers (recoloured per rival), the icons with the rest
            return 'newcomer_goalie' if cat in ('goalie', 'portrait') else 'icons_new'
        if b == 'AI':
            if sh.endswith('_banner'):
                return None  # (cut-in banners are images of their own)
            return 'legends' if cat == 'portrait' else 'icons_new' if cat == 'icons' else 'legends_ice'
        if b == 'AK':
            return 'newcomers' if 'newcomer' in sh else 'home'
        if b == 'AL':
            return 'abilities_al' if cat == 'effects' else 'icons_new'
        if b == 'AM':
            return 'hub' if cat == 'npc' else 'icons_new'
        if b == 'AG':
            return 'linesman'
        if b == 'AD':
            return 'draft_rookies' if cat == 'newcomer' else None if cat == 'ui' else 'icons_new'  # (the cards are CSS)
        if b == 'AE':
            return 'badges' if sh != 'icons_ae' else 'icons_new'
        return 'icons_new'  # AF

    MASK_GROUP = {'home': 'gearmask', 'newcomers': 'newcomer_gearmask', 'legends_ice': 'legends_gearmask', 'parts': 'parts'}

    def visible_h(folder, a, fid):
        f = a['frames'][fid]
        r = f['frame']
        im = Image.open(os.path.join(folder, a['sheets'][f['sheet']]['image'])).convert('RGBA').crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
        ys = np.nonzero((np.array(im)[..., 3] > 100).any(axis=1))[0]
        return float(ys.max() - ys.min() + 1)

    # heads and portrait faces turn on their necks: the anchors in the parts maps
    necks = {}
    for b in PARTS:
        m = packs.get(b, {}).get('modular', {})
        for views in m.get('heads', {}).values():
            for states in views.values():
                for v in states.values():
                    if v.get('anchor'):
                        necks[v['frame']] = v['anchor']
        for faces in m.get('portraits', {}).get('faces', {}).values():
            for v in faces.values():
                if v.get('anchor'):
                    necks[v['frame']] = v['anchor']
        for fid, f in packs.get(b, {}).get('frames', {}).items():  # (heads without an anchor in the map)
            if fid not in necks and f.get('neck_pixels') and 'heads' in f['sheet']:
                necks[fid] = f['neck_pixels']

    for b, a in packs.items():
        folder = folders[b]
        # the backup goalie: its ready pose a set share of the v1 goalie's
        goalie_k = GOALIE_S * BACKUP_HEIGHT * v1_goalie_h / visible_h(folder, a, a['goalies_side']['newcomer']['ready']) if b == 'AN' else None
        for sh, meta in a['sheets'].items():
            group = group_of(b, sh, meta)
            if group is None:
                continue
            cat = meta['category']
            rrs = meta.get('recommended_render_scale') or a['frames'][meta['frame_ids'][0]].get('source_scale', 0.722)  # (AP gives it per frame)
            body = cat in ('newcomer', 'legend', 'official') or (b in PARTS and 'portrait' not in sh)
            # characters at the v1 skaters' scale; everything else at twice its draw scale
            k = 0.6 * rrs * v1_h[ROLE_V1[meta.get('role', 'c')]] / 152 if body else 2 * rrs
            s = 0.6 if body else k
            if cat == 'goalie':
                k, s = goalie_k, GOALIE_S
            im = Image.open(os.path.join(folder, meta['image'])).convert('RGBA')
            mask = Image.open(os.path.join(folder, meta['gearmask_image'])).convert('RGBA') if meta.get('gearmask_image') and group in MASK_GROUP else None
            for fid in meta['frame_ids']:
                f = a['frames'][fid]
                r = f['frame']
                box = (r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])
                q = im.crop(box)
                kk, ss, py_fixed = k, s, None
                if b == 'AM' and cat == 'npc':  # Ottar's and Brekka's new poses: their idle's height and foot line
                    who = 'ottar' if '/shopkeeper/' in fid else 'brekka'
                    old = atlas['frames'][f'hub_fullbody/{who}/idle_a']
                    kk, ss, py_fixed = old[4] / q.height, old[7], old[6]
                size = (max(1, round(q.width * kk)), max(1, round(q.height * kk)))
                factors[fid] = (size[0] / q.width, size[1] / q.height)
                pivot = necks.get(fid) or f['pivot_pixels']
                px = pivot['x'] * factors[fid][0]
                py = py_fixed if py_fixed is not None else pivot['y'] * factors[fid][1]
                if fid not in existing:
                    q = q.resize(size, Image.NEAREST)
                    arr = np.array(q)
                    arr[arr[..., 3] == 0, :3] = 0
                    items.setdefault(group, []).append({'id': fid, 'img': Image.fromarray(arr), 'px': round(px, 2), 'py': round(py, 2), 'scale': ss})
                if mask is not None:
                    gm = mask.crop(box)
                    if fid in existing:  # (Part 1's standing frames: the mask fitted to the frame as built)
                        old = atlas['frames'][fid]
                        bb = im.crop(box).getbbox()
                        gm = gm.crop(bb).resize((old[3], old[4]), Image.NEAREST)
                        gp, gs = (old[5], old[6]), old[7]
                    else:
                        gm = gm.resize(size, Image.NEAREST)
                        gp, gs = (round(px, 2), round(py, 2)), ss
                    ga = np.array(gm)
                    ga[..., :3] = np.where(ga[..., :3] > 127, 255, 0)
                    ga[..., 3] = np.where(ga[..., :3].max(-1) > 0, 255, 0)
                    if ga[..., 3].any():
                        items.setdefault(MASK_GROUP[group], []).append({'id': 'gm:' + fid, 'img': Image.fromarray(ga), 'px': gp[0], 'py': gp[1], 'scale': gs})

    # ---- pages, after the ones already built
    names = {}
    for group, entries in items.items():
        entries.sort(key=lambda it: (-it['img'].height, it['id']))
        file_group = group + '_p2'
        page, x, y, row, placed = None, 0, 0, 0, []

        def flush():
            nonlocal page, x, y, row, placed
            if not placed:
                return
            n = names.get(file_group, 0)
            names[file_group] = n + 1
            name = f'{file_group}_{n}.webp'
            img = page.crop((0, 0, PAGE, min(PAGE, y + row)))
            if group in LOSSLESS:
                img.save(os.path.join(out, name), 'WEBP', lossless=True, method=6)
            else:
                img.save(os.path.join(out, name), 'WEBP', quality=95 if group == 'icons_new' else 90, method=6, alpha_quality=100)
            pi = len(atlas['pages'])
            # new icons sit with the icons loaded at start
            atlas['pages'].append({'file': 'gfx/' + name, 'group': PAGE_GROUP.get(group, group), 'w': img.width, 'h': img.height})
            for it, fx, fy in placed:
                atlas['frames'][it['id']] = [pi, fx, fy, it['img'].width, it['img'].height, it['px'], it['py'], it['scale']]
            page, x, y, row, placed = None, 0, 0, 0, []

        for it in entries:
            w, h = it['img'].size
            assert max(w, h) + 2 * PAD <= PAGE, (it['id'], (w, h))
            if page is None:
                page = Image.new('RGBA', (PAGE, PAGE))
            if x + w + 2 * PAD > PAGE:
                x, y, row = 0, y + row, 0
            if y + h + 2 * PAD > PAGE:
                flush()
                page = Image.new('RGBA', (PAGE, PAGE))
            page.paste(it['img'], (x + PAD, y + PAD))
            placed.append((it, x + PAD, y + PAD))
            x += w + 2 * PAD
            row = max(row, h + 2 * PAD)
        flush()

    adds = atlas.setdefault('art_additions', {})
    for b, a in packs.items():
        adds[b] = {k: v for k, v in a.items() if k not in ('sheets', 'frames', 'format', 'pack_version')}
    skaters = atlas['skaters']

    # ---- AI: the twins on the ice, drawn left-shot in all eight directions
    if 'AI' in packs:
        a = packs['AI']
        for key, r in a['rivals'].items():
            dirs = {d: {'flip_x': v['flip_x'], 'frames': {POSES.get(p, p): fid for p, fid in v['frames'].items()}} for d, v in r['away'].items()}
            polish = a['rival_polish'][key]
            dirs['hit'] = {d: a['animations'][f'{key}/away/{d}/hit_recovery']['frames'] for d in ('east', 'west', 'south')}
            dirs['stride'] = polish['strides']['east']
            dirs['stride_west'] = west_stride(polish['strides']['west'])
            dirs['signature'] = polish['signature']
            dirs['hands'] = {d: r['hands'][d] for d in EIGHT if d in r['hands']}
            skaters[key] = {'home': copy.deepcopy(dirs), 'away': dirs}
            atlas.setdefault('portraits', {})[key] = a['portraits'][key]
            fid = a['twins'][key]['banner']
            f = a['frames'][fid]
            m = a['sheets'][f['sheet']]
            rr = f['frame']
            Image.open(os.path.join(folders['AI'], m['image'])).convert('RGB').crop((rr['x'], rr['y'], rr['x'] + rr['w'], rr['y'] + rr['h'])) \
                .save(os.path.join(out, 'cutins', key + '.webp'), 'WEBP', quality=88, method=6)
            atlas['banners'][key] = f'gfx/cutins/{key}.webp'
        atlas.setdefault('legends', {})['joint_celebration'] = a['twins'].get('joint_celebration')

    # ---- AK: the cast and the newcomers drawn facing west (and its diagonals) natively
    if 'AK' in packs:
        for key, data in packs['AK']['handed_skater_additions'].items():
            sk = skaters[key]
            shared = sk['home'] == sk['away']  # (the newcomers: one set for both kits)
            kits = ('home', 'away') if shared or data['kit'] == 'away' else (data['kit'],)
            for kit in kits:
                view = sk[kit]
                for d, m in data['directions'].items():
                    view[d] = {'flip_x': False, 'frames': dict(m['frames'])}
                view['hands'] = dict(data['hands'])
                view.setdefault('hit', {})['west'] = list(data['hits']['west']['frames'].values())
                view['stride_west'] = west_stride(data['strides']['west'])

    # ---- AJ and AO: bodies drawn without a head, the heads that sit on them, and their
    # portrait pieces (AO adds two builds, six heads and the parts body's jersey moment)
    M = None
    for b in PARTS:
        if b not in packs:
            continue
        m = packs[b]['modular']
        M = M or atlas.setdefault('modular', {'anchors': {}, 'heads': {}, 'masks': {}, 'portraits': {'faces': {}, 'bodies': {}}})

        def anchor(v):
            kx, ky = factors[v['frame']]
            a = v['anchor']
            M['anchors'][v['frame']] = {**a, 'x': round(a['x'] * kx, 2), 'y': round(a['y'] * ky, 2), **({'front': v['front']} if v.get('front') else {})}
        # (AP's layout: anchors and sequences straight under modular)
        for fid, a in m.get('anchors', {}).items():
            anchor({'frame': fid, 'anchor': a})
        for name, seq in m.get('jersey_moments', {}).items():
            M.setdefault('jersey_moments', {})[name] = list(seq['frames'])
            atlas.setdefault('draft_animations', {})[name] = dict(seq)
        for name, body in m.get('bodies', {}).items():
            for v in body.get('jersey_moment') or []:
                anchor(v)
            if body.get('jersey_moment'):
                M.setdefault('jersey_moments', {})[name] = [v['frame'] for v in body['jersey_moment']]
                atlas.setdefault('draft_animations', {})[name] = {**packs[b].get('jersey_moments', {}).get(name, {'fps': 2, 'loop': False}), 'frames': M['jersey_moments'][name]}
            if 'directions' not in body:
                continue
            dirs = {d: {'flip_x': False, 'frames': {p: v['frame'] for p, v in poses.items()}} for d, poses in body['directions'].items()}
            hit_order = ('stagger', 'knocked_down', 'fallen', 'getting_up', 'getup')
            dirs['hit'] = {d: [v[p]['frame'] for p in hit_order if p in v] for d, v in body['hits'].items()}
            dirs['stride'] = west_stride({'frames': {p: v['frame'] for p, v in body['strides']['east'].items()}})
            dirs['stride_west'] = west_stride({'frames': {p: v['frame'] for p, v in body['strides']['west'].items()}})
            dirs['signature'] = [v['frame'] for v in body['signature']]
            dirs['hands'] = {d: body.get('hand', 'L') for d in EIGHT}
            skaters[name] = {'home': copy.deepcopy(dirs), 'away': dirs}
            for section in ('directions', 'hits', 'strides'):
                for poses in body[section].values():
                    for v in poses.values():
                        anchor(v)
            for v in body['signature']:
                anchor(v)
        for family, views in m.get('heads', {}).items():
            M['heads'][family.removeprefix('head_')] = {view: {state: v['frame'] for state, v in states.items()} for view, states in views.items()}
            for states in views.values():
                for v in states.values():
                    M['masks'][v['frame']] = v['mask']
        P = M['portraits']
        p = m.get('portraits', {})
        shoulders = dict(p.get('bodies', {}))
        if 'body' in p:
            shoulders['body_std'] = p['body']
        for name, piece in shoulders.items():  # the shoulders a portrait's face sits on, per build
            kx, ky = factors[piece['frame']]
            entry = {'body': piece['frame'], 'anchor': {'x': round(piece['anchor']['x'] * kx, 2), 'y': round(piece['anchor']['y'] * ky, 2)}}
            P.setdefault('bodies', {})[name.removeprefix('body_')] = entry
            if name == 'body_std':
                P.update(entry)  # (the default)
        for family, faces in p.get('faces', {}).items():
            P.setdefault('faces', {})[family.removeprefix('head_')] = {e: v['frame'] for e, v in faces.items()}
            for v in faces.values():
                M['masks'][v['frame']] = v['mask']

    # ---- AD: Draft Day
    if 'AD' in packs:
        a, ad = packs['AD'], folders['AD']
        hall = dict(a['draft_hall'])
        Image.open(os.path.join(ad, hall['image'])).convert('RGB').save(os.path.join(out, 'draft_hall.webp'), 'WEBP', quality=90, method=6)
        fg = dict(hall['podium_foreground'])
        Image.open(os.path.join(ad, fg['image'])).save(os.path.join(out, 'draft_podium_foreground.webp'), 'WEBP', lossless=True, method=6)
        hall['image'], fg['image'] = 'gfx/draft_hall.webp', 'gfx/draft_podium_foreground.webp'
        hall['podium_foreground'] = fg
        atlas['draft_hall'] = hall
        shutil.copytree(os.path.join(ad, 'card-kit'), os.path.join(out, 'prospect-cards'), dirs_exist_ok=True)
        atlas['prospect_card_kit'] = {**a['prospect_card_kit'], 'manifest': 'gfx/prospect-cards/card-kit.json', 'css': 'gfx/prospect-cards/prospect-cards.css'}
        atlas.setdefault('draft_animations', {}).update(a['jersey_moments'])

    # ---- AE: the Weekly Cup (the request's names too: podium, rosette_<place>)
    if 'AE' in packs:
        B = dict(packs['AE']['badges'])
        B.update(podium=B.get('weekly_podium'), rosette_gold=B.get('weekly_gold'), rosette_silver=B.get('weekly_silver'), rosette_bronze=B.get('weekly_bronze'))
        atlas.setdefault('badges', {}).update({k: v for k, v in B.items() if v})
        atlas['weekly_podium'] = packs['AE'].get('weekly_podium')

    if 'AG' in packs:
        atlas['linesman'] = packs['AG']['linesman']
    if 'AL' in packs:
        atlas['ability_effects_al'] = packs['AL']['ability_effects_al']
    if 'AM' in packs:
        atlas['training_camp'] = packs['AM']['training_camp']

    # ---- AN: the backup goalie a rival plays once you've signed theirs, as 'newcomer'
    if 'AN' in packs:
        a = packs['AN']
        for key in ('goalies_side', 'goalies_side_west', 'goalies_front', 'goalies_back', 'goalies_skating', 'goalies_puck_handling', 'goalies_puck_handling_west'):
            atlas.setdefault(key, {})['newcomer'] = a[key]['newcomer']
        atlas.setdefault('portraits', {}).update(a['portraits'])
        atlas.setdefault('goalie_animations', {}).update(a.get('goalie_animations', {}))

    return atlas


def west_stride(st):
    """A stride entry as the game reads it: four frames, a stop and a glide."""
    fr = st['frames']
    if isinstance(fr, list):
        return {'frames': fr, 'stop': st['stop'], 'glide': st['glide']}
    four = [fr[p] for p in ('skate_a', 'skate_b', 'skate_c', 'skate_d')] if 'skate_a' in fr else [fr[p] for p in ('stride_a', 'stride_b', 'stride_c', 'stride_d')]
    return {'frames': four, 'stop': st.get('stop') or fr['stop'], 'glide': st.get('glide') or fr['glide']}
