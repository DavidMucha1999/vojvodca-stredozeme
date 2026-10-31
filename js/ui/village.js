/*
 * Vnútro dediny (scéna Village v js/engine/scenes/VillageScene.js) a pamätihodnosti (scéna Place): vstup, odchod a rozhovory.
 * ROOM = { room: 'village', vi } alebo { room: 'place', pi }; okná otvorené z nich sa po „Späť“ vracajú do scény (roomReturn → mode 'room').
 */
const roomSceneOk = k => typeof game !== 'undefined' && game.scene && game.scene.getScene(k);
/** Vstup do dediny i (VL). */
function enterVillage(i) {
    if (!roomSceneOk('Village')) return vill(i);
    ov.classList.add('hide');
    mode = 'room'; G.dest = -1; G.vd = -1;
    ROOM = { room: 'village', vi: i, i: VL[i].t };
    if (game.scene.isActive('Map')) game.scene.sleep('Map');
    ['Castle', 'Tavern', 'Place'].forEach(k => { if (game.scene.isActive(k)) game.scene.stop(k); });
    const sc = game.scene.getScene('Village');
    if (sc.scene.isActive()) sc.scene.restart({ v: i }); else game.scene.start('Village', { v: i });
}
/** Vstup na pamätihodnosť i (PLACES). */
function enterPlace(i) {
    if (!roomSceneOk('Place')) return place(i);
    ov.classList.add('hide');
    mode = 'room'; G.dest = -1; G.pd = -1;
    ROOM = { room: 'place', pi: i };
    if (game.scene.isActive('Map')) game.scene.sleep('Map');
    ['Castle', 'Tavern', 'Village'].forEach(k => { if (game.scene.isActive(k)) game.scene.stop(k); });
    const sc = game.scene.getScene('Place');
    if (sc.scene.isActive()) sc.scene.restart({ p: i }); else game.scene.start('Place', { p: i });
}
/** Odchod zo scény dediny alebo pamätihodnosti na mapu. */
function leaveRoomScene() {
    ROOM = null;
    ov.classList.add('hide');
    mode = 'map';
    ['Village', 'Place'].forEach(k => { if (roomSceneOk(k) && game.scene.isActive(k)) game.scene.stop(k); });
    if (roomSceneOk('Map') && game.scene.isSleeping('Map')) game.scene.wake('Map');
}
const vBack = () => { ov.classList.add('hide'); mode = 'room'; };
const vLook = { elder: { race: 'human', skin: 1, hair: 'bald', hcol: '#c8c0b0', beard: 'full', eyes: '#4a5a6a', age: .9 }, overseer: { race: 'orc', hair: 'bald', beard: 'none', angry: 1, scar: 1 }, woman: { race: 'human', sex: 'f', skin: 0, hair: 'long', hcol: '#6a4a2a', beard: 'none', eyes: '#5a7a5a' }, broken: { race: 'human', skin: 2, hair: 'short', hcol: '#3a2a1a', beard: 'stubble', eyes: '#4a4a4a', age: .5, scar: 1 }, merchant: { race: 'human', skin: 1, hair: 'short', hcol: '#4a3020', beard: 'full', eyes: '#4a5a6a', age: .4 } };

