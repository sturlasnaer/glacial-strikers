# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd) and the remaining packs (Batches B, H, I, C and N-Extras).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next:** one small, optional batch (M2, below). Nothing else is outstanding.

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

---

## Next (optional)

### Batch M2. Gear masks for the Batch C side strides
Signed rival skaters wear our gear, but their new side strides, stops and glides have no masks, so their special sticks and skates don't recolour in those poses. The same format as Batch M: `<sheet>_gearmask.png` beside each `<team>_<role>_side_strides.png` (15 sheets), red for the stick, green for the boots, blue for the blades. Captain celebrations don't need them.

## Ideas (ask before drawing)

- **Golden Hall rule: rumble strips** along the boards that shake the puck loose. It would need a strip tile, like the aurora lanes.
- **Dark Aerie rule: shadow zones** where the puck is harder to see. It would need a soft shadow decal and a raven flying over.
