// Mesh factory: every vehicle, person and prop is built from geometry
// and canvas textures in code. Cars are SHAPED, never a plain box.

// Cached canvas texture for block lettering on vehicles and signs.
function makeLetteringTexture(text, fg, bg) {
  const key = text + '|' + fg + '|' + (bg || '');
  if (WORLD.letterCache[key]) {
    return WORLD.letterCache[key];
  }
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 64);
  } else {
    g.clearRect(0, 0, 256, 64);
  }
  g.fillStyle = fg;
  g.font = '900 44px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  WORLD.letterCache[key] = tex;
  return tex;
}

// A shop or street sign texture: bold text on a coloured band.
function makeSignTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = fg;
  g.font = '900 52px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Facade texture: coloured wall with a grid of lit and dark windows.
function msh_makeFacadeTexture(colour, floors, cols) {
  const key = colour + floors + 'x' + cols;
  if (WORLD.facadeTextures[key]) {
    return WORLD.facadeTextures[key];
  }
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = colour;
  g.fillRect(0, 0, 128, 256);
  for (let f = 0; f < floors; f++) {
    for (let col = 0; col < cols; col++) {
      const lit = taNextRandom() > 0.45;
      g.fillStyle = lit ? '#ffe9a8' : '#2a3550';
      const wx = 10 + col * ((128 - 20) / cols);
      const wy = 14 + f * ((256 - 24) / floors);
      g.fillRect(wx, wy, 16, 20);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 128, 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  WORLD.facadeTextures[key] = tex;
  return tex;
}

// Striped awning texture for market stalls and shop fronts.
function msh_makeStripeTexture(c1, c2) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 === 0 ? c1 : c2;
    g.fillRect(i * 16, 0, 16, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Shared materials, built once and reused by every mesh.
function msh_materials() {
  if (WORLD._mats) {
    return WORLD._mats;
  }
  const mats = {
    glass: new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
    tyre: new THREE.MeshLambertMaterial({ color: 0x14161a }),
    hub: new THREE.MeshLambertMaterial({ color: 0xc8ccd4 }),
    chrome: new THREE.MeshLambertMaterial({ color: 0xd8dce2 }),
    skin: new THREE.MeshLambertMaterial({ color: 0xc98d64 }),
    hair: new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  };
  WORLD._mats = mats;
  return mats;
}

// One wheel: dark tyre cylinder with a pale hub, turned on its side.
function msh_makeWheel(radius) {
  const mats = msh_materials();
  const group = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, radius * 0.7, 12),
    mats.tyre,
  );
  tyre.rotation.z = Math.PI / 2;
  group.add(tyre);
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, radius * 0.75, 10),
    mats.hub,
  );
  hub.rotation.z = Math.PI / 2;
  group.add(hub);
  return group;
}

