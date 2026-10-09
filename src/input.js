// Keyboard, gamepad and touch controls merged into one raw input state:
// { mx, my, sprint, a, b, skill, ult, pause }
//   a = shoot (hold to charge) / check     b = pass / switch player
// The keyboard's keys come from keys.js (the defaults, or the player's own from Settings).
import { ACTIONS, keyMap, isKey } from './keys.js';

// Local versus: player 1 on the left of the keyboard, player 2 around the arrows.
export const SPLIT = {
  p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyF'], b: ['KeyG'], sprint: ['ShiftLeft'], skill: ['KeyR'], ult: ['KeyT'] },
  p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['KeyK', 'Slash', 'Numpad0'], b: ['KeyL', 'Period', 'NumpadDecimal'], sprint: ['ShiftRight', 'Semicolon'], skill: ['KeyO'], ult: ['KeyP'] },
};

export function mergeInputs(x, y) {
  if (!y) return x;
  const out = { ...x };
  if (Math.hypot(y.mx, y.my) > Math.hypot(x.mx, x.my)) { out.mx = y.mx; out.my = y.my; }
  for (const k of ['a', 'b', 'sprint', 'skill', 'ult', 'pause']) out[k] = !!(x[k] || y[k]);
  return out;
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false, pause: false, pull: false };
    this.lastDevice = 'keyboard';
    this.listeners = [];
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      // (the game's keys don't scroll the page or open the browser's quick find; Enter still
      // presses buttons, and with Cmd, Ctrl or Alt held a key is the browser's)
      const ours = !e.metaKey && !e.ctrlKey && !e.altKey && e.code !== 'Enter' && ACTIONS.some((a) => isKey(a, e.code));
      if (ours || ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.listeners.forEach((f) => f(e.code));
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  onKey(f) { this.listeners.push(f); }

  // Gamepad rumble. pad = index of one pad, or null for every connected pad.
  rumble(strong, weak, ms, pad = null) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || (pad !== null && gp.index !== pad)) continue;
      const act = gp.vibrationActuator;
      if (act && act.playEffect) act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {});
    }
  }

  // Is one of an action's keys down? ('Shift' is either Shift.)
  key(name) { return keyMap()[name].some((k) => k && (/^(Shift|Control|Alt)$/.test(k) ? this.keys.has(k + 'Left') || this.keys.has(k + 'Right') : this.keys.has(k))); }

  // Connected gamepads in index order.
  pads() { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); }

  // One gamepad's state in the raw input shape.
  readPad(gp) {
    const st = { mx: 0, my: 0, a: false, b: false, sprint: false, skill: false, ult: false, pause: false };
    if (!gp) return st;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const mag = Math.hypot(ax, ay);
    const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    if (mag > 0.2) { const k = Math.min(1, (mag - 0.2) / 0.7) / mag; st.mx = ax * k; st.my = ay * k; }
    if (btn(14)) st.mx = -1; if (btn(15)) st.mx = 1; if (btn(12)) st.my = -1; if (btn(13)) st.my = 1;
    st.a = btn(2) || btn(7); st.b = btn(0); st.sprint = btn(5) || btn(6); st.skill = btn(1) || btn(4); st.ult = btn(3); st.pause = btn(9);
    return st;
  }

  // Split-keyboard layouts for local versus.
  readLayout(layout) {
    const L = SPLIT[layout];
    const has = (codes) => codes.some((c) => this.keys.has(c));
    let mx = (has(L.right) ? 1 : 0) - (has(L.left) ? 1 : 0);
    let my = (has(L.down) ? 1 : 0) - (has(L.up) ? 1 : 0);
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
    return { mx, my, a: has(L.a), b: has(L.b), sprint: has(L.sprint), skill: has(L.skill), ult: has(L.ult), pause: this.keys.has('Escape') };
  }

  read() {
    let mx = 0, my = 0;
    if (this.key('left')) mx -= 1;
    if (this.key('right')) mx += 1;
    if (this.key('up')) my -= 1;
    if (this.key('down')) my += 1;
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
    const st = {
      mx, my,
      a: this.key('a'), b: this.key('b'), sprint: this.key('sprint'),
      skill: this.key('skill'), ult: this.key('ult'), pause: this.key('pause'), pull: this.key('pull'),
    };
    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const mag = Math.hypot(ax, ay);
      const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      let used = false;
      if (mag > 0.2) { const k = Math.min(1, (mag - 0.2) / 0.7) / mag; st.mx = ax * k; st.my = ay * k; used = true; }
      if (btn(14)) { st.mx = -1; used = true; } if (btn(15)) { st.mx = 1; used = true; }
      if (btn(12)) { st.my = -1; used = true; } if (btn(13)) { st.my = 1; used = true; }
      if (btn(2) || btn(7)) { st.a = true; used = true; } // X / RT: shoot-check
      if (btn(0)) { st.b = true; used = true; } // A: pass-switch
      if (btn(5) || btn(6)) { st.sprint = true; used = true; } // RB/LT sprint
      if (btn(1) || btn(4)) { st.skill = true; used = true; } // B/LB skill
      if (btn(3)) { st.ult = true; used = true; } // Y ult
      if (btn(9)) { st.pause = true; used = true; }
      if (btn(8)) { st.pull = true; used = true; }
      if (used) this.lastDevice = 'gamepad';
    }
    // touch
    const t = this.touch;
    if (Math.hypot(t.mx, t.my) > 0.05) { st.mx = t.mx; st.my = t.my; }
    st.a ||= t.a; st.b ||= t.b; st.sprint ||= t.sprint; st.skill ||= t.skill; st.ult ||= t.ult; st.pause ||= t.pause; st.pull ||= t.pull;
    return st;
  }
}

