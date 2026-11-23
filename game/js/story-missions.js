// Story missions: the ten contracts in three acts, with stages,
// objectives, timers, counters and the branch choice.

// Story acts: number, name and the contracts they hold.
const STORY_ACTS = [
  { act: 'I', name: 'The Debt', contracts: [1, 2, 3] },
  { act: 'II', name: 'The Syndicate', contracts: [4, 5, 6, 7] },
  { act: 'III', name: 'Dawn', contracts: [8, 9, 10] },
];

// Contracts: id, title, act, giver, district, payout, stages.
// Each stage has objective text, a target place, a kind, and an
// optional timer or counter.
const STORY_CONTRACTS = [
  {
    id: 1, title: 'FIRST FARE', act: 'I', giver: 'Pak Amir',
    district: 'PASAR SENJA', payout: 800,
    intro: 'The taxi is ready, son. One fare at a time — we pay this off.',
    outro: 'Good driving. The meter is running on our debt, not on us.',
    stages: [
      { objective: 'Take the TAKSI KUNING from the workshop', target: { x: -262, z: 30 }, kind: 'goto' },
      { objective: 'Pick up the fare at the market gate', target: { x: -270, z: -90 }, kind: 'goto' },
      { objective: 'Drop her at HOTEL NUSA before the meter runs out', target: { x: 200, z: 340 }, kind: 'deliver', timer: 90 },
    ],
  },
  {
    id: 2, title: 'NIGHT MARKET SHAKEDOWN', act: 'I', giver: 'Darma Wijaya',
    district: 'PASAR SENJA', payout: 1500,
    intro: 'Seven days, Raka. Bring me the stall money or I take your father\'s workshop.',
    outro: 'The stalls pay. You learn fast. Keep it that way.',
    stages: [
      { objective: 'Steal any car in Pasar Senja', target: { x: -270, z: -90 }, kind: 'steal' },
      { objective: 'Collect from three stalls', target: { x: -270, z: -120 }, kind: 'collect', counter: 3 },
      { objective: 'Lose the two-star patrol', target: { x: -180, z: 0 }, kind: 'escape' },
      { objective: 'Deliver the cash to Darma\'s collector', target: { x: 270, z: -180 }, kind: 'deliver' },
    ],
  },
  {
    id: 3, title: 'THE HARBOUR KEY', act: 'I', giver: 'Sari',
    district: 'PELABUHAN', payout: 2400,
    intro: 'The foreman carries the key card. Tail him — and do not let him see you.',
    outro: 'Key card in hand. The docks are ours tonight.',
    stages: [
      { objective: 'Tail the dock foreman\'s OMBAK PICKUP unseen', target: { x: -400, z: 300 }, kind: 'tail' },
      { objective: 'Take the key card from him', target: { x: -380, z: 280 }, kind: 'steal' },
      { objective: 'Escape the dock guards', target: { x: -270, z: 180 }, kind: 'escape' },
    ],
  },
  {
    id: 4, title: 'CONTAINER 47', act: 'II', giver: 'Darma Wijaya',
    district: 'PELABUHAN', payout: 3600,
    intro: 'Container 47 holds what I need. The warehouse crew will not hand it over.',
    outro: 'The hauler is mine. You drive like you mean it.',
    stages: [
      { objective: 'Reach crane 3', target: { x: -345, z: 210 }, kind: 'goto' },
      { objective: 'Defeat the warehouse crew', target: { x: -345, z: 240 }, kind: 'defeat', counter: 6 },
      { objective: 'Drive the BANTENG HAULER out', target: { x: -300, z: 250 }, kind: 'steal' },
      { objective: 'Escape a three-star pursuit', target: { x: -180, z: 180 }, kind: 'escape' },
      { objective: 'Park at the drop', target: { x: 270, z: -180 }, kind: 'deliver' },
    ],
  },
  {
    id: 5, title: 'THE CHOICE', act: 'II', giver: 'Inspector Laras',
    district: 'GANG NEON', payout: 4500,
    intro: 'Meet me on the rooftop car park, Raka. Darma owns your debt. I can end it — for a price.',
    outro: 'You chose. There is no going back now.',
    stages: [
      { objective: 'Meet Laras on the rooftop car park', target: { x: 40, z: -40 }, kind: 'goto' },
      { objective: 'Choose PAY DARMA or WEAR THE WIRE', target: { x: 40, z: -40 }, kind: 'choose' },
      { objective: 'Survive the ambush', target: { x: 40, z: -40 }, kind: 'defeat', counter: 5 },
      { objective: 'Reach the Neon flat', target: { x: 0, z: -180 }, kind: 'deliver' },
    ],
  },
  {
    id: 6, title: 'SMOKE ON THE FLYOVER', act: 'II', giver: 'Budi',
    district: 'TOL LAYANG', payout: 6000,
    intro: 'The syndicate convoy is rolling on the flyover. Stop that hauler before the port exit.',
    outro: 'Convoy stopped. The flyover is ours.',
    stages: [
      { objective: 'Catch the syndicate convoy', target: { x: -200, z: -360 }, kind: 'goto' },
      { objective: 'Disable two escort cars', target: { x: 0, z: -360 }, kind: 'destroy', counter: 2 },
      { objective: 'Stop the BANTENG HAULER before the port exit', target: { x: 200, z: -360 }, kind: 'destroy' },
      { objective: 'Lose the heat', target: { x: 90, z: -270 }, kind: 'escape' },
    ],
  },
  {
    id: 7, title: 'THE BANK ARUNIKA JOB', act: 'II', giver: 'the crew',
    district: 'GANG NEON', payout: 25000,
    intro: 'The bank holds twenty-five thousand. Agus opens the vault. We hold the plaza.',
    outro: 'The vault is empty and so is Darma\'s patience. Run.',
    stages: [
      { objective: 'Reach the bank plaza', target: { x: 90, z: -60 }, kind: 'goto' },
      { objective: 'Cut the alarm (hold E 5 s, Agus)', target: { x: 90, z: -85 }, kind: 'hold', timer: 5 },
      { objective: 'Neutralise the bank guards', target: { x: 90, z: -85 }, kind: 'defeat', counter: 9 },
      { objective: 'Crack the vault (hold 45 s)', target: { x: 90, z: -96 }, kind: 'hold', timer: 45 },
      { objective: 'Grab the cash', target: { x: 90, z: -96 }, kind: 'collect' },
      { objective: 'Get to the getaway van', target: { x: 90, z: -40 }, kind: 'goto' },
      { objective: 'Lose the heat — break their line of sight', target: { x: -270, z: 30 }, kind: 'escape' },
    ],
  },
  {
    id: 8, title: 'ASH ISLAND ARMS', act: 'III', giver: 'Agus',
    district: 'PULAU ABU', payout: 7500,
    intro: 'Darma\'s guns cross the red bridge tonight. Burn the crates, chase the dealer down.',
    outro: 'Three crates gone. The dealer will think twice.',
    stages: [
      { objective: 'Cross JEMBATAN MERAH', target: { x: 535, z: -360 }, kind: 'goto' },
      { objective: 'Destroy three weapon crates', target: { x: 620, z: -360 }, kind: 'destroy', counter: 3 },
      { objective: 'Chase down the dealer\'s MERAK COUPE', target: { x: 620, z: -320 }, kind: 'destroy' },
      { objective: 'Return to the mainland', target: { x: 450, z: -360 }, kind: 'deliver' },
    ],
  },
  {
    id: 9, title: 'BURN THE LEDGER', act: 'III', giver: 'Laras or Darma by branch',
    district: 'GANG NEON', payout: 9000,
    intro: 'The ledger names every debt in the bay. Burn it — or steal it for yourself.',
    outro: 'The ledger is ash. Darma\'s grip on the bay is ash too.',
    stages: [
      { objective: 'Break into the counting house', target: { x: 270, z: -180 }, kind: 'goto' },
      { objective: 'Find the ledger (three rooms)', target: { x: 270, z: -180 }, kind: 'collect', counter: 3 },
      { objective: 'Burn it or steal it', target: { x: 270, z: -180 }, kind: 'choose' },
      { objective: 'Survive SWAT ARUNIKA', target: { x: 270, z: -180 }, kind: 'defeat', counter: 4 },
      { objective: 'Escape by car', target: { x: 180, z: -90 }, kind: 'escape' },
    ],
  },
  {
    id: 10, title: 'DAWN AT THE DOCKS', act: 'III', giver: 'finale',
    district: 'PELABUHAN', payout: 12000,
    intro: 'Dawn at pier 9. Darma ends this — or we do. Seven days are up.',
    outro: 'Debt cleared. The bay is yours, Raka.',
    stages: [
      { objective: 'Reach pier 9 at dawn', target: { x: -400, z: 400 }, kind: 'goto' },
      { objective: 'Break Darma\'s guard line', target: { x: -400, z: 380 }, kind: 'defeat', counter: 6 },
      { objective: 'Chase Darma\'s RAJAWALI SUPER', target: { x: -300, z: 360 }, kind: 'destroy' },
      { objective: 'Final choice: pay the last instalment or hand him to Laras', target: { x: -400, z: 400 }, kind: 'choose' },
    ],
  },
];

