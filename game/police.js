// TELUK ARUNIKA v3 — police.js
// Wanted 1-5: patroli jalan kaki, mobil patroli, roadblock, PIT + spike strip,
// ELANG-1 (helikopter taktis + spotlight). Cooldown / sembunyi.
(function () {
  'use strict';

  var PL = TA.police = {};

  PL.patrols = [];      // mobil patroli yang mengejar
  PL.footPatrols = [];  // polisi jalan kaki
  PL.roadblocks = [];   // {group, x, z}
  PL.spikes = [];       // {mesh, x, z}
  PL.heli = null;       // {group, rotor, light, angle}
  PL.cooldownRate = 1;  // detik per pengurangan wanted saat sembunyi
  PL.spawnTimer = 0;
  PL.sirenOn = false;

  PL.initPolice = function () {
    PL.patrols = [];
    PL.footPatrols = [];
    PL.roadblocks = [];
    PL.spikes = [];
    PL.heli = null;
  };

  PL.clearPolice = function () {
    PL.patrols.forEach(function (c) { TA.scene.remove(c.group); });
    PL.footPatrols.forEach(function (p) { TA.scene.remove(p.group); });
    PL.roadblocks.forEach(function (r) { TA.scene.remove(r.group); });
    PL.spikes.forEach(function (s) { TA.scene.remove(s.mesh); });
    if (PL.heli) TA.scene.remove(PL.heli.group);
    if (PL.heliCone) { TA.scene.remove(PL.heliCone); PL.heliCone = null; }
    PL.initPolice();
    TA.state.wanted = 0;
    TA.state.wantedTimer = 0;
    TA.audio.stopSiren();
  };

  PL.setWanted = function (n) {
    var s = TA.state;
    n = TA.clamp(Math.round(n), 0, 5);
    if (n === s.wanted) return;
    var rose = n > s.wanted;
    s.wanted = n;
    s.wantedTimer = 0;
    if (rose) {
      if (n === 2) TA.ui.toast('Polisi mengejarmu! Wanted 2 — mobil patroli dikerahkan.');
      if (n === 3) TA.ui.toast('Wanted 3 — ROADBLOCK di depan! Cari jalan lain.');
      if (n === 4) TA.ui.toast('Wanted 4 — spike strip & manuver PIT. ELANG-1 bersiap.');
      if (n === 5) TA.ui.toast('Wanted 5 — ELANG-1 di udara! Sembunyi atau masuk safehouse.');
      // Kekacauan menurunkan suasana distrik tempatmu berada.
      var d = TA.world.getDistrictAt(TA.px, TA.pz);
      if (d) TA.world.updateDistrictStanding(d.id, -3);
      // Obrolan radio kru saat wanted naik.
      if (TA.crew.isRecruited('agus')) {
        TA.ui.showCrewChatter('Agus', 'Wanted naik ke ' + n + '. Jangan panik — sembunyi di gang, kameranya kubutakan.');
      } else if (TA.crew.isRecruited('sari')) {
        TA.ui.showCrewChatter('Sari', 'Wanted ' + n + '! Gaspol, Raka — jangan berhenti di jalan besar.');
      }
      TA.audio.sirenSound();
    }
    if (n === 0) TA.audio.stopSiren();
    PL.escalatePolice();
    TA.ui.renderHUD(true);
  };

  // ---------------------------------------------------------- dispatch (v3.5)
  // Daftar unit polisi aktif: NAMA + JENIS + TAKTIK + JARAK (meter),
  // diurutkan dari yang terdekat. Dipakai panel dispatch di HUD.
  PL.getDispatchUnits = function () {
    var s = TA.state;
    var px = s.inCar && TA.car ? TA.car.x : TA.px;
    var pz = s.inCar && TA.car ? TA.car.z : TA.pz;
    var dist = function (x, z) {
      return Math.round(Math.sqrt((px - x) * (px - x) + (pz - z) * (pz - z)));
    };
    var units = [];
    if (PL.heli) {
      units.push({ name: 'ELANG-1', kind: 'AIR', tactic: 'SPOTLIGHT', dist: dist(PL.heli.group.position.x, PL.heli.group.position.z) });
    }
    PL.roadblocks.forEach(function (r, i) {
      units.push({ name: 'BLOKIR-0' + (3 + i * 2), kind: 'BLOKIR', tactic: 'ROADBLOCK', dist: dist(r.x, r.z) });
    });
    PL.spikes.forEach(function (sp, i) {
      units.push({ name: 'BLOKIR-0' + (7 + i * 2), kind: 'BLOKIR', tactic: 'SPIKE STRIP', dist: dist(sp.x, sp.z) });
    });
    var tactics = s.wanted >= 4 ? ['PIT', 'RAMMING', 'FLANKING', 'BOX IN'] : ['RAMMING', 'FLANKING', 'BOX IN', 'PIT'];
    var names = ['PATROLI-07', 'PATROLI-12', 'PATROLI-21', 'PATROLI-09'];
    PL.patrols.forEach(function (c, i) {
      units.push({ name: names[i % names.length], kind: 'MOBIL', tactic: tactics[i % tactics.length], dist: dist(c.x, c.z) });
    });
    PL.footPatrols.forEach(function (f) {
      units.push({ name: 'PATROLI-31', kind: 'KAKI', tactic: 'PENGEJARAN', dist: dist(f.x, f.z) });
    });
    units.sort(function (a, b) { return a.dist - b.dist; });
    return units.slice(0, 6);
  };

  // Sesuaikan kekuatan polisi dengan level wanted saat ini.
  PL.escalatePolice = function () {
    var w = TA.state.wanted;
    var wantPatrols = w >= 2 ? Math.min(w - 1, 4) : 0;
    while (PL.patrols.length < wantPatrols) PL.spawnPatrolCar();
    while (PL.patrols.length > wantPatrols) {
      var c = PL.patrols.pop();
      TA.scene.remove(c.group);
      var ti = TA.traffic.indexOf(c);
      if (ti >= 0) TA.traffic.splice(ti, 1);
    }
    var wantFoot = w === 1 ? 2 : 0;
    while (PL.footPatrols.length < wantFoot) PL.spawnFootPatrol();
    while (PL.footPatrols.length > wantFoot) {
      var f = PL.footPatrols.pop();
      TA.scene.remove(f.group);
    }
    if (w >= 3 && PL.roadblocks.length === 0) {
      PL.spawnRoadblock(TA.px + 10, TA.pz - 40);
    }
    if (w < 3) PL.clearRoadblocks();
    if (w >= 5 && !PL.heli) PL.spawnHelicopter();
    if (w < 5 && PL.heli) {
      TA.scene.remove(PL.heli.group);
      PL.heli = null;
    }
  };

  PL.makePoliceCar = function (x, z) {
    var car = TA.world.makeCar(0x111418, x, z, 0);
    car.isPolice = true;
    car.hp = 120;
    car.speed = 0; car.cruise = 20;
    // Cat putih di pintu + light bar merah-biru.
    var doorMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    var door = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.4, 1.4), doorMat);
    door.position.y = 0.65;
    car.group.add(door);
    var barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.9 }));
    barR.position.set(-0.4, 1.75, -0.2);
    var barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 0.9 }));
    barB.position.set(0.4, 1.75, -0.2);
    car.group.add(barR, barB);
    car.lightR = barR; car.lightB = barB;
    TA.scene.add(car.group);
    return car;
  };

  PL.spawnPatrolCar = function () {
    var ang = TA.rng() * Math.PI * 2;
    var x = TA.px + Math.cos(ang) * TA.rand(35, 55);
    var z = TA.pz + Math.sin(ang) * TA.rand(35, 55);
    var car = PL.makePoliceCar(x, z);
    PL.patrols.push(car);
    TA.traffic.push(car);
  };

  PL.spawnFootPatrol = function () {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x1a2a4a }));
    body.position.y = 0.95;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xc89070 }));
    head.position.y = 1.75;
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x0a1428 }));
    cap.position.y = 1.95;
    g.add(body, head, cap);
    var x = TA.px + TA.rand(-14, 14), z = TA.pz + TA.rand(-14, 14);
    g.position.set(x, 0, z);
    TA.scene.add(g);
    PL.footPatrols.push({ group: g, x: x, z: z, speed: 3.4 });
  };

  // Roadblock: 2 mobil polisi + barier melintang jalan di depan pemain.
  PL.spawnRoadblock = function (x, z) {
    var g = new THREE.Group();
    var barrierMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
    var stripeMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    for (var i = -1; i <= 1; i++) {
      var bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.5), barrierMat);
      bar.position.set(i * 3.6, 0.9, 0);
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.52), stripeMat);
      stripe.position.set(i * 3.6, 1.1, 0);
      g.add(bar, stripe);
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.5), barrierMat);
      leg.position.set(i * 3.6, 0.45, 0);
      g.add(leg);
    }
    g.position.set(x, 0, z);
    TA.scene.add(g);
    var c1 = PL.makePoliceCar(x - 7, z + 3);
    var c2 = PL.makePoliceCar(x + 7, z - 3);
    PL.roadblocks.push({ group: g, x: x, z: z, cars: [c1, c2] });
    TA.ui.toast('ROADBLOCK! Polisi menutup jalan di depan.');
    if (TA.crew.isRecruited('sari')) {
      TA.ui.showCrewChatter('Sari', 'Roadblock di depan, dua blok lagi. Belok kiri di gang!');
    }
  };

  PL.clearRoadblocks = function () {
    PL.roadblocks.forEach(function (r) {
      TA.scene.remove(r.group);
      r.cars.forEach(function (c) {
        TA.scene.remove(c.group);
        var ti = TA.traffic.indexOf(c);
        if (ti >= 0) TA.traffic.splice(ti, 1);
      });
    });
    PL.roadblocks = [];
  };

  PL.deploySpikeStrip = function (x, z) {
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.25, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    // Paku-paku kecil.
    for (var i = 0; i < 9; i++) {
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6),
        new THREE.MeshLambertMaterial({ color: 0xdddddd, emissive: 0xdddddd, emissiveIntensity: 0.6 }));
      spike.position.set(-3 + i * 0.75, 0.35, 0);
      mesh.add(spike);
    }
    mesh.position.set(x, 0.1, z);
    TA.scene.add(mesh);
    PL.spikes.push({ mesh: mesh, x: x, z: z });
  };

  PL.onSpikeStrip = function (x, z) {
    for (var i = 0; i < PL.spikes.length; i++) {
      var s = PL.spikes[i];
      if (Math.abs(x - s.x) < 4 && Math.abs(z - s.z) < 2) return true;
    }
    return false;
  };

  // ELANG-1: helikopter taktis, orbit ketat + spotlight mengikuti pemain.
  PL.spawnHelicopter = function () {
    if (PL.heli) return PL.heli;
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a5570, emissive: 0x2a4258, emissiveIntensity: 1.1 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6.5), bodyMat);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), bodyMat);
    tail.position.set(0, 0.3, -5);
    var cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x88bbdd }));
    cockpit.position.set(0, 0.4, 2.4);
    var rotor = new THREE.Group();
    var bladeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    var b1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), bladeMat);
    var b2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 11), bladeMat);
    rotor.add(b1, b2);
    rotor.position.y = 1.2;
    g.add(body, tail, cockpit, rotor);
    var spot = new THREE.SpotLight(0xfff6c8, 300, 90, 0.32, 0.45, 1.2);
    spot.position.set(0, -0.5, 1);
    g.add(spot);
    g.add(spot.target);
    // Tulisan ELANG-1: panel putih di badan (kotak kecil terang).
    var tag = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.9 }));
    tag.position.set(0, 0, 3.3);
    g.add(tag);
    g.position.set(TA.px + 20, 34, TA.pz - 10);
    TA.scene.add(g);
    PL.heli = { group: g, rotor: rotor, light: spot, angle: 0 };
    TA.ui.toast('ELANG-1 di udara — spotlight menguncimu!');
    return PL.heli;
  };

  // Kerucut cahaya spotlight ELANG-1 (transparan) — membuat sorot terlihat di screenshot.
  PL.stageHeliCone = function () {
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 24, 20, 1, true),
      new THREE.MeshLambertMaterial({
        color: 0xfff6c8, emissive: 0xfff6c8, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false
      })
    );
    // Antara heli (-18,16,-6) dan mobil (-2,0,26): tengah (-10,8,10), dimiringkan ke arah mobil.
    cone.position.set(-10, 8, 10);
    cone.rotation.x = -0.55;
    cone.rotation.z = 0.35;
    TA.scene.add(cone);
    PL.heliCone = cone;
  };

  PL.updateHelicopter = function (dt) {
    if (!PL.heli) return;
    var h = PL.heli;
    h.angle += dt * 0.55;
    var px = TA.state.inCar && TA.car ? TA.car.x : TA.px;
    var pz = TA.state.inCar && TA.car ? TA.car.z : TA.pz;
    var r = 26;
    h.group.position.set(px + Math.cos(h.angle) * r, 32 + Math.sin(h.angle * 0.7) * 2, pz + Math.sin(h.angle) * r);
    h.group.lookAt(px, 0, pz);
    h.rotor.rotation.y += dt * 22;
    h.light.target.position.set(px - h.group.position.x, -h.group.position.y, pz - h.group.position.z);
    h.light.target.updateMatrixWorld();
  };

  PL.update = function (dt) {
    var s = TA.state;
    if (s.mode !== 'playing') return;
    // Mode screenshot: adegan sudah ditata applyShot — polisi dibekukan supaya
    // tidak mengubah posisi / kecepatan mobil sebelum capture.
    if (TA.shot > 0) return;
    var px = s.inCar && TA.car ? TA.car.x : TA.px;
    var pz = s.inCar && TA.car ? TA.car.z : TA.pz;

    // Kedip lampu patroli.
    var blink = Math.floor(performance.now() / 300) % 2 === 0;
    PL.patrols.forEach(function (c) {
      if (c.lightR) c.lightR.material.color.setHex(blink ? 0xff2222 : 0x550000);
      if (c.lightB) c.lightB.material.color.setHex(blink ? 0x111155 : 0x2244ff);
    });

    if (s.wanted <= 0) {
      PL.updateHelicopter(dt);
      return;
    }

    // Mobil patroli mengejar pemain (kemudi sederhana ke arah pemain).
    for (var i = 0; i < PL.patrols.length; i++) {
      var car = PL.patrols[i];
      var dx = px - car.x, dz = pz - car.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var wantHeading = Math.atan2(dx, dz);
      var dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += TA.clamp(dh, -1.6 * dt, 1.6 * dt);
      var targetSpeed = dist > 6 ? 24 : 6;
      car.speed = TA.lerp(car.speed, targetSpeed, 1 - Math.pow(0.02, dt));
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      car.group.position.set(car.x, 0, car.z);
      car.group.rotation.y = car.heading;
      // PIT (wanted 4+): tabrak sisi mobil pemain sampai melambat.
      if (s.wanted >= 4 && dist < 4.5 && TA.car) {
        TA.car.speed *= 0.96;
        if (TA.rng() < dt * 0.5) {
          TA.ui.toast('PIT! Polisi menabrak sisi mobilmu.');
          TA.audio.crashSound();
        }
      }
      // Polisi jalan kaki tertangkap -> damage / wanted naik.
      if (dist < 3 && !s.inCar) {
        TA.player.takeDamage(6 * dt, 'polisi');
      }
      // Tabrakan patroli vs pemain on-foot.
      if (dist < 2.2 && !s.inCar) {
        TA.player.takeDamage(14 * dt, 'patroli');
      }
    }

    // Polisi jalan kaki mendekat.
    for (var j = 0; j < PL.footPatrols.length; j++) {
      var f = PL.footPatrols[j];
      var fdx = px - f.x, fdz = pz - f.z;
      var fd = Math.sqrt(fdx * fdx + fdz * fdz);
      if (fd > 1.2) {
        f.x += (fdx / fd) * f.speed * dt;
        f.z += (fdz / fd) * f.speed * dt;
        f.group.rotation.y = Math.atan2(fdx, fdz);
      }
      f.group.position.set(f.x, 0, f.z);
      if (fd < 2 && !s.inCar) TA.player.takeDamage(8 * dt, 'polisi');
    }

    // Roadblock: tabrakan memperlambat mobil pemain.
    for (var rb = 0; rb < PL.roadblocks.length; rb++) {
      var r = PL.roadblocks[rb];
      var rdx = px - r.x, rdz = pz - r.z;
      if (Math.abs(rdx) < 6 && Math.abs(rdz) < 3 && TA.car) {
        TA.car.speed *= 0.4;
        TA.audio.crashSound();
        TA.ui.toast('Kau menabrak roadblock!');
        PL.roadblocks.splice(rb, 1);
        TA.scene.remove(r.group);
        rb--;
      }
    }

    // Deploy spike strip otomatis saat wanted 4 dan pemain ngebut di mobil.
    PL.spawnTimer -= dt;
    if (s.wanted >= 4 && PL.spawnTimer <= 0 && TA.car && Math.abs(TA.car.speed) > 12) {
      PL.spawnTimer = 9;
      var h = TA.car.heading;
      PL.deploySpikeStrip(TA.car.x + Math.sin(h) * 30, TA.car.z + Math.cos(h) * 30);
      TA.ui.toast('Spike strip dipasang di depan!');
    }

    PL.updateHelicopter(dt);

    // Cooldown wanted: sembunyi (jauh dari polisi / di safehouse) -> turun.
    var nearest = 999;
    PL.patrols.forEach(function (c) {
      var d = Math.sqrt((c.x - px) * (c.x - px) + (c.z - pz) * (c.z - pz));
      if (d < nearest) nearest = d;
    });
    var safehouse = TA.world.markers.safehouse;
    var atSafehouse = Math.sqrt((px - safehouse.x) * (px - safehouse.x) + (pz - safehouse.z) * (pz - safehouse.z)) < 12;
    var hidden = atSafehouse || nearest > 55;
    var bonus = TA.crew.getCrewBonus();
    var frozen = performance.now() < s.gaspolUntil;
    if (hidden && !frozen) {
      s.wantedTimer += dt * bonus.wantedCooldownMul;
      var need = 7; // detik sembunyi per 1 bintang
      if (s.wantedTimer >= need) {
        s.wantedTimer = 0;
        PL.setWanted(s.wanted - 1);
        if (s.wanted === 0) TA.ui.toast('Kau lolos. Wanted hilang.');
        else TA.ui.toast('Wanted turun ke ' + s.wanted + ' bintang.');
        if (s.wanted >= 4) TA.career.addXP(25); // selamat dari wanted 4+
      }
    } else {
      s.wantedTimer = Math.max(0, s.wantedTimer - dt);
    }
  };

  PL.cooldownWanted = function () {
    TA.state.wantedTimer = 0;
    PL.setWanted(Math.max(0, TA.state.wanted - 1));
  };
})();
