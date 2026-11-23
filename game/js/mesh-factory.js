// Procedural meshes: cars, police cruiser, SWAT van, helicopter, people, palms, street props, canvas textures, portraits.

function makeCarMesh(modelId, colorHex) {
  const spec = CAR_MODELS[modelId];
  const group = new THREE.Group();
  const batch = createGeometryBatch();
  const L = spec.len, wd = spec.wid;
  if (spec.style === 'truck') addTruckBody(batch, L, wd, colorHex);
  else if (spec.style === 'van') addVanBody(batch, L, wd, colorHex, 1.9);
  else if (spec.style === 'swat') addVanBody(batch, L, wd, colorHex, 2.55);
  else if (spec.style === 'scooter') addScooterBody(batch, L, colorHex);
  else addSaloonBody(batch, L, wd, colorHex, spec.style);
  group.add(batchToMesh(batch, sharedMaterial('flat'), true, true));
  group.add(makeContactShadow(wd + 1.1, L + 1.3));
  group.userData = { model: modelId, door: null, lightbar: null, rearDoors: null, rider: null };
  if (spec.style === 'scooter') {
    const rider = makePersonMesh({ shirt: randPick(PED_SHIRTS), pants: 0x2b3a55, skin: randPick(PED_SKINS), hair: 0x1a1a1a, hat: 'helmet', hatColor: randPick([0xf8f9fa, 0xffd43b, 0xe03131]) });
    rider.position.set(0, 0.42, -0.2);
    posePerson(rider, 'sit', 0);
    rider.children.forEach((c) => { if (c.userData.shadowBlob) c.visible = false; });
    group.add(rider);
    group.userData.rider = rider;
  } else if (spec.style !== 'truck' && spec.style !== 'swat') {
    // The driver's door (right-hand drive) is its own panel so it can swing open during a carjack.
    const door = new THREE.Group();
    const panel = new THREE.Mesh(unitGeometry('box'), new THREE.MeshLambertMaterial({ color: colorHex }));
    panel.scale.set(0.07, 0.5, 1.05);
    panel.position.set(0, 0, -0.52);
    panel.castShadow = true;
    door.add(panel);
    door.position.set(-wd / 2 - 0.02, 0.64, L * 0.13);
    group.add(door);
    group.userData.door = door;
  }
  if (spec.style === 'taxi') {
    const sign = makeSignMesh('TAKSI', 0.9, 0.3, { bg: '#fff7d6', fg: '#1b1b1b', size: 44 });
    sign.position.set(0, 1.62, -0.25);
    group.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    group.add(back);
  }
  if (spec.style === 'swat') addSwatVanDetails(group, L, wd);
  return group;
}

function makePoliceCruiserMesh() {
  const spec = CAR_MODELS.cruiser;
  const group = makeCarMesh('cruiser', spec.colors[0]);
  const L = spec.len, wd = spec.wid;
  for (const side of [-1, 1]) {
    const label = makeSignMesh('TAPD', 2.3, 0.62, { bg: '#1c4fa3', fg: '#ffffff', size: 58, lit: true });
    label.position.set(side * (wd / 2 + 0.035), 0.66, -0.1);
    label.rotation.y = side * Math.PI / 2;
    group.add(label);
  }
  const hood = makeSignMesh('TAPD', 1.5, 0.5, { bg: '#1c4fa3', fg: '#ffffff', size: 50, lit: true });
  hood.rotation.x = -Math.PI / 2;
  hood.rotation.z = Math.PI;
  hood.position.set(0, 0.915, L * 0.33);
  group.add(hood);
  group.userData.lightbar = makeLightBar(group, 1.5, -0.25, wd * 0.62);
  return group;
}

function makeHelicopterMesh() {
  const group = new THREE.Group();
  const b = createGeometryBatch();
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(0, 0, 0.4), new THREE.Quaternion(), new THREE.Vector3(2.5, 2.4, 5.2));
  batchAddGeometry(b, unitGeometry('sphere'), m, 0xf1ede2);
  m.compose(new THREE.Vector3(0, 0.35, 1.9), new THREE.Quaternion(), new THREE.Vector3(2.0, 1.3, 1.9));
  batchAddGeometry(b, unitGeometry('sphere'), m, 0x16202e);
  batchAddBox(b, 0, -0.25, 0.4, 2.56, 0.5, 3.4, 0x1c4fa3, 0);
  batchAddBox(b, 0, 0.25, -4.2, 0.42, 0.5, 5.4, 0xf1ede2, 0);
  batchAddBox(b, 0, 1.0, -6.6, 0.14, 1.7, 0.9, 0x1c4fa3, 0);
  batchAddBox(b, 0, 0.3, -6.3, 1.9, 0.1, 0.6, 0x1c4fa3, 0);
  batchAddBox(b, 0, 1.35, 0.2, 0.3, 0.55, 0.3, 0x30343c, 0);
  for (const s of [-1, 1]) {
    batchAddBox(b, s * 1.05, -1.75, 0.4, 0.14, 0.14, 4.4, 0x30343c, 0);
    batchAddBox(b, s * 0.95, -1.3, 1.5, 0.1, 0.9, 0.1, 0x30343c, 0);
    batchAddBox(b, s * 0.95, -1.3, -0.7, 0.1, 0.9, 0.1, 0x30343c, 0);
  }
  group.add(batchToMesh(b, sharedMaterial('flat'), true, false));
  for (const side of [-1, 1]) {
    const tag = makeSignMesh('ELANG-1', 2.3, 0.5, { bg: '#1c4fa3', fg: '#ffffff', size: 46, lit: true });
    tag.position.set(side * 1.3, -0.25, 0.4);
    tag.rotation.y = side * Math.PI / 2;
    group.add(tag);
  }
  const rotor = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.6, 24), new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  rotor.add(disc);
  const blades = createGeometryBatch();
  batchAddBox(blades, 0, 0, 0, 11.2, 0.06, 0.34, 0x20242c, 0);
  batchAddBox(blades, 0, 0, 0, 0.34, 0.06, 11.2, 0x20242c, 0);
  rotor.add(batchToMesh(blades, sharedMaterial('flat'), true, false));
  rotor.position.set(0, 1.68, 0.2);
  group.add(rotor);
  const tail = new THREE.Mesh(new THREE.CircleGeometry(0.95, 14), new THREE.MeshBasicMaterial({ color: 0x20242c, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  tail.rotation.y = Math.PI / 2;
  tail.position.set(0.2, 1.0, -6.6);
  group.add(tail);
  const lamp = new THREE.Mesh(unitGeometry('sphere'), new THREE.MeshBasicMaterial({ color: 0xfff6c8, toneMapped: false }));
  lamp.scale.setScalar(0.6);
  lamp.position.set(0, -1.25, 1.6);
  group.add(lamp);
  // Searchlight: a translucent cone from the lamp to a bright disc on the ground (aimed every frame).
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1, 1, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6cf, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false }));
  cone.geometry.translate(0, -0.5, 0);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: sharedTexture('glow'), color: 0xfff3bf, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  spot.rotation.x = -Math.PI / 2;
  group.userData = { rotor: rotor, cone: cone, spot: spot, lamp: lamp, lightbar: null };
  return group;
}

