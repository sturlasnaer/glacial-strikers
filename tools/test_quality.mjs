// Auto-quality: steps down when matches run slow, back up with headroom, remembers per device.
//   node tools/test_quality.mjs
import { Quality, STEPS } from '../src/quality.js';

let ok = 0, fail = 0;
const check = (name, cond, info) => { if (cond) ok++; else { fail++; console.log('FAIL', name, info ?? ''); } };
const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };
const run = (q, fps, secs, t0 = 0) => { let changed = 0; for (let t = 0; t < secs; t += 1 / fps) if (q.update(1 / fps, t0 + t)) changed++; return changed; };

const store = mem();
const q = new Quality(store);
check('starts at full detail', q.level === 0 && q.step.dpr === 2);
run(q, 60, 30);
check('stays there at 60 fps', q.level === 0);
run(q, 30, 2.6);
check('one step down after two slow seconds', q.level === 1, q.level);
run(q, 30, 20);
check('keeps stepping while slow', q.level >= 4, q.level);
check('never past the last step', (run(q, 20, 60), q.level === STEPS.length - 1));
const back = new Quality(store);
check('a device remembers', back.level === STEPS.length - 1);
run(back, 60, 13, 100);
check('back up a step with headroom', back.level === STEPS.length - 2, back.level);
run(back, 30, 3, 114);
check('too slow right after: that level is out of reach', back.level === STEPS.length - 1 && back.floor === STEPS.length - 1, [back.level, back.floor]);
run(back, 60, 60, 200);
check('and it stays put', back.level === STEPS.length - 1);
check('pauses and hiccups don\'t count', (() => { const z = new Quality(mem()); z.update(0.5, 0); z.update(0.5, 1); return z.level === 0; })());

console.log(`quality: ${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
