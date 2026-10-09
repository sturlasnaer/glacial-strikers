// Career numbers: lifetime totals for every skater who has played for the club, and for
// each of our goalies, from every full match (league, playoffs, the Winter Classic, the
// All-Star Game, exhibitions and the daily challenge; not drills or local versus). Kept per
// season too, for the season-by-season lines on the career page.
import { member } from './data.js';
import { seasonStats } from './awards.js';

const SKATER = () => ({ gp: 0, w: 0, g: 0, a: 0, shots: 0, hits: 0, steals: 0, blocks: 0, seasons: {} });
const GOALIE = () => ({ gp: 0, w: 0, sa: 0, sv: 0, so: 0 });

// The save's career book. A save from before careers were kept starts from this season's
// league numbers, so the page isn't empty.
export function careerOf(save) {
  if (save.career) {
    const c = save.career;
    if (!c.goalies) { c.goalies = { halla: c.goalie || GOALIE() }; delete c.goalie; } // one goalie line before signings
    return c;
  }
  const c = save.career = { skaters: {}, goalies: { halla: GOALIE() } };
  const st = save.league && save.league.stats ? seasonStats(save.league) : null;
  if (st) {
    for (const r of Object.values(st.skaters)) {
      if (r.team !== 'home' || !member(r.face)) continue;
      const k = (c.skaters[r.face] ||= SKATER());
      k.gp += r.gp; k.g += r.g; k.a += r.a; k.shots += r.shots || 0; k.hits += r.hits; k.steals += r.steals; k.blocks += r.blocks || 0;
      k.seasons[save.season] = { gp: r.gp, g: r.g, a: r.a };
    }
    const g = st.goalies.home;
    if (g) Object.assign(c.goalies.halla, { gp: g.gp, sa: g.sa, sv: g.sv, so: g.so });
  }
  return c;
}

// The three stars of a match, best first: from either team, goals counting most, a goalie with a
// big night among them, and the winners ahead on a tie. Goalies come as { goalie, team, saves, ga }.
export function threeStars(sm) {
  const goalies = [0, 1].map((tm) => ({ goalie: true, team: tm, saves: sm.saves[tm], ga: sm.score[1 - tm] }));
  const score = (k) => (k.goalie ? (k.saves >= 8 ? k.saves * 0.45 - k.ga * 1.2 + (k.ga === 0 ? 5 : 0) : -9)
    : k.goals * 5 + (k.goals >= 3 ? 2 : 0) + k.assists * 2.5 + ((k.steals || 0) + (k.blocks || 0)) * 0.6 + (k.hits || 0) * 0.25) + (sm.winner === k.team ? 1 : 0);
  return [...sm.skaters, ...goalies].map((k) => ({ k, v: score(k) })).sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.k);
}

// One full match from the summary (our side only).
export function recordCareer(save, summary, won) {
  const c = careerOf(save);
  for (const k of summary.skaters) {
    if (k.team !== 0 || !save.roster[k.id]) continue;
    const r = (c.skaters[k.id] ||= SKATER());
    r.gp++; if (won) r.w++;
    r.g += k.goals; r.a += k.assists; r.shots += k.shots || 0; r.hits += k.hits; r.steals += k.steals; r.blocks += k.blocks || 0;
    const ss = (r.seasons[save.season] ||= { gp: 0, g: 0, a: 0 });
    ss.gp++; ss.g += k.goals; ss.a += k.assists;
  }
  // where our goals came from, this season (for the map on the career page)
  const spots = ((c.goalMap ||= {})[save.season] ||= []);
  for (const k of summary.shotMap || []) if (k.team === 0 && k.goal) spots.push([k.x, k.y]);
  if (spots.length > 150) spots.splice(0, spots.length - 150);
  for (const season of Object.keys(c.goalMap)) if (+season < save.season - 1) delete c.goalMap[season]; // (this season and last)
  const g = (c.goalies[summary.goalie || 'halla'] ||= GOALIE());
  g.gp++; if (won) g.w++;
  // the three stars: how often each of ours was the first, second or third
  threeStars(summary).forEach((k, i) => {
    if (k.team !== 0) return;
    const r = k.goalie ? g : save.roster[k.id] && c.skaters[k.id];
    if (r) (r.stars ||= [0, 0, 0])[i]++;
  });
  g.sa += summary.shots[1]; g.sv += summary.saves[0];
  if (summary.score[1] === 0) g.so++;
}

// Goalie lines for the page: everyone who has played in goal for us (Halla always).
export function careerGoalies(save, ids) {
  const c = careerOf(save);
  return ids.map((id) => ({ id, ...GOALIE(), ...(c.goalies[id] || {}) }));
}

// Rows for the page: everyone on the roster (a signing who hasn't played yet shows zeros),
// most points first.
export function careerRows(save, ids) {
  const c = careerOf(save);
  return ids.map((id) => ({ id, ...SKATER(), ...(c.skaters[id] || {}) }))
    .map((r) => ({ ...r, pts: r.g + r.a }))
    .sort((a, b) => b.pts - a.pts || b.g - a.g || b.gp - a.gp);
}
