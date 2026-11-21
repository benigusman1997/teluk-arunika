/* TELUK ARUNIKA — police.js: wanted 1-5, eskalasi taktik, roadblock, spike strip, ELANG-1 */
(function () {
  'use strict';
  var TA = window.TA;

  var UNIT_NAMES = {
    foot: ['PATROLI-01', 'PATROLI-02', 'PATROLI-05', 'PATROLI-11'],
    car: ['PATROLI-07', 'PATROLI-09', 'PATROLI-12', 'PATROLI-21', 'PATROLI-33'],
    block: ['BLOKIR-03', 'BLOKIR-08'],
    heli: ['ELANG-1']
  };
  var CAR_TACTICS = ['RAMMING', 'PIT', 'FLANKING', 'BOX IN', 'PURSUIT'];

  TA.police = {
    units: [], // {kind, name, tactic, mesh, x, z, speed, cooldown}
    roadblocks: [],
    spikes: [],
    helicopter: null,
    heliActive: false,
    chaseTimer: 0,

    init: function () { this.units = []; this.roadblocks = []; this.spikes = []; this.helicopter = null; this.heliActive = false; this.heliLocked = false; },
    reset: function () {
      for (var i = 0; i < this.units.length; i++) if (this.units[i].mesh) TA.scene.remove(this.units[i].mesh);
      for (var j = 0; j < this.roadblocks.length; j++) TA.scene.remove(this.roadblocks[j].mesh);
      for (var k = 0; k < this.spikes.length; k++) TA.scene.remove(this.spikes[k].mesh);
      if (this.helicopter) TA.scene.remove(this.helicopter.group);
      this.init();
    },

    setWanted: function (n, reason) {
      var s = TA.state;
      var old = s.wanted;
      s.wanted = TA.clamp(Math.round(n), 0, 5);
      s.wantedHeat = s.wanted > 0 ? 100 : 0;
      if (s.wanted > old) {
        this.escalatePolice();
        if (s.wanted >= 3) TA.crew.showCrewChatter('SARI', 'Wanted naik ke ' + s.wanted + ' bintang! Cari jalan tikus!');
        else if (s.wanted >= 2) TA.crew.showCrewChatter('AGUS', 'Polisi mulai memperhatikanmu. Jangan panik.');
      }
      if (s.wanted === 0 && old > 0) {
        s.stats.wantedEscapes++;
        if (old >= 4) TA.career.addXP(25, 'selamat dari wanted 4+');
        TA.crew.showCrewChatter('AGUS', 'Bersih. Mereka kehilangan jejakmu.');
      }
      return s.wanted;
    },

    escalatePolice: function () {
      var s = TA.state;
      var w = s.wanted;
      // Level 1: patroli jalan kaki
      if (w >= 1) this.ensureUnits('foot', 2);
      // Level 2: mobil patroli
      if (w >= 2) this.ensureUnits('car', 2);
      // Level 3: roadblock
      if (w >= 3) {
        this.ensureUnits('car', 3);
        if (this.roadblocks.length === 0) this.spawnRoadblock(TA.player.x + 20, TA.player.z + 10);
      }
      // Level 4: PIT + spike strip
      if (w >= 4) {
        this.ensureUnits('car', 4);
        if (this.spikes.length === 0) this.deploySpikeStrip(TA.player.x + 12, TA.player.z - 6);
      }
      // Level 5: ELANG-1
      if (w >= 5) this.activateHelicopter();
      this.refreshTactics();
    },

    ensureUnits: function (kind, count) {
      var have = 0;
      for (var i = 0; i < this.units.length; i++) if (this.units[i].kind === kind) have++;
      for (var n = have; n < count; n++) this.spawnUnit(kind);
    },

    spawnUnit: function (kind) {
      var pool = UNIT_NAMES[kind] || UNIT_NAMES.foot;
      var name = pool[this.units.length % pool.length];
      var p = TA.player;
      var ang = TA.rand(0, Math.PI * 2);
      var d = TA.rand(25, 45);
      var x = p.x + Math.sin(ang) * d, z = p.z + Math.cos(ang) * d;
      var mesh;
      if (kind === 'car') mesh = TA.player.makeCarMesh(0x1a2a44, 1);
      else mesh = TA.player.makePedMesh(0x1a2a44);
      mesh.position.set(x, 0, z);
      TA.scene.add(mesh);
      var unit = {
        kind: kind, name: name, tactic: kind === 'car' ? TA.pick(CAR_TACTICS) : 'FOOT CHASE',
        mesh: mesh, x: x, z: z, speed: kind === 'car' ? TA.rand(16, 22) : 4.5,
        ramCooldown: 0, lightPhase: TA.rand(0, 1)
      };
      this.units.push(unit);
      return unit;
    },

    spawnRoadblock: function (x, z) {
      var group = new THREE.Group();
      for (var i = -1; i <= 1; i++) {
        var bar = TA.world.box(3.2, 1.1, 0.5, 0xc94f2f, { emissive: 0x661100, emissiveIntensity: 0.7 });
        bar.position.set(i * 3.4, 0.55, 0);
        group.add(bar);
        var stripe = TA.world.box(3.2, 0.3, 0.52, 0xffffff, { emissive: 0x888888, emissiveIntensity: 0.4 });
        stripe.position.set(i * 3.4, 0.9, 0);
        group.add(stripe);
      }
      group.position.set(x, 0, z);
      TA.scene.add(group);
      TA.world.colliders.push({ x: x, z: z, hw: 5.4, hd: 0.8 });
      var rb = { mesh: group, x: x, z: z, name: UNIT_NAMES.block[this.roadblocks.length % UNIT_NAMES.block.length], tactic: 'ROADBLOCK' };
      this.roadblocks.push(rb);
      return rb;
    },

    deploySpikeStrip: function (x, z) {
      var strip = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 }));
      strip.position.set(x, 0.08, z);
      TA.scene.add(strip);
      // Paku-paku kecil
      for (var i = 0; i < 8; i++) {
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 }));
        spike.position.set(x - 2.6 + i * 0.75, 0.3, z);
        TA.scene.add(spike);
      }
      var s = { mesh: strip, x: x, z: z, triggered: false };
      this.spikes.push(s);
      return s;
    },

    policeHelicopter: function () { return this.helicopter; },

    activateHelicopter: function () {
      if (this.heliActive) return;
      this.heliActive = true;
      var group = new THREE.Group();
      var body = TA.world.box(4.5, 1.6, 2.2, 0x223344, { roughness: 0.4, metalness: 0.5 });
      body.position.y = 0; group.add(body);
      var tail = TA.world.box(4, 0.7, 0.7, 0x223344);
      tail.position.set(-4, 0.3, 0); group.add(tail);
      var rotor = TA.world.box(9, 0.12, 0.5, 0x111111);
      rotor.position.y = 1.1; group.add(rotor);
      group.userData.rotor = rotor;
      var spot = new THREE.SpotLight(0xfff2b0, 60, 90, 0.35, 0.4, 1.2);
      spot.position.set(0, -0.5, 0);
      group.add(spot);
      group.add(spot.target);
      group.userData.spot = spot;
      var p = TA.player;
      group.position.set(p.x + 20, 32, p.z + 10);
      TA.scene.add(group);
      this.helicopter = { group: group, name: 'ELANG-1', tactic: 'SPOTLIGHT', angle: 0, x: p.x + 20, z: p.z + 10 };
      var label = document.getElementById('heli-label');
      if (label) label.classList.remove('hidden');
      TA.crew.showCrewChatter('AGUS', 'ELANG-1 di udara. Spotlight mereka mengunci posisimu!');
    },

    deactivateHelicopter: function () {
      if (!this.heliActive) return;
      this.heliActive = false;
      if (this.helicopter) { TA.scene.remove(this.helicopter.group); this.helicopter = null; }
      var label = document.getElementById('heli-label');
      if (label) label.classList.add('hidden');
    },

    updateHelicopter: function (dt) {
      if (!this.heliActive || !this.helicopter) return;
      var h = this.helicopter;
      var p = TA.player;
      h.angle += dt * 0.5;
      var tx = p.x + Math.sin(h.angle) * 20;
      var tz = p.z + Math.cos(h.angle) * 20;
      h.x += (tx - h.x) * Math.min(1, dt * 2);
      h.z += (tz - h.z) * Math.min(1, dt * 2);
      h.group.position.set(h.x, 26 + Math.sin(TA.time.elapsed * 1.3) * 1.5, h.z);
      h.group.rotation.y = Math.atan2(p.x - h.x, p.z - h.z);
      h.group.userData.rotor.rotation.y += dt * 18;
      var spot = h.group.userData.spot;
      spot.target.position.set(p.x - h.x, -26, p.z - h.z);
      spot.target.updateMatrixWorld();
    },

    getDispatchUnits: function () {
      var out = [];
      var p = TA.player;
      if (this.heliActive && this.helicopter) {
        out.push({ name: 'ELANG-1', type: 'AIR', tactic: 'SPOTLIGHT', dist: Math.round(TA.dist2d(p.x, p.z, this.helicopter.x, this.helicopter.z)) });
      }
      for (var i = 0; i < this.units.length; i++) {
        var u = this.units[i];
        out.push({
          name: u.name, type: u.kind === 'car' ? 'MOBIL' : 'JALAN KAKI',
          tactic: u.tactic, dist: Math.round(TA.dist2d(p.x, p.z, u.x, u.z))
        });
      }
      for (var j = 0; j < this.roadblocks.length; j++) {
        var rb = this.roadblocks[j];
        out.push({ name: rb.name, type: 'BLOKIR', tactic: 'ROADBLOCK', dist: Math.round(TA.dist2d(p.x, p.z, rb.x, rb.z)) });
      }
      out.sort(function (a, b) { return a.dist - b.dist; });
      return out;
    },

    nearestUnitDist: function () {
      var p = TA.player, best = 9999;
      for (var i = 0; i < this.units.length; i++) {
        var d = TA.dist2d(p.x, p.z, this.units[i].x, this.units[i].z);
        if (d < best) best = d;
      }
      return best;
    },

    refreshTactics: function () {
      var w = TA.state.wanted;
      for (var i = 0; i < this.units.length; i++) {
        var u = this.units[i];
        if (u.kind !== 'car') continue;
        if (w >= 4) u.tactic = TA.pick(['PIT', 'RAMMING', 'BOX IN']);
        else if (w >= 3) u.tactic = TA.pick(['FLANKING', 'PURSUIT', 'RAMMING']);
        else u.tactic = 'PURSUIT';
      }
    },

    cooldownWanted: function (dt) {
      var s = TA.state;
      if (s.wanted <= 0) return;
      var bonus = TA.crew.getCrewBonus();
      var rate = 6 * bonus.wantedCooldownMul; // panas turun per detik saat sembunyi
      var near = this.nearestUnitDist();
      var inSafehouse = TA.dist2d(TA.player.x, TA.player.z, TA.world.safehouse.x, TA.world.safehouse.z) < 7;
      if (near > 35 || inSafehouse) {
        s.wantedHeat -= rate * dt;
        if (s.wantedHeat <= 0) {
          s.wantedHeat = 100;
          this.setWanted(s.wanted - 1, 'cooldown');
        }
      } else {
        s.wantedHeat = Math.min(100, s.wantedHeat + dt * 2);
      }
    },

    update: function (dt) {
      var s = TA.state;
      var p = TA.player;
      this.chaseTimer += dt;
      // Unit bergerak mengejar
      for (var i = 0; i < this.units.length; i++) {
        var u = this.units[i];
        if (s.wanted <= 0) {
          // Patroli santai: kembali menjauh
          u.x += Math.sin(u.lightPhase * 7) * dt * 2;
          u.z += Math.cos(u.lightPhase * 7) * dt * 2;
        } else {
          var dx = p.x - u.x, dz = p.z - u.z;
          var len = Math.sqrt(dx * dx + dz * dz) || 1;
          var sp = u.speed * (u.tactic === 'PIT' ? 1.15 : 1);
          if (len > 4.5) { // dekati sampai jarak jaga, lalu tahan posisi (tidak menumpuk di atas pemain)
            u.x += (dx / len) * sp * dt;
            u.z += (dz / len) * sp * dt;
          }
          u.mesh.rotation.y = Math.atan2(dx, dz);
          // Ram / PIT: tabrak pemain di mobil (cooldown per unit agar tidak instan menghancurkan)
          if (!p.onFoot && len < 3.6) {
            u.ramCooldown -= dt;
            if (u.ramCooldown <= 0) {
              u.ramCooldown = 2.5;
              TA.player.damageCar(u.tactic === 'PIT' ? 6 : 4);
              TA.audio.crash();
              p.speed *= 0.55;
            }
          }
          // Tangkap pemain jalan kaki (lambat agar bisa kabur)
          if (p.onFoot && len < 1.6) {
            TA.player.takeDamage(6 * dt);
          }
        }
        u.mesh.position.set(u.x, 0, u.z);
        // Lampu strobo polisi: berkedip
        if (u.kind === 'car' && TA.time.elapsed % 1 < 0.5) {
          u.mesh.children[0].material.emissive = new THREE.Color(0x2244ff);
        }
      }
      // Spike strip: ban kempes saat dilindas
      for (var j = 0; j < this.spikes.length; j++) {
        var sp = this.spikes[j];
        if (!sp.triggered && !p.onFoot && TA.dist2d(p.x, p.z, sp.x, sp.z) < 3) {
          sp.triggered = true;
          TA.player.damageCar(25);
          p.speed *= 0.3;
          TA.audio.crash();
          TA.crew.showCrewChatter('BUDI', 'Ban kena spike strip! Pelan-pelan, aku bisa perbaiki nanti.');
        }
      }
      // Roadblock: tabrakan
      for (var k = 0; k < this.roadblocks.length; k++) {
        var rb = this.roadblocks[k];
        if (!p.onFoot && Math.abs(p.x - rb.x) < 5.6 && Math.abs(p.z - rb.z) < 1.4 && Math.abs(p.speed) > 3) {
          TA.player.damageCar(18);
          p.speed *= -0.3;
          TA.audio.crash();
        }
      }
      this.updateHelicopter(dt);
      // Cooldown wanted saat bersembunyi
      if (s.wanted > 0) this.cooldownWanted(dt);
      // Helikopter mati saat wanted < 5 (kecuali dikunci staging scene 2)
      if (s.wanted < 5 && this.heliActive && !this.heliLocked) this.deactivateHelicopter();
      // Unit berlebih dibersihkan saat wanted 0
      if (s.wanted === 0 && this.units.length > 0 && this.chaseTimer > 5) {
        this.chaseTimer = 0;
        var u2 = this.units.pop();
        if (u2.mesh) TA.scene.remove(u2.mesh);
      }
    }
  };
})();
