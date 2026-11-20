# teluk-arunika
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Teluk Arunika: 7 Hari Utang** — a first-person 3D open-world crime game set in a
fictional rain-soaked tropical port city. You are Raka, a taxi driver who owes
crime boss Darma Wijaya $5,000. Seven days to pay it back, or your father's
workshop gets seized.

Drive through monsoon rain and neon nights, jack cars (hold E — the alarm
brings the police), outrun a five-star wanted system that escalates from foot
patrols to patrol cars, roadblocks, spike strips and the police helicopter
**ELANG-1** with its sweeping spotlight. Fight with four weapons (pistol, SMG,
shotgun, rifle) against enemies who take cover behind shipping containers at
the dusk-orange port. Take taxi fares and parcel jobs to earn cash, buy armor
and guns from Pak Amir's shop, save in three slots (plus autosave), and on day
five choose: pay Darma $500 — or betray him.

Everything is procedural and offline: low-poly city built in Three.js, rain and
day/night cycle with wet reflective roads, synthesized WebAudio radio across
three stations, and a live minimap tracking police, missions, your taxi and
the safehouse. No network requests, keyboard + mouse.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080

Controls: WASD move · mouse look · E enter / jack car (hold) · click shoot ·
1–4 weapons · Q weapon wheel · R radio · Shift run · P pause · M minimap zoom.

## Features

- **9 story missions** across the 7-day debt countdown, including the
  day-5 branch (pay Darma or betray him) and the 17:30 dusk port mission.
- **5-star wanted system**: foot patrol → patrol cars → roadblocks → PIT +
  spike strips → helicopter ELANG-1 with a visible searchlight cone.
- **Real carjacking**: hold E, the alarm sounds, the driver flees on foot.
- **Living city**: traffic that stops at lights, pedestrians who cross the
  street and flee gunfire, exploding cars, taxi fares and parcel deliveries.
- **Full HUD**: live minimap, compass, wanted stars, money, HP/armor,
  clock + weather, speedometer, and three synthesized radio stations.

## Shots

`shots.json` describes the four staged scenes (rainy carjacking, night chase
under ELANG-1, dusk port shootout, pause/save screen). Regenerate them with:

```sh
node tools/shoot.mjs
```

Entered on [make.fun](https://make.fun/?ref=9s0rhqbz&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
