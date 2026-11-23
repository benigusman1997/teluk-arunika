// Open world city: six districts, road grid, coast, port, flyover,
// red bridge and Ash Island. All placement uses the seeded random.

// District table: id, tint, bounds, landmark, main street, standing.
const DISTRICTS = [
  { id: 'PELABUHAN', tint: '#5fa8d3', x0: -450, x1: -90, z0: 180, z1: 450, landmark: 'MV ARUNIKA JAYA', street: 'Jalan Dermaga', standing: 35 },
  { id: 'PASAR SENJA', tint: '#ff9f5a', x0: -450, x1: -90, z0: -270, z1: 180, landmark: 'red market gate', street: 'Jalan Pasar', standing: 55 },
  { id: 'GANG NEON', tint: '#c77dff', x0: -90, x1: 450, z0: -270, z1: 270, landmark: 'MENARA NEON', street: 'Jalan Merdeka', standing: 40 },
  { id: 'PANTAI', tint: '#ffd166', x0: -90, x1: 450, z0: 270, z1: 450, landmark: 'HOTEL NUSA', street: 'Pantai Boulevard', standing: 60 },
  { id: 'TOL LAYANG', tint: '#9aa5b1', x0: -450, x1: 450, z0: -450, z1: -270, landmark: 'flyover', street: 'Tol Layang', standing: 30 },
  { id: 'PULAU ABU', tint: '#6b5b53', x0: 490, x1: 750, z0: -490, z1: -230, landmark: 'GUNUNG ABU', street: 'Jalan Abu', standing: 10 },
];

// Named places with map coordinates.
const CITY_PLACES = [
  { name: 'BANK ARUNIKA', x: 90, z: -90 },
  { name: 'BENGKEL PAK AMIR', x: -270, z: 30 },
  { name: 'MARKET GATE', x: -270, z: -90 },
  { name: 'KELO ARMS', x: -180, z: -180 },
  { name: 'WARUNG BU TINI', x: -200, z: 60 },
  { name: 'CAT KILAT', x: 180, z: 180 },
  { name: 'SAFEHOUSE PANTAI', x: 300, z: 330 },
  { name: 'SAFEHOUSE NEON', x: 0, z: -180 },
  { name: 'HOTEL NUSA', x: 200, z: 340 },
  { name: 'PIER 9', x: -400, z: 400 },
  { name: 'COUNTING HOUSE', x: 270, z: -180 },
  { name: 'RS ARUNIKA', x: -20, z: 200 },
  { name: 'TAPD HQ', x: 180, z: -270 },
];

// Shop signs painted on facades near the roads.
const SHOP_SIGN_NAMES = [
  'WARUNG BU TINI', 'KOPI OMBAK', 'ES KELAPA JAYA', 'ARUNIKA TELECOM',
  'BENGKEL PAK AMIR', 'HOTEL NUSA', 'BAKSO 88', 'TOKO EMAS SARI',
  'APOTEK SEHAT', 'KELO ARMS',
];

const cty_FACADE_COLOURS = [
  '#ff7f6b', '#7fd9b6', '#36c2c9', '#ffc24a', '#f25fa0',
  '#fff1d6', '#8fc3ee', '#d9764a', '#ff9f5a', '#c77dff',
];
const cty_ROAD_LINES = [-450, -360, -270, -180, -90, 0, 90, 180, 270, 360, 450];

// Build the whole city in one pass, in district order.
function buildOpenWorldCity() {
  buildSixDistricts();
  buildRoadNetworkAndLanes();
  buildCoastBoulevardAndBeach();
  buildBankArunikaPlaza();
  buildMarketGateAndStalls();
  buildPortCranesAndContainers();
  buildFlyoverAndRedBridge();
  buildAshIslandVolcano();
  cty_addGroundAndParks();
}

