"""Adding an icon must not rename unrelated packed pages; prune only obsolete pages."""
from pathlib import Path
import copy,hashlib,json,tempfile
from repack_always_loaded import repack_always_loaded,GROUPS
from atlas_page_files import prune_atlas_pages
R=Path(__file__).resolve().parents[1];G=R/'assets/gfx';A=json.loads((G/'atlas.json').read_text())
for p in A['pages']:
 if any('_'+tag+'_'in p['file']for tag in ['er','ew','ex']):
  q=R/'assets'/p['file'];assert q.stem.split('_')[-1]==hashlib.sha256(q.read_bytes()).hexdigest()[:12],p['file']
with tempfile.TemporaryDirectory()as tmp:
 root=Path(tmp);out=root/'assets/gfx';out.mkdir(parents=True);(root/'src').mkdir()
 for p in A['pages']:(out/Path(p['file']).name).symlink_to((R/'assets'/p['file']).resolve())
 probe=copy.deepcopy(A);probe['frames']['achievements/cache_name_regression_probe']=probe['frames']['achievements/from_scratch'].copy();N=repack_always_loaded(probe,out)
 before={hashlib.sha256((R/'assets'/p['file']).read_bytes()).hexdigest():p['file']for p in A['pages']if p['group']in GROUPS};stable=0
 for p in N['pages']:
  if p['group']not in GROUPS:continue
  h=hashlib.sha256((out/Path(p['file']).name).read_bytes()).hexdigest()
  if h in before:assert before[h]==p['file'];stable+=1
 assert stable>=34,stable
 stale=out/'home_obsolete_page_test.webp';stale.write_bytes(b'obsolete fixture')
 direct=out/'home_direct_reference_test.webp';direct.write_bytes(b'direct fixture');(root/'src/styles.css').write_text('url(../assets/gfx/'+direct.name+')')
 kit=out/'ui-kit/unused_fixture.webp';kit.parent.mkdir();kit.write_bytes(b'kit fixture')
 removed=prune_atlas_pages(N,out);assert not stale.exists()and direct.exists()and kit.exists();assert prune_atlas_pages(N,out)==[]
print('Atlas content names: encoded hashes valid;',stable,'unchanged pages retain names after icon registration; reference-safe pruning passed')
