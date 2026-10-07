"""Merge Batch G goalie poses into v2/v4 without replacing existing poses."""
import copy,json,argparse
from pathlib import Path

def _add(dst,src,path=''):
    for key,value in src.items():
        where=path+'/'+key
        if key not in dst:dst[key]=copy.deepcopy(value)
        elif isinstance(value,dict) and isinstance(dst[key],dict):_add(dst[key],value,where)
        elif dst[key]!=value:raise ValueError('Conflicting source metadata: '+where)

def merge_goalies(base,addon):
    result=copy.deepcopy(base)
    for section in ('sheets','frames','animations','goalies'):
        _add(result.setdefault(section,{}),addon[section],section)
    result['batch_g']=copy.deepcopy(addon['batch_g'])
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base_atlas',type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    addon=json.loads((Path(__file__).resolve().parents[1]/'atlas.json').read_text())
    result=merge_goalies(json.loads(args.base_atlas.read_text()),addon)
    with args.output.open('x') as fp:json.dump(result,fp,indent=2);fp.write('\n')
