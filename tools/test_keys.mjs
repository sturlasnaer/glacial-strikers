// The keyboard and gamepad maps (Settings › Keyboard and › Gamepad): the defaults, binding
// with swaps, the keys and buttons that can't be taken, either side's Shift, and the names.
//   node tools/test_keys.mjs
import { ACTIONS, DEFAULT_KEYS, resolveKeys, bindKey, isKey, setKeyMap, keyMap, keyName, keyNames, firstKey, moveGroups, groupText, isDefault, canBind,
  PAD_ACTIONS, DEFAULT_PAD, resolvePad, bindPad, setPadMap, padMap, padName, padNames, firstPad, isPadDefault, canBindPad } from '../src/keys.js';

let pass = 0, fail = 0;
const check = (name, cond, info) => { if (cond) pass++; else { fail++; console.log('✗', name, info ?? ''); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const codes = (map) => ACTIONS.flatMap((a) => map[a]).filter(Boolean);

// the defaults
{
  const m = resolveKeys(null);
  check('defaults: as they came', same(m, DEFAULT_KEYS) && isDefault(m));
  check('...no key does two things', new Set(codes(m)).size === codes(m).length);
  check('...names', firstKey('a', m) === 'J' && keyNames('a', m) === 'J / Space' && keyNames('sprint', m) === 'Shift / L' && keyNames('pull', m) === 'H' && firstKey('pause', m) === 'Esc');
  const g = moveGroups(m);
  check('...skating: WASD and the arrows', g.length === 2 && groupText(g[0]) === 'WASD' && g[1] === 'arrows', g);
  check('...either Shift sprints', isKey('sprint', 'ShiftLeft', m) && isKey('sprint', 'ShiftRight', m) && !isKey('sprint', 'ControlLeft', m));
}

// binding
{
  let c = bindKey({}, 'a', 0, 'KeyF');
  check('bind: a free key', same(c, { a: ['KeyF', 'Space'] }), c);
  c = bindKey({}, 'a', 0, 'KeyK');
  check('...a key in use swaps over', same(c, { a: ['KeyK', 'Space'], b: ['KeyJ', 'Enter'] }), c);
  check('...the same key again changes nothing', same(bindKey({}, 'a', 0, 'KeyJ'), {}));
  check('...the other Shift is the same key', same(bindKey({}, 'sprint', 0, 'ShiftRight'), {}));
  c = bindKey({}, 'pull', 1, 'KeyH');
  check('...to its own other slot: moves there', same(resolveKeys(c).pull, [null, 'KeyH']), c);
  c = bindKey({}, 'skill', 1, 'KeyU');
  check('...its own first key to its second: they swap', same(resolveKeys(c).skill, ['KeyQ', 'KeyU']), c);
  check('...Esc can\'t be taken, nor moved off pause', bindKey({}, 'a', 0, 'Escape') === null && bindKey({}, 'pause', 0, 'KeyX') === null);
  check('...nor the browser\'s keys', ['Tab', 'F5', 'F11', 'MetaLeft', 'CapsLock'].every((k) => !canBind(k) && bindKey({}, 'a', 1, k) === null));
  check('...an unknown action', bindKey({}, 'dance', 0, 'KeyX') === null);
  check('...P can go elsewhere (pause keeps Esc)', same(resolveKeys(bindKey({}, 'a', 1, 'KeyP')).pause, ['Escape', 'Space']));
}

// ESDF, three swaps on the way
{
  let c = {};
  for (const [a, k] of [['up', 'KeyE'], ['left', 'KeyS'], ['down', 'KeyD'], ['right', 'KeyF']]) c = bindKey(c, a, 0, k);
  const m = resolveKeys(c);
  check('ESDF: skating reads ESDF', groupText(moveGroups(m)[0]) === 'ESDF', moveGroups(m));
  check('...still one key, one job', new Set(codes(m)).size === codes(m).length, m);
  check('...the arrows stay', moveGroups(m)[1] === 'arrows');
  setKeyMap(c);
  check('...the map in use follows', isKey('up', 'KeyE') && !isKey('up', 'KeyW') && keyMap().up[0] === 'KeyE');
  setKeyMap(null);
  check('...and back', isDefault() && isKey('up', 'KeyW'));
}

// any sequence of binds keeps one job a key, and Esc on pause
{
  let seed = 7;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const pool = ['KeyA', 'KeyB', 'KeyJ', 'KeyK', 'Space', 'Enter', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowLeft', 'KeyW', 'KeyH', 'Digit1', 'Numpad5', 'Semicolon', 'KeyP', 'Escape', 'Tab'];
  let c = {}, ok = true, bad = null;
  for (let i = 0; i < 2000 && ok; i++) {
    const n = bindKey(c, ACTIONS[rnd(ACTIONS.length)], rnd(2), pool[rnd(pool.length)]);
    if (n) c = n;
    const m = resolveKeys(c);
    if (new Set(codes(m)).size !== codes(m).length || m.pause[0] !== 'Escape' || codes(m).some((k) => !canBind(k) && k !== 'Escape')) { ok = false; bad = m; }
  }
  check('fuzz: 2000 binds, one job a key, Esc pauses', ok, bad);
}

// a save from somewhere else: whatever's in it, the map is sane
{
  const m = resolveKeys({ a: 'KeyF', b: [1, 2], up: ['Escape', 'Tab'], pause: ['KeyX', 'KeyY'], sprint: ['KeyL'] });
  check('odd saves: not a list, the defaults', same(m.a, DEFAULT_KEYS.a));
  check('...junk codes come out empty', same(m.b, [null, null]) && same(m.up, [null, null]));
  check('...pause keeps Esc', same(m.pause, ['Escape', 'KeyY']));
  check('...a short list', same(m.sprint, ['KeyL', null]));
  check('...an empty action names a dash', keyNames('b', m) === '—' && firstKey('b', m) === '—');
}

// names
check('names: digits, the numpad, punctuation, arrows', keyName('Digit4') === '4' && keyName('Numpad8') === 'Num 8' && keyName('NumpadAdd') === 'Num +' && keyName('Semicolon') === ';' && keyName('ArrowLeft') === '←' && keyName('ControlLeft') === 'ControlLeft' && keyName('Control') === 'Ctrl');

// the gamepad: button 0 (A) is a button like any other, the D-pad and Start stay put
{
  const pads = (map) => PAD_ACTIONS.flatMap((a) => map[a]).filter((b) => b != null);
  const m = resolvePad(null);
  check('pad: defaults', same(m, DEFAULT_PAD) && isPadDefault(m) && new Set(pads(m)).size === pads(m).length);
  check('...names, Xbox and PlayStation', padNames('a', false, m).join() === 'X,RT' && padNames('a', true, m).join() === '□,R2' && firstPad('b', false, m) === 'A' && firstPad('pull', true, m) === 'Create');
  let c = bindPad({}, 'a', 0, 0);
  check('...shoot on A: pass takes X', same(resolvePad(c).a, [0, 7]) && same(resolvePad(c).b, [2, null]), c);
  c = bindPad({}, 'ult', 1, 10);
  check('...a stick click on a free slot', same(resolvePad(c).ult, [3, 10]), c);
  c = bindPad({}, 'b', 1, 0);
  check('...A to its own empty second slot: moves there', same(resolvePad(c).b, [null, 0]), c);
  check('...the D-pad, Home and Start can\'t be taken', [12, 13, 14, 15, 16].every((b) => !canBindPad(b) && bindPad({}, 'a', 1, b) === null) && bindPad({}, 'a', 1, 9) === null && bindPad({}, 'pause', 0, 3) === null);
  check('...nor anything that isn\'t a button', bindPad({}, 'a', 1, 'KeyJ') === null && bindPad({}, 'a', 1, -1) === null && bindPad({}, 'a', 1, 2.5) === null);
  setPadMap(bindPad({}, 'sprint', 0, 7));
  check('...the map in use follows', padMap().sprint[0] === 7 && padMap().a.join() === '2,5' && !isPadDefault());
  setPadMap(null);
  check('...and back', isPadDefault());
  check('...odd saves come out sane', same(resolvePad({ a: [99, 'x'], pause: [3, 4] }).a, [null, null]) && same(resolvePad({ pause: [3, 4] }).pause, [9, 4]));
  let seed = 3, ok = true;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0, cc = {}; i < 2000 && ok; i++) {
    const n = bindPad(cc, PAD_ACTIONS[rnd(PAD_ACTIONS.length)], rnd(2), rnd(18));
    if (n) cc = n;
    const mm = resolvePad(cc);
    ok = new Set(pads(mm)).size === pads(mm).length && mm.pause[0] === 9 && pads(mm).every((b) => b === 9 || canBindPad(b));
  }
  check('...fuzz: 2000 binds, one job a button, Start pauses', ok);
  check('...a name for every button', [...Array(17).keys()].every((b) => padName(b) && padName(b, true)) && padName(null) === '—');
}

console.log(`keys: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
