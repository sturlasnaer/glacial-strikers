from pathlib import Path
from PIL import Image
import json,copy,shutil,hashlib,sys
R=Path(sys.argv[1]);G=Path(sys.argv[2]);O=R/'game-ready/gfx';I=R/'integration';O.mkdir(parents=True,exist_ok=True);I.mkdir(exist_ok=True);base=json.loads((G/'atlas.json').read_text());A=copy.deepcopy(base);items=[];hashes={};sources={};scales={}
for page in base['pages']:
 n=Path(page['file']).name;shutil.copy2(G/n,O/n);hashes[n]=hashlib.sha256((G/n).read_bytes()).hexdigest()
for B in sorted(R.glob('Puckbound-Batch-*')):
 S=json.loads((B/'atlas.json').read_text());batch=B.name.split('-')[-1];sources[batch]=S;factor={}
 for key,seq in S.get('modular',{}).get('celebrations',{}).items():
  oldid=base['skaters'][key]['home']['south']['frames']['idle'];of=base['frames'][oldid];oa=base['modular']['anchors'][oldid];id=seq['frames'][0];f=S['frames'][id];an=S['modular']['anchors'][id];factor[key]=((of[6]-oa['y'])/(f['pivot_pixels']['y']-an['y']),of[7])
 for sh,meta in S['sheets'].items():
  page=Image.open(B/meta['image']).convert('RGBA')
  for id in meta['frame_ids']:
   f=S['frames'][id];rr=f['frame'];q=page.crop((rr['x'],rr['y'],rr['x']+rr['w'],rr['y']+rr['h']));k,s=(1,1)if batch=='BF'else factor[f['key']];size=(round(q.width*k),round(q.height*k));sx,sy=size[0]/q.width,size[1]/q.height;scales[id]=[sx,sy];p=f['pivot_pixels'];group='icons_z'if batch=='BF'else'parts_masks'if meta['category']=='data_mask'else'parts';items.append({'id':id,'q':q.resize(size,Image.Resampling.NEAREST),'pivot':[p['x']*sx,p['y']*sy],'scale':s,'group':group})
   if id in S['modular']['anchors']:
    an=S['modular']['anchors'][id];A['modular']['anchors'][id]={**an,'x':an['x']*sx,'y':an['y']*sy}
 for key,seq in S['modular']['celebrations'].items():
  for kit in ['home','away']:A['skaters'][key][kit]['signature']=seq['frames'];A['skaters'][key][kit]['signature_hand']=seq['hand']
 A.setdefault('news_icons',{}).update(S['news_icons']);A.setdefault('art_additions',{})[batch]={k:v for k,v in S.items()if k not in ['frames','sheets']}
suffix=hashlib.sha256('\n'.join(sorted(it['id']for it in items)).encode()).hexdigest()[:8];items.sort(key=lambda it:(it['group'],-it['q'].height,it['id']));page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=idx=0;group=items[0]['group']
def flush():
 global page,placed,x,y,rowh,idx
 if not placed:return
 n=group+'_bfbg_'+suffix+'_'+str(idx)+'.webp';assert n not in hashes;h=min(2048,y+rowh);page.crop((0,0,2048,h)).save(O/n,'WEBP',lossless=True,exact=True,method=6);pi=len(A['pages']);A['pages'].append({'file':'gfx/'+n,'group':group,'w':2048,'h':h})
 for it,xx,yy in placed:A['frames'][it['id']]=[pi,xx,yy,it['q'].width,it['q'].height,*it['pivot'],it['scale']]
 idx+=1;page=Image.new('RGBA',(2048,2048));placed=[];x=y=rowh=0
for it in items:
 if it['id']in base['frames']:continue
 if it['group']!=group:flush();group=it['group'];idx=0
 q=it['q'];assert max(q.size)+4<=2048
 if x+q.width+4>2048:x=0;y+=rowh;rowh=0
 if y+q.height+4>2048:flush()
 page.paste(q,(x+2,y+2));placed.append((it,x+2,y+2));x+=q.width+4;rowh=max(rowh,q.height+4)
flush();assert all(A['frames'][id]==f for id,f in base['frames'].items());assert A['pages'][:len(base['pages'])]==base['pages'];assert all(hashlib.sha256((O/n).read_bytes()).hexdigest()==h for n,h in hashes.items());(O/'atlas.json').write_text(json.dumps(A,separators=(',',':')));(I/'baseline-atlas.json').write_text(json.dumps(base));(I/'baseline-page-sha256.json').write_text(json.dumps(hashes,indent=2));(I/'compile-scales.json').write_text(json.dumps(scales,indent=2));shutil.copy2(__file__,I/'compile.py');combined={'format':'glacial-strikers-source-atlas-v2','frames':{},'sheets':{},'batch_metadata':{},'batches':{b:'Puckbound-Batch-'+b+'/atlas.json'for b in sources}}
for b,S in sources.items():
 combined['frames'].update(S['frames']);combined['batch_metadata'][b]={k:v for k,v in S.items()if k not in ['frames','sheets']}
 for sh,m in S['sheets'].items():combined['sheets'][sh]={**m,'image':'Puckbound-Batch-'+b+'/'+m['image']}
(R/'atlas.json').write_text(json.dumps(combined,indent=2));print('compiled',len(A['frames'])-len(base['frames']),'new frames;',len(A['frames']),'total;',len(A['pages']),'pages')