/** Starosta (dobro) / orkský dozorca (zlo). */
function villageElder(i, line) {
    const v = VL[i], t = TW[v.t], evil = bloc(t.f) === 1 && t.f !== 6 || (t.f === 6 && heroSide() === 1), own = t.mine || t.f === G.fac;
    mode = 'room'; PORTRAIT = evil ? vLook.overseer : vLook.elder;
    const hello = v.st > 0 ? (evil ? 'Vypálili to. Všetko. Teraz tu nie je čo vymáhať.' : 'Všetko zhorelo, pane. Chalupy, sýpka, aj staré lipy. Postavíme to znova, ale potrvá to.') : evil ? 'Čo chceš? Dane sú vybraté, otroci pracujú, mäso je na ceste do ' + t.n + '. Ak hľadáš prácu, choď do hradu.' : own ? 'Vitaj, pane. Dedina ' + v.n + ' ti patrí a prosperuje, ako vidíš – alebo neprosperuje, podľa toho, ako nás chránite.' : 'Vitaj v ' + v.n + ', cudzinec. Patríme pod ' + t.n + '. Čo ťa k nám privádza?';
    show((evil ? 'Dozorca' : 'Starosta') + ' dediny ' + v.n, '„' + (line || hello) + '“');
    const bands = E.filter(e => e.f === 9 && Math.hypot(e.x - v.x, e.y - v.y) < 350 * K).sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y));
    btn('Čo nové v kraji?', () => villageElder(i, rumor(t)), 0, 'book');
    if (bands.length && !G.bounty) btn('Trápi vás niekto? (úloha: ' + bands[0].nm + ')', () => { const b = bands[0]; G.bounty = { id: b.id, nm: b.nm, g: 40 + Math.floor(b.n * 5) }; G.chase = b; villageElder(i, 'Áno! ' + b.nm + ' nám kradne dobytok a páli polia. Ak ich zaženieš, dáme ti ' + G.bounty.g + ' zlata – všetko, čo máme. Cieľ je označený na mape.'); }, 0, 'attack');
    if (!evil && !own && v.st <= 0) btn('Ponúknuť ochranu (30 zlata, prosperita a česť)', () => { G.gold -= 30; v.pr = Math.min(100, (v.pr ?? 40) + 8); G.hon = (G.hon || 0) + 1; G.ren++; upd(); villageElder(i, 'Nech ťa Valar ochraňujú, pane. Deti budú spať pokojnejšie.'); }, G.gold < 30, 'shield');
    if (own && v.st <= 0) btn('Vybrať mimoriadne dane (+' + lvl(v) * 6 + ' zlata, prosperita −5)', () => { G.gold += lvl(v) * 6; v.pr = Math.max(0, (v.pr ?? 40) - 5); upd(); villageElder(i, 'Ako prikážeš. Ale sýpky sú po tomto plytšie.'); }, 0, 'coins');
    if (evil && v.st <= 0) btn('Vymáhať poplatok (+' + (10 + lvl(v) * 4) + ' zlata, strach +1)', () => { G.gold += 10 + lvl(v) * 4; G.fear = (G.fear || 0) + 1; G.hon = (G.hon || 0) - 1; v.pr = Math.max(0, (v.pr ?? 40) - 4); upd(); villageElder(i, 'Hrr. Tu máš. Nabudúce nech ťa pošle sám Lugbúrz, inak nedám nič.'); }, 0, 'skull');
    if (v.st > 0 && G.gold >= 50) btn('Pomôcť s obnovou (50 zlata, dedina sa obnoví skôr)', () => { G.gold -= 50; v.st = Math.max(0, v.st - 3); G.hon = (G.hon || 0) + 2; upd(); villageElder(i, 'Kúpime drevo a tesárov. O pár dní tu zas bude stáť strecha. Nezabudneme ti to.'); }, 0, 'heart');
    btn('Späť', vBack, 0, 'back');
}
function villageMarket(i) { const v = VL[i]; mode = 'town'; market(v, () => { ov.classList.add('hide'); mode = 'room'; }); }
function villageRecruit(i) {
    const v = VL[i], t = TW[v.t], evil = heroSide() === 1, rich = lvl(v) >= 3;
    mode = 'room'; PORTRAIT = evil ? vLook.broken : vLook.merchant;
    show(evil ? 'Zverbovaní sedliaci' : 'Dobrovoľníci z ' + v.n, evil ? 'Pri klietke stojí rad vychudnutých mužov. Dozorca vraví, že za pár mincí ich môžeš odviesť do vojska; bojovať budú zo strachu.' : 'Pri voze so senom sa zišli mladíci s kosami a vidlami. Chcú vidieť svet a priniesť domov pár mincí.' + (rich ? ' Bohatá dedina má aj niekoľko lovcov s lukmi.' : ''));
    btn('Najať 3 pešiakov (25 zlata)', () => { G.gold -= 25; G.inf += 3; upd(); villageRecruit(i); }, G.gold < 25 || v.st > 0, { u: 'i' });
    if (rich && !evil) btn('Najať 2 lukostrelcov (40 zlata)', () => { G.gold -= 40; G.arc += 2; upd(); villageRecruit(i); }, G.gold < 40, { u: 'a' });
    if (evil) btn('Odviesť 5 sedliakov násilím (strach +2, česť −3, prosperita −10)', () => { G.inf += 5; G.fear = (G.fear || 0) + 2; G.hon = (G.hon || 0) - 3; v.pr = Math.max(0, (v.pr ?? 40) - 10); upd(); villageRecruit(i); }, v.st > 0, 'chain');
    btn('Späť', vBack, 0, 'back');
}
function villageWell(i) {
    const v = VL[i]; mode = 'room';
    const used = (G.vwell || {})[v.n] === G.day;
    show('Studňa', used ? 'Dnes si už pil. Voda je studená a dobrá, ale zázraky nerobí dvakrát denne.' : 'Studená voda z hlbokej studne. Vojaci si naplnia mechy a kone sa napijú.');
    btn('Napiť sa (zdravie +10, družina +)', () => { (G.vwell = G.vwell || {})[v.n] = G.day; G.hp = Math.min(mh(), G.hp + 10); if (G.chp) Object.keys(G.chp).forEach(k => G.chp[k] = Math.min(1, G.chp[k] + .1)); upd(); vBack(); }, used, 'heart');
    btn('Späť', vBack, 0, 'back');
}
function villageChapel(i) {
    const v = VL[i], t = TW[v.t], evil = bloc(t.f) === 1 && t.f !== 6 || (t.f === 6 && heroSide() === 1), used = (G.vpray || {})[v.n] === G.day;
    mode = 'room';
    show(evil ? 'Oltár Tieňa' : 'Kaplnka', evil ? 'Čierny kameň s lebkami a zaschnutou krvou. Orkovia sem nosia obete pre Oko.' : 'Malá drevená svätyňa s hviezdou Elbereth nad dverami. Vonia tu vosk a sušené kvety.');
    if (evil) btn('Priniesť obetu (strach +2, zdravie −5)', () => { (G.vpray = G.vpray || {})[v.n] = G.day; G.fear = (G.fear || 0) + 2; G.hp = Math.max(10, G.hp - 5); upd(); vBack(); }, used, 'skull');
    else btn('Pomodliť sa (česť +1, zdravie +5)', () => { (G.vpray = G.vpray || {})[v.n] = G.day; G.hon = (G.hon || 0) + 1; G.hp = Math.min(mh(), G.hp + 5); upd(); vBack(); }, used, 'honor');
    if (!evil) btn('Darovať chudobným (10 zlata, sláva +1)', () => { G.gold -= 10; G.ren++; upd(); vBack(); }, G.gold < 10, 'coins');
    btn('Späť', vBack, 0, 'back');
}
function villageInn(i) {
    const v = VL[i], t = TW[v.t], evil = heroSide() === 1;
    mode = 'room'; PORTRAIT = vLook.merchant;
    show(evil ? 'Brloh v ' + v.n : 'Krčmička v ' + v.n, evil ? 'Nízka chatrč, kde sa orkovia a zbehovia opíjajú kvaseným mliekom. Za sudom sedí jednooký hostinský.' : 'Nízka izba s jedným stolom a ohniskom. Hostinský nalieva domáce pivo a praská chlieb.');
    btn('Prenocovať (5 zlata, plné zdravie, deň plynie)', () => { G.gold -= 5; G.hp = mh(); dayT = 600; upd(); msg('Ráno ťa zobudí kohút' + (evil ? ' – teda, orkovia ho už zjedli, zobudí ťa dozorca.' : ' a vôňa čerstvého chleba.'), vBack); }, G.gold < 5, 'rest');
    btn('Vypočuť si klebety (3 zlata)', () => { G.gold -= 3; upd(); msg('„' + rumor(t) + '“', () => villageInn(i)); }, G.gold < 3, 'book');
    btn('Dať rundu dedine (15 zlata, sláva +1)', () => { G.gold -= 15; G.ren++; upd(); msg('Celá krčmička pripíja na tvoje zdravie.', () => villageInn(i)); }, G.gold < 15, 'mug');
    btn('Späť', vBack, 0, 'back');
}
function villageTalk(i, kind) {
    const v = VL[i], t = TW[v.t];
    mode = 'room'; PORTRAIT = kind ? vLook.broken : vLook.woman;
    const good = kind === 0, lines = good ? ['Pán ' + (t.lord || 'hradu ' + t.n) + ' vyberá dane raz za mesiac. Horšie sú tie tlupy z lesa.', 'Chlapi hovoria, že na východe sa zbiera vojsko. Ja hovorím, nech sa zbiera ďaleko odtiaľto.', 'Obilie sa tento rok urodilo. Keby ste chceli kúpiť, kupec má plný voz.', 'V noci počuť vlkov. Nie také obyčajné – väčšie.', 'Môj muž odišiel k vojsku pána ' + t.n + '. Píše, že je tam zima a málo chleba.'] : ['Nehovor s nimi nahlas. Dozorca počuje všetko.', 'Brali nám mäso, potom dobytok, potom synov. Zostali sme len my starí.', 'Raz príde niekto zo západu. Hovorí sa to potichu, pri ohni.', 'Ak máš kúsok chleba, pane… nie pre mňa. Pre deti.'];
    show(good ? 'Dedinčanka' : 'Zlomený sedliak', '„' + lines[Math.floor(Math.random() * lines.length)] + '“');
    if (!good && G.gold >= 5) btn('Dať mu 5 zlata (česť +1)', () => { G.gold -= 5; G.hon = (G.hon || 0) + 1; upd(); vBack(); }, 0, 'heart');
    btn('Späť', vBack, 0, 'back');
}
