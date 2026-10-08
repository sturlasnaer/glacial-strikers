import json,os,hashlib
def merge_new(src,root):
    roots,mappings={},{}
    for batch in ('P','R','S','K','T'):
        folder=os.path.join(root,'Puckbound-Batch-'+batch);path=os.path.join(folder,'atlas.json')
        if not os.path.exists(path):continue
        art=json.load(open(path))
        for section in ('sheets','frames','animations'):
            for key,value in art.get(section,{}).items():
                if key in src.setdefault(section,{})and src[section][key]!=value:raise ValueError(f'New batch conflict: {section}/{key}')
                src[section][key]=value
        roots.update({sheet:folder for sheet in art['sheets']})
        for section in ('penalty_box','rival_mascots','new_arena_rules','arena_scoreboards','training_props'):
            if art.get(section):mappings.setdefault(section,{}).update(art[section])
    return src,roots,mappings
def check_mask_sources(root,art_roots,sheets):
    path=os.path.join(root,'mask-manifest.json')
    if not os.path.exists(path):return
    for entry in json.load(open(path))['sheets']:
        sh=entry['sheet']
        if sh not in art_roots:raise ValueError(f'M2 requires imported Batch C sheet: {sh}')
        source=os.path.join(art_roots[sh],sheets[sh]['image'])
        if hashlib.sha256(open(source,'rb').read()).hexdigest()!=entry['source_sha256']:
            raise ValueError(f'M2 source changed: {sh}; regenerate its mask before building')