// Build a shaped car: lower body, sloped bonnet and boot, glass cabin,
// four visible wheels, glowing lights, bumpers and a number plate.
function makeCarMesh(modelId, colour) {
  const mats = msh_materials();
  const model = (typeof VEHICLE_MODELS !== 'undefined')
    ? VEHICLE_MODELS[modelId] : null;
  const isSports = model && (model.class === 'sports' || model.class === 'super' || model.class === 'tuner');
  const isTruck = model && model.class === 'truck';
  const isTaxi = modelId === 'TAKSI KUNING';
  const bodyMat = new THREE.MeshLambertMaterial({ color: colour });
  const group = new THREE.Group();
  const bodyLen = isTruck ? 7.2 : 4.6;
  const bodyWid = isTruck ? 2.5 : 1.9;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid, 0.62, bodyLen), bodyMat,
  );
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const bonnet = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid * 0.96, 0.22, 1.15), bodyMat,
  );
  bonnet.position.set(0, 0.82, bodyLen * 0.32);
  bonnet.rotation.x = -0.1;
  group.add(bonnet);
  const boot = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid * 0.96, 0.2, 0.95), bodyMat,
  );
  boot.position.set(0, 0.8, -bodyLen * 0.34);
  boot.rotation.x = 0.08;
  group.add(boot);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid * 0.86, 0.55, bodyLen * 0.42), mats.glass,
  );
  cabin.position.set(0, 1.08, -bodyLen * 0.04);
  group.add(cabin);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid * 0.88, 0.08, bodyLen * 0.4), bodyMat,
  );
  roof.position.set(0, 1.38, -bodyLen * 0.04);
  group.add(roof);
  const wheelR = isTruck ? 0.5 : 0.36;
  const wheelPos = [
    [-bodyWid / 2, wheelR, bodyLen * 0.32],
    [bodyWid / 2, wheelR, bodyLen * 0.32],
    [-bodyWid / 2, wheelR, -bodyLen * 0.32],
    [bodyWid / 2, wheelR, -bodyLen * 0.32],
  ];
  for (const wp of wheelPos) {
    const wheel = msh_makeWheel(wheelR);
    wheel.position.set(wp[0], wp[1], wp[2]);
    group.add(wheel);
  }
  const headMat = new THREE.MeshLambertMaterial({
    color: 0xfff2b0, emissive: 0xffedb0, emissiveIntensity: 0.9,
  });
  const tailMat = new THREE.MeshLambertMaterial({
    color: 0xff2a2a, emissive: 0xcc1111, emissiveIntensity: 1.4,
  });
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), headMat);
  headL.position.set(-0.6, 0.62, bodyLen / 2 + 0.02);
  group.add(headL);
  const headR = headL.clone();
  headR.position.x = 0.6;
  group.add(headR);
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), tailMat);
  tailL.position.set(-0.6, 0.62, -bodyLen / 2 - 0.02);
  group.add(tailL);
  const tailR = tailL.clone();
  tailR.position.x = 0.6;
  group.add(tailR);
  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(bodyWid + 0.06, 0.18, 0.12), mats.chrome,
  );
  bumperF.position.set(0, 0.32, bodyLen / 2 + 0.03);
  group.add(bumperF);
  const bumperR = bumperF.clone();
  bumperR.position.z = -bodyLen / 2 - 0.03;
  group.add(bumperR);
  const plateText = modelId === 'PELABUHAN GT' ? 'TA 7 RAKA' : 'TA ' + Math.floor(100 + taNextRandom() * 899);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.22),
    new THREE.MeshBasicMaterial({
      map: makeLetteringTexture(plateText, '#141c2e', '#f4f1e6'),
    }),
  );
  plate.position.set(0, 0.5, -bodyLen / 2 - 0.07);
  plate.rotation.y = Math.PI;
  group.add(plate);
  if (isSports) {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWid * 0.9, 0.07, 0.34), mats.tyre,
    );
    spoiler.position.set(0, 1.05, -bodyLen * 0.44);
    group.add(spoiler);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), mats.tyre);
    strutL.position.set(-0.6, 0.9, -bodyLen * 0.44);
    group.add(strutL);
    const strutR = strutL.clone();
    strutR.position.x = 0.6;
    group.add(strutR);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffcf3a, emissive: 0xaa8800, emissiveIntensity: 0.5 }),
    );
    sign.position.set(0, 1.5, -bodyLen * 0.04);
    group.add(sign);
  }
  if (isTruck) {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWid * 0.95, 0.9, 1.4), bodyMat,
    );
    cab.position.set(0, 1.3, bodyLen * 0.32);
    group.add(cab);
    const windshield = new THREE.Mesh(
      new THREE.PlaneGeometry(bodyWid * 0.8, 0.6), mats.glass,
    );
    windshield.position.set(0, 1.35, bodyLen * 0.32 + 0.72);
    group.add(windshield);
  }
  group.userData.modelId = modelId;
  return group;
}

