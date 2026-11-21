/* TELUK ARUNIKA — world.js: kota prosedural, 5 distrik, traffic, pejalan kaki, cuaca */
(function () {
  'use strict';
  var TA = window.TA;

  TA.DISTRICTS = [
    { id: 'pelabuhan', name: 'PELABUHAN', standing: 58, streets: ['Dermaga Senja', 'Jl. Kontainer', 'Dermaga Utara'], bounds: { x0: 100, x1: 200, z0: -200, z1: 200 } },
    { id: 'pantai', name: 'PANTAI', standing: 60, streets: ['Jl. Ombak', 'Pantai Senja', 'Jl. Karang'], bounds: { x0: -200, x1: -100, z0: -200, z1: 200 } },
    { id: 'tol', name: 'TOL LAYANG', standing: 50, streets: ['Tol Arunika', 'Jembatan Senja'], bounds: { x0: -100, x1: 100, z0: -200, z1: -100 } },
    { id: 'gang-neon', name: 'GANG NEON', standing: 55, streets: ['Gang Lampion', 'Jl. Neon', 'Gang Sempit'], bounds: { x0: -100, x1: 100, z0: 60, z1: 200 } },
    { id: 'pasar', name: 'PASAR', standing: 62, streets: ['Jl. Merdeka', 'Pasar Ikan', 'Jl. Melati'], bounds: { x0: -100, x1: 100, z0: -60, z1: 60 } }
  ];

  TA.world = {
    buildings: [], // {x,z,hw,hd,h}
    traffic: [],
    peds: [],
    rain: null,
    lightPhase: 0, lightTimer: 0,
    lamps: [], neons: [],
    containers: [],
    colliders: [],

    districtAt: function (x, z) {
      for (var i = 0; i < TA.DISTRICTS.length; i++) {
        var d = TA.DISTRICTS[i], b = d.bounds;
        if (x >= b.x0 && x < b.x1 && z >= b.z0 && z < b.z1) return d;
      }
      return TA.DISTRICTS[4];
    },
    streetAt: function (x, z) {
      var d = this.districtAt(x, z);
      var idx = Math.abs(Math.floor(x / 40) + Math.floor(z / 40) * 3) % d.streets.length;
      return d.streets[idx];
    },
    updateDistrictStanding: function (id, delta) {
      for (var i = 0; i < TA.DISTRICTS.length; i++) {
        if (TA.DISTRICTS[i].id === id) {
          TA.DISTRICTS[i].standing = TA.clamp(TA.DISTRICTS[i].standing + delta, 0, 100);
          return TA.DISTRICTS[i].standing;
        }
      }
      return 50;
    },
    districtStandingLabel: function (v) {
      if (v >= 75) return 'DIHORMATI';
      if (v >= 55) return 'NETRAL';
      if (v >= 35) return 'WASPADA';
      return 'DIBURU';
    },
    taxiPayMultiplier: function (districtId) {
      var d = null;
      for (var i = 0; i < TA.DISTRICTS.length; i++) if (TA.DISTRICTS[i].id === districtId) d = TA.DISTRICTS[i];
      if (!d) return 1;
      return 0.7 + (d.standing / 100) * 0.8; // 0.7x .. 1.5x
    },

    collides: function (x, z, r) {
      if (x < -195 || x > 195 || z < -195 || z > 195) return true;
      for (var i = 0; i < this.colliders.length; i++) {
        var c = this.colliders[i];
        if (x + r > c.x - c.hw && x - r < c.x + c.hw && z + r > c.z - c.hd && z - r < c.z + c.hd) return true;
      }
      return false;
    },

    mat: function (color, opts) {
      var o = opts || {};
      return new THREE.MeshStandardMaterial({
        color: color, roughness: o.roughness !== undefined ? o.roughness : 0.85,
        metalness: o.metalness !== undefined ? o.metalness : 0.05,
        emissive: o.emissive || 0x000000, emissiveIntensity: o.emissiveIntensity || 1
      });
    },
    box: function (w, h, d, color, opts) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(color, opts));
      m.castShadow = false;
      return m;
    },

    buildCity: function () {
      var scene = TA.scene;
      var self = this;
      // Tanah dasar + air + pasir
      var ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), this.mat(0x232a33, { roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
      var waterW = new THREE.Mesh(new THREE.PlaneGeometry(40, 420), this.mat(0x0d2a44, { roughness: 0.15, metalness: 0.6 }));
      waterW.rotation.x = -Math.PI / 2; waterW.position.set(-210, 0.02, 0); scene.add(waterW);
      var waterE = waterW.clone(); waterE.position.set(210, 0.02, 0); scene.add(waterE);
      var sand = new THREE.Mesh(new THREE.PlaneGeometry(26, 420), this.mat(0x9c8a62, { roughness: 1 }));
      sand.rotation.x = -Math.PI / 2; sand.position.set(-112, 0.0, 0); scene.add(sand);

      // Jalan grid (aspal basah) + trotoar + marka
      var roadMat = this.mat(0x14181f, { roughness: 0.32, metalness: 0.55 });
      var roadXs = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
      var roadZs = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
      roadXs.forEach(function (x) {
        var r = new THREE.Mesh(new THREE.PlaneGeometry(10, 400), roadMat);
        r.rotation.x = -Math.PI / 2; r.position.set(x, 0.05, 0); scene.add(r);
      });
      roadZs.forEach(function (z) {
        var r = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), roadMat);
        r.rotation.x = -Math.PI / 2; r.position.set(0, 0.05, z); scene.add(r);
      });
      // Marka jalan kuning putus-putus
      var dashGeo = new THREE.BoxGeometry(0.5, 0.02, 3);
      var dashMat = new THREE.MeshBasicMaterial({ color: 0xc9a227 });
      for (var gx = 0; gx < roadXs.length; gx++) {
        for (var z = -190; z < 190; z += 12) {
          var d = new THREE.Mesh(dashGeo, dashMat);
          d.position.set(roadXs[gx], 0.08, z); scene.add(d);
        }
      }
      for (var gz = 0; gz < roadZs.length; gz++) {
        for (var x = -190; x < 190; x += 12) {
          var d2 = new THREE.Mesh(dashGeo, dashMat);
          d2.rotation.y = Math.PI / 2;
          d2.position.set(x, 0.08, roadZs[gz]); scene.add(d2);
        }
      }
      // Genangan (puddle) reflektif
      for (var pi = 0; pi < 26; pi++) {
        var px = TA.rand(-180, 180), pz = TA.rand(-180, 180);
        var pud = new THREE.Mesh(new THREE.PlaneGeometry(TA.rand(4, 9), TA.rand(3, 6)),
          new THREE.MeshStandardMaterial({ color: 0x2a3a4d, roughness: 0.05, metalness: 0.9 }));
        pud.rotation.x = -Math.PI / 2; pud.position.set(px, 0.07, pz); scene.add(pud);
      }

      // Gedung: blok di antara jalan (60+ gedung). Sel blok berpusat di titik tengah
      // antar jalan (jalan di kelipatan 40): -140,-100,-60,-20,20,60,100,140.
      var palette = [0x3a4356, 0x4a3f35, 0x35424a, 0x54423a, 0x2f3a4d, 0x463a4d];
      var count = 0;
      var cellCenters = [-140, -100, -60, -20, 20, 60, 100, 140];
      for (var ci = 0; ci < cellCenters.length; ci++) {
        for (var cj = 0; cj < cellCenters.length; cj++) {
          var cx = cellCenters[ci], cz = cellCenters[cj];
          if (cx > 95 || cx < -95) continue; // pelabuhan & pantai punya bangunannya sendiri
          if (cz <= -100) continue; // area tol layang
          if ((cx === -20 && cz === 20) || (cx === 20 && cz === -20)) continue; // safehouse & toko
          // Dua gedung per sel (petak kiri + kanan)
          for (var half = 0; half < 2; half++) {
            var bx2 = cx + (half === 0 ? -9 : 9);
            var h = TA.rand(8, 42);
            var w = TA.rand(12, 16), dep = TA.rand(14, 22);
            var b = this.box(w, h, dep, TA.pick(palette));
            b.position.set(bx2, h / 2, cz);
            scene.add(b);
            var winMat = new THREE.MeshBasicMaterial({ color: TA.pick([0xffd97a, 0x9fe8ff, 0xff9a6a, 0xfff2c0]) });
            var winGeo = new THREE.BoxGeometry(1.4, 1.8, 0.2);
            var floors = Math.max(1, Math.floor(h / 5));
            for (var f = 0; f < floors; f++) {
              for (var ww = 0; ww < 3; ww++) {
                if (TA.rng() < 0.55) {
                  var win = new THREE.Mesh(winGeo, winMat);
                  win.position.set(bx2 - w / 2 + 3 + ww * (w - 6) / 2, 3 + f * 5, cz + dep / 2 + 0.1);
                  scene.add(win);
                }
              }
            }
            this.buildings.push({ x: bx2, z: cz, hw: w / 2, hd: dep / 2, h: h });
            this.colliders.push({ x: bx2, z: cz, hw: w / 2 + 0.3, hd: dep / 2 + 0.3 });
            count++;
          }
        }
      }
      // Gedung tepi (gudang pelabuhan & beachfront) agar total 60+
      for (var e = 0; e < 20; e++) {
        var ex = TA.pick([-175, -165, 165, 175]), ez = TA.rand(-170, 170);
        var eh = TA.rand(10, 30);
        var ew = TA.rand(12, 18);
        var eb = this.box(ew, eh, TA.rand(12, 18), TA.pick(palette));
        eb.position.set(ex, eh / 2, ez); scene.add(eb);
        this.buildings.push({ x: ex, z: ez, hw: ew / 2, hd: 9, h: eh });
        this.colliders.push({ x: ex, z: ez, hw: ew / 2 + 0.3, hd: 9.3 });
        count++;
      }
      this.buildingCount = count;

      // PELABUHAN (timur): kontainer + crane + dermaga
      var contColors = [0xb3542f, 0x2f6b8a, 0x5a7a2f, 0x8a2f5a, 0x777777];
      for (var ci = 0; ci < 34; ci++) {
        var ccx = TA.rand(110, 185), ccz = TA.rand(-170, 170);
        var ch = TA.pick([2.6, 5.2]);
        var cont = this.box(6, ch, 2.6, TA.pick(contColors), { roughness: 0.7, metalness: 0.3 });
        cont.position.set(ccx, ch / 2, ccz);
        cont.rotation.y = TA.pick([0, Math.PI / 2]);
        scene.add(cont);
        this.containers.push({ x: ccx, z: ccz, hw: 3.2, hd: 1.6, rot: cont.rotation.y });
        this.colliders.push({ x: ccx, z: ccz, hw: 3.4, hd: 1.8 });
      }
      // Crane pelabuhan
      for (var cr = 0; cr < 3; cr++) {
        var crane = new THREE.Group();
        var leg1 = this.box(1.2, 26, 1.2, 0xc9a227); leg1.position.set(0, 13, 0); crane.add(leg1);
        var leg2 = this.box(1.2, 26, 1.2, 0xc9a227); leg2.position.set(8, 13, 0); crane.add(leg2);
        var beam = this.box(26, 1.6, 1.6, 0xc9a227); beam.position.set(4, 26, 0); crane.add(beam);
        crane.position.set(150 + cr * 18, 0, -120 + cr * 110);
        scene.add(crane);
        this.colliders.push({ x: 150 + cr * 18, z: -120 + cr * 110, hw: 5, hd: 1 });
      }
      // Dermaga kayu
      var pier = this.box(30, 0.6, 8, 0x6b4f2a); pier.position.set(196, 0.3, 0); scene.add(pier);

      // TOL LAYANG (utara): deck layang + pilar
      var deck = this.box(380, 1.2, 14, 0x2c313a, { roughness: 0.4, metalness: 0.4 });
      deck.position.set(0, 9, -140); scene.add(deck);
      for (var pl = -180; pl <= 180; pl += 30) {
        var pillar = this.box(3, 9, 3, 0x3a3f47); pillar.position.set(pl, 4.5, -140); scene.add(pillar);
        this.colliders.push({ x: pl, z: -140, hw: 1.8, hd: 1.8 });
      }
      var ramp = this.box(30, 1, 10, 0x2c313a); ramp.position.set(-150, 4.5, -128); ramp.rotation.z = 0.28; scene.add(ramp);

      // PASAR (tengah): kios + tenda warna-warni
      for (var k = 0; k < 12; k++) {
        var kx = TA.rand(-60, 60), kz = TA.rand(-30, 30);
        var stall = this.box(4, 2.4, 3, TA.pick([0xc94f4f, 0x4f9ac9, 0x7ac94f, 0xd8a018]));
        stall.position.set(kx, 1.2, kz); scene.add(stall);
        var roof = this.box(4.6, 0.3, 3.6, TA.pick([0xffd23e, 0xff7a7a, 0x9fe8ff]));
        roof.position.set(kx, 2.7, kz); roof.rotation.z = 0.08; scene.add(roof);
        this.colliders.push({ x: kx, z: kz, hw: 2.4, hd: 1.8 });
      }

      // GANG NEON (selatan): papan neon emissive
      var neonColors = [0xff2f92, 0x00e5ff, 0xffe600, 0x7a5cff, 0xff5a2f];
      for (var n = 0; n < 16; n++) {
        var nx = TA.rand(-80, 80), nz = TA.rand(70, 180);
        var neon = this.box(TA.rand(2, 5), TA.rand(0.8, 1.6), 0.3, 0x111111,
          { emissive: TA.pick(neonColors), emissiveIntensity: 2.2 });
        neon.position.set(nx, TA.rand(3, 7), nz);
        scene.add(neon);
        this.neons.push(neon);
      }
      // Lampu jalan
      var lampGeo = new THREE.CylinderGeometry(0.12, 0.12, 5, 6);
      var lampMat = this.mat(0x333a44, { metalness: 0.6, roughness: 0.4 });
      var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
      for (var li = -160; li <= 160; li += 40) {
        for (var lj = -160; lj <= 160; lj += 80) {
          var pole = new THREE.Mesh(lampGeo, lampMat);
          pole.position.set(li + 6, 2.5, lj); scene.add(pole);
          var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat);
          bulb.position.set(li + 6, 5.1, lj); scene.add(bulb);
          this.lamps.push(bulb);
        }
      }
      // Safehouse (bengkel Pak Amir) — biru
      var safe = this.box(10, 5, 8, 0x2f5f8a, { emissive: 0x1a3a5a, emissiveIntensity: 0.8 });
      safe.position.set(-14, 2.5, 14); scene.add(safe);
      var safeSign = this.box(6, 1.2, 0.3, 0x111111, { emissive: 0x4aa8ff, emissiveIntensity: 2 });
      safeSign.position.set(-14, 5.4, 18.2); scene.add(safeSign);
      this.colliders.push({ x: -14, z: 14, hw: 5.3, hd: 4.3 });
      this.safehouse = { x: -14, z: 14 };
      // Toko senjata — Pasar
      var shop = this.box(8, 4, 6, 0x5a2f2f, { emissive: 0x3a1a1a, emissiveIntensity: 0.6 });
      shop.position.set(14, 2, -14); scene.add(shop);
      this.colliders.push({ x: 14, z: -14, hw: 4.3, hd: 3.3 });
      this.shopPos = { x: 14, z: -14 };
      // Bengkel / garage — dekat safehouse
      this.garagePos = { x: -30, z: 26 };
      var gar = this.box(12, 4, 8, 0x3a3f35, { emissive: 0x222222, emissiveIntensity: 0.5 });
      gar.position.set(-30, 2, 26); scene.add(gar);
      this.colliders.push({ x: -30, z: 26, hw: 6.3, hd: 4.3 });
    },

    buildTraffic: function () {
      var colors = [0x8a2f2f, 0x2f5f8a, 0xd8a018, 0x3f6b3a, 0x7a7a7a, 0x9a2f8a, 0xdddddd, 0x222831];
      for (var i = 0; i < 14; i++) {
        var horizontal = TA.rng() < 0.5;
        var road = TA.pick([-160, -120, -80, -40, 0, 40, 80, 120, 160]);
        var along = TA.rand(-180, 180);
        var car = TA.player.makeCarMesh(TA.pick(colors), 1);
        car.position.set(horizontal ? along : road, 0, horizontal ? road : along);
        car.rotation.y = horizontal ? (TA.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (TA.rng() < 0.5 ? 0 : Math.PI);
        TA.scene.add(car);
        this.traffic.push({
          mesh: car, horizontal: horizontal, road: road, along: along,
          dir: TA.rng() < 0.5 ? 1 : -1, speed: TA.rand(9, 15), stopped: false, honkTimer: 0
        });
      }
    },

    buildPedestrians: function () {
      var shirtColors = [0xd8d8d8, 0x4f9ac9, 0xc94f4f, 0x7ac94f, 0xd8a018, 0x9a6ad8];
      for (var i = 0; i < 22; i++) {
        var px = TA.rand(-180, 180), pz = TA.rand(-180, 180);
        var ped = TA.player.makePedMesh(TA.pick(shirtColors));
        ped.position.set(px, 0, pz);
        TA.scene.add(ped);
        this.peds.push({
          mesh: ped, x: px, z: pz, angle: TA.rand(0, Math.PI * 2),
          speed: TA.rand(1.2, 2.2), state: 'walk', fleeTimer: 0, panic: 0
        });
      }
    },

    buildRain: function () {
      var N = 1400;
      var pos = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        pos[i * 3] = TA.rand(-70, 70);
        pos[i * 3 + 1] = TA.rand(0, 45);
        pos[i * 3 + 2] = TA.rand(-70, 70);
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({ color: 0x9fb8d8, size: 0.35, transparent: true, opacity: 0.55 });
      this.rain = new THREE.Points(geo, mat);
      this.rain.visible = true;
      TA.scene.add(this.rain);
      this.rainCount = N;
    },

    setWeather: function (w) {
      TA.state.weather = w;
      if (this.rain) this.rain.visible = (w === 'rain');
      if (w === 'rain') { TA.scene.fog = new THREE.Fog(0x16202e, 50, 200); }
      else { TA.scene.fog = new THREE.Fog(0x1a2436, 70, 280); }
    },

    setTimeOfDay: function (hours) {
      var night = hours < 6 || hours >= 19;
      var dawn = hours >= 5 && hours < 7.5;
      if (dawn) {
        TA.scene.background = new THREE.Color(0x5a3a55); // fajar oranye-ungu
        TA.scene.fog.color = new THREE.Color(0x5a3a55);
        TA.sun.color.setHex(0xff9a5a); TA.sun.intensity = 0.8;
        TA.moon.intensity = 0.1;
      } else if (night) {
        TA.scene.background = new THREE.Color(0x0a0f1e);
        TA.scene.fog.color = new THREE.Color(0x0a0f1e);
        TA.sun.intensity = 0.15; TA.sun.color.setHex(0x8fa8cc);
        TA.moon.intensity = 0.5;
      } else {
        TA.scene.background = new THREE.Color(0x2a3648);
        TA.scene.fog.color = new THREE.Color(0x2a3648);
        TA.sun.intensity = 0.9; TA.sun.color.setHex(0xffe0b3);
        TA.moon.intensity = 0.12;
      }
      this.neons.forEach(function (n) { n.visible = night || dawn; });
    },

    resetCityState: function () {
      this.lightPhase = 0; this.lightTimer = 0;
      TA.DISTRICTS.forEach(function (d, i) { d.standing = [58, 60, 50, 55, 62][i]; });
    },

    update: function (dt) {
      this.lightTimer += dt;
      if (this.lightTimer > 8) { this.lightTimer = 0; this.lightPhase = (this.lightPhase + 1) % 2; }
      this.updateTraffic(dt);
      this.updatePedestrians(dt);
      this.updateRain(dt);
      this.updateDistrictFromPlayer();
    },

    updateMenu: function (dt) {
      // Menu: kamera mengorbit pelan di atas kota, traffic tetap bergerak
      var t = TA.time.elapsed;
      TA.player.x = Math.sin(t * 0.05) * 40;
      TA.player.z = Math.cos(t * 0.05) * 40;
      this.updateTraffic(dt);
      this.updatePedestrians(dt);
      this.updateRain(dt);
    },

    updateAmbient: function (dt) {
      this.updateRain(dt);
      this.updateTraffic(dt * 0.3);
    },

    updateTraffic: function (dt) {
      var p = TA.player;
      for (var i = 0; i < this.traffic.length; i++) {
        var c = this.traffic[i];
        var atLight = false;
        // Lampu merah: berhenti di persimpangan (along kelipatan 40) saat fase merah untuk arahnya
        var alongMod = ((c.along % 40) + 40) % 40;
        var nearIntersection = alongMod < 6 || alongMod > 34;
        if (nearIntersection && this.lightPhase === (c.horizontal ? 0 : 1)) atLight = true;
        // Mobil di depan terlalu dekat -> berhenti + klakson
        var blocked = false;
        for (var j = 0; j < this.traffic.length; j++) {
          if (j === i) continue;
          var o = this.traffic[j];
          if (o.horizontal !== c.horizontal || o.road !== c.road) continue;
          var d = (o.along - c.along) * c.dir;
          if (d > 0 && d < 9) { blocked = true; break; }
        }
        // Hindari mobil pemain
        if (!p.onFoot && Math.abs(p.x - c.mesh.position.x) < 8 && Math.abs(p.z - c.mesh.position.z) < 8) blocked = true;
        c.stopped = atLight || blocked;
        if (blocked) {
          c.honkTimer -= dt;
          if (c.honkTimer <= 0) { c.honkTimer = TA.rand(2, 5); TA.audio.honk(); }
        }
        if (!c.stopped) {
          c.along += c.dir * c.speed * dt;
          if (c.along > 195) c.along = -195;
          if (c.along < -195) c.along = 195;
        }
        if (c.horizontal) { c.mesh.position.x = c.along; c.mesh.position.z = c.road + (c.dir > 0 ? 2.4 : -2.4); }
        else { c.mesh.position.z = c.along; c.mesh.position.x = c.road + (c.dir > 0 ? 2.4 : -2.4); }
        // Tabrakan dengan pemain di mobil
        if (!p.onFoot && TA.dist2d(p.x, p.z, c.mesh.position.x, c.mesh.position.z) < 3.4) {
          TA.player.damageCar(4);
          c.along -= c.dir * 2;
          TA.audio.crash();
        }
      }
    },

    updatePedestrians: function (dt) {
      var p = TA.player;
      var shots = TA.state.stats.shotsFired;
      for (var i = 0; i < this.peds.length; i++) {
        var ped = this.peds[i];
        if (ped.panic > 0) {
          ped.panic -= dt;
          ped.state = 'flee';
        } else if (shots !== ped.lastShots) {
          ped.lastShots = shots;
          if (TA.dist2d(p.x, p.z, ped.x, ped.z) < 30) { ped.panic = 3; ped.state = 'flee'; }
        }
        var sp = ped.state === 'flee' ? 7 : ped.speed;
        if (ped.state === 'flee') {
          var dx = ped.x - p.x, dz = ped.z - p.z;
          var len = Math.sqrt(dx * dx + dz * dz) || 1;
          ped.x += (dx / len) * sp * dt;
          ped.z += (dz / len) * sp * dt;
          ped.angle = Math.atan2(dx, dz);
        } else {
          // Jalan di trotoar, menyeberang di persimpangan
          ped.x += Math.sin(ped.angle) * sp * dt;
          ped.z += Math.cos(ped.angle) * sp * dt;
          if (TA.rng() < dt * 0.08) ped.angle = TA.rand(0, Math.PI * 2);
          if (ped.x < -190 || ped.x > 190 || ped.z < -190 || ped.z > 190) ped.angle += Math.PI;
        }
        ped.mesh.position.set(ped.x, 0, ped.z);
        ped.mesh.rotation.y = ped.angle;
        // Animasi jalan sederhana: goyang
        ped.mesh.position.y = Math.abs(Math.sin(TA.time.elapsed * 8 + i)) * (ped.state === 'flee' ? 0.25 : 0.08);
      }
    },

    updateRain: function (dt) {
      if (!this.rain || !this.rain.visible) return;
      var pos = this.rain.geometry.attributes.position;
      var arr = pos.array;
      var cx = TA.player.x, cz = TA.player.z;
      for (var i = 0; i < this.rainCount; i++) {
        arr[i * 3 + 1] -= 42 * dt;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = TA.rand(30, 45);
          arr[i * 3] = cx + TA.rand(-70, 70);
          arr[i * 3 + 2] = cz + TA.rand(-70, 70);
        }
      }
      pos.needsUpdate = true;
      this.rain.position.set(0, 0, 0);
    },

    updateDistrictFromPlayer: function () {
      var d = this.districtAt(TA.player.x, TA.player.z);
      TA.state.district = d.name;
      TA.state.street = this.streetAt(TA.player.x, TA.player.z);
    }
  };
})();
