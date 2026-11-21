// Teluk Arunika v3.6 — police.js
// Wanted 1-5 with escalating tactics, roadblocks, spike strips, PIT,
// ELANG-1 tactical air unit with a VISIBLE searchlight cone, named dispatch
// units (foot + vehicle), police radio ticker, wanted cooldown / hiding.
(function () {
  'use strict';
  var TA = window.TA;

  var policeCars = [];
  var footUnits = [];
  var roadblocks = [];
  var spikeStrips = [];
  var heli = null;
  var heliLight = null;
  var heliCone = null;
  var heliTarget = null;
  var cooldownTimer = 0;
  var hiddenTimer = 0;
  var enemyHp = [];
  var ticker = [];
  var lastShotWantedAt = 0;

  var UNIT_NAMES = ['PATROLI-07', 'PATROLI-09', 'PATROLI-12', 'PATROLI-21', 'PATROLI-33', 'PATROLI-44'];
  var FOOT_NAMES = ['PATROLI KAKI ×2', 'PATROLI KAKI ×3'];

  function buildPolice() {
    var T = TA.three;
    // patrol cars (spawned in world, parked until wanted rises)
    for (var i = 0; i < 6; i++) {
      var g = new T.Group();
      var body = new T.Mesh(new T.BoxGeometry(2, 0.8, 4.4),
        new T.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.35, metalness: 0.5 }));
      body.position.y = 0.7; body.castShadow = true;
      g.add(body);
      var cab = new T.Mesh(new T.BoxGeometry(1.7, 0.6, 2.1),
        new T.MeshStandardMaterial({ color: 0x101820, roughness: 0.2, metalness: 0.7 }));
      cab.position.set(0, 1.32, -0.2);
      g.add(cab);
      var bar = new T.Mesh(new T.BoxGeometry(1.2, 0.25, 0.5),
        new T.MeshStandardMaterial({ color: 0x111111, emissive: 0x2266ff, emissiveIntensity: 2.4 }));
      bar.position.set(0, 1.7, -0.2);
      g.add(bar);
      g.position.set(-120 + i * 48, 0, 120 - i * 30);
      g.visible = false;
      TA.scene.add(g);
      policeCars.push({ mesh: g, name: UNIT_NAMES[i], speed: 0, active: false, tactic: 'PATROLI', bar: bar });
    }
    // foot patrol units
    for (var f = 0; f < 4; f++) {
      var u = new T.Group();
      var ub = new T.Mesh(new T.CapsuleGeometry(0.32, 0.85, 3, 8),
        new T.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.85 }));
      ub.position.y = 1.05; ub.castShadow = true;
      u.add(ub);
      var uh = new T.Mesh(new T.SphereGeometry(0.26, 10, 10),
        new T.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.6 }));
      uh.position.y = 1.92;
      u.add(uh);
      u.position.set(20 + f * 15, 0, 60 - f * 20);
      u.visible = false;
      TA.scene.add(u);
      footUnits.push({ mesh: u, active: false, speed: 3.4 });
    }
    buildHelicopter();
  }

  function buildHelicopter() {
    var T = TA.three;
    heli = new T.Group();
    heli.name = 'ELANG-1';
    var body = new T.Mesh(new T.BoxGeometry(3.2, 1.6, 6.5),
      new T.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.4, metalness: 0.5 }));
    body.castShadow = true;
    heli.add(body);
    var tail = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 5),
      new T.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.4, metalness: 0.5 }));
    tail.position.set(0, 0.2, -5.2);
    heli.add(tail);
    var glass = new T.Mesh(new T.SphereGeometry(1.1, 12, 12),
      new T.MeshStandardMaterial({ color: 0x88bbff, roughness: 0.1, metalness: 0.9 }));
    glass.position.set(0, 0.3, 2.6);
    heli.add(glass);
    var rotor = new T.Mesh(new T.BoxGeometry(11, 0.12, 0.7),
      new T.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }));
    rotor.position.y = 1.1;
    rotor.name = 'rotor';
    heli.add(rotor);
    var skid = new T.Mesh(new T.BoxGeometry(2.6, 0.15, 4),
      new T.MeshStandardMaterial({ color: 0x111111 }));
    skid.position.y = -1.0;
    heli.add(skid);
    // spotlight: real SpotLight + VISIBLE cone mesh
    heliLight = new T.SpotLight(0xfff6c0, 900, 120, 0.32, 0.45, 1.2);
    heliLight.position.set(0, -0.8, 1);
    heli.add(heliLight);
    heliTarget = new T.Object3D();
    TA.scene.add(heliTarget);
    heliLight.target = heliTarget;
    var coneGeo = new T.ConeGeometry(9, 42, 20, 1, true);
    var coneMat = new T.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16,
      side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending,
    });
    heliCone = new T.Mesh(coneGeo, coneMat);
    heliCone.position.set(0, -22, 1);
    heliCone.rotation.x = Math.PI; // apex up at the heli
    heli.add(heliCone);
    var pool = new T.Mesh(new T.CircleGeometry(8, 24),
      new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.30, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -41;
    pool.name = 'spot-pool';
    heli.add(pool);
    heli.visible = false;
    heli.position.set(0, 42, 0);
    TA.scene.add(heli);
  }

  // ---------- wanted ----------
  function setWanted(level, silent) {
    var s = TA.state;
    var prev = s.wanted;
    s.wanted = Math.max(0, Math.min(5, level));
    s.wantedHeat = s.wanted > 0 ? 1 : 0;
    cooldownTimer = 0;
    if (s.wanted > prev && !silent) {
      TA.ui.showToast('WANTED naik ke ' + s.wanted + ' bintang!');
      logPoliceRadio('DISPATCH: tersangka naik ke wanted ' + s.wanted + ' — ' + s.district);
      if (s.wanted >= 4) TA.crew.showCrewChatter('SARI', 'Wanted ' + s.wanted + '! ELANG-1 pasti sudah di udara.');
    }
    escalatePolice();
  }

  function escalatePolice() {
    var w = TA.state.wanted;
    // foot patrol at wanted 1
    footUnits.forEach(function (u, i) { u.active = w >= 1 && i < Math.min(4, w); u.mesh.visible = u.active; });
    // patrol cars from wanted 2
    policeCars.forEach(function (c, i) {
      c.active = w >= 2 && i < w;
      c.mesh.visible = c.active;
      c.tactic = w >= 4 ? (i % 2 === 0 ? 'PIT' : 'RAMMING') : (w >= 3 ? 'FLANKING' : 'PATROLI');
    });
    if (w >= 3 && !TA.state.roadblockActive) spawnRoadblock();
    if (w >= 4 && !TA.state.spikeActive) deploySpikeStrip();
    if (w >= 5) {
      if (!TA.state.heliActive) {
        TA.state.heliActive = true;
        heli.visible = true;
        TA.ui.showBanner('ELANG-1 DITERJUNKAN', 'Unit udara taktis mengunci posisimu — sembunyi di bawah atap!');
        logPoliceRadio('ELANG-1: target terpantau di ' + TA.state.district);
      }
    } else if (w < 5 && TA.state.heliActive) {
      TA.state.heliActive = false;
      heli.visible = false;
    }
    if (w < 3 && TA.state.roadblockActive) clearRoadblocks();
    if (w < 4 && TA.state.spikeActive) clearSpikes();
  }

  function spawnRoadblock() {
    var T = TA.three;
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    clearRoadblocks();
    for (var i = -1; i <= 1; i++) {
      var block = new T.Group();
      var stripe = new T.Mesh(new T.BoxGeometry(2.4, 1.1, 0.6),
        new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaa2200, emissiveIntensity: 0.4 }));
      stripe.position.y = 0.55;
      block.add(stripe);
      var stripe2 = new T.Mesh(new T.BoxGeometry(2.4, 0.35, 0.62),
        new T.MeshStandardMaterial({ color: 0xcc2222 }));
      stripe2.position.y = 0.9;
      block.add(stripe2);
      block.position.set(px + i * 3, 0, pz - 26);
      TA.scene.add(block);
      roadblocks.push(block);
    }
    // a police car parked sideways as part of the block
    var pc = policeCars[5];
    if (pc) {
      pc.mesh.visible = true;
      pc.mesh.position.set(px, 0, pz - 30);
      pc.mesh.rotation.y = Math.PI / 2;
      pc.active = true;
      pc.tactic = 'ROADBLOCK';
    }
    TA.state.roadblockActive = true;
    logPoliceRadio('BLOKIR-03: roadblock dipasang di ' + TA.state.district);
    TA.crew.showCrewChatter('SARI', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
  }

  function clearRoadblocks() {
    roadblocks.forEach(function (b) { TA.scene.remove(b); });
    roadblocks = [];
    TA.state.roadblockActive = false;
  }

  function deploySpikeStrip() {
    var T = TA.three;
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    clearSpikes();
    var strip = new T.Group();
    for (var i = 0; i < 8; i++) {
      var spike = new T.Mesh(new T.ConeGeometry(0.12, 0.5, 6),
        new T.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 }));
      spike.position.set(-3.5 + i, 0.25, 0);
      strip.add(spike);
    }
    var base = new T.Mesh(new T.BoxGeometry(8, 0.1, 0.8),
      new T.MeshStandardMaterial({ color: 0x222222 }));
    strip.add(base);
    strip.position.set(px, 0, pz - 40);
    TA.scene.add(strip);
    spikeStrips.push(strip);
    TA.state.spikeActive = true;
    logPoliceRadio('PATROLI-07: spike strip dipasang di ' + TA.state.street);
  }

  function clearSpikes() {
    spikeStrips.forEach(function (s) { TA.scene.remove(s); });
    spikeStrips = [];
    TA.state.spikeActive = false;
  }

  function onGunshot() {
    var now = TA.state.elapsed;
    if (now - lastShotWantedAt > 4) {
      lastShotWantedAt = now;
      if (TA.state.wanted < 5) setWanted(TA.state.wanted + 1);
      TA.world.panicPedestrians(TA.playerObj.position.x, TA.playerObj.position.z);
    }
  }

  function cooldownWanted(dt) {
    var s = TA.state;
    if (s.wanted <= 0) return;
    var rate = 1 / (22 * TA.crew.getCrewBonus().wantedCooldownMult * TA.career.getRankCooldownMult());
    // hiding: far from police + not shooting = heat decays
    var nearest = nearestPoliceDist();
    if (nearest > 45) hiddenTimer += dt; else hiddenTimer = 0;
    if (hiddenTimer > 3) {
      s.wantedHeat = Math.max(0, s.wantedHeat - dt * rate * 2);
      if (s.wantedHeat <= 0) {
        s.wanted--;
        s.wantedHeat = s.wanted > 0 ? 1 : 0;
        hiddenTimer = 0;
        TA.ui.showToast('Wanted turun — ' + s.wanted + ' bintang tersisa.');
        if (s.wanted === 0) {
          TA.ui.showToast('Bersih. Polisi kehilangan jejakmu.');
          TA.career.addXP(15);
        }
        escalatePolice();
      }
    }
    cooldownTimer += dt;
  }

  function nearestPoliceDist() {
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    var best = 9999;
    policeCars.forEach(function (c) {
      if (!c.active) return;
      var dx = c.mesh.position.x - px, dz = c.mesh.position.z - pz;
      best = Math.min(best, Math.sqrt(dx * dx + dz * dz));
    });
    footUnits.forEach(function (u) {
      if (!u.active) return;
      var dx = u.mesh.position.x - px, dz = u.mesh.position.z - pz;
      best = Math.min(best, Math.sqrt(dx * dx + dz * dz));
    });
    return best;
  }

  // ---------- dispatch data for the HUD ----------
  function distToPlayer(obj) {
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    var dx = obj.position.x - px, dz = obj.position.z - pz;
    return Math.round(Math.sqrt(dx * dx + dz * dz));
  }

  function getDispatchUnits() {
    var units = [];
    if (TA.state.heliActive) {
      units.push({ name: 'ELANG-1', kind: 'AIR', tactic: 'SPOTLIGHT', dist: distToPlayer(heli) });
    }
    policeCars.forEach(function (c) {
      if (!c.active) return;
      units.push({ name: c.name, kind: 'MOBIL', tactic: c.tactic, dist: distToPlayer(c.mesh) });
    });
    if (TA.state.roadblockActive) {
      units.push({ name: 'BLOKIR-03', kind: 'BLOKIR', tactic: 'ROADBLOCK', dist: 26 });
    }
    return units;
  }

  function getFootUnits() {
    var units = [];
    var active = footUnits.filter(function (u) { return u.active; });
    if (active.length > 0) {
      var d = Math.min.apply(null, active.map(function (u) { return distToPlayer(u.mesh); }));
      units.push({ name: 'PATROLI KAKI ×' + active.length, kind: 'KAKI', tactic: 'KEJAR KAKI', dist: d });
    }
    return units;
  }

  // ---------- radio ticker ----------
  function logPoliceRadio(text) {
    ticker.unshift(text);
    if (ticker.length > 3) ticker.pop();
    TA.ui.renderPoliceTicker();
  }

  function getTicker() { return ticker.slice(); }

  // ---------- combat vs player ----------
  function damageNearestEnemy(damage) {
    // abstracted: the player's shots chip the nearest active police/enemy unit
    var target = null, best = 9999;
    policeCars.forEach(function (c) {
      if (!c.active) return;
      var d = distToPlayer(c.mesh.position);
      if (d < best) { best = d; target = c; }
    });
    if (target && best < 60) {
      enemyHp[0] = (enemyHp[0] || 100) - damage;
      if (enemyHp[0] <= 0) {
        enemyHp[0] = 100;
        target.active = false;
        target.mesh.visible = false;
        TA.state.kills++;
        TA.career.addXP(20);
        TA.ui.showToast('Unit polisi dilumpuhkan!');
        escalatePolice();
      }
    }
  }

  // Snap ELANG-1 next to the player (used by screenshot staging so the
  // searchlight cone is visible at once instead of after a long approach).
  function placeHelicopterNearPlayer(dx, dz) {
    if (!heli) return;
    var ox = dx == null ? 14 : dx;
    var oz = dz == null ? 14 : dz;
    heli.position.set(TA.playerObj.position.x + ox, 42, TA.playerObj.position.z + oz);
  }

  function policeHelicopter(dt) {
    if (!heli || !TA.state.heliActive) return;
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    var t = TA.state.elapsed * 0.55;
    var ox = Math.cos(t) * 16, oz = Math.sin(t) * 16;
    heli.position.x += ((px + ox) - heli.position.x) * Math.min(1, dt * 1.4);
    heli.position.z += ((pz + oz) - heli.position.z) * Math.min(1, dt * 1.4);
    heli.position.y = 42 + Math.sin(TA.state.elapsed * 0.8) * 1.5;
    heli.rotation.y = Math.atan2(px - heli.position.x, pz - heli.position.z);
    var rotor = heli.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 22;
    // spotlight cone sweeps the ground and tracks the player
    heliTarget.position.set(px + Math.sin(TA.state.elapsed * 1.3) * 6, 0, pz + Math.cos(TA.state.elapsed * 1.1) * 6);
    heliCone.material.opacity = 0.20 + Math.sin(TA.state.elapsed * 2.4) * 0.05;
    TA.audio.sirenSound(dt);
  }

  function update(dt) {
    var s = TA.state;
    if (s.screen !== 'playing' && s.screen !== 'map') return;
    cooldownWanted(dt);
    // patrol cars chase the player
    var px = TA.playerObj.position.x, pz = TA.playerObj.position.z;
    policeCars.forEach(function (c) {
      if (!c.active) return;
      var dx = px - c.mesh.position.x, dz = pz - c.mesh.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d > 6) {
        var sp = (c.tactic === 'PIT' ? 17 : 13) * dt;
        c.mesh.position.x += (dx / d) * sp;
        c.mesh.position.z += (dz / d) * sp;
        c.mesh.rotation.y = Math.atan2(dx, dz);
        // PIT: ram the player's car
        if (c.tactic === 'PIT' && d < 8 && s.inCar) {
          TA.player.damageCar(0.8);
          c.mesh.position.x -= (dx / d) * 1.2;
        }
        // ramming contact damages the player on foot
        if (d < 3.5 && !s.inCar) {
          TA.player.takeDamage(8 * dt);
        }
      }
      c.bar.material.emissive.setHex(Math.floor(TA.state.elapsed * 4) % 2 === 0 ? 0x2266ff : 0xff2222);
    });
    // foot units chase on foot
    footUnits.forEach(function (u) {
      if (!u.active) return;
      var dx = px - u.mesh.position.x, dz = pz - u.mesh.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d > 2) {
        u.mesh.position.x += (dx / d) * u.speed * dt;
        u.mesh.position.z += (dz / d) * u.speed * dt;
        u.mesh.rotation.y = Math.atan2(dx, dz);
      } else if (!s.inCar) {
        TA.player.takeDamage(5 * dt);
      }
    });
    // spike strip: punctures the player's tyres
    spikeStrips.forEach(function (strip) {
      var dx = strip.position.x - px, dz = strip.position.z - pz;
      if (s.inCar && dx * dx + dz * dz < 16) {
        TA.player.damageCar(4);
        TA.state.carSpeed *= 0.5;
        TA.ui.showToast('Ban kena spike strip!');
        TA.scene.remove(strip);
        spikeStrips = spikeStrips.filter(function (x) { return x !== strip; });
        TA.state.spikeActive = false;
      }
    });
    policeHelicopter(dt);
  }

  TA.police = {
    buildPolice: buildPolice,
    setWanted: setWanted,
    escalatePolice: escalatePolice,
    spawnRoadblock: spawnRoadblock,
    deploySpikeStrip: deploySpikeStrip,
    policeHelicopter: policeHelicopter,
    placeHelicopterNearPlayer: placeHelicopterNearPlayer,
    cooldownWanted: cooldownWanted,
    getDispatchUnits: getDispatchUnits,
    getFootUnits: getFootUnits,
    policeTicker: ticker,
    logPoliceRadio: logPoliceRadio,
    getTicker: getTicker,
    onGunshot: onGunshot,
    damageNearestEnemy: damageNearestEnemy,
    update: update,
  };
})();
