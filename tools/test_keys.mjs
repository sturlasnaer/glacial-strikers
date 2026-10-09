// The keyboard map (Settings › Keyboard): the defaults, binding with swaps, the keys that
// can't be taken, either side's Shift, and the names the hints use.
//   node tools/test_keys.mjs
import { ACTIONS, DEFAULT_KEYS, resolveKeys, bindKey, isKey, setKeyMap, keyMap, keyName, keyNames, firstKey, moveGroups, groupText, isDefault, canBind } from '../src/keys.js';

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

console.log(`keys: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
