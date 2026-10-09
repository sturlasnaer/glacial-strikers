import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
globalThis.document={baseURI:'https://puckbound.test/'};
let ps=false;Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[{id:ps?'DualShock PlayStation':'Xbox Wireless Controller'}]},configurable:true});
const {keyCap,controlsHtml}=await import('../src/ui.js');
const {setPadMap,setKeyMap}=await import('../src/keys.js');
const {Assets}=await import('../src/assets.js');
Assets.atlas=JSON.parse(readFileSync(new URL('../assets/gfx/atlas.json',import.meta.url)));let cases=0;
const keyboard=Object.entries(JSON.parse(readFileSync(new URL('../assets/gfx/ui-kit/ui-kit.json',import.meta.url))).pieces).filter(([id,j])=>id.startsWith('key_')&&j.label).map(([id,j])=>({id,label:j.label}));
assert.equal(keyboard.length,38);
for(const j of keyboard){const html=keyCap(j.label);assert.ok(html.includes(j.id+'.png'),j.id);assert.ok(existsSync(new URL('../assets/gfx/ui-kit/images/'+j.id+'.png',import.meta.url)));cases++;}
for(const name of ['F1','Num 8','<unsafe>']){const html=keyCap(name);assert.ok(html.includes('class="keycap"'));assert.ok(!html.includes('<unsafe>'));cases++;}
setKeyMap({a:['KeyB','Backquote'],b:['Digit5','Backspace'],sprint:['Control','Alt']});
const kb=controlsHtml(false);for(const id of ['key_b','key_backquote','key_5','key_backspace','key_ctrl','key_alt']){assert.ok(kb.includes(id+'.png'),id);cases++;}
setPadMap({a:[10,11]});for(ps of [false,true]){const html=controlsHtml(false,true);for(const id of ps?['ps_l3','ps_r3']:['xbox_ls','xbox_rs']){assert.ok(html.includes(id+'.png'),id);assert.ok(existsSync(new URL('../assets/gfx/ui-kit/images/'+id+'.png',import.meta.url)));cases++;}}
setPadMap(null);setKeyMap(null);console.log(JSON.stringify({status:'passed',cases,checks:'native keyboard art selected for remapped keys, punctuation escaping, unknown key fallback, Xbox/PlayStation stick-click prompts in controls'}));