// Ground plane, district tint patches and small parks.
function cty_addGroundAndParks() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1100),
    new THREE.MeshLambertMaterial({ color: 0x9aa578 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(100, -0.1, 0);
  ground.receiveShadow = true;
  WORLD.scene.add(ground);
  for (const d of DISTRICTS) {
    if (d.id === 'PULAU ABU') {
      continue;
    }
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(d.x1 - d.x0, d.z1 - d.z0),
      new THREE.MeshLambertMaterial({ color: d.tint, transparent: true, opacity: 0.08 }),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((d.x0 + d.x1) / 2, 0.0, (d.z0 + d.z1) / 2);
    WORLD.scene.add(patch);
  }
}

// Lay down the six districts: blocks of pastel buildings with window
// grids, dark shop fronts, awnings and signs along every road.
function buildSixDistricts() {
  for (let gx = 0; gx < 10; gx++) {
    for (let gz = 0; gz < 10; gz++) {
      const bx = -450 + gx * 90;
      const bz = -450 + gz * 90;
      if (bz >= 360) {
        continue;
      }
      cty_buildBlock(bx, bz, gx, gz);
    }
  }
  cty_placeLandmarkTowers();
}

// One city block: two or three buildings facing the road, never a
// blank wall near a road, plus a shop sign on the ground floor.
function cty_buildBlock(bx, bz, gx, gz) {
  const count = 2 + Math.floor(taNextRandom() * 2);
  for (let i = 0; i < count; i++) {
    const w = 18 + taNextRandom() * 14;
    const d = 16 + taNextRandom() * 12;
    const tall = gx >= 4 && gz >= 2 && gz <= 6;
    const h = tall ? 30 + taNextRandom() * 55 : 7 + taNextRandom() * 14;
    const x = bx + 12 + (i % 2) * 38 + taNextRandom() * 6;
    const z = bz + 14 + Math.floor(i / 2) * 34 + taNextRandom() * 6;
    const colour = pickFromList(cty_FACADE_COLOURS);
    const floors = Math.max(2, Math.floor(h / 4));
    const tex = msh_makeFacadeTexture(colour, floors, 4);
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    WORLD.scene.add(building);
    WORLD.colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    const shop = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 2.6, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
    );
    shop.position.set(x, 1.3, z - d / 2 - 0.2);
    WORLD.scene.add(shop);
    if (taNextRandom() > 0.55) {
      const signName = pickFromList(SHOP_SIGN_NAMES);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, 1.1),
        new THREE.MeshBasicMaterial({
          map: makeSignTexture(signName, pickFromList(cty_FACADE_COLOURS), '#fff1d6'),
        }),
      );
      sign.position.set(x, 3.4, z - d / 2 - 0.45);
      WORLD.scene.add(sign);
    }
    const roofBox = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.3, 1.6, d * 0.3),
      new THREE.MeshLambertMaterial({ color: 0x6b5b53 }),
    );
    roofBox.position.set(x + w * 0.2, h + 0.8, z);
    WORLD.scene.add(roofBox);
  }
}

// The tall Gang Neon towers: MENARA NEON and BANK ARUNIKA.
function cty_placeLandmarkTowers() {
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(26, 95, 26),
    new THREE.MeshLambertMaterial({
      map: msh_makeFacadeTexture('#c77dff', 20, 5),
      emissive: 0x331144, emissiveIntensity: 0.4,
    }),
  );
  tower.position.set(40, 47.5, -40);
  tower.castShadow = true;
  WORLD.scene.add(tower);
  WORLD.colliders.push({ x0: 27, x1: 53, z0: -53, z1: -27 });
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(10, 8, 10),
    new THREE.MeshLambertMaterial({ color: 0xff6fb5, emissive: 0xff6fb5, emissiveIntensity: 0.8 }),
  );
  crown.position.set(40, 99, -40);
  WORLD.scene.add(crown);
  const hotel = new THREE.Mesh(
    new THREE.BoxGeometry(30, 42, 22),
    new THREE.MeshLambertMaterial({
      map: msh_makeFacadeTexture('#ffd166', 10, 5),
    }),
  );
  hotel.position.set(200, 21, 340);
  hotel.castShadow = true;
  WORLD.scene.add(hotel);
  WORLD.colliders.push({ x0: 185, x1: 215, z0: 329, z1: 351 });
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 3),
    new THREE.MeshBasicMaterial({ map: makeSignTexture('HOTEL NUSA', '#ffd166', '#7a4a00') }),
  );
  hotelSign.position.set(200, 44, 328.8);
  hotelSign.rotation.y = Math.PI;
  WORLD.scene.add(hotelSign);
}

