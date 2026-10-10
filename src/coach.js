// The cub as coach for the youngest (Little player games, Batch DJ): short tips at the right
// moments, never too often. coachStep looks at the match each frame and says which tip to show
// now, if any: 'pass' (a rival right on the player's carrier and a teammate open), 'shoot' (in
// front of their net), 'chase' (the rivals have had the puck a while). Goals are the HUD's own
// (a cheer, or a "next one's ours"), and now and then a "Nice pass!" (coachPraise).
import { GOAL_X } from './rink.js';

export const COACH_GAP = 6; // seconds between tips
export const COACH_SAME = 14; // and before the same one again

export const newCoach = () => ({ t: 2, last: null, lastT: 0, theirs: 0 });

const nearestRival = (m, s) => {
  let d = 1e9;
  for (const o of m.skaters) if (o.team !== s.team && !o.parked) d = Math.min(d, Math.hypot(o.x - s.x, o.y - s.y));
  return d;
};

export function coachStep(st, m, dt) {
  st.t = Math.max(0, st.t - dt);
  st.lastT += dt;
  const p = m.puck, c = m.controlled && m.controlled();
  st.theirs = p.owner && p.owner.team !== 0 ? st.theirs + dt : 0;
  if (m.state !== 'play' || !c || st.t > 0) return null;
  let tip = null;
  if (c.hasPuck && m.inShootingRange(c) && Math.hypot(c.side * GOAL_X - c.x, c.y) < 330) tip = 'shoot';
  else if (c.hasPuck && nearestRival(m, c) < 70) {
    const to = m.choosePassTarget(c);
    if (to && nearestRival(m, to) > 90) tip = 'pass';
  } else if (st.theirs > 3) tip = 'chase';
  if (!tip || (tip === st.last && st.lastT < COACH_SAME)) return null;
  st.t = COACH_GAP; st.last = tip; st.lastT = 0;
  return tip;
}

// A pass of the player's reached a teammate: now and then a "Nice pass!" (every third one, when
// the cub's free to talk).
export function coachPraise(st) {
  if (st.t > 0) return false;
  st.praised = (st.praised || 0) + 1;
  if (st.praised % 3 !== 1) return false;
  st.t = COACH_GAP;
  return true;
}

