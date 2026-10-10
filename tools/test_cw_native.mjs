import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const {Assets}=await import('../src/assets.js');
const {Renderer}=await import('../src/render.js');
const {CHARACTERS}=await import('../src/data.js');
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));Assets.atlas=A;let checks=0;
const renderer={spriteOf:s=>s.def.sprite,skaterDir:s=>s.dir,motionFrame:Renderer.prototype.motionFrame,poseFrame:Renderer.prototype.poseFrame};
const dirs=['north','northeast','east','southeast','south','southwest','west','northwest'];
for(const who of ['frost','thunder','stone'])for(const action of ['guitar','angel'])for(const dir of dirs)for(const hand of ['L','R'])for(const state of ['goal','over'])for(let tick=0;tick<8;tick++){
 const def=CHARACTERS[who],set=A.skaters[def.sprite].home,s={who,def,team:0,hand,dir,face:dirs.indexOf(dir)*Math.PI/4,speed:0,stun:0,celebrate:3-(tick+.25)/7,state:'skate',d:{maxSpeed:240}};
 renderer.celebrations={[who]:action};const m={state,lastGoal:{scorer:s}},fr=Renderer.prototype.skaterFrame.call(renderer,s,m);
 assert.equal(fr.id,set.celebrations[action][tick%4]);assert.equal(fr.flip,hand!==def.hand);assert.equal(fr.pose,'signature');checks++;
 s.stun=.5;assert.notEqual(Renderer.prototype.skaterFrame.call(renderer,s,m).pose,'signature');checks++;
}
for(const who of ['frost','thunder','stone']){
 const def=CHARACTERS[who],s={who,def,team:0,hand:def.hand,dir:'south',face:0,speed:0,stun:0,celebrate:3,state:'skate',d:{maxSpeed:240}};renderer.celebrations={[who]:'guitar'};
 assert.ok(!Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:{}}}).id.startsWith('celebrations/'));checks++;
 assert.ok(!Renderer.prototype.skaterFrame.call(renderer,s,{state:'play',lastGoal:{scorer:s}}).id.startsWith('celebrations/'));checks++;
 renderer.celebrations={[who]:'not-a-celebration'};assert.ok(Renderer.prototype.skaterFrame.call(renderer,s,{state:'goal',lastGoal:{scorer:s}}).id.startsWith('signature_celebrations/'));checks++;
}
console.log(JSON.stringify({status:'passed',checks,coverage:'six loops through wraparound, eight facings, both stick hands, goal and victory, hit priority, scorer-only and legacy fallback'}));
