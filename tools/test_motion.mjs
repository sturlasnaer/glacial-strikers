import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const root=new URL('../',import.meta.url);
const D=await import(new URL('src/data.js',root));
const M=await import(new URL('src/modular.js',root));
const {Renderer}=await import(new URL('src/render.js',root));
const {Assets}=await import(new URL('src/assets.js',root));
const {Replay}=await import(new URL('src/replay.js',root));
const {toScreen,persp}=await import(new URL('src/rink.js',root));
const A=JSON.parse(readFileSync(new URL('assets/gfx/atlas.json',root)));Assets.atlas=A;
M.useModular(A);D.useCaptainArt(k=>!!A.skaters[k]);
let cases=0;
for(const team of ['lynx','comets','rams','ravens','royals','owls','moose'])for(const kit of ['frost','thunder','stone']){
 const who=D.recruitKey(team,kit),r=D.RECRUITS[who];if(!r)continue;
 assert.equal(D.slotDef(team,kit).hand,r.hand);assert.equal(D.member(who).def.hand,r.hand);
 D.setStyles({[who]:{arch:'sniper',elem:'gale'}});assert.equal(D.member(who).def.hand,r.hand);D.setStyles({});cases++;
}
for(const [team,key] of [['owls','glacier_owls_c'],['moose','thunder_moose_c']]){assert.equal(D.slotSprite(team,'frost'),key);assert.equal(D.slotLook(team,'frost'),null);}
const mirror={south:'south',southeast:'southwest',east:'west',northeast:'northwest',north:'north',northwest:'northeast',west:'east',southwest:'southeast'};
const s0={speed:120,stun:0,celebrate:0,ultWindup:0,dashT:0,charging:false,state:'skate',stridePhase:0,danglePhase:.25,turnRate:0,hasPuck:true,x:20,y:-15};
for(const key of ['frost_captain','thunder_winger','stone_defender','body_std','body_big','body_small','newcomer_c','newcomer_w','newcomer_d']){
 const kit=key.startsWith('newcomer')?'away':'home',set=A.skaters[key][kit],own=key==='thunder_winger'?'R':'L';
 for(const dir of Object.keys(mirror))for(const hand of ['L','R']){
  const flip=hand!==own,facing=flip?mirror[dir]:dir,s={...s0,hand,parts:key.startsWith('body')?{}:null};
  const frame=state=>Renderer.prototype.motionFrame.call({}, {...s,...state},{state:'play'},set,dir);
  for(const [phase,pose] of [[.25,'forehand'],[.75,'backhand']]){
   const fr=frame({danglePhase:phase});assert.equal(fr.id,set.stickhandling[facing][pose]);assert.equal(fr.flip,flip);assert.equal(frame({danglePhase:phase,protect:1}).id,set.stickhandling[facing].backhand);
   const actual=Renderer.prototype.puckSpritePoint.call({skaterFrame:()=>fr},s,{state:'play'}),f=A.frames[fr.id],b=A.motion_blades[fr.id],p=toScreen(s.x,s.y),k=.5*persp(s.y)*(s.parts?M.PARTS_SCALE.body:1)/f[7];
   assert.equal(actual.x,p.x+(b.x-f[5])*k*(flip?-1:1));assert.equal(actual.y,p.y+(b.y-f[6])*k);
   if(s.parts){const look={head:Object.keys(A.modular.heads)[0]};const hp=M.headPlacement(A.modular,look,fr.id,f,p.x,p.y,.5*persp(s.y)*M.PARTS_SCALE.body,flip);assert.ok(hp&&A.frames[hp.head]);}cases++;
  }
  if(set.crossover[facing])for(const sign of [-1,1])for(const phase of [0,1]){
   const fr=frame({turnRate:sign*6,stridePhase:phase,hasPuck:false});let turn=sign>0?'right':'left';if(flip)turn=turn==='right'?'left':'right';assert.equal(fr.id,set.crossover[facing][turn][phase]);assert.equal(fr.flip,flip);cases++;
  }
  else assert.equal(frame({turnRate:6,hasPuck:false}),null);
  assert.equal(frame({turnRate:4,hasPuck:false}),null); // (a gentle curve: no crossover)
  for(const state of [{stun:.2},{state:'shoot'},{state:'pass'},{state:'check'},{dashT:.2},{ultWindup:.2},{charging:true,chargeT:.3},{stopping:true}])assert.equal(frame(state),null);
  assert.equal(frame({speed:300,gliding:false,hasPuck:true}),null);cases+=9;
 }
}
const id=A.skaters.frost_captain.home.south.frames.idle;assert.equal(Renderer.prototype.puckSpritePoint.call({skaterFrame:()=>({id,flip:false})},s0,{}),null);
const replay=new Replay(),rs={...s0,turnRate:-2},rm={skaters:[rs],goalies:[],puck:{x:0,y:0,z:0,vx:0,vy:0,owner:rs,trail:[]},trails:[],barriers:[]};
replay.record(rm);rs.turnRate=3;replay.record(rm);replay.frames=replay.buf;replay.t=0;replay.apply(rm);assert.equal(rs.turnRate,-2);assert.equal(rs.danglePhase,.25);cases++;
for(const [fid,anchor]of Object.entries(A.modular.anchors))if(A.motion_blades[fid])for(const head of Object.keys(A.modular.heads))for(const flip of [false,true]){
 const p=M.headPlacement(A.modular,{head},fid,A.frames[fid],0,0,.525,flip);assert.ok(p&&A.frames[p.head]);cases++;
}
const result={status:'passed',cases,checks:'own/opposite hands, fore/back sweep, mirrored turn direction, phase selection, action priorities, all new puck contacts and modular anchors, roster and styled hands, captain selection, legacy fallback'};
console.log(JSON.stringify(result));
