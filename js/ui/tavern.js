/*
 * Krčma ako miestnosť (scéna Tavern v js/engine/scenes/TavernScene.js) a jej rozhovory.
 * enterTavern(i) vstúpi do krčmy hradu i; bez Phaseru (index.html, testy) sa použije staré okno tavern().
 * Rozhovory sa otvárajú ako bežné okná (show/btn), mode ostáva 'tavern', zatvorenie okna vráti do miestnosti.
 */
function enterTavern(i) {
    if (typeof game === 'undefined' || !game.scene || !game.scene.getScene('Tavern')) return tavern(i);
    ov.classList.add('hide');
    mode = 'tavern';
    G.dest = -1;
    const sc = game.scene.getScene('Tavern');
    if (game.scene.isActive('Map')) game.scene.sleep('Map');          // mapa pod krčmou spí (čas stojí)
    if (sc.scene.isActive()) sc.scene.restart({ i }); else game.scene.start('Tavern', { i });
}
/** Zavrie okno a vráti hráča do miestnosti krčmy. */
function tavBack() { ov.classList.add('hide'); mode = 'tavern'; }
/** Obnoví postavy v miestnosti (po pripojení spoločníka). */
function tavRefresh() { const sc = typeof game !== 'undefined' && game.scene.getScene('Tavern'); if (sc && sc.scene.isActive()) sc.refresh(); }

/** Rozhovor so spoločníkom c, ktorý čaká v krčme hradu i. */
function tavTalk(i, c, line) {
    mode = 'tavern';
    show(c.n + ', ' + c.t, '„' + (line || c.join) + '“');
    const full = (G.comp || []).length >= 4, ok = G.ren >= c.ren && G.gold >= c.p && !full;
    btn('Pripojiť sa k družine (' + c.p + ' zlata' + (G.ren < c.ren ? ', treba slávu ' + c.ren : '') + (full ? ', družina je plná' : '') + ')', () => {
        G.gold -= c.p; compJoin(c); upd();
        show(c.n, '„' + compLine(c) + '“ ' + c.n + ' vstáva od stola a pridáva sa k tebe. V bitke bude bojovať po tvojom boku.');
        btn('Späť do krčmy', () => { tavBack(); tavRefresh(); });
    }, !ok, 'group');
    btn('Opýtať sa na jeho príbeh', () => tavTalk(i, c, compLine(c)), 0, 'book');
    btn('Čo vieš o tomto kraji?', () => { const t = TW[i]; tavTalk(i, c, (c.side ? 'Tento brloh patrí ' : 'Toto mesto patrí ') + FN[t.f] + '. Posádka má ' + t.g + ' mužov' + (t.lord ? ', léno drží ' + t.lord : '') + '. ' + (hos(t.f, G.fac) ? 'Nie sú tu priatelia.' : 'Ľudia tu sú k tebe zatiaľ priateľskí.')); }, 0, 'map');
    btn('Späť do krčmy', tavBack, 0, 'back');
}

