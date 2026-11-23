// The story: 3 acts, 10 syndicate contracts, each staged, with intro dialogue, objectives, the bank job,
// the branch in Contract 5 and the ending. A small data-driven stage engine runs all of them.
TA.ACTS = ['', 'ACT I — THE DEBT', 'ACT II — THE SYNDICATE', 'ACT III — DAWN'];

// Stage types: goto, enter, kill, wait, collect, lose, destroy, choice. *asterisks* mark the highlighted phrase.
TA.MISSIONS = [
  { name: 'First Fare', act: 1, giver: 'PAK AMIR', at: 'workshop', pay: 600, rp: 40,
    intro: [['PAK AMIR', 'The taxi is yours tonight, Raka. Earn, and keep your head down.'], ['RAKA', 'Darma wants fifty grand in seven days. One fare will not do it.'], ['PAK AMIR', 'Then drive like the meter is on fire.']],
    stages: [
      { title: 'TAKE THE TAXI', obj: 'Get in the *TAKSI KUNING*', type: 'enter', car: { key: 'taxi', x: -170, z: 5.5, h: -1.5708 } },
      { title: 'PICK UP THE FARE', obj: 'Pick up Bu Ratna on *Jl. Merdeka*', type: 'goto', x: 5, z: -100, r: 7, vehicle: true, say: ['sari', 'First fare of the night. Do not scare her.'] },
      { title: 'BEAT THE METER', obj: 'Drive her to *Pantai Boulevard*', type: 'goto', x: 250, z: 207, r: 8, vehicle: true, time: 100 }
    ] },
  { name: 'Night Market Shakedown', act: 1, giver: 'PAK AMIR', at: 'market', pay: 900, rp: 50,
    intro: [['PAK AMIR', "Wijaya's collectors are squeezing the stalls again."], ['RAKA', 'How many?'], ['PAK AMIR', 'Four. Send them home lighter.']],
    stages: [
      { title: 'FIND THE COLLECTORS', obj: 'Walk to the *Pasar Senja* stalls', type: 'goto', x: -229, z: -84, r: 6 },
      { title: 'SEND A MESSAGE', obj: 'Take down the *collectors*', type: 'kill', label: 'COLLECTORS', foes: [[-231, -96, 0], [-229, -104, 0], [-250, -110, 1], [-232, -70, 0]], kind: 'thug' },
      { title: 'TAKE IT BACK', obj: 'Collect the *protection money*', type: 'collect', items: [[-231, -100], [-246, -110], [-230, -74]] },
      { title: 'BACK TO AMIR', obj: "Return to *Pak Amir's Workshop*", type: 'goto', x: -180, z: -6, r: 6 }
    ] },
  { name: 'The Harbour Key', act: 1, giver: 'SARI', at: 'workshop', pay: 1500, rp: 60, unlock: 'sari',
    intro: [['SARI', "The harbour master's sedan has the gate key in the glovebox."], ['RAKA', 'And you want it copied before he notices.'], ['SARI', 'Gaspol. I drive next time.']],
    stages: [
      { title: 'STEAL THE SEDAN', obj: "Take the harbour master's *ARUNIKA SEDAN*", type: 'enter', car: { key: 'sedan', x: -300, z: 125.5, h: 1.5708, color: 0xe9ecef } },
      { title: 'TO THE DOCK', obj: 'Drive to *Dermaga 4*', type: 'goto', x: -300, z: 262, r: 8, vehicle: true },
      { title: 'COPY THE KEY', obj: 'Hold position while Sari *copies the key*', type: 'wait', x: -300, z: 262, r: 12, secs: 6, wanted: 2 },
      { title: 'LOSE THE HEAT', obj: 'Shake the *TAPD*', type: 'lose' }
    ] },
  { name: 'Container 47', act: 2, giver: 'DARMA WIJAYA', at: 'dock', pay: 2500, rp: 80,
    intro: [['DARMA WIJAYA', 'Container forty-seven is mine. The men standing on it are not.'], ['RAKA', 'And the debt?'], ['DARMA WIJAYA', 'Shrinks when the truck arrives.']],
    stages: [
      { title: 'CLEAR THE QUAY', obj: 'Take out the *harbour gang*', type: 'kill', label: 'GANG', foes: [[-312, 262, 1], [-290, 264, 1], [-276, 260, 2], [-322, 258, 1], [-300, 244, 1]], kind: 'thug' },
      { title: 'OPEN CONTAINER 47', obj: 'Break the seal on *Container 47*', type: 'wait', x: -286, z: 262, r: 6, secs: 5 },
      { title: 'TAKE THE TRUCK', obj: 'Get in the *BANTENG HAULER*', type: 'enter', car: { key: 'hauler', x: -300, z: 252, h: 3.1416 } },
      { title: 'DELIVER', obj: 'Drive the load to *Wijaya Logistics*', type: 'goto', x: -374, z: 62, r: 9, vehicle: true, wanted: 2 }
    ] },
  { name: 'The Choice', act: 2, giver: 'DARMA WIJAYA', at: 'ledger', pay: 1200, rp: 80, unlock: 'budi',
    intro: [['DARMA WIJAYA', 'You are useful, courier. Pay a little now and I stay patient.'], ['BUDI', '(radio) Or keep the cargo money and we vanish. Your call.'], ['RAKA', 'Everyone in this bay wants a cut.']],
    stages: [
      { title: 'FACE DARMA', obj: 'Meet Darma at the *loading bay*', type: 'goto', x: -374, z: 84, r: 6 },
      { title: 'THE CHOICE', obj: '*Pay Darma* or *betray him*', type: 'choice', options: [['1', 'PAY DARMA $2,000 — he stays patient', 'pay'], ['2', 'BETRAY HIM — keep $3,000, TAPD tipped off', 'betray']] },
      { title: 'WALK AWAY', obj: 'Get back to *Loteng Neon*', type: 'goto', x: 130, z: -158, r: 7 }
    ] },
  { name: 'Smoke on the Flyover', act: 2, giver: 'SARI', at: 'workshop', pay: 4000, rp: 110,
    intro: [['SARI', 'Three BANTENG HAULERS, nose to tail on the Tol Layang, heading for the port.'], ['RAKA', 'Then they do not reach it.'], ['SARI', 'Take the GT. Ramp is north of Jl. Dermaga.']],
    stages: [
      { title: 'TAKE THE GT', obj: 'Get in the *PELABUHAN GT*', type: 'enter', car: { key: 'gt', x: -190, z: 5.5, h: -1.5708, color: 0xff6b5e } },
      { title: 'REACH THE RAMP', obj: 'Drive up the *Tol Layang* ramp', type: 'goto', x: -300, z: -330, r: 9, vehicle: true },
      { title: 'STOP THE CONVOY', obj: 'Wreck the *BANTENG HAULER* convoy before the port', type: 'destroy', label: 'HAULERS', convoy: { key: 'hauler', n: 3, x: 500, z: -327, gap: 26, path: [[-330, -327], [-360, -300], [-360, 100]], speed: 15 }, wanted: 2 },
      { title: 'LOSE THE HEAT', obj: 'Shake the *TAPD*', type: 'lose', wanted: 3 }
    ] },
  { name: 'The Bank Arunika Job', act: 2, giver: 'DARMA WIJAYA', at: 'safe3', pay: 25000, rp: 220, unlock: 'agus',
    intro: [['DARMA WIJAYA', 'Bank Arunika holds my ledger money. Bring it and half your debt is smoke.'], ['AGUS', 'Alarm is on the east wall. Thirty seconds, I can blind it.'], ['SARI', 'Van is ready. Do not make me wait.']],
    stages: [
      { title: 'REACH THE BANK', obj: 'Drive the van to *BANK ARUNIKA*', type: 'goto', x: 60, z: -8, r: 9, car: { key: 'van', x: 136, z: -150, h: 3.1416 } },
      { title: 'CUT THE ALARM', obj: 'Hold at the *alarm box* on the east wall', type: 'wait', x: 99, z: -62, r: 5, secs: 5 },
      { title: 'TAKE OUT THE GUARDS', obj: 'Clear the *bank guards*', type: 'kill', label: 'GUARDS', wanted: 3, kind: 'guard',
        foes: [[36, -46, 1], [52, -47, 2], [68, -47, 1], [84, -46, 2], [44, -36, 1], [76, -36, 1], [60, -41, 3], [30, -30, 1], [90, -30, 2]] },
      { title: 'CRACK THE VAULT', obj: 'Hold the *vault door* while Agus cracks it', type: 'wait', x: 60, z: -52, r: 5, secs: 8, wanted: 4 },
      { title: 'GRAB THE CASH', obj: 'Grab the *cash bags*', type: 'collect', items: [[55, -51], [60, -50], [65, -51]] },
      { title: 'ESCAPE', obj: 'Get to *Pantai Boulevard*', type: 'goto', x: 240, z: 207, r: 12, wanted: 4 },
      { title: 'LOSE THE HEAT', obj: 'Break line of sight and *lose the heat*', type: 'lose', wanted: 4 }
    ] },
  { name: 'Ash Island Arms', act: 3, giver: 'BUDI', at: 'workshop', pay: 6000, rp: 130,
    intro: [['BUDI', "Darma's guns sit in a depot on Pulau Abu, across the red bridge."], ['RAKA', 'Then tonight they are ours.'], ['BUDI', 'Mind the ash. And the men with rifles.']],
    stages: [
      { title: 'CROSS THE BRIDGE', obj: 'Reach the depot on *Pulau Abu*', type: 'goto', x: 660, z: -300, r: 10 },
      { title: 'CLEAR THE DEPOT', obj: 'Take out the *depot crew*', type: 'kill', label: 'CREW', kind: 'thug', foes: [[650, -256, 2], [672, -254, 4], [690, -270, 1], [628, -262, 2], [662, -240, 4], [700, -300, 1]] },
      { title: 'LOAD THE CRATES', obj: 'Collect the *weapon crates*', type: 'collect', items: [[656, -256], [668, -256], [662, -250]] },
      { title: 'BRING THEM HOME', obj: "Deliver to *Pak Amir's Workshop*", type: 'goto', x: -180, z: -6, r: 8, wanted: 3 }
    ] },
  { name: 'Burn the Ledger', act: 3, giver: 'AGUS', at: 'safe2', pay: 8000, rp: 150,
    intro: [['AGUS', 'Every debt in this bay is one book in his office.'], ['RAKA', 'Paper burns.'], ['AGUS', 'So do careers. Go.']],
    stages: [
      { title: 'TO THE OFFICE', obj: 'Reach *Wijaya Logistics*', type: 'goto', x: -374, z: 62, r: 9 },
      { title: 'BREAK IN', obj: "Take out Darma's *enforcers*", type: 'kill', label: 'ENFORCERS', kind: 'thug', foes: [[-376, 50, 2], [-378, 74, 4], [-372, 90, 3], [-376, 30, 2], [-380, 100, 4]] },
      { title: 'BURN IT', obj: 'Hold the doorway while the *ledger burns*', type: 'wait', x: -380, z: 62, r: 6, secs: 6, wanted: 3 },
      { title: 'LOSE THE HEAT', obj: 'Vanish before the *TAPD* seals the port', type: 'lose', wanted: 4 }
    ] },
  { name: 'Dawn at the Docks', act: 3, giver: 'DARMA WIJAYA', at: 'dock', pay: 15000, rp: 300,
    intro: [['DARMA WIJAYA', 'You burned my book. Come and burn with it.'], ['SARI', 'We are all here, Raka. Last one.'], ['RAKA', 'Seven days. It ends at sunrise.']],
    stages: [
      { title: 'THE LAST STAND', obj: "Take out *Darma's crew* on the quay", type: 'kill', label: 'CREW', kind: 'thug', foes: [[-330, 262, 4], [-316, 258, 2], [-284, 262, 4], [-270, 258, 3], [-300, 246, 2], [-340, 244, 4], [-262, 264, 5]] },
      { title: 'DARMA', obj: 'Face *Darma Wijaya* at the water', type: 'goto', x: -300, z: 265, r: 5 },
      { title: 'THE BAY', obj: '*Take the bay* or *leave it*', type: 'choice', options: [['1', 'TAKE THE BAY — run Teluk Arunika yourself', 'rule'], ['2', 'LEAVE AT DAWN — the boat is waiting at the pier', 'leave']] },
      { title: 'SUNRISE', obj: 'Walk to the end of the *Pantai pier*', type: 'goto', x: 180, z: 338, r: 5 }
    ] }
];

