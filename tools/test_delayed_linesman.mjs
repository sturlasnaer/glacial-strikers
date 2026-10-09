import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {Linesman} from '../src/linesman.js';
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url))),L=A.linesman,U=L.delayed,l=new Linesman();let cases=0;
const m={state:'play',stateT:0,puck:{x:0,y:0,vx:0,vy:0},pendingPenalty:{announced:true}};
for(const [vx,vy,id,flip]of [[60,0,U.glides.east,false],[-60,0,U.glides.east,true],[0,-60,U.glides.north,false],[0,60,U.glides.south,false]]){l.vx=vx;l.vy=vy;assert.deepEqual(l.frame(m,L),{id,flip});cases++;}
for(const vx of [-160,160])for(let i=0;i<4;i++){l.vx=vx;l.vy=0;l.t=(i+.1)/(3+160/60);assert.deepEqual(l.frame(m,L),{id:U.stride[i],flip:vx<0});cases++;}
l.vx=l.vy=0;assert.equal(l.frame(m,L).id,L.calls.penalty[0]);cases++;
l.update(.016,m);m.pendingPenalty=null;m.state='penalty';m.penaltyReason='hooking';l.vx=-100;l.update(.016,m);assert.deepEqual(l.frame(m,L),{id:U.stop,flip:true});cases++;
l.update(.3,m);assert.ok(L.calls.hooking.includes(l.frame(m,L).id));cases++;
m.state='goal';m.stateT=0;m.washedOut=true;assert.ok(L.calls.washout.includes(l.frame(m,L).id));cases++;
m.washedOut=false;assert.equal(l.frame(m,L).id,L.calls.goal);cases++;
m.state='faceoff';m.stateT=0;assert.ok(L.faceoff.ready.includes(l.frame(m,L).id));cases++;
for(const id of [...U.stride,...Object.values(U.glides),U.stop]){assert.ok(A.frames[id]);assert.equal(A.pages[A.frames[id][0]].group,'linesman');cases++;}
const fallback={...L,delayed:null};m.state='play';m.pendingPenalty={announced:true};l.vx=100;l.vy=0;assert.equal(l.frame(m,fallback).id,L.calls.penalty[0]);cases++;
console.log(JSON.stringify({status:'passed',cases,checks:'raised arm through stride/glides both ways, whistle stop transition and timer, penalty/goal/washout/faceoff priorities, missing art fallback'}));
