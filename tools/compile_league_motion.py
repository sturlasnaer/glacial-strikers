from pathlib import Path
from PIL import Image
import json,copy,shutil,hashlib,sys
R=Path(sys.argv[1]);G=Path(sys.argv[2]);O=R/'game-ready/gfx';I=R/'integration';O.mkdir(parents=True,exist_ok=True);I.mkdir(exist_ok=True);base=json.loads((G/'atlas.json').read_text());A=copy.deepcopy(base);items=[];hashes={};sources={};cache={};scales={}
for page in base['pages']:
 n=Path(page['file']).name;shutil.copy2(G/n,O/n);hashes[n]=hashlib.sha256((G/n).read_bytes()).hexdigest()
def height(fid):
 f=base['frames'][fid];n=Path(base['pages'][f[0]]['file']).name
 if n not in cache:cache[n]=Image.open(G/n).convert('RGBA')
 q=cache[n].crop((f[1],f[2],f[1]+f[3],f[2]+f[4]));b=q.getbbox();return b[3]-b[1]
for B in sorted(R.glob('Puckbound-Batch-*')):
 S=json.loads((B/'atlas.json').read_text());batch=B.name.split('-')[-1];sources[batch]=S
 for sh,meta in S['sheets'].items():
  page=Image.open(B/meta['image']).convert('RGBA')
  for fid in meta['frame_ids']:
   f=S['frames'][fid];key=f['key'];kit=f['kit'];oldid=base['skaters'][key][kit]['south']['frames']['idle'];k=height(oldid)/200;s=base['frames'][oldid][7];category=meta['category'];group=f['mask_group']if category=='data_mask'else f['game_group'];rr=f['frame'];q=page.crop((rr['x'],rr['y'],rr['x']+rr['w'],rr['y']+rr['h']));size=(max(1,round(q.width*k)),max(1,round(q.height*k)));sx,sy=size[0]/q.width,size[1]/q.height;scales[fid]=[sx,sy];p=f['pivot_pixels'];items.append({'id':fid,'q':q.resize(size,Image.Resampling.NEAREST),'pivot':[p['x']*sx,p['y']*sy],'scale':s,'group':group})
   if category!='data_mask':
    bp=f['blade_pixels'];A.setdefault('motion_blades',{})[fid]={'x':bp['x']*sx,'y':bp['y']*sy}
    if fid in S['modular']['anchors']:
     an=S['modular']['anchors'][fid];A['modular']['anchors'][fid]={**an,'x':an['x']*sx,'y':an['y']*sy}
 for key,m in S['skater_motion_additions'].items():
  kits=['home','away']
  for kit in kits:
   target=A['skaters'][key][kit]
   for section in ['stickhandling','crossover']:
    if m[section]:target[section]={**copy.deepcopy(m[section]),'hands':{d:m['hand']for d in m[section]}}
 A.setdefault('art_additions',{})[batch]={k:v for k,v in S.items()if k not in ['frames','sheets']}
suffix=hashlib.sha256('\n'.join(sorted(it['id']for it in items if it['id']not in base['frames'])).encode()).hexdigest()[:8];items.sort(key=lambda it:(it['group'],-it['q'].height,it['id']));page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=idx=0;group=items[0]['group']
def flush():
 global page,placed,x,y,rowh,idx
 if not placed:return
 n=group+'_bhbi_'+suffix+'_'+str(idx)+'.webp';assert n not in hashes;h=min(2048,y+rowh);page.crop((0,0,2048,h)).save(O/n,'WEBP',lossless=True,exact=True,method=6);pi=len(A['pages']);A['pages'].append({'file':'gfx/'+n,'group':group,'w':2048,'h':h})
 for it,xx,yy in placed:A['frames'][it['id']]=[pi,xx,yy,it['q'].width,it['q'].height,*it['pivot'],it['scale']]
 idx+=1;page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=0
for it in items:
 if it['id']in base['frames']:continue
 if it['group']!=group:flush();group=it['group'];idx=0
 q=it['q'];assert max(q.size)+4<=2048
 if x+q.width+4>2048:x=0;y+=rowh;rowh=0
 if y+q.height+4>2048:flush()
 page.paste(q,(x+2,y+2));placed.append((it,x+2,y+2));x+=q.width+4;rowh=max(rowh,q.height+4)
flush();assert all(A['frames'][id]==f for id,f in base['frames'].items());assert A['pages'][:len(base['pages'])]==base['pages'];assert all(hashlib.sha256((O/n).read_bytes()).hexdigest()==h for n,h in hashes.items());names={Path(p['file']).name for p in A['pages']}
for p in O.glob('*_bhbi_*.webp'):
 if p.name not in names:p.unlink()
(O/'atlas.json').write_text(json.dumps(A,separators=(',',':')));(I/'baseline-atlas.json').write_text(json.dumps(base));(I/'baseline-page-sha256.json').write_text(json.dumps(hashes,indent=2));(I/'compile-scales.json').write_text(json.dumps(scales,indent=2));shutil.copy2(__file__,I/'compile.py');combined={'format':'glacial-strikers-source-atlas-v2','frames':{},'sheets':{},'batch_metadata':{},'batches':{b:'Puckbound-Batch-'+b+'/atlas.json'for b in sources}}
for b,S in sources.items():
 combined['frames'].update(S['frames']);combined['batch_metadata'][b]={k:v for k,v in S.items()if k not in ['frames','sheets']}
 for sh,m in S['sheets'].items():combined['sheets'][sh]={**m,'image':'Puckbound-Batch-'+b+'/'+m['image']}
(R/'atlas.json').write_text(json.dumps(combined,indent=2));print('compiled',len(A['frames'])-len(base['frames']),'new frames;',len(A['frames']),'total on',len(A['pages']),'pages; old pages and frame records preserved',flush=True)