TA.nextMissionIndex = function () { return TA.state.missionsDone < TA.MISSIONS.length ? TA.state.missionsDone : -1; };

// Step 1: the intro card (a cutscene). Step 2, after F / Enter: the first stage.
TA.offerMission = function (index) {
  var m = TA.MISSIONS[index];
  TA.run.mode = 'cutscene';
  TA.releasePointer();
  TA.showIntroCard(index, m);
};

TA.startMission = function (index, stage) {
  var m = TA.MISSIONS[index];
  TA.run.mission = { index: index, def: m, stage: -1, foes: [], items: [], cars: [], progress: 0, timer: 0, count: 0, total: 0 };
  TA.run.mode = 'playing';
  TA.gotoStage(stage || 0);
  TA.showBanner('CONTRACT ' + (index + 1) + ' — ' + m.name.toUpperCase(), TA.ACTS[m.act], '#ffd166');
};

TA.gotoStage = function (n) {
  var ms = TA.run.mission, st = ms.def.stages[n], i;
  TA.clearStageEntities(false);
  ms.stage = n; ms.progress = 0; ms.timer = st.time || 0; ms.count = 0; ms.total = 0; ms.choice = null;
  if (st.car) { var c = TA.spawnCar(st.car.key, st.car.x, st.car.z, st.car.h, 'parked', st.car.color); c.mission = true; c.keep = true; ms.cars.push(c); ms.car = c; TA.addMarker(c, 0xffd166); }
  if (st.foes) {
    st.foes.forEach(function (f, k) { var g = TA.spawnGunman(st.kind || 'thug', f[0], f[1], f[2], st.label); g.sight = 40; ms.foes.push(g); TA.addMarker(g, 0xff3b30, true); });
    ms.total = st.foes.length;
  }
  if (st.items) { st.items.forEach(function (it) { ms.items.push(TA.addPickup(it[0], it[1], 0xffd166)); }); ms.total = st.items.length; }
  if (st.convoy) {
    var cv = st.convoy;
    for (i = 0; i < cv.n; i++) { var hc = TA.spawnCar(cv.key, cv.x + i * cv.gap, cv.z, -Math.PI / 2, 'mission'); hc.driver = true; hc.target = true; hc.keep = true; hc.path = cv.path; hc.pathI = 0; hc.cruise = cv.speed; ms.cars.push(hc); TA.addMarker(hc, 0xff3b30, true); }
    ms.total = cv.n;
  }
  if (st.wanted && TA.run.wanted < st.wanted) { TA.run.incident = ms.index === 6 ? 'ARMED ROBBERY' : TA.INCIDENTS[st.wanted]; TA.setWanted(st.wanted); }
  if (st.say) TA.say(st.say[0], st.say[1]);
  if (st.x !== undefined) TA.setBeacon(st.x, st.z); else TA.setBeacon(null);
  if (n > 0) { TA.showBanner('STAGE ' + (n + 1) + '/' + ms.def.stages.length, st.title, '#72efdd'); if (TA.sfx) TA.sfx('stage', 0.7); }
};

