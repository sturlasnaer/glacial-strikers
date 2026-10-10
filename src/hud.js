// In-match HUD (scoreboard, player card, power puck chip, banners) and touch button state.

import { Assets } from './assets.js';
import { POWER_INFO, TEAMS, ART_NAME, RECRUITS, ROOKIES, LEGENDS, LEGEND_ART, teamInfo } from './data.js';
import { portrait, crest, keyCap, portraitCanvas } from './ui.js';
import { firstKey } from './keys.js';
import { t } from './i18n.js';
import { isPartsArt } from './modular.js';

// Everything the HUD shows mid-match is drawn onto canvases: turning a picture into a PNG
// (toDataURL) makes the browser wait for the GPU, a visible stall on phones.
const paint = (cv, src) => {
  const x = cv && cv.getContext('2d');
  if (!x) return;
  x.clearRect(0, 0, cv.width, cv.height);
  if (src) x.drawImage(src, 0, 0, cv.width, cv.height);
};
const digit = (n) => Assets.iconCanvas(`hud_elements/score/${Math.min(5, n)}`, 96);
const face = (cv, ...args) => paint(cv, portraitCanvas(...args));

export class HUD {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('hud');
    this.touch = document.getElementById('touch');
    this.bannerEl = document.getElementById('banner');
    this.last = {};
    this.hintT = 0;
  }

  show(match, teamId, drill = null, opts = {}) {
    this.match = match;
    this.teamId = teamId;
    this.drill = drill;
    this.versus = !!opts.versus;
    this.coop = !!opts.coop && !!match.coop;
    this.keeper = !!match.keeperCoop; // (player 2 in goal: their card is the goalie's)
    const team = teamInfo(teamId);
    const K = (action) => keyCap(firstKey(action)); // (the player's own keys, Settings › Keyboard)
    this.el.hidden = false;
    this.el.innerHTML = `
      ${drill ? '<div class="drillbar"><div class="t"></div><div class="m"></div><div class="s"></div><div class="n"></div></div>' : ''}
      <div class="scoreboard${match.bigGame ? ' gold' : ''}" ${drill ? 'hidden' : ''}>
        <img class="crest" src="${crest('home', 72)}" alt="">
        <span class="abbr" style="color:${TEAMS.home.color}">${TEAMS.home.short}</span>
        <canvas class="digit" id="d0" width="96" height="96" aria-label="0"></canvas>
        <div class="mid">${this.midLabel(match)}</div>
        <canvas class="digit" id="d1" width="96" height="96" aria-label="0"></canvas>
        <span class="abbr" style="color:${team.color}">${team.short}</span>
        <img class="crest" src="${crest(teamId, 72)}" alt="">
      </div>
      <div class="pcard" ${drill && drill.noCard ? 'hidden' : ''}><canvas id="pc-img" width="88" height="88"></canvas><div><div class="nm" id="pc-name"></div>
        <div class="bars"><div class="bar" id="pc-sta"><i></i></div><div class="bar ult" id="pc-ult"><i></i></div></div></div></div>
      ${this.versus || this.coop || this.keeper ? `<div class="pcard p2${this.coop || this.keeper ? ' coop' : ''}"><div><div class="nm" id="pc2-name"></div>
        <div class="bars"><div class="bar" id="pc2-sta"><i></i></div><div class="bar ult" id="pc2-ult"><i></i></div></div></div><canvas id="pc2-img" width="88" height="88"></canvas></div>` : ''}
      <div class="replay" id="replay" hidden>
        <div class="rp-bar top"><span class="rp-tag"><i></i>${t('REPLAY')}</span></div>
        <div class="rp-bar bottom"><button class="rp-skip" id="rp-skip">${t('Skip')} ▸</button></div>
      </div>
      <div class="cutins" id="cutins"></div>
      <div class="ticker" id="ticker" hidden><span class="live">${t('LIVE')}</span><img class="tk-ico" alt="" hidden><span class="tx"></span></div>
      <div class="penchip" id="penchip" hidden></div>
      <div class="powerchip" id="power" hidden><img alt=""><span></span><span class="t"><i></i></span></div>
      <button class="pause-btn" id="pause-btn" tabindex="-1" aria-label="${t('Pause')}"></button>
      <div class="hint" id="hint" hidden></div>
      <div class="keyhints" id="keyhints" ${this.app.isTouch ? 'hidden' : ''}>
        ${drill && drill.keysHint ? drill.keysHint(K)
        : this.coop || this.keeper ? this.coopHints(K)
        : opts.versus ? `<b style="color:var(--ice)">P1</b> WASD · <kbd>F</kbd> ${t('shoot')} · <kbd>G</kbd> ${t('pass')} · <kbd>L-Shift</kbd> ${t('sprint')} · <kbd>R</kbd>/<kbd>T</kbd> ${t('skill/ult')}<br>
        <b style="color:var(--coral)">P2</b> ${t('Arrows')} · <kbd>K</kbd> ${t('shoot')} · <kbd>L</kbd> ${t('pass')} · <kbd>R-Shift</kbd> ${t('sprint')} · <kbd>O</kbd>/<kbd>P</kbd> ${t('skill/ult')}`
        : match.goalieMode ? `${K('a')} ${t('block / pass')} · ${K('b')} ${t('dive / clear')} · ${K('sprint')} ${t('quick feet')}<br>${K('skill')} ${t('poke check')} · ${K('ult')} ${t('Wall of Ice')} · ${K('pause')} ${t('pause')}`
        : `${K('a')} ${t('shoot/check')} · ${K('b')} ${t('pass/switch')} · ${K('sprint')} ${t('sprint')}<br>${K('skill')} ${t('skill')} · ${K('ult')} ${t('ultimate')} · ${K('pause')} ${t('pause')}`}</div>`;
    this.el.querySelector('#pause-btn').addEventListener('click', (e) => { e.stopPropagation(); e.currentTarget.blur(); this.app.pause(); }); // (no focus left on it: Enter is the pass key)
    for (const i of [0, 1]) paint(this.el.querySelector('#d' + i), digit(match.score[i]));
    // every cut-in banner this match can show, recoloured before play rather than at the first ultimate
    const keys = [...match.skaters, ...match.goalies].map((k) => [this.bannerKey(k), this.bannerPal(k, teamId)]);
    // (and the element backdrops for anyone without a painted banner, Batch AQ)
    const painted = (k) => { const b = this.bannerKey(k); return b && Assets.atlas.banners && Assets.atlas.banners[b]; };
    for (const k of match.skaters) if (!painted(k) && k.def && k.def.elem) keys.push(['bg_' + k.def.elem, null]);
    Assets.warmBanners(keys);
    const rp = this.el.querySelector('#replay');
    rp.addEventListener('pointerdown', (e) => { e.preventDefault(); this.app.skipReplay(); });
    this.tickerT = 0;
    this.last = { s0: 0, s1: 0 };
    this.touch.hidden = !this.app.isTouch || this.versus;
    this.touch.classList.toggle('gk', !!match.goalieMode && !this.keeper); // goalie mode puts icons on the face buttons (keeper co-op: touch is player 1's skater)
    this.touch.querySelectorAll('.gk-ico').forEach((i) => i.remove());
    this.keyhintT = 12;
  }

  // Co-op's keys: a shared keyboard with no gamepad, else player 2 on a pad (player 1 on the
  // keyboard, or the first pad of two).
  coopHints(K) {
    const n = this.app.input.pads().length, P1 = '<b style="color:var(--ice)">P1</b>', P2 = `<b style="color:#7fe08a">P2${this.keeper ? ` · ${t('in goal')}` : ''}</b>`;
    if (!n && this.keeper) return `${P1} WASD · <kbd>F</kbd> ${t('shoot')} · <kbd>G</kbd> ${t('pass')} · <kbd>L-Shift</kbd> ${t('sprint')} · <kbd>R</kbd>/<kbd>T</kbd> ${t('skill/ult')}<br>
        ${P2} ${t('Arrows')} · <kbd>K</kbd> ${t('block / pass')} · <kbd>L</kbd> ${t('dive / clear')} · <kbd>O</kbd> ${t('poke check')} · <kbd>P</kbd> ${t('Wall of Ice')}`;
    if (!n) return `${P1} WASD · <kbd>F</kbd> ${t('shoot')} · <kbd>G</kbd> ${t('pass')} · <kbd>L-Shift</kbd> ${t('sprint')} · <kbd>R</kbd>/<kbd>T</kbd> ${t('skill/ult')}<br>
        ${P2} ${t('Arrows')} · <kbd>K</kbd> ${t('shoot')} · <kbd>L</kbd> ${t('pass')} · <kbd>R-Shift</kbd> ${t('sprint')} · <kbd>O</kbd>/<kbd>P</kbd> ${t('skill/ult')}`;
    if (n >= 2) return `${P1} ${t('first gamepad')} · ${P2} ${t('second gamepad')}`;
    return `${P1} ${K('a')} ${t('shoot/check')} · ${K('b')} ${t('pass/switch')} · ${K('sprint')} ${t('sprint')} · ${K('skill')}/${K('ult')} ${t('skill/ult')}<br>${P2} ${t('gamepad')}`;
  }

  hide() {
    this.el.hidden = true;
    this.touch.hidden = true;
    this.bannerEl.innerHTML = '';
  }

  ticker(text, icon = '') {
    const t = this.el.querySelector('#ticker');
    if (!t) return;
    t.querySelector('.tx').textContent = text;
    const ico = t.querySelector('.tk-ico');
    ico.hidden = !icon;
    if (icon) ico.src = icon;
    t.hidden = false;
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    this.tickerT = 3.2;
  }

  // Ultimate cut-in: the character's banner art (or a portrait band) sliding across.
  cutin(s, partner, title) {
    const box = this.el.querySelector('#cutins');
    if (!box) return;
    const us = s.team === 0;
    const color = us ? '#2a9fb0' : teamInfo(this.teamId).color;
    const el = document.createElement('div');
    el.className = 'cutin ' + (us ? 'us' : 'them');
    const id = (k) => (k.isGoalie ? k.who || 'goalie' : k.who); // (our goalie by id, a rival's backup as 'sub_goalie')
    // portraits are drawn onto canvases: turning them into images mid-match stalled the frame
    const pics = [];
    const img = (k) => { pics.push(k); return `<canvas width="200" height="200" data-pic="${pics.length - 1}"></canvas>`; };
    const who = partner ? `${partner.name} + ${s.name}` : s.name;
    const name = title || t(s.def.ult.name);
    const art = Assets.bannerCanvas(this.bannerKey(s), this.bannerPal(s, this.teamId)) || this.backdropBanner(s, id(s));
    if (partner) el.classList.add('combo');
    if (art) {
      el.classList.add('art');
      el.innerHTML = `<div class="band" style="--c:${color}"><canvas class="bn" width="${art.width}" height="${art.height}"></canvas>${partner ? `<span class="pair">${img(partner)}</span>` : ''}<div class="txt"><small>${who}</small><b>${name}</b></div></div>`;
    } else {
      el.innerHTML = `<div class="band" style="--c:${color}">${partner ? `<span class="pair">${img(partner)}${img(s)}</span>` : img(s)}<div class="txt"><small>${who}</small><b>${name}</b></div></div>`;
    }
    if (art) paint(el.querySelector('canvas.bn'), art);
    for (const cv of el.querySelectorAll('canvas[data-pic]')) {
      const k = pics[+cv.dataset.pic], src = portraitCanvas(id(k), k.team, this.teamId, 200);
      if (src) cv.getContext('2d').drawImage(src, 0, 0);
    }
    box.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // Banner key in the sprite pack: our cast by name, rivals by roster slot.
  bannerKey(k) {
    if (k.team === 0 && RECRUITS[k.who] && TEAMS[RECRUITS[k.who].team].mark && RECRUITS[k.who].kit === 'frost') return `${TEAMS[RECRUITS[k.who].team].mark}_c`; // an expansion club's captain, signed
    if (k.team === 0 && !k.isGoalie && RECRUITS[k.who]) return k.sprite; // a signing's own banner
    if (k.team === 0 && ROOKIES[k.who]) return null; // a rookie: no banner art, the portrait band
    if (k.team === 0 && LEGENDS[k.who]) return LEGEND_ART.has(k.sprite) ? k.sprite : null;
    if (k.team === 0 && k.isGoalie && k.art && !isPartsArt(k.art) && k.art !== 'newcomer') return `${k.art}_g`; // a signed rival goalie's own banner
    if (k.team === 0 && k.isGoalie && k.art) return null; // (made from parts, or the newcomer goalie: no painted banner, the portrait band)
    if (k.team === 0) return ART_NAME[k.isGoalie ? 'goalie' : k.def.id];
    if (k.isGoalie) return k.art && !isPartsArt(k.art) && k.art !== 'newcomer' ? `${k.art}_g` : null;
    const club = TEAMS[this.teamId];
    if (club && club.mark && k.who === 'frost') return `${club.mark}_c`; // an expansion club's captain (Batch AU)
    if (k.parts) return null; // made from parts: the element backdrop
    return k.sprite !== k.def.sprite ? k.sprite : null;
  }

  // A banner for someone without a painted one (a player from parts, a rookie): their element's
  // backdrop (Batch AQ) with their portrait on the left third. Null until the backdrops are in.
  backdropBanner(k, who) {
    const bg = k.def && k.def.elem && Assets.bannerCanvas('bg_' + k.def.elem, null);
    if (!bg) return null;
    const key = `${who}|${k.team}|${this.teamId}|${k.def.elem}`;
    this.backdrops ||= new Map();
    if (this.backdrops.has(key)) return this.backdrops.get(key);
    const w = bg.width, h = bg.height, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(bg, 0, 0);
    const glow = Assets.bannerCanvas('bg_glow', null), size = Math.round(h * 0.96), x = Math.round(w * 0.06);
    if (glow) ctx.drawImage(glow, x - size * 0.15, 0, size * 1.3, h);
    const face = portraitCanvas(who, k.team, this.teamId, size);
    if (face) ctx.drawImage(face, x, h - size, size, size);
    this.backdrops.set(key, c);
    return c;
  }

  // ...and its colours: a signing (skater or goalie) in our kit, a rival in theirs.
  bannerPal(k, teamId) { return k.team === 0 ? (RECRUITS[k.who] || (k.isGoalie && k.look) ? 'homekit' : null) : teamId; }

  replayMode(on) {
    const r = this.el.querySelector('#replay');
    if (!r) return;
    r.hidden = !on;
    this.el.classList.toggle('replaying', on);
    this.touch.classList.toggle('replaying', on);
    if (on) this.bannerEl.innerHTML = '';
  }

  hint(text, secs = 5) {
    const h = this.el.querySelector('#hint');
    if (!h) return;
    h.textContent = text;
    h.hidden = false;
    h.style.opacity = 1;
    this.hintT = secs;
  }

  banner(html, secs = 2) {
    this.bannerEl.innerHTML = `<div class="banner"><div class="plate">${html}</div></div>`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.bannerEl.innerHTML = ''; }, secs * 1000);
  }

  goal(info) {
    const team = teamInfo(this.teamId);
    const color = info.team === 0 ? '#71dce8' : team.color;
    const s = info.scorer;
    let sub = '';
    if (s) {
      const assist = info.assists.length ? ` <span style="font-size:.7em;color:#c3d3ea">${t('from {names}', { names: info.assists.map((a) => a.name).join(' & ') })}</span>` : '';
      sub = `<div class="sub"><canvas class="face" width="96" height="96"></canvas>${s.name}${assist}</div>`;
    }
    const kind = info.kind === 'onetimer' ? t('ONE-TIMER!') : info.kind === 'zero' ? t('ABSOLUTE ZERO!') : info.kind === 'thunderclap' ? t('THUNDERCLAP!') : info.power ? t(POWER_INFO[info.power].name).toUpperCase() + '!' : '';
    this.banner(`<div class="big" style="color:${color}">${t('GOAL!')}</div>${kind ? `<div class="small">${kind}</div>` : ''}${sub}`, 3);
    if (s) face(this.bannerEl.querySelector('canvas.face'), s.who, s.team, this.teamId, 96);
  }

  update(dt) {
    const m = this.match;
    if (!m || this.el.hidden) return;
    if (this.drill && this.drill.hud) {
      const h = this.drill.hud(m);
      const bar = this.el.querySelector('.drillbar');
      for (const [k, sel] of [['title', '.t'], ['main', '.m'], ['sub', '.s'], ['note', '.n']]) {
        const v = h[k] || '';
        if (this.last['d' + k] !== v) { this.last['d' + k] = v; bar.querySelector(sel).textContent = v; }
      }
    }
    // score
    for (const i of [0, 1]) {
      if (this.last['s' + i] !== m.score[i]) {
        this.last['s' + i] = m.score[i];
        const d = this.el.querySelector('#d' + i);
        paint(d, digit(m.score[i]));
        d.setAttribute('aria-label', String(m.score[i]));
        d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump');
      }
    }
    const mid = this.midLabel(m);
    if (this.last.mid !== mid) { this.last.mid = mid; const el = this.el.querySelector('.scoreboard .mid'); if (el) el.innerHTML = mid; }
    // player card
    const c = this.coop ? m.controlled(0, 0) : m.controlled();
    if (c && this.gkTemp) { // back from a penalty shot in goal: the skater's buttons again
      this.gkTemp = false;
      this.touch.classList.remove('gk');
      this.touch.querySelectorAll('.gk-ico').forEach((i) => i.remove());
      this.last.ctrl = null; this.last.a = this.last.b = null;
    }
    if (c) {
      if (this.last.ctrl !== c) {
        this.last.ctrl = c;
        face(this.el.querySelector('#pc-img'), c.who, 0, null, 88);
        this.el.querySelector('#pc-name').textContent = (this.versus || this.coop || this.keeper ? 'P1 · ' : '') + c.name;
        this.updateTouchIcons(c);
      }
      const sta = c.stamina / c.d.staminaMax;
      const sb = this.el.querySelector('#pc-sta');
      sb.firstChild.style.transform = `scaleX(${sta})`;
      sb.classList.toggle('low', c.staminaLock || sta < 0.2);
      const ub = this.el.querySelector('#pc-ult');
      ub.firstChild.style.transform = `scaleX(${c.ult / 100})`;
      ub.classList.toggle('full', c.ult >= 100);
      this.updateTouch(c, m);
    } else if (m.goalieMode && !this.keeper) this.updateGoalie(m.goalies[0], m);
    else if (m.pshot && m.pshot.keeper && m.pshot.keeper.team === 0 && !this.versus) { // a penalty shot against us: in goal for it
      if (!this.gkTemp) { this.gkTemp = true; this.touch.classList.add('gk'); this.last.a = this.last.b = null; }
      this.updateGoalie(m.pshot.keeper, m);
    }
    if (this.keeper) { // player 2's card: the goalie, and the Wall of Ice charging
      const g = m.goalies[0];
      if (this.last.ctrl2 !== g) {
        this.last.ctrl2 = g;
        face(this.el.querySelector('#pc2-img'), g.who || 'goalie', 0, null, 88);
        this.el.querySelector('#pc2-name').textContent = 'P2 · ' + g.name;
        this.el.querySelector('#pc2-sta').firstChild.style.transform = 'scaleX(1)';
      }
      const ub = this.el.querySelector('#pc2-ult');
      ub.firstChild.style.transform = `scaleX(${g.wallT > 0 ? g.wallT / 5 : g.ult / 100})`;
      ub.classList.toggle('full', g.ult >= 100 || g.wallT > 0);
    }
    if (this.versus || this.coop) {
      const c2 = this.coop ? m.controlled(0, 1) : m.controlled(1);
      if (c2) {
        if (this.last.ctrl2 !== c2) {
          this.last.ctrl2 = c2;
          face(this.el.querySelector('#pc2-img'), c2.who, c2.team, c2.team ? this.teamId : null, 88);
          this.el.querySelector('#pc2-name').textContent = 'P2 · ' + c2.name;
        }
        this.el.querySelector('#pc2-sta').firstChild.style.transform = `scaleX(${c2.stamina / c2.d.staminaMax})`;
        this.el.querySelector('#pc2-ult').firstChild.style.transform = `scaleX(${c2.ult / 100})`;
        this.el.querySelector('#pc2-ult').classList.toggle('full', c2.ult >= 100);
      }
    }
    // power play / empty net
    const pc = this.el.querySelector('#penchip');
    if (pc) {
      const parts = [];
      for (const k of m.skaters) if (k.boxT > 0) parts.push(`<span class="${k.team === 0 ? 'pk' : 'pp'}">${k.team === 0 ? t('PENALTY KILL {n}s', { n: Math.ceil(k.boxT) }) : t('POWER PLAY {n}s', { n: Math.ceil(k.boxT) })}</span>`);
      const pp = m.pendingPenalty;
      if (pp && pp.announced && m.state === 'play') parts.push(`<span class="${pp.s.team === 0 ? 'pk' : 'pp'}">${t('DELAYED PENALTY')}</span>`);
      for (const side of [0, 1]) if (m.extra && m.extra[side]) parts.push(`<span class="${side === 0 ? 'pp' : 'pk'}">${side === 0 ? t('YOUR NET IS EMPTY') : t('THEIR NET IS EMPTY')}</span>`);
      const html = parts.join('');
      if (this.last.pen !== html) { this.last.pen = html; pc.innerHTML = html; pc.hidden = !html; }
    }
    // power chip
    const p = m.puck;
    const chip = this.el.querySelector('#power');
    if (p.power) {
      const info = POWER_INFO[p.power];
      if (this.last.power !== p.power) {
        this.last.power = p.power;
        chip.querySelector('img').src = Assets.icon(info.icon, 52);
        chip.querySelector('span').textContent = t(info.name);
        chip.style.color = info.color;
        chip.style.borderColor = info.color;
      }
      chip.hidden = false;
      chip.querySelector('.t i').style.width = `${Math.max(0, (p.powerT / 10) * 100)}%`;
    } else { chip.hidden = true; this.last.power = null; }
    if (this.tickerT > 0) {
      this.tickerT -= dt;
      if (this.tickerT <= 0) this.el.querySelector('#ticker').hidden = true;
    }
    // hint fade
    if (this.hintT > 0) {
      this.hintT -= dt;
      const h = this.el.querySelector('#hint');
      if (this.hintT <= 0.5) h.style.opacity = Math.max(0, this.hintT / 0.5);
      if (this.hintT <= 0) h.hidden = true;
    }
    if (this.keyhintT > 0) {
      this.keyhintT -= dt;
      if (this.keyhintT <= 0) this.el.querySelector('#keyhints').hidden = true;
    }
  }

  // An icon above a face button's word in goalie mode (none: just the word).
  gkIcon(sel, src) {
    const b = this.touch.querySelector(sel);
    let img = b.querySelector('.gk-ico');
    if (!src) { if (img) img.hidden = true; return; }
    if (!img) { img = document.createElement('img'); img.className = 'gk-ico'; img.alt = ''; b.prepend(img); }
    img.hidden = false;
    if (img.dataset.src !== src) { img.dataset.src = src; img.src = src; }
  }

  // Goalie mode: our goalie's card (Wall of Ice is the meter) and the touch buttons for goaltending.
  // Under the score: what wins it (or a penalty shot on now).
  midLabel(m) {
    if (m.pshot) return t('PENALTY{br}SHOT', { br: '<br>' });
    return m.winScore === 1 ? t('NEXT GOAL{br}WINS', { br: '<br>' }) : t('FIRST{br}TO 5', { br: '<br>' });
  }

  updateGoalie(g, m) {
    if (this.last.ctrl !== g) {
      this.last.ctrl = g;
      face(this.el.querySelector('#pc-img'), g.who || 'goalie', 0, null, 88);
      this.el.querySelector('#pc-name').textContent = g.name;
      this.el.querySelector('#pc-sta').firstChild.style.transform = 'scaleX(1)';
      if (!this.touch.hidden) {
        const A = Assets.atlas.goalie_mode && Assets.atlas.goalie_mode.actions || {};
        this.touch.querySelector('.t-skill img').src = Assets.icon(A.poke_check || 'equipment_items/stick/wood', 80);
        this.touch.querySelector('.t-ult img').src = Assets.icon(A.wall_of_ice || 'hud_elements/ability/frost', 80);
      }
    }
    const ub = this.el.querySelector('#pc-ult');
    ub.firstChild.style.transform = `scaleX(${g.wallT > 0 ? g.wallT / 5 : g.ult / 100})`;
    ub.classList.toggle('full', g.ult >= 100 || g.wallT > 0);
    if (this.touch.hidden) return;
    const hold = g.state === 'hold';
    const aLbl = hold ? t('PASS') : t('BLOCK'), bLbl = hold ? t('CLEAR') : t('DIVE');
    if (this.last.a !== aLbl) {
      this.last.a = aLbl; this.touch.querySelector('.t-a span').textContent = aLbl;
      this.gkIcon('.t-a', Assets.url(`gfx/touch-kit/images/${hold ? 'goalie_pass' : 'goalie_block'}.png`));
    }
    if (this.last.b !== bLbl) {
      this.last.b = bLbl; this.touch.querySelector('.t-b span').textContent = bLbl;
      const dive = Assets.atlas.goalie_mode && Assets.atlas.goalie_mode.actions && Assets.atlas.goalie_mode.actions.dive;
      this.gkIcon('.t-b', !hold && dive ? Assets.icon(dive, 80) : '');
    }
    const skill = this.touch.querySelector('.t-skill');
    const cdf = g.pokeCd > 0 ? g.pokeCd / 0.8 : 0;
    skill.querySelector('.cd').style.background = cdf > 0 ? `conic-gradient(rgba(11,20,36,.78) ${cdf * 360}deg, transparent 0)` : 'none';
    skill.classList.toggle('ready', cdf === 0);
    const pull = this.touch.querySelector('.t-pull');
    if (!pull.hidden) pull.hidden = true;
    const ult = this.touch.querySelector('.t-ult');
    const uf = g.ult / 100;
    ult.querySelector('.cd').style.background = uf < 1 ? `conic-gradient(transparent ${uf * 360}deg, rgba(11,20,36,.78) 0)` : 'none';
    ult.classList.toggle('ready', uf >= 1);
  }

  updateTouchIcons(c) {
    if (this.touch.hidden) return;
    const sk = this.touch.querySelector('.t-skill img');
    sk.src = Assets.icon(c.def.skill.icon, 80);
    const ul = this.touch.querySelector('.t-ult img');
    ul.src = Assets.icon('hud_elements/misc/level_star', 80);
  }

  updateTouch(c, m) {
    if (this.touch.hidden) return;
    const has = c.hasPuck;
    const incoming = !m.puck.owner && m.puck.pass && m.puck.pass.to === c;
    const comboIncoming = incoming && m.chemLevel(m.puck.pass.from, c) > 0;
    const dl = this.drill && this.drill.touchLabels ? this.drill.touchLabels(m) : null;
    const aLbl = dl ? dl.a : has ? (c.comboT > 0 ? t('COMBO') : t('SHOOT')) : comboIncoming ? t('COMBO') : incoming ? t('ONE-T') : t('CHECK');
    const bLbl = dl ? dl.b : has ? t('PASS') : t('SWITCH');
    if (this.last.a !== aLbl) { this.last.a = aLbl; this.touch.querySelector('.t-a span').textContent = aLbl; }
    if (this.last.b !== bLbl) { this.last.b = bLbl; this.touch.querySelector('.t-b span').textContent = bLbl; }
    const skill = this.touch.querySelector('.t-skill');
    const cdf = c.skillCd > 0 ? c.skillCd / c.def.skill.cd : 0;
    skill.querySelector('.cd').style.background = cdf > 0 ? `conic-gradient(rgba(11,20,36,.78) ${cdf * 360}deg, transparent 0)` : 'none';
    skill.classList.toggle('ready', cdf === 0);
    const pull = this.touch.querySelector('.t-pull');
    const showPull = m.canPullGoalie && (m.canPullGoalie(0) || (m.extra && m.extra[0]));
    if (pull.hidden === !!showPull) pull.hidden = !showPull;
    if (showPull) pull.querySelector('span').innerHTML = m.extra && m.extra[0] ? t('GOALIE{br}BACK', { br: '<br>' }) : t('PULL{br}GOALIE', { br: '<br>' });
    const ult = this.touch.querySelector('.t-ult');
    const uf = c.ult / 100;
    ult.querySelector('.cd').style.background = uf < 1 ? `conic-gradient(transparent ${uf * 360}deg, rgba(11,20,36,.78) 0)` : 'none';
    ult.classList.toggle('ready', uf >= 1 && (!c.def.ult.needsPuck || has));
  }
}
