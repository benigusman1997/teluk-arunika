// crew-abilities.js — recruiting the crew, their three abilities, cooldowns and chatter.
var TA = window.TA || (window.TA = {});
function recruitCrewMember(id) {
  var S = TA.S; if (S.crew.indexOf(id) >= 0) return;
  S.crew.push(id); var c = crewById(id);
  TA.notify(c.name + ' JOINED THE CREW — ' + c.ability + ' [' + c.key + ']');
}
function useCrewAbility(id) {
  var S = TA.S, c = crewById(id), P = TA.player;
  if (S.crew.indexOf(id) < 0) return TA.notify(c.name + ' IS NOT IN YOUR CREW YET');
  if (S.cooldown[id] > 0) return TA.notify(c.ability + ' READY IN ' + Math.ceil(S.cooldown[id]) + ' s');
  S.cooldown[id] = c.cd;
  if (id === 'sari') { S.heat = Math.max(0, S.heat - 1); S.wanted = Math.floor(S.heat); S.subtitle = 'SARI: "Their radios are singing dangdut. Go."'; }
  if (id === 'bima') { TA.people.forEach(function (p) { if (!p.dead && p.kind !== 'ped' && TA.dist(p, P) < 45) { p.suppress = 6; TA.hurtPerson(p, 20); } }); S.subtitle = 'BIMA: "Heads down, all of you!"'; }
  if (id === 'tono') { if (P.car) { P.car.hp = 100; P.car.tyres = true; } S.subtitle = 'TONO: "Good as stolen-new."'; }
  S.subT = 4;
}
function tickCrewCooldowns(dt) {
  var cd = TA.S.cooldown; for (var k in cd) cd[k] = Math.max(0, cd[k] - dt);
}
function crewById(id) { return TA.CFG.CREW.filter(function (c) { return c.id === id; })[0]; }
TA.recruitCrewMember = recruitCrewMember; TA.useCrewAbility = useCrewAbility; TA.tickCrewCooldowns = tickCrewCooldowns;