function makePersonMesh(look) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const body = createGeometryBatch();
  batchAddBox(body, 0, 1.16, 0, 0.52, 0.62, 0.28, look.shirt, 0);
  batchAddBox(body, 0, 0.9, 0, 0.48, 0.14, 0.27, look.pants, 0);
  batchAddBox(body, 0, 1.5, 0, 0.14, 0.1, 0.14, look.skin, 0);
  batchAddBox(body, 0, 1.68, 0, 0.3, 0.3, 0.3, look.skin, 0);
  if (look.vest) batchAddBox(body, 0, 1.2, 0, 0.56, 0.46, 0.32, look.vest, 0);
  if (look.hat === 'cap') {
    batchAddBox(body, 0, 1.85, 0, 0.32, 0.09, 0.32, look.hatColor, 0);
    batchAddBox(body, 0, 1.82, 0.22, 0.28, 0.035, 0.18, look.hatColor, 0);
  } else if (look.hat === 'helmet') {
    batchAddBox(body, 0, 1.76, -0.01, 0.36, 0.26, 0.37, look.hatColor, 0);
    batchAddBox(body, 0, 1.68, 0.17, 0.26, 0.1, 0.04, 0x16202e, 0);
  } else {
    batchAddBox(body, 0, 1.84, -0.02, 0.32, 0.08, 0.33, look.hair, 0);
    batchAddBox(body, 0, 1.7, -0.14, 0.32, 0.26, 0.06, look.hair, 0);
  }
  if (look.shield) {
    batchAddBox(body, 0.12, 0.95, 0.46, 0.66, 1.2, 0.06, 0x20242c, 0);
    batchAddBox(body, 0.12, 1.36, 0.495, 0.4, 0.14, 0.02, 0x9ad0ff, 0);
  }
  rig.add(batchToMesh(body, sharedMaterial('flat'), true, false));
  const limbs = {};
  for (const side of [-1, 1]) {
    const arm = createGeometryBatch();
    batchAddBox(arm, 0, -0.17, 0, 0.15, 0.34, 0.16, look.sleeve || look.shirt, 0);
    batchAddBox(arm, 0, -0.47, 0, 0.13, 0.28, 0.14, look.skin, 0);
    if (side === -1 && look.weapon) {
      const len = look.weapon === 'pistol' ? 0.26 : look.weapon === 'baton' ? 0.6 : 0.86;
      batchAddBox(arm, 0, -0.6 - len / 2, 0.02, 0.07, len, look.weapon === 'baton' ? 0.07 : 0.12, 0x14161a, 0);
      if (look.weapon === 'rifle' || look.weapon === 'smg') batchAddBox(arm, 0, -0.62, -0.12, 0.07, 0.12, 0.2, 0x14161a, 0);
    }
    const armMesh = batchToMesh(arm, sharedMaterial('flat'), true, false);
    armMesh.position.set(side * 0.335, 1.45, 0);
    rig.add(armMesh);
    const leg = createGeometryBatch();
    batchAddBox(leg, 0, -0.4, 0, 0.2, 0.8, 0.22, look.pants, 0);
    batchAddBox(leg, 0, -0.82, 0.04, 0.2, 0.1, 0.3, look.shoes || 0x24262b, 0);
    const legMesh = batchToMesh(leg, sharedMaterial('flat'), true, false);
    legMesh.position.set(side * 0.125, 0.87, 0);
    rig.add(legMesh);
    limbs[side === -1 ? 'armR' : 'armL'] = armMesh;
    limbs[side === -1 ? 'legR' : 'legL'] = legMesh;
  }
  const blob = makeContactShadow(1.5, 1.5);
  blob.userData.shadowBlob = true;
  group.add(blob);
  group.userData = { rig: rig, armL: limbs.armL, armR: limbs.armR, legL: limbs.legL, legR: limbs.legR, pose: '' };
  return group;
}

function makePalmTree(batch, x, z, height, lean, bend) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const segs = 6;
  let px = x, pz = z, py = 0;
  const dx = Math.sin(bend), dz = Math.cos(bend);
  for (let i = 0; i < segs; i++) {
    const t = i / segs, tilt = lean * (0.3 + t);
    const segH = height / segs, r = 0.5 - t * 0.22;
    e.set(tilt * dz, 0, -tilt * dx);
    q.setFromEuler(e);
    const cx = px + Math.sin(tilt) * dx * segH * 0.5, cz = pz + Math.sin(tilt) * dz * segH * 0.5;
    m.compose(new THREE.Vector3(cx, py + segH * 0.5, cz), q, new THREE.Vector3(r, segH * 1.08, r));
    batchAddGeometry(batch, unitGeometry('cyl6'), m, i % 2 ? 0x8a6a48 : 0x9c7a55);
    px += Math.sin(tilt) * dx * segH; pz += Math.sin(tilt) * dz * segH; py += Math.cos(tilt) * segH;
  }
  const fronds = 9;
  for (let k = 0; k < fronds; k++) {
    const a = (k / fronds) * Math.PI * 2 + bend, len = height * 0.42 * (0.85 + (k % 3) * 0.1);
    const ox = Math.sin(a), oz = Math.cos(a);
    for (let part = 0; part < 2; part++) {
      const pitch = part === 0 ? -0.42 : 0.6;
      const startR = part === 0 ? 0 : len * 0.5 * Math.cos(0.42), startY = part === 0 ? 0 : len * 0.5 * Math.sin(0.42);
      const half = len * 0.25;
      e.set(pitch, a, 0, 'YXZ');
      q.setFromEuler(e);
      const cr = startR + Math.cos(pitch) * half, cy = startY - Math.sin(pitch) * half;
      m.compose(new THREE.Vector3(px + ox * cr, py + cy, pz + oz * cr), q, new THREE.Vector3(part === 0 ? 0.95 : 0.7, 0.07, len * 0.5));
      batchAddGeometry(batch, unitGeometry('box'), m, k % 2 ? 0x2f9e5b : 0x3fb56a);
    }
  }
  m.compose(new THREE.Vector3(px, py - 0.15, pz), new THREE.Quaternion(), new THREE.Vector3(0.9, 0.7, 0.9));
  batchAddGeometry(batch, unitGeometry('sphere'), m, 0x6b4f2e);
}

