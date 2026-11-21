// Teluk Arunika v3.6 — world.js
// Builds the city: 60+ buildings, roads, elevated toll road, port, beach,
// market, neon alley + the volcanic island (Pulau Abu). Traffic AI,
// pedestrians, day/night cycle, rain, wet-road gloss.
(function () {
  'use strict';
  var TA = window.TA;

  var trafficCars = [];
  var pedestrians = [];
  var rainPoints = null;
  var rainVel = null;
  var emberPoints = null;
  var smokePuffs = [];
  var neonSigns = [];
  var trafficLights = [];
  var lightState = 0; // 0 green NS, 1 green EW
  var lightTimer = 0;
  var rngSeed = 20261121;

  function rand() {
    rngSeed = (rngSeed * 1103515245 + 12345) % 2147483648;
    return rngSeed / 2147483648;
  }

  function windowTexture(base, lit) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 64, 128);
    for (var y = 8; y < 120; y += 14) {
      for (var x = 6; x < 58; x += 12) {
        var on = rand() < 0.55;
        g.fillStyle = on ? lit : 'rgba(8,10,16,0.9)';
        g.fillRect(x, y, 8, 9);
      }
    }
    var tex = new TA.three.CanvasTexture(c);
    tex.colorSpace = TA.three.SRGBColorSpace;
    return tex;
  }

  function buildCity() {
    var T = TA.three, scene = TA.scene;

    // --- ground: dark wet asphalt base ---
    var groundMat = new T.MeshStandardMaterial({ color: 0x232830, roughness: 0.35, metalness: 0.45 });
    var ground = new T.Mesh(new T.PlaneGeometry(520, 520), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // --- beach (south edge) + sea ---
    var sand = new T.Mesh(new T.PlaneGeometry(520, 40),
      new T.MeshStandardMaterial({ color: 0x8a7a55, roughness: 0.95 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.05, 240);
    scene.add(sand);
    var sea = new T.Mesh(new T.PlaneGeometry(520, 120),
      new T.MeshStandardMaterial({ color: 0x0d3a52, roughness: 0.15, metalness: 0.7 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.02, 320);
    scene.add(sea);

    // --- roads: grid of dark strips with centre dashes ---
    var roadMat = new T.MeshStandardMaterial({ color: 0x14171c, roughness: 0.22, metalness: 0.55 });
    var dashMat = new T.MeshBasicMaterial({ color: 0xd8c86a });
    var roadCoords = [-120, -80, -40, 0, 40, 80, 120];
    roadCoords.forEach(function (v) {
      var ns = new T.Mesh(new T.PlaneGeometry(10, 480), roadMat);
      ns.rotation.x = -Math.PI / 2; ns.position.set(v, 0.08, 0); ns.receiveShadow = true;
      scene.add(ns);
      var ew = new T.Mesh(new T.PlaneGeometry(480, 10), roadMat);
      ew.rotation.x = -Math.PI / 2; ew.position.set(0, 0.08, v); ew.receiveShadow = true;
      scene.add(ew);
      for (var d = -220; d <= 220; d += 16) {
        var dash = new T.Mesh(new T.PlaneGeometry(0.5, 4), dashMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(v, 0.12, d);
        scene.add(dash);
        var dash2 = new T.Mesh(new T.PlaneGeometry(4, 0.5), dashMat);
        dash2.rotation.x = -Math.PI / 2; dash2.position.set(d, 0.12, v);
        scene.add(dash2);
      }
    });

    // --- sidewalks ---
    var walkMat = new T.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.9 });
    roadCoords.forEach(function (v) {
      [-7.5, 7.5].forEach(function (off) {
        var w = new T.Mesh(new T.PlaneGeometry(4, 480), walkMat);
        w.rotation.x = -Math.PI / 2; w.position.set(v + off, 0.1, 0);
        scene.add(w);
      });
    });

    // --- buildings: 60+ boxes, window textures, neon in the alley ---
    var palettes = [
      ['#2b3442', '#ffd27a'], ['#33272b', '#ff9d5c'], ['#24303a', '#9fd8ff'],
      ['#2e2a3a', '#ff7ab8'], ['#3a2f22', '#ffe9a8'], ['#222c26', '#a8ffce'],
    ];
    var placed = 0;
    for (var gx = -3; gx <= 3; gx++) {
      for (var gz = -3; gz <= 3; gz++) {
        if (gx === 0 && gz === 0) continue; // central plaza
        var cx = gx * 40 + (rand() - 0.5) * 8;
        var cz = gz * 40 + (rand() - 0.5) * 8;
        var w = 12 + rand() * 14, d = 12 + rand() * 14, h = 8 + rand() * 34;
        var pal = palettes[Math.floor(rand() * palettes.length)];
        var mat = new T.MeshStandardMaterial({
          map: windowTexture(pal[0], pal[1]),
          roughness: 0.8, metalness: 0.1,
          emissive: 0x111111, emissiveIntensity: 0.6,
        });
        var b = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
        b.position.set(cx, h / 2, cz);
        b.castShadow = true; b.receiveShadow = true;
        b.name = 'building-' + placed;
        scene.add(b);
        placed++;
        // rooftop AC box on tall towers
        if (h > 28) {
          var ac = new T.Mesh(new T.BoxGeometry(4, 2, 4),
            new T.MeshStandardMaterial({ color: 0x555c66, roughness: 0.9 }));
          ac.position.set(cx, h + 1, cz);
          scene.add(ac);
        }
      }
    }
    // neon alley (Gang Neon): glowing signs on the west block
    var neonColors = [0xff2d78, 0x00e5ff, 0xffe600, 0x7c4dff, 0x00ff9d];
    for (var n = 0; n < 10; n++) {
      var sign = new T.Mesh(new T.BoxGeometry(0.4, 1.6 + rand() * 2.4, 3.4),
        new T.MeshStandardMaterial({
          color: 0x111111, emissive: neonColors[n % neonColors.length],
          emissiveIntensity: 2.2, roughness: 0.4,
        }));
      sign.position.set(-118 + (n % 2) * 2, 4 + rand() * 5, -60 + n * 12);
      scene.add(sign);
      neonSigns.push(sign);
      var glow = new T.PointLight(neonColors[n % neonColors.length], 6, 18);
      glow.position.copy(sign.position).x += 2;
      scene.add(glow);
    }

    // --- port: containers + cranes + warehouse ---
    var contColors = [0xb3402a, 0x2a6db3, 0x3a8a4a, 0xc7a23a, 0x7a3ab3];
    for (var i = 0; i < 26; i++) {
      var cw = 6, ch = 2.6, cd = 2.6;
      var cm = new T.MeshStandardMaterial({ color: contColors[i % contColors.length], roughness: 0.7, metalness: 0.3 });
      var cont = new T.Mesh(new T.BoxGeometry(cw, ch, cd), cm);
      var stack = i % 3;
      cont.position.set(-150 + (i % 6) * 8, 1.3 + stack * 2.7, 150 + Math.floor(i / 6) * 9);
      cont.rotation.y = (rand() - 0.5) * 0.1;
      cont.castShadow = true;
      scene.add(cont);
    }
    // cranes
    for (var k = 0; k < 3; k++) {
      var crane = new T.Group();
      var legMat = new T.MeshStandardMaterial({ color: 0xd8a020, roughness: 0.6, metalness: 0.4 });
      var leg1 = new T.Mesh(new T.BoxGeometry(2, 34, 2), legMat);
      leg1.position.set(0, 17, 0); crane.add(leg1);
      var leg2 = leg1.clone(); leg2.position.set(10, 17, 0); crane.add(leg2);
      var arm = new T.Mesh(new T.BoxGeometry(34, 2, 2), legMat);
      arm.position.set(12, 34, 0); crane.add(arm);
      var cable = new T.Mesh(new T.BoxGeometry(0.3, 10, 0.3),
        new T.MeshStandardMaterial({ color: 0x222222 }));
      cable.position.set(24, 28, 0); crane.add(cable);
      crane.position.set(-160 + k * 40, 0, 190);
      scene.add(crane);
    }
    // warehouse
    var wh = new T.Mesh(new T.BoxGeometry(40, 12, 24),
      new T.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.85 }));
    wh.position.set(-60, 6, 185); wh.castShadow = true;
    scene.add(wh);

    // --- market stalls (Pasar) ---
    for (var m = 0; m < 12; m++) {
      var stall = new T.Group();
      var awn = new T.Mesh(new T.BoxGeometry(5, 0.3, 4),
        new T.MeshStandardMaterial({ color: [0xd83a2a, 0x2a9dd8, 0xe8b820, 0x3ad86a][m % 4], roughness: 0.8 }));
      awn.position.y = 2.6; awn.rotation.z = 0.12;
      stall.add(awn);
      var counter = new T.Mesh(new T.BoxGeometry(4.6, 1.1, 3.4),
        new T.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 }));
      counter.position.y = 0.55; stall.add(counter);
      stall.position.set(50 + (m % 4) * 10, 0, 60 + Math.floor(m / 4) * 12);
      scene.add(stall);
    }

    // --- elevated toll road (Tol Layang): deck + pillars ---
    var deck = new T.Mesh(new T.BoxGeometry(16, 1.5, 320),
      new T.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.4, metalness: 0.4 }));
    deck.position.set(-40, 10, -60);
    deck.castShadow = true;
    scene.add(deck);
    for (var p = -200; p <= 80; p += 28) {
      var pillar = new T.Mesh(new T.BoxGeometry(3, 10, 3),
        new T.MeshStandardMaterial({ color: 0x3c424a, roughness: 0.8 }));
      pillar.position.set(-40, 5, p);
      scene.add(pillar);
    }
    // toll gate
    var gate = new T.Mesh(new T.BoxGeometry(16, 6, 1),
      new T.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.7 }));
    gate.position.set(-40, 13, -160);
    scene.add(gate);

    // --- bridge to Pulau Abu (east) ---
    var bridge = new T.Mesh(new T.BoxGeometry(140, 1.2, 12),
      new T.MeshStandardMaterial({ color: 0x33383f, roughness: 0.5, metalness: 0.3 }));
    bridge.position.set(150, 2, 40);
    scene.add(bridge);
    for (var bp = 90; bp <= 210; bp += 20) {
      var bpillar = new T.Mesh(new T.BoxGeometry(2.5, 4, 2.5),
        new T.MeshStandardMaterial({ color: 0x2a2e33 }));
      bpillar.position.set(bp, 0, 40);
      scene.add(bpillar);
    }

    // --- central plaza: fountain + Pak Amir's garage ---
    var plaza = new T.Mesh(new T.CylinderGeometry(10, 12, 1, 24),
      new T.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.6 }));
    plaza.position.set(0, 0.5, 0);
    scene.add(plaza);
    var garage = new T.Mesh(new T.BoxGeometry(22, 7, 14),
      new T.MeshStandardMaterial({ color: 0x37507a, roughness: 0.7 }));
    garage.position.set(24, 3.5, -24);
    garage.castShadow = true;
    scene.add(garage);
    var garageSign = new T.Mesh(new T.BoxGeometry(10, 1.6, 0.5),
      new T.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc400, emissiveIntensity: 2 }));
    garageSign.position.set(24, 7.5, -16.5);
    scene.add(garageSign);

    // --- traffic lights at main intersections ---
    [[0, 0], [40, 40], [-40, -40], [80, 0]].forEach(function (pt) {
      var pole = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 6, 8),
        new T.MeshStandardMaterial({ color: 0x222222 }));
      pole.position.set(pt[0] + 6, 3, pt[1] + 6);
      scene.add(pole);
      var lamp = new T.Mesh(new T.BoxGeometry(0.8, 2.2, 0.8),
        new T.MeshStandardMaterial({ color: 0x111111, emissive: 0x00ff44, emissiveIntensity: 2 }));
      lamp.position.set(pt[0] + 6, 6.4, pt[1] + 6);
      lamp.name = 'traffic-light';
      scene.add(lamp);
      trafficLights.push(lamp);
    });

    // --- rain particles ---
    var rainCount = 2600;
    var pos = new Float32Array(rainCount * 3);
    rainVel = new Float32Array(rainCount);
    for (var r = 0; r < rainCount; r++) {
      pos[r * 3] = (rand() - 0.5) * 300;
      pos[r * 3 + 1] = rand() * 50;
      pos[r * 3 + 2] = (rand() - 0.5) * 300;
      rainVel[r] = 28 + rand() * 18;
    }
    var rainGeo = new TA.three.BufferGeometry();
    rainGeo.setAttribute('position', new TA.three.BufferAttribute(pos, 3));
    rainPoints = new TA.three.Points(rainGeo, new TA.three.PointsMaterial({
      color: 0x9fb8d8, size: 0.28, transparent: true, opacity: 0.55,
    }));
    rainPoints.visible = true;
    scene.add(rainPoints);

    TA.world._trafficLights = trafficLights;
    TA.world._placedBuildings = placed;
  }

  // ---------- volcanic island: Pulau Abu ----------
  function buildVolcanicIsland() {
    var T = TA.three, scene = TA.scene;
    var group = new T.Group();
    group.name = 'pulau-abu';

    // ash ground: dark disc east of the bridge
    var ash = new T.Mesh(new T.CircleGeometry(72, 40),
      new T.MeshStandardMaterial({ color: 0x2b2622, roughness: 1 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.set(240, 0.15, 40);
    ash.receiveShadow = true;
    group.add(ash);

    // crater cone
    var cone = new T.Mesh(new T.ConeGeometry(26, 22, 24),
      new T.MeshStandardMaterial({ color: 0x1e1a17, roughness: 1 }));
    cone.position.set(252, 11, 30);
    cone.castShadow = true;
    group.add(cone);
    // glowing crater mouth
    var mouth = new T.Mesh(new T.CircleGeometry(10, 24),
      new T.MeshBasicMaterial({ color: 0xff5a00 }));
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.set(252, 22.1, 30);
    group.add(mouth);
    var craterLight = new T.PointLight(0xff4400, 40, 90);
    craterLight.position.set(252, 26, 30);
    group.add(craterLight);

    // lava rocks with ember glow (kept clear of the Misi 8 staging clearing)
    for (var i = 0; i < 22; i++) {
      var a = rand() * Math.PI * 2, rr = 18 + rand() * 48;
      var rx = 240 + Math.cos(a) * rr, rz = 40 + Math.sin(a) * rr;
      var cdx = rx - 234, cdz = rz - 36;
      if (cdx * cdx + cdz * cdz < 81) continue; // 9 m clearing for the mission-8 shot
      var rock = new T.Mesh(new T.DodecahedronGeometry(1.5 + rand() * 2.5, 0),
        new T.MeshStandardMaterial({
          color: 0x241f1c, roughness: 1,
          emissive: 0xff3300, emissiveIntensity: 0.12 + rand() * 0.35,
        }));
      rock.position.set(rx, 1, rz);
      rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      rock.castShadow = true;
      group.add(rock);
    }
    // lava flow ribbon
    var flow = new T.Mesh(new T.PlaneGeometry(6, 46),
      new T.MeshStandardMaterial({ color: 0x30160a, emissive: 0xff4400, emissiveIntensity: 2.2, roughness: 0.6 }));
    flow.rotation.x = -Math.PI / 2;
    flow.position.set(232, 0.25, 52);
    flow.rotation.z = 0.5;
    group.add(flow);

    // embers: rising orange points
    var eCount = 320;
    var epos = new Float32Array(eCount * 3);
    for (var e = 0; e < eCount; e++) {
      epos[e * 3] = 240 + (rand() - 0.5) * 90;
      epos[e * 3 + 1] = rand() * 30;
      epos[e * 3 + 2] = 40 + (rand() - 0.5) * 90;
    }
    var eGeo = new T.BufferGeometry();
    eGeo.setAttribute('position', new T.BufferAttribute(epos, 3));
    emberPoints = new T.Points(eGeo, new T.PointsMaterial({
      color: 0xff7722, size: 0.55, transparent: true, opacity: 0.9,
    }));
    group.add(emberPoints);

    // smoke puffs over the crater
    for (var s2 = 0; s2 < 9; s2++) {
      var puff = new T.Mesh(new T.SphereGeometry(4 + rand() * 4, 10, 10),
        new T.MeshStandardMaterial({ color: 0x55504c, transparent: true, opacity: 0.42, roughness: 1 }));
      puff.position.set(252 + (rand() - 0.5) * 16, 26 + s2 * 3.5, 30 + (rand() - 0.5) * 16);
      group.add(puff);
      smokePuffs.push(puff);
    }

    // a few scorched shacks + warning sign
    for (var h = 0; h < 4; h++) {
      var shack = new T.Mesh(new T.BoxGeometry(6, 4, 5),
        new T.MeshStandardMaterial({ color: 0x3a2e26, roughness: 1 }));
      shack.position.set(205 + h * 12, 2, 78 - h * 6);
      group.add(shack);
    }
    scene.add(group);
    TA.world._island = group;
  }

  // ---------- traffic ----------
  function spawnTraffic() {
    var T = TA.three;
    var colors = [0xc0c8d0, 0x8a2a2a, 0x2a5a8a, 0xd8b820, 0x3a7a3a, 0x555c66, 0x7a3ab3];
    var lanes = [-122, -82, -42, -2, 38, 78, 118];
    for (var i = 0; i < 18; i++) {
      var car = new T.Group();
      var body = new T.Mesh(new T.BoxGeometry(2, 0.8, 4.4),
        new T.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.35, metalness: 0.6 }));
      body.position.y = 0.7; body.castShadow = true;
      car.add(body);
      var cabin = new T.Mesh(new T.BoxGeometry(1.7, 0.65, 2.2),
        new T.MeshStandardMaterial({ color: 0x18222e, roughness: 0.2, metalness: 0.7 }));
      cabin.position.set(0, 1.35, -0.2);
      car.add(cabin);
      var wheelGeo = new T.CylinderGeometry(0.42, 0.42, 0.3, 12);
      var wheelMat = new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
      [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]].forEach(function (w) {
        var wheel = new T.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(w[0], 0.42, w[1]);
        car.add(wheel);
      });
      var head = new T.Mesh(new T.BoxGeometry(1.6, 0.3, 0.2),
        new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1.6 }));
      head.position.set(0, 0.8, 2.25);
      car.add(head);
      var ns = i % 2 === 0;
      var lane = lanes[i % lanes.length];
      car.position.set(ns ? lane : (rand() - 0.5) * 300, 0, ns ? (rand() - 0.5) * 300 : lane);
      car.rotation.y = ns ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      car.userData = {
        ns: ns, lane: lane, speed: 7 + rand() * 6,
        stopped: false, honk: 0, color: colors[i % colors.length],
      };
      TA.scene.add(car);
      trafficCars.push(car);
    }
  }

  function spawnPedestrians() {
    var T = TA.three;
    var shirts = [0xd83a2a, 0x2a9dd8, 0xe8b820, 0x3ad86a, 0xe8e8e8, 0x7a3ab3];
    for (var i = 0; i < 26; i++) {
      var p = new T.Group();
      var body = new T.Mesh(new T.CapsuleGeometry(0.32, 0.8, 3, 8),
        new T.MeshStandardMaterial({ color: shirts[i % shirts.length], roughness: 0.9 }));
      body.position.y = 1.0; body.castShadow = true;
      p.add(body);
      var head = new T.Mesh(new T.SphereGeometry(0.26, 10, 10),
        new T.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.8 }));
      head.position.y = 1.85;
      p.add(head);
      p.position.set((rand() - 0.5) * 260, 0, (rand() - 0.5) * 260);
      p.userData = {
        speed: 1 + rand() * 1.4, dir: rand() * Math.PI * 2,
        panic: 0, waitAt: 0,
      };
      TA.scene.add(p);
      pedestrians.push(p);
    }
  }

  // ---------- weather & time ----------
  function setWeather(w) {
    TA.state.weather = w;
    if (rainPoints) rainPoints.visible = (w === 'rain' || w === 'storm');
    if (TA.scene) {
      TA.scene.fog.density = 0;
      if (w === 'storm') TA.scene.fog = new TA.three.Fog(0x141a20, 40, 170);
      else TA.scene.fog = new TA.three.Fog(0x1a2733, 60, 240);
    }
  }

  function setTimeOfDay(h) {
    TA.state.time = h;
    var sun = TA.lights.sun, hemi = TA.lights.hemi;
    var isNight = h < 5.5 || h > 18.5;
    var isDusk = (h >= 17.5 && h <= 19.5);
    if (isDusk) {
      // volcanic dusk: orange-grey sky (Pulau Abu hour)
      TA.scene.background.setHex(0x3a2418);
      TA.scene.fog.color.setHex(0x3a2418);
      sun.color.setHex(0xff7a2a); sun.intensity = 1.3;
      sun.position.set(-40, 30, 80);
      hemi.intensity = 0.65;
    } else if (isNight) {
      TA.scene.background.setHex(0x0a1220);
      TA.scene.fog.color.setHex(0x0a1220);
      sun.color.setHex(0x8fb0ff); sun.intensity = 0.35;
      sun.position.set(-30, 60, -40);
      hemi.intensity = 0.3;
    } else {
      var overcast = TA.state.weather !== 'clear';
      TA.scene.background.setHex(overcast ? 0x2a3644 : 0x6a8ab0);
      TA.scene.fog.color.setHex(overcast ? 0x2a3644 : 0x6a8ab0);
      sun.color.setHex(0xffe0b3); sun.intensity = overcast ? 0.9 : 1.6;
      sun.position.set(60, 90, 30);
      hemi.intensity = 0.9;
    }
  }

  // ---------- per-frame ----------
  function update(dt) {
    // traffic light cycle
    lightTimer += dt;
    if (lightTimer > 9) {
      lightTimer = 0;
      lightState = 1 - lightState;
      trafficLights.forEach(function (lamp) {
        lamp.material.emissive.setHex(lightState === 0 ? 0x00ff44 : 0xff2222);
      });
    }
    updateTraffic(dt);
    updatePedestrians(dt);
    updateRain(dt);
    updateEmbers(dt);
    // neon flicker
    neonSigns.forEach(function (s, i) {
      s.material.emissiveIntensity = 1.8 + Math.sin(TA.state.elapsed * 3 + i * 1.7) * 0.5;
    });
    // slow day/night drift of the sun
    if (Math.floor(TA.state.elapsed * 2) !== Math.floor((TA.state.elapsed - dt) * 2)) {
      setTimeOfDay(TA.state.time);
    }
  }

  function updateTraffic(dt) {
    var px = TA.playerObj ? TA.playerObj.position.x : 0;
    var pz = TA.playerObj ? TA.playerObj.position.z : 0;
    trafficCars.forEach(function (car) {
      var u = car.userData;
      // stop at red: NS cars stop when lightState==1 near intersections
      var nearCross = Math.abs(((car.position.z % 40) + 40) % 40) < 4 ||
                      Math.abs(((car.position.x % 40) + 40) % 40) < 4;
      u.stopped = nearCross && ((u.ns && lightState === 1) || (!u.ns && lightState === 0));
      // avoid the player: slow + honk
      var dx = car.position.x - px, dz = car.position.z - pz;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < 7) { u.stopped = true; u.honk += dt; }
      if (u.stopped) return;
      var v = u.speed * dt;
      if (u.ns) {
        car.position.z += (car.rotation.y === 0 ? v : -v);
        if (car.position.z > 250) car.position.z = -250;
        if (car.position.z < -250) car.position.z = 250;
      } else {
        car.position.x += (car.rotation.y === Math.PI / 2 ? v : -v);
        if (car.position.x > 250) car.position.x = -250;
        if (car.position.x < -250) car.position.x = 250;
      }
    });
  }

  function updatePedestrians(dt) {
    pedestrians.forEach(function (p) {
      var u = p.userData;
      if (u.panic > 0) {
        u.panic -= dt;
        p.position.x += Math.cos(u.dir) * 4 * dt;
        p.position.z += Math.sin(u.dir) * 4 * dt;
        return;
      }
      if (u.waitAt > 0) { u.waitAt -= dt; return; }
      p.position.x += Math.cos(u.dir) * u.speed * dt;
      p.position.z += Math.sin(u.dir) * u.speed * dt;
      p.rotation.y = -u.dir + Math.PI / 2;
      if (Math.abs(p.position.x) > 240 || Math.abs(p.position.z) > 240) u.dir += Math.PI / 2;
      if (rand() < 0.002) { u.dir = rand() * Math.PI * 2; u.waitAt = 1 + rand() * 3; }
    });
  }

  function panicPedestrians(x, z) {
    pedestrians.forEach(function (p) {
      var dx = p.position.x - x, dz = p.position.z - z;
      if (dx * dx + dz * dz < 900) {
        p.userData.panic = 2.5;
        p.userData.dir = Math.atan2(dz, dx);
      }
    });
  }

  function updateRain(dt) {
    if (!rainPoints || !rainPoints.visible) return;
    var pos = rainPoints.geometry.attributes.position;
    var fall = (TA.state.weather === 'storm' ? 55 : 34) * dt;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) - fall * (rainVel[i] / 34);
      if (y < 0) y = 45 + Math.random() * 5;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  function updateEmbers(dt) {
    if (!emberPoints) return;
    var pos = emberPoints.geometry.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) + dt * (2 + (i % 5));
      if (y > 32) y = 0.5;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(TA.state.elapsed + i) * dt * 0.6);
    }
    pos.needsUpdate = true;
    smokePuffs.forEach(function (p, i) {
      p.position.y += dt * 0.7;
      if (p.position.y > 52) p.position.y = 26;
      p.material.opacity = 0.3 + Math.sin(TA.state.elapsed * 0.8 + i) * 0.12;
    });
  }

  TA.world = {
    buildCity: buildCity,
    buildVolcanicIsland: buildVolcanicIsland,
    spawnTraffic: spawnTraffic,
    spawnPedestrians: spawnPedestrians,
    updateTraffic: updateTraffic,
    updatePedestrians: updatePedestrians,
    setWeather: setWeather,
    setTimeOfDay: setTimeOfDay,
    update: update,
    panicPedestrians: panicPedestrians,
    getTraffic: function () { return trafficCars; },
    getPedestrians: function () { return pedestrians; },
  };
})();
