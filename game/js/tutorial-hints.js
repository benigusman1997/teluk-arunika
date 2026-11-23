// tutorial-hints.js — first-minutes hint cards, each shown once per save.
var TA = window.TA || (window.TA = {});
function showTutorialHint(id) {
  var S = TA.S, text = tutorialHintText(id); if (S.hints[id] || !text) return;
  S.hints[id] = true; TA.hintT = 7; TA.setCard('hint', '<b>HINT</b> ' + text);
}
function tutorialHintText(id) {
  return {
    start: 'Walk with WASD, look with the mouse. Follow the yellow beacon on the minimap to Pak Amir.',
    drive: 'W/S accelerate and brake, A/D steer, SPACE handbrake to drift. V changes camera, R the radio.',
    wanted: 'Stars mean TAPD is hunting you. Break line of sight until the stars blink out, or respray.',
    combat: 'Hold RMB to aim, LMB to fire, Q for the weapon wheel. Use planters as cover.',
    crew: 'Crew abilities: Z scramble radio, X cover fire, C field repair. Each has a cooldown.'
  }[id];
}
function tickTutorialHints(dt) {
  if (TA.hintT > 0) { TA.hintT -= dt; if (TA.hintT <= 0) TA.setCard('hint', ''); }
  if (TA.S.time > 1) showTutorialHint('start');
  if (TA.S.stage >= 0 && TA.CFG.CONTRACTS[TA.S.contract].stages[TA.S.stage].t === 'kill') showTutorialHint('combat');
  if (TA.S.crew.length) showTutorialHint('crew');
}
TA.showTutorialHint = showTutorialHint; TA.tickTutorialHints = tickTutorialHints;
