# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras), the new batches (P, R, S, K, T and M2) the D, U, Q, W, O, E, J and F delivery, V and X, and the latest delivery (Y, Z, AA, AB and AC).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **AD**: Draft Day: a draft-hall painting, prospect cards, the rookies pulling on our jersey, and a few icons.
2. **AI**: Fáfnir and Fenrir, twin legends with a real dragon's head and a real wolf's head, who turn up in recruiting now and then.
3. **AJ**: a body-and-face pilot: one skater body drawn without a head, and four heads that fit it, so new players can be made from parts.
4. **AK**: the other hand: our cast and the newcomers redrawn facing the other way, so every player keeps one stick hand when they turn.
5. **AL**: art for the new supers (Ember, Gale and Shadow) and the seven archetypes: icons, ultimate effects and combo icons.
6. **AM**: the training camp (element stones, Brekka's style camp) and an icon for trades.
7. **AN**: the goalie market and a living league: icons for the six goaltending styles, a backup goalie for the rivals, and icons for nine new achievements.
8. **AE**: the Friends Weekly Cup (a small cup, a podium, rosettes) and icons for the new career stats page.
9. **AF**: the last 22 achievements that still borrow other icons.
10. **AG**: a linesman who drops the puck at faceoffs and makes the calls.
11. **AH**: a second rookie class, three more newcomers, so drafts don't repeat faces.

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

---

## Batch AD: Draft Day

At the end of each season, after Awards Night, the league holds a draft. Three prospects (one per position) step up, you pick one, and they join your roster as a rookie who grows over the seasons. The prospects are the Batch AA newcomers, recoloured into our teal and cream once they're picked. Kip hosts from the Batch J podium. Please draw:

- **Draft hall painting**, 1536×864, behind the whole screen: the league hall on draft night, a stage with a podium on the left third (Kip stands there), six round tables with cloths in each team's colours (Snowcrest teal and cream, and the five rivals' colours as on their crests), spotlights, and scouts and families in the seats. No lettering. Three prospect cards sit across the middle and lower half, so keep those areas calm and a little darker. 1 image.
- **Prospect card frame**, 9-slice, about 180×250 px in game: a portrait window in the top half and a flat lower panel for the name and stats (HTML). Three tiers by potential: **bronze, silver and gold** rims. Same rules as U and Y: one transparent PNG each at 3×, margins in a small JSON. 3 images.
- **The jersey moment:** each newcomer (`newcomer_c`, `newcomer_w`, `newcomer_d`) facing the camera, (1) holding a jersey up with both hands, (2) pulling it over their head, (3) wearing it with a fist pump. In coral and violet like Batch AA, so the game recolours them into our kit. 3 frames each, 9 frames.
- **Icons**, in the style and size of the reward icons (about 200 px source), sheet `icons_ad.png`, frame names `icons/<name>`: `draft` (a podium with a folded jersey on top, for the Draft Day button), `rookie` (a shiny new skate with a ribbon bow, the rookie badge on the roster), `scout` (a clipboard with a star sketched on it, the scouting report), `potential_full` and `potential_empty` (a filled and a hollow gold star, read small, for the 1–5 potential rating). 5 frames.

18 frames and images.

## Batch AI: Fáfnir and Fenrir, the twins

Two hidden legends who now and then turn up in Scouting as free agents, rare and very good. They're twins, and when they dress together they get a twin synergy of their own. They're special, so they deserve the best art in the game.

Both have **real animal heads**, not masks or helmet paint: think of them like the Snow Fox, but hockey players.

