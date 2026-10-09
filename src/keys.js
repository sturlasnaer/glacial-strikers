// The keyboard and gamepad maps: which keys and buttons skate, shoot, pass and so on. The
// player's own choices (Settings › Keyboard and › Gamepad, kept as save.settings.keys and
// .pad) go over the defaults, two an action. Key codes are the physical keys
// (KeyboardEvent.code); 'Shift', 'Control' and 'Alt' stand for either side's. Buttons are the
// standard gamepad mapping's numbers. Local versus keeps its fixed split layout (input.js SPLIT).

// The map in use: the defaults with the player's choices over them (a slot that isn't usable
// comes out empty; a locked slot keeps its default).
function resolveWith(S, custom) {
  const map = {};
  for (const a of S.actions) {
    const c = custom && Array.isArray(custom[a]) ? custom[a] : null;
    map[a] = [0, 1].map((i) => (S.locked[a] === i ? S.defaults[a][i] : c ? (S.ok(c[i]) ? c[i] : null) : S.defaults[a][i]));
  }
  return map;
}
// Put a value on one of an action's two slots. One that was doing something else swaps over:
// it takes this slot's old value (so nothing is lost by accident). Returns the new custom map
// to save (only the actions that differ from the defaults), or null if it can't go there.
function bindWith(S, custom, action, slot, v) {
  if (!S.actions.includes(action) || !S.ok(v) || S.locked[action] === slot) return null;
  const map = resolveWith(S, custom);
  const old = map[action][slot];
  for (const a of S.actions) map[a].forEach((c, i) => { if (c === v && !(a === action && i === slot)) map[a][i] = S.locked[a] === i ? c : old; });
  map[action][slot] = v;
  // (the same on both of an action's slots is just the one)
  for (const a of S.actions) if (map[a][0] != null && map[a][0] === map[a][1]) map[a][1] = null;
  const out = {};
  for (const a of S.actions) if (map[a].some((c, i) => c !== S.defaults[a][i])) out[a] = map[a];
  return out;
}

export const ACTIONS = ['up', 'left', 'down', 'right', 'a', 'b', 'sprint', 'skill', 'ult', 'pull', 'pause'];
export const DEFAULT_KEYS = {
  up: ['KeyW', 'ArrowUp'], left: ['KeyA', 'ArrowLeft'], down: ['KeyS', 'ArrowDown'], right: ['KeyD', 'ArrowRight'],
  a: ['KeyJ', 'Space'], b: ['KeyK', 'Enter'], sprint: ['Shift', 'KeyL'],
  skill: ['KeyU', 'KeyQ'], ult: ['KeyI', 'KeyE'], pull: ['KeyH', null], pause: ['Escape', 'KeyP'],
};
// Esc always pauses (and closes pop-ups); these can't be taken: the browser and the system use them
export const LOCKED = { pause: 0 };
const RESERVED = /^(Escape|Tab|CapsLock|Meta.*|OS.*|ContextMenu|F\d+|Fn.*|PrintScreen|ScrollLock|Pause|NumLock)$/;
export const canBind = (code) => typeof code === 'string' && !!code && !RESERVED.test(code);

// either side's Shift, Ctrl or Alt counts as one key
export const sideless = (code) => code.replace(/^(Shift|Control|Alt)(Left|Right)$/, '$1');

const KEYS = { actions: ACTIONS, defaults: DEFAULT_KEYS, locked: LOCKED, ok: canBind };
export const resolveKeys = (custom) => resolveWith(KEYS, custom);
let current = resolveKeys(null);
export const keyMap = () => current;
export function setKeyMap(custom) { current = resolveKeys(custom); }
// A key on one of an action's slots (see bindWith).
export const bindKey = (custom, action, slot, code) => bindWith(KEYS, custom, action, slot, typeof code === 'string' ? sideless(code) : code);

// Is a code (as the browser sent it) one of an action's keys?
export function isKey(action, code, map = current) {
  const c = sideless(code);
  return map[action].some((k) => k && k === c);
}

