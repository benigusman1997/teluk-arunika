// render-scene.js — WebGL renderer, sky dome, sun disc, clouds, lights, shadow map, tone mapping and fog.
var TA = window.TA || (window.TA = {});
function createRendererAndSky() {
  var canvas = document.getElementById('view');
  var r = TA.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(window.innerWidth, window.innerHeight);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.82;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  var scene = TA.scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffd6ae, 260, 1500);
  TA.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.3, 4000);
  var skyTex = TA.canvasTex(16, 256, function (g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2f6fd0'); gr.addColorStop(0.3, '#5fa6ea'); gr.addColorStop(0.44, '#ffd9a8'); gr.addColorStop(0.5, '#ffc48a'); gr.addColorStop(1, '#ffc48a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  var dome = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(dome); TA.skyDome = dome;
  TA.sunDir = new THREE.Vector3(-0.45, 0.42, 0.78).normalize();
  var sunTex = TA.canvasTex(128, 128, function (g) {
    var gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.25, 'rgba(255,236,170,0.95)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  var sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false }));
  sunDisc.scale.set(520, 520, 1); sunDisc.position.copy(TA.sunDir).multiplyScalar(2600); sunDisc.position.y = 520; dome.add(sunDisc);
  var cm = new THREE.MeshBasicMaterial({ color: 0xfffaf2, fog: false, transparent: true, opacity: 0.93 }), sg = new THREE.SphereGeometry(1, 10, 8);
  for (var i = 0; i < 20; i++) {
    var a = TA.rnd() * 6.283, d = 900 + TA.rnd() * 1300, cl = new THREE.Group();
    for (var j = 0; j < 5; j++) { var p = new THREE.Mesh(sg, cm); p.scale.set(60 + TA.rnd() * 70, 22 + TA.rnd() * 16, 50 + TA.rnd() * 40); p.position.set((j - 2) * 55, TA.rnd() * 14, TA.rnd() * 40); cl.add(p); }
    cl.position.set(Math.cos(a) * d, 330 + TA.rnd() * 260, Math.sin(a) * d); dome.add(cl);
  }
  scene.add(new THREE.HemisphereLight(0xdcecff, 0xffcf9a, 1.9));
  var sun = TA.sun = new THREE.DirectionalLight(0xffe0b0, 3.1);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  var sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400; sun.shadow.bias = -0.0015;
  scene.add(sun); scene.add(sun.target);
  window.addEventListener('resize', resizeRendererToWindow);
}
function updateSunShadows(focus) {
  TA.sun.target.position.set(focus.x, 0, focus.z);
  TA.sun.position.set(focus.x + TA.sunDir.x * 160, TA.sunDir.y * 160, focus.z + TA.sunDir.z * 160);
  TA.skyDome.position.set(focus.x, 0, focus.z);
  TA.renderer.shadowMap.enabled = TA.S.settings.shadows;
}
function resizeRendererToWindow() {
  TA.renderer.setSize(window.innerWidth, window.innerHeight);
  TA.camera.aspect = window.innerWidth / window.innerHeight; TA.camera.updateProjectionMatrix();
  var k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  document.getElementById('hud').style.transform = 'scale(' + k + ')';
}
TA.createRendererAndSky = createRendererAndSky; TA.updateSunShadows = updateSunShadows; TA.resizeRendererToWindow = resizeRendererToWindow;