// Roads on a 90 m grid with lane paint, sidewalks, kerbs, lamps,
// traffic lights and parked cars along the kerbs.
function buildRoadNetworkAndLanes() {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x55565c });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xcfc8ba });
  for (const line of cty_ROAD_LINES) {
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(14, 900), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(line, 0.05, 0);
    roadV.receiveShadow = true;
    WORLD.scene.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(900, 14), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.05, line);
    roadH.receiveShadow = true;
    WORLD.scene.add(roadH);
    cty_addLanePaint(line, true);
    cty_addLanePaint(line, false);
    const walkV1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 900), walkMat);
    walkV1.rotation.x = -Math.PI / 2;
    walkV1.position.set(line - 8.5, 0.08, 0);
    WORLD.scene.add(walkV1);
    const walkV2 = walkV1.clone();
    walkV2.position.x = line + 8.5;
    WORLD.scene.add(walkV2);
    const walkH1 = new THREE.Mesh(new THREE.PlaneGeometry(900, 3), walkMat);
    walkH1.rotation.x = -Math.PI / 2;
    walkH1.position.set(0, 0.08, line - 8.5);
    WORLD.scene.add(walkH1);
    const walkH2 = walkH1.clone();
    walkH2.position.z = line + 8.5;
    WORLD.scene.add(walkH2);
    WORLD.sidewalks.push({ x: line - 8.5, z: 0, vertical: true });
    WORLD.sidewalks.push({ x: line + 8.5, z: 0, vertical: true });
    WORLD.sidewalks.push({ x: 0, z: line - 8.5, vertical: false });
    WORLD.sidewalks.push({ x: 0, z: line + 8.5, vertical: false });
    WORLD.lanes.push({ points: cty_lanePoints(line, -3.5, true), dir: 1 });
    WORLD.lanes.push({ points: cty_lanePoints(line, 3.5, true), dir: -1 });
    WORLD.lanes.push({ points: cty_lanePoints(line, -3.5, false), dir: 1 });
    WORLD.lanes.push({ points: cty_lanePoints(line, 3.5, false), dir: -1 });
  }
  cty_addCrossingsAndLights();
  cty_addLaneArrows();
  cty_addParkedCars();
}

// Waypoints along one road line for a lane offset.
function cty_lanePoints(line, offset, vertical) {
  const points = [];
  for (let t = -450; t <= 450; t += 45) {
    if (vertical) {
      points.push({ x: line + offset, z: t });
    } else {
      points.push({ x: t, z: line + offset });
    }
  }
  return points;
}

// Dashed white lane paint and a double yellow centre line per road.
function cty_addLanePaint(line, vertical) {
  const dashTex = new THREE.CanvasTexture((function dashCanvas() {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#55565c';
    g.fillRect(0, 0, 8, 64);
    g.fillStyle = '#f4f1e6';
    g.fillRect(2, 6, 4, 30);
    return c;
  })());
  dashTex.wrapS = THREE.RepeatWrapping;
  dashTex.wrapT = THREE.RepeatWrapping;
  dashTex.repeat.set(1, 24);
  const dashMat = new THREE.MeshBasicMaterial({ map: dashTex });
  const dashV = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 900), dashMat);
  dashV.rotation.x = -Math.PI / 2;
  if (vertical) {
    dashV.position.set(line, 0.1, 0);
  } else {
    dashV.rotation.z = Math.PI / 2;
    dashV.position.set(0, 0.1, line);
  }
  WORLD.scene.add(dashV);
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  const y1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 900), yellowMat);
  y1.rotation.x = -Math.PI / 2;
  const y2 = y1.clone();
  if (vertical) {
    y1.position.set(line - 0.5, 0.1, 0);
    y2.position.set(line + 0.5, 0.1, 0);
  } else {
    y1.rotation.z = Math.PI / 2;
    y2.rotation.z = Math.PI / 2;
    y1.position.set(0, 0.1, line - 0.5);
    y2.position.set(0, 0.1, line + 0.5);
  }
  WORLD.scene.add(y1);
  WORLD.scene.add(y2);
}

