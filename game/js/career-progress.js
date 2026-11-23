// career-progress.js — rank points, ranks and perks, district standing, the seven-day debt clock.
var TA = window.TA || (window.TA = {});
function awardRankPoints(n) {
  var S = TA.S, before = currentRank().name; S.rankPts += n;
  var now = currentRank(); if (now.name !== before) { TA.bigWord = { text: 'RANK UP — ' + now.name, t: 3 }; TA.notify('PERK UNLOCKED: ' + now.perk); }
}
function changeDistrictStanding(id, n) {
  var st = TA.S.standing; st[id] = TA.clamp((st[id] || 0) + n, -50, 100);
}
function advanceDebtDay(dt) {
  var S = TA.S; S.dayT += dt; S.clock = (17.2 + S.dayT / TA.CFG.DAY_SECONDS * 24) % 24;
  if (S.dayT >= TA.CFG.DAY_SECONDS) {
    S.dayT = 0; S.day++;
    if (S.day > TA.CFG.DAYS) { TA.showEndingDebtCleared(); return; }
    TA.bigWord = { text: 'DAY ' + S.day + ' OF 7 — $' + Math.max(0, TA.CFG.DEBT - S.money) + ' STILL OWED', t: 4 };
  }
}
function currentRank() {
  var R = TA.CFG.RANKS, r = R[0]; R.forEach(function (x) { if (TA.S.rankPts >= x.pts) r = x; }); return r;
}
TA.awardRankPoints = awardRankPoints; TA.changeDistrictStanding = changeDistrictStanding; TA.advanceDebtDay = advanceDebtDay; TA.currentRank = currentRank;
