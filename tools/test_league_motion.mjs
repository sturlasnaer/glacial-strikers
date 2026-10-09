import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
const root=new URL('../',import.meta.url);
const {Renderer}=await import(new URL('src/render.js',root));
const {Assets}=await import(new URL('src/assets.js',root));
const {toScreen,persp}=await import(new URL('src/rink.js',root));
const A=JSON.parse(readFileSync(new URL('assets/gfx/atlas.json',root)));Assets.atlas=A;
const keys=['aurora_royals_c','aurora_royals_w','aurora_royals_d','ember_comets_c','ember_comets_w','ember_comets_d','gilded_rams_c','gilded_rams_w','gilded_rams_d','obsidian_ravens_c','obsidian_ravens_w','obsidian_ravens_d','pinewood_lynx_c','pinewood_lynx_w','pinewood_lynx_d','glacier_owls_c','thunder_moose_c','fenrir'];
const mirror={south:'south',southeast:'southwest',east:'west',northeast:'northwest',north:'north',northwest:'northeast',west:'east',southwest:'southeast'};let cases=0;
const s0={speed:120,stun:0,celebrate:0,ultWindup:0,dashT:0,charging:false,state:'skate',stridePhase:0,danglePhase:.25,turnRate:0,hasPuck:true,x:20,y:-15,lean:.12};
for(const key of keys)for(const kit of ['home','away']){
 const set=A.skaters[key][kit];assert.equal(Object.keys(set.crossover.hands).length,6);assert.ok(set.stickhandling,key+' '+kit+' stick handling');assert.equal(Object.keys(set.stickhandling.hands).length,8);
 for(const dir of Object.keys(mirror))for(const hand of ['L','R']){
  const own=Object.values(set.crossover.hands)[0],flip=hand!==own,facing=flip?mirror[dir]:dir,s={...s0,hand};
  const frame=state=>Renderer.prototype.motionFrame.call({}, {...s,...state},{state:'play'},set,dir);
  if(set.stickhandling)for(const [phase,pose]of [[.25,'forehand'],[.75,'backhand']]){
   const fr=frame({danglePhase:phase});assert.equal(fr.id,set.stickhandling[facing][pose]);assert.equal(fr.flip,flip);assert.equal(fr.pose,'handling');assert.ok(A.frames['gm:'+fr.id]);
   const actual=Renderer.prototype.puckSpritePoint.call({skaterFrame:()=>fr},s,{state:'play'}),f=A.frames[fr.id],b=A.motion_blades[fr.id],p=toScreen(s.x,s.y),k=.5*persp(s.y)/f[7],dy=(b.y-f[6])*k;
   assert.equal(actual.x,p.x+(b.x-f[5])*k*(flip?-1:1)-s.lean*dy);assert.equal(actual.y,p.y+dy);cases++;
  }
  if(set.stickhandling){assert.equal(frame({protect:1}).id,set.stickhandling[facing].backhand);cases++;}
  if(set.crossover[facing])for(const sign of [-1,1])for(const phase of [0,1]){
   const fr=frame({turnRate:sign*6,stridePhase:phase,hasPuck:false});let turn=sign>0?'right':'left';if(flip)turn=turn==='right'?'left':'right';assert.equal(fr.id,set.crossover[facing][turn][phase]);assert.equal(fr.flip,flip);assert.ok(A.frames['gm:'+fr.id]);cases++;
  }
  else assert.equal(frame({turnRate:6,hasPuck:false}),null);
  for(const state of [{stun:.2},{state:'shoot'},{state:'pass'},{state:'check'},{dashT:.2},{ultWindup:.2},{charging:true,chargeT:.3},{stopping:true}]){assert.equal(frame(state),null);cases++;}
 }
}
assert.equal(A.skaters.fenrir.home.crossover.hands.east,'L');
const restored=A.skaters.frost_captain.away.south.frames;assert.equal(Object.keys(restored).length,8);for(const [pose,id]of Object.entries(restored)){assert.ok(A.frames[id],pose);assert.equal(id,'frost_captain_variant/away_south/'+pose);cases++;}
for(const call of ['hooking','penalty_shot']){assert.equal(A.linesman.calls[call].length,2);for(const fid of A.linesman.calls[call]){assert.ok(A.frames[fid]);assert.equal(A.pages[A.frames[fid][0]].group,'linesman');cases++;}}
for(const icon of ['sold_it','off_the_drop','from_the_spot']){const f=A.frames['achievements/'+icon];assert.ok(f);assert.equal(A.pages[f[0]].group,'icons_z');cases++;}
const draw=Assets.draw;const calls=[];Assets.draw=(_,id)=>calls.push(id);
for(let style=0;style<6;style++){Renderer.prototype.drawHat.call({}, {},{style,y:0,rot:0},{x:0,y:0});assert.equal(calls.at(-1),'crowd_props/hats/hat_'+(style+1));const f=A.frames[calls.at(-1)];assert.equal(A.pages[f[0]].group,'home');cases++;}Assets.draw=draw;
console.log(JSON.stringify({status:'passed',cases,checks:'every league player with crossovers and stick handling, both kits and hands, native handedness, mirrored crossovers, all blade contacts with turn lean, action priorities, recovered away poses, icons, signals and six rendered hats'}));