// White lane arrows painted on the road surface, pointing along it.
function cty_addLaneArrows() {
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e6 });
  const spots = [
    { x: 220, z: 360, rot: 0 }, { x: 300, z: 360, rot: 0 },
    { x: 100, z: 360, rot: 0 }, { x: -100, z: 0, rot: Math.PI / 2 },
    { x: 0, z: -180, rot: 0 }, { x: 180, z: 90, rot: Math.PI / 2 },
  ];
  for (const spot of spots) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.2), arrowMat);
    shaft.rotation.x = -Math.PI / 2;
    group.add(shaft);
    const head = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), arrowMat);
    head.rotation.x = -Math.PI / 2;
    head.position.z = -1.6;
    group.add(head);
    group.position.set(spot.x, 0.11, spot.z);
    group.rotation.y = spot.rot;
    WORLD.scene.add(group);
  }
}

// Zebra crossings and traffic lights at every second intersection.
function cty_addCrossingsAndLights() {
  const zebraMat = new THREE.MeshBasicMaterial({ color: 0xf4f1e6 });
  for (const x of cty_ROAD_LINES) {
    for (const z of cty_ROAD_LINES) {
      if ((x + z) % 180 !== 0) {
        continue;
      }
      for (let s = -5; s <= 5; s += 2.5) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 12), zebraMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x + s, 0.12, z);
        WORLD.scene.add(stripe);
      }
      cty_addTrafficLight(x + 9, z + 9);
    }
  }
}

// One traffic light pole with a red-amber-green head.
function cty_addTrafficLight(x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
  );
  pole.position.y = 2.2;
  group.add(pole);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.2, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x14161a }),
  );
  head.position.y = 4.6;
  group.add(head);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xff1111, emissiveIntensity: 1.2 }),
  );
  lamp.position.set(0, 4.95, 0.28);
  group.add(lamp);
  group.position.set(x, 0, z);
  WORLD.scene.add(group);
  WORLD.trafficLights.push({ x: x, z: z, state: 'red', timer: taNextRandom() * 8, lamp: lamp });
}

