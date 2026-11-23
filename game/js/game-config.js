// game-config.js — data tables only: districts, cars, weapons, crew, ranks, radio, dispatch roles, the ten contracts.
var TA = window.TA || (window.TA = {});
TA.CFG = {
  ROADS: [-400, -300, -200, -100, 0, 100, 200, 300, 400],
  DEBT: 50000, DAYS: 7, DAY_SECONDS: 420,
  PALETTE: [0xff8a70, 0x8fe3c4, 0x4fd0d6, 0xffc94a, 0xf06aa8, 0xfff3e0, 0xffa94d, 0x9ad0ff],
  DISTRICTS: [
    { id: 'pelabuhan', name: 'PELABUHAN', color: '#ffa94d', x: -350, z: 250 },
    { id: 'pasar', name: 'PASAR SENJA', color: '#f06aa8', x: -50, z: 200 },
    { id: 'neon', name: 'GANG NEON', color: '#4fd0d6', x: 0, z: -100 },
    { id: 'pantai', name: 'PANTAI', color: '#ffc94a', x: 150, z: 380 },
    { id: 'tol', name: 'TOL LAYANG', color: '#ff6b5b', x: 0, z: -330 },
    { id: 'pulau', name: 'PULAU ABU', color: '#b0a7a0', x: 720, z: -300 }
  ],
  CARS: {
    sedan: { name: 'ARUNIKA SEDAN', len: 4.5, w: 1.9, h: 1.35, cab: 0.5, cabz: -0.04, top: 150, acc: 16, grip: 1.0, colors: [0xd94f4f, 0x3f88c5, 0xf2f2f2, 0x44af69, 0x8a6fd1] },
    gt: { name: 'PELABUHAN GT', len: 4.4, w: 1.95, h: 1.15, cab: 0.4, cabz: -0.08, top: 210, acc: 24, grip: 1.15, colors: [0xff5a36, 0x16c2b0, 0xffd23f] },
    taxi: { name: 'TAKSI KUNING', len: 4.5, w: 1.9, h: 1.4, cab: 0.52, cabz: -0.03, top: 140, acc: 15, grip: 1.0, colors: [0xffcc1a], sign: 'TAKSI' },
    truck: { name: 'BANTENG HAULER', len: 7.2, w: 2.5, h: 2.6, cab: 0.22, cabz: 0.34, top: 105, acc: 9, grip: 0.8, colors: [0x4a78a8, 0xc96f3b], box: true },
    angkot: { name: 'ANGKOT MINI', len: 4.3, w: 1.8, h: 1.9, cab: 0.78, cabz: -0.04, top: 110, acc: 11, grip: 0.9, colors: [0x2fbf71, 0x35a7ff, 0xff7aa2] },
    komet: { name: 'KOMET', len: 1.9, w: 0.7, h: 1.0, cab: 0, cabz: 0, top: 120, acc: 18, grip: 1.1, colors: [0xff3d6e, 0x33c9ff, 0xffe14d], rider: true },
    cruiser: { name: 'TAPD CRUISER', len: 4.6, w: 1.95, h: 1.35, cab: 0.5, cabz: -0.04, top: 185, acc: 22, grip: 1.1, colors: [0xffffff] },
    swat: { name: 'BADAK-2', len: 6.4, w: 2.5, h: 2.7, cab: 0.9, cabz: 0, top: 120, acc: 10, grip: 0.9, colors: [0x24365e] },
    getaway: { name: 'GETAWAY VAN', len: 5.2, w: 2.1, h: 2.1, cab: 0.8, cabz: -0.02, top: 135, acc: 13, grip: 0.95, colors: [0x4a4e57] }
  },
  WEAPONS: [
    { id: 'fist', name: 'TINJU', dmg: 18, rate: 0.45, range: 2.2, ammo: Infinity, spread: 0 },
    { id: 'pistol', name: 'PISTOL P9', dmg: 26, rate: 0.28, range: 70, ammo: 60, spread: 0.02 },
    { id: 'smg', name: 'SMG KILAT', dmg: 14, rate: 0.08, range: 60, ammo: 180, spread: 0.05 },
    { id: 'shotgun', name: 'SHOTGUN BADAI', dmg: 70, rate: 0.8, range: 22, ammo: 24, spread: 0.12 },
    { id: 'rifle', name: 'KARABIN K-7', dmg: 34, rate: 0.12, range: 120, ammo: 120, spread: 0.025 },
    { id: 'launcher', name: 'PELUNCUR NAGA', dmg: 220, rate: 1.6, range: 150, ammo: 4, spread: 0.01, boom: true }
  ],
  CREW: [
    { id: 'sari', name: 'SARI', role: 'HACKER', ability: 'SCRAMBLE RADIO', key: 'Z', cd: 45, color: '#f06aa8', desc: 'Drops one wanted star' },
    { id: 'bima', name: 'BIMA', role: 'GUNMAN', ability: 'COVER FIRE', key: 'X', cd: 30, color: '#ffa94d', desc: 'Suppresses nearby enemies' },
    { id: 'tono', name: 'TONO', role: 'DRIVER', ability: 'FIELD REPAIR', key: 'C', cd: 60, color: '#4fd0d6', desc: 'Repairs the current car' }
  ],
  RANKS: [
    { name: 'KURIR', pts: 0, perk: 'none' }, { name: 'PREMAN', pts: 300, perk: '+10% payout' },
    { name: 'TANGAN KANAN', pts: 900, perk: 'armour at safehouses' }, { name: 'BOS KECIL', pts: 1800, perk: 'cheaper respray' },
    { name: 'RAJA TELUK', pts: 3200, perk: 'police lose you faster' }
  ],
  STATIONS: [
    { name: 'OFF', notes: [] }, { name: 'SENJA FM', notes: [0, 4, 7, 11, 7, 4, 9, 5], tempo: 0.24, wave: 'triangle' },
    { name: 'RADIO OMBAK', notes: [0, 3, 5, 7, 10, 7, 5, 3], tempo: 0.32, wave: 'sine' },
    { name: 'NEON 99', notes: [0, 0, 12, 0, 7, 0, 10, 5], tempo: 0.16, wave: 'square' }
  ],
  ROLES: ['INTERCEPTOR', 'RAMMER', 'PIT UNIT', 'ROADBLOCK', 'ELANG-1 AIR', 'BADAK-2 SWAT'],
  CONTRACTS: [
    { act: 1, title: 'KUNCI PINJAMAN', giver: 'PAK AMIR', pay: 1500, pts: 120, x: -250, z: -50, lines: [['PAK AMIR', 'Raka, the Naga Laut want fifty thousand in seven days. Start small: bring me a car.'], ['RAKA', 'Any car?'], ['PAK AMIR', 'One that is not ours yet.']], stages: [{ t: 'steal', text: 'Steal any car in PASAR SENJA' }, { t: 'goto', text: 'Deliver it to Pak Amir\'s workshop', x: -250, z: -100 }] },
    { act: 1, title: 'ARGO MALAM', giver: 'PAK AMIR', pay: 1800, pts: 140, x: -250, z: -100, lines: [['PAK AMIR', 'Take the yellow taxi. Three fares before the meter cools.'], ['RAKA', 'Honest work. Almost.']], stages: [{ t: 'goto', text: 'Pick up the fare at GANG NEON', x: 0, z: -100 }, { t: 'goto', text: 'Drop the fare at PANTAI pier', x: 250, z: 400 }] },
    { act: 1, title: 'PETI NOMOR TUJUH', giver: 'SARI', pay: 2600, pts: 180, x: -300, z: 300, lines: [['SARI', 'Container seven holds the ledger that owns your family. I open it, you keep them off me.'], ['RAKA', 'How many?'], ['SARI', 'Enough.']], stages: [{ t: 'goto', text: 'Reach container seven at PELABUHAN', x: -340, z: 300 }, { t: 'kill', text: 'Clear the dock guards', n: 4, x: -340, z: 320 }, { t: 'escape', text: 'Lose the police', stars: 2 }], crew: 'sari' },
    { act: 2, title: 'BALAP TOL LAYANG', giver: 'TONO', pay: 3200, pts: 220, x: 100, z: -300, lines: [['TONO', 'Beat my time across the city and I drive for you. Lose and I keep your car.'], ['RAKA', 'You talk slower than you drive, I hope.']], stages: [{ t: 'goto', text: 'Checkpoint 1 — west gate', x: -400, z: -300 }, { t: 'goto', text: 'Checkpoint 2 — port road', x: -400, z: 300 }, { t: 'goto', text: 'Finish — coast boulevard', x: 300, z: 400 }], crew: 'tono' },
    { act: 2, title: 'GUDANG KELO', giver: 'BIMA', pay: 3600, pts: 260, x: 300, z: 0, lines: [['BIMA', 'Kelo Arms short-changed me. We take what is owed, loudly.'], ['RAKA', 'Loud brings sirens.'], ['BIMA', 'Then drive well.']], stages: [{ t: 'kill', text: 'Defeat the warehouse crew', n: 5, x: 320, z: 20 }, { t: 'escape', text: 'Escape a 3-star pursuit', stars: 3 }], crew: 'bima' },
    { act: 2, title: 'EKSPOR KILAT', giver: 'PAK AMIR', pay: 4000, pts: 280, x: -250, z: -100, lines: [['PAK AMIR', 'A buyer on the island wants a PELABUHAN GT, unscratched.'], ['RAKA', 'Unscratched costs extra.']], stages: [{ t: 'steal', text: 'Steal a PELABUHAN GT', kind: 'gt' }, { t: 'goto', text: 'Deliver it to the port ramp', x: -380, z: 400 }] },
    { act: 2, title: 'MATA DI LANGIT', giver: 'SARI', pay: 4500, pts: 300, x: 0, z: -200, lines: [['SARI', 'ELANG-1 sees everything. Plant my jammer on three rooftops\' relay boxes.'], ['RAKA', 'And when they notice?'], ['SARI', 'Run under the flyover.']], stages: [{ t: 'goto', text: 'Relay 1 — GANG NEON', x: 100, z: -100 }, { t: 'goto', text: 'Relay 2 — PASAR SENJA', x: -100, z: 200 }, { t: 'escape', text: 'Break line of sight with ELANG-1', stars: 4 }] },
    { act: 3, title: 'BANK ARUNIKA', giver: 'CREW', pay: 18000, pts: 600, x: 150, z: 320, lines: [['RAKA', 'Bank Arunika launders the Naga Laut money. We take it back in one afternoon.'], ['BIMA', 'Guards first.'], ['SARI', 'Vault timer is ninety seconds.'], ['TONO', 'Van is running.']], stages: [{ t: 'goto', text: 'Reach the bank plaza', x: 150, z: 290 }, { t: 'kill', text: 'Neutralise the bank guards', n: 5, x: 150, z: 276 }, { t: 'goto', text: 'Get to the getaway van', x: 128, z: 297 }, { t: 'escape', text: 'Survive SWAT and escape', stars: 5 }] },
    { act: 3, title: 'PILIHAN RAKA', giver: 'PAK AMIR', pay: 6000, pts: 400, x: -250, z: -100, lines: [['PAK AMIR', 'The boss offers a deal: hand him Sari and the debt is gone.'], ['RAKA', 'Or I pay him in full and he never forgets my name.'], ['PAK AMIR', 'Choose at the pier. Left for the deal, right for the fight.']], stages: [{ t: 'goto', text: 'Go to the pier and choose', x: 250, z: 420 }, { t: 'kill', text: 'Fight off the Naga Laut ambush', n: 6, x: 250, z: 400 }], branch: true },
    { act: 3, title: 'FAJAR DI PELABUHAN', giver: 'RAKA', pay: 12000, pts: 800, x: -300, z: 380, lines: [['RAKA', 'Last morning. The boss sails at dawn with everything we owe.'], ['SARI', 'Then he does not sail.']], stages: [{ t: 'goto', text: 'Storm the cargo ship gangway', x: -330, z: 420 }, { t: 'kill', text: 'Defeat the boss\'s guard', n: 7, x: -330, z: 410 }, { t: 'escape', text: 'Vanish before the city wakes', stars: 5 }], final: true }
  ]
};
