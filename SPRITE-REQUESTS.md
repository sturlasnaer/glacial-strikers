# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, V and X, the Y, Z, AA, AB and AC delivery, the twins' first look (AI part 1), and Part 2 and the new additions (AD, AE, AF, AG, AI part 2, AJ, AK, AL and AM). AH was skipped: the AJ pilot works, so new faces come from parts.

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **AN**: the goalie market and a living league: icons for the six goaltending styles, a backup goalie for the rivals, and icons for nine new achievements.
2. **AO**: players from parts, round two: the jersey moment for the parts body, six more heads and two more bodies.

## Format notes

- Transparent PNG sheets plus an add-on `atlas.json` in the v2 format. Batch A's layout worked perfectly: add-on atlas, `<team>_<role>_<kind>.png` sheets, wide gutters, tight frame rectangles, and a builder patch. Please keep that.
- Same camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters about 152 px standing (`recommended_standing_height`), skates on a consistent baseline.
- Goalies match `halla_side_goalies` scale (the ready pose is about 205 px tall in that sheet). The v5 goalie sheets got this right.
- Side-view poses face **right**, and the game mirrors them for the other side. Goalies are the exception: Batch L asks for true-profile goalies drawn in both directions.
- Home colours teal/cream/navy. Every rival is drawn in **coral + violet** and recoloured at runtime, so keep coral and violet off skin and hair.
- **Stick hand.** Players shoot left or right, and a player should keep the same hand whichever way they skate. A **left shot** holds the stick on the left side of the body (left hand lower on the shaft, blade on the player's left): facing the camera the blade is on the screen's right, facing away it's on the screen's left, facing right (east) it's on the far side of the body, and facing left (west) on the near side. Draw new skaters **left-shot in all eight directions** (west, northwest and southwest drawn, not mirrored); the game mirrors a left-shot set to make a right-shot player. Say the hand in the add-on atlas (`"hand": "L"`).

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

## Batch AN: the goalie market and a living league

You can now sign a rival's goalie (each one has a **goaltending style**) and choose who starts in goal. The rivals fill the gaps your signings leave with Draft Day picks and free agents, and they call with trade offers after matches. Nine new achievements go with all this. Today they borrow other icons.

- **Goaltending styles**, in the style and size of the archetype icons (about 200 px source), sheet `icons_an.png`, frame names `icons/gstyle_<style>`. Each shows a goalie silhouette or gear doing the thing:
  - `gstyle_hybrid`: a goalie mask, half teal and half cream.
  - `gstyle_scrambler`: a pad sliding sideways with speed lines.
  - `gstyle_butterfly`: two pads flared flat on the ice, like wings.
  - `gstyle_wall`: a big blocker in front of a brick-patterned net.
  - `gstyle_reader`: a mask with one eye glinting, and a dotted puck path.
  - `gstyle_puckhandler`: a goalie stick sweeping a puck behind the net.

  6 frames.
- **A contract**, same sheet: `icons/contract` (a rolled contract with a quill and a wax seal, no lettering). It goes next to rival signings in the league news. 1 frame.
- **A backup goalie** for the rivals. When you sign a team's goalie, they play a backup, who wears the plain v1 away goalie today. Please draw one **newcomer goalie** in coral and violet like every rival goalie: younger and smaller than the starters, with a plain mask (no team motif) and a mismatched blocker. Keep coral and violet off skin and hair.
  - Give them **exactly the list the rival goalies got**: the v5 side, front, back, skating and puck-handling sets, and the Batch L west profiles.
  - Also a portrait with the five dialogue expressions (neutral, determined, grin, shocked, defeated).
  - Name the sheets `newcomer_g_*`. In the add-on atlas, put the sets under the key `newcomer` in `goalies_side`, `goalies_front` and the rest, and the portrait under `portraits.newcomer_g`.

  About 60 frames, like one rival goalie.
- **Achievement icons**, in the style and size of `achievements/*` (about 200 px source), frame names `achievements/<name>`:

| Frame | Achievement | Idea |
| --- | --- | --- |
| `first_pick` | First Pick (draft a rookie) | a jersey on a hanger under a spotlight, with a gold "1st" ribbon shape (no lettering) |
| `new_tricks` | New Tricks (change a style or super at camp) | a glowing element stone and a whistle crossed |
| `dealmaker` | Dealmaker (trade a player) | two gloves shaking hands over a puck |
| `pads_for_hire` | Pads for Hire (sign a rival's goalie) | a pair of goalie pads with a price tag |
| `legendary` | Legendary (sign a legend) | a gold star burst behind a horned helmet |
| `side_by_side` | Side by Side (dress the twins together) | a dragon's head and a wolf's head back to back, one red-gold and one silver-blue |
| `ragnarok` | Ragnarök (score with the twins' combo) | a puck on fire splitting a dark sky |
| `six_elements` | Six Elements (score with all six) | six small orbs in a ring: ice blue, yellow, tan, orange, mint and violet |
| `cup_of_the_week` | Cup of the Week (win a Weekly Cup) | the small Weekly Cup with a calendar page behind it |

  9 frames.

About 76 frames. The goalie is the big part: if time is short, send the icons first.

## Batch AO: players from parts, round two

The AJ pilot works: every drafted rookie is now made from the body and a head, with their own skin and hair. Three things would round it out.

- **The jersey moment for the parts body.** Batch AD's jersey moment (holding the jersey up, pulling it over the head, the fist pump) only fits the three AA newcomers, so a rookie made from parts skips it today. Please draw it for `body_std`, facing the camera, with a head anchor on each frame like the other body frames. On the pulling frame the head is inside the jersey, so add `"hide_head": true` to that anchor. Include gear masks like the rest of the body. 3 frames.
- **Six more heads** in the AJ format: each needs the five views (s, se, e, ne, n) with normal and effort states, skin and hair masks, and the five portrait faces (neutral, determined, grin, shocked, defeated). Ideas:
  - `cage`: a full wire cage over the face.
  - `visor`: a tinted half visor and a headband.
  - `mohawk`: a strip of hair out of the back of the helmet.
  - `ponytail`: a long ponytail.
  - `moustache`: a big moustache.
  - `glasses`: sports glasses under the helmet.

  Keep coral and violet off skin and hair. About 150 frames.
- **Two more bodies**, with the full `body_std` list (eight directions, hits, side strides, the signature, the portrait shoulders, anchors and gear masks), so rookies aren't all one build:
  - `body_big`: broad and heavy, a defender's build.
  - `body_small`: light and quick.

  Same left-shot rule, same scale as `body_std`. About 170 frames each.

About 490 frames. The jersey moment is the small one: if time is short, send it first.