function posePerson(mesh, pose, phase) {
  const u = mesh.userData, rig = u.rig;
  const s = Math.sin(phase);
  rig.rotation.set(0, 0, 0);
  rig.position.set(0, 0, 0);
  u.armL.rotation.set(0, 0, 0); u.armR.rotation.set(0, 0, 0);
  u.legL.rotation.set(0, 0, 0); u.legR.rotation.set(0, 0, 0);
  if (pose === 'walk') {
    u.legL.rotation.x = s * 0.55; u.legR.rotation.x = -s * 0.55;
    u.armL.rotation.x = -s * 0.45; u.armR.rotation.x = s * 0.45;
  } else if (pose === 'run') {
    rig.rotation.x = 0.2;
    u.legL.rotation.x = s * 1.0; u.legR.rotation.x = -s * 1.0;
    u.armL.rotation.x = -s * 1.0; u.armR.rotation.x = s * 1.0;
  } else if (pose === 'aim' || pose === 'crouch') {
    u.armR.rotation.x = -1.52; u.armL.rotation.x = -1.4; u.armL.rotation.z = -0.55;
    u.legL.rotation.x = -0.25; u.legR.rotation.x = 0.25;
    if (pose === 'crouch') { rig.position.y = -0.42; rig.rotation.x = 0.18; u.legL.rotation.x = -1.35; u.legR.rotation.x = 0.75; }
  } else if (pose === 'hide') {
    rig.position.y = -0.5; rig.rotation.x = 0.3; u.legL.rotation.x = -1.4; u.legR.rotation.x = 0.8;
  } else if (pose === 'fall') {
    rig.rotation.x = -1.0; rig.position.y = 0.25;
    u.armL.rotation.set(-2.2, 0, 0.9); u.armR.rotation.set(-2.4, 0, -0.9);
    u.legL.rotation.x = -0.7; u.legR.rotation.x = 0.3;
  } else if (pose === 'down') {
    rig.rotation.x = -Math.PI / 2; rig.position.set(0, 0.16, 0.8);
    u.armL.rotation.z = 1.2; u.armR.rotation.z = -0.8; u.legL.rotation.x = 0.3;
  } else if (pose === 'dive') {
    rig.rotation.x = 1.15; rig.position.y = 0.45;
    u.armL.rotation.x = -2.7; u.armR.rotation.x = -2.9; u.legL.rotation.x = 0.5; u.legR.rotation.x = -0.2;
  } else if (pose === 'sit') {
    u.legL.rotation.x = -1.35; u.legR.rotation.x = -1.35; u.armL.rotation.x = -1.0; u.armR.rotation.x = -1.0;
  } else if (pose === 'drag') {
    rig.rotation.x = -0.22; u.armL.rotation.x = -1.35; u.armR.rotation.x = -1.2; u.legL.rotation.x = 0.4; u.legR.rotation.x = -0.35;
  } else if (pose === 'baton') {
    rig.rotation.x = 0.2; u.armR.rotation.x = -2.5 + s * 0.3; u.armL.rotation.x = s * 0.9;
    u.legL.rotation.x = s * 1.0; u.legR.rotation.x = -s * 1.0;
  } else if (pose === 'punch') {
    u.armR.rotation.x = -1.5; u.armL.rotation.x = -0.6; u.legL.rotation.x = -0.3; u.legR.rotation.x = 0.3;
  }
  u.pose = pose;
}

function makeSwatVanMesh() {
  return makeCarMesh('badak', CAR_MODELS.badak.colors[0]);
}

function addSwatVanDetails(group, L, wd) {
  for (const side of [-1, 1]) {
    const label = makeSignMesh('SWAT', 2.6, 0.8, { bg: '#1d2f55', fg: '#ffffff', size: 60, lit: true });
    label.position.set(side * (wd / 2 + 0.04), 1.75, -0.7);
    label.rotation.y = side * Math.PI / 2;
    group.add(label);
    const tag = makeSignMesh('BADAK-2', 1.5, 0.34, { bg: '#1d2f55', fg: '#ffd43b', size: 44, lit: true });
    tag.position.set(side * (wd / 2 + 0.04), 1.1, -0.7);
    tag.rotation.y = side * Math.PI / 2;
    group.add(tag);
  }
  const doors = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    const leaf = new THREE.Mesh(unitGeometry('box'), new THREE.MeshLambertMaterial({ color: 0x24396a }));
    leaf.scale.set(wd / 2 - 0.06, 1.7, 0.08);
    leaf.position.set(-side * (wd / 4), 0, 0);
    leaf.castShadow = true;
    hinge.add(leaf);
    hinge.position.set(side * (wd / 2 - 0.03), 1.55, -L / 2 - 0.05);
    group.add(hinge);
    doors.push({ hinge: hinge, side: side });
  }
  group.userData.rearDoors = doors;
  group.userData.lightbar = makeLightBar(group, 2.62, L * 0.2, wd * 0.6);
}

function setSwatDoorsOpen(mesh, open) {
  for (const d of mesh.userData.rearDoors) d.hinge.rotation.y = open ? -d.side * 1.9 : 0;
}

