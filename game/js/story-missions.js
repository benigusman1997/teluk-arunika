// story-missions.js — three acts, ten contracts, stages, objectives, payouts, the branch and the ending.
var TA = window.TA || (window.TA = {});
function startStoryContract(i) {
  var S = TA.S, c = TA.CFG.CONTRACTS[i];
  S.contract = i; S.stage = 0; S.kills = 0;
  TA.playCutsceneDialogue(c.lines, function () { TA.showMissionIntroCard(c, i); setupMissionStage(); });
}
function advanceMissionStage(type, arg) {
  var S = TA.S; if (S.stage < 0) return;
  var c = TA.CFG.CONTRACTS[S.contract], st = c.stages[S.stage];
  if (st.t !== type || (type === 'steal' && st.kind && arg.kind !== st.kind)) return;
  S.stage++; TA.playCash();
  if (S.stage < c.stages.length) { TA.notify('OBJECTIVE COMPLETE'); setupMissionStage(); return; }
  var pay = Math.round(c.pay * (S.rankPts >= 300 ? 1.1 : 1));
  S.money += pay; S.done.push(S.contract); S.stage = -1; TA.awardRankPoints(c.pts); TA.changeDistrictStanding(TA.districtAt(TA.player.x, TA.player.z).id, 5);
  if (c.crew) TA.recruitCrewMember(c.crew);
  TA.bigWord = { text: 'CONTRACT PASSED  +$' + pay, t: 3.5 }; TA.autosaveAtSafehouse();
  if (c.final) showEndingDebtCleared(); else S.contract++;
}
function runBankArunikaJob(n, x, z) {
  var cov = TA.landmarks.cover, out = [];
  for (var k = 0; k < n; k++) {
    var g = TA.spawnPerson('guard', x - 14 + k * 7, z - 5 - (k % 2) * 3, { shirt: 0x8d939c, pants: 0x4a4e57, hat: 0x5a5f69, hp: 80, gun: true, bar: true });
    g.cover = true; g.t = k * 0.7; g.mission = true; out.push(g);
  }
  TA.raiseWantedLevel(3.2, 'ARMED ROBBERY — BANK ARUNIKA'); return out;
}
function showEndingDebtCleared() {
  var S = TA.S, paid = S.money >= TA.CFG.DEBT;
  S.ending = paid ? (S.branch === 'deal' ? 'THE DEAL' : 'DEBT CLEARED') : 'STILL OWING'; S.mode = 'ending';
  TA.showScreen('<div class="panel end"><h1>' + S.ending + '</h1><p>' + (paid ? 'Day ' + S.day + '. Raka pays the Naga Laut every rupiah and Teluk Arunika wakes up without knowing his name.' : 'The week ends $' + (TA.CFG.DEBT - S.money) + ' short. The bay is big; the Naga Laut are patient.') +
    '</p><p>Contracts ' + S.done.length + '/10 · Cars stolen ' + S.stats.stolen + ' · Wrecks ' + S.stats.wrecks + ' · Rank ' + TA.currentRank().name + '</p><button data-act="free">KEEP ROAMING</button><button data-act="title">TITLE SCREEN</button></div>');
}
function setupMissionStage() {
  var S = TA.S, c = TA.CFG.CONTRACTS[S.contract], st = c.stages[S.stage];
  TA.setBeacon(st.x === undefined ? null : st.x, st.z);
  if (st.t === 'kill') {
    if (S.contract === 7) runBankArunikaJob(st.n, st.x, st.z);
    else for (var k = 0; k < st.n; k++) { var e = TA.spawnPerson('enemy', st.x + (k - st.n / 2) * 4, st.z + (k % 2) * 5, { shirt: 0x7a1f1f, pants: 0x222222, hat: 0x111111, hp: 70, gun: true, bar: true }); e.cover = k % 2 === 0; e.mission = true; }
  }
  if (st.t === 'escape' && S.wanted < st.stars) TA.raiseWantedLevel(st.stars - S.heat + 0.2, 'CONTRACT HEAT');
  if (c.branch && S.stage === 1) S.branch = TA.player.x < 250 ? 'deal' : 'fight';
}
function updateMissions(dt) {
  var S = TA.S, P = TA.player;
  if (S.stage < 0) {
    var c = TA.CFG.CONTRACTS[S.contract]; if (!c || S.done.indexOf(S.contract) >= 0) { TA.setBeacon(null); return; }
    TA.setBeacon(c.x, c.z); if (Math.hypot(P.x - c.x, P.z - c.z) < 5 && S.wanted === 0) startStoryContract(S.contract); return;
  }
  var st = TA.CFG.CONTRACTS[S.contract].stages[S.stage];
  if (st.t === 'goto' && Math.hypot((P.car || P).x - st.x, (P.car || P).z - st.z) < 7) advanceMissionStage('goto');
  if (st.t === 'kill' && !TA.people.some(function (p) { return p.mission && !p.dead; })) advanceMissionStage('kill');
  if (st.t === 'escape' && S.wanted === 0) advanceMissionStage('escape');
}
TA.startStoryContract = startStoryContract; TA.advanceMissionStage = advanceMissionStage; TA.runBankArunikaJob = runBankArunikaJob;
TA.showEndingDebtCleared = showEndingDebtCleared; TA.updateMissions = updateMissions;
