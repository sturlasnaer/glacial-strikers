// Bot runs of every training drill + the shootout, for sanity checks and medal tuning.
// node tools/test_drills.mjs [runs]
import { Match } from '../src/match.js';
import { createDrill, DRILLS, medalFor, formatScore } from '../src/drills.js';
import { newSave } from '../src/progress.js';
import { GOAL_X } from '../src/rink.js';

const RUNS = +(process.argv[2] || 3);
const save = newSave();
save.chem = { 'frost+thunder': 50, 'frost+stone': 50, 'stone+thunder': 50 };
const raw = (o = {}) => ({ mx: 0, my: 0, sprint: false, a: false, b: false, skill: false, ult: false, ...o });
const toward = (s, x, y) => { const dx = x - s.x, dy = y - s.y, l = Math.hypot(dx, dy) || 1; return { mx: dx / l, my: dy / l, l }; };

const bots = {
  cones(m, c, st) {
    const s = m.controlled();
    const g = c.gates[c.next];
    if (g) { const t = toward(s, g.x + 40, g.y); return raw({ mx: t.mx, my: t.my, sprint: s.stamina > 25 }); }
    const t = toward(s, 520, 0);
    st.tap = (st.tap || 0) + 1;
    return raw({ mx: t.mx, my: t.my, a: s.x > 440 && st.tap % 10 < 1 });
  },
  sniper(m, c, st) {
    const s = m.controlled(), p = m.puck;
    const lit = c.targets.find((t) => t.lit);
    const my = lit ? (lit.y < -10 ? -1 : lit.y > 10 ? 1 : 0) : 0;
    const t = toward(s, 430, 60);
    const incoming = !p.owner && p.pass && p.pass.to === s;
    st.tap = (st.tap || 0) + 1;
    if (s.hasPuck) return raw({ my, a: st.tap % 6 < 1 });
    return raw({ mx: t.l > 20 ? t.mx * 0.5 : 0, my: incoming ? my : t.l > 20 ? t.my * 0.5 : my, a: incoming });
  },
  rondo(m, c, st) {
    const s = m.controlled();
    const chasers = m.teamSkaters(1);
    const near = chasers.reduce((a, b) => (Math.hypot(a.x - s.x, a.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? a : b));
    const away = toward(near, s.x, s.y);
    if (s.hasPuck) {
      st.hold = (st.hold || 0) + 1 / 60;
      const mates = m.teamSkaters(0).filter((k) => k !== s);
      const best = mates.reduce((a, b) => (m.nearestOpp(a) > m.nearestOpp(b) ? a : b));
      const t = toward(s, best.x, best.y);
      if (st.hold > 0.3) { st.hold = 0; return raw({ mx: t.mx, my: t.my, b: true }); }
      return raw({ mx: away.mx * 0.6, my: away.my * 0.6 });
    }
    st.hold = 0;
    return raw();
  },
  breakaway(m, c, st) {
    const s = m.controlled(), g = m.goalieAt(1);
    if (!s.hasPuck) return raw();
    const side = (c.attempt % 2 ? 1 : -1);
    const t = toward(s, GOAL_X - 170, side * 50);
    st.tap = (st.tap || 0) + 1;
    const shoot = GOAL_X - s.x < 210 && st.tap % 8 < 1;
    return raw({ mx: t.mx, my: shoot ? (g.y > 0 ? -1 : 1) : t.my, sprint: true, a: shoot });
  },
  tips(m, c, st) { // into the lane between the point and the middle of the net, SHOOT as it comes
    const s = m.controlled(), f = c.feeder, p = m.puck;
    const x = GOAL_X - 110, y = f.y * (GOAL_X - x) / (GOAL_X - f.x), stk = s.stickPoint();
    const t = toward(s, x + (s.x - stk.x), y + (s.y - stk.y));
    const near = !!p.shot && Math.hypot(p.x - s.x, p.y - s.y) < 140;
    return raw({ mx: t.l > 6 ? t.mx * Math.min(1, t.l / 40) : 0, my: t.l > 6 ? t.my * Math.min(1, t.l / 40) : 0, a: near });
  },
  faceoffs(m, c, st) { // (a 0.24 s reaction to the puck touching down)
    if (m.state !== 'faceoff') return raw();
    const go = m.dropped && m.stateT >= 1.1 + 0.24;
    const a = go && !st.pressed; st.pressed = go;
    return raw({ a });
  },
  shootout(m, c, st) {
    if (c.turn === 'us') return bots.breakaway(m, { attempt: c.round }, st);
    const g = m.goalieAt(-1), p = m.puck;
    return raw({ my: Math.max(-1, Math.min(1, (p.y * 0.4 - g.y) / 20)) });
  },
};

for (const id of [...Object.keys(DRILLS), 'shootout']) {
  for (const char of ['frost', 'thunder', 'stone']) {
    const scores = [];
    for (let r = 0; r < RUNS; r++) {
      const { cfg, ctrl, def } = createDrill(id, save, char, { seed: 100 + r, teamId: 'comets' });
      const m = new Match(cfg);
      const st = {};
      let t = 0;
      while (!ctrl.result && t < 240) {
        m.setHumanInput(m.state === 'play' || (id === 'faceoffs' && m.state === 'faceoff') ? bots[id](m, ctrl, st) : raw());
        m.update(1 / 60); t += 1 / 60;
      }
      if (!ctrl.result) { scores.push('DNF'); continue; }
      scores.push(id === 'shootout' ? `${ctrl.result.goals.join('-')}${ctrl.result.score ? 'W' : 'L'}` : `${formatScore(def, ctrl.result.score)}(${medalFor(def, ctrl.result.score)})`);
    }
    console.log(id.padEnd(10), char.padEnd(8), scores.join('  '));
  }
}

// the faceoff drill: quick hands win more draws, and going before the puck lands wins none
{
  const run = (react, early = false) => {
    const { cfg, ctrl } = createDrill('faceoffs', save, 'frost', { seed: 7 });
    const m = new Match(cfg);
    let t = 0, was = false;
    while (!ctrl.result && t < 120) {
      const go = m.state === 'faceoff' && (early ? m.stateT > 0.9 && !m.dropped : m.dropped && m.stateT >= 1.1 + react);
      m.setHumanInput(raw({ a: go && !was })); was = go;
      m.update(1 / 60); t += 1 / 60;
    }
    return ctrl.result ? ctrl.result.score : 'DNF';
  };
  const fast = run(0.12), mid = run(0.27), early = run(0, true);
  const ok = fast === 10 && mid === 5 && early === 0;
  console.log(ok ? 'faceoffs: ok' : '✗ faceoffs', { fast, mid, early });
  if (!ok) process.exitCode = 1;
}

// racing your best: a Sniper run keeps its pace, and the next run's HUD compares against it
{
  const run = (best) => {
    const s2 = { ...save, paces: best ? { sniper: best } : undefined };
    const { cfg, ctrl } = createDrill('sniper', s2, 'frost', { seed: 3 });
    const m = new Match(cfg);
    const st = {};
    let t = 0, note = '';
    while (!ctrl.result && t < 120) { m.setHumanInput(m.state === 'play' ? bots.sniper(m, ctrl, st) : raw()); m.update(1 / 60); t += 1 / 60; if (t > 30 && !note) note = ctrl.hud(m).note; }
    return { res: ctrl.result, note };
  };
  const a = run(null);
  const b = run({ score: a.res.score, pace: a.res.pace });
  const ok = a.res.pace.length > 1 && a.res.pace.at(-1)[1] === a.res.score && !a.note && /\d/.test(b.note);
  console.log(ok ? 'pace: ok' : '✗ pace', { pace: a.res.pace.length, score: a.res.score, note: b.note });
  if (!ok) process.exitCode = 1;
}
