// Trades: one of your signings, free agents or drafted rookies (not the cast, not the legends), plus coins
// when it doesn't cover the price, for a rival's player who'll take your call. What you give
// is worth what it cost (or a rookie's promise) plus a little for every level since, and
// each rival values the styles it likes a quarter more. The player you give joins that
// rival's reserves: they don't play against you, and a signing doesn't go back to their old
// club.
import { RECRUITS, ROOKIES, LEGENDS, TEAMS, member, KIT_OF_ROLE } from './data.js';
import { rosterIds, recruitStatus, addRecruit } from './progress.js';

export const TEAM_LIKES = {
  lynx: ['speedster', 'grinder'], comets: ['sniper', 'blueliner'], rams: ['enforcer', 'grinder'],
  ravens: ['dangler', 'playmaker'], royals: ['playmaker', 'sniper'], owls: ['playmaker', 'blueliner'], moose: ['enforcer', 'speedster'],
};

export const tradeable = (save) => rosterIds(save).filter((id) => (RECRUITS[id] || ROOKIES[id]) && !LEGENDS[id]);

export function playerValue(save, id) {
  const r = save.roster[id], lv = r ? r.level - 1 : 0;
  if (RECRUITS[id]) return RECRUITS[id].price + lv * 20;
  if (ROOKIES[id]) return ROOKIES[id].agent ? ROOKIES[id].price + lv * 20 : 100 + ROOKIES[id].potential * 40 + lv * 20; // (a free agent: what they cost)
  return 0;
}

// What a trade costs: { value, likes, coins } (coins to add, rounded to tens).
export function tradeQuote(save, give, get) {
  const team = RECRUITS[get].team, likes = (TEAM_LIKES[team] || []).includes(member(give).def.arch);
  const value = Math.round(playerValue(save, give) * (likes ? 1.25 : 1));
  return { value, likes, coins: Math.max(0, Math.ceil((RECRUITS[get].price - value) / 10) * 10) };
}

// (coins: a rival's own offer, which can pay you; otherwise the quote)
export function trade(save, give, get, coins = null) {
  if (!RECRUITS[get] || recruitStatus(save, get) !== 'open' || !tradeable(save).includes(give)) return null;
  const q = coins === null ? tradeQuote(save, give, get) : { ...tradeQuote(save, give, get), coins };
  if (save.coins < q.coins) return null;
  save.coins -= q.coins;
  const team = RECRUITS[get].team, role = member(give).role;
  delete save.roster[give];
  (save.tradedAway ||= {})[give] = team; // (with that club's reserves now)
  if (save.lineup[role] === give) save.lineup[role] = KIT_OF_ROLE[role];
  addRecruit(save, get);
  (save.trades ||= []).push({ season: save.season, give, get, team, coins: q.coins });
  return { ...q, team: TEAMS[team] };
}
