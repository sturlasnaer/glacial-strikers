# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras) and the new batches (P, R, S, K, T and M2).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **U**: a pixel-art UI kit for the menus (if D is already underway, finish it first).
2. **D**: celebrations for the rival wingers and defenders.
3. **W**: Winter Classic dressing for Pine Pond.
4. **O**: arena-rule icons.
5. **E**: achievement icons.
6. **J**: the Awards Night stage.
7. **F**: a penalty box for Pine Pond.

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

---

## Batch U: a pixel-art UI kit for the menus

The menus are HTML styled in CSS: flat navy panels with an ice-blue rim, rounded buttons and chips, and a plain gold outline for the controller highlight. They should look as hand-made as the game. The menus stay HTML (that keeps text wrapping, Icelandic, phone layouts and screen readers working), skinned with these sprites through CSS `border-image`, so:

- **Deliver every piece as its own transparent PNG** (CSS needs a file per image), drawn at 2× or 3× and nearest-neighbour clean. Add a small JSON listing each file and its **9-slice margins** (left/top/right/bottom, in source pixels).
- **Centres must stretch or tile cleanly**: flat or very subtly dithered fills, with all the detail in the corners and edges.
- Navy outlines and the game palette: navy `#14233b`, ice `#71dce8`, cream `#fff2cb`, gold `#ffd45e`, coral `#ff6f7d`.

**Pieces:**

- **Panels (9-slice):** `panel` (the main menu panel, navy with an ice rim and small riveted corners), `panel_modal` (pop-ups, a heavier frame), `card` (shop items, list rows, a lighter inner frame), and `card_focus` (the same card with a gold rim).
- **Buttons (9-slice, about 48 px tall in game, `normal` and `pressed` each):** `btn_gold` (main actions), `btn_ice` (default), `btn_cream`, `btn_ghost` (outlined) and `btn_disabled`. 10 images.
- **Tabs:** `tab` and `tab_active`. **Filter chips:** `chip` and `chip_on`.
- **Controller highlight:** four gold corner brackets drawn around the highlighted button, two frames for a gentle pulse (`focus_corner_a`, `focus_corner_b`; the game mirrors one corner for the other three).
- **Button prompts, about 32 px:**
  - PlayStation: ✕ ○ □ △, L1 R1 L2 R2, Options, Create and the D-pad.
  - Xbox: A B X Y, LB RB LT RT, Menu, View.
  - Keyboard keycaps: Enter, Esc, Shift, Space, the arrow keys, W A S D and the letters H J K L O P U I.

  They go on menu buttons ("✕ Buy", "○ Back"), the tab bar (L1/R1) and the controls help.
- **Small parts:** a coin price tag (9-slice), an `OWNED` stamp, a `NEW` badge, a red notification dot, a scrollbar track and thumb, and a dialogue box frame (9-slice) with a name plate.

About 60 images.

---

## Batch D: celebrations for the rival wingers and defenders

Only the five rival captains have a goal celebration (Batch C). When a rival winger or defender scores, or one you've signed scores for you, they just bob on the spot. Please draw four phases each for the other ten rival skaters, made like the captains' sheets: facing the camera, on the same scale and foot baseline, in **coral + violet**, one sheet per skater named `<team>_<role>_celebrations.png` (for example `gilded_rams_w_celebrations.png`). Some ideas:

- **Pinewood Lynx:** the winger pounces into a knee slide; the defender flexes like a tree trunk.
- **Ember Comets:** the winger spins with a comet tail of sparks; the defender pumps a fist of flame.
- **Gilded Rams:** the winger stomps a hoof; the defender lowers their head and charges.
- **Obsidian Ravens:** the winger glides with their cape spread; the defender gives a cold stick salute.
- **Aurora Royals:** the winger takes a sweeping bow; the defender raises their stick like a sceptre.

40 frames.

## Batch W: Winter Classic dressing for Pine Pond

