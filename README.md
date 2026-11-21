# TELUK ARUNIKA: 7 Hari Utang

[![GTA 6 Bounty](https://make.fun/api/competitions/gta6-01/badge)](https://make.fun/competitions/gta6-01)
[![Entry](https://make.fun/api/competitions/gta6-01/entry/teluk-arunika/badge)](https://make.fun/competitions/gta6-01)
[![Status](https://make.fun/api/competitions/gta6-01/status/badge)](https://make.fun/competitions/gta6-01)

**10 narrative operations, crew abilities & career progression, staged missions, police dispatch, roadblocks + ELANG-1 tactical air unit, car theft, 4-weapon combat.**

Raka, sopir taksi di kota pelabuhan hujan tropis **Teluk Arunika**, berutang $7.000 pada bos kriminal Darma Wijaya. Tujuh hari untuk melunasi — atau bengkel ayahnya disita. Sepuluh misi naratif, tiga kru yang bisa direkrut, lima tingkat karier, lima distrik dengan suasana yang berubah, dan polisi yang mengejar dengan roadblock, spike strip, manuver PIT, dan helikopter ELANG-1.

## Main

Buka `game/index.html` di desktop Chrome (offline total, tanpa network request) atau jalankan `node serve.ts` lalu buka http://localhost:8080.

## Kontrol

- **WASD** jalan / mengemudi · **Mouse** aim · **Klik** tembak
- **E** masuk / keluar / curi mobil (tahan E untuk carjacking)
- **1–4** senjata (Pistol / SMG / Shotgun / Rifle) · **Tab** weapon wheel
- **Z** Gaspol (Sari) · **X** Perbaiki Cepat (Budi) · **C** Ghost (Agus)
- **V** panel kru · **R** ganti stasiun radio · **M** zoom minimap · **Esc** jeda

## Fitur

- **10 misi naratif bertahap** — tiap misi 3 tahap ("MISI 6 DARI 10 · TAHAP 2/3" + objektif + jarak + NEXT), dialog cutscene, misi ke-5 bercabang (bayar Darma $500 atau khianati), Misi 10 "Operasi Terakhir: Fajar di Pelabuhan" + layar akhir.
- **Kru (3 anggota)** — Sari "Si Gesit" sopir ($300, Z Gaspol), Budi "Montir" ($250, X Perbaiki Cepat armor +25), Agus "Si Pendiam" peretas ($400, C Ghost wanted −1). Kartu kru di HUD + panel kru (V) + obrolan radio kru.
- **Karier (5 tingkat)** — Anak Baru → Sopir Andal → Penguasa Jalanan → Raja Teluk → Legenda Arunika, dengan XP berangka di HUD ("520 / 800 XP"), banner naik tingkat, detail di layar jeda.
- **Polisi wanted 1–5** — panel dispatch bernama + taktik + jarak (ELANG-1 AIR — SPOTLIGHT, PATROLI-12 — RAMMING, PATROLI-07 — PIT, BLOKIR-03 — ROADBLOCK), roadblock, spike strip, PIT, helikopter ELANG-1 dengan spotlight.
- **Kota hidup** — 60+ gedung, tol layang, pelabuhan + kontainer + crane, pasar, gang neon, pantai; traffic AI (berhenti di lampu merah, menghindar), pejalan kaki (menyeberang, lari saat tembakan); siklus siang/malam + hujan dengan refleksi basah.
- **Distrik (5)** — Pelabuhan, Pasar, Gang Neon, Pantai, Tol Layang; banner lokasi + suasana 0–100 yang berubah dengan aksimu.
- **Mobil bernama + kondisi** — ARUNIKA SEDAN, PELABUHAN GT, TAKSI KUNING, PASAR VAN, NEON COUPE, masing-masing dengan kondisi % yang turun saat tabrakan.
- **Ekonomi + side job** — taksi, antar paket, beli senjata/armor; save 3 slot + autosave (localStorage).
- **Radio 3 stasiun** (Dangdut Neon / Lo-Fi Hujan / Berita Kota) + suara WebAudio sintetis (mesin, tembakan, sirene, hujan) — semua offline.

## Struktur

```
game/index.html        halaman + HUD + tag script berurutan
game/style.css         semua gaya
game/core.js           boot, renderer, loop, state machine, save
game/world.js          kota, traffic, pejalan kaki, cuaca, distrik
game/player.js         jalan kaki, mengemudi, carjacking, senjata
game/police.js         wanted 1-5, roadblock, spike strip, ELANG-1, dispatch
game/missions.js       10 misi × 3 tahap, dialog, cabang, layar akhir
game/crew.js           3 kru, kemampuan Z/X/C, kartu kru, chatter
game/career.js         5 tingkat karier, XP, perk
game/audio.js          WebAudio sintetis + radio 3 stasiun
game/ui.js             HUD, minimap, menu, panel, banner
game/vendor/three.min.js  Three.js (vendored)
```

## Lisensi

MIT — lihat [LICENSE](LICENSE).
