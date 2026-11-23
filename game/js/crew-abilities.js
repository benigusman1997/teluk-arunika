// The crew: recruitment, ability cooldowns and effects (Z / X / C), and radio chatter lines.
TA.crewRun = { sari: { cd: 0, active: 0 }, budi: { cd: 0, active: 0 }, agus: { cd: 0, active: 0 } };
TA.CHATTER = {
  sari: ['Gaspol! Keep it pinned, Raka!', 'Left at the lights, they never cover it.', 'Boulevard is clear for two blocks. Go!', 'You drive like my grandmother. Faster!'],
  budi: ['She will hold together. Probably.', 'Bring it in, I will patch her in ten seconds.', 'Smoke means stop. Usually.', 'New plating is holding.'],
  agus: ['Their radios just went quiet.', 'One unit dropped off the board.', 'ELANG-1 is on a short leash. Use the towers.', 'Cameras on Jl. Neon are looping.']
};

TA.crewDef = function (id) { for (var i = 0; i < TA.CREW.length; i++) if (TA.CREW[i].id === id) return TA.CREW[i]; return null; };

TA.unlockCrew = function (id) {
  if (TA.state.crew[id]) return;
  TA.state.crew[id] = true;
  var c = TA.crewDef(id);
  TA.showBanner('CREW JOINED', c.name.toUpperCase() + ' "' + c.nick.toUpperCase() + '" — ' + c.key + ': ' + c.ability, c.color);
  TA.say(id, id === 'sari' ? 'I drive, you shoot. Deal?' : id === 'budi' ? 'Anything with wheels, I can keep alive.' : 'I listen. They talk too much.');
};

// Puts a line in the chatter box at the bottom of the screen. who = crew id or a plain speaker name.
TA.say = function (who, line) {
  var c = TA.crewDef(who);
  TA.run.chatter = { who: c ? c.name.toUpperCase() : who, role: c ? c.role + ' · "' + c.nick + '"' : '', color: c ? c.color : '#ffd166', line: line, initial: (c ? c.name : who).charAt(0) };
  TA.run.chatterT = 6;
};

TA.useAbility = function (id) {
  var def = TA.crewDef(id), st = TA.crewRun[id], p = TA.player;
  if (!TA.state.crew[id]) { TA.showBanner('NOT RECRUITED', def.name.toUpperCase() + ' joins through the story or at the garage', '#adb5bd'); return false; }
  if (st.cd > 0) return false;
  if (id === 'sari') {
    if (!p.car) { TA.say('sari', 'Get in a car first!'); return false; }
    p.car.boost = def.duration; st.active = def.duration;
  } else if (id === 'budi') {
    if (p.car) { p.car.hp = p.car.maxHp; p.car.tyres = true; }
    p.armour = Math.min(100, p.armour + 50); p.hp = Math.min(100, p.hp + 25);
  } else {
    if (TA.run.wanted <= 0) { TA.say('agus', 'Nobody is looking for you. Yet.'); return false; }
    var w = TA.run.wanted - 1;
    TA.run.wantedTimer = 0;
    if (w === 0) TA.setWanted(0);
    else { TA.run.wanted = w; TA.showBanner('GHOST', 'ONE STAR DROPPED — ' + TA.STATUS_LINES[w], '#72efdd'); if (w < 4 && TA.heliStandDown) TA.heliStandDown(); }
  }
  st.cd = def.cooldown;
  TA.say(id, TA.pick(TA.CHATTER[id]));
  if (TA.sfx) TA.sfx('ability', 0.8);
  return true;
};

TA.updateCrew = function (dt) {
  var r = TA.run;
  TA.CREW.forEach(function (c) {
    var st = TA.crewRun[c.id];
    if (st.cd > 0) st.cd = Math.max(0, st.cd - dt);
    if (st.active > 0) st.active = Math.max(0, st.active - dt);
    if (TA.keyHit('Key' + c.key)) TA.useAbility(c.id);
  });
  if (r.chatterT > 0) { r.chatterT -= dt; if (r.chatterT <= 0) r.chatter = null; }
  // idle chatter during a chase
  r.chatterIdle = (r.chatterIdle || 0) + dt;
  if (!r.chatter && r.chatterIdle > 14 && r.wanted >= 2) {
    r.chatterIdle = 0;
    var have = TA.CREW.filter(function (c) { return TA.state.crew[c.id]; });
    if (have.length) { var who = TA.pick(have); TA.say(who.id, TA.pick(TA.CHATTER[who.id])); }
  }
};

// State of one ability card for the HUD: locked, ready, active or cooling down.
TA.abilityState = function (id) {
  var st = TA.crewRun[id], def = TA.crewDef(id);
  if (!TA.state.crew[id]) return { text: 'LOCKED', frac: 0, cls: 'locked' };
  if (st.active > 0) return { text: 'ACTIVE', frac: st.active / def.duration, cls: 'active' };
  if (st.cd > 0) return { text: Math.ceil(st.cd) + 's', frac: 1 - st.cd / def.cooldown, cls: 'cooling' };
  return { text: 'READY', frac: 1, cls: 'ready' };
};