// A TAPD cruiser: warm white body, blue stripe, light bar, TAPD on both
// front doors, the boot, the bonnet, and the unit number on the roof.
function makePoliceCruiserMesh(unitNumber) {
  const group = makeCarMesh('TAPD CAMAR', 0xf3f1ea);
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0x1f4fb5 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.3, 4.62), stripeMat);
  stripe.position.set(0, 0.62, 0);
  group.add(stripe);
  const barBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.1, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x14161a }),
  );
  barBase.position.set(0, 1.46, -0.18);
  group.add(barBase);
  const redLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.16, 0.26),
    new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff1111, emissiveIntensity: 2.2 }),
  );
  redLight.position.set(-0.28, 1.58, -0.18);
  group.add(redLight);
  const blueLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.16, 0.26),
    new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x1122ff, emissiveIntensity: 2.2 }),
  );
  blueLight.position.set(0.28, 1.58, -0.18);
  group.add(blueLight);
  const doorTex = makeLetteringTexture('TAPD', '#1f4fb5', '');
  const doorMat = new THREE.MeshBasicMaterial({ map: doorTex, transparent: true });
  const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34), doorMat);
  doorL.position.set(-0.97, 0.62, 0.35);
  doorL.rotation.y = -Math.PI / 2;
  group.add(doorL);
  const doorR = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34), doorMat);
  doorR.position.set(0.97, 0.62, 0.35);
  doorR.rotation.y = Math.PI / 2;
  group.add(doorR);
  const bootTex = makeLetteringTexture('TAPD', '#1f4fb5', '');
  const bootMat = new THREE.MeshBasicMaterial({ map: bootTex, transparent: true });
  const bootSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), bootMat);
  bootSign.position.set(0, 0.66, -2.34);
  bootSign.rotation.y = Math.PI;
  group.add(bootSign);
  const bonnetSign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), bootMat);
  bonnetSign.position.set(0, 0.98, 1.15);
  bonnetSign.rotation.x = -Math.PI / 2 + 0.1;
  group.add(bonnetSign);
  const numTex = makeLetteringTexture(String(unitNumber), '#1f4fb5', '');
  const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });
  const roofNum = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.26), numMat);
  roofNum.position.set(0, 1.44, -0.18);
  roofNum.rotation.x = -Math.PI / 2;
  group.add(roofNum);
  group.userData.unitNumber = unitNumber;
  return group;
}

// The BADAK-2 SWAT van: tall dark-blue box, SWAT in white on both sides
// and the rear, BADAK-2 small, rear doors that read as open panels.
function makeSwatVanMesh() {
  const group = new THREE.Group();
  const mats = msh_materials();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2a4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.3, 5.6), bodyMat);
  body.position.y = 1.45;
  body.castShadow = true;
  group.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.2), bodyMat);
  cab.position.set(0, 1.0, 3.1);
  group.add(cab);
  const shield = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.9), mats.glass,
  );
  shield.position.set(0, 1.15, 3.72);
  group.add(shield);
  const wheelPos = [
    [-1.2, 0.5, 2.0], [1.2, 0.5, 2.0], [-1.2, 0.5, -2.0], [1.2, 0.5, -2.0],
  ];
  for (const wp of wheelPos) {
    const wheel = msh_makeWheel(0.5);
    wheel.position.set(wp[0], wp[1], wp[2]);
    group.add(wheel);
  }
  const swatTex = makeLetteringTexture('SWAT', '#ffffff', '');
  const swatMat = new THREE.MeshBasicMaterial({ map: swatTex, transparent: true });
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.66), swatMat);
  sideL.position.set(-1.27, 1.6, -0.3);
  sideL.rotation.y = -Math.PI / 2;
  group.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.66), swatMat);
  sideR.position.set(1.27, 1.6, -0.3);
  sideR.rotation.y = Math.PI / 2;
  group.add(sideR);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.56), swatMat);
  rear.position.set(0, 1.6, -2.84);
  rear.rotation.y = Math.PI;
  group.add(rear);
  const tagTex = makeLetteringTexture('BADAK-2', '#ffffff', '');
  const tagMat = new THREE.MeshBasicMaterial({ map: tagTex, transparent: true });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), tagMat);
  tag.position.set(0, 0.9, -2.84);
  tag.rotation.y = Math.PI;
  group.add(tag);
  const doorL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.9, 1.1), bodyMat,
  );
  doorL.position.set(-0.7, 1.4, -3.3);
  doorL.rotation.y = 0.7;
  group.add(doorL);
  const doorR = doorL.clone();
  doorR.position.x = 0.7;
  doorR.rotation.y = -0.7;
  group.add(doorR);
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.14, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x1122ff, emissiveIntensity: 2.0 }),
  );
  bar.position.set(0, 2.68, 2.6);
  group.add(bar);
  return group;
}

