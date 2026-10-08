# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, V and X, the Y, Z, AA, AB and AC delivery, the twins' first look (AI part 1), Part 2 and the new additions (AD, AE, AF, AG, AI part 2, AJ, AK, AL and AM), AN, AO, AP, and AQ to AU. AH was skipped: the AJ pilot works, so new faces come from parts.

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **AV**: small icons for the league news.
2. **AW**: crests for the player's club: six designs to choose from, recoloured to the club's colours.
3. **AX**: big and slim builds for goalies made from parts.
4. **AY**: a rule each for the Observatory and the Longhouse, the expansion clubs' buildings.
5. **AZ**: six more heads for players made from parts.

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
- **Batch AP:** big and slim rookies pull on our jersey too.
- **Batches AQ to AU:** cut-in backdrops for players made from parts, Vigga the agent, the linesman's signals for each call, goalies made from parts (a body and six painted masks), and the Glacier Owls' and Thunder Moose's crests, buildings, mascots, scoreboards, banners and captains.

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

## Batch AV: small icons

In the style and size of the reward icons (about 200 px source), sheet `icons_av.png`:
- For **Around the Frostline**, the league news in the League tab, read at 20–24 px, so bold and simple: `icons/news_sign` (a quill over a contract), `icons/news_draft` (a jersey on a hanger with a star), `icons/news_trade` (two jerseys swapping, like `icons/trade` but simpler), `icons/news_retire` (a pair of skates hung up by their laces), `icons/news_cup` (the Frostline Cup), `icons/news_new_club` (a crest with a small plus).

6 frames. (The Veteran Presence icon came with the AP–AU v2 pack: thank you, it's in.)

## Batch AW: crests for the player's club

Players rename their club and pick its colours, but the crest is always the Snow Fox. Please draw **six more crest designs** to choose from, in the style and size of `hud_elements/misc/home_crest`, in our **teal and cream** (the game recolours them to the club's colours, as it does the Snow Fox): a **howling wolf**, a **polar bear**, a **snowy owl in flight** (different from the Glacier Owls' front-on owl), a **narwhal**, a **crossed sticks over a mountain**, and a **lightning bolt through a snowflake**. Frame names `crests_club/<name>` (`wolf`, `bear`, `owl`, `narwhal`, `mountain`, `bolt`). The same shield shape family as the Snow Fox is fine, or each its own shape.

6 frames.

## Batch AX: goalie builds

Batch AT's goalie body is one build. Like AO did for skaters, please draw **`body_big`** (a wide, heavy goalie who fills the net) and **`body_small`** (a small, quick one) with exactly AT's list: the side sets both ways, front, back, skating and puck handling, the foreground layers, mask anchors on every frame, and the portrait shoulders. The six masks fit all three bodies, so no new masks.

About 120 frames per build.

## Batch AY: rules for the expansion buildings

Every rival's building has a rule (meltwater, aurora lanes, pond cracks, rumble strips, shadow zones). The two new ones need theirs:
- **The Observatory (Glacier Owls): moonbeams.** A wide beam of moonlight slowly sweeps across the ice from the telescope dome. A shot taken from inside it glares in the goalie's eyes. Art: the beam as a soft translucent light shape on the ice, about a third of the rink's width (one frame plus three shimmer frames), and the glare as a small star-burst on the puck (three frames).
- **The Longhouse (Thunder Moose): loose planks.** Stretches of the wooden boards rattle, and a puck that hits one takes an odd bounce. Art: a board-plank segment overlay for the side boards and one for the end boards, each rattling (three frames), and a puff of wood splinters (four frames).
- A rule icon for each, in the style of the Batch O rule icons: `icons/rule_moonbeams` and `icons/rule_loose_planks`.

About 18 frames.

## Batch AZ: six more heads

Players made from parts have ten heads. Six more, in the AJ/AO format (the five views with normal and effort states, skin and hair masks, the five portrait faces), so drafts and free agents keep looking new: `curls` (curly hair spilling out under the helmet), `bun` (a hair bun at the back), `long_hair` (straight hair to the shoulders), `eye_black` (stripes under the eyes), `bandaged_nose` (a strip across the nose), `freckled_redhead` (a different face from `freckles`, with a wide grin). Keep coral and violet off skin and hair.

About 150 frames.