function makeLightBar(group, y, z, width) {
  const base = new THREE.Mesh(unitGeometry('box'), new THREE.MeshLambertMaterial({ color: 0x22252b }));
  base.scale.set(width + 0.1, 0.07, 0.34);
  base.position.set(0, y - 0.05, z);
  group.add(base);
  const parts = [];
  for (const side of [-1, 1]) {
    const color = side < 0 ? 0xff2b2b : 0x2f6bff;
    const lamp = new THREE.Mesh(unitGeometry('box'), new THREE.MeshBasicMaterial({ color: color, toneMapped: false }));
    lamp.scale.set(width / 2 - 0.04, 0.16, 0.28);
    lamp.position.set(side * width / 4, y + 0.06, z);
    group.add(lamp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sharedTexture('glow'), color: color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    glow.scale.set(3.4, 3.4, 1);
    glow.position.set(side * width / 4, y + 0.12, z);
    group.add(glow);
    parts.push({ lamp: lamp, glow: glow, color: new THREE.Color(color) });
  }
  return parts;
}

function flashLightBar(parts, time, on) {
  parts.forEach((part, i) => {
    const bright = on ? ((Math.floor(time * 5) + i) % 2 === 0 ? 1 : 0.5) : 0.12;
    part.lamp.material.color.copy(part.color).multiplyScalar(0.35 + bright * 0.9);
    part.glow.material.opacity = on ? 0.3 + bright * 0.6 : 0;
  });
}

// ---- car bodies -------------------------------------------------------------------------------

function addWheels(batch, wd, zFront, zBack, radius, width) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  for (const z of [zFront, zBack]) {
    for (const side of [-1, 1]) {
      const x = side * (wd / 2 - width * 0.35);
      m.compose(new THREE.Vector3(x, radius, z), q, new THREE.Vector3(radius * 2, width, radius * 2));
      batchAddGeometry(batch, unitGeometry('cyl'), m, 0x17181b);
      m.compose(new THREE.Vector3(x + side * width * 0.3, radius, z), q, new THREE.Vector3(radius * 1.05, width * 0.5, radius * 1.05));
      batchAddGeometry(batch, unitGeometry('cyl'), m, 0xb9bec7);
    }
  }
}

function addCabin(batch, wBase, wTop, yBase, yTop, zRear, zFront, slopeRear, slopeFront, roofColor) {
  const glass = 0x1c2733;
  const a = wBase / 2, t = wTop / 2, zr = zRear + slopeRear, zf = zFront - slopeFront;
  batchAddQuad(batch, [-t, yTop, zr], [-t, yTop, zf], [t, yTop, zf], [t, yTop, zr], roofColor);
  batchAddQuad(batch, [-a, yBase, zFront], [a, yBase, zFront], [t, yTop, zf], [-t, yTop, zf], glass);
  batchAddQuad(batch, [a, yBase, zRear], [-a, yBase, zRear], [-t, yTop, zr], [t, yTop, zr], glass);
  batchAddQuad(batch, [a, yBase, zFront], [a, yBase, zRear], [t, yTop, zr], [t, yTop, zf], glass);
  batchAddQuad(batch, [-a, yBase, zRear], [-a, yBase, zFront], [-t, yTop, zf], [-t, yTop, zr], glass);
  // Roof pillars in the body colour so the glass reads as windows.
  for (const side of [-1, 1]) {
    const mid = (zr + zf) / 2;
    batchAddBox(batch, side * (a + t) / 2, (yBase + yTop) / 2, mid, 0.07, yTop - yBase, 0.12, roofColor, 0);
  }
}

function addSaloonBody(batch, L, wd, color, style) {
  const coupe = style === 'coupe';
  const dark = 0x1d1f24;
  const bodyTop = coupe ? 0.8 : 0.9;
  batchAddBox(batch, 0, (0.3 + bodyTop) / 2, 0, wd, bodyTop - 0.3, L - 0.2, color, 0);
  batchAddBox(batch, 0, bodyTop - 0.11, L / 2 - 0.2, wd - 0.1, 0.2, 0.4, color, 0);
  batchAddBox(batch, 0, bodyTop - 0.11, -L / 2 + 0.2, wd - 0.1, 0.2, 0.4, color, 0);
  if (coupe) addCabin(batch, wd - 0.14, wd - 0.6, bodyTop, 1.2, -L * 0.36, L * 0.06, 0.55, 0.62, color);
  else addCabin(batch, wd - 0.12, wd - 0.46, bodyTop, 1.44, -L * 0.3, L * 0.16, 0.42, 0.56, color);
  batchAddBox(batch, 0, 0.4, L / 2 - 0.04, wd + 0.04, 0.22, 0.2, dark, 0);
  batchAddBox(batch, 0, 0.4, -L / 2 + 0.04, wd + 0.04, 0.22, 0.2, dark, 0);
  batchAddBox(batch, 0, 0.62, L / 2 + 0.01, wd * 0.46, 0.16, 0.06, dark, 0);
  for (const side of [-1, 1]) {
    batchAddBox(batch, side * (wd / 2 - 0.3), bodyTop - 0.2, L / 2 + 0.005, 0.44, 0.15, 0.07, 0xfff3c4, 0);
    batchAddBox(batch, side * (wd / 2 - 0.3), bodyTop - 0.2, -L / 2 - 0.005, 0.44, 0.13, 0.07, 0xd91f26, 0);
    batchAddBox(batch, side * (wd / 2 + 0.07), bodyTop + 0.06, L * 0.12, 0.16, 0.1, 0.12, color, 0);
    batchAddBox(batch, side * (wd / 2 + 0.005), 0.36, 0, 0.04, 0.12, L * 0.5, dark, 0);
  }
  if (coupe) {
    batchAddBox(batch, 0, bodyTop + 0.012, L * 0.28, 0.42, 0.02, L * 0.36, 0xfdf6e3, 0);
    batchAddBox(batch, 0, 1.212, -L * 0.15, 0.42, 0.02, L * 0.16, 0xfdf6e3, 0);
    batchAddBox(batch, 0, 1.06, -L / 2 + 0.16, wd - 0.1, 0.05, 0.3, dark, 0);
    for (const side of [-1, 1]) batchAddBox(batch, side * (wd / 2 - 0.3), 0.94, -L / 2 + 0.18, 0.07, 0.22, 0.1, dark, 0);
    batchAddBox(batch, 0, 0.66, L * 0.36, 0.5, 0.08, 0.5, dark, 0);
  }
  if (style === 'taxi') {
    batchAddBox(batch, 0, 1.52, -0.25, 0.94, 0.16, 0.34, 0x1b1b1b, 0);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) batchAddBox(batch, side * (wd / 2 + 0.008), 0.62, -1.25 + i * 0.5, 0.02, 0.14, 0.25, i % 2 ? 0x1b1b1b : 0xfdf6e3, 0);
  }
  if (style === 'cruiser') {
    for (const side of [-1, 1]) batchAddBox(batch, side * (wd / 2 + 0.008), 0.66, 0, 0.02, 0.2, L - 0.5, 0x1c4fa3, 0);
    batchAddBox(batch, 0, 0.58, L / 2 + 0.16, wd * 0.7, 0.46, 0.08, dark, 0);
    batchAddBox(batch, 0, bodyTop + 0.01, -L * 0.4, wd - 0.2, 0.02, 0.5, 0x1c4fa3, 0);
  }
  addWheels(batch, wd, L * 0.31, -L * 0.31, 0.34, 0.26);
}

