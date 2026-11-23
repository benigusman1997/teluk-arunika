// Crew: hire Sari, Budi and Agus, use their abilities on Z, X and C,
// cooldowns, and their chatter during play.

// Crew members: key, name, ability, effect, cooldown, hire price.
const CREW_MEMBERS = [
  { key: 'Z', name: 'SARI', title: 'Driver', ability: 'GASPOL', effect: '+40% top speed for 6 s', cooldown: 30, price: 2000 },
  { key: 'X', name: 'BUDI', title: 'Mechanic', ability: 'QUICK FIX', effect: 'repairs 60% and adds 50 armour', cooldown: 45, price: 2500 },
  { key: 'C', name: 'AGUS', title: 'Hacker', ability: 'GHOST', effect: 'drops one star and scrambles dispatch for 8 s', cooldown: 60, price: 4000 },
];

// Chatter lines tied to events on the road.
const CREW_CHATTER_LINES = {
  roadblock: [
    'Roadblock on the boulevard — cut through the beach!',
    'BLOKIR ahead. Go around, through the side street!',
    'They blocked the road. The beach is open, Raka!',
  ],
  star: [
    'TAPD is on us — drive!',
    'Stars climbing. Keep moving, do not stop!',
    'They saw us. Lose them in the alleys!',
  ],
  smoking: [
    'The car is smoking — Budi, fix it!',
    'Engine is crying. Get to the workshop!',
    'We will not make it far like this.',
  ],
  stage: [
    'Next stage. You know the drill.',
    'One step closer to clearing the debt.',
    'Good. Keep the pace up.',
  ],
  race: [
    'You drive like my grandmother — faster!',
    'That rival is quick. Use the nitro!',
    'Take the inside line on the next turn!',
  ],
  crash: [
    'Ouch. The paint was new.',
    'That wall came out of nowhere, right?',
    'Shake it off. The car still runs.',
  ],
  win: [
    'That was clean. Darma will hear about it.',
    'We did it! The bay is ours tonight.',
    'Beautiful driving, Raka. Beautiful.',
  ],
  idle: [
    'The bay is quiet tonight.',
    'Seven days. We can do this.',
    'Radio up, windows down.',
  ],
};

// Hire a crew member for the listed price.
function recruitCrewMember(key) {
  const member = CREW_MEMBERS.find(function findMember(m) { return m.key === key; });
  if (!member) {
    return false;
  }
  if (GAME.crew.recruited.indexOf(key) >= 0) {
    return true;
  }
  if (GAME.money < member.price) {
    GAME.ui.banner = 'NEED $' + member.price.toLocaleString() + ' TO HIRE ' + member.name;
    return false;
  }
  GAME.money -= member.price;
  GAME.crew.recruited.push(key);
  GAME.ui.banner = member.name + ' JOINED THE CREW';
  sayCrewChatter(member.name, 'I am in. Let us clear this debt.');
  return true;
}

// Use a crew ability on its key, if hired and off cooldown.
function useCrewAbility(key) {
  const member = CREW_MEMBERS.find(function findMember(m) { return m.key === key; });
  if (!member) {
    return;
  }
  if (GAME.crew.recruited.indexOf(key) < 0) {
    GAME.ui.banner = member.name + ' NOT HIRED — $' + member.price.toLocaleString();
    return;
  }
  if (GAME.crew.cooldowns[key] > 0) {
    return;
  }
  if (key === 'Z') {
    GAME.crew.active.Z = 6;
    GAME.ui.banner = 'GASPOL — +40% TOP SPEED';
  }
  if (key === 'X') {
    const v = GAME.player.vehicle >= 0 ? GAME.vehicles[GAME.player.vehicle] : null;
    if (v) {
      v.hp = Math.min(v.maxHp, v.hp + v.maxHp * 0.6);
      v.smoke = 0;
    }
    GAME.player.armour = Math.min(100, GAME.player.armour + 50);
    GAME.ui.banner = 'QUICK FIX — CAR REPAIRED';
  }
  if (key === 'C') {
    if (GAME.police.stars > 0) {
      GAME.police.stars -= 1;
    }
    GAME.crew.active.C = 8;
    GAME.police.seen = false;
    GAME.ui.banner = 'GHOST — DISPATCH SCRAMBLED';
  }
  GAME.crew.cooldowns[key] = member.cooldown;
}

// Tick crew cooldowns and active ability timers down.
function updateCrewCooldowns(dt) {
  for (const key of ['Z', 'X', 'C']) {
    if (GAME.crew.cooldowns[key] > 0) {
      GAME.crew.cooldowns[key] -= dt;
      if (GAME.crew.cooldowns[key] < 0) {
        GAME.crew.cooldowns[key] = 0;
      }
    }
    if (GAME.crew.active[key] > 0) {
      GAME.crew.active[key] -= dt;
      if (GAME.crew.active[key] < 0) {
        GAME.crew.active[key] = 0;
      }
    }
  }
  if (GAME.crew.chatter.ttl > 0) {
    GAME.crew.chatter.ttl -= dt;
    if (GAME.crew.chatter.ttl <= 0) {
      GAME.crew.chatter.text = '';
    }
  }
  if (inp_pressed.KeyZ) {
    useCrewAbility('Z');
  }
  if (inp_pressed.KeyX) {
    useCrewAbility('X');
  }
  if (inp_pressed.KeyC) {
    useCrewAbility('C');
  }
}

// Say one chatter line from a crew member for a few seconds.
function sayCrewChatter(who, text) {
  GAME.crew.chatter = { who: who, text: text, ttl: 5 };
}

// Say a random line from one event group.
function crw_sayEventLine(event) {
  const lines = CREW_CHATTER_LINES[event];
  if (!lines) {
    return;
  }
  const who = event === 'stage' ? 'SARI' : pickFromList(['SARI', 'BUDI', 'AGUS']);
  sayCrewChatter(who, pickFromList(lines));
}
