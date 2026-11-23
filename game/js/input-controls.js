// Keyboard and mouse state, key bindings, pointer lock.
TA.input = {
  keys: {}, pressed: {}, mouseDown: false, mouseRight: false, mouseDX: 0, mouseDY: 0, clicked: false,
  locked: false, auto: null   // auto = scripted input used by the showcase scenes and the self-test
};

TA.BINDINGS = [
  ['W A S D', 'Walk / accelerate, brake, steer'], ['Shift', 'Sprint'], ['Space', 'Jump / handbrake'],
  ['Mouse', 'Look and aim'], ['Left click', 'Shoot / punch'], ['Right click', 'Aim'], ['E', 'Enter, exit or steal a car (hold)'],
  ['R', 'Reload'], ['Tab', 'Weapon wheel (slows time)'], ['1-6', 'Pick a weapon'], ['Z X C', 'Crew abilities'],
  ['Q', 'Next radio station'], ['F', 'Interact / accept contract'], ['M', 'Full map'], ['P or Esc', 'Pause'],
  ['V', 'Toggle rain (free play)'], ['H', 'Horn']
];

TA.initInput = function (canvas) {
  var inp = TA.input;
  window.addEventListener('keydown', function (e) {
    var k = e.code;
    if (k === 'Tab' || k === 'Space' || k.indexOf('Arrow') === 0) e.preventDefault();
    if (!inp.keys[k]) inp.pressed[k] = true;
    inp.keys[k] = true;
    if (TA.onKey) TA.onKey(k, e);
  });
  window.addEventListener('keyup', function (e) { inp.keys[e.code] = false; });
  window.addEventListener('blur', function () { inp.keys = {}; inp.mouseDown = false; });
  canvas.addEventListener('mousedown', function (e) {
    if (TA.audioUnlock) TA.audioUnlock();
    if (e.button === 0) { inp.mouseDown = true; inp.clicked = true; }
    if (e.button === 2) inp.mouseRight = true;
    if (TA.run.mode === 'playing' && !inp.locked && canvas.requestPointerLock) {
      try { var pr = canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(function () {}); } catch (err) { /* headless */ }
    }
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button === 0) inp.mouseDown = false;
    if (e.button === 2) inp.mouseRight = false;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('pointerlockchange', function () { inp.locked = document.pointerLockElement === canvas; });
  document.addEventListener('mousemove', function (e) {
    if (inp.locked || inp.mouseRight || inp.mouseDown) { inp.mouseDX += e.movementX || 0; inp.mouseDY += e.movementY || 0; }
  });
};

TA.releasePointer = function () { if (document.exitPointerLock && TA.input.locked) document.exitPointerLock(); };

// Held state of a key (or of the scripted input when a showcase drives the player).
TA.keyDown = function (code) {
  var a = TA.input.auto;
  if (a && a[code]) return true;
  return !!TA.input.keys[code];
};

// True once per key press; cleared at the end of every simulation step.
TA.keyHit = function (code) {
  var a = TA.input.auto;
  if (a && a.hit && a.hit[code]) { a.hit[code] = false; return true; }
  return !!TA.input.pressed[code];
};

TA.axis = function () {
  var f = (TA.keyDown('KeyW') || TA.keyDown('ArrowUp') ? 1 : 0) - (TA.keyDown('KeyS') || TA.keyDown('ArrowDown') ? 1 : 0);
  var r = (TA.keyDown('KeyD') || TA.keyDown('ArrowRight') ? 1 : 0) - (TA.keyDown('KeyA') || TA.keyDown('ArrowLeft') ? 1 : 0);
  return { f: f, r: r };
};

TA.firing = function () { return TA.input.mouseDown || !!(TA.input.auto && TA.input.auto.fire); };
TA.aiming = function () { return TA.input.mouseRight || !!(TA.input.auto && TA.input.auto.aim); };

// Mouse deltas are consumed once per step by whichever camera rig is active.
TA.takeMouse = function () {
  var d = { x: TA.input.mouseDX, y: TA.input.mouseDY };
  TA.input.mouseDX = 0; TA.input.mouseDY = 0;
  return d;
};

TA.endInputStep = function () { TA.input.pressed = {}; TA.input.clicked = false; };
