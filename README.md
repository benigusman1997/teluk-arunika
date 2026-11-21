# TELUK ARUNIKA: 7 Hari Utang

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/c/gta6-01)

TELUK ARUNIKA: 7 Hari Utang — bank heist, 10 syndicate contracts in 3 acts, street races, full map, crew & career, police dispatch, ELANG-1 air unit, car theft, 5-weapon combat

Kota pelabuhan hujan tropis fiktif **Teluk Arunika**. **Raka**, sopir taksi yang berutang ke bos kriminal **Darma Wijaya**, punya **7 hari** untuk melunasi utang — kalau tidak, bengkel ayahnya disita.

## Yang baru di v3.7

- **Perampokan Bank Arunika (Misi 7, final Bab II)** — kontrak DARMA WIYAYA **$25.000**, 7 tahap: sampai di bank, lumpuhkan alarm, habisi 9 penjaga (counter PENJAGA x/9), bobol brankas, ambil uang, kabur, hilangkan jejak. Bangunan bank berkolom + tulisan BANK ARUNIKA, plaza, ruang brankas, van hitam getaway.
- **Title screen dengan save** — logo besar, BARU / LANJUTKAN (Hari X · Rp... · Misi x/10) / KONTROL / PENGATURAN, 3 slot save, latar kota hujan hidup, footer "Semua dibuat dengan kode: kota, mobil, orang, musik."
- **Tab CERITA + STATISTIK di peta penuh** — daftar 10 kontrak (bab + hadiah + DONE/NEXT/LOCKED) dan CAREER (uang, respect, distrik x/6, KOIN ARUNIKA x/12, LOMPATAN x/5, balapan, mobil dicuri, wanted tertinggi, safehouse).
- **12 Koin Arunika + 5 ramp lompatan** tersebar di 6 distrik.
- **Label insiden + bar heat di dispatch** — "DISPATCH POLISI — PERAMPOKAN BANK / PENEMBAKAN / PENCURIAN MOBIL" + TERLIHAT / KEHILANGAN JEJAK.
- **Weapon wheel 6 slot** — 1 Tinju ∞, 2 Pistol 12/48, 3 SMG 30/60, 4 Shotgun 6/18, 5 Rifle 10/30, 6 Pemburu (sniper) 5/15; tombol 1-6.
- **Nama bab + hadiah di banner misi & kartu intro** — "MISI 7 DARI 10 · BAB II — SINDIKAT · TAHAP 3/7" + "KONTRAK: DARMA WIYAYA — $25.000".

## Fitur (v3 — v3.6 tetap ada)

- **10 misi cerita dalam 3 bab** (Bab I Utang, Bab II Sindikat, Bab III Fajar), tiap misi 3-4 tahap dengan banner tahap + jarak objektif + NEXT; Misi 10 final di fajar hari ke-7 dengan pilihan akhir (tangkap Darma hidup-hidup atau biarkan kabur) + layar akhir "UTANG LUNAS".
- **Balapan jalanan** — 3 rute (Pelabuhan Sprint, Pasar Senja Circuit, Tol Layang Highway), checkpoint, timer + rekor BEST, mobil lawan AI.
- **Peta penuh bertab** (M) — PETA / CERITA / STATISTIK / KRU / PENGATURAN / KONTROL / SIMPAN, zoom + drag + klik pasang waypoint, legenda, standing 6 distrik termasuk **Pulau Abu** vulkanik (bara + asap kawah).
- **Kru** — Sari "Si Gesit" (Gaspol, Z), Budi "Montir" (Perbaiki Cepat, X), Agus "Si Pendiam" (Ghost, C); kartu kru di HUD + obrolan radio kru.
- **Karier** — 5 tingkat (Anak Baru → Legenda Arunika) dengan XP + perk, angka XP persis di HUD.
- **Polisi** — wanted 1-5: patroli jalan kaki, mobil patroli, roadblock, PIT + spike strip, ELANG-1 + kerucut sorot; panel dispatch (nama + taktik + jarak) + ticker radio polisi.
- **Carjacking** (tahan E), **ekspor mobil**, respray, side job taksi + antar paket, ekonomi + toko senjata/armor.
- **HUD + minimap hidup** — bintang wanted, uang, hari/jam + cuaca, HP/armor, kecepatan + nama mobil & kondisi, baris stasiun radio (ARUNIKA 98.4 — Dangdut Neon, HUJAN 101.2 — Lo-fi Hujan, KOTA 87.5 — Berita Kota).
- **Suara WebAudio sintetis offline** (mesin, tembakan, sirene, hujan) + radio 3 stasiun; semua art prosedural, tanpa network request.

## Kontrol

WASD jalan · E masuk/keluar/curi mobil · SHIFT lari · Mouse aim + klik tembak · 1-6 senjata · Tab weapon wheel · Z/X/C kemampuan kru · Q Ghost · R radio · M peta penuh · V panel kru · ESC jeda · F2 quick save di safehouse.

## Menjalankan

```sh
node serve.ts
# buka http://localhost:8080
```

Build dossier (seperti yang dijalankan grader):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Teknologi

Vanilla HTML/CSS/JS Canvas 2D top-down, tanpa CDN / tanpa network request. Three.js hanya dimuat sebagai vendor di `game/vendor/three.min.js`. Save: localStorage (3 slot + autosave). Screenshots: render asli dari kode game via headless Chromium (lihat `tools/shoot.mjs`).

## Lisensi

MIT — lihat `LICENSE`.
