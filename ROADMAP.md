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

## Next, with art

Done: recruitment (sign rival skaters, pick a line-up), arena rules (meltwater, aurora lanes, pond cracks), the clickable locker room, visible gear on the ice, season awards, the daily challenge and custom club name and colours, goalie life from the v5 goalies (front and back views, skating to and from the bench, pass wind-ups and poke checks), the new name (Puckbound, with the Snowcrest Foxes as the home team), and the new soundtrack (13 tracks on a chiptune tracker engine, arena acoustics and horns, a voiced crowd, a Music room). Done from the v2 pack: rival casts, portraits and expressions, crests, banner cut-ins, signature celebrations, three arenas, sprite crowd, locker-room hub and hub characters.

1. **Gear recolours on the sprites** with the gear masks (Batch M), arriving now.
2. **Goalies facing both ways** once Batch L lands: the goalie in the right-hand net uses real left-facing art, with the glove on the correct hand, and the save logic follows (the glove side is toward the camera there).
3. **Near-side crowd sprites** (Batch N) in place of the drawn fans on the near benches.
4. **Locker-room characters** standing at their stations (Batch H).
5. **Goalies who leave the crease** to play rimmed pucks behind the net, now that there's skating and puck-handling art (needs pathing around the net).

## Balance knobs

`node tools/sim.mjs` reports goals, save percentage, match length and ability use for AI vs AI. Current targets are about 92% save rate, 4–6 minute matches and 1–2 ultimates per skater per match. Change one number at a time in `src/match.js` (shots, saves), `src/entities.js` (skating, goalie reach) or `src/ai.js` (decisions), then re-run the sim.
