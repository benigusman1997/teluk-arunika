[![Make.fun GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/gta6-01)

# TELUK ARUNIKA: 7 Hari Utang

**10 narrative operations, crew abilities & career progression, staged missions, police dispatch, roadblocks + ELANG-1 tactical air unit, car theft, 4-weapon combat** — game open-world kriminal 3D yang berjalan offline di browser desktop, tanpa network request.

Kota pelabuhan hujan tropis fiktif **Teluk Arunika** — bukan pantai cerah generik. Protagonis **Raka**, sopir taksi yang berutang ke bos kriminal **Darma Wijaya**. Hitung mundur **7 hari** untuk melunasi utang, kalau tidak, bengkel ayahnya disita. Hujan monsun, neon malam, pelabuhan, pasar, gang sempit, jalan tol layang. Siang hujan deras + malam neon basah (refleksi di aspal) — cuaca mengubah gameplay.

## Yang ada di dalam game

- **10 misi cerita bertahap** — tiap misi 3–4 tahap dengan banner `MISI 6 DARI 10 · TAHAP 2/3`, judul tahap, objektif, jarak meter, dan `NEXT`. Misi 5 bercabang (bayar Darma $500 atau khianati), Misi 10 final: tembak-menembak fajar di pelabuhan, 3 gelombang, pilihan akhir tangkap Darma (+200 XP) atau biarkan kabur (+$500), layar akhir + statistik karier.
- **Sistem kru** — Sari "Si Gesit" (sopir, Gaspol Z), Budi "Montir" (Perbaiki Cepat X), Agus "Si Pendiam" (Ghost C). Kemampuan pasif benar-benar mengubah gameplay; kartu kru di HUD dengan status READY/cooldown; panel kru (V); obrolan radio kru saat peristiwa penting.
- **Progresi karier** — 5 tingkat (Anak Baru → Sopir Andal → Penguasa Jalanan → Raja Teluk → Legenda Arunika), XP berangka di HUD (`TINGKAT 3 · Penguasa Jalanan — 450 / 800 XP`), banner naik tingkat, detail karier di layar pause.
- **Panel dispatch polisi** — unit aktif bernama + taktik + jarak: ELANG-1 AIR (spotlight), PATROLI-12 MOBIL (ramming), PATROLI-07 (PIT), BLOKIR-03 (roadblock)… Wanted 1–5: patroli jalan kaki, mobil patroli, roadblock, PIT + spike strip, helikopter ELANG-1 + spotlight.
- **Banner lokasi + suasana distrik** — 5 distrik (Pelabuhan, Pasar, Gang Neon, Pantai, Tol Layang) dengan skor suasana 0–100 yang memengaruhi bayaran taksi.
- **Nama mobil + kondisi** — ARUNIKA SEDAN, PELABUHAN GT, TAKSI KUNING, dst. + kondisi % (PRIMA/RUSAK/PARAH/HANCUR) di blok kecepatan.
- **On foot + by car** — jalan kaki, masuk/keluar mobil (E), carjacking (tahan E, alarm, wanted +1), garage ganti warna = wanted turun.
- **Traffic hidup** — mobil AI berhenti di lampu merah, klakson, menghindar; pejalan kaki menyeberang, lari saat tembakan.
- **Combat** — pistol / SMG / shotgun / rifle, weapon wheel (1–4), HP + armor, musuh berlindung di balik kontainer, drive-by, mobil meledak.
- **HUD + minimap** — minimap hidup (blip polisi merah, misi kuning, taksi hijau, safehouse biru), kompas, wanted stars, uang, HP/armor, jam + cuaca, kecepatan.
- **Start + save** — layar start sinematik (Continue / New Game), pause (Esc) dengan save slot 1–3 + autosave, indikator "Saving...".
- **Ekonomi + side job** — uang misi untuk senjata / perbaikan / armor; side job taksi (T) + antar paket (G).
- **Radio + suara** — 3 stasiun (dangdut-neon / lo-fi hujan / berita kota, tombol R); semua suara WebAudio sintetis offline.

## Cara main

```sh
node serve.ts        # lalu buka http://localhost:8080
```

WASD jalan · E masuk/curi mobil · Shift lari · Mouse aim + klik tembak · 1–4 senjata · Q kemampuan kru · Z/X/C kemampuan Sari/Budi/Agus · R radio · V panel kru · B toko · T taksi · G paket · Esc jeda · M zoom minimap.

## Teknologi

Vanilla HTML/CSS/JS + Three.js (divendor di `game/vendor/three.min.js`). Semua art prosedural, semua suara WebAudio sintetis, tanpa file eksternal, tanpa network request. Save di localStorage (3 slot + autosave). Screenshot staging deterministik via `?scene=1..4` (lihat `shots.json`).

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # menulis out/dossier.json
node tools/selftest.mjs                               # 128 assertion
node tools/shoot.mjs                                  # 4 screenshot 1280x720
```

## Lisensi

MIT — lihat [LICENSE](LICENSE).