// Parked cars along the kerbs of the main streets.
function cty_addParkedCars() {
  const models = ['ARUNIKA SEDAN', 'KANCIL HATCH', 'MERAK COUPE', 'OMBAK PICKUP'];
  const colours = [0xff7f6b, 0x7fd9b6, 0x36c2c9, 0xffc24a, 0xf4f1e6, 0x8fc3ee];
  for (let i = 0; i < 26; i++) {
    const vertical = taNextRandom() > 0.5;
    const line = pickFromList(cty_ROAD_LINES);
    const t = -400 + taNextRandom() * 800;
    const model = pickFromList(models);
    const mesh = makeCarMesh(model, pickFromList(colours));
    if (vertical) {
      mesh.position.set(line + 5.2, 0, t);
      mesh.rotation.y = taNextRandom() > 0.5 ? 0 : Math.PI;
    } else {
      mesh.position.set(t, 0, line + 5.2);
      mesh.rotation.y = taNextRandom() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    WORLD.scene.add(mesh);
  }
}

// Pantai Boulevard: six lanes, palms every 15 m, beach and sea.
function buildCoastBoulevardAndBeach() {
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 36),
    new THREE.MeshLambertMaterial({ color: 0xf1dca7 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.06, 392);
  WORLD.scene.add(sand);
  for (let x = -440; x <= 440; x += 15) {
    const palmN = makePalmTree();
    palmN.position.set(x, 0, 368.5);
    WORLD.scene.add(palmN);
    const palmS = makePalmTree();
    palmS.position.set(x + 7, 0, 371.5);
    WORLD.scene.add(palmS);
  }
  const umbrellaCols = ['#ff5a3c', '#2ee6c8', '#ffcf3a'];
  for (let i = 0; i < 12; i++) {
    const x = -380 + i * 68 + taNextRandom() * 20;
    const umb = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 1.0, 10),
      new THREE.MeshLambertMaterial({
        map: msh_makeStripeTexture(umbrellaCols[i % 3], '#f4f1e6'),
      }),
    );
    umb.position.set(x, 2.2, 388);
    WORLD.scene.add(umb);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6),
      new THREE.MeshLambertMaterial({ color: 0x55565c }),
    );
    pole.position.set(x, 1.0, 388);
    WORLD.scene.add(pole);
  }
  const pier = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.4, 60),
    new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
  );
  deck.position.y = 0.6;
  pier.add(deck);
  for (let i = 0; i < 6; i++) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 1.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x55565c }),
    );
    leg.position.set(i % 2 === 0 ? -2.5 : 2.5, 0, -25 + i * 10);
    pier.add(leg);
  }
  pier.position.set(-400, 0, 420);
  WORLD.scene.add(pier);
  const lamp1 = makeStreetProps('lamp');
  lamp1.position.set(-40, 0, 368);
  WORLD.scene.add(lamp1);
  const lamp2 = makeStreetProps('lamp');
  lamp2.position.set(120, 0, 368);
  WORLD.scene.add(lamp2);
  const stop = makeStreetProps('busstop');
  stop.position.set(60, 0, 352);
  WORLD.scene.add(stop);
  const bench = makeStreetProps('bench');
  bench.position.set(240, 0, 370);
  WORLD.scene.add(bench);
}

// Bank Arnika plaza: fluted columns, pediment, gold sign, dark paving.
function buildBankArunikaPlaza() {
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 60),
    new THREE.MeshLambertMaterial({ color: 0x3a3340 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(90, 0.09, -60);
  WORLD.scene.add(plaza);
  const pave = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 60),
    new THREE.MeshLambertMaterial({
      map: (function paveTex() {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const g = c.getContext('2d');
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            g.fillStyle = (i + j) % 2 === 0 ? '#3a3340' : '#b06a3a';
            g.fillRect(i * 16, j * 16, 16, 16);
          }
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 5);
        return t;
      })(),
    }),
  );
  pave.rotation.x = -Math.PI / 2;
  pave.position.set(90, 0.11, -60);
  WORLD.scene.add(pave);
  const bank = new THREE.Mesh(
    new THREE.BoxGeometry(46, 22, 18),
    new THREE.MeshLambertMaterial({ color: 0xfff1d6 }),
  );
  bank.position.set(90, 11, -96);
  bank.castShadow = true;
  WORLD.scene.add(bank);
  WORLD.colliders.push({ x0: 67, x1: 113, z0: -105, z1: -87 });
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 20, 12),
      new THREE.MeshLambertMaterial({ color: 0xf4f1e6 }),
    );
    col.position.set(70 + i * 8, 10, -85.5);
    col.castShadow = true;
    WORLD.scene.add(col);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1, 3),
      new THREE.MeshLambertMaterial({ color: 0xcfc8ba }),
    );
    base.position.set(70 + i * 8, 0.5, -85.5);
    WORLD.scene.add(base);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1, 3),
      new THREE.MeshLambertMaterial({ color: 0xcfc8ba }),
    );
    cap.position.set(70 + i * 8, 20.5, -85.5);
    WORLD.scene.add(cap);
  }
  const pediment = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 24, 7, 4, 1),
    new THREE.MeshLambertMaterial({ color: 0xfff1d6 }),
  );
  pediment.rotation.y = Math.PI / 4;
  pediment.scale.set(1, 1, 0.45);
  pediment.position.set(90, 24, -96);
  WORLD.scene.add(pediment);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 4.2),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture('BANK ARUNIKA', '#1c4a2a', '#ffcf3a'),
    }),
  );
  sign.position.set(90, 15, -84.0);
  WORLD.scene.add(sign);
}

