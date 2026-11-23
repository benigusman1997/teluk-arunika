// The crew: Sari (driver), Budi (mechanic) and Agus (hacker) with paid recruitment and cooldown abilities.

function recruitCrewMember(id) {
  const c = CREW.find((m) => m.id === id), s = G.crew[id];
  if (s.recruited) return false;
  if (G.money < c.cost) { showBanner('NOT ENOUGH CASH', c.name + ' wants ' + formatMoney(c.cost), 2); return false; }
  addMoney(-c.cost, 'Crew: ' + c.name);
  s.recruited = true;
  awardRankPoints(20, 'Crew recruited');
  sayChatter(id, id === 'sari' ? 'Sari here. Give me a road and I will give you wings.' : id === 'budi' ? 'Budi. If it has wheels, I can fix it at a red light.' : 'Agus. I do not talk much. Their radios will talk even less.', 5);
  showBanner(c.name + ' JOINED THE CREW', c.ability + ' - press ' + c.key, 3);
  playUiSound('complete');
  return true;
}

function useCrewAbility(id) {
  const c = CREW.find((m) => m.id === id), s = G.crew[id], car = G.player.car;
  if (!s.recruited) { showBanner(c.name + ' IS NOT IN THE CREW', "Recruit at Pak Amir's workshop", 1.6); return false; }
  if (s.cooldown > 0 || s.active > 0) return false;
  if (id === 'sari') {
    if (!car) { showBanner('GASPOL NEEDS A CAR', '', 1.2); return false; }
    s.active = c.duration;
    car.speed = Math.max(car.speed, car.speed + 8);
  } else if (id === 'budi') {
    if (car) { car.hp = car.spec.hp; car.tyresOut = false; }
    G.armour = Math.max(G.armour, currentRankIndex() >= 2 ? 125 : 100);
    G.health = Math.min(100, G.health + 35);
    s.active = c.duration;
  } else {
    if (G.wanted <= 0) { showBanner('NO HEAT TO DROP', '', 1.2); return false; }
    const before = G.wanted;
    if (before === 1) clearWantedLevel(true);
    else { G.wanted = before - 1; G.incident = INCIDENTS[G.wanted]; G.heat = 0.6; if (G.wanted < 4) dismissAirAndSwat(); }
    s.active = c.duration;
  }
  s.cooldown = c.cooldown * (currentRankIndex() >= 2 ? 0.85 : 1);
  sayChatter(id, randPick(c.lines), 4);
  showBanner(c.name + ' - ' + c.ability, c.desc, 1.8);
  playUiSound('stage');
  completeTutorialHint('crew');
  return true;
}

function updateCrewAbilities(dt) {
  for (const c of CREW) {
    const s = G.crew[c.id];
    if (s.active > 0) s.active = Math.max(0, s.active - dt);
    else if (s.cooldown > 0) s.cooldown = Math.max(0, s.cooldown - dt);
    if (W.keysHit[c.code]) useCrewAbility(c.id);
  }
  // Sari keeps talking while the heat is on.
  W.crewTalk = (W.crewTalk || 12) - dt;
  if (W.crewTalk <= 0 && G.wanted >= 3 && G.player.car && G.crew.sari.recruited && !G.chatter && !(G.contract && CONTRACTS[G.contract.index].bank)) { W.crewTalk = 14; sayChatter('sari', randPick(CREW[0].lines), 4); }
}
