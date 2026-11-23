# TELUK ARUNIKA: Seven Days of Debt

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/badge/gta6-01.svg)
[![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)
[![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)

An original 3D open-world crime game that runs in a desktop browser, offline, from static files.
Everything in it — the city, the vehicles, the people, the sounds and the story — is made in code. No third-party names, art or text.

## Story

Raka drives for Pak Amir's taxi workshop in the equatorial port city of Teluk Arunika. His family owes the Naga Laut
syndicate **$50,000**, due in **seven days**. Ten contracts in three acts take him from borrowing a stranger's sedan in
Pasar Senja, through a dock raid, a flyover race and a jammer run against the police helicopter, to the Bank Arunika job,
a choice at the pier, and a last morning at the port. The ending depends on what he has paid when the week is over.

## Features

- **Open city in real 3D** (Three.js r160, WebGL): six districts — Pelabuhan, Pasar Senja, Gang Neon, Pantai, Tol Layang, Pulau Abu — with a coast boulevard, port cranes, a cargo ship, a market, towers, a flyover, a red cable-stayed bridge and a volcano island, under a golden-hour sky.
- **On foot and by car**: walk, sprint, jump, aim; steal any of nine vehicle types (sedan, GT coupe, taxi, hauler, minibus, scooter, police cruiser, SWAT van, getaway van) with a carjack sequence; arcade driving with handbrake drift, collisions, damage, flat tyres and wrecks.
- **Living streets**: lane-following traffic that obeys traffic lights, honks and flees; pedestrians who walk, cross, panic and dive away.
- **Five-star wanted system**: TAPD cruisers with roles (interceptor, rammer, PIT unit), roadblocks with spike strips, the helicopter ELANG-1 with a searchlight, the armoured van BADAK-2 with a SWAT team; escape by breaking line of sight, or respray.
- **Story**: ten staged contracts in three acts with dialogue cutscenes, a branch and an ending; a seven-day debt clock.
- **Combat**: six weapons, ammo, tracers, hit markers, enemies that use cover, health and armour.
- **Crew**: Sari (scramble police radio), Bima (cover fire), Tono (field repair), each with a cooldown.
- **Side activities**: street races, taxi fares, wreck contracts, 30 Arunika coins, the gun shop Kelo Arms, a respray garage, rain mode.
- **Career**: rank points, five ranks with perks, district standing, statistics.
- **Interface**: mission card, dispatch card, wanted stars, money and debt, crew cards, speed card, rotating minimap, full tabbed map, weapon wheel, tutorial hints, title screen with three save slots plus autosave (localStorage), pause, settings and controls screens.
- **Sound**: WebAudio synthesis only — engine, sirens, guns, crashes and three radio stations.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | move, drive |
| Mouse | look; left button fire, right button aim |
| Shift / Space | sprint / jump (on foot), handbrake (in a car) |
| E | steal, enter or exit a car |
| Q, 1–6 | weapon wheel, pick weapon |
| Z, X, C | crew abilities (on foot C; in a car hold C to look back) |
| V / R | camera mode / radio station |
| G / T / H / B / L | street race / taxi fare / wreck contract / shop / rain |
| M / Esc | city map / pause |

## How to run

- Play: open `game/index.html` in a desktop browser (no server and no network needed).
- Build the entry: `node main.ts` (Node 22). It copies `game/` and `screenshots/` into `MAKEFUN_OUTPUT_DIR` (default `./out` beside `main.ts`) and writes `dossier.json` with the bounty's own library in `vendor/makefun-game.ts`.
- Self-test: `PW_MODULES=... CHROME_BIN=... node tools/selftest.mjs` loads the game headless, walks, carjacks, drives, raises five stars, opens a contract, saves and pauses, and fails on any page error or network request.
- Screenshots: `PW_MODULES=/path/to/node_modules CHROME_BIN=/path/to/chrome node tools/shoot.mjs` opens `game/index.html?shot=1..4`; each number stages a showcase scene from the game's real systems and the tool saves the canvas and HUD as shown.

## Files

- `game/index.html`, `game/style.css` — the page and the HUD/menu styles.
- `game/js/` — thirty single-duty classic scripts sharing one namespace: `open-world-city`, `traffic-ai`, `pedestrian-ai`, `player-onfoot`, `car-theft`, `vehicle-driving`, `police-wanted`, `police-roadblocks`, `police-airswat`, `story-missions`, `story-dialogue`, `weapons-combat`, `side-activities`, `crew-abilities`, `career-progress`, `save-slots`, `hud-panels`, `hud-minimap`, `menu-screens`, `tutorial-hints`, `render-scene`, `camera-rigs`, `mesh-factory`, `visual-effects`, `audio-radio`, `input-controls`, `game-config`, `game-state`, `showcase-scenes`, `game-main`.
- `game/vendor/three.min.js` — Three.js r160 (MIT), vendored.
- `screenshots/` — `shot1-coast-chase.jpg`, `shot2-market-carjack.jpg`, `shot3-bank-shootout.jpg`, `shot4-title-saves.jpg`.
- `main.ts`, `tools/shoot.mjs`, `tools/selftest.mjs`, `vendor/makefun-game.ts`.

## Licence

MIT — see `LICENSE`. Three.js is MIT-licensed by its authors.
