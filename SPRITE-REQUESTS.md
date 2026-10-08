# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, V and X, the Y, Z, AA, AB and AC delivery, the twins' first look (AI part 1), Part 2 and the new additions (AD, AE, AF, AG, AI part 2, AJ, AK, AL and AM), and AN and AO. AH was skipped: the AJ pilot works, so new faces come from parts.

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **AP**: the jersey moment for the big and slim builds.
2. **AQ**: cut-in banners for players made from parts, one backdrop per element.
3. **AR**: an agent in the locker room, for a free-agent market.
4. **AS**: the linesman's penalty signals.
5. **AT**: goalies from parts: a goalie body and painted mask heads.
6. **AU**: two expansion teams, if the league grows to seven.

## Format notes

- Transparent PNG sheets plus an add-on `atlas.json` in the v2 format. Batch A's layout worked perfectly: add-on atlas, `<team>_<role>_<kind>.png` sheets, wide gutters, tight frame rectangles, and a builder patch. Please keep that.
- Same camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters about 152 px standing (`recommended_standing_height`), skates on a consistent baseline.
- Goalies match `halla_side_goalies` scale (the ready pose is about 205 px tall in that sheet). The v5 goalie sheets got this right.
- Side-view poses face **right**, and the game mirrors them for the other side. Goalies are the exception: Batch L asks for true-profile goalies drawn in both directions.
- Home colours teal/cream/navy. Every rival is drawn in **coral + violet** and recoloured at runtime, so keep coral and violet off skin and hair.
- **Stick hand.** Players shoot left or right, and a player should keep the same hand whichever way they skate. A **left shot** holds the stick on the left side of the body (left hand lower on the shaft, blade on the player's left): facing the camera the blade is on the screen's right, facing away it's on the screen's left, facing right (east) it's on the far side of the body, and facing left (west) on the near side. Draw new skaters **left-shot in all eight directions** (west, northwest and southwest drawn, not mirrored); the game mirrors a left-shot set to make a right-shot player. Say the hand in the add-on atlas (`"hand": "L"`).
- **Batch AN:** the goaltending-style icons on the goalie cards, the contract in the league news, icons for the nine newest achievements, and the backup goalie a rival plays once you've signed theirs (in their colours, with portraits).
- **Batch AO:** two more builds (big and slim) and six more heads (cage, visor, mohawk, ponytail, moustache, glasses), with portrait shoulders per build, and the jersey moment for the parts body: drafted rookies now pull on our jersey with their own face.

---

## Delivered ✓

- **v1:** original cast, goalie, rink, props, HUD, power pucks and effects.
- **P1:** 8-way skating, side stride/glide/stop, hit reactions, Halla's side set, ice spray, chips and goal light.
- **v2:** five rival casts, goalies, portraits and expressions, crests, cut-in banners, signature celebrations, three arenas, crowd fans, the locker room and the hub characters.
- **v3:** side-view nets, near glass, scoreboard, team banners and the Snow Fox.
- **v4 Batch A:** rival diagonals (240), rival hit reactions (90), and Blaze and Horn expressions (10).
- **v5 goalies (Batch G):** front, back, skating and puck handling for Halla (home and away) and the five rival goalies (168 frames). In the game: wave, pad taps, celebrations and dejection facing the camera; fishing the puck out after goals; looking back when the puck goes behind the net; skating to and from the bench; pass wind-ups, stick stops and poke checks; Halla's front view in the locker room.
- **Batch M gear masks:** all 58 sheets, clean on the first pass. Equipped sticks, boots and blades now recolour on the sprites in every pose.
- **Batch L profile goalies:** 294 frames, true profile both ways for all seven goalies, with the glove in the correct hand at both nets. The game uses them for every side pose, skating and puck handling; glove and blocker saves follow the art.
- **Batch N near-side crowd:** 32 frames of fans seen from behind, home and away colours, sitting and cheering, on the near benches.
- **Batch B atmosphere:** the Golden Hall (Gilded Rams) and the Dark Aerie (Obsidian Ravens), now their home buildings; fans banging on the far glass after goals, with camera flashes in the stands; the volcanic scoreboard in the Ember Dome.
- **Batch H locker-room life:** Coach Brekka, Gearsmith Ottar and Kip Vance standing at their stations (idle, and talking while you point at their station), the trophy chest (glowing while there are trophies you haven't looked at, open after), and the league board, which opens the League tab.
- **Batch I arena-rule art:** meltwater pools and splashes, pond cracks that grow through their four stages, and aurora lane tiles that scroll the way the lane pushes.
- **Batch C polish:** side strides, stops and glides for all 15 rival skaters, the five captains' celebrations, the title logo, championship fireworks, and the ice resurfacer that laps the title screen's rink before the demo match.
- **Batch N-Extras:** a flag waver on each near bench.
- **Batch P penalty box:** a glass box each side of centre in the far boards. The penalized skater sits inside behind the glass, the door swings as they go in and out, the red light blinks, and the timer hangs above it.
- **Batch R rival mascots:** the lynx, fireball, ram, raven and crowned polar bear dance on the near stairs of their buildings, in team colours, and cheer when their team scores at home.
- **Batch S new-arena rules:** the Golden Hall's rumble strips (the puck hops off the stick, with a puff of ice dust) and the Dark Aerie's raven shadows (two ravens circle overhead, and the puck nearly vanishes in their shadows).
- **Batch K scoreboards:** Pine Pond's wooden board, the Golden Hall's stone and gold, and the Dark Aerie's black stone.
- **Batch T training props:** Sniper target boards (unlit, lit, hit) and the speed-lane tile for the Frostline twist.
- **Batch M2 gear masks:** signed rival skaters' special sticks and skates now recolour in their side strides too.
- **Batch U menu kit:** every panel, button, tab, chip, list row and dialogue box is skinned with the 9-slice pieces; the gold corner brackets pulse around the controller highlight; PlayStation, Xbox and keyboard prompts show on the title screen and in the controls help.
- **Batch D celebrations:** all ten rival wingers and defenders celebrate their goals, for either side.
- **Batch Q goalie mode:** the Wall of Ice rises, shimmers and shatters across Halla's crease; the poke-check and Wall of Ice icons are on the touch buttons.
- **Batch W Winter Classic:** the banner, string lights, fire barrels and the fans in winter gear dress Pine Pond for the Classic.
- **Batch O rule icons:** on the quick-play arena chips and the daily challenge card.
- **Batch E achievement icons:** 14 achievements now have icons of their own.
- **Batch J Awards Night:** the stage opens the season awards, with Kip at the podium speaking, opening the envelope and applauding.
- **Batch F:** Pine Pond's log penalty box with the lantern.
- **Batch V touch controls:** the stick, the four round button colours (normal and pressed), the gold ready ring that pulses around Skill and Ultimate, the cooldown rim, the Pull Goalie button, block and pass icons for goalie mode, and blank OWNED and NEW frames (the OWNED stamp is now in both languages).
- **Batch X cups and badges:** the Frostline Cup with its glint on the championship screen, training medals in the drill list and on the result card, gold, silver and bronze rank shields on the online boards, the daily star, tick and streak flame, and the small cup and snowflake that replaced the last emoji.
- **Batch Y HUD kit:** the scoreboard (gold-rimmed for the final, the Winter Classic and the All-Star Game), the player card with the portrait slot, the stamina and ultimate meters (the gold fill pulses when the ultimate is ready), the commentary ticker with its LIVE lamp, the power-puck chip, the pause button and the plate behind FACEOFF, GOAL and the period banners.
- **Batch Z icons:** the six season awards, the Padded Vest and Halla's Pro Set, the three chemistry combos, the six exhibition challenges and the four game plans all have their own pictures.
- **Batch AA newcomers:** the three rookies take a signed skater's slot on their old team, in that team's colours, with their own portraits and expressions; they're also the faces of Draft Day.
- **Batch AB All-Star dressing:** the League All-Stars crest, the All-Star achievement, and the star banner and bunting swaying over the home rink on All-Star night.
- **Batch AC:** the friends, ghost, challenge and share icons on the online buttons, the Skills Night icons, the Snow Fox skating on the loading screen, and the champions painting behind "Champions!".
- **Batch AI part 1:** the twins' portraits, standing art and the reveal painting behind Kip's announcement.
- **Batch AD Draft Day:** the draft hall with Kip at the podium behind the prospects, the bronze, silver and gold card rims, the rookies pulling on our jersey after the pick, and the draft, rookie, scout and potential-star icons.
- **Batch AE:** the Weekly Cup and its rosettes on the friends boards, last week's top three on the podium, and the career-stats icons.
- **Batch AF:** the last 22 achievements have their own icons.
- **Batch AG linesman:** he holds the puck at the dot and drops it, skates clear to the far boards and follows play, ducks a puck that comes his way, and makes the calls for penalties and goals.
- **Batch AI part 2:** Fáfnir and Fenrir skate in their own art in all eight directions (left-shot, so Fenrir is mirrored to shoot right), with hits, side strides, signatures, banners, gear masks and the twins' shared celebration after a Ragnarök goal. They now turn up in Scouting.
- **Batch AJ parts:** the body and four heads, recoloured for skin and hair: drafted rookies are now made from parts, on the ice and in their portraits.
- **Batch AK the other hand:** our cast and the newcomers drawn facing west, so every player keeps their stick hand whichever way they skate.
- **Batch AL:** icons for the new supers and archetypes, the combo icons, and the Firestorm, Cyclone, Eclipse, Heat Check, Tailwind and Fade effects.
- **Batch AM:** the element stones, style camp, respec and trade icons, and Ottar holding up a stone and Brekka with the whistle in the training camp.

---

## Batch AP: the jersey moment for the big and slim builds

Batch AO's jersey moment (holding the jersey up, pulling it over the head, the fist pump) fits `body_std`, so a big or slim rookie skips it today. Please draw the same three poses for `body_big` and `body_small`, facing the camera, exactly as AO did for `body_std`: a head anchor on each frame (`"hide_head": true` on the pulling one), gear masks, and the sequence under `modular.jersey_moments.body_big` / `body_small`. 6 frames.

## Batch AQ: cut-in banners for players made from parts

When a player uses their ultimate, a banner slides across the screen with their art (the cut-ins). The cast, the rivals and the twins have painted banners, but rookies and anyone else made from parts get a plain band. Please paint **one banner backdrop per element**, in the style and size of the existing cut-in banners (`cutins/*.webp`, 960 wide), with the left third left clear: the game drops the player's portrait (their own face and build) there and writes the super's name over the right side.
- `frost` (ice blue, a blizzard), `thunder` (yellow, lightning across a storm), `stone` (tan, a rockslide), `ember` (orange, a wall of flame), `gale` (mint, a whirlwind), `shadow` (violet-black, an eclipse).
- Frame names `cutin_bg/<element>`, plus a soft-edged vignette PNG `cutin_bg/portrait_glow` the game puts behind the portrait.

7 images.

## Batch AR: an agent in the locker room

Next in the game: a **free-agent market**, players made from parts who aren't on any team and can be signed for coins, refreshed every few matches. They need someone to pitch them. Please draw **an agent** in the Batch H style and scale (Brekka, Ottar and Kip): a sharp coat over a hockey hoodie, a phone in one hand and a folder of contracts under the other arm. Adult, any look you like, distinct from the three NPCs.
- Standing art: `hub_fullbody/agent/idle_a`, `idle_b`, `talking`, and `offer` (holding a contract out). Same foot baseline as the others.
- A portrait with the five dialogue expressions (neutral, determined, grin, shocked, defeated), in the style of the NPC portraits: `hub_npcs/portrait/agent` and `hub_npcs/agent/<expression>`.
- A station icon, `icons/free_agents` (a folder of player cards with a paperclip), reward-icon size.

8 frames.

## Batch AS: the linesman's penalty signals

The linesman (Batch AG) raises an arm for every penalty. The game calls three kinds: **interference**, **charging** and **boarding**. Please add the real hockey signal for each, facing the camera, two frames each so it can loop for a second:
- `interference`: arms crossed and held in front of the chest.
- `charging`: clenched fists rotating around each other in front of the chest.
- `boarding`: one clenched fist striking the open palm of the other hand.
- `washout`: both arms swept out to the sides at shoulder height, for a goal that doesn't count.

Same character, scale and foot baseline as Batch AG, under `linesman.calls`. 8 frames.

## Batch AT: goalies from parts

Signed rival goalies and the rivals' backups cover today's needs, but drafted and free-agent goalies would need faces of their own. Goalie masks hide the face, so a goalie's look is **a body and a painted mask**:
- **A goalie body** with exactly the list the backup goalie got in Batch AN: the side sets both ways, front, back, skating and puck handling, in coral and violet, **drawn without the mask and helmet**, with an anchor for the mask on every frame like the AJ bodies (x, y, view, rotation; views s, se, e, ne, n and the side views).
- **Six masks**, each in all those views: `classic` (plain with a cage), `flame`, `wolf_teeth`, `stars`, `stripes`, `skull`. Paint each design's art in pure red on a separate mask layer (like the AJ skin and hair masks) so the game can recolour it per player.
- A portrait: the shoulders plus each mask facing the camera, with the five expressions showing through the cage (eyes and brows only).

About 70 body frames and 6 × 12 mask views. If time is short, the body and two masks first.

## Batch AU: two expansion teams

If the league grows from six teams to seven or eight, the new teams' players can be made from parts in their colours, but each club still needs its own identity. For each of **the Glacier Owls** (snowy white and slate) and **the Thunder Moose** (forest green and amber):
- **A crest** like `rival_crests` (ignore the team colours in the art; draw it coral and violet so the game recolours it).
- **A home arena**, a 1536×1024 painting in the style of the Golden Hall and the Dark Aerie: an owl's frozen observatory, and a timber longhouse with antlers in the rafters.
- **A mascot** dancing on the near stairs, like Batch R (idle, two dance frames, a cheer).
- **A scoreboard** like Batch K, and an arena banner like v3's.
- A captain's cut-in banner, painted like the rivals' (the captain can be made from parts, so any face you like that fits the team).

About 20 images and frames per team. This is the biggest one and depends on growing the league, so it comes last.