TA.clearStageEntities = function (all) {
  var ms = TA.run.mission;
  if (!ms) return;
  ms.foes.forEach(function (g) { if (!g.dead && !g.removed) TA.removePerson(g); });
  ms.items.forEach(function (it) { TA.removePickup(it); });
  ms.cars.forEach(function (c) { TA.removeMarkerFor(c); c.mission = c.mission && !all; if (all && !c.removed && TA.player.car !== c && (c.target || c.dead)) TA.removeCar(c); });
  ms.foes = []; ms.items = [];
  if (all) ms.cars = [];
};

// Text helpers for the HUD mission card.
TA.missionObjective = function () {
  var ms = TA.run.mission;
  if (!ms) return null;
  var st = ms.def.stages[ms.stage], next = ms.def.stages[ms.stage + 1], obj = st.obj, extra = '';
  if (st.type === 'kill' || st.type === 'destroy' || st.type === 'collect') extra = st.type === 'collect' ? ms.count + '/' + ms.total : (st.label || 'TARGETS') + ' ' + ms.count + '/' + ms.total;
  if (st.type === 'wait') extra = Math.round(ms.progress / st.secs * 100) + '%';
  var target = TA.stageTarget(), p = TA.player;
  return {
    head: 'CONTRACT ' + (ms.index + 1) + '/10 · ' + TA.ACTS[ms.def.act], stage: 'STAGE ' + (ms.stage + 1) + '/' + ms.def.stages.length, title: st.title + (extra && st.type !== 'wait' ? ' — ' + extra : ''),
    obj: obj, extra: extra, dist: target ? Math.round(TA.dist(p.x, p.z, target.x, target.z)) : null,
    next: next ? next.title : 'CONTRACT COMPLETE', contract: ms.def.giver + ' · ' + TA.fmtMoney(ms.def.pay), timer: st.time ? Math.ceil(ms.timer) : null,
    progress: st.type === 'wait' ? ms.progress / st.secs : null
  };
};

