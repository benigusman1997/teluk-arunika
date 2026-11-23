// Showcase scenes: stage each of the four screenshots through the
// REAL game functions, place the actors at the spec spots, step the
// simulation without drawing, and stop. No drawing code of its own,
// no fake HUD: the real HUD draws the real state.

// Stage one of the four showcase scenes by number. Showcase scenes
// are god-mode: the staged player never takes damage, gets arrested
// or collects coins while the simulation steps.
function stageShowcaseScene(n) {
  GAME._godMode = true;
  GAME._showcase = true;
  if (n === 1) {
    stageCoastChaseCover();
  } else if (n === 2) {
    stageMarketCarjack();
  } else if (n === 3) {
    stageBankShootout();
  } else if (n === 4) {
    stageTitleWithSaves();
  }
}

// Step the simulation N fixed steps without drawing a frame.
function stepSimulationWithoutDrawing(steps) {
  for (let i = 0; i < steps; i++) {
    updateAllSystems(1 / 60);
  }
}

// Set the canonical HUD numbers used in the screenshots.
function shw_setCanonicalHud(day, hour, minute, money, debt, rp) {
  GAME.time.day = day;
  GAME.time.hour = hour;
  GAME.time.minute = minute;
  GAME.time.weather = 'CERAH';
  GAME.money = money;
  GAME.debt = debt;
  GAME.career.rp = rp;
  GAME.player.health = 82;
  GAME.player.armour = 40;
}

// A small "!" marker plane floating above a pedestrian's head.
function shw_addExclaim(x, z) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffcf3a';
  g.beginPath();
  g.arc(32, 32, 28, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#141c2e';
  g.font = '900 44px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 32, 34);
  const tex = new THREE.CanvasTexture(c);
  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  marker.position.set(x, 2.6, z);
  WORLD.scene.add(marker);
  return marker;
}

// An alarm icon with sound waves, floating above a car.
function shw_addAlarmIcon(x, z) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d');
  g.strokeStyle = '#ffcf3a';
  g.lineWidth = 6;
  for (const r of [18, 30, 42]) {
    g.beginPath();
    g.arc(64, 48, r, -0.9, 0.9);
    g.stroke();
    g.beginPath();
    g.arc(64, 48, r, Math.PI - 0.9, Math.PI + 0.9);
    g.stroke();
  }
  g.fillStyle = '#ff4d4d';
  g.beginPath();
  g.arc(64, 48, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = '900 26px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 64, 50);
  const tex = new THREE.CanvasTexture(c);
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  icon.position.set(x, 3.4, z);
  WORLD.scene.add(icon);
  return icon;
}

// A red diamond and a small health bar above a guard's head.
function shw_addGuardMarker(x, z, hp) {
  const diamond = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  );
  diamond.position.set(x, 2.5, z);
  diamond.rotation.z = Math.PI / 4;
  WORLD.scene.add(diamond);
  const barBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x14161a }),
  );
  barBg.position.set(x, 2.2, z);
  WORLD.scene.add(barBg);
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2 * clampNumber(hp / 60, 0, 1), 0.16),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d }),
  );
  bar.position.set(x - (1.2 - 1.2 * clampNumber(hp / 60, 0, 1)) / 2, 2.2, z);
  WORLD.scene.add(bar);
}

