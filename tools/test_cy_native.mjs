import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const {Assets}=await import('../src/assets.js');
const {Renderer}=await import('../src/render.js');
const {headPlacement}=await import('../src/modular.js');
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));Assets.atlas=A;let checks=0;
const renderer={spriteOf:s=>s.sprite,skaterDir:s=>s.dir,motionFrame:Renderer.prototype.motionFrame,poseFrame:Renderer.prototype.poseFrame};
const dirs=['north','northeast','east','southeast','south','southwest','west','northwest'];
for(const build of ['std','big','small'])for(const action of ['guitar','angel'])for(const dir of dirs)for(const hand of ['L','R'])for(const state of ['goal','over'])for(let tick=0;tick<8;tick++){
 const sprite='body_'+build,set=A.skaters[sprite].home,s={who:'custom_'+build,sprite,def:{sprite,hand},parts:{body:build,head:'c',skin:1,hair:3},team:0,hand,dir,face:dirs.indexOf(dir)*Math.PI/4,speed:0,stun:0,celebrate:3-(tick+.25)/7,state:'skate',d:{maxSpeed:240}};
 renderer.celebrations={[s.who]:action};const m={state,lastGoal:{scorer:s}},fr=Renderer.prototype.skaterFrame.call(renderer,s,m);
 assert.equal(fr.id,set.celebrations[action][tick%4]);assert.equal(fr.flip,hand!=='L');assert.equal(fr.pose,'signature');assert.ok(A.frames['gm:'+fr.id]);checks++;
 for(const head of Object.keys(A.modular.heads)){
  const look={...s.parts,head},f=A.frames[fr.id],hp=headPlacement(A.modular,look,fr.id,f,200,200,.6,fr.flip);assert.ok(hp&&A.frames[hp.head]);assert.equal(hp.flip,fr.flip);assert.ok(hp.rot===0);checks++;
 }
 s.stun=.5;assert.notEqual(Renderer.prototype.skaterFrame.call(renderer,s,m).pose,'signature');checks++;
}
for(const build of ['std','big','small']){
 const sprite='body_'+build,s={who:'custom_'+build,sprite,def:{sprite,hand:'L'},team:0,hand:'L',dir:'south',face:0,speed:0,stun:0,celebrate:3,state:'skate',d:{maxSpeed:240}};renderer.celebrations={[s.who]:'guitar'};
 assert.ok(!Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:{}}}).id.includes('/celebration_cy/'));checks++;
 assert.ok(!Renderer.prototype.skaterFrame.call(renderer,s,{state:'play',lastGoal:{scorer:s}}).id.includes('/celebration_cy/'));checks++;
 renderer.celebrations={[s.who]:'missing'};assert.ok(!Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:s}}).id.includes('/celebration_cy/'));checks++;
}
console.log(JSON.stringify({status:'passed',checks,coverage:'six modular loops, wraps, all head families, eight facings, both hands, goal/victory, hit priority, scorer-only and fallback'}));
