// world.js — build the city: 60+ buildings, roads, elevated toll, port, beach, market, neon alley;
// traffic AI, pedestrians, day/night cycle + rain, wet-asphalt reflections, districts + standing.
(function () {
  'use strict';
  var TA = window.TA;

  var DISTRICTS = {
    pelabuhan: { name: 'PELABUHAN', street: 'Dermaga Senja', center: { x: 0, z: -90 }, mood: 58 },
    pasar: { name: 'PASAR', street: 'Pasar Senja', center: { x: -70, z: 10 }, mood: 46 },
    gang: { name: 'GANG NEON', street: 'Lorong Lampion', center: { x: 55, z: 30 }, mood: 61 },
    pantai: { name: 'PANTAI', street: 'Pesisir Arunika', center: { x: -20, z: 95 }, mood: 52 },
    tol: { name: 'TOL LAYANG', street: 'Jalan Layang Arunika', center: { x: 70, z: -60 }, mood: 40 },
  };
  var TRAFFIC_CARS = [];
  var PEDESTRIANS = [];
  var RAIN_DROPS = [];
  var heliMesh = null, heliLight = null;
  var sunLight = null, hemiLight = null, streetLights = [];
  var timeOfDay = 'day';

  function rand(seed) { var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function buildCity(scene) {
    // Ground: wet asphalt plane (high metalness-ish sheen via MeshStandardMaterial)
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.35, metalness: 0.55 })
    );
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    // Beach strip (sand) at the south edge
    var sand = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 60),
      new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 0.9 })
    );
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 130); scene.add(sand);
    // Sea
    var sea = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 80),
      new THREE.MeshStandardMaterial({ color: 0x0a3550, roughness: 0.15, metalness: 0.7 })
    );
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, 190); scene.add(sea);

    // Roads: grid of dark strips with centre dashes
    var roadMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.25, metalness: 0.6 });
    var dashMat = new THREE.MeshBasicMaterial({ color: 0xc8a93a });
    for (var i = -3; i <= 3; i++) {
      var roadV = new THREE.Mesh(new THREE.PlaneGeometry(10, 360), roadMat);
      roadV.rotation.x = -Math.PI / 2; roadV.position.set(i * 40, 0.03, 0); scene.add(roadV);
      var roadH = new THREE.Mesh(new THREE.PlaneGeometry(360, 10), roadMat);
      roadH.rotation.x = -Math.PI / 2; roadH.position.set(0, 0.03, i * 40); scene.add(roadH);
      for (var d = -160; d <= 160; d += 16) {
        var dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(i * 40, 0.04, d); scene.add(dash);
      }
    }

    // 60+ buildings, district-flavoured
    var palette = [0x2a3348, 0x3a2f45, 0x24382e, 0x453a2a, 0x33262e, 0x1f2a3a];
    var neonCols = [0xff2d78, 0x00e5ff, 0xffd23e, 0x7dff5e];
    var count = 0;
    for (var gx = -3; gx <= 3; gx++) {
      for (var gz = -3; gz <= 3; gz++) {
        if (gx === 0 || gz === 0) continue;
        var bx = gx * 40 + (rand(gx * 7 + gz) - 0.5) * 10;
        var bz = gz * 40 + (rand(gx + gz * 11) - 0.5) * 10;
        var h = 8 + rand(gx * 13 + gz * 5) * 34;
        var w = 10 + rand(gx * 3 + gz * 17) * 8;
        var b = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, w),
          new THREE.MeshStandardMaterial({ color: palette[(gx + gz + 12) % palette.length], roughness: 0.8 })
        );
        b.position.set(bx, h / 2, bz); b.castShadow = true; b.receiveShadow = true; scene.add(b);
        count++;
        // lit windows
        var winMat = new THREE.MeshBasicMaterial({ color: rand(bx + bz) > 0.5 ? 0xffd98a : 0x9fd8ff });
        for (var wy = 3; wy < h - 1; wy += 4) {
          var win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), winMat);
          win.position.set(bx, wy, bz + w / 2 + 0.06); scene.add(win);
        }
        // neon sign in the neon alley district
        if (gx >= 1 && gz >= 0 && rand(gx * 31 + gz) > 0.45) {
          var neon = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 1.2, 4),
            new THREE.MeshBasicMaterial({ color: neonCols[(gx + gz) % 4] })
          );
          neon.position.set(bx - w / 2 - 0.2, 4, bz); scene.add(neon);
          var pl = new THREE.PointLight(neonCols[(gx + gz) % 4], 1.2, 18);
          pl.position.set(bx - w / 2 - 2, 4, bz); scene.add(pl); streetLights.push(pl);
        }
      }
    }
    // Port: containers + cranes
    var contCols = [0xb03030, 0x2a6db0, 0x3a8a3a, 0xd08020];
    for (var c = 0; c < 24; c++) {
      var cont = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.6, 2.6),
        new THREE.MeshStandardMaterial({ color: contCols[c % 4], roughness: 0.7 })
      );
      cont.position.set(-60 + (c % 6) * 8, 1.3 + Math.floor(c / 6) * 2.7, -95 + Math.floor(c / 12) * 6);
      cont.castShadow = true; scene.add(cont);
    }
    for (var k = 0; k < 3; k++) {
      var crane = new THREE.Group();
      var leg = new THREE.Mesh(new THREE.BoxGeometry(2, 26, 2), new THREE.MeshStandardMaterial({ color: 0xd8a020 }));
      leg.position.y = 13; crane.add(leg);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(24, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xd8a020 }));
      arm.position.set(8, 26, 0); crane.add(arm);
      crane.position.set(-80 + k * 40, 0, -105); scene.add(crane);
    }
    // Elevated toll road (tol layang)
    var toll = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 220), new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.4, metalness: 0.4 }));
    toll.position.set(70, 9, -10); scene.add(toll);
    for (var p = -100; p <= 80; p += 20) {
      var pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 2), new THREE.MeshStandardMaterial({ color: 0x3a3f48 }));
      pillar.position.set(70, 4.5, p); scene.add(pillar);
    }
    // Market stalls
    for (var m = 0; m < 10; m++) {
      var stall = new THREE.Group();
      var roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 3), new THREE.MeshStandardMaterial({ color: m % 2 ? 0xc03030 : 0x2a80c0 }));
      roof.position.y = 2.6; stall.add(roof);
      var box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x6a4a2a }));
      box.position.y = 0.6; stall.add(box);
      stall.position.set(-78 + m * 4, 0, 18 + (m % 3) * 4); scene.add(stall);
    }
    // Street lamps
    for (var lx = -120; lx <= 120; lx += 40) {
      for (var lz = -120; lz <= 120; lz += 40) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        pole.position.set(lx + 6, 3, lz); scene.add(pole);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
        bulb.position.set(lx + 6, 6.1, lz); scene.add(bulb);
      }
    }
    // Lights
    sunLight = new THREE.DirectionalLight(0xffe0b3, 1.1);
    sunLight.position.set(80, 120, 40); sunLight.castShadow = true; scene.add(sunLight);
    hemiLight = new THREE.HemisphereLight(0x8aa0c0, 0x1a1410, 0.7); scene.add(hemiLight);
    // Rain particle system (points)
    var rainGeo = new THREE.BufferGeometry();
    var rainPos = new Float32Array(1200 * 3);
    for (var r = 0; r < 1200; r++) {
      rainPos[r * 3] = (rand(r) - 0.5) * 120; rainPos[r * 3 + 1] = rand(r + 500) * 40; rainPos[r * 3 + 2] = (rand(r + 900) - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    var rainPts = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaac4ff, size: 0.35, transparent: true, opacity: 0.6 }));
    rainPts.name = 'rain'; scene.add(rainPts); RAIN_DROPS.push(rainPts);
    TA.world._buildingCount = count;
  }

  function makeCarMesh(color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.7 }));
    body.position.y = 0.55; body.castShadow = true; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.8 }));
    cabin.position.set(0, 1.15, -0.2); g.add(cabin);
    var wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12);
    var wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]].forEach(function (p) {
      var w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.36, p[1]); g.add(w);
    });
    return g;
  }

  function spawnTraffic(scene) {
    var colors = [0xc0c0c0, 0x303030, 0xb03030, 0x2a6db0, 0xd8a020, 0x3a8a3a, 0x8040a0];
    for (var i = 0; i < 16; i++) {
      var mesh = makeCarMesh(colors[i % colors.length]);
      var laneX = (Math.floor(rand(i * 3) * 7) - 3) * 40 + (rand(i) > 0.5 ? 3 : -3);
      var z = (rand(i * 7) - 0.5) * 240;
      mesh.position.set(laneX, 0, z);
      mesh.rotation.y = rand(i * 11) > 0.5 ? 0 : Math.PI;
      scene.add(mesh);
      TRAFFIC_CARS.push({ mesh: mesh, speed: 6 + rand(i * 5) * 8, lane: laneX, dir: mesh.rotation.y === 0 ? -1 : 1, stopped: false });
    }
  }

  function updateTraffic(dt) {
    TRAFFIC_CARS.forEach(function (car, i) {
      // stop at red lights (fake cycle) + avoid the player car ahead
      var lightRed = (Math.floor(TA.state.timeMinutes / 2) + i) % 3 === 0;
      var nearPlayer = Math.abs(car.mesh.position.z - TA.playerPos.z) < 8 && Math.abs(car.mesh.position.x - TA.playerPos.x) < 4;
      car.stopped = lightRed || nearPlayer;
      if (!car.stopped) {
        car.mesh.position.z += car.dir * car.speed * dt;
        if (car.mesh.position.z > 180) car.mesh.position.z = -180;
        if (car.mesh.position.z < -180) car.mesh.position.z = 180;
      }
    });
  }

  function spawnPedestrians(scene) {
    var cols = [0xd8d8d8, 0x804040, 0x406080, 0x608040, 0x906020];
    for (var i = 0; i < 14; i++) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.1, 8), new THREE.MeshStandardMaterial({ color: cols[i % 5] }));
      body.position.y = 0.9; g.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), new THREE.MeshStandardMaterial({ color: 0xd8a080 }));
      head.position.y = 1.65; g.add(head);
      var x = (rand(i * 17) - 0.5) * 200, z = (rand(i * 23) - 0.5) * 200;
      g.position.set(x, 0, z);
      scene.add(g);
      PEDESTRIANS.push({ mesh: g, speed: 1 + rand(i * 29) * 1.2, dir: rand(i * 31) * Math.PI * 2, fleeing: false });
    }
  }

  function updatePedestrians(dt) {
    PEDESTRIANS.forEach(function (p) {
      var d = Math.hypot(p.mesh.position.x - TA.playerPos.x, p.mesh.position.z - TA.playerPos.z);
      if (TA.state.wanted >= 3 || (TA.mouse.down && d < 20)) p.fleeing = true;
      var sp = p.fleeing ? p.speed * 3 : p.speed;
      p.mesh.position.x += Math.cos(p.dir) * sp * dt;
      p.mesh.position.z += Math.sin(p.dir) * sp * dt;
      if (Math.abs(p.mesh.position.x) > 140 || Math.abs(p.mesh.position.z) > 140) p.dir += Math.PI;
      p.mesh.rotation.y = -p.dir;
    });
  }

  function setWeather(w) {
    TA.state.weather = w;
    var rain = TA.scene && TA.scene.getObjectByName('rain');
    if (rain) rain.visible = (w !== 'CERAH' && w !== 'BERAWAN');
    if (TA.scene) TA.scene.fog.density = 0;
  }

  function setTimeOfDay(tod) {
    timeOfDay = tod; TA.state.timeOfDay = tod;
    if (!TA.scene) return;
    if (tod === 'day') {
      TA.scene.background = new THREE.Color(0x5a6a80); TA.scene.fog = new THREE.Fog(0x5a6a80, 50, 300);
      sunLight.intensity = 1.2; sunLight.color.set(0xffe0b3); hemiLight.intensity = 0.7;
    } else if (tod === 'dawn') {
      TA.scene.background = new THREE.Color(0x8a4a5a); TA.scene.fog = new THREE.Fog(0x8a4a5a, 40, 260);
      sunLight.intensity = 0.7; sunLight.color.set(0xff8a4a); hemiLight.intensity = 0.5;
    } else { // night
      TA.scene.background = new THREE.Color(0x0a0e1e); TA.scene.fog = new THREE.Fog(0x0a0e1e, 30, 220);
      sunLight.intensity = 0.25; sunLight.color.set(0x8aa0ff); hemiLight.intensity = 0.35;
    }
  }

  function updateRain(dt) {
    RAIN_DROPS.forEach(function (pts) {
      if (!pts.visible) return;
      var pos = pts.geometry.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i) - dt * 28;
        if (y < 0) y = 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      pts.position.x = TA.playerPos.x; pts.position.z = TA.playerPos.z;
    });
  }

  function updateHelicopterVisual(dt) { /* heli mesh is owned by police.js; kept for core loop symmetry */ }

  function getDistrictAt(x, z) {
    var best = 'pelabuhan', bestD = 1e9;
    Object.keys(DISTRICTS).forEach(function (k) {
      var d = Math.hypot(x - DISTRICTS[k].center.x, z - DISTRICTS[k].center.z);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function updateDistrictStanding(district, delta) {
    var s = TA.state.districts;
    s[district] = Math.max(0, Math.min(100, (s[district] || 50) + delta));
    return s[district];
  }

  TA.world = {
    DISTRICTS: DISTRICTS,
    buildCity: buildCity, spawnTraffic: spawnTraffic, spawnPedestrians: spawnPedestrians,
    updateTraffic: updateTraffic, updatePedestrians: updatePedestrians,
    setWeather: setWeather, setTimeOfDay: setTimeOfDay,
    updateRain: updateRain, updateHelicopterVisual: updateHelicopterVisual,
    getDistrictAt: getDistrictAt, updateDistrictStanding: updateDistrictStanding,
    makeCarMesh: makeCarMesh, TRAFFIC_CARS: TRAFFIC_CARS, PEDESTRIANS: PEDESTRIANS,
  };
})();
