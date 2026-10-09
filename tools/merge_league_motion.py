"""Import the league's own-hand motion art as append-only atlas pages."""
from pathlib import Path
import json,tempfile,subprocess,sys,shutil
def merge_league_motion(atlas,out,source):
 root=Path(source);out=Path(out);batches=sorted(root.glob('Puckbound-Batch-*'))if root.exists()else[]
 if not batches:return atlas
 wanted=set()
 for B in batches:wanted.update(json.loads((B/'atlas.json').read_text())['frames'])
 if wanted<=set(atlas['frames']):return atlas
 with tempfile.TemporaryDirectory(prefix='puckbound-league-motion-')as temp:
  temp=Path(temp);base=temp/'baseline';base.mkdir();pack=temp/'pack';pack.mkdir();(base/'atlas.json').write_text(json.dumps(atlas))
  for page in atlas['pages']:
   n=Path(page['file']).name;(base/n).symlink_to((out/n).resolve())
  for B in batches:(pack/B.name).symlink_to(B.resolve(),target_is_directory=True)
  subprocess.run([sys.executable,str(Path(__file__).with_name('compile_league_motion.py')),str(pack),str(base)],check=True)
  A=json.loads((pack/'game-ready/gfx/atlas.json').read_text());old={Path(p['file']).name for p in atlas['pages']}
  for page in A['pages']:
   n=Path(page['file']).name
   if n not in old:shutil.copy2(pack/'game-ready/gfx'/n,out/n)
  return A