// Where the current stage wants the player to go (also drives the beacon, minimap blip and route).
TA.stageTarget = function () {
  var ms = TA.run.mission;
  if (!ms) { var ni = TA.nextMissionIndex(); return ni >= 0 ? TA.PLACES[TA.MISSIONS[ni].at] : null; }
  var st = ms.def.stages[ms.stage], p = TA.player, best = null, bd = 1e9;
  if (st.type === 'enter' && ms.car) return ms.car;
  if (st.type === 'goto' && st.car && ms.car && !p.car && ms.stage === 0 && TA.dist(p.x, p.z, st.x, st.z) > 60) return ms.car;
  if (st.x !== undefined) return st;
  var list = st.type === 'kill' ? ms.foes : st.type === 'collect' ? ms.items : st.type === 'destroy' ? ms.cars.filter(function (c) { return c.target; }) : [];
  list.forEach(function (o) { if (!o.dead && !o.taken) { var d = TA.dist(p.x, p.z, o.x, o.z); if (d < bd) { bd = d; best = o; } } });
  return best;
};

TA.updateMission = function (dt) {
  var ms = TA.run.mission, p = TA.player;
  if (!ms) { TA.checkMissionMarker(); return; }
  var st = ms.def.stages[ms.stage], done = false, near = st.x !== undefined ? TA.dist(p.x, p.z, st.x, st.z) < st.r : false;
  if (st.time) { ms.timer -= dt; if (ms.timer <= 0) { TA.failMission('Out of time.'); return; } }
  switch (st.type) {
    case 'enter': done = p.car === ms.car; if (ms.car.dead) { TA.failMission('The ' + ms.car.name + ' was destroyed.'); return; } break;
    case 'goto': done = near && (!st.vehicle || !!p.car) && (!p.car || Math.abs(p.car.speed) < 14); break;
    case 'wait': if (near) ms.progress += dt; else ms.progress = Math.max(0, ms.progress - dt * 0.5); done = ms.progress >= st.secs; if (near) TA.run.prompt = st.title + '… ' + Math.round(ms.progress / st.secs * 100) + '%'; break;
    case 'kill': ms.count = ms.foes.filter(function (g) { return g.dead; }).length; done = ms.count >= ms.total; break;
    case 'collect': ms.items.forEach(function (it) { if (!it.taken && TA.dist(p.x, p.z, it.x, it.z) < 2.2) { TA.removePickup(it); it.taken = true; ms.count++; if (TA.sfx) TA.sfx('coin', 0.7); } }); done = ms.count >= ms.total; break;
    case 'lose': done = TA.run.wanted === 0; break;
    case 'destroy': TA.updateConvoy(ms, dt); ms.count = ms.cars.filter(function (c) { return c.target && c.dead; }).length; done = ms.count >= ms.total; if (ms.escaped) { TA.failMission('The convoy reached the port.'); return; } break;
    case 'choice':
      TA.run.prompt = st.options.map(function (o) { return '[' + o[0] + '] ' + o[1]; }).join('   ');
      st.options.forEach(function (o) { if (TA.keyHit('Digit' + o[0])) ms.choice = o[2]; });
      if (ms.choice) { TA.applyChoice(ms.choice); done = true; }
      break;
  }
  var tgt = TA.stageTarget();
  if (tgt && st.x === undefined) TA.setBeacon(tgt.x, tgt.z);
  if (done) { if (ms.stage + 1 < ms.def.stages.length) TA.gotoStage(ms.stage + 1); else TA.completeMission(); }
};

