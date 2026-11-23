// Story dialogue: characters, cutscene scripts, portraits drawn on
// a small canvas, the mission intro card and the ending screen.

// Story characters: name, role, look and shirt colour.
const STORY_CHARACTERS = [
  { id: 'RAKA', name: 'RAKA PRATAMA', role: 'taxi driver', look: 'teal shirt, backwards white cap', shirt: '#18b89a', hair: 'black' },
  { id: 'AMIR', name: 'PAK AMIR', role: 'his father, mechanic', look: 'grey moustache, blue overalls', shirt: '#2a4a7a', hair: 'grey' },
  { id: 'DARMA', name: 'DARMA WIJAYA', role: 'boss of the NAGA LAUT syndicate', look: 'white suit, gold glasses', shirt: '#f4f1e6', hair: 'black' },
  { id: 'LARAS', name: 'INSPECTOR LARAS', role: 'TAPD detective', look: 'navy jacket', shirt: '#1c2a4a', hair: 'brown' },
  { id: 'SARI', name: 'SARI "SI GESIT"', role: 'crew driver', look: 'pink jacket', shirt: '#ff6fb5', hair: 'black' },
  { id: 'BUDI', name: 'BUDI "MONTIR"', role: 'crew mechanic', look: 'orange cap', shirt: '#ff9f5a', hair: 'black' },
  { id: 'AGUS', name: 'AGUS "SI PENDIAM"', role: 'crew hacker', look: 'green hoodie', shirt: '#5dff9b', hair: 'black' },
  { id: 'TINI', name: 'BU TINI', role: 'warung owner', look: 'apron, headscarf', shirt: '#ffc24a', hair: 'grey' },
  { id: 'LIEM', name: 'KOH LIEM', role: 'runs KELO ARMS', look: 'round glasses, vest', shirt: '#8fc3ee', hair: 'grey' },
];

// Cutscene scripts: opening, the choice and the ending, 4-6 lines each.
const CUTSCENE_SCRIPTS = {
  opening: [
    { who: 'PAK AMIR', text: 'Raka. The loan was five thousand. Darma says it is fifty now.' },
    { who: 'RAKA', text: 'Fifty thousand? In seven days? That is impossible.' },
    { who: 'PAK AMIR', text: 'Then we make it possible. The taxi, the streets — they are yours.' },
    { who: 'RAKA', text: 'Seven days. One bay. Every car is mine to take.' },
    { who: 'DARMA', text: 'Day one, Raka. Do not make me visit your father.' },
  ],
  choice: [
    { who: 'LARAS', text: 'Darma owns your debt, Raka. Help me and the debt dies with him.' },
    { who: 'RAKA', text: 'And if I pay him instead?' },
    { who: 'LARAS', text: 'Then you work for him forever. Your call.' },
    { who: 'DARMA', text: 'The detective lies, Raka. I only want what I am owed.' },
    { who: 'RAKA', text: 'One of you is lying. I will find out which.' },
  ],
  ending: [
    { who: 'RAKA', text: 'Fifty thousand. Paid in full.' },
    { who: 'PAK AMIR', text: 'The workshop is ours again, son.' },
    { who: 'LARAS', text: 'Darma is in cuffs. The bay can breathe.' },
    { who: 'SARI', text: 'Seven days, Raka. You did what nobody thought you could.' },
    { who: 'RAKA', text: 'The debt is cleared. The bay is mine now.' },
  ],
};

// Play a cutscene's dialogue lines one by one.
function playCutsceneDialogue(sceneId) {
  const lines = CUTSCENE_SCRIPTS[sceneId];
  if (!lines) {
    return;
  }
  GAME._cutscene = { scene: sceneId, index: 0, lines: lines };
  GAME.mode = 'cutscene';
  advanceDialogueLine();
}

// Show the next dialogue line, or end the cutscene.
function advanceDialogueLine() {
  const cs = GAME._cutscene;
  if (!cs) {
    return;
  }
  if (cs.index >= cs.lines.length) {
    GAME._cutscene = null;
    GAME.mode = 'playing';
    GAME.ui.dialogue = { who: '', role: '', text: '' };
    return;
  }
  const line = cs.lines[cs.index];
  const char = STORY_CHARACTERS.find(function findChar(c) { return c.name.indexOf(line.who) === 0; });
  GAME.ui.dialogue = {
    who: line.who, role: char ? char.role : '', text: line.text,
  };
  cs.index += 1;
}

// Draw a character portrait on a small canvas: face, hair, one
// accessory and the shirt colour.
function drawCharacterPortrait(charId, canvas) {
  const char = STORY_CHARACTERS.find(function findChar(c) { return c.id === charId; });
  if (!char || !canvas) {
    return;
  }
  const g = canvas.getContext('2d');
  const size = canvas.width;
  g.clearRect(0, 0, size, size);
  g.fillStyle = '#22304d';
  g.beginPath();
  g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = char.shirt;
  g.fillRect(size * 0.2, size * 0.68, size * 0.6, size * 0.32);
  g.fillStyle = '#c98d64';
  g.beginPath();
  g.arc(size / 2, size * 0.42, size * 0.22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = char.hair === 'grey' ? '#9aa5b1' : (char.hair === 'brown' ? '#7a4a2a' : '#1a1a1a');
  g.beginPath();
  g.arc(size / 2, size * 0.34, size * 0.22, Math.PI, 0);
  g.fill();
  if (charId === 'RAKA') {
    g.fillStyle = '#f4f1e6';
    g.fillRect(size * 0.28, size * 0.2, size * 0.44, size * 0.1);
  }
  if (charId === 'DARMA') {
    g.fillStyle = '#ffcf3a';
    g.fillRect(size * 0.3, size * 0.38, size * 0.4, size * 0.04);
  }
  if (charId === 'AMIR') {
    g.fillStyle = '#9aa5b1';
    g.fillRect(size * 0.4, size * 0.52, size * 0.2, size * 0.05);
  }
}

// Show the mission intro card for a contract.
function showMissionIntroCard(contract) {
  GAME.ui.banner = 'CONTRACT ' + contract.id + '/10 — ' + contract.title;
  GAME.ui.dialogue = {
    who: contract.giver.toUpperCase(), role: 'Contract giver',
    text: contract.intro,
  };
}

// Show the DEBT CLEARED ending screen, with text by branch.
function showEndingDebtCleared() {
  GAME.mode = 'ending';
  const branch = GAME.mission.branch;
  const lines = branch === 'PAY DARMA'
    ? 'You paid Darma in full. The workshop is safe — but the syndicate still watches the bay.'
    : 'You handed Darma to Laras. The syndicate falls, and the bay finally breathes free.';
  const root = WORLD.hudRoot;
  const end = document.createElement('div');
  end.className = 'pause-menu';
  end.innerHTML = '<h2>DEBT CLEARED</h2>'
    + '<div style="max-width:520px;text-align:center;font-size:18px;line-height:1.5">'
    + lines + '</div>'
    + '<div style="font-size:15px;color:#9fb4d8">CONTRACTS 10/10 · CASH EARNED $'
    + GAME.career.stats.cashEarned.toLocaleString() + ' · CARS STOLEN '
    + GAME.career.stats.carsStolen + '</div>'
    + '<div style="font-size:15px;color:#ffcf3a">Press Enter to keep playing</div>';
  root.appendChild(end);
  GAME._endingEl = end;
}
