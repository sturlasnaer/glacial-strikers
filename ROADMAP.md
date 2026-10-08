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

Online leaderboards (drills, with weekly boards that reset on Mondays, shootout wins, daily streaks) and cloud saves are live on AWS (one Lambda function and a DynamoDB table in eu-west-1).

Friends boards are live too: share a six-character code and get every board with just your friends. And ghost runs: race your own best Cone Weave, this week's best, or a friends board's best, with splits at every gate.

The All-Star Game is in too: after round 2, the fans vote two mixed benches of the league's stars, with Skills Night before it. Breakaway has ghosts now, and any run can be sent to a friend as a challenge link.

Since then: **Draft Day** (three prospects at season's end; the pick joins as a rookie whose potential speeds up their growth), a **career stats** page, and the **Weekly Cup** on every friends board. Then **supers and archetypes** (three new elements, Ember, Gale and Shadow, seven archetypes, mixed per player, with combos for every pair), the **legends** Fáfnir and Fenrir with their twin combo Ragnarök, and a stick hand for every player. Then **goalies for hire** with six goaltending styles, a **living league** (rival draft picks and signings fill the gaps you leave, and rivals call with trade offers), and nine new achievements.

Ideas for later:
1. **Ghosts for Sniper** (the shots and the lit targets), if the others catch on.
2. **Replay checks** on the server if faked scores become a problem; the stored ghost runs would help.

## Next, with art

Done: recruitment (sign rival skaters, pick a line-up), arena rules (meltwater, aurora lanes, pond cracks), the clickable locker room, visible gear on the ice, season awards, the daily challenge and custom club name and colours, goalie life from the v5 goalies (front and back views, skating to and from the bench, pass wind-ups and poke checks), the new name (Puckbound, with the Snowcrest Foxes as the home team), gear recolours on the sprites from the Batch M masks, true-profile goalies both ways (Batch L), near-side crowd sprites (Batch N), goalies who leave the crease to play pucks behind the net (with AI dump-ins), the remaining packs (the Rams' Golden Hall and the Ravens' Dark Aerie, glass-bangers, camera flashes and flag wavers, the volcanic scoreboard, Brekka, Ottar and Kip standing in the locker room with the chest and league board, sprite arena rules, rival side strides and captain celebrations, the title logo, the resurfacer's lap and championship fireworks), the new batches (penalty boxes, rival mascots, rumble strips in the Golden Hall and raven shadows in the Dark Aerie, themed scoreboards, Sniper targets and speed-lane tiles, gear masks for the rival strides), goalie mode (play Halla while the AI skates, with positioning help, butterfly, dive, poke, puck handling and the Wall of Ice ultimate), the Winter Classic (an outdoor showcase on Pine Pond after round 3, with Kip calling it, heavier snow, its own anthem and fireworks), the latest delivery (the pixel-art menu kit with controller highlights and PlayStation, Xbox and keyboard prompts, celebrations for every rival winger and defender, the Wall of Ice and goalie icons, the Winter Classic dressing, rule and achievement icons, the Awards Night stage and Pine Pond's log penalty box), Icelandic (every string, with a glossary and a checker), and the new soundtrack (16 tracks on a chiptune tracker engine, a theme for every arena, arena acoustics and horns, a voiced crowd, a Music room). Done from the v2 pack: rival casts, portraits and expressions, crests, banner cut-ins, signature celebrations, three arenas, sprite crowd, locker-room hub and hub characters.

1. **The other builds' jersey moment** (Batch AP).
2. **Cut-in banners for players made from parts** (Batch AQ): an element backdrop with their own portrait.
3. **An agent for a free-agent market** (Batch AR): free agents made from parts, signed for coins.
4. **The linesman's penalty signals** (Batch AS).
5. **Goalies from parts** (Batch AT): a goalie body and painted masks, for drafted and free-agent goalies.
6. **Two expansion teams** (Batch AU), if the league grows.

Done since Part 2: the goaltending-style icons, the contract and the last nine achievement icons, and the rivals' backup goalie (Batch AN); two more builds, six more heads and the jersey moment for players from parts (Batch AO).

Done in Part 2: **Draft Day** in the draft hall with prospect cards and the jersey moment (Batch AD), the **Weekly Cup** art and career icons (AE), the **last 22 achievement icons** (AF), a **linesman** who drops the puck and makes the calls (AG), **Fáfnir and Fenrir** on the ice in their own art with a shared celebration (AI part 2), **players from parts**: rookies made from a body and four heads with their own skin and hair (AJ), **the other hand**: the cast and newcomers drawn facing west, so every player keeps their stick hand (AK), **art for the new supers and archetypes** (AL) and the **training camp** art (AM). The second rookie class (AH) wasn't needed: parts do the job.

Done in the latest delivery: **the in-match HUD kit** (Batch Y: scoreboard, gold for big games, player card, meters, ticker, power chip, pause and the banner plate), **icons** for the awards, combos, challenges, game plans, two gear items (Batch Z) and the online features and Skills Night (Batch AC), **newcomer skaters** in signed players' slots (Batch AA), **All-Star dressing** (Batch AB: the League All-Stars crest and achievement, a banner and star bunting at the home rink), the **Snow Fox loader** and the **champions painting**.

Done before that: **sprite touch controls** (Batch V): the stick and the action buttons drawn to match the menu kit, with a ready ring and a cooldown edge, plus blank OWNED and NEW frames so the stamp works in Icelandic; and **cups, medals and badges** (Batch X): the Frostline Cup on the championship screen, training medals, leaderboard rank shields and the daily star and streak flame, in place of the last emoji and CSS circles.

## Balance knobs

`node tools/sim.mjs` reports goals, save percentage, match length and ability use for AI vs AI. Current targets are about 92% save rate, 4–6 minute matches and 1–2 ultimates per skater per match. Change one number at a time in `src/match.js` (shots, saves), `src/entities.js` (skating, goalie reach) or `src/ai.js` (decisions), then re-run the sim. `node tools/pressure.mjs` measures the AI from the player's side: a bot carries the puck at each rival, and it reports how long it keeps the puck and how often it's hit or stripped (since 8 October 2026 about 2.4–3.4 s, 3.6–6.2 hits and 2–3 steals a minute, weakest to strongest rival; it was 0.9–2.7 s and 6–21 hits a minute before the AI was calmed down).
