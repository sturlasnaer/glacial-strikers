import json, os

# Batch AI (Fáfnir and Fenrir). Part 1 is the look check: portraits, one standing frame each
# and the reveal painting. Their skating sets come in Part 2, so the standing frames are not
# made into skater sets here (a set with one pose would replace the stand-in art on the ice).
def merge_twins(src, root):
    path = os.path.join(root, 'atlas.json')
    if not os.path.exists(path):
        return src, {}, {}
    art = json.load(open(path))
    for section in ('sheets', 'frames', 'animations', 'portraits'):
        for key, value in art.get(section, {}).items():
            if key in src.setdefault(section, {}) and src[section][key] != value:
                raise ValueError(f'twins conflict: {section}/{key}')
            src[section][key] = value
    roots = {sh: root for sh in art['sheets']}
    return src, roots, {'legends': art.get('twins', {})}
