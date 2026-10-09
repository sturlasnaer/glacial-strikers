import copy, json, os

from PIL import Image

# Batches BD (stick handling: a forehand and a backhand pose for each of the eight facings) and
# BE (crossovers: two frames turning left and two turning right, six facings), for the three
# originals, the three bodies the parts players are built on and the three newcomers. Adapted
# from the pack's integration/compile_motion.py: each frame is sized so its owner's south idle
# stands as tall as it does now (the sheets draw that idle 200 pixels tall), drawn at the same
# scale, and appended on pages of its own; its gear mask goes with the masks for its art (the
# parts' masks load with the parts). Every motion section carries its own hand map, as each
# pose is drawn with that character's own stick hand.
PAGE, PAD = 2048, 2
LOSSLESS = {'parts', 'parts_masks', 'newcomers', 'gearmask', 'newcomer_gearmask'}
SECTIONS = ('stickhandling', 'crossover')


def merge_motion(atlas, out, root):
    """Append the BD/BE frames to a built atlas. root: the pack folder (it holds a
    Puckbound-Batch-BD and a Puckbound-Batch-BE folder). Missing packs are skipped."""
    batches = sorted(d for d in (os.listdir(root) if os.path.isdir(root) else []) if d.startswith('Puckbound-Batch-'))
    if not batches:
        return atlas
    frames, pages = atlas['frames'], atlas['pages']
    cache = {}

    def page_img(i):
        if i not in cache:
            cache[i] = Image.open(os.path.join(out, pages[i]['file'][4:])).convert('RGBA')
        return cache[i]

    def height(fid):
        f = frames[fid]
        b = page_img(f[0]).crop((f[1], f[2], f[1] + f[3], f[2] + f[4])).getbbox()
        return b[3] - b[1]

    items = {}
    blades = atlas.setdefault('motion_blades', {})
    anchors = atlas['modular']['anchors']
    for b in batches:
        d = os.path.join(root, b)
        with open(os.path.join(d, 'atlas.json')) as fh:
            S = json.load(fh)
        for meta in S['sheets'].values():
            sheet = Image.open(os.path.join(d, meta['image'])).convert('RGBA')
            mask = meta['category'] == 'data_mask'
            for fid in meta['frame_ids']:
                f = S['frames'][fid]
                key, kit = f['key'], f['kit']
                idle = atlas['skaters'][key][kit]['south']['frames']['idle']
                k = height(idle) / 200
                r = f['frame']
                q = sheet.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
                size = (max(1, round(q.width * k)), max(1, round(q.height * k)))
                sx, sy = size[0] / q.width, size[1] / q.height
                newcomer = key.startswith('newcomer')
                if mask:
                    group = 'parts_masks' if f['parts'] else 'newcomer_gearmask' if newcomer else 'gearmask'
                else:
                    group = 'parts' if f['parts'] else 'newcomers' if newcomer else 'home'
                p = f['pivot_pixels']
                items.setdefault(group, []).append({'id': fid, 'img': q.resize(size, Image.Resampling.NEAREST),
                                                    'pivot': (p['x'] * sx, p['y'] * sy), 'scale': frames[idle][7]})
                if not mask:
                    bp = f['blade_pixels']
                    blades[fid] = {'x': round(bp['x'] * sx, 2), 'y': round(bp['y'] * sy, 2)}
                    an = S['modular']['anchors'].get(fid)
                    if an:
                        anchors[fid] = {**an, 'x': an['x'] * sx, 'y': an['y'] * sy}
        for key, m in S['skater_motion_additions'].items():
            # the parts and the newcomers are drawn once and recoloured for either side
            for kit in ('home', 'away') if m['parts'] or key.startswith('newcomer') else (m['kit'],):
                for sec in SECTIONS:
                    if m[sec]:
                        atlas['skaters'][key][kit][sec] = {**copy.deepcopy(m[sec]), 'hands': {dr: m['hand'] for dr in m[sec]}}

    for group, entries in items.items():
        entries.sort(key=lambda it: (-it['img'].height, it['id']))
        n, page, x, y, row, placed = 0, None, 0, 0, 0, []

        def flush():
            nonlocal n, page, x, y, row, placed
            if not placed:
                return
            name = f'{group}_motion_{n}.webp'
            n += 1
            img = page.crop((0, 0, PAGE, min(PAGE, y + row)))
            if group in LOSSLESS:
                img.save(os.path.join(out, name), 'WEBP', lossless=True, method=6)
            else:
                img.save(os.path.join(out, name), 'WEBP', quality=90, method=6, alpha_quality=100)
            pi = len(pages)
            pages.append({'file': 'gfx/' + name, 'group': group, 'w': img.width, 'h': img.height})
            for it, fx, fy in placed:
                frames[it['id']] = [pi, fx, fy, it['img'].width, it['img'].height,
                                    round(it['pivot'][0], 2), round(it['pivot'][1], 2), it['scale']]
            page, x, y, row, placed = None, 0, 0, 0, []

        for it in entries:
            w, h = it['img'].size
            if page is None:
                page = Image.new('RGBA', (PAGE, PAGE))
            if x + w + PAD * 2 > PAGE:
                x, y, row = 0, y + row, 0
            if y + h + PAD * 2 > PAGE:
                flush()
                page = Image.new('RGBA', (PAGE, PAGE))
            page.paste(it['img'], (x + PAD, y + PAD))
            placed.append((it, x + PAD, y + PAD))
            x += w + PAD * 2
            row = max(row, h + PAD * 2)
        flush()
    return atlas