// The red market gate over Jalan Pasar and its stalls.
function buildMarketGateAndStalls() {
  const pillarMat = new THREE.MeshLambertMaterial({ color: 0xd93838 });
  const pillarL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 12, 2.4), pillarMat);
  pillarL.position.set(-278, 6, -90);
  WORLD.scene.add(pillarL);
  const pillarR = pillarL.clone();
  pillarR.position.x = -262;
  WORLD.scene.add(pillarR);
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(20, 3, 2.4), pillarMat,
  );
  beam.position.set(-270, 12.5, -90);
  WORLD.scene.add(beam);
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 2.6),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture('PASAR SENJA', '#d93838', '#ffcf3a'),
    }),
  );
  gateSign.position.set(-270, 12.5, -88.6);
  WORLD.scene.add(gateSign);
  const stallCols = ['#ff5a3c', '#2ee6c8', '#ffcf3a', '#f25fa0'];
  for (let i = 0; i < 14; i++) {
    const stall = makeMarketStall(stallCols[i % 4]);
    const side = i % 2 === 0 ? -1 : 1;
    stall.position.set(-270 + side * 10, 0, -150 + Math.floor(i / 2) * 18 + taNextRandom() * 4);
    stall.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    WORLD.scene.add(stall);
  }
  const shopSigns = [
    { name: 'WARUNG BU TINI', x: -200, z: 60 },
    { name: 'BAKSO 88', x: -255, z: -60 },
    { name: 'TOKO EMAS SARI', x: -285, z: -120 },
    { name: 'APOTEK SEHAT', x: -255, z: -150 },
  ];
  for (const s of shopSigns) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 2.2),
      new THREE.MeshBasicMaterial({
        map: makeSignTexture(s.name, '#2a2f3a', '#ffcf3a'),
      }),
    );
    sign.position.set(s.x, 4.5, s.z - 8);
    WORLD.scene.add(sign);
  }
}

// The port: four gantry cranes, container stacks, the moored ship.
function buildPortCranesAndContainers() {
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xf2c230 });
  for (let i = 0; i < 4; i++) {
    const x = -400 + i * 55;
    const crane = new THREE.Group();
    const legL = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), craneMat);
    legL.position.set(-7, 17, 0);
    crane.add(legL);
    const legR = legL.clone();
    legR.position.x = 7;
    crane.add(legR);
    const top = new THREE.Mesh(new THREE.BoxGeometry(20, 3, 4), craneMat);
    top.position.set(0, 34, 0);
    crane.add(top);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 26), craneMat);
    jib.position.set(0, 33, 14);
    crane.add(jib);
    const hook = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 12, 6),
      new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
    );
    hook.position.set(0, 27, 22);
    crane.add(hook);
    crane.position.set(x, 0, 210);
    WORLD.scene.add(crane);
  }
  const contCols = [0xd93838, 0x2ee6c8, 0xffcf3a, 0x36c2c9, 0xff7f6b];
  for (let i = 0; i < 40; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(12, 2.6, 2.6),
      new THREE.MeshLambertMaterial({ color: pickFromList(contCols) }),
    );
    const row = Math.floor(i / 8);
    const col = i % 8;
    box.position.set(-420 + col * 14, 1.3 + (row % 2) * 2.7, 250 + row * 16);
    box.rotation.y = (row % 2) * 0.05;
    WORLD.scene.add(box);
    if (row % 2 === 0) {
      WORLD.colliders.push({
        x0: box.position.x - 6, x1: box.position.x + 6,
        z0: box.position.z - 1.3, z1: box.position.z + 1.3,
      });
    }
  }
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(24, 8, 90),
    new THREE.MeshLambertMaterial({ color: 0x2a4a7a }),
  );
  hull.position.set(-440, 3, 330);
  WORLD.scene.add(hull);
  const shipSign = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 3),
    new THREE.MeshBasicMaterial({
      map: makeSignTexture('MV ARUNIKA JAYA', '#2a4a7a', '#fff1d6'),
    }),
  );
  shipSign.position.set(-427, 5, 330);
  shipSign.rotation.y = Math.PI / 2;
  WORLD.scene.add(shipSign);
}

