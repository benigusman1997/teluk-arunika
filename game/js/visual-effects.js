// Visual effects: explosions, tyre smoke, muzzle flashes, tracers,
// hit markers, sparks, objective beacons and skid marks.

// Live effects list: each has a mesh, a kind and a time to live.
function updateEffects(dt) {
  for (let i = WORLD.effects.length - 1; i >= 0; i--) {
    const fx = WORLD.effects[i];
    fx.ttl -= dt;
    if (fx.kind === 'explosion') {
      const grow = 1 + (fx.maxTtl - fx.ttl) * 3;
      fx.mesh.scale.set(grow, grow * 0.8, grow);
      fx.mesh.position.y = 1 + (fx.maxTtl - fx.ttl) * 1.2;
    }
    if (fx.kind === 'smoke') {
      fx.mesh.position.y += dt * 2.5;
      fx.mesh.scale.multiplyScalar(1 + dt * 0.7);
      fx.mesh.material.opacity = Math.max(0, fx.ttl / fx.maxTtl) * 0.7;
    }
    if (fx.kind === 'flash') {
      fx.mesh.material.opacity = Math.max(0, fx.ttl / fx.maxTtl);
    }
    if (fx.kind === 'marker') {
      fx.mesh.position.y += dt * 1.5;
    }
    if (fx.ttl <= 0) {
      WORLD.scene.remove(fx.mesh);
      WORLD.effects.splice(i, 1);
    }
  }
  vfx_tickBeacons(dt);
}

// A big explosion: expanding fireball, dark smoke column, debris.
function spawnExplosion(x, z) {
  const fire = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 14, 10),
    new THREE.MeshLambertMaterial({
      color: 0xff6b2a, emissive: 0xff4400, emissiveIntensity: 2.4,
      transparent: true, opacity: 0.95,
    }),
  );
  fire.position.set(x, 1.2, z);
  WORLD.scene.add(fire);
  WORLD.effects.push({ kind: 'explosion', mesh: fire, ttl: 0.9, maxTtl: 0.9 });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 + taNextRandom(), 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.7 }),
    );
    puff.position.set(x + (taNextRandom() - 0.5) * 3, 2 + i * 1.6, z + (taNextRandom() - 0.5) * 3);
    WORLD.scene.add(puff);
    WORLD.effects.push({ kind: 'smoke', mesh: puff, ttl: 2.4, maxTtl: 2.4 });
  }
  for (let i = 0; i < 8; i++) {
    spawnSparks(x + (taNextRandom() - 0.5) * 4, z + (taNextRandom() - 0.5) * 4);
  }
  if (typeof shakeCamera === 'function') {
    shakeCamera(0.9, 0.6);
  }
  if (typeof playExplosionSound === 'function') {
    playExplosionSound();
  }
}

// Grey tyre smoke puff at a car's rear wheels.
function spawnTyreSmoke(x, z) {
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.55 }),
  );
  puff.position.set(x + (taNextRandom() - 0.5), 0.5, z + (taNextRandom() - 0.5));
  WORLD.scene.add(puff);
  WORLD.effects.push({ kind: 'smoke', mesh: puff, ttl: 1.2, maxTtl: 1.2 });
}

// A bright star-shaped muzzle flash and a yellow tracer line.
function spawnMuzzleFlashAndTracer(x, z, heading) {
  const flash = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 1 }),
  );
  flash.position.set(x + Math.sin(heading) * 1.2, 1.4, z + Math.cos(heading) * 1.2);
  flash.lookAt(WORLD.camera.position);
  WORLD.scene.add(flash);
  WORLD.effects.push({ kind: 'flash', mesh: flash, ttl: 0.08, maxTtl: 0.08 });
  const endX = x + Math.sin(heading) * 30;
  const endZ = z + Math.cos(heading) * 30;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    x, 1.4, z, endX, 1.4, endZ,
  ]), 3));
  const tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0xffdf5a, transparent: true, opacity: 0.9,
  }));
  WORLD.scene.add(tracer);
  WORLD.effects.push({ kind: 'flash', mesh: tracer, ttl: 0.12, maxTtl: 0.12 });
}

// A floating white hit marker with a damage number.
function spawnHitMarker(x, z, damage) {
  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({
      map: makeLetteringTexture('+' + damage, '#ffffff', ''),
      transparent: true,
    }),
  );
  marker.position.set(x, 2.2, z);
  marker.lookAt(WORLD.camera.position);
  WORLD.scene.add(marker);
  WORLD.effects.push({ kind: 'marker', mesh: marker, ttl: 0.9, maxTtl: 0.9 });
}

// A burst of orange sparks where metal hits metal.
function spawnSparks(x, z) {
  for (let i = 0; i < 5; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xffc24a }),
    );
    spark.position.set(x + (taNextRandom() - 0.5), 0.8 + taNextRandom(), z + (taNextRandom() - 0.5));
    WORLD.scene.add(spark);
    WORLD.effects.push({ kind: 'flash', mesh: spark, ttl: 0.3, maxTtl: 0.3 });
  }
}

// A tall translucent yellow objective beacon, pulsing slowly.
function spawnObjectiveBeacon(x, z) {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffcf3a, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beacon.position.set(x, 30, z);
  WORLD.scene.add(beacon);
  WORLD._beacon = beacon;
  return beacon;
}

// Pulse the beacon and remove it when the objective moves.
function vfx_tickBeacons(dt) {
  if (!WORLD._beacon) {
    return;
  }
  WORLD._beacon.material.opacity = 0.22 + Math.sin(performance.now() / 300) * 0.1;
}

// A dark skid mark left on the asphalt by a drifting car.
function spawnSkidMark(x, z, heading) {
  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x14161a, transparent: true, opacity: 0.65 }),
  );
  mark.rotation.x = -Math.PI / 2;
  mark.rotation.z = -heading;
  mark.position.set(x - Math.sin(heading) * 1.5, 0.13, z - Math.cos(heading) * 1.5);
  WORLD.scene.add(mark);
  WORLD.effects.push({ kind: 'skid', mesh: mark, ttl: 14, maxTtl: 14 });
}