Once a season, after league round 3, the Foxes play the Winter Classic: an outdoor showcase on Pine Pond against the league leaders, in heavier snow, with its own anthem and fireworks for a win. Pine Pond should look dressed up for it. Everything goes on the existing `arena_pine_pond` backdrop (1536×1024) and must not cover the ice:

- **A banner** strung between two poles above the far snowbank, about 420×110 px at game size: a big snowflake crest with crossed sticks and pine boughs, in navy, cream and ice blue. **No lettering** (the game is in English and Icelandic), so the emblem has to carry it. 2 frames of it swaying.
- **String lights:** a tileable strip, about 64×20 px at game size, of warm bulbs on a wire that sags a little, to run along the far and near snowbanks. 2 frames (bulbs alternating bright and dim).
- **Fire barrels:** an old oil drum with a fire in it, about 48×70 px at game size, as a 4-frame flicker loop. The game puts one in each corner behind the snowbank.
- **Fans in winter gear:** 4 extra far-stand fans in toques, scarves and blankets, sitting and cheering (8 frames), in the far-stand fans' size and layout (`crowd/*`) with home and away versions like them.

Say in the README where you'd hang the banner and run the lights; the game will place them from that. 16 frames.

## Batch O: arena-rule icons

The arena rules show as plain text on the quick-play arena chips, on the daily challenge card and in the rule announcement. Please draw one small icon for each, in the style of the ability icons (`hud_elements/ability/*`, about 210 px source, shown at 32–64 px): **meltwater** (a steaming pool), **aurora lanes** (a green-violet chevron), **pond cracks** (a cracked circle), **rumble strips** (gold ridges with a hopping puck), **raven shadows** (a raven over a dark wing shadow), **speed lanes** (a cyan chevron) and **cracked ice** (a rough patch). 7 frames, on one sheet named `rule_icons.png`.

## Batch E: achievement icons

34 achievements share 21 icons in the trophy case: five use the same trophy and four the same medal. Please draw an icon of its own for each of these 13, in the style and size of the reward icons (`equipment_items/reward/*`, about 200×192 source):

- **Lamp Lighter** (first goal): a red goal lamp, lit.
- **Daily Grind**: a calendar page with a puck on it.
- **Never Out of It** (a comeback from 3 down): a scoreboard with a rising arrow.
- **Hat Trick**: three pucks under a hat.
- **On a Roll** (a daily-challenge streak): a puck with a flame trail.
- **Shootout Hero**: a puck on the spot under a spotlight.
- **In Sync**: two crossed sticks with matching sparks.
- **Talent Scout**: binoculars.
- **Dynasty**: three stacked cups.
- **Perfect Season**: a cup inside a laurel wreath.
- **Most Valuable**: a star medal on a ribbon.
- **Awards Sweep**: a fan of award envelopes.
- **Free Agent**: a contract and a pen.
- **Winter Classic**: a cup with a snow cap and a pine sprig.

14 frames, on one sheet named `achievement_icons.png`, with frame names `achievements/<name>`.

## Batch J: Awards Night stage

The season awards open over the dimmed locker room. Please draw a stage for them: a **1536×864 backdrop** with velvet curtains, spotlights, a podium at centre and a table of covered trophies, in navy and gold. Also **Kip Vance at the podium**, full body and facing the camera, at the same scale as the Batch H characters (about 820 px source standing), in 3 frames: `speaking`, `opening_envelope` and `applauding`. 1 backdrop and 3 frames.

## Batch F: a penalty box for Pine Pond

Batch P's glass box looks out of place on Pine Pond's snowbank. Please draw a rustic version with **the same four layers, size, feet positions and layering** as Batch P (`back`, `front_closed`, `front_open`, `light_on`): log walls, a plank bench, a gate set into a snowbank front, and a hanging lantern whose warm glow is the `light_on` frame. 4 frames, named `penalty_box_pond/*`.