// On-screen joystick (left half) and action buttons (right side).
export class TouchControls {
  constructor(root, input, opts = {}) {
    this.root = root;
    this.input = input;
    this.stick = root.querySelector('.stick');
    this.knob = root.querySelector('.stick-knob');
    this.zone = root.querySelector('.stick-zone');
    this.stickId = null;
    this.origin = { x: 0, y: 0 };
    this.radius = 56;
    this.onFirstTouch = opts.onFirstTouch;

    this.zone.addEventListener('pointerdown', (e) => this.stickDown(e));
    window.addEventListener('pointermove', (e) => this.stickMove(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.stickUp(e));
    window.addEventListener('pointercancel', (e) => this.stickUp(e));

    root.querySelectorAll('[data-btn]').forEach((el) => {
      const name = el.dataset.btn;
      const down = (e) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        this.input.touch[name] = true;
        el.classList.add('down');
        this.input.lastDevice = 'touch';
        navigator.vibrate?.(8);
      };
      const up = (e) => {
        e.preventDefault();
        this.input.touch[name] = false;
        el.classList.remove('down');
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  stickDown(e) {
    if (this.stickId !== null) return;
    e.preventDefault();
    this.stickId = e.pointerId;
    this.origin = { x: e.clientX, y: e.clientY };
    this.stick.style.left = e.clientX + 'px';
    this.stick.style.top = e.clientY + 'px';
    this.stick.classList.add('active');
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.input.lastDevice = 'touch';
    this.onFirstTouch?.();
  }

  stickMove(e) {
    if (e.pointerId !== this.stickId) return;
    e.preventDefault();
    let dx = e.clientX - this.origin.x, dy = e.clientY - this.origin.y;
    const d = Math.hypot(dx, dy);
    // drag the base along when the thumb overshoots
    if (d > this.radius * 1.4) {
      const k = (d - this.radius * 1.4) / d;
      this.origin.x += dx * k; this.origin.y += dy * k;
      this.stick.style.left = this.origin.x + 'px';
      this.stick.style.top = this.origin.y + 'px';
      dx = e.clientX - this.origin.x; dy = e.clientY - this.origin.y;
    }
    const dd = Math.hypot(dx, dy);
    const cl = Math.min(dd, this.radius);
    const nx = dd ? dx / dd : 0, ny = dd ? dy / dd : 0;
    this.knob.style.transform = `translate(calc(-50% + ${nx * cl}px), calc(-50% + ${ny * cl}px))`;
    const mag = Math.min(1, Math.max(0, (dd - 6) / (this.radius - 6)));
    this.input.touch.mx = nx * mag;
    this.input.touch.my = ny * mag;
  }

  stickUp(e) {
    if (e.pointerId !== this.stickId) return;
    this.stickId = null;
    this.input.touch.mx = 0; this.input.touch.my = 0;
    this.stick.classList.remove('active');
    this.knob.style.transform = 'translate(-50%, -50%)';
  }

  reset() {
    for (const k of ['a', 'b', 'sprint', 'skill', 'ult', 'pause', 'pull']) this.input.touch[k] = false;
    this.input.touch.mx = 0; this.input.touch.my = 0;
    this.stickId = null;
    this.stick.classList.remove('active');
    this.root.querySelectorAll('.down').forEach((el) => el.classList.remove('down'));
  }
}
