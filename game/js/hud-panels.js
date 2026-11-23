// Every in-play HUD card: mission, dispatch, health / armour / location, clock / money / stars, rank,
// weapon slots, crew abilities, radio, car, chatter, prompt, banner, weapon wheel, shop.
TA.hud = {};

TA.el = function (tag, cls, parent, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};

// Only touches the DOM when the content really changed.
TA.setHtml = function (el, html) { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
TA.show = function (el, on) { var v = on ? '' : 'none'; if (el._d !== v) { el._d = v; el.style.display = v; } };
TA.markup = function (text) { return text.replace(/\*([^*]+)\*/g, '<b class="hl">$1</b>'); };

// Small weapon silhouettes drawn in code, used as tile backgrounds.
TA.weaponIcon = function (i) {
  var cv = document.createElement('canvas'); cv.width = 72; cv.height = 28;
  var g = cv.getContext('2d'); g.fillStyle = '#e9f1ff';
  var r = function (x, y, w, h) { g.fillRect(x, y, w, h); };
  if (i === 0) { r(22, 8, 22, 14); r(44, 10, 8, 10); r(26, 4, 5, 6); r(33, 3, 5, 6); r(40, 4, 5, 6); }
  if (i === 1) { r(14, 8, 38, 7); r(14, 15, 9, 12); r(50, 6, 3, 3); }
  if (i === 2) { r(8, 8, 46, 7); r(26, 15, 6, 12); r(12, 15, 8, 9); r(54, 9, 10, 4); }
  if (i === 3) { r(4, 9, 60, 5); r(4, 14, 16, 7); r(30, 14, 16, 4); }
  if (i === 4) { r(4, 9, 50, 6); r(54, 10, 14, 3); r(4, 15, 12, 8); r(26, 15, 6, 11); r(38, 5, 10, 4); }
  if (i === 5) { r(2, 11, 66, 4); r(2, 15, 14, 7); r(26, 4, 22, 5); r(30, 15, 4, 9); }
  return cv.toDataURL();
};

TA.initHud = function () {
  var root = document.getElementById('hud'), H = TA.hud, i;
  H.root = root;
  H.play = TA.el('div', 'play', root);
  H.vignette = TA.el('div', 'vignette', H.play);
  // left column: mission card, dispatch card
  H.left = TA.el('div', 'col left', H.play);
  H.mission = TA.el('div', 'card mission', H.left);
  H.dispatch = TA.el('div', 'card dispatch', H.left);
  // bottom-left: minimap, vitals, location
  H.mapWrap = TA.el('div', 'minimap', H.play);
  H.mapCanvas = TA.el('canvas', '', H.mapWrap); H.mapCanvas.width = 168; H.mapCanvas.height = 168;
  TA.el('div', 'north', H.mapWrap, 'N');
  H.vitals = TA.el('div', 'card vitals', H.play);
  // right column: clock/money/stars, rank, weapons, crew
  H.right = TA.el('div', 'col right', H.play);
  H.status = TA.el('div', 'card status', H.right);
  H.rank = TA.el('div', 'card rank', H.right);
  H.weapons = TA.el('div', 'weapons', H.right);
  H.tiles = [];
  for (i = 0; i < 6; i++) {
    var t = TA.el('div', 'tile', H.weapons);
    TA.el('div', 'icon', t).style.backgroundImage = 'url(' + TA.weaponIcon(i) + ')';
    t.nameEl = TA.el('div', 'wname', t, TA.WEAPONS[i].name); t.ammoEl = TA.el('div', 'wammo', t, '');
    H.tiles.push(t);
  }
  H.crew = TA.el('div', 'crew', H.right);
  H.crewCards = TA.CREW.map(function (c) {
    var card = TA.el('div', 'card ability', H.crew);
    card.style.borderTopColor = c.color;
    card.innerHTML = '<span class="key">' + c.key + '</span><b>' + c.name.toUpperCase() + '</b><i>' + c.ability + '</i>';
    card.stateEl = TA.el('div', 'state', card); card.barEl = TA.el('div', 'bar', card); card.fillEl = TA.el('div', 'fill', card.barEl);
    card.fillEl.style.background = c.color;
    return card;
  });
  // bottom-right: radio line, car card
  H.br = TA.el('div', 'col br', H.play);
  H.radio = TA.el('div', 'card radio', H.br);
  H.car = TA.el('div', 'card car', H.br);
  // centre: chatter, prompt, banner, wheel, shop, crosshair
  H.chatter = TA.el('div', 'card chatter', H.play);
  H.prompt = TA.el('div', 'prompt', H.play);
  H.banner = TA.el('div', 'banner', H.play);
  H.wheel = TA.el('div', 'wheel', H.play);
  H.wheelItems = [];
  for (i = 0; i < 6; i++) {
    var a = i * Math.PI / 3, w = TA.el('div', 'slice', H.wheel);
    w.style.left = (150 + Math.sin(a) * 112 - 52) + 'px'; w.style.top = (150 - Math.cos(a) * 112 - 27) + 'px';
    w.innerHTML = '<div class="icon" style="background-image:url(' + TA.weaponIcon(i) + ')"></div><b>' + TA.WEAPONS[i].name + '</b><span></span>';
    H.wheelItems.push(w);
  }
  H.wheelCentre = TA.el('div', 'hub', H.wheel);
  H.shop = TA.el('div', 'card shop', H.play);
  H.cross = TA.el('div', 'cross', H.play);
  TA.layoutHud(window.innerWidth, window.innerHeight);
};

// The HUD is designed at 1280x720 and scaled to the window.
TA.layoutHud = function (w, h) {
  if (!TA.hud.root) return;
  var s = Math.min(w / 1280, h / 720);
  TA.hud.root.style.transform = 'scale(' + s + ')';
  TA.hud.root.style.left = Math.round((w - 1280 * s) / 2) + 'px';
  TA.hud.root.style.top = Math.round((h - 720 * s) / 2) + 'px';
};

TA.showBanner = function (title, sub, color) {
  TA.run.banner = { title: title, sub: sub || '', color: color || '#ffd166' };
  TA.run.bannerT = 3.6;
};
TA.floatText = function (text) { TA.run.subtitle = text; TA.run.subtitleT = 2.5; };
TA.flashDamage = function () { TA.run.hurtT = 0.5; };

TA.stars = function (n) {
  var s = '';
  for (var i = 1; i <= 5; i++) s += '<span class="star' + (i <= n ? ' on' : '') + '">★</span>';
  return s;
};

TA.bar = function (frac, color) { return '<div class="bar"><div class="fill" style="width:' + Math.round(TA.clamp(frac, 0, 1) * 100) + '%;background:' + color + '"></div></div>'; };

TA.updateMissionCard = function () {
  var H = TA.hud, r = TA.run, s = TA.state, p = TA.player, o = TA.missionObjective(), html, a = r.activity;
  if (o) {
    html = '<div class="head">' + o.head + '</div><div class="row"><span class="pill">' + o.stage + '</span><span class="title">' + o.title + '</span></div>' +
      '<div class="obj">' + TA.markup(o.obj) + (o.dist !== null ? ' <span class="dist">' + o.dist + ' m</span>' : '') + '</div>' +
      (o.progress !== null ? TA.bar(o.progress, '#72efdd') : '') +
      '<div class="next">NEXT <b>' + o.next + '</b></div><div class="foot">CONTRACT <b>' + o.contract + '</b>' + (o.timer !== null ? '<span class="timer">' + Math.floor(o.timer / 60) + ':' + TA.pad2(o.timer % 60) + '</span>' : '') + '</div>';
  } else if (a) {
    var line = a.type === 'race' ? 'CHECKPOINT ' + Math.min(a.cp + 1, a.def.cps.length) + '/' + a.def.cps.length + ' · P' + a.place + ' · ' + a.time.toFixed(1) + 's'
      : a.type === 'taxi' ? (a.phase === 'pickup' ? 'Pick up the passenger' : 'Drop off · fare ' + TA.fmtMoney(a.fare)) : 'Wreck <b class="hl">' + a.def.name + '</b>';
    html = '<div class="head">SIDE JOB · ' + (a.type === 'race' ? 'STREET RACE' : a.type === 'taxi' ? 'TAXI FARE' : 'WRECK CONTRACT') + '</div><div class="row"><span class="title">' + (a.def ? a.def.name.toUpperCase() : 'TAKSI KUNING') + '</span></div>' +
      '<div class="obj">' + line + '</div>' + (a.type === 'wreck' ? TA.bar(a.car.hp / a.car.maxHp, '#f94144') : '') + '<div class="foot">DEBT <b>' + TA.fmtMoney(s.debt) + '</b> · DAY ' + s.day + '/7</div>';
  } else {
    var ni = TA.nextMissionIndex(), m = ni >= 0 ? TA.MISSIONS[ni] : null, at = m ? TA.PLACES[m.at] : null;
    html = '<div class="head">FREE ROAM · ' + (m ? TA.ACTS[m.act] : 'THE BAY IS YOURS') + '</div>' +
      (m ? '<div class="row"><span class="pill">NEXT ' + (ni + 1) + '/10</span><span class="title">' + m.name.toUpperCase() + '</span></div><div class="obj">Go to <b class="hl">' + at.name + '</b> <span class="dist">' + Math.round(TA.dist(p.x, p.z, at.x, at.z)) + ' m</span></div>'
        : '<div class="row"><span class="title">DEBT CLEARED</span></div><div class="obj">Races, fares, wrecks and coins are still out there.</div>') +
      '<div class="foot">DEBT <b>' + TA.fmtMoney(s.debt) + '</b> · ' + Math.max(0, 8 - s.day) + ' DAYS LEFT</div>';
  }
  TA.setHtml(H.mission, html);
};

TA.updateDispatchCard = function () {
  var H = TA.hud, r = TA.run;
  TA.show(H.dispatch, r.wanted > 0);
  if (r.wanted <= 0) return;
  var rows = TA.dispatchRows(), icons = { foot: '●', cruiser: '▲', block: '■', heli: '✚', swatvan: '◆', swat: '●' };
  var html = '<div class="head red">TAPD DISPATCH — ' + (r.incident || TA.INCIDENTS[r.wanted]) + '</div><div class="sub">' + rows.length + ' UNITS · <span class="ministars">' + '★★★★★'.slice(0, r.wanted) + '</span></div>';
  rows.slice(0, 6).forEach(function (u) {
    html += '<div class="unit"><span class="ic t-' + u.type + '">' + icons[u.type] + '</span><span class="un">' + u.name.replace(/b$/, '') + '</span><span class="ud">' + Math.round(u.dist) + ' m</span><span class="role" style="background:' + TA.ROLES[u.role] + '">' + u.role + '</span></div>';
  });
  if (rows.length > 6) html += '<div class="more">+' + (rows.length - 6) + ' more</div>';
  html += '<div class="heat"><span class="' + (r.inSight ? 'sight' : 'losing') + '">' + (r.inSight ? 'IN SIGHT' : 'LOSING THEM') + '</span>' + TA.bar(r.heat, r.inSight ? '#f94144' : '#f9c74f') + '</div>';
  if (r.policeLine) html += '<div class="ticker">' + r.policeLine + '</div>';
  TA.setHtml(H.dispatch, html);
};

TA.updateRightColumn = function () {
  var H = TA.hud, r = TA.run, s = TA.state, p = TA.player, rk = TA.rankInfo(), i;
  TA.setHtml(H.status, '<div class="clock">DAY ' + s.day + '/7 · ' + TA.clockText(s.clock) + '</div><div class="money">' + TA.fmtMoney(s.money) + '</div>' +
    '<div class="stars">' + TA.stars(r.wanted) + '</div><div class="statusline">' + (r.wanted ? TA.STATUS_LINES[r.wanted] : 'NO HEAT') + '</div>');
  TA.setHtml(H.rank, '<div class="rl">' + rk.line + '</div>' + TA.bar(rk.frac, '#ffd166') + '<div class="rn">' + rk.numbers + '</div>');
  for (i = 0; i < 6; i++) {
    var t = H.tiles[i], a = s.ammo[i], cls = 'tile' + (i === p.weapon ? ' cur' : '') + (s.owned[i] ? '' : ' off');
    if (t._c !== cls) { t._c = cls; t.className = cls; }
    TA.setHtml(t.ammoEl, i === 0 ? '∞' : s.owned[i] ? a.mag + '/' + a.res : '—');
  }
  TA.CREW.forEach(function (c, k) {
    var st = TA.abilityState(c.id), card = H.crewCards[k], cls = 'card ability ' + st.cls;
    if (card._c !== cls) { card._c = cls; card.className = cls; }
    TA.setHtml(card.stateEl, st.text);
    card.fillEl.style.width = Math.round(st.frac * 100) + '%';
  });
};

TA.updateBottom = function () {
  var H = TA.hud, r = TA.run, s = TA.state, p = TA.player, loc = TA.locationInfo(), car = p.car;
  TA.setHtml(H.vitals, '<div class="vt"><span>HEALTH</span><b>' + Math.round(p.hp) + '</b></div>' + TA.bar(p.hp / 100, '#4ade80') +
    '<div class="vt"><span>ARMOUR</span><b>' + Math.round(p.armour) + '</b></div>' + TA.bar(p.armour / 100, '#4cc9f0') +
    '<div class="loc"><b style="color:' + loc.tint + '">' + loc.district + '</b><span>' + loc.street + '</span><i>' + loc.word + ' · ' + loc.standing + '</i></div>');
  TA.show(H.radio, !!(car && r.radioLine));
  if (car && r.radioLine) TA.setHtml(H.radio, '<span class="note">♪</span> ' + r.radioLine);
  if (car) {
    var cond = car.hp / car.maxHp, kmh = Math.round(Math.abs(car.speed) * 3.6);
    TA.setHtml(H.car, '<div class="cn">' + car.name + (car.tyres ? '' : ' · FLAT TYRES') + '</div><div class="cc"><span>CONDITION</span>' + TA.bar(cond, cond > 0.5 ? '#4ade80' : cond > 0.25 ? '#f9c74f' : '#f94144') + '<b>' + Math.round(cond * 100) + '%</b></div>' +
      '<div class="speed"><b>' + kmh + '</b><span>KM/H</span></div>');
  } else {
    var w = TA.WEAPONS[p.weapon], a = s.ammo[p.weapon];
    TA.setHtml(H.car, '<div class="cn">ON FOOT · ' + w.label + ' "' + w.name + '"</div><div class="cc"><span>' + (p.reloadT > 0 ? 'RELOADING' : 'MAGAZINE') + '</span>' + TA.bar(w.mag ? a.mag / w.mag : 1, '#ffd166') + '<b>' + (w.mag ? a.res : '∞') + '</b></div>' +
      '<div class="speed"><b>' + (w.mag ? a.mag : '∞') + '</b><span>ROUNDS</span></div>');
  }
};

TA.updateCentre = function (dt) {
  var H = TA.hud, r = TA.run, s = TA.state, p = TA.player, i;
  TA.show(H.chatter, !!r.chatter);
  if (r.chatter) TA.setHtml(H.chatter, '<div class="portrait" style="background:' + r.chatter.color + '">' + r.chatter.initial + '</div><div class="who"><b>' + r.chatter.who + '</b><i>' + r.chatter.role + '</i></div><div class="line">' + r.chatter.line + '</div>');
  if (r.subtitleT > 0) r.subtitleT -= dt;
  var prompt = r.prompt || (r.subtitleT > 0 ? '“' + r.subtitle + '”' : '');
  TA.show(H.prompt, !!prompt && !r.wheelOpen);
  if (prompt) TA.setHtml(H.prompt, prompt.replace(/\b(Hold E|Press E|Press F)\b/, '<kbd>$1</kbd>'));
  if (r.bannerT > 0) r.bannerT -= dt;
  TA.show(H.banner, r.bannerT > 0 && !!r.banner);
  if (r.banner && r.bannerT > 0) TA.setHtml(H.banner, '<div class="bt" style="color:' + r.banner.color + '">' + r.banner.title + '</div><div class="bs">' + r.banner.sub + '</div>');
  TA.show(H.wheel, r.wheelOpen);
  if (r.wheelOpen) {
    for (i = 0; i < 6; i++) {
      var it = H.wheelItems[i], cls = 'slice' + (i === p.weapon ? ' cur' : '') + (s.owned[i] ? '' : ' off');
      if (it._c !== cls) { it._c = cls; it.className = cls; }
      TA.setHtml(it.lastChild, i === 0 ? '∞' : s.owned[i] ? s.ammo[i].mag + ' / ' + s.ammo[i].res : 'LOCKED');
    }
    TA.setHtml(H.wheelCentre, '<i>WEAPON WHEEL</i><b>' + TA.WEAPONS[p.weapon].label + '</b><span>' + TA.WEAPONS[p.weapon].name + '</span>');
  }
  TA.show(H.shop, !!r.shop);
  if (r.shop) TA.setHtml(H.shop, '<div class="head">' + r.shop.title + '</div>' + r.shop.items.map(function (it, k) {
    return '<div class="item' + (s.money < it.price ? ' poor' : '') + '"><kbd>' + (k + 1) + '</kbd><span>' + it.label + '</span><b>' + TA.fmtMoney(it.price) + '</b></div>';
  }).join(''));
  TA.show(H.cross, !p.car && !r.wheelOpen && p.weapon > 0);
  if (r.hurtT > 0) r.hurtT -= dt;
  H.vignette.style.opacity = Math.max(r.hurtT > 0 ? r.hurtT * 1.6 : 0, p.hp < 30 ? 0.35 : 0);
};

// Called from the main loop; the text cards refresh about ten times a second.
TA.updateHud = function (dt, force) {
  var H = TA.hud, playing = TA.run.mode === 'playing' && !!TA.player;
  TA.show(H.play, playing);
  if (!playing) return;
  TA.updateCentre(dt);
  if (!force && TA.run.frame % 6 !== 0) return;
  TA.updateMissionCard(); TA.updateDispatchCard(); TA.updateRightColumn(); TA.updateBottom();
  TA.drawMinimap();
};
