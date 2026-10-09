"""Append BF/BG icons and parts celebrations; preserve existing atlas geometry."""
from pathlib import Path
import json,tempfile,subprocess,sys,shutil
def merge_polish(atlas,out,source):
 root=Path(source);output=Path(out)
 batches=sorted(root.glob('Puckbound-Batch-*')) if root.exists() else []
 if not batches:return atlas
 # Safe on repeated merges, too: the matching frame geometry already exists.
 wanted=set()
 for batch in batches:wanted.update(json.loads((batch/'atlas.json').read_text())['frames'])
 if wanted<=set(atlas['frames']):return atlas
 assert not wanted.intersection(atlas['frames']),'partial BF/BG import requires a fresh baseline'
 with tempfile.TemporaryDirectory(prefix='puckbound-polish-') as temp:
  temp=Path(temp);base=temp/'baseline';base.mkdir();pack=temp/'pack';pack.mkdir();(base/'atlas.json').write_text(json.dumps(atlas))
  for page in atlas['pages']:
   n=Path(page['file']).name;(base/n).symlink_to((output/n).resolve())
  for batch in batches:(pack/batch.name).symlink_to(batch.resolve(),target_is_directory=True)
  subprocess.run([sys.executable,str(Path(__file__).with_name('compile_polish.py')),str(pack),str(base)],check=True)
  result=json.loads((pack/'game-ready/gfx/atlas.json').read_text());old={Path(p['file']).name for p in atlas['pages']}
  for page in result['pages']:
   n=Path(page['file']).name
   if n not in old:shutil.copy2(pack/'game-ready/gfx'/n,output/n)
  return result
