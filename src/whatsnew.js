// What's new since a returning player last looked, shown once in the hub. A new entry goes
// first; anyone who started after it has nothing new to read.
export const WHATS_NEW = [
  {
    id: '2026-10-09',
    items: [
      { icon: 'icons/arch_dangler', text: 'Dekes: tap SPRINT with a defender in front to cut past them. Near the goalie, a deke can make them bite.' },
      { icon: 'achievements/puck_protector', text: 'Players work the puck from forehand to backhand, cross over through hard turns, and shield it from a reaching stick.' },
      { icon: 'power_pucks/plain/phase_1', text: 'Faceoffs: wait for the puck to touch the ice, then press. Go too early and you\'re a step slow.' },
      { icon: 'icons/rookie', text: 'Name your own players: Rename on a drafted rookie\'s or a free agent\'s card, or right after the pick on Draft Day.' },
      { icon: 'achievements/game_face', text: 'Goalies can pick a new mask at goalie camp, and the club editor has new crests.' },
      { icon: 'icons/rule_moonbeams', text: 'The Glacier Owls\' Observatory and the Thunder Moose\'s Longhouse have rules of their own: a moonbeam and loose planks.' },
      { icon: 'icons/challenge', text: 'Penalty shots: haul a skater down from behind on a breakaway and they go one on one with the goalie. One against you, and you\'re in goal for it, as in shootouts.' },
      { icon: 'icons/stat_games', text: 'Forfeiting a league or playoff game now counts as a loss. After a quick game, Play again starts it over.' },
    ],
  },
];

// The entry to show, or null (and a new player is marked as up to date).
export function whatsNewFor(save) {
  const latest = WHATS_NEW[0];
  if (!latest || save.seenWhatsNew === latest.id) return null;
  if (!save.record || save.record.played === 0) { save.seenWhatsNew = latest.id; return null; }
  return latest;
}
