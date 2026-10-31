/*
 * Nádvorie a sieň hradu (scéna Castle v js/engine/scenes/CastleScene.js) a rozhovory na nich.
 * Vstup a odchod rieši js/ui/rooms.js (enterCastle, leaveCastle, roomReturn).
 */
/** Kováč na nádvorí: krátky rozhovor, potom kováčňa. */
function castleSmith(i) {
    const t = TW[i], sc = game.scene.getScene('Castle'), evil = heroSide() === 1;
    mode = 'castle';
    PORTRAIT = sc.looks ? sc.looks.smith : null;
    show(evil ? 'Orkský kováč' : 'Kováč hradu ' + t.n, '„' + (evil ? 'Železo je horúce a ja mám málo času. Čo chceš prekuť?' : t.bd && t.bd.s ? 'Dielňa beží dňom i nocou, pane. Pre teba o pätinu lacnejšie.' : 'Dobrá oceľ, poctivá práca. Pozri si tovar.') + '“');
    btn('Pozrieť si zbrane a výstroj', () => smithy(i), 0, 'anvil');
    btn('Čo vieš o výbave?', () => { mode = 'castle'; msg('„' + (evil ? 'Čím ťažšie, tým lepšie. Orkská šabľa ide cez kosť ako cez maslo, ale skutočné zbrane pre pánov Tieňa nájdeš len v hradoch zla.' : 'Každý kraj kuje inak: Gondor plát, Rohan krúžkovú zbroj, elfovia ľahké šupiny, trpaslíci pevný plát z Ereboru. Najlepšie kusy majú vlastnú dušu – a cenu.') + '“', () => castleSmith(i)); }, 0, 'book');
    btn('Späť na nádvorie', roomReturn, 0, 'back');
}
/** Kupec na nádvorí: rozhovor a trh. */
function castleMerchant(i) {
    const t = TW[i], sc = game.scene.getScene('Castle');
    mode = 'castle';
    const best = GOODS.map(g => [g, price(t, g.k)]).sort((a, b) => b[1] - a[1])[0];
    PORTRAIT = sc.looks ? sc.looks.merc : null;
    show('Kupec v ' + t.n, '„Tovar z celej Stredozeme, pane. ' + (best ? 'Najviac tu dnes zaplatíme za ' + best[0].n.toLowerCase() + ' (' + best[1] + ' zlata za kus).' : '') + (cargoCount() ? ' Vidím, že voz máš plný – pozrime sa, čo vezieš.' : '') + '“');
    btn('Obchodovať', () => market(t, () => town(i)), 0, 'scales');
    btn('Kde sa oplatí predávať?', () => { mode = 'castle'; const rich = TW.filter(x => !hos(x.f, G.fac) && x !== t).sort((a, b) => (b.pr || 40) - (a.pr || 40))[0]; msg('„' + (rich ? 'Najbohatší trh je teraz v ' + rich.n + '. Kto tam dovezie, čo im chýba, zarobí dvojnásobok.' : 'Všade je zle, pane. Vojna kazí obchod.') + '“', () => castleMerchant(i)); }, 0, 'map');
    btn('Späť na nádvorie', roomReturn, 0, 'back');
}
/** Veliteľ posádky: verbovanie a stav obrany. */
function castleCaptain(i) {
    const t = TW[i], sc = game.scene.getScene('Castle');
    mode = 'castle';
    PORTRAIT = sc.looks ? sc.looks.cap : null;
    show('Veliteľ posádky, ' + t.n, '„Posádka má ' + t.g + ' mužov, hradby stupeň ' + (t.wl || 0) + '. ' + (t.g < 12 ? 'Je nás málo – ak prídu, dlho sa neudržíme.' : 'Hradby udržíme.') + ' Hľadáš vojakov? Pár chlapov by šlo.“');
    btn('Verbovať vojakov', () => tsub(i, 'r'), 0, 'recruit');
    btn('Vojsko, zajatci a odpočinok', () => tsub(i, 'v'), 0, 'rest');
    btn('Turnaj v aréne (vstupné 20)', () => { G.gold -= 20; upd(); leaveRoom(); startBattle({ n: 3 + Math.floor(G.lv / 2), f: t.f, ar: 1, t }); }, G.gold < 20, 'attack');
    btn('Späť na nádvorie', roomReturn, 0, 'back');
}
function castleWell(i) {
    mode = 'castle';
    const heal = Math.min(mh() - G.hp, 10);
    if (heal > 0) { G.hp += heal; upd(); }
    msg('Studená voda zo studne. ' + (heal > 0 ? 'Zdravie +' + Math.round(heal) + '.' : 'Osviežila ťa, aj keď si zranený nebol.'), roomReturn);
}
function castleTemple(i) {
    mode = 'castle';
    const done = G.tpray === G.day;
    show('Chrám', done ? 'Dnes si sa už pomodlil. Ticho a vôňa kadidla ťa upokojujú.' : 'V chráme je ticho. Môžeš sa pomodliť za svojich mužov (česť +1, raz za deň).');
    btn('Pomodliť sa', () => { G.tpray = G.day; G.hon = (G.hon || 0) + 1; upd(); msg('Odchádzaš s pokojnejšou mysľou. Česť +1.', roomReturn); }, done, 'honor');
    btn('Späť na nádvorie', roomReturn, 0, 'back');
}
function castleTraining(i) {
    mode = 'castle';
    const done = G.ttrain === G.day, cost = 10;
    show('Cvičisko', done ? 'Dnes si už cvičil; svaly ťa bolia.' : 'Panák z dreva a slamy. Za ' + cost + ' zlata si zacvičíš s posádkou: skúsenosti +5 (raz za deň).');
    btn('Cvičiť (' + cost + ' zlata)', () => { G.gold -= cost; G.ttrain = G.day; G.xp += 5; upd(); msg('Ruka si pamätá údery. Skúsenosti +5.', roomReturn); }, done || G.gold < cost, 'attack');
    btn('Späť na nádvorie', roomReturn, 0, 'back');
}
/** Pán hradu v sieni: bežný rozhovor s lordom. */
function castleLord(i, e) { lord(e); }
/** Správca hradu v sieni: správa, dvor, úlohy, nocľah. */
function castleSteward(i) {
    const t = TW[i], sc = game.scene.getScene('Castle'), mine = t.mine;
    mode = 'castle';
    PORTRAIT = sc.stewardLook || null;
    const bd = t.bd || {}, built = BUILDINGS.filter(([k]) => bd[k]).map(([, n]) => n.split(' (')[0]);
    show('Správca hradu ' + t.n, '„' + (mine ? 'Vitaj doma, pane. Hrad má prosperitu ' + Math.round(t.pr ?? 40) + ' %, denný príjem ' + castleIncome(t) + ' zlata' + (built.length ? ', postavené: ' + built.join(', ') : '') + '.' : 'Vitaj v sieni ' + t.n + '. ' + (t.lord ? 'Léno drží ' + t.lord + '. ' : '') + 'Pán ' + (sc.lord ? 'je práve doma.' : 'je na výprave; v jeho mene hovorím ja.')) + '“');
    if (mine) btn('Správa hradu (stavby, hradby, léna)', () => tsub(i, 'h'), 0, 'castle');
    btn('Dvor a diplomacia', () => tsub(i, 'd'), 0, 'court');
    if (mine) btn('Kráľovstvo: léna, vazali, dane', () => kingdom(i), 0, 'crown');
    questsAt(t).forEach(q => { const d = qDef(q), s = qStep(q); if (s.k === 'r') btn('Úloha: uzavrieť „' + d.n + '“', () => { questComplete(q); msg('„' + qText(q, d.done) + '“', roomReturn); }, 0, 'quest'); else btn('Úloha: odovzdať ' + s.n + '× ' + goodOf(s.a).n, () => { if (questDeliver(q)) msg(q.step >= d.steps.length ? '„' + qText(q, d.done) + '“' : 'Tovar odovzdaný.', roomReturn); }, ((G.cargo || {})[s.a] || 0) < s.n, 'quest'); });
    if (G.ring === 1 && t.n === 'Barad-dûr' && bloc(G.fac) === 1) btn('Odovzdať Prsteň Sauronovi', () => { G.ring = 2; G.gold += 1000; G.ren += 10; lg('Odovzdal si Jeden prsteň Sauronovi.'); ach(); upd(); roomReturn(); }, 0, 'ring');
    btn('Zostať v hrade (čas plynie, hojíš sa)', () => stayInCastle(i), 0, 'rest');
    btn('Uložiť hru', () => saveMenu(() => castleSteward(i)), 0, 'chest');
    btn('Späť do siene', roomReturn, 0, 'back');
}
/** Pobyt v hrade: ako táborenie – hráč stojí pri hrade, dni plynú, zdravie sa hojí rýchlejšie. Klik na mapu pobyt ukončí. */
function stayInCastle(i) {
    const t = TW[i];
    G.camp = 1; G.stay = t.n; G.x = G.tx = t.x; G.y = G.ty = t.y + 30;
    const b = [...tb.children].find(x => /tábor/i.test(x.textContent)); if (b) b.textContent = 'Zrušiť pobyt';
    leaveCastle();
    TS = { s: 'Zostávaš v hrade ' + t.n + '. Čas plynie a hojíš sa; klikni na mapu, keď chceš vyraziť.', l: 320 };
    upd();
}
