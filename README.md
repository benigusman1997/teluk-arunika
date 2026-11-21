# TELUK ARUNIKA: 7 Hari Utang

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**TELUK ARUNIKA: 7 Hari Utang — 10 syndicate contracts in 3 acts, street races & full map, crew abilities & career progression, staged missions, police dispatch, roadblocks + ELANG-1 tactical air unit, car theft, 4-weapon combat**

A rain-soaked open-world crime game in the spirit of GTA 6. Raka, a taxi
driver in the fictional tropical port city of Teluk Arunika, owes $5,000 to
crime boss Darma Wijaya. Seven days to pay it back — or his father's garage
gets seized.

## What's in v3.6

- **10 narrative operations in 3 acts** — Bab I Utang (Misi 1-3), Bab II
  Sindikat (Misi 4-7), Bab III Fajar (Misi 8-10). Every mission is a
  **syndicate contract** (Darma Wijaya, Geng Kerono, Kelo Arms) with a cash
  reward shown in the mission banner. Missions 6, 8 and 10 have 4 stages;
  the banner shows mission / act / stage / objective / distance / NEXT.
- **Street races** — 3 routes (Pelabuhan Sprint, Pasar Senja Circuit,
  Tol Layang Highway) with entry fee, prize, rival AI cars, sequential
  checkpoints, running timer and best time. Races 2-3 unlock by career rank.
- **Full-screen tabbed map** (M) — PETA / CERITA / STATISTIK / KRU /
  PENGATURAN / KONTROL / SIMPAN, legend, district standing, current
  mission panel, click-to-place waypoint with route + distance, SAVE GAME.
- **Pulau Abu** — a 6th, volcanic district across the bridge from the
  port: ash ground, ember glow, lava rocks, crater smoke, orange dusk sky.
  Mission 8 plays there; one race finishes on its bridge.
- **Car export side job** — steal a named target car and deliver it to the
  port exporter for big money. Respray at the garage drops your wanted.
- **Weapon wheel with ammo counts** (Tab / 1-5) — .38 12/48, SMG 30/60,
  Shotgun 6/18, Rifle 10/30, Fists ∞. Ammo is bought at the gun shop.
- **Police radio ticker** under the named dispatch panel, **foot patrol
  units** at low wanted, and a **visible ELANG-1 searchlight cone**
  sweeping the ground at wanted 5.
- **Crew abilities** — Sari "Si Gesit" (Gaspol boost, Z), Budi "Montir"
  (quick-repair +25 armor, X), Agus "Si Pendiam" (Ghost, wanted -1, C).
  Crew cards with keybinds + cooldowns on the HUD, radio chatter toasts.
- **Career progression** — 5 ranks (Anak Baru → Legenda Arunika) with XP,
  perks, and the exact XP numbers on the HUD.
- **The city** — 60+ buildings, port cranes + containers, market stalls,
  neon alley, beach, elevated toll road, traffic that stops at red lights
  and honks, pedestrians who flee gunfire, day/night + rain/storm with wet
  reflective asphalt.
- **Systems** — wanted 1-5 with escalating tactics (foot patrol, patrol
  cars, roadblock, PIT + spike strip, ELANG-1 helicopter), carjacking
  (hold E, alarm, driver flees), drive-by shooting, 3 radio stations
  (R), 3 save slots + autosave, synthetic WebAudio sound (engine,
  gunshots, sirens, rain) — fully offline, no network requests.

## Play

Serve it and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# http://localhost:8080/
```

WASD walk / drive · E enter & steal cars · Shift run · Mouse + click shoot ·
1-5 weapons · Tab weapon wheel · R radio · M map · V crew · Z / X / C crew
abilities · Esc pause.

## Tech

Vanilla HTML/CSS/JS + Three.js (vendored locally in `game/vendor/`).
All art procedural, all sound synthesized WebAudio. No CDN, no network.

`main.ts` (Node 22) copies `game/` + `screenshots/` to `/output` and writes
`/output/dossier.json` with the kit's `vendor/makefun-game.ts`.

Built for make.fun's **Make GTA 6** bounty (gta6-01).
