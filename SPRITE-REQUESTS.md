# Sprite requests

What the game needs next, in priority order. Everything in pack v1 is already in use.

## Format notes (same as pack v1)

- Transparent PNG sheets plus an atlas or a uniform grid. Uneven gutters are fine: `tools/build_assets.py` reads the rectangles from `atlas.json`.
- Keep the v1 camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters: same scale as v1 (about 145–160 px tall in a 1254 px sheet) with the skates on a consistent baseline.
- Two team colours per character: home teal/cream/navy, away coral/violet/navy. The game recolours the away coral and violet into each rival's colours, so **keep away jerseys coral + violet** and keep coral off skin and hair.

Shared style line for the prompts (from your v1 prompts):

> Original Glacial Strikers game assets. Authentic colorful 16-bit SNES JRPG pixel art, chunky deliberate square pixel clusters, crisp hard edges, dark navy outlines, 3-4 shade ramps per material, no smoothing, no text, no watermarks, no grid lines. Angled overhead game camera, characters seen from above at a 45 degree elevation, chibi proportions. Cohesive colors: navy #14233b, ice cyan #71dce8, cream #fff2cb, violet #8261bd, gold #ffd45e. Home jerseys teal/cream/navy, away jerseys coral/violet/navy. Each sprite isolated on true transparent background with generous empty padding. Never draw checkerboard.

---

## P1: needed for gameplay to read right

### 1. Side-facing goalies (most important)
The rink is horizontal, so goalies face left or right, but v1 only has front and back views. The game uses the front view as a stand-in.

- **Facing right (east).** The game mirrors it for the right-hand net.
- Poses (one row each): ready stance, shuffle up-screen, shuffle down-screen, butterfly, glove save (high), blocker save, pad stretch (low, sideways), dive up-screen, dive down-screen, cover puck (smothering on the ice), get up.
- Both team colours: 11 poses × 2 = 22 frames.
- Prompt add-on: *"Goaltender seen from the side at 45° overhead, facing RIGHT toward the play, net behind him on the left. Bulky pads, blocker, catching glove, cage mask."*

### 1b. Side-view goal nets (two layers)
The pack's nets are drawn from a front-right angle, but this camera sees the end goals from the side, so they could never line up with the goal line. The game now draws its own pixel nets in code as a stand-in. A proper sprite would look better:
- **Right-hand net only** (the game mirrors it for the left): the mouth faces left toward center ice, seen from the side at the same 45° overhead angle. The red frame stands on the goal line and the mesh body extends to the right.
- Two separate PNGs at the same size and position:
  - **Back layer:** far side mesh, back mesh, base pipe, far post.
  - **Front layer:** roof mesh, near side mesh, crossbar, near post.
  The puck and goalie get drawn between the two layers.
- Size: the mouth spans about 110 px top to bottom (in the scale of a 1254 px skater sheet), about 60 px deep.
- Optional: 3 frames of the mesh bulging outward for goals, and a small red goal light on a post.

### 2. Diagonal skater directions
Skaters turn between 4 directions, which looks snappy on diagonals. Adding **up-right and down-right** (up-left and down-left come from mirroring) gives smooth 8-way skating.
- Same 8 poses as v1 (idle, stride A, stride B, pass, windup, release, check, celebrate).
- 3 characters × 2 teams × 2 directions × 8 = 96 frames. Even just stride A, stride B and idle would help a lot.

### 3. Hit reactions
Right now a hit skater just tilts and flashes white.
- Per character, facing right and facing down: **stagger**, **knocked down (on the ice)**, **getting up**. 3 characters × 2 teams × 2 directions × 3 = 36 frames.

### 4. Better skating loop and a hockey stop
- **4-frame stride** for facing right (replaces the 2-frame A/B).
- **Hockey stop**: body leaning back, skates sideways, with a snow spray.
- **Glide**: coasting with stick on the ice.

---

## Stadium and atmosphere (after the P1 items above)

The arena is where most of the immersion comes from. In order of payoff:

### S1. Near-glass foreground layer
A transparent PNG at the exact size and position of `rink_backdrop.png` (1536×1024) containing **only the near (bottom) boards, glass panels, posts and top rail**, with everything else erased. The game draws it over the players, so skaters along the bottom boards appear behind the glass. This is mostly an edit of the existing backdrop: keep the glass frame and make the glass itself about 25% opaque.

