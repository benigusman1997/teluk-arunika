// Boot, the fixed-step loop, the per-mode update order, new game and world reset.

function bootGame() {
  const params = new URLSearchParams(window.location.search);
  const shot = Number(params.get('shot') || 0), seed = Number(params.get('seed') || 7);
  const canvas = document.getElementById('game-canvas');
  W = createWorldRuntime();
  G = createNewGameState();
  W.mission = { enemies: [], cars: [], convoy: [], van: null };
  W.showcase = shot;
  createRendererAndSky(canvas);
  buildOpenWorldCity();
  buildActivityMarkers();
  buildSeagulls();
  buildHud();
  loadSettings();
  setGraphicsQuality(G.settings.quality);
  installInputListeners(canvas);
  rebuildPlayerMesh();
  resizeRenderer();
  seedRandom(seed);
  if (shot) stageShowcaseScene(shot);
  else { applyTimeOfDay(17 * 60 + 10); populateStreets(); showTitleScreen(); }
  W.loop = { last: performance.now(), acc: 0, frames: 0 };
  window.requestAnimationFrame(runFixedStepLoop);
}

function runFixedStepLoop(now) {
  const loop = W.loop;
  loop.acc += Math.min(0.1, (now - loop.last) / 1000);
  loop.last = now;
  while (loop.acc >= FIXED_STEP) {
    loop.acc -= FIXED_STEP;
    if (!W.frozen) stepGame(FIXED_STEP);
    readKeyboardAndMouse();
  }
  if (loop.frames % 4 === 0 || W.frozen) updateHud();
  updateAudio(FIXED_STEP);
  renderFrame();
  loop.frames++;
  // Screenshot and test tools wait for this flag: world built, HUD laid out, two frames drawn.
  if (loop.frames === 3) { W.ready = true; window.__sceneReady = true; }
  window.requestAnimationFrame(runFixedStepLoop);
}

function stepGame(dt) {
  G.frame++;
  if (G.mode === 'playing') stepPlaying(dt * G.timeScale);
  else if (G.mode === 'cutscene') { G.time += dt; updateDialogue(dt); stepStreetLife(dt); updateAllCars(dt); updateVisualEffects(dt); updateTimedMessages(dt); }
  else if (G.mode === 'title') { G.time += dt; stepStreetLife(dt); updateAllCars(dt); updateVisualEffects(dt); }
  if (W.menu) updateMenuInput();
  updateActiveCamera(dt);
}

function stepPlaying(dt) {
  const p = G.player;
  G.time += dt;
  G.prompt = null;
  if (W.keysHit.Escape) { releasePointer(); showPauseMenu(); return; }
  if (W.keysHit.KeyM) { releasePointer(); showTabbedMapScreen(0); return; }
  if (W.keysHit.F5) { if (saveGameToSlot(1)) showBanner('QUICK SAVE', 'Slot 1', 1.6); }
  if (W.keysHit.KeyP) toggleRain();
  updateDayClock(dt);
  if (p.car) {
    updatePlayerDriving(dt);
    updatePlayerMesh();
  } else updatePlayerOnFoot(dt);
  updatePlayerWeapons(dt);
  updateCrewAbilities(dt);
  stepStreetLife(dt);
  dispatchPoliceUnits(dt);
  pursueWithPitAndRamming(dt);
  escapeByBreakingLineOfSight(dt);
  updateRoadblocks(dt);
  flyHelicopterWithSearchlight(dt);
  deploySwatVanAndOfficers(dt);
  updateEnemyCoverAI(dt);
  updateStoryMission(dt);
  if (G.mode !== 'playing') return;
  updateSideActivities(dt);
  // E leaves the car unless a prompt (race, respray, export...) just claimed the key.
  if (W.keysHit.KeyE && p.car && !G.prompt) enterOrExitVehicle(null);
  updateAllCars(dt);
  updateVisualEffects(dt);
  updateTimedMessages(dt);
  updateTutorialHints(dt);
}

// Traffic, lights and pedestrians: runs under play, cutscenes and the title screen alike.
function stepStreetLife(dt) {
  if (G.frame % 20 === 0) {
    spawnTrafficCars(G.settings.quality === 'low' ? 12 : 20);
    spawnPedestrians(G.settings.quality === 'low' ? 22 : 40);
  }
  updateTrafficLights(dt);
  driveTrafficAlongLanes(dt);
  walkPedestriansOnSidewalks(dt);
  panicPedestriansNearDanger();
}

function startNewGame() {
  const settings = G.settings;
  resetWorldForNewGame();
  G = createNewGameState();
  G.settings = settings;
  G.mode = 'playing';
  G.camYaw = Math.PI;
  G.player.heading = Math.PI;
  applyTimeOfDay(G.clock);
  rebuildPlayerMesh();
  populateStreets();
  W.cam.snap = true;
  playCutsceneDialogue([['darma', "Fifty thousand, Raka. Your father's signature, my money. You have seven days."], ['amir', 'I only wanted to keep the workshop open, son. I am sorry.'], ['raka', 'Keep the kettle on, Pak. I will drive until it is paid.']], () => showBanner('DAY 1 OF 7', 'Debt ' + formatMoney(G.debt) + ' - talk to Pak Amir (E)', 4));
}

function populateStreets() {
  spawnParkedCars(30);
  for (let i = 0; i < 6; i++) { spawnTrafficCars(20); spawnPedestrians(40); }
}

function resetWorldForNewGame() {
  if (G.activity) endActivity(false, 'Cancelled');
  clearMissionMarkers();
  clearMissionActors();
  G.player.car = null;
  G.wanted = 0;
  W.units = [];
  removeRoadblocks();
  dismissAirAndSwat();
  while (W.cars.length) removeCar(W.cars[W.cars.length - 1]);
  while (W.people.length) removePerson(W.people[W.people.length - 1]);
  for (const e of W.effects) W.scene.remove(e.mesh);
  W.effects = [];
  if (W.startBeacon) { W.scene.remove(W.startBeacon); W.startBeacon = null; }
  for (const mesh of W.coinMeshes) mesh.visible = true;
  G.dialogue = null; G.chatter = null; G.banner = null; G.hint = null; G.introCard = null; G.prompt = null;
  W.routeCache = null; W.stunt = null; W.frozen = false;
}

const FIXED_STEP = 1 / 60;
