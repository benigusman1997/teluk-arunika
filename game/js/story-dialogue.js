// Story dialogue panel with portraits, the mission intro card and short radio chatter from the crew.

function playCutsceneDialogue(lines, onDone) {
  G.dialogue = { lines: lines, index: 0, face: lines[0][0], text: lines[0][1], t: 0, onDone: onDone };
  G.mode = 'cutscene';
  playUiSound('talk');
}

function showMissionIntroCard(contract, index) {
  G.introCard = { head: 'CONTRACT ' + (index + 1) + '/' + CONTRACTS.length + ' - ' + ACTS[contract.act], title: contract.title, sub: 'Payout ' + formatMoney(contract.payout) + ' - from ' + faceById(contract.giver).name, t: 3.2 };
}

function advanceDialogue() {
  const d = G.dialogue;
  d.index++;
  if (d.index >= d.lines.length) {
    G.dialogue = null;
    G.mode = 'playing';
    if (d.onDone) d.onDone();
    return;
  }
  d.face = d.lines[d.index][0];
  d.text = d.lines[d.index][1];
  d.t = 0;
  playUiSound('talk');
}

function updateDialogue(dt) {
  const d = G.dialogue;
  d.t += dt;
  // Enter, E or a click moves on; lines also advance by themselves after a reading pause.
  if (W.keysHit.Enter || W.keysHit.KeyE || W.keysHit.Space || W.mouse.leftHit || d.t > 2.5 + d.text.length * 0.06) advanceDialogue();
}

function sayChatter(face, text, seconds) {
  G.chatter = { face: face, text: text, t: seconds || 4 };
}

function updateTimedMessages(dt) {
  if (G.chatter) { G.chatter.t -= dt; if (G.chatter.t <= 0) G.chatter = null; }
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.introCard) { G.introCard.t -= dt; if (G.introCard.t <= 0) G.introCard = null; }
}
