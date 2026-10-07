"""Merge v4 Batch A source metadata into an existing v2 atlas."""
import argparse,copy,json
from pathlib import Path

def merge(base,addon):
    result=copy.deepcopy(base)
    for section in ['sheets','frames','animations']:
        for key,value in addon[section].items():
            if key in result.setdefault(section,{}) and result[section][key]!=value:
                raise ValueError(f'Conflicting {section} entry: {key}')
            result[section][key]=copy.deepcopy(value)
    for char,value in addon['rivals'].items():
        result.setdefault('rivals',{}).setdefault(char,{}).setdefault('away',{}).update(copy.deepcopy(value['away']))
    for char,value in addon['portraits'].items():
        result.setdefault('portraits',{}).setdefault(char,{}).update(copy.deepcopy(value))
    result['batch_a']=copy.deepcopy(addon['batch_a'])
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('base_atlas',type=Path)
    p.add_argument('--output',type=Path,required=True,help='New output path; existing files are never overwritten')
    a=p.parse_args()
    if a.output.exists():p.error('Output already exists; choose a new path.')
    addon=json.loads((Path(__file__).resolve().parents[1]/'atlas.json').read_text())
    result=merge(json.loads(a.base_atlas.read_text()),addon)
    with a.output.open('x') as fp:fp.write(json.dumps(result,indent=2)+'\n')
