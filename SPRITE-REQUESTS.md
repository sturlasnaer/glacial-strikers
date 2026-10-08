# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies, the Batch M gear masks, Batch L (profile goalies), Batch N (near-side crowd) and the remaining packs (Batches B, H, I, C and N-Extras).

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **P**: penalty box.
2. **R**: rival mascots.
3. **S**: rules for the Golden Hall and the Dark Aerie.
4. **K**: scoreboards for Pine Pond, the Golden Hall and the Dark Aerie.
5. **T**: training props.
6. **M2**: gear masks for the rival side strides.

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

## Batch P: penalty box

A penalized skater stands at the far boards beside centre ice today, so the box is invisible. Please draw a small penalty box built into the far boards. The game puts one each side of centre: ours at about x 700, the visitors' at about x 836 on the 1536×1024 rink. The far boards' top rail is at about y 165 and the ice edge at about y 207 there.

- About 70 px wide and 80 px tall at game size (please draw it at 2× or more, like the other props). It has glass sides and front glass, a bench inside, and a door in the boards facing the ice. The boards, rail and glass match the rink's (white boards, red rail, navy posts), so it fits every arena.
- **Two layers** so a skater can stand inside. The back layer is the back wall and bench, drawn behind the skater. The front layer is the boards, door and front glass, drawn over the skater's legs. A skater is about 70 px tall in game and should show from the waist up.
- **Frames:** `back`, `front_closed`, `front_open`, and a small red `light_on` overlay above the door that the game flashes while the penalty runs. 4 frames, drawn in neutral rink colours (not recoloured).

## Batch R: rival mascots

The Snow Fox dances on the near stairs at home, but the rival buildings have no mascot. Please draw one for each rival, made like the Snow Fox (`mascot/snow_fox`). They have the same four frames, **idle, wave, cheer_a and cheer_b**, on the same canvas size (about 456×508 source), and the game draws them at 1/8 (about 57×64 px).

- **Pinewood Lynx:** a lynx in a toque.
- **Ember Comets:** a grinning fireball with a comet tail.
- **Gilded Rams:** a ram with gilded horns.
- **Obsidian Ravens:** a raven in a hooded cloak.
- **Aurora Royals:** a crowned polar bear, or whatever fits the Royals' crest best.

Draw them in **coral + violet** like all rival art, one sheet per team named `<team>_mascot.png` (for example `gilded_rams_mascot.png`), so they land on the rival's pages and are recoloured into team colours. The game puts them where the Snow Fox stands at home: bottom centre, feet at about (768, 950) on the 1536×1024 arena. If an arena has no room there, say in the README where it should go. 20 frames.

## Batch S: rules for the Golden Hall and the Dark Aerie

The other three buildings each have a rule. These two will get theirs when this art lands (code-drawn placeholders first):

- **Golden Hall, rumble strips:** ridged strips carved into the ice along the far and near boards. Skating over them with the puck makes it hop off the stick. Please draw a **tileable horizontal strip tile, 64×24 px** at game size, tiled edge to edge like the aurora tiles, in two frames (`rest`, `rattle`: the ridges catching the brazier light). Also a **3-frame puck hop**, a small burst of ice dust about 24 px.
- **Dark Aerie, shadow zones:** a raven's shadow sweeps over the ice, and inside it the puck is hard to see. Please draw a **soft shadow decal**, top-down, about 200×120 px, dark violet, feathered edges with a wing shape, as a 4-frame drift loop. Also a **raven flying across** in side view, about 40 px, a 4-frame flap facing right (the game mirrors it).

About 13 frames. The rule names and descriptions go in the game's text (and Icelandic).

## Batch K: arena scoreboards

The volcanic scoreboard made the Ember Dome feel like its own building. The other rival arenas still hang the Frostline scoreboard. Please draw a variant of the v3 scoreboard for each, with **the same canvas, pivot and display fields** as B5 (clock, home score, away score, period, left blank for live text):

- **Pine Pond:** a rustic wooden board on posts, with snow on top and painted lettering (it's outdoors).
- **Golden Hall:** carved stone and gold, with ram horns on the corners.
- **Dark Aerie:** black stone with violet lanterns, and a raven perched on top.

3 frames.

## Batch T: training props

Two training visuals are still drawn in code:

- **Sniper targets:** round 3-ring target boards that hang in the goal mouth (top corner, middle and bottom corner), about 18 px tall at game size. Draw them slightly foreshortened, since our side-on camera sees them at an angle. Three states: `unlit` (grey), `lit` (red and cream), `hit` (gold flash). 3 frames.
- **Speed lane tile** (the Frostline rink's stage twist): a **tileable strip like the aurora tiles, 64×36 px** at game size, cyan and white with a chevron pointing **right**, as an 8-frame shimmer. 8 frames.

11 frames.

---

## Batch M2: gear masks for the rival side strides

Signed rival skaters wear our gear, but their new side strides, stops and glides have no masks, so their special sticks and skates don't recolour in those poses. The same format as Batch M: `<sheet>_gearmask.png` beside each `<team>_<role>_side_strides.png` (15 sheets), red for the stick, green for the boots, blue for the blades. Captain celebrations don't need them.
