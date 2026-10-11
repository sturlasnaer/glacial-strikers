"""Losslessly pack existing frames; group masks by sprite family for page loading."""
from pathlib import Path
from PIL import Image
from collections import defaultdict
import copy, hashlib, json, re

GROUPS=('icons_z','hub','badges','gearmask','legends_gearmask','newcomer_gearmask')
MASKS=set(GROUPS[3:])
GUTTER=2
LIMIT=2048

def family(fid):
    root=fid.split('/')[0]
    if root.startswith('gm:ak_'):
        m=re.match(r'gm:ak_(newcomer_[cdw]|nix|volta|bram)(?:_|$)',root)
        if m:return 'gm:'+m[1]
    return re.sub(r'_(?:skating|diagonals|hit_reactions|side_strides|celebrations|variant)$','',root)

def pack(items,width,order,bins=None,allow_new=True):
    # Best-short-side-fit MaxRects, without rotating frames.
    bins=copy.deepcopy(bins) if bins is not None else []
    keys=[lambda t:(-max(t[1],t[2]),-t[1]*t[2],t[0]),lambda t:(-t[1]*t[2],-t[2],t[0]),lambda t:(-t[2],-t[1],t[0]),lambda t:(-t[1],-t[2],t[0])]
    key=keys[order]
    for fid,w,h in sorted(items,key=key):
        rw,rh=w+2*GUTTER,h+2*GUTTER;best=None
        for bi,b in enumerate(bins):
            for x,y,fw,fh in b['free']:
                if rw<=fw and rh<=fh:
                    score=(min(fw-rw,fh-rh),max(fw-rw,fh-rh),bi,y,x)
                    if best is None or score<best[0]:best=(score,bi,x,y)
        if best is None:
            if not allow_new:return None
            assert rw<=width and rh<=LIMIT,(fid,w,h,width)
            bins.append({'free':[(0,0,width,LIMIT)],'placed':[],'w':0,'h':0})
            bi=len(bins)-1;x=y=0
        else:_,bi,x,y=best
        b=bins[bi];remaining=[]
        for fx,fy,fw,fh in b['free']:
            if x>=fx+fw or x+rw<=fx or y>=fy+fh or y+rh<=fy:
                remaining.append((fx,fy,fw,fh));continue
            if x>fx:remaining.append((fx,fy,x-fx,fh))
            if x+rw<fx+fw:remaining.append((x+rw,fy,fx+fw-x-rw,fh))
            if y>fy:remaining.append((fx,fy,fw,y-fy))
            if y+rh<fy+fh:remaining.append((fx,y+rh,fw,fy+fh-y-rh))
        remaining=list(dict.fromkeys(remaining))
        b['free']=[r for i,r in enumerate(remaining) if not any(i!=j and r[0]>=q[0] and r[1]>=q[1] and r[0]+r[2]<=q[0]+q[2] and r[1]+r[3]<=q[1]+q[3] for j,q in enumerate(remaining))]
        b['placed'].append((fid,x+GUTTER,y+GUTTER,w,h));b['w']=max(b['w'],x+rw);b['h']=max(b['h'],y+rh)
    return bins

def choose(items):
    min_width=max(w+2*GUTTER for _,w,h in items)
    choices=[pack(items,width,order) for width in [512,768,1024,1280,1536,1792,2048] if width>=min_width for order in [0,1,2,3]]
    return min(choices,key=lambda bins:(len(bins),sum(b['w']*b['h'] for b in bins)))

def repack_always_loaded(atlas,out):
    out=Path(out);old=atlas;new=copy.deepcopy(atlas);pages={};pixels={};group_items=defaultdict(list);digest=hashlib.sha256()
    for fid,f in sorted(old['frames'].items()):
        page=old['pages'][f[0]];group=page['group']
        if group not in GROUPS:continue
        if f[0] not in pages:pages[f[0]]=Image.open(out/Path(page['file']).name).convert('RGBA')
        q=pages[f[0]].crop((f[1],f[2],f[1]+f[3],f[2]+f[4]));pixels[fid]=q
        digest.update(json.dumps([fid,group,f[3:]],separators=(',',':')).encode());digest.update(q.tobytes())
        group_items[(group,family(fid) if group in MASKS else '')].append((fid,f[3],f[4]))
    fingerprint=digest.hexdigest()
    previous=old.get('atlas_repacking',{}).get('ER',{})
    if previous.get('pixel_fingerprint')==fingerprint:return old
    old_indices={i for i,p in enumerate(old['pages'])if p['group']in GROUPS};new_pages=[];remap={}
    for i,p in enumerate(old['pages']):
        if i not in old_indices:remap[i]=len(new_pages);new_pages.append(copy.deepcopy(p))
    for fid,f in new['frames'].items():
        if f[0] not in old_indices:f[0]=remap[f[0]]
    stats={};family_pages={};suffix=fingerprint[:12]
    for group in GROUPS:
        start=len(new_pages);families=[]
        sources=[(fam,items)for (g,fam),items in sorted(group_items.items())if g==group]
        aliases={}
        unique_sources=[]
        for fam,items in sources:
            seen={};unique=[]
            for fid,w,h in items:
                key=(w,h,hashlib.sha256(pixels[fid].tobytes()).digest())
                if key in seen:
                    original=seen[key];assert pixels[fid].tobytes()==pixels[original].tobytes();aliases[fid]=original
                else:seen[key]=fid;unique.append((fid,w,h))
            unique_sources.append((fam,unique))
        # Mask pages are selective: keep each sprite's family on tight dedicated pages,
        # so asking for one character never decodes unrelated characters' masks.
        bins=[b for fam,items in unique_sources for b in choose(items)] if group in MASKS else choose(unique_sources[0][1])
        located=defaultdict(set)
        for b in bins:
                pi=len(new_pages);im=Image.new('RGBA',(b['w'],b['h']))
                for fid,x,y,w,h in b['placed']:
                    im.paste(pixels[fid],(x,y));new['frames'][fid][:3]=[pi,x,y];located[family(fid)].add(pi)
                name=group+'_er_'+suffix+'_'+str(pi-start)+'.webp'
                im.save(out/name,'WEBP',lossless=True,exact=True,method=6)
                new_pages.append({'file':'gfx/'+name,'group':group,'w':im.width,'h':im.height})
        for fid,original in aliases.items():
            new['frames'][fid][:3]=new['frames'][original][:3];located[family(fid)].add(new['frames'][original][0])
        for fam,items in sources:
            if fam:families.append({'family':fam,'frames':len(items),'pages':sorted(located[fam])})
        before=[p for p in old['pages']if p['group']==group];after=new_pages[start:]
        stats[group]={'old_pages':len(before),'new_pages':len(after),'old_decoded_bytes':sum(p['w']*p['h']*4 for p in before),'new_decoded_bytes':sum(p['w']*p['h']*4 for p in after),'frames':sum(len(v)for (g,fam),v in group_items.items()if g==group),'identical_frames_sharing_rectangles':len(aliases)}
        family_pages[group]=families
    new['pages']=new_pages
    new.setdefault('atlas_repacking',{})['ER']={'pixel_fingerprint':fingerprint,'gutter_pixels':GUTTER,'maximum_page_size':LIMIT,'groups':stats,'mask_families':family_pages,'method':'Best-short-side-fit MaxRects; no rotation, resizing, trimming, recolouring or alpha changes. Identical same-family pixels may share a rectangle. Lossless WebP with exact RGBA.'}
    return new
