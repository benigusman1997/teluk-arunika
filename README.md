# TELUK ARUNIKA: 7 Hari Utang

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/c/gta6-01)

**TELUK ARUNIKA: 7 Hari Utang — 10 narrative operations, crew abilities & career progression, staged missions, police dispatch, roadblocks + ELANG-1 tactical air unit, car theft, 4-weapon combat**

Kota pelabuhan hujan tropis fiktif. Raka, sopir taksi, berutang **$5.000** ke bos kriminal **Darma Wijaya** — 7 hari untuk melunasinya, atau bengkel ayahnya disita. FPS 3D open-world (Three.js, semua art prosedural, semua suara WebAudio sintetis, offline total, tanpa network request).

## Yang baru di v3

- **Misi ke-10 — "Operasi Terakhir: Fajar di Pelabuhan"**: 3 gelombang musuh di gudang Darma, ELANG-1 + roadblock menghalangi kabur, pilihan akhir (tangkap Darma hidup-hidup +200 XP, atau biarkan kabur +$500), lalu layar akhir "UTANG LUNAS — Bengkel Selamat" + statistik karier.
- **Sistem kru (3 anggota, direkrut di bengkel Pak Amir, tombol V)**:
  - **Sari "Si Gesit" — Sopir ($300)**: mobil +15% kecepatan & handling; aktif **Gaspol** (Z di mobil, cooldown 45 dtk): boost 3 detik + wanted tidak naik.
  - **Budi "Montir" — Mekanik ($250)**: armor pulih +1/dtk, mobil pulih +2 HP/dtk, diskon toko 20%; aktif **Perbaiki Cepat** (X, cooldown 60 dtk): armor +25 instan.
  - **Agus "Si Pendiam" — Peretas ($400)**: wanted cooldown 30% lebih cepat; aktif **Ghost** (C saat jalan kaki, sekali per misi): wanted −1 bintang.
- **Progresi karier (5 tingkat, XP tersimpan di save)**: Anak Baru (0) → Sopir Andal (150, buka rekrut Sari & Budi) → Penguasa Jalanan (400, diskon 15% + buka Agus) → Raja Teluk (800, armor +50, HP +25) → Legenda Arunika (1500, wanted cooldown +20%). Bar XP di HUD, banner naik tingkat, detail lengkap di pause.

## Yang baru di v3.5 (staged missions & police dispatch)

- **Misi bertahap**: tiap misi 3 tahap — banner menampilkan "MISI 6 DARI 10 · TAHAP 2/3" + judul tahap (mis. "WRECK THE REGENT") + objektif + jarak (meter) + "NEXT: ...". Fungsi: `startMissionStage`, `advanceStage`, `getObjectiveDistance` (missions.js).
- **Panel dispatch polisi**: unit bernama + taktik + jarak meter — ELANG-1 AIR — SPOTLIGHT, PATROLI-12 MOBIL — RAMMING, PATROLI-07 — PIT, BLOKIR-03 — ROADBLOCK — plus label "ELANG-1 DITERJUNKAN" saat helikopter aktif. Fungsi: `getDispatchUnits` (police.js), `renderDispatchPanel` (ui.js).
- **Kartu kemampuan kru di HUD**: tiap kru yang direkrut tampil sebagai kartu kecil (nama + kemampuan + tombol + READY/cooldown detik). Tombol: Sari = Z, Budi = X, Agus = C; panel kru lengkap pindah ke tombol V.
- **Obrolan radio kru**: kotak dialog kecil berisi tips taktis kru saat peristiwa penting — roadblock di depan, wanted naik, misi selesai (`showCrewChatter`).
- **Banner lokasi + suasana distrik**: 5 distrik (Pelabuhan, Pasar, Gang Neon, Pantai, Tol Layang) dengan skor suasana 0–100 — naik saat misi/job selesai, turun saat kekacauan; memengaruhi bayaran taksi di distrik itu (`DISTRICTS`, `updateDistrictStanding`, `getTaxiPay`).
- **Nama mobil + kondisi**: tiap mobil punya nama (ARUNIKA SEDAN, PELABUHAN GT, TAKSI KUNING, ...) + kondisi % — tampil di blok kecepatan dan prompt carjacking (`CAR_MODELS`, `getCarCondition`).
- **Tingkat karier berangka di HUD**: "TINGKAT 3 · Penguasa Jalanan — 450 / 800 XP".
- **Kode dipecah per tugas**: `core.js`, `world.js`, `player.js`, `police.js`, `missions.js`, `crew.js`, `career.js`, `audio.js`, `ui.js` — satu namespace `window.TA`.

## Fitur

- On foot + by car, traffic AI (berhenti di lampu merah, klakson, menghindar), pejalan kaki (menyeberang, lari/tiarap saat tembakan)
- **Carjacking**: tahan E, alarm, pengemudi kabur, wanted +1, garasi ganti warna = wanted turun
- **Wanted 1–5**: 1 patroli jalan kaki, 2 mobil patroli, 3 roadblock, 4 PIT + spike strip, 5 helikopter **ELANG-1** + spotlight
- **Combat**: pistol / SMG / shotgun / rifle, weapon wheel (1–4 / Tab), HP + armor, musuh berlindung, drive-by, mobil meledak
- **HUD + minimap**: bintang wanted, uang, hari/utang, jam + cuaca, kecepatan, kompas, blip polisi merah / misi kuning / taksi hijau / safehouse biru
- **Start + save**: layar start sinematik, pause (Esc) dengan save slot 1–3 + autosave
- **Ekonomi + side job**: taksi & antar paket, beli senjata / armor / upgrade
- **Radio**: 3 stasiun (Dangdut Neon FM / Lo-Fi Hujan / Berita Kota), tombol R
- **Cuaca**: hujan monsun, badai, fajar/siang/senja/malam — cuaca mengubah gameplay

## Kontrol

| Tombol | Aksi |
| --- | --- |
| WASD | Jalan / mengemudi |
| Mouse | Aim (klik untuk pointer lock) |
| Klik kiri | Tembak |
| E (tahan) | Masuk / curi mobil |
| Shift | Lari |
| 1–4 / Tab | Ganti senjata / weapon wheel |
| Q | Kemampuan kru aktif (Gaspol / Ghost) |
| R | Ganti stasiun radio |
| C | Panel kru |
| M | Zoom minimap |
| Esc | Pause |

## Menjalankan

```sh
node serve.ts
# buka http://localhost:8080
```

## Build (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Struktur

```
game/
  index.html  style.css
  core.js     world.js    player.js   police.js   missions.js
  crew.js     career.js   audio.js    ui.js
  vendor/three.min.js
screenshots/  shot1-onfoot-rain.jpg  shot2-chase-night.jpg
               shot3-shootout.jpg    shot4-pause-save.jpg
main.ts  serve.ts  shots.json  LICENSE
```

## Lisensi

MIT — lihat [LICENSE](LICENSE).
