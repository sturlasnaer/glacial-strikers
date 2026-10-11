"""Content-address lossless pages and prune superseded atlas page exports."""
from pathlib import Path
import hashlib,io,json

NAMING_VERSION='page-content-sha256-v1'

def save_content_page(image,out,group,label):
    data=io.BytesIO();image.save(data,'WEBP',lossless=True,exact=True,method=6)
    payload=data.getvalue();name=group+'_'+label+'_'+hashlib.sha256(payload).hexdigest()[:12]+'.webp'
    path=Path(out)/name
    if path.exists():assert path.read_bytes()==payload,'Content hash collision: '+name
    else:path.write_bytes(payload)
    return name

def prune_atlas_pages(atlas,out):
    """Only root WebP page exports; retain atlas/code references and all kit folders."""
    out=Path(out);root=out.parent.parent;named=json.dumps(atlas)
    for p in (root/'src').glob('*'):
        if p.suffix in ['.js','.css']:named+='\n'+p.read_text()
    groups={p['group']for p in atlas['pages']}
    removed=[]
    for p in sorted(out.glob('*.webp')):
        if not any(p.name.startswith(g+'_')for g in groups):continue
        if p.name in named:continue
        removed.append({'file':'assets/gfx/'+p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});p.unlink()
    return removed
