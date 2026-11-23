// Data tables only: districts, places, cars, weapons, crew, ranks, radio, dispatch roles, contracts.

const ROAD_XS = [-360, -240, -120, 0, 120, 240, 360];
const ROAD_ZS = [-240, -120, 0, 120, 270];
const ROAD_X_NAMES = ['Jl. Bakau', 'Jl. Pasar Senja', 'Jl. Lentera', 'Jl. Arunika', 'Jl. Neon', 'Jl. Gudang', 'Jl. Dermaga'];
const ROAD_Z_NAMES = ['Jl. Tol Bawah', 'Jl. Merdeka', 'Jl. Kenanga', 'Jl. Cempaka', 'Pantai Boulevard'];
const FLYOVER = { z: -330, x0: -350, x1: 640, rampLen: 80, height: 8, half: 9 };
const ISLAND = { x: 700, z: -330, r: 120, coneX: 742, coneZ: -352, coneR: 46 };
const LAND = { x0: -430, x1: 410, z0: -400, z1: 287, beachZ: 332, pierX: 150, pierZ1: 392 };

const DISTRICTS = [
  { id: 'pelabuhan', name: 'PELABUHAN', tint: '#5fa9d6', blurb: 'Container port and docks' },
  { id: 'pasar', name: 'PASAR SENJA', tint: '#f2a65a', blurb: 'Dusk market and shophouses' },
  { id: 'neon', name: 'GANG NEON', tint: '#c58af0', blurb: 'Downtown towers' },
  { id: 'pantai', name: 'PANTAI', tint: '#ffe08a', blurb: 'Beach boulevard' },
  { id: 'layang', name: 'TOL LAYANG', tint: '#9fd18b', blurb: 'Flyover and red bridge' },
  { id: 'abu', name: 'PULAU ABU', tint: '#9a938c', blurb: 'Volcanic ash island' }
];
const STANDING_WORDS = ['HUNTED', 'UNKNOWN', 'KNOWN', 'RESPECTED', 'FEARED', 'LEGEND'];

const PLACES = {
  bank: { x: 30, z: -60, name: 'Bank Arunika' },
  bankDoor: { x: 47, z: -60, name: 'Bank doors' },
  bankAlarm: { x: 45, z: -92, name: 'Alarm box' },
  amir: { x: -300, z: 108, name: "Pak Amir's workshop" },
  market: { x: -240, z: 60, name: 'Pasar Senja market' },
  gate: { x: -240, z: 40, name: 'Pasar Senja gate' },
  tower: { x: 60, z: 109, name: 'Wijaya Tower' },
  gunshop: { x: 131, z: 60, name: 'KELO ARMS' },
  respray: { x: 251, z: -60, name: 'Cat Kilat respray' },
  safePantai: { x: -60, z: 256, name: 'Pantai apartment' },
  safeLoft: { x: 300, z: 109, name: 'Dermaga loft' },
  portGate: { x: 252, z: 0, name: 'Port gate' },
  yard: { x: 318, z: -66, name: 'Container yard' },
  dock: { x: 388, z: 40, name: 'Export dock' },
  warehouse: { x: 252, z: -180, name: 'Ledger warehouse' },
  pier: { x: 150, z: 300, name: 'Pantai pier' },
  pierEnd: { x: 150, z: 386, name: 'End of the pier' },
  rampWest: { x: -340, z: -330, name: 'Flyover ramp' },
  flyoverMid: { x: 120, z: -330, name: 'Tol Layang' },
  ashDealer: { x: 652, z: -290, name: 'Ash Island arms shack' },
  informant: { x: -120, z: -226, name: 'TAPD informant' },
  getaway: { x: -300, z: 270, name: 'Pantai Boulevard west' }
};
const SAFEHOUSES = ['amir', 'safePantai', 'safeLoft'];

