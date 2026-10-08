# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, V and X, and the latest delivery (Y, Z, AA, AB and AC).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **AD**: Draft Day: a draft-hall painting, prospect cards, the rookies pulling on our jersey, and a few icons.
2. **AE**: the Friends Weekly Cup (a small cup, a podium, rosettes) and icons for the new career stats page.
3. **AF**: the last 22 achievements that still borrow other icons.
4. **AG**: a linesman who drops the puck at faceoffs and makes the calls.
5. **AH**: a second rookie class, three more newcomers, so drafts don't repeat faces.

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
- **Batch Y HUD kit:** the scoreboard (gold-rimmed for the final, the Winter Classic and the All-Star Game), the player card with the portrait slot, the stamina and ultimate meters (the gold fill pulses when the ultimate is ready), the commentary ticker with its LIVE lamp, the power-puck chip, the pause button and the plate behind FACEOFF, GOAL and the period banners.
- **Batch Z icons:** the six season awards, the Padded Vest and Halla's Pro Set, the three chemistry combos, the six exhibition challenges and the four game plans all have their own pictures.
- **Batch AA newcomers:** the three rookies take a signed skater's slot on their old team, in that team's colours, with their own portraits and expressions; they're also the faces of Draft Day.
- **Batch AB All-Star dressing:** the League All-Stars crest, the All-Star achievement, and the star banner and bunting swaying over the home rink on All-Star night.
- **Batch AC:** the friends, ghost, challenge and share icons on the online buttons, the Skills Night icons, the Snow Fox skating on the loading screen, and the champions painting behind "Champions!".

---

## Batch AD: Draft Day

At the end of each season, after Awards Night, the league holds a draft. Three prospects (one per position) step up, you pick one, and they join your roster as a rookie who grows over the seasons. The prospects are the Batch AA newcomers, recoloured into our teal and cream once they're picked. Kip hosts from the Batch J podium. Please draw:

- **Draft hall painting**, 1536×864, behind the whole screen: the league hall on draft night, a stage with a podium on the left third (Kip stands there), six round tables with cloths in each team's colours (Snowcrest teal and cream, and the five rivals' colours as on their crests), spotlights, and scouts and families in the seats. No lettering. Three prospect cards sit across the middle and lower half, so keep those areas calm and a little darker. 1 image.
- **Prospect card frame**, 9-slice, about 180×250 px in game: a portrait window in the top half and a flat lower panel for the name and stats (HTML). Three tiers by potential: **bronze, silver and gold** rims. Same rules as U and Y: one transparent PNG each at 3×, margins in a small JSON. 3 images.
- **The jersey moment:** each newcomer (`newcomer_c`, `newcomer_w`, `newcomer_d`) facing the camera, (1) holding a jersey up with both hands, (2) pulling it over their head, (3) wearing it with a fist pump. In coral and violet like Batch AA, so the game recolours them into our kit. 3 frames each, 9 frames.
- **Icons**, in the style and size of the reward icons (about 200 px source), sheet `icons_ad.png`, frame names `icons/<name>`: `draft` (a podium with a folded jersey on top, for the Draft Day button), `rookie` (a shiny new skate with a ribbon bow, the rookie badge on the roster), `scout` (a clipboard with a star sketched on it, the scouting report), `potential_full` and `potential_empty` (a filled and a hollow gold star, read small, for the 1–5 potential rating). 5 frames.

18 frames and images.

## Batch AE: Friends Weekly Cup and career stats icons

**Weekly Cup:** every friends board runs a cup each week (Monday to Sunday): the best score of the week on each board counts, and the top three get the cup and rosettes on their profile.

- **Weekly Cup trophy**, about 120 px tall in game, in the style of `badges/frostline_cup` but clearly smaller and humbler: a silver bowl on a dark wooden base with a teal ribbon tied to one handle. Plus 2 glint frames like the Frostline Cup's. 3 frames.
- **Podium**: three ice-block steps (the middle one tallest) with gold, silver and bronze fronts, no numbers, about 360×140 px in game. The game stands the winners' portraits on top. 1 image.
- **Rosettes**: gold, silver and bronze ribbon rosettes, reward-icon size, for the week's top three. 3 frames.

**Career stats page:** a new page with every skater's lifetime numbers. These icons are read at 24–32 px next to numbers, so bold, simple shapes (about 96 px source is plenty), sheet `icons_ae.png`, frame names `icons/stat_<name>`:

- `stat_games` (a jersey on a hanger), `stat_wins` (a stick raised in the air), `stat_goals` (a puck in the back of a net), `stat_assists` (two stick blades touching), `stat_shots` (a puck with a motion streak), `stat_hits` (a shoulder pad with impact lines), `stat_steals` (a glove lifting a puck), `stat_saves` (a goalie glove with a puck in it), `stat_shutouts` (a net with a padlock), `stat_seasons` (a calendar page with a snowflake), `stat_cups` (a tiny Frostline Cup) and `stat_streak` (three pucks stacked with a little flame). 12 frames.
- `career` (a hockey trading card with a gold star in the corner), for the button that opens the page. 1 frame.