- **Fáfnir**, a defender: very fast, with a cannon of a shot, and **a dragon's head**: a chibi dragon head (short snout, small curled horns, a frill at the jaw, scales), emerald green with a gold belly and gold eyes, horns poking out past the helmet. A long tail, tucked low so it doesn't read as a stick.
- **Fenrir**, a winger and sniper: very fast and technical, with **a wolf's head**: a chibi wolf head (pointed ears through the helmet, a long muzzle, a ruff of fur at the collar), storm grey and silver with ice-blue eyes. A bushy tail.
- They're twins: the same build and height (a little taller than our captains), a matching gold twin-star patch on the shoulder of both jerseys (no lettering), mirrored poses where it suits.
- Mirror twins on the ice too: **Fáfnir shoots left, Fenrir shoots right.** Draw both in all eight directions with the stick in their own hand throughout (see the stick-hand rule in the format notes).
- Jerseys in **coral and violet** like every rival, so the game recolours them into our kit when signed. Keep coral and violet off the scales, fur and eyes.

**Part 1 first, so the look can be checked early:** both portraits with the five expressions (neutral, determined, grin, shocked, defeated) and one standing frame each (`south` idle), plus a 1536×864 **reveal painting** of the twins back to back on the ice for the moment they turn up in Scouting. About 13 images. Send part 1 as soon as it's ready, then carry on with part 2.

**Part 1 is in the game ✓** (thank you, they look wonderful): the portraits show in Scouting, the Team cards, dialogue and the cut-ins, and the reveal painting heads their Scouting card.

**For Part 2:** Fenrir's standing frame in Part 1 shoots left, like Fáfnir's. That's fine: **keep both of them left-shot in all eight directions** (west-facing frames drawn, not mirrored), and the game mirrors Fenrir's whole set to make him the right-handed twin.

**Part 2:** each twin with exactly the Batch AA pose list (the v2 skating set, the Batch A diagonals and hit reactions, the Batch C side strides, glides and stops, a signature celebration and gear masks like Batch M), a cut-in banner each like the rivals' `banners`, **a joint celebration** (the two of them leaping into a chest bump, 4 frames, drawn as one pair), and a combo icon `icons/combo_twins` (a dragon's head and a wolf's head facing each other in a ring, reward-icon size). Sheet names `fafnir_*` and `fenrir_*`.

## Batch AJ: a body-and-face pilot

Every player today is a full hand-drawn set, about 80 frames per skater plus portraits, so a new face costs a whole batch. We want to build players from parts instead: **bodies** drawn once without a head, and **heads** that sit on any body, with skin and hair recoloured by the game. Then a new player is a new head (about 15 frames), and a handful of heads and colours gives hundreds of different rookies, free agents and, later, whole teams. Our cast, the rival captains and the twins stay hand-drawn; this is for everyone else.

This batch is a pilot to prove the pipeline: **one body and four heads.** If it works, the next batches add three more builds (small and quick, tall and lanky, big and stocky) and more heads.

**The body** (`body_std`): the standard build, the size of the Batch AA newcomers, in **coral and violet** like every rival (the game recolours it per team), drawn **from the neck down, with no head and no helmet**.
- The full Batch AA pose list: the v2 skating set (`idle`, `skate_a`, `skate_b`, `pass`, `shot_windup`, `shot_release`, `check`, `celebrate`) in all eight directions, the hit reactions, the side strides, glides and stops, and a celebration, on the same baseline and scale.
- **Left-shot in all eight directions**, west-facing ones drawn rather than mirrored (see the stick-hand rule in the format notes), so the same body makes right-shot players by mirroring.
- For every frame, a **head anchor** in the add-on atlas: the neck point (`x`, `y` in frame pixels, where the bottom-centre of the head goes), the head `view` to use (`s`, `se`, `e`, `ne` or `n`; the game mirrors them for the west-facing directions), a `rot` in degrees for leans and hits, and `state` (`normal`, or `effort` for wind-ups, shots, checks and hits).
- Where an arm or the stick passes **in front of the head** (stick raised in a celebration, some checks), a separate `_front` overlay frame with just those pixels, drawn after the head.
- Gear masks for the stick and skates, like Batch M.

