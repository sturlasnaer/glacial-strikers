# Roadmap: more immersive, more fun

Ideas beyond the blueprint, roughly in the order they'd pay off. "Art" marks items that need new sprites (see SPRITE-REQUESTS.md); everything else can be built with the current pack.

## Already added on top of the blueprint

- **One-timers.** Hold shoot as a pass arrives. This makes passing the best way to beat a goalie, which keeps the game team-first.
- **Readable goalie.** The goalie reads shots imperfectly, dives on wide shots, leaves rebounds and smothers loose pucks. Thunderclap's wind-up shows a target reticle and the goalie squares up, so ultimates create chances without guaranteeing goals.
- **Arena that reacts.** Fans in team colours bounce harder as the game heats up and hold up signs, arena lamps flicker, and on goals the lamp flashes in the scoring team's colour with the horn, crowd roar, slow-mo, camera punch and confetti.
- **The ice remembers.** Skate scratches build up over the match. Hard stops throw snow, and snow falls over the arena.
- **Rivals have identity.** Each team gets its own jersey colours, names, pre- and post-match banter, play style and a twist arena.
- **A living league.** Six-team standings, simulated rival games, playoffs, scouting reports, game plans with counter-picks, and locker-room scenes that give the cast personality between matches.
- **Chemistry combos.** Pairs build chemistry over the season. A pass into a quick shot between bonded teammates fires Frostbolt, Avalanche or Thunderquake, and pass chains add power. This rewards the passing game and gives the RPG side a team-building layer.
- **Broadcast feel.** Instant goal replays, a play-by-play ticker, ultimate cut-ins and crowd chants (the cheered team's ultimates charge faster while the chant lasts).
- **Earned juice.** Hit-stop and shake scale with hit power. Posts ping with a crowd "ooh", and pop-up text calls out one-timers, steals, blocks and power pucks.

## Next, without new art

Everything on the original list is done: chemistry, rivalries, training mini-games, shootouts, local versus, gamepad rumble, challenges, the league with playoffs, game plans, locker-room moments, penalties, pulling the goalie, offline install, accessibility settings, goal clips and achievements.

Online leaderboards are built (drills, shootout wins, daily streaks). The client queues scores until the AWS server is deployed.

Ideas for later:
1. **Weekly boards** that reset, and friends-only boards via a shared code.
2. **Replay checks** on the server if faked scores become a problem.

## Next, with art

Done: recruitment (sign rival skaters, pick a line-up), arena rules (meltwater, aurora lanes, pond cracks), the clickable locker room, visible gear on the ice, season awards, the daily challenge and custom club name and colours, goalie life from the v5 goalies (front and back views, skating to and from the bench, pass wind-ups and poke checks), the new name (Puckbound, with the Snowcrest Foxes as the home team), gear recolours on the sprites from the Batch M masks, true-profile goalies both ways (Batch L), near-side crowd sprites (Batch N), goalies who leave the crease to play pucks behind the net (with AI dump-ins), the remaining packs (the Rams' Golden Hall and the Ravens' Dark Aerie, glass-bangers, camera flashes and flag wavers, the volcanic scoreboard, Brekka, Ottar and Kip standing in the locker room with the chest and league board, sprite arena rules, rival side strides and captain celebrations, the title logo, the resurfacer's lap and championship fireworks), the new batches (penalty boxes, rival mascots, rumble strips in the Golden Hall and raven shadows in the Dark Aerie, themed scoreboards, Sniper targets and speed-lane tiles, gear masks for the rival strides), Icelandic (every string, with a glossary and a checker), and the new soundtrack (15 tracks on a chiptune tracker engine, a theme for every arena, arena acoustics and horns, a voiced crowd, a Music room). Done from the v2 pack: rival casts, portraits and expressions, crests, banner cut-ins, signature celebrations, three arenas, sprite crowd, locker-room hub and hub characters.

1. **Celebrations for every rival skater** (Batch D), so wingers, defenders and our signings celebrate like the captains.
2. **Rule icons** on the arena chips, the daily card and rule announcements (Batch O), and **an icon for every achievement** (Batch E).
3. **An Awards Night stage** with Kip at the podium (Batch J), and **a rustic penalty box** for Pine Pond (Batch F).

## Balance knobs

`node tools/sim.mjs` reports goals, save percentage, match length and ability use for AI vs AI. Current targets are about 92% save rate, 4–6 minute matches and 1–2 ultimates per skater per match. Change one number at a time in `src/match.js` (shots, saves), `src/entities.js` (skating, goalie reach) or `src/ai.js` (decisions), then re-run the sim.
