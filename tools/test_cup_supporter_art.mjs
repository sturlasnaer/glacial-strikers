import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const {Assets,recolorSupporterPixels}=await import('../src/assets.js');
const {Renderer}=await import('../src/render.js');
const {TEAMS,ARENAS}=await import('../src/data.js');
const {nextFixture}=await import('../src/league.js');
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));Assets.atlas=A;Assets.pages=A.pages.map(()=>({}));let checks=0;
const samples=JSON.parse(readFileSync(process.argv[2]||'../assets/Puckbound-Batches-BX-BZ/Puckbound-Batch-BY/quality-review/runtime-samples.json'));
for(const s of samples){
 const team=Object.values(TEAMS).find(t=>(t.art||t.mark)===s.club);assert.ok(team);
 const d=new Uint8ClampedArray(s.pixels.flat()),m=new Uint8ClampedArray(s.masks.flat());if(team.recolor)recolorSupporterPixels(d,m,team.recolor);
 for(let i=0;i<s.pixels.length;i++){
  assert.equal(d[i*4+3],s.pixels[i][3]);checks++;
  if(s.label==='unchanged'||!team.recolor)assert.deepEqual([...d.slice(i*4,i*4+4)],s.pixels[i]);
  else assert.notDeepEqual([...d.slice(i*4,i*4+3)],s.pixels[i].slice(0,3));checks++;
 }
}
for(const [id,mid]of Object.entries(A.rival_art_masks)){assert.deepEqual(A.frames[id].slice(3),A.frames[mid].slice(3));checks++;}
const draws=[],texts=[],ctx={save(){},restore(){},fillText(...a){texts.push(a)}};Assets.draw=(...a)=>draws.push(a);const render={font:'monospace'};
for(const team of Object.values(TEAMS).filter(t=>A.rival_supporters[t.art||t.mark])){
 for(const cheerTeam of [null,0,1]){
  draws.length=0;Renderer.prototype.drawRivalSupporters.call(render,ctx,{time:1,cheerTeam,lamp:1},team.id,team.arena);
  assert.equal(draws.length,3);assert.ok(draws.every(d=>d[1].endsWith('_cheer')===(cheerTeam===1)));checks+=2;
 }
 draws.length=0;Renderer.prototype.drawRivalSupporters.call(render,ctx,{time:.3,chant:{team:1}},team.id,team.arena);assert.ok(draws.every(d=>d[1].endsWith('_b')));checks++;
 draws.length=0;Renderer.prototype.drawRivalSupporters.call(render,ctx,{time:0},team.id,'frostline_coliseum');assert.equal(draws.length,0);checks++;
}
for(const order of [['home','rams'],['rams','home']]){
 const f=nextFixture({phase:'playoffs',playoffs:{semis:[],final:{a:order[0],b:order[1]}}});assert.equal(f.stage.arena,'frostline_coliseum');checks++;
}
assert.equal(ARENAS.frostline_coliseum.twist,'none');checks++;
assert.equal(Renderer.prototype.penaltyBox.call({arena:ARENAS.frostline_coliseum}),A.arena.penalty_boxes.frostline_coliseum);checks++;
assert.equal(Renderer.prototype.penaltyBox.call({arena:ARENAS.pine_pond}),A.arena.penalty_box_pond);checks++;
for(const time of [0,.6]){
 draws.length=0;Renderer.prototype.drawScoreboard.call(render,ctx,{score:[3,2],time:67,state:'play',winScore:5},{time},A.arena.scoreboards.frostline_coliseum);assert.equal(draws[0][1],A.arena.scoreboards.frostline_coliseum.frames[Math.floor(time*2)%2]);checks++;
}
assert.ok(texts.every(t=>Number.isFinite(t[1])&&Number.isFinite(t[2])));checks++;
console.log(`Cup arena and rival supporters: ${checks} checks passed`);