// The elevated flyover along z = -360 and the red cable-stayed bridge
// to Pulau Abu.
function buildFlyoverAndRedBridge() {
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a8f98 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(900, 1.6, 16), deckMat);
  deck.position.set(0, 12, -360);
  deck.castShadow = true;
  WORLD.scene.add(deck);
  for (let x = -430; x <= 430; x += 45) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(3, 12, 3),
      new THREE.MeshLambertMaterial({ color: 0x6b6f78 }),
    );
    pillar.position.set(x, 6, -360);
    WORLD.scene.add(pillar);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(170, 1.6, 16), deckMat);
  bridge.position.set(535, 12, -360);
  WORLD.scene.add(bridge);
  const pylonMat = new THREE.MeshLambertMaterial({ color: 0xd93838 });
  for (const px of [500, 570]) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(3, 42, 3), pylonMat);
    pylon.position.set(px, 33, -360);
    WORLD.scene.add(pylon);
    for (let c = 0; c < 5; c++) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 34, 4),
        new THREE.MeshLambertMaterial({ color: 0xf4f1e6 }),
      );
      cable.position.set(px - 14 + c * 7, 34, -360);
      cable.rotation.z = 0.5 - c * 0.25;
      WORLD.scene.add(cable);
    }
  }
}

// Ash Island: a disc of rock, the smoking volcano and Vila Naga.
function buildAshIslandVolcano() {
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(130, 145, 6, 28),
    new THREE.MeshLambertMaterial({ color: 0x6b5b53 }),
  );
  island.position.set(620, 1, -360);
  WORLD.scene.add(island);
  const volcano = new THREE.Mesh(
    new THREE.ConeGeometry(55, 70, 20),
    new THREE.MeshLambertMaterial({ color: 0x4a3a34 }),
  );
  volcano.position.set(620, 36, -360);
  volcano.castShadow = true;
  WORLD.scene.add(volcano);
  const crater = new THREE.Mesh(
    new THREE.ConeGeometry(16, 10, 12),
    new THREE.MeshLambertMaterial({ color: 0xff6b2a, emissive: 0xff4400, emissiveIntensity: 1.6 }),
  );
  crater.position.set(620, 68, -360);
  WORLD.scene.add(crater);
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(7 + taNextRandom() * 5, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x55565c, transparent: true, opacity: 0.85 }),
    );
    puff.position.set(620 + (taNextRandom() - 0.5) * 16, 76 + i * 7, -360 + (taNextRandom() - 0.5) * 16);
    WORLD.scene.add(puff);
  }
  const villa = new THREE.Mesh(
    new THREE.BoxGeometry(20, 9, 14),
    new THREE.MeshLambertMaterial({ color: 0xfff1d6 }),
  );
  villa.position.set(580, 4.5, -320);
  WORLD.scene.add(villa);
  const villaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2),
    new THREE.MeshBasicMaterial({ map: makeSignTexture('VILA NAGA', '#4a3a34', '#ffcf3a') }),
  );
  villaSign.position.set(580, 10, -312.8);
  WORLD.scene.add(villaSign);
}

// Push a circle out of every building collider it overlaps.
function collideWithBuildings(x, z, radius) {
  let nx = x;
  let nz = z;
  for (const c of WORLD.colliders) {
    const cx = clampNumber(nx, c.x0, c.x1);
    const cz = clampNumber(nz, c.z0, c.z1);
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * radius;
      nz = cz + (dz / d) * radius;
    } else if (d2 <= 0.0001) {
      nz = c.z1 + radius;
    }
  }
  return { x: nx, z: nz };
}

// The district id containing a map position, or TOL LAYANG by default.
function districtAtPosition(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) {
      return d.id;
    }
  }
  if (z < -270) {
    return 'TOL LAYANG';
  }
  return 'GANG NEON';
}