// Scene 1 — the cover: coast chase on Pantai Boulevard, four stars,
// three readable cruisers, roadblock, burning wreck, helicopter.
function stageCoastChaseCover() {
  shw_setCanonicalHud(4, 17, 11, 18450, 31550, 1240);
  GAME.career.standing.PANTAI = 64;
  startStoryContract(7);
  GAME.mission.stage = 7;
  const contract = STORY_CONTRACTS[6];
  mis_applyStage(contract, 7);
  const gt = spawnVehicle('PELABUHAN GT', 150, 360, Math.PI / 2, 'player');
  GAME.player.vehicle = gt;
  GAME.vehicles[gt].speed = 140 / 3.6;
  GAME.vehicles[gt].hp = 64;
  GAME.player.x = 150;
  GAME.player.z = 360;
  GAME.ui.lookYaw = -0.55;
  GAME.police.swat = true;
  GAME.police._swatDeployed = true;
  raiseWantedLevel(4, 'ARMED ROBBERY');
  GAME.crew.recruited = ['Z', 'X', 'C'];
  GAME.crew.active.Z = 6;
  GAME.crew.cooldowns.C = 22;
  sayCrewChatter('SARI', 'Roadblock on the boulevard — cut through the beach!');
  GAME.crew.chatter.ttl = 999;
  GAME.radio.station = 0;
  stepSimulationWithoutDrawing(480);
  const v = GAME.vehicles[gt];
  v.speed = 140 / 3.6;
  v.hp = 64;
  v.gear = 4;
  v.x = clampNumber(v.x, 100, 300);
  v.z = 360;
  v.heading = Math.PI / 2;
  veh_syncMesh(gt);
  GAME.player.x = v.x;
  GAME.player.z = v.z;
  GAME.player.heading = Math.PI / 2;
  GAME.time.day = 4;
  GAME.time.hour = 17;
  GAME.time.minute = 11;
  GAME.money = 18450;
  GAME.debt = 31550;
  GAME.career.rp = 1240;
  GAME.player.health = 82;
  GAME.player.armour = 40;
  GAME.crew.active.Z = 4;
  GAME.crew.cooldowns.C = 22;
  GAME.ui.dialogue = { who: '', role: '', text: '' };
  shw_placeCoverCruisers(v);
  shw_placeCoverRoadblock(v);
  shw_placeCoverHeli(v);
  shw_placeCoverStreetLife(v);
  GAME.police.stars = 4;
  GAME.police.incident = 'ARMED ROBBERY';
  GAME.police.heat = 1;
  GAME.police.seen = true;
  GAME.police.units = [
    { callsign: 'CAMAR 12', role: 'RAMMING', dist: 4, x: v.x - 4, z: v.z + 5 },
    { callsign: 'CAMAR 21', role: 'PIT', dist: 6, x: v.x - 2, z: v.z - 5 },
    { callsign: 'CAMAR 33', role: 'BOX-IN', dist: 13, x: v.x + 13, z: v.z },
    { callsign: 'BLOKIR 03', role: 'ROADBLOCK', dist: 34, x: v.x + 34, z: v.z },
    { callsign: 'ELANG-1', role: 'SPOTLIGHT', dist: 26, x: v.x + 26, z: v.z, displayDist: 'OVERHEAD' },
    { callsign: 'BADAK-2', role: 'BREACH', dist: 120, x: v.x + 120, z: v.z },
  ];
  GAME.mission.next = 'Bengkel Pak Amir · 640 m';
  GAME.ui.banner = '★★★★ WANTED — ELANG-1 OVERHEAD';
  const cam = WORLD.camera;
  const pull = 7.5 + 140 * 0.012;
  const yaw = v.heading + GAME.ui.lookYaw + Math.PI;
  cam.position.set(
    v.x + Math.sin(yaw) * pull, 3.4 + 140 * 0.004, v.z + Math.cos(yaw) * pull,
  );
  cam.lookAt(
    v.x + Math.sin(v.heading + GAME.ui.lookYaw) * 16, 1.2,
    v.z + Math.cos(v.heading + GAME.ui.lookYaw) * 16,
  );
  cam.fov = 62;
  cam.updateProjectionMatrix();
  drawAllHudPanels(1 / 60);
  drawMinimap(1 / 60);
}

// The three readable cruisers around the GT.
function shw_placeCoverCruisers(v) {
  const c12 = spawnVehicle('TAPD CAMAR', v.x + 6, v.z + 5.5, Math.PI / 2 + 0.12, 'police');
  GAME.vehicles[c12].speed = 38;
  veh_syncMesh(c12);
  const c21 = spawnVehicle('TAPD CAMAR', v.x + 5, v.z - 5.5, Math.PI / 2 + 0.18, 'police');
  GAME.vehicles[c21].speed = 38;
  veh_syncMesh(c21);
  const c33 = spawnVehicle('TAPD CAMAR', v.x + 13, v.z, Math.PI, 'police');
  GAME.vehicles[c33].speed = 0;
  veh_syncMesh(c33);
  if (typeof spawnTyreSmoke === 'function') {
    spawnTyreSmoke(v.x - 6, v.z - 1);
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(v.x - 1, v.z + 2);
  }
  if (typeof spawnSkidMark === 'function') {
    spawnSkidMark(v.x - 4, v.z, v.heading);
    spawnSkidMark(v.x - 8, v.z, v.heading);
  }
}

