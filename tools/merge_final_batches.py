import json, os
def merge_final(src, root):
    roots, mappings, stage = {}, {}, {}
    for batch in ('D','U','Q','W','O','E','J','F'):
        folder=os.path.join(root,'Puckbound-Batch-'+batch)
        path=os.path.join(folder,'atlas.json')
        if not os.path.exists(path): continue
        art=json.load(open(path))
        for section in ('sheets','frames','animations'):
            for key,value in art.get(section,{}).items():
                if key in src.setdefault(section,{}) and src[section][key]!=value:
                    raise ValueError(f'Final batch conflict: {section}/{key}')
                src[section][key]=value
        roots.update({sh:folder for sh in art['sheets']})
        for section in ('rival_polish','rule_icons','achievement_icons','awards_host','penalty_box_pond','winter_classic','winter_crowd','goalie_mode'):
            if art.get(section): mappings.setdefault(section,{}).update(art[section])
        if art.get('awards_stage'):
            stage={**art['awards_stage'],'absolute_image':os.path.join(folder,art['awards_stage']['image'])}
    return src,roots,mappings,stage