// Start a story contract: set the mission state, show the intro card
// and the giver's line, and place the objective beacon.
function startStoryContract(id) {
  const contract = STORY_CONTRACTS[id - 1];
  if (!contract) {
    return;
  }
  const m = GAME.mission;
  m.id = id;
  m.stage = 1;
  m.counter = 0;
  m.timer = 0;
  m.done = [];
  mis_applyStage(contract, 1);
  if (typeof showMissionIntroCard === 'function') {
    showMissionIntroCard(contract);
  }
  GAME.ui.dialogue = {
    who: contract.giver.toUpperCase(), role: 'Contract giver',
    text: contract.intro,
  };
  if (typeof spawnObjectiveBeacon === 'function') {
    spawnObjectiveBeacon(contract.stages[0].target.x, contract.stages[0].target.z);
  }
}

// Apply one stage's objective, timer, counter and next line.
function mis_applyStage(contract, stage) {
  const m = GAME.mission;
  const s = contract.stages[stage - 1];
  if (!s) {
    return;
  }
  m.objective = s.objective;
  m.counter = 0;
  m.counterMax = s.counter || 0;
  m.timer = s.timer || 0;
  m.next = mis_nextLine(contract, stage);
}

// The NEXT line shown under the objective for a stage.
function mis_nextLine(contract, stage) {
  const next = contract.stages[stage];
  if (!next) {
    return 'Finish the contract';
  }
  if (contract.id === 1 && stage === 1) {
    return 'Pick up the fare · market gate';
  }
  if (contract.id === 7 && stage === 3) {
    return 'Crack the vault';
  }
  return next.objective;
}

