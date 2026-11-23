// The Bank Arnika job: alarm cut, nine guards, vault countdown,
// cash grab, getaway van and the escape from a four-star pursuit.

// Heist stages: name, objective and the seconds each one allows.
const BANK_HEIST_STAGES = [
  { stage: 1, name: 'APPROACH', objective: 'Reach the bank plaza', seconds: 0 },
  { stage: 2, name: 'ALARM', objective: 'Cut the alarm (hold E 5 s, Agus)', seconds: 5 },
  { stage: 3, name: 'GUARDS', objective: 'Neutralise the bank guards', seconds: 0 },
  { stage: 4, name: 'VAULT', objective: 'Crack the vault (hold 45 s)', seconds: 45 },
  { stage: 5, name: 'CASH', objective: 'Grab the cash', seconds: 0 },
  { stage: 6, name: 'GETAWAY', objective: 'Get to the getaway van', seconds: 0 },
  { stage: 7, name: 'ESCAPE', objective: 'Lose the heat', seconds: 0 },
];

// Start the bank heist: contract 7, stage 1, guards and van placed.
function startBankArunikaHeist() {
  startStoryContract(7);
  const van = spawnVehicle('ANGKOT MINI', 60, -40, Math.PI / 2, 'none');
  GAME._getawayVan = van;
  GAME._heistGuards = [];
  for (let i = 0; i < 9; i++) {
    const gx = 72 + (i % 3) * 14;
    const gz = -78 + Math.floor(i / 3) * 10;
    const guard = spawnEnemyGunman(gx, gz, 'guard', 60);
    GAME._heistGuards.push(guard);
  }
  GAME.ui.banner = 'THE BANK ARUNIKA JOB — STAGE 1/7';
  if (typeof spawnObjectiveBeacon === 'function') {
    spawnObjectiveBeacon(90, -60);
  }
}

// Run the heist stages every step while contract 7 is active.
function updateBankHeist(dt) {
  const m = GAME.mission;
  if (m.id !== 7 || GAME.mode !== 'playing') {
    return;
  }
  if (m.stage === 2) {
    cutBankAlarm(dt);
  }
  if (m.stage === 3) {
    fightBankGuards(dt);
  }
  if (m.stage === 4) {
    crackVaultTimer(dt);
  }
  if (m.stage === 5) {
    grabCashAndReachGetawayVan(dt);
  }
  if (m.stage === 6) {
    grabCashAndReachGetawayVan(dt);
  }
  if (m.stage === 7) {
    escapeBankPursuit(dt);
  }
}

// Cut the alarm: hold E near the bank door for five seconds.
function cutBankAlarm(dt) {
  const p = GAME.player;
  const d = distanceBetween(p.x, p.z, 90, -85);
  if (d > 8) {
    GAME.ui.prompt = 'GET TO THE BANK DOOR';
    return;
  }
  GAME.ui.prompt = 'HOLD E — CUTTING THE ALARM';
  if (inp_isDown('interact')) {
    GAME.mission._alarmCut = (GAME.mission._alarmCut || 0) + dt;
    GAME.ui.promptProgress = clampNumber(GAME.mission._alarmCut / 5, 0, 1);
    if (GAME.mission._alarmCut >= 5) {
      GAME.ui.promptProgress = 0;
      GAME.ui.banner = 'ALARM CUT — AGUS IS IN';
      advanceMissionStage();
    }
  } else {
    GAME.mission._alarmCut = 0;
    GAME.ui.promptProgress = 0;
  }
}

// Fight the nine bank guards among the columns.
function fightBankGuards(dt) {
  const m = GAME.mission;
  m.counterMax = 9;
  let down = 0;
  if (GAME._heistGuards) {
    for (const guard of GAME._heistGuards) {
      if (guard.hp <= 0) {
        down += 1;
      }
    }
  }
  m.counter = down;
  if (down >= 9) {
    advanceMissionStage();
  }
  if (GAME.police.stars < 3) {
    raiseWantedLevel(3 - GAME.police.stars, 'ARMED ROBBERY');
  }
}

// Crack the vault: hold near the vault door for 45 seconds while
// the SWAT van rolls in at stage 3 of the heist.
function crackVaultTimer(dt) {
  const m = GAME.mission;
  const p = GAME.player;
  const d = distanceBetween(p.x, p.z, 90, -96);
  if (d > 10) {
    GAME.ui.prompt = 'GET TO THE VAULT';
    return;
  }
  m.timer = m.timer > 0 ? m.timer : 45;
  GAME.ui.prompt = 'HOLD — CRACKING THE VAULT';
  m.timer -= dt;
  GAME.ui.promptProgress = 1 - (m.timer / 45);
  if (m.timer <= 0) {
    GAME.ui.promptProgress = 0;
    GAME.ui.banner = 'VAULT OPEN — GRAB THE CASH';
    if (GAME.police.stars < 4) {
      raiseWantedLevel(1, 'ARMED ROBBERY');
    }
    if (typeof deploySwatVanAndOfficers === 'function') {
      deploySwatVanAndOfficers();
    }
    advanceMissionStage();
  }
}

// Grab the cash and reach the getaway van parked off the plaza.
function grabCashAndReachGetawayVan(dt) {
  const m = GAME.mission;
  const p = GAME.player;
  if (m.stage === 5) {
    const d = distanceBetween(p.x, p.z, 90, -96);
    if (d < 6) {
      GAME.money += 0;
      GAME._heistCash = 25000;
      GAME.ui.banner = 'CASH GRABBED — $25,000';
      advanceMissionStage();
    }
    return;
  }
  const van = GAME.vehicles[GAME._getawayVan];
  if (!van) {
    return;
  }
  const d = distanceBetween(p.x, p.z, van.x, van.z);
  m.next = 'Getaway van · ' + Math.round(d) + ' m';
  if (d < 5) {
    GAME.player.vehicle = GAME._getawayVan;
    van.driver = 'player';
    advanceMissionStage();
  }
}

// Escape the bank pursuit: lose the four-star heat to finish.
function escapeBankPursuit(dt) {
  const m = GAME.mission;
  if (GAME.police.stars === 0) {
    completeContractAndPayOut();
  }
}

// Reset the heist state when the mission fails or restarts.
function hst_resetHeist() {
  GAME._heistGuards = [];
  GAME._getawayVan = -1;
  GAME._heistCash = 0;
  GAME.mission._alarmCut = 0;
  if (typeof wpn_clearEnemies === 'function') {
    wpn_clearEnemies();
  }
}
