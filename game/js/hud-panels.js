// hud-panels.js — every in-play card: mission, dispatch, wanted stars and money, crew, car speed, ammo, prompts.
var TA = window.TA || (window.TA = {});
function drawMissionCard() {
  var S = TA.S, c = TA.CFG.CONTRACTS[S.contract], html;
  if (S.stage >= 0) {
    html = '<h4>ACT ' + c.act + ' · CONTRACT ' + (S.contract + 1) + '/10</h4><h3>' + c.title + '</h3>';
    c.stages.forEach(function (st, i) { html += '<div class="obj ' + (i < S.stage ? 'done' : i === S.stage ? 'now' : '') + '">' + (i < S.stage ? '✔' : i === S.stage ? '▶' : '·') + ' ' + st.text + '</div>'; });
    html += '<div class="pay">PAYOUT $' + c.pay + ' · ' + c.giver + '</div>';
  } else html = '<h4>NEXT CONTRACT ' + (S.contract + 1) + '/10</h4><h3>' + (c ? c.title : 'ALL DONE') + '</h3><div class="obj now">▶ Follow the yellow beacon to ' + (c ? c.giver : '—') + '</div>';
  if (S.activity) html += '<div class="obj now">★ ' + S.activity.label + ' ' + Math.max(0, Math.ceil(S.activity.par - S.activity.t)) + ' s</div>';
  setCard('mission', html);
}
function drawDispatchCard() {
  var S = TA.S, units = TA.cars.filter(function (c) { return (c.role === 'police' || c.role === 'block') && c.unit; });
  if (S.wanted === 0) { setCard('dispatch', ''); return; }
  var html = '<h4>TAPD DISPATCH · ' + (S.searching ? '<span class="blink">SEARCHING</span>' : 'IN PURSUIT') + '</h4><div class="crime">' + (S.lastCrime || '') + '</div>';
  units.slice(0, 4).forEach(function (c, i) { html += '<div class="unit">UNIT ' + (i + 1) + ' · ' + c.unit + ' <b>' + Math.round(TA.dist(c, TA.player)) + ' m</b></div>'; });
  if (TA.heli) html += '<div class="unit air">ELANG-1 · SEARCHLIGHT ON YOU</div>';
  if (TA.swatVan) html += '<div class="unit air">BADAK-2 · SWAT ON SCENE</div>';
  if (TA.roadblocks.length) html += '<div class="unit">ROADBLOCK + SPIKES AHEAD</div>';
  setCard('dispatch', html);
}
function drawWantedStarsAndMoney() {
  var S = TA.S, stars = '';
  for (var i = 1; i <= 5; i++) stars += '<span class="' + (i <= S.wanted ? 'star on' + (S.searching ? ' blink' : '') : 'star') + '">★</span>';
  var hh = Math.floor(S.clock), mm = Math.floor((S.clock - hh) * 60);
  setCard('status', '<div class="stars">' + stars + '</div><div class="money">$' + S.money.toLocaleString('en-US') + '</div>' +
    '<div class="debt">DEBT $' + Math.max(0, TA.CFG.DEBT - S.money).toLocaleString('en-US') + ' · DAY ' + S.day + '/7 · ' + ('0' + hh).slice(-2) + ':' + ('0' + mm).slice(-2) + '</div>' +
    '<div class="bars"><i class="hp" style="width:' + Math.max(0, S.hp) + '%"></i></div><div class="bars"><i class="ar" style="width:' + S.armor + '%"></i></div>' +
    '<div class="rank">' + TA.currentRank().name + ' · ' + S.rankPts + ' RP · ' + TA.districtAt(TA.player.x, TA.player.z).name + '</div>');
}
function drawCrewCards() {
  var S = TA.S, html = '';
  TA.CFG.CREW.forEach(function (c) {
    var has = S.crew.indexOf(c.id) >= 0, cd = S.cooldown[c.id];
    html += '<div class="crew' + (has ? '' : ' off') + '" style="border-color:' + c.color + '"><b>[' + c.key + '] ' + c.name + '</b> ' + c.role + '<br>' + c.ability + ' · ' + (!has ? 'LOCKED' : cd > 0 ? Math.ceil(cd) + ' s' : 'READY') + '</div>';
  });
  setCard('crew', html);
}
function drawCarSpeedCard() {
  var S = TA.S, car = TA.player.car, W = TA.CFG.WEAPONS[S.weapon];
  var ammo = '<div class="ammo"><b>' + W.name + '</b> ' + (S.ammo[S.weapon] === Infinity ? '∞' : S.ammo[S.weapon]) + '</div>';
  if (!car) { setCard('speed', ammo + '<div class="small">ON FOOT · E steal car · Q wheel</div>'); return; }
  var kmh = Math.round(Math.abs(car.v) * 3.6), gear = car.v < -0.5 ? 'R' : Math.min(6, 1 + Math.floor(kmh / 35));
  setCard('speed', '<div class="kmh">' + kmh + '<small> KM/H</small></div><div class="small">' + car.cfg.name + ' · GEAR ' + gear + (car.tyres ? '' : ' · FLAT TYRES') + '</div>' +
    '<div class="bars"><i class="cond" style="width:' + Math.max(0, car.hp) + '%"></i></div><div class="small">♪ ' + TA.CFG.STATIONS[S.station].name + '</div>' + ammo);
}
function drawPromptsAndBanners(dt) {
  var S = TA.S, P = TA.player, p = S.prompt;
  if (!p && !P.car) { var near = TA.cars.some(function (c) { return !c.dead && TA.dist(c, P) < 4.2; }); if (near) p = 'PRESS E — STEAL / ENTER CAR'; }
  if (!p && S.near) p = S.near === 'gunshop' ? 'PRESS B — KELO ARMS' : 'PRESS B — RESPRAY GARAGE';
  setCard('prompt', p || ''); S.subT -= dt; setCard('subtitle', S.subT > 0 ? S.subtitle : '');
  if (TA.bigWord) { TA.bigWord.t -= dt; setCard('big', TA.bigWord.text); if (TA.bigWord.t <= 0) { TA.bigWord = null; setCard('big', ''); } }
  TA.noteT = (TA.noteT || 0) - dt; if (TA.noteT <= 0) setCard('note', '');
  TA.hurtFlash = Math.max(0, (TA.hurtFlash || 0) - dt); TA.hitMarkT = Math.max(0, (TA.hitMarkT || 0) - dt);
  document.getElementById('hurt').style.opacity = TA.hurtFlash * 2; document.getElementById('cross').className = P.car ? 'hide' : TA.hitMarkT > 0 ? 'hit' : '';
}
function buildHudCards() {
  var ids = ['mission', 'dispatch', 'status', 'crew', 'speed', 'prompt', 'subtitle', 'big', 'note', 'hint'], html = '<div id="hurt"></div><div id="cross"></div><canvas id="minimap" width="180" height="180"></canvas><div id="wheel"></div>';
  ids.forEach(function (id) { html += '<div id="card-' + id + '" class="card"></div>'; });
  document.getElementById('hud').innerHTML = html; TA.cardCache = {};
}
function setCard(id, html) {
  if (TA.cardCache[id] === html) return; TA.cardCache[id] = html;
  var el = document.getElementById('card-' + id); el.innerHTML = html; el.style.display = html ? 'block' : 'none';
}
function notify(text) { setCard('note', text); TA.noteT = 3.5; }
function updateHud(dt) {
  drawMissionCard(); drawDispatchCard(); drawWantedStarsAndMoney(); drawCrewCards(); drawCarSpeedCard(); drawPromptsAndBanners(dt);
  TA.drawMinimap(document.getElementById('minimap').getContext('2d'));
}
TA.buildHudCards = buildHudCards; TA.updateHud = updateHud; TA.notify = notify; TA.setCard = setCard;