// Roadblock 34 m ahead: two broadside cruisers, barriers, cones,
// a burning wreck and a spike strip 16 m ahead.
function shw_placeCoverRoadblock(v) {
  const bx = v.x + 34;
  const bz = v.z;
  const rb1 = spawnVehicle('TAPD CAMAR', bx - 2, bz + 4, Math.PI, 'police');
  veh_syncMesh(rb1);
  const rb2 = spawnVehicle('TAPD CAMAR', bx + 2, bz - 4, 0, 'police');
  veh_syncMesh(rb2);
  for (const off of [-6, 0, 6]) {
    const barrier = makeRoadblockBarrier();
    barrier.position.set(bx + off, 0, bz + 7);
    WORLD.scene.add(barrier);
  }
  const strip = msh_makeSpikeStrip();
  strip.position.set(v.x + 16, 0, v.z);
  strip.rotation.y = Math.PI / 2;
  WORLD.scene.add(strip);
  const wreck = spawnVehicle('HARIMAU SEDAN', bx + 4, bz + 9, Math.PI / 2, 'none');
  GAME.vehicles[wreck].hp = 0;
  veh_syncMesh(wreck);
  spawnExplosion(bx + 4, bz + 9);
  GAME.police.roadblocks.push({ x: bx, z: bz, mesh: null });
}

// ELANG-1 ahead and above on the seaward side, searchlight cone
// down to a bright disc on the road around the GT.
function shw_placeCoverHeli(v) {
  flyHelicopterWithSearchlight(0);
  const heli = WORLD._heli;
  if (!heli) {
    return;
  }
  heli.position.set(v.x + 30, 18, v.z + 12);
  heli.rotation.y = Math.PI;
  if (heli.userData.searchDisc) {
    heli.userData.searchDisc.position.set(-30, -17.8, -12);
  }
  GAME.police.heli = true;
}

// Street life on the boulevard: palms, pedestrians fleeing, oncoming
// traffic braking, a scooter.
function shw_placeCoverStreetLife(v) {
  for (let i = 0; i < 6; i++) {
    const x = v.x + 10 + i * 12;
    const z = v.z - 8 - taNextRandom() * 4;
    const shirt = pickFromList([0xff7f6b, 0x7fd9b6, 0x36c2c9, 0xffc24a, 0xf25fa0]);
    const mesh = makePersonMesh(shirt, 'walk');
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.PI;
    WORLD.scene.add(mesh);
    GAME.peds.push({
      x: x, z: z, heading: Math.PI, state: 'flee', shirt: shirt,
      marker: '!', mesh: mesh, speed: 4, _fleeTime: 99,
    });
    shw_addExclaim(x, z);
  }
  const taxi = spawnVehicle('TAKSI KUNING', v.x + 60, v.z - 4, -Math.PI / 2, 'traffic');
  GAME.vehicles[taxi].speed = -8;
  veh_syncMesh(taxi);
  const angkot = spawnVehicle('ANGKOT MINI', v.x + 85, v.z + 4, -Math.PI / 2, 'traffic');
  GAME.vehicles[angkot].speed = -6;
  veh_syncMesh(angkot);
  const scooter = spawnVehicle('KOMET', v.x + 45, v.z - 8, -Math.PI / 2, 'traffic');
  GAME.vehicles[scooter].speed = -10;
  veh_syncMesh(scooter);
}

