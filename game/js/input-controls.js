// Keyboard and mouse input with pointer lock; "hit" flags are true for the single step a key went down.

function readKeyboardAndMouse() {
  // Called once per rendered frame after the fixed steps: clear the one-shot flags and mouse deltas.
  W.keysHit = {};
  W.mouse.dx = 0; W.mouse.dy = 0; W.mouse.leftHit = false;
}

function installInputListeners(canvas) {
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    if (!W.keys[e.code]) W.keysHit[e.code] = true;
    W.keys[e.code] = true;
    initAudio();
    if (W.audio && W.audio.ctx.state === 'suspended') W.audio.ctx.resume();
  });
  window.addEventListener('keyup', (e) => { W.keys[e.code] = false; });
  window.addEventListener('blur', () => { W.keys = {}; W.mouse.left = W.mouse.right = false; });
  canvas.addEventListener('mousedown', (e) => {
    initAudio();
    if (W.audio && W.audio.ctx.state === 'suspended') W.audio.ctx.resume();
    if (G.mode === 'playing' && !W.locked && canvas.requestPointerLock) canvas.requestPointerLock();
    if (e.button === 0) { W.mouse.left = true; W.mouse.leftHit = true; }
    if (e.button === 2) W.mouse.right = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) W.mouse.left = false;
    if (e.button === 2) W.mouse.right = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!W.locked) return;
    W.mouse.dx += e.movementX; W.mouse.dy += e.movementY;
  });
  // Mouse wheel pulls the on-foot shoulder camera back or in.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    W.cam.pull = clamp(W.cam.pull + (e.deltaY > 0 ? 0.5 : -0.5), 0, 4);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    W.locked = document.pointerLockElement === canvas;
    if (!W.locked) W.mouse.left = W.mouse.right = false;
  });
  window.addEventListener('resize', resizeRenderer);
}

function releasePointer() {
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
}

const GAME_KEYS = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F5', 'Backspace', 'ControlLeft'];