function addVanBody(batch, L, wd, color, top) {
  const dark = 0x1d1f24, glass = 0x1c2733;
  batchAddBox(batch, 0, (0.34 + top) / 2, -0.25, wd, top - 0.34, L - 0.7, color, 0);
  batchAddBox(batch, 0, 0.74, L / 2 - 0.4, wd, 0.8, 0.9, color, 0);
  batchAddQuad(batch, [-wd / 2, 1.14, L / 2 + 0.05], [wd / 2, 1.14, L / 2 + 0.05], [wd / 2, top, L / 2 - 0.6], [-wd / 2, top, L / 2 - 0.6], glass);
  for (const side of [-1, 1]) {
    batchAddBox(batch, side * (wd / 2 + 0.01), top - 0.45, L * 0.05, 0.03, 0.5, L * 0.62, top > 2.2 ? 0x16223d : glass, 0);
    batchAddBox(batch, side * (wd / 2 - 0.32), 0.86, L / 2 + 0.055, 0.42, 0.16, 0.06, 0xfff3c4, 0);
    batchAddBox(batch, side * (wd / 2 - 0.25), 0.9, -L / 2 + 0.09, 0.3, 0.3, 0.06, 0xd91f26, 0);
  }
  batchAddBox(batch, 0, 0.44, L / 2 + 0.06, wd + 0.06, 0.26, 0.2, dark, 0);
  batchAddBox(batch, 0, 0.44, -L / 2 + 0.06, wd + 0.06, 0.26, 0.2, dark, 0);
  if (top > 2.2) {
    batchAddBox(batch, 0, 0.8, L / 2 + 0.2, wd * 0.8, 0.7, 0.1, dark, 0);
    batchAddBox(batch, 0, top + 0.05, -0.6, wd * 0.5, 0.1, L * 0.3, 0x16223d, 0);
  }
  addWheels(batch, wd, L * 0.32, -L * 0.3, top > 2.2 ? 0.5 : 0.36, 0.3);
}

function addTruckBody(batch, L, wd, color) {
  const dark = 0x1d1f24;
  batchAddBox(batch, 0, 0.72, 0, wd - 0.3, 0.3, L - 0.2, dark, 0);
  batchAddBox(batch, 0, 1.75, L / 2 - 1.05, wd, 1.9, 1.9, color, 0);
  batchAddBox(batch, 0, 2.2, L / 2 - 0.09, wd - 0.3, 0.75, 0.04, 0x1c2733, 0);
  for (const side of [-1, 1]) {
    batchAddBox(batch, side * (wd / 2 + 0.005), 2.15, L / 2 - 0.9, 0.03, 0.7, 1.0, 0x1c2733, 0);
    batchAddBox(batch, side * (wd / 2 - 0.35), 1.1, L / 2 - 0.08, 0.44, 0.2, 0.06, 0xfff3c4, 0);
    batchAddBox(batch, side * (wd / 2 - 0.3), 1.0, -L / 2 + 0.08, 0.3, 0.2, 0.06, 0xd91f26, 0);
  }
  batchAddBox(batch, 0, 2.2, -1.05, wd, 2.6, L - 2.3, 0xd9d2c0, 0);
  batchAddBox(batch, 0, 2.2, -1.05, wd + 0.04, 0.5, L - 2.4, color, 0);
  batchAddBox(batch, 0, 0.7, L / 2 + 0.05, wd, 0.4, 0.2, dark, 0);
  addWheels(batch, wd, L * 0.33, -L * 0.2, 0.5, 0.34);
  addWheels(batch, wd, L * 0.33, -L * 0.36, 0.5, 0.34);
}

function addScooterBody(batch, L, color) {
  const dark = 0x1d1f24;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  for (const z of [L * 0.36, -L * 0.36]) {
    m.compose(new THREE.Vector3(0, 0.28, z), q, new THREE.Vector3(0.56, 0.14, 0.56));
    batchAddGeometry(batch, unitGeometry('cyl'), m, 0x17181b);
  }
  batchAddBox(batch, 0, 0.5, -0.1, 0.36, 0.3, 1.1, color, 0);
  batchAddBox(batch, 0, 0.74, -0.3, 0.34, 0.12, 0.7, dark, 0);
  batchAddBox(batch, 0, 0.7, L * 0.3, 0.3, 0.75, 0.12, color, 0);
  batchAddBox(batch, 0, 1.08, L * 0.28, 0.66, 0.06, 0.08, dark, 0);
  batchAddBox(batch, 0, 0.95, L * 0.35, 0.16, 0.14, 0.06, 0xfff3c4, 0);
}

// ---- batching helpers -------------------------------------------------------------------------

function createGeometryBatch() {
  return { pos: [], nor: [], col: [], uv: [] };
}

function batchAddGeometry(batch, geometry, matrix, colorHex, uvScaleX, uvScaleY) {
  if (geometry.index && !geometry.userData.flat) geometry.userData.flat = geometry.toNonIndexed();
  const g = geometry.index ? geometry.userData.flat : geometry;
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const nm = SCRATCH.normalMatrix.getNormalMatrix(matrix), v = SCRATCH.v, c = SCRATCH.color.setHex(colorHex);
  const ux = uvScaleX || 0, uy = uvScaleY || 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    batch.pos.push(v.x, v.y, v.z);
    v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
    batch.nor.push(v.x, v.y, v.z);
    batch.col.push(c.r, c.g, c.b);
    batch.uv.push(uv ? uv.getX(i) * ux : 0, uv ? uv.getY(i) * uy : 0);
  }
}

