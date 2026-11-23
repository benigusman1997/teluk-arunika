// Career: rank points and five ranks, district standing, money, and the seven-day debt clock.

function awardRankPoints(points, reason) {
  const before = currentRankIndex();
  G.rp += points;
  const after = currentRankIndex();
  if (after > before) {
    showBanner('RANK UP - ' + RANKS[after].name, RANKS[after].perk, 3.5);
    playUiSound('complete');
    if (after >= 2) G.armour = Math.max(G.armour, 25);
  } else if (points >= 20) W.lastAward = { text: '+' + points + ' RP ' + reason, t: 3 };
}

function changeDistrictStanding(districtId, delta) {
  const before = G.standing[districtId];
  G.standing[districtId] = clamp(before + delta, 0, 100);
  const a = standingWord(before), b = standingWord(G.standing[districtId]);
  if (a !== b) showBanner(DISTRICTS.find((d) => d.id === districtId).name + ': ' + b, delta > 0 ? 'The district has your back' : 'People here remember what you did', 2.4);
}

function advanceDebtDay() {
  G.day++;
  // Darma adds interest every morning the debt is still open.
  if (G.debt > 0) G.debt = Math.round(G.debt * 1.02);
  if (G.day > 7 && G.debt > 0 && G.contractsDone < CONTRACTS.length) {
    G.day = 7;
    G.mode = 'ending';
    G.ending = 'lost';
    showEndingScreen(ENDINGS.lost);
    return;
  }
  showBanner('DAY ' + G.day + ' OF 7', G.debt > 0 ? 'Debt with interest: ' + formatMoney(G.debt) : 'The debt is cleared', 3);
  sayChatter('darma', G.day >= 6 ? 'The week is almost gone, Raka. So is my patience.' : 'Another sunrise, another two percent. Tick tock.', 4);
}

function currentRankIndex() {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (G.rp >= RANKS[i].rp) r = i;
  return r;
}

function standingWord(value) {
  return STANDING_WORDS[Math.min(5, Math.floor(value / 18))];
}

function addMoney(amount, reason) {
  G.money = Math.max(0, G.money + amount);
  if (amount > 0) G.stats.earned += amount;
  W.lastMoney = { text: (amount >= 0 ? '+' : '-') + formatMoney(Math.abs(amount)) + ' ' + reason, t: 3 };
}

function updateDayClock(dt) {
  // One game day lasts 24 real minutes; midnight rolls the debt clock.
  const before = G.clock;
  G.clock = (G.clock + dt) % 1440;
  G.playTime += dt;
  if (G.clock < before) advanceDebtDay();
  if (Math.floor(G.clock / 5) !== Math.floor(before / 5)) applyTimeOfDay(G.clock);
  if (W.lastAward) { W.lastAward.t -= dt; if (W.lastAward.t <= 0) W.lastAward = null; }
  if (W.lastMoney) { W.lastMoney.t -= dt; if (W.lastMoney.t <= 0) W.lastMoney = null; }
}
