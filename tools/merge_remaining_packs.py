import json, os
def merge_remaining(src, root):
    roots, mappings, backgrounds = {}, {}, {}
    for batch in ('B', 'H', 'I', 'C', 'N-Extras'):
        folder = os.path.join(root, 'Puckbound-Batch-' + batch)
        path = os.path.join(folder, 'atlas.json')
        if not os.path.exists(path): continue
        art = json.load(open(path))
        for section in ('sheets', 'frames', 'animations'):
            for key, value in art.get(section, {}).items():
                if key in src.setdefault(section, {}) and src[section][key] != value:
                    raise ValueError(f'Art add-on conflict: {section}/{key}')
                src[section][key] = value
        for sheet in art['sheets']: roots[sheet] = folder
        for section in ('rival_polish','hub_fullbody','arena_rules','polish','arena_additions','crowd_back_extras'):
            for key, value in art.get(section, {}).items():
                if key in mappings.setdefault(section, {}) and mappings[section][key] != value:
                    raise ValueError(f'Art mapping conflict: {section}/{key}')
                mappings[section][key] = value
        for key, value in art.get('backgrounds', {}).items():
            backgrounds[key] = {**value, 'absolute_image': os.path.join(folder,value['image'])}
    return src, roots, mappings, backgrounds