// Scene 2 — the market carjack: Raka at the sedan's open door,
// the driver mid-fall, patrol closing in, stalls on both sides.
function stageMarketCarjack() {
  shw_setCanonicalHud(4, 17, 11, 18450, 31550, 1240);
  startStoryContract(2);
  GAME.mission.stage = 1;
  raiseWantedLevel(2, 'VEHICLE THEFT');
  GAME.player.weaponSlot = 2;
  GAME.player.ammo[1] = { mag: 12, reserve: 96 };
  GAME.player.x = -271;
  GAME.player.z = -55;
  GAME.player.heading = Math.PI;
  const car = spawnVehicle('ARUNIKA SEDAN', -269, -55.5, Math.PI, 'traffic');
  GAME.vehicles[car].colour = 0x7fd9b6;
  const carMesh = WORLD.meshes.vehicles[car];
  if (carMesh) {
    carMesh.traverse(function mintSedan(child) {
      if (child.material && child.material.color && child.material.color.getHex() === 0x8fc3ee) {
        child.material = child.material.clone();
        child.material.color.setHex(0x7fd9b6);
      }
    });
  }
  veh_syncMesh(car);
  const driver = makePersonMesh(0xff9f5a, 'walk');
  driver.position.set(-272.8, 0.3, -55.5);
  driver.rotation.x = -Math.PI / 2.4;
  driver.rotation.y = Math.PI / 2;
  WORLD.scene.add(driver);
  GAME.peds.push({
    x: -272.8, z: -55.5, heading: Math.PI / 2, state: 'down',
    shirt: 0xff9f5a, marker: '', mesh: driver, speed: 0, _downTime: 99,
  });
  shw_addAlarmIcon(-269, -55.5);
  stepSimulationWithoutDrawing(240);
  GAME.player.x = -271;
  GAME.player.z = -55;
  GAME.player.heading = Math.PI;
  GAME.player.health = 82;
  GAME.player.armour = 40;
  GAME.time.day = 4;
  GAME.time.hour = 17;
  GAME.time.minute = 11;
  GAME.money = 18450;
  GAME.debt = 31550;
  GAME.career.rp = 1240;
  GAME.ui.prompt = 'HOLD E — STEALING ARUNIKA SEDAN';
  GAME.ui.promptProgress = 0.66;
  GAME.ui.hint = 'Hold E to steal a car · Shift to sprint · Q for weapons';
  GAME.ui.dialogue = {
    who: 'DARMA WIJAYA', role: 'Syndicate boss',
    text: 'Seven days, Raka. Bring me the stall money or I take your father\'s workshop.',
  };
  GAME.ui.banner = '';
  shw_placeMarketCrowd();
  shw_placeMarketTraffic();
  shw_placeMarketPatrol();
  GAME.police.stars = 2;
  GAME.police.incident = 'VEHICLE THEFT';
  GAME.police.heat = 1;
  GAME.police.seen = true;
  GAME.police.units = [
    { callsign: 'PATROL 11', role: 'FOOT CHASE', dist: 12, x: -270, z: -64 },
    { callsign: 'PATROL 18', role: 'FOOT CHASE', dist: 17, x: -266, z: -69 },
    { callsign: 'CAMAR 12', role: 'PURSUIT', dist: 140, x: -270, z: -190 },
  ];
  GAME.mission.next = 'Collect from three stalls';
  spawnObjectiveBeacon(-270, -110);
  const cam = WORLD.camera;
  cam.position.set(-271, 2.6, -49.5);
  cam.lookAt(-270, 1.5, -72);
  cam.fov = 62;
  cam.updateProjectionMatrix();
  drawAllHudPanels(1 / 60);
  drawMinimap(1 / 60);
}

// The market crowd: 18+ pedestrians, at least 8 running with "!".
function shw_placeMarketCrowd() {
  for (let i = 0; i < 20; i++) {
    const fleeing = i < 9;
    const x = -282 + taNextRandom() * 24;
    const z = -80 + taNextRandom() * 55;
    if (distanceBetween(x, z, GAME.player.x, GAME.player.z) < 4) {
      continue;
    }
    const shirt = pickFromList([0xff7f6b, 0x7fd9b6, 0x36c2c9, 0xffc24a, 0xf25fa0, 0xfff1d6]);
    const mesh = makePersonMesh(shirt, 'walk');
    mesh.position.set(x, 0, z);
    mesh.rotation.y = taNextRandom() * Math.PI * 2;
    WORLD.scene.add(mesh);
    GAME.peds.push({
      x: x, z: z, heading: mesh.rotation.y, state: fleeing ? 'flee' : 'walk',
      shirt: shirt, marker: fleeing ? '!' : '', mesh: mesh,
      speed: fleeing ? 4.5 : 1.5, _fleeTime: 99,
    });
    if (fleeing) {
      shw_addExclaim(x, z);
    }
  }
}

