// Input: keyboard state, mouse look, pointer lock, key helpers.

// Key bindings: action name to the physical keys that trigger it.
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  fire: ['Mouse0'],
  aim: ['Mouse1'],
  reload: ['KeyR'],
  wheel: ['KeyQ', 'Tab'],
  interact: ['KeyE'],
  camera: ['KeyV'],
  map: ['KeyM'],
  phone: ['KeyP'],
  radio: ['KeyN'],
  horn: ['KeyH'],
  crewZ: ['KeyZ'],
  crewX: ['KeyX'],
  crewC: ['KeyC'],
  save: ['F5'],
  pause: ['Escape'],
};

// Live key state: code true while held, pressed true for one step only.
const inp_keys = {};
const inp_pressed = {};
let inp_mouseDX = 0;
let inp_mouseDY = 0;
let inp_mouseDown = false;
let inp_pointerLocked = false;

// Read keys and mouse deltas once per fixed step, then clear edges.
function readKeyboardAndMouse(dt) {
  if (!GAME || !WORLD) {
    return;
  }
  const yawSpeed = 0.0022 * GAME.settings.mouse;
  if (inp_mouseDX !== 0) {
    GAME.ui.lookYaw -= inp_mouseDX * yawSpeed;
    inp_mouseDX = 0;
  }
  if (inp_mouseDY !== 0) {
    inp_mouseDY = 0;
  }
  if (inp_pressed.Escape && GAME.mode === 'playing') {
    switchGameMode('paused');
  } else if (inp_pressed.Escape && GAME.mode === 'paused') {
    switchGameMode('playing');
  }
  if (inp_pressed.KeyM && GAME.mode === 'playing') {
    switchGameMode('map');
  } else if (inp_pressed.KeyM && GAME.mode === 'map') {
    switchGameMode('playing');
  }
  if (inp_pressed.KeyP && GAME.mode === 'playing') {
    GAME.phone.open = true;
    GAME.mode = 'phone';
    if (typeof openPhone === 'function') {
      openPhone();
    }
  } else if (inp_pressed.KeyP && GAME.mode === 'phone') {
    GAME.phone.open = false;
    switchGameMode('playing');
  }
  if (inp_pressed.KeyV) {
    if (typeof cycleCameraMode === 'function') {
      cycleCameraMode();
    }
  }
  if (inp_pressed.KeyN && typeof tuneRadioStation === 'function') {
    tuneRadioStation(1);
  }
  if (inp_pressed.F5 && typeof saveGameToSlot === 'function') {
    saveGameToSlot(0);
  }
  for (const code in inp_pressed) {
    inp_pressed[code] = false;
  }
}

// True while any key bound to the action is held down.
function inp_isDown(action) {
  const codes = KEY_BINDINGS[action] || [];
  for (const code of codes) {
    if (inp_keys[code]) {
      return true;
    }
  }
  if (action === 'fire' && inp_mouseDown) {
    return true;
  }
  return false;
}

// True only on the step the key was first pressed.
function wasKeyPressed(code) {
  return !!inp_pressed[code];
}

// Attach the listeners once; called from bootGame.
function bindGameKeys() {
  window.addEventListener('keydown', function onKeyDown(ev) {
    if (!inp_keys[ev.code]) {
      inp_pressed[ev.code] = true;
    }
    inp_keys[ev.code] = true;
    if (ev.code === 'Space' || ev.code === 'Tab') {
      ev.preventDefault();
    }
    if (ev.code === 'F5') {
      ev.preventDefault();
    }
  });
  window.addEventListener('keyup', function onKeyUp(ev) {
    inp_keys[ev.code] = false;
  });
  window.addEventListener('blur', function onBlur() {
    for (const code in inp_keys) {
      inp_keys[code] = false;
    }
    inp_mouseDown = false;
  });
  document.addEventListener('mousemove', function onMouseMove(ev) {
    if (inp_pointerLocked) {
      inp_mouseDX += ev.movementX || 0;
      inp_mouseDY += ev.movementY || 0;
    }
  });
  document.addEventListener('mousedown', function onMouseDown(ev) {
    if (ev.button === 0) {
      inp_mouseDown = true;
      inp_pressed.Mouse0 = true;
    }
    if (ev.button === 2) {
      inp_pressed.Mouse1 = true;
    }
  });
  document.addEventListener('mouseup', function onMouseUp(ev) {
    if (ev.button === 0) {
      inp_mouseDown = false;
    }
  });
  document.addEventListener('contextmenu', function onContext(ev) {
    ev.preventDefault();
  });
}

// Lock the pointer so mouse movement steers the aim and camera.
function lockPointerForAiming() {
  const canvas = WORLD ? WORLD.canvas : null;
  if (canvas && canvas.requestPointerLock) {
    canvas.requestPointerLock();
    inp_pointerLocked = true;
  }
}

// Release the pointer lock, for example when opening a menu.
function inp_releasePointer() {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
  inp_pointerLocked = false;
}
