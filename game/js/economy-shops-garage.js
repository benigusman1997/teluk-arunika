// Economy, shops and garage: KELO ARMS, Warung Bu Tini, Cat Kilat,
// Darma's collector and the workshop upgrades.

// Shop catalog: items, prices and what they do.
const SHOP_CATALOG = [
  { id: 'P-9', name: 'P-9 PISTOL', price: 400, kind: 'weapon' },
  { id: 'CICAK', name: 'CICAK SMG', price: 1200, kind: 'weapon' },
  { id: 'GAJAH 12', name: 'GAJAH 12 SHOTGUN', price: 1800, kind: 'weapon' },
  { id: 'AR-GARUDA', name: 'AR-GARUDA RIFLE', price: 3200, kind: 'weapon' },
  { id: 'PEMBURU', name: 'PEMBURU SNIPER', price: 4500, kind: 'weapon' },
  { id: 'AMMO', name: 'AMMO PER MAGAZINE', price: 40, kind: 'ammo' },
  { id: 'ARMOUR', name: 'BODY ARMOUR', price: 600, kind: 'armour' },
  { id: 'NASI', name: 'NASI BUNGKUS +25 HEALTH', price: 15, kind: 'food' },
  { id: 'ES KELAPA', name: 'ES KELAPA +50 HEALTH', price: 30, kind: 'food' },
  { id: 'KOPI', name: 'KOPI OMBAK SPRINT BOOST', price: 20, kind: 'food' },
  { id: 'RESPRAY', name: 'RESPRAY — LOSE THE HEAT', price: 350, kind: 'service' },
  { id: 'REPAIR', name: 'FULL REPAIR', price: 200, kind: 'service' },
];

// Shop locations on the map.
const SHOP_LOCATIONS = [
  { id: 'KELO ARMS', x: -180, z: -180, kind: 'guns' },
  { id: 'WARUNG BU TINI', x: -200, z: 60, kind: 'food' },
  { id: 'CAT KILAT', x: 180, z: 180, kind: 'respray' },
  { id: 'BENGKEL PAK AMIR', x: -270, z: 30, kind: 'garage' },
  { id: 'COLLECTOR', x: 270, z: -180, kind: 'debt' },
];

// Garage upgrades at Bengkel Pak Amir.
const GARAGE_UPGRADES = [
  { id: 'ENGINE1', name: 'ENGINE LEVEL 1', price: 1500, effect: '+8% top speed' },
  { id: 'ENGINE2', name: 'ENGINE LEVEL 2', price: 3000, effect: '+8% top speed' },
  { id: 'ENGINE3', name: 'ENGINE LEVEL 3', price: 6000, effect: '+8% top speed' },
  { id: 'TYRES', name: 'GRIP TYRES', price: 1200, effect: '+grip' },
  { id: 'ARMOUR PLATING', name: 'ARMOUR PLATING', price: 2500, effect: '+50% body' },
  { id: 'NITRO', name: 'NITRO', price: 3500, effect: 'nitro boost' },
  { id: 'BULLETPROOF', name: 'BULLETPROOF TYRES', price: 4000, effect: 'no spike bursts' },
];

// Open a shop panel at a place.
function openShopAtPlace(shopId) {
  GAME.shop.open = true;
  GAME.shop.id = shopId;
  GAME.mode = 'shop';
  GAME.ui.banner = shopId + ' — PRESS E TO LEAVE';
}

// Buy a weapon or ammo from KELO ARMS.
function buyWeaponOrAmmo(itemId) {
  const item = SHOP_CATALOG.find(function findItem(i) { return i.id === itemId; });
  if (!item || GAME.money < item.price) {
    GAME.ui.banner = 'NOT ENOUGH CASH';
    return false;
  }
  if (item.kind === 'weapon') {
    const weapon = WEAPONS.find(function findWeapon(w) { return w.name === itemId; });
    if (!weapon) {
      return false;
    }
    GAME.money -= item.price;
    GAME.player.ammo[weapon.slot - 1].reserve += weapon.reserve;
    GAME.ui.banner = 'BOUGHT ' + item.name;
    return true;
  }
  if (item.kind === 'ammo') {
    const slot = GAME.player.weaponSlot;
    const weapon = WEAPONS[slot - 1];
    if (weapon.kind === 'melee') {
      return false;
    }
    GAME.money -= item.price;
    GAME.player.ammo[slot - 1].reserve += weapon.mag;
    GAME.ui.banner = 'AMMO BOUGHT';
    return true;
  }
  return false;
}