### S2. Goal lights
A red rotating goal lamp mounted on the glass behind each net, as 2 frames (off and on), about 40×60 px. It replaces the floodlight prop the game borrows now.

### S3. Scoreboard / jumbotron
A hanging or tower scoreboard that sits in the top stands above the centre stairs (about 220×110 px), with a dark empty screen area. The game draws the live score and "GOAL!" onto the screen.

### S4. Crowd and mascot
- 6–8 tiny fans (about 24 px tall), 2 frames each (sitting, arms-up cheering), in home and away colours, a few holding signs. This expands item 11 below; it replaces the procedural pixel fans.
- A **mascot** (snow yeti or penguin in a Strikers jersey), 4-frame dance plus 1 cheer, about 60 px tall. It dances in the stands on home goals.
- 3–4 **fans pressed against the glass** with a camera-flash frame, for goals scored near them.

### S5. Rival banners
One hanging banner per rival (lynx, comet, ram, raven, aurora crown), 2 frames waving, sized to cover the snowflake banners in the four corners of the backdrop. Each away match then feels like their building.

### S6. Arena variants
Item 10 below (Ember Dome, Aurora Palace, Pine Pond). Keep the same rink geometry and the near-glass layer per arena.

### S7. Fun extras
- An ice resurfacer driving laps on the title screen.
- Fireworks/pyro bursts (6 frames) above the stands for the championship win.

---

## P2: identity and story

### 5. Rival rosters
Every rival is currently our own three skaters in recoloured jerseys. One new trio (C / W / D) plus a goalie per team turns the tournament into a cast:
1. **Aurora Royals** (final boss): elegant, crowned helmets, cape-like jersey trim.
2. **Ember Comets**: hot-headed, flame trim, spiky hair.
3. **Gilded Rams**: big, horned helmets.
4. **Obsidian Ravens**: sleek, feathered visors, disciplined.
5. **Pinewood Lynx**: young, fuzzy ear-flap toques.

The full v1 skater sheet set (8 poses × 4 directions × away colours only) plus goalie and portrait. Away colours only are fine, since rivals never wear our home jerseys.

### 6. Portrait expressions
For dialogue scenes: **neutral, grin, determined, shocked, defeated** for Nix, Volta, Bram and Halla, plus each rival captain.

### 7. Rival crests
One crest each: lynx, comet (v1 has it), ram, raven, aurora crown. Same shield style as v1.

### 8. Ultimate cut-ins
A wide banner (about 1600×500) per character: dramatic close-up, speed lines, element colour. It slides across the screen for half a second when an ultimate fires. This is the single biggest "anime JRPG" moment.

---

## P3: juice and environment

### 9. Signature goal celebrations
3–4 frames each: Nix plants an ice spike, Volta strikes a lightning pose, Bram flexes and hoists his stick.

### 10. More arenas
Same composition and rink geometry as `rink_backdrop.png` (1536×1024, boards and lines in the same places) so collisions still line up. Only the surroundings, lighting and ice tint change:
- **Ember Dome**: indoor, volcanic rock stands, warm lighting.
- **Aurora Palace**: night, northern lights overhead, crystal stands.
- **Pine Pond**: outdoor frozen lake, snowbanks for boards, pine trees.

### 11. Crowd fans
6–8 tiny fans (about 24 px tall) in 2 frames each (sitting, cheering arms-up), some holding signs, in home and away colours. These would replace the procedural pixel fans drawn now.

### 12. Hub background
Locker room interior (1536×864): benches, lockers, the stick rack and shop stall from v1 placed in the room. It would replace the dimmed rink behind the menus.

### 13. Hub NPCs
Portraits for a **coach** (training), a **shopkeeper** (gear) and a **tournament announcer**.

### 14. Gear on the body (later)
Overlay sprites so equipped sticks and skates show on the characters. These need to match every pose, so leave them until the animations are final.

---

## Small fixes in v1 (optional)

- Facing left uses mirrored facing-right frames, so the stick hand flips. A dedicated left-facing row fixes that.
- `rink_props/props/lamp` is a floodlight. A small red **goal light** on a post behind the net would read better.
- A tiny 8-frame **ice spray** strip and **ice chips** would replace the square particles.