// Advance to the next stage, or complete the contract when done.
function advanceMissionStage() {
  const m = GAME.mission;
  const contract = STORY_CONTRACTS[m.id - 1];
  if (!contract) {
    return;
  }
  m.done.push(m.stage);
  if (m.stage >= contract.stages.length) {
    completeContractAndPayOut();
    return;
  }
  m.stage += 1;
  mis_applyStage(contract, m.stage);
  if (typeof sayCrewChatter === 'function') {
    sayCrewChatter('SARI', 'Stage ' + m.stage + ' — ' + m.objective);
  }
}

// Check stage completion every step: arrivals, timers, counters.
function updateMissionObjectives(dt) {
  const m = GAME.mission;
  if (m.id === 0 || GAME.mode !== 'playing') {
    return;
  }
  const contract = STORY_CONTRACTS[m.id - 1];
  const stage = contract.stages[m.stage - 1];
  if (!stage) {
    return;
  }
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) {
      if (stage.kind === 'deliver' && m.id === 1) {
        failMissionAndRetry('The meter ran out.');
        return;
      }
      m.timer = 0;
    }
  }
  if (stage.kind === 'goto' || stage.kind === 'deliver') {
    const d = distanceBetween(GAME.player.x, GAME.player.z, stage.target.x, stage.target.z);
    m.next = mis_distanceLine(d, stage);
    if (d < 12) {
      advanceMissionStage();
    }
    return;
  }
  if (stage.kind === 'defeat' || stage.kind === 'destroy' || stage.kind === 'collect') {
    if (m.counterMax > 0 && m.counter >= m.counterMax) {
      advanceMissionStage();
    }
    return;
  }
  if (stage.kind === 'escape') {
    if (GAME.police.stars === 0) {
      advanceMissionStage();
    }
    return;
  }
  if (stage.kind === 'steal') {
    if (GAME.player.vehicle >= 0) {
      advanceMissionStage();
    }
    return;
  }
  if (stage.kind === 'hold') {
    if (inp_isDown('interact')) {
      m.timer -= dt;
      GAME.ui.promptProgress = 1 - (m.timer / (stage.timer || 1));
      if (m.timer <= 0) {
        advanceMissionStage();
      }
    }
    return;
  }
}