TA.updateConvoy = function (ms, dt) {
  ms.cars.forEach(function (c) {
    if (!c.target || c.dead || c.removed) return;
    var wp = c.path[c.pathI];
    if (!wp) { ms.escaped = true; return; }
    if (TA.driveToward(c, wp[0], wp[1], dt, c.cruise) < 10) c.pathI++;
  });
};

TA.applyChoice = function (choice) {
  var s = TA.state;
  if (choice === 'pay') { s.branch = 'pay'; var paid = TA.payDebt(2000); TA.showBanner('DARMA IS PATIENT', TA.fmtMoney(paid) + ' PAID — DEBT ' + TA.fmtMoney(s.debt), '#90be6d'); TA.addStanding('pelabuhan', 10); }
  else if (choice === 'betray') { s.branch = 'betray'; TA.addMoney(3000); TA.run.incident = 'TIP-OFF'; TA.setWanted(3); TA.addStanding('pelabuhan', -15); TA.say('budi', 'Engine is hot. Run, Raka!'); }
  else s.ending = choice;
};

TA.completeMission = function () {
  var ms = TA.run.mission, m = ms.def, s = TA.state, bonus = TA.rankInfo().n >= 2 ? 1.1 : 1, pay = Math.round(m.pay * bonus);
  TA.clearStageEntities(true);
  TA.setBeacon(null);
  TA.run.mission = null;
  s.missionsDone = Math.max(s.missionsDone, ms.index + 1);
  TA.addMoney(pay);
  var toDebt = ms.index === 9 ? s.debt : Math.round(pay * 0.6), paid = TA.payDebt(toDebt);
  if (ms.index === 9) s.debt = 0;
  TA.addRP(m.rp); TA.addStanding(TA.districtAt(TA.player.x, TA.player.z).id, 8);
  if (m.unlock) TA.unlockCrew(m.unlock);
  TA.showBanner('CONTRACT COMPLETE', m.name.toUpperCase() + ' · +' + TA.fmtMoney(pay) + ' · DEBT -' + TA.fmtMoney(paid), '#90be6d');
  if (TA.sfx) TA.sfx('win', 0.8);
  TA.autosave();
  if (ms.index === 9) TA.showEnding();
};