// Buy food and armour: health and protection from the warung.
function buyFoodAndArmour(itemId) {
  const item = SHOP_CATALOG.find(function findItem(i) { return i.id === itemId; });
  if (!item || GAME.money < item.price) {
    GAME.ui.banner = 'NOT ENOUGH CASH';
    return false;
  }
  GAME.money -= item.price;
  if (itemId === 'NASI') {
    GAME.player.health = Math.min(100, GAME.player.health + 25);
  }
  if (itemId === 'ES KELAPA') {
    GAME.player.health = Math.min(100, GAME.player.health + 50);
  }
  if (itemId === 'KOPI') {
    GAME.player._sprintBoost = 20;
    GAME.ui.banner = 'KOPI OMBAK — 20 S SPRINT BOOST';
    return true;
  }
  if (itemId === 'ARMOUR') {
    GAME.player.armour = Math.min(100, GAME.player.armour + 50);
  }
  GAME.ui.banner = 'BOUGHT ' + item.name;
  return true;
}

// Pay the debt in $5,000 instalments at Darma's collector.
function payDebtInstalment() {
  if (GAME.money < 5000) {
    GAME.ui.banner = 'NEED $5,000 FOR AN INSTALMENT';
    return false;
  }
  if (GAME.debt <= 0) {
    GAME.ui.banner = 'DEBT ALREADY CLEARED';
    return false;
  }
  GAME.money -= 5000;
  GAME.debt -= 5000;
  GAME.ui.banner = 'PAID $5,000 — DEBT $' + GAME.debt.toLocaleString() + ' LEFT';
  if (GAME.debt <= 0 && typeof showEndingDebtCleared === 'function') {
    showEndingDebtCleared();
  }
  return true;
}

// Respray at Cat Kilat: new colour, clears up to three stars unseen.
function resprayToLoseHeat(colour) {
  if (GAME.money < 350) {
    GAME.ui.banner = 'RESPRAY COSTS $350';
    return false;
  }
  const v = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!v) {
    GAME.ui.banner = 'BRING A CAR TO CAT KILAT';
    return false;
  }
  GAME.money -= 350;
  v.colour = colour || 0x2a2f3a;
  if (GAME.police.stars <= 3 && !GAME.police.seen) {
    clearWantedLevel();
    GAME.ui.banner = 'RESPRAYED — HEAT GONE';
  } else {
    GAME.ui.banner = 'RESPRAYED — STILL HOT';
  }
  return true;
}

// Store the current car in one of three garage slots.
function storeCarInGarage() {
  const v = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!v) {
    GAME.ui.banner = 'NO CAR TO STORE';
    return false;
  }
  if (GAME.garage.cars.length >= 3) {
    GAME.ui.banner = 'GARAGE FULL — 3 CARS MAX';
    return false;
  }
  GAME.garage.cars.push({ model: v.model, hp: v.hp, colour: v.colour });
  GAME.player.vehicle = -1;
  v.driver = 'none';
  GAME.ui.banner = 'CAR STORED — ' + v.model;
  return true;
}

// Upgrade a car part at Bengkel Pak Amir.
function upgradeCarPart(upgradeId) {
  const upgrade = GARAGE_UPGRADES.find(function findUp(u) { return u.id === upgradeId; });
  if (!upgrade || GAME.money < upgrade.price) {
    GAME.ui.banner = 'NOT ENOUGH CASH';
    return false;
  }
  GAME.money -= upgrade.price;
  if (upgradeId.indexOf('ENGINE') === 0) {
    GAME.garage.upgrades.engine += 1;
  }
  if (upgradeId === 'TYRES') {
    GAME.garage.upgrades.tyres = true;
  }
  if (upgradeId === 'ARMOUR PLATING') {
    GAME.garage.upgrades.armour = true;
  }
  if (upgradeId === 'NITRO') {
    GAME.garage.upgrades.nitro = true;
  }
  if (upgradeId === 'BULLETPROOF') {
    GAME.garage.upgrades.bulletproof = true;
  }
  GAME.ui.banner = 'INSTALLED — ' + upgrade.name;
  return true;
}

// Repair the current car at the garage for $200.
function repairCarAtGarage() {
  const v = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
  if (!v) {
    GAME.ui.banner = 'NO CAR TO REPAIR';
    return false;
  }
  if (GAME.money < 200) {
    GAME.ui.banner = 'REPAIR COSTS $200';
    return false;
  }
  GAME.money -= 200;
  v.hp = v.maxHp;
  v.smoke = 0;
  v.tyreBurst = 0;
  GAME.ui.banner = 'CAR REPAIRED — LIKE NEW';
  return true;
}
