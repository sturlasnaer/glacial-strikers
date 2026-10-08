# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd), the remaining packs (Batches B, H, I, C and N-Extras) and the new batches (P, R, S, K, T and M2).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **D**: celebrations for the rival wingers and defenders.
2. **O**: arena-rule icons.
3. **E**: achievement icons.
4. **J**: the Awards Night stage.
5. **F**: a penalty box for Pine Pond.

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

## Batch D: celebrations for the rival wingers and defenders

Only the five rival captains have a goal celebration (Batch C). When a rival winger or defender scores, or one you've signed scores for you, they just bob on the spot. Please draw four phases each for the other ten rival skaters, made like the captains' sheets: facing the camera, on the same scale and foot baseline, in **coral + violet**, one sheet per skater named `<team>_<role>_celebrations.png` (for example `gilded_rams_w_celebrations.png`). Some ideas:

- **Pinewood Lynx:** the winger pounces into a knee slide; the defender flexes like a tree trunk.
- **Ember Comets:** the winger spins with a comet tail of sparks; the defender pumps a fist of flame.
- **Gilded Rams:** the winger stomps a hoof; the defender lowers their head and charges.
- **Obsidian Ravens:** the winger glides with their cape spread; the defender gives a cold stick salute.
- **Aurora Royals:** the winger takes a sweeping bow; the defender raises their stick like a sceptre.

40 frames.

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

13 frames, on one sheet named `achievement_icons.png`, with frame names `achievements/<name>`.

## Batch J: Awards Night stage

The season awards open over the dimmed locker room. Please draw a stage for them: a **1536×864 backdrop** with velvet curtains, spotlights, a podium at centre and a table of covered trophies, in navy and gold. Also **Kip Vance at the podium**, full body and facing the camera, at the same scale as the Batch H characters (about 820 px source standing), in 3 frames: `speaking`, `opening_envelope` and `applauding`. 1 backdrop and 3 frames.

## Batch F: a penalty box for Pine Pond

Batch P's glass box looks out of place on Pine Pond's snowbank. Please draw a rustic version with **the same four layers, size, feet positions and layering** as Batch P (`back`, `front_closed`, `front_open`, `light_on`): log walls, a plank bench, a gate set into a snowbank front, and a hanging lantern whose warm glow is the `light_on` frame. 4 frames, named `penalty_box_pond/*`.