const CAR_MODELS = {
  sedan: { name: 'ARUNIKA SEDAN', style: 'sedan', len: 4.5, wid: 1.85, top: 150, accel: 9, grip: 1.0, hp: 100, price: 900, colors: [0x7fd8be, 0x5c7cfa, 0xf2f0e6, 0xb0b7c3, 0xe8a04b, 0x8c5fbf] },
  gt: { name: 'PELABUHAN GT', style: 'coupe', len: 4.4, wid: 1.95, top: 215, accel: 14, grip: 1.25, hp: 90, price: 4200, colors: [0xff6f61, 0x22b8cf, 0xffd43b, 0x2f2f38] },
  taxi: { name: 'TAKSI KUNING', style: 'taxi', len: 4.5, wid: 1.85, top: 140, accel: 8, grip: 0.95, hp: 100, price: 700, colors: [0xffc21a] },
  hauler: { name: 'BANTENG HAULER', style: 'truck', len: 7.2, wid: 2.5, top: 105, accel: 5, grip: 0.8, hp: 220, price: 2600, colors: [0xc2452d, 0x2d6a8f, 0x4c9a52] },
  angkot: { name: 'ANGKOT MINI', style: 'van', len: 4.3, wid: 1.8, top: 110, accel: 6, grip: 0.85, hp: 120, price: 600, colors: [0x3bc9db, 0xf783ac, 0x94d82d] },
  komet: { name: 'KOMET', style: 'scooter', len: 1.9, wid: 0.75, top: 95, accel: 8, grip: 1.1, hp: 40, price: 300, colors: [0xe03131, 0x1c7ed6, 0xf8f9fa] },
  cruiser: { name: 'TAPD CRUISER', style: 'cruiser', len: 4.6, wid: 1.9, top: 205, accel: 13, grip: 1.2, hp: 130, price: 0, colors: [0xece8dd] },
  badak: { name: 'BADAK-2', style: 'swat', len: 6.2, wid: 2.4, top: 150, accel: 8, grip: 0.95, hp: 400, price: 0, colors: [0x1d2f55] },
  getaway: { name: 'GETAWAY VAN', style: 'van', len: 4.9, wid: 1.95, top: 135, accel: 7, grip: 0.9, hp: 160, price: 0, colors: [0x17181c] }
};
const TRAFFIC_MIX = ['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'angkot', 'angkot', 'komet', 'komet', 'gt', 'hauler'];

const WEAPONS = [
  { id: 'fists', name: 'Fists', cls: 'MELEE', mag: 0, reserve: 0, dmg: 18, rate: 0.45, range: 2.3, spread: 0, pellets: 1, auto: false, price: 0, ammoPrice: 0 },
  { id: 'pistol', name: 'P-9', cls: 'PISTOL', mag: 12, reserve: 84, dmg: 24, rate: 0.28, range: 70, spread: 0.02, pellets: 1, auto: false, price: 350, ammoPrice: 40 },
  { id: 'smg', name: 'Cicak', cls: 'SMG', mag: 30, reserve: 210, dmg: 15, rate: 0.085, range: 60, spread: 0.045, pellets: 1, auto: true, price: 900, ammoPrice: 70 },
  { id: 'shotgun', name: 'Gajah 12', cls: 'SHOTGUN', mag: 6, reserve: 42, dmg: 14, rate: 0.8, range: 28, spread: 0.11, pellets: 7, auto: false, price: 1200, ammoPrice: 80 },
  { id: 'rifle', name: 'AR-Garuda', cls: 'RIFLE', mag: 30, reserve: 180, dmg: 30, rate: 0.11, range: 120, spread: 0.022, pellets: 1, auto: true, price: 2400, ammoPrice: 110 },
  { id: 'sniper', name: 'Pemburu', cls: 'SNIPER', mag: 5, reserve: 25, dmg: 140, rate: 1.3, range: 300, spread: 0.002, pellets: 1, auto: false, price: 3800, ammoPrice: 150 }
];

const CREW = [
  { id: 'sari', name: 'SARI', nick: 'Si Gesit', role: 'Driver', key: 'Z', code: 'KeyZ', ability: 'GASPOL', desc: 'Speed burst', cost: 1500, cooldown: 28, duration: 6, color: '#ff8fb1', skin: '#c98d62', hair: '#2a1b14', shirt: '#ff5d8f',
    lines: ['Gaspol! ELANG-1 is right on top of us - cut through the port!', 'Hold the line, I know a shortcut by the pier.', 'Tyres are screaming, keep it pinned!'] },
  { id: 'budi', name: 'BUDI', nick: 'Montir', role: 'Mechanic', key: 'X', code: 'KeyX', ability: 'QUICK FIX', desc: 'Repair + armour', cost: 2000, cooldown: 45, duration: 1, color: '#ffc857', skin: '#b97a4e', hair: '#111111', shirt: '#f08c00',
    lines: ['Patched her up. Try not to hit everything.', 'Duct tape and prayers, boss. She will hold.', 'Fresh plates on. Go!'] },
  { id: 'agus', name: 'AGUS', nick: 'Si Pendiam', role: 'Hacker', key: 'C', code: 'KeyC', ability: 'GHOST', desc: 'Drops one star', cost: 3000, cooldown: 60, duration: 1, color: '#63e6be', skin: '#d6a57c', hair: '#3b2a20', shirt: '#0ca678',
    lines: ['Vault timer is running. Keep them off the door, Raka!', 'Scrambled their radios. One star gone.', 'Cameras are looping. You were never here.'] }
];
const STORY_FACES = {
  darma: { name: 'DARMA WIJAYA', role: 'Syndicate boss', color: '#e03131', skin: '#b98a63', hair: '#d9d9d9', shirt: '#2b2b33' },
  amir: { name: 'PAK AMIR', role: 'Your father', color: '#74c0fc', skin: '#a8754c', hair: '#8d8d8d', shirt: '#4c6ef5' },
  raka: { name: 'RAKA', role: 'Taxi driver in debt', color: '#20c997', skin: '#c68e63', hair: '#1a120d', shirt: '#12b5a0' },
  dispatch: { name: 'TAPD DISPATCH', role: 'Police radio', color: '#4dabf7', skin: '#c9a27d', hair: '#20242c', shirt: '#1b2a4a' }
};

const RANKS = [
  { name: 'ERRAND BOY', rp: 0, perk: 'A borrowed taxi and a debt' },
  { name: 'HUSTLER', rp: 120, perk: 'Shops sell 10% cheaper' },
  { name: 'STREET BOSS', rp: 400, perk: '+25 max armour, crew cooldowns -15%' },
  { name: 'UNDERBOSS', rp: 800, perk: 'Heat decays 25% faster' },
  { name: 'KING OF THE BAY', rp: 1500, perk: 'Contracts pay 20% more' }
];

const RADIO_STATIONS = [
  { name: 'ARUNIKA 98.4', show: 'Dangdut Neon', tempo: 132, scale: [0, 1, 4, 5, 7, 8, 11], root: 196, wave: 'sawtooth' },
  { name: 'OMBAK 101.2', show: 'Island Lo-fi', tempo: 78, scale: [0, 2, 4, 7, 9], root: 174.6, wave: 'triangle' },
  { name: 'KOTA 87.5', show: 'City News', tempo: 96, scale: [0, 3, 5, 7, 10], root: 220, wave: 'square',
    news: ['Port authority denies missing container 47.', 'TAPD adds air unit ELANG-1 to evening patrols.', 'Bank Arunika shares steady after security upgrade.', 'Ash plume over Pulau Abu, flyover stays open.'] }
];

const DISPATCH_ROLES = {
  PURSUIT: '#4dabf7', RAMMING: '#ff4d4d', PIT: '#ff922b', FLANKING: '#94d82d', 'BOX-IN': '#ffd43b', 'FOOT CHASE': '#74c0fc',
  SPOTLIGHT: '#f8f9fa', BREACH: '#e64980', SNIPER: '#cc5de8', ROADBLOCK: '#be4bdb', SPIKES: '#ff8787', 'ROADBLOCK AHEAD': '#be4bdb'
};
const INCIDENTS = ['', 'DISTURBANCE', 'DISTURBANCE', 'VEHICLE PURSUIT', 'ARMED ROBBERY', 'CITYWIDE MANHUNT'];
const WANTED_STATUS = ['', 'FOOT PATROL ALERTED', 'CRUISERS RESPONDING', 'ROADBLOCKS SET', 'AIR UNIT DEPLOYED', 'SWAT + AIR UNIT - ALL UNITS'];
const CRUISER_NAMES = ['CAMAR 12', 'CAMAR 33', 'CAMAR 21', 'CAMAR 47', 'CAMAR 08', 'CAMAR 56'];
const CRUISER_ROLES = ['RAMMING', 'PIT', 'BOX-IN', 'FLANKING', 'PURSUIT', 'PURSUIT'];

const ACTS = ['ACT I - THE DEBT', 'ACT II - THE SYNDICATE', 'ACT III - DAWN'];
const CONTRACTS = [
  { title: 'First Fare', act: 0, giver: 'amir', payout: 400, start: 'amir',
    intro: [['amir', 'The taxi is all we have left, Raka. One honest fare, then we talk about Darma.'], ['raka', 'One fare will not cover fifty grand, Pak. But I will drive.']],
    stages: [
      { type: 'enter', title: 'TAKE THE TAXI', obj: 'Get in the <b>TAKSI KUNING</b> outside the workshop', model: 'taxi', at: [-290, 116], heading: 1.57 },
      { type: 'goto', title: 'PICK UP THE FARE', obj: 'Drive to the <b>Pasar Senja gate</b>', at: [-235, 56], r: 9, car: true },
      { type: 'goto', title: 'DROP HER AT THE PIER', obj: 'Reach the <b>Pantai pier</b> before the meter runs out', at: [150, 262], r: 10, car: true, timer: 110 },
      { type: 'goto', title: 'BACK TO THE WORKSHOP', obj: "Return the taxi to <b>Pak Amir</b>", at: [-290, 116], r: 9 }
    ] },
  { title: 'Night Market Shakedown', act: 0, giver: 'darma', payout: 900, start: 'market',
    intro: [['darma', "Seven days, Raka. Bring me the collectors' cash or I take your father's workshop."], ['raka', 'You will have it. Leave the workshop out of this.']],
    stages: [
      { type: 'goto', title: 'WALK THE MARKET', obj: 'Go to the <b>Pasar Senja</b> stalls', at: [-240, 40], r: 10 },
      { type: 'collect', title: 'COLLECT THE CASH', obj: 'Take the envelopes from <b>three stalls</b>', points: [[-250, 62], [-230, 10], [-250, -60]], label: 'ENVELOPES' },
      { type: 'kill', title: 'THE COLLECTORS BITE BACK', obj: "Deal with Darma's rival <b>collectors</b>", at: [-240, -70], count: 4, look: 'thug', weapon: 'pistol', label: 'COLLECTORS' },
      { type: 'lose', title: 'LOSE THE PATROL', obj: 'Break line of sight and <b>lose the heat</b>', stars: 2 },
      { type: 'goto', title: 'PAY THE BOSS', obj: 'Bring the cash to <b>Wijaya Tower</b>', at: [60, 109], r: 8 }
    ] },
  { title: 'The Harbour Key', act: 0, giver: 'darma', payout: 1400, start: 'portGate',
    intro: [['darma', 'A harbour master owes me a key and a car. Collect both.'], ['amir', 'Careful at the docks, son. Those men carry more than clipboards.']],
    stages: [
      { type: 'goto', title: 'REACH THE PORT', obj: 'Go to the <b>port gate</b> in Pelabuhan', at: [252, 0], r: 10 },
      { type: 'kill', title: 'DOCK SECURITY', obj: 'Take out the <b>dock guards</b>', at: [300, -30], count: 3, look: 'guard', weapon: 'pistol', label: 'GUARDS' },
      { type: 'collect', title: 'TAKE THE KEY', obj: "Grab the <b>harbour master's key</b>", points: [[330, -40]], label: 'KEY' },
      { type: 'enter', title: 'STEAL THE GT', obj: 'Steal the coral <b>PELABUHAN GT</b>', model: 'gt', at: [300, 22], heading: -1.57, color: 0xff6f61 },
      { type: 'goto', title: 'HIDE IT AT THE WORKSHOP', obj: "Deliver the GT to <b>Pak Amir</b>", at: [-290, 116], r: 9, car: true }
    ] },
  { title: 'Container 47', act: 1, giver: 'darma', payout: 2500, start: 'yard',
    intro: [['darma', 'Container forty-seven never reached customs. Tonight it reaches me.'], ['raka', 'And if the port police are watching it?'], ['darma', 'Then drive faster.']],
    stages: [
      { type: 'goto', title: 'FIND CONTAINER 47', obj: 'Enter the <b>container yard</b>', at: [318, -66], r: 9 },
      { type: 'hold', title: 'CUT THE LOCK', obj: 'Stay at <b>container 47</b> while the lock is cut', at: [318, -66], r: 6, seconds: 6, label: 'CUTTING' },
      { type: 'enter', title: 'TAKE THE HAULER', obj: 'Get in the loaded <b>BANTENG HAULER</b>', model: 'hauler', at: [304, -96], heading: 3.14 },
      { type: 'goto', title: 'RUN THE GATE', obj: 'Deliver the hauler to the <b>ledger warehouse</b>', at: [252, -180], r: 10, car: true, wanted: 3 },
      { type: 'lose', title: 'SHAKE THE PORT POLICE', obj: 'Break line of sight and <b>lose the heat</b>', stars: 2 }
    ] },
  { title: 'The Choice', act: 1, giver: 'darma', payout: 3000, start: 'tower',
    intro: [['dispatch', 'Raka. A detective can make your debt vanish - if you hand her Darma.'], ['darma', 'Or you pay what you owe today and stay family. Choose well.']],
    stages: [
      { type: 'goto', title: 'GO TO WIJAYA TOWER', obj: 'Meet at <b>Wijaya Tower</b>', at: [60, 109], r: 8 },
      { type: 'choice', title: 'PAY DARMA OR BETRAY HIM', obj: 'Choose: <b>pay Darma</b> at the tower or <b>meet the detective</b>', a: { at: [72, 109], label: 'PAY DARMA', key: 'loyal' }, b: { at: [-120, -226], label: 'MEET THE DETECTIVE', key: 'betray' } },
      { type: 'kill', title: 'CLEAN UP THE CHOICE', obj: 'Survive the <b>ambush</b> your choice bought you', at: [-120, -210], count: 4, look: 'thug', weapon: 'smg', label: 'ENFORCERS', branchAt: { loyal: [-120, -210], betray: [60, 96] } },
      { type: 'goto', title: 'LIE LOW', obj: "Get back to <b>Pak Amir's workshop</b>", at: [-290, 116], r: 9 }
    ] },
  { title: 'Smoke on the Flyover', act: 1, giver: 'darma', payout: 4000, start: 'rampWest',
    intro: [['darma', 'A rival convoy crosses Tol Layang with my ledgers. It must not reach the port.'], ['raka', 'Three haulers on a flyover. Understood.']],
    stages: [
      { type: 'goto', title: 'GET ON THE FLYOVER', obj: 'Drive up the <b>Tol Layang ramp</b>', at: [-300, -330], r: 9, car: true },
      { type: 'destroy', title: 'STOP THE CONVOY', obj: 'Wreck the <b>BANTENG HAULER</b> convoy before the port', model: 'hauler', count: 3, at: [-200, -330], heading: 1.57, goal: [560, -330], timer: 170, label: 'HAULERS' },
      { type: 'collect', title: 'GRAB THE LEDGERS', obj: 'Pick up the <b>ledger crates</b> from the wrecks', points: 'wrecks', label: 'LEDGERS' },
      { type: 'lose', title: 'VANISH', obj: 'Break line of sight and <b>lose the heat</b>', stars: 3 }
    ] },
  { title: 'The Bank Arunika Job', act: 1, giver: 'darma', payout: 25000, start: 'bank', bank: true,
    intro: [['darma', 'Bank Arunika holds my retirement. You, Sari, Budi and Agus bring it home.'], ['raka', 'After this the debt is half gone. Crew - masks on.']],
    stages: [] },
  { title: 'Ash Island Arms', act: 2, giver: 'amir', payout: 5000, start: 'rampWest',
    intro: [['amir', 'Darma is arming for war from Pulau Abu. Cross the red bridge and take his crates.'], ['raka', 'Then we use his own guns to finish this.']],
    stages: [
      { type: 'goto', title: 'CROSS THE RED BRIDGE', obj: 'Drive over Tol Layang to <b>Pulau Abu</b>', at: [652, -300], r: 12 },
      { type: 'kill', title: 'CLEAR THE SHACK', obj: "Take out the <b>arms dealer's</b> crew", at: [660, -285], count: 5, look: 'thug', weapon: 'rifle', label: 'DEALERS' },
      { type: 'collect', title: 'LOAD THE CRATES', obj: 'Collect the <b>weapon crates</b>', points: [[648, -276], [668, -296]], label: 'CRATES' },
      { type: 'goto', title: 'BACK TO THE CITY', obj: 'Bring the crates to the <b>Dermaga loft</b>', at: [300, 114], r: 9 }
    ] },
  { title: 'Burn the Ledger', act: 2, giver: 'amir', payout: 6000, start: 'warehouse',
    intro: [['raka', 'Every debt in this city is written in one room. Tonight it burns.'], ['darma', 'Touch my ledger, boy, and seven days becomes seven minutes.']],
    stages: [
      { type: 'goto', title: 'REACH THE WAREHOUSE', obj: 'Go to the <b>ledger warehouse</b>', at: [252, -180], r: 9 },
      { type: 'kill', title: 'BREAK THE GUARD', obj: 'Take out the <b>syndicate guards</b>', at: [246, -166], count: 6, look: 'thug', weapon: 'smg', label: 'GUARDS' },
      { type: 'hold', title: 'TORCH THE LEDGER ROOM', obj: 'Stay by the door while the <b>ledger burns</b>', at: [252, -180], r: 7, seconds: 7, label: 'BURNING', boom: true, wanted: 4 },
      { type: 'goto', title: 'RUN FOR THE LOFT', obj: 'Escape to the <b>Dermaga loft</b>', at: [300, 114], r: 9 },
      { type: 'lose', title: 'DISAPPEAR', obj: 'Break line of sight and <b>lose the heat</b>', stars: 3 }
    ] },
  { title: 'Dawn at the Docks', act: 2, giver: 'amir', payout: 10000, start: 'dock',
    intro: [['darma', 'You burned my book. Come to the docks and I will write your name in the water.'], ['amir', 'End it, Raka. Then come home.']],
    stages: [
      { type: 'goto', title: 'GO TO THE DOCKS', obj: 'Reach the <b>export dock</b>', at: [388, 40], r: 10 },
      { type: 'kill', title: "DARMA'S LAST CREW", obj: 'Defeat <b>Darma Wijaya</b> and his men', at: [384, 10], count: 7, look: 'thug', weapon: 'rifle', label: 'SYNDICATE', boss: 'DARMA WIJAYA' },
      { type: 'choice', title: 'THE LAST CHOICE', obj: 'Choose: <b>hand Darma to TAPD</b> or <b>take his seat</b>', a: { at: [380, 62], label: 'HAND HIM TO TAPD', key: 'free' }, b: { at: [396, 62], label: 'TAKE HIS SEAT', key: 'boss' } },
      { type: 'goto', title: 'WALK INTO THE DAWN', obj: 'Walk to the <b>end of the pier</b>', at: [150, 386], r: 6 }
    ] }
];
const BANK_STAGES = [
  { type: 'goto', title: 'REACH THE BANK', obj: 'Park the getaway van on the <b>Bank Arunika</b> plaza', at: [30, -60], r: 12 },
  { type: 'hold', title: 'CUT THE ALARM', obj: 'Hold at the <b>alarm box</b> while Agus cuts it', at: [45, -92], r: 5, seconds: 5, label: 'ALARM' },
  { type: 'kill', title: 'TAKE OUT THE GUARDS', obj: 'Clear the <b>bank guards</b>', at: [42, -60], count: 9, look: 'guard', weapon: 'pistol', label: 'GUARDS', wanted: 4 },
  { type: 'hold', title: 'CRACK THE VAULT', obj: 'Defend the doors while the <b>vault</b> is drilled', at: [47, -60], r: 7, seconds: 10, label: 'VAULT', vaultTimer: 150 },
  { type: 'collect', title: 'GRAB THE CASH', obj: 'Take the three <b>cash bags</b>', points: [[45, -52], [45, -60], [45, -68]], label: 'CASH BAGS' },
  { type: 'goto', title: 'ESCAPE', obj: 'Get to <b>Pantai Boulevard</b> in a car', at: [-300, 270], r: 14, car: true },
  { type: 'lose', title: 'LOSE THE HEAT', obj: 'Break line of sight and <b>lose the heat</b>', stars: 4 }
];

const RACES = [
  { name: 'PANTAI SPRINT', start: [-300, 270], heading: 1.57, laps: 1, prize: 800, points: [[-120, 270], [120, 270], [352, 262], [360, 128], [248, 120], [120, 128], [-120, 120], [-352, 128], [-360, 262], [-300, 270]] },
  { name: 'NEON LOOP', start: [0, -100], heading: 3.14, laps: 2, prize: 1200, points: [[0, -232], [112, -240], [120, -8], [112, 120], [8, 120], [0, 8], [0, -100]] },
  { name: 'LAYANG RUN', start: [-360, -300], heading: 3.14, laps: 1, prize: 1600, points: [[-340, -330], [-100, -330], [200, -330], [520, -330], [650, -330]] }
];
const RIVAL_NAMES = ['Dewi "Kilat"', 'Joko Turbo', 'Si Kembar'];
const WRECK_TARGETS = [
  { name: 'Hendra "Si Tikus"', model: 'sedan', bounty: 1500, at: [120, 60], color: 0x8c5fbf },
  { name: 'Mama Laras', model: 'angkot', bounty: 2000, at: [-240, -180], color: 0xf783ac },
  { name: 'Kapten Baja', model: 'hauler', bounty: 3000, at: [360, 60], color: 0x2d6a8f }
];
const COIN_SPOTS = [[-395, -100], [-300, 300], [-180, -280], [-60, 60], [60, -180], [150, 380], [180, 180], [300, 300], [390, -150], [385, 150], [100, -330], [690, -250]];
const STUNT_RAMPS = [{ x: -200, z: 304, h: 1.57 }, { x: 60, z: 304, h: -1.57 }, { x: 390, z: -110, h: 0 }, { x: -398, z: -40, h: 0 }, { x: 610, z: -300, h: 0.6 }];
const EXPORT_LIST = ['gt', 'sedan', 'hauler', 'angkot'];
const UPGRADES = [
  { id: 'engine', name: 'TUNED ENGINE', desc: '+12% top speed per level', price: 1500, max: 3 },
  { id: 'armour', name: 'PLATED BODY', desc: '-20% collision damage per level', price: 1200, max: 3 },
  { id: 'tyres', name: 'GRIP TYRES', desc: '+10% grip per level', price: 900, max: 3 }
];
const TUTORIAL_HINTS = [
  { id: 'move', text: 'WASD to move - Shift to sprint - Space to jump' },
  { id: 'steal', text: 'Hold E to steal a car - Shift to sprint - Tab for weapons' },
  { id: 'drive', text: 'W / S accelerate and brake - Space handbrake - V camera' },
  { id: 'map', text: 'M opens the map - follow the yellow route to your contract' },
  { id: 'wanted', text: 'Stars mean police - break line of sight until the heat bar empties' },
  { id: 'crew', text: 'Recruit crew at the workshop - Z / X / C fire their abilities' }
];
const CONTROLS_LIST = [
  ['W A S D', 'Move / drive'], ['Mouse', 'Look and aim'], ['Left click', 'Shoot / punch'], ['Right click', 'Aim'], ['Mouse wheel', 'Camera distance on foot'], ['Shift', 'Sprint'], ['Space', 'Jump / handbrake'],
  ['E', 'Enter, exit or steal a car / interact'], ['Tab', 'Weapon wheel'], ['1-6', 'Select weapon'], ['R', 'Reload'], ['V', 'Cycle camera'], ['Z X C', 'Crew abilities'],
  ['Q', 'Next radio station'], ['H', 'Horn'], ['M', 'Map'], ['Esc', 'Pause'], ['F5', 'Quick save'], ['P', 'Toggle rain']
];
const DEFAULT_SETTINGS = { master: 0.8, music: 0.6, effects: 0.8, sensitivity: 1, invertY: false, shake: true, quality: 'high' };