/** Krčmár: klebety, runda, nocľah, dobrovoľníci. */
function tavKeeper(i, line) {
    const t = TW[i], evil = heroSide() === 1, th = (typeof game !== 'undefined' && game.scene.getScene('Tavern') || {}).th;
    mode = 'tavern';
    const hello = evil ? 'Čo chceš? Mäso došlo, zostalo len to z včera. Plať, alebo sa prac.' : th === 'elf' ? 'Vitaj, pútnik. Posaď sa; víno z Dorwinionu je staršie než tvoj rod.' : th === 'dwarf' ? 'Sadaj! Pivo je silné, pečienka horúca a účet sa platí vopred.' : th === 'hobbit' ? 'Dobrý večer! Pivo, koláč, alebo oboje? U nás sa zvyčajne berie oboje.' : 'Vitaj, pane. Čo si dáš? Pivo, chlieb, alebo novinky?';
    show((th === 'evil' ? 'Správca brlohu' : th === 'elf' ? 'Hostiteľ' : 'Krčmár') + ' v ' + t.n, '„' + (line || hello) + '“');
    btn('Vypočuť si klebety (5 zlata)', () => { G.gold -= 5; upd(); tavKeeper(i, rumor(t)); }, G.gold < 5, 'book');
    btn('Zaplatiť rundu pre všetkých (' + (10 + G.ren) + ' zlata, sláva +1)', () => { G.gold -= 10 + G.ren; G.ren++; G.tround = G.day; lg('Zaplatil si rundu v ' + t.n + '. Ľudia si ťa pamätajú.'); upd(); tavKeeper(i, evil ? 'Chlapi revú. Dobre, dnes ťa nikto neokradne.' : 'Na tvoje zdravie, pane! O tomto sa bude hovoriť.'); }, G.gold < 10 + G.ren || G.tround === G.day, 'mug');
    btn('Prenocovať (8 zlata, plné zdravie)', () => { G.gold -= 8; G.hp = mh(); upd(); tavKeeper(i, 'Izba hore, schody vŕzgajú. Ráno budeš ako nový.'); }, G.gold < 8 || G.hp >= mh(), 'rest');
    btn(evil ? 'Najať hladných orkov (3 pešiaci za 30)' : 'Najať chlapov od stola (3 pešiaci za 30)', () => { G.gold -= 30; G.inf += 3; upd(); tavKeeper(i, evil ? 'Traja sa zdvihli. Kŕm ich, inak zožerú teba.' : 'Traja chlapi odkladajú korbele. Nie sú to hrdinovia, ale vedia držať kopiju.'); }, G.gold < 30, { u: evil ? 'orc' : 'i'});
    btn('Späť do krčmy', tavBack, 0, 'back');
}
/** Klebeta o svete: vojny, najbližší nepriateľ, hľadaní spoločníci, počasie. */
function rumor(t) {
    const R = [];
    const wars = [];
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) if (a !== 6 && b !== 6 && hos(a, b) && FN[a] && FN[b]) wars.push(FN[a] + ' a ' + FN[b]);
    if (wars.length) R.push('Hovorí sa, že ' + wars[Math.floor(Math.random() * wars.length)] + ' sú vo vojne. Kupci sa boja ciest.');
    const en = E.filter(e => hos(e.f, G.fac)).sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
    if (en) R.push('Kupec videl vojsko ' + en.nm + ' (' + FN[en.f] + ', asi ' + Math.ceil(en.n) + ' mužov) ' + (en.x < t.x ? 'na západ' : 'na východ') + ' odtiaľto. Drž sa ciest.');
    const c = COMPANIONS.filter(x => x.side === heroSide() && !(G.comp || []).includes(x.id) && x.at !== t.n)[Math.floor(Math.random() * 3)];
    if (c) R.push('Vraj v ' + c.at + ' sedí po večeroch ' + c.n + '. ' + (heroSide() ? 'Hľadá, komu by slúžil – za dobrú cenu.' : 'Vraj hľadá, komu by ponúkol svoj meč.'));
    const rich = TW.filter(x => !hos(x.f, G.fac) && x !== t).sort((a, b) => (b.pr || 40) - (a.pr || 40))[0];
    if (rich) R.push('V ' + rich.n + ' vraj platia za tovar najlepšie. Keby si mal voz...');
    if (G.ring === 1) R.push('Niečo sa deje. Vrany lietajú na východ a v noci sa ľuďom sníva o ohni. Vravia, že sa niečo stratené našlo.');
    R.push(MW.n !== 'clear' ? 'Počasie sa kazí. Starí ľudia vravia, že ' + WNAME[MW.n] + ' potrvá ešte pár dní.' : 'Pekné dni. Vraj to dlho nevydrží – nikdy nevydrží.');
    return R[Math.floor(Math.random() * R.length)];
}
