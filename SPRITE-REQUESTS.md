# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on, v4 Batch A, the v5 goalies and the Batch M gear masks.

The game is now called **Puckbound**, and the home team is the **Snowcrest Foxes** (the Snow Fox is their mascot; colours unchanged). Packs can be named `Puckbound-...` from now on; older `Glacial-Strikers-...` folder names still work.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **L**: goalies in true profile, facing left and right (and holding the glove in the correct hand).
2. **N**: the near-side crowd, seen from behind.
3. **B**: atmosphere (two more arenas, fans at the glass).
4. **H**: locker-room life.
5. **I**: arena-rule art.
6. **C**: polish.

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

---

## Batch L: goalies in true profile, facing left and right (next)

**What's there now.** The goalies' "side" poses (Halla in home and away colours, and the five rival goalies) are **three-quarter views**: the body faces the camera and only the head and pads turn toward the play. They only face right, and the game mirrors them for the right-hand net, which also puts the glove in the wrong hand.

**What we want:** every goalie in **true profile**, with the **whole body facing the play**: head, chest, pads, glove and stick all turned 90° to the side, seen from the same 45° overhead camera as everything else. That's two full sets per goalie: one **facing right** (defending the left-hand net) and one **facing left** (defending the right-hand net). Draw both; no mirrored copies.

**Hands (important).** All our goalies catch left: **catching glove on the goalie's left hand, blocker and stick in the right.**
- **Facing right:** the stick and blocker hand is on the near side, toward the camera. The glove is on the far side, partly behind the body.
- **Facing left:** the glove is on the near side, toward the camera. The stick and blocker are on the far side.
- So the right-facing and left-facing sets are not mirror images of each other.

**Poses, for each direction:**

| Group | Poses | Frames |
|---|---|---|
| Stance and saves | ready, ready_repeat (a breathing frame), shuffle_up, shuffle_down, butterfly, glove_save, blocker_save, pad_stretch, dive_up, dive_down, cover, getting_up | 12 |
| Skating | skate_a–d, a 4-frame cycle skating in that direction | 4 |
| Puck handling | pass_windup, pass_release, poke_a, poke_b, stop_behind_net | 5 |

That's **21 frames × 2 directions = 42 per goalie, × 7 goalies = 294 frames.** `dive_up` stretches up-screen (away from the camera) and `dive_down` toward it, in both directions. In each direction, `glove_save` and `blocker_save` reach toward whichever side that hand is on.

Not needed: the front views, the back views (they face the net, and the existing ones are fine), and the up/down skating frames.

**Format:** same as the v5 goalies: the `halla_side_goalies` scale (ready pose about 205 px tall in the sheet), an add-on `atlas.json` in the v5 format whose `goalies` entries carry `east` and `west` frame sets (`flip_x: false`) with the pose names above (`<goalie>/g/<kit>/east/<pose>` and `.../west/<pose>`), delivered as `Puckbound-Batch-L`. The builder already reads this layout. Keep each goalie's mask and helmet design the right way round in both directions.

**If that's too much at once:** start with the left-facing sets for the five rival goalies and Halla in away colours, since they defend the right-hand net (6 × 21 = 126 frames). Then the right-facing sets (126). Halla's home kit last (42).

---

## Batch N: near-side crowd

The far stands use the v2 crowd sprites (now drawn bigger). The near stands at the bottom of the screen, on the two benches either side of the mascot's stairs, are still drawn in code. Those fans sit with their **backs to the camera**, watching the ice, so they need their own sprites.

- **Fans from behind**, at the same 45° overhead camera: back of the head (hair, beanies, caps, hoods), shoulders and jersey backs. Some wear scarves, some have a number on the jersey. Chibi proportions like the far fans, sitting on a bench.
- **8 different fans**, each in **2 poses**: sitting and cheering (arms up). Two of the eight hold up a sign (we see the cardboard back).
- **Home colours** (teal/cream/navy) and **away colours** (coral/violet, recoloured at runtime like the rival casts). Keep coral and violet off skin and hair.
- **Size:** about 200 px tall in the sheet, so they draw at about 50 px next to the near benches (the far fans are 190 px drawn at about 34 px).
- Feet or seat on a consistent baseline, transparent background, wide gutters, an add-on `atlas.json` as in Batch A, keyed like `crowd_back/<home|away>/<sitting|cheering>/fan_<n>`.
- **Total:** 8 fans × 2 poses × 2 colourways = **32 frames**.

Optional, same set: **2 frames of a flag waver** from behind (a big team flag swinging left and right) for goals.

---

## Batch B: atmosphere

### B2. Arenas for the Rams and the Ravens
The other three rivals host you in their own building; these two still play at the Frostline rink.
- **Gilded Rams:** a golden mountain hall (carved stone, gold banners, braziers).
- **Obsidian Ravens:** a dark aerie (black stone, violet lanterns, perched ravens).

Same rink geometry, line positions and lamp spots as `rink_backdrop.png`, 1536×1024. The v3 near-glass layer must line up with them as it does with the others. A rule idea each: the Rams' hall with "rumble strips" by the boards, and the Ravens' with "shadow zones" where the puck is harder to see.

### B4. Fans pressed against the glass
3–4 fans, facing the camera, about 28 px tall, home and away colours, plus a camera-flash frame. For goals scored near the bottom glass.

### B5. Volcanic scoreboard (optional)
A stone/lava variant of the v3 scoreboard for the Ember Dome, same canvas and display fields.

---

## Batch H: locker-room life

The hub is now the clickable locker room (`locker_room.png`), with stations at the lockers (Team), the shop counter (Shop), the stick rack (Training), the crystal chest (Trophies) and the benches (League). The dressed line-up and Halla stand on the floor.

### H1. Hub characters, full body
Coach Brekka, Gearsmith Ottar and Kip Vance (the announcer) standing, facing the camera. Each gets a 2-frame idle plus 1 talking frame, at skater scale (about 152 px). They'll stand at their stations: Ottar behind the counter, the coach by the stick rack, Kip by the benches. Total: **9 frames**.

### H2. Trophy chest, open
An overlay exactly over the crystal chest: about x 228–345, y 200–345 in the 1536×864 `locker_room.png`. Two frames: closed and glowing, and open with trophies inside.

### H3. League board (optional)
A freestanding cork or whiteboard easel with fixture papers, about 180×240 px, feet at about 57% across and 52% down the room. It makes the League station read at a glance.

---

## Batch I: arena-rule art (optional)

The arena rules are drawn in code today. Sprites would look richer:
- **Meltwater pool** (Ember Dome): a 4-frame ripple loop, a top-down ellipse about 150×110 px with warm reflections.
- **Pond crack decals** (Pine Pond): 3 variants × 4 growth stages, from hairline to wide with dark water showing, about 180 px.
- **Aurora lane tile** (Aurora Palace): a tileable strip about 64×36 px, 8 frames shimmering from green to violet, with a chevron.
- **Splash**: a 6-frame water burst, about 60 px.

---

## Batch C: polish

- **C1. Rival captain celebrations:** 4 phases each for the five captains (20 frames). Ideas: Lynx howl, Comets fire burst, Rams headbutt the glass, Ravens wing spread, Royals crown tip.
- **C2. Rival side strides:** a 4-frame stride, hockey stop and glide facing right for each rival skater (15 × 6 = 90 frames).
- **C3. Title logo:** a "Puckbound" pixel logo, about 900×300 px, transparent.
- **C4. Fun extras:** fireworks/pyro bursts (6 frames) for the championship, and an ice resurfacer driving laps on the title screen.

## Later

