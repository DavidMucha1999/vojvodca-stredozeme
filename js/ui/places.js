/*
 * Udalosti na zaujímavých miestach mapy (PLACES). place(i) otvorí okno s možnosťami; návštevy majú odstup cd dní (G.pv).
 */
function place(i) {
    const P = PLACES[i], last = (G.pv || (G.pv = {}))[P.id], ready = last == null || G.day - last >= P.cd;
    mode = 'town'; G.dest = -1;
    const back = () => { ov.classList.add('hide'); mode = 'map'; }, done = () => { G.pv[P.id] = G.day; };
    show(P.n, P.d + (ready ? '' : ' (Nedávno si tu bol; vráť sa neskôr.)'));
    const act = (label, fn, icon) => btn(label, () => { done(); fn(); }, !ready, icon);
    if (P.id === 'amonsul') act('Vystúpiť na vrchol a rozhliadnuť sa', () => { const en = E.filter(e => hos(e.f, G.fac)).sort((a, b) => Math.hypot(a.x - G.x, a.y - G.y) - Math.hypot(b.x - G.x, b.y - G.y)).slice(0, 4); if (!G.pv.amonsul1) { G.pv.amonsul1 = 1; G.ren++; } msg('Z vrcholu vidíš: ' + (en.map(e => e.nm + ' (' + FN[e.f] + ', ' + Math.ceil(e.n) + ' mužov, ' + (e.x < G.x ? 'západ' : 'východ') + ')').join('; ') || 'nikoho') + '. ' + (isNight() ? 'V tme pod kopcom sa mihajú čierne tiene – lepšie neostať.' : 'Sláva +1 za výstup.'), back); }, 'map');
    if (P.id === 'argonath') act('Prejsť popod Kráľov', () => { G.ren += 2; G.hon = (G.hon || 0) + 1; msg('Kamenní králi hľadia na sever. Cítiš, že si súčasťou starého príbehu. Sláva +2, česť +1.', back); }, 'star');
    if (P.id === 'trolls') act('Prehľadať jaskyne (boj s trollmi)', () => { back(); startBattle({ n: 3, f: 9, nm: 'Trollovia', trolls: 1 }); }, 'attack');
    if (P.id === 'bombadil') act('Zaklopať u Toma Bombadila', () => { G.hp = mh(); G.hon = (G.hon || 0) + 1; if (G.chp) Object.keys(G.chp).forEach(k => G.chp[k] = 1); msg('„Hej dol! Veselý dol!“ Tom vás nakŕmi, Zlatienka naleje vodu zo studne a ráno sú všetci zdraví a odpočinutí. Zdravie všetkých plné, česť +1.', back); }, 'heart');
    if (P.id === 'marshes') { act('Prebrodiť močiare (skratka)', () => { const lost = Math.random() < .5 ? 1 : 0; G.inf = Math.max(0, G.inf - lost); G.fear = (G.fear || 0) + 1; msg(lost ? 'Jeden z mužov sa zahľadel do vody a zmizol v bahne. Ostatných prejde mráz. Strach +1.' : 'Bludičky vás lákali, ale držali ste sa cesty. Strach +1.', back); }, 'skull'); act('Hľadať v bahne (nebezpečné)', () => { const r = Math.random(); if (r < .3) { G.gold += 80; msg('V bahne nájdeš hrdzavú truhličku so zlatom dávneho vojska. +80 zlata.', back); } else { G.hp = Math.max(10, G.hp - 15); msg('Niečo studené ťa chytí za členok. Vytrhneš sa, ale stálo ťa to kus zdravia (−15).', back); } }, 'coins'); }
    if (P.id === 'spiders') act('Vyčistiť húštiny (boj s pavúkmi)', () => { back(); startBattle({ n: 8, f: 9, nm: 'Pavúky', spiders: 1 }); }, 'attack');
    if (P.id === 'fangorn') act(heroSide() === 1 ? 'Rúbať stromy' : 'Zavolať na pastierov stromov', () => { if (heroSide() === 1) { G.inf = Math.max(0, G.inf - 2); msg('Stromy sa pohli. Dvaja orkovia zmizli v konároch a ostatní utekajú. Pešiaci −2.', back); } else { G.hp = mh(); G.ren++; msg('Zo šera vystúpi Stromobrad. „Hm, hrúm. Neunáhlime sa.“ Po dlhom rozhovore vás pustí ďalej oddýchnutých. Zdravie plné, sláva +1.', back); } }, 'leaf');
    if (P.id === 'deadpaths') act('Vstúpiť do tmy', () => { if (heroSide() === 0 && G.ren >= 8) { G.fear = (G.fear || 0) + 5; G.ren += 3; msg('Mŕtvi ti odpovedajú. Tiene pôjdu za tebou do jednej bitky – nepriatelia sa ťa budú báť. Strach +5, sláva +3.', back); } else { G.hp = Math.max(10, G.hp - 20); msg('Tma ťa vyvrhne von. Nie si ten, na koho čakajú. Zdravie −20.', back); } }, 'skull');
    if (P.id === 'carrock') act('Zaklopať u Beorna', () => { if (heroSide() === 0) { G.hp = mh(); G.inf += 3; msg('Beorn zavrčí, ale pustí vás dnu. Med, smotana a ráno traja statní chlapi z jeho dvora idú s vami. Pešiaci +3, zdravie plné.', back); } else { back(); startBattle({ n: 1, f: 9, nm: 'Beorn', beorn: 1 }); } }, 'rest');
    if (P.id === 'isenfords') act('Prebrodiť rieku', () => { if (Math.random() < .5) { back(); startBattle({ n: 8, f: 3, nm: 'Hliadka Isengardu' }); } else msg('Brod je tichý. Len v tráve ležia staré prilby Rohanu.', back); }, 'map');
    if (P.id === 'minasithil') act('Pokloniť sa padlým', () => { G.hon = (G.hon || 0) + 2; msg('Vietor od rieky hýbe trávou nad hrobmi. Česť +2.', back); }, 'honor');
    btn('Odísť', back, 0, 'door');
}
