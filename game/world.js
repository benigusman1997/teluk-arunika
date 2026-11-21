// TELUK ARUNIKA v3 — world.js
// Membangun kota pelabuhan hujan tropis: gedung, jalan, tol layang, pelabuhan,
// pasar, gang neon, pantai; traffic AI + pejalan kaki; hujan; siklus siang/malam.
(function () {
  'use strict';

  var W = TA.world = {};

  // Denah: jalan tiap 40 unit, kota -220..220, pelabuhan di selatan (z > 170).
  W.STREETS = [-200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200];
  W.BOUND = 225;
  W.buildings = [];   // {x, z, hw, hd} untuk tabrakan
  W.markers = {};     // safehouse, garage, workshop, market, harbour
  W.lightPhase = 0;   // 0 = hijau sumbu X, 1 = hijau sumbu Z
  W.lightTimer = 0;
  W.rain = null;
  W.rainVel = null;
  W.neonSigns = [];

  function canvasTexture(w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    return t;
  }

  // Tekstur tanah: aspal + jalan grid + marka + trotoar.
  W.makeGroundTexture = function () {
    return canvasTexture(1024, 1024, function (g, w, h) {
      g.fillStyle = '#23262b'; g.fillRect(0, 0, w, h);
      // Trotoar blok
      g.fillStyle = '#2e3238';
      for (var i = 0; i < 11; i++) for (var j = 0; j < 11; j++) {
        var x = 40 + i * 88, y = 40 + j * 88;
        g.fillRect(x, y, 76, 76);
      }
      // Jalan
      g.fillStyle = '#17191d';
      for (var k = 0; k < 11; k++) {
        g.fillRect(0, 28 + k * 88, w, 24);
        g.fillRect(28 + k * 88, 0, 24, h);
      }
      // Marka tengah putus-putus
      g.fillStyle = '#c9a227';
      for (var m = 0; m < 11; m++) {
        for (var d = 0; d < 32; d++) {
          g.fillRect(20 + d * 32, 38 + m * 88, 14, 3);
          g.fillRect(38 + m * 88, 20 + d * 32, 3, 14);
        }
      }
      // Zebra cross di persimpangan
      g.fillStyle = '#d8d8d8';
      for (var p = 0; p < 11; p++) for (var q = 0; q < 11; q++) {
        var cx = 28 + p * 88, cy = 28 + q * 88;
        for (var s = 0; s < 5; s++) {
          g.fillRect(cx + 2 + s * 5, cy - 6, 3, 5);
          g.fillRect(cx + 2 + s * 5, cy + 25, 3, 5);
        }
      }
      // Area pelabuhan (selatan) + pantai (timur)
      g.fillStyle = '#1d2f3a'; g.fillRect(0, 880, w, 144);
      g.fillStyle = '#274b5f'; g.fillRect(0, 960, w, 64);
      g.fillStyle = '#3a3230'; g.fillRect(900, 0, 124, h);
    });
  };

  // Tekstur jendela gedung: jendela menyala acak (dasar terang supaya gedung tidak hitam).
  W.makeWindowTexture = function (litRatio) {
    return canvasTexture(128, 256, function (g, w, h) {
      g.fillStyle = '#565e6e'; g.fillRect(0, 0, w, h);
      for (var y = 8; y < h - 8; y += 18) {
        for (var x = 8; x < w - 8; x += 16) {
          if (TA.rng() < litRatio) {
            g.fillStyle = TA.pick(['#ffd27a', '#9fd8ff', '#ff9a5c', '#fff3c4']);
          } else {
            g.fillStyle = '#2a313e';
          }
          g.fillRect(x, y, 10, 12);
        }
      }
    });
  };

  W.makeNeonTexture = function (text, color) {
    return canvasTexture(256, 96, function (g, w, h) {
      g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h);
      g.font = 'bold 44px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = color; g.shadowBlur = 18;
      g.fillStyle = color;
      g.fillText(text, w / 2, h / 2);
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.fillText(text, w / 2, h / 2);
    });
  };

  W.buildCity = function () {
    var scene = TA.scene;
    var groundTex = W.makeGroundTexture();
    groundTex.anisotropy = 4;
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 460),
      // Lambert (bukan Phong): satu varian program lebih sedikit untuk kompilasi SwiftShader.
      new THREE.MeshLambertMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    scene.add(ground);

    // Laut di selatan pelabuhan (Lambert — tanpa Phong, hemat satu program shader).
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 90),
      new THREE.MeshLambertMaterial({ color: 0x0e3a4d, transparent: true, opacity: 0.92 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.4, 265);
    scene.add(sea);

    // --- Gedung: 60+ blok ---
    var winTexDay = W.makeWindowTexture(0.35);
    var winTexNight = W.makeWindowTexture(0.55);
    W.winTexDay = winTexDay; W.winTexNight = winTexNight;
    var boxGeo = new THREE.BoxGeometry(1, 1, 1);
    var palette = [0x6a7a8a, 0x7a6a5a, 0x5a6a7a, 0x84705a, 0x4f6a7a, 0x7d7a85, 0x93685a];
    var count = 0;
    for (var bx = -5; bx <= 5; bx++) {
      for (var bz = -5; bz <= 4; bz++) {
        // Kosongkan: alun-alun pasar (tengah), gang neon, area pelabuhan.
        if (bx === 0 && bz === 0) continue;
        if (bx === -1 && bz === 0) continue; // gang neon
        if (bz >= 4) continue; // pelabuhan
        var cx = bx * 40 + 20, cz = bz * 40 + 20;
        var n = TA.randi(1, 2);
        for (var k = 0; k < n; k++) {
          var wdt = TA.rand(14, 22), dep = TA.rand(14, 22), hgt = TA.rand(12, 46);
          var ox = cx + (k === 0 ? -6 : 7), oz = cz + (k === 0 ? -5 : 6);
          var mat = new THREE.MeshLambertMaterial({
            color: TA.pick(palette), map: (hgt > 26 ? winTexNight : winTexDay)
          });
          var b = new THREE.Mesh(boxGeo, mat);
          b.scale.set(wdt, hgt, dep);
          b.position.set(ox, hgt / 2, oz);
          scene.add(b);
          // Atap: kotak AC / tangki air
          var roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x22262c }));
          roof.scale.set(3, 1.6, 3);
          roof.position.set(ox + 3, hgt + 0.8, oz - 2);
          scene.add(roof);
          W.buildings.push({ x: ox, z: oz, hw: wdt / 2, hd: dep / 2 });
          count++;
        }
      }
    }
    W.buildingCount = count;

    // --- Jalan tol layang (utara, z = -180) ---
    var tollMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
    var toll = new THREE.Mesh(boxGeo, tollMat);
    toll.scale.set(440, 1.2, 14);
    toll.position.set(0, 9, -180);
    scene.add(toll);
    for (var px = -200; px <= 200; px += 40) {
      var pillar = new THREE.Mesh(boxGeo, tollMat);
      pillar.scale.set(3, 9, 3);
      pillar.position.set(px, 4.5, -180);
      scene.add(pillar);
    }
    // Railing tol
    var railMat = new THREE.MeshLambertMaterial({ color: 0x8a94a3 });
    var rail = new THREE.Mesh(boxGeo, railMat);
    rail.scale.set(440, 0.5, 0.4);
    rail.position.set(0, 10.1, -173.5);
    scene.add(rail);

    // --- Pelabuhan (selatan): kontainer, derek, gudang ---
    var contColors = [0x8a3b2e, 0x2e5a8a, 0x4a7a3a, 0xb08a2e, 0x6a4a7a, 0x9a5a2e];
    for (var ci = 0; ci < 26; ci++) {
      var ccx = -120 + (ci % 9) * 26 + TA.rand(-4, 4);
      var ccz = 185 + Math.floor(ci / 9) * 14 + TA.rand(-3, 3);
      var stack = TA.randi(1, 3);
      for (var st = 0; st < stack; st++) {
        var cont = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: TA.pick(contColors) }));
        cont.scale.set(12, 3, 3.2);
        cont.position.set(ccx, 1.5 + st * 3.1, ccz);
        cont.rotation.y = (TA.rng() < 0.5 ? 0 : Math.PI / 2) * 0 + (TA.rng() < 0.15 ? 0.08 : 0);
        scene.add(cont);
      }
      W.buildings.push({ x: ccx, z: ccz, hw: 6.5, hd: 2.2 });
    }
    // Derek pelabuhan (2 buah, rangka sederhana)
    for (var cr = 0; cr < 2; cr++) {
      var crane = new THREE.Group();
      var legMat = new THREE.MeshLambertMaterial({ color: 0xc9a227 });
      var leg1 = new THREE.Mesh(boxGeo, legMat); leg1.scale.set(2, 34, 2); leg1.position.set(-5, 17, 0);
      var leg2 = new THREE.Mesh(boxGeo, legMat); leg2.scale.set(2, 34, 2); leg2.position.set(5, 17, 0);
      var beam = new THREE.Mesh(boxGeo, legMat); beam.scale.set(26, 2, 2); beam.position.set(4, 33, 0);
      var cab = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
      cab.scale.set(4, 3, 4); cab.position.set(0, 30, 0);
      crane.add(leg1, leg2, beam, cab);
      crane.position.set(-60 + cr * 120, 0, 205);
      scene.add(crane);
    }
    // Gudang Darma (markas akhir Misi 10)
    var warehouse = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x5a3a30, map: winTexNight }));
    warehouse.scale.set(34, 12, 18);
    warehouse.position.set(40, 6, 200);
    scene.add(warehouse);
    W.buildings.push({ x: 40, z: 200, hw: 17, hd: 9 });
    W.markers.harbour = { x: 0, z: 195 };

    // --- Pasar (alun-alun tengah): kios-kios ---
    for (var mk = 0; mk < 10; mk++) {
      var ang = (mk / 10) * Math.PI * 2;
      var kx = Math.cos(ang) * 12, kz = Math.sin(ang) * 12;
      var stall = new THREE.Group();
      var base = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: TA.pick([0x7a4a2e, 0x4a6a3a, 0x8a6a2e]) }));
      base.scale.set(4, 2.4, 3); base.position.y = 1.2;
      var roofM = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: TA.pick([0xb03a2e, 0x2e6a8a, 0xd8a020]) }));
      roofM.scale.set(4.6, 0.4, 3.6); roofM.position.y = 2.8;
      stall.add(base, roofM);
      stall.position.set(kx, 0, kz);
      scene.add(stall);
    }
    W.markers.market = { x: 0, z: 0 };

    // --- Gang neon (barat tengah): papan neon + lampu warna ---
    var neonData = [
      { t: 'WARUNG', c: '#ff2e88', x: -42, z: -2, ry: Math.PI / 2 },
      { t: 'NEON', c: '#22d3ee', x: -42, z: 6, ry: Math.PI / 2 },
      { t: 'BENGKEL', c: '#facc15', x: -30, z: -14, ry: 0 },
      { t: 'TAXI', c: '#4ade80', x: 14, z: -14, ry: Math.PI },
      { t: 'KOPI', c: '#fb923c', x: -42, z: -10, ry: Math.PI / 2 }
    ];
    neonData.forEach(function (nd) {
      var tex = W.makeNeonTexture(nd.t, nd.c);
      var sign = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 3.4),
        new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.85 })
      );
      sign.position.set(nd.x, 5.2, nd.z);
      sign.rotation.y = nd.ry;
      scene.add(sign);
      W.neonSigns.push(sign);
      // Tanpa PointLight: papan neon memakai Lambert emissive —
      // tiap PointLight menambah varian shader & biaya kompilasi SwiftShader.
    });
    W.markers.alley = { x: -40, z: 0 };

    // --- Bengkel Pak Amir (workshop) + safehouse + garasi ---
    function beacon(x, z, color, label) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x555555 }));
      pole.scale.set(0.5, 7, 0.5); pole.position.y = 3.5;
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10),
        new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.9 }));
      lamp.position.y = 7.2;
      // Tanpa PointLight (lihat catatan neon di atas): bola lampu Basic sudah menyala.
      g.add(pole, lamp);
      g.position.set(x, 0, z);
      scene.add(g);
      return g;
    }
    W.markers.workshop = { x: -60, z: 60 };
    W.markers.garage = { x: 60, z: -60 };
    W.markers.safehouse = { x: -40, z: 0 };
    W.markers.taxiStand = { x: 20, z: 20 };
    beacon(-60, 60, 0xfacc15, 'workshop');
    beacon(60, -60, 0x22d3ee, 'garage');
    beacon(-40, 0, 0x4ade80, 'safehouse');
    beacon(20, 20, 0xfacc15, 'taxi');

    // Lampu jalan di tiap persimpangan.
    var lampMat = new THREE.MeshLambertMaterial({ color: 0x333a42 });
    for (var lx = -4; lx <= 4; lx += 2) {
      for (var lz = -4; lz <= 4; lz += 2) {
        var post = new THREE.Mesh(boxGeo, lampMat);
        post.scale.set(0.4, 6, 0.4);
        post.position.set(lx * 40 + 14, 3, lz * 40 + 14);
        scene.add(post);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 0.9 }));
        bulb.position.set(lx * 40 + 14, 6.2, lz * 40 + 14);
        scene.add(bulb);
      }
    }

    // --- Hujan (points) ---
    var rainCount = 1400;
    var pos = new Float32Array(rainCount * 3);
    W.rainVel = new Float32Array(rainCount);
    for (var ri = 0; ri < rainCount; ri++) {
      pos[ri * 3] = TA.rand(-35, 35);
      pos[ri * 3 + 1] = TA.rand(0, 30);
      pos[ri * 3 + 2] = TA.rand(-35, 35);
      W.rainVel[ri] = TA.rand(22, 38);
    }
    var rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var rainMat = new THREE.PointsMaterial({ color: 0x9fc4e0, size: 0.14, transparent: true, opacity: 0.55 });
    var rain = new THREE.Points(rainGeo, rainMat);
    rain.visible = true;
    rain.frustumCulled = false;
    scene.add(rain);
    W.rain = rain;

    // Genangan "basah": bidang semi-transparan terang di jalan utama.
    var puddleMat = new THREE.MeshLambertMaterial({ color: 0x2a3a4a, transparent: true, opacity: 0.55 });
    for (var pu = 0; pu < 8; pu++) {
      var pud = new THREE.Mesh(new THREE.PlaneGeometry(TA.rand(4, 9), TA.rand(3, 6)), puddleMat);
      pud.rotation.x = -Math.PI / 2;
      pud.position.set(TA.rand(-160, 160), 0.06, TA.rand(-160, 160));
      scene.add(pud);
    }
  };

  // Tabrakan sederhana terhadap gedung + batas dunia.
  W.collides = function (x, z, r) {
    if (Math.abs(x) > W.BOUND || Math.abs(z) > W.BOUND + 30) return true;
    for (var i = 0; i < W.buildings.length; i++) {
      var b = W.buildings[i];
      if (Math.abs(x - b.x) < b.hw + r && Math.abs(z - b.z) < b.hd + r) return true;
    }
    return false;
  };

  // ---------------------------------------------------------------- mobil
  W.CAR_COLORS = [0xc0392b, 0x2e6a8a, 0xd8a020, 0x4a4a4a, 0x7a8a99, 0x5a3a6a, 0x3a7a4a, 0x8a5a2e, 0xdddddd, 0x222831];

  W.makeCar = function (color, x, z, heading) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshLambertMaterial({ color: color });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
    body.position.y = 0.65;
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x101418 }));
    cabin.position.set(0, 1.3, -0.2);
    g.add(body, cabin);
    // Lampu depan/belakang
    var headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xfff2b0, emissiveIntensity: 0.9 });
    var h1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    h1.position.set(-0.7, 0.7, 2.25);
    var h2 = h1.clone(); h2.position.x = 0.7;
    var tailMat = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.9 });
    var t1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    t1.position.set(-0.7, 0.7, -2.25);
    var t2 = t1.clone(); t2.position.x = 0.7;
    g.add(h1, h2, t1, t2);
    // Roda
    var wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].forEach(function (p) {
      var wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(p[0], 0.38, p[1]);
      g.add(wh);
    });
    g.position.set(x, 0, z);
    g.rotation.y = heading || 0;
    var car = {
      group: g, x: x, z: z, heading: heading || 0, speed: 0,
      color: color, hp: 100, stolen: false, isPolice: false,
      axis: 'x', dir: 1, stopped: false, driver: null, honked: false
    };
    g.userData.car = car;
    return car;
  };

  W.spawnTraffic = function (n) {
    for (var i = 0; i < n; i++) {
      var axis = TA.rng() < 0.5 ? 'x' : 'z';
      var street = TA.pick(W.STREETS);
      var along = TA.rand(-200, 200);
      var x = axis === 'x' ? along : street + (TA.rng() < 0.5 ? 3 : -3);
      var z = axis === 'x' ? street + (TA.rng() < 0.5 ? 3 : -3) : along;
      var dir = TA.rng() < 0.5 ? 1 : -1;
      var car = W.makeCar(TA.pick(W.CAR_COLORS), x, z, axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI));
      car.axis = axis; car.dir = dir; car.speed = TA.rand(7, 12);
      car.cruise = car.speed;
      TA.scene.add(car.group);
      TA.traffic.push(car);
    }
  };

  // Satu mobil curian parkir untuk shot 1 / carjacking.
  W.placeJackCar = function (x, z) {
    var car = W.makeCar(0xc0392b, x, z, Math.PI);
    car.speed = 0; car.cruise = 0; car.axis = 'z'; car.dir = 1;
    TA.scene.add(car.group);
    TA.traffic.push(car);
    TA.jackTarget = car;
    return car;
  };

  W.updateTraffic = function (dt) {
    W.lightTimer += dt;
    if (W.lightTimer > 14) { W.lightTimer = 0; W.lightPhase = 1 - W.lightPhase; }
    var px = TA.px, pz = TA.pz;
    for (var i = 0; i < TA.traffic.length; i++) {
      var c = TA.traffic[i];
      if (c === TA.car) continue; // mobil pemain dikendalikan player.js
      if (c.stolen) continue;
      // Lampu merah: berhenti sebelum persimpangan bila fasenya bukan miliknya.
      var nearCross = false;
      if (c.axis === 'x') {
        var nextX = c.x + c.dir * 8;
        for (var s = 0; s < W.STREETS.length; s++) {
          if (Math.abs(nextX - W.STREETS[s]) < 4 && Math.abs(c.z - W.STREETS[s]) > 6) { nearCross = true; break; }
        }
        if (nearCross && W.lightPhase === 1) c.stopped = true; else c.stopped = false;
      } else {
        var nextZ = c.z + c.dir * 8;
        for (var t = 0; t < W.STREETS.length; t++) {
          if (Math.abs(nextZ - W.STREETS[t]) < 4 && Math.abs(c.x - W.STREETS[t]) > 6) { nearCross = true; break; }
        }
        if (nearCross && W.lightPhase === 0) c.stopped = true; else c.stopped = false;
      }
      // Menghindar: pelan bila ada mobil di depan.
      var slow = false;
      for (var j = 0; j < TA.traffic.length; j++) {
        if (j === i) continue;
        var o = TA.traffic[j];
        var dx = o.x - c.x, dz = o.z - c.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 9) {
          var fx = Math.sin(c.heading), fz = Math.cos(c.heading);
          if (dx * fx + dz * fz > 0) { slow = true; break; }
        }
      }
      // Klakson bila pemain menghalangi jalan.
      var pdx = px - c.x, pdz = pz - c.z;
      if (Math.sqrt(pdx * pdx + pdz * pdz) < 7 && !c.honked) {
        c.honked = true;
        TA.audio.honkSound();
        setTimeout(function () { c.honked = false; }, 4000);
      }
      var target = (c.stopped || slow) ? 0 : c.cruise;
      c.speed = TA.lerp(c.speed, target, 1 - Math.pow(0.01, dt));
      if (c.axis === 'x') {
        c.x += c.dir * c.speed * dt;
        if (c.x > 215) c.x = -215; if (c.x < -215) c.x = 215;
      } else {
        c.z += c.dir * c.speed * dt;
        if (c.z > 215) c.z = -215; if (c.z < -215) c.z = 215;
      }
      c.group.position.set(c.x, 0, c.z);
    }
  };

  // ------------------------------------------------------------- pejalan kaki
  W.spawnPedestrians = function (n) {
    var colors = [0xd8a020, 0x4a7a8a, 0x8a4a5a, 0x5a6a3a, 0x9a9a9a, 0x6a4a8a];
    for (var i = 0; i < n; i++) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.35),
        new THREE.MeshLambertMaterial({ color: TA.pick(colors) }));
      body.position.y = 0.95;
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xd8a080 }));
      head.position.y = 1.75;
      var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22),
        new THREE.MeshLambertMaterial({ color: 0x222831 }));
      legL.position.set(-0.15, 0.3, 0);
      var legR = legL.clone(); legR.position.x = 0.15;
      g.add(body, head, legL, legR);
      var x = TA.rand(-200, 200), z = TA.rand(-200, 200);
      g.position.set(x, 0, z);
      TA.scene.add(g);
      TA.peds.push({
        group: g, x: x, z: z, tx: x, tz: z, speed: TA.rand(1.2, 2.2),
        fleeing: false, panic: 0, legL: legL, legR: legR, walkPhase: TA.rand(0, 6)
      });
    }
  };

  W.updatePedestrians = function (dt) {
    for (var i = 0; i < TA.peds.length; i++) {
      var p = TA.peds[i];
      if (p.panic > 0) p.panic -= dt;
      var dx = p.tx - p.x, dz = p.tz - p.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.5 || p.panic <= 0 && TA.rng() < 0.002) {
        // Tujuan baru: titik acak di trotoar dekat jalan.
        var street = TA.pick(W.STREETS);
        if (TA.rng() < 0.5) { p.tx = TA.rand(-200, 200); p.tz = street + TA.rand(6, 10); }
        else { p.tx = street + TA.rand(6, 10); p.tz = TA.rand(-200, 200); }
        if (p.fleeing) { p.fleeing = false; }
      }
      var sp = p.fleeing ? p.speed * 3.2 : p.speed;
      if (dist > 0.1) {
        p.x += (dx / dist) * sp * dt;
        p.z += (dz / dist) * sp * dt;
        p.group.rotation.y = Math.atan2(dx, dz);
      }
      p.walkPhase += dt * sp * 4;
      var sw = Math.sin(p.walkPhase) * 0.35;
      p.legL.rotation.x = sw;
      p.legR.rotation.x = -sw;
      // Tiarap saat tembakan dekat: merunduk.
      if (p.panic > 0.4) p.group.position.y = -0.5;
      else p.group.position.y = 0;
      p.group.position.set(p.x, p.group.position.y, p.z);
    }
  };

  // Pejalan kaki di sekitar (x,z) lari / tiarap saat ada tembakan.
  W.scarePedestrians = function (x, z, radius) {
    for (var i = 0; i < TA.peds.length; i++) {
      var p = TA.peds[i];
      var dx = p.x - x, dz = p.z - z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < radius) {
        p.panic = 3;
        p.fleeing = true;
        p.tx = p.x + (dx / (d || 1)) * 60;
        p.tz = p.z + (dz / (d || 1)) * 60;
      }
    }
  };

  // ------------------------------------------------------- hujan & cuaca
  W.updateRain = function (dt) {
    if (!W.rain) return;
    var vis = TA.state.weather === 'rain' || TA.state.weather === 'storm';
    W.rain.visible = vis;
    if (!vis) return;
    // Hujan mengikuti kamera.
    W.rain.position.set(TA.camera.position.x, 0, TA.camera.position.z);
    var pos = W.rain.geometry.attributes.position;
    var speedMul = TA.state.weather === 'storm' ? 1.6 : 1;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) - W.rainVel[i] * speedMul * dt;
      if (y < 0) y = TA.rand(22, 30);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  };

  W.setWeather = function (w) {
    // Hanya mengubah status cuaca; warna langit tetap milik setTimeOfDay
    // supaya siang hujan tidak jadi gelap gulita.
    TA.state.weather = w;
  };

  // dawn | day | dusk | night
  W.setTimeOfDay = function (t) {
    TA.state.timeOfDay = t;
    var scene = TA.scene;
    if (t === 'dawn') {
      scene.background.setHex(0x5a3a5a);
      scene.fog.color.setHex(0x5a3a5a);
      TA.hemi.intensity = 0.55; TA.hemi.color.setHex(0xffb08a);
      TA.sun.intensity = 0.7; TA.sun.color.setHex(0xff8a4a);
      TA.sun.position.set(-140, 40, 120);
      TA.amb.intensity = 0.35;
    } else if (t === 'day') {
      scene.background.setHex(0x5d6f85);
      scene.fog.color.setHex(0x5d6f85);
      TA.hemi.intensity = 1.15; TA.hemi.color.setHex(0xd8e4f0);
      TA.sun.intensity = 1.3; TA.sun.color.setHex(0xfff2d8);
      TA.sun.position.set(120, 180, 60);
      TA.amb.intensity = 0.65;
    } else if (t === 'dusk') {
      scene.background.setHex(0x2e2440);
      scene.fog.color.setHex(0x2e2440);
      TA.hemi.intensity = 0.5; TA.hemi.color.setHex(0xc98aff);
      TA.sun.intensity = 0.5; TA.sun.color.setHex(0xff6a3a);
      TA.sun.position.set(-120, 30, -80);
      TA.amb.intensity = 0.35;
    } else { // night
      scene.background.setHex(0x0e1424);
      scene.fog.color.setHex(0x0e1424);
      TA.hemi.intensity = 0.55; TA.hemi.color.setHex(0x5a6a9a);
      TA.sun.intensity = 0.35; TA.sun.color.setHex(0x8aa0ff);
      TA.sun.position.set(-80, 160, -40);
      TA.amb.intensity = 0.55;
    }
  };

  // Perbarui fase siang/malam dari jam game (dipakai tiap detik oleh ui).
  W.syncTimeOfDay = function () {
    var mins = TA.state.timeMinutes;
    var h = mins / 60;
    var t = (h >= 5 && h < 7) ? 'dawn' : (h >= 7 && h < 17) ? 'day' :
      (h >= 17 && h < 19.5) ? 'dusk' : 'night';
    if (t !== TA.state.timeOfDay) W.setTimeOfDay(t);
  };
})();
