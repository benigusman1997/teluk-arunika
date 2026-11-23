// Phone: contacts, messages, jobs, bank and map tabs; calling a
// contact does something useful in the world.

// Phone contacts and what calling them does.
const PHONE_CONTACTS = [
  { name: 'PAK AMIR', action: 'tow and repair tip' },
  { name: 'DARMA WIJAYA', action: 'next contract' },
  { name: 'INSPECTOR LARAS', action: 'branch contact after contract 5' },
  { name: 'SARI', action: 'hire or brief' },
  { name: 'BUDI', action: 'hire or brief' },
  { name: 'AGUS', action: 'hire or brief' },
  { name: 'BU TINI', action: 'start a taxi fare' },
  { name: 'KOH LIEM', action: 'ammo delivery to a safehouse, +20%' },
  { name: 'CAT KILAT', action: 'nearest respray waypoint' },
];

// Twelve scripted texts by day and story.
const PHONE_MESSAGES = [
  { day: 1, from: 'PAK AMIR', text: 'The taxi is fuelled. Drive safe, son.' },
  { day: 1, from: 'DARMA WIJAYA', text: 'Day 1, Raka. $50,000. Seven days.' },
  { day: 2, from: 'SARI', text: 'I can drive getaway. $2,000 and I am yours.' },
  { day: 2, from: 'BU TINI', text: 'Nasi bungkus is ready when you are hungry.' },
  { day: 3, from: 'BUDI', text: 'Bring the car by. I fix anything for the right price.' },
  { day: 3, from: 'INSPECTOR LARAS', text: 'We should talk. Rooftop car park, Gang Neon.' },
  { day: 4, from: 'DARMA WIJAYA', text: 'Day 4, Raka. $31,550 left. Don\'t make me visit your father.' },
  { day: 4, from: 'AGUS', text: 'I can open the bank vault. $4,000 and the alarm is nothing.' },
  { day: 5, from: 'KOH LIEM', text: 'New stock at KELO ARMS. Come before the TAPD does.' },
  { day: 5, from: 'SARI', text: 'The flyover convoy runs tonight. Are we doing this?' },
  { day: 6, from: 'INSPECTOR LARAS', text: 'The ledger is the key. Burn it and Darma falls.' },
  { day: 7, from: 'DARMA WIJAYA', text: 'Last day, Raka. Pier 9 at dawn. Do not be late.' },
];

// Open the phone screen on the current tab.
function openPhone() {
  GAME.phone.open = true;
  const el = WORLD._hud.phone;
  el.style.display = '';
  drawPhoneScreen();
}

// Draw the phone screen: tabs and the active tab's content.
function drawPhoneScreen() {
  const el = WORLD._hud.phone;
  const tab = GAME.phone.tab;
  let html = '<h3>📱 RAKA\'S PHONE</h3>';
  const tabs = ['MESSAGES', 'CONTACTS', 'JOBS', 'BANK', 'MAP'];
  for (const t of tabs) {
    html += '<span class="tab' + (t === tab ? ' active' : '') + '">' + t + '</span>';
  }
  if (tab === 'MESSAGES') {
    const todays = PHONE_MESSAGES.filter(function byDay(m) { return m.day <= GAME.time.day; });
    for (const m of todays.slice(-6)) {
      html += '<div class="msg"><span class="from">' + m.from + '</span><br>' + m.text + '</div>';
    }
  }
  if (tab === 'CONTACTS') {
    for (const c of PHONE_CONTACTS) {
      html += '<div class="msg"><span class="from">' + c.name + '</span><br>' + c.action + '</div>';
    }
  }
  if (tab === 'JOBS') {
    const done = GAME.career.stats.contractsDone;
    html += '<div class="msg">Contracts done: ' + done + '/10<br>Next: '
      + (done < 10 ? STORY_CONTRACTS[done].title : 'ALL DONE') + '</div>';
  }
  if (tab === 'BANK') {
    html += '<div class="msg">Money: $' + GAME.money.toLocaleString()
      + '<br>Debt: $' + GAME.debt.toLocaleString()
      + '<br>Next instalment: $5,000</div>';
  }
  if (tab === 'MAP') {
    html += '<div class="msg">Tap a district on the map to set a waypoint.<br>Current: '
      + districtAtPosition(GAME.player.x, GAME.player.z) + '</div>';
  }
  html += '<div style="margin-top:8px;font-size:13px;color:#9fb4d8">P close · 1-5 switch tabs</div>';
  el.innerHTML = html;
}

// Call a contact: each one does something in the world.
function callContact(name) {
  if (name === 'PAK AMIR') {
    GAME.ui.banner = 'PAK AMIR: Tow is on its way. Drive careful.';
    repairCarAtGarage();
    return;
  }
  if (name === 'DARMA WIJAYA') {
    const next = unlockNextContract();
    startStoryContract(next);
    return;
  }
  if (name === 'INSPECTOR LARAS') {
    if (GAME.mission.branch === 'none') {
      GAME.ui.banner = 'LARAS: Finish contract 5 first.';
    } else {
      GAME.ui.banner = 'LARAS: The wire is live. Stay sharp.';
    }
    return;
  }
  if (name === 'SARI') {
    recruitCrewMember('Z');
    return;
  }
  if (name === 'BUDI') {
    recruitCrewMember('X');
    return;
  }
  if (name === 'AGUS') {
    recruitCrewMember('C');
    return;
  }
  if (name === 'BU TINI') {
    GAME._taxi = null;
    runTaxiFare(0);
    return;
  }
  if (name === 'KOH LIEM') {
    const slot = GAME.player.weaponSlot;
    GAME.player.ammo[slot - 1].reserve += 24;
    GAME.ui.banner = 'AMMO DELIVERED TO THE SAFEHOUSE (+20%)';
    return;
  }
  if (name === 'CAT KILAT') {
    setMapWaypoint(180, 180);
    return;
  }
}

// Receive a text message: it appears in the inbox and as a banner.
function receiveTextMessage(from, text) {
  GAME.phone.messages.push({ from: from, text: text, day: GAME.time.day });
  GAME.phone.unread += 1;
  GAME.ui.banner = 'NEW TEXT — ' + from;
}

// Deliver today's scripted messages as the days pass.
function updatePhoneMessages(dt) {
  if (!GAME || GAME.mode !== 'playing') {
    return;
  }
  GAME._msgDay = GAME._msgDay || 0;
  if (GAME.time.day === GAME._msgDay) {
    return;
  }
  GAME._msgDay = GAME.time.day;
  for (const m of PHONE_MESSAGES) {
    if (m.day === GAME.time.day) {
      receiveTextMessage(m.from, m.text);
    }
  }
}

// Set a waypoint from the phone's map tab.
function setWaypointFromPhone(x, z) {
  setMapWaypoint(x, z);
  GAME.phone.tab = 'MAP';
  drawPhoneScreen();
}
