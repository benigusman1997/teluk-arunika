// Career: rank points, the five ranks and their perks, district standing, and the statistics block.
TA.rankInfo = function () {
  var rp = TA.state.rp, R = TA.RANKS, i = 0;
  while (i < R.length - 1 && rp >= R[i + 1].rp) i++;
  var cur = R[i], next = R[i + 1] || null;
  return {
    n: cur.n, name: cur.name, perk: cur.perk, rp: rp, floor: cur.rp, ceil: next ? next.rp : cur.rp,
    frac: next ? (rp - cur.rp) / (next.rp - cur.rp) : 1,
    line: 'RANK ' + cur.n + ' · ' + cur.name, numbers: next ? rp + ' / ' + next.rp + ' RP' : rp + ' RP · MAX'
  };
};

TA.addRP = function (n) {
  var before = TA.rankInfo().n;
  TA.state.rp = Math.max(0, TA.state.rp + Math.round(n));
  var after = TA.rankInfo();
  if (after.n > before) {
    TA.showBanner('RANK UP', after.line + ' — PERK: ' + after.perk.toUpperCase(), '#ffd166');
    if (TA.sfx) TA.sfx('win', 0.7);
  }
};

TA.addStanding = function (districtId, n) {
  var st = TA.state.standing;
  st[districtId] = TA.clamp((st[districtId] || 0) + n, 0, 100);
};

TA.standingWord = function (value) { return TA.STANDING_WORDS[Math.min(4, Math.floor(value / 20.01))]; };

// Location banner data: district, street and the player's standing there.
TA.locationInfo = function () {
  var p = TA.player, d = TA.districtAt(p.x, p.z), v = Math.round(TA.state.standing[d.id] || 0);
  return { district: d.name, street: TA.streetAt(p.x, p.z), standing: v, word: TA.standingWord(v), tint: d.tint, id: d.id };
};

// Rows for the career / statistics block on the map screen.
TA.careerStats = function () {
  var s = TA.state, st = s.stats;
  return [
    ['Contracts done', s.missionsDone + ' / 10'], ['Debt remaining', TA.fmtMoney(s.debt)], ['Total earned', TA.fmtMoney(st.earned)],
    ['Distance', (st.distance / 1000).toFixed(1) + ' km'], ['Cars stolen', String(st.carsStolen)], ['Takedowns', String(st.kills)],
    ['Stars escaped', String(st.starsEscaped)], ['Busted / wasted', st.busted + ' / ' + st.wasted], ['Coins / stunts', s.coins.length + '/12 · ' + s.ramps.length + '/5'],
    ['Races best', s.bestRace.map(function (t) { return t ? t + 's' : '—'; }).join(' · ')], ['Fares · exports · wrecks', s.fares + ' · ' + s.exports + ' · ' + s.wrecks],
    ['Play time', Math.floor(st.playMinutes) + ' min']
  ];
};

// Standing drifts back toward neutral very slowly, and rises a little wherever the player spends time lawfully.
TA.updateCareer = function (dt) {
  if (TA.run.frame % 600 !== 0) return;
  var here = TA.districtAt(TA.player.x, TA.player.z).id;
  if (TA.run.wanted === 0) TA.addStanding(here, 1);
  else TA.addStanding(here, -1);
};