function batchAddBox(batch, x, y, z, sx, sy, sz, colorHex, ry) {
  SCRATCH.q.setFromAxisAngle(SCRATCH.up, ry || 0);
  SCRATCH.m.compose(SCRATCH.p.set(x, y, z), SCRATCH.q, SCRATCH.s.set(sx, sy, sz));
  batchAddGeometry(batch, unitGeometry('box'), SCRATCH.m, colorHex);
}

function batchAddQuad(batch, a, b, c, d, colorHex, uvs) {
  const col = SCRATCH.color.setHex(colorHex);
  const e1 = SCRATCH.v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const e2 = SCRATCH.p.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  const n = SCRATCH.s.crossVectors(e1, e2).normalize();
  const pts = [a, b, c, a, c, d], uvIdx = [0, 1, 2, 0, 2, 3];
  for (let i = 0; i < 6; i++) {
    batch.pos.push(pts[i][0], pts[i][1], pts[i][2]);
    batch.nor.push(n.x, n.y, n.z);
    batch.col.push(col.r, col.g, col.b);
    if (uvs) batch.uv.push(uvs[uvIdx[i]][0], uvs[uvIdx[i]][1]); else batch.uv.push(0.02, 0.02);
  }
}

function batchAddBeam(batch, ax, ay, az, bx, by, bz, thickness, colorHex) {
  const dir = SCRATCH.v.set(bx - ax, by - ay, bz - az);
  const len = dir.length();
  SCRATCH.q.setFromUnitVectors(SCRATCH.up, dir.normalize());
  SCRATCH.m.compose(SCRATCH.p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), SCRATCH.q, SCRATCH.s.set(thickness, len, thickness));
  batchAddGeometry(batch, unitGeometry('box'), SCRATCH.m, colorHex);
}

function batchToGeometry(batch) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(batch.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(batch.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(batch.col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uv, 2));
  return g;
}

function batchToMesh(batch, material, castShadow, receiveShadow) {
  const mesh = new THREE.Mesh(batchToGeometry(batch), material);
  mesh.castShadow = !!castShadow;
  mesh.receiveShadow = !!receiveShadow;
  return mesh;
}

function unitGeometry(name) {
  if (!UNIT_GEOMETRY[name]) {
    if (name === 'box') UNIT_GEOMETRY.box = new THREE.BoxGeometry(1, 1, 1);
    else if (name === 'cyl') UNIT_GEOMETRY.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
    else if (name === 'cyl6') UNIT_GEOMETRY.cyl6 = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
    else if (name === 'cone') UNIT_GEOMETRY.cone = new THREE.ConeGeometry(0.5, 1, 12);
    else UNIT_GEOMETRY[name] = new THREE.IcosahedronGeometry(0.5, 1);
  }
  return UNIT_GEOMETRY[name];
}

