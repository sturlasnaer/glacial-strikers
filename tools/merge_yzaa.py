import json, os
def merge_yzaa(src, root):
    roots, mappings = {}, {}
    for name in ('Y','Z','AA','AB','AC'):
        folder=os.path.join(root,'Puckbound-Batch-'+name)
        path=os.path.join(folder,'atlas.json')
        if not os.path.exists(path):continue
        art=json.load(open(path))
        for section in ('sheets','frames','animations','rivals','portraits'):
            for key,value in art.get(section,{}).items():
                if key in src.setdefault(section,{}) and src[section][key]!=value:
                    raise ValueError(f'Y/Z/AA conflict: {section}/{key}')
                src[section][key]=value
        roots.update({sh:folder for sh in art['sheets']})
        for section in ('hud_kit','icons_z','rival_polish','newcomer_portraits','allstar','icons_ac','loading_snowfox','champions_painting'):
            if art.get(section):mappings.setdefault(section,{}).update(art[section])
    return src,roots,mappings