// ------------------------------------------------------------------ names
// The keys' names for hints and the controls page. Letters follow the keyboard's layout
// where the browser says what it is (an AZERTY board's KeyW is Z).
let layout = null;
try { navigator.keyboard?.getLayoutMap?.().then((m) => { layout = m; }, () => {}); } catch {}
const NAMES = {
  Space: 'Space', Enter: 'Enter', Escape: 'Esc', Shift: 'Shift', Control: 'Ctrl', Alt: 'Alt', Backspace: 'Backspace',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Insert: 'Ins', Delete: 'Del', Home: 'Home', End: 'End',
  PageUp: 'PgUp', PageDown: 'PgDn', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', IntlBackslash: '<',
};
export function keyName(code) {
  if (!code) return '—';
  const lay = layout && layout.get(code);
  if (lay && /^(Key|Digit|Semicolon|Quote|Comma|Period|Slash|Backslash|Bracket|Minus|Equal|Backquote|Intl)/.test(code)) return lay.length === 1 ? lay.toUpperCase() : lay;
  if (NAMES[code]) return NAMES[code];
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return m[1];
  if ((m = /^Digit(\d)$/.exec(code))) return m[1];
  if ((m = /^Numpad(.+)$/.exec(code))) return 'Num ' + ({ Decimal: '.', Add: '+', Subtract: '-', Multiply: '*', Divide: '/', Enter: 'Enter' }[m[1]] || m[1]);
  return code;
}

// An action's keys by name ('J / Space'), or just its first ('J').
export const keyNames = (action, map = current) => map[action].filter(Boolean).map(keyName).join(' / ') || '—';
export const firstKey = (action, map = current) => keyName(map[action].find(Boolean));

// The skating keys, a group a slot, each up, left, down, right: [['W', 'A', 'S', 'D'],
// 'arrows'] ('arrows' for the arrow keys, which the caller says in words).
export function moveGroups(map = current) {
  const out = [];
  for (const i of [0, 1]) {
    const codes = ['up', 'left', 'down', 'right'].map((a) => map[a][i]);
    if (!codes.some(Boolean)) continue;
    out.push(codes.join() === 'ArrowUp,ArrowLeft,ArrowDown,ArrowRight' ? 'arrows' : codes.map(keyName));
  }
  return out;
}
// A group as text: 'WASD', or 'Num 8 Num 4 Num 5 Num 6' when the names are longer.
export const groupText = (g) => (g.every((n) => [...n].length === 1) ? g.join('') : g.join(' '));

// Is it all as it came?
export const isDefault = (map = current) => ACTIONS.every((a) => map[a].every((c, i) => c === DEFAULT_KEYS[a][i]));

// ---------------------------------------------------------------- gamepad
// Start always pauses and the D-pad skates and drives the menus, so they can't be taken (nor
// the home button). In the menus A/✕ picks and B/○ goes back whatever's set here.
export const PAD_ACTIONS = ['a', 'b', 'sprint', 'skill', 'ult', 'pull', 'pause'];
export const DEFAULT_PAD = { a: [2, 7], b: [0, null], sprint: [5, 6], skill: [1, 4], ult: [3, null], pull: [8, null], pause: [9, null] };
export const PAD_LOCKED = { pause: 0 };
export const canBindPad = (b) => Number.isInteger(b) && b >= 0 && b <= 11 && b !== 9; // (9: Start)
const PAD = { actions: PAD_ACTIONS, defaults: DEFAULT_PAD, locked: PAD_LOCKED, ok: canBindPad };
export const resolvePad = (custom) => resolveWith(PAD, custom);
let pad = resolvePad(null);
export const padMap = () => pad;
export function setPadMap(custom) { pad = resolvePad(custom); }
export const bindPad = (custom, action, slot, b) => bindWith(PAD, custom, action, slot, b);
export const isPadDefault = (map = pad) => PAD_ACTIONS.every((a) => map[a].every((c, i) => c === DEFAULT_PAD[a][i]));

// The buttons by name, Xbox or PlayStation.
const XBOX = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home'];
const PS = ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'PS'];
export const padName = (b, ps = false) => (b == null ? '—' : (ps ? PS : XBOX)[b] || 'B' + b);
export const padNames = (action, ps = false, map = pad) => map[action].filter((b) => b != null).map((b) => padName(b, ps));
export const firstPad = (action, ps = false, map = pad) => padName(map[action].find((b) => b != null), ps);
