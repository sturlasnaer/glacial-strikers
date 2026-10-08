// Achievements: tracked from match events and save progress, shown in the Trophies tab.

import { TEAMS, GEAR, CHEM_LEVELS, RECRUITS } from './data.js';

const TROPHY = 'equipment_items/reward/trophy', MEDAL = 'equipment_items/reward/medal', STAR = 'hud_elements/misc/level_star';

export const ACHIEVEMENTS = [
  { id: 'first-goal', name: 'Lamp Lighter', text: 'Score your first goal.', icon: STAR, coins: 25 },
  { id: 'hat-trick', name: 'Hat Trick', text: 'One of your skaters scores 3 goals in a match.', icon: MEDAL, coins: 60 },
  { id: 'shutout', name: 'Brick Wall', text: 'Win a match 5–0.', icon: 'equipment_items/armor/goalie_gloves', coins: 80 },
  { id: 'comeback', name: 'Never Out of It', text: 'Win after trailing by 3 goals.', icon: MEDAL, coins: 100 },
  { id: 'blitz', name: 'Blitz', text: 'Win a match in under 2 minutes.', icon: 'equipment_items/skates/lightning', coins: 70 },
  { id: 'one-timers', name: 'One-Timer Specialist', text: 'Score 10 one-timer goals.', icon: 'equipment_items/stick/slapshot', coins: 70, counter: 'oneTimerGoals', goal: 10 },
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', text: 'Complete 5 passes in a row.', icon: 'equipment_items/stick/passing', coins: 40 },
  { id: 'combos', name: 'Chemistry Class', text: 'Score with Frostbolt, Avalanche and Thunderquake.', icon: 'hud_elements/ability/lightning', coins: 120, set: 'comboGoals', goal: 3 },
  { id: 'ultimates', name: 'Ultimate Power', text: 'Score with Absolute Zero and Thunderclap, and stop a shot with Monolith.', icon: 'hud_elements/ability/frost', coins: 100, set: 'ults', goal: 3 },
  { id: 'power-pucks', name: 'Elemental', text: 'Score with all four power pucks.', icon: 'power_pucks/gravity/pickup_orb', coins: 90, set: 'powerGoals', goal: 4 },
  { id: 'hitter', name: 'Freight Train', text: 'Land 10 checks in one match.', icon: 'equipment_items/armor/shoulders', coins: 50 },
  { id: 'pickpocket', name: 'Pickpocket', text: 'Make 6 steals in one match.', icon: 'equipment_items/armor/gloves', coins: 50 },
  { id: 'power-play', name: 'Power Play Pro', text: 'Score a power-play goal.', icon: 'hud_elements/ability/fire', coins: 40 },
  { id: 'shorthanded', name: 'Shorthanded', text: 'Score while one of your skaters is in the box.', icon: 'hud_elements/ability/stone', coins: 80 },
  { id: 'empty-net', name: 'Empty Netter', text: 'Score into an empty net.', icon: 'rink_props/nets/south', coins: 40 },
  { id: 'extra-attacker', name: 'Extra Attacker', text: 'Score with your own goalie pulled.', icon: 'hud_elements/misc/player_arrow', coins: 90 },
  { id: 'clean', name: 'Clean Game', text: 'Win a league match without taking a penalty.', icon: 'hud_elements/ability/stamina', coins: 30 },
  { id: 'challenge', name: 'Up for a Challenge', text: 'Win an exhibition with 3 or more challenges on.', icon: 'equipment_items/hub/target', coins: 80 },
  { id: 'champion', name: 'Frostline Champions', text: 'Win the Frostline Cup.', icon: TROPHY, coins: 200 },
  { id: 'dynasty', name: 'Dynasty', text: 'Win the cup in two seasons.', icon: TROPHY, coins: 250 },
  { id: 'perfect', name: 'Perfect Season', text: 'Win all 5 regular-season games.', icon: TROPHY, coins: 150 },
  { id: 'rivals', name: 'Rival Slayer', text: 'Beat every rival at least once.', icon: 'hud_elements/misc/away_crest', coins: 80 },
  { id: 'max-level', name: 'Fully Grown', text: 'Get a skater to level 10.', icon: STAR, coins: 100 },
  { id: 'in-sync', name: 'In Sync', text: 'Get a pair to chemistry level 3.', icon: 'hud_elements/ability/lightning', coins: 100 },
  { id: 'gold-drills', name: 'Gold Standard', text: 'Win gold in all four training drills.', icon: MEDAL, coins: 150 },
  { id: 'shootout', name: 'Shootout Hero', text: 'Win a shootout.', icon: 'equipment_items/armor/goalie_gloves', coins: 50 },
  { id: 'kitted', name: 'Fully Kitted', text: 'Own every piece of gear in the shop.', icon: 'equipment_items/hub/shop', coins: 150 },
  { id: 'signing', name: 'Free Agent', text: 'Sign a skater from a rival.', icon: 'equipment_items/hub/shop', coins: 40 },
  { id: 'scout', name: 'Talent Scout', text: 'Sign a skater from every rival.', icon: 'equipment_items/hub/target', coins: 150 },
  { id: 'mvp', name: 'Most Valuable', text: 'A Foxes skater wins League MVP.', icon: TROPHY, coins: 150 },
  { id: 'sweep', name: 'Awards Sweep', text: 'Win three or more season awards in one season.', icon: TROPHY, coins: 200 },
  { id: 'daily', name: 'Daily Grind', text: 'Beat a daily challenge.', icon: 'hud_elements/misc/level_star', coins: 40 },
  { id: 'daily-streak', name: 'On a Roll', text: 'Beat the daily challenge seven days in a row.', icon: MEDAL, coins: 200 },
  { id: 'versus', name: 'Couch Champion', text: 'Win a local versus match.', icon: 'hud_elements/misc/home_crest', coins: 30 },
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export class AchievementTracker {
  constructor(save, onUnlock) {
    this.save = save;
    this.onUnlock = onUnlock;
    save.achievements ||= { unlocked: {}, counters: {}, sets: {} };
    this.data = save.achievements;
  }

  has(id) { return !!this.data.unlocked[id]; }

  unlock(id) {
    if (this.has(id) || !BY_ID[id]) return;
    const a = BY_ID[id];
    this.data.unlocked[id] = Date.now();
    this.save.coins += a.coins;
    this.onUnlock(a);
  }

  bump(counter, n = 1) {
    this.data.counters[counter] = (this.data.counters[counter] || 0) + n;
    for (const a of ACHIEVEMENTS) if (a.counter === counter && this.data.counters[counter] >= a.goal) this.unlock(a.id);
  }

  addToSet(set, value) {
    const s = (this.data.sets[set] ||= []);
    if (!s.includes(value)) s.push(value);
    for (const a of ACHIEVEMENTS) if (a.set === set && s.length >= a.goal) this.unlock(a.id);
  }

  progress(a) {
    if (a.counter) return [Math.min(a.goal, this.data.counters[a.counter] || 0), a.goal];
    if (a.set) return [Math.min(a.goal, (this.data.sets[a.set] || []).length), a.goal];
    return null;
  }

  // Watch a real match (not drills or versus) for in-game achievements.
  attachMatch(m) {
    this.minDiff = 0;
    m.on('goal', (g) => {
      this.minDiff = Math.min(this.minDiff, m.score[0] - m.score[1]);
      if (g.team !== 0 || !g.scorer) return;
      this.unlock('first-goal');
      if (g.kind === 'onetimer') this.bump('oneTimerGoals');
      if (g.special && g.special.combo) this.addToSet('comboGoals', g.special.combo);
      if (g.kind === 'zero' || g.kind === 'thunderclap') this.addToSet('ults', g.kind);
      if (g.power) this.addToSet('powerGoals', g.power);
      if (g.powerPlay) this.unlock('power-play');
      if (m.teamSkaters(0).some((k) => k.boxT > 0)) this.unlock('shorthanded');
      if (m.goalies.find((k) => k.team === 1).disabled) this.unlock('empty-net');
      if (m.extra && m.extra[0]) this.unlock('extra-attacker');
    });
    m.on('no_goal', () => { this.minDiff = Math.min(this.minDiff, m.score[0] - m.score[1]); });
    m.on('chain', (e) => { if (e.team === 0 && e.n >= 5) this.unlock('tic-tac-toe'); });
    m.on('barrier_block', (e) => { if (e.b.team === 0) this.addToSet('ults', 'monolith'); });
  }

  endMatch(summary, ctx) {
    const won = summary.winner === 0;
    const mine = summary.skaters.filter((k) => k.team === 0);
    if (mine.some((k) => k.goals >= 3)) this.unlock('hat-trick');
    if (won && summary.score[1] === 0 && summary.score[0] >= 5) this.unlock('shutout');
    if (won && this.minDiff <= -3) this.unlock('comeback');
    if (won && summary.time < 120) this.unlock('blitz');
    if (mine.reduce((a, k) => a + k.hits, 0) >= 10) this.unlock('hitter');
    if (mine.reduce((a, k) => a + k.steals, 0) >= 6) this.unlock('pickpocket');
    if (won && ctx.league && summary.pen && summary.pen[0].pims === 0) this.unlock('clean');
    if (won && ctx.exhibition && (ctx.mods || []).length >= 3) this.unlock('challenge');
  }

  // Progress-based achievements from the save itself.
  checkMeta() {
    const s = this.save;
    if (s.champion || (s.league && s.league.champion === 'home')) this.unlock('champion');
    if ((s.cups || 0) >= 2) this.unlock('dynasty');
    const L = s.league;
    if (L && L.results.length >= 5 && L.results.slice(0, 5).every((r) => r[0].ga > r[0].gb)) this.unlock('perfect');
    const rivals = Object.keys(TEAMS).filter((k) => k !== 'home');
    if (s.rivals && rivals.every((k) => s.rivals[k] && s.rivals[k].wins > 0)) this.unlock('rivals');
    if (Object.values(s.roster).some((r) => r.level >= 10)) this.unlock('max-level');
    if (Object.values(s.chem || {}).some((x) => x >= CHEM_LEVELS[2])) this.unlock('in-sync');
    if (s.training && ['cones', 'sniper', 'rondo', 'breakaway'].every((d) => (s.training.medals[d] || 0) >= 3)) this.unlock('gold-drills');
    if (GEAR.every((g) => s.owned.includes(g.id))) this.unlock('kitted');
    const signed = Object.keys(RECRUITS).filter((k) => s.roster[k]);
    if (signed.length) this.unlock('signing');
    if (new Set(signed.map((k) => RECRUITS[k].team)).size >= 5) this.unlock('scout');
  }
}