**The heads** (`head_<name>`): each one a **helmeted head**, navy helmet (the same on every head) with the face and whatever hair shows below it, in 5 views (`s`, `se`, `e`, `ne`, `n`) × 2 states (`normal`, `effort`): 10 frames, sized to sit on the body's neck point. Please make four:
1. `head_c`: the Batch AA newcomer centre's face, redrawn as a head, so we can compare the composite against the hand-drawn newcomer.
2. `head_freckles`: a freckled kid with a gap-toothed grin.
3. `head_braids`: long braids out the back of the helmet.
4. `head_beard`: an older free agent with a short beard and a scar on the chin.

Draw every head with **mid-tone skin and mid-brown hair**, and for each head frame a **mask** frame (`_mask`) in pure colours: red where the skin is, green where the hair (and beard) is, nothing elsewhere. The game recolours skin and hair through the masks, keeping your shading, so one head can be any skin tone and hair colour. Keep coral and violet off skin, hair and the helmet.

**Portraits, the same way:** one portrait body (`portrait_std`: shoulders and jersey, coral and violet, no head) and, for each head, a portrait face in the five dialogue expressions (`neutral`, `determined`, `grin`, `shocked`, `defeated`) with its `_mask`, plus a neck anchor for the portrait body. 1 + 4 × 5 faces, with masks.

In the add-on atlas please add a `modular` section: the body's frames by direction and pose (like `skaters`), each with its anchor, the heads by name, view and state, and the portrait pieces.

Roughly: the body set (about 80 frames plus overlays and gear masks), 40 head frames and 40 masks, and 21 portrait pieces and 20 masks.

## Batch AK: the other hand

Every skater today is drawn facing right and mirrored to face left, so a player switches hands when they turn around: Nix shoots right going right and left going left (and the camera-facing frames have their own hand again). We want each player to keep one hand: some shoot left, some right.

The fix is to draw the **side and diagonal poses again, facing the other way** with the same hand as the frames that exist: the `west`, `northwest` and `southwest` versions of everything that's drawn facing `east`, `northeast` and `southeast` (the skating set, the side strides, glides and stops, the hit reactions, the shots and passes, the celebration), matching the existing frames in every other way. With both directions drawn in one hand, the game mirrors the set to make the other hand.

Please start with our cast (Nix, Volta and Bram, home kit) and the three Batch AA newcomers, and in the add-on atlas say which hand each existing direction uses (`"hands": { "south": "L", "east": "R", … }`), since today it varies. Use the stick-hand rule in the format notes. The rival casts can follow in a later batch.

About 30 frames per skater, for six skaters.

## Batch AL: the new supers and archetypes

