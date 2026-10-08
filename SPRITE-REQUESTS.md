# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) and the latest delivery (D, U, Q, W, O, E, J and F).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **V**: touch controls for phones, to match the new menu kit.
2. **X**: cups, medals and small badges, replacing the last emoji and CSS circles.

## Format notes

- Transparent PNG sheets plus an add-on `atlas.json` in the v2 format. Batch A's layout worked perfectly: add-on atlas, `<team>_<role>_<kind>.png` sheets, wide gutters, tight frame rectangles, and a builder patch. Please keep that.
- Same camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters about 152 px standing (`recommended_standing_height`), skates on a consistent baseline.
- Goalies match `halla_side_goalies` scale (the ready pose is about 205 px tall in that sheet). The v5 goalie sheets got this right.
- Side-view poses face **right**, and the game mirrors them for the other side. Goalies are the exception: Batch L asks for true-profile goalies drawn in both directions.
- Home colours teal/cream/navy. Every rival is drawn in **coral + violet** and recoloured at runtime, so keep coral and violet off skin and hair.

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

---

## Batch V: touch controls

On phones the stick and the five action buttons are still CSS circles (`#touch` in `src/styles.css`): a translucent ring with an ice-blue knob, and flat coloured discs for Shoot/Check (coral, 84 px), Pass/Steal (ice, 66 px), Sprint (cream, 56 px), Skill and Ultimate (navy, 58 px) and a small rounded Pull Goalie button. They should match the Batch U menu kit. As with U, **one transparent PNG per piece**, drawn at 3× and nearest-neighbour clean, in the game palette with navy outlines:

- **Stick:** the base ring (about 124 px in game; it must read on both white ice and the dark arenas, so a translucent navy disc with an ice rim works), and the knob (about 56 px), `idle` and `active` (brighter rim while it's held).
- **Round buttons, `normal` and `pressed`:** `btn_round_coral`, `btn_round_ice`, `btn_round_cream` and `btn_round_navy`, each drawn at about 96 px in game and **without an icon or text**: the game puts the label or ability icon on top and scales the button down for the smaller slots. A clear centre area, with the detail in the rim. 8 images.
- **Ready ring:** a gold ring with a soft glow that goes around Skill and Ultimate when they're charged, 2 frames for a pulse.
- **Cooldown:** the game darkens the button with a pie sweep; a thin **ring overlay** that sits on top of the sweep (ice blue, with 12 small tick marks) would give it a clean edge. 1 image.
- **Pull Goalie:** a 9-slice rounded rectangle button in coral, `normal` and `pressed`, like `btn_gold` in U but coral (the game writes PULL GOALIE on it).
- **Goalie mode icons** for the two face buttons, in the Q style: **block** (the glove catching a puck) and **pass** (a puck leaving the goalie's stick). 2 frames.

- **Two blanks from Batch U:** `owned_stamp_blank` and `new_badge_blank`, the same frames with **no lettering** (the game writes the word, so it also works in Icelandic: KEYPT, NÝTT). The lettered versions stay for English. 2 images.

About 20 images.

## Batch X: cups, medals and small badges

A few things are still emoji or CSS shapes. In the style and size of the reward icons (`equipment_items/reward/*`, about 200 px source), one sheet named `badges.png` with frame names `badges/<name>`:

- **The Frostline Cup**, large: the league trophy for the championship screen, about 480 px tall source, silver and ice blue with a navy base band and a small snowflake crest (no lettering). 1 frame, plus 2 frames of a light glint travelling across it for a shine loop.
- **Training medals:** `medal_bronze`, `medal_silver`, `medal_gold` (round medals on a ribbon) and `medal_empty` (a dim navy outline for medals not yet won). The training list shows three in a row at about 22 px, and the drill result shows the one you won at about 96 px. 4 frames.
- **Leaderboard ranks:** `rank_1`, `rank_2`, `rank_3` (small gold, silver and bronze shields that can take a number on top) for the online boards. 3 frames.
- **Daily challenge:** `daily_star` (a gold star, shown on the Daily button), `daily_done` (the star with a tick) and `streak_flame` (a small flame for the daily streak count). 3 frames.
- **Hub badges:** `cup_small` (the cup count in the trophy case and the online-leaderboard buttons in training, replacing the 🏆 emoji) and `snowflake` (a small crest-style snowflake used on the Winter Classic row of the schedule, replacing ❄). 2 frames.

15 frames.
