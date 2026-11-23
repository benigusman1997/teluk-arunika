// story-dialogue.js — cutscene dialogue panels with drawn portraits, and the mission intro card.
var TA = window.TA || (window.TA = {});
function playCutsceneDialogue(lines, done) {
  TA.cut = { lines: lines, i: 0, done: done }; TA.S.mode = 'cutscene'; showDialogueLine();
}
function showMissionIntroCard(c, i) {
  TA.bigWord = { text: 'ACT ' + c.act + ' · CONTRACT ' + (i + 1) + ' — ' + c.title, t: 3.5 };
}
function showDialogueLine() {
  var C = TA.cut, l = C.lines[C.i];
  TA.showScreen('<div class="dialogue"><canvas id="portrait" width="96" height="96"></canvas><div><b>' + l[0] + '</b><p>' + l[1] + '</p><i>ENTER / CLICK — continue (' + (C.i + 1) + '/' + C.lines.length + ')</i></div></div>', true);
  drawPortrait(document.getElementById('portrait').getContext('2d'), l[0]);
}
function advanceDialogue() {
  var C = TA.cut; if (!C) return;
  if (++C.i < C.lines.length) { showDialogueLine(); return; }
  TA.cut = null; TA.hideScreens(); TA.S.mode = 'playing'; if (C.done) C.done();
}
function drawPortrait(g, name) {
  var col = { RAKA: '#12b5a6', 'PAK AMIR': '#ffcc1a', SARI: '#f06aa8', BIMA: '#ffa94d', TONO: '#4fd0d6' }[name] || '#9aa4b2';
  g.fillStyle = '#243046'; g.fillRect(0, 0, 96, 96); g.fillStyle = col; g.fillRect(14, 66, 68, 30);
  g.fillStyle = '#d9a066'; g.fillRect(30, 22, 36, 44); g.fillStyle = '#2a1b12'; g.fillRect(28, 14, 40, 14);
  if (name === 'RAKA') { g.fillStyle = '#f5f0e6'; g.fillRect(26, 12, 44, 12); g.fillRect(52, 22, 26, 5); }
  g.fillStyle = '#1a1a1a'; g.fillRect(37, 38, 6, 5); g.fillRect(53, 38, 6, 5); g.fillRect(40, 54, 16, 3);
}
TA.playCutsceneDialogue = playCutsceneDialogue; TA.showMissionIntroCard = showMissionIntroCard; TA.advanceDialogue = advanceDialogue;
