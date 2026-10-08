# Puckbound

3-on-3 arcade hockey RPG for phones and browsers. You run the Snowcrest Foxes (rename them in the club editor) through the Frostline league. Plain HTML5 canvas and ES modules, with no build step and no dependencies.

## Run it

```bash
cd glacial-strikers
python3 tools/serve.py 8080
```

Open http://localhost:8080 on this computer. To play on a phone on the same Wi‑Fi, open `http://<this-computer's-IP>:8080` (on a Mac, `ipconfig getifaddr en0` prints the IP). If macOS asks whether Python may accept incoming connections, allow it.

The game needs to be served over http; opening `index.html` straight from disk won't load the modules.

### Offline

- **Single file:** `node tools/build_offline.mjs` writes `dist/puckbound-offline.html`, one 3.8 MB file with everything embedded. Double-click it on any computer to play with no server or internet.
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
- **Feel:** reactive pixel crowd, flickering arena lamps, goal lamp, slow-mo goals, confetti, ice scratches that build up, snow, screen shake.
- **Soundtrack:** 13 SNES-style chiptune tracks played live by the game's own tracker engine (no audio files): the title theme, the locker room, a match theme for each arena (Frostline Faceoff, Ember Dome, Aurora Palace, the Pine Pond jig), the Cup Final, shootout, practice, awards night, story scenes, and victory and defeat. They share the Puckbound motif. When either side is a goal from winning, extra harmony and drum layers fade in. Jingles mark goals for and against, wins, losses, level-ups, signings, achievements, the daily challenge, award envelopes and the championship. Settings has music and sound volumes and a Music room to play any track.
- **Sound:** each arena has its own acoustics (a big echo in the Ember Dome and Aurora Palace, almost none outdoors on Pine Pond) and its own goal horn: Frostline's two-blast horn, a volcanic horn and flame burst, a royal fanfare with chimes, and cowbells with a hand-cranked siren. The visitors' goals get a siren instead. Sounds are panned to where they happen. The crowd murmurs and shouts, cheers its own team, groans or boos at the visitors, and chants. Glove catches, pad saves, poke checks, posts, glass rattles, nets and the shop register all have their own sounds, and every speaker in a dialogue has their own voice blip.
- **Chemistry combos:** each pair (Nix+Volta, Nix+Bram, Volta+Bram) levels up chemistry from passes, assists and combo goals. From level 1, a pass between the pair followed by a quick shot fires their combo: Frostbolt, Avalanche or Thunderquake. Consecutive passes build a pass chain that adds shot power. Rivals have chemistry too.
- **Penalties and power plays:** hitting a skater away from the puck can draw interference, and very hard hits can draw charging or boarding. The player sits 15 seconds in the box, the faceoff moves to the offender's end, and a power-play goal ends it early. Power-play goals and penalty kills pay bonus coins.
- **Pull the goalie:** trailing when the other team needs one more goal, swap Halla for an extra attacker. She skates off to the bench, and if you send her back mid-play she skates back to the crease, so the net is open for about a second. The AI pulls its goalie too, so watch for empty nets.
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
- **Recruitment:** beat a rival and their three skaters take your call (Team › Scouting). Signings cost coins, join a level below your line-up's average with points to spend and the perks they already had, and wear your club colours. A centre, a winger and a defender dress for each match; every position plays its kit (centres Nix's frost kit, wingers Volta's thunder kit, defenders Bram's stone kit), so a signing brings different stats and style, not new powers. Chemistry is between people, so a new signing has to build it before combos fire. The rival fills the slot with a newcomer and brings it up before your next game. Benched skaters can still train.
- **Rivals with their own cast:** each of the five rivals has its own three skaters and goalie (on-ice sprites, portraits, cut-in banners), drawn in coral/violet and recoloured into the team's colours at runtime, plus its own crest. Captains change expression through the pre- and post-match talk, and so do Nix, Volta, Bram and Halla.
- **Arenas:** the Ember Comets host you in the Ember Dome, the Aurora Royals in the Aurora Palace and the Pinewood Lynx on Pine Pond (outdoors, no lamps), each with the host crest at centre ice and a crowd mostly in their colours. Quick play lets you pick the arena.
- **Arena rules:** each building plays differently. Ember Dome: meltwater pools drift across the warm ice and bog down skaters and the puck. Aurora Palace: aurora lanes push skaters and the puck along their arrows and shift every 14 seconds, with the next lanes flickering in first. Pine Pond: big hits, slapshots, one-timers and shockwaves crack the pond, and the cracks spread as the game goes on. The Frostline rink keeps the old stage twists (speed lanes against the Ravens, both twists in a Cup Final there). The AI skirts slush and cracks; quick play can switch the rules off.
- **Crowd:** sprite fans fill the far stands and sit and cheer with the action; fans on the near benches are seen from behind, in beanies and scarves, and throw their arms up on goals.
- **Cut-ins:** ultimates and combos slide in the shooter's banner art; a goalie who stops an ultimate or combo gets a "DENIED!" banner.
- **Signature celebrations:** Nix plants an ice spike, Volta strikes a lightning pose, Bram hoists his stick.
- **Your club:** rename the team (name, nickname, 3-letter code) and pick its colours from eight presets or any trim and jersey colour (Team › Customise club, with a live preview). The name follows everywhere: hub, scoreboard, tables, results, awards, commentary, chants, rival trash talk and story dialogue. The colours go on everything that wears them: Nix, Volta, Bram, Halla, their portraits and cut-in banners, the crest, home fans, the arena banners, the Snow Fox and your signings. Our art's teal trim and cream jersey are recoloured inside our team's frames only, leaving skin, hair, outlines and effects alone.
- **Season awards:** every league season keeps a stat sheet for all 18 skaters and 6 goalies (real numbers from your games, believable ones from the simulated games, including newcomers in slots you signed away). When the season ends, Kip Vance hosts the Frostline Awards, opening one envelope at a time: League MVP, Golden Stick (goals), Playmaker (assists), Iron Wall (save %), Enforcer (hits) and Signing of the Year. Winners from your club earn coins and EXP and go into the award cabinet in Trophies; the League panel shows scoring leaders during the season and the winners after it.
- **Daily challenge:** one match a day, the same for everyone because it's seeded by the date: a rival, an arena with its rule, one or two challenge modifiers and a goal (win by 2, win in under 3 minutes, score a one-timer, win without a penalty, and so on). Beat it on consecutive days to build a streak; the reward grows from 120 to 300 coins. Start it from the Daily button in the hub.
- **Visible gear:** equipped gear shows on the ice. Each skate pair leaves its own trail and coloured skate marks (golden sparks for Bolt Runners, cyan frost for Hoarfrost Edges, dark gouges for Iron Boots, long blue lines for Long Track, carve spray for Pivot Pros). Special sticks glow where the puck is handled, crackle on the windup (sparks, frost, heat or a gravity swirl) and colour their shot trails. Protection shows when it works (stone shield flash, icy flash on blocks, golden sparkle on catches, visor glint). The shop and gear picker describe each look. Sticks, boots and blades are also recoloured on the sprites themselves in every pose, using the Batch M gear masks (`<sheet>_gearmask.png`: red stick, green boots, blue blades), for our skaters and signings alike.
- **Locker room hub:** the hub opens in the locker room. Click the lockers (Team), the shop counter (Shop), the stick rack (Training), the crystal chest (Trophies) or the benches (League); stations show what needs attention (points to spend, scouts calling, sessions left, the next opponent). The dressed line-up and Halla stand on the floor. Coach Brekka, Gearsmith Ottar and announcer Kip Vance chime in on their panels, which keep tabs and a back-to-the-room button.
- **Animation:** 8-way skating, a 4-frame side stride with glide and hockey stop (with an ice spray), stagger and knockdown on big hits, and side-on goalie poses: shuffles, butterfly, glove and blocker saves, dives, covering the puck and getting up. A red goal light behind each net spins on goals.
- **Goalie life:** every goalie (Halla and the five rivals) has front, back, skating and puck-handling art. They wave at the opening faceoff, tap their pads before each draw, and celebrate goals for (or hang their head after a loss) facing the camera. After a goal against they turn, fish the puck out of the net and drop their head. They look back over their shoulder when the puck goes behind the goal line, wind up and sweep a pass when clearing a held puck, stop loose pucks with the stick, and poke-check carriers who cut in close. Halla stands in the locker room facing the camera.
- **Nets** are the v3 side-view sprites, back and front layers around the goal mouth, with the puck inside the mesh and a bulge on goals (code-drawn nets remain as a fallback). A goalie in the goal mouth stands inside the net, behind the near post and side mesh; out of the crease they draw in front of it.
- **Arena dressing:** near glass drawn over skaters along the bottom boards, a hanging scoreboard with the live score and clock, team banners in the home rink's corners (the Foxes plus the visitors), and the Snow Fox mascot dancing on the near stairs when the Foxes score.

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
src/audio.js          sound effects, crowd, arena acoustics, music hookup
src/music.js          chiptune tracker engine and synthesized instruments
src/songs.js          the soundtrack and jingles
src/ui.js, hud.js     menus, hub, dialogue, results, in-match HUD
src/data.js           characters, gear, teams, tournament, dialogue
src/progress.js       save data, rewards, levelling
assets/gfx/           atlases built from the sprite pack
tools/                asset builder, dev server, balance sim, control tests
```

## Tools

```bash
python3 -m venv ../.venv && ../.venv/bin/pip install pillow numpy   # once
../.venv/bin/python tools/build_assets.py ../assets/Glacial-Strikers-Expansion-v2 assets/gfx ../assets/Glacial-Strikers-v3-Arena-Add-On ../assets/Glacial-Strikers-v4-Batch-A ../assets/Glacial-Strikers-Gear-Masks ../assets/Glacial-Strikers-v5-Goalies
```
Rebuilds the atlases from the complete v2 sprite pack (v1, P1 gameplay and the rival/story/arena art in one atlas) plus the v3 arena add-on (nets, near glass, scoreboard, banners, mascot) v4 Batch A (rival diagonals and hit reactions, Blaze and Horn expressions; merged by `tools/merge_batch_a.py`), gear masks when they exist, and v5 goalies (front, back, skating and puck handling for all seven goalie variants; merged by `tools/merge_goalies.py`). Every character is rescaled to the v1 skaters' height, stray fragments from neighbouring cells are erased, and poses are mapped onto the game's names. Pages are split into `home`, `away` and one `rival_<team>` group per rival; rival pages, arenas, cut-in banners and the locker room load in the background after startup.

```bash
node tools/test_music.mjs
```
Compiles every song and jingle, checks each bar's length, and lints the harmony (melody notes that clash with the chord on strong beats, notes outside the key). Run it after editing `src/songs.js`.

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
