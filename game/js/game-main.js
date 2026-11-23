// game-main.js — boot, fixed-step loop and the state machine title / playing / paused / map / cutscene / ending.
var TA = window.TA || (window.TA = {});
function bootGame() {
  TA.resetRandomSeed(); TA.S = TA.createNewGameState(); TA.persistSettings(true);
  TA.cars = []; TA.people = []; TA.fx = []; TA.roadblocks = []; TA.heli = null; TA.swatVan = null; TA.jack = null; TA.danger = null;
  TA.createRendererAndSky(); TA.buildOpenWorldCity(); TA.createBeaconAndRain(); TA.createCoinsAndShops();
  TA.createPlayerRaka(-262, -90); TA.spawnTrafficCars(36); TA.spawnPedestrians(80);
  TA.buildHudCards(); TA.bindInputListeners(handleKeyPress); TA.resizeRendererToWindow();
  document.getElementById('screens').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null; TA.unlockAudio();
    if (b) TA.handleMenuAction(b.getAttribute('data-act')); else if (TA.S.mode === 'cutscene') TA.advanceDialogue();
  });
  var shot = /[?&]shot=(\d)/.exec(location.search);
  if (shot) TA.stageShowcaseScene(+shot[1]); else TA.showTitleScreen();
  TA.lastT = performance.now(); TA.acc = 0; TA.frames = 0;
  requestAnimationFrame(runFixedStepLoop);
}
function runFixedStepLoop(now) {
  var S = TA.S, STEP = 1 / 60;
  TA.acc = Math.min(0.1, TA.acc + (now - TA.lastT) / 1000); TA.lastT = now;
  while (TA.acc >= STEP) { TA.acc -= STEP; if (!S.showcase) stepGameWorld(STEP); }
  renderFrame(STEP);
  if (S.showcase && ++TA.frames === 4) window.__shotReady = true;
  requestAnimationFrame(runFixedStepLoop);
}
function stepGameWorld(dt) {
  var S = TA.S, P = TA.player;
  if (S.mode === 'title') { S.time += dt; TA.driveTrafficAlongLanes(dt); TA.walkPedestriansOnSidewalks(dt); TA.updateTrafficLights(); TA.updateEffects(dt); return; }
  if (S.mode !== 'playing') return;
  S.time += dt; var inp = TA.readKeyboardAndMouse();
  if (P.car) { TA.driveVehicleWithArcadePhysics(P.car, inp, dt); P.x = P.car ? P.car.x : P.x; P.z = P.car ? P.car.z : P.z; }
  else { if (TA.jack) TA.pullDriverOut(dt); else TA.updatePlayerOnFoot(dt, inp); TA.fireCurrentWeapon(dt, inp); }
  TA.openWeaponWheel(inp.wheel);
  TA.driveTrafficAlongLanes(dt); TA.updateTrafficLights(); TA.walkPedestriansOnSidewalks(dt); TA.panicPedestriansNearDanger(); TA.removeDeadPeople();
  TA.dispatchPoliceUnits(dt); TA.pursueWithPitAndRamming(dt); TA.escapeByBreakingLineOfSight(dt); TA.bustPlayerIfCornered(dt);
  TA.updateRoadblocks(dt); TA.flyHelicopterWithSearchlight(dt); TA.deploySwatVanAndOfficers(dt); TA.updateEnemyCoverAI(dt);
  TA.updateMissions(dt); TA.updateSideActivities(dt); TA.tickCrewCooldowns(dt); TA.advanceDebtDay(dt); TA.tickTutorialHints(dt);
  TA.updateEffects(dt); TA.updateRadioAndSiren(dt); TA.playEngineSound(P.car ? P.car.v : 0, !!P.car);
  if (S.hp < 100 && S.wanted === 0) S.hp = Math.min(100, S.hp + dt * 1.5);
}
function renderFrame(dt) {
  var S = TA.S, P = TA.player, focus = P.car || P;
  if (S.mode === 'title') {
    var a = S.time * 0.05 + 0.5; TA.camera.position.set(150 + Math.cos(a) * 120, 34, 470 + Math.sin(a) * 30); TA.camera.lookAt(100, 12, 300); TA.camera.fov = 55; TA.camera.updateProjectionMatrix(); focus = { x: 120, z: 380 };
  } else if (P.car) { if (TA.keys.KeyC) TA.updateLookBackCamera(dt, P.car); else TA.updateChaseCamera(dt, P.car); }
  else TA.updateOnFootCamera(dt);
  TA.updateSunShadows(focus);
  document.getElementById('hud').style.display = S.mode === 'title' || S.mode === 'ending' ? 'none' : 'block';
  if (S.mode !== 'title') TA.updateHud(S.mode === 'playing' && !S.showcase ? dt : 0);
  TA.renderer.render(TA.scene, TA.camera);
}
function handleKeyPress(code) {
  var S = TA.S, P = TA.player; TA.unlockAudio();
  if (S.mode === 'cutscene') { if (code === 'Enter' || code === 'Space') TA.advanceDialogue(); return; }
  if (code === 'Escape' || code === 'KeyP') { if (S.mode === 'playing') TA.showPauseMenu(); else if (S.mode !== 'title' && S.mode !== 'ending') TA.handleMenuAction('resume'); return; }
  if (code === 'KeyM') { if (S.mode === 'playing') TA.showTabbedMapScreen('map'); else if (S.mode === 'map') TA.handleMenuAction('resume'); return; }
  if (S.mode !== 'playing') return;
  if (code === 'KeyE' || code === 'KeyF') { if (P.car) TA.enterOrExitVehicle(); else if (!TA.jack) TA.stealNearestCar(); }
  else if (code === 'KeyV') TA.cycleCameraMode();
  else if (code === 'KeyR') TA.tuneRadioStation(S.station + 1);
  else if (code === 'KeyZ') TA.useCrewAbility('sari'); else if (code === 'KeyX') TA.useCrewAbility('bima'); else if (code === 'KeyC' && !P.car) TA.useCrewAbility('tono');
  else if (code === 'KeyG') TA.startStreetRace(); else if (code === 'KeyT') TA.runTaxiFare(); else if (code === 'KeyH') TA.startWreckContract();
  else if (code === 'KeyB') TA.useNearbyShop(); else if (code === 'KeyL') S.rainOn = !S.rainOn; else if (code === 'F5') TA.saveGameToSlot(1);
  else if (/^Digit[1-6]$/.test(code)) { var n = +code.slice(5) - 1; if (S.owned[n]) S.weapon = n; else TA.notify(TA.CFG.WEAPONS[n].name + ' — BUY AT KELO ARMS'); }
}
function startNewGame() {
  var set = TA.S.settings, P = TA.player; if (P.car) TA.enterOrExitVehicleForced();
  TA.S = TA.createNewGameState(); TA.S.settings = set; TA.S.mode = 'playing'; P.x = -262; P.z = -90; P.h = 0; TA.camYaw = 0; TA.camSnap = false;
  TA.hideScreens(); TA.notify('DAY 1 OF 7 — YOU OWE $50,000');
}
TA.bootGame = bootGame; TA.runFixedStepLoop = runFixedStepLoop; TA.startNewGame = startNewGame;
window.addEventListener('load', bootGame);