// The ELANG-1 helicopter: body, tail boom, spinning rotor disc, tail
// rotor, TAPD on the tail and a pale searchlight cone with a ground disc.
function makeHelicopterMesh() {
  const group = new THREE.Group();
  const mats = msh_materials();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a4a7a });
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 14, 10), bodyMat,
  );
  body.scale.set(1, 0.85, 1.7);
  body.position.y = 0;
  group.add(body);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 12, 8), mats.glass,
  );
  glass.scale.set(0.9, 0.7, 0.9);
  glass.position.set(0, 0.1, 1.6);
  group.add(glass);
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.5, 4.6, 8), bodyMat,
  );
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.3, -3.4);
  group.add(boom);
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.4), bladeMat);
  rotor.add(blade1);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 9.5), bladeMat);
  rotor.add(blade2);
  rotor.position.y = 1.55;
  group.add(rotor);
  group.userData.rotor = rotor;
  const tailRotor = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.6, 0.3), bladeMat,
  );
  tailRotor.position.set(-0.55, 0.4, -5.4);
  group.add(tailRotor);
  const tailTex = makeLetteringTexture('TAPD', '#ffffff', '');
  const tailMat = new THREE.MeshBasicMaterial({ map: tailTex, transparent: true });
  const tailSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), tailMat);
  tailSign.position.set(0.4, 0.4, -3.4);
  tailSign.rotation.y = Math.PI / 2;
  group.add(tailSign);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 16, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.28,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  cone.position.y = -8;
  cone.rotation.x = Math.PI;
  group.add(cone);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfff6c8, transparent: true, opacity: 0.55,
      depthWrite: false,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -15.8;
  group.add(disc);
  group.userData.searchDisc = disc;
  group.userData.searchCone = cone;
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), mats.tyre);
  skidL.position.set(-0.9, -1.3, 0.4);
  group.add(skidL);
  const skidR = skidL.clone();
  skidR.position.x = 0.9;
  group.add(skidR);
  return group;
}

// A person: head, hair or cap, torso, two arms, two legs; police and SWAT
// variants wear dark blue or black with caps or helmets.
function makePersonMesh(shirt, kind) {
  const mats = msh_materials();
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), mats.skin);
  head.position.y = 1.62;
  group.add(head);
  if (kind === 'police') {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.23, 0.09, 12),
      new THREE.MeshLambertMaterial({ color: 0x1c2a4a }),
    );
    cap.position.y = 1.8;
    group.add(cap);
  } else if (kind === 'swat') {
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    helmet.position.y = 1.64;
    helmet.scale.y = 0.8;
    group.add(helmet);
  } else if (kind === 'raka') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0xf4f1e6 }),
    );
    cap.position.y = 1.78;
    cap.scale.y = 0.6;
    group.add(cap);
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.18),
      new THREE.MeshLambertMaterial({ color: 0xf4f1e6 }),
    );
    brim.position.set(0, 1.74, -0.2);
    group.add(brim);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 12, 8), mats.hair,
    );
    hair.position.y = 1.68;
    hair.scale.y = 0.65;
    group.add(hair);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), shirtMat);
  torso.position.y = 1.15;
  group.add(torso);
  const armMat = kind === 'swat'
    ? new THREE.MeshLambertMaterial({ color: 0x111111 }) : shirtMat;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.16), armMat);
  armL.position.set(-0.34, 1.12, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.34;
  group.add(armR);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.22), legMat);
  legL.position.set(-0.14, 0.36, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  group.add(legR);
  group.userData.armL = armL;
  group.userData.armR = armR;
  group.userData.legL = legL;
  group.userData.legR = legR;
  return group;
}