Players now mix an **archetype** (how they play) with a **super** (an element's skill and ultimate). Three new elements are in the game, with stand-in icons and effects drawn in code: **Ember** (fire; the Comets' winger, Fáfnir), **Gale** (wind; the Lynx winger) and **Shadow** (the Ravens' winger, Fenrir), and seven archetypes: Playmaker, Speedster, Blueliner, Sniper, Dangler, Grinder and Enforcer.

- **Ability icons**, in the style and size of `hud_elements/ability/*` (they show on the touch buttons and the Team cards), frame names `hud_elements/ability/<name>`: `ember` (a flame), `gale` (a swirl of wind), `shadow` (a dark crescent with a purple rim), and one per skill and ultimate: `heat_check` (a stick with its blade on fire), `firestorm` (a blazing puck), `tailwind` (a skate with wind lines behind it), `cyclone` (a small whirlwind), `fade` (a skater silhouette dissolving into smoke) and `eclipse` (a puck in front of a black sun with a purple ring). 9 frames.
- **Archetype icons**, small (about 96 px source, read at 20 px on the chips), frame names `icons/arch_<id>`: `playmaker` (two arrows meeting at a puck), `speedster` (a winged skate), `blueliner` (a puck on the blue line with a power streak), `sniper` (crosshairs on a net corner), `dangler` (a puck on a curly trail around a cone), `grinder` (a gear with a stick through it) and `enforcer` (a gloved fist). 7 frames.
- **Ultimate effects**, transparent animation strips drawn over the ice like `ability_effects/*`:
  - `ability_effects/firestorm/phase_1..6`: a fireball trail behind the puck, flames licking backwards.
  - `ability_effects/cyclone/phase_1..6`: a whirlwind about 260 px across at game size, seen at the 45° camera, snow and wind swirling, loopable.
  - `ability_effects/eclipse/phase_1..5`: a burst of shadow as the shot leaves the stick, a dark ring with a violet rim that swallows the puck.
  - `ability_effects/fade/phase_1..4`: wisps of shadow rising off a skater, loopable (the game draws them while Fade lasts).
  - `ability_effects/heat_check/phase_1..4`: small flames on a stick blade, loopable.
  - `ability_effects/tailwind/phase_1..4`: wind lines streaming past a skater, loopable.
  About 29 frames.
- **Combo icons** for the twelve new element pairs, in the style of `icons/combo_*`: `combo_steam_burst`, `combo_magma`, `combo_plasma`, `combo_wildfire`, `combo_smoke_screen`, `combo_blizzard`, `combo_black_ice`, `combo_hurricane`, `combo_dark_bolt`, `combo_sandstorm`, `combo_obsidian` and `combo_night_wind` (each mixes its two elements' colours: Ember orange, Gale mint, Shadow violet, Frost ice blue, Thunder yellow, Stone tan). 12 frames.

About 57 frames and strips.

## Batch AM: the training camp

Players can now change their super or their archetype once a season, for coins (and trade players with rivals): Gearsmith Ottar sells **element stones** (a stone sets the player's super to its element), and Coach Brekka runs a **style camp** (a week of drills that changes the player's archetype). Today these use stand-in icons.

- **Element stones**, in the style and size of the reward icons (about 200 px source), sheet `icons_am.png`, frame names `icons/stone_<element>`: a cut gem on a little iron setting, glowing in its element's colour, with a hint of its effect inside: `stone_frost` (ice blue, a snowflake frozen inside), `stone_thunder` (yellow, a crackle of lightning), `stone_stone` (tan granite, a cracked rune), `stone_ember` (orange, a flame), `stone_gale` (mint, a swirl of wind) and `stone_shadow` (violet-black, a crescent). 6 frames.
- **Style camp**, same sheet: `icons/style_camp` (a whistle on a lanyard over a clipboard with an X-and-O play) and `icons/respec` (a hockey stick with a circular arrow around it, for the "change" buttons). 2 frames.
- **Trades**, same sheet: `icons/trade` (two jerseys, one coral and one teal, with arrows swapping them), for the Trade buttons in Scouting. 1 frame.
- **Two locker-room poses**, matching the Batch H standing art and its scale: `hub_fullbody/shopkeeper/offer` (Ottar holding up a glowing stone in one hand) and `hub_fullbody/coach/whistle` (Brekka blowing the whistle, clipboard under one arm). One frame each, same foot position as their idle frames. 2 frames.

11 frames.

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

## Batch AE: Friends Weekly Cup and career stats icons

**Weekly Cup:** every friends board runs a cup each week (Monday to Sunday): the best score of the week on each board counts, and the top three get the cup and rosettes on their profile.

- **Weekly Cup trophy**, about 120 px tall in game, in the style of `badges/frostline_cup` but clearly smaller and humbler: a silver bowl on a dark wooden base with a teal ribbon tied to one handle. Plus 2 glint frames like the Frostline Cup's. Frame names `badges/weekly_cup`, `badges/weekly_cup_glint_1` and `badges/weekly_cup_glint_2`. 3 frames.
- **Podium**: three ice-block steps (the middle one tallest) with gold, silver and bronze fronts, no numbers, about 360×140 px in game. The game stands the winners' portraits on top. Frame name `badges/podium`. 1 image.
- **Rosettes**: gold, silver and bronze ribbon rosettes, reward-icon size, for the week's top three: `badges/rosette_gold`, `badges/rosette_silver` and `badges/rosette_bronze`. 3 frames.

Put these seven in the `badges` map of the add-on atlas (keys without the `badges/` prefix), like Batch X.

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

This is the biggest batch, so it can come last. **If the AJ pilot works out, skip this one:** more heads and bodies will do the job better.
