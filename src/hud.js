// In-match HUD (scoreboard, player card, power puck chip, banners) and touch button state.

import { Assets } from './assets.js';
import { POWER_INFO, TEAMS, ART_NAME } from './data.js';
import { portrait, crest } from './ui.js';

const digit = (n) => Assets.icon(`hud_elements/score/${Math.min(5, n)}`, 96);

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
    const t = TEAMS[teamId];
    this.el.hidden = false;
    this.el.innerHTML = `
      ${drill ? '<div class="drillbar"><div class="t"></div><div class="m"></div><div class="s"></div><div class="n"></div></div>' : ''}
      <div class="scoreboard" ${drill ? 'hidden' : ''}>
        <img class="crest" src="${crest('home', 72)}" alt="">
        <span class="abbr">GLA</span>
        <img class="digit" id="d0" src="${digit(0)}" alt="0">
        <div class="mid">FIRST<br>TO 5</div>
        <img class="digit" id="d1" src="${digit(0)}" alt="0">
        <span class="abbr" style="color:${t.color}">${t.short}</span>
        <img class="crest" src="${crest(teamId, 72)}" alt="">
      </div>
      <div class="pcard"><img id="pc-img" alt=""><div><div class="nm" id="pc-name"></div>
        <div class="bars"><div class="bar" id="pc-sta"><i></i></div><div class="bar ult" id="pc-ult"><i></i></div></div></div></div>
      ${opts.versus ? `<div class="pcard p2"><div><div class="nm" id="pc2-name"></div>
        <div class="bars"><div class="bar" id="pc2-sta"><i></i></div><div class="bar ult" id="pc2-ult"><i></i></div></div></div><img id="pc2-img" alt=""></div>` : ''}
      <div class="replay" id="replay" hidden>
        <div class="rp-bar top"><span class="rp-tag"><i></i>REPLAY</span></div>
        <div class="rp-bar bottom"><button class="rp-skip" id="rp-skip">Skip ▸</button></div>
      </div>
      <div class="cutins" id="cutins"></div>
      <div class="ticker" id="ticker" hidden><span class="live">LIVE</span><span class="tx"></span></div>
      <div class="penchip" id="penchip" hidden></div>
      <div class="powerchip" id="power" hidden><img alt=""><span></span><span class="t"><i></i></span></div>
      <button class="pause-btn" id="pause-btn" aria-label="Pause"><img src="${Assets.icon('hud_elements/misc/pause', 88)}" alt=""></button>
      <div class="hint" id="hint" hidden></div>
      <div class="keyhints" id="keyhints" ${this.app.isTouch ? 'hidden' : ''}>
        ${opts.versus ? `<b style="color:var(--ice)">P1</b> WASD · <kbd>F</kbd> shoot · <kbd>G</kbd> pass · <kbd>L-Shift</kbd> sprint · <kbd>R</kbd>/<kbd>T</kbd> skill/ult<br>
        <b style="color:var(--coral)">P2</b> Arrows · <kbd>K</kbd> shoot · <kbd>L</kbd> pass · <kbd>R-Shift</kbd> sprint · <kbd>O</kbd>/<kbd>P</kbd> skill/ult`
        : '<kbd>J</kbd> shoot/check · <kbd>K</kbd> pass/switch · <kbd>Shift</kbd> sprint<br><kbd>U</kbd> skill · <kbd>I</kbd> ultimate · <kbd>Esc</kbd> pause'}</div>`;
    this.el.querySelector('#pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.app.pause(); });
    const rp = this.el.querySelector('#replay');
    rp.addEventListener('pointerdown', (e) => { e.preventDefault(); this.app.skipReplay(); });
    this.tickerT = 0;
    this.last = { s0: 0, s1: 0 };
    this.touch.hidden = !this.app.isTouch || this.versus;
    this.keyhintT = 12;
  }

  hide() {
    this.el.hidden = true;
    this.touch.hidden = true;
    this.bannerEl.innerHTML = '';
  }

  ticker(text) {
    const t = this.el.querySelector('#ticker');
    if (!t) return;
    t.querySelector('.tx').textContent = text;
    t.hidden = false;
    t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    this.tickerT = 3.2;
  }

  // Ultimate cut-in: the character's banner art (or a portrait band) sliding across.
  cutin(s, partner, title) {
    const box = this.el.querySelector('#cutins');
    if (!box) return;
    const us = s.team === 0;
    const color = us ? '#2a9fb0' : TEAMS[this.teamId].color;
    const el = document.createElement('div');
    el.className = 'cutin ' + (us ? 'us' : 'them');
    const id = (k) => (k.isGoalie ? 'goalie' : k.def.id);
    const img = (k) => `<img src="${portrait(id(k), k.team, this.teamId, 320)}" alt="">`;
    const who = partner ? `${partner.name} + ${s.name}` : s.name;
    const name = title || s.def.ult.name;
    const art = Assets.banner(this.bannerKey(s), us ? null : this.teamId);
    if (partner) el.classList.add('combo');
    if (art) {
      el.classList.add('art');
      el.innerHTML = `<div class="band" style="--c:${color}"><img class="bn" src="${art}" alt="">${partner ? `<span class="pair">${img(partner)}</span>` : ''}<div class="txt"><small>${who}</small><b>${name}</b></div></div>`;
    } else {
      el.innerHTML = `<div class="band" style="--c:${color}">${partner ? `<span class="pair">${img(partner)}${img(s)}</span>` : img(s)}<div class="txt"><small>${who}</small><b>${name}</b></div></div>`;
    }
    box.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // Banner key in the sprite pack: our cast by name, rivals by roster slot.
  bannerKey(k) {
    if (k.team === 0) return ART_NAME[k.isGoalie ? 'goalie' : k.def.id];
    if (k.isGoalie) return k.art ? `${k.art}_g` : null;
    return k.sprite !== k.def.sprite ? k.sprite : null;
  }

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
    this.bannerEl.innerHTML = `<div class="banner">${html}</div>`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.bannerEl.innerHTML = ''; }, secs * 1000);
  }

  goal(info) {
    const t = TEAMS[this.teamId];
    const color = info.team === 0 ? '#71dce8' : t.color;
    const s = info.scorer;
    let sub = '';
    if (s) {
      const assist = info.assists.length ? ` <span style="font-size:.7em;color:#c3d3ea">from ${info.assists.map((a) => a.name).join(' & ')}</span>` : '';
      sub = `<div class="sub"><img src="${portrait(s.def.id, s.team, this.teamId, 96)}" alt="">${s.name}${assist}</div>`;
    }
    const kind = info.kind === 'onetimer' ? 'ONE-TIMER!' : info.kind === 'zero' ? 'ABSOLUTE ZERO!' : info.kind === 'thunderclap' ? 'THUNDERCLAP!' : info.power ? POWER_INFO[info.power].name.toUpperCase() + '!' : '';
    this.banner(`<div class="big" style="color:${color}">GOAL!</div>${kind ? `<div class="small">${kind}</div>` : ''}${sub}`, 3);
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
        d.src = digit(m.score[i]);
        d.alt = String(m.score[i]);
        d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump');
      }
    }
    // player card
    const c = m.controlled();
    if (c) {
      if (this.last.ctrl !== c) {
        this.last.ctrl = c;
        this.el.querySelector('#pc-img').src = portrait(c.def.id, 0, null, 88);
        this.el.querySelector('#pc-name').textContent = (this.versus ? 'P1 · ' : '') + c.name;
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
    }
    if (this.versus) {
      const c2 = m.controlled(1);
      if (c2) {
        if (this.last.ctrl2 !== c2) {
          this.last.ctrl2 = c2;
          this.el.querySelector('#pc2-img').src = portrait(c2.def.id, 1, this.teamId, 88);
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
      for (const k of m.skaters) if (k.boxT > 0) parts.push(`<span class="${k.team === 0 ? 'pk' : 'pp'}">${k.team === 0 ? 'PENALTY KILL' : 'POWER PLAY'} ${Math.ceil(k.boxT)}s</span>`);
      for (const t of [0, 1]) if (m.extra && m.extra[t]) parts.push(`<span class="${t === 0 ? 'pp' : 'pk'}">${t === 0 ? 'YOUR NET IS EMPTY' : 'THEIR NET IS EMPTY'}</span>`);
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
        chip.querySelector('span').textContent = info.name;
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
    const aLbl = dl ? dl.a : has ? (c.comboT > 0 ? 'COMBO' : 'SHOOT') : comboIncoming ? 'COMBO' : incoming ? 'ONE-T' : 'CHECK';
    const bLbl = dl ? dl.b : has ? 'PASS' : 'SWITCH';
    if (this.last.a !== aLbl) { this.last.a = aLbl; this.touch.querySelector('.t-a span').textContent = aLbl; }
    if (this.last.b !== bLbl) { this.last.b = bLbl; this.touch.querySelector('.t-b span').textContent = bLbl; }
    const skill = this.touch.querySelector('.t-skill');
    const cdf = c.skillCd > 0 ? c.skillCd / c.def.skill.cd : 0;
    skill.querySelector('.cd').style.background = cdf > 0 ? `conic-gradient(rgba(11,20,36,.78) ${cdf * 360}deg, transparent 0)` : 'none';
    skill.classList.toggle('ready', cdf === 0);
    const pull = this.touch.querySelector('.t-pull');
    const showPull = m.canPullGoalie && (m.canPullGoalie(0) || (m.extra && m.extra[0]));
    if (pull.hidden === !!showPull) pull.hidden = !showPull;
    if (showPull) pull.querySelector('span').innerHTML = m.extra && m.extra[0] ? 'GOALIE<br>BACK' : 'PULL<br>GOALIE';
    const ult = this.touch.querySelector('.t-ult');
    const uf = c.ult / 100;
    ult.querySelector('.cd').style.background = uf < 1 ? `conic-gradient(transparent ${uf * 360}deg, rgba(11,20,36,.78) 0)` : 'none';
    ult.classList.toggle('ready', uf >= 1 && (!c.def.ult.needsPuck || has));
  }
}
