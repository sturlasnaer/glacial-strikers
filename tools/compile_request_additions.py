"""Append request art and equipment masks without rewriting old pages."""
import re
from pathlib import Path
# Pictures only a few screens show (the press room, the facilities, the Hall of Fame, the season in review) go in
# their own group, loaded when one of those screens opens, not with the startup art.
GALLERY=('facilities/','hall/','press/','review/','npcs/announcer_press','npcs/reporter_')
# Groups the source packs name that the game never loads on their own: their art goes with the ones it does.
LOADED={'icons':'icons_z','crowd_props':'home'}
from PIL import Image
import json,copy,hashlib,sys,shutil
def merge_request_additions(atlas,out,sources):
 out=Path(out);A=copy.deepcopy(atlas);items=[];replaced=set();digests={}
 for root in map(Path,sources):
  batches=sorted(root.glob('Puckbound-Batch-*'))if not(root/'atlas.json').exists()else[root]
  for B in batches:
   S=json.loads((B/'atlas.json').read_text());batch=B.name.split('-')[-1];assert batch in ['BJ','BK','BL','BM','BN','BO','BP','BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CH','CI','CJ','CK','CL','CM'];digest=hashlib.sha256((B/'atlas.json').read_bytes()+b''.join((B/m['image']).read_bytes()for m in S['sheets'].values())).hexdigest();digests[batch]=digest
   if A.get('request_addition_sources',{}).get(batch)==digest:continue
   if batch=='BJ':
    for fid,m in S.get('legacy_art_recovery',{}).items():
     if fid in A['frames']:continue
     q=Image.open(B/'integration/legacy-art-recovery'/m['image']).convert('RGBA');p=m['pivot_pixels'];items.append({'id':fid,'q':q,'pivot':[p['x'],p['y']],'scale':m['source_scale'],'group':m['game_group']})
   for sh,m in S['sheets'].items():
    page=Image.open(B/m['image']).convert('RGBA')
    for fid in m['frame_ids']:
     f=S['frames'][fid]
     if fid in A['frames']and batch!='BJ':continue
     if batch=='BJ':replaced.add(fid)
     rr=f['frame'];q=page.crop((rr['x'],rr['y'],rr['x']+rr['w'],rr['y']+rr['h']));k=f.get('game_scale',1) if batch in ['BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CH','CI','CJ','CK','CL','CM'] else .6 if batch in ['BL','BN'] else .33 if fid=='hub_npcs/portrait/coach_stern' else 1;s=k*f.get('source_scale',1);size=(round(q.width*k),round(q.height*k));sx,sy=size[0]/q.width,size[1]/q.height;p=f['pivot_pixels'];group=f.get('game_group') or {'BJ':'gearmask','BK':'icons_z','BL':'linesman','BM':'home'}[batch];group='seasonal' if fid.startswith('seasonal/') else 'resurfacer' if re.match(r'polish/resurfacer/(south|north)(east|west)/',fid) else 'gallery' if fid.startswith(GALLERY) else LOADED.get(group,group);items.append({'id':fid,'q':q.resize(size,Image.Resampling.NEAREST),'pivot':[p['x']*sx,p['y']*sy],'scale':s,'group':group})
   if batch=='BL':A.setdefault('linesman',{}).setdefault('calls',{}).update(S['linesman']['calls'])
   if batch=='BN':A.setdefault('linesman',{})['delayed']=copy.deepcopy(S['linesman']['delayed'])
   if batch in ['BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CH','CI','CJ','CK','CL','CM']:
    for key in ['rule_icons','npcs','club_art_masks','overlay_regions','home_rafters','crowd_supporters','rival_art_masks','rival_supporters']:
     if key in S:A.setdefault(key,{}).update(copy.deepcopy(S[key]))
   if batch in ['CF','CK']:
    for season,values in S['seasonal'].items():A.setdefault('seasonal',{}).setdefault(season,{}).update(copy.deepcopy(values))
   if batch=='CD':
    A.setdefault('seasonal',{}).update(copy.deepcopy(S['seasonal']))
   if batch=='CB':
    M=A['modular'];m=S['modular']
    for family,views in m['heads'].items():
     M['heads'][family.removeprefix('head_')]={view:{state:v['frame']for state,v in states.items()}for view,states in views.items()}
     for states in views.values():
      for v in states.values():M['masks'][v['frame']]=v['mask']
    for family,faces in m['portraits']['faces'].items():
     M['portraits']['faces'][family.removeprefix('head_')]={expr:v['frame']for expr,v in faces.items()}
     for v in faces.values():M['masks'][v['frame']]=v['mask']
   if batch=='CA':
    for dest,source in S.get('external_images',{}).items():
     image=Image.open(B/source).convert('RGBA');assert image.size==(660,168);p=out/dest;p.parent.mkdir(parents=True,exist_ok=True);image.save(p)
   if batch in ['BX','CM']:
    for key,values in S.get('arena',{}).items():A.setdefault('arena',{}).setdefault(key,{}).update(copy.deepcopy(values))
    for key,fid in S.get('arenas',{}).items():
     image=Image.open(B/'frames'/(fid.replace('/','_')+'.png')).convert('RGB');assert image.size==(1536,1024);name='arena_'+key+'.webp';image.save(out/name,'WEBP',lossless=True,exact=True,method=6);A.setdefault('arenas',{})[key]='gfx/'+name
   if batch=='BP':
    A.setdefault('npcs',{}).update(S['npcs']);A.setdefault('badges',{}).update(S['badges'])
   A.setdefault('art_additions',{})[batch]={k:v for k,v in S.items()if k not in ['frames','sheets']};A.setdefault('request_addition_sources',{})[batch]=digest
 if not items:return A
 suffix=hashlib.sha256((''.join(digests.values())).encode()).hexdigest()[:10];items.sort(key=lambda it:(it['group'],-it['q'].height,it['id']));page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=idx=0;group=items[0]['group'];existing={Path(p['file']).name for p in A['pages']}
 def flush():
  nonlocal page,placed,x,y,rowh,idx
  if not placed:return
  n=group+'_requests_'+suffix+'_'+str(idx)+'.webp';assert n not in existing;h=min(2048,y+rowh);page.crop((0,0,2048,h)).save(out/n,'WEBP',lossless=True,exact=True,method=6);pi=len(A['pages']);A['pages'].append({'file':'gfx/'+n,'group':group,'w':2048,'h':h})
  for it,xx,yy in placed:A['frames'][it['id']]=[pi,xx,yy,it['q'].width,it['q'].height,*it['pivot'],it['scale']]
  idx+=1;page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=0
 for it in items:
  if it['group']!=group:flush();group=it['group'];idx=0
  q=it['q'];assert max(q.size)+4<=2048
  if x+q.width+4>2048:x=0;y+=rowh;rowh=0
  if y+q.height+4>2048:flush()
  page.paste(q,(x+2,y+2));placed.append((it,x+2,y+2));x+=q.width+4;rowh=max(rowh,q.height+4)
 flush();assert all(A['frames'][fid]==f for fid,f in atlas['frames'].items()if fid not in replaced);assert A['pages'][:len(atlas['pages'])]==atlas['pages'];return A
if __name__=='__main__':
 R=Path(sys.argv[1]);G=Path(sys.argv[2]);O=R/'game-ready/gfx';O.mkdir(parents=True,exist_ok=True);base=json.loads((G/'atlas.json').read_text())
 for p in base['pages']:shutil.copy2(G/Path(p['file']).name,O/Path(p['file']).name)
 A=merge_request_additions(base,O,sys.argv[3:]);(O/'atlas.json').write_text(json.dumps(A,separators=(',',':')));print('Compiled request additions:',len(A['frames'])-len(base['frames']),'new IDs;',len(A['pages'])-len(base['pages']),'new pages')
