// In-match HUD (scoreboard, player card, power puck chip, banners) and touch button state.

import { Assets } from './assets.js';
import { POWER_INFO, TEAMS, ART_NAME, RECRUITS, teamInfo } from './data.js';
import { portrait, crest, keyGlyphs } from './ui.js';
import { t } from './i18n.js';

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
    const team = teamInfo(teamId);
    this.el.hidden = false;
    this.el.innerHTML = `
      ${drill ? '<div class="drillbar"><div class="t"></div><div class="m"></div><div class="s"></div><div class="n"></div></div>' : ''}
      <div class="scoreboard${match.bigGame ? ' gold' : ''}" ${drill ? 'hidden' : ''}>
        <img class="crest" src="${crest('home', 72)}" alt="">
        <span class="abbr" style="color:${TEAMS.home.color}">${TEAMS.home.short}</span>
        <img class="digit" id="d0" src="${digit(0)}" alt="0">
        <div class="mid">${t('FIRST{br}TO 5', { br: '<br>' })}</div>
        <img class="digit" id="d1" src="${digit(0)}" alt="0">
        <span class="abbr" style="color:${team.color}">${team.short}</span>
        <img class="crest" src="${crest(teamId, 72)}" alt="">
      </div>
      <div class="pcard"><img id="pc-img" alt=""><div><div class="nm" id="pc-name"></div>
        <div class="bars"><div class="bar" id="pc-sta"><i></i></div><div class="bar ult" id="pc-ult"><i></i></div></div></div></div>
      ${opts.versus ? `<div class="pcard p2"><div><div class="nm" id="pc2-name"></div>
        <div class="bars"><div class="bar" id="pc2-sta"><i></i></div><div class="bar ult" id="pc2-ult"><i></i></div></div></div><img id="pc2-img" alt=""></div>` : ''}
      <div class="replay" id="replay" hidden>
        <div class="rp-bar top"><span class="rp-tag"><i></i>${t('REPLAY')}</span></div>
        <div class="rp-bar bottom"><button class="rp-skip" id="rp-skip">${t('Skip')} ▸</button></div>
      </div>
      <div class="cutins" id="cutins"></div>
      <div class="ticker" id="ticker" hidden><span class="live">${t('LIVE')}</span><img class="tk-ico" alt="" hidden><span class="tx"></span></div>
      <div class="penchip" id="penchip" hidden></div>
      <div class="powerchip" id="power" hidden><img alt=""><span></span><span class="t"><i></i></span></div>
      <button class="pause-btn" id="pause-btn" aria-label="${t('Pause')}"></button>
      <div class="hint" id="hint" hidden></div>
      <div class="keyhints" id="keyhints" ${this.app.isTouch ? 'hidden' : ''}>
        ${opts.versus ? `<b style="color:var(--ice)">P1</b> WASD · <kbd>F</kbd> ${t('shoot')} · <kbd>G</kbd> ${t('pass')} · <kbd>L-Shift</kbd> ${t('sprint')} · <kbd>R</kbd>/<kbd>T</kbd> ${t('skill/ult')}<br>
        <b style="color:var(--coral)">P2</b> ${t('Arrows')} · <kbd>K</kbd> ${t('shoot')} · <kbd>L</kbd> ${t('pass')} · <kbd>R-Shift</kbd> ${t('sprint')} · <kbd>O</kbd>/<kbd>P</kbd> ${t('skill/ult')}`
        : match.goalieMode ? `${keyGlyphs('J')} ${t('block / pass')} · ${keyGlyphs('K')} ${t('dive / clear')} · ${keyGlyphs('Shift')} ${t('quick feet')}<br>${keyGlyphs('U')} ${t('poke check')} · ${keyGlyphs('I')} ${t('Wall of Ice')} · ${keyGlyphs('Esc')} ${t('pause')}`
        : `${keyGlyphs('J')} ${t('shoot/check')} · ${keyGlyphs('K')} ${t('pass/switch')} · ${keyGlyphs('Shift')} ${t('sprint')}<br>${keyGlyphs('U')} ${t('skill')} · ${keyGlyphs('I')} ${t('ultimate')} · ${keyGlyphs('Esc')} ${t('pause')}`}</div>`;
    this.el.querySelector('#pause-btn').addEventListener('click', (e) => { e.stopPropagation(); this.app.pause(); });
    const rp = this.el.querySelector('#replay');
    rp.addEventListener('pointerdown', (e) => { e.preventDefault(); this.app.skipReplay(); });
    this.tickerT = 0;
    this.last = { s0: 0, s1: 0 };
    this.touch.hidden = !this.app.isTouch || this.versus;
    this.touch.classList.toggle('gk', !!match.goalieMode); // goalie mode puts icons on the face buttons
    this.touch.querySelectorAll('.gk-ico').forEach((i) => i.remove());
    this.keyhintT = 12;
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
    const id = (k) => (k.isGoalie ? 'goalie' : k.who);
    const img = (k) => `<img src="${portrait(id(k), k.team, this.teamId, 320)}" alt="">`;
    const who = partner ? `${partner.name} + ${s.name}` : s.name;
    const name = title || t(s.def.ult.name);
    const art = Assets.banner(this.bannerKey(s), us ? (RECRUITS[s.who] ? 'homekit' : null) : this.teamId);
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
    if (k.team === 0 && !k.isGoalie && RECRUITS[k.who]) return k.sprite; // a signing's own banner
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
      sub = `<div class="sub"><img src="${portrait(s.who, s.team, this.teamId, 96)}" alt="">${s.name}${assist}</div>`;
    }
    const kind = info.kind === 'onetimer' ? t('ONE-TIMER!') : info.kind === 'zero' ? t('ABSOLUTE ZERO!') : info.kind === 'thunderclap' ? t('THUNDERCLAP!') : info.power ? t(POWER_INFO[info.power].name).toUpperCase() + '!' : '';
    this.banner(`<div class="big" style="color:${color}">${t('GOAL!')}</div>${kind ? `<div class="small">${kind}</div>` : ''}${sub}`, 3);
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
        this.el.querySelector('#pc-img').src = portrait(c.who, 0, null, 88);
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
    } else if (m.goalieMode) this.updateGoalie(m.goalies[0], m);
    if (this.versus) {
      const c2 = m.controlled(1);
      if (c2) {
        if (this.last.ctrl2 !== c2) {
          this.last.ctrl2 = c2;
          this.el.querySelector('#pc2-img').src = portrait(c2.who, 1, this.teamId, 88);
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

  // Goalie mode: Halla's card (Wall of Ice is her meter) and the touch buttons for goaltending.
  updateGoalie(g, m) {
    if (this.last.ctrl !== g) {
      this.last.ctrl = g;
      this.el.querySelector('#pc-img').src = portrait('goalie', 0, null, 88);
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
