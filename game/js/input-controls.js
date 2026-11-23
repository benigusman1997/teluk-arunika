// input-controls.js — keyboard, mouse, pointer lock, bindings.
var TA = window.TA || (window.TA = {});
function readKeyboardAndMouse() {
  var k = TA.keys, m = TA.mouse;
  return {
    fwd: (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0),
    turn: (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0),
    strafe: (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0),
    brake: !!k.Space, jump: !!k.Space, sprint: !!(k.ShiftLeft || k.ShiftRight),
    fire: !!(m.left || k.ControlLeft), aim: !!m.right, lookBack: !!k.KeyC, wheel: !!k.KeyQ
  };
}
function bindInputListeners(onKey) {
  TA.keys = {}; TA.mouse = { left: false, right: false };
  window.addEventListener('keydown', function (e) {
    if (!TA.keys[e.code]) onKey(e.code); TA.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { TA.keys[e.code] = false; });
  var cv = document.getElementById('view');
  cv.addEventListener('mousedown', function (e) {
    if (TA.S.mode === 'playing' && document.pointerLockElement !== cv && cv.requestPointerLock) cv.requestPointerLock();
    if (e.button === 0) TA.mouse.left = true; if (e.button === 2) TA.mouse.right = true; TA.unlockAudio();
  });
  window.addEventListener('mouseup', function (e) { if (e.button === 0) TA.mouse.left = false; if (e.button === 2) TA.mouse.right = false; });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('mousemove', function (e) {
    if (TA.S.mode !== 'playing' || document.pointerLockElement !== cv) return;
    var s = 0.0026 * TA.S.settings.sens;
    TA.camYaw -= e.movementX * s; TA.camPitch = TA.clamp(TA.camPitch + e.movementY * s * (TA.S.settings.invertY ? -1 : 1), -0.2, 0.9);
  });
}
TA.readKeyboardAndMouse = readKeyboardAndMouse; TA.bindInputListeners = bindInputListeners;
