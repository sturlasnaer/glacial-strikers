import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const root=new URL('../',import.meta.url);
const {Renderer}=await import(new URL('src/render.js',root));
const {Assets}=await import(new URL('src/assets.js',root));
const {headPlacement,useModular}=await import(new URL('src/modular.js',root));
const {UI}=await import(new URL('src/ui.js',root));
const {ACHIEVEMENTS}=await import(new URL('src/achievements.js',root));
const A=JSON.parse(readFileSync(new URL('assets/gfx/atlas.json',root)));Assets.atlas=A;useModular(A);let cases=0;
const renderer={spriteOf:s=>s.key,skaterDir:s=>s.dir,motionFrame:Renderer.prototype.motionFrame,poseFrame:Renderer.prototype.poseFrame};
const dirs=['north','northeast','east','southeast','south','southwest','west','northwest'];
for(const key of ['body_std','body_big','body_small'])for(const team of [0,1])for(const hand of ['L','R'])for(const dir of dirs)for(const state of ['goal','over'])for(let phase=0;phase<4;phase++){
 const s={key,team,hand,dir,face:dirs.indexOf(dir)*Math.PI/4,speed:80,stun:0,celebrate:3-(phase+.25)/6,state:'skate',d:{maxSpeed:240}},m={state,lastGoal:{scorer:s}};
 const fr=Renderer.prototype.skaterFrame.call(renderer,s,m);assert.equal(fr.id,A.skaters[key][team?'away':'home'].signature[phase]);assert.equal(fr.flip,hand==='R');assert.equal(fr.pose,'signature');cases++;
 if(dir==='south'&&team===0&&state==='goal')for(const head of Object.keys(A.modular.heads)){
  const an=A.modular.anchors[fr.id],p=headPlacement(A.modular,{head},fr.id,A.frames[fr.id],0,0,.525,fr.flip);assert.ok(p&&A.frames[p.head]);assert.equal(p.flip,!!an.flip_head!==fr.flip);assert.equal(p.rot,(an.rot||0)*Math.PI/180*(fr.flip?-1:1));cases++;
 }
 s.stun=.5;const hit=Renderer.prototype.skaterFrame.call(renderer,s,m);assert.notEqual(hit.pose,'signature');cases++;
}
for(const key of ['body_std','body_big','body_small','frost_captain']){
 const s={key,team:0,hand:'L',dir:'south',face:Math.PI,speed:0,stun:0,celebrate:3,d:{maxSpeed:240}};
 const fr=Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:{}}});assert.notEqual(fr.pose,'signature');cases++;
 if(key==='frost_captain'){const fr=Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:s}});assert.equal(fr.flip,true);cases++;}
}
for(const key of ['moonstruck','splinters','protector','game-face','new-colours']){const a=ACHIEVEMENTS.find(a=>a.id===key);assert.ok(a&&A.frames[a.art||'achievements/'+key]);cases++;}
const oldIcon=Assets.icon;Assets.icon=(id)=>'TEST:'+id;
const news={season:2,news:[{k:'edge',s:2}]};const html=UI.prototype.newsHtml.call({},news);assert.ok(html.includes('TEST:icons/news_edge'));cases++;
const edge=A.news_icons.edge;delete A.news_icons.edge;const fallback=UI.prototype.newsHtml.call({},news);assert.ok(fallback.includes('TEST:'+A.news_icons.new_club));A.news_icons.edge=edge;Assets.icon=oldIcon;cases++;
console.log(JSON.stringify({status:'passed',cases,checks:'camera-facing celebrations, both stick hands, all phases, scoring and hit priorities, all head variants and turns, legacy fallback, achievement and news icons'}));