// A palm tree: curved trunk and a green crown, two meshes only.
function makePalmTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 5.2, 7),
    new THREE.MeshLambertMaterial({ color: 0x9a6b3f }),
  );
  trunk.position.y = 2.6;
  trunk.rotation.z = 0.06;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.9, 0),
    new THREE.MeshLambertMaterial({ color: 0x2f9e58 }),
  );
  crown.position.set(0.3, 5.5, 0);
  crown.scale.y = 0.45;
  crown.castShadow = true;
  group.add(crown);
  return group;
}

// A market stall: counter, striped umbrella cone and crates.
function makeMarketStall(colour) {
  const group = new THREE.Group();
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.9, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
  );
  counter.position.y = 0.45;
  group.add(counter);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x55565c }),
  );
  pole.position.y = 1.6;
  group.add(pole);
  const umbrella = new THREE.Mesh(
    new THREE.ConeGeometry(1.9, 0.8, 10),
    new THREE.MeshLambertMaterial({
      map: msh_makeStripeTexture(colour, '#f4f1e6'),
    }),
  );
  umbrella.position.y = 2.9;
  group.add(umbrella);
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.5, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xc98d64 }),
  );
  crate.position.set(1.6, 0.25, 0.4);
  group.add(crate);
  return group;
}

// Street props: lamp post, bench, hydrant, bus stop shelter, billboard.
function makeStreetProps(kind) {
  const group = new THREE.Group();
  if (kind === 'lamp') {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
    );
    pole.position.y = 2.7;
    group.add(pole);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.1, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
    );
    arm.position.set(0.6, 5.3, 0);
    group.add(arm);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshLambertMaterial({
        color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 0.8,
      }),
    );
    bulb.position.set(1.25, 5.2, 0);
    group.add(bulb);
    WORLD.lamps.push(bulb);
    return group;
  }
  if (kind === 'bench') {
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.1, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
    );
    seat.position.y = 0.5;
    group.add(seat);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.5, 0.08),
      new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
    );
    back.position.set(0, 0.85, -0.22);
    group.add(back);
    return group;
  }
  if (kind === 'hydrant') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8),
      new THREE.MeshLambertMaterial({ color: 0xd93838 }),
    );
    body.position.y = 0.35;
    group.add(body);
    return group;
  }
  if (kind === 'busstop') {
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.1, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x2ee6c8 }),
    );
    roof.position.y = 2.4;
    group.add(roof);
    const postL = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.4, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
    );
    postL.position.set(-1.5, 1.2, 0);
    group.add(postL);
    const postR = postL.clone();
    postR.position.x = 1.5;
    group.add(postR);
    return group;
  }
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2.4, 0.2),
    new THREE.MeshLambertMaterial({
      map: makeSignTexture('TELUK ARUNIKA', '#ff5a3c', '#fff1d6'),
    }),
  );
  board.position.y = 5;
  group.add(board);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 5, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
  );
  legL.position.set(-2, 2.5, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 2;
  group.add(legR);
  return group;
}

// A roadblock barrier: red-and-white striped bar on two feet, plus cone.
function makeRoadblockBarrier() {
  const group = new THREE.Group();
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.3, 0.12),
    new THREE.MeshLambertMaterial({
      map: msh_makeStripeTexture('#d93838', '#f4f1e6'),
    }),
  );
  bar.position.y = 0.85;
  group.add(bar);
  const footL = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.85, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }),
  );
  footL.position.set(-1.5, 0.42, 0);
  group.add(footL);
  const footR = footL.clone();
  footR.position.x = 1.5;
  group.add(footR);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.7, 10),
    new THREE.MeshLambertMaterial({ color: 0xff6b2a }),
  );
  cone.position.set(2.2, 0.35, 0.6);
  group.add(cone);
  return group;
}

// A spike strip: dark mat with steel teeth that bursts tyres.
function msh_makeSpikeStrip() {
  const group = new THREE.Group();
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.06, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x14161a }),
  );
  mat.position.y = 0.04;
  group.add(mat);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 6),
      new THREE.MeshLambertMaterial({ color: 0xc8ccd4 }),
    );
    tooth.position.set(-1.6 + i * 0.46, 0.18, 0);
    group.add(tooth);
  }
  return group;
}
