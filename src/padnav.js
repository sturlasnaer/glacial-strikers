// Gamepad control of the menus. Outside a live match the D-pad or left stick moves a
// highlight between buttons, Cross/A presses, Circle/B goes back or closes the pop-up,
// L1/R1 switch hub tabs and the right stick scrolls long panels.
//
// Each screen and pop-up remembers its highlighted button, so redrawing a screen (a filter,
// a purchase) or closing a pop-up puts the highlight back where it was. Inside a scrolling
// panel the highlight walks the whole list before it leaves for the buttons outside it.
// A card marked data-pad-press="<selector>" is one stop: A presses the button inside it.

import { audio } from './audio.js';

const PICKABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]';
const BACK = '[data-close], #s-close, #dlg-skip';

// A selector that finds the same button again after its screen is redrawn.
function keyOf(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const d = Object.keys(el.dataset)[0];
  if (!d) return null;
  return `[data-${d.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${CSS.escape(el.dataset[d])}"]`;
}

const visible = (el) => {
  if (el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden';
};

export class PadNav {
  constructor(app) {
    this.app = app;
    this.prev = new Set(); // buttons held last frame
    this.held = null; // { dir, t } for auto-repeat
    this.used = false;
    this.keys = new WeakMap(); // screen or pop-up -> selector of its highlighted button
    this.lastLayer = null;
    // Enter or Space on a focused card presses its button, as A does
    document.addEventListener('keydown', (e) => {
      const el = document.activeElement;
      if ((e.key === 'Enter' || e.key === ' ') && el && el.dataset && el.dataset.padPress) { e.preventDefault(); this.press(el); }
    });
  }

  // The layer the pad drives: the topmost pop-up, else the menu screen.
  layer() {
    const modals = document.querySelectorAll('.modal-bg');
    return modals.length ? modals[modals.length - 1] : document.getElementById('screen');
  }

  // buttons inside a one-stop card aren't stops of their own
  items(root) { return [...root.querySelectorAll(PICKABLE)].filter((el) => visible(el) && (!el.parentElement.closest('[data-pad-press]'))); }

  // Should the pad drive the menus right now? Not while a match is being played.
  active() {
    const s = this.app.scene;
    return s !== 'match' && s !== 'loading';
  }

  update(dt) {
    const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
    const down = new Set();
    let ax = 0, ay = 0, scroll = 0;
    for (const gp of pads) {
      gp.buttons.forEach((b, i) => { if (b && b.pressed) down.add(i); });
      if (Math.abs(gp.axes[0] || 0) > Math.abs(ax)) ax = gp.axes[0];
      if (Math.abs(gp.axes[1] || 0) > Math.abs(ay)) ay = gp.axes[1];
      if (Math.abs(gp.axes[3] || 0) > Math.abs(scroll)) scroll = gp.axes[3];
    }
    const before = this.prev;
    const pressed = (i) => down.has(i) && !before.has(i);
    const any = [...down].some((i) => !before.has(i));
    this.prev = down;
    if (any) this.app.onPadPress?.(); // wakes the audio, like a click would
    if (!this.active()) { this.held = null; return; }
    if (this.used) this.keepFocus();

    // direction with auto-repeat
    let dir = null;
    if (down.has(12) || ay < -0.6) dir = 'up';
    else if (down.has(13) || ay > 0.6) dir = 'down';
    else if (down.has(14) || ax < -0.6) dir = 'left';
    else if (down.has(15) || ax > 0.6) dir = 'right';
    if (dir) {
      if (!this.held || this.held.dir !== dir) { this.held = { dir, t: 0.32 }; this.move(dir); }
      else if ((this.held.t -= dt) <= 0) { this.held.t = 0.11; this.move(dir); }
    } else this.held = null;

    if (Math.abs(scroll) > 0.25) {
      // the pop-up, else the panel the highlight is in (a hub tab's body), else the screen
      const root = this.layer(), f = this.focused(root);
      const panel = root.querySelector('.modal') || (f && this.scroller(f)) || root.querySelector('#hub-body') || root;
      panel.scrollBy(0, scroll * 900 * dt);
    }
    if (pressed(0)) this.confirm();
    if (pressed(1)) this.back();
    if (pressed(4) || pressed(5)) this.tab(pressed(5) ? 1 : -1);
  }

  mark() {
    if (!this.used) { this.used = true; document.body.classList.add('pad-nav'); }
    // PlayStation or Xbox glyphs on the menu prompts (styles.css)
    const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
    document.body.classList.toggle('pad-ps', pads.some((p) => /dualsense|dualshock|playstation|054c/i.test(p.id)));
  }

  focused(root) {
    const el = document.activeElement;
    return el && root.contains(el) && el.matches(PICKABLE) && visible(el) ? el : null;
  }

  focus(el) {
    if (!el) return;
    this.mark();
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const key = keyOf(el);
    if (key) this.keys.set(this.layer(), key);
  }

  // Keep a highlight on screen: after a redraw, the button that had it; on a new screen or
  // pop-up, its main button.
  keepFocus() {
    const root = this.layer();
    // a new pop-up, or a new screen drawn into the same layer (the title, then the hub)
    const fresh = root !== this.lastLayer || root.firstElementChild !== this.lastScreen;
    this.lastLayer = root; this.lastScreen = root.firstElementChild;
    if (this.focused(root)) return;
    const key = this.keys.get(root);
    let el = key ? root.querySelector(key) : null;
    if (el && !visible(el)) el = null;
    if (!el && fresh) el = this.main(root) || (root.classList.contains('modal-bg') ? this.items(root)[0] : null);
    if (el) this.focus(el);
  }

  // The scrolling panel an element sits in (a hub tab's body, a long pop-up), if any.
  scroller(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowY;
      if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 2) return p;
    }
    return null;
  }

  // Move to the nearest button in that direction (measured from the current one), staying
  // inside the current scrolling panel while it has one that way.
  move(dir) {
    const root = this.layer();
    const list = this.items(root);
    if (!list.length) return;
    const cur = this.focused(root);
    if (!cur) { this.focus(this.main(root) || list[0]); return; }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const nearest = (pool) => {
      let best = null, bestScore = Infinity;
      for (const el of pool) {
        if (el === cur) continue;
        const b = el.getBoundingClientRect();
        const bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const dx = bx - ax, dy = by - ay;
        const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
        const across = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
        if (along <= 4) continue;
        const score = along + across * 2.2;
        if (score < bestScore) { bestScore = score; best = el; }
      }
      return best;
    };
    const box = this.scroller(cur);
    const next = (box && nearest(list.filter((el) => box.contains(el)))) || nearest(list);
    if (next) this.focus(next);
  }

  // A on a button presses it; on a one-stop card, the card's button (or a no if it's off).
  press(el) {
    const sel = el.dataset && el.dataset.padPress;
    if (!sel) { el.click(); return; }
    const inner = el.querySelector(sel);
    if (inner && !inner.disabled) inner.click(); else audio.sfx('deny');
  }

  confirm() {
    const app = this.app;
    if (app.scene === 'dialogue' && app.ui.dialogueAdvance && !document.querySelector('.modal-bg')) { app.ui.dialogueAdvance(); return; }
    const root = this.layer();
    const cur = this.focused(root);
    if (cur) { this.press(cur); return; }
    // nothing highlighted yet: the screen's main action, else the first button
    const main = this.main(root);
    if (main) main.click();
    else this.focus(this.items(root)[0]);
  }

  // the screen's main action: start, play, continue (in that order of preference)
  main(root) {
    for (const sel of ['#t-start', '#h-play', '#h-season', '#r-go', '.btn.gold:not([disabled])']) {
      const el = [...root.querySelectorAll(sel)].find((e) => visible(e) && !e.parentElement.closest('[data-pad-press]'));
      if (el) return el;
    }
    return null;
  }

  back() {
    const top = document.querySelectorAll('.modal-bg');
    const m = top[top.length - 1];
    if (m) {
      const close = [...m.querySelectorAll(BACK)].find(visible);
      if (close) close.click();
      else m.dispatchEvent(new MouseEvent('click', { bubbles: true })); // like tapping outside it
      return;
    }
    const root = this.layer();
    const skip = root.querySelector('#dlg-skip');
    if (skip && visible(skip)) { skip.click(); return; }
    const room = root.querySelector('.room-tab');
    if (room && visible(room)) room.click();
  }

  // L1 / R1: previous or next hub tab
  tab(step) {
    const root = this.layer();
    const tabs = [...root.querySelectorAll('.tab[data-tab]')].filter(visible);
    if (tabs.length < 2) return;
    let i = tabs.findIndex((t) => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true');
    i = (i < 0 ? 0 : i + step + tabs.length) % tabs.length;
    tabs[i].click();
    setTimeout(() => this.focus(this.layer().querySelector(`.tab[data-tab="${tabs[i].dataset.tab}"]`)), 0);
  }
}
