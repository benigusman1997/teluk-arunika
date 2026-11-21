// police.js — wanted 1-5 escalation, roadblocks, spike strips, PIT, ELANG-1 helicopter + dispatch panel data.
(function () {
  'use strict';
  var TA = window.TA;

  var DISPATCH_TEMPLATES = [
    { id: 'ELANG-1', kind: 'AIR', tactic: 'SPOTLIGHT', minWanted: 5 },
    { id: 'PATROLI-12', kind: 'MOBIL', tactic: 'RAMMING', minWanted: 2 },
    { id: 'PATROLI-07', kind: 'MOBIL', tactic: 'PIT', minWanted: 4 },
    { id: 'BLOKIR-03', kind: 'BLOKIR', tactic: 'ROADBLOCK', minWanted: 3 },
    { id: 'PATROLI-21', kind: 'MOBIL', tactic: 'FLANKING', minWanted: 2 },
    { id: 'PATROLI-09', kind: 'MOBIL', tactic: 'BOX IN', minWanted: 3 },
  ];
  var activeUnits = [];
  var roadblocks = [];
  var spikeStrips = [];
  var heli = null; // { mesh, light, angle }
  var wantedTimer = 0;
  var pitCooldown = 0;

  function setWanted(n) {
    var s = TA.state;
    var old = s.wanted;
    s.wanted = Math.max(0, Math.min(5, n));
    wantedTimer = 0;
    escalatePolice();
    TA.ui.renderHUD();
    TA.ui.renderDispatchPanel();
    if (s.wanted > old) {
      if (s.wanted >= 3) TA.crew.showCrewChatter('Sari', 'Wanted naik ke ' + s.wanted + ' bintang. Jangan panik, ikuti jalanku!');
      TA.audio.sirenSound();
    }
  }

  function escalatePolice() {
    var w = TA.state.wanted;
    activeUnits = DISPATCH_TEMPLATES.filter(function (u) { return w >= u.minWanted; })
      .map(function (u) {
        return { id: u.id, kind: u.kind, tactic: u.tactic, dist: 40 + Math.round(Math.random() * 260) };
      });
    if (w >= 3 && roadblocks.length === 0) spawnRoadblock();
    if (w >= 4 && spikeStrips.length === 0) deploySpikeStrip();
    if (w >= 5 && !heli) policeHelicopter();
    if (w < 3) clearRoadblocks();
    if (w < 4) clearSpikes();
    if (w < 5 && heli) removeHelicopter();
  }

  function spawnRoadblock() {
    var s = TA.state;
    var group = new THREE.Group();
    for (var i = -1; i <= 1; i++) {
      var car = TA.world.makeCarMesh(0x101418);
      car.position.set(i * 4.5, 0, 0); group.add(car);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 8), new THREE.MeshStandardMaterial({ color: 0xff5a2a }));
      cone.position.set(i * 4.5, 0.5, 3); group.add(cone);
    }
    var bar = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xffd23e }));
    bar.position.set(0, 1, 0); group.add(bar);
    var ahead = { x: TA.playerPos.x - Math.sin(TA.yaw) * 30, z: TA.playerPos.z - Math.cos(TA.yaw) * 30 };
    group.position.set(ahead.x, 0, ahead.z);
    group.rotation.y = TA.yaw;
    TA.scene.add(group);
    roadblocks.push(group);
    TA.ui.toast('ROADBLOCK di depan!');
  }
  function clearRoadblocks() {
    roadblocks.forEach(function (g) { TA.scene.remove(g); });
    roadblocks = [];
  }

  function deploySpikeStrip() {
    var group = new THREE.Group();
    for (var i = 0; i < 8; i++) {
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 }));
      spike.position.set(-3.5 + i, 0.3, 0); group.add(spike);
    }
    var ahead = { x: TA.playerPos.x - Math.sin(TA.yaw) * 18, z: TA.playerPos.z - Math.cos(TA.yaw) * 18 };
    group.position.set(ahead.x, 0, ahead.z);
    group.rotation.y = TA.yaw;
    TA.scene.add(group);
    spikeStrips.push(group);
    TA.ui.toast('SPIKE STRIP terpasang di jalan!');
  }
  function clearSpikes() {
    spikeStrips.forEach(function (g) { TA.scene.remove(g); });
    spikeStrips = [];
  }

  function policeHelicopter() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 5), new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.6 }));
    g.add(body);
    var rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rotor.position.y = 1; g.add(rotor);
    var light = new THREE.SpotLight(0xfff2b0, 3, 60, 0.35, 0.4);
    light.position.set(0, -1, 0); g.add(light);
    var target = new THREE.Object3D(); target.position.set(0, -30, 0); g.add(target);
    light.target = target;
    g.position.set(TA.playerPos.x + 20, 32, TA.playerPos.z + 20);
    TA.scene.add(g);
    heli = { mesh: g, light: light, rotor: rotor, angle: 0 };
    TA.ui.showHeliLabel(true);
    TA.ui.toast('ELANG-1 DITERJUNKAN — helikopter polisi mengorbit!');
  }
  function removeHelicopter() {
    if (heli) { TA.scene.remove(heli.mesh); heli = null; }
    TA.ui.showHeliLabel(false);
  }
  function updateHelicopter(dt) {
    if (!heli) return;
    heli.angle += dt * 0.5;
    var r = 22;
    heli.mesh.position.set(
      TA.playerPos.x + Math.cos(heli.angle) * r,
      30 + Math.sin(heli.angle * 2) * 2,
      TA.playerPos.z + Math.sin(heli.angle) * r
    );
    heli.mesh.lookAt(TA.playerPos.x, 0, TA.playerPos.z);
    heli.rotor.rotation.y += dt * 30;
    heli.light.target.position.set(TA.playerPos.x - heli.mesh.position.x, -30, TA.playerPos.z - heli.mesh.position.z);
  }

  function cooldownWanted(dt) {
    var s = TA.state;
    if (s.wanted <= 0) return;
    var rate = 1;
    if (s.crew.agus) rate *= 1.3;
    if (s.rank >= 5) rate *= 1.2;
    wantedTimer += dt * rate;
    // hide: if player is slow / in safehouse zone, wanted decays
    var speed = Math.abs(s.speedKmh || 0);
    var hiding = speed < 5 && !s.inCar;
    if (wantedTimer > (hiding ? 25 : 60)) {
      wantedTimer = 0;
      setWanted(s.wanted - 1);
      TA.ui.toast('Wanted turun — kau berhasil bersembunyi.');
    }
  }

  function update(dt) {
    updateHelicopter(dt);
    pitCooldown -= dt;
    // police cars ram the player when wanted >= 2
    if (TA.state.wanted >= 2 && TA.state.inCar) {
      TA.world.TRAFFIC_CARS.forEach(function (c) {
        var d = Math.hypot(c.mesh.position.x - TA.playerPos.x, c.mesh.position.z - TA.playerPos.z);
        if (d < 6 && Math.random() < dt * 0.5) {
          TA.player.damageCar(TA.state.carId, 2);
          TA.player.takeDamage(2);
        }
      });
    }
    // PIT manoeuvre at wanted >= 4
    if (TA.state.wanted >= 4 && TA.state.inCar && pitCooldown <= 0) {
      pitCooldown = 8;
      TA.player.damageCar(TA.state.carId, 8);
      TA.ui.toast('PIT MANOEUVRE! Mobilmu oleng.');
    }
    // spike strip puncture
    spikeStrips.forEach(function (g) {
      var d = Math.hypot(g.position.x - TA.playerPos.x, g.position.z - TA.playerPos.z);
      if (d < 4 && TA.state.inCar) {
        TA.player.damageCar(TA.state.carId, 15);
        TA.ui.toast('Ban kena spike strip!');
        clearSpikes();
      }
    });
    // refresh dispatch distances slowly
    activeUnits.forEach(function (u) { u.dist = Math.max(12, u.dist + Math.round((Math.random() - 0.5) * 10)); });
  }

  function getDispatchUnits() {
    return activeUnits.map(function (u) { return { id: u.id, kind: u.kind, tactic: u.tactic, dist: u.dist }; });
  }

  TA.police = {
    setWanted: setWanted, escalatePolice: escalatePolice,
    spawnRoadblock: spawnRoadblock, deploySpikeStrip: deploySpikeStrip,
    policeHelicopter: policeHelicopter, updateHelicopter: updateHelicopter,
    cooldownWanted: cooldownWanted, getDispatchUnits: getDispatchUnits,
    update: update,
  };
})();