function sharedMaterial(name) {
  if (!W.mat[name]) {
    if (name === 'flat') W.mat.flat = new THREE.MeshLambertMaterial({ vertexColors: true });
    else if (name === 'double') W.mat.double = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    else if (name === 'windows') W.mat.windows = new THREE.MeshLambertMaterial({ vertexColors: true, map: sharedTexture('windows') });
    else if (name === 'paint') W.mat.paint = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    else if (name === 'shadow') W.mat.shadow = new THREE.MeshBasicMaterial({ map: sharedTexture('blob'), transparent: true, depthWrite: false, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }
  return W.mat[name];
}

// ---- canvas textures --------------------------------------------------------------------------

function sharedTexture(name) {
  if (W.tex[name]) return W.tex[name];
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (name === 'glow' || name === 'blob') {
    c.width = c.height = 64;
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    if (name === 'glow') { grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { grad.addColorStop(0, 'rgba(0,0,0,0.95)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); }
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  } else if (name === 'windows') {
    // A 4x4 atlas of window cells on a white wall (tinted by vertex colour); a few cells are warmly lit.
    c.width = c.height = 256;
    g.fillStyle = '#f4efe6';
    g.fillRect(0, 0, 256, 256);
    const lit = [1, 6, 8, 15, 10];
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 64;
      g.fillStyle = '#c9c1b3';
      g.fillRect(x + 11, y + 13, 42, 42);
      g.fillStyle = lit.includes(i) ? '#ffd27a' : (i % 3 === 0 ? '#3d5a78' : '#2e4560');
      g.fillRect(x + 14, y + 16, 36, 36);
      g.fillStyle = lit.includes(i) ? '#ffe7ad' : '#6f93b5';
      g.fillRect(x + 14, y + 16, 36, 9);
      g.fillStyle = '#c9c1b3';
      g.fillRect(x + 31, y + 16, 2, 36);
    }
  } else if (name === 'sea') {
    c.width = c.height = 256;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(120,170,190,0.55)';
    g.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = 14 + i * 28, off = (i * 67) % 256;
      g.beginPath();
      for (let x = -40; x <= 300; x += 8) g.lineTo(x, y + Math.sin((x + off) * 0.06) * 4);
      g.setLineDash([60 + (i % 3) * 30, 50]);
      g.lineDashOffset = off;
      g.stroke();
    }
  } else if (name === 'plaza') {
    c.width = c.height = 128;
    g.fillStyle = '#6f6a66';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
      g.fillStyle = (i + k) % 2 ? '#5d5957' : '#7c7570';
      g.fillRect(i * 32 + 1, k * 32 + 1, 30, 30);
    }
    g.strokeStyle = '#a5957c';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, 125, 125);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (name === 'windows' || name === 'sea' || name === 'plaza') { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4; }
  W.tex[name] = tex;
  return tex;
}

function makeSignTexture(text, opts) {
  const c = document.createElement('canvas');
  const lines = String(text).split('|');
  c.width = opts.pxW || 256;
  c.height = opts.pxH || Math.round(c.width * (opts.aspect || 0.3));
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#1b1f2a';
  g.fillRect(0, 0, c.width, c.height);
  if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = Math.max(4, c.height * 0.07); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, c.width - g.lineWidth, c.height - g.lineWidth); }
  g.fillStyle = opts.fg || '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = opts.size || 48;
  g.font = 'italic 900 ' + size + 'px "Arial Black", Arial, Helvetica, sans-serif';
  let widest = 0;
  for (const line of lines) widest = Math.max(widest, g.measureText(line).width);
  const fit = Math.min(1, (c.width * 0.9) / widest, (c.height * 0.86) / (size * lines.length));
  size = size * fit;
  g.font = 'italic 900 ' + size + 'px "Arial Black", Arial, Helvetica, sans-serif';
  lines.forEach((line, i) => g.fillText(line, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + size * 0.04));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeSignMesh(text, width, height, opts) {
  const o = Object.assign({ aspect: height / width }, opts);
  const key = text + '|' + (o.bg || '') + (o.fg || '') + o.aspect.toFixed(2);
  if (!SIGN_CACHE[key]) SIGN_CACHE[key] = makeSignTexture(text, o);
  const material = o.lit ? new THREE.MeshLambertMaterial({ map: SIGN_CACHE[key], emissive: 0xffffff, emissiveMap: SIGN_CACHE[key], emissiveIntensity: 0.25 }) : new THREE.MeshLambertMaterial({ map: SIGN_CACHE[key] });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  return mesh;
}

function makeContactShadow(width, length) {
  const mesh = new THREE.Mesh(SHADOW_PLANE.geo || (SHADOW_PLANE.geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), sharedMaterial('shadow'));
  mesh.scale.set(width, 1, length);
  mesh.position.y = 0.035;
  mesh.renderOrder = 2;
  return mesh;
}

// A small drawn portrait (face, hair, shirt) used by crew cards, chatter and story dialogue.
function makePortraitCanvas(face, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d'), u = size / 64;
  g.fillStyle = face.color;
  g.fillRect(0, 0, size, size);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, size, size * 0.5);
  g.fillStyle = face.shirt;
  g.beginPath(); g.ellipse(32 * u, 68 * u, 27 * u, 22 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = face.skin;
  g.fillRect(27 * u, 40 * u, 10 * u, 10 * u);
  g.beginPath(); g.ellipse(32 * u, 29 * u, 13 * u, 15.5 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = face.hair;
  g.beginPath(); g.ellipse(32 * u, 19 * u, 14.5 * u, 10 * u, 0, Math.PI, Math.PI * 2); g.fill();
  g.fillRect(17.5 * u, 18 * u, 4 * u, 12 * u);
  g.fillRect(42.5 * u, 18 * u, 4 * u, 12 * u);
  if (face.name === 'SARI') { g.fillRect(15 * u, 20 * u, 5 * u, 30 * u); g.fillRect(44 * u, 20 * u, 5 * u, 30 * u); }
  if (face.name === 'RAKA') { g.fillStyle = '#0f8f7f'; g.fillRect(17 * u, 12 * u, 30 * u, 8 * u); g.fillRect(30 * u, 17 * u, 22 * u, 4 * u); }
  if (face.name === 'DARMA WIJAYA' || face.name === 'PAK AMIR') { g.fillStyle = face.hair; g.fillRect(25 * u, 37 * u, 14 * u, 3 * u); }
  if (face.name === 'AGUS') { g.strokeStyle = '#111'; g.lineWidth = 1.6 * u; g.strokeRect(22 * u, 26 * u, 8 * u, 6 * u); g.strokeRect(34 * u, 26 * u, 8 * u, 6 * u); }
  g.fillStyle = '#1b1b1b';
  g.fillRect(25 * u, 28 * u, 3 * u, 3 * u);
  g.fillRect(36 * u, 28 * u, 3 * u, 3 * u);
  g.fillRect(28 * u, 37.5 * u, 8 * u, 1.6 * u);
  return c;
}

// ---- street props (all merged into a district batch) --------------------------------------------

function addStreetLamp(batch, x, z, ry) {
  const dx = Math.sin(ry), dz = Math.cos(ry);
  batchAddBox(batch, x, 3.6, z, 0.18, 7.2, 0.18, 0x3c4a52, 0);
  batchAddBox(batch, x, 0.3, z, 0.4, 0.6, 0.4, 0x2f3a41, 0);
  batchAddBox(batch, x + dx * 1.0, 7.1, z + dz * 1.0, 0.14, 0.14, 2.1, 0x3c4a52, ry);
  batchAddBox(batch, x + dx * 1.9, 7.0, z + dz * 1.9, 0.5, 0.16, 0.9, 0xfff0b8, ry);
}

function addBench(batch, x, z, ry) {
  batchAddBox(batch, x, 0.6, z, 1.8, 0.08, 0.5, 0x9b6b43, ry);
  batchAddBox(batch, x - Math.sin(ry) * 0.24, 0.95, z - Math.cos(ry) * 0.24, 1.8, 0.5, 0.07, 0x9b6b43, ry);
  batchAddBox(batch, x, 0.36, z, 1.6, 0.42, 0.34, 0x3c4a52, ry);
}

function addHydrantBinPlanter(batch, kind, x, z) {
  const m = SCRATCH.m;
  if (kind === 'hydrant') {
    m.compose(SCRATCH.p.set(x, 0.5, z), SCRATCH.q.identity(), SCRATCH.s.set(0.34, 0.7, 0.34));
    batchAddGeometry(batch, unitGeometry('cyl'), m, 0xd6332a);
    batchAddBox(batch, x, 0.6, z, 0.56, 0.14, 0.14, 0xd6332a, 0);
  } else if (kind === 'bin') {
    m.compose(SCRATCH.p.set(x, 0.62, z), SCRATCH.q.identity(), SCRATCH.s.set(0.6, 0.95, 0.6));
    batchAddGeometry(batch, unitGeometry('cyl'), m, 0x2b8a5a);
    batchAddBox(batch, x, 1.12, z, 0.66, 0.06, 0.66, 0x1f2a30, 0);
  } else {
    batchAddBox(batch, x, 0.5, z, 1.5, 0.7, 1.5, 0xcbb9a0, 0);
    m.compose(SCRATCH.p.set(x, 1.3, z), SCRATCH.q.identity(), SCRATCH.s.set(1.8, 1.5, 1.8));
    batchAddGeometry(batch, unitGeometry('sphere'), m, 0x3fa35c);
    m.compose(SCRATCH.p.set(x + 0.4, 1.75, z - 0.2), SCRATCH.q.identity(), SCRATCH.s.set(0.7, 0.6, 0.7));
    batchAddGeometry(batch, unitGeometry('sphere'), m, 0xf06595);
  }
}

function addBusStop(batch, x, z, ry) {
  const dx = Math.sin(ry), dz = Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  for (const s of [-1.7, 1.7]) batchAddBox(batch, x + sx * s - dx * 0.7, 1.4, z + sz * s - dz * 0.7, 0.12, 2.5, 0.12, 0x3c4a52, 0);
  batchAddBox(batch, x - dx * 0.1, 2.72, z - dz * 0.1, 3.9, 0.14, 1.8, 0x1aa7a1, ry);
  batchAddBox(batch, x - dx * 0.74, 1.5, z - dz * 0.74, 3.4, 1.7, 0.06, 0x9fd3e6, ry);
  batchAddBox(batch, x - dx * 0.4, 0.6, z - dz * 0.4, 2.8, 0.1, 0.45, 0xe9a23b, ry);
  batchAddBox(batch, x + sx * 2.3, 1.5, z + sz * 2.3, 0.1, 2.7, 0.1, 0x3c4a52, 0);
  batchAddBox(batch, x + sx * 2.3, 2.7, z + sz * 2.3, 0.7, 0.7, 0.08, 0x1c4fa3, ry);
}

function addBeachUmbrella(batch, x, z, colorHex, y) {
  const base = y || 0;
  batchAddBox(batch, x, base + 1.2, z, 0.09, 2.4, 0.09, 0xf1ede2, 0);
  const m = SCRATCH.m;
  m.compose(SCRATCH.p.set(x, base + 2.5, z), SCRATCH.q.identity(), SCRATCH.s.set(3.4, 0.8, 3.4));
  batchAddGeometry(batch, unitGeometry('cone'), m, colorHex);
  m.compose(SCRATCH.p.set(x, base + 2.76, z), SCRATCH.q.identity(), SCRATCH.s.set(1.5, 0.36, 1.5));
  batchAddGeometry(batch, unitGeometry('cone'), m, 0xfdf6e3);
  batchAddBox(batch, x + 0.9, base + 0.28, z + 0.4, 0.7, 0.12, 1.9, 0xfdf6e3, 0.3);
}

function addMarketStall(batch, x, z, ry, colorHex) {
  const dx = Math.sin(ry), dz = Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
  batchAddBox(batch, x, 0.5, z, 3.0, 1.0, 1.3, 0xa9764a, ry);
  for (const a of [-1.45, 1.45]) for (const b of [-0.6, 0.6]) batchAddBox(batch, x + sx * a + dx * b, 1.4, z + sz * a + dz * b, 0.09, 2.8, 0.09, 0x6b4a2f, 0);
  for (let i = 0; i < 6; i++) {
    const off = -1.375 + i * 0.55;
    batchAddBox(batch, x + sx * off + dx * 0.25, 2.85, z + sz * off + dz * 0.25, 0.55, 0.1, 2.3, i % 2 ? 0xfdf6e3 : colorHex, ry);
  }
  const fruit = [0xff922b, 0xe03131, 0x94d82d, 0xffd43b];
  for (let i = 0; i < 4; i++) {
    const off = -1.05 + i * 0.7;
    batchAddBox(batch, x + sx * off + dx * 0.1, 1.12, z + sz * off + dz * 0.1, 0.56, 0.24, 0.8, fruit[i], ry);
  }
}

function addShippingContainer(batch, x, y, z, ry, colorHex) {
  batchAddBox(batch, x, y + 1.3, z, 2.44, 2.6, 6.06, colorHex, ry);
  const dx = Math.sin(ry), dz = Math.cos(ry);
  batchAddBox(batch, x + dx * 3.04, y + 1.3, z + dz * 3.04, 2.2, 2.3, 0.04, 0x2b2f36, ry);
  for (let i = -2; i <= 2; i++) batchAddBox(batch, x + dx * i * 1.1, y + 1.3, z + dz * i * 1.1, 2.5, 2.3, 0.08, shadeColor(colorHex, 0.8), ry);
}

function shadeColor(colorHex, factor) {
  const r = Math.min(255, Math.round(((colorHex >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((colorHex >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((colorHex & 255) * factor));
  return (r << 16) | (g << 8) | b;
}

const UNIT_GEOMETRY = {};
const SIGN_CACHE = {};
const SHADOW_PLANE = { geo: null };
const SCRATCH = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), v: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), color: new THREE.Color(), normalMatrix: new THREE.Matrix3() };
const PED_SHIRTS = [0xff6b6b, 0xffd43b, 0x4dabf7, 0x69db7c, 0xf783ac, 0xffa94d, 0xb197fc, 0xf8f9fa, 0x38d9a9, 0xe8590c];
const PED_PANTS = [0x2b3a55, 0x3d3d45, 0x6b4f3a, 0x1f4e79, 0x555b66, 0xd9c8a9];
const PED_SKINS = [0xc68e63, 0xa8754c, 0xd6a57c, 0x8d5a3a, 0xe0b48c];
const PED_HAIR = [0x1a120d, 0x2a1b14, 0x3b2a20, 0x111111, 0x5a3d28];
const PERSON_LOOKS = {
  raka: { shirt: 0x12b5a0, pants: 0x27344d, skin: 0xc68e63, hair: 0x1a120d, hat: 'cap', hatColor: 0x0f8f7f, shoes: 0xf1ede2 },
  cop: { shirt: 0x1b2f5c, pants: 0x162446, skin: 0xb98a63, hair: 0x111111, hat: 'cap', hatColor: 0x162446, weapon: 'baton' },
  swat: { shirt: 0x15171c, pants: 0x15171c, skin: 0xb98a63, hair: 0x111111, hat: 'helmet', hatColor: 0x1d2026, vest: 0x2a2e36, weapon: 'rifle' },
  guard: { shirt: 0x8c929c, pants: 0x4a4f58, skin: 0xb98a63, hair: 0x111111, hat: 'cap', hatColor: 0x4a4f58, weapon: 'pistol' },
  thug: { shirt: 0x7a1f2b, pants: 0x1f1f24, skin: 0xa8754c, hair: 0x111111, hat: null, weapon: 'smg' }
};
