# Glacial Strikers

3-on-3 arcade hockey RPG for phones and browsers. Plain HTML5 canvas and ES modules, with no build step and no dependencies.

## Run it

```bash
cd glacial-strikers
python3 tools/serve.py 8080
```

Open http://localhost:8080 on this computer. To play on a phone on the same Wi‑Fi, open `http://<this-computer's-IP>:8080` (on a Mac, `ipconfig getifaddr en0` prints the IP). If macOS asks whether Python may accept incoming connections, allow it.

The game needs to be served over http; opening `index.html` straight from disk won't load the modules.

### Offline

- **Single file:** `node tools/build_offline.mjs` writes `dist/glacial-strikers-offline.html`, one 3.8 MB file with everything embedded. Double-click it on any computer to play with no server or internet.
- **Install on a phone (home screen, offline):** the game is a Progressive Web App with a manifest, icons and a service worker that caches all 41 files. Phones only allow this from an **https** address. Host the folder on any https static host (GitHub Pages, Netlify, Cloudflare Pages), open it on the phone, then:
  - Android (Chrome): menu, then *Install app*. The title screen also shows an Install button.
  - iPhone (Safari): Share, then *Add to Home Screen*.
  After the first visit it launches fullscreen in landscape and plays with no connection. Progress is saved on the phone.
- After changing any game file, run `node tools/build_pwa.mjs` so the service worker picks up the new version (and rebuild the offline file if you use it).

## Controls

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Skate | WASD / arrows | Left stick | Drag on the left half |
| Sprint | Shift | RB / LT | SPRINT |
| Shoot (tap = wrist, hold = slapshot) / Check | J or Space | X / RT | SHOOT / CHECK |
| Pass / Switch player | K or Enter | A | PASS / SWITCH |
| Signature skill | U or Q | B / LB | Skill button |
| Ultimate | I or E | Y | Star button |
| Pause | Esc / P | Start | Pause icon |

**Pull the goalie:** H on keyboard, Back/View on a gamepad, or the PULL GOALIE touch button. It's available when you're behind and the other team needs one more goal.

Hold shoot while a pass is on its way to fire a **one-timer**. Your skates plant while you hold it, so steering only aims.

**Local versus (2 players):** P1 uses WASD, F shoot/check, G pass/switch, Left Shift sprint, R skill, T ultimate. P2 uses the arrows, K shoot/check, L pass/switch, Right Shift sprint, O skill, P ultimate. With two gamepads each player gets one; with one gamepad it goes to P2. Esc pauses.

**Shootout goalie:** on the rival's shot you're in goal. Steer to move, shoot = butterfly, pass = dive.

## What's in this build