TA.failMission = function (why) {
  var ms = TA.run.mission;
  if (!ms) return;
  TA.clearStageEntities(true);
  TA.setBeacon(null);
  TA.run.mission = null;
  TA.showBanner('CONTRACT FAILED', why + ' Return to the marker to try again.', '#e63946');
};

// Free roam: standing in the next contract's marker offers it.
TA.checkMissionMarker = function () {
  var ni = TA.nextMissionIndex(), p = TA.player;
  if (ni < 0 || TA.run.activity || p.dead) return;
  var at = TA.PLACES[TA.MISSIONS[ni].at];
  TA.setBeacon(at.x, at.z);
  if (TA.dist(p.x, p.z, at.x, at.z) < 5 && (!p.car || Math.abs(p.car.speed) < 6)) {
    TA.run.prompt = 'Press F — CONTRACT ' + (ni + 1) + ': ' + TA.MISSIONS[ni].name;
    if (TA.keyHit('KeyF') && TA.run.wanted === 0) TA.offerMission(ni);
    else if (TA.keyHit('KeyF')) TA.showBanner('TOO HOT', 'LOSE THE TAPD BEFORE TAKING A CONTRACT', '#f8961e');
  }
};

// Day 8 with the debt unpaid: Darma collects everything and the clock is wound back two days.
TA.onDebtDue = function () {
  var s = TA.state, taken = s.money;
  s.money = 0; s.debt = Math.max(0, s.debt - taken); s.day = 5;
  TA.showBanner('THE DEBT CAME DUE', 'DARMA TOOK ' + TA.fmtMoney(taken) + ' — YOU HAVE TWO MORE DAYS', '#e63946');
  TA.setWanted(0);
};
