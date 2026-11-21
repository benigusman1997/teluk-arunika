# TELUK ARUNIKA: 7 Hari Utang

[![Teluk Arunika](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/rank.svg)](https://make.fun/competitions/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/benigusman1997/teluk-arunika/reward.svg)](https://make.fun/competitions/gta6-01)

**TELUK ARUNIKA: 7 Hari Utang — SWAT tactical response, wreck-target contracts, bank heist, 10 syndicate contracts in 3 acts, street races, full map, crew & career, ELANG-1, car theft, 5-weapon combat**

Kota pelabuhan hujan tropis fiktif **Teluk Arunika**. Raka, sopir taksi yang
berutang ke bos kriminal Darma Wijaya, punya **7 hari** untuk melunasi utang —
kalau tidak, bengkel ayahnya disita.

## Yang baru di v3.8

- **SWAT ARUNIKA** — satuan taktis elite saat wanted ≥4: SWAT VAN lapis baja +
  4 petugas taktis berompi gelap + 1 penembak jitu. Mengepung dari dua sisi,
  merangsek saat pemain terpojok, penembak jitu menembak dari jauh. Baris
  dispatch sendiri (`SWAT-01 — PENGEPUNGAN`, `SWAT-02 — PENEMBAK JITU`) +
  banner `SWAT ARUNIKA DITERJUNKAN`.
- **Kontrak Hancur** — side job wreck-the-target: hancurkan mobil bernama
  sebelum sampai di tujuannya. 3 target: KOMET MERAH (→ Pelabuhan),
  HARIMAU SEDAN (→ Tol Layang), SRIKANDI GT (→ Pulau Abu). Bar HP target +
  jarak ke destinasi di HUD, rute merah di minimap, hadiah $800–$1.500 + 60 XP.
- **Peran taktis bernama** di setiap baris dispatch: PENEMBAK JITU,
  PENGAWAS PANTAI, RAMMING, PENGEPUNGAN, PIT, ROADBLOCK, SPOTLIGHT, BOX IN.
- **Bar HEALTH + ARMOUR** kiri bawah, terlihat jelas beserta angka.

## Fitur

- **10 operasi naratif dalam 3 bab** (Utang / Sindikat / Fajar), tiap misi 3–4
  tahap (Misi 6 & 10: 4 tahap; Misi 7 **Perampokan Bank Arunika**: 7 tahap,
  kontrak DARMA WIYAYA $25.000, 9 penjaga bank, brankas, van getaway).
- **Balapan liar**: 3 rute (Pelabuhan Sprint, Pasar Senja Circuit,
  Tol Layang Highway), timer + rekor BEST, mobil lawan AI.
- **Peta layar penuh** (M): tab PETA / CERITA / STATISTIK / KRU / PENGATURAN /
  KONTROL / SIMPAN, legenda, standing 6 distrik, waypoint, SAVE GAME.
- **Kru + karier**: Sari (sopir), Budi (montir), Agus (peretas) — kemampuan
  aktif Z/X/C + kartu kru + obrolan radio; 5 tingkat karier dengan XP.
- **Polisi**: wanted 1–5, dispatch bernama + taktik + jarak, roadblock,
  spike strip, PIT, ELANG-1 + kerucut sorot, label insiden + bar heat.
- **Dunia**: 6 distrik termasuk Pulau Abu vulkanik, 12 Koin Arunika,
  5 ramp lompatan, lalu lintas AI, pejalan kaki, hujan + refleksi basah.
- **Combat**: 6 slot senjata (Tinju, Pistol, SMG, Shotgun, Rifle, Pemburu
  sniper) + amunisi, drive-by, carjacking (tahan E), respray, ekspor mobil.
- **Audio**: WebAudio sintetis offline + radio 3 stasiun
  (ARUNIKA 98.4 — Dangdut Neon, HUJAN 101.2 — Lo-fi Hujan,
  KOTA 87.5 — Berita Kota).
- **Save**: 3 slot + autosave (localStorage), title screen dengan LANJUTKAN.

## Main

Buka `game/index.html` langsung, atau jalankan `node serve.ts` lalu buka
http://127.0.0.1:8080/.

Kontrol: WASD jalan · E masuk/curi mobil · Shift lari · Mouse aim + klik
tembak · 1–6 senjata · R radio · M peta · V kru · Z/X/C kemampuan kru ·
Esc jeda.

## Teknologi

Vanilla HTML/CSS/JS Canvas 2D top-down, tanpa CDN / tanpa network request.
Semua art prosedural, semua suara WebAudio sintetis. Three.js dimuat dari
`game/vendor/three.min.js` (vendored).
