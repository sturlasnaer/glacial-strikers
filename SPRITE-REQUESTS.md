# Sprite requests

What the game needs next, in priority order. Everything delivered so far is in the game: v1, P1 gameplay, v2, the v3 arena add-on and v4 Batch A.

This file lives at `/Users/brafa/hockeygame/glacial-strikers/SPRITE-REQUESTS.md` on the Mac, and at <https://github.com/sturlasnaer/glacial-strikers/blob/main/SPRITE-REQUESTS.md> online.

**Next batches:**
1. **G**: goalies (front, back, skating, puck handling, reactions).
2. **M**: gear masks, so equipped sticks and skates recolour on the players.
3. **B**: atmosphere (two more arenas, fans at the glass).
4. **H**: locker-room life.
5. **I**: arena-rule art.
6. **C**: polish.

## Format notes

- Transparent PNG sheets plus an add-on `atlas.json` in the v2 format. Batch A's layout worked perfectly: add-on atlas, `<team>_<role>_<kind>.png` sheets, wide gutters, tight frame rectangles, and a builder patch. Please keep that.
- Same camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters about 152 px standing (`recommended_standing_height`), skates on a consistent baseline.
- Goalies match `halla_side_goalies` scale (the ready pose is about 205 px tall in that sheet).
- Side-view poses face **right**. The game mirrors them for the other side.
- Home colours teal/cream/navy. Every rival is drawn in **coral + violet** and recoloured at runtime, so keep coral and violet off skin and hair.

---

## Delivered ✓

- **v1:** original cast, goalie, rink, props, HUD, power pucks and effects.
- **P1:** 8-way skating, side stride/glide/stop, hit reactions, Halla's side set, ice spray, chips and goal light.
- **v2:** five rival casts, goalies, portraits and expressions, crests, cut-in banners, signature celebrations, three arenas, crowd fans, the locker room and the hub characters.
- **v3:** side-view nets, near glass, scoreboard, team banners and the Snow Fox.
- **v4 Batch A:** rival diagonals (240), rival hit reactions (90), and Blaze and Horn expressions (10).

---

## Batch G: goalies (next)

The goalies only have side-on poses facing the play. In the game they now stand **inside** the net when they're in the goal mouth: the net's front layer (near post, roof, near-side mesh) is drawn over the parts of them behind the goal line. So new poses can sit in the crease or the net and still layer correctly.

Make every set below for **Halla** (home and away colours) and the **five rival goalies** (away colours: Royals, Comets, Rams, Ravens, Lynx), keeping each goalie's mask and helmet.

### G1. Front view (facing the camera)
For the locker room, menus, results ("player of the match"), the shootout intro and anywhere a goalie faces the viewer. v1 has an old front view of Halla only; this replaces it and adds the rivals.
- **Idle ready** ×2 (a breathing loop)
- **Wave**
- **Celebrate** (arms and stick up)
- **Dejected** (head down)
- **Tap pads** (between-whistle fidget)
- Total: 6 poses × 7 goalie variants = **42 frames**.

### G2. Back view (facing their own net)
Used when the puck goes behind the goal line, after a goal against, and when a goalie returns to the crease.
- **Ready, facing the net**
- **Look back over the shoulder**
- **Fishing the puck out of the net** ×2 (bent over, inside the mouth)
- **Dejected, facing the net**
- Total: 5 poses × 7 = **35 frames**. These are seen from behind at the same 45° overhead angle, with the goalie's back toward the camera's right.

### G3. Skating
For a pulled goalie skating to the bench and back, and for covering pucks wide of the net.
- **4-frame skate cycle, facing right**
- **Skating away from the camera** ×2
- **Skating toward the camera** ×2
- Total: 8 × 7 = **56 frames**.

### G4. Puck handling
- **Stick pass:** wind-up and release (the goalie already clears pucks to teammates).
- **Poke check** ×2.
- **Stopping the puck behind the net** ×1.
- Total: 5 × 7 = **35 frames**.

**Batch G total:** about 168 frames. If that's too many at once, do G1 and G2 for Halla first (11 poses × 2 colours = 22 frames), then the rivals.

---

## Batch M: gear masks (sticks and skates)

Equipped gear already shows on the ice through code effects: skate trails and coloured skate marks, stick glow, crackle and shot trails, and armour flashes. To also **recolour the stick and skates on the sprite itself** for every pose, the game needs one mask per skater sheet. The game's renderer and asset builder already support these, so they drop straight in.

**What to make:** for each sheet below, `<sheet>_gearmask.png`.
- Exactly the **same pixel size and layout** as the sheet, painted over the same poses.
- **Pure red `#FF0000`:** the stick, meaning shaft, blade and tape.
- **Pure green `#00FF00`:** the skate boots.
- **Pure blue `#0000FF`:** the skate blades.
- **Everything else transparent.**
- Hard edges and only those three colours, no anti-aliasing. Cover the art's own pixels and don't paint past the outline.
- The game shades each recoloured pixel by the original art's brightness and keeps the dark outlines, so the masks only say *which* pixels, not what colour.

**Sheets (58)**, the ones our skaters and signings use:
- v1: `frost_captain`, `thunder_winger`, `stone_defender`
- P1: `nix_`, `volta_`, `bram_` × `diagonals`, `skating`, `hit_reactions` (9)
- v2: `signature_celebrations`, plus the 15 rival sheets `<team>_<role>` (`aurora_royals_c` … `pinewood_lynx_d`)
- v4: the 30 rival sheets `<team>_<role>_diagonals` and `<team>_<role>_hit_reactions`

**Delivery:** a folder `Glacial-Strikers-Gear-Masks/sheets/` containing the 58 PNGs. No atlas is needed: the builder cuts masks with the existing frame rectangles. If that's too much at once, start with the three v1 sheets and the P1 sheets (13). Those cover Nix, Volta and Bram in every pose.

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
- **C3. Title logo:** a "Glacial Strikers" pixel logo, about 900×300 px, transparent.
- **C4. Fun extras:** fireworks/pyro bursts (6 frames) for the championship, and an ice resurfacer driving laps on the title screen.

## Later

- **Left-facing goalie sets.** Mirroring swaps the catching hand.
- **Gear overlays** for sticks and skates, once animations are final.
