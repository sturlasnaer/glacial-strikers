# Sprite requests

What the game needs next, in priority order. Everything in the complete v2 pack is in the game, except the layered nets (see A1).

## Format notes (same as the v2 pack)

- Transparent PNG sheets plus an `atlas.json` in the v2 format. Uneven gutters are fine: `tools/build_assets.py` reads the rectangles from the atlas.
- **Use the v2 naming scheme** so new art drops straight in: frame IDs like `<sheet>/<team>/<role>/<direction>/<pose>`, rivals as `aurora_royals_c` / `_w` / `_d` / `_g`, and the same named mappings (`rivals`, `goalies`, `animations`, `portraits`, `ultimate_banners`, `backgrounds`).
- Keep the v1 camera (45° overhead), chibi proportions, navy outlines and palette.
- Skaters: same scale as v1 (about 145–160 px standing) with skates on a consistent baseline. Generous gaps between cells, because sticks that touch the next cell get clipped.
- Two team colours: home teal/cream/navy, away coral/violet/navy. Every rival is drawn in away colours and recoloured into its team colours at runtime, so **keep rival jerseys coral + violet** and keep coral and violet off skin and hair.

---

## Delivered ✓

- **v1 pack:** the original cast, goalie, rink, props, HUD, power pucks and effects.
- **P1 gameplay:** 8-way skating, 4-frame side stride with glide and hockey stop, hit reactions, Halla's side-on goalie set, ice spray, ice chips and the goal light.
- **v2 pack:** 5 rival casts with goalies, portraits and 45 expressions, crests, 24 cut-in banners, signature celebrations, Ember Dome / Aurora Palace / Pine Pond, crowd fans, the locker room and the three hub characters.

---

## Batch A: consistency (biggest payoff)

Our trio now animates much more than the rivals do, which shows when they share the ice.

### A1. Side-view goal nets (redo)
The layered net in P1 and v2 is drawn with the goal mouth turned about 45° toward the camera. In this camera the goal line runs **straight up and down the screen**: the far post stands directly above the near post, the crossbar runs vertically between their tops, and the mesh goes to the right. No warp fits the P1 art onto that, so the game still draws its own nets in code.

**Reference: [`reference/net-reference.png`](reference/net-reference.png)** shows the in-game net at 4× with Halla for scale, and the back and front layers at 8×. Paint over those exact shapes:
- Right-hand net only (mirrored for the left), mouth facing LEFT.
- Two PNGs on one canvas: **back** (far post, far-side mesh, back mesh, base) and **front** (near post, crossbar, roof and near-side mesh).
- In-game size is small (posts about 34 px tall, mouth 76 px top to bottom, about 40 px deep), so draw it at 2–4× and it gets scaled down.
- Optional: 3 bulge frames for goals.

### A2. Rival hit reactions
Our skaters stagger, fall and get up on big hits; rivals only wobble.
- Per rival skater (15), away colours, facing right and facing down: **stagger, knocked down, getting up**.
- 15 × 2 directions × 3 = **90 frames**. Same poses as `nix_hit_reactions`.

### A3. Rival diagonals
Rivals turn in 4 directions while our team uses 8.
- Per rival skater (15): **up-right and down-right** (the game mirrors the left ones).
- Full set is the 8 v1 poses (idle, stride A, stride B, pass, windup, release, check, celebrate): 15 × 2 × 8 = 240 frames.
- **Minimum useful set:** idle, stride A, stride B = **90 frames**.

### A4. Two more expression sets
Two rivals who talk in the story aren't captains, so they have no expressions yet:
- **Blaze** (Ember Comets winger) and **Horn** (Gilded Rams defender).
- Neutral, grin, determined, shocked, defeated: 2 × 5 = **10 portraits**, same framing as `expressions_core`.

---

## Batch B: atmosphere

### B1. Near-glass foreground layer
One transparent PNG per arena (Frostline, Ember Dome, Aurora Palace, Pine Pond), each 1536×1024 and lined up with its backdrop. It contains **only the near (bottom) boards, glass panels, posts and top rail**, with everything else erased and the glass about 25% opaque. The game draws it over the players, so skaters along the bottom boards appear behind the glass. Pine Pond would be just the near snowbank lip.

### B2. Arenas for the Rams and the Ravens
The other three rivals now host you in their own building; these two still play at the Frostline rink.
- **Gilded Rams:** a golden mountain hall (carved stone, gold banners, braziers).
- **Obsidian Ravens:** a dark aerie (black stone, violet lanterns, perched ravens).
- Same rink geometry, line positions and lamp spots as `rink_backdrop.png`, 1536×1024.

### B3. Scoreboard / jumbotron
A hanging scoreboard above the centre stairs in the top stands (about 220×110 px) with a dark empty screen. The game draws the score and "GOAL!" onto it. One generic design is enough.

### B4. Mascot and fans at the glass
- A **mascot** (snow yeti or penguin in a Strikers jersey), 4-frame dance plus 1 cheer, about 60 px tall. It dances in the stands on home goals.
- 3–4 **fans pressed against the glass** with a camera-flash frame, for goals scored near them.

---

## Batch C: polish

### C1. Rival signature celebrations
A 4-phase celebration for each rival captain (5 × 4 = 20 frames), like `signature_celebrations`. Ideas: Lynx howl, Comets fire burst, Rams headbutt the glass, Ravens wing spread, Royals crown tip.

### C2. Rival side strides
4-frame stride, hockey stop and glide facing right for each rival skater: 15 × 6 = 90 frames. Lower priority than A2/A3.

### C3. Title logo
A "Glacial Strikers" pixel logo (about 900×300, transparent) for the title screen, which is plain text now.

### C4. Fun extras
- Fireworks/pyro bursts (6 frames) above the stands for the championship win.
- An ice resurfacer driving laps on the title screen.

### C5. Later
- A facing-left set for Halla and the rival goalies (mirroring swaps the catching hand).
- Gear overlays for sticks and skates, once animations are final.
