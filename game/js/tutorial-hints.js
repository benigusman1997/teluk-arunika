// Tutorial hints: ten cards for the first minutes, each shown once
// and remembered in the save.

// Tutorial hints: id, title and the line shown.
const TUTORIAL_HINTS = [
  { id: 'move', title: 'MOVE', text: 'W A S D to move. Shift to sprint, Space to jump.' },
  { id: 'steal', title: 'STEAL A CAR', text: 'Walk up to a car and hold E to steal it. Watch the ring.' },
  { id: 'drive', title: 'DRIVE', text: 'W to speed up, S to brake, Space to handbrake drift.' },
  { id: 'wheel', title: 'WEAPONS', text: 'Press Q for the weapon wheel. 1-6 switch slots, R reloads.' },
  { id: 'wanted', title: 'WANTED', text: 'Stars mean the TAPD is after you. Hide to lose them.' },
  { id: 'minimap', title: 'MINIMAP', text: 'The minimap shows police in red and your objective in gold. M opens the full map.' },
  { id: 'phone', title: 'PHONE', text: 'Press P for the phone: messages, contacts, jobs, bank and map.' },
  { id: 'save', title: 'SAVE', text: 'F5 quick-saves. Park at a safehouse to autosave.' },
  { id: 'crew', title: 'CREW', text: 'Z, X and C use your crew abilities once you hire them.' },
  { id: 'radio', title: 'RADIO', text: 'N changes the station. Four stations play across the bay.' },
];

// Show a tutorial hint card by id, once only.
function showTutorialHint(id) {
  const hint = TUTORIAL_HINTS.find(function findHint(h) { return h.id === id; });
  if (!hint) {
    return;
  }
  if (GAME.tutorial.seen.indexOf(id) >= 0) {
    return;
  }
  GAME.tutorial.seen.push(id);
  GAME.ui.hint = hint.title + ' · ' + hint.text;
}

// Dismiss the current hint card.
function dismissTutorialHint() {
  GAME.ui.hint = '';
}

// The next unseen hint for the current situation.
function nextUnseenHintFor(context) {
  const order = {
    start: ['move', 'steal', 'drive'],
    combat: ['wheel', 'wanted'],
    explore: ['minimap', 'phone', 'save', 'crew', 'radio'],
  };
  const list = order[context] || order.explore;
  for (const id of list) {
    if (GAME.tutorial.seen.indexOf(id) < 0) {
      return id;
    }
  }
  return null;
}

// Show the right hint for where the player is in the first minutes.
function tut_tickTutorial(dt) {
  const p = GAME.player;
  if (GAME.tutorial.seen.indexOf('move') < 0) {
    showTutorialHint('move');
    return;
  }
  if (p.vehicle < 0 && GAME.tutorial.seen.indexOf('steal') < 0) {
    let near = false;
    for (const v of GAME.vehicles) {
      if (distanceBetween(p.x, p.z, v.x, v.z) < 8) {
        near = true;
      }
    }
    if (near) {
      showTutorialHint('steal');
    }
    return;
  }
  if (p.vehicle >= 0 && GAME.tutorial.seen.indexOf('drive') < 0) {
    showTutorialHint('drive');
    return;
  }
  if (GAME.police.stars > 0 && GAME.tutorial.seen.indexOf('wanted') < 0) {
    showTutorialHint('wanted');
  }
}