20 frames and images.

## Batch AF: the last achievement icons

Batch E gave 14 achievements their own icons; 22 still borrow a gear or HUD picture. In the style and size of `achievements/*` (about 200 px source), frame names `achievements/<name>`:

| Frame | Achievement | Idea |
| --- | --- | --- |
| `brick_wall` | Brick Wall (win 5–0) | a net bricked up with ice blocks |
| `blitz` | Blitz (win in under 2 minutes) | a stopwatch split by a lightning bolt |
| `one_timer` | One-Timer Specialist | a stick meeting a puck mid-air with a spark |
| `tic_tac_toe` | Tic-Tac-Toe (5 passes in a row) | three pucks joined by dotted pass lines in a triangle |
| `chemistry_class` | Chemistry Class (all three combos) | ice, lightning and stone orbs linked in a triangle |
| `ultimate_power` | Ultimate Power (all three ultimates) | a frost burst, a gold thunderbolt and a stone pillar together |
| `elemental` | Elemental (all four power pucks) | four pucks in the power colours around a ring |
| `freight_train` | Freight Train (10 checks) | a charging shoulder pad with speed lines and an impact star |
| `pickpocket` | Pickpocket (6 steals) | a glove plucking a puck off a stick blade |
| `power_play` | Power Play Pro | a puck flying past an open penalty-box door |
| `shorthanded` | Shorthanded | a puck in the net while the penalty-box lamp glows red |
| `empty_netter` | Empty Netter | a puck rolling into a net with no goalie |
| `extra_attacker` | Extra Attacker | a goalie mask on the bench and an extra skater silhouette in front |
| `clean_game` | Clean Game (no penalties) | a white rosette with a snowflake |
| `up_for_a_challenge` | Up for a Challenge | three challenge chips fanned out |
| `frostline_champions` | Frostline Champions | the Frostline Cup on a plinth inside a laurel wreath |
| `between_the_pipes` | Between the Pipes (win in goalie mode) | Halla's mask framed by two goalposts |
| `rival_slayer` | Rival Slayer (beat every rival) | five blank shields in the rival colours under a crossed stick |
| `fully_grown` | Fully Grown (a skater at level 10) | the level star with ten rays and a sprout of sparkles |
| `gold_standard` | Gold Standard (gold in all four drills) | four gold medals fanned out |
| `fully_kitted` | Fully Kitted (own every piece of gear) | a gear stand with helmet, jersey, stick and skates |
| `couch_champion` | Couch Champion (win local versus) | two game controllers crossed under a tiny trophy |

No lettering or numbers. 22 frames.

## Batch AG: a linesman

Faceoffs happen today with nobody dropping the puck, and penalties and goals are called by a whistle with no one on the ice. A linesman would make matches look like hockey. One adult official, a little taller than the skaters (about 165 px standing), black helmet, **navy-and-white striped jersey** (navy rather than black, to match the outlines), orange armbands, black pants, no number or lettering. The linesman isn't recoloured, so use whatever colours read best. Same camera, outlines and foot baseline as the skaters.

- **Faceoff**, facing the camera (standing between the two centres): holding the puck ready (2 idle frames), then bending and dropping it (3 frames: crouched with the puck, puck released, arms back with the puck gone).
- **Skating clear** after the drop: a side stride facing right (4 frames) and a glide (1 frame); the game mirrors them. Plus a glide facing away (north) and one facing the camera (south). 7 frames.
- **Calls:** a penalty call facing the camera, arm straight up with the whistle in (2 frames); pointing at the net for a goal, side view facing right (1 frame); standing along the boards watching play, side view (2 frames).
- **Ducking** a shot, hands over the helmet (1 frame), for the occasional puck that comes close.

About 18 frames. No gear masks needed.

## Batch AH: a second rookie class

With Draft Day every season, the three Batch AA newcomers will start repeating. Please draw **three more newcomers**, one per position, in coral and violet like every rival, with silhouettes distinct from both the captains and the first class: for example a small centre with a long braid out the back of the helmet, a winger in a junior cage mask, and a big, quiet defender with a buzz cut. Keep coral and violet off skin and hair.

Each needs **exactly the Batch AA list**: the v2 skating set, the Batch A diagonals and hit reactions, the Batch C side strides, glides and stops, the Batch D celebration, a portrait with the five dialogue expressions (neutral, determined, grin, shocked, defeated), gear masks for the stick and skates like Batch M, and the Batch AD jersey moment. Name the sheets `newcomer2_c_*`, `newcomer2_w_*` and `newcomer2_d_*`.

This is the biggest batch, so it can come last.