- **Match:** first to 5, 3 skaters + AI goalie per side, possession, passing with lead, wrist/slap/one-timer shots, smart aim with manual corner aim, checks with hit-stop, stick-checks, shot blocks, rebounds, posts, goalie dives and freezes, faceoffs.
- **Characters:** Nix (Glacier Glide trail / Absolute Zero), Volta (Bolt Dash / Thunderclap with a telegraphed wind-up), Bram (Bedrock / Monolith wall).
- **Power pucks:** fire, ice, lightning, gravity. Orbs spawn in contested spots and the power belongs to the puck.
- **Arena twists:** speed lanes (semifinal), cracked ice (final).
- **RPG:** EXP and levels, stat points, perk choices at levels 3/5/7, gear with tradeoffs, training, a 5-stage tournament with dialogue, seasons and exhibitions. Progress saves in the browser.
- **Feel:** reactive pixel crowd, flickering arena lamps, goal lamp, slow-mo goals, confetti, ice scratches that build up, snow, screen shake, synthesized chiptune music and SFX.
- **Chemistry combos:** each pair (Nix+Volta, Nix+Bram, Volta+Bram) levels up chemistry from passes, assists and combo goals. From level 1, a pass between the pair followed by a quick shot fires their combo: Frostbolt, Avalanche or Thunderquake. Consecutive passes build a pass chain that adds shot power. Rivals have chemistry too.
- **Penalties and power plays:** hitting a skater away from the puck can draw interference, and very hard hits can draw charging or boarding. The player sits 15 seconds in the box, the faceoff moves to the offender's end, and a power-play goal ends it early. Power-play goals and penalty kills pay bonus coins.
- **Pull the goalie:** trailing when the other team needs one more goal, swap Halla for an extra attacker. The AI does it too, so watch for empty nets.
- **League and playoffs:** a 6-team round robin (5 rounds). Your games are real and the rest are simulated, with a standings table and the top 4 into semifinals and a Cup Final. Seasons repeat with tougher rivals.
- **Game plans:** before each league match pick Balanced, Forecheck, Trap or Run-and-gun. They change how both teams' AI plays, and Forecheck beats Run-and-gun, which beats Trap, which beats Forecheck. Rivals have a usual style (scouting report shown) and the Royals counter whatever you used on them last time.
- **Locker-room moments:** short scenes between league matches (tough losses, hat tricks, win streaks, playoff nerves, trash talk, scouting, Bram's stew and more). Each choice gives chemistry, EXP, coins or a buff for the next match.
- **Training rink:** four mini-games with bronze, silver and gold medals: Cone Weave (skating time trial), Sniper (hit targets off feeds), Keep-Away (pass chains against chasers) and Breakaway (5 tries on a goalie). They give EXP to the skater you bring, with 2 rewarded sessions between matches and unlimited practice.
- **Shootout:** five penalty shots each way against any rival. You shoot, then you play goalie, then sudden death.
- **Rivalries:** head-to-head records per rival. Captains bring up past scores, streaks and who lit them up, and the bracket shows the record.
- **Challenges:** exhibition modifiers (One-timers only, Giant goalies, Ice age, Lightning round, Heavy hitters, Next goal wins) with coin multipliers.
- **Local versus:** two players on one keyboard or with gamepads, plus gamepad rumble on hits, goals, combos and ultimates.
- **Accessibility and comfort (Settings):** aim assist (off/normal/strong), auto-sprint, relaxed game speed, screen shake strength, flashes off, reduced effects, colorblind-friendly team markers (blue triangles vs orange diamonds), large text, bigger touch buttons and a left-handed touch layout.
- **Goal clips:** every instant replay is recorded as a short video with game sound and a caption. The results screen lists the match's highlights with Share (phones) and Save.
- **Achievements:** 28 trophies (hat tricks, comebacks, every combo and power puck, empty-netters, shorthanded goals, the cup, a perfect season, gold in every drill and more), each paying coins, shown in the Trophies tab.
- **Broadcast:** instant goal replays (skippable, toggle in Settings), play-by-play commentary ticker, ultimate cut-ins, crowd chants that speed up the cheered team's ultimates, a team logo at centre ice.
- **Rivals with their own cast:** each of the five rivals has its own three skaters and goalie (on-ice sprites, portraits, cut-in banners), drawn in coral/violet and recoloured into the team's colours at runtime, plus its own crest. Captains change expression through the pre- and post-match talk, and so do Nix, Volta, Bram and Halla.
- **Arenas:** the Ember Comets host you in the Ember Dome, the Aurora Royals in the Aurora Palace and the Pinewood Lynx on Pine Pond (outdoors, no lamps), each with the host crest at centre ice and a crowd mostly in their colours. Quick play lets you pick the arena.
- **Crowd:** sprite fans in the far stands sit and cheer with the action (the near stands keep the back-of-head fans).
- **Cut-ins:** ultimates and combos slide in the shooter's banner art; a goalie who stops an ultimate or combo gets a "DENIED!" banner.
- **Signature celebrations:** Nix plants an ice spike, Volta strikes a lightning pose, Bram hoists his stick.
- **Hub:** the locker room fills the menus, with Coach Brekka (Training), Gearsmith Ottar (Shop) and announcer Kip Vance (League) chiming in.
- **Animation:** 8-way skating, a 4-frame side stride with glide and hockey stop (with an ice spray), stagger and knockdown on big hits, and side-on goalie poses: shuffles, butterfly, glove and blocker saves, dives, covering the puck and getting up. A red goal light behind each net spins on goals.
- **Nets** are drawn in code as pixel art to fit the side-on camera, with the puck sitting inside the mesh and a ripple on goals. [`reference/net-reference.png`](reference/net-reference.png) shows the exact shapes for a sprite version.

## Project layout

```
index.html            page shell
src/main.js           boot, loop, scene flow, audio hookup
src/match.js          rules, puck physics, possession, shots, saves, goals, power pucks, chemistry
src/drills.js         training mini-games and the shootout (drill controllers)
src/rivals.js         head-to-head records and rivalry dialogue
src/league.js         schedule, simulated games, standings, playoffs
src/lockerroom.js     locker-room moments and next-match buffs
src/replay.js         instant goal replays
src/clips.js          records replays as shareable video clips
src/achievements.js   achievements and the trophy case
src/commentary.js     play-by-play ticker
src/net.js            pixel-art nets drawn for the side-on camera
src/entities.js       Skater, Goalie, Puck, Barrier
src/ai.js             team AI (rivals and your teammates)
src/abilities.js      skills and ultimates
src/rink.js           rink geometry measured from the backdrop art
src/render.js         canvas renderer and camera
src/fx.js             particles, effects, crowd, shake/slow-mo
src/audio.js          WebAudio music and SFX
src/ui.js, hud.js     menus, hub, dialogue, results, in-match HUD
src/data.js           characters, gear, teams, tournament, dialogue
src/progress.js       save data, rewards, levelling
assets/gfx/           atlases built from the sprite pack
tools/                asset builder, dev server, balance sim, control tests
```

## Tools

```bash
python3 -m venv ../.venv && ../.venv/bin/pip install pillow numpy   # once
../.venv/bin/python tools/build_assets.py ../assets/Glacial-Strikers-Expansion-v2 assets/gfx
```
Rebuilds the atlases from the complete v2 sprite pack (v1, P1 gameplay and the rival/story/arena art in one atlas). Every character is rescaled to the v1 skaters' height, stray fragments from neighbouring cells are erased, and poses are mapped onto the game's names. Pages are split into `home`, `away` and one `rival_<team>` group per rival; rival pages, arenas, cut-in banners and the locker room load in the background after startup.

```bash
node tools/sim.mjs 20 0.6 0.6
```
Plays AI-vs-AI matches headless and prints goals, save percentage, match length and how often abilities are used. Use it after changing physics or AI numbers. Arguments: matches, team A difficulty, team B difficulty, chemistry level. Set `PLANS=trap,forecheck` to pit game plans against each other.

```bash
node tools/test_controls.mjs
```
Scripted checks of shooting, passing, one-timers, checking, switching, abilities, combos, pass chains, versus inputs and challenges.

```bash
node tools/test_drills.mjs 3
```
Bot playthroughs of every training drill and the shootout, used to check they finish and to set medal targets.

```bash
node tools/stuck.mjs 20
```
Finds AI-vs-AI matches that stall (a puck nobody can reach) and prints where it happened.

Set `window.__debugRink = true` in the browser console to draw the collision boundary and nets.
