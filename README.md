# TELUK ARUNIKA: Seven Days of Debt

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01) [![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/bounty/gta6-01) [![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/bounty/gta6-01)

## Pitch

Raka Pratama is a taxi driver in the sun-soaked port city of Teluk
Arunika. His father Pak Amir borrowed $5,000 from the Naga Laut
syndicate, and under Darma Wijaya's interest the debt has grown to
$50,000. Raka has **seven days** to clear it, or the family workshop
is taken. One week, one bay, and every car is yours to take: steal,
race, rob and run, while the TAPD dispatch closes in with cruisers,
roadblocks, a helicopter and a SWAT van.

## Features

### Complete open world (shown in the screenshots)

- A 900 m square port city in six districts: Pelabuhan harbour,
  Pasar Senja night market, Gang Neon towers, Pantai beach and
  boulevard, the Tol Layang flyover, and Pulau Abu with its smoking
  volcano, reached over the red cable-stayed Jembatan Merah.
- City on foot and by car, live traffic on a lane network with
  traffic lights, 55 pedestrians on sidewalks and zebra crossings.
- Wanted level with police responding: foot patrols, cruisers with
  PIT, ramming, flanking and box-in tactics, roadblocks, spike
  strips, the ELANG-1 helicopter with a searchlight, and the BADAK-2
  SWAT van with breach officers and a rooftop sniper.
- Missions: 10 staged contracts in 3 acts, including the Bank
  Arnika job with nine guards, a 45-second vault crack and a
  getaway van.

### Depth

- Story with a branch choice (pay Darma or wear the wire) and two
  ending texts; 12 vehicles to steal and drive, 6 weapons, crew
  abilities (Sari's Gaspol, Budi's Quick Fix, Agus's Ghost).
- Street races with rivals, taxi fares, wreck contracts, export
  lists, 12 Arunika coins, stunt ramps, shops, a garage with
  upgrades, a phone with messages, contacts, jobs, bank and map,
  and three save slots plus autosave.

### Feel and polish

- Chase, hood, look-back and on-foot cameras with speed pull-back
  and look-around yaw; HUD with mission and dispatch cards, wanted
  stars, money, rank bar, weapon tiles, crew cards, minimap with
  route, health and armour bars, chatter and dialogue, radio line
  and a big speed readout; day-night cycle, tropical rain, sea,
  clouds and a golden-hour sun.
- All sound is synthesised WebAudio: four radio stations, engine,
  siren, gunshots, explosions, horn and alarms.

### Sun-soaked original look

- Pastel facades, striped market umbrellas, palms along Pantai
  Boulevard, turquoise sea and a low sun over the water; every name
  in the game is original.

### Structure

- 32 single-duty classic script files in importance order, each
  opening with its most telling functions; a small recursive
  TypeScript builder (`main.ts`) that copies the game and writes
  the judge's dossier.

## Controls

| Key | Action |
| --- | ------ |
| W A S D | Move / drive |
| Shift | Sprint |
| Space | Jump / handbrake |
| Mouse | Look / aim, left button fire |
| R | Reload |
| Q / Tab | Weapon wheel, 1-6 select |
| E | Enter, exit, steal (hold), interact |
| V | Camera |
| M | Map |
| P | Phone |
| N | Next radio station |
| H | Horn |
| Z X C | Crew abilities |
| F5 | Quick save |
| Esc | Pause |

## Run it

Serve the folder with any static file server (for example
`python3 -m http.server` inside the repository, then open
`http://localhost:8000/game/index.html`), or open
`game/index.html` directly from disk — the game fetches nothing.

## Screenshots

- `screenshots/shot1-coast-chase.jpg` — the cover: four-star coast
  chase on Pantai Boulevard (`?shot=1`).
- `screenshots/shot2-market-carjack.jpg` — stealing a sedan in
  Pasar Senja (`?shot=2`).
- `screenshots/shot3-bank-shootout.jpg` — the Bank Arnika job,
  stage 3 (`?shot=3`).
- `screenshots/shot4-title-saves.jpg` — the title screen over the
  live bay (`?shot=4`).

## File map

- `main.ts` — the entry builder (copies `game/` and `screenshots/`,
  writes `dossier.json`).
- `game/index.html` — canvas, HUD root and the 32 scripts in order.
- `game/style.css` — HUD and menu styling.
- `game/js/open-world-city.js` — districts, roads, coast, port,
  flyover, bridge, island.
- `game/js/traffic-ai.js` — traffic cars, lights, honking, panic.
- `game/js/pedestrian-ai.js` — walkers, crossings, panic.
- `game/js/police-wanted.js` — stars, heat, dispatch units.
- `game/js/police-pursuit-tactics.js` — PIT, ram, flank, box-in,
  roadblocks, spikes.
- `game/js/police-airswat.js` — helicopter, SWAT van, sniper.
- `game/js/story-missions.js` — the ten contracts.
- `game/js/heist-bank-job.js` — the Bank Arnika job.
- `game/js/car-theft.js` — hold-E stealing, alarms.
- `game/js/vehicle-driving.js` — arcade driving and damage.
- `game/js/player-onfoot.js` — walking, aiming, damage, respawn.
- `game/js/weapons-combat.js` — six weapons, enemies, cover AI.
- `game/js/street-races.js` — three routes and rivals.
- `game/js/side-activities.js` — taxi, wrecks, export, coins, stunts.
- `game/js/crew-abilities.js` — hire and use the crew.
- `game/js/economy-shops-garage.js` — shops, debt, garage upgrades.
- `game/js/phone-contacts.js` — phone tabs and calls.
- `game/js/career-progress.js` — ranks, standing, debt day, stats.
- `game/js/story-dialogue.js` — characters, cutscenes, portraits.
- `game/js/tutorial-hints.js` — ten first-minute hint cards.
- `game/js/save-slots.js` — three slots plus autosave.
- `game/js/hud-panels.js` — all HUD cards.
- `game/js/hud-minimap.js` — minimap and full city map.
- `game/js/menu-screens.js` — title, pause, map, settings.
- `game/js/camera-rigs.js` — chase, hood, look-back, on-foot.
- `game/js/radio-stations.js` — four stations and sound effects.
- `game/js/sky-daynight-weather.js` — sky, sun, sea, weather.
- `game/js/visual-effects.js` — explosions, smoke, tracers, beacons.
- `game/js/input-controls.js` — keyboard, mouse, pointer lock.
- `game/js/mesh-factory.js` — cars, cruisers, helicopter, people.
- `game/js/showcase-scenes.js` — the four screenshot scenes.
- `game/js/game-main.js` — state, loop, launch modes.
- `tools/shoot.mjs` — headless screenshot capture.
- `tools/selftest.mjs` — static checks plus a browser run.

Everything is original and made in code — no assets, names or music
from any commercial game.

Licence: MIT — see `LICENSE`.
