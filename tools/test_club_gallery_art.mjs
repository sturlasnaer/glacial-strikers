import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACHIEVEMENTS,useAchievementArt} from '../src/achievements.js';
import {FACILITY_IDS} from '../src/facilities.js';
const A=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));let checks=0;
for(const id of FACILITY_IDS){const frames=[1,2,3].map(n=>A.frames[`facilities/${id}_${n}`]);assert.ok(frames.every(Boolean));assert.equal(new Set(frames.map(f=>JSON.stringify(f.slice(0,3)))).size,3);checks+=2;}
for(const [id,w,h]of [['hall/plaque',360,200],['hall/wall',1280,720],['hall/ceremony',1280,720]]){assert.deepEqual(A.frames[id].slice(3,5),[w,h]);assert.equal(A.pages[A.frames[id][0]].group,'gallery');checks+=2;} // (loaded when a screen shows it, not at startup)
for(const id of FACILITY_IDS.map(id=>`facilities/${id}_1`).concat(['press/room','npcs/reporter_tv'])){assert.equal(A.pages[A.frames[id][0]].group,'gallery');checks++;}
useAchievementArt(A.frames);
for(const id of ['breaking-ground','built-to-last','media-darling','raise-the-banner','record-breaker']){const a=ACHIEVEMENTS.find(a=>a.id===id);assert.equal(a.icon,'achievements/'+id.replaceAll('-','_'));assert.ok(A.frames[a.icon]);checks+=2;}
for(const [id,regions]of Object.entries(A.overlay_regions)){if(!id.startsWith('hall/'))continue;const f=A.frames[id];for(const box of Object.values(regions)){assert.ok(box.w>0&&box.h>0&&box.x>=0&&box.y>=0&&box.x+box.w<=f[3]&&box.y+box.h<=f[4]);checks++;}}
console.log(`Club gallery art: ${checks} checks passed`);
