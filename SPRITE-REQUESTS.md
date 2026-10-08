# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, and the latest batches (V and X).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **Y**: an in-match HUD kit (scoreboard, player card, meters, ticker), to match the menu and touch kits.
2. **Z**: icons for the six season awards, two gear items that share art, the three chemistry combos, the six challenges and the four game plans.
3. **AB**: All-Star Game dressing: a crest for the League All-Stars, an achievement icon and banners for the home rink.
4. **AA**: three newcomer skaters, who fill a rival's slot when you sign one of their players (today they're drawn as our own cast in rival colours).

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
- **Batch V touch controls:** the stick, the four round button colours (normal and pressed), the gold ready ring that pulses around Skill and Ultimate, the cooldown rim, the Pull Goalie button, block and pass icons for goalie mode, and blank OWNED and NEW frames (the OWNED stamp is now in both languages).
- **Batch X cups and badges:** the Frostline Cup with its glint on the championship screen, training medals in the drill list and on the result card, gold, silver and bronze rank shields on the online boards, the daily star, tick and streak flame, and the small cup and snowflake that replaced the last emoji.

---

## Batch Y: an in-match HUD kit

The HUD during matches is still CSS: a navy box with an ice rim for the scoreboard, a box for the player card, plain bars for stamina and the ultimate, and a dark strip for the commentary ticker. With the menus (U) and touch controls (V) in pixel art, the HUD is the last plain part. Same rules as U and V: **one transparent PNG per piece**, drawn at 3× and nearest-neighbour clean, 9-slice margins in a small JSON, navy outlines and the game palette, centres flat so they stretch.

- **Scoreboard frame** (9-slice, about 300×52 px in game): the score digits (already sprites), the two crests and a small centre panel for the period text sit on top. A heavier gold-rimmed variant for the final and the Winter Classic. 2 images.
- **Player card frame** (9-slice, about 220×56 px): a square portrait slot on the left. Ours in ice blue, and a coral one for player 2 in local versus. 2 images.
- **Meters:** a stamina bar frame and fill, and an ultimate bar frame and fill (the fill is stretched; a gold `full` fill that the game pulses when the ultimate is ready). 5 images.
- **Ticker frame** (9-slice, about 420×30 px) with a red `LIVE` lamp at its left end (no lettering; the game writes LIVE). 1 image.
- **Power-puck chip frame** (9-slice, about 120×36 px) for the power you're carrying. 1 image.
- **Pause button**, round, about 40 px: `normal` and `pressed`, with the two pause bars drawn in. 2 images.
- **Banner plate** (9-slice, wide): the dark plate behind FACEOFF, GOAL and the period banners (the words stay HTML). 1 image.

About 14 images.

## Batch Z: award, gear, combo, challenge and plan icons

In the style and size of the reward icons (`equipment_items/reward/*`, about 200 px source), one sheet named `icons_z.png` with frame names `icons/<name>`:

- **Season awards** (Awards Night cards and the award cabinet; today they borrow gear icons): `award_mvp` (a tall star trophy), `award_golden_stick` (a gold stick on a plinth), `award_playmaker` (two sticks crossed with a puck between them, silver), `award_iron_wall` (a goalie mask on a shield), `award_enforcer` (a shoulder pad on a plinth, bronze) and `award_signing` (a contract under a small trophy). 6 frames.
- **Gear that shares a picture:** `gear_padded_vest` (the Padded Vest; it shares the Practice Jersey's chest piece) and `gear_pro_mitts` (Halla's Pro Set, a sleek teal glove and blocker; it shares the Old Mitts). 2 frames.
- **Chemistry combos** (the combo cards in Team and the combo pop-ups; Avalanche and Thunderquake share one icon now): `combo_frostbolt` (an ice shard crackling with yellow lightning), `combo_avalanche` (a puck pushing a wall of snow) and `combo_thunderquake` (a puck landing with a gold shockwave ring). 3 frames.
- **Exhibition challenges** (chips in quick play and the daily card): `ch_onetimers` (a puck meeting a stick mid-swing), `ch_giant_goalies` (a goalie towering over a tiny net), `ch_ice_age` (an ice power orb), `ch_lightning_round` (a skate with speed lines), `ch_heavy_hitters` (two shoulder pads colliding) and `ch_next_goal_wins` (a single goal lamp with a "1" shape made of light, no lettering). 6 frames.
- **Game plans** (the plan picker before league matches): `plan_balanced` (a level scale), `plan_forecheck` (arrows pressing forward), `plan_trap` (a closing net of lines) and `plan_rungun` (a puck with a long speed trail). 4 frames.

21 frames.

## Batch AB: All-Star Game dressing

Once a season, after league round 2, the All-Star Game is played at the Frostline home rink: the fans vote in the league's stars, mixed across two benches. Your top scorer and two rival stars wear your colours; the other bench, the **League All-Stars**, wears navy with gold trim (rival art recoloured). Today the League All-Stars borrow the level-up star as their crest, the achievement uses the same star, and the rink looks like any other night. Please draw:

- **League All-Stars crest**, in the style and size of the team crests (`crests/*`): a navy shield with a gold five-pointed star and a small snowflake, no lettering. It shows on the scoreboard, the schedule, the vote screen and the results. 1 frame.
- **All-Star achievement icon**, in the style of `achievements/*` (about 200 px source): a gold star with a hockey stick through it and a little burst of sparkles. 1 frame.
- **Home-rink dressing for the night** (on the `arena_home` backdrop, 1536×1024, never over the ice): a long **star banner** over the far glass, about 420×90 px at game size, navy with gold stars and our snowflake (no lettering), 2 frames of it swaying; and **star bunting**, a tileable strip about 64×24 px at game size of little gold and ice-blue star pennants on a string, for the far and near boards, 2 frames. Say in the README where you'd hang the banner and run the bunting.

8 frames.

## Batch AA: newcomer skaters

When you sign a rival's skater, a newcomer takes their slot on that team. Right now the newcomer is drawn as one of our own cast (Nix, Volta or Bram) in the rival's colours, which looks like our players changed teams. Please draw **three newcomers**, one per position (centre, winger, defender), in **coral + violet** like every rival, so the game can recolour them for any team. They should look like hungry rookies: a little smaller and scrappier than the captains, with distinct silhouettes (for example a lanky centre with a long reach, a quick winger with a ponytail or a mohawk, and a stocky defender).

Each needs **the same pose list as one rival skater**, the way `gilded_rams_w` has them: the v2 skating set, the Batch A diagonals and hit reactions, the Batch C side strides, glides and stops, and the Batch D celebration, plus a portrait with the five expressions the dialogue uses (neutral, determined, grin, shocked, defeated). Same scale, foot baseline and sheet naming (`newcomer_c_*`, `newcomer_w_*`, `newcomer_d_*`), with gear masks for the stick and skates like Batch M.

This is the biggest batch, so it can come after Y, Z and AB.

