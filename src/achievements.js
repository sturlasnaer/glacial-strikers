// Achievements: tracked from match events and save progress, shown in the Trophies tab.

import { TEAMS, GEAR, CHEM_LEVELS, RECRUITS, CAST_PAIRS, LEGENDS, ELEMENTS, GOALIE_RECRUITS } from './data.js';

const TROPHY = 'equipment_items/reward/trophy', MEDAL = 'equipment_items/reward/medal', STAR = 'hud_elements/misc/level_star';

export const ACHIEVEMENTS = [
  { id: 'first-goal', name: 'Lamp Lighter', text: 'Score your first goal.', icon: 'achievements/lamp_lighter', coins: 25 },
  { id: 'hat-trick', name: 'Hat Trick', text: 'One of your skaters scores 3 goals in a match.', icon: 'achievements/hat_trick', coins: 60 },
  { id: 'shutout', name: 'Brick Wall', text: 'Win a match 5–0.', icon: 'equipment_items/armor/goalie_gloves', coins: 80 },
  { id: 'comeback', name: 'Never Out of It', text: 'Win after trailing by 3 goals.', icon: 'achievements/never_out_of_it', coins: 100 },
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
  { id: 'dynasty', name: 'Dynasty', text: 'Win the cup in two seasons.', icon: 'achievements/dynasty', coins: 250 },
  { id: 'perfect', name: 'Perfect Season', text: 'Win every regular-season game.', icon: 'achievements/perfect_season', coins: 150 },
  { id: 'between-pipes', name: 'Between the Pipes', text: 'Win a match in goalie mode.', icon: 'goalie_actions/butterfly', coins: 80 },
  { id: 'winter-classic', name: 'Winter Classic', text: 'Win the Winter Classic on Pine Pond.', icon: 'achievements/winter_classic', coins: 120 },
  { id: 'all-star', name: 'All-Star', text: 'Win the All-Star Game.', icon: 'allstar/allstar_achievement', coins: 100 },
  { id: 'rivals', name: 'Rival Slayer', text: 'Beat every rival at least once.', icon: 'hud_elements/misc/away_crest', coins: 80 },
  { id: 'max-level', name: 'Fully Grown', text: 'Get a skater to level 10.', icon: STAR, coins: 100 },
  { id: 'in-sync', name: 'In Sync', text: 'Get a pair to chemistry level 3.', icon: 'achievements/in_sync', coins: 100 },
  { id: 'gold-drills', name: 'Gold Standard', text: 'Win gold in all four training drills.', icon: MEDAL, coins: 150 },
  { id: 'shootout', name: 'Shootout Hero', text: 'Win a shootout.', icon: 'achievements/shootout_hero', coins: 50 },
  { id: 'kitted', name: 'Fully Kitted', text: 'Own every piece of gear in the shop.', icon: 'equipment_items/hub/shop', coins: 150 },
  { id: 'signing', name: 'Free Agent', text: 'Sign a skater from a rival.', icon: 'achievements/free_agent', coins: 40 },
  { id: 'scout', name: 'Talent Scout', text: 'Sign a skater from every rival.', icon: 'achievements/talent_scout', coins: 150 },
  { id: 'mvp', name: 'Most Valuable', text: 'A Foxes skater wins League MVP.', icon: 'achievements/most_valuable', coins: 150 },
  { id: 'sweep', name: 'Awards Sweep', text: 'Win three or more season awards in one season.', icon: 'achievements/awards_sweep', coins: 200 },
  { id: 'daily', name: 'Daily Grind', text: 'Beat a daily challenge.', icon: 'achievements/daily_grind', coins: 40 },
  { id: 'daily-streak', name: 'On a Roll', text: 'Beat the daily challenge seven days in a row.', icon: 'achievements/on_a_roll', coins: 200 },
  { id: 'versus', name: 'Couch Champion', text: 'Win a local versus match.', icon: 'hud_elements/misc/home_crest', coins: 30 },
  // the newer systems (art: their own icon from Batch AN; icon: a stand-in until then)
  { id: 'first-pick', name: 'First Pick', text: 'Draft a rookie on Draft Day.', icon: 'achievements/free_agent', art: 'achievements/first_pick', coins: 60 },
  { id: 'new-tricks', name: 'New Tricks', text: 'Change a player\'s style or super at training camp.', icon: 'hud_elements/misc/level_star', art: 'achievements/new_tricks', coins: 50 },
  { id: 'dealmaker', name: 'Dealmaker', text: 'Trade one of your players to a rival.', icon: 'achievements/talent_scout', art: 'achievements/dealmaker', coins: 60 },
  { id: 'second-keeper', name: 'Pads for Hire', text: 'Sign a rival\'s goalie.', icon: 'icons/award_iron_wall', art: 'achievements/pads_for_hire', coins: 60 },
  { id: 'legend', name: 'Legendary', text: 'Sign a legend who turned up in Scouting.', icon: 'achievements/most_valuable', art: 'achievements/legendary', coins: 120 },
  { id: 'twins', name: 'Side by Side', text: 'Dress Fáfnir and Fenrir for the same match.', icon: 'achievements/in_sync', art: 'achievements/side_by_side', coins: 100 },
  { id: 'ragnarok', name: 'Ragnarök', text: 'Score with Ragnarök, the twins\' combo.', icon: 'hud_elements/ability/fire', art: 'achievements/ragnarok', coins: 150 },
  { id: 'elements', name: 'Six Elements', text: 'Score with skaters of all six elements.', icon: 'power_pucks/gravity/pickup_orb', art: 'achievements/six_elements', coins: 120, set: 'elemGoals', goal: 6 },
  { id: 'veteran', name: 'Veteran Presence', text: 'Sign a free agent from the market.', icon: 'achievements/free_agent', art: 'achievements/veteran_presence', coins: 50 },
  // the expansion buildings, the puck on the stick, goalie masks and crests (Batch BF art; a stand-in until then)
  { id: 'moonstruck', name: 'Moonstruck', text: 'Score out of the Observatory\'s moonbeam.', icon: 'icons/rule_moonbeams', art: 'achievements/moonstruck', coins: 80 },
  { id: 'splinters', name: 'Splinters', text: 'Score off a loose plank\'s bounce at the Longhouse.', icon: 'icons/rule_loose_planks', art: 'achievements/splinters', coins: 80 },
  { id: 'protector', name: 'Puck Protector', text: 'Shield the puck from a defender 15 times in one match.', icon: 'achievements/pickpocket', art: 'achievements/puck_protector', coins: 70 },
  { id: 'game-face', name: 'Game Face', text: 'Pick a new mask for a goalie at goalie camp.', icon: 'icons/gstyle_hybrid', art: 'achievements/game_face', coins: 30 },
  { id: 'new-colours', name: 'New Colours', text: 'Give the club a new crest.', icon: 'hud_elements/misc/home_crest', art: 'achievements/new_colours', coins: 30 },
  // the deke and the faceoff (Batch BK art; a stand-in until then)
  { id: 'sold-it', name: 'Sold It', text: 'Score right after a deke makes the goalie bite.', icon: 'icons/arch_dangler', art: 'achievements/sold_it', coins: 70 },
  { id: 'penalty-shot', name: 'From the Spot', text: 'Score on a penalty shot.', icon: 'icons/challenge', art: 'achievements/from_the_spot', coins: 60 },
  { id: 'off-the-drop', name: 'Off the Drop', text: 'Win three faceoffs clean in one match.', icon: 'power_pucks/plain/phase_1', art: 'achievements/off_the_drop', coins: 60 },
  { id: 'weekly-cup', name: 'Cup of the Week', text: 'Win a Weekly Cup on a friends board.', icon: 'badges/rank_1', art: 'achievements/cup_of_the_week', coins: 100 },
];
// Batch AF: the achievements that borrowed a gear or HUD picture get their own.
const AF_ART = {
  shutout: 'brick_wall', blitz: 'blitz', 'one-timers': 'one_timer', 'tic-tac-toe': 'tic_tac_toe', combos: 'chemistry_class',
  ultimates: 'ultimate_power', 'power-pucks': 'elemental', hitter: 'freight_train', pickpocket: 'pickpocket', 'power-play': 'power_play',
  shorthanded: 'shorthanded', 'empty-net': 'empty_netter', 'extra-attacker': 'extra_attacker', clean: 'clean_game', challenge: 'up_for_a_challenge',
  champion: 'frostline_champions', 'between-pipes': 'between_the_pipes', rivals: 'rival_slayer', 'max-level': 'fully_grown',
  'gold-drills': 'gold_standard', kitted: 'fully_kitted', versus: 'couch_champion',
};
// Their own icons once they're in the pack.
export function useAchievementArt(frames) {
  for (const a of ACHIEVEMENTS) {
    const art = a.art || (AF_ART[a.id] && 'achievements/' + AF_ART[a.id]);
    if (art && frames[art]) a.icon = art;
  }
}
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const RECRUITS_G = (k) => !!GOALIE_RECRUITS[k]; // a rival's goalie, the expansion clubs' too (not a free agent)

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
    let glareT = -9, plankT = -9, shields = 0, biteT = -9, clean = 0;
    m.on('deke_goalie', (e) => { if (e.s.team === 0) biteT = m.time; });
    let ourShot = false; // (a penalty shot of ours under way)
    m.on('penalty_shot', (e) => { ourShot = e.s.team === 0; });
    m.on('penalty_shot_over', () => { ourShot = false; });
    m.on('faceoff', () => { ourShot = false; });
    m.on('faceoff_win', (e) => { if (e.clean && e.s.team === 0 && ++clean >= 3) this.unlock('off-the-drop'); });
    m.on('glare', (e) => { if (e.g.team === 1) glareT = m.time; }); // (their goalie, dazzled by our shot)
    m.on('plank', () => { plankT = m.time; });
    m.on('shield', (e) => { if (e.s.team === 0 && ++shields >= 15) this.unlock('protector'); });
    const ours = m.teamSkaters(0).map((k) => k.who);
    if (Object.keys(LEGENDS).every((k) => ours.includes(k))) this.unlock('twins');
    m.on('goal', (g) => {
      this.minDiff = Math.min(this.minDiff, m.score[0] - m.score[1]);
      if (g.team !== 0 || !g.scorer) return;
      this.unlock('first-goal');
      if (g.kind === 'onetimer') this.bump('oneTimerGoals');
      if (g.special && CAST_PAIRS.includes(g.special.combo)) this.addToSet('comboGoals', g.special.combo); // (the three it names)
      if (g.special && g.special.combo === 'ragnarok') this.unlock('ragnarok');
      if (g.scorer.def && ELEMENTS[g.scorer.def.elem]) this.addToSet('elemGoals', g.scorer.def.elem);
      if (g.kind === 'zero' || g.kind === 'thunderclap') this.addToSet('ults', g.kind);
      if (g.power) this.addToSet('powerGoals', g.power);
      if (g.powerPlay) this.unlock('power-play');
      if (m.teamSkaters(0).some((k) => k.boxT > 0)) this.unlock('shorthanded');
      if (m.goalies.find((k) => k.team === 1).disabled) this.unlock('empty-net');
      if (m.extra && m.extra[0]) this.unlock('extra-attacker');
      if (m.time - glareT < 1.5) this.unlock('moonstruck');
      if (m.time - plankT < 2.5) this.unlock('splinters');
      if (m.time - biteT < 2) this.unlock('sold-it');
      if (ourShot) this.unlock('penalty-shot');
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
    if (L && L.schedule && L.results.length >= L.schedule.length && L.results.slice(0, L.schedule.length).every((r) => r[0].ga > r[0].gb)) this.unlock('perfect');
    const rivals = Object.keys(TEAMS).filter((k) => k !== 'home');
    if (s.rivals && rivals.every((k) => s.rivals[k] && s.rivals[k].wins > 0)) this.unlock('rivals');
    if (Object.values(s.roster).some((r) => r.level >= 10)) this.unlock('max-level');
    if (Object.values(s.chem || {}).some((x) => x >= CHEM_LEVELS[2])) this.unlock('in-sync');
    if (s.training && ['cones', 'sniper', 'rondo', 'breakaway'].every((d) => (s.training.medals[d] || 0) >= 3)) this.unlock('gold-drills');
    if (GEAR.every((g) => s.owned.includes(g.id))) this.unlock('kitted');
    const signed = Object.keys(RECRUITS).filter((k) => s.roster[k]);
    if (signed.length) this.unlock('signing');
    if (new Set(signed.map((k) => RECRUITS[k].team)).size >= 5) this.unlock('scout');
    if (Object.keys(s.rookies || {}).length) this.unlock('first-pick');
    if (Object.values(s.roster).some((r) => r.camp) || [s.goalie, ...Object.values(s.goalies || {})].some((g) => g && g.camp)) this.unlock('new-tricks');
    if ((s.trades || []).length) this.unlock('dealmaker');
    if (Object.keys(s.goalies || {}).some((k) => RECRUITS_G(k))) this.unlock('second-keeper');
    if (Object.values(s.rookies || {}).some((k) => k.agent) || Object.keys(s.freeGoalies || {}).length) this.unlock('veteran');
    if (Object.keys(LEGENDS).some((k) => s.roster[k])) this.unlock('legend');
    if ((s.weeklyCups || []).some((w) => w.place === 1)) this.unlock('weekly-cup');
  }
}
