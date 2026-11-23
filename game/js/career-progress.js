// Career: rank points, promotions, district standing, the debt day
// and the statistics the save screen and HUD read.

// Career ranks: rank, name, RP needed, perk.
const CAREER_RANKS = [
  { rank: 1, name: 'KERNET', rp: 0, perk: 'none' },
  { rank: 2, name: 'SOPIR', rp: 200, perk: 'payouts +10%' },
  { rank: 3, name: 'TANGAN KANAN', rp: 800, perk: 'respray half price' },
  { rank: 4, name: 'JURAGAN', rp: 2000, perk: 'armour cap 150, crew cooldowns -20%' },
  { rank: 5, name: 'RAJA TELUK', rp: 4500, perk: 'free garage repairs' },
];

// Award rank points and promote when a threshold is crossed.
function awardRankPoints(points) {
  GAME.career.rp += points;
  const rank = car_rankForRp(GAME.career.rp);
  if (rank.rank > GAME.career.rank) {
    promoteToNextRank(rank);
  }
}

// The rank record for a rank-points total.
function car_rankForRp(rp) {
  let current = CAREER_RANKS[0];
  for (const rank of CAREER_RANKS) {
    if (rp >= rank.rp) {
      current = rank;
    }
  }
  return current;
}

// Promote to the next rank with a banner and a perk note.
function promoteToNextRank(rank) {
  GAME.career.rank = rank.rank;
  GAME.ui.banner = 'PROMOTED — ' + rank.name + ' · PERK: ' + rank.perk;
  GAME.ui.dialogue = {
    who: 'PAK AMIR', role: 'Father',
    text: rank.name + '! Your mother would be proud, son.',
  };
}

// Change standing in a district, clamped to 0-100.
function changeDistrictStanding(district, delta) {
  const standing = GAME.career.standing;
  if (standing[district] === undefined) {
    return;
  }
  standing[district] = clampNumber(standing[district] + delta, 0, 100);
  const word = standingWordFor(standing[district]);
  if (delta > 0) {
    GAME.ui.banner = district + ' — ' + word + ' ' + standing[district];
  }
}

// The standing word for a 0-100 value.
function standingWordFor(value) {
  if (value < 20) {
    return 'HOSTILE';
  }
  if (value < 40) {
    return 'WARY';
  }
  if (value < 60) {
    return 'NEUTRAL';
  }
  if (value < 80) {
    return 'RESPECTED';
  }
  return 'LEGEND';
}

// Advance the debt day at midnight: interest, messages, new export list.
function advanceDebtDay() {
  if (GAME.time.day > 7) {
    GAME.ui.banner = 'SEVEN DAYS ARE UP';
    if (GAME.debt > 0) {
      GAME.ui.dialogue = {
        who: 'DARMA WIJAYA', role: 'Syndicate boss',
        text: 'Time is up, Raka. The workshop is mine now.',
      };
    }
    return;
  }
  const interest = Math.floor(GAME.debt * 0.02);
  GAME.debt += interest;
  GAME.ui.banner = 'DAY ' + GAME.time.day + ' — DEBT $' + GAME.debt.toLocaleString();
  receiveTextMessage('DARMA WIJAYA', 'Day ' + GAME.time.day + ', Raka. $'
    + GAME.debt.toLocaleString() + ' left. Don\'t make me visit your father.');
  if (typeof autosaveAtSafehouse === 'function') {
    autosaveAtSafehouse();
  }
}

// Record one statistic: distance, steals, contracts, races, cash,
// coins and stunts are all tracked for the save summary.
function recordStatistic(key, amount) {
  const stats = GAME.career.stats;
  if (stats[key] === undefined) {
    return;
  }
  stats[key] += amount || 1;
  if (key === 'bestPursuit' && amount > stats.bestPursuit) {
    stats.bestPursuit = amount;
  }
}

// Track the longest pursuit survived, for the stats screen.
function car_trackPursuit(dt) {
  if (GAME.police.stars > 0) {
    GAME._pursuitTime = (GAME._pursuitTime || 0) + dt;
    if (GAME._pursuitTime > GAME.career.stats.bestPursuit) {
      GAME.career.stats.bestPursuit = Math.floor(GAME._pursuitTime);
    }
  } else {
    GAME._pursuitTime = 0;
  }
}