// The NEXT line with a live distance for goto stages.
function mis_distanceLine(d, stage) {
  const place = mis_placeName(stage.target);
  return place + ' · ' + Math.round(d) + ' m';
}

// A readable place name for a target coordinate.
function mis_placeName(target) {
  let best = null;
  let bestD = 9999;
  for (const place of CITY_PLACES) {
    const d = distanceBetween(target.x, target.z, place.x, place.z);
    if (d < bestD) {
      bestD = d;
      best = place.name;
    }
  }
  return bestD < 40 ? best : 'the objective';
}

// Pay out the contract, bank the cash and unlock the next one.
function completeContractAndPayOut() {
  const m = GAME.mission;
  const contract = STORY_CONTRACTS[m.id - 1];
  GAME.money += contract.payout;
  GAME.career.stats.cashEarned += contract.payout;
  GAME.career.stats.contractsDone += 1;
  GAME.debt = Math.max(0, GAME.debt - contract.payout);
  if (typeof awardRankPoints === 'function') {
    awardRankPoints(200 + contract.id * 40);
  }
  GAME.ui.dialogue = {
    who: contract.giver.toUpperCase(), role: 'Contract complete',
    text: contract.outro,
  };
  GAME.ui.banner = 'CONTRACT COMPLETE — $' + contract.payout.toLocaleString();
  m.done.push(m.stage);
  const nextId = m.id + 1;
  m.id = 0;
  m.stage = 0;
  m.objective = '';
  m.counter = 0;
  m.counterMax = 0;
  m.timer = 0;
  if (nextId <= 10) {
    m.next = 'Next contract: ' + STORY_CONTRACTS[nextId - 1].title;
  } else {
    if (typeof showEndingDebtCleared === 'function') {
      showEndingDebtCleared();
    }
  }
  if (typeof autosaveAtSafehouse === 'function') {
    autosaveAtSafehouse();
  }
}

// Fail the mission: keep the contract, restart its first stage.
function failMissionAndRetry(reason) {
  const m = GAME.mission;
  GAME.ui.banner = 'MISSION FAILED — ' + reason;
  GAME.ui.dialogue = { who: 'PAK AMIR', role: 'Father', text: 'Again, son. We do not give up.' };
  const contract = STORY_CONTRACTS[m.id - 1];
  m.stage = 1;
  m.counter = 0;
  m.timer = 0;
  if (contract) {
    mis_applyStage(contract, 1);
  }
}

// Choose a story branch: PAY DARMA or WEAR THE WIRE, and remember it.
function chooseStoryBranch(choice) {
  GAME.mission.branch = choice;
  if (choice === 'PAY DARMA') {
    GAME.debt = Math.max(0, GAME.debt - 5000);
    GAME.money = Math.max(0, GAME.money - 5000);
  } else {
    if (typeof receiveTextMessage === 'function') {
      receiveTextMessage('INSPECTOR LARAS', 'Wire is live. Do not let Darma see it.');
    }
  }
  advanceMissionStage();
}

// Unlock the next contract in the story order.
function unlockNextContract() {
  const done = GAME.career.stats.contractsDone;
  return clampNumber(done + 1, 1, 10);
}
