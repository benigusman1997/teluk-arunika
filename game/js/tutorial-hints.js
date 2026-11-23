// Contextual tutorial hints: each is shown until done or timed out, and remembered in the save.

function showTutorialHint(id) {
  if (G.hintsDone[id] || (G.hint && G.hint.id === id)) return false;
  const hint = TUTORIAL_HINTS.find((h) => h.id === id);
  G.hint = { id: id, text: hint.text, t: 9 };
  return true;
}

function completeTutorialHint(id) {
  if (G.hintsDone[id]) return;
  G.hintsDone[id] = true;
  if (G.hint && G.hint.id === id) G.hint = null;
}

function updateTutorialHints(dt) {
  if (G.hint) {
    G.hint.t -= dt;
    if (G.hint.t <= 0) { G.hintsDone[G.hint.id] = true; G.hint = null; }
    return;
  }
  // Nothing showing: offer the next lesson that fits what Raka is doing.
  if (!G.player.car && G.playTime > 1) showTutorialHint('move');
  if (G.player.car && G.hintsDone.drive && G.contract) showTutorialHint('map');
  if (G.contractsDone >= 3 && !G.crew.sari.recruited) showTutorialHint('crew');
}
