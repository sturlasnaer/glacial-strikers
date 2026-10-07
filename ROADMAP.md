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

Ideas for later:
1. **Online leaderboards** for training drills and shootouts (needs a small backend).
2. **Season awards** at the end of each season: MVP, top scorer, best goalie, each with a portrait card.
3. **Custom team name and colours** for your club.
4. **Daily challenge:** a seeded match with fixed modifiers and a streak counter.

## Next, with art

Done: recruitment (sign rival skaters, pick a line-up). Done from the v2 pack: rival casts, portraits and expressions, crests, banner cut-ins, signature celebrations, three arenas, sprite crowd, locker-room hub and hub characters.

1. **Arena twists.** Give each building a rule that fits it: warm soft ice in the Ember Dome, aurora speed lanes in the Palace, pond cracks on Pine Pond.
2. **Clickable locker room.** Stations in the room (stick rack, shop counter, coach's board) instead of tabs.
3. **Visible gear** overlays for sticks and skates, once animations are final.

## Balance knobs

`node tools/sim.mjs` reports goals, save percentage, match length and ability use for AI vs AI. Current targets are about 92% save rate, 4–6 minute matches and 1–2 ultimates per skater per match. Change one number at a time in `src/match.js` (shots, saves), `src/entities.js` (skating, goalie reach) or `src/ai.js` (decisions), then re-run the sim.