// Market traffic: minibus, taxi and two scooters moving down the street.
function shw_placeMarketTraffic() {
  const angkot = spawnVehicle('ANGKOT MINI', -270, -95, Math.PI, 'traffic');
  GAME.vehicles[angkot].speed = 8;
  veh_syncMesh(angkot);
  const taxi = spawnVehicle('TAKSI KUNING', -270, -30, 0, 'traffic');
  GAME.vehicles[taxi].speed = 8;
  veh_syncMesh(taxi);
  for (const dz of [-70, -40]) {
    const scooter = spawnVehicle('KOMET', -267, dz, Math.PI, 'traffic');
    GAME.vehicles[scooter].speed = 10;
    veh_syncMesh(scooter);
  }
  const light = WORLD.trafficLights[0];
  if (light) {
    light.state = 'red';
  }
}

// Two patrol officers sprinting in at 12 and 17 metres.
function shw_placeMarketPatrol() {
  const spots = [[-270, -64], [-266, -69]];
  for (const spot of spots) {
    const mesh = makePersonMesh(0x1c2a4a, 'police');
    mesh.position.set(spot[0], 0, spot[1]);
    mesh.rotation.y = 0;
    WORLD.scene.add(mesh);
    GAME.peds.push({
      x: spot[0], z: spot[1], heading: 0, state: 'walk',
      shirt: 0x1c2a4a, marker: '', mesh: mesh, speed: 6.5, police: true,
    });
  }
}

// Scene 3 — the bank shootout: Raka at the getaway van, guards among
// the columns, BADAK-2 on the right, ELANG-1 in the sky, wheel open.
function stageBankShootout() {
  shw_setCanonicalHud(4, 17, 11, 18450, 31550, 1240);
  GAME.career.standing['GANG NEON'] = 38;
  startStoryContract(7);
  GAME.mission.stage = 3;
  const contract = STORY_CONTRACTS[6];
  mis_applyStage(contract, 3);
  startBankArunikaHeist();
  GAME.mission.stage = 3;
  mis_applyStage(contract, 3);
  raiseWantedLevel(4, 'ARMED ROBBERY');
  GAME.player.weaponSlot = 5;
  GAME.player.ammo[4] = { mag: 24, reserve: 180 };
  GAME.player.x = 70;
  GAME.player.z = -67;
  GAME.player.heading = Math.PI;
  GAME.ui.wheelOpen = true;
  stepSimulationWithoutDrawing(300);
  GAME.player.x = 70;
  GAME.player.z = -67;
  GAME.player.heading = Math.PI;
  GAME.player.health = 82;
  GAME.player.armour = 40;
  GAME.time.day = 4;
  GAME.time.hour = 17;
  GAME.time.minute = 11;
  GAME.money = 18450;
  GAME.debt = 31550;
  GAME.career.rp = 1240;
  GAME.ui.wheelOpen = true;
  GAME.ui.dialogue = { who: '', role: '', text: '' };
  const van = GAME.vehicles[GAME._getawayVan];
  if (van) {
    van.x = 78;
    van.z = -66;
    van.heading = Math.PI;
    veh_syncMesh(GAME._getawayVan);
    const mesh = WORLD.meshes.vehicles[GAME._getawayVan];
    if (mesh) {
      mesh.traverse(function darken(child) {
        if (child.material && child.material.color && child.material.color.getHex() === 0x2ee6c8) {
          child.material = child.material.clone();
          child.material.color.setHex(0x2a2f3a);
        }
      });
    }
  }
  shw_placeBankGuards();
  shw_placeBankSwat();
  shw_placeBankAirAndFire();
  GAME.mission.counter = 3;
  GAME.mission.counterMax = 9;
  GAME.mission.timer = 41;
  GAME.mission.next = 'Crack the vault';
  GAME.mission.objective = 'Neutralise the bank guards';
  GAME.police.stars = 4;
  GAME.police.incident = 'ARMED ROBBERY';
  GAME.police.heat = 1;
  GAME.police.seen = true;
  GAME.police.units = [
    { callsign: 'BADAK-2', role: 'BREACH', dist: 18, x: 105, z: -70 },
    { callsign: 'ELANG-1', role: 'SPOTLIGHT', dist: 30, x: 100, z: -130, displayDist: 'OVERHEAD' },
    { callsign: 'CAMAR 12', role: 'FLANKING', dist: 40, x: 120, z: -50 },
    { callsign: 'CAMAR 21', role: 'PURSUIT', dist: 65, x: 60, z: -20 },
    { callsign: 'MATA 07', role: 'OVERWATCH', dist: 80, x: 90, z: -120, displayDist: 'ROOF' },
  ];
  GAME.ui.banner = 'SWAT ARUNIKA DEPLOYED — BADAK-2';
  GAME.crew.chatter = {
    who: 'AGUS', text: 'Vault opens in 41 seconds — hold the plaza!', ttl: 999,
  };
  const crosshair = document.createElement('div');
  crosshair.textContent = '+';
  crosshair.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:30px;font-weight:900;color:#fff;text-shadow:0 0 6px #000;pointer-events:none;';
  WORLD.hudRoot.appendChild(crosshair);
  const cam = WORLD.camera;
  cam.position.set(62, 4, -52);
  cam.lookAt(85, 0, -80);
  cam.fov = 62;
  cam.updateProjectionMatrix();
  drawAllHudPanels(1 / 60);
  drawMinimap(1 / 60);
}

