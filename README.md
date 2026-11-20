# TELUK ARUNIKA: 7 Hari Utang — FPS 3D

Rain-soaked first-person open-world crime game for make.fun bounty **gta6-01** —
build the most complete open-world crime game you can, playable offline in a
desktop browser. Three.js r160 vendored locally (`game/vendor/three.min.js`,
official release); all art procedural (canvas textures + low-poly 3D), all
sound synthesized WebAudio. No network requests at runtime.

Raka, a taxi driver, owes crime boss Darma Wijaya. **7 days** to pay the debt,
or his father's workshop is seized. A fictional tropical port city — monsoon
rain, wet neon streets, harbour, market, narrow alleys. Original characters
and story only — nothing from Rockstar.

## How to play

Open `game/index.html` in a desktop browser (Chrome recommended), or serve
`game/` with `node serve.ts` and open http://localhost:8080. No server needed.

- **Click** the game to lock the mouse (mouse look) · **WASD** walk/drive ·
  **Shift** run · **E** enter car / hold E to carjack · **Click** shoot ·
  **1/2/3** pistol / SMG / shotgun, **Q** weapon wheel · **R** radio (3 stations) ·
  **T** taxi side job · **Y** parcel delivery side job · **P / Esc** pause & save ·
  **M** minimap zoom

## Features

- First-person on foot + first-person driving (hood cam, headlights, speedometer);
  rain makes handling slippery
- 3D city: 60+ textured buildings with lit windows, neon signs, street lamps,
  traffic lights, wet reflective roads with puddles, day/night cycle, harbour
  with containers and cranes, sea
- Live traffic (cars stop at red lights, honk, avoid) + reactive pedestrians
  (cross streets, flee when shots are fired)
- Real carjacking: hold E to pull the driver out, alarm, wanted +1 instantly;
  repaint at the garage or hide at the safehouse to lose wanted
- Wanted 1–5 stars with escalating police: foot patrol, patrol cars, roadblocks,
  spike strips, Air One helicopter with spotlight; cool-down escape
- 7 story missions (one per day) with cutscene dialogue + day-5 branching
  mission (pay Darma $500 or betray him), taxi + parcel delivery side jobs,
  economy (buy ammo/armor at the weapon shop)
- Combat: weapon wheel, HP + armor, enemies using container cover, muzzle flash,
  tracers, exploding cars, enemy HP bars
- Live HUD + minimap (police blips, mission marker, taxi, safehouse), compass,
  clock + weather; rain + night change visibility and handling
- Start screen (New Game / Continue), pause with 3 save slots + autosave,
  "Saving..."

## Build / validate

```sh
node main.ts            # copies game/ + screenshots/ to /output, writes /output/dossier.json
node tools/shoot.mjs    # headless Chromium: runs ?test=1 self-test, takes 4 staged screenshots
```

## Screenshots

Real renders from the game (`?shot=1..4`, 1280x720 JPEG): `screenshots/shot1.jpg`
(FPS on-foot rain, carjacking), `screenshots/shot2.jpg` (night chase, roadblock +
Air One), `screenshots/shot3.jpg` (port shootout, weapon wheel + Darma dialogue),
`screenshots/shot4.jpg` (pause/save + taxi job).

## Known limitations

- Traffic and pedestrian AI is simple waypoint/avoidance steering, not a full
  traffic simulation; enemy AI advances and shoots from cover but does not
  flank or coordinate.
- Radio stations are synthesized WebAudio melodies with named tracks, not
  recorded music.
- The city is procedural low-poly with canvas textures; there are no
  licensed or photoreal assets.
