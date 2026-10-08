import json, os
def merge_vx(src, root):
    roots, mappings = {}, {}
    for name in ('V', 'X'):
        folder=os.path.join(root, 'Puckbound-Batch-'+name)
        path=os.path.join(folder, 'atlas.json')
        if not os.path.exists(path): continue
        art=json.load(open(path))
        for section in ('sheets','frames','animations'):
            for key,value in art.get(section,{}).items():
                if key in src.setdefault(section,{}) and src[section][key] != value:
                    raise ValueError(f'V/X conflict: {section}/{key}')
                src[section][key]=value
        roots.update({sh:folder for sh in art['sheets']})
        for section in ('touch_kit', 'badges'):
            if art.get(section): mappings[section]=art[section]
    return src,roots,mappings