// Nine guards among the columns: four standing, one falling, four at
// the edges; red diamonds and health bars above each.
function shw_placeBankGuards() {
  const spots = [
    [78, -82, 60], [88, -84, 60], [98, -80, 60], [104, -86, 60],
    [82, -78, 0], [72, -88, 60], [110, -82, 60], [94, -76, 60], [84, -90, 60],
  ];
  let i = 0;
  for (const spot of spots) {
    const guard = spawnEnemyGunman(spot[0], spot[1], 'guard', spot[2]);
    if (i === 4) {
      guard.hp = 0;
      guard.mesh.rotation.x = -Math.PI / 2;
      guard.mesh.position.y = 0.3;
      spawnHitMarker(spot[0], spot[1], 50);
    }
    shw_addGuardMarker(spot[0], spot[1], spot[2]);
    i += 1;
  }
  const p = GAME.player;
  for (let t = 0; t < 3; t++) {
    spawnMuzzleFlashAndTracer(p.x, p.z, p.heading + (t - 1) * 0.05);
  }
}

// BADAK-2 on the right with three SWAT officers fanning out.
function shw_placeBankSwat() {
  const van = spawnVehicle('BADAK-2', 105, -70, Math.PI / 2, 'police');
  veh_syncMesh(van);
  const spots = [[100, -66], [108, -64], [112, -72]];
  for (let i = 0; i < 3; i++) {
    const mesh = makePersonMesh(0x111111, 'swat');
    mesh.position.set(spots[i][0], 0, spots[i][1]);
    mesh.rotation.y = Math.PI;
    WORLD.scene.add(mesh);
    if (i === 0) {
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.3, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x1c2a4a }),
      );
      shield.position.set(0, 1.1, 0.3);
      mesh.add(shield);
    }
    GAME.peds.push({
      x: spots[i][0], z: spots[i][1], heading: Math.PI, state: 'walk',
      shirt: 0x111111, marker: '', mesh: mesh, speed: 0,
    });
  }
  const cruiser = spawnVehicle('TAPD CAMAR', 120, -50, Math.PI, 'police');
  veh_syncMesh(cruiser);
}

// ELANG-1 in open sky left of the banner, a small explosion at the
// plaza edge, searchlight pool near the guards.
function shw_placeBankAirAndFire() {
  flyHelicopterWithSearchlight(0);
  const heli = WORLD._heli;
  if (heli) {
    heli.position.set(45, 28, -125);
    heli.rotation.y = 0;
    if (heli.userData.searchDisc) {
      heli.userData.searchDisc.position.set(40, -27.8, 45);
    }
  }
  spawnExplosion(55, -75);
}

// Scene 4 — the title screen over the live city at golden hour.
function stageTitleWithSaves() {
  shw_setCanonicalHud(4, 17, 11, 18450, 31550, 1240);
  GAME.career.stats.contractsDone = 6;
  spawnTrafficCars();
  spawnPedestrians();
  GAME.mode = 'title';
  showTitleScreen();
  stepSimulationWithoutDrawing(120);
  flyHelicopterWithSearchlight(0);
  const heli = WORLD._heli;
  if (heli) {
    heli.position.set(180, 55, 120);
  }
  const cam = WORLD.camera;
  cam.position.set(-80, 120, 330);
  cam.lookAt(250, 0, -150);
  cam.fov = 62;
  cam.updateProjectionMatrix();
  GAME.mode = 'title';
}
