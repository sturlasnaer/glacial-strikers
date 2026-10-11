"""Losslessly group element effects and race runners onto selectively loaded pages."""
from pathlib import Path
from PIL import Image
from collections import defaultdict
import copy,hashlib,json
from repack_always_loaded import choose
from atlas_page_files import save_content_page, NAMING_VERSION

ELEMENTS={'heat_check':'ember','firestorm':'ember','tailwind':'gale','cyclone':'gale','fade':'shadow','eclipse':'shadow'}

def repack_selective_pages(atlas,out,batch):
    assert batch in ['EW','EX'];out=Path(out);group='abilities_al' if batch=='EW' else 'race';old=atlas;new=copy.deepcopy(old);sources={};pixels={};families=defaultdict(list);digest=hashlib.sha256()
    for fid,f in sorted(old['frames'].items()):
        if old['pages'][f[0]]['group']!=group:continue
        parts=fid.split('/');assert len(parts)==3,(batch,fid)
        if batch=='EW':assert parts[0]=='ability_effects' and parts[1]in ELEMENTS;family=ELEMENTS[parts[1]]
        else:assert parts[0]=='race' and parts[2]in ['run_1','run_2','run_3','run_4','win'];family=parts[1]
        if f[0]not in sources:sources[f[0]]=Image.open(out/Path(old['pages'][f[0]]['file']).name).convert('RGBA')
        q=sources[f[0]].crop((f[1],f[2],f[1]+f[3],f[2]+f[4]));pixels[fid]=q;families[family].append((fid,f[3],f[4]));digest.update(json.dumps([fid,f[3:]],separators=(',',':')).encode());digest.update(q.tobytes())
    if not pixels:return old
    fingerprint=digest.hexdigest();previous=old.get('atlas_repacking',{}).get(batch,{})
    if previous.get('pixel_fingerprint')==fingerprint and previous.get('naming_version')==NAMING_VERSION:return old
    if batch=='EX':assert all(len(items)==5 for items in families.values())
    removed={i for i,p in enumerate(old['pages'])if p['group']==group};pages=[];remap={}
    for i,p in enumerate(old['pages']):
        if i not in removed:remap[i]=len(pages);pages.append(copy.deepcopy(p))
    for fid,f in new['frames'].items():
        if f[0]not in removed:f[0]=remap[f[0]]
    stats={}
    for family,items in sorted(families.items()):
        bins=choose(items);start=len(pages)
        for i,b in enumerate(bins):
            im=Image.new('RGBA',(b['w'],b['h']));pi=len(pages)
            for fid,x,y,w,h in b['placed']:im.paste(pixels[fid],(x,y));new['frames'][fid][:3]=[pi,x,y]
            name=save_content_page(im,out,group,batch.lower());pages.append({'file':'gfx/'+name,'group':group,'w':im.width,'h':im.height})
        stats[family]={'frames':len(items),'pages':len(bins),'decoded_bytes':sum(p['w']*p['h']*4 for p in pages[start:])}
    new['pages']=pages
    # Existing packing reports contain page indexes: move those report anchors with their frames.
    er=new.get('atlas_repacking',{}).get('ER',{})
    for mask_group,rows in er.get('mask_families',{}).items():
        for row in rows:row['pages']=[remap[i]for i in row['pages']]
    before=[p for p in old['pages']if p['group']==group];after=[p for p in pages if p['group']==group]
    new.setdefault('atlas_repacking',{})[batch]={'pixel_fingerprint':fingerprint,'naming_version':NAMING_VERSION,'group':group,'gutter_pixels':2,'maximum_page_size':2048,'old_pages':len(before),'new_pages':len(after),'old_decoded_bytes':sum(p['w']*p['h']*4 for p in before),'new_decoded_bytes':sum(p['w']*p['h']*4 for p in after),'families':stats,'method':'MaxRects without rotation, resizing, trimming, recolouring, alpha changes or redrawing. Each element or mascot occupies dedicated lossless WebP pages.'}
    return new
