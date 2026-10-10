import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const {Assets,recolorClubPixels}=await import('../src/assets.js');
const {Renderer}=await import('../src/render.js');
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));Assets.atlas=A;Assets.pages=A.pages.map(()=>({}));let checks=0;
const rc={trim:{h:0,s:.8,v:.8},jersey:{h:220,s:.7,v:.9}};
const d=new Uint8ClampedArray([0,130,155,255,255,240,190,255,200,130,60,255,0,0,0,0]);
const md=new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,0,0,255,0,0,255]);
recolorClubPixels(d,md,rc);assert.ok(d[0]>d[1]&&d[0]>d[2]);assert.ok(d[6]>d[4]);assert.deepEqual([...d.slice(8,12)],[200,130,60,255]);assert.deepEqual([...d.slice(12,16)],[0,0,0,0]);checks+=4;
const draws=[],texts=[],ctx={save(){},restore(){},translate(){},rotate(){},fillText(...a){texts.push(a)}};
const old=Assets.draw;Assets.draw=(...a)=>draws.push(a);
const render={font:'monospace'};
for(const level of [0,1,2,3])for(const cheer of [false,true]){
 draws.length=0;Renderer.prototype.drawSupporters.call(render,ctx,{time:1,cheerTeam:cheer?0:null,lamp:cheer?1:0,chant:null},{facilities:{stands:level}});
 assert.equal(draws.length,level<2?0:level===2?2:3);checks++;
 for(const draw of draws){assert.ok(A.frames[draw[1]]);assert.equal(draw[1].endsWith('_cheer'),cheer);checks+=2;}
}
for(const time of [0,1]){
 draws.length=0;texts.length=0;Renderer.prototype.drawRafters.call(render,ctx,{cups:1,cupSeasons:[2],hall:[{number:17,name:'Test'}]},time);
 assert.equal(draws.length,2);assert.ok(draws[0][1].includes('cup_banner_'));assert.ok(draws[1][1].includes('number_banner_'));assert.equal(texts.length,3);assert.ok(texts.every(t=>Number.isFinite(t[1])&&Number.isFinite(t[2])&&t[3]>0));checks+=5;
}
for(const [id,mid]of Object.entries(A.club_art_masks)){assert.deepEqual(A.frames[id].slice(3),A.frames[mid].slice(3));checks++;}
for(const id of ['announcer_press','reporter_radio','reporter_radio_eager','reporter_paper','reporter_paper_eager','reporter_tv','reporter_tv_eager']){assert.ok(A.frames[A.npcs[id]]);checks++;}
Assets.draw=old;console.log(`Native club art: ${checks} checks passed`);
